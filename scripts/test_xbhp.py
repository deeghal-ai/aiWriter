"""
Test xBhp forum scraper
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'lib', 'scrapers'))

from xbhp_scraper import scrape_xbhp_forums
import json

print("Testing xBhp forum scraper...\n")

bike1 = "Royal Enfield Classic 350"
bike2 = "Honda CB350"

print(f"Searching for: {bike1} vs {bike2}\n")

try:
    result_json = scrape_xbhp_forums(bike1, bike2)
    result = json.loads(result_json)
    
    print("✓ xBhp scraping successful!\n")
    
    print(f"Bike 1 ({bike1}):")
    print(f"  - Found {len(result['bike1']['threads'])} threads")
    print(f"  - Total posts: {sum(len(t['posts']) for t in result['bike1']['threads'])}")
    
    if result['bike1']['threads']:
        print(f"  - Sample thread: {result['bike1']['threads'][0]['title'][:60]}...")
    
    print(f"\nBike 2 ({bike2}):")
    print(f"  - Found {len(result['bike2']['threads'])} threads")
    print(f"  - Total posts: {sum(len(t['posts']) for t in result['bike2']['threads'])}")
    
    if result['bike2']['threads']:
        print(f"  - Sample thread: {result['bike2']['threads'][0]['title'][:60]}...")
    
    print(f"\n✓ Total: {result['metadata']['total_threads']} threads, {result['metadata']['total_posts']} posts")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()

