#!/usr/bin/env python3
"""Warn when code changes likely require .kiro/steering review.

The check is intentionally non-blocking. It prints a reminder and exits 0 so
commits are not stopped by documentation drift heuristics.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import PurePosixPath


STEERING_PREFIX = ".kiro/steering/"

WATCHED_PREFIXES = (
    "backend/routes/",
    "frontend/api/",
    "frontend/hooks/",
    "frontend/lib/",
    "frontend/src/routes/",
)

WATCHED_FILES = {
    "backend/database.py",
    "database/schema.sql",
    "frontend/server.ts",
    "frontend/types.ts",
    "frontend/components/common/AppCard.tsx",
    "frontend/components/common/CategoryAccentCard.tsx",
    "frontend/styles/tokens.ts",
    "render.yaml",
}

WATCHED_SUFFIXES = (
    ".kiro/specs/",
)


def run_git(args: list[str]) -> list[str]:
    result = subprocess.run(
        ["git", *args],
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        print(result.stderr.strip(), file=sys.stderr)
        return []
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def normalize(path: str) -> str:
    return PurePosixPath(path.replace("\\", "/")).as_posix()


def changed_files(mode: str) -> list[str]:
    if mode == "staged":
        return run_git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
    if mode == "unstaged":
        return run_git(["diff", "--name-only", "--diff-filter=ACMR"])

    staged = run_git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
    unstaged = run_git(["diff", "--name-only", "--diff-filter=ACMR"])
    untracked = run_git(["ls-files", "--others", "--exclude-standard"])
    return sorted(set(staged + unstaged + untracked))


def is_watched(path: str) -> bool:
    return (
        path in WATCHED_FILES
        or any(path.startswith(prefix) for prefix in WATCHED_PREFIXES)
        or any(path.startswith(prefix) for prefix in WATCHED_SUFFIXES)
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        choices=("staged", "unstaged", "all"),
        default="staged",
        help="Which changed files to inspect.",
    )
    args = parser.parse_args()

    files = [normalize(path) for path in changed_files(args.mode)]
    watched = [path for path in files if is_watched(path)]
    steering = [path for path in files if path.startswith(STEERING_PREFIX)]

    if not watched:
        print("[steering] No steering-sensitive changes detected.")
        return 0

    print("[steering] Steering-sensitive changes detected:")
    for path in watched[:20]:
        print(f"  - {path}")
    if len(watched) > 20:
        print(f"  ... and {len(watched) - 20} more")

    if steering:
        print("[steering] Steering files are also changed; review looks accounted for.")
        return 0

    print(
        "[steering] Reminder: review .kiro/steering for API contracts, "
        "schema changes, route behavior, shared UI rules, or architecture notes."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
