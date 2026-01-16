/**
 * Single Vehicle Reddit Scraping API Route
 * 
 * Scrapes Reddit data for a single vehicle (bike or car).
 * Reuses existing scraping infrastructure from the comparison flow.
 */

import { NextRequest, NextResponse } from 'next/server';

// We need to export the single-vehicle function from reddit-scraper
// For now, we'll inline the scraping logic that mirrors scrapeRedditForBike

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

interface SingleVehicleRedditRequest {
  vehicle: string;
}

interface SingleVehicleRedditResult {
  vehicle: string;
  posts: RedditPost[];
  metadata: {
    scraped_at: string;
    source: string;
    subreddit: string;
    total_posts: number;
    total_comments: number;
  };
}

export const maxDuration = 60; // 60 seconds for scraping

/**
 * Helper function to add delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetches top comments for a specific post
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
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.warn(`[Single Reddit] Failed to fetch comments for ${permalink}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const commentsData = data[1]?.data?.children || [];
    
    const comments: RedditComment[] = [];
    
    for (const comment of commentsData.slice(0, limit)) {
      const commentData = comment.data;
      
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
    console.warn(`[Single Reddit] Error fetching comments for ${permalink}:`, error);
    return [];
  }
}

/**
 * Scrapes Reddit for a single vehicle
 */
async function scrapeRedditForSingleVehicle(vehicleName: string, retries = 3): Promise<RedditPost[]> {
  const subreddit = 'IndianBikes';
  const limit = 15; // Number of posts to fetch
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json`;
      const searchParams = new URLSearchParams({
        q: vehicleName,
        restrict_sr: 'on',
        limit: limit.toString(),
        sort: 'relevance',
        t: 'all'
      });

      console.log(`[Single Reddit] Searching for: ${vehicleName} (attempt ${attempt}/${retries})`);
      
      const searchResponse = await fetch(`${searchUrl}?${searchParams}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BikeDekho/1.0; +https://bikedekho.com)',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(30000)
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error(`[Single Reddit] API error ${searchResponse.status}: ${errorText.slice(0, 200)}`);
        
        if (searchResponse.status === 403) {
          console.warn(`[Single Reddit] Access forbidden (403) - Reddit is blocking cloud server IPs`);
          return [];
        }
        
        if (searchResponse.status === 429 || searchResponse.status >= 500) {
          if (attempt < retries) {
            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`[Single Reddit] Retrying in ${waitTime}ms...`);
            await delay(waitTime);
            continue;
          }
        }
        
        throw new Error(`Reddit API error: ${searchResponse.status} ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();
      const posts = searchData.data?.children || [];

      console.log(`[Single Reddit] Found ${posts.length} posts for ${vehicleName}`);

      const postsWithComments: RedditPost[] = [];
      
      for (const post of posts) {
        const postData = post.data;
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

        await delay(200);
      }

      return postsWithComments;

    } catch (error) {
      console.error(`[Single Reddit] Error scraping for ${vehicleName} (attempt ${attempt}):`, error);
      
      if (attempt === retries) {
        throw error;
      }
      
      await delay(2000);
    }
  }
  
  throw new Error(`Failed to scrape Reddit after ${retries} attempts`);
}

export async function POST(request: NextRequest) {
  try {
    const body: SingleVehicleRedditRequest = await request.json();
    const { vehicle } = body;
    
    if (!vehicle || !vehicle.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vehicle name is required' },
        { status: 400 }
      );
    }
    
    console.log(`[Single Reddit] Starting scrape for: ${vehicle}`);
    
    const posts = await scrapeRedditForSingleVehicle(vehicle.trim());
    
    const totalComments = posts.reduce((sum, post) => sum + post.comments.length, 0);
    const wasBlocked = posts.length === 0;
    
    if (wasBlocked) {
      console.warn(`[Single Reddit] No data retrieved - likely blocked by Reddit.`);
    } else {
      console.log(`[Single Reddit] Scraping complete: ${posts.length} posts, ${totalComments} comments`);
    }
    
    const result: SingleVehicleRedditResult = {
      vehicle: vehicle.trim(),
      posts: posts,
      metadata: {
        scraped_at: new Date().toISOString(),
        source: wasBlocked ? 'reddit_blocked' : 'reddit',
        subreddit: 'IndianBikes',
        total_posts: posts.length,
        total_comments: totalComments
      }
    };
    
    return NextResponse.json({
      success: true,
      data: result,
      source: 'reddit',
      timestamp: new Date().toISOString(),
      warning: wasBlocked ? 'Reddit blocked cloud server access. No data retrieved.' : undefined
    });
    
  } catch (error: any) {
    console.error('[Single Reddit] Scraping error:', error);
    
    let errorMessage = 'Failed to scrape Reddit';
    let errorDetails = error.message;
    
    if (error.message?.includes('429')) {
      errorMessage = 'Reddit rate limit exceeded';
      errorDetails = 'Please try again in a few moments';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Reddit request timed out';
      errorDetails = 'The request took too long. Please try again';
    } else if (error.message?.includes('network')) {
      errorMessage = 'Network error accessing Reddit';
      errorDetails = 'Please check your connection and try again';
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: errorDetails,
        technicalDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'single-vehicle-reddit',
    subreddit: 'IndianBikes',
    message: 'Reddit scraper ready for single vehicle research'
  });
}
