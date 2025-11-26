"""
xBhp forum scraper using BeautifulSoup
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
    Scrape xBhp forums for bike discussions
    
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
    
    # xBhp's search URL
    base_search_url = "https://www.xbhp.com/talkies/search.php"
    
    for bike_key, bike_name in [("bike1", bike1), ("bike2", bike2)]:
        try:
            print(f"Searching xBhp for: {bike_name}", file=sys.stderr)
            
            # Search for threads
            params = {
                'do': 'process',
                'query': bike_name,
                'titleonly': '0',
                'searchthreadid': ''
            }
            
            response = requests.get(base_search_url, headers=headers, params=params, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Find thread listings
            # xBhp uses standard vBulletin structure
            thread_elements = soup.find_all('div', class_='threadtitle')
            
            if not thread_elements:
                # Fallback: try different selectors
                thread_elements = soup.find_all('a', id=re.compile(r'thread_title_\d+'))
            
            threads_found = 0
            
            for thread_elem in thread_elements[:10]:  # Limit to 10 threads
                try:
                    # Extract thread info
                    if thread_elem.name == 'div':
                        link = thread_elem.find('a')
                    else:
                        link = thread_elem
                    
                    if not link:
                        continue
                    
                    thread_url = link.get('href', '')
                    if not thread_url.startswith('http'):
                        thread_url = f"https://www.xbhp.com/talkies/{thread_url}"
                    
                    thread_title = clean_text(link.get_text())
                    
                    if not thread_title or not thread_url:
                        continue
                    
                    thread_obj = {
                        "title": thread_title,
                        "url": thread_url,
                        "posts": []
                    }
                    
                    # Fetch thread content (first page only for MVP)
                    print(f"Fetching thread: {thread_title[:50]}...", file=sys.stderr)
                    time.sleep(2)  # Rate limiting
                    
                    thread_response = requests.get(thread_url, headers=headers, timeout=15)
                    thread_response.raise_for_status()
                    thread_soup = BeautifulSoup(thread_response.content, 'lxml')
                    
                    # Extract posts from thread
                    post_elements = thread_soup.find_all('div', class_='postbody')
                    
                    if not post_elements:
                        # Fallback selector
                        post_elements = thread_soup.find_all('div', id=re.compile(r'post_message_\d+'))
                    
                    for post_elem in post_elements[:5]:  # First 5 posts per thread
                        post_text = clean_text(post_elem.get_text())
                        
                        if not post_text or len(post_text) < 20:
                            continue
                        
                        # Get author (from nearby element)
                        author_elem = post_elem.find_previous('div', class_='username_container')
                        author = 'Unknown'
                        if author_elem:
                            author_link = author_elem.find('a', class_='username')
                            if author_link:
                                author = clean_text(author_link.get_text())
                        
                        post_obj = {
                            "author": author,
                            "content": post_text[:500],  # First 500 chars
                            "timestamp": None  # xBhp timestamps need more parsing
                        }
                        
                        thread_obj["posts"].append(post_obj)
                        results["metadata"]["total_posts"] += 1
                    
                    print(f"  → Found {len(thread_obj['posts'])} posts", file=sys.stderr)
                    
                    results[bike_key]["threads"].append(thread_obj)
                    results["metadata"]["total_threads"] += 1
                    threads_found += 1
                    
                except Exception as e:
                    print(f"Error processing thread: {e}", file=sys.stderr)
                    continue
            
            print(f"✓ Found {threads_found} threads for {bike_name}", file=sys.stderr)
            
        except requests.exceptions.RequestException as e:
            print(f"Error scraping xBhp for {bike_name}: {e}", file=sys.stderr)
        except Exception as e:
            print(f"Unexpected error for {bike_name}: {e}", file=sys.stderr)
    
    return json.dumps(results, indent=2)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python xbhp_scraper.py 'bike1' 'bike2'"}))
        sys.exit(1)
    
    bike1 = sys.argv[1]
    bike2 = sys.argv[2]
    
    try:
        result = scrape_xbhp_forums(bike1, bike2)
        print(result)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

