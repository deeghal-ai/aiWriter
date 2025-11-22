# Quick Start Guide

## Getting Started in 3 Steps

### 1️⃣ Install Dependencies

```bash
cd bikedekho-ai-writer
npm install
```

### 2️⃣ Run Development Server

```bash
npm run dev
```

### 3️⃣ Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## What You'll See

A multi-step wizard interface with 8 steps:

1. **Input** - Enter two bikes to compare
2. **Scrape** - View forum scraping progress (mock)
3. **Extract** - See extracted insights
4. **Personas** - View rider archetypes
5. **Verdicts** - See recommendations
6. **Article** - Watch article generation
7. **Polish** - Review quality checks
8. **Review** - Final article preview

## Testing the App

1. Enter bike names (e.g., "TVS Apache RTX 300" and "Royal Enfield Scram 440")
2. Select research sources
3. Click "Start Research"
4. Navigate through steps using the sidebar
5. Click "New Comparison" to reset

## Key Features

✅ Fully functional skeleton UI  
✅ Mock data for all 8 steps  
✅ State persistence (localStorage)  
✅ Responsive design  
✅ Step navigation with progress tracking  

## Project Status

**Current**: Skeleton UI with mock data  
**Next**: AI integration with Claude API

## File Highlights

- `src/app/page.tsx` - Main page with step router
- `src/lib/store.ts` - Zustand state management
- `src/lib/mockData.ts` - Mock data for testing
- `src/components/steps/` - All 8 step components

## Customization

### Change Mock Data
Edit `src/lib/mockData.ts`

### Modify Colors
Edit CSS variables in `src/app/globals.css`

### Add Features
State is managed in `src/lib/store.ts`

## Troubleshooting

**Port in use?**
```bash
npm run dev -- -p 3001
```

**Clear state:**
```javascript
localStorage.removeItem('bikedekho-ai-writer-storage')
```

**Type errors?**
```bash
npm run type-check
```

---

**Need help?** Check `SETUP_INSTRUCTIONS.md` for detailed information.

