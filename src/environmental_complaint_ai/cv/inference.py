"""Classification application layer; independent of CLIP implementation details."""
from __future__ import annotations
from pathlib import Path
from .preprocessing import prepare_image
from .model import load_clip_model
from ..utils.image_utils import load_image, ImageValidationError

class ImageInferenceEngine:
    def __init__(self, model=None, *, checkpoint=None, device=None,
                 minimum_score=0.22, minimum_margin=0.025):
        self.model = model or load_clip_model(
            checkpoint or "openai/clip-vit-base-patch32", device
        )
        self.minimum_score = minimum_score
        self.minimum_margin = minimum_margin

    def analyze(self, image_path: str | Path) -> dict:
        try:
            image = prepare_image(load_image(image_path))
            scores = self.model.predict(image)
            ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
            if not ranked:
                return {"status": "error", "error": {"code": "empty_predictions", "message": "Model returned no category scores."}}
            top_label, top_score = ranked[0]
            second_score = ranked[1][1] if len(ranked) > 1 else 0.0
            margin = top_score - second_score
            rejected = (
                top_label == "unsupported_uncertain"
                or top_score < self.minimum_score
                or margin < self.minimum_margin
            )
            selected = "unsupported_uncertain" if rejected else top_label
            return {
                "status": "success",
                "classification": {
                    "selected_category": selected,
                    "supported": not rejected,
                    "detected_categories": [] if rejected else [top_label],
                    "ranked_category_scores": [
                        {"category": label, "similarity_score": round(float(score), 6)}
                        for label, score in ranked
                    ],
                    "score_type": "relative_model_similarity_not_calibrated_probability",
                    "observations": [
                        "Scores represent relative CLIP text-image similarity after softmax, not calibrated probabilities.",
                        "No object boxes or severity, health-risk, legal, location, ownership or authenticity claims are produced."
                    ],
                    "visible_objects": [],
                },
                "model_name": getattr(self.model, "checkpoint", self.model.__class__.__name__),
                "error": None,
            }
        except ImageValidationError as exc:
            return {"status": "error", "classification": None,
                    "error": {"code": exc.code, "message": exc.message}}
        except Exception as exc:
            return {"status": "error", "classification": None,
                    "error": {"code": "inference_error", "message": str(exc)}}
