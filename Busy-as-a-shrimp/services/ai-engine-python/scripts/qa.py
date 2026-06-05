#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import compileall
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_DIR = ROOT / "app"
TESTS_DIR = ROOT / "tests"
SCRIPTS_DIR = ROOT / "scripts"


def _iter_python_files() -> list[Path]:
    files: list[Path] = []
    for directory in (APP_DIR, TESTS_DIR, SCRIPTS_DIR):
        if not directory.exists():
            continue
        for path in directory.rglob("*.py"):
            if "__pycache__" in path.parts:
                continue
            files.append(path)
    return sorted(files)


def _lint() -> int:
    files = _iter_python_files()
    issues: list[str] = []

    if not files:
        print("[qa:lint] No Python files found.")
        return 0

    for path in files:
        rel = path.relative_to(ROOT)
        try:
            source = path.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError as exc:
            issues.append(f"{rel}:1:1 non-utf8 file ({exc})")
            continue

        try:
            tree = ast.parse(source, filename=str(path))
        except SyntaxError as exc:
            issues.append(f"{rel}:{exc.lineno or 1}:{exc.offset or 1} syntax error: {exc.msg}")
            continue

        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                if any(alias.name == "*" for alias in node.names):
                    issues.append(
                        f"{rel}:{node.lineno}:1 wildcard import is not allowed"
                    )

    if issues:
        print("[qa:lint] FAILED")
        for issue in issues:
            print(f"  - {issue}")
        return 1

    print(f"[qa:lint] OK ({len(files)} files checked)")
    return 0


def _test() -> int:
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))

    if not TESTS_DIR.exists():
        print("[qa:test] No tests directory found.")
        return 0

    suite = unittest.defaultTestLoader.discover(str(TESTS_DIR), pattern="test_*.py")
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


def _build() -> int:
    targets = [APP_DIR, TESTS_DIR, SCRIPTS_DIR]
    for target in targets:
        if not target.exists():
            continue
        ok = compileall.compile_dir(str(target), force=False, quiet=1)
        if not ok:
            print(f"[qa:build] FAILED while compiling {target.relative_to(ROOT)}")
            return 1
    print("[qa:build] OK")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="QA entrypoint for ai-engine-python")
    parser.add_argument("command", choices=["lint", "test", "build"])
    args = parser.parse_args()

    if args.command == "lint":
        return _lint()
    if args.command == "test":
        return _test()
    return _build()


if __name__ == "__main__":
    raise SystemExit(main())
