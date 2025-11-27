# YouTube API - Quick Reference Card

## 🚀 Quick Setup (2 minutes)

### Option 1: Using PowerShell Script (Recommended for Windows)
```powershell
cd bikedekho-ai-writer
.\setup-youtube.ps1
```

### Option 2: Using Bash Script (Linux/Mac)
```bash
cd bikedekho-ai-writer
chmod +x setup-youtube.sh
./setup-youtube.sh
```

### Option 3: Manual Setup
```bash
cd bikedekho-ai-writer
# Create .env.local file and add:
echo "YOUTUBE_API_KEY=your_api_key_here" > .env.local
```

---

## 📍 Where's My API Key?

Your YouTube API key is in: `youtube_implement/youtube_api_key.docx`

Open the file, copy the key, and paste it into `.env.local`

---

## 🧪 Test Your Setup

### 1. Check API Configuration
```bash
npm run dev
```
Then visit: http://localhost:3000/api/scrape/youtube

**Expected Response:**
```json
{
  "status": "ok",
  "apiKeyConfigured": true,
  "message": "YouTube API is configured and ready"
}
```

### 2. Test Full Workflow
1. Go to http://localhost:3000
2. Enter bikes: "Royal Enfield Hunter 350" and "Honda CB350"
3. Click through to Step 2
4. Watch both Reddit and YouTube scrape!

---

## ✅ What Was Implemented

### New Files:
- ✅ `src/lib/scrapers/youtube-scraper.ts`
- ✅ `src/app/api/scrape/youtube/route.ts`

### Updated Files:
- ✅ `src/components/steps/Step2Scrape.tsx`

### New Features:
- ✅ Dual-source scraping (Reddit + YouTube)
- ✅ 20 videos per bike with up to 100 comments each
- ✅ Parallel scraping for speed
- ✅ Expandable UI cards showing videos and comments
- ✅ Direct links to watch videos on YouTube

---

## 📊 Expected Results

### Per Bike:
- **20 videos** from Indian motorcycle channels
- **~2,000 comments** from real owners
- **Total data:** 40 videos + 4,000 comments per comparison

### Data Quality:
- ✅ PowerDrift, BikeWale, xBhp, and other top Indian channels
- ✅ Recent reviews (sorted by relevance)
- ✅ Owner experiences in comments
- ✅ Comparisons, long-term reviews, buying guides

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "API key not configured" | Create `.env.local` with `YOUTUBE_API_KEY=...` |
| "403 Forbidden" | Enable YouTube Data API v3 in Google Cloud Console |
| "429 Rate Limit" | Daily quota exceeded, wait till midnight PST |
| No videos found | Try full bike name: "Honda CB350" not just "CB350" |

---

## 💰 Cost & Quota

- **FREE:** 10,000 units/day
- **Per comparison:** ~50 units
- **Daily capacity:** 200+ comparisons
- **Resets:** Midnight PST

---

## 🎯 Next Steps

1. ✅ Add API key to `.env.local`
2. ✅ Test locally (`npm run dev`)
3. ✅ Deploy to Vercel (add env var in dashboard)
4. ✅ Monitor usage in Google Cloud Console

---

## 📚 Full Documentation

- **Setup:** `YOUTUBE_SETUP_GUIDE.md`
- **Implementation:** `YOUTUBE_IMPLEMENTATION_COMPLETE.md`
- **Google Cloud:** https://console.cloud.google.com

---

## 🆘 Quick Commands

```bash
# Setup
cd bikedekho-ai-writer
.\setup-youtube.ps1

# Run dev server
npm run dev

# Check health
curl http://localhost:3000/api/scrape/youtube

# Deploy
git add .
git commit -m "feat: add YouTube data gathering"
git push origin main
```

---

**🎉 That's it! You're ready to gather YouTube data! 🚀**

