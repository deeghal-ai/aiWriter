'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, Loader2, Check, AlertCircle, RefreshCw, Globe } from 'lucide-react';
import { useAppStore, useAutoSaveSingleVehicle } from '@/lib/store';
import type { SingleVehicleScrapingProgress, SingleVehicleCorpus } from '@/lib/types';

export function SingleStep2Scrape() {
  const singleVehicle = useAppStore((state) => state.singleVehicle);
  const setSingleVehicleCurrentStep = useAppStore((state) => state.setSingleVehicleCurrentStep);
  const markSingleVehicleStepComplete = useAppStore((state) => state.markSingleVehicleStepComplete);
  const setSingleVehicleScrapedData = useAppStore((state) => state.setSingleVehicleScrapedData);
  const singleVehicleScrapedData = useAppStore((state) => state.singleVehicleScrapedData);
  const setSingleVehicleCorpus = useAppStore((state) => state.setSingleVehicleCorpus);
  const singleVehicleCorpus = useAppStore((state) => state.singleVehicleCorpus);
  const singleVehicleCompletedSteps = useAppStore((state) => state.singleVehicleCompletedSteps);
  const autoSave = useAutoSaveSingleVehicle();
  
  // Check if step 2 is already completed (scraping was done before)
  const isStep2AlreadyCompleted = singleVehicleCompletedSteps.includes(2);
  
  // Check if we have existing corpus data
  const hasExistingCorpus = !!(singleVehicleCorpus && singleVehicleCorpus.metadata);
  
  // Build statuses from corpus if it exists
  const getStatusesFromCorpus = (): SingleVehicleScrapingProgress[] => {
    if (!singleVehicleCorpus) return [];
    
    const corpusStatuses: SingleVehicleScrapingProgress[] = [];
    
    if (singleVehicleCorpus.youtube) {
      corpusStatuses.push({
        source: 'YouTube Reviews',
        status: 'complete',
        stats: {
          videos: singleVehicleCorpus.youtube.total_videos || 0,
          comments: singleVehicleCorpus.youtube.total_comments || 0
        }
      });
    }
    
    if (singleVehicleCorpus.webSearch) {
      const totalResults = 
        (singleVehicleCorpus.webSearch.specs?.results?.length || 0) +
        (singleVehicleCorpus.webSearch.variants?.results?.length || 0) +
        (singleVehicleCorpus.webSearch.pricing?.results?.length || 0) +
        (singleVehicleCorpus.webSearch.lifecycle?.results?.length || 0) +
        (singleVehicleCorpus.webSearch.salesData?.results?.length || 0);
      corpusStatuses.push({
        source: 'Web Search',
        status: 'complete',
        stats: { searches: totalResults }
      });
    }
    
    if (singleVehicleCorpus.reddit) {
      corpusStatuses.push({
        source: 'Reddit r/IndianBikes',
        status: 'complete',
        stats: {
          posts: singleVehicleCorpus.reddit.posts?.length || 0,
          comments: singleVehicleCorpus.reddit.metadata?.total_comments || 0
        }
      });
    }
    
    if (singleVehicleCorpus.internal) {
      corpusStatuses.push({
        source: 'BikeDekho Reviews',
        status: 'complete',
        stats: {
          reviews: singleVehicleCorpus.internal.reviews?.length || 0
        }
      });
    }
    
    return corpusStatuses;
  };
  
  // Initialize statuses based on selected sources (for fresh scraping)
  const getInitialStatuses = (): SingleVehicleScrapingProgress[] => {
    const statuses: SingleVehicleScrapingProgress[] = [];
    if (singleVehicle?.researchSources?.youtube) {
      statuses.push({ source: 'YouTube Reviews', status: 'pending' });
    }
    if (singleVehicle?.researchSources?.webSearch) {
      statuses.push({ source: 'Web Search', status: 'pending' });
    }
    if (singleVehicle?.researchSources?.reddit) {
      statuses.push({ source: 'Reddit r/IndianBikes', status: 'pending' });
    }
    if (singleVehicle?.researchSources?.internal) {
      statuses.push({ source: 'BikeDekho Reviews', status: 'pending' });
    }
    // Default to YouTube if nothing selected
    if (statuses.length === 0) {
      statuses.push({ source: 'YouTube Reviews', status: 'pending' });
    }
    return statuses;
  };
  
  // Initialize with corpus statuses if available, otherwise pending statuses
  const [statuses, setStatuses] = useState<SingleVehicleScrapingProgress[]>(() => {
    if (hasExistingCorpus) {
      return getStatusesFromCorpus();
    }
    return getInitialStatuses();
  });
  
  // Start as complete if we have corpus or step is already done
  const [isComplete, setIsComplete] = useState(hasExistingCorpus || isStep2AlreadyCompleted);
  const hasStartedScraping = useRef(false);
  const isScrapingInProgress = useRef(false);
  
  // Effect to handle initialization - only start scraping if we have NO data
  useEffect(() => {
    if (!singleVehicle) return;
    
    // NEVER auto-scrape if:
    // 1. Step 2 is already marked as completed
    // 2. We have existing corpus data
    // 3. Scraping has already been started in this session
    if (isStep2AlreadyCompleted || hasExistingCorpus || hasStartedScraping.current) {
      // Just make sure UI shows complete state
      if (hasExistingCorpus && !isComplete) {
        const corpusStatuses = getStatusesFromCorpus();
        if (corpusStatuses.length > 0) {
          setStatuses(corpusStatuses);
          setIsComplete(true);
        }
      }
      return;
    }
    
    // Check for existing scraped data (in-memory from current session)
    const existingYouTube = singleVehicleScrapedData.youtube;
    const existingWebSearch = singleVehicleScrapedData.webSearch;
    const existingReddit = singleVehicleScrapedData.reddit;
    const existingInternal = singleVehicleScrapedData.internal;
    
    const restoredStatuses: SingleVehicleScrapingProgress[] = [];
    let hasExistingData = false;
    
    if (singleVehicle.researchSources?.youtube) {
      if (existingYouTube) {
        restoredStatuses.push({
          source: 'YouTube Reviews',
          status: 'complete',
          stats: {
            videos: existingYouTube.total_videos || 0,
            comments: existingYouTube.total_comments || 0
          }
        });
        hasExistingData = true;
      } else {
        restoredStatuses.push({ source: 'YouTube Reviews', status: 'pending' });
      }
    }
    
    if (singleVehicle.researchSources?.webSearch) {
      if (existingWebSearch) {
        const totalResults = 
          (existingWebSearch.specs?.results?.length || 0) +
          (existingWebSearch.variants?.results?.length || 0) +
          (existingWebSearch.pricing?.results?.length || 0) +
          (existingWebSearch.lifecycle?.results?.length || 0) +
          (existingWebSearch.salesData?.results?.length || 0);
        restoredStatuses.push({
          source: 'Web Search',
          status: 'complete',
          stats: { searches: totalResults }
        });
        hasExistingData = true;
      } else {
        restoredStatuses.push({ source: 'Web Search', status: 'pending' });
      }
    }
    
    if (singleVehicle.researchSources?.reddit) {
      if (existingReddit) {
        restoredStatuses.push({
          source: 'Reddit r/IndianBikes',
          status: 'complete',
          stats: {
            posts: existingReddit.metadata?.total_posts || 0,
            comments: existingReddit.metadata?.total_comments || 0
          }
        });
        hasExistingData = true;
      } else {
        restoredStatuses.push({ source: 'Reddit r/IndianBikes', status: 'pending' });
      }
    }
    
    if (singleVehicle.researchSources?.internal) {
      if (existingInternal) {
        restoredStatuses.push({
          source: 'BikeDekho Reviews',
          status: 'complete',
          stats: {
            reviews: existingInternal.reviews?.length || 0
          }
        });
        hasExistingData = true;
      } else {
        restoredStatuses.push({ source: 'BikeDekho Reviews', status: 'pending' });
      }
    }
    
    if (restoredStatuses.length === 0) {
      restoredStatuses.push({ source: 'YouTube Reviews', status: 'pending' });
    }
    
    setStatuses(restoredStatuses);
    
    const allComplete = restoredStatuses.every(s => s.status === 'complete');
    
    if (allComplete && hasExistingData) {
      setIsComplete(true);
    } else if (!hasExistingData) {
      // Mark that we've started scraping to prevent re-scraping on remount
      hasStartedScraping.current = true;
      startScraping();
    } else {
      const anyComplete = restoredStatuses.some(s => s.status === 'complete');
      if (anyComplete) {
        setIsComplete(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleVehicle]);
  
  useEffect(() => {
    if (isComplete) {
      markSingleVehicleStepComplete(2);
      // Only build corpus if we don't already have one (from database)
      // This prevents overwriting existing corpus with empty data
      if (!singleVehicleCorpus || !singleVehicleCorpus.metadata) {
        buildCorpus();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);
  
  const updateStatus = (source: string, update: Partial<SingleVehicleScrapingProgress>) => {
    setStatuses(prev => 
      prev.map(s => s.source === source ? { ...s, ...update } : s)
    );
  };
  
  const scrapeYouTube = async () => {
    if (!singleVehicle) return;
    
    updateStatus('YouTube Reviews', { status: 'in-progress' });
    
    try {
      const response = await fetch('/api/scrape/single/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle: singleVehicle.vehicle })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      updateStatus('YouTube Reviews', {
        status: 'complete',
        stats: {
          videos: result.data.total_videos,
          comments: result.data.total_comments
        }
      });
      
      setSingleVehicleScrapedData('youtube', result.data);
      
    } catch (error) {
      console.error('YouTube scraping error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      updateStatus('YouTube Reviews', {
        status: 'error',
        message: errorMessage.includes('quota') 
          ? 'YouTube API quota exceeded' 
          : errorMessage
      });
    }
  };
  
  const scrapeReddit = async () => {
    if (!singleVehicle) return;
    
    updateStatus('Reddit r/IndianBikes', { status: 'in-progress' });
    
    try {
      const response = await fetch('/api/scrape/single/reddit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle: singleVehicle.vehicle })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      const wasBlocked = result.warning || result.data.metadata.total_posts === 0;
      
      updateStatus('Reddit r/IndianBikes', {
        status: 'complete',
        stats: {
          posts: result.data.metadata.total_posts,
          comments: result.data.metadata.total_comments
        },
        message: wasBlocked ? 'Reddit blocked access (0 posts)' : undefined
      });
      
      setSingleVehicleScrapedData('reddit', result.data);
      
    } catch (error) {
      console.error('Reddit scraping error:', error);
      updateStatus('Reddit r/IndianBikes', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
  const scrapeInternal = async () => {
    if (!singleVehicle) return;
    
    updateStatus('BikeDekho Reviews', { status: 'in-progress' });
    
    try {
      const response = await fetch('/api/scrape/single/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle: singleVehicle.vehicle })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        if (result.configRequired) {
          throw new Error('BikeDekho API not configured');
        }
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      
      const totalReviews = result.data.reviews?.length || 0;
      const isMockData = result.data.metadata?.isMockData;
      
      updateStatus('BikeDekho Reviews', {
        status: 'complete',
        stats: { reviews: totalReviews },
        message: isMockData ? 'Using mock data' : undefined
      });
      
      setSingleVehicleScrapedData('internal', result.data);
      
    } catch (error) {
      console.error('Internal data fetch error:', error);
      updateStatus('BikeDekho Reviews', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
  const scrapeWebSearch = async () => {
    if (!singleVehicle) return;
    
    updateStatus('Web Search', { status: 'in-progress' });
    
    try {
      const response = await fetch('/api/scrape/single/websearch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle: singleVehicle.vehicle })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      
      const totalResults = result.metadata?.totalResults || 0;
      const isMockData = result.metadata?.isMockData;
      
      updateStatus('Web Search', {
        status: 'complete',
        stats: { searches: totalResults },
        message: isMockData ? 'Using mock data (no API key)' : undefined
      });
      
      setSingleVehicleScrapedData('webSearch', result.data);
      
    } catch (error) {
      console.error('Web search error:', error);
      updateStatus('Web Search', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
  const startScraping = async () => {
    if (isScrapingInProgress.current) return;
    isScrapingInProgress.current = true;
    
    const scrapingPromises: Promise<void>[] = [];
    
    if (singleVehicle?.researchSources?.youtube && !singleVehicleScrapedData.youtube) {
      scrapingPromises.push(scrapeYouTube());
    }
    
    if (singleVehicle?.researchSources?.webSearch && !singleVehicleScrapedData.webSearch) {
      scrapingPromises.push(scrapeWebSearch());
    }
    
    if (singleVehicle?.researchSources?.reddit && !singleVehicleScrapedData.reddit) {
      scrapingPromises.push(scrapeReddit());
    }
    
    if (singleVehicle?.researchSources?.internal && !singleVehicleScrapedData.internal) {
      scrapingPromises.push(scrapeInternal());
    }
    
    if (scrapingPromises.length === 0 && !singleVehicleScrapedData.youtube) {
      scrapingPromises.push(scrapeYouTube());
    }
    
    await Promise.all(scrapingPromises);
    
    isScrapingInProgress.current = false;
    
    setTimeout(() => {
      setStatuses(prev => {
        const hasSuccess = prev.some(s => s.status === 'complete');
        if (hasSuccess) {
          setIsComplete(true);
        }
        return prev;
      });
    }, 0);
  };
  
  const buildCorpus = () => {
    if (!singleVehicle) return;
    
    const sourcesUsed: string[] = [];
    let totalPosts = 0;
    let totalComments = 0;
    
    if (singleVehicleScrapedData.youtube) {
      sourcesUsed.push('YouTube');
      totalPosts += singleVehicleScrapedData.youtube.total_videos || 0;
      totalComments += singleVehicleScrapedData.youtube.total_comments || 0;
    }
    
    if (singleVehicleScrapedData.webSearch) {
      sourcesUsed.push('WebSearch');
    }
    
    if (singleVehicleScrapedData.reddit) {
      sourcesUsed.push('Reddit');
      totalPosts += singleVehicleScrapedData.reddit.metadata?.total_posts || 0;
      totalComments += singleVehicleScrapedData.reddit.metadata?.total_comments || 0;
    }
    
    if (singleVehicleScrapedData.internal) {
      sourcesUsed.push('Internal');
      totalPosts += singleVehicleScrapedData.internal.reviews?.length || 0;
    }
    
    const corpus: SingleVehicleCorpus = {
      youtube: singleVehicleScrapedData.youtube ? {
        vehicle: singleVehicle.vehicle,
        videos: singleVehicleScrapedData.youtube.videos || [],
        total_videos: singleVehicleScrapedData.youtube.total_videos || 0,
        total_comments: singleVehicleScrapedData.youtube.total_comments || 0
      } : undefined,
      webSearch: singleVehicleScrapedData.webSearch || undefined,
      reddit: singleVehicleScrapedData.reddit ? {
        vehicle: singleVehicle.vehicle,
        posts: singleVehicleScrapedData.reddit.posts || [],
        metadata: singleVehicleScrapedData.reddit.metadata
      } : undefined,
      internal: singleVehicleScrapedData.internal ? {
        vehicle: singleVehicle.vehicle,
        reviews: singleVehicleScrapedData.internal.reviews || [],
        expertInsights: singleVehicleScrapedData.internal.expertInsights,
        metadata: singleVehicleScrapedData.internal.metadata
      } : undefined,
      metadata: {
        vehicle: singleVehicle.vehicle,
        scrapedAt: new Date().toISOString(),
        totalPosts,
        totalComments,
        sourcesUsed
      }
    };
    
    setSingleVehicleCorpus(corpus);
    
    // Auto-save after corpus is built
    autoSave();
  };
  
  const restartScraping = () => {
    isScrapingInProgress.current = false;
    hasStartedScraping.current = false;
    
    const newStatuses = statuses.map(s => ({
      ...s,
      status: 'pending' as const,
      stats: undefined,
      message: undefined
    }));
    
    setStatuses(newStatuses);
    setIsComplete(false);
    
    statuses.forEach(s => {
      if (s.source === 'YouTube Reviews') {
        setSingleVehicleScrapedData('youtube', undefined);
      }
      if (s.source === 'Web Search') {
        setSingleVehicleScrapedData('webSearch', undefined);
      }
      if (s.source === 'Reddit r/IndianBikes') {
        setSingleVehicleScrapedData('reddit', undefined);
      }
      if (s.source === 'BikeDekho Reviews') {
        setSingleVehicleScrapedData('internal', undefined);
      }
    });
    
    setTimeout(() => {
      hasStartedScraping.current = true;
      startScraping();
    }, 100);
  };
  
  const handleNext = () => {
    markSingleVehicleStepComplete(2);
    setSingleVehicleCurrentStep(3);
  };
  
  const handleBack = () => {
    setSingleVehicleCurrentStep(1);
  };
  
  const allComplete = statuses.every(s => s.status === 'complete' || s.status === 'error');
  const anySuccess = statuses.some(s => s.status === 'complete');
  const anyInProgress = statuses.some(s => s.status === 'in-progress');
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-violet-50 rounded-full border border-violet-200/50 text-[10px] text-violet-700 font-medium mb-3">
          Step 2 of 3
        </div>
        <h2 className="text-2xl font-bold mb-1.5">
          Scraping Data for {singleVehicle?.vehicle}
        </h2>
        <p className="text-sm text-muted-foreground">
          Collecting owner experiences from {statuses.length > 1 ? 'multiple sources' : 'YouTube reviews'}
        </p>
      </div>
      
      {/* Overall progress */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          {anyInProgress && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                <p className="font-medium text-sm">Scraping in progress...</p>
              </div>
              <Progress value={undefined} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {statuses.length > 1 
                  ? 'Fetching data from multiple sources in parallel'
                  : 'Fetching videos and comments from YouTube'
                }
              </p>
            </div>
          )}
          
          {allComplete && anySuccess && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-emerald-600">
                <Check className="h-5 w-5" />
                <p className="font-medium text-sm">Scraping complete!</p>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold">
                    {statuses.reduce((sum, s) => sum + (s.stats?.videos || s.stats?.posts || s.stats?.reviews || 0), 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">total items</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold">
                    {statuses.reduce((sum, s) => sum + (s.stats?.comments || 0), 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">comments</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold">
                    {statuses.filter(s => s.status === 'complete').length}/{statuses.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">sources</p>
                </div>
              </div>
            </div>
          )}
          
          {allComplete && !anySuccess && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium text-sm">All scraping failed</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Please check your connection and try again
              </p>
              <Button onClick={restartScraping} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Individual source status */}
      <div className="space-y-3">
        {statuses.map((status) => (
          <Card key={status.source}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {status.status === 'in-progress' && (
                    <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                  )}
                  {status.status === 'complete' && (
                    <Check className="h-4 w-4 text-emerald-600" />
                  )}
                  {status.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  {status.status === 'pending' && (
                    <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                  )}
                  
                  <div>
                    <p className="font-medium text-sm">{status.source}</p>
                    {status.status === 'in-progress' && (
                      <p className="text-xs text-muted-foreground">Scraping...</p>
                    )}
                    {status.status === 'error' && (
                      <p className="text-xs text-red-600">{status.message}</p>
                    )}
                    {status.status === 'complete' && status.message && (
                      <p className="text-xs text-amber-600">{status.message}</p>
                    )}
                  </div>
                </div>
                
                {status.status === 'complete' && (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Check className="h-2.5 w-2.5" />
                    Complete
                  </Badge>
                )}
              </div>
              
              {status.status === 'complete' && status.stats && (
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {status.stats.videos !== undefined && (
                    <span>{status.stats.videos} videos</span>
                  )}
                  {status.stats.posts !== undefined && (
                    <span>{status.stats.posts} posts</span>
                  )}
                  {status.stats.reviews !== undefined && (
                    <span>{status.stats.reviews} reviews</span>
                  )}
                  {status.stats.comments !== undefined && (
                    <span>{status.stats.comments} comments</span>
                  )}
                  {status.stats.searches !== undefined && (
                    <span>{status.stats.searches} search results</span>
                  )}
                </div>
              )}
              
              {status.status === 'in-progress' && (
                <Progress value={undefined} className="h-1 mt-2" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Restart button */}
      {isComplete && (
        <Card className="mt-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm mb-0.5">Scraping Complete</p>
                <p className="text-xs text-muted-foreground">
                  Want fresh data? Click to restart.
                </p>
              </div>
              <Button onClick={restartScraping} variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Restart
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={!isComplete}
          size="sm"
          className="gap-1.5 bg-violet-600 hover:bg-violet-700"
        >
          View Corpus
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
