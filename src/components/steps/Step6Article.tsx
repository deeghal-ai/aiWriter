'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, FileText, Loader2, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { mockArticleSections } from '@/lib/mockData';

export function Step6Article() {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const markStepComplete = useAppStore((state) => state.markStepComplete);
  const setArticleSections = useAppStore((state) => state.setArticleSections);
  
  const sections = mockArticleSections;
  const totalWordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);
  const targetWordCount = 4000;
  const progress = (totalWordCount / targetWordCount) * 100;
  
  const handleNext = () => {
    setArticleSections(sections);
    markStepComplete(6);
    setCurrentStep(7);
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Writing Article Sections</h2>
        <p className="text-slate-600">
          AI is generating content following your template
        </p>
      </div>
      
      {/* Overall progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-bold">{totalWordCount} / {targetWordCount}</p>
              <p className="text-sm text-slate-600">words written</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-blue-600">
                {Math.round(progress)}%
              </p>
              <p className="text-sm text-slate-600">complete</p>
            </div>
          </div>
          <Progress value={progress} className="h-3" />
          
          <div className="flex items-center gap-2 mt-4 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Estimated time remaining: 2m 18s</span>
          </div>
        </CardContent>
      </Card>
      
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
                
                {section.status === 'complete' && (
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                )}
              </div>
              
              {section.status === 'generating' && (
                <Progress value={65} className="h-1 mt-3" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Actions */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setCurrentStep(5)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" size="lg">
            Pause Generation
          </Button>
          <Button onClick={handleNext} size="lg" className="gap-2">
            Polish Article
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

