'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { mockVerdicts, mockPersonas } from '@/lib/mockData';

export function Step5Verdicts() {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const markStepComplete = useAppStore((state) => state.markStepComplete);
  const setVerdicts = useAppStore((state) => state.setVerdicts);
  
  const verdicts = mockVerdicts;
  const personas = mockPersonas;
  
  const handleNext = () => {
    setVerdicts(verdicts);
    markStepComplete(5);
    setCurrentStep(6);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Generating Verdicts</h2>
        <p className="text-slate-600">
          AI-powered recommendations based on persona analysis
        </p>
      </div>
      
      <div className="space-y-6">
        {verdicts.map((verdict) => {
          const persona = personas.find((p) => p.id === verdict.personaId);
          if (!persona) return null;
          
          return (
            <Card key={verdict.personaId} className="overflow-hidden">
              <div
                className={verdict.confidence >= 80 ? 'bg-green-500 h-2' : 'bg-yellow-500 h-2'}
              />
              
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>For: {persona.title}</CardTitle>
                  <Badge
                    variant={verdict.confidence >= 80 ? 'default' : 'secondary'}
                    className="text-lg px-3 py-1"
                  >
                    {verdict.confidence}% confidence
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Recommendation */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">
                      Recommended: {verdict.recommendedBike}
                    </h4>
                  </div>
                  <Progress value={verdict.confidence} className="h-2 mt-2" />
                </div>
                
                {/* Reasoning */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Why it&apos;s clear
                  </h4>
                  <ul className="space-y-2">
                    {verdict.reasoning.map((reason, idx) => (
                      <li key={idx} className="flex gap-2 text-sm">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Against reasons */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    The {100 - verdict.confidence}% case against
                  </h4>
                  <ul className="space-y-2">
                    {verdict.againstReasons.map((reason, idx) => (
                      <li key={idx} className="flex gap-2 text-sm">
                        <span className="text-orange-600 font-bold">✗</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Evidence */}
                <div className="pt-4 border-t bg-slate-50 -mx-6 -mb-6 px-6 py-4">
                  <h4 className="font-semibold mb-2 text-sm">Evidence</h4>
                  <ul className="space-y-1">
                    {verdict.evidence.map((item, idx) => (
                      <li key={idx} className="text-sm text-slate-600">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Actions */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setCurrentStep(4)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <Button onClick={handleNext} size="lg" className="gap-2">
          Write Article
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

