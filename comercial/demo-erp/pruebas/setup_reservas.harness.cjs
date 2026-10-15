// node comercial/demo-erp/pruebas/setup_reservas.harness.cjs [carpeta_capturas]
// Arnés de los pasos de Reservas de producto (S40 clase, S41 alquiler con unidades, S43 reglas, S44 lo ya alquilado, S45 entrega; F3 Entregas 3 y 4,
// bbm-p27-flota-front, 12-oct-2026). asistente_setup.html + ajustes_puesta.js + setup_modulos.js + setup_pasos.js + setup_reservas.js REALES en Chromium,
// con la base SIMULADA a partir del contrato de Backend (erp/plan_f3e3_doble_flota_entrega.json, c8d7a8f6, y sus respuestas del 12-oct) y CON ESTADO:
// lo que se guarda cambia lo que devuelven modulos_setup_estado, reservas_setup_datos, producto_flota_datos y entrega_datos. Mide, por paso: vacío,
// a medias, hecho y error con su motivo; qué se manda y en qué orden; que un fallo a medias no duplica nada al repetir; la duda de una respuesta
// perdida (se relee, nunca se reenvía sola); el mismo componente en Ajustes; quien no configura; 390/1440 sin scroll horizontal; es/en/id sin español;
// y que ningún código de la base se queda sin frase. La base real NO se toca: esto prueba la pantalla contra el contrato, no contra Postgres.
const fs = require('fs');
const visibles = (p, sel) => p.$eval(sel, z => { const vis = e => e.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true });   // lo de un <details> cerrado NO se ve (offsetWidth sí lo contaba)
  const n = new Set(); z.querySelectorAll('input:not([type=hidden]),select,textarea').forEach(e => { if (!vis(e)) return; n.add(e.type === 'radio' ? 'r:' + e.name : e); });
  window.__vis = [...n].map(x => typeof x === 'string' ? x : (x.getAttribute('data-axw-campo') || x.name || x.type)); return n.size; });
const visLista = p => p.evaluate(() => (window.__vis || []).join(','));
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const EXE = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const AQUI = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(AQUI, 'asistente_setup.html'), 'utf8').split('<!--AXW_SCRIPT-->');
const JS = f => fs.readFileSync(path.join(AQUI, f), 'utf8');
// AXW_CSS_DIST=<paquete construido>: la piel de la instancia (tw.css, shell.css, --tema-* de instancia.js y sus letras) para las capturas
// y el contraste, como asistente_setup.harness.cjs (bbm-p41, 13-oct). Sin ella no cambia nada de lo que se mide.
const DIST = process.env.AXW_CSS_DIST || '';
const CSS_PIEL = DIST ? ['tw.css', 'shell.css'].map(f => fs.readFileSync(path.join(DIST, 'assets', f), 'utf8')).join(' ') : '';
const PIEL_VARS = (() => {
  if (!DIST) return '';
  const m = /\bp=(\{[^}]*\});for\(var k in p\)s\.setProperty\("--tema-"\+k/.exec(fs.readFileSync(path.join(DIST, 'contracts', 'assets', 'instancia.js'), 'utf8'));
  return m ? ':root{' + Object.entries(JSON.parse(m[1])).map(([k, v]) => '--tema-' + k + ':' + v).join(';') + '}' : '';
})();
const FUENTES = DIST && fs.existsSync(path.join(DIST, 'assets', 'fonts', 'fonts.css')) ? fs.readFileSync(path.join(DIST, 'assets', 'fonts', 'fonts.css'), 'utf8') : '';
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
    entrega: { ajustes: { activa: false, sede_nombre: null, sede_lat: null, sede_lng: null, km_max: 60, cobra_recogida: null, tope_dia: 200, tope_mes: 3000, cache_dias: 30 }, version: 1, tarifa: null },
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
<style>body{margin:0;font-family:sans-serif}main{padding:16px}.hidden{display:none}[hidden]{display:none!important}</style><style>${CSS_PIEL}</style><style>${FUENTES}${PIEL_VARS}</style></head><body class="${CSS_PIEL ? 'lw-listo bg-background' : ''}">`;
const sesion = (idioma, url) => `<script>
history.replaceState(null, '', '${url}');
window.__sinTrad = []; window.__errores = [];
window.addEventListener('error', function (e) { window.__errores.push(String(e.message)); });
function cadena() { var q = { select: function () { return q; }, eq: function () { return q; }, maybeSingle: function () { return Promise.resolve({ data: null, error: null }); } }; return q; }
var sb = { rpc: function (n, a) { return window.__srv(n, a || {}); }, from: cadena };
window.LW_AUTH = Promise.resolve({ sb: sb });
window.lwDatos = function (n, a) { return sb.rpc(n, a); };
window.LW_EN = {}; window.LW_ID = {}; window.__idioma = '${idioma}';
window.lwLocale = function () { return ({ es: 'es-ES', en: 'en-GB', id: 'id-ID' })[window.__idioma]; };
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
  await p.route('**/*', r => {
    const u = new URL(r.request().url());
    if (DIST && u.pathname.startsWith('/assets/fonts/')) {
      const f = path.join(DIST, u.pathname);
      return fs.existsSync(f) ? r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    }
    return r.fulfill({ status: 200, contentType: 'text/html', body });
  });
  await p.exposeFunction('__srv', async (n, a) => { const r = servidor(b, n, a); if (r && r.red) throw new Error('Failed to fetch'); return r; });
  await p.goto('http://local.test' + (pag === 'ajustes' ? '/ajustes/' : url));
  await p.waitForTimeout(450);
  return { p, ctx };
}
const txt = async (p, sel) => (await p.$(sel)) ? (await p.$eval(sel, e => e.textContent.trim())) : null;
const clic = async (p, accion) => { await p.click('[data-axw-accion="' + accion + '"]'); await p.waitForTimeout(350); };

// S1c: la flota va en 4 partes (AXW_SETUP.partes). Se va a la parte de un campo con el «Atrás»/«Siguiente» DE VERDAD del asistente
const parteVista = p => p.$eval('[data-axw-partes] > [data-axw-parte]:not([hidden])', e => Number(e.getAttribute('data-axw-parte'))).catch(() => 0);
async function aParte(p, k) {
  for (let i = 0; i < 8; i++) { const a = await parteVista(p); if (!a || a === k) return a; await clic(p, a > k ? 'atras' : 'enviar'); }
  return parteVista(p);
}
async function llena(p, campo, v) {
  const sel = '[data-axw-campo="' + campo + '"]';
  const k = await p.$eval(sel, e => { const c = e.closest('[data-axw-parte]'); return c ? Number(c.getAttribute('data-axw-parte')) : 0; });
  if (k) await aParte(p, k);
  const pl = await p.$eval(sel, e => { const d = e.closest('details[data-axw-plegado]'); return d && !d.open ? d.getAttribute('data-axw-plegado') : null; });
  if (pl) await p.click('details[data-axw-plegado="' + pl + '"] > summary');
  await p.fill(sel, v);
}
const pasoActual = p => p.getAttribute('[data-axw-paso]', 'data-axw-paso').catch(() => null);
const llamadas = (b, n) => b.llamadas.filter(x => x[0] === n);
const escrituras = b => b.llamadas.filter(x => !/(_datos|modulos_setup_estado)$/.test(x[0]));
const errorTxt = p => txt(p, '[data-axw-as="error"]');
const sinErroresJs = async (p, n) => ok(n + ': sin errores de página', (await p.evaluate(() => window.__errores)).length === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
// S1c: parte a parte con «Siguiente»; acaba en la 4.ª (fianza), donde el botón ya es «Guardar y seguir»
async function rellenaAlquiler(p, o = {}) {
  await aParte(p, 1);
  await p.fill('[data-axw-campo="nombre"]', o.nombre || 'Honda Vario 125'); await p.fill('[data-axw-campo="tarifa_1"]', '90.000');
  await p.fill('[data-axw-campo="mat_0"]', 'dk 1234 ab'); await p.click('[data-axw-sr-accion="anadir-unidad"]'); await p.fill('[data-axw-campo="mat_1"]', 'DK 5678 CD');
  await clic(p, 'enviar');
  await p.fill('[data-axw-campo="tarifa_7"]', '550.000'); await p.fill('[data-axw-campo="tarifa_30"]', '1.800.000');
  await clic(p, 'enviar');
  await p.fill('[data-axw-campo="seguro_1"]', '30.000'); await p.check('[data-axw-campo="seguro_obligatorio"]');
  await p.click('details[data-axw-plegado="seguro-mas"] > summary'); await p.fill('[data-axw-campo="seguro_30"]', '600.000'); await p.fill('[data-axw-campo="seguro_365"]', '1.800.000');
  await clic(p, 'enviar');
  await p.fill('[data-axw-campo="fianza"]', '1.000.000');
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
  // S1c (owner 15-oct: «1, 2 o 3 campos a rellenar por paso»): 4 partes; en cada una ≤ 3 campos a la vista, «Parte k de m», «Siguiente» hasta la última
  {
    const parteTxt = () => txt(p, '[data-axw-parte]:not([hidden]) [data-axw-parte-de]');
    const boton = () => txt(p, '[data-axw-accion="enviar"]');
    const cuenta = [];
    ok('S1c parte 1: «Parte 1 de 4», nombre + precio del día + la primera matrícula, y el botón dice «Siguiente»', (await parteVista(p)) === 1 && (await parteTxt()) === 'Parte 1 de 4'
       && (await visibles(p, '[data-axw-sr="flota"]')) === 3 && (await visLista(p)) === 'nombre,tarifa_1,mat_0' && (await boton()) === 'Siguiente', (await parteTxt()) + ' · ' + await visLista(p) + ' · ' + await boton());
    if (SHOT) await (await p.$('[data-axw-sr="flota"]')).screenshot({ path: path.join(SHOT, 's1c_flota_p1_1440.png') });
    await p.fill('[data-axw-campo="nombre"]', 'Honda Vario 125'); await p.fill('[data-axw-campo="mat_0"]', 'DK 1234 AB'); await clic(p, 'enviar');
    ok('S1c parte 1 sin precio del día: no sigue, lo dice y no envía', (await parteVista(p)) === 1 && ((await errorTxt(p)) || '').includes('precio por día') && escrituras(b).length === 0, await errorTxt(p));
    await p.fill('[data-axw-campo="tarifa_1"]', '90.000'); await clic(p, 'enviar');
    ok('S1c «Siguiente»: pasa a la parte 2, borra el error y el foco va a su pregunta', (await parteVista(p)) === 2 && !((await errorTxt(p)) || '').trim()
       && await p.evaluate(() => document.activeElement && document.activeElement.matches('[data-axw-parte="2"] h3')), await errorTxt(p));
    cuenta.push(await visibles(p, '[data-axw-sr="flota"]') + ':' + await visLista(p));
    if (SHOT) await (await p.$('[data-axw-sr="flota"]')).screenshot({ path: path.join(SHOT, 's1c_flota_p2_1440.png') });
    await p.fill('[data-axw-campo="tarifa_7"]', '50.000'); await clic(p, 'enviar');
    ok('S1c parte 2: una semana más barata que un día no deja seguir', (await parteVista(p)) === 2 && ((await errorTxt(p)) || '').includes('no puede costar menos'), await errorTxt(p));
    await p.fill('[data-axw-campo="tarifa_7"]', ''); await clic(p, 'enviar');
    cuenta.push(await visibles(p, '[data-axw-sr="flota"]') + ':' + await visLista(p));
    ok('S1c parte 3: el seguro de un día y «toda reserva lleva seguro»; 30 y 365 días plegados', (await parteVista(p)) === 3
       && await p.$eval('details[data-axw-plegado="seguro-mas"]', d => !d.open && !!d.querySelector('[data-axw-campo="seguro_365"]')), cuenta[1]);
    if (SHOT) await (await p.$('[data-axw-sr="flota"]')).screenshot({ path: path.join(SHOT, 's1c_flota_p3_1440.png') });
    await clic(p, 'enviar');
    cuenta.push(await visibles(p, '[data-axw-sr="flota"]') + ':' + await visLista(p));
    ok('S1c parte 4: fianza y «¿fianza también con seguro?»; el botón vuelve a «Guardar y seguir»', (await parteVista(p)) === 4 && (await boton()) === 'Guardar y seguir', cuenta[2] + ' · ' + await boton());
    if (SHOT) await (await p.$('[data-axw-sr="flota"]')).screenshot({ path: path.join(SHOT, 's1c_flota_p4_1440.png') });
    ok('S1c recuento: 2, 2 y 2 campos a la vista en las partes 2, 3 y 4', JSON.stringify(cuenta) === JSON.stringify(['2:tarifa_7,tarifa_30', '2:seguro_1,seguro_obligatorio', '2:fianza,r:axw-sr-fianza_con_seguro']), JSON.stringify(cuenta));
    await clic(p, 'atras');
    ok('S1c «Atrás» del asistente: vuelve a la parte 3, sin salir del paso', (await parteVista(p)) === 3 && (await pasoActual(p)) === 'flota', await pasoActual(p));
    await aParte(p, 4);
    await p.evaluate(() => { document.querySelector('[data-axw-campo="nombre"]').value = ''; });   // lo de una parte anterior que ya no vale
    await clic(p, 'enviar');
    ok('S1c en la última: un error de una parte anterior lleva a esa parte y no envía', (await parteVista(p)) === 1 && ((await errorTxt(p)) || '').includes('nombre del producto') && escrituras(b).length === 0, await errorTxt(p));
  }
  await rellenaAlquiler(p);
  ok('S41 la matrícula se escribe en mayúsculas', (await p.inputValue('[data-axw-campo="mat_0"]')) === 'DK 1234 AB');
  await aParte(p, 1);
  // Diseño S41: tabla «# · Matrícula · Quitar» con la cuenta arriba; quitar una fila renumera (número, etiqueta y clave)
  const nums = () => p.$$eval('[data-axw-sr-filas="unidades"] [data-axw-sr-num]', ls => ls.map(l => l.textContent));
  ok('S41 tabla: filas numeradas y la cuenta arriba', JSON.stringify(await nums()) === '["1","2"]' && (await txt(p, '[data-axw-sr-cuenta="unidades"]')) === '2 unidades', JSON.stringify(await nums()));
  await p.click('[data-axw-sr-accion="anadir-unidad"]'); await p.fill('[data-axw-campo="mat_2"]', 'DK 9999 ZZ');
  await p.click('[data-axw-sr-fila="1"] [data-axw-sr-accion="quitar-unidad"]');
  const claves = await p.$$eval('[data-axw-sr-filas="unidades"] input', ls => ls.map(l => l.getAttribute('data-axw-campo') + '=' + l.value + '@' + document.querySelector('label[for="' + l.id + '"]').textContent));
  ok('S41 quitar una fila renumera: claves seguidas, sin repetir, etiqueta y número al día', JSON.stringify(claves) === JSON.stringify(['mat_0=DK 1234 AB@Matrícula de la unidad 1', 'mat_1=DK 9999 ZZ@Matrícula de la unidad 2']) && JSON.stringify(await nums()) === '["1","2"]' && (await txt(p, '[data-axw-sr-cuenta="unidades"]')) === '2 unidades', JSON.stringify(claves));
  // el fallo exacto: quitar y DESPUÉS añadir. Antes la nueva salía como mat_1 otra vez (clave repetida)
  await p.click('[data-axw-sr-accion="anadir-unidad"]');
  const tras = await p.$$eval('[data-axw-sr-filas="unidades"] input', ls => ls.map(l => l.getAttribute('data-axw-campo')));
  ok('S41 quitar y luego añadir: la nueva es mat_2, sin repetir', JSON.stringify(tras) === '["mat_0","mat_1","mat_2"]', JSON.stringify(tras));
  await p.click('[data-axw-sr-fila="2"] [data-axw-sr-accion="quitar-unidad"]');
  await p.fill('[data-axw-campo="mat_1"]', 'DK 5678 CD');
  await aParte(p, 4); await clic(p, 'enviar'); await p.waitForTimeout(400);
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
  // S1 (owner 15-oct: «1, 2 o 3 campos por paso»): por fila, la moto y la vuelta a la vista; «desde» = hoy y el cliente, plegados
  ok('S1 ya alquilado: 3 campos a la vista (¿alguna fuera?, moto, vuelta)', (await visibles(p, '[data-axw-sr="alquileres_previos"]')) === 3, await visLista(p));
  ok('S1 ya alquilado: «desde» viene puesto a hoy, plegado con el cliente, y el resumen lo dice', (await p.inputValue('[data-axw-campo="pd_0"]')) === hoy(0)
     && await p.$eval('details[data-axw-plegado="previo-0"]', d => !d.open && !!d.querySelector('[data-axw-campo="pc_0"]') && /hoy/.test(d.querySelector('[data-axw-plegado-resumen]').textContent)));
  if (SHOT) await (await p.$('[data-axw-sr="alquileres_previos"]')).screenshot({ path: path.join(SHOT, 's1_previos_1440.png') });
  await p.selectOption('[data-axw-campo="pu_0"]', u1); await p.fill('[data-axw-campo="ph_0"]', hoy(4));
  await p.click('details[data-axw-plegado="previo-0"] > summary'); await p.fill('[data-axw-campo="pd_0"]', hoy(2)); await p.click('details[data-axw-plegado="previo-0"] > summary');
  await clic(p, 'enviar');
  ok('S1 ya alquilado: un «desde» mal puesto abre su plegado (el error no se esconde) y no envía', await p.$eval('details[data-axw-plegado="previo-0"]', d => d.open) && llamadas(b, 'reservas_previas_guarda').length === 0, await errorTxt(p));
  await p.fill('[data-axw-campo="pd_0"]', hoy(-3)); await p.fill('[data-axw-campo="ph_0"]', hoy(0));
  await clic(p, 'enviar');
  ok('S44 vuelta hoy: lo dice antes de enviar', ((await errorTxt(p)) || '').includes('después de hoy') && llamadas(b, 'reservas_previas_guarda').length === 0);
  await p.fill('[data-axw-campo="ph_0"]', hoy(5)); await p.fill('[data-axw-campo="pc_0"]', 'Ana López'); await p.waitForTimeout(100);
  const vueltaTxt = new Date(hoy(5) + 'T00:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });   // «18 oct», como el diseño
  ok('S44 recuadros: 1 fuera, 1 libre, vuelve ' + vueltaTxt, ((await txt(p, '[data-axw-sr-tiles]')) || '').replace(/\s+/g, '').includes('Fueraahora1Libreshoy1Próximavuelta' + vueltaTxt.replace(/\s+/g, '')), await txt(p, '[data-axw-sr-tiles]'));
  ok('S44: la fila de un alquiler lleva su margen interior (p-3 no está compilado en la instancia)', (await p.$eval('[data-axw-sr-fila]', e => getComputedStyle(e).paddingTop)) === '12px');
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
  ok('S1c a medias: se sigue en la última parte (la de «Guardar y seguir»)', (await parteVista(p)) === 4, String(await parteVista(p)));
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
  await p.fill('[data-axw-campo="tarifa_1"]', '95.000'); await aParte(p, 4);
  ok('S1c editar: la parte 4 lleva también el motivo (3 campos a la vista)', (await visibles(p, '[data-axw-sr="flota"]')) === 3 && (await visLista(p)).endsWith('sr_motivo'), await visLista(p));
  await clic(p, 'enviar');
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
  {
    const ya = await p.$$eval('[data-axw-sr-ya]', ls => ls.map(l => l.textContent));
    const nya = ya.length;
    await p.click('[data-axw-sr-accion="anadir-unidad"]');
    const num0 = await txt(p, '[data-axw-sr-fila="0"] [data-axw-sr-num]');
    ok('S41 con unidades: las de antes, numeradas en la tabla; la nueva sigue la cuenta', nya > 0 && ya[0].startsWith('1') && num0 === String(nya + 1)
       && (await txt(p, '[data-axw-sr-cuenta="unidades"]')) === (nya + 1) + ' unidades', JSON.stringify(ya) + ' ' + num0);
  }
  await p.fill('[data-axw-campo="mat_0"]', 'DK 4444 DD'); await aParte(p, 4); await clic(p, 'enviar'); await p.waitForTimeout(400);
  const lt = llamadas(b, 'producto_unidades_alta_lote')[0];
  ok('S41 añadir unidades a lo existente: solo el lote, con «Añadido desde el asistente»', escrituras(b).length === 1 && lt && lt[1].p_motivo === 'Añadido desde el asistente de configuración' && JSON.stringify(lt[1].p_identificadores) === '["DK 4444 DD"]', JSON.stringify(escrituras(b)));
  await ctx.close();
  // respuesta perdida al CAMBIAR el nombre (después de guardar): se relee, se reconoce por el nombre y la cadena sigue
  b = base({ conProducto: true, pierde: { producto_guarda: 'despues' } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=flota' }));
  await clic(p, 'cambiar'); await p.waitForSelector('[data-axw-sr="flota"] [data-axw-campo="nombre"]');
  await p.fill('[data-axw-campo="nombre"]', 'Honda Scoopy 2024'); await llena(p, 'tarifa_7', '500.000');
  await llena(p, 'sr_motivo', 'Nombre del modelo nuevo'); await clic(p, 'enviar'); await p.waitForTimeout(600);
  ok('S41 duda al renombrar: se reconoce por el nombre releído y sigue con el tramo', b.productos[0].nombre === 'Honda Scoopy 2024' && llamadas(b, 'producto_guarda').length === 1 && llamadas(b, 'producto_tarifa_guarda').some(x => x[1].p_dias === 7), JSON.stringify(escrituras(b)));
  await ctx.close();
  // conflicto de versión: 40001 flota_cambio
  b = base({ conProducto: true, falla: { 'producto_tarifa_guarda:1': ['40001', 'flota_cambio'] } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=flota' }));
  await clic(p, 'cambiar'); await p.waitForSelector('[data-axw-sr="flota"] [data-axw-campo="nombre"]');
  await p.fill('[data-axw-campo="tarifa_1"]', '95.000'); await llena(p, 'sr_motivo', 'Subida de temporada'); await clic(p, 'enviar'); await p.waitForTimeout(400);
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
  // S1 (owner 15-oct: «1, 2 o 3 campos por paso»): a la vista las 3 reglas que exige la base; antelación y límites del bot bajo «Más reglas»
  if (SHOT) await (await p.$('[data-axw-sr="reglas_reserva"]')).screenshot({ path: path.join(SHOT, 's1_reglas_1440.png') });
  ok('S1 reglas: «Más reglas» cerrado con la antelación y los límites del bot dentro', await p.$eval('details[data-axw-plegado="reglas"]', d => !d.open && !!d.querySelector('[data-axw-campo="horizonte_dias"]') && !!d.querySelector('[data-axw-sr-bot]')));
  ok('S1 reglas: 3 campos a la vista (tiempo sin pagar, alquiler más corto y más largo)', (await visibles(p, '[data-axw-sr="reglas_reserva"]')) === 3, await visLista(p));
  await p.click('details[data-axw-plegado="reglas"] > summary');
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
  await p.click('details[data-axw-plegado="previo-0"] > summary');
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
  // P5 (owner, 15-oct: «mostrando datos poco a poco»): apagada y sin nada guardado, solo el interruptor; a 1440, dos columnas
  const p5a = await p.evaluate(() => { const b = document.querySelector('[data-axw-sr-bloques="entrega"]'), s = document.querySelector('[data-axw-campo="activa"]');
    return { oculto: getComputedStyle(b).display === 'none', exp: s.getAttribute('aria-expanded'), rol: s.getAttribute('role'),
             falta: [...document.querySelectorAll('[data-axw-falta]')].some(e => getComputedStyle(e).display !== 'none'), fig: getComputedStyle(document.querySelector('[data-axw-sr-figura]')).display,
             km: document.querySelector('[data-axw-campo="km_max"]').value }; });
  ok('P5 entrega apagada y vacía (con el km_max 60 que trae la base): solo el interruptor (role=switch, aria-expanded=false); sin bloques, sin «Falta completar» y sin ilustración',
     p5a.oculto && p5a.exp === 'false' && p5a.rol === 'switch' && !p5a.falta && p5a.fig === 'none' && p5a.km === '60', JSON.stringify(p5a));
  const p5l = await p.evaluate(() => { const i = document.querySelector('[data-axw-as="izq"]').getBoundingClientRect(), l = document.querySelector('[data-axw-as="lado"]').getBoundingClientRect();
    return { lado: l.left >= i.right, fig: !!document.querySelector('[data-axw-as="lado"] [data-axw-sr-figura]'), why: !!document.querySelector('[data-axw-as="lado"] .axw-why') }; });   // la ilustración vive a la derecha aunque esté oculta
  ok('P5 1440: dos columnas — a la derecha «para qué sirve» y la ilustración', p5l.lado && p5l.fig && p5l.why, JSON.stringify(p5l));
  if (SHOT) {   // P5: el «después» de la entrega apagada, para compararlo con el «antes» (todo a la vez)
    await p.screenshot({ path: path.join(SHOT, 'p5_entrega_apagada_1440.png'), fullPage: true });
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(SHOT, 'p5_entrega_apagada_390.png'), fullPage: true });
    await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);
  }
  await p.check('[data-axw-campo="activa"]');
  const p5b = await p.evaluate(() => ({ visible: getComputedStyle(document.querySelector('[data-axw-sr-bloques="entrega"]')).display !== 'none',
    exp: document.querySelector('[data-axw-campo="activa"]').getAttribute('aria-expanded'), foco: document.activeElement && document.activeElement.getAttribute('data-axw-campo'),
    n: document.querySelectorAll('[data-axw-sr-bloques="entrega"] h3').length, fig: getComputedStyle(document.querySelector('[data-axw-sr-figura]')).display }));
  ok('P5 al encenderla: tres bloques numerados, la ilustración y el foco en «Sale desde»', p5b.visible && p5b.exp === 'true' && p5b.foco === 'sede_nombre' && p5b.n === 3 && p5b.fig !== 'none', JSON.stringify(p5b));
  await clic(p, 'enviar');
  ok('S45 encender sin datos: dice lo que falta y no envía', ((await errorTxt(p)) || '').includes('hacen falta la tienda') && escrituras(b).length === 0, await errorTxt(p));
  await p.fill('[data-axw-campo="sede_nombre"]', 'Tienda Canggu'); await p.fill('[data-axw-campo="sede_coord"]', '-8.65, 115.13');
  await p.fill('[data-axw-campo="precio_km"]', '5.000'); await p.fill('[data-axw-campo="km_gratis"]', '80'); await p.fill('[data-axw-campo="km_max"]', '80'); await p.fill('[data-axw-campo="minimo"]', '15.000');
  await p.check('[data-axw-campo="cobra_recogida"][value="si"]'); await clic(p, 'enviar');
  ok('S45 km gratis ≥ km máximo: se dice antes de enviar', ((await errorTxt(p)) || '').includes('por debajo de la distancia máxima') && escrituras(b).length === 0, await errorTxt(p));
  await p.fill('[data-axw-campo="km_gratis"]', '3'); await p.waitForTimeout(80);
  ok('S45 la leyenda de la ilustración sigue a lo tecleado, sin precio de ejemplo', ((await txt(p, '[data-axw-sr-figura]')) || '').includes('Gratis · hasta 3 km') && ((await txt(p, '[data-axw-sr-figura]')) || '').includes('Mínimo por trayecto: IDR 15.000'), await txt(p, '[data-axw-sr-figura]'));
  ok('S45: las partes de la leyenda van separadas (gap-x-5 no está compilado en la instancia)', (await p.$eval('figcaption', e => getComputedStyle(e).columnGap)) === '20px');
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
  {   // S1c: la ventana de Ajustes también va de parte en parte con su «Atrás» y su botón principal
    const F = '[data-pm-fila="flota"] ', gtxt = () => txt(p, F + '[data-accion="pm-guardar"]'), nEsc = escrituras(b).length;
    ok('S1c Ajustes: Flota en partes: la 1.ª, el botón dice «Siguiente» y no hay «Atrás»', (await parteVista(p)) === 1 && (await gtxt()) === 'Siguiente' && !(await p.isVisible(F + '[data-accion="pm-atras"]')), await gtxt());
    await p.click(F + '[data-accion="pm-guardar"]'); await p.waitForTimeout(300);
    ok('S1c Ajustes: «Siguiente» pasa a la parte 2, sale «Atrás» y no guarda nada', (await parteVista(p)) === 2 && await p.isVisible(F + '[data-accion="pm-atras"]') && escrituras(b).length === nEsc, String(await parteVista(p)));
    await p.click(F + '[data-accion="pm-atras"]'); await p.waitForTimeout(300);
    ok('S1c Ajustes: «Atrás» vuelve a la parte 1 sin cerrar la ventana', (await parteVista(p)) === 1 && !!(await p.$('dialog[data-pm-ventana="flota"][open]')), String(await parteVista(p)));
    for (let i = 0; i < 3; i++) { await p.click(F + '[data-accion="pm-guardar"]'); await p.waitForTimeout(300); }
    ok('S1c Ajustes: en la última parte el botón vuelve a «Guardar»', (await parteVista(p)) === 4 && (await gtxt()) === 'Guardar' && escrituras(b).length === nEsc, await gtxt());
  }
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
    // flota sin cambios guardaba y pasaba al siguiente: se medía OTRA pantalla. Con una fila nueva y un precio que no vale, se queda aquí
    if (paso === 'flota') { await p.click('[data-axw-sr-accion="anadir-unidad"]'); await p.fill('[data-axw-campo="tarifa_1"]', 'x'); }
    if (paso === 'clase') await p.check('[data-axw-campo="clase"][value="servicio"]');   // «servicio» no avanza: lleva a Productos con su aviso
    if (paso === 'reglas_reserva') await p.fill('[data-axw-campo="dias_min"]', '0');   // type=number: no admite letras; 0 está por debajo del mínimo
    if (paso === 'entrega') { await p.check('[data-axw-campo="activa"]'); await p.fill('[data-axw-campo="precio_km"]', 'x'); }   // P5: los campos salen al encenderla
    await clic(p, 'enviar');   // que también salga el texto de error
    ok(paso + ' ' + idioma + ' ' + ancho + ': se mide esta pantalla (no la siguiente)', !!(await p.$('[data-axw-sr="' + paso + '"]')));
    if (paso === 'flota') ok('S1c flota ' + idioma + ' ' + ancho + ': ≤ 3 campos a la vista en la parte en curso', (await visibles(p, '[data-axw-sr="flota"]')) <= 3, await visLista(p));
    {   // P5: a 390 la explicación va DESPUÉS de los campos; a 1440, a su derecha
      const g = await p.evaluate(() => { const i = document.querySelector('[data-axw-as="izq"]').getBoundingClientRect(), l = document.querySelector('[data-axw-as="lado"]').getBoundingClientRect(); return { iR: i.right, iB: i.bottom, lL: l.left, lT: l.top }; });
      ok(paso + ' ' + idioma + ' ' + ancho + ': ' + (ancho === 390 ? 'la explicación debajo de los campos' : 'dos columnas'), ancho === 390 ? g.lT >= g.iB : g.lL >= g.iR, JSON.stringify(g));
    }
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
