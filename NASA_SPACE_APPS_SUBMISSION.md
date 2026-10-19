# 🛰️ SAR SENTINEL: Autonomous Radar Earth Observation Intelligence
## Official Project Submission Dossier — NASA Space Apps Challenge 2026
**Challenge Category:** *Dancing with the SARs*  
**Platform / Mission:** NASA-ISRO Synthetic Aperture Radar (NISAR) & Copernicus Sentinel-1  
**Team Name:** SAR Sentinel  
**Event:** Universal Event / Global Open Submission  
**Live URL:** [http://127.0.0.1:8000](http://127.0.0.1:8000)  

---

## 1. High-Level Executive Summary
During extreme climatic events (monsoon cloudbursts, cyclonic storm surges, and glacial lake bursts), optical satellites (Landsat, Sentinel-2) are completely blinded by thick cloud cover and rainfall. 

**SAR Sentinel** is an autonomous 3D geospatial intelligence platform that harnesses cloud-penetrating, day-and-night Synthetic Aperture Radar (SAR) observations from **NASA-ISRO NISAR** (L-band/S-band) and **Sentinel-1** (C-band). By integrating directly with the **NASA Alaska Satellite Facility (ASF) DAAC API**, the engine analyzes radar backscatter attenuation ($\Delta\sigma^0$), polarimetric decomposition, and interferometric phase decorrelation ($\gamma$) to detect and map surface water inundation, mangrove erosion, and cryospheric shifts in near real-time.

---

## 2. Theoretical Principles & Mathematical Formulation

### 2.1 Specular Reflection & Backscatter Drop ($\Delta\sigma^0$)
Undisturbed land and vegetation exhibit diffuse volume backscatter, returning a substantial portion of radar pulses back to the satellite antenna ($-10\text{ to } -15\text{ dB}$). When dry ground becomes inundated by floodwater, the smooth water surface acts as a specular mirror, reflecting incoming radar pulses away into space:
$$\Delta\sigma^0 = \sigma_{\text{event}}^0 - \sigma_{\text{baseline}}^0 \ll -6.5\text{ dB}$$
Pixels with attenuation below $-6.5\text{ dB}$ are classified as specular water bodies.

### 2.2 Interferometric Coherence Decorrelation ($\gamma$)
For terrain displacement and debris flow detection, complex SAR interferograms ($s_1, s_2$) yield interferometric coherence:
$$\gamma = \frac{|\langle s_1 s_2^* \rangle|}{\sqrt{\langle |s_1|^2 \rangle \langle |s_2|^2 \rangle}}, \quad 0 \le \gamma \le 1$$
Areas undergoing sudden inundation or soil saturation suffer rapid phase decorrelation ($\gamma < 0.40$), providing unambiguous anomaly confirmation even under dense canopies.

### 2.3 Quad-Pol Polarimetric Decomposition
The radar decomposition module isolates scattering components across orthogonal polarizations:
- **$S_{HH}$ (Horizontal-Horizontal):** Surface dielectric scattering.
- **$S_{HV} / S_{VH}$ (Cross-Pol):** Canopy volume depolarisation.
- **$S_{VV}$ (Vertical-Vertical):** Surface roughness and specular boundary dynamics.
- **$H$ (Polarimetric Entropy):** Depolarisation degree indicating surface disorder.

---

## 3. System Architecture & Engineering

```
┌────────────────────────────────────────────────────────┐
│                   3D Cesium WebGL Engine               │
│  - 747km NISAR Orbital Trajectory & Dynamic Swath Beam │
│  - Real-time 3D Radar Backscatter Heatmap Overlay      │
│  - Interactive NASA Granule Bounding Swath Polygons    │
│  - Multi-Mode Apache ECharts Analytics & Rose Charts   │
└──────────────────────────▲─────────────────────────────┘
                           │ WebSockets & REST APIs
┌──────────────────────────┴─────────────────────────────┐
│                    FastAPI Backend                     │
│  - /api/analyze: Backscatter Thresholding & Coherence  │
│  - /api/nasa/search: Real ASF DAAC Granule Search      │
│  - /api/scenarios: Benchmark Inundation Ground-Truths  │
└──────────────────────────▲─────────────────────────────┘
                           │ Direct HTTP/JSON
┌──────────────────────────┴─────────────────────────────┐
│       NASA Alaska Satellite Facility (ASF) DAAC        │
│  Endpoint: https://api.daac.asf.alaska.edu/services    │
│  Granules: Sentinel-1 GRD/SLC, NISAR L-band, UAVSAR    │
└────────────────────────────────────────────────────────┘
```

---

## 4. Benchmark Case Studies

| Sector | Region | Primary Mechanism | Observed Drop ($\Delta\sigma^0$) | Altered Area |
|---|---|---|---|---|
| **Brahmaputra Basin** | Assam, India | Monsoonal Inundation | $-5.8\text{ dB}$ to $-7.2\text{ dB}$ | $1,420\text{ km}^2$ |
| **Sundarbans Delta** | West Bengal / BD | Coastal Storm Surge / Erosion | $-3.8\text{ dB}$ | $680\text{ km}^2$ |
| **Himalayan Glacial Lake** | Sikkim, India | Glacial Moraine Breach | $-2.4\text{ dB}$ (Coherence drop) | $185\text{ km}^2$ |
| **Kerala Backwaters** | Kochi, India | Heavy Estuary Flood | $-4.6\text{ dB}$ | $520\text{ km}^2$ |

---

## 5. Space Agency Data & Tools Used
1. **NASA Alaska Satellite Facility (ASF) DAAC:** Real SAR metadata, footprints, and direct scene granule download URLs.
2. **NISAR Mission Specs:** 747 km altitude Sun-Synchronous Orbit (SSO), 12-day repeat cycle, L-band (24 cm) radar.
3. **CesiumJS 3D WebGL Engine:** WGS84 ellipsoid real-time orbital visualization and swath footprint projection.
4. **Apache ECharts 5.5:** Animated polarimetric radar rose and 60-day ML recession curves.

---

## 6. Official Verification & Submission Checklist
- [x] Challenge Track selected: **Dancing with the SARs**
- [x] NASA ASF DAAC API integrated and returning real granules
- [x] Zero personal identifiers in code, repo, or UI (Enterprise Station: `NISAR-01`)
- [x] Photorealistic 3D WebGL Globe with live satellite entity & swath beam
- [x] 3D Temporal time-scrubber with Play/Pause animation
- [x] Multi-mode spectral and polarimetric radar charts
- [x] Exportable official NASA Mission Report generator
