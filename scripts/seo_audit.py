#!/usr/bin/env python3
import json, re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SITE_ROOT = "https://www.cheekycommodoregamer.co.uk"
EXCLUDE_DIRS = {"admin", "auth", ".git", "node_modules", "supabase", "tests", "data/lemon-cache"}


def strip_tags(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract(pattern, html, flags=re.I | re.S):
    m = re.search(pattern, html, flags)
    return strip_tags(m.group(1)) if m else ""


def extract_attr(pattern, html, attr="content"):
    m = re.search(pattern, html, re.I | re.S)
    if not m:
        return ""
    tag = m.group(0)
    a = re.search(rf'{attr}\s*=\s*["\']([^"\']+)', tag, re.I)
    return a.group(1).strip() if a else ""


def classify(path: Path):
    rel = path.relative_to(ROOT).as_posix()
    if rel.startswith("games/"):
        return "game"
    if rel.startswith("genres/"):
        return "genre"
    if "collection" in rel or rel.startswith("collections/"):
        return "collection"
    if "special" in rel:
        return "special"
    if "demo" in rel:
        return "demo"
    if "event" in rel:
        return "event"
    return "static"


def to_url(path: Path):
    rel = path.relative_to(ROOT).as_posix()
    if rel in {"index.html", "home.html"}:
        return f"{SITE_ROOT}/"
    if rel.endswith("/index.html"):
        return f"{SITE_ROOT}/" + rel[:-10] + "/"
    if rel.endswith(".html"):
        return f"{SITE_ROOT}/" + rel
    return f"{SITE_ROOT}/" + rel


def should_include(path: Path):
    rel = path.relative_to(ROOT).as_posix()
    if not rel.endswith(".html"):
        return False
    for ex in EXCLUDE_DIRS:
        if rel == ex or rel.startswith(ex + "/"):
            return False
    if "_backup_" in rel:
        return False
    return True


def link_targets(html: str):
    hrefs = re.findall(r"<a\b[^>]*href=[\"\']([^\"\'#]+)", html, re.I)
    outs = []
    for h in hrefs:
        h = h.strip()
        if not h or h.startswith(("mailto:", "tel:", "javascript:")):
            continue
        if h.startswith("http://") or h.startswith("https://"):
            if "cheekycommodoregamer.co.uk" not in h:
                continue
            parsed = urlparse(h)
            outs.append(parsed.path or "/")
            continue
        if h.startswith("/"):
            outs.append(h)
        elif h.endswith(".html") or "/" in h:
            outs.append("/" + h.lstrip("./"))
    return outs


pages = []
for p in ROOT.rglob("*.html"):
    if should_include(p):
        pages.append(p)

records = []
url_to_idx = {}
out_map = {}
for p in sorted(pages):
    html = p.read_text(encoding="utf-8", errors="ignore")
    rel = p.relative_to(ROOT).as_posix()
    url = to_url(p)
    title = extract(r"<title[^>]*>(.*?)</title>", html)
    meta_desc = extract_attr(r"<meta\b[^>]*name=[\"\']description[\"\'][^>]*>", html)
    h1 = extract(r"<h1[^>]*>(.*?)</h1>", html)
    canonical = extract_attr(r"<link\b[^>]*rel=[\"\']canonical[\"\'][^>]*>", html, "href")
    robots = extract_attr(r"<meta\b[^>]*name=[\"\']robots[\"\'][^>]*>", html)
    og_title = bool(re.search(r"property=[\"\']og:title[\"\']", html, re.I))
    og_desc = bool(re.search(r"property=[\"\']og:description[\"\']", html, re.I))
    og_image = bool(re.search(r"property=[\"\']og:image[\"\']", html, re.I))
    tw = bool(re.search(r"name=[\"\']twitter:card[\"\']", html, re.I))
    schema_scripts = re.findall(r"<script[^>]*type=[\"\']application/ld\+json[\"\'][^>]*>(.*?)</script>", html, re.I | re.S)
    schema_types = []
    for block in schema_scripts:
        try:
            obj = json.loads(block)
            if isinstance(obj, dict):
                t = obj.get("@type")
                if isinstance(t, list): schema_types.extend(t)
                elif t: schema_types.append(str(t))
            elif isinstance(obj, list):
                for item in obj:
                    if isinstance(item, dict) and item.get("@type"):
                        schema_types.append(str(item.get("@type")))
        except Exception:
            schema_types.append("invalid-json")
    outs = link_targets(html)
    out_map[url] = outs
    idx_state = "noindex" if "noindex" in robots.lower() else "indexable"
    rec = {
        "file_path": rel,
        "url": url,
        "page_type": classify(p),
        "title": title,
        "title_length": len(title),
        "meta_description": meta_desc,
        "meta_description_length": len(meta_desc),
        "h1": h1,
        "canonical_url": canonical,
        "indexability": idx_state,
        "robots_meta": robots,
        "og_title": og_title,
        "og_description": og_desc,
        "og_image": og_image,
        "twitter_card": tw,
        "structured_data_types": sorted(set(schema_types)),
        "internal_links_out": 0,
        "internal_links_in": 0,
        "duplicate_title": False,
        "duplicate_meta": False,
        "thin_snippet_risk_notes": "",
        "slug_canonical_mismatch_notes": "",
        "trailing_slash_consistency_notes": ""
    }
    url_to_idx[url] = len(records)
    records.append(rec)

incoming = {r["url"]: 0 for r in records}
for src, outs in out_map.items():
    for h in outs:
        if h.endswith("/"):
            key = SITE_ROOT + h
        elif h.startswith("/"):
            key = SITE_ROOT + h
        else:
            key = SITE_ROOT + "/" + h
        if key in incoming:
            incoming[key] += 1

for rec in records:
    outs = out_map.get(rec["url"], [])
    rec["internal_links_out"] = len(outs)
    rec["internal_links_in"] = incoming.get(rec["url"], 0)

# duplicates
from collections import Counter

title_counts = Counter(r["title"] for r in records if r["title"])
meta_counts = Counter(r["meta_description"] for r in records if r["meta_description"])
for rec in records:
    rec["duplicate_title"] = bool(rec["title"] and title_counts[rec["title"]] > 1)
    rec["duplicate_meta"] = bool(rec["meta_description"] and meta_counts[rec["meta_description"]] > 1)
    notes = []
    if rec["meta_description_length"] < 70:
        notes.append("Meta description short/missing")
    if rec["title_length"] < 25:
        notes.append("Title short/generic")
    if rec["duplicate_title"]:
        notes.append("Duplicate title")
    if rec["duplicate_meta"]:
        notes.append("Duplicate meta description")
    rec["thin_snippet_risk_notes"] = "; ".join(notes)

    can = rec["canonical_url"]
    if can:
        parsed = urlparse(can)
        can_path = parsed.path
        u_path = urlparse(rec["url"]).path
        if can_path and can_path.rstrip("/") != u_path.rstrip("/"):
            rec["slug_canonical_mismatch_notes"] = f"Canonical path differs: {can_path} vs {u_path}"
        if u_path.endswith("/index.html") and can_path.endswith("/index.html"):
            rec["trailing_slash_consistency_notes"] = "Canonical keeps /index.html variant"
        elif u_path.endswith(".html") and can_path.endswith("/"):
            rec["trailing_slash_consistency_notes"] = "HTML file canonicalizes to trailing slash"

json_path = ROOT / "docs" / "seo-audit-report.json"
json_path.write_text(json.dumps(records, indent=2), encoding="utf-8")

# priority scoring
priority = []
for rec in records:
    score = 0
    reasons = []
    if rec["duplicate_title"]:
        score += 3; reasons.append("duplicate title")
    if "cheeky commodore gamer" in rec["title"].lower() and rec["title_length"] < 45:
        score += 2; reasons.append("brand-led short title")
    if rec["page_type"] == "game" and "(" not in rec["title"]:
        score += 2; reasons.append("missing platform in game title")
    if rec["title_length"] < 25 or rec["title_length"] > 65:
        score += 1; reasons.append("title length risk")
    if not rec["meta_description"] or rec["duplicate_meta"]:
        score += 1; reasons.append("meta weakness")
    if score > 0:
        priority.append((score, rec, reasons))
priority.sort(key=lambda x: (-x[0], x[1]["url"]))

md_lines = [
"# SEO Audit Report",
"",
f"- Pages audited: **{len(records)}**",
f"- Duplicate titles: **{sum(1 for r in records if r['duplicate_title'])}**",
f"- Duplicate meta descriptions: **{sum(1 for r in records if r['duplicate_meta'])}**",
"",
"## Key SEO weaknesses found",
"",
"- Large volume of game pages with generic/short titles and duplicated snippets.",
"- Canonical and trailing-slash behavior varies between `.html` and folder URLs.",
"- Many pages have limited internal link connectivity (low links in).",
"",
"## File-by-file implementation plan (before changes)",
"",
"1. `scripts/seo_audit.py`: automate repeatable inventory + duplicate detection.",
"2. `scripts/generate-slug-pages.js`: improve generated game title/meta logic and social metadata alignment.",
"3. `admin/js/games-editor.js`: add SEO title/meta guardrails and hook validation for future entries.",
"",
"## Top title improvement priority report",
"",
"| Priority | URL | Current title | Why it is high priority |",
"|---|---|---|---|"
]
for score, rec, reasons in priority[:80]:
    md_lines.append(f"| {score} | {rec['url']} | {rec['title'][:90]} | {', '.join(reasons)} |")

md_lines += ["", "## Full inventory", "", "| File | URL | Type | Title | TL | Meta | ML | H1 | Canonical | Indexability | Robots | OG | Twitter | Schema | In | Out | Dup Title | Dup Meta | Notes |", "|---|---|---|---|---:|---|---:|---|---|---|---|---|---|---|---:|---:|---|---|---|"]

for r in records:
    og = "Y" if (r['og_title'] and r['og_description'] and r['og_image']) else "N"
    tw = "Y" if r['twitter_card'] else "N"
    schema = ", ".join(r['structured_data_types']) if r['structured_data_types'] else ""
    notes = "; ".join([n for n in [r['thin_snippet_risk_notes'], r['slug_canonical_mismatch_notes'], r['trailing_slash_consistency_notes']] if n])
    md_lines.append(
        f"| {r['file_path']} | {r['url']} | {r['page_type']} | {r['title'].replace('|','/')} | {r['title_length']} | {r['meta_description'].replace('|','/')} | {r['meta_description_length']} | {r['h1']} | {r['canonical_url']} | {r['indexability']} | {r['robots_meta']} | {og} | {tw} | {schema} | {r['internal_links_in']} | {r['internal_links_out']} | {r['duplicate_title']} | {r['duplicate_meta']} | {notes} |"
    )

(ROOT / "docs" / "seo-audit-report.md").write_text("\n".join(md_lines), encoding="utf-8")
print(f"Wrote {json_path} and docs/seo-audit-report.md")
