# Single Vehicle Research & Content Generation

This document describes the Single Vehicle Research feature, which allows scraping data for a single vehicle and generating structured page content using AI.

## Overview

The Single Vehicle Research flow is a 5-step workflow that:
1. Takes a vehicle name and research source selection
2. Scrapes data from YouTube, Reddit, and internal BikeDekho reviews
3. Builds a corpus of collected data
4. Generates structured page content using AI
5. Displays and exports the final JSON content

## Application Routes

| Route | Description |
|-------|-------------|
| `/single` | Main single vehicle research workspace |
| `/single?new=true` | Start a new research (resets state) |

## API Routes

### Scraping APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scrape/single/youtube` | POST | Scrape YouTube videos and comments |
| `/api/scrape/single/reddit` | POST | Scrape Reddit discussions |
| `/api/scrape/single/internal` | POST | Scrape BikeDekho reviews |

### Content Generation API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate/single/content` | POST | Generate structured page content from corpus |

### Persistence APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/single-research` | GET | List all saved research entries |
| `/api/single-research` | POST | Create new research entry |
| `/api/single-research/[id]` | GET | Get single research by ID |
| `/api/single-research/[id]` | PATCH | Update research entry |
| `/api/single-research/[id]` | DELETE | Delete research entry |

## File Structure

```
src/
├── app/
│   ├── single/
│   │   └── page.tsx                    # Main single vehicle workspace page
│   └── api/
│       ├── scrape/single/
│       │   ├── youtube/route.ts        # YouTube scraping endpoint
│       │   ├── reddit/route.ts         # Reddit scraping endpoint
│       │   └── internal/route.ts       # Internal data endpoint
│       ├── generate/single/
│       │   └── content/route.ts        # AI content generation endpoint
│       └── single-research/
│           ├── route.ts                # List/Create research entries
│           └── [id]/route.ts           # Get/Update/Delete by ID
│
├── components/steps/single/
│   ├── SingleStep1Input.tsx            # Step 1: Vehicle name input
│   ├── SingleStep2Scrape.tsx           # Step 2: Scraping progress
│   ├── SingleCorpusView.tsx            # Step 3: View collected corpus
│   ├── SingleStep4Generate.tsx         # Step 4: AI content generation
│   └── SingleContentView.tsx           # Step 5: View/export generated content
│
├── lib/
│   ├── store.ts                        # Zustand store with single vehicle state
│   ├── types.ts                        # TypeScript interfaces
│   ├── supabase/
│   │   └── types.ts                    # Database types for persistence
│   ├── data-sources/
│   │   └── internal-api.ts             # Internal data fetching (fetchSingleInternalData)
│   ├── scrapers/
│   │   ├── youtube-scraper.ts          # YouTube scraping (scrapeYouTubeForBike)
│   │   └── reddit-scraper.ts           # Reddit scraping (scrapeRedditForBike)
│   └── ai/
│       ├── single-vehicle-generator.ts # Main content generation orchestrator
│       ├── prompts/
│       │   └── single-vehicle-content.ts # AI prompt builders
│       ├── schemas/
│       │   └── single-vehicle-schemas.ts # JSON schemas for AI output
│       └── models/
│           └── registry.ts             # AI model configuration (task types)
│
└── migrations/
    └── 001_create_single_vehicle_research.sql  # Database migration
```

## Workflow Steps

### Step 1: Input (`SingleStep1Input.tsx`)
- User enters vehicle name (e.g., "Hyundai Venue")
- User selects research sources:
  - YouTube Reviews (default)
  - Reddit r/IndianBikes
  - BikeDekho Reviews (Internal)
- On submit: Creates initial state and auto-saves

### Step 2: Scrape (`SingleStep2Scrape.tsx`)
- Automatically starts scraping based on selected sources
- Shows progress for each source
- Collects:
  - YouTube: Videos, transcripts, comments
  - Reddit: Posts and comments
  - Internal: User reviews, expert insights
- On complete: Builds corpus and auto-saves

### Step 3: Corpus View (`SingleCorpusView.tsx`)
- Displays collected data in tabs (YouTube/Reddit/Internal)
- Shows summary stats (total items, comments, sources)
- Actions:
  - Copy JSON to clipboard
  - Download corpus as JSON file
  - Proceed to content generation

### Step 4: Generate (`SingleStep4Generate.tsx`)
- Calls `/api/generate/single/content` endpoint
- Shows progress for each generation step:
  - Vehicle Info parsing
  - Owner Pulse extraction
  - Quick Decision synthesis
  - Segment Scorecard generation
  - Competitor analysis
  - Buy timing evaluation
- On complete: Stores generated content and auto-saves

### Step 5: Export (`SingleContentView.tsx`)
- Three tabs:
  - **Overview**: Visual summary of key sections
  - **Details**: Expandable JSON for each section
  - **JSON**: Full JSON output with syntax highlighting
- Actions:
  - Copy JSON to clipboard
  - Download as JSON file

## State Management

### Store State (`src/lib/store.ts`)

```typescript
// Single Vehicle State
singleVehicleId: string | null;           // Database ID (null = unsaved)
singleVehicle: SingleVehicleResearch;     // Vehicle name + sources
singleVehicleCurrentStep: number;         // Current step (1-5)
singleVehicleCompletedSteps: number[];    // Completed step IDs
singleVehicleScrapingProgress: [];        // Scraping status per source
singleVehicleScrapedData: {};             // Raw scraped data by source
singleVehicleCorpus: SingleVehicleCorpus; // Combined corpus
singleVehicleContent: SingleVehiclePageContent; // Generated content
isSavingSingleVehicle: boolean;           // Save in progress
lastSavedSingleVehicle: Date | null;      // Last save timestamp
saveSingleVehicleError: string | null;    // Save error message
```

### Store Actions

```typescript
// State setters
setSingleVehicleId(id)
setSingleVehicle(vehicle)
setSingleVehicleCurrentStep(step)
markSingleVehicleStepComplete(step)
setSingleVehicleCorpus(corpus)
setSingleVehicleContent(content)

// Database operations
loadSingleVehicleResearch(id) -> Promise<boolean>
saveSingleVehicleResearch() -> Promise<string | null>
deleteSingleVehicleResearch(id) -> Promise<boolean>

// Reset
resetSingleVehicleWorkflow()
```

### Helper Hooks

```typescript
// Auto-save hook (call after completing steps)
const autoSave = useAutoSaveSingleVehicle();
await autoSave();

// Save status hook (for UI indicators)
const { isSaving, lastSaved, saveError, singleVehicleId } = useSingleVehicleSaveStatus();
```

## Type Definitions

### Core Types (`src/lib/types.ts`)

```typescript
interface SingleVehicleResearch {
  vehicle: string;
  researchSources: {
    youtube: boolean;
    reddit: boolean;
    internal: boolean;
  };
}

interface SingleVehicleCorpus {
  youtube?: { videos: [], total_videos: number, ... };
  reddit?: { posts: [], metadata: {} };
  internal?: { reviews: [], expertInsights: [] };
  metadata: {
    vehicle: string;
    scrapedAt: string;
    totalPosts: number;
    totalComments: number;
    sourcesUsed: string[];
  };
}

interface SingleVehiclePageContent {
  vehicle: { make, model, year, segment };
  quickDecision: { verdict, perfectIf, skipIf, idealFor, ... };
  howMuchItReallyCosts: { ... };  // Placeholder
  variantOptions: { ... };         // Placeholder
  segmentScorecard: { categories, badge, summary };
  mainCompetitors: [];
  goodTimeToBuy: { ... };          // Placeholder
  ownerPulse: { rating, mostPraised, mostCriticized };
  dataSource: { corpus, totalVideos, sources, ... };
}
```

## AI Content Generation

### Model Configuration (`src/lib/ai/models/registry.ts`)

| Task Type | Model | Purpose |
|-----------|-------|---------|
| `single_vehicle_owner_pulse` | Claude Opus 4.5 | Extract owner sentiment |
| `single_vehicle_quick_decision` | Claude Opus 4.5 | Generate verdict |
| `single_vehicle_scorecard` | Claude Opus 4.5 | Rank categories |
| `single_vehicle_competitors` | Claude Opus 4.5 | Analyze competition |
| `single_vehicle_timing` | Claude Opus 4.5 | Evaluate buy timing |

### Generation Pipeline (`src/lib/ai/single-vehicle-generator.ts`)

1. **Parse vehicle info** from corpus metadata
2. **Extract owner pulse** (praises/criticisms from reviews)
3. **Generate quick decision** (verdict, recommendations)
4. **Build segment scorecard** (category rankings)
5. **Identify competitors** (from mentions in corpus)
6. **Analyze buy timing** (signals from discussions)
7. **Assemble final content** (combine all sections)

## Database Schema

### Table: `single_vehicle_research`

```sql
CREATE TABLE single_vehicle_research (
    id UUID PRIMARY KEY,
    vehicle_name TEXT NOT NULL,
    display_name TEXT GENERATED,
    research_sources TEXT[],
    current_step INTEGER DEFAULT 1,
    completed_steps INTEGER[],
    corpus JSONB,
    generated_content JSONB,
    status TEXT CHECK (status IN (
        'draft', 'scraping', 'corpus_ready', 
        'generating', 'completed', 'archived'
    )),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

Run `migrations/001_create_single_vehicle_research.sql` in Supabase SQL Editor.

## Usage Example

```typescript
// In a component
import { useAppStore, useAutoSaveSingleVehicle } from '@/lib/store';

function MyComponent() {
  const singleVehicle = useAppStore(state => state.singleVehicle);
  const corpus = useAppStore(state => state.singleVehicleCorpus);
  const content = useAppStore(state => state.singleVehicleContent);
  const autoSave = useAutoSaveSingleVehicle();
  
  // After completing an action
  await autoSave();
}
```

## Related Documentation

- Main comparison flow: Similar patterns in `/src/components/steps/`
- AI factory: `/src/lib/ai/factory.ts`
- Model registry: `/src/lib/ai/models/registry.ts`
