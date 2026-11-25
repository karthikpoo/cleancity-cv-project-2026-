"""Run PoW evaluation against manually labelled image pairs."""
import argparse, csv, json
from pathlib import Path
from environmental_complaint_ai.pow.verification import ProofOfWorkVerifier

def main():
    p = argparse.ArgumentParser()
    p.add_argument("csv_file")
    p.add_argument("--output", default="pow_evaluation_results.json")
    args = p.parse_args()
    verifier = ProofOfWorkVerifier()
    rows, correct = [], 0
    with open(args.csv_file, newline="", encoding="utf-8") as f:
        for item in csv.DictReader(f):
            result = verifier.verify(item["before_image_path"], item["after_image_path"],
                                     item["complaint_category"], item.get("expected_task"))
            predicted = result["pow_analysis"]["verification_result"]
            ok = predicted == item["expected_result"]
            correct += int(ok)
            rows.append({"expected": item["expected_result"], "predicted": predicted,
                         "correct": ok, "result": result})
    report = {"count": len(rows), "accuracy": correct / len(rows) if rows else None,
              "warning": "Baseline defaults to inconclusive unless a semantic issue_detector is supplied.",
              "predictions": rows}
    Path(args.output).write_text(json.dumps(report, indent=2), encoding="utf-8")
if __name__ == "__main__": main()
