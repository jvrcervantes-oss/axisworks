// node comercial/demo-erp/pruebas/ventas.harness.cjs [captura.png]
// Harness de la pantalla Ventas del maestro (F4, 8-oct-2026): el ventas.html REAL (marcado + script) en Chromium, con la base y la sesión SIMULADAS
// (page.exposeFunction): una base en memoria que imita lo que dicen las RPC de la migración 20261008120000 (firmas, formas de respuesta, errores con
// hint). Mide el COMPORTAMIENTO, no el código: qué pide y con qué argumentos, qué pinta con cada respuesta, XSS por nombre de cliente, los estados de
// la cola, el recorrido reclamar → borrador → emitir → rectificar, y que nada escribe por .from ni por fetch.
// OJO: la base real NO se ha tocado (la migración no está aplicada en ninguna). Lo que sale de aquí prueba la pantalla contra mi lectura de la
// migración, no contra Postgres.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const FUENTE = fs.readFileSync(path.join(__dirname, '..', 'ventas.html'), 'utf8');
const [MARCADO, SCRIPT] = FUENTE.split('<!--AXW_SCRIPT-->');
const SHOT = process.argv[2];
let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + nombre); };

const XSS_CONTACTO = `"><img src=x onerror="window.__xss=1"> O'Brien <script>window.__xss=2</script>`;
const XSS_CLIENTE = `Ana <b>"Q"</b> 'S' <svg onload="window.__xss=3">`;
const XSS_LINEA = `Alquiler <img src=x onerror="window.__xss=4"> 'Beat' "x"`;

// ── la base simulada ────────────────────────────────────────────────────────────────────────────
function nuevaBase(o = {}) {
  const b = {
    llamadas: [], seq: 0, o,
    clientes: [{ id: 'c1', nombre: XSS_CLIENTE }, { id: 'c2', nombre: 'Bob' }],
    productos: [{ id: 'p1', nombre: 'Casco <i>X</i>', precio: 150000, moneda: 'IDR' }, { id: 'p2', nombre: 'Guantes', precio: 80000, moneda: 'IDR' }],
    reservas: [{ id: 'r1', numero: 'R-0001', producto: 'Honda Beat', client_id: null, contacto_nombre: XSS_CONTACTO, estado: 'confirmada', desde: '2026-10-10', hasta: '2026-10-12',
                 dias: 2, precio_total: 700000, moneda: 'IDR', pago_referencia: 'PAY-<1>', operacion_id: 'op1', sin_reclamar: true, reclamada_por: null, creado_por: 'bot' }],
    ops: [{ id: 'op1', referencia: 'OP-0001', tipo: 'alquiler', origen: 'reserva', estado: 'borrador', client_id: null, moneda: 'IDR', creado_en: '2026-10-08T08:00:00Z', contratado: 700000 }],
    facturas: [],
  };
  return b;
}
function cifras(b, op) {
  const em = b.facturas.filter(f => f.operacion_id === op.id && f.tipo === 'factura' && f.emitida_en && !f.rectifica_id);
  const rec = b.facturas.filter(f => f.operacion_id === op.id && f.rectifica_id && f.emitida_en);
  const facturado = em.reduce((s, f) => s + f.total, 0) + rec.reduce((s, f) => s + f.total, 0);
  const bor = b.facturas.find(f => f.operacion_id === op.id && !f.emitida_en && !f.anulada && !f.rectifica_id);
  return Object.assign({}, op, { cliente: op.client_id ? (b.clientes.find(c => c.id === op.client_id) || {}).nombre : null, cliente_oculto: false,
    facturado, cobrado: 0, pendiente_facturar: (op.contratado || 0) - facturado, pendiente_cobro: facturado, a_cuenta_cliente: 0, borrador_id: bor ? bor.id : null });
}
const err = (code, message, hint) => ({ data: null, error: { code, message, hint: hint || null } });
async function servidor(b, nombre, a) {
  b.llamadas.push([nombre, JSON.parse(JSON.stringify(a))]);
  const o = b.o;
  if (o.lento) await new Promise(r => setTimeout(r, o.lento));
  if (o.sinRed && nombre === o.sinRed) return { data: null, error: { message: 'Failed to fetch' } };
  if (o.noDisponible && o.noDisponible.includes(nombre)) return err('PGRST202', 'Could not find the function public.' + nombre + ' in the schema cache');
  switch (nombre) {
    case 'operaciones_cola_datos': {
      let l = b.ops; if (a.p_origen) l = l.filter(x => x.origen === a.p_origen); if (a.p_estado) l = l.filter(x => x.estado === a.p_estado);
      return { data: { operaciones: l.map(x => cifras(b, x)), siguiente: null }, error: null };
    }
    case 'reservas_producto_datos': return { data: { reservas: b.reservas.map(r => Object.assign({}, r, { contacto_telefono: null })), siguiente: null }, error: null };
    case 'reservas_cobradas_sin_facturar':
      if (o.cola === 'apagado') return { data: { reservas: [], siguiente: null, motivo: 'reservas_apagado' }, error: null };
      if (o.cola === 'permiso') return err('42501', 'reservas_cobradas_sin_facturar: sin acceso');
      if (o.cola === 'vacia') return { data: { reservas: [], siguiente: null, motivo: null }, error: null };
      if (o.cola === 'rara') return { data: { cosa: 1 }, error: null };
      return { data: { reservas: b.reservas.filter(r => r.pago_referencia).map(r => ({ id: r.id, numero: r.numero, producto_id: 'x', producto: r.producto, client_id: r.client_id, cliente_oculto: false,
        cliente: r.client_id ? (b.clientes.find(c => c.id === r.client_id) || {}).nombre : null, sin_cliente: !r.client_id, estado: r.estado, precio_total: r.precio_total, moneda: r.moneda,
        pago_referencia: r.pago_referencia, pago_registrado_en: '2026-10-08T07:00:00Z', dias_sin_facturar: 3, operacion_id: r.operacion_id,
        tiene_borrador: b.facturas.some(f => f.operacion_id === r.operacion_id && !f.emitida_en && !f.anulada && !f.rectifica_id) })), siguiente: null, motivo: null }, error: null };
    case 'reserva_asigna_cliente': {
      const r = b.reservas.find(x => x.id === a.p_reserva);
      if (o.reclamoFalla) return err('22023', 'La reserva ya tiene cliente: el cliente de una reserva con operación no se cambia', 'ya_tiene_cliente');
      r.client_id = a.p_cliente; r.sin_reclamar = false; r.reclamada_por = 'yo@x.com';
      const op = b.ops.find(x => x.id === r.operacion_id); op.client_id = a.p_cliente; op.estado = 'abierta';
      return { data: { reserva_id: r.id, client_id: a.p_cliente, operacion_id: o.reclamoSinOp ? null : op.id, operacion_estado: op.estado }, error: null };
    }
    case 'factura_desde_operacion': {
      if (o.requiere3b) return err('22023', 'La sociedad X lleva impuesto por defecto: requiere la subtarea 3b', 'requiere_3b');
      const vivo = b.facturas.find(f => f.operacion_id === a.p_operacion && !f.emitida_en && !f.anulada && !f.rectifica_id);
      if (vivo) return { data: { id: vivo.id, creada: false, total: vivo.total, moneda: 'IDR', operacion_id: a.p_operacion }, error: null };
      const r = b.reservas.find(x => x.operacion_id === a.p_operacion);
      const f = { id: 'f' + (++b.seq), operacion_id: a.p_operacion, tipo: 'factura', total: r.precio_total, moneda: 'IDR', numero: null, anulada: false, emitida_en: null, fecha_emision: null,
                  created_at: '2026-10-08T09:0' + b.seq + ':00Z', rectifica_id: null, sociedad: 'bbm' };
      b.facturas.push(f);
      return { data: { id: f.id, creada: true, total: f.total, moneda: 'IDR', operacion_id: a.p_operacion }, error: null };
    }
    case 'operacion_facturas_datos': {
      if (o.facturasFalla) return { data: null, error: { message: 'boom', code: 'XX000' } };
      if (o.facturasForma) return { data: b.facturas.filter(f => f.operacion_id === a.p_operacion), error: null };   // la forma vieja (array): no es la de la migración
      return { data: { facturas: b.facturas.filter(f => f.operacion_id === a.p_operacion).map(f => Object.assign({}, f)) }, error: null };
    }
    case 'factura_lineas_datos': {
      const f = b.facturas.find(x => x.id === a.p_factura);
      if (!f) return err('42501', 'factura_lineas_datos: no ves esa factura');
      const neg = f.rectifica_id ? -1 : 1;
      return { data: { factura_id: f.id, numero: f.numero, tipo: 'factura', emitida: !!f.emitida_en, rectifica_id: f.rectifica_id, moneda: 'IDR', base: f.total, impuestos: 0, total: f.total,
        lineas: [{ orden: 1, producto_id: null, producto: null, descripcion: XSS_LINEA, cantidad: 2 * neg, precio_unitario: f.total / 2 * neg, descuento_pct: 0, importe: f.total, impuestos: [{ nombre: 'PPN <x>', clase: 'suma', porcentaje: 11 }] },
                 { orden: 2, producto_id: null, producto: null, descripcion: 'Casco', cantidad: 1, precio_unitario: 0, descuento_pct: 0, importe: 0, impuestos: [] }] }, error: null };
    }
    case 'factura_emite': {
      const f = b.facturas.find(x => x.id === a.p_id);
      if (o.emisorIncompleto) return err('22023', 'El emisor de la factura no está completo: faltan el NPWP o la razón social de la sociedad', 'emisor_incompleto');
      if (o.clienteIncompleto) return err('22023', 'El cliente no está completo', 'cliente_incompleto');
      if (o.sinNumero) { f.emitida_en = 'x'; return { data: { id: f.id, estado: 'emitida' }, error: null }; }
      if (f.emitida_en) return { data: { id: f.id, numero: f.numero, estado: 'emitida', repetido: true }, error: null };
      f.emitida_en = '2026-10-08T10:00:00Z'; f.numero = (f.rectifica_id ? 'BBM-R2026-' : 'BBM-F2026-') + String(++b.seq).padStart(5, '0'); f.fecha_emision = '2026-10-08';
      return { data: { id: f.id, numero: f.numero, estado: 'emitida', fecha_emision: f.fecha_emision, repetido: false, recibis: o.recibisFallan ? [] : [{ recibi: 'rcb1', creado: true }] }, error: null };
    }
    case 'factura_borrador_descarta': {
      const f = b.facturas.find(x => x.id === a.p_id);
      if (f.emitida_en) return err('23514', 'La factura ya está emitida', 'ya_emitida');
      f.anulada = true;
      return { data: { id: f.id, estado: o.descartaMal ? 'rara' : 'descartada', operacion_id: f.operacion_id, repetido: false }, error: null };
    }
    case 'factura_rectifica': {
      const f = b.facturas.find(x => x.id === a.p_origen);
      const total = a.p_tipo === 'sustitucion' ? -f.total : -(a.p_lineas.reduce((s, l) => s + l.cantidad, 0) * (f.total / 2));
      const n = { id: 'f' + (++b.seq), operacion_id: f.operacion_id, tipo: 'factura', total, moneda: 'IDR', numero: null, anulada: false, emitida_en: null, fecha_emision: null,
                  created_at: '2026-10-08T09:5' + b.seq + ':00Z', rectifica_id: f.id, sociedad: 'bbm' };
      b.facturas.push(n);
      return { data: { id: n.id, tipo: a.p_tipo, estado: 'borrador', total }, error: null };
    }
    case 'factura_producto_crea': {
      if (b.ventas && b.ventas[a.p_clave]) return { data: Object.assign({}, b.ventas[a.p_clave], { creada: false }), error: null };
      if (o.ventaFalla && !b.yaFallo) { b.yaFallo = true; return { data: null, error: { message: 'Failed to fetch' } }; }
      const id = 'opv' + (++b.seq);
      b.ops.push({ id, referencia: 'V-000' + b.seq, tipo: 'venta', origen: 'venta', estado: 'abierta', client_id: a.p_cliente, moneda: a.p_moneda, creado_en: '2026-10-08T09:00:00Z', contratado: 150000 });
      const f = { id: 'f' + (++b.seq), operacion_id: id, tipo: 'factura', total: 150000, moneda: a.p_moneda, numero: null, anulada: false, emitida_en: null, created_at: 'z', rectifica_id: null, sociedad: 'bbm' };
      b.facturas.push(f); b.ventas = b.ventas || {};
      const resp = { creada: true, operacion_id: id, referencia: 'V', factura_id: f.id, total: 150000, moneda: a.p_moneda, emitida: false };
      b.ventas[a.p_clave] = resp;
      return { data: resp, error: null };
    }
    case 'clientes_datos': return { data: { clientes: b.clientes, truncado: !!o.truncado }, error: null };
    case 'productos_datos': return { data: { productos: b.productos }, error: null };
    case 'sociedades_emisor_datos': return { data: { sociedades: [{ clave: 'bbm', emisor_completo: !o.emisorFalta, impuesto_configurado: !o.impuestoFalta }] }, error: null };
  }
  return err('42883', 'función desconocida ' + nombre);
}

// ── la página ───────────────────────────────────────────────────────────────────────────────────
const pagina = (idioma, lectores) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title></head><body>
${MARCADO}
<script>
window.__xss = undefined; window.__fromLlamado = 0; window.__fetchLlamado = 0; window.__sinEn = []; window.__errores = [];
window.fetch = function () { window.__fetchLlamado++; return Promise.reject(new Error('fetch')); };
var sb = {
  rpc: function (n, a) {
    var filtros = {}, b = { select: function () { return b; }, order: function () { return b; }, eq: function (c, v) { filtros[c] = v; return b; },
      then: function (f, g) { return window.__srv(n, Object.assign({}, a || {}, Object.keys(filtros).length ? { _filtros: filtros } : {})).then(f, g); } };
    return b;
  },
  from: function () { window.__fromLlamado++; throw new Error('el navegador no toca la base'); },
  auth: { getSession: function () { return Promise.resolve({ data: { session: { access_token: 'JWT' } } }); } }
};
window.LW_AUTH = Promise.resolve({ sb: sb });
window.lwDatos = function (n, a) { return Promise.resolve(sb.rpc(n, a)).then(function (r) { return { data: r.data, error: r.error }; }); };
window.LW_IDIOMA = '${idioma}';
window.LW_EN = {};
window.lwLocale = function () { return window.LW_IDIOMA === 'en' ? 'en-GB' : 'es-ES'; };
window.lwT = function (s) { s = String(s); if (window.LW_IDIOMA === 'en') { if (Object.prototype.hasOwnProperty.call(window.LW_EN, s)) return window.LW_EN[s]; if (!/^[\\s—·0-9.,%():]*$/.test(s)) window.__sinEn.push(s); } return s; };
window.lwIdiomaAplicar = function (raiz) { Array.prototype.forEach.call(raiz.querySelectorAll('[data-lwt]'), function (e) { e.textContent = window.lwT(e.textContent); }); };
window.toast = function () {};
window.onerror = function (m) { window.__errores.push(String(m)); };
</script>
<script>${SCRIPT.replace(/<\/?script>/g, '').replace("var LECT = { clientes: 'clientes_datos', productos: 'productos_datos', emisor: 'sociedades_emisor_datos' };", lectores)}</script></body></html>`;

const LECT_REAL = "var LECT = { clientes: 'clientes_datos', productos: 'productos_datos', emisor: 'sociedades_emisor_datos' };";
const SIN_LECTORES = "var LECT = { clientes: null, productos: null, emisor: null };";   // simula una página sin lectores cableados (el bloqueo con motivo sigue ahí)
const CON_LECTORES = LECT_REAL;

(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });

  async function abre(opts = {}) {
    const base = nuevaBase(opts.base || {});
    const ctx = await nav.newContext({ viewport: { width: opts.ancho || 1440, height: 1000 } });
    const p = await ctx.newPage();
    await p.exposeFunction('__srv', (n, a) => servidor(base, n, a));
    await p.setContent(pagina(opts.idioma || 'es', opts.lectores === false ? SIN_LECTORES : CON_LECTORES), { waitUntil: 'load' });
    await p.waitForFunction(() => !document.querySelector('[data-vt="ops-estado"]').textContent.includes('Cargando') && !document.querySelector('[data-vt="ops-estado"]').textContent.includes('Loading'), null, { timeout: 5000 });
    return { base, p, ctx };
  }
  const txt = (p, sel) => p.$eval(sel, e => e.textContent);
  const tab = async (p, n) => { await p.click('[data-accion="vt-tab"][data-tab="' + n + '"]'); };
  const llamadas = (b, n) => b.llamadas.filter(x => x[0] === n);
  const espera = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: 5000 });
  const recarga = async p => { await p.click('[data-accion="vt-ops-actualizar"]'); await p.waitForFunction(() => { const t = document.querySelector('[data-vt="ops-estado"]').textContent; return !t.includes('Cargando') && !t.includes('Loading'); }, null, { timeout: 5000 }); };
  const dialogoVisible = p => p.$('[data-vt="dialogo"]');

  // ── 1. el recorrido entero ────────────────────────────────────────────────────────────────────
  {
    const { base, p, ctx } = await abre();
    ok('arranca pidiendo solo la lista de operaciones (nada más hasta que se abre una pestaña)', base.llamadas.map(x => x[0]).join() === 'operaciones_cola_datos');
    ok('la lista de operaciones se pinta', (await p.$$('[data-vt="ops-tabla"] tbody tr')).length === 1);
    // Reservas: XSS por contacto
    await tab(p, 'reservas');
    await espera(p, () => document.querySelectorAll('[data-vt="res-tabla"] tbody tr').length === 1);
    const celdaContacto = await p.$eval('[data-vt="res-tabla"] tbody tr', tr => tr.children[3].textContent);
    ok('el nombre de contacto de la reserva pública se pinta como TEXTO (con comillas y etiquetas dentro)', celdaContacto.includes(XSS_CONTACTO));
    ok('ningún <img>/<script>/<svg> salió del texto de la reserva ni de ningún dato', (await p.$$('[data-vt="raiz"] img, [data-vt="raiz"] svg, [data-vt="raiz"] script')).length === 0 && (await p.evaluate(() => window.__xss)) === undefined);
    ok('la reserva del bot sale marcada «Por reclamar»', (await txt(p, '[data-vt="res-tabla"] tbody tr')).includes('Por reclamar'));
    await p.check('[data-vt="f-por-reclamar"]');
    ok('el filtro «solo por reclamar» deja la reserva', (await p.$$('[data-vt="res-tabla"] tbody tr')).length === 1);
    // reclamar: elegir cliente → confirmar → solo entonces se llama
    await p.click('[data-accion="vt-reclamar"]');
    await espera(p, () => document.querySelectorAll('[data-vt="dialogo"] select option').length > 1);
    const optNombre = await p.$eval('[data-vt="dialogo"] select option[value="c1"]', o => o.textContent);
    ok('el selector de clientes pinta el nombre con etiquetas como texto', optNombre === XSS_CLIENTE);
    await p.click('[data-accion="vt-modal-continuar"]');   // sin elegir
    ok('continuar sin elegir cliente no pasa', (await txt(p, '[data-vt="dialogo"]')).includes('Elige un cliente') && (await p.$$('[data-accion="vt-modal-reclamar"]')).length === 0);
    await p.selectOption('[data-vt="dialogo"] select', 'c1');
    await p.click('[data-accion="vt-modal-continuar"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-modal-reclamar"]'));
    const conf = await txt(p, '[data-vt="dialogo"]');
    ok('la confirmación muestra cliente, importe, pago y producto', conf.includes(XSS_CLIENTE) && /700\.000/.test(conf) && conf.includes('PAY-<1>') && conf.includes('Honda Beat'), conf.slice(0, 300));
    ok('la confirmación avisa de que es irreversible', conf.includes('irreversible'));
    ok('NO se ha llamado a reserva_asigna_cliente antes de confirmar', llamadas(base, 'reserva_asigna_cliente').length === 0);
    await p.click('[data-accion="vt-modal-reclamar"]');
    await espera(p, () => !!document.querySelector('[data-vt="ficha"]:not(.vt-oculto) [data-accion="vt-crear-borrador"]'));
    const rc = llamadas(base, 'reserva_asigna_cliente');
    ok('reclamar llama una vez con reserva y cliente, nada más', rc.length === 1 && JSON.stringify(rc[0][1]) === JSON.stringify({ p_reserva: 'r1', p_cliente: 'c1' }));
    ok('tras reclamar se abre la ficha de la operación y ofrece crear el borrador', (await txt(p, '[data-vt="ficha"]')).includes('OP-0001'));
    ok('se vuelve a leer la bandeja y la cola tras reclamar', llamadas(base, 'reservas_producto_datos').length >= 2 && llamadas(base, 'reservas_cobradas_sin_facturar').length >= 1);
    // crear borrador
    await p.click('[data-accion="vt-crear-borrador"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-emitir"]'));
    const cd = llamadas(base, 'factura_desde_operacion');
    ok('crear borrador llama con la operación y sin sociedad inventada', cd.length === 1 && JSON.stringify(cd[0][1]) === JSON.stringify({ p_operacion: 'op1', p_sociedad: null }));
    ok('la ficha enseña Emitir y Descartar, y ya no Crear borrador', !!(await p.$('[data-accion="vt-descartar"]')) && !(await p.$('[data-accion="vt-crear-borrador"]')));
    // líneas: texto, sin inputs
    await p.click('[data-accion="vt-lineas"]');
    await espera(p, () => document.body.textContent.includes('Alquiler'));
    ok('las líneas llevan la descripción como texto y NO hay ningún input editable', (await txt(p, '[data-vt="ficha-facturas"]')).includes(XSS_LINEA) && (await p.$$('[data-vt="ficha-facturas"] input, [data-vt="ficha-facturas"] textarea')).length === 0);
    ok('sigue sin inyectarse nada (img/xss)', (await p.$$('[data-vt="raiz"] img')).length === 0 && (await p.evaluate(() => window.__xss)) === undefined);
    ok('el cuadro del papel enseña el aviso de que las líneas no se editan', (await txt(p, '[data-vt="ficha-facturas"]')).includes('no se editan'));
    // descartar: sin motivo no llama; con motivo sí
    await p.click('[data-accion="vt-descartar"]');
    await p.click('[data-accion="vt-modal-descartar"]');
    ok('descartar sin motivo no llama y lo dice', llamadas(base, 'factura_borrador_descarta').length === 0 && (await txt(p, '[data-vt="dialogo"]')).includes('Escribe el motivo'));
    await p.fill('[data-vt="dialogo"] textarea', 'Precio mal: rehacer');
    await p.click('[data-accion="vt-modal-descartar"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-crear-borrador"]'));
    const dc = llamadas(base, 'factura_borrador_descarta');
    ok('descartar manda id y motivo', dc.length === 1 && dc[0][1].p_id === 'f1' && dc[0][1].p_motivo === 'Precio mal: rehacer');
    ok('el borrador descartado sale como Descartado y se puede rehacer', (await txt(p, '[data-vt="ficha-facturas"]')).includes('Descartado'));
    await p.click('[data-accion="vt-crear-borrador"]');
    await espera(p, () => document.querySelectorAll('[data-accion="vt-emitir"]').length === 1);
    // emitir
    await p.click('[data-accion="vt-emitir"]');
    ok('emitir pide confirmación antes de llamar', llamadas(base, 'factura_emite').length === 0 && (await txt(p, '[data-vt="dialogo"]')).includes('número correlativo'));
    await p.click('[data-accion="vt-modal-emitir"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-rectificar"]'));
    ok('emitir manda solo el id', JSON.stringify(llamadas(base, 'factura_emite')[0][1]) === JSON.stringify({ p_id: 'f2' }));
    ok('se anuncia el NÚMERO leído de vuelta', (await txt(p, '[data-vt="exito"]')).includes('BBM-F2026-'));
    ok('la factura emitida ya no ofrece Emitir ni Descartar', !(await p.$('[data-accion="vt-emitir"]')) && !(await p.$('[data-accion="vt-descartar"]')) && !!(await p.$('[data-accion="vt-rectificar"]')));
    // rectificar por sustitución
    await p.click('[data-accion="vt-rectificar"]');
    await p.click('[data-accion="vt-modal-rectificar"]');
    ok('rectificar sin motivo no llama', llamadas(base, 'factura_rectifica').length === 0 && (await txt(p, '[data-vt="dialogo"]')).includes('Escribe el motivo'));
    await p.fill('[data-vt="dialogo"] textarea', 'NPWP del cliente mal');
    await p.click('[data-accion="vt-modal-rectificar"]');
    await espera(p, () => document.body.textContent.includes('Rectificativa sin emitir'));
    const rr = llamadas(base, 'factura_rectifica')[0][1];
    ok('sustitución: manda origen, tipo y motivo, SIN líneas', rr.p_origen === 'f2' && rr.p_tipo === 'sustitucion' && rr.p_motivo === 'NPWP del cliente mal' && !('p_lineas' in rr), JSON.stringify(rr));
    ok('la rectificativa en borrador avisa de que está sin emitir, se puede emitir y NO se puede descartar', (await p.$$('[data-accion="vt-emitir"]')).length === 1 && (await p.$$('[data-accion="vt-descartar"]')).length === 0);
    await p.click('[data-accion="vt-emitir"]');
    await p.click('[data-accion="vt-modal-emitir"]');
    await espera(p, () => document.querySelectorAll('[data-accion="vt-emitir"]').length === 0);
    ok('la rectificativa emitida lleva número R', (await txt(p, '[data-vt="exito"]')).includes('BBM-R2026-'));
    ok('nunca se llamó a .from ni a fetch, y no hubo errores de script', (await p.evaluate(() => [window.__fromLlamado, window.__fetchLlamado, window.__errores.length])).join() === '0,0,0', await p.evaluate(() => window.__errores.join('|')));
    if (SHOT) await p.screenshot({ path: SHOT, fullPage: true });
    await ctx.close();
  }

  // ── 2. rectificar por diferencias ─────────────────────────────────────────────────────────────
  {
    const { base, p, ctx } = await abre();
    base.reservas[0].client_id = 'c2'; base.ops[0].client_id = 'c2'; base.ops[0].estado = 'abierta'; await recarga(p);
    base.facturas.push({ id: 'fz', operacion_id: 'op1', tipo: 'factura', total: 700000, moneda: 'IDR', numero: 'BBM-F2026-00099', anulada: false, emitida_en: 'x', fecha_emision: '2026-10-01', created_at: 'a', rectifica_id: null, sociedad: 'bbm' });
    await p.click('[data-accion="vt-abrir-op"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-rectificar"]'));
    await p.click('[data-accion="vt-rectificar"]');
    await p.check('[data-campo="tipo"][value="diferencias"]');
    await espera(p, () => document.querySelectorAll('[data-campo="cantidad-linea"]').length === 2);
    await p.fill('[data-vt="dialogo"] textarea', 'devolvió un día');
    await p.click('[data-accion="vt-modal-rectificar"]');
    ok('diferencias sin cantidad no llama', llamadas(base, 'factura_rectifica').length === 0 && (await txt(p, '[data-vt="dialogo"]')).includes('al menos una línea'));
    await p.fill('[data-campo="cantidad-linea"][data-orden="1"]', '5');
    await p.click('[data-accion="vt-modal-rectificar"]');
    ok('diferencias con más cantidad que la facturada no llama', llamadas(base, 'factura_rectifica').length === 0 && (await txt(p, '[data-vt="dialogo"]')).includes('no puede pasar'));
    await p.fill('[data-campo="cantidad-linea"][data-orden="1"]', '1');
    await p.click('[data-accion="vt-modal-rectificar"]');
    await espera(p, () => document.body.textContent.includes('Rectificativa sin emitir'));
    const rr = llamadas(base, 'factura_rectifica')[0][1];
    ok('diferencias manda línea y cantidad, nada de importes', JSON.stringify(rr.p_lineas) === JSON.stringify([{ linea: 1, cantidad: 1 }]) && rr.p_tipo === 'diferencias', JSON.stringify(rr));
    await ctx.close();
  }

  // ── 3. emitir bloqueado / rechazos de la base ─────────────────────────────────────────────────
  {
    const { base, p, ctx } = await abre({ base: { emisorFalta: true } });
    base.reservas[0].client_id = 'c2'; base.ops[0].client_id = 'c2'; base.ops[0].estado = 'abierta'; await recarga(p);
    base.facturas.push({ id: 'fb', operacion_id: 'op1', tipo: 'factura', total: 700000, moneda: 'IDR', numero: null, anulada: false, emitida_en: null, created_at: 'a', rectifica_id: null, sociedad: 'bbm' });
    await p.click('[data-accion="vt-abrir-op"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-emitir"]:disabled'));
    ok('con el emisor incompleto (lector) «Emitir» está deshabilitado y dice por qué', (await txt(p, '[data-vt="ficha-facturas"]')).includes('Emitir no está disponible') && (await txt(p, '[data-vt="ficha-facturas"]')).includes('NPWP'));
    await p.click('[data-accion="vt-emitir"]', { force: true, noWaitAfter: true }).catch(() => {});
    ok('un botón deshabilitado no abre diálogo ni llama', !(await dialogoVisible(p)) && llamadas(base, 'factura_emite').length === 0);
    await ctx.close();
  }
  // La venta de catálogo: la ficha se abre sobre una operación origen 'venta' (factura_producto_crea), no sobre la reserva.
  const conVenta = async (baseOpts) => {
    const r = await abre({ base: baseOpts });
    r.base.ops.push({ id: 'opv9', referencia: 'V-0009', tipo: 'venta', origen: 'venta', estado: 'abierta', client_id: 'c2', moneda: 'IDR', creado_en: '2026-10-08T09:00:00Z', contratado: 150000 });
    r.base.facturas.push({ id: 'fv', operacion_id: 'opv9', tipo: 'factura', total: 150000, moneda: 'IDR', numero: null, anulada: false, emitida_en: null, created_at: 'a', rectifica_id: null, sociedad: 'bbm' });
    await recarga(r.p);
    await r.p.click('[data-accion="vt-abrir-op"][data-op-id="opv9"]');
    return r;
  };
  {
    const { base, p, ctx } = await conVenta({ emisorFalta: true });
    await espera(p, () => !!document.querySelector('[data-accion="vt-emitir"]:disabled'));
    ok('emisor incompleto bloquea también la venta de catálogo', (await txt(p, '[data-vt="ficha-facturas"]')).includes('NPWP'));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await conVenta({ impuestoFalta: true });
    await espera(p, () => !!document.querySelector('[data-accion="vt-emitir"]:disabled'));
    ok('sin impuesto configurado «Emitir» queda deshabilitado en una venta de catálogo y lo dice', (await txt(p, '[data-vt="ficha-facturas"]')).includes('impuesto'));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { impuestoFalta: true } });
    base.reservas[0].client_id = 'c2'; base.ops[0].client_id = 'c2'; base.ops[0].estado = 'abierta'; await recarga(p);
    base.facturas.push({ id: 'fb', operacion_id: 'op1', tipo: 'factura', total: 700000, moneda: 'IDR', numero: null, anulada: false, emitida_en: null, created_at: 'a', rectifica_id: null, sociedad: 'bbm' });
    await p.click('[data-accion="vt-abrir-op"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-emitir"]'));
    await espera(p, () => document.querySelectorAll('[data-accion="vt-emitir"]').length === 1);
    await new Promise(r => setTimeout(r, 300));   // deja que llegue el emisor (que ya cargó): si fuera a bloquear, ya lo habría hecho
    ok('el emisor se leyó (sociedades_emisor_datos)', llamadas(base, 'sociedades_emisor_datos').length === 1);
    ok('sin impuesto configurado «Emitir» NO se bloquea en un borrador de reserva (lo decide la base)', !(await p.$('[data-accion="vt-emitir"]:disabled')) && !(await txt(p, '[data-vt="ficha-facturas"]')).includes('Emitir no está disponible'));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { facturasForma: true } });
    await p.click('[data-accion="vt-abrir-op"]');
    await espera(p, () => document.querySelector('[data-vt="ficha-facturas"]').textContent.includes('No es que no tenga'));
    ok('si la lectura de facturas no trae {facturas:[…]} se dice que no se ha podido mirar (no «sin facturas»)', !(await txt(p, '[data-vt="ficha-facturas"]')).includes('aún no tiene facturas'));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre();
    await p.click('[data-accion="vt-abrir-op"]');
    await espera(p, () => !!document.querySelector('[data-vt="ficha"]:not(.vt-oculto)'));
    const c = llamadas(base, 'operacion_facturas_datos');
    ok('la ficha lee las facturas por operacion_facturas_datos con solo p_operacion', c.length >= 1 && JSON.stringify(c[0][1]) === JSON.stringify({ p_operacion: 'op1' }), JSON.stringify(c[0]));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { noDisponible: ['clientes_datos', 'productos_datos', 'sociedades_emisor_datos'] } });
    await tab(p, 'nueva');
    await espera(p, () => (document.querySelector('[data-vt="nueva-estado"]').textContent || '').includes('F4'));
    ok('sin RPC de clientes/productos «Nueva venta» dice que no está disponible y no ofrece crear', !(await p.$('[data-accion="vt-venta-crear"]')) && !(await txt(p, '[data-vt="nueva-estado"]')).includes('Falta el lector'));
    await tab(p, 'reservas'); await espera(p, () => document.querySelectorAll('[data-vt="res-tabla"] tbody tr').length === 1);
    await p.click('[data-accion="vt-reclamar"]');
    await espera(p, () => document.querySelector('[data-vt="dialogo"] .vt-error:not(.vt-oculto)'));
    ok('sin RPC de clientes reclamar dice que no está disponible (no deja elegir)', (await txt(p, '[data-vt="dialogo"]')).includes('F4') && llamadas(base, 'reserva_asigna_cliente').length === 0);
    await p.click('[data-accion="vt-modal-cancelar"]');
    base.reservas[0].client_id = 'c2'; base.ops[0].client_id = 'c2'; base.ops[0].estado = 'abierta'; await tab(p, 'operaciones'); await recarga(p);
    base.facturas.push({ id: 'fb', operacion_id: 'op1', tipo: 'factura', total: 700000, moneda: 'IDR', numero: null, anulada: false, emitida_en: null, created_at: 'a', rectifica_id: null, sociedad: 'bbm' });
    await p.click('[data-accion="vt-abrir-op"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-emitir"]'));
    await espera(p, () => !document.querySelector('[data-vt="aviso"]').classList.contains('vt-oculto'));
    ok('sin RPC del emisor «Emitir» sigue activo (decide la base) y se avisa de que no se pudo mirar', !(await p.$('[data-accion="vt-emitir"]:disabled')) && (await txt(p, '[data-vt="aviso"]')).includes('No se ha podido mirar'));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { truncado: true } });
    await tab(p, 'nueva');
    await espera(p, () => !!document.querySelector('[data-accion="vt-venta-crear"]'));
    ok('lectura de clientes truncada: «Nueva venta» lo avisa', (await txt(p, '[data-vt="nueva-estado"]')).includes('recortada'));
    await tab(p, 'reservas'); await espera(p, () => document.querySelectorAll('[data-vt="res-tabla"] tbody tr').length === 1);
    await p.click('[data-accion="vt-reclamar"]');
    await espera(p, () => document.querySelectorAll('[data-vt="dialogo"] select option').length > 1);
    ok('lectura de clientes truncada: reclamar lo avisa', (await txt(p, '[data-vt="dialogo"]')).includes('recortada'));
    await ctx.close();
  }
  for (const [flag, hint, texto] of [['emisorIncompleto', 'emisor_incompleto', 'NPWP'], ['clienteIncompleto', 'cliente_incompleto', 'cliente']]) {
    const { base, p, ctx } = await abre({ lectores: false, base: { [flag]: true } });
    base.reservas[0].client_id = 'c2'; base.ops[0].client_id = 'c2'; base.ops[0].estado = 'abierta'; await recarga(p);
    base.facturas.push({ id: 'fb', operacion_id: 'op1', tipo: 'factura', total: 700000, moneda: 'IDR', numero: null, anulada: false, emitida_en: null, created_at: 'a', rectifica_id: null, sociedad: 'bbm' });
    await p.click('[data-accion="vt-abrir-op"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-emitir"]'));
    ok('sin lector el botón Emitir está ACTIVO (decide la base)', !(await p.$('[data-accion="vt-emitir"]:disabled')));
    await p.click('[data-accion="vt-emitir"]');
    await p.click('[data-accion="vt-modal-emitir"]');
    await espera(p, () => document.querySelector('[data-vt="dialogo"] .vt-error:not(.vt-oculto)'));
    ok('la base rechaza (' + hint + ') y se enseña con palabras', (await txt(p, '[data-vt="dialogo"]')).includes(texto));
    await p.click('[data-accion="vt-modal-cancelar"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-emitir"]:disabled'));
    ok('tras el rechazo «Emitir» queda deshabilitado con el motivo (' + hint + ')', (await txt(p, '[data-vt="ficha-facturas"]')).includes('Emitir no está disponible'));
    await ctx.close();
  }
  {
    // el servidor no devuelve número: NO se da por emitida
    const { base, p, ctx } = await abre({ lectores: false, base: { sinNumero: true } });
    base.reservas[0].client_id = 'c2'; base.ops[0].client_id = 'c2'; base.ops[0].estado = 'abierta'; await recarga(p);
    base.facturas.push({ id: 'fb', operacion_id: 'op1', tipo: 'factura', total: 700000, moneda: 'IDR', numero: null, anulada: false, emitida_en: null, created_at: 'a', rectifica_id: null, sociedad: 'bbm' });
    await p.click('[data-accion="vt-abrir-op"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-emitir"]'));
    await p.click('[data-accion="vt-emitir"]'); await p.click('[data-accion="vt-modal-emitir"]');
    await espera(p, () => document.querySelector('[data-vt="dialogo"] .vt-error:not(.vt-oculto)'));
    ok('sin número de vuelta no se anuncia éxito', (await txt(p, '[data-vt="dialogo"]')).includes('No se da por emitida') && !(await txt(p, '[data-vt="exito"]')).trim());
    await ctx.close();
  }
  {
    // el recibí de pasarela falla: alerta, no éxito limpio
    const { base, p, ctx } = await abre({ lectores: false, base: { recibisFallan: true } });
    base.reservas[0].client_id = 'c2'; base.ops[0].client_id = 'c2'; base.ops[0].estado = 'abierta'; await recarga(p);
    base.facturas.push({ id: 'fb', operacion_id: 'op1', tipo: 'factura', total: 700000, moneda: 'IDR', numero: null, anulada: false, emitida_en: null, created_at: 'a', rectifica_id: null, sociedad: 'bbm' });
    await tab(p, 'cola'); await espera(p, () => document.querySelectorAll('[data-vt="cola-tabla"] tbody tr').length === 1);
    await p.click('[data-vt="cola-tabla"] [data-accion="vt-abrir-op"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-emitir"]'));
    await p.click('[data-accion="vt-emitir"]'); await p.click('[data-accion="vt-modal-emitir"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-rectificar"]'));
    ok('si el recibí de la pasarela no se registró, sale una ALERTA además del número', (await txt(p, '[data-vt="aviso"]')).includes('Revisa el cobro') && (await txt(p, '[data-vt="exito"]')).includes('BBM-F2026-'));
    await ctx.close();
  }

  // ── 4. la cola: los estados que NO son lo mismo ───────────────────────────────────────────────
  for (const [cola, esperado, no, nombre] of [
    ['vacia', 'No hay reservas cobradas sin facturar.', 'apagado', 'vacía de verdad'],
    ['apagado', 'está apagado', 'No hay reservas cobradas', 'Reservas apagado (con su motivo, no «vacía»)'],
    ['permiso', 'No tienes permiso', 'No hay reservas cobradas', 'sin permiso (no «vacía»)'],
    ['rara', 'algo inesperado', 'No hay reservas cobradas', 'respuesta inesperada (no «vacía»)'],
    ['normal', '', 'algo inesperado', 'con filas']]) {
    const { base, p, ctx } = await abre({ base: { cola } });
    await tab(p, 'cola');
    await espera(p, () => !document.querySelector('[data-vt="cola-estado"]').textContent.includes('Cargando'));
    const e = await txt(p, '[data-vt="cola-estado"]'), filas = (await p.$$('[data-vt="cola-tabla"] tbody tr')).length;
    ok('cola ' + nombre, e.includes(esperado) && !(no && e.includes(no)) && (cola === 'normal' ? filas === 1 : filas === 0), e);
    if (cola === 'normal') {
      ok('la cola ofrece Reclamar para la reserva sin cliente', !!(await p.$('[data-vt="cola-tabla"] [data-accion="vt-reclamar"]')));
      ok('la cola enseña los días y la antigüedad', (await txt(p, '[data-vt="cola-tabla"]')).includes('3'));
    }
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { noDisponible: ['reservas_cobradas_sin_facturar'] } });
    await tab(p, 'cola'); await espera(p, () => !document.querySelector('[data-vt="cola-estado"]').textContent.includes('Cargando'));
    const e = await txt(p, '[data-vt="cola-estado"]');
    ok('RPC no disponible (migración sin aplicar) se dice claro, no como vacía', e.includes('no está aplicada') && !e.includes('No hay reservas'), e);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { sinRed: 'reservas_cobradas_sin_facturar' } });
    await tab(p, 'cola'); await espera(p, () => !document.querySelector('[data-vt="cola-estado"]').textContent.includes('Cargando'));
    ok('la base que no responde se dice, no «vacía»', (await txt(p, '[data-vt="cola-estado"]')).includes('no ha respondido'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { noDisponible: ['operaciones_cola_datos'] } });
    ok('las operaciones sin RPC dicen «no se ha podido mirar», no «no hay»', (await txt(p, '[data-vt="ops-estado"]')).includes('no se ha podido mirar') && !(await txt(p, '[data-vt="ops-estado"]')).includes('No hay operaciones'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { facturasFalla: true } });
    await p.evaluate(() => 1);
    await p.click('[data-accion="vt-abrir-op"]');
    await espera(p, () => document.querySelector('[data-vt="ficha-facturas"]').textContent.includes('No es que no tenga'));
    ok('si no se pueden leer las facturas de la operación se dice (no «sin facturas»)', !(await txt(p, '[data-vt="ficha-facturas"]')).includes('aún no tiene facturas'));
    await ctx.close();
  }

  // ── 5. errores de las acciones ────────────────────────────────────────────────────────────────
  {
    const { base, p, ctx } = await abre({ base: { requiere3b: true } });
    base.reservas[0].client_id = 'c2'; base.ops[0].client_id = 'c2'; base.ops[0].estado = 'abierta'; await recarga(p);
    await p.click('[data-accion="vt-abrir-op"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-crear-borrador"]'));
    await p.click('[data-accion="vt-crear-borrador"]');
    await espera(p, () => !document.querySelector('[data-vt="error"]').classList.contains('vt-oculto'));
    ok('requiere_3b se explica y el botón vuelve a quedar activo', (await txt(p, '[data-vt="error"]')).includes('impuesto por defecto') && !(await p.$('[data-accion="vt-crear-borrador"]:disabled')));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { reclamoFalla: true } });
    await tab(p, 'reservas'); await espera(p, () => document.querySelectorAll('[data-vt="res-tabla"] tbody tr').length === 1);
    await p.click('[data-accion="vt-reclamar"]');
    await espera(p, () => document.querySelectorAll('[data-vt="dialogo"] select option').length > 1);
    await p.selectOption('[data-vt="dialogo"] select', 'c2'); await p.click('[data-accion="vt-modal-continuar"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-modal-reclamar"]'));
    await p.click('[data-accion="vt-modal-reclamar"]');
    await espera(p, () => document.querySelector('[data-vt="dialogo"] .vt-error:not(.vt-oculto)'));
    ok('si la base rechaza el reclamo se enseña dentro del diálogo y no se cierra', (await txt(p, '[data-vt="dialogo"]')).includes('ya tiene cliente'));
    await p.keyboard.press('Escape');
    ok('ESC cierra el diálogo', !(await dialogoVisible(p)));
    await ctx.close();
  }

  // ── 6. sin lectores: reclamar y nueva venta salen BLOQUEADAS ──────────────────────────────────
  {
    const { base, p, ctx } = await abre({ lectores: false });
    await tab(p, 'reservas'); await espera(p, () => document.querySelectorAll('[data-vt="res-tabla"] tbody tr').length === 1);
    await p.click('[data-accion="vt-reclamar"]');
    ok('sin lector de clientes, reclamar dice que falta y no llama', (await txt(p, '[data-vt="dialogo"]')).includes('Falta el lector de clientes') && llamadas(base, 'reserva_asigna_cliente').length === 0);
    await p.click('[data-accion="vt-modal-cancelar"]');
    await tab(p, 'nueva');
    ok('sin lectores, «Nueva venta» está bloqueada con motivo', (await txt(p, '[data-vt="nueva-form"]')).includes('Falta el lector') && !(await p.$('[data-accion="vt-venta-crear"]')));
    await ctx.close();
  }

  // ── 7. nueva venta ────────────────────────────────────────────────────────────────────────────
  {
    const { base, p, ctx } = await abre({ base: { lento: 150, ventaFalla: true } });
    await tab(p, 'nueva');
    await espera(p, () => !!document.querySelector('[data-accion="vt-venta-crear"]'));
    await p.click('[data-accion="vt-venta-crear"]');
    ok('crear sin cliente ni producto no llama', llamadas(base, 'factura_producto_crea').length === 0 && (await txt(p, '[data-vt="error"]')).includes('Elige un cliente'));
    await p.selectOption('[data-campo="venta-cliente"]', 'c1');
    await p.selectOption('[data-campo="venta-producto"]', 'p1');
    await p.fill('[data-campo="venta-cantidad"]', '2');
    await p.click('[data-accion="vt-venta-crear"]');
    await p.click('[data-accion="vt-venta-crear"]', { force: true }).catch(() => {});   // doble clic: el segundo no sale
    await espera(p, () => !document.querySelector('[data-vt="error"]').classList.contains('vt-oculto'));
    const c1 = llamadas(base, 'factura_producto_crea');
    ok('doble clic = una sola llamada', c1.length === 1);
    ok('la venta manda cliente, moneda, producto y cantidad: ni precio ni total', JSON.stringify(Object.keys(c1[0][1]).sort()) === JSON.stringify(['p_cliente', 'p_clave', 'p_lineas', 'p_moneda', 'p_sociedad'].sort())
       && JSON.stringify(c1[0][1].p_lineas) === JSON.stringify([{ producto_id: 'p1', cantidad: 2 }]) && c1[0][1].p_sociedad === null && c1[0][1].p_moneda === 'IDR', JSON.stringify(c1[0][1]));
    ok('la clave de idempotencia cumple el formato de la base', /^[A-Za-z0-9_-]{8,80}$/.test(c1[0][1].p_clave));
    ok('fallo de red: se dice y el botón vuelve a estar activo', (await txt(p, '[data-vt="error"]')).includes('no ha respondido') && !(await p.$('[data-accion="vt-venta-crear"]:disabled')));
    await p.click('[data-accion="vt-venta-crear"]');
    await espera(p, () => document.querySelector('[data-vt="ficha"]:not(.vt-oculto)'));
    const c2 = llamadas(base, 'factura_producto_crea');
    ok('el reintento con el mismo contenido repite LA MISMA clave', c2.length === 2 && c2[1][1].p_clave === c1[0][1].p_clave);
    ok('la venta creada abre su ficha con el borrador', (await txt(p, '[data-vt="ficha"]')).includes('V-000'));
    await tab(p, 'nueva');
    await espera(p, () => !!document.querySelector('[data-accion="vt-venta-crear"]'));
    await p.selectOption('[data-campo="venta-cliente"]', 'c2'); await p.selectOption('[data-campo="venta-producto"]', 'p2'); await p.fill('[data-campo="venta-cantidad"]', '1');
    await p.click('[data-accion="vt-venta-crear"]');
    for (let i = 0; i < 50 && llamadas(base, 'factura_producto_crea').length < 3; i++) await new Promise(r => setTimeout(r, 100));
    ok('otro contenido = otra clave', llamadas(base, 'factura_producto_crea')[2][1].p_clave !== c1[0][1].p_clave);
    await ctx.close();
  }

  // ── 8. inglés: nada sin traducir ─────────────────────────────────────────────────────────────
  {
    const { base, p, ctx } = await abre({ idioma: 'en', base: {} });
    await tab(p, 'reservas'); await espera(p, () => document.querySelectorAll('[data-vt="res-tabla"] tbody tr').length === 1);
    await p.click('[data-accion="vt-reclamar"]');
    await espera(p, () => document.querySelectorAll('[data-vt="dialogo"] select option').length > 1);
    await p.selectOption('[data-vt="dialogo"] select', 'c2'); await p.click('[data-accion="vt-modal-continuar"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-modal-reclamar"]'));
    await p.click('[data-accion="vt-modal-reclamar"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-crear-borrador"]'));
    await p.click('[data-accion="vt-crear-borrador"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-emitir"]'));
    await p.click('[data-accion="vt-lineas"]'); await espera(p, () => document.body.textContent.includes('Alquiler'));
    await p.click('[data-accion="vt-descartar"]'); await p.click('[data-accion="vt-modal-cancelar"]');
    await p.click('[data-accion="vt-emitir"]'); await p.click('[data-accion="vt-modal-emitir"]');
    await espera(p, () => !!document.querySelector('[data-accion="vt-rectificar"]'));
    await p.click('[data-accion="vt-rectificar"]'); await p.check('[data-campo="tipo"][value="diferencias"]'); await espera(p, () => document.querySelectorAll('[data-campo="cantidad-linea"]').length === 2);
    await p.click('[data-accion="vt-modal-rectificar"]'); await p.click('[data-accion="vt-modal-cancelar"]');
    await tab(p, 'cola'); await espera(p, () => document.querySelectorAll('[data-vt="cola-tabla"] tbody tr').length === 1);
    await tab(p, 'nueva'); await tab(p, 'operaciones');
    const sin = await p.evaluate(() => Array.from(new Set(window.__sinEn)));
    ok('en inglés no queda ningún texto sin traducir', sin.length === 0, JSON.stringify(sin));
    ok('en inglés los títulos salen en inglés', (await txt(p, '[data-vt="raiz"]')).includes('Sales') && (await txt(p, 'button[data-tab="cola"]')) === 'Paid, not invoiced');
    await ctx.close();
  }

  // ── 9. móvil ──────────────────────────────────────────────────────────────────────────────────
  {
    const { base, p, ctx } = await abre({ ancho: 390 });
    await tab(p, 'reservas'); await espera(p, () => document.querySelectorAll('[data-vt="res-tabla"] tbody tr').length === 1);
    ok('a 390 px la página no desborda en horizontal (las tablas se desplazan dentro de su caja)', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await p.evaluate(() => document.documentElement.scrollWidth + '>' + window.innerWidth));
    await ctx.close();
  }

  await nav.close();
  console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\nTODO EN VERDE');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
