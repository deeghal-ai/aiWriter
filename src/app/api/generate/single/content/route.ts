import { NextRequest, NextResponse } from 'next/server';
import { 
  generateSingleVehicleContentWithRetry,
  type ProgressCallback 
} from '@/lib/ai/single-vehicle-generator';
import type { SingleVehicleCorpus } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for full pipeline

interface GenerateContentRequest {
  corpus: SingleVehicleCorpus;
  vehicle: string;
}

/**
 * POST /api/generate/single/content
 * Generates page content JSON from scraped corpus
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: GenerateContentRequest = await request.json();
    
    if (!body.corpus) {
      return NextResponse.json(
        { success: false, error: 'Corpus data is required' },
        { status: 400 }
      );
    }
    
    if (!body.vehicle && !body.corpus.metadata?.vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle name is required' },
        { status: 400 }
      );
    }
    
    // Ensure vehicle name is in corpus metadata
    if (!body.corpus.metadata) {
      body.corpus.metadata = {
        vehicle: body.vehicle,
        scrapedAt: new Date().toISOString(),
        totalPosts: 0,
        totalComments: 0,
        sourcesUsed: []
      };
    } else if (!body.corpus.metadata.vehicle) {
      body.corpus.metadata.vehicle = body.vehicle;
    }
    
    console.log(`[API] Starting content generation for ${body.corpus.metadata.vehicle}`);
    
    // Track progress for logging
    const progressLog: Array<{ step: string; status: string; message?: string }> = [];
    const onProgress: ProgressCallback = (progress) => {
      progressLog.push({
        step: progress.step,
        status: progress.status,
        message: progress.message
      });
      console.log(`[API] Progress: ${progress.step} - ${progress.status} - ${progress.message || ''}`);
    };
    
    // Generate content
    const result = await generateSingleVehicleContentWithRetry(body.corpus, onProgress, 2);
    
    const totalTime = Date.now() - startTime;
    console.log(`[API] Content generation complete in ${totalTime}ms`);
    
    return NextResponse.json({
      success: true,
      data: result.content,
      metadata: {
        ...result.metadata,
        total_time_ms: totalTime,
        progress_log: progressLog
      }
    });
    
  } catch (error: any) {
    console.error('[API] Content generation error:', error);
    
    // Handle specific error types
    if (error.message?.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI provider not configured',
          details: 'Please set ANTHROPIC_API_KEY in environment variables'
        },
        { status: 503 }
      );
    }
    
    if (error.message?.includes('401') || error.message?.includes('API key')) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI authentication failed',
          details: 'Please check your ANTHROPIC_API_KEY'
        },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          details: 'Please wait a moment and try again'
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Content generation failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate/single/content
 * Returns API status and configuration info
 */
export async function GET() {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  
  return NextResponse.json({
    endpoint: 'generate/single/content',
    status: hasApiKey ? 'ready' : 'not_configured',
    message: hasApiKey 
      ? 'Ready to generate single vehicle content'
      : 'ANTHROPIC_API_KEY not configured',
    methods: ['POST'],
    requiredBody: {
      corpus: 'SingleVehicleCorpus - scraped data from Step 2/3',
      vehicle: 'string - vehicle name (optional if in corpus.metadata)'
    },
    response: {
      success: 'boolean',
      data: 'SingleVehiclePageContent - generated content',
      metadata: 'Generation metadata including timing'
    }
  });
}
