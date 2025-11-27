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

  // Take top 15 videos instead of all 20
  const videos = bikeData.videos.slice(0, 15).map((video: any) => {
    // Limit description to 200 characters
    const shortDescription = video.description 
      ? video.description.substring(0, 200) + '...'
      : '';

    // Take top 20 comments sorted by likes (most relevant)
    const topComments = (video.comments || [])
      .sort((a: any, b: any) => (b.likeCount || 0) - (a.likeCount || 0))
      .slice(0, 20)
      .map((comment: any) => ({
        author: comment.author,
        text: comment.text.substring(0, 300), // Limit comment length
        likeCount: comment.likeCount
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
 * Estimate token count (rough approximation)
 * 1 token ≈ 4 characters for English text
 */
export function estimateTokenCount(data: any): number {
  const jsonString = JSON.stringify(data);
  return Math.ceil(jsonString.length / 4);
}

/**
 * Check if data needs preprocessing
 */
export function needsPreprocessing(data: any, maxTokens: number = 150000): boolean {
  const estimatedTokens = estimateTokenCount(data);
  console.log(`Estimated tokens: ${estimatedTokens}`);
  return estimatedTokens > maxTokens;
}

