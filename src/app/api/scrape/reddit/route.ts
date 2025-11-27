import { NextRequest, NextResponse } from 'next/server';
import { scrapeRedditForComparison } from '@/lib/scrapers/reddit-scraper';

export const maxDuration = 60; // 60 seconds for scraping

interface RedditScrapeRequest {
  bike1: string;
  bike2: string;
}

export async function POST(request: NextRequest) {
  try {
    const { bike1, bike2 }: RedditScrapeRequest = await request.json();
    
    if (!bike1 || !bike2) {
      return NextResponse.json(
        { error: 'Both bike names are required' },
        { status: 400 }
      );
    }
    
    console.log('[Reddit] Starting scrape for:', bike1, 'vs', bike2);
    console.log('[Reddit] Environment:', process.env.VERCEL ? 'Vercel' : 'Local');
    
    // Scrape Reddit using TypeScript scraper
    const results = await scrapeRedditForComparison(bike1, bike2);
    
    console.log('[Reddit] Scraping complete:', {
      posts: results.metadata.total_posts,
      comments: results.metadata.total_comments
    });
    
    // Check if Reddit blocked us
    const wasBlocked = results.metadata.source === 'reddit_blocked';
    
    return NextResponse.json({
      success: true,
      data: results,
      source: 'reddit',
      timestamp: new Date().toISOString(),
      warning: wasBlocked ? 'Reddit blocked cloud server access. No data retrieved. App will continue with limited data.' : undefined
    });
    
  } catch (error: any) {
    console.error('[Reddit] Scraping error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Provide more detailed error message
    let errorMessage = 'Failed to scrape Reddit';
    let errorDetails = error.message;
    
    if (error.message?.includes('429')) {
      errorMessage = 'Reddit rate limit exceeded';
      errorDetails = 'Please try again in a few moments';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Reddit request timed out';
      errorDetails = 'The request took too long. Please try again';
    } else if (error.message?.includes('network')) {
      errorMessage = 'Network error accessing Reddit';
      errorDetails = 'Please check your connection and try again';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        technicalDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

