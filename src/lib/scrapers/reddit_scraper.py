"""
Reddit scraper using public JSON API (no authentication required)
"""

import requests
import json
import sys
import time
from datetime import datetime

def scrape_reddit_no_auth(bike1, bike2):
    """
    Scrape Reddit r/IndianBikes using public JSON API
    
    Args:
        bike1: First bike name
        bike2: Second bike name
    
    Returns:
        JSON string with posts and comments
    """
    
    results = {
        "bike1": {"name": bike1, "posts": []},
        "bike2": {"name": bike2, "posts": []},
        "metadata": {
            "scraped_at": datetime.now().isoformat(),
            "source": "reddit",
            "subreddit": "IndianBikes",
            "total_posts": 0,
            "total_comments": 0
        }
    }
    
    headers = {
        'User-Agent': 'VehicleResearchBot/1.0 (Educational Research)'
    }
    
    for bike_key, bike_name in [("bike1", bike1), ("bike2", bike2)]:
        # Reddit's public JSON search endpoint
        search_url = "https://www.reddit.com/r/IndianBikes/search.json"
        params = {
            'q': bike_name,
            'restrict_sr': 'on',  # Search only in r/IndianBikes
            'limit': 10,  # Reduced from 20 to 10 for speed
            'sort': 'relevance',
            'type': 'link'
        }
        
        try:
            # Search for posts
            print(f"Searching Reddit for: {bike_name}", file=sys.stderr)
            response = requests.get(search_url, headers=headers, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            posts_found = 0
            
            for post in data['data']['children']:
                post_data = post['data']
                
                post_obj = {
                    "id": post_data['id'],
                    "title": post_data['title'],
                    "author": post_data.get('author', '[deleted]'),
                    "score": post_data['score'],
                    "url": f"https://reddit.com{post_data['permalink']}",
                    "created_utc": post_data['created_utc'],
                    "num_comments": post_data['num_comments'],
                    "selftext": post_data.get('selftext', '')[:500],
                    "comments": []
                }
                
                # Get top comments (via JSON)
                comments_url = f"https://www.reddit.com{post_data['permalink']}.json"
                
                try:
                    # Rate limiting: wait 1 second between requests
                    time.sleep(1)
                    
                    print(f"Fetching comments for post: {post_obj['title'][:50]}...", file=sys.stderr)
                    comments_response = requests.get(comments_url, headers=headers, timeout=10)
                    comments_response.raise_for_status()
                    comments_data = comments_response.json()
                    
                    # Comments are in the second element of the response
                    if len(comments_data) > 1 and 'data' in comments_data[1]:
                        comment_listing = comments_data[1]['data']['children']
                        
                        for comment in comment_listing[:5]:  # Top 5 comments (faster)
                            if comment.get('kind') == 't1':  # Ensure it's a comment
                                c_data = comment['data']
                                
                                # Skip deleted/removed comments
                                if c_data.get('author') in ['[deleted]', 'AutoModerator']:
                                    continue
                                
                                comment_obj = {
                                    "id": c_data['id'],
                                    "author": c_data.get('author', '[deleted]'),
                                    "body": c_data.get('body', '')[:300],
                                    "score": c_data['score'],
                                    "created_utc": c_data['created_utc']
                                }
                                
                                post_obj["comments"].append(comment_obj)
                                results["metadata"]["total_comments"] += 1
                        
                        print(f"  → Found {len(post_obj['comments'])} comments", file=sys.stderr)
                        
                except Exception as e:
                    print(f"Warning: Could not fetch comments for post {post_obj['id']}: {e}", file=sys.stderr)
                    # Continue even if comments fail
                
                results[bike_key]["posts"].append(post_obj)
                results["metadata"]["total_posts"] += 1
                posts_found += 1
            
            print(f"✓ Found {posts_found} posts for {bike_name}", file=sys.stderr)
            
        except requests.exceptions.RequestException as e:
            print(f"Error scraping Reddit for {bike_name}: {e}", file=sys.stderr)
        except Exception as e:
            print(f"Unexpected error for {bike_name}: {e}", file=sys.stderr)
    
    return json.dumps(results, indent=2)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python reddit_scraper.py 'bike1' 'bike2'"}))
        sys.exit(1)
    
    bike1 = sys.argv[1]
    bike2 = sys.argv[2]
    
    try:
        result = scrape_reddit_no_auth(bike1, bike2)
        print(result)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

