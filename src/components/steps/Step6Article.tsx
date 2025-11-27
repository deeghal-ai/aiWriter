'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, FileText, Loader2, Check, AlertCircle, Eye } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useState, useEffect } from 'react';
import { ArticleSection, NarrativePlan, QualityReport } from '@/lib/types';

export function Step6Article() {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const markStepComplete = useAppStore((state) => state.markStepComplete);
  const setArticleSections = useAppStore((state) => state.setArticleSections);
  const comparison = useAppStore((state) => state.comparison);
  const insights = useAppStore((state) => state.insights);
  const personas = useAppStore((state) => state.personas);
  const verdicts = useAppStore((state) => state.verdicts);

  const bike1Name = comparison?.bike1 || '';
  const bike2Name = comparison?.bike2 || '';

  const [sections, setSections] = useState<ArticleSection[]>([]);
  const [narrativePlan, setNarrativePlan] = useState<NarrativePlan | null>(null);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const totalWordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);
  const targetWordCount = 4000;
  const progress = (totalWordCount / targetWordCount) * 100;

  // Auto-start generation when component mounts
  useEffect(() => {
    if (!isGenerating && sections.length === 0 && insights && personas && verdicts) {
      startGeneration();
    }
  }, []);

  const startGeneration = async () => {
    setIsGenerating(true);
    setError(null);
    setSections([]);
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.error) {
              setError(data.message);
              setIsGenerating(false);
              return;
            }

            // Phase 1: Narrative Planning
            if (data.phase === 1) {
              setCurrentPhase(1);
              if (data.status === 'planning') {
                setStatusMessage(data.message);
              } else if (data.status === 'complete') {
                setNarrativePlan(data.narrativePlan);
                setStatusMessage('Narrative plan created!');
              }
            }

            // Phase 2: Section Generation
            if (data.phase === 2) {
              setCurrentPhase(2);
              if (data.status === 'started') {
                setStatusMessage(data.message);
              } else if (data.section) {
                if (data.status === 'generating') {
                  setStatusMessage(`Writing: ${data.focusArea || data.section}...`);
                  // Add placeholder section
                  setSections(prev => {
                    const exists = prev.find(s => s.id === data.section);
                    if (exists) return prev;
                    return [
                      ...prev,
                      {
                        id: data.section,
                        title: data.focusArea || data.section,
                        content: '',
                        wordCount: 0,
                        status: 'generating',
                      },
                    ];
                  });
                } else if (data.status === 'complete') {
                  // Update section with content
                  setSections(prev =>
                    prev.map(s =>
                      s.id === data.section
                        ? {
                            ...s,
                            content: data.content,
                            wordCount: data.wordCount,
                            status: 'complete',
                          }
                        : s
                    )
                  );
                }
              }
            }

            // Phase 3: Coherence & Quality
            if (data.phase === 3) {
              setCurrentPhase(3);
              if (data.status === 'polishing') {
                setStatusMessage(data.message);
              } else if (data.status === 'complete') {
                setSections(data.sections);
                setQualityReport(data.qualityReport);
                setStatusMessage('Article complete!');
                setIsGenerating(false);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Article generation error:', err);
      setError(err.message);
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    setArticleSections(sections);
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
            <Button onClick={startGeneration} className="mt-4" variant="outline">
              Retry Generation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phase indicator */}
      {isGenerating && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  currentPhase >= 1 ? 'bg-green-500 text-white' : 'bg-slate-200'
                }`}>
                  {currentPhase > 1 ? <Check className="h-4 w-4" /> : '1'}
                </div>
                <span className={currentPhase === 1 ? 'font-semibold' : ''}>
                  Narrative Planning
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  currentPhase >= 2 ? 'bg-green-500 text-white' : 'bg-slate-200'
                }`}>
                  {currentPhase > 2 ? <Check className="h-4 w-4" /> : '2'}
                </div>
                <span className={currentPhase === 2 ? 'font-semibold' : ''}>
                  Section Generation
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  currentPhase >= 3 ? 'bg-green-500 text-white' : 'bg-slate-200'
                }`}>
                  {currentPhase === 3 ? <Loader2 className="h-4 w-4 animate-spin" /> : '3'}
                </div>
                <span className={currentPhase === 3 ? 'font-semibold' : ''}>
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
      {narrativePlan && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Narrative Plan</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Story Angle:</span>{' '}
                <span className="text-slate-600">{narrativePlan.story_angle}</span>
              </div>
              <div>
                <span className="font-medium">Hook Strategy:</span>{' '}
                <span className="text-slate-600">{narrativePlan.hook_strategy}</span>
              </div>
              <div>
                <span className="font-medium">Focus Areas:</span>{' '}
                <span className="text-slate-600">{narrativePlan.matrix_focus_areas.join(', ')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Section list */}
      <div className="space-y-3">
        {sections.map((section) => (
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
      {qualityReport && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Quality Check</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Word Count:</span>{' '}
                <span className={qualityReport.wordCount.inRange ? 'text-green-600' : 'text-amber-600'}>
                  {qualityReport.wordCount.inRange ? '✓ In range' : '⚠ Out of range'}
                </span>
              </div>
              <div>
                <span className="font-medium">Quotes:</span>{' '}
                <span className={qualityReport.quoteCount.hasEnough ? 'text-green-600' : 'text-amber-600'}>
                  {qualityReport.quoteCount.total} {qualityReport.quoteCount.hasEnough ? '✓' : '⚠'}
                </span>
              </div>
              <div>
                <span className="font-medium">Balance:</span>{' '}
                <span className={qualityReport.balanceCheck.isBalanced ? 'text-green-600' : 'text-amber-600'}>
                  {qualityReport.balanceCheck.isBalanced ? '✓ Balanced' : '⚠ Unbalanced'}
                </span>
              </div>
              <div>
                <span className="font-medium">Banned Phrases:</span>{' '}
                <span className={qualityReport.bannedPhrases.found.length === 0 ? 'text-green-600' : 'text-red-600'}>
                  {qualityReport.bannedPhrases.found.length === 0 ? '✓ None' : `✗ ${qualityReport.bannedPhrases.found.length} found`}
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
          disabled={isGenerating}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex gap-2">
          {!isGenerating && sections.length === 0 && (
            <Button onClick={startGeneration} size="lg" variant="outline">
              Start Generation
            </Button>
          )}
          {!isGenerating && sections.length > 0 && (
            <Button onClick={handleNext} size="lg" className="gap-2">
              Polish Article
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

