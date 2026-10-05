#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pruebas de `--panel-contra-publicado` (5-oct-2026, owner: «panel contra lo ya publicado»).   python test_panel_publicado.py

Qué fija, cada cosa con el fallo que evita:
  1. El panel sale con la ruta y la huella de lo que PRODUCCIÓN sirve (`/home/` -> `/intranet/v4/home/`; `?v=` = sha1[:8] del
     fichero publicado): con la huella del build y el fichero viejo, la CDN guardaría el viejo bajo la URL nueva.
  2. Solo se toca lo que sale de panel/: `/panel/...` queda tal cual, y un `?v=` ausente no se inventa.
  3. Si lo publicado no tiene lo que el panel pide, NI con la raíz vieja, el build PARA (nunca se inventa una ruta).
  4. Idempotente: pasarla dos veces no cambia nada la segunda.
  5. El panel solo le pide a guard.js lo que el guard PUBLICADO ya tenía (LW_AUTH, lwEdge: las mismas que el panel viejo). Si el
     panel gana una dependencia nueva del guard, este test falla y obliga a decidir: o se publica el guard, o no se usa."""
import hashlib
import os
import re
import shutil
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_argv, sys.argv = sys.argv, ['build.py']
import build  # noqa: E402
sys.argv = _argv

FALLOS = []


def ok(msg, cond):
    print(('ok   ' if cond else 'FALLA ') + msg)
    if not cond:
        FALLOS.append(msg)


def aborta_con(fn):
    """Lo que `build.aborta` imprimió al parar, o None si no paró (aborta imprime «ABORTA: …» y sale con 1)."""
    import contextlib
    import io
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            fn()
    except SystemExit:
        return buf.getvalue()
    return None


def escribe(p, t):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8', newline='').write(t)


def lee(p):
    return open(p, encoding='utf-8', newline='').read()


def h(b):
    return hashlib.sha1(b).hexdigest()[:8]


# Lo «publicado» de juguete: la estructura vieja (/intranet/v4/home/) y tres ficheros compartidos con su contenido.
PUBLICADO = {
    'intranet/v4/home/index.html': b'<html>home vieja</html>',
    'contracts/assets/guard.js': b'guard viejo\n',
    'contracts/assets/instancia.js': b'instancia vieja\n',
    'contracts/assets/cierre.js': b'cierre viejo\n',
    'contracts/assets/version.js': b'version\n',
}
PAGINA = ('<script src="/contracts/assets/cierre.js?v=NUEVO1"></script><script src="/contracts/assets/guard.js?v=NUEVO2" '
          'data-rol="super_admin"></script><link href="/panel/panel.css?v=d136fb83">'
          '<a href="/home/">Entrar</a><a href="/panel/pilotos/">P</a>'
          '<script src="/contracts/assets/version.js"></script>')


def main():
    leer = PUBLICADO.get
    tmp = tempfile.mkdtemp(prefix='panelpub_')
    try:
        pan = os.path.join(tmp, 'panel')
        escribe(os.path.join(pan, 'index.html'), PAGINA)
        escribe(os.path.join(pan, 'pilotos', 'index.html'), PAGINA)
        cambios = build.panel_contra_publicado(pan, leer)
        t = lee(os.path.join(pan, 'index.html'))
        ok('/home/ pasa a /intranet/v4/home/ (lo que sirve producción)', 'href="/intranet/v4/home/"' in t and 'href="/home/"' not in t)
        ok('guard.js lleva la huella del PUBLICADO', 'guard.js?v=' + h(PUBLICADO['contracts/assets/guard.js']) + '"' in t)
        ok('cierre.js lleva la huella del PUBLICADO', 'cierre.js?v=' + h(PUBLICADO['contracts/assets/cierre.js']) + '"' in t)
        ok('un `?v=` ausente no se inventa', 'src="/contracts/assets/version.js"' in t)
        ok('lo de /panel/ queda tal cual (panel.css?v=, /panel/pilotos/)', 'href="/panel/panel.css?v=d136fb83"' in t and 'href="/panel/pilotos/"' in t)
        ok('data-rol y el resto de atributos intactos', 'data-rol="super_admin"' in t)
        ok('también la página de pilotos', 'href="/intranet/v4/home/"' in lee(os.path.join(pan, 'pilotos', 'index.html')))
        ok('devuelve los cambios hechos (4 por página)', len(cambios) == 6 and any(c[0] == '/home/' for c in cambios))
        antes = lee(os.path.join(pan, 'index.html'))
        ok('idempotente: la segunda pasada no cambia nada', build.panel_contra_publicado(pan, leer) == [] and lee(os.path.join(pan, 'index.html')) == antes)

        # 3) algo que lo publicado no tiene: PARA
        escribe(os.path.join(pan, 'index.html'), '<script src="/contracts/assets/nuevo.js?v=abc"></script>')
        m = aborta_con(lambda: build.panel_contra_publicado(pan, leer))
        ok('fichero que producción no sirve: el build PARA', m is not None and 'nuevo.js' in m and 'no existe en lo publicado' in m)
        escribe(os.path.join(pan, 'index.html'), '<a href="/ajustes/">x</a>')
        m = aborta_con(lambda: build.panel_contra_publicado(pan, leer))
        ok('página que producción no sirve (ni con raíz vieja): PARA', m is not None and '/ajustes/' in m)
        escribe(os.path.join(pan, 'index.html'), '<a href="https://x.com/a.js?v=1"></a><a href="//cdn/x.js"></a>')
        ok('URL absoluta y protocolo-relativa: ignoradas', build.panel_contra_publicado(pan, leer) == [])
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # 5) lo que el panel le pide a guard.js: el conjunto que el panel VIEJO (producción) ya usaba
    PERMITIDO = {'LW_AUTH', 'lwEdge'}
    for f in ('panel_control.html', 'panel_pilotos.html'):
        usados = set(re.findall(r'\bwindow\.(LW_[A-Z_]+|lw[A-Z][A-Za-z]*)\b', lee(os.path.join(AQUI, f))))
        ok('%s solo usa del guard lo que ya tenía el publicado: %s' % (f, sorted(usados)), usados <= PERMITIDO)

    if FALLOS:
        print('\nFALLA test_panel_publicado: %d' % len(FALLOS))
        sys.exit(1)
    print('\nOK test_panel_publicado')


if __name__ == '__main__':
    main()
