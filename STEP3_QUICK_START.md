# Step 3 Quick Start

## 🚀 Get Step 3 Running in 2 Minutes

### 1. Create .env.local (30 seconds)

```bash
cd bikedekho-ai-writer

# Create and edit in one command
cat > .env.local << 'EOF'
ANTHROPIC_API_KEY=your-api-key-here
AI_PROVIDER=claude
ANTHROPIC_MODEL=claude-sonnet-4-20250514
ANTHROPIC_MAX_TOKENS=4096
EOF
```

**Verify it worked:**
```bash
cat .env.local | head -2
# Should show: ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 2. Restart Server (10 seconds)

```bash
# Stop current server (Ctrl+C in terminal)
npm run dev
```

### 3. Test in Browser (90 seconds)

1. Open http://localhost:3000
2. **Step 1**: Enter bikes
   - Bike 1: `KTM 390 Adventure`
   - Bike 2: `Royal Enfield Himalayan 440`
3. **Step 2**: Wait for scraping (~60s)
4. **Step 3**: Watch AI extraction (~30-60s)
5. **See results!** ✨

## ✅ What You'll See

### During Extraction

```
🔄 Analyzing forum data with Claude...
This may take 30-60 seconds

[Progress bar animating]
```

### After Completion

```
✅ Analysis Complete

7 praise categories
4 complaint categories
24 owner quotes

Processed in 42.3s
```

Then two tabs showing insights for each bike!

## 🔧 Troubleshooting (Quick Fixes)

### Error: "API key not configured"

```bash
# Check file exists
ls .env.local

# Recreate it
cat > .env.local << 'EOF'
ANTHROPIC_API_KEY=your-api-key-here
AI_PROVIDER=claude
EOF

# MUST restart server
npm run dev
```

### Extraction Takes Forever (>2 minutes)

```bash
# Use faster model
echo "ANTHROPIC_MODEL=claude-3-5-haiku-20241022" >> .env.local
npm run dev
```

### Rate Limit Error

```bash
# Wait 60 seconds, then retry
# Check usage: https://console.anthropic.com
```

## 🎯 Success Checklist

Step 3 works when you see:

- [ ] Progress bar during extraction
- [ ] "Analysis Complete" after 30-60s
- [ ] Stats showing X praises, Y complaints, Z quotes
- [ ] Tabs for both bikes
- [ ] Categories with frequency badges
- [ ] Owner quotes with attribution
- [ ] Surprising insights section
- [ ] "Build Personas" button enabled

## 🎨 Features

### Real AI Analysis
- Claude analyzes 20+ posts
- Extracts patterns & insights
- Groups similar feedback
- Counts frequencies
- Pulls direct quotes

### Beautiful UI
- Real-time progress
- Color-coded categories
- Quote attribution
- Tabbed bike comparison

### Error Handling
- Clear error messages
- Retry functionality
- Graceful degradation

## 📊 Example Output

### KTM 390 Adventure

**Praises:**
- Engine performance (8 mentions)
- Adventure capability (6 mentions)
- Build quality (5 mentions)

**Complaints:**
- Vibrations at highway speeds (4 mentions)
- Heat in city traffic (3 mentions)

**Surprising:**
- "Better fuel economy than expected"
- "Electronics overwhelming for new riders"

## 🔄 How to Switch AI Models Later

### Use OpenAI Instead of Claude

**Step 1**: Add OpenAI provider (see `src/lib/ai/README.md`)

**Step 2**: Update `.env.local`:
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

**Step 3**: Restart server

That's it! No code changes. 🎉

## 💡 Pro Tips

### Tip 1: Cost Optimization

Use Haiku for testing (7x cheaper):
```env
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

### Tip 2: Faster Scraping

Reduce Reddit data in Step 2:
```python
# In reddit_scraper.py
'limit': 5,  # Instead of 10
```

### Tip 3: Cache Results

Once extraction works, add caching to avoid re-processing same comparisons.

## 📝 Quick Commands

```bash
# Setup
cat > .env.local << 'EOF'
ANTHROPIC_API_KEY=your-api-key-here
AI_PROVIDER=claude
EOF

# Run
npm run dev

# Open
# http://localhost:3000
```

That's it! 🚀

---

**Time to implement**: 2 minutes  
**Time to test**: 2 minutes  
**Total**: 4 minutes from zero to working AI extraction!

