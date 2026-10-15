// node comercial/demo-erp/pruebas/rutas_idioma.harness.cjs <raíz del paquete YA CONSTRUIDO con build.py --instancia (bbm: idiomas id+en)> [captura_prefijo]
// Rutas en el idioma de la instancia (bbm-idioma-total, 15-oct-2026; owner: «la barra de dirección sigue diciendo palabras en español»). Calco de
// menu_instancia.harness.cjs: base simulada en memoria (supabase-js falso por page.route; nada sale a la red salvo las fuentes), super_admin, todos
// los módulos del mapa encendidos MENOS el de /vencimientos/ (para medir lo apagado). El servidor local imita el .htaccess de la instancia: la ruta
// inglesa se sirve POR DENTRO desde su carpeta (/workshop/x → taller/x; los pares salen del .htaccess del paquete o, si no lo hay, del mapa del
// ayudante en línea). Para cada pantalla del mapa, por la ruta inglesa Y por la española, a 1440 y a 390 px, exige:
//   · la barra en inglés: ni la ruta, ni la consulta, ni el hash con un nombre español del mapa (/settings/setup/, ?no_access=, #companies);
//   · ningún a[href] pintado que lleve a una ruta española con nombre inglés (ni ?sin_permiso=, ni #<pestaña> española hacia Ajustes);
//   · la pantalla pinta: sin html.axw-mod-pend colgado y con su contenedor principal; la pestaña activa del menú marcada (pantallas con menú);
//   · el módulo apagado (vencimientos) sale «no instalado» por las dos rutas y su enlace oculto en el menú;
//   · 0 errores de página.
// Y con el idioma de pantalla de la base en español (axw_idioma_pantalla_erp = 'es'), la barra vuelve a la ruta española.
// Las rutas salen APAGADAS por instancia hasta su ensayo en el LiteSpeed (build.py rutas_en_idioma): el paquete para este arnés se construye con
// AXW_PRUEBA_DESPLIEGUE=<carpeta> AXW_RUTAS_IDIOMA=1; sin ellas no lleva el ayudante y este arnés no tiene nada que medir.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const RAIZ = path.resolve(process.argv[2] || '');
const SHOT = process.argv[3];
let fallos = 0, total = 0;
const ok = (nombre, c, extra = '') => { total++; if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + nombre); };
const ORIGEN = 'https://erp.prueba.test';
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp' };
const HOY = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

// ── el mapa: del ayudante en línea (lo que el navegador usa de verdad) ──
function mapaDelAyudante() {
  const home = fs.readFileSync(path.join(RAIZ, 'home', 'index.html'), 'utf8');
  const m = /<script id="axw-rutas">[\s\S]*?var D = (\{.*?\});\n/.exec(home);
  if (!m) throw new Error('home/index.html sin el ayudante de rutas (¿paquete construido sin rutas_idioma_paquete?)');
  return JSON.parse(m[1]);
}
// ── los alias del servidor: del .htaccess del paquete si lo hay (el clon publicado); si no, del mapa (DIST sin .htaccess) ──
function aliasDelServidor(D) {
  const ht = path.join(RAIZ, '.htaccess');
  const pares = [];
  if (fs.existsSync(ht)) {
    for (const l of fs.readFileSync(ht, 'utf8').split('\n')) {
      const m = /^\s*RewriteRule \^(\S+?)\/\(\.\*\)\$ (\S+?)\/\$1 \[L\]\s*$/.exec(l);
      if (m) pares.push([m[1].replace(/\\/g, ''), m[2]]);
    }
    return { pares, fuente: '.htaccess' };
  }
  for (const [clave, subs] of Object.entries(D.s || {})) for (const [s, en] of Object.entries(subs)) pares.push([D.r[clave] + '/' + en, clave + '/' + s]);
  for (const [clave, en] of Object.entries(D.r)) pares.push([en, clave]);
  return { pares, fuente: 'mapa del ayudante' };
}
let D, ALIAS;
function fichero(url) {
  let p = decodeURIComponent(new URL(url).pathname).replace(/^\//, '');
  for (const [de, a] of ALIAS.pares) { if (p.startsWith(de + '/')) { p = a + '/' + p.slice(de.length + 1); break; } }   // la regla interna, en orden
  if (p === '' || p.endsWith('/')) p += 'index.html';
  const f = path.join(RAIZ, p);
  return f.startsWith(RAIZ) && fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}
function falso(activos) {
  return `(function(){
  var ses = { access_token:'a', refresh_token:'r', user:{ id:'u1', email:'super@prueba.test' } };
  var tablas = { usuarios: { rol:'super_admin', herramientas:[], activo:true, nombre:'Super de prueba', notif_visto_hasta:null, ambito:null, empresas:null, es_propietario:true } };
  var rpcs = { modulos_activos_datos: { activos: ${JSON.stringify(activos)} }, portada_reservas_dia_datos: { dia: ${JSON.stringify(HOY)}, entregas: [], devoluciones: [] } };
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
}
// lo que se mide en la página (en el navegador): barra, enlaces, pinta, pestaña activa
const MIDE = (D) => {
  const R = D.r, S = D.s || {}, H = D.h || {};
  const esES = new Set(Object.keys(R).filter((k) => R[k] !== k));
  // una ruta con nombre español del mapa: el primer tramo, o el segundo bajo una pantalla con submapa (/settings/configurar/)
  const malPath = (p) => {
    const s = p.split('/');
    if (esES.has(s[1])) return true;
    const cl = Object.keys(R).find((k) => R[k] === s[1]);
    return !!(cl && S[cl] && s.length > 2 && S[cl][s[2]] && S[cl][s[2]] !== s[2]);
  };
  const malBusca = (q) => /(^|[?&])sin_permiso=/.test(q) || [...new URLSearchParams(q).entries()].some(([k, v]) => (k === 'no_access' && esES.has(v)) || (k === 'next' && malPath(v.split('?')[0])));
  const hashEsp = (p, h) => { const cl = (window.axwRutaInterna ? window.axwRutaInterna(p) : p).split('/')[1]; return !!(H[cl] && h.length > 1 && H[cl][h.slice(1)] && H[cl][h.slice(1)] !== h.slice(1)); };
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none';
  const enlacesMal = [...document.querySelectorAll('a[href], area[href]')].filter((a) => {
    const raw = a.getAttribute('href'); if (!raw || raw === '#') return false;
    let u; try { u = new URL(raw, location.href); } catch (e) { return false; }
    if (u.origin !== location.origin) return false;
    return malPath(u.pathname) || malBusca(u.search) || hashEsp(u.pathname, u.hash);
  }).map((a) => a.getAttribute('href')).slice(0, 6);
  const interna = window.axwRutaInterna ? window.axwRutaInterna(location.pathname) : location.pathname;
  const clave = interna.split('/')[1];
  const activa = [...document.querySelectorAll('aside a[aria-current="page"], nav a[aria-current="page"]')].map((a) => ({
    path: a.getAttribute('data-path'), pestana: a.getAttribute('data-lw-pestana'),
    ruta: (() => { try { const p = new URL(a.getAttribute('href'), location.href).pathname; return window.axwRutaInterna ? window.axwRutaInterna(p) : p; } catch (e) { return ''; } })() }));
  return {
    barra: location.pathname + location.search + location.hash, malBarra: malPath(location.pathname) || malBusca(location.search) || hashEsp(location.pathname, location.hash),
    enlacesMal, pend: document.documentElement.classList.contains('axw-mod-pend'), contenedor: !!document.querySelector('main, [role="main"], form, #grupos'),
    noInstalado: !!document.getElementById('axw-reintenta'), conMenu: !!document.querySelector('aside nav'),
    activaBien: activa.some((x) => x.path === clave || x.pestana === clave || (x.ruta && x.ruta.indexOf('/' + clave + '/') === 0)), activa: activa.slice(0, 3),
    apagadoVisible: [...document.querySelectorAll('aside a[href]')].filter((a) => { const p = new URL(a.getAttribute('href'), location.href).pathname; return (window.axwRutaInterna ? window.axwRutaInterna(p) : p).indexOf('/vencimientos/') === 0; }).filter(vis).length,
    idioma: window.axwIdiomaRutas,
  };
};
(async () => {
  if (!fs.existsSync(path.join(RAIZ, 'home', 'index.html'))) { console.log('NO SE HA PODIDO MIRAR: falta home/index.html en ' + RAIZ); process.exit(2); }
  D = mapaDelAyudante(); ALIAS = aliasDelServidor(D);
  console.log('alias del servidor sacados de: ' + ALIAS.fuente + ' (' + ALIAS.pares.length + ' pares)');
  // los módulos: todos los del mapa de la instancia (guard.js) menos el de /vencimientos/
  const guard = fs.readFileSync(path.join(RAIZ, 'contracts', 'assets', 'guard.js'), 'utf8');
  const M = JSON.parse(/var M = (\{.*?\});\n/.exec(guard)[1]);
  const APAGADO = M.p['/vencimientos/'];
  const ACTIVOS = [...new Set(Object.values(M.p))].filter((m) => m !== APAGADO);
  ok('hay un módulo que apagar (el de /vencimientos/: ' + APAGADO + ')', !!APAGADO);
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const pantallas = Object.keys(D.r).filter((k) => fs.existsSync(path.join(RAIZ, k, 'index.html')));
  for (const [clave, subs] of Object.entries(D.s || {})) for (const s of Object.keys(subs)) if (fs.existsSync(path.join(RAIZ, clave, s, 'index.html'))) pantallas.push(clave + '/' + s);
  const visibleDe = (k) => { const [a, b] = k.split('/'); return D.r[a] + (b ? '/' + D.s[a][b] : ''); };
  for (const ancho of [1440, 390]) {
    const ctx = await nav.newContext({ viewport: { width: ancho, height: ancho > 500 ? 900 : 844 } });
    await ctx.route('**/*', async (route) => {
      const url = route.request().url();
      if (/supabase-js/.test(url)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: falso(ACTIVOS) });
      if (/fonts\.(googleapis|gstatic)\.com|@phosphor-icons/.test(url)) return route.continue();
      if (!url.startsWith(ORIGEN)) return route.abort();
      const u = new URL(url);
      // /workshop sin barra: el 302 del .htaccess
      for (const [de] of ALIAS.pares) if (u.pathname === '/' + de) return route.fulfill({ status: 302, headers: { location: '/' + de + '/' + u.search } });
      const f = fichero(url);
      if (!f) return route.fulfill({ status: 404, body: '' });
      let body = fs.readFileSync(f);
      if (f.endsWith('.html')) body = body.toString('utf8').replace(/ integrity="[^"]*"/g, '');   // el supabase-js falso no casa con el SRI
      return route.fulfill({ status: 200, contentType: TIPOS[path.extname(f)] || 'application/octet-stream', body });
    });
    const p = await ctx.newPage();
    const errores = [];
    p.on('pageerror', (e) => errores.push(e.message));
    for (const k of pantallas) {
      for (const via of ['en', 'es']) {
        const ruta = '/' + (via === 'en' ? visibleDe(k) : k) + '/';
        await p.goto(ORIGEN + ruta, { waitUntil: 'load' });
        await p.waitForTimeout(1800);
        const r = await p.evaluate(MIDE, D);
        const tag = ancho + ' ' + ruta;
        // Redirectores del propio paquete: /sociedades/ → Ajustes › Sociedades; /documentacion/ y /proyectos-cuentas/ → /proyectos/ (pantallas de
        // Lawang que la instancia junta). Lo que se pide es que la barra acabe en inglés, en la pantalla a la que redirigen.
        const REDIRIGE = { sociedades: 'ajustes', documentacion: 'proyectos', 'proyectos-cuentas': 'proyectos' };
        const esperada = '/' + visibleDe(REDIRIGE[k] || k) + '/';
        ok(tag + ': barra en inglés (' + r.barra + ')', !r.malBarra && r.barra.indexOf(esperada) === 0 && r.idioma === 'en', JSON.stringify([r.barra, r.idioma]));
        if (k === 'sociedades') ok(tag + ': llega a Ajustes › #' + D.h.ajustes.sociedades, r.barra.endsWith('#' + D.h.ajustes.sociedades), r.barra);
        ok(tag + ': ningún enlace pintado a una ruta española con nombre inglés', r.enlacesMal.length === 0, JSON.stringify(r.enlacesMal));
        if (k === 'vencimientos') {
          ok(tag + ': módulo apagado → «no instalado» por esta ruta', r.noInstalado && !r.pend, JSON.stringify([r.noInstalado, r.pend]));
          continue;
        }
        ok(tag + ': la pantalla pinta (sin axw-mod-pend y con su contenedor)', !r.pend && (r.contenedor || r.noInstalado), JSON.stringify([r.pend, r.contenedor]));
        // /whatsapp-bot-alta/ con la base falsa rompe al cargar (sin la fila de datos del negocio: «reading 'razon_social'»; ya pasaba con las
        // rutas en español antes de este cambio, build de bbm del 15-oct 18:55) y no llega a marcar el menú: su pestaña la mira el verificador en vivo.
        const BASE_FALSA_ROMPE = { 'whatsapp-bot-alta': /razon_social/ };
        if (r.conMenu && !r.noInstalado && !BASE_FALSA_ROMPE[k]) ok(tag + ': la pestaña activa del menú marcada', r.activaBien, JSON.stringify(r.activa));
        if (r.conMenu) ok(tag + ': el enlace del módulo apagado (vencimientos) oculto en el menú', r.apagadoVisible === 0, String(r.apagadoVisible));
        if (SHOT && via === 'en') await p.screenshot({ path: `${SHOT}_${ancho}_${visibleDe(k).replace('/', '-')}.png` });
      }
    }
    // la puerta con ?next= y el hub con ?sin_permiso= (lo que guard.js escribe con la ruta interna): la barra los enseña en inglés
    await p.goto(ORIGEN + '/?next=%2Ftaller%2F', { waitUntil: 'load' }); await p.waitForTimeout(800);
    let b = await p.evaluate(() => location.pathname + location.search);
    ok(ancho + ' puerta: ?next= con la ruta visible (' + b + ')', b.indexOf('next=%2F' + D.r.taller + '%2F') !== -1 || b.indexOf('/' + D.r.taller + '/') === 0, b);
    await p.goto(ORIGEN + '/?sin_permiso=gastos', { waitUntil: 'load' }); await p.waitForTimeout(800);
    b = await p.evaluate(() => location.search);
    ok(ancho + ' hub: ?sin_permiso=gastos sale como ?no_access=' + D.r.gastos, b === '?no_access=' + D.r.gastos, b);
    // Ajustes: cada pestaña por su hash español acaba en el inglés, y al pulsarla la barra no vuelve al español
    await p.goto(ORIGEN + '/ajustes/#cobros', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    b = await p.evaluate(() => location.pathname + location.hash);
    ok(ancho + ' /ajustes/#cobros → /' + D.r.ajustes + '/#' + D.h.ajustes.cobros, b === '/' + D.r.ajustes + '/#' + D.h.ajustes.cobros, b);
    const tabs = await p.$$eval('[data-lw-tab]', (es) => es.filter((e) => e.getClientRects().length).map((e) => e.getAttribute('data-lw-tab')));
    for (const t of tabs.slice(0, 4)) {
      await p.click('[data-lw-tab="' + t + '"]').catch(() => null); await p.waitForTimeout(250);
      const h = await p.evaluate(() => location.hash);
      ok(ancho + ' Ajustes: pulsar «' + t + '» deja #' + (D.h.ajustes[t] || t) + ' en la barra', h === '#' + (D.h.ajustes[t] || t), h);
    }
    const errReales = errores.filter((e) => !/reading 'razon_social'/.test(e));   // el de /whatsapp-bot-alta/ con la base falsa (arriba)
    ok(ancho + ' px: 0 errores de página (salvo el de la base falsa en /whatsapp-bot-alta/)', errReales.length === 0, errReales.slice(0, 4).join(' | '));
    await ctx.close();
  }
  // con el idioma de pantalla de la base en español: la barra vuelve a la ruta española, también entrando por la inglesa
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('axw_idioma_pantalla_erp', 'es'); } catch (e) {} });
  await ctx.route('**/*', async (route) => {
    const url = route.request().url();
    if (/supabase-js/.test(url)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: falso(ACTIVOS) });
    if (!url.startsWith(ORIGEN)) return /fonts\./.test(url) ? route.continue() : route.abort();
    const f = fichero(url);
    if (!f) return route.fulfill({ status: 404, body: '' });
    let body = fs.readFileSync(f);
    if (f.endsWith('.html')) body = body.toString('utf8').replace(/ integrity="[^"]*"/g, '');
    return route.fulfill({ status: 200, contentType: TIPOS[path.extname(f)] || 'application/octet-stream', body });
  });
  const p = await ctx.newPage();
  // se mide al cargar: la canónica corre en el <head>, antes que nada (la base simulada no trae idiomas, así que nadie toca lo guardado)
  await p.goto(ORIGEN + '/' + D.r.taller + '/', { waitUntil: 'domcontentloaded' });
  const b = await p.evaluate(() => [location.pathname, window.axwIdiomaRutas]);
  ok('pantalla de la base en español: /' + D.r.taller + '/ → /taller/', b[0] === '/taller/' && b[1] === 'es', JSON.stringify(b));
  await nav.close();
  console.log(fallos ? `\n${fallos} de ${total} FALLAN` : `\nTODO BIEN (${total})`);
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.log('NO SE HA PODIDO MIRAR: ' + e.message); process.exit(2); });
