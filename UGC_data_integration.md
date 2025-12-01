# UGC Data Integration - Implementation Complete

## ✅ Implementation Summary

The **Data Source Registry** pattern has been implemented with a **unified merge strategy** that:

1. **Properly merges** data from YouTube AND Reddit (no more `||` fallback)
2. **Preserves source attribution** in extracted insights
3. **Supports configurable merge strategies** (deduplication, weighting, limits)
4. **Ready for internal BikeDekho data** integration

---

## 📁 New Files Created

### Core Data Sources Module (`src/lib/data-sources/`)

| File | Purpose |
|------|---------|
| `types.ts` | Unified interfaces for normalized data across all sources |
| `config.ts` | **Centralized configuration** - modify this to adjust source weights, trust scores, merge strategy |
| `merger.ts` | Data merging logic with deduplication and quality filtering |
| `index.ts` | Main export for the module |

### Normalizers (`src/lib/data-sources/normalizers/`)

| File | Purpose |
|------|---------|
| `youtube.ts` | Converts YouTube scraper output to normalized format |
| `reddit.ts` | Converts Reddit scraper output to normalized format |
| `internal.ts` | **Ready for BikeDekho internal data** - placeholder implementation |
| `index.ts` | Normalizer registry and factory |

---

## 🔧 Configuration (Single Point of Control)

All merge settings are in **`src/lib/data-sources/config.ts`**:

```typescript
// Source configurations
export const DATA_SOURCE_CONFIGS: Record<DataSourceId, DataSourceConfig> = {
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    priority: 80,
    enabled: true,
    trustScore: 75,
  },
  reddit: {
    id: 'reddit',
    name: 'Reddit',
    priority: 70,
    enabled: true,
    trustScore: 80,
  },
  internal: {
    id: 'internal',
    name: 'BikeDekho',
    priority: 90,       // Highest priority for internal data
    enabled: true,
    trustScore: 95,     // Highest trust for verified owners
  },
  xbhp: { /* ... */ }
};

// Merge strategy - adjust these to control how sources are combined
export const DEFAULT_MERGE_STRATEGY: MergeStrategy = {
  deduplicationThreshold: 0.5,     // 50% similarity = duplicate
  sourceWeights: {
    internal: 1.3,                 // Boost internal data
    youtube: 1.0,                  // Baseline
    reddit: 0.95,                  // Slightly lower
    xbhp: 1.1
  },
  maxDiscussionsPerSource: 15,
  maxCommentsPerDiscussion: 25,
  minCommentQualityScore: 30       // Filter low-quality comments
};
```

---

## 🔄 Updated Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NEW PIPELINE FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 2: SCRAPING                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │   YouTube    │  │    Reddit    │  │   Internal   │                       │
│  │   Scraper    │  │   Scraper    │  │   (Ready!)   │                       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                       │
│         │                 │                 │                               │
│         ▼                 ▼                 ▼                               │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │              scrapedData (store.ts) - Updated                │          │
│  │   { youtube?, reddit?, internal?, xbhp? }                    │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                              │                                              │
│                              ▼                                              │
│  STEP 3: DATA SOURCE REGISTRY (NEW!)                                        │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                                                               │          │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │          │
│  │   │  YouTube    │  │   Reddit    │  │  Internal   │         │          │
│  │   │ Normalizer  │  │ Normalizer  │  │ Normalizer  │         │          │
│  │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │          │
│  │          │                │                │                 │          │
│  │          └────────────────┼────────────────┘                 │          │
│  │                           ▼                                  │          │
│  │             ┌─────────────────────────┐                      │          │
│  │             │   MERGER (config.ts)    │                      │          │
│  │             │   - Deduplication       │                      │          │
│  │             │   - Source weighting    │                      │          │
│  │             │   - Quality filtering   │                      │          │
│  │             └─────────────────────────┘                      │          │
│  │                           │                                  │          │
│  └───────────────────────────┼──────────────────────────────────┘          │
│                              ▼                                              │
│                    MergedBikeData                                           │
│            (with source attribution preserved)                              │
│                              │                                              │
│                              ▼                                              │
│                    AI Insight Extraction                                    │
│                              │                                              │
│                              ▼                                              │
│                   InsightExtractionResult                                   │
│         (quotes now include correct source: "YouTube"/"Reddit"/"BikeDekho") │
│                              │                                              │
│         ┌────────────────────┼────────────────────┐                        │
│         ▼                    ▼                    ▼                        │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │   Step 4    │     │   Step 5    │     │   Step 6    │                   │
│  │  Personas   │     │  Verdicts   │     │  Article    │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Using Internal Data

### Option 1: Programmatic (API)

```typescript
// In your scraping/data fetching logic
const internalData = await fetchFromBikeDekhoAPI(bike1Name, bike2Name);

// Store it like other sources
setScrapedData('internal', internalData);

// The insights route automatically picks it up
```

### Option 2: Direct API Call

```typescript
const response = await fetch('/api/extract/insights', {
  method: 'POST',
  body: JSON.stringify({
    bike1Name: 'KTM Duke 390',
    bike2Name: 'Bajaj Dominar 400',
    youtubeData: youtubeScrapedData,
    redditData: redditScrapedData,
    internalData: bikeDekhoData,  // <-- Add internal data here
  })
});
```

### Expected Internal Data Format

```typescript
interface InternalBikeData {
  bike1: {
    bikeName: string;
    reviews: InternalReview[];
    expertInsights?: ExpertInsight[];
  };
  bike2: {
    bikeName: string;
    reviews: InternalReview[];
    expertInsights?: ExpertInsight[];
  };
}

interface InternalReview {
  id: string;
  author: {
    name: string;
    isVerifiedOwner: boolean;  // HUGE trust boost
    ownershipDuration?: string;
    kmsDriven?: number;
  };
  title: string;
  content: string;
  rating?: number;
  pros?: string[];
  cons?: string[];
  helpfulVotes?: number;
  createdAt: string;
}

interface ExpertInsight {
  category: string;      // "Engine", "Comfort", "Value"
  insight: string;
  author: string;        // "BikeDekho Expert Team"
  isPositive: boolean;
}
```

---

## ✨ What's Fixed

### Before (Old Code)
```typescript
// Only YouTube OR Reddit, not both!
const combinedData = {
  bike1: body.youtubeData?.bike1 || body.redditData?.bike1,
  bike2: body.youtubeData?.bike2 || body.redditData?.bike2
};
```

### After (New Code)
```typescript
// All sources merged with deduplication and weighting
const mergeResult = processAndMergeScrapedData(
  { youtube, reddit, internal, xbhp },
  bike1Name,
  bike2Name,
  mergeStrategy
);
```

---

## 🔮 Adding New Sources in Future

To add a new data source (e.g., "TeamBhp"):

1. **Add config** in `config.ts`:
```typescript
DATA_SOURCE_CONFIGS.teambhp = {
  id: 'teambhp',
  name: 'Team-BHP',
  priority: 85,
  enabled: true,
  trustScore: 90
};
```

2. **Create normalizer** in `normalizers/teambhp.ts`:
```typescript
export class TeamBhpNormalizer implements DataSourceNormalizer {
  sourceId = 'teambhp' as const;
  normalize(rawData: any, bikeName: string): NormalizedBikeData { /*...*/ }
}
```

3. **Register normalizer** in `normalizers/index.ts`

4. **Add to merger** in `merger.ts` (in `processAndMergeScrapedData`)

5. **Update store** in `store.ts` (add to ScrapedData interface)

That's it! The merger will automatically include the new source.

---

## 📊 Merge Response Metadata

The insights endpoint now returns merge statistics:

```json
{
  "success": true,
  "data": { /* insights */ },
  "meta": {
    "processingTimeMs": 15234,
    "sourcesUsed": ["youtube", "reddit"],
    "mergeStats": {
      "bike1Posts": 12,
      "bike1Comments": 156,
      "bike2Posts": 10,
      "bike2Comments": 134,
      "deduplicatedCount": 23
    }
  }
}
```

---

## 🎯 Next Steps for Internal Team

1. **Decide data delivery method**:
   - API endpoint (recommended for fresh data)
   - Bulk export (simpler but potentially stale)

2. **Prepare data in expected format** (see schema above)

3. **Key fields to prioritize**:
   - `isVerifiedOwner` - This gives HUGE trust boost
   - `kmsDriven` / `ownershipDuration` - Adds credibility
   - `pros` / `cons` - Pre-structured feedback is gold

4. **Contact me when ready** - I'll add the API integration to Step 2
