'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { mockInsights } from '@/lib/mockData';

export function Step3Extract() {
  const comparison = useAppStore((state) => state.comparison);
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const markStepComplete = useAppStore((state) => state.markStepComplete);
  const setInsights = useAppStore((state) => state.setInsights);
  
  const [selectedBike, setSelectedBike] = useState<'bike1' | 'bike2'>('bike1');
  
  const insights = mockInsights;
  const currentBikeInsights = insights[selectedBike];
  
  const handleNext = () => {
    setInsights(insights);
    markStepComplete(3);
    setCurrentStep(4);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Extracting Owner Insights</h2>
        <p className="text-slate-600">
          AI analysis of 1,247 comments complete
        </p>
      </div>
      
      {/* Bike selector */}
      <Tabs value={selectedBike} onValueChange={(v) => setSelectedBike(v as any)}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="bike1">{comparison?.bike1}</TabsTrigger>
          <TabsTrigger value="bike2">{comparison?.bike2}</TabsTrigger>
        </TabsList>
        
        <TabsContent value={selectedBike}>
          <div className="space-y-6">
            {/* Praises */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Top Praises</CardTitle>
                  <Badge variant="outline">
                    {currentBikeInsights.praises.length} categories
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentBikeInsights.praises.map((praise, idx) => (
                    <div key={idx} className="border-l-2 border-green-500 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{praise.text}</h4>
                        <Badge variant="secondary">{praise.frequency} mentions</Badge>
                      </div>
                      
                      {praise.quotes.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {praise.quotes.map((quote, qIdx) => (
                            <div key={qIdx} className="bg-slate-50 p-3 rounded text-sm">
                              <p className="italic text-slate-700">&quot;{quote.text}&quot;</p>
                              <p className="text-xs text-slate-500 mt-1">
                                — {quote.author}, {quote.source}
                              </p>
                            </div>
                          ))}
                          {praise.quotes.length < praise.frequency && (
                            <button className="text-xs text-blue-600 hover:underline">
                              Show {praise.frequency - praise.quotes.length} more quotes
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Complaints */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Top Complaints</CardTitle>
                  <Badge variant="outline">
                    {currentBikeInsights.complaints.length} categories
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentBikeInsights.complaints.map((complaint, idx) => (
                    <div key={idx} className="border-l-2 border-red-500 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{complaint.text}</h4>
                        <Badge variant="secondary">{complaint.frequency} mentions</Badge>
                      </div>
                      
                      {complaint.quotes.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {complaint.quotes.map((quote, qIdx) => (
                            <div key={qIdx} className="bg-slate-50 p-3 rounded text-sm">
                              <p className="italic text-slate-700">&quot;{quote.text}&quot;</p>
                              <p className="text-xs text-slate-500 mt-1">
                                — {quote.author}, {quote.source}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Surprising insights */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle>Surprising Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {currentBikeInsights.surprisingInsights.map((insight, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span className="text-slate-700">{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Actions */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setCurrentStep(2)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Re-run Extraction
          </Button>
          <Button onClick={handleNext} size="lg" className="gap-2">
            Build Personas
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

