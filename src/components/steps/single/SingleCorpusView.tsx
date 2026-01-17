'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, ArrowRight, Download, Copy, Check, ChevronDown, ChevronUp, 
  Youtube, MessageSquare, Database, FileText, ExternalLink,
  Star, User, Clock, ThumbsUp, Sparkles, Globe, DollarSign, Car, Calendar, TrendingUp,
  AlertTriangle, RefreshCw
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function SingleCorpusView() {
  const singleVehicle = useAppStore((state) => state.singleVehicle);
  const singleVehicleCorpus = useAppStore((state) => state.singleVehicleCorpus);
  const setSingleVehicleCurrentStep = useAppStore((state) => state.setSingleVehicleCurrentStep);
  const resetSingleVehicleWorkflow = useAppStore((state) => state.resetSingleVehicleWorkflow);
  
  const [copied, setCopied] = useState(false);
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
  
  const handleBack = () => {
    // Go back to Input step since scraping is already complete
    // User can restart scraping from the Scrape step if needed
    setSingleVehicleCurrentStep(1);
  };
  
  const handleStartNew = () => {
    resetSingleVehicleWorkflow();
    setSingleVehicleCurrentStep(1);
  };
  
  const handleGenerateContent = () => {
    setSingleVehicleCurrentStep(4);
  };
  
  const toggleExpand = (key: string) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const handleCopyJson = async () => {
    if (!singleVehicleCorpus) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(singleVehicleCorpus, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const handleDownloadJson = () => {
    if (!singleVehicleCorpus) return;
    
    const blob = new Blob([JSON.stringify(singleVehicleCorpus, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${singleVehicle?.vehicle?.replace(/\s+/g, '_').toLowerCase()}_corpus.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Get generated content to check if we have it but corpus is empty
  const singleVehicleContent = useAppStore((state) => state.singleVehicleContent);
  const hasGeneratedContent = !!singleVehicleContent;
  
  if (!singleVehicleCorpus) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-muted-foreground">No corpus data available. Please complete the scraping step first.</p>
        <Button onClick={handleBack} variant="outline" className="mt-4">Go Back</Button>
      </div>
    );
  }
  
  const { youtube, webSearch, reddit, internal, metadata } = singleVehicleCorpus;
  
  // Check if corpus is essentially empty (no actual scraped data)
  const hasActualCorpusData = youtube || webSearch || reddit || internal;
  const isCorpusEmpty = !hasActualCorpusData || (metadata.totalPosts === 0 && metadata.sourcesUsed.length === 0);
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-200/50 text-[10px] text-emerald-700 font-medium mb-3">
          <Check className="w-3 h-3" />
          Corpus Ready
        </div>
        <h2 className="text-2xl font-bold mb-1.5">
          {singleVehicle?.vehicle} Data Corpus
        </h2>
        <p className="text-sm text-muted-foreground">
          Collected {metadata.totalPosts} items with {metadata.totalComments} comments from {metadata.sourcesUsed.length} sources
        </p>
      </div>
      
      {/* Validation Warnings */}
      {metadata.validation && !metadata.validation.isValid && (
        <Card className="mb-6 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-100 shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-amber-900 text-sm flex items-center gap-2">
                  Possible Corpus Mismatch Detected
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">
                    {metadata.validation.confidence}% match
                  </Badge>
                </h4>
                <ul className="mt-2 space-y-1">
                  {metadata.validation.warnings.map((warning, i) => (
                    <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
                {metadata.validation.unexpectedVehicles.length > 0 && (
                  <div className="mt-3 p-2 bg-white/50 rounded border border-amber-200">
                    <p className="text-[10px] text-amber-600 font-medium mb-1">Frequently mentioned vehicles:</p>
                    <div className="flex flex-wrap gap-1">
                      {metadata.validation.unexpectedVehicles.slice(0, 3).map((v) => (
                        <Badge key={v.name} variant="secondary" className="text-[10px] bg-amber-100 text-amber-800">
                          {v.name} ({v.mentionCount}x)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSingleVehicleCurrentStep(2)}
                    className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-100"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Re-scrape
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={handleGenerateContent}
                    className="gap-1.5 text-amber-600"
                  >
                    Continue Anyway
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Validation Success Badge (subtle) */}
      {metadata.validation && metadata.validation.isValid && (
        <div className="flex items-center gap-2 mb-4 text-emerald-600">
          <Check className="w-4 h-4" />
          <span className="text-xs">Corpus validation passed ({metadata.validation.confidence}% match for "{metadata.validation.modelName}")</span>
        </div>
      )}
      
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200/50">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-violet-700">{metadata.totalPosts}</p>
            <p className="text-[10px] text-violet-600">Total Items</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{metadata.totalComments}</p>
            <p className="text-[10px] text-blue-600">Comments</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{metadata.sourcesUsed.length}</p>
            <p className="text-[10px] text-emerald-600">Sources</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-amber-700">
              {new Date(metadata.scrapedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
            <p className="text-[10px] text-amber-600">Scraped</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Empty corpus but has generated content - show helpful message */}
      {isCorpusEmpty && hasGeneratedContent && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <FileText className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-amber-900 text-sm">Corpus Data Not Available</h4>
                <p className="text-xs text-amber-700 mt-1">
                  The original scraped data for this research is not available, but your generated content is still intact. 
                  You can view your generated content or re-scrape to get fresh data.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    onClick={handleGenerateContent}
                    className="gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    View Generated Content
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSingleVehicleCurrentStep(2)}
                    className="gap-1.5"
                  >
                    Re-scrape Data
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Data Tabs */}
      <Tabs defaultValue={metadata.sourcesUsed[0]?.toLowerCase() || 'youtube'} className="mb-6">
        <TabsList className="grid w-full grid-cols-4 h-9">
          {youtube && (
            <TabsTrigger value="youtube" className="text-xs gap-1.5">
              <Youtube className="w-3.5 h-3.5" />
              YouTube ({youtube.total_videos})
            </TabsTrigger>
          )}
          {webSearch && (
            <TabsTrigger value="websearch" className="text-xs gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Web Data
            </TabsTrigger>
          )}
          {reddit && (
            <TabsTrigger value="reddit" className="text-xs gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Reddit ({reddit.posts.length})
            </TabsTrigger>
          )}
          {internal && (
            <TabsTrigger value="internal" className="text-xs gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Internal ({internal.reviews.length})
            </TabsTrigger>
          )}
        </TabsList>
        
        {/* YouTube Tab */}
        {youtube && (
          <TabsContent value="youtube" className="mt-4 space-y-3">
            {youtube.videos.map((video, idx) => {
              const key = `youtube-${idx}`;
              const isExpanded = expandedItems[key];
              
              return (
                <Card key={idx}>
                  <CardContent className="py-4">
                    <div 
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => toggleExpand(key)}
                    >
                      <div className="bg-red-100 p-2 rounded-lg">
                        <Youtube className="w-4 h-4 text-red-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1 line-clamp-2">{video.title}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>{video.channelTitle}</span>
                          <span>•</span>
                          <span>{video.comments.length} comments</span>
                          {video.transcript && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0">Has Transcript</Badge>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <a 
                          href={`https://youtube.com/watch?v=${video.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        {video.description && (
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground mb-1">DESCRIPTION</p>
                            <p className="text-xs text-muted-foreground line-clamp-4">{video.description}</p>
                          </div>
                        )}
                        
                        {video.transcript && (
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground mb-1">TRANSCRIPT</p>
                            <p className="text-xs text-muted-foreground bg-slate-50 p-2 rounded line-clamp-6">{video.transcript}</p>
                          </div>
                        )}
                        
                        {video.comments.length > 0 && (
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground mb-2">TOP COMMENTS ({video.comments.length})</p>
                            <div className="space-y-2">
                              {video.comments.slice(0, 5).map((comment, cidx) => (
                                <div key={cidx} className="bg-slate-50 p-2 rounded text-xs">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{comment.author}</span>
                                    <span className="text-muted-foreground flex items-center gap-0.5">
                                      <ThumbsUp className="w-3 h-3" />
                                      {comment.likeCount}
                                    </span>
                                  </div>
                                  <p className="text-muted-foreground">{comment.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        )}
        
        {/* Web Search Tab */}
        {webSearch && (
          <TabsContent value="websearch" className="mt-4 space-y-4">
            {/* Specs Section */}
            {webSearch.specs && webSearch.specs.results.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-600" />
                    Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {webSearch.specs.results.map((result: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-xs mb-1">{result.title}</h4>
                        <a 
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.snippet}</p>
                      <Badge variant="outline" className="text-[9px] mt-2">{result.source}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Variants Section */}
            {webSearch.variants && webSearch.variants.results.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-violet-600" />
                    Variants
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {webSearch.variants.results.map((result: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-xs mb-1">{result.title}</h4>
                        <a 
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.snippet}</p>
                      <Badge variant="outline" className="text-[9px] mt-2">{result.source}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Pricing Section */}
            {webSearch.pricing && webSearch.pricing.results.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {webSearch.pricing.results.map((result: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-xs mb-1">{result.title}</h4>
                        <a 
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.snippet}</p>
                      <Badge variant="outline" className="text-[9px] mt-2">{result.source}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Lifecycle Section */}
            {webSearch.lifecycle && webSearch.lifecycle.results.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    Lifecycle & Updates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {webSearch.lifecycle.results.map((result: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-xs mb-1">{result.title}</h4>
                        <a 
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.snippet}</p>
                      <Badge variant="outline" className="text-[9px] mt-2">{result.source}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Sales Data Section */}
            {webSearch.salesData && webSearch.salesData.results.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-red-600" />
                    Sales Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {webSearch.salesData.results.map((result: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-xs mb-1">{result.title}</h4>
                        <a 
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.snippet}</p>
                      <Badge variant="outline" className="text-[9px] mt-2">{result.source}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Info note about web search */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Globe className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700">
                <span className="font-medium">Web search data</span> is used to populate variant options, pricing, and lifecycle information in the generated content. This provides accurate, up-to-date data beyond what&apos;s available in reviews and discussions.
              </div>
            </div>
          </TabsContent>
        )}
        
        {/* Reddit Tab */}
        {reddit && (
          <TabsContent value="reddit" className="mt-4 space-y-3">
            {reddit.posts.map((post, idx) => {
              const key = `reddit-${idx}`;
              const isExpanded = expandedItems[key];
              
              return (
                <Card key={idx}>
                  <CardContent className="py-4">
                    <div 
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => toggleExpand(key)}
                    >
                      <div className="bg-orange-100 p-2 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-orange-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1 line-clamp-2">{post.title}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>u/{post.author}</span>
                          <span>•</span>
                          <span>{post.score} points</span>
                          <span>•</span>
                          <span>{post.comments.length} comments</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <a 
                          href={`https://reddit.com${post.permalink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        {post.selftext && (
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground mb-1">POST CONTENT</p>
                            <p className="text-xs text-muted-foreground bg-slate-50 p-2 rounded">{post.selftext}</p>
                          </div>
                        )}
                        
                        {post.comments.length > 0 && (
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground mb-2">COMMENTS ({post.comments.length})</p>
                            <div className="space-y-2">
                              {post.comments.slice(0, 5).map((comment, cidx) => (
                                <div key={cidx} className="bg-slate-50 p-2 rounded text-xs border-l-2 border-orange-200">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">u/{comment.author}</span>
                                    <span className="text-muted-foreground">{comment.score} pts</span>
                                  </div>
                                  <p className="text-muted-foreground">{comment.body}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        )}
        
        {/* Internal Tab */}
        {internal && (
          <TabsContent value="internal" className="mt-4 space-y-3">
            {internal.reviews.map((review, idx) => {
              const key = `internal-${idx}`;
              const isExpanded = expandedItems[key];
              
              return (
                <Card key={idx}>
                  <CardContent className="py-4">
                    <div 
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => toggleExpand(key)}
                    >
                      <div className="bg-violet-100 p-2 rounded-lg">
                        <Database className="w-4 h-4 text-violet-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1 line-clamp-2">{review.title}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {review.author.name}
                          </span>
                          {review.author.isVerifiedOwner && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-600 border-emerald-200">
                              Verified
                            </Badge>
                          )}
                          {review.rating && (
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {review.rating}
                            </span>
                          )}
                          {review.author.ownershipDuration && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {review.author.ownershipDuration}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground mb-1">REVIEW</p>
                          <p className="text-xs text-muted-foreground">{review.content}</p>
                        </div>
                        
                        {(review.pros && review.pros.length > 0) || (review.cons && review.cons.length > 0) ? (
                          <div className="grid grid-cols-2 gap-4">
                            {review.pros && review.pros.length > 0 && (
                              <div>
                                <p className="text-[10px] font-medium text-emerald-600 mb-1">PROS</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  {review.pros.map((pro, pidx) => (
                                    <li key={pidx} className="flex items-start gap-1">
                                      <span className="text-emerald-500">✓</span>
                                      {pro}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {review.cons && review.cons.length > 0 && (
                              <div>
                                <p className="text-[10px] font-medium text-red-600 mb-1">CONS</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  {review.cons.map((con, cidx) => (
                                    <li key={cidx} className="flex items-start gap-1">
                                      <span className="text-red-500">✗</span>
                                      {con}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : null}
                        
                        {review.author.kmsDriven && (
                          <p className="text-[10px] text-muted-foreground">
                            📊 {review.author.kmsDriven.toLocaleString()} km driven
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Expert Insights */}
            {internal.expertInsights && internal.expertInsights.length > 0 && (
              <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-600" />
                    Expert Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {internal.expertInsights.map((insight, idx) => (
                      <div key={idx} className="bg-white/80 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[9px]">{insight.category}</Badge>
                          {insight.isPositive ? (
                            <span className="text-[9px] text-emerald-600">Positive</span>
                          ) : (
                            <span className="text-[9px] text-amber-600">Consideration</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{insight.insight}</p>
                        <p className="text-[10px] text-violet-600 mt-1">— {insight.author}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
      
      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyJson}
            className="gap-1.5"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy JSON'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJson}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Download Corpus
          </Button>
          
          <Button
            size="sm"
            onClick={handleGenerateContent}
            className="gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Content
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
