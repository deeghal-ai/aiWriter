import { NextRequest, NextResponse } from "next/server";
import { generateVerdictsWithRetry, generateVerdictsOptimized } from "@/lib/ai/factory";
import { validateVerdicts, checkVerdictQuality } from "@/utils/validation";
import type { 
  VerdictGenerationResponse, 
  InsightExtractionResult,
  PersonaGenerationResult 
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes timeout

interface VerdictGenerationRequest {
  bike1Name: string;
  bike2Name: string;
  personas: PersonaGenerationResult;
  insights: InsightExtractionResult;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerdictGenerationRequest = await request.json();
    
    // Validate request
    if (!body.bike1Name || !body.bike2Name) {
      return NextResponse.json(
        {
          success: false,
          error: "Both bike names are required"
        } as VerdictGenerationResponse,
        { status: 400 }
      );
    }
    
    if (!body.personas || !body.personas.personas || body.personas.personas.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Personas are required"
        } as VerdictGenerationResponse,
        { status: 400 }
      );
    }
    
    if (!body.insights || !body.insights.bike1 || !body.insights.bike2) {
      return NextResponse.json(
        {
          success: false,
          error: "Insights are required"
        } as VerdictGenerationResponse,
        { status: 400 }
      );
    }
    
    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Anthropic API key not configured",
          details: "Add ANTHROPIC_API_KEY to your .env.local file"
        } as VerdictGenerationResponse,
        { status: 500 }
      );
    }
    
    console.log(`[API] Starting OPTIMIZED verdict generation for ${body.bike1Name} vs ${body.bike2Name}`);
    console.log(`[API] Generating ${body.personas.personas.length} verdicts in PARALLEL`);
    
    // Generate verdicts with optimized parallel processing (one API call per persona)
    const result = await generateVerdictsOptimized(
      body.bike1Name,
      body.bike2Name,
      body.personas.personas,
      body.insights
    );
    
    // Validate results
    const validation = validateVerdicts(result, body.personas.personas);
    if (!validation.valid) {
      console.error("[API] Validation failed:", validation.errors);
      return NextResponse.json(
        {
          success: false,
          error: "Verdict validation failed",
          details: validation.errors.join(", ")
        } as VerdictGenerationResponse,
        { status: 500 }
      );
    }
    
    // Check quality
    const qualityCheck = checkVerdictQuality(result);
    if (qualityCheck.quality === "poor") {
      console.warn("[API] Quality check warnings:", qualityCheck.warnings);
    }
    
    console.log(`[API] Verdict generation successful (quality: ${qualityCheck.quality})`);
    console.log(`[API] Summary: ${result.summary.bike1Wins} for ${body.bike1Name}, ${result.summary.bike2Wins} for ${body.bike2Name}`);
    
    return NextResponse.json({
      success: true,
      data: result
    } as VerdictGenerationResponse);
    
  } catch (error: any) {
    console.error("[API] Verdict generation error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate verdicts",
        details: error.message
      } as VerdictGenerationResponse,
      { status: 500 }
    );
  }
}

