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
// Rutas en el idioma de la instancia (bbm-idioma-total, 15-oct-2026): el servidor sirve /invoices/x desde facturas/x (alias_htaccess). Aquí, lo mismo,
// con el mapa del ayudante en línea (rutas_idioma.js); sin ayudante (paquete anterior), nada que traducir.
const ALIAS = (() => { try {
  const m = /<script id="axw-rutas">[\s\S]*?var D = (\{.*?\});\n/.exec(fs.readFileSync(path.join(RAIZ, 'home', 'index.html'), 'utf8'));
  if (!m) return [];
  const D = JSON.parse(m[1]), pares = [];
  for (const [k, subs] of Object.entries(D.s || {})) for (const [s, en] of Object.entries(subs)) pares.push(['/' + D.r[k] + '/' + en + '/', '/' + k + '/' + s + '/']);
  for (const [k, en] of Object.entries(D.r)) pares.push(['/' + en + '/', '/' + k + '/']);
  return pares;
} catch (e) { return []; } })();
function fichero(url) {
  let p = decodeURIComponent(new URL(url).pathname);
  for (const [de, a] of ALIAS) if (p.startsWith(de)) { p = a + p.slice(de.length); break; }
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RAIZ, p);
  return f.startsWith(RAIZ) && fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}
const MIDE = () => {
  const interna = (p) => (window.axwRutaInterna ? window.axwRutaInterna(p) : p);   // el href pintado puede ir en inglés (/invoices/)
  const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const nav = [...document.querySelectorAll('aside nav')].find(n => n.querySelector('a[data-path="home"]'));
  const secciones = nav ? [...nav.children].filter(s => s.querySelector(':scope > a[data-path]')).map(s => ({
    rotulo: (s.querySelector(':scope > span') || {}).textContent || '', visible: vis(s),
    entradas: [...s.querySelectorAll(':scope > a[data-path]')].filter(vis).map(a => a.getAttribute('data-path')) })) : [];
  const cobros = document.querySelector('aside a[data-path="cobros"]');
  const texto = p => { const a = document.querySelector('aside a[data-path="' + p + '"]'); return a ? a.textContent.replace(/\s+/g, ' ').trim() : null; };
  return { lang: document.documentElement.lang, secciones, cobrosVisible: vis(cobros), cobrosHref: cobros ? interna(new URL(cobros.getAttribute('href'), location.href).pathname) : null,
    taller: texto('taller'), entrega: texto('entrega'), flota: texto('flota') };
};
(async () => {
  if (!fs.existsSync(path.join(RAIZ, 'home', 'index.html'))) { console.log('NO SE HA PODIDO MIRAR: falta home/index.html en ' + RAIZ); process.exit(2); }
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  let sinNav = false;   // sirve assets/nav.js VACÍO: los href del menú se quedan en «#» (= la página actual), el estado que el revisor vio posible
  await ctx.route('**/*', async route => {
    const url = route.request().url();
    if (sinNav && /\/assets\/nav\.js/.test(url)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
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
  const ESPERADO = { id: { taller: 'Bengkel', entrega: 'Tarif antar', flota: 'Armada dan tarif' }, en: { taller: 'Workshop', entrega: 'Delivery prices', flota: 'Fleet and rates' } };
  // sin elección guardada abre en el idioma de pantalla de la instancia (bbm-p42, 13-oct: bbm en inglés), no en el primero de la lista
  await p.goto(ORIGEN + '/home/', { waitUntil: 'load' });
  const limpio = await p.evaluate(() => [document.documentElement.lang, window.AXW_IDIOMA_PANTALLA]);
  ok('sin elección: la página abre en el idioma de pantalla de la instancia (' + limpio[1] + ')', !!limpio[1] && limpio[0] === limpio[1], JSON.stringify(limpio));
  for (const lengua of ['id', 'en']) {
    await p.goto(ORIGEN + '/home/', { waitUntil: 'load' });
    await p.evaluate(l => window.lwSetIdioma(l), lengua); await p.reload({ waitUntil: 'load' });
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
    // el pop-up de novedades son anuncios de Lawang: en una instancia no sale (idiomas-pH, 12-oct; antes se borraba aquí sin contarlo)
    ok(lengua + ': el pop-up de novedades de Lawang no sale en la instancia', await p.evaluate(() => !document.getElementById('lw-novedades')));
    await p.click('aside a[data-path="cobros"]', { timeout: 3000 }).catch(() => null);   // oculto = ya contado arriba
    await p.waitForTimeout(300);
    const sub = await p.evaluate(() => { const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none';
      const g = document.querySelector('aside a[data-path="cobros"]'); const s = g && document.getElementById(g.getAttribute('aria-controls'));
      return s ? [...s.querySelectorAll('a[data-lw-pestana]')].filter(vis).map(a => a.getAttribute('data-lw-pestana')) : null; });
    ok(lengua + ': al abrir «Cobros» salen Facturas y Recibos y no Vencimientos', !!sub && sub.indexOf('facturas') !== -1 && sub.indexOf('recibos') !== -1 && sub.indexOf('vencimientos') === -1, JSON.stringify(sub));
    // tipo Reservas (erp-front, 14-oct): /productos/ es «Extras y servicios» en todo enlace del menú, cambiado por la RUTA (no por el rótulo de nav.js)
    const EXTRAS = { id: 'Ekstra dan layanan', en: 'Extras and services' }[lengua];
    const prodTxt = await p.evaluate(() => [...document.querySelectorAll('aside a[href], nav a[href]')].filter(a => (window.axwRutaInterna || String)(new URL(a.href).pathname) === '/productos/').map(a => a.textContent.replace(/\s+/g, ' ').trim()));
    ok(lengua + ': todo enlace del menú a /productos/ dice «' + EXTRAS + '» y ninguno «Products/Produk»', prodTxt.length > 0 && prodTxt.every(x => x.indexOf(EXTRAS) !== -1 && !/Products|Produk|Productos/.test(x)), JSON.stringify(prodTxt));
    if (SHOT) await p.screenshot({ path: `${SHOT}_1440_${lengua}.png` });
  }
  // DENTRO de una pestaña del grupo (orquestador 12-oct en /facturas/ de bbm: «Collections» salía plegado y vacío): el grupo
  // se abre solo y enseña sus pestañas encendidas, con la actual marcada
  await p.evaluate(() => window.lwSetIdioma('id'));   // el bucle de idiomas acaba en inglés: aquí se mira en indonesio, como abre la instancia
  for (const ruta of ['facturas', 'recibos']) {
    await p.goto(ORIGEN + '/' + ruta + '/', { waitUntil: 'load' });
    await p.waitForTimeout(3000);
    const r = await p.evaluate(() => { const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none';
      const g = document.querySelector('aside a[data-path="cobros"]'); const s = g && document.getElementById(g.getAttribute('aria-controls'));
      return { abierto: !!s && vis(s) && g.getAttribute('aria-expanded') === 'true',
        visibles: s ? [...s.querySelectorAll('a[data-lw-pestana]')].filter(vis).map(a => a.getAttribute('data-lw-pestana')) : [] }; });
    // frases partidas por un dato (data-lwt-nodos, «Mostrando … de … recibís»): en indonesio, que es como abre la instancia, nada en español
    const nodos = await p.evaluate(() => [...document.querySelectorAll('[data-lwt-nodos]')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    ok('dentro de /' + ruta + '/: las frases partidas por un dato salen en indonesio (' + nodos.join(' | ') + ')', nodos.length > 0 && nodos.every(t => !/Mostrando|recibís|documentos|Showing|receipts/.test(t)));
    ok('dentro de /' + ruta + '/: «Cobros» abierto con Facturas y Recibos (sin Vencimientos)', r.abierto && r.visibles.indexOf('facturas') !== -1
       && r.visibles.indexOf('recibos') !== -1 && r.visibles.indexOf('vencimientos') === -1, JSON.stringify(r));
  }
  // la propia /productos/: la pantalla «Extras y servicios» del maestro, no la de Lawang (sin su tabla de productos)
  await p.goto(ORIGEN + '/productos/', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const ex = await p.evaluate(() => ({ raiz: !!document.querySelector('[data-ex="raiz"]'), lawang: !!document.getElementById('lw-prd-lista'),
    tit: (document.querySelector('.ex-h1') || {}).textContent || '', menu: [...document.querySelectorAll('aside a[href], nav a[href]')].filter(a => (window.axwRutaInterna || String)(new URL(a.href).pathname) === '/productos/').map(a => a.textContent.replace(/\s+/g, ' ').trim()) }));
  ok('/productos/ es la pantalla «Extras y servicios» (sin la tabla de Lawang) y su menú dice lo mismo', ex.raiz && !ex.lawang && /Ekstra dan layanan/.test(ex.tit)
     && ex.menu.length > 0 && ex.menu.every(x => x.indexOf('Ekstra dan layanan') !== -1), JSON.stringify(ex));
  if (SHOT) await p.screenshot({ path: `${SHOT}_1440_productos_id.png` });
  // revisor 14-oct: si modulos_activos_datos contesta ANTES de que nav.js recablee, todas las entradas siguen en href="#" (= la página actual).
  // Se fuerza ese estado sirviendo nav.js vacío: el rótulo va por data-path / data-lw-pestana, así que ninguna otra entrada pasa a «Extras y
  // servicios» (con el rótulo por href, todas lo harían). Sin nav.js no se injerta la entrada de productos: aquí solo se mira que no contagie.
  sinNav = true;
  await p.goto(ORIGEN + '/productos/', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  sinNav = false;
  const tarde = await p.evaluate(() => [...document.querySelectorAll('aside a[data-path], a[data-lw-pestana]')]
    .map(a => ({ id: a.getAttribute('data-lw-pestana') || a.getAttribute('data-path'), plegable: a.hasAttribute('data-lw-plegable'), t: a.textContent.replace(/\s+/g, ' ').trim() })));
  const mal = tarde.filter(x => (x.id !== 'productos' || x.plegable) && x.t.indexOf('Ekstra dan layanan') !== -1);
  const almohadilla = await p.evaluate(() => [...document.querySelectorAll('aside a[data-path]')].filter(a => a.getAttribute('href') === '#').length);
  ok('sin nav.js (href="#") en /productos/: ninguna otra entrada (ni la cabecera de un grupo) pasa a «Extras y servicios»', almohadilla > 5 && tarde.length > 5 && mal.length === 0, almohadilla + ' · ' + JSON.stringify(mal.slice(0, 5)));
  ok('0 errores de consola', errores.length === 0, errores.slice(0, 4).join(' | '));
  await nav.close();
  console.log(fallos ? `\n${fallos} de ${total} FALLAN` : `\nTODO BIEN (${total})`);
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('NO SE HA PODIDO MIRAR: ' + e.message); process.exit(2); });
