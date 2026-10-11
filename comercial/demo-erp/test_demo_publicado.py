#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""La demo publicada (dist/demo-erp) salió de un `build.py --publico` que pasó TODOS sus controles.   python test_demo_publicado.py

Revisión previa de Seguridad (11-oct-2026, encargo 20261011_demo_cliente_flujo_total): sin esto, alguien podría subir a mano
un dist viejo o retocado —con un rastro de un cliente o una clave— y el push lo publicaría en demo.axisworks.studio. publica()
escribe la huella (sha256 de rutas + contenido) como ÚLTIMO paso, después de comprueba_sin_secretos(); aquí se recalcula. Corre
en el control de subida (el gate ejecuta los test_*.py de esta carpeta, AXW-255).
También fija lo que el cliente ve primero: la raíz es la portada de dos puertas y la marca sale de DEMO (un solo sitio)."""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_argv, sys.argv = sys.argv, ['build.py']
import build  # noqa: E402
sys.argv = _argv

PUBLICADO = os.path.abspath(os.path.join(AQUI, '..', '..', 'dist', 'demo-erp'))
FALLOS = []


def ok(cond, msg):
    print(('ok   ' if cond else 'FALLA ') + msg)
    if not cond:
        FALLOS.append(msg)


ruta = os.path.join(PUBLICADO, build.HUELLA)
ok(os.path.isfile(ruta), 'dist/demo-erp lleva la huella del build (%s)' % build.HUELLA)
if os.path.isfile(ruta):
    escrita = open(ruta, encoding='utf-8').read().strip()
    ok(escrita == build.huella_de(PUBLICADO),
       'la huella casa con lo que hay en dist/demo-erp (si falla: se editó a mano o es de otro build; vuelve a lanzar build.py --publico)')
portada = os.path.join(PUBLICADO, 'index.html')
t = open(portada, encoding='utf-8').read() if os.path.isfile(portada) else ''
ok('data-puerta="portal"' in t and 'data-puerta="intranet"' in t, 'la raíz de la demo es la portada de dos puertas')
ok(build.DEMO['marca'] in t and build.MARCA_HUECO not in t, 'la portada lleva la marca de DEMO y ningún hueco sin rellenar')
ht = os.path.join(PUBLICADO, '.htaccess')
h = open(ht, encoding='utf-8').read() if os.path.isfile(ht) else ''
ok("connect-src 'self'" in h and 'X-Robots-Tag' in h, 'cabeceras de la demo: connect-src \'self\' y noindex')
ok('RewriteRule ^$ ' not in h, 'la raíz no redirige: sirve la portada')

if FALLOS:
    print('\n%d fallo(s)' % len(FALLOS))
    sys.exit(1)
print('\nOK: la demo publicada es la de un build que pasó sus controles')
