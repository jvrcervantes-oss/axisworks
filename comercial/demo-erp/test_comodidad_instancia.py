#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""python test_comodidad_instancia.py — los retoques de comodidad del editor de documentos en la copia de una instancia (bbm-comodidad, 15-oct-2026).

F4: con UNA sola empresa emisora, «Sociedad que factura/cobra» nace elegida; con dos o más (Lawang, la demo), nace en «— elige —» como siempre.
F8: el recibí nuevo no pide «Vencimiento»; uno ya guardado que lo tenga lo sigue enseñando (no se pierde el dato al reguardar).
Comprueba sobre el editores.js REAL de Lawang (el sha fijado de lawang.json, o AXW_LAWANG_RAIZ) que cada trozo está las veces dichas, que el
reemplazo cae en factura y en recibí (no en otro sitio), y evalúa en Node la expresión parcheada con 0, 1 y 2 sociedades. Sin navegador."""
import json
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import build  # noqa: E402

fallos, total = [], 0


def ok(nombre, cond, detalle=''):
    global total
    total += 1
    if not cond:
        fallos.append('%s%s' % (nombre, (' → ' + str(detalle)) if detalle else ''))


REL = 'intranet/v4/assets/editores.js'
t = open(os.path.join(build.LAWANG, *REL.split('/')), encoding='utf-8').read()
mios = [x for x in build.COMODIDAD_INSTANCIA if x[0] == REL and ('SOCIEDADES).length === 1' in x[2] or 'if (f0.fecha_vencimiento)' in x[2])]
ok('F4 y F8 están en COMODIDAD_INSTANCIA (y nada más)', len(mios) == 2 == len(build.COMODIDAD_INSTANCIA), len(mios))
ok('ninguno se quedó en TEXTOS_INSTANCIA', not [x for x in build.TEXTOS_INSTANCIA if 'SOCIEDADES).length' in x[2] or 'if (f0.fecha_vencimiento)' in x[2]])
ok('textos_instancia() procesa COMODIDAD_INSTANCIA', 'TEXTOS_INSTANCIA + COMODIDAD_INSTANCIA + ' in open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read())
for rel_, viejo, nuevo, veces in mios:
    ok('trozo de Lawang las veces dichas (%d)' % veces, t.count(viejo) == veces, t.count(viejo))
    t = t.replace(viejo, nuevo)

f4 = [x for x in mios if 'SOCIEDADES).length === 1' in x[2]][0]
ok('F4 cae en «Sociedad que factura» y en «Sociedad que cobra»',
   all(t.count("label: '%s', tipo: 'select', req: 1, valor: f0.sociedad || (Object.keys(SOCIEDADES).length === 1" % l) == 1
       for l in ('Sociedad que factura', 'Sociedad que cobra')))
f8 = "if (f0.fecha_vencimiento) campoSimpleDoc(filaF, { k: 'fecha_vencimiento'"
ok('F8 solo en el recibí: la factura sigue pidiendo vencimiento', t.count(f8) == 1 and t.count("campoSimpleDoc(filaF, { k: 'fecha_vencimiento', label: 'Vencimiento (opcional)', tipo: 'date', valor: f0.fecha_vencimiento || '' });") == 1)
i = t.find(f8)
ok('F8 está antes de «Sociedad que cobra» (bloque del recibí)', 0 < i < t.find("label: 'Sociedad que cobra'"))

# La expresión parcheada, evaluada en Node como la evalúa el navegador
expr = f4[2][len('valor: '):f4[2].index(', opciones:')]
CASOS = [('una sola empresa, documento nuevo', {'PT_BBM': {}}, {}, 'PT_BBM'),
         ('dos empresas (Lawang): sin preselección', {'A': {}, 'B': {}}, {}, ''),
         ('sin empresas: vacío', {}, {}, ''),
         ('documento ya guardado: manda el suyo', {'PT_BBM': {}}, {'sociedad': 'OTRA'}, 'OTRA')]
js = 'const r = [];\n'
for nombre, socs, f0, _ in CASOS:
    js += '{ const SOCIEDADES = %s, f0 = %s; r.push(%s); }\n' % (json.dumps(socs), json.dumps(f0), expr)
js += 'console.log(JSON.stringify(r));'
sal = subprocess.run(['node', '-e', js], capture_output=True, text=True, encoding='utf-8')
ok('node evalúa la expresión', sal.returncode == 0, sal.stderr[-300:])
if sal.returncode == 0:
    res = json.loads(sal.stdout)
    for (nombre, _, _, esperado), dio in zip(CASOS, res):
        ok('F4 · ' + nombre, dio == esperado, dio)

if fallos:
    print('MAL test_comodidad_instancia: %d/%d' % (total - len(fallos), total))
    for f in fallos:
        print('  FALLA: ' + f)
    sys.exit(1)
print('OK test_comodidad_instancia: %d/%d' % (total, total))
