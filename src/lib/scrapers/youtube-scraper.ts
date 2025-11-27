// YouTube Data API v3 scraper for motorcycle reviews and owner discussions

interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  viewCount?: string;
  comments: YouTubeComment[];
}

interface YouTubeComment {
  author: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

interface ScrapedYouTubeData {
  bike_name: string;
  videos: YouTubeVideo[];
  total_videos: number;
  total_comments: number;
}

/**
 * Scrapes YouTube for motorcycle reviews and discussions
 * Uses official YouTube Data API v3 (FREE, no blocking!)
 */
export async function scrapeYouTubeForBike(
  bikeName: string,
  apiKey: string
): Promise<ScrapedYouTubeData> {
  
  console.log(`Searching YouTube for: ${bikeName}`);
  
  // Step 1: Search for relevant videos
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('q', `${bikeName} review india owner experience`);
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('maxResults', '20');
  searchUrl.searchParams.set('relevanceLanguage', 'en');
  searchUrl.searchParams.set('regionCode', 'IN'); // Focus on Indian content
  searchUrl.searchParams.set('order', 'relevance');
  searchUrl.searchParams.set('key', apiKey);

  const searchResponse = await fetch(searchUrl.toString());
  
  if (!searchResponse.ok) {
    throw new Error(`YouTube API error: ${searchResponse.status} ${searchResponse.statusText}`);
  }

  const searchData = await searchResponse.json();
  const videos: YouTubeVideo[] = [];

  console.log(`Found ${searchData.items?.length || 0} videos for ${bikeName}`);

  // Step 2: Fetch full video details (for complete descriptions)
  const videoIds = (searchData.items || []).map((item: any) => item.id.videoId);
  const videoDetailsMap = await fetchVideoDetails(videoIds, apiKey);

  // Step 3: Fetch comments for each video
  for (const item of searchData.items || []) {
    const videoId = item.id.videoId;
    const videoDetails = videoDetailsMap[videoId];
    
    try {
      // Fetch video comments
      const commentsUrl = new URL('https://www.googleapis.com/youtube/v3/commentThreads');
      commentsUrl.searchParams.set('part', 'snippet');
      commentsUrl.searchParams.set('videoId', videoId);
      commentsUrl.searchParams.set('maxResults', '100');
      commentsUrl.searchParams.set('order', 'relevance'); // Get most relevant comments
      commentsUrl.searchParams.set('textFormat', 'plainText');
      commentsUrl.searchParams.set('key', apiKey);

      const commentsResponse = await fetch(commentsUrl.toString());
      
      if (!commentsResponse.ok) {
        console.warn(`Failed to fetch comments for video ${videoId}: ${commentsResponse.status}`);
        // Continue with empty comments
        videos.push({
          videoId,
          title: videoDetails?.title || item.snippet.title,
          description: videoDetails?.description || item.snippet.description,
          channelTitle: videoDetails?.channelTitle || item.snippet.channelTitle,
          publishedAt: videoDetails?.publishedAt || item.snippet.publishedAt,
          viewCount: videoDetails?.viewCount,
          comments: [],
        });
        continue;
      }

      const commentsData = await commentsResponse.json();

      const comments: YouTubeComment[] = (commentsData.items || []).map((commentItem: any) => {
        const snippet = commentItem.snippet.topLevelComment.snippet;
        return {
          author: snippet.authorDisplayName,
          text: snippet.textDisplay,
          likeCount: snippet.likeCount || 0,
          publishedAt: snippet.publishedAt,
        };
      });

      videos.push({
        videoId,
        title: videoDetails?.title || item.snippet.title,
        description: videoDetails?.description || item.snippet.description,
        channelTitle: videoDetails?.channelTitle || item.snippet.channelTitle,
        publishedAt: videoDetails?.publishedAt || item.snippet.publishedAt,
        viewCount: videoDetails?.viewCount,
        comments,
      });

      console.log(`Fetched ${comments.length} comments for: ${item.snippet.title.substring(0, 50)}...`);

      // Small delay to be respectful (though not required for official API)
      await delay(100);

    } catch (error) {
      console.error(`Error fetching comments for video ${videoId}:`, error);
      // Continue with other videos
    }
  }

  const totalComments = videos.reduce((sum, video) => sum + video.comments.length, 0);
  
  console.log(`YouTube scraping complete for ${bikeName}: ${videos.length} videos, ${totalComments} comments`);

  return {
    bike_name: bikeName,
    videos,
    total_videos: videos.length,
    total_comments: totalComments,
  };
}

/**
 * Scrapes YouTube for two bikes in parallel
 */
export async function scrapeYouTubeForComparison(
  bike1: string,
  bike2: string,
  apiKey: string
): Promise<{ bike1: ScrapedYouTubeData; bike2: ScrapedYouTubeData }> {
  
  console.log(`Starting YouTube scraping for: ${bike1} vs ${bike2}`);

  // Scrape both bikes in parallel for speed
  const [bike1Data, bike2Data] = await Promise.all([
    scrapeYouTubeForBike(bike1, apiKey),
    scrapeYouTubeForBike(bike2, apiKey),
  ]);

  return {
    bike1: bike1Data,
    bike2: bike2Data,
  };
}

/**
 * Formats YouTube data for AI processing
 */
export function formatYouTubeDataForAI(data: ScrapedYouTubeData): string {
  let output = `# YouTube Data for ${data.bike_name}\n\n`;
  output += `Total Videos: ${data.total_videos}\n`;
  output += `Total Comments: ${data.total_comments}\n\n`;
  output += `---\n\n`;
  
  data.videos.forEach((video, idx) => {
    output += `## Video ${idx + 1}: ${video.title}\n`;
    output += `Channel: ${video.channelTitle}\n`;
    output += `Published: ${new Date(video.publishedAt).toLocaleDateString()}\n`;
    output += `URL: https://www.youtube.com/watch?v=${video.videoId}\n\n`;
    
    if (video.description) {
      const shortDesc = video.description.substring(0, 300);
      output += `**Description:**\n${shortDesc}${video.description.length > 300 ? '...' : ''}\n\n`;
    }
    
    if (video.comments.length > 0) {
      output += `**Top Comments (${video.comments.length}):**\n\n`;
      
      // Sort by likes and take top 20
      const topComments = video.comments
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, 20);
      
      topComments.forEach((comment, cidx) => {
        output += `${cidx + 1}. **${comment.author}** (${comment.likeCount} likes):\n`;
        output += `   ${comment.text}\n\n`;
      });
    } else {
      output += `*No comments available*\n\n`;
    }
    
    output += `---\n\n`;
  });
  
  return output;
}

/**
 * Fetch full video details including complete descriptions
 * YouTube search API only returns truncated snippets, so we need this
 */
async function fetchVideoDetails(
  videoIds: string[],
  apiKey: string
): Promise<Record<string, { title: string; description: string; channelTitle: string; publishedAt: string; viewCount: string }>> {
  if (videoIds.length === 0) return {};

  const detailsMap: Record<string, any> = {};

  // YouTube API allows up to 50 IDs per request
  const batchSize = 50;
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'snippet,statistics');
    detailsUrl.searchParams.set('id', batch.join(','));
    detailsUrl.searchParams.set('key', apiKey);

    try {
      const response = await fetch(detailsUrl.toString());
      
      if (!response.ok) {
        console.warn(`Failed to fetch video details: ${response.status}`);
        continue;
      }

      const data = await response.json();

      for (const item of data.items || []) {
        detailsMap[item.id] = {
          title: item.snippet.title,
          description: item.snippet.description, // FULL description, not truncated!
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          viewCount: item.statistics?.viewCount || '0',
        };
      }
    } catch (error) {
      console.error(`Error fetching video details batch:`, error);
    }
  }

  console.log(`Fetched full details for ${Object.keys(detailsMap).length} videos`);
  return detailsMap;
}

/**
 * Helper function to add delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate YouTube API key format
 */
export function validateYouTubeApiKey(apiKey: string): boolean {
  // YouTube API keys typically start with "AIza" and are 39 characters
  return apiKey.startsWith('AIza') && apiKey.length === 39;
}

