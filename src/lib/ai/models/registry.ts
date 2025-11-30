/**
 * Centralized Model Registry
 * Single source of truth for all available AI models
 * 
 * This registry makes it easy to:
 * - Add new models (just add an entry)
 * - Enable/disable models without code changes
 * - Get model options for UI dropdowns
 * - Select models by capability (extraction, synthesis, etc.)
 */

export type ModelCapability = 'extraction' | 'synthesis' | 'validation' | 'generation';
export type ModelSpeed = 'fast' | 'medium' | 'slow';
export type ModelQuality = 'standard' | 'high' | 'premium';
export type ProviderName = 'anthropic' | 'openai' | 'google' | 'huggingface' | 'local';

export interface ModelDefinition {
  id: string;                      // Unique identifier (used in API calls)
  provider: ProviderName;
  name: string;                    // Display name
  modelString: string;             // API model string (what gets sent to the provider)
  capabilities: ModelCapability[]; // What tasks this model can do
  speed: ModelSpeed;
  quality: ModelQuality;
  costPer1kTokens: {
    input: number;
    output: number;
  };
  maxTokens: number;
  contextWindow: number;
  description: string;
  recommended?: boolean;           // Show "recommended" badge
  isDefault?: boolean;             // Use as default for its capabilities
  enabled: boolean;                // Can be toggled without removing
}

/**
 * Main Model Registry
 * Add new models here - they'll automatically appear in UI if enabled
 */
export const MODEL_REGISTRY: ModelDefinition[] = [
  // ===== ANTHROPIC MODELS =====
  {
    id: 'claude-haiku-3.5',
    provider: 'anthropic',
    name: 'Claude Haiku 3.5',
    modelString: 'claude-3-5-haiku-20241022',
    capabilities: ['extraction', 'validation'],
    speed: 'fast',
    quality: 'standard',
    costPer1kTokens: { input: 0.001, output: 0.005 },
    maxTokens: 8192,
    contextWindow: 200000,
    description: 'Fast & cheap. Best for quick extraction.',
    isDefault: false,
    enabled: true,
  },
  {
    id: 'claude-sonnet-4',
    provider: 'anthropic',
    name: 'Claude Sonnet 4',
    modelString: 'claude-sonnet-4-20250514',
    capabilities: ['extraction', 'synthesis', 'generation', 'validation'],
    speed: 'medium',
    quality: 'high',
    costPer1kTokens: { input: 0.003, output: 0.015 },
    maxTokens: 8192,
    contextWindow: 200000,
    description: 'Balanced quality & speed. Best for most tasks.',
    recommended: true,
    isDefault: true,
    enabled: true,
  },
  {
    id: 'claude-opus-4',
    provider: 'anthropic',
    name: 'Claude Opus 4',
    modelString: 'claude-opus-4-20250514',
    capabilities: ['extraction', 'synthesis', 'generation', 'validation'],
    speed: 'slow',
    quality: 'premium',
    costPer1kTokens: { input: 0.015, output: 0.075 },
    maxTokens: 16384,
    contextWindow: 200000,
    description: 'Highest quality. Best for complex synthesis.',
    enabled: true,
  },
  
  // ===== OPENAI MODELS (Future - disabled by default) =====
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    modelString: 'gpt-4o',
    capabilities: ['extraction', 'synthesis', 'generation'],
    speed: 'medium',
    quality: 'high',
    costPer1kTokens: { input: 0.005, output: 0.015 },
    maxTokens: 4096,
    contextWindow: 128000,
    description: 'OpenAI flagship model.',
    enabled: false, // Enable when OpenAI provider is implemented
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    modelString: 'gpt-4o-mini',
    capabilities: ['extraction', 'validation'],
    speed: 'fast',
    quality: 'standard',
    costPer1kTokens: { input: 0.00015, output: 0.0006 },
    maxTokens: 16384,
    contextWindow: 128000,
    description: 'Fast & ultra-cheap OpenAI model.',
    enabled: false,
  },
  
  // ===== GOOGLE MODELS (Future - disabled by default) =====
  {
    id: 'gemini-1.5-pro',
    provider: 'google',
    name: 'Gemini 1.5 Pro',
    modelString: 'gemini-1.5-pro',
    capabilities: ['extraction', 'synthesis', 'generation'],
    speed: 'medium',
    quality: 'high',
    costPer1kTokens: { input: 0.00125, output: 0.005 },
    maxTokens: 8192,
    contextWindow: 2000000, // 2M context!
    description: 'Google flagship with massive context.',
    enabled: false,
  },
  {
    id: 'gemini-1.5-flash',
    provider: 'google',
    name: 'Gemini 1.5 Flash',
    modelString: 'gemini-1.5-flash',
    capabilities: ['extraction', 'validation'],
    speed: 'fast',
    quality: 'standard',
    costPer1kTokens: { input: 0.000075, output: 0.0003 },
    maxTokens: 8192,
    contextWindow: 1000000,
    description: 'Ultra-fast Google model.',
    enabled: false,
  },
  
  // ===== HUGGING FACE / OPEN SOURCE (Future - disabled by default) =====
  {
    id: 'llama-3.3-70b',
    provider: 'huggingface',
    name: 'Llama 3.3 70B',
    modelString: 'meta-llama/Llama-3.3-70B-Instruct',
    capabilities: ['extraction', 'synthesis'],
    speed: 'medium',
    quality: 'high',
    costPer1kTokens: { input: 0.00035, output: 0.0014 },
    maxTokens: 4096,
    contextWindow: 128000,
    description: 'Open-source via Hugging Face Inference.',
    enabled: false,
  },
  {
    id: 'mixtral-8x7b',
    provider: 'huggingface',
    name: 'Mixtral 8x7B',
    modelString: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    capabilities: ['extraction'],
    speed: 'fast',
    quality: 'standard',
    costPer1kTokens: { input: 0.00024, output: 0.00024 },
    maxTokens: 4096,
    contextWindow: 32000,
    description: 'Fast open-source MoE model.',
    enabled: false,
  },
  
  // ===== LOCAL MODELS (Future - disabled by default) =====
  {
    id: 'local-ollama',
    provider: 'local',
    name: 'Local (Ollama)',
    modelString: 'llama3.2', // Configurable
    capabilities: ['extraction'],
    speed: 'medium',
    quality: 'standard',
    costPer1kTokens: { input: 0, output: 0 }, // Free!
    maxTokens: 4096,
    contextWindow: 8192,
    description: 'Run locally with Ollama. Zero cost.',
    enabled: false,
  },
];

// ===== HELPER FUNCTIONS =====

/**
 * Get all enabled models
 */
export function getEnabledModels(): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.enabled);
}

/**
 * Get models that support a specific capability
 */
export function getModelsForCapability(capability: ModelCapability): ModelDefinition[] {
  return getEnabledModels().filter(m => m.capabilities.includes(capability));
}

/**
 * Get models for a specific provider
 */
export function getModelsForProvider(provider: ProviderName): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.provider === provider);
}

/**
 * Get a model by its ID
 */
export function getModelById(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.find(m => m.id === id);
}

/**
 * Get the default model for a capability
 */
export function getDefaultModel(capability: ModelCapability): ModelDefinition {
  const models = getModelsForCapability(capability);
  // Return default, then recommended, then first available
  return models.find(m => m.isDefault) || models.find(m => m.recommended) || models[0];
}

/**
 * Get the recommended model for a capability
 */
export function getRecommendedModel(capability: ModelCapability): ModelDefinition | undefined {
  return getModelsForCapability(capability).find(m => m.recommended);
}

// ===== UI HELPERS =====

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  speed: ModelSpeed;
  quality: ModelQuality;
  badge?: 'recommended' | 'fast' | 'premium' | 'free';
}

/**
 * Get model options formatted for UI dropdowns
 */
export function getModelOptions(capability: ModelCapability): ModelOption[] {
  return getModelsForCapability(capability).map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    speed: m.speed,
    quality: m.quality,
    badge: m.recommended ? 'recommended' 
         : m.speed === 'fast' ? 'fast'
         : m.quality === 'premium' ? 'premium'
         : m.costPer1kTokens.input === 0 ? 'free'
         : undefined
  }));
}

/**
 * Estimate cost for a request based on model and token counts
 */
export function estimateCost(
  modelId: string, 
  inputTokens: number, 
  outputTokens: number
): number {
  const model = getModelById(modelId);
  if (!model) return 0;
  
  return (
    (inputTokens / 1000) * model.costPer1kTokens.input +
    (outputTokens / 1000) * model.costPer1kTokens.output
  );
}

// ===== BACKWARD COMPATIBILITY =====
// These types and functions are kept for existing code that imported from model-selector.ts

/**
 * Legacy ModelConfig interface (from model-selector.ts)
 */
export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  useCase: string;
}

/**
 * Get model config for task-based selection (backward compatibility)
 * @deprecated Use getModelApiConfig() for new code
 */
export function getModelConfigForTask(task: 'extraction' | 'synthesis' | 'validation'): ModelConfig {
  const capability = task as ModelCapability;
  const model = getDefaultModel(capability);
  
  // Map speed to temperature
  const temperatureMap: Record<ModelSpeed, number> = {
    'fast': 0,
    'medium': 0.3,
    'slow': 0.3
  };
  
  return {
    model: model.modelString,
    maxTokens: model.maxTokens,
    temperature: temperatureMap[model.speed],
    useCase: model.description
  };
}

/**
 * Alias for getModelConfigForTask (backward compatibility)
 * @deprecated Use getModelApiConfig() for new code
 */
export function getModelForTask(task: 'extraction' | 'synthesis' | 'validation'): ModelConfig {
  return getModelConfigForTask(task);
}

/**
 * Get model config by ID (backward compatibility)
 */
export function getModelConfigById(modelId: string): ModelConfig | null {
  const model = getModelById(modelId);
  if (!model) return null;
  
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

// ===== CENTRAL TASK CONFIGURATION =====
// This is the single source of truth for which models are used for each task in the app

export type TaskType = 
  | 'extraction'           // Step 3: Extract insights from forum data
  | 'personas'             // Step 4: Generate rider personas
  | 'verdicts'             // Step 5: Generate bike recommendations
  | 'article_planning'     // Step 6: Plan article structure
  | 'article_writing'      // Step 6: Write article sections
  | 'article_coherence';   // Step 6: Check and improve coherence

export interface TaskConfig {
  modelId: string;
  temperature: number;
  maxTokens: number;
  description: string;
}

/**
 * Default task configuration
 * Change these values to control which models are used throughout the app
 */
const DEFAULT_TASK_CONFIG: Record<TaskType, TaskConfig> = {
  extraction: {
    modelId: 'claude-haiku-3.5',
    temperature: 0.1,
    maxTokens: 4096,
    description: 'Extract insights from forum discussions'
  },
  personas: {
    modelId: 'claude-haiku-3.5',
    temperature: 0.3,
    maxTokens: 6144,
    description: 'Generate detailed rider personas'
  },
  verdicts: {
    modelId: 'claude-haiku-3.5',
    temperature: 0.2,
    maxTokens: 2048,
    description: 'Generate bike recommendations per persona'
  },
  article_planning: {
    modelId: 'claude-sonnet-4',
    temperature: 0.5,
    maxTokens: 4096,
    description: 'Plan article narrative structure'
  },
  article_writing: {
    modelId: 'claude-haiku-3.',
    temperature: 0.7,
    maxTokens: 4096,
    description: 'Write creative article sections'
  },
  article_coherence: {
    modelId: 'claude-haiku-3.5',
    temperature: 0.3,
    maxTokens: 2048,
    description: 'Check article coherence and flow'
  }
};

// In-memory override storage (can be extended to persist to localStorage/DB)
let taskConfigOverrides: Partial<Record<TaskType, Partial<TaskConfig>>> = {};

/**
 * Get the model configuration for a specific task
 */
export function getTaskConfig(task: TaskType): TaskConfig {
  const defaults = DEFAULT_TASK_CONFIG[task];
  const overrides = taskConfigOverrides[task] || {};
  
  return {
    ...defaults,
    ...overrides
  };
}

/**
 * Get the full model definition for a task
 * Returns the ModelDefinition object, not ModelConfig
 */
export function getModelDefinitionForTask(task: TaskType): ModelDefinition {
  const config = getTaskConfig(task);
  const model = getModelById(config.modelId);
  
  if (!model) {
    console.warn(`[Registry] Model ${config.modelId} not found for task ${task}, using default`);
    return getDefaultModel('synthesis');
  }
  
  return model;
}

/**
 * Override the model for a specific task (e.g., from user selection)
 */
export function setTaskModel(task: TaskType, modelId: string): void {
  const model = getModelById(modelId);
  if (!model) {
    console.warn(`[Registry] Cannot set unknown model ${modelId} for task ${task}`);
    return;
  }
  
  taskConfigOverrides[task] = {
    ...taskConfigOverrides[task],
    modelId
  };
  
  console.log(`[Registry] Set ${task} model to ${model.name}`);
}

/**
 * Override task configuration
 */
export function setTaskConfig(task: TaskType, config: Partial<TaskConfig>): void {
  taskConfigOverrides[task] = {
    ...taskConfigOverrides[task],
    ...config
  };
}

/**
 * Reset task configuration to defaults
 */
export function resetTaskConfig(task?: TaskType): void {
  if (task) {
    delete taskConfigOverrides[task];
  } else {
    taskConfigOverrides = {};
  }
}

/**
 * Get all task configurations (for UI display)
 */
export function getAllTaskConfigs(): Record<TaskType, TaskConfig & { model: ModelDefinition }> {
  const tasks: TaskType[] = [
    'extraction', 'personas', 'verdicts', 
    'article_planning', 'article_writing', 'article_coherence'
  ];
  
  return tasks.reduce((acc, task) => {
    const config = getTaskConfig(task);
    const model = getModelById(config.modelId) || getDefaultModel('synthesis');
    acc[task] = { ...config, model };
    return acc;
  }, {} as Record<TaskType, TaskConfig & { model: ModelDefinition }>);
}

/**
 * Get model string and config ready for API calls
 * This is the primary function to use when making AI API calls
 */
export function getModelApiConfig(task: TaskType): {
  model: string;
  maxTokens: number;
  temperature: number;
} {
  const config = getTaskConfig(task);
  const model = getModelById(config.modelId);
  
  return {
    model: model?.modelString || 'claude-sonnet-4-20250514',
    maxTokens: config.maxTokens,
    temperature: config.temperature
  };
}

