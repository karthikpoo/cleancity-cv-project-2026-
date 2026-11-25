"""Stable output helpers."""
from dataclasses import asdict, dataclass
from typing import Any

@dataclass
class ErrorOutput:
    status: str
    error: dict[str, str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
