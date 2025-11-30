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
  AlertCircle,
  Zap,
  Crown,
  Star
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getModelOptions, getDefaultModel, type ModelOption } from '@/lib/ai/models/registry';
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
  
  // Model selection - use registry to get default and available models
  const modelOptions = getModelOptions('extraction');
  const defaultModel = getDefaultModel('extraction');
  const [selectedModelId, setSelectedModelId] = useState<string>(defaultModel?.id || 'claude-sonnet-4');
  
  // Check for existing insights when component mounts
  // NOTE: We no longer auto-start - let user select model first
  useEffect(() => {
    if (!hasInitialized) {
      if (storedInsights) {
        // Restore existing insights from previous session
        setExtractedInsights(storedInsights);
        setHasStarted(true);
        setProgress(100);
      }
      // No auto-start - show model selector and let user click "Start Extraction"
      setHasInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized, storedInsights]);
  
  // Handle restart - clears insights to show model selector again
  const handleRestart = () => {
    setExtractedInsights(null);
    setProgress(0);
    setHasStarted(false);
    setError(null);
    setInsights(null); // Clear store insights too
    // Model selector will now show because extractedInsights is null
  };
  
  const startExtraction = async () => {
    if (!comparison || (!scrapedData.reddit && !scrapedData.youtube)) {
      setError("Missing scraped data. Please complete Step 2 first.");
      return;
    }
    
    setIsExtracting(true);
    setError(null);
    setProgress(0);
    
    // Get selected model info for logging
    const selectedModel = modelOptions.find(m => m.id === selectedModelId);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 5, 90));
    }, 1000);
    
    try {
      // Use unified endpoint - handles ALL models (Haiku, Sonnet, Opus)
      const endpoint = '/api/extract/insights';
      
      console.log(`[Extract] Using model: ${selectedModel?.name || selectedModelId}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bike1Name: comparison.bike1,
          bike2Name: comparison.bike2,
          redditData: scrapedData.reddit,
          youtubeData: scrapedData.youtube,
          xbhpData: scrapedData.xbhp,
          modelId: selectedModelId  // Routes to appropriate extraction method
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
              <h3 className="font-semibold text-blue-900">Select AI Model</h3>
              <div className="grid gap-3">
                {modelOptions.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModelId(model.id)}
                    className={`p-4 rounded-lg border-2 text-left transition ${
                      selectedModelId === model.id
                        ? 'border-blue-600 bg-blue-100'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-lg">{model.name}</div>
                      {model.badge && (
                        <Badge 
                          variant={
                            model.badge === 'recommended' ? 'default' :
                            model.badge === 'fast' ? 'secondary' :
                            model.badge === 'premium' ? 'destructive' : 'outline'
                          }
                          className="flex items-center gap-1"
                        >
                          {model.badge === 'fast' && <Zap className="w-3 h-3" />}
                          {model.badge === 'premium' && <Crown className="w-3 h-3" />}
                          {model.badge === 'recommended' && <Star className="w-3 h-3" />}
                          {model.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {model.speed === 'fast' ? '⚡ Fast' : model.speed === 'medium' ? '⏱️ Medium' : '🐢 Thorough'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {model.quality === 'standard' ? '📝 Standard' : model.quality === 'high' ? '✨ High' : '👑 Premium'}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
              
              <Button 
                onClick={startExtraction} 
                className="w-full mt-4"
                disabled={isExtracting}
              >
                Start Extraction
              </Button>
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
                    Analyzing forum data with {modelOptions.find(m => m.id === selectedModelId)?.name || 'Claude'}...
                  </p>
                  <p className="text-sm text-slate-600">
                    {modelOptions.find(m => m.id === selectedModelId)?.quality === 'standard'
                      ? 'Quick extraction for basic insights (~14s)' 
                      : modelOptions.find(m => m.id === selectedModelId)?.quality === 'premium'
                      ? 'Premium extraction with maximum detail (~30s)'
                      : 'Extracting comprehensive insights with high specificity (~20s)'
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
                  {modelOptions.find(m => m.id === selectedModelId)?.name || 'Claude'}
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
                    Re-analyze with a different model?
                  </p>
                </div>
                <Button onClick={handleRestart} variant="outline" className="gap-2" disabled={isExtracting}>
                  <RefreshCw className="h-4 w-4" />
                  Change Model & Re-extract
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
