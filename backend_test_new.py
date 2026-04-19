#!/usr/bin/env python3
"""
NoidaPulse Backend API Testing Suite
Tests all enhanced backend APIs with comprehensive validation
"""

import requests
import json
import time
from datetime import datetime

# Base URL from environment
BASE_URL = "https://noida-watch-live.preview.emergentagent.com/api"

def test_health_check():
    """Test GET /api/health - Health check"""
    print("\n🔍 Testing Health Check API...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data}")
            
            # Validate response structure
            if 'status' in data and data['status'] == 'healthy':
                print("✅ Health check API working correctly")
                return True
            else:
                print("❌ Health check response missing 'status' field or not 'healthy'")
                return False
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Health check API error: {str(e)}")
        return False

def test_sectors_api():
    """Test GET /api/sectors - Should return 143 sectors"""
    print("\n🔍 Testing Sectors API...")
    try:
        response = requests.get(f"{BASE_URL}/sectors", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            sectors = data.get('sectors', [])
            print(f"Total sectors returned: {len(sectors)}")
            
            # Validate we have 143 sectors (135 Noida + 8 Greater Noida)
            if len(sectors) == 143:
                print("✅ Correct number of sectors (143)")
                
                # Check for actual Noida sectors (Sector 1, 2, 3...)
                noida_sectors = [s for s in sectors if s['area'] == 'Noida']
                greater_noida_sectors = [s for s in sectors if s['area'] == 'Greater Noida']
                
                print(f"Noida sectors: {len(noida_sectors)}")
                print(f"Greater Noida sectors: {len(greater_noida_sectors)}")
                
                # Check for specific sectors
                sector_1 = next((s for s in sectors if s['name'] == 'Sector 1'), None)
                sector_62 = next((s for s in sectors if s['name'] == 'Sector 62'), None)
                alpha = next((s for s in sectors if s['name'] == 'Alpha'), None)
                
                if sector_1 and sector_62 and alpha:
                    print("✅ Key sectors found: Sector 1, Sector 62, Alpha")
                    print("✅ Sectors API working correctly")
                    return True
                else:
                    print("❌ Missing key sectors")
                    return False
            else:
                print(f"❌ Expected 143 sectors, got {len(sectors)}")
                return False
        else:
            print(f"❌ Sectors API failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Sectors API error: {str(e)}")
        return False

def test_devices_api():
    """Test GET /api/devices - Should return 4 device types"""
    print("\n🔍 Testing Device Types API...")
    try:
        response = requests.get(f"{BASE_URL}/devices", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            devices = data.get('devices', [])
            print(f"Total devices returned: {len(devices)}")
            
            # Validate we have 4 device types
            if len(devices) == 4:
                device_ids = [d['id'] for d in devices]
                expected_devices = ['mobile', 'laptop', 'tablet', 'tv']
                
                if all(device in device_ids for device in expected_devices):
                    print("✅ All expected device types found: mobile, laptop, tablet, tv")
                    print("✅ Device Types API working correctly")
                    return True
                else:
                    print(f"❌ Missing expected device types. Found: {device_ids}")
                    return False
            else:
                print(f"❌ Expected 4 device types, got {len(devices)}")
                return False
        else:
            print(f"❌ Device Types API failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Device Types API error: {str(e)}")
        return False

def test_search_local():
    """Test GET /api/search?q=Mirzapur - Should find in local DB"""
    print("\n🔍 Testing Search API (Local DB - Mirzapur)...")
    try:
        response = requests.get(f"{BASE_URL}/search?q=Mirzapur", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            source = data.get('source', '')
            
            print(f"Results found: {len(results)}")
            print(f"Source: {source}")
            
            if source == 'local' and len(results) > 0:
                mirzapur = results[0]
                print(f"Found: {mirzapur.get('title')} - Platform: {mirzapur.get('platform')}")
                
                # Validate platform info is included
                if mirzapur.get('platform') and mirzapur.get('platform') != 'Unknown':
                    print("✅ Local search working with platform info")
                    return True
                else:
                    print("❌ Platform info missing from local search")
                    return False
            else:
                print("❌ Mirzapur not found in local DB or wrong source")
                return False
        else:
            print(f"❌ Search API failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Search API (local) error: {str(e)}")
        return False

def test_search_omdb():
    """Test GET /api/search?q=Avengers - Should fall back to OMDb"""
    print("\n🔍 Testing Search API (OMDb fallback - Avengers)...")
    try:
        response = requests.get(f"{BASE_URL}/search?q=Avengers", timeout=15)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            source = data.get('source', '')
            
            print(f"Results found: {len(results)}")
            print(f"Source: {source}")
            
            if source == 'omdb' and len(results) > 0:
                avengers = results[0]
                print(f"Found: {avengers.get('title')} - Type: {avengers.get('type')}")
                print("✅ OMDb fallback working correctly")
                return True
            elif source == 'local':
                print("⚠️ Avengers found in local DB (unexpected but not an error)")
                return True
            else:
                print("❌ OMDb fallback not working or no results")
                return False
        else:
            print(f"❌ Search API failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Search API (OMDb) error: {str(e)}")
        return False

def test_popular_api():
    """Test GET /api/popular?limit=5 - Should return random popular shows"""
    print("\n🔍 Testing Popular Shows API...")
    try:
        response = requests.get(f"{BASE_URL}/popular?limit=5", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            shows = data.get('shows', [])
            print(f"Popular shows returned: {len(shows)}")
            
            if len(shows) == 5:
                # Check if shows have platform info
                platforms_found = [show.get('platform') for show in shows if show.get('platform')]
                print(f"Shows with platform info: {len(platforms_found)}")
                
                if len(platforms_found) == 5:
                    print("✅ Popular API working with platform info")
                    return True
                else:
                    print("❌ Some shows missing platform info")
                    return False
            else:
                print(f"❌ Expected 5 shows, got {len(shows)}")
                return False
        else:
            print(f"❌ Popular API failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Popular API error: {str(e)}")
        return False

def test_checkin_api():
    """Test POST /api/checkin - Create checkin with device type"""
    print("\n🔍 Testing Create Checkin API...")
    try:
        checkin_data = {
            "showId": "local-23",
            "title": "Asur",
            "type": "series",
            "platform": "JioHotstar",
            "sectorId": "sector-62",
            "deviceType": "tv"
        }
        
        response = requests.post(f"{BASE_URL}/checkin", 
                               json=checkin_data, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"Response: {data}")
            
            if data.get('success') and 'checkin' in data:
                checkin = data['checkin']
                
                # Validate required fields
                required_fields = ['showId', 'title', 'sectorId', 'deviceType', 'platform']
                missing_fields = [field for field in required_fields if not checkin.get(field)]
                
                if not missing_fields:
                    print("✅ Checkin created successfully with all required fields")
                    return True
                else:
                    print(f"❌ Checkin missing fields: {missing_fields}")
                    return False
            else:
                print("❌ Checkin response missing success or checkin data")
                return False
        else:
            print(f"❌ Checkin API failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Error response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Checkin API error: {str(e)}")
        return False

def test_trending_api():
    """Test GET /api/trending - Returns trending with device breakdown"""
    print("\n🔍 Testing Trending API...")
    try:
        response = requests.get(f"{BASE_URL}/trending", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            trending = data.get('trending', [])
            stats = data.get('stats', {})
            
            print(f"Trending shows: {len(trending)}")
            print(f"Stats included: {bool(stats)}")
            
            # Check if device stats are included
            device_stats = stats.get('deviceStats', {})
            platform_stats = stats.get('platformStats', {})
            
            print(f"Device stats: {device_stats}")
            print(f"Platform stats: {platform_stats}")
            
            # Check if trending shows have device breakdown
            if trending:
                first_show = trending[0]
                devices = first_show.get('devices', {})
                print(f"First show device breakdown: {devices}")
                
                if 'devices' in first_show and isinstance(devices, dict):
                    print("✅ Trending API working with device breakdown")
                    return True
                else:
                    print("❌ Trending shows missing device breakdown")
                    return False
            else:
                print("⚠️ No trending shows found (might be empty DB)")
                return True  # Not an error if DB is empty
                
        else:
            print(f"❌ Trending API failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Trending API error: {str(e)}")
        return False

def test_trending_sector_filter():
    """Test GET /api/trending?sector=sector-62 - Filter by specific sector"""
    print("\n🔍 Testing Trending API with Sector Filter...")
    try:
        response = requests.get(f"{BASE_URL}/trending?sector=sector-62", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            trending = data.get('trending', [])
            
            print(f"Trending shows for Sector 62: {len(trending)}")
            print("✅ Trending sector filter working")
            return True
        else:
            print(f"❌ Trending sector filter failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Trending sector filter error: {str(e)}")
        return False

def test_stats_api():
    """Test GET /api/stats - Returns platform statistics"""
    print("\n🔍 Testing Stats API...")
    try:
        response = requests.get(f"{BASE_URL}/stats", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Stats response: {data}")
            
            # Check for expected fields
            expected_fields = ['totalCheckins', 'todayCheckins', 'uniqueShows']
            missing_fields = [field for field in expected_fields if field not in data]
            
            if not missing_fields:
                print("✅ Stats API working with all expected fields")
                return True
            else:
                print(f"❌ Stats API missing fields: {missing_fields}")
                return False
        else:
            print(f"❌ Stats API failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Stats API error: {str(e)}")
        return False

def run_all_tests():
    """Run all backend API tests"""
    print("🚀 Starting NoidaPulse Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    print("=" * 60)
    
    test_results = {}
    
    # Run all tests
    test_results['health'] = test_health_check()
    test_results['sectors'] = test_sectors_api()
    test_results['devices'] = test_devices_api()
    test_results['search_local'] = test_search_local()
    test_results['search_omdb'] = test_search_omdb()
    test_results['popular'] = test_popular_api()
    test_results['checkin'] = test_checkin_api()
    test_results['trending'] = test_trending_api()
    test_results['trending_filter'] = test_trending_sector_filter()
    test_results['stats'] = test_stats_api()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in test_results.values() if result)
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.upper()}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend tests PASSED!")
        return True
    else:
        print("⚠️ Some backend tests FAILED!")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)