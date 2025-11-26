import { NextRequest, NextResponse } from "next/server";
import { extractInsightsWithRetry } from "@/lib/ai/factory";
import { validateInsights, checkInsightQuality } from "@/utils/validation";
import type { InsightExtractionResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120; // 120 seconds (2 minutes)

interface InsightExtractionRequest {
  bike1Name: string;
  bike2Name: string;
  redditData: any;
  xbhpData?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: InsightExtractionRequest = await request.json();
    
    // Validate request
    if (!body.bike1Name || !body.bike2Name) {
      return NextResponse.json(
        {
          success: false,
          error: "Both bike names are required"
        } as InsightExtractionResponse,
        { status: 400 }
      );
    }
    
    if (!body.redditData) {
      return NextResponse.json(
        {
          success: false,
          error: "Reddit data is required"
        } as InsightExtractionResponse,
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
        } as InsightExtractionResponse,
        { status: 500 }
      );
    }
    
    console.log(`[API] Starting insight extraction for ${body.bike1Name} vs ${body.bike2Name}`);
    console.log(`[API] Using AI provider: ${process.env.AI_PROVIDER || 'claude'}`);
    
    // Extract insights with retry
    const insights = await extractInsightsWithRetry(
      body.bike1Name,
      body.bike2Name,
      body.redditData,
      body.xbhpData
    );
    
    // Validate results
    const validation = validateInsights(insights);
    if (!validation.valid) {
      console.error("[API] Validation failed:", validation.errors);
      return NextResponse.json(
        {
          success: false,
          error: "Insight validation failed",
          details: validation.errors.join(", ")
        } as InsightExtractionResponse,
        { status: 500 }
      );
    }
    
    // Check quality
    const qualityCheck = checkInsightQuality(insights);
    if (qualityCheck.quality === "poor") {
      console.warn("[API] Quality check warnings:", qualityCheck.warnings);
    }
    
    console.log(`[API] Extraction successful (quality: ${qualityCheck.quality})`);
    console.log(`[API] Stats: ${insights.metadata.total_praises} praises, ${insights.metadata.total_complaints} complaints, ${insights.metadata.total_quotes} quotes`);
    
    return NextResponse.json({
      success: true,
      data: insights
    } as InsightExtractionResponse);
    
  } catch (error: any) {
    console.error("[API] Insight extraction error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to extract insights",
        details: error.message
      } as InsightExtractionResponse,
      { status: 500 }
    );
  }
}

