/**
 * Data Source Normalizers
 * 
 * Export all normalizers and provide factory function
 */

export { YouTubeNormalizer, youtubeNormalizer } from './youtube';
export { RedditNormalizer, redditNormalizer } from './reddit';
export { InternalNormalizer, internalNormalizer, type InternalReview, type InternalBikeEntry } from './internal';

import type { DataSourceNormalizer, DataSourceId } from '../types';
import { youtubeNormalizer } from './youtube';
import { redditNormalizer } from './reddit';
import { internalNormalizer } from './internal';

/**
 * Registry of all available normalizers
 */
const normalizerRegistry: Record<DataSourceId, DataSourceNormalizer> = {
  youtube: youtubeNormalizer,
  reddit: redditNormalizer,
  internal: internalNormalizer,
  xbhp: youtubeNormalizer  // Fallback to YouTube format for now
};

/**
 * Get normalizer for a specific source
 */
export function getNormalizer(sourceId: DataSourceId): DataSourceNormalizer {
  return normalizerRegistry[sourceId];
}

/**
 * Get all available normalizers
 */
export function getAllNormalizers(): DataSourceNormalizer[] {
  return Object.values(normalizerRegistry);
}

/**
 * Check if a normalizer exists for a source
 */
export function hasNormalizer(sourceId: DataSourceId): boolean {
  return sourceId in normalizerRegistry;
}

