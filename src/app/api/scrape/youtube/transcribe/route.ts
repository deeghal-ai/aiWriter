/**
 * API Route: YouTube Enhanced Transcription
 * 
 * Endpoints:
 * - POST /api/scrape/youtube/transcribe - Transcribe videos with multi-layer fallback
 * - GET /api/scrape/youtube/transcribe - Check transcription service status
 */

import { NextRequest, NextResponse } from 'next/server';
import { EnhancedYouTubeScraper } from '@/lib/scrapers/youtube-enhanced';

export const maxDuration = 300; // Allow up to 5 minutes for transcription

interface TranscribeRequestBody {
  // Option 1: Transcribe specific video IDs
  videoIds?: string[];
  
  // Option 2: Search and transcribe for bike comparison
  bike1?: string;
  bike2?: string;
  
  // Options
  maxVideos?: number;
  enableWhisper?: boolean;
  enableDeepgram?: boolean;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: TranscribeRequestBody = await request.json();
    const {
      videoIds,
      bike1,
      bike2,
      maxVideos = 10,
      enableWhisper = true,
      enableDeepgram = true,
    } = body;

    // Validate input - need either videoIds or bike names
    if (!videoIds?.length && (!bike1 || !bike2)) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Provide either videoIds array OR bike1 and bike2 names',
        },
        { status: 400 }
      );
    }

    // Check if API keys are configured
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasDeepgram = !!process.env.DEEPGRAM_API_KEY;

    if (!hasOpenAI && enableWhisper) {
      console.warn('[Transcribe API] OPENAI_API_KEY not configured, Whisper fallback disabled');
    }

    if (!hasDeepgram && enableDeepgram) {
      console.warn('[Transcribe API] DEEPGRAM_API_KEY not configured, Deepgram fallback disabled');
    }

    // Initialize scraper
    const scraper = new EnhancedYouTubeScraper({
      openaiApiKey: process.env.OPENAI_API_KEY,
      deepgramApiKey: process.env.DEEPGRAM_API_KEY,
      enableWhisper: enableWhisper && hasOpenAI,
      enableDeepgram: enableDeepgram && hasDeepgram,
    });

    let result;

    if (videoIds?.length) {
      // Mode 1: Transcribe specific videos
      console.log(`[Transcribe API] Processing ${videoIds.length} video(s)`);
      
      const transcripts = await scraper.transcribeBatch(videoIds);
      
      const successful = transcripts.filter(t => t.source !== 'failed').length;
      const totalCost = transcripts.reduce((sum, t) => sum + (t.costEstimate || 0), 0);
      
      result = {
        success: true,
        mode: 'batch',
        stats: {
          total: transcripts.length,
          successful,
          failed: transcripts.length - successful,
          totalCost: parseFloat(totalCost.toFixed(4)),
          processingTimeMs: Date.now() - startTime,
        },
        transcripts,
      };
    } else {
      // Mode 2: Search and transcribe for bike comparison
      console.log(`[Transcribe API] Comparison mode: ${bike1} vs ${bike2}`);
      
      const comparisonResult = await scraper.scrapeForComparison(bike1!, bike2!, {
        maxVideos,
        includeIndividual: true,
      });
      
      result = {
        success: true,
        mode: 'comparison',
        bikes: { bike1, bike2 },
        videos: comparisonResult.videos,
        transcripts: comparisonResult.transcripts,
        stats: {
          ...comparisonResult.stats,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    // Cleanup temp files
    await scraper.cleanup();

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Transcribe API] Error:', error);
    
    return NextResponse.json(
      {
        error: 'Transcription failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check transcription service status
 */
export async function GET() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasDeepgram = !!process.env.DEEPGRAM_API_KEY;
  
  // Test if yt-dlp is available
  let ytdlpAvailable = false;
  let ytdlpVersion = '';
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync('yt-dlp --version', { timeout: 5000 });
    ytdlpAvailable = true;
    ytdlpVersion = stdout.trim();
  } catch {
    ytdlpAvailable = false;
  }

  // Test if ffmpeg is available (needed for chunking)
  let ffmpegAvailable = false;
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync('ffmpeg -version', { timeout: 5000 });
    ffmpegAvailable = true;
  } catch {
    ffmpegAvailable = false;
  }

  return NextResponse.json({
    status: 'ok',
    services: {
      youtubeCaptions: {
        enabled: true,
        note: 'Free, no API key required',
      },
      whisper: {
        enabled: hasOpenAI,
        configured: hasOpenAI,
        cost: '$0.006/minute',
        note: hasOpenAI ? 'OpenAI Whisper API ready' : 'Add OPENAI_API_KEY to enable',
      },
      deepgram: {
        enabled: hasDeepgram,
        configured: hasDeepgram,
        cost: '$0.0043/minute',
        note: hasDeepgram ? 'Deepgram Nova-2 ready (best for Hindi)' : 'Add DEEPGRAM_API_KEY to enable',
      },
    },
    dependencies: {
      ytdlp: {
        available: ytdlpAvailable,
        version: ytdlpVersion || 'Not installed',
        note: ytdlpAvailable
          ? 'yt-dlp ready for audio downloads'
          : 'Install yt-dlp: pip install yt-dlp',
      },
      ffmpeg: {
        available: ffmpegAvailable,
        note: ffmpegAvailable
          ? 'ffmpeg ready for audio chunking'
          : 'Install ffmpeg for large file support',
      },
    },
    fallbackChain: [
      '1. YouTube Captions (FREE)',
      hasOpenAI ? '2. OpenAI Whisper ($0.006/min)' : '2. [Disabled] OpenAI Whisper',
      hasDeepgram ? '3. Deepgram Nova-2 ($0.0043/min)' : '3. [Disabled] Deepgram Nova-2',
    ],
  });
}

