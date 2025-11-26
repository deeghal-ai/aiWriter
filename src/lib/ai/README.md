# Modular AI Provider Architecture

## Overview

This directory contains a **modular AI provider system** that allows you to easily swap between different AI models (Claude, OpenAI, Gemini, etc.) without changing your application code.

## Architecture

```
src/lib/ai/
├── provider-interface.ts    # Base interface all providers must implement
├── factory.ts               # Factory to create the right provider
├── schemas.ts               # JSON schemas for structured outputs
├── prompts.ts               # Prompt templates (reusable)
└── providers/
    ├── claude.ts            # Claude/Anthropic implementation ✅
    ├── openai.ts            # OpenAI implementation (TODO)
    └── gemini.ts            # Google Gemini implementation (TODO)
```

## Current Provider

**Active**: Claude (Anthropic)  
**Model**: claude-sonnet-4-20250514  
**Status**: ✅ Fully implemented

## How to Use

### Basic Usage

```typescript
import { extractInsights } from '@/lib/ai/factory';

const insights = await extractInsights(
  "KTM 390 Adventure",
  "Royal Enfield Himalayan 440",
  redditData,
  xbhpData
);
```

### With Retry Logic

```typescript
import { extractInsightsWithRetry } from '@/lib/ai/factory';

const insights = await extractInsightsWithRetry(
  bike1Name,
  bike2Name,
  redditData,
  xbhpData,
  maxRetries // default: 3
);
```

## Switching AI Providers

### 1. Update Environment Variable

In `.env.local`:

```env
# Change this to switch providers
AI_PROVIDER=claude    # Options: claude, openai, gemini
```

### 2. Add Provider API Key

```env
# For Claude
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# For OpenAI (future)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# For Gemini (future)
GOOGLE_AI_API_KEY=...
GOOGLE_AI_MODEL=gemini-1.5-pro
```

### 3. Restart Application

```bash
npm run dev
```

That's it! Your app will now use the new provider.

## Adding a New Provider

Want to add OpenAI, Gemini, or another model? Follow these steps:

### Step 1: Create Provider Class

Create `src/lib/ai/providers/openai.ts`:

```typescript
import OpenAI from 'openai';
import { buildInsightExtractionPrompt } from '../prompts';
import type { AIProvider } from '../provider-interface';
import type { InsightExtractionResult } from '../../types';

export class OpenAIProvider implements AIProvider {
  name = "OpenAI GPT-4";
  private client: OpenAI | null = null;
  private model: string;
  private maxTokens: number;
  
  constructor() {
    this.model = process.env.OPENAI_MODEL || "gpt-4-turbo-preview";
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || "4096");
    
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
      model: this.model,
      maxTokens: this.maxTokens
    };
  }
  
  async extractInsights(
    bike1Name: string,
    bike2Name: string,
    redditData: any,
    xbhpData?: any
  ): Promise<InsightExtractionResult> {
    if (!this.client) {
      throw new Error("OpenAI API not configured");
    }
    
    const startTime = Date.now();
    
    const prompt = buildInsightExtractionPrompt(
      bike1Name,
      bike2Name,
      redditData,
      xbhpData || { bike1: { threads: [] }, bike2: { threads: [] } }
    );
    
    // Call OpenAI with JSON mode
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{
        role: "user",
        content: prompt
      }],
      response_format: { type: "json_object" },
      max_tokens: this.maxTokens
    });
    
    const insights = JSON.parse(response.choices[0].message.content || "{}");
    
    // Calculate metadata and return
    const processingTime = Date.now() - startTime;
    
    return {
      bike1: insights.bike1,
      bike2: insights.bike2,
      metadata: {
        extracted_at: new Date().toISOString(),
        total_praises: insights.bike1.praises.length + insights.bike2.praises.length,
        total_complaints: insights.bike1.complaints.length + insights.bike2.complaints.length,
        total_quotes: /* calculate */,
        processing_time_ms: processingTime
      }
    };
  }
}
```

### Step 2: Register in Factory

Update `src/lib/ai/factory.ts`:

```typescript
import { OpenAIProvider } from './providers/openai';

export function getAIProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER || 'claude';
  
  switch (providerName.toLowerCase()) {
    case 'claude':
      return new ClaudeProvider();
    
    case 'openai':
      return new OpenAIProvider();  // ✅ ADD THIS
    
    case 'gemini':
      return new GeminiProvider();
    
    default:
      return new ClaudeProvider();
  }
}
```

### Step 3: Install SDK

```bash
npm install openai
```

### Step 4: Test

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

Done! Your app now uses OpenAI instead of Claude.

## Provider Interface

All providers must implement:

```typescript
interface AIProvider {
  name: string;
  
  extractInsights(
    bike1Name: string,
    bike2Name: string,
    redditData: any,
    xbhpData?: any
  ): Promise<InsightExtractionResult>;
  
  isConfigured(): boolean;
  
  getConfig(): {
    model: string;
    maxTokens: number;
  };
}
```

## Benefits of This Architecture

### ✅ Easy Provider Switching
Change one environment variable to switch AI models

### ✅ No Code Changes
Your application code stays the same

### ✅ Type Safety
TypeScript ensures all providers follow the same interface

### ✅ Consistent Output
All providers return the same InsightExtractionResult format

### ✅ Testable
Each provider can be tested independently

### ✅ Extensible
Add new providers without modifying existing code

## Cost Comparison (per comparison)

| Provider | Model | Input Cost | Output Cost | Total/Comparison |
|----------|-------|------------|-------------|------------------|
| Claude | Sonnet 4 | $3/M tokens | $15/M tokens | ~$0.21 |
| OpenAI | GPT-4 Turbo | $10/M tokens | $30/M tokens | ~$0.70 |
| Gemini | Pro 1.5 | $1.25/M tokens | $5/M tokens | ~$0.09 |

*Based on ~60K input, ~2K output tokens per comparison*

## Current Configuration

Check your active configuration:

```typescript
import { getAIProvider } from '@/lib/ai/factory';

const provider = getAIProvider();
console.log(provider.name);        // "Claude (Anthropic)"
console.log(provider.getConfig()); // { model: "claude-sonnet-4-20250514", maxTokens: 4096 }
console.log(provider.isConfigured()); // true/false
```

## Troubleshooting

### Error: "Provider not configured"
- Check your `.env.local` has the correct API key
- Restart dev server after changing `.env.local`

### Error: "Unknown provider"
- Check `AI_PROVIDER` value in `.env.local`
- Valid options: `claude`, `openai`, `gemini`

### Want to test without API calls?
Create a `MockProvider` for development:

```typescript
export class MockProvider implements AIProvider {
  name = "Mock Provider";
  
  isConfigured() {
    return true;
  }
  
  getConfig() {
    return { model: "mock", maxTokens: 0 };
  }
  
  async extractInsights(/* ... */): Promise<InsightExtractionResult> {
    // Return mock data
    return { /* ... */ };
  }
}
```

## Future Providers

Planned implementations:
- [ ] OpenAI (GPT-4 Turbo, GPT-4o)
- [ ] Google Gemini (Pro 1.5)
- [ ] Anthropic Claude (Haiku for cost optimization)
- [ ] Local models (Ollama, LM Studio)

---

**This architecture makes your app future-proof and flexible!** 🚀

