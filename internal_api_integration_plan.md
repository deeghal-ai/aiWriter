How to integrate the internal BikeDekho API. I'll create the full integration with both options (checkbox in Step 1 + fetch button in Step 2).

[2 tools called]

Let me create a complete integration for the internal BikeDekho API. I'll implement:

1. **API config file** - Where you paste your endpoint
2. **API route** - To fetch internal data
3. **Step 1 update** - Add checkbox for internal data
4. **Step 2 update** - Add fetch button and display for internal data



---

## 🎉 Internal BikeDekho Data Integration - Complete!

### Files Created/Modified

| File | Purpose |
|------|---------|
| `src/lib/data-sources/internal-api.ts` | **⭐ API Configuration File** - Paste your endpoint here |
| `src/app/api/scrape/internal/route.ts` | API route to fetch internal data |
| `src/components/steps/Step1Input.tsx` | Added "BikeDekho Reviews" checkbox |
| `src/components/steps/Step2Scrape.tsx` | Fetches & displays internal data |
| `src/lib/types.ts` | Added `internal` to `researchSources` |
| `src/lib/store.ts` | Added `internal` data handling |
| `src/lib/data-sources/index.ts` | Exported internal API functions |

---

## 🔧 How to Configure Your API Endpoint

### Option 1: Environment Variables (Recommended)

Add to your `.env.local`:

```bash
# BikeDekho Internal API
BIKEDEKHO_API_URL=https://api.bikedekho.com/reviews
BIKEDEKHO_API_KEY=your-api-key-if-needed

# For testing without API (uses mock data)
USE_MOCK_INTERNAL_DATA=true
```

### Option 2: Direct Configuration

Edit `src/lib/data-sources/internal-api.ts`:

```typescript
// Line 17 - Hardcode your API URL
export const INTERNAL_API_BASE_URL = 'https://api.bikedekho.com/reviews';
```

---

## 🖥️ UI Flow

### Step 1: Select Sources
![Step 1](docs/step1.png)
- New "BikeDekho User Reviews" checkbox with **Premium** badge
- Enable alongside YouTube and Reddit

### Step 2: Data Fetching
- Internal data fetches in parallel with YouTube/Reddit
- Shows verified owner badges ✓
- Displays ratings, pros/cons for each review

### Step 3+: Automatic Integration
- Merged data flows through insights → personas → verdicts → article
- Source attribution preserved: quotes show "BikeDekho" as source

---

## 📝 Expected API Response Format

Your internal API should return data in this format:

```json
{
  "bike1": {
    "bikeName": "KTM Duke 390",
    "reviews": [
      {
        "id": "rev-001",
        "author": {
          "name": "Rahul_Bangalore",
          "isVerifiedOwner": true,
          "ownershipDuration": "8 months",
          "kmsDriven": 12000
        },
        "title": "Perfect for Bangalore traffic",
        "content": "Full review text...",
        "rating": 4.5,
        "pros": ["Engine refinement", "Handling"],
        "cons": ["Seat comfort"],
        "helpfulVotes": 47,
        "createdAt": "2025-01-10T14:30:00Z"
      }
    ],
    "expertInsights": [
      {
        "category": "Value",
        "insight": "Best power-to-price ratio in segment",
        "author": "BikeDekho Expert",
        "isPositive": true
      }
    ]
  },
  "bike2": { ... }
}
```

---

## 🧪 Testing Without API

To test the UI before the API is ready:

1. Set `USE_MOCK_INTERNAL_DATA=true` in `.env.local`
2. Enable "BikeDekho Reviews" in Step 1
3. Mock data will be displayed with sample reviews

---

## 🔄 Customizing API Integration

If your API uses a different format, edit the `transformApiResponse` function in `src/lib/data-sources/internal-api.ts`:

```typescript
// Line 150 - Modify to match your API structure
function transformApiResponse(apiResponse: any, bike1Name: string, bike2Name: string) {
  // Your transformation logic here
}
```

---

## ✅ Verification Steps

1. Set `USE_MOCK_INTERNAL_DATA=true` in `.env.local`
2. Start the dev server: `npm run dev`
3. Go to Step 1 and enable "BikeDekho User Reviews"
4. In Step 2, you should see "BikeDekho Reviews" fetching
5. Expand reviews to see verified owner badges and pros/cons