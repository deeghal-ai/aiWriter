# Modular AI Provider Architecture

## Overview

This directory contains a **modular AI provider system** with a **centralized model registry** that allows you to easily:
- Add new models (just add an entry to the registry)
- Switch between providers (Claude, OpenAI, Gemini, etc.)
- Select models by capability (extraction, synthesis, validation)
- Display dynamic model options in the UI

## Architecture

```
src/lib/ai/
├── models/
│   ├── registry.ts          # Centralized model registry (single source of truth)
│   └── index.ts             # Re-exports
├── providers/
│   ├── base-provider.ts     # Abstract base class for providers
│   ├── claude.ts            # Claude/Anthropic implementation ✅
│   └── index.ts             # Provider factory & exports
├── provider-interface.ts    # Legacy interface (kept for compatibility)
├── factory.ts               # Factory functions with retry logic
├── model-selector.ts        # Task-based model selection (uses registry)
├── schemas.ts               # JSON schemas for structured outputs
├── prompts.ts               # Prompt templates
└── prompts-optimized.ts     # Optimized prompts with few-shot examples
```

## Model Registry

The model registry (`models/registry.ts`) is the **single source of truth** for all available AI models.

### Adding a New Model

Simply add an entry to `MODEL_REGISTRY`:

```typescript
// In models/registry.ts
{
  id: 'gpt-4o',                    // Unique identifier
  provider: 'openai',              // Which provider handles this
  name: 'GPT-4o',                  // Display name
  modelString: 'gpt-4o',           // API model string
  capabilities: ['extraction', 'synthesis', 'generation'],
  speed: 'medium',
  quality: 'high',
  costPer1kTokens: { input: 0.005, output: 0.015 },
  maxTokens: 4096,
  contextWindow: 128000,
  description: 'OpenAI flagship model.',
  enabled: true,  // Set to true when provider is implemented
}
```

### Using the Registry

```typescript
import { 
  getModelById, 
  getModelsForCapability, 
  getDefaultModel,
  getModelOptions 
} from '@/lib/ai/models/registry';

// Get a specific model
const sonnet = getModelById('claude-sonnet-4');

// Get all models for extraction
const extractionModels = getModelsForCapability('extraction');

// Get the default model for a capability
const defaultExtractor = getDefaultModel('extraction');

// Get options formatted for UI dropdowns
const options = getModelOptions('extraction');
// Returns: [{ id, name, description, speed, quality, badge }, ...]
```

## Current Providers

| Provider | Status | Models |
|----------|--------|--------|
| Anthropic (Claude) | ✅ Active | Haiku 3.5, Sonnet 4, Opus 4 |
| OpenAI | 🚧 Planned | GPT-4o, GPT-4o Mini |
| Google Gemini | 🚧 Planned | 1.5 Pro, 1.5 Flash |
| Hugging Face | 🚧 Planned | Llama 3.3, Mixtral |
| Local (Ollama) | 🚧 Planned | Llama 3.2 |

## How to Use

### Basic Usage

```typescript
import { extractInsights } from '@/lib/ai/factory';

const insights = await extractInsights(
  "KTM 390 Adventure",
  "Royal Enfield Himalayan 440",
  scrapedData
);
```

### With Specific Model

```typescript
import { extractInsightsWithModel } from '@/lib/ai/factory';
import { getModelById } from '@/lib/ai/models/registry';

const model = getModelById('claude-sonnet-4');
const insights = await extractInsightsWithModel(
  bike1Name,
  bike2Name,
  scrapedData,
  undefined,
  model
);
```

### With Retry Logic

```typescript
import { extractInsightsWithRetry } from '@/lib/ai/factory';

const insights = await extractInsightsWithRetry(
  bike1Name,
  bike2Name,
  scrapedData,
  undefined,
  3 // maxRetries
);
```

### In UI Components

```typescript
import { getModelOptions, getDefaultModel } from '@/lib/ai/models/registry';

// In your component
const modelOptions = getModelOptions('extraction');
const defaultModel = getDefaultModel('extraction');

const [selectedModelId, setSelectedModelId] = useState(defaultModel.id);

// Render model selector
{modelOptions.map(model => (
  <button 
    key={model.id}
    onClick={() => setSelectedModelId(model.id)}
    className={selectedModelId === model.id ? 'selected' : ''}
  >
    {model.name} - {model.description}
    {model.badge && <Badge>{model.badge}</Badge>}
  </button>
))}
```

## Adding a New Provider

### Step 1: Create Provider Class

Create `src/lib/ai/providers/openai.ts`:

```typescript
import OpenAI from 'openai';
import { BaseProvider } from './base-provider';
import type { InsightExtractionResult } from '../../types';

export class OpenAIProvider extends BaseProvider {
  readonly name = "OpenAI GPT-4";
  readonly providerId = "openai";
  private client: OpenAI | null = null;
  
  constructor() {
    super();
    if (this.isConfigured()) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });
    }
  }
  
  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
  
  getConfig() {
    return {
      model: process.env.OPENAI_MODEL || "gpt-4o",
      maxTokens: 4096
    };
  }
  
  async extractInsights(/* ... */): Promise<InsightExtractionResult> {
    // Implementation
  }
  
  async generatePersonas(/* ... */) {
    // Implementation
  }
  
  async generateVerdicts(/* ... */) {
    // Implementation
  }
}
```

### Step 2: Register Provider

Update `src/lib/ai/providers/index.ts`:

```typescript
import { OpenAIProvider } from './openai';

const providers: Record<ProviderName, ProviderFactory | null> = {
  anthropic: () => new ClaudeProvider(),
  openai: () => new OpenAIProvider(),  // Add this
  google: null,
  huggingface: null,
  local: null,
};
```

### Step 3: Enable Models

In `models/registry.ts`, set `enabled: true` for OpenAI models:

```typescript
{
  id: 'gpt-4o',
  provider: 'openai',
  // ...
  enabled: true,  // Enable it
}
```

### Step 4: Install SDK & Configure

```bash
npm install openai
```

```env
# .env.local
OPENAI_API_KEY=sk-...
```

Done! OpenAI models will now appear in the UI and be available for use.

## Model Selection in API

The `/api/extract/insights` endpoint now accepts a `modelId` parameter:

```typescript
// Request body
{
  bike1Name: "KTM Duke 390",
  bike2Name: "Bajaj Dominar 400",
  youtubeData: { ... },
  modelId: "claude-sonnet-4"  // Optional, defaults to extraction default
}

// Response includes model info
{
  success: true,
  data: { ... },
  meta: {
    modelUsed: "claude-sonnet-4",
    modelName: "Claude Sonnet 4",
    modelQuality: "high"
  }
}
```

## Benefits

| Feature | Before | After |
|---------|--------|-------|
| Add new model | Edit 5+ files | Add 1 registry entry |
| Switch providers | Change env vars + code | Enable flag in registry |
| UI model options | Hardcoded | Dynamic from registry |
| API endpoints | Multiple | Single unified |
| Future providers | Major refactor | Implement interface |
| Cost tracking | Manual | Built into registry |

## Troubleshooting

### Error: "Provider not configured"
- Check your `.env.local` has the correct API key
- Restart dev server after changing `.env.local`

### Error: "Unknown model"
- Check the `modelId` exists in the registry
- Verify the model is `enabled: true`

### Error: "Provider not implemented"
- The model's provider hasn't been implemented yet
- Check `providers/index.ts` for available providers

### Model not appearing in UI
- Verify `enabled: true` in registry
- Check the model has the required capability

---

**This architecture is future-proof and flexible!** 🚀
