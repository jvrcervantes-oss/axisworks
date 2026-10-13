#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""python test_usuarios_por_modulo.py — Usuarios de una instancia según sus módulos (bbm-p40, 13-oct-2026).

ALTA_SIN_CONTRATOS (build.py): en bbm (contratos apagado) el botón «Nuevo usuario» no abría el alta, porque antes leía el catálogo de tipos de
contrato, que es del módulo apagado. Aquí, sobre el editores.js REAL de Lawang (AXW_LAWANG_RAIZ o <agencia>/proyectos/Lawang):
  · cada trozo de Lawang está exactamente una vez (si Lawang lo cambia, esto y el build se ponen rojos a la vez);
  · el manejador del botón, ejecutado en Node con dobles de abreAlta/tiposErp/aviso, en 5 casos: contratos apagado → abre el alta sin catálogo;
    encendido → el camino de siempre; sin saber (la base no contestó) → el de siempre; Lawang (sin bandera) → el de siempre; y la CONTRAPRUEBA:
    el manejador viejo con contratos apagado no abre nunca el alta (rojo si alguien deshace el arreglo y este test no lo notara).
  · la lista de campos del alta: sin catálogo, el campo «Contratos que puede hacer» no se pinta (y no viaja); con catálogo, sí."""
import ast
import json
import os
import subprocess
import sys

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


ALTA = tupla_de_build('ALTA_SIN_CONTRATOS')
ed = open(os.path.join(lawang(), 'intranet', 'v4', 'assets', 'editores.js'), encoding='utf-8').read()
# 13-oct: el ancla es SOLO la rama del ERP; la de Lawang (justo antes) es de Lawang y cambia (d17d5df2a la hizo bloque). Lo que sí tiene que
# seguir siendo verdad: dentro del manejador del alta, Lawang sale con su propia rama ANTES de llegar al código del ERP.
# Se EJECUTA en Node el tramo real de Lawang (de su `if (!window.AXW_NUCLEO_OPERACION)` al ancla del ERP) delante del código del ERP (revisor:
# buscar «return» en el texto lo daba por bueno aunque faltara el de fuera).
_i_alta = ed.find("ata('invitar-miembro'")
_i_erp = ed.find(ALTA[0][1], _i_alta)
_i_if = ed.find('if (!window.AXW_NUCLEO_OPERACION)', _i_alta)
TRAMO_LAWANG = ed[_i_if:_i_erp] if 0 <= _i_alta < _i_if < _i_erp else ''
ok('el alta: la rama de Lawang está dentro del manejador y antes del ancla del ERP', bool(TRAMO_LAWANG), 'alta %d · if %d · erp %d' % (_i_alta, _i_if, _i_erp))
for rel_, viejo, nuevo in ALTA:
    ok('editores.js trae una vez el trozo «%s…»' % viejo.strip()[:50], ed.count(viejo) == 1, 'aparece %d veces' % ed.count(viejo))
    ed = ed.replace(viejo, nuevo)

# ── el manejador del botón, en Node ──────────────────────────────────────────────────────────────────────────────────────────────
NODE = r"""
const [viejo, nuevo, tramoLawang] = JSON.parse(require('fs').readFileSync(0, 'utf8'));
function corre(cuerpo, caso) {
  const traza = [];
  const window = { AXW_NUCLEO_OPERACION: caso.nucleo };
  // también en Lawang: si su rama no volviera, caería en el código del ERP y la traza lo diría (sin un TypeError mudo dentro de un .then)
  const modulos = caso.modulos || [], supo = caso.modulos ? caso.supo : false;
  window.AXW_MODULOS_LISTOS = Promise.resolve(supo);
  window.axwModuloActivo = (m) => (supo ? modulos.indexOf(m) !== -1 : true);   // como apagados_instancia.js: sin saber, true
  window.axwPermisoActivo = (k) => (supo ? k !== 'leads' && k !== 'contratos' : true);
  const sb = {};
  const abreAlta = (t) => traza.push('abre:' + JSON.stringify(t));
  const tiposErp = () => { traza.push('lee_catalogo'); return Promise.resolve(caso.catalogo); };
  const aviso = (m) => traza.push('aviso');
  const opcionesTipos = (t) => t.map((x) => x.clave);
  const tiposCatAlta = ['lawang'];
  // las listas del alta (A2): se rehacen ya sabiendo los módulos
  const listas = "var herrCrmAlta = [['leads', 'CRM']], herrRestoAlta = ['sin', 'rehacer'];"
    + "var permisosPorMenu = function (f) { return ['taller', 'contratos'].filter(f); }; var puedoDarAlta = function () { return true; };"
    + "var esCrmAlta = function (p) { return p[0] === 'leads'; };";
  // la rama de Lawang va FUERA del ancla (es de Lawang): se ejecuta la REAL, tal cual está en su editores.js
  new Function('window', 'abreAlta', 'tiposErp', 'aviso', 'opcionesTipos', 'tiposCatAlta', 'sb',
    listas + tramoLawang + cuerpo +';window.__listas = function () { return [herrCrmAlta.length, herrRestoAlta.join()]; };')(window, abreAlta, tiposErp, aviso, opcionesTipos, tiposCatAlta, sb);
  return new Promise((r) => setTimeout(() => r(traza.join(' ') + (caso.listas ? ' listas:' + JSON.stringify(window.__listas()) : '')), 20));
}
const casos = {
  apagado: { nucleo: true, modulos: ['facturas', 'recibos'], supo: true, catalogo: null },
  apagado_listas: { nucleo: true, modulos: ['facturas', 'recibos'], supo: true, catalogo: null, listas: true },
  encendido: { nucleo: true, modulos: ['contratos', 'facturas'], supo: true, catalogo: [{ clave: 'poa', activo: true }] },
  sin_saber: { nucleo: true, modulos: [], supo: false, catalogo: [{ clave: 'poa', activo: true }] },
  lawang: { nucleo: false },
};
(async () => {
  const out = {};
  for (const k of Object.keys(casos)) out[k] = await corre(nuevo, casos[k]);
  out.contraprueba = await corre(viejo, casos.apagado);
  console.log(JSON.stringify(out));
})();
"""
viejo, nuevo = ALTA[0][1], ALTA[0][2]
r = subprocess.run(['node', '-e', NODE], input=json.dumps([viejo, nuevo, TRAMO_LAWANG]), capture_output=True, text=True, encoding='utf-8')
ok('el manejador se evalúa en Node', r.returncode == 0, (r.stderr or '')[-300:])
if r.returncode == 0:
    t = json.loads(r.stdout)
    ok('contratos APAGADO: abre el alta sin leer el catálogo', t['apagado'] == 'abre:null', t['apagado'])
    ok('A2: el alta rehace sus listas sabiendo los módulos (sin CRM, sin contratos)', t['apagado_listas'] == 'abre:null listas:[0,"taller"]', t['apagado_listas'])
    ok('contratos encendido: lee el catálogo y abre con sus tipos', t['encendido'] == 'lee_catalogo abre:["poa"]', t['encendido'])
    ok('sin saber los módulos: el camino de siempre', t['sin_saber'] == 'lee_catalogo abre:["poa"]', t['sin_saber'])
    ok('Lawang (sin bandera): abre con su lista, sin esperar', t['lawang'] == 'abre:["lawang"]', t['lawang'])
    ok('CONTRAPRUEBA: el manejador viejo con contratos apagado NO abre el alta', t['contraprueba'] == 'lee_catalogo aviso', t['contraprueba'])

# ── los campos del alta: con tiposCatAlta null, «Contratos que puede hacer» fuera ──────────────────────────────────────────────────
i = ed.index("        modal('Nuevo usuario', [")
j = ed.index("].filter(Boolean), 'Crear usuario'", i)
lista = ed[ed.index('[', i):j + 1] + '.filter(Boolean)'
NODE2 = r"""
const lista = require('fs').readFileSync(0, 'utf8');
function campos(tiposCatAlta, apagados) {
  const window = { axwModuloActivo: (m) => apagados.indexOf(m) === -1 };
  const f = new Function('window', 'tiposCatAlta', 'soySuperAlta', 'rolesAlta', 'ROLES_ED', 'ETIQ_ROL', 'rolInicial', 'herrCrmAlta', 'herrRestoAlta',
    'LW_HERR_POR_ROL', 'LW_TIPOS_POR_ROL', 'puedoDarAlta', 'return ' + lista);
  return f(window, tiposCatAlta, false, ['agente'], ['agente'], {}, 'agente', [], [], {}, {}, () => true);
}
const sin = campos(null, ['contratos', 'proyectos']), con = campos([['poa', 'POA']], []);
console.log(JSON.stringify({
  sin_tipos: sin.some((c) => c && c.k === 'tipos_contrato'), sin_nulos: sin.some((c) => !c),
  con_tipos: con.some((c) => c && c.k === 'tipos_contrato'),
  nota_sin: (sin.filter((c) => c.tipo === 'nota')[0] || {}).label, nota_con: (con.filter((c) => c.tipo === 'nota')[0] || {}).label,
}));
"""
r2 = subprocess.run(['node', '-e', NODE2], input=lista, capture_output=True, text=True, encoding='utf-8')
ok('la lista de campos del alta se evalúa en Node', r2.returncode == 0, (r2.stderr or '')[-300:])
if r2.returncode == 0:
    c = json.loads(r2.stdout)
    ok('sin catálogo: no se pinta «Contratos que puede hacer»', c['sin_tipos'] is False)
    ok('sin catálogo: la lista no lleva huecos nulos (modal no los admite)', c['sin_nulos'] is False)
    ok('con catálogo: «Contratos que puede hacer» sigue', c['con_tipos'] is True)
    ok('sin proyectos: la nota no habla de proyectos', c['nota_sin'] == 'Se crea la cuenta y se le da acceso de inmediato.', c['nota_sin'])
    ok('con proyectos: la nota de siempre', 'Nace sin ningún proyecto asignado' in (c['nota_con'] or ''), c['nota_con'])

# ── A2 (PERMISOS_POR_MODULO): solo las herramientas de módulos encendidos ─────────────────────────────────────────────────────────
PERM = tupla_de_build('PERMISOS_POR_MODULO')
fuentes = {rel_: open(os.path.join(lawang(), *rel_.split('/')), encoding='utf-8').read() for rel_ in {r for r, _, _ in PERM}}
for rel_, viejo, nuevo in PERM:
    ok('%s trae una vez el trozo «%s…»' % (rel_.split('/')[-1], viejo.strip()[:50]), fuentes[rel_].count(viejo) == 1, 'aparece %d veces' % fuentes[rel_].count(viejo))
nav = open(os.path.join(lawang(), 'intranet', 'v4', 'assets', 'nav.js'), encoding='utf-8').read()
i, j = nav.index('  var PESTANAS_COMISIONES = ['), nav.index('  if (typeof window !== \'undefined\') window.LW_MENU_V4 = MENU_V4;')
menu = nav[i:j] + '\nreturn MENU_V4;'
helper = PERM[0][2][len(PERM[0][1]):]   # lo que se añade tras lwEtiquetaPermiso: la función axwPermisoActivo
guarda_nuevo = [n for _, v_, n in PERM if 'herramientas: v.herramientas,' in v_][0].split('herramientas: ', 1)[1].rstrip(',\n')
NODE3 = r"""
const [menu, helper, guardaNuevo] = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const MENU = new Function(menu)();
// pantalla → módulo de bbm (mapa de build.py, 13-oct) y sus activos
const P = { taller: 'reservas-producto', flota: 'reservas-producto', entrega: 'reservas-producto', 'reservas-producto': 'reservas-producto', ventas: 'facturas',
  facturas: 'facturas', recibos: 'recibos', productos: 'productos', gastos: 'gastos', contratos: 'contratos', emitir: 'contratos', compradores: 'compradores',
  proyectos: 'proyectos', cuentas: 'cuentas', vencimientos: 'vencimientos', operaciones: 'operaciones' };
const ACT = ['base', 'facturas', 'gastos', 'productos', 'recibos', 'reservas-producto'];
// el menú de la COPIA de bbm lleva además Reservas de producto, Taller, Entrega y Flota (los injerta el build en nav.js); sin
// ellas estas claves pasarían solo por «fuera del menú» (revisor A2, 13-oct)
const MENU_BBM = MENU.concat([{ entradas: ['reservas-producto', 'taller', 'entrega', 'flota'].map((k) => ({ path: k, texto: k, clave: k, nucleo: true })) }]);
function mundo(conRuta, menu, act) {
  const window = { LW_MENU_V4: menu || MENU };
  if (conRuta) window.axwRutaActiva = (p) => (p === 'leads' ? false : !P[p] || (act || ACT).indexOf(P[p]) !== -1);
  new Function('window', helper)(window);
  return window;
}
const w = mundo(true, MENU_BBM), law = mundo(false);
const sinRP = mundo(true, MENU_BBM, ACT.filter((m) => m !== 'reservas-producto'));
const rpApagado = ['taller', 'entrega', 'flota', 'reservas-producto'].map((k) => sinRP.axwPermisoActivo(k));
const claves = ['taller', 'flota', 'entrega', 'reservas-producto', 'facturas', 'recibos', 'productos', 'gastos', 'usuarios', 'ajustes',
  'contratos', 'compradores', 'unidades', 'leads', 'bot_conversaciones_ver', 'cuentas', 'vencimientos', 'no_esta_en_el_menu'];
const r = {}; claves.forEach((k) => { r[k] = w.axwPermisoActivo(k); });
const lawang = claves.every((k) => law.axwPermisoActivo(k) === true);
// el guardado: lo de módulos apagados viaja aunque no se enseñe; lo de encendidos, lo marcado; y en el ORDEN GUARDADO
// (usuarios_bloquea_cambio_rol_herramientas compara con `is distinct from`: otro orden = cambio = 42501 para un admin)
const guarda = (u, v) => new Function('window', 'u', 'v', 'return ' + guardaNuevo)(w, u, v);
const u = { herramientas: ['compradores', 'taller', 'flota', 'contratos'] }, v = { herramientas: ['taller', 'facturas'] };
const nuevo = guarda(u, v);
const viejo = v.herramientas;
// sin tocar nada: lo marcado es lo encendido de lo guardado, en el orden del menú (distinto del guardado)
const u2 = { herramientas: ['leads', 'facturas', 'contratos', 'taller', 'compradores'] };
const intacto = guarda(u2, { herramientas: ['taller', 'facturas'] });
console.log(JSON.stringify({ r, lawang, nuevo, viejo, intacto, rpApagado }));
"""
r3 = subprocess.run(['node', '-e', NODE3], input=json.dumps([menu, helper, guarda_nuevo]), capture_output=True, text=True, encoding='utf-8')
ok('axwPermisoActivo se evalúa en Node con el menú real de Lawang', r3.returncode == 0, (r3.stderr or '')[-400:])
if r3.returncode == 0:
    x = json.loads(r3.stdout)
    enc = ['taller', 'flota', 'entrega', 'reservas-producto', 'facturas', 'recibos', 'productos', 'gastos', 'usuarios', 'ajustes', 'no_esta_en_el_menu']
    apa = ['contratos', 'compradores', 'unidades', 'leads', 'bot_conversaciones_ver', 'cuentas', 'vencimientos']
    ok('módulos encendidos de bbm (y el núcleo): se ofrecen', all(x['r'][k] is True for k in enc), str({k: x['r'][k] for k in enc}))
    ok('módulos apagados de bbm (contratos, clientes, proyectos, CRM…): no se ofrecen', all(x['r'][k] is False for k in apa), str({k: x['r'][k] for k in apa}))
    ok('sin axwRutaActiva (Lawang): todas se ofrecen', x['lawang'] is True)
    ok('guardar conserva lo de módulos APAGADOS (compradores, contratos), quita lo encendido desmarcado (flota) y añade lo nuevo al final',
       x['nuevo'] == ['compradores', 'taller', 'contratos', 'facturas'], str(x['nuevo']))
    ok('guardar sin tocar nada manda la lista IDÉNTICA a la guardada (orden incluido, con lo apagado en medio)',
       x['intacto'] == ['leads', 'facturas', 'contratos', 'taller', 'compradores'], str(x['intacto']))
    ok('taller, entrega, flota y reservas-producto siguen al módulo reservas-producto (apagado → no se ofrecen)',
       x['rpApagado'] == [False, False, False, False], str(x['rpApagado']))
    ok('CONTRAPRUEBA: el guardado viejo perdía lo de módulos apagados', 'compradores' not in x['viejo'])

if fallos:
    print('MAL %d/%d' % (total - len(fallos), total))
    for f in fallos:
        print('  ✗ ' + f)
    sys.exit(1)
print('OK %d/%d test_usuarios_por_modulo' % (total, total))
