#!/usr/bin/env python3
"""Snapshot every canonical game-page GoatCounter count into CSV, read-only.

No GoatCounter admin token. Run from repo root:
    python scripts/export-goatcounter-game-counts.py --output goatcounter-game-views.csv

GoatCounter public counters may be cached for up to 4 hours. The report is
a dated snapshot, while the individual game page widgets fetch current
available counts directly from GoatCounter.
"""
import argparse
import concurrent.futures
import csv
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

BASE = "https://cheekycommodoregamer.goatcounter.com/counter/"
TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
CANONICAL = re.compile(
    r'<link\s+rel=["\']canonical["\'][^>]*href=["\']https://www\.cheekycommodoregamer\.co\.uk(/games/[a-z0-9-]+/)', re.I
)


def discover(root):
    result = []
    for page in sorted((root / "games").glob("*/index.html")):
        html = page.read_text("utf-8", errors="replace")
        if not re.search(r'data-ccg-page=["\']single-game["\']', html):
            continue
        match = CANONICAL.search(html)
        if not match:
            raise ValueError("Missing canonical game URL: " + str(page))
        title = TITLE.search(html)
        result.append((match.group(1), re.sub(r"\s+", " ", title.group(1)).strip() if title else page.parent.name))
    return result


def fetch_one(entry):
    path, title = entry
    url = BASE + quote(path, safe="") + ".json"
    # On 404, GoatCounter returns JSON count 0 for an unrecorded path.
    for n in range(3):
        try:
            with urlopen(Request(url, headers={"User-Agent": "CCG-public-count-export/1.0"}),
                         timeout=22) as response:
                raw = response.read(2000)
                status = response.status
            break
        except HTTPError as error:
            raw = error.read(2000)
            status = error.code
            if status not in (404,):
                if n < 2:
                    time.sleep(2 * (n + 1))
                    continue
                raise
            break
        except (URLError, TimeoutError):
            if n == 2:
                raise
            time.sleep(2 * (n + 1))
    if status not in (200, 404):
        raise ValueError(f"{path}: HTTP {status}")
    result = json.loads(raw)
    count = result.get("count")
    if not isinstance(count, str) or not re.match(r"^\d[\d,.\s]*$", count):
        raise ValueError(f"{path}: unexpected public counter response")
    return path, title, int(re.sub(r"[^\d]", "", count)), status


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--output", default="goatcounter-game-views.csv")
    args = parser.parse_args()
    pages = discover(Path(args.root))
    if not pages:
        raise SystemExit("No canonical game pages found; not exporting an empty report")
    rows, errors = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        future_to_entry = {executor.submit(fetch_one, entry): entry for entry in pages}
        for future in concurrent.futures.as_completed(future_to_entry):
            try:
                rows.append(future.result())
            except Exception as err:
                errors.append((future_to_entry[future][0], str(err)))
    if errors:
        for path, err in errors[:18]:
            print(f"FAILED {path}: {err}", file=sys.stderr)
        raise SystemExit(f"{len(errors)} API failures; refusing incomplete export")
    rows.sort(key=lambda row: row[0])
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["Game page path", "Game title", "GoatCounter recorded visits", "Counter HTTP status"])
        writer.writerows(rows)
    print(f"Exported {len(rows)} canonical games; {sum(r[2] for r in rows)} summed per-game visits; output {output}")


if __name__ == "__main__":
    main()
