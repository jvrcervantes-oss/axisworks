// node comercial/demo-erp/pruebas/facturas_prueba.harness.cjs [documento.js real] [carpeta_capturas]
// Arnés de facturas_prueba.js (erp-front, 14-oct-2026; contrato bbm_bot_al_erp_13oct.md §3b, condiciones de agencia-81, 1.ª vuelta del revisor).
// La capa REAL en Chromium sobre una lista con filas data-lw-id (como las pinta datos.js) y documento.js cargado por un <script> en <head> con onload
// (como cargaModuloDoc de editores.js). El documento.js es el REAL del build (primer argumento, o AXW_DOCUMENTO_JS; sin él, el de
// <scratchpad>/despliegue*/clasico/facturas/documento.js más reciente): en bbm documentoPagina llama al documentoHTML INTERNO, así que un
// documento.js de mentira no ve si el PDF y el correo salen marcados. Hay además dos de mentira para los fallos de forma.
// Mide: filas P marcadas; franja que no se cierra (también con solo P) en Facturas y en las otras pantallas con cifras; cifras por moneda;
// documentoHTML Y documentoPagina marcados en los idiomas del papel; papel real sin marca (nunca un aviso en el PDF de una factura real);
// fuera de /facturas/ la lectura se pide sola; con la lectura caída o aún en camino una P sigue marcada por su serie; tras un fallo se reintenta;
// fallos de forma en voz alta; 3 idiomas y 390/1440 sin scroll horizontal.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const CAPA = fs.readFileSync(path.join(__dirname, '..', 'facturas_prueba.js'), 'utf8');
function docReal() {
  const a = process.argv[2] && /\.js$/.test(process.argv[2]) ? process.argv[2] : process.env.AXW_DOCUMENTO_JS;
  if (a) return a;
  let cands = [];
  for (let S = path.resolve(__dirname, '..'), i = 0; i < 8 && !cands.length; S = path.dirname(S), i++) {
    try { cands = fs.readdirSync(S).filter(n => /^despliegue\d+$/.test(n)).map(n => path.join(S, n, 'clasico', 'facturas', 'documento.js')).filter(f => fs.existsSync(f)); } catch (e) { cands = []; }
  }
  cands.sort((x, y) => fs.statSync(y).mtimeMs - fs.statSync(x).mtimeMs);
  return cands[0];
}
const REAL = docReal();
// documento.js necesita calcTotales (totales.js) y este, dinero.js: editores.js los carga en cadena con cargaModuloDoc. Se sirven del MISMO build.
const RAIZ = REAL ? path.resolve(path.dirname(REAL), '..', '..') : null;
const TOTALES = RAIZ ? path.join(RAIZ, 'clasico', 'facturas', 'totales.js') : null;
if (!REAL || !fs.existsSync(REAL) || !fs.existsSync(TOTALES)) { console.log('NO SE HA PODIDO MIRAR: falta el documento.js real del build (primer argumento o AXW_DOCUMENTO_JS)'); process.exit(2); }
const SHOT = process.argv.slice(2).find(a => !/\.js$/.test(a));
let fallos = 0, total = 0;
const ok = (n, c, extra = '') => { total++; if (!c) { fallos++; console.log('FALLA  ' + n + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + n); };
const P1 = 'PRBE11C-P2026-00001', PR1 = 'PRBE11C-PR2026-00001', REAL1 = 'PRBE11C-F2026-00007';
const BIEN = { ids: ['p1', 'p2'], numeros: [P1, PR1], totales: [{ moneda: 'IDR', total: 1030000 }], recortado: false };
const DOC = {
  real: fs.readFileSync(REAL, 'utf8'),
  sin: 'var otraCosa = 1;',
  firma: 'function documentoHTML(d) { return "x"; } function documentoPagina(d, opts) { return "<html><body>x</body></html>"; }',
  solo: 'function documentoHTML(d, opts) { return "<p>x</p>"; }',
};
const pagina = (o) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title></head><body>
<main${o.noInstalado ? ' data-axw-pantalla="no-instalado"' : ''}><table><tbody>${(o.filas || ['p1', 'r1']).map(id => `<tr data-lw-id="${id}"><td>${id}</td><td>1.000.000</td></tr>`).join('')}</tbody></table>
<div id="papel"></div></main>
<script>
window.LW_IDIOMA = '${o.idioma || 'es'}'; window.AXW_IDIOMAS_DOC = ${JSON.stringify(o.doc || ['id', 'en'])};
window.lwLocale = function () { return window.LW_IDIOMA === 'id' ? 'id-ID' : window.LW_IDIOMA === 'en' ? 'en-GB' : 'es-ES'; };
window.__errores = []; window.onerror = function (m) { window.__errores.push(String(m)); };
window.__resp = ${JSON.stringify(o.resp)}; window.__pedidas = 0;
${o.sinLwDatos ? '' : `window.lwDatos = function (n) { window.__pedida = n; window.__pedidas++; var r = Array.isArray(window.__resp) ? (window.__resp.length > 1 ? window.__resp.shift() : window.__resp[0]) : window.__resp;
  return new Promise(function (ok) { setTimeout(function () { ok(r); }, ${o.tarda || 0}); }); };`}
</script>
<script>${CAPA}</script>
<script>
// como cargaModuloDoc de editores.js: el <script> de documento.js va a <head> y, en su onload, se pinta con la función por su nombre
var FACT = { tipo: 'factura', sociedad: 'x', moneda: 'IDR', lineas: [{ concepto: 'Sewa motor', cantidad: 1, precio: 100000, impuesto: 0 }], cliente: { nombre: 'Uji' }, fecha: '2026-10-14' };
function script(src, listo) { return new Promise(function (ok) {
  if (listo()) return ok(true);
  var s = document.createElement('script'); s.src = src; s.onload = function () { ok(true); }; s.onerror = function () { ok(false); }; document.head.appendChild(s);
}); }
function carga() { return script('/contracts/assets/dinero.js?v=1', function () { return typeof lwParseImporte === 'function'; })
  .then(function () { return script('/clasico/facturas/totales.js?v=1', function () { return typeof calcTotales === 'function'; }); })
  .then(function () { return script('/clasico/facturas/documento.js?v=1', function () { return typeof documentoHTML === 'function'; }); }); }
function usa(fn, numero) { return carga().then(function (bien) { if (!bien) return 'sin documento'; try { return window[fn](FACT, { numero: numero, base: '' }); } catch (e) { return 'ERROR ' + e.message; } }); }
window.abrePapel = function (numero) { return usa('documentoHTML', numero).then(function (h) { document.getElementById('papel').innerHTML = h; return h; }); };
window.abrePagina = function (numero) { return usa('documentoPagina', numero); };
</script></body></html>`;

(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  async function abre(o = {}) {
    const ctx = await nav.newContext({ viewport: { width: o.ancho || 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.route('**/*', r => {
      const u = r.request().url();
      const ruta = new URL(u).pathname;
      if (!/documento\.js$/.test(ruta) && /\.js$/.test(ruta) && fs.existsSync(path.join(RAIZ, ruta))) return r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(RAIZ, ruta), 'utf8') });
      if (/documento\.js/.test(u)) return o.docFalla ? r.fulfill({ status: 404, body: '' }) : r.fulfill({ status: 200, contentType: 'application/javascript', body: DOC[o.docTipo || 'real'] });
      if (/\.(css|woff2?)(\?|$)/.test(u)) return r.fulfill({ status: 200, body: '' });
      return r.fulfill({ status: 200, contentType: 'text/html', body: pagina(o) });
    });
    await p.goto('http://local.test' + (o.ruta || '/facturas/'));
    await p.waitForTimeout((o.tarda || 0) + 300);
    return { p, ctx };
  }
  const franja = p => p.evaluate(() => { const f = document.querySelector('[data-axw-prueba="franja"]'); return f ? f.textContent : null; });
  const chips = p => p.$$eval('[data-axw-prueba="chip"]', l => l.map(c => c.closest('[data-lw-id]').getAttribute('data-lw-id') + ':' + c.textContent));
  const MARCA = 'UJI COBA — tidak berlaku sebagai faktur pajak · TEST — not a tax invoice';

  // 0. el documento.js real pinta (si no, el resto no mide nada)
  {
    const { p, ctx } = await abre({ resp: { data: BIEN, error: null } });
    const h = await p.evaluate(n => window.abrePagina(n), REAL1);
    ok('documento.js real: documentoPagina devuelve la página A4 con su .doc', typeof h === 'string' && h.includes('<body') && h.includes('class="doc"') && !h.startsWith('ERROR'), String(h).slice(0, 160));
    await ctx.close();
  }
  // 1. lista: la fila P marcada, la real no; franja con cuántos y cuánto, en es/en/id; sin errores
  for (const idioma of ['es', 'en', 'id']) {
    const { p, ctx } = await abre({ resp: { data: BIEN, error: null }, idioma });
    const c = await chips(p), f = await franja(p);
    const CH = { es: 'PRUEBA', en: 'TEST', id: 'UJI COBA' }[idioma];
    ok(idioma + ': la fila de prueba (p1) lleva la pastilla y la real (r1) no', c.length === 1 && c[0] === 'p1:' + CH, JSON.stringify(c));
    ok(idioma + ': la franja dice cuántos documentos de prueba hay y cuánto suman', !!f && f.includes('2') && /1[.,\s ]?030[.,\s ]?000/.test(f)
       && f.includes({ es: 'todavía los cuentan', en: 'still count them', id: 'masih menghitungnya' }[idioma]), String(f));
    ok(idioma + ': se pidió facturas_prueba_datos y no hay errores', (await p.evaluate(() => window.__pedida)) === 'facturas_prueba_datos' && (await p.evaluate(() => window.__errores.length)) === 0);
    for (const ancho of [390, 1440]) {
      await p.setViewportSize({ width: ancho, height: 900 }); await p.waitForTimeout(80);
      const w = await p.evaluate(() => document.documentElement.scrollWidth);
      ok(idioma + ' ' + ancho + ': sin scroll horizontal', w <= ancho, String(w));
      if (SHOT) await p.screenshot({ path: path.join(SHOT, 'facturas_prueba_' + idioma + '_' + ancho + '.png'), fullPage: true });
    }
    await ctx.close();
  }
  // 2. la franja no se cierra: si se quita, vuelve; y sale también con SOLO P en la lista
  {
    const { p, ctx } = await abre({ resp: { data: BIEN, error: null }, filas: ['p1'] });
    ok('solo P en la lista: la franja sale igual', !!(await franja(p)));
    await p.evaluate(() => { const f = document.querySelector('[data-axw-prueba="franja"]'); f.parentNode.removeChild(f); });
    await p.waitForTimeout(300);
    ok('quitada a mano, la franja vuelve (no se cierra mientras haya alguna P)', !!(await franja(p)));
    await ctx.close();
  }
  // 2b. las otras pantallas que suman facturas en el navegador también avisan (sin el total: ese es de Facturas)
  for (const ruta of ['/recibos/', '/vencimientos/', '/finanzas/', '/home/']) {
    const { p, ctx } = await abre({ resp: { data: BIEN, error: null }, ruta });
    const f = await franja(p);
    ok(ruta + ': franja «las cifras de esta pantalla todavía los cuentan»', !!f && f.includes('todavía los cuentan') && !f.includes('Facturas de prueba:'), String(f));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ resp: { data: BIEN, error: null }, ruta: '/contratos/' });
    ok('/contratos/ (sin cifras de facturas): sin franja', (await franja(p)) === null);
    await ctx.close();
  }
  // 2c. «Módulo no instalado» (finanzas apagado): sin cifras, sin franja, ni con pruebas ni con la lectura caída (verificador de bbm, 16-oct)
  for (const [nombre, resp] of [['con pruebas', { data: BIEN, error: null }], ['con la lectura caída', { data: null, error: { code: '503', message: 'x' } }]]) {
    const { p, ctx } = await abre({ resp, ruta: '/finanzas/', noInstalado: true });
    ok('/finanzas/ no instalado ' + nombre + ': sin franja', (await franja(p)) === null, String(await franja(p)));
    await ctx.close();
  }
  // 3. sin facturas de prueba: ni franja ni pastillas
  {
    const { p, ctx } = await abre({ resp: { data: { ids: [], numeros: [], totales: [], recortado: false }, error: null } });
    ok('sin facturas de prueba: ni franja ni pastillas', (await franja(p)) === null && (await chips(p)).length === 0);
    await ctx.close();
  }
  // 4. fallos de la lectura en voz alta: error, forma rara, recortada; y tras un fallo se vuelve a pedir
  for (const [nombre, resp] of [['error 42501', { data: null, error: { code: '42501', message: 'x', hint: 'sin_acceso' } }], ['forma rara', { data: [], error: null }]]) {
    const { p, ctx } = await abre({ resp });
    const f = (await franja(p)) || '';
    ok('lectura con ' + nombre + ': la franja dice que no se pudo comprobar y que se recargue', f.includes('No se ha podido comprobar') && f.includes('Recarga la página'), f);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ resp: [{ data: null, error: { code: '503', message: 'x' } }, { data: BIEN, error: null }], ruta: '/recibos/' });
    const h = await p.evaluate(n => window.abrePagina(n), REAL1);
    await p.waitForTimeout(300);
    ok('tras un fallo, abrir un papel vuelve a pedir la lectura (no se queda en el fallo)', (await p.evaluate(() => window.__pedidas)) >= 2 && !((await franja(p)) || '').includes('No se ha podido comprobar'), String(await p.evaluate(() => window.__pedidas)));
    ok('y la factura real abierta mientras tanto sale SIN aviso en su PDF', !h.includes('data-axw-prueba'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ resp: { data: Object.assign({}, BIEN, { recortado: true }), error: null } });
    ok('lectura recortada: la franja lo dice', ((await franja(p)) || '').includes('500 más recientes'));
    await ctx.close();
  }
  // 5. el papel con el documento.js REAL: documentoHTML (pantalla) y documentoPagina (imprimir, PDF, correo) marcados; la real sin marca
  for (const ruta of ['/facturas/', '/recibos/']) {
    const { p, ctx } = await abre({ resp: { data: BIEN, error: null }, ruta });
    await p.waitForTimeout(200);
    ok(ruta + ': la lectura se pide sola (también fuera de Facturas)', (await p.evaluate(() => window.__pedida)) === 'facturas_prueba_datos');
    const hp = await p.evaluate(n => window.abrePapel(n), P1);
    ok(ruta + ' documentoHTML de una P: franja «' + MARCA + '»', hp.includes('data-axw-prueba="papel"') && hp.includes(MARCA), hp.slice(0, 200));
    const pp = await p.evaluate(n => window.abrePagina(n), P1);
    ok(ruta + ' documentoPagina de una P (imprimir, PDF, correo): franja dentro de la hoja .doc', pp.includes(MARCA) && pp.indexOf('data-axw-prueba') > pp.indexOf('class="doc"')
       && (pp.match(/data-axw-prueba="papel"/g) || []).length === 1, pp.slice(0, 200));
    const pr = await p.evaluate(n => window.abrePagina(n), PR1);
    ok(ruta + ' documentoPagina de la rectificativa de prueba (PR): con franja', pr.includes(MARCA));
    const rh = await p.evaluate(n => window.abrePapel(n), REAL1), rp = await p.evaluate(n => window.abrePagina(n), REAL1);
    ok(ruta + ' factura real: ni documentoHTML ni documentoPagina llevan marca ni aviso', !rh.includes('data-axw-prueba') && !rp.includes('data-axw-prueba'));
    ok(ruta + ': sin errores', (await p.evaluate(() => window.__errores.length)) === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
    await ctx.close();
  }
  // 6. el papel antes de tener la lectura, o con la lectura caída: la P sale marcada por su serie y la real limpia (nunca un aviso en su PDF)
  for (const [nombre, o] of [['lectura aún en camino', { resp: { data: BIEN, error: null }, tarda: 3000 }], ['lectura caída', { resp: { data: null, error: { code: '500', message: 'x' } } }]]) {
    const { p, ctx } = await abre(Object.assign({ ruta: '/contratos/' }, o));
    const pp = await p.evaluate(n => window.abrePagina(n), P1), rp = await p.evaluate(n => window.abrePagina(n), REAL1);
    ok(nombre + ': la P sale marcada por su serie (P/PR)', pp.includes(MARCA));
    ok(nombre + ': la factura real sale sin marca ni aviso', !rp.includes('data-axw-prueba'));
    await ctx.close();
  }
  // 7. documento.js sin las dos funciones, con otra firma o que no carga: en voz alta en la franja y en las filas P
  for (const [nombre, o] of [['sin documentoHTML ni documentoPagina', { docTipo: 'sin' }], ['con otra firma', { docTipo: 'firma' }], ['sin documentoPagina', { docTipo: 'solo' }], ['documento.js que no carga', { docFalla: true }]]) {
    const { p, ctx } = await abre(Object.assign({ resp: { data: BIEN, error: null } }, o));
    await p.evaluate(() => window.abrePapel('x').catch(() => null));
    await p.waitForTimeout(300);
    const f = (await franja(p)) || '', c = await chips(p);
    ok(nombre + ': la franja dice «no se pudo marcar el papel como prueba» y la fila P también', f.includes('No se pudo marcar el papel como prueba') && c.length === 1 && c[0].includes('No se pudo marcar'), f + ' · ' + JSON.stringify(c));
    await ctx.close();
  }
  // 8. BAJA de AXW-291 (revisor erp-front-cobros): fuera de las cinco pantallas con cifras también se avisa cuando el papel puede salir sin marca
  for (const [nombre, o] of [['documento.js sin las dos funciones', { docTipo: 'sin' }], ['documento.js que no carga', { docFalla: true }]]) {
    const { p, ctx } = await abre(Object.assign({ resp: { data: BIEN, error: null }, ruta: '/contratos/' }, o));
    await p.evaluate(() => window.abrePapel('x').catch(() => null));
    await p.waitForTimeout(300);
    ok('/contratos/ con ' + nombre + ': la franja dice «no se pudo marcar el papel como prueba» (no solo en las pantallas con cifras)', ((await franja(p)) || '').includes('No se pudo marcar el papel como prueba'), String(await franja(p)));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ resp: { data: null, error: { code: '500', message: 'x' } }, ruta: '/contratos/' });
    ok('/contratos/ con la lectura caída y sin abrir ningún papel: sin franja', (await franja(p)) === null);
    const rp = await p.evaluate(n => window.abrePagina(n), REAL1);
    await p.waitForTimeout(200);
    const f = (await franja(p)) || '';
    ok('/contratos/ con la lectura caída, un papel sin serie P (p. ej. el recibo de una P): la franja dice que no se ha podido comprobar y que se recargue', f.includes('No se ha podido comprobar si este documento es de prueba') && f.includes('Recarga la página'), f);
    ok('y ese papel sale limpio (nunca un aviso dentro del PDF de una factura real)', !rp.includes('data-axw-prueba'));
    const antes = await p.evaluate(() => window.__pedidas);
    for (let i = 0; i < 4; i++) await p.evaluate(n => window.abrePapel(n), REAL1);
    await p.waitForTimeout(200);
    const despues = await p.evaluate(() => window.__pedidas);
    ok('con la lectura caída, repintar el MISMO papel no la vuelve a pedir cada vez', despues - antes === 0, antes + ' -> ' + despues);
    await p.evaluate(n => window.abrePapel(n), P1);
    await p.waitForTimeout(200);
    ok('y abrir OTRO documento sí la vuelve a pedir', (await p.evaluate(() => window.__pedidas)) === despues + 1, String(await p.evaluate(() => window.__pedidas)));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ resp: [{ data: null, error: { code: '503', message: 'x' } }, { data: BIEN, error: null }], ruta: '/contratos/' });
    await p.evaluate(n => window.abrePagina(n), REAL1);
    await p.waitForTimeout(300);
    ok('/contratos/: si la lectura vuelve, el aviso de «no se ha podido comprobar» se va', (await franja(p)) === null, String(await franja(p)));
    await ctx.close();
  }
  // 9. revisor erp-front-2 (BAJA 1-2): un papel sin número no levanta la duda; si al volver la lectura el papel pintado sin mirar era una P, pide reabrirlo
  {
    const { p, ctx } = await abre({ resp: { data: null, error: { code: '500', message: 'x' } }, ruta: '/contratos/' });
    await p.evaluate(() => window.abrePagina(''));
    await p.waitForTimeout(200);
    ok('con la lectura caída, un papel SIN número no pone la franja de «no se ha podido comprobar»', (await franja(p)) === null, String(await franja(p)));
    await ctx.close();
  }
  {
    const RECIBO_P = 'REC-2026-00042';
    const BIEN2 = Object.assign({}, BIEN, { numeros: BIEN.numeros.concat([RECIBO_P]) });
    const { p, ctx } = await abre({ resp: [{ data: null, error: { code: '503', message: 'x' } }, { data: BIEN2, error: null }], ruta: '/contratos/' });
    const h = await p.evaluate(n => window.abrePagina(n), RECIBO_P);
    await p.waitForTimeout(300);
    const f = (await franja(p)) || '';
    ok('el recibo de una P pintado con la lectura caída sale sin marca, y al volver la lectura la franja pide cerrarlo y reabrirlo', !h.includes('data-axw-prueba') && f.includes('vuelve a abrirlo'), f);
    const h2 = await p.evaluate(n => window.abrePagina(n), RECIBO_P);
    await p.waitForTimeout(200);
    ok('y al reabrirlo sale marcado y el aviso de reabrir se va', h2.includes(MARCA) && !((await franja(p)) || '').includes('vuelve a abrirlo'), String(await franja(p)));
    await ctx.close();
  }
  await nav.close();
  console.log(fallos ? `\n${fallos} de ${total} FALLAN` : `\nTODO BIEN (${total})`);
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('NO SE HA PODIDO MIRAR: ' + e.message); process.exit(2); });
