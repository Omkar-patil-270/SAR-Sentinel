"""
SAR Sentinel — Synthetic Simulation Benchmark Pipeline
Benchmark: Synthetic C-Band SAR Model calibrated to Copernicus EMS (EMSR-724) Boundaries
Mission: NASA Space Apps Challenge 2026 // Track: Dancing with the SARs

ACADEMIC TRANSPARENCY NOTICE:
This script performs a 2D spatial simulation of Otsu bimodal radar thresholding.
Backscatter values are synthetically generated using literature-calibrated Gaussian bounds
(specular water vs. diffuse vegetation) draped over the Copernicus EMS EMSR-724 flood boundary.
It evaluates algorithmic mathematical separation on synthetic data; it does NOT ingest
raw 1GB+ Level-1 Sentinel-1 GRD GeoTIFF raster imagery.
"""

import json
import os
import sys
import numpy as np

# Ensure UTF-8 output on Windows console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def point_in_polygon(px, py, poly_coords):
    """
    Vectorized ray-casting algorithm to test whether points (px, py) lie inside polygon.
    poly_coords is a list of [lon, lat] points.
    """
    n = len(poly_coords)
    inside = np.zeros(px.shape, dtype=bool)
    
    p1x, p1y = poly_coords[0]
    for i in range(1, n + 1):
        p2x, p2y = poly_coords[i % n]
        
        # Check if ray crosses the line segment (p1 -> p2)
        cond = (py > min(p1y, p2y)) & (py <= max(p1y, p2y)) & (px <= max(p1x, p2x))
        if p1y != p2y:
            xinters = (py - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
            mask = cond & ((p1x == p2x) | (px <= xinters))
            inside ^= mask
        p1x, p1y = p2x, p2y
        
    return inside

def otsu_threshold(image_1d, bins=256):
    """
    Mathematical implementation of Otsu's Global Bimodal Thresholding.
    Finds the threshold t that maximizes between-class variance sigma_b^2(t).
    """
    hist, bin_edges = np.histogram(image_1d, bins=bins, density=True)
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2.0
    
    # Cumulative probability distribution
    weight1 = np.cumsum(hist)
    weight2 = np.cumsum(hist[::-1])[::-1]
    
    # Cumulative class means
    mean1 = np.cumsum(hist * bin_centers) / np.maximum(weight1, 1e-12)
    mean2 = (np.cumsum((hist * bin_centers)[::-1]) / np.maximum(weight2[::-1], 1e-12))[::-1]
    
    # Between-class variance
    variance12 = weight1[:-1] * weight2[1:] * (mean1[:-1] - mean2[1:]) ** 2
    
    idx = np.argmax(variance12)
    threshold = bin_centers[idx]
    return threshold, bin_centers, hist, variance12[idx]

def run_synthetic_benchmark():
    print("================================================================================")
    print("[SAR SENTINEL] SYNTHETIC-DATA SIMULATION BENCHMARK")
    print("================================================================================")
    print("Evaluation Type   : Synthetic Backscatter Simulation (Calibrated to Published Bounds)")
    print("Target AOI        : Brahmaputra River Basin & Kaziranga Floodplain, Assam, India")
    print("Reference Extent  : Copernicus Emergency Management Service (EMSR-724 Delineation)")
    print("Status Notice     : Algorithm verified on synthetic data; raw SAR raster ingest is in roadmap")
    print("--------------------------------------------------------------------------------")

    # 1. Load Copernicus EMS EMSR-724 GeoJSON Delineation Polygons
    geojson_path = os.path.join(os.path.dirname(__file__), "..", "data", "emsr724_kaziranga_delineation.geojson")
    with open(geojson_path, "r", encoding="utf-8") as f:
        emsr_data = json.load(f)

    # 2. Geodesic WGS84 Projection & Evaluation Grid
    # Longitude: 92.60°E to 93.40°E (d_lon = 0.80°)
    # Latitude:  26.25°N to 26.75°N (d_lat = 0.50°)
    lon_min, lon_max = 92.60, 93.40
    lat_min, lat_max = 26.25, 26.75
    center_lat = (lat_min + lat_max) / 2.0  # 26.50° N

    # WGS84 Geodesic arc-length formulas:
    # 1 deg latitude ≈ 110.82 km at 26.5°N
    # 1 deg longitude ≈ 111.320 * cos(lat) ≈ 99.626 km at 26.5°N
    km_per_deg_lat = 110.82
    km_per_deg_lon = 111.320 * np.cos(np.radians(center_lat))

    aoi_width_km = (lon_max - lon_min) * km_per_deg_lon   # 0.80 * 99.626 ≈ 79.70 km
    aoi_height_km = (lat_max - lat_min) * km_per_deg_lat  # 0.50 * 110.82 ≈ 55.41 km
    total_geodesic_sqkm = round(aoi_width_km * aoi_height_km, 2)  # ≈ 4,416.18 km²

    grid_rows, grid_cols = 1000, 1000
    total_pixels = grid_rows * grid_cols
    sqkm_per_pixel = total_geodesic_sqkm / total_pixels  # ≈ 0.004416 km² per pixel (44.16 x 100m)

    lons = np.linspace(lon_min, lon_max, grid_cols)
    lats = np.linspace(lat_max, lat_min, grid_rows)
    lon_grid, lat_grid = np.meshgrid(lons, lats)

    print(f"[*] Geodesic AOI Extent : {aoi_width_km:.2f} km (W) x {aoi_height_km:.2f} km (H)")
    print(f"[*] Total Geodesic Area : {total_geodesic_sqkm:,.2f} km² (WGS84 Ellipsoidal Approximation)")
    print(f"[*] Grid Resolution     : {grid_rows} x {grid_cols} ({total_pixels:,} cells)")
    print(f"[*] Ground Cell Area    : {sqkm_per_pixel * 1e6:.1f} m² ({sqkm_per_pixel:.6f} km² / 0.44 hectares)")
    print("--------------------------------------------------------------------------------")

    # 3. Rasterize Copernicus EMS Ground-Truth Mask (M_ref)
    print("[*] Rasterizing Copernicus EMS EMSR-724 ground-truth vector polygons...")
    ref_mask = np.zeros((grid_rows, grid_cols), dtype=bool)
    for feat in emsr_data.get("features", []):
        coords = feat["geometry"]["coordinates"][0]
        feat_mask = point_in_polygon(lon_grid, lat_grid, coords)
        ref_mask |= feat_mask

    ref_pixel_count = int(np.count_nonzero(ref_mask))
    ref_water_sqkm = round(ref_pixel_count * sqkm_per_pixel, 2)
    ref_dry_sqkm = round((total_pixels - ref_pixel_count) * sqkm_per_pixel, 2)
    print(f"    -> Copernicus Reference Water Pixels : {ref_pixel_count:,} ({ref_water_sqkm:.2f} km²)")
    print(f"    -> Copernicus Reference Dry Pixels   : {total_pixels - ref_pixel_count:,} ({ref_dry_sqkm:.2f} km²)")

    # 4. Synthesize Physical Radar Backscatter Distribution (sigma0_VV in dB)
    # Calibrated to published literature values for C-Band Sentinel-1:
    # Open water specular reflection: N(-21.5 dB, 1.6 dB)
    # Dry vegetation / soil diffuse: N(-10.2 dB, 2.1 dB)
    np.random.seed(42)
    sar_sigma0_db = np.zeros((grid_rows, grid_cols), dtype=np.float32)

    # Water pixels
    sar_sigma0_db[ref_mask] = np.random.normal(-21.5, 1.6, size=ref_pixel_count)

    # Dry terrain pixels
    dry_count = total_pixels - ref_pixel_count
    sar_sigma0_db[~ref_mask] = np.random.normal(-10.2, 2.1, size=dry_count)

    # Inject physically realistic radar misclassification noise:
    # A) Sub-canopy flood concealment (False Negatives): ~5.0%
    canopy_concealment_count = int(ref_pixel_count * 0.0506)
    canopy_indices = np.where(ref_mask)
    selected_canopy = np.random.choice(len(canopy_indices[0]), size=canopy_concealment_count, replace=False)
    sar_sigma0_db[canopy_indices[0][selected_canopy], canopy_indices[1][selected_canopy]] = np.random.normal(-12.8, 1.1, size=canopy_concealment_count)

    # B) Smooth tarmac / sandbar specular bounce (False Positives): ~0.43%
    specular_dry_count = int(dry_count * 0.00428)
    dry_indices = np.where(~ref_mask)
    selected_dry = np.random.choice(len(dry_indices[0]), size=specular_dry_count, replace=False)
    sar_sigma0_db[dry_indices[0][selected_dry], dry_indices[1][selected_dry]] = np.random.normal(-20.2, 1.2, size=specular_dry_count)

    # 5. Apply Otsu Global Bimodal Thresholding
    print("[*] Computing Otsu Global Bimodal Threshold across backscatter distribution...")
    threshold_db, bin_centers, hist, max_variance = otsu_threshold(sar_sigma0_db.ravel(), bins=256)
    print(f"    -> Dynamically Computed Cutoff Threshold (t*) : {threshold_db:.2f} dB")
    print(f"    -> Maximized Between-Class Variance (sigma_b^2): {max_variance:.6f}")

    # 6. Perform 2D Boolean Matrix Operations
    classified_water_mask = (sar_sigma0_db < threshold_db)

    tp_mask = classified_water_mask & ref_mask
    fp_mask = classified_water_mask & (~ref_mask)
    fn_mask = (~classified_water_mask) & ref_mask
    tn_mask = (~classified_water_mask) & (~ref_mask)

    tp_pixels = int(np.count_nonzero(tp_mask))
    fp_pixels = int(np.count_nonzero(fp_mask))
    fn_pixels = int(np.count_nonzero(fn_mask))
    tn_pixels = int(np.count_nonzero(tn_mask))

    tp_sqkm = round(tp_pixels * sqkm_per_pixel, 2)
    fp_sqkm = round(fp_pixels * sqkm_per_pixel, 2)
    fn_sqkm = round(fn_pixels * sqkm_per_pixel, 2)
    tn_sqkm = round(tn_pixels * sqkm_per_pixel, 2)
    detected_water_sqkm = round((tp_pixels + fp_pixels) * sqkm_per_pixel, 2)

    # 7. Metrics
    precision = (tp_pixels / (tp_pixels + fp_pixels)) * 100.0
    recall = (tp_pixels / (tp_pixels + fn_pixels)) * 100.0
    f1_score = 2.0 * (precision * recall) / (precision + recall)
    iou_jaccard = (tp_pixels / (tp_pixels + fp_pixels + fn_pixels)) * 100.0
    overall_accuracy = ((tp_pixels + tn_pixels) / total_pixels) * 100.0

    print("--------------------------------------------------------------------------------")
    print("[+] CONFUSION MATRIX (1,000,000 Evaluation Cells, Geodesic WGS84 Calibration):")
    print(f"   * True Positive (TP)  : {tp_pixels:>7,} pixels | {tp_sqkm:>8.2f} km²  (Correctly Mapped Floodwater)")
    print(f"   * False Positive (FP) : {fp_pixels:>7,} pixels | {fp_sqkm:>8.2f} km²  (Asphalt/Sand Specular Bounce)")
    print(f"   * False Negative (FN) : {fn_pixels:>7,} pixels | {fn_sqkm:>8.2f} km²  (Sub-Canopy Concealed Water)")
    print(f"   * True Negative (TN)  : {tn_pixels:>7,} pixels | {tn_sqkm:>8.2f} km²  (Correctly Mapped Dry Land)")
    print("--------------------------------------------------------------------------------")
    print("[=] SYNTHETIC-DATA SIMULATION RESULTS:")
    print(f"   - Precision (PPV)     : {precision:.2f}%")
    print(f"   - Recall (Sensitivity): {recall:.2f}%")
    print(f"   - F1-Score (Harmonic) : {f1_score:.2f}%")
    print(f"   - Jaccard Index (IoU) : {iou_jaccard:.2f}%")
    print(f"   - Overall Accuracy    : {overall_accuracy:.2f}%")
    print("================================================================================")
    print("⚠️  ACADEMIC AUDIT NOTE: These figures represent algorithm separation efficiency on")
    print("    literature-modeled synthetic distributions. They do not constitute empirical")
    print("    validation against raw Sentinel-1 Level-1 GRD SAR raster rasters.")
    print("================================================================================")

    results = {
        "status": "SYNTHETIC_DATA_SIMULATION",
        "validation_type": "Synthetic Backscatter Simulation calibrated to Copernicus EMS EMSR-724 extent",
        "real_sar_imagery_processed": False,
        "geodesic_projection": {
            "datum": "WGS84",
            "center_latitude_deg": center_lat,
            "aoi_dimensions_km": [round(aoi_width_km, 2), round(aoi_height_km, 2)],
            "total_aoi_geodesic_sqkm": total_geodesic_sqkm,
            "cell_area_sqkm": round(sqkm_per_pixel, 6)
        },
        "target_scene_metadata": {
            "modeled_satellite": "Sentinel-1A C-Band SAR",
            "modeled_granule_id": "S1A_IW_GRDH_1SDV_20240708T001712_20240708T001737_054662_06A7C1_3D89",
            "ground_truth_reference": "Copernicus Emergency Management Service (EMSR-724 Delineation r1_V1)"
        },
        "methodology": {
            "algorithm": "Otsu Global Bimodal Radiometric Variance Maximization",
            "computed_threshold_db": round(float(threshold_db), 2),
            "maximized_between_class_variance": round(float(max_variance), 6)
        },
        "spatial_areas_sqkm": {
            "total_aoi_surveyed": total_geodesic_sqkm,
            "copernicus_reference_water": ref_water_sqkm,
            "sar_detected_water": detected_water_sqkm
        },
        "confusion_matrix_pixels": {
            "true_positive": tp_pixels,
            "false_positive": fp_pixels,
            "false_negative": fn_pixels,
            "true_negative": tn_pixels
        },
        "confusion_matrix_sqkm": {
            "true_positive": tp_sqkm,
            "false_positive": fp_sqkm,
            "false_negative": fn_sqkm,
            "true_negative": tn_sqkm
        },
        "metrics": {
            "precision_pct": round(precision, 2),
            "recall_pct": round(recall, 2),
            "f1_score_pct": round(f1_score, 2),
            "iou_jaccard_pct": round(iou_jaccard, 2),
            "overall_accuracy_pct": round(overall_accuracy, 2)
        }
    }

    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "copernicus_ems_benchmark.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"📁 Benchmark artifact saved to: {os.path.abspath(out_path)}")

    return results

if __name__ == "__main__":
    run_synthetic_benchmark()
