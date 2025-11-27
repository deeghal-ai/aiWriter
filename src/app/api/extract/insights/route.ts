import { NextRequest, NextResponse } from "next/server";
import { extractInsightsWithRetry } from "@/lib/ai/factory";
import { validateInsights, checkInsightQuality } from "@/utils/validation";
import { preprocessScrapedData, estimateTokenCount } from "@/lib/scrapers/data-preprocessor";
import type { InsightExtractionResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120; // 120 seconds (2 minutes)

interface InsightExtractionRequest {
  bike1Name: string;
  bike2Name: string;
  redditData?: any;
  youtubeData?: any;
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
    
    if (!body.redditData && !body.youtubeData) {
      return NextResponse.json(
        {
          success: false,
          error: "Scraped data is required (Reddit or YouTube)"
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
    console.log(`[API] Data sources: ${body.redditData ? 'Reddit' : ''}${body.youtubeData ? ' YouTube' : ''}${body.xbhpData ? ' xBhp' : ''}`);
    
    // Preprocess data to reduce token count
    let processedRedditData = body.redditData;
    let processedYouTubeData = body.youtubeData;
    let processedXbhpData = body.xbhpData;
    
    // Preprocess YouTube data if present (it's usually the largest)
    if (body.youtubeData) {
      const originalTokens = estimateTokenCount(body.youtubeData);
      processedYouTubeData = preprocessScrapedData(body.youtubeData, 'youtube');
      const processedTokens = estimateTokenCount(processedYouTubeData);
      console.log(`[API] YouTube data: ${originalTokens} tokens → ${processedTokens} tokens (reduced by ${Math.round((1 - processedTokens/originalTokens) * 100)}%)`);
    }
    
    // Preprocess Reddit data if present
    if (body.redditData) {
      const originalTokens = estimateTokenCount(body.redditData);
      processedRedditData = preprocessScrapedData(body.redditData, 'reddit');
      const processedTokens = estimateTokenCount(processedRedditData);
      console.log(`[API] Reddit data: ${originalTokens} tokens → ${processedTokens} tokens (reduced by ${Math.round((1 - processedTokens/originalTokens) * 100)}%)`);
    }
    
    // Extract insights with retry
    // Pass YouTube data as redditData if Reddit is not available
    const insights = await extractInsightsWithRetry(
      body.bike1Name,
      body.bike2Name,
      processedRedditData || processedYouTubeData,
      processedXbhpData
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

