/**
 * Comparison Workspace Page
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { AppHeader } from '@/components/layout/AppHeader';
import { StepSidebar } from '@/components/layout/StepSidebar';
import { Loader2, AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Step1Input } from '@/components/steps/Step1Input';
import { Step2Scrape } from '@/components/steps/Step2Scrape';
import { Step3Extract } from '@/components/steps/Step3Extract';
import { Step4Personas } from '@/components/steps/Step4Personas';
import { Step5Verdicts } from '@/components/steps/Step5Verdicts';
import { Step6Article } from '@/components/steps/Step6Article';
import { Step7Polish } from '@/components/steps/Step7Polish';
import { Step8Review } from '@/components/steps/Step8Review';

export default function ComparisonPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { comparisonId, currentStep, comparison, loadComparison, resetWorkflow, setComparisonId } = useAppStore();
  const initializedIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    const id = params.id as string;
    if (initializedIdRef.current === id) return;
    
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        if (id === 'new') {
          resetWorkflow();
          setComparisonId(null);
        } else {
          const success = await loadComparison(id);
          if (!success) setError('Comparison not found');
        }
        initializedIdRef.current = id;
      } catch {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [params.id, loadComparison, resetWorkflow, setComparisonId]);

  const handleBack = () => router.push('/');

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1Input />;
      case 2: return <Step2Scrape />;
      case 3: return <Step3Extract />;
      case 4: return <Step4Personas />;
      case 5: return <Step5Verdicts />;
      case 6: return <Step6Article />;
      case 7: return <Step7Polish />;
      case 8: return <Step8Review />;
      default: return <Step1Input />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground mt-3">
          {params.id === 'new' ? 'Preparing...' : 'Loading...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-xs bg-white p-6 rounded-xl shadow-soft border border-border/50">
          <div className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <h2 className="text-sm font-medium text-foreground mb-1">Unable to Load</h2>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleBack} size="sm" className="h-7 px-2.5 text-xs gap-1">
              <Home className="w-3 h-3" />Back
            </Button>
            <Button onClick={() => window.location.reload()} size="sm" className="h-7 px-2.5 text-xs gap-1">
              <RefreshCw className="w-3 h-3" />Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getTitle = () => {
    if (comparison?.bike1 && comparison?.bike2) return `${comparison.bike1} vs ${comparison.bike2}`;
    return 'New Comparison';
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <AppHeader showBackButton onBack={handleBack} title={getTitle()} comparisonId={comparisonId} />
      
      <div className="flex flex-1 overflow-hidden">
        <StepSidebar />
        
        <main className="flex-1 overflow-y-auto bg-gradient-mesh relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-1/4 w-64 h-64 bg-primary/[0.03] rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-[hsl(85,25%,45%)]/[0.03] rounded-full blur-3xl" />
          </div>
          
          <div className="relative max-w-4xl mx-auto p-5">
            {renderStep()}
          </div>
        </main>
      </div>
    </div>
  );
}
