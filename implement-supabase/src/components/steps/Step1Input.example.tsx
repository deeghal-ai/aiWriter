/**
 * Step 1: Input Component - MODIFICATION EXAMPLE
 * 
 * This file shows how to modify your existing Step1Input component
 * to support auto-save functionality.
 * 
 * Key changes:
 * 1. Import useStepCompletion hook
 * 2. Call completeStep() when form is submitted
 * 3. Show save status
 */

'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useStepCompletion } from '@/lib/hooks/useStepCompletion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, Save } from 'lucide-react';

export default function Step1Input() {
  const { comparison, setComparison, setCurrentStep } = useAppStore();
  const { completeStep, saveDraft, isProcessing } = useStepCompletion();
  
  const [bike1Name, setBike1Name] = useState(comparison?.bike1?.name || '');
  const [bike2Name, setBike2Name] = useState(comparison?.bike2?.name || '');
  const [error, setError] = useState<string | null>(null);

  // Handle form submission - complete step and save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate inputs
    if (!bike1Name.trim() || !bike2Name.trim()) {
      setError('Please enter both bike names');
      return;
    }
    
    // Update comparison in store
    setComparison({
      bike1: { name: bike1Name.trim() },
      bike2: { name: bike2Name.trim() },
    });
    
    // Complete step 1 and auto-save to database
    // This will:
    // 1. Mark step 1 as complete
    // 2. Save to Supabase
    // 3. Update the URL with the comparison ID (if new)
    // 4. Advance to step 2
    const success = await completeStep(1);
    
    if (!success) {
      setError('Failed to save. Please try again.');
    }
  };

  // Optional: Save as draft without advancing
  const handleSaveDraft = async () => {
    if (!bike1Name.trim() || !bike2Name.trim()) {
      setError('Please enter both bike names to save');
      return;
    }
    
    setComparison({
      bike1: { name: bike1Name.trim() },
      bike2: { name: bike2Name.trim() },
    });
    
    const success = await saveDraft();
    
    if (success) {
      // Show success feedback
      setError(null);
    } else {
      setError('Failed to save draft');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Bike Comparison Details</CardTitle>
          <CardDescription>
            Enter the two bikes you want to compare. Our AI will research and generate 
            a comprehensive comparison article.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bike 1 Input */}
            <div className="space-y-2">
              <Label htmlFor="bike1">First Bike</Label>
              <Input
                id="bike1"
                placeholder="e.g., Royal Enfield Classic 350"
                value={bike1Name}
                onChange={(e) => setBike1Name(e.target.value)}
                disabled={isProcessing}
              />
            </div>
            
            {/* VS Divider */}
            <div className="flex items-center justify-center">
              <span className="text-gray-400 font-medium">VS</span>
            </div>
            
            {/* Bike 2 Input */}
            <div className="space-y-2">
              <Label htmlFor="bike2">Second Bike</Label>
              <Input
                id="bike2"
                placeholder="e.g., Honda CB350"
                value={bike2Name}
                onChange={(e) => setBike2Name(e.target.value)}
                disabled={isProcessing}
              />
            </div>
            
            {/* Error Message */}
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isProcessing || !bike1Name.trim() || !bike2Name.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              
              <Button 
                type="submit" 
                disabled={isProcessing || !bike1Name.trim() || !bike2Name.trim()}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Start Research
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
