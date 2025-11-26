# Step 3 Setup: AI-Powered Insight Extraction

## Prerequisites

Before starting:
- ✅ Step 2 (Reddit scraping) working
- ✅ Anthropic API key

## Setup Instructions

### 1. Create .env.local File

The `.env.local` file is gitignored for security. Create it manually:

```bash
cd bikedekho-ai-writer

# Create the file
touch .env.local

# Edit it with your favorite editor
nano .env.local
# OR
code .env.local
```

### 2. Add Your API Key

Copy this into `.env.local`:

```env
# Anthropic API Key
ANTHROPIC_API_KEY=your-api-key-here

# AI Provider Configuration
AI_PROVIDER=claude

# Claude Configuration
ANTHROPIC_MODEL=claude-sonnet-4-20250514
ANTHROPIC_MAX_TOKENS=4096
```

### 3. Verify Installation

The Anthropic SDK is already installed. Verify:

```bash
npm list @anthropic-ai/sdk
```

You should see: `@anthropic-ai/sdk@0.70.1` or similar

### 4. Test the Setup

Restart your dev server:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## Testing Step 3

### Flow Test

1. Navigate to http://localhost:3000
2. **Step 1**: Enter bikes (e.g., "KTM 390 Adventure", "Royal Enfield Himalayan 440")
3. **Step 2**: Wait for scraping to complete (~60s)
4. **Step 3**: Automatically starts AI extraction
   - Shows progress bar
   - Takes 30-60 seconds
   - Displays extracted insights

### What You Should See

When extraction completes:

```
✅ Analysis Complete

5-8 praise categories
3-5 complaint categories  
20-30 owner quotes

Processed in 45.2s
```

Then tabs for each bike showing:
- **Top Praises** (with frequency counts and quotes)
- **Top Complaints** (with frequency counts and quotes)
- **Surprising Insights** (bullet points)

## File Structure

```
src/
├── lib/
│   └── ai/                          ✅ NEW DIRECTORY
│       ├── provider-interface.ts    # Base AI provider interface
│       ├── factory.ts               # Provider factory pattern
│       ├── schemas.ts               # JSON schemas
│       ├── prompts.ts               # Prompt templates
│       ├── providers/
│       │   └── claude.ts            # Claude implementation
│       └── README.md                # Architecture docs
├── app/
│   └── api/
│       └── extract/
│           └── insights/
│               └── route.ts         # API endpoint
├── utils/
│   └── validation.ts                # Result validation
└── components/
    └── steps/
        └── Step3Extract.tsx         # Updated UI
```

## Modular AI Architecture 🎯

### Why It's Modular

The AI provider is **abstracted** through an interface:

```typescript
// This works with ANY provider
import { extractInsights } from '@/lib/ai/factory';

const insights = await extractInsights(bike1, bike2, data);
```

### Switching Providers

To switch from Claude to OpenAI (future):

1. **Change one line in .env.local:**
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

2. **Restart server**

That's it! No code changes needed.

### Adding New Providers

See `src/lib/ai/README.md` for detailed guide on adding:
- OpenAI (GPT-4, GPT-4o)
- Google Gemini
- Local models (Ollama)
- Any other LLM

## Troubleshooting

### Error: "Invalid API key"

**Check:**
```bash
# Verify .env.local exists
ls -la .env.local

# Check content (safely)
cat .env.local | grep ANTHROPIC_API_KEY | head -c 30
```

Should show: `ANTHROPIC_API_KEY=sk-ant-api03...`

**Fix:**
- Recreate `.env.local` with correct key
- Restart dev server
- Key must start with `sk-ant-api03-`

### Error: "Anthropic API not configured"

**Cause**: `.env.local` not loaded

**Fix:**
```bash
# Make sure .env.local is in project root
cd bikedekho-ai-writer
ls .env.local

# Restart dev server
npm run dev
```

### Error: "Rate limit exceeded"

**Cause**: Too many API calls

**Fix:**
- Wait 60 seconds
- Check usage at https://console.anthropic.com
- Consider caching results

### Extraction Takes Too Long

**Normal**: 30-60 seconds for 20 posts + 67 comments

**Optimize:**
1. Reduce scraping data in Step 2
2. Use faster model (Haiku)
3. Process bikes separately (parallel)

### Error: "JSON parsing failed"

**Cause**: Claude returned invalid JSON (rare with structured outputs)

**Debug:**
```typescript
// Add to claude.ts
console.log("Raw Claude response:", content.text);
```

**Fix:**
- Retry extraction (usually works second time)
- Check prompt isn't too long
- Verify schema is correct

## Cost Management

### Per Comparison Costs

**Claude Sonnet 4**:
- Input: 60K tokens × $3/M = $0.18
- Output: 2K tokens × $15/M = $0.03
- **Total: ~$0.21**

### Monthly Estimates

| Comparisons/Week | Weekly Cost | Monthly Cost |
|------------------|-------------|--------------|
| 10 | $2.10 | $8.40 |
| 50 | $10.50 | $42 |
| 100 | $21 | $84 |

### Cost Optimization

**1. Use Haiku for testing:**
```env
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
# Cost: ~$0.03/comparison (7x cheaper!)
```

**2. Cache results:**
```typescript
// Store insights for repeat comparisons
const cacheKey = `${bike1}:${bike2}`;
```

**3. Reduce input size:**
```typescript
// Keep only first 200 chars per comment
comments: post.comments.map(c => ({
  ...c,
  body: c.body.slice(0, 200)
}))
```

## Performance Benchmarks

### Expected Timing

- **Input preparation**: <1s
- **API call**: 20-40s
- **Response parsing**: <1s
- **Validation**: <1s
- **Total**: 30-60s

### Token Usage

**Typical comparison:**
- Input: 50K-70K tokens (20 posts × 67 comments)
- Output: 1.5K-2.5K tokens (structured JSON)
- **Total**: ~60K-75K tokens

### Response Size

**Expected extraction:**
- 5-8 praise categories per bike
- 3-5 complaint categories per bike
- 20-30 owner quotes total
- 3-5 surprising insights per bike

## Testing Checklist

Before moving to Step 4:

- [ ] `.env.local` created with API key
- [ ] Dev server restarted
- [ ] Step 1-2 completed
- [ ] Step 3 auto-starts extraction
- [ ] Progress bar shows movement
- [ ] Extraction completes in <60s
- [ ] Results display correctly
- [ ] Can switch between bike tabs
- [ ] Quotes show author and source
- [ ] "Build Personas" button enabled

## Success Criteria

✅ Step 3 is working when:

- Claude API integration works without errors
- Structured outputs return valid JSON
- Insights display correctly in UI
- Praises and complaints have frequency counts
- Owner quotes are attributed to source
- Surprising insights are generated
- Data persists when navigating to Step 4

## Next Steps

After Step 3 is working:

1. ✅ Test with multiple bike comparisons
2. ✅ Review extraction quality
3. 🚀 Move to Step 4 (Persona Generation)
4. Optional: Add caching for cost optimization

## API Key Security

### ✅ Good Practices

- API key stored in `.env.local` (gitignored)
- Never committed to git
- Only accessible server-side
- Not exposed to browser

### ❌ Never Do This

```typescript
// DON'T: Expose API key to client
const apiKey = process.env.ANTHROPIC_API_KEY;
return NextResponse.json({ apiKey }); // ❌ NEVER!
```

## Resources

**Anthropic Docs:**
- [API Reference](https://docs.anthropic.com/en/api)
- [Structured Outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)
- [Prompt Engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering)

**Code Examples:**
- [Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook)
- [SDK Examples](https://github.com/anthropics/anthropic-sdk-typescript/tree/main/examples)

---

**Ready to test? Create `.env.local` and restart the server!** 🚀

