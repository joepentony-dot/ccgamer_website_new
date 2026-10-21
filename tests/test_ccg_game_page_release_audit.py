"""Local HTML fixtures for read-only source-versus-Pages staged checks."""
import importlib.util
import tempfile
import unittest
import json
import contextlib
import io
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'ccg_game_page_release_audit.py'
spec = importlib.util.spec_from_file_location('ccg_gate', SCRIPT)
gate = importlib.util.module_from_spec(spec)
import sys
sys.modules[spec.name] = gate
spec.loader.exec_module(gate)

HTML = '''<!doctype html><html lang="en"><head>
<title>Chuckie Egg C64 – Review, Manual &amp; Gameplay | CCG</title>
<meta name="description" content="Collect eggs, dodge hens and climb ladders in Chuckie Egg on the Commodore 64.">
<meta name="robots" content="index,follow">
<meta property="og:title" content="Chuckie Egg C64 – Review, Manual &amp; Gameplay | CCG">
<meta property="og:description" content="Collect eggs, dodge hens and climb ladders in Chuckie Egg on the Commodore 64.">
<meta property="og:url" content="https://www.cheekycommodoregamer.co.uk/games/chuckie-egg/">
<meta name="twitter:title" content="Chuckie Egg C64 – Review, Manual &amp; Gameplay | CCG">
<meta name="twitter:description" content="Collect eggs, dodge hens and climb ladders in Chuckie Egg on the Commodore 64.">
<link rel="canonical" href="https://www.cheekycommodoregamer.co.uk/games/chuckie-egg/">
<script type="application/ld+json" data-ccg-schema="game-graph">{"@type":"VideoGame","name":"Chuckie Egg"}</script>
</head><body class="ccg-single-ready"><div class="ccg-page" data-ccg-prefilled="true">
<span data-ccg-static-editorial-rating="true">6/10</span>
<!-- CCG_MAGAZINE_REVIEWS_STATIC_START --><p>Original magazine review</p><!-- CCG_MAGAZINE_REVIEWS_STATIC_END -->
<div id="gameDescription" class="game-description">Game-specific editorial history and gameplay.</div>
<p data-ccg-video-description>Game-specific video introduction.</p>
<iframe id="game-video-embed" data-video-src="https://www.youtube-nocookie.com/embed/example" hidden></iframe>
<a class="ccg-btn ccg-btn--emulator-play" data-ccg-play-in-emulator="true" href="/emulator/c64/?game=owner-crt-more-chuckie-egg&amp;autoplay=1">Play in C64 Emulator</a>
</div></body></html>'''

class StageParityTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.source = Path(self.dir.name)/'source'
        self.stage = Path(self.dir.name)/'site'
        for root in [self.source,self.stage]:
            folder=root/'games'/'chuckie-egg'
            folder.mkdir(parents=True)
            (folder/'index.html').write_text(HTML,encoding='utf-8')
    def inspect(self):
        return gate.compare_game({'slug':'chuckie-egg','system':'C64'},self.source,self.stage)
    def replace_stage(self, old, new):
        p=self.stage/'games'/'chuckie-egg'/'index.html'
        p.write_text(p.read_text(encoding='utf-8').replace(old,new),encoding='utf-8')
    def test_identical_passes(self):
        self.assertEqual(self.inspect().problems,[])
    def test_deploy_overwrite_removes_button(self):
        self.replace_stage('data-ccg-play-in-emulator="true"','data-ccg-play-in-emulator="false"')
        self.assertIn('APPROVED_EMULATOR_LINK_MISSING_OR_CHANGED', self.inspect().problems)
    def test_deploy_reverts_title(self):
        self.replace_stage('Chuckie Egg C64 – Review, Manual &amp; Gameplay | CCG',
                           'Chuckie Egg (1984) – C64 | Review, Screens &amp; History')
        self.assertIn('SEO_TITLE_CHANGED',self.inspect().problems)
    def test_staged_magazine_removed(self):
        self.replace_stage('Original magazine review','')
        self.assertIn('STATIC_MAGAZINE_REVIEWS_CHANGED',self.inspect().problems)
    def test_fails_on_robots_noindex(self):
        self.replace_stage('content="index,follow"','content="noindex,follow"')
        self.assertIn('STAGED_NOT_INDEXABLE',self.inspect().problems)
    def test_source_not_modified(self):
        self.replace_stage('Game-specific editorial history and gameplay.', 'Generic text')
        self.assertIn('GAME_OVERVIEW_CHANGED',self.inspect().problems)
        self.assertIn('Game-specific editorial history and gameplay.',(self.source/'games'/'chuckie-egg'/'index.html').read_text())
    def test_displayed_rating_change_fails_even_with_original_marker(self):
        self.replace_stage('6/10', '9/10')
        self.assertIn('STATIC_RATING_CHANGED', self.inspect().problems)
    def test_rating_parser_handles_real_nested_badge(self):
        raw = HTML.replace('<span data-ccg-static-editorial-rating="true">6/10</span>',
            '<div data-ccg-static-editorial-rating="true"><span>6/10</span></div>')
        self.assertEqual(gate.summarize_html(raw)['rating'], '6/10')
    def test_external_and_ambiguous_play_destinations_fail(self):
        href = '/emulator/c64/?game=real-id&autoplay=1'
        self.assertTrue(gate.inspect_play(href))
        for invalid in ['https://example.com' + href, '//example.com' + href,
                        href + '&game=other-id', href + '#fake', href.replace('autoplay=1', 'autoplay=0')]:
            self.assertFalse(gate.inspect_play(invalid), invalid)
    def test_spaced_noindex_and_none_fail(self):
        for robots in ['index, noindex,follow', 'index,none,follow']:
            with self.subTest(robots=robots):
                (self.stage/'games'/'chuckie-egg'/'index.html').write_text(
                    HTML.replace('content="index,follow"', f'content="{robots}"'), encoding='utf-8')
                self.assertIn('STAGED_NOT_INDEXABLE', self.inspect().problems)
    def test_invalid_json_ld_fails_when_both_roots_share_invalid_source(self):
        for root in [self.source, self.stage]:
            (root/'games'/'chuckie-egg'/'index.html').write_text(HTML.replace('{"@type":"VideoGame","name":"Chuckie Egg"}', '{bad json}'), encoding='utf-8')
        self.assertIn('STAGED_INVALID_JSON_LD_GRAPH', self.inspect().problems)
    def write_catalogues(self, games):
        for root in [self.source, self.stage]:
            (root/'games'/'games.json').write_text(json.dumps(games), encoding='utf-8')
    def run_audit(self, report=None):
        report = report or Path(self.dir.name)/'reports'
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return gate.main(['--source',str(self.source),'--staged',str(self.stage),'--report-dir',str(report)])
    def test_catalogue_driven_cli_and_report_are_read_only(self):
        self.write_catalogues([{'slug':'chuckie-egg','system':'C64'}])
        before = {str(p):p.read_bytes() for root in [self.source,self.stage] for p in root.rglob('*') if p.is_file()}
        self.assertEqual(self.run_audit(), 0)
        self.assertEqual(before, {str(p):p.read_bytes() for root in [self.source,self.stage] for p in root.rglob('*') if p.is_file()})
        summary = json.loads((Path(self.dir.name)/'reports'/'ccg-game-release-report.json').read_text())['summary']
        self.assertEqual(summary['catalogue_count'], 1)
        self.assertEqual(summary['approved_staged_c64_buttons'], 1)
    def test_staged_catalogue_must_be_identical(self):
        self.write_catalogues([{'slug':'chuckie-egg','system':'C64'}])
        (self.stage/'games'/'games.json').write_text('[]', encoding='utf-8')
        self.assertEqual(self.run_audit(), 2)
    def test_empty_catalogue_cannot_pass_with_zero_checked_pages(self):
        self.write_catalogues([])
        self.assertEqual(self.run_audit(), 2)
    def test_future_game_is_automatically_included_and_amiga_has_no_c64_cta(self):
        self.write_catalogues([{'slug':'chuckie-egg','system':'C64'}, {'slug':'future-game','system':'Amiga'}])
        for root in [self.source,self.stage]:
            folder = root/'games'/'future-game'
            folder.mkdir()
            content = HTML.replace('/games/chuckie-egg/', '/games/future-game/')
            content = gate.re.sub(r'<a\b[^>]*data-ccg-play-in-emulator="true"[^>]*>.*?</a>', '', content)
            (folder/'index.html').write_text(content, encoding='utf-8')
        self.assertEqual(self.run_audit(), 0)
        summary = json.loads((Path(self.dir.name)/'reports'/'ccg-game-release-report.json').read_text())['summary']
        self.assertEqual(summary['catalogue_count'], 2)
        self.assertEqual(summary['amiga_count'], 1)
        (self.stage/'games'/'future-game'/'index.html').unlink()
        self.assertEqual(self.run_audit(), 2)
    def test_report_cannot_write_into_source_or_staged_site(self):
        self.write_catalogues([{'slug':'chuckie-egg','system':'C64'}])
        for root in [self.source,self.stage]:
            with self.assertRaises(SystemExit) as raised:
                self.run_audit(root/'reports')
            self.assertEqual(raised.exception.code, 2)

if __name__=='__main__':
    unittest.main()
