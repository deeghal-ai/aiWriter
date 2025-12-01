'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { mockQualityChecks } from '@/lib/mockData';

export function Step7Polish() {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const markStepComplete = useAppStore((state) => state.markStepComplete);
  const setQualityChecks = useAppStore((state) => state.setQualityChecks);
  const saveComparison = useAppStore((state) => state.saveComparison);
  const storedQualityChecks = useAppStore((state) => state.qualityChecks);
  
  const checks = mockQualityChecks;
  
  // Mark step as complete if quality checks already exist (loaded from store)
  useEffect(() => {
    if (storedQualityChecks && storedQualityChecks.length > 0) {
      markStepComplete(7);
    }
  }, [storedQualityChecks, markStepComplete]);
  
  const handleNext = async () => {
    setQualityChecks(checks);
    markStepComplete(7);
    
    // Auto-save after quality checks
    try {
      await saveComparison();
      console.log('[Polish] Auto-saved after quality checks');
    } catch (saveError) {
      console.error('[Polish] Auto-save failed after quality checks:', saveError);
    }
    
    setCurrentStep(8);
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Polishing Article</h2>
        <p className="text-slate-600">
          Running quality checks and improvements
        </p>
      </div>
      
      <div className="space-y-4">
        {checks.map((check) => (
          <Card key={check.category}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{check.category}</CardTitle>
                {check.status === 'complete' && (
                  <Badge variant="outline" className="gap-1">
                    <Check className="h-3 w-3" />
                    Complete
                  </Badge>
                )}
                {check.status === 'checking' && (
                  <Badge variant="outline" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking...
                  </Badge>
                )}
                {check.status === 'pending' && (
                  <Badge variant="outline">Pending</Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Check items */}
              {check.items.length > 0 && (
                <div className="space-y-2">
                  {check.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {item.passed ? (
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
                      )}
                      <span className={item.passed ? 'text-slate-700' : 'text-orange-700'}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Issues */}
              {check.issues && check.issues.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-2">Issues Found</h4>
                  <div className="space-y-2">
                    {check.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg text-sm ${
                          issue.severity === 'error'
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-orange-50 border border-orange-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle
                            className={`h-4 w-4 ${
                              issue.severity === 'error' ? 'text-red-600' : 'text-orange-600'
                            }`}
                          />
                          <span className="font-medium capitalize">{issue.severity}</span>
                        </div>
                        <p className="text-slate-700">{issue.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Progress bar for in-progress checks */}
              {check.status === 'checking' && (
                <Progress value={67} className="h-2" />
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
          onClick={() => setCurrentStep(6)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" size="lg">
            Auto-Fix Issues
          </Button>
          <Button onClick={handleNext} size="lg" className="gap-2">
            Review Article
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

