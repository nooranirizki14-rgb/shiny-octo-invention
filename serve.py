#!/usr/bin/env python3
"""Dev server for Doodle District.

Plain `python3 -m http.server` answers conditional requests with 304, so a
browser that cached index.html (or a ?v=-pinned asset whose version did not
change) keeps showing the OLD build - which looks exactly like the game
breaking. This server tells the browser never to reuse index.html, so a
plain reload always picks up the current build.
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        path = self.path.split('?')[0]
        if path in ('/', '/index.html'):
            self.send_header('Cache-Control', 'no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def send_header(self, key, value):
        # drop validators on the HTML so the browser cannot send If-Modified-Since
        if key.lower() in ('last-modified', 'etag'):
            if self.path.split('?')[0] in ('/', '/index.html'):
                return
        super().send_header(key, value)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
