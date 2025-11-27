// API route for YouTube Data API scraping

import { NextRequest, NextResponse } from 'next/server';
import { scrapeYouTubeForComparison } from '@/lib/scrapers/youtube-scraper';
import { scrapeYouTubeForComparisonEnhanced } from '@/lib/scrapers/youtube-scraper-enhanced';
import { formatForLegacySystem } from '@/lib/scrapers/format-for-ai';

export const maxDuration = 60; // Allow up to 60 seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bike1, bike2, useEnhanced = true } = body;

    // Validate input
    if (!bike1 || !bike2) {
      return NextResponse.json(
        { error: 'Both bike names are required' },
        { status: 400 }
      );
    }

    // Get YouTube API key from environment
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key not configured. Please add YOUTUBE_API_KEY to environment variables.' },
        { status: 500 }
      );
    }

    console.log(`Starting YouTube scraping for: ${bike1} vs ${bike2}`);
    console.log(`Using enhanced scraper: ${useEnhanced}`);

    if (useEnhanced) {
      // Use enhanced scraper with transcripts and quality scoring
      const enhancedData = await scrapeYouTubeForComparisonEnhanced(bike1, bike2, apiKey);

      console.log(`Enhanced YouTube scraping completed successfully`);
      console.log(`Bike 1: ${enhancedData.bike1.summary.total_videos} videos (${enhancedData.bike1.summary.trusted_channel_videos} trusted), ${enhancedData.bike1.summary.total_quality_comments} quality comments, ${enhancedData.bike1.summary.videos_with_transcripts} with transcripts`);
      console.log(`Bike 2: ${enhancedData.bike2.summary.total_videos} videos (${enhancedData.bike2.summary.trusted_channel_videos} trusted), ${enhancedData.bike2.summary.total_quality_comments} quality comments, ${enhancedData.bike2.summary.videos_with_transcripts} with transcripts`);
      console.log(`Comparison videos: ${enhancedData.comparison.length}`);

      // Convert to legacy format for backward compatibility with existing extraction logic
      const legacyFormatBike1 = {
        bike_name: enhancedData.bike1.bike_name,
        videos: enhancedData.bike1.videos.map(v => ({
          videoId: v.videoId,
          title: v.title,
          description: v.description,
          channelTitle: v.channelTitle,
          publishedAt: v.publishedAt,
          viewCount: v.viewCount.toString(),
          transcript: v.transcript || null, // Include transcript data!
          transcriptKeyMoments: v.transcriptKeyMoments || [], // Include key moments!
          comments: v.comments.map(c => ({
            author: c.author,
            text: c.text,
            likeCount: c.likeCount,
            publishedAt: new Date().toISOString()
          }))
        })),
        total_videos: enhancedData.bike1.summary.total_videos,
        total_comments: enhancedData.bike1.summary.total_quality_comments
      };

      const legacyFormatBike2 = {
        bike_name: enhancedData.bike2.bike_name,
        videos: enhancedData.bike2.videos.map(v => ({
          videoId: v.videoId,
          title: v.title,
          description: v.description,
          channelTitle: v.channelTitle,
          publishedAt: v.publishedAt,
          viewCount: v.viewCount.toString(),
          transcript: v.transcript || null, // Include transcript data!
          transcriptKeyMoments: v.transcriptKeyMoments || [], // Include key moments!
          comments: v.comments.map(c => ({
            author: c.author,
            text: c.text,
            likeCount: c.likeCount,
            publishedAt: new Date().toISOString()
          }))
        })),
        total_videos: enhancedData.bike2.summary.total_videos,
        total_comments: enhancedData.bike2.summary.total_quality_comments
      };

      return NextResponse.json({
        success: true,
        data: {
          bike1: legacyFormatBike1,
          bike2: legacyFormatBike2
        },
        enhanced: enhancedData, // Keep enhanced data for reference
        source: 'youtube-enhanced',
        timestamp: new Date().toISOString()
      });
    } else {
      // Use regular scraper (legacy)
      const scrapedData = await scrapeYouTubeForComparison(bike1, bike2, apiKey);

      console.log(`YouTube scraping completed successfully`);
      console.log(`Bike 1: ${scrapedData.bike1.total_videos} videos, ${scrapedData.bike1.total_comments} comments`);
      console.log(`Bike 2: ${scrapedData.bike2.total_videos} videos, ${scrapedData.bike2.total_comments} comments`);

      return NextResponse.json({
        success: true,
        data: scrapedData,
        source: 'youtube',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error in YouTube scraping API:', error);
    
    // Check if it's a YouTube API error
    if (error instanceof Error && error.message.includes('YouTube API error')) {
      return NextResponse.json(
        { 
          error: 'YouTube API request failed',
          details: error.message,
          suggestion: 'Check if your YouTube API key is valid and has quota remaining'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to scrape YouTube',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to check API health
export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  return NextResponse.json({
    status: 'ok',
    apiKeyConfigured: !!apiKey,
    message: apiKey 
      ? 'YouTube API is configured and ready' 
      : 'YouTube API key not found. Add YOUTUBE_API_KEY to environment variables.'
  });
}

