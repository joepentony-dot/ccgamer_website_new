#!/usr/bin/env python3
"""Extract Lemon64/LemonAmiga metadata for games."""

from __future__ import annotations

import json
import logging
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


ROOT_DIR = Path(__file__).resolve().parents[1]
GAMES_PATH = ROOT_DIR / "games" / "games.json"
OUTPUT_PATH = ROOT_DIR / "data" / "lemon-metadata.json"

USER_AGENT = "Mozilla/5.0 (compatible; LemonMetadataBot/1.0)"
REQUEST_TIMEOUT = 20
RETRY_LIMIT = 3
RETRY_BACKOFF = 2

LABEL_MAP = {
    "released": "released",
    "release": "released",
    "release year": "released",
    "year": "released",
    "published": "publisher",
    "published by": "publisher",
    "publisher": "publisher",
    "publishers": "publisher",
    "developer": "developer",
    "developers": "developer",
    "developed by": "developer",
    "re released by": "re_releaser",
    "rereleased by": "re_releaser",
    "re release": "re_releaser",
    "re releaser": "re_releaser",
    "producer": "producer",
    "coder": "coder",
    "coders": "coder",
    "programmer": "coder",
    "programmers": "coder",
    "graphics": "graphics",
    "graphic artist": "graphics",
    "graphic artists": "graphics",
    "artist": "graphics",
    "artists": "graphics",
    "music": "musician",
    "musician": "musician",
    "musicians": "musician",
    "sound": "musician",
}

LIST_FIELDS = {"publisher", "re_releaser", "coder", "graphics", "musician"}


class TableRowParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.rows: List[List[str]] = []
        self._current_row: List[str] = []
        self._current_cell: List[str] = []
        self._in_cell = False

    def handle_starttag(self, tag: str, attrs: List[tuple]) -> None:
        if tag == "tr":
            self._current_row = []
        elif tag in {"td", "th"}:
            self._in_cell = True
            self._current_cell = []
        elif tag == "br" and self._in_cell:
            self._current_cell.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._in_cell:
            text = "".join(self._current_cell).strip()
            self._current_row.append(text)
            self._in_cell = False
        elif tag == "tr" and self._current_row:
            self.rows.append(self._current_row)
            self._current_row = []

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            self._current_cell.append(data)


def normalize_label(label: str) -> str:
    cleaned = re.sub(r"\s+", " ", label).strip().lower()
    cleaned = cleaned.replace(":", "")
    cleaned = re.sub(r"[^a-z0-9 ]", "", cleaned)
    return cleaned.strip()


def split_list(value: str) -> List[str]:
    if not value:
        return []
    cleaned = re.sub(r"\s+", " ", value).strip()
    parts = re.split(r",|/|\n|\s+&\s+|\s+and\s+", cleaned)
    items = [part.strip() for part in parts if part.strip()]
    return list(dict.fromkeys(items))


def extract_year(value: str) -> Optional[int]:
    match = re.search(r"\b(19\d{2}|20\d{2})\b", value)
    if match:
        return int(match.group(1))
    return None


def fetch_html(url: str) -> Optional[str]:
    for attempt in range(1, RETRY_LIMIT + 1):
        try:
            request = Request(url, headers={"User-Agent": USER_AGENT})
            with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
                return response.read().decode("utf-8", "ignore")
        except (HTTPError, URLError, TimeoutError) as exc:
            logging.warning("Fetch failed (%s/%s) for %s: %s", attempt, RETRY_LIMIT, url, exc)
            if attempt < RETRY_LIMIT:
                time.sleep(RETRY_BACKOFF * attempt)
            else:
                return None
    return None


def extract_fields(html: str) -> Dict[str, object]:
    parser = TableRowParser()
    parser.feed(html)
    extracted: Dict[str, object] = {}
    for row in parser.rows:
        if len(row) < 2:
            continue
        label = normalize_label(row[0])
        mapped_field = LABEL_MAP.get(label)
        if not mapped_field:
            continue
        value = row[1].strip()
        if mapped_field == "released":
            year = extract_year(value)
            if year:
                extracted[mapped_field] = year
            continue
        if mapped_field in LIST_FIELDS:
            extracted[mapped_field] = split_list(value)
        else:
            extracted[mapped_field] = value
    return extracted


def merge_metadata(base: Dict[str, object], incoming: Dict[str, object]) -> None:
    if base.get("released") is None and incoming.get("released") is not None:
        base["released"] = incoming["released"]
    for field in LIST_FIELDS:
        incoming_list = incoming.get(field) or []
        if not incoming_list:
            continue
        current = base[field]
        combined = list(dict.fromkeys(current + incoming_list))
        base[field] = combined
    for field in {"developer", "producer"}:
        if not base[field] and incoming.get(field):
            base[field] = incoming[field]


def load_games() -> List[Dict[str, object]]:
    with GAMES_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def build_default_entry() -> Dict[str, object]:
    return {
        "released": None,
        "publisher": [],
        "developer": "",
        "re_releaser": [],
        "producer": "",
        "coder": [],
        "graphics": [],
        "musician": [],
    }


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    games = load_games()
    results: Dict[str, Dict[str, object]] = {}

    for game in games:
        slug = game.get("slug")
        if not slug:
            logging.warning("Skipping game without slug: %s", game.get("title"))
            continue
        lemon_urls = game.get("lemon") or []
        if not lemon_urls:
            continue
        entry = results.setdefault(slug, build_default_entry())
        for url in lemon_urls:
            parsed = urlparse(url)
            if "lemon" not in parsed.netloc:
                logging.info("Skipping non-Lemon URL for %s: %s", slug, url)
                continue
            html = fetch_html(url)
            if not html:
                logging.error("Failed to fetch %s", url)
                continue
            metadata = extract_fields(html)
            merge_metadata(entry, metadata)
            time.sleep(0.2)

    OUTPUT_PATH.write_text(json.dumps(results, indent=2, sort_keys=True), encoding="utf-8")
    logging.info("Wrote %s", OUTPUT_PATH)


if __name__ == "__main__":
    main()
