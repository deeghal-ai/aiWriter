/**
 * AI Models Module
 * Re-exports all model registry functions and types
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
  getModelConfigForTask,
  
  // Task Configuration Functions (Central Control)
  getTaskConfig,
  getModelForTask,
  setTaskModel,
  setTaskConfig,
  resetTaskConfig,
  getAllTaskConfigs,
  getModelApiConfig,
} from './registry';

