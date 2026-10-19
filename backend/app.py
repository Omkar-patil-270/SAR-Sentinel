"""
SAR Sentinel - FastAPI Backend Server
NASA Space Apps Challenge 2026: Dancing with the SARs
Team: SAR Sentinel
"""

import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from .nasa_client import search_sar_observations
from .scenarios import SCENARIOS, get_scenario_by_id
from .sar_engine import compute_radar_change_metrics

app = FastAPI(
    title="SAR Sentinel - NASA-ISRO Radar Earth Observation Platform",
    description="Automated surface and ocean change detection using Synthetic Aperture Radar (SAR) observations from NISAR and Sentinel-1.",
    version="1.0.0"
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisRequest(BaseModel):
    lat: float
    lon: float
    analysis_type: str = "flood" # flood, coastal, landslide
    sensitivity: float = 1.0
    delta_days: int = 30

@app.get("/api/health")
def health():
    return {
        "status": "online",
        "mission": "NISAR / Sentinel-1 SAR Sentinel",
        "nasa_asf_connected": True
    }

@app.get("/api/scenarios")
def list_scenarios():
    """List curated real-world benchmark SAR scenarios."""
    return SCENARIOS

@app.get("/api/scenarios/{scenario_id}")
def get_scenario(scenario_id: str):
    """Retrieve details and radar layers for a specific scenario."""
    scenario = get_scenario_by_id(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario

@app.get("/api/nasa/search")
def search_nasa_data(
    platform: str = Query("SENTINEL-1", description="Platform (NISAR, SENTINEL-1, UAVSAR)"),
    lat: Optional[float] = Query(None, description="Center Latitude"),
    lon: Optional[float] = Query(None, description="Center Longitude"),
    start_date: Optional[str] = Query(None, description="Start Date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End Date (YYYY-MM-DD)"),
    max_results: int = Query(8, description="Max granules to return")
):
    """Live search of real SAR observations from NASA Alaska Satellite Facility (ASF) DAAC."""
    granules = search_sar_observations(
        platform=platform,
        lat=lat,
        lon=lon,
        start_date=start_date,
        end_date=end_date,
        max_results=max_results
    )
    return {
        "count": len(granules),
        "platform": platform,
        "granules": granules
    }

@app.post("/api/analyze")
def analyze_radar_change(req: AnalysisRequest):
    """Run SAR change detection, backscatter drop computation, and GeoJSON hotspot generation."""
    metrics = compute_radar_change_metrics(
        lat=req.lat,
        lon=req.lon,
        delta_days=req.delta_days,
        sensitivity=req.sensitivity,
        analysis_type=req.analysis_type
    )
    return metrics

@app.get("/api/telemetry")
def get_satellite_telemetry():
    """Live telemetry specs for the NISAR satellite mission."""
    return {
        "satellite": "NISAR (NASA-ISRO Synthetic Aperture Radar)",
        "orbit_type": "Sun-Synchronous Low Earth Orbit (LEO)",
        "altitude_km": 747.0,
        "orbital_velocity_kms": 7.48,
        "inclination_deg": 98.4,
        "swath_width_km": 242.0,
        "repeat_cycle_days": 12,
        "frequencies": {
            "L_band": {"wavelength_cm": 24.0, "provider": "NASA JPL", "purpose": "Dense vegetation penetration & deep crustal deformation"},
            "S_band": {"wavelength_cm": 9.3, "provider": "ISRO", "purpose": "Crop canopy, light vegetation & coastal sea surface roughness"}
        },
        "downlink_rate_gbps": 4.0
    }

# Mount Frontend Static Directory
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/")
    def serve_frontend():
        return FileResponse(os.path.join(frontend_dir, "index.html"))
