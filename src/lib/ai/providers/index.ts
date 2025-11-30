/**
 * AI Providers Module
 * Factory and exports for all AI providers
 */

import { ClaudeProvider } from './claude';
import { BaseProvider, type ProviderFactory } from './base-provider';
import type { ModelDefinition, ProviderName } from '../models/registry';

// ===== PROVIDER REGISTRY =====
// Add new providers here when implementing them

const providers: Record<ProviderName, ProviderFactory | null> = {
  anthropic: () => new ClaudeProvider(),
  openai: null,      // Future: () => new OpenAIProvider()
  google: null,      // Future: () => new GoogleProvider()
  huggingface: null, // Future: () => new HuggingFaceProvider()
  local: null,       // Future: () => new LocalProvider()
};

// ===== FACTORY FUNCTIONS =====

/**
 * Get provider instance for a given provider name
 */
export function getProvider(providerName: ProviderName): BaseProvider {
  const factory = providers[providerName];
  
  if (!factory) {
    throw new Error(
      `Provider "${providerName}" is not implemented yet. ` +
      `Available providers: ${getAvailableProviders().join(', ')}`
    );
  }
  
  return factory();
}

/**
 * Get provider instance for a model definition
 */
export function getProviderForModel(model: ModelDefinition): BaseProvider {
  return getProvider(model.provider);
}

/**
 * Get list of available (implemented) provider names
 */
export function getAvailableProviders(): ProviderName[] {
  return (Object.entries(providers) as [ProviderName, ProviderFactory | null][])
    .filter(([_, factory]) => factory !== null)
    .map(([name, _]) => name);
}

/**
 * Check if a provider is implemented
 */
export function isProviderAvailable(providerName: ProviderName): boolean {
  return providers[providerName] !== null;
}

/**
 * Get provider instance based on environment config
 * Falls back to Claude if not specified
 */
export function getConfiguredProvider(): BaseProvider {
  const providerName = (process.env.AI_PROVIDER || 'anthropic') as ProviderName;
  
  // Normalize common names
  const normalizedName: ProviderName = 
    providerName === 'claude' as any ? 'anthropic' : providerName;
  
  if (!isProviderAvailable(normalizedName)) {
    console.warn(
      `[Providers] Provider "${providerName}" not available, falling back to Claude`
    );
    return getProvider('anthropic');
  }
  
  return getProvider(normalizedName);
}

// ===== RE-EXPORTS =====

export { ClaudeProvider } from './claude';
export { BaseProvider, type ProviderConfig, type ProviderFactory } from './base-provider';

