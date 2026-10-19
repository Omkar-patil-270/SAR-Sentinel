// ==========================================================================
// SAR SENTINEL // 3D TACTICAL ORBITAL COMMAND ENGINE
// Powered by CesiumJS 3D WebGL Globe & Apache ECharts
// NASA Space Apps Challenge 2026: Dancing with the SARs
// ==========================================================================

// Cesium Ion Token (Imported from GeoVision Capstone)
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5MGEwNWUxMi1mNDAzLTRlNzAtOWQ3OS1kNGU3M2FmMTA1YzMiLCJpZCI6NDQ5OTEyLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODI2MjQyMTN9.QTBq75JiikYp9vfFJOc1AaclF2uJ5UITluP2rU5v6qw";

let viewer = null;
let satelliteEntity = null;
let radarBeamEntity = null;
let currentScenario = null;
let radarHeatmapEntity = null;
let targetBeaconEntity = null;
let echartInstance = null;

let autoRotate = true;
let beamActive = true;
let heatmapActive = true;
let audioEnabled = true;

// Web Audio API Sci-Fi Synthesizer
let audioCtx = null;
function playSciFiAudio(freq = 880, type = 'sine', duration = 0.08, gainVal = 0.04) {
  if (!audioEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

// 1. Initialize DOM
document.addEventListener('DOMContentLoaded', () => {
  startMissionClock();
  initCesiumGlobe();
  initECharts();
  loadScenarios();
  setupEventListeners();
});

// 2. Real-time Mission Clock (UTC with Milliseconds)
function startMissionClock() {
  const clockEl = document.getElementById('missionClock');
  function tick() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    const ms = String(now.getUTCMilliseconds()).padStart(3, '0');
    clockEl.textContent = `${y}.${m}.${d} ${hh}:${mm}:${ss}.${ms}`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// 3. Initialize 3D Cesium WebGL Globe
async function initCesiumGlobe() {
  try {
    let imagery;
    try {
      imagery = await Cesium.IonImageryProvider.fromAssetId(3);
    } catch {
      imagery = new Cesium.UrlTemplateImageryProvider({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      });
    }

    viewer = new Cesium.Viewer('cesiumContainer', {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      selectionIndicator: false,
      infoBox: false,
      skyAtmosphere: new Cesium.SkyAtmosphere(),
      contextOptions: { webgl: { preserveDrawingBuffer: true } }
    });

    // Atmospheric lighting and depth
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50000;
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 35000000;

    // CartoDB Voyager Labels Layer
    viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
    }));

    // Setup 3D NISAR Satellite Orbit & Swath Beam
    setupNisarSatellite();

    // Setup Auto-Orbit Spin Animation
    setupAutoRotateListener();

    // Initial camera view (Focused on India & Indian Ocean Basin)
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(88.0, 20.0, 9500000.0),
      duration: 2.5
    });

  } catch (err) {
    console.error('Cesium Init Error:', err);
  }
}

// 4. Setup 3D NISAR Satellite & Swath Radar Beam
function setupNisarSatellite() {
  let orbitAngle = 0;
  const altitude = 747000; // 747 km altitude

  // Satellite Model / Marker
  satelliteEntity = viewer.entities.add({
    name: "NISAR Satellite",
    position: new Cesium.CallbackProperty(() => {
      orbitAngle += 0.003;
      // Polar Sun-synchronous orbit simulation (inclination ~98.4°)
      const lat = Math.sin(orbitAngle) * 82.0;
      const lon = (orbitAngle * 45.0) % 360.0 - 180.0;
      return Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
    }, false),
    point: {
      pixelSize: 14,
      color: Cesium.Color.fromCssColorString('#00f0ff'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    },
    label: {
      text: "🛰️ NISAR-1 [L+S BAND]",
      font: "11px 'Share Tech Mono', monospace",
      fillColor: Cesium.Color.fromCssColorString('#00f0ff'),
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -12)
    }
  });

  // 3D Radar Swath Beam (Projecting from NISAR down to ground)
  radarBeamEntity = viewer.entities.add({
    name: "SAR Swath Beam",
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        if (!beamActive || !currentScenario) return [];
        const satPos = satelliteEntity.position.getValue(viewer.clock.currentTime);
        const groundPos = Cesium.Cartesian3.fromDegrees(currentScenario.lon, currentScenario.lat, 0);
        return satPos && groundPos ? [satPos, groundPos] : [];
      }, false),
      width: 2,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.35,
        taperPower: 0.1,
        color: Cesium.Color.fromCssColorString('#00f0ff')
      })
    }
  });
}

// 5. Setup Auto-Rotate Globe when Idle
function setupAutoRotateListener() {
  viewer.scene.postRender.addEventListener(() => {
    if (autoRotate && viewer.scene.camera) {
      viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.0008);
    }
  });

  // Pause rotation on user interaction
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(() => {
    autoRotate = false;
    updateAutoRotateUI();
  }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
}

// 6. 3D Procedural Radar Heatmap Canvas Generator (From GeoVision)
function generateRadarHeatmapCanvas(type = "flood", size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);

  if (type === "flood") {
    // Water Inundation: Deep Specular Blue -> Cyan -> Neon Crimson Delta
    grad.addColorStop(0, "rgba(255, 0, 85, 0.95)");
    grad.addColorStop(0.35, "rgba(255, 170, 0, 0.85)");
    grad.addColorStop(0.65, "rgba(0, 240, 255, 0.6)");
    grad.addColorStop(1, "rgba(0, 136, 255, 0)");
  } else if (type === "coastal") {
    // Coastal Erosion / Mangrove: Emerald -> Amber -> Crimson
    grad.addColorStop(0, "rgba(255, 0, 85, 0.95)");
    grad.addColorStop(0.4, "rgba(0, 255, 136, 0.75)");
    grad.addColorStop(0.8, "rgba(0, 240, 255, 0.35)");
    grad.addColorStop(1, "rgba(0, 240, 255, 0)");
  } else {
    // InSAR Glacial / Terrain: High-contrast interference fringes
    grad.addColorStop(0, "rgba(255, 0, 85, 0.95)");
    grad.addColorStop(0.25, "rgba(0, 240, 255, 0.85)");
    grad.addColorStop(0.5, "rgba(255, 170, 0, 0.7)");
    grad.addColorStop(0.75, "rgba(0, 255, 136, 0.45)");
    grad.addColorStop(1, "rgba(0, 136, 255, 0)");
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

// 7. Load Scenarios from Backend
async function loadScenarios() {
  const container = document.getElementById('scenarioList');
  try {
    const res = await fetch('/api/scenarios');
    const scenarios = await res.json();
    
    container.innerHTML = '';
    scenarios.forEach((sc, i) => {
      const card = document.createElement('div');
      card.className = `sc-pill ${i === 0 ? 'active' : ''}`;
      card.innerHTML = `
        <div class="sc-pill-title">${sc.title}</div>
        <div class="sc-pill-sub">
          <span>📍 ${sc.location_name}</span>
          <span class="sc-pill-tag">[${sc.category.split(' ')[0].toUpperCase()}]</span>
        </div>
      `;
      card.addEventListener('click', () => {
        playSciFiAudio(960, 'sine', 0.08);
        selectScenario(sc, card);
      });
      container.appendChild(card);
    });

    if (scenarios.length > 0) {
      selectScenario(scenarios[0], container.children[0]);
    }
  } catch (err) {
    container.innerHTML = '<div class="panel-intro">Telemetry offline.</div>';
  }
}

// 8. Select Scenario & Fly 3D Camera
function selectScenario(sc, cardElement) {
  currentScenario = sc;

  // Active pill style
  document.querySelectorAll('.sc-pill').forEach(c => c.classList.remove('active'));
  if (cardElement) cardElement.classList.add('active');

  // Update Dock Labels
  document.getElementById('activeScenarioLabel').textContent = sc.title.toUpperCase();
  document.getElementById('activeMissionLabel').textContent = 
    `MISSION: ${sc.mission.toUpperCase()} • BASELINE: ${sc.baseline_date} VS EVENT: ${sc.event_date}`;

  // Fly 3D Cesium Camera directly to coordinates
  if (viewer) {
    autoRotate = false;
    updateAutoRotateUI();
    
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(sc.lon, sc.lat, 280000.0),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-55),
        roll: 0.0
      },
      duration: 2.2
    });

    render3DOverlay(sc);
  }

  // Run backend calculation
  runAnalysis(sc.lat, sc.lon);

  // Discover NASA ASF granules
  queryNasaGranules(sc.lat, sc.lon);
}

// 9. Render 3D Radar Heatmap & Pulsing Beacons on Cesium Globe
function render3DOverlay(sc) {
  if (radarHeatmapEntity) viewer.entities.remove(radarHeatmapEntity);
  if (targetBeaconEntity) viewer.entities.remove(targetBeaconEntity);

  const canvas = generateRadarHeatmapCanvas(sc.category.toLowerCase().includes('flood') ? 'flood' : 'coastal');
  const span = 0.55;

  if (heatmapActive) {
    radarHeatmapEntity = viewer.entities.add({
      name: "3D SAR Inundation Heatmap",
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(sc.lon - span, sc.lat - span, sc.lon + span, sc.lat + span),
        material: new Cesium.ImageMaterialProperty({
          image: canvas,
          transparent: true
        }),
        height: 100
      }
    });
  }

  // Target Beacon Pin
  targetBeaconEntity = viewer.entities.add({
    name: "Sector Focus",
    position: Cesium.Cartesian3.fromDegrees(sc.lon, sc.lat, 1500),
    point: {
      pixelSize: 10,
      color: Cesium.Color.fromCssColorString('#ff0055'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    },
    label: {
      text: `🎯 ${sc.location_name.toUpperCase()}`,
      font: "12px 'Orbitron', monospace",
      fillColor: Cesium.Color.WHITE,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      pixelOffset: new Cesium.Cartesian2(0, -18)
    }
  });
}

// 10. Run SAR Change Detection
async function runAnalysis(lat, lon) {
  const analysisType = document.getElementById('analysisTypeSelect').value;
  const sensitivity = parseFloat(document.getElementById('sensitivitySlider').value);

  const targetLat = lat || (currentScenario ? currentScenario.lat : 26.35);
  const targetLon = lon || (currentScenario ? currentScenario.lon : 92.68);

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: targetLat,
        lon: targetLon,
        analysis_type: analysisType,
        sensitivity: sensitivity,
        delta_days: 30
      })
    });
    const result = await res.json();
    renderAnalysisResults(result);
  } catch (err) {
    console.error('Analysis error:', err);
  }
}

// 11. Render Results to KPI Cockpit & ECharts
function renderAnalysisResults(data) {
  document.getElementById('kpiBackscatter').innerHTML = `${data.backscatter_drop_db} <span class="unit">dB</span>`;
  document.getElementById('kpiArea').innerHTML = `${data.affected_area_sqkm.toLocaleString()} <span class="unit">km²</span>`;
  document.getElementById('kpiSeverity').textContent = `${data.severity} RISK DELTA`;
  document.getElementById('severityPill').textContent = `${data.severity} RISK`;
  document.getElementById('kpiCoherence').innerHTML = `${data.coherence_index} <span class="unit">γ</span>`;
  document.getElementById('kpiConfidence').innerHTML = `${data.confidence_score} <span class="unit">%</span>`;

  // Update ECharts
  if (echartInstance && data.histogram) {
    updateECharts(data.histogram);
  }
}

// 12. Initialize & Update Apache ECharts
function initECharts() {
  const dom = document.getElementById('radarEChart');
  echartInstance = echarts.init(dom, null, { renderer: 'canvas' });

  window.addEventListener('resize', () => {
    if (echartInstance) echartInstance.resize();
  });
}

function updateECharts(hist) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', textStyle: { fontFamily: 'Share Tech Mono' } },
    legend: {
      data: ['T-0 BASELINE', 'T-1 EVENT'],
      textStyle: { color: '#8aa0c4', fontFamily: 'Share Tech Mono', fontSize: 10 },
      top: 0
    },
    grid: { left: '8%', right: '5%', bottom: '15%', top: '22%' },
    xAxis: {
      type: 'category',
      data: hist.labels,
      axisLine: { lineStyle: { color: 'rgba(0, 240, 255, 0.2)' } },
      axisLabel: { color: '#455a7f', fontFamily: 'Share Tech Mono', fontSize: 9 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(0, 240, 255, 0.05)' } },
      axisLabel: { color: '#455a7f', fontFamily: 'Share Tech Mono', fontSize: 9 }
    },
    series: [
      {
        name: 'T-0 BASELINE',
        type: 'line',
        smooth: true,
        data: hist.baseline,
        itemStyle: { color: '#00f0ff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 240, 255, 0.45)' },
            { offset: 1, color: 'rgba(0, 240, 255, 0.0)' }
          ])
        }
      },
      {
        name: 'T-1 EVENT',
        type: 'line',
        smooth: true,
        data: hist.event,
        itemStyle: { color: '#ff0055' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 0, 85, 0.45)' },
            { offset: 1, color: 'rgba(255, 0, 85, 0.0)' }
          ])
        }
      }
    ]
  };
  echartInstance.setOption(option);
}

// 13. Query NASA ASF DAAC Granules
async function queryNasaGranules(lat, lon) {
  const container = document.getElementById('granulesContainer');
  container.innerHTML = '<div class="loading-state"><span class="pulsing-radar"></span> QUERYING NASA ASF ARCHIVE...</div>';

  const platform = document.getElementById('platformSelect').value;
  const maxResults = document.getElementById('maxGranulesSelect').value;
  const targetLat = lat || (currentScenario ? currentScenario.lat : 26.35);
  const targetLon = lon || (currentScenario ? currentScenario.lon : 92.68);

  try {
    const res = await fetch(`/api/nasa/search?platform=${platform}&lat=${targetLat}&lon=${targetLon}&max_results=${maxResults}`);
    const data = await res.json();

    container.innerHTML = '';
    if (!data.granules || data.granules.length === 0) {
      container.innerHTML = '<div class="loading-state">No radar granules found in direct footprint.</div>';
      return;
    }

    document.getElementById('granulesCountBadge').textContent = `${data.granules.length} GRANULES`;

    data.granules.forEach(g => {
      const tile = document.createElement('div');
      tile.className = 'granule-chip';
      tile.innerHTML = `
        <div class="granule-header" title="${g.granule_name}">📡 ${g.granule_name}</div>
        <div class="granule-footer">
          <span>${g.startTime ? g.startTime.split('T')[0] : '2024'} | ${g.polarization || 'Dual-Pol'}</span>
          <a href="${g.downloadUrl || '#'}" target="_blank" class="granule-download">DOWNLOAD DATA ↗</a>
        </div>
      `;
      container.appendChild(tile);
    });
  } catch (err) {
    container.innerHTML = '<div class="loading-state">NASA API temporarily busy.</div>';
  }
}

// 14. Event Handlers
function setupEventListeners() {
  // Audio toggle
  document.getElementById('audioToggleBtn').addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    document.getElementById('audioStatusText').textContent = audioEnabled ? 'SFX: ON' : 'SFX: OFF';
    if (audioEnabled) playSciFiAudio(1100, 'sine', 0.1);
  });

  // Sensitivity slider
  document.getElementById('sensitivitySlider').addEventListener('input', (e) => {
    document.getElementById('sensitivityVal').textContent = `${e.target.value}x`;
  });

  // Run Analysis
  document.getElementById('runAnalysisBtn').addEventListener('click', () => {
    playSciFiAudio(750, 'square', 0.12);
    if (currentScenario) runAnalysis(currentScenario.lat, currentScenario.lon);
  });

  // Query NASA
  document.getElementById('queryNasaBtn').addEventListener('click', () => {
    playSciFiAudio(880, 'triangle', 0.08);
    if (currentScenario) queryNasaGranules(currentScenario.lat, currentScenario.lon);
  });

  // 3D Auto-Rotate Button
  document.getElementById('autoRotateBtn').addEventListener('click', () => {
    autoRotate = !autoRotate;
    updateAutoRotateUI();
    playSciFiAudio(600, 'sine', 0.06);
  });

  // 3D Satellite Swath Beam Toggle
  document.getElementById('satelliteBeamBtn').addEventListener('click', () => {
    beamActive = !beamActive;
    document.getElementById('beamStatusText').textContent = beamActive ? 'ACTIVE' : 'MUTED';
    document.getElementById('satelliteBeamBtn').classList.toggle('active', beamActive);
    playSciFiAudio(700, 'sine', 0.06);
  });

  // 3D Heatmap Toggle
  document.getElementById('heatmapToggleBtn').addEventListener('click', () => {
    heatmapActive = !heatmapActive;
    document.getElementById('heatmapStatusText').textContent = heatmapActive ? 'ON' : 'OFF';
    document.getElementById('heatmapToggleBtn').classList.toggle('active', heatmapActive);
    if (currentScenario) render3DOverlay(currentScenario);
    playSciFiAudio(800, 'sine', 0.06);
  });

  // Report Modal
  const modal = document.getElementById('reportModal');
  document.getElementById('exportReportBtn').addEventListener('click', () => {
    playSciFiAudio(1200, 'sine', 0.14);
    generateReport();
    modal.classList.remove('hidden');
  });

  document.getElementById('closeReportBtn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

function updateAutoRotateUI() {
  const btn = document.getElementById('autoRotateBtn');
  const txt = document.getElementById('autoRotateText');
  txt.textContent = autoRotate ? 'ACTIVE' : 'PAUSED';
  btn.classList.toggle('active', autoRotate);
}

// 15. Generate NASA Mission Report
function generateReport() {
  const sc = currentScenario || { title: "Custom Observation", location_name: "Global", metrics: {} };
  const backscatter = document.getElementById('kpiBackscatter').innerText;
  const area = document.getElementById('kpiArea').innerText;
  const coherence = document.getElementById('kpiCoherence').innerText;
  const confidence = document.getElementById('kpiConfidence').innerText;

  document.getElementById('reportBody').innerHTML = `
    <div>
      <div style="color: #00f0ff; font-family: 'Share Tech Mono', monospace; font-size: 0.85rem; margin-bottom: 8px;">
        MISSION BRIEFING // NASA SPACE APPS CHALLENGE 2026 // DANCING WITH THE SARS
      </div>
      <h2 style="color: #fff; font-family: 'Orbitron', monospace; font-size: 1.25rem; margin-bottom: 12px;">
        PROJECT: SAR SENTINEL (COMMANDER: OMKAR RAMESH PATIL)
      </h2>
      <hr style="border: 0; border-top: 1px solid rgba(0, 240, 255, 0.25); margin-bottom: 14px;">
      
      <p style="margin-bottom: 6px;"><strong>OBSERVATION SECTOR:</strong> ${sc.location_name} (${sc.title})</p>
      <p style="margin-bottom: 6px;"><strong>MISSION DATASET:</strong> NASA-ISRO Synthetic Aperture Radar (NISAR) & Sentinel-1</p>
      <p style="margin-bottom: 12px;"><strong>PHYSICAL MECHANISM:</strong> Specular backscatter drop ($\Delta \sigma^0$) and InSAR phase decorrelation</p>
      
      <div style="background: rgba(0, 240, 255, 0.08); border: 1px solid rgba(0, 240, 255, 0.25); padding: 14px; border-radius: 4px; margin: 14px 0;">
        <h4 style="color: #00ff88; font-family: 'Share Tech Mono', monospace; margin-bottom: 8px;">QUANTITATIVE OBSERVATION RESULTS:</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: 'Share Tech Mono', monospace; font-size: 0.95rem;">
          <div>• Δ BACKSCATTER: <strong style="color: #ff0055;">${backscatter}</strong></div>
          <div>• ALTERED SURFACE: <strong style="color: #ffaa00;">${area}</strong></div>
          <div>• COHERENCE INDEX: <strong style="color: #00f0ff;">${coherence}</strong></div>
          <div>• ALGORITHM CONFIDENCE: <strong style="color: #00ff88;">${confidence}</strong></div>
        </div>
      </div>

      <p style="color: #8aa0c4; font-size: 0.85rem; font-family: 'Share Tech Mono', monospace; margin-top: 14px;">
        Generated by <strong>SAR SENTINEL 3D COMMAND ENGINE</strong> on ${new Date().toUTCString()}. Formulated for submission to NASA Space Apps 2026 Global Evaluation Committee.
      </p>
    </div>
  `;
}
