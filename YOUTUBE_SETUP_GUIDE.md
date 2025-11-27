# YouTube API Setup Guide

## 🎯 Quick Setup (5 minutes)

### Step 1: Get YouTube API Key

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com
   - Sign in with your Google account

2. **Create/Select Project:**
   - Click "Select a project" at the top
   - Click "NEW PROJECT"
   - Name it: "BikeDekho AI Writer"
   - Click "CREATE"

3. **Enable YouTube Data API v3:**
   - In the search bar at top, type: "YouTube Data API v3"
   - Click on "YouTube Data API v3" in results
   - Click the blue "ENABLE" button
   - Wait for it to enable (takes 5-10 seconds)

4. **Create API Key:**
   - Click "CREATE CREDENTIALS" button
   - Select "API key"
   - Your API key will be displayed (looks like: `AIzaSyC...`)
   - Click "COPY" to copy the key
   - **Important:** Save this key somewhere safe!

5. **Optional - Restrict API Key (Recommended for production):**
   - Click "RESTRICT KEY"
   - Under "API restrictions", select "Restrict key"
   - Check only "YouTube Data API v3"
   - Click "SAVE"

### Step 2: Add API Key to Your Project

1. **Create `.env.local` file:**
   ```bash
   cd bikedekho-ai-writer
   cp .env.example .env.local
   ```

2. **Edit `.env.local`:**
   Open the file and replace `your_youtube_api_key_here` with your actual API key:
   ```bash
   YOUTUBE_API_KEY=AIzaSyC_your_actual_key_here
   ```

3. **Save the file**

### Step 3: Test the Setup

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test the YouTube API endpoint:**
   - Open browser: http://localhost:3000/api/scrape/youtube
   - You should see: `{"status":"ok","apiKeyConfigured":true,"message":"YouTube API is configured and ready"}`

3. **Test the full workflow:**
   - Go to: http://localhost:3000
   - Enter two bikes (e.g., "Royal Enfield Hunter 350" and "Honda CB350")
   - Click through to Step 2 (Scraping)
   - You should see "YouTube Reviews" scraping progress
   - It will fetch 20 videos per bike with comments

---

## 📊 API Quota Information

### Free Tier:
- **10,000 units per day** (completely FREE!)
- Each video search = ~100 units
- Each comment fetch = ~1 unit
- **You can do 200+ bike comparisons per day for FREE**

### Cost:
- **$0** - The free tier is more than enough for development and testing

### Quota Reset:
- Resets daily at midnight Pacific Time (PST)

---

## 🔍 What Data You'll Get

For each bike comparison:

### Per Bike:
- **20 videos** (reviews, owner experiences, comparisons)
- **Up to 100 comments per video** (sorted by relevance)
- Total: ~2,000 comments of real owner opinions

### Video Data Includes:
- ✅ Title (e.g., "Hunter 350 - 6 Month Review")
- ✅ Description (review summary)
- ✅ Channel name (PowerDrift, BikeWale, etc.)
- ✅ Published date
- ✅ Video URL

### Comment Data Includes:
- ✅ Author name
- ✅ Comment text (owner experiences)
- ✅ Like count (popularity indicator)
- ✅ Published date

---

## 🚨 Troubleshooting

### Error: "YouTube API key not configured"
**Solution:** Make sure you created `.env.local` with the correct API key

### Error: "YouTube API error: 403"
**Solutions:**
1. Check if API key is correct
2. Make sure YouTube Data API v3 is ENABLED in Google Cloud Console
3. Wait a few minutes after enabling the API

### Error: "YouTube API error: 429" (Rate limit exceeded)
**Solution:** You've hit the daily quota. Wait until midnight PST for reset, or:
1. Create a new Google Cloud project
2. Get a new API key
3. Update `.env.local`

### No videos found for a bike
**Solution:** Try:
1. Use full bike name: "Royal Enfield Hunter 350" instead of just "Hunter"
2. Include country: "Hunter 350 india"
3. Try different search terms

---

## 🎉 Next Steps

Once setup is complete:

1. ✅ YouTube scraping is now live!
2. ✅ Test with real bike comparisons
3. ✅ Deploy to Vercel (add YOUTUBE_API_KEY to Vercel environment variables)
4. ✅ Enjoy unlimited FREE YouTube data!

---

## 🔒 Security Notes

1. **Never commit `.env.local` to git** (it's already in .gitignore)
2. **Never share your API key publicly**
3. **For production, restrict the API key** to only YouTube Data API v3
4. **For Vercel deployment:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `YOUTUBE_API_KEY` = your key
   - Redeploy your app

---

## 📞 Need Help?

- Google Cloud Console: https://console.cloud.google.com
- YouTube Data API Docs: https://developers.google.com/youtube/v3
- Check quota usage: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas

---

**That's it! You now have YouTube data gathering working! 🚀**

