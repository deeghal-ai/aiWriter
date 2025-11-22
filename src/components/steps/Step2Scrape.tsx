'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Pause, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { mockScrapingProgress } from '@/lib/mockData';

export function Step2Scrape() {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const markStepComplete = useAppStore((state) => state.markStepComplete);
  const setScrapingProgress = useAppStore((state) => state.setScrapingProgress);
  
  // In skeleton, use mock data
  const progress = mockScrapingProgress;
  
  const totalCompleted = progress.reduce((sum, p) => sum + p.completed, 0);
  const totalItems = progress.reduce((sum, p) => sum + p.total, 0);
  const overallProgress = (totalCompleted / totalItems) * 100;
  
  const handleNext = () => {
    setScrapingProgress(progress);
    markStepComplete(2);
    setCurrentStep(3);
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Scraping Forum Threads</h2>
        <p className="text-slate-600">
          Collecting owner experiences and feedback from multiple sources
        </p>
      </div>
      
      {/* Overall progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-bold">{totalCompleted}/{totalItems}</p>
              <p className="text-sm text-slate-600">sources scraped</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-blue-600">
                {Math.round(overallProgress)}%
              </p>
              <p className="text-sm text-slate-600">complete</p>
            </div>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </CardContent>
      </Card>
      
      {/* Individual sources */}
      <div className="space-y-4">
        {progress.map((source) => (
          <Card key={source.source}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{source.source}</h3>
                    {source.status === 'complete' && (
                      <Badge variant="outline" className="gap-1">
                        <Check className="h-3 w-3" />
                        Complete
                      </Badge>
                    )}
                    {source.status === 'in-progress' && (
                      <Badge variant="outline">In Progress</Badge>
                    )}
                  </div>
                  {source.currentThread && (
                    <p className="text-sm text-slate-600">
                      Current: &quot;{source.currentThread}&quot;
                    </p>
                  )}
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {source.completed}/{source.total}
                </span>
              </div>
              
              <Progress
                value={(source.completed / source.total) * 100}
                className="h-2"
              />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Summary */}
      <Card className="mt-6 bg-slate-50">
        <CardContent className="pt-6">
          <p className="text-sm text-slate-700">
            <strong>Total collected:</strong> 28 sources, 1,247 comments
          </p>
        </CardContent>
      </Card>
      
      {/* Actions */}
      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" size="lg" className="gap-2">
          <Pause className="h-4 w-4" />
          Pause
        </Button>
        
        <Button onClick={handleNext} size="lg" className="gap-2">
          Continue to Extraction
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

