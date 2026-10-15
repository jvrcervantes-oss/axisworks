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
ok('F4 y F8 están en COMODIDAD_INSTANCIA', len(mios) == 2, len(mios))
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

# F10 y F12 (15-oct): cada trozo está en el fichero REAL de Lawang las veces dichas y el sustituto hace lo que dice
S5 = [x for x in build.COMODIDAD_INSTANCIA if 'CUENTAS_BANCARIAS).length === 1' in x[2] or "valor: 'si', label: '¿De quién es esta cuenta?'" in x[2]]
M6DOC = [x for x in build.COMODIDAD_INSTANCIA if 'minmax(min(100%,200px),1fr)' in x[2] or 'lw-tab-usuarios' in x[1] or "'correo', 'usuarios', 'mantenimiento'," in x[1]]
otros = [x for x in build.COMODIDAD_INSTANCIA if x not in mios and x not in S5 and x not in M6DOC]
ok('F10 y F12 en COMODIDAD_INSTANCIA (mascota.js, nav.js, facturas)', sorted(x[0] for x in otros) == sorted(['intranet/v4/assets/mascota.js', 'intranet/v4/assets/nav.js', 'intranet/v4/facturas/index.html']), [x[0] for x in otros])
for rel_, viejo, nuevo, veces in otros:
    tt = open(os.path.join(build.LAWANG, *rel_.split('/')), encoding='utf-8').read()
    ok('%s: trozo de Lawang las veces dichas (%d)' % (rel_, veces), tt.count(viejo) == veces, tt.count(viejo))
    if rel_.endswith('mascota.js'):
        ok('F10: el hueco solo en pantalla y la regla de impresión intacta', '@media screen{main{padding-bottom:' in nuevo and nuevo.endswith("'@media print{#lw-masc{display:none}}';"))
    if rel_.endswith('nav.js'):
        # el comportamiento, sobre el nav.js parcheado: la barra no se inserta con una pestaña, el `return` de antes sigue igual y el bloque de
        # «Mis comisiones» de /reparto/ (closer con UNA pestaña) sigue detrás de la inserción, sin ningún return por medio (revisor sobre e8e30cf)
        tt2 = tt.replace(viejo, nuevo)
        f = tt2[tt2.index('function cableaPestanas('):]
        f = f[:f.index('function podaMenu(')]
        ins, rep = f.index('if (mias.length < 2) {'), f.index("aquiG.pestana.path === 'reparto'")
        ok('F12: el return de una barra vacía sigue tal cual', '    if (!main || !mias.length) return;' in f and 'mias.length < 2) return' not in f)
        ok('F12: con una sola pestaña no se inserta la barra, y con 2+ sí (insertBefore detrás de la condición)', ins < f.index('insertBefore(barra'))
        ok('F12: el bloque de «Mis comisiones» del closer sigue corriendo (sin return entre la barra y él)', ins < rep and 'return' not in f[ins:rep], f[ins:rep][:200])
        chk = subprocess.run(['node', '--check', '-'], input=tt2, capture_output=True, text=True, encoding='utf-8')
        ok('F12: nav.js parcheado es JavaScript válido', chk.returncode == 0, chk.stderr[-300:])
    if rel_.endswith('facturas/index.html'):
        tt2 = tt.replace(viejo, nuevo)
        ok('F12: fuera el botón «Recibos» de la cabecera y «Nuevo documento» sigue', 'href="/intranet/v4/recibos/"' not in tt2.split('data-path="recibos"')[-1] and tt2.count('data-accion="nuevo-documento"') == tt.count('data-accion="nuevo-documento"'))

# Robot del Asistente solo con su módulo (owner 15-oct): el bloque REAL de nav.js, parcheado y sin parchear, corrido en Node con la base
# diciendo encendido / apagado / sin poder comprobar. La forma vieja tiene que fallar la regla (el robot sale con el módulo apagado).
REL_NAV = 'intranet/v4/assets/nav.js'
masc = [x for x in build.ACCESOS_POR_MODULO if x[0] == REL_NAV and "axwModuloActivo('asistente')" in x[2]]
ok('robot: en ACCESOS_POR_MODULO (todas las instancias, la aplica oculta_por_modulo)', len(masc) == 1, len(masc))
ok('robot: oculta_por_modulo() recorre ACCESOS_POR_MODULO', '+ PERMISOS_POR_MODULO + ACCESOS_POR_MODULO:' in open(os.path.join(AQUI, 'build.py'), encoding='utf-8').read())
if masc:
    nav = open(os.path.join(build.LAWANG, *REL_NAV.split('/')), encoding='utf-8').read()
    ok('robot: el trozo está una vez en el nav.js de Lawang', nav.count(masc[0][1]) == 1, nav.count(masc[0][1]))
    def bloque(t):
        i = t.index("if (aut && aut.ficha && puedeVer('asistente', aut.ficha) &&")
        return t[i:t.index('/* El pop-up de novedades', i)]
    viejo_b, nuevo_b = bloque(nav), bloque(nav.replace(masc[0][1], masc[0][2]))
    CASOS_M = [('módulo encendido', True, True, True), ('módulo apagado', False, True, True), ('sin poder comprobar los módulos', True, False, True),
               ('sin permiso asistente', True, True, False)]
    js = ('async function corre(b, activo, sabido, rol) { const puestos = [];'
          ' const window = { AXW_MODULOS_LISTOS: Promise.resolve(sabido), axwModuloActivo: function (m) { return m === "asistente" ? activo : true; } };'
          ' const document = { createElement: function () { return {}; }, head: { appendChild: function (x) { puestos.push(x); } } };'
          ' const location = { pathname: "/intranet/v4/flota/" }, aut = { ficha: { rol: "super_admin" } }, ROOT = "/intranet/v4/", MASCOTA_V = "1";'
          ' const puedeVer = function () { return rol; };'
          ' eval(b); await new Promise(function (r) { setTimeout(r, 0); }); return puestos.length; }\n'
          '(async function () { const B = %s, r = {}; for (const k of Object.keys(B)) { r[k] = []; for (const c of %s) r[k].push(await corre(B[k], c[1], c[2], c[3])); }'
          ' console.log(JSON.stringify(r)); })();' % (json.dumps({'viejo': viejo_b, 'nuevo': nuevo_b}), json.dumps(CASOS_M)))
    sal = subprocess.run(['node', '-e', js], capture_output=True, text=True, encoding='utf-8')
    ok('robot: node corre el bloque de nav.js', sal.returncode == 0, sal.stderr[-300:])
    if sal.returncode == 0:
        res = json.loads(sal.stdout)
        for (nombre, _, _, _), dio, esperado in zip(CASOS_M, res['nuevo'], (1, 0, 0, 0)):
            ok('robot · ' + nombre + (' → sale' if esperado else ' → no sale'), dio == esperado, dio)
        ok('robot: con la forma vieja la regla falla (sale con el módulo apagado)', res['viejo'][1] == 1, res['viejo'])

# S5 (bbm-comodidad, 15-oct-2026, encargo 20261015_erp_formularios_1a3_campos) ─────────────────────────────────────────────────────────────
# 1) factura y recibí NUEVOS con UNA sola cuenta de cobro: nace elegida; editado o copia, como estaba. 2) cuenta nueva «De la sociedad».
ok('S5: los tres parches de editores.js en COMODIDAD_INSTANCIA', len(S5) == 3, len(S5))
ted = open(os.path.join(build.LAWANG, *REL.split('/')), encoding='utf-8').read()
for rel_, viejo, nuevo, veces in S5:
    ok('S5 · %s: trozo de Lawang las veces dichas (%d)' % (viejo[:50], veces), rel_ == REL and ted.count(viejo) == veces, ted.count(viejo))
    ted = ted.replace(viejo, nuevo)
chk = subprocess.run(['node', '--check', '-'], input=ted, capture_output=True, text=True, encoding='utf-8')
ok('S5: editores.js parcheado es JavaScript válido', chk.returncode == 0, chk.stderr[-300:])
# la expresión de la cuenta, evaluada en Node con 0/1/2 cuentas, nuevo / editado / copia
def expr_cuenta(etq):
    x = [n for _, _, n, _ in S5 if "label: '%s'" % etq in n][0]
    return x[x.index('valor: ') + len('valor: '):x.index(', opciones:')]
CASOS_C = [('factura nueva, una cuenta', 'Cuenta donde se cobra', {'BCA': {}}, {}, None, None, 'BCA'),
           ('factura nueva, dos cuentas', 'Cuenta donde se cobra', {'A': {}, 'B': {}}, {}, None, None, ''),
           ('factura nueva, sin cuentas', 'Cuenta donde se cobra', {}, {}, None, None, ''),
           ('factura editada sin cuenta: no se le pone', 'Cuenta donde se cobra', {'BCA': {}}, {}, {'id': 1}, None, ''),
           ('copia de una factura sin cuenta: no se le pone', 'Cuenta donde se cobra', {'BCA': {}}, {}, None, {'id': 2}, ''),
           ('factura con su cuenta: manda la suya', 'Cuenta donde se cobra', {'BCA': {}}, {'cuenta': 'OTRA'}, None, None, 'OTRA'),
           ('recibí nuevo, una cuenta', 'Cuenta donde se cobró', {'BCA': {}}, {}, None, None, 'BCA'),
           ('recibí editado sin cuenta: no se le pone', 'Cuenta donde se cobró', {'BCA': {}}, {}, {'id': 3}, None, '')]
js = 'const r = [];\n'
for nombre, etq, cuentas, f0, existente, copia, _ in CASOS_C:
    js += '{ const CUENTAS_BANCARIAS = %s, f0 = %s, existente = %s, copia = %s; r.push(%s); }\n' % (
        json.dumps(cuentas), json.dumps(f0), json.dumps(existente), json.dumps(copia), expr_cuenta(etq))
js += 'console.log(JSON.stringify(r));'
sal = subprocess.run(['node', '-e', js], capture_output=True, text=True, encoding='utf-8')
ok('S5: node evalúa la expresión de la cuenta', sal.returncode == 0, sal.stderr[-300:])
if sal.returncode == 0:
    for (nombre, *_r, esperado), dio in zip(CASOS_C, json.loads(sal.stdout)):
        ok('S5 · cuenta · ' + nombre, dio == esperado, dio)
ok('S5 · cuenta nueva nace «De la sociedad» y la edición de una cuenta no cambia', "{ k: 'es_propia', tipo: 'select', valor: 'si', label: '¿De quién es esta cuenta?'," in ted
   and "{ k: 'es_propia', tipo: 'select', valor: c.es_propia === true ? 'si' : c.es_propia === false ? 'no' : ''" in ted)

# 3) Gasto con UNA sola sociedad: sin «Sociedad que paga» y el envío lleva la única; con dos, o un gasto de otra, como siempre.
REL_G = 'intranet/v4/assets/panel-gastos.js'
tg = open(os.path.join(build.LAWANG, *REL_G.split('/')), encoding='utf-8').read()
for rel_, viejo, nuevo, veces in build.GASTOS_INSTANCIA:
    if rel_ == REL_G:
        ok('gastos · trozo las veces dichas: %r' % viejo[:50], tg.count(viejo) == veces, tg.count(viejo))
        tg = tg.replace(viejo, nuevo)
ok('S5 · gasto: el parche de la sociedad única está en GASTOS_INSTANCIA', 'var socUnica = socs.length === 1' in tg and "!(socUnica && c.k === 'sociedad')" in tg)
a, b = tg.index('  function camposGasto(g) {'), tg.index('  function subeJustificante(')
codigo = tg[a:b]
arnes = r'''
const vm = require('vm');
const codigo = require('fs').readFileSync(0, 'utf8');
function corre(socs, g) {
  const ctx = { window: {}, T: function (s) { return s; }, hoy: '2026-10-15', D: { gastos: [], proveedores: [], categorias: [], proyectos: [] },
    catPorClave: {}, proyPorId: {}, PPH: [['', 'Sin retención']], MONEDAS: [['IDR', 'IDR']], sociedades: function () { return socs; },
    nombreSociedad: function (k) { return k; }, lwParseImporte: function (v) { return Number(v); } };
  vm.createContext(ctx);
  vm.runInContext(codigo + ';this.camposGasto = camposGasto; this.payloadDe = payloadDe;', ctx);
  const campos = ctx.camposGasto(g).map(function (c) { return c.k; });
  const env = ctx.payloadDe({ categoria: 'otros', concepto: 'x', fecha: '2026-10-15', base: '100', moneda: 'IDR' });
  return { pide: campos.indexOf('sociedad') !== -1, envia: env && env.p ? env.p.sociedad : (env && env.error ? 'ERROR' : null) };
}
console.log(JSON.stringify({ una: corre(['PT_BBM'], null), dos: corre(['A', 'B'], null), otra: corre(['PT_BBM'], { sociedad: 'VIEJA' }), suya: corre(['PT_BBM'], { sociedad: 'PT_BBM' }) }));
'''
sal = subprocess.run(['node', '-e', arnes], input=codigo, capture_output=True, text=True, encoding='utf-8')
ok('S5 · gasto: node corre camposGasto y payloadDe parcheados', sal.returncode == 0, sal.stderr[-400:])
if sal.returncode == 0:
    g = json.loads(sal.stdout)
    ok('S5 · gasto con una sola sociedad: no se pregunta y se envía la única', g['una'] == {'pide': False, 'envia': 'PT_BBM'}, g['una'])
    ok('S5 · gasto con dos sociedades: se pregunta, como siempre', g['dos']['pide'] is True, g['dos'])
    ok('S5 · gasto guardado de OTRA sociedad: se sigue preguntando (no se cambia su sociedad)', g['otra']['pide'] is True, g['otra'])
    ok('S5 · gasto guardado de la única: no se pregunta', g['suya']['pide'] is False, g['suya'])

# 4) «Ajustar hito» de Vencimientos, oculto sin el módulo contratos
hito = [x for x in build.OCULTA_POR_MODULO if x[0] == 'intranet/v4/vencimientos/index.html' and 'registrar-hito' in x[1]]
tv = open(os.path.join(build.LAWANG, 'intranet', 'v4', 'vencimientos', 'index.html'), encoding='utf-8').read()
ok('S5 · «Ajustar hito» en OCULTA_POR_MODULO por contratos, y el botón está una vez en Lawang', len(hito) == 1 and 'data-axw-sin="contratos"' in hito[0][2] and tv.count(hito[0][1]) == 1,
   hito and tv.count(hito[0][1]))

# 4h + M6 (bbm-comodidad, 15-oct-2026): filas de dos campos del editor que se apilan si no caben; sin la pestaña vacía «Usuarios y roles»
ok('4h/M6: cuatro tuplas (fila de dos, botón, panel y nombre en PESTANAS de Usuarios y roles)', len(M6DOC) == 4, len(M6DOC))
for rel_, viejo, nuevo, veces in M6DOC:
    t_ = open(os.path.join(build.LAWANG, *rel_.split('/')), encoding='utf-8').read()
    ok('4h/M6 · %s: el trozo de Lawang está las veces dichas (%d)' % (viejo[:60], veces), t_.count(viejo) == veces, t_.count(viejo))
tl_ = open(os.path.join(build.LAWANG, 'intranet', 'v4', 'assets', 'editores.js'), encoding='utf-8').read()
fila = [x for x in M6DOC if x[0].endswith('editores.js')][0]
ok('4h: filaDosDoc es la única que lleva la rejilla 1fr 1fr de las filas de dos', tl_.count(fila[1]) == 1 and 'function filaDosDoc(host)' in tl_[:tl_.index(fila[1])][-200:], '')
ah_ = open(os.path.join(build.LAWANG, 'intranet', 'v4', 'ajustes', 'index.html'), encoding='utf-8').read()
for rel_, viejo, nuevo, veces in M6DOC:
    if rel_.endswith('ajustes/index.html'): ah_ = ah_.replace(viejo, nuevo)
ok('M6: en la instancia no queda ni rastro de la pestaña ni del panel', 'usuarios' not in ah_.split('data-lw-tab=')[1:] and 'lw-panel-usuarios' not in ah_ and 'lw-tab-usuarios' not in ah_)
aj_ = open(os.path.join(build.LAWANG, 'intranet', 'v4', 'assets', 'ajustes.js'), encoding='utf-8').read()
for rel_, viejo, nuevo, veces in M6DOC:
    if rel_.endswith('ajustes.js'): aj_ = aj_.replace(viejo, nuevo)
pest_ = aj_[aj_.index('var PESTANAS = ['):].split(']')[0]
# revisor de b6bd9a8: desdeHash solo cae a «empresa» con un nombre FUERA de PESTANAS; con 'usuarios' dentro y sin botón, Ajustes salía en blanco
ok('M6: en la instancia «usuarios» ya no está en PESTANAS (un #usuarios viejo abre «empresa»)', "'usuarios'" not in pest_ and "'empresa'" in pest_
   and "return PESTANAS.indexOf(h) >= 0 ? h : 'empresa';" in aj_, pest_)

# M7 (bbm-comodidad, 15-oct-2026): Ajustes sin jerga. Cada trozo está en Lawang las veces dichas (el build pararía si no), ninguna frase nueva
# vuelve a decir «base de datos», «código», «servidor», «fase siguiente» ni «no esta pantalla», y todas tienen su inglés y su indonesio.
JERGA = ('base de datos', 'código', 'servidor', 'fase siguiente', 'no esta pantalla', 'funciones de la base', 'la instalación')
M7 = [x for x in build.TEXTOS_INSTANCIA + build.TEXTOS_ALQUILER
      if ('ajustes/index.html' in x[0] or x[0].endswith('ajustes.js')) and any(j in x[1] for j in JERGA)]
ok('M7: seis trozos de Ajustes (cabecera, candado, dos avisos de ajuste, pausa y cierre)', len(M7) == 6, len(M7))
for rel_, viejo, nuevo, veces in M7:
    t_ = open(os.path.join(build.LAWANG, *rel_.split('/')), encoding='utf-8').read()
    ok('M7 · %s: el trozo de Lawang está las veces dichas (%d)' % (viejo[:60], veces), t_.count(viejo) == veces, t_.count(viejo))
    ok('M7 · %s: sin jerga' % nuevo[:60], not any(j in nuevo for j in JERGA), nuevo)
import re as _re
for rel_, viejo, nuevo, veces in M7:
    m_ = _re.search(r"data-lwt>([^<]+)</p>|'([^']+)';$", nuevo)
    frase = m_ and (m_.group(1) or m_.group(2))
    if frase:
        ok('M7 · %s: tiene inglés e indonesio en MENU_I18N' % frase[:60], set(build.MENU_I18N.get(frase, {})) >= {'en', 'id'}, frase)
nodo = '. Cada ajuste tiene su formato y su rango: fuera de él no se guarda. Pausar los envíos y cerrar la intranet, en cambio, los puede hacer cualquier admin.'
ok('M7: el trozo de texto que queda tras el candado tiene inglés e indonesio', set(build.MENU_I18N.get(nodo, {})) >= {'en', 'id'})
sm_ = open(os.path.join(AQUI, 'setup_modulos.js'), encoding='utf-8').read()
ok('M7: setup_modulos ya no habla de «lo que fijó el estudio al publicarlo» (es, en, id)', 'fijó el estudio' not in sm_ and sm_.count('El ERP sigue en los idiomas con los que se instaló.') == 3)

if fallos:
    print('MAL test_comodidad_instancia: %d/%d' % (total - len(fallos), total))
    for f in fallos:
        print('  FALLA: ' + f)
    sys.exit(1)
print('OK test_comodidad_instancia: %d/%d' % (total, total))
