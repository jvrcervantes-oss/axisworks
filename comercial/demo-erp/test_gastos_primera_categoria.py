#!/usr/bin/env python3
"""python test_gastos_primera_categoria.py [--sin-parche] — Gastos de una instancia: la primera categoría se crea desde «Nuevo gasto».

Por qué (agencia-c0, 15-oct-2026, visto en bbm vivo): sin ninguna categoría, el alta de un gasto enseñaba «Categoría: — elige —» sin nada
que elegir y el aviso mandaba a «pedirlo a administración». Ahora (GASTOS_INSTANCIA de build.py) «Nuevo gasto» sin categorías activas abre
antes una ventana de un solo campo (el nombre), crea la categoría con gasto_categoria_guarda (la misma función que el paso del asistente),
relee y abre el gasto con ella ya elegida, sin recargar la página.

Cómo: aplica los parches de build.py (GASTOS_INSTANCIA y MONEDA_GASTOS_PARCHES) a panel-gastos.js de Lawang en el sha fijado y ejecuta en
Node los trozos de verdad (camposGasto, axwPrimeraCategoria, nuevoGasto) con la ventana, la base y la relectura simuladas. Con --sin-parche
tiene que salir en rojo. Lawang no cambia.
"""
import ast
import json
import os
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


def trozo(src, ini, fin, que):
    a = src.find(ini)
    b = src.find(fin, a + 1)
    if a < 0 or b < 0:
        sys.exit('no encuentro %s en panel-gastos.js (¿cambió Lawang?)' % que)
    return src[a:b]


REL = 'intranet/v4/assets/panel-gastos.js'
src = open(os.path.join(lawang(), *REL.split('/')), encoding='utf-8').read()
if not SIN_PARCHE:
    for rel_, viejo, nuevo, veces in tupla_de_build('GASTOS_INSTANCIA'):
        if rel_ == REL:
            ok('trozo de Lawang %d vez/veces: %r' % (veces, viejo[:50]), src.count(viejo) == veces, str(src.count(viejo)))
            src = src.replace(viejo, nuevo)
    for rel_, viejo, nuevo in tupla_de_build('MONEDA_GASTOS_PARCHES'):
        src = src.replace(viejo, nuevo)

ok('el aviso ya no manda a «pedirlo a administración»', 'Pídelo a administración' not in src)
ok('el aviso dice dónde se crea la primera', 'la primera se crea al pulsar «Nuevo gasto»' in src)

CODIGO = '\n'.join([
    trozo(src, '  var MONEDAS = ', '  function pill(', 'MONEDAS'),
    trozo(src, '  function camposGasto(g) {', '  function subeJustificante(', 'camposGasto'),
    trozo(src, '  function axwPrimeraCategoria() {' if not SIN_PARCHE else '  function nuevoGasto() {', '  function editaGasto(', 'nuevoGasto'),
])

ARNES = r"""
const vm = require('vm');
const codigo = JSON.parse(require('fs').readFileSync(0, 'utf8'));
function mundo(cats, rpcError) {
  const ventanas = [], rpcs = [];
  const ctx = {
    window: { lwMonedaBase: function () { return 'IDR'; }, lwVentana: function (t, c, b, f, o) { ventanas.push({ t: t, c: c, b: b, f: f, o: o || {} }); } },
    T: function (s) { return s; }, hoy: '2026-10-15', PPH: [['', '—']],
    D: { gastos: [], proveedores: [], categorias: cats.slice(), proyectos: [], cuentas: [] },
    sociedades: function () { return ['emisor']; }, nombreSociedad: function (k) { return k; },
    campoCuenta: function () { return { k: 'cuenta_pago' }; },
    rpcOk: function (r, m) { return { error: { message: m } }; },
    pintaTodo: function () { ctx.__pintado = (ctx.__pintado || 0) + 1; },
    cargar: function () { ctx.D.categorias.push({ clave: 'gasolina', nombre: 'Gasolina', activa: true }); return Promise.resolve(); },
    sb: { rpc: function (n, a) { rpcs.push([n, a]); return Promise.resolve(rpcError ? { data: null, error: { message: 'no' } } : { data: 'gasolina', error: null }); } },
    payloadDe: function () { return { p: {} }; }, subeJustificante: function () { return Promise.resolve({}); },
    sessionStorage: { setItem: function () {} }
  };
  vm.createContext(ctx);
  vm.runInContext(codigo + '\n;this.nuevoGasto = nuevoGasto;', ctx);
  return { ctx: ctx, ventanas: ventanas, rpcs: rpcs };
}
const campo = function (v, k) { return v.c.filter(function (c) { return c.k === k; })[0]; };
(async function () {
  const r = {};
  // 1. sin categorías: la ventana de la primera, de un solo campo, sin recargar
  let m = mundo([]);
  m.ctx.nuevoGasto();
  const v = m.ventanas[0];
  r.titulo = v.t; r.boton = v.b; r.campos = v.c.filter(function (c) { return c.k; }).map(function (c) { return c.k; }); r.sinRecarga = !!v.o.sinRecarga;
  r.vacio = await v.f({ nombre: '  ' }); r.mal = await v.f({ nombre: '=SUMA(A1)' }); r.rpcs_validando = m.rpcs.length;
  r.fin = await v.f({ nombre: ' Gasolina ' });
  r.rpc = m.rpcs[0]; r.ventanas = m.ventanas.map(function (x) { return x.t; });
  const g = m.ventanas[1]; r.cat_elegida = g ? campo(g, 'categoria').valor : null; r.pintado = m.ctx.__pintado || 0;
  // 2. la base dice que no: se dice y no se abre el gasto
  m = mundo([], true); m.ctx.nuevoGasto();
  r.error = await m.ventanas[0].f({ nombre: 'Gasolina' }); r.error_ventanas = m.ventanas.length;
  // 3. con categorías: «Nuevo gasto» va directo, como siempre
  m = mundo([{ clave: 'otros', nombre: 'Otros', activa: true }]); m.ctx.nuevoGasto();
  r.directo = m.ventanas.map(function (x) { return x.t; });
  // 4. solo una categoría desactivada: cuenta como ninguna
  m = mundo([{ clave: 'vieja', nombre: 'Vieja', activa: false }]); m.ctx.nuevoGasto();
  r.inactiva = m.ventanas.map(function (x) { return x.t; });
  console.log(JSON.stringify(r));
})().catch(function (e) { console.error(e && e.stack || e); process.exit(1); });
"""

p = subprocess.run(['node', '-e', ARNES], input=json.dumps(CODIGO), capture_output=True, text=True, encoding='utf-8')
ok('el arnés corre en Node', p.returncode == 0, (p.stderr or '')[-400:])
if p.returncode == 0:
    r = json.loads(p.stdout.strip().splitlines()[-1])
    ok('sin categorías: «Nuevo gasto» abre antes «Primero, una categoría»', r['titulo'] == 'Primero, una categoría', repr(r['titulo']))
    ok('un solo campo a rellenar (el nombre)', r['campos'] == ['nombre'], repr(r['campos']))
    ok('no recarga la página al crearla', r['sinRecarga'] is True)
    ok('nombre vacío o que empieza por = : lo dice y no llama a la base', bool(r['vacio'] and r['vacio'].get('error')) and bool(r['mal'] and r['mal'].get('error')) and r['rpcs_validando'] == 0, repr((r['vacio'], r['mal'])))
    ok('crea con gasto_categoria_guarda(null, {nombre, grupo general}), el nombre sin espacios',
       r.get('rpc') == ['gasto_categoria_guarda', {'p_clave': None, 'p_datos': {'nombre': 'Gasolina', 'grupo': 'general'}}], repr(r.get('rpc')))
    ok('creada: relee, repinta y abre «Nuevo gasto» con ella ya elegida', r['ventanas'] == ['Primero, una categoría', 'Nuevo gasto'] and r['cat_elegida'] == 'gasolina' and r['pintado'] >= 1 and r['fin'] is None, repr(r))
    ok('si la base dice que no: lo dice y no abre el gasto', bool(r['error'] and r['error'].get('error')) and r['error_ventanas'] == 1, repr(r['error']))
    ok('con categorías: «Nuevo gasto» va directo, como siempre', r['directo'] == ['Nuevo gasto'], repr(r['directo']))
    ok('una categoría desactivada cuenta como ninguna', r['inactiva'] == ['Primero, una categoría'], repr(r['inactiva']))

nombre = 'test_gastos_primera_categoria' + (' --sin-parche' if SIN_PARCHE else '')
print(('OK' if not fallos else 'MAL') + ' %s: %d/%d' % (nombre, total - len(fallos), total))
for f in fallos:
    print('  FALLA: ' + f)
sys.exit(1 if fallos else 0)
