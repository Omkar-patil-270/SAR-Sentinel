// SAR Sentinel - Frontend Application Logic
// NASA Space Apps 2026: Dancing with the SARs

let map = null;
let currentScenario = null;
let hotspotLayerGroup = null;
let radarOverlayLayer = null;
let backscatterChart = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initChart();
  loadTelemetry();
  loadScenarios();
  setupEventListeners();
});

// 1. Initialize Leaflet Map
function initMap() {
  map = L.map('sarMap', {
    zoomControl: false,
    attributionControl: false
  }).setView([26.35, 92.68], 9);

  // Add custom zoom control top-right
  L.control.zoom({ position: 'topright' }).addTo(map);

  // Dark basemap (CartoDB Dark Matter)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(map);

  hotspotLayerGroup = L.layerGroup().addTo(map);

  // Track coordinates for HUD
  map.on('mousemove', (e) => {
    const lat = e.latlng.lat.toFixed(4);
    const lon = e.latlng.lng.toFixed(4);
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    document.getElementById('coordsDisplay').textContent = 
      `LAT: ${Math.abs(lat)}° ${latDir} | LON: ${Math.abs(lon)}° ${lonDir}`;
  });
}

// 2. Initialize Backscatter Chart.js
function initChart() {
  const ctx = document.getElementById('backscatterChart').getContext('2d');
  backscatterChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['-15dB', '-12dB', '-9dB', '-6dB', '-3dB', '0dB', '+3dB', '+6dB'],
      datasets: [
        {
          label: 'Baseline Pass (σ⁰)',
          data: [5, 12, 28, 45, 32, 18, 8, 2],
          borderColor: '#00d2ff',
          backgroundColor: 'rgba(0, 210, 255, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2
        },
        {
          label: 'Event Observation (σ⁰)',
          data: [24, 38, 42, 22, 14, 9, 4, 1],
          borderColor: '#ff3366',
          backgroundColor: 'rgba(255, 51, 102, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { size: 9, family: 'Orbitron' } }
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748b', font: { size: 8 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          ticks: { color: '#64748b', font: { size: 8 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

// 3. Load Orbit Telemetry from Backend
async function loadTelemetry() {
  try {
    const res = await fetch('/api/telemetry');
    const data = await res.json();
    console.log('[Telemetry Loaded]', data);
  } catch (err) {
    console.warn('Telemetry load fallback', err);
  }
}

// 4. Load Scenarios
async function loadScenarios() {
  const container = document.getElementById('scenarioList');
  try {
    const res = await fetch('/api/scenarios');
    const scenarios = await res.json();
    
    container.innerHTML = '';
    scenarios.forEach((sc, index) => {
      const card = document.createElement('div');
      card.className = `scenario-card ${index === 0 ? 'active' : ''}`;
      card.innerHTML = `
        <div class="sc-title">${sc.title}</div>
        <div class="sc-meta">
          <span>📍 ${sc.location_name}</span>
          <span class="sc-tag">${sc.category.split(' ')[0]}</span>
        </div>
      `;
      card.addEventListener('click', () => selectScenario(sc, card));
      container.appendChild(card);
    });

    if (scenarios.length > 0) {
      selectScenario(scenarios[0], container.children[0]);
    }
  } catch (err) {
    container.innerHTML = '<div class="error-msg">Failed to load scenarios.</div>';
  }
}

// 5. Select & Display Scenario
function selectScenario(sc, cardElement) {
  currentScenario = sc;

  // Update UI active card
  document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('active'));
  if (cardElement) cardElement.classList.add('active');

  // Update Map Position
  map.flyTo([sc.lat, sc.lon], sc.zoom, { duration: 1.5 });
  document.getElementById('activeScenarioLabel').textContent = sc.title;

  // Run analysis for this coordinate
  runAnalysis(sc.lat, sc.lon);

  // Query live NASA ASF DAAC Granules
  queryNasaGranules(sc.lat, sc.lon);
}

// 6. Run SAR Change Detection Analysis
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

// 7. Render Metrics, Hotspots & Histogram
function renderAnalysisResults(data) {
  // Update KPIs
  document.getElementById('kpiBackscatter').innerHTML = `${data.backscatter_drop_db} <span class="unit">dB</span>`;
  document.getElementById('kpiArea').innerHTML = `${data.affected_area_sqkm.toLocaleString()} <span class="unit">km²</span>`;
  document.getElementById('kpiSeverity').textContent = `Severity: ${data.severity}`;
  document.getElementById('kpiCoherence').innerHTML = `${data.coherence_index} <span class="unit">γ</span>`;
  document.getElementById('kpiConfidence').innerHTML = `${data.confidence_score} <span class="unit">%</span>`;

  // Update Chart
  if (backscatterChart && data.histogram) {
    backscatterChart.data.labels = data.histogram.labels;
    backscatterChart.data.datasets[0].data = data.histogram.baseline;
    backscatterChart.data.datasets[1].data = data.histogram.event;
    backscatterChart.update();
  }

  // Render Map Hotspots
  hotspotLayerGroup.clearLayers();
  if (document.getElementById('toggleHotspots').checked && data.geojson_hotspots) {
    data.geojson_hotspots.features.forEach(f => {
      const [lon, lat] = f.geometry.coordinates;
      const circle = L.circle([lat, lon], {
        radius: f.properties.radius,
        color: f.properties.backscatter_delta_db < -4 ? '#ff3366' : '#ffaa00',
        fillColor: f.properties.backscatter_delta_db < -4 ? '#ff3366' : '#00d2ff',
        fillOpacity: 0.35,
        weight: 2
      });

      circle.bindPopup(`
        <div style="font-family: 'Rajdhani', sans-serif; color: #fff; background: #0b0f19; padding: 6px;">
          <h4 style="color: #00d2ff; margin-bottom: 4px;">🛰️ RADAR ANOMALY</h4>
          <p><strong>Type:</strong> ${f.properties.type}</p>
          <p><strong>Backscatter Drop:</strong> ${f.properties.backscatter_delta_db} dB</p>
          <p><strong>Radius:</strong> ${(f.properties.radius / 1000).toFixed(1)} km</p>
          <p><strong>Observation:</strong> NISAR Verified</p>
        </div>
      `);
      hotspotLayerGroup.addLayer(circle);
    });
  }
}

// 8. Query Live NASA ASF DAAC Granules
async function queryNasaGranules(lat, lon) {
  const container = document.getElementById('granulesContainer');
  container.innerHTML = '<div class="loading-state">🛰️ Fetching real NASA ASF radar granules...</div>';

  const platform = document.getElementById('platformSelect').value;
  const maxResults = document.getElementById('maxGranulesSelect').value;

  const targetLat = lat || (currentScenario ? currentScenario.lat : 26.35);
  const targetLon = lon || (currentScenario ? currentScenario.lon : 92.68);

  try {
    const res = await fetch(`/api/nasa/search?platform=${platform}&lat=${targetLat}&lon=${targetLon}&max_results=${maxResults}`);
    const data = await res.json();

    container.innerHTML = '';
    if (!data.granules || data.granules.length === 0) {
      container.innerHTML = '<div class="hint-text">No granules found in immediate bounding box. Try adjusting coordinates.</div>';
      return;
    }

    data.granules.forEach(g => {
      const item = document.createElement('div');
      item.className = 'granule-item';
      item.innerHTML = `
        <div class="granule-name" title="${g.granule_name}">📡 ${g.granule_name}</div>
        <div class="granule-meta">
          <span>${g.startTime ? g.startTime.split('T')[0] : '2024'} | Pol: ${g.polarization || 'Dual'}</span>
          <a href="${g.downloadUrl || '#'}" target="_blank" class="granule-link">Download Data ↗</a>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = '<div class="error-msg">NASA ASF API unreachable.</div>';
  }
}

// 9. Event Listeners & Controls
function setupEventListeners() {
  // Sensitivity slider
  const slider = document.getElementById('sensitivitySlider');
  slider.addEventListener('input', (e) => {
    document.getElementById('sensitivityVal').textContent = `${e.target.value}x`;
  });

  // Run analysis button
  document.getElementById('runAnalysisBtn').addEventListener('click', () => {
    if (currentScenario) {
      runAnalysis(currentScenario.lat, currentScenario.lon);
    } else {
      runAnalysis();
    }
  });

  // Query NASA button
  document.getElementById('queryNasaBtn').addEventListener('click', () => {
    if (currentScenario) {
      queryNasaGranules(currentScenario.lat, currentScenario.lon);
    } else {
      queryNasaGranules();
    }
  });

  // Hotspots toggle
  document.getElementById('toggleHotspots').addEventListener('change', (e) => {
    if (e.target.checked) {
      map.addLayer(hotspotLayerGroup);
    } else {
      map.removeLayer(hotspotLayerGroup);
    }
  });

  // Mission Report Modal
  const modal = document.getElementById('reportModal');
  document.getElementById('exportReportBtn').addEventListener('click', () => {
    generateReport();
    modal.classList.remove('hidden');
  });

  document.getElementById('closeReportBtn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

// 10. Generate NASA Mission Report
function generateReport() {
  const sc = currentScenario || { title: "Custom Observation", location_name: "Global", metrics: {} };
  const backscatter = document.getElementById('kpiBackscatter').innerText;
  const area = document.getElementById('kpiArea').innerText;
  const coherence = document.getElementById('kpiCoherence').innerText;
  const confidence = document.getElementById('kpiConfidence').innerText;

  document.getElementById('reportBody').innerHTML = `
    <div style="font-family: 'Inter', sans-serif;">
      <p style="color: #00d2ff; font-weight: 700; margin-bottom: 8px;">NASA SPACE APPS CHALLENGE 2026: DANCING WITH THE SARS</p>
      <h3 style="color: #fff; margin-bottom: 12px;">PROJECT: SAR SENTINEL (TEAM: SAR SENTINEL)</h3>
      <hr style="border: 0; border-top: 1px solid rgba(0, 210, 255, 0.2); margin-bottom: 12px;">
      
      <p><strong>Target Region:</strong> ${sc.location_name} (${sc.title})</p>
      <p><strong>Mission Data Source:</strong> NASA-ISRO Synthetic Aperture Radar (NISAR) & Sentinel-1 C/L-Band</p>
      <p><strong>Primary Physical Metric:</strong> Co-polarized backscatter drop ($\Delta \sigma^0$) via specular surface reflectance</p>
      
      <div style="background: rgba(0, 210, 255, 0.08); padding: 12px; border-radius: 6px; margin: 12px 0;">
        <h4 style="color: #00ff88; margin-bottom: 6px;">Quantitative Observation Results:</h4>
        <ul style="padding-left: 20px; line-height: 1.6;">
          <li>Backscatter Differential ($\Delta \sigma^0$): <strong>${backscatter}</strong></li>
          <li>Estimated Inundated/Altered Surface: <strong>${area}</strong></li>
          <li>Interferometric Coherence (γ): <strong>${coherence}</strong></li>
          <li>Algorithmic Confidence: <strong>${confidence}</strong></li>
        </ul>
      </div>

      <p style="color: #94a3b8; font-size: 0.82rem;">
        Generated by <strong>SAR Sentinel</strong> on ${new Date().toUTCString()}. Prepared for NASA Space Apps 2026 Judging Committee and Academic Evaluation.
      </p>
    </div>
  `;
}
