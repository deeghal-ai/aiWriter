'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader2, Check, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
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
  const scrapedData = useAppStore((state) => state.scrapedData);
  
  const [statuses, setStatuses] = useState<ScrapingStatus[]>([
    { source: 'Reddit r/IndianBikes', status: 'pending' }
  ]);
  const [isComplete, setIsComplete] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (!hasInitialized) {
      // Check if we already have scraped data
      const existingRedditData = scrapedData.reddit;
      
      if (existingRedditData) {
        // Restore the completed state
        setStatuses([
          { 
            source: 'Reddit r/IndianBikes', 
            status: 'complete',
            data: existingRedditData,
            stats: {
              posts: existingRedditData.metadata?.total_posts || 0,
              comments: existingRedditData.metadata?.total_comments || 0
            }
          }
        ]);
        setIsComplete(true);
      } else if (comparison) {
        // Only start scraping if no existing data
        startScraping();
      }
      
      setHasInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized, scrapedData.reddit, comparison]);
  
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
  
  const startScraping = async () => {
    // Only scrape Reddit (removed xBhp dummy data)
    await scrapeReddit();
    
    // Check if scraping completed successfully
    setStatuses(prev => {
      const hasSuccess = prev.some(s => s.status === 'complete');
      if (hasSuccess) {
        setIsComplete(true);
      }
      return prev;
    });
  };
  
  const restartScraping = () => {
    setStatuses([
      { source: 'Reddit r/IndianBikes', status: 'pending' }
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
      
      {/* Restart button */}
      {isComplete && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Scraping Complete</h3>
                <p className="text-sm text-slate-600">
                  Want to scrape fresh data? Click the button to restart.
                </p>
              </div>
              <Button onClick={restartScraping} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Restart Scraping
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Results preview with expandable view */}
      {isComplete && <ScrapedDataView statuses={statuses} comparison={comparison} />}
      
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

// Component to display scraped data with expandable view
function ScrapedDataView({ 
  statuses, 
  comparison 
}: { 
  statuses: ScrapingStatus[];
  comparison: any;
}) {
  const [expandedBike1, setExpandedBike1] = useState<{ [key: string]: boolean }>({});
  const [expandedBike2, setExpandedBike2] = useState<{ [key: string]: boolean }>({});
  const [visiblePosts, setVisiblePosts] = useState<{ [key: string]: number }>({});
  const INITIAL_POSTS = 3;
  const LOAD_MORE_COUNT = 5;

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <h3 className="font-semibold mb-4">Scraped Data</h3>
        
        <div className="space-y-6">
          {statuses.map((status) => {
            if (status.status !== 'complete' || !status.data) return null;
            
            const bike1Data = status.data.bike1;
            const bike2Data = status.data.bike2;
            const sourceKey = status.source.replace(/\s+/g, '-');
            
            const bike1Posts = bike1Data?.posts || [];
            const bike2Posts = bike2Data?.posts || [];
            
            const bike1Visible = visiblePosts[`${sourceKey}-bike1`] || INITIAL_POSTS;
            const bike2Visible = visiblePosts[`${sourceKey}-bike2`] || INITIAL_POSTS;
            
            return (
              <div key={status.source} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Badge variant="outline">{status.source}</Badge>
                  <span className="text-sm text-slate-500">
                    {bike1Posts.length + bike2Posts.length} posts total
                  </span>
                </div>
                
                {/* Bike 1 Data */}
                {bike1Data && bike1Posts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-900">{comparison?.bike1}</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      {bike1Posts.length} posts found
                    </p>
                    
                    <div className="space-y-3">
                      {bike1Posts.slice(0, bike1Visible).map((post: any, idx: number) => {
                        const postKey = `${sourceKey}-bike1-${idx}`;
                        const isExpanded = expandedBike1[postKey];
                        
                        return (
                          <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200">
                            <div 
                              className="p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                              onClick={() => setExpandedBike1(prev => ({
                                ...prev,
                                [postKey]: !prev[postKey]
                              }))}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-slate-900 mb-1 line-clamp-2">
                                    {post.title}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {post.author} • {post.comments?.length || 0} comments
                                  </p>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="px-4 pb-4 space-y-3 border-t border-slate-200 pt-3 mt-2">
                                {post.selftext && (
                                  <div className="text-sm text-slate-700 bg-white p-3 rounded">
                                    <p className="font-medium text-xs text-slate-500 mb-2">POST CONTENT:</p>
                                    <p className="whitespace-pre-wrap">{post.selftext}</p>
                                  </div>
                                )}
                                
                                {post.comments && post.comments.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="font-medium text-xs text-slate-500">
                                      COMMENTS ({post.comments.length}):
                                    </p>
                                    {post.comments.map((comment: any, cIdx: number) => (
                                      <div key={cIdx} className="bg-white p-3 rounded text-sm border-l-2 border-blue-200">
                                        <p className="text-xs text-slate-500 mb-1">
                                          {comment.author} • {comment.score || 0} points
                                        </p>
                                        <p className="text-slate-700">{comment.body}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {bike1Posts.length > bike1Visible && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => setVisiblePosts(prev => ({
                          ...prev,
                          [`${sourceKey}-bike1`]: bike1Visible + LOAD_MORE_COUNT
                        }))}
                      >
                        Load More ({bike1Posts.length - bike1Visible} remaining)
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Bike 2 Data */}
                {bike2Data && bike2Posts.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="font-medium text-slate-900">{comparison?.bike2}</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      {bike2Posts.length} posts found
                    </p>
                    
                    <div className="space-y-3">
                      {bike2Posts.slice(0, bike2Visible).map((post: any, idx: number) => {
                        const postKey = `${sourceKey}-bike2-${idx}`;
                        const isExpanded = expandedBike2[postKey];
                        
                        return (
                          <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200">
                            <div 
                              className="p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                              onClick={() => setExpandedBike2(prev => ({
                                ...prev,
                                [postKey]: !prev[postKey]
                              }))}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-slate-900 mb-1 line-clamp-2">
                                    {post.title}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {post.author} • {post.comments?.length || 0} comments
                                  </p>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="px-4 pb-4 space-y-3 border-t border-slate-200 pt-3 mt-2">
                                {post.selftext && (
                                  <div className="text-sm text-slate-700 bg-white p-3 rounded">
                                    <p className="font-medium text-xs text-slate-500 mb-2">POST CONTENT:</p>
                                    <p className="whitespace-pre-wrap">{post.selftext}</p>
                                  </div>
                                )}
                                
                                {post.comments && post.comments.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="font-medium text-xs text-slate-500">
                                      COMMENTS ({post.comments.length}):
                                    </p>
                                    {post.comments.map((comment: any, cIdx: number) => (
                                      <div key={cIdx} className="bg-white p-3 rounded text-sm border-l-2 border-blue-200">
                                        <p className="text-xs text-slate-500 mb-1">
                                          {comment.author} • {comment.score || 0} points
                                        </p>
                                        <p className="text-slate-700">{comment.body}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {bike2Posts.length > bike2Visible && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => setVisiblePosts(prev => ({
                          ...prev,
                          [`${sourceKey}-bike2`]: bike2Visible + LOAD_MORE_COUNT
                        }))}
                      >
                        Load More ({bike2Posts.length - bike2Visible} remaining)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
