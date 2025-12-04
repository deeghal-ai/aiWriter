/**
 * Unified Insight Extraction API Route
 * 
 * Uses factory pattern for consistent model handling across all routes.
 * Delegates to AI provider through factory layer.
 * 
 * Data Flow:
 * 1. Receives scraped data from multiple sources (YouTube, Reddit, Internal, etc.)
 * 2. Uses Data Source Registry to normalize and merge all sources
 * 3. Passes merged data to AI extraction
 * 4. Returns unified insights with source attribution preserved
 */

import { NextRequest, NextResponse } from "next/server";
import { validateInsights, checkInsightQuality } from "@/utils/validation";
import { extractInsightsOptimized } from "@/lib/ai/factory";
import { 
  processAndMergeScrapedData, 
  convertToLegacyFormat,
  DEFAULT_MERGE_STRATEGY,
  type MergeStrategy 
} from "@/lib/data-sources";
import type { InsightExtractionResult, InsightExtractionResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for API calls

interface InsightExtractionRequest {
  bike1Name: string;
  bike2Name: string;
  redditData?: any;
  youtubeData?: any;
  xbhpData?: any;
  internalData?: any;  // Future: BikeDekho internal data
  modelId?: string;
  
  // Optional: Custom merge strategy override
  mergeStrategy?: Partial<MergeStrategy>;
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
    
    // Check if at least one data source is provided
    const hasData = body.redditData || body.youtubeData || body.xbhpData || body.internalData;
    if (!hasData) {
      return NextResponse.json(
        { success: false, error: "Scraped data is required (at least one source: Reddit, YouTube, or Internal)" } as InsightExtractionResponse,
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
    
    // ===== DATA SOURCE MERGE =====
    // Use centralized Data Source Registry to merge all available sources
    // This replaces the old: bike1: yt?.bike1 || reddit?.bike1 pattern
    
    // Build merge strategy (use defaults with any overrides)
    const mergeStrategy: MergeStrategy = {
      ...DEFAULT_MERGE_STRATEGY,
      ...body.mergeStrategy
    };
    
    // Log available sources
    const availableSources = [];
    if (body.youtubeData) availableSources.push('YouTube');
    if (body.redditData) availableSources.push('Reddit');
    if (body.internalData) availableSources.push('Internal');
    if (body.xbhpData) availableSources.push('xBhp');
    console.log(`[Extract] Available sources: ${availableSources.join(', ')}`);
    
    // Process and merge all data sources (now async for Haiku transcript summarization)
    const mergeResult = await processAndMergeScrapedData(
      {
        youtube: body.youtubeData,
        reddit: body.redditData,
        internal: body.internalData,
        xbhp: body.xbhpData
      },
      body.bike1Name,
      body.bike2Name,
      mergeStrategy
    );
    
    // Log merge results
    console.log(`[Extract] Merge complete: ${mergeResult.mergeMetadata.sourcesUsed.join(', ')}`);
    console.log(`[Extract] ${body.bike1Name}: ${mergeResult.bike1.totalPosts} posts, ${mergeResult.bike1.qualityComments} quality comments`);
    console.log(`[Extract] ${body.bike2Name}: ${mergeResult.bike2.totalPosts} posts, ${mergeResult.bike2.qualityComments} quality comments`);
    
    // Convert to format expected by existing AI extraction
    const combinedData = convertToLegacyFormat(mergeResult);
    
    // ===== USE FACTORY PATTERN - Consistent with other routes =====
    // Factory handles model selection, provider routing, and prompt selection
    // Pass modelId from UI for user-selected model override
    const insights = await extractInsightsOptimized(
      body.bike1Name,
      body.bike2Name,
      combinedData,
      body.modelId
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
        processingTimeMs: processingTime,
        sourcesUsed: mergeResult.mergeMetadata.sourcesUsed,
        mergeStats: {
          bike1Posts: mergeResult.bike1.totalPosts,
          bike1Comments: mergeResult.bike1.totalComments,
          bike2Posts: mergeResult.bike2.totalPosts,
          bike2Comments: mergeResult.bike2.totalComments,
          deduplicatedCount: mergeResult.mergeMetadata.deduplicatedCount
        }
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
    endpoint: 'insights (with Data Source Registry)',
    features: [
      'Uses factory pattern for consistent model handling',
      'Automatic model selection through registry',
      'Parallel extraction for both bikes',
      'Centralized prompt and config management',
      'NEW: Unified Data Source Registry for multi-source merge',
      'NEW: Configurable merge strategy (deduplication, weighting)',
      'NEW: Source attribution preserved in insights',
      'NEW: Ready for internal BikeDekho data integration'
    ],
    supportedSources: ['youtube', 'reddit', 'internal', 'xbhp'],
    mergeStrategy: DEFAULT_MERGE_STRATEGY
  });
}
