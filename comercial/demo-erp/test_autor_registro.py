#!/usr/bin/env python3
"""python test_autor_registro.py — quién firma una fila de un registro de cambios se clasifica IGUAL en todas las copias de la regla.

Por qué (bbm-idioma-total, 15-oct-2026): en bbm en inglés e indonesio, /flota/ › «Latest changes» enseñaba el motivo interno de la carga
inicial («carga inicial copiada del sistema de Dion… (la hace AxisWorks por SQL)») porque Flota no aplicaba la regla que ya tenían Entrega,
la ficha del bot y el Registro de Ajustes; y esas copias no reconocían a «erp: idioma de la instancia» ni a «hello@axisworks.studio (panel)»,
dos autores reales de la base de bbm. La regla vive en la capa común (_compartido/pantalla_comun.js: Flota y Entrega); la ficha del bot
(whatsapp_bot.html, sin capa común) y el parche del Registro de Ajustes (GASTOS_INSTANCIA de build.py, sobre Lawang) llevan su copia. Este
test afirma el hecho contra las tres: mismos casos, misma clase. Contraprueba: --rompe quita «erp:» de una copia y tiene que salir rojo.
"""
import json
import os
import re
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
ROMPE = '--rompe' in sys.argv
CASOS = {
    'dion@balibestmotorcycle.com': 'persona', 'Dion': 'persona', '0b0f6a9e-1c2d-4e5f-8a9b-0c1d2e3f4a5b': 'persona', 'migraciones-fan@x.com': 'persona',
    'a"<svg onload="x">@x.com': 'persona', 'erp-fan@x.com': 'persona',
    '': 'inicial', 'postgres': 'inicial', 'Postgres': 'inicial', 'sistema:sql': 'inicial', 'migración 20261008138500': 'inicial',
    'migracion': 'inicial', 'erp: idioma de la instancia': 'inicial',
    'hello@axisworks.studio': 'soporte', 'hello@axisworks.studio (panel)': 'soporte',
    'sistema:aaas': 'sistema', 'sistema:service_role': 'sistema',
}


def lee(rel):
    return open(os.path.join(AQUI, *rel.split('/')), encoding='utf-8').read()


def copias():
    out = {}
    m = re.search(r'\n  function autorDe\(q\) \{.*?\n  \}', lee('_compartido/pantalla_comun.js'), re.S)
    out['capa común (Flota, Entrega)'] = m.group(0) if m else None
    m = re.search(r'\n  function autorDe\(q\) \{.*?\n  \}', lee('whatsapp_bot.html'), re.S)
    out['whatsapp_bot.html'] = m.group(0) if m else None
    sys.path.insert(0, AQUI)
    import build
    js = None
    for t in build.GASTOS_INSTANCIA:
        if 'function axwAutor(q)' in t[2]:
            js = re.search(r'function axwAutor\(q\) \{.*?\}\n', t[2], re.S).group(0) + ';var autorDe = axwAutor;'
    out['Registro de Ajustes (GASTOS_INSTANCIA)'] = js
    if ROMPE:
        k = 'whatsapp_bot.html'
        out[k] = out[k].replace(' || /^erp:/i.test(q)', '')
    return out


fallos = []
for nombre, js in copias().items():
    if not js:
        fallos.append(nombre + ': no encuentro la regla')
        continue
    p = subprocess.run(['node', '-e', js + ';process.stdout.write(JSON.stringify(' + json.dumps(list(CASOS)) + '.map(autorDe).concat([autorDe(null)])))'],
                       capture_output=True, text=True, encoding='utf-8')
    obt = json.loads(p.stdout) if p.returncode == 0 and p.stdout.strip() else None
    quiere = list(CASOS.values()) + ['inicial']
    if obt != quiere:
        mal = [q for q, a, b in zip(list(CASOS) + [None], obt or [], quiere) if a != b] if obt else [p.stderr[-200:]]
        fallos.append(nombre + ': distinto en ' + repr(mal))
if fallos:
    print('FALLA test_autor_registro:\n  ' + '\n  '.join(fallos))
    sys.exit(1)
print('OK test_autor_registro: %d casos × 3 copias' % (len(CASOS) + 1))
