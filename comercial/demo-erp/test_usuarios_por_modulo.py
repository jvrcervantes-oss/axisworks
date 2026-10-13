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
for rel_, viejo, nuevo in ALTA:
    ok('editores.js trae una vez el trozo «%s…»' % viejo.strip()[:50], ed.count(viejo) == 1, 'aparece %d veces' % ed.count(viejo))
    ed = ed.replace(viejo, nuevo)

# ── el manejador del botón, en Node ──────────────────────────────────────────────────────────────────────────────────────────────
NODE = r"""
const [viejo, nuevo] = JSON.parse(require('fs').readFileSync(0, 'utf8'));
function corre(cuerpo, caso) {
  const traza = [];
  const window = { AXW_NUCLEO_OPERACION: caso.nucleo };
  if (caso.modulos) {
    window.AXW_MODULOS_LISTOS = Promise.resolve(caso.supo);
    window.axwModuloActivo = (m) => (caso.supo ? caso.modulos.indexOf(m) !== -1 : true);   // como apagados_instancia.js: sin saber, true
  }
  const abreAlta = (t) => traza.push('abre:' + JSON.stringify(t));
  const tiposErp = () => { traza.push('lee_catalogo'); return Promise.resolve(caso.catalogo); };
  const aviso = (m) => traza.push('aviso');
  const opcionesTipos = (t) => t.map((x) => x.clave);
  const tiposCatAlta = ['lawang'];
  new Function('window', 'abreAlta', 'tiposErp', 'aviso', 'opcionesTipos', 'tiposCatAlta', cuerpo)(window, abreAlta, tiposErp, aviso, opcionesTipos, tiposCatAlta);
  return new Promise((r) => setTimeout(() => r(traza.join(' ')), 20));
}
const casos = {
  apagado: { nucleo: true, modulos: ['facturas', 'recibos'], supo: true, catalogo: null },
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
r = subprocess.run(['node', '-e', NODE], input=json.dumps([viejo, nuevo]), capture_output=True, text=True, encoding='utf-8')
ok('el manejador se evalúa en Node', r.returncode == 0, (r.stderr or '')[-300:])
if r.returncode == 0:
    t = json.loads(r.stdout)
    ok('contratos APAGADO: abre el alta sin leer el catálogo', t['apagado'] == 'abre:null', t['apagado'])
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

if fallos:
    print('MAL %d/%d' % (total - len(fallos), total))
    for f in fallos:
        print('  ✗ ' + f)
    sys.exit(1)
print('OK %d/%d test_usuarios_por_modulo' % (total, total))
