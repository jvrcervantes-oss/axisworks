// node comercial/demo-erp/pruebas/taller.harness.cjs [captura_prefijo]
// Harness de la pantalla Taller del maestro (F8 pieza 2, 8-oct-2026): el taller.html REAL (marcado + script, con las ayudas comunes de _compartido/ pegadas como hace build.py)
// en Chromium, con la base y la sesion SIMULADAS (page.exposeFunction): una base en memoria que imita lo que dicen las RPC de 20261008135000_f8_orden_trabajo en firmas, formas y
// errores con hint. Mide el COMPORTAMIENTO, no el codigo: que pide y con que argumentos, que pinta con cada respuesta, XSS por matricula/motivo/nota/correo, que no se da por
// abierta ni cerrada una orden que la base no confirma, los estados de error (no se ha podido mirar != no hay nada), las reservas vivas y que a 390 px no hay scroll horizontal.
// OJO: la base real NO se ha tocado. Lo que sale de aqui prueba la pantalla contra mi lectura de la migracion, no contra Postgres (eso lo hace la prueba SQL en rama).
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const COMUN_JS = fs.readFileSync(path.join(__dirname, '..', '_compartido', 'pantalla_comun.js'), 'utf8').trim();
const COMUN_CSS = fs.readFileSync(path.join(__dirname, '..', '_compartido', 'pantalla_comun.css'), 'utf8').trim();
const FUENTE = fs.readFileSync(path.join(__dirname, '..', 'taller.html'), 'utf8');
const [MARCADO0, SCRIPT0] = FUENTE.split('<!--AXW_SCRIPT-->');
const MARCADO = MARCADO0.split('/*AXW_COMUN_CSS*/').join(COMUN_CSS);
const SCRIPT = SCRIPT0.split('/*AXW_COMUN_JS*/').join(COMUN_JS);
const SHOT = process.argv[2];
let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' -> ' + extra : '')); } else console.log('ok     ' + nombre); };

const XSS_MATRICULA = `DK 1 <b>"X"</b> 'Y' <svg onload="window.__xss=1">`;
const XSS_MOTIVO = `"><img src=x onerror="window.__xss=2"> O'Brien <script>window.__xss=3</script>`;
const XSS_NOTA = `nota <img src=x onerror="window.__xss=4"> 'q' "d"`;
const XSS_MAIL = `a"<svg onload="window.__xss=5">@x.com`;
const HOY = new Date();
const iso = d => d.toISOString();

function nuevaBase(o = {}) {
  const unidades = [
    { id: 'u1', numero: 'UND-1', identificador: XSS_MATRICULA, producto: 'Honda Beat', estado: 'disponible', moneda: 'IDR' },
    { id: 'u2', numero: 'UND-2', identificador: 'DK 2', producto: 'Honda Beat', estado: 'disponible', moneda: 'IDR' },
    { id: 'u3', numero: 'UND-3', identificador: 'DK 3 TALLER', producto: 'Honda Beat', estado: 'taller', moneda: 'IDR' }
  ];
  const ordenes = [
    { id: 'o1', numero: 'OT-00001', unidad_id: 'u3', unidad: 'DK 3 TALLER', unidad_numero: 'UND-3', producto: 'Honda Beat', unidad_estado: 'taller', motivo: XSS_MOTIVO, bloquea_reservas: true,
      estado: 'abierta', abierta_en: iso(HOY), abierta_por_email: XSS_MAIL, cerrada_en: null, cerrada_por_email: null, coste: null, moneda: null, nota_cierre: null, mia: true },
    { id: 'o2', numero: 'OT-00002', unidad_id: 'u2', unidad: 'DK 2', unidad_numero: 'UND-2', producto: 'Honda Beat', unidad_estado: 'disponible', motivo: 'Limpieza', bloquea_reservas: false,
      estado: 'abierta', abierta_en: iso(HOY), abierta_por_email: 'jefe@x.com', cerrada_en: null, cerrada_por_email: null, coste: null, moneda: null, nota_cierre: null, mia: false },
    { id: 'o3', numero: 'OT-00000', unidad_id: 'u1', unidad: XSS_MATRICULA, unidad_numero: 'UND-1', producto: 'Honda Beat', unidad_estado: 'disponible', motivo: 'Frenos', bloquea_reservas: true,
      estado: 'cerrada', abierta_en: iso(HOY), abierta_por_email: 'jefe@x.com', cerrada_en: iso(HOY), cerrada_por_email: XSS_MAIL, coste: 150000, moneda: 'IDR', nota_cierre: XSS_NOTA, mia: false }
  ];
  return { llamadas: [], seq: 0, o, unidades, ordenes };
}
const err = (code, message, hint, details) => ({ data: null, error: { code, message, hint: hint || null, details: details || null } });
async function servidor(b, nombre, a) {
  b.llamadas.push([nombre, JSON.parse(JSON.stringify(a))]);
  const o = b.o;
  if (o.lento) await new Promise(r => setTimeout(r, o.lento));
  if (o.sinRed && nombre === o.sinRed) return { data: null, error: { message: 'Failed to fetch' } };
  if (o.noDisponible && o.noDisponible.includes(nombre)) return err('PGRST202', 'Could not find the function public.' + nombre + ' in the schema cache');
  if (o.moduloApagado) return err('42501', 'orden_trabajo_datos: módulo no activo', 'modulo_apagado');
  if (o.sinPermiso) return err('42501', nombre + ': sin acceso');
  switch (nombre) {
    case 'orden_trabajo_datos': {
      let l = b.ordenes;
      if (a.p_estado) l = l.filter(x => x.estado === a.p_estado);
      if (o.datosRaros) return { data: { ordenes: 'nada' }, error: null };
      return { data: { ordenes: JSON.parse(JSON.stringify(l)), unidades: JSON.parse(JSON.stringify(b.unidades)), unidades_recortadas: !!o.recortadas, siguiente: o.pagina && !a.p_despues ? 'o1' : null }, error: null };
    }
    case 'orden_trabajo_abre': {
      if (o.reservasVivas) return err('22023', 'Esa moto tiene 2 reserva(s) pendientes: cámbialas de moto antes de pasarla a taller', 'reservas_vivas',
        JSON.stringify([{ id: 'r1', numero: 'RSV-00007', estado: 'confirmada', desde: '2026-12-01', hasta: '2026-12-04' }, { id: 'r2', numero: 'RSV-<b>8', estado: 'bloqueo', desde: '2026-12-10', hasta: '2026-12-12' }]));
      if (o.abreFalla) return err('23505', 'Ya hay una orden abierta con ese mismo motivo para esta moto', 'orden_duplicada');
      if (o.abreSinId) return { data: {}, error: null };
      const u = b.unidades.find(x => x.id === a.p_unidad);
      const n = 'OT-' + String(10 + (++b.seq)).padStart(5, '0');
      const ord = { id: 'on' + b.seq, numero: n, unidad_id: u.id, unidad: u.identificador, unidad_numero: u.numero, producto: u.producto, unidad_estado: a.p_bloquea ? 'taller' : u.estado, motivo: a.p_motivo,
        bloquea_reservas: a.p_bloquea, estado: 'abierta', abierta_en: iso(HOY), abierta_por_email: 'yo@x.com', cerrada_en: null, cerrada_por_email: null, coste: null, moneda: null, nota_cierre: null, mia: true };
      b.ordenes.unshift(ord);
      if (a.p_bloquea) u.estado = 'taller';
      return { data: { id: ord.id, numero: n, estado: 'abierta', unidad_estado: u.estado }, error: null };
    }
    case 'orden_trabajo_cierra': {
      const ord = b.ordenes.find(x => x.id === a.p_id);
      if (o.cierraDecimales) return err('22023', 'El coste en IDR no admite tantos decimales', 'coste_decimales');
      if (o.cierraMal) return { data: { id: ord.id, numero: ord.numero, estado: 'abierta', unidad_estado: 'taller' }, error: null };
      ord.estado = 'cerrada'; ord.coste = a.p_coste == null ? null : Number(a.p_coste); ord.moneda = a.p_moneda; ord.nota_cierre = a.p_nota; ord.cerrada_en = iso(HOY); ord.cerrada_por_email = 'yo@x.com';
      const u = b.unidades.find(x => x.id === ord.unidad_id);
      if (ord.bloquea_reservas && u.estado === 'taller' && !b.ordenes.some(x => x.unidad_id === u.id && x.estado === 'abierta' && x.bloquea_reservas)) u.estado = 'disponible';
      return { data: { id: ord.id, numero: ord.numero, estado: 'cerrada', unidad_estado: o.cierraQuedaTaller ? 'taller' : u.estado }, error: null };
    }
  }
  return err('42883', 'funcion desconocida ' + nombre);
}

const pagina = (idioma, ficha) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title></head><body>
${MARCADO}
<script>
window.__xss = undefined; window.__fromLlamado = 0; window.__fetchLlamado = 0; window.__sinEn = []; window.__errores = [];
window.fetch = function () { window.__fetchLlamado++; return Promise.reject(new Error('fetch')); };
var sb = {
  rpc: function (n, a) { return { then: function (f, g) { return window.__srv(n, a || {}).then(f, g); } }; },
  from: function () { window.__fromLlamado++; throw new Error('el navegador no toca la base'); },
  auth: { getSession: function () { return Promise.resolve({ data: { session: { access_token: 'JWT' } } }); } }
};
window.LW_AUTH = Promise.resolve({ sb: sb, ficha: ${JSON.stringify(ficha)} });
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
    await p.setContent(pagina(opts.idioma || 'es', opts.ficha || { rol: 'agente', herramientas: ['taller'] }), { waitUntil: 'load' });
    await p.waitForFunction(() => { const t = document.querySelector('[data-tl="estado"]').textContent; return !t.includes('Cargando') && !t.includes('Loading'); }, null, { timeout: 5000 });
    return { base, p, ctx };
  }
  const txt = (p, sel) => p.$eval(sel, e => e.textContent);
  const llamadas = (b, n) => b.llamadas.filter(x => x[0] === n);
  const espera = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: 5000 });
  const filas = p => p.$$('[data-tl="tabla"] tbody tr');
  const sinInyeccion = async p => (await p.$$('[data-tl="raiz"] img, [data-tl="raiz"] svg, [data-tl="raiz"] script')).length === 0 && (await p.evaluate(() => window.__xss)) === undefined;

  // 1. arranque: lista de abiertas, XSS y botones por estado
  {
    const { base, p, ctx } = await abre();
    const c0 = base.llamadas;
    ok('arranca pidiendo SOLO la lectura, con filtro abierta, 50 y sin cursor', c0.length === 1 && c0[0][0] === 'orden_trabajo_datos' && JSON.stringify(c0[0][1]) === JSON.stringify({ p_estado: 'abierta', p_limit: 50, p_despues: null }), JSON.stringify(c0));
    ok('pinta las 2 ordenes abiertas (no la cerrada)', (await filas(p)).length === 2);
    const t1 = await p.$eval('[data-orden-id="o1"]', tr => tr.textContent);
    ok('el motivo, la matricula y el correo con etiquetas/comillas se pintan como TEXTO', t1.includes(XSS_MOTIVO) && t1.includes('DK 3 TALLER'));
    ok('ningun <img>/<script>/<svg> salio de ningun dato', await sinInyeccion(p));
    const botones = async id => (await p.$$eval('[data-orden-id="' + id + '"] [data-accion]', bs => bs.map(b => b.getAttribute('data-accion')))).join();
    ok('una orden abierta ofrece detalle y cerrar', (await botones('o1')) === 'tl-detalle,tl-cerrar', await botones('o1'));
    await p.selectOption('[data-tl="f-estado"]', 'cerrada');
    await espera(p, () => document.querySelectorAll('[data-tl="tabla"] tbody tr').length === 1);
    ok('el filtro cerradas relee con p_estado cerrada y la cerrada ofrece solo detalle', llamadas(base, 'orden_trabajo_datos').pop()[1].p_estado === 'cerrada' && (await botones('o3')) === 'tl-detalle');
    await p.click('[data-orden-id="o3"] [data-accion="tl-detalle"]');
    const det = await txt(p, '[data-axw="dialogo"]');
    ok('el detalle enseña coste, nota y correo de cierre como texto', det.includes('150.000') && det.includes(XSS_NOTA) && det.includes(XSS_MAIL) && await sinInyeccion(p));
    await p.click('[data-accion="tl-modal-cerrar"]');
    await p.selectOption('[data-tl="f-estado"]', '');
    await espera(p, () => document.querySelectorAll('[data-tl="tabla"] tbody tr').length === 3);
    ok('el filtro Todas manda p_estado null', llamadas(base, 'orden_trabajo_datos').pop()[1].p_estado === null);
    ok('nada escribio por .from ni por fetch', (await p.evaluate(() => window.__fromLlamado + window.__fetchLlamado)) === 0);
    ok('ningun error de JS', (await p.evaluate(() => window.__errores)).length === 0);
    await ctx.close();
  }

  // 2. abrir: validaciones sin llamar, argumentos exactos, nada de autor/numero/estado, se lee de vuelta
  {
    const { base, p, ctx } = await abre();
    await p.click('[data-accion="tl-abrir"]');
    await espera(p, () => document.querySelector('select[data-campo="unidad"]'));
    const opts = await p.$$eval('select[data-campo="unidad"] option', os => os.map(o => o.textContent));
    ok('el selector ofrece las motos (con la matricula como texto) y marca la que ya esta en taller', opts.length === 4 && opts.includes('Elige una moto') && opts.some(o => o.includes(XSS_MATRICULA)) && opts.some(o => o.includes('En taller')), JSON.stringify(opts));
    ok('la casilla Bloquea viene marcada', await p.$eval('input[data-campo="bloquea"]', e => e.checked));
    await p.click('[data-accion="tl-modal-abrir"]');
    ok('sin moto no llama y lo dice', llamadas(base, 'orden_trabajo_abre').length === 0 && (await txt(p, '[data-axw="dialogo"]')).includes('Elige la moto'));
    await p.selectOption('select[data-campo="unidad"]', 'u1');
    await p.fill('input[data-campo="motivo"]', 'ab');
    await p.click('[data-accion="tl-modal-abrir"]');
    ok('un motivo de 2 caracteres no llama', llamadas(base, 'orden_trabajo_abre').length === 0 && (await txt(p, '[data-axw="dialogo"]')).includes('3 a 500'));
    await p.fill('input[data-campo="motivo"]', '   Cambio de frenos   ');
    await p.click('[data-accion="tl-modal-abrir"]');
    await espera(p, () => !document.querySelector('[data-axw="dialogo"]'));
    const ca = llamadas(base, 'orden_trabajo_abre');
    ok('abrir llama UNA vez con moto, motivo recortado y bloquea; SIN autor, numero, estado ni fechas',
       ca.length === 1 && JSON.stringify(ca[0][1]) === JSON.stringify({ p_unidad: 'u1', p_motivo: 'Cambio de frenos', p_bloquea: true }), JSON.stringify(ca));
    const ex = await txt(p, '[data-tl="exito"]');
    ok('lo anunciado es lo que devolvio la base (numero y estado de la moto)', ex.includes('OT-00011') && ex.includes('En taller'), ex);
    ok('la lista se relee y trae la orden nueva', (await filas(p)).length === 3 && llamadas(base, 'orden_trabajo_datos').length >= 2);
    ok('sigue sin inyectarse nada', await sinInyeccion(p));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre();
    await p.click('[data-accion="tl-abrir"]'); await espera(p, () => document.querySelector('select[data-campo="unidad"]'));
    await p.selectOption('select[data-campo="unidad"]', 'u2'); await p.fill('input[data-campo="motivo"]', 'Solo revisar luces');
    await p.uncheck('input[data-campo="bloquea"]');
    await p.click('[data-accion="tl-modal-abrir"]');
    await espera(p, () => !document.querySelector('[data-axw="dialogo"]'));
    ok('sin marcar Bloquea manda p_bloquea false y se anuncia que la moto sigue disponible', JSON.stringify(llamadas(base, 'orden_trabajo_abre')[0][1]) === JSON.stringify({ p_unidad: 'u2', p_motivo: 'Solo revisar luces', p_bloquea: false })
       && (await txt(p, '[data-tl="exito"]')).includes('Disponible'));
    await ctx.close();
  }
  {
    // reservas vivas: la base rechaza con la lista; la pantalla la enseña como texto y NO da por abierta nada
    const { base, p, ctx } = await abre({ base: { reservasVivas: true }, ficha: { rol: 'agente', herramientas: ['taller', 'reservas-producto'] } });
    await p.click('[data-accion="tl-abrir"]'); await espera(p, () => document.querySelector('select[data-campo="unidad"]'));
    await p.selectOption('select[data-campo="unidad"]', 'u1'); await p.fill('input[data-campo="motivo"]', 'Revision grande');
    await p.click('[data-accion="tl-modal-abrir"]');
    await espera(p, () => document.querySelector('[data-axw="dialogo"] .axw-error:not(.axw-oculto)'));
    const d = await txt(p, '[data-axw="dialogo"]');
    ok('se dice que tiene reservas pendientes y se lista cada una con su numero y fechas (como texto)', d.includes('2 reserva(s) pendientes') && d.includes('RSV-00007') && d.includes('RSV-<b>8') && await sinInyeccion(p));
    ok('con la herramienta Reservas se ofrece el enlace a Reservas de producto', (await p.$$('[data-axw="dialogo"] a[href="/intranet/v4/reservas-producto/"]')).length === 1);
    ok('el dialogo sigue abierto y no se anuncio nada', (await p.$$('[data-axw="dialogo"]')).length === 1 && (await txt(p, '[data-tl="exito"]')) === '');
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { reservasVivas: true } });
    await p.click('[data-accion="tl-abrir"]'); await espera(p, () => document.querySelector('select[data-campo="unidad"]'));
    await p.selectOption('select[data-campo="unidad"]', 'u1'); await p.fill('input[data-campo="motivo"]', 'Revision grande');
    await p.click('[data-accion="tl-modal-abrir"]');
    await espera(p, () => document.querySelector('[data-axw="dialogo"] .axw-error:not(.axw-oculto)'));
    ok('un mecanico SIN la herramienta Reservas no ve el enlace y se le dice a quien pedirlo',
       (await p.$$('[data-axw="dialogo"] a')).length === 0 && (await txt(p, '[data-axw="dialogo"]')).includes('Pídelo a quien lleve las reservas'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { abreFalla: true } });
    await p.click('[data-accion="tl-abrir"]'); await espera(p, () => document.querySelector('select[data-campo="unidad"]'));
    await p.selectOption('select[data-campo="unidad"]', 'u1'); await p.fill('input[data-campo="motivo"]', 'Duplicada');
    await p.click('[data-accion="tl-modal-abrir"]');
    await espera(p, () => document.querySelector('[data-axw="dialogo"] .axw-error:not(.axw-oculto)'));
    ok('una regla de la base (orden duplicada) se enseña con sus palabras y el dialogo sigue abierto', (await txt(p, '[data-axw="dialogo"] .axw-error')).includes('Ya hay una orden abierta'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { abreSinId: true } });
    await p.click('[data-accion="tl-abrir"]'); await espera(p, () => document.querySelector('select[data-campo="unidad"]'));
    await p.selectOption('select[data-campo="unidad"]', 'u1'); await p.fill('input[data-campo="motivo"]', 'Sin confirmar');
    await p.click('[data-accion="tl-modal-abrir"]');
    await espera(p, () => document.querySelector('[data-axw="dialogo"] .axw-error:not(.axw-oculto)'));
    ok('si la base no devuelve numero de orden NO se da por abierta', (await txt(p, '[data-axw="dialogo"] .axw-error')).includes('no confirmó') && (await txt(p, '[data-tl="exito"]')) === '');
    await ctx.close();
  }

  {
    const { p, ctx } = await abre({ base: { recortadas: true } });
    await p.click('[data-accion="tl-abrir"]'); await espera(p, () => document.querySelector('select[data-campo="unidad"]'));
    ok('si la base dice que las motos van recortadas, el formulario lo avisa', (await txt(p, '[data-axw="dialogo"]')).includes('primeras 500 motos'));
    await ctx.close();
  }

  // 3. cerrar: coste, moneda sugerida, validaciones, argumentos exactos, lo que devuelve la base
  {
    const { base, p, ctx } = await abre();
    await p.click('[data-orden-id="o1"] [data-accion="tl-cerrar"]');
    await espera(p, () => document.querySelector('input[data-campo="coste"]'));
    ok('la moneda viene sugerida con la del producto de la moto', (await p.$eval('input[data-campo="moneda"]', e => e.value)) === 'IDR');
    await p.fill('input[data-campo="coste"]', '12abc');
    await p.click('[data-accion="tl-modal-cierra"]');
    ok('un coste con letras no llama', llamadas(base, 'orden_trabajo_cierra').length === 0 && (await txt(p, '[data-axw="dialogo"]')).includes('número positivo'));
    await p.fill('input[data-campo="coste"]', '1,5'); await p.fill('input[data-campo="moneda"]', 'ID');
    await p.click('[data-accion="tl-modal-cierra"]');
    ok('un coste con una moneda de 2 letras no llama', llamadas(base, 'orden_trabajo_cierra').length === 0 && (await txt(p, '[data-axw="dialogo"]')).includes('tres letras'));
    await p.fill('input[data-campo="coste"]', '150.000'); await p.fill('input[data-campo="moneda"]', 'IDR');
    await p.click('[data-accion="tl-modal-cierra"]');
    ok('«150.000» en IDR NO llama (se guardaria como 150) y pide escribirlo sin separador', llamadas(base, 'orden_trabajo_cierra').length === 0 && (await txt(p, '[data-axw="dialogo"]')).includes('sin puntos ni comas'));
    await p.fill('input[data-campo="coste"]', '1.500'); await p.fill('input[data-campo="moneda"]', 'EUR');
    await p.click('[data-accion="tl-modal-cierra"]');
    ok('«1.500» en EUR es ambiguo y NO llama', llamadas(base, 'orden_trabajo_cierra').length === 0 && (await txt(p, '[data-axw="dialogo"]')).includes('ambiguo'));
    await p.fill('input[data-campo="coste"]', '150000'); await p.fill('input[data-campo="moneda"]', 'idr'); await p.fill('textarea[data-campo="nota"]', '  Pastillas nuevas  ');
    await p.click('[data-accion="tl-modal-cierra"]');
    await espera(p, () => !document.querySelector('[data-axw="dialogo"]'));
    const cc = llamadas(base, 'orden_trabajo_cierra');
    ok('cerrar llama UNA vez con orden, coste como texto, moneda en mayusculas y nota recortada',
       cc.length === 1 && JSON.stringify(cc[0][1]) === JSON.stringify({ p_id: 'o1', p_coste: '150000', p_moneda: 'IDR', p_nota: 'Pastillas nuevas' }), JSON.stringify(cc));
    const ex = await txt(p, '[data-tl="exito"]');
    ok('lo anunciado sale de la respuesta: orden cerrada y la moto vuelve a disponible', ex.includes('OT-00001') && ex.includes('Disponible'), ex);
    ok('la lista se relee y la orden ya no esta entre las abiertas', (await filas(p)).length === 1);
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre();
    await p.click('[data-orden-id="o2"] [data-accion="tl-cerrar"]'); await espera(p, () => document.querySelector('input[data-campo="coste"]'));
    await p.fill('input[data-campo="moneda"]', '');
    await p.click('[data-accion="tl-modal-cierra"]');
    await espera(p, () => !document.querySelector('[data-axw="dialogo"]'));
    ok('sin coste ni nota manda p_coste, p_moneda y p_nota a null', JSON.stringify(llamadas(base, 'orden_trabajo_cierra')[0][1]) === JSON.stringify({ p_id: 'o2', p_coste: null, p_moneda: null, p_nota: null }));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { cierraQuedaTaller: true } });
    await p.click('[data-orden-id="o1"] [data-accion="tl-cerrar"]'); await espera(p, () => document.querySelector('input[data-campo="coste"]'));
    await p.click('[data-accion="tl-modal-cierra"]');
    await espera(p, () => !document.querySelector('[data-axw="dialogo"]'));
    ok('si queda otra orden que bloquea, se anuncia que la moto SIGUE en taller (lo que dice la base)', (await txt(p, '[data-tl="exito"]')).includes('En taller'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { cierraMal: true } });
    await p.click('[data-orden-id="o1"] [data-accion="tl-cerrar"]'); await espera(p, () => document.querySelector('input[data-campo="coste"]'));
    await p.click('[data-accion="tl-modal-cierra"]');
    await espera(p, () => document.querySelector('[data-axw="dialogo"] .axw-error:not(.axw-oculto)'));
    ok('si la base devuelve otro estado NO se da por cerrada y se dice', (await txt(p, '[data-axw="dialogo"] .axw-error')).includes('no confirmó') && (await txt(p, '[data-tl="exito"]')) === '');
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { cierraDecimales: true } });
    await p.click('[data-orden-id="o1"] [data-accion="tl-cerrar"]'); await espera(p, () => document.querySelector('input[data-campo="coste"]'));
    await p.fill('input[data-campo="coste"]', '12.3456'); await p.fill('input[data-campo="moneda"]', 'EUR');
    await p.click('[data-accion="tl-modal-cierra"]');
    await espera(p, () => document.querySelector('[data-axw="dialogo"] .axw-error:not(.axw-oculto)'));
    ok('la regla de decimales de la base se enseña con sus palabras (la pantalla no redondea)', (await txt(p, '[data-axw="dialogo"] .axw-error')).includes('no admite tantos decimales'));
    await ctx.close();
  }
  {
    // doble clic: un solo envio
    const { base, p, ctx } = await abre({ base: { lento: 300 } });
    await p.click('[data-orden-id="o1"] [data-accion="tl-cerrar"]'); await espera(p, () => document.querySelector('input[data-campo="coste"]'));
    await p.evaluate(() => { const b = document.querySelector('[data-accion="tl-modal-cierra"]'); b.click(); b.click(); });
    await espera(p, () => !document.querySelector('[data-axw="dialogo"]'));
    ok('doble clic en Cerrar la orden: UNA sola llamada', llamadas(base, 'orden_trabajo_cierra').length === 1);
    await ctx.close();
  }

  // 4. estados de lectura: «no se ha podido mirar» NO es «no hay ordenes»
  for (const [nombre, base, esperado] of [
    ['modulo apagado', { moduloApagado: true }, 'apagado'], ['sin permiso', { sinPermiso: true }, 'No tienes permiso'],
    ['funcion no disponible', { noDisponible: ['orden_trabajo_datos'] }, 'todavía no está disponible'], ['sin red', { sinRed: 'orden_trabajo_datos' }, 'no ha respondido'],
    ['forma inesperada', { datosRaros: true }, 'inesperado']]) {
    const { p, ctx } = await abre({ base });
    const t = await txt(p, '[data-tl="estado"]');
    ok(nombre + ': se dice «no se ha podido mirar» (' + esperado + ') y no «no hay órdenes»', t.includes('No se ha podido mirar') && t.includes(esperado) && !t.includes('No hay órdenes') && (await filas(p)).length === 0, t);
    await ctx.close();
  }
  {
    // lista de verdad vacia
    const { base, p, ctx } = await abre();
    base.ordenes.length = 0;
    await p.click('[data-accion="tl-actualizar"]');
    await espera(p, () => document.querySelector('[data-tl="estado"]').textContent.includes('No hay'));
    ok('una lista realmente vacia dice «No hay órdenes abiertas.»', (await txt(p, '[data-tl="estado"]')) === 'No hay órdenes abiertas.');
    await ctx.close();
  }
  {
    // paginacion
    const { base, p, ctx } = await abre({ base: { pagina: true } });
    ok('con siguiente aparece «Cargar más»', await p.$eval('[data-accion="tl-mas"]', e => !e.classList.contains('axw-oculto')));
    await p.click('[data-accion="tl-mas"]');
    await espera(p, () => document.querySelectorAll('[data-tl="tabla"] tbody tr').length >= 3);
    ok('Cargar más manda el cursor que dio la base', llamadas(base, 'orden_trabajo_datos').pop()[1].p_despues === 'o1');
    await ctx.close();
  }

  // 5. ingles: ningun texto sin traducir
  {
    const { p, ctx } = await abre({ idioma: 'en', ficha: { rol: 'agente', herramientas: ['taller', 'reservas-producto'] } });
    await p.click('[data-orden-id="o1"] [data-accion="tl-detalle"]'); await p.click('[data-accion="tl-modal-cerrar"]');
    await p.click('[data-orden-id="o1"] [data-accion="tl-cerrar"]'); await espera(p, () => document.querySelector('input[data-campo="coste"]'));
    await p.click('[data-accion="tl-modal-cierra"]'); await espera(p, () => !document.querySelector('[data-axw="dialogo"]'));
    await p.click('[data-accion="tl-abrir"]'); await espera(p, () => document.querySelector('select[data-campo="unidad"]'));
    await p.click('[data-accion="tl-modal-abrir"]'); await p.selectOption('select[data-campo="unidad"]', 'u1'); await p.click('[data-accion="tl-modal-abrir"]');
    await p.click('[data-accion="tl-modal-cerrar"]');
    const sin = await p.evaluate(() => window.__sinEn);
    ok('en ingles ninguna cadena queda sin traducir', sin.length === 0, JSON.stringify(sin.slice(0, 8)));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ idioma: 'en', base: { reservasVivas: true }, ficha: { rol: 'agente', herramientas: ['taller', 'reservas-producto'] } });
    await p.click('[data-accion="tl-abrir"]'); await espera(p, () => document.querySelector('select[data-campo="unidad"]'));
    await p.selectOption('select[data-campo="unidad"]', 'u1'); await p.fill('input[data-campo="motivo"]', 'Big service'); await p.click('[data-accion="tl-modal-abrir"]');
    await espera(p, () => document.querySelector('[data-axw="dialogo"] .axw-error:not(.axw-oculto)'));
    const sin = await p.evaluate(() => window.__sinEn);
    ok('en ingles tampoco queda nada sin traducir en el aviso de reservas vivas', sin.length === 0, JSON.stringify(sin.slice(0, 8)));
    await ctx.close();
  }

  // 6. responsive: sin scroll horizontal de pagina a 390 px, ni el dialogo fuera de pantalla; capturas
  for (const ancho of [1440, 390]) {
    const { p, ctx } = await abre({ ancho });
    await p.selectOption('[data-tl="f-estado"]', ''); await espera(p, () => document.querySelectorAll('[data-tl="tabla"] tbody tr').length === 3);
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(ancho + ' px · la lista no desborda la pagina', m.sw <= m.cw, JSON.stringify(m));
    if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_lista.png', fullPage: true });
    await p.click('[data-accion="tl-abrir"]'); await p.waitForSelector('select[data-campo="unidad"]');
    const dlg = await p.$eval('[data-axw="dialogo"] .axw-modal', e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: window.innerWidth, sw: e.scrollWidth, cw: e.clientWidth }; });
    ok(ancho + ' px · el formulario de abrir orden cabe en pantalla', dlg.l >= 0 && dlg.r <= dlg.w + 1 && dlg.sw <= dlg.cw + 1, JSON.stringify(dlg));
    if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_abrir.png' });
    await ctx.close();
  }

  await nav.close();
  console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\nTODO EN VERDE');
  process.exit(fallos ? 1 : 0);
})();
