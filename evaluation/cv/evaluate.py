"""Run classification against a manually labelled CSV. Requires installed CLIP extras."""
import argparse, csv, json
from pathlib import Path
from collections import defaultdict
from environmental_complaint_ai.cv.inference import ImageInferenceEngine

def main():
    p = argparse.ArgumentParser()
    p.add_argument("csv_file")
    p.add_argument("--output", default="cv_evaluation_results.json")
    args = p.parse_args()
    engine = ImageInferenceEngine()
    rows, correct = [], 0
    with open(args.csv_file, newline="", encoding="utf-8") as f:
        for item in csv.DictReader(f):
            pred = engine.analyze(item["image_path"])
            chosen = (pred.get("classification") or {}).get("selected_category")
            ok = chosen == item["expected_category"]
            correct += int(ok)
            rows.append({"image_path": item["image_path"], "expected": item["expected_category"],
                         "predicted": chosen, "correct": ok, "result": pred})
    report = {"count": len(rows), "accuracy": correct / len(rows) if rows else None,
              "warning": "Small manually selected datasets do not establish production accuracy.",
              "predictions": rows}
    Path(args.output).write_text(json.dumps(report, indent=2), encoding="utf-8")
if __name__ == "__main__": main()
