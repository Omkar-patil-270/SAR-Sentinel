# 🛰️ SAR Sentinel: Automated Earth & Ocean Surface Dynamics via NASA-ISRO NISAR Radar

**NASA Space Apps Challenge 2026**  
**Challenge:** Dancing with the SARs  
**Team:** SAR Sentinel  
**Participant:** Omkar Ramesh Patil  

---

## 🌍 Executive Summary
Earth's surface is constantly in motion. From catastrophic river inundations and coastal mangrove erosion to high-altitude glacial lake expansions, monitoring these dynamics in all-weather, day-or-night conditions is essential. 

**SAR Sentinel** is an interactive, full-stack Earth Observation platform leveraging Synthetic Aperture Radar (SAR) observations from the joint **NASA-ISRO NISAR** mission (L-Band & S-Band) and **Sentinel-1** (C-Band). By querying NASA's Alaska Satellite Facility (ASF) DAAC in real-time, the platform analyzes backscatter intensity differentials ($\Delta \sigma^0$) to automatically delineate surface water inundation, map coastal erosion vectors, and visualize terrain changes.

---

## ⚡ Key Features
1. **Live NASA ASF DAAC Archive Querying:** Direct integration with NASA's Alaska Satellite Facility API to discover real SAR observation granules by platform, coordinates, and date.
2. **Quantitative Radar Change Detection Engine:** Computes specular backscatter drop (dB) over standing floodwaters and polarimetric coherence alteration across coastlines.
3. **NASA Mission Control Dashboard:** Dark-mode cybernetic HUD with real-time NISAR orbital telemetry (747 km altitude, 242 km swath, 12-day repeat cycle).
4. **Interactive Leaflet GeoJSON Mapping:** Pulsing radar anomaly hotspots, baseline vs event temporal slider, and mouse-hover coordinates HUD.
5. **Mission Report Generation:** One-click generation of printable scientific reports formatted for academic capstone evaluation and NASA Space Apps submission.

---

## 🛠️ Architecture & Tech Stack
* **Backend:** Python 3.11, FastAPI, Uvicorn, Requests, NumPy.
* **Frontend:** Vanilla HTML5/CSS3, JavaScript (ES6+), Leaflet.js, Chart.js.
* **Data Sources:** NASA Alaska Satellite Facility (ASF) DAAC, NASA-ISRO NISAR mission data, ESA Sentinel-1 radar archives.

---

## 🚀 Quickstart (Running the Project)

```bash
# 1. Open terminal in the project directory
cd d:\FINAL-DANCE

# 2. Run the application
python run.py
```

The application will automatically initialize the FastAPI backend and open your default browser at `http://127.0.0.1:8000`.
