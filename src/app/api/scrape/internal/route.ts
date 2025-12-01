/**
 * Internal BikeDekho Data API Route
 * 
 * Fetches user reviews and expert insights from BikeDekho's internal API.
 * Configure the API endpoint in src/lib/data-sources/internal-api.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchInternalData, 
  isInternalApiConfigured,
  getInternalApiStatus,
  getMockInternalData,
  USE_MOCK_DATA
} from '@/lib/data-sources/internal-api';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute timeout

interface InternalScrapeRequest {
  bike1: string;
  bike2: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: InternalScrapeRequest = await request.json();
    
    // Validate request
    if (!body.bike1 || !body.bike2) {
      return NextResponse.json(
        { success: false, error: 'Both bike names are required' },
        { status: 400 }
      );
    }
    
    console.log(`[InternalScrape] Fetching data for ${body.bike1} vs ${body.bike2}`);
    
    // Check if we should use mock data (for testing)
    if (USE_MOCK_DATA) {
      console.log('[InternalScrape] Using mock data (USE_MOCK_INTERNAL_DATA=true)');
      const mockData = getMockInternalData(body.bike1, body.bike2);
      
      return NextResponse.json({
        success: true,
        data: {
          bike1: mockData.bike1,
          bike2: mockData.bike2,
          metadata: {
            source: 'BikeDekho (Mock)',
            fetchedAt: new Date().toISOString(),
            bike1Reviews: mockData.bike1.reviews.length,
            bike2Reviews: mockData.bike2.reviews.length,
            isMockData: true
          }
        }
      });
    }
    
    // Check if API is configured
    if (!isInternalApiConfigured()) {
      const status = getInternalApiStatus();
      return NextResponse.json(
        { 
          success: false, 
          error: 'Internal API not configured',
          details: status.message,
          configRequired: true
        },
        { status: 503 }
      );
    }
    
    // Fetch from internal API
    const result = await fetchInternalData(body.bike1, body.bike2);
    
    if (!result.success || !result.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to fetch internal data' 
        },
        { status: 500 }
      );
    }
    
    // Return formatted response
    return NextResponse.json({
      success: true,
      data: {
        bike1: result.data.bike1,
        bike2: result.data.bike2,
        metadata: {
          source: 'BikeDekho',
          fetchedAt: new Date().toISOString(),
          bike1Reviews: result.data.bike1.reviews.length,
          bike2Reviews: result.data.bike2.reviews.length,
          bike1ExpertInsights: result.data.bike1.expertInsights?.length || 0,
          bike2ExpertInsights: result.data.bike2.expertInsights?.length || 0
        }
      }
    });
    
  } catch (error: any) {
    console.error('[InternalScrape] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch internal data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Health check / status endpoint
export async function GET() {
  const status = getInternalApiStatus();
  
  return NextResponse.json({
    endpoint: 'internal',
    configured: status.configured,
    message: status.message,
    mockDataEnabled: USE_MOCK_DATA,
    instructions: !status.configured ? [
      '1. Get API endpoint from internal team',
      '2. Add to .env.local: BIKEDEKHO_API_URL=https://your-api-endpoint',
      '3. Optionally add: BIKEDEKHO_API_KEY=your-api-key',
      '4. For testing, set: USE_MOCK_INTERNAL_DATA=true'
    ] : undefined
  });
}

