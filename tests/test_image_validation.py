from environmental_complaint_ai.utils.image_utils import load_image, ImageValidationError

def test_valid_image(sample_image):
    assert load_image(sample_image).size == (320, 240)

def test_missing_image(tmp_path):
    try:
        load_image(tmp_path / "missing.jpg")
        assert False
    except ImageValidationError as exc:
        assert exc.code == "file_not_found"

def test_unsupported_extension(tmp_path):
    p = tmp_path / "x.txt"
    p.write_text("not an image")
    try:
        load_image(p)
        assert False
    except ImageValidationError as exc:
        assert exc.code == "unsupported_format"

def test_corrupt_image(tmp_path):
    p = tmp_path / "bad.jpg"
    p.write_bytes(b"not image data")
    try:
        load_image(p)
        assert False
    except ImageValidationError as exc:
        assert exc.code == "invalid_image"
