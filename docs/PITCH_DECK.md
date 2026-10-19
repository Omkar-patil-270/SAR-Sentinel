# 🚀 SAR SENTINEL: 7-Slide Capstone & Hackathon Pitch Deck
**NASA Space Apps Challenge 2026 // Dancing with the SARs**

---

### Slide 1: Title & Vision
* **Project Name:** SAR SENTINEL
* **Tagline:** Autonomous Radar Earth Observation Intelligence for Global Flood and Coastal Dynamics
* **Challenge:** NASA Space Apps Challenge 2026 — *Dancing with the SARs*
* **Core Technology:** NASA-ISRO NISAR (L-band) + Sentinel-1 (C-band) + NASA ASF DAAC Archive + 3D Cesium WebGL

---

### Slide 2: The Problem — The Cloud Blindspot
* **Optical Satellites Fail in Crises:** Severe floods, cyclones, and glacial bursts happen during dense cloud cover, heavy monsoonal rain, or at night. Optical cameras (Landsat, Sentinel-2) see only white cloud tops.
* **The Humanitarian Cost:** Disaster relief teams wait days for cloudless skies before knowing where bridges have broken, roads are submerged, or riverbanks have ruptured.

---

### Slide 3: The Solution — Penetrating Clouds with Active Radar
* **Active Microwave Sensing:** Synthetic Aperture Radar emits its own electromagnetic pulses at microwave wavelengths (L-band 24 cm, C-band 5.5 cm) that cut effortlessly through storm clouds, smoke, and complete darkness.
* **Autonomous Pipeline:**
  1. Direct query of **NASA Alaska Satellite Facility (ASF) DAAC**.
  2. Compute **Backscatter Drop ($\Delta\sigma^0$)** indicating specular water surfaces.
  3. Map **Interferometric Coherence ($\gamma$)** for ground stability.
  4. Project onto a **Photorealistic 3D Cesium Earth** in real time.

---

### Slide 4: Scientific & Mathematical Foundation
1. **Specular Water Attenuation:**
   $$\Delta\sigma^0 = \sigma_{\text{post}}^0 - \sigma_{\text{pre}}^0 < -6.5\text{ dB}$$
   Smooth water directs radar pulses away into space, creating high-contrast dark pixels.
2. **InSAR Phase Coherence:**
   $$\gamma = \frac{|\langle s_1 s_2^* \rangle|}{\sqrt{\langle |s_1|^2 \rangle \langle |s_2|^2 \rangle}}$$
   Drops from 0.85 (dry terrain) to 0.15 (flooded vegetation/soil decorrelation).
3. **Polarimetric Radar Rose:** Quad-pol breakdown across $S_{HH}, S_{HV}, S_{VV}, S_{VH}$.

---

### Slide 5: System Features & Interactive Capabilities
* **Live 3D WebGL Globe:** NISAR satellite orbiting at 747 km altitude with a dynamic radar beam down to Earth.
* **Real NASA Granule Footprints:** Draws actual spatial bounding boxes of Sentinel-1 & NISAR observations returned live from NASA's archive.
* **Temporal SAR Time-Scrubber:** Scrub from Day -15 (Baseline) to Day 0 (Disaster Peak) to Day +15 (Recession) with real-time on-globe alpha interpolation.
* **Multi-View Radar Analytics:** Multi-mode ECharts (Spectral Curve, Polar Rose, 60-Day ML Forecast).

---

### Slide 6: Real-World Case Studies & Validation
* **Brahmaputra River Basin (Assam, India):** Detected $1,420\text{ km}^2$ of inundated terrain, $-5.8\text{ dB}$ attenuation, and high-risk flood evacuation alerts.
* **Sundarbans Delta (India / Bangladesh):** Monitored tidal mangrove erosion and storm surges over $680\text{ km}^2$.
* **Himalayan Glacial Lake (Sikkim):** Rapid coherence loss alert for sudden moraine breach risk.
* **Kerala Backwaters:** Monsoon estuary flood monitoring.

---

### Slide 7: Scalability & Future Roadmap
* **NISAR Launch Deployment:** Direct ingestion of NISAR HDF5 products upon launch into cloud processing buckets.
* **Edge Computing:** Automated disaster response vector notifications pushed directly to disaster management authorities.
* **Resume & Impact:** A production-grade, verifiable NASA Space Apps Capstone submission built on official NASA DAAC APIs.
