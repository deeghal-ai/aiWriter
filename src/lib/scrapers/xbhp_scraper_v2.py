"""
xBhp forum scraper using Google search (more reliable than xBhp's own search)
"""

import requests
from bs4 import BeautifulSoup
import json
import sys
import time
import re
from datetime import datetime

def clean_text(text):
    """Clean and normalize text"""
    if not text:
        return ""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def scrape_xbhp_forums(bike1, bike2):
    """
    Scrape xBhp forums for bike discussions using Google search
    
    Args:
        bike1: First bike name
        bike2: Second bike name
    
    Returns:
        JSON string with forum threads and posts
    """
    
    results = {
        "bike1": {"name": bike1, "threads": []},
        "bike2": {"name": bike2, "threads": []},
        "metadata": {
            "scraped_at": datetime.now().isoformat(),
            "source": "xbhp",
            "total_threads": 0,
            "total_posts": 0
        }
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    for bike_key, bike_name in [("bike1", bike1), ("bike2", bike2)]:
        try:
            print(f"Searching xBhp for: {bike_name} (via Google)", file=sys.stderr)
            
            # Use Google to search xBhp site
            google_search_url = "https://www.google.com/search"
            params = {
                'q': f'site:xbhp.com/talkies {bike_name}',
                'num': 10  # Number of results
            }
            
            response = requests.get(google_search_url, headers=headers, params=params, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Find Google search result links
            search_results = soup.find_all('div', class_='g')
            
            threads_found = 0
            
            for result in search_results[:5]:  # Process top 5 results
                try:
                    # Extract link from Google result
                    link_elem = result.find('a')
                    if not link_elem:
                        continue
                    
                    thread_url = link_elem.get('href', '')
                    if not thread_url or 'xbhp.com/talkies' not in thread_url:
                        continue
                    
                    # Extract title
                    title_elem = result.find('h3')
                    if not title_elem:
                        continue
                    
                    thread_title = clean_text(title_elem.get_text())
                    
                    if not thread_title:
                        continue
                    
                    thread_obj = {
                        "title": thread_title,
                        "url": thread_url,
                        "posts": []
                    }
                    
                    # Fetch thread content
                    print(f"Fetching thread: {thread_title[:50]}...", file=sys.stderr)
                    time.sleep(2)  # Rate limiting
                    
                    try:
                        thread_response = requests.get(thread_url, headers=headers, timeout=15)
                        thread_response.raise_for_status()
                        thread_soup = BeautifulSoup(thread_response.content, 'lxml')
                        
                        # Extract posts - try multiple selectors
                        post_elements = thread_soup.find_all('div', class_='postbody')
                        
                        if not post_elements:
                            post_elements = thread_soup.find_all('div', class_='js-post__content-text')
                        
                        if not post_elements:
                            post_elements = thread_soup.find_all('blockquote', class_='postcontent')
                        
                        for post_elem in post_elements[:3]:  # First 3 posts per thread
                            post_text = clean_text(post_elem.get_text())
                            
                            if not post_text or len(post_text) < 20:
                                continue
                            
                            post_obj = {
                                "author": "xBhp User",
                                "content": post_text[:500],  # First 500 chars
                                "timestamp": None
                            }
                            
                            thread_obj["posts"].append(post_obj)
                            results["metadata"]["total_posts"] += 1
                        
                        print(f"  → Found {len(thread_obj['posts'])} posts", file=sys.stderr)
                    
                    except Exception as e:
                        print(f"  → Could not fetch thread content: {e}", file=sys.stderr)
                        # Still add the thread even if we can't fetch posts
                    
                    results[bike_key]["threads"].append(thread_obj)
                    results["metadata"]["total_threads"] += 1
                    threads_found += 1
                    
                except Exception as e:
                    print(f"Error processing result: {e}", file=sys.stderr)
                    continue
            
            print(f"✓ Found {threads_found} threads for {bike_name}", file=sys.stderr)
            
        except requests.exceptions.RequestException as e:
            print(f"Error scraping xBhp for {bike_name}: {e}", file=sys.stderr)
        except Exception as e:
            print(f"Unexpected error for {bike_name}: {e}", file=sys.stderr)
    
    return json.dumps(results, indent=2)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python xbhp_scraper_v2.py 'bike1' 'bike2'"}))
        sys.exit(1)
    
    bike1 = sys.argv[1]
    bike2 = sys.argv[2]
    
    try:
        result = scrape_xbhp_forums(bike1, bike2)
        print(result)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

