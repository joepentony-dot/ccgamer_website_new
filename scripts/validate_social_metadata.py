#!/usr/bin/env python3
"""Validate canonical, Open Graph and basic Twitter metadata consistency."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from phase0_site_audit import (
    ROOT,
    extract_tag_attr,
    extract_text,
    included_html,
    normalise_url_path,
)

PUBLIC_EXCLUDED_PREFIXES = ("templates/", "scripts/templates/", "resources/", "tools/")
ABSOLUTE_HTTP_RE = re.compile(r"^https?://", re.I)
DEFERRED_HOMEPAGE_ISSUES = {
    ("home.html", "og:title differs from HTML title"),
    ("home.html", "og:description differs from meta description"),
}


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def is_public_html(path: Path) -> bool:
    relative = rel(path)
    return included_html(path) and not relative.startswith(PUBLIC_EXCLUDED_PREFIXES)


def extract_meta(html: str, *, property_name: str = "", name: str = "") -> str:
    if property_name:
        pattern = rf"<meta\b[^>]*property\s*=\s*([\"']){re.escape(property_name)}\1[^>]*>"
    else:
        pattern = rf"<meta\b[^>]*name\s*=\s*([\"']){re.escape(name)}\1[^>]*>"
    return extract_tag_attr(html, pattern, "content")


def is_absolute_http(value: object) -> bool:
    return bool(ABSOLUTE_HTTP_RE.match(str(value or "").strip()))


def audit_social_metadata() -> dict:
    issues: list[dict[str, str]] = []
    pages_checked = 0
    indexable_pages = 0

    for path in sorted(candidate for candidate in ROOT.rglob("*.html") if is_public_html(candidate)):
        pages_checked += 1
        html = path.read_text(encoding="utf-8", errors="ignore")
        relative = rel(path)
        robots = extract_meta(html, name="robots")
        if "noindex" in robots.lower():
            continue

        indexable_pages += 1
        canonical = extract_tag_attr(
            html,
            r"<link\b[^>]*rel\s*=\s*([\"'])canonical\1[^>]*>",
            "href",
        )
        title = extract_text(r"<title[^>]*>(.*?)</title>", html)
        description = extract_meta(html, name="description")
        og_url = extract_meta(html, property_name="og:url")
        og_title = extract_meta(html, property_name="og:title")
        og_description = extract_meta(html, property_name="og:description")
        og_image = extract_meta(html, property_name="og:image")
        twitter_card = extract_meta(html, name="twitter:card")

        def add(issue: str) -> None:
            issues.append({"file": relative, "issue": issue})

        if canonical and not is_absolute_http(canonical):
            add("canonical is not an absolute HTTP(S) URL")
        if og_url and canonical and normalise_url_path(og_url) != normalise_url_path(canonical):
            add("og:url does not match canonical")
        if og_image and not is_absolute_http(og_image):
            add("og:image is not an absolute HTTP(S) URL")
        if og_title and title and og_title != title:
            add("og:title differs from HTML title")
        if og_description and description and og_description != description:
            add("og:description differs from meta description")
        if og_image and not twitter_card:
            add("Open Graph image exists but twitter:card is missing")

    deferred = [
        item for item in issues if (item["file"], item["issue"]) in DEFERRED_HOMEPAGE_ISSUES
    ]
    unexpected = [
        item for item in issues if (item["file"], item["issue"]) not in DEFERRED_HOMEPAGE_ISSUES
    ]
    return {
        "summary": {
            "public_html_pages": pages_checked,
            "indexable_pages": indexable_pages,
            "metadata_issues": len(issues),
            "deferred_homepage_issues": len(deferred),
            "unexpected_issues": len(unexpected),
        },
        "issues": issues,
        "deferred_homepage": deferred,
        "unexpected": unexpected,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-output", type=Path)
    parser.add_argument("--allow-deferred-homepage", action="store_true")
    args = parser.parse_args()

    report = audit_social_metadata()
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print(json.dumps(report["summary"], indent=2))
    failures = report["unexpected"]
    if not args.allow_deferred_homepage:
        failures = report["issues"]
    if failures:
        print(json.dumps(failures[:50], indent=2, ensure_ascii=False))
        raise SystemExit(f"Social metadata validation failed with {len(failures)} issue(s).")


if __name__ == "__main__":
    main()
