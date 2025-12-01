/**
 * Data Sources - Centralized Configuration
 * 
 * Single source of truth for all data source settings.
 * Modify this file to:
 * - Enable/disable sources
 * - Adjust trust scores and weights
 * - Configure merge strategy
 * - Add new sources
 */

import type { DataSourceConfig, DataSourceId, MergeStrategy } from './types';

// ============ SOURCE CONFIGURATIONS ============

/**
 * Configuration for each data source
 * Modify these to adjust how each source is treated
 */
export const DATA_SOURCE_CONFIGS: Record<DataSourceId, DataSourceConfig> = {
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    priority: 80,              // High priority - video reviews are valuable
    enabled: true,
    trustScore: 75,            // Good trust - but can have promotional content
    description: 'YouTube video reviews and comments'
  },
  
  reddit: {
    id: 'reddit',
    name: 'Reddit',
    priority: 70,              // Good priority - authentic discussions
    enabled: true,
    trustScore: 80,            // High trust - organic discussions
    description: 'Reddit motorcycle community discussions'
  },
  
  internal: {
    id: 'internal',
    name: 'BikeDekho',
    priority: 90,              // Highest priority - our own verified data
    enabled: true,             // Ready for future integration
    trustScore: 95,            // Highest trust - verified owners
    description: 'BikeDekho user reviews and expert insights'
  },
  
  xbhp: {
    id: 'xbhp',
    name: 'xBhp Forum',
    priority: 75,
    enabled: false,            // Disabled for now
    trustScore: 85,
    description: 'xBhp motorcycle enthusiast forum'
  }
};

// ============ DEFAULT MERGE STRATEGY ============

/**
 * Default merge strategy for combining data from multiple sources
 * Modify this to adjust how sources are merged
 */
export const DEFAULT_MERGE_STRATEGY: MergeStrategy = {
  // Similarity threshold for deduplication (0.5 = 50% similar = duplicate)
  deduplicationThreshold: 0.5,
  
  // Source weights - higher = more priority in sorting
  // These multiply with the source's trustScore for final ranking
  sourceWeights: {
    internal: 1.3,             // Boost internal data
    youtube: 1.0,              // Baseline
    reddit: 0.95,              // Slightly lower (can be more casual)
    xbhp: 1.1                  // Expert forum content
  },
  
  // Limits to prevent any single source from dominating
  maxDiscussionsPerSource: 15,
  maxCommentsPerDiscussion: 25,
  
  // Quality threshold - comments below this score are filtered out
  minCommentQualityScore: 30
};

// ============ HELPER FUNCTIONS ============

/**
 * Get config for a specific source
 */
export function getSourceConfig(sourceId: DataSourceId): DataSourceConfig {
  return DATA_SOURCE_CONFIGS[sourceId];
}

/**
 * Get all enabled sources
 */
export function getEnabledSources(): DataSourceConfig[] {
  return Object.values(DATA_SOURCE_CONFIGS).filter(config => config.enabled);
}

/**
 * Get source display name
 */
export function getSourceDisplayName(sourceId: DataSourceId): string {
  return DATA_SOURCE_CONFIGS[sourceId]?.name || sourceId;
}

/**
 * Get source trust score
 */
export function getSourceTrustScore(sourceId: DataSourceId): number {
  return DATA_SOURCE_CONFIGS[sourceId]?.trustScore || 50;
}

/**
 * Get source weight from merge strategy
 */
export function getSourceWeight(sourceId: DataSourceId, strategy?: MergeStrategy): number {
  const mergeStrategy = strategy || DEFAULT_MERGE_STRATEGY;
  return mergeStrategy.sourceWeights[sourceId] || 1.0;
}

/**
 * Calculate effective priority for a source (priority * trustScore * weight)
 */
export function getEffectivePriority(
  sourceId: DataSourceId, 
  strategy?: MergeStrategy
): number {
  const config = DATA_SOURCE_CONFIGS[sourceId];
  const weight = getSourceWeight(sourceId, strategy);
  return config.priority * (config.trustScore / 100) * weight;
}

/**
 * Get sources sorted by effective priority (highest first)
 */
export function getSourcesByPriority(strategy?: MergeStrategy): DataSourceConfig[] {
  return Object.values(DATA_SOURCE_CONFIGS)
    .filter(config => config.enabled)
    .sort((a, b) => {
      const priorityA = getEffectivePriority(a.id, strategy);
      const priorityB = getEffectivePriority(b.id, strategy);
      return priorityB - priorityA;
    });
}

// ============ TOPIC DETECTION KEYWORDS ============

/**
 * Keywords for detecting topics in comments
 * Used by normalizers for topic tagging
 */
export const TOPIC_KEYWORDS: Record<string, RegExp[]> = {
  'Engine': [/engine|power|torque|rpm|pickup|acceleration|refinement|bhp|cc/i],
  'Mileage': [/mileage|fuel|economy|kmpl|average|tank|range/i],
  'Comfort': [/comfort|seat|ergonomic|position|pillion|back pain|posture/i],
  'Handling': [/handling|corner|lean|balance|agile|nimble|turning/i],
  'Build': [/build|quality|finish|paint|plastic|fit|welding|premium/i],
  'Brakes': [/brake|braking|abs|stopping|disc/i],
  'Service': [/service|maintenance|dealer|spare|cost|center/i],
  'Reliability': [/reliable|problem|issue|breakdown|defect|trusted/i],
  'Value': [/price|value|worth|money|expensive|affordable|budget/i],
  'Highway': [/highway|touring|long ride|trip|stability|cruise/i],
  'City': [/city|traffic|commute|daily|office|urban/i],
  'Sound': [/exhaust|sound|note|loud|silent|thump/i],
  'Heat': [/heat|hot|temperature|burning|thermal/i],
  'Suspension': [/suspension|bump|pothole|absorb|rough road/i]
};

/**
 * Detect topics from text using keywords
 */
export function detectTopics(text: string): string[] {
  const topics: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const [topic, patterns] of Object.entries(TOPIC_KEYWORDS)) {
    if (patterns.some(pattern => pattern.test(lowerText))) {
      topics.push(topic);
    }
  }
  
  return topics;
}

