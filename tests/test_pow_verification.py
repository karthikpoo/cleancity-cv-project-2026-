from PIL import Image
from environmental_complaint_ai.pow.verification import ProofOfWorkVerifier

def test_without_semantic_detector_is_inconclusive(sample_image, tmp_path):
    after = tmp_path / "after.png"
    Image.new("RGB", (320, 240), (122, 142, 122)).save(after)
    result = ProofOfWorkVerifier().verify(sample_image, after, "garbage_accumulation")
    assert result["pow_analysis"]["verification_result"] == "inconclusive"
    assert result["pow_analysis"]["requires_human_review"] is True

def test_detector_can_assess_outcome(sample_image, tmp_path):
    after = tmp_path / "after.png"
    Image.new("RGB", (320, 240), (120, 140, 120)).save(after)
    verifier = ProofOfWorkVerifier(issue_detector=lambda image, category: False)
    result = verifier.verify(sample_image, after, "garbage_accumulation")
    assert result["pow_analysis"]["verification_result"] in {"resolved", "inconclusive"}
