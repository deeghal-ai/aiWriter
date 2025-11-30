'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, FileText, Loader2, Check, AlertCircle, Eye, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useState, useEffect, useCallback } from 'react';
import { ArticleSection, NarrativePlan, QualityReport } from '@/lib/types';

export function Step6Article() {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const markStepComplete = useAppStore((state) => state.markStepComplete);
  const comparison = useAppStore((state) => state.comparison);
  const insights = useAppStore((state) => state.insights);
  const personas = useAppStore((state) => state.personas);
  const verdicts = useAppStore((state) => state.verdicts);
  
  // Persisted article state from store
  const storedSections = useAppStore((state) => state.articleSections);
  const storedNarrativePlan = useAppStore((state) => state.narrativePlan);
  const storedQualityReport = useAppStore((state) => state.qualityReport);
  const storedIsGenerating = useAppStore((state) => state.isGeneratingArticle);
  const storedPhase = useAppStore((state) => state.articleGenerationPhase);
  
  // Store setters
  const setStoredSections = useAppStore((state) => state.setArticleSections);
  const setStoredNarrativePlan = useAppStore((state) => state.setNarrativePlan);
  const setStoredQualityReport = useAppStore((state) => state.setQualityReport);
  const setStoredIsGenerating = useAppStore((state) => state.setIsGeneratingArticle);
  const setStoredPhase = useAppStore((state) => state.setArticleGenerationPhase);
  const resetArticleGeneration = useAppStore((state) => state.resetArticleGeneration);

  const bike1Name = comparison?.bike1 || '';
  const bike2Name = comparison?.bike2 || '';

  // Local UI state (not persisted)
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const totalWordCount = storedSections.reduce((sum, s) => sum + s.wordCount, 0);
  const targetWordCount = 4000;
  const progress = (totalWordCount / targetWordCount) * 100;

  // Check if article generation is complete
  const isGenerationComplete = storedSections.length > 0 && 
    storedSections.every(s => s.status === 'complete') && 
    !storedIsGenerating;

  // Auto-start generation only if no sections exist and not already generating
  useEffect(() => {
    if (!storedIsGenerating && storedSections.length === 0 && insights && personas && verdicts) {
      startGeneration();
    }
  }, []);

  const startGeneration = useCallback(async () => {
    setStoredIsGenerating(true);
    setError(null);
    setStoredSections([]);
    setStoredNarrativePlan(null);
    setStoredQualityReport(null);
    setStoredPhase(0);
    setStatusMessage('Connecting to AI...');

    try {
      const response = await fetch('/api/generate/article/streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bike1Name,
          bike2Name,
          insights,
          personas,
          verdicts,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start article generation');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let currentSections: ArticleSection[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                setError(data.message);
                setStoredIsGenerating(false);
                return;
              }

              // Phase 1: Narrative Planning
              if (data.phase === 1) {
                setStoredPhase(1);
                if (data.status === 'planning') {
                  setStatusMessage(data.message);
                } else if (data.status === 'complete') {
                  setStoredNarrativePlan(data.narrativePlan);
                  setStatusMessage('Narrative plan created!');
                }
              }

              // Phase 2: Section Generation
              if (data.phase === 2) {
                setStoredPhase(2);
                if (data.status === 'started') {
                  setStatusMessage(data.message);
                } else if (data.section) {
                  if (data.status === 'generating') {
                    setStatusMessage(`Writing: ${data.focusArea || data.section}...`);
                    // Add placeholder section
                    const exists = currentSections.find(s => s.id === data.section);
                    if (!exists) {
                      currentSections = [
                        ...currentSections,
                        {
                          id: data.section,
                          title: data.focusArea || data.section,
                          content: '',
                          wordCount: 0,
                          status: 'generating',
                        },
                      ];
                      setStoredSections(currentSections);
                    }
                  } else if (data.status === 'complete') {
                    // Update section with content
                    currentSections = currentSections.map(s =>
                      s.id === data.section
                        ? {
                            ...s,
                            content: data.content,
                            wordCount: data.wordCount,
                            status: 'complete' as const,
                          }
                        : s
                    );
                    setStoredSections(currentSections);
                  }
                }
              }

              // Phase 3: Coherence & Quality
              if (data.phase === 3) {
                setStoredPhase(3);
                if (data.status === 'polishing') {
                  setStatusMessage(data.message);
                } else if (data.status === 'complete') {
                  setStoredSections(data.sections);
                  setStoredQualityReport(data.qualityReport);
                  setStatusMessage('Article complete!');
                  setStoredIsGenerating(false);
                  setStoredPhase(4); // Mark as fully complete
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Article generation error:', err);
      setError(err.message);
      setStoredIsGenerating(false);
    }
  }, [bike1Name, bike2Name, insights, personas, verdicts, setStoredSections, setStoredNarrativePlan, setStoredQualityReport, setStoredIsGenerating, setStoredPhase]);

  const handleRegenerate = () => {
    resetArticleGeneration();
    setError(null);
    setStatusMessage('');
    // Start generation after a brief delay to allow state to update
    setTimeout(() => startGeneration(), 100);
  };

  const handleNext = () => {
    markStepComplete(6);
    setCurrentStep(7);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Article Generation</h2>
        <p className="text-slate-600">
          Writing a {targetWordCount}-word comparison article with storytelling elements
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Generation Failed</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <Button onClick={handleRegenerate} className="mt-4" variant="outline">
              Retry Generation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phase indicator */}
      {storedIsGenerating && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  storedPhase >= 1 ? 'bg-green-500 text-white' : 'bg-slate-200'
                }`}>
                  {storedPhase > 1 ? <Check className="h-4 w-4" /> : '1'}
                </div>
                <span className={storedPhase === 1 ? 'font-semibold' : ''}>
                  Narrative Planning
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  storedPhase >= 2 ? 'bg-green-500 text-white' : 'bg-slate-200'
                }`}>
                  {storedPhase > 2 ? <Check className="h-4 w-4" /> : '2'}
                </div>
                <span className={storedPhase === 2 ? 'font-semibold' : ''}>
                  Section Generation
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  storedPhase >= 3 ? 'bg-green-500 text-white' : 'bg-slate-200'
                }`}>
                  {storedPhase === 3 ? <Loader2 className="h-4 w-4 animate-spin" /> : '3'}
                </div>
                <span className={storedPhase === 3 ? 'font-semibold' : ''}>
                  Coherence & Polish
                </span>
              </div>
            </div>
            {statusMessage && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{statusMessage}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Overall progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-bold">{totalWordCount.toLocaleString()} / {targetWordCount.toLocaleString()}</p>
              <p className="text-sm text-slate-600">words written</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-blue-600">
                {Math.round(progress)}%
              </p>
              <p className="text-sm text-slate-600">complete</p>
            </div>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-3" />
        </CardContent>
      </Card>

      {/* Narrative Plan Summary */}
      {storedNarrativePlan && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Narrative Plan</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Story Angle:</span>{' '}
                <span className="text-slate-600">{storedNarrativePlan.story_angle}</span>
              </div>
              <div>
                <span className="font-medium">Hook Strategy:</span>{' '}
                <span className="text-slate-600">{storedNarrativePlan.hook_strategy}</span>
              </div>
              <div>
                <span className="font-medium">Focus Areas:</span>{' '}
                <span className="text-slate-600">{storedNarrativePlan.matrix_focus_areas.join(', ')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Section list */}
      <div className="space-y-3">
        {storedSections.map((section) => (
          <Card key={section.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      section.status === 'complete'
                        ? 'bg-green-500 text-white'
                        : section.status === 'generating'
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {section.status === 'complete' ? (
                      <Check className="h-4 w-4" />
                    ) : section.status === 'generating' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold">{section.title}</h4>
                    {section.status === 'generating' && (
                      <p className="text-sm text-blue-600 mt-0.5">Writing...</p>
                    )}
                    {section.status === 'complete' && (
                      <p className="text-sm text-slate-600 mt-0.5">
                        {section.wordCount} words
                      </p>
                    )}
                  </div>
                </div>
                
                {section.status === 'complete' && section.content && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {expandedSection === section.id ? 'Hide' : 'View'}
                  </Button>
                )}
              </div>
              
              {section.status === 'generating' && (
                <Progress value={50} className="h-1 mt-3" />
              )}

              {expandedSection === section.id && section.content && (
                <div className="mt-4 pt-4 border-t">
                  <div className="prose prose-sm max-w-none">
                    {section.content.split('\n').map((paragraph, i) => (
                      <p key={i} className="mb-3 text-slate-700">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quality Report */}
      {storedQualityReport && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Quality Check</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Word Count:</span>{' '}
                <span className={storedQualityReport.wordCount.inRange ? 'text-green-600' : 'text-amber-600'}>
                  {storedQualityReport.wordCount.inRange ? '✓ In range' : '⚠ Out of range'}
                </span>
              </div>
              <div>
                <span className="font-medium">Quotes:</span>{' '}
                <span className={storedQualityReport.quoteCount.hasEnough ? 'text-green-600' : 'text-amber-600'}>
                  {storedQualityReport.quoteCount.total} {storedQualityReport.quoteCount.hasEnough ? '✓' : '⚠'}
                </span>
              </div>
              <div>
                <span className="font-medium">Balance:</span>{' '}
                <span className={storedQualityReport.balanceCheck.isBalanced ? 'text-green-600' : 'text-amber-600'}>
                  {storedQualityReport.balanceCheck.isBalanced ? '✓ Balanced' : '⚠ Unbalanced'}
                </span>
              </div>
              <div>
                <span className="font-medium">Banned Phrases:</span>{' '}
                <span className={storedQualityReport.bannedPhrases.found.length === 0 ? 'text-green-600' : 'text-red-600'}>
                  {storedQualityReport.bannedPhrases.found.length === 0 ? '✓ None' : `✗ ${storedQualityReport.bannedPhrases.found.length} found`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Actions */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setCurrentStep(5)}
          className="gap-2"
          disabled={storedIsGenerating}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex gap-2">
          {!storedIsGenerating && storedSections.length === 0 && (
            <Button onClick={startGeneration} size="lg" variant="outline">
              Start Generation
            </Button>
          )}
          {isGenerationComplete && (
            <>
              <Button onClick={handleRegenerate} size="lg" variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
              <Button onClick={handleNext} size="lg" className="gap-2">
                Polish Article
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
