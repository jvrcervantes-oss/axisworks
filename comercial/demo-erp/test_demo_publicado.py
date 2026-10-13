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

# `--publicado <carpeta>` (lo pasa lawang_fijado.py prueba/sube, 14-oct-2026): se mira lo que ACABA de construir `build.py --publico`
# fuera del repo, no el dist/ de git; si no, el `sube` daba por buena la demo publicada vieja (axw-cola). Por ARGUMENTO y no por
# la variable AXW_PRUEBA_PUBLICO: heredada en el control de subida haría que se comprobara otra carpeta que la que sube (revisor).
PUBLICADO = (os.path.join(os.path.abspath(sys.argv[sys.argv.index('--publicado') + 1]), 'demo-erp') if '--publicado' in sys.argv
             else os.path.abspath(os.path.join(AQUI, '..', '..', 'dist', 'demo-erp')))
print('Comprobando la demo publicada en %s' % PUBLICADO)
FALLOS = []


def ok(cond, msg):
    print(('ok   ' if cond else 'FALLA ') + msg)
    if not cond:
        FALLOS.append(msg)

# PROVEEDOR_IA (axw-cola, 14-oct-2026): fuera el nombre del proveedor entre paréntesis de un texto de ayuda, igual en la clave de
# i18n.js y en la llamada T() de la pantalla; una llamada real (dominio, razón social) la sigue parando comprueba_sin_secretos().
_frase = 'Tu frase se envía a un proveedor externo de IA (Anthropic) para redactar el borrador.'
ok(build.PROVEEDOR_IA.sub('', _frase) == 'Tu frase se envía a un proveedor externo de IA para redactar el borrador.',
   'PROVEEDOR_IA quita «(Anthropic)» de un texto de ayuda')
ok('api.anthropic.com' in build.PROVEEDOR_IA.sub('', 'fetch("https://api.anthropic.com/v1")') and
   '(Anthropic, PBC)' in build.PROVEEDOR_IA.sub('', '(Anthropic, PBC)'), 'PROVEEDOR_IA no toca una llamada real ni la razón social')


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
# puerta_demo() quita los comentarios HTML; uno que lleve dentro su marca de cierre deja texto suelto en la página (revisor,
# 12-oct: « y la portada no pasa por limpia_publico.js. -->» salió en el <body>).
ok('<!--' not in t and '-->' not in t, 'la portada publicada no lleva comentarios ni restos de un comentario cortado')
ht = os.path.join(PUBLICADO, '.htaccess')
h = open(ht, encoding='utf-8').read() if os.path.isfile(ht) else ''
ok("connect-src 'self'" in h and 'X-Robots-Tag' in h, 'cabeceras de la demo: connect-src \'self\' y noindex')
ok('RewriteRule ^$ ' not in h, 'la raíz no redirige: sirve la portada')

# Los controles de publicación, otra vez, sobre lo que hay en el repo: una fuga que caiga con un patrón añadido después del
# último build la para el gate aunque la huella cuadre (revisor, 12-oct). aborta() sale con SystemExit.
for nombre, control in (('comprueba_sin_secretos', build.comprueba_sin_secretos), ('comprueba_piel_demo', build.comprueba_piel_demo)):
    try:
        control(PUBLICADO)
        ok(True, '%s sobre dist/demo-erp' % nombre)
    except SystemExit:
        ok(False, '%s sobre dist/demo-erp (ver ABORTA arriba)' % nombre)

if FALLOS:
    print('\n%d fallo(s)' % len(FALLOS))
    sys.exit(1)
print('\nOK: la demo publicada es la de un build que pasó sus controles')
