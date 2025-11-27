import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

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
    
    console.log('[xBhp] Scraping not implemented (removed from workflow)');
    
    // xBhp scraping has been removed from the workflow
    // This endpoint is kept for backwards compatibility but returns empty data
    return NextResponse.json({
      success: true,
      data: {
        bike1: {
          name: bike1,
          threads: []
        },
        bike2: {
          name: bike2,
          threads: []
        },
        metadata: {
          scraped_at: new Date().toISOString(),
          source: 'xbhp_disabled',
          note: 'xBhp scraping has been removed from the workflow',
          total_threads: 0,
          total_posts: 0
        }
      },
      source: 'xbhp',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('[xBhp] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'xBhp scraping not available',
        details: error.message
      },
      { status: 500 }
    );
  }
}

