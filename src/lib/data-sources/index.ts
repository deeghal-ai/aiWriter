/**
 * Data Sources Module
 * 
 * Centralized data source management for the BikeDekho AI Writer.
 * 
 * Usage:
 * ```typescript
 * import { 
 *   processAndMergeScrapedData, 
 *   DEFAULT_MERGE_STRATEGY,
 *   DATA_SOURCE_CONFIGS 
 * } from '@/lib/data-sources';
 * 
 * const merged = processAndMergeScrapedData(
 *   { youtube: ytData, reddit: redditData },
 *   'KTM Duke 390',
 *   'Bajaj Dominar 400'
 * );
 * ```
 */

// Types
export type {
  DataSourceId,
  DataSourceConfig,
  NormalizedComment,
  NormalizedDiscussion,
  NormalizedBikeData,
  MergedBikeData,
  MergeStrategy,
  DataSourceNormalizer,
  SourceAvailability,
  DataMergeResult
} from './types';

// Configuration
export {
  DATA_SOURCE_CONFIGS,
  DEFAULT_MERGE_STRATEGY,
  getSourceConfig,
  getEnabledSources,
  getSourceDisplayName,
  getSourceTrustScore,
  getSourceWeight,
  getEffectivePriority,
  getSourcesByPriority,
  TOPIC_KEYWORDS,
  detectTopics
} from './config';

// Normalizers
export {
  YouTubeNormalizer,
  youtubeNormalizer,
  RedditNormalizer,
  redditNormalizer,
  InternalNormalizer,
  internalNormalizer,
  getNormalizer,
  getAllNormalizers,
  hasNormalizer
} from './normalizers';

// Merger
export {
  mergeBikeData,
  mergeComparisonData,
  processAndMergeScrapedData,
  convertToLegacyFormat
} from './merger';

// Re-export internal types for future integration
export type { InternalReview, InternalBikeEntry } from './normalizers/internal';

// Internal API integration
export {
  INTERNAL_API_BASE_URL,
  isInternalApiConfigured,
  getInternalApiStatus,
  fetchInternalData,
  USE_MOCK_DATA,
  getMockInternalData
} from './internal-api';

export type { InternalApiResponse, InternalBikeData } from './internal-api';

