'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, Search, Youtube, MessageSquare, Database, Sparkles, Clock, Zap, Globe } from 'lucide-react';
import { useAppStore, useAutoSaveSingleVehicle } from '@/lib/store';

export function SingleStep1Input() {
  const singleVehicle = useAppStore((state) => state.singleVehicle);
  const setSingleVehicle = useAppStore((state) => state.setSingleVehicle);
  const setSingleVehicleCurrentStep = useAppStore((state) => state.setSingleVehicleCurrentStep);
  const markSingleVehicleStepComplete = useAppStore((state) => state.markSingleVehicleStepComplete);
  const autoSave = useAutoSaveSingleVehicle();
  
  const [vehicle, setVehicle] = useState('');
  const [sources, setSources] = useState({
    youtube: true,
    reddit: false,
    internal: false,
    webSearch: true
  });
  
  useEffect(() => {
    if (singleVehicle) {
      setVehicle(singleVehicle.vehicle || '');
      if (singleVehicle.researchSources) {
        // Ensure webSearch is included (for backward compatibility)
        setSources({
          ...singleVehicle.researchSources,
          webSearch: singleVehicle.researchSources.webSearch ?? true
        });
      }
    }
  }, [singleVehicle]);
  
  const handleSubmit = async () => {
    setSingleVehicle({ vehicle, researchSources: sources });
    markSingleVehicleStepComplete(1);
    
    // Auto-save after initial setup
    // Note: We need to wait a tick for the store to update before saving
    setTimeout(() => autoSave(), 100);
    
    setSingleVehicleCurrentStep(2);
  };
  
  const isValid = vehicle.trim().length > 0;

  const sourceOptions = [
    { id: 'youtube', label: 'YouTube Reviews', desc: 'Expert video reviews & transcripts', icon: Youtube, recommended: true, color: 'text-red-500' },
    { id: 'webSearch', label: 'Web Search', desc: 'Specs, variants, pricing, lifecycle data', icon: Globe, recommended: true, badge: 'New', color: 'text-blue-500' },
    { id: 'reddit', label: 'Reddit r/IndianBikes', desc: 'Forum discussions', icon: MessageSquare, color: 'text-orange-500' },
    { id: 'internal', label: 'BikeDekho Reviews', desc: 'Verified owner reviews', icon: Database, badge: 'Premium', color: 'text-violet-500' }
  ];
  
  return (
    <div className="max-w-xl mx-auto animate-fade-in-up">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-violet-50 rounded-full border border-violet-200/50 text-[10px] text-violet-700 font-medium mb-3">
          <Search className="w-3 h-3" />
          Single Vehicle Research
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1.5">Enter Vehicle Details</h2>
        <p className="text-sm text-muted-foreground">
          Build a comprehensive data corpus for model page content generation
        </p>
      </div>
      
      {/* Vehicle Input */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            Vehicle Name
          </CardTitle>
          <CardDescription className="text-xs">
            Enter the bike or car name as commonly searched (e.g., "Maruti Suzuki Grand Vitara", "Royal Enfield Hunter 350")
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="e.g., Maruti Suzuki Grand Vitara"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            className="h-11 text-base"
          />
          
          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {['Royal Enfield Hunter 350', 'TVS Apache RTR 160', 'Bajaj Pulsar N250', 'Maruti Suzuki Grand Vitara'].map(suggestion => (
              <button
                key={suggestion}
                onClick={() => setVehicle(suggestion)}
                className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Data Sources */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-violet-500" />
            Research Sources
          </CardTitle>
          <CardDescription className="text-xs">
            Select where to gather owner experiences and reviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {sourceOptions.map((source) => {
              const Icon = source.icon;
              const isSelected = sources[source.id as keyof typeof sources];
              
              return (
                <div 
                  key={source.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer
                    ${isSelected 
                      ? 'border-violet-200 bg-violet-50/50' 
                      : 'border-border hover:border-slate-300 bg-white'
                    }
                  `}
                  onClick={() => setSources(prev => ({
                    ...prev,
                    [source.id]: !prev[source.id as keyof typeof prev]
                  }))}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => 
                      setSources(prev => ({...prev, [source.id]: !!checked}))
                    }
                    className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                  />
                  
                  <div className={`p-1.5 rounded-md ${isSelected ? 'bg-violet-100' : 'bg-slate-100'}`}>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-violet-600' : source.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isSelected ? 'text-violet-900' : 'text-foreground'}`}>
                        {source.label}
                      </span>
                      {source.recommended && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                          Recommended
                        </span>
                      )}
                      {source.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded font-medium">
                          {source.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{source.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Time Estimate */}
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200/50 mb-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>Estimated time:</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-medium">
            {Object.values(sources).filter(Boolean).length <= 2 ? '1-2 min' : 
             Object.values(sources).filter(Boolean).length === 3 ? '2-3 min' : '3-5 min'}
          </span>
        </div>
      </div>
      
      {/* Web Search Info */}
      {sources.webSearch && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100 mb-6">
          <Globe className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700">
            <span className="font-medium">Web Search enabled:</span> Real specs, variants, pricing, and lifecycle data will be fetched to populate model page sections accurately.
          </div>
        </div>
      )}
      
      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!isValid}
        size="lg"
        className="w-full h-11 text-sm font-medium gap-2 bg-violet-600 hover:bg-violet-700"
      >
        Start Research
        <ArrowRight className="w-4 h-4" />
      </Button>
      
      {/* Help text */}
      <p className="text-center text-[10px] text-muted-foreground mt-4">
        The scraped data will be used to extract insights for model page sections like "Quick Decision", "Owner Pulse", etc.
      </p>
    </div>
  );
}
