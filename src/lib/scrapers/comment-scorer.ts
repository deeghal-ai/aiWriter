// Comment quality scoring and filtering

export interface ScoredComment {
  author: string;
  text: string;
  likeCount: number;
  qualityScore: number;  // 0-100
  contentType: 'experience' | 'question' | 'opinion' | 'spam' | 'other';
  relevantTopics: string[];
}

/**
 * Score and categorize a comment for quality
 */
export function scoreComment(comment: { author: string; text: string; likeCount: number }): ScoredComment {
  const text = comment.text.toLowerCase();
  let score = 0;
  const topics: string[] = [];
  let contentType: ScoredComment['contentType'] = 'other';
  
  // Length scoring (10-200 chars is sweet spot)
  const length = comment.text.length;
  if (length >= 50 && length <= 500) score += 20;
  else if (length >= 20 && length <= 1000) score += 10;
  else if (length < 20) score -= 10;
  else if (length > 1000) score += 5;  // Long but might be valuable
  
  // Like-based scoring (social proof)
  if (comment.likeCount >= 100) score += 30;
  else if (comment.likeCount >= 50) score += 25;
  else if (comment.likeCount >= 20) score += 20;
  else if (comment.likeCount >= 10) score += 15;
  else if (comment.likeCount >= 5) score += 10;
  else if (comment.likeCount >= 1) score += 5;
  
  // Content type detection
  if (text.includes('?') || text.startsWith('how') || text.startsWith('what') || text.startsWith('which')) {
    contentType = 'question';
    score -= 5;  // Questions are less valuable than experiences
  }
  
  // Experience indicators (high value)
  const experienceKeywords = [
    'i have', 'i own', 'my experience', 'after', 'months', 'years', 
    'kilometers', 'kms', 'rode', 'riding', 'daily', 'commute',
    'service', 'mileage', 'getting', 'faced', 'issue', 'problem'
  ];
  
  const hasExperience = experienceKeywords.filter(kw => text.includes(kw)).length;
  if (hasExperience >= 2) {
    contentType = 'experience';
    score += 25;
  } else if (hasExperience === 1) {
    contentType = 'experience';
    score += 15;
  }
  
  // Topic detection
  const topicKeywords: Record<string, string[]> = {
    'Engine': ['engine', 'power', 'torque', 'vibration', 'heating', 'refinement', 'smooth'],
    'Mileage': ['mileage', 'fuel', 'economy', 'kmpl', 'average', 'tank'],
    'Comfort': ['comfort', 'seat', 'riding position', 'pillion', 'back pain', 'ergonomic'],
    'Build': ['build', 'quality', 'finish', 'paint', 'rust', 'plastic'],
    'Service': ['service', 'maintenance', 'dealer', 'spare', 'cost', 'warranty'],
    'Performance': ['speed', 'acceleration', 'braking', 'handling', 'highway', 'city'],
    'Problems': ['problem', 'issue', 'defect', 'complaint', 'bad', 'worst'],
    'Value': ['price', 'value', 'worth', 'money', 'expensive', 'affordable']
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      topics.push(topic);
      score += 5;
    }
  }
  
  // Spam detection (negative scoring)
  const spamIndicators = [
    'subscribe', 'channel', 'check out my', 'please like', 
    'first comment', 'love from', '❤️❤️❤️', '🔥🔥🔥',
    'bhai', 'sir please', 'reply', 'pin this'
  ];
  
  const spamCount = spamIndicators.filter(s => text.includes(s)).length;
  if (spamCount >= 2) {
    contentType = 'spam';
    score -= 30;
  }
  
  // Specific number mentions (adds credibility)
  const hasNumbers = /\d{2,5}\s*(km|kms|kilometers|kmpl|months|years|lakhs|thousand)/i.test(text);
  if (hasNumbers) score += 10;
  
  // Normalize score to 0-100
  score = Math.max(0, Math.min(100, score + 30));  // Base of 30
  
  return {
    ...comment,
    qualityScore: score,
    contentType,
    relevantTopics: topics
  };
}

/**
 * Filter and rank comments by quality
 */
export function filterAndRankComments(
  comments: Array<{ author: string; text: string; likeCount: number }>,
  options: {
    minScore?: number;
    maxComments?: number;
    preferExperiences?: boolean;
    excludeSpam?: boolean;
  } = {}
): ScoredComment[] {
  const {
    minScore = 30,
    maxComments = 20,
    preferExperiences = true,
    excludeSpam = true
  } = options;
  
  // Score all comments
  let scored = comments.map(scoreComment);
  
  // Filter spam
  if (excludeSpam) {
    scored = scored.filter(c => c.contentType !== 'spam');
  }
  
  // Filter by minimum score
  scored = scored.filter(c => c.qualityScore >= minScore);
  
  // Sort by quality score, with preference for experiences
  scored.sort((a, b) => {
    let scoreA = a.qualityScore;
    let scoreB = b.qualityScore;
    
    if (preferExperiences) {
      if (a.contentType === 'experience') scoreA += 20;
      if (b.contentType === 'experience') scoreB += 20;
    }
    
    return scoreB - scoreA;
  });
  
  // Deduplicate similar comments
  const deduped = deduplicateComments(scored);
  
  return deduped.slice(0, maxComments);
}

/**
 * Remove comments that are too similar
 */
function deduplicateComments(comments: ScoredComment[]): ScoredComment[] {
  const unique: ScoredComment[] = [];
  
  for (const comment of comments) {
    const isDuplicate = unique.some(existing => {
      // Check for high text similarity
      const similarity = calculateJaccardSimilarity(
        existing.text.toLowerCase(),
        comment.text.toLowerCase()
      );
      return similarity > 0.6;
    });
    
    if (!isDuplicate) {
      unique.push(comment);
    }
  }
  
  return unique;
}

/**
 * Jaccard similarity for text comparison
 */
function calculateJaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

