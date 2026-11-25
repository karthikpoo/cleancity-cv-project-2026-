"""Command-line interface."""
import argparse, json
from .cv.inference import ImageInferenceEngine
from .pow.verification import ProofOfWorkVerifier

def main():
    parser = argparse.ArgumentParser(prog="cleancity-cv")
    sub = parser.add_subparsers(dest="command", required=True)
    classify = sub.add_parser("classify", help="Classify one environmental complaint image")
    classify.add_argument("image")
    classify.add_argument("--minimum-score", type=float, default=0.22)
    classify.add_argument("--minimum-margin", type=float, default=0.025)
    powp = sub.add_parser("verify-pow", help="Compare before-and-after sanitation images")
    powp.add_argument("before")
    powp.add_argument("after")
    powp.add_argument("--category", required=True)
    powp.add_argument("--expected-task")
    args = parser.parse_args()
    if args.command == "classify":
        result = ImageInferenceEngine(minimum_score=args.minimum_score,
            minimum_margin=args.minimum_margin).analyze(args.image)
    else:
        result = ProofOfWorkVerifier().verify(args.before, args.after, args.category, args.expected_task)
    print(json.dumps(result, indent=2))
    return 0 if result.get("status") == "success" else 1

if __name__ == "__main__":
    raise SystemExit(main())
