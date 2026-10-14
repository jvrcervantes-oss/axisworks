// node comercial/demo-erp/pruebas/idiomas_pantallas.harness.cjs <raíz del paquete YA CONSTRUIDO con build.py --instancia (con idiomas id+en)> [informe.json]
// Barrido de español en una instancia que NO es española (bbm-cola-2 T2, 15-oct-2026; owner por agencia-c0: «la paginación sale en español» y
// «Gastos lleva textos de Lawang» en bbm en inglés: «barre los textos fijos en español que salgan en una instancia inglesa, no solo esos»).
// Un grep del HTML no basta (Idiomas, revisión previa #353): la mitad del texto lo pinta el JS y la otra mitad lo traduce. Aquí se abre CADA
// pantalla real del paquete en Chromium, con la base simulada en memoria (supabase-js falso por page.route, como menu_instancia.harness.cjs),
// en inglés y en indonesio, y se mira lo que queda:
//   · LW_T_MISSES: lo que pasó por lwT sin traducción (i18n.js lo apunta);
//   · texto visible, placeholder, title y aria-label con señas de español (tildes, ñ, ¿¡ o palabras que solo son españolas), salvo EXCEPCIONES;
//   · el paginador (lwPaginador) pintado aparte con 60 filas, que con la base vacía no saldría.
// Sale 1 si queda algo. Con [informe.json] escribe además todo lo encontrado por pantalla (lo usa quien arregla).
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const RAIZ = path.resolve(process.argv[2] || '');
const INFORME = process.argv[3];
const ORIGEN = 'https://erp.prueba.test';
const TIPOS = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
// Los módulos que bbm tiene encendidos (inventario del 15-oct sobre su paquete: las pantallas reales). Se puede cambiar por entorno.
const ACTIVOS = (process.env.ACTIVOS || 'base,productos,reservas-producto,facturas,recibos,vencimientos,compradores,operaciones,finanzas,gastos,bancos,cuentas,sociedades,comunicacion').split(',');
// Pantallas reales del paquete de bbm (las «no incluida» no cuentan: son un aviso común ya traducido)
const PANTALLAS = (process.env.PANTALLAS || 'home,ajustes,usuarios,reservas-producto,taller,entrega,flota,facturas,ventas,recibos,vencimientos,compradores,productos,operaciones,finanzas,gastos,bancos,cuentas,sociedades,comunicacion,whatsapp-bot-alta').split(',');
// Lo que puede salir tal cual en inglés o indonesio, con su motivo (Idiomas es dueño de esta lista)
const EXCEPCIONES = [
  [/^Bali Best Motorcycle/, 'nombre de la marca del cliente'],
  [/^(es|en|id|ES|EN|ID)$/, 'código de idioma del selector'],
  [/^Español$/, 'nombre del idioma en su propio idioma (selector)'],
];
const HOY = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const FALSO = `(function(){
  var ses = { access_token:'a', refresh_token:'r', user:{ id:'u1', email:'super@prueba.test' } };
  var tablas = { usuarios: { rol:'super_admin', herramientas:[], activo:true, nombre:'Super de prueba', notif_visto_hasta:null, ambito:null, empresas:null, es_propietario:true } };
  var rpcs = { modulos_activos_datos: { activos: ${JSON.stringify(ACTIVOS)} }, portada_reservas_dia_datos: { dia: ${JSON.stringify(HOY)}, entregas: [], devoluciones: [] } };
  function q(t){ var st = { single:false, then:null };
    var px = new Proxy({}, { get:function(_o,k){
      if (k==='then') return st.then || function(ok,ko){ var d = tablas[t]; return Promise.resolve({ data: st.single ? (d||null) : (d?[d]:[]), error:null, count:0 }).then(ok,ko); };
      if (k==='maybeSingle'||k==='single') return function(){ st.single=true; return px; };
      if (k==='__pon') return function(f){ st.then=f; return px; };
      return function(){ return px; }; } });
    return px; }
  var cli = { auth:{ getSession:function(){return Promise.resolve({data:{session:ses},error:null});}, getUser:function(){return Promise.resolve({data:{user:ses.user},error:null});},
      onAuthStateChange:function(){return {data:{subscription:{unsubscribe:function(){}}}};}, signOut:function(){return Promise.resolve({error:null});} },
    from:q, rpc:function(n){ return q('__').__pon(function(ok,ko){ return Promise.resolve({ data: (n in rpcs) ? rpcs[n] : [], error:null }).then(ok,ko); }); },
    channel:function(){ var c={on:function(){return c;},subscribe:function(){return c;}}; return c; }, removeChannel:function(){},
    functions:{ invoke:function(){ return Promise.resolve({ data:null, error:null }); } },
    storage:{ from:function(){ return { createSignedUrl:function(){return Promise.resolve({data:null,error:null});}, list:function(){return Promise.resolve({data:[],error:null});} }; } } };
  window.supabase = { createClient:function(){ return cli; } };
})();`;
function fichero(url) {
  let p = decodeURIComponent(new URL(url).pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RAIZ, p);
  return f.startsWith(RAIZ) && fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}
// Lo que se ve en la página y suena a español. Corre DENTRO de la página.
const MIRA = () => {
  const ES = /[áéíóúñÁÉÍÓÚÑ¿¡]|\b(de|del|las|los|para|por|una|que|sin|con|el|y|todos|todas|nuevo|nueva|cuenta|cuentas|gasto|gastos|proyecto|proyectos|contrato|cliente|clientes|cerrar|guardar|buscar|estado|fecha|importe)\b/i;
  const vis = e => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || x.hidden) return false; } return e.getClientRects ? e.getClientRects().length > 0 : true; };
  const vistos = new Set();
  const sale = [];
  const apunta = (t, donde) => { t = (t || '').replace(/\s+/g, ' ').trim(); if (!t || t.length < 2 || !ES.test(t) || vistos.has(donde + t)) return; vistos.add(donde + t); sale.push({ t, donde }); };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement && !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|CODE)$/.test(n.parentElement.tagName)) ? 1 : 2 });
  for (let n; (n = w.nextNode());) if (vis(n.parentElement)) apunta(n.nodeValue, 'texto');
  for (const e of document.querySelectorAll('[placeholder],[title],[aria-label]')) {
    if (!vis(e) && e.tagName !== 'SELECT') continue;
    for (const a of ['placeholder', 'title', 'aria-label']) if (e.hasAttribute(a)) apunta(e.getAttribute(a), a);
  }
  return { lang: document.documentElement.lang, fallos: window.LW_T_MISSES ? [...window.LW_T_MISSES] : null, sale };
};
(async () => {
  if (!fs.existsSync(path.join(RAIZ, 'home', 'index.html'))) { console.log('NO SE HA PODIDO MIRAR: falta home/index.html en ' + RAIZ); process.exit(2); }
  let exe = process.env.CHROMIUM_EXE;
  // el navegador lo dice tools/navegador.cjs de la agencia (AXW_AGENCIA_RAIZ en una copia fuera de su árbol; si no, la del clon de AxisWorks)
  try { if (!exe) exe = require(path.join(process.env.AXW_AGENCIA_RAIZ || path.join(__dirname, '..', '..', '..', '..', '..'), 'tools', 'navegador.cjs')).usa(); } catch (e) { /* sin la agencia: el de Playwright */ }
  const nav = await chromium.launch({ executablePath: exe && fs.existsSync(exe) ? exe : undefined });
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*', async route => {
    const url = route.request().url();
    if (/supabase-js/.test(url)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: FALSO });
    if (/fonts\.(googleapis|gstatic)\.com|@phosphor-icons/.test(url)) return route.continue();
    if (!url.startsWith(ORIGEN)) return route.abort();
    const f = fichero(url);
    if (!f) return route.fulfill({ status: 404, body: '' });
    let body = fs.readFileSync(f);
    if (f.endsWith('.html')) body = body.toString('utf8').replace(/ integrity="[^"]*"/g, '');
    return route.fulfill({ status: 200, contentType: TIPOS[path.extname(f)] || 'application/octet-stream', body });
  });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  const informe = {};
  let total = 0;
  for (const lengua of ['en', 'id']) {
    await p.goto(ORIGEN + '/home/', { waitUntil: 'load' });
    await p.evaluate(l => window.lwSetIdioma(l), lengua);
    for (const pant of PANTALLAS) {
      if (!fs.existsSync(path.join(RAIZ, pant, 'index.html'))) { console.log('--     ' + lengua + ' /' + pant + '/: no está en el paquete'); continue; }
      await p.goto(ORIGEN + '/' + pant + '/', { waitUntil: 'load' });
      await p.waitForTimeout(2500);
      const r = await p.evaluate(MIRA);
      const quedan = r.sale.filter(x => !EXCEPCIONES.some(([rx]) => rx.test(x.t)));
      const fallos = (r.fallos || []).filter(t => !EXCEPCIONES.some(([rx]) => rx.test(t)));
      informe[lengua + ' /' + pant + '/'] = { lang: r.lang, sin_traducir: fallos, en_espanol: quedan };
      const n = quedan.length + fallos.length;
      total += n;
      console.log((n ? 'FALLA  ' : 'ok     ') + lengua + ' /' + pant + '/: ' + quedan.length + ' en español a la vista, ' + fallos.length + ' sin traducir (LW_T_MISSES)'
        + (n ? ' → ' + quedan.slice(0, 4).map(x => x.donde + ':' + x.t.slice(0, 60)).concat(fallos.slice(0, 3).map(t => 'lwT:' + t.slice(0, 50))).join(' | ') : ''));
    }
    // el paginador con 60 filas: con la base vacía ninguna pantalla lo enseña
    await p.goto(ORIGEN + '/gastos/', { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    const pag = await p.evaluate(() => {
      if (typeof lwPaginador !== 'function') return null;
      const caja = document.createElement('div'); caja.id = 'prueba-pag'; document.body.appendChild(caja);
      const P = lwPaginador('#prueba-pag'); P.pagina(Array.from({ length: 60 }, (_, i) => i));
      const pie = caja.nextElementSibling; return pie ? pie.textContent.replace(/\s+/g, ' ').trim() : null;
    });
    const pagMal = pag === null || /Anteriores|Siguientes| de /.test(pag);
    total += pagMal ? 1 : 0;
    console.log((pagMal ? 'FALLA  ' : 'ok     ') + lengua + ' paginador: «' + pag + '»');
    informe[lengua + ' paginador'] = pag;
  }
  if (INFORME) fs.writeFileSync(INFORME, JSON.stringify(informe, null, 1));
  console.log(errores.length ? 'errores de página (no cuentan aquí): ' + errores.slice(0, 3).join(' | ') : '0 errores de página');
  await nav.close();
  console.log(total ? `\n${total} textos en español en una instancia que no es española` : '\nTODO BIEN: nada en español');
  process.exit(total ? 1 : 0);
})().catch(e => { console.log('NO SE HA PODIDO MIRAR: ' + e.message); process.exit(2); });
