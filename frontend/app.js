// ==========================================================================
// SAR SENTINEL // FUTURISTIC SPACE SYSTEM APPLICATION LOGIC
// NASA Space Apps Challenge 2026: Dancing with the SARs
// ==========================================================================

let map = null;
let currentScenario = null;
let hotspotLayerGroup = null;
let backscatterChart = null;
let audioEnabled = true;

// Web Audio API Sound Synthesizer (Zero external audio files needed!)
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playSciFiTone(freq = 880, type = 'sine', duration = 0.08, gainVal = 0.05) {
  if (!audioEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio context may require user interaction
  }
}

// 1. DOM Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  startMissionClock();
  initMap();
  initChart();
  loadScenarios();
  setupEventListeners();
});

// 2. Real-Time UTC Mission Clock
function startMissionClock() {
  const clockEl = document.getElementById('missionClock');
  function update() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const mins = String(now.getUTCMinutes()).padStart(2, '0');
    const secs = String(now.getUTCSeconds()).padStart(2, '0');
    const ms = String(now.getUTCMilliseconds()).padStart(3, '0');

    clockEl.textContent = `${year}.${month}.${day} ${hours}:${mins}:${secs}.${ms}`;
    requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// 3. Initialize Leaflet Tactical Map
function initMap() {
  map = L.map('sarMap', {
    zoomControl: false,
    attributionControl: false
  }).setView([26.35, 92.68], 9);

  // Custom Zoom Control top-right
  L.control.zoom({ position: 'topright' }).addTo(map);

  // CartoDB Dark Matter with Satellite Invert Filter
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(map);

  hotspotLayerGroup = L.layerGroup().addTo(map);

  // HUD Mouse Tracking
  map.on('mousemove', (e) => {
    const lat = e.latlng.lat.toFixed(4);
    const lon = e.latlng.lng.toFixed(4);
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    document.getElementById('coordsDisplay').textContent = 
      `LAT: ${Math.abs(lat)}° ${latDir} | LON: ${Math.abs(lon)}° ${lonDir} | ELEV: 114M`;
  });
}

// 4. Initialize Neon Chart.js Backscatter Spectrogram
function initChart() {
  const ctx = document.getElementById('backscatterChart').getContext('2d');
  
  // Create neon gradients
  const cyanGrad = ctx.createLinearGradient(0, 0, 0, 140);
  cyanGrad.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
  cyanGrad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

  const redGrad = ctx.createLinearGradient(0, 0, 0, 140);
  redGrad.addColorStop(0, 'rgba(255, 0, 85, 0.4)');
  redGrad.addColorStop(1, 'rgba(255, 0, 85, 0.0)');

  backscatterChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['-15dB', '-12dB', '-9dB', '-6dB', '-3dB', '0dB', '+3dB', '+6dB'],
      datasets: [
        {
          label: 'BASELINE (σ⁰)',
          data: [5, 12, 28, 45, 32, 18, 8, 2],
          borderColor: '#00f0ff',
          backgroundColor: cyanGrad,
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointBackgroundColor: '#00f0ff',
          pointRadius: 2
        },
        {
          label: 'ANOMALY (σ⁰)',
          data: [24, 38, 42, 22, 14, 9, 4, 1],
          borderColor: '#ff0055',
          backgroundColor: redGrad,
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointBackgroundColor: '#ff0055',
          pointRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#8494b2',
            font: { size: 9, family: 'Share Tech Mono' },
            boxWidth: 10
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#475569', font: { size: 8, family: 'Share Tech Mono' } },
          grid: { color: 'rgba(0, 240, 255, 0.06)' }
        },
        y: {
          ticks: { color: '#475569', font: { size: 8, family: 'Share Tech Mono' } },
          grid: { color: 'rgba(0, 240, 255, 0.06)' }
        }
      }
    }
  });
}

// 5. Load Scenarios from Backend
async function loadScenarios() {
  const container = document.getElementById('scenarioList');
  try {
    const res = await fetch('/api/scenarios');
    const scenarios = await res.json();
    
    container.innerHTML = '';
    scenarios.forEach((sc, index) => {
      const card = document.createElement('div');
      card.className = `scenario-card-sci-fi ${index === 0 ? 'active' : ''}`;
      card.innerHTML = `
        <div class="sc-card-title">${sc.title}</div>
        <div class="sc-card-meta">
          <span>📍 ${sc.location_name}</span>
          <span class="sc-card-tag">[${sc.category.split(' ')[0].toUpperCase()}]</span>
        </div>
      `;
      card.addEventListener('click', () => {
        playSciFiTone(920, 'sine', 0.06);
        selectScenario(sc, card);
      });
      container.appendChild(card);
    });

    if (scenarios.length > 0) {
      selectScenario(scenarios[0], container.children[0]);
    }
  } catch (err) {
    container.innerHTML = '<div class="panel-intro">Error connecting to telemetry stream.</div>';
  }
}

// 6. Select Scenario & Fly Map
function selectScenario(sc, cardElement) {
  currentScenario = sc;

  // Active state styling
  document.querySelectorAll('.scenario-card-sci-fi').forEach(c => c.classList.remove('active'));
  if (cardElement) cardElement.classList.add('active');

  // Map transition
  map.flyTo([sc.lat, sc.lon], sc.zoom, { duration: 1.8 });

  // Update HUD text
  document.getElementById('activeScenarioLabel').textContent = sc.title.toUpperCase();
  document.getElementById('activeMissionLabel').textContent = `MISSION: ${sc.mission.toUpperCase()} • BASELINE: ${sc.baseline_date} VS EVENT: ${sc.event_date}`;

  // Run detection
  runAnalysis(sc.lat, sc.lon);

  // Discover NASA ASF granules
  queryNasaGranules(sc.lat, sc.lon);
}

// 7. Run SAR Change Detection
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

// 8. Render Results & Map Anomaly Rings
function renderAnalysisResults(data) {
  // Update Cockpit KPI Cards
  document.getElementById('kpiBackscatter').innerHTML = `${data.backscatter_drop_db} <span class="unit">dB</span>`;
  document.getElementById('kpiArea').innerHTML = `${data.affected_area_sqkm.toLocaleString()} <span class="unit">KM²</span>`;
  document.getElementById('kpiSeverity').textContent = `${data.severity} ANOMALY`;
  document.getElementById('kpiSeverityChip').textContent = `${data.severity} SEVERITY`;
  document.getElementById('kpiCoherence').innerHTML = `${data.coherence_index} <span class="unit">γ</span>`;
  document.getElementById('kpiConfidence').innerHTML = `${data.confidence_score} <span class="unit">%</span>`;

  // Update Chart
  if (backscatterChart && data.histogram) {
    backscatterChart.data.labels = data.histogram.labels;
    backscatterChart.data.datasets[0].data = data.histogram.baseline;
    backscatterChart.data.datasets[1].data = data.histogram.event;
    backscatterChart.update();
  }

  // Render Map Hotspot Rings
  hotspotLayerGroup.clearLayers();
  if (document.getElementById('toggleHotspots').checked && data.geojson_hotspots) {
    data.geojson_hotspots.features.forEach(f => {
      const [lon, lat] = f.geometry.coordinates;
      const isSevere = f.properties.backscatter_delta_db < -4.0;
      
      const circle = L.circle([lat, lon], {
        radius: f.properties.radius,
        color: isSevere ? '#ff0055' : '#00f0ff',
        fillColor: isSevere ? '#ff0055' : '#00f0ff',
        fillOpacity: 0.28,
        weight: 1.5,
        dashArray: '4, 4'
      });

      circle.bindPopup(`
        <div style="font-family: 'Share Tech Mono', monospace; background: #040914; color: #fff; padding: 8px; border: 1px solid #00f0ff; border-radius: 4px;">
          <div style="color: #00f0ff; font-weight: 700; margin-bottom: 4px;">🛰️ RADAR ANOMALY NODE</div>
          <div>TYPE: ${f.properties.type.toUpperCase()}</div>
          <div>Δ BACKSCATTER: <span style="color: #ff0055;">${f.properties.backscatter_delta_db} dB</span></div>
          <div>SWATH RADIUS: ${(f.properties.radius / 1000).toFixed(1)} KM</div>
          <div>STATUS: NISAR CALIBRATED</div>
        </div>
      `);
      hotspotLayerGroup.addLayer(circle);
    });
  }
}

// 9. Query Live NASA ASF DAAC Granules
async function queryNasaGranules(lat, lon) {
  const container = document.getElementById('granulesContainer');
  container.innerHTML = '<div class="stream-loading"><span class="spinner"></span> FETCHING REAL NASA ASF OBSERVATIONS...</div>';

  const platform = document.getElementById('platformSelect').value;
  const maxResults = document.getElementById('maxGranulesSelect').value;

  const targetLat = lat || (currentScenario ? currentScenario.lat : 26.35);
  const targetLon = lon || (currentScenario ? currentScenario.lon : 92.68);

  try {
    const res = await fetch(`/api/nasa/search?platform=${platform}&lat=${targetLat}&lon=${targetLon}&max_results=${maxResults}`);
    const data = await res.json();

    container.innerHTML = '';
    if (!data.granules || data.granules.length === 0) {
      container.innerHTML = '<div class="panel-intro">No granules found in target bounding box.</div>';
      return;
    }

    document.getElementById('granuleCounter').textContent = `${data.granules.length} GRANULES`;

    data.granules.forEach(g => {
      const tile = document.createElement('div');
      tile.className = 'granule-tile';
      tile.innerHTML = `
        <div class="granule-id" title="${g.granule_name}">📡 ${g.granule_name}</div>
        <div class="granule-bottom">
          <span>${g.startTime ? g.startTime.split('T')[0] : '2024'} | ${g.polarization || 'Dual-Pol'}</span>
          <a href="${g.downloadUrl || '#'}" target="_blank" class="granule-link-btn">DOWNLOAD NASA DATA ↗</a>
        </div>
      `;
      container.appendChild(tile);
    });
  } catch (err) {
    container.innerHTML = '<div class="panel-intro">NASA ASF API temporarily busy.</div>';
  }
}

// 10. Event Handlers & Audio
function setupEventListeners() {
  // Audio toggle
  const audioBtn = document.getElementById('audioToggleBtn');
  audioBtn.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    document.getElementById('audioStatusText').textContent = audioEnabled ? 'ON' : 'OFF';
    audioBtn.style.borderColor = audioEnabled ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 0, 85, 0.4)';
    if (audioEnabled) playSciFiTone(1050, 'sine', 0.1);
  });

  // Sensitivity slider
  const slider = document.getElementById('sensitivitySlider');
  slider.addEventListener('input', (e) => {
    document.getElementById('sensitivityVal').textContent = `${e.target.value}x`;
  });

  // Run Analysis button
  document.getElementById('runAnalysisBtn').addEventListener('click', () => {
    playSciFiTone(720, 'square', 0.12, 0.04);
    if (currentScenario) {
      runAnalysis(currentScenario.lat, currentScenario.lon);
    } else {
      runAnalysis();
    }
  });

  // Query NASA button
  document.getElementById('queryNasaBtn').addEventListener('click', () => {
    playSciFiTone(840, 'triangle', 0.09);
    if (currentScenario) {
      queryNasaGranules(currentScenario.lat, currentScenario.lon);
    } else {
      queryNasaGranules();
    }
  });

  // Hotspots checkbox
  document.getElementById('toggleHotspots').addEventListener('change', (e) => {
    playSciFiTone(600, 'sine', 0.05);
    if (e.target.checked) {
      map.addLayer(hotspotLayerGroup);
    } else {
      map.removeLayer(hotspotLayerGroup);
    }
  });

  // Mission Report Modal
  const modal = document.getElementById('reportModal');
  document.getElementById('exportReportBtn').addEventListener('click', () => {
    playSciFiTone(1100, 'sine', 0.15);
    generateReport();
    modal.classList.remove('hidden');
  });

  document.getElementById('closeReportBtn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

// 11. Generate Mission Report
function generateReport() {
  const sc = currentScenario || { title: "Custom Observation", location_name: "Global", metrics: {} };
  const backscatter = document.getElementById('kpiBackscatter').innerText;
  const area = document.getElementById('kpiArea').innerText;
  const coherence = document.getElementById('kpiCoherence').innerText;
  const confidence = document.getElementById('kpiConfidence').innerText;

  document.getElementById('reportBody').innerHTML = `
    <div style="font-family: 'Chakra Petch', sans-serif;">
      <div style="color: #00f0ff; font-family: 'Share Tech Mono', monospace; font-size: 0.85rem; margin-bottom: 8px;">
        MISSION BRIEFING // NASA SPACE APPS CHALLENGE 2026 // DANCING WITH THE SARS
      </div>
      <h2 style="color: #fff; font-family: 'Orbitron', monospace; font-size: 1.2rem; margin-bottom: 12px;">
        PROJECT: SAR SENTINEL (COMMANDER: OMKAR RAMESH PATIL)
      </h2>
      <hr style="border: 0; border-top: 1px solid rgba(0, 240, 255, 0.25); margin-bottom: 14px;">
      
      <p style="margin-bottom: 6px;"><strong>OBSERVATION SECTOR:</strong> ${sc.location_name} (${sc.title})</p>
      <p style="margin-bottom: 6px;"><strong>MISSION DATASET:</strong> NASA-ISRO Synthetic Aperture Radar (NISAR) & Sentinel-1</p>
      <p style="margin-bottom: 12px;"><strong>PHYSICAL MECHANISM:</strong> Surface specular backscatter attenuation ($\Delta \sigma^0$) and InSAR phase decorrelation</p>
      
      <div style="background: rgba(0, 240, 255, 0.06); border: 1px solid rgba(0, 240, 255, 0.2); padding: 14px; border-radius: 4px; margin: 14px 0;">
        <h4 style="color: #00ff88; font-family: 'Share Tech Mono', monospace; margin-bottom: 8px;">QUANTITATIVE OBSERVATION RESULTS:</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: 'Share Tech Mono', monospace; font-size: 0.9rem;">
          <div>• Δ BACKSCATTER: <strong style="color: #ff0055;">${backscatter}</strong></div>
          <div>• ALTERED SURFACE: <strong style="color: #ffaa00;">${area}</strong></div>
          <div>• COHERENCE INDEX: <strong style="color: #00f0ff;">${coherence}</strong></div>
          <div>• SYSTEM CONFIDENCE: <strong style="color: #00ff88;">${confidence}</strong></div>
        </div>
      </div>

      <p style="color: #8494b2; font-size: 0.82rem; font-family: 'Share Tech Mono', monospace; margin-top: 14px;">
        Report generated by <strong>SAR SENTINEL v2.6</strong> on ${new Date().toUTCString()}.
        Formulated for submission to NASA Space Apps 2026 Global Evaluation Committee.
      </p>
    </div>
  `;
}
