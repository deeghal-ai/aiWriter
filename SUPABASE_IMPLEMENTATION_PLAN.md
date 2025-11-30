# BikeDekho AI Writer: Supabase Database Implementation Plan

## Overview

Transform the current single-instance, localStorage-based workflow into a multi-comparison, database-persisted system where each bike comparison is saved as a separate entity that can be resumed at any stage.

---

## 1. Database Schema Design

### Table: `comparisons`

This is the main table storing each bike comparison instance.

```sql
CREATE TABLE comparisons (
  -- Primary identifier
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Step 1: Input data
  bike1_name VARCHAR(255) NOT NULL,
  bike2_name VARCHAR(255) NOT NULL,
  comparison_type VARCHAR(50) DEFAULT 'comparison', -- comparison, review, etc.
  
  -- Progress tracking
  current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 8),
  completed_steps INTEGER[] DEFAULT '{}',
  
  -- Step 2: Scraped data (stored as JSONB for flexibility)
  scraped_data JSONB DEFAULT '{}',
  -- Structure: { reddit: {...}, xbhp: {...}, youtube: {...} }
  
  -- Step 3: Extracted insights
  insights JSONB DEFAULT NULL,
  -- Structure: { bike1: {praises, complaints, surprising_insights}, bike2: {...} }
  
  -- Step 4: Personas
  personas JSONB DEFAULT NULL,
  -- Structure: { personas: [...], generatedAt: timestamp }
  
  -- Step 5: Verdicts
  verdicts JSONB DEFAULT NULL,
  -- Structure: { verdicts: [...], generatedAt: timestamp }
  
  -- Step 6: Article generation
  narrative_plan JSONB DEFAULT NULL,
  article_sections JSONB DEFAULT '[]',
  article_word_count INTEGER DEFAULT 0,
  quality_report JSONB DEFAULT NULL,
  
  -- Step 7: Quality checks
  quality_checks JSONB DEFAULT '[]',
  
  -- Step 8: Final article
  final_article TEXT DEFAULT '',
  
  -- Metadata
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Optional: User tracking (for future multi-user support)
  -- user_id UUID REFERENCES auth.users(id),
  
  -- Computed display name
  display_name VARCHAR(255) GENERATED ALWAYS AS (
    bike1_name || ' vs ' || bike2_name
  ) STORED
);

-- Index for fast lookups
CREATE INDEX idx_comparisons_status ON comparisons(status);
CREATE INDEX idx_comparisons_created_at ON comparisons(created_at DESC);
CREATE INDEX idx_comparisons_updated_at ON comparisons(updated_at DESC);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comparisons_updated_at
  BEFORE UPDATE ON comparisons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Table: `scraping_progress` (Optional - for real-time progress tracking)

```sql
CREATE TABLE scraping_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id UUID REFERENCES comparisons(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL, -- 'reddit', 'xbhp', 'youtube'
  bike VARCHAR(10) NOT NULL, -- 'bike1', 'bike2'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'complete', 'error'
  progress INTEGER DEFAULT 0,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scraping_progress_comparison ON scraping_progress(comparison_id);
```

---

## 2. Supabase Setup Steps

### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project (free tier is sufficient for MVP)
3. Note down:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon public key (for client-side)
   - Service role key (for server-side API routes)

### 2.2 Run Schema Migration

1. Go to SQL Editor in Supabase Dashboard
2. Run the SQL schema above
3. Verify tables are created in Table Editor

### 2.3 Environment Variables

Add to `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 3. Application Architecture Changes

### 3.1 New File Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser client (anon key)
│   │   ├── server.ts          # Server client (service role)
│   │   ├── types.ts           # TypeScript types matching schema
│   │   └── queries.ts         # Database query functions
│   ├── store.ts               # Modified Zustand (no localStorage, uses DB)
│   └── hooks/
│       └── useComparison.ts   # React hook for current comparison
├── app/
│   ├── page.tsx               # Homepage with comparison list
│   ├── comparison/
│   │   └── [id]/
│   │       └── page.tsx       # Individual comparison page
│   └── api/
│       └── comparisons/
│           ├── route.ts       # GET (list), POST (create)
│           └── [id]/
│               └── route.ts   # GET, PATCH, DELETE
```

### 3.2 Client Setup

**`src/lib/supabase/client.ts`**
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**`src/lib/supabase/server.ts`**
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

export function createServerSupabaseClient() {
  const cookieStore = cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}
```

### 3.3 TypeScript Types

**`src/lib/supabase/types.ts`**
```typescript
export interface Comparison {
  id: string;
  bike1_name: string;
  bike2_name: string;
  comparison_type: string;
  current_step: number;
  completed_steps: number[];
  scraped_data: ScrapedData | null;
  insights: InsightExtractionResult | null;
  personas: PersonaGenerationResult | null;
  verdicts: VerdictGenerationResult | null;
  narrative_plan: NarrativePlan | null;
  article_sections: ArticleSection[];
  article_word_count: number;
  quality_report: QualityReport | null;
  quality_checks: QualityCheck[];
  final_article: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  display_name: string;
}

export interface Database {
  public: {
    Tables: {
      comparisons: {
        Row: Comparison;
        Insert: Omit<Comparison, 'id' | 'created_at' | 'updated_at' | 'display_name'>;
        Update: Partial<Omit<Comparison, 'id' | 'created_at' | 'display_name'>>;
      };
    };
  };
}
```

---

## 4. Modified State Management

### 4.1 New Store Design

The store now has TWO modes:
1. **Global mode** (current behavior) - for new comparisons not yet saved
2. **Instance mode** - when working on a specific saved comparison

**`src/lib/store.ts`** (modified)
```typescript
import { create } from 'zustand';

interface AppState {
  // Current comparison ID (null = new/unsaved)
  comparisonId: string | null;
  
  // All existing state fields...
  currentStep: number;
  completedSteps: number[];
  comparison: BikeComparison | null;
  // ... etc
  
  // New actions
  loadComparison: (id: string) => Promise<void>;
  saveComparison: () => Promise<string>;
  updateComparisonStep: (step: number, data: Partial<Comparison>) => Promise<void>;
  setComparisonId: (id: string | null) => void;
  
  // Existing actions remain...
}

export const useAppStore = create<AppState>()((set, get) => ({
  comparisonId: null,
  
  // Load a saved comparison from database
  loadComparison: async (id: string) => {
    const response = await fetch(`/api/comparisons/${id}`);
    const comparison = await response.json();
    
    set({
      comparisonId: id,
      currentStep: comparison.current_step,
      completedSteps: comparison.completed_steps,
      comparison: {
        bike1: { name: comparison.bike1_name },
        bike2: { name: comparison.bike2_name },
      },
      scrapedData: comparison.scraped_data || {},
      insights: comparison.insights,
      personas: comparison.personas,
      verdicts: comparison.verdicts,
      narrativePlan: comparison.narrative_plan,
      articleSections: comparison.article_sections || [],
      articleWordCount: comparison.article_word_count,
      qualityReport: comparison.quality_report,
      qualityChecks: comparison.quality_checks || [],
      finalArticle: comparison.final_article || '',
    });
  },
  
  // Save current state to database
  saveComparison: async () => {
    const state = get();
    const payload = {
      bike1_name: state.comparison?.bike1.name,
      bike2_name: state.comparison?.bike2.name,
      current_step: state.currentStep,
      completed_steps: state.completedSteps,
      scraped_data: state.scrapedData,
      insights: state.insights,
      personas: state.personas,
      verdicts: state.verdicts,
      narrative_plan: state.narrativePlan,
      article_sections: state.articleSections,
      article_word_count: state.articleWordCount,
      quality_report: state.qualityReport,
      quality_checks: state.qualityChecks,
      final_article: state.finalArticle,
      status: state.completedSteps.includes(8) ? 'completed' : 'in_progress',
    };
    
    if (state.comparisonId) {
      // Update existing
      await fetch(`/api/comparisons/${state.comparisonId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return state.comparisonId;
    } else {
      // Create new
      const response = await fetch('/api/comparisons', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const { id } = await response.json();
      set({ comparisonId: id });
      return id;
    }
  },
  
  // Update specific step and auto-save
  updateComparisonStep: async (step: number, data: Partial<Comparison>) => {
    const state = get();
    
    // Update local state first (optimistic)
    set((s) => ({
      ...s,
      currentStep: step,
      completedSteps: [...new Set([...s.completedSteps, step])],
    }));
    
    // Then sync to database
    if (state.comparisonId) {
      await fetch(`/api/comparisons/${state.comparisonId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          current_step: step,
          completed_steps: get().completedSteps,
          ...data,
        }),
      });
    }
  },
  
  // ... rest of existing actions
}));
```

---

## 5. API Routes

### 5.1 List & Create Comparisons

**`src/app/api/comparisons/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/comparisons - List all comparisons
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  let query = supabase
    .from('comparisons')
    .select('id, display_name, current_step, completed_steps, status, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

// POST /api/comparisons - Create new comparison
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  const { data, error } = await supabase
    .from('comparisons')
    .insert({
      bike1_name: body.bike1_name,
      bike2_name: body.bike2_name,
      comparison_type: body.comparison_type || 'comparison',
      current_step: body.current_step || 1,
      completed_steps: body.completed_steps || [],
      scraped_data: body.scraped_data || {},
      insights: body.insights,
      personas: body.personas,
      verdicts: body.verdicts,
      narrative_plan: body.narrative_plan,
      article_sections: body.article_sections || [],
      article_word_count: body.article_word_count || 0,
      quality_report: body.quality_report,
      quality_checks: body.quality_checks || [],
      final_article: body.final_article || '',
      status: body.status || 'draft',
    })
    .select('id')
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ id: data.id });
}
```

### 5.2 Individual Comparison Operations

**`src/app/api/comparisons/[id]/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/comparisons/[id] - Get single comparison
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('comparisons')
    .select('*')
    .eq('id', params.id)
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  
  return NextResponse.json(data);
}

// PATCH /api/comparisons/[id] - Update comparison
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  const { data, error } = await supabase
    .from('comparisons')
    .update(body)
    .eq('id', params.id)
    .select('id, updated_at')
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

// DELETE /api/comparisons/[id] - Delete comparison
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  
  const { error } = await supabase
    .from('comparisons')
    .delete()
    .eq('id', params.id);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}
```

---

## 6. UI Changes

### 6.1 New Homepage with Comparison List

**`src/app/page.tsx`**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Clock, CheckCircle } from 'lucide-react';

interface ComparisonSummary {
  id: string;
  display_name: string;
  current_step: number;
  completed_steps: number[];
  status: string;
  created_at: string;
  updated_at: string;
}

const STEP_NAMES = [
  'Input', 'Scrape', 'Extract', 'Personas', 
  'Verdicts', 'Article', 'Polish', 'Review'
];

export default function HomePage() {
  const [comparisons, setComparisons] = useState<ComparisonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchComparisons();
  }, []);

  const fetchComparisons = async () => {
    const res = await fetch('/api/comparisons');
    const data = await res.json();
    setComparisons(data);
    setLoading(false);
  };

  const handleNewComparison = () => {
    // Navigate to workspace with no ID (new comparison)
    router.push('/comparison/new');
  };

  const handleOpenComparison = (id: string) => {
    router.push(`/comparison/${id}`);
  };

  const getProgressPercentage = (completedSteps: number[]) => {
    return Math.round((completedSteps.length / 8) * 100);
  };

  const getStatusBadge = (status: string, completedSteps: number[]) => {
    if (status === 'completed' || completedSteps.length === 8) {
      return <Badge className="bg-green-500">Completed</Badge>;
    }
    if (completedSteps.length > 0) {
      return <Badge className="bg-blue-500">In Progress</Badge>;
    }
    return <Badge variant="outline">Draft</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">BikeDekho AI Writer</h1>
            <p className="text-gray-600 mt-1">Create research-driven bike comparison articles</p>
          </div>
          <Button onClick={handleNewComparison} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            New Comparison
          </Button>
        </div>

        {/* Comparisons Grid */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : comparisons.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No comparisons yet</h3>
              <p className="text-gray-500 mb-4">Start by creating your first bike comparison</p>
              <Button onClick={handleNewComparison}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Comparison
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisons.map((comparison) => (
              <Card 
                key={comparison.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleOpenComparison(comparison.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{comparison.display_name}</CardTitle>
                    {getStatusBadge(comparison.status, comparison.completed_steps)}
                  </div>
                  <CardDescription>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-3 h-3" />
                      Updated {new Date(comparison.updated_at).toLocaleDateString()}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{getProgressPercentage(comparison.completed_steps)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${getProgressPercentage(comparison.completed_steps)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Current step indicator */}
                  <div className="text-sm text-gray-600">
                    Currently at: <span className="font-medium">
                      Step {comparison.current_step} - {STEP_NAMES[comparison.current_step - 1]}
                    </span>
                  </div>
                  
                  {/* Step pills */}
                  <div className="flex gap-1 mt-3">
                    {STEP_NAMES.map((name, idx) => (
                      <div 
                        key={idx}
                        className={`w-2 h-2 rounded-full ${
                          comparison.completed_steps.includes(idx + 1) 
                            ? 'bg-green-500' 
                            : comparison.current_step === idx + 1
                            ? 'bg-blue-500'
                            : 'bg-gray-200'
                        }`}
                        title={name}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 6.2 Comparison Workspace Page

**`src/app/comparison/[id]/page.tsx`**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { AppHeader } from '@/components/layout/AppHeader';
import { StepSidebar } from '@/components/layout/StepSidebar';
import Step1Input from '@/components/steps/Step1Input';
import Step2Scrape from '@/components/steps/Step2Scrape';
// ... other step imports

export default function ComparisonPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const { 
    comparisonId, 
    currentStep, 
    loadComparison, 
    resetWorkflow,
    setComparisonId 
  } = useAppStore();

  useEffect(() => {
    const id = params.id as string;
    
    if (id === 'new') {
      // New comparison - reset state
      resetWorkflow();
      setComparisonId(null);
      setLoading(false);
    } else {
      // Load existing comparison
      loadComparison(id).then(() => {
        setLoading(false);
      });
    }
  }, [params.id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1Input />;
      case 2: return <Step2Scrape />;
      case 3: return <Step3Extract />;
      case 4: return <Step4Personas />;
      case 5: return <Step5Verdicts />;
      case 6: return <Step6Article />;
      case 7: return <Step7Polish />;
      case 8: return <Step8Review />;
      default: return <Step1Input />;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <AppHeader 
        showBackButton 
        onBack={() => router.push('/')}
      />
      <div className="flex flex-1 overflow-hidden">
        <StepSidebar />
        <main className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </main>
      </div>
    </div>
  );
}
```

### 6.3 Modified AppHeader

Add a "Back to Home" button and comparison name display:

```typescript
// In AppHeader.tsx, add:
<div className="flex items-center gap-4">
  {showBackButton && (
    <Button variant="ghost" size="sm" onClick={onBack}>
      ← Back to Comparisons
    </Button>
  )}
  {comparison && (
    <span className="text-lg font-medium">
      {comparison.bike1.name} vs {comparison.bike2.name}
    </span>
  )}
</div>
```

---

## 7. Auto-Save Implementation

### 7.1 Save on Step Completion

Modify each step component to auto-save when completing:

```typescript
// Example in Step2Scrape.tsx
const handleScrapingComplete = async () => {
  const { saveComparison, markStepComplete } = useAppStore.getState();
  
  // Mark step complete locally
  markStepComplete(2);
  
  // Save to database
  await saveComparison();
  
  // Move to next step
  setCurrentStep(3);
};
```

### 7.2 Debounced Auto-Save (Optional)

For real-time saving during article editing:

```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSave = useDebouncedCallback(async () => {
  await saveComparison();
}, 2000); // Save after 2 seconds of inactivity

// Call whenever content changes
useEffect(() => {
  if (articleContent) {
    debouncedSave();
  }
}, [articleContent]);
```

---

## 8. Migration Strategy

### Phase 1: Database Setup (1-2 hours)
1. Create Supabase project
2. Run schema migration
3. Configure environment variables
4. Install Supabase packages: `npm install @supabase/supabase-js @supabase/ssr`

### Phase 2: API Routes (2-3 hours)
1. Create Supabase client files
2. Implement CRUD API routes
3. Test with Postman/curl

### Phase 3: Store Modification (3-4 hours)
1. Modify Zustand store to support both modes
2. Add database sync actions
3. Remove localStorage persistence (or keep as fallback)

### Phase 4: UI Updates (3-4 hours)
1. Create homepage with comparison list
2. Create comparison workspace route
3. Modify existing components for auto-save

### Phase 5: Testing & Polish (2-3 hours)
1. End-to-end testing
2. Error handling
3. Loading states
4. Edge cases

**Total Estimated Time: 12-16 hours**

---

## 9. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Homepage                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [New Comparison] Button                                  │    │
│  │                                                          │    │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │    │
│  │ │ TVS Apache   │ │ RE Classic   │ │ Yamaha MT15  │      │    │
│  │ │ vs           │ │ vs           │ │ vs           │      │    │
│  │ │ Bajaj Pulsar │ │ Honda CB350  │ │ KTM Duke     │      │    │
│  │ │              │ │              │ │              │      │    │
│  │ │ Step: 4/8    │ │ Step: 8/8 ✓  │ │ Step: 2/8    │      │    │
│  │ │ [Continue]   │ │ [View]       │ │ [Continue]   │      │    │
│  │ └──────────────┘ └──────────────┘ └──────────────┘      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Comparison Workspace                          │
│  ┌──────────┐ ┌──────────────────────────────────────────────┐  │
│  │ Sidebar  │ │                                              │  │
│  │          │ │  Step 4: Personas                            │  │
│  │ ✓ Input  │ │                                              │  │
│  │ ✓ Scrape │ │  [Persona Cards...]                          │  │
│  │ ✓ Extract│ │                                              │  │
│  │ ● Persona│ │  [Generate Personas] → Auto-saves to DB      │  │
│  │ ○ Verdict│ │                                              │  │
│  │ ○ Article│ │                                              │  │
│  │ ○ Polish │ │                                              │  │
│  │ ○ Review │ │                                              │  │
│  └──────────┘ └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    Supabase     │
                    │                 │
                    │  comparisons    │
                    │  ┌───────────┐  │
                    │  │ id        │  │
                    │  │ bikes     │  │
                    │  │ step: 4   │  │
                    │  │ personas  │  │
                    │  │ ...       │  │
                    │  └───────────┘  │
                    └─────────────────┘
```

---

## 10. Philosophy Alignment Check

| Principle | Implementation Alignment |
|-----------|--------------------------|
| Simple but Clever | Single table with JSONB for flexibility, no complex relational models |
| Fast Iteration | Supabase = instant backend, no server to manage |
| Make Decisions Reversible | JSONB allows schema evolution without migrations |
| No Overcomplication | No auth for MVP (can add Supabase Auth later) |
| AI Does Grunt Work | Database is just storage, no complex logic |

---

## 11. Future Enhancements (Post-MVP)

1. **User Authentication**: Add Supabase Auth for multi-user support
2. **Real-time Sync**: Use Supabase Realtime for collaborative editing
3. **Version History**: Store previous versions of articles
4. **Templates**: Save successful articles as templates
5. **Analytics**: Track completion rates, popular bike comparisons
6. **Export**: One-click export to CMS (WordPress, custom)

---

## Files to Create/Modify Summary

### New Files:
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/types.ts`
- `src/app/api/comparisons/route.ts`
- `src/app/api/comparisons/[id]/route.ts`
- `src/app/comparison/[id]/page.tsx`

### Modified Files:
- `src/lib/store.ts` (major changes)
- `src/app/page.tsx` (replace with comparison list)
- `src/components/layout/AppHeader.tsx` (add back button)
- All Step components (add auto-save on completion)

---

*This plan maintains the project's philosophy of "Simple but Clever" while adding the persistence layer needed for a production-ready tool.*
