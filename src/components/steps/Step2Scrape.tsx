'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface ScrapingStatus {
  source: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
  message?: string;
  data?: any;
  stats?: {
    posts?: number;
    comments?: number;
    threads?: number;
  };
}

export function Step2Scrape() {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const markStepComplete = useAppStore((state) => state.markStepComplete);
  const comparison = useAppStore((state) => state.comparison);
  const setScrapedData = useAppStore((state) => state.setScrapedData);
  
  const [statuses, setStatuses] = useState<ScrapingStatus[]>([
    { source: 'Reddit r/IndianBikes', status: 'pending' },
    { source: 'xBhp Forums', status: 'pending' }
  ]);
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    if (comparison) {
      startScraping();
    }
  }, []);
  
  const updateStatus = (source: string, update: Partial<ScrapingStatus>) => {
    setStatuses(prev => 
      prev.map(s => s.source === source ? { ...s, ...update } : s)
    );
  };
  
  const scrapeReddit = async () => {
    if (!comparison) return;
    
    updateStatus('Reddit r/IndianBikes', { status: 'in-progress' });
    
    try {
      const response = await fetch('/api/scrape/reddit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bike1: comparison.bike1,
          bike2: comparison.bike2
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      updateStatus('Reddit r/IndianBikes', {
        status: 'complete',
        data: result.data,
        stats: {
          posts: result.data.metadata.total_posts,
          comments: result.data.metadata.total_comments
        }
      });
      
      setScrapedData('reddit', result.data);
      
    } catch (error) {
      console.error('Reddit scraping error:', error);
      updateStatus('Reddit r/IndianBikes', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
  const scrapeXbhp = async () => {
    if (!comparison) return;
    
    updateStatus('xBhp Forums', { status: 'in-progress' });
    
    try {
      const response = await fetch('/api/scrape/xbhp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bike1: comparison.bike1,
          bike2: comparison.bike2
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      updateStatus('xBhp Forums', {
        status: 'complete',
        data: result.data,
        stats: {
          threads: result.data.metadata.total_threads,
          posts: result.data.metadata.total_posts
        }
      });
      
      setScrapedData('xbhp', result.data);
      
    } catch (error) {
      console.error('xBhp scraping error:', error);
      updateStatus('xBhp Forums', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
  const startScraping = async () => {
    // Scrape both sources in parallel
    await Promise.all([
      scrapeReddit(),
      scrapeXbhp()
    ]);
    
    // Check if at least one source completed successfully
    setStatuses(prev => {
      const hasSuccess = prev.some(s => s.status === 'complete');
      if (hasSuccess) {
        setIsComplete(true);
      }
      return prev;
    });
  };
  
  const retryScraping = () => {
    setStatuses([
      { source: 'Reddit r/IndianBikes', status: 'pending' },
      { source: 'xBhp Forums', status: 'pending' }
    ]);
    setIsComplete(false);
    startScraping();
  };
  
  const handleNext = () => {
    markStepComplete(2);
    setCurrentStep(3);
  };
  
  const allComplete = statuses.every(s => s.status === 'complete' || s.status === 'error');
  const anySuccess = statuses.some(s => s.status === 'complete');
  const anyInProgress = statuses.some(s => s.status === 'in-progress');
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Scraping Forum Threads</h2>
        <p className="text-slate-600">
          Collecting owner experiences from multiple sources
        </p>
      </div>
      
      {/* Overall progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {anyInProgress && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <p className="font-medium">Scraping in progress...</p>
              </div>
              <Progress value={undefined} className="h-2" />
              <p className="text-sm text-slate-600">
                This may take 1-2 minutes. Both sources are being scraped in parallel.
              </p>
            </div>
          )}
          
          {allComplete && anySuccess && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-600">
                <Check className="h-5 w-5" />
                <p className="font-medium">Scraping complete!</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold">
                    {statuses.reduce((sum, s) => sum + (s.stats?.posts || 0), 0)}
                  </p>
                  <p className="text-sm text-slate-600">total posts</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold">
                    {statuses.reduce((sum, s) => sum + (s.stats?.comments || 0), 0)}
                  </p>
                  <p className="text-sm text-slate-600">comments</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold">
                    {statuses.filter(s => s.status === 'complete').length}/{statuses.length}
                  </p>
                  <p className="text-sm text-slate-600">sources</p>
                </div>
              </div>
            </div>
          )}
          
          {allComplete && !anySuccess && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">All scraping failed</p>
              </div>
              <p className="text-sm text-slate-600">
                Please check your internet connection and try again
              </p>
              <Button onClick={retryScraping} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry Scraping
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Individual source status */}
      <div className="space-y-4">
        {statuses.map((status) => (
          <Card key={status.source}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {status.status === 'in-progress' && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  )}
                  {status.status === 'complete' && (
                    <Check className="h-5 w-5 text-green-600" />
                  )}
                  {status.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  {status.status === 'pending' && (
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                  )}
                  
                  <div>
                    <p className="font-semibold">{status.source}</p>
                    {status.status === 'in-progress' && (
                      <p className="text-sm text-slate-600">Scraping...</p>
                    )}
                    {status.status === 'error' && (
                      <p className="text-sm text-red-600">{status.message}</p>
                    )}
                  </div>
                </div>
                
                {status.status === 'complete' && (
                  <Badge variant="outline" className="gap-1">
                    <Check className="h-3 w-3" />
                    Complete
                  </Badge>
                )}
              </div>
              
              {status.status === 'complete' && status.stats && (
                <div className="flex gap-4 text-sm text-slate-600 mt-2">
                  {status.stats.posts && (
                    <span>{status.stats.posts} posts</span>
                  )}
                  {status.stats.comments && (
                    <span>{status.stats.comments} comments</span>
                  )}
                  {status.stats.threads && (
                    <span>{status.stats.threads} threads</span>
                  )}
                </div>
              )}
              
              {status.status === 'in-progress' && (
                <Progress value={undefined} className="h-1 mt-3" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Results preview */}
      {isComplete && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Preview of Scraped Data</h3>
            
            <div className="space-y-4">
              {statuses.map((status) => {
                if (status.status !== 'complete' || !status.data) return null;
                
                const bike1Data = status.data.bike1;
                const bike2Data = status.data.bike2;
                
                return (
                  <div key={status.source} className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">{status.source}</p>
                    
                    {/* Bike 1 sample */}
                    {bike1Data && (bike1Data.posts?.length > 0 || bike1Data.threads?.length > 0) && (
                      <div className="bg-slate-50 p-3 rounded text-sm">
                        <p className="font-medium mb-1">{comparison?.bike1}</p>
                        {bike1Data.posts && bike1Data.posts[0] && (
                          <p className="text-xs text-slate-600">{bike1Data.posts[0].title}</p>
                        )}
                        {bike1Data.threads && bike1Data.threads[0] && (
                          <p className="text-xs text-slate-600">{bike1Data.threads[0].title}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Bike 2 sample */}
                    {bike2Data && (bike2Data.posts?.length > 0 || bike2Data.threads?.length > 0) && (
                      <div className="bg-slate-50 p-3 rounded text-sm">
                        <p className="font-medium mb-1">{comparison?.bike2}</p>
                        {bike2Data.posts && bike2Data.posts[0] && (
                          <p className="text-xs text-slate-600">{bike2Data.posts[0].title}</p>
                        )}
                        {bike2Data.threads && bike2Data.threads[0] && (
                          <p className="text-xs text-slate-600">{bike2Data.threads[0].title}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Actions */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setCurrentStep(1)}
        >
          Back to Input
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={!isComplete}
          size="lg"
          className="gap-2"
        >
          Continue to Extraction
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
