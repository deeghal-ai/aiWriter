'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Loader2, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Sparkles,
  Brain,
  Users,
  Trophy,
  Timer,
  Target
} from 'lucide-react';
import { useAppStore, useAutoSaveSingleVehicle } from '@/lib/store';
import type { SingleVehicleGenerationProgress, SingleVehiclePageContent } from '@/lib/types';

interface GenerationStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const GENERATION_STEPS: GenerationStep[] = [
  { id: 'vehicle_info', label: 'Vehicle Info', icon: <Target className="h-4 w-4" />, description: 'Parsing vehicle details' },
  { id: 'owner_pulse', label: 'Owner Pulse', icon: <Users className="h-4 w-4" />, description: 'Extracting owner sentiment' },
  { id: 'quick_decision', label: 'Quick Decision', icon: <Brain className="h-4 w-4" />, description: 'Generating verdict' },
  { id: 'scorecard', label: 'Scorecard', icon: <Trophy className="h-4 w-4" />, description: 'Ranking categories' },
  { id: 'competitors', label: 'Competitors', icon: <Users className="h-4 w-4" />, description: 'Analyzing competition' },
  { id: 'timing', label: 'Buy Timing', icon: <Timer className="h-4 w-4" />, description: 'Evaluating timing' },
];

export function SingleStep4Generate() {
  const singleVehicle = useAppStore((state) => state.singleVehicle);
  const singleVehicleCorpus = useAppStore((state) => state.singleVehicleCorpus);
  const setSingleVehicleCurrentStep = useAppStore((state) => state.setSingleVehicleCurrentStep);
  const markSingleVehicleStepComplete = useAppStore((state) => state.markSingleVehicleStepComplete);
  const setSingleVehicleContent = useAppStore((state) => state.setSingleVehicleContent);
  const singleVehicleContent = useAppStore((state) => state.singleVehicleContent);
  const autoSave = useAutoSaveSingleVehicle();

  const [isGenerating, setIsGenerating] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<Record<string, 'pending' | 'in-progress' | 'complete' | 'error'>>({});
  const [error, setError] = useState<string | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const hasStartedRef = useRef(false);

  // Check if we already have content
  const hasExistingContent = !!singleVehicleContent;

  useEffect(() => {
    // Initialize step statuses
    const initialStatuses: Record<string, 'pending' | 'in-progress' | 'complete' | 'error'> = {};
    GENERATION_STEPS.forEach(step => {
      initialStatuses[step.id] = hasExistingContent ? 'complete' : 'pending';
    });
    setStepStatuses(initialStatuses);
  }, [hasExistingContent]);

  const handleGenerate = async () => {
    if (!singleVehicleCorpus || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    hasStartedRef.current = true;

    // Reset statuses
    const resetStatuses: Record<string, 'pending' | 'in-progress' | 'complete' | 'error'> = {};
    GENERATION_STEPS.forEach(step => {
      resetStatuses[step.id] = 'pending';
    });
    setStepStatuses(resetStatuses);

    const startTime = Date.now();

    try {
      // Start with vehicle_info
      setStepStatuses(prev => ({ ...prev, vehicle_info: 'in-progress' }));

      const response = await fetch('/api/generate/single/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corpus: singleVehicleCorpus,
          vehicle: singleVehicle?.vehicle || singleVehicleCorpus.metadata?.vehicle
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Generation failed');
      }

      // Update all statuses to complete
      const completeStatuses: Record<string, 'complete'> = {};
      GENERATION_STEPS.forEach(step => {
        completeStatuses[step.id] = 'complete';
      });
      setStepStatuses(completeStatuses);

      // Store the generated content
      setSingleVehicleContent(result.data);
      setGenerationTime(result.metadata?.total_time_ms || Date.now() - startTime);

      // Mark step as complete
      markSingleVehicleStepComplete(4);
      
      // Auto-save after generation is complete
      autoSave();

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate content');
      
      // Mark current step as error
      setStepStatuses(prev => {
        const updated = { ...prev };
        const inProgressStep = Object.entries(prev).find(([_, status]) => status === 'in-progress');
        if (inProgressStep) {
          updated[inProgressStep[0]] = 'error';
        }
        return updated;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setSingleVehicleContent(null);
    setStepStatuses({});
    setError(null);
    setGenerationTime(null);
    hasStartedRef.current = false;
  };

  const handleNext = () => {
    markSingleVehicleStepComplete(4);
    setSingleVehicleCurrentStep(5);
  };

  const allComplete = Object.values(stepStatuses).every(s => s === 'complete');
  const anyError = Object.values(stepStatuses).some(s => s === 'error');
  const progressValue = (Object.values(stepStatuses).filter(s => s === 'complete').length / GENERATION_STEPS.length) * 100;

  // Auto-show complete state if we have existing content
  useEffect(() => {
    if (hasExistingContent && !hasStartedRef.current) {
      const completeStatuses: Record<string, 'complete'> = {};
      GENERATION_STEPS.forEach(step => {
        completeStatuses[step.id] = 'complete';
      });
      setStepStatuses(completeStatuses);
    }
  }, [hasExistingContent]);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">
          Generate Page Content
        </h2>
        <p className="text-slate-600">
          Transform your scraped corpus into structured page content using AI analysis.
        </p>
      </div>

      {/* Stats Card */}
      {singleVehicleCorpus && (
        <Card className="mb-6 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-violet-100">
                <Sparkles className="h-6 w-6 text-violet-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-violet-900">
                  {singleVehicle?.vehicle || 'Vehicle'}
                </h3>
                <p className="text-sm text-violet-700">
                  {singleVehicleCorpus.metadata?.totalPosts || 0} posts • {singleVehicleCorpus.metadata?.totalComments || 0} comments • {singleVehicleCorpus.metadata?.sourcesUsed?.length || 0} sources
                </p>
              </div>
              {generationTime && (
                <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                  Generated in {(generationTime / 1000).toFixed(1)}s
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Generation Progress</CardTitle>
          <CardDescription>
            AI pipeline generates content sections from your corpus
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isGenerating && (
            <div className="mb-4">
              <Progress value={progressValue} className="h-2" />
              <p className="text-xs text-slate-500 mt-1 text-right">{Math.round(progressValue)}% complete</p>
            </div>
          )}

          <div className="space-y-3">
            {GENERATION_STEPS.map((step) => {
              const status = stepStatuses[step.id] || 'pending';
              
              return (
                <div 
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    status === 'in-progress' ? 'bg-blue-50 border border-blue-200' :
                    status === 'complete' ? 'bg-green-50 border border-green-200' :
                    status === 'error' ? 'bg-red-50 border border-red-200' :
                    'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <div className={`p-1.5 rounded-full ${
                    status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                    status === 'complete' ? 'bg-green-100 text-green-600' :
                    status === 'error' ? 'bg-red-100 text-red-600' :
                    'bg-slate-200 text-slate-500'
                  }`}>
                    {status === 'in-progress' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : status === 'complete' ? (
                      <Check className="h-4 w-4" />
                    ) : status === 'error' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{step.label}</p>
                    <p className="text-xs text-slate-500">{step.description}</p>
                  </div>
                  {status === 'complete' && (
                    <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                      Done
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Generation Failed</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <Button 
                  onClick={handleGenerate} 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {allComplete && !isGenerating && singleVehicleContent && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-green-900">Content Generated Successfully!</h4>
                  <p className="text-sm text-green-700">
                    All sections have been generated from your corpus.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleRegenerate} 
                variant="outline" 
                size="sm" 
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-8">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setSingleVehicleCurrentStep(3)}
        >
          Back to Corpus
        </Button>

        {!allComplete ? (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !singleVehicleCorpus}
            size="lg"
            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Content
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            size="lg"
            className="gap-2"
          >
            View Content
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
