"""
Debug xBhp scraper - see what HTML we're actually getting
"""

import requests
from bs4 import BeautifulSoup
import sys

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

bike_name = "Apache RTR 160"
print(f"Testing xBhp search for: {bike_name}\n")

# xBhp's search URL
search_url = "https://www.xbhp.com/talkies/search.php"

params = {
    'do': 'process',
    'query': bike_name,
    'titleonly': '0',
    'searchthreadid': ''
}

try:
    print(f"Requesting: {search_url}")
    print(f"Params: {params}\n")
    
    response = requests.get(search_url, headers=headers, params=params, timeout=15)
    print(f"Status Code: {response.status_code}")
    print(f"URL: {response.url}\n")
    
    response.raise_for_status()
    
    soup = BeautifulSoup(response.content, 'lxml')
    
    # Save HTML to file for inspection
    with open('/tmp/xbhp_response.html', 'w', encoding='utf-8') as f:
        f.write(soup.prettify())
    print("✓ Saved HTML to /tmp/xbhp_response.html\n")
    
    # Try different selectors
    print("=== Testing Different Selectors ===\n")
    
    # Selector 1: div.threadtitle
    threads_1 = soup.find_all('div', class_='threadtitle')
    print(f"1. div.threadtitle: Found {len(threads_1)} elements")
    
    # Selector 2: a with thread_title_
    threads_2 = soup.find_all('a', id=lambda x: x and 'thread_title_' in x)
    print(f"2. a[id*=thread_title_]: Found {len(threads_2)} elements")
    
    # Selector 3: All links
    all_links = soup.find_all('a')
    print(f"3. All <a> tags: Found {len(all_links)} elements")
    
    # Selector 4: Look for common vBulletin classes
    thread_list = soup.find_all('li', class_='threadbit')
    print(f"4. li.threadbit: Found {len(thread_list)} elements")
    
    # Selector 5: Search results list
    search_results = soup.find_all('li', class_='searchresult')
    print(f"5. li.searchresult: Found {len(search_results)} elements")
    
    # Show page title
    title = soup.find('title')
    if title:
        print(f"\n=== Page Title ===")
        print(f"{title.get_text()}")
    
    # Show any h3 headers (might contain thread titles)
    h3s = soup.find_all('h3', limit=5)
    if h3s:
        print(f"\n=== First 5 <h3> Elements ===")
        for i, h3 in enumerate(h3s, 1):
            print(f"{i}. {h3.get_text().strip()[:100]}")
    
    # Look for search results container
    print(f"\n=== Looking for search results container ===")
    
    search_div = soup.find('div', id='search_results')
    if search_div:
        print("✓ Found div#search_results")
    else:
        print("✗ No div#search_results")
    
    results_div = soup.find('ol', id='threads')
    if results_div:
        print("✓ Found ol#threads")
        threads_in_ol = results_div.find_all('li')
        print(f"  Contains {len(threads_in_ol)} <li> elements")
    else:
        print("✗ No ol#threads")
    
    # Check if we got a "no results" page
    no_results = soup.find(string=lambda x: x and ('no results' in x.lower() or 'no threads' in x.lower()))
    if no_results:
        print(f"\n⚠️  Found 'no results' message: {no_results.strip()}")
    
    print("\n" + "="*60)
    print("Inspect /tmp/xbhp_response.html to see the actual HTML structure")
    print("="*60)
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()

