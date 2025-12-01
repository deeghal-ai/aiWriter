'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function Step1Input() {
  const comparison = useAppStore((state) => state.comparison);
  const setComparison = useAppStore((state) => state.setComparison);
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const markStepComplete = useAppStore((state) => state.markStepComplete);
  
  // Initialize from store if available
  const [bike1, setBike1] = useState('');
  const [bike2, setBike2] = useState('');
  const [sources, setSources] = useState({
    xbhp: false,
    teamBhp: false,
    reddit: false,
    youtube: true,
    instagram: false,
    internal: false  // BikeDekho internal data
  });
  
  // Restore existing comparison data when returning to this step
  useEffect(() => {
    if (comparison) {
      setBike1(comparison.bike1 || '');
      setBike2(comparison.bike2 || '');
      if (comparison.researchSources) {
        setSources(comparison.researchSources);
      }
    }
  }, [comparison]);
  
  const handleSubmit = () => {
    // Save to store
    setComparison({
      bike1,
      bike2,
      researchSources: sources
    });
    
    // Mark step as complete and move to next
    markStepComplete(1);
    setCurrentStep(2);
  };
  
  const isValid = bike1.trim() && bike2.trim();
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Enter Comparison Bikes</h2>
        <p className="text-slate-600">
          Start by entering the two bikes you want to compare. We&apos;ll research them across forums and communities.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Bike Details</CardTitle>
          <CardDescription>
            Enter the exact model names (e.g., &quot;TVS Apache RTX 300&quot;)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bike inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Bike 1
              </label>
              <Input
                placeholder="e.g., TVS Apache RTX 300"
                value={bike1}
                onChange={(e) => setBike1(e.target.value)}
                className="text-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Bike 2
              </label>
              <Input
                placeholder="e.g., Royal Enfield Scram 440"
                value={bike2}
                onChange={(e) => setBike2(e.target.value)}
                className="text-lg"
              />
            </div>
          </div>
          
          {/* Research sources */}
          <div className="pt-4 border-t">
            <h3 className="font-medium mb-3">Research Sources</h3>
            <p className="text-sm text-slate-600 mb-4">
              Select which forums and communities to search
            </p>
            
            <div className="space-y-3">
              {[
                { id: 'youtube', label: 'YouTube Reviews & Comments', description: 'Top videos with owner comments', recommended: true },
                { id: 'reddit', label: 'Reddit r/IndianBikes', description: 'Forum discussions and experiences', recommended: true },
                { id: 'internal', label: 'BikeDekho User Reviews', description: 'Verified owner reviews & expert insights', recommended: true, badge: 'Premium' }
              ].map((source) => (
                <div key={source.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <Checkbox
                    id={source.id}
                    checked={sources[source.id as keyof typeof sources]}
                    onCheckedChange={(checked) =>
                      setSources((prev) => ({ ...prev, [source.id]: checked as boolean }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
<label
                                      htmlFor={source.id}
                                      className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                                    >
                                      {source.label}
                                      {source.recommended && !('badge' in source) && (
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Recommended</span>
                                      )}
                                      {'badge' in source && source.badge && (
                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{source.badge}</span>
                                      )}
                                    </label>
                    <p className="text-xs text-slate-500 mt-1">{source.description}</p>
                  </div>
                </div>
              ))}
              
              <p className="text-xs text-slate-500 mt-2 italic">
                💡 Tip: Enable both sources for richer insights and more accurate personas
              </p>
            </div>
          </div>
          
          {/* Estimated time */}
          <div className="pt-4 border-t bg-slate-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
            <p className="text-sm text-slate-600">
              <strong>Estimated research time:</strong>{' '}
              {sources.youtube && sources.reddit ? '2-4 minutes' : '1-2 minutes'}
              {sources.youtube && sources.reddit && (
                <span className="text-blue-600 ml-2">(Combined sources = richer data)</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Action button */}
      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          size="lg"
          className="gap-2"
        >
          Start Research
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

