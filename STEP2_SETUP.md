# Step 2 Setup Instructions

## Overview

Step 2 implements **real web scraping** from Reddit and xBhp forums. This guide will help you set up and test the implementation.

## Prerequisites

- Node.js and npm installed
- Python 3.7+ installed
- Internet connection for scraping

## Setup Steps

### 1. Install Node.js Dependencies

```bash
cd bikedekho-ai-writer
npm install
```

This will install the new `execa` package for Python execution.

### 2. Setup Python Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Mac/Linux
# OR
venv\Scripts\activate  # Windows

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Test Python Scrapers

Before running the full app, test the scrapers independently:

```bash
# Make sure venv is activated
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Test Reddit scraper
python scripts/test_reddit.py

# Test xBhp scraper (slower, can take 1-2 minutes)
python scripts/test_xbhp.py
```

**Expected output for Reddit:**
```
✓ Reddit scraping successful!

Bike 1 (Royal Enfield Classic 350):
  - Found 18 posts
  - Total comments: 72
  - Sample post: Classic 350 ownership review - 6 months in...
```

**Expected output for xBhp:**
```
✓ xBhp scraping successful!

Bike 1 (Royal Enfield Classic 350):
  - Found 7 threads
  - Total posts: 28
  - Sample thread: RE Classic 350 - Long term ownership thread...
```

### 4. Test API Routes (Optional)

Start the development server:

```bash
npm run dev
```

In another terminal, test the API:

```bash
# Test Reddit API
curl -X POST http://localhost:3000/api/scrape/reddit \
  -H "Content-Type: application/json" \
  -d '{"bike1": "Classic 350", "bike2": "CB350"}' | jq

# Test xBhp API
curl -X POST http://localhost:3000/api/scrape/xbhp \
  -H "Content-Type: application/json" \
  -d '{"bike1": "Classic 350", "bike2": "CB350"}' | jq
```

### 5. Test Full UI Flow

1. Open http://localhost:3000
2. **Step 1**: Enter bike names (e.g., "Royal Enfield Classic 350" and "Honda CB350")
3. Click "Start Research"
4. **Step 2**: Watch real-time scraping progress
5. Wait 1-2 minutes for completion
6. Review the scraped data preview
7. Click "Continue to Extraction"

## Features Implemented

✅ **Reddit Scraping** - Public JSON API (no authentication)  
✅ **xBhp Scraping** - HTML parsing with BeautifulSoup  
✅ **Parallel Execution** - Both sources scrape simultaneously  
✅ **Real-time Progress** - UI updates as scraping progresses  
✅ **Error Handling** - Graceful fallback if one source fails  
✅ **Data Preview** - See sample results before proceeding  

## Troubleshooting

### Python Not Found

If you get `python3: command not found`:

**Solution 1** - Use full path in API routes:
```typescript
// In src/app/api/scrape/*/route.ts
const { stdout } = await execa('/usr/bin/python3', [
  // ...
]);
```

**Solution 2** - Use venv Python:
```typescript
const { stdout } = await execa('./venv/bin/python', [
  // ...
]);
```

### ModuleNotFoundError

```bash
# Activate venv first
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Reddit Returns Empty Results

- Try simpler search terms: "Classic 350" instead of "Royal Enfield Classic 350"
- Check if Reddit is accessible: https://www.reddit.com/r/IndianBikes
- Wait 30 seconds and retry (rate limiting)

### xBhp Scraping Fails

- Check if xBhp is up: https://www.xbhp.com/talkies
- xBhp is slower and may timeout - this is expected
- The app will continue with Reddit data alone

### Scraping Takes Too Long

This is normal! Expected times:
- Reddit: 30-60 seconds
- xBhp: 60-90 seconds
- Total (parallel): 60-90 seconds

To speed up (for testing):
- Edit scrapers to reduce limits (in Python files)
- Reddit: Change `limit=20` to `limit=5`
- xBhp: Change `[:10]` to `[:3]`

## Performance Benchmarks

**Expected scraping times:**
- Reddit: 30-60 seconds (20 posts with comments)
- xBhp: 60-90 seconds (10 threads with posts)
- Total (parallel): 60-90 seconds

**Expected data volume:**
- Reddit: 30-40 posts total, 100-150 comments
- xBhp: 10-15 threads, 30-50 posts
- Combined: ~200-250 text snippets

## Testing Different Bikes

Try these combinations:
- "Royal Enfield Classic 350" vs "Honda CB350"
- "TVS Apache RTR 160" vs "Bajaj Pulsar NS160"
- "KTM Duke 200" vs "Bajaj Dominar 250"
- "Hero Splendor" vs "Honda Shine"

## Important Notes

### Rate Limiting
- Reddit: 1 second delay between requests
- xBhp: 2 second delay between pages
- Be respectful to these services!

### Ethics
- Only scraping public data
- No authentication bypassing
- Reasonable request rates
- Educational/research purpose

### Limitations
- xBhp HTML structure may change (requires updates)
- Reddit may deprecate JSON API (fallback: official API)
- Both sources may add CAPTCHA if abused

## Success Criteria

✅ **Reddit scraping works** without authentication  
✅ **xBhp scraping works** and returns real threads  
✅ **Both scrape in parallel** (not sequential)  
✅ **Real data appears** in Step 2 UI  
✅ **Data persists** when navigating to Step 3  
✅ **At least one source succeeds** even if other fails  

## Next Steps

After verifying Step 2 works:

1. ✅ Test with different bike names
2. ✅ Verify data quality (check scraped content)
3. 🚀 Move to Step 3: AI-powered insight extraction
4. Optional: Add YouTube scraping (similar pattern)

## Cost

**Completely FREE!**
- Reddit: Public JSON API (no costs, no quotas)
- xBhp: Public forum (web scraping)
- No API keys required
- **Total: $0/month**

## Need Help?

If you encounter issues:

1. Check Python is installed: `python3 --version`
2. Check venv is activated: `which python` (should show venv path)
3. Test scrapers independently: `python scripts/test_reddit.py`
4. Check API routes: `curl` tests from above
5. Look at browser console for frontend errors
6. Check terminal for backend logs

## File Locations

```
src/
├── lib/
│   └── scrapers/
│       ├── reddit_scraper.py     # Reddit scraper
│       └── xbhp_scraper.py       # xBhp scraper
├── app/
│   └── api/
│       └── scrape/
│           ├── reddit/route.ts   # Reddit API
│           └── xbhp/route.ts     # xBhp API
└── components/
    └── steps/
        └── Step2Scrape.tsx       # Updated UI

scripts/
├── test_reddit.py                # Test Reddit
└── test_xbhp.py                  # Test xBhp

requirements.txt                   # Python deps
```

---

**Ready to test? Start with `python scripts/test_reddit.py`!**

