"""Preprocessing helpers kept separate from model internals."""
from PIL import Image

def prepare_image(image: Image.Image, max_side: int = 1024) -> Image.Image:
    image = image.convert("RGB")
    image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    return image
