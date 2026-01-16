'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Copy, 
  Check, 
  ArrowLeft,
  Star,
  ThumbsUp,
  ThumbsDown,
  Trophy,
  Users,
  Timer,
  DollarSign,
  Settings,
  FileJson,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Share2,
  Loader2,
  Link as LinkIcon
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { SingleVehiclePageContent } from '@/lib/types';

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  hasPlaceholder?: boolean;
}

function SectionCard({ title, icon, children, hasPlaceholder }: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <Card className={`mb-4 ${hasPlaceholder ? 'border-amber-200 bg-amber-50/50' : ''}`}>
      <CardHeader 
        className="cursor-pointer hover:bg-slate-50 transition-colors py-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
            {hasPlaceholder && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Placeholder
              </Badge>
            )}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

export function SingleContentView() {
  const singleVehicleContent = useAppStore((state) => state.singleVehicleContent);
  const singleVehicle = useAppStore((state) => state.singleVehicle);
  const singleVehicleId = useAppStore((state) => state.singleVehicleId);
  const setSingleVehicleCurrentStep = useAppStore((state) => state.setSingleVehicleCurrentStep);
  
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Share functionality state
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Debug: Log the content structure
  useEffect(() => {
    if (singleVehicleContent) {
      console.log('[SingleContentView] Content received:', {
        hasSegmentScorecard: !!singleVehicleContent.segmentScorecard,
        segmentScorecard: singleVehicleContent.segmentScorecard,
        categoriesType: typeof singleVehicleContent.segmentScorecard?.categories,
        categoriesIsArray: Array.isArray(singleVehicleContent.segmentScorecard?.categories),
        categoriesLength: singleVehicleContent.segmentScorecard?.categories?.length,
        allKeys: Object.keys(singleVehicleContent)
      });
    }
  }, [singleVehicleContent]);

  if (!singleVehicleContent) {
    return (
      <div className="max-w-3xl mx-auto text-center py-8">
        <h3 className="text-xl font-semibold mb-2">No Content Generated</h3>
        <p className="text-slate-600 mb-4">Please go back to generate content first.</p>
        <Button onClick={() => setSingleVehicleCurrentStep(4)}>
          Go to Generation
        </Button>
      </div>
    );
  }

  const content = singleVehicleContent;

  const handleCopyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content.vehicle.make.toLowerCase()}_${content.vehicle.model.toLowerCase()}_page_content.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!singleVehicleId) {
      setShareError('Please save the research first to generate a share link');
      return;
    }

    setIsSharing(true);
    setShareError(null);

    try {
      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchId: singleVehicleId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate share link');
      }

      setShareUrl(result.shareUrl);
      
      // Auto-copy to clipboard
      await navigator.clipboard.writeText(result.shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch (err: any) {
      console.error('Share error:', err);
      setShareError(err.message || 'Failed to generate share link');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyShareUrl = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              {content.vehicle.make} {content.vehicle.model} Content
            </h2>
            <p className="text-slate-600">
              Generated page content ready for export
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCopyJson} variant="outline" size="sm" className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy JSON'}
            </Button>
            <Button onClick={handleDownloadJson} size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        {/* Share Section */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Share this content</span>
            </div>
            {!shareUrl ? (
              <Button 
                onClick={handleShare} 
                variant="outline" 
                size="sm" 
                className="gap-2"
                disabled={isSharing || !singleVehicleId}
              >
                {isSharing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4" />
                    Generate Link
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white px-2 py-1 rounded border border-slate-200 max-w-[200px] truncate">
                  {shareUrl}
                </code>
                <Button 
                  onClick={handleCopyShareUrl} 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                >
                  {shareCopied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          {shareError && (
            <p className="text-xs text-red-600 mt-2">{shareError}</p>
          )}
          {!singleVehicleId && (
            <p className="text-xs text-amber-600 mt-2">Save your research first to enable sharing</p>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">All Sections</TabsTrigger>
          <TabsTrigger value="json">JSON Preview</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {/* Vehicle Info */}
          <Card className="mb-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{content.vehicle?.year} {content.vehicle?.segment}</p>
                  <h3 className="text-2xl font-bold mt-1">
                    {content.vehicle?.make} {content.vehicle?.model}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-xl font-bold">{content.ownerPulse?.rating?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{content.ownerPulse?.totalReviews || 0} reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Decision */}
          {content.quickDecision && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Quick Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-lg mb-4 ${
                  content.quickDecision.verdict?.highlightType === 'positive' ? 'bg-green-50 border border-green-200' :
                  content.quickDecision.verdict?.highlightType === 'negative' ? 'bg-red-50 border border-red-200' :
                  'bg-slate-50 border border-slate-200'
                }`}>
                  <h4 className="font-semibold text-lg">{content.quickDecision.verdict?.headline || 'Verdict'}</h4>
                  <p className="text-slate-600 mt-1">{content.quickDecision.verdict?.summary || 'No summary available'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs font-medium text-green-700 mb-1">Perfect If</p>
                    <p className="text-sm text-green-900">{content.quickDecision.perfectIf || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs font-medium text-red-700 mb-1">Skip If</p>
                    <p className="text-sm text-red-900">{content.quickDecision.skipIf || 'N/A'}</p>
                  </div>
                </div>

                {content.quickDecision.idealFor && content.quickDecision.idealFor.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {content.quickDecision.idealFor.map((segment, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        {segment.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Owner Pulse */}
          {content.ownerPulse && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Owner Pulse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-700">Most Praised</span>
                    </div>
                    <div className="space-y-2">
                      {(content.ownerPulse.mostPraised || []).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{item.text}</span>
                        </div>
                      ))}
                      {(!content.ownerPulse.mostPraised || content.ownerPulse.mostPraised.length === 0) && (
                        <p className="text-sm text-slate-500">No data available</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-700">Most Criticized</span>
                    </div>
                    <div className="space-y-2">
                      {(content.ownerPulse.mostCriticized || []).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>{item.text}</span>
                        </div>
                      ))}
                      {(!content.ownerPulse.mostCriticized || content.ownerPulse.mostCriticized.length === 0) && (
                        <p className="text-sm text-slate-500">No data available</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Segment Scorecard */}
          {content.segmentScorecard && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Segment Scorecard
                  </CardTitle>
                  {content.segmentScorecard.badge && (
                    <Badge variant="secondary">{content.segmentScorecard.badge}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(content.segmentScorecard.categories || []).map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        <p className="text-xs text-slate-500">{(cat.highlights || []).slice(0, 2).join(' • ')}</p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant="outline" 
                          className={
                            cat.statusType === 'positive' ? 'border-green-300 text-green-700 bg-green-50' :
                            cat.statusType === 'negative' ? 'border-red-300 text-red-700 bg-red-50' :
                            'border-slate-300 text-slate-700'
                          }
                        >
                          {cat.rank}
                        </Badge>
                        <p className="text-xs mt-1 text-slate-500">{cat.status}</p>
                      </div>
                    </div>
                  ))}
                  {(!content.segmentScorecard.categories || content.segmentScorecard.categories.length === 0) && (
                    <p className="text-sm text-slate-500">No scorecard data available</p>
                  )}
                </div>
                {content.segmentScorecard.summary && (
                  <p className="text-sm text-slate-600 mt-4">{content.segmentScorecard.summary}</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <SectionCard 
            title="Quick Decision" 
            icon={<Star className="h-4 w-4 text-yellow-500" />}
          >
            <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto max-h-64">
              {JSON.stringify(content.quickDecision || {}, null, 2)}
            </pre>
          </SectionCard>

          {content.howMuchItReallyCosts && (
            <SectionCard 
              title="How Much It Really Costs" 
              icon={<DollarSign className="h-4 w-4 text-green-500" />}
              hasPlaceholder={(content.howMuchItReallyCosts as any)?._placeholder}
            >
              <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(content.howMuchItReallyCosts, null, 2)}
              </pre>
            </SectionCard>
          )}

          {content.variantOptions && (
            <SectionCard 
              title="Variant Options" 
              icon={<Settings className="h-4 w-4 text-blue-500" />}
              hasPlaceholder={(content.variantOptions as any)?._placeholder}
            >
              <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(content.variantOptions, null, 2)}
              </pre>
            </SectionCard>
          )}

          {content.segmentScorecard && (
            <SectionCard 
              title="Segment Scorecard" 
              icon={<Trophy className="h-4 w-4 text-amber-500" />}
            >
              <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(content.segmentScorecard, null, 2)}
              </pre>
            </SectionCard>
          )}

          <SectionCard 
            title="Main Competitors" 
            icon={<Users className="h-4 w-4 text-purple-500" />}
          >
            <div className="space-y-2 mb-3">
              {(content.mainCompetitors || []).map((comp, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div>
                    <span className="font-medium">{comp.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">{comp.tag}</Badge>
                  </div>
                  <span className="text-sm text-slate-500">{comp.priceRange}</span>
                </div>
              ))}
              {(!content.mainCompetitors || content.mainCompetitors.length === 0) && (
                <p className="text-sm text-slate-500">No competitor data available</p>
              )}
            </div>
          </SectionCard>

          {content.goodTimeToBuy && (
            <SectionCard 
              title="Good Time to Buy" 
              icon={<Timer className="h-4 w-4 text-teal-500" />}
              hasPlaceholder={(content.goodTimeToBuy as any)?._placeholder}
            >
              <div className={`p-3 rounded-lg mb-3 ${
                content.goodTimeToBuy.overallSignalType === 'positive' ? 'bg-green-50 border border-green-200' :
                content.goodTimeToBuy.overallSignalType === 'negative' ? 'bg-red-50 border border-red-200' :
                'bg-slate-50 border border-slate-200'
              }`}>
                <p className="font-semibold">{content.goodTimeToBuy.overallSignal || 'N/A'}</p>
                <p className="text-sm text-slate-600">{content.goodTimeToBuy.timingSignal?.reason || 'No timing data available'}</p>
              </div>
            </SectionCard>
          )}

          {content.ownerPulse && (
            <SectionCard 
              title="Owner Pulse" 
              icon={<ThumbsUp className="h-4 w-4 text-green-500" />}
            >
              <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(content.ownerPulse, null, 2)}
              </pre>
            </SectionCard>
          )}

          {content.dataSource && (
            <SectionCard 
              title="Data Source" 
              icon={<FileJson className="h-4 w-4 text-slate-500" />}
            >
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Sources</p>
                  <p className="font-medium">{(content.dataSource.sources || []).join(', ') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Total Videos</p>
                  <p className="font-medium">{content.dataSource.totalVideos || 0}</p>
                </div>
                <div>
                  <p className="text-slate-500">Total Comments</p>
                  <p className="font-medium">{content.dataSource.totalComments || 0}</p>
                </div>
                <div>
                  <p className="text-slate-500">Last Updated</p>
                  <p className="font-medium">{content.dataSource.lastUpdated || 'N/A'}</p>
                </div>
              </div>
            </SectionCard>
          )}
        </TabsContent>

        {/* JSON Tab */}
        <TabsContent value="json">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  Full JSON Output
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={handleCopyJson} variant="outline" size="sm" className="gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button onClick={handleDownloadJson} size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
              <CardDescription>
                Complete page content JSON ready for integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto max-h-[600px] font-mono">
                {JSON.stringify(content, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setSingleVehicleCurrentStep(4)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Generation
        </Button>

        <Button
          onClick={handleDownloadJson}
          size="lg"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export Content JSON
        </Button>
      </div>
    </div>
  );
}
