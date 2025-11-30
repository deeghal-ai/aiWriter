/**
 * AI Models Module
 * Re-exports all model registry functions and types
 * 
 * This is the SINGLE source of truth for model configuration.
 * Import from here instead of model-selector.ts
 */

export {
  // Types
  type ModelCapability,
  type ModelSpeed,
  type ModelQuality,
  type ProviderName,
  type ModelDefinition,
  type ModelOption,
  type TaskType,
  type TaskConfig,
  type ModelConfig,  // Backward compatibility
  
  // Registry
  MODEL_REGISTRY,
  
  // Model Functions
  getEnabledModels,
  getModelsForCapability,
  getModelsForProvider,
  getModelById,
  getDefaultModel,
  getRecommendedModel,
  getModelOptions,
  estimateCost,
  
  // Task Configuration Functions (Central Control)
  getTaskConfig,
  getModelDefinitionForTask,  // Returns ModelDefinition for task
  setTaskModel,
  setTaskConfig,
  resetTaskConfig,
  getAllTaskConfigs,
  getModelApiConfig,
  
  // Backward Compatibility (from old model-selector.ts)
  getModelForTask,       // Returns ModelConfig (legacy format)
  getModelConfigForTask,
  getModelConfigById,
} from './registry';

