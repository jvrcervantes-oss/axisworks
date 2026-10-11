// node comercial/demo-erp/pruebas/puerta_instancia.harness.cjs <raíz del paquete YA CONSTRUIDO con build.py --instancia> [--un-idioma] [captura_prefijo]
// Harness de la puerta (/) de una instancia (12-oct-2026; verificador sobre la 2.ª de bbm: el botón «English» vivía en la barra de la app,
// oculta en la puerta, y quien no lee indonesio no podía cambiar de idioma antes de entrar). Abre la puerta REAL del paquete en Chromium,
// sin sesión (supabase-js falso con getSession vacío, servido por page.route; ninguna petición sale a la red salvo las fuentes) a 1440 y a
// 390 px, y mide: el selector de idioma se VE y marca el idioma actual, pulsar el otro cambia la interfaz y se guarda al recargar, el
// correo de ejemplo es neutro, la marca va centrada y no hay errores de consola. Con --un-idioma comprueba que una instancia sin
// `idiomas` (axisworks-demo) no lleva selector.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const RAIZ = path.resolve(process.argv[2] || '');
const UN_IDIOMA = process.argv.includes('--un-idioma');
const SHOT = process.argv.slice(3).find(a => !a.startsWith('--'));
let fallos = 0, total = 0;
const ok = (nombre, c, extra = '') => { total++; if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + nombre); };
const ORIGEN = 'https://erp.prueba.test';
const TIPOS = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const FALSO = `(function(){
  var cli = { auth:{ getSession:function(){return Promise.resolve({data:{session:null},error:null});}, getUser:function(){return Promise.resolve({data:{user:null},error:null});},
      onAuthStateChange:function(){return {data:{subscription:{unsubscribe:function(){}}}};}, signOut:function(){return Promise.resolve({error:null});},
      signInWithPassword:function(){return Promise.resolve({data:null,error:{message:'no'}});} },
    from:function(){ throw new Error('from() en la puerta sin sesión'); }, rpc:function(){ return Promise.resolve({data:null,error:null}); } };
  window.supabase = { createClient:function(){ return cli; } };
})();`;
function fichero(url) {
  let p = decodeURIComponent(new URL(url).pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RAIZ, p);
  return f.startsWith(RAIZ) && fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}
(async () => {
  if (!fs.existsSync(path.join(RAIZ, 'index.html'))) { console.log('NO SE HA PODIDO MIRAR: falta index.html en ' + RAIZ); process.exit(2); }
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  for (const [ancho, alto] of [[1440, 900], [390, 844]]) {
    const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
    await ctx.route('**/*', route => {
      const url = route.request().url();
      if (/supabase-js/.test(url)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: FALSO });
      if (/fonts\.(googleapis|gstatic)\.com|@phosphor-icons/.test(url)) return route.continue();
      if (!url.startsWith(ORIGEN)) return route.abort();
      const f = fichero(url);
      if (!f) return route.fulfill({ status: 404, body: '' });
      let body = fs.readFileSync(f);
      if (f.endsWith('.html')) body = body.toString('utf8').replace(/ integrity="[^"]*"/g, '');   // el supabase-js falso no casa con el SRI
      return route.fulfill({ status: 200, contentType: TIPOS[path.extname(f)] || 'application/octet-stream', body });
    });
    const errores = [];
    const p = await ctx.newPage();
    p.on('pageerror', e => errores.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errores.push(m.text()); });
    await p.goto(ORIGEN + '/', { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const sel = document.querySelector('[data-lw="login-idioma"]');
      const vis = el => !!el && el.offsetParent !== null && el.getBoundingClientRect().width > 0;
      const correo = document.getElementById('loginEmail');
      const w = document.querySelector('.lw-login .marca .word');
      return { login: vis(document.getElementById('loginGate')), hay: !!sel, visible: vis(sel), lang: document.documentElement.lang,
        pulsado: sel ? [...sel.querySelectorAll('button[aria-pressed="true"]')].map(b => b.dataset.idioma) : [],
        placeholder: correo ? correo.placeholder : null, centrada: w ? getComputedStyle(w).textAlign : null };
    });
    ok(ancho + ': la puerta enseña la tarjeta de entrada', r.login);
    ok(ancho + ': correo de ejemplo neutro (no el dominio de nadie)', r.placeholder === 'email@example.com', String(r.placeholder));
    ok(ancho + ': la marca va centrada', r.centrada === 'center', String(r.centrada));
    if (UN_IDIOMA) {
      ok(ancho + ': con un solo idioma no hay selector', !r.hay);
    } else {
      ok(ancho + ': el selector de idioma se VE en la tarjeta', r.visible);
      ok(ancho + ': marca el idioma actual (y solo ese)', r.pulsado.length === 1 && r.pulsado[0] === r.lang, r.pulsado.join(',') + ' / lang ' + r.lang);
      if (SHOT) await p.screenshot({ path: `${SHOT}_${ancho}_${r.lang}.png` });
      const otro = r.lang === 'en' ? 'id' : 'en';
      await Promise.all([p.waitForNavigation({ waitUntil: 'load' }).catch(() => null), p.click(`[data-lw="login-idioma"] button[data-idioma="${otro}"]`)]);
      await p.waitForTimeout(1200);
      const r2 = await p.evaluate(() => ({ lang: document.documentElement.lang,
        pulsado: [...document.querySelectorAll('[data-lw="login-idioma"] button[aria-pressed="true"]')].map(b => b.dataset.idioma),
        boton: (document.getElementById('loginBtn') || {}).textContent }));
      ok(ancho + ': pulsar ' + otro.toUpperCase() + ' cambia la interfaz y lo marca', r2.lang === otro && r2.pulsado.join() === otro, JSON.stringify(r2));
      if (SHOT) await p.screenshot({ path: `${SHOT}_${ancho}_${otro}.png` });
      await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(800);
      ok(ancho + ': la elección se guarda al recargar', (await p.evaluate(() => document.documentElement.lang)) === otro);
    }
    ok(ancho + ': 0 errores de consola', errores.length === 0, errores.slice(0, 4).join(' | '));
    await ctx.close();
  }
  await nav.close();
  console.log(fallos ? `\n${fallos} de ${total} FALLAN` : `\nTODO BIEN (${total})`);
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('NO SE HA PODIDO MIRAR: ' + e.message); process.exit(2); });
