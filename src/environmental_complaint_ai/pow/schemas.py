OUTCOMES = {"resolved", "partially_resolved", "unresolved", "inconclusive"}

def make_result(**kwargs):
    base = {
        "status": "success",
        "verification_result": "inconclusive",
        "before_image_quality": None,
        "after_image_quality": None,
        "same_scene_assessment": "unknown",
        "visual_change_detected": False,
        "issue_still_visible": None,
        "observations": [],
        "requires_human_review": True,
        "model_name": "pow_comparison_baseline",
        "error": None,
    }
    base.update(kwargs)
    return {"pow_analysis": base}
