// Enhanced YouTube scraper with transcriptions and quality scoring

import { generateSearchQueries, generateComparisonQueries } from './youtube-queries';
import { getChannelTrustScore, isTrustedChannel } from './youtube-channels';
import { filterAndRankComments, ScoredComment } from './comment-scorer';
import { fetchTranscriptWithLibrary, summarizeTranscript } from './youtube-transcript';

export interface EnhancedYouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  // New fields
  trustScore: number;
  contentType: 'review' | 'comparison' | 'ownership' | 'technical' | 'problems';
  transcript: string | null;
  transcriptKeyMoments: Array<{ topic: string; text: string }>;
  comments: ScoredComment[];
  metadata: {
    hasTranscript: boolean;
    isTrustedChannel: boolean;
    commentQualityAvg: number;
  };
}

export interface EnhancedScrapedData {
  bike_name: string;
  videos: EnhancedYouTubeVideo[];
  comparisonVideos: EnhancedYouTubeVideo[];
  summary: {
    total_videos: number;
    trusted_channel_videos: number;
    videos_with_transcripts: number;
    total_quality_comments: number;
    top_topics: string[];
  };
}

/**
 * Enhanced YouTube scraper with transcriptions and quality scoring
 */
export async function scrapeYouTubeEnhanced(
  bikeName: string,
  apiKey: string,
  options: {
    maxVideos?: number;
    fetchTranscripts?: boolean;
    minCommentScore?: number;
  } = {}
): Promise<EnhancedScrapedData> {
  const {
    maxVideos = 12,
    fetchTranscripts = true,
    minCommentScore = 35
  } = options;
  
  console.log(`[Enhanced] Starting YouTube scrape for: ${bikeName}`);
  
  // Generate targeted search queries
  const queries = generateSearchQueries(bikeName);
  
  // Track unique video IDs to avoid duplicates
  const seenVideoIds = new Set<string>();
  const videos: EnhancedYouTubeVideo[] = [];
  
  // Execute queries by priority
  const sortedQueries = queries.sort((a, b) => a.priority - b.priority);
  
  for (const searchQuery of sortedQueries) {
    if (videos.length >= maxVideos) break;
    
    try {
      const searchResults = await searchYouTube(searchQuery.query, apiKey, searchQuery.maxResults);
      
      for (const result of searchResults) {
        if (seenVideoIds.has(result.videoId)) continue;
        if (videos.length >= maxVideos) break;
        
        seenVideoIds.add(result.videoId);
        
        // Fetch video details and comments
        const videoData = await fetchVideoWithComments(
          result.videoId,
          result,
          apiKey,
          minCommentScore
        );
        
        // Add content type from query
        videoData.contentType = searchQuery.contentType;
        
        // Fetch transcript if enabled
        if (fetchTranscripts) {
          const transcript = await fetchTranscriptWithLibrary(result.videoId);
          if (transcript) {
            videoData.transcript = summarizeTranscript(transcript, 3000); // Increased from 1000 to 3000
            videoData.transcriptKeyMoments = transcript.keyMoments.map(km => ({
              topic: km.topic,
              text: km.text
            }));
            videoData.metadata.hasTranscript = true;
          }
        }
        
        videos.push(videoData);
        
        const transcriptStatus = videoData.metadata.hasTranscript ? '📝' : '';
        console.log(`[Enhanced] Fetched: ${videoData.title.substring(0, 50)}... (Trust: ${videoData.trustScore}, Comments: ${videoData.comments.length}) ${transcriptStatus}`);
        
        // Small delay to be respectful
        await delay(150);
      }
      
    } catch (error) {
      console.error(`[Enhanced] Query failed: ${searchQuery.query}`, error);
    }
  }
  
  // Sort videos by trust score + content value
  videos.sort((a, b) => {
    const scoreA = a.trustScore * 10 + (a.metadata.hasTranscript ? 20 : 0) + a.comments.length;
    const scoreB = b.trustScore * 10 + (b.metadata.hasTranscript ? 20 : 0) + b.comments.length;
    return scoreB - scoreA;
  });
  
  // Calculate summary stats
  const allTopics = videos.flatMap(v => v.comments.flatMap(c => c.relevantTopics));
  const topicCounts = allTopics.reduce((acc, topic) => {
    acc[topic] = (acc[topic] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic]) => topic);
  
  return {
    bike_name: bikeName,
    videos,
    comparisonVideos: [],  // Filled by comparison scraper
    summary: {
      total_videos: videos.length,
      trusted_channel_videos: videos.filter(v => v.metadata.isTrustedChannel).length,
      videos_with_transcripts: videos.filter(v => v.metadata.hasTranscript).length,
      total_quality_comments: videos.reduce((sum, v) => sum + v.comments.length, 0),
      top_topics: topTopics
    }
  };
}

/**
 * Scrape comparison videos between two bikes
 */
export async function scrapeComparisonVideos(
  bike1: string,
  bike2: string,
  apiKey: string
): Promise<EnhancedYouTubeVideo[]> {
  const queries = generateComparisonQueries(bike1, bike2);
  const seenIds = new Set<string>();
  const videos: EnhancedYouTubeVideo[] = [];
  
  for (const query of queries) {
    const results = await searchYouTube(query.query, apiKey, query.maxResults);
    
    for (const result of results) {
      if (seenIds.has(result.videoId)) continue;
      seenIds.add(result.videoId);
      
      const videoData = await fetchVideoWithComments(result.videoId, result, apiKey, 35);
      videoData.contentType = 'comparison';
      
      // Fetch transcript for comparisons (very valuable)
      const transcript = await fetchTranscriptWithLibrary(result.videoId);
      if (transcript) {
        videoData.transcript = summarizeTranscript(transcript, 4000);  // Increased from 1500 to 4000 for comparisons
        videoData.transcriptKeyMoments = transcript.keyMoments.map(km => ({
          topic: km.topic,
          text: km.text
        }));
        videoData.metadata.hasTranscript = true;
      }
      
      videos.push(videoData);
      
      const transcriptStatus = videoData.metadata.hasTranscript ? '📝' : '';
      console.log(`[Enhanced] Comparison: ${videoData.title.substring(0, 50)}... ${transcriptStatus}`);
    }
  }
  
  const withTranscripts = videos.filter(v => v.metadata.hasTranscript).length;
  console.log(`[Enhanced] Comparison videos: ${videos.length} total, ${withTranscripts} with transcripts`);
  
  return videos.slice(0, 5);  // Max 5 comparison videos
}

/**
 * Search YouTube with the Data API
 */
async function searchYouTube(
  query: string,
  apiKey: string,
  maxResults: number
): Promise<Array<{ videoId: string; title: string; description: string; channelTitle: string; publishedAt: string }>> {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('regionCode', 'IN');
  url.searchParams.set('relevanceLanguage', 'en');
  url.searchParams.set('order', 'relevance');
  url.searchParams.set('key', apiKey);
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);
  
  const data = await response.json();
  
  return (data.items || []).map((item: any) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt
  }));
}

/**
 * Fetch video details and quality-scored comments
 */
async function fetchVideoWithComments(
  videoId: string,
  basicInfo: { title: string; description: string; channelTitle: string; publishedAt: string },
  apiKey: string,
  minCommentScore: number
): Promise<EnhancedYouTubeVideo> {
  // Fetch video stats AND full snippet (for complete description)
  const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  statsUrl.searchParams.set('part', 'snippet,statistics'); // Get both snippet and statistics
  statsUrl.searchParams.set('id', videoId);
  statsUrl.searchParams.set('key', apiKey);
  
  const statsResponse = await fetch(statsUrl.toString());
  const statsData = await statsResponse.json();
  const videoData = statsData.items?.[0];
  const viewCount = parseInt(videoData?.statistics?.viewCount || '0');
  
  // Use full description from video details API (not truncated search snippet)
  const fullDescription = videoData?.snippet?.description || basicInfo.description;
  const fullTitle = videoData?.snippet?.title || basicInfo.title;
  const fullChannelTitle = videoData?.snippet?.channelTitle || basicInfo.channelTitle;
  
  // Fetch comments
  const commentsUrl = new URL('https://www.googleapis.com/youtube/v3/commentThreads');
  commentsUrl.searchParams.set('part', 'snippet');
  commentsUrl.searchParams.set('videoId', videoId);
  commentsUrl.searchParams.set('maxResults', '100');
  commentsUrl.searchParams.set('order', 'relevance');
  commentsUrl.searchParams.set('textFormat', 'plainText');
  commentsUrl.searchParams.set('key', apiKey);
  
  let rawComments: Array<{ author: string; text: string; likeCount: number }> = [];
  
  try {
    const commentsResponse = await fetch(commentsUrl.toString());
    if (commentsResponse.ok) {
      const commentsData = await commentsResponse.json();
      rawComments = (commentsData.items || []).map((item: any) => ({
        author: item.snippet.topLevelComment.snippet.authorDisplayName,
        text: item.snippet.topLevelComment.snippet.textDisplay,
        likeCount: item.snippet.topLevelComment.snippet.likeCount || 0
      }));
    }
  } catch (error) {
    console.warn(`Failed to fetch comments for ${videoId}`);
  }
  
  // Quality filter comments
  const qualityComments = filterAndRankComments(rawComments, {
    minScore: minCommentScore,
    maxComments: 15,
    preferExperiences: true,
    excludeSpam: true
  });
  
  const trustScore = getChannelTrustScore(fullChannelTitle);
  const trusted = isTrustedChannel(fullChannelTitle);
  
  return {
    videoId,
    title: fullTitle,
    description: fullDescription, // FULL description from videos API, NOT truncated!
    channelTitle: fullChannelTitle,
    publishedAt: basicInfo.publishedAt,
    viewCount,
    trustScore,
    contentType: 'review',  // Default, will be overwritten
    transcript: null,
    transcriptKeyMoments: [],
    comments: qualityComments,
    metadata: {
      hasTranscript: false,
      isTrustedChannel: trusted,
      commentQualityAvg: qualityComments.length > 0 
        ? qualityComments.reduce((sum, c) => sum + c.qualityScore, 0) / qualityComments.length 
        : 0
    }
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Full comparison scraper - both bikes + comparison videos
 */
export async function scrapeYouTubeForComparisonEnhanced(
  bike1: string,
  bike2: string,
  apiKey: string
): Promise<{
  bike1: EnhancedScrapedData;
  bike2: EnhancedScrapedData;
  comparison: EnhancedYouTubeVideo[];
}> {
  console.log(`[Enhanced] Starting comparison scrape: ${bike1} vs ${bike2}`);
  
  // Scrape both bikes in parallel
  const [bike1Data, bike2Data] = await Promise.all([
    scrapeYouTubeEnhanced(bike1, apiKey, { maxVideos: 10, fetchTranscripts: true }),
    scrapeYouTubeEnhanced(bike2, apiKey, { maxVideos: 10, fetchTranscripts: true })
  ]);
  
  // Scrape comparison videos
  const comparisonVideos = await scrapeComparisonVideos(bike1, bike2, apiKey);
  
  console.log(`[Enhanced] Scrape complete:
    ${bike1}: ${bike1Data.summary.total_videos} videos, ${bike1Data.summary.total_quality_comments} comments
    ${bike2}: ${bike2Data.summary.total_videos} videos, ${bike2Data.summary.total_quality_comments} comments
    Comparisons: ${comparisonVideos.length} videos`);
  
  return {
    bike1: bike1Data,
    bike2: bike2Data,
    comparison: comparisonVideos
  };
}

