#!/usr/bin/env python3
"""python test_restos_siembra.py [--sin-parche] — lo que el maestro siembra para el estudio no se le enseña al cliente como si fuera suyo.

Por qué (verificador de bbm en producción, 15-oct-2026; decisiones de agencia-c0):
  1. Los historiales enseñaban en en/id los motivos internos de las filas que firma el sistema o el estudio («Alta: seguimiento apagado, sin
     plantilla», «Decisión A del owner…», quien «migración …» o postgres). Regla (la de /entrega/, a981013): una fila que no firma una persona
     (correo, o id de usuario) sale como «Sistema · Configuración inicial» y su motivo no se pinta. Aquí: Seguimiento y la ficha del bot
     (whatsapp_bot.html) y Ajustes › Registro de cambios (ajustes.js de Lawang, parche de instancia en build.py).
  2. Ajustes › Impuestos pintaba los impuestos de España («art. 20.Uno LIVA») en una empresa indonesia: el maestro siembra los de los dos países
     en toda instancia. No se pintan los de un país sin ninguna sociedad de la instancia (país por sociedad = es_indonesia, como la base al facturar).

Cómo: ejecuta en Node los trozos de verdad (las funciones de whatsapp_bot.html; ajustes.js y datos.js de Lawang en el sha fijado con los parches de
GASTOS_INSTANCIA aplicados). Con --sin-parche (Lawang sin parchear) tiene que salir en rojo. Lawang no cambia.
"""
import ast
import json
import os
import re
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
SIN_PARCHE = '--sin-parche' in sys.argv
fallos, total = [], 0


def ok(nombre, cond, detalle=''):
    global total
    total += 1
    if not cond:
        fallos.append(nombre + (' — ' + detalle if detalle else ''))


def lawang():
    if os.environ.get('AXW_LAWANG_RAIZ'):
        return os.environ['AXW_LAWANG_RAIZ']
    sys.path.insert(0, AQUI)
    import lawang_fijado
    return lawang_fijado.raiz()


def tupla_de_build(nombre):
    arbol = ast.parse(open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read())
    for n in arbol.body:
        if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == nombre for t in n.targets):
            return ast.literal_eval(n.value)
    sys.exit('build.py no trae ' + nombre)


def node(js):
    p = subprocess.run(['node', '-e', js], capture_output=True, text=True, encoding='utf-8')
    return json.loads(p.stdout) if p.returncode == 0 and p.stdout.strip() else {'__error': (p.stderr or '')[-300:]}


PERSONAS = ['dion@balibestmotorcycle.com', '0b0f6a9e-1c2d-4e5f-8a9b-0c1d2e3f4a5b']
SISTEMA = ['migración 20261008138500', 'postgres', 'migracion', '', None]

# ── 1a. whatsapp_bot.html: la ficha del bot y Seguimiento ────────────────────────────────────────────────────────────────────────────────
wb = open(os.path.join(AQUI, 'whatsapp_bot.html'), encoding='utf-8').read()
m = re.search(r'\n  function deSistema\(q\) \{.*?\n  function quienMotivo\(it\) \{[^\n]*\n', wb, re.S)
ok('whatsapp_bot.html: deSistema, quienSe y quienMotivo', bool(m))
if m:
    r = node("var T = function (s) { return '[' + s + ']'; };" + m.group(0) + ";process.stdout.write(JSON.stringify({"
             "p: " + json.dumps(PERSONAS) + ".map(function (q) { return quienMotivo({ quien: q, motivo: 'Subo el tope' }); }),"
             "s: " + json.dumps(SISTEMA) + ".map(function (q) { return quienMotivo({ quien: q, motivo: 'Alta: seguimiento apagado, sin plantilla' }); }),"
             "v: [quienSe('dion@balibestmotorcycle.com'), quienSe('postgres')] }))")
    ok('ficha/Seguimiento: una persona sale con su correo y su motivo', r.get('p') == [q + ' · Subo el tope' for q in PERSONAS], repr(r))
    ok('ficha/Seguimiento: el sistema sale «Sistema · Configuración inicial», sin su motivo', r.get('s') == ['[Sistema] · [Configuración inicial]'] * len(SISTEMA), repr(r))
    ok('ficha/Seguimiento: «Guardada … · quién» con el mismo criterio', r.get('v') == ['dion@balibestmotorcycle.com', '[Sistema]'], repr(r))
for donde in ("$w('historial')", "$w('seg-historial')"):
    i = wb.find(donde)
    ok('whatsapp_bot.html: ' + donde + ' pinta con quienMotivo', i > 0 and 'quienMotivo(it)' in wb[i:i + 900])
ok('whatsapp_bot.html: ninguna versión pinta it.quien ni it.motivo a pelo', "(it.quien || '') + (it.motivo" not in wb.split('function quienMotivo')[0] + wb.split('function quienMotivo')[1].split('\n', 1)[1])

# ── 1b y 2. Lawang con los parches de instancia ─────────────────────────────────────────────────────────────────────────────────────────
L = lawang()
src = {}
for rel in ('intranet/v4/assets/ajustes.js', 'intranet/v4/assets/datos.js'):
    src[rel] = open(os.path.join(L, *rel.split('/')), encoding='utf-8').read()
if not SIN_PARCHE:
    for rel, viejo, nuevo, veces in tupla_de_build('TEXTOS_INSTANCIA') + tupla_de_build('COMODIDAD_INSTANCIA') + tupla_de_build('GASTOS_INSTANCIA'):
        if rel in src:
            src[rel] = src[rel].replace(viejo, nuevo)

aj = src['intranet/v4/assets/ajustes.js']
mf = re.search(r"\n    function axwDeSistema\(q\) \{[^\n]*\n", aj)
ok('Registro de cambios: axwDeSistema en ajustes.js', bool(mf))
if mf:
    r = node(mf.group(0) + ";process.stdout.write(JSON.stringify(" + json.dumps(PERSONAS + SISTEMA) + ".map(axwDeSistema)))")
    ok('Registro de cambios: persona = correo o id; sistema = migración, postgres, vacío o null', r == [False] * len(PERSONAS) + [True] * len(SISTEMA), repr(r))
ok('Registro de cambios: «Quién» y «Motivo» pasan por axwDeSistema', "esc(axwDeSistema(f.quien) ? T('Sistema') : f.quien)" in aj
   and "esc(axwDeSistema(f.quien) ? T('Configuración inicial') : (f.motivo || '—'))" in aj)

da = src['intranet/v4/assets/datos.js']
ok('Impuestos: se lee es_indonesia de las sociedades', "select('clave,razon,label,activa,es_indonesia')" in da)
a = da.find('        var filas = r[0], socs = r[1];')
b = da.find('        var socDe = {};', a)
ok('Impuestos: el trozo de pinta() se encuentra', a > 0 and b > a)
if a > 0 and b > a:
    trozo = da[a:b]
    IMP = [{'id': 1, 'pais': 'ES', 'nombre': 'Exenta de IVA', 'sociedad_clave': None}, {'id': 2, 'pais': 'ID', 'nombre': 'PPN 12 %', 'sociedad_clave': None},
           {'id': 3, 'pais': 'ID', 'nombre': 'PPh solo PT', 'sociedad_clave': 'pt'}, {'id': 4, 'pais': 'ES', 'nombre': 'IVA de la SL', 'sociedad_clave': 'sl'}]
    def corre(socs):
        js = ("function prueba(r) {" + trozo + " return filas.map(function (x) { return x.id; }); }"
              "process.stdout.write(JSON.stringify(prueba([" + json.dumps(IMP) + ", " + json.dumps(socs) + "])))")
        return node(js)
    ok('Impuestos: instancia solo indonesia (bbm) → sin los de España', corre([{'clave': 'pt', 'es_indonesia': True}]) == [2, 3])
    ok('Impuestos: con una sociedad española y otra indonesia (Lawang) → todos', corre([{'clave': 'pt', 'es_indonesia': True}, {'clave': 'sl', 'es_indonesia': False}]) == [1, 2, 3, 4])
    ok('Impuestos: uno atado a una sociedad que no existe no sale', corre([{'clave': 'otra', 'es_indonesia': True}]) == [2])
    ok('Impuestos: sin poder leer las sociedades → todos, como siempre', corre(None) == [1, 2, 3, 4])
    ok('Impuestos: sociedades sin país conocido → todos, como siempre', corre([{'clave': 'pt'}]) == [1, 2, 3, 4])

nombre = 'test_restos_siembra' + (' --sin-parche' if SIN_PARCHE else '')
print(('OK' if not fallos else 'MAL') + ' %s: %d/%d' % (nombre, total - len(fallos), total))
for f in fallos:
    print('  FALLA: ' + f)
sys.exit(1 if fallos else 0)
