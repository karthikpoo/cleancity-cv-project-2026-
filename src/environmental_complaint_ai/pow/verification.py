"""Independent before/after sanitation proof-of-work assessment."""

from ..utils.image_utils import (
    load_image,
    image_quality,
    ImageValidationError,
)
from .comparison import compare_images, CATEGORY_TERMS
from .schemas import make_result


class ProofOfWorkVerifier:
    def __init__(self, issue_detector=None):
        """
        issue_detector(image, category) must return:

        True  = issue detected
        False = issue not detected
        None  = detector is uncertain
        """
        self.issue_detector = issue_detector

    def verify(
        self,
        before_image_path,
        after_image_path,
        complaint_category,
        expected_task=None,
    ):
        # 1. Load and validate images
        try:
            before = load_image(before_image_path)
            after = load_image(after_image_path)

        except ImageValidationError as exc:
            return make_result(
                status="error",
                verification_result="inconclusive",
                issue_still_visible=None,
                observations=[
                    "Both images must be valid and readable."
                ],
                requires_human_review=True,
                error={
                    "code": exc.code,
                    "message": exc.message,
                },
            )

        # 2. Check image quality
        before_quality = image_quality(before)
        after_quality = image_quality(after)

        # 3. Compare before and after images
        comparison = compare_images(before, after)

        common = {
            "before_image_quality": before_quality,
            "after_image_quality": after_quality,
            "same_scene_assessment":
                comparison["same_scene_assessment"],
            "visual_change_detected":
                comparison["visual_change_detected"],
        }

        observations = []

        # 4. Reject poor-quality images
        if (
            before_quality["quality"] == "poor"
            or after_quality["quality"] == "poor"
        ):
            observations.append(
                "One or both images have poor quality."
            )

            return make_result(
                **common,
                verification_result="inconclusive",
                issue_still_visible=None,
                observations=observations,
                requires_human_review=True,
            )

        # 5. Check whether both images show the same scene
        if (
            comparison["same_scene_assessment"]
            != "likely_same_scene"
        ):
            observations.append(
                "The images may show different scenes "
                "or substantially different framing."
            )

            return make_result(
                **common,
                verification_result="inconclusive",
                issue_still_visible=None,
                observations=observations,
                requires_human_review=True,
            )

        # 6. Validate complaint category
        category = str(
            complaint_category or ""
        ).strip().lower()

        if category not in CATEGORY_TERMS:
            observations.append(
                "Unsupported or missing complaint category."
            )

            return make_result(
                **common,
                verification_result="inconclusive",
                issue_still_visible=None,
                observations=observations,
                requires_human_review=True,
            )

        # 7. Check whether an issue detector is configured
        if self.issue_detector is None:
            observations.append(
                "No category-specific issue detector "
                "is configured."
            )

            observations.append(
                "Visual change alone cannot confirm "
                "that the reported issue was removed."
            )

            observations.append(
                "Ward Officer review is required."
            )

            return make_result(
                **common,
                verification_result="inconclusive",
                issue_still_visible=None,
                observations=observations,
                requires_human_review=True,
            )

        # 8. Detect the issue in both images
        try:
            before_issue = self.issue_detector(
                before,
                category,
            )

            after_issue = self.issue_detector(
                after,
                category,
            )

        except Exception:
            observations.append(
                "The issue detector encountered an error."
            )

            return make_result(
                **common,
                verification_result="inconclusive",
                issue_still_visible=None,
                observations=observations,
                requires_human_review=True,
            )

        # 9. Validate detector output
        valid_results = (True, False, None)

        if (
            before_issue not in valid_results
            or after_issue not in valid_results
        ):
            observations.append(
                "The issue detector returned an invalid result."
            )

            return make_result(
                **common,
                verification_result="inconclusive",
                issue_still_visible=None,
                observations=observations,
                requires_human_review=True,
            )

        # 10. Handle uncertain detector results
        if before_issue is None or after_issue is None:
            observations.append(
                "The detector could not reliably assess "
                "the issue in both images."
            )

            observations.append(
                "Ward Officer review is required."
            )

            return make_result(
                **common,
                verification_result="inconclusive",
                issue_still_visible=(
                    bool(after_issue)
                    if after_issue is not None
                    else None
                ),
                observations=observations,
                requires_human_review=True,
            )

        visual_change = comparison["visual_change_detected"]

        # 11. Confirm the issue was present before cleanup
        if before_issue is False:
            observations.append(
                "The reported issue was not detected "
                "in the before-image."
            )

            return make_result(
                **common,
                verification_result="inconclusive",
                issue_still_visible=bool(after_issue),
                observations=observations,
                requires_human_review=True,
            )

        # 12. Determine verification outcome
        if after_issue is True and visual_change:
            outcome = "partially_resolved"

            observations.append(
                "Visual changes were detected, but "
                "the reported issue remains visible."
            )

        elif after_issue is True:
            outcome = "unresolved"

            observations.append(
                "The reported issue remains visible, "
                "and meaningful visual improvement "
                "was not detected."
            )

        elif after_issue is False and visual_change:
            outcome = "resolved"

            observations.append(
                "The detector did not find the reported "
                "issue in the after-image, and visual "
                "change was detected."
            )

        else:
            outcome = "inconclusive"

            observations.append(
                "The issue was not detected in the "
                "after-image, but sufficient visual "
                "change evidence is unavailable."
            )

        # 13. Return final result
        return make_result(
            **common,
            verification_result=outcome,
            issue_still_visible=bool(after_issue),
            observations=observations,
            requires_human_review=(
                outcome in {
                    "inconclusive",
                    "partially_resolved",
                }
            ),
        )