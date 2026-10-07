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
      if (o.creaFalla) return err('23P01', 'No queda ninguna unidad libre de ese producto en esas fechas', 'sin_disponibilidad');
      if (o.creaSinId) return { data: {}, error: null };
      const id = 'rn' + (++b.seq);
      const r = { id, numero: 'RSV-' + (10 + b.seq), producto_id: a.p_datos.producto_id, producto: 'Honda Beat', unidad_id: a.p_datos.unidad_id || 'u2', unidad: 'DK 2', client_id: a.p_datos.client_id || null,
        cliente_oculto: false, contacto_nombre: a.p_datos.contacto_nombre || 'Ana', contacto_telefono: null, desde: a.p_datos.desde, hasta: a.p_datos.hasta, dias: 2,
        estado: a.p_bloqueo_minutos ? 'bloqueo' : 'confirmada', origen: 'equipo', caduca_en: a.p_bloqueo_minutos ? new Date(Date.now() + a.p_bloqueo_minutos * 60e3).toISOString() : null,
        precio_total: 777000, moneda: 'IDR', desglose: [], entrega_direccion: null, recogida_direccion: null, pago_referencia: null, notas: null, creado_en: new Date().toISOString(), creado_por: 'yo@x.com' };
      b.reservas.unshift(r);
      return { data: { id, numero_reserva: r.numero, estado: r.estado, precio_total: 777000, moneda: 'IDR' }, error: null };
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

const pagina = idioma => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title></head><body>
${MARCADO}
<script>
window.__xss = undefined; window.__fromLlamado = 0; window.__fetchLlamado = 0; window.__sinEn = []; window.__errores = [];
window.fetch = function () { window.__fetchLlamado++; return Promise.reject(new Error('fetch')); };
var sb = {
  rpc: function (n, a) { return { then: function (f, g) { return window.__srv(n, a || {}).then(f, g); } }; },
  from: function () { window.__fromLlamado++; throw new Error('el navegador no toca la base'); },
  auth: { getSession: function () { return Promise.resolve({ data: { session: { access_token: 'JWT' } } }); } }
};
window.LW_AUTH = Promise.resolve({ sb: sb });
window.lwDatos = function (n, a) { return Promise.resolve(sb.rpc(n, a)).then(function (r) { return { data: r.data, error: r.error }; }); };
window.LW_IDIOMA = '${idioma}';
window.LW_EN = {};
window.lwLocale = function () { return window.LW_IDIOMA === 'en' ? 'en-GB' : 'es-ES'; };
window.lwT = function (s) { s = String(s); if (window.LW_IDIOMA === 'en') { if (Object.prototype.hasOwnProperty.call(window.LW_EN, s)) return window.LW_EN[s]; if (!/^[\\s\u2014\u00b70-9.,%():]*$/.test(s)) window.__sinEn.push(s); } return s; };
window.lwIdiomaAplicar = function (raiz) { Array.prototype.forEach.call(raiz.querySelectorAll('[data-lwt]'), function (e) { e.textContent = window.lwT(e.textContent); }); };
window.onerror = function (m) { window.__errores.push(String(m)); };
</script>
<script>${SCRIPT.replace(/<\/?script>/g, '')}</script></body></html>`;

(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  async function abre(opts = {}) {
    const base = nuevaBase(opts.base || {});
    const ctx = await nav.newContext({ viewport: { width: opts.ancho || 1440, height: 1000 } });
    const p = await ctx.newPage();
    await p.exposeFunction('__srv', (n, a) => servidor(base, n, a));
    await p.setContent(pagina(opts.idioma || 'es'), { waitUntil: 'load' });
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

  // 3. crear: validaciones, argumentos exactos, el precio sale de la base, bloqueo, errores
  {
    const { base, p, ctx } = await abre();
    await p.click('[data-accion="rp-nueva"]');
    await espera(p, () => document.querySelector('[data-rp="dialogo"] select[data-campo="producto"]'));
    ok('abrir el formulario lee la flota y los clientes (y nada mas)', llamadas(base, 'producto_flota_datos').length === 1 && llamadas(base, 'clientes_datos').length === 1);
    ok('el selector de clientes pinta el nombre con etiquetas como texto', await p.$eval('select[data-campo="cliente"] option[value="c1"]', o => o.textContent) === 'Ana <b>Q</b>');
    await p.click('[data-accion="rp-modal-crear"]');
    ok('crear sin producto ni fechas no llama y lo dice', llamadas(base, 'reserva_producto_crea').length === 0 && (await txt(p, '[data-rp="dialogo"]')).includes('Elige un producto'));
    await p.selectOption('select[data-campo="producto"]', 'p1');
    const unidades = await p.$$eval('select[data-campo="unidad"] option', os => os.map(o => o.textContent));
    ok('solo se ofrecen unidades DISPONIBLES (la que esta en taller no)', unidades.length === 3 && !unidades.some(u => u.includes('TALLER')) && unidades.includes(XSS_MATRICULA), JSON.stringify(unidades));
    ok('se enseñan las tarifas como orientativas', (await txt(p, '[data-rp="dialogo"]')).includes('orientativas') && /600\.000/.test(await txt(p, '[data-rp="dialogo"]')));
    await p.fill('input[data-campo="desde"]', mas(20)); await p.fill('input[data-campo="hasta"]', mas(19));
    await p.click('[data-accion="rp-modal-crear"]');
    ok('una devolucion anterior a la recogida no llama', llamadas(base, 'reserva_producto_crea').length === 0 && (await txt(p, '[data-rp="dialogo"]')).includes('posterior'));
    await p.fill('input[data-campo="hasta"]', mas(22));
    await p.click('[data-accion="rp-modal-crear"]');
    ok('sin cliente ni nombre ni telefono no llama', llamadas(base, 'reserva_producto_crea').length === 0 && (await txt(p, '[data-rp="dialogo"]')).includes('al menos'));
    await p.fill('input[data-campo="contacto-nombre"]', 'Dewi');
    await p.fill('input[data-campo="entrega"]', XSS_DIR);
    await p.check('input[data-campo="bloqueo"]'); await p.fill('input[data-campo="bloqueo-minutos"]', '2');
    await p.click('[data-accion="rp-modal-crear"]');
    ok('minutos de bloqueo fuera de rango no llaman', llamadas(base, 'reserva_producto_crea').length === 0 && (await txt(p, '[data-rp="dialogo"]')).includes('5 a 10080'));
    await p.fill('input[data-campo="bloqueo-minutos"]', '90');
    await p.click('[data-accion="rp-modal-crear"]');
    await espera(p, () => !document.querySelector('[data-rp="dialogo"]'));
    const cr = llamadas(base, 'reserva_producto_crea');
    ok('crear llama UNA vez con producto, fechas, contacto y direccion, bloqueo en minutos; SIN precio, total, estado ni moneda',
       cr.length === 1 && JSON.stringify(cr[0][1]) === JSON.stringify({ p_datos: { producto_id: 'p1', desde: mas(20), hasta: mas(22), contacto_nombre: 'Dewi', entrega_direccion: XSS_DIR }, p_bloqueo_minutos: 90 }), JSON.stringify(cr));
    const ex = await txt(p, '[data-rp="exito"]');
    ok('el precio anunciado es el que devolvio la base (777.000), no uno calculado aqui', ex.includes('777.000') && ex.includes('RSV-11'), ex);
    ok('la lista se relee y trae la reserva nueva', (await filas(p)).length === 5 && llamadas(base, 'reservas_producto_datos').length >= 2);
    ok('sigue sin inyectarse nada', await sinInyeccion(p));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { creaFalla: true } });
    await p.click('[data-accion="rp-nueva"]');
    await espera(p, () => document.querySelector('select[data-campo="producto"]'));
    await p.selectOption('select[data-campo="producto"]', 'p1'); await p.selectOption('select[data-campo="cliente"]', 'c2');
    await p.fill('input[data-campo="desde"]', mas(20)); await p.fill('input[data-campo="hasta"]', mas(22));
    await p.click('[data-accion="rp-modal-crear"]');
    await espera(p, () => document.querySelector('[data-rp="dialogo"] .rp-error:not(.rp-oculto)'));
    const c = llamadas(base, 'reserva_producto_crea')[0][1];
    ok('con cliente registrado NO se manda contacto, y p_bloqueo_minutos va a null', c.p_datos.client_id === 'c2' && c.p_datos.contacto_nombre === undefined && c.p_bloqueo_minutos === null);
    ok('«sin disponibilidad» se enseña con las palabras de la base y el formulario sigue abierto', (await txt(p, '[data-rp="dialogo"] .rp-error')).includes('No queda ninguna unidad libre'));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { creaSinId: true } });
    await p.click('[data-accion="rp-nueva"]');
    await espera(p, () => document.querySelector('select[data-campo="producto"]'));
    await p.selectOption('select[data-campo="producto"]', 'p1');
    await p.fill('input[data-campo="desde"]', mas(20)); await p.fill('input[data-campo="hasta"]', mas(22)); await p.fill('input[data-campo="contacto-telefono"]', '+62');
    await p.click('[data-accion="rp-modal-crear"]');
    await espera(p, () => document.querySelector('[data-rp="dialogo"] .rp-error:not(.rp-oculto)'));
    ok('si la base no devuelve la reserva creada NO se da por creada (ni exito) y avisa de no reintentar a ciegas', (await txt(p, '[data-rp="dialogo"] .rp-error')).includes('antes de volver a crearla') && (await txt(p, '[data-rp="exito"]')) === '');
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { clientesFalla: true } });
    await p.click('[data-accion="rp-nueva"]');
    await espera(p, () => document.querySelector('select[data-campo="producto"]'));
    ok('si falla la lista de clientes se dice (no una lista vacia muda) y se puede seguir con contacto', (await txt(p, '[data-rp="dialogo"]')).includes('No se pudo cargar la lista de clientes'));
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

  // 8. ingles: ningun texto sin traducir
  {
    const { p, ctx } = await abre({ idioma: 'en' });
    for (const t of ['calendario', 'flota', 'pagos', 'reservas']) { await tab(p, t); await p.waitForTimeout(150); }
    await p.click('[data-reserva-id="r2"] [data-accion="rp-detalle"]'); await p.click('[data-accion="rp-modal-cerrar"]');
    await p.click('[data-reserva-id="r2"] [data-accion="rp-cancelar-devolucion"]'); await p.click('[data-accion="rp-modal-volver"]');
    await p.click('[data-reserva-id="r1"] [data-accion="rp-confirmar"]'); await p.click('[data-accion="rp-modal-volver"]');
    await p.click('[data-reserva-id="r2"] [data-accion="rp-cambia-unidad"]'); await p.waitForSelector('select[data-campo="unidad-nueva"]'); await p.click('[data-accion="rp-modal-volver"]');
    await p.click('[data-accion="rp-nueva"]'); await p.waitForSelector('select[data-campo="producto"]'); await p.selectOption('select[data-campo="producto"]', 'p1'); await p.click('[data-accion="rp-modal-volver"]');
    const sin = await p.evaluate(() => window.__sinEn);
    ok('en ingles ninguna cadena queda sin traducir', sin.length === 0, JSON.stringify(sin.slice(0, 8)));
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
    await p.click('[data-accion="rp-nueva"]'); await p.waitForSelector('select[data-campo="producto"]'); await p.selectOption('select[data-campo="producto"]', 'p1');
    const dlg = await p.$eval('[data-rp="dialogo"] .rp-modal', e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: window.innerWidth, sw: e.scrollWidth, cw: e.clientWidth }; });
    ok(ancho + ' px · el formulario de nueva reserva cabe en pantalla', dlg.l >= 0 && dlg.r <= dlg.w + 1 && dlg.sw <= dlg.cw + 1, JSON.stringify(dlg));
    if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_nueva.png' });
    await ctx.close();
  }

  await nav.close();
  console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\nTODO EN VERDE');
  process.exit(fallos ? 1 : 0);
})();
