/**
 * Data Preprocessor
 * Reduces scraped data size to fit within Claude's token limits
 */

/**
 * Preprocess YouTube data to reduce token count
 * Keeps most relevant information while staying under token limits
 */
export function preprocessYouTubeData(youtubeData: any): any {
  if (!youtubeData || !youtubeData.bike1 || !youtubeData.bike2) {
    return youtubeData;
  }

  return {
    bike1: preprocessBikeData(youtubeData.bike1),
    bike2: preprocessBikeData(youtubeData.bike2)
  };
}

function preprocessBikeData(bikeData: any): any {
  if (!bikeData || !bikeData.videos) {
    return bikeData;
  }

  // Sort videos by engagement (comments count + likes)
  const sortedVideos = [...bikeData.videos].sort((a: any, b: any) => {
    const engagementA = (a.comments?.length || 0) * 10 + (a.viewCount || 0);
    const engagementB = (b.comments?.length || 0) * 10 + (b.viewCount || 0);
    return engagementB - engagementA;
  });

  // Take top 10 videos (optimal for speed/quality)
  const videos = sortedVideos.slice(0, 10).map((video: any) => {
    // Smart truncation for description
    const shortDescription = video.description 
      ? truncateSmartly(video.description, 150)
      : '';

    // Filter comments by quality (min 2 likes) and sort by likes
    const qualityComments = (video.comments || [])
      .filter((c: any) => (c.likeCount || 0) >= 2)
      .sort((a: any, b: any) => (b.likeCount || 0) - (a.likeCount || 0));

    // Deduplicate similar comments
    const uniqueComments = deduplicateComments(qualityComments);

    // Take top 15 unique, quality comments
    const topComments = uniqueComments
      .slice(0, 15)
      .map((comment: any) => ({
        author: comment.author || 'Anonymous',
        text: truncateSmartly(comment.text, 250),
        likeCount: comment.likeCount || 0
      }));

    return {
      title: video.title,
      description: shortDescription,
      channelTitle: video.channelTitle,
      publishedAt: video.publishedAt,
      comments: topComments
    };
  });

  return {
    bike_name: bikeData.bike_name,
    videos: videos,
    total_videos: videos.length,
    total_comments: videos.reduce((sum: number, v: any) => sum + v.comments.length, 0)
  };
}

/**
 * Preprocess Reddit data to reduce token count
 */
export function preprocessRedditData(redditData: any): any {
  if (!redditData || !redditData.bike1 || !redditData.bike2) {
    return redditData;
  }

  return {
    bike1: preprocessRedditBikeData(redditData.bike1),
    bike2: preprocessRedditBikeData(redditData.bike2),
    metadata: redditData.metadata
  };
}

function preprocessRedditBikeData(bikeData: any): any {
  if (!bikeData || !bikeData.posts) {
    return bikeData;
  }

  // Take top 10 posts (or all if less)
  const posts = bikeData.posts.slice(0, 10).map((post: any) => {
    // Limit post content to 500 characters
    const shortText = post.selftext 
      ? post.selftext.substring(0, 500) + (post.selftext.length > 500 ? '...' : '')
      : '';

    // Take top 5 comments per post
    const topComments = (post.comments || [])
      .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .map((comment: any) => ({
        author: comment.author,
        body: comment.body.substring(0, 300), // Limit comment length
        score: comment.score
      }));

    return {
      title: post.title,
      selftext: shortText,
      author: post.author,
      comments: topComments,
      score: post.score,
      num_comments: post.num_comments
    };
  });

  return {
    name: bikeData.name,
    posts: posts
  };
}

/**
 * Main preprocessing function
 * Automatically detects data type and preprocesses accordingly
 */
export function preprocessScrapedData(data: any, dataType?: 'reddit' | 'youtube'): any {
  if (!data) return data;

  // Auto-detect data type if not specified
  if (!dataType) {
    if (data.bike1?.videos || data.bike2?.videos) {
      dataType = 'youtube';
    } else if (data.bike1?.posts || data.bike2?.posts) {
      dataType = 'reddit';
    }
  }

  switch (dataType) {
    case 'youtube':
      return preprocessYouTubeData(data);
    case 'reddit':
      return preprocessRedditData(data);
    default:
      return data;
  }
}

/**
 * Smart truncation that preserves sentence boundaries
 */
function truncateSmartly(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  
  // Find last sentence boundary before maxLength
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclaim = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  
  const lastBoundary = Math.max(lastPeriod, lastExclaim, lastQuestion);
  
  // Use sentence boundary if it's not too far back
  if (lastBoundary > maxLength * 0.5) {
    return text.substring(0, lastBoundary + 1);
  }
  
  return truncated + '...';
}

/**
 * Remove comments that are >70% similar
 */
function deduplicateComments(comments: any[]): any[] {
  const unique: any[] = [];
  
  for (const comment of comments) {
    const isDuplicate = unique.some(existing => 
      calculateSimilarity(existing.text, comment.text) > 0.7
    );
    
    if (!isDuplicate) {
      unique.push(comment);
    }
  }
  
  return unique;
}

/**
 * Simple Jaccard similarity for text
 */
function calculateSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Estimate token count (rough approximation)
 * 1 token ≈ 3.5 characters for mixed content (more accurate)
 */
export function estimateTokenCount(data: any): number {
  const jsonString = JSON.stringify(data);
  return Math.ceil(jsonString.length / 3.5);
}

/**
 * Check if data needs preprocessing
 */
export function needsPreprocessing(data: any, maxTokens: number = 150000): boolean {
  const estimatedTokens = estimateTokenCount(data);
  console.log(`Estimated tokens: ${estimatedTokens}`);
  return estimatedTokens > maxTokens;
}

