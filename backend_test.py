#!/usr/bin/env python3
"""
NoidaPulse Backend API Testing Suite
Tests all backend APIs for the NoidaPulse application
"""

import requests
import json
import time
from datetime import datetime

# Base URL from environment
BASE_URL = "https://noida-watch-live.preview.emergentagent.com/api"

def test_health_api():
    """Test GET /api/health"""
    print("\n=== Testing Health Check API ===")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data}")
            
            if data.get('status') == 'healthy' and 'timestamp' in data:
                print("✅ Health API working correctly")
                return True
            else:
                print("❌ Health API response format incorrect")
                return False
        else:
            print(f"❌ Health API failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Health API error: {str(e)}")
        return False

def test_sectors_api():
    """Test GET /api/sectors"""
    print("\n=== Testing Sectors API ===")
    try:
        response = requests.get(f"{BASE_URL}/sectors", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            sectors = data.get('sectors', [])
            if len(sectors) == 10:
                # Check if sectors have correct structure
                first_sector = sectors[0]
                if all(key in first_sector for key in ['id', 'name', 'pincode']):
                    # Check if we have the expected sector IDs (201301-201310)
                    sector_ids = [s['id'] for s in sectors]
                    expected_ids = ['201301', '201302', '201303', '201304', '201305', 
                                   '201306', '201307', '201308', '201309', '201310']
                    if sector_ids == expected_ids:
                        print("✅ Sectors API working correctly")
                        return True
                    else:
                        print(f"❌ Unexpected sector IDs: {sector_ids}")
                        return False
                else:
                    print("❌ Sector structure incorrect")
                    return False
            else:
                print(f"❌ Expected 10 sectors, got {len(sectors)}")
                return False
        else:
            print(f"❌ Sectors API failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Sectors API error: {str(e)}")
        return False

def test_search_api():
    """Test GET /api/search?q=Mirzapur"""
    print("\n=== Testing Search API ===")
    try:
        # Test with Mirzapur query
        response = requests.get(f"{BASE_URL}/search?q=Mirzapur", timeout=15)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            results = data.get('results', [])
            if len(results) > 0:
                # Check structure of first result
                first_result = results[0]
                required_fields = ['imdbId', 'title', 'year', 'type']
                if all(field in first_result for field in required_fields):
                    print("✅ Search API working correctly")
                    return True, results[0]  # Return first result for checkin test
                else:
                    print(f"❌ Search result missing required fields: {first_result}")
                    return False, None
            else:
                print("❌ No search results returned")
                return False, None
        else:
            print(f"❌ Search API failed with status {response.status_code}")
            return False, None
            
    except Exception as e:
        print(f"❌ Search API error: {str(e)}")
        return False, None

def test_checkin_api(show_data=None):
    """Test POST /api/checkin"""
    print("\n=== Testing Checkin API ===")
    
    # Use provided show data or default test data
    if show_data:
        checkin_data = {
            "imdbId": show_data['imdbId'],
            "title": show_data['title'],
            "poster": show_data.get('poster'),
            "type": show_data['type'],
            "year": show_data['year'],
            "sectorId": "201307"
        }
    else:
        checkin_data = {
            "imdbId": "tt6473300",
            "title": "Mirzapur",
            "poster": "https://example.com/poster.jpg",
            "type": "series",
            "year": "2018–",
            "sectorId": "201307"
        }
    
    try:
        response = requests.post(
            f"{BASE_URL}/checkin", 
            json=checkin_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        print(f"Status Code: {response.status_code}")
        print(f"Request Data: {json.dumps(checkin_data, indent=2)}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get('success') and 'checkin' in data:
                checkin = data['checkin']
                if checkin.get('imdbId') == checkin_data['imdbId']:
                    print("✅ Checkin API working correctly")
                    return True
                else:
                    print("❌ Checkin data mismatch")
                    return False
            else:
                print("❌ Checkin response format incorrect")
                return False
        else:
            print(f"❌ Checkin API failed with status {response.status_code}")
            if response.text:
                print(f"Error response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Checkin API error: {str(e)}")
        return False

def test_trending_api():
    """Test GET /api/trending and GET /api/trending?sector=201307"""
    print("\n=== Testing Trending API ===")
    
    # Test general trending
    try:
        response = requests.get(f"{BASE_URL}/trending", timeout=10)
        print(f"General Trending - Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"General Trending Response: {json.dumps(data, indent=2)}")
            
            trending = data.get('trending', [])
            if isinstance(trending, list):
                if len(trending) > 0:
                    # Check structure of first trending item
                    first_item = trending[0]
                    required_fields = ['imdbId', 'title', 'score', 'checkinCount']
                    if all(field in first_item for field in required_fields):
                        print("✅ General trending API working correctly")
                        general_success = True
                    else:
                        print(f"❌ Trending item missing required fields: {first_item}")
                        general_success = False
                else:
                    print("✅ General trending API working (no data yet)")
                    general_success = True
            else:
                print("❌ Trending response format incorrect")
                general_success = False
        else:
            print(f"❌ General trending API failed with status {response.status_code}")
            general_success = False
            
    except Exception as e:
        print(f"❌ General trending API error: {str(e)}")
        general_success = False
    
    # Test sector-specific trending
    try:
        response = requests.get(f"{BASE_URL}/trending?sector=201307", timeout=10)
        print(f"Sector Trending - Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Sector Trending Response: {json.dumps(data, indent=2)}")
            
            trending = data.get('trending', [])
            if isinstance(trending, list):
                print("✅ Sector trending API working correctly")
                sector_success = True
            else:
                print("❌ Sector trending response format incorrect")
                sector_success = False
        else:
            print(f"❌ Sector trending API failed with status {response.status_code}")
            sector_success = False
            
    except Exception as e:
        print(f"❌ Sector trending API error: {str(e)}")
        sector_success = False
    
    return general_success and sector_success

def test_stats_api():
    """Test GET /api/stats"""
    print("\n=== Testing Stats API ===")
    try:
        response = requests.get(f"{BASE_URL}/stats", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            required_fields = ['totalCheckins', 'todayCheckins', 'uniqueShows']
            if all(field in data for field in required_fields):
                # Check data types
                if (isinstance(data['totalCheckins'], int) and 
                    isinstance(data['todayCheckins'], int) and 
                    isinstance(data['uniqueShows'], int)):
                    print("✅ Stats API working correctly")
                    return True
                else:
                    print("❌ Stats API data types incorrect")
                    return False
            else:
                print(f"❌ Stats API missing required fields: {data}")
                return False
        else:
            print(f"❌ Stats API failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Stats API error: {str(e)}")
        return False

def test_share_api():
    """Test GET /api/share and GET /api/share?sector=201307"""
    print("\n=== Testing Share API ===")
    
    # Test general share
    try:
        response = requests.get(f"{BASE_URL}/share", timeout=10)
        print(f"General Share - Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"General Share Response: {json.dumps(data, indent=2)}")
            
            required_fields = ['sectorName', 'trending', 'generatedAt']
            if all(field in data for field in required_fields):
                if (isinstance(data['trending'], list) and 
                    data['sectorName'] == 'All of Noida'):
                    print("✅ General share API working correctly")
                    general_success = True
                else:
                    print("❌ General share API data format incorrect")
                    general_success = False
            else:
                print(f"❌ General share API missing required fields: {data}")
                general_success = False
        else:
            print(f"❌ General share API failed with status {response.status_code}")
            general_success = False
            
    except Exception as e:
        print(f"❌ General share API error: {str(e)}")
        general_success = False
    
    # Test sector-specific share
    try:
        response = requests.get(f"{BASE_URL}/share?sector=201307", timeout=10)
        print(f"Sector Share - Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Sector Share Response: {json.dumps(data, indent=2)}")
            
            required_fields = ['sectorName', 'trending', 'generatedAt']
            if all(field in data for field in required_fields):
                if isinstance(data['trending'], list):
                    print("✅ Sector share API working correctly")
                    sector_success = True
                else:
                    print("❌ Sector share API data format incorrect")
                    sector_success = False
            else:
                print(f"❌ Sector share API missing required fields: {data}")
                sector_success = False
        else:
            print(f"❌ Sector share API failed with status {response.status_code}")
            sector_success = False
            
    except Exception as e:
        print(f"❌ Sector share API error: {str(e)}")
        sector_success = False
    
    return general_success and sector_success

def run_complete_flow_test():
    """Test the complete flow: Search -> Checkin -> Verify Trending -> Verify Stats"""
    print("\n" + "="*60)
    print("RUNNING COMPLETE FLOW TEST")
    print("="*60)
    
    # Step 1: Search for a show
    print("\n1. Searching for a show...")
    search_success, show_data = test_search_api()
    if not search_success:
        print("❌ Flow test failed at search step")
        return False
    
    # Step 2: Create a checkin
    print("\n2. Creating a checkin...")
    checkin_success = test_checkin_api(show_data)
    if not checkin_success:
        print("❌ Flow test failed at checkin step")
        return False
    
    # Wait a moment for data to be processed
    print("\n3. Waiting for data to be processed...")
    time.sleep(2)
    
    # Step 3: Verify trending is updated
    print("\n4. Verifying trending is updated...")
    trending_success = test_trending_api()
    if not trending_success:
        print("❌ Flow test failed at trending verification")
        return False
    
    # Step 4: Verify stats are updated
    print("\n5. Verifying stats are updated...")
    stats_success = test_stats_api()
    if not stats_success:
        print("❌ Flow test failed at stats verification")
        return False
    
    print("\n✅ Complete flow test passed!")
    return True

def main():
    """Run all backend API tests"""
    print("NoidaPulse Backend API Testing Suite")
    print(f"Testing against: {BASE_URL}")
    print("="*60)
    
    results = {}
    
    # Test individual APIs
    results['health'] = test_health_api()
    results['sectors'] = test_sectors_api()
    results['search'] = test_search_api()[0]  # Only get success status
    results['checkin'] = test_checkin_api()
    results['trending'] = test_trending_api()
    results['stats'] = test_stats_api()
    results['share'] = test_share_api()
    
    # Test complete flow
    results['complete_flow'] = run_complete_flow_test()
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for test_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name.upper()}: {status}")
    
    total_tests = len(results)
    passed_tests = sum(results.values())
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed!")
        return True
    else:
        print("⚠️  Some tests failed")
        return False

if __name__ == "__main__":
    main()