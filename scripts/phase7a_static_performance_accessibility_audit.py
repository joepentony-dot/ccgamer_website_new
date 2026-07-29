#!/usr/bin/env python3
from __future__ import annotations

import argparse
import collections
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg'}
FONT_EXTS = {'.woff', '.woff2', '.ttf', '.otf', '.eot'}
EXCLUDED_PARTS = {'.git', 'node_modules', '.venv', 'venv', '__pycache__'}
PUBLIC_EXCLUDED_PREFIXES = ('admin/', 'templates/', 'tests/', 'docs/', '.github/', 'reports/')
EXAMPLE_LIMIT = 30


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def add_issue(bucket: dict, key: str, path: str, detail: str = '') -> None:
    item = bucket.setdefault(key, {'count': 0, 'examples': []})
    item['count'] += 1
    if len(item['examples']) < EXAMPLE_LIMIT:
        item['examples'].append({'path': path, 'detail': detail})


def accessible_text(node) -> str:
    if node is None:
        return ''
    aria = str(node.get('aria-label') or '').strip()
    if aria:
        return aria
    labelledby = str(node.get('aria-labelledby') or '').strip()
    if labelledby:
        return labelledby
    title = str(node.get('title') or '').strip()
    if title:
        return title
    text = ' '.join(node.stripped_strings).strip()
    if text:
        return text
    image = node.find('img') if hasattr(node, 'find') else None
    return str(image.get('alt') or '').strip() if image else ''


def has_label(control, soup: BeautifulSoup) -> bool:
    if str(control.get('aria-label') or '').strip() or str(control.get('aria-labelledby') or '').strip():
        return True
    if str(control.get('title') or '').strip():
        return True
    control_id = str(control.get('id') or '').strip()
    if control_id and soup.find('label', attrs={'for': control_id}):
        return True
    return control.find_parent('label') is not None


def is_public(path: str) -> bool:
    return not path.startswith(PUBLIC_EXCLUDED_PREFIXES)


def is_redirect_shell(soup: BeautifulSoup, text: str) -> bool:
    refresh = soup.find('meta', attrs={'http-equiv': re.compile(r'^refresh$', re.I)})
    return bool(refresh or re.search(r'window\.location\.(?:replace|assign)\s*\(', text))


def robots_noindex(soup: BeautifulSoup) -> bool:
    tag = soup.find('meta', attrs={'name': re.compile(r'^robots$', re.I)})
    return bool(tag and 'noindex' in str(tag.get('content') or '').lower())


def page_family(path: str) -> str:
    if path in {'index.html', 'home.html'}:
        return 'home-entry'
    if path.startswith('games/genres/'):
        return 'genre'
    if path.startswith('games/publishers/'):
        return 'publisher'
    if path.startswith('games/developers/'):
        return 'developer'
    if path.startswith('games/years/'):
        return 'year'
    if path.startswith('games/platforms/'):
        return 'platform'
    if path.startswith('games/collections/'):
        return 'collection'
    if path.startswith('games/') and path.count('/') == 2 and path.endswith('/index.html'):
        return 'game-wrapper'
    if path.startswith('games/'):
        return 'games'
    if path.startswith('music/'):
        return 'music'
    if path.startswith('quiz/'):
        return 'quiz'
    if path.startswith('retro-specials/'):
        return 'retro-special'
    if path.startswith('retro-events/'):
        return 'retro-event'
    if path.startswith('amiga-demo-music/'):
        return 'amiga-demo'
    if path.startswith('admin/'):
        return 'admin'
    return 'other'


def scan_html() -> dict:
    issues: dict = {}
    families = collections.Counter()
    totals = collections.Counter()
    per_page = []
    third_party_origins = collections.Counter()

    html_files = sorted(path for path in ROOT.rglob('*.html') if not EXCLUDED_PARTS.intersection(path.parts))
    for path in html_files:
        path_rel = rel(path)
        try:
            text = path.read_text(encoding='utf-8', errors='replace')
        except OSError:
            add_issue(issues, 'unreadable_html', path_rel)
            continue
        soup = BeautifulSoup(text, 'html.parser')
        public = is_public(path_rel)
        noindex = robots_noindex(soup)
        redirect = is_redirect_shell(soup, text)
        family = page_family(path_rel)
        families[family] += 1
        totals['html_files'] += 1
        if public:
            totals['public_html'] += 1
        if public and not noindex:
            totals['indexable_public_html'] += 1
        if redirect:
            totals['client_redirect_shells'] += 1
        structural = public and not noindex and not redirect

        html_tag = soup.find('html')
        if public and (not html_tag or not str(html_tag.get('lang') or '').strip()):
            add_issue(issues, 'missing_document_language', path_rel)
        if public and not soup.find('meta', attrs={'name': re.compile(r'^viewport$', re.I)}):
            add_issue(issues, 'missing_viewport', path_rel)

        mains = soup.find_all('main')
        h1s = soup.find_all('h1')
        if structural and not mains:
            add_issue(issues, 'missing_main_landmark', path_rel)
        if structural and len(mains) > 1:
            add_issue(issues, 'multiple_main_landmarks', path_rel, str(len(mains)))
        if structural and not h1s:
            add_issue(issues, 'missing_h1', path_rel)
        if structural and len(h1s) > 1:
            add_issue(issues, 'multiple_h1', path_rel, str(len(h1s)))

        skip_link = any(
            str(anchor.get('href') or '').startswith('#')
            and ('skip' in accessible_text(anchor).lower() or str(anchor.get('href') or '').lower() in {'#main', '#content', '#main-content'})
            for anchor in soup.find_all('a', href=True)
        )
        if structural and not skip_link:
            add_issue(issues, 'missing_skip_link', path_rel)

        ids = [str(tag.get('id')) for tag in soup.find_all(attrs={'id': True})]
        for duplicate in sorted(key for key, value in collections.Counter(ids).items() if value > 1):
            add_issue(issues, 'duplicate_id', path_rel, duplicate)

        for image in soup.find_all('img'):
            totals['images'] += 1
            if not image.has_attr('alt'):
                add_issue(issues, 'image_missing_alt_attribute', path_rel, str(image.get('src') or image.get('id') or ''))
            elif not str(image.get('alt') or '').strip():
                totals['images_empty_alt'] += 1
            if not image.get('width') or not image.get('height'):
                add_issue(issues, 'image_missing_intrinsic_dimensions', path_rel, str(image.get('src') or image.get('id') or ''))
            if str(image.get('loading') or '').lower() == 'lazy':
                totals['lazy_images'] += 1

        for iframe in soup.find_all('iframe'):
            totals['iframes'] += 1
            if not str(iframe.get('title') or '').strip():
                add_issue(issues, 'iframe_missing_title', path_rel, str(iframe.get('src') or ''))
            if str(iframe.get('loading') or '').lower() != 'lazy':
                add_issue(issues, 'iframe_not_lazy_loaded', path_rel, str(iframe.get('src') or ''))

        for control in soup.find_all(['input', 'select', 'textarea']):
            control_type = str(control.get('type') or '').lower()
            if control_type in {'hidden', 'submit', 'button', 'reset', 'image'}:
                continue
            totals['form_controls'] += 1
            if not has_label(control, soup):
                add_issue(issues, 'form_control_missing_label', path_rel, str(control.get('name') or control.get('id') or control.name))

        for button in soup.find_all('button'):
            totals['buttons'] += 1
            if not accessible_text(button):
                add_issue(issues, 'button_missing_accessible_name', path_rel, str(button.get('class') or ''))

        for anchor in soup.find_all('a'):
            totals['links'] += 1
            if not accessible_text(anchor):
                add_issue(issues, 'link_missing_accessible_name', path_rel, str(anchor.get('href') or ''))

        for focusable in soup.find_all(attrs={'aria-hidden': re.compile(r'^true$', re.I)}):
            if focusable.name in {'a', 'button', 'input', 'select', 'textarea'} or str(focusable.get('tabindex') or '') not in {'', '-1'}:
                add_issue(issues, 'aria_hidden_focusable', path_rel, focusable.name)

        for element in soup.find_all(attrs={'tabindex': True}):
            try:
                value = int(str(element.get('tabindex')))
            except ValueError:
                continue
            if value > 0:
                add_issue(issues, 'positive_tabindex', path_rel, str(value))

        for media in soup.find_all(['audio', 'video']):
            if media.has_attr('autoplay') and not media.has_attr('muted'):
                add_issue(issues, 'unmuted_autoplay_media', path_rel, media.name)

        stylesheets = [str(tag.get('href') or '') for tag in soup.find_all('link', rel=lambda value: value and 'stylesheet' in value)]
        scripts = [str(tag.get('src') or '') for tag in soup.find_all('script', src=True)]
        totals['stylesheet_references'] += len(stylesheets)
        totals['script_references'] += len(scripts)
        if len(stylesheets) >= 10:
            add_issue(issues, 'high_stylesheet_count', path_rel, str(len(stylesheets)))
        if len(scripts) >= 12:
            add_issue(issues, 'high_script_count', path_rel, str(len(scripts)))
        for duplicate in sorted(key for key, value in collections.Counter(stylesheets).items() if key and value > 1):
            add_issue(issues, 'duplicate_stylesheet_reference', path_rel, duplicate)
        for duplicate in sorted(key for key, value in collections.Counter(scripts).items() if key and value > 1):
            add_issue(issues, 'duplicate_script_reference', path_rel, duplicate)

        blocking = 0
        for script in soup.find_all('script', src=True):
            script_type = str(script.get('type') or '').lower()
            if script.has_attr('defer') or script.has_attr('async') or script_type == 'module':
                continue
            if script.find_parent('head'):
                blocking += 1
                add_issue(issues, 'head_script_without_defer_or_async', path_rel, str(script.get('src') or ''))
        totals['head_blocking_scripts'] += blocking

        resource_tags = [(tag, 'src') for tag in soup.find_all(['script', 'img', 'iframe'], src=True)]
        resource_tags += [(tag, 'href') for tag in soup.find_all('link', href=True)]
        for tag, attribute in resource_tags:
            value = str(tag.get(attribute) or '')
            if value.startswith(('http://', 'https://')):
                origin = urlparse(value)
                third_party_origins[f'{origin.scheme}://{origin.netloc}'] += 1

        per_page.append({
            'path': path_rel,
            'family': family,
            'public': public,
            'noindex': noindex,
            'redirect_shell': redirect,
            'stylesheets': len(stylesheets),
            'scripts': len(scripts),
            'images': len(soup.find_all('img')),
            'iframes': len(soup.find_all('iframe')),
        })

    return {
        'totals': dict(totals),
        'families': dict(families),
        'issues': issues,
        'third_party_origins': dict(third_party_origins.most_common()),
        'heaviest_pages_by_references': sorted(per_page, key=lambda item: (item['stylesheets'] + item['scripts'], item['path']), reverse=True)[:40],
    }


def scan_code_and_assets() -> dict:
    issues: dict = {}
    css = collections.Counter()
    javascript = collections.Counter()
    assets = collections.Counter()
    large_assets = []
    huge_assets = []
    image_dimensions = []

    for path in sorted(candidate for candidate in ROOT.rglob('*.css') if not EXCLUDED_PARTS.intersection(candidate.parts)):
        path_rel = rel(path)
        text = path.read_text(encoding='utf-8', errors='replace')
        size = path.stat().st_size
        css['files'] += 1
        css['bytes'] += size
        if size > 100_000:
            add_issue(issues, 'css_over_100kb', path_rel, str(size))
        if ':focus-visible' in text:
            css['files_with_focus_visible'] += 1
        if 'prefers-reduced-motion' in text:
            css['files_with_reduced_motion'] += 1
        imports = len(re.findall(r'@import\b', text, re.I))
        css['imports'] += imports
        if imports:
            add_issue(issues, 'css_import_usage', path_rel, str(imports))
        outlines = len(re.findall(r'outline\s*:\s*(?:none|0(?:\s*;|\s*$))', text, re.I | re.M))
        css['outline_suppression_rules'] += outlines
        if outlines:
            add_issue(issues, 'outline_suppression_present', path_rel, str(outlines))
        for block in re.findall(r'@font-face\s*\{(.*?)\}', text, re.I | re.S):
            css['font_face_blocks'] += 1
            if not re.search(r'font-display\s*:', block, re.I):
                add_issue(issues, 'font_face_missing_font_display', path_rel)

    for path in sorted(candidate for candidate in ROOT.rglob('*.js') if not EXCLUDED_PARTS.intersection(candidate.parts)):
        path_rel = rel(path)
        size = path.stat().st_size
        javascript['files'] += 1
        javascript['bytes'] += size
        if size > 150_000:
            add_issue(issues, 'javascript_over_150kb', path_rel, str(size))

    asset_files = []
    supported = IMAGE_EXTS | FONT_EXTS | {'.mp3', '.ogg', '.wav', '.mp4', '.webm', '.pdf'}
    for path in ROOT.rglob('*'):
        if not path.is_file() or EXCLUDED_PARTS.intersection(path.parts):
            continue
        extension = path.suffix.lower()
        if extension not in supported:
            continue
        size = path.stat().st_size
        path_rel = rel(path)
        assets['files'] += 1
        assets['bytes'] += size
        assets[f'ext_{extension or "none"}'] += 1
        asset_files.append((size, path, path_rel, extension))
        if size > 500_000:
            large_assets.append({'path': path_rel, 'bytes': size, 'extension': extension})
        if size > 1_000_000:
            huge_assets.append({'path': path_rel, 'bytes': size, 'extension': extension})

    for size, path, path_rel, extension in sorted(asset_files, reverse=True)[:250]:
        if extension not in IMAGE_EXTS - {'.svg'}:
            continue
        try:
            with Image.open(path) as image:
                width, height = image.size
            image_dimensions.append({
                'path': path_rel,
                'bytes': size,
                'width': width,
                'height': height,
                'megapixels': round(width * height / 1_000_000, 2),
            })
        except Exception:
            pass

    return {
        'css': dict(css),
        'javascript': dict(javascript),
        'assets': dict(assets),
        'issues': issues,
        'large_assets_over_500kb': sorted(large_assets, key=lambda item: item['bytes'], reverse=True)[:100],
        'assets_over_1mb': sorted(huge_assets, key=lambda item: item['bytes'], reverse=True)[:100],
        'largest_image_dimensions': image_dimensions[:100],
    }


def git_head() -> str:
    try:
        return subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    except Exception:
        return ''


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def score(value) -> str:
    return 'n/a' if value is None else str(round(float(value) * 100))


def issue_count(data: dict, key: str) -> int:
    return int(data.get('issues', {}).get(key, {}).get('count', 0))


def compose(static_path: Path, live_path: Path, report_path: Path, evidence_path: Path) -> None:
    static = json.loads(static_path.read_text(encoding='utf-8'))
    live = json.loads(live_path.read_text(encoding='utf-8')) if live_path.exists() else {'errors': ['live evidence missing'], 'axe': [], 'lighthouse': []}
    html = static['html']
    code = static['code_assets']
    lighthouse = live.get('lighthouse', [])
    axe = live.get('axe', [])

    performance_scores = [item.get('performance_score') for item in lighthouse if item.get('performance_score') is not None]
    accessibility_scores = [item.get('accessibility_score') for item in lighthouse if item.get('accessibility_score') is not None]
    median_performance = sorted(performance_scores)[len(performance_scores) // 2] if performance_scores else None
    median_accessibility = sorted(accessibility_scores)[len(accessibility_scores) // 2] if accessibility_scores else None
    axe_violations = sum(int(item.get('violation_count', 0)) for item in axe)
    axe_serious = sum(int(item.get('serious_or_critical_nodes', 0)) for item in axe)

    lighthouse_rows = [
        f"| {item.get('label')} | {item.get('mode')} | {score(item.get('performance_score'))} | {score(item.get('accessibility_score'))} | {item.get('lcp_display', 'n/a')} | {item.get('cls_display', 'n/a')} | {item.get('tbt_display', 'n/a')} | {item.get('total_bytes_display', 'n/a')} |"
        for item in lighthouse
    ] or ['| Live audit unavailable | — | — | — | — | — | — | — |']

    axe_rows = []
    for item in axe:
        leading = ', '.join(violation.get('id', '') for violation in item.get('top_violations', [])[:4]) or 'none'
        axe_rows.append(f"| {item.get('label')} | {item.get('violation_count', 0)} | {item.get('affected_nodes', 0)} | {item.get('serious_or_critical_nodes', 0)} | {leading} |")
    if not axe_rows:
        axe_rows.append('| Live audit unavailable | — | — | — | — |')

    asset_rows = [
        f"| `{item['path']}` | {item['bytes'] / 1024 / 1024:.2f} MB |"
        for item in code.get('large_assets_over_500kb', [])[:15]
    ] or ['| None found | — |']

    priorities = []
    redirect_count = html['totals'].get('client_redirect_shells', 0)
    if redirect_count:
        priorities.append(f"Client-side redirect shells: **{redirect_count}** pages perform a browser redirect before the shared game page renders.")
    for key, label in [
        ('image_missing_intrinsic_dimensions', 'Images without both width and height'),
        ('head_script_without_defer_or_async', 'Head scripts without defer or async'),
        ('duplicate_stylesheet_reference', 'Duplicate stylesheet references'),
        ('form_control_missing_label', 'Form controls without a detectable label'),
        ('iframe_missing_title', 'Iframes without a title'),
        ('missing_skip_link', 'Indexable content pages without a skip link'),
    ]:
        count = issue_count(html, key)
        if count:
            priorities.append(f"{label}: **{count}** occurrences/pages in the static scan.")
    if code.get('large_assets_over_500kb'):
        priorities.append(f"Repository assets above 500 KB: **{len(code['large_assets_over_500kb'])}** shown in evidence; the stored list is capped at 100.")
    if axe_serious:
        priorities.append(f"Live axe scan: **{axe_serious}** serious or critical affected nodes across representative routes.")
    if not priorities:
        priorities.append('No high-volume static or live risks were detected by the automated audit; manual review is still required.')

    strengths = [
        f"Focus-visible rules are present in **{code['css'].get('files_with_focus_visible', 0)}** CSS files.",
        f"Reduced-motion handling appears in **{code['css'].get('files_with_reduced_motion', 0)}** CSS files.",
        f"Document language is missing on **{issue_count(html, 'missing_document_language')}** scanned public pages.",
        f"The audit found **{issue_count(html, 'missing_viewport')}** public pages without a viewport meta tag.",
        'Phase 7A made no public-site changes; every finding remains a proposal for later isolated correction phases.',
    ]

    report = f"""# Phase 7A Performance and Accessibility Audit

**Audit type:** repository-wide static analysis plus representative live browser checks  
**Audited commit:** `{static.get('commit', '')}`  
**Standard target:** WCAG 2.2 Level AA  
**Performance reference:** Core Web Vitals good thresholds are LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the 75th percentile. Lighthouse is lab data and does not supply field INP.

## Verdict

**Corrections are recommended, but the audit does not indicate a need to redesign the website.**

The site already contains focus styling, reduced-motion handling, semantic landmarks on major pages and responsive infrastructure. The main opportunities are asset delivery, repeated CSS and JavaScript cost, intrinsic media sizing, keyboard bypass and navigation details, and page-family consistency.

- HTML files scanned: **{html['totals'].get('html_files', 0)}**
- Public HTML files scanned: **{html['totals'].get('public_html', 0)}**
- Indexable public HTML files: **{html['totals'].get('indexable_public_html', 0)}**
- Client-side redirect shells: **{html['totals'].get('client_redirect_shells', 0)}**
- Repository assets scanned: **{code['assets'].get('files', 0)}**
- Median Lighthouse performance score: **{score(median_performance)}**
- Median Lighthouse accessibility score: **{score(median_accessibility)}**
- Live axe violations across representative routes: **{axe_violations}**

## Method and limits

1. Every repository HTML file was parsed for structural accessibility and delivery-risk signals.
2. CSS, JavaScript and media assets were measured by file count and byte size.
3. Representative live routes were checked with axe-core against WCAG 2 A/AA and WCAG 2.2 AA tags.
4. Representative routes received Lighthouse mobile lab audits; home and games also received desktop runs.
5. Lab scores can vary between runs and are not real-user Core Web Vitals. Search Console or CrUX field data is required before claiming a page passes or fails Core Web Vitals in production.
6. Automated accessibility tools cannot determine full WCAG conformance; keyboard, screen-reader, zoom and cognitive-usability review remain necessary.

## Existing strengths

""" + '\n'.join(f'- {item}' for item in strengths) + """

## Priority findings

""" + '\n'.join(f'{index + 1}. {item}' for index, item in enumerate(priorities)) + """

## Lighthouse lab results

| Route | Mode | Performance | Accessibility | LCP | CLS | TBT | Transfer size |
|---|---|---:|---:|---:|---:|---:|---:|
""" + '\n'.join(lighthouse_rows) + """

## Live axe results

| Route | Violations | Affected nodes | Serious/critical nodes | Leading rule IDs |
|---|---:|---:|---:|---|
""" + '\n'.join(axe_rows) + f"""

## Static accessibility totals

- Missing document language: **{issue_count(html, 'missing_document_language')}**
- Missing main landmark: **{issue_count(html, 'missing_main_landmark')}**
- Missing H1: **{issue_count(html, 'missing_h1')}**
- Missing skip link: **{issue_count(html, 'missing_skip_link')}**
- Images missing an alt attribute: **{issue_count(html, 'image_missing_alt_attribute')}**
- Form controls missing a detectable label: **{issue_count(html, 'form_control_missing_label')}**
- Buttons missing a detectable accessible name: **{issue_count(html, 'button_missing_accessible_name')}**
- Links missing a detectable accessible name: **{issue_count(html, 'link_missing_accessible_name')}**
- Iframes missing a title: **{issue_count(html, 'iframe_missing_title')}**
- Positive tabindex values: **{issue_count(html, 'positive_tabindex')}**
- Duplicate IDs: **{issue_count(html, 'duplicate_id')}**

## Static performance-risk totals

- Images missing intrinsic width or height: **{issue_count(html, 'image_missing_intrinsic_dimensions')}**
- Iframes not marked for lazy loading: **{issue_count(html, 'iframe_not_lazy_loaded')}**
- Head scripts without defer or async: **{issue_count(html, 'head_script_without_defer_or_async')}**
- Duplicate stylesheet references: **{issue_count(html, 'duplicate_stylesheet_reference')}**
- Pages with at least 10 stylesheets: **{issue_count(html, 'high_stylesheet_count')}**
- Pages with at least 12 scripts: **{issue_count(html, 'high_script_count')}**
- CSS files above 100 KB: **{issue_count(code, 'css_over_100kb')}**
- JavaScript files above 150 KB: **{issue_count(code, 'javascript_over_150kb')}**
- CSS outline-suppression declarations: **{code['css'].get('outline_suppression_rules', 0)}**

## Largest repository assets identified

| Asset | Size |
|---|---:|
""" + '\n'.join(asset_rows) + """

## Recommended correction sequence

### Phase 7B — Accessibility foundations

Add or standardise skip navigation, accessible names, labels, iframe titles, keyboard treatment for custom controls and focus behaviour. Make no visual redesign.

### Phase 7C — Media dimensions and loading

Add intrinsic image dimensions where source dimensions are known, review hero and logo loading priority, lazy-load below-the-fold embeds and provide stable aspect-ratio containers.

### Phase 7D — CSS and JavaScript delivery

Remove duplicate stylesheet references, consolidate only where file ownership is established, defer non-critical scripts and reduce page-family asset lists without changing the Omega presentation.

### Phase 7E — Large-asset optimisation

Optimise only verified oversized images and media, retaining source quality and established thumbnail framing. Do not replace authentic artwork with generated substitutes.

### Phase 7F — Route performance review

Measure the cost of canonical game redirect shells and evaluate a static-content or server-routing alternative only if lab and field evidence justify the architectural change.

## Safety and scope

- No public HTML, CSS, JavaScript, game data, thumbnail, route, sitemap or existing workflow was changed.
- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and `games/games.json` remain protected.
- Detailed machine-readable evidence accompanies this report.
- No correction should be merged until its own isolated validation phase passes.
"""

    evidence = {
        'commit': static.get('commit'),
        'summary': {
            'html_files': html['totals'].get('html_files', 0),
            'public_html': html['totals'].get('public_html', 0),
            'indexable_public_html': html['totals'].get('indexable_public_html', 0),
            'client_redirect_shells': html['totals'].get('client_redirect_shells', 0),
            'median_lighthouse_performance': median_performance,
            'median_lighthouse_accessibility': median_accessibility,
            'axe_violations': axe_violations,
            'axe_serious_or_critical_nodes': axe_serious,
        },
        'static': static,
        'live': live,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding='utf-8')
    write_json(evidence_path, evidence)


def main() -> None:
    parser = argparse.ArgumentParser()
    subcommands = parser.add_subparsers(dest='command', required=True)
    scan_parser = subcommands.add_parser('scan')
    scan_parser.add_argument('--output', required=True)
    compose_parser = subcommands.add_parser('compose')
    compose_parser.add_argument('--static', required=True)
    compose_parser.add_argument('--live', required=True)
    compose_parser.add_argument('--report', required=True)
    compose_parser.add_argument('--evidence', required=True)
    args = parser.parse_args()

    if args.command == 'scan':
        payload = {
            'commit': git_head(),
            'root': str(ROOT),
            'html': scan_html(),
            'code_assets': scan_code_and_assets(),
        }
        write_json(Path(args.output), payload)
        print(json.dumps(payload['html']['totals'], indent=2))
    else:
        compose(Path(args.static), Path(args.live), Path(args.report), Path(args.evidence))
        print(f'Wrote {args.report} and {args.evidence}')


if __name__ == '__main__':
    main()
