/**
 * Unified Insight Extraction API Route
 * 
 * Handles ALL models (Haiku, Sonnet, Opus) with the SAME extraction logic.
 * Only the model string changes - prompts and processing are identical.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { validateInsights, checkInsightQuality } from "@/utils/validation";
import { prepareBikeDataForSonnet } from "@/lib/scrapers/sonnet-data-prep";
import { getModelById, getDefaultModel, getModelApiConfig, type ModelDefinition } from "@/lib/ai/models/registry";
import { 
  buildSingleBikeExtractionPrompt, 
  EXTRACTION_SYSTEM_PROMPT 
} from "@/lib/ai/prompts-optimized";
import type { BikeInsights, InsightExtractionResult, InsightExtractionResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for API calls

// Initialize Anthropic client for direct calls (Sonnet/Opus extraction)
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    
    // ===== MODEL SELECTION =====
    const model = body.modelId 
      ? getModelById(body.modelId)
      : getDefaultModel('extraction');
    
    if (!model) {
      return NextResponse.json(
        { success: false, error: `Unknown model: ${body.modelId}` } as InsightExtractionResponse,
        { status: 400 }
      );
    }
    
    if (model.provider !== 'anthropic') {
      return NextResponse.json(
        { success: false, error: `Provider ${model.provider} not yet implemented` } as InsightExtractionResponse,
        { status: 400 }
      );
    }
    
    console.log(`[Extract] Starting: ${body.bike1Name} vs ${body.bike2Name}`);
    console.log(`[Extract] Model: ${model.name} (${model.quality} quality)`);
    
    // ===== UNIFIED EXTRACTION - SAME LOGIC FOR ALL MODELS =====
    // Only the model string changes, prompts and processing are identical
    const insights = await extractInsightsUnified(body, model);
    
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
        modelUsed: model.id,
        modelName: model.name,
        modelQuality: model.quality,
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

// ===== UNIFIED EXTRACTION - SAME FOR ALL MODELS =====
async function extractInsightsUnified(
  body: InsightExtractionRequest, 
  model: ModelDefinition
): Promise<InsightExtractionResult> {
  console.log(`[Extract] Using ${model.name} with unified extraction logic`);
  
  // Get model config from registry
  const config = getModelApiConfig('extraction');
  
  // Prepare data for both bikes (same processing for all models)
  const bike1Combined = combineDataSources(body.youtubeData?.bike1, body.redditData?.bike1, body.bike1Name);
  const bike2Combined = combineDataSources(body.youtubeData?.bike2, body.redditData?.bike2, body.bike2Name);
  
  // prepareBikeDataForSonnet returns structured data with quality comments
  const bike1Prepared = prepareBikeDataForSonnet(bike1Combined, body.bike1Name);
  const bike2Prepared = prepareBikeDataForSonnet(bike2Combined, body.bike2Name);
  
  console.log(`[Extract] ${body.bike1Name}: ${bike1Prepared.qualityComments} quality comments`);
  console.log(`[Extract] ${body.bike2Name}: ${bike2Prepared.qualityComments} quality comments`);
  
  // PARALLEL extraction - same for ALL models, only model string differs
  console.log('[Extract] Starting parallel API calls...');
  const [bike1Result, bike2Result] = await Promise.all([
    extractSingleBike(body.bike1Name, bike1Prepared, model.modelString, config),
    extractSingleBike(body.bike2Name, bike2Prepared, model.modelString, config)
  ]);
  
  return {
    bike1: bike1Result,
    bike2: bike2Result,
    metadata: {
      extracted_at: new Date().toISOString(),
      total_praises: bike1Result.praises.length + bike2Result.praises.length,
      total_complaints: bike1Result.complaints.length + bike2Result.complaints.length,
      total_quotes: countQuotes(bike1Result) + countQuotes(bike2Result),
      processing_time_ms: 0 // Will be updated by caller
    }
  };
}

// ===== EXTRACT SINGLE BIKE - Uses prompts-optimized.ts =====
async function extractSingleBike(
  bikeName: string, 
  preparedData: any,  // Pass the prepared data object directly
  modelString: string,
  config: any
): Promise<BikeInsights> {
  // Use the SAME prompt from prompts-optimized.ts for ALL models
  const prompt = buildSingleBikeExtractionPrompt(bikeName, preparedData);
  const prefill = `{"name":"${bikeName}","praises":[`;
  
  const response = await client.messages.create({
    model: modelString,  // Only this changes between Haiku/Sonnet/Opus
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    system: EXTRACTION_SYSTEM_PROMPT,  // Same system prompt for all
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', content: prefill }  // Prefill for instant JSON start
    ]
  });
  
  if (response.stop_reason === 'max_tokens') {
    console.warn(`[Extract] Response truncated for ${bikeName}`);
  }
  
  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Expected text response');
  }
  
  // Reconstruct and parse JSON
  const fullJson = prefill + content.text;
  const parsed = JSON.parse(fullJson);
  
  // Ensure required fields
  parsed.praises = parsed.praises || [];
  parsed.complaints = parsed.complaints || [];
  parsed.surprising_insights = parsed.surprising_insights || [];
  
  console.log(`[Extract] ${bikeName}: ${parsed.praises.length} praises, ${parsed.complaints.length} complaints`);
  
  return parsed;
}

// ===== HELPER: Combine YouTube and Reddit data =====
function combineDataSources(youtubeData: any, redditData: any, bikeName: string): any {
  const videos: any[] = [];
  
  if (youtubeData?.videos) {
    videos.push(...youtubeData.videos);
  }
  
  if (redditData?.posts?.length) {
    const redditAsVideos = redditData.posts.map((post: any) => ({
      title: post.title,
      videoId: `reddit-${post.permalink?.replace(/\//g, '-') || Math.random()}`,
      channelTitle: `Reddit u/${post.author}`,
      description: post.selftext || '',
      publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : new Date().toISOString(),
      viewCount: post.score || 0,
      comments: (post.comments || []).map((c: any) => ({
        text: c.body || '',
        author: c.author || 'Anonymous',
        likeCount: c.score || 0,
        source: 'Reddit'
      })),
      source: 'Reddit',
      isRedditPost: true
    }));
    videos.push(...redditAsVideos);
  }
  
  return {
    name: bikeName,
    videos,
    total_videos: videos.filter(v => !v.isRedditPost).length,
    total_reddit_posts: videos.filter(v => v.isRedditPost).length,
    total_comments: videos.reduce((sum, v) => sum + (v.comments?.length || 0), 0)
  };
}

// ===== HELPER: Count quotes =====
function countQuotes(insights: BikeInsights): number {
  const praises = (insights.praises || []).reduce((sum, p) => sum + (p.quotes?.length || 0), 0);
  const complaints = (insights.complaints || []).reduce((sum, c) => sum + (c.quotes?.length || 0), 0);
  return praises + complaints;
}

// ===== HEALTH CHECK =====
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'insights (unified)',
    features: [
      'Supports all models (Haiku, Sonnet, Opus)',
      'Automatic routing based on model quality',
      'Parallel extraction for both bikes',
      'Prefill technique for quality models'
    ]
  });
}
