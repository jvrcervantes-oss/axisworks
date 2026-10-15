#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""mod_rewrite MÍNIMO para probar los .htaccess que genera build.py (RewriteCond de HTTP_HOST, REQUEST_METHOD y
QUERY_STRING + RewriteRule con R=, L, QSA, NC) sin Apache. Lo usan test_urls_limpias.py y, a mano, un servidor local para
recorrer el bundle en un navegador. No modela cómo decodifica LiteSpeed `%2f`/`%5c`: la prueba real es el `curl` en producción."""
import re
from urllib.parse import unquote


class Htaccess:
    """mod_rewrite mínimo: RewriteCond (HTTP_HOST, REQUEST_METHOD, QUERY_STRING) + RewriteRule con R=, L, QSA, NC."""

    def __init__(self, texto):
        self.reglas, conds = [], []
        for linea in texto.splitlines():
            linea = linea.strip()
            m = re.match(r'RewriteCond\s+%\{(\w+)\}\s+(\S+)(?:\s+\[(.*)\])?$', linea)
            if m:
                conds.append((m.group(1), m.group(2), m.group(3) or ''))
                continue
            m = re.match(r'RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[(.*)\])?$', linea)
            if m:
                self.reglas.append((m.group(1), m.group(2), (m.group(3) or '').split(','), conds))
                conds = []

    def aplica(self, ruta, metodo='GET', host='demo.axisworks.studio', consulta='', decodifica=True):
        """Devuelve (código, Location) o None si ninguna regla redirige. `ruta` sin consulta, como llega (con %xx)."""
        camino = (unquote(ruta) if decodifica else ruta).lstrip('/')
        for patron, destino, flags, conds in self.reglas:
            if not any(f.startswith('R=30') for f in flags):
                continue
            cumple = True
            for var, pat, fl in conds:
                valor = {'HTTP_HOST': host, 'REQUEST_METHOD': metodo, 'QUERY_STRING': consulta}[var]
                neg = pat.startswith('!')
                casa = re.search(pat.lstrip('!'), valor, re.I if 'NC' in fl else 0) is not None
                if casa == neg:
                    cumple = False
                    break
            m = re.search(patron, camino) if cumple else None
            if not m:
                continue
            destino = re.sub(r'\$(\d)', lambda g: m.group(int(g.group(1))) or '', destino)
            if consulta and '?' not in destino:
                destino += '?' + consulta
            return (int([f for f in flags if f.startswith('R=')][0][2:]), destino)
        return None

    def resuelve(self, ruta, metodo='GET', host='demo.axisworks.studio', consulta='', vueltas=10):
        """Como mod_rewrite en un .htaccess (contexto de directorio), con las reglas internas (sin R=) además de las redirecciones: las reglas van en
        orden; una interna con [L] reescribe la ruta y el fichero se vuelve a pasar ENTERO por las reglas (la vuelta por directorio), hasta que ninguna
        casa o la ruta no cambia. Devuelve ('redirige', código, Location), ('sirve', '/ruta servida') o ('bucle', ruta) tras `vueltas` pasadas.
        Sin RewriteBase distinto de /: un destino relativo cuelga de la raíz. Rutas inglesas de las instancias (bbm-idioma-total, 15-oct-2026)."""
        camino = unquote(ruta).lstrip('/')
        for _ in range(vueltas):
            nuevo = None
            for patron, destino, flags, conds in self.reglas:
                cumple = True
                for var, pat, fl in conds:
                    valor = {'HTTP_HOST': host, 'REQUEST_METHOD': metodo, 'QUERY_STRING': consulta}[var]
                    neg = pat.startswith('!')
                    casa = re.search(pat.lstrip('!'), valor, re.I if 'NC' in fl else 0) is not None
                    if casa == neg:
                        cumple = False
                        break
                m = re.search(patron, camino) if cumple else None
                if not m:
                    continue
                d = re.sub(r'\$(\d)', lambda g: m.group(int(g.group(1))) or '', destino)
                if any(f.startswith('R=30') for f in flags):
                    if consulta and '?' not in d:
                        d += '?' + consulta
                    return ('redirige', int([f for f in flags if f.startswith('R=')][0][2:]), d)
                camino_d = d.lstrip('/')
                if 'L' in flags:
                    nuevo = camino_d
                    break
                camino = camino_d
            if nuevo is None or nuevo == camino:
                return ('sirve', '/' + (nuevo if nuevo is not None else camino))
            camino = nuevo
        return ('bucle', '/' + camino)

def mismo_dominio(loc):
    """Un Location relativo de ruta no sale del dominio: empieza por UNA barra y no por `//` ni `/\\`."""
    return loc.startswith('/') and not loc.startswith('//') and not loc.startswith('/\\')
