"""Conservative baseline image-pair comparison.

This is a visual-change heuristic, not a semantic guarantee that a cleanup task
was completed. Human review remains authoritative.
"""
import numpy as np
from PIL import Image, ImageChops, ImageStat

CATEGORY_TERMS = {
    "garbage_accumulation": "visible accumulated waste",
    "overflowing_dustbins": "overflowing waste around a bin",
    "illegal_dumping": "dumped waste",
    "sewage_leakage": "visible sewage leakage or accumulation",
    "waterlogging": "standing water",
    "construction_waste": "construction debris",
    "public_sanitation_issues": "the reported sanitation problem",
    "water_pollution": "visible water pollution",
    "air_pollution": "visible smoke or emissions",
    "dead_animals": "the reported visible animal-related issue",
}

def compare_images(before: Image.Image, after: Image.Image) -> dict:
    # Coarse color/structure descriptors. Resize is for comparison only.
    size = (256, 256)
    b = before.convert("RGB").resize(size)
    a = after.convert("RGB").resize(size)
    diff = ImageChops.difference(b, a)
    diff_mean = float(np.asarray(diff, dtype=np.float32).mean()) / 255.0
    hist_b = np.asarray(b.histogram(), dtype=np.float64)
    hist_a = np.asarray(a.histogram(), dtype=np.float64)
    hist_b /= max(hist_b.sum(), 1)
    hist_a /= max(hist_a.sum(), 1)
    hist_distance = float(np.abs(hist_b - hist_a).sum() / 2.0)
    # Heuristic only: large appearance shift makes correspondence uncertain.
    likely_same = diff_mean < 0.34 and hist_distance < 0.72
    change_detected = diff_mean > 0.035
    return {
        "same_scene_assessment": "likely_same_scene" if likely_same else "possibly_different_scene",
        "visual_change_detected": bool(change_detected),
        "difference_score": round(diff_mean, 4),
        "histogram_distance": round(hist_distance, 4),
    }
