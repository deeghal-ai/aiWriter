/**
 * Reddit Data Normalizer
 * 
 * Converts Reddit scraper output to the unified NormalizedBikeData format
 */

import type { 
  DataSourceNormalizer, 
  NormalizedBikeData, 
  NormalizedDiscussion, 
  NormalizedComment 
} from '../types';
import { detectTopics, getSourceConfig } from '../config';

export class RedditNormalizer implements DataSourceNormalizer {
  sourceId = 'reddit' as const;
  sourceDisplay = 'Reddit';
  
  /**
   * Check if the raw data is valid Reddit data
   */
  isValidData(rawData: any): boolean {
    if (!rawData) return false;
    
    // Check for posts array
    if (rawData.posts && Array.isArray(rawData.posts)) {
      return true;
    }
    
    // Check for bike1/bike2 structure
    if (rawData.bike1?.posts || rawData.bike2?.posts) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Normalize Reddit data to unified format
   */
  normalize(rawData: any, bikeName: string): NormalizedBikeData {
    // Handle different input structures
    let posts: any[] = [];
    
    if (rawData.posts && Array.isArray(rawData.posts)) {
      posts = rawData.posts;
    } else if (Array.isArray(rawData)) {
      posts = rawData;
    }
    
    const config = getSourceConfig('reddit');
    
    // Process each post into a normalized discussion
    const discussions: NormalizedDiscussion[] = posts.map((post, index) => 
      this.normalizePost(post, index)
    ).filter(d => d !== null) as NormalizedDiscussion[];
    
    // Flatten all comments for easy access
    const allComments = discussions.flatMap(d => d.comments);
    
    // Calculate date range
    const dates = discussions
      .map(d => d.publishedAt)
      .filter(d => d)
      .sort();
    
    return {
      bikeName,
      source: 'reddit',
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
   * Normalize a single Reddit post
   */
  private normalizePost(post: any, index: number): NormalizedDiscussion | null {
    if (!post || !post.title) return null;
    
    const comments = this.normalizeComments(post.comments || []);
    
    // Calculate engagement score (0-100)
    const score = post.score || post.ups || 0;
    const numComments = post.num_comments || comments.length;
    
    // Engagement formula for Reddit
    const engagementScore = Math.min(100, Math.round(
      (Math.log10(Math.max(score, 1)) * 20) +    // Upvotes (log scale)
      (numComments * 3)                           // Comments
    ));
    
    // Build permalink
    const sourceUrl = post.permalink 
      ? `https://reddit.com${post.permalink}`
      : post.url || undefined;
    
    // Parse creation date
    let publishedAt = new Date().toISOString();
    if (post.created_utc) {
      publishedAt = new Date(post.created_utc * 1000).toISOString();
    } else if (post.created) {
      publishedAt = new Date(post.created).toISOString();
    }
    
    return {
      id: post.id || `reddit-${index}`,
      title: post.title.trim().substring(0, 200),
      content: this.cleanPostContent(post.selftext || ''),
      author: post.author || 'Anonymous',
      source: 'reddit',
      sourceDisplay: 'Reddit',
      sourceUrl,
      publishedAt,
      engagementScore,
      comments
    };
  }
  
  /**
   * Normalize Reddit comments
   */
  private normalizeComments(comments: any[]): NormalizedComment[] {
    if (!Array.isArray(comments)) return [];
    
    return comments
      .filter(c => c && (c.body || c.text))
      .map((comment, index) => this.normalizeComment(comment, index))
      .filter(c => c !== null) as NormalizedComment[];
  }
  
  /**
   * Normalize a single Reddit comment
   */
  private normalizeComment(comment: any, index: number): NormalizedComment | null {
    const text = (comment.body || comment.text || '').trim();
    
    // Skip deleted/removed comments
    if (!text || text === '[deleted]' || text === '[removed]' || text.length < 10) {
      return null;
    }
    
    const score = comment.score || comment.ups || 0;
    const qualityScore = this.calculateCommentQuality(text, score);
    
    // Skip low quality comments
    if (qualityScore < 20) return null;
    
    return {
      id: comment.id || `reddit-comment-${index}`,
      text: this.cleanCommentText(text),
      author: comment.author || 'Anonymous',
      source: 'reddit',
      sourceDisplay: 'Reddit',
      likes: score,
      qualityScore,
      topics: detectTopics(text)
    };
  }
  
  /**
   * Calculate quality score for a Reddit comment (0-100)
   */
  private calculateCommentQuality(text: string, score: number): number {
    let qualityScore = 35; // Base score (slightly higher than YouTube - Reddit discussions are often higher quality)
    
    // Length scoring (Reddit comments tend to be longer)
    if (text.length >= 100 && text.length <= 600) qualityScore += 15;
    else if (text.length < 30) qualityScore -= 20;
    else if (text.length > 1000) qualityScore -= 5;
    
    // Score/upvotes
    if (score >= 50) qualityScore += 25;
    else if (score >= 20) qualityScore += 20;
    else if (score >= 10) qualityScore += 15;
    else if (score >= 5) qualityScore += 10;
    else if (score >= 1) qualityScore += 5;
    else if (score < 0) qualityScore -= 15; // Downvoted
    
    // Experience indicators (HUGE boost)
    const experiencePatterns = [
      /i (have|own|bought|ride|use|had)/i,
      /my (bike|experience|ride)/i,
      /after \d+ (months?|years?|kms?|kilometers?)/i,
      /\d+,?\d* (kms?|kilometers?)/i,
      /(daily|regularly|commute|touring|owned)/i,
      /(service|maintenance|dealer)/i,
      /i've been/i,
      /for the past/i
    ];
    
    const experienceMatches = experiencePatterns.filter(p => p.test(text)).length;
    if (experienceMatches >= 2) qualityScore += 25;
    else if (experienceMatches === 1) qualityScore += 15;
    
    // Specific numbers (credibility boost)
    if (/\d{2,3}\s*(kmpl|km\/l)/i.test(text)) qualityScore += 10;
    if (/₹?\s*\d{1,2},?\d{3}/i.test(text)) qualityScore += 8;
    if (/\d{4,5}\s*(rpm|RPM)/i.test(text)) qualityScore += 8;
    
    // Comparison mentions (valuable for our use case)
    if (/vs|versus|compared to|better than|worse than/i.test(text)) qualityScore += 10;
    
    // Low quality indicators
    const lowQualityPatterns = [
      /^lol$|^lmao$|^haha$/i,
      /^this\.?$/i,
      /^same$/i,
      /^nice$/i
    ];
    
    if (lowQualityPatterns.some(p => p.test(text))) qualityScore -= 30;
    
    return Math.max(0, Math.min(100, qualityScore));
  }
  
  /**
   * Clean post content
   */
  private cleanPostContent(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/https?:\/\/\S+/g, '')     // Remove URLs
      .replace(/\[.*?\]\(.*?\)/g, '')     // Remove markdown links
      .replace(/[*_~`]/g, '')              // Remove markdown formatting
      .replace(/\n{3,}/g, '\n\n')          // Normalize newlines
      .trim()
      .substring(0, 2000);
  }
  
  /**
   * Clean comment text
   */
  private cleanCommentText(text: string): string {
    return text
      .replace(/https?:\/\/\S+/g, '[link]')  // Replace URLs
      .replace(/\[.*?\]\(.*?\)/g, '')         // Remove markdown links
      .replace(/[*_~`]/g, '')                  // Remove markdown formatting
      .replace(/\n+/g, ' ')                    // Newlines to spaces
      .replace(/\s+/g, ' ')                    // Multiple spaces to one
      .replace(/&gt;/g, '>')                   // Decode HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .trim()
      .substring(0, 500);
  }
}

// Export singleton instance
export const redditNormalizer = new RedditNormalizer();

