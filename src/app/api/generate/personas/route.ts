import { NextRequest, NextResponse } from "next/server";
import { generatePersonasWithRetry, generatePersonasOptimized } from "@/lib/ai/factory";
import { validatePersonas, checkPersonaQuality } from "@/utils/validation";
import type { PersonaGenerationResponse, InsightExtractionResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes timeout

interface PersonaGenerationRequest {
  bike1Name: string;
  bike2Name: string;
  insights: InsightExtractionResult;
}

export async function POST(request: NextRequest) {
  try {
    const body: PersonaGenerationRequest = await request.json();
    
    // Validate request
    if (!body.bike1Name || !body.bike2Name) {
      return NextResponse.json(
        {
          success: false,
          error: "Both bike names are required"
        } as PersonaGenerationResponse,
        { status: 400 }
      );
    }
    
    if (!body.insights || !body.insights.bike1 || !body.insights.bike2) {
      return NextResponse.json(
        {
          success: false,
          error: "Extracted insights are required"
        } as PersonaGenerationResponse,
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
        } as PersonaGenerationResponse,
        { status: 500 }
      );
    }
    
    console.log(`[API] Starting OPTIMIZED persona generation for ${body.bike1Name} vs ${body.bike2Name}`);
    
    // Generate personas with optimized method (condensed inputs, better prompts)
    const result = await generatePersonasOptimized(
      body.bike1Name,
      body.bike2Name,
      body.insights
    );
    
    // Validate results
    const validation = validatePersonas(result);
    if (!validation.valid) {
      console.error("[API] Validation failed:", validation.errors);
      return NextResponse.json(
        {
          success: false,
          error: "Persona validation failed",
          details: validation.errors.join(", ")
        } as PersonaGenerationResponse,
        { status: 500 }
      );
    }
    
    // Check quality
    const qualityCheck = checkPersonaQuality(result);
    if (qualityCheck.quality === "poor") {
      console.warn("[API] Quality check warnings:", qualityCheck.warnings);
    }
    
    console.log(`[API] Persona generation successful (quality: ${qualityCheck.quality})`);
    console.log(`[API] Generated ${result.personas.length} personas`);
    
    return NextResponse.json({
      success: true,
      data: result
    } as PersonaGenerationResponse);
    
  } catch (error: any) {
    console.error("[API] Persona generation error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate personas",
        details: error.message
      } as PersonaGenerationResponse,
      { status: 500 }
    );
  }
}

