/**
 * Modular AI Provider Interface
 * Allows easy swapping between Claude, OpenAI, Gemini, etc.
 */

import type { InsightExtractionResult } from "../types";

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

