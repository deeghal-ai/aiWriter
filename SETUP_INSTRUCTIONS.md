# Setup Instructions

## Installation

The project structure has been created. Follow these steps to get started:

### 1. Navigate to the Project Directory

```bash
cd bikedekho-ai-writer
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 15
- React 19
- Zustand (state management)
- Lucide React (icons)
- Radix UI (component primitives)
- Tailwind CSS
- TypeScript

### 3. Run the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Project Overview

This is a skeleton UI implementation of the BikeDekho AI Writer - a multi-step wizard interface for an AI-powered motorcycle comparison article generator.

### Key Features

- **8-Step Workflow**: From bike input to final article review
- **State Persistence**: Uses Zustand with localStorage persistence
- **Mock Data**: All steps use mock data for demonstration
- **Responsive Design**: Optimized for desktop, works on mobile

### File Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page with step router
│   └── globals.css         # Global styles with CSS variables
├── components/
│   ├── ui/                 # shadcn UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── progress.tsx
│   │   ├── checkbox.tsx
│   │   ├── tabs.tsx
│   │   └── scroll-area.tsx
│   ├── layout/
│   │   ├── AppHeader.tsx   # Top header with reset button
│   │   └── StepSidebar.tsx # Left sidebar navigation
│   └── steps/
│       ├── Step1Input.tsx  # Bike input form
│       ├── Step2Scrape.tsx # Scraping progress
│       ├── Step3Extract.tsx # Insights display
│       ├── Step4Personas.tsx # Persona cards
│       ├── Step5Verdicts.tsx # Recommendations
│       ├── Step6Article.tsx # Article generation
│       ├── Step7Polish.tsx # Quality checks
│       └── Step8Review.tsx # Final review
├── lib/
│   ├── store.ts            # Zustand store with actions
│   ├── types.ts            # TypeScript interfaces
│   ├── mockData.ts         # Mock data for all steps
│   └── utils.ts            # Utility functions (cn)
```

## Usage Guide

### Testing the Application

1. **Start at Step 1**: Enter two bike names (e.g., "TVS Apache RTX 300" and "Royal Enfield Scram 440")
2. **Select Research Sources**: Choose which forums to "scrape"
3. **Navigate Through Steps**: Use the sidebar to move between steps
4. **View Mock Data**: Each step displays realistic mock data
5. **Reset Workflow**: Click "New Comparison" in the header to start over

### State Management

The app uses Zustand for state management. State is persisted to localStorage with the key `bikedekho-ai-writer-storage`.

To clear state during development:
```javascript
localStorage.removeItem('bikedekho-ai-writer-storage')
```

### Customization

#### Changing Colors

Edit CSS variables in `src/app/globals.css`:
```css
:root {
  --primary: 221.2 83.2% 53.3%; /* Blue primary color */
  /* Add more variables as needed */
}
```

#### Modifying Mock Data

Edit `src/lib/mockData.ts` to change displayed content.

#### Adding New Steps

1. Create a new component in `src/components/steps/`
2. Add it to `stepComponents` in `src/app/page.tsx`
3. Update the sidebar steps array in `src/components/layout/StepSidebar.tsx`

## Troubleshooting

### Port Already in Use

If port 3000 is busy:
```bash
npm run dev -- -p 3001
```

### TypeScript Errors

Run type checking:
```bash
npm run type-check
```

### Build Issues

Clean install:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Phase: AI Integration

This skeleton is ready for AI integration:

1. **Step 2**: Replace mock scraping with real forum scraping
2. **Step 3**: Integrate Claude API for insight extraction
3. **Step 4**: Use AI to identify personas from data
4. **Step 5**: Generate verdicts with AI reasoning
5. **Step 6**: Implement article generation with Claude
6. **Step 7**: Add automated quality checking
7. **Step 8**: Add rich text editor for final edits

## Support

For issues or questions, refer to:
- Next.js docs: https://nextjs.org/docs
- shadcn/ui docs: https://ui.shadcn.com
- Zustand docs: https://zustand-demo.pmnd.rs

