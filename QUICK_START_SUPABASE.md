# Quick Start - Supabase Integration

## ⚡ 3 Steps to Get Running

### 1. Install Dependencies
```bash
cd bikedekho-ai-writer
npm install
```

### 2. Add Service Role Key
Add this to your `.env.local` file:
```env
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

Get the key from: Supabase Dashboard → Settings → API → service_role

### 3. Start the App
```bash
npm run dev
```

Open http://localhost:3000

---

## ✅ What to Test

1. **Homepage** - Should show empty state
2. **New Comparison** - Click button, enter bike names
3. **Auto-Save** - Complete Step 1, see URL change
4. **Back to Home** - Click back, see comparison card
5. **Continue** - Click card, should load saved state
6. **Delete** - Try deleting a comparison

---

## 📄 Files Changed

- `src/lib/supabase/*` - NEW (4 files)
- `src/lib/store.ts` - REPLACED
- `src/lib/hooks/useStepCompletion.ts` - NEW
- `src/app/page.tsx` - REPLACED
- `src/app/comparison/[id]/page.tsx` - NEW
- `src/app/api/comparisons/*` - NEW (2 files)
- `src/components/layout/AppHeader.tsx` - UPDATED
- `src/components/ui/alert-dialog.tsx` - NEW
- `package.json` - UPDATED

---

## 🆘 Troubleshooting

**Can't install packages?**
- Make sure you're in `bikedekho-ai-writer` folder
- Try: `npm install --legacy-peer-deps`

**"Missing environment variables" error?**
- Check `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
- Restart dev server after adding

**Homepage not loading?**
- Check browser console for errors
- Verify Supabase credentials are correct
- Try: `http://localhost:3000/api/comparisons` - should return `{"data":[],...}`

---

## 📚 Full Documentation

See `IMPLEMENTATION_SUMMARY.md` for complete details.

