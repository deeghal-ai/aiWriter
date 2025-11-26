"""
xBhp forum scraper - FALLBACK with mock data
Note: xBhp's search system and Google blocking make real scraping difficult
This returns mock data to demonstrate the flow. Real implementation would need xBhp API access.
"""

import json
import sys
from datetime import datetime

def scrape_xbhp_forums(bike1, bike2):
    """
    Returns mock xBhp data (fallback due to scraping limitations)
    
    Args:
        bike1: First bike name
        bike2: Second bike name
    
    Returns:
        JSON string with mock forum threads
    """
    
    print(f"Searching xBhp for: {bike1} (using fallback mock data)", file=sys.stderr)
    print(f"Searching xBhp for: {bike2} (using fallback mock data)", file=sys.stderr)
    
    # Mock data structure matching real scraper
    results = {
        "bike1": {
            "name": bike1,
            "threads": [
                {
                    "title": f"{bike1} - Ownership Review and Discussion",
                    "url": "https://www.xbhp.com/talkies/motorcycles/mock-thread-1.html",
                    "posts": [
                        {
                            "author": "xBhp Member 1",
                            "content": f"Picked up the {bike1} last month. Initial impressions are quite positive. Build quality seems solid and the engine feels refined.",
                            "timestamp": None
                        },
                        {
                            "author": "xBhp Member 2", 
                            "content": f"I've been riding the {bike1} for 6 months now. Highway stability is excellent and fuel efficiency is around 40-45 kmpl in city conditions.",
                            "timestamp": None
                        }
                    ]
                },
                {
                    "title": f"{bike1} vs Competition - Buyer's Guide",
                    "url": "https://www.xbhp.com/talkies/motorcycles/mock-thread-2.html",
                    "posts": [
                        {
                            "author": "xBhp Member 3",
                            "content": f"For anyone considering the {bike1}, key things to note: suspension tuning is on the softer side, brakes are good, service costs reasonable.",
                            "timestamp": None
                        }
                    ]
                }
            ]
        },
        "bike2": {
            "name": bike2,
            "threads": [
                {
                    "title": f"{bike2} - Long Term Ownership Thread",
                    "url": "https://www.xbhp.com/talkies/motorcycles/mock-thread-3.html",
                    "posts": [
                        {
                            "author": "xBhp Member 4",
                            "content": f"The {bike2} has been my daily commuter for over a year. Pros: reliable engine, good parts availability. Cons: vibrations at high RPM.",
                            "timestamp": None
                        },
                        {
                            "author": "xBhp Member 5",
                            "content": f"Just completed 10,000 km on my {bike2}. Service costs have been minimal. Ride quality is comfortable for city use.",
                            "timestamp": None
                        }
                    ]
                },
                {
                    "title": f"{bike2} Common Issues and Solutions",
                    "url": "https://www.xbhp.com/talkies/motorcycles/mock-thread-4.html",
                    "posts": [
                        {
                            "author": "xBhp Member 6",
                            "content": f"My {bike2} had some initial electrical issues but dealer fixed them under warranty. Otherwise a solid bike for the price point.",
                            "timestamp": None
                        }
                    ]
                }
            ]
        },
        "metadata": {
            "scraped_at": datetime.now().isoformat(),
            "source": "xbhp_mock",
            "note": "Mock data - xBhp scraping requires API access for production use",
            "total_threads": 4,
            "total_posts": 7
        }
    }
    
    print(f"✓ Generated mock data: 2 threads for {bike1}", file=sys.stderr)
    print(f"✓ Generated mock data: 2 threads for {bike2}", file=sys.stderr)
    
    return json.dumps(results, indent=2)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python xbhp_scraper_fallback.py 'bike1' 'bike2'"}))
        sys.exit(1)
    
    bike1 = sys.argv[1]
    bike2 = sys.argv[2]
    
    try:
        result = scrape_xbhp_forums(bike1, bike2)
        print(result)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

