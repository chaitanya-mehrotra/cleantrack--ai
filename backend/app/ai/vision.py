import base64
import io
import math
from typing import Optional
from PIL import Image, ImageStat, ImageFilter
from app.schemas.ai import VisionFeatureSummary

def analyze_image_base64(image_base64: str) -> VisionFeatureSummary:
    """
    Analyzes an uploaded image to determine visual properties, texture,
    edge density (debris/clutter metric), and relevance to waste reporting.
    Deterministic, calibrated, and reproducible.
    """
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
        
        img_bytes = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        
        # Resize for consistent, fast feature extraction
        img_small = img.resize((256, 256))
        
        # 1. Luminance and Contrast
        grayscale = img_small.convert("L")
        stat = ImageStat.Stat(grayscale)
        mean_brightness = stat.mean[0] / 255.0
        contrast = stat.stddev[0] / 128.0  # normalized contrast
        
        # 2. Edge / Clutter Density (Laplacian approximation via FIND_EDGES)
        edges = grayscale.filter(ImageFilter.FIND_EDGES)
        edge_stat = ImageStat.Stat(edges)
        edge_density = min(1.0, edge_stat.mean[0] / 64.0)
        
        # 3. Color Variance across channels
        color_stat = ImageStat.Stat(img_small)
        # R, G, B standard deviations
        r_std, g_std, b_std = color_stat.stddev
        color_heterogeneity = min(1.0, (r_std + g_std + b_std) / 150.0)
        
        # 4. Garbage Clutter / Anomaly Score
        # High edge density + high color heterogeneity is characteristic of scattered/piled solid waste
        clutter_score = round(min(0.98, max(0.15, (edge_density * 0.6) + (color_heterogeneity * 0.4))), 2)
        
        clues = []
        if edge_density > 0.5:
            clues.append("High edge density indicating scattered solid matter/debris")
        else:
            clues.append("Smooth surface or low structural clutter detected")
            
        if color_heterogeneity > 0.45:
            clues.append("Multi-chromatic texture consistent with mixed packaging/litter")
        
        if mean_brightness < 0.2:
            clues.append("Low lighting / night-time capture")
        elif mean_brightness > 0.85:
            clues.append("High glare / over-exposed scene")
            
        if clutter_score >= 0.55:
            verdict = "Visible physical accumulation / waste cluster detected"
        else:
            verdict = "Low density or dispersed waste appearance"
            
        return VisionFeatureSummary(
            is_valid_image=True,
            brightness_score=round(mean_brightness, 2),
            contrast_score=round(contrast, 2),
            edge_density=round(edge_density, 2),
            clutter_anomaly_score=clutter_score,
            detected_visual_clues=clues,
            verdict=verdict
        )
    except Exception as e:
        return VisionFeatureSummary(
            is_valid_image=False,
            brightness_score=0.0,
            contrast_score=0.0,
            edge_density=0.0,
            clutter_anomaly_score=0.0,
            detected_visual_clues=[f"Vision extraction failed: {str(e)}"],
            verdict="Unprocessable image"
        )
