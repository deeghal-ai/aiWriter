# BikeDekho AI Writer

An AI-powered motorcycle comparison article generator with a centralized, optimized architecture.

## Tech Stack

- **Frontend Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Icons:** Lucide React
- **State Management:** Zustand
- **AI Provider:** Anthropic Claude (Haiku 3.5, Sonnet 4, Opus 4)
- **TypeScript:** Full type safety

---

## Architecture Overview

### Core Design Principles

1. **Centralized Configuration** - All AI models and configs managed in single registry
2. **Factory Pattern** - Simple routes use factory for provider abstraction
3. **Direct + Helpers** - Complex multi-stage routes use registry helpers for transparency
4. **Optimized Prompts** - Single prompt system (optimized, terse, XML-based)
5. **Type Safety** - End-to-end TypeScript with strict typing

---

## Data Flow Architecture

### 🔄 Complete Pipeline

```
User Input (Step 1)
    ↓
Forum Scraping (Step 2)
    ├─ Reddit API
    ├─ YouTube API
    └─ xBhp Scraping
    ↓
Insight Extraction (Step 3) ← Factory Pattern
    ↓
Persona Generation (Step 4) ← Factory Pattern
    ↓
Verdict Generation (Step 5) ← Factory Pattern
    ↓
Article Generation (Step 6) ← Direct + Registry Helpers
    ├─ Planning (1 AI call)
    ├─ Sections (7+ AI calls)
    └─ Coherence (1 AI call)
    ↓
Final Review (Step 8)
```

---

## 🏗️ Detailed Architecture by Stage

### 1. Insight Extraction (Step 3)

**Pattern:** Factory Pattern  
**Flow:** API Route → Factory → Provider → Model Registry

#### Files Involved
```
src/app/api/extract/insights/route.ts
    ↓ calls
src/lib/ai/factory.ts → extractInsightsOptimized()
    ↓ delegates to
src/lib/ai/providers/claude.ts → extractInsightsOptimized()
    ↓ gets config from
src/lib/ai/models/registry.ts → getModelApiConfig('extraction')
    ↓ builds prompts with
src/lib/ai/prompts-optimized.ts → buildSingleBikeExtractionPrompt()
    ↓ uses system prompt
src/lib/ai/prompts-optimized.ts → EXTRACTION_SYSTEM_PROMPT
```

#### Actual Function Flow
```typescript
// 1. API Route receives request
POST /api/extract/insights
  ├─ validates input
  ├─ combines data sources
  └─ calls extractInsightsOptimized(bike1Name, bike2Name, combinedData)

// 2. Factory delegates to provider
extractInsightsOptimized() in factory.ts
  ├─ gets AI provider
  └─ calls provider.extractInsightsOptimized()

// 3. Provider processes with parallel extraction
ClaudeProvider.extractInsightsOptimized()
  ├─ gets model config: getModelApiConfig('extraction')
  │   └─ returns { model: 'claude-3-5-haiku-20241022', temp: 0.1, maxTokens: 4096 }
  ├─ prepares data for both bikes
  ├─ calls extractSingleBikeOptimized() for bike1 (parallel)
  ├─ calls extractSingleBikeOptimized() for bike2 (parallel)
  └─ combines results

// 4. Each bike extraction
extractSingleBikeOptimized(bikeName, bikeData, modelConfig)
  ├─ builds prompt: buildSingleBikeExtractionPrompt(bikeName, bikeData)
  ├─ uses system prompt: EXTRACTION_SYSTEM_PROMPT
  ├─ calls Claude API with modelConfig
  ├─ parses JSON response
  └─ returns BikeInsights { praises, complaints, surprising_insights }
```

#### Model Configuration
```typescript
// From registry.ts
extraction: {
  modelId: 'claude-haiku-3.5',    // Fast, cheap model
  temperature: 0.1,                 // Low for factual extraction
  maxTokens: 4096,
  description: 'Extract insights from forum discussions'
}
```

#### Response Structure
```typescript
{
  bike1: {
    name: "Royal Enfield Classic 350",
    praises: [
      {
        category: "Highway stability at 100kmph",
        frequency: 12,
        quotes: [{ text: "...", author: "...", source: "YouTube|Reddit" }]
      }
    ],
    complaints: [...],
    surprising_insights: ["..."]
  },
  bike2: { ... },
  metadata: { extracted_at, total_praises, total_complaints, total_quotes }
}
```

---

### 2. Persona Generation (Step 4)

**Pattern:** Factory Pattern  
**Flow:** API Route → Factory → Provider → Model Registry

#### Files Involved
```
src/app/api/generate/personas/route.ts
    ↓ calls
src/lib/ai/factory.ts → generatePersonasOptimized()
    ↓ delegates to
src/lib/ai/providers/claude.ts → generatePersonasOptimized()
    ↓ gets config from
src/lib/ai/models/registry.ts → getModelApiConfig('personas')
    ↓ builds prompts with
src/lib/ai/prompts-optimized.ts → buildOptimizedPersonaPrompt()
    ↓ uses system prompt
src/lib/ai/prompts-optimized.ts → PERSONA_SYSTEM_PROMPT
```

#### Actual Function Flow
```typescript
// 1. API Route receives request
POST /api/generate/personas
  ├─ validates insights exist
  └─ calls generatePersonasOptimized(bike1Name, bike2Name, insights)

// 2. Factory delegates to provider
generatePersonasOptimized() in factory.ts
  ├─ gets AI provider
  └─ calls provider.generatePersonasOptimized()

// 3. Provider processes
ClaudeProvider.generatePersonasOptimized()
  ├─ gets model config: getModelApiConfig('personas')
  │   └─ returns { model: 'claude-3-5-haiku-20241022', temp: 0.3, maxTokens: 6144 }
  ├─ builds prompt: buildOptimizedPersonaPrompt(bike1Name, bike2Name, insights)
  │   └─ condenses insights (top 5 praises, top 4 complaints)
  │   └─ includes few-shot examples
  │   └─ uses XML tags for structure
  ├─ uses system prompt: PERSONA_SYSTEM_PROMPT
  ├─ calls Claude API
  ├─ parses JSON response
  ├─ validates persona structure
  └─ returns PersonaGenerationResult

// 4. Prompt optimization
buildOptimizedPersonaPrompt()
  ├─ calls condenseInsightsForPersonas(insights)
  │   └─ reduces data: top praises/complaints per bike
  │   └─ 30-40% token reduction
  ├─ builds XML-structured prompt
  ├─ includes golden rules and anti-patterns
  └─ provides example persona
```

#### Model Configuration
```typescript
// From registry.ts
personas: {
  modelId: 'claude-haiku-3.5',
  temperature: 0.3,        // Moderate for creativity
  maxTokens: 6144,        // More for detailed personas
  description: 'Generate detailed rider personas'
}
```

#### Response Structure
```typescript
{
  personas: [
    {
      id: "persona-1",
      name: "Arjun - The Silk Board Survivor",
      title: "IT professional with 70% city commute",
      percentage: 28,
      sampleSize: 12,
      usagePattern: { cityCommute: 70, highway: 20, urbanLeisure: 10, offroad: 0 },
      demographics: { ageRange: "28-35", cityType: "metro", ... },
      psychographics: { buyingMotivation: "...", decisionStyle: "...", ... },
      priorities: ["Reliability above all", "Comfortable for daily commute", ...],
      painPoints: ["Current bike's seat destroys lower back", ...],
      evidenceQuotes: ["...", "..."],
      archetypeQuote: "I need a bike that won't leave me stranded",
      color: "blue"
    }
  ],
  metadata: { generated_at, total_personas, total_evidence_quotes }
}
```

---

### 3. Verdict Generation (Step 5)

**Pattern:** Factory Pattern (with Parallel Processing)  
**Flow:** API Route → Factory → Provider → Parallel AI Calls

#### Files Involved
```
src/app/api/generate/verdicts/route.ts
    ↓ calls
src/lib/ai/factory.ts → generateVerdictsOptimized()
    ↓ delegates to
src/lib/ai/providers/claude.ts → generateVerdictsOptimized()
    ↓ gets config from
src/lib/ai/models/registry.ts → getModelApiConfig('verdicts')
    ↓ builds prompts with
src/lib/ai/prompts-optimized.ts → buildSingleVerdictPrompt()
    ↓ uses system prompt
src/lib/ai/prompts-optimized.ts → VERDICT_SYSTEM_PROMPT
```

#### Actual Function Flow
```typescript
// 1. API Route receives request
POST /api/generate/verdicts
  ├─ validates personas and insights exist
  └─ calls generateVerdictsOptimized(bike1Name, bike2Name, personas, insights)

// 2. Factory delegates to provider
generateVerdictsOptimized() in factory.ts
  ├─ gets AI provider
  └─ calls provider.generateVerdictsOptimized()

// 3. Provider processes in PARALLEL (3-5x faster)
ClaudeProvider.generateVerdictsOptimized()
  ├─ gets model config: getModelApiConfig('verdicts')
  │   └─ returns { model: 'claude-3-5-haiku-20241022', temp: 0.2, maxTokens: 2048 }
  ├─ creates parallel promises for each persona
  │   └─ Promise.all(personas.map(p => generateSingleVerdictOptimized(p)))
  └─ waits for all verdicts to complete

// 4. Each verdict generation (runs in parallel)
generateSingleVerdictOptimized(bike1Name, bike2Name, persona, insights)
  ├─ builds persona-specific prompt: buildSingleVerdictPrompt()
  │   └─ filters insights relevant to persona's priorities
  │   └─ includes persona's usage pattern and pain points
  ├─ uses system prompt: VERDICT_SYSTEM_PROMPT
  ├─ calls Claude API
  ├─ parses JSON verdict
  ├─ normalizes bike names (handles variations)
  └─ returns Verdict

// 5. Results compilation
  ├─ calculates bike1Wins vs bike2Wins
  ├─ computes average confidence
  ├─ identifies closest call
  └─ returns VerdictGenerationResult
```

#### Model Configuration
```typescript
// From registry.ts
verdicts: {
  modelId: 'claude-haiku-3.5',
  temperature: 0.2,        // Low-moderate for reasoning
  maxTokens: 2048,        // Moderate for verdict reasoning
  description: 'Generate bike recommendations per persona'
}
```

#### Parallel Processing Advantage
```
Traditional (Sequential):
Persona 1 (4s) → Persona 2 (4s) → Persona 3 (4s) = 12 seconds

Optimized (Parallel):
Persona 1 (4s) ┐
Persona 2 (4s) ├─→ Max = 4 seconds (3x faster!)
Persona 3 (4s) ┘
```

#### Response Structure
```typescript
{
  verdicts: [
    {
      personaId: "persona-1",
      personaName: "Arjun",
      personaTitle: "The Silk Board Survivor",
      recommendedBike: "Honda CB350",
      otherBike: "Royal Enfield Classic 350",
      confidence: 78,
      confidenceExplanation: "Clear winner on 2 of 3 priorities",
      reasoning: [
        {
          point: "Superior reliability track record",
          priority: "Reliability above all",
          evidence: "Zero major complaints in 40+ forum posts"
        }
      ],
      againstReasons: ["If resale value is deciding factor, RE holds value 15-20% better"],
      tangibleImpact: { metric: "Service visits/year", value: "2 vs 4", ... },
      verdictOneLiner: "For a reliability-obsessed upgrader, Honda wins"
    }
  ],
  summary: {
    bike1Wins: 2,
    bike2Wins: 1,
    closestCall: "Persona-2 was closest at 62% confidence"
  },
  metadata: { generated_at, total_verdicts, average_confidence }
}
```

---

### 4. Article Generation (Step 6)

**Pattern:** Direct + Registry Helpers (Multi-Stage Pipeline)  
**Flow:** API Route → Direct Anthropic Client → Registry Configs

#### Why Different Pattern?
Article generation is **complex** with 10+ AI calls. Factory pattern would hide orchestration logic. Direct approach with centralized configs provides transparency while maintaining centralization.

#### Files Involved
```
src/app/api/generate/article/route.ts
    ↓ gets configs from
src/lib/ai/models/registry.ts
    ├─ getModelApiConfig('article_planning')   → Sonnet 4
    ├─ getModelApiConfig('article_writing')    → Haiku 3.5
    └─ getModelApiConfig('article_coherence')  → Haiku 3.5
    ↓ builds prompts from
src/lib/ai/article-planner.ts → buildNarrativePlanningPrompt()
src/lib/ai/article-sections/hook.ts → buildHookPrompt()
src/lib/ai/article-sections/truth-bomb.ts → buildTruthBombPrompt()
src/lib/ai/article-sections/personas.ts → buildPersonasPrompt()
src/lib/ai/article-sections/matrix.ts → buildMatrixPrompt()
src/lib/ai/article-sections/contrarian.ts → buildContrarianPrompt()
src/lib/ai/article-sections/verdicts.ts → buildVerdictsPrompt()
src/lib/ai/article-sections/bottom-line.ts → buildBottomLinePrompt()
    ↓ coherence check
src/lib/ai/article-coherence.ts → buildCoherencePrompt()
    ↓ quality validation
src/lib/ai/article-quality-check.ts → checkArticleQuality()
```

#### Actual Function Flow
```typescript
// 1. API Route receives request
POST /api/generate/article
  ├─ validates insights, personas, verdicts exist
  ├─ creates Anthropic client
  └─ orchestrates 3 phases

// PHASE 1: Narrative Planning (1 AI call)
generateNarrativePlan()
  ├─ gets config: getModelApiConfig('article_planning')
  │   └─ { model: 'claude-sonnet-4-20250514', temp: 0.5, maxTokens: 4096 }
  ├─ builds prompt: buildNarrativePlanningPrompt(bikes, insights, personas, verdicts)
  ├─ calls Claude API (Sonnet for strategic planning)
  └─ returns NarrativePlan {
        story_angle,
        hook_strategy,
        matrix_focus_areas: ["Engine Character", "Comfort", "Value"],
        contrarian_angle,
        quote_allocation,
        callbacks
      }

// PHASE 2: Section Generation (7+ AI calls)
// Parallel batch 1 (3 independent sections)
Promise.all([
  generateSection('hook'),           // Uses Haiku
  generateSection('truthBomb'),      // Uses Haiku
  generateSection('personas')        // Uses Haiku
])

// Parallel batch 2 (matrix sections - typically 3)
Promise.all(
  matrix_focus_areas.map(area => 
    generateMatrixSection(area)      // Uses Haiku for each
  )
)

// Sequential (depend on narrative)
generateSection('contrarian')        // Uses Haiku
generateSection('verdicts')          // Uses Haiku
generateSection('bottomLine')        // Uses Haiku

// Each generateSection() call:
generateSection(client, sectionType, data)
  ├─ gets config: getModelApiConfig('article_writing')
  │   └─ { model: 'claude-3-5-haiku-20241022', temp: 0.7, maxTokens: 4096 }
  ├─ selects prompt builder based on sectionType
  │   ├─ 'hook' → buildHookPrompt(bike1Name, bike2Name, narrativePlan, insights)
  │   ├─ 'truthBomb' → buildTruthBombPrompt(narrativePlan, insights)
  │   ├─ 'personas' → buildPersonasPrompt(personas, narrativePlan)
  │   ├─ 'contrarian' → buildContrarianPrompt(winner, loser, narrativePlan, verdicts)
  │   ├─ 'verdicts' → buildVerdictsPrompt(verdicts, personas, narrativePlan)
  │   └─ 'bottomLine' → buildBottomLinePrompt(bikes, narrativePlan, verdicts)
  ├─ calls Claude API with config
  └─ returns section text

// PHASE 3: Coherence Pass (1 AI call)
runCoherencePass(client, sections, narrativePlan)
  ├─ gets config: getModelApiConfig('article_coherence')
  │   └─ { model: 'claude-3-5-haiku-20241022', temp: 0.3, maxTokens: 2048 }
  ├─ builds prompt: buildCoherencePrompt(sections, narrativePlan)
  ├─ calls Claude API
  └─ returns CoherenceEdits { transitions, callbacks, tone_adjustments }

// Apply edits and quality check
applyCoherenceEdits(sections, coherenceEdits)
checkArticleQuality(sections, bike1Name, bike2Name, personas)
```

#### Model Configurations
```typescript
// From registry.ts
article_planning: {
  modelId: 'claude-sonnet-4',      // Smarter model for strategy
  temperature: 0.5,                 // Creative planning
  maxTokens: 4096,
  description: 'Plan article narrative structure'
},
article_writing: {
  modelId: 'claude-haiku-3.5',     // Fast model for writing
  temperature: 0.7,                 // Creative writing
  maxTokens: 4096,
  description: 'Write creative article sections'
},
article_coherence: {
  modelId: 'claude-haiku-3.5',
  temperature: 0.3,                 // Focused editing
  maxTokens: 2048,
  description: 'Check article coherence and flow'
}
```

#### AI Call Breakdown
```
Planning:      1 call  (Sonnet - strategic)
Sections:      7+ calls (Haiku - fast writing)
  ├─ Hook:     1 call
  ├─ Truth:    1 call
  ├─ Personas: 1 call
  ├─ Matrix:   3+ calls (one per focus area)
  ├─ Contrarian: 1 call
  ├─ Verdicts: 1 call
  └─ Bottom:   1 call
Coherence:     1 call  (Haiku - editing)
────────────────────────
Total:         ~10 calls per article
```

#### Response Structure
```typescript
{
  sections: [
    {
      id: 'hook',
      title: 'The Hook',
      content: '...',        // Generated text
      wordCount: 250,
      status: 'complete'
    },
    {
      id: 'truth',
      title: 'The Truth',
      content: '...',
      wordCount: 180,
      status: 'complete'
    },
    // ... all sections
  ],
  narrativePlan: { ... },
  qualityReport: {
    overall_score: 85,
    readability: "good",
    issues: [],
    suggestions: []
  },
  metadata: {
    generated_at,
    total_words: 2847,
    section_count: 8,
    processing_time_ms: 45000
  }
}
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── extract/
│   │   │   └── insights/
│   │   │       └── route.ts          # Extraction API (Factory Pattern)
│   │   ├── generate/
│   │   │   ├── personas/
│   │   │   │   └── route.ts          # Persona API (Factory Pattern)
│   │   │   ├── verdicts/
│   │   │   │   └── route.ts          # Verdict API (Factory Pattern)
│   │   │   └── article/
│   │   │       ├── route.ts          # Article API (Direct + Helpers)
│   │   │       └── streaming/
│   │   │           └── route.ts      # Streaming Article API
│   │   └── scrape/
│   │       ├── reddit/route.ts       # Reddit scraping
│   │       ├── youtube/route.ts      # YouTube scraping
│   │       └── xbhp/route.ts        # xBhp scraping
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                          # shadcn components
│   ├── layout/
│   │   ├── AppHeader.tsx
│   │   └── StepSidebar.tsx
│   └── steps/
│       ├── Step1Input.tsx           # Bike input
│       ├── Step2Scrape.tsx         # Forum scraping
│       ├── Step3Extract.tsx        # Insight extraction
│       ├── Step4Personas.tsx       # Persona generation
│       ├── Step5Verdicts.tsx       # Verdict generation
│       ├── Step6Article.tsx        # Article generation
│       ├── Step7Polish.tsx         # Quality checks
│       └── Step8Review.tsx         # Final review
├── lib/
│   ├── ai/
│   │   ├── models/
│   │   │   └── registry.ts         # ⭐ CENTRAL MODEL REGISTRY
│   │   ├── providers/
│   │   │   ├── claude.ts           # Claude implementation
│   │   │   ├── base-provider.ts    # Provider interface
│   │   │   └── index.ts
│   │   ├── article-sections/
│   │   │   ├── hook.ts
│   │   │   ├── truth-bomb.ts
│   │   │   ├── personas.ts
│   │   │   ├── matrix.ts
│   │   │   ├── contrarian.ts
│   │   │   ├── verdicts.ts
│   │   │   └── bottom-line.ts
│   │   ├── factory.ts              # ⭐ FACTORY LAYER
│   │   ├── prompts-optimized.ts    # ⭐ OPTIMIZED PROMPTS (ACTIVE)
│   │   ├── prompts.ts             # (Deprecated - legacy)
│   │   ├── article-planner.ts
│   │   ├── article-coherence.ts
│   │   └── article-quality-check.ts
│   ├── scrapers/
│   │   ├── reddit.ts
│   │   ├── youtube.ts
│   │   ├── xbhp.ts
│   │   └── sonnet-data-prep.ts
│   ├── store.ts                    # Zustand state management
│   ├── types.ts                    # TypeScript types
│   └── utils.ts
└── utils/
    └── validation.ts                # Validation & quality checks
```

### Key Files

| File | Purpose | Pattern |
|------|---------|---------|
| `models/registry.ts` | Central model configuration | Registry |
| `factory.ts` | Provider abstraction layer | Factory |
| `prompts-optimized.ts` | All AI prompts | Optimized prompts |
| `providers/claude.ts` | Claude API implementation | Provider |
| `api/*/route.ts` | API endpoints | Route handlers |

---

## 🔧 Configuration

### Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...          # Required
REDDIT_CLIENT_ID=...                   # For Reddit scraping
REDDIT_CLIENT_SECRET=...               # For Reddit scraping
YOUTUBE_API_KEY=...                    # For YouTube scraping
```

### Model Configuration

All models configured in `src/lib/ai/models/registry.ts`:

```typescript
const DEFAULT_TASK_CONFIG = {
  extraction: {
    modelId: 'claude-haiku-3.5',      // Fast extraction
    temperature: 0.1,
    maxTokens: 4096
  },
  personas: {
    modelId: 'claude-haiku-3.5',      // Creative personas
    temperature: 0.3,
    maxTokens: 6144
  },
  verdicts: {
    modelId: 'claude-haiku-3.5',      // Reasoning
    temperature: 0.2,
    maxTokens: 2048
  },
  article_planning: {
    modelId: 'claude-sonnet-4',       // Strategic planning
    temperature: 0.5,
    maxTokens: 4096
  },
  article_writing: {
    modelId: 'claude-haiku-3.5',      // Fast writing
    temperature: 0.7,
    maxTokens: 4096
  },
  article_coherence: {
    modelId: 'claude-haiku-3.5',      // Focused editing
    temperature: 0.3,
    maxTokens: 2048
  }
};
```

### Available Models

```typescript
// From MODEL_REGISTRY in registry.ts
{
  'claude-haiku-3.5': {
    speed: 'fast',
    quality: 'standard',
    cost: '$0.001 input / $0.005 output per 1K tokens'
  },
  'claude-sonnet-4': {
    speed: 'medium',
    quality: 'high',
    cost: '$0.003 input / $0.015 output per 1K tokens',
    recommended: true
  },
  'claude-opus-4': {
    speed: 'slow',
    quality: 'premium',
    cost: '$0.015 input / $0.075 output per 1K tokens'
  }
}
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📊 Performance Metrics

### Optimization Results

| Stage | Old Approach | New Approach | Improvement |
|-------|-------------|--------------|-------------|
| Extraction | Sequential (60s) | Parallel (20s) | **3x faster** |
| Personas | Verbose prompts (15s) | Optimized prompts (10s) | **33% faster** |
| Verdicts | Sequential (45s) | Parallel (12s) | **3.75x faster** |
| Article | N/A | Multi-stage (45s) | Baseline |

### Token Savings

| Prompt Type | Standard | Optimized | Savings |
|-------------|----------|-----------|---------|
| Extraction | ~8,000 tokens | ~5,000 tokens | **37%** |
| Personas | ~12,000 tokens | ~7,500 tokens | **37%** |
| Verdicts | ~10,000 tokens | ~3,000 tokens | **70%** |

---

## 🧪 Testing

### Manual Testing Flow

```bash
# 1. Start dev server
npm run dev

# 2. Test each stage
curl -X POST http://localhost:3000/api/extract/insights \
  -H "Content-Type: application/json" \
  -d '{"bike1Name": "...", "bike2Name": "...", "redditData": {...}}'

curl -X POST http://localhost:3000/api/generate/personas \
  -H "Content-Type: application/json" \
  -d '{"bike1Name": "...", "bike2Name": "...", "insights": {...}}'

curl -X POST http://localhost:3000/api/generate/verdicts \
  -H "Content-Type: application/json" \
  -d '{"bike1Name": "...", "bike2Name": "...", "personas": {...}, "insights": {...}}'

curl -X POST http://localhost:3000/api/generate/article \
  -H "Content-Type: application/json" \
  -d '{"bike1Name": "...", "bike2Name": "...", "insights": {...}, "personas": {...}, "verdicts": {...}}'
```

### Testing Strategy

1. **Unit Tests** - Test individual prompt builders
2. **Integration Tests** - Test full API routes
3. **End-to-End Tests** - Test complete pipeline
4. **Performance Tests** - Measure response times

---

## 📖 API Documentation

### POST /api/extract/insights

**Request:**
```typescript
{
  bike1Name: string,
  bike2Name: string,
  redditData?: { bike1: {...}, bike2: {...} },
  youtubeData?: { bike1: {...}, bike2: {...} }
}
```

**Response:**
```typescript
{
  success: true,
  data: InsightExtractionResult,
  meta: { processingTimeMs: number }
}
```

### POST /api/generate/personas

**Request:**
```typescript
{
  bike1Name: string,
  bike2Name: string,
  insights: InsightExtractionResult
}
```

**Response:**
```typescript
{
  success: true,
  data: PersonaGenerationResult
}
```

### POST /api/generate/verdicts

**Request:**
```typescript
{
  bike1Name: string,
  bike2Name: string,
  personas: PersonaGenerationResult,
  insights: InsightExtractionResult
}
```

**Response:**
```typescript
{
  success: true,
  data: VerdictGenerationResult
}
```

### POST /api/generate/article

**Request:**
```typescript
{
  bike1Name: string,
  bike2Name: string,
  insights: InsightExtractionResult,
  personas: PersonaGenerationResult,
  verdicts: VerdictGenerationResult
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    sections: ArticleSection[],
    narrativePlan: NarrativePlan,
    qualityReport: QualityReport,
    metadata: { total_words, section_count, processing_time_ms }
  }
}
```

---

## 🔄 Adding New Models

### 1. Add to Registry

```typescript
// src/lib/ai/models/registry.ts
export const MODEL_REGISTRY: ModelDefinition[] = [
  // ... existing models
  {
    id: 'new-model',
    provider: 'anthropic',
    name: 'New Model',
    modelString: 'claude-...',
    capabilities: ['extraction', 'synthesis'],
    speed: 'fast',
    quality: 'standard',
    costPer1kTokens: { input: 0.001, output: 0.005 },
    maxTokens: 4096,
    contextWindow: 200000,
    description: 'Description',
    enabled: true
  }
];
```

### 2. Update Task Config (Optional)

```typescript
// To use new model for a specific task
const DEFAULT_TASK_CONFIG = {
  extraction: {
    modelId: 'new-model',  // Changed!
    temperature: 0.1,
    maxTokens: 4096
  }
};
```

### 3. That's It!

All routes automatically use the new model. No code changes needed.

---

## 🛠️ Troubleshooting

### Common Issues

**1. "Anthropic API key not configured"**
- Add `ANTHROPIC_API_KEY=sk-ant-...` to `.env.local`

**2. "Response was truncated"**
- Increase `maxTokens` in registry for that task

**3. "Invalid response structure"**
- Check prompt outputs match expected schema
- Review validation in `utils/validation.ts`

**4. Slow performance**
- Use faster models (Haiku instead of Sonnet)
- Reduce `maxTokens` if possible
- Enable parallel processing where available

---

## 📝 Scripts

```bash
# Development
npm run dev              # Start dev server

# Build
npm run build           # Production build
npm start              # Start production server

# Code Quality
npm run lint           # Run ESLint
npm run type-check     # Run TypeScript checks

# Deployment
npm run deploy         # Deploy to Vercel
```

---

## 🏛️ Architecture Decisions

### Why Factory Pattern for Extract/Personas/Verdicts?

**Benefits:**
- ✅ Clean abstraction (routes don't know about AI providers)
- ✅ Easy to swap providers (OpenAI, Google, etc.)
- ✅ Centralized error handling
- ✅ Consistent logging

### Why Direct + Helpers for Article Generation?

**Benefits:**
- ✅ Transparent orchestration (10+ AI calls visible)
- ✅ Easy to debug multi-stage pipeline
- ✅ Flexible section ordering
- ✅ Still centralized via registry helpers

### Why Optimized Prompts Only?

**Benefits:**
- ✅ 30-70% token savings
- ✅ Faster AI responses
- ✅ Lower costs
- ✅ XML structure improves parsing
- ✅ Few-shot examples improve quality

---

## 🤝 Contributing

1. Follow existing patterns (Factory for simple, Direct+Helpers for complex)
2. Use registry for ALL model configs
3. Use optimized prompts
4. Add validation for new endpoints
5. Update this README for architectural changes

---

## 📄 License

MIT

---

## 🙏 Acknowledgments

- Built with Next.js 14 and Anthropic Claude
- UI components from shadcn/ui
- Icons from Lucide React

---

**Last Updated:** December 1, 2025  
**Version:** 2.0.0 (Post-Centralization Refactoring)
