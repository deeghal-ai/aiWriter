/**
 * Unified Insight Extraction API Route
 * 
 * Uses factory pattern for consistent model handling across all routes.
 * Delegates to AI provider through factory layer.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateInsights, checkInsightQuality } from "@/utils/validation";
import { extractInsightsOptimized } from "@/lib/ai/factory";
import type { InsightExtractionResult, InsightExtractionResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for API calls

interface InsightExtractionRequest {
  bike1Name: string;
  bike2Name: string;
  redditData?: any;
  youtubeData?: any;
  xbhpData?: any;
  modelId?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: InsightExtractionRequest = await request.json();
    
    // ===== VALIDATION =====
    if (!body.bike1Name || !body.bike2Name) {
      return NextResponse.json(
        { success: false, error: "Both bike names are required" } as InsightExtractionResponse,
        { status: 400 }
      );
    }
    
    if (!body.redditData && !body.youtubeData) {
      return NextResponse.json(
        { success: false, error: "Scraped data is required (Reddit or YouTube)" } as InsightExtractionResponse,
        { status: 400 }
      );
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Anthropic API key not configured" } as InsightExtractionResponse,
        { status: 500 }
      );
    }
    
    console.log(`[Extract] Starting: ${body.bike1Name} vs ${body.bike2Name}`);
    
    // Combine data sources for processing
    const combinedData = {
      bike1: body.youtubeData?.bike1 || body.redditData?.bike1,
      bike2: body.youtubeData?.bike2 || body.redditData?.bike2
    };
    
    // ===== USE FACTORY PATTERN - Consistent with other routes =====
    // Factory handles model selection, provider routing, and prompt selection
    const insights = await extractInsightsOptimized(
      body.bike1Name,
      body.bike2Name,
      combinedData
    );
    
    // ===== VALIDATION & QUALITY CHECK =====
    const validation = validateInsights(insights);
    if (!validation.valid) {
      console.error("[Extract] Validation failed:", validation.errors);
      return NextResponse.json(
        { success: false, error: "Insight validation failed", details: validation.errors.join(", ") } as InsightExtractionResponse,
        { status: 500 }
      );
    }
    
    const qualityCheck = checkInsightQuality(insights);
    const processingTime = Date.now() - startTime;
    
    // Update metadata with actual processing time
    insights.metadata.processing_time_ms = processingTime;
    
    console.log(`[Extract] ✅ Complete in ${(processingTime/1000).toFixed(1)}s (quality: ${qualityCheck.quality})`);
    console.log(`[Extract] Stats: ${insights.metadata.total_praises} praises, ${insights.metadata.total_complaints} complaints, ${insights.metadata.total_quotes} quotes`);
    
    return NextResponse.json({
      success: true,
      data: insights,
      meta: {
        processingTimeMs: processingTime
      }
    } as InsightExtractionResponse & { meta: any });
    
  } catch (error: any) {
    console.error("[Extract] Error:", error);
    
    // Specific error handling
    if (error.message?.includes('rate_limit')) {
      return NextResponse.json(
        { success: false, error: 'API rate limit reached', details: 'Please wait a moment' } as InsightExtractionResponse,
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: "Failed to extract insights", details: error.message } as InsightExtractionResponse,
      { status: 500 }
    );
  }
}

// ===== HEALTH CHECK =====
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'insights (factory pattern)',
    features: [
      'Uses factory pattern for consistent model handling',
      'Automatic model selection through registry',
      'Parallel extraction for both bikes',
      'Centralized prompt and config management'
    ]
  });
}
