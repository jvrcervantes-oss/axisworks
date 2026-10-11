// node comercial/demo-erp/pruebas/reservas_producto.harness.cjs [captura_prefijo]
// Harness de la pantalla Reservas de producto del maestro (F8 pieza 1, 8-oct-2026): el reservas_producto.html REAL (marcado + script) en Chromium, con la base y
// la sesion SIMULADAS (page.exposeFunction): una base en memoria que imita lo que dicen las RPC de la migracion 20260930100000 (+ F1/F4/F8-1) en firmas, formas y
// errores con hint. Mide el COMPORTAMIENTO, no el codigo: que pide y con que argumentos, que pinta con cada respuesta, XSS por nombre/matricula/direccion, los
// estados de error, que el precio nunca viaja, que una moto en taller no se ofrece, y que a 390 px no hay scroll horizontal de pagina.
// OJO: la base real NO se ha tocado. Lo que sale de aqui prueba la pantalla contra mi lectura de las migraciones, no contra Postgres (eso lo hace la prueba SQL en rama).
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const FUENTE = fs.readFileSync(path.join(__dirname, '..', 'reservas_producto.html'), 'utf8');
const [MARCADO, SCRIPT] = FUENTE.split('<!--AXW_SCRIPT-->');
const SHOT = process.argv[2];
let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' -> ' + extra : '')); } else console.log('ok     ' + nombre); };

const XSS_CONTACTO = `"><img src=x onerror="window.__xss=1"> O'Brien <script>window.__xss=2</script>`;
const XSS_MATRICULA = `DK 1234 <b>"X"</b> 'Y' <svg onload="window.__xss=3">`;
const XSS_DIR = `Calle <img src=x onerror="window.__xss=4"> 'Uno' "Dos"`;
const HOY = new Date();
const iso = d => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
const mas = n => { const d = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() + n); return iso(d); };

function nuevaBase(o = {}) {
  return {
    llamadas: [], seq: 0, o,
    clientes: [{ id: 'c1', nombre: 'Ana <b>Q</b>' }, { id: 'c2', nombre: 'Bob' }],
    productos: [{ id: 'p1', numero: 'PRD-1', nombre: 'Honda Beat', activo: true,
      unidades: [{ id: 'u1', numero: 'UND-1', identificador: XSS_MATRICULA, estado: 'disponible', notas: null },
                 { id: 'u2', numero: 'UND-2', identificador: 'DK 2', estado: 'disponible', notas: null },
                 { id: 'u3', numero: 'UND-3', identificador: 'DK 3 TALLER', estado: 'taller', notas: 'frenos' }],
      tarifas: [{ id: 't1', dias: 1, precio: 100000, moneda: 'IDR', etiqueta: 'dia' }, { id: 't2', dias: 7, precio: 600000, moneda: 'IDR', etiqueta: null }] }],
    reservas: [
      { id: 'r1', numero: 'RSV-1', producto_id: 'p1', producto: 'Honda Beat', unidad_id: 'u1', unidad: XSS_MATRICULA, client_id: null, cliente_oculto: false, contacto_nombre: XSS_CONTACTO,
        contacto_telefono: '+6281', desde: mas(1), hasta: mas(4), dias: 3, estado: 'bloqueo', origen: 'bot', caduca_en: new Date(Date.now() + 3600e3).toISOString(), precio_total: 300000, moneda: 'IDR',
        desglose: [{ dias: 1, veces: 3, precio: 100000, etiqueta: 'dia' }], entrega_direccion: XSS_DIR, recogida_direccion: null, pago_referencia: null, notas: null, creado_en: new Date().toISOString(), creado_por: 'bot', sin_reclamar: true },
      { id: 'r2', numero: 'RSV-2', producto_id: 'p1', producto: 'Honda Beat', unidad_id: 'u2', unidad: 'DK 2', client_id: 'c2', cliente_oculto: false, contacto_nombre: 'Bob', contacto_telefono: null,
        desde: mas(0), hasta: mas(3), dias: 3, estado: 'confirmada', origen: 'equipo', caduca_en: null, precio_total: 300000, moneda: 'IDR', desglose: [], entrega_direccion: null, recogida_direccion: null,
        pago_referencia: 'PAY-9', notas: null, creado_en: new Date().toISOString(), creado_por: 'yo@x.com' },
      { id: 'r3', numero: 'RSV-3', producto_id: 'p1', producto: 'Honda Beat', unidad_id: 'u1', unidad: XSS_MATRICULA, client_id: 'c1', cliente_oculto: false, contacto_nombre: 'Ana', contacto_telefono: null,
        desde: mas(-5), hasta: mas(-2), dias: 3, estado: 'en_curso', origen: 'equipo', caduca_en: null, precio_total: 300000, moneda: 'IDR', desglose: [], entrega_direccion: null, recogida_direccion: null,
        pago_referencia: null, notas: null, creado_en: new Date().toISOString(), creado_por: 'yo@x.com' },
      { id: 'r4', numero: 'RSV-4', producto_id: 'p1', producto: 'Honda Beat', unidad_id: 'u2', unidad: 'DK 2', client_id: null, cliente_oculto: false, contacto_nombre: 'Cai', contacto_telefono: null,
        desde: mas(10), hasta: mas(12), dias: 2, estado: 'confirmada', origen: 'equipo', caduca_en: null, precio_total: 200000, moneda: 'IDR', desglose: [], entrega_direccion: null, recogida_direccion: null,
        pago_referencia: null, notas: null, creado_en: new Date().toISOString(), creado_por: 'yo@x.com' }
    ],
    pagos: [{ id: 'g1', reserva_id: 'r2', reserva: 'RSV-2', referencia: 'PAY-X <b>', importe: 300000, moneda: 'IDR', motivo: 'llego tarde', recibido_en: new Date().toISOString(), resuelto_en: null, resuelto_por: null, resolucion: null }]
  };
}
const err = (code, message, hint) => ({ data: null, error: { code, message, hint: hint || null } });
async function servidor(b, nombre, a) {
  b.llamadas.push([nombre, JSON.parse(JSON.stringify(a))]);
  const o = b.o;
  if (o.lento) await new Promise(r => setTimeout(r, o.lento));
  if (o.sinRed && nombre === o.sinRed) return { data: null, error: { message: 'Failed to fetch' } };
  if (o.noDisponible && o.noDisponible.includes(nombre)) return err('PGRST202', 'Could not find the function public.' + nombre + ' in the schema cache');
  if (o.moduloApagado && nombre.endsWith('_datos')) return err('42501', 'Modulo no activo', null);
  switch (nombre) {
    case 'reservas_producto_datos': {
      if (o.buscaFalla && !a.p_desde) return { data: null, error: { message: 'Failed to fetch' } };
      let l = b.reservas;
      if (a.p_estado) l = l.filter(r => r.estado === a.p_estado);
      if (a.p_desde) l = l.filter(r => r.hasta > a.p_desde);
      if (a.p_hasta) l = l.filter(r => r.desde < a.p_hasta);
      return { data: { reservas: o.sinSiguiente === false ? l : l, siguiente: o.pagina && !a.p_despues ? 'r1' : null }, error: null };
    }
    case 'producto_flota_datos': return { data: { productos: JSON.parse(JSON.stringify(b.productos)), recortado: false }, error: null };
    case 'reserva_producto_pagos_datos':
      if (o.pagosNoAdmin) return err('42501', 'reserva_producto_pagos_datos: solo administración');
      return { data: { pagos: a.p_pendientes ? b.pagos.filter(g => !g.resuelto_en) : b.pagos, siguiente: null }, error: null };
    case 'clientes_datos':
      if (o.clientesFalla) return err('42501', 'clientes_datos: sin acceso');
      return { data: { clientes: b.clientes, truncado: !!o.truncado }, error: null };
    case 'reserva_producto_crea': {
      if (o.creaLento) await new Promise(r => setTimeout(r, o.creaLento));
      if (o.creaSinRed) return { data: null, error: { message: 'Failed to fetch' } };
      if (o.creaFalla) return err('23P01', 'No queda ninguna unidad libre de ese producto en esas fechas', 'sin_disponibilidad');
      if (o.creaReglaSinHint) return err('22023', 'El campo notas es demasiado largo');
      if (o.creaClaveRepetida) return err('23505', 'Esa clave ya tiene una reserva en bloqueo', 'clave_repetida');
      const pd = a.p_datos;
      if (pd.clave && b.reservas.some(r => r.clave === pd.clave && r.estado === 'bloqueo')) return err('23505', 'Esa clave ya tiene una reserva en bloqueo', 'clave_repetida');
      const id = 'rn' + (++b.seq);
      const dias = Math.round((new Date(pd.hasta) - new Date(pd.desde)) / 864e5);
      const precio = o.creaOtroPrecio ? 777000 : dias * 100000;
      const r = { id, numero: 'RSV-' + (10 + b.seq), producto_id: pd.producto_id, producto: 'Honda Beat', unidad_id: pd.unidad_id || 'u2', unidad: 'DK 2', client_id: pd.client_id || null,
        cliente_oculto: false, contacto_nombre: pd.contacto_nombre || 'Ana', contacto_telefono: pd.contacto_telefono || null, desde: pd.desde, hasta: pd.hasta, dias,
        estado: a.p_bloqueo_minutos ? 'bloqueo' : 'confirmada', origen: 'equipo', caduca_en: a.p_bloqueo_minutos ? new Date(Date.now() + a.p_bloqueo_minutos * 60e3).toISOString() : null,
        precio_total: precio, moneda: 'IDR', desglose: [], entrega_direccion: pd.entrega_direccion || null, recogida_direccion: pd.recogida_direccion || null, pago_referencia: null,
        notas: pd.notas || null, creado_en: new Date().toISOString(), creado_por: 'yo@x.com', clave: pd.clave || null };
      b.reservas.unshift(r);
      if (o.creaSinRespuesta) return { data: null, error: { message: 'Failed to fetch' } };   // se creó, pero la respuesta no llegó
      if (o.creaSinId) return { data: {}, error: null };
      return { data: { id, numero_reserva: r.numero, estado: r.estado, precio_total: precio, moneda: 'IDR' }, error: null };
    }
    case 'reserva_producto_cotiza': {
      if (o.cotizaImpuesto) return err('22023', 'Falta decir si las tarifas llevan el impuesto incluido (precio_incluye_impuesto = si | no): lo fija el gestor', 'impuesto_no_configurado');
      if (a.p_desde < mas(0)) return err('22023', 'La recogida no puede ser en el pasado');
      const pr = b.productos.find(x => x.id === a.p_producto_id);
      if (!pr) return err('P0002', 'Ese producto no existe o no está activo');
      const dias = Math.round((new Date(a.p_hasta) - new Date(a.p_desde)) / 864e5);
      const libres = pr.unidades.filter(u => u.estado === 'disponible' && !b.reservas.some(r => r.unidad_id === u.id && ['bloqueo', 'confirmada', 'en_curso'].includes(r.estado) && r.desde < a.p_hasta && a.p_desde < r.hasta)).length;
      const total = dias * 100000, baseImp = Math.round(total / 1.11);
      return { data: { dias, total, precio: total, moneda: 'IDR', base: baseImp, impuestos: total - baseImp, incluye_impuesto: true, impuesto: { nombre: 'PPN', porcentaje: 11 },
        disponibles: o.lleno && o.lleno.includes(pr.id) ? 0 : libres, desglose: [], lineas: [], producto_id: pr.id, desde: a.p_desde, hasta: a.p_hasta }, error: null };
    }
    case 'reserva_producto_estado': {
      const r = b.reservas.find(x => x.id === a.p_id);
      if (o.estadoFalla) return err('22023', 'Una reserva «' + r.estado + '» no puede pasar a «' + a.p_estado + '»', 'estado');
      if (o.estadoMal) return { data: 'otra', error: null };
      r.estado = a.p_estado; r.caduca_en = null;
      return { data: a.p_estado, error: null };
    }
    case 'reserva_cancela_con_devolucion': {
      const r = b.reservas.find(x => x.id === a.p_reserva);
      if (o.devFalla) return err('22023', 'Solo hay 300000 IDR cobrados por devolver y se piden 999999: no se devuelve más de lo cobrado', 'importe_excede');
      if (o.devSinPermiso) return err('42501', 'Cancelar con devolución exige las herramientas «Facturas» y «Reservas de producto»');
      r.estado = 'cancelada';
      return { data: { reserva_id: r.id, estado: 'cancelada', rectificativas: [], devuelto: a.p_importe_devuelto, retenido: 300000 - a.p_importe_devuelto, moneda: 'IDR',
        aviso: 300000 - a.p_importe_devuelto > 0 ? 'Queda ' + (300000 - a.p_importe_devuelto) + ' IDR cobrado y sin factura' : null }, error: null };
    }
    case 'reserva_producto_cambia_unidad': {
      const r = b.reservas.find(x => x.id === a.p_id);
      if (o.cambiaFalla) return err('23P01', 'Esa unidad ya está reservada en esas fechas', 'sin_disponibilidad');
      r.unidad_id = a.p_unidad_id; r.unidad = 'DK 2';
      return { data: a.p_unidad_id, error: null };
    }
  }
  return err('42883', 'funcion desconocida ' + nombre);
}

const pagina = (idioma, FICHA = 'undefined') => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title></head><body>
${MARCADO}
<script>
window.__xss = undefined; window.__fromLlamado = 0; window.__fetchLlamado = 0; window.__sinEn = []; window.__errores = [];
window.fetch = function () { window.__fetchLlamado++; return Promise.reject(new Error('fetch')); };
var sb = {
  rpc: function (n, a) { return { then: function (f, g) { return window.__srv(n, a || {}).then(f, g); } }; },
  from: function () { window.__fromLlamado++; throw new Error('el navegador no toca la base'); },
  auth: { getSession: function () { return Promise.resolve({ data: { session: { access_token: 'JWT' } } }); } }
};
window.LW_AUTH = Promise.resolve({ sb: sb, ficha: ${FICHA} });
window.lwDatos = function (n, a) { return Promise.resolve(sb.rpc(n, a)).then(function (r) { return { data: r.data, error: r.error }; }); };
window.LW_IDIOMA = '${idioma}';
window.LW_EN = {}; window.__sinId = [];
if ('${idioma}' === 'id') window.LW_ID = {};
window.lwLocale = function () { return window.LW_IDIOMA === 'en' ? 'en-GB' : (window.LW_IDIOMA === 'id' ? 'id-ID' : 'es-ES'); };
window.lwT = function (s) { s = String(s); if (window.LW_IDIOMA === 'id') { if (Object.prototype.hasOwnProperty.call(window.LW_ID, s)) return window.LW_ID[s]; if (!/^[\\s\u2014\u00b70-9.,%():]*$/.test(s)) window.__sinId.push(s); return Object.prototype.hasOwnProperty.call(window.LW_EN, s) ? window.LW_EN[s] : s; } if (window.LW_IDIOMA === 'en') { if (Object.prototype.hasOwnProperty.call(window.LW_EN, s)) return window.LW_EN[s]; if (!/^[\\s\u2014\u00b70-9.,%():]*$/.test(s)) window.__sinEn.push(s); } return s; };
window.lwIdiomaAplicar = function (raiz) { Array.prototype.forEach.call(raiz.querySelectorAll('[data-lwt]'), function (e) { e.textContent = window.lwT(e.textContent); }); };
window.onerror = function (m) { window.__errores.push(String(m)); };
</script>
<script>${SCRIPT.replace(/<\/?script>/g, '')}</script></body></html>`;

(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  // barras de scroll VISIBLES (Calidad: medir con barras, que es como lo ve el operario en Windows)
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, ignoreDefaultArgs: ['--hide-scrollbars'] });
  async function abre(opts = {}) {
    const base = nuevaBase(opts.base || {});
    if (base.o.gemela) base.reservas.push({ id: 'r6', numero: 'RSV-6', producto_id: 'p1', producto: 'Honda Beat', unidad_id: 'u1', unidad: 'DK 1', client_id: null, cliente_oculto: false,
      contacto_nombre: 'Dewi Lestari', contacto_telefono: '+6281234567890', desde: mas(20), hasta: mas(22), dias: 2, estado: 'confirmada', origen: 'equipo', caduca_en: null, precio_total: 200000, moneda: 'IDR',
      desglose: [], entrega_direccion: null, recogida_direccion: null, pago_referencia: null, notas: null, creado_en: new Date().toISOString(), creado_por: 'yo@x.com' });
    if (base.o.dupTel) base.reservas.push({ id: 'r5', numero: 'RSV-5', producto_id: 'p1', producto: 'Honda Beat', unidad_id: 'u2', unidad: 'DK 2', client_id: null, cliente_oculto: false,
      contacto_nombre: 'Dewi Lestari', contacto_telefono: '+62 812-3456-7890', desde: mas(21), hasta: mas(25), dias: 4, estado: 'confirmada', origen: 'bot', caduca_en: null, precio_total: 400000, moneda: 'IDR',
      desglose: [], entrega_direccion: null, recogida_direccion: null, pago_referencia: null, notas: null, creado_en: new Date().toISOString(), creado_por: 'bot' });
    const ctx = await nav.newContext({ viewport: { width: opts.ancho || 1440, height: opts.alto || 1000 } });
    const p = await ctx.newPage();
    await p.exposeFunction('__srv', (n, a) => servidor(base, n, a));
    if (opts.url) {   // origen de verdad (sessionStorage no vive en about:blank)
      await p.route('http://rp.prueba/', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: pagina(opts.idioma || 'es', opts.ficha) }));
      await p.goto('http://rp.prueba/', { waitUntil: 'load' });
    } else await p.setContent(pagina(opts.idioma || 'es', opts.ficha), { waitUntil: 'load' });
    await p.waitForFunction(() => { const t = document.querySelector('[data-rp="res-estado"]').textContent; return !t.includes('Cargando') && !t.includes('Loading'); }, null, { timeout: 5000 });
    return { base, p, ctx };
  }
  const txt = (p, sel) => p.$eval(sel, e => e.textContent);
  const tab = async (p, n) => { await p.click('[data-accion="rp-tab"][data-tab="' + n + '"]'); };
  const llamadas = (b, n) => b.llamadas.filter(x => x[0] === n);
  const espera = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: 5000 });
  const filas = p => p.$$('[data-rp="res-tabla"] tbody tr');
  const sinInyeccion = async p => (await p.$$('[data-rp="raiz"] img, [data-rp="raiz"] svg, [data-rp="raiz"] script')).length === 0 && (await p.evaluate(() => window.__xss)) === undefined;

  // 1. arranque, lista, XSS y botones por estado
  {
    const { base, p, ctx } = await abre();
    ok('arranca pidiendo solo la lista de reservas', base.llamadas.map(x => x[0]).join() === 'reservas_producto_datos');
    ok('la lista pinta las 4 reservas', (await filas(p)).length === 4);
    const t1 = await p.$eval('[data-reserva-id="r1"]', tr => tr.textContent);
    ok('el contacto de la reserva publica y la matricula con etiquetas/comillas se pintan como TEXTO', t1.includes(XSS_CONTACTO) && t1.includes(XSS_MATRICULA));
    ok('ningun <img>/<script>/<svg> salio de ningun dato', await sinInyeccion(p));
    ok('la reserva del bot sale «Por reclamar»', t1.includes('Por reclamar'));
    const botones = async id => (await p.$$eval('[data-reserva-id="' + id + '"] [data-accion]', bs => bs.map(b => b.getAttribute('data-accion')))).join();
    ok('bloqueo: detalle, confirmar, cancelar, cambiar unidad', (await botones('r1')) === 'rp-detalle,rp-confirmar,rp-cancelar-simple,rp-cambia-unidad', await botones('r1'));
    ok('confirmada SIN pago: entregar, cancelar, cancelar con devolucion, cambiar unidad', (await botones('r4')) === 'rp-detalle,rp-entregar,rp-cancelar-simple,rp-cancelar-devolucion,rp-cambia-unidad', await botones('r4'));
    ok('confirmada CON pago: no se ofrece la cancelacion sin devolucion', (await botones('r2')) === 'rp-detalle,rp-entregar,rp-cancelar-devolucion,rp-cambia-unidad', await botones('r2'));
    ok('en curso: solo marcar devuelta y cambiar de unidad', (await botones('r3')) === 'rp-detalle,rp-devuelta,rp-cambia-unidad', await botones('r3'));
    // detalle
    await p.click('[data-reserva-id="r1"] [data-accion="rp-detalle"]');
    const det = await txt(p, '[data-rp="dialogo"]');
    ok('el detalle enseña el desglose y la direccion como texto', det.includes('3 ×') && det.includes(XSS_DIR) && await sinInyeccion(p));
    await p.click('[data-accion="rp-modal-cerrar"]');
    ok('nada escribio por .from ni por fetch', (await p.evaluate(() => window.__fromLlamado + window.__fetchLlamado)) === 0);
    ok('ningun error de JS', (await p.evaluate(() => window.__errores)).length === 0);
    await ctx.close();
  }

  // 2. cambios de estado: pide confirmacion, manda id/estado/nota, no se da por hecho si la base devuelve otra cosa
  {
    const { base, p, ctx } = await abre();
    await p.click('[data-reserva-id="r1"] [data-accion="rp-confirmar"]');
    ok('confirmar pide confirmacion antes de llamar', llamadas(base, 'reserva_producto_estado').length === 0);
    await p.fill('[data-rp="dialogo"] textarea', 'cliente pago en caja');
    await p.click('[data-accion="rp-modal-estado"]');
    await espera(p, () => !document.querySelector('[data-rp="dialogo"]'));
    const ce = llamadas(base, 'reserva_producto_estado');
    ok('confirmar manda id, estado y nota, nada mas', ce.length === 1 && JSON.stringify(ce[0][1]) === JSON.stringify({ p_id: 'r1', p_estado: 'confirmada', p_nota: 'cliente pago en caja' }), JSON.stringify(ce));
    ok('se anuncia el exito y se vuelve a leer la lista', (await txt(p, '[data-rp="exito"]')).includes('confirmada') && llamadas(base, 'reservas_producto_datos').length >= 2);
    ok('la fila pasa a Confirmada (leida de vuelta)', (await p.$eval('[data-reserva-id="r1"]', tr => tr.textContent)).includes('Confirmada'));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { estadoMal: true } });
    await p.click('[data-reserva-id="r1"] [data-accion="rp-confirmar"]');
    await p.click('[data-accion="rp-modal-estado"]');
    await espera(p, () => !document.querySelector('[data-rp="dialogo"] [data-accion="rp-modal-estado"]:disabled'));
    ok('si la base devuelve otro estado NO se da por confirmada y se dice', (await txt(p, '[data-rp="dialogo"]')).includes('no confirmó') && (await txt(p, '[data-rp="exito"]')) === '');
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { estadoFalla: true } });
    await p.click('[data-reserva-id="r1"] [data-accion="rp-confirmar"]');
    await p.click('[data-accion="rp-modal-estado"]');
    await espera(p, () => document.querySelector('[data-rp="dialogo"] .rp-error:not(.rp-oculto)'));
    ok('una regla de la base («no puede pasar a») se enseña con sus palabras y el dialogo sigue abierto', (await txt(p, '[data-rp="dialogo"] .rp-error')).includes('no puede pasar') );
    await ctx.close();
  }

  // 3. «Nueva reserva» = asistente por pasos (P13, owner 11-oct-2026: «que los operarios se equivoquen lo menos posible»).
  //    Cada E<n> es uno de los 12 errores tipicos de operario de la prueba de aceptacion (lista en el encargo): se comprueba QUE HACE la pantalla con el.
  const dlg = p => txt(p, '[data-rp="dialogo"]');
  const sig = p => p.click('[data-accion="rp-modal-as-sig"]');
  const enPaso = (p, paso) => espera(p, x => document.querySelector('[data-rp="dialogo"] [data-paso="' + x + '"]'), paso);
  const motosListas = p => espera(p, () => document.querySelector('[data-rp="dialogo"] [data-paso="moto"]') && !document.querySelector('[data-rp="dialogo"] [data-estado="cargando"]')
    && !document.querySelector('[data-rp="dialogo"] [data-paso="moto"] p[role="status"]'));
  async function dia(p, s) {
    for (let i = 0; i < 3 && !(await p.$('[data-accion="rp-modal-as-dia"][data-dia="' + s + '"]')); i++) {
      const primero = await p.$eval('[data-accion="rp-modal-as-dia"]', b => b.getAttribute('data-dia'));
      await p.click('[data-accion="rp-modal-as-mes"][data-mes="' + (s < primero ? '-1' : '1') + '"]');
    }
    await p.click('[data-accion="rp-modal-as-dia"][data-dia="' + s + '"]');
  }
  async function hastaMoto(p, d1 = mas(20), d2 = mas(22)) {
    await p.click('[data-accion="rp-nueva"]'); await enPaso(p, 'fechas');
    await dia(p, d1); await dia(p, d2); await sig(p); await enPaso(p, 'moto'); await motosListas(p);
  }
  async function hastaCliente(p) { await hastaMoto(p); await p.click('[data-accion="rp-modal-as-moto"][data-producto-id="p1"]'); await sig(p); await enPaso(p, 'cliente'); }
  async function hastaResumen(p, tel = '0812 3456 7890', nombre = 'Dewi Lestari') {
    await hastaCliente(p);
    await p.fill('[data-as="numero"]', tel); await p.fill('[data-as="nombre"]', nombre); await sig(p); await enPaso(p, 'entrega');
    await sig(p); await enPaso(p, 'resumen');
  }
  const confirma = async (p, modo = 'confirmada') => { await p.click('[data-accion="rp-modal-as-opcion"][data-campo="modo"][data-valor="' + modo + '"]'); await p.click('[data-accion="rp-modal-as-confirma"]'); };
  {
    const { base, p, ctx } = await abre();
    await p.click('[data-accion="rp-nueva"]'); await enPaso(p, 'fechas');
    ok('abrir el asistente no pide nada a la base todavia', base.llamadas.filter(x => x[0] !== 'reservas_producto_datos').length === 0);
    const pasados = await p.$$eval('[data-accion="rp-modal-as-dia"]', (bs, hoy) => bs.filter(b => b.getAttribute('data-dia') < hoy).map(b => b.disabled), mas(0));
    ok('E1 · fecha pasada: los dias pasados no se pueden tocar (ni ir al mes anterior)', pasados.every(Boolean) && await p.$eval('[data-accion="rp-modal-as-mes"][data-mes="-1"]', b => b.disabled));
    await sig(p);
    ok('E2 · Siguiente sin fechas: no avanza, no llama a la base y lo dice', (await dlg(p)).includes('Elige en el calendario') && llamadas(base, 'reserva_producto_cotiza').length === 0);
    await dia(p, mas(20)); await dia(p, mas(18));
    const linea = await txt(p, '[data-rp="as-linea"]');
    ok('E3 · tocar un dia ANTERIOR a la recogida la mueve: nunca queda una devolucion antes de la recogida', linea.includes('ahora toca el día de devolución') && !(await p.$('[data-sel="fin"]')), linea);
    await dia(p, mas(18));
    ok('E3 · tocar otra vez la recogida la quita: no se puede devolver el mismo dia', (await txt(p, '[data-rp="as-linea"]')).includes('Toca el día de recogida'));
    await dia(p, mas(20)); await dia(p, mas(22));
    ok('fechas: la linea en palabras dice recogida → devolucion y los dos dias van marcados (aria-pressed)', (await txt(p, '[data-rp="as-linea"]')).includes('→') && (await p.$$('[data-accion="rp-modal-as-dia"][aria-pressed="true"]')).length === 2);
    await sig(p); await enPaso(p, 'moto'); await motosListas(p);
    const co = llamadas(base, 'reserva_producto_cotiza');
    ok('moto: la base cotiza cada modelo listo con SOLO producto y fechas', co.length === 1 && JSON.stringify(co[0][1]) === JSON.stringify({ p_producto_id: 'p1', p_desde: mas(20), p_hasta: mas(22) }), JSON.stringify(co));
    const tarjeta = await txt(p, '[data-accion="rp-modal-as-moto"][data-producto-id="p1"]');
    ok('la tarjeta ensena el precio de la base y cuantas quedan', tarjeta.includes('200.000') && /Quedan 2/.test(tarjeta), tarjeta);
    await sig(p);
    ok('Siguiente sin moto no avanza', (await dlg(p)).includes('Elige una moto'));
    await p.click('[data-accion="rp-modal-as-moto"][data-producto-id="p1"]');
    const mats = await p.$$eval('[data-as="unidad"] option', os => os.map(o => o.textContent));
    ok('E4 · moto en taller: no se ofrece; matricula solo entre las disponibles y libres', !mats.some(m => m.includes('TALLER')) && mats.length === 3 && mats.includes(XSS_MATRICULA), JSON.stringify(mats));
    await p.click('[data-accion="rp-modal-as-atras"]'); await enPaso(p, 'fechas');
    ok('Atras conserva las fechas', (await p.$$('[data-accion="rp-modal-as-dia"][aria-pressed="true"]')).length === 2);
    await sig(p); await enPaso(p, 'moto'); await motosListas(p);
    ok('volver a la moto con las mismas fechas no vuelve a cotizar y conserva la eleccion', llamadas(base, 'reserva_producto_cotiza').length === 1 && await p.$eval('[data-producto-id="p1"]', b => b.getAttribute('aria-pressed')) === 'true');
    await sig(p); await enPaso(p, 'cliente');
    await p.fill('[data-as="numero"]', '12ab'); await p.fill('[data-as="nombre"]', 'D'); await sig(p);
    ok('E5 · telefono con letras: error AL LADO del campo y no avanza', (await txt(p, '[data-rp="as-err-tel"]')).includes('solo lleva números') && !!(await p.$('[data-paso="cliente"]')));
    ok('E5 · nombre de una letra: su error al lado', (await txt(p, '[data-rp="as-err-nombre"]')).includes('nombre'));
    await p.fill('[data-as="numero"]', '0812 345'); await p.fill('[data-as="nombre"]', 'Dewi Lestari'); await sig(p);
    ok('E5 · telefono corto: no avanza', (await txt(p, '[data-rp="as-err-tel"]')).length > 0 && !!(await p.$('[data-paso="cliente"]')));
    await p.fill('[data-as="numero"]', '0361 555 123'); await sig(p);
    ok('E5 · fijo de Bali con +62 (no es un movil para WhatsApp): lo dice', (await txt(p, '[data-rp="as-err-tel"]')).includes('+62 8'));
    await p.fill('[data-as="numero"]', '0812-3456-7890'); await sig(p); await enPaso(p, 'entrega');
    await p.click('[data-accion="rp-modal-as-opcion"][data-campo="entrega"][data-valor="domicilio"]');
    await sig(p);
    ok('E6 · a domicilio sin direccion: no avanza y lo dice', (await dlg(p)).includes('Escribe la dirección de entrega') && !!(await p.$('[data-paso="entrega"]')));
    ok('E6 · avisa de que el coste de la entrega no se suma desde aqui', (await dlg(p)).includes('NO se suma'));
    await p.fill('[data-as="dirEntrega"]', XSS_DIR); await sig(p); await enPaso(p, 'resumen');
    const res = await dlg(p);
    ok('resumen: total de la base, base e impuesto, dias de la base y telefono normalizado a +62', res.includes('200.000') && res.includes('PPN 11%') && /= 2 días/.test(res) && res.includes('+6281234567890'), res.slice(0, 300));
    ok('E6 · junto al total: la entrega a domicilio NO incluida', !!(await p.$('[data-rp="as-total"] [data-rp="as-sin-entrega"]')));
    ok('la direccion con etiquetas sale como texto', res.includes(XSS_DIR) && await sinInyeccion(p));
    ok('E7 · sin elegir confirmar o apartar el boton final esta bloqueado', await p.$eval('[data-accion="rp-modal-as-confirma"]', b => b.disabled));
    await p.click('[data-accion="rp-modal-as-opcion"][data-campo="modo"][data-valor="h24"]');
    ok('E7 · el boton dice lo que hace («Apartar 24 h»)', (await txt(p, '[data-accion="rp-modal-as-confirma"]')).includes('Apartar 24 h'));
    await p.click('[data-accion="rp-modal-as-paso"][data-paso="fechas"]'); await enPaso(p, 'fechas');
    ok('«Cambiar» del resumen salta a su paso sin perder nada', (await p.$$('[data-accion="rp-modal-as-dia"][aria-pressed="true"]')).length === 2);
    for (const s of ['moto', 'cliente', 'entrega', 'resumen']) { await sig(p); await enPaso(p, s); if (s === 'moto') await motosListas(p); }
    await p.fill('[data-as="notas"]', 'recoge a las 10:00');
    await confirma(p, 'confirmada');
    await espera(p, () => document.querySelector('[data-rp="as-hecha"]'));
    const cr = llamadas(base, 'reserva_producto_crea');
    const pd = cr[0] && cr[0][1].p_datos;
    ok('crear llama UNA vez con producto, fechas, clave, nombre, telefono normalizado, direccion y notas; SIN precio, total, estado ni moneda',
       cr.length === 1 && JSON.stringify(Object.keys(pd).sort()) === JSON.stringify(['clave', 'contacto_nombre', 'contacto_telefono', 'desde', 'entrega_direccion', 'hasta', 'notas', 'producto_id'])
       && pd.contacto_telefono === '+6281234567890' && /^equipo-[a-z0-9]+$/.test(pd.clave) && cr[0][1].p_bloqueo_minutos === null, JSON.stringify(cr));
    const he = await txt(p, '[data-rp="as-hecha"]');
    ok('tras confirmar: numero, total de la base y que pasa con el cobro, en una frase', he.includes('RSV-11') && he.includes('200.000') && he.includes('Cobro: pendiente'), he);
    ok('total igual al del resumen: sin aviso de total distinto', !(await p.$('[data-rp="as-total-distinto"]')));
    await p.click('[data-accion="rp-modal-as-lista"]');
    await espera(p, () => !document.querySelector('[data-rp="dialogo"]'));
    ok('«Ver en la lista» cierra y la lista ya trae la reserva nueva', (await filas(p)).length === 5);
    ok('nada escribio por .from ni por fetch y ningun error de JS', (await p.evaluate(() => window.__fromLlamado + window.__fetchLlamado)) === 0 && (await p.evaluate(() => window.__errores)).length === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
    await ctx.close();
  }
  {
    // E8 · cliente que ya existe: su telefono (guardado en otro formato, como lo deja el bot) ya tiene una reserva viva que se solapa
    const { base, p, ctx } = await abre({ base: { dupTel: true } });
    await hastaCliente(p);
    await p.fill('[data-as="numero"]', '081234567890'); await p.fill('[data-as="nombre"]', 'D Lestari'); await sig(p);
    await espera(p, () => document.querySelector('[data-rp="as-coincidencias"]'));
    const cz = await txt(p, '[data-rp="as-coincidencias"]');
    ok('E8 · telefono repetido: ensena la reserva anterior (comparando solo cifras), marca que se solapa y NO avanza solo', cz.includes('RSV-5') && cz.includes('SE SOLAPA') && !!(await p.$('[data-paso="cliente"]')), cz);
    await p.click('[data-accion="rp-modal-as-usa"][data-i="0"]');
    ok('E8 · «Usar este nombre» copia el nombre de la ficha anterior', await p.$eval('[data-as="nombre"]', i => i.value) === 'Dewi Lestari');
    await sig(p); await enPaso(p, 'entrega'); await sig(p); await enPaso(p, 'resumen');
    ok('E8 · el resumen repite el aviso de posible duplicado', (await txt(p, '[data-rp="as-duplicado"]')).includes('RSV-5'));
    await ctx.close();
  }
  {
    // E9 · doble toque en el boton con la red lenta: UNA sola llamada; y apartar 24 h manda 1440 minutos
    const { base, p, ctx } = await abre({ base: { creaLento: 900 } });
    await hastaResumen(p, '+61 412 345 678');
    await p.click('[data-accion="rp-modal-as-opcion"][data-campo="modo"][data-valor="h24"]');
    await p.click('[data-accion="rp-modal-as-confirma"]', { clickCount: 2 }).catch(() => {});
    await p.click('[data-accion="rp-modal-as-confirma"]', { timeout: 300 }).catch(() => {});
    ok('E9 · durante el envio el boton queda bloqueado y dice que esta trabajando', await p.$eval('[data-accion="rp-modal-as-confirma"]', b => b.disabled && /Trabajando/.test(b.textContent)));
    await espera(p, () => document.querySelector('[data-rp="as-hecha"]'));
    const cr = llamadas(base, 'reserva_producto_crea');
    ok('E9 · doble toque = UNA sola reserva', cr.length === 1 && base.reservas.filter(r => r.origen === 'equipo' && r.id.startsWith('rn')).length === 1, String(cr.length));
    ok('pegar «+61 412…» con +62 elegido se guarda con el +61 (no +62)', cr[0][1].p_datos.contacto_telefono === '+61412345678', cr[0][1].p_datos.contacto_telefono);
    ok('apartar 24 h manda 1440 minutos y lo dice', cr[0][1].p_bloqueo_minutos === 1440 && (await txt(p, '[data-rp="as-hecha"]')).includes('apartada'));
    await ctx.close();
  }
  {
    // E10 · la moto se ocupa entre el paso 2 y el boton: vuelve a la moto, recotiza y no queda nada creado
    const { base, p, ctx } = await abre({ base: { creaFalla: true } });
    await hastaResumen(p);
    await confirma(p);
    await enPaso(p, 'moto'); await motosListas(p);
    ok('E10 · moto ocupada al confirmar: vuelve al paso de la moto, lo dice en llano y no hay exito', (await dlg(p)).includes('se acaba de ocupar') && !(await p.$('[data-rp="as-hecha"]')) && (await txt(p, '[data-rp="exito"]')) === '');
    ok('E10 · se vuelve a preguntar la disponibilidad a la base', llamadas(base, 'reserva_producto_cotiza').length === 2);
    if (SHOT) await p.screenshot({ path: SHOT + '_E10_ocupada.png' });
    await ctx.close();
  }
  {
    // E11 · sin impuesto configurado (hoy en bbm): el asistente se para en la moto; sin precio no se crea nada
    const { base, p, ctx } = await abre({ base: { cotizaImpuesto: true } });
    await hastaMoto(p);
    ok('E11 · impuesto sin configurar: aviso en llano de que falta el gestor y ninguna moto elegible', (await txt(p, '[data-rp="as-bloqueo"]')).includes('falta que el gestor') && !(await p.$('[data-accion="rp-modal-as-moto"]')));
    await sig(p);
    ok('E11 · Siguiente no avanza y no se crea nada', !!(await p.$('[data-paso="moto"]')) && llamadas(base, 'reserva_producto_crea').length === 0);
    if (SHOT) await p.screenshot({ path: SHOT + '_E11_impuesto.png' });
    await ctx.close();
  }
  {
    // E12 · la red se cae al confirmar
    const { base, p, ctx } = await abre({ base: { creaSinRespuesta: true } });
    await hastaResumen(p); await confirma(p);
    await espera(p, () => document.querySelector('[data-rp="as-hecha"]'));
    ok('E12 · se creo pero la respuesta no llego: se busca en la lista, se encuentra y se dice (sin crear otra)', (await dlg(p)).includes('sí se creó') && llamadas(base, 'reserva_producto_crea').length === 1);
    await ctx.close();
  }
  {
    // E12 · CONFIRMADA sin respuesta y sin encontrarla: la base aun no protege una confirmada contra duplicados (B1), asi que NO se reactiva el envio
    const { base, p, ctx } = await abre({ base: { creaSinRed: true } });
    await hastaResumen(p); await confirma(p);
    ok('E12 · durante el envio en duda no se puede volver atras ni cambiar nada', await p.$eval('[data-accion="rp-modal-as-atras"]', b => b.disabled) && (await p.$$eval('[data-accion="rp-modal-as-paso"]', bs => bs.every(b => b.disabled))));
    await espera(p, () => document.querySelector('[data-rp="as-error-envio"]') && !/miramos/.test(document.querySelector('[data-rp="as-error-envio"]').textContent));
    ok('E12 · confirmada sin encontrar: no se reactiva el envio, se ofrece comprobar de nuevo o empezar de cero', (await txt(p, '.rp-as-final')).includes('Comprobar de nuevo')
       && (await txt(p, '[data-rp="as-error-envio"]')).includes('No la repitas') && !!(await p.$('[data-accion="rp-modal-as-reinicia"]')) && llamadas(base, 'reserva_producto_crea').length === 1);
    await ctx.close();
  }
  {
    // E12 · APARTADA sin respuesta y sin encontrarla: se puede reintentar con la MISMA clave (la base no duplica un apartado)
    const { base, p, ctx } = await abre({ base: { creaSinRed: true } });
    await hastaResumen(p); await confirma(p, 'h24');
    await espera(p, () => document.querySelector('[data-rp="as-error-envio"]') && !/miramos/.test(document.querySelector('[data-rp="as-error-envio"]').textContent));
    ok('E12 · apartado no creado: se mira la lista (tras esperar), se dice que no aparece y el boton vuelve a estar disponible', (await txt(p, '[data-rp="as-error-envio"]')).includes('no aparece en la lista') && !(await p.$eval('[data-accion="rp-modal-as-confirma"]', b => b.disabled)));
    base.o.creaSinRed = false;
    await p.click('[data-accion="rp-modal-as-confirma"]');
    await espera(p, () => document.querySelector('[data-rp="as-hecha"]'));
    const cr = llamadas(base, 'reserva_producto_crea');
    ok('E12 · el reintento manda la MISMA clave (la base no duplica un apartado)', cr.length === 2 && cr[0][1].p_datos.clave === cr[1][1].p_datos.clave);
    await ctx.close();
  }
  {
    // revisor 6aeaafa: una reserva ANTERIOR idéntica (mismo modelo, fechas y telefono: una pareja que alquila dos motos) no se da por la nueva tras un corte
    const { base, p, ctx } = await abre({ base: { creaSinRed: true, gemela: true } });
    await hastaCliente(p);
    await p.fill('[data-as="numero"]', '081234567890'); await p.fill('[data-as="nombre"]', 'Dewi Lestari'); await sig(p);
    await espera(p, () => document.querySelector('[data-rp="as-coincidencias"]'));
    await sig(p); await enPaso(p, 'entrega'); await sig(p); await enPaso(p, 'resumen');
    ok('la gemela sale como posible duplicado en el resumen', (await txt(p, '[data-rp="as-duplicado"]')).includes('RSV-6'));
    await confirma(p);
    await espera(p, () => document.querySelector('[data-rp="as-error-envio"]') && !/miramos/.test(document.querySelector('[data-rp="as-error-envio"]').textContent));
    ok('la reserva gemela que ya existia NO se ensena como creada (sigue la duda y no se reactiva el envio)', !(await p.$('[data-rp="as-hecha"]')) && (await txt(p, '[data-rp="as-error-envio"]')).includes('No la repitas')
       && (await txt(p, '.rp-as-final')).includes('Comprobar de nuevo'), await txt(p, '[data-rp="as-error-envio"]').catch(() => ''));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { creaSinId: true } });
    await hastaResumen(p); await confirma(p);
    await espera(p, () => document.querySelector('[data-rp="as-hecha"]') || (document.querySelector('[data-rp="as-error-envio"]') && !/miramos/.test(document.querySelector('[data-rp="as-error-envio"]').textContent)));
    ok('si la base no devuelve la reserva creada no se da por creada a ciegas: se busca en la lista antes', (await dlg(p)).includes('sí se creó'));
    await ctx.close();
  }
  {
    // revisor 835f420: clave_repetida = la base dice que YA existe; si la lista no la ensena, nunca se dice «no se creo» ni se reactiva el envio
    const { base, p, ctx } = await abre({ base: { creaClaveRepetida: true } });
    await hastaResumen(p); await confirma(p);
    ok('mientras se comprueba, Cerrar esta bloqueado (la respuesta no se pierde)', await p.$eval('[data-accion="rp-modal-as-cerrar"]', b => b.disabled));
    await espera(p, () => document.querySelector('[data-rp="as-error-envio"]') && !/miramos/.test(document.querySelector('[data-rp="as-error-envio"]').textContent));
    const ev = await txt(p, '[data-rp="as-error-envio"]');
    ok('clave repetida sin encontrarla: dice que ya existe y ofrece comprobar, nunca reintentar', ev.includes('ya existe') && (await txt(p, '.rp-as-final')).includes('Comprobar de nuevo') && llamadas(base, 'reserva_producto_crea').length === 1, ev);
    await ctx.close();
  }
  {
    // revisor 835f420: donde clientes_datos responde, el cliente con ficha se elige y la reserva se enlaza a el (client_id), sin copiar el contacto
    const { base, p, ctx } = await abre();
    await hastaCliente(p);
    await espera(p, () => document.querySelector('[data-as="cliente"]'));
    ok('el selector de clientes pinta el nombre con etiquetas como texto', await p.$eval('[data-as="cliente"] option[value="c1"]', o => o.textContent) === 'Ana <b>Q</b>');
    await p.selectOption('[data-as="cliente"]', 'c2');
    ok('con ficha elegida no se piden telefono ni nombre', !(await p.$('[data-as="numero"]')));
    await sig(p); await enPaso(p, 'entrega'); await sig(p); await enPaso(p, 'resumen');
    ok('el resumen ensena el cliente de la ficha', (await dlg(p)).includes('Bob'));
    await confirma(p); await espera(p, () => document.querySelector('[data-rp="as-hecha"]'));
    const pd = llamadas(base, 'reserva_producto_crea')[0][1].p_datos;
    ok('con ficha: manda client_id y NO contacto', pd.client_id === 'c2' && pd.contacto_nombre === undefined && pd.contacto_telefono === undefined, JSON.stringify(pd));
    await ctx.close();
  }
  {
    // sin lista de clientes (bbm con Facturas apagado) no hay selector y se sigue con el contacto; si la busqueda de duplicados falla, se dice
    const { p, ctx } = await abre({ base: { clientesFalla: true, buscaFalla: true } });
    await hastaCliente(p);
    await p.fill('[data-as="numero"]', '081234567890'); await p.fill('[data-as="nombre"]', 'Dewi'); await sig(p);
    await espera(p, () => document.querySelector('[data-rp="as-busqueda-fallo"]'));
    ok('sin clientes_datos no hay selector de ficha', !(await p.$('[data-as="cliente"]')));
    ok('si no se pudo buscar el telefono se dice y el segundo Siguiente sigue', (await txt(p, '[data-rp="as-busqueda-fallo"]')).includes('No se ha podido mirar'));
    await sig(p); await enPaso(p, 'entrega');
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { creaReglaSinHint: true } });
    await hastaResumen(p); await confirma(p);
    await espera(p, () => document.querySelector('[data-rp="as-error-envio"]'));
    ok('una regla de la base sin pista se dice con sus palabras en el resumen, junto al boton', (await txt(p, '[data-rp="as-error-envio"]')).includes('demasiado largo') && !!(await p.$('[data-paso="resumen"]')));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { creaOtroPrecio: true } });
    await hastaResumen(p); await confirma(p);
    await espera(p, () => document.querySelector('[data-rp="as-hecha"]'));
    ok('si el total final de la base no es el del resumen, se avisa con los dos importes', (await txt(p, '[data-rp="as-total-distinto"]')).includes('777.000'));
    if (SHOT) await p.screenshot({ path: SHOT + '_total_distinto.png' });
    await ctx.close();
  }
  {
    // cerrar y recargar no pierden lo metido (borrador en sessionStorage: hace falta un origen de verdad, no about:blank)
    const { p, ctx } = await abre({ url: true });
    await hastaCliente(p);
    await p.fill('[data-as="numero"]', '081234567890'); await p.fill('[data-as="nombre"]', 'Made');
    await p.click('[data-accion="rp-modal-as-cerrar"]');
    ok('cerrar con datos pide confirmacion (y dice que se guarda)', (await dlg(p)).includes('¿Salir?'));
    await p.click('[data-accion="rp-modal-as-seguir"]');
    ok('«Seguir aqui» no cierra', !!(await p.$('[data-paso="cliente"]')));
    await p.reload(); await espera(p, () => document.querySelector('[data-rp="res-estado"]') && !document.querySelector('[data-rp="res-estado"]').textContent.includes('Cargando'));
    await p.click('[data-accion="rp-nueva"]'); await enPaso(p, 'moto'); await motosListas(p);
    ok('tras recargar la pagina se recupera el borrador (fechas, moto) y se dice', !!(await p.$('[data-rp="as-recuperado"]')) && await p.$eval('[data-producto-id="p1"]', b => b.getAttribute('aria-pressed')) === 'true');
    await sig(p); await enPaso(p, 'cliente');
    ok('y el telefono y el nombre siguen ahi', await p.$eval('[data-as="nombre"]', i => i.value) === 'Made' && await p.$eval('[data-as="numero"]', i => i.value) === '081234567890');
    await ctx.close();
  }

  // 4. cancelar con devolucion
  {
    const { base, p, ctx } = await abre();
    await p.click('[data-reserva-id="r2"] [data-accion="rp-cancelar-devolucion"]');
    await p.fill('input[data-campo="importe-devuelto"]', 'abc');
    await p.click('[data-accion="rp-modal-cancela-dev"]');
    ok('un importe que no es numero no llama', llamadas(base, 'reserva_cancela_con_devolucion').length === 0 && (await txt(p, '[data-rp="dialogo"]')).includes('número de 0'));
    await p.fill('input[data-campo="importe-devuelto"]', '100000');
    await p.fill('textarea[data-campo="motivo"]', 'Cliente cancela');
    await p.click('[data-accion="rp-modal-cancela-dev"]');
    ok('devolver algo sin referencia no llama', llamadas(base, 'reserva_cancela_con_devolucion').length === 0 && (await txt(p, '[data-rp="dialogo"]')).includes('referencia'));
    await p.fill('input[data-campo="referencia-devolucion"]', 'DEV-1');
    await p.click('[data-accion="rp-modal-cancela-dev"]');
    await espera(p, () => !document.querySelector('[data-rp="dialogo"]'));
    const cd = llamadas(base, 'reserva_cancela_con_devolucion');
    ok('manda reserva, importe, referencia y motivo, nada mas', cd.length === 1 && JSON.stringify(cd[0][1]) === JSON.stringify({ p_reserva: 'r2', p_importe_devuelto: 100000, p_referencia_devolucion: 'DEV-1', p_motivo: 'Cliente cancela' }), JSON.stringify(cd));
    const ex = await txt(p, '[data-rp="exito"]');
    ok('anuncia lo devuelto y lo retenido que dijo la base, y enseña su aviso', ex.includes('100.000') && ex.includes('200.000') && (await txt(p, '[data-rp="aviso"]')).includes('cobrado y sin factura'), ex);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { devSinPermiso: true } });
    await p.click('[data-reserva-id="r4"] [data-accion="rp-cancelar-devolucion"]');
    await p.fill('textarea[data-campo="motivo"]', 'x');
    await p.click('[data-accion="rp-modal-cancela-dev"]');
    await espera(p, () => document.querySelector('[data-rp="dialogo"] .rp-error:not(.rp-oculto)'));
    ok('sin las dos herramientas la base lo dice y el dialogo sigue abierto', (await txt(p, '[data-rp="dialogo"] .rp-error')).includes('exige las herramientas'));
    await ctx.close();
  }

  // 5. cambiar de unidad
  {
    const { base, p, ctx } = await abre();
    await p.click('[data-reserva-id="r2"] [data-accion="rp-cambia-unidad"]');
    await espera(p, () => document.querySelector('select[data-campo="unidad-nueva"]'));
    const opts = await p.$$eval('select[data-campo="unidad-nueva"] option', os => os.map(o => o.textContent));
    ok('solo se ofrecen otras unidades disponibles del mismo producto (ni la actual ni la de taller)', opts.length === 2 && opts.includes(XSS_MATRICULA) && !opts.some(u => u.includes('TALLER')) && !opts.includes('DK 2'), JSON.stringify(opts));
    await p.click('[data-accion="rp-modal-cambia"]');
    ok('cambiar sin elegir no llama', llamadas(base, 'reserva_producto_cambia_unidad').length === 0 && (await txt(p, '[data-rp="dialogo"]')).includes('Elige la unidad'));
    await p.selectOption('select[data-campo="unidad-nueva"]', 'u1');
    await p.click('[data-accion="rp-modal-cambia"]');
    await espera(p, () => !document.querySelector('[data-rp="dialogo"]'));
    ok('manda id y unidad nueva, nada mas', JSON.stringify(llamadas(base, 'reserva_producto_cambia_unidad')[0][1]) === JSON.stringify({ p_id: 'r2', p_unidad_id: 'u1' }));
    ok('la flota se leyo FRESCA al abrir el cambio', llamadas(base, 'producto_flota_datos').length >= 1);
    await ctx.close();
  }

  // 6. calendario y flota
  {
    const { base, p, ctx } = await abre();
    await tab(p, 'calendario');
    await espera(p, () => document.querySelectorAll('[data-rp="cal-tabla"] tbody tr').length === 3);
    const pidio = llamadas(base, 'reservas_producto_datos').pop()[1];
    ok('el calendario pide solo la ventana de 14 dias', pidio.p_desde === mas(0) && pidio.p_hasta === mas(14), JSON.stringify(pidio));
    ok('las celdas ocupadas llevan estado y las de la unidad en taller salen marcadas «fuera»',
       (await p.$$('[data-rp="cal-tabla"] td[data-estado="confirmada"]')).length >= 3 && (await p.$$('[data-rp="cal-tabla"] tr[data-unidad-id="u3"] td[data-fuera="1"]')).length === 14);
    ok('una reserva cancelada/pasada no pinta', (await p.$$('[data-rp="cal-tabla"] td[data-estado="devuelta"], [data-rp="cal-tabla"] td[data-estado="cancelada"]')).length === 0);
    ok('el calendario no inyecta nada', await sinInyeccion(p));
    await p.click('[data-accion="rp-cal-sig"]');
    for (let i = 0; i < 50 && llamadas(base, 'reservas_producto_datos').pop()[1].p_desde !== mas(7); i++) await p.waitForTimeout(100);
    ok('semana siguiente mueve la ventana 7 dias', llamadas(base, 'reservas_producto_datos').pop()[1].p_desde === mas(7));
    await tab(p, 'flota');
    await espera(p, () => document.querySelectorAll('[data-producto-id]').length === 1);
    const f = await txt(p, '[data-rp="flota-lista"]');
    ok('la flota enseña tarifas, unidades y estado (taller) con la matricula como texto', f.includes('Honda Beat') && f.includes('Taller') && f.includes(XSS_MATRICULA) && /600\.000/.test(f) && await sinInyeccion(p));
    await ctx.close();
  }

  // 6b. enlace «Editar flota» (10-oct-2026): solo para quien tiene la casilla `flota`; sin ficha o sin casilla no sale
  for (const [nombre, ficha, sale] of [['sin ficha', undefined, false], ['ficha sin la casilla flota', JSON.stringify({ rol: 'agente', herramientas: ['reservas-producto'] }), false],
      ['con la casilla flota', JSON.stringify({ rol: 'agente', herramientas: ['reservas-producto', 'flota'] }), true]]) {
    const { p, ctx } = await abre({ ficha });
    await tab(p, 'flota');
    const v = await p.$eval('[data-rp="flota-editar"]', e => ({ oculto: e.classList.contains('rp-oculto'), href: e.getAttribute('href'), txt: e.textContent, vis: e.offsetParent !== null }));
    ok('«Editar flota» ' + nombre + ': ' + (sale ? 'sale y apunta a /intranet/v4/flota/' : 'no sale'), sale ? (!v.oculto && v.vis && v.href === '/intranet/v4/flota/' && v.txt === 'Editar flota') : (v.oculto && !v.vis));
    ok('la pestaña de flota sigue de LECTURA: ningun boton de escribir (' + nombre + ')', (await p.$$eval('[data-rp="panel"][data-tab="flota"] [data-accion]', bs => bs.map(b => b.getAttribute('data-accion')))).join() === 'rp-flota-actualizar');
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ idioma: 'en', ficha: JSON.stringify({ rol: 'agente', herramientas: ['flota'] }) });
    await tab(p, 'flota');
    ok('en ingles el enlace dice «Edit fleet»', (await txt(p, '[data-rp="flota-editar"]')) === 'Edit fleet' && (await p.evaluate(() => window.__sinEn)).length === 0);
    await ctx.close();
  }

  // 7. pagos por revisar, errores y estados vacios que no mienten
  {
    const { p, ctx } = await abre();
    await tab(p, 'pagos');
    await espera(p, () => document.querySelectorAll('[data-rp="pagos-tabla"] tbody tr').length === 1);
    ok('la referencia de pago con etiquetas se pinta como texto', (await txt(p, '[data-rp="pagos-tabla"]')).includes('PAY-X <b>') && await sinInyeccion(p));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { pagosNoAdmin: true } });
    await tab(p, 'pagos');
    await espera(p, () => document.querySelector('[data-rp="pagos-estado"]').textContent.includes('No se ha podido mirar'));
    const e = await txt(p, '[data-rp="pagos-estado"]');
    ok('un no-admin lee «solo la administracion», no «no hay pagos»', e.includes('Solo la administración') && !e.includes('No hay pagos por revisar'), e);
    await ctx.close();
  }
  {
    const base = nuevaBase({ noDisponible: ['reservas_producto_datos'] });
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await ctx.newPage();
    await p.exposeFunction('__srv', (n, a) => servidor(base, n, a));
    await p.setContent(pagina('es'), { waitUntil: 'load' });
    await p.waitForFunction(() => document.querySelector('[data-rp="res-estado"]').textContent.includes('No se ha podido mirar'), null, { timeout: 5000 });
    ok('si la lectura no esta en la base se dice «no se ha podido mirar» (no «no hay reservas»)', !(await txt(p, '[data-rp="res-estado"]')).includes('No hay reservas con ese filtro'));
    await ctx.close();
  }
  {
    const base = nuevaBase({ moduloApagado: true });
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await ctx.newPage();
    await p.exposeFunction('__srv', (n, a) => servidor(base, n, a));
    await p.setContent(pagina('es'), { waitUntil: 'load' });
    await p.waitForFunction(() => document.querySelector('[data-rp="res-estado"]').textContent.includes('apagado'), null, { timeout: 5000 });
    ok('modulo apagado se dice con todas sus letras', (await txt(p, '[data-rp="res-estado"]')).includes('NO quiere decir'));
    await ctx.close();
  }
  {
    const base = nuevaBase({ sinRed: 'reservas_producto_datos' });
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await ctx.newPage();
    await p.exposeFunction('__srv', (n, a) => servidor(base, n, a));
    await p.setContent(pagina('es'), { waitUntil: 'load' });
    await p.waitForFunction(() => document.querySelector('[data-rp="res-estado"]').textContent.includes('No se ha podido mirar'), null, { timeout: 5000 });
    ok('sin red: «la base no ha respondido»', (await txt(p, '[data-rp="res-estado"]')).includes('no ha respondido'));
    await ctx.close();
  }

  // 8. idiomas: bbm va en indonesio e ingles (owner 11-oct-2026 23:22). Se recorre TODO (pestanas, dialogos y el asistente entero hasta crear) y ninguna cadena queda sin traducir
  for (const idioma of ['en', 'id']) {
    const { p, ctx } = await abre({ idioma });
    for (const t of ['calendario', 'flota', 'pagos', 'reservas']) { await tab(p, t); await p.waitForTimeout(150); }
    await p.click('[data-reserva-id="r2"] [data-accion="rp-detalle"]'); await p.click('[data-accion="rp-modal-cerrar"]');
    await p.click('[data-reserva-id="r2"] [data-accion="rp-cancelar-devolucion"]'); await p.click('[data-accion="rp-modal-volver"]');
    await p.click('[data-reserva-id="r1"] [data-accion="rp-confirmar"]'); await p.click('[data-accion="rp-modal-volver"]');
    await p.click('[data-reserva-id="r2"] [data-accion="rp-cambia-unidad"]'); await p.waitForSelector('select[data-campo="unidad-nueva"]'); await p.click('[data-accion="rp-modal-volver"]');
    await p.click('[data-accion="rp-nueva"]'); await enPaso(p, 'fechas'); await sig(p);
    await dia(p, mas(20)); await dia(p, mas(22)); await sig(p); await enPaso(p, 'moto'); await motosListas(p); await sig(p);
    await p.click('[data-accion="rp-modal-as-moto"][data-producto-id="p1"]'); await sig(p); await enPaso(p, 'cliente');
    await p.fill('[data-as="numero"]', 'x'); await sig(p); await p.fill('[data-as="numero"]', '0812 3456 7890'); await p.fill('[data-as="nombre"]', 'Dewi'); await sig(p); await enPaso(p, 'entrega');
    await p.click('[data-accion="rp-modal-as-opcion"][data-campo="entrega"][data-valor="domicilio"]'); await sig(p); await p.fill('[data-as="dirEntrega"]', 'Jl. Raya Canggu 1'); await sig(p); await enPaso(p, 'resumen');
    await p.click('[data-accion="rp-modal-as-cerrar"]'); await p.click('[data-accion="rp-modal-as-seguir"]');
    await confirma(p); await espera(p, () => document.querySelector('[data-rp="as-hecha"]'));
    const sin = await p.evaluate(x => x === 'id' ? window.__sinId : window.__sinEn, idioma);
    ok(idioma + ': ninguna cadena queda sin traducir (pestanas, dialogos y asistente entero)', sin.length === 0, JSON.stringify(sin.slice(0, 8)));
    if (idioma === 'id') {
      const h = await txt(p, '[data-rp="as-hecha"]');
      ok('id: rupia y fechas en formato de Indonesia', /Rp|200\.000/.test(h) && h.includes('Booking'), h);
    }
    await ctx.close();
  }

  // 9. responsive: sin scroll horizontal de pagina a 390 px en ninguna pestana ni dialogo, y captura
  for (const ancho of [1440, 390]) {
    const { p, ctx } = await abre({ ancho });
    const medida = async () => p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    for (const t of ['reservas', 'calendario', 'flota', 'pagos']) {
      await tab(p, t); await p.waitForTimeout(250);
      const m = await medida();
      ok(ancho + ' px · pestana ' + t + ': sin scroll horizontal de pagina', m.sw <= m.cw, JSON.stringify(m));
      if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_' + t + '.png', fullPage: true });
    }
    await ctx.close();
  }
  // 9b. el asistente paso a paso: 1440x900 y 390x844 (y el boton final visible tambien a 1280x720 y 390x667), en id y en, con barras de scroll VISIBLES
  for (const [ancho, alto] of [[1440, 900], [390, 844], [1280, 720], [390, 667]]) {
    for (const idioma of ['id', 'en']) {
      if ((ancho === 1280 || alto === 667) && idioma === 'en') continue;
      const { p, ctx } = await abre({ ancho, alto, idioma });
      const mide = async paso => {
        const m = await p.evaluate(() => {
          const md = document.querySelector('[data-rp="dialogo"] .rp-modal'), b = document.querySelector('.rp-as-final'), r = md.getBoundingClientRect(), rb = b ? b.getBoundingClientRect() : null;
          return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, msw: md.scrollWidth, mcw: md.clientWidth, l: r.left, r: r.right, w: window.innerWidth,
                   bb: rb ? rb.bottom : 0, bt: rb ? rb.top : 0, h: window.innerHeight };
        });
        ok(ancho + 'x' + alto + ' ' + idioma + ' · ' + paso + ': sin scroll horizontal (pagina ni ventana) y el boton principal a la vista',
           m.sw <= m.cw && m.msw <= m.mcw + 1 && m.l >= 0 && m.r <= m.w + 1 && m.bt >= 0 && m.bb <= m.h + 1, JSON.stringify(m));
        if (SHOT && (alto === 900 || alto === 844)) await p.screenshot({ path: SHOT + '_as_' + ancho + '_' + idioma + '_' + paso + '.png' });
      };
      await p.click('[data-accion="rp-nueva"]'); await enPaso(p, 'fechas'); await dia(p, mas(20)); await dia(p, mas(22)); await mide('1-fechas');
      await sig(p); await enPaso(p, 'moto'); await motosListas(p); await p.click('[data-accion="rp-modal-as-moto"][data-producto-id="p1"]'); await mide('2-moto');
      await sig(p); await enPaso(p, 'cliente'); await p.fill('[data-as="numero"]', '12'); await sig(p); await mide('3-cliente-error');
      await p.fill('[data-as="numero"]', '0812 3456 7890'); await p.fill('[data-as="nombre"]', 'Dewi Lestari'); await sig(p); await enPaso(p, 'entrega');
      await p.click('[data-accion="rp-modal-as-opcion"][data-campo="entrega"][data-valor="domicilio"]'); await p.fill('[data-as="dirEntrega"]', 'Jl. Raya Canggu No. 12, Berawa (dekat Indomaret)'); await mide('4-entrega');
      await sig(p); await enPaso(p, 'resumen'); await p.click('[data-accion="rp-modal-as-opcion"][data-campo="modo"][data-valor="confirmada"]'); await mide('5-resumen');
      await p.click('[data-accion="rp-modal-as-confirma"]'); await espera(p, () => document.querySelector('[data-rp="as-hecha"]'));
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      ok(ancho + 'x' + alto + ' ' + idioma + ' · hecha: sin scroll horizontal', m.sw <= m.cw, JSON.stringify(m));
      if (SHOT && (alto === 900 || alto === 844)) await p.screenshot({ path: SHOT + '_as_' + ancho + '_' + idioma + '_6-hecha.png' });
      await ctx.close();
    }
  }

  await nav.close();
  console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\nTODO EN VERDE');
  process.exit(fallos ? 1 : 0);
})();
