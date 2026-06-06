#!/usr/bin/env python3
"""Submission readiness gate for Escrowa.

Run from the repo root:  ./scripts/check_submission_readiness.py

Checks two things:
  1. No leftover angle-bracket placeholders survive in any shipped doc.
  2. Every mandatory deliverable (BUGS.md, DEMO.md, ARCHITECTURE.md, bench.py, …) exists.

Exits non-zero if anything is missing so CI can gate on it.
"""
import os
import sys

# Resolve paths relative to the repo root (parent of this scripts/ dir),
# so the gate works no matter what directory it's invoked from.
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PLACEHOLDERS = ["<repo>", "<vercel-url>", "<link>", "<explorer-link>", "<ref>"]

# Docs that are actually shipped in this repo (relative to REPO_ROOT).
DOCS_TO_SCAN = [
    "README.md",
    "BUGS.md",
    "docs/ARCHITECTURE.md",
    "docs/DEMO.md",
    "docs/PRODUCTION_PLAN.md",
    "docs/SPONSOR_DEFENSE.md",
    "board/README.md",
    "contract/README.md",
]

# Files that MUST exist for the submission to be considered ready.
REQUIRED_DELIVERABLES = [
    "BUGS.md",
    "docs/DEMO.md",
    "docs/ARCHITECTURE.md",
    "scripts/bench.py",
    "scripts/check_submission_readiness.py",
]


def main():
    errors = 0

    print("🔍 Checking mandatory deliverables exist...")
    for rel in REQUIRED_DELIVERABLES:
        if not os.path.exists(os.path.join(REPO_ROOT, rel)):
            print(f"❌ Missing required deliverable: '{rel}'")
            errors += 1

    print("🔍 Checking shipped docs for leftover placeholders...")
    for rel in DOCS_TO_SCAN:
        path = os.path.join(REPO_ROOT, rel)
        if not os.path.exists(path):
            # Not every optional doc has to be present; only deliverables are enforced above.
            continue
        try:
            with open(path, "r") as f:
                content = f.read()
        except Exception as e:  # pragma: no cover - defensive
            print(f"⚠️  Warning: could not read '{rel}': {e}")
            continue
        for p in PLACEHOLDERS:
            if p in content:
                print(f"❌ Placeholder '{p}' still present in '{rel}'")
                errors += 1

    if errors > 0:
        print(f"\n❌ Found {errors} issue(s). Fix them before submission.")
        sys.exit(1)

    print("\n✅ All deliverables present and no placeholders found. Ready for submission!")
    sys.exit(0)


if __name__ == "__main__":
    main()
