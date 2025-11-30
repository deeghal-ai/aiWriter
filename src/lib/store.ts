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
  InsightExtractionResult,
  PersonaGenerationResult,
  VerdictGenerationResult,
  NarrativePlan,
  QualityReport
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
  personas: PersonaGenerationResult | null;
  isGeneratingPersonas: boolean;
  
  // Step 5: Verdicts
  verdicts: VerdictGenerationResult | null;
  isGeneratingVerdicts: boolean;
  
  // Step 6: Article generation (persisted)
  articleSections: ArticleSection[];
  articleWordCount: number;
  narrativePlan: NarrativePlan | null;
  qualityReport: QualityReport | null;
  isGeneratingArticle: boolean;
  articleGenerationPhase: number; // 0=not started, 1=planning, 2=sections, 3=coherence
  
  // Step 7: Quality checks
  qualityChecks: QualityCheck[];
  
  // Step 8: Final article
  finalArticle: string;
  
  // Actions
  setCurrentStep: (step: number) => void;
  markStepComplete: (step: number) => void;
  setComparison: (comparison: BikeComparison) => void;
  setScrapingProgress: (progress: ScrapingProgress[]) => void;
  setInsights: (insights: InsightExtractionResult | null) => void;
  setPersonas: (personas: PersonaGenerationResult | null) => void;
  setIsGeneratingPersonas: (isGenerating: boolean) => void;
  setVerdicts: (verdicts: VerdictGenerationResult | null) => void;
  setIsGeneratingVerdicts: (isGenerating: boolean) => void;
  setArticleSections: (sections: ArticleSection[]) => void;
  setNarrativePlan: (plan: NarrativePlan | null) => void;
  setQualityReport: (report: QualityReport | null) => void;
  setIsGeneratingArticle: (isGenerating: boolean) => void;
  setArticleGenerationPhase: (phase: number) => void;
  setQualityChecks: (checks: QualityCheck[]) => void;
  setFinalArticle: (article: string) => void;
  setScrapedData: (source: 'reddit' | 'xbhp' | 'youtube', data: any) => void;
  getScrapedData: (source: 'reddit' | 'xbhp' | 'youtube') => any;
  resetArticleGeneration: () => void;
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
      personas: null,
      isGeneratingPersonas: false,
      verdicts: null,
      isGeneratingVerdicts: false,
      articleSections: [],
      articleWordCount: 0,
      narrativePlan: null,
      qualityReport: null,
      isGeneratingArticle: false,
      articleGenerationPhase: 0,
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
      
      setIsGeneratingPersonas: (isGenerating) => set({ isGeneratingPersonas: isGenerating }),
      
      setVerdicts: (verdicts) => set({ verdicts }),
      
      setIsGeneratingVerdicts: (isGenerating) => set({ isGeneratingVerdicts: isGenerating }),
      
      setArticleSections: (sections) => 
        set(() => ({
          articleSections: sections,
          articleWordCount: sections.reduce((sum, s) => sum + s.wordCount, 0)
        })),
      
      setNarrativePlan: (plan) => set({ narrativePlan: plan }),
      
      setQualityReport: (report) => set({ qualityReport: report }),
      
      setIsGeneratingArticle: (isGenerating) => set({ isGeneratingArticle: isGenerating }),
      
      setArticleGenerationPhase: (phase) => set({ articleGenerationPhase: phase }),
      
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
      
      resetArticleGeneration: () => set({
        articleSections: [],
        articleWordCount: 0,
        narrativePlan: null,
        qualityReport: null,
        isGeneratingArticle: false,
        articleGenerationPhase: 0
      }),
      
      resetWorkflow: () => set({
        currentStep: 1,
        completedSteps: [],
        comparison: null,
        scrapingProgress: [],
        scrapedData: {},
        insights: null,
        personas: null,
        isGeneratingPersonas: false,
        verdicts: null,
        isGeneratingVerdicts: false,
        articleSections: [],
        articleWordCount: 0,
        narrativePlan: null,
        qualityReport: null,
        isGeneratingArticle: false,
        articleGenerationPhase: 0,
        qualityChecks: [],
        finalArticle: ''
      })
    }),
    {
      name: 'bikedekho-ai-writer-storage',
    }
  )
);

