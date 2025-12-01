/**
 * Data Source Merger
 * 
 * Combines data from multiple sources (YouTube, Reddit, Internal, etc.)
 * with configurable deduplication, weighting, and quality filtering.
 */

import type { 
  DataSourceId,
  NormalizedBikeData, 
  NormalizedDiscussion,
  NormalizedComment,
  MergedBikeData,
  MergeStrategy,
  DataMergeResult
} from './types';
import { 
  DEFAULT_MERGE_STRATEGY, 
  getSourceConfig, 
  getSourceWeight,
  getEffectivePriority 
} from './config';
import { getNormalizer } from './normalizers';

// ============ MAIN MERGE FUNCTIONS ============

/**
 * Merge data from multiple sources for a single bike
 */
export function mergeBikeData(
  sources: Array<{ sourceId: DataSourceId; data: NormalizedBikeData }>,
  strategy: MergeStrategy = DEFAULT_MERGE_STRATEGY
): MergedBikeData {
  if (sources.length === 0) {
    return createEmptyMergedData('Unknown');
  }
  
  const bikeName = sources[0].data.bikeName;
  const contributingSources = sources.map(s => s.sourceId);
  
  // Step 1: Collect all discussions from all sources
  let allDiscussions: NormalizedDiscussion[] = [];
  
  for (const { sourceId, data } of sources) {
    // Apply max discussions per source limit
    const maxPerSource = strategy.maxDiscussionsPerSource || Infinity;
    const limitedDiscussions = data.discussions.slice(0, maxPerSource);
    allDiscussions.push(...limitedDiscussions);
  }
  
  // Step 2: Sort by quality and source priority
  allDiscussions = sortDiscussionsByQuality(allDiscussions, strategy);
  
  // Step 3: Deduplicate similar discussions
  const deduplicatedDiscussions = deduplicateDiscussions(
    allDiscussions, 
    strategy.deduplicationThreshold
  );
  
  // Step 4: Process and deduplicate comments within each discussion
  const processedDiscussions = deduplicatedDiscussions.map(discussion => {
    // Limit comments per discussion
    const maxComments = strategy.maxCommentsPerDiscussion || Infinity;
    let comments = discussion.comments.slice(0, maxComments);
    
    // Filter by quality threshold
    if (strategy.minCommentQualityScore) {
      comments = comments.filter(c => c.qualityScore >= strategy.minCommentQualityScore!);
    }
    
    // Sort comments by quality
    comments = sortCommentsByQuality(comments, strategy);
    
    return {
      ...discussion,
      comments
    };
  });
  
  // Step 5: Flatten all comments
  const allComments = processedDiscussions.flatMap(d => d.comments);
  
  // Step 6: Deduplicate comments across all discussions
  const deduplicatedComments = deduplicateComments(
    allComments,
    strategy.deduplicationThreshold
  );
  
  // Step 7: Calculate source breakdown
  const sourceBreakdown: MergedBikeData['sourceBreakdown'] = {};
  for (const { sourceId, data } of sources) {
    sourceBreakdown[sourceId] = {
      posts: data.totalPosts,
      comments: data.totalComments
    };
  }
  
  return {
    bikeName,
    contributingSources,
    discussions: processedDiscussions,
    allComments: deduplicatedComments,
    totalPosts: processedDiscussions.length,
    totalComments: deduplicatedComments.length,
    qualityComments: deduplicatedComments.filter(
      c => c.qualityScore >= (strategy.minCommentQualityScore || 40)
    ).length,
    sourceBreakdown
  };
}

/**
 * Merge data for a bike comparison (bike1 and bike2)
 */
export function mergeComparisonData(
  bike1Sources: Array<{ sourceId: DataSourceId; data: NormalizedBikeData }>,
  bike2Sources: Array<{ sourceId: DataSourceId; data: NormalizedBikeData }>,
  strategy: MergeStrategy = DEFAULT_MERGE_STRATEGY
): DataMergeResult {
  const bike1 = mergeBikeData(bike1Sources, strategy);
  const bike2 = mergeBikeData(bike2Sources, strategy);
  
  // Calculate total input/output for metadata
  const totalInputPosts = 
    bike1Sources.reduce((sum, s) => sum + s.data.totalPosts, 0) +
    bike2Sources.reduce((sum, s) => sum + s.data.totalPosts, 0);
  
  const totalOutputPosts = bike1.totalPosts + bike2.totalPosts;
  
  // Get unique sources used
  const sourcesUsed = [...new Set([
    ...bike1.contributingSources,
    ...bike2.contributingSources
  ])];
  
  return {
    bike1,
    bike2,
    mergeMetadata: {
      mergedAt: new Date().toISOString(),
      strategy,
      sourcesUsed,
      totalInputPosts,
      totalOutputPosts,
      deduplicatedCount: totalInputPosts - totalOutputPosts
    }
  };
}

// ============ HIGH-LEVEL API ============

/**
 * Process raw scraped data from multiple sources and merge
 * This is the main entry point for the insights extraction route
 */
export function processAndMergeScrapedData(
  scrapedData: {
    youtube?: any;
    reddit?: any;
    internal?: any;
    xbhp?: any;
  },
  bike1Name: string,
  bike2Name: string,
  strategy: MergeStrategy = DEFAULT_MERGE_STRATEGY
): DataMergeResult {
  const bike1Sources: Array<{ sourceId: DataSourceId; data: NormalizedBikeData }> = [];
  const bike2Sources: Array<{ sourceId: DataSourceId; data: NormalizedBikeData }> = [];
  
  // Process YouTube data
  if (scrapedData.youtube) {
    const youtubeNormalizer = getNormalizer('youtube');
    
    if (scrapedData.youtube.bike1) {
      bike1Sources.push({
        sourceId: 'youtube',
        data: youtubeNormalizer.normalize(scrapedData.youtube.bike1, bike1Name)
      });
    }
    
    if (scrapedData.youtube.bike2) {
      bike2Sources.push({
        sourceId: 'youtube',
        data: youtubeNormalizer.normalize(scrapedData.youtube.bike2, bike2Name)
      });
    }
  }
  
  // Process Reddit data
  if (scrapedData.reddit) {
    const redditNormalizer = getNormalizer('reddit');
    
    if (scrapedData.reddit.bike1) {
      bike1Sources.push({
        sourceId: 'reddit',
        data: redditNormalizer.normalize(scrapedData.reddit.bike1, bike1Name)
      });
    }
    
    if (scrapedData.reddit.bike2) {
      bike2Sources.push({
        sourceId: 'reddit',
        data: redditNormalizer.normalize(scrapedData.reddit.bike2, bike2Name)
      });
    }
  }
  
  // Process Internal data (future integration)
  if (scrapedData.internal) {
    const internalNormalizer = getNormalizer('internal');
    
    if (scrapedData.internal.bike1) {
      bike1Sources.push({
        sourceId: 'internal',
        data: internalNormalizer.normalize(scrapedData.internal.bike1, bike1Name)
      });
    }
    
    if (scrapedData.internal.bike2) {
      bike2Sources.push({
        sourceId: 'internal',
        data: internalNormalizer.normalize(scrapedData.internal.bike2, bike2Name)
      });
    }
  }
  
  // Process xBhp data (if ever enabled)
  if (scrapedData.xbhp) {
    const xbhpNormalizer = getNormalizer('xbhp');
    
    if (scrapedData.xbhp.bike1) {
      bike1Sources.push({
        sourceId: 'xbhp',
        data: xbhpNormalizer.normalize(scrapedData.xbhp.bike1, bike1Name)
      });
    }
    
    if (scrapedData.xbhp.bike2) {
      bike2Sources.push({
        sourceId: 'xbhp',
        data: xbhpNormalizer.normalize(scrapedData.xbhp.bike2, bike2Name)
      });
    }
  }
  
  // Log what we're merging
  console.log(`[Merger] Processing sources for ${bike1Name}: ${bike1Sources.map(s => s.sourceId).join(', ') || 'none'}`);
  console.log(`[Merger] Processing sources for ${bike2Name}: ${bike2Sources.map(s => s.sourceId).join(', ') || 'none'}`);
  
  return mergeComparisonData(bike1Sources, bike2Sources, strategy);
}

/**
 * Convert merged data back to format expected by existing prompts
 * This ensures backward compatibility with the existing AI extraction
 */
export function convertToLegacyFormat(mergeResult: DataMergeResult): {
  bike1: any;
  bike2: any;
} {
  return {
    bike1: convertMergedBikeToLegacy(mergeResult.bike1),
    bike2: convertMergedBikeToLegacy(mergeResult.bike2)
  };
}

function convertMergedBikeToLegacy(merged: MergedBikeData): any {
  // Convert to format expected by existing prompts
  // This mimics the YouTube/Reddit data structure
  return {
    bike_name: merged.bikeName,
    videos: merged.discussions.map(d => ({
      title: d.title,
      description: d.content,
      channelTitle: d.author,
      publishedAt: d.publishedAt,
      transcript: d.transcript,
      transcriptKeyMoments: d.keyMoments,
      comments: d.comments.map(c => ({
        text: c.text,
        author: c.author,
        likeCount: c.likes,
        source: c.sourceDisplay,  // Preserve source attribution
        isVerifiedOwner: c.isVerifiedOwner,
        ownershipContext: c.ownershipContext
      }))
    })),
    // Add metadata for prompts to use
    _mergeMetadata: {
      sources: merged.contributingSources,
      sourceBreakdown: merged.sourceBreakdown,
      totalPosts: merged.totalPosts,
      totalComments: merged.totalComments,
      qualityComments: merged.qualityComments
    }
  };
}

// ============ SORTING FUNCTIONS ============

/**
 * Sort discussions by quality and source priority
 */
function sortDiscussionsByQuality(
  discussions: NormalizedDiscussion[],
  strategy: MergeStrategy
): NormalizedDiscussion[] {
  return [...discussions].sort((a, b) => {
    // Calculate effective score (engagement * source weight)
    const weightA = getSourceWeight(a.source, strategy);
    const weightB = getSourceWeight(b.source, strategy);
    
    const priorityA = getEffectivePriority(a.source, strategy);
    const priorityB = getEffectivePriority(b.source, strategy);
    
    const scoreA = a.engagementScore * weightA + priorityA;
    const scoreB = b.engagementScore * weightB + priorityB;
    
    return scoreB - scoreA;
  });
}

/**
 * Sort comments by quality and source priority
 */
function sortCommentsByQuality(
  comments: NormalizedComment[],
  strategy: MergeStrategy
): NormalizedComment[] {
  return [...comments].sort((a, b) => {
    const weightA = getSourceWeight(a.source, strategy);
    const weightB = getSourceWeight(b.source, strategy);
    
    // Verified owners get a boost
    const verifiedBoostA = a.isVerifiedOwner ? 20 : 0;
    const verifiedBoostB = b.isVerifiedOwner ? 20 : 0;
    
    const scoreA = (a.qualityScore + verifiedBoostA) * weightA;
    const scoreB = (b.qualityScore + verifiedBoostB) * weightB;
    
    return scoreB - scoreA;
  });
}

// ============ DEDUPLICATION FUNCTIONS ============

/**
 * Deduplicate discussions based on title similarity
 */
function deduplicateDiscussions(
  discussions: NormalizedDiscussion[],
  threshold: number
): NormalizedDiscussion[] {
  const unique: NormalizedDiscussion[] = [];
  
  for (const discussion of discussions) {
    const isDuplicate = unique.some(existing => {
      const similarity = calculateTextSimilarity(
        existing.title.toLowerCase(),
        discussion.title.toLowerCase()
      );
      return similarity > threshold;
    });
    
    if (!isDuplicate) {
      unique.push(discussion);
    }
  }
  
  return unique;
}

/**
 * Deduplicate comments based on text similarity
 */
function deduplicateComments(
  comments: NormalizedComment[],
  threshold: number
): NormalizedComment[] {
  const unique: NormalizedComment[] = [];
  
  for (const comment of comments) {
    const isDuplicate = unique.some(existing => {
      const similarity = calculateTextSimilarity(
        existing.text.toLowerCase(),
        comment.text.toLowerCase()
      );
      return similarity > threshold;
    });
    
    if (!isDuplicate) {
      unique.push(comment);
    }
  }
  
  return unique;
}

/**
 * Calculate Jaccard similarity between two texts
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  // Tokenize into words (filter short words)
  const words1 = new Set(
    text1.split(/\s+/).filter(w => w.length > 3)
  );
  const words2 = new Set(
    text2.split(/\s+/).filter(w => w.length > 3)
  );
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  // Calculate Jaccard similarity
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

// ============ HELPER FUNCTIONS ============

/**
 * Create empty merged data structure
 */
function createEmptyMergedData(bikeName: string): MergedBikeData {
  return {
    bikeName,
    contributingSources: [],
    discussions: [],
    allComments: [],
    totalPosts: 0,
    totalComments: 0,
    qualityComments: 0,
    sourceBreakdown: {}
  };
}

// ============ EXPORTS ============

export { DEFAULT_MERGE_STRATEGY } from './config';

