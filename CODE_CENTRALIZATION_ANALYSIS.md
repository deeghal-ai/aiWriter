# Code Centralization & Consistency Analysis

**Date:** November 30, 2025  
**Analysis of:** BikeD ekho AI Writer Codebase  
**Focus:** Model selection, prompt usage, and configuration centralization

---

## Executive Summary

This document identifies **inconsistencies and centralization issues** across the codebase where different flows use different approaches, some using centralized configuration while others use hardcoded values.

### ✅ What's Working Well

1. **Centralized Model Registry** (`models/registry.ts`) - Single source of truth for model definitions
2. **Task-Based Configuration** - Central task configs with overrides capability
3. **Prompt Organization** - Two distinct prompt files for different strategies
4. **Provider Abstraction** - Clean provider interface with base class

### ❌ Critical Issues Found

1. **Two Parallel Prompt Systems** - Inconsistent usage patterns
2. **Hardcoded Model Configuration** - Some flows bypass central registry
3. **Mixed Model Selection Logic** - Extract route vs Provider vs Factory
4. **Inconsistent Temperature/Token Settings** - Duplicate configurations
5. **Typo in Central Config** - Breaking article writing flow
6. **Missing Registry Usage** - Some code doesn't use centralized configs

---

## Issue #1: Duplicate Prompt Systems (HIGH PRIORITY)

### Problem

The codebase has **TWO separate prompt files** with overlapping functionality:

1. **`prompts.ts`** - Original prompts (verbose, detailed)
2. **`prompts-optimized.ts`** - Optimized prompts (terse, XML-based)

### Current Usage

| Stage | Standard Flow | Optimized Flow | File Used |
|-------|--------------|----------------|-----------|
| **Extraction** | `buildInsightExtractionPrompt()` | `buildSingleBikeExtractionPrompt()` | Mixed |
| **Personas** | `buildPersonaGenerationPrompt()` | `buildOptimizedPersonaPrompt()` | Mixed |
| **Verdicts** | `buildVerdictGenerationPrompt()` | `buildSingleVerdictPrompt()` | Mixed |
| **Article** | Various section builders | N/A | prompts.ts only |

### Where They're Used

```typescript
// File: src/lib/ai/providers/claude.ts

// STANDARD METHODS use prompts.ts
import { buildInsightExtractionPrompt, buildPersonaGenerationPrompt, buildVerdictGenerationPrompt } from "../prompts";

// Line 78: Standard extraction
const prompt = buildInsightExtractionPrompt(bike1Name, bike2Name, redditData, xbhpData);

// Line 476: Standard personas
const prompt = buildPersonaGenerationPrompt(bike1Name, bike2Name, insights);

// Line 675: Standard verdicts
const prompt = buildVerdictGenerationPrompt(bike1Name, bike2Name, personas, insights);

// OPTIMIZED METHODS use prompts-optimized.ts
import { 
  buildSingleBikeExtractionPrompt, 
  buildOptimizedPersonaPrompt,
  buildSingleVerdictPrompt 
} from "../prompts-optimized";

// Line 939: Optimized personas
const prompt = buildOptimizedPersonaPrompt(bike1Name, bike2Name, insights);

// Line 1115: Optimized verdicts (single)
const prompt = buildSingleVerdictPrompt(bike1Name, bike2Name, persona, insights);
```

```typescript
// File: src/app/api/extract/insights/route.ts

// ALWAYS uses prompts-optimized.ts (Line 14-16)
import { 
  buildSingleBikeExtractionPrompt, 
  EXTRACTION_SYSTEM_PROMPT 
} from "@/lib/ai/prompts-optimized";

// Line 185: Extract uses optimized prompts
const prompt = buildSingleBikeExtractionPrompt(bikeName, preparedData);
```

### Inconsistency

- **Extract API route** (`route.ts`) uses **ONLY** `prompts-optimized.ts`
- **Personas/Verdicts API routes** call factory methods which delegate to provider
- **Provider has BOTH implementations** but API routes choose which factory method to call
- **No clear rule** on when to use which prompt system

### Impact

- ⚠️ **Confusing maintenance** - Two places to update prompts
- ⚠️ **Inconsistent results** - Different prompt styles produce different outputs
- ⚠️ **Documentation burden** - Developers must know which flow uses which prompts

### Recommendation

**Option A: Consolidate** (Recommended)
- Keep only `prompts-optimized.ts` (it's faster and more efficient)
- Deprecate `prompts.ts` or move legacy prompts to `prompts-legacy.ts`
- Update all flows to use optimized prompts

**Option B: Clear Separation**
- Rename files to be more explicit:
  - `prompts-standard.ts` (verbose, detailed)
  - `prompts-fast.ts` (optimized, terse)
- Document when to use each
- Create a prompt strategy selector in registry

**Option C: Unified Prompt Builder**
```typescript
// prompts/index.ts
export function buildPrompt(
  task: 'extraction' | 'personas' | 'verdicts',
  strategy: 'standard' | 'optimized',
  data: any
): string {
  // Single entry point with strategy selection
}
```

---

## Issue #2: Hardcoded Model Strings & Configs

### Problem

Despite having a **centralized model registry**, some code still uses **hardcoded model configurations**.

### Locations of Hardcoded Values

#### A. Claude Provider Constructor

```typescript
// File: src/lib/ai/providers/claude.ts
// Line 40-41

this.model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
this.maxTokens = parseInt(process.env.ANTHROPIC_MAX_TOKENS || "4096");
```

**Issue:** Hardcoded fallback instead of using registry default

**Better approach:**
```typescript
import { getDefaultModel } from '../models/registry';

const defaultModel = getDefaultModel('synthesis');
this.model = process.env.ANTHROPIC_MODEL || defaultModel.modelString;
this.maxTokens = parseInt(process.env.ANTHROPIC_MAX_TOKENS || String(defaultModel.maxTokens));
```

#### B. Max Token Overrides in Provider

```typescript
// File: src/lib/ai/providers/claude.ts

// Line 87: Extraction
const insightMaxTokens = Math.max(this.maxTokens, 8192);

// Line 480: Personas
const personaMaxTokens = Math.max(this.maxTokens, 8192);

// Line 683: Verdicts
const verdictMaxTokens = Math.max(this.maxTokens, 8192);
```

**Issue:** Hardcoded `8192` instead of using registry values

**Better approach:**
```typescript
import { getTaskConfig } from '../models/registry';

const config = getTaskConfig('extraction');
const insightMaxTokens = Math.max(this.maxTokens, config.maxTokens);
```

#### C. Article Route Coherence Temperature

```typescript
// File: src/app/api/generate/article/route.ts
// Line 512

temperature: 0.3, // Lower temperature for editing
```

**Issue:** Hardcoded `0.3` instead of using `article_coherence` task config

**Better approach:**
```typescript
const coherenceConfig = getArticleCoherenceConfig();

temperature: coherenceConfig.temperature
```

### Impact

- ⚠️ **Inconsistent behavior** - Central config changes don't apply everywhere
- ⚠️ **Hard to tune** - Must hunt down hardcoded values to change behavior
- ⚠️ **Registry becomes incomplete** - Not truly "single source of truth"

### Recommendation

**Search and Replace Campaign:**
1. Identify all hardcoded model strings, temperatures, and maxTokens
2. Replace with registry lookups
3. Add linter rule to prevent future hardcoding

---

## Issue #3: CRITICAL BUG - Typo in Model Registry

### Problem

**TYPO in central task configuration breaks article writing!**

```typescript
// File: src/lib/ai/models/registry.ts
// Line 400-405

article_writing: {
  modelId: 'claude-haiku-3.',  // ❌ TYPO! Missing "5" at end
  temperature: 0.7,
  maxTokens: 4096,
  description: 'Write creative article sections'
},
```

**Correct value should be:** `'claude-haiku-3.5'`

### Impact

- 🔴 **BREAKING BUG** - Article writing will fail or use wrong model
- 🔴 **Silent failure** - Might fall back to default without error
- 🔴 **Data quality** - Wrong model = wrong outputs

### Fix Required

```typescript
article_writing: {
  modelId: 'claude-haiku-3.5',  // ✅ Fixed
  temperature: 0.7,
  maxTokens: 4096,
  description: 'Write creative article sections'
},
```

---

## Issue #4: Inconsistent Model Selection Logic

### Problem

**Three different places handle model selection** with different logic:

#### A. Extract Route (Direct Registry Access)

```typescript
// File: src/app/api/extract/insights/route.ts
// Line 63-65

const model = body.modelId 
  ? getModelById(body.modelId)
  : getDefaultModel('extraction');
```

**Approach:** API route directly uses registry

#### B. Persona/Verdict Routes (Factory Delegation)

```typescript
// File: src/app/api/generate/personas/route.ts
// Line 55-59

const result = await generatePersonasOptimized(
  body.bike1Name,
  body.bike2Name,
  body.insights
);
```

**Approach:** API route calls factory, factory calls provider, provider uses registry

#### C. Article Route (Centralized Config Functions)

```typescript
// File: src/app/api/generate/article/route.ts
// Line 28-30

const getArticleWritingConfig = () => getModelApiConfig('article_writing');
const getArticlePlanningConfig = () => getModelApiConfig('article_planning');
```

**Approach:** Helper functions that wrap registry access

### Inconsistency

- **Extract route** knows about models and registry
- **Persona/Verdict routes** are model-agnostic (good!)
- **Article route** creates wrapper functions (also good but different pattern)

### Impact

- ⚠️ **No consistent pattern** - Each developer picks their own approach
- ⚠️ **Testing complexity** - Different mocking strategies needed
- ⚠️ **Refactoring risk** - Changes affect different routes differently

### Recommendation

**Standardize on Article Route Pattern:**

```typescript
// Create centralized config getters (in registry or separate file)
export const getExtractionConfig = () => getModelApiConfig('extraction');
export const getPersonasConfig = () => getModelApiConfig('personas');
export const getVerdictsConfig = () => getModelApiConfig('verdicts');

// All routes use these consistently
```

OR

**Standardize on Factory Pattern** (preferred):
- All routes call factory methods
- Factory handles all model selection
- Routes stay model-agnostic

---

## Issue #5: Mixed Prompt Import Patterns

### Problem

**Inconsistent imports across files** - some use relative imports, some use aliases.

```typescript
// Provider uses relative imports
import { buildInsightExtractionPrompt } from "../prompts";

// API route uses alias imports
import { buildSingleBikeExtractionPrompt } from "@/lib/ai/prompts-optimized";
```

### Impact

- 🟡 **Minor** - Works fine but inconsistent
- 🟡 **Style issue** - Makes codebase less uniform

### Recommendation

**Use aliases everywhere:**
```typescript
import { buildInsightExtractionPrompt } from "@/lib/ai/prompts";
import { buildSingleBikeExtractionPrompt } from "@/lib/ai/prompts-optimized";
```

---

## Issue #6: System Prompts Scattered

### Problem

System prompts are defined in **both prompt files** as constants:

```typescript
// prompts-optimized.ts
export const EXTRACTION_SYSTEM_PROMPT = "You are a data extraction expert...";
export const PERSONA_SYSTEM_PROMPT = "You are an expert in Indian motorcycle...";
export const VERDICT_SYSTEM_PROMPT = "You are an expert motorcycle advisor...";

// Also used directly in provider methods:
// claude.ts line 490
system: "You are an expert in Indian motorcycle buyer psychology..."
```

### Inconsistency

- Some methods use **exported constants** from prompts-optimized
- Some methods use **inline strings** in provider
- No single source of truth for system prompts

### Impact

- ⚠️ **Maintenance** - Must update system prompts in multiple places
- ⚠️ **Inconsistency** - Standard vs optimized flows have different system prompts

### Recommendation

**Create centralized system prompt config:**

```typescript
// lib/ai/system-prompts.ts
export const SYSTEM_PROMPTS = {
  extraction: "You are a data extraction expert. Output only valid JSON matching the provided schema.",
  personas: "You are an expert in Indian motorcycle buyer psychology. Generate specific, evidence-backed personas.",
  verdicts: "You are an expert motorcycle advisor. Make definitive recommendations with evidence.",
  article_planning: "You are an expert content strategist...",
  article_writing: "You are a skilled automotive journalist...",
  article_coherence: "You are an expert editor..."
} as const;

// Use everywhere
import { SYSTEM_PROMPTS } from '@/lib/ai/system-prompts';
system: SYSTEM_PROMPTS.extraction
```

---

## Issue #7: Optimized Methods Not Using Registry (Partially Fixed)

### Problem

The **optimized methods in Claude provider** (lines 942-943, 1118-1123) **DO use the registry** correctly:

```typescript
// Line 942-943: Personas
const modelConfig = getModelApiConfig('personas');
console.log(`[Claude-Optimized] Using ${modelConfig.model}...`);

// Line 1118-1123: Verdicts
const modelConfig = getModelApiConfig('verdicts');
const response = await this.client!.messages.create({
  model: modelConfig.model,
  max_tokens: modelConfig.maxTokens,
  temperature: modelConfig.temperature,
  // ...
});
```

### Good News

✅ **This is correct!** The optimized methods properly use the central registry.

### Remaining Issue

The **standard (non-optimized) methods** in the same provider **do NOT use the registry**:

```typescript
// Line 90-92: Standard extraction
const response = await this.client.messages.create({
  model: this.model,  // ❌ Uses constructor value, not registry
  max_tokens: insightMaxTokens,  // ❌ Hardcoded logic
  // ...
});
```

### Impact

- ⚠️ **Inconsistent** - Optimized methods respect task configs, standard methods don't
- ⚠️ **Config ignored** - Changing task configs in registry won't affect standard methods

### Recommendation

**Update standard methods to use registry:**

```typescript
async extractInsights(...) {
  // Get config from registry instead of constructor values
  const config = getModelApiConfig('extraction');
  
  const response = await this.client.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    // ...
  });
}
```

---

## Summary of Recommendations

### 🔴 Critical (Fix Immediately)

1. **Fix typo in registry** - `'claude-haiku-3.'` → `'claude-haiku-3.5'`

### 🟠 High Priority (Fix Soon)

2. **Consolidate prompt systems** - Choose one approach for prompts
3. **Remove hardcoded model configs** - Use registry everywhere
4. **Standardize model selection pattern** - Consistent across all routes
5. **Update standard provider methods** - Use registry like optimized methods do

### 🟡 Medium Priority (Improve Over Time)

6. **Centralize system prompts** - Single source of truth
7. **Standardize imports** - Use aliases consistently
8. **Document prompt strategies** - When to use which prompts

### ✅ Nice to Have

9. **Create linter rules** - Prevent hardcoded model strings/configs
10. **Add tests** - Verify registry is used correctly everywhere

---

## Recommended Refactoring Plan

### Phase 1: Fix Critical Bug ✅
- Fix typo: `claude-haiku-3.` → `claude-haiku-3.5`
- Test article generation works

### Phase 2: Standardize Prompt Usage
- **Option 1:** Keep optimized prompts only, deprecate standard
- **Option 2:** Rename files for clarity, document strategy
- Update all code to use chosen approach

### Phase 3: Remove Hardcoded Configs
- Search for all hardcoded temperatures, maxTokens, model strings
- Replace with registry lookups
- Test each flow after changes

### Phase 4: Standardize Provider Methods
- Update standard methods in `claude.ts` to use registry
- Test both optimized and standard flows
- Consider deprecating one if both aren't needed

### Phase 5: Centralize System Prompts
- Create `system-prompts.ts` with all system prompts
- Update all imports
- Test generation quality

### Phase 6: Add Safeguards
- ESLint rule: No hardcoded `claude-*` strings except in registry
- ESLint rule: No hardcoded temperature/maxTokens except in registry
- Unit tests: Verify registry is used for all model configs

---

## Conclusion

The codebase has a **good foundation** with the centralized model registry and task configuration system. However, **inconsistent adoption** across the codebase undermines these benefits.

**Key Takeaway:** The registry exists, but not all code uses it. Fixing this will make the codebase much more maintainable and consistent.

**Estimated Effort:**
- Phase 1 (Critical): 15 minutes
- Phases 2-3: 2-3 hours
- Phases 4-5: 3-4 hours
- Phase 6: 2 hours

**Total: ~8-10 hours** to fully centralize and standardize.

