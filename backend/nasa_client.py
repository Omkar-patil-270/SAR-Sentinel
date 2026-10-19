"""
SAR Sentinel - NASA ASF DAAC Client
Handles live querying of real Synthetic Aperture Radar (SAR) observations from NASA's Alaska Satellite Facility.
"""

import requests
from typing import List, Dict, Any, Optional

ASF_API_URL = "https://api.daac.asf.alaska.edu/services/search/param"

def search_sar_observations(
    platform: str = "SENTINEL-1",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    max_results: int = 10,
    processing_level: Optional[str] = "GRD"
) -> List[Dict[str, Any]]:
    """
    Search real SAR observations from NASA's ASF archive.
    """
    params = {
        "output": "json",
        "maxResults": max_results,
    }
    
    # Platform mapping
    if platform.upper() in ["NISAR", "UAVSAR", "SENTINEL-1"]:
        params["platform"] = platform.upper()
    else:
        params["platform"] = "SENTINEL-1"
        
    if processing_level:
        params["processingLevel"] = processing_level
        
    # Location filtering
    if lat is not None and lon is not None:
        delta = 0.5
        params["bbox"] = f"{lon - delta},{lat - delta},{lon + delta},{lat + delta}"
        
    if start_date:
        params["start"] = f"{start_date}T00:00:00UTC"
    if end_date:
        params["end"] = f"{end_date}T23:59:59UTC"
        
    try:
        response = requests.get(ASF_API_URL, params=params, timeout=12)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                granules = data[0]
                results = []
                for g in granules:
                    results.append({
                        "granule_name": g.get("granuleName") or g.get("fileName"),
                        "platform": g.get("platform"),
                        "sensor": g.get("sensor"),
                        "startTime": g.get("startTime"),
                        "stopTime": g.get("stopTime"),
                        "polarization": g.get("polarization"),
                        "beamMode": g.get("beamModeType"),
                        "orbit": g.get("orbit"),
                        "flightDirection": g.get("flightDirection"),
                        "sizeMB": g.get("sizeMB"),
                        "downloadUrl": g.get("downloadUrl"),
                        "thumbnailUrl": g.get("thumb") or g.get("browse"),
                        "footprint": g.get("stringFootprint")
                    })
                return results
    except Exception as e:
        print(f"[NASA Client Error] {e}")
        
    return []
