// API route for YouTube Data API scraping

import { NextRequest, NextResponse } from 'next/server';
import { scrapeYouTubeForComparison } from '@/lib/scrapers/youtube-scraper';

export const maxDuration = 60; // Allow up to 60 seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bike1, bike2 } = body;

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

    // Scrape YouTube using official API
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

