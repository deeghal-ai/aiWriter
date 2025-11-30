/**
 * Base AI Provider Interface
 * Abstract class that all AI providers must implement
 * 
 * This makes it easy to add new providers (OpenAI, Gemini, etc.)
 * by implementing this interface.
 */

import type { ModelDefinition } from '../models/registry';
import type { 
  InsightExtractionResult, 
  PersonaGenerationResult, 
  VerdictGenerationResult, 
  Persona 
} from '../../types';

/**
 * Abstract base class for AI providers
 * Extend this class to add new AI provider support
 */
export abstract class BaseProvider {
  /** Provider display name */
  abstract readonly name: string;
  
  /** Provider identifier (matches ModelDefinition.provider) */
  abstract readonly providerId: string;
  
  /**
   * Check if provider is properly configured (API keys, etc.)
   */
  abstract isConfigured(): boolean;
  
  /**
   * Get provider configuration details
   */
  abstract getConfig(): {
    model: string;
    maxTokens: number;
  };
  
  /**
   * Extract insights from scraped forum data
   */
  abstract extractInsights(
    bike1Name: string,
    bike2Name: string,
    scrapedData: any,
    xbhpData?: any
  ): Promise<InsightExtractionResult>;
  
  /**
   * Generate rider personas from extracted insights
   */
  abstract generatePersonas(
    bike1Name: string,
    bike2Name: string,
    insights: InsightExtractionResult
  ): Promise<PersonaGenerationResult>;
  
  /**
   * Generate verdicts for each persona
   */
  abstract generateVerdicts(
    bike1Name: string,
    bike2Name: string,
    personas: Persona[],
    insights: InsightExtractionResult
  ): Promise<VerdictGenerationResult>;
  
  // ===== OPTIONAL OPTIMIZED METHODS =====
  // Providers can override these for better performance
  
  /**
   * Optimized extraction with parallel processing
   * Default implementation calls extractInsights
   */
  async extractInsightsOptimized(
    bike1Name: string,
    bike2Name: string,
    forumData: any
  ): Promise<InsightExtractionResult> {
    // Default: use standard extraction
    return this.extractInsights(bike1Name, bike2Name, forumData);
  }
  
  /**
   * Optimized persona generation with condensed inputs
   * Default implementation calls generatePersonas
   */
  async generatePersonasOptimized(
    bike1Name: string,
    bike2Name: string,
    insights: InsightExtractionResult
  ): Promise<PersonaGenerationResult> {
    // Default: use standard generation
    return this.generatePersonas(bike1Name, bike2Name, insights);
  }
  
  /**
   * Optimized verdict generation with parallel processing
   * Default implementation calls generateVerdicts
   */
  async generateVerdictsOptimized(
    bike1Name: string,
    bike2Name: string,
    personas: Persona[],
    insights: InsightExtractionResult
  ): Promise<VerdictGenerationResult> {
    // Default: use standard generation
    return this.generateVerdicts(bike1Name, bike2Name, personas, insights);
  }
  
  /**
   * Extract insights using a specific model configuration
   * Useful when the model is selected dynamically
   */
  async extractInsightsWithModel(
    bike1Name: string,
    bike2Name: string,
    scrapedData: any,
    xbhpData: any | undefined,
    model: ModelDefinition
  ): Promise<InsightExtractionResult> {
    // Default: ignore model param and use standard extraction
    // Override this method to support model selection
    return this.extractInsights(bike1Name, bike2Name, scrapedData, xbhpData);
  }
}

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  provider: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  baseUrl?: string;
}

/**
 * Provider factory function type
 */
export type ProviderFactory = () => BaseProvider;

/**
 * Check if a provider has optimized methods implemented
 */
export function hasOptimizedExtraction(provider: BaseProvider): boolean {
  // Check if the provider has overridden the optimized method
  return (
    provider.extractInsightsOptimized !== BaseProvider.prototype.extractInsightsOptimized
  );
}

export function hasOptimizedPersonas(provider: BaseProvider): boolean {
  return (
    provider.generatePersonasOptimized !== BaseProvider.prototype.generatePersonasOptimized
  );
}

export function hasOptimizedVerdicts(provider: BaseProvider): boolean {
  return (
    provider.generateVerdictsOptimized !== BaseProvider.prototype.generateVerdictsOptimized
  );
}

