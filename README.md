# BikeDekho AI Writer

A multi-step wizard interface for an AI-powered motorcycle comparison article generator.

## Tech Stack

- **Frontend Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Icons:** Lucide React
- **State Management:** Zustand
- **TypeScript:** Yes

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page with stepper
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # shadcn UI components
│   ├── layout/
│   │   ├── AppHeader.tsx   # Application header
│   │   └── StepSidebar.tsx # Step navigation sidebar
│   └── steps/
│       ├── Step1Input.tsx  # Bike comparison input
│       ├── Step2Scrape.tsx # Forum scraping
│       ├── Step3Extract.tsx # Insight extraction
│       ├── Step4Personas.tsx # Rider personas
│       ├── Step5Verdicts.tsx # Recommendations
│       ├── Step6Article.tsx # Article generation
│       ├── Step7Polish.tsx # Quality checks
│       └── Step8Review.tsx # Final review
├── lib/
│   ├── store.ts            # Zustand state management
│   ├── types.ts            # TypeScript types
│   ├── mockData.ts         # Mock data for development
│   └── utils.ts            # Utility functions
```

## Features

### Current (Skeleton UI with Mock Data)

- ✅ 8-step wizard interface
- ✅ State persistence with Zustand
- ✅ Responsive design
- ✅ Mock data for all steps
- ✅ Step navigation with progress tracking

### Step Overview

1. **Input** - Enter bike comparison details and select research sources
2. **Scrape** - View scraping progress from forums and communities
3. **Extract** - Review extracted owner insights (praises, complaints, surprises)
4. **Personas** - Analyze identified rider archetypes
5. **Verdicts** - View AI-generated recommendations by persona
6. **Article** - Monitor article section generation
7. **Polish** - Review quality checks and improvements
8. **Review** - Final article review and export

## Testing the Skeleton

1. Navigate through all 8 steps using the sidebar
2. Fill in bike names in Step 1 and click "Start Research"
3. Observe mock data and UI interactions
4. Click "New Comparison" in header to reset workflow

## Next Steps (Future Integration)

- [ ] Real forum scraping (Step 2)
- [ ] Claude API integration (Steps 3-7)
- [ ] Rich text/markdown editor (Step 8)
- [ ] Export functionality (Markdown, CMS)
- [ ] Authentication (if needed)

## Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Start production server
npm start

# Linting
npm run lint

# Type checking
npm run type-check
```

## Notes

- All data is currently mocked in `src/lib/mockData.ts`
- State persists in localStorage via Zustand
- UI is fully functional without any backend
- Ready for AI integration in next phase
- Mobile responsive (optimized for desktop workflow)

