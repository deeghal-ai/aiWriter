/**
 * Model selection strategy for different tasks
 * Now uses the centralized model registry
 * 
 * This file is kept for backward compatibility with existing code
 * New code should import directly from './models/registry'
 */

import { getModelConfigForTask, getModelById, type ModelDefinition } from './models/registry';

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  useCase: string;
}

// Backward compatible MODEL_STRATEGY object
// Dynamically generates from registry
export const MODEL_STRATEGY = {
  get extraction(): ModelConfig {
    return getModelConfigForTask('extraction');
  },
  get synthesis(): ModelConfig {
    return getModelConfigForTask('synthesis');
  },
  get validation(): ModelConfig {
    return getModelConfigForTask('validation');
  }
};

/**
 * Get model config for a task (backward compatible)
 */
export function getModelForTask(task: 'extraction' | 'synthesis' | 'validation'): ModelConfig {
  return getModelConfigForTask(task);
}

/**
 * Get model config for a specific model ID
 * New function to support model selection by ID
 */
export function getModelConfigById(modelId: string): ModelConfig | null {
  const model = getModelById(modelId);
  if (!model) return null;
  
  // Map speed to temperature
  const temperatureMap: Record<string, number> = {
    'fast': 0,
    'medium': 0.3,
    'slow': 0.3
  };
  
  return {
    model: model.modelString,
    maxTokens: model.maxTokens,
    temperature: temperatureMap[model.speed] || 0.3,
    useCase: model.description
  };
}

// Re-export types and functions from registry for convenience
export { 
  type ModelDefinition,
  getModelById,
  getEnabledModels,
  getModelsForCapability,
  getDefaultModel,
  getModelOptions
} from './models/registry';

