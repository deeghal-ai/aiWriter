import { NextRequest, NextResponse } from 'next/server';
import { execa } from 'execa';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 120; // 120 seconds (2 minutes)

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
    
    const pythonScript = path.join(
      process.cwd(),
      'src',
      'lib',
      'scrapers',
      'reddit_scraper.py'
    );
    
    console.log('[Reddit] Starting scrape for:', bike1, 'vs', bike2);
    
    // Execute Python script (no credentials needed!)
    // Using system python3 (no venv required)
    const { stdout, stderr } = await execa('python3', [
      pythonScript,
      bike1,
      bike2
    ], {
      timeout: 120000 // 120 second timeout (2 minutes)
    });
    
    if (stderr) {
      console.log('[Reddit] Stderr output:', stderr);
    }
    
    const results = JSON.parse(stdout);
    
    if (results.error) {
      console.error('[Reddit] Scraping error:', results.error);
      return NextResponse.json(
        { error: results.error },
        { status: 500 }
      );
    }
    
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

