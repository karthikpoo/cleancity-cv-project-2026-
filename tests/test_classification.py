from environmental_complaint_ai.cv.inference import ImageInferenceEngine

class FakeModel:
    checkpoint = "fake"
    def predict(self, image):
        return {"garbage_accumulation": 0.8, "illegal_dumping": 0.1, "unsupported_uncertain": 0.1}

class AmbiguousModel:
    def predict(self, image):
        return {"garbage_accumulation": 0.40, "illegal_dumping": 0.39, "unsupported_uncertain": 0.21}

def test_classification_schema(sample_image):
    result = ImageInferenceEngine(model=FakeModel()).analyze(sample_image)
    assert result["status"] == "success"
    assert result["classification"]["selected_category"] == "garbage_accumulation"
    assert result["classification"]["supported"] is True

def test_low_margin_rejected(sample_image):
    result = ImageInferenceEngine(model=AmbiguousModel(), minimum_margin=0.03).analyze(sample_image)
    assert result["classification"]["selected_category"] == "unsupported_uncertain"
