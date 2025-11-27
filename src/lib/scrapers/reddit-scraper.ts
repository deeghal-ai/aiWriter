// Node.js Reddit scraper - works on Vercel!
// Replacement for Python scraper using Reddit's public JSON API

interface RedditPost {
  title: string;
  url: string;
  selftext: string;
  author: string;
  created_utc: number;
  num_comments: number;
  score: number;
  permalink: string;
  comments: RedditComment[];
}

interface RedditComment {
  author: string;
  body: string;
  score: number;
  created_utc: number;
}

interface BikeData {
  name: string;
  posts: RedditPost[];
}

interface RedditScrapingResult {
  bike1: BikeData;
  bike2: BikeData;
  metadata: {
    scraped_at: string;
    source: string;
    subreddit: string;
    total_posts: number;
    total_comments: number;
  };
}

/**
 * Scrapes Reddit for a single bike with retry logic
 */
async function scrapeRedditForBike(bikeName: string, retries = 3): Promise<RedditPost[]> {
  const subreddit = 'IndianBikes';
  const limit = 10; // Number of posts to fetch per bike
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Step 1: Search for posts
      const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json`;
      const searchParams = new URLSearchParams({
        q: bikeName,
        restrict_sr: 'on',
        limit: limit.toString(),
        sort: 'relevance',
        t: 'all'
      });

      console.log(`[Reddit] Searching for: ${bikeName} (attempt ${attempt}/${retries})`);
      
      const searchResponse = await fetch(`${searchUrl}?${searchParams}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BikeDekho/1.0; +https://bikedekho.com)',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error(`[Reddit] API error ${searchResponse.status}: ${errorText.slice(0, 200)}`);
        
        // Handle 403 Forbidden (Reddit blocking Vercel IPs)
        if (searchResponse.status === 403) {
          console.warn(`[Reddit] Access forbidden (403) - Reddit is blocking cloud server IPs`);
          // Don't retry on 403, return empty results instead
          return [];
        }
        
        // Retry on rate limit or server errors
        if (searchResponse.status === 429 || searchResponse.status >= 500) {
          if (attempt < retries) {
            const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.log(`[Reddit] Retrying in ${waitTime}ms...`);
            await delay(waitTime);
            continue;
          }
        }
        
        throw new Error(`Reddit API error: ${searchResponse.status} ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();
      const posts = searchData.data?.children || [];

      console.log(`[Reddit] Found ${posts.length} posts for ${bikeName}`);

      // Step 2: Fetch comments for each post
      const postsWithComments: RedditPost[] = [];
      
      for (const post of posts) {
        const postData = post.data;
        
        // Fetch top 5 comments for this post
        const comments = await fetchPostComments(postData.permalink, 5);
        
        postsWithComments.push({
          title: postData.title,
          url: postData.url,
          selftext: postData.selftext || '',
          author: postData.author,
          created_utc: postData.created_utc,
          num_comments: postData.num_comments,
          score: postData.score,
          permalink: postData.permalink,
          comments: comments
        });

        // Small delay to be respectful to Reddit's servers
        await delay(200);
      }

      return postsWithComments;

    } catch (error) {
      console.error(`[Reddit] Error scraping for ${bikeName} (attempt ${attempt}):`, error);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retrying
      await delay(2000);
    }
  }
  
  // Should never reach here, but TypeScript needs this
  throw new Error(`Failed to scrape Reddit after ${retries} attempts`);
}

/**
 * Fetches top comments for a specific post with retry logic
 */
async function fetchPostComments(permalink: string, limit: number = 5): Promise<RedditComment[]> {
  try {
    const commentsUrl = `https://www.reddit.com${permalink}.json`;
    
    const response = await fetch(commentsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BikeDekho/1.0; +https://bikedekho.com)',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (!response.ok) {
      console.warn(`[Reddit] Failed to fetch comments for ${permalink}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Reddit returns [post_data, comments_data]
    const commentsData = data[1]?.data?.children || [];
    
    const comments: RedditComment[] = [];
    
    for (const comment of commentsData.slice(0, limit)) {
      const commentData = comment.data;
      
      // Skip deleted/removed comments and "more comments" markers
      if (commentData.body && 
          commentData.body !== '[deleted]' && 
          commentData.body !== '[removed]' &&
          commentData.kind !== 'more') {
        comments.push({
          author: commentData.author || 'unknown',
          body: commentData.body,
          score: commentData.score || 0,
          created_utc: commentData.created_utc || 0
        });
      }
    }

    return comments;

  } catch (error) {
    console.warn(`[Reddit] Error fetching comments for ${permalink}:`, error);
    return [];
  }
}

/**
 * Main function: Scrapes Reddit for two bikes
 * Returns data in same format as Python scraper for compatibility
 */
export async function scrapeRedditForComparison(
  bike1: string, 
  bike2: string
): Promise<RedditScrapingResult> {
  console.log(`[Reddit] Starting scraping for ${bike1} vs ${bike2}`);
  
  // Scrape both bikes in parallel for speed
  const [bike1Posts, bike2Posts] = await Promise.all([
    scrapeRedditForBike(bike1),
    scrapeRedditForBike(bike2)
  ]);

  // Calculate totals
  const totalPosts = bike1Posts.length + bike2Posts.length;
  const totalComments = 
    bike1Posts.reduce((sum, post) => sum + post.comments.length, 0) +
    bike2Posts.reduce((sum, post) => sum + post.comments.length, 0);

  // Check if we got blocked (both bikes returned empty)
  const wasBlocked = totalPosts === 0;
  
  if (wasBlocked) {
    console.warn(`[Reddit] No data retrieved - likely blocked by Reddit. Consider using Reddit API credentials.`);
  } else {
    console.log(`[Reddit] Scraping complete: ${totalPosts} posts, ${totalComments} comments`);
  }

  // Return in same format as Python scraper
  return {
    bike1: {
      name: bike1,
      posts: bike1Posts
    },
    bike2: {
      name: bike2,
      posts: bike2Posts
    },
    metadata: {
      scraped_at: new Date().toISOString(),
      source: wasBlocked ? 'reddit_blocked' : 'reddit',
      subreddit: 'IndianBikes',
      total_posts: totalPosts,
      total_comments: totalComments
    }
  };
}

/**
 * Helper function to add delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

