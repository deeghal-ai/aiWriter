/**
 * Model selection strategy for different tasks
 * Optimizes for speed vs quality tradeoffs
 */

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  useCase: string;
}

export const MODEL_STRATEGY = {
  // Fast extraction - Haiku is 5-10x faster, perfect for structured data extraction
  extraction: {
    model: 'claude-3-5-haiku-20241022',
    maxTokens: 4096,
    temperature: 0, // Deterministic output
    useCase: 'Structured data extraction from text'
  } as ModelConfig,
  
  // Smart synthesis - Sonnet for nuanced analysis
  synthesis: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 8192,
    temperature: 0.3, // Slight creativity
    useCase: 'Persona generation, verdicts, article writing'
  } as ModelConfig,
  
  // Quality check - Haiku is enough for validation
  validation: {
    model: 'claude-3-5-haiku-20241022',
    maxTokens: 2048,
    temperature: 0,
    useCase: 'JSON validation, quality checks'
  } as ModelConfig
};

export function getModelForTask(task: 'extraction' | 'synthesis' | 'validation'): ModelConfig {
  return MODEL_STRATEGY[task];
}

