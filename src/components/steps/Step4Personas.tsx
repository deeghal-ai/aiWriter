'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, Users } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { mockPersonas } from '@/lib/mockData';

export function Step4Personas() {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const markStepComplete = useAppStore((state) => state.markStepComplete);
  const setPersonas = useAppStore((state) => state.setPersonas);
  
  const personas = mockPersonas;
  
  const handleNext = () => {
    setPersonas(personas);
    markStepComplete(4);
    setCurrentStep(5);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Identified Rider Personas</h2>
        <p className="text-slate-600">
          Based on 43 owner profiles analyzed
        </p>
      </div>
      
      <div className="space-y-6">
        {personas.map((persona, idx) => (
          <Card key={persona.id} className="overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2" />
            
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <CardTitle>Persona {idx + 1}: {persona.title}</CardTitle>
                    <Badge variant="secondary">{persona.percentage}% of owners</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Sample size: {persona.sampleSize} owners
                  </p>
                </div>
                <Users className="h-8 w-8 text-slate-300" />
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Riding pattern */}
              <div>
                <h4 className="font-semibold mb-3">Riding Pattern</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>City Commute</span>
                    <span className="font-medium">{persona.pattern.cityCommute}%</span>
                  </div>
                  <Progress value={persona.pattern.cityCommute} className="h-2" />
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Highway</span>
                    <span className="font-medium">{persona.pattern.highway}%</span>
                  </div>
                  <Progress value={persona.pattern.highway} className="h-2" />
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Leisure/Social</span>
                    <span className="font-medium">{persona.pattern.leisure}%</span>
                  </div>
                  <Progress value={persona.pattern.leisure} className="h-2" />
                  
                  {persona.pattern.offroad > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span>Off-road</span>
                        <span className="font-medium">{persona.pattern.offroad}%</span>
                      </div>
                      <Progress value={persona.pattern.offroad} className="h-2" />
                    </>
                  )}
                </div>
              </div>
              
              {/* Demographics */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Age Range</p>
                  <p className="font-medium">{persona.demographics.ageRange}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Location</p>
                  <p className="font-medium">{persona.demographics.location}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Occupation</p>
                  <p className="font-medium">{persona.demographics.occupation}</p>
                </div>
              </div>
              
              {/* Priorities */}
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Top Priorities</h4>
                <div className="flex flex-wrap gap-2">
                  {persona.priorities.map((priority) => (
                    <Badge key={priority} variant="outline">
                      {priority}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Key quote */}
              <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-sm italic text-slate-700">&quot;{persona.quote}&quot;</p>
                <p className="text-xs text-slate-500 mt-2">
                  — Representative owner quote
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Actions */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setCurrentStep(3)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <Button onClick={handleNext} size="lg" className="gap-2">
          Generate Verdicts
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

