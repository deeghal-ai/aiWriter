/**
 * YouTube Data Normalizer
 * 
 * Converts YouTube scraper output to the unified NormalizedBikeData format
 */

import type { 
  DataSourceNormalizer, 
  NormalizedBikeData, 
  NormalizedDiscussion, 
  NormalizedComment 
} from '../types';
import { detectTopics, getSourceConfig } from '../config';

export class YouTubeNormalizer implements DataSourceNormalizer {
  sourceId = 'youtube' as const;
  sourceDisplay = 'YouTube';
  
  /**
   * Check if the raw data is valid YouTube data
   */
  isValidData(rawData: any): boolean {
    if (!rawData) return false;
    
    // Check for videos array (enhanced scraper format)
    if (rawData.videos && Array.isArray(rawData.videos)) {
      return true;
    }
    
    // Check for bike1/bike2 structure
    if (rawData.bike1?.videos || rawData.bike2?.videos) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Normalize YouTube data to unified format
   */
  normalize(rawData: any, bikeName: string): NormalizedBikeData {
    // Handle different input structures
    let videos: any[] = [];
    
    if (rawData.videos && Array.isArray(rawData.videos)) {
      videos = rawData.videos;
    } else if (Array.isArray(rawData)) {
      videos = rawData;
    }
    
    const config = getSourceConfig('youtube');
    
    // Process each video into a normalized discussion
    const discussions: NormalizedDiscussion[] = videos.map((video, index) => 
      this.normalizeVideo(video, index)
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
      source: 'youtube',
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
   * Normalize a single YouTube video
   */
  private normalizeVideo(video: any, index: number): NormalizedDiscussion | null {
    if (!video || !video.title) return null;
    
    const comments = this.normalizeComments(video.comments || []);
    
    // Calculate engagement score (0-100)
    const viewCount = video.viewCount || video.views || 0;
    const likeCount = video.likeCount || video.likes || 0;
    const commentCount = comments.length;
    
    // Engagement formula: weighted combination of views, likes, comments
    const engagementScore = Math.min(100, Math.round(
      (Math.log10(Math.max(viewCount, 1)) * 10) +   // Views (log scale)
      (Math.log10(Math.max(likeCount, 1)) * 15) +    // Likes
      (commentCount * 2)                              // Comments
    ));
    
    return {
      id: video.videoId || video.id || `yt-${index}`,
      title: this.cleanTitle(video.title),
      content: this.buildContent(video),
      author: video.channelTitle || video.channel || 'Unknown Channel',
      source: 'youtube',
      sourceDisplay: 'YouTube',
      sourceUrl: video.videoId ? `https://youtube.com/watch?v=${video.videoId}` : undefined,
      publishedAt: video.publishedAt || new Date().toISOString(),
      engagementScore,
      comments,
      transcript: video.transcript || undefined,
      keyMoments: video.transcriptKeyMoments?.map((km: any) => 
        typeof km === 'string' ? km : km.text || km.topic
      ) || undefined
    };
  }
  
  /**
   * Normalize YouTube comments
   */
  private normalizeComments(comments: any[]): NormalizedComment[] {
    if (!Array.isArray(comments)) return [];
    
    return comments
      .filter(c => c && (c.text || c.textDisplay))
      .map((comment, index) => this.normalizeComment(comment, index))
      .filter(c => c !== null) as NormalizedComment[];
  }
  
  /**
   * Normalize a single YouTube comment
   */
  private normalizeComment(comment: any, index: number): NormalizedComment | null {
    const text = (comment.text || comment.textDisplay || '').trim();
    if (!text || text.length < 10) return null;
    
    const likes = comment.likeCount || comment.likes || 0;
    const qualityScore = this.calculateCommentQuality(text, likes);
    
    // Skip low quality comments
    if (qualityScore < 20) return null;
    
    return {
      id: comment.id || `yt-comment-${index}`,
      text: this.cleanCommentText(text),
      author: comment.author || comment.authorDisplayName || 'Anonymous',
      source: 'youtube',
      sourceDisplay: 'YouTube',
      likes,
      qualityScore,
      topics: detectTopics(text)
    };
  }
  
  /**
   * Calculate quality score for a comment (0-100)
   */
  private calculateCommentQuality(text: string, likes: number): number {
    let score = 30; // Base score
    
    // Length scoring (50-400 chars is sweet spot)
    if (text.length >= 50 && text.length <= 400) score += 15;
    else if (text.length < 30) score -= 20;
    else if (text.length > 800) score -= 5;
    
    // Likes scoring
    if (likes >= 50) score += 25;
    else if (likes >= 20) score += 20;
    else if (likes >= 10) score += 15;
    else if (likes >= 5) score += 10;
    else if (likes >= 1) score += 5;
    
    // Experience indicators (HUGE boost)
    const experiencePatterns = [
      /i (have|own|bought|ride|use)/i,
      /my (bike|experience)/i,
      /after \d+ (months?|years?|kms?|kilometers?)/i,
      /\d+,?\d* (kms?|kilometers?)/i,
      /(daily|regularly|commute|touring)/i,
      /(service|maintenance|dealer)/i
    ];
    
    const experienceMatches = experiencePatterns.filter(p => p.test(text)).length;
    if (experienceMatches >= 2) score += 25;
    else if (experienceMatches === 1) score += 15;
    
    // Specific numbers (credibility boost)
    if (/\d{2,3}\s*(kmpl|km\/l)/i.test(text)) score += 10;
    if (/₹?\s*\d{1,2},?\d{3}/i.test(text)) score += 8;
    if (/\d{4,5}\s*(rpm|RPM)/i.test(text)) score += 8;
    
    // Spam indicators (HUGE penalty)
    const spamPatterns = [
      /subscribe|channel|check out/i,
      /please (like|reply|pin)/i,
      /first comment/i,
      /❤️{2,}|🔥{2,}|👍{2,}/,
      /bhai.*reply/i,
      /nice video|great video|awesome video/i
    ];
    
    if (spamPatterns.some(p => p.test(text))) score -= 40;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Build content from video description and transcript
   */
  private buildContent(video: any): string {
    const parts: string[] = [];
    
    if (video.description) {
      // Clean and truncate description
      const cleanDesc = video.description
        .replace(/https?:\/\/\S+/g, '')  // Remove URLs
        .replace(/#\w+/g, '')             // Remove hashtags
        .replace(/\n{3,}/g, '\n\n')       // Normalize newlines
        .trim()
        .substring(0, 1500);
      
      if (cleanDesc.length > 50) {
        parts.push(cleanDesc);
      }
    }
    
    if (video.transcript) {
      const truncatedTranscript = video.transcript.substring(0, 2000);
      parts.push(`[Transcript]: ${truncatedTranscript}`);
    }
    
    return parts.join('\n\n');
  }
  
  /**
   * Clean video title
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/\|.*$/, '')         // Remove channel suffix
      .replace(/[-–—].*$/, '')      // Remove dash suffix (if after mid-point)
      .trim()
      .substring(0, 100);
  }
  
  /**
   * Clean comment text
   */
  private cleanCommentText(text: string): string {
    return text
      .replace(/\n+/g, ' ')         // Newlines to spaces
      .replace(/\s+/g, ' ')         // Multiple spaces to one
      .trim()
      .substring(0, 500);           // Max 500 chars
  }
}

// Export singleton instance
export const youtubeNormalizer = new YouTubeNormalizer();

