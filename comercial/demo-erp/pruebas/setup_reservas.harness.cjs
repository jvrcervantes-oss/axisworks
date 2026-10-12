// node comercial/demo-erp/pruebas/setup_reservas.harness.cjs [carpeta_capturas]
// Arnés de los pasos de Reservas de producto (S40 clase, S41 alquiler con unidades, S43 reglas, S44 lo ya alquilado, S45 entrega; F3 Entregas 3 y 4,
// bbm-p27-flota-front, 12-oct-2026). asistente_setup.html + ajustes_puesta.js + setup_modulos.js + setup_pasos.js + setup_reservas.js REALES en Chromium,
// con la base SIMULADA a partir del contrato de Backend (erp/plan_f3e3_doble_flota_entrega.json, c8d7a8f6, y sus respuestas del 12-oct) y CON ESTADO:
// lo que se guarda cambia lo que devuelven modulos_setup_estado, reservas_setup_datos, producto_flota_datos y entrega_datos. Mide, por paso: vacío,
// a medias, hecho y error con su motivo; qué se manda y en qué orden; que un fallo a medias no duplica nada al repetir; la duda de una respuesta
// perdida (se relee, nunca se reenvía sola); el mismo componente en Ajustes; quien no configura; 390/1440 sin scroll horizontal; es/en/id sin español;
// y que ningún código de la base se queda sin frase. La base real NO se toca: esto prueba la pantalla contra el contrato, no contra Postgres.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const EXE = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const AQUI = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(AQUI, 'asistente_setup.html'), 'utf8').split('<!--AXW_SCRIPT-->');
const JS = f => fs.readFileSync(path.join(AQUI, f), 'utf8');
const NUCLEO = JS('setup_modulos.js'), PASOS = JS('setup_pasos.js'), RESERVAS = JS('setup_reservas.js'), PUESTA = JS('ajustes_puesta.js');
const SHOT = process.argv[2];
let fallos = 0;
const ok = (n, c, x = '') => { if (!c) { fallos++; console.log('FALLA  ' + n + (x ? ' -> ' + x : '')); } else console.log('ok     ' + n); };

// ── la base simulada ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const hoy = (d = 0) => { const x = new Date(); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
let reloj = 0;
const marca = () => '2026-10-12T20:' + String(10 + Math.floor(reloj / 60)).padStart(2, '0') + ':' + String(reloj++ % 60).padStart(2, '0') + '.123456+00:00';
let nid = 1;
const uuid = () => '00000000-0000-4000-8000-' + String(nid++).padStart(12, '0');
const REGLAS_DEF = { bloqueo_minutos: 60, dias_min: 1, dias_max: 366, horizonte_dias: null, max_por_telefono: 2, max_activos: 5 };
const RANGOS = { bloqueo_minutos: [10, 10080], dias_min: [1, 366], dias_max: [1, 366], horizonte_dias: [1, 730], max_por_telefono: [1, 20], max_activos: [1, 500] };
function base(o = {}) {
  const b = { o, llamadas: [], moneda: 'IDR', valores: { reservas_sin_impuesto: 'no', precio_incluye_impuesto: 'si' }, productos: [], garantias: [], seguros: [],
    reglas: { bloqueo_minutos: null, dias_min: null, dias_max: null, horizonte_dias: null, max_por_telefono: null, max_activos: null }, previos: [], revisado: null,
    entrega: { ajustes: { activa: false, sede_nombre: null, sede_lat: null, sede_lng: null, km_max: null, cobra_recogida: null, tope_dia: 200, tope_mes: 3000, cache_dias: 30 }, version: 1, tarifa: null },
    falla: Object.assign({}, o.falla || {}), pierde: Object.assign({}, o.pierde || {}) };
  if (o.conProducto) {
    b.productos.push({ id: 'p-honda', numero: 'P-1', nombre: 'Honda Scoopy', activo: true, clase: 'alquiler', precio: 90000, moneda: 'IDR',
      tarifas: [{ id: 't1', dias: 1, precio: 90000, moneda: 'IDR', etiqueta: null, actualizado_en: marca() }, { id: 't3', dias: 3, precio: 250000, moneda: 'IDR', etiqueta: null, actualizado_en: marca() }],
      unidades: [{ id: 'u1', numero: 'U1', identificador: 'DK 1111 AA', estado: 'disponible', notas: null, actualizado_en: marca() },
                 { id: 'u2', numero: 'U2', identificador: 'DK 2222 BB', estado: 'disponible', notas: null, actualizado_en: marca() },
                 { id: 'u3', numero: 'U3', identificador: 'DK 3333 CC', estado: 'baja', notas: null, actualizado_en: marca() }] });
  }
  if (o.conPrevio) { b.previos.push({ id: 'pr1', numero_reserva: 'R-1', unidad_id: 'u1', identificador: 'DK 1111 AA', producto_id: 'p-honda', desde: hoy(-4), hasta: hoy(6), cliente_ref: 'Ana' }); b.revisado = { en: marca(), por: 'dion@x.com' }; }
  if (o.reglas) Object.assign(b.reglas, o.reglas);
  return b;
}
const err = (code, hint, details) => ({ data: null, error: { code, hint: hint || null, message: 'mensaje en español que el front NO lee', details: details || null } });
const letras = s => (String(s || '').match(/\p{L}/gu) || []).length;
const motivoMal = m => !m || letras(m) < 3 || String(m).length > 200;
function pasosDe(b) {
  const alq = b.productos.filter(p => p.activo && p.clase === 'alquiler');
  const flotaOk = alq.some(p => p.tarifas.length && p.unidades.some(u => u.estado === 'disponible'));
  const r = b.reglas, e = b.entrega;
  const P = (clave, hecho, obligatorio, donde, falta, ref) => ({ modulo: 'reservas-producto', clave, hecho, obligatorio, irreversible: false, donde, modulo_requerido: null, ref: ref || null, falta: hecho ? null : falta });
  return [
    { modulo: 'base', clave: 'moneda', hecho: true, obligatorio: true, irreversible: true, falta: null, donde: '/ajustes/', modulo_requerido: null, ref: null },
    P('impuesto_pkp', true, true, '/ajustes/', null), P('precio_con_impuesto', true, true, '/ajustes/', null),
    P('clase', alq.length > 0, true, '/flota/', { codigo: 'sin_producto', campos: [] }, alq[0] ? 'alquiler' : null),
    P('flota', flotaOk, true, '/flota/', { codigo: 'sin_flota', campos: [] }, alq[0] ? alq[0].id : null),
    P('reglas_reserva', r.bloqueo_minutos != null && r.dias_min != null && r.dias_max != null, false, '/ajustes/', { codigo: 'falta_dato', campos: ['bloqueo_minutos', 'dias_min', 'dias_max'].filter(k => r[k] == null) }),
    P('alquileres_previos', !!b.revisado, true, '/flota/', { codigo: 'previos_sin_revisar', campos: [] }),
    P('entrega', e.ajustes.activa && e.ajustes.sede_lat != null && !!e.tarifa && e.ajustes.cobra_recogida != null, false, '/entrega/', { codigo: 'falta_dato', campos: ['entrega_activa', 'sede', 'precio_km', 'recogida'] }),
    P('cobros', true, true, '/ajustes/', null), P('usuarios', true, true, '/usuarios/', null)
  ];
}
function estadoSetup(b) {
  const pasos = pasosDe(b);
  const mods = ['base', 'reservas-producto'].map(m => { const pend = pasos.filter(p => p.modulo === m && p.obligatorio && !p.hecho); return { modulo: m, estado: pend.length ? 'sin_configurar' : 'configurado', falta: pend.length ? pend[0].clave : null }; });
  return { puede_configurar: !b.o.noConfigura, moneda: b.moneda, monedas: ['IDR', 'EUR', 'USD'], modulos: mods, pasos: b.o.noConfigura ? [] : pasos };
}
function setupDatos(b, a) {
  const pid = a.p_producto || null, f = x => !pid || x.producto_id === pid;
  return { clases: [{ clase: 'alquiler', disponible: true }, { clase: 'salida', disponible: false, porque: 'sin_base' }, { clase: 'servicio', disponible: true }],
    garantias: b.garantias.filter(f), seguro_tramos: b.seguros.filter(f), reglas: Object.assign({}, b.reglas), reglas_defecto: Object.assign({}, REGLAS_DEF),
    previos: JSON.parse(JSON.stringify(b.previos)), previos_revisado: b.revisado ? Object.assign({}, b.revisado) : null,
    topes: { seguro_precio_max: { IDR: 300000000, EUR: 5000, USD: 5000 }, dias_max: 366, bloqueo_minutos: [10, 10080] } };
}
function flotaDatos(b, a) {
  // la forma REAL (erp/migraciones/20261008138700): id, numero, nombre, activo, listo_para_reservar, faltan, unidades, tarifas. Ni precio ni clase.
  const prods = b.productos.filter(p => !a.p_producto || p.id === a.p_producto).map(p => ({ id: p.id, numero: p.numero, nombre: p.nombre, activo: p.activo, listo_para_reservar: true, faltan: [],
    unidades: JSON.parse(JSON.stringify(p.unidades)), tarifas: JSON.parse(JSON.stringify(p.tarifas)) }));
  return { productos: prods, recortado: false, versiones: [], topes: { precio: { min: 1000, max_por_moneda: { IDR: 50000000 } }, dias: { min: 1, max: 366 }, lote: { max: 100 }, unidades_por_producto: { max: 250 }, motivo: { min: 3, max: 200 }, identificador: { min: 1, max: 40 } } };
}
function entregaDatos(b) {
  const e = b.entrega, a = e.ajustes, faltan = [];
  if (a.sede_lat == null) faltan.push('sede'); if (!e.tarifa) faltan.push('tarifa');
  return { ajustes: Object.assign({}, a), version: e.version, tarifa: e.tarifa ? Object.assign({}, e.tarifa) : null, faltan, avisos: [], uso: { hoy: 0, mes: 0, tope_dia: a.tope_dia, tope_mes: a.tope_mes }, versiones: [], topes: {} };
}
const prod = (b, id) => b.productos.find(p => p.id === id);
const totalMal = (lista, dias, precio) => lista.some(t => (t.dias < dias && Number(t.precio) > precio) || (t.dias > dias && Number(t.precio) < precio));
function escribe(b, n, a) {
  switch (n) {
    case 'producto_guarda': {
      const d = a.p_datos || {};
      if (d.moneda != null && d.moneda !== b.moneda) return err('22023', 'moneda_no_permitida');
      if (a.p_id == null) {
        if (!d.nombre || !String(d.nombre).trim()) return err('22023', null);
        const p = { id: uuid(), numero: 'P-' + nid, nombre: d.nombre, activo: d.activo !== false, clase: d.clase || 'servicio', precio: d.precio, moneda: d.moneda || b.moneda, tarifas: [], unidades: [] };
        b.productos.push(p); return { data: p.id, error: null };
      }
      const p = prod(b, a.p_id); if (!p) return err('P0002');
      Object.assign(p, d); return { data: p.id, error: null };
    }
    case 'producto_tarifa_guarda': {
      const p = prod(b, a.p_producto_id); if (!p) return err('P0002');
      if (motivoMal(a.p_motivo)) return err('22023', 'motivo');
      if (a.p_moneda !== b.moneda) return err('22023', 'moneda_no_permitida');
      const x = p.tarifas.find(t => t.dias === a.p_dias);
      if ((x && a.p_esperado !== x.actualizado_en) || (!x && a.p_esperado != null)) return err('40001', 'flota_cambio');
      if (totalMal(p.tarifas.filter(t => t !== x), a.p_dias, a.p_precio)) return err('22023', 'datos');
      if (x) Object.assign(x, { precio: a.p_precio, actualizado_en: marca() }); else p.tarifas.push({ id: uuid(), dias: a.p_dias, precio: a.p_precio, moneda: a.p_moneda, etiqueta: a.p_etiqueta, actualizado_en: marca() });
      return { data: (x || p.tarifas[p.tarifas.length - 1]).id, error: null };
    }
    case 'producto_garantia_guarda': {
      if (motivoMal(a.p_motivo)) return err('22023', 'motivo');
      const g = b.garantias.find(x => x.producto_id === a.p_producto);
      if ((g && a.p_esperado !== g.actualizado_en) || (!g && a.p_esperado != null)) return err('40001', 'flota_cambio');
      const nueva = Object.assign({ producto_id: a.p_producto, moneda: b.moneda }, a.p_datos, { actualizado_en: marca() });
      if (g) Object.assign(g, nueva); else b.garantias.push(nueva);
      return { data: { producto_id: a.p_producto, actualizado_en: nueva.actualizado_en }, error: null };
    }
    case 'producto_seguro_guarda': {
      if (motivoMal(a.p_motivo)) return err('22023', 'motivo');
      const mios = b.seguros.filter(s => s.producto_id === a.p_producto_id), x = mios.find(s => s.dias === a.p_dias);
      if ((x && a.p_esperado !== x.actualizado_en) || (!x && a.p_esperado != null)) return err('40001', 'flota_cambio');
      if (totalMal(mios.filter(s => s !== x), a.p_dias, a.p_precio)) return err('22023', 'datos');
      if (x) Object.assign(x, { precio: a.p_precio, actualizado_en: marca() }); else b.seguros.push({ id: uuid(), producto_id: a.p_producto_id, dias: a.p_dias, precio: a.p_precio, moneda: a.p_moneda, actualizado_en: marca() });
      return { data: (x || b.seguros[b.seguros.length - 1]).id, error: null };
    }
    case 'producto_seguro_borra': {
      if (motivoMal(a.p_motivo)) return err('22023', 'motivo');
      const i = b.seguros.findIndex(s => s.id === a.p_id); if (i < 0) return err('P0002');
      if (b.seguros[i].actualizado_en !== a.p_esperado) return err('40001', 'flota_cambio');
      b.seguros.splice(i, 1); return { data: true, error: null };
    }
    case 'producto_unidades_alta_lote': {
      const p = prod(b, a.p_producto_id); if (!p) return err('P0002');
      if (motivoMal(a.p_motivo)) return err('22023', 'motivo');
      const todas = b.productos.flatMap(x => x.unidades.map(u => u.identificador));
      const rep = a.p_identificadores.find(m => todas.includes(m)); if (rep) return err('23505', 'flota_duplicada', rep);
      a.p_identificadores.forEach(m => p.unidades.push({ id: uuid(), numero: 'U' + nid, identificador: m, estado: 'disponible', notas: null, actualizado_en: marca() }));
      return { data: { creadas: a.p_identificadores.length }, error: null };
    }
    case 'reservas_reglas_guarda': {
      const d = a.p_datos || {};
      for (const k of Object.keys(d)) { const v = d[k]; if (!(k in RANGOS)) return err('22023', 'regla_fuera', k); if (v == null && k === 'horizonte_dias') continue; if (typeof v !== 'number' || v < RANGOS[k][0] || v > RANGOS[k][1]) return err('22023', 'regla_fuera', k); }
      const efe = k => d[k] !== undefined ? d[k] : (b.reglas[k] != null ? b.reglas[k] : REGLAS_DEF[k]);
      if (efe('dias_max') < efe('dias_min')) return err('22023', 'regla_fuera', 'dias_max');
      const cambia = Object.keys(d).some(k => b.reglas[k] != null && b.reglas[k] !== d[k]);
      if (cambia && motivoMal(a.p_motivo)) return err('22023', 'falta_motivo');
      Object.assign(b.reglas, d);
      return { data: { reglas: Object.assign({}, b.reglas) }, error: null };
    }
    case 'reservas_previas_guarda': {
      if (motivoMal(a.p_motivo)) return err('22023', 'motivo');
      const nuevas = [];
      for (const q of a.p_lista) {
        let u = null; b.productos.forEach(p => p.unidades.forEach(x => { if (x.id === q.unidad_id) u = Object.assign({ pid: p.id }, x); }));
        if (!u) return err('22023', null);
        if (u.estado === 'baja') return err('22023', 'unidad_baja', u.identificador);
        if (!(q.desde <= hoy() && q.desde >= hoy(-366) && q.hasta > hoy())) return err('22023', 'previo_fechas');
        if (b.previos.concat(nuevas).some(x => x.unidad_id === q.unidad_id && x.desde < q.hasta && q.desde < x.hasta)) return err('23P01', 'unidad_ocupada', u.identificador);
        nuevas.push({ id: uuid(), numero_reserva: 'R-' + nid, unidad_id: q.unidad_id, identificador: u.identificador, producto_id: u.pid, desde: q.desde, hasta: q.hasta, cliente_ref: q.cliente_ref });
      }
      b.previos.push(...nuevas); b.revisado = { en: marca(), por: 'yo@x.com' };
      return { data: { creadas: nuevas.map(x => ({ id: x.id, numero_reserva: x.numero_reserva, unidad_id: x.unidad_id })), revisado: b.revisado }, error: null };
    }
    case 'reserva_previa_quita': {
      if (motivoMal(a.p_motivo)) return err('22023', 'motivo');
      const i = b.previos.findIndex(x => x.id === a.p_id); if (i < 0) return err('P0002');
      b.previos.splice(i, 1); return { data: true, error: null };
    }
    case 'entrega_ajustes_guarda': {
      const e = b.entrega, d = a.p_datos || {};
      if (a.p_version !== e.version) return err('40001', 'entrega_cambio');
      if (motivoMal(a.p_motivo)) return err('22023', 'motivo');
      if (e.ajustes.activa && d.activa !== false && ('sede_nombre' in d || 'sede_lat' in d)) return err('22023', 'entrega_apaga_primero');
      const nueva = Object.assign({}, e.ajustes, d);
      if (nueva.activa && (!e.tarifa || nueva.sede_lat == null)) return err('22023', 'entrega_incompleta');
      if (e.tarifa && nueva.km_max != null && e.tarifa.km_gratis >= nueva.km_max && e.tarifa.km_gratis > 0) return err('22023', 'datos');
      e.ajustes = nueva; e.version++;
      return { data: { version: e.version }, error: null };
    }
    case 'entrega_tarifa_guarda': {
      const e = b.entrega, d = a.p_datos || {};
      if (motivoMal(a.p_motivo)) return err('22023', 'motivo');
      if (d.moneda !== b.moneda) return err('22023', 'moneda_no_permitida');
      if (e.ajustes.km_max != null && d.km_gratis >= e.ajustes.km_max && d.km_gratis > 0) return err('22023', 'datos');
      if ((e.tarifa ? e.tarifa.id : null) !== (a.p_tarifa_id || null)) return err('40001', 'entrega_cambio');
      e.tarifa = Object.assign({ id: uuid() }, d); return { data: e.tarifa.id, error: null };
    }
  }
  return err('42883', null);
}
function servidor(b, n, a) {
  b.llamadas.push([n, JSON.parse(JSON.stringify(a || {}))]);
  a = a || {};
  if (b.o.leeFalla === n) return err('PGRST202');
  if (n === 'modulos_setup_estado') return { data: estadoSetup(b), error: null };
  if (n === 'ajustes_config_datos') return { data: { valores: Object.assign({}, b.valores), puede_escribir: true }, error: null };
  if (n === 'reservas_setup_datos') return { data: setupDatos(b, a), error: null };
  if (n === 'producto_flota_datos') return { data: flotaDatos(b, a), error: null };
  if (n === 'entrega_datos') return { data: entregaDatos(b), error: null };
  // escrituras: fallo con código o respuesta perdida (antes o después de que la base guarde), una vez
  const clave = n + (a.p_dias ? ':' + a.p_dias : '');
  const f = b.falla[clave] || b.falla[n];
  if (f) { delete b.falla[clave]; delete b.falla[n]; return err(f[0], f[1], f[2]); }
  const pr = b.pierde[clave] || b.pierde[n];
  if (pr) { delete b.pierde[clave]; delete b.pierde[n]; if (pr === 'despues') escribe(b, n, a); return { red: true }; }
  return escribe(b, n, a);
}

// ── las páginas: el asistente y Ajustes › Configurar módulos, con la sesión y el idioma simulados ─────────────────────────────────────────────
const cabeza = (idioma) => `<!doctype html><html lang="${idioma}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:sans-serif}main{padding:16px}.hidden{display:none}[hidden]{display:none!important}</style></head><body>`;
const sesion = (idioma, url) => `<script>
history.replaceState(null, '', '${url}');
window.__sinTrad = []; window.__errores = [];
window.addEventListener('error', function (e) { window.__errores.push(String(e.message)); });
function cadena() { var q = { select: function () { return q; }, eq: function () { return q; }, maybeSingle: function () { return Promise.resolve({ data: null, error: null }); } }; return q; }
var sb = { rpc: function (n, a) { return window.__srv(n, a || {}); }, from: cadena };
window.LW_AUTH = Promise.resolve({ sb: sb });
window.lwDatos = function (n, a) { return sb.rpc(n, a); };
window.LW_EN = {}; window.LW_ID = {}; window.__idioma = '${idioma}';
window.lwT = function (s, hu) { s = String(s); var d = window.__idioma === 'en' ? window.LW_EN : window.__idioma === 'id' ? window.LW_ID : null; var v = s;
  if (d) { if (Object.prototype.hasOwnProperty.call(d, s)) v = d[s]; else if (!/^[\\s0-9.:]*$/.test(s)) window.__sinTrad.push(s); }
  if (hu) for (var k in hu) v = v.split('%' + k).join(hu[k]); return v; };
</script>`;
const asistente = (idioma, url) => cabeza(idioma) + `<main>${HTML[0]}</main>` + sesion(idioma, url) + `<script>${NUCLEO}</script><script>${PASOS}</script><script>${RESERVAS}</script>${HTML[1]}</body></html>`;
const ajustes = (idioma) => cabeza(idioma) + `<main><section data-lw-panel="puesta"><div id="lw-aj-puesta"><p>…</p></div></section></main>` + sesion(idioma, '/ajustes/') +
  `<script>${NUCLEO}</script><script>${PASOS}</script><script>${RESERVAS}</script><script>${PUESTA}</script></body></html>`;

async function abre(nav, b, { idioma = 'es', url = '/ajustes/configurar/?modulo=reservas-producto', ancho = 1440, pag = 'asistente' } = {}) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 900 } });
  const p = await ctx.newPage();
  const body = pag === 'ajustes' ? ajustes(idioma) : asistente(idioma, url);
  await p.route('**/*', r => r.fulfill({ status: 200, contentType: 'text/html', body }));
  await p.exposeFunction('__srv', async (n, a) => { const r = servidor(b, n, a); if (r && r.red) throw new Error('Failed to fetch'); return r; });
  await p.goto('http://local.test' + (pag === 'ajustes' ? '/ajustes/' : url));
  await p.waitForTimeout(450);
  return { p, ctx };
}
const txt = async (p, sel) => (await p.$(sel)) ? (await p.$eval(sel, e => e.textContent.trim())) : null;
const clic = async (p, accion) => { await p.click('[data-axw-accion="' + accion + '"]'); await p.waitForTimeout(350); };
const pasoActual = p => p.getAttribute('[data-axw-paso]', 'data-axw-paso').catch(() => null);
const llamadas = (b, n) => b.llamadas.filter(x => x[0] === n);
const escrituras = b => b.llamadas.filter(x => !/(_datos|modulos_setup_estado)$/.test(x[0]));
const errorTxt = p => txt(p, '[data-axw-as="error"]');
const sinErroresJs = async (p, n) => ok(n + ': sin errores de página', (await p.evaluate(() => window.__errores)).length === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
async function rellenaAlquiler(p, o = {}) {
  await p.fill('[data-axw-campo="nombre"]', o.nombre || 'Honda Vario 125');
  await p.fill('[data-axw-campo="tarifa_1"]', '90.000'); await p.fill('[data-axw-campo="tarifa_7"]', '550.000'); await p.fill('[data-axw-campo="tarifa_30"]', '1.800.000');
  await p.fill('[data-axw-campo="seguro_1"]', '30.000'); await p.fill('[data-axw-campo="seguro_30"]', '600.000'); await p.fill('[data-axw-campo="seguro_365"]', '1.800.000');
  await p.fill('[data-axw-campo="fianza"]', '1.000.000'); await p.check('[data-axw-campo="seguro_obligatorio"]');
  await p.fill('[data-axw-campo="mat_0"]', 'dk 1234 ab'); await p.click('[data-axw-sr-accion="anadir-unidad"]'); await p.fill('[data-axw-campo="mat_1"]', 'DK 5678 CD');
}

(async () => {
  const nav = await chromium.launch({ executablePath: EXE });
  let b, p, ctx;

  // ── 1. Recorrido entero desde vacío: clase → alquiler → lo ya alquilado → listo ───────────────────────────────────────────────────────
  b = base();
  ({ p, ctx } = await abre(nav, b));
  ok('S40 abre en la clase (primer paso que falta)', (await pasoActual(p)) === 'clase', await pasoActual(p));
  ok('S40 «salida con plazas» se ve pero no se puede elegir (sin base)', await p.$eval('[data-axw-campo="clase"][value="salida"]', e => e.disabled));
  ok('S40 alquiler marcado de salida y botón «Continuar»', (await p.$eval('[data-axw-campo="clase"][value="alquiler"]', e => e.checked)) && (await txt(p, '[data-axw-accion="enviar"]')) === 'Continuar');
  await p.check('[data-axw-campo="clase"][value="servicio"]'); await p.waitForTimeout(100);
  ok('S40 servicio: lleva a Productos y no avanza', await p.isVisible('[data-axw-sr-accion="abrir-productos"]') && (await p.getAttribute('[data-axw-sr-accion="abrir-productos"]', 'href')) === '/productos/');
  await clic(p, 'enviar');
  ok('S40 servicio: sigue en la clase, sin llamar a nada', (await pasoActual(p)) === 'clase' && escrituras(b).length === 0 && ((await errorTxt(p)) || '').includes('Productos'));
  await p.check('[data-axw-campo="clase"][value="alquiler"]'); await clic(p, 'enviar');
  ok('S40 → S41: «Continuar» lleva al alquiler sin guardar nada', (await pasoActual(p)) === 'flota' && escrituras(b).length === 0, await pasoActual(p));
  await p.waitForSelector('[data-axw-sr="flota"] [data-axw-campo="nombre"]');
  ok('S41 vacío: sin campo de motivo (nada guardado aún)', !(await p.$('[data-axw-sr="flota"] [data-axw-campo="sr_motivo"]')));
  ok('S41 vacío: el color de la unidad y los dos niveles de seguro NO se pintan (sin base)', !(await p.$('[data-axw-campo*="color"]')) && !(await p.$('[data-axw-campo*="basic"]')));
  await clic(p, 'enviar');
  ok('S41 vacío: dice qué falta y no envía', ((await errorTxt(p)) || '').includes('nombre del producto') && escrituras(b).length === 0, await errorTxt(p));
  await rellenaAlquiler(p);
  ok('S41 la matrícula se escribe en mayúsculas', (await p.inputValue('[data-axw-campo="mat_0"]')) === 'DK 1234 AB');
  await clic(p, 'enviar'); await p.waitForTimeout(400);
  const orden = escrituras(b).map(x => x[0] + (x[1].p_dias ? ':' + x[1].p_dias : ''));
  ok('S41 orden: producto, 3 tarifas, garantía, 3 seguros, lote de unidades', JSON.stringify(orden) === JSON.stringify(['producto_guarda', 'producto_tarifa_guarda:1', 'producto_tarifa_guarda:7', 'producto_tarifa_guarda:30', 'producto_garantia_guarda', 'producto_seguro_guarda:1', 'producto_seguro_guarda:30', 'producto_seguro_guarda:365', 'producto_unidades_alta_lote']), JSON.stringify(orden));
  const pg = llamadas(b, 'producto_guarda')[0][1];
  ok('S41 alta: clase alquiler, precio del día, unidad día, activo y la moneda de la instancia', pg.p_id === null && pg.p_datos.clase === 'alquiler' && pg.p_datos.precio === 90000 && pg.p_datos.unidad === 'día' && pg.p_datos.activo === true && pg.p_datos.moneda === 'IDR', JSON.stringify(pg));
  const t30 = llamadas(b, 'producto_tarifa_guarda').find(x => x[1].p_dias === 30)[1];
  ok('S41 «1.800.000» viaja como 1800000, sin versión (tramo nuevo) y con el motivo de alta', t30.p_precio === 1800000 && t30.p_esperado === null && t30.p_motivo === 'Alta inicial desde el asistente de configuración', JSON.stringify(t30));
  const ga = llamadas(b, 'producto_garantia_guarda')[0][1];
  ok('S41 garantía: fianza, seguro obligatorio y «fianza O seguro» (BBM)', ga.p_datos.fianza === 1000000 && ga.p_datos.seguro_obligatorio === true && ga.p_datos.fianza_con_seguro === false && ga.p_esperado === null, JSON.stringify(ga));
  ok('S41 unidades normalizadas', JSON.stringify(llamadas(b, 'producto_unidades_alta_lote')[0][1].p_identificadores) === '["DK 1234 AB","DK 5678 CD"]');
  ok('S41 → S44 lo ya alquilado (S43 es opcional: se ofrece al final)', (await pasoActual(p)) === 'alquileres_previos', await pasoActual(p));
  await p.waitForSelector('[data-axw-sr="alquileres_previos"] [data-axw-campo="fuera"]');
  ok('S44 nunca pide precio', !(await p.$('[data-axw-sr="alquileres_previos"] [data-axw-campo*="precio"]')));
  await clic(p, 'enviar');
  ok('S44 vacío: obliga a responder sí o no', (await errorTxt(p)) === 'Elige sí o no.' && llamadas(b, 'reservas_previas_guarda').length === 0);
  await p.check('[data-axw-campo="fuera"][value="si"]'); await p.waitForTimeout(100);
  const u1 = b.productos[0].unidades[0].id;
  await p.selectOption('[data-axw-campo="pu_0"]', u1); await p.fill('[data-axw-campo="pd_0"]', hoy(-3)); await p.fill('[data-axw-campo="ph_0"]', hoy(0));
  await clic(p, 'enviar');
  ok('S44 vuelta hoy: lo dice antes de enviar', ((await errorTxt(p)) || '').includes('después de hoy') && llamadas(b, 'reservas_previas_guarda').length === 0);
  await p.fill('[data-axw-campo="ph_0"]', hoy(5)); await p.fill('[data-axw-campo="pc_0"]', 'Ana López'); await p.waitForTimeout(100);
  ok('S44 recuadros: 1 fuera, 1 libre, vuelve ' + hoy(5), ((await txt(p, '[data-axw-sr-tiles]')) || '').replace(/\s+/g, '').includes('Fueraahora1Libreshoy1Próximavuelta' + hoy(5)), await txt(p, '[data-axw-sr-tiles]'));
  if (SHOT) await p.screenshot({ path: path.join(SHOT, 's44_1440.png'), fullPage: true });
  await clic(p, 'enviar'); await p.waitForTimeout(300);
  const rp = llamadas(b, 'reservas_previas_guarda')[0][1];
  ok('S44 guarda la unidad y las fechas, sin precio, con su motivo', rp.p_lista.length === 1 && rp.p_lista[0].unidad_id === u1 && rp.p_lista[0].hasta === hoy(5) && rp.p_lista[0].cliente_ref === 'Ana López' && !('precio' in rp.p_lista[0]) && letras(rp.p_motivo) >= 3, JSON.stringify(rp));
  // con reglas y entrega (opcionales) sin hacer, «listo» los nombra con su consecuencia (agencia-81, 12-oct); a secas solo sin nada pendiente
  ok('«Reservas de producto» configurado porque la base lo dice, nombrando lo opcional que queda', (await txt(p, '[data-axw-estado="listo"]')) === 'Reservas de producto ya funciona. Queda por configurar:'
    && (await p.$$('[data-axw-opcionales="pendientes"] [data-axw-opcional]')).length === 2, await txt(p, '[data-axw-tarjeta]') || await txt(p, '[data-axw-as="tarjeta"]'));
  ok('el listo ofrece los opcionales: reglas y entrega', ((await txt(p, '[data-axw-as="tarjeta"]')) || '').includes('Reglas de las reservas') && ((await txt(p, '[data-axw-as="tarjeta"]')) || '').includes('Entrega a domicilio'));
  await sinErroresJs(p, 'recorrido');
  await ctx.close();

  // ── 2. S41 a medias: falla el seguro de 30 días → lo que sí se guardó se dice, lo tecleado sigue, y al repetir no se duplica nada ───────────
  b = base({ falla: { 'producto_seguro_guarda:30': ['22023', 'datos'] } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=flota' }));
  await p.waitForSelector('[data-axw-sr="flota"] [data-axw-campo="nombre"]');
  await rellenaAlquiler(p); await clic(p, 'enviar'); await p.waitForTimeout(500);
  ok('S41 error con motivo: la frase del código (datos), no el mensaje de la base', ((await errorTxt(p)) || '').includes('Algún dato no vale') && !((await errorTxt(p)) || '').includes('NO lee'), await errorTxt(p));
  ok('S41 a medias: dice qué se guardó y qué no', ((await txt(p, '[data-axw-sr-aviso]')) || '').includes('No se guardó: el seguro de 30 días'), await txt(p, '[data-axw-sr-aviso]'));
  ok('S41 a medias: lo tecleado sigue ahí', (await p.inputValue('[data-axw-campo="seguro_30"]')) === '600.000' && (await p.inputValue('[data-axw-campo="mat_1"]')) === 'DK 5678 CD');
  const antes = escrituras(b).length;
  await clic(p, 'enviar'); await p.waitForTimeout(500);
  const despues = escrituras(b).slice(antes).map(x => x[0] + (x[1].p_dias ? ':' + x[1].p_dias : ''));
  ok('S41 al repetir: solo lo que faltaba (seguro 30 y 365, unidades), sin otro producto', JSON.stringify(despues) === JSON.stringify(['producto_seguro_guarda:30', 'producto_seguro_guarda:365', 'producto_unidades_alta_lote']) && b.productos.length === 1, JSON.stringify(despues));
  ok('S41 hecho → pasa al siguiente que falta', (await pasoActual(p)) === 'alquileres_previos', await pasoActual(p));
  await ctx.close();

  // ── 3. S41 duda: la respuesta del alta se pierde DESPUÉS de guardar → se relee, se encuentra el producto y sigue; un solo producto ─────────
  b = base({ pierde: { producto_guarda: 'despues' } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=flota' }));
  await p.waitForSelector('[data-axw-sr="flota"] [data-axw-campo="nombre"]');
  await rellenaAlquiler(p); await clic(p, 'enviar'); await p.waitForTimeout(600);
  ok('S41 duda (sí se guardó): un solo producto, un solo envío del alta, y sigue', b.productos.length === 1 && llamadas(b, 'producto_guarda').length === 1 && (await pasoActual(p)) === 'alquileres_previos', b.productos.length + ' / ' + await pasoActual(p));
  await ctx.close();
  // y si se pierde ANTES de guardar → «no se guardó», sin reenviar
  b = base({ pierde: { 'producto_tarifa_guarda:7': 'antes' } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=flota' }));
  await p.waitForSelector('[data-axw-sr="flota"] [data-axw-campo="nombre"]');
  await rellenaAlquiler(p); await clic(p, 'enviar'); await p.waitForTimeout(600);
  ok('S41 duda (no se guardó): lo dice, un solo envío del tramo de 7 días', ((await errorTxt(p)) || '').includes('no se guardó') && llamadas(b, 'producto_tarifa_guarda').filter(x => x[1].p_dias === 7).length === 1, await errorTxt(p));
  await ctx.close();

  // ── 4. S41 con un producto ya dado de alta: se edita ESE (ref), los tramos que no son 1/7/30 se respetan, cambiar pide motivo ─────────────
  b = base({ conProducto: true });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=flota' }));
  ok('S41 hecho: «Hecho» y «Cambiar», sin formulario', !!(await p.$('[data-axw-hecho]')) && !!(await p.$('[data-axw-accion="cambiar"]')) && !(await p.$('[data-axw-sr="flota"]')));
  await clic(p, 'cambiar'); await p.waitForSelector('[data-axw-sr="flota"] [data-axw-campo="nombre"]');
  ok('S41 editar: trae el producto, sus unidades y avisa del tramo de 3 días', (await p.inputValue('[data-axw-campo="nombre"]')) === 'Honda Scoopy' && ((await txt(p, '[data-axw-sr="flota"]')) || '').includes('DK 1111 AA') && ((await txt(p, '[data-axw-sr="flota"]')) || '').includes('(3 días)'));
  await p.fill('[data-axw-campo="tarifa_1"]', '95.000'); await clic(p, 'enviar');
  ok('S41 cambiar un precio guardado sin motivo: no envía', ((await errorTxt(p)) || '').includes('motivo') && escrituras(b).length === 0, await errorTxt(p));
  const esp0 = b.productos[0].tarifas[0].actualizado_en;
  await p.fill('[data-axw-sr="flota"] [data-axw-campo="sr_motivo"]', 'Subida de temporada'); await clic(p, 'enviar'); await p.waitForTimeout(400);
  const t1 = llamadas(b, 'producto_tarifa_guarda')[0];
  ok('S41 cambio de precio: solo el tramo, de ese producto, con su versión y el motivo del usuario (el producto no se toca)', t1 && t1[1].p_producto_id === 'p-honda' && t1[1].p_esperado === esp0 && t1[1].p_motivo === 'Subida de temporada'
     && llamadas(b, 'producto_guarda').length === 0 && escrituras(b).length === 1, JSON.stringify(escrituras(b)));
  ok('S41 cambio: no se dio de alta ningún producto ni tramo de 3 días', b.productos.length === 1 && !escrituras(b).some(x => x[1].p_dias === 3));
  await ctx.close();
  // añadir solo unidades a un producto que ya existe: sin motivo obligatorio, sin tocar el producto, y el motivo fijo no dice «alta inicial»
  b = base({ conProducto: true });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=flota' }));
  await clic(p, 'cambiar'); await p.waitForSelector('[data-axw-sr="flota"] [data-axw-campo="nombre"]');
  await p.click('[data-axw-sr-accion="anadir-unidad"]'); await p.fill('[data-axw-campo="mat_0"]', 'DK 4444 DD'); await clic(p, 'enviar'); await p.waitForTimeout(400);
  const lt = llamadas(b, 'producto_unidades_alta_lote')[0];
  ok('S41 añadir unidades a lo existente: solo el lote, con «Añadido desde el asistente»', escrituras(b).length === 1 && lt && lt[1].p_motivo === 'Añadido desde el asistente de configuración' && JSON.stringify(lt[1].p_identificadores) === '["DK 4444 DD"]', JSON.stringify(escrituras(b)));
  await ctx.close();
  // respuesta perdida al CAMBIAR el nombre (después de guardar): se relee, se reconoce por el nombre y la cadena sigue
  b = base({ conProducto: true, pierde: { producto_guarda: 'despues' } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=flota' }));
  await clic(p, 'cambiar'); await p.waitForSelector('[data-axw-sr="flota"] [data-axw-campo="nombre"]');
  await p.fill('[data-axw-campo="nombre"]', 'Honda Scoopy 2024'); await p.fill('[data-axw-campo="tarifa_7"]', '500.000');
  await p.fill('[data-axw-sr="flota"] [data-axw-campo="sr_motivo"]', 'Nombre del modelo nuevo'); await clic(p, 'enviar'); await p.waitForTimeout(600);
  ok('S41 duda al renombrar: se reconoce por el nombre releído y sigue con el tramo', b.productos[0].nombre === 'Honda Scoopy 2024' && llamadas(b, 'producto_guarda').length === 1 && llamadas(b, 'producto_tarifa_guarda').some(x => x[1].p_dias === 7), JSON.stringify(escrituras(b)));
  await ctx.close();
  // conflicto de versión: 40001 flota_cambio
  b = base({ conProducto: true, falla: { 'producto_tarifa_guarda:1': ['40001', 'flota_cambio'] } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=flota' }));
  await clic(p, 'cambiar'); await p.waitForSelector('[data-axw-sr="flota"] [data-axw-campo="nombre"]');
  await p.fill('[data-axw-campo="tarifa_1"]', '95.000'); await p.fill('[data-axw-sr="flota"] [data-axw-campo="sr_motivo"]', 'Subida de temporada'); await clic(p, 'enviar'); await p.waitForTimeout(400);
  ok('S41 40001 flota_cambio: «otra persona ha cambiado esto»', ((await errorTxt(p)) || '').includes('Otra persona ha cambiado'), await errorTxt(p));
  await ctx.close();
  // la herramienta: 42501 sin_herramienta
  b = base({ falla: { producto_guarda: ['42501', 'sin_herramienta'] } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=flota' }));
  await p.waitForSelector('[data-axw-sr="flota"] [data-axw-campo="nombre"]');
  await rellenaAlquiler(p); await clic(p, 'enviar'); await p.waitForTimeout(400);
  ok('S41 sin la herramienta: dice que la pida en Usuarios', ((await errorTxt(p)) || '').includes('herramienta') && b.productos.length === 0, await errorTxt(p));
  await ctx.close();

  // ── 5. S43 reglas: por defecto, primer guardado sin motivo, cambio con motivo, error por código; «Siguiente» en un opcional hecho ───────
  b = base({ conProducto: true, conPrevio: true });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=reglas_reserva' }));
  await p.waitForSelector('[data-axw-sr="reglas_reserva"] [data-axw-campo="bloqueo_minutos"]');
  ok('S43 vacío: valores por defecto marcados (1 h), nota de «aún no guardado», sin motivo',
     (await p.$eval('[data-axw-campo="bloqueo_minutos"][value="60"]', e => e.checked)) && (await p.inputValue('[data-axw-campo="dias_min"]')) === '1' && (await p.inputValue('[data-axw-campo="dias_max"]')) === '366'
     && (await p.inputValue('[data-axw-campo="horizonte_dias"]')) === '' && ((await txt(p, '[data-axw-sr="reglas_reserva"]')) || '').includes('Aún no se ha guardado') && !(await p.$('[data-axw-sr="reglas_reserva"] [data-axw-campo="sr_motivo"]')));
  ok('S43 «Book at least N hours» y el horario NO se pintan (sin base)', !(await p.$('[data-axw-campo*="hora"]')) && !(await p.$('[data-axw-campo*="horario"]')));
  await p.check('[data-axw-campo="bloqueo_minutos"][value="120"]'); await p.waitForTimeout(80);
  ok('S43 el ejemplo sigue al tiempo elegido', ((await txt(p, '[data-axw-sr-ejemplo]')) || '').includes('12:00'), await txt(p, '[data-axw-sr-ejemplo]'));
  await p.click('[data-axw-sr-accion="mas-dias_min"]'); await p.click('[data-axw-sr-accion="mas-dias_min"]');
  await p.selectOption('[data-axw-campo="horizonte_dias"]', '180');
  await clic(p, 'enviar'); await p.waitForTimeout(300);
  const rg = llamadas(b, 'reservas_reglas_guarda')[0];
  ok('S43 primer guardado: las 3 claves + horizonte, sin motivo, sin los límites del bot que no cambian', rg && JSON.stringify(rg[1].p_datos) === JSON.stringify({ bloqueo_minutos: 120, dias_min: 3, dias_max: 366, horizonte_dias: 180 }) && rg[1].p_motivo === null, JSON.stringify(rg && rg[1]));
  ok('S43 opcional guardado → vuelve a «listo», no al paso 1', !!(await p.$('[data-axw-estado="listo"]')), await pasoActual(p));
  await ctx.close();
  // cambio de un valor guardado: pide motivo; error regla_fuera por código
  b = base({ conProducto: true, conPrevio: true, reglas: { bloqueo_minutos: 120, dias_min: 3, dias_max: 366 } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=reglas_reserva' }));
  await clic(p, 'siguiente');
  ok('S43 «Siguiente» en un opcional hecho lleva a «listo» (antes saltaba al paso 1)', !!(await p.$('[data-axw-estado="listo"]')) && !(await pasoActual(p)), await pasoActual(p));
  await ctx.close();
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=reglas_reserva' }));
  await clic(p, 'cambiar'); await p.waitForSelector('[data-axw-sr="reglas_reserva"] [data-axw-campo="sr_motivo"]');
  await p.check('[data-axw-campo="bloqueo_minutos"][value="30"]'); await clic(p, 'enviar');
  ok('S43 cambiar lo guardado sin motivo: no envía', ((await errorTxt(p)) || '').includes('motivo') && llamadas(b, 'reservas_reglas_guarda').length === 0, await errorTxt(p));
  b.falla.reservas_reglas_guarda = ['22023', 'regla_fuera', 'dias_max'];
  await p.fill('[data-axw-sr="reglas_reserva"] [data-axw-campo="sr_motivo"]', 'Fines de semana más cortos'); await clic(p, 'enviar'); await p.waitForTimeout(400);
  ok('S43 error regla_fuera: su frase, y la clave en el aviso', ((await errorTxt(p)) || '').includes('fuera de lo permitido') && ((await txt(p, '[data-axw-sr-aviso]')) || '').includes('dias_max'), (await errorTxt(p)) + ' / ' + await txt(p, '[data-axw-sr-aviso]'));
  await clic(p, 'enviar'); await p.waitForTimeout(400);
  const rg2 = llamadas(b, 'reservas_reglas_guarda').slice(-1)[0][1];
  ok('S43 al repetir: con el motivo y el valor tecleado conservados', rg2.p_motivo === 'Fines de semana más cortos' && rg2.p_datos.bloqueo_minutos === 30 && b.reglas.bloqueo_minutos === 30, JSON.stringify(rg2));
  await ctx.close();

  // ── 6. S44 retomar: lo apuntado se ve fijo y se puede quitar con motivo; lo nuevo se suma; unidad ocupada; «No, ninguna más» ─────────────
  b = base({ conProducto: true, conPrevio: true });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=alquileres_previos' }));
  await clic(p, 'cambiar'); await p.waitForSelector('[data-axw-sr="alquileres_previos"] [data-axw-sr-previo]');
  ok('S44 retomar: lo apuntado fijo y la pregunta pasa a «alguna otra»', ((await txt(p, '[data-axw-sr="alquileres_previos"]')) || '').includes('¿Hay alguna otra unidad fuera'));
  ok('S44 la unidad de baja no se ofrece', !((await p.$$eval('[data-axw-campo="pu_0"] option', os => os.map(o => o.textContent))).join('|').includes('DK 3333 CC')));
  await p.check('[data-axw-campo="fuera"][value="si"]'); await p.selectOption('[data-axw-campo="pu_0"]', 'u1');
  await p.fill('[data-axw-campo="pd_0"]', hoy(-1)); await p.fill('[data-axw-campo="ph_0"]', hoy(3)); await clic(p, 'enviar');
  ok('S44 la misma unidad que ya está fuera: se dice antes de enviar', ((await errorTxt(p)) || '').includes('dos veces') && llamadas(b, 'reservas_previas_guarda').length === 0, await errorTxt(p));
  await p.selectOption('[data-axw-campo="pu_0"]', 'u2');
  b.falla.reservas_previas_guarda = ['23P01', 'unidad_ocupada', 'DK 2222 BB'];
  await clic(p, 'enviar'); await p.waitForTimeout(400);
  ok('S44 23P01 unidad_ocupada: su frase y la matrícula', ((await errorTxt(p)) || '').includes('ya tiene otra reserva') && ((await txt(p, '[data-axw-sr-aviso]')) || '').includes('DK 2222 BB'), (await errorTxt(p)) + ' / ' + await txt(p, '[data-axw-sr-aviso]'));
  await clic(p, 'enviar'); await p.waitForTimeout(400);
  ok('S44 al repetir: se manda SOLO lo nuevo (lo ya apuntado no se reenvía)', llamadas(b, 'reservas_previas_guarda').slice(-1)[0][1].p_lista.length === 1 && b.previos.length === 2, JSON.stringify(llamadas(b, 'reservas_previas_guarda').slice(-1)[0][1]));
  await ctx.close();
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=alquileres_previos' }));
  await clic(p, 'cambiar'); await p.waitForSelector('[data-axw-sr-accion="quitar-previo"]');
  await p.click('[data-axw-sr-previo="pr1"] [data-axw-sr-accion="quitar-previo"]'); await p.click('[data-axw-sr-accion="confirma-quitar"]'); await p.waitForTimeout(150);
  ok('S44 quitar sin motivo: no llama', llamadas(b, 'reserva_previa_quita').length === 0);
  await p.fill('[data-axw-sr="quita-motivo"]', 'Apuntada por error'); await p.click('[data-axw-sr-accion="confirma-quitar"]'); await p.waitForTimeout(500);
  ok('S44 quitar con motivo: se llama y la lista se relee', llamadas(b, 'reserva_previa_quita').length === 1 && llamadas(b, 'reserva_previa_quita')[0][1].p_motivo === 'Apuntada por error' && !(await p.$('[data-axw-sr-previo="pr1"]')));
  await p.check('[data-axw-campo="fuera"][value="no"]'); await clic(p, 'enviar'); await p.waitForTimeout(400);
  ok('S44 «No»: manda la lista vacía (marca revisado, no borra)', JSON.stringify(llamadas(b, 'reservas_previas_guarda').slice(-1)[0][1].p_lista) === '[]');
  await ctx.close();

  // ── 7. S45 entrega: activar sin datos, orden de guardado (km_max sube → ajustes, tarifa, encender), mínimo visible, error por código ──────
  b = base({ conProducto: true, conPrevio: true });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=entrega' }));
  await p.waitForSelector('[data-axw-sr="entrega"] [data-axw-campo="activa"]');
  ok('S45 el MÍNIMO por trayecto está (el diseño no lo pinta; el dato real sí)', !!(await p.$('[data-axw-campo="minimo"]')));
  ok('S45 una sola sede: no hay desplegable de sedes', !(await p.$('[data-axw-sr="entrega"] select')));
  await p.check('[data-axw-campo="activa"]'); await clic(p, 'enviar');
  ok('S45 encender sin datos: dice lo que falta y no envía', ((await errorTxt(p)) || '').includes('hacen falta la tienda') && escrituras(b).length === 0, await errorTxt(p));
  await p.fill('[data-axw-campo="sede_nombre"]', 'Tienda Canggu'); await p.fill('[data-axw-campo="sede_coord"]', '-8.65, 115.13');
  await p.fill('[data-axw-campo="precio_km"]', '5.000'); await p.fill('[data-axw-campo="km_gratis"]', '20'); await p.fill('[data-axw-campo="km_max"]', '20'); await p.fill('[data-axw-campo="minimo"]', '15.000');
  await p.check('[data-axw-campo="cobra_recogida"][value="si"]'); await clic(p, 'enviar');
  ok('S45 km gratis ≥ km máximo: se dice antes de enviar', ((await errorTxt(p)) || '').includes('por debajo de la distancia máxima') && escrituras(b).length === 0, await errorTxt(p));
  await p.fill('[data-axw-campo="km_gratis"]', '3'); await p.waitForTimeout(80);
  ok('S45 la leyenda de la ilustración sigue a lo tecleado, sin precio de ejemplo', ((await txt(p, '[data-axw-sr-figura]')) || '').includes('Gratis · hasta 3 km') && ((await txt(p, '[data-axw-sr-figura]')) || '').includes('Mínimo por trayecto: IDR 15.000'), await txt(p, '[data-axw-sr-figura]'));
  if (SHOT) await p.screenshot({ path: path.join(SHOT, 's45_1440.png'), fullPage: true });
  await clic(p, 'enviar'); await p.waitForTimeout(500);
  const ord = escrituras(b).map(x => x[0] + (x[1].p_datos && 'activa' in x[1].p_datos ? ':activa' : ''));
  ok('S45 orden: ajustes (sube km_max) → tarifa → encender', JSON.stringify(ord) === JSON.stringify(['entrega_ajustes_guarda', 'entrega_tarifa_guarda', 'entrega_ajustes_guarda:activa']), JSON.stringify(ord));
  const ea = llamadas(b, 'entrega_ajustes_guarda');
  ok('S45 cada ajuste con la versión que dio la base, sin topes del mapa', ea[0][1].p_version === 1 && ea[1][1].p_version === 2 && !('tope_dia' in ea[0][1].p_datos) && ea[0][1].p_datos.sede_lat === -8.65 && ea[0][1].p_datos.cobra_recogida === true, JSON.stringify(ea));
  ok('S45 tarifa: precio por km, km gratis y mínimo, en la moneda de la instancia', JSON.stringify(llamadas(b, 'entrega_tarifa_guarda')[0][1].p_datos) === JSON.stringify({ moneda: 'IDR', precio_km: 5000, km_gratis: 3, minimo: 15000 }));
  ok('S45 hecho: la entrega encendida y vuelve a «listo»', b.entrega.ajustes.activa === true && !!(await p.$('[data-axw-estado="listo"]')));
  await ctx.close();
  // encendida: la tienda no se cambia, pedir motivo, y 40001 entrega_cambio
  b.falla.entrega_tarifa_guarda = ['40001', 'entrega_cambio'];
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=entrega' }));
  await clic(p, 'cambiar'); await p.waitForSelector('[data-axw-sr="entrega"] [data-axw-campo="sede_nombre"]');
  ok('S45 encendida: la tienda es de solo lectura y pide motivo', await p.$eval('[data-axw-campo="sede_nombre"]', e => e.readOnly) && !!(await p.$('[data-axw-sr="entrega"] [data-axw-campo="sr_motivo"]')));
  await p.fill('[data-axw-campo="precio_km"]', '6.000'); await p.fill('[data-axw-sr="entrega"] [data-axw-campo="sr_motivo"]', 'Sube la gasolina'); await clic(p, 'enviar'); await p.waitForTimeout(400);
  ok('S45 40001 entrega_cambio: «otra persona ha cambiado esto»', ((await errorTxt(p)) || '').includes('Otra persona ha cambiado'), await errorTxt(p));
  await ctx.close();

  // ── 8. Ajustes › Configurar módulos: el MISMO componente; la clase lleva al asistente; guardar en Ajustes ─────────────────────────────────
  b = base({ conProducto: true, conPrevio: true });
  ({ p, ctx } = await abre(nav, b, { pag: 'ajustes' }));
  ok('Ajustes: la clase lleva al asistente (no guarda sola)', ((await p.getAttribute('[data-pm-fila="clase"] [data-pm-asistente-paso="clase"]', 'href').catch(() => '')) || '').includes('paso=clase'));
  await p.click('[data-pm-fila="reglas_reserva"] [data-accion="pm-editar"]'); await p.waitForSelector('[data-pm-fila="reglas_reserva"] [data-axw-sr="reglas_reserva"] [data-axw-campo="bloqueo_minutos"]');
  ok('Ajustes: Reglas abre el mismo componente, sin el motivo del anfitrión', !(await p.$('[data-pm-fila="reglas_reserva"] [data-pm="motivo"]')));
  await p.click('[data-pm-fila="reglas_reserva"] [data-accion="pm-guardar"]'); await p.waitForTimeout(500);
  ok('Ajustes: guardar llama a la misma función y repinta con «Hecho»', llamadas(b, 'reservas_reglas_guarda').length === 1 && (await p.getAttribute('[data-pm-fila="reglas_reserva"] [data-pm-hecho]', 'data-pm-hecho')) === '1');
  await p.click('[data-pm-fila="flota"] [data-accion="pm-editar"]'); await p.waitForSelector('[data-pm-fila="flota"] [data-axw-sr="flota"] [data-axw-campo="nombre"]');
  ok('Ajustes: Flota abre el alquiler con el producto ya dado de alta', (await p.inputValue('[data-pm-fila="flota"] [data-axw-campo="nombre"]')) === 'Honda Scoopy');
  for (const ancho of [390, 1440]) {
    await p.setViewportSize({ width: ancho, height: 900 }); await p.waitForTimeout(100);
    ok('Ajustes ' + ancho + ': sin scroll horizontal', (await p.evaluate(() => document.documentElement.scrollWidth)) <= ancho);
  }
  await sinErroresJs(p, 'Ajustes');
  await ctx.close();

  // ── 9. Quien no configura; una lectura que falla ───────────────────────────────────────────────────────────────────────────────────────
  ({ p, ctx } = await abre(nav, base({ noConfigura: true })));
  ok('no configura: «solo el administrador principal», sin pasos', ((await txt(p, '[data-axw-as="tarjeta"]')) || '').includes('Solo el administrador principal') && !(await p.$('[data-axw-sr]')));
  await ctx.close();
  ({ p, ctx } = await abre(nav, base({ noConfigura: true }), { pag: 'ajustes' }));
  ok('no configura en Ajustes: el estado del módulo, sin pasos', !!(await p.$('[data-pm-modulo="reservas-producto"]')) && !(await p.$('[data-pm-fila]')));
  await ctx.close();
  b = base({ leeFalla: 'reservas_setup_datos' });
  ({ p, ctx } = await abre(nav, b));
  ok('lectura que falla: «no se ha podido mirar» con Reintentar, nunca un formulario vacío', !!(await p.$('[data-axw-sr-estado="fallo"]')) && !!(await p.$('[data-axw-sr-accion="releer"]')) && !(await p.$('[data-axw-campo="clase"]')));
  b.o.leeFalla = null; await p.click('[data-axw-sr-accion="releer"]'); await p.waitForTimeout(300);
  ok('Reintentar vuelve a mirar y pinta', !!(await p.$('[data-axw-campo="clase"]')));
  await ctx.close();

  // ── 10. Cada paso a 390 y 1440 en es/en/id: sin scroll horizontal, sin español en en/id; ningún código sin frase ──────────────────────────
  const PANTALLAS = [['clase', {}], ['flota', { conProducto: true }], ['reglas_reserva', { conProducto: true, conPrevio: true }], ['alquileres_previos', { conProducto: true }], ['entrega', { conProducto: true, conPrevio: true }]];
  for (const [paso, o] of PANTALLAS) for (const idioma of ['es', 'en', 'id']) for (const ancho of [390, 1440]) {
    b = base(o);
    ({ p, ctx } = await abre(nav, b, { idioma, ancho, url: '/ajustes/configurar/?modulo=reservas-producto&paso=' + paso }));
    if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
    await p.waitForSelector('[data-axw-sr="' + paso + '"] [data-axw-campo]', { timeout: 5000 }).catch(() => {});
    if (paso === 'alquileres_previos') { await p.check('[data-axw-campo="fuera"][value="si"]'); await p.waitForTimeout(80); }
    await clic(p, 'enviar');   // que también salga el texto de error
    const anchoDoc = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(paso + ' ' + idioma + ' ' + ancho + ': sin scroll horizontal', anchoDoc <= ancho, String(anchoDoc));
    if (idioma !== 'es') {
      const sin = await p.evaluate(() => window.__sinTrad.filter(s => !/^(IDR|EUR|USD|km|NPWP|—|×|−|\+|[A-Z]{2} \d+ [A-Z]+)$/.test(s)));
      ok(paso + ' ' + idioma + ' ' + ancho + ': ninguna frase sin traducir', sin.length === 0, [...new Set(sin)].slice(0, 5).join(' | '));
    }
    const desc = await p.evaluate(() => window.AXW_SETUP.desconocidos.slice());
    ok(paso + ' ' + idioma + ' ' + ancho + ': ningún código sin frase', desc.length === 0, desc.join(', '));
    if (SHOT && (ancho === 390 || idioma === 'es')) await p.screenshot({ path: path.join(SHOT, paso + '_' + idioma + '_' + ancho + '.png'), fullPage: true });
    await ctx.close();
  }

  // ── 11. Todos los códigos de error del contrato tienen frase (es/en/id) ──────────────────────────────────────────────────────────────────
  ({ p, ctx } = await abre(nav, base(), { idioma: 'id' }));
  const CODIGOS = ['sin_herramienta', 'cuenta_pruebas_solo_mira', 'moneda_no_permitida', 'clase_con_unidades', 'unidad_baja', 'previo_fechas', 'regla_fuera', 'reserva_dias_min', 'reserva_dias_max',
                   'reserva_horizonte', 'falta_motivo', 'unidad_ocupada', 'flota_cambio', 'entrega_cambio', 'entrega_incompleta', 'entrega_apaga_primero', 'datos', 'flota_duplicada'];
  // sin frase = el código acaba en `desconocidos` (desde bbm-p31 la pantalla ya no enseña «(código: x)», así que no se busca en el texto)
  const sinFrase = await p.evaluate(cs => cs.filter(h => { window.AXW_SETUP.explica({ code: '22023', hint: h }, true); return window.AXW_SETUP.desconocidos.indexOf('hint:' + h) >= 0; }), CODIGOS);
  ok('cada hint del contrato tiene su frase', sinFrase.length === 0, sinFrase.join(', '));
  const s55 = await p.evaluate(() => window.AXW_SETUP.explica({ code: '55000', hint: 'reservas-producto_sin_configurar' }, true));
  ok('55000 reservas-producto_sin_configurar → enlace al asistente', s55.configurar === 'reservas-producto');
  const faltas = await p.evaluate(() => ['sin_producto', 'previos_sin_revisar'].map(c => window.AXW_SETUP.textoFalta({ codigo: c, campos: [] })));
  ok('las faltas nuevas tienen frase en indonesio', faltas.every(t => t && !/[áéíóúñ¿]/.test(t)) && !(await p.evaluate(() => window.AXW_SETUP.desconocidos.some(d => /^falta:/.test(d)))), faltas.join(' | '));
  await ctx.close();

  await nav.close();
  console.log(fallos ? 'FALLAN ' + fallos : 'TODO BIEN — setup_reservas.harness.cjs');
  process.exit(fallos ? 1 : 0);
})();
