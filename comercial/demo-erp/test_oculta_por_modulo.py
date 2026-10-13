#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""python test_oculta_por_modulo.py — lo que build.py oculta POR MÓDULO en la copia de una instancia (OCULTA_POR_MODULO, bbm-p39, 13-oct-2026).

Aplica las marcas sobre el HTML REAL de Lawang (AXW_LAWANG_RAIZ o <agencia>/proyectos/Lawang) y comprueba:
  · cada trozo de Lawang está exactamente una vez (si Lawang lo cambia, esto y el build se ponen rojos a la vez);
  · en cada tabla, la cabecera marcada y la celda marcada de la fila PLANTILLA (la que clona plantillaFilas() de datos.js: la 2.ª del tbody)
    están en la MISMA posición y con el mismo marcador: si no, se ocultaría la cabecera de una columna y la celda de otra;
  · la regla CSS que genera oculta_por_modulo() pide TODOS los módulos del marcador (se oculta solo si están todos apagados);
  · la condición del editor de factura (EDITOR_SIN_CONTRATO) en 7 casos, evaluada en Node.
Sin navegador: lee el HTML con html.parser."""
import ast
import os
import re
import sys
from html.parser import HTMLParser

AQUI = os.path.dirname(os.path.abspath(__file__))
fallos, total = [], 0


def ok(nombre, cond, detalle=''):
    global total
    total += 1
    if not cond:
        fallos.append(nombre + (' — ' + detalle if detalle else ''))


def lawang():
    if os.environ.get('AXW_LAWANG_RAIZ'):
        return os.environ['AXW_LAWANG_RAIZ']
    if os.environ.get('AXW_AGENCIA_RAIZ'):
        return os.path.join(os.environ['AXW_AGENCIA_RAIZ'], 'proyectos', 'Lawang')
    return os.path.normpath(os.path.join(AQUI, '..', '..', '..', 'Lawang'))


def tupla_de_build(nombre):
    arbol = ast.parse(open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read())
    for n in arbol.body:
        if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == nombre for t in n.targets):
            return ast.literal_eval(n.value)
    sys.exit('build.py no trae ' + nombre)


class Tablas(HTMLParser):
    """Por cada <table>: el marcador de cada <th> del thead y de cada <td> de la fila PLANTILLA del tbody: la que clona plantillaFilas() de
    datos.js, `tb.rows[Math.min(1, tb.rows.length - 1)]` (la 2.ª, o la única si solo hay una: Usuarios, bbm-p40)."""
    def __init__(self):
        super().__init__()
        self.tablas, self.en_thead, self.en_tbody, self.fila_tbody, self.actual = [], False, False, 0, None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'table':
            self.actual = {'th': [], 'td': [], 'filas': []}
            self.tablas.append(self.actual)
        elif tag == 'thead':
            self.en_thead = True
        elif tag == 'tbody':
            self.en_tbody, self.fila_tbody = True, 0
        elif tag == 'tr' and self.en_tbody and self.actual is not None:
            self.fila_tbody += 1
            self.actual['filas'].append([])
        elif tag == 'th' and self.en_thead and self.actual is not None:
            self.actual['th'].append(a.get('data-axw-sin'))
        elif tag == 'td' and self.en_tbody and self.actual is not None and self.actual['filas']:
            self.actual['filas'][-1].append(a.get('data-axw-sin'))

    def handle_endtag(self, tag):
        if tag == 'thead':
            self.en_thead = False
        elif tag == 'tbody':
            self.en_tbody = False
            if self.actual is not None and self.actual['filas']:
                self.actual['td'] = self.actual['filas'][min(1, len(self.actual['filas']) - 1)]


OCULTA = tupla_de_build('OCULTA_POR_MODULO')
LAW = lawang()
if not os.path.isdir(LAW):
    if os.environ.get('AXW_SIN_AGENCIA') == '1':
        print('AVISO: sin Lawang (%s): test_oculta_por_modulo no mira nada' % LAW)
        sys.exit(0)
    sys.exit('falta Lawang en %s (AXW_LAWANG_RAIZ o AXW_AGENCIA_RAIZ)' % LAW)

por_fichero = {}
for rel_, viejo, nuevo in OCULTA:
    por_fichero.setdefault(rel_, []).append((viejo, nuevo))
    ok('%s: el marcado solo añade data-axw-sin' % rel_, re.sub(r' data-axw-sin="[a-z -]+"', '', nuevo) == viejo, nuevo[:90])

for rel_, cambios in sorted(por_fichero.items()):
    t = open(os.path.join(LAW, *rel_.split('/')), encoding='utf-8').read()
    for viejo, nuevo in cambios:
        ok('%s: trozo de Lawang exactamente una vez' % rel_, t.count(viejo) == 1, '%d veces: %r' % (t.count(viejo), viejo[:80]))
        t = t.replace(viejo, nuevo)
    p = Tablas()
    p.feed(t)
    marcadas = [x for x in p.tablas if any(x['th']) or any(x['td'])]
    ok('%s: hay una tabla con columna marcada' % rel_, len(marcadas) == 1, str(len(marcadas)))
    for x in marcadas:
        ok('%s: cabecera y celda plantilla marcadas en la MISMA columna' % rel_, x['th'] == x['td'] and len(x['th']) == len(x['td']),
           'th=%s td=%s' % (x['th'], x['td']))

# La regla CSS: la misma expresión que oculta_por_modulo() (se compara con lo que construye su cuerpo, leído de build.py)
cuerpo = open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read()
ok('oculta_por_modulo() existe y se llama en instancia()', 'def oculta_por_modulo():' in cuerpo and '\n    oculta_por_modulo()' in cuerpo)
ok('la regla exige TODOS los módulos del marcador',
   "''.join('.axw-sin-' + m for m in mods.split())" in cuerpo and '[data-axw-sin="%s"]{display:none!important}' in cuerpo)

# El editor de factura (EDITOR_SIN_CONTRATO, BAJA 1 del revisor): la condición parcheada, evaluada en Node con los casos que importan.
# Nace «sin contrato» SOLO con el módulo contratos apagado (base ya contestó) y la empresa sin exigir contrato; un documento ya guardado
# se reabre como estaba; con el módulo sin saber (axwModuloActivo da true, falla abierto) o sin la función (Lawang), como siempre.
import json
import subprocess
EDITOR = tupla_de_build('EDITOR_SIN_CONTRATO')
cond = EDITOR[0][2]
ok('EDITOR_SIN_CONTRATO[0] es la condición de sinContrato', cond.lstrip().startswith('sinContrato: '))
expr = cond.strip()[len('sinContrato: '):]
CASOS = [   # (nombre, regla.sinContrato, origen, pre.contrato_id, axwModuloActivo('contratos') o None si no existe, esperado)
    ('nuevo, contratos apagado, empresa sin exigir', True, None, None, False, True),
    ('nuevo, contratos apagado, empresa EXIGE contrato', False, None, None, False, False),
    ('nuevo, módulos sin saber (falla abierto)', True, None, None, True, False),
    ('nuevo, sin axwModuloActivo (Lawang)', True, None, None, None, False),
    ('nuevo desde un contrato (pre.contrato_id)', True, None, 'c1', False, False),
    ('reabre uno guardado CON contrato', True, {'contrato_id': 'c1'}, None, False, False),
    ('reabre uno guardado SIN contrato', True, {'contrato_id': None}, None, True, True),
]
js = 'var out = [];\n' + ''.join(
    '(function () { var regla = {sinContrato: %s}, origen = %s, pre = {contrato_id: %s}; var window = %s; out.push(!!(%s)); })();\n'
    % (json.dumps(r), json.dumps(o), json.dumps(p), '{}' if m is None else '{axwModuloActivo: function () { return %s; }}' % json.dumps(m), expr)
    for _, r, o, p, m, _e in CASOS) + 'console.log(JSON.stringify(out));'
r = subprocess.run(['node', '-e', js], capture_output=True, text=True, encoding='utf-8')
ok('la condición del editor se evalúa en Node', r.returncode == 0, (r.stderr or '')[-300:])
if r.returncode == 0:
    res = json.loads(r.stdout.strip().splitlines()[-1])
    for (nombre, *_x, esperado), dio in zip(CASOS, res):
        ok('editor: ' + nombre, dio is esperado, 'dio %s' % dio)

print(('OK' if not fallos else 'MAL') + ' test_oculta_por_modulo: %d/%d' % (total - len(fallos), total))
for f in fallos:
    print('  FALLA: ' + f)
sys.exit(1 if fallos else 0)
