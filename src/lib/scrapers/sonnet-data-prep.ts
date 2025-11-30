// Smart data preparation for Sonnet extraction
// Goal: Maximum insight density, minimum tokens

interface PreparedComment {
  text: string;
  author: string;
  likes: number;
  qualityScore: number;
  topics: string[];
  source: 'YouTube' | 'Reddit';
}

interface PreparedVideo {
  title: string;
  channel: string;
  isReview: boolean;
  isRedditPost: boolean;  // Whether this is a Reddit post converted to video format
  keyPoints: string[];  // Extracted from description
  topComments: PreparedComment[];
}

export interface PreparedBikeData {
  bikeName: string;
  videoCount: number;
  totalComments: number;
  qualityComments: number;
  videos: PreparedVideo[];
  topicDistribution: Record<string, number>;
}

/**
 * Prepare YouTube data for Sonnet extraction
 * Goal: Maximum insight density, minimum tokens
 */
export function prepareBikeDataForSonnet(
  rawData: any,
  bikeName: string
): PreparedBikeData {
  const videos = rawData?.videos || [];
  
  // Process each video
  const preparedVideos: PreparedVideo[] = videos
    .slice(0, 12)  // Max 12 videos
    .map((video: any) => prepareVideo(video))
    .filter((v: PreparedVideo) => v.topComments.length >= 3);  // Must have quality comments
  
  // Calculate topic distribution
  const allTopics = preparedVideos.flatMap(v => 
    v.topComments.flatMap(c => c.topics)
  );
  const topicCounts = allTopics.reduce((acc, topic) => {
    acc[topic] = (acc[topic] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    bikeName,
    videoCount: preparedVideos.length,
    totalComments: videos.reduce((sum: number, v: any) => sum + (v.comments?.length || 0), 0),
    qualityComments: preparedVideos.reduce((sum, v) => sum + v.topComments.length, 0),
    videos: preparedVideos,
    topicDistribution: topicCounts
  };
}

function prepareVideo(video: any): PreparedVideo {
  // Check if this is a Reddit post
  const isRedditPost = video.isRedditPost || video.source === 'Reddit';
  
  // Extract key points from description/selftext (not the whole thing)
  const textContent = video.description || video.selftext || '';
  const keyPoints = extractKeyPoints(textContent);
  
  // For Reddit posts, also include the selftext as a key point if meaningful
  if (isRedditPost && video.selftext && video.selftext.length > 50) {
    const truncatedSelftext = video.selftext.substring(0, 200).trim();
    if (truncatedSelftext && !keyPoints.includes(truncatedSelftext)) {
      keyPoints.unshift(truncatedSelftext);
    }
  }
  
  // Identify if this is a review vs random mention
  const isReview = isRedditPost || isLikelyReview(video.title, textContent);
  
  // Process and score comments (lower threshold for Reddit since they're often higher quality)
  const qualityThreshold = isRedditPost ? 35 : 40;
  const scoredComments = (video.comments || [])
    .map((c: any) => scoreAndEnrichComment(c))
    .filter((c: PreparedComment) => c.qualityScore >= qualityThreshold)
    .sort((a: PreparedComment, b: PreparedComment) => b.qualityScore - a.qualityScore);
  
  // Deduplicate similar comments
  const dedupedComments = deduplicateComments(scoredComments);
  
  return {
    title: cleanTitle(video.title),
    channel: video.channelTitle || 'Unknown',
    isReview,
    isRedditPost,
    keyPoints: keyPoints.slice(0, 4),  // Max 4 key points
    topComments: dedupedComments.slice(0, 10)  // Top 10 per video/post
  };
}

function scoreAndEnrichComment(comment: any): PreparedComment {
  const text = (comment.text || comment.body || '').trim();
  const likes = comment.likeCount || comment.score || 0;
  const source: 'YouTube' | 'Reddit' = comment.source === 'Reddit' ? 'Reddit' : 'YouTube';
  
  let score = 30;  // Base score
  
  // Reddit comments often have longer, more detailed experiences
  if (source === 'Reddit') {
    score += 5;  // Slight boost for Reddit's discussion format
  }
  
  // Length scoring (50-400 chars is sweet spot)
  if (text.length >= 50 && text.length <= 400) score += 15;
  else if (text.length < 30) score -= 20;
  else if (text.length > 800) score -= 5;
  
  // Likes scoring (social proof)
  if (likes >= 50) score += 25;
  else if (likes >= 20) score += 20;
  else if (likes >= 10) score += 15;
  else if (likes >= 5) score += 10;
  else if (likes >= 1) score += 5;
  
  // Experience indicators (HUGE boost)
  const experiencePatterns = [
    /i (have|own|bought|ride|use)/i,
    /my (bike|apache|pulsar|experience)/i,
    /after \d+ (months?|years?|kms?|kilometers?)/i,
    /\d+,?\d* (kms?|kilometers?)/i,
    /(daily|regularly|commute|touring)/i,
    /(service|maintenance|dealer)/i
  ];
  
  const experienceMatches = experiencePatterns.filter(p => p.test(text)).length;
  if (experienceMatches >= 2) score += 25;
  else if (experienceMatches === 1) score += 15;
  
  // Specific numbers (credibility boost)
  if (/\d{2,3}\s*(kmpl|km\/l)/i.test(text)) score += 10;  // Mileage figures
  if (/₹?\s*\d{1,2},?\d{3}/i.test(text)) score += 8;  // Price/cost figures
  if (/\d{4,5}\s*(rpm|RPM)/i.test(text)) score += 8;  // Technical specs
  
  // Topic detection
  const topics = detectTopics(text);
  if (topics.length >= 2) score += 10;
  
  // Spam indicators (HUGE penalty)
  const spamPatterns = [
    /subscribe|channel|check out/i,
    /please (like|reply|pin)/i,
    /first comment/i,
    /❤️{2,}|🔥{2,}|👍{2,}/,
    /bhai.*reply/i
  ];
  
  if (spamPatterns.some(p => p.test(text))) score -= 40;
  
  return {
    text: cleanCommentText(text),
    author: comment.author || 'Anonymous',
    likes,
    qualityScore: Math.max(0, Math.min(100, score)),
    topics,
    source
  };
}

function detectTopics(text: string): string[] {
  const topics: string[] = [];
  const lowerText = text.toLowerCase();
  
  const topicPatterns: Record<string, RegExp[]> = {
    'Engine': [/engine|power|torque|rpm|pickup|acceleration|refinement/],
    'Mileage': [/mileage|fuel|economy|kmpl|average|tank/],
    'Comfort': [/comfort|seat|ergonomic|position|pillion|back pain/],
    'Handling': [/handling|corner|lean|balance|agile|nimble/],
    'Build': [/build|quality|finish|paint|plastic|fit/],
    'Brakes': [/brake|braking|abs|stopping/],
    'Service': [/service|maintenance|dealer|spare|cost/],
    'Reliability': [/reliable|problem|issue|breakdown|defect/],
    'Value': [/price|value|worth|money|expensive|affordable/],
    'Highway': [/highway|touring|long ride|trip|stability/],
    'City': [/city|traffic|commute|daily|office/],
    'Sound': [/exhaust|sound|note|loud|silent/]
  };
  
  for (const [topic, patterns] of Object.entries(topicPatterns)) {
    if (patterns.some(p => p.test(lowerText))) {
      topics.push(topic);
    }
  }
  
  return topics;
}

function deduplicateComments(comments: PreparedComment[]): PreparedComment[] {
  const unique: PreparedComment[] = [];
  
  for (const comment of comments) {
    const isDupe = unique.some(existing => {
      const similarity = jaccardSimilarity(
        existing.text.toLowerCase(),
        comment.text.toLowerCase()
      );
      return similarity > 0.5;  // 50% similar = duplicate
    });
    
    if (!isDupe) {
      unique.push(comment);
    }
  }
  
  return unique;
}

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 3));
  
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

function extractKeyPoints(description: string): string[] {
  if (!description) return [];
  
  // Remove timestamps, links, hashtags
  const cleaned = description
    .replace(/\d{1,2}:\d{2}/g, '')  // Timestamps
    .replace(/https?:\/\/\S+/g, '')  // URLs
    .replace(/#\w+/g, '')  // Hashtags
    .replace(/[@]\w+/g, '');  // Mentions
  
  // Extract meaningful sentences
  const sentences = cleaned.split(/[.\n]/)
    .map(s => s.trim())
    .filter(s => s.length >= 30 && s.length <= 200)
    .filter(s => !/(subscribe|follow|like|comment|share)/i.test(s));
  
  return sentences.slice(0, 3);
}

function isLikelyReview(title: string, description: string): boolean {
  const reviewIndicators = [
    /review/i, /ownership/i, /experience/i, /first ride/i,
    /pros.*cons/i, /should you buy/i, /worth/i, /honest/i,
    /\d+\s*(months?|years?|kms?)/i
  ];
  
  const combined = `${title} ${description}`;
  return reviewIndicators.some(p => p.test(combined));
}

function cleanTitle(title: string): string {
  return title
    .replace(/\|.*$/, '')  // Remove channel suffix
    .replace(/[-–—].*$/, '')  // Remove dash suffix
    .trim()
    .substring(0, 80);
}

function cleanCommentText(text: string): string {
  return text
    .replace(/\n+/g, ' ')  // Newlines to spaces
    .replace(/\s+/g, ' ')  // Multiple spaces to one
    .trim()
    .substring(0, 350);  // Max 350 chars
}

/**
 * Format prepared data for Sonnet prompt
 * Token-efficient structure with source attribution
 */
export function formatForSonnetPrompt(data: PreparedBikeData): string {
  // Count sources
  const youtubeCount = data.videos.filter(v => !v.isRedditPost).length;
  const redditCount = data.videos.filter(v => v.isRedditPost).length;
  
  let output = `BIKE: ${data.bikeName}\n`;
  output += `SOURCES: `;
  
  const sourceParts = [];
  if (youtubeCount > 0) sourceParts.push(`${youtubeCount} YouTube videos`);
  if (redditCount > 0) sourceParts.push(`${redditCount} Reddit posts`);
  sourceParts.push(`${data.qualityComments} quality comments total`);
  output += sourceParts.join(', ') + '\n';
  
  output += `TOPICS MENTIONED: ${Object.entries(data.topicDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8)
    .map(([t, c]) => `${t}(${c})`)
    .join(', ')}\n\n`;
  
  // Group comments by topic for easier extraction
  const commentsByTopic: Record<string, PreparedComment[]> = {};
  
  data.videos.forEach(video => {
    // Add video/post context
    const sourceLabel = video.isRedditPost ? 'REDDIT' : 'REVIEW';
    if ((video.isReview || video.isRedditPost) && video.keyPoints.length > 0) {
      output += `[${sourceLabel}: ${video.channel}] ${video.title}\n`;
      output += `Key points: ${video.keyPoints.join('; ')}\n\n`;
    }
    
    // Group comments
    video.topComments.forEach(comment => {
      comment.topics.forEach(topic => {
        if (!commentsByTopic[topic]) commentsByTopic[topic] = [];
        commentsByTopic[topic].push(comment);
      });
    });
  });
  
  // Output comments grouped by topic with source attribution
  output += `\n--- OWNER COMMENTS BY TOPIC ---\n`;
  output += `(Source indicated: YT=YouTube, R=Reddit)\n\n`;
  
  for (const [topic, comments] of Object.entries(commentsByTopic)) {
    output += `[${topic.toUpperCase()}]\n`;
    
    // Top 6 unique comments per topic (increased from 5 for combined sources)
    const uniqueComments = comments
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 6);
    
    uniqueComments.forEach(c => {
      const sourceIcon = c.source === 'Reddit' ? 'R' : 'YT';
      output += `• [${sourceIcon}] "${c.text}" —${c.author} (${c.likes}👍)\n`;
    });
    
    output += `\n`;
  }
  
  return output;
}

