#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
lemon_metadata.py
Scrape metadata from Lemon64 and LemonAmiga pages referenced in games.json.

- DOES NOT modify games.json
- Produces data/lemon-metadata.json (by default)

Usage examples:
  python scripts/lemon_metadata.py
  python scripts/lemon_metadata.py --sleep 1.2 --limit 50
  python scripts/lemon_metadata.py --start 200 --limit 100
  python scripts/lemon_metadata.py --no-cache
  python scripts/lemon_metadata.py --dry-run
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import re
import sys
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple, Union

import requests
from bs4 import BeautifulSoup


# ----------------------------
# Config / constants
# ----------------------------

DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

# We normalize these label variants into canonical keys
LABEL_MAP = {
    "released": "released",
    "release": "released",
    "year": "released",

    "publisher": "publisher",
    "publishers": "publisher",

    "developer": "developer",
    "developers": "developer",

    "re-releaser": "re_releaser",
    "rereleaser": "re_releaser",
    "re releaser": "re_releaser",
    "re-release": "re_releaser",
    "re-release company": "re_releaser",

    "producer": "producer",
    "producers": "producer",

    "coder": "coder",
    "coders": "coder",
    "programmer": "coder",
    "programmers": "coder",

    "graphics": "graphics",
    "graphic": "graphics",
    "artist": "graphics",
    "artists": "graphics",

    "musician": "musician",
    "music": "musician",
    "composer": "musician",
    "composers": "musician",
    "sound": "musician",
}

CANONICAL_KEYS = [
    "released",
    "publisher",
    "developer",
    "re_releaser",
    "producer",
    "coder",
    "graphics",
    "musician",
]

LIST_KEYS = {"publisher", "re_releaser", "coder", "graphics", "musician"}


# ----------------------------
# Helpers
# ----------------------------

def eprint(*args: Any) -> None:
    print(*args, file=sys.stderr)


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def read_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: str, data: Any) -> None:
    ensure_dir(os.path.dirname(path))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)


def sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()


def clean_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def normalize_label(label: str) -> str:
    """
    Lower, strip punctuation/colon, collapse spaces.
    """
    label = label.lower().strip()
    label = label.replace("\xa0", " ")
    label = re.sub(r"[:\s]+$", "", label)  # strip trailing ':' and whitespace
    label = re.sub(r"[^a-z0-9\s\-]", "", label)
    label = label.replace("-", " ")
    label = clean_ws(label)
    return label


def canonical_key(label: str) -> Optional[str]:
    nl = normalize_label(label)
    if nl in LABEL_MAP:
        return LABEL_MAP[nl]
    return None


def parse_year(text: str) -> Optional[int]:
    """
    Extract 4-digit year from a string like:
    "1986 (40 years ago)" or "1990"
    """
    m = re.search(r"\b(19\d{2}|20\d{2})\b", text)
    if not m:
        return None
    try:
        return int(m.group(1))
    except ValueError:
        return None


def split_people(text: str) -> List[str]:
    """
    Split credit names conservatively.
    Handles: "Nick Jones", "Nick Jones / Someone", "Nick Jones, Someone", "Nick Jones & Someone"
    """
    text = clean_ws(text)
    if not text:
        return []
    # Common separators
    parts = re.split(r"\s*(?:/|,|&|\+| and )\s*", text, flags=re.IGNORECASE)
    out = []
    for p in parts:
        p = clean_ws(p)
        if not p:
            continue
        # Remove trailing noise like "Info" fragments that sometimes appear in scraped text
        p = re.sub(r"\binfo\b.*$", "", p, flags=re.IGNORECASE).strip()
        p = re.sub(r"\blogo\b.*$", "", p, flags=re.IGNORECASE).strip()
        p = clean_ws(p)
        if p and p.lower() not in {"-", "n/a", "unknown"}:
            out.append(p)
    # de-dup while preserving order
    seen = set()
    dedup = []
    for x in out:
        lx = x.lower()
        if lx not in seen:
            seen.add(lx)
            dedup.append(x)
    return dedup


def merge_values(existing: Any, new: Any, is_list: bool) -> Any:
    if is_list:
        ex_list = existing if isinstance(existing, list) else ([] if existing in (None, "", 0) else [existing])
        new_list = new if isinstance(new, list) else ([] if new in (None, "", 0) else [new])
        # de-dup (case-insensitive)
        seen = {str(x).lower() for x in ex_list}
        for item in new_list:
            if str(item).lower() not in seen:
                ex_list.append(item)
                seen.add(str(item).lower())
        return ex_list
    # scalar: prefer existing if non-empty, else new
    if existing not in (None, "", 0, []):
        return existing
    return new


# ----------------------------
# Scraping
# ----------------------------

@dataclass
class FetchResult:
    url: str
    status: int
    text: str
    from_cache: bool


class LemonScraper:
    def __init__(
        self,
        cache_dir: str,
        sleep_s: float,
        jitter_s: float,
        retries: int,
        timeout_s: float,
        user_agent: str,
        use_cache: bool = True,
    ) -> None:
        self.cache_dir = cache_dir
        self.sleep_s = sleep_s
        self.jitter_s = jitter_s
        self.retries = retries
        self.timeout_s = timeout_s
        self.user_agent = user_agent
        self.use_cache = use_cache

        ensure_dir(self.cache_dir)
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.user_agent})

    def _cache_path(self, url: str) -> str:
        return os.path.join(self.cache_dir, f"{sha1(url)}.html")

    def fetch(self, url: str) -> FetchResult:
        cp = self._cache_path(url)

        if self.use_cache and os.path.exists(cp):
            try:
                with open(cp, "r", encoding="utf-8", errors="replace") as f:
                    return FetchResult(url=url, status=200, text=f.read(), from_cache=True)
            except Exception:
                # fall back to network
                pass

        last_exc: Optional[Exception] = None
        for attempt in range(1, self.retries + 1):
            try:
                # polite delay
                delay = self.sleep_s + (random.random() * self.jitter_s)
                if delay > 0:
                    time.sleep(delay)

                r = self.session.get(url, timeout=self.timeout_s)
                text = r.text if r.text else ""

                if r.status_code == 200 and text:
                    if self.use_cache:
                        try:
                            with open(cp, "w", encoding="utf-8") as f:
                                f.write(text)
                        except Exception:
                            pass
                    return FetchResult(url=url, status=r.status_code, text=text, from_cache=False)

                # non-200: retry a few times
                last_exc = Exception(f"HTTP {r.status_code}")
            except Exception as ex:
                last_exc = ex

            backoff = min(8.0, 0.6 * attempt)
            time.sleep(backoff)

        # If we get here, failed
        raise RuntimeError(f"Failed to fetch {url}: {last_exc}")

    def parse_page(self, url: str, html: str) -> Dict[str, Any]:
        """
        Parse a Lemon page into canonical metadata dict with keys in CANONICAL_KEYS.
        This is intentionally heuristic and resilient to minor layout changes.
        """
        soup = BeautifulSoup(html, "html.parser")

        # Attempt to find key/value pairs in table-like structures
        extracted: Dict[str, Any] = {}

        # Strategy A: parse table rows where first cell looks like a label
        for table in soup.find_all("table"):
            for tr in table.find_all("tr"):
                cells = tr.find_all(["th", "td"])
                if len(cells) < 2:
                    continue
                raw_label = clean_ws(cells[0].get_text(" ", strip=True))
                key = canonical_key(raw_label)
                if not key:
                    continue

                val_cell = cells[1]
                val = self._extract_value_from_cell(val_cell)

                if key == "released":
                    yr = parse_year(val) if isinstance(val, str) else None
                    if yr:
                        extracted[key] = yr
                elif key in LIST_KEYS:
                    extracted[key] = self._extract_list_from_cell(val_cell, fallback_text=val)
                else:
                    extracted[key] = clean_ws(val) if isinstance(val, str) else val

        # Strategy B: sometimes there are definition lists or label spans
        # Scan for text nodes like "Released:" and read the following sibling text.
        if not extracted:
            extracted.update(self._scan_label_colon_patterns(soup))

        # Post-cleaning: split person fields into lists
        for k in ["coder", "graphics", "musician"]:
            if k in extracted:
                if isinstance(extracted[k], str):
                    extracted[k] = split_people(extracted[k])
                elif isinstance(extracted[k], list):
                    # normalize each item
                    cleaned = []
                    for item in extracted[k]:
                        if isinstance(item, str):
                            cleaned.extend(split_people(item))
                    extracted[k] = cleaned

        # developer might appear as list; prefer scalar string for "developer"
        if "developer" in extracted and isinstance(extracted["developer"], list):
            extracted["developer"] = extracted["developer"][0] if extracted["developer"] else ""

        # Final normalize + drop empties
        normalized: Dict[str, Any] = {}
        for k in CANONICAL_KEYS:
            if k not in extracted:
                continue
            v = extracted[k]
            if v in (None, "", [], 0):
                continue
            normalized[k] = v

        return normalized

    def _extract_value_from_cell(self, cell) -> str:
        # Prefer textual content but remove repeated "Info / logo" noise if present
        text = clean_ws(cell.get_text(" ", strip=True))
        text = re.sub(r"\bInfo\b\s*/\s*\d+\s*logos?\b", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\bInfo\b\s*/\s*logo\b", "", text, flags=re.IGNORECASE)
        text = clean_ws(text)
        return text

    def _extract_list_from_cell(self, cell, fallback_text: str) -> List[str]:
        # Prefer anchor text items (often publishers/devs/companies are links)
        items: List[str] = []
        for a in cell.find_all("a"):
            t = clean_ws(a.get_text(" ", strip=True))
            if t and t.lower() not in {"info", "logo", "logos"}:
                items.append(t)

        # If no anchors, fall back to splitting text
        if not items:
            items = split_people(fallback_text)

        # De-dup
        seen = set()
        out = []
        for it in items:
            lit = it.lower()
            if lit not in seen:
                seen.add(lit)
                out.append(it)
        return out

    def _scan_label_colon_patterns(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """
        Fallback parser: find strings like "Released:" and capture nearby text.
        Works for some Lemon layouts.
        """
        text = soup.get_text("\n", strip=True)
        # build simple regex blocks
        # Example: "Released:\n1986 (40 years ago)\nPublisher:\nElectronic Arts ..."
        out: Dict[str, Any] = {}
        for label in ["Released", "Publisher", "Developer", "Re-releaser", "Producer", "Coder", "Graphics", "Musician"]:
            pattern = re.compile(rf"(?im)^{re.escape(label)}\s*:\s*$")
            # find label line indices
            lines = [clean_ws(x) for x in text.splitlines() if clean_ws(x)]
            for i, line in enumerate(lines):
                if pattern.match(line):
                    key = canonical_key(label)
                    if not key:
                        continue
                    # take next non-empty line as value
                    if i + 1 < len(lines):
                        val = lines[i + 1]
                        if key == "released":
                            yr = parse_year(val)
                            if yr:
                                out[key] = yr
                        elif key in LIST_KEYS:
                            out[key] = split_people(val)
                        else:
                            out[key] = val
                    break
        return out


# ----------------------------
# Main processing
# ----------------------------

def detect_repo_paths(script_path: str, games_path_arg: Optional[str], out_path_arg: Optional[str], cache_dir_arg: Optional[str]) -> Tuple[str, str, str]:
    """
    Default assumptions:
    - scripts/lemon_metadata.py
    - games/games.json
    - data/lemon-metadata.json
    - data/lemon-cache/
    """
    script_dir = os.path.dirname(os.path.abspath(script_path))
    repo_root = os.path.abspath(os.path.join(script_dir, ".."))

    games_path = games_path_arg or os.path.join(repo_root, "games", "games.json")
    out_path = out_path_arg or os.path.join(repo_root, "data", "lemon-metadata.json")
    cache_dir = cache_dir_arg or os.path.join(repo_root, "data", "lemon-cache")

    return games_path, out_path, cache_dir


def empty_record() -> Dict[str, Any]:
    rec: Dict[str, Any] = {
        "released": None,
        "publisher": [],
        "developer": "",
        "re_releaser": [],
        "producer": "",
        "coder": [],
        "graphics": [],
        "musician": [],
    }
    return rec


def load_existing(out_path: str) -> Dict[str, Any]:
    if os.path.exists(out_path):
        try:
            data = read_json(out_path)
            if isinstance(data, dict):
                return data
        except Exception:
            pass
    return {}


def get_slug(game: Dict[str, Any]) -> str:
    slug = game.get("slug")
    if isinstance(slug, str) and slug.strip():
        return slug.strip()
    # fallbacks
    gid = game.get("id")
    if isinstance(gid, str) and gid.strip():
        return gid.strip()
    title = game.get("title", "unknown")
    return re.sub(r"[^a-z0-9\-]+", "-", str(title).lower()).strip("-") or "unknown"


def is_lemon_url(u: str) -> bool:
    u = u.lower()
    return "lemon64.com" in u or "lemonamiga.com" in u


def normalize_urls(lemon_field: Any) -> List[str]:
    urls: List[str] = []
    if isinstance(lemon_field, list):
        for x in lemon_field:
            if isinstance(x, str) and x.strip() and is_lemon_url(x):
                urls.append(x.strip())
    elif isinstance(lemon_field, str) and lemon_field.strip() and is_lemon_url(lemon_field):
        urls.append(lemon_field.strip())
    # de-dup
    seen = set()
    out = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def merge_record(base: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(base)
    for k in CANONICAL_KEYS:
        if k not in new:
            continue
        merged[k] = merge_values(merged.get(k), new.get(k), is_list=(k in LIST_KEYS))
    # ensure list keys are lists
    for lk in LIST_KEYS:
        if not isinstance(merged.get(lk), list):
            merged[lk] = [] if merged.get(lk) in (None, "", 0) else [merged[lk]]
    # ensure required keys exist
    for k in empty_record().keys():
        merged.setdefault(k, empty_record()[k])
    return merged


def prune_record(rec: Dict[str, Any]) -> Dict[str, Any]:
    """
    Keep consistent schema, but remove None/empty scalar where appropriate.
    We keep lists even if empty because it stabilizes downstream merging.
    """
    out = empty_record()
    for k in out.keys():
        if k in rec:
            out[k] = rec[k]
    # normalize types
    if out["released"] is not None:
        try:
            out["released"] = int(out["released"])
        except Exception:
            out["released"] = None

    for k in LIST_KEYS:
        if not isinstance(out[k], list):
            out[k] = []
        # de-dup list items
        seen = set()
        dedup = []
        for it in out[k]:
            if not isinstance(it, str):
                continue
            s = clean_ws(it)
            if not s:
                continue
            ls = s.lower()
            if ls not in seen:
                seen.add(ls)
                dedup.append(s)
        out[k] = dedup

    # scalar strings
    for k in ["developer", "producer"]:
        if not isinstance(out[k], str):
            out[k] = ""
        out[k] = clean_ws(out[k])

    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="Extract metadata from Lemon64/LemonAmiga pages in games.json")
    ap.add_argument("--games", help="Path to games.json (default: ../games/games.json)")
    ap.add_argument("--out", help="Path to output lemon-metadata.json (default: ../data/lemon-metadata.json)")
    ap.add_argument("--cache-dir", help="Cache directory for fetched HTML (default: ../data/lemon-cache)")
    ap.add_argument("--no-cache", action="store_true", help="Disable on-disk cache reads/writes")
    ap.add_argument("--sleep", type=float, default=1.0, help="Base sleep seconds between requests (default: 1.0)")
    ap.add_argument("--jitter", type=float, default=0.35, help="Random jitter seconds added to sleep (default: 0.35)")
    ap.add_argument("--retries", type=int, default=4, help="Fetch retries per URL (default: 4)")
    ap.add_argument("--timeout", type=float, default=20.0, help="Request timeout seconds (default: 20)")
    ap.add_argument("--user-agent", default=DEFAULT_UA, help="User-Agent header")
    ap.add_argument("--limit", type=int, default=0, help="Process at most N games (0 = all)")
    ap.add_argument("--start", type=int, default=0, help="Start index within games list (default: 0)")
    ap.add_argument("--dry-run", action="store_true", help="Do not write output file (just log)")
    ap.add_argument("--force", action="store_true", help="Re-scrape even if slug already exists in output")

    args = ap.parse_args()

    games_path, out_path, cache_dir = detect_repo_paths(
        script_path=__file__,
        games_path_arg=args.games,
        out_path_arg=args.out,
        cache_dir_arg=args.cache_dir,
    )

    if not os.path.exists(games_path):
        eprint(f"[ERROR] games.json not found at: {games_path}")
        return 2

    eprint(f"[INFO] games.json: {games_path}")
    eprint(f"[INFO] output:    {out_path}")
    eprint(f"[INFO] cache:     {cache_dir} (enabled={not args.no_cache})")

    games = read_json(games_path)
    if not isinstance(games, list):
        eprint("[ERROR] games.json root must be a list of game objects")
        return 2

    existing = load_existing(out_path)
    if existing:
        eprint(f"[INFO] loaded existing output entries: {len(existing)}")

    scraper = LemonScraper(
        cache_dir=cache_dir,
        sleep_s=max(0.0, args.sleep),
        jitter_s=max(0.0, args.jitter),
        retries=max(1, args.retries),
        timeout_s=max(5.0, args.timeout),
        user_agent=args.user_agent,
        use_cache=not args.no_cache,
    )

    total = len(games)
    start = max(0, args.start)
    end = total if args.limit <= 0 else min(total, start + args.limit)

    processed = 0
    updated = 0
    failed = 0
    skipped = 0

    out_data: Dict[str, Any] = dict(existing) if isinstance(existing, dict) else {}

    for idx in range(start, end):
        game = games[idx]
        if not isinstance(game, dict):
            continue

        slug = get_slug(game)
        urls = normalize_urls(game.get("lemon", []))

        if not urls:
            skipped += 1
            eprint(f"[SKIP] {idx}/{total} slug={slug} (no lemon urls)")
            continue

        if (slug in out_data) and (not args.force):
            skipped += 1
            eprint(f"[SKIP] {idx}/{total} slug={slug} (already in output; use --force to re-scrape)")
            continue

        eprint(f"[GAME] {idx}/{total} slug={slug} urls={len(urls)}")
        base_rec = empty_record()

        # Pre-seed with year/developer if present (ONLY as fallback)
        # (Lemon remains authority; we do not overwrite non-empty Lemon results)
        if isinstance(game.get("year"), int):
            base_rec["released"] = game.get("year")
        if isinstance(game.get("developer"), str):
            base_rec["developer"] = game.get("developer", "")

        merged = base_rec
        got_any = False

        for u in urls:
            try:
                fr = scraper.fetch(u)
                meta = scraper.parse_page(u, fr.text)

                if meta:
                    got_any = True
                    merged = merge_record(merged, meta)

                    eprint(f"  [OK] {u} (cache={fr.from_cache}) -> keys={sorted(meta.keys())}")
                else:
                    eprint(f"  [WARN] {u} parsed no usable metadata (cache={fr.from_cache})")

            except Exception as ex:
                eprint(f"  [FAIL] {u} error={ex}")

        processed += 1

        if not got_any:
            failed += 1
            eprint(f"[WARN] slug={slug} no metadata extracted from any Lemon URL")
            # still write a pruned fallback record to allow later fill-in
            merged = prune_record(merged)
        else:
            merged = prune_record(merged)

        out_data[slug] = merged
        updated += 1

    eprint("\n[SUMMARY]")
    eprint(f"  total games: {total}")
    eprint(f"  range:       {start}..{end-1}")
    eprint(f"  processed:   {processed}")
    eprint(f"  updated:     {updated}")
    eprint(f"  skipped:     {skipped}")
    eprint(f"  failed:      {failed}")

    if args.dry_run:
        eprint("[DRY-RUN] Not writing output file.")
        return 0

    write_json(out_path, out_data)
    eprint(f"[DONE] wrote {len(out_data)} entries to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
