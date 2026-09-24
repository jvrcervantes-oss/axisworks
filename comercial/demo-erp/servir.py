#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sirve dist/ en 127.0.0.1:8977 SIN caché — 24-sep-2026.

`python -m http.server` no manda Cache-Control, y el navegador se quedaba con la landing y el guard de
la versión anterior: el owner no veía el tour guiado aunque dist/ ya lo tenía. Con `no-store` cada
recarga pide los ficheros de verdad, que es lo que hace falta en una demo que se regenera a menudo.
Solo escucha en 127.0.0.1: la demo no se publica."""
import functools
import http.server
import os
import sys

PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 8977
DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    print('Demo en http://127.0.0.1:%d/  (Ctrl+C para cerrar)' % PUERTO)
    http.server.ThreadingHTTPServer(('127.0.0.1', PUERTO), functools.partial(SinCache, directory=DIST)).serve_forever()
