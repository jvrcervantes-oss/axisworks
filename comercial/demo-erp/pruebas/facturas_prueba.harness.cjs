// node comercial/demo-erp/pruebas/facturas_prueba.harness.cjs [carpeta_capturas]
// Arnés de facturas_prueba.js (erp-front, 14-oct-2026; contrato bbm_bot_al_erp_13oct.md §3b, condiciones de agencia-81). La capa REAL en Chromium sobre
// una lista con filas data-lw-id (como las pinta datos.js) y un documento.js de prueba que trae documentoHTML(d, opts), cargado por un <script> con
// onload como hace editores.js. Mide: marca de las filas P, franja que no se cierra (también con solo P), cifras por moneda, papel marcado en los idiomas
// del papel, papel real sin marca, fallos en voz alta (lectura caída, recortada, documentoHTML ausente o con otra firma, papel antes de saber), 3 idiomas
// y 390/1440 sin scroll horizontal.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const CAPA = fs.readFileSync(path.join(__dirname, '..', 'facturas_prueba.js'), 'utf8');
const SHOT = process.argv[2];
let fallos = 0, total = 0;
const ok = (n, c, extra = '') => { total++; if (!c) { fallos++; console.log('FALLA  ' + n + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + n); };
const BIEN = { ids: ['p1', 'p2'], numeros: ['BBM-P2026-00001', 'BBM-PR2026-00001'], totales: [{ moneda: 'IDR', total: 1030000 }], recortado: false };
const DOC = {
  bien: 'function documentoHTML(d, opts) { return "<!doctype html><html><head></head><body><h1>Invoice " + (opts && opts.numero) + "</h1></body></html>"; }',
  sin: 'var otraCosa = 1;',
  firma: 'function documentoHTML(d) { return "<html><body>x</body></html>"; }',
};
const pagina = (o) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title></head><body>
<main><div data-lw-chips></div><table><tbody>${(o.filas || ['p1', 'r1']).map(id => `<tr data-lw-id="${id}"><td>${id}</td><td>1.000.000</td></tr>`).join('')}</tbody></table>
<div id="papel"></div></main>
<script>
window.LW_IDIOMA = '${o.idioma || 'es'}'; window.AXW_IDIOMAS_DOC = ${JSON.stringify(o.doc || ['id', 'en'])};
window.lwLocale = function () { return window.LW_IDIOMA === 'id' ? 'id-ID' : window.LW_IDIOMA === 'en' ? 'en-GB' : 'es-ES'; };
window.__errores = []; window.onerror = function (m) { window.__errores.push(String(m)); };
${o.sinLwDatos ? '' : `window.lwDatos = function (n) { window.__pedida = n; return new Promise(function (ok) { setTimeout(function () { ok(${JSON.stringify(o.resp)}); }, ${o.tarda || 0}); }); };`}
</script>
<script>${CAPA}</script>
<script>
// como editores.js: carga documento.js cuando hace falta y, en su onload, pinta el papel con documentoHTML(vals, {numero})
window.abrePapel = function (numero) { return new Promise(function (ok) {
  function pinta() { var h = ''; try { h = documentoHTML({ lineas: [] }, { numero: numero }); } catch (e) { h = 'ERROR ' + e.message; } document.getElementById('papel').innerHTML = h; ok(h); }
  if (typeof documentoHTML === 'function') return pinta();
  var s = document.createElement('script'); s.src = '/clasico/facturas/documento.js?v=1'; s.onload = pinta; s.onerror = function () { ok('sin documento'); }; document.head.appendChild(s);
}); };
</script></body></html>`;

(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  async function abre(o = {}) {
    const ctx = await nav.newContext({ viewport: { width: o.ancho || 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.route('**/*', r => {
      const u = r.request().url();
      if (/documento\.js/.test(u)) return o.docFalla ? r.fulfill({ status: 404, body: '' }) : r.fulfill({ status: 200, contentType: 'application/javascript', body: DOC[o.docTipo || 'bien'] });
      return r.fulfill({ status: 200, contentType: 'text/html', body: pagina(o) });
    });
    await p.goto('http://local.test' + (o.ruta || '/facturas/'));
    await p.waitForTimeout((o.tarda || 0) + 300);
    return { p, ctx };
  }
  const franja = p => p.evaluate(() => { const f = document.querySelector('[data-axw-prueba="franja"]'); return f ? f.textContent : null; });
  const chips = p => p.$$eval('[data-axw-prueba="chip"]', l => l.map(c => c.closest('[data-lw-id]').getAttribute('data-lw-id') + ':' + c.textContent));

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
  // 3. sin facturas de prueba: ni franja ni pastillas
  {
    const { p, ctx } = await abre({ resp: { data: { ids: [], numeros: [], totales: [], recortado: false }, error: null } });
    ok('sin facturas de prueba: ni franja ni pastillas', (await franja(p)) === null && (await chips(p)).length === 0);
    await ctx.close();
  }
  // 4. fallos de la lectura en voz alta: error, forma rara, recortada
  for (const [nombre, resp] of [['error 42501', { data: null, error: { code: '42501', message: 'x', hint: 'sin_acceso' } }], ['forma rara', { data: [], error: null }]]) {
    const { p, ctx } = await abre({ resp });
    ok('lectura con ' + nombre + ': la franja dice que no se pudo comprobar', ((await franja(p)) || '').includes('No se ha podido comprobar'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ resp: { data: Object.assign({}, BIEN, { recortado: true }), error: null } });
    ok('lectura recortada: la franja lo dice', ((await franja(p)) || '').includes('500 más recientes'));
    await ctx.close();
  }
  // 5. el papel: el de prueba lleva la franja en los idiomas del papel (id·en en bbm) y el real no; también en el HTML que se imprime
  {
    const { p, ctx } = await abre({ resp: { data: BIEN, error: null } });
    const hp = await p.evaluate(() => window.abrePapel('BBM-P2026-00001'));
    ok('papel de prueba: franja «UJI COBA — tidak berlaku sebagai faktur pajak · TEST — not a tax invoice» dentro del HTML (lo que se imprime)',
       hp.includes('data-axw-prueba="papel"') && hp.includes('UJI COBA — tidak berlaku sebagai faktur pajak · TEST — not a tax invoice') && hp.indexOf('data-axw-prueba') > hp.indexOf('<body'), hp.slice(0, 200));
    const hr = await p.evaluate(() => window.abrePapel('BBM-2026-00007'));
    ok('papel real: sin franja', !hr.includes('data-axw-prueba'));
    const hr2 = await p.evaluate(() => window.abrePapel('BBM-PR2026-00001'));
    ok('rectificativa de prueba (PR): con franja', hr2.includes('data-axw-prueba="papel"'));
    await ctx.close();
  }
  // 6. el papel antes de saber qué es de prueba: aviso en voz alta, nunca una P sin marca
  {
    const { p, ctx } = await abre({ resp: { data: BIEN, error: null }, tarda: 1500, ruta: '/contratos/' });
    const h = await p.evaluate(() => window.abrePapel('BBM-P2026-00001'));
    ok('papel pintado antes de la lectura: «no se ha podido comprobar si es de prueba: no la imprimas todavía»', h.includes('data-axw-prueba="papel"') && h.includes('no la imprimas todavía'), h.slice(0, 160));
    await ctx.close();
  }
  // 7. documentoHTML ausente, con otra firma o documento.js que no carga: en voz alta en la franja y en las filas P
  for (const [nombre, o] of [['sin documentoHTML', { docTipo: 'sin' }], ['con otra firma', { docTipo: 'firma' }], ['documento.js que no carga', { docFalla: true }]]) {
    const { p, ctx } = await abre(Object.assign({ resp: { data: BIEN, error: null } }, o));
    await p.evaluate(() => window.abrePapel('BBM-P2026-00001'));
    await p.waitForTimeout(300);
    const f = (await franja(p)) || '', c = await chips(p);
    ok(nombre + ': la franja dice «no se pudo marcar el papel como prueba» y la fila P también', f.includes('No se pudo marcar el papel como prueba') && c.length === 1 && c[0].includes('No se pudo marcar'), f + ' · ' + JSON.stringify(c));
    await ctx.close();
  }
  await nav.close();
  console.log(fallos ? `\n${fallos} de ${total} FALLAN` : `\nTODO BIEN (${total})`);
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('NO SE HA PODIDO MIRAR: ' + e.message); process.exit(2); });
