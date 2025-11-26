/**
 * Modular AI Provider Interface
 * Allows easy swapping between Claude, OpenAI, Gemini, etc.
 */

import type { InsightExtractionResult, PersonaGenerationResult, VerdictGenerationResult, Persona } from "../types";

export interface AIProvider {
  name: string;
  
  /**
   * Extract insights from scraped data
   */
  extractInsights(
    bike1Name: string,
    bike2Name: string,
    redditData: any,
    xbhpData?: any
  ): Promise<InsightExtractionResult>;
  
  /**
   * Generate rider personas from extracted insights
   */
  generatePersonas(
    bike1Name: string,
    bike2Name: string,
    insights: InsightExtractionResult
  ): Promise<PersonaGenerationResult>;
  
  /**
   * Generate verdicts for each persona
   */
  generateVerdicts(
    bike1Name: string,
    bike2Name: string,
    personas: Persona[],
    insights: InsightExtractionResult
  ): Promise<VerdictGenerationResult>;
  
  /**
   * Check if provider is configured and ready
   */
  isConfigured(): boolean;
  
  /**
   * Get provider configuration details
   */
  getConfig(): {
    model: string;
    maxTokens: number;
  };
}

export interface AIProviderConfig {
  provider: 'claude' | 'openai' | 'gemini';
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

