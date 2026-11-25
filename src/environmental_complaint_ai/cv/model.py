"""Replaceable vision-model interface and optional local CLIP implementation."""

from __future__ import annotations

from abc import ABC, abstractmethod
from functools import lru_cache
from typing import Any


class VisionModel(ABC):
    @abstractmethod
    def predict(self, image: Any) -> dict[str, float]:
        """Return category scores (not probabilities)."""


class ClipVisionModel(VisionModel):
    """Zero-shot CLIP model for environmental image classification."""

    DEFAULT_CHECKPOINT = "openai/clip-vit-base-patch32"

    def __init__(
        self,
        checkpoint: str = DEFAULT_CHECKPOINT,
        device: str | None = None
    ):
        try:
            import torch
            from transformers import CLIPModel, CLIPProcessor

        except ImportError as exc:
            raise RuntimeError(
                "CLIP dependencies are missing. "
                "Install with: pip install -e '.[clip]'"
            ) from exc

        self.checkpoint = checkpoint

        self.device = device or (
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        self._torch = torch

        self._processor = CLIPProcessor.from_pretrained(checkpoint)

        self._model = CLIPModel.from_pretrained(
            checkpoint
        ).to(self.device)

        self._model.eval()

    def predict(self, image):

        labels = list(PROMPTS.keys())

        inputs = self._processor(
            text=[PROMPTS[label] for label in labels],
            images=image,
            return_tensors="pt",
            padding=True
        )

        inputs = {
            key: value.to(self.device)
            for key, value in inputs.items()
        }

        with self._torch.no_grad():

            outputs = self._model(**inputs)

            scores = (
                outputs.logits_per_image[0]
                .softmax(dim=0)
                .detach()
                .cpu()
                .tolist()
            )

        return dict(zip(labels, map(float, scores)))


# Environmental complaint categories

PROMPTS = {

    "garbage_accumulation": (
        "A photograph of loose garbage, litter, plastic bags, "
        "paper and waste scattered in piles on the ground, "
        "not overflowing from a rubbish bin."
    ),

    "overflowing_dustbins": (
        "A photograph of a clearly visible public rubbish bin "
        "that is full beyond its capacity, with garbage visibly "
        "spilling over the rim or falling out of the bin."
    ),

    "sewage_leakage": (
        "A photograph showing sewage water leaking from a drain, "
        "sewer pipe or manhole onto a public road."
    ),

    "waterlogging": (
        "A photograph showing rainwater or floodwater standing "
        "on a road or public area."
    ),

    "water_pollution": (
        "A photograph showing polluted water in a lake, river, "
        "pond or drainage channel."
    ),

    "air_pollution": (
        "A photograph showing visible smoke or emissions "
        "coming from vehicles or factories."
    ),

    "illegal_dumping": (
        "A photograph of a pile of waste left in an open public "
        "space, roadside or vacant land, away from a designated bin."
    ),

    "construction_waste": (
        "A photograph showing discarded construction materials "
        "such as bricks, concrete rubble and broken tiles."
    ),

    "dead_animals": (
        "A photograph showing a dead animal lying in a public area."
    ),

    "public_sanitation_issues": (
        "A photograph showing an unclean public toilet or "
        "poor public sanitation conditions."
    ),

    "unsupported_uncertain": (
        "An ordinary photograph unrelated to environmental "
        "complaints, such as landscapes, food, vehicles or rooms."
    ),
}


# Load and cache the CLIP model

@lru_cache(maxsize=4)
def load_clip_model(
    checkpoint: str = ClipVisionModel.DEFAULT_CHECKPOINT,
    device: str | None = None
):
    """Cache one model per checkpoint and device."""

    return ClipVisionModel(
        checkpoint=checkpoint,
        device=device
    )