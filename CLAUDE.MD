# Claude Code Context for BikeDekho AI Writer

This document provides essential context for Claude Code when working on the BikeDekho AI Writer project.

## Project Overview

**BikeDekho AI Writer** is an AI-powered motorcycle comparison article generator that creates persona-driven comparison articles by scraping forum data (Reddit, YouTube, xBhp), extracting insights, generating rider personas, and producing engaging articles.

**Tech Stack:**
- Next.js 14 (App Router)
- TypeScript (strict mode)
- Anthropic Claude AI (Haiku 3.5, Sonnet 4, Opus 4)
- Zustand (state management)
- Tailwind CSS + shadcn/ui
- Supabase (database)

## Architecture Principles

### 1. Centralized Configuration
All AI model configurations are managed in `src/lib/ai/models/registry.ts`. This is the single source of truth for:
- Model definitions (Haiku, Sonnet, Opus)
- Task-specific configurations (extraction, personas, verdicts, article generation)
- Temperature and token limits

### 2. Two Design Patterns

**Factory Pattern** (Simple routes):
- Used for: Insight extraction, Persona generation, Verdict generation
- Flow: `API Route → Factory → Provider → Registry`
- Files: `src/lib/ai/factory.ts` → `src/lib/ai/providers/claude.ts`

**Direct + Registry Helpers** (Complex routes):
- Used for: Article generation (10+ AI calls)
- Flow: `API Route → Direct Anthropic Client → Registry Configs`
- Files: `src/app/api/generate/article/route.ts` uses configs from `registry.ts`

### 3. Optimized Prompts
- ALL prompts are in `src/lib/ai/prompts-optimized.ts`
- XML-structured, terse, few-shot examples
- 30-70% token savings vs standard prompts
- `src/lib/ai/prompts.ts` is DEPRECATED - do not use

## Key Directories

```
src/
├── app/
│   ├── api/
│   │   ├── extract/insights/    # Step 3: Extract insights (Factory)
│   │   ├── generate/
│   │   │   ├── personas/        # Step 4: Generate personas (Factory)
│   │   │   ├── verdicts/        # Step 5: Generate verdicts (Factory)
│   │   │   └── article/         # Step 6: Generate article (Direct)
│   │   └── scrape/              # Step 2: Reddit/YouTube/xBhp scrapers
│   └── page.tsx                 # Main UI
├── components/
│   ├── steps/                   # Step 1-8 UI components
│   └── ui/                      # shadcn/ui components
└── lib/
    ├── ai/
    │   ├── models/registry.ts   # ⭐ CENTRAL CONFIG - ALWAYS USE THIS
    │   ├── factory.ts           # ⭐ Factory pattern for simple routes
    │   ├── prompts-optimized.ts # ⭐ ALL AI prompts live here
    │   ├── providers/claude.ts  # Claude API implementation
    │   ├── article-sections/    # Article section builders
    │   ├── article-planner.ts
    │   ├── article-coherence.ts
    │   └── article-quality-check.ts
    ├── scrapers/                # Reddit, YouTube, xBhp scrapers
    ├── store.ts                 # Zustand state management
    ├── types.ts                 # TypeScript types
    └── utils.ts
```

## Critical Files

### 1. `src/lib/ai/models/registry.ts`
**Purpose:** Single source of truth for ALL AI model configurations

**When to modify:**
- Adding a new AI model
- Changing model for a specific task
- Adjusting temperature or token limits

**Example:**
```typescript
const DEFAULT_TASK_CONFIG = {
  extraction: {
    modelId: 'claude-haiku-3.5',
    temperature: 0.1,
    maxTokens: 4096
  }
};
```

### 2. `src/lib/ai/factory.ts`
**Purpose:** Abstraction layer for AI provider operations

**When to modify:**
- Adding a new AI operation type
- Changing provider selection logic

**Do NOT modify for:** Individual route implementations (those should call factory methods)

### 3. `src/lib/ai/prompts-optimized.ts`
**Purpose:** Contains ALL system prompts and prompt builders

**When to modify:**
- Improving prompt quality
- Adding new section types
- Adjusting output structure

**Important:** Always use XML structure and include examples

### 4. `src/lib/ai/providers/claude.ts`
**Purpose:** Claude API implementation

**When to modify:**
- Changing API call logic
- Adding streaming support
- Error handling improvements

## Data Flow (8 Steps)

```
Step 1: User Input (bike names)
    ↓
Step 2: Forum Scraping (Reddit, YouTube, xBhp)
    ↓
Step 3: Insight Extraction (Factory Pattern)
    - API: POST /api/extract/insights
    - Model: claude-haiku-3.5 (fast, factual)
    - Output: Praises, complaints, surprising insights
    ↓
Step 4: Persona Generation (Factory Pattern)
    - API: POST /api/generate/personas
    - Model: claude-haiku-3.5 (creative)
    - Output: 3-5 rider personas with usage patterns
    ↓
Step 5: Verdict Generation (Factory Pattern, Parallel)
    - API: POST /api/generate/verdicts
    - Model: claude-haiku-3.5 (reasoning)
    - Output: Bike recommendation per persona
    ↓
Step 6: Article Generation (Direct + Registry, 10+ AI calls)
    - API: POST /api/generate/article
    - Planning: claude-sonnet-4 (strategic)
    - Writing: claude-haiku-3.5 (fast, creative)
    - Coherence: claude-haiku-3.5 (editing)
    - Output: 8 article sections
    ↓
Step 7: Quality Check (validation)
    ↓
Step 8: Final Review & Export
```

## Common Tasks

### Adding a New AI Model

1. Add to `MODEL_REGISTRY` in `src/lib/ai/models/registry.ts`:
```typescript
{
  id: 'new-model-id',
  provider: 'anthropic',
  name: 'Display Name',
  modelString: 'claude-...',
  capabilities: ['extraction', 'synthesis'],
  speed: 'fast' | 'medium' | 'slow',
  quality: 'standard' | 'high' | 'premium',
  costPer1kTokens: { input: 0.001, output: 0.005 },
  maxTokens: 4096,
  contextWindow: 200000,
  enabled: true
}
```

2. (Optional) Update `DEFAULT_TASK_CONFIG` to use new model for specific tasks

3. That's it! All routes automatically use registry

### Modifying a Prompt

1. Locate prompt in `src/lib/ai/prompts-optimized.ts`
2. Maintain XML structure: `<instructions>`, `<examples>`, `<input>`
3. Keep it terse and structured
4. Include few-shot examples for quality
5. Test with sample data

### Adding a New Article Section

1. Create section builder in `src/lib/ai/article-sections/new-section.ts`
2. Export `buildNewSectionPrompt()`
3. Add to article generation pipeline in `src/app/api/generate/article/route.ts`
4. Add section prompt import and call in appropriate sequence

### Debugging AI Responses

1. Check `meta.processingTimeMs` in API responses
2. Review token usage in API logs
3. Validate response structure against types in `src/lib/types.ts`
4. Use quality check functions in `src/lib/ai/article-quality-check.ts`

## Development Workflow

### Running the Project
```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run type-check       # TypeScript validation
npm run lint             # ESLint
```

### Environment Variables (.env.local)
```bash
ANTHROPIC_API_KEY=sk-ant-...     # Required for AI
REDDIT_CLIENT_ID=...             # For Reddit scraping
REDDIT_CLIENT_SECRET=...         # For Reddit scraping
YOUTUBE_API_KEY=...              # For YouTube scraping
```

### Testing API Endpoints
```bash
# Step 3: Extract insights
curl -X POST http://localhost:3000/api/extract/insights \
  -H "Content-Type: application/json" \
  -d '{"bike1Name": "...", "bike2Name": "...", "redditData": {...}}'

# Step 4: Generate personas
curl -X POST http://localhost:3000/api/generate/personas \
  -H "Content-Type: application/json" \
  -d '{"bike1Name": "...", "bike2Name": "...", "insights": {...}}'

# Step 5: Generate verdicts
curl -X POST http://localhost:3000/api/generate/verdicts \
  -H "Content-Type: application/json" \
  -d '{"bike1Name": "...", "bike2Name": "...", "personas": {...}, "insights": {...}}'

# Step 6: Generate article
curl -X POST http://localhost:3000/api/generate/article \
  -H "Content-Type: application/json" \
  -d '{"bike1Name": "...", "bike2Name": "...", "insights": {...}, "personas": {...}, "verdicts": {...}}'
```

## Code Style Guidelines

### TypeScript
- Strict mode enabled
- All types defined in `src/lib/types.ts`
- Use interfaces for data structures
- Use type aliases for unions/primitives

### React Components
- Functional components only
- Use hooks (useState, useEffect, custom hooks)
- Props interfaces defined inline or in types.ts

### AI Integration
- ALWAYS use registry for model configs
- ALWAYS use optimized prompts
- Follow existing patterns (Factory vs Direct)
- Handle errors gracefully with try-catch
- Log processing times

### Naming Conventions
- Files: kebab-case (e.g., `article-planner.ts`)
- Components: PascalCase (e.g., `Step3Extract.tsx`)
- Functions: camelCase (e.g., `extractInsightsOptimized()`)
- Constants: UPPER_SNAKE_CASE (e.g., `EXTRACTION_SYSTEM_PROMPT`)

## Performance Optimizations

### Parallel Processing
- Insight extraction: Processes both bikes in parallel
- Verdict generation: Generates all persona verdicts in parallel
- Article sections: Independent sections generated in parallel batches

### Token Optimization
- Use condensed data for prompts (top N praises/complaints)
- XML structure for efficient parsing
- Streaming responses where applicable

### Model Selection
- Fast tasks (extraction, writing): claude-haiku-3.5
- Strategic tasks (planning): claude-sonnet-4
- Premium quality: claude-opus-4 (when needed)

## Troubleshooting

### "Anthropic API key not configured"
→ Add `ANTHROPIC_API_KEY` to `.env.local`

### "Response was truncated"
→ Increase `maxTokens` in registry for that task

### "Invalid response structure"
→ Check prompt output matches expected TypeScript interface
→ Review validation in `src/utils/validation.ts`

### Slow performance
→ Use faster models (Haiku vs Sonnet)
→ Reduce maxTokens if possible
→ Ensure parallel processing is enabled

### TypeScript errors
→ Run `npm run type-check`
→ Check types in `src/lib/types.ts`
→ Ensure all props interfaces are defined

## Important Notes for Claude

1. **NEVER modify `src/lib/ai/prompts.ts`** - it's deprecated, use `prompts-optimized.ts`
2. **ALWAYS use `registry.ts`** for model configurations
3. **Follow existing patterns** - Factory for simple routes, Direct for complex
4. **Maintain XML structure** in prompts for consistency
5. **Test changes** using curl commands before considering complete
6. **Check TypeScript** types match API responses
7. **Preserve parallel processing** - don't make things sequential unnecessarily

## Recent Changes (Version 2.0.0)

- ✅ Centralized all model configs to registry.ts
- ✅ Implemented optimized prompts (30-70% token savings)
- ✅ Added parallel processing for verdicts (3.75x faster)
- ✅ Moved from verbose to XML-structured prompts
- ✅ Deprecated old prompts.ts file
- ✅ Implemented Factory pattern for simple routes
- ✅ Maintained Direct pattern for complex article generation

## Reference Documentation

- Main README: `README.md` (comprehensive architecture guide)
- Implementation Summary: `IMPLEMENTATION_SUMMARY.md`
- Centralization Summary: `CENTRALIZATION_COMPLETE_SUMMARY.md`
- Quick Reference: `QUICK_REFERENCE.md`
- Database Schema: `table_schema.md`

---

**Last Updated:** December 3, 2025
**Maintained By:** Development Team
**Contact:** For questions about this codebase, refer to the comprehensive README.md
