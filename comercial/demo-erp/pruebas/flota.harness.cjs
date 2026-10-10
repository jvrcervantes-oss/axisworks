// node comercial/demo-erp/pruebas/flota.harness.cjs [captura_prefijo]
// Harness de la pantalla Flota y tarifas del maestro (F8, 10-oct-2026): el flota.html REAL (marcado + script, con las ayudas comunes de _compartido/ pegadas como hace build.py) en Chromium, con la base y
// la sesion SIMULADAS (page.exposeFunction): una base en memoria que imita el CONTRATO que le dio el encargo (producto_flota_datos con topes y versiones; producto_unidades_alta_lote atomico;
// producto_unidad_guarda y producto_tarifa_guarda/borra con p_esperado = actualizado_en y hints campo_no_admitido, datos, flota_cambio (40001), flota_duplicada, flota_tope, reservas_vivas, motivo,
// decimales_moneda, moneda_no_permitida). Mide el COMPORTAMIENTO, no el codigo: que pide y con que argumentos, que pinta con cada respuesta, XSS, «no se ha podido mirar» != «no hay productos»,
// la lista pegada, el precio sin adivinar, el conflicto de version, el doble clic, es/en y que a 390 px no hay scroll horizontal.
// OJO: la base real (migracion 138600) la escribe otra sesion. Lo que sale de aqui prueba la pantalla contra el contrato, no contra Postgres.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const COMUN_JS = fs.readFileSync(path.join(__dirname, '..', '_compartido', 'pantalla_comun.js'), 'utf8').trim();
const COMUN_CSS = fs.readFileSync(path.join(__dirname, '..', '_compartido', 'pantalla_comun.css'), 'utf8').trim();
const FUENTE = fs.readFileSync(path.join(__dirname, '..', 'flota.html'), 'utf8');
const [MARCADO0, SCRIPT0] = FUENTE.split('<!--AXW_SCRIPT-->');
const MARCADO = MARCADO0.split('/*AXW_COMUN_CSS*/').join(COMUN_CSS);
const SCRIPT = SCRIPT0.split('/*AXW_COMUN_JS*/').join(COMUN_JS);
const SHOT = process.argv[2];
let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' -> ' + extra : '')); } else console.log('ok     ' + nombre); };

const XSS_ID = `AB 1 <img src=x onerror="window.__xss=1"> 'q"`;
const XSS_NOTAS = `nota <svg onload="window.__xss=2"> "d" 'q'`;
const XSS_ETQ = `Semana <img src=x onerror="window.__xss=3">`;
const XSS_MOTIVO = `"><img src=x onerror="window.__xss=4"> O'Brien <script>window.__xss=5</script>`;
const XSS_QUIEN = `a"<svg onload="window.__xss=6">@x.com`;
const XSS_NOMBRE = `Honda <img src=x onerror="window.__xss=7"> Beat`;
const MSG_VIVAS = `La moto B 1234 XY tiene 2 reservas vivas: <b>no se puede</b> pasar a taller`;
const TOPES = { precio: { min: 1000, max_por_moneda: { IDR: 50000000, EUR: 5000, USD: 5000 } }, dias: { min: 1, max: 366 }, lote: { max: 100 }, unidades_por_producto: { max: 250 },
  motivo: { min: 3, max: 200 }, identificador: { min: 3, max: 20 } };
let reloj = 0;
const marca = () => '2026-10-10T08:' + String(10 + Math.floor(reloj / 100)).padStart(2, '0') + ':' + String(reloj++ % 100).padStart(2, '0') + '.' + String(123456 + reloj).padStart(6, '0') + '+00:00';   // con microsegundos, como timestamptz
const err = (code, message, hint, details) => ({ data: null, error: { code, message, hint: hint || null, details: details || null } });
const J = x => JSON.stringify(x);

function nuevaBase(o = {}) {
  const s = { llamadas: [], o, n: 100, topes: o.topes || TOPES, productos: [], versiones: [] };
  const u = (id, ident, estado, notas) => ({ id, numero: id.toUpperCase(), identificador: ident, estado: estado || 'disponible', notas: notas == null ? null : notas, actualizado_en: marca() });
  const t = (id, dias, precio, moneda, etiqueta) => ({ id, dias, precio, moneda: moneda || 'IDR', etiqueta: etiqueta || null, actualizado_en: marca() });
  if (!o.vacio) {
    s.productos.push({ id: 'p1', numero: 'P-1', nombre: o.xss ? XSS_NOMBRE : 'Honda Beat', activo: true,
      unidades: [u('u1', o.xss ? XSS_ID : 'DK 1234 AB', 'disponible', o.xss ? XSS_NOTAS : 'Casco nuevo'), u('u2', 'DK 2345 CD', 'disponible', null), u('u3', 'B 1234 XY', 'taller', 'Cambio de aceite')],
      tarifas: [t('t1', 1, 150000, 'IDR', o.xss ? XSS_ETQ : 'Dia suelto'), t('t3', 3, 400000, 'IDR', null), t('t7', 7, 900000, 'IDR', 'Semana')] });
    if (!o.soloUno) s.productos.push({ id: 'p2', numero: 'P-2', nombre: 'Vario 160', activo: true, unidades: o.sinUnidades ? [] : [u('u4', 'DK 7777 ZZ')], tarifas: o.sinTarifas ? [] : [t('t21', 1, 200000, 'IDR')] });
    if (o.sinAmbos) s.productos.push({ id: 'p3', numero: 'P-3', nombre: 'Scoopy', activo: true, unidades: [], tarifas: [] });
    if (o.mezcla) s.productos.push({ id: 'p4', numero: 'P-4', nombre: 'Mixta', activo: true, unidades: [u('u9', 'DK 9999 MM')], tarifas: [t('t41', 1, 100000, 'IDR'), t('t42', 2, 20, 'EUR')] });
    if (o.unaTarifa) s.productos.push({ id: 'p5', numero: 'P-5', nombre: 'Una sola', activo: true, unidades: [u('u10', 'DK 1010 UN')], tarifas: [t('t51', 1, 120000, 'IDR')] });
    if (o.solaTarifaIDR) { s.productos = s.productos.filter(x => x.id !== 'p1'); }
  }
  s.versiones = o.vacio ? [] : [{ cuando: marca(), quien: o.xss ? XSS_QUIEN : 'admin@x.com', motivo: o.xss ? XSS_MOTIVO : 'Alta inicial', tabla: 'producto_unidades', que: 'alta' }];
  return s;
}
function datos(s) {
  const prods = JSON.parse(JSON.stringify(s.productos)).map(p => {
    const faltan = [];
    if (!p.tarifas.length) faltan.push('tarifas');
    if (!p.unidades.some(x => x.estado === 'disponible')) faltan.push('unidades');
    return Object.assign(p, { listo_para_reservar: faltan.length === 0, faltan });
  });
  return { productos: prods, recortado: !!s.o.recortado, topes: s.topes, versiones: JSON.parse(JSON.stringify(s.versiones)) };
}
const buscaU = (s, id) => { for (const p of s.productos) { const x = p.unidades.find(y => y.id === id); if (x) return [p, x]; } return [null, null]; };
const norm = x => String(x).replace(/^\s+|\s+$/g, '').toUpperCase();
const vermotivo = (s, m) => (!m || m.length < s.topes.motivo.min || m.length > s.topes.motivo.max) ? err('22023', 'El motivo es obligatorio (entre ' + s.topes.motivo.min + ' y ' + s.topes.motivo.max + ' caracteres)', 'motivo') : null;
function apunta(s, tabla, que, motivo) { s.versiones.unshift({ cuando: marca(), quien: 'yo@x.com', motivo, tabla, que }); }

async function servidor(s, nombre, a) {
  s.llamadas.push([nombre, JSON.parse(JSON.stringify(a))]);
  const o = s.o;
  if (o.lento && nombre !== 'producto_flota_datos') await new Promise(r => setTimeout(r, o.lento));
  if (o.lento && nombre === 'producto_flota_datos' && !s.__leida) { s.__leida = true; await new Promise(r => setTimeout(r, o.lento)); }
  if (o.sinRed && nombre === o.sinRed) return { data: null, error: { message: 'Failed to fetch' } };
  if (o.noDisponible && o.noDisponible.includes(nombre)) return err('PGRST202', 'Could not find the function public.' + nombre + ' in the schema cache');
  if (o.moduloApagado) return err('42501', nombre + ': módulo no activo', 'modulo_apagado');
  if (o.noAdmin && (nombre !== 'producto_flota_datos' || !o.noAdminSoloEscribe)) return err('42501', 'La flota la ve y la edita un admin');
  switch (nombre) {
    case 'producto_flota_datos':
      if (o.datosRaros) return { data: { productos: 'nada' }, error: null };
      if (o.sinTopes) { const d = datos(s); delete d.topes; return { data: d, error: null }; }
      if (o.fallaLecturaTrasGuardar && s.llamadas.some(x => x[0] !== 'producto_flota_datos')) return { data: null, error: { message: 'Failed to fetch' } };
      return { data: datos(s), error: null };
    case 'producto_unidades_alta_lote': {
      const m = vermotivo(s, a.p_motivo); if (m) return m;
      const p = s.productos.find(x => x.id === a.p_producto_id);
      if (!p) return err('22023', 'Producto no encontrado', 'datos');
      if (!Array.isArray(a.p_identificadores)) return err('22023', 'Hace falta la lista', 'datos');
      if (a.p_identificadores.length > s.topes.lote.max) return err('22023', 'El lote supera el máximo de ' + s.topes.lote.max, 'flota_tope');
      const nuevos = a.p_identificadores.map(norm);
      const todos = [].concat(...s.productos.map(x => x.unidades.map(y => norm(y.identificador)))).concat(o.ocultas || []);
      const dup = nuevos.find((x, i) => nuevos.indexOf(x) !== i || todos.includes(x));
      if (dup) return err('23505', 'La matrícula ' + dup + ' ya existe: no se añadió ninguna del lote', 'flota_duplicada');
      const mal = nuevos.find(x => x.length < s.topes.identificador.min || x.length > s.topes.identificador.max);
      if (mal) return err('22023', 'Identificador no válido: ' + mal, 'datos');
      nuevos.forEach(x => p.unidades.push({ id: 'n' + (s.n++), numero: 'N' + s.n, identificador: x, estado: 'disponible', notas: null, actualizado_en: marca() }));
      apunta(s, 'producto_unidades', 'alta de ' + nuevos.length, a.p_motivo);
      return { data: nuevos.length, error: null };
    }
    case 'producto_unidad_guarda': {
      if (o.otroCambia && !s.__otro) { s.__otro = true; const [, x] = buscaU(s, a.p_id); x.actualizado_en = marca(); x.notas = 'Cambiado por otra persona'; }
      const [p, x] = buscaU(s, a.p_id);
      if (!x) return err('22023', 'La unidad no existe', 'datos');
      if (x.actualizado_en !== a.p_esperado) return err('40001', 'Otra persona cambió esta moto mientras la editabas', 'flota_cambio');
      const extra = Object.keys(a.p_datos).filter(k => !['producto_id', 'identificador', 'estado', 'notas'].includes(k));
      if (extra.length) return err('22023', 'Campo no admitido: ' + extra.join(', '), 'campo_no_admitido');
      const m = vermotivo(s, a.p_motivo); if (m) return m;
      if (o.vivas && a.p_datos.estado !== 'disponible') return err('22023', MSG_VIVAS, 'reservas_vivas');
      if (norm(a.p_datos.identificador).length < s.topes.identificador.min) return err('22023', 'Identificador demasiado corto', 'datos');
      Object.assign(x, a.p_datos, { actualizado_en: marca() }); apunta(s, 'producto_unidades', 'edita ' + x.identificador, a.p_motivo);
      return { data: x.id, error: null };
    }
    case 'producto_tarifa_guarda': {
      const p = s.productos.find(y => y.id === a.p_producto_id);
      if (!p) return err('22023', 'Producto no encontrado', 'datos');
      if (o.otroCambiaTarifa && !s.__otroT) { s.__otroT = true; const tt = p.tarifas.find(y => y.dias === a.p_dias); if (tt) { tt.actualizado_en = marca(); tt.precio = tt.precio + 5000; } }
      const m = vermotivo(s, a.p_motivo); if (m) return m;
      if (!Number.isInteger(a.p_dias) || a.p_dias < s.topes.dias.min || a.p_dias > s.topes.dias.max) return err('22023', 'Los días van de ' + s.topes.dias.min + ' a ' + s.topes.dias.max, 'datos');
      if (!(a.p_moneda in s.topes.precio.max_por_moneda)) return err('22023', 'Moneda no permitida: ' + a.p_moneda, 'moneda_no_permitida');
      if (typeof a.p_precio !== 'number' || a.p_precio < s.topes.precio.min || a.p_precio > s.topes.precio.max_por_moneda[a.p_moneda]) return err('22023', 'El precio ' + a.p_precio + ' queda fuera del rango permitido', 'datos');
      if (a.p_moneda === 'IDR' && !Number.isInteger(a.p_precio)) return err('22023', 'La rupia no admite decimales', 'decimales_moneda');
      if (p.tarifas.length >= 2 && p.tarifas.some(y => y.moneda !== a.p_moneda)) return err('22023', 'No se puede mezclar monedas en un producto', 'datos');
      const ex = p.tarifas.find(y => y.dias === a.p_dias);
      if (ex) { if (ex.actualizado_en !== a.p_esperado) return err('40001', 'Otra persona cambió este tramo mientras lo editabas', 'flota_cambio'); Object.assign(ex, { precio: a.p_precio, moneda: a.p_moneda, etiqueta: a.p_etiqueta, actualizado_en: marca() }); }
      else { if (a.p_esperado != null) return err('40001', 'El tramo cambió', 'flota_cambio'); p.tarifas.push({ id: 'tn' + (s.n++), dias: a.p_dias, precio: a.p_precio, moneda: a.p_moneda, etiqueta: a.p_etiqueta, actualizado_en: marca() }); }
      apunta(s, 'producto_tarifas', 'tramo ' + a.p_dias, a.p_motivo);
      return { data: 'ok', error: null };
    }
    case 'producto_tarifa_borra': {
      const m = vermotivo(s, a.p_motivo); if (m) return m;
      let hallado = null; s.productos.forEach(p => { const i = p.tarifas.findIndex(y => y.id === a.p_id); if (i >= 0) hallado = [p, i]; });
      if (!hallado) return err('22023', 'El tramo no existe', 'datos');
      if (hallado[0].tarifas[hallado[1]].actualizado_en !== a.p_esperado) return err('40001', 'Otra persona cambió este tramo', 'flota_cambio');
      hallado[0].tarifas.splice(hallado[1], 1); apunta(s, 'producto_tarifas', 'borra', a.p_motivo);
      return { data: true, error: null };
    }
  }
  return err('42883', 'funcion desconocida ' + nombre);
}

const pagina = (idioma) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title></head><body>
${MARCADO}
<script>
window.__xss = undefined; window.__fromLlamado = 0; window.__fetchLlamado = 0; window.__sinEn = []; window.__errores = [];
window.fetch = function () { window.__fetchLlamado++; return Promise.reject(new Error('fetch')); };
var sb = {
  rpc: function (n, a) { return { then: function (f, g) { return window.__srv(n, a || {}).then(f, g); } }; },
  from: function () { window.__fromLlamado++; throw new Error('el navegador no toca la base'); },
  auth: { getSession: function () { return Promise.resolve({ data: { session: { access_token: 'JWT' } } }); } }
};
window.LW_AUTH = Promise.resolve({ sb: sb, ficha: { rol: 'agente', herramientas: ['flota'] } });
window.lwDatos = function (n, a) { return Promise.resolve(sb.rpc(n, a)).then(function (r) { return { data: r.data, error: r.error }; }); };
window.LW_IDIOMA = '${idioma}';
window.LW_EN = {};
window.lwLocale = function () { return window.LW_IDIOMA === 'en' ? 'en-GB' : 'es-ES'; };
window.lwT = function (s) { s = String(s); if (window.LW_IDIOMA === 'en') { if (Object.prototype.hasOwnProperty.call(window.LW_EN, s)) return window.LW_EN[s]; if (!/^[\\s\u2014\u00b70-9.,%():\u2265\u2264-]*$/.test(s)) window.__sinEn.push(s); } return s; };
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
    if (!opts.sinEspera) await p.waitForFunction(() => document.querySelector('[data-fl="estado"]').getAttribute('data-tipo') !== 'cargando', null, { timeout: 5000 });
    return { base, p, ctx };
  }
  const txt = (p, sel) => p.$eval(sel, e => e.textContent);
  const llamadas = (b, n) => b.llamadas.filter(x => x[0] === n);
  const escritas = b => b.llamadas.filter(x => x[0] !== 'producto_flota_datos');
  const espera = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: 5000 });
  const hasta = async f => { for (let i = 0; i < 100; i++) { if (f()) return true; await new Promise(r => setTimeout(r, 50)); } return false; };
  const campo = n => '[data-campo="' + n + '"]';
  const accion = (a, extra = '') => '[data-accion="' + a + '"]' + extra;
  const visible = (p, sel) => p.$eval(sel, e => !e.classList.contains('axw-oculto'));
  const tipo = p => p.$eval('[data-fl="estado"]', e => e.getAttribute('data-tipo'));
  const dlg = p => p.$$('[data-axw="dialogo"]').then(a => a.length);
  const dlgError = p => p.$eval('[data-axw="dialogo"] .axw-error', e => e.textContent);
  const dlgTxt = p => txt(p, '[data-axw="dialogo"]');
  const msgOk = p => txt(p, '[data-fl="exito"]');
  const confirmar = p => p.click(accion('fl-modal-confirmar'));
  const esperaCierre = p => espera(p, () => !document.querySelector('[data-axw="dialogo"]'));
  const sinInyeccion = async p => (await p.$$('[data-fl="raiz"] img, [data-fl="raiz"] svg, [data-fl="raiz"] script')).length === 0 && (await p.evaluate(() => window.__xss)) === undefined;
  const sinErrores = async p => (await p.evaluate(() => window.__errores)).length === 0 && (await p.evaluate(() => window.__fromLlamado + window.__fetchLlamado)) === 0;
  const desborde = p => p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  const motivo = (p, v = 'Motivo de prueba') => p.fill(campo('motivo'), v);
  const prod = id => '[data-producto-id="' + id + '"]';
  const nLineas = n => Array.from({ length: n }, (_, i) => '  dk ' + String(1000 + i) + ' ab  ').join('\n');
  const cuerpo = (p, id) => p.$eval('section' + prod(id), e => e.textContent);

  // 1. cargando · listo · estructura
  {
    const { base, p, ctx } = await abre({ base: { lento: 400 }, sinEspera: true });
    await espera(p, () => document.querySelector('[data-fl="estado"]').getAttribute('data-tipo') === 'cargando');
    ok('mientras lee dice «Cargando…» y NO enseña el contenido ni dice nada del rol', (await txt(p, '[data-fl="estado"]')).includes('Cargando') && !(await visible(p, '[data-fl="contenido"]')) && !(await txt(p, '[data-fl="estado"]')).includes('administra'));
    await espera(p, () => document.querySelector('[data-fl="estado"]').getAttribute('data-tipo') === 'listo');
    ok('al llegar la lectura enseña los productos y oculta el estado', (await visible(p, '[data-fl="contenido"]')) && !(await visible(p, '[data-fl="estado"]')) && (await p.$$('section[data-producto-id]')).length === 2);
    ok('arranca pidiendo SOLO la lectura, sin argumentos', base.llamadas.length === 1 && base.llamadas[0][0] === 'producto_flota_datos' && J(base.llamadas[0][1]) === '{}', J(base.llamadas));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre();
    ok('el producto listo dice «Listo para reservar» y sin avisos de «no se podrá cotizar»', (await cuerpo(p, 'p1')).includes('Listo para reservar') && !(await cuerpo(p, 'p1')).includes('no se podrá cotizar') && (await p.$$('section' + prod('p1') + ' [data-fl="faltan"]')).length === 0);
    ok('las motos salen con identificador, estado y notas; la de taller dice «En taller»', (await p.$$('section' + prod('p1') + ' .fl-fila[data-unidad-id]')).length === 3 && (await txt(p, '[data-unidad-id="u3"]')).includes('En taller') && (await txt(p, '[data-unidad-id="u1"]')).includes('Casco nuevo'));
    ok('los tramos salen ordenados por dias con precio y moneda (sin inventar importes)', (await p.$$eval('section' + prod('p1') + ' .fl-fila[data-tarifa-id]', fs => fs.map(f => f.getAttribute('data-dias')))).join() === '1,3,7' && /150\.000/.test(await txt(p, '[data-tarifa-id="t1"]')) && (await txt(p, '[data-tarifa-id="t1"]')).includes('IDR'));
    ok('el aviso fijo «las reservas ya hechas no cambian de precio» y el texto de cuando llega al bot estan visibles', (await txt(p, '[data-fl="nota-fija"]')).includes('Las reservas ya hechas no cambian de precio') && (await txt(p, '[data-fl="bot"]')).includes('El bot lo usa en cuanto se actualice su catálogo'));
    ok('las versiones salen en una seccion plegable (details) cerrada', (await p.$eval('[data-fl="detalle-versiones"]', e => e.tagName === 'DETAILS' && !e.open)) && (await p.$$('[data-fl="versiones"] tbody tr')).length === 1);
    ok('sin errores de JS y sin tocar la base ni fetch', await sinErrores(p));
    await ctx.close();
  }

  // 2. avisos: sin tarifas / sin motos / sin nada
  {
    const { p, ctx } = await abre({ base: { sinTarifas: true } });
    const t = await cuerpo(p, 'p2');
    ok('sin tarifas: «No se puede reservar todavía» y «no se podrá cotizar»', t.includes('No se puede reservar todavía') && t.includes('Sin tarifas: no se podrá cotizar') && (await p.$eval('section' + prod('p2'), e => e.getAttribute('data-listo'))) === '0');
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { sinUnidades: true } });
    ok('sin motos: aviso «Faltan motos disponibles: no se podrá cotizar» y «Este producto no tiene motos»', (await cuerpo(p, 'p2')).includes('Faltan motos disponibles: no se podrá cotizar') && (await cuerpo(p, 'p2')).includes('Este producto no tiene motos'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { sinAmbos: true } });
    ok('sin tarifas y sin motos: salen las dos razones', (await cuerpo(p, 'p3')).includes('Sin tarifas') && (await cuerpo(p, 'p3')).includes('Faltan motos'));
    await ctx.close();
  }

  // 3. vacio ≠ error de lectura ≠ sin permiso
  {
    const { p, ctx } = await abre({ base: { vacio: true } });
    ok('sin productos: estado propio «vacio» con enlace a Productos (no «error»)', (await tipo(p)) === 'vacio' && (await txt(p, '[data-fl="estado"]')).includes('Aún no hay productos') && (await p.$$('[data-fl="estado"] a[href="/intranet/v4/productos/"]')).length === 1 && (await p.$$('section[data-producto-id]')).length === 0);
    await ctx.close();
  }
  for (const [nombre, base, esperado] of [
    ['modulo apagado', { moduloApagado: true }, 'apagado'], ['funcion no disponible', { noDisponible: ['producto_flota_datos'] }, 'todavía no está disponible'],
    ['sin red', { sinRed: 'producto_flota_datos' }, 'no ha respondido'], ['forma inesperada', { datosRaros: true }, 'inesperado'], ['sin topes (contrato incompleto)', { sinTopes: true }, 'inesperado']]) {
    const { p, ctx } = await abre({ base });
    const t = await txt(p, '[data-fl="estado"]');
    ok(nombre + ': se dice «no se ha podido mirar» (' + esperado + '), tipo error, y NO se enseña «Aún no hay productos» ni una lista vacia',
       (await tipo(p)) === 'error' && t.includes('No se ha podido mirar') && t.includes(esperado) && !t.includes('Aún no hay productos') && !(await visible(p, '[data-fl="contenido"]')), t);
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { noAdmin: true } });
    const t = await txt(p, '[data-fl="estado"]');
    ok('42501 de la base: DESPUES de la respuesta dice que es solo de la administracion (tipo sin_permiso) y no hay contenido', (await tipo(p)) === 'sin_permiso' && t.includes('Solo la administración') && !t.includes('No se ha podido mirar') && !(await visible(p, '[data-fl="contenido"]')), t);
    ok('la pantalla no mira el rol del usuario para decidirlo: lee y espera', base.llamadas.length === 1);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { recortado: true } });
    ok('lista recortada (recortado=true): avisa y no cita ningun numero', (await visible(p, '[data-fl="recortado"]')) && !/\d/.test(await txt(p, '[data-fl="recortado"]')));
    await ctx.close();
    const b2 = await abre();
    ok('sin recortar el aviso no sale', !(await visible(b2.p, '[data-fl="recortado"]')));
    await b2.ctx.close();
  }

  // 4. añadir motos: lista pegada
  {
    const { base, p, ctx } = await abre();
    await p.click(accion('fl-lote-abrir', prod('p1')));
    ok('abre la ventana de alta y un segundo clic no abre otra', (await dlg(p)) === 1 && await p.evaluate(() => { document.querySelector('[data-accion="fl-lote-abrir"]').click(); return document.querySelectorAll('[data-axw="dialogo"]').length === 1; }));
    const lista = nLineas(98).split('\n').concat(['', '   ', '\t', ' DK 1000 AB ', 'xy 55 zz']).join('\n');
    await p.fill(campo('lista'), lista);
    const res = await txt(p, '[data-fl="previa-resumen"]');
    ok('la vista previa normaliza (recorte + mayusculas), cuenta las vacias y marca la repetida (DK 1000 AB 2 veces)', res.includes('99 para añadir') && res.includes('3 líneas vacías ignoradas') && res.includes('1 repetidas en la lista'), res);
    ok('el duplicado interno sale marcado «Repetida» y el boton de quitar repetidas esta activo', (await p.$$('[data-fila="repetida"]')).length === 1 && (await p.$eval(accion('fl-modal-dedup'), b => !b.disabled)));
    await motivo(p, 'Compra de lote'); await confirmar(p);
    ok('con repetidas NO se envia y lo explica', escritas(base).length === 0 && (await dlgError(p)).includes('repetidas'));
    await p.click(accion('fl-modal-dedup'));
    ok('quitar repetidas deja la lista sin duplicados y el resumen cuadra (99+... sin repetida)', (await txt(p, '[data-fl="previa-resumen"]')).includes('99 para añadir') && (await p.$$('[data-fila="repetida"]')).length === 0);
    await p.fill(campo('lista'), nLineas(100)); await confirmar(p);
    await esperaCierre(p);
    const w = escritas(base);
    ok('con 100 lineas (el maximo de topes) viaja UNA llamada con el producto, 100 identificadores normalizados (recortados y en mayusculas) y el motivo',
       w.length === 1 && w[0][0] === 'producto_unidades_alta_lote' && w[0][1].p_producto_id === 'p1' && w[0][1].p_identificadores.length === 100 && w[0][1].p_identificadores[0] === 'DK 1000 AB' && w[0][1].p_identificadores.every(x => x === x.trim().toUpperCase()) && w[0][1].p_motivo === 'Compra de lote' && Object.keys(w[0][1]).sort().join() === 'p_identificadores,p_motivo,p_producto_id', J(w[0]).slice(0, 200));
    ok('tras la respuesta se RELEE y se ve el resultado (103 motos), con el aviso Guardado', llamadas(base, 'producto_flota_datos').length === 2 && (await p.$$('section' + prod('p1') + ' .fl-fila[data-unidad-id]')).length === 103 && (await msgOk(p)).includes('Guardado'));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { soloUno: true } });
    await p.click(accion('fl-lote-abrir', prod('p1')));
    await p.fill(campo('lista'), nLineas(101)); await motivo(p); await confirmar(p);
    ok('101 lineas (topes.lote.max = 100): se rechaza SIN enviar y dice el maximo leido de la base', escritas(base).length === 0 && (await dlgError(p)).includes('demasiadas líneas') && (await dlgError(p)).includes('100'), await dlgError(p));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { topes: Object.assign({}, TOPES, { lote: { max: 5 } }) } });
    await p.click(accion('fl-lote-abrir', prod('p1')));
    await p.fill(campo('lista'), nLineas(6)); await motivo(p); await confirmar(p);
    ok('el maximo del lote sale de la base (con 5, seis lineas ya no entran)', escritas(base).length === 0 && (await dlgError(p)).includes('5'));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { topes: Object.assign({}, TOPES, { unidades_por_producto: { max: 4 } }) } });
    await p.click(accion('fl-lote-abrir', prod('p1')));
    await p.fill(campo('lista'), 'AAA 111\nBBB 222'); await motivo(p); await confirmar(p);
    ok('con 3 motos y un maximo de 4 por producto, anadir 2 se rechaza sin enviar', escritas(base).length === 0 && (await dlgError(p)).includes('máximo de motos'));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre();
    await p.click(accion('fl-lote-abrir', prod('p1')));
    await p.fill(campo('lista'), 'ab\ndk 1234 ab\nXYZ 999\n' + 'x'.repeat(30));
    ok('la que ya existe (DK 1234 AB), la demasiado corta y la demasiado larga salen marcadas con su razon (rango de topes.identificador)',
       (await p.$$('[data-fila="existe"]')).length === 1 && (await p.$$('[data-fila="corta"]')).length === 1 && (await p.$$('[data-fila="larga"]')).length === 1);
    await motivo(p); await confirmar(p);
    ok('no se envia con marcas', escritas(base).length === 0);
    await p.fill(campo('lista'), '   \n\n'); await confirmar(p);
    ok('lista vacia: no se envia y lo dice', escritas(base).length === 0 && (await dlgError(p)).includes('No hay ninguna matrícula'));
    await ctx.close();
  }
  {
    // lote que falla en la base (una matricula que la pantalla no conoce): atomico, dice cual, la ventana conserva lo pegado, la lista no cambia
    const { base, p, ctx } = await abre({ base: { ocultas: ['ZZ 9999 ZZ'] } });
    await p.click(accion('fl-lote-abrir', prod('p1')));
    await p.fill(campo('lista'), 'NEW 0001\nzz 9999 zz\nNEW 0003'); await motivo(p, 'Alta'); await confirmar(p);
    await espera(p, () => document.querySelector('[data-axw="dialogo"] .axw-error:not(.axw-oculto)'));
    const e = await dlgError(p);
    ok('lote que falla: dice que no se añadio ninguna y CUAL fallo (el mensaje de la base)', e.includes('No se ha añadido ninguna moto') && e.includes('ZZ 9999 ZZ') && (await dlg(p)) === 1, e);
    ok('el lote es atomico en la lista: sigue habiendo 3 motos y el texto pegado se conserva', (await p.$$('section' + prod('p1') + ' .fl-fila[data-unidad-id]')).length === 3 && (await p.$eval(campo('lista'), e2 => e2.value)).includes('NEW 0003') && llamadas(base, 'producto_flota_datos').length === 1);
    ok('el boton se libera tras el error para poder corregir', await p.$eval(accion('fl-modal-confirmar'), b => !b.disabled));
    await ctx.close();
  }

  // 5. editar una moto
  {
    const { base, p, ctx } = await abre();
    await p.click(accion('fl-moto-editar', '[data-unidad-id="u2"]'));
    ok('editar abre la ventana con los valores de la base', (await p.$eval(campo('identificador'), e => e.value)) === 'DK 2345 CD' && (await p.$eval(campo('estado'), e => e.value)) === 'disponible');
    await confirmar(p);
    ok('sin cambios no llama', escritas(base).length === 0 && (await dlgError(p)).includes('No hay cambios'));
    await p.selectOption(campo('estado'), 'taller'); await p.fill(campo('notas'), 'Frenos'); await confirmar(p);
    ok('con cambios y sin motivo no llama y marca el campo', escritas(base).length === 0 && (await p.$eval(campo('motivo'), e => e.getAttribute('aria-invalid'))) === 'true' && (await dlgError(p)).includes('motivo'));
    await motivo(p, '  Pasa al taller  '); await confirmar(p); await esperaCierre(p);
    const w = escritas(base);
    const u2 = base.productos[0].unidades.find(x => x.id === 'u2');
    ok('guardar manda el id, {identificador, estado, notas}, el motivo recortado y el actualizado_en TAL CUAL lo dio la base (con microsegundos)',
       w.length === 1 && w[0][0] === 'producto_unidad_guarda' && w[0][1].p_id === 'u2' && J(w[0][1].p_datos) === J({ identificador: 'DK 2345 CD', estado: 'taller', notas: 'Frenos' }) && w[0][1].p_motivo === 'Pasa al taller' && /\.\d{6}\+00:00$/.test(w[0][1].p_esperado) && u2.estado === 'taller', J(w));
    ok('tras guardar se relee y la lista muestra «En taller» (no hubo estado optimista)', (await txt(p, '[data-unidad-id="u2"]')).includes('En taller') && llamadas(base, 'producto_flota_datos').length === 2);
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { lento: 300 } });
    await p.click(accion('fl-moto-editar', '[data-unidad-id="u2"]'));
    await p.fill(campo('identificador'), 'dk 2345 nueva'); await motivo(p, 'Corrijo la matricula');
    await p.evaluate(() => { const b = document.querySelector('[data-accion="fl-modal-confirmar"]'); b.click(); b.click(); });
    ok('mientras la base no responde la lista NO cambia (sin estado optimista) y el boton esta deshabilitado', (await txt(p, '[data-unidad-id="u2"]')).includes('DK 2345 CD') && await p.$eval(accion('fl-modal-confirmar'), b => b.disabled));
    await esperaCierre(p);
    ok('doble clic en Confirmar = UNA sola llamada de escritura; la matricula nueva sale en mayusculas', escritas(base).length === 1 && escritas(base)[0][1].p_datos.identificador === 'DK 2345 NUEVA' && (await txt(p, '[data-unidad-id="u2"]')).includes('DK 2345 NUEVA'));
    await ctx.close();
  }
  {
    // taller/baja con reservas vivas: la base manda y su mensaje se enseña como TEXTO
    const { base, p, ctx } = await abre({ base: { vivas: true } });
    await p.click(accion('fl-moto-editar', '[data-unidad-id="u1"]'));
    await p.selectOption(campo('estado'), 'baja'); await motivo(p, 'La doy de baja'); await confirmar(p);
    await espera(p, () => document.querySelector('[data-axw="dialogo"] .axw-error:not(.axw-oculto)'));
    ok('reservas_vivas: se enseña el mensaje de la base TAL CUAL como texto (sin interpretar <b>) y la ventana sigue abierta con lo escrito',
       (await dlgError(p)) === MSG_VIVAS && (await p.$$('[data-axw="dialogo"] b')).length === 0 && (await p.$eval(campo('estado'), e => e.value)) === 'baja' && (await p.$eval(campo('motivo'), e => e.value)) === 'La doy de baja');
    ok('y la moto sigue disponible en la lista (no se pinto nada antes de tiempo)', (await txt(p, '[data-unidad-id="u1"]')).includes('Disponible') && await sinInyeccion(p));
    await ctx.close();
  }
  {
    // conflicto de version: otra persona la cambio. Se conserva lo tecleado y el segundo intento manda la version NUEVA
    const { base, p, ctx } = await abre({ base: { otroCambia: true } });
    await p.click(accion('fl-moto-editar', '[data-unidad-id="u2"]'));
    const visto = base.productos[0].unidades.find(x => x.id === 'u2').actualizado_en;
    await p.fill(campo('notas'), 'Mi nota tecleada'); await motivo(p, 'Mi motivo'); await confirmar(p);
    await espera(p, () => !document.querySelector(`[data-accion="fl-modal-recargar"]`).classList.contains('axw-oculto'));
    ok('conflicto (40001 flota_cambio): mensaje «otra persona lo cambió», boton de recargar visible y nada se dio por guardado', (await dlgError(p)).includes('Otra persona') && (await visible(p, accion('fl-modal-recargar'))) && (await p.$eval('[data-fl="exito"]', e => e.textContent)) === '' && escritas(base).length === 1);
    await p.click(accion('fl-modal-recargar'));
    await espera(p, () => document.querySelector('[data-accion="fl-modal-recargar"]').classList.contains('axw-oculto'));
    ok('recargar CONSERVA lo tecleado (nota y motivo), trae lo de la otra persona a la lista y oculta el boton', (await p.$eval(campo('notas'), e => e.value)) === 'Mi nota tecleada' && (await p.$eval(campo('motivo'), e => e.value)) === 'Mi motivo' && (await txt(p, '[data-unidad-id="u2"]')).includes('Cambiado por otra persona') && (await dlg(p)) === 1);
    await confirmar(p); await esperaCierre(p);
    const w = escritas(base);
    const nuevo = base.productos[0].unidades.find(x => x.id === 'u2');
    ok('el segundo intento manda la version NUEVA (no la que vio al abrir) y la base lo acepta', w.length === 2 && w[1][1].p_esperado !== visto && w[1][1].p_esperado !== w[0][1].p_esperado && nuevo.notas === 'Mi nota tecleada', J(w.map(x => x[1].p_esperado)));
    await ctx.close();
  }
  {
    // conflicto y la fila ya no existe
    const { base, p, ctx } = await abre({ base: { otroCambia: true } });
    await p.click(accion('fl-moto-editar', '[data-unidad-id="u2"]'));
    await p.fill(campo('notas'), 'x'); await motivo(p); await confirmar(p);
    await espera(p, () => !document.querySelector(`[data-accion="fl-modal-recargar"]`).classList.contains('axw-oculto'));
    base.productos[0].unidades = base.productos[0].unidades.filter(x => x.id !== 'u2');
    await p.click(accion('fl-modal-recargar'));
    await espera(p, () => document.querySelector('[data-axw="dialogo"] .axw-error:not(.axw-oculto)').textContent.includes('ya no existe'));
    ok('si al recargar la fila ya no existe lo dice y no deja confirmar', await p.$eval(accion('fl-modal-confirmar'), b => b.disabled));
    await ctx.close();
  }

  // 6. tarifas: precio sin adivinar, dias, tramo repetido = cambiar, moneda, borrar
  async function abreTarifa(p, pid = 'p1') { await p.click(accion('fl-tarifa-abrir', prod(pid))); }
  {
    const { base, p, ctx } = await abre({ base: { soloUno: true } });
    await abreTarifa(p);
    await p.fill(campo('dias'), '2'); await motivo(p, 'Nuevo tramo');
    for (const [v, texto] of [['1.500', 'ambiguo'], ['1,500', 'ambiguo'], ['600.000', 'ambiguo'], ['1.500.000', 'ambiguo'], ['1.500,50', 'no se entiende'], ['abc', 'no se entiende'], ['-3', 'no se entiende'], ['', 'Escribe el precio']]) {
      await p.fill(campo('precio'), v); await confirmar(p);
      ok('precio «' + v + '» no se adivina: se rechaza SIN enviar (' + texto + ')', escritas(base).length === 0 && (await dlgError(p)).includes(texto), (await dlgError(p)).slice(0, 120));
    }
    await p.fill(campo('precio'), '1500,5');
    ok('el eco muestra de vuelta lo que se enviara (dias, precio ya parseado y moneda) ANTES de confirmar', (await txt(p, '[data-fl="eco"]')).includes('Se enviará') && (await txt(p, '[data-fl="eco"]')).includes('2 días') && /1\.?500,5(?!\d)/.test(await txt(p, '[data-fl="eco"]')) && (await txt(p, '[data-fl="eco"]')).includes('IDR'), await txt(p, '[data-fl="eco"]'));
    await p.fill(campo('precio'), '250000'); await p.fill(campo('etiqueta'), '  Finde largo  '); await confirmar(p); await esperaCierre(p);
    const w = escritas(base);
    ok('solo viaja el numero parseado: producto, dias entero, precio numero, moneda, etiqueta recortada, motivo y p_esperado null (tramo nuevo)',
       w.length === 1 && J(w[0][1]) === J({ p_producto_id: 'p1', p_dias: 2, p_precio: 250000, p_moneda: 'IDR', p_etiqueta: 'Finde largo', p_motivo: 'Nuevo tramo', p_esperado: null }), J(w));
    ok('se relee: el tramo de 2 dias aparece ordenado entre el de 1 y el de 3', (await p.$$eval('section' + prod('p1') + ' .fl-fila[data-tarifa-id]', fs => fs.map(f => f.getAttribute('data-dias')))).join() === '1,2,3,7');
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { soloUno: true } });
    await abreTarifa(p); await motivo(p, 'Prueba de limites');
    for (const [dias, precio, texto] of [['0', '150000', 'Días del tramo'], ['367', '150000', 'Días del tramo'], ['1,5', '150000', 'número entero'], ['x', '150000', 'número entero'], ['5', '0', 'Fuera de rango'], ['5', '999', 'Fuera de rango'], ['5', '999999999999', 'Fuera de rango']]) {
      await p.fill(campo('dias'), dias); await p.fill(campo('precio'), precio); await confirmar(p);
      ok('dias «' + dias + '» · precio «' + precio + '»: se rechaza SIN enviar con su razon (' + texto + ')', escritas(base).length === 0 && (await dlgError(p)).includes(texto) && (await txt(p, '[data-fl="eco"]')).includes('No se puede enviar todavía'), (await dlgError(p)).slice(0, 140));
    }
    ok('el rango de dias del mensaje sale de topes (1 y 366)', (await (async () => { await p.fill(campo('dias'), '0'); await p.fill(campo('precio'), '150000'); await confirmar(p); return dlgError(p); })()).includes('366'));
    await ctx.close();
  }
  {
    // la base tiene SUS reglas ademas de topes (decimales_moneda): se enseña su mensaje
    const { base, p, ctx } = await abre({ base: { soloUno: true } });
    await abreTarifa(p); await p.fill(campo('dias'), '5'); await p.fill(campo('precio'), '150000,5'); await motivo(p, 'Decimales'); await confirmar(p);
    await espera(p, () => document.querySelector('[data-axw="dialogo"] .axw-error:not(.axw-oculto)'));
    ok('regla de la base que topes no cubre (decimales_moneda): se enseña SU mensaje y la ventana conserva lo tecleado', (await dlgError(p)).includes('La rupia no admite decimales') && escritas(base).length === 1 && (await p.$eval(campo('precio'), e => e.value)) === '150000,5');
    await ctx.close();
  }
  {
    // tramo repetido = cambiar: manda la version de ESA fila
    const { base, p, ctx } = await abre({ base: { soloUno: true } });
    const t3v = base.productos[0].tarifas.find(x => x.dias === 3).actualizado_en;
    await abreTarifa(p);
    ok('abrir y teclear un dia nuevo dice «este tramo es nuevo»', (await p.fill(campo('dias'), '4'), (await txt(p, '[data-fl="modo"]')).includes('es nuevo')));
    await p.fill(campo('dias'), '3');
    ok('teclear un dia que ya existe lo trata como CAMBIAR y lo dice', (await txt(p, '[data-fl="modo"]')).includes('ya existe: lo que guardes cambia su precio'));
    await p.fill(campo('precio'), '420000'); await motivo(p, 'Subo el de 3 dias'); await confirmar(p); await esperaCierre(p);
    const w = escritas(base);
    ok('manda p_esperado = el actualizado_en de la fila de 3 dias (no null) y la base lo acepta (precio 420000)', w.length === 1 && w[0][1].p_dias === 3 && w[0][1].p_esperado === t3v && base.productos[0].tarifas.find(x => x.dias === 3).precio === 420000, J(w));
    ok('sigue habiendo 3 tramos (no se creo uno repetido)', base.productos[0].tarifas.length === 3);
    await ctx.close();
  }
  {
    // «Cambiar» desde la fila: dias fijos, valores precargados
    const { base, p, ctx } = await abre({ base: { soloUno: true } });
    await p.click(accion('fl-tarifa-cambiar', '[data-tarifa-id="t7"]'));
    ok('«Cambiar» abre el tramo con sus valores y los dias en solo lectura', (await p.$eval(campo('dias'), e => e.value + '|' + e.readOnly)) === '7|true' && (await p.$eval(campo('precio'), e => e.value)) === '900000' && (await p.$eval(campo('etiqueta'), e => e.value)) === 'Semana');
    await p.fill(campo('precio'), '950000'); await motivo(p, 'Subo la semana'); await confirmar(p); await esperaCierre(p);
    ok('guarda con la version de ese tramo y se relee', escritas(base).length === 1 && escritas(base)[0][1].p_dias === 7 && /^2026/.test(escritas(base)[0][1].p_esperado) && /950\.000/.test(await txt(p, '[data-tarifa-id="t7"]')));
    await ctx.close();
  }
  {
    // conflicto en un tramo: version nueva en el segundo intento
    const { base, p, ctx } = await abre({ base: { soloUno: true, otroCambiaTarifa: true } });
    await p.click(accion('fl-tarifa-cambiar', '[data-tarifa-id="t3"]'));
    await p.fill(campo('precio'), '410000'); await motivo(p, 'Conflicto'); await confirmar(p);
    await espera(p, () => !document.querySelector('[data-accion="fl-modal-recargar"]').classList.contains('axw-oculto'));
    ok('conflicto en un tramo: boton de recargar y nada guardado', (await dlgError(p)).includes('Otra persona') && escritas(base).length === 1);
    await p.click(accion('fl-modal-recargar'));
    await espera(p, () => document.querySelector('[data-accion="fl-modal-recargar"]').classList.contains('axw-oculto'));
    ok('tras recargar se conserva el precio tecleado y la lista trae el de la otra persona (405000)', (await p.$eval(campo('precio'), e => e.value)) === '410000' && /405\.000/.test(await txt(p, '[data-tarifa-id="t3"]')));
    await confirmar(p); await esperaCierre(p);
    const w = escritas(base);
    ok('el segundo intento lleva la version nueva del tramo y se guarda', w.length === 2 && w[1][1].p_esperado !== w[0][1].p_esperado && base.productos[0].tarifas.find(x => x.dias === 3).precio === 410000, J(w.map(x => x[1].p_esperado)));
    await ctx.close();
  }
  {
    // moneda: ≥2 tramos → bloqueada con explicacion; mezcla → aviso; 1 tramo → editable al cambiar ese tramo
    const { base, p, ctx } = await abre({ base: { soloUno: true } });
    await abreTarifa(p);
    ok('con 3 tramos la moneda esta bloqueada y explica que hay que borrar y recrear', (await p.$eval(campo('moneda'), e => e.disabled)) && (await txt(p, '[data-fl="nota-moneda"]')).includes('borra los tramos y créalos de nuevo en la otra moneda'));
    ok('las monedas del selector salen de topes (IDR, EUR, USD)', (await p.$$eval(campo('moneda') + ' option', os => os.map(o => o.value))).join() === 'IDR,EUR,USD');
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { soloUno: true, mezcla: true } });
    await abreTarifa(p, 'p4');
    ok('un producto con tramos en monedas distintas avisa de la mezcla (moneda mezclada)', (await txt(p, '[data-fl="nota-moneda"]')).includes('mezcla monedas') && !(await p.$eval(campo('moneda'), e => e.disabled)));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { soloUno: true, unaTarifa: true } });
    await p.click(accion('fl-tarifa-cambiar', '[data-tarifa-id="t51"]'));
    ok('con UN solo tramo, cambiar ESE tramo permite otra moneda', !(await p.$eval(campo('moneda'), e => e.disabled)));
    await p.click(accion('fl-modal-cerrar'));
    await abreTarifa(p, 'p5');
    await p.fill(campo('dias'), '2');
    ok('con un tramo existente y uno NUEVO la moneda se queda en la del producto (no se mezcla)', (await p.$eval(campo('moneda'), e => e.disabled + '|' + e.value)) === 'true|IDR');
    await ctx.close();
  }
  {
    // borrar tramo: normal y el ultimo
    const { base, p, ctx } = await abre({ base: { soloUno: true } });
    await p.click(accion('fl-tarifa-borrar', '[data-tarifa-id="t3"]'));
    ok('borrar un tramo normal NO lleva el aviso fuerte del ultimo', (await p.$$('[data-fl="aviso-ultimo"]')).length === 0);
    await confirmar(p);
    ok('borrar exige motivo', escritas(base).length === 0 && (await dlgError(p)).includes('motivo'));
    await motivo(p, 'Ya no se ofrece'); await confirmar(p); await esperaCierre(p);
    ok('borra con el id, el motivo y la version que vio', escritas(base).length === 1 && escritas(base)[0][0] === 'producto_tarifa_borra' && escritas(base)[0][1].p_id === 't3' && /^2026/.test(escritas(base)[0][1].p_esperado) && base.productos[0].tarifas.length === 2);
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { soloUno: true } });
    base.productos[0].tarifas = base.productos[0].tarifas.slice(0, 1);
    await p.click(accion('fl-actualizar'));
    await espera(p, () => document.querySelectorAll('.fl-fila[data-tarifa-id]').length === 1);
    await p.click(accion('fl-tarifa-borrar', '[data-tarifa-id="t1"]'));
    ok('borrar el ULTIMO tramo: aviso fuerte «el producto deja de cotizarse»', (await visible(p, '[data-fl="aviso-ultimo"]')) && (await txt(p, '[data-fl="aviso-ultimo"]')).includes('el producto deja de cotizarse'));
    await motivo(p, 'Quito todo'); await confirmar(p); await esperaCierre(p);
    ok('tras borrar el ultimo, el producto sale «No se puede reservar todavía» con «Sin tarifas: no se podrá cotizar»', (await cuerpo(p, 'p1')).includes('Sin tarifas: no se podrá cotizar') && (await cuerpo(p, 'p1')).includes('No se puede reservar todavía'));
    await ctx.close();
  }

  // 7. errores de escritura generales
  {
    const { p, ctx } = await abre({ base: { fallaLecturaTrasGuardar: true } });
    await p.click(accion('fl-moto-editar', '[data-unidad-id="u2"]')); await p.fill(campo('notas'), 'otra'); await motivo(p); await confirmar(p); await esperaCierre(p);
    ok('se guarda pero no se puede releer: lo dice (no «Guardado» a ciegas)', (await txt(p, '[data-fl="error"]')).includes('no se pudo volver a leer') && (await txt(p, '[data-fl="exito"]')) === '');
    await ctx.close();
  }
  {
    // escritura sin permiso: 42501 despues de la respuesta
    const { base, p, ctx } = await abre();
    base.o.noAdmin = true; base.o.noAdminSoloEscribe = true;   // la lectura ya paso: solo la escritura contesta 42501
    await p.click(accion('fl-moto-editar', '[data-unidad-id="u2"]')); await p.fill(campo('notas'), 'y'); await motivo(p); await confirmar(p);
    await espera(p, () => document.querySelector('[data-axw="dialogo"] .axw-error:not(.axw-oculto)'));
    ok('42501 al escribir: dice «solo la administración» DESPUES de la respuesta y la ventana sigue', (await dlgError(p)).includes('Solo la administración') && (await dlg(p)) === 1);
    await ctx.close();
  }

  // 8. XSS en todos los campos que pintan datos de la base y los que escribe el usuario
  {
    const { base, p, ctx } = await abre({ base: { xss: true } });
    ok('nombre de producto, identificador, notas, etiqueta, motivo y quien con etiquetas salen como TEXTO (nada se ejecuta)', (await cuerpo(p, 'p1')).includes(XSS_NOMBRE) && (await txt(p, '[data-unidad-id="u1"]')).includes(XSS_ID) && (await txt(p, '[data-unidad-id="u1"]')).includes(XSS_NOTAS) && (await txt(p, '[data-tarifa-id="t1"]')).includes(XSS_ETQ) && await sinInyeccion(p));
    await p.click('[data-fl="detalle-versiones"] summary');
    ok('el quien y el motivo de la lista de versiones tambien son texto', (await txt(p, '[data-fl="versiones"]')).includes(XSS_QUIEN) && (await txt(p, '[data-fl="versiones"]')).includes(XSS_MOTIVO) && await sinInyeccion(p));
    await p.click(accion('fl-moto-editar', '[data-unidad-id="u2"]'));
    await p.fill(campo('notas'), XSS_NOTAS); await motivo(p, XSS_MOTIVO.slice(0, 120)); await confirmar(p); await esperaCierre(p);
    ok('lo que escribe el usuario (notas y motivo con etiquetas) viaja como dato y vuelve como texto sin ejecutarse', (await txt(p, '[data-unidad-id="u2"]')).includes(XSS_NOTAS) && (await txt(p, '[data-fl="versiones"]')).includes(XSS_MOTIVO.slice(0, 120)) && await sinInyeccion(p));
    await p.click(accion('fl-lote-abrir', prod('p1')));
    await p.fill(campo('lista'), 'ZZZ <img src=x onerror="window.__xss=8">');
    ok('una matricula con etiquetas en la vista previa del lote es texto', (await p.$$('[data-axw="dialogo"] img')).length === 0 && (await p.evaluate(() => window.__xss)) === undefined);
    await ctx.close();
  }

  // 9. el id estable sobrevive a un cambio de rotulo
  {
    const { base, p, ctx } = await abre();
    await p.evaluate(() => { document.querySelectorAll('[data-fl="raiz"] h1, [data-fl="raiz"] h2, [data-fl="raiz"] h3, [data-fl="raiz"] button, [data-fl="raiz"] summary, [data-fl="raiz"] p').forEach(e => { if (!e.querySelector('input,select,button')) e.textContent = 'Rótulo cambiado ' + Math.random().toString(36).slice(2, 6); }); });
    await p.click(accion('fl-moto-editar', '[data-unidad-id="u2"]'));
    await p.evaluate(() => { document.querySelectorAll('[data-axw="dialogo"] label, [data-axw="dialogo"] option, [data-axw="dialogo"] h3').forEach(e => { if (!e.querySelector('input,select')) e.textContent = 'Otro rótulo'; }); });
    await p.fill(campo('notas'), 'cambio'); await motivo(p, 'Con otros rotulos'); await p.click(accion('fl-modal-confirmar')); await esperaCierre(p);
    ok('con TODOS los rotulos cambiados, editar y guardar sigue funcionando (data-accion / data-campo / data-*-id)', escritas(base).length === 1 && escritas(base)[0][1].p_id === 'u2');
    await ctx.close();
  }

  // 10. idiomas
  {
    const { p, ctx } = await abre({ idioma: 'en', base: { sinTarifas: true, mezcla: true, recortado: true, unaTarifa: true } });
    ok('en ingles titulo y botones traducidos', (await txt(p, 'h1')) === 'Fleet and rates' && (await txt(p, accion('fl-actualizar'))) === 'Refresh' && (await txt(p, '[data-fl="bot"]')).includes('The bot uses it'));
    await p.click(accion('fl-lote-abrir', prod('p1'))); await p.fill(campo('lista'), 'ab\ndk 1234 ab\nN1 111\nN1 111\n' + 'x'.repeat(30)); await motivo(p, 'ab'); await confirmar(p); await p.click(accion('fl-modal-dedup')); await p.fill(campo('lista'), nLineas(101)); await confirmar(p); await p.fill(campo('lista'), ''); await confirmar(p); await p.click(accion('fl-modal-cerrar'));
    await p.click(accion('fl-moto-editar', '[data-unidad-id="u3"]')); await p.fill(campo('identificador'), ''); await confirmar(p); await p.fill(campo('identificador'), 'ab'); await confirmar(p); await p.selectOption(campo('estado'), 'baja'); await confirmar(p); await p.click(accion('fl-modal-cerrar'));
    await p.click(accion('fl-tarifa-abrir', prod('p4')));
    for (const [d, pr] of [['0', '1.500'], ['x', '1,500'], ['5', 'abc'], ['5', ''], ['5', '1'], ['400', '5']]) { await p.fill(campo('dias'), d); await p.fill(campo('precio'), pr); await confirmar(p); }
    await p.fill(campo('dias'), '1'); await p.fill(campo('precio'), '5000');
    await p.click(accion('fl-modal-cerrar'));
    await p.click(accion('fl-tarifa-borrar', '[data-tarifa-id="t1"]')); await p.click(accion('fl-modal-cerrar'));
    await p.click(accion('fl-tarifa-abrir', prod('p5'))); await p.fill(campo('dias'), '2'); await p.click(accion('fl-modal-cerrar'));
    await p.click(accion('fl-tarifa-cambiar', '[data-tarifa-id="t51"]')); await p.click(accion('fl-modal-cerrar'));
    const sin = await p.evaluate(() => window.__sinEn);
    ok('en ingles ninguna cadena queda sin traducir (lista, avisos, lote, moto, tarifas, mezcla, borrar)', sin.length === 0, J(sin.slice(0, 8)));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ idioma: 'en', base: { otroCambia: true, ocultas: ['ZZ 9999 ZZ'] } });
    await p.click(accion('fl-moto-editar', '[data-unidad-id="u2"]')); await p.fill(campo('notas'), 'm'); await motivo(p, 'Mine'); await confirmar(p);
    await espera(p, () => !document.querySelector('[data-accion="fl-modal-recargar"]').classList.contains('axw-oculto'));
    await p.click(accion('fl-modal-recargar')); await espera(p, () => document.querySelector('[data-accion="fl-modal-recargar"]').classList.contains('axw-oculto'));
    await p.click(accion('fl-modal-cerrar'));
    await p.click(accion('fl-lote-abrir', prod('p1'))); await p.fill(campo('lista'), 'NEW 0001\nzz 9999 zz'); await motivo(p, 'Alta'); await confirmar(p);
    await espera(p, () => document.querySelector('[data-axw="dialogo"] .axw-error:not(.axw-oculto)'));
    ok('en ingles el conflicto, la recarga y el fallo del lote tampoco dejan nada sin traducir (salvo el mensaje de la base, que viene en su idioma)', (await p.evaluate(() => window.__sinEn)).length === 0, J(await p.evaluate(() => window.__sinEn)));
    await ctx.close();
  }
  for (const [nombre, base] of [['no admin', { noAdmin: true }], ['sin red', { sinRed: 'producto_flota_datos' }], ['modulo apagado', { moduloApagado: true }], ['vacio', { vacio: true }]]) {
    const { p, ctx } = await abre({ idioma: 'en', base });
    ok('en ingles el estado «' + nombre + '» sale traducido', (await p.evaluate(() => window.__sinEn)).length === 0, J(await p.evaluate(() => window.__sinEn)));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ idioma: 'id', base: { soloUno: true } });
    ok('con un idioma que la suite no tiene (id) la pantalla cae a espanol, sin errores de JS', (await txt(p, 'h1')) === 'Flota y tarifas' && await sinErrores(p));
    await ctx.close();
  }

  // 11. responsive y capturas
  for (const ancho of [1440, 390]) {
    const { p, ctx } = await abre({ ancho, base: { xss: true, sinAmbos: true, mezcla: true, recortado: true } });
    let m = await desborde(p);
    ok(ancho + ' px · la lista (con XSS largo, avisos y recorte) no desborda la pagina', m.sw <= m.cw, J(m));
    if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_lista.png', fullPage: true });
    await p.click('[data-fl="detalle-versiones"] summary');
    m = await desborde(p); ok(ancho + ' px · con las versiones abiertas no desborda', m.sw <= m.cw, J(m));
    await p.click(accion('fl-lote-abrir', prod('p1')));
    await p.fill(campo('lista'), nLineas(60) + '\n' + XSS_ID + '\ndk 1000 ab\nab\n' + 'W'.repeat(60));
    const d1 = await p.$eval('[data-axw="dialogo"] .axw-modal', e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: window.innerWidth, sw: e.scrollWidth, cw: e.clientWidth }; });
    ok(ancho + ' px · la ventana del lote (con vista previa larga) cabe en pantalla', d1.l >= 0 && d1.r <= d1.w + 1 && d1.sw <= d1.cw + 1, J(d1));
    if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_lote.png' });
    await p.click(accion('fl-modal-cerrar'));
    await p.click(accion('fl-tarifa-abrir', prod('p4')));
    await p.fill(campo('dias'), '1'); await p.fill(campo('precio'), '1.500');
    const d2 = await p.$eval('[data-axw="dialogo"] .axw-modal', e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: window.innerWidth, sw: e.scrollWidth, cw: e.clientWidth }; });
    ok(ancho + ' px · la ventana del tramo (con errores y nota de moneda) cabe en pantalla', d2.l >= 0 && d2.r <= d2.w + 1 && d2.sw <= d2.cw + 1, J(d2));
    if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_tramo.png' });
    await p.click(accion('fl-modal-cerrar'));
    await p.click(accion('fl-moto-editar', '[data-unidad-id="u1"]'));
    const d3 = await p.$eval('[data-axw="dialogo"] .axw-modal', e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: window.innerWidth, sw: e.scrollWidth, cw: e.clientWidth }; });
    ok(ancho + ' px · la ventana de editar moto cabe en pantalla', d3.l >= 0 && d3.r <= d3.w + 1 && d3.sw <= d3.cw + 1, J(d3));
    if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_moto.png' });
    await ctx.close();
  }
  for (const ancho of [1440, 390]) {
    const { p, ctx } = await abre({ ancho, base: { vacio: true } });
    const m = await desborde(p); ok(ancho + ' px · el estado vacio no desborda', m.sw <= m.cw, J(m));
    if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_vacio.png', fullPage: true });
    await ctx.close();
    const b = await abre({ ancho, base: { noAdmin: true } });
    const m2 = await desborde(b.p); ok(ancho + ' px · el aviso «solo administracion» no desborda', m2.sw <= m2.cw, J(m2));
    await b.ctx.close();
  }
  {
    // las motos en tarjetas en movil: ninguna tabla con scroll horizontal dentro de la lista de productos
    const { p, ctx } = await abre({ ancho: 390 });
    ok('390 px · las motos y los tramos son tarjetas (no tablas) y cada fila cabe en el ancho', (await p.$$('section[data-producto-id] table')).length === 0 && await p.$$eval('section[data-producto-id] .fl-fila', fs => fs.every(f => f.getBoundingClientRect().right <= window.innerWidth + 1)));
    await ctx.close();
  }

  await nav.close();
  console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\nTODO EN VERDE');
  process.exit(fallos ? 1 : 0);
})();
