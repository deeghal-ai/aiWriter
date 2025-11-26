"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Scale,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Quote
} from "lucide-react";
import type { Verdict, VerdictGenerationResponse } from "@/lib/types";

export function Step5Verdicts() {
  const {
    comparison,
    insights,
    personas,
    verdicts,
    isGeneratingVerdicts,
    setVerdicts,
    setIsGeneratingVerdicts,
    setCurrentStep,
    markStepComplete
  } = useAppStore();
  
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Auto-start generation when personas are available
  useEffect(() => {
    if (personas && insights && !verdicts && !isGeneratingVerdicts) {
      startGeneration();
    }
  }, [personas, insights]);
  
  // Progress animation
  useEffect(() => {
    if (isGeneratingVerdicts) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return 90;
          return prev + Math.random() * 8;
        });
      }, 400);
      return () => clearInterval(interval);
    } else {
      setProgress(verdicts ? 100 : 0);
    }
  }, [isGeneratingVerdicts, verdicts]);
  
  const startGeneration = async () => {
    if (!personas || !insights || !comparison) return;
    
    setIsGeneratingVerdicts(true);
    setError(null);
    setProgress(0);
    
    try {
      const response = await fetch('/api/generate/verdicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bike1Name: comparison.bike1,
          bike2Name: comparison.bike2,
          personas: personas,
          insights: insights
        })
      });
      
      const data: VerdictGenerationResponse = await response.json();
      console.log('[Step5] API response:', data);
      
      if (!data.success || !data.data) {
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}` 
          : (data.error || 'Failed to generate verdicts');
        console.error('[Step5] Verdict generation failed:', errorMsg);
        throw new Error(errorMsg);
      }
      
      setVerdicts(data.data);
      markStepComplete(5);
      
    } catch (err: any) {
      console.error('Verdict generation error:', err);
      setError(err.message || 'Failed to generate verdicts');
    } finally {
      setIsGeneratingVerdicts(false);
    }
  };
  
  const handleNext = () => {
    if (verdicts) {
      setCurrentStep(6);
    }
  };
  
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Scale className="h-6 w-6" />
          Verdict Generation
        </h2>
        <p className="text-slate-600">
          AI-powered recommendations for each rider persona
        </p>
      </div>
      
      {/* Loading State */}
      {isGeneratingVerdicts && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <p className="font-medium">Generating verdicts for {personas?.personas.length} personas...</p>
            </div>
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-sm text-slate-500">
              This may take 20-40 seconds
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Error State */}
      {error && !isGeneratingVerdicts && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Generation Failed</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startGeneration}
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
      {verdicts && !isGeneratingVerdicts && (
        <>
          {/* Summary Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-900">
                  Generated {verdicts.verdicts.length} Verdicts
                </p>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {verdicts.summary.bike1Wins}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">{comparison?.bike1}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {verdicts.summary.bike2Wins}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">{comparison?.bike2}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold">
                    {verdicts.metadata.average_confidence}%
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Avg Confidence</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold">
                    {(verdicts.metadata.processing_time_ms / 1000).toFixed(1)}s
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Processing</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 mt-4">
                {verdicts.summary.closestCall}
              </p>
            </CardContent>
          </Card>
          
          {/* Verdict Cards */}
          <div className="space-y-6 mb-6">
            {verdicts.verdicts.map((verdict, index) => (
              <VerdictCard 
                key={verdict.personaId} 
                verdict={verdict}
                index={index}
              />
            ))}
          </div>
        </>
      )}
      
      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setCurrentStep(4)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex gap-2">
          {verdicts && (
            <Button
              variant="outline"
              size="lg"
              onClick={startGeneration}
              className="gap-2"
              disabled={isGeneratingVerdicts}
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!verdicts}
            size="lg"
            className="gap-2"
          >
            Generate Article
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Verdict Card Component
function VerdictCard({ verdict, index }: { verdict: Verdict; index: number }) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500";
    if (confidence >= 65) return "bg-yellow-500";
    return "bg-orange-500";
  };
  
  return (
    <Card className="overflow-hidden">
      {/* Confidence bar at top */}
      <div className={`h-2 ${getConfidenceColor(verdict.confidence)}`} />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">
              For: {verdict.personaName} — {verdict.personaTitle}
            </p>
            <CardTitle className="text-xl mt-1 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              {verdict.recommendedBike}
            </CardTitle>
          </div>
          <Badge 
            variant={verdict.confidence >= 80 ? "default" : "secondary"}
            className="text-lg px-4 py-1"
          >
            {verdict.confidence}%
          </Badge>
        </div>
        <p className="text-sm text-slate-600 mt-2">
          {verdict.confidenceExplanation}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* One-liner */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex gap-2">
            <Quote className="h-4 w-4 mt-1 text-blue-600 flex-shrink-0" />
            <p className="text-sm font-medium text-blue-900 italic">
              {verdict.verdictOneLiner}
            </p>
          </div>
        </div>
        
        {/* Reasoning */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Why {verdict.recommendedBike} Wins
          </h4>
          <ul className="space-y-3">
            {verdict.reasoning.map((reason, idx) => (
              <li key={idx} className="bg-green-50 p-3 rounded-lg">
                <div className="flex gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <div>
                    <p className="text-sm font-medium">{reason.point}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Priority: {reason.priority}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 italic">
                      Evidence: "{reason.evidence}"
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Against Reasons */}
        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-orange-700">
            <XCircle className="h-4 w-4" />
            The {100 - verdict.confidence}% Case for {verdict.otherBike}
          </h4>
          <ul className="space-y-2">
            {verdict.againstReasons.map((reason, idx) => (
              <li key={idx} className="flex gap-2 text-sm bg-orange-50 p-2 rounded">
                <span className="text-orange-600 font-bold">✗</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Tangible Impact (if available) */}
        {verdict.tangibleImpact && (
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">
                {verdict.tangibleImpact.metric}
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              {verdict.tangibleImpact.value}
            </p>
            <p className="text-xs text-purple-600 mt-1">
              {verdict.tangibleImpact.explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
