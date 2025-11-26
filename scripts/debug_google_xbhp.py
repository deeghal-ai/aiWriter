"""
Debug Google search for xBhp - see what we're actually getting
"""

import requests
from bs4 import BeautifulSoup

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

bike_name = "Apache RTR 160"
print(f"Testing Google search for xBhp: {bike_name}\n")

# Use Google to search xBhp site
google_search_url = "https://www.google.com/search"
params = {
    'q': f'site:xbhp.com/talkies {bike_name}',
    'num': 10
}

try:
    print(f"Requesting: {google_search_url}")
    print(f"Query: site:xbhp.com/talkies {bike_name}\n")
    
    response = requests.get(google_search_url, headers=headers, params=params, timeout=15)
    print(f"Status Code: {response.status_code}")
    print(f"URL: {response.url}\n")
    
    soup = BeautifulSoup(response.content, 'lxml')
    
    # Save HTML to file
    with open('/tmp/google_response.html', 'w', encoding='utf-8') as f:
        f.write(soup.prettify())
    print("✓ Saved HTML to /tmp/google_response.html\n")
    
    # Check for CAPTCHA
    captcha = soup.find(string=lambda x: x and 'captcha' in x.lower())
    if captcha:
        print("⚠️  Google is showing CAPTCHA - automated requests blocked\n")
    
    # Try different selectors for Google results
    print("=== Testing Different Selectors ===\n")
    
    # Selector 1: div.g (standard Google result)
    results_1 = soup.find_all('div', class_='g')
    print(f"1. div.g: Found {len(results_1)} elements")
    
    # Selector 2: All divs with 'tF2Cxc' class
    results_2 = soup.find_all('div', class_='tF2Cxc')
    print(f"2. div.tF2Cxc: Found {len(results_2)} elements")
    
    # Selector 3: All h3 tags (result titles)
    h3s = soup.find_all('h3')
    print(f"3. h3: Found {len(h3s)} elements")
    if h3s:
        print(f"   First h3: {h3s[0].get_text()[:80]}")
    
    # Selector 4: All links
    links = soup.find_all('a')
    print(f"4. All <a>: Found {len(links)} elements")
    
    # Look for xbhp.com links specifically
    xbhp_links = [a for a in links if a.get('href') and 'xbhp.com' in a.get('href', '')]
    print(f"5. Links with xbhp.com: Found {len(xbhp_links)} elements")
    
    if xbhp_links:
        print("\n=== xBhp Links Found ===")
        for i, link in enumerate(xbhp_links[:5], 1):
            href = link.get('href', '')
            text = link.get_text().strip()[:80]
            print(f"{i}. {text}")
            print(f"   URL: {href[:100]}")
    
    # Check page title
    title = soup.find('title')
    if title:
        print(f"\n=== Page Title ===")
        print(f"{title.get_text()}")
    
    print("\n" + "="*60)
    print("Inspect /tmp/google_response.html to see full HTML")
    print("="*60)
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()

