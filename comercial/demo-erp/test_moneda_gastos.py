#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""python test_moneda_gastos.py [--sin-parche] — Gastos de una instancia en la moneda de Ajustes (MONEDA_GASTOS_PARCHES de build.py,
calidad-gastos, 15-oct-2026).

Por qué: en bbm (0 gastos, moneda IDR en Ajustes) las cifras de Gastos decían «0 EUR»: panel-gastos.js de Lawang cae a ['EUR'] sin gastos
y el alta nacía en EUR. Lo vio Experiencia y Calidad lo midió en la base (solo lectura) y en el panel-gastos.js servido.

Aplica los parches sobre el panel-gastos.js REAL de Lawang (sha de lawang.json, o AXW_LAWANG_RAIZ) y ejecuta en Node, con finanzas.js real
del mismo sha, los trozos que cambian: pintaKpis (las cifras de arriba), camposGasto (el alta) y payloadDe (lo que se envía). Casos:
  · instancia IDR, sin gastos → cifras «0 IDR», nunca EUR; el alta nace en IDR y lo envía en IDR;
  · instancia sin moneda decidida (lwMonedaBase null) → cifras «—», el alta nace en «— elige —» y obligatoria, nada se envía en EUR; y al llegar
    la capa de módulos con IDR las cifras se repintan en IDR;
  · instancia AUD (fuera de la lista de Lawang) → el alta la ofrece y la elige;
  · con gastos en EUR e IDR → suma por moneda, igual que antes del parche (lo que no debía cambiar);
  · cada trozo de Lawang está exactamente una vez (si Lawang lo cambia, esto y el build se ponen rojos a la vez).
--sin-parche corre lo mismo sobre el fichero de Lawang tal cual: TIENE que salir rojo (prueba de que la prueba puede fallar)."""
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
    """Lawang en el sha fijado de lawang.json (E3.9, 13-oct-2026), o AXW_LAWANG_RAIZ para probar otro árbol: nunca el disco del clon."""
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


LAW = lawang()
PARCHES = tupla_de_build('MONEDA_GASTOS_PARCHES')
src = open(os.path.join(LAW, 'intranet', 'v4', 'assets', 'panel-gastos.js'), encoding='utf-8').read()
finanzas = open(os.path.join(LAW, 'contracts', 'assets', 'finanzas.js'), encoding='utf-8').read()

for rel_, viejo, nuevo in PARCHES:
    ok('el parche es de panel-gastos.js', rel_ == 'intranet/v4/assets/panel-gastos.js', rel_)
    ok('trozo de Lawang exactamente 1 vez: %r' % viejo[:60], src.count(viejo) == 1, str(src.count(viejo)))
    if not SIN_PARCHE:
        src = src.replace(viejo, nuevo)
ok('build.py llama a moneda_gastos() en la instancia', '\n    moneda_gastos()' in open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read())

# Los trozos que cambian, del fichero (parcheado o no). El de MONEDAS llega hasta pill(): con el parche incluye los axw*.
CODIGO = '\n'.join([
    trozo(src, '  var MONEDAS = ', '  function pill(', 'MONEDAS'),
    trozo(src, '  function paraCalculo(gs) {', '  /* ── FILTROS Y LISTA', 'paraCalculo'),
    trozo(src, '  function pintaKpis() {', '  function pintaLista() {', 'pintaKpis'),
    trozo(src, '  function camposGasto(g) {', '  function subeJustificante(', 'camposGasto/leeImporte/payloadDe'),
])

ARNES = r"""
const vm = require('vm');
const [finanzas, codigo] = JSON.parse(require('fs').readFileSync(0, 'utf8'));
function mundo(moneda, gastos, modulosListos) {
  const out = {};
  const ctx = {
    window: { lwMonedaBase: function () { return ctx.__moneda; }, AXW_NUCLEO_OPERACION: true, AXW_MODULOS_LISTOS: modulosListos },
    __moneda: moneda,
    T: function (s) { return s; }, hoy: '2026-10-15',
    D: { gastos: gastos, proveedores: [], categorias: [], proyectos: [] },
    catPorClave: {}, proyPorId: {}, PPH: [['', 'Sin retención']],
    pon: function (k, t) { out[k] = t; },
    fmt: function (n, m) { return n == null ? '—' : String(n) + ' ' + m; },
    sociedades: function () { return ['emisor']; }, nombreSociedad: function (k) { return k; },
    lwParseImporte: function (v) { return Number(String(v).replace(',', '.')); },
    out: out
  };
  vm.createContext(ctx);
  vm.runInContext(finanzas + '\n;' + codigo + '\n;this.pintaKpis = pintaKpis; this.camposGasto = camposGasto; this.payloadDe = payloadDe;', ctx);
  return ctx;
}
function campoMoneda(ctx) { return ctx.camposGasto({}).filter(function (c) { return c.k === 'moneda'; })[0]; }
function envio(ctx) { return ctx.payloadDe({ sociedad: 'emisor', categoria: 'otros', concepto: 'x', fecha: '2026-10-15', base: '100' }).p; }
(async function () {
  const r = {};
  // 1. IDR, sin gastos
  let c = mundo('IDR', [], Promise.resolve(true));
  c.pintaKpis();
  r.idr_kpis = Object.assign({}, c.out);
  r.idr_alta = campoMoneda(c).valor; r.idr_envio = envio(c).moneda;
  // 2. sin moneda decidida; la capa de módulos llega después con IDR
  let suelta; const llega = new Promise(function (res) { suelta = res; });
  c = mundo(null, [], llega);
  c.pintaKpis();
  r.null_kpis = Object.assign({}, c.out);
  const fn = campoMoneda(c);
  r.null_alta = fn.valor; r.null_req = !!fn.req; r.null_primera = fn.opciones[0][0]; r.null_envio = envio(c).moneda;
  c.__moneda = 'IDR'; suelta(true); await new Promise(function (res) { setTimeout(res, 20); });
  r.null_tras = Object.assign({}, c.out);
  // 3. AUD (no está en la lista de Lawang)
  c = mundo('AUD', [], Promise.resolve(true));
  const fa = campoMoneda(c);
  r.aud_alta = fa.valor; r.aud_opciones = fa.opciones.map(function (x) { return x[0]; });
  // 3b. editar un gasto en AUD: la ofrece siempre (con IDR en Ajustes y sin moneda decidida) — BAJA del revisor de f40a491
  c = mundo('IDR', [], Promise.resolve(true));
  let fe = c.camposGasto({ moneda: 'AUD' }).filter(function (x) { return x.k === 'moneda'; })[0];
  r.edita_idr = { valor: fe.valor, op: fe.opciones.map(function (x) { return x[0]; }) };
  c = mundo(null, [], Promise.resolve(true));
  fe = c.camposGasto({ moneda: 'AUD' }).filter(function (x) { return x.k === 'moneda'; })[0];
  r.edita_null = { valor: fe.valor, op: fe.opciones.map(function (x) { return x[0]; }) };
  // 4. con gastos en dos monedas: suma por moneda (no debe cambiar)
  c = mundo('IDR', [
    { estado: 'pendiente', moneda: 'EUR', total: 100, base: 100, pph_retenido: 0, fecha: '2026-10-01', sociedad: 'emisor' },
    { estado: 'pendiente', moneda: 'IDR', total: 500000, base: 500000, pph_retenido: 0, fecha: '2026-10-02', sociedad: 'emisor' }
  ], Promise.resolve(true));
  c.pintaKpis();
  r.dos_kpis = Object.assign({}, c.out);
  console.log(JSON.stringify(r));
})().catch(function (e) { console.error(e && e.stack || e); process.exit(1); });
"""

p = subprocess.run(['node', '-e', ARNES], input=json.dumps([finanzas, CODIGO]), capture_output=True, text=True, encoding='utf-8')
ok('el arnés corre en Node', p.returncode == 0, (p.stderr or '')[-400:])
if p.returncode == 0:
    r = json.loads(p.stdout.strip().splitlines()[-1])
    k = r['idr_kpis']
    ok('IDR sin gastos: «por pagar» en IDR', k.get('k-pendiente') == '0 IDR', repr(k.get('k-pendiente')))
    ok('IDR sin gastos: ninguna cifra en EUR', not any('EUR' in str(v) for v in k.values()), repr(k))
    ok('IDR: el alta nace en IDR', r['idr_alta'] == 'IDR', repr(r['idr_alta']))
    ok('IDR: el alta se envía en IDR', r['idr_envio'] == 'IDR', repr(r['idr_envio']))
    n = r['null_kpis']
    ok('sin moneda decidida: cifras «—», nunca «0 EUR»', n.get('k-pendiente') == '—' and not any('EUR' in str(v) for v in n.values()), repr(n))
    ok('sin moneda decidida: el alta nace sin moneda («— elige —»)', r['null_alta'] == '' and r['null_primera'] == '', repr((r['null_alta'], r['null_primera'])))
    ok('sin moneda decidida: la moneda del alta es obligatoria', r['null_req'] is True, repr(r['null_req']))
    ok('sin moneda decidida: no se envía EUR por defecto', r['null_envio'] is None, repr(r['null_envio']))
    ok('al llegar la capa de módulos con IDR: se repinta en IDR', r['null_tras'].get('k-pendiente') == '0 IDR', repr(r['null_tras'].get('k-pendiente')))
    ok('AUD: el alta la elige', r['aud_alta'] == 'AUD', repr(r['aud_alta']))
    ok('AUD: el alta la ofrece aunque no esté en la lista de Lawang', 'AUD' in r['aud_opciones'], repr(r['aud_opciones']))
    e1, e2 = r['edita_idr'], r['edita_null']
    ok('editar un gasto AUD con Ajustes IDR: lo ofrece y lo deja elegido (y también IDR)', e1['valor'] == 'AUD' and 'AUD' in e1['op'] and 'IDR' in e1['op'], repr(e1))
    ok('editar un gasto AUD sin moneda decidida: lo ofrece, elegido, sin «— elige —» delante', e2['valor'] == 'AUD' and 'AUD' in e2['op'] and e2['op'][0] != '', repr(e2))
    d = r['dos_kpis'].get('k-pendiente', '')
    ok('con gastos EUR+IDR: suma por moneda, como antes', 'EUR' in d and 'IDR' in d and '100 EUR' in d and '500000 IDR' in d, repr(d))

nombre = 'test_moneda_gastos' + (' --sin-parche' if SIN_PARCHE else '')
print(('OK' if not fallos else 'MAL') + ' %s: %d/%d' % (nombre, total - len(fallos), total))
for f in fallos:
    print('  FALLA: ' + f)
sys.exit(1 if fallos else 0)
