// node comercial/demo-erp/pruebas/idiomas_pantallas.harness.cjs <raíz del paquete YA CONSTRUIDO con build.py --instancia (con idiomas id+en)> [informe.json]
// Barrido de español en una instancia que NO es española (bbm-cola-2 T2, 15-oct-2026; owner por agencia-c0: «la paginación sale en español» y
// «Gastos lleva textos de Lawang» en bbm en inglés). Ampliado por bbm-idiomas el mismo día tras «/ajustes/ no puede salir en español, ¿tengo
// que ir ventana a ventana avisándote?»: lo lanza el BUILD de la instancia (build.py → comprueba_pantallas_idiomas) y no solo una persona.
// Un grep del HTML no basta (Idiomas, revisión previa #353): la mitad del texto lo pinta el JS y la otra mitad lo traduce. Aquí se abre CADA
// pantalla del paquete (todas las carpetas con index.html, no una lista a mano) en Chromium, con la base simulada en memoria (supabase-js falso
// por page.route, como menu_instancia.harness.cjs), en inglés y en indonesio, con la base VACÍA y con la base CAÍDA (toda lectura da error: los
// «no se pudo cargar»), y se mira lo que queda:
//   · LW_T_MISSES: lo que pasó por lwT sin traducción (i18n.js lo apunta);
//   · texto visible, <option>, placeholder, title, aria-label y el <title> de la página con señas de español (tildes, ñ, ¿¡, palabras que solo
//     son españolas) O idéntico a una clave española del diccionario cuya traducción es otra («Ventas», «Taller», «Siguientes»: sin tilde);
//   · lo que está en el DOM pero OCULTO (ventanas, cajones, menú móvil), salvo lo apagado por módulo (data-axw-sin): sale al abrirlo;
//   · alert/confirm/prompt que salten al cargar;
//   · el paginador (lwPaginador) pintado aparte con 60 filas, que con la base vacía no saldría.
// Sale 1 si queda algo, 2 si no ha podido mirar (no es un verde). Con [informe.json] escribe todo lo encontrado por pantalla (lo usa quien arregla).
// Lo que NO ve (dicho en el informe del encargo): datos de la base (categorías, estados guardados), correos y plantillas de Auth (servidor),
// textos que solo salen tras un clic CON DATOS (el PDF lo mira documento_idiomas.harness.cjs). Desde el 15-oct (bbm-idioma-total) mira también
// la página «sin permiso» de un usuario sin herramientas (modo sinpermiso) y lo que sale al pulsar los botones con la base vacía (modo clics).
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
'use strict';
const fs = require('fs');
const path = require('path');
// navegador y playwright-core: los dice tools/navegador.cjs de la agencia (PLAYWRIGHT_CORE → node_modules → el de @playwright/mcp global). Sin
// ellos el arnés NO ha podido mirar: sale 2, que el build trata como rojo (nunca como «nada en español»).
const AGENCIA = process.env.AXW_AGENCIA_RAIZ || path.join(__dirname, '..', '..', '..', '..', '..');
let NAV;
try { NAV = require(path.join(AGENCIA, 'tools', 'navegador.cjs')); }
catch (e) { console.log('NO SE HA PODIDO MIRAR: sin tools/navegador.cjs de la agencia (AXW_AGENCIA_RAIZ): ' + e.message); process.exit(2); }
let chromium;
try { chromium = NAV.playwrightCore().chromium; }
catch (e) { console.log('NO SE HA PODIDO MIRAR: ' + e.message); process.exit(2); }
const RAIZ = path.resolve(process.argv[2] || '');
const INFORME = process.argv[3] || process.env.AXW_IDIOMAS_INFORME;   // desde el build: el informe entero aunque el build pare
const ORIGEN = 'https://erp.prueba.test';
const TIPOS = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
// Los módulos encendidos que simula la base: TODOS los de erp/modulos.json (agencia-c0, 15-oct: el paquete publica las pantallas de los módulos
// apagados para que el cliente los encienda desde Ajustes sin volver a construir, así que el día que encienda Cuentas la tiene que ver en su
// idioma). El modo «apagados» simula solo 'base', para ver el aviso de módulo no activo. ACTIVOS por entorno, solo para mirar a mano.
function todosLosModulos() {
  const f = path.join(process.env.AXW_AGENCIA_RAIZ || path.join(__dirname, '..', '..', '..', '..', '..'), 'erp', 'modulos.json');
  return Object.keys(JSON.parse(fs.readFileSync(f, 'utf8')).modulos);
}
let ACTIVOS;
try { ACTIVOS = process.env.ACTIVOS ? process.env.ACTIVOS.split(',') : todosLosModulos(); }
catch (e) { console.log('NO SE HA PODIDO MIRAR: sin erp/modulos.json de la agencia (AXW_AGENCIA_RAIZ): ' + e.message); process.exit(2); }
// sinpermiso: un usuario SIN herramientas (rol agente): cada pantalla rebota a la página «sin permiso» del hub (/?sin_permiso=<clave>), que con
// el super_admin de los otros modos no se veía nunca (bbm-idioma-total, 15-oct: su menú salía con aria-label «Herramientas» en en e id).
// clics: como vacia, y además pulsa los botones de cada pantalla de CLIC_PANTALLAS (el asistente de instalación, Ajustes y las pantallas propias
// de la instancia) y mira lo que aparece: ventanas, pasos, avisos. La base es falsa: pulsar no escribe en ninguna parte.
const MODOS = (process.env.MODOS || 'vacia,caida,apagados,sinpermiso,clics').split(',');
const CLIC_PANTALLAS = (process.env.CLIC_PANTALLAS || 'ajustes/configurar,ajustes,flota,entrega,taller,reservas-producto,productos,ventas,gastos,usuarios,recibos,facturas,whatsapp-bot-alta,cuentas,vencimientos').split(',');
const CLIC_MAX = Number(process.env.CLIC_MAX || 25);
const LENGUAS = (process.env.LENGUAS || 'en,id').split(',');
const PARALELO = Math.max(1, Number(process.env.PARALELO || 3));
// Todas las pantallas del paquete: cada carpeta con index.html (la raíz incluida). PANTALLAS por entorno solo para mirar unas pocas a mano.
function pantallasDelPaquete() {
  const out = [];
  (function anda(d, rel) {
    for (const x of fs.readdirSync(d, { withFileTypes: true })) {
      if (!x.isDirectory() || x.name.startsWith('.') || x.name === 'assets') continue;
      const r = rel ? rel + '/' + x.name : x.name;
      if (fs.existsSync(path.join(d, x.name, 'index.html'))) out.push(r);
      anda(path.join(d, x.name), r);
    }
  })(RAIZ, '');
  return [''].concat(out.sort());
}
const PANTALLAS = process.env.PANTALLAS ? process.env.PANTALLAS.split(',') : pantallasDelPaquete();
// Lo que puede salir tal cual en inglés o indonesio, con su motivo (Idiomas es dueño de esta lista)
const EXCEPCIONES = [
  [/^Bali Best Motorcycle/, 'nombre de la marca del cliente'],
  [/^(es|en|id|ES|EN|ID)$/, 'código de idioma del selector'],
  [/^Español$/, 'nombre del idioma en su propio idioma (selector: cada idioma se nombra en su lengua, W3C i18n)'],
];
const HOY = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
// supabase-js falso. modo 'caida': toda lectura que no sea la de entrar (usuarios, módulos) devuelve un error, como una base que no contesta.
// (el nombre del usuario y el mensaje de error son DATOS: van sin señas de idioma para no contarse como texto de la pantalla)
const falso = modo => `(function(){
  var CAIDA = ${JSON.stringify(modo === 'caida')};
  var ERR = { message:'test: database unavailable', code:'57014', details:null, hint:null };
  var ses = { access_token:'a', refresh_token:'r', user:{ id:'u1', email:'super@prueba.test' } };
  var tablas = { usuarios: ${modo === 'sinpermiso'
    ? "{ rol:'agente', herramientas:[], activo:true, nombre:'Test Agent', notif_visto_hasta:null, ambito:null, empresas:null, es_propietario:false }"
    : "{ rol:'super_admin', herramientas:[], activo:true, nombre:'Test Super', notif_visto_hasta:null, ambito:null, empresas:null, es_propietario:true }"} };
  var rpcs = { modulos_activos_datos: { activos: ${JSON.stringify(modo === 'apagados' ? ['base'] : ACTIVOS)} }, portada_reservas_dia_datos: { dia: ${JSON.stringify(HOY)}, entregas: [], devoluciones: [] } };
  var SIEMPRE = { usuarios:1, modulos_activos_datos:1 };
  function q(t){ var st = { single:false, then:null };
    var px = new Proxy({}, { get:function(_o,k){
      if (k==='then') return st.then || function(ok,ko){ var d = tablas[t];
        if (CAIDA && !SIEMPRE[t]) return Promise.resolve({ data:null, error:ERR, count:null, status:500 }).then(ok,ko);
        return Promise.resolve({ data: st.single ? (d||null) : (d?[d]:[]), error:null, count:0 }).then(ok,ko); };
      if (k==='maybeSingle'||k==='single') return function(){ st.single=true; return px; };
      if (k==='__pon') return function(f){ st.then=f; return px; };
      return function(){ return px; }; } });
    return px; }
  var cli = { auth:{ getSession:function(){return Promise.resolve({data:{session:ses},error:null});}, getUser:function(){return Promise.resolve({data:{user:ses.user},error:null});},
      onAuthStateChange:function(){return {data:{subscription:{unsubscribe:function(){}}}};}, signOut:function(){return Promise.resolve({error:null});} },
    from:q, rpc:function(n){ return q('__').__pon(function(ok,ko){
      if (CAIDA && !SIEMPRE[n]) return Promise.resolve({ data:null, error:ERR }).then(ok,ko);
      return Promise.resolve({ data: (n in rpcs) ? rpcs[n] : [], error:null }).then(ok,ko); }); },
    channel:function(){ var c={on:function(){return c;},subscribe:function(){return c;}}; return c; }, removeChannel:function(){},
    functions:{ invoke:function(){ return Promise.resolve(CAIDA ? { data:null, error:ERR } : { data:null, error:null }); } },
    storage:{ from:function(){ return { createSignedUrl:function(){return Promise.resolve({data:null,error:null});}, list:function(){return Promise.resolve({data:[],error:null});} }; } } };
  window.supabase = { createClient:function(){ return cli; } };
})();`;
// Rutas en el idioma de la instancia (bbm-idioma-total, 15-oct-2026): la barra pasa a /workshop/ y lo que se pida por ahí (version.js pide la propia
// página) el servidor lo sirve desde taller/ (alias_htaccess). Aquí, lo mismo, con el mapa del ayudante en línea; sin ayudante, nada que traducir.
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
// Lo que se ve (o se verá al abrir una ventana) en la página y suena a español. Corre DENTRO de la página.
const MIRA = () => {
  const ES = /[áéíóúñÁÉÍÓÚÑ¿¡]|\b(de|del|las|los|para|por|una|que|sin|con|el|y|todos|todas|nuevo|nueva|cuenta|cuentas|gasto|gastos|proyecto|proyectos|contrato|cliente|clientes|cerrar|guardar|buscar|estado|fecha|importe|ventas|recibos|taller|pagos|siguientes|anteriores|vencimientos|ajustes|usuarios|empresa|empresas|herramienta|incluida|volver|entrar|reservas|flota|entrega|inicio|ayuda|borrar|editar|cancelar|aceptar|nombre|correo|contraseña|idioma|idiomas)\b/i;
  // ¿Es una clave española del diccionario que en este idioma se dice de otra forma? lwT lo sabe; se le pregunta sin dejar rastro en LW_T_MISSES.
  const fallosAntes = window.LW_T_MISSES ? new Set(window.LW_T_MISSES) : null;
  // y en indonesio, lo que cayó al INGLÉS por faltar su clave en LW_ID (i18n_id_nucleo.js lo apunta en LW_T_CAIDA_EN). Se guarda antes de preguntar a lwT.
  const caidasAntes = window.LW_T_CAIDA_EN ? new Set(window.LW_T_CAIDA_EN) : null;
  const esClave = t => { try { return typeof window.lwT === 'function' && /[A-Za-zÀ-ÿ]/.test(t) && window.lwT(t) !== t; } catch (e) { return false; } };
  const oculto = e => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || x.hidden) return true; } return !(e.getClientRects && e.getClientRects().length > 0); };
  // Lo apagado por módulo no se enseña nunca en esta instancia (apagados_instancia.js + data-axw-sin): no cuenta
  const apagado = e => !!(e.closest && e.closest('[data-axw-sin]'));
  const vistos = new Set();
  const sale = [];
  // un trozo con su propio lang (el selector nombra cada idioma en su lengua: «Bahasa Indonesia», W3C i18n) ya está en el idioma que dice
  const otroLang = e => { const l = e && e.closest && e.closest('[lang]'); return !!(l && l !== document.documentElement); };
  const apunta = (t, donde, oc, el) => {
    t = (t || '').replace(/\s+/g, ' ').trim();
    if (!t || t.length < 2 || vistos.has(donde + t) || otroLang(el)) return;
    if (!ES.test(t) && !esClave(t)) return;
    vistos.add(donde + t); sale.push({ t, donde: oc ? 'oculto:' + donde : donde });
  };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement && !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|CODE)$/.test(n.parentElement.tagName)) ? 1 : 2 });
  for (let n; (n = w.nextNode());) {
    const e = n.parentElement;
    if (apagado(e)) continue;
    const sel = e.closest('select');   // un <option> de un <select> cerrado no tiene cajas: cuenta lo que se ve del <select>
    apunta(n.nodeValue, sel ? 'option' : 'texto', oculto(sel || e), e);
  }
  for (const e of document.querySelectorAll('[placeholder],[title],[aria-label]')) {
    if (apagado(e)) continue;
    for (const a of ['placeholder', 'title', 'aria-label']) if (e.hasAttribute(a)) apunta(e.getAttribute(a), a, oculto(e) && e.tagName !== 'SELECT', e);
  }
  apunta(document.title, 'title-pagina', false);
  if (fallosAntes) { window.LW_T_MISSES.clear(); fallosAntes.forEach(x => window.LW_T_MISSES.add(x)); }
  if (caidasAntes) { window.LW_T_CAIDA_EN.clear(); caidasAntes.forEach(x => window.LW_T_CAIDA_EN.add(x)); }
  // Una falta de lwT que ya es una traducción (un valor de LW_EN/LW_ID: «Users») o que la pantalla enseña traducida (traduce_instancia.js la
  // reconoce) no es español a la vista; lo que de verdad sale en español ya lo ha contado el recorrido de arriba.
  const valores = new Set([].concat(Object.values(window.LW_EN || {}), Object.values(window.LW_ID || {})));
  const yaVa = s => valores.has(s.trim()) || (typeof window.axwTraduceTexto === 'function' && window.axwTraduceTexto(s) !== s);
  // una caída que es una traducción india ya hecha por otra vía (axwTraduceTexto) no se ve en inglés: no cuenta
  const caidas = caidasAntes ? [...caidasAntes].filter(s => !(typeof window.axwTraduceTexto === 'function' && window.axwTraduceTexto(s) !== s)) : [];
  return { lang: document.documentElement.lang, fallos: fallosAntes ? [...fallosAntes].filter(s => !yaVa(s)) : null, caidas, sale };
};
const PIE = () => {
  if (typeof lwPaginador !== 'function') return null;
  const caja = document.createElement('div'); caja.id = 'prueba-pag'; document.body.appendChild(caja);
  const P = lwPaginador('#prueba-pag'); P.pagina(Array.from({ length: 60 }, (_, i) => i));
  const pie = caja.nextElementSibling; return pie ? pie.textContent.replace(/\s+/g, ' ').trim() : null;
};
async function contexto(nav, modo, lengua) {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  const cuerpo = falso(modo);
  await ctx.route('**/*', async route => {
    const url = route.request().url();
    if (/supabase-js/.test(url)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: cuerpo });
    if (/fonts\.(googleapis|gstatic)\.com|@phosphor-icons/.test(url)) return route.abort();   // sin red de fuera: no cambia ningún texto
    if (!url.startsWith(ORIGEN)) return route.abort();
    const f = fichero(url);
    if (!f) return route.fulfill({ status: 404, body: '' });
    let body = fs.readFileSync(f);
    if (f.endsWith('.html')) body = body.toString('utf8').replace(/ integrity="[^"]*"/g, '');
    return route.fulfill({ status: 200, contentType: TIPOS[path.extname(f)] || 'application/octet-stream', body });
  });
  // El idioma lo elige quien mira (localStorage del contexto): se fija una vez desde /home/
  const p0 = await ctx.newPage();
  await p0.goto(ORIGEN + '/home/', { waitUntil: 'load' });
  const ok = await p0.evaluate(l => { if (typeof window.lwSetIdioma !== 'function') return false; window.lwSetIdioma(l); return true; }, lengua);
  await p0.close();
  if (!ok) throw new Error('/home/ no trae lwSetIdioma: no se puede elegir el idioma');
  return ctx;
}
async function mira(ctx, pant, errores, clics) {
  const p = await ctx.newPage();
  const dialogos = [];
  p.on('dialog', d => { dialogos.push(d.message()); d.dismiss().catch(() => {}); });
  p.on('pageerror', e => errores.push('/' + pant + ': ' + e.message));
  try {
    await p.goto(ORIGEN + '/' + (pant ? pant + '/' : ''), { waitUntil: 'load' });
    await p.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => { /* MUDO A PROPOSITO: una pantalla con sondeo no queda quieta; se mira igual */ });
    await p.waitForTimeout(400);
    const r = await p.evaluate(MIRA);
    if (clics) {
      // Cada botón visible, uno a uno, por su posición en la lista del momento (la pantalla cambia al pulsar). Lo que aparece se mira con la
      // misma MIRA; si el clic navega, se vuelve. Escape cierra la ventana que haya abierto.
      const yaVisto = new Set(r.sale.map(x => x.donde + x.t));
      const SEL = 'button:not([disabled]),[role="button"],summary,[data-accion]:not(a):not(input)';
      const url0 = p.url();
      let pulsados = 0;
      for (let i = 0; i < CLIC_MAX; i++) {
        const quien = await p.evaluate(([sel, i]) => {
          const vis = [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[data-axw-sin],.lw-rail,#lwRail,nav,header'));
          const e = vis[i];
          if (!e) return null;
          e.setAttribute('data-arnes-clic', String(i));
          return (e.getAttribute('data-accion') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        }, [SEL, i]);
        if (quien === null) break;
        try { await p.click('[data-arnes-clic="' + i + '"]', { timeout: 1500 }); pulsados++; }
        catch (e) { continue; /* MUDO A PROPOSITO: un botón tapado o que se va al pulsar otro no es texto en español; se sigue con el siguiente */ }
        await p.waitForTimeout(250);
        if (p.url() !== url0) { await p.goto(url0, { waitUntil: 'load' }); await p.waitForTimeout(300); continue; }
        const r2 = await p.evaluate(MIRA);
        for (const x of r2.sale) if (!yaVisto.has(x.donde + x.t)) { yaVisto.add(x.donde + x.t); r.sale.push({ t: x.t, donde: 'tras «' + quien + '»:' + x.donde }); }
        for (const f of r2.fallos || []) if (!(r.fallos || []).includes(f)) (r.fallos = r.fallos || []).push(f);
        await p.keyboard.press('Escape').catch(() => { /* MUDO A PROPOSITO: sin ventana abierta, Escape no hace nada */ });
      }
      r.pulsados = pulsados;
    }
    for (const m of dialogos) r.sale.push({ t: m, donde: 'dialogo' });
    return r;
  } finally { await p.close(); }
}
(async () => {
  if (!fs.existsSync(path.join(RAIZ, 'home', 'index.html'))) { console.log('NO SE HA PODIDO MIRAR: falta home/index.html en ' + RAIZ); process.exit(2); }
  let exe = process.env.CHROMIUM_EXE;
  try { if (!exe) exe = NAV.usa(); } catch (e) { /* MUDO A PROPOSITO: sin navegador del sistema, el Chromium de Playwright; si tampoco está, launch lo dice y sale 2 */ }
  const nav = await chromium.launch({ executablePath: exe && fs.existsSync(exe) ? exe : undefined });
  const informe = {};
  const errores = [];
  let total = 0, miradas = 0;
  const t0 = Date.now();
  for (const lengua of LENGUAS) for (const modo of MODOS) {
    const ctx = await contexto(nav, modo, lengua);
    const estas = modo === 'clics' ? PANTALLAS.filter(x => CLIC_PANTALLAS.includes(x)) : PANTALLAS;
    if (modo === 'clics' && !estas.length) { console.log('NO SE HA PODIDO MIRAR: ninguna de CLIC_PANTALLAS está en el paquete'); process.exit(2); }
    const cola = estas.slice();
    const res = {};
    await Promise.all(Array.from({ length: PARALELO }, async () => {
      for (let pant; (pant = cola.shift()) !== undefined;) res[pant] = await mira(ctx, pant, errores, modo === 'clics');
    }));
    if (modo === 'clics') {
      const n = estas.reduce((a, x) => a + (res[x].pulsados || 0), 0);
      console.log(lengua + ' clics: ' + n + ' botones pulsados en ' + estas.length + ' pantallas');
      if (!n) { console.log('NO SE HA PODIDO MIRAR: el modo clics no ha pulsado ningún botón'); process.exit(2); }
    }
    for (const pant of estas) {
      const r = res[pant];
      miradas++;
      const quedan = r.sale.filter(x => !EXCEPCIONES.some(([rx]) => rx.test(x.t)));
      const fallos = (r.fallos || []).filter(t => !EXCEPCIONES.some(([rx]) => rx.test(t)));
      // En indonesio, caer al inglés tampoco vale (verificador de deploy-axw, 15-oct-2026: «Nuevo gasto» y 91 frases de Gastos en inglés dentro de
      // la interfaz en indonesio). Antes se toleraba «mientras se traduce el resto»; desde hoy es rojo como el español.
      const caidas = lengua === 'id' ? (r.caidas || []).filter(t => !EXCEPCIONES.some(([rx]) => rx.test(t))) : [];
      const clave = lengua + ' ' + modo + ' /' + (pant ? pant + '/' : '');
      informe[clave] = { lang: r.lang, sin_traducir: fallos, en_espanol: quedan, en_ingles: caidas, pulsados: r.pulsados };
      const n = quedan.length + fallos.length + caidas.length;
      total += n;
      if (n || process.env.VERBOSO) console.log((n ? 'FALLA  ' : 'ok     ') + clave + ': ' + quedan.length + ' en español, ' + fallos.length + ' sin traducir (LW_T_MISSES)'
        + (lengua === 'id' ? ', ' + caidas.length + ' en inglés (LW_T_CAIDA_EN)' : '')
        + (n ? ' → ' + quedan.slice(0, 4).map(x => x.donde + ':' + x.t.slice(0, 60)).concat(fallos.slice(0, 3).map(t => 'lwT:' + t.slice(0, 50)))
          .concat(caidas.slice(0, 3).map(t => 'en:' + t.slice(0, 50))).join(' | ') : ''));
    }
    if (modo === MODOS[0]) {
      // el paginador con 60 filas: con la base vacía ninguna pantalla lo enseña
      const p = await ctx.newPage();
      await p.goto(ORIGEN + '/gastos/', { waitUntil: 'load' });
      await p.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => { /* MUDO A PROPOSITO: igual que arriba */ });
      const pag = await p.evaluate(PIE);
      await p.close();
      const pagMal = pag === null || /Anteriores|Siguientes| de /.test(pag);
      total += pagMal ? 1 : 0;
      console.log((pagMal ? 'FALLA  ' : 'ok     ') + lengua + ' paginador: «' + pag + '»');
      informe[lengua + ' paginador'] = pag;
    }
    await ctx.close();
  }
  if (INFORME) fs.writeFileSync(INFORME, JSON.stringify(informe, null, 1));
  console.log(errores.length ? 'errores de página (no cuentan aquí): ' + errores.length + ' · ' + errores.slice(0, 3).join(' | ') : '0 errores de página');
  await nav.close();
  console.log(`${miradas} vistas (${PANTALLAS.length} pantallas × ${LENGUAS.join('+')} × ${MODOS.join('+')}) en ${Math.round((Date.now() - t0) / 1000)} s`);
  console.log(total ? `\n${total} textos en español en una instancia que no es española` : '\nTODO BIEN: nada en español');
  process.exit(total ? 1 : 0);
})().catch(e => { console.log('NO SE HA PODIDO MIRAR: ' + e.message); process.exit(2); });
