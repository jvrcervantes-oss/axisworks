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
import subprocess
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
    for f in ('panel_control.html', 'panel_pilotos.html', 'panel_aprobaciones.html'):
        usados = set(re.findall(r'\bwindow\.(LW_[A-Z_]+|lw[A-Z][A-Za-z]*)\b', lee(os.path.join(AQUI, f))))
        ok('%s solo usa del guard lo que ya tenía el publicado: %s' % (f, sorted(usados)), usados <= PERMITIDO)

    # 5b) Aprobaciones (AXW-178, 9-oct-2026): la vista es COPIA de la fuente de la agencia (la que prueba su panel.test.js). Tiene que ser la
    # misma pagina entera menos su comentario de cabecera y las tres lineas de piel que la copia anade (iconos, panel.css, pildora de la barra
    # activa): lo que decide QUE se le manda a la edge (pide, carga, resuelve, plazos, pausa) tambien cuenta, no solo el dibujo. Si divergen,
    # o se prueba una cosa y se publica otra, o al reves. Sin la fuente a mano (otra maquina) se dice, no se da por bueno.
    PIEL = ('<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet">\n',
            '<link rel="stylesheet" href="/panel/panel.css">\n',
            '.nav-pill[aria-current=page]{background:#4f46e5;color:#fff}\n')

    def cuerpo(txt, quita_piel):
        for l in (PIEL if quita_piel else ()):
            if txt.count(l) != 1:
                return None
            txt = txt.replace(l, '')
        return re.sub(r'<!--.*?-->', '', txt, count=1, flags=re.S)
    copia = lee(os.path.join(AQUI, 'panel_aprobaciones.html')).replace('\r\n', '\n')   # saltos de línea normalizados para TODO lo de abajo
    ok('panel_aprobaciones.html lleva su bloque RENDER y las tres lineas de piel', '/*RENDER-INICIO*/' in copia and cuerpo(copia, True) is not None)
    RUTA_FUENTE = 'erp/funciones/agente-aprobaciones/panel_aprobaciones.html'
    fuente = os.path.join(build.AGENCIA, *RUTA_FUENTE.split('/'))
    # La fuente que manda es la PUBLICADA: la origin/main LOCAL de la agencia (la que dejó el último fetch; las copias de sesión comparten
    # esa ref con el clon principal, así que avanza aunque el clon no pueda), no el disco del clon. Un clon principal atrasado (12-oct-2026:
    # no podía avanzar por ficheros sin commitear de otros) dejaba este test en rojo para todas las sesiones con la copia ya al día.
    # Al disco solo se cae si la agencia no es un repo con origin/main (otra máquina); si lo es y la ruta no está allí, es un FALLO.
    hay_ref = subprocess.run(['git', '-C', build.AGENCIA, 'rev-parse', '--verify', '-q', 'origin/main'], capture_output=True).returncode == 0
    if hay_ref:
        publicada = subprocess.run(['git', '-C', build.AGENCIA, 'show', 'origin/main:' + RUTA_FUENTE], capture_output=True)
        texto_fuente = publicada.stdout.decode('utf-8') if publicada.returncode == 0 else None
        print('fuente de Aprobaciones: origin/main de la agencia' if texto_fuente is not None else 'fuente de Aprobaciones: NO está en origin/main')
        ok('la fuente de Aprobaciones existe en origin/main de la agencia', texto_fuente is not None)
    else:
        texto_fuente = lee(fuente) if os.path.isfile(fuente) else None
        print('fuente de Aprobaciones: disco (%s), sin origin/main de la agencia' % fuente)
    if texto_fuente is not None:
        ok('la copia es la fuente de la agencia (la que prueba panel.test.js) salvo cabecera y piel',
           cuerpo(copia, True) == cuerpo(texto_fuente.replace('\r\n', '\n'), False))
    elif not hay_ref:
        print('aviso: no hay fuente de la agencia en %s: no se compara' % fuente)
    vista = re.sub(r'<!--.*?-->|/\*.*?\*/', '', lee(os.path.join(AQUI, 'panel_aprobaciones.html')), flags=re.S)   # sin comentarios, que nombran lo prohibido
    ok('aprobaciones: noindex, guard de super_admin y hueco de la barra', 'name="robots" content="noindex"' in vista and 'data-rol="super_admin"' in vista and vista.count('__AXW_PANEL_NAV__') == 1)
    ok('aprobaciones: solo habla con la edge agente-aprobaciones y no toca la base', "lwEdge('agente-aprobaciones')" in vista and '.from(' not in vista and '.rpc(' not in vista and 'innerHTML' not in vista)
    ok('la barra compartida tiene la sección aprobaciones y build la monta', 'data-nav="aprobaciones"' in lee(os.path.join(AQUI, '_compartido', 'panel_nav.html')) and "panel_nav(aprob, 'aprobaciones')" in lee(os.path.join(AQUI, 'build.py')))

    # 6) publicado_de_clon con repos git de verdad: una origin/main local VIEJA no engaña (hace fetch); un HEAD adelantado para

    def g(cwd, *a):
        subprocess.run(['git', '-c', 'user.email=t@t', '-c', 'user.name=t'] + list(a), cwd=cwd, check=True, capture_output=True)
    tmp = tempfile.mkdtemp()
    try:
        origen = os.path.join(tmp, 'origen')
        os.makedirs(origen)
        g(origen, 'init', '-q', '-b', 'main')
        escribe(os.path.join(origen, 'a.txt'), 'v1')
        g(origen, 'add', '.')
        g(origen, 'commit', '-qm', 'v1')
        desp = os.path.join(tmp, 'desp')
        os.makedirs(desp)
        clon = os.path.join(desp, 'inst')
        subprocess.run(['git', 'clone', '-q', origen, clon], check=True, capture_output=True)
        g(clon, 'checkout', '-q', '-b', 'limpio')
        ok('clon al día: lee el blob publicado', build.publicado_de_clon('inst', desp)('a.txt') == b'v1')
        escribe(os.path.join(origen, 'a.txt'), 'v2')   # origin avanza; la ref local del clon sigue en v1
        g(origen, 'commit', '-qam', 'v2')
        m = aborta_con(lambda: build.publicado_de_clon('inst', desp))
        ok('origin/main local vieja: el fetch lo detecta y PARA (no da v1 por publicado)', m is not None and 'origin/main' in m)
        g(clon, 'reset', '-q', '--hard', 'origin/main')
        ok('tras ponerse al día vuelve a valer', build.publicado_de_clon('inst', desp)('a.txt') == b'v2')
        escribe(os.path.join(clon, 'a.txt'), 'local')
        g(clon, 'commit', '-qam', 'local sin subir')
        m = aborta_con(lambda: build.publicado_de_clon('inst', desp))
        ok('commit local sin subir: PARA', m is not None and 'origin/main' in m)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    if FALLOS:
        print('\nFALLA test_panel_publicado: %d' % len(FALLOS))
        sys.exit(1)
    print('\nOK test_panel_publicado')


if __name__ == '__main__':
    main()
