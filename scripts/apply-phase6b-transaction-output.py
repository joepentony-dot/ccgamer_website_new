#!/usr/bin/env python3
"""Increase Phase 6B transaction diagnostics during workflow validation."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "scripts" / "phase6b_games_editor_transaction.py"
source = PATH.read_text(encoding="utf-8")
next_source = source.replace('"output_tail": output[-12000:]', '"output_tail": output[-60000:]')
next_source = next_source.replace('"output_tail": output[-12000:],', '"output_tail": output[-60000:],')
if next_source == source:
    if '"output_tail": output[-60000:]' not in source:
        raise SystemExit("Could not locate Phase 6B output-tail anchors.")
else:
    PATH.write_text(next_source, encoding="utf-8")
    print("Expanded Phase 6B transaction diagnostics.")
