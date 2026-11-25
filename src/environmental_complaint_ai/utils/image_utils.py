"""Shared image loading and quality checks."""
from pathlib import Path
from PIL import Image, UnidentifiedImageError, ImageStat
import numpy as np

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

class ImageValidationError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message

def load_image(path: str | Path) -> Image.Image:
    p = Path(path)
    if not p.exists() or not p.is_file():
        raise ImageValidationError("file_not_found", f"Image file not found: {p}")
    if p.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ImageValidationError("unsupported_format", f"Unsupported image extension: {p.suffix}")
    try:
        with Image.open(p) as im:
            im.verify()
        with Image.open(p) as im:
            image = im.convert("RGB")
            image.load()
            if image.width < 2 or image.height < 2:
                raise ImageValidationError("empty_image", "Image dimensions are too small.")
            return image
    except ImageValidationError:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ImageValidationError("invalid_image", f"Image is corrupt or unreadable: {exc}") from exc

def image_quality(image: Image.Image) -> dict:
    arr = np.asarray(image.convert("L"), dtype=np.uint8)
    brightness = float(arr.mean())
    contrast = float(arr.std())
    # Laplacian variance is a simple blur indicator, not a universal quality score.
    try:
        import cv2
        blur_score = float(cv2.Laplacian(arr, cv2.CV_64F).var())
    except Exception:
        blur_score = None
    issues = []
    if brightness < 35:
        issues.append("too_dark")
    if brightness > 225:
        issues.append("overexposed")
    if blur_score is not None and blur_score < 25:
        issues.append("possibly_blurry")
    if min(image.size) < 96:
        issues.append("low_resolution")
    return {
        "width": image.width, "height": image.height,
        "brightness_mean": round(brightness, 2),
        "contrast_std": round(contrast, 2),
        "blur_score": round(blur_score, 2) if blur_score is not None else None,
        "issues": issues,
        "quality": "poor" if issues else "acceptable",
    }
