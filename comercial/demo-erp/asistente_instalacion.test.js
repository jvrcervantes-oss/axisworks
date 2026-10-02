/* node asistente_instalacion.test.js — contrato del asistente «Nuevo ERP» de panel_control.html (2-oct-2026,
   encargos/20261002_erp_asistente_instalacion.md, subtarea 5).
   Ejecuta TAL CUAL el bloque AXW_ASIS de la pantalla (lo que hay entre los marcadores AXW_ASIS_INI y AXW_ASIS_FIN), sin navegador:
   el estado, el reductor, las vistas (texto HTML) y el almacén que habla con la edge por una `pide` que aquí es un doble.
   Cubre: avance y retroceso sin perder lo escrito · generalista bloqueado · impuestos sí/no y sus reglas cruzadas ·
   errores 400/409/413/502/403/red · doble envío y carrera (una respuesta vieja no pisa a la nueva) · escape de lo que llega
   del servidor · ninguna lista (módulos, zonas, países) escrita a mano en la página · botones por data-accion.
   Si se encuentra la agencia (AXW_AGENCIA_RAIZ, el clon principal o la copia de sesión hermana), además ejecuta la edge
   erp-control REAL y comprueba el recorrido completo: el catálogo que ella publica en `estado` mueve el asistente y lo que
   el asistente manda lo acepta su `alta` (y lo que ella rechaza, el asistente lo cuenta bien). Si no, lo dice: nada se salta en silencio. */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, 'panel_control.html'), 'utf8');
const ini = HTML.indexOf('/*AXW_ASIS_INI*/'), fin = HTML.indexOf('/*AXW_ASIS_FIN*/');
assert.ok(ini > 0 && fin > ini, 'no encuentro el bloque AXW_ASIS (marcadores AXW_ASIS_INI / AXW_ASIS_FIN)');
const ctx = { window: {} };
vm.runInNewContext(HTML.slice(ini, fin), ctx);
const A = ctx.window.AXW_ASIS;
assert.ok(A && typeof A.reduce === 'function', 'AXW_ASIS no se define');

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n += 1; };
const eq = (a, b, m) => { assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m); n += 1; };
const nombre = (k) => 'N·' + k;

// Catálogo EXÓTICO: nada de lo que hay en el repo. Si la pantalla llevara una lista escrita a mano, aquí no saldría.
const REGLAS = {
  obligatorios: ['iva_si'],
  cruzadas: [
    { si: 'iva_si', es: true, exige: ['iva_nombre', 'iva_pct', 'soc_pais'] },
    { si: 'iva_si', es: false, prohibe: ['iva_nombre', 'iva_pct'] },
  ],
};
const CAT = {
  tipos: [
    { tipo: 'alfa', nombre: 'Alfa <b>x</b>', descripcion: 'Desc "alfa"', modulos: ['m_a', 'm_b'], modulos_opcionales: ['m_c', 'm_d'], comprobado: true, motivo_bloqueo: null },
    { tipo: 'beta', nombre: 'Beta', descripcion: 'Desc beta', modulos: ['m_a'], modulos_opcionales: ['m_e'], comprobado: false, motivo_bloqueo: 'No cierra: <i>falta Z</i>' },
    { tipo: 'gamma', nombre: 'Gamma', descripcion: 'Desc gamma', modulos: ['m_g'], modulos_opcionales: ['m_c'], comprobado: true, motivo_bloqueo: null },
  ],
  ajustes: {
    zona: { tipo: 'enum', valores: ['Zz/Uno', 'Zz/Dos'] },
    soc_nombre: { tipo: 'texto', min: 2, max: 20, grupo: 'sociedad' },
    soc_pais: { tipo: 'enum', valores: ['PT', 'FR'], grupo: 'sociedad' },
    soc_serie: { tipo: 'regex', patron: '^[A-Z0-9]{3,5}$', grupo: 'sociedad' },
    iva_si: { tipo: 'booleano' },
    iva_nombre: { tipo: 'texto', min: 1, max: 10, patron: '^[A-Za-z]+$' },
    iva_pct: { tipo: 'decimal', patron: '^(0|[1-9][0-9]{0,2})(\\.[0-9]{1,2})?$', mayor_que: '0', hasta: '50' },
  },
  ajustes_reglas: REGLAS,
  tope_modulos: 4,
};
const YA = ['existente'];
const crea = () => A.nuevo(CAT, YA);
const paso = (e, t, extra) => A.reduce(e, Object.assign({ t }, extra || {}));
const campo = (e, c, v) => A.reduce(e, { t: 'campo', campo: c, valor: v });
const base = (e) => {
  e = campo(e, 'instancia', ' cliente-x '); e = campo(e, 'marca', 'Cliente X'); e = campo(e, 'dominio', 'ERP.Cliente.com ');
  return campo(e, 'correo_admin', ' Admin@Cliente.com ');
};
const tipoOk = (e) => paso(e, 'tipo', { tipo: 'alfa' });
const aj = (e, k, v) => campo(e, 'aj:' + k, v);

// ── 1. paso 1: tipo + datos ─────────────────────────────────────────────────────────────────────────
let e = crea();
eq(e.paso, 1, 'empieza en el paso 1');
let r = paso(e, 'avanza');
eq(r.paso, 1, 'sin datos no avanza');
for (const c of ['instancia', 'marca', 'dominio', 'correo_admin', 'tipo']) ok(r.errores[c], 'error de ' + c + ' sin datos');
e = paso(e, 'tipo', { tipo: 'beta' });
eq(e.v.tipo, '', 'el tipo bloqueado NO se puede elegir (el reductor lo ignora aunque llegue la acción)');
e = base(e);
r = paso(e, 'avanza');
eq(r.paso, 1, 'con el tipo sin elegir tampoco avanza');
eq(Object.keys(r.errores), ['tipo'], 'solo falla el tipo');
r = paso(campo(base(crea()), 'instancia', 'existente'), 'avanza');
ok(/Ya existe/.test(r.errores.instancia), 'un nombre interno que ya existe se avisa (las existentes llegan del estado)');
for (const mala of ['Ab', 'a', '1abc', 'ab_cd', 'ab--cd', 'x'.repeat(31)]) ok(A.valida(campo(base(crea()), 'instancia', mala), 1).instancia, 'nombre interno malo: ' + mala);
ok(A.valida(campo(base(crea()), 'dominio', 'sin punto'), 1).dominio, 'dominio malo');
ok(A.valida(campo(base(crea()), 'correo_admin', 'a b@c.com'), 1).correo_admin, 'correo malo');
e = tipoOk(base(crea()));
eq(Object.keys(A.valida(e, 1)).length, 0, 'datos buenos: sin errores');
e = paso(e, 'avanza');
eq(e.paso, 2, 'avanza al 2');

// ── 2. paso 2: módulos ────────────────────────────────────────────────────────────────────────────────
eq(A.modulosElegidos(e), ['m_a', 'm_b'], 'por defecto, solo los del tipo (los obligatorios)');
e = paso(e, 'opc', { modulo: 'm_c', on: true });
e = paso(e, 'opc', { modulo: 'm_zzz', on: true });
eq(A.modulosElegidos(e), ['m_a', 'm_b', 'm_c'], 'un opcional se marca; uno que el tipo no ofrece se ignora');
e = paso(e, 'opc', { modulo: 'm_a', on: false });
eq(A.modulosElegidos(e), ['m_a', 'm_b', 'm_c'], 'un obligatorio no se puede quitar');
e = paso(e, 'opc', { modulo: 'm_d', on: true });
eq(A.modulosElegidos(e).length, 4, 'cuatro en total (el tope)');
r = paso(e, 'avanza');
eq(r.paso, 3, 'en el tope todavía pasa');
ok(!A.valida(e, 2).modulos, 'en el tope no hay error');
const tope = JSON.parse(JSON.stringify(CAT)); tope.tope_modulos = 3;
ok(A.valida(Object.assign(A.reduce(A.nuevo(tope, []), { t: 'tipo', tipo: 'alfa' }), {}), 2).modulos === undefined, 'sin opcionales no pasa del tope');
const eT = paso(paso(paso(A.reduce(A.nuevo(tope, []), { t: 'tipo', tipo: 'alfa' }), 'opc', { modulo: 'm_c', on: true }), 'opc', { modulo: 'm_d', on: true }), 'x');
ok(A.valida(eT, 2).modulos, 'por encima del tope se avisa (ayuda: el servidor manda)');
// cambiar de tipo conserva solo los opcionales que el nuevo tipo ofrece
e = paso(e, 'tipo', { tipo: 'gamma' });
eq(Object.keys(e.v.opc), ['m_c'], 'al cambiar de tipo se conserva lo que el nuevo también ofrece (m_c) y se descarta lo demás');
e = paso(e, 'tipo', { tipo: 'alfa' });
eq(A.modulosElegidos(e), ['m_a', 'm_b', 'm_c'], 'y vuelve a ofrecer el perfil entero');

// ── 3. atrás y adelante sin perder lo escrito ──────────────────────────────────────────────────────────
let f = tipoOk(base(crea()));
f = paso(f, 'avanza');                       // → 2
f = paso(f, 'opc', { modulo: 'm_d', on: true });
f = paso(f, 'avanza');                       // → 3
f = aj(f, 'zona', 'Zz/Dos'); f = aj(f, 'iva_si', 'si'); f = aj(f, 'iva_nombre', 'IVA'); f = aj(f, 'iva_pct', '21');
f = paso(f, 'atras'); f = paso(f, 'atras');
eq(f.paso, 1, 'dos veces atrás: paso 1');
eq([f.v.instancia, f.v.marca, f.v.dominio, f.v.correo_admin, f.v.tipo], [' cliente-x ', 'Cliente X', 'ERP.Cliente.com ', ' Admin@Cliente.com ', 'alfa'], 'los datos del paso 1 siguen ahí');
eq(f.v.opc, { m_d: true }, 'el módulo opcional sigue marcado');
eq([f.v.aj.zona, f.v.aj.iva_si, f.v.aj.iva_nombre, f.v.aj.iva_pct], ['Zz/Dos', true, 'IVA', '21'], 'y los ajustes del paso 3 también');
f = paso(f, 'avanza'); f = paso(f, 'avanza');
eq(f.paso, 3, 'adelante otra vez');
r = paso(f, 'ir', { paso: 1 });
eq(r.paso, 1, 'ir a un paso anterior (clic en el indicador)');
eq(paso(f, 'ir', { paso: 4 }).paso, 3, 'ir NO sirve para saltar adelante: avanzar pasa por la validación');
eq(paso(crea(), 'atras').paso, 1, 'atrás en el 1 no hace nada');
eq(paso(f, 'ir', { paso: 'x' }).paso, 3, 'ir con basura no hace nada');

// ── 4. paso 3: ajustes, impuestos sí/no y reglas cruzadas ──────────────────────────────────────────────────
let g = paso(paso(tipoOk(base(crea())), 'avanza'), 'avanza');
eq(g.paso, 3, 'en el paso 3');
r = paso(g, 'avanza');
eq(r.paso, 3, 'sin responder si saca impuestos no avanza');
eq(Object.keys(r.errores), ['aj:iva_si'], 'solo obliga a elegir sí/no (zona y sociedad son opcionales con impuestos sin decidir)');
ok(!A.visible(g, 'iva_nombre') && !A.visible(g, 'iva_pct'), 'sin decidir, nombre y % del impuesto no se enseñan');
ok(A.visible(g, 'soc_nombre') && A.visible(g, 'zona'), 'la sociedad y la zona siempre se enseñan');
// sí
let s = aj(g, 'iva_si', 'si');
eq(s.v.aj.iva_si, true, 'sí → true');
ok(A.visible(s, 'iva_nombre') && A.visible(s, 'iva_pct'), 'con sí se enseñan nombre y %');
eq(Object.keys(paso(s, 'avanza').errores).sort(), ['aj:iva_nombre', 'aj:iva_pct', 'aj:soc_nombre', 'aj:soc_pais', 'aj:soc_serie'], 'con sí exige nombre, %, y la sociedad ENTERA (grupo)');
s = aj(aj(s, 'iva_nombre', 'IVA'), 'iva_pct', '21');
eq(Object.keys(paso(s, 'avanza').errores).sort(), ['aj:soc_nombre', 'aj:soc_pais', 'aj:soc_serie'], 'con nombre y % falta la sociedad');
s = aj(aj(aj(s, 'soc_nombre', 'Soc SL'), 'soc_pais', 'PT'), 'soc_serie', 'ABC');
eq(paso(s, 'avanza').paso, 4, 'completo: pasa al resumen');
for (const [pct, bien] of [['0', false], ['-1', false], ['50', true], ['50.01', false], ['51', false], ['5,5', true], ['5.555', false], ['abc', false], ['', false], ['1e1', false], ['0.01', true]]) {
  const q = aj(s, 'iva_pct', pct);
  eq(A.valida(q, 3)['aj:iva_pct'] === undefined, bien, 'pct «' + pct + '» ' + (bien ? 'vale' : 'no vale') + ' (mayor que 0 y hasta el tope del catálogo)');
}
ok(A.valida(aj(s, 'iva_nombre', 'IV4'), 3)['aj:iva_nombre'], 'el nombre respeta el patrón');
ok(A.valida(aj(s, 'iva_nombre', 'ABCDEFGHIJK'), 3)['aj:iva_nombre'], 'y el máximo del catálogo');
ok(A.valida(aj(s, 'iva_nombre', '<b>'), 3)['aj:iva_nombre'], 'y no admite <>');
ok(A.valida(aj(s, 'soc_serie', 'ab'), 3)['aj:soc_serie'], 'prefijo de serie: formato y longitud salen del patrón del catálogo');
ok(/de 3 a 5/.test(A.valida(aj(s, 'soc_serie', 'ab'), 3)['aj:soc_serie']), 'el error dice 3 a 5 (lo lee del patrón, no lo tiene escrito)');
ok(A.valida(aj(s, 'soc_pais', 'XX'), 3)['aj:soc_pais'], 'un país fuera de la lista del catálogo no vale');
ok(A.valida(aj(s, 'zona', 'Mars/Olympus'), 3)['aj:zona'], 'una zona fuera de la lista no vale');
// no
let no = aj(s, 'iva_si', 'no');
eq(no.v.aj.iva_si, false, 'no → false');
ok(!A.visible(no, 'iva_nombre') && !A.visible(no, 'iva_pct'), 'con no desaparecen nombre y %');
eq(paso(no, 'avanza').paso, 4, 'no + sociedad completa: pasa');
let cb = A.cuerpo(paso(no, 'avanza'));
ok(!('iva_nombre' in cb.ajustes) && !('iva_pct' in cb.ajustes), 'aunque estuvieran rellenos, con «no» el impuesto NO se manda (el servidor lo rechazaría)');
eq(cb.ajustes.iva_si, false, 'y manda iva_si=false (booleano, no texto)');
let sinSoc = aj(aj(aj(aj(g, 'iva_si', 'no'), 'soc_nombre', ''), 'soc_pais', ''), 'soc_serie', '');
eq(paso(sinSoc, 'avanza').paso, 4, 'con «no» la sociedad es opcional: ninguna también vale');
ok(!('soc_nombre' in A.cuerpo(paso(sinSoc, 'avanza')).ajustes), 'y entonces no se manda');
let parcial = aj(sinSoc, 'soc_nombre', 'Soc SL');
eq(Object.keys(paso(parcial, 'avanza').errores).sort(), ['aj:soc_pais', 'aj:soc_serie'], 'sociedad a medias: o los tres datos o ninguno');
// volver de «sí» a «no» y otra vez a «sí» conserva lo escrito
let vv = aj(aj(aj(s, 'iva_si', 'no'), 'iva_si', 'si'), 'iva_si', 'si');
eq([vv.v.aj.iva_nombre, vv.v.aj.iva_pct], ['IVA', '21'], 'al volver a «sí» el nombre y el % siguen');
// el aviso de exención solo sale con una sociedad ES sin impuestos (AXW-192) y no bloquea
const html3 = (x) => A.vista(x, nombre);
ok(!/AXW-192/.test(html3(no)), 'con PT sin impuestos no hay aviso de exención');

// ── 5. lo que se manda ────────────────────────────────────────────────────────────────────────────────
const fin4 = paso(s, 'avanza');
cb = A.cuerpo(fin4);
eq(cb, {
  accion: 'alta', instancia: 'cliente-x', marca: 'Cliente X', dominio: 'erp.cliente.com', correo_admin: 'admin@cliente.com', tipo: 'alfa',
  modulos: ['m_a', 'm_b'],
  ajustes: { soc_nombre: 'Soc SL', soc_pais: 'PT', soc_serie: 'ABC', iva_si: true, iva_nombre: 'IVA', iva_pct: '21' },
}, 'el cuerpo: recortado, en minúsculas, módulos = perfil + opcionales, ajustes de la lista');
const cbc = A.cuerpo(aj(aj(fin4, 'iva_pct', ' 5,5 '), 'zona', 'Zz/Uno'));
eq([cbc.ajustes.iva_pct, cbc.ajustes.zona], ['5.5', 'Zz/Uno'], 'la coma decimal se normaliza y la zona se manda tal cual');
const prohibidas = ['factura_exige_contrato', 'facturacion_series', 'modulos_activos', 'url_envio_correo'];
for (const k of prohibidas) ok(!(k in cb) && !(k in cb.ajustes), 'nunca se manda ' + k + ' (lo fija el servidor)');
eq(Object.keys(cb).sort(), ['accion', 'ajustes', 'correo_admin', 'dominio', 'instancia', 'marca', 'modulos', 'tipo'], 'claves del cuerpo, exactas');

// ── 6. el almacén: doble envío, carrera, errores ───────────────────────────────────────────────────────────
function diferida() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
const flush = () => new Promise((r) => setImmediate(r));
function almacen(estadoInicial) {
  const llamadas = [], cambios = [];
  const st = A.crea(CAT, YA, (c) => { const d = diferida(); llamadas.push({ c, d }); return d.p; }, (a, b) => cambios.push([a, b]));
  const pon = (x) => { st.despacha({ t: 'catalogo', cat: CAT, existentes: YA }); return x; };
  // lleva el almacén al paso 4 con datos buenos
  st.despacha({ t: 'tipo', tipo: 'alfa' });
  [['instancia', 'cliente-x'], ['marca', 'Cliente X'], ['dominio', 'erp.cliente.com'], ['correo_admin', 'a@cliente.com']].forEach(([c, v]) => st.despacha({ t: 'campo', campo: c, valor: v }));
  st.despacha({ t: 'avanza' }); st.despacha({ t: 'avanza' });
  st.despacha({ t: 'campo', campo: 'aj:iva_si', valor: 'no' });
  st.despacha({ t: 'avanza' });
  assert.strictEqual(st.estado().paso, 4);
  return { st, llamadas, cambios };
}
(async () => {
  // doble envío
  let { st, llamadas } = almacen();
  st.despacha({ t: 'envia' }); st.despacha({ t: 'envia' }); st.despacha({ t: 'envia' });
  eq(llamadas.length, 1, 'tres clics en «Pedir el alta» = UN solo POST');
  ok(st.estado().enviando, 'mientras vuela está enviando (la pantalla deshabilita el botón)');
  let v = A.vista(st.estado(), nombre);
  ok(/data-accion="envia"[^>]*disabled aria-busy="true"/.test(v) && /Enviando…/.test(v), 'la vista deshabilita el botón de enviar y lo dice');
  ok(/data-accion="atras"[^>]*disabled/.test(v), 'y el de Atrás');
  const antes = st.estado();
  st.despacha({ t: 'campo', campo: 'marca', valor: 'otra' }); st.despacha({ t: 'atras' }); st.despacha({ t: 'tipo', tipo: 'gamma' }); st.despacha({ t: 'reinicia' }); st.despacha({ t: 'ir', paso: 1 });
  ok(st.estado() === antes, 'durante el envío no se puede tocar NADA del estado');
  eq(llamadas[0].c.accion, 'alta', 'se llamó a la acción alta');
  eq(llamadas[0].c.tipo, 'alfa', 'con el cuerpo del asistente');
  llamadas[0].d.res({ __estado: 200, solicitud: 77 });
  await flush();
  eq(st.estado().hecho, { solicitud: 77 }, '200 → solicitud guardada con su número');
  ok(!st.estado().enviando, 'y deja de estar enviando');
  v = A.vista(st.estado(), nombre);
  ok(/Solicitud #77 guardada/.test(v) && /--desde-solicitud 77/.test(v) && /OK/.test(v) && /solicitud/.test(v), 'el mensaje final dice que es una SOLICITUD y que crear el proyecto pedirá el OK');
  ok(/10 \$\/mes/.test(v) && /NIF\/NPWP/.test(v) && /Ajustes → Sociedades/.test(v), '… con el coste, y el recordatorio del domicilio y el NIF/NPWP');
  st.despacha({ t: 'envia' });
  eq(llamadas.length, 1, 'ya guardada: otro «enviar» no manda nada');
  st.despacha({ t: 'reinicia' });
  eq([st.estado().paso, st.estado().hecho, st.estado().v.marca], [1, null, ''], 'Pedir otro ERP: estado limpio');

  // errores del servidor: cada uno se cuenta, se queda el borrador y se puede reintentar
  const casos = [
    ['400 modulos', { __estado: 400, error: 'campos', campos: ['modulos'], mensaje: 'Los módulos elegidos no son válidos o no cierran sus dependencias.' }, { paso: 2, msg: /dependencias/ }],
    ['400 perfil_bloqueado', { __estado: 400, error: 'perfil_bloqueado', campos: ['tipo'], mensaje: 'Este tipo de ERP aún no se puede pedir: motivo <b>x</b>' }, { paso: 1, msg: /aún no se puede pedir/ }],
    ['400 ajustes + detalle', { __estado: 400, error: 'campos', campos: ['ajustes'], detalle: ['iva_pct: decimal no válido'] }, { paso: 3, msg: /decimal no válido/ }],
    ['400 instancia', { __estado: 400, error: 'campos', campos: ['instancia'] }, { paso: 1, msg: /campos marcados/, campo: 'instancia' }],
    ['400 instancia_existe + dominio', { __estado: 400, error: 'campos', campos: ['instancia_existe', 'dominio'] }, { paso: 1, campo: 'dominio' }],
    ['400 derivada', { __estado: 400, error: 'campos', campos: ['derivada'], detalle: ['factura_exige_contrato: lo fija el servidor'] }, { paso: 4, msg: /fallo de la pantalla/ }],
    ['409 tope', { __estado: 409, error: 'tope', mensaje: 'Ya hay 5 altas pendientes: que el estudio las atienda antes.' }, { paso: 4, msg: /5 altas pendientes/ }],
    ['409 repetida', { __estado: 409, error: 'repetida', mensaje: 'Ya hay una solicitud pendiente con ese nombre.' }, { paso: 1, msg: /pendiente con ese nombre/, campo: 'instancia' }],
    ['413', { __estado: 413, error: 'demasiado_grande' }, { paso: 4, msg: /demasiado grande/ }],
    ['502', { __estado: 502, error: 'mando', mensaje: 'No se pudo guardar la solicitud. Prueba otra vez.' }, { paso: 4, msg: /ya hay una solicitud pendiente con ese nombre.{0,3}, es que la primera sí entró/ }],
    ['403 sesión', { __estado: 403, error: 'no_autorizado' }, { paso: 4, msg: /sesión ha caducado/ }],
    ['401', { __estado: 401 }, { paso: 4, msg: /sesión ha caducado/ }],
    ['500 raro', { __estado: 500 }, { paso: 4, msg: /Respuesta inesperada del mando \(500\)/ }],
    ['400 sin cuerpo', { __estado: 400 }, { paso: 4, msg: /no se ha podido aceptar/ }],
  ];
  for (const [nom, resp, esp] of casos) {
    ({ st, llamadas } = almacen());
    const marca0 = st.estado().v.marca;
    st.despacha({ t: 'envia' });
    llamadas[0].d.res(resp);
    await flush();
    const x = st.estado();
    ok(!x.enviando && !x.hecho, nom + ': no queda enviando ni «hecho»');
    ok(x.servidor && x.servidor.mensajes.length, nom + ': hay un aviso para el usuario');
    eq(x.paso, esp.paso, nom + ': lleva al paso ' + esp.paso);
    if (esp.msg) ok(esp.msg.test(x.servidor.mensajes.join(' | ')), nom + ': el aviso dice lo que toca: ' + x.servidor.mensajes.join(' | '));
    if (esp.campo) ok(x.errores[esp.campo], nom + ': marca el campo ' + esp.campo);
    eq(x.v.marca, marca0, nom + ': el borrador sigue ahí');
    const html = A.vista(x, nombre);
    ok(!/<b>x<\/b>/.test(html), nom + ': lo que manda el servidor sale ESCAPADO');
    ok(/role="alert"/.test(html), nom + ': el aviso es role=alert');
    // reintentar: vuelve a llevar al paso 4 y manda otro POST
    let y = x;
    for (let i = y.paso; i < 4; i++) st.despacha({ t: 'avanza' });
    if (st.estado().paso === 4) { st.despacha({ t: 'envia' }); eq(llamadas.length, 2, nom + ': se puede reintentar (segundo POST)'); }
    else ok(Object.keys(st.estado().errores).length, nom + ': al reintentar la validación señala lo que falta');
  }
  // red caída / fetch que rechaza / pide que lanza
  ({ st, llamadas } = almacen());
  st.despacha({ t: 'envia' }); llamadas[0].d.rej(new Error('red')); await flush();
  ok(/No se pudo contactar/.test(st.estado().servidor.mensajes[0]) && !st.estado().enviando, 'sin red: aviso y desbloqueado');
  const st2 = A.crea(CAT, YA, () => { throw new Error('boom'); });
  st2.despacha({ t: 'tipo', tipo: 'alfa' });
  [['instancia', 'cliente-x'], ['marca', 'Cliente X'], ['dominio', 'erp.cliente.com'], ['correo_admin', 'a@cliente.com']].forEach(([c, vv2]) => st2.despacha({ t: 'campo', campo: c, valor: vv2 }));
  st2.despacha({ t: 'avanza' }); st2.despacha({ t: 'avanza' }); st2.despacha({ t: 'campo', campo: 'aj:iva_si', valor: 'no' }); st2.despacha({ t: 'avanza' }); st2.despacha({ t: 'envia' });
  await flush();
  ok(/No se pudo contactar/.test(st2.estado().servidor.mensajes[0]) && !st2.estado().enviando, 'una pide que lanza no deja el botón colgado');

  // carrera: una respuesta vieja no pisa a la nueva
  ({ st, llamadas } = almacen());
  st.despacha({ t: 'envia' });                                // seq 1
  llamadas[0].d.res({ __estado: 502, error: 'mando' }); await flush();
  st.despacha({ t: 'envia' });                                // seq 2
  eq(llamadas.length, 2, 'segundo intento = segundo POST');
  const volando = st.estado();
  ok(volando.enviando && volando.seq === 2, 'el segundo intento está en vuelo');
  st.despacha({ t: 'respuesta', seq: 1, estado: 409, cuerpo: { error: 'repetida' } });   // la respuesta tardía del primero
  ok(st.estado() === volando, 'la respuesta del intento viejo NO toca el estado del nuevo');
  llamadas[1].d.res({ __estado: 200, solicitud: 5 }); await flush();
  eq(st.estado().hecho, { solicitud: 5 }, 'manda la del intento vigente');
  st.despacha({ t: 'respuesta', seq: 2, estado: 502, cuerpo: {} });
  eq(st.estado().hecho, { solicitud: 5 }, 'y una respuesta duplicada después de «hecho» no lo deshace');
  const e0 = A.nuevo(CAT, YA);
  ok(A.reduce(e0, { t: 'respuesta', seq: 1, estado: 200, cuerpo: { solicitud: 1 } }) === e0, 'una respuesta sin envío en vuelo se ignora');

  // reabrir: el catálogo se refresca y se conserva lo que sigue siendo válido
  ({ st } = almacen());
  const antes2 = st.estado().v.marca;
  const CAT2 = JSON.parse(JSON.stringify(CAT)); CAT2.tipos[0].modulos_opcionales = ['m_d'];
  st.despacha({ t: 'catalogo', cat: CAT2, existentes: ['otro'] });
  eq([st.estado().v.marca, st.estado().v.tipo, st.estado().paso, st.estado().existentes], [antes2, 'alfa', 4, ['otro']], 'al reabrir con catálogo nuevo se conserva el borrador');
  CAT2.tipos[0].comprobado = false;
  st.despacha({ t: 'catalogo', cat: CAT2, existentes: [] });
  eq([st.estado().v.tipo, st.estado().paso, st.estado().v.marca], ['', 1, antes2], 'si el tipo se bloquea en el servidor, se pierde el tipo y no los datos');
  st.despacha({ t: 'catalogo', cat: null, existentes: [] });
  ok(st.estado().sinCatalogo, 'sin catálogo (la edge no está actualizada) → estado «sin catálogo»');
  v = A.vista(st.estado(), nombre);
  ok(/no publica los tipos de ERP/.test(v) && /data-accion="cierra"/.test(v) && !/data-accion="avanza"/.test(v), 'y la pantalla lo cuenta y no deja avanzar');
  st.despacha({ t: 'avanza' }); st.despacha({ t: 'tipo', tipo: 'alfa' });
  ok(st.estado().sinCatalogo && st.estado().paso === 1, 'sin catálogo no se puede hacer nada');
  for (const malo of [{}, { tipos: [] }, { tipos: [{}], ajustes: {}, ajustes_reglas: {} }, 'x']) ok(A.nuevo(malo, []).sinCatalogo, 'catálogo inválido → sinCatalogo');

  // ── 7. vistas: se pinta lo que manda el catálogo, escapado, con data-accion ──────────────────────────────
  let w = crea();
  let h = A.vista(w, nombre);
  ok(/Alfa &lt;b&gt;x&lt;\/b&gt;/.test(h) && !/<b>x<\/b>/.test(h), 'el nombre del tipo sale escapado');
  ok(/Desc &quot;alfa&quot;/.test(h), 'y la descripción');
  ok(/No cierra: &lt;i&gt;falta Z&lt;\/i&gt;/.test(h), 'el motivo del bloqueo sale visible y escapado');
  ok(/Bloqueado/.test(h), 'el tipo bloqueado se marca');
  ok(/id="tipo-beta"[^>]*disabled/.test(h), 'y su radio está deshabilitado (no se puede elegir ni con teclado)');
  ok(/id="tipo-alfa"(?![^>]*disabled)/.test(h) && /id="tipo-gamma"(?![^>]*disabled)/.test(h), 'los comprobados sí se pueden elegir');
  ok(/aria-current="step"/.test(h) && /<label[^>]*for="f-instancia"/.test(h), 'paso actual marcado y etiquetas con for');
  w = campo(w, 'marca', '"><img src=x onerror=alert(1)>');
  h = A.vista(w, nombre);
  ok(!/<img/.test(h) && /&quot;&gt;&lt;img/.test(h), 'lo que escribe el usuario sale escapado en el value');
  w = tipoOk(base(crea()));
  const verPaso = (x, k) => { let y = x; for (let i = 1; i < k; i++) y = paso(y, 'avanza'); return y; };
  h = A.vista(verPaso(w, 2), nombre);
  ok(/N·m_a/.test(h) && /N·m_b/.test(h), 'paso 2: los módulos del tipo, con su rótulo');
  ok(/data-opc="m_c"/.test(h) && /data-opc="m_d"/.test(h) && !/data-opc="m_e"/.test(h) && !/data-opc="m_a"/.test(h), 'opcionales: los del tipo; los obligatorios no son casillas');
  ok(/no se calculan dependencias/.test(h), 'y avisa de que las dependencias las valida el servidor');
  h = A.vista(verPaso(w, 3), nombre);
  ok(/Zz\/Uno/.test(h) && /Zz\/Dos/.test(h), 'paso 3: las zonas son las del catálogo');
  ok(/<option value="PT">/.test(h) && /<option value="FR">/.test(h) && !/value="ES"|value="ID"/.test(h), 'y los países también (el nombre sale del código, no de una lista)');
  ok(/Portugal/.test(h) && /Francia/.test(h), 'los nombres de país salen del código (Intl)');
  ok(!/data-campo="aj:iva_nombre"/.test(h), 'sin decidir impuestos, nombre y % no se pintan');
  h = A.vista(aj(verPaso(w, 3), 'iva_si', 'si'), nombre);
  ok(/data-campo="aj:iva_nombre"/.test(h) && /data-campo="aj:iva_pct"/.test(h) && /inputmode="decimal"/.test(h), 'con «sí» se pintan nombre y % (teclado decimal en móvil)');
  ok(/Ajustes → Sociedades/.test(h) && /NIF\/NPWP/.test(h), 'el paso 3 recuerda que domicilio y NIF/NPWP se completan después');
  // resumen
  let rs = s;
  rs = paso(rs, 'avanza');
  h = A.vista(rs, nombre);
  ok(/Esto queda como solicitud, no crea nada todavía/.test(h) && /crear el proyecto \(unos 10 \$\/mes\) te pedirá el OK/.test(h), 'resumen: queda como solicitud y crear el proyecto pedirá el OK');
  ok(/NIF\/NPWP/.test(h) && /Ajustes → Sociedades/.test(h), 'resumen: recordatorio de domicilio y NIF/NPWP');
  ok(/data-accion="envia"/.test(h) && /Pedir el alta/.test(h), 'resumen: botón Pedir el alta');
  ok(/N·m_a, N·m_b/.test(h) && />IVA</.test(h) && />21</.test(h) && /Soc SL/.test(h) && /Portugal/.test(h) && />ABC</.test(h), 'resumen: módulos, impuesto, sociedad');
  ok(/Sin indicar/.test(h) && !/Ninguna/.test(h), 'resumen: la zona no dada sale «Sin indicar»');
  const rsNo = paso(sinSoc, 'avanza');
  ok(/Sin sociedad emisora no se puede facturar/.test(A.vista(rsNo, nombre)), 'sin sociedad el recordatorio es otro');
  // TODOS los botones llevan data-accion y nada se engancha por texto
  const todas = [crea(), verPaso(w, 2), verPaso(w, 3), rs, almacen().st.estado()].map((x) => A.vista(x, nombre)).join('\n');
  const botones = todas.match(/<button\b[^>]*>/g) || [];
  ok(botones.length >= 8, 'hay botones que comprobar');
  botones.forEach((b) => ok(/data-accion="/.test(b), 'botón sin data-accion: ' + b));
  ok(!/\bon(click|input|change|submit)\s*=/i.test(todas), 'sin manejadores en línea');
  const acciones = new Set((todas.match(/data-accion="([^"]+)"/g) || []).map((x) => x.slice(13, -1)));
  const manejadas = new Set(['avanza', 'atras', 'envia', 'ir', 'reinicia', 'cierra', 'abre-asistente']);
  acciones.forEach((a) => ok(manejadas.has(a), 'data-accion «' + a + '» sin manejador en el reductor/controlador'));
  // ── 8. la página: sin listas a mano, un solo clic delegado, nada en el navegador ────────────────────────────
  const pagina = HTML.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  ok(!/\b(Asia|Europe|America|Pacific|Australia|Africa|Atlantic)\/[A-Z]/.test(pagina), 'la página no lleva zonas horarias escritas');
  const sinCmp = pagina.replace(/sociedad_pais === 'ES'/g, '');   // única mención: la regla del aviso AXW-192 (se quita cuando Legal decida)
  ok(!/['"](Indonesia|España|Spain|Portugal|Francia|ES|ID|PT|FR)['"]/.test(sinCmp), 'sin países escritos en la página');
  const mods = (() => { try { return Object.keys(JSON.parse(fs.readFileSync(path.join(__dirname, 'modulos_rotulos.json'), 'utf8'))); } catch (x) { return []; } })();
  ok(mods.length > 10, 'modulos_rotulos.json se lee (para comprobar que ningún módulo está escrito en la página)');
  const escritos = mods.filter((k) => k !== 'base' && new RegExp("['\"]" + k + "['\"]").test(pagina));
  eq(escritos, [], 'ningún módulo escrito a mano en la página (salen de estado.perfiles; los rótulos los inyecta el build)');
  eq((pagina.match(/addEventListener\('click'/g) || []).length, 1, 'UN solo oyente de clic para toda la página');
  eq((pagina.match(/addEventListener\('input'/g) || []).length, 1, 'y UN solo oyente de entrada');
  ok(/data-accion="abre-asistente"[^>]*>/.test(HTML.match(/<button[^>]*id="nuevo-erp"[^>]*>/)[0]) && /data-accion="abre-asistente"/.test(HTML.match(/<button[^>]*id="nuevo-erp-m"[^>]*>/)[0]), 'los dos botones «Nuevo ERP» van por data-accion');
  ok(!/localStorage|sessionStorage|indexedDB|document\.cookie/.test(pagina), 'el borrador no se guarda en el navegador: solo en memoria');
  ok(!/\.from\(|\.rpc\(|createClient/.test(pagina), 'la pantalla no toca la base: pide a la edge (frontera front/back)');
  ok(/\{ accion: 'estado' \}/.test(pagina) && /pide\(/.test(pagina), 'habla con la edge por la misma pide que el resto del panel');
  ok(/id="asis"[^>]*aria-labelledby="asis-titulo"/.test(HTML) && /<dialog id="asis"/.test(HTML), 'diálogo con título asociado');
  ok(/<script>\s*\/\*AXW_ASIS_INI\*\//.test(HTML) && HTML.indexOf('/*AXW_ASIS_FIN*/') < HTML.indexOf('var ROTULO'), 'el bloque puro va antes del controlador');

  // ── 9. con la edge REAL: catálogo publicado → asistente → alta aceptada ───────────────────────────────────
  await conEdgeReal();
  console.log('OK asistente_instalacion.test.js — ' + n + ' comprobaciones');
})().catch((x) => { console.error(x); process.exit(1); });

async function conEdgeReal() {
  const cands = [process.env.AXW_AGENCIA_RAIZ, path.join(__dirname, '..', '..', '..', '..'), path.join(__dirname, '..', '..', '..', 'Agencia')].filter(Boolean);
  const raiz = cands.find((c) => fs.existsSync(path.join(c, 'erp', 'funciones', 'erp-control', 'index.ts')));
  if (!raiz) { console.log('AVISO: no encuentro la agencia (AXW_AGENCIA_RAIZ): NO se ha probado contra la edge real'); return; }
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 23) { console.log('AVISO: Node ' + process.versions.node + ' no carga .ts: NO se ha probado contra la edge real'); return; }
  const ORIGEN = 'https://erp.axisworks.studio', UID = '11111111-2222-3333-4444-555555555555';
  const ENV = { SUPABASE_URL: 'https://ref.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-falsa', ERP_CONTROL_ORIGEN: ORIGEN,
    ERP_CONTROL_INSTANCIAS: JSON.stringify([{ nombre: 'axisworks-demo', marca: 'Demo', dominio: 'demo.axisworks.studio', ref: '', editable: false, motivo: 'x' }]),
    TELEGRAM_BOT_TOKEN: 'tg-falso', TELEGRAM_CHAT_ID: '1' };
  const rpc = [];
  let manejador = null;
  globalThis.Deno = { env: { get: (k) => ENV[k] }, serve: (fn) => { manejador = fn; return {}; } };
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url), json = (o, status = 200) => new Response(JSON.stringify(o), { status });
    if (u.includes('/auth/v1/user')) return json({ id: UID, email: 'owner@ejemplo.com' });
    if (u.includes('/rest/v1/erp_control_operadores')) return json([{ user_id: UID }]);
    if (u.includes('/rest/v1/usuarios')) return json([{ rol: 'super_admin', activo: true }]);
    if (u.includes('/rest/v1/rpc/erp_alta_pide')) { rpc.push(JSON.parse(init.body)); return new Response('42', { status: 200 }); }
    if (u.startsWith('https://api.telegram.org/')) return json({ ok: true });
    throw new Error('fetch no previsto: ' + u);
  };
  await import(require('url').pathToFileURL(path.join(raiz, 'erp', 'funciones', 'erp-control', 'index.ts')).href);
  const llama = async (cuerpo) => {
    const orig = console.log; console.log = () => {};
    try {
      const r = await manejador(new Request('https://ref.supabase.co/functions/v1/erp-control', { method: 'POST',
        headers: { Origin: ORIGEN, Authorization: 'Bearer jwt', 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }));
      const j = await r.json().catch(() => ({})); j.__estado = r.status; return j;
    } finally { console.log = orig; }
  };
  const est = await llama({ accion: 'estado' });
  assert.strictEqual(est.__estado, 200); ok(est.perfiles && est.perfiles.tipos.length >= 2, 'la edge real publica los perfiles en estado');
  const cat = est.perfiles;
  ok(A.catalogoValido(cat), 'el catálogo real es válido para el asistente');
  // todo lo que la edge ofrece se pinta; ningún ajuste del servidor se queda sin control en pantalla
  const comprobados = cat.tipos.filter((t) => t.comprobado), bloqueados = cat.tipos.filter((t) => !t.comprobado);
  ok(comprobados.length >= 1, 'hay al menos un tipo que se puede pedir');
  const vista1 = A.vista(A.nuevo(cat, []), nombre);
  cat.tipos.forEach((t) => ok(vista1.includes('value="' + t.tipo + '"'), 'el tipo ' + t.tipo + ' sale en el paso 1'));
  bloqueados.forEach((t) => ok(new RegExp('id="tipo-' + t.tipo + '"[^>]*disabled').test(vista1) && vista1.includes('Bloqueado'), 'el tipo ' + t.tipo + ' sale bloqueado con su motivo'));
  // los módulos de cada tipo comprobado y sus opcionales
  for (const t of comprobados) {
    let x = A.reduce(A.nuevo(cat, []), { t: 'tipo', tipo: t.tipo });
    x = paso(base(x), 'avanza');
    eq(x.paso, 2, t.tipo + ': avanza al paso 2 con datos buenos');
    const v2 = A.vista(x, nombre);
    t.modulos.forEach((k) => ok(v2.includes('N·' + k), t.tipo + ': módulo del perfil ' + k + ' en pantalla'));
    t.modulos_opcionales.forEach((k) => ok(v2.includes('data-opc="' + k + '"'), t.tipo + ': opcional ' + k + ' como casilla'));
    // paso 3 con impuestos «sí»: hay un control por cada ajuste del servidor
    let y = paso(x, 'avanza'); y = aj(y, 'impuestos_aplica', 'si');
    const v3 = A.vista(y, nombre);
    Object.keys(cat.ajustes).forEach((k) => ok(v3.includes('data-campo="aj:' + k + '"'), t.tipo + ': el ajuste ' + k + ' tiene control en el paso 3'));
    cat.ajustes.zona_horaria.valores.forEach((z) => ok(v3.includes('value="' + z + '"'), 'zona ' + z + ' ofrecida'));
    cat.ajustes.sociedad_pais.valores.forEach((p) => ok(v3.includes('<option value="' + p + '"'), 'país ' + p + ' ofrecido'));
    // recorrido completo y alta REAL aceptada
    y = aj(aj(y, 'impuesto_nombre', 'IVA'), 'impuesto_pct', '21,00');
    y = aj(aj(aj(aj(y, 'sociedad_nombre', 'PT Ejemplo Mahkota'), 'sociedad_pais', cat.ajustes.sociedad_pais.valores[0]), 'sociedad_prefijo_serie', 'ej'), 'zona_horaria', cat.ajustes.zona_horaria.valores[0]);
    eq(A.valida(y, 3), { 'aj:sociedad_prefijo_serie': A.valida(y, 3)['aj:sociedad_prefijo_serie'] }, t.tipo + ': el prefijo en minúsculas lo para la ayuda del front (la regla del servidor pide mayúsculas)');
    y = aj(y, 'sociedad_prefijo_serie', 'EJ');
    ok(Object.keys(A.valida(y, 3)).length === 0, t.tipo + ': ajustes completos validan');
    y = paso(paso(y, 'avanza'), 'noop');
    eq(y.paso, 4, t.tipo + ': llega al resumen');
    const c = A.cuerpo(y);
    rpc.length = 0;
    const resp = await llama(c);
    eq(resp.__estado, 200, t.tipo + ': la edge REAL acepta lo que manda el asistente: ' + JSON.stringify(resp));
    eq(rpc.length, 1, t.tipo + ': y llega a la RPC una vez');
    eq([rpc[0].p.tipo, rpc[0].p.modulos.slice().sort()], [t.tipo, t.modulos.slice().sort()], t.tipo + ': a la RPC va el tipo y los módulos del perfil');
    eq(rpc[0].p.ajustes.impuesto_pct, '21.00', t.tipo + ': el % llega normalizado (punto)');
    // con opcionales
    if (t.modulos_opcionales.length) {
      const z = paso(paso(A.reduce(A.nuevo(cat, []), { t: 'tipo', tipo: t.tipo }), 'noop'), 'noop');
      let z2 = base(z);
      z2 = paso(z2, 'opc', { modulo: t.modulos_opcionales[0], on: true });
      z2 = paso(paso(z2, 'avanza'), 'avanza'); z2 = aj(z2, 'impuestos_aplica', 'no'); z2 = paso(z2, 'avanza');
      eq(z2.paso, 4, t.tipo + ': con un opcional y sin impuestos ni sociedad también llega al 4');
      rpc.length = 0;
      const r2 = await llama(A.cuerpo(z2));
      eq(r2.__estado, 200, t.tipo + ': con opcional y sin sociedad la edge la acepta: ' + JSON.stringify(r2));
      ok(rpc[0].p.modulos.includes(t.modulos_opcionales[0]), t.tipo + ': el opcional llega a la RPC');
      ok(!('impuesto_nombre' in rpc[0].p.ajustes), t.tipo + ': sin impuestos no llega nombre ni %');
    }
  }
  // aviso de exención (AXW-192): sociedad española sin impuestos. Usa las claves REALES del catálogo, que es donde vive la regla del instalador.
  if (cat.ajustes.sociedad_pais && cat.ajustes.sociedad_pais.valores.includes('ES') && comprobados.length) {
    let x = paso(base(A.reduce(A.nuevo(cat, []), { t: 'tipo', tipo: comprobados[0].tipo })), 'avanza');
    x = paso(x, 'avanza');
    x = aj(aj(aj(aj(x, 'impuestos_aplica', 'no'), 'sociedad_nombre', 'Soc SL'), 'sociedad_pais', 'ES'), 'sociedad_prefijo_serie', 'ABC');
    const va = A.vista(x, nombre);
    ok(/AXW-192/.test(va) && /se guarda igual/.test(va) && /España/.test(va), 'sociedad española sin impuestos: aviso (no bloquea) de que el instalador se detendrá, y el país sale como España');
    eq(A.valida(x, 3), {}, 'y el aviso no es un error: el paso 3 valida');
    ok(!/AXW-192/.test(A.vista(aj(x, 'sociedad_pais', cat.ajustes.sociedad_pais.valores.find((v) => v !== 'ES')), nombre)), 'con otro país no hay aviso');
    const rs = A.vista(paso(x, 'avanza'), nombre);
    ok(/>No</.test(rs) && /AXW-192/.test(rs), 'el resumen dice «No» a los impuestos y repite el aviso');
  }
  // lo que la edge rechaza, el asistente lo cuenta bien
  for (const t of bloqueados) {
    const resp = await llama(Object.assign(A.cuerpo(A.reduce(A.nuevo(cat, []), { t: 'tipo', tipo: 'inmobiliario' })), { tipo: t.tipo }));
    eq(resp.__estado, 400, t.tipo + ': un POST directo al tipo bloqueado da 400');
    eq(resp.error, 'perfil_bloqueado', t.tipo + ': perfil_bloqueado');
    const i = A.interpreta(resp.__estado, resp);
    ok(!i.ok && i.paso === 1 && /aún no se puede pedir/.test(i.mensajes.join(' ')), t.tipo + ': el asistente lo cuenta y vuelve al paso 1');
  }
  const mal = await llama({ accion: 'alta', instancia: 'cliente-x', marca: 'Cliente X', dominio: 'erp.cliente.com', correo_admin: 'a@cliente.com', tipo: comprobados[0].tipo,
    modulos: comprobados[0].modulos.concat(['zzz-no-existe']), ajustes: { impuestos_aplica: false } });
  eq(mal.__estado, 400, 'un módulo que el perfil no ofrece: 400 de la edge real');
  const im = A.interpreta(mal.__estado, mal);
  ok(!im.ok && im.paso === 2 && im.mensajes.some((m) => /módulos/.test(m)), 'el asistente lleva al paso 2 con un mensaje de módulos');
  console.log('   (edge real: ' + raiz + ')');
}
