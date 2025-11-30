/**
 * Comparison Workspace Page
 * 
 * This is the main workspace for working on a bike comparison.
 * - /comparison/new - Start a new comparison
 * - /comparison/[id] - Continue an existing comparison
 * 
 * Loads the saved state from database and renders the appropriate step.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { AppHeader } from '@/components/layout/AppHeader';
import { StepSidebar } from '@/components/layout/StepSidebar';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Import all step components
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
  
  const { 
    comparisonId,
    currentStep, 
    comparison,
    loadComparison, 
    resetWorkflow,
    setComparisonId,
  } = useAppStore();

  useEffect(() => {
    const initializeWorkspace = async () => {
      const id = params.id as string;
      
      setLoading(true);
      setError(null);
      
      try {
        if (id === 'new') {
          // New comparison - reset state to fresh
          resetWorkflow();
          setComparisonId(null);
        } else {
          // Load existing comparison from database
          const success = await loadComparison(id);
          
          if (!success) {
            setError('Comparison not found or failed to load');
          }
        }
      } catch (err) {
        console.error('Error initializing workspace:', err);
        setError('Failed to load comparison');
      } finally {
        setLoading(false);
      }
    };

    initializeWorkspace();
  }, [params.id, loadComparison, resetWorkflow, setComparisonId]);

  // Handle back navigation
  const handleBack = () => {
    router.push('/');
  };

  // Render the current step component
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

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600">
          {params.id === 'new' ? 'Preparing workspace...' : 'Loading comparison...'}
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Load Comparison
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleBack}>
              Back to Home
            </Button>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Get display title
  const getTitle = () => {
    if (comparison?.bike1 && comparison?.bike2) {
      return `${comparison.bike1} vs ${comparison.bike2}`;
    }
    return 'New Comparison';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header with back button and comparison title */}
      <AppHeader 
        showBackButton={true}
        onBack={handleBack}
        title={getTitle()}
        comparisonId={comparisonId}
      />
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar with step navigation */}
        <StepSidebar />
        
        {/* Main step content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6">
            {renderStep()}
          </div>
        </main>
      </div>
    </div>
  );
}

