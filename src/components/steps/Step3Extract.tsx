'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  Loader2, 
  CheckCircle2,
  AlertCircle 
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { InsightExtractionResult } from '@/lib/types';

export function Step3Extract() {
  const comparison = useAppStore((state) => state.comparison);
  const scrapedData = useAppStore((state) => state.scrapedData);
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const markStepComplete = useAppStore((state) => state.markStepComplete);
  const setInsights = useAppStore((state) => state.setInsights);
  const storedInsights = useAppStore((state) => state.insights);
  
  const [selectedBike, setSelectedBike] = useState<'bike1' | 'bike2'>('bike1');
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedInsights, setExtractedInsights] = useState<InsightExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [useSonnet, setUseSonnet] = useState(true); // Use Sonnet by default for better quality
  
  // Check for existing insights or auto-start extraction when component mounts
  useEffect(() => {
    if (!hasInitialized) {
      if (storedInsights) {
        // Restore existing insights
        setExtractedInsights(storedInsights);
        setHasStarted(true);
        setProgress(100);
      } else if (comparison && (scrapedData.reddit || scrapedData.youtube) && !hasStarted) {
        // Only start extraction if no existing insights
        setHasStarted(true);
        startExtraction();
      }
      setHasInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized, storedInsights, comparison, scrapedData.reddit, scrapedData.youtube, hasStarted]);
  
  const startExtraction = async () => {
    if (!comparison || (!scrapedData.reddit && !scrapedData.youtube)) {
      setError("Missing scraped data. Please complete Step 2 first.");
      return;
    }
    
    setIsExtracting(true);
    setError(null);
    setProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 5, 90));
    }, 1000);
    
    try {
      // Use Sonnet endpoint for better quality, or regular endpoint for speed
      const endpoint = useSonnet ? '/api/extract/insights-sonnet' : '/api/extract/insights';
      console.log(`[Extract] Using ${useSonnet ? 'Sonnet (quality)' : 'Haiku (speed)'} model`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bike1Name: comparison.bike1,
          bike2Name: comparison.bike2,
          redditData: scrapedData.reddit,
          youtubeData: scrapedData.youtube,
          xbhpData: scrapedData.xbhp
        })
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Extraction failed');
      }
      
      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to extract insights');
      }
      
      // Success! Clear any previous errors and set progress to 100%
      setProgress(100);
      setExtractedInsights(result.data);
      setInsights(result.data);
      setError(null); // Clear error last to ensure clean state
      
    } catch (err: any) {
      console.error('Extraction error:', err);
      // Only show error if we don't already have successful data
      if (!extractedInsights) {
        setError(err.message || 'Failed to extract insights');
      }
      clearInterval(progressInterval);
      setProgress(0);
    } finally {
      setIsExtracting(false);
    }
  };
  
  const handleNext = () => {
    if (extractedInsights) {
      markStepComplete(3);
      setCurrentStep(4);
    }
  };
  
  const currentBikeInsights = extractedInsights 
    ? extractedInsights[selectedBike]
    : null;
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Extracting Owner Insights</h2>
        <p className="text-slate-600">
          AI analysis powered by Claude
        </p>
      </div>
      
      {/* Model Selection - only show before extraction starts or when re-extracting */}
      {!extractedInsights && !isExtracting && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-900">Choose Extraction Quality</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUseSonnet(true)}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    useSonnet 
                      ? 'border-blue-600 bg-blue-100' 
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-lg">Sonnet (Quality)</div>
                  <div className="text-sm mt-1">
                    • 8-10 praise categories<br />
                    • 6-8 complaint categories<br />
                    • 40+ quotes<br />
                    • Highly specific insights<br />
                    • ~20 seconds
                  </div>
                  {useSonnet && <Badge className="mt-2 bg-blue-600">Recommended</Badge>}
                </button>
                
                <button
                  onClick={() => setUseSonnet(false)}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    !useSonnet 
                      ? 'border-blue-600 bg-blue-100' 
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-lg">Haiku (Speed)</div>
                  <div className="text-sm mt-1">
                    • 5 praise categories<br />
                    • 5 complaint categories<br />
                    • 13 quotes<br />
                    • Generic insights<br />
                    • ~14 seconds
                  </div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Extraction Status */}
      {isExtracting && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div>
                  <p className="font-medium">
                    Analyzing forum data with Claude {useSonnet ? 'Sonnet' : 'Haiku'}...
                  </p>
                  <p className="text-sm text-slate-600">
                    {useSonnet 
                      ? 'Extracting comprehensive insights with high specificity (~20s)' 
                      : 'Quick extraction for basic insights (~14s)'
                    }
                  </p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Error State - only show if extraction failed and we don't have results */}
      {error && !extractedInsights && !isExtracting && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Extraction Failed</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <Button 
                  onClick={startExtraction}
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
      {extractedInsights && !isExtracting && (
        <>
          {/* Summary Stats */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="font-medium text-green-900">Analysis Complete</p>
                </div>
                <Badge variant="outline">
                  {useSonnet ? 'Sonnet Quality' : 'Haiku Speed'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold">
                    {extractedInsights.metadata.total_praises}
                  </p>
                  <p className="text-sm text-slate-600">praise categories</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold">
                    {extractedInsights.metadata.total_complaints}
                  </p>
                  <p className="text-sm text-slate-600">complaint categories</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold">
                    {extractedInsights.metadata.total_quotes}
                  </p>
                  <p className="text-sm text-slate-600">owner quotes</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 mt-3">
                Processed in {(extractedInsights.metadata.processing_time_ms / 1000).toFixed(1)}s
              </p>
            </CardContent>
          </Card>
          
          {/* Restart button */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Extraction Complete</h3>
                  <p className="text-sm text-slate-600">
                    Want to re-analyze with fresh insights? Click to restart extraction.
                  </p>
                </div>
                <Button onClick={startExtraction} variant="outline" className="gap-2" disabled={isExtracting}>
                  <RefreshCw className="h-4 w-4" />
                  Restart Extraction
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Bike Tabs */}
          <Tabs value={selectedBike} onValueChange={(v) => setSelectedBike(v as any)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="bike1">{comparison?.bike1}</TabsTrigger>
              <TabsTrigger value="bike2">{comparison?.bike2}</TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedBike}>
              {currentBikeInsights && (
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
                              <h4 className="font-semibold">{praise.category}</h4>
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
                              <h4 className="font-semibold">{complaint.category}</h4>
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
                  
                  {/* Surprising Insights */}
                  {currentBikeInsights.surprising_insights && 
                   currentBikeInsights.surprising_insights.length > 0 && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle>Surprising Insights</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {currentBikeInsights.surprising_insights.map((insight, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-blue-600 font-bold">•</span>
                              <span className="text-slate-700">
                                {typeof insight === 'string' 
                                  ? insight 
                                  : (insight as any).insight || (insight as any).description || JSON.stringify(insight)
                                }
                              </span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
      
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
        
        <Button
          onClick={handleNext}
          disabled={!extractedInsights}
          size="lg"
          className="gap-2"
        >
          Build Personas
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
