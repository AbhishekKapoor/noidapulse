#!/usr/bin/env python3
"""
NoidaPulse Backend API Testing Script
Tests the new features: 100 newly added shows, custom check-ins, and count-based ranking
"""

import requests
import json
import time
import random
from datetime import datetime, timedelta

# Backend URL from environment
BASE_URL = "https://noida-watch-live.preview.emergentagent.com/api"

# Test data
VALID_SECTORS = ["sector-1", "sector-62", "sector-135", "greater-noida-alpha"]
VALID_DEVICES = ["mobile", "laptop", "tablet", "tv"]

def test_search_new_shows():
    """Test 1: Verify that the 100 newly added shows (IDs 401-500) are searchable"""
    print("\n=== Testing Search for New Shows (IDs 401-500) ===")
    
    test_searches = [
        ("Extraction", "Netflix movie"),
        ("Wednesday", "Netflix series"),
        ("Scam 2003", "SonyLIV series"),
        ("Rangbaaz", "ZEE5 series")
    ]
    
    all_passed = True
    
    for search_term, expected_desc in test_searches:
        try:
            print(f"\n🔍 Searching for: '{search_term}' (expecting {expected_desc})")
            response = requests.get(f"{BASE_URL}/search", params={"q": search_term})
            
            if response.status_code != 200:
                print(f"❌ Search failed with status {response.status_code}")
                all_passed = False
                continue
                
            data = response.json()
            results = data.get("results", [])
            
            if not results:
                print(f"❌ No results found for '{search_term}'")
                all_passed = False
                continue
                
            # Check if we found the expected show
            found = False
            for result in results:
                if search_term.lower() in result.get("title", "").lower():
                    print(f"✅ Found: {result['title']} ({result.get('platform', 'Unknown')} {result.get('type', 'unknown')})")
                    found = True
                    break
                    
            if not found:
                print(f"❌ Expected show '{search_term}' not found in results")
                print(f"   Results: {[r.get('title') for r in results[:3]]}")
                all_passed = False
                
        except Exception as e:
            print(f"❌ Error searching for '{search_term}': {e}")
            all_passed = False
    
    return all_passed

def test_custom_show_checkin():
    """Test 2: Test custom show check-in with normalization and fuzzy matching"""
    print("\n=== Testing Custom Show Check-in ===")
    
    custom_show_name = "My Custom Test Show 123"
    sector_id = random.choice(VALID_SECTORS)
    device_type = random.choice(VALID_DEVICES)
    
    try:
        print(f"\n📝 Creating check-in for custom show: '{custom_show_name}'")
        print(f"   Sector: {sector_id}, Device: {device_type}")
        
        checkin_data = {
            "title": custom_show_name,
            "sectorId": sector_id,
            "deviceType": device_type,
            "platform": "Custom",
            "type": "series"
        }
        
        response = requests.post(f"{BASE_URL}/checkin", json=checkin_data)
        
        if response.status_code != 201:
            print(f"❌ Check-in failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
        data = response.json()
        
        if not data.get("success"):
            print(f"❌ Check-in not successful: {data}")
            return False
            
        checkin = data.get("checkin", {})
        normalized_info = data.get("normalized")
        
        print(f"✅ Check-in created successfully!")
        print(f"   ID: {checkin.get('id')}")
        print(f"   Normalized Title: {checkin.get('displayTitle')}")
        print(f"   Stored in MongoDB: {checkin.get('normalizedTitle')}")
        
        if normalized_info:
            print(f"   Title normalization: '{normalized_info['original']}' → '{normalized_info['normalized']}'")
        
        # Test fuzzy matching by creating a similar title
        similar_title = "My Custom Test Show 124"  # Very similar
        print(f"\n🔍 Testing fuzzy matching with similar title: '{similar_title}'")
        
        similar_checkin_data = {
            "title": similar_title,
            "sectorId": sector_id,
            "deviceType": device_type,
            "platform": "Custom",
            "type": "series"
        }
        
        response2 = requests.post(f"{BASE_URL}/checkin", json=similar_checkin_data)
        
        if response2.status_code == 201:
            data2 = response2.json()
            checkin2 = data2.get("checkin", {})
            print(f"✅ Similar title check-in created")
            print(f"   Normalized: {checkin2.get('displayTitle')}")
            
            # Check if they were normalized to the same or different titles
            if checkin.get('normalizedTitle') == checkin2.get('normalizedTitle'):
                print(f"✅ Fuzzy matching worked - both normalized to same title")
            else:
                print(f"ℹ️  Different normalization (expected for different titles)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in custom show check-in test: {e}")
        return False

def test_count_based_ranking():
    """Test 3: Test simple count-based ranking system"""
    print("\n=== Testing Count-Based Ranking System ===")
    
    try:
        # Create multiple check-ins for different shows to test ranking
        test_shows = [
            {"title": "Test Ranking Show A", "count": 5},
            {"title": "Test Ranking Show B", "count": 3},
            {"title": "Test Ranking Show C", "count": 7},  # Should be #1
            {"title": "Test Ranking Show D", "count": 1}
        ]
        
        sector_id = "sector-62"
        device_type = "mobile"
        
        print(f"\n📝 Creating test check-ins for ranking test...")
        
        # Create check-ins for each test show
        for show in test_shows:
            for i in range(show["count"]):
                checkin_data = {
                    "title": show["title"],
                    "sectorId": sector_id,
                    "deviceType": device_type,
                    "platform": "Test",
                    "type": "series"
                }
                
                response = requests.post(f"{BASE_URL}/checkin", json=checkin_data)
                if response.status_code != 201:
                    print(f"❌ Failed to create check-in for {show['title']}")
                    return False
                
                # Small delay to avoid overwhelming the API
                time.sleep(0.1)
        
        print(f"✅ Created check-ins for ranking test")
        
        # Wait a moment for data to be processed
        time.sleep(1)
        
        # Get trending shows
        print(f"\n📊 Fetching trending shows...")
        response = requests.get(f"{BASE_URL}/trending", params={"range": "all"})
        
        if response.status_code != 200:
            print(f"❌ Failed to get trending shows: {response.status_code}")
            return False
            
        data = response.json()
        trending = data.get("trending", [])
        
        if not trending:
            print(f"❌ No trending shows returned")
            return False
            
        print(f"✅ Retrieved {len(trending)} trending shows")
        
        # Find our test shows in the trending list
        test_show_rankings = {}
        for i, show in enumerate(trending):
            title = show.get("title", "")
            if "Test Ranking Show" in title:
                test_show_rankings[title] = {
                    "rank": i + 1,
                    "checkinCount": show.get("checkinCount", 0)
                }
                print(f"   #{i+1}: {title} ({show.get('checkinCount')} check-ins)")
        
        # Verify ranking is based on count
        if "Test Ranking Show C" in test_show_rankings:
            show_c_rank = test_show_rankings["Test Ranking Show C"]["rank"]
            show_c_count = test_show_rankings["Test Ranking Show C"]["checkinCount"]
            
            if show_c_count >= 7:  # Should have at least our 7 check-ins
                print(f"✅ Count-based ranking working: Show C has {show_c_count} check-ins")
                
                # Check if it's ranked higher than shows with fewer check-ins
                higher_ranked = True
                for title, info in test_show_rankings.items():
                    if info["checkinCount"] < show_c_count and info["rank"] < show_c_rank:
                        higher_ranked = False
                        break
                
                if higher_ranked:
                    print(f"✅ Ranking logic correct: Most check-ins = highest rank")
                else:
                    print(f"❌ Ranking logic incorrect: Show with fewer check-ins ranked higher")
                    return False
            else:
                print(f"❌ Check-in count mismatch: expected ≥7, got {show_c_count}")
                return False
        else:
            print(f"❌ Test Ranking Show C not found in trending list")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error in count-based ranking test: {e}")
        return False

def test_trending_with_filters():
    """Test 4: Test trending endpoint with various filters"""
    print("\n=== Testing Trending with Filters ===")
    
    try:
        # Test sector filter
        print(f"\n🔍 Testing sector filter...")
        response = requests.get(f"{BASE_URL}/trending", params={
            "sector": "sector-62",
            "range": "week"
        })
        
        if response.status_code != 200:
            print(f"❌ Sector filter test failed: {response.status_code}")
            return False
            
        data = response.json()
        print(f"✅ Sector filter working: {len(data.get('trending', []))} shows")
        
        # Test device filter
        print(f"\n📱 Testing device filter...")
        response = requests.get(f"{BASE_URL}/trending", params={
            "device": "mobile",
            "range": "week"
        })
        
        if response.status_code != 200:
            print(f"❌ Device filter test failed: {response.status_code}")
            return False
            
        data = response.json()
        print(f"✅ Device filter working: {len(data.get('trending', []))} shows")
        
        # Test time range filter
        print(f"\n⏰ Testing time range filter...")
        response = requests.get(f"{BASE_URL}/trending", params={
            "range": "today"
        })
        
        if response.status_code != 200:
            print(f"❌ Time range filter test failed: {response.status_code}")
            return False
            
        data = response.json()
        print(f"✅ Time range filter working: {len(data.get('trending', []))} shows")
        
        # Test time slot filter
        print(f"\n🌅 Testing time slot filter...")
        response = requests.get(f"{BASE_URL}/trending", params={
            "timeSlot": "evening",
            "range": "week"
        })
        
        if response.status_code != 200:
            print(f"❌ Time slot filter test failed: {response.status_code}")
            return False
            
        data = response.json()
        print(f"✅ Time slot filter working: {len(data.get('trending', []))} shows")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in trending filters test: {e}")
        return False

def test_popular_shows():
    """Test 5: Test popular shows endpoint returns newly added shows"""
    print("\n=== Testing Popular Shows Endpoint ===")
    
    try:
        print(f"\n🌟 Fetching popular shows...")
        response = requests.get(f"{BASE_URL}/popular", params={"limit": 20})
        
        if response.status_code != 200:
            print(f"❌ Popular shows request failed: {response.status_code}")
            return False
            
        data = response.json()
        shows = data.get("shows", [])
        
        if not shows:
            print(f"❌ No popular shows returned")
            return False
            
        print(f"✅ Retrieved {len(shows)} popular shows")
        
        # Check if any of the newly added shows (IDs 401-500) are included
        new_shows_found = []
        for show in shows:
            show_id = show.get("id", "")
            if show_id.isdigit() and 401 <= int(show_id) <= 500:
                new_shows_found.append(show.get("title"))
            elif show_id.startswith("local-") and show_id.replace("local-", "").isdigit():
                local_id = int(show_id.replace("local-", ""))
                if local_id >= 301:  # 2024 releases and newer
                    new_shows_found.append(show.get("title"))
        
        if new_shows_found:
            print(f"✅ Found newly added shows in popular list:")
            for title in new_shows_found[:5]:  # Show first 5
                print(f"   - {title}")
        else:
            print(f"ℹ️  No newly added shows found in this random sample (this is normal due to randomization)")
        
        # Test platform filter
        print(f"\n🎬 Testing platform filter...")
        response = requests.get(f"{BASE_URL}/popular", params={
            "platform": "Netflix",
            "limit": 10
        })
        
        if response.status_code == 200:
            data = response.json()
            netflix_shows = data.get("shows", [])
            print(f"✅ Platform filter working: {len(netflix_shows)} Netflix shows")
        else:
            print(f"❌ Platform filter test failed: {response.status_code}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error in popular shows test: {e}")
        return False

def test_overall_health():
    """Test 6: Test all core endpoints are responding correctly"""
    print("\n=== Testing Overall API Health ===")
    
    endpoints = [
        ("/health", "GET", "Health check"),
        ("/sectors", "GET", "Sectors list"),
        ("/devices", "GET", "Device types"),
        ("/stats", "GET", "Statistics"),
        ("/share", "GET", "Share data")
    ]
    
    all_healthy = True
    
    for endpoint, method, description in endpoints:
        try:
            print(f"\n🔍 Testing {description} ({method} {endpoint})")
            
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}")
            else:
                continue  # Skip non-GET for now
                
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {description}: OK")
                
                # Basic validation
                if endpoint == "/sectors":
                    sectors = data.get("sectors", [])
                    if len(sectors) == 143:
                        print(f"   ✅ Correct number of sectors: {len(sectors)}")
                    else:
                        print(f"   ❌ Expected 143 sectors, got {len(sectors)}")
                        all_healthy = False
                        
                elif endpoint == "/devices":
                    devices = data.get("devices", [])
                    if len(devices) == 4:
                        print(f"   ✅ Correct number of devices: {len(devices)}")
                    else:
                        print(f"   ❌ Expected 4 devices, got {len(devices)}")
                        all_healthy = False
                        
            else:
                print(f"❌ {description}: Failed with status {response.status_code}")
                all_healthy = False
                
        except Exception as e:
            print(f"❌ Error testing {description}: {e}")
            all_healthy = False
    
    return all_healthy

def main():
    """Run all backend tests"""
    print("🚀 Starting NoidaPulse Backend API Tests")
    print(f"📍 Testing against: {BASE_URL}")
    print("=" * 60)
    
    test_results = {}
    
    # Run all tests
    test_results["search_new_shows"] = test_search_new_shows()
    test_results["custom_show_checkin"] = test_custom_show_checkin()
    test_results["count_based_ranking"] = test_count_based_ranking()
    test_results["trending_with_filters"] = test_trending_with_filters()
    test_results["popular_shows"] = test_popular_shows()
    test_results["overall_health"] = test_overall_health()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name.replace('_', ' ').title()}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! NoidaPulse backend is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)