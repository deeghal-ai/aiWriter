import { NextRequest, NextResponse } from 'next/server';
import { execa } from 'execa';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 90; // 90 seconds (xBhp is slower)

interface XbhpScrapeRequest {
  bike1: string;
  bike2: string;
}

export async function POST(request: NextRequest) {
  try {
    const { bike1, bike2 }: XbhpScrapeRequest = await request.json();
    
    if (!bike1 || !bike2) {
      return NextResponse.json(
        { error: 'Both bike names are required' },
        { status: 400 }
      );
    }
    
    // Using fallback scraper due to xBhp scraping limitations
    // TODO: Implement real xBhp scraping with API access or Selenium
    const pythonScript = path.join(
      process.cwd(),
      'src',
      'lib',
      'scrapers',
      'xbhp_scraper_fallback.py'
    );
    
    console.log('[xBhp] Starting scrape for:', bike1, 'vs', bike2);
    
    // Using system python3 (no venv required)
    const { stdout, stderr } = await execa('python3', [
      pythonScript,
      bike1,
      bike2
    ], {
      timeout: 90000 // 90 second timeout
    });
    
    if (stderr) {
      console.log('[xBhp] Stderr output:', stderr);
    }
    
    const results = JSON.parse(stdout);
    
    if (results.error) {
      console.error('[xBhp] Scraping error:', results.error);
      return NextResponse.json(
        { error: results.error },
        { status: 500 }
      );
    }
    
    console.log('[xBhp] Scraping complete:', {
      threads: results.metadata.total_threads,
      posts: results.metadata.total_posts
    });
    
    return NextResponse.json({
      success: true,
      data: results,
      source: 'xbhp',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('[xBhp] Scraping error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to scrape xBhp',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

