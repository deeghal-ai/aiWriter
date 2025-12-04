'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, Bike, Youtube, MessageSquare, Database, Sparkles, Clock, Zap } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function Step1Input() {
  const comparison = useAppStore((state) => state.comparison);
  const setComparison = useAppStore((state) => state.setComparison);
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const markStepComplete = useAppStore((state) => state.markStepComplete);
  
  const [bike1, setBike1] = useState('');
  const [bike2, setBike2] = useState('');
  const [sources, setSources] = useState({
    xbhp: false, teamBhp: false, reddit: false, youtube: true, instagram: false, internal: false
  });
  
  useEffect(() => {
    if (comparison) {
      setBike1(comparison.bike1 || '');
      setBike2(comparison.bike2 || '');
      if (comparison.researchSources) setSources(comparison.researchSources);
    }
  }, [comparison]);
  
  const handleSubmit = () => {
    setComparison({ bike1, bike2, researchSources: sources });
    markStepComplete(1);
    setCurrentStep(2);
  };
  
  const isValid = bike1.trim() && bike2.trim();

  const sourceOptions = [
    { id: 'youtube', label: 'YouTube Reviews', desc: 'Video comments', icon: Youtube, recommended: true, color: 'text-red-500' },
    { id: 'reddit', label: 'Reddit r/IndianBikes', desc: 'Forum posts', icon: MessageSquare, recommended: true, color: 'text-orange-500' },
    { id: 'internal', label: 'BikeDekho Reviews', desc: 'Verified owners', icon: Database, badge: 'Premium', color: 'text-violet-500' }
  ];
  
  return (
    <div className="max-w-xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Bike className="w-4 h-4 text-primary" />
          </div>
          <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Step 1</span>
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Enter Comparison Bikes</h2>
        <p className="text-xs text-muted-foreground">
          Enter two bikes to compare. We&apos;ll research forums and communities.
        </p>
      </div>
      
      {/* Form Card */}
      <Card className="shadow-soft">
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-secondary/20">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Bike Details
          </CardTitle>
          <CardDescription className="text-[11px]">
            Enter exact model names (e.g., &quot;TVS Apache RTX 300&quot;)
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-4 space-y-4">
          {/* Bike inputs */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-foreground/70 mb-1 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">1</span>
                First Bike
              </label>
              <Input
                placeholder="e.g., TVS Apache RTX 300"
                value={bike1}
                onChange={(e) => setBike1(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[9px] font-semibold text-muted-foreground/40 uppercase">vs</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            
            <div>
              <label className="text-[11px] font-medium text-foreground/70 mb-1 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-[hsl(85,25%,45%)]/10 text-[hsl(85,25%,40%)] text-[9px] font-bold flex items-center justify-center">2</span>
                Second Bike
              </label>
              <Input
                placeholder="e.g., Royal Enfield Scram 440"
                value={bike2}
                onChange={(e) => setBike2(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          
          {/* Research sources */}
          <div className="pt-3 border-t border-border/50">
            <h3 className="text-xs font-medium text-foreground mb-1">Research Sources</h3>
            <p className="text-[10px] text-muted-foreground mb-2">Select forums to search</p>
            
            <div className="space-y-1.5">
              {sourceOptions.map((source) => {
                const Icon = source.icon;
                const isChecked = sources[source.id as keyof typeof sources];
                
                return (
                  <label 
                    key={source.id} 
                    htmlFor={source.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      isChecked ? 'bg-primary/5 border-primary/25' : 'bg-white border-border/60 hover:border-border'
                    }`}
                  >
                    <Checkbox
                      id={source.id}
                      checked={isChecked}
                      onCheckedChange={(checked) => setSources(prev => ({ ...prev, [source.id]: checked as boolean }))}
                      className="h-3.5 w-3.5"
                    />
                    <div className={`p-1 rounded bg-secondary/60 ${source.color}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-foreground">{source.label}</span>
                        {source.recommended && !source.badge && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded">Rec</span>
                        )}
                        {source.badge && (
                          <span className="text-[9px] bg-violet-100 text-violet-600 px-1 py-0.5 rounded">{source.badge}</span>
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground">{source.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            
            <div className="mt-2 p-1.5 rounded bg-primary/5 border border-primary/15">
              <p className="text-[9px] text-primary/70 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Multiple sources = richer insights
              </p>
            </div>
          </div>
        </CardContent>
        
        {/* Footer */}
        <div className="px-4 py-2 bg-secondary/20 border-t border-border/50 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3 text-primary/60" />
            Est. time: {sources.youtube && sources.reddit ? '2-4 min' : '1-2 min'}
          </p>
          <Button onClick={handleSubmit} disabled={!isValid} size="sm" className="h-7 px-3 text-xs gap-1.5">
            Start Research
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
