# CleanCity Environmental Complaint CV Engine

Standalone Python package with two independent capabilities:

1. **Stage 1:** zero-shot environmental complaint image classification using local Hugging Face CLIP.
2. **Stage 2:** conservative before/after sanitation proof-of-work visual assessment.

It does not connect to a frontend, database, authentication service, or NLP pipeline.

## Important limitations

- CLIP similarity scores are relative model scores, **not calibrated probabilities**.
- Classification is not severity, urgency, health-risk, legal, location, ownership, or authenticity assessment.
- A CLIP model does not produce object boxes. `visible_objects` is intentionally empty unless a separate detector is integrated.
- The PoW baseline compares image appearance and quality. It does **not** establish worker identity, exact location, timestamp authenticity, or who performed the work.
- The default PoW verifier deliberately returns `inconclusive` unless an issue-specific semantic `issue_detector` is injected. This avoids pretending that generic pixel differences prove cleanup.
- Ward Officer review remains the final authority. The module never automatically approves or rejects a worker submission.

## Requirements and installation

Python 3.10+ is recommended.

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -e ".[clip,test]"
```

The first real Stage 1 inference downloads the selected checkpoint and processor from Hugging Face and caches them locally. The baseline is `openai/clip-vit-base-patch32`; download size varies with library/cache format and should be checked on the model card before deployment. CPU inference is supported but slower; a compatible CUDA GPU can accelerate inference. Tests do not instantiate the model or download weights.

## Stage 1: classify one image

```bash
cleancity-cv classify path/to/complaint.jpg
```

Or from Python:

```python
from environmental_complaint_ai.cv import ImageInferenceEngine
engine = ImageInferenceEngine()
result = engine.analyze("complaint.jpg")
```

Supported extensions: JPG, JPEG, PNG, WEBP, BMP. Invalid paths, unsupported formats, and corrupt files return structured errors.

Categories include garbage accumulation, overflowing dustbins, sewage leakage, waterlogging, water pollution, air pollution, illegal dumping, construction waste, dead animals, public sanitation issues, and unsupported/uncertain.

The classifier rejects predictions if the top score is below `minimum_score`, the top-two margin is below `minimum_margin`, or the unrelated-image candidate ranks first. Thresholds are configurable and require validation on a representative labelled dataset.

Output contains ranked relative scores, selected category, support status, visible object field, observations, model name, and error.

## Stage 2: before/after PoW

```bash
cleancity-cv verify-pow before.jpg after.jpg --category garbage_accumulation
```

Python interface:

```python
from environmental_complaint_ai.pow import ProofOfWorkVerifier
verifier = ProofOfWorkVerifier()
result = verifier.verify(
    "before.jpg", "after.jpg",
    complaint_category="garbage_accumulation",
    expected_task="Remove accumulated waste",
)
```

The verifier validates both images, reports quality diagnostics, checks coarse scene similarity, and reports visual change. The default baseline does not claim that issue-specific waste is gone: it returns `inconclusive` and requires human review unless an issue-specific detector is supplied.

A detector can be injected as a callable accepting `(PIL_image, complaint_category)` and returning `True` (issue remains visible), `False` (issue not detected), or `None` (cannot tell). A production detector must be trained/validated for each relevant issue and tested across angle, distance, lighting, and obstruction conditions. This injection point keeps the PoW module independently replaceable.

Outcomes are `resolved`, `partially_resolved`, `unresolved`, and `inconclusive`. Inconclusive, ambiguous, and partially resolved results require human review.

## Architecture

- `cv/model.py`: replaceable `VisionModel` interface, CLIP implementation and per-process cache.
- `cv/preprocessing.py`: image preprocessing.
- `cv/inference.py`: classification orchestration and rejection logic.
- `pow/verification.py`: independent PoW API, quality checks and review routing.
- `pow/comparison.py`: coarse scene/change metrics.
- `pow/schemas.py`: stable output shape.
- `utils/image_utils.py`: shared image validation and diagnostics.
- `evaluation/`: separate CSV templates and evaluation runners.

Replace CLIP by implementing `VisionModel.predict(image)`; the application-facing `ImageInferenceEngine` need not know model internals. Replace or improve PoW semantic analysis by injecting a validated issue detector.

## Evaluation

Add labelled examples to `evaluation/cv/labels_template.csv` and paired examples to `evaluation/pow/pairs_template.csv`. Include clear and borderline examples, unrelated images, diverse camera angles, lighting, distance, backgrounds, and poor-quality cases.

```bash
python evaluation/cv/evaluate.py evaluation/cv/labels_template.csv
python evaluation/pow/evaluate.py evaluation/pow/pairs_template.csv
```

The scripts produce per-record predictions and simple overall accuracy. The PoW default baseline will generally produce inconclusive results without a semantic detector. Expand the reports with per-class precision/recall/F1, confusion matrices, rejection rate, false acceptance, and false rejection when the dataset is large enough. Do not interpret tiny sample metrics as production performance.

## Tests

```bash
pytest -q
```

Tests use fake models and synthetic images; they do not download CLIP weights or call external APIs.

## Example output

Classification:

```json
{
  "status": "success",
  "classification": {
    "selected_category": "garbage_accumulation",
    "supported": true,
    "detected_categories": ["garbage_accumulation"],
    "ranked_category_scores": [
      {"category": "garbage_accumulation", "similarity_score": 0.71}
    ],
    "score_type": "relative_model_similarity_not_calibrated_probability",
    "visible_objects": [],
    "observations": ["Scores are relative similarity scores, not probabilities."]
  },
  "model_name": "openai/clip-vit-base-patch32",
  "error": null
}
```

PoW: see `pow/schemas.py` for the stable core schema. Without a semantic detector, the expected safe result is `inconclusive` with `requires_human_review: true`.

## Known failure cases

CLIP can confuse visually similar categories and may be sensitive to prompt wording, unusual scenes, image quality, and domain shift. The simple scene metric can mistake a major camera-angle change for a different scene or miss subtle scene differences. Blur/brightness thresholds are heuristics. Occlusion, partial framing, weather, and temporary changes can make visual comparison unreliable. Use representative labelled data, human review, and issue-specific models before operational use.
