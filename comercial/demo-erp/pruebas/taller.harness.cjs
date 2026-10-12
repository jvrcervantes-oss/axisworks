// node comercial/demo-erp/pruebas/taller.harness.cjs [carpeta_capturas]
// Harness del TALLER POR PASOS (F8 8.T1, 12-oct-2026): taller.html REAL montado en la CÁSCARA REAL de /asistente/ de Lawang (su <aside>, <header> y <main>, con
// tw.css y shell.css de verdad; sin sus scripts, que necesitan sesión), igual que hace build.py (_pantalla_bot), y servido desde un origen https:// FALSO por
// page.route: así la recarga, el Atrás del navegador, el modo sin red (setOffline) y una respuesta cortada a mitad miden algo de verdad.
// Detrás de la red, una base y una edge SIMULADAS en Node que respetan el contrato de la migración 20261011170000 (funciones taller_*, forma de la respuesta,
// errcode y hint) y de la edge taller-fotos (multipart, hints, 429 con reintenta_en, Origin). El estado vive en Node: lo ven la recarga y el segundo usuario.
// Mide: 390x844 y 1440, id y en, barras de scroll visibles (sin --hide-scrollbars), detector __sinId con el diccionario real (i18n_id.json + los que fusiona la
// pantalla), latencia 1,5 s con doble toque (una sola orden), sin red en cada paso (no avanza), respuesta cortada tras escribir y reintento (no duplica),
// goBack() y recarga a mitad (retoma en el paso de la BASE), JPEG grande con GPS (lo subido es webp o jpeg, <= 600 KB, sin Exif) y la rama JPEG (Safari), 429,
// XSS en matrícula, modelo, revisión y nota, retomar desde otro usuario, orden_vieja_viva, setup sin hacer y el hint taller_sin_configurar.
// NO prueba: la cámara de verdad ni un móvil de verdad (los hará una persona), ni Postgres (eso es erp/pruebas/f8_taller_pasos.sql), ni la edge real (Deno).
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const DEMO = path.join(__dirname, '..');
const LAWANG = process.env.AXW_LAWANG_RAIZ || path.join(__dirname, '..', '..', '..', '..', 'Lawang');
const CAPT = process.argv[2] || null;
const ORIGEN = 'https://erp.test';
const lee = f => fs.readFileSync(f, 'utf8');

// ── la página, montada como build.py:_pantalla_bot (+ _inyecta_comun) ──
function montaPagina() {
  let t = lee(path.join(LAWANG, 'intranet', 'v4', 'asistente', 'index.html'));
  const [m0, s0] = lee(path.join(DEMO, 'taller.html')).split('<!--AXW_SCRIPT-->');
  const pega = s => s.split('/*AXW_COMUN_CSS*/').join(lee(path.join(DEMO, '_compartido', 'pantalla_comun.css')).trim())
                     .split('/*AXW_COMUN_JS*/').join(lee(path.join(DEMO, '_compartido', 'pantalla_comun.js')).trim())
                     .split('/*AXW_FOTOS_JS*/').join(lee(path.join(DEMO, '_compartido', 'fotos_guiadas.js')).trim());
  const ancla = '<div class="flex flex-col w-full gap-8">', cierre = '</div>\n</main></div>\n<script>';
  const i0 = t.indexOf(ancla), i1 = t.indexOf(cierre);
  if (i0 < 0 || i1 < 0) throw new Error('la cáscara de /asistente/ de Lawang ya no tiene la forma esperada');
  t = t.slice(0, i0) + pega(m0.trim()) + '\n</main></div>\n' + pega(s0.trim()) + '\n</body></html>\n';
  t = t.replace(/<script\b[^>]*\bsrc=[^>]*>\s*<\/script>/g, '');                 // los scripts de la cáscara piden sesión: fuera (los suple STUB)
  t = t.replace('<aside class="fixed', '<aside class="lw-aside fixed').replace('<header class="fixed top-0', '<header class="lw-topbar fixed top-0');   // lo que pone maqueta.js
  return t.replace('<head>', '<head><script>__STUB__</script>');
}
const PAGINA = montaPagina();
const I18N_ID = lee(path.join(DEMO, 'i18n_id.json'));
function stub(idioma, usuario, ficha) {
  return `
window.__sinId = []; window.__errores = []; window.__xss = undefined;
window.onerror = function (m) { window.__errores.push(String(m)); };
window.LW_IDIOMA = ${JSON.stringify(idioma)};
window.LW_EN = {}; window.LW_ID = ${I18N_ID};
var tiene = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
var sinTexto = function (s) { return /^[\\s\\d.,:;%()\\[\\]\\/+\\-–—·…×#*'"«»<>=?!¡¿€$Rp✓✕]*$/.test(s) || /^[A-Z0-9_\\-]{1,6}$/.test(s); };
window.lwT = function (s) { if (s == null) return s; s = String(s); var d = window.LW_IDIOMA === 'id' ? window.LW_ID : (window.LW_IDIOMA === 'en' ? window.LW_EN : null);
  if (d) { if (tiene(d, s)) return d[s]; if (!sinTexto(s)) window.__sinId.push(s); } return s; };
window.lwLocale = function () { return window.LW_IDIOMA === 'id' ? 'id-ID' : (window.LW_IDIOMA === 'en' ? 'en-GB' : 'es-ES'); };
window.lwIdiomaAplicar = function (r) { (r || document).querySelectorAll('[data-lwt]').forEach(function (el) { var k = el.getAttribute('data-lwt') || el.textContent.trim(); el.setAttribute('data-lwt', k); el.textContent = window.lwT(k); }); };
window.LW_SB_KEY = 'clave-publicable';
window.lwEdge = function (n) { return '${ORIGEN}/functions/v1/' + n; };
var TOK = 'tok-' + ${JSON.stringify(usuario)};
var sb = {
  rpc: function (n, a) {
    return fetch('${ORIGEN}/rest/v1/rpc/' + n, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOK }, body: JSON.stringify(a || {}) })
      .then(function (r) { return r.json().then(function (j) { return r.ok ? { data: j, error: null } : { data: null, error: j }; }); },
            function (e) { return { data: null, error: { message: 'TypeError: Failed to fetch', details: String(e), hint: '', code: '' } }; });
  },
  from: function () { window.__errores.push('from'); throw new Error('el navegador no toca la base'); },
  auth: { getSession: function () { return Promise.resolve({ data: { session: { access_token: TOK } } }); } }
};
window.lwDatos = function (n, a) { return sb.rpc(n, a); };
window.LW_AUTH = Promise.resolve({ sb: sb, ficha: ${JSON.stringify(ficha)} });
document.addEventListener('DOMContentLoaded', function () { document.body.classList.add('lw-listo'); });   // lo que pone nav.js al terminar: sin ella shell.css esconde <main> 12 s`;
}

// ── la base simulada (contrato de 20261011170000) ──
const U = { m1: '11111111-1111-4111-8111-111111111111', m2: '22222222-2222-4222-8222-222222222222', m3: '33333333-3333-4333-8333-333333333333',
            m4: '44444444-4444-4444-8444-444444444444', m5: '55555555-5555-4555-8555-555555555555' };
const P1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const XSS_MAT = `DK 9 <img src=x onerror="window.__xss=1"> 'q'`, XSS_MOD = `Vario <svg onload="window.__xss=2">`, XSS_REV = `<b>Oli</b> "x" <img src=x onerror="window.__xss=3">`;
let nid = 0; const uuid = () => { nid++; const h = nid.toString(16).padStart(12, '0'); return `bbbbbbbb-0000-4000-8000-${h}`; };
function nuevaBase(o = {}) {
  const B = { o, llamadas: [], subidas: [], latencia: 0, cortaTras: null, setup: o.setup || null, abreSinConfigurar: false, tope429: 0, seq: 3,
    motos: [{ id: U.m1, numero_unidad: 'UND-1', identificador: 'DK 1234 AB', producto_id: P1, estado: 'taller' },
            { id: U.m2, numero_unidad: 'UND-2', identificador: XSS_MAT, producto_id: P1, estado: 'disponible' },
            { id: U.m3, numero_unidad: 'UND-3', identificador: 'DK 5555 CC', producto_id: P1, estado: 'disponible' },
            { id: U.m4, numero_unidad: 'UND-4', identificador: 'DK 7777 DD', producto_id: P1, estado: 'taller' },
            { id: U.m5, numero_unidad: 'UND-5', identificador: 'DK 8888 EE', producto_id: P1, estado: 'taller' }],
    productos: [{ id: P1, nombre: XSS_MOD }],
    ordenes: [{ id: uuid(), numero: 'OT-00001', unidad_id: U.m1, estado: 'cerrada', paso: null, km: 5000, gasolina: 2, motivo_tipo: null, resultado: null, abierta_por: 'admin', abierta_en: 1, cerrada_en: 1, adopto_unidad: false, movio_unidad: true },
              { id: uuid(), numero: 'OT-00003', unidad_id: U.m4, estado: 'abierta', paso: null, km: null, gasolina: null, motivo_tipo: null, resultado: null, abierta_por: 'admin', abierta_en: 2 },
              { id: uuid(), numero: 'OT-00002', unidad_id: U.m5, estado: 'abierta', paso: null, km: null, gasolina: null, motivo_tipo: null, resultado: null, abierta_por: 'admin', abierta_en: 3, oculta: true }],
    revs: [{ id: uuid(), producto_id: null, clave: 'neumaticos', nombre_id: 'Ban', nombre_en: 'Tyres', orden: 10, activa: true },
           { id: uuid(), producto_id: null, clave: 'aceite', nombre_id: XSS_REV, nombre_en: XSS_REV, orden: 20, activa: true },
           { id: uuid(), producto_id: P1, clave: 'cadena', nombre_id: 'Rantai', nombre_en: 'Chain', orden: 30, activa: true }],
    respuestas: [], fotos: [], recambios: [], vinculos: [] };
  return B;
}
const ERR = (code, message, hint, details) => ({ st: code === 'P0002' ? 404 : (code === '42501' ? 403 : 400), j: { code, message, hint: hint || null, details: details || null } });
const esAdmin = u => u === 'admin';
const correo = u => u + '@taller.test';
function faltan(B, o) {
  const f = [];
  ['frente', 'atras', 'izquierda', 'derecha', 'cuentakm'].forEach(r => { if (!B.fotos.some(x => x.orden_id === o.id && x.ranura === r && x.estado === 'confirmada')) f.push('foto:' + r); });
  const prod = B.motos.find(m => m.id === o.unidad_id).producto_id;
  const revs = B.revs.filter(r => r.activa && (!r.producto_id || r.producto_id === prod));
  revs.forEach(r => { if (!B.respuestas.some(a => a.orden_id === o.id && a.revision_id === r.id)) f.push('sin_contestar:' + r.clave); });
  revs.forEach(r => { const a = B.respuestas.find(a => a.orden_id === o.id && a.revision_id === r.id); if (a && a.resultado === 'mal') f.push('mal:' + r.clave); });
  return f;
}
function viva(B, id, u) {
  const o = B.ordenes.find(x => x.id === id);
  if (!o) return { e: ERR('P0002', 'Esa orden no existe: recarga la pantalla', 'orden_no_existe') };
  if (o.estado === 'cerrada') return { e: (esAdmin(u) || o.abierta_por === u) ? ERR('22023', 'Esa orden ya está cerrada', 'ya_cerrada') : ERR('P0002', 'Esa orden no existe: recarga la pantalla', 'orden_no_existe') };
  if (!o.paso) return { e: ERR('22023', 'Esa orden se abrió en la pantalla anterior de Taller: ciérrala allí', 'orden_vieja') };
  return { o };
}
const ultimoKm = (B, unidad, excl) => { const l = B.ordenes.filter(o => o.unidad_id === unidad && o.id !== excl && o.km != null).sort((a, b) => b.abierta_en - a.abierta_en); return l.length ? l[0].km : null; };
function rpc(B, n, a, u) {
  B.llamadas.push([n, JSON.parse(JSON.stringify(a)), u]);
  if (B.o.datosFalla && n === 'taller_datos') return ERR('42501', 'No tienes acceso a Taller', 'sin_acceso');
  const vivaDe = m => B.ordenes.find(o => o.unidad_id === m && o.estado !== 'cerrada');
  switch (n) {
    case 'taller_datos': {
      const motos = B.motos.filter(m => m.estado !== 'baja').map(m => { const v = vivaDe(m.id); const p = B.productos.find(x => x.id === m.producto_id);
        return { id: m.id, numero: m.numero_unidad, identificador: m.identificador, modelo_id: m.producto_id, modelo: p.nombre, estado: m.estado,
                 orden_viva: v && !v.oculta ? { id: v.id, numero: v.numero, paso: v.paso, estado: v.estado, abierta_por_email: correo(v.abierta_por) } : null }; });
      const vivas = B.ordenes.filter(o => o.estado !== 'cerrada' && !o.oculta).map(o => { const m = B.motos.find(x => x.id === o.unidad_id);
        return { id: o.id, numero: o.numero, unidad_id: o.unidad_id, identificador: m.identificador, modelo: XSS_MOD, paso: o.paso, estado: o.estado, motivo_tipo: o.motivo_tipo, abierta_por_email: correo(o.abierta_por) }; });
      const volver = esAdmin(u) ? B.motos.filter(m => m.estado === 'taller' && !vivaDe(m.id)).map(m => ({ m, ult: B.ordenes.filter(o => o.unidad_id === m.id && o.estado === 'cerrada').sort((x, y) => y.cerrada_en - x.cerrada_en)[0] }))
        .filter(x => x.ult && x.ult.resultado === 'lista' && x.ult.adopto_unidad).map(x => ({ id: x.m.id, numero: x.m.numero_unidad, identificador: x.m.identificador, modelo: XSS_MOD, orden_id: x.ult.id, orden_numero: x.ult.numero, cerrada_por_email: correo(x.ult.cerrada_por) })) : [];
      const r = { motos, vivas, para_volver: volver, recortadas: false };
      if (B.setup) r.setup = B.setup;
      return { st: 200, j: r };
    }
    case 'taller_orden_abre': {
      if (B.abreSinConfigurar || (B.setup && B.setup.listo === false)) return ERR('22023', 'El taller no está configurado', 'taller_sin_configurar');
      if (!['devolucion', 'revision', 'averia', 'accidente'].includes(a.p_motivo_tipo)) return ERR('22023', 'Elige el motivo', 'motivo_tipo');
      const m = B.motos.find(x => x.id === a.p_unidad);
      if (!m) return ERR('P0002', 'Esa moto no existe: recarga la pantalla', 'moto_no_existe');
      const v = vivaDe(m.id);
      if (v) {
        if (!v.paso) return ERR('22023', `Esa moto tiene la orden ${v.numero} abierta desde la pantalla anterior de Taller: ciérrala allí antes de usar el asistente`, 'orden_vieja_viva');
        if (v.estado === 'espera_recambio') { v.estado = 'abierta'; v.resultado = null; }
        return { st: 200, j: { id: v.id, numero: v.numero, retomada: true, estado: 'abierta', paso: v.paso, motivo_tipo: v.motivo_tipo, unidad_estado: m.estado, adopta: v.adopto_unidad } };
      }
      if (m.id === U.m3) return ERR('22023', 'Esa moto tiene 1 reserva(s) pendientes: cámbialas de moto antes de pasarla a taller', 'reservas_vivas', JSON.stringify([{ id: 'r', numero: 'RP-<b>9', estado: 'confirmada', desde: '2026-12-01', hasta: '2026-12-03' }]));
      const o = { id: uuid(), numero: 'OT-' + String(++B.seq).padStart(5, '0'), unidad_id: m.id, estado: 'abierta', paso: 'km', km: null, gasolina: null, motivo_tipo: a.p_motivo_tipo, motivo: a.p_nota,
                  resultado: null, abierta_por: u, abierta_en: Date.now(), adopto_unidad: m.estado === 'taller', movio_unidad: true };
      B.ordenes.push(o);
      if (m.estado === 'disponible') m.estado = 'taller';
      return { st: 200, j: { id: o.id, numero: o.numero, retomada: false, estado: 'abierta', paso: 'km', motivo_tipo: o.motivo_tipo, unidad_estado: m.estado, adopta: o.adopto_unidad } };
    }
    case 'taller_orden_datos': {
      const o = B.ordenes.find(x => x.id === a.p_orden);
      if (!o) return ERR('P0002', 'Esa orden no existe: recarga la pantalla', 'orden_no_existe');
      const m = B.motos.find(x => x.id === o.unidad_id);
      const revs = B.revs.filter(r => r.activa && (!r.producto_id || r.producto_id === m.producto_id)).sort((x, y) => x.orden - y.orden).map(r => { const x = B.respuestas.find(z => z.orden_id === o.id && z.revision_id === r.id);
        return { id: r.id, clave: r.clave, nombre_id: r.nombre_id, nombre_en: r.nombre_en, orden: r.orden, comun: !r.producto_id, resultado: x ? x.resultado : null, nota: x ? x.nota : null }; });
      return { st: 200, j: { orden: { id: o.id, numero: o.numero, unidad_id: o.unidad_id, motivo_tipo: o.motivo_tipo, motivo: o.motivo, km: o.km, gasolina: o.gasolina, paso: o.paso, estado: o.estado, resultado: o.resultado,
        adopto_unidad: o.adopto_unidad, abierta_por_email: correo(o.abierta_por), nota_cierre: o.nota_cierre || null },
        moto: { id: m.id, numero: m.numero_unidad, identificador: m.identificador, modelo_id: m.producto_id, modelo: XSS_MOD, estado: m.estado }, ultimo_km: ultimoKm(B, m.id, o.id),
        fotos: B.fotos.filter(f => f.orden_id === o.id && ['pendiente', 'confirmada'].includes(f.estado)).map(f => ({ id: f.id, ranura: f.ranura, estado: f.estado })), revisiones: revs, faltan: faltan(B, o) } };
    }
    case 'taller_orden_km': {
      if (!Number.isInteger(a.p_km) || a.p_km < 0 || a.p_km > 2000000) return ERR('22023', 'Los km van en número entero', 'km');
      if (!Number.isInteger(a.p_gasolina) || a.p_gasolina < 0 || a.p_gasolina > 4) return ERR('22023', 'La gasolina va de 0 a 4', 'gasolina');
      const { o, e } = viva(B, a.p_orden, u); if (e) return e;
      const ult = ultimoKm(B, o.unidad_id, o.id);
      if (ult != null && a.p_km < ult && !a.p_confirma) return ERR('22023', `Los km (${a.p_km}) son menos que los últimos apuntados para esta moto (${ult})`, 'km_menor', JSON.stringify({ ultimo_km: ult }));
      o.km = a.p_km; o.gasolina = a.p_gasolina; if (o.paso === 'km') o.paso = 'fotos';
      return { st: 200, j: { paso: o.paso, ultimo_km: ult } };
    }
    case 'taller_orden_paso': {
      if (!['km', 'fotos', 'revisiones', 'resultado'].includes(a.p_paso)) return ERR('22023', 'Paso desconocido', 'paso');
      const { o, e } = viva(B, a.p_orden, u); if (e) return e;
      o.paso = a.p_paso; return { st: 200, j: { paso: a.p_paso } };
    }
    case 'taller_revision_marca': {
      if (!['bien', 'atencion', 'mal'].includes(a.p_resultado)) return ERR('22023', 'El resultado es bien, atención o mal', 'resultado');
      const { o, e } = viva(B, a.p_orden, u); if (e) return e;
      const r = B.revs.find(x => x.id === a.p_revision);
      if (!r) return ERR('22023', 'Esa revisión no es de este modelo', 'revision_ajena');
      const x = B.respuestas.find(z => z.orden_id === o.id && z.revision_id === r.id);
      if (x) { x.resultado = a.p_resultado; x.nota = a.p_nota; x.autor = u; } else B.respuestas.push({ orden_id: o.id, revision_id: r.id, resultado: a.p_resultado, nota: a.p_nota, autor: u });
      return { st: 200, j: { revision_id: r.id, resultado: a.p_resultado } };
    }
    case 'taller_orden_resultado': {
      if (!['lista', 'espera_recambio', 'fuera_servicio'].includes(a.p_resultado)) return ERR('22023', 'El resultado es lista, espera o fuera', 'resultado');
      if (a.p_motivo_excepcion && !esAdmin(u)) return ERR('42501', 'Solo la administración', 'excepcion_solo_admin');
      const { o, e } = viva(B, a.p_orden, u); if (e) return e;
      const m = B.motos.find(x => x.id === o.unidad_id);
      if (a.p_resultado === 'espera_recambio') { o.estado = 'espera_recambio'; o.resultado = 'espera_recambio'; o.nota_cierre = a.p_nota; o.paso = 'resultado';
        return { st: 200, j: { numero: o.numero, estado: 'espera_recambio', resultado: 'espera_recambio', unidad_estado: m.estado, para_volver: false } }; }
      const f = faltan(B, o);
      if (a.p_resultado === 'lista' && f.length && !a.p_motivo_excepcion) return ERR('22023', 'Para dejarla lista faltan: ' + f.join(', '), 'faltan_para_lista', JSON.stringify(f));
      Object.assign(o, { estado: 'cerrada', resultado: a.p_resultado, cerrada_por: u, cerrada_en: Date.now(), nota_cierre: a.p_nota, paso: 'resultado' });
      if (a.p_resultado === 'lista' && !o.adopto_unidad && m.estado === 'taller') m.estado = 'disponible';
      return { st: 200, j: { numero: o.numero, estado: 'cerrada', resultado: a.p_resultado, unidad_estado: m.estado, para_volver: a.p_resultado === 'lista' && o.adopto_unidad && m.estado === 'taller' } };
    }
    case 'taller_moto_devuelve': {
      if (!esAdmin(u)) return ERR('42501', 'Devolver motos a disponible lo hace la administración', 'solo_admin');
      const dev = [], rech = [];
      (a.p_unidades || []).forEach(id => { const m = B.motos.find(x => x.id === id); if (!m) return rech.push({ id, porque: 'no_existe' }); if (m.estado !== 'taller') return rech.push({ id, porque: 'no_esta_en_taller' }); m.estado = 'disponible'; dev.push(id); });
      return { st: 200, j: { devueltas: dev, rechazadas: rech } };
    }
    case 'taller_listas_datos': {
      if (!esAdmin(u)) return ERR('42501', 'Las listas por modelo las cambia la administración con acceso a Flota', 'sin_acceso_listas');
      const p = a.p_producto || null;
      return { st: 200, j: { producto_id: p, revisiones: B.revs.filter(r => (r.producto_id || null) === p).map(r => Object.assign({}, r)), recambios: B.vinculos.filter(v => v.producto_id === p).map(v => { const r = B.recambios.find(x => x.id === v.recambio_id); return Object.assign({ vinculo_id: v.id, recambio_id: r.id, revision_id: v.revision_id }, r); }),
        catalogo: B.recambios.map(r => Object.assign({}, r)), modelos: B.productos.map(x => ({ id: x.id, nombre: x.nombre, revisiones: B.revs.filter(r => r.producto_id === x.id).length, recambios: 0 })), recortado: false } };
    }
    case 'taller_revision_guarda': {
      if (!esAdmin(u)) return ERR('42501', 'x', 'sin_acceso_listas');
      const d = a.p_datos || {};
      if (a.p_id) { const r = B.revs.find(x => x.id === a.p_id); Object.assign(r, d); return { st: 200, j: r.id }; }
      if (B.revs.some(r => (r.producto_id || null) === (d.producto_id || null) && r.clave === d.clave)) return ERR('23505', 'Ya hay una revisión con esa clave', 'clave_duplicada');
      const r = Object.assign({ id: uuid(), orden: 100, activa: true }, d); B.revs.push(r); return { st: 200, j: r.id };
    }
    case 'taller_lista_basica': return { st: 200, j: 9 };
    case 'taller_listas_copia': return { st: 200, j: { revisiones: 0, vinculos: 0 } };
    case 'taller_recambio_guarda': { const r = Object.assign({ id: uuid(), activa: true }, a.p_datos); B.recambios.push(r); return { st: 200, j: r.id }; }
    case 'taller_recambio_vincula': { if (a.p_quita) { B.vinculos = B.vinculos.filter(v => !(v.recambio_id === a.p_recambio && v.producto_id === a.p_producto)); return { st: 200, j: { quitado: true } }; }
      B.vinculos.push({ id: uuid(), recambio_id: a.p_recambio, producto_id: a.p_producto, revision_id: a.p_revision }); return { st: 200, j: { id: 'v' } }; }
  }
  return ERR('PGRST202', 'Could not find the function public.' + n + ' in the schema cache');
}

// ── la edge simulada (contrato de erp/funciones/taller-fotos, cabecera de ebaab585) ──
function multipart(buf, ct) {
  const b = Buffer.from('--' + /boundary=([^;]+)/.exec(ct)[1]);
  const partes = {}; let i = buf.indexOf(b);
  while (i >= 0) {
    const j = buf.indexOf(b, i + b.length); if (j < 0) break;
    const parte = buf.slice(i + b.length + 2, j - 2), sep = parte.indexOf('\r\n\r\n');
    const cab = parte.slice(0, sep).toString(), nombre = /name="([^"]+)"/.exec(cab)[1];
    partes[nombre] = /filename=/.test(cab) ? parte.slice(sep + 4) : parte.slice(sep + 4).toString();
    i = j;
  }
  return partes;
}
function tipoBytes(f) {
  if (f[0] === 0xFF && f[1] === 0xD8) { let k = 2; while (k < f.length - 4 && f[k] === 0xFF) { const mk = f[k + 1]; if (mk === 0xE1) return 'jpeg-exif'; if (mk === 0xDA) break; k += 2 + f.readUInt16BE(k + 2); } return f.includes(Buffer.from('Exif')) ? 'jpeg-exif' : 'image/jpeg'; }
  if (f.slice(0, 4).toString() === 'RIFF' && f.slice(8, 12).toString() === 'WEBP') return f.includes(Buffer.from('EXIF')) || f.includes(Buffer.from('XMP ')) ? 'webp-exif' : 'image/webp';
  return 'otro';
}
function edge(B, req) {
  const h = req.headers();
  if (h.origin !== ORIGEN) return { st: 403, j: { ok: false, hint: 'origen' } };
  const u = (/^Bearer tok-(\w+)$/.exec(h.authorization || '') || [])[1];
  if (!u) return { st: 401, j: { ok: false, hint: 'sin_sesion' } };
  if (/application\/json/.test(h['content-type'] || '')) {
    const d = JSON.parse(req.postData() || '{}'), f = B.fotos.find(x => x.id === d.foto);
    return f ? { st: 200, j: { ok: true, url: 'https://erp.test/almacen/' + f.id } } : { st: 404, j: { ok: false, hint: 'foto_no_existe' } };
  }
  const p = multipart(req.postDataBuffer(), h['content-type']);
  const campos = Object.keys(p).sort().join(',');
  if (campos !== 'accion,clave,fichero,orden,ranura') return { st: 400, j: { ok: false, hint: 'campo_no_admitido' } };
  const t = tipoBytes(p.fichero);
  B.subidas.push({ ranura: p.ranura, tipo: t, bytes: p.fichero.length, clave: p.clave, u });
  if (B.tope429 > 0) { B.tope429--; return { st: 429, j: { ok: false, hint: 'tope_minuto', reintenta_en: 1 } }; }
  if (p.fichero.length > 614400) return { st: 413, j: { ok: false, hint: 'fichero_grande' } };
  if (/exif/.test(t)) return { st: 415, j: { ok: false, hint: 'fichero_exif' } };
  if (t === 'otro') return { st: 415, j: { ok: false, hint: 'fichero_tipo' } };
  const { o, e } = viva(B, p.orden, u); if (e) return { st: 409, j: { ok: false, hint: e.j.hint } };
  let f = B.fotos.find(x => x.clave === p.clave);
  if (!f) { if (p.ranura !== 'dano') B.fotos.filter(x => x.orden_id === o.id && x.ranura === p.ranura && x.estado === 'confirmada').forEach(x => { x.estado = 'sustituida'; });
    f = { id: uuid(), orden_id: o.id, ranura: p.ranura, clave: p.clave, estado: 'confirmada', tipo: t }; B.fotos.push(f); }
  return { st: 200, j: { ok: true, foto_id: f.id, ranura: f.ranura, estado: 'confirmada' } };
}

// ── el navegador ──
let fallos = 0, casos = 0;
const ok = (nombre, c, extra = '') => { casos++; if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' -> ' + String(extra).slice(0, 300) : '')); } else console.log('ok     ' + nombre); };
const duerme = ms => new Promise(r => setTimeout(r, ms));
const FICHAS = { mec1: { rol: 'agente', herramientas: ['taller'] }, mec2: { rol: 'agente', herramientas: ['taller'] }, admin: { rol: 'admin', herramientas: ['taller', 'flota'] } };

(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, ignoreDefaultArgs: ['--hide-scrollbars'] });   // barras de scroll visibles
  async function abre(B, { usuario = 'mec1', idioma = 'id', ancho = 390, alto = 844, hash = '' } = {}) {
    const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
    await ctx.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin !== ORIGEN) return route.abort();
      // setOffline no corta lo que intercepta page.route (medido 12-oct): la ruta respeta el modo sin red del contexto
      if (ctx.__sinRed) return route.abort('internetdisconnected');
      if (url.pathname === '/intranet/v4/taller/') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: PAGINA.replace('__STUB__', () => stub(idioma, usuario, FICHAS[usuario])) });
      const rp = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(url.pathname);
      if (rp) {
        if (B.latencia) await duerme(B.latencia);
        const u = (/^Bearer tok-(\w+)$/.exec(req.headers().authorization || '') || [])[1];
        const r = rpc(B, rp[1], JSON.parse(req.postData() || '{}'), u);
        if (B.cortaTras === rp[1]) { B.cortaTras = null; return route.abort('connectionreset'); }   // la base ESCRIBIÓ y la respuesta se pierde
        return route.fulfill({ status: r.st, contentType: 'application/json', body: JSON.stringify(r.j) });
      }
      if (url.pathname === '/functions/v1/taller-fotos') { const r = edge(B, req); return route.fulfill({ status: r.st, contentType: 'application/json', headers: { 'access-control-allow-origin': ORIGEN, vary: 'Origin' }, body: JSON.stringify(r.j) }); }
      const f = /^\/(intranet\/v4\/assets|contracts\/assets)\/([^?]+)$/.exec(url.pathname);
      if (f && fs.existsSync(path.join(LAWANG, ...f[1].split('/'), f[2]))) return route.fulfill({ status: 200, path: path.join(LAWANG, ...f[1].split('/'), f[2]) });
      return route.fulfill({ status: 404, body: '' });
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => { ok('sin errores de script (' + usuario + ')', false, e.message); });
    await p.goto(ORIGEN + '/intranet/v4/taller/' + hash);
    await espera(p, () => { const r = document.querySelector('[data-tl="raiz"]'); return r && !document.querySelector('[data-tl="vista-inicio"]').textContent.match(/Memuat|Loading|Cargando/) && (document.querySelector('[data-tl="vista-inicio"]').children.length > 0 || r.getAttribute('data-modo') !== 'inicio'); });
    return { p, ctx };
  }
  const espera = (p, fn, arg, ms = 9000) => p.waitForFunction(fn, arg, { timeout: ms }).catch(async e => { const s = await p.evaluate(() => ({ paso: (document.querySelector('[data-tl="vista-paso"]') || {}).getAttribute && document.querySelector('[data-tl="vista-paso"]').getAttribute('data-paso'), modo: document.querySelector('[data-tl="raiz"]').getAttribute('data-modo'), estado: (document.querySelector('[data-tl="paso-estado"]') || {}).textContent, err: (document.querySelector('[data-tl="error"]') || {}).textContent, hash: location.hash, fg: Array.from(document.querySelectorAll('.fg-celda')).map(c => c.getAttribute('data-ranura') + ':' + c.textContent).join(' | ') })).catch(() => ({})); throw new Error('espera agotada; pantalla: ' + JSON.stringify(s)); });
  const enPaso = (p, paso) => espera(p, x => { const r = document.querySelector('[data-tl="raiz"]'); return r.getAttribute('data-modo') === 'paso' && document.querySelector('[data-tl="vista-paso"]').getAttribute('data-paso') === x
    && !/Memuat|Loading/.test(document.querySelector('[data-tl="paso-estado"]').textContent); }, paso);
  const estadoTxt = p => p.$eval('[data-tl="paso-estado"]', e => e.textContent);
  const paso = p => p.$eval('[data-tl="vista-paso"]', e => e.getAttribute('data-paso'));
  const sig = p => p.click('[data-tl="siguiente"]');
  const sinScroll = async (p, donde) => { const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })); ok(donde + ': sin scroll horizontal', m.sw <= m.cw, JSON.stringify(m)); };
  const sinInyeccion = async (p, donde) => ok(donde + ': XSS — nada de la base se interpreta', (await p.evaluate(() => window.__xss === undefined && !document.querySelector('[onerror],[onload]'))));
  const sinTraducir = async (p, donde) => { const s = await p.evaluate(() => Array.from(new Set(window.__sinId))); ok(donde + ': todo lo pintado tiene traducción (detector __sinId)', s.length === 0, s.join(' | ')); };
  const llamadas = (B, n) => B.llamadas.filter(x => x[0] === n);
  const shot = async (p, nombre, full) => { if (CAPT) await p.screenshot({ path: path.join(CAPT, nombre), fullPage: !!full }); };
  const foto = async (p, ranura, fichero) => {
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click(ranura === 'dano' ? '[data-accion="fg-dano"]' : `[data-accion="fg-captura"][data-ranura="${ranura}"]`)]);
    await fc.setFiles(fichero);
  };
  const fotoSubida = (p, ranura) => espera(p, r => { const b = document.querySelector(`[data-accion="fg-captura"][data-ranura="${r}"]`); return b && b.getAttribute('data-estado') === 'subida'; }, ranura, 15000);

  try {
    // ── fixtures: un JPEG grande con GPS (Exif APP1) y uno pequeño, hechos en el navegador ──
    const fx = await nav.newPage();
    const jpeg = async (w, hgt, ruido, q) => Buffer.from(await fx.evaluate(async ([w, hgt, ruido, q]) => {
      const c = document.createElement('canvas'); c.width = w; c.height = hgt; const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, w, hgt); gr.addColorStop(0, '#345'); gr.addColorStop(1, '#c96'); g.fillStyle = gr; g.fillRect(0, 0, w, hgt);
      for (let i = 0; i < 400; i++) { g.fillStyle = `hsl(${i * 37 % 360},50%,50%)`; g.fillRect((i * 97) % w, (i * 53) % hgt, 80, 50); }
      const d = g.getImageData(0, 0, w, hgt); for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - 0.5) * ruido; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } g.putImageData(d, 0, 0);
      const b = await new Promise(r => c.toBlob(r, 'image/jpeg', q)); const ab = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < ab.length; i++) s += String.fromCharCode(ab[i]); return btoa(s);
    }, [w, hgt, ruido, q]), 'base64');
    const conGps = buf => {   // APP1 «Exif» con IFD0 → GPSInfo → GPSLatitude (8° 39' 0"), justo tras el SOI
      const t = Buffer.alloc(68); t.write('MM', 0); t.writeUInt16BE(42, 2); t.writeUInt32BE(8, 4);
      t.writeUInt16BE(1, 8); t.writeUInt16BE(0x8825, 10); t.writeUInt16BE(4, 12); t.writeUInt32BE(1, 14); t.writeUInt32BE(26, 18); t.writeUInt32BE(0, 22);
      t.writeUInt16BE(1, 26); t.writeUInt16BE(2, 28); t.writeUInt16BE(5, 30); t.writeUInt32BE(3, 32); t.writeUInt32BE(44, 36); t.writeUInt32BE(0, 40);
      [8, 1, 39, 1, 0, 1].forEach((v, k) => t.writeUInt32BE(v, 44 + k * 4));
      const pay = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), t]), seg = Buffer.alloc(4); seg.writeUInt16BE(0xFFE1, 0); seg.writeUInt16BE(pay.length + 2, 2);
      return Buffer.concat([buf.slice(0, 2), seg, pay, buf.slice(2)]);
    };
    const GRANDE = { name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: conGps(await jpeg(4000, 3000, 40, 0.97)) };
    const PEQ = { name: 'p.jpg', mimeType: 'image/jpeg', buffer: await jpeg(800, 600, 6, 0.8) };
    const PEQ2 = { name: 'q.jpg', mimeType: 'image/jpeg', buffer: await jpeg(640, 480, 10, 0.8) };
    await fx.close();
    ok('control: el JPEG de prueba pasa de 600 KB y trae APP1 Exif con GPS', GRANDE.buffer.length > 614400 && tipoBytes(GRANDE.buffer) === 'jpeg-exif', GRANDE.buffer.length);

    // ═══ 1. el mecánico a 390 px en indonesio: de la lista al resultado ═══
    const B = nuevaBase();
    let { p, ctx } = await abre(B);
    ok('paso 0: lee taller_datos una vez', llamadas(B, 'taller_datos').length === 1);
    ok('paso 0: sin «setup» en la respuesta (base vieja) no hay aviso y se puede empezar', !(await p.$('[data-tl="setup"]')) && !(await p.$eval('[data-tl="buscar"]', e => e.disabled)));
    ok('paso 0: «Motos para revisar» enseña la que está en taller sin orden', (await p.$eval('[data-tl="para-revisar"]', e => e.textContent)).includes('DK 1234 AB'));
    ok('paso 0: la orden vieja (sin paso) se ve y NO se ofrece a retomar', (await p.$eval('[data-tl="vivas"]', e => e.textContent)).includes('OT-00003') && !(await p.$('[data-tl="vivas"] [data-accion="tl-continuar"]')));
    const ancho = await p.evaluate(() => ({ w: document.querySelector('[data-tl="raiz"]').getBoundingClientRect().width, cw: document.documentElement.clientWidth }));
    ok('390 px: el contenido usa el ancho con 16 px por lado (no los 48 de la cáscara)', ancho.w >= ancho.cw - 32 - 1, JSON.stringify(ancho));
    const vis = await p.evaluate(() => { const r = document.querySelector('[data-tl="sec-revisar"]').getBoundingClientRect(); const e = document.elementFromPoint(r.left + 20, Math.min(r.top + 20, innerHeight - 80));
      const m = document.querySelector('main'), cs = getComputedStyle(m); return { top: Math.round(r.top), h: Math.round(r.height), dentro: !!(e && e.closest('[data-tl="raiz"]')), en: e ? e.tagName + '.' + e.className : null, mvis: cs.visibility, mop: cs.opacity, mdisp: cs.display, y: scrollY }; });
    ok('paso 0 a 390: la lista se VE (lo que hay en pantalla es la pantalla del taller, no otra capa)', vis.dentro && vis.h > 0, JSON.stringify(vis));
    await sinScroll(p, 'paso 0 (390)'); await sinInyeccion(p, 'paso 0');
    await shot(p, 'paso0_390_id.png', true);
    await p.fill('[data-tl="buscar"]', 'dk1234');
    ok('buscar «dk1234» (sin espacios) encuentra «DK 1234 AB»', (await p.$eval('[data-tl="resultados"]', e => e.textContent)).includes('DK 1234 AB'));
    await p.fill('[data-tl="buscar"]', 'dk9');
    ok('buscar encuentra la matrícula con XSS y la pinta como texto', (await p.$eval('[data-tl="resultados"]', e => e.textContent)).includes('<img src=x'));
    await sinInyeccion(p, 'búsqueda');
    await p.fill('[data-tl="buscar"]', 'zzz');
    ok('buscar algo que no existe lo dice', (await p.$eval('[data-tl="resultados"]', e => e.textContent)).length > 3);
    await p.fill('[data-tl="buscar"]', 'DK 1234');
    await p.click('[data-tl="resultados"] [data-accion="tl-moto"]');
    await enPaso(p, 'moto');
    ok('paso 1: URL #m=<moto>&p=moto y foco en el título', (await p.evaluate(() => location.hash)) === '#m=' + U.m1 + '&p=moto' && (await p.evaluate(() => document.activeElement.getAttribute('data-tl'))) === 'paso-titulo');
    ok('paso 1: línea compacta «1/6 · DK 1234 AB»', (await p.$eval('[data-tl="linea"]', e => e.textContent)) === '1/6 · DK 1234 AB');
    const pie = await p.evaluate(() => { const b = document.querySelector('.tl-pie'), r = b.getBoundingClientRect(), s = document.querySelector('[data-tl="siguiente"]').getBoundingClientRect(); return { pos: getComputedStyle(b).position, bottom: Math.round(r.bottom), h: innerHeight, bh: s.height }; });
    ok('390 px: barra Atrás/Siguiente fija abajo con botones de 56 px', pie.pos === 'fixed' && pie.bottom === pie.h && pie.bh >= 56, JSON.stringify(pie));
    ok('paso 1: solo lee (ninguna escritura)', B.llamadas.every(x => x[0].endsWith('_datos')));
    await sig(p); await enPaso(p, 'motivo');
    await p.click('[data-grupo="motivo"][data-valor="devolucion"]');
    ok('paso 2: el motivo es un radiogroup con aria-checked', (await p.$eval('[data-grupo="motivo"][data-valor="devolucion"]', e => e.getAttribute('aria-checked'))) === 'true' && !!(await p.$('[role="radiogroup"]')));
    await p.fill('[data-tl="nota-motivo"]', 'Nota <img src=x onerror="window.__xss=9">');
    B.latencia = 1500;
    await p.dblclick('[data-tl="siguiente"]'); await p.click('[data-tl="siguiente"]', { force: true }).catch(() => {});
    await enPaso(p, 'km');
    B.latencia = 0;
    ok('latencia 1,5 s y doble toque: UNA sola llamada de abrir y una sola orden', llamadas(B, 'taller_orden_abre').length === 1 && B.ordenes.filter(o => o.unidad_id === U.m1 && o.estado !== 'cerrada').length === 1);
    ok('abrir manda SOLO moto, motivo y nota', JSON.stringify(Object.keys(llamadas(B, 'taller_orden_abre')[0][1]).sort()) === '["p_motivo_tipo","p_nota","p_unidad"]');
    const orden = B.ordenes.find(o => o.unidad_id === U.m1 && o.estado !== 'cerrada');
    ok('paso 3: URL #o=<orden>&p=km', (await p.evaluate(() => location.hash)) === '#o=' + orden.id + '&p=km');
    ok('paso 3: enseña el último km apuntado', (await p.$eval('[data-tl="ultimo-km"]', e => e.textContent)).includes('5.000'));
    await p.type('[data-tl="km"]', 'a4b0,0.0');
    ok('km: solo cifras (teclado numérico)', (await p.$eval('[data-tl="km"]', e => e.value)) === '4000' && (await p.$eval('[data-tl="km"]', e => e.getAttribute('inputmode'))) === 'numeric');
    await p.click('[data-grupo="gas"][data-valor="2"]');
    const largo = await p.evaluate(() => history.length);
    await p.click('[data-accion="tl-atras"]'); await enPaso(p, 'moto');
    ok('Atrás desde km: vuelve a la moto (el motivo ya está congelado) por el historial, sin entradas nuevas', (await p.evaluate(() => history.length)) === largo
       && (await p.$eval('[data-tl="paso-cuerpo"]', e => e.textContent)).includes(orden.numero));
    await sig(p); await enPaso(p, 'km');
    ok('Siguiente en la moto con orden viva la retoma (sin abrir otra)', llamadas(B, 'taller_orden_abre').length === 1);
    await p.fill('[data-tl="km"]', '4000'); await p.click('[data-grupo="gas"][data-valor="2"]');
    ctx.__sinRed = true; await ctx.setOffline(true);
    await sig(p); await espera(p, () => /Belum tersimpan/.test(document.querySelector('[data-tl="paso-estado"]').textContent));
    ok('sin red en km: «No guardado · Reintentar» y no avanza', (await paso(p)) === 'km' && !!(await p.$('[data-accion="tl-reintentar"]')));
    ctx.__sinRed = false; await ctx.setOffline(false);
    await p.click('[data-accion="tl-reintentar"]');
    await espera(p, () => !!document.querySelector('[data-axw="dialogo"]'));
    ok('km menor que el último: pide confirmación con el último', (await p.$eval('[data-axw="dialogo"]', e => e.textContent)).includes('5.000') && (await paso(p)) === 'km');
    await p.click('[data-accion="tl-km-confirma"]');
    await enPaso(p, 'fotos');
    ok('confirmado: km guardado con p_confirma y pasa a fotos', orden.km === 4000 && orden.gasolina === 2 && llamadas(B, 'taller_orden_km').slice(-1)[0][1].p_confirma === true);
    await sinScroll(p, 'paso 3 (390)');

    // fotos
    await foto(p, 'frente', GRANDE); await fotoSubida(p, 'frente').catch(e => { console.log('subidas: ' + JSON.stringify(B.subidas)); throw e; });
    const s1 = B.subidas.filter(x => x.ranura === 'frente').slice(-1)[0];
    ok('JPEG grande con GPS: lo subido es webp o jpeg, <= 600 KB y SIN Exif', s1 && (s1.tipo === 'image/webp' || s1.tipo === 'image/jpeg') && s1.bytes <= 614400, JSON.stringify(s1));
    await p.evaluate(() => { const o = HTMLCanvasElement.prototype.toBlob; window.__toBlob = o; HTMLCanvasElement.prototype.toBlob = function (cb, t, q) { return o.call(this, cb, t === 'image/webp' ? 'image/png' : t, q); }; });
    await foto(p, 'atras', PEQ); await fotoSubida(p, 'atras');
    await p.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.__toBlob; });
    ok('sin codificador webp (Safari): sube JPEG, nunca PNG ni el original', B.subidas.filter(x => x.ranura === 'atras').slice(-1)[0].tipo === 'image/jpeg');
    B.tope429 = 1;
    await foto(p, 'izquierda', PEQ);
    await espera(p, () => document.querySelector('[data-ranura="izquierda"] .fg-estado').textContent.includes('detik'));
    ok('429 tope_minuto: lo dice y se reintenta solo con la misma clave', true);
    await fotoSubida(p, 'izquierda');
    const iz = B.subidas.filter(x => x.ranura === 'izquierda');
    ok('el reintento tras el 429 lleva la MISMA clave de captura', iz.length === 2 && iz[0].clave === iz[1].clave);
    B.tope429 = 1;
    await foto(p, 'derecha', PEQ);
    await espera(p, () => document.querySelector('[data-ranura="derecha"] .fg-estado').textContent.includes('detik'));
    await foto(p, 'derecha', PEQ2); await fotoSubida(p, 'derecha');
    await duerme(1600);
    const de = B.subidas.filter(x => x.ranura === 'derecha'), vig = B.fotos.filter(f => f.orden_id === orden.id && f.ranura === 'derecha' && f.estado === 'confirmada');
    ok('repetir una casilla durante la espera del 429: la captura vieja NO se sube después y la vigente es la nueva', de.length === 2 && de[0].clave !== de[1].clave && vig.length === 1 && vig[0].clave === de[1].clave, JSON.stringify(de.map(x => x.clave.slice(0, 8))));
    await foto(p, 'cuentakm', PEQ); await fotoSubida(p, 'cuentakm');
    ok('las 5 fijas confirmadas en la base', ['frente', 'atras', 'izquierda', 'derecha', 'cuentakm'].every(r => B.fotos.some(f => f.orden_id === orden.id && f.ranura === r && f.estado === 'confirmada')));
    ok('fotos: el aviso dice que están las 5', (await p.$eval('[data-tl="fotos-info"]', e => e.textContent)).includes('5 foto wajib sudah lengkap'));
    ctx.__sinRed = true; await ctx.setOffline(true);
    await foto(p, 'dano', PEQ);
    await espera(p, () => !document.querySelector('[data-fg="pendientes"]').classList.contains('axw-oculto'));
    await sig(p); await espera(p, () => /belum terunggah/.test(document.querySelector('[data-tl="paso-estado"]').textContent));
    ok('foto de daño sin subir: Siguiente no sale del paso (la pieza que reintenta se cerraría)', (await paso(p)) === 'fotos' && llamadas(B, 'taller_orden_paso').length === 0);
    ctx.__sinRed = false; await ctx.setOffline(false);
    await p.click('[data-accion="fg-reintentar"]', { timeout: 1500 }).catch(() => {});   // al volver la red ya sube sola (evento online): el botón puede no llegar a verse
    await espera(p, () => document.querySelector('[data-fg="pendientes"]').classList.contains('axw-oculto'), null, 15000);
    ok('al volver la red / Reintentar: la foto de daño sube una sola vez', B.fotos.filter(f => f.orden_id === orden.id && f.ranura === 'dano').length === 1);
    await sinScroll(p, 'paso 4 (390)');
    await shot(p, 'paso4_390_id.png', true);
    ctx.__sinRed = true; await ctx.setOffline(true);
    await sig(p); await espera(p, () => /Belum tersimpan/.test(document.querySelector('[data-tl="paso-estado"]').textContent));
    ok('sin red en fotos → Siguiente: no avanza', (await paso(p)) === 'fotos');
    ctx.__sinRed = false; await ctx.setOffline(false);
    await p.click('[data-accion="tl-reintentar"]'); await enPaso(p, 'revisiones');
    ok('paso 5: tres revisiones (dos comunes y una del modelo) con su nombre en indonesio', (await p.$$('[data-rev]')).length === 3 && (await p.$eval('[data-tl="paso-cuerpo"]', e => e.textContent)).includes('Rantai'));
    await sinInyeccion(p, 'paso 5');

    // Atrás del navegador y recarga a mitad
    await p.goBack(); await enPaso(p, 'fotos');
    ok('goBack(): vuelve a fotos (el paso de la URL anterior)', (await p.evaluate(() => location.hash)).endsWith('&p=fotos'));
    await p.reload(); await enPaso(p, 'revisiones');
    ok('recarga a mitad: manda el paso de la BASE (revisiones), no el de la URL (fotos)', (await p.evaluate(() => location.hash)).endsWith('&p=revisiones'));
    const revs = B.revs;
    // revisiones: guardar al pulsar, doble toque, sin red, respuesta cortada
    B.latencia = 800;
    await p.dblclick(`[data-rev-id="${revs[0].id}"][data-res="bien"]`);
    await espera(p, id => (document.querySelector(`[data-rev-estado="${id}"]`) || {}).textContent === 'Tersimpan', revs[0].id);
    B.latencia = 0;
    ok('revisión: doble toque = una sola llamada, y dice «Tersimpan»', llamadas(B, 'taller_revision_marca').length === 1);
    ctx.__sinRed = true; await ctx.setOffline(true);
    await p.click(`[data-rev-id="${revs[2].id}"][data-res="bien"]`);
    await espera(p, id => /Belum tersimpan/.test(document.querySelector(`[data-rev-estado="${id}"]`).textContent), revs[2].id);
    ok('revisión sin red: «No guardado» en su tarjeta, sin marcarla como hecha', (await p.$eval(`[data-rev-id="${revs[2].id}"][data-res="bien"]`, e => e.getAttribute('aria-checked'))) === 'false');
    ctx.__sinRed = false; await ctx.setOffline(false);
    await p.click(`[data-accion="tl-rev-reintentar"][data-rev-id="${revs[2].id}"]`);
    await espera(p, id => document.querySelector(`[data-rev-estado="${id}"]`).textContent === 'Tersimpan', revs[2].id);
    B.cortaTras = 'taller_revision_marca';
    await p.click(`[data-rev-id="${revs[1].id}"][data-res="mal"]`);
    await espera(p, id => /Belum tersimpan/.test(document.querySelector(`[data-rev-estado="${id}"]`).textContent), revs[1].id);
    await p.click(`[data-accion="tl-rev-reintentar"][data-rev-id="${revs[1].id}"]`);
    await espera(p, id => document.querySelector(`[data-rev-estado="${id}"]`).textContent === 'Tersimpan', revs[1].id);
    ok('respuesta cortada tras escribir y reintento: UNA respuesta en la base (upsert), en «Rusak»', B.respuestas.filter(a => a.revision_id === revs[1].id).length === 1 && B.respuestas.find(a => a.revision_id === revs[1].id).resultado === 'mal');
    await p.fill(`[data-rev-nota="${revs[1].id}"]`, `aceite <img src=x onerror="window.__xss=7"> "x"`);
    await p.click(`[data-accion="tl-rev-nota"][data-rev-id="${revs[1].id}"]`);
    await espera(p, id => document.querySelector(`[data-rev-estado="${id}"]`).textContent === 'Tersimpan', revs[1].id);
    ok('la nota de «Rusak» se guarda con la revisión', /aceite/.test(B.respuestas.find(a => a.revision_id === revs[1].id).nota || ''));
    await sinInyeccion(p, 'revisiones'); await sinScroll(p, 'paso 5 (390)');
    await shot(p, 'paso5_390_id.png', true);
    await sig(p); await enPaso(p, 'resultado');
    await p.click('[data-grupo="resultado"][data-valor="lista"]');
    ok('paso 7: «Siap disewa» con una revisión en Rusak — falta visible y el mecánico no puede guardarla',
       !(await p.$eval('[data-tl="faltan"]', e => e.classList.contains('axw-oculto'))) && (await p.$eval('[data-tl="faltan"]', e => e.textContent)).includes('Rusak') && (await p.$eval('[data-tl="siguiente"]', e => e.disabled)));
    await sinScroll(p, 'paso 7 (390)');
    await shot(p, 'paso7_390_id.png', true);
    await p.click('[data-grupo="resultado"][data-valor="espera_recambio"]');
    await p.fill('[data-tl="nota-res"]', 'Tunggu kampas rem');
    ctx.__sinRed = true; await ctx.setOffline(true);
    await sig(p); await espera(p, () => /Belum tersimpan/.test(document.querySelector('[data-tl="paso-estado"]').textContent));
    ok('sin red en el resultado: no avanza', (await paso(p)) === 'resultado' && orden.estado === 'abierta');
    ctx.__sinRed = false; await ctx.setOffline(false);
    B.cortaTras = 'taller_orden_resultado';
    await p.click('[data-accion="tl-reintentar"]'); await espera(p, () => /Belum tersimpan/.test(document.querySelector('[data-tl="paso-estado"]').textContent));
    ok('respuesta cortada al cerrar: la base ya la dejó en espera, la pantalla dice «No guardado» (duda)', orden.estado === 'espera_recambio' && (await paso(p)) === 'resultado');
    await p.click('[data-accion="tl-reintentar"]'); await enPaso(p, 'fin');
    ok('reintento: termina sin duplicar (una orden viva, en espera) y dice que espera el recambio',
       B.ordenes.filter(o => o.unidad_id === U.m1 && o.estado !== 'cerrada').length === 1 && (await p.$eval('[data-tl="fin-texto"]', e => e.textContent)).includes('suku cadang'));
    await p.goBack().catch(() => {}); await espera(p, () => document.querySelector('[data-tl="raiz"]').getAttribute('data-modo') === 'inicio');
    ok('terminado: Atrás del navegador no vuelve a los pasos de la orden', true);
    await sinTraducir(p, 'mecánico id');
    ok('el navegador no tocó tablas', (await p.evaluate(() => window.__errores.filter(x => x === 'from').length)) === 0);
    await ctx.close();

    // ═══ 2. otro usuario (admin) retoma la orden en espera y la deja lista con motivo; la respuesta se pierde ═══
    ({ p, ctx } = await abre(B, { usuario: 'admin', ancho: 1440, alto: 900 }));
    await p.click(`[data-accion="tl-continuar"][data-orden-id="${orden.id}"]`);
    await enPaso(p, 'resultado');
    ok('retomar desde OTRO usuario: la en espera vuelve a abierta (por la base) y entra en su paso', orden.estado === 'abierta' && llamadas(B, 'taller_orden_abre').slice(-1)[0][2] === 'admin');
    await p.click('[data-grupo="resultado"][data-valor="lista"]');
    ok('admin: con faltas, pide el motivo de excepción y deja guardar', !!(await p.$('[data-tl="excepcion"]')) && !(await p.$eval('[data-tl="siguiente"]', e => e.disabled)));
    await p.fill('[data-tl="excepcion"]', 'Kampas rem sudah diganti di luar');
    B.cortaTras = 'taller_orden_resultado';
    await sig(p); await espera(p, () => /Belum tersimpan/.test(document.querySelector('[data-tl="paso-estado"]').textContent));
    ok('cortada: la base la cerró pero la pantalla no lo da por hecho', orden.estado === 'cerrada' && (await paso(p)) === 'resultado');
    await p.click('[data-accion="tl-reintentar"]'); await enPaso(p, 'fin');
    ok('reintento → «ya_cerrada»: vuelve a mirar, ve la moto sin esa orden viva y lo da por cerrado (sin error ni duplicado)',
       (await p.$eval('[data-tl="fin-texto"]', e => e.textContent)).includes('sudah ditutup') && B.ordenes.filter(o => o.unidad_id === U.m1).length === 2);
    await sig(p); await espera(p, () => document.querySelector('[data-tl="raiz"]').getAttribute('data-modo') === 'inicio' && !!document.querySelector('[data-tl="volver"]'));
    ok('encargado: «Listas para volver» trae la moto adoptada', (await p.$eval('[data-tl="volver"]', e => e.textContent)).includes('DK 1234 AB'));
    await sinScroll(p, 'encargado (1440)'); await sinInyeccion(p, 'encargado');
    await shot(p, 'encargado_1440_id.png', true);
    await p.check(`[data-volver-id="${U.m1}"]`); await p.fill('[data-tl="volver-motivo"]', 'Sudah dicek');
    await p.click('[data-accion="tl-devolver"]');
    await espera(p, () => document.querySelector('[data-tl="exito"]') && !document.querySelector('[data-tl="exito"]').classList.contains('axw-oculto'));
    ok('devolver a disponible: taller_moto_devuelve con array de ids y motivo; la moto pasa a disponible', B.motos.find(m => m.id === U.m1).estado === 'disponible'
       && Array.isArray(llamadas(B, 'taller_moto_devuelve')[0][1].p_unidades));
    // pestaña Listas por modelo
    await p.click('[data-accion="tl-tab-listas"]'); await espera(p, () => !!document.querySelector('[data-tl="l-revisiones"]') || !!document.querySelector('[data-accion="tl-l-basica"]') || !!document.querySelector('[data-tl="l-nueva"]'));
    ok('Listas por modelo: URL #listas y lista común', (await p.evaluate(() => location.hash)) === '#listas' && (await p.$$('[data-l-rev]')).length === 2);
    await p.fill('[data-tl="l-nueva"] [data-f="clave"]', 'luces'); await p.fill('[data-tl="l-nueva"] [data-f="nombre_id"]', 'Lampu'); await p.fill('[data-tl="l-nueva"] [data-f="nombre_en"]', 'Lights');
    await p.click('[data-accion="tl-l-rev-nueva"]'); await espera(p, () => document.querySelectorAll('[data-l-rev]').length === 3);
    ok('añadir revisión a la lista común: taller_revision_guarda con producto nulo', llamadas(B, 'taller_revision_guarda').slice(-1)[0][1].p_datos.producto_id === null);
    await sinScroll(p, 'listas (1440)'); await sinTraducir(p, 'admin id');
    await ctx.close();

    // ═══ 3. orden vieja viva, reservas vivas, setup sin hacer, hint taller_sin_configurar ═══
    ({ p, ctx } = await abre(B, { hash: '#m=' + U.m4 + '&p=moto' }));
    await enPaso(p, 'moto');
    ok('moto con orden de la pantalla anterior (la lista ya lo sabe): lo dice con su número y no deja seguir', (await p.$eval('[data-tl="paso-cuerpo"]', e => e.textContent)).includes('OT-00003') && (await p.$eval('[data-tl="siguiente"]', e => e.disabled)));
    await p.goto(ORIGEN + '/intranet/v4/taller/#m=' + U.m5 + '&p=moto'); await enPaso(p, 'moto');
    await sig(p); await enPaso(p, 'motivo'); await p.click('[data-grupo="motivo"][data-valor="averia"]'); await sig(p);
    await espera(p, () => /OT-00002/.test(document.querySelector('[data-tl="paso-estado"]').textContent));
    ok('orden_vieja_viva de la base: se explica con el número y no se retoma', (await paso(p)) === 'motivo' && !(await p.$('[data-accion="tl-reintentar"]')));
    await p.goto(ORIGEN + '/intranet/v4/taller/#m=' + U.m3 + '&p=motivo'); await enPaso(p, 'motivo');
    await p.click('[data-grupo="motivo"][data-valor="revision"]'); await sig(p);
    await espera(p, () => !document.querySelector('[data-tl="reservas"]').classList.contains('axw-oculto'));
    ok('reservas vivas: lista de reservas en texto y no avanza', (await p.$eval('[data-tl="reservas"]', e => e.textContent)).includes('RP-<b>9') && (await paso(p)) === 'motivo');
    await sinInyeccion(p, 'reservas vivas');
    B.abreSinConfigurar = true;
    await p.goto(ORIGEN + '/intranet/v4/taller/#m=' + U.m2 + '&p=motivo'); await enPaso(p, 'motivo');
    await p.click('[data-grupo="motivo"][data-valor="revision"]'); await sig(p);
    await espera(p, () => /Bengkel belum diatur/.test(document.querySelector('[data-tl="paso-estado"]').textContent));
    ok('hint taller_sin_configurar: «Bengkel belum diatur.» y no abre', (await paso(p)) === 'motivo' && !B.ordenes.some(o => o.unidad_id === U.m2));
    B.abreSinConfigurar = false;
    await sinTraducir(p, 'casos raros id');
    await ctx.close();
    B.setup = { listo: false, pasos: [{ clave: 'revisiones', hecho: false, obligatorio: true, detalle: 'Falta X (español de la base)', donde: '/taller/#listas', fase: 1 },
                                      { clave: 'mecanico', hecho: false, obligatorio: true, detalle: 'Falta Y', donde: '/usuarios/', fase: 1 },
                                      { clave: 'opcional', hecho: false, obligatorio: false, detalle: 'Z', donde: 'javascript:alert(1)', fase: 2 }] };
    ({ p, ctx } = await abre(B));
    const st = await p.$eval('[data-tl="setup"]', e => e.textContent);
    ok('setup sin hacer: «Bengkel belum siap» con lo que falta traducido por clave (no el texto de la base) y solo lo obligatorio',
       st.includes('Bengkel belum siap') && st.includes('daftar pemeriksaan') && st.includes('akses Bengkel') && !st.includes('español de la base') && !st.includes('Z'));
    ok('setup sin hacer: no deja empezar (buscar y motos para revisar desactivados) y el mecánico no ve el botón de listas',
       (await p.$eval('[data-tl="buscar"]', e => e.disabled)) && (await p.$$eval('[data-tl="para-revisar"] button', bs => bs.every(b => b.disabled))) && !(await p.$('[data-tl="setup"] [data-accion="tl-tab-listas"]')));
    await sinScroll(p, 'setup (390)'); await sinTraducir(p, 'setup id');
    await ctx.close();
    ({ p, ctx } = await abre(B, { usuario: 'admin' }));
    ok('setup sin hacer, admin con Flota: botón a «Listas por modelo»; enlace solo para rutas del mismo origen', !!(await p.$('[data-tl="setup"] [data-accion="tl-tab-listas"]'))
       && (await p.$$eval('[data-tl="setup"] a', as => as.map(a => a.getAttribute('href')))).join() === '/usuarios/');
    await ctx.close();
    B.setup = null;

    // lectura que falla: «no se ha podido mirar» se QUEDA (no una pantalla vacía); y una URL mal escrita no tumba la pantalla
    B.o.datosFalla = true;
    ({ p, ctx } = await abre(B));
    await duerme(300);
    ok('taller_datos falla: el aviso «no se ha podido mirar» sigue en pantalla', ((await p.$eval('[data-tl="vista-inicio"]', e => e.textContent)) || '').includes('tidak dapat diperiksa'));
    await ctx.close();
    B.o.datosFalla = false;
    ({ p, ctx } = await abre(B, { hash: '#o=%E0%A4&p=km' }));
    ok('URL con un trozo mal codificado: va al inicio sin romperse', (await p.$eval('[data-tl="raiz"]', e => e.getAttribute('data-modo'))) === 'inicio' && !!(await p.$('[data-tl="buscar"]')));
    await ctx.close();

    // ═══ 4. inglés, 390 y 1440 ═══
    for (const anchoEn of [390, 1440]) {
      ({ p, ctx } = await abre(B, { idioma: 'en', ancho: anchoEn, usuario: 'mec2' }));
      await p.fill('[data-tl="buscar"]', '8888'); await p.click('[data-tl="resultados"] [data-accion="tl-moto"]'); await enPaso(p, 'moto');
      await sig(p); await enPaso(p, 'motivo');
      ok(anchoEn + ' en: los textos salen en inglés', (await p.$eval('[data-tl="paso-titulo"]', e => e.textContent)) === 'Why is it in the workshop?');
      await sinScroll(p, anchoEn + ' en'); await sinTraducir(p, anchoEn + ' en');
      await ctx.close();
    }
  } finally {
    await nav.close();   // un solo navegador, cerrado siempre (la máquina va justa de memoria)
  }
  console.log(fallos ? fallos + ' FALLO(S) de ' + casos : 'TODO BIEN: ' + casos + ' casos');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('ERROR ' + (e && e.stack || e)); process.exit(2); });
