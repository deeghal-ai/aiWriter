# Step 4 Testing Guide

## Quick Start

### 1. Prerequisites
```bash
# Ensure API key is configured
# In .env.local:
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Run the Application
```bash
cd bikedekho-ai-writer
npm run dev
```

### 3. Complete Previous Steps
1. **Step 1**: Enter bike comparison (e.g., "Royal Enfield Classic 350" vs "Bullet 350")
2. **Step 2**: Scrape Reddit and/or xBhp data
3. **Step 3**: Extract insights (this generates the input for Step 4)

### 4. Step 4 Auto-Starts
- When you navigate to Step 4, persona generation starts automatically
- Watch for progress bar (15-30 seconds expected)
- Check browser console for detailed logs

## Expected Behavior

### Loading State (15-30 seconds)
```
✅ Progress bar animates from 0% to 90%
✅ Message: "Identifying rider personas from insights..."
✅ Spinner animation visible
```

### Success State
```
✅ Summary card shows:
   - Number of personas (3-4)
   - Total evidence quotes
   - Processing time

✅ Persona cards show:
   - Specific title (NOT generic like "The Commuter")
   - Indian name (Naveen, Priya, Arjun, etc.)
   - Age range
   - Percentage badge
   - Archetype quote in colored box
   - Usage pattern bar (multi-colored)
   - Demographics (city type, occupation)
   - Top 4 priorities as badges
   - 2 pain points with icons
   - Sample size
```

## Quality Checks

### ✅ Good Personas (Examples)

**Good Title:**
> "The Whitefield Commuter with Weekend Highway Dreams"

**Good Archetype Quote:**
> "I need it to survive Silk Board traffic AND have something left for weekend highway runs"

**Good Pain Point:**
> "Lives in 4th floor walk-up apartment, 190kg bike is a daily struggle"

**Good Demographics:**
> City Type: "Metro (Bangalore, Mumbai)"
> Income: "Can afford ₹2-3L, probably on EMI"

### ❌ Bad Personas (Red Flags)

**Bad Title:**
> "The Performance Enthusiast" ❌ (Too generic)

**Bad Archetype Quote:**
> "I like speed" ❌ (Too short, not specific)

**Bad Pain Point:**
> "Parking challenges" ❌ (Too vague)

**Bad Demographics:**
> City Type: "Urban areas" ❌ (Not specific to India)

## Console Logs to Watch

```bash
# Expected log sequence:
[Claude] Generating personas for Classic 350 vs Bullet 350
[Claude] Persona generation complete in 18432ms
[Claude] Generated 4 personas
[Claude] Usage: 8234 input, 2456 output tokens
[Factory] Persona generation attempt 1/3
[API] Starting persona generation for Classic 350 vs Bullet 350
[API] Persona generation successful (quality: excellent)
[API] Generated 4 personas
```

## Testing Specific Scenarios

### Test 1: Standard Generation
1. Use: Royal Enfield Classic 350 vs Bullet 350
2. Expected personas:
   - Pillion-heavy commuter
   - Solo nostalgic rider
   - First-time big bike buyer
   - Long-distance tourer

### Test 2: Adventure Bikes
1. Use: KTM 390 Adventure vs RE Himalayan 450
2. Expected personas:
   - Weekend adventure tourer
   - Daily commuter with touring aspirations
   - Off-road enthusiast
   - Highway cruiser

### Test 3: Regeneration
1. Complete Step 4 once
2. Click "Regenerate" button
3. Verify:
   - New personas are different but still valid
   - Quality remains high
   - Usage patterns still sum to 100%

## Debugging

### Issue: API Error "Anthropic API key not configured"
**Solution:**
```bash
# Check .env.local exists
cat .env.local

# Should contain:
ANTHROPIC_API_KEY=sk-ant-...

# Restart dev server after adding
```

### Issue: Validation Failed
**Check console logs for specific errors:**
```javascript
// Look for:
[API] Validation failed: [list of errors]

// Common issues:
// - Usage pattern doesn't sum to 100
// - Missing required fields
// - Percentage sum outside 85-100%
```

### Issue: Poor Quality Personas
**Check quality warnings:**
```javascript
[API] Quality check warnings: [
  "Persona 1: Title 'The Commuter' seems generic",
  "Persona 2: May lack Indian context"
]
```

**Solution:**
- Click "Regenerate" to get better output
- Claude should self-correct on retry

### Issue: Personas Not Auto-Starting
**Verify:**
```javascript
// In browser console:
// 1. Check if insights exist
console.log(useAppStore.getState().insights)

// 2. Check if already generated
console.log(useAppStore.getState().personas)

// 3. Check if currently generating
console.log(useAppStore.getState().isGeneratingPersonas)
```

## Manual Testing Checklist

```markdown
### Generation
- [ ] Auto-starts when entering Step 4
- [ ] Progress bar visible and animating
- [ ] Takes 15-45 seconds (reasonable time)
- [ ] No browser console errors
- [ ] API logs show successful generation

### Output Structure
- [ ] 3-4 personas generated
- [ ] All personas have unique IDs
- [ ] Colors are distinct (blue/green/purple/orange)
- [ ] Percentage sum is 85-100%

### Persona Content
- [ ] Titles are specific (not generic)
- [ ] Names are Indian
- [ ] Demographics mention Indian cities/context
- [ ] Usage patterns sum to 100% per persona
- [ ] Evidence quotes present (2-3 per persona)
- [ ] Archetype quotes are 15-25 words
- [ ] Pain points are specific and vivid
- [ ] Priorities are ordered and specific

### UI/UX
- [ ] Cards render without layout issues
- [ ] Usage bars show proportionally
- [ ] Icons display correctly
- [ ] Badges are readable
- [ ] Summary statistics are accurate
- [ ] "Regenerate" button works
- [ ] "Next" button enables after completion
- [ ] "Back" button preserves state

### Edge Cases
- [ ] Retry after error works
- [ ] Multiple regenerations work
- [ ] Navigation doesn't break state
- [ ] Browser refresh preserves personas (Zustand persist)
```

## Performance Benchmarks

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Generation Time | 15-30s | 30-45s | >45s |
| Number of Personas | 4 | 3 | <3 or >4 |
| Evidence Quotes | 3 per persona | 2 per persona | <2 |
| Quality Rating | Excellent | Good | Poor |
| Percentage Sum | 90-95% | 85-100% | <85% or >100% |

## API Testing (Optional)

Test the API directly with curl:

```bash
# 1. Get insights from Step 3 (copy from browser console)
# 2. Create test payload
curl -X POST http://localhost:3000/api/generate/personas \
  -H "Content-Type: application/json" \
  -d '{
    "bike1Name": "Royal Enfield Classic 350",
    "bike2Name": "Bullet 350",
    "insights": { /* paste insights here */ }
  }'

# Expected response:
{
  "success": true,
  "data": {
    "personas": [ /* 3-4 persona objects */ ],
    "metadata": {
      "generated_at": "2024-11-26T...",
      "total_personas": 4,
      "total_evidence_quotes": 12,
      "processing_time_ms": 18432
    }
  }
}
```

## Troubleshooting

### Slow Generation (>60 seconds)
- Check Claude API status
- Verify network connection
- Review input size (very large insights may take longer)

### Generic Personas Appearing
- This is a known occasional issue
- Solution: Click "Regenerate"
- The prompt explicitly forbids generic personas, so retry usually fixes

### Missing Indian Context
- Check if source data (Step 2 scraping) has Indian forums
- If scraping international forums, personas may lack local context

## Success Indicators

✅ **You know it's working when:**
1. Personas have names like "Naveen" or "Priya" (not "John" or "Sarah")
2. Titles are long and specific (20+ characters)
3. Demographics mention cities like "Bangalore" or "Mumbai"
4. Income indicators use ₹ symbol
5. Pain points feel real and specific
6. Evidence quotes match your scraped data

---

**Need Help?** Check browser console logs first, then review validation errors in API logs.

