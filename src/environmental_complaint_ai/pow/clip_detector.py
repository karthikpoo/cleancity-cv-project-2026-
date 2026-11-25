"""Experimental CLIP-based issue assessment for Proof-of-Work."""

from ..cv.model import load_clip_model
from ..cv.preprocessing import prepare_image


class ClipIssueDetector:

    RELATED_CATEGORIES = {
        "illegal_dumping": {"illegal_dumping", "garbage_accumulation"},
        "garbage_accumulation": {"garbage_accumulation", "illegal_dumping"},
        "overflowing_dustbins": {"overflowing_dustbins"},
        "construction_waste": {"construction_waste"},
        "sewage_leakage": {"sewage_leakage"},
        "waterlogging": {"waterlogging"},
        "water_pollution": {"water_pollution"},
        "air_pollution": {"air_pollution"},
        "dead_animals": {"dead_animals"},
        "public_sanitation_issues": {"public_sanitation_issues"},
    }

    def __init__(self, model=None, minimum_score=0.22,
                 minimum_margin=0.025):
        self.model = model
        self.minimum_score = minimum_score
        self.minimum_margin = minimum_margin

    def __call__(self, image, category):

        if self.model is None:
            self.model = load_clip_model()

        category = str(category or "").strip().lower()

        if category not in self.RELATED_CATEGORIES:
            return None

        image = prepare_image(image)
        scores = self.model.predict(image)

        # Temporary debugging output
        print("\n========== PoW CLIP DEBUG ==========")
        print("Complaint category:", category)
        print("CLIP scores:", scores)
        print("===================================\n")

        if not scores:
            return None

        ranked = sorted(
            scores.items(),
            key=lambda item: item[1],
            reverse=True
        )

        top_category, top_score = ranked[0]

        second_score = ranked[1][1] if len(ranked) > 1 else 0.0
        margin = top_score - second_score

        if (
            top_score < self.minimum_score
            or margin < self.minimum_margin
        ):
            return None

        if top_category in self.RELATED_CATEGORIES[category]:
            return True

        return None