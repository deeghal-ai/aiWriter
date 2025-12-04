/**
 * AI Provider Factory
 * Creates the appropriate AI provider based on configuration
 * 
 * Now uses the centralized provider registry for better extensibility
 */

import { ClaudeProvider } from './providers/claude';
import { getConfiguredProvider, getProviderForModel, isProviderAvailable } from './providers';
import { getModelById, type ModelDefinition } from './models/registry';
import type { AIProvider } from './provider-interface';
import type { InsightExtractionResult, PersonaGenerationResult, VerdictGenerationResult, Persona } from '../types';

/**
 * Get the configured AI provider
 * Uses environment variable AI_PROVIDER, defaults to Claude
 */
export function getAIProvider(): AIProvider {
  return getConfiguredProvider() as AIProvider;
}

/**
 * Get provider for a specific model ID
 */
export function getProviderForModelId(modelId: string): AIProvider {
  const model = getModelById(modelId);
  if (!model) {
    console.warn(`[Factory] Unknown model: ${modelId}, falling back to configured provider`);
    return getAIProvider();
  }
  
  if (!isProviderAvailable(model.provider)) {
    console.warn(`[Factory] Provider ${model.provider} not available, falling back to configured provider`);
    return getAIProvider();
  }
  
  return getProviderForModel(model) as AIProvider;
}

/**
 * Wrapper function for easy use
 */
export async function extractInsights(
  bike1Name: string,
  bike2Name: string,
  redditData: any,
  xbhpData?: any
) {
  const provider = getAIProvider();
  return provider.extractInsights(bike1Name, bike2Name, redditData, xbhpData);
}

/**
 * Extract insights using a specific model
 * Routes to the appropriate provider based on model configuration
 */
export async function extractInsightsWithModel(
  bike1Name: string,
  bike2Name: string,
  scrapedData: any,
  xbhpData: any | undefined,
  model: ModelDefinition
): Promise<InsightExtractionResult> {
  const provider = getProviderForModel(model);
  
  if (!provider.isConfigured()) {
    throw new Error(`Provider ${model.provider} is not configured`);
  }
  
  console.log(`[Factory] Using model: ${model.name} (${model.modelString})`);
  
  // Use optimized extraction for standard quality, standard for high/premium
  if (model.quality === 'standard' && 'extractInsightsOptimized' in provider) {
    return (provider as any).extractInsightsOptimized(bike1Name, bike2Name, scrapedData);
  }
  
  return provider.extractInsights(bike1Name, bike2Name, scrapedData, xbhpData);
}

/**
 * Extract insights with retry logic
 */
export async function extractInsightsWithRetry(
  bike1Name: string,
  bike2Name: string,
  redditData: any,
  xbhpData?: any,
  maxRetries = 3
) {
  let lastError: Error | null = null;
  const provider = getAIProvider();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await provider.extractInsights(bike1Name, bike2Name, redditData, xbhpData);
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors
      if (error.message.includes("Invalid API key") || error.message.includes("authentication")) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`[AI] Retry ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Failed to extract insights after retries");
}

/**
 * OPTIMIZED: Extract insights with parallel processing
 * Uses user-selected model or falls back to task default
 */
export async function extractInsightsOptimized(
  bike1Name: string,
  bike2Name: string,
  forumData: any,
  modelId?: string,
  maxRetries = 2  // Fewer retries needed with parallel approach
) {
  let lastError: Error | null = null;
  const provider = getAIProvider();
  
  // Check if provider has optimized method
  if (!('extractInsightsOptimized' in provider)) {
    console.warn('[AI] Provider does not support optimized extraction, falling back to standard');
    return extractInsightsWithRetry(bike1Name, bike2Name, forumData, undefined, maxRetries);
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await (provider as any).extractInsightsOptimized(bike1Name, bike2Name, forumData, modelId);
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors
      if (error.message.includes("Invalid API key") || error.message.includes("authentication")) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = 1000 * attempt; // Linear backoff for faster retries
        console.log(`[AI-Optimized] Retry ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Failed to extract insights after retries");
}

/**
 * Generate rider personas from extracted insights
 */
export async function generatePersonas(
  bike1Name: string,
  bike2Name: string,
  insights: InsightExtractionResult
) {
  const provider = getAIProvider();
  
  if (!provider.isConfigured()) {
    throw new Error(`AI provider ${provider.name} is not configured`);
  }
  
  return provider.generatePersonas(bike1Name, bike2Name, insights);
}

/**
 * Generate personas with retry logic
 */
export async function generatePersonasWithRetry(
  bike1Name: string,
  bike2Name: string,
  insights: InsightExtractionResult,
  maxRetries: number = 3
) {
  let lastError: Error | null = null;
  const provider = getAIProvider();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Factory] Persona generation attempt ${attempt}/${maxRetries}`);
      return await provider.generatePersonas(bike1Name, bike2Name, insights);
    } catch (error: any) {
      lastError = error;
      console.error(`[Factory] Attempt ${attempt} failed:`, error.message);
      
      // Don't retry on auth errors
      if (error.message.includes("Invalid API key") || error.message.includes("authentication")) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = 1000 * attempt; // Linear backoff: 1s, 2s, 3s
        console.log(`[Factory] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Persona generation failed after all retries");
}

/**
 * Generate verdicts for each persona
 */
export async function generateVerdicts(
  bike1Name: string,
  bike2Name: string,
  personas: Persona[],
  insights: InsightExtractionResult
): Promise<VerdictGenerationResult> {
  const provider = getAIProvider();
  
  if (!provider.isConfigured()) {
    throw new Error(`AI provider ${provider.name} is not configured`);
  }
  
  return provider.generateVerdicts(bike1Name, bike2Name, personas, insights);
}

/**
 * Generate verdicts with retry logic
 */
export async function generateVerdictsWithRetry(
  bike1Name: string,
  bike2Name: string,
  personas: Persona[],
  insights: InsightExtractionResult,
  maxRetries: number = 3
): Promise<VerdictGenerationResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Factory] Verdict generation attempt ${attempt}/${maxRetries}`);
      return await generateVerdicts(bike1Name, bike2Name, personas, insights);
    } catch (error: any) {
      lastError = error;
      console.error(`[Factory] Attempt ${attempt} failed:`, error.message);
      
      // Don't retry on auth errors
      if (error.message?.includes('API key') || error.message?.includes('401')) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = 1000 * attempt; // Linear backoff: 1s, 2s, 3s
        console.log(`[Factory] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Verdict generation failed after all retries");
}

/**
 * OPTIMIZED: Generate personas with condensed inputs and better prompts
 * 30-40% faster than standard method
 */
export async function generatePersonasOptimized(
  bike1Name: string,
  bike2Name: string,
  insights: InsightExtractionResult,
  maxRetries: number = 2
): Promise<PersonaGenerationResult> {
  let lastError: Error | null = null;
  const provider = getAIProvider();
  
  // Check if provider has optimized method
  if (!('generatePersonasOptimized' in provider)) {
    console.warn('[AI] Provider does not support optimized persona generation, falling back to standard');
    return generatePersonasWithRetry(bike1Name, bike2Name, insights, maxRetries);
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Factory] Optimized persona generation attempt ${attempt}/${maxRetries}`);
      return await (provider as any).generatePersonasOptimized(bike1Name, bike2Name, insights);
    } catch (error: any) {
      lastError = error;
      console.error(`[Factory] Attempt ${attempt} failed:`, error.message);
      
      // Don't retry on auth errors
      if (error.message.includes("Invalid API key") || error.message.includes("authentication")) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = 1000 * attempt;
        console.log(`[Factory] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Optimized persona generation failed after all retries");
}

/**
 * OPTIMIZED: Generate verdicts with parallel processing per persona
 * 3-5x faster than standard method
 */
export async function generateVerdictsOptimized(
  bike1Name: string,
  bike2Name: string,
  personas: Persona[],
  insights: InsightExtractionResult,
  maxRetries: number = 2
): Promise<VerdictGenerationResult> {
  let lastError: Error | null = null;
  const provider = getAIProvider();
  
  // Check if provider has optimized method
  if (!('generateVerdictsOptimized' in provider)) {
    console.warn('[AI] Provider does not support optimized verdict generation, falling back to standard');
    return generateVerdictsWithRetry(bike1Name, bike2Name, personas, insights, maxRetries);
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Factory] Optimized verdict generation attempt ${attempt}/${maxRetries}`);
      return await (provider as any).generateVerdictsOptimized(bike1Name, bike2Name, personas, insights);
    } catch (error: any) {
      lastError = error;
      console.error(`[Factory] Attempt ${attempt} failed:`, error.message);
      
      // Don't retry on auth errors
      if (error.message?.includes('API key') || error.message?.includes('401')) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = 1000 * attempt;
        console.log(`[Factory] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Optimized verdict generation failed after all retries");
}

