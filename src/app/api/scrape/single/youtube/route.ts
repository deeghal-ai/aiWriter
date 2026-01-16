/**
 * Single Vehicle YouTube Scraping API Route
 * 
 * Scrapes YouTube data for a single vehicle (bike or car).
 * Reuses existing scraping infrastructure from the comparison flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeYouTubeForBike } from '@/lib/scrapers/youtube-scraper';
import { scrapeYouTubeEnhanced, type EnhancedScrapedData } from '@/lib/scrapers/youtube-scraper-enhanced';

export const maxDuration = 300; // Allow up to 5 minutes for transcript processing

interface SingleVehicleYouTubeRequest {
  vehicle: string;
  useEnhanced?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: SingleVehicleYouTubeRequest = await request.json();
    const { vehicle, useEnhanced = true } = body;

    // Validate input
    if (!vehicle || !vehicle.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vehicle name is required' },
        { status: 400 }
      );
    }

    // Get YouTube API key from environment
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'YouTube API key not configured. Please add YOUTUBE_API_KEY to environment variables.' },
        { status: 500 }
      );
    }

    console.log(`[Single YouTube] Starting scrape for: ${vehicle}`);
    console.log(`[Single YouTube] Using enhanced scraper: ${useEnhanced}`);

    if (useEnhanced) {
      // Use enhanced scraper with transcripts and quality scoring
      const enhancedData = await scrapeYouTubeEnhanced(vehicle.trim(), apiKey);

      console.log(`[Single YouTube] Enhanced scraping completed`);
      console.log(`[Single YouTube] ${enhancedData.summary.total_videos} videos (${enhancedData.summary.trusted_channel_videos} trusted), ${enhancedData.summary.total_quality_comments} quality comments, ${enhancedData.summary.videos_with_transcripts} with transcripts`);

      // Convert to legacy format for consistency
      const legacyFormat = {
        bike_name: enhancedData.bike_name,
        videos: enhancedData.videos.map(v => ({
          videoId: v.videoId,
          title: v.title,
          description: v.description,
          channelTitle: v.channelTitle,
          publishedAt: v.publishedAt,
          viewCount: v.viewCount.toString(),
          transcript: v.transcript || null,
          transcriptKeyMoments: v.transcriptKeyMoments || [],
          comments: v.comments.map(c => ({
            author: c.author,
            text: c.text,
            likeCount: c.likeCount,
            publishedAt: new Date().toISOString()
          }))
        })),
        total_videos: enhancedData.summary.total_videos,
        total_comments: enhancedData.summary.total_quality_comments
      };

      return NextResponse.json({
        success: true,
        data: legacyFormat,
        enhanced: enhancedData,
        source: 'youtube-enhanced',
        timestamp: new Date().toISOString(),
        metadata: {
          vehicle: vehicle.trim(),
          totalVideos: enhancedData.summary.total_videos,
          trustedChannelVideos: enhancedData.summary.trusted_channel_videos,
          videosWithTranscripts: enhancedData.summary.videos_with_transcripts,
          totalQualityComments: enhancedData.summary.total_quality_comments
        }
      });
    } else {
      // Use regular scraper (legacy)
      const scrapedData = await scrapeYouTubeForBike(vehicle.trim(), apiKey);

      console.log(`[Single YouTube] Scraping completed`);
      console.log(`[Single YouTube] ${scrapedData.total_videos} videos, ${scrapedData.total_comments} comments`);

      return NextResponse.json({
        success: true,
        data: scrapedData,
        source: 'youtube',
        timestamp: new Date().toISOString(),
        metadata: {
          vehicle: vehicle.trim(),
          totalVideos: scrapedData.total_videos,
          totalComments: scrapedData.total_comments
        }
      });
    }

  } catch (error) {
    console.error('[Single YouTube] Error:', error);
    
    // Check if it's a YouTube API error
    if (error instanceof Error && error.message.includes('YouTube API error')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'YouTube API request failed',
          details: error.message,
          suggestion: 'Check if your YouTube API key is valid and has quota remaining'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to scrape YouTube',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  return NextResponse.json({
    status: 'ok',
    endpoint: 'single-vehicle-youtube',
    apiKeyConfigured: !!apiKey,
    message: apiKey 
      ? 'YouTube API is configured and ready for single vehicle scraping' 
      : 'YouTube API key not found. Add YOUTUBE_API_KEY to environment variables.'
  });
}
