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
    
    // Scrape Reddit using TypeScript scraper (works on Vercel!)
    const results = await scrapeRedditForComparison(bike1, bike2);
    
    console.log('[Reddit] Scraping complete:', {
      posts: results.metadata.total_posts,
      comments: results.metadata.total_comments
    });
    
    return NextResponse.json({
      success: true,
      data: results,
      source: 'reddit',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('[Reddit] Scraping error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to scrape Reddit',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

