import { NextRequest, NextResponse } from "next/server";
import { extractInsightsWithRetry, extractInsightsOptimized } from "@/lib/ai/factory";
import { validateInsights, checkInsightQuality } from "@/utils/validation";
import { preprocessScrapedData, estimateTokenCount } from "@/lib/scrapers/data-preprocessor";
import { getModelById, getDefaultModel } from "@/lib/ai/models/registry";
import type { InsightExtractionResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300; // 300 seconds (5 minutes) - needed for Claude API calls with retries

interface InsightExtractionRequest {
  bike1Name: string;
  bike2Name: string;
  redditData?: any;
  youtubeData?: any;
  xbhpData?: any;
  modelId?: string;  // NEW: Optional model selection
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
    
    // Get model configuration from registry
    const model = body.modelId 
      ? getModelById(body.modelId)
      : getDefaultModel('extraction');
    
    if (!model) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown model: ${body.modelId}`,
          details: "Please select a valid model from the available options"
        } as InsightExtractionResponse,
        { status: 400 }
      );
    }
    
    // Check if model provider is supported
    if (model.provider !== 'anthropic') {
      return NextResponse.json(
        {
          success: false,
          error: `Provider ${model.provider} not yet implemented`,
          details: "Currently only Anthropic (Claude) models are supported"
        } as InsightExtractionResponse,
        { status: 400 }
      );
    }
    
    console.log(`[API] Starting insight extraction for ${body.bike1Name} vs ${body.bike2Name}`);
    console.log(`[API] Using model: ${model.name} (${model.modelString})`);
    console.log(`[API] Model quality: ${model.quality}, speed: ${model.speed}`);
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
    
    // Combine processed data
    const combinedData = {
      bike1: processedYouTubeData?.bike1 || processedRedditData?.bike1,
      bike2: processedYouTubeData?.bike2 || processedRedditData?.bike2
    };
    
    // Route to appropriate extraction method based on model quality
    let insights;
    
    if (model.quality === 'standard' || model.id === 'claude-haiku-3.5') {
      // Use optimized parallel extraction for fast/standard quality models
      console.log('[API] Using optimized parallel extraction (Haiku model)');
      insights = await extractInsightsOptimized(
        body.bike1Name,
        body.bike2Name,
        combinedData
      );
    } else {
      // Use standard extraction for high/premium quality models
      // This routes to the Claude provider's extractInsights method
      console.log(`[API] Using standard extraction (${model.name})`);
      insights = await extractInsightsWithRetry(
        body.bike1Name,
        body.bike2Name,
        combinedData,
        processedXbhpData
      );
    }
    
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
      data: insights,
      meta: {
        modelUsed: model.id,
        modelName: model.name,
        modelQuality: model.quality
      }
    } as InsightExtractionResponse & { meta: any });
    
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

