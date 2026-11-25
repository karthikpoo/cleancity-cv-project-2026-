from environmental_complaint_ai.cv.model import load_clip_model

def test_cache_decorator_present():
    assert hasattr(load_clip_model, "cache_info")
