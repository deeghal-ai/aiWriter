I'll help you with both tasks. Let me first examine the current state of the code and the UI to understand what's being displayed vs what exists.

[3 tools called]

Now I understand the situation. Let me make the changes:

1. **Condense surprising insights** to be more useful (limit to top 3-4, prioritize actionable ones)
2. **Add "View Full JSON" button** to the extract tab so users can see the complete raw data structure

[1 tool called]

Now let me add the "View Full Insights JSON" button to the extract tab:

[6 tools called]

Let me verify the changes are correct:

[1 tool called]

Both changes have been implemented. Here's a summary:

---

## Changes Made

### 1. `src/lib/ai/article-context-builder.ts` - Smarter Surprising Insights Filtering

**Before:** All surprising insights were passed to condensed context without filtering.

**After:** New `filterUsefulSurprisingInsights()` function scores and prioritizes insights:

| Scoring Criteria | Points |
|------------------|--------|
| Contains specific numbers/percentages (kmpl, bhp, ₹, etc.) | **+3** |
| Has contrarian language ("despite", "unexpectedly", etc.) | **+2** |
| Mentions comparisons ("vs", "compared to", etc.) | **+2** |
| Mentions real-world scenarios (traffic, highway, pillion, etc.) | **+1** |
| Longer/detailed (>80 chars) | **+1** |
| Too generic ("good bike", "value for money", etc.) | **-2** |
| Too short (<40 chars) | **-1** |

**Result:** Top 4 most useful/actionable insights are passed to article generation (instead of all).

---

### 2. `src/components/steps/Step3Extract.tsx` - View Full JSON Button

Added a **"View Full JSON"** button in the extraction summary that opens a modal showing:

- Complete raw JSON of extracted insights
- Copy to clipboard functionality
- File size indicator
- Quick stats (categories, quotes count)

**UI Preview:**

```
┌─ Analysis Complete ─────────────────────────────────┐
│ ✓ Analysis Complete              [Claude Sonnet 4]  │
│                                                     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│ │    12    │ │     8    │ │    47    │             │
│ │ praises  │ │complaints│ │  quotes  │             │
│ └──────────┘ └──────────┘ └──────────┘             │
│                                                     │
│ Processed in 14.2s            [< View Full JSON]   │ ← New button
└─────────────────────────────────────────────────────┘
```

The modal allows users to:
- See the complete data structure
- Copy the JSON to clipboard
- Verify all data that was extracted

---

## What's in "Full Insights" vs "UI Display"?

**Good news:** The UI actually shows **everything** in the `InsightExtractionResult`! There's no hidden data. The structure is:

```typescript
{
  bike1: {
    name: string,
    praises: InsightCategory[],      // ALL shown in UI
    complaints: InsightCategory[],   // ALL shown in UI
    surprising_insights: string[]    // ALL shown in UI
  },
  bike2: { ... same structure },
  metadata: {
    extracted_at,
    total_praises,
    total_complaints, 
    total_quotes,
    processing_time_ms
  }
}
```

The "View Full JSON" button is mainly for:
1. Power users who want to see the raw structure
2. Debugging/verification purposes
3. Copying data for external use