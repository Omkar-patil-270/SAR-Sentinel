# 🛰️ SAR SENTINEL: Autonomous Radar Earth Observation Intelligence
### NASA Space Apps Challenge 2026 // Challenge: *Dancing with the SARs*
**Mission Station:** `NISAR-01` | **Team:** `SAR Sentinel` | **Platform:** NASA-ISRO NISAR & Sentinel-1

[![NASA Space Apps](https://img.shields.io/badge/NASA%20Space%20Apps-2026%20Global%20Challenge-blue.svg)](https://www.spaceappschallenge.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![CesiumJS](https://img.shields.io/badge/3D%20Globe-CesiumJS%20WebGL-2196F3.svg)](https://cesium.com)
[![Apache ECharts](https://img.shields.io/badge/Analytics-Apache%20ECharts%205.5-E43961.svg)](https://echarts.apache.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌍 1. Executive Summary
During extreme climatic hazards (monsoonal cloudbursts, severe cyclones, and sudden glacial lake outburst floods), conventional optical satellites (Landsat, Sentinel-2) are completely blinded by persistent cloud cover and dense rainfall.

**SAR Sentinel** is an autonomous 3D geospatial intelligence platform that exploits all-weather, day-and-night Synthetic Aperture Radar (SAR) observations from the joint **NASA-ISRO NISAR** mission (L-band/S-band) and **Sentinel-1** (C-band). Connecting directly to the **NASA Alaska Satellite Facility (ASF) DAAC API**, the system computes radar backscatter drop ($\Delta\sigma^0$), interferometric phase decorrelation ($\gamma$), and polarimetric decomposition in near real-time.

---

## ⚡ 2. Core Capabilities

### 🛰️ Photorealistic 3D Cesium WebGL Earth
* **747 km Sun-Synchronous Orbit (SSO):** Real-time 3D orbital trajectory of the NISAR spacecraft.
* **Dynamic Radar Swath Beam:** Pyramidal sensor beam projecting down to Earth along the orbital pass.
* **3D Inundation Surface Heatmap:** Procedural radar backscatter canvas draped directly across planetary topography.
* **Real NASA ASF DAAC Swath Footprints:** Parses spatial WKT coverage polygons returned from NASA's archive and renders glowing neon bounding footprints on Earth with click-to-focus flight navigation.

### ⏱️ Temporal SAR Time-Scrubber
* Scrub between **Day -15 (Baseline Dry Terrain)** $\to$ **Day 0 (Peak Disaster Inundation)** $\to$ **Day +15 (Drainage & Recession)**.
* Smooth on-globe alpha interpolation via `Cesium.CallbackProperty`.
* Auto-Play / Pause loop (`▶` / `⏸`) with live KPI metrics interpolation.

### 📊 Advanced Multi-Mode Radar Analytics (Apache ECharts)
* **Mode 1 — Spectral Backscatter Curve:** Compares T-0 pre-event baseline vs. T-1 event backscatter distribution, highlighting the annotated **Specular Water Threshold ($-6.5\text{ dB}$)** and peak anomaly dip.
* **Mode 2 — Polarimetric Radar Rose:** Quad-pol radar chart decomposing $S_{HH}$ (surface), $S_{HV}$ (volume), $S_{VV}$ (roughness), $S_{VH}$ (cross-pol), coherence $\gamma$, and entropy $H$.
* **Mode 3 — 60-Day ML Temporal Forecast:** Historical acquisitions coupled with an exponential drainage recovery curve and shaded $\pm 95\%$ confidence ribbon.

### 🌐 Custom Global Coordinate Targeting
* Input any latitude and longitude across Earth to dynamically query NASA ASF DAAC and execute SAR change detection outside predefined scenarios.

---

## 📐 3. Theoretical Principles & Radar Mathematics

### 3.1 Specular Attenuation ($\Delta\sigma^0$)
Smooth open water acts as a specular reflector, bouncing radar microwave pulses away from the sensor:
$$\Delta\sigma^0 = \sigma_{\text{event}}^0 - \sigma_{\text{baseline}}^0 < -6.5\text{ dB}$$

### 3.2 Interferometric Phase Decorrelation ($\gamma$)
For structural stability and debris flow monitoring, complex InSAR interferometric coherence is computed:
$$\gamma = \frac{|\langle s_1 s_2^* \rangle|}{\sqrt{\langle |s_1|^2 \rangle \langle |s_2|^2 \rangle}}, \quad 0 \le \gamma \le 1$$

### 3.3 Real Sentinel-1 Satellite Processing Pipeline (`scripts/validate_real_sentinel1.py`)
To establish genuine empirical ground truth, SAR Sentinel implements an automated raster pipeline that processes **actual Level-1 radar measurements** acquired by the Copernicus Sentinel-1A satellite during the peak July 2024 monsoon flood:

* **Real Observation Granule:** `S1A_IW_GRDH_1SDV_20240706T114908_20240706T114933_054640_06A6C6`
* **Acquisition Timestamp:** `2024-07-06T11:49:08Z`
* **Evaluated Area:** Kaziranga Floodplain & Brahmaputra Channel ($4,416.14\text{ km}^2$, $136 \times 227$ satellite pixels)
* **Pre-processing:** 2D spatial median speckle filter ($5 \times 5$ kernel) & radiometric calibration
* **Dynamically Computed Otsu Threshold:** **$-35.23\text{ dB}$** (Maximized between-class variance: $\sigma_b^2 = 88.86$)
* **Ground-Truth Benchmark:** Copernicus Emergency Management Service (**Copernicus EMS EMSR-724 Delineation**)

| Metric | Measured Real Satellite Value | Evaluation Standard | Physical Interpretation |
|---|---|---|---|
| **True Positive Area** | **282.66 km²** ($1,976$ pixels) | Copernicus EMS EMSR-724 | Correctly identified open floodwaters |
| **False Positive Area** | **625.54 km²** ($4,373$ pixels) | Copernicus EMS EMSR-724 | Smooth dry sandbars & paved tarmac |
| **False Negative Area** | **1,188.15 km²** ($8,306$ pixels) | Copernicus EMS EMSR-724 | Sub-canopy floodwaters concealed under dense jungle |
| **True Negative Area** | **2,319.79 km²** ($16,217$ pixels)| Copernicus EMS EMSR-724 | Correctly classified dry terrain |
| **Measured Precision** | **31.12%** | Real Sentinel-1 vs EMSR-724 | Impacted by smooth sandbar specular bounce |
| **Measured Recall** | **19.22%** | Real Sentinel-1 vs EMSR-724 | Limited by C-band canopy penetration |
| **Measured F1-Score** | **23.76%** | Harmonic Mean | Single-scene raw C-band baseline |
| **Overall Accuracy** | **58.93%** | Full AOI Evaluation | Uncalibrated single-pass satellite accuracy |

#### 🔬 Scientific Investigation of C-Band Baseline & NASA-ISRO NISAR Hypothesis:
Our empirical pipeline reveals the fundamental physics and geometry of radar remote sensing:
1. **Geometrical Factor (Orbital Slant-Range Coordinate Skew):** Raw Sentinel-1 Level-1 GRD imagery is formatted in satellite radar slant-range coordinates (`CRS: None`) oriented along Sentinel-1's $98.4^\circ$ ascending orbital inclination. Without executing a full DEM-based Range-Doppler Terrain Correction, the satellite raster is spatially rotated relative to true WGS84 North-South vector boundaries, creating a spatial misregistration offset that directly suppresses the measured overlap ($TP$).
2. **Physical Factor (The C-Band Canopy Barrier):** Sentinel-1 operates at C-band ($\lambda = 5.6\text{ cm}$). In dense tropical floodplains (like Kaziranga's tall elephant grass and riverine jungle), short C-band waves scatter off tree leaves and cannot penetrate to the flooded ground surface below, resulting in **$1,188.15\text{ km}^2$ of sub-canopy false negatives**.
3. **Scientifically Motivated Hypothesis for NISAR:** This empirical limitation provides the direct scientific rationale for the **NASA-ISRO NISAR mission**. NISAR's long-wavelength **L-Band ($\lambda = 24\text{ cm}$)** is theoretically designed to penetrate through thick forest canopies and wetland foliage, bouncing off the water-trunk boundary via double-bounce scattering to detect the sub-canopy inundations that single-pass C-band satellites miss.

---

### 3.4 Synthetic Simulation Benchmark (Calibrated on Copernicus EMS EMSR-724)
To model how NISAR's L-band penetration and bi-temporal change detection resolves this limitation, SAR Sentinel includes an automated benchmark pipeline (`scripts/empirical_validation.py`). It simulates an idealized radar response on a georeferenced WGS84 spatial grid ($1000 \times 1000$ cells, $4,416.14\text{ km}^2$) using literature-calibrated backscatter distributions ($\mathcal{N}_{\text{water}} = -21.5\text{ dB}, \mathcal{N}_{\text{land}} = -10.2\text{ dB}$) draped over the Copernicus EMS EMSR-724 boundary:

| Metric | Simulation Score | Scientific Formula | Calibration Reference |
|---|---|---|---|
| **Precision (PPV)** | **98.43%** | $TP / (TP + FP)$ | Copernicus EMS EMSR-724 Delineation Extent |
| **Recall (Sensitivity)** | **94.93%** | $TP / (TP + FN)$ | Copernicus EMS EMSR-724 Delineation Extent |
| **F1-Score** | **96.65%** | $2 \times (P \times R) / (P + R)$ | Harmonic mean of Precision & Recall |
| **Jaccard Index (IoU)** | **93.52%** | $TP / (TP + FP + FN)$ | Spatial Intersection over Union |
| **Overall Accuracy** | **97.79%** | $(TP + TN) / \text{Total Cells}$ | Full $1,000,000$ cell / $4,416.14\text{ km}^2$ WGS84 AOI |
| **True Positive Area** | **1,410.02 km²** | $319,288$ verified cells | Modeled specular water |
| **False Positive Area** | **22.46 km²** | $5,087$ specular non-water cells | Smooth aerodrome tarmac & calm sandbars |
| **False Negative Area** | **75.28 km²** | $17,046$ attenuated cells | Modeled sub-canopy concealed floodwater |

### 3.5 Data Fidelity Matrix: Real Spacecraft Telemetry vs. Calibrated Modeling
| System Component | Real Satellite Observation / Live Data | Calibrated Physics Engine | Academic Transparency |
|---|---|---|---|
| **NASA ASF DAAC Granules** | ✅ **100% Real Live REST API** (`api.daac.asf.alaska.edu`) | — | Queries real Sentinel-1 & NISAR granules, footprints & download URLs |
| **WKT Satellite Swath Footprints**| ✅ **100% Real Geographic Polygons** | — | Parsed from NASA WKT strings directly into Cesium 3D coordinates |
| **Orbital Dynamics** | ✅ **747 km Sun-Synchronous Orbit** | Keplarian ephemeris propagation | Matches true NISAR 98.4° inclination & 12-day repeat pass |
| **Raw SAR Processing Pipeline** | ✅ **Real Sentinel-1A Level-1 GRD** (`S1A_IW_GRDH_...20240706`) | `scripts/validate_real_sentinel1.py` | Proven empirical baseline against Copernicus EMSR-724 |
| **NISAR L-Band Model** | Calibrated to NISAR L-band specs | Synthetic Gaussian mixture ($\Delta\sigma^0 < -6.5\text{ dB}$) | Models L-band canopy penetration and bi-temporal change detection |

---

## 🏗️ 4. Architecture

```
┌────────────────────────────────────────────────────────┐
│                   3D Cesium WebGL Client               │
│  - 747km NISAR Spacecraft & Dynamic Swath Beam         │
│  - Real-time 3D Surface Heatmap (CesiumJS)             │
│  - Real NASA ASF Granule Footprint Polygons            │
│  - Multi-Mode Apache ECharts (Spectral, Rose, Forecast)│
└──────────────────────────▲─────────────────────────────┘
                           │ WebSockets & REST APIs
┌──────────────────────────┴─────────────────────────────┐
│                    FastAPI Backend                     │
│  - /api/analyze: Backscatter drop, coherence, hotspots │
│  - /api/nasa/search: Live NASA ASF DAAC Client         │
│  - /api/scenarios: Curated benchmark datasets          │
└──────────────────────────▲─────────────────────────────┘
                           │ Direct HTTP Requests
┌──────────────────────────┴─────────────────────────────┐
│       NASA Alaska Satellite Facility (ASF) DAAC        │
│  Endpoint: https://api.daac.asf.alaska.edu/services    │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 5. Quickstart & Installation

### Prerequisites
* Python 3.10+
* Modern Web Browser with WebGL 2.0 support (Chrome, Edge, Firefox, Brave)

### One-Command Launch
```bash
# Clone the repository
git clone https://github.com/Omkar-patil-270/SAR-Sentinel.git
cd SAR-Sentinel

# Install dependencies
pip install -r requirements.txt

# Launch application
python run.py
```
The server will initialize at `http://127.0.0.1:8000` and automatically open your default browser.

---

## 📁 6. Repository Structure
```
FINAL-DANCE/
├── backend/
│   ├── app.py              # FastAPI server & REST endpoints
│   ├── nasa_client.py      # Live NASA ASF DAAC API query engine
│   ├── sar_engine.py       # Radar backscatter, coherence & forecast algorithms
│   └── scenarios.py        # Benchmark disaster case studies
├── frontend/
│   ├── index.html          # Geospatial intelligence HUD layout
│   ├── styles.css          # Glassmorphism design system & HUD styling
│   └── app.js              # Cesium 3D Globe, ECharts & temporal scrubber
├── docs/
│   └── PITCH_DECK.md       # 7-Slide official capstone pitch presentation
├── NASA_SPACE_APPS_SUBMISSION.md  # Official submission dossier
├── run.py                  # One-click auto-launch script
└── requirements.txt        # Python package dependencies
```

---

## 📜 7. NASA Space Apps Challenge 2026 Submission
* **Challenge:** Dancing with the SARs
* **Project Team:** SAR Sentinel
* **Mission Station:** NISAR-01
* **Full Submission Paper:** [NASA_SPACE_APPS_SUBMISSION.md](NASA_SPACE_APPS_SUBMISSION.md)
* **Capstone Pitch Deck:** [docs/PITCH_DECK.md](docs/PITCH_DECK.md)
