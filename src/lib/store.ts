import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  BikeComparison, 
  ScrapingProgress, 
  Insight, 
  Persona, 
  Verdict, 
  ArticleSection,
  QualityCheck,
  InsightExtractionResult 
} from './types';

interface AppState {
  // Current step (1-8)
  currentStep: number;
  
  // Step completion status
  completedSteps: number[];
  
  // Step 1: Input data
  comparison: BikeComparison | null;
  
  // Step 2: Scraping data
  scrapingProgress: ScrapingProgress[];
  
  // NEW: Raw scraped data
  scrapedData: {
    reddit?: any;
    xbhp?: any;
    youtube?: any;
  };
  
  // Step 3: Extracted insights
  insights: InsightExtractionResult | null;
  
  // Step 4: Personas
  personas: Persona[];
  
  // Step 5: Verdicts
  verdicts: Verdict[];
  
  // Step 6: Article sections
  articleSections: ArticleSection[];
  articleWordCount: number;
  
  // Step 7: Quality checks
  qualityChecks: QualityCheck[];
  
  // Step 8: Final article
  finalArticle: string;
  
  // Actions
  setCurrentStep: (step: number) => void;
  markStepComplete: (step: number) => void;
  setComparison: (comparison: BikeComparison) => void;
  setScrapingProgress: (progress: ScrapingProgress[]) => void;
  setInsights: (insights: InsightExtractionResult) => void;
  setPersonas: (personas: Persona[]) => void;
  setVerdicts: (verdicts: Verdict[]) => void;
  setArticleSections: (sections: ArticleSection[]) => void;
  setQualityChecks: (checks: QualityCheck[]) => void;
  setFinalArticle: (article: string) => void;
  setScrapedData: (source: 'reddit' | 'xbhp' | 'youtube', data: any) => void;
  getScrapedData: (source: 'reddit' | 'xbhp' | 'youtube') => any;
  resetWorkflow: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentStep: 1,
      completedSteps: [],
      comparison: null,
      scrapingProgress: [],
      scrapedData: {},
      insights: null,
      personas: [],
      verdicts: [],
      articleSections: [],
      articleWordCount: 0,
      qualityChecks: [],
      finalArticle: '',
      
      // Actions
      setCurrentStep: (step) => set({ currentStep: step }),
      
      markStepComplete: (step) => 
        set((state) => ({
          completedSteps: [...new Set([...state.completedSteps, step])]
        })),
      
      setComparison: (comparison) => set({ comparison }),
      
      setScrapingProgress: (progress) => set({ scrapingProgress: progress }),
      
      setInsights: (insights) => set({ insights }),
      
      setPersonas: (personas) => set({ personas }),
      
      setVerdicts: (verdicts) => set({ verdicts }),
      
      setArticleSections: (sections) => 
        set((state) => ({
          articleSections: sections,
          articleWordCount: sections.reduce((sum, s) => sum + s.wordCount, 0)
        })),
      
      setQualityChecks: (checks) => set({ qualityChecks: checks }),
      
      setFinalArticle: (article) => set({ finalArticle: article }),
      
      setScrapedData: (source, data) =>
        set((state) => ({
          scrapedData: {
            ...state.scrapedData,
            [source]: data
          }
        })),
      
      getScrapedData: (source) => {
        return get().scrapedData[source];
      },
      
      resetWorkflow: () => set({
        currentStep: 1,
        completedSteps: [],
        comparison: null,
        scrapingProgress: [],
        scrapedData: {},
        insights: null,
        personas: [],
        verdicts: [],
        articleSections: [],
        articleWordCount: 0,
        qualityChecks: [],
        finalArticle: ''
      })
    }),
    {
      name: 'bikedekho-ai-writer-storage',
    }
  )
);

