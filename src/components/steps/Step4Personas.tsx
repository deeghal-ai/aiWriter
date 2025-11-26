"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Quote,
  MapPin,
  Briefcase,
  Target,
  AlertTriangle
} from "lucide-react";
import type { Persona, PersonaGenerationResponse } from "@/lib/types";

export function Step4Personas() {
  const {
    comparison,
    insights,
    personas,
    isGeneratingPersonas,
    setPersonas,
    setIsGeneratingPersonas,
    setCurrentStep,
    markStepComplete
  } = useAppStore();
  
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Auto-start generation when insights are available
  useEffect(() => {
    if (insights && !personas && !isGeneratingPersonas) {
      startGeneration();
    }
  }, [insights]);
  
  // Progress animation
  useEffect(() => {
    if (isGeneratingPersonas) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return 90;
          return prev + Math.random() * 10;
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setProgress(personas ? 100 : 0);
    }
  }, [isGeneratingPersonas, personas]);
  
  const startGeneration = async () => {
    if (!insights || !comparison) return;
    
    setIsGeneratingPersonas(true);
    setError(null);
    setProgress(0);
    
    try {
      const response = await fetch('/api/generate/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bike1Name: comparison.bike1,
          bike2Name: comparison.bike2,
          insights: insights
        })
      });
      
      const data: PersonaGenerationResponse = await response.json();
      console.log('[Step4] API response:', data);
      
      if (!data.success || !data.data) {
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}` 
          : (data.error || 'Failed to generate personas');
        console.error('[Step4] Persona generation failed:', errorMsg);
        throw new Error(errorMsg);
      }
      
      setPersonas(data.data);
      markStepComplete(4);
      
    } catch (err: any) {
      console.error('Persona generation error:', err);
      setError(err.message || 'Failed to generate personas');
    } finally {
      setIsGeneratingPersonas(false);
    }
  };
  
  const handleNext = () => {
    if (personas) {
      setCurrentStep(5);
    }
  };
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Users className="h-6 w-6" />
          Rider Personas
        </h2>
        <p className="text-slate-600">
          AI-identified rider archetypes based on forum discussions
        </p>
      </div>
      
      {/* Loading State */}
      {isGeneratingPersonas && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <p className="font-medium">Identifying rider personas from insights...</p>
            </div>
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-sm text-slate-500">
              This may take 15-30 seconds
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Error State */}
      {error && !isGeneratingPersonas && (
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
      
      {/* Success State - Persona Cards */}
      {personas && !isGeneratingPersonas && (
        <>
          {/* Summary */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-900">
                  Identified {personas.personas.length} Rider Personas
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold">{personas.personas.length}</p>
                  <p className="text-sm text-slate-600">distinct personas</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold">{personas.metadata.total_evidence_quotes}</p>
                  <p className="text-sm text-slate-600">supporting quotes</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold">
                    {(personas.metadata.processing_time_ms / 1000).toFixed(1)}s
                  </p>
                  <p className="text-sm text-slate-600">processing time</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Persona Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {personas.personas.map((persona) => (
              <PersonaCard key={persona.id} persona={persona} />
            ))}
          </div>
        </>
      )}
      
      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setCurrentStep(3)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex gap-2">
          {personas && (
            <Button
              variant="outline"
              size="lg"
              onClick={startGeneration}
              className="gap-2"
              disabled={isGeneratingPersonas}
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!personas}
            size="lg"
            className="gap-2"
          >
            Generate Verdicts
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Persona Card Component
function PersonaCard({ persona }: { persona: Persona }) {
  const colorClasses = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    purple: "border-l-purple-500",
    orange: "border-l-orange-500"
  };
  
  const bgClasses = {
    blue: "bg-blue-50",
    green: "bg-green-50",
    purple: "bg-purple-50",
    orange: "bg-orange-50"
  };
  
  return (
    <Card className={`border-l-4 ${colorClasses[persona.color as keyof typeof colorClasses]}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{persona.title}</CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              {persona.name} • {persona.demographics.ageRange}
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {persona.percentage}%
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Archetype Quote */}
        <div className={`p-3 rounded-lg ${bgClasses[persona.color as keyof typeof bgClasses]}`}>
          <div className="flex gap-2">
            <Quote className="h-4 w-4 mt-1 flex-shrink-0 opacity-60" />
            <p className="text-sm italic">"{persona.archetypeQuote}"</p>
          </div>
        </div>
        
        {/* Usage Pattern */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">USAGE PATTERN</p>
          <div className="flex gap-1 h-3 rounded-full overflow-hidden">
            {persona.usagePattern.cityCommute > 0 && (
              <div
                className="bg-blue-400"
                style={{ width: `${persona.usagePattern.cityCommute}%` }}
                title={`City Commute: ${persona.usagePattern.cityCommute}%`}
              />
            )}
            {persona.usagePattern.highway > 0 && (
              <div
                className="bg-green-400"
                style={{ width: `${persona.usagePattern.highway}%` }}
                title={`Highway: ${persona.usagePattern.highway}%`}
              />
            )}
            {persona.usagePattern.urbanLeisure > 0 && (
              <div
                className="bg-purple-400"
                style={{ width: `${persona.usagePattern.urbanLeisure}%` }}
                title={`Urban Leisure: ${persona.usagePattern.urbanLeisure}%`}
              />
            )}
            {persona.usagePattern.offroad > 0 && (
              <div
                className="bg-orange-400"
                style={{ width: `${persona.usagePattern.offroad}%` }}
                title={`Off-road: ${persona.usagePattern.offroad}%`}
              />
            )}
          </div>
          <div className="flex text-xs text-slate-500 mt-1 justify-between">
            <span>City: {persona.usagePattern.cityCommute}%</span>
            <span>Highway: {persona.usagePattern.highway}%</span>
            <span>Leisure: {persona.usagePattern.urbanLeisure}%</span>
            <span>Off-road: {persona.usagePattern.offroad}%</span>
          </div>
        </div>
        
        {/* Demographics */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{persona.demographics.cityType}</span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-slate-400" />
            <span>{persona.demographics.occupation}</span>
          </div>
        </div>
        
        {/* Priorities */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">TOP PRIORITIES</p>
          <div className="flex flex-wrap gap-1">
            {persona.priorities.slice(0, 4).map((priority, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {priority}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Pain Points */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">PAIN POINTS</p>
          <ul className="text-sm space-y-1">
            {persona.painPoints.slice(0, 2).map((pain, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <AlertTriangle className="h-3 w-3 mt-1 text-orange-500" />
                <span>{pain}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Sample Size */}
        <p className="text-xs text-slate-400 pt-2 border-t">
          Based on {persona.sampleSize} forum users
        </p>
      </CardContent>
    </Card>
  );
}
