// Smart YouTube search query generation

interface SearchQuery {
  query: string;
  priority: number;  // 1 = highest
  contentType: 'review' | 'comparison' | 'ownership' | 'technical' | 'problems';
  maxResults: number;
}

/**
 * Generate targeted search queries for a bike
 */
export function generateSearchQueries(bikeName: string): SearchQuery[] {
  // Normalize bike name
  const normalizedName = normalizeBikeName(bikeName);
  const shortName = getShortName(bikeName);
  
  return [
    // High priority: Professional reviews
    {
      query: `${normalizedName} review PowerDrift`,
      priority: 1,
      contentType: 'review' as const,
      maxResults: 3
    },
    {
      query: `${normalizedName} review BikeWale`,
      priority: 1,
      contentType: 'review' as const,
      maxResults: 3
    },
    {
      query: `${normalizedName} review xBhp`,
      priority: 1,
      contentType: 'review' as const,
      maxResults: 2
    },
    
    // High priority: Owner experiences
    {
      query: `${normalizedName} ownership review ${new Date().getFullYear()}`,
      priority: 1,
      contentType: 'ownership' as const,
      maxResults: 4
    },
    {
      query: `${shortName} 10000 km review`,
      priority: 1,
      contentType: 'ownership' as const,
      maxResults: 3
    },
    {
      query: `${shortName} 1 year ownership`,
      priority: 2,
      contentType: 'ownership' as const,
      maxResults: 3
    },
    
    // Medium priority: Problems and issues
    {
      query: `${normalizedName} problems issues`,
      priority: 2,
      contentType: 'problems' as const,
      maxResults: 3
    },
    {
      query: `${shortName} service cost maintenance`,
      priority: 2,
      contentType: 'technical' as const,
      maxResults: 2
    },
    
    // Medium priority: Specific aspects
    {
      query: `${normalizedName} mileage real world`,
      priority: 2,
      contentType: 'technical' as const,
      maxResults: 2
    },
    {
      query: `${shortName} highway performance top speed`,
      priority: 3,
      contentType: 'technical' as const,
      maxResults: 2
    },
    {
      query: `${shortName} city traffic review`,
      priority: 3,
      contentType: 'review' as const,
      maxResults: 2
    },
    
    // Lower priority: Additional content
    {
      query: `${normalizedName} pillion comfort`,
      priority: 3,
      contentType: 'review' as const,
      maxResults: 2
    },
    {
      query: `${shortName} touring long ride`,
      priority: 3,
      contentType: 'ownership' as const,
      maxResults: 2
    }
  ];
}

/**
 * Normalize bike name for consistent searches
 */
function normalizeBikeName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .trim()
    // Standardize common variations
    .replace(/RE\s/i, 'Royal Enfield ')
    .replace(/KTM\s(\d)/i, 'KTM Duke $1')
    .replace(/TVS\s/i, 'TVS ')
    .replace(/(\d+)\s*cc/i, '$1');
}

/**
 * Get short name for broader searches
 */
function getShortName(name: string): string {
  // "Royal Enfield Hunter 350" -> "Hunter 350"
  // "KTM 390 Duke" -> "390 Duke"
  const parts = name.split(' ');
  
  // If starts with brand, remove it
  const brands = ['Royal', 'Enfield', 'KTM', 'TVS', 'Bajaj', 'Honda', 'Yamaha', 'Suzuki', 'Hero', 'Kawasaki'];
  
  while (parts.length > 2 && brands.some(b => parts[0].toLowerCase() === b.toLowerCase())) {
    parts.shift();
  }
  
  return parts.join(' ');
}

/**
 * Generate comparison-specific queries
 */
export function generateComparisonQueries(bike1: string, bike2: string): SearchQuery[] {
  const short1 = getShortName(bike1);
  const short2 = getShortName(bike2);
  
  return [
    {
      query: `${short1} vs ${short2} comparison`,
      priority: 1,
      contentType: 'comparison' as const,
      maxResults: 5
    },
    {
      query: `${short1} ${short2} which is better`,
      priority: 1,
      contentType: 'comparison' as const,
      maxResults: 3
    },
    {
      query: `${short2} vs ${short1}`,  // Reverse order catches different videos
      priority: 2,
      contentType: 'comparison' as const,
      maxResults: 3
    }
  ];
}

