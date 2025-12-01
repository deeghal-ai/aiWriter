/**
 * Internal BikeDekho API Configuration
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * ▶ PASTE YOUR API ENDPOINT HERE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * When you receive the API endpoint from your internal team, configure it below.
 * 
 * Options:
 * 1. Set via environment variable (recommended for production):
 *    Add to .env.local: BIKEDEKHO_API_URL=https://api.bikedekho.com/reviews
 * 
 * 2. Hardcode below (for testing):
 *    const INTERNAL_API_BASE_URL = 'https://api.bikedekho.com/reviews';
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - Edit these values
// ═══════════════════════════════════════════════════════════════════════════════

// API Base URL - Set via env var or hardcode here
export const INTERNAL_API_BASE_URL = process.env.BIKEDEKHO_API_URL || '';

// API Key (if required) - Set via env var
export const INTERNAL_API_KEY = process.env.BIKEDEKHO_API_KEY || '';

// Request timeout in milliseconds
export const INTERNAL_API_TIMEOUT = 30000; // 30 seconds

// ═══════════════════════════════════════════════════════════════════════════════
// API STATUS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if internal API is configured
 */
export function isInternalApiConfigured(): boolean {
  return !!INTERNAL_API_BASE_URL && INTERNAL_API_BASE_URL.length > 0;
}

/**
 * Get API configuration status for UI display
 */
export function getInternalApiStatus(): {
  configured: boolean;
  message: string;
} {
  if (!INTERNAL_API_BASE_URL) {
    return {
      configured: false,
      message: 'Internal API not configured. Add BIKEDEKHO_API_URL to .env.local'
    };
  }
  
  return {
    configured: true,
    message: `Connected to: ${INTERNAL_API_BASE_URL}`
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface InternalApiResponse {
  success: boolean;
  data?: {
    bike1: InternalBikeData;
    bike2: InternalBikeData;
  };
  error?: string;
}

export interface InternalBikeData {
  bikeName: string;
  bikeId?: string;
  reviews: InternalReview[];
  expertInsights?: ExpertInsight[];
  specifications?: Record<string, string>;
}

export interface InternalReview {
  id: string;
  author: {
    name: string;
    isVerifiedOwner: boolean;
    ownershipDuration?: string;
    kmsDriven?: number;
  };
  title: string;
  content: string;
  rating?: number;
  pros?: string[];
  cons?: string[];
  helpfulVotes?: number;
  createdAt: string;
}

export interface ExpertInsight {
  category: string;
  insight: string;
  author: string;
  isPositive: boolean;
}

/**
 * Fetch internal data for a bike comparison
 * 
 * Modify this function to match your actual API structure.
 * Current implementation assumes API returns data in our expected format.
 */
export async function fetchInternalData(
  bike1Name: string,
  bike2Name: string
): Promise<InternalApiResponse> {
  if (!isInternalApiConfigured()) {
    return {
      success: false,
      error: 'Internal API not configured'
    };
  }
  
  try {
    // Build request URL - modify based on your API structure
    // Option 1: Query parameters
    const url = new URL(INTERNAL_API_BASE_URL);
    url.searchParams.set('bike1', bike1Name);
    url.searchParams.set('bike2', bike2Name);
    
    // Option 2: If your API uses POST with body, modify the fetch below
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add API key if configured
    if (INTERNAL_API_KEY) {
      headers['Authorization'] = `Bearer ${INTERNAL_API_KEY}`;
      // Or use: headers['X-API-Key'] = INTERNAL_API_KEY;
    }
    
    console.log(`[InternalAPI] Fetching data for ${bike1Name} vs ${bike2Name}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), INTERNAL_API_TIMEOUT);
    
    const response = await fetch(url.toString(), {
      method: 'GET',  // Change to 'POST' if your API requires it
      headers,
      signal: controller.signal,
      // For POST requests, uncomment:
      // body: JSON.stringify({ bike1: bike1Name, bike2: bike2Name })
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform API response to our expected format if needed
    // Modify this based on your actual API response structure
    const transformedData = transformApiResponse(data, bike1Name, bike2Name);
    
    console.log(`[InternalAPI] ✅ Fetched ${transformedData.bike1.reviews.length} reviews for ${bike1Name}`);
    console.log(`[InternalAPI] ✅ Fetched ${transformedData.bike2.reviews.length} reviews for ${bike2Name}`);
    
    return {
      success: true,
      data: transformedData
    };
    
  } catch (error: any) {
    console.error('[InternalAPI] Fetch error:', error);
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out. The API took too long to respond.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to fetch internal data'
    };
  }
}

/**
 * Transform API response to our expected format
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * ▶ MODIFY THIS FUNCTION to match your actual API response structure
 * ═══════════════════════════════════════════════════════════════════════════════
 */
function transformApiResponse(
  apiResponse: any,
  bike1Name: string,
  bike2Name: string
): { bike1: InternalBikeData; bike2: InternalBikeData } {
  // If API returns data in our expected format, return as-is
  if (apiResponse.bike1 && apiResponse.bike2) {
    return {
      bike1: apiResponse.bike1,
      bike2: apiResponse.bike2
    };
  }
  
  // If API returns array of reviews, split by bike name
  if (Array.isArray(apiResponse.reviews)) {
    const bike1Reviews = apiResponse.reviews.filter(
      (r: any) => r.bikeName?.toLowerCase().includes(bike1Name.toLowerCase())
    );
    const bike2Reviews = apiResponse.reviews.filter(
      (r: any) => r.bikeName?.toLowerCase().includes(bike2Name.toLowerCase())
    );
    
    return {
      bike1: {
        bikeName: bike1Name,
        reviews: transformReviews(bike1Reviews)
      },
      bike2: {
        bikeName: bike2Name,
        reviews: transformReviews(bike2Reviews)
      }
    };
  }
  
  // If API returns separate endpoints per bike, handle that
  // Add more transformations as needed based on your API
  
  // Fallback: return empty data
  console.warn('[InternalAPI] Could not transform API response, returning empty data');
  return {
    bike1: { bikeName: bike1Name, reviews: [] },
    bike2: { bikeName: bike2Name, reviews: [] }
  };
}

/**
 * Transform reviews to our expected format
 * Modify based on your API's review structure
 */
function transformReviews(reviews: any[]): InternalReview[] {
  return reviews.map((r: any, index: number) => ({
    id: r.id || r.reviewId || `review-${index}`,
    author: {
      name: r.author?.name || r.userName || r.authorName || 'BikeDekho User',
      isVerifiedOwner: r.author?.isVerifiedOwner || r.verifiedOwner || r.isOwner || false,
      ownershipDuration: r.author?.ownershipDuration || r.ownershipPeriod || undefined,
      kmsDriven: r.author?.kmsDriven || r.kilometresDriven || undefined
    },
    title: r.title || r.reviewTitle || 'User Review',
    content: r.content || r.reviewText || r.review || '',
    rating: r.rating || r.stars || undefined,
    pros: r.pros || r.positives || [],
    cons: r.cons || r.negatives || [],
    helpfulVotes: r.helpfulVotes || r.likes || r.upvotes || 0,
    createdAt: r.createdAt || r.date || r.timestamp || new Date().toISOString()
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA FOR TESTING (Remove in production)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate mock data for testing UI before API is ready
 * Set USE_MOCK_DATA=true in .env.local to enable
 */
export const USE_MOCK_DATA = process.env.USE_MOCK_INTERNAL_DATA === 'true';

export function getMockInternalData(
  bike1Name: string,
  bike2Name: string
): { bike1: InternalBikeData; bike2: InternalBikeData } {
  return {
    bike1: {
      bikeName: bike1Name,
      reviews: [
        {
          id: 'mock-1',
          author: {
            name: 'Rahul_Bangalore',
            isVerifiedOwner: true,
            ownershipDuration: '8 months',
            kmsDriven: 12000
          },
          title: 'Perfect for Bangalore traffic + weekend escapes',
          content: `After 12000 kms, the ${bike1Name} has been rock solid. The engine is butter smooth at city speeds and handles the ORR like a dream. Only complaint is the seat - my wife refuses pillion rides beyond 50km. Heat in traffic is manageable with the bash plate.`,
          rating: 4.5,
          pros: ['Engine refinement', 'Handling', 'Build quality', 'Service network'],
          cons: ['Seat comfort for pillion', 'Heat in traffic'],
          helpfulVotes: 47,
          createdAt: '2025-01-10T14:30:00Z'
        },
        {
          id: 'mock-2',
          author: {
            name: 'Priya_Mumbai',
            isVerifiedOwner: true,
            ownershipDuration: '1 year',
            kmsDriven: 8000
          },
          title: 'Daily commute champion',
          content: `I ride 25km daily in Mumbai traffic. The ${bike1Name} is nimble enough for lane splitting and has enough grunt to merge on the expressway. Fuel economy is excellent - getting 42kmpl consistently.`,
          rating: 4,
          pros: ['Fuel economy', 'City handling', 'Low maintenance'],
          cons: ['Could use more power on highways'],
          helpfulVotes: 32,
          createdAt: '2025-01-05T10:15:00Z'
        }
      ],
      expertInsights: [
        {
          category: 'Value',
          insight: `The ${bike1Name} offers segment-best power-to-price ratio, but factor in annual service costs`,
          author: 'BikeDekho Expert Team',
          isPositive: true
        }
      ]
    },
    bike2: {
      bikeName: bike2Name,
      reviews: [
        {
          id: 'mock-3',
          author: {
            name: 'Vikram_Delhi',
            isVerifiedOwner: true,
            ownershipDuration: '6 months',
            kmsDriven: 5000
          },
          title: 'Highway cruiser with character',
          content: `The ${bike2Name} is built for touring. Did Delhi to Manali and back without any fatigue. The torque at low RPM makes mountain roads a joy. City riding is a bit heavy though.`,
          rating: 4.5,
          pros: ['Touring comfort', 'Engine character', 'Build quality'],
          cons: ['Heavy for city', 'Fuel tank could be bigger'],
          helpfulVotes: 58,
          createdAt: '2025-01-08T09:00:00Z'
        }
      ],
      expertInsights: [
        {
          category: 'Comfort',
          insight: `The ${bike2Name} excels in long-distance comfort with its upright ergonomics`,
          author: 'BikeDekho Expert Team',
          isPositive: true
        }
      ]
    }
  };
}

