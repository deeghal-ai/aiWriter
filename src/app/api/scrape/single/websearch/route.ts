/**
 * Single Vehicle Web Search API Route
 * 
 * Searches the web for vehicle data including specs, variants, pricing, and lifecycle info.
 * Uses configurable search providers (SerpAPI, Tavily, or mock data).
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  searchVehicleData, 
  formatWebSearchForAI,
  extractStructuredData,
  type SingleVehicleWebData,
  type WebSearchConfig
} from '@/lib/scrapers/web-search';

export const maxDuration = 60; // Allow up to 1 minute for web searches

interface SingleVehicleWebSearchRequest {
  vehicle: string;
  provider?: 'serpapi' | 'tavily' | 'mock';
}

export async function POST(request: NextRequest) {
  try {
    const body: SingleVehicleWebSearchRequest = await request.json();
    const { vehicle, provider } = body;

    // Validate input
    if (!vehicle || !vehicle.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vehicle name is required' },
        { status: 400 }
      );
    }

    // Determine provider based on available API keys
    const serpApiKey = process.env.SERPAPI_API_KEY;
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    
    let effectiveProvider: WebSearchConfig['provider'] = 'mock';
    let apiKey: string | undefined;
    
    if (provider === 'serpapi' && serpApiKey) {
      effectiveProvider = 'serpapi';
      apiKey = serpApiKey;
    } else if (provider === 'tavily' && tavilyApiKey) {
      effectiveProvider = 'tavily';
      apiKey = tavilyApiKey;
    } else if (serpApiKey) {
      effectiveProvider = 'serpapi';
      apiKey = serpApiKey;
    } else if (tavilyApiKey) {
      effectiveProvider = 'tavily';
      apiKey = tavilyApiKey;
    } else {
      // Use mock data if no API keys configured
      effectiveProvider = 'mock';
      console.log('[WebSearch] No API keys configured, using mock data');
    }

    console.log(`[WebSearch] Starting search for: ${vehicle}`);
    console.log(`[WebSearch] Provider: ${effectiveProvider}`);

    const webData = await searchVehicleData(vehicle.trim(), {
      provider: effectiveProvider,
      apiKey,
      country: 'in',
      language: 'en',
    });

    // Extract structured data from search results
    const structuredData = extractStructuredData(webData);

    // Count total search results
    const totalResults = 
      webData.specs.results.length +
      webData.variants.results.length +
      webData.pricing.results.length +
      webData.lifecycle.results.length +
      webData.salesData.results.length +
      webData.competitors.results.length;

    console.log(`[WebSearch] Completed search for ${vehicle}`);
    console.log(`[WebSearch] Total results: ${totalResults} across 6 categories`);

    return NextResponse.json({
      success: true,
      data: webData,
      structured: structuredData,
      formatted: formatWebSearchForAI(webData),
      source: 'websearch',
      provider: effectiveProvider,
      timestamp: new Date().toISOString(),
      metadata: {
        vehicle: vehicle.trim(),
        totalResults,
        categories: {
          specs: webData.specs.results.length,
          variants: webData.variants.results.length,
          pricing: webData.pricing.results.length,
          lifecycle: webData.lifecycle.results.length,
          salesData: webData.salesData.results.length,
          competitors: webData.competitors.results.length,
        },
        isMockData: effectiveProvider === 'mock',
      }
    });

  } catch (error) {
    console.error('[WebSearch] Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to search web data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const serpApiKey = process.env.SERPAPI_API_KEY;
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  
  let provider = 'mock';
  if (serpApiKey) provider = 'serpapi';
  else if (tavilyApiKey) provider = 'tavily';
  
  return NextResponse.json({
    status: 'ok',
    endpoint: 'single-vehicle-websearch',
    providers: {
      serpapi: !!serpApiKey,
      tavily: !!tavilyApiKey,
      mock: true,
    },
    activeProvider: provider,
    message: provider !== 'mock'
      ? `Web search is configured using ${provider}` 
      : 'No API keys found. Using mock data. Add SERPAPI_API_KEY or TAVILY_API_KEY to environment variables for real search.'
  });
}
