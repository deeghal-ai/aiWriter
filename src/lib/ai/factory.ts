/**
 * AI Provider Factory
 * Creates the appropriate AI provider based on configuration
 */

import { ClaudeProvider } from './providers/claude';
import type { AIProvider } from './provider-interface';

/**
 * Get the configured AI provider
 */
export function getAIProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER || 'claude';
  
  switch (providerName.toLowerCase()) {
    case 'claude':
      return new ClaudeProvider();
    
    case 'openai':
      // Future: return new OpenAIProvider();
      throw new Error('OpenAI provider not implemented yet. Use AI_PROVIDER=claude');
    
    case 'gemini':
      // Future: return new GeminiProvider();
      throw new Error('Gemini provider not implemented yet. Use AI_PROVIDER=claude');
    
    default:
      console.warn(`Unknown AI provider: ${providerName}, falling back to Claude`);
      return new ClaudeProvider();
  }
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

