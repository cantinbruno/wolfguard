"""Serve the actual published document in local regression tests."""
from http.server import SimpleHTTPRequestHandler

class WolfGuardTestHandler(SimpleHTTPRequestHandler):
    pass
