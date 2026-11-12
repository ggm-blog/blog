#!/usr/bin/env python3
"""Isolated Quarto licensing/citation/feed checks; optional actual browser checks.

PLAYWRIGHT_MODULE=/path/to/playwright python3 tests/test-citations.py /path/to/quarto
"""
from datetime import datetime, timedelta
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from zoneinfo import ZoneInfo
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
QUARTO = str(Path(sys.argv[1]).resolve())
TODAY = datetime.now(ZoneInfo('America/Los_Angeles')).date()
SLUGS = ['2026-12-parser-grammar', '2026-11-ggm-origin-story',
         '2026-11-tensor-tension', '2026-11-surprising-riposte']


def main():
    env = os.environ.copy()
    env.pop('QUARTO_PROFILE', None)
    with tempfile.TemporaryDirectory(prefix='ggm-citation-') as temp:
        work = Path(temp)
        names = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard'], cwd=ROOT, text=True).splitlines()
        for name in names:
            if name in ['CHANGES.md', 'dillon-bib.zip', 'ggm-first-posts.zip']:
                continue
            src, dst = ROOT / name, work / name
            if src.is_file():
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
        bodies = {p: p.read_bytes().split(b'\n---', 1)[1] for p in ROOT.glob('posts/**/*.qmd')}
        for slug in SLUGS[:2]:
            path = work / 'posts' / slug / 'index.qmd'
            path.write_text(re.sub(r'^date:.*$', f'date: "{TODAY - timedelta(days=1)}"', path.read_text(), flags=re.M))
        # A per-post editor-approved license must override the shared default.
        ellen = work / 'posts' / SLUGS[2] / 'index.qmd'
        ellen.write_text(ellen.read_text().replace('\n---\n', '\nlicense: "CC BY-SA"\n---\n', 1))

        def run(args, ok=True):
            result = subprocess.run(args, cwd=work, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            assert (result.returncode == 0) == ok, result.stdout
            return result.stdout

        for profile in ['production', 'staging']:
            if profile == 'staging':
                env['QUARTO_PROFILE'] = 'staging'
            else:
                env.pop('QUARTO_PROFILE', None)
            run([QUARTO, 'render'])
            site = work / '_site'
            home = (site / 'index.html').read_text()
            assert re.search(r'<link[^>]+rel="alternate"[^>]+type="application/rss\+xml"[^>]+href="index.xml"', home)
            feed = ET.fromstring((site / 'index.xml').read_text())
            entries = feed.findall('./channel/item')
            assert len(entries) == (4 if profile == 'staging' else 2)
            for item in entries:
                assert item.findtext('title') and item.findtext('pubDate')
                assert item.findtext('link').startswith('https://ggmblog.org/posts/')
                creators = item.findall('{http://purl.org/dc/elements/1.1/}creator')
                assert creators and all(' ' in author.text and not re.search('tim-hunter|brian-dillon|ming-xiang', author.text) for author in creators)
                content = item.findtext('description', '')
                assert len(content) > 5000, (item.findtext('title'), len(content))
                assert f'title = {{{{{html.escape(item.findtext("title"), quote=True)}}}}}' in content
            for slug in SLUGS[:2]:
                page = (site / 'posts' / slug / 'index.html').read_text()
                assert '<a rel="license" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>' in page
                assert 'id="cite"' in page and 'href="#cite"' in page
                assert 'aria-live="polite"' in page
                assert re.search(r'<link[^>]+rel="canonical"[^>]+href="https://ggmblog.org/posts/', page)
                assert not re.search(r'<meta name="citation_author" content="[^\"]*(tim-hunter|brian-dillon|ming-xiang)', page)
                assert f'<meta name="citation_publication_date" content="{TODAY - timedelta(days=1)}">' in page
                schema = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', page)[1])
                assert schema['@type'] == 'BlogPosting' and schema['license'].endswith('/by/4.0/')
                assert schema['datePublished'] == str(TODAY - timedelta(days=1))
                assert schema['url'] == f'https://ggmblog.org/posts/{slug}/'
                assert f'property="og:url" content="https://ggmblog.org/posts/{slug}/"' in page
                bib = site / 'posts' / slug / 'citation.bib'
                parsed = json.loads(run([QUARTO, 'pandoc', '-f', 'bibtex', '-t', 'csljson', str(bib)]))[0]
                assert parsed['author'][0]['family'] == ('Hunter' if slug == SLUGS[0] else 'Dillon')
                if slug == SLUGS[1]:
                    assert parsed['author'][-1] == {'family': 'Xiang', 'given': 'Ming'}
                for author in parsed['author']:
                    assert author.get('given') and author.get('family')
            for slug in SLUGS[2:]:
                page = site / 'posts' / slug / 'index.html'
                assert page.exists() == (profile == 'staging')
                if profile == 'staging':
                    assert 'id="quarto-draft-alert"' in page.read_text()
            if profile == 'staging':
                override = (site / 'posts' / SLUGS[2] / 'index.html').read_text()
                assert 'https://creativecommons.org/licenses/by-sa/4.0/' in override
                schema = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', override)[1])
                assert schema['license'].endswith('/by-sa/4.0/')
            for file in site.rglob('*.html'):
                assert not re.search(r'your-org|The Consortium|href=["\'][^"\']*placeholder', file.read_text()), file
            print(f'PASS {profile}: native APA/BibTeX parsing, real authors, date, Reuse/override, full-text XML feed, autodiscovery, JSON-LD, visibility', flush=True)
            if env.get('PLAYWRIGHT_MODULE'):
                class Quiet(SimpleHTTPRequestHandler):
                    def log_message(self, *args): pass
                server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(site)))
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                try:
                    run(['node', str(ROOT / 'tests/cite-browser.cjs'),
                         f'http://127.0.0.1:{server.server_port}', profile, '/private/tmp/ggm-citation-fixture-shots'])
                    print(f'PASS {profile}: browser matrix, keyboard clipboard, textarea fallback, JS off', flush=True)
                finally:
                    server.shutdown()
                    server.server_close()

        # Name parsing: defaults, explicit compound surname, and helpful failures.
        registry = work / 'authors.yml'
        original = registry.read_text()
        registry.write_text(original.replace('name: Tim Hunter', 'name: Tim de Hunter\n  family: de Hunter\n  given: Tim'))
        run([QUARTO, 'run', 'scripts/prepare-authors.ts'])
        assert 'family: de Hunter' in (work / 'generated/author-names.yml').read_text()
        registry.write_text(original.replace('name: Tim Hunter', 'name: 向明'))
        failure = run([QUARTO, 'run', 'scripts/prepare-authors.ts'], ok=False)
        assert 'tim-hunter: cannot resolve citation name' in failure
        registry.write_text(original.replace('name: Tim Hunter', 'name: Tim Hunter\n  family: Hunter'))
        failure = run([QUARTO, 'run', 'scripts/prepare-authors.ts'], ok=False)
        assert 'supply both family and given' in failure
        for path, body in bodies.items():
            assert path.read_bytes().split(b'\n---', 1)[1] == body
        print('PASS optional name parts, non-Latin fallback failure, incomplete parts failure; real bodies unchanged')


if __name__ == '__main__':
    main()
