/**
 * Internal Data Normalizer (BikeDekho)
 * 
 * Converts internal BikeDekho data to the unified NormalizedBikeData format.
 * This is a placeholder ready for future integration with internal APIs.
 * 
 * Expected input format (from internal team):
 * {
 *   bikeName: string;
 *   bikeId?: string;
 *   reviews: InternalReview[];
 *   expertInsights?: ExpertInsight[];
 *   specifications?: BikeSpecs;
 * }
 */

import type { 
  DataSourceNormalizer, 
  NormalizedBikeData, 
  NormalizedDiscussion, 
  NormalizedComment 
} from '../types';
import { detectTopics, getSourceConfig } from '../config';

// ============ INTERNAL DATA TYPES ============

/**
 * Expected format for internal reviews (from BikeDekho platform)
 */
export interface InternalReview {
  id: string;
  
  author: {
    name: string;
    isVerifiedOwner: boolean;
    ownershipDuration?: string;    // "6 months", "2 years"
    kmsDriven?: number;
  };
  
  title: string;
  content: string;
  
  rating?: number;                  // 1-5 or 1-10
  pros?: string[];
  cons?: string[];
  
  helpfulVotes?: number;
  createdAt: string;
  source?: string;                  // Default: "BikeDekho"
}

export interface ExpertInsight {
  category: string;
  insight: string;
  author: string;
  isPositive: boolean;
}

export interface InternalBikeEntry {
  bikeName: string;
  bikeId?: string;
  reviews: InternalReview[];
  expertInsights?: ExpertInsight[];
  specifications?: Record<string, string>;
}

// ============ NORMALIZER ============

export class InternalNormalizer implements DataSourceNormalizer {
  sourceId = 'internal' as const;
  sourceDisplay = 'BikeDekho';
  
  /**
   * Check if the raw data is valid internal data
   */
  isValidData(rawData: any): boolean {
    if (!rawData) return false;
    
    // Check for reviews array
    if (rawData.reviews && Array.isArray(rawData.reviews)) {
      return true;
    }
    
    // Check for bike1/bike2 structure
    if (rawData.bike1?.reviews || rawData.bike2?.reviews) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Normalize internal data to unified format
   */
  normalize(rawData: any, bikeName: string): NormalizedBikeData {
    const config = getSourceConfig('internal');
    
    // Handle different input structures
    let reviews: InternalReview[] = [];
    let expertInsights: ExpertInsight[] = [];
    
    if (rawData.reviews && Array.isArray(rawData.reviews)) {
      reviews = rawData.reviews;
      expertInsights = rawData.expertInsights || [];
    }
    
    // Process reviews into normalized discussions
    const discussions: NormalizedDiscussion[] = [];
    
    // Add user reviews as discussions
    reviews.forEach((review, index) => {
      const normalized = this.normalizeReview(review, index);
      if (normalized) {
        discussions.push(normalized);
      }
    });
    
    // Add expert insights as a special discussion (if any)
    if (expertInsights.length > 0) {
      const expertDiscussion = this.createExpertDiscussion(expertInsights, bikeName);
      if (expertDiscussion) {
        discussions.push(expertDiscussion);
      }
    }
    
    // Flatten all comments
    const allComments = discussions.flatMap(d => d.comments);
    
    // Calculate date range
    const dates = discussions
      .map(d => d.publishedAt)
      .filter(d => d)
      .sort();
    
    return {
      bikeName,
      source: 'internal',
      sourceDisplay: config.name,
      discussions,
      allComments,
      totalPosts: discussions.length,
      totalComments: allComments.length,
      dateRange: dates.length > 0 ? {
        from: dates[0],
        to: dates[dates.length - 1]
      } : undefined
    };
  }
  
  /**
   * Normalize a single internal review
   */
  private normalizeReview(review: InternalReview, index: number): NormalizedDiscussion | null {
    if (!review || !review.content) return null;
    
    const helpfulVotes = review.helpfulVotes || 0;
    const isVerifiedOwner = review.author?.isVerifiedOwner || false;
    
    // Calculate engagement score - verified owners get boost
    let engagementScore = Math.min(100, Math.round(
      (helpfulVotes * 5) +                           // Helpful votes
      (isVerifiedOwner ? 30 : 0) +                   // Verified owner boost
      (review.rating ? review.rating * 5 : 20)       // Rating contribution
    ));
    
    // Build ownership context for credibility
    const ownershipContext = this.buildOwnershipContext(review.author);
    
    // Convert the review itself into a high-quality "comment"
    const mainComment: NormalizedComment = {
      id: `${review.id}-main`,
      text: this.cleanReviewContent(review.content),
      author: review.author?.name || 'BikeDekho User',
      source: 'internal',
      sourceDisplay: 'BikeDekho',
      likes: helpfulVotes,
      qualityScore: this.calculateReviewQuality(review),
      topics: detectTopics(review.content),
      isVerifiedOwner,
      ownershipContext
    };
    
    // Convert pros/cons into additional structured comments
    const prosConsComments = this.convertProsConsToComments(review);
    
    return {
      id: review.id || `internal-${index}`,
      title: review.title || 'User Review',
      content: review.content,
      author: review.author?.name || 'BikeDekho User',
      source: 'internal',
      sourceDisplay: 'BikeDekho',
      sourceUrl: undefined,  // Could add BikeDekho URL if available
      publishedAt: review.createdAt || new Date().toISOString(),
      engagementScore,
      comments: [mainComment, ...prosConsComments],
      pros: review.pros,
      cons: review.cons,
      rating: review.rating
    };
  }
  
  /**
   * Create a discussion from expert insights
   */
  private createExpertDiscussion(
    insights: ExpertInsight[], 
    bikeName: string
  ): NormalizedDiscussion | null {
    if (!insights || insights.length === 0) return null;
    
    // Convert each insight into a high-trust comment
    const comments: NormalizedComment[] = insights.map((insight, index) => ({
      id: `expert-${index}`,
      text: `[${insight.category}] ${insight.insight}`,
      author: insight.author || 'BikeDekho Expert Team',
      source: 'internal' as const,
      sourceDisplay: 'BikeDekho',
      likes: 100,  // High engagement for expert content
      qualityScore: 95,  // High quality score for expert insights
      topics: detectTopics(insight.insight),
      isVerifiedOwner: false
    }));
    
    return {
      id: 'expert-insights',
      title: `BikeDekho Expert Analysis: ${bikeName}`,
      content: insights.map(i => `**${i.category}**: ${i.insight}`).join('\n\n'),
      author: 'BikeDekho Expert Team',
      source: 'internal',
      sourceDisplay: 'BikeDekho',
      publishedAt: new Date().toISOString(),
      engagementScore: 100,  // Highest engagement for expert content
      comments
    };
  }
  
  /**
   * Convert pros/cons lists into structured comments
   */
  private convertProsConsToComments(review: InternalReview): NormalizedComment[] {
    const comments: NormalizedComment[] = [];
    const baseQuality = this.calculateReviewQuality(review);
    
    // Add pros as positive comments
    if (review.pros && review.pros.length > 0) {
      review.pros.forEach((pro, index) => {
        if (pro.length > 10) {  // Skip very short ones
          comments.push({
            id: `${review.id}-pro-${index}`,
            text: `[Pro] ${pro}`,
            author: review.author?.name || 'BikeDekho User',
            source: 'internal',
            sourceDisplay: 'BikeDekho',
            likes: review.helpfulVotes || 0,
            qualityScore: Math.min(baseQuality + 10, 100),  // Boost for structured feedback
            topics: detectTopics(pro),
            isVerifiedOwner: review.author?.isVerifiedOwner
          });
        }
      });
    }
    
    // Add cons as negative comments
    if (review.cons && review.cons.length > 0) {
      review.cons.forEach((con, index) => {
        if (con.length > 10) {
          comments.push({
            id: `${review.id}-con-${index}`,
            text: `[Con] ${con}`,
            author: review.author?.name || 'BikeDekho User',
            source: 'internal',
            sourceDisplay: 'BikeDekho',
            likes: review.helpfulVotes || 0,
            qualityScore: Math.min(baseQuality + 10, 100),
            topics: detectTopics(con),
            isVerifiedOwner: review.author?.isVerifiedOwner
          });
        }
      });
    }
    
    return comments;
  }
  
  /**
   * Calculate quality score for an internal review
   */
  private calculateReviewQuality(review: InternalReview): number {
    let score = 50;  // Base score (higher than external sources)
    
    // Verified owner - HUGE boost
    if (review.author?.isVerifiedOwner) {
      score += 25;
    }
    
    // Ownership duration/kms driven - credibility boost
    if (review.author?.kmsDriven) {
      if (review.author.kmsDriven >= 10000) score += 15;
      else if (review.author.kmsDriven >= 5000) score += 10;
      else if (review.author.kmsDriven >= 1000) score += 5;
    }
    
    // Content length
    const contentLength = review.content?.length || 0;
    if (contentLength >= 200 && contentLength <= 1000) score += 10;
    else if (contentLength < 50) score -= 10;
    
    // Has structured pros/cons
    if (review.pros && review.pros.length > 0) score += 5;
    if (review.cons && review.cons.length > 0) score += 5;
    
    // Has rating
    if (review.rating) score += 5;
    
    // Helpful votes
    const votes = review.helpfulVotes || 0;
    if (votes >= 50) score += 15;
    else if (votes >= 20) score += 10;
    else if (votes >= 5) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Build ownership context string for credibility
   */
  private buildOwnershipContext(author: InternalReview['author']): string | undefined {
    if (!author) return undefined;
    
    const parts: string[] = [];
    
    if (author.isVerifiedOwner) {
      parts.push('Verified Owner');
    }
    
    if (author.ownershipDuration) {
      parts.push(author.ownershipDuration);
    }
    
    if (author.kmsDriven) {
      parts.push(`${author.kmsDriven.toLocaleString()} km`);
    }
    
    return parts.length > 0 ? parts.join(', ') : undefined;
  }
  
  /**
   * Clean review content
   */
  private cleanReviewContent(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .substring(0, 1500);
  }
}

// Export singleton instance
export const internalNormalizer = new InternalNormalizer();

