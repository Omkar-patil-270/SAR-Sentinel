// ==========================================================================
// SAR SENTINEL // MODERN 3D GEOSPATIAL INTELLIGENCE CLIENT
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
let currentChartMode = 'spectral';
let lastAnalysisResult = null;

let currentTemporalIntensity = 1.0;
let temporalDay = 0;
let temporalPlaying = false;
let temporalInterval = null;

let granuleEntities = [];
let activeGranuleEntity = null;

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
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    const ms = String(now.getUTCMilliseconds()).padStart(3, '0');
    clockEl.textContent = `${hh}:${mm}:${ss}.${ms}`;
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
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 30000;
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 35000000;

    // CartoDB Voyager Clean Labels Layer
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
      const lat = Math.sin(orbitAngle) * 82.0;
      const lon = (orbitAngle * 45.0) % 360.0 - 180.0;
      return Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
    }, false),
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString('#00d4ff'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    },
    label: {
      text: "🛰️ NISAR-1 [L+S BAND]",
      font: "11px 'JetBrains Mono', monospace",
      fillColor: Cesium.Color.fromCssColorString('#00d4ff'),
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -12)
    }
  });

  // 3D Radar Swath Beam
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
        color: Cesium.Color.fromCssColorString('#00d4ff')
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

// 6. 3D Procedural Radar Heatmap Canvas Generator
function generateRadarHeatmapCanvas(type = "flood", size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);

  if (type === "flood") {
    grad.addColorStop(0, "rgba(244, 63, 94, 0.95)");
    grad.addColorStop(0.35, "rgba(245, 158, 11, 0.85)");
    grad.addColorStop(0.65, "rgba(0, 212, 255, 0.6)");
    grad.addColorStop(1, "rgba(0, 102, 255, 0)");
  } else if (type === "coastal") {
    grad.addColorStop(0, "rgba(244, 63, 94, 0.95)");
    grad.addColorStop(0.4, "rgba(16, 185, 129, 0.75)");
    grad.addColorStop(0.8, "rgba(0, 212, 255, 0.35)");
    grad.addColorStop(1, "rgba(0, 212, 255, 0)");
  } else {
    grad.addColorStop(0, "rgba(244, 63, 94, 0.95)");
    grad.addColorStop(0.25, "rgba(0, 212, 255, 0.85)");
    grad.addColorStop(0.5, "rgba(245, 158, 11, 0.7)");
    grad.addColorStop(0.75, "rgba(16, 185, 129, 0.45)");
    grad.addColorStop(1, "rgba(0, 102, 255, 0)");
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

// 7. Load Scenarios from Backend & Render Quick Nav Tabs
async function loadScenarios() {
  const navContainer = document.getElementById('scenarioQuickNav');
  try {
    const res = await fetch('/api/scenarios');
    const scenarios = await res.json();
    
    navContainer.innerHTML = '';
    scenarios.forEach((sc, i) => {
      const btn = document.createElement('button');
      btn.className = `target-pill-btn ${i === 0 ? 'active' : ''}`;
      
      let icon = "📍";
      if (sc.category.toLowerCase().includes("flood")) icon = "🌊";
      else if (sc.category.toLowerCase().includes("coastal")) icon = "🌿";
      else if (sc.category.toLowerCase().includes("glacial")) icon = "🏔️";
      else icon = "🌴";

      btn.innerHTML = `${icon} ${sc.title.split(' ')[0]} ${sc.location_name.split(',')[0]}`;
      btn.addEventListener('click', () => {
        selectScenario(sc, btn);
      });
      navContainer.appendChild(btn);
    });

    if (scenarios.length > 0) {
      selectScenario(scenarios[0], navContainer.children[0]);
    }
  } catch (err) {
    navContainer.innerHTML = '<span class="t-label">Telemetry Offline</span>';
  }
}

// 8. Select Scenario & Fly 3D Camera
function selectScenario(sc, buttonElement) {
  currentScenario = sc;

  // Active pill style
  document.querySelectorAll('.target-pill-btn').forEach(b => b.classList.remove('active'));
  if (buttonElement) buttonElement.classList.add('active');

  // Update Left Banner Information
  document.getElementById('bannerTitle').textContent = sc.title;
  document.getElementById('bannerCategory').textContent = sc.category.toUpperCase();
  document.getElementById('bannerCoords').textContent = `${sc.lat}° N, ${sc.lon}° E`;
  document.getElementById('bannerDesc').textContent = sc.description;

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

// 9. Render 3D Radar Heatmap & Target Marker on Cesium Globe
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
          transparent: true,
          color: new Cesium.CallbackProperty(() => {
            return Cesium.Color.WHITE.withAlpha(Math.max(0.04, currentTemporalIntensity * 0.88));
          }, false)
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
      pixelSize: 8,
      color: Cesium.Color.fromCssColorString('#f43f5e'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    },
    label: {
      text: `📍 ${sc.location_name.toUpperCase()}`,
      font: "12px 'Inter', sans-serif",
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

// 11. Render Results to KPI Grid & ECharts
// 11. Render Results to KPI Grid & Multi-Mode ECharts
function renderAnalysisResults(data) {
  lastAnalysisResult = data;

  document.getElementById('kpiBackscatter').innerHTML = `${data.backscatter_drop_db} <span class="u">dB</span>`;
  document.getElementById('kpiArea').innerHTML = `${data.affected_area_sqkm.toLocaleString()} <span class="u">km²</span>`;
  document.getElementById('kpiSeverity').textContent = `${data.severity} Risk`;
  document.getElementById('kpiCoherence').innerHTML = `${data.coherence_index} <span class="u">γ</span>`;
  document.getElementById('kpiConfidence').innerHTML = `${data.confidence_score} <span class="u">%</span>`;

  // Update Footer Stats
  const statMetricEl = document.getElementById('chartStatMetric');
  if (statMetricEl) statMetricEl.textContent = `${data.backscatter_drop_db} dB`;
  const statPhaseEl = document.getElementById('chartStatPhase');
  if (statPhaseEl) {
    statPhaseEl.textContent = data.severity === 'HIGH' || data.severity === 'SEVERE' ? '28 Days' : (data.severity === 'CRITICAL' ? '42 Days' : '14 Days');
  }

  // Render active ECharts mode
  renderActiveChart();
}

// 12. Initialize & Update Multi-Mode Apache ECharts
function initECharts() {
  const dom = document.getElementById('radarEChart');
  echartInstance = echarts.init(dom, null, { renderer: 'canvas' });

  window.addEventListener('resize', () => {
    if (echartInstance) echartInstance.resize();
  });
}

function renderActiveChart() {
  if (!echartInstance || !lastAnalysisResult) return;

  const data = lastAnalysisResult;
  echartInstance.clear();

  if (currentChartMode === 'spectral') {
    // Mode 1: Spectral Backscatter Density with Annotated Detection Threshold
    const titleEl = document.getElementById('chartMainTitle');
    if (titleEl) titleEl.textContent = 'SPECTRAL BACKSCATTER (σ⁰)';
    const subTagEl = document.getElementById('chartSubTag');
    if (subTagEl) subTagEl.textContent = 'Dual-Pol VV/VH Specular Attenuation';

    const hist = data.histogram || {
      labels: ["-18dB", "-15dB", "-12dB", "-9dB", "-6dB", "-3dB", "0dB", "+3dB"],
      baseline: [4, 10, 26, 48, 34, 16, 6, 2],
      event: [28, 42, 38, 18, 12, 7, 3, 1]
    };

    const option = {
      backgroundColor: 'transparent',
      animationDuration: 650,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10, 16, 30, 0.95)',
        borderColor: 'rgba(0, 212, 255, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#f1f5f9', fontFamily: 'JetBrains Mono', fontSize: 11 },
        formatter: (params) => {
          let tip = `<div style="font-weight:700;margin-bottom:4px;color:#00d4ff;">${params[0].axisValue} Bin</div>`;
          params.forEach(p => {
            tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
              <span>${p.seriesName}: <b>${p.value}% pixels</b></span>
            </div>`;
          });
          return tip;
        }
      },
      legend: {
        data: ['T-0 Baseline', 'T-1 Event'],
        textStyle: { color: '#94a3b8', fontFamily: 'Inter', fontSize: 10 },
        top: 0
      },
      grid: { left: '8%', right: '5%', bottom: '15%', top: '22%' },
      xAxis: {
        type: 'category',
        data: hist.labels,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.15)' } },
        axisLabel: { color: '#94a3b8', fontFamily: 'JetBrains Mono', fontSize: 9 }
      },
      yAxis: {
        type: 'value',
        name: '% Pixels',
        nameTextStyle: { color: '#64748b', fontSize: 8, padding: [0, 0, 0, 8] },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono', fontSize: 9 }
      },
      series: [
        {
          name: 'T-0 Baseline',
          type: 'line',
          smooth: true,
          data: hist.baseline,
          itemStyle: { color: '#00d4ff' },
          lineStyle: { width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 212, 255, 0.45)' },
              { offset: 1, color: 'rgba(0, 212, 255, 0.0)' }
            ])
          }
        },
        {
          name: 'T-1 Event',
          type: 'line',
          smooth: true,
          data: hist.event,
          itemStyle: { color: '#f43f5e' },
          lineStyle: { width: 2 },
          markLine: {
            symbol: 'none',
            data: [
              {
                xAxis: '-6dB',
                lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 },
                label: {
                  formatter: 'Water (-6.5 dB)',
                  position: 'middle',
                  color: '#f59e0b',
                  fontSize: 8,
                  fontFamily: 'JetBrains Mono'
                }
              }
            ]
          },
          markPoint: {
            data: [
              { type: 'max', name: 'Peak Anomaly', symbolSize: 26, itemStyle: { color: '#f43f5e' } }
            ]
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(244, 63, 94, 0.45)' },
              { offset: 1, color: 'rgba(244, 63, 94, 0.0)' }
            ])
          }
        }
      ]
    };
    echartInstance.setOption(option, true);

  } else if (currentChartMode === 'polar') {
    // Mode 2: Polarimetric Radar Rose (Quad-Pol Decomposition)
    const titleEl = document.getElementById('chartMainTitle');
    if (titleEl) titleEl.textContent = 'POLARIMETRIC RADAR ROSE';
    const subTagEl = document.getElementById('chartSubTag');
    if (subTagEl) subTagEl.textContent = 'Quad-Pol Decomposition (HH/HV/VV/γ)';

    const polar = data.polarimetric || {
      indicators: [
        { name: 'HH (Surface)', max: 100 },
        { name: 'HV (Volume)', max: 100 },
        { name: 'VV (Roughness)', max: 100 },
        { name: 'VH (Cross-Pol)', max: 100 },
        { name: 'γ (Coherence)', max: 100 },
        { name: 'H (Entropy)', max: 100 }
      ],
      baseline: [82, 74, 80, 68, 86, 28],
      event: [22, 14, 28, 12, 38, 75]
    };

    const option = {
      backgroundColor: 'transparent',
      animationDuration: 650,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(10, 16, 30, 0.95)',
        borderColor: 'rgba(0, 212, 255, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#f1f5f9', fontFamily: 'JetBrains Mono', fontSize: 11 }
      },
      legend: {
        data: ['Baseline State', 'Radar Anomaly'],
        textStyle: { color: '#94a3b8', fontFamily: 'Inter', fontSize: 10 },
        top: 0
      },
      radar: {
        indicator: polar.indicators,
        shape: 'polygon',
        center: ['50%', '56%'],
        radius: '62%',
        axisName: {
          color: '#94a3b8',
          fontFamily: 'JetBrains Mono',
          fontSize: 8.5
        },
        splitLine: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(255,255,255,0.01)', 'rgba(0, 212, 255, 0.03)']
          }
        },
        axisLine: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.12)' }
        }
      },
      series: [
        {
          name: 'Polarimetric Scattering',
          type: 'radar',
          data: [
            {
              value: polar.baseline,
              name: 'Baseline State',
              itemStyle: { color: '#00d4ff' },
              areaStyle: { color: 'rgba(0, 212, 255, 0.25)' },
              lineStyle: { width: 1.8 }
            },
            {
              value: polar.event,
              name: 'Radar Anomaly',
              itemStyle: { color: '#f43f5e' },
              areaStyle: { color: 'rgba(244, 63, 94, 0.35)' },
              lineStyle: { width: 2 }
            }
          ]
        }
      ]
    };
    echartInstance.setOption(option, true);

  } else if (currentChartMode === 'forecast') {
    // Mode 3: 60-Day ML Temporal Trend & Water Drainage Recovery
    const titleEl = document.getElementById('chartMainTitle');
    if (titleEl) titleEl.textContent = '60-DAY ML RECESSION FORECAST';
    const subTagEl = document.getElementById('chartSubTag');
    if (subTagEl) subTagEl.textContent = 'Inundation Drainage & Surface Recovery';

    const fc = data.forecast || {
      timeline: ["Day -20", "Day -10", "T-0 Peak", "Day +5", "Day +10", "Day +15", "Day +20", "Day +30"],
      observed: [-11.1, -11.4, -18.2, null, null, null, null, null],
      forecast: [null, null, -18.2, -16.4, -14.8, -13.5, -12.1, -11.2],
      confidence_upper: [null, null, -17.4, -15.5, -13.9, -12.5, -11.0, -10.2],
      confidence_lower: [null, null, -19.0, -17.3, -15.7, -14.5, -13.2, -12.2]
    };

    const option = {
      backgroundColor: 'transparent',
      animationDuration: 650,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10, 16, 30, 0.95)',
        borderColor: 'rgba(0, 212, 255, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#f1f5f9', fontFamily: 'JetBrains Mono', fontSize: 11 },
        formatter: (params) => {
          let tip = `<div style="font-weight:700;margin-bottom:4px;color:#10b981;">${params[0].axisValue}</div>`;
          params.forEach(p => {
            if (p.value !== null && p.value !== undefined) {
              tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
                <span>${p.seriesName}: <b>${p.value} dB</b></span>
              </div>`;
            }
          });
          return tip;
        }
      },
      legend: {
        data: ['Historic SAR', 'ML Forecast', 'Confidence ±95%'],
        textStyle: { color: '#94a3b8', fontFamily: 'Inter', fontSize: 10 },
        top: 0
      },
      grid: { left: '10%', right: '5%', bottom: '15%', top: '22%' },
      xAxis: {
        type: 'category',
        data: fc.timeline,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.15)' } },
        axisLabel: { color: '#94a3b8', fontFamily: 'JetBrains Mono', fontSize: 8.5 }
      },
      yAxis: {
        type: 'value',
        name: 'σ⁰ (dB)',
        nameTextStyle: { color: '#64748b', fontSize: 9 },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
        axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono', fontSize: 9 }
      },
      series: [
        {
          name: 'Historic SAR',
          type: 'line',
          data: fc.observed,
          itemStyle: { color: '#00d4ff' },
          lineStyle: { width: 2.5 },
          symbolSize: 6
        },
        {
          name: 'ML Forecast',
          type: 'line',
          data: fc.forecast,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2, type: 'dashed' },
          symbolSize: 6
        },
        {
          name: 'Confidence ±95%',
          type: 'line',
          data: fc.confidence_upper,
          lineStyle: { opacity: 0 },
          stack: 'confidence-band',
          symbol: 'none'
        },
        {
          name: 'Confidence ±95%',
          type: 'line',
          data: fc.confidence_lower,
          lineStyle: { opacity: 0 },
          areaStyle: { color: 'rgba(16, 185, 129, 0.18)' },
          stack: 'confidence-band',
          symbol: 'none'
        }
      ]
    };
    echartInstance.setOption(option, true);
  }
}

// 13. Query NASA ASF DAAC Granules & Render 3D Swath Footprints
async function queryNasaGranules(lat, lon) {
  const container = document.getElementById('granulesContainer');
  container.innerHTML = '<div class="granule-loading">Querying NASA Alaska Satellite Facility...</div>';

  const platform = document.getElementById('platformSelect').value;
  const maxResults = document.getElementById('maxGranulesSelect').value;
  const targetLat = lat || (currentScenario ? currentScenario.lat : 26.35);
  const targetLon = lon || (currentScenario ? currentScenario.lon : 92.68);

  try {
    const res = await fetch(`/api/nasa/search?platform=${platform}&lat=${targetLat}&lon=${targetLon}&max_results=${maxResults}`);
    const data = await res.json();

    container.innerHTML = '';
    clearGranuleFootprints();

    if (!data.granules || data.granules.length === 0) {
      container.innerHTML = '<div class="granule-loading">No radar granules found in direct footprint.</div>';
      return;
    }

    document.getElementById('granulesCountBadge').textContent = `${data.granules.length} FOUND`;

    // Render 3D Swath Footprints directly on Cesium globe
    renderGranuleFootprints(data.granules);

    data.granules.forEach((g, idx) => {
      const row = document.createElement('div');
      row.className = 'granule-row';
      row.innerHTML = `
        <div class="granule-name-text" title="${g.granule_name}">📡 ${g.granule_name}</div>
        <div class="granule-foot-row">
          <span>${g.startTime ? g.startTime.split('T')[0] : '2024'} • ${g.polarization || 'Dual-Pol'}</span>
          <div class="granule-actions">
            <button class="granule-swath-tag" data-idx="${idx}">📍 3D Swath</button>
            <a href="${g.downloadUrl || '#'}" target="_blank" class="granule-dl-link">Download ↗</a>
          </div>
        </div>
      `;

      row.querySelector('.granule-swath-tag').addEventListener('click', (e) => {
        e.stopPropagation();
        focusGranuleFootprint(idx);
      });

      row.addEventListener('click', () => {
        focusGranuleFootprint(idx);
      });

      container.appendChild(row);
    });
  } catch (err) {
    container.innerHTML = '<div class="granule-loading">NASA API connection temporarily busy.</div>';
  }
}

// 14. Parse WKT Footprints and Draw on 3D Cesium Globe
function parseWktPolygon(wkt) {
  if (!wkt || typeof wkt !== 'string' || !wkt.toUpperCase().includes('POLYGON')) return null;
  const match = wkt.match(/POLYGON\s*\(\((.*?)\)\)/i);
  if (!match || !match[1]) return null;
  const pairs = match[1].split(',');
  const degrees = [];
  pairs.forEach(p => {
    const parts = p.trim().split(/\s+/);
    if (parts.length >= 2) {
      const lon = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lon) && !isNaN(lat)) {
        degrees.push(lon, lat);
      }
    }
  });
  return degrees.length >= 6 ? Cesium.Cartesian3.fromDegreesArray(degrees) : null;
}

function clearGranuleFootprints() {
  if (viewer) {
    granuleEntities.forEach(ent => viewer.entities.remove(ent));
  }
  granuleEntities = [];
  activeGranuleEntity = null;
}

function renderGranuleFootprints(granules) {
  clearGranuleFootprints();
  if (!viewer || !granules || !Array.isArray(granules)) return;

  granules.forEach((g, idx) => {
    if (!g.footprint) return;
    const positions = parseWktPolygon(g.footprint);
    if (!positions) return;

    const ent = viewer.entities.add({
      id: `granule_swath_${idx}`,
      name: `NASA SAR Swath: ${g.granule_name}`,
      polygon: {
        hierarchy: positions,
        material: Cesium.Color.fromCssColorString('rgba(0, 212, 255, 0.08)'),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('rgba(0, 212, 255, 0.65)'),
        outlineWidth: 2,
        height: 120
      }
    });

    ent.granuleData = g;
    granuleEntities.push(ent);
  });
}

function focusGranuleFootprint(idx) {
  if (!viewer || idx < 0 || idx >= granuleEntities.length) return;
  const ent = granuleEntities[idx];
  if (!ent) return;

  // Unhighlight previous
  if (activeGranuleEntity && activeGranuleEntity.polygon) {
    activeGranuleEntity.polygon.material = Cesium.Color.fromCssColorString('rgba(0, 212, 255, 0.08)');
    activeGranuleEntity.polygon.outlineColor = Cesium.Color.fromCssColorString('rgba(0, 212, 255, 0.65)');
  }

  // Highlight selected in amber/gold
  activeGranuleEntity = ent;
  if (ent.polygon) {
    ent.polygon.material = Cesium.Color.fromCssColorString('rgba(245, 158, 11, 0.28)');
    ent.polygon.outlineColor = Cesium.Color.fromCssColorString('#f59e0b');
  }

  viewer.flyTo(ent, {
    duration: 1.6,
    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-55), 260000)
  });
}

// 15. Temporal SAR Time-Scrubber Control
function setTemporalDay(day) {
  temporalDay = parseInt(day);
  const slider = document.getElementById('temporalSlider');
  if (slider && parseInt(slider.value) !== temporalDay) slider.value = temporalDay;

  const labelEl = document.getElementById('temporalDayLabel');
  const badgeEl = document.getElementById('temporalPhaseBadge');

  if (temporalDay < -2) {
    if (labelEl) labelEl.textContent = `DAY ${temporalDay}`;
    if (badgeEl) {
      badgeEl.textContent = 'PRE-FLOOD BASELINE';
      badgeEl.style.color = '#3b82f6';
      badgeEl.style.borderColor = 'rgba(59, 130, 246, 0.4)';
    }
    currentTemporalIntensity = Math.max(0.04, (15 + temporalDay) / 13 * 0.5);
  } else if (temporalDay >= -2 && temporalDay <= 3) {
    if (labelEl) labelEl.textContent = temporalDay === 0 ? 'DAY 0 (PEAK)' : `DAY ${temporalDay > 0 ? '+' : ''}${temporalDay}`;
    if (badgeEl) {
      badgeEl.textContent = 'T-0 EVENT PEAK';
      badgeEl.style.color = '#f43f5e';
      badgeEl.style.borderColor = 'rgba(244, 63, 94, 0.4)';
    }
    currentTemporalIntensity = 1.0;
  } else {
    if (labelEl) labelEl.textContent = `DAY +${temporalDay}`;
    if (badgeEl) {
      badgeEl.textContent = 'DRAINAGE RECESSION';
      badgeEl.style.color = '#10b981';
      badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    }
    currentTemporalIntensity = Math.max(0.15, (15 - (temporalDay - 3) * 0.75) / 15);
  }

  // Dynamically interpolate KPI metrics
  if (lastAnalysisResult) {
    const baseDrop = lastAnalysisResult.backscatter_drop_db;
    const baseArea = lastAnalysisResult.affected_area_sqkm;
    const curDrop = (baseDrop * currentTemporalIntensity).toFixed(1);
    const curArea = Math.round(baseArea * currentTemporalIntensity).toLocaleString();

    document.getElementById('kpiBackscatter').innerHTML = `${curDrop} <span class="u">dB</span>`;
    document.getElementById('kpiArea').innerHTML = `${curArea} <span class="u">km²</span>`;
    const statMetricEl = document.getElementById('chartStatMetric');
    if (statMetricEl) statMetricEl.textContent = `${curDrop} dB`;
  }
}

function toggleTemporalPlay() {
  const playBtn = document.getElementById('temporalPlayBtn');
  if (temporalPlaying) {
    temporalPlaying = false;
    clearInterval(temporalInterval);
    if (playBtn) playBtn.textContent = '▶';
  } else {
    temporalPlaying = true;
    if (playBtn) playBtn.textContent = '⏸';
    temporalInterval = setInterval(() => {
      let nextDay = temporalDay + 1;
      if (nextDay > 15) nextDay = -15;
      setTemporalDay(nextDay);
    }, 550);
  }
}

// 16. Event Handlers
function setupEventListeners() {
  // Drawer Toggles & Restore Tabs
  const leftDrawer = document.getElementById('leftDrawer');
  const rightDrawer = document.getElementById('rightDrawer');
  const toggleLeftBtn = document.getElementById('toggleLeftBtn');
  const toggleRightBtn = document.getElementById('toggleRightBtn');
  const restoreLeftTab = document.getElementById('restoreLeftTab');
  const restoreRightTab = document.getElementById('restoreRightTab');
  const refreshAnalyticsBtn = document.getElementById('refreshAnalyticsBtn');

  function toggleLeft(collapse) {
    const isCollapsed = collapse !== undefined ? collapse : !leftDrawer.classList.contains('collapsed');
    leftDrawer.classList.toggle('collapsed', isCollapsed);
    if (restoreLeftTab) restoreLeftTab.classList.toggle('hidden', !isCollapsed);
  }

  function toggleRight(collapse) {
    const isCollapsed = collapse !== undefined ? collapse : !rightDrawer.classList.contains('collapsed');
    rightDrawer.classList.toggle('collapsed', isCollapsed);
    if (restoreRightTab) restoreRightTab.classList.toggle('hidden', !isCollapsed);
  }

  if (toggleLeftBtn) toggleLeftBtn.addEventListener('click', () => toggleLeft(true));
  if (restoreLeftTab) restoreLeftTab.addEventListener('click', () => toggleLeft(false));

  if (toggleRightBtn) toggleRightBtn.addEventListener('click', () => toggleRight(true));
  if (restoreRightTab) restoreRightTab.addEventListener('click', () => toggleRight(false));

  if (refreshAnalyticsBtn) {
    refreshAnalyticsBtn.addEventListener('click', () => {
      const lat = currentScenario ? currentScenario.lat : 26.35;
      const lon = currentScenario ? currentScenario.lon : 92.68;
      runAnalysis(lat, lon);
    });
  }

  // Temporal Scrubber
  const temporalSlider = document.getElementById('temporalSlider');
  if (temporalSlider) {
    temporalSlider.addEventListener('input', (e) => {
      setTemporalDay(e.target.value);
    });
  }

  const temporalPlayBtn = document.getElementById('temporalPlayBtn');
  if (temporalPlayBtn) {
    temporalPlayBtn.addEventListener('click', toggleTemporalPlay);
  }

  // Sensitivity slider
  document.getElementById('sensitivitySlider').addEventListener('input', (e) => {
    document.getElementById('sensitivityVal').textContent = `${e.target.value}x`;
  });

  // Run Analysis
  document.getElementById('runAnalysisBtn').addEventListener('click', () => {
    if (currentScenario) runAnalysis(currentScenario.lat, currentScenario.lon);
  });

  // Query NASA
  document.getElementById('queryNasaBtn').addEventListener('click', () => {
    if (currentScenario) queryNasaGranules(currentScenario.lat, currentScenario.lon);
  });

  // 3D Auto-Orbit Button
  document.getElementById('autoRotateBtn').addEventListener('click', () => {
    autoRotate = !autoRotate;
    updateAutoRotateUI();
  });

  // 3D Satellite Swath Beam Toggle
  document.getElementById('satelliteBeamBtn').addEventListener('click', () => {
    beamActive = !beamActive;
    document.getElementById('beamStatusText').textContent = beamActive ? 'ACTIVE' : 'MUTED';
    document.getElementById('satelliteBeamBtn').classList.toggle('active', beamActive);
  });

  // 3D Heatmap Toggle
  document.getElementById('heatmapToggleBtn').addEventListener('click', () => {
    heatmapActive = !heatmapActive;
    document.getElementById('heatmapStatusText').textContent = heatmapActive ? 'ON' : 'OFF';
    document.getElementById('heatmapToggleBtn').classList.toggle('active', heatmapActive);
    if (currentScenario) render3DOverlay(currentScenario);
  });

  // Chart Mode Tab Switching (Spectral, Polar Rose, 60D Forecast)
  document.querySelectorAll('.chart-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget || e.target;
      target.classList.add('active');
      currentChartMode = target.getAttribute('data-chart-mode');
      renderActiveChart();
    });
  });

  // Report Modal
  const modal = document.getElementById('reportModal');
  document.getElementById('exportReportBtn').addEventListener('click', () => {
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
  txt.textContent = autoRotate ? 'ON' : 'OFF';
  btn.classList.toggle('active', autoRotate);
}

// 15. Generate NASA Mission Report (No Personal Name)
function generateReport() {
  const sc = currentScenario || { title: "Custom Observation", location_name: "Global", metrics: {} };
  const backscatter = document.getElementById('kpiBackscatter').innerText;
  const area = document.getElementById('kpiArea').innerText;
  const coherence = document.getElementById('kpiCoherence').innerText;
  const confidence = document.getElementById('kpiConfidence').innerText;

  document.getElementById('reportBody').innerHTML = `
    <div>
      <div style="color: #00d4ff; font-family: 'JetBrains Mono', monospace; font-size: 11px; margin-bottom: 8px;">
        MISSION BRIEFING // NASA SPACE APPS CHALLENGE 2026 // DANCING WITH THE SARS
      </div>
      <h2 style="color: #fff; font-size: 18px; margin-bottom: 12px;">
        PROJECT: SAR SENTINEL (MISSION STATION: NISAR-01)
      </h2>
      <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 14px;">
      
      <p style="margin-bottom: 6px;"><strong>OBSERVATION SECTOR:</strong> ${sc.location_name} (${sc.title})</p>
      <p style="margin-bottom: 6px;"><strong>MISSION DATASET:</strong> NASA-ISRO Synthetic Aperture Radar (NISAR) & Sentinel-1</p>
      <p style="margin-bottom: 12px;"><strong>PHYSICAL MECHANISM:</strong> Specular backscatter drop ($\Delta \sigma^0$) and InSAR phase decorrelation</p>
      
      <div style="background: rgba(0, 212, 255, 0.06); border: 1px solid rgba(0, 212, 255, 0.2); padding: 14px; border-radius: 8px; margin: 14px 0;">
        <h4 style="color: #10b981; font-family: 'JetBrains Mono', monospace; font-size: 12px; margin-bottom: 8px;">QUANTITATIVE OBSERVATION RESULTS:</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 12px;">
          <div>• Δ BACKSCATTER: <strong style="color: #f43f5e;">${backscatter}</strong></div>
          <div>• ALTERED SURFACE: <strong style="color: #f59e0b;">${area}</strong></div>
          <div>• COHERENCE INDEX: <strong style="color: #00d4ff;">${coherence}</strong></div>
          <div>• ALGORITHM CONFIDENCE: <strong style="color: #10b981;">${confidence}</strong></div>
        </div>
      </div>

      <p style="color: #94a3b8; font-size: 11.5px; margin-top: 14px;">
        Report generated by <strong>SAR SENTINEL 3D COMMAND ENGINE</strong> on ${new Date().toUTCString()}. Formulated for submission to NASA Space Apps 2026 Global Evaluation Committee.
      </p>
    </div>
  `;
}
