# 🚀 Quick Deploy to Vercel

## 1️⃣ Add Environment Variables to Vercel (FIRST!)

**Before pushing code, add these to Vercel:**

1. Go to: https://vercel.com/dashboard
2. Select your project → **Settings** → **Environment Variables**
3. Add these:

```bash
YOUTUBE_API_KEY=your_youtube_key_here
ANTHROPIC_API_KEY=your_claude_key_here
```

☑️ Check all 3 environments: **Production, Preview, Development**

---

## 2️⃣ Push to GitHub

```bash
cd bikedekho-ai-writer

git add .
git commit -m "feat: add YouTube data scraping integration"
git push origin main
```

---

## 3️⃣ Wait for Auto-Deploy

- Vercel will detect the push automatically
- Build takes ~2-3 minutes
- You'll get a notification when ready

---

## 4️⃣ Test Production

Visit: `https://your-app.vercel.app/api/scrape/youtube`

Should see:
```json
{"status":"ok","apiKeyConfigured":true}
```

---

## ✅ Done!

Your app is live with YouTube integration! 🎉

**Need detailed help?** See `VERCEL_DEPLOYMENT_GUIDE.md`

