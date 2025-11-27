# Step 6: Article Generation - Quick Reference

## 🎯 What This Step Does

Transforms structured data (insights, personas, verdicts) into a **3,500-4,500 word article** that reads like it was written by an experienced motorcycle journalist.

---

## 📋 File Structure

```
src/
├── lib/
│   ├── types.ts                          # NarrativePlan, ArticleSection, etc.
│   └── ai/
│       ├── article-planner.ts            # Phase 1: Story planning
│       ├── article-coherence.ts          # Phase 3: Final polish
│       ├── article-quality-check.ts      # Quality validation
│       └── article-sections/
│           ├── hook.ts                   # 150-200 words
│           ├── truth-bomb.ts             # 100-150 words
│           ├── personas.ts               # 400-500 words
│           ├── matrix.ts                 # 350-450 words each
│           ├── contrarian.ts             # 200-300 words
│           ├── verdicts.ts               # 600-800 words
│           └── bottom-line.ts            # 150-200 words
│
├── app/api/generate/article/
│   ├── route.ts                          # Standard API
│   └── streaming/
│       └── route.ts                      # Streaming API
│
└── components/steps/
    └── Step6Article.tsx                  # UI with streaming
```

---

## 🔄 The Three Phases

### Phase 1: Narrative Planning
**Purpose**: Find the story before writing  
**Input**: Insights + Personas + Verdicts  
**Output**: `NarrativePlan` with:
- Story angle
- Hook strategy
- Quote allocation
- Focus areas
- Contrarian angle
- Closing insight

**Time**: ~8-10 seconds  
**API Calls**: 1

---

### Phase 2: Section Generation
**Purpose**: Write each section independently  
**Sections**:
1. Hook (150-200 words)
2. Truth Bomb (100-150 words)
3. Personas (400-500 words)
4. Matrix sections (5 × 350-450 words) — **PARALLEL**
5. Contrarian (200-300 words)
6. Verdicts (600-800 words)
7. Bottom Line (150-200 words)

**Time**: ~25-30 seconds  
**API Calls**: 7-12 (depending on matrix sections)

---

### Phase 3: Coherence Pass
**Purpose**: Smooth transitions, add callbacks  
**Tasks**:
- Add transitions between sections
- Insert callbacks to earlier points
- Check for contradictions
- Verify word count

**Time**: ~5-8 seconds  
**API Calls**: 1

---

## 🎨 Hook Strategies

The system supports 4 hook types:

### 1. WhatsApp Debate
Friends arguing about which bike to buy. Puts reader in the middle of the conflict.

```
"Your WhatsApp group is split. Half swear Duke 390 is the smarter 
buy—the handling is worth every rupee. The other half defend the 
Dominar—torque for days. You're stuck with ₹2.3 lakhs and a decision..."
```

### 2. Unexpected Truth
Lead with a contrarian insight that challenges common beliefs.

```
"Everything you've read about Duke vs Dominar misses the point. 
The forums obsess over power. But after analyzing 250+ owner reviews, 
we found something nobody's talking about: seat height anxiety..."
```

### 3. Specific Scenario
Put reader in a visceral moment.

```
"It's 8:47 AM on Outer Ring Road. You're in second gear, watching 
the temperature gauge climb. Your right hand is cramping. The Activa 
next to you looks annoyingly comfortable..."
```

### 4. Price Paradox
Challenge the obvious value calculation.

```
"The Dominar costs ₹15,000 less. Over 5 years, that's ₹75,000 saved. 
Obvious choice, right? Not so fast. We crunched the real numbers—
insurance, maintenance, resale, fuel..."
```

---

## ✅ Quality Checks

The system automatically validates:

| Check | Requirement | Auto-Fix? |
|-------|-------------|-----------|
| Word Count | 3,500-4,500 | Suggests cuts/additions |
| Quotes | Min 20 owner quotes | Flags if insufficient |
| Banned Phrases | Zero occurrences | Lists violations |
| Specific Cities | At least 1 | Flags if missing |
| Specific Roads | At least 1 | Flags if missing |
| Prices | At least 1 ₹ mention | Flags if missing |
| Mileage | At least 1 kmpl | Flags if missing |
| Balance | Bike mentions ±10 | Shows count |
| Personas | All referenced | Shows missing |

---

## 🚫 Banned Phrases

These trigger quality warnings:
- "Let's dive in"
- "In this article"
- "Without further ado"
- "In conclusion"
- "All in all"
- "At the end of the day"
- "It goes without saying"
- "It is what it is"
- "Only time will tell"

---

## 📝 Writing Rules

### DO:
✅ Translate specs to experiences  
✅ Ground every claim in a scenario  
✅ Include owner voices naturally  
✅ Use specific Indian context  
✅ Tie to persona priorities  

### DON'T:
❌ List specs without context  
❌ Make generic claims  
❌ Use block quotes  
❌ Fence-sit on recommendations  
❌ Use banned phrases  

---

## 💻 Code Examples

### Starting Generation (from UI)
```typescript
// Auto-starts in useEffect
useEffect(() => {
  if (!isGenerating && sections.length === 0 && insights && personas && verdicts) {
    startGeneration();
  }
}, []);
```

### Handling Streaming Events
```typescript
// Phase 1: Narrative Planning
if (data.phase === 1 && data.status === 'complete') {
  setNarrativePlan(data.narrativePlan);
}

// Phase 2: Section Generation
if (data.phase === 2 && data.section && data.status === 'complete') {
  setSections(prev =>
    prev.map(s =>
      s.id === data.section
        ? { ...s, content: data.content, wordCount: data.wordCount, status: 'complete' }
        : s
    )
  );
}

// Phase 3: Coherence & Quality
if (data.phase === 3 && data.status === 'complete') {
  setSections(data.sections);
  setQualityReport(data.qualityReport);
  setIsGenerating(false);
}
```

### Adding a New Section Type

1. Create prompt builder in `article-sections/`:
```typescript
// my-new-section.ts
export function buildMyNewSectionPrompt(data: any): string {
  return `<role>Your role here</role>
  
<requirements>
1. Word count: X-Y words
2. Other requirements...
</requirements>

Write the section now:`;
}
```

2. Add to API route:
```typescript
import { buildMyNewSectionPrompt } from '@/lib/ai/article-sections/my-new-section';

// In generateSection():
const promptBuilders = {
  // ... existing
  myNewSection: buildMyNewSectionPrompt,
};
```

3. Update UI to handle new section type

---

## 🐛 Common Issues

### Issue: "Quality check shows no quotes"
**Cause**: Quotes not being allocated in narrative plan  
**Fix**: Check `quote_allocation` in `NarrativePlan`

### Issue: "Word count way off target"
**Cause**: Sections too short or too long  
**Fix**: Adjust max_tokens in API calls or word count requirements in prompts

### Issue: "Streaming stops mid-generation"
**Cause**: API timeout or connection drop  
**Fix**: Check `maxDuration` setting, handle reconnection

### Issue: "Sections feel disconnected"
**Cause**: Coherence pass not working  
**Fix**: Review `buildCoherencePrompt` output, check callback logic

---

## 🎯 Testing

### Manual Test Flow
1. Complete Steps 1-5 (get to verdicts)
2. Navigate to Step 6
3. Watch auto-generation start
4. Monitor phase progress
5. Expand sections to preview
6. Check quality report
7. Verify word count

### Test Data Required
- ✅ Valid `InsightExtractionResult`
- ✅ Valid `PersonaGenerationResult` (3-4 personas)
- ✅ Valid `VerdictGenerationResult` (matching personas)
- ✅ Anthropic API key in `.env.local`

---

## 📊 Performance Expectations

| Metric | Target | Current |
|--------|--------|---------|
| Total Time | 35-45s | ⏱️ Test needed |
| Cost per Article | ~$0.15 | 💰 Test needed |
| Success Rate | >95% | 📈 Test needed |
| Word Count Accuracy | ±10% | 📝 Test needed |
| Quality Pass Rate | >90% | ✅ Test needed |

---

## 🔍 Debugging

### Enable Verbose Logging
```typescript
// In API route
console.log('[Article] Phase 1 complete:', narrativePlan);
console.log('[Article] Section generated:', section.id, section.wordCount);
console.log('[Article] Quality report:', qualityReport);
```

### Check Streaming Events
```typescript
// In UI component
console.log('Stream event:', data);
```

### Inspect Generated Sections
```typescript
// Use expandedSection state to view content
setExpandedSection(section.id);
```

---

## 🚀 Next Steps After Implementation

1. ✅ Test with real data from Steps 3-5
2. ⏱️ Measure actual generation times
3. 💰 Calculate actual costs
4. 📊 Analyze quality metrics
5. 🎨 A/B test different hook strategies
6. 🔧 Fine-tune temperature settings
7. 📝 Collect user feedback
8. 🎯 Optimize based on results

---

## 📞 Quick Help

**Question**: How do I change the target word count?  
**Answer**: Update `targetWordCount` in `Step6Article.tsx` and adjust section requirements in prompt builders.

**Question**: How do I add more matrix focus areas?  
**Answer**: The AI determines focus areas in Phase 1 based on persona priorities. You can influence this by adjusting priorities.

**Question**: Can I skip the coherence pass?  
**Answer**: Yes, but not recommended. Remove the Phase 3 code from API route.

**Question**: How do I customize the quality checks?  
**Answer**: Edit `BANNED_PHRASES` and check logic in `article-quality-check.ts`.

---

**Last Updated**: Implementation completed  
**Status**: ✅ Ready for testing

