/**
 * Claude AI Provider Implementation
 * Uses Anthropic's Claude with Structured Outputs
 */

import Anthropic from "@anthropic-ai/sdk";
import { insightExtractionSchema, personaGenerationSchema } from "../schemas";
import { buildInsightExtractionPrompt, buildPersonaGenerationPrompt } from "../prompts";
import type { AIProvider } from "../provider-interface";
import type { InsightExtractionResult, PersonaGenerationResult } from "../../types";

export class ClaudeProvider implements AIProvider {
  name = "Claude (Anthropic)";
  private client: Anthropic | null = null;
  private model: string;
  private maxTokens: number;
  
  constructor() {
    this.model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    this.maxTokens = parseInt(process.env.ANTHROPIC_MAX_TOKENS || "4096");
    
    if (this.isConfigured()) {
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
      });
    }
  }
  
  isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }
  
  getConfig() {
    return {
      model: this.model,
      maxTokens: this.maxTokens
    };
  }
  
  async extractInsights(
    bike1Name: string,
    bike2Name: string,
    redditData: any,
    xbhpData?: any
  ): Promise<InsightExtractionResult> {
    if (!this.client) {
      throw new Error("Claude API not configured. Check ANTHROPIC_API_KEY in .env.local");
    }
    
    const startTime = Date.now();
    
    try {
      console.log(`[Claude] Extracting insights for ${bike1Name} vs ${bike2Name}`);
      console.log(`[Claude] Model: ${this.model}, Max Tokens: ${this.maxTokens}`);
      
      // Build prompt
      const prompt = buildInsightExtractionPrompt(
        bike1Name,
        bike2Name,
        redditData,
        xbhpData || { bike1: { threads: [] }, bike2: { threads: [] } }
      );
      
      // Call Claude with JSON mode
      // Note: Claude doesn't have response_format like OpenAI
      // We use prompt engineering to ensure JSON output
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{
          role: "user",
          content: prompt + "\n\nIMPORTANT: Respond with ONLY valid JSON matching the schema. No markdown, no explanations, no text outside the JSON structure."
        }],
        system: "You are a data extraction expert. You always respond with valid JSON that matches the requested schema exactly."
      });
      
      // Extract JSON from response
      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Expected text response from Claude");
      }
      
      // Claude might wrap JSON in markdown code blocks
      let jsonText = content.text.trim();
      
      // Remove markdown code fences if present
      if (jsonText.startsWith('```')) {
        // Remove opening fence (```json or ```)
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '');
        // Remove closing fence
        jsonText = jsonText.replace(/\n?```$/, '');
        jsonText = jsonText.trim();
      }
      
      console.log('[Claude] Response length:', jsonText.length, 'chars');
      
      const insights = JSON.parse(jsonText);
      
      // Validate and sanitize the parsed data
      if (!insights.bike1 || !insights.bike2) {
        throw new Error("Invalid response structure: missing bike1 or bike2");
      }
      
      // Ensure praises and complaints arrays exist
      insights.bike1.praises = insights.bike1.praises || [];
      insights.bike1.complaints = insights.bike1.complaints || [];
      insights.bike2.praises = insights.bike2.praises || [];
      insights.bike2.complaints = insights.bike2.complaints || [];
      
      // Sanitize quotes - remove any with missing fields
      const sanitizeCategory = (category: any) => {
        if (!category.quotes || !Array.isArray(category.quotes)) {
          category.quotes = [];
          return category;
        }
        
        // Filter out quotes missing required fields
        category.quotes = category.quotes.filter((quote: any) => {
          return quote && 
                 quote.text && 
                 typeof quote.text === 'string' && 
                 quote.text.trim().length > 0 &&
                 quote.author && 
                 typeof quote.author === 'string' &&
                 quote.source && 
                 typeof quote.source === 'string';
        });
        
        return category;
      };
      
      // Sanitize all categories
      insights.bike1.praises = insights.bike1.praises.map(sanitizeCategory).filter((p: any) => p.quotes.length > 0);
      insights.bike1.complaints = insights.bike1.complaints.map(sanitizeCategory).filter((c: any) => c.quotes.length > 0);
      insights.bike2.praises = insights.bike2.praises.map(sanitizeCategory).filter((p: any) => p.quotes.length > 0);
      insights.bike2.complaints = insights.bike2.complaints.map(sanitizeCategory).filter((c: any) => c.quotes.length > 0);
      
      // Check if we have enough valid data
      const totalCategories = 
        insights.bike1.praises.length + 
        insights.bike1.complaints.length + 
        insights.bike2.praises.length + 
        insights.bike2.complaints.length;
        
      if (totalCategories === 0) {
        console.warn("[Claude] No valid insights with quotes found after sanitization");
        throw new Error("Claude returned insights but all quotes were malformed. Please retry.");
      }
      
      console.log(`[Claude] Sanitization complete: ${totalCategories} categories with valid quotes`);
      
      // Ensure surprising_insights are strings, not objects
      if (insights.bike1.surprising_insights) {
        insights.bike1.surprising_insights = insights.bike1.surprising_insights.map((item: any) => {
          if (typeof item === 'string') return item;
          // If it's an object, try to extract the insight text
          return item.insight || item.description || item.text || JSON.stringify(item);
        });
      } else {
        insights.bike1.surprising_insights = [];
      }
      
      if (insights.bike2.surprising_insights) {
        insights.bike2.surprising_insights = insights.bike2.surprising_insights.map((item: any) => {
          if (typeof item === 'string') return item;
          return item.insight || item.description || item.text || JSON.stringify(item);
        });
      } else {
        insights.bike2.surprising_insights = [];
      }
      
      // Calculate metadata
      const processingTime = Date.now() - startTime;
      
      const result: InsightExtractionResult = {
        bike1: insights.bike1,
        bike2: insights.bike2,
        metadata: {
          extracted_at: new Date().toISOString(),
          total_praises: 
            insights.bike1.praises.length + insights.bike2.praises.length,
          total_complaints:
            insights.bike1.complaints.length + insights.bike2.complaints.length,
          total_quotes:
            insights.bike1.praises.reduce((sum: number, p: any) => sum + p.quotes.length, 0) +
            insights.bike1.complaints.reduce((sum: number, c: any) => sum + c.quotes.length, 0) +
            insights.bike2.praises.reduce((sum: number, p: any) => sum + p.quotes.length, 0) +
            insights.bike2.complaints.reduce((sum: number, c: any) => sum + c.quotes.length, 0),
          processing_time_ms: processingTime
        }
      };
      
      console.log(`[Claude] Extraction complete in ${processingTime}ms`);
      console.log(`[Claude] Found ${result.metadata.total_praises} praises, ${result.metadata.total_complaints} complaints`);
      console.log(`[Claude] Usage: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output tokens`);
      
      return result;
      
    } catch (error: any) {
      console.error("[Claude] Extraction error:", error);
      
      // Handle specific Anthropic API errors
      if (error.status === 401) {
        throw new Error("Invalid Anthropic API key. Check your .env.local file.");
      }
      
      if (error.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      
      if (error.status === 529) {
        throw new Error("Claude API is overloaded. Please try again shortly.");
      }
      
      // Re-throw with context
      throw new Error(`Claude extraction failed: ${error.message}`);
    }
  }
  
  async generatePersonas(
    bike1Name: string,
    bike2Name: string,
    insights: InsightExtractionResult
  ): Promise<PersonaGenerationResult> {
    if (!this.client) {
      throw new Error("Claude API not configured. Check ANTHROPIC_API_KEY in .env.local");
    }
    
    const startTime = Date.now();
    
    try {
      console.log(`[Claude] Generating personas for ${bike1Name} vs ${bike2Name}`);
      
      // Build prompt
      const prompt = buildPersonaGenerationPrompt(bike1Name, bike2Name, insights);
      
      // Call Claude with higher token limit for persona generation
      // Personas require more tokens than insight extraction due to detailed fields
      const personaMaxTokens = Math.max(this.maxTokens, 8192);
      console.log(`[Claude] Using ${personaMaxTokens} max tokens for persona generation`);
      
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: personaMaxTokens,
        messages: [{
          role: "user",
          content: prompt + "\n\nIMPORTANT: Respond with ONLY valid JSON matching the schema. No markdown, no explanations."
        }],
        system: "You are an expert in Indian motorcycle buyer psychology. You analyze forum discussions to identify real rider personas—not marketing segments. You always respond with valid JSON."
      });
      
      // Check if response was truncated
      if (response.stop_reason === "max_tokens") {
        console.error('[Claude] Response was truncated due to max_tokens limit');
        throw new Error("Claude response was truncated. The personas are incomplete. Increase ANTHROPIC_MAX_TOKENS in .env.local to at least 8192.");
      }
      
      // Extract JSON from response
      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Expected text response from Claude");
      }
      
      let jsonText = content.text.trim();
      
      // Remove markdown code fences if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '');
        jsonText = jsonText.replace(/\n?```$/, '');
        jsonText = jsonText.trim();
      }
      
      const parsed = JSON.parse(jsonText);
      
      // Log the raw response for debugging
      console.log('[Claude] Raw parsed response:', JSON.stringify(parsed, null, 2).substring(0, 500));
      
      // Validate structure
      if (!parsed.personas || !Array.isArray(parsed.personas)) {
        throw new Error("Invalid response: missing personas array");
      }
      
      if (parsed.personas.length === 0) {
        throw new Error("Claude returned empty personas array");
      }
      
      // Flatten nested structures if Claude grouped fields (e.g., identity.name -> name)
      parsed.personas = parsed.personas.map((persona: any) => {
        // Check if fields are nested (Claude sometimes groups them logically)
        if (persona.identity || persona.prevalence) {
          console.log('[Claude] Flattening nested persona structure');
          return {
            // Flatten identity
            name: persona.identity?.name || persona.name,
            title: persona.identity?.title || persona.title,
            
            // Flatten prevalence
            percentage: persona.prevalence?.percentage || persona.percentage,
            sampleSize: persona.prevalence?.sampleSize || persona.sampleSize,
            
            // Keep other fields as-is (they're already correctly structured)
            usagePattern: persona.usagePattern,
            demographics: persona.demographics,
            psychographics: persona.psychographics,
            priorities: persona.priorities,
            painPoints: persona.painPoints,
            evidenceQuotes: persona.evidenceQuotes,
            archetypeQuote: persona.archetypeQuote,
            color: persona.color,
            id: persona.id
          };
        }
        return persona;
      });
      
      // Check if personas have basic required fields after flattening
      const hasValidPersonas = parsed.personas.some((p: any) => p.name && p.title && p.percentage);
      if (!hasValidPersonas) {
        console.error('[Claude] Personas missing required fields after flattening:', parsed.personas);
        throw new Error("Claude returned personas but they are missing required fields (name, title, percentage). This is likely due to the response being truncated. Try again or check the model's max_tokens setting.");
      }
      
      console.log('[Claude] Personas validated successfully');
      
      // Ensure IDs and colors are assigned, and normalize usage patterns
      parsed.personas = parsed.personas.map((persona: any, index: number) => {
        const normalized = {
          ...persona,
          id: persona.id || `persona-${index + 1}`,
          color: persona.color || ["blue", "green", "purple", "orange"][index]
        };
        
        // Normalize usage pattern to sum to exactly 100
        if (normalized.usagePattern) {
          const sum = 
            (normalized.usagePattern.cityCommute || 0) +
            (normalized.usagePattern.highway || 0) +
            (normalized.usagePattern.urbanLeisure || 0) +
            (normalized.usagePattern.offroad || 0);
          
          if (sum !== 100 && sum > 0) {
            // Normalize by scaling
            const factor = 100 / sum;
            normalized.usagePattern = {
              cityCommute: Math.round((normalized.usagePattern.cityCommute || 0) * factor),
              highway: Math.round((normalized.usagePattern.highway || 0) * factor),
              urbanLeisure: Math.round((normalized.usagePattern.urbanLeisure || 0) * factor),
              offroad: Math.round((normalized.usagePattern.offroad || 0) * factor)
            };
            
            // Fix rounding errors by adjusting the largest value
            const newSum = 
              normalized.usagePattern.cityCommute + 
              normalized.usagePattern.highway + 
              normalized.usagePattern.urbanLeisure + 
              normalized.usagePattern.offroad;
              
            if (newSum !== 100) {
              const diff = 100 - newSum;
              // Find the largest value and adjust it
              const values = [
                { key: 'cityCommute', val: normalized.usagePattern.cityCommute },
                { key: 'highway', val: normalized.usagePattern.highway },
                { key: 'urbanLeisure', val: normalized.usagePattern.urbanLeisure },
                { key: 'offroad', val: normalized.usagePattern.offroad }
              ];
              values.sort((a, b) => b.val - a.val);
              (normalized.usagePattern as any)[values[0].key] += diff;
            }
            
            console.log(`[Claude] Normalized persona ${index + 1} usage pattern from ${sum}% to 100%`);
          }
        }
        
        return normalized;
      });
      
      const processingTime = Date.now() - startTime;
      
      console.log(`[Claude] Persona generation complete in ${processingTime}ms`);
      console.log(`[Claude] Generated ${parsed.personas.length} personas`);
      console.log(`[Claude] Usage: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output tokens`);
      
      return {
        personas: parsed.personas,
        metadata: {
          generated_at: new Date().toISOString(),
          total_personas: parsed.personas.length,
          total_evidence_quotes: parsed.personas.reduce(
            (sum: number, p: any) => sum + (p.evidenceQuotes?.length || 0), 
            0
          ),
          processing_time_ms: processingTime
        }
      };
      
    } catch (error: any) {
      console.error("[Claude] Persona generation error:", error);
      
      // Handle specific Anthropic API errors
      if (error.status === 401) {
        throw new Error("Invalid Anthropic API key. Check your .env.local file.");
      }
      
      if (error.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      
      if (error.status === 529) {
        throw new Error("Claude API is overloaded. Please try again shortly.");
      }
      
      throw error;
    }
  }
}

