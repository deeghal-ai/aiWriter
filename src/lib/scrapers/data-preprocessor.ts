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
    // ENHANCED: Smart summarization for description/transcript
    // Use intelligent summarization that extracts key information
    const smartDescription = video.description 
      ? smartSummarizeContent(video.description, 2500) // Increased from 150 to 2500
      : '';

    // Handle transcript if available
    const transcriptSummary = video.transcript
      ? smartSummarizeContent(video.transcript, 3000) // Smart summarization for transcripts
      : null;

    // Include transcript key moments if available (already topic-extracted)
    const keyMoments = video.transcriptKeyMoments || [];

    // Filter comments by quality (min 2 likes) and sort by likes
    const qualityComments = (video.comments || [])
      .filter((c: any) => (c.likeCount || 0) >= 2)
      .sort((a: any, b: any) => (b.likeCount || 0) - (a.likeCount || 0));

    // Deduplicate similar comments
    const uniqueComments = deduplicateComments(qualityComments);

    // Take top 20 unique, quality comments (increased from 15)
    const topComments = uniqueComments
      .slice(0, 20)
      .map((comment: any) => ({
        author: comment.author || 'Anonymous',
        text: truncateSmartly(comment.text, 300), // Increased from 250 to 300
        likeCount: comment.likeCount || 0
      }));

    return {
      title: video.title,
      description: smartDescription,
      transcript: transcriptSummary,
      transcriptKeyMoments: keyMoments,
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
 * Smart summarization that extracts the most valuable content
 * Uses topic-based extraction and key sentence identification
 */
function smartSummarizeContent(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  
  // Topic keywords for motorcycle reviews (prioritize these)
  const importantKeywords = [
    // Performance & Engine
    'engine', 'power', 'torque', 'performance', 'acceleration', 'pickup', 'refinement', 'vibration',
    'bhp', 'rpm', 'cc', 'displacement', 'smoothness',
    
    // Ride Quality
    'suspension', 'handling', 'ride quality', 'comfort', 'cornering', 'stability', 'braking',
    'abs', 'front brake', 'rear brake', 'grip', 'ground clearance',
    
    // Practicality
    'fuel economy', 'mileage', 'kmpl', 'fuel tank', 'range', 'pillion', 'seat', 'ergonomics',
    'heat', 'temperature', 'traffic', 'commute', 'highway',
    
    // Build & Features
    'build quality', 'fit and finish', 'paint', 'panel gaps', 'features', 'instrument cluster',
    'digital display', 'bluetooth', 'navigation', 'service', 'maintenance', 'reliability',
    
    // Value & Ownership
    'price', 'value', 'worth', 'cost', 'ownership', 'resale', 'insurance', 'emi',
    'pros', 'cons', 'issues', 'problems', 'complaints', 'satisfaction'
  ];
  
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  // Score each sentence based on keyword presence
  const scoredSentences = sentences.map(sentence => {
    const lowerSentence = sentence.toLowerCase();
    const keywordCount = importantKeywords.filter(keyword => 
      lowerSentence.includes(keyword.toLowerCase())
    ).length;
    
    // Also prioritize sentences with numbers (specs, prices, mileage)
    const hasNumbers = /\d+/.test(sentence);
    const numberBonus = hasNumbers ? 2 : 0;
    
    return {
      text: sentence.trim(),
      score: keywordCount + numberBonus,
      length: sentence.length
    };
  });
  
  // Sort by score (descending)
  scoredSentences.sort((a, b) => b.score - a.score);
  
  // Build summary from highest-scoring sentences
  let summary = '';
  let currentLength = 0;
  
  for (const sentence of scoredSentences) {
    if (currentLength + sentence.length + 1 <= maxLength) {
      summary += sentence.text + ' ';
      currentLength += sentence.length + 1;
    }
    if (currentLength >= maxLength * 0.9) break; // Close enough
  }
  
  // If we got very little, fall back to truncateSmartly
  if (summary.length < maxLength * 0.3) {
    return truncateSmartly(text, maxLength);
  }
  
  return summary.trim();
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

