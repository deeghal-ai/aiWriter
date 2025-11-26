/**
 * Claude AI Provider Implementation
 * Uses Anthropic's Claude with Structured Outputs
 */

import Anthropic from "@anthropic-ai/sdk";
import { insightExtractionSchema } from "../schemas";
import { buildInsightExtractionPrompt } from "../prompts";
import type { AIProvider } from "../provider-interface";
import type { InsightExtractionResult } from "../../types";

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
}

