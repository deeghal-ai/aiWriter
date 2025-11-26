"""
Test Reddit scraper (no auth)
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'lib', 'scrapers'))

from reddit_scraper import scrape_reddit_no_auth
import json

print("Testing Reddit scraper (no authentication)...\n")

bike1 = "Royal Enfield Classic 350"
bike2 = "Honda CB350"

print(f"Searching for: {bike1} vs {bike2}\n")

try:
    result_json = scrape_reddit_no_auth(bike1, bike2)
    result = json.loads(result_json)
    
    print("✓ Reddit scraping successful!\n")
    
    print(f"Bike 1 ({bike1}):")
    print(f"  - Found {len(result['bike1']['posts'])} posts")
    print(f"  - Total comments: {sum(len(p['comments']) for p in result['bike1']['posts'])}")
    
    if result['bike1']['posts']:
        print(f"  - Sample post: {result['bike1']['posts'][0]['title'][:60]}...")
    
    print(f"\nBike 2 ({bike2}):")
    print(f"  - Found {len(result['bike2']['posts'])} posts")
    print(f"  - Total comments: {sum(len(p['comments']) for p in result['bike2']['posts'])}")
    
    if result['bike2']['posts']:
        print(f"  - Sample post: {result['bike2']['posts'][0]['title'][:60]}...")
    
    print(f"\n✓ Total: {result['metadata']['total_posts']} posts, {result['metadata']['total_comments']} comments")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()

