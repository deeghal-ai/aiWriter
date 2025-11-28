# 🔑 How to Update YouTube API Key

## Quick Fix: Update in Vercel (Production)

Your app is deployed on Vercel, so update the API key there:

### Steps:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **ai-writer-green** (or whatever your project is named)
3. Click **Settings** → **Environment Variables**
4. Find `YOUTUBE_API_KEY` in the list
5. Click **Edit** (pencil icon) or delete and recreate
6. **Paste your new API key**
7. Make sure it's enabled for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development (if you test there)
8. Click **Save**
9. **Redeploy** your project:
   - Go to **Deployments** tab
   - Click **"..."** on the latest deployment
   - Click **Redeploy**

### Important:
- After updating the environment variable, **you MUST redeploy** for the change to take effect
- Old deployments still use the old API key

---

## For Local Development

Create/update `.env.local` file:

```bash
cd bikedekho-ai-writer
echo "YOUTUBE_API_KEY=your_new_api_key_here" > .env.local
```

**Never commit `.env.local` to git!** (It's already in `.gitignore`)

---

## Verify It's Working

After redeploying, test the YouTube scraping:
1. Go to your app
2. Enter two bike names
3. Click "Start Scraping"
4. Should work without quota errors!

---

## Optional: Multiple API Keys (Future)

If you hit quota limits again, I can re-implement the **multiple API key rotation system** that automatically switches between keys. Just let me know!

