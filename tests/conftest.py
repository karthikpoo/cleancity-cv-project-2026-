from PIL import Image
import pytest

@pytest.fixture
def sample_image(tmp_path):
    p = tmp_path / "sample.png"
    Image.new("RGB", (320, 240), (120, 140, 120)).save(p)
    return p
