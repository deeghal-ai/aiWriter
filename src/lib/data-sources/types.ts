/**
 * Data Sources - Type Definitions
 * 
 * Unified interfaces for normalizing data from multiple sources
 * (YouTube, Reddit, Internal, and future sources)
 */

// ============ SOURCE CONFIGURATION ============

export type DataSourceId = 'youtube' | 'reddit' | 'internal' | 'xbhp';

export interface DataSourceConfig {
  id: DataSourceId;
  name: string;                    // Display name
  priority: number;                // Higher = preferred for conflict resolution
  enabled: boolean;
  trustScore: number;              // 1-100, affects quote weighting
  description?: string;
}

// ============ NORMALIZED DATA STRUCTURES ============

/**
 * Normalized comment/response from any source
 */
export interface NormalizedComment {
  id: string;
  text: string;
  author: string;
  source: DataSourceId;            // Which data source this came from
  sourceDisplay: string;           // Display name: 'YouTube', 'Reddit', 'BikeDekho'
  likes: number;
  qualityScore: number;            // 0-100, pre-calculated
  topics: string[];                // Detected topics
  isVerifiedOwner?: boolean;       // For internal source - verified bike owners
  ownershipContext?: string;       // "8 months, 12000km" - for credibility
}

/**
 * Normalized discussion/post/video from any source
 */
export interface NormalizedDiscussion {
  id: string;
  title: string;
  content: string;                 // Main post/video description/review text
  author: string;
  source: DataSourceId;
  sourceDisplay: string;
  sourceUrl?: string;
  publishedAt: string;             // ISO date
  
  // Engagement metrics (normalized 0-100)
  engagementScore: number;
  
  // Comments/responses
  comments: NormalizedComment[];
  
  // Optional enrichments
  transcript?: string;             // For YouTube
  keyMoments?: string[];
  
  // Structured data (for internal reviews)
  pros?: string[];
  cons?: string[];
  rating?: number;
}

/**
 * Normalized bike data from a single source
 */
export interface NormalizedBikeData {
  bikeName: string;
  source: DataSourceId;
  sourceDisplay: string;
  
  // Content that can be extracted for insights
  discussions: NormalizedDiscussion[];
  
  // Aggregated comments (flattened from discussions for easier processing)
  allComments: NormalizedComment[];
  
  // Metadata
  totalPosts: number;
  totalComments: number;
  dateRange?: { from: string; to: string };
}

/**
 * Combined/merged bike data from multiple sources
 */
export interface MergedBikeData {
  bikeName: string;
  
  // Sources that contributed to this merge
  contributingSources: DataSourceId[];
  
  // Merged and deduplicated content
  discussions: NormalizedDiscussion[];
  allComments: NormalizedComment[];
  
  // Metadata
  totalPosts: number;
  totalComments: number;
  qualityComments: number;         // Comments with qualityScore >= threshold
  
  // Source breakdown
  sourceBreakdown: {
    [source in DataSourceId]?: {
      posts: number;
      comments: number;
    };
  };
}

// ============ MERGE STRATEGY ============

export interface MergeStrategy {
  // How to handle duplicate content
  deduplicationThreshold: number;  // 0-1, similarity threshold (0.7 = 70% similar)
  
  // How to weight sources (affects sorting priority)
  sourceWeights: Partial<Record<DataSourceId, number>>;
  
  // Max items per source to prevent one source dominating
  maxDiscussionsPerSource?: number;
  maxCommentsPerDiscussion?: number;
  
  // Quality thresholds
  minCommentQualityScore?: number; // 0-100, filter out low quality
}

// ============ NORMALIZER INTERFACE ============

export interface DataSourceNormalizer {
  sourceId: DataSourceId;
  sourceDisplay: string;
  
  /**
   * Normalize raw data from this source into the unified format
   */
  normalize(rawData: any, bikeName: string): NormalizedBikeData;
  
  /**
   * Check if the raw data is valid for this normalizer
   */
  isValidData(rawData: any): boolean;
}

// ============ SOURCE AVAILABILITY ============

export interface SourceAvailability {
  sourceId: DataSourceId;
  available: boolean;
  dataCount?: number;              // Number of items available
  reason?: string;                 // Why unavailable (if not available)
}

// ============ MERGE RESULT ============

export interface DataMergeResult {
  bike1: MergedBikeData;
  bike2: MergedBikeData;
  
  // Metadata about the merge
  mergeMetadata: {
    mergedAt: string;
    strategy: MergeStrategy;
    sourcesUsed: DataSourceId[];
    totalInputPosts: number;
    totalOutputPosts: number;
    deduplicatedCount: number;
  };
}

