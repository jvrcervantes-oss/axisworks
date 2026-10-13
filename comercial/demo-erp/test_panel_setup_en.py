#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""python test_panel_setup_en.py — cada perfil del alta (erp/perfiles.json de la AGENCIA) tiene nombre y frase en inglés en panel_setup_en.json
(14-oct-2026, erp-servicios). Sin esto build.py ABORTA el paquete entero (setup_para_panel), así que un perfil nuevo en la agencia
(servicios, el tercer tipo) exige antes su nombre aquí: esta prueba lo dice en el pre-push de AxisWorks, no en el build de publicar.
La agencia sale de AXW_AGENCIA_RAIZ, como en build.py."""
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
AGENCIA = os.path.abspath(os.environ.get('AXW_AGENCIA_RAIZ') or os.path.join(AQUI, '..', '..', '..', '..'))
fallos = []
en = json.load(open(os.path.join(AQUI, 'panel_setup_en.json'), encoding='utf-8'))
tipos = en.get('tipos') or {}
for t, v in sorted(tipos.items()):
    if not (isinstance(v, list) and len(v) == 2 and all(isinstance(x, str) and x.strip() for x in v)):
        fallos.append('tipo %s: tiene que ser [nombre, frase], los dos con texto' % t)
# los tres tipos de ERP del owner (13-oct) tienen nombre aunque la agencia aún no publique el perfil
for t in ('inmobiliario', 'generalista', 'servicios'):
    if t not in tipos:
        fallos.append('falta el tipo %s' % t)
ruta = os.path.join(AGENCIA, 'erp', 'perfiles.json')
if os.path.exists(ruta):
    perf = json.load(open(ruta, encoding='utf-8'))['perfiles']
    for t in sorted(set(perf) - set(tipos)):
        fallos.append('el perfil %s de %s no tiene nombre en inglés: build.py abortaría' % (t, ruta))
else:
    print('aviso: sin la agencia en %s; solo se mira el propio fichero' % ruta)
if fallos:
    print('FALLA test_panel_setup_en:\n  ' + '\n  '.join(fallos))
    sys.exit(1)
print('OK test_panel_setup_en: %d tipos' % len(tipos))
