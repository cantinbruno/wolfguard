"""Serve the generated app document only in local regression tests.

Production index.html is the private-link gate. Dedicated private_entry_test.py
tests that gate; existing UI tests exercise the app without a production key.
"""
from http.server import SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
import os

ROOT = Path(__file__).resolve().parents[1]
_config_root = Path(os.environ.get('LOCALAPPDATA') or str(Path.home()/'AppData/Local'))/'WolfGuardWeb' if os.name=='nt' else Path(os.environ.get('XDG_CONFIG_HOME') or str(Path.home()/'.config'))/'wolfguard-web'
PRIVATE_ACCESS_FILE = Path(os.environ.get('WOLFGUARD_PRIVATE_DIR') or str(_config_root/'private'))/'site-access.json'

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


def open_security(page):
    """Enter the shared security section before using a destination or Agents."""
    if page.locator("#securityNavigation").is_hidden():
        page.locator(".workspace-security-button").click()
        page.wait_for_function("() => !sectionTransition.active")
