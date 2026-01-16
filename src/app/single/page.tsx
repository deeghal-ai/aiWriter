/**
 * Single Vehicle Research Workspace
 * 
 * A simplified workflow for scraping and collecting data about a single vehicle
 * to build a corpus for model page content generation.
 * 
 * Supports:
 * - ?new=true - Start a new research (resets state)
 * - ?id={uuid} - Load an existing research from database
 */

'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore, useSingleVehicleSaveStatus } from '@/lib/store';
import { Loader2, AlertCircle, RefreshCw, Home, Search, Database, FileText, Cloud, CloudOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

import { SingleStep1Input } from '@/components/steps/single/SingleStep1Input';
import { SingleStep2Scrape } from '@/components/steps/single/SingleStep2Scrape';
import { SingleCorpusView } from '@/components/steps/single/SingleCorpusView';
import { SingleStep4Generate } from '@/components/steps/single/SingleStep4Generate';
import { SingleContentView } from '@/components/steps/single/SingleContentView';
import { Sparkles, Download } from 'lucide-react';

const SINGLE_STEPS = [
  { id: 1, name: 'Input', icon: Search, description: 'Enter vehicle name' },
  { id: 2, name: 'Scrape', icon: Database, description: 'Collect data' },
  { id: 3, name: 'Corpus', icon: FileText, description: 'View results' },
  { id: 4, name: 'Generate', icon: Sparkles, description: 'AI generation' },
  { id: 5, name: 'Export', icon: Download, description: 'View & export' },
];

// Loading component for Suspense fallback
function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      <p className="text-xs text-muted-foreground mt-3">Loading research...</p>
    </div>
  );
}

// Main content component that uses useSearchParams
function SingleVehiclePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const { 
    singleVehicle, 
    singleVehicleCurrentStep, 
    singleVehicleCompletedSteps,
    resetSingleVehicleWorkflow,
    loadSingleVehicleResearch,
    setSingleVehicleCurrentStep,
    singleVehicleId: currentSingleVehicleId,
  } = useAppStore();
  
  const { isSaving, lastSaved, saveError, singleVehicleId } = useSingleVehicleSaveStatus();
  
  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const initializePage = async () => {
      setLoading(true);
      setLoadError(null);
      
      const isNew = searchParams.get('new') === 'true';
      const idToLoad = searchParams.get('id');
      
      if (isNew) {
        // Start fresh - reset state
        resetSingleVehicleWorkflow();
        setLoading(false);
      } else if (idToLoad) {
        // Load existing research from database
        try {
          const success = await loadSingleVehicleResearch(idToLoad);
          if (!success) {
            setLoadError('Failed to load research. It may have been deleted.');
          }
        } catch (err) {
          console.error('Error loading research:', err);
          setLoadError('An error occurred while loading the research.');
        } finally {
          setLoading(false);
        }
      } else {
        // No params - check if we have existing state, otherwise start fresh
        if (!currentSingleVehicleId && !singleVehicle?.vehicle) {
          resetSingleVehicleWorkflow();
        }
        setLoading(false);
      }
    };
    
    initializePage();
  }, [searchParams, resetSingleVehicleWorkflow, loadSingleVehicleResearch, currentSingleVehicleId, singleVehicle?.vehicle]);

  const handleBack = () => router.push('/');
  
  const handleRetry = () => {
    const idToLoad = searchParams.get('id');
    if (idToLoad) {
      initializedRef.current = false;
      setLoading(true);
      setLoadError(null);
      loadSingleVehicleResearch(idToLoad)
        .then((success) => {
          if (!success) {
            setLoadError('Failed to load research. It may have been deleted.');
          }
        })
        .catch(() => {
          setLoadError('An error occurred while loading the research.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  const handleStartNew = () => {
    resetSingleVehicleWorkflow();
    router.replace('/single?new=true');
    setLoadError(null);
    setLoading(false);
  };

  const renderStep = () => {
    switch (singleVehicleCurrentStep) {
      case 1: return <SingleStep1Input />;
      case 2: return <SingleStep2Scrape />;
      case 3: return <SingleCorpusView />;
      case 4: return <SingleStep4Generate />;
      case 5: return <SingleContentView />;
      default: return <SingleStep1Input />;
    }
  };

  const getTitle = () => {
    if (singleVehicle?.vehicle) return `${singleVehicle.vehicle} Research`;
    return 'Single Vehicle Research';
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        <p className="text-xs text-muted-foreground mt-3">Loading research...</p>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="bg-white rounded-2xl p-8 shadow-soft border border-border/50 max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-sm font-medium text-foreground mb-2">Unable to Load Research</h2>
          <p className="text-xs text-muted-foreground mb-4">{loadError}</p>
          <div className="flex items-center gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={handleRetry} className="h-8 text-xs gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </Button>
            <Button variant="outline" size="sm" onClick={handleBack} className="h-8 text-xs gap-1.5">
              <Home className="w-3.5 h-3.5" />
              Home
            </Button>
            <Button size="sm" onClick={handleStartNew} className="h-8 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700">
              Start New
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex-shrink-0 h-12 border-b border-border/50 bg-white/80 backdrop-blur-sm flex items-center px-4 gap-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBack}
          className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Home className="w-3.5 h-3.5" />
          Home
        </Button>
        
        <div className="h-4 w-px bg-border" />
        
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-1.5 rounded-lg border border-violet-200/50">
            <Search className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h1 className="text-sm font-medium text-foreground">{getTitle()}</h1>
            <p className="text-[10px] text-muted-foreground">Build corpus for model pages</p>
          </div>
        </div>
        
        {/* Save Status Indicator */}
        <div className="ml-auto flex items-center gap-2">
          {isSaving ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </div>
          ) : saveError ? (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <CloudOff className="w-3 h-3" />
              <span>Save failed</span>
            </div>
          ) : lastSaved ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Cloud className="w-3 h-3" />
              <span>Saved</span>
            </div>
          ) : singleVehicleId ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cloud className="w-3 h-3" />
              <span>Synced</span>
            </div>
          ) : null}
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Step indicator with navigation */}
        <aside className="flex-shrink-0 w-48 border-r border-border/50 bg-white/50 p-3">
          <div className="space-y-1">
            {SINGLE_STEPS.map((step) => {
              const isActive = singleVehicleCurrentStep === step.id;
              const isCompleted = singleVehicleCompletedSteps.includes(step.id);
              const canNavigate = isCompleted || step.id < singleVehicleCurrentStep;
              
              const handleStepClick = () => {
                if (canNavigate && !isActive) {
                  setSingleVehicleCurrentStep(step.id);
                }
              };
              
              return (
                <div
                  key={step.id}
                  onClick={handleStepClick}
                  className={`
                    flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all
                    ${canNavigate && !isActive ? 'cursor-pointer' : ''}
                    ${isActive 
                      ? 'bg-violet-50 border border-violet-200/60 shadow-sm' 
                      : isCompleted 
                        ? 'bg-emerald-50/50 border border-emerald-200/40 hover:bg-emerald-100/50' 
                        : 'hover:bg-slate-50 border border-transparent'
                    }
                  `}
                >
                  <div className={`
                    w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium
                    ${isActive 
                      ? 'bg-violet-100 text-violet-700' 
                      : isCompleted 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 text-slate-500'
                    }
                  `}>
                    {isCompleted ? '✓' : step.id}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${isActive ? 'text-violet-900' : isCompleted ? 'text-emerald-900' : 'text-foreground'}`}>
                      {step.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Info card */}
          <div className="mt-4 p-2.5 bg-slate-50 rounded-lg border border-slate-200/50">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Single vehicle research collects data from YouTube, Reddit, and BikeDekho reviews,
              then uses AI to generate structured page content.
            </p>
          </div>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gradient-mesh relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-1/4 w-64 h-64 bg-violet-500/[0.03] rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-purple-500/[0.03] rounded-full blur-3xl" />
          </div>
          
          <div className="relative max-w-4xl mx-auto p-5">
            {renderStep()}
          </div>
        </main>
      </div>
    </div>
  );
}

// Default export wraps content in Suspense boundary for useSearchParams
export default function SingleVehiclePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SingleVehiclePageContent />
    </Suspense>
  );
}
