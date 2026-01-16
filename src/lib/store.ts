/**
 * BikeDekho AI Writer - State Management Store
 * 
 * Modified to support database persistence via Supabase.
 * Works in two modes:
 * 1. New comparison (comparisonId = null) - local state only
 * 2. Saved comparison (comparisonId = uuid) - syncs with database
 * 
 * NOTE: This replaces the localStorage persistence with database sync.
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
  SingleVehicleResearch,
  SingleVehicleCorpus,
  SingleVehicleScrapingProgress,
  SingleVehiclePageContent,
  SingleVehicleGenerationProgress,
} from './types';

// Types for scraped data storage
// Supports: youtube, reddit, internal (BikeDekho), xbhp
interface ScrapedData {
  reddit?: any;
  xbhp?: any;
  youtube?: any;
  internal?: any;  // BikeDekho internal data (user reviews, expert insights)
}

// Single vehicle scraped data storage
interface SingleVehicleScrapedData {
  youtube?: any;
  webSearch?: any;
  reddit?: any;
  internal?: any;
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
  
  // ============ SINGLE VEHICLE STATE ============
  singleVehicleId: string | null;
  singleVehicle: SingleVehicleResearch | null;
  singleVehicleCurrentStep: number;
  singleVehicleCompletedSteps: number[];
  singleVehicleScrapingProgress: SingleVehicleScrapingProgress[];
  singleVehicleScrapedData: SingleVehicleScrapedData;
  singleVehicleCorpus: SingleVehicleCorpus | null;
  singleVehicleContent: SingleVehiclePageContent | null;
  singleVehicleGenerationProgress: SingleVehicleGenerationProgress[];
  isGeneratingSingleVehicleContent: boolean;
  isSavingSingleVehicle: boolean;
  lastSavedSingleVehicle: Date | null;
  saveSingleVehicleError: string | null;
  
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
  setScrapedData: (source: 'reddit' | 'xbhp' | 'youtube' | 'internal', data: any) => void;
  getScrapedData: (source: 'reddit' | 'xbhp' | 'youtube' | 'internal') => any;
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
  
  // ============ SINGLE VEHICLE ACTIONS ============
  setSingleVehicleId: (id: string | null) => void;
  setSingleVehicle: (vehicle: SingleVehicleResearch | null) => void;
  setSingleVehicleCurrentStep: (step: number) => void;
  markSingleVehicleStepComplete: (step: number) => void;
  setSingleVehicleScrapingProgress: (progress: SingleVehicleScrapingProgress[]) => void;
  setSingleVehicleScrapedData: (source: 'youtube' | 'reddit' | 'internal', data: any) => void;
  getSingleVehicleScrapedData: (source: 'youtube' | 'reddit' | 'internal') => any;
  setSingleVehicleCorpus: (corpus: SingleVehicleCorpus | null) => void;
  setSingleVehicleContent: (content: SingleVehiclePageContent | null) => void;
  setSingleVehicleGenerationProgress: (progress: SingleVehicleGenerationProgress[]) => void;
  setIsGeneratingSingleVehicleContent: (isGenerating: boolean) => void;
  resetSingleVehicleWorkflow: () => void;
  
  // ============ SINGLE VEHICLE DATABASE ACTIONS ============
  loadSingleVehicleResearch: (id: string) => Promise<boolean>;
  saveSingleVehicleResearch: () => Promise<string | null>;
  deleteSingleVehicleResearch: (id: string) => Promise<boolean>;
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
  // Single vehicle initial state
  singleVehicleId: null,
  singleVehicle: null,
  singleVehicleCurrentStep: 1,
  singleVehicleCompletedSteps: [] as number[],
  singleVehicleScrapingProgress: [] as SingleVehicleScrapingProgress[],
  singleVehicleScrapedData: {} as SingleVehicleScrapedData,
  singleVehicleCorpus: null,
  singleVehicleContent: null,
  singleVehicleGenerationProgress: [] as SingleVehicleGenerationProgress[],
  isGeneratingSingleVehicleContent: false,
  isSavingSingleVehicle: false,
  lastSavedSingleVehicle: null,
  saveSingleVehicleError: null,
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
          bike1: data.bike1_name,
          bike2: data.bike2_name,
          // Infer research sources from scraped data if available
          // This preserves the user's original selection when loading saved comparisons
          researchSources: (() => {
            const hasAnyScrapedData = data.scraped_data && (
              data.scraped_data.youtube || 
              data.scraped_data.reddit || 
              data.scraped_data.internal || 
              data.scraped_data.xbhp
            );
            
            // If we have scraped data, infer sources from what was scraped
            if (hasAnyScrapedData) {
              return {
                xbhp: !!data.scraped_data?.xbhp,
                teamBhp: false,
                reddit: !!data.scraped_data?.reddit,
                youtube: !!data.scraped_data?.youtube,
                instagram: false,
                internal: !!data.scraped_data?.internal,
              };
            }
            
            // Otherwise, use defaults (YouTube enabled for new comparisons)
            return {
              xbhp: false,
              teamBhp: false,
              reddit: false,
              youtube: true,
              instagram: false,
              internal: false,
            };
          })(),
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
    if (!state.comparison?.bike1 || !state.comparison?.bike2) {
      set({ saveError: 'Cannot save: bike names are required' });
      return null;
    }
    
    set({ isSaving: true, saveError: null });
    
    try {
      // Prepare payload
      const payload = {
        bike1_name: state.comparison.bike1,
        bike2_name: state.comparison.bike2,
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
  
  // ============ SINGLE VEHICLE ACTIONS ============
  
  setSingleVehicleId: (id) => set({ singleVehicleId: id }),
  
  setSingleVehicle: (vehicle) => set({ singleVehicle: vehicle }),
  
  setSingleVehicleCurrentStep: (step) => set({ singleVehicleCurrentStep: step }),
  
  markSingleVehicleStepComplete: (step) =>
    set((state) => ({
      singleVehicleCompletedSteps: [...new Set([...state.singleVehicleCompletedSteps, step])]
    })),
  
  setSingleVehicleScrapingProgress: (progress) => set({ singleVehicleScrapingProgress: progress }),
  
  setSingleVehicleScrapedData: (source, data) =>
    set((state) => ({
      singleVehicleScrapedData: {
        ...state.singleVehicleScrapedData,
        [source]: data,
      },
    })),
  
  getSingleVehicleScrapedData: (source) => get().singleVehicleScrapedData[source],
  
  setSingleVehicleCorpus: (corpus) => set({ singleVehicleCorpus: corpus }),
  
  setSingleVehicleContent: (content) => set({ singleVehicleContent: content }),
  
  setSingleVehicleGenerationProgress: (progress) => set({ singleVehicleGenerationProgress: progress }),
  
  setIsGeneratingSingleVehicleContent: (isGenerating) => set({ isGeneratingSingleVehicleContent: isGenerating }),
  
  resetSingleVehicleWorkflow: () => set({
    singleVehicleId: null,
    singleVehicle: null,
    singleVehicleCurrentStep: 1,
    singleVehicleCompletedSteps: [],
    singleVehicleScrapingProgress: [],
    singleVehicleScrapedData: {},
    singleVehicleCorpus: null,
    singleVehicleContent: null,
    singleVehicleGenerationProgress: [],
    isGeneratingSingleVehicleContent: false,
    isSavingSingleVehicle: false,
    lastSavedSingleVehicle: null,
    saveSingleVehicleError: null,
  }),
  
  // ============ SINGLE VEHICLE DATABASE ACTIONS ============
  
  /**
   * Load a single vehicle research from the database
   */
  loadSingleVehicleResearch: async (id: string) => {
    try {
      const response = await fetch(`/api/single-research/${id}`);
      
      if (!response.ok) {
        console.error('Failed to load single vehicle research:', response.statusText);
        return false;
      }
      
      const data = await response.json();
      
      // Determine the correct step based on what data actually exists
      // This handles cases where current_step in database is outdated
      let determinedStep = data.current_step || 1;
      let completedSteps = data.completed_steps || [];
      
      // If we have generated_content, we should be at step 5 (Export/View)
      if (data.generated_content) {
        determinedStep = 5;
        // Ensure all steps are marked complete
        completedSteps = [1, 2, 3, 4, 5];
      }
      // If we have corpus with actual data, we should be at least at step 3 (Corpus) or 4 (Generate)
      else if (data.corpus && data.corpus.metadata) {
        // Check if corpus has any actual data
        const hasCorpusData = data.corpus.youtube || data.corpus.reddit || 
                             data.corpus.internal || data.corpus.webSearch;
        if (hasCorpusData) {
          // If step 4 is in completed_steps, go to step 4, otherwise step 3
          determinedStep = completedSteps.includes(4) ? 4 : 3;
          // Ensure steps 1, 2, 3 are complete
          if (!completedSteps.includes(1)) completedSteps.push(1);
          if (!completedSteps.includes(2)) completedSteps.push(2);
          if (!completedSteps.includes(3)) completedSteps.push(3);
        }
      }
      
      // Map database fields to store state
      set({
        singleVehicleId: data.id,
        singleVehicleCurrentStep: determinedStep,
        singleVehicleCompletedSteps: completedSteps,
        singleVehicle: data.vehicle_name ? {
          vehicle: data.vehicle_name,
          researchSources: {
            youtube: (data.research_sources || []).includes('youtube'),
            reddit: (data.research_sources || []).includes('reddit'),
            internal: (data.research_sources || []).includes('internal'),
          },
        } : null,
        singleVehicleCorpus: data.corpus || null,
        singleVehicleContent: data.generated_content || null,
        // Reset transient state
        singleVehicleScrapingProgress: [],
        singleVehicleScrapedData: {},
        singleVehicleGenerationProgress: [],
        isGeneratingSingleVehicleContent: false,
        isSavingSingleVehicle: false,
        saveSingleVehicleError: null,
      });
      
      return true;
    } catch (error) {
      console.error('Error loading single vehicle research:', error);
      return false;
    }
  },
  
  /**
   * Save current single vehicle research state to database
   * Creates new entry if singleVehicleId is null, otherwise updates
   */
  saveSingleVehicleResearch: async () => {
    const state = get();
    
    // Must have vehicle name to save
    if (!state.singleVehicle?.vehicle) {
      set({ saveSingleVehicleError: 'Cannot save: vehicle name is required' });
      return null;
    }
    
    set({ isSavingSingleVehicle: true, saveSingleVehicleError: null });
    
    try {
      // Build research sources array from object
      const researchSources: string[] = [];
      if (state.singleVehicle.researchSources?.youtube) researchSources.push('youtube');
      if (state.singleVehicle.researchSources?.reddit) researchSources.push('reddit');
      if (state.singleVehicle.researchSources?.internal) researchSources.push('internal');
      
      // Prepare payload
      const payload = {
        vehicle_name: state.singleVehicle.vehicle,
        research_sources: researchSources,
        current_step: state.singleVehicleCurrentStep,
        completed_steps: state.singleVehicleCompletedSteps,
        corpus: state.singleVehicleCorpus,
        generated_content: state.singleVehicleContent,
        status: state.singleVehicleCompletedSteps.includes(5) 
          ? 'completed' 
          : state.singleVehicleCompletedSteps.includes(4)
            ? 'generating'
            : state.singleVehicleCompletedSteps.includes(3)
              ? 'corpus_ready'
              : state.singleVehicleCompletedSteps.includes(2)
                ? 'scraping'
                : 'draft',
      };
      
      let response: Response;
      
      if (state.singleVehicleId) {
        // Update existing entry
        response = await fetch(`/api/single-research/${state.singleVehicleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new entry
        response = await fetch('/api/single-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save single vehicle research');
      }
      
      const result = await response.json();
      
      // Update singleVehicleId if this was a new entry
      if (!state.singleVehicleId && result.id) {
        set({ singleVehicleId: result.id });
      }
      
      set({ 
        isSavingSingleVehicle: false, 
        lastSavedSingleVehicle: new Date(),
        saveSingleVehicleError: null,
      });
      
      return result.id || state.singleVehicleId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save';
      console.error('Error saving single vehicle research:', error);
      set({ 
        isSavingSingleVehicle: false, 
        saveSingleVehicleError: errorMessage,
      });
      return null;
    }
  },
  
  /**
   * Delete a single vehicle research from the database
   */
  deleteSingleVehicleResearch: async (id: string) => {
    try {
      const response = await fetch(`/api/single-research/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        console.error('Failed to delete single vehicle research:', response.statusText);
        return false;
      }
      
      // If deleting current research, reset state
      if (get().singleVehicleId === id) {
        get().resetSingleVehicleWorkflow();
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting single vehicle research:', error);
      return false;
    }
  },
}));

// ============ HELPER HOOKS ============

/**
 * Hook to auto-save comparisons after step completion
 * Usage: const autoSave = useAutoSave();
 *        await autoSave(); // Call after completing a step
 */
export function useAutoSave() {
  const { saveComparison, comparisonId, comparison } = useAppStore();
  
  return async () => {
    // Only auto-save if we have bike names (minimum data)
    if (comparison?.bike1 && comparison?.bike2) {
      await saveComparison();
    }
  };
}

/**
 * Hook to auto-save single vehicle research after step completion
 * Usage: const autoSaveSingleVehicle = useAutoSaveSingleVehicle();
 *        await autoSaveSingleVehicle(); // Call after completing a step
 */
export function useAutoSaveSingleVehicle() {
  const { saveSingleVehicleResearch, singleVehicle } = useAppStore();
  
  return async () => {
    // Only auto-save if we have vehicle name (minimum data)
    if (singleVehicle?.vehicle) {
      await saveSingleVehicleResearch();
    }
  };
}

/**
 * Hook to get single vehicle save status
 */
export function useSingleVehicleSaveStatus() {
  const isSaving = useAppStore((state) => state.isSavingSingleVehicle);
  const lastSaved = useAppStore((state) => state.lastSavedSingleVehicle);
  const saveError = useAppStore((state) => state.saveSingleVehicleError);
  const singleVehicleId = useAppStore((state) => state.singleVehicleId);
  
  return { isSaving, lastSaved, saveError, singleVehicleId };
}

/**
 * Hook to get save status
 * Uses individual selectors to avoid creating new objects on every render
 */
export function useSaveStatus() {
  const isSaving = useAppStore((state) => state.isSaving);
  const lastSaved = useAppStore((state) => state.lastSaved);
  const saveError = useAppStore((state) => state.saveError);
  const comparisonId = useAppStore((state) => state.comparisonId);
  
  return { isSaving, lastSaved, saveError, comparisonId };
}
