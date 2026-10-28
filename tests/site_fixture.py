"""Serve the generated app document only in local regression tests.

Production index.html is the private-link gate. Dedicated private_entry_test.py
tests that gate; existing UI tests exercise the app without a production key.
"""
from http.server import SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]

class WolfGuardTestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path in ('/', '/index.html'):
            data = (ROOT / '.cache/site-document.html').read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()
