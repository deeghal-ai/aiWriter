/**
 * Single Vehicle Internal Data API Route
 * 
 * Fetches user reviews and expert insights from BikeDekho's internal API
 * for a single vehicle.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  isInternalApiConfigured,
  getInternalApiStatus,
  USE_MOCK_DATA,
  INTERNAL_API_BASE_URL,
  INTERNAL_API_KEY,
  INTERNAL_API_TIMEOUT,
  type InternalBikeData,
  type InternalReview,
  type ExpertInsight
} from '@/lib/data-sources/internal-api';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute timeout

interface SingleInternalRequest {
  vehicle: string;
}

interface SingleInternalResult {
  vehicle: string;
  reviews: InternalReview[];
  expertInsights?: ExpertInsight[];
  specifications?: Record<string, string>;
  metadata: {
    source: string;
    fetchedAt: string;
    totalReviews: number;
    isMockData: boolean;
  };
}

/**
 * Fetch internal data for a single vehicle
 */
async function fetchSingleVehicleInternalData(vehicleName: string): Promise<InternalBikeData> {
  if (!isInternalApiConfigured()) {
    throw new Error('Internal API not configured');
  }
  
  try {
    const url = new URL(INTERNAL_API_BASE_URL);
    url.searchParams.set('vehicle', vehicleName);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (INTERNAL_API_KEY) {
      headers['Authorization'] = `Bearer ${INTERNAL_API_KEY}`;
    }
    
    console.log(`[Single Internal] Fetching data for ${vehicleName}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), INTERNAL_API_TIMEOUT);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform response to expected format
    return transformSingleVehicleResponse(data, vehicleName);
    
  } catch (error: any) {
    console.error('[Single Internal] Fetch error:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. The API took too long to respond.');
    }
    
    throw error;
  }
}

/**
 * Transform API response to expected format
 */
function transformSingleVehicleResponse(apiResponse: any, vehicleName: string): InternalBikeData {
  // If API returns in expected format
  if (apiResponse.bikeName && apiResponse.reviews) {
    return apiResponse;
  }
  
  // If API returns array of reviews
  if (Array.isArray(apiResponse.reviews)) {
    return {
      bikeName: vehicleName,
      reviews: apiResponse.reviews.map((r: any, index: number) => ({
        id: r.id || r.reviewId || `review-${index}`,
        author: {
          name: r.author?.name || r.userName || r.authorName || 'User',
          isVerifiedOwner: r.author?.isVerifiedOwner || r.verifiedOwner || false,
          ownershipDuration: r.author?.ownershipDuration || r.ownershipPeriod,
          kmsDriven: r.author?.kmsDriven || r.kilometresDriven
        },
        title: r.title || r.reviewTitle || 'User Review',
        content: r.content || r.reviewText || r.review || '',
        rating: r.rating || r.stars,
        pros: r.pros || r.positives || [],
        cons: r.cons || r.negatives || [],
        helpfulVotes: r.helpfulVotes || r.likes || 0,
        createdAt: r.createdAt || r.date || new Date().toISOString()
      })),
      expertInsights: apiResponse.expertInsights
    };
  }
  
  // Fallback
  console.warn('[Single Internal] Could not transform API response');
  return {
    bikeName: vehicleName,
    reviews: []
  };
}

/**
 * Generate mock data for testing
 */
function getMockSingleVehicleData(vehicleName: string): InternalBikeData {
  return {
    bikeName: vehicleName,
    reviews: [
      {
        id: 'mock-single-1',
        author: {
          name: 'Rahul_Bangalore',
          isVerifiedOwner: true,
          ownershipDuration: '8 months',
          kmsDriven: 12000
        },
        title: `Comprehensive review of the ${vehicleName}`,
        content: `After 12000 kms with the ${vehicleName}, I can say it's been a solid performer. Engine is refined, handling is precise, and the build quality is excellent. Only complaint is the seat comfort on longer rides. The heat management could be better in bumper-to-bumper traffic.`,
        rating: 4.5,
        pros: ['Engine refinement', 'Handling', 'Build quality', 'Service network'],
        cons: ['Seat comfort on long rides', 'Heat in traffic'],
        helpfulVotes: 47,
        createdAt: '2025-01-10T14:30:00Z'
      },
      {
        id: 'mock-single-2',
        author: {
          name: 'Priya_Mumbai',
          isVerifiedOwner: true,
          ownershipDuration: '1 year',
          kmsDriven: 8000
        },
        title: 'Daily commute champion',
        content: `I use my ${vehicleName} for 25km daily commute in Mumbai. It's nimble in traffic and has enough power for expressway merges. Fuel economy is excellent at 42kmpl. Maintenance costs are reasonable.`,
        rating: 4,
        pros: ['Fuel economy', 'City handling', 'Low maintenance', 'Nimble'],
        cons: ['Could use more power on highways', 'Pillion seat is small'],
        helpfulVotes: 32,
        createdAt: '2025-01-05T10:15:00Z'
      },
      {
        id: 'mock-single-3',
        author: {
          name: 'Vikram_Delhi',
          isVerifiedOwner: true,
          ownershipDuration: '6 months',
          kmsDriven: 5000
        },
        title: 'Perfect for weekend getaways',
        content: `The ${vehicleName} handles highway trips very well. Did Delhi to Manali without any issues. The suspension absorbs bumps nicely and the engine has good low-end torque for mountain roads.`,
        rating: 4.5,
        pros: ['Highway stability', 'Suspension comfort', 'Torque delivery'],
        cons: ['Wind protection could be better', 'Tank range is limited'],
        helpfulVotes: 28,
        createdAt: '2025-01-08T09:00:00Z'
      }
    ],
    expertInsights: [
      {
        category: 'Value',
        insight: `The ${vehicleName} offers competitive power-to-price ratio in its segment. Consider total cost of ownership including service intervals.`,
        author: 'BikeDekho Expert Team',
        isPositive: true
      },
      {
        category: 'Performance',
        insight: `The ${vehicleName} delivers reliable performance for daily commutes and occasional highway runs.`,
        author: 'BikeDekho Expert Team',
        isPositive: true
      }
    ]
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SingleInternalRequest = await request.json();
    const { vehicle } = body;
    
    if (!vehicle || !vehicle.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vehicle name is required' },
        { status: 400 }
      );
    }
    
    console.log(`[Single Internal] Fetching data for ${vehicle}`);
    
    // Check if we should use mock data
    if (USE_MOCK_DATA) {
      console.log('[Single Internal] Using mock data (USE_MOCK_INTERNAL_DATA=true)');
      const mockData = getMockSingleVehicleData(vehicle.trim());
      
      const result: SingleInternalResult = {
        vehicle: vehicle.trim(),
        reviews: mockData.reviews,
        expertInsights: mockData.expertInsights,
        metadata: {
          source: 'BikeDekho (Mock)',
          fetchedAt: new Date().toISOString(),
          totalReviews: mockData.reviews.length,
          isMockData: true
        }
      };
      
      return NextResponse.json({
        success: true,
        data: result,
        source: 'internal-mock',
        timestamp: new Date().toISOString()
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
    const internalData = await fetchSingleVehicleInternalData(vehicle.trim());
    
    const result: SingleInternalResult = {
      vehicle: vehicle.trim(),
      reviews: internalData.reviews,
      expertInsights: internalData.expertInsights,
      specifications: internalData.specifications,
      metadata: {
        source: 'BikeDekho',
        fetchedAt: new Date().toISOString(),
        totalReviews: internalData.reviews.length,
        isMockData: false
      }
    };
    
    console.log(`[Single Internal] ✅ Fetched ${result.reviews.length} reviews for ${vehicle}`);
    
    return NextResponse.json({
      success: true,
      data: result,
      source: 'internal',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('[Single Internal] Error:', error);
    
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
    status: 'ok',
    endpoint: 'single-vehicle-internal',
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
