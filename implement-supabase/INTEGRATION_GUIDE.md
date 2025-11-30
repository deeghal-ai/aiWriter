# BikeDekho AI Writer - Supabase Integration

## Quick Start Guide

This guide walks you through integrating Supabase into your existing BikeDekho AI Writer application.

---

## 1. Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

---

## 2. Environment Variables

Add these to your `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://vkyafapennehcejmmanl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZreWFmYXBlbm5laGNlam1tYW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjU1NjUsImV4cCI6MjA4MDEwMTU2NX0.kItn9SUrPz-kKidgHg_3dy3sTli5iEtTkSeWBaDiVRA
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

---

## 3. File Structure

Copy these files to your project:

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client (API routes)
│   │   ├── types.ts           # TypeScript types
│   │   └── index.ts           # Exports
│   ├── store.ts               # REPLACE your existing store.ts
│   └── hooks/
│       └── useStepCompletion.ts  # Auto-save hook
├── app/
│   ├── page.tsx               # REPLACE with new homepage
│   ├── comparison/
│   │   └── [id]/
│   │       └── page.tsx       # NEW: Comparison workspace
│   └── api/
│       └── comparisons/
│           ├── route.ts       # NEW: List/Create API
│           └── [id]/
│               └── route.ts   # NEW: Get/Update/Delete API
└── components/
    └── layout/
        └── AppHeader.tsx      # MODIFY existing header
```

---

## 4. Step-by-Step Integration

### Step 4.1: Add Supabase Client Files

Copy these files to `src/lib/supabase/`:
- `client.ts`
- `server.ts`
- `types.ts`
- `index.ts`

**Note:** In `types.ts`, update the import path for your existing types:
```typescript
// Change this line to match your project structure
import type { ... } from '../types';
```

### Step 4.2: Add API Routes

Copy the API route files:
- `src/app/api/comparisons/route.ts`
- `src/app/api/comparisons/[id]/route.ts`

### Step 4.3: Update Store

Replace your `src/lib/store.ts` with the new version.

**Important:** The new store removes localStorage persistence. If you want to keep localStorage as a fallback, you can add it back:

```typescript
import { persist } from 'zustand/middleware';

// Wrap the store with persist
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ... all existing code
    }),
    {
      name: 'bikedekho-storage',
      // Only persist minimal data as fallback
      partialize: (state) => ({
        currentStep: state.currentStep,
        comparison: state.comparison,
      }),
    }
  )
);
```

### Step 4.4: Add Hooks

Copy `src/lib/hooks/useStepCompletion.ts`

### Step 4.5: Update Homepage

Replace `src/app/page.tsx` with the new homepage that shows the comparison list.

### Step 4.6: Add Comparison Workspace Route

Create the file: `src/app/comparison/[id]/page.tsx`

### Step 4.7: Update AppHeader

Modify your `AppHeader.tsx` to include:
- Back button
- Save status indicator
- Manual save button

---

## 5. Modify Step Components

Each step component needs minor modifications to auto-save. Here's the pattern:

```typescript
// At the top of your step component
import { useStepCompletion } from '@/lib/hooks/useStepCompletion';

// Inside your component
const { completeStep, isProcessing } = useStepCompletion();

// When the step is complete (e.g., after generating personas)
const handleComplete = async () => {
  // Your existing generation logic...
  const result = await generatePersonas();
  
  // Now save and advance
  await completeStep(4, { personas: result });
};
```

### Example Modifications per Step:

**Step 2 (Scrape):**
```typescript
const handleScrapingComplete = async (scrapedData) => {
  await completeStep(2, { scrapedData });
};
```

**Step 3 (Extract):**
```typescript
const handleExtractionComplete = async (insights) => {
  await completeStep(3, { insights });
};
```

**Step 4 (Personas):**
```typescript
const handlePersonasGenerated = async (personas) => {
  await completeStep(4, { personas });
};
```

**Step 5 (Verdicts):**
```typescript
const handleVerdictsGenerated = async (verdicts) => {
  await completeStep(5, { verdicts });
};
```

**Step 6 (Article):**
```typescript
const handleArticleComplete = async (sections, narrativePlan) => {
  await completeStep(6, { articleSections: sections, narrativePlan });
};
```

**Step 7 (Polish):**
```typescript
const handlePolishComplete = async (qualityChecks, qualityReport) => {
  await completeStep(7, { qualityChecks, qualityReport });
};
```

**Step 8 (Review):**
```typescript
const handlePublish = async (finalArticle) => {
  await completeStep(8, { finalArticle });
};
```

---

## 6. Testing

### Test the API routes:

```bash
# List comparisons
curl http://localhost:3000/api/comparisons

# Create a comparison
curl -X POST http://localhost:3000/api/comparisons \
  -H "Content-Type: application/json" \
  -d '{"bike1_name": "Test Bike 1", "bike2_name": "Test Bike 2"}'

# Get a comparison
curl http://localhost:3000/api/comparisons/<id>

# Update a comparison
curl -X PATCH http://localhost:3000/api/comparisons/<id> \
  -H "Content-Type: application/json" \
  -d '{"current_step": 2}'

# Delete a comparison
curl -X DELETE http://localhost:3000/api/comparisons/<id>
```

### Test the full flow:

1. Go to `http://localhost:3000` - should see empty homepage
2. Click "New Comparison"
3. Enter bike names and click "Start Research"
4. Check Supabase dashboard - should see new row in `comparisons` table
5. Go back to homepage - should see the new comparison card
6. Click the card - should load the saved state

---

## 7. Troubleshooting

### "Failed to fetch comparisons"
- Check that Supabase URL and keys are correct in `.env.local`
- Restart the dev server after changing env variables
- Check browser console for detailed errors

### "Comparison not found"
- The UUID format validation might be failing
- Check that the ID in the URL is a valid UUID

### "Failed to save comparison"
- Check that all required fields are provided
- Look at the network tab for the actual error response
- Check Supabase logs for database errors

### Data not persisting
- Verify the API routes are being called (check Network tab)
- Check Supabase dashboard to see if rows are being created
- Ensure service role key has correct permissions

---

## 8. Database Schema Reference

Your `comparisons` table should have these columns:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, auto-generated |
| bike1_name | varchar | Required |
| bike2_name | varchar | Required |
| comparison_type | varchar | Default: 'comparison' |
| current_step | integer | Default: 1 |
| completed_steps | integer[] | Default: {} |
| scraped_data | jsonb | Default: {} |
| insights | jsonb | Nullable |
| personas | jsonb | Nullable |
| verdicts | jsonb | Nullable |
| narrative_plan | jsonb | Nullable |
| article_sections | jsonb | Default: [] |
| article_word_count | integer | Default: 0 |
| quality_report | jsonb | Nullable |
| quality_checks | jsonb | Default: [] |
| final_article | text | Default: '' |
| status | varchar | Default: 'draft' |
| created_at | timestamptz | Auto-generated |
| updated_at | timestamptz | Auto-updated |
| display_name | varchar | Nullable |

---

## 9. Next Steps (Optional Enhancements)

1. **Add update trigger** - Auto-update `updated_at` on changes
2. **Add RLS policies** - For multi-user support
3. **Add real-time subscriptions** - Live updates across tabs
4. **Add export functionality** - Download comparisons as JSON
5. **Add search/filter** - Search comparisons by bike name
