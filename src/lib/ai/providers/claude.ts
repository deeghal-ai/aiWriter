/**
 * Claude AI Provider Implementation
 * Uses Anthropic's Claude with Structured Outputs
 */

import Anthropic from "@anthropic-ai/sdk";
import { insightExtractionSchema, personaGenerationSchema, verdictGenerationSchema } from "../schemas";
import { buildInsightExtractionPrompt, buildPersonaGenerationPrompt, buildVerdictGenerationPrompt } from "../prompts";
import type { AIProvider } from "../provider-interface";
import type { InsightExtractionResult, PersonaGenerationResult, VerdictGenerationResult, Persona } from "../../types";

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
      
      // Call Claude with higher token limit for insight extraction
      // Insights need more tokens due to quotes and multiple categories
      const insightMaxTokens = Math.max(this.maxTokens, 8192);
      console.log(`[Claude] Using ${insightMaxTokens} max tokens for insight extraction`);
      
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: insightMaxTokens,
        messages: [{
          role: "user",
          content: prompt + "\n\nIMPORTANT: Respond with ONLY valid JSON matching the schema. No markdown, no explanations, no text outside the JSON structure."
        }],
        system: "You are a data extraction expert. You always respond with valid JSON that matches the requested schema exactly."
      });
      
      // Check if response was truncated
      if (response.stop_reason === "max_tokens") {
        console.error('[Claude] Response was truncated due to max_tokens limit');
        throw new Error("Claude response was truncated. The insights are incomplete. Increase ANTHROPIC_MAX_TOKENS in .env.local to at least 8192.");
      }
      
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
      
      let insights = JSON.parse(jsonText);
      
      // Log the top-level keys to debug structure issues
      console.log('[Claude] Response top-level keys:', Object.keys(insights));
      console.log('[Claude] First 500 chars of response:', JSON.stringify(insights).substring(0, 500));
      
      // Check if Claude wrapped the response in an extra layer or used different field names
      // Sometimes Claude returns { insights: { bike1, bike2 } } or { data: { bike1, bike2 } }
      if (!insights.bike1 && !insights.bike2) {
        // Check common wrapper patterns
        if (insights.insights) {
          console.log('[Claude] Found nested structure at "insights" key, unwrapping...');
          insights = insights.insights;
        } else if (insights.data) {
          console.log('[Claude] Found nested structure at "data" key, unwrapping...');
          insights = insights.data;
        } else if (insights.bikes) {
          console.log('[Claude] Found bikes array instead of bike1/bike2 object structure');
          // If Claude returned bikes: [bike1Data, bike2Data] instead of bike1/bike2 keys
          if (Array.isArray(insights.bikes) && insights.bikes.length >= 2) {
            insights = {
              bike1: insights.bikes[0],
              bike2: insights.bikes[1]
            };
          }
        }
      }
      
      // Validate and sanitize the parsed data
      if (!insights.bike1 || !insights.bike2) {
        console.error('[Claude] Invalid structure after unwrapping. Available keys:', Object.keys(insights));
        console.error('[Claude] Full response (first 1000 chars):', JSON.stringify(insights).substring(0, 1000));
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
  
  async generateVerdicts(
    bike1Name: string,
    bike2Name: string,
    personas: Persona[],
    insights: InsightExtractionResult
  ): Promise<VerdictGenerationResult> {
    if (!this.client) {
      throw new Error("Claude API not configured. Check ANTHROPIC_API_KEY in .env.local");
    }
    
    const startTime = Date.now();
    
    try {
      console.log(`[Claude] Generating verdicts for ${personas.length} personas`);
      console.log(`[Claude] Bikes: ${bike1Name} vs ${bike2Name}`);
      
      // Build prompt
      const prompt = buildVerdictGenerationPrompt(
        bike1Name,
        bike2Name,
        personas,
        insights
      );
      
      // Call Claude with higher token limit for verdict generation
      const verdictMaxTokens = Math.max(this.maxTokens, 8192);
      console.log(`[Claude] Using ${verdictMaxTokens} max tokens for verdict generation`);
      
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: verdictMaxTokens,
        messages: [{
          role: "user",
          content: prompt + "\n\nIMPORTANT: Respond with ONLY valid JSON matching the schema. No markdown, no explanations. Make a DEFINITIVE call for each persona."
        }],
        system: "You are an expert motorcycle advisor for Indian buyers. You make clear, evidence-backed recommendations—no fence-sitting. You always respond with valid JSON."
      });
      
      // Check if response was truncated
      if (response.stop_reason === "max_tokens") {
        console.error('[Claude] Response was truncated due to max_tokens limit');
        throw new Error("Claude response was truncated. The verdicts are incomplete. Increase ANTHROPIC_MAX_TOKENS in .env.local to at least 8192.");
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
      
      console.log('[Claude] Raw parsed response:', JSON.stringify(JSON.parse(jsonText), null, 2).substring(0, 500));
      
      const parsed = JSON.parse(jsonText);
      
      // Validate structure
      if (!parsed.verdicts || !Array.isArray(parsed.verdicts)) {
        throw new Error("Invalid response: missing verdicts array");
      }
      
      if (parsed.verdicts.length === 0) {
        throw new Error("Claude returned empty verdicts array");
      }
      
      // Restructure verdicts to match expected format
      parsed.verdicts = parsed.verdicts.map((verdict: any, index: number) => {
        const persona = personas[index];
        
        // Log what we have before restructuring
        console.log(`[Claude] Verdict ${index + 1} before restructuring:`, {
          hasPersona: !!verdict.persona,
          hasPersonaId: !!verdict.personaId,
          hasVerdictOneLiner: !!verdict.verdictOneLiner,
          verdictOneLinerValue: verdict.verdictOneLiner
        });
        
        let restructured;
        
        // Check if Claude used a different structure (e.g., "persona" field instead of personaId/personaName/personaTitle)
        if (verdict.persona && typeof verdict.persona === 'string') {
          // Parse "Arjun — The Engine Rebuild Opportunist" format
          const parts = verdict.persona.split('—').map((s: string) => s.trim());
          console.log(`[Claude] Restructuring verdict ${index + 1} from "persona" field`);
          
          // Pre-calculate verdictOneLiner to ensure it's set
          const oneLiner = verdict.verdictOneLiner && verdict.verdictOneLiner.trim().length > 0
            ? verdict.verdictOneLiner
            : `For ${parts[0] || persona?.name}, ${verdict.recommendedBike} is the clear choice.`;
          
          restructured = {
            ...verdict,
            personaId: persona?.id || `persona-${index + 1}`,
            personaName: parts[0] || persona?.name || 'Unknown',
            personaTitle: parts[1] || persona?.title || 'Unknown',
            verdictOneLiner: oneLiner
          };
        } else {
          // Pre-calculate verdictOneLiner to ensure it's set
          const oneLiner = verdict.verdictOneLiner && verdict.verdictOneLiner.trim().length > 0
            ? verdict.verdictOneLiner
            : `For ${verdict.personaName || persona?.name}, ${verdict.recommendedBike} is the clear choice.`;
          
          // Ensure all required fields are present
          restructured = {
            ...verdict,
            personaId: verdict.personaId || persona?.id || `persona-${index + 1}`,
            personaName: verdict.personaName || persona?.name || 'Unknown',
            personaTitle: verdict.personaTitle || persona?.title || 'Unknown',
            verdictOneLiner: oneLiner
          };
        }
        
        console.log(`[Claude] Verdict ${index + 1} after restructuring: hasVerdictOneLiner=${!!restructured.verdictOneLiner}, value="${restructured.verdictOneLiner}"`);
        
        return restructured;
      });
      
      // Calculate metadata
      const processingTime = Date.now() - startTime;
      const avgConfidence = parsed.verdicts.reduce(
        (sum: number, v: any) => sum + (v.confidence || 0), 
        0
      ) / parsed.verdicts.length;
      
      // Generate summary - count which bike each verdict recommends
      // Use very aggressive normalization to handle variations
      const normalizeBikeName = (name: string) => {
        if (!name) return '';
        // Keep only alphanumeric characters, lowercase
        return name.toLowerCase().replace(/[^a-z0-9]/g, '');
      };
      
      const bike1Normalized = normalizeBikeName(bike1Name);
      const bike2Normalized = normalizeBikeName(bike2Name);
      
      console.log(`[Claude] Bike name matching: bike1="${bike1Name}" → "${bike1Normalized}", bike2="${bike2Name}" → "${bike2Normalized}"`);
      
      let bike1WinsCount = 0;
      let bike2WinsCount = 0;
      
      parsed.verdicts.forEach((v: any, i: number) => {
        const recommended = normalizeBikeName(v.recommendedBike || '');
        
        console.log(`[Claude] Verdict ${i + 1}: "${v.recommendedBike}" → normalized: "${recommended}"`);
        
        // Check which bike matches better
        // Try multiple matching strategies
        const matchesBike1 = recommended === bike1Normalized || 
                            recommended.includes(bike1Normalized) || 
                            bike1Normalized.includes(recommended);
        
        const matchesBike2 = recommended === bike2Normalized || 
                            recommended.includes(bike2Normalized) || 
                            bike2Normalized.includes(recommended);
        
        if (matchesBike1 && !matchesBike2) {
          bike1WinsCount++;
          console.log(`[Claude]   ✓ Matched to bike1 (${bike1Name})`);
        } else if (matchesBike2 && !matchesBike1) {
          bike2WinsCount++;
          console.log(`[Claude]   ✓ Matched to bike2 (${bike2Name})`);
        } else if (matchesBike1 && matchesBike2) {
          // Both match - use length comparison
          const bike1Similarity = Math.abs(recommended.length - bike1Normalized.length);
          const bike2Similarity = Math.abs(recommended.length - bike2Normalized.length);
          if (bike1Similarity < bike2Similarity) {
            bike1WinsCount++;
            console.log(`[Claude]   ✓ Matched to bike1 (closer match)`);
          } else {
            bike2WinsCount++;
            console.log(`[Claude]   ✓ Matched to bike2 (closer match)`);
          }
        } else {
          console.warn(`[Claude]   ✗ Could not match to either bike`);
          // Fallback: assign to bike1 to prevent validation error
          bike1WinsCount++;
          console.warn(`[Claude]   → Defaulting to bike1`);
        }
      });
      
      // Find the verdict with lowest confidence
      const lowestConfidence = Math.min(...parsed.verdicts.map((v: any) => v.confidence || 100));
      const closestVerdict = parsed.verdicts.find((v: any) => v.confidence === lowestConfidence);
      
      const summary = {
        bike1Wins: bike1WinsCount,
        bike2Wins: bike2WinsCount,
        closestCall: closestVerdict 
          ? `${closestVerdict.personaName || 'One persona'} was the closest call at ${lowestConfidence}% confidence`
          : `Lowest confidence: ${lowestConfidence}%`
      };
      
      console.log(`[Claude] Summary calculation: ${summary.bike1Wins} for bike1 + ${summary.bike2Wins} for bike2 = ${summary.bike1Wins + summary.bike2Wins} total (expected ${parsed.verdicts.length})`);
      
      // Ensure all verdicts have verdictOneLiner (generate if missing)
      parsed.verdicts = parsed.verdicts.map((verdict: any) => {
        if (!verdict.verdictOneLiner || verdict.verdictOneLiner.length === 0) {
          console.warn(`[Claude] Verdict for ${verdict.personaName} missing verdictOneLiner, generating fallback`);
          verdict.verdictOneLiner = `For ${verdict.personaName}, ${verdict.recommendedBike} is the clear choice based on their priorities.`;
        }
        return verdict;
      });
      
      // Log verdict details for debugging
      parsed.verdicts.forEach((v: any, i: number) => {
        console.log(`[Claude] Verdict ${i + 1}: ${v.personaName} → ${v.recommendedBike} (${v.confidence}%)`);
      });
      
      console.log(`[Claude] Verdict generation complete in ${processingTime}ms`);
      console.log(`[Claude] Generated ${parsed.verdicts.length} verdicts`);
      console.log(`[Claude] Summary: ${summary.bike1Wins} for ${bike1Name}, ${summary.bike2Wins} for ${bike2Name}`);
      console.log(`[Claude] Usage: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output tokens`);
      
      // Final check: log what we're returning
      console.log(`[Claude] Final verdicts check:`, parsed.verdicts.map((v: any) => ({
        personaName: v.personaName,
        recommendedBike: v.recommendedBike,
        hasVerdictOneLiner: !!v.verdictOneLiner,
        verdictOneLiner: v.verdictOneLiner?.substring(0, 50)
      })));
      
      const result = {
        verdicts: parsed.verdicts,
        summary: summary,
        metadata: {
          generated_at: new Date().toISOString(),
          total_verdicts: parsed.verdicts.length,
          average_confidence: Math.round(avgConfidence),
          processing_time_ms: processingTime
        }
      };
      
      return result;
      
    } catch (error: any) {
      console.error("[Claude] Verdict generation error:", error);
      
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

