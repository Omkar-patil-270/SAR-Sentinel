"""
SAR Sentinel - Pre-Configured Benchmark Observation Scenarios
Curated real-world high-impact radar observation events using NASA-ISRO and Sentinel radar data.
"""

from typing import List, Dict, Any

SCENARIOS: List[Dict[str, Any]] = [
    {
        "id": "brahmaputra_flood",
        "title": "Brahmaputra River Basin Severe Flood Inundation",
        "location_name": "Assam, India",
        "lat": 26.35,
        "lon": 92.68,
        "zoom": 9,
        "category": "Flood & Wetland Dynamics",
        "mission": "NISAR / Sentinel-1 C-Band & L-Band",
        "baseline_date": "2024-05-10",
        "event_date": "2024-07-08",
        "description": "Massive seasonal monsoon flooding along the Brahmaputra river channel. Radar backscatter drops sharply over flooded land due to specular reflection.",
        "metrics": {
            "total_inundated_sqkm": 1420.5,
            "backscatter_drop_db": -6.8,
            "displaced_population_estimate": 240000,
            "critical_risk_zones": 14
        },
        "radar_layers": {
            "baseline_radar": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            "difference_map_type": "inundation_mask",
            "intensity_gain": 1.4
        }
    },
    {
        "id": "sundarbans_coastal",
        "title": "Sundarbans Biosphere Coastal Erosion & Cyclone Surge",
        "location_name": "Bay of Bengal, India",
        "lat": 21.85,
        "lon": 88.90,
        "zoom": 10,
        "category": "Coastal & Ocean Dynamics",
        "mission": "NISAR L-Band / Sentinel-1 Polarimetric SAR",
        "baseline_date": "2024-01-15",
        "event_date": "2024-06-02",
        "description": "Tropical storm surge impacting world's largest mangrove forest. Dual-polarization radar (HH/HV) maps mangrove canopy damage and shoreline retreat.",
        "metrics": {
            "shoreline_retreat_meters": 42.0,
            "mangrove_canopy_alteration_sqkm": 310.2,
            "water_intrusion_index": 0.78,
            "critical_risk_zones": 9
        },
        "radar_layers": {
            "baseline_radar": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            "difference_map_type": "polarimetric_coherence",
            "intensity_gain": 1.2
        }
    },
    {
        "id": "himalayan_glacier",
        "title": "Himalayan Glacial Lake Outburst & Terrain Shift",
        "location_name": "Uttarakhand, Himalayas",
        "lat": 30.55,
        "lon": 79.58,
        "zoom": 11,
        "category": "Glacial Movement & Landslides",
        "mission": "NISAR InSAR (Interferometric SAR)",
        "baseline_date": "2024-02-01",
        "event_date": "2024-04-18",
        "description": "High-altitude permafrost thaw and glacier moraine displacement monitored via differential SAR interferometry (DInSAR).",
        "metrics": {
            "surface_displacement_cm": 18.4,
            "glacial_lake_expansion_percent": 12.6,
            "slope_instability_rating": "Severe",
            "critical_risk_zones": 6
        },
        "radar_layers": {
            "baseline_radar": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            "difference_map_type": "interferometric_fringes",
            "intensity_gain": 1.6
        }
    },
    {
        "id": "kerala_monsoon",
        "title": "Kerala Backwaters & Coastal Flood Mapping",
        "location_name": "Alappuzha & Vembanad, Kerala",
        "lat": 9.58,
        "lon": 76.42,
        "zoom": 10,
        "category": "Urban & Coastal Hydrology",
        "mission": "NISAR / Sentinel-1 Dual-Pol",
        "baseline_date": "2024-04-20",
        "event_date": "2024-08-12",
        "description": "Submergence of agricultural polders and backwater overflow detected using radar amplitude thresholding through dense cloud cover.",
        "metrics": {
            "total_inundated_sqkm": 485.3,
            "backscatter_drop_db": -5.2,
            "displaced_population_estimate": 65000,
            "critical_risk_zones": 11
        },
        "radar_layers": {
            "baseline_radar": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            "difference_map_type": "inundation_mask",
            "intensity_gain": 1.3
        }
    }
]

def get_scenario_by_id(scenario_id: str) -> Dict[str, Any]:
    for s in SCENARIOS:
        if s["id"] == scenario_id:
            return s
    return SCENARIOS[0]
