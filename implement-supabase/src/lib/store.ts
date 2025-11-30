/**
 * BikeDekho AI Writer - State Management Store
 * 
 * Modified to support database persistence via Supabase.
 * Works in two modes:
 * 1. New comparison (comparisonId = null) - local state only
 * 2. Saved comparison (comparisonId = uuid) - syncs with database
 * 
 * NOTE: This replaces the localStorage persistence with database sync.
 * Keep your existing type imports and adjust paths as needed.
 */

import { create } from 'zustand';
import type { 
  BikeComparison, 
  ScrapingProgress, 
  InsightExtractionResult,
  PersonaGenerationResult,
  VerdictGenerationResult,
  NarrativePlan,
  ArticleSection,
  QualityReport,
  QualityCheck,
} from './types';

// Types for scraped data storage
interface ScrapedData {
  reddit?: any;
  xbhp?: any;
  youtube?: any;
}

interface AppState {
  // ============ COMPARISON IDENTITY ============
  // ID of the current comparison (null = new/unsaved)
  comparisonId: string | null;
  
  // ============ WORKFLOW STATE ============
  // Current step (1-8)
  currentStep: number;
  
  // Step completion status
  completedSteps: number[];
  
  // ============ STEP DATA ============
  // Step 1: Input data
  comparison: BikeComparison | null;
  
  // Step 2: Scraping data
  scrapingProgress: ScrapingProgress[];
  scrapedData: ScrapedData;
  
  // Step 3: Extracted insights
  insights: InsightExtractionResult | null;
  
  // Step 4: Personas
  personas: PersonaGenerationResult | null;
  isGeneratingPersonas: boolean;
  
  // Step 5: Verdicts
  verdicts: VerdictGenerationResult | null;
  isGeneratingVerdicts: boolean;
  
  // Step 6: Article generation
  articleSections: ArticleSection[];
  articleWordCount: number;
  narrativePlan: NarrativePlan | null;
  qualityReport: QualityReport | null;
  isGeneratingArticle: boolean;
  articleGenerationPhase: number;
  
  // Step 7: Quality checks
  qualityChecks: QualityCheck[];
  
  // Step 8: Final article
  finalArticle: string;
  
  // ============ UI STATE ============
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  
  // ============ DATABASE ACTIONS ============
  setComparisonId: (id: string | null) => void;
  loadComparison: (id: string) => Promise<boolean>;
  saveComparison: () => Promise<string | null>;
  deleteComparison: (id: string) => Promise<boolean>;
  
  // ============ EXISTING ACTIONS ============
  setCurrentStep: (step: number) => void;
  markStepComplete: (step: number) => void;
  setComparison: (comparison: BikeComparison) => void;
  setScrapingProgress: (progress: ScrapingProgress[]) => void;
  setScrapedData: (source: 'reddit' | 'xbhp' | 'youtube', data: any) => void;
  getScrapedData: (source: 'reddit' | 'xbhp' | 'youtube') => any;
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
  resetArticleGeneration: () => void;
  resetWorkflow: () => void;
}

// Initial state values
const initialState = {
  comparisonId: null,
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
  isSaving: false,
  lastSaved: null,
  saveError: null,
};

export const useAppStore = create<AppState>()((set, get) => ({
  ...initialState,
  
  // ============ DATABASE ACTIONS ============
  
  setComparisonId: (id) => set({ comparisonId: id }),
  
  /**
   * Load a comparison from the database
   */
  loadComparison: async (id: string) => {
    try {
      const response = await fetch(`/api/comparisons/${id}`);
      
      if (!response.ok) {
        console.error('Failed to load comparison:', response.statusText);
        return false;
      }
      
      const data = await response.json();
      
      // Map database fields to store state
      set({
        comparisonId: data.id,
        currentStep: data.current_step || 1,
        completedSteps: data.completed_steps || [],
        comparison: data.bike1_name && data.bike2_name ? {
          bike1: { name: data.bike1_name },
          bike2: { name: data.bike2_name },
        } : null,
        scrapedData: data.scraped_data || {},
        insights: data.insights,
        personas: data.personas,
        verdicts: data.verdicts,
        narrativePlan: data.narrative_plan,
        articleSections: data.article_sections || [],
        articleWordCount: data.article_word_count || 0,
        qualityReport: data.quality_report,
        qualityChecks: data.quality_checks || [],
        finalArticle: data.final_article || '',
        // Reset transient state
        scrapingProgress: [],
        isGeneratingPersonas: false,
        isGeneratingVerdicts: false,
        isGeneratingArticle: false,
        articleGenerationPhase: 0,
        isSaving: false,
        saveError: null,
      });
      
      return true;
    } catch (error) {
      console.error('Error loading comparison:', error);
      return false;
    }
  },
  
  /**
   * Save current state to database
   * Creates new comparison if comparisonId is null, otherwise updates
   */
  saveComparison: async () => {
    const state = get();
    
    // Must have bike names to save
    if (!state.comparison?.bike1?.name || !state.comparison?.bike2?.name) {
      set({ saveError: 'Cannot save: bike names are required' });
      return null;
    }
    
    set({ isSaving: true, saveError: null });
    
    try {
      // Prepare payload
      const payload = {
        bike1_name: state.comparison.bike1.name,
        bike2_name: state.comparison.bike2.name,
        current_step: state.currentStep,
        completed_steps: state.completedSteps,
        scraped_data: state.scrapedData,
        insights: state.insights,
        personas: state.personas,
        verdicts: state.verdicts,
        narrative_plan: state.narrativePlan,
        article_sections: state.articleSections,
        article_word_count: state.articleWordCount,
        quality_report: state.qualityReport,
        quality_checks: state.qualityChecks,
        final_article: state.finalArticle,
        status: state.completedSteps.includes(8) 
          ? 'completed' 
          : state.completedSteps.length > 0 
            ? 'in_progress' 
            : 'draft',
      };
      
      let response: Response;
      
      if (state.comparisonId) {
        // Update existing comparison
        response = await fetch(`/api/comparisons/${state.comparisonId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new comparison
        response = await fetch('/api/comparisons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save comparison');
      }
      
      const result = await response.json();
      
      // Update comparisonId if this was a new comparison
      if (!state.comparisonId && result.id) {
        set({ comparisonId: result.id });
      }
      
      set({ 
        isSaving: false, 
        lastSaved: new Date(),
        saveError: null,
      });
      
      return result.id || state.comparisonId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save';
      console.error('Error saving comparison:', error);
      set({ 
        isSaving: false, 
        saveError: errorMessage,
      });
      return null;
    }
  },
  
  /**
   * Delete a comparison from the database
   */
  deleteComparison: async (id: string) => {
    try {
      const response = await fetch(`/api/comparisons/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        console.error('Failed to delete comparison:', response.statusText);
        return false;
      }
      
      // If deleting current comparison, reset state
      if (get().comparisonId === id) {
        get().resetWorkflow();
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting comparison:', error);
      return false;
    }
  },
  
  // ============ EXISTING ACTIONS ============
  
  setCurrentStep: (step) => set({ currentStep: step }),
  
  markStepComplete: (step) => 
    set((state) => ({
      completedSteps: [...new Set([...state.completedSteps, step])]
    })),
  
  setComparison: (comparison) => set({ comparison }),
  
  setScrapingProgress: (progress) => set({ scrapingProgress: progress }),
  
  setScrapedData: (source, data) =>
    set((state) => ({
      scrapedData: {
        ...state.scrapedData,
        [source]: data,
      },
    })),
  
  getScrapedData: (source) => get().scrapedData[source],
  
  setInsights: (insights) => set({ insights }),
  
  setPersonas: (personas) => set({ personas }),
  
  setIsGeneratingPersonas: (isGenerating) => set({ isGeneratingPersonas: isGenerating }),
  
  setVerdicts: (verdicts) => set({ verdicts }),
  
  setIsGeneratingVerdicts: (isGenerating) => set({ isGeneratingVerdicts: isGenerating }),
  
  setArticleSections: (sections) => 
    set(() => ({
      articleSections: sections,
      articleWordCount: sections.reduce((sum, s) => sum + (s.wordCount || 0), 0),
    })),
  
  setNarrativePlan: (plan) => set({ narrativePlan: plan }),
  
  setQualityReport: (report) => set({ qualityReport: report }),
  
  setIsGeneratingArticle: (isGenerating) => set({ isGeneratingArticle: isGenerating }),
  
  setArticleGenerationPhase: (phase) => set({ articleGenerationPhase: phase }),
  
  setQualityChecks: (checks) => set({ qualityChecks: checks }),
  
  setFinalArticle: (article) => set({ finalArticle: article }),
  
  resetArticleGeneration: () => set({
    articleSections: [],
    articleWordCount: 0,
    narrativePlan: null,
    qualityReport: null,
    isGeneratingArticle: false,
    articleGenerationPhase: 0,
  }),
  
  resetWorkflow: () => set({ ...initialState }),
}));

// ============ HELPER HOOKS ============

/**
 * Hook to auto-save after step completion
 * Usage: const autoSave = useAutoSave();
 *        await autoSave(); // Call after completing a step
 */
export function useAutoSave() {
  const { saveComparison, comparisonId, comparison } = useAppStore();
  
  return async () => {
    // Only auto-save if we have bike names (minimum data)
    if (comparison?.bike1?.name && comparison?.bike2?.name) {
      await saveComparison();
    }
  };
}

/**
 * Hook to get save status
 */
export function useSaveStatus() {
  return useAppStore((state) => ({
    isSaving: state.isSaving,
    lastSaved: state.lastSaved,
    saveError: state.saveError,
    comparisonId: state.comparisonId,
  }));
}
