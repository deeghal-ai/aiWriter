# Model Selection System: Analysis & Refactoring Plan

## 📋 Executive Summary

After thoroughly analyzing your codebase through the project knowledge, I've identified the exact issue you're experiencing and created a comprehensive refactoring plan to make your model selection system more robust, flexible, and ready for future model additions.

---

## 🔍 Current State Analysis

### What You've Built (Very Good Architecture!)

Your current implementation has strong foundations:

```
src/lib/ai/
├── provider-interface.ts    # Base interface for AI providers
├── factory.ts               # Factory pattern for provider selection
├── model-selector.ts        # Task-based model strategy
├── schemas.ts               # JSON schemas for structured outputs
├── prompts.ts               # Reusable prompt templates
├── prompts-optimized.ts     # Optimized prompts with few-shot examples
└── providers/
    └── claude.ts            # Claude implementation
```

### Current Model Configuration

```typescript
// model-selector.ts
export const MODEL_STRATEGY = {
  extraction: { model: 'claude-3-5-haiku-20241022', ... },
  synthesis:  { model: 'claude-sonnet-4-20250514', ... },
  validation: { model: 'claude-3-5-haiku-20241022', ... }
};
```

### Two Scraping Sources (Working Well)
1. **Reddit** - Optional, uses external Python scraper
2. **YouTube** - Primary source with transcript + comments

---

## 🐛 The Bug You've Identified

### Problem: Model Selection Not Shown on Regenerate

**Location:** `src/components/steps/Step3Extract.tsx`

**Current Code Flow:**
```typescript
// Model selection UI conditional
{!extractedInsights && !isExtracting && (
  <Card className="mb-6 border-blue-200 bg-blue-50">
    {/* Model Selection UI - Sonnet vs Haiku */}
  </Card>
)}
```

**The Issue:**
When you click "Restart Extraction", the code calls `startExtraction()` directly **without resetting `extractedInsights` first**:

```typescript
<Button onClick={startExtraction} variant="outline">
  <RefreshCw className="h-4 w-4" />
  Restart Extraction
</Button>
```

Since `extractedInsights` is not null after initial generation, the model selection UI never shows again because of this conditional:
```typescript
{!extractedInsights && !isExtracting && (...)}
//  ↑ This is still truthy after first extraction!
```

### Root Cause
The restart button doesn't clear the state before re-extraction, so the condition `!extractedInsights` is false, hiding the model selector.

---

## 🏗️ Current Architecture Issues

### 1. **Hardcoded Model Lists**
Models are scattered across multiple files:
- `model-selector.ts` - Task strategies
- `claude.ts` - Default model fallbacks  
- `Step3Extract.tsx` - UI labels ("Sonnet", "Haiku")

### 2. **No Centralized Model Registry**
If you want to add GPT-4, Gemini, or Hugging Face models, you'd need to modify:
- Provider files
- Model selector
- UI components
- API routes

### 3. **Coupling Between UI and Model IDs**
The component uses a boolean `useSonnet` instead of a model ID:
```typescript
const [useSonnet, setUseSonnet] = useState(true);
const endpoint = useSonnet ? '/api/extract/insights-sonnet' : '/api/extract/insights';
```

### 4. **Separate Endpoints for Different Models**
Two routes exist:
- `/api/extract/insights` (Haiku)
- `/api/extract/insights-sonnet` (Sonnet)

This doesn't scale well for multiple models.

---

## ✨ Refactoring Plan

### Phase 1: Quick Fix (Immediate)
**Goal:** Fix the regenerate bug without major changes

### Phase 2: Model Registry System
**Goal:** Centralize model configuration

### Phase 3: Unified API Endpoint
**Goal:** Single endpoint that accepts model parameter

### Phase 4: Future-Ready Provider System
**Goal:** Easy addition of new model providers

---

## 📝 Phase 1: Quick Fix for Regenerate Bug

### File: `src/components/steps/Step3Extract.tsx`

**Change the restart button handler:**

```typescript
// Current (broken)
<Button onClick={startExtraction} variant="outline">

// Fixed - add handleRestart function
const handleRestart = () => {
  // Clear existing insights to show model selector
  setExtractedInsights(null);
  setProgress(0);
  setHasStarted(false);
  setError(null);
  // Don't call startExtraction - let user pick model first
};

// In JSX
<Button onClick={handleRestart} variant="outline">
  <RefreshCw className="h-4 w-4" />
  Restart Extraction
</Button>
```

**Or alternatively, show model selector during regenerate:**

```typescript
// Modified condition to show selector
{(!extractedInsights || showModelSelector) && !isExtracting && (
  // Model Selection Card
)}

// Add state
const [showModelSelector, setShowModelSelector] = useState(false);

// Restart handler shows selector
const handleRestart = () => {
  setShowModelSelector(true);
};

// When starting extraction
const startExtraction = () => {
  setShowModelSelector(false);
  // ... rest of extraction logic
};
```

---

## 📝 Phase 2: Centralized Model Registry

### New File: `src/lib/ai/models/registry.ts`

```typescript
/**
 * Centralized Model Registry
 * Single source of truth for all available AI models
 */

export type ModelCapability = 'extraction' | 'synthesis' | 'validation' | 'generation';
export type ModelSpeed = 'fast' | 'medium' | 'slow';
export type ModelQuality = 'standard' | 'high' | 'premium';

export interface ModelDefinition {
  id: string;                      // Unique identifier
  provider: 'anthropic' | 'openai' | 'google' | 'huggingface' | 'local';
  name: string;                    // Display name
  modelString: string;             // API model string
  capabilities: ModelCapability[]; // What tasks it can do
  speed: ModelSpeed;
  quality: ModelQuality;
  costPer1kTokens: {
    input: number;
    output: number;
  };
  maxTokens: number;
  contextWindow: number;
  description: string;
  recommended?: boolean;
  isDefault?: boolean;
  enabled: boolean;                // Can be toggled
}

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
    description: 'Fast & cheap. Best for data extraction.',
    isDefault: false,
    enabled: true,
  },
  {
    id: 'claude-sonnet-4',
    provider: 'anthropic',
    name: 'Claude Sonnet 4',
    modelString: 'claude-sonnet-4-20250514',
    capabilities: ['extraction', 'synthesis', 'generation'],
    speed: 'medium',
    quality: 'high',
    costPer1kTokens: { input: 0.003, output: 0.015 },
    maxTokens: 8192,
    contextWindow: 200000,
    description: 'Balanced quality & speed. Recommended for most tasks.',
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
  
  // ===== OPENAI MODELS (Future) =====
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
    enabled: false, // Enable when ready
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
  
  // ===== GOOGLE MODELS (Future) =====
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
  
  // ===== HUGGING FACE / OPEN SOURCE (Future) =====
  {
    id: 'llama-3.3-70b',
    provider: 'huggingface',
    name: 'Llama 3.3 70B',
    modelString: 'meta-llama/Llama-3.3-70B-Instruct',
    capabilities: ['extraction', 'synthesis'],
    speed: 'medium',
    quality: 'high',
    costPer1kTokens: { input: 0.00035, output: 0.0014 }, // Via inference API
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
  
  // ===== LOCAL MODELS (Future) =====
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

export function getEnabledModels(): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.enabled);
}

export function getModelsForCapability(capability: ModelCapability): ModelDefinition[] {
  return getEnabledModels().filter(m => m.capabilities.includes(capability));
}

export function getModelsForProvider(provider: ModelDefinition['provider']): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.provider === provider);
}

export function getModelById(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.find(m => m.id === id);
}

export function getDefaultModel(capability: ModelCapability): ModelDefinition {
  const models = getModelsForCapability(capability);
  return models.find(m => m.isDefault) || models.find(m => m.recommended) || models[0];
}

export function getRecommendedModel(capability: ModelCapability): ModelDefinition | undefined {
  return getModelsForCapability(capability).find(m => m.recommended);
}

// For UI dropdowns
export interface ModelOption {
  id: string;
  name: string;
  description: string;
  badge?: 'recommended' | 'fast' | 'premium' | 'free';
}

export function getModelOptions(capability: ModelCapability): ModelOption[] {
  return getModelsForCapability(capability).map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    badge: m.recommended ? 'recommended' 
         : m.speed === 'fast' ? 'fast'
         : m.quality === 'premium' ? 'premium'
         : m.costPer1kTokens.input === 0 ? 'free'
         : undefined
  }));
}
```

---

## 📝 Phase 3: Unified API Endpoint

### Replace Two Endpoints with One

**Current:**
- `/api/extract/insights` (Haiku)
- `/api/extract/insights-sonnet` (Sonnet)

**New:** `/api/extract/insights` (accepts `modelId` parameter)

### File: `src/app/api/extract/insights/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getModelById, getDefaultModel } from '@/lib/ai/models/registry';
import { extractInsightsWithModel } from '@/lib/ai/factory';

interface InsightExtractionRequest {
  bike1Name: string;
  bike2Name: string;
  redditData?: any;
  youtubeData?: any;
  xbhpData?: any;
  modelId?: string;  // NEW: Optional model selection
}

export async function POST(request: NextRequest) {
  try {
    const body: InsightExtractionRequest = await request.json();
    
    // Validate input
    if (!body.bike1Name || !body.bike2Name) {
      return NextResponse.json(
        { success: false, error: 'Bike names are required' },
        { status: 400 }
      );
    }
    
    if (!body.redditData && !body.youtubeData) {
      return NextResponse.json(
        { success: false, error: 'Scraped data is required (Reddit or YouTube)' },
        { status: 400 }
      );
    }
    
    // Get model configuration
    const model = body.modelId 
      ? getModelById(body.modelId) 
      : getDefaultModel('extraction');
    
    if (!model) {
      return NextResponse.json(
        { success: false, error: `Unknown model: ${body.modelId}` },
        { status: 400 }
      );
    }
    
    console.log(`[API] Using model: ${model.name} (${model.modelString})`);
    
    // Extract insights using selected model
    const insights = await extractInsightsWithModel(
      body.bike1Name,
      body.bike2Name,
      body.redditData || body.youtubeData,
      body.xbhpData,
      model
    );
    
    return NextResponse.json({
      success: true,
      data: insights,
      meta: {
        modelUsed: model.id,
        modelName: model.name
      }
    });
    
  } catch (error: any) {
    console.error('[API] Extraction error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

---

## 📝 Phase 4: Updated Component with Proper Model Selection

### File: `src/components/steps/Step3Extract.tsx` (Refactored)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, CheckCircle2, Zap, Crown, Star } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getModelOptions, getDefaultModel, type ModelOption } from '@/lib/ai/models/registry';
import type { InsightExtractionResult } from '@/lib/types';

export function Step3Extract() {
  // ... existing store hooks ...
  
  const [selectedModelId, setSelectedModelId] = useState<string>(
    () => getDefaultModel('extraction').id
  );
  const [showModelSelector, setShowModelSelector] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  // ... other state ...
  
  // Get available models for extraction
  const modelOptions = getModelOptions('extraction');
  
  // Handle restart - shows model selector again
  const handleRestart = () => {
    setExtractedInsights(null);
    setShowModelSelector(true);
    setProgress(0);
    setError(null);
    setInsights(null); // Clear store too
  };
  
  const startExtraction = async () => {
    // ... validation ...
    
    setIsExtracting(true);
    setShowModelSelector(false);
    
    try {
      const response = await fetch('/api/extract/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bike1Name: comparison.bike1,
          bike2Name: comparison.bike2,
          redditData: scrapedData.reddit,
          youtubeData: scrapedData.youtube,
          xbhpData: scrapedData.xbhp,
          modelId: selectedModelId  // Pass selected model
        })
      });
      
      // ... rest of extraction logic ...
      
    } catch (err) {
      // ... error handling ...
    }
  };
  
  // Model Selection UI Component
  const ModelSelector = () => (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardContent className="pt-6">
        <h3 className="font-semibold text-blue-900 mb-4">Select AI Model</h3>
        <div className="grid gap-3">
          {modelOptions.map((model) => (
            <button
              key={model.id}
              onClick={() => setSelectedModelId(model.id)}
              className={`p-4 rounded-lg border-2 text-left transition ${
                selectedModelId === model.id
                  ? 'border-blue-600 bg-blue-100'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-lg">{model.name}</div>
                {model.badge && (
                  <Badge variant={
                    model.badge === 'recommended' ? 'default' :
                    model.badge === 'fast' ? 'secondary' :
                    model.badge === 'premium' ? 'destructive' : 'outline'
                  }>
                    {model.badge === 'fast' && <Zap className="w-3 h-3 mr-1" />}
                    {model.badge === 'premium' && <Crown className="w-3 h-3 mr-1" />}
                    {model.badge === 'recommended' && <Star className="w-3 h-3 mr-1" />}
                    {model.badge}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{model.description}</p>
            </button>
          ))}
        </div>
        
        <Button 
          onClick={startExtraction} 
          className="w-full mt-4"
          disabled={isExtracting}
        >
          {isExtracting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting...
            </>
          ) : (
            'Start Extraction'
          )}
        </Button>
      </CardContent>
    </Card>
  );
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Show model selector before extraction OR when restarting */}
      {showModelSelector && !isExtracting && <ModelSelector />}
      
      {/* ... rest of the component ... */}
      
      {/* Restart button - now properly shows model selector */}
      {extractedInsights && !showModelSelector && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Extraction Complete</h3>
                <p className="text-sm text-slate-600">
                  Re-analyze with a different model?
                </p>
              </div>
              <Button onClick={handleRestart} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Change Model & Re-extract
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## 📝 Phase 5: Provider Abstraction for Multiple Sources

### New File: `src/lib/ai/providers/base-provider.ts`

```typescript
import type { ModelDefinition } from '../models/registry';
import type { InsightExtractionResult } from '../../types';

export abstract class BaseProvider {
  abstract name: string;
  abstract supportedModels: string[]; // List of provider names this handles
  
  abstract isConfigured(): boolean;
  
  abstract extractInsights(
    model: ModelDefinition,
    bike1Name: string,
    bike2Name: string,
    scrapedData: any,
    xbhpData?: any
  ): Promise<InsightExtractionResult>;
  
  // Add more methods as needed
}
```

### Updated Provider Factory: `src/lib/ai/providers/index.ts`

```typescript
import { ClaudeProvider } from './claude';
import { OpenAIProvider } from './openai';      // Future
import { GoogleProvider } from './google';      // Future
import { HuggingFaceProvider } from './huggingface'; // Future
import { LocalProvider } from './local';        // Future
import type { ModelDefinition } from '../models/registry';
import type { BaseProvider } from './base-provider';

const providers: Record<string, () => BaseProvider> = {
  anthropic: () => new ClaudeProvider(),
  openai: () => new OpenAIProvider(),
  google: () => new GoogleProvider(),
  huggingface: () => new HuggingFaceProvider(),
  local: () => new LocalProvider(),
};

export function getProviderForModel(model: ModelDefinition): BaseProvider {
  const providerFactory = providers[model.provider];
  
  if (!providerFactory) {
    throw new Error(`No provider found for: ${model.provider}`);
  }
  
  return providerFactory();
}
```

---

## 🗂️ Final Directory Structure

```
src/lib/ai/
├── models/
│   ├── registry.ts          # NEW: Central model registry
│   └── index.ts              # NEW: Export helpers
├── providers/
│   ├── base-provider.ts      # NEW: Abstract base class
│   ├── claude.ts             # Updated: Claude implementation
│   ├── openai.ts             # Future: OpenAI implementation
│   ├── google.ts             # Future: Gemini implementation
│   ├── huggingface.ts        # Future: HF implementation
│   ├── local.ts              # Future: Ollama/local
│   └── index.ts              # NEW: Provider factory
├── factory.ts                # Updated: Uses registry
├── schemas.ts                # Unchanged
├── prompts.ts                # Unchanged
├── prompts-optimized.ts      # Unchanged
└── README.md                 # Updated documentation
```

---

## 📋 Implementation Priority

### Week 1: Quick Win
1. ✅ Fix regenerate bug (30 min)
2. ✅ Test both models work

### Week 2: Foundation
1. Create `models/registry.ts` (1 hour)
2. Update `Step3Extract.tsx` to use registry (1 hour)
3. Consolidate API endpoints (1 hour)

### Week 3: Future-Proofing
1. Create `base-provider.ts` abstraction (30 min)
2. Update Claude provider to extend base (30 min)
3. Add stub providers for OpenAI/Google (1 hour)

### Week 4: Optional Enhancements
1. Add Hugging Face provider
2. Add Ollama/local support
3. Model comparison UI

---

## 🎯 Benefits of This Refactoring

| Benefit | Before | After |
|---------|--------|-------|
| Add new model | Edit 5+ files | Add 1 entry to registry |
| Switch providers | Change env vars + code | Add entry + enable flag |
| UI model options | Hardcoded | Dynamic from registry |
| API endpoints | Multiple | Single unified |
| Future providers | Major refactor | Implement interface |
| Cost tracking | Manual | Built into registry |
| Model comparison | Not possible | Easy with metadata |

---

## 🔧 Quick Fix You Can Apply Now

While the full refactoring plan is comprehensive, here's the **immediate fix** for the regenerate bug:

In `Step3Extract.tsx`, change the restart button from:

```typescript
<Button onClick={startExtraction} variant="outline">
```

To:

```typescript
const handleRestart = () => {
  setExtractedInsights(null);  // Clear insights to show selector
  setProgress(0);
  setHasStarted(false);
  // Model selector will now show because extractedInsights is null
};

<Button onClick={handleRestart} variant="outline">
```

This 2-line fix will immediately solve your regenerate issue!

---

## Questions?

This refactoring plan is designed to:
1. Fix your immediate bug
2. Set you up for easy model additions
3. Follow your project philosophy of "simple but clever"

Let me know if you'd like me to implement any specific phase!
