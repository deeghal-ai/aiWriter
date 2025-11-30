/**
 * useStepCompletion Hook
 * 
 * A helper hook that handles step completion with auto-save.
 * Use this in step components to ensure data is saved to database
 * when moving to the next step.
 * 
 * Usage:
 * ```tsx
 * const { completeStep, isProcessing } = useStepCompletion();
 * 
 * const handleGenerate = async () => {
 *   // ... do your generation logic ...
 *   await completeStep(4, { personas: generatedPersonas });
 * };
 * ```
 */

'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface StepData {
  // Step-specific data to save
  [key: string]: any;
}

interface UseStepCompletionOptions {
  // Whether to automatically navigate to the next step
  autoAdvance?: boolean;
  // Callback after successful save
  onSuccess?: (comparisonId: string) => void;
  // Callback on save error
  onError?: (error: string) => void;
}

export function useStepCompletion(options: UseStepCompletionOptions = {}) {
  const { autoAdvance = true, onSuccess, onError } = options;
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  
  const {
    comparisonId,
    currentStep,
    markStepComplete,
    setCurrentStep,
    saveComparison,
    setInsights,
    setPersonas,
    setVerdicts,
    setNarrativePlan,
    setArticleSections,
    setQualityReport,
    setQualityChecks,
    setFinalArticle,
    setScrapedData,
  } = useAppStore();

  /**
   * Complete a step and save to database
   */
  const completeStep = useCallback(async (
    step: number,
    data?: StepData
  ): Promise<boolean> => {
    setIsProcessing(true);
    
    try {
      // Update local state with the step's data
      if (data) {
        // Map data keys to appropriate store setters
        if (data.scrapedData) {
          Object.entries(data.scrapedData).forEach(([source, sourceData]) => {
            setScrapedData(source as 'reddit' | 'xbhp' | 'youtube', sourceData);
          });
        }
        if (data.insights !== undefined) setInsights(data.insights);
        if (data.personas !== undefined) setPersonas(data.personas);
        if (data.verdicts !== undefined) setVerdicts(data.verdicts);
        if (data.narrativePlan !== undefined) setNarrativePlan(data.narrativePlan);
        if (data.articleSections !== undefined) setArticleSections(data.articleSections);
        if (data.qualityReport !== undefined) setQualityReport(data.qualityReport);
        if (data.qualityChecks !== undefined) setQualityChecks(data.qualityChecks);
        if (data.finalArticle !== undefined) setFinalArticle(data.finalArticle);
      }
      
      // Mark step as complete
      markStepComplete(step);
      
      // Save to database
      const savedId = await saveComparison();
      
      if (!savedId) {
        throw new Error('Failed to save comparison');
      }
      
      // If this is a new comparison that just got saved, update the URL
      if (!comparisonId && savedId) {
        // Replace the URL without navigation (keeps state)
        window.history.replaceState(null, '', `/comparison/${savedId}`);
      }
      
      // Auto-advance to next step if enabled
      if (autoAdvance && step < 8) {
        setCurrentStep(step + 1);
      }
      
      // Success callback
      if (onSuccess) {
        onSuccess(savedId);
      }
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Save failed';
      console.error('Step completion error:', error);
      
      if (onError) {
        onError(errorMessage);
      }
      
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [
    comparisonId,
    markStepComplete,
    setCurrentStep,
    saveComparison,
    autoAdvance,
    onSuccess,
    onError,
  ]);

  /**
   * Save current state without completing the step
   * (useful for draft saves)
   */
  const saveDraft = useCallback(async (): Promise<boolean> => {
    setIsProcessing(true);
    
    try {
      const savedId = await saveComparison();
      
      if (!savedId) {
        throw new Error('Failed to save draft');
      }
      
      // If this is a new comparison that just got saved, update the URL
      if (!comparisonId && savedId) {
        window.history.replaceState(null, '', `/comparison/${savedId}`);
      }
      
      return true;
    } catch (error) {
      console.error('Draft save error:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [comparisonId, saveComparison]);

  return {
    completeStep,
    saveDraft,
    isProcessing,
    comparisonId,
    currentStep,
  };
}

/**
 * Simplified hook for just saving (without step completion logic)
 */
export function useSave() {
  const { saveComparison, comparisonId } = useAppStore();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      const savedId = await saveComparison();
      
      if (!savedId) {
        throw new Error('Save failed');
      }
      
      // Update URL if new comparison
      if (!comparisonId && savedId) {
        window.history.replaceState(null, '', `/comparison/${savedId}`);
      }
      
      return savedId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [saveComparison, comparisonId]);

  return { save, isSaving, error };
}
