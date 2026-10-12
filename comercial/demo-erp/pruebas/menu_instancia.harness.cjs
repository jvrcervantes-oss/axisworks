// node comercial/demo-erp/pruebas/menu_instancia.harness.cjs <raíz del paquete YA CONSTRUIDO con build.py --instancia (con idiomas id+en)> [captura_prefijo]
// Harness del menú lateral de una instancia (12-oct-2026; owner en bbm como super admin: «no veo cobros ni facturas ni recibís»). Reproduce
// EXACTAMENTE ese caso en Chromium sobre el paquete REAL: base simulada en memoria (supabase-js falso por page.route; nada sale a la red salvo
// las fuentes), usuario super_admin sin casillas y modulos_activos = base, productos, reservas-producto, facturas, recibos. Mide:
//   · el grupo plegable «Cobros» se ve, apunta a su primera pestaña ENCENDIDA y al abrirlo enseña Facturas y Recibos, no Vencimientos;
//   · ninguna sección del menú pinta su rótulo sin entradas visibles (y las que tienen entradas sí lo pintan);
//   · Taller, Entrega y Flota y tarifas traducidos en indonesio y en inglés (desde /home/, no desde su propia página);
//   · 0 errores de consola.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const RAIZ = path.resolve(process.argv[2] || '');
const SHOT = process.argv[3];
let fallos = 0, total = 0;
const ok = (nombre, c, extra = '') => { total++; if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + nombre); };
const ORIGEN = 'https://erp.prueba.test';
const TIPOS = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const ACTIVOS = ['base', 'productos', 'reservas-producto', 'facturas', 'recibos'];
const HOY = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const FALSO = `(function(){
  var ses = { access_token:'a', refresh_token:'r', user:{ id:'u1', email:'super@prueba.test' } };
  var tablas = { usuarios: { rol:'super_admin', herramientas:[], activo:true, nombre:'Super de prueba', notif_visto_hasta:null, ambito:null, empresas:null, es_propietario:true } };
  var rpcs = { modulos_activos_datos: { activos: ${JSON.stringify(ACTIVOS)} }, portada_reservas_dia_datos: { dia: ${JSON.stringify(HOY)}, entregas: [], devoluciones: [] } };
  function q(t){ var st = { single:false, then:null };
    var px = new Proxy({}, { get:function(_o,k){
      if (k==='then') return st.then || function(ok,ko){ var d = tablas[t]; return Promise.resolve({ data: st.single ? (d||null) : (d?[d]:[]), error:null }).then(ok,ko); };
      if (k==='maybeSingle'||k==='single') return function(){ st.single=true; return px; };
      if (k==='__pon') return function(f){ st.then=f; return px; };
      return function(){ return px; }; } });
    return px; }
  var cli = { auth:{ getSession:function(){return Promise.resolve({data:{session:ses},error:null});}, getUser:function(){return Promise.resolve({data:{user:ses.user},error:null});},
      onAuthStateChange:function(){return {data:{subscription:{unsubscribe:function(){}}}};}, signOut:function(){return Promise.resolve({error:null});} },
    from:q, rpc:function(n){ return q('__').__pon(function(ok,ko){ return Promise.resolve({ data: (n in rpcs) ? rpcs[n] : [], error:null }).then(ok,ko); }); },
    channel:function(){ var c={on:function(){return c;},subscribe:function(){return c;}}; return c; }, removeChannel:function(){},
    storage:{ from:function(){ return { createSignedUrl:function(){return Promise.resolve({data:null,error:null});} }; } } };
  window.supabase = { createClient:function(){ return cli; } };
})();`;
function fichero(url) {
  let p = decodeURIComponent(new URL(url).pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RAIZ, p);
  return f.startsWith(RAIZ) && fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}
const MIDE = () => {
  const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const nav = [...document.querySelectorAll('aside nav')].find(n => n.querySelector('a[data-path="home"]'));
  const secciones = nav ? [...nav.children].filter(s => s.querySelector(':scope > a[data-path]')).map(s => ({
    rotulo: (s.querySelector(':scope > span') || {}).textContent || '', visible: vis(s),
    entradas: [...s.querySelectorAll(':scope > a[data-path]')].filter(vis).map(a => a.getAttribute('data-path')) })) : [];
  const cobros = document.querySelector('aside a[data-path="cobros"]');
  const texto = p => { const a = document.querySelector('aside a[data-path="' + p + '"]'); return a ? a.textContent.replace(/\s+/g, ' ').trim() : null; };
  return { lang: document.documentElement.lang, secciones, cobrosVisible: vis(cobros), cobrosHref: cobros ? new URL(cobros.getAttribute('href'), location.href).pathname : null,
    taller: texto('taller'), entrega: texto('entrega'), flota: texto('flota') };
};
(async () => {
  if (!fs.existsSync(path.join(RAIZ, 'home', 'index.html'))) { console.log('NO SE HA PODIDO MIRAR: falta home/index.html en ' + RAIZ); process.exit(2); }
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
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
  const ESPERADO = { id: { taller: 'Bengkel', entrega: 'Antar', flota: 'Armada dan tarif' }, en: { taller: 'Workshop', entrega: 'Delivery', flota: 'Fleet and rates' } };
  for (const lengua of ['id', 'en']) {
    await p.goto(ORIGEN + '/home/', { waitUntil: 'load' });
    if (lengua === 'en') { await p.evaluate(() => window.lwSetIdioma('en')); await p.reload({ waitUntil: 'load' }); }
    await p.waitForTimeout(2500);
    const r = await p.evaluate(MIDE);
    ok(lengua + ': la página está en ' + lengua, r.lang === lengua, r.lang);
    ok(lengua + ': «Cobros» se ve y apunta a su primera pestaña encendida (/facturas/)', r.cobrosVisible && r.cobrosHref === '/facturas/', JSON.stringify([r.cobrosVisible, r.cobrosHref]));
    const huerfanas = r.secciones.filter(s => s.visible && !s.entradas.length).map(s => s.rotulo.trim());
    const tapadas = r.secciones.filter(s => !s.visible && s.entradas.length).map(s => s.rotulo.trim());
    ok(lengua + ': ninguna sección pinta su rótulo sin entradas visibles', huerfanas.length === 0, huerfanas.join(', '));
    ok(lengua + ': ninguna sección con entradas visibles queda oculta', tapadas.length === 0, tapadas.join(', '));
    const fin = r.secciones.find(s => s.entradas.indexOf('cobros') !== -1);
    ok(lengua + ': la sección de finanzas se ve con «Cobros» dentro', !!fin && fin.visible);
    for (const k of ['taller', 'entrega', 'flota']) ok(lengua + ': el menú traduce ' + k + ' (' + ESPERADO[lengua][k] + ')', (r[k] || '').indexOf(ESPERADO[lengua][k]) !== -1, String(r[k]));
    // abrir «Cobros»: Facturas y Recibos sí, Vencimientos no
    await p.click('aside a[data-path="cobros"]', { timeout: 3000 }).catch(() => null);   // oculto = ya contado arriba
    await p.waitForTimeout(300);
    const sub = await p.evaluate(() => { const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none';
      const g = document.querySelector('aside a[data-path="cobros"]'); const s = g && document.getElementById(g.getAttribute('aria-controls'));
      return s ? [...s.querySelectorAll('a[data-lw-pestana]')].filter(vis).map(a => a.getAttribute('data-lw-pestana')) : null; });
    ok(lengua + ': al abrir «Cobros» salen Facturas y Recibos y no Vencimientos', !!sub && sub.indexOf('facturas') !== -1 && sub.indexOf('recibos') !== -1 && sub.indexOf('vencimientos') === -1, JSON.stringify(sub));
    if (SHOT) await p.screenshot({ path: `${SHOT}_1440_${lengua}.png` });
  }
  ok('0 errores de consola', errores.length === 0, errores.slice(0, 4).join(' | '));
  await nav.close();
  console.log(fallos ? `\n${fallos} de ${total} FALLAN` : `\nTODO BIEN (${total})`);
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('NO SE HA PODIDO MIRAR: ' + e.message); process.exit(2); });
