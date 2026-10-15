// node pruebas/rutas_idioma_dom.cjs <ayudante con idioma de build 'en'> <ayudante con idioma de build 'es'>
// Lo lanza test_rutas_idioma.py con el ayudante TAL COMO LO ESCRIBE build.py (rutas_idioma_script: sin comentarios, con los mapas de verdad). Prueba
// (No es un .test.js a propósito: tools/test.py los corre sin argumentos.)
// rutas_idioma.js en un DOM mínimo hecho a mano (sin jsdom): ruta interna/visible, consulta y hash, la canónica al cargar (con search, hash y
// state), el envoltorio de history, el oyente de hashchange y el traductor de enlaces (absolutos, de raíz, relativos, con dominio, idempotente y sin
// tocar href="#"). Sale con 1 si algo falla: test_rutas_idioma.py lo usa también con el ayudante MUTILADO (sin traductor, sin canónica) y exige rojo.
'use strict';
const fs = require('fs');
const vm = require('vm');
const [EN_JS, ES_JS] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const ORIGEN = 'https://erp.prueba.test';
let fallos = 0, total = 0;
const ok = (c, m, extra) => { total++; if (!c) { fallos++; console.log('FALLA  ' + m + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); } };

function mundo(js, { ruta = '/home/', almacen = {}, enlaces = [], state = null } = {}) {
  const u0 = new URL(ruta, ORIGEN);
  const loc = { pathname: u0.pathname, search: u0.search, hash: u0.hash, origin: ORIGEN, protocol: 'https:' };
  Object.defineProperty(loc, 'href', { get: () => ORIGEN + loc.pathname + loc.search + loc.hash, enumerable: true });
  const pon = (url) => { const u = new URL(url, loc.href); loc.pathname = u.pathname; loc.search = u.search; loc.hash = u.hash; };
  const historial = [];
  const history = {
    state,
    pushState(st, _t, url) { if (url !== undefined && url !== null) { if (new URL(String(url), loc.href).origin !== ORIGEN) throw new Error('SecurityError'); pon(String(url)); } this.state = st; historial.push(['push', loc.pathname + loc.search + loc.hash, st]); },
    replaceState(st, _t, url) { if (url !== undefined && url !== null) { if (new URL(String(url), loc.href).origin !== ORIGEN) throw new Error('SecurityError'); pon(String(url)); } this.state = st; historial.push(['replace', loc.pathname + loc.search + loc.hash, st]); },
  };
  const cola = [];
  let obs = null;
  const el = (tag, href) => {
    const e = { tag, attrs: {}, escrituras: 0,
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      setAttribute(k, v) { this.attrs[k] = String(v); if (this.vivo) { this.escrituras++; cola.push({ type: 'attributes', target: this, addedNodes: [] }); } },
      matches(sel) { return sel === 'a[href],area[href]' && (this.tag === 'a' || this.tag === 'area') && this.getAttribute('href') !== null; },
      querySelectorAll() { return []; }, nodeType: 1 };
    if (href !== undefined) e.attrs.href = href;
    return e;
  };
  const doc = { nodos: [], oyentes: {} };
  doc.documentElement = { nodeType: 1, matches: () => false, querySelectorAll: () => doc.nodos.filter((n) => n.matches('a[href],area[href]')) };
  doc.addEventListener = (t, f) => { (doc.oyentes[t] = doc.oyentes[t] || []).push(f); };
  const win = { oyentes: {} };
  const ctx = {
    location: loc, history, document: doc, URL, console,
    localStorage: { getItem: (k) => (Object.prototype.hasOwnProperty.call(almacen, k) ? almacen[k] : null) },
    MutationObserver: class { constructor(f) { obs = f; } observe() {} },
    addEventListener: (t, f) => { (win.oyentes[t] = win.oyentes[t] || []).push(f); },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  // enlaces que ya estaban en el documento ANTES del ayudante no existen (va el primero del <head>): se añaden después, como el parser
  vm.runInContext(js, ctx);
  const W = {
    ctx, loc, history, historial, doc, cola,
    pagina(lista) { const ns = lista.map((h) => { const n = el('a', h); n.vivo = true; return n; }); doc.nodos.push(...ns); cola.push({ type: 'childList', addedNodes: ns }); W.vacia(); return ns; },
    vacia() { let vueltas = 0; while (cola.length) { if (++vueltas > 50) throw new Error('el traductor no para (bucle)'); const lote = cola.splice(0); if (obs) obs(lote); } },
    carga() { (doc.oyentes.DOMContentLoaded || []).forEach((f) => f()); W.vacia(); },
    hashchange(h) { loc.hash = h; (win.oyentes.hashchange || []).forEach((f) => f()); },
  };
  if (enlaces.length) W.pagina(enlaces);
  return W;
}

// 1. Inglés (bbm: idioma de pantalla del build 'en', sin dato guardado)
{
  const W = mundo(EN_JS, { ruta: '/workshop/' });
  const c = W.ctx;
  const casos = [
    ['/workshop/x/?y=1#z', '/taller/x/?y=1#z'], ['/taller/', '/taller/'], ['/home/', '/home/'], ['/settings/setup/', '/ajustes/configurar/'],
    ['/settings/configurar/', '/ajustes/configurar/'], ['/settings/setup', '/ajustes/configurar'], ['/settings/', '/ajustes/'], ['/settings', '/ajustes'],
    ['/settingsx/', '/settingsx/'], ['/clasico/facturas/', '/clasico/facturas/'], ['workshop/', 'workshop/'], ['/', '/'], ['/bookings/', '/reservas-producto/'],
    ['/payment-schedule/', '/vencimientos/'], ['/settings/setup/x/y', '/ajustes/configurar/x/y'], ['/fleet/index.html', '/flota/index.html'],
  ];
  for (const [vis, int] of casos) ok(c.axwRutaInterna(vis) === int, 'interna ' + vis, c.axwRutaInterna(vis));
  const vis = [['/taller/', '/workshop/'], ['/workshop/', '/workshop/'], ['/ajustes/configurar/?modulo=x', '/settings/setup/?modulo=x'], ['/ajustes/', '/settings/'],
    ['/home/', '/home/'], ['/clasico/leads/', '/clasico/leads/'], ['/crea-contrasena/', '/create-password/'], ['/reservas/', '/reservations/'], ['/ajustes', '/settings']];
  for (const [i, v] of vis) ok(c.axwRutaVisible(i) === v, 'visible ' + i, c.axwRutaVisible(i));
  ok(JSON.stringify(c.axwRutaAlias('/facturas/')) === '["/facturas/","/invoices/"]' && JSON.stringify(c.axwRutaAlias('/home/')) === '["/home/"]', 'alias para las hojas', [c.axwRutaAlias('/facturas/'), c.axwRutaAlias('/home/')]);
  const busca = [['?sin_permiso=taller', '?no_access=workshop'], ['?sin_permiso=Panel%20de%20control', '?no_access=Panel%20de%20control'],
    ['?a=1+2&sin_permiso=gastos&b=%41', '?a=1+2&no_access=expenses&b=%41'], ['?next=%2Ftaller%2F%3Fid%3D3', '?next=%2Fworkshop%2F%3Fid%3D3'], ['?id=1', '?id=1'], ['', ''], ['?', '?'],
    ['?no_access=workshop', '?no_access=workshop'], ['?sin_permiso=crm', '?no_access=crm'],
    ['?sin_permiso=facturas%2Coperaciones%2Creservas-producto', '?no_access=invoices%2Cdeals%2Cbookings']];
  for (const [i, v] of busca) ok(c.axwBuscaVisible(i) === v, 'busca visible ' + i, c.axwBuscaVisible(i));
  const buscaI = [['?no_access=workshop', '?sin_permiso=taller'], ['?sin_permiso=taller', '?sin_permiso=taller'], ['?next=%2Fworkshop%2F', '?next=%2Ftaller%2F'],
    ['?a=1+2&no_access=expenses&b=%41', '?a=1+2&sin_permiso=gastos&b=%41'], ['?no_access=%E0%A4', '?no_access=%E0%A4'],
    ['?no_access=invoices%2Cdeals%2Cbookings', '?sin_permiso=facturas%2Coperaciones%2Creservas-producto']];
  for (const [i, v] of buscaI) ok(c.axwBuscaInterna(i) === v, 'busca interna ' + i, c.axwBuscaInterna(i));
  ok(c.axwHashInterno('#companies', '/settings/') === '#sociedades' && c.axwHashInterno('#sociedades', '/ajustes/') === '#sociedades', 'hash interno en Ajustes');
  ok(c.axwHashVisible('#sociedades', '/ajustes/') === '#companies' && c.axwHashVisible('#puesta', '/settings/') === '#setup', 'hash visible en Ajustes');
  ok(c.axwHashInterno('#m=1&p=moto') === '#m=1&p=moto' && c.axwHashVisible('#sociedades') === '#sociedades', 'hash de otra pantalla (taller): tal cual');
  ok(c.axwHashInterno('') === '' && c.axwHashInterno('#') === '#', 'hash vacío tal cual');
  ok(c.axwIdiomaRutas === 'en', 'idioma de rutas en', c.axwIdiomaRutas);
}

// 2. Canónica al cargar: ruta, consulta, hash y state; una vez, sin pedir nada
{
  let W = mundo(EN_JS, { ruta: '/taller/?sin_permiso=x&q=a%20b#m=1', state: { tl: 1 } });
  ok(W.loc.pathname + W.loc.search + W.loc.hash === '/workshop/?no_access=x&q=a%20b#m=1', 'canónica: /taller/ → /workshop/ con su consulta y su hash', W.loc.pathname + W.loc.search + W.loc.hash);
  ok(W.historial.length === 1 && W.historial[0][0] === 'replace' && W.history.state && W.history.state.tl === 1, 'canónica: un replaceState que conserva el state', W.historial);
  W = mundo(EN_JS, { ruta: '/ajustes/#sociedades' });
  ok(W.loc.pathname + W.loc.hash === '/settings/#companies', 'canónica: /ajustes/#sociedades → /settings/#companies', W.loc.pathname + W.loc.hash);
  W = mundo(EN_JS, { ruta: '/ajustes/configurar/?modulo=taller&paso=x' });
  ok(W.loc.pathname + W.loc.search === '/settings/setup/?modulo=taller&paso=x', 'canónica: /ajustes/configurar/ → /settings/setup/ (el valor de modulo no es ruta: tal cual)', W.loc.pathname + W.loc.search);
  W = mundo(EN_JS, { ruta: '/workshop/' });
  ok(W.historial.length === 0, 'canónica: ya en inglés, ni un replaceState', W.historial);
  W = mundo(EN_JS, { ruta: '/?next=%2Ftaller%2F' });
  ok(W.loc.search === '?next=%2Fworkshop%2F', 'canónica: ?next= lleva la ruta visible', W.loc.search);
}

// 3. history: las pantallas arman la URL con la ruta interna y sale la visible; lo de otro origen o sin URL, intacto
{
  const W = mundo(EN_JS, { ruta: '/workshop/' });
  W.history.replaceState(null, '', '/taller/?id=1');
  ok(W.loc.pathname + W.loc.search === '/workshop/?id=1', 'replaceState interno → visible', W.loc.pathname + W.loc.search);
  W.history.pushState({ a: 1 }, '', new URL(ORIGEN + '/facturas/?id=2'));
  ok(W.loc.pathname + W.loc.search === '/invoices/?id=2' && W.history.state.a === 1, 'pushState con un objeto URL', W.loc.pathname);
  W.history.pushState({ b: 1 }, '');
  ok(W.loc.pathname === '/invoices/' && W.history.state.b === 1, 'pushState sin URL: no cambia la ruta');
  W.history.replaceState(null, '', '#sociedades');
  ok(W.loc.hash === '#sociedades', 'un #fragmento en una pantalla sin mapa de hashes: tal cual', W.loc.hash);
  let error = null;
  try { W.history.pushState(null, '', 'https://otro.test/taller/'); } catch (e) { error = e.message; }
  ok(error === 'SecurityError', 'otro origen: llega TAL CUAL al pushState real (que lo rechaza)', error);
}

// 4. hashchange: una escritura de hash (location.hash = 'sociedades') queda visible sin navegar
{
  const W = mundo(EN_JS, { ruta: '/settings/' });
  W.hashchange('#sociedades');
  ok(W.loc.hash === '#companies' && W.historial.length === 1 && W.historial[0][0] === 'replace', 'hashchange: #sociedades → #companies con replaceState', [W.loc.hash, W.historial]);
  W.hashchange('#companies');
  ok(W.historial.length === 1, 'hashchange ya visible: nada');
  ok(W.ctx.axwHashInterno(W.loc.hash) === '#sociedades', 'la pantalla lee la pestaña interna');
}

// 5. Traductor de enlaces: misma forma, idempotente, href="#" intacto
{
  const W = mundo(EN_JS, { ruta: '/workshop/' });
  const pares = [
    ['/taller/', '/workshop/'], [ORIGEN + '/facturas/?id=1', ORIGEN + '/invoices/?id=1'], ['//erp.prueba.test/facturas/', '//erp.prueba.test/invoices/'],
    ['../facturas/', '../invoices/'], ['../ajustes/#sociedades', '../settings/#companies'], ['#', '#'], ['mailto:x@y.z', 'mailto:x@y.z'],
    ['https://otro.test/taller/', 'https://otro.test/taller/'], ['/clasico/facturas/', '/clasico/facturas/'], ['/assets/x.js', '/assets/x.js'],
    ['/reservas-producto/?id=9', '/bookings/?id=9'], ['/ajustes/configurar/?modulo=x', '/settings/setup/?modulo=x'], ['/?sin_permiso=gastos', '/?no_access=expenses'],
    ['../../ajustes/configurar/', '../../settings/setup/'], ['otra/', 'otra/'], ['/invoices/', '/invoices/'], ['javascript:void 0', 'javascript:void 0'],
    ['../home/', '../home/'], ['/taller', '/workshop'],
  ];
  const ns = W.pagina(pares.map((p) => p[0]));
  pares.forEach(([de, a], i) => ok(ns[i].getAttribute('href') === a, 'enlace ' + de + ' → ' + a, ns[i].getAttribute('href')));
  const escritas = ns.reduce((s, n) => s + n.escrituras, 0);
  W.carga();
  ok(ns.reduce((s, n) => s + n.escrituras, 0) === escritas, 'idempotente: el barrido de DOMContentLoaded no reescribe nada', ns.map((n) => n.escrituras));
  ok(ns.filter((n) => n.getAttribute('href') === '#').length === 1, 'href="#" sigue siendo uno');
  // dinámico: entra un enlace nuevo (innerHTML) y cambia el href de otro (nav.js recablea)
  const [nuevo] = W.pagina(['/compradores/']);
  ok(nuevo.getAttribute('href') === '/clients/', 'enlace añadido después → traducido', nuevo.getAttribute('href'));
  ns[5].setAttribute('href', '/flota/'); W.vacia();
  ok(ns[5].getAttribute('href') === '/fleet/', 'href cambiado por código → traducido', ns[5].getAttribute('href'));
  // desde una página de dos tramos (/settings/setup/), un relativo de un nivel
  const W2 = mundo(EN_JS, { ruta: '/settings/setup/' });
  const [r1, r2] = W2.pagina(['../../taller/', '../']);
  ok(r1.getAttribute('href') === '../../workshop/' && r2.getAttribute('href') === '../', 'relativos desde /settings/setup/', [r1.getAttribute('href'), r2.getAttribute('href')]);
  // en la Home, el enlace de Ajustes con pestaña
  const W3 = mundo(EN_JS, { ruta: '/home/' });
  const [h1, h2] = W3.pagina(['/ajustes/#cobros', '#arriba']);
  ok(h1.getAttribute('href') === '/settings/#payments' && h2.getAttribute('href') === '#arriba', 'desde /home/: /ajustes/#cobros → /settings/#payments; un #fragmento de la Home tal cual', [h1.getAttribute('href'), h2.getAttribute('href')]);
  // en Ajustes, un #fragmento de la propia página
  const W4 = mundo(EN_JS, { ruta: '/settings/' });
  const [f1] = W4.pagina(['#sociedades']);
  ok(f1.getAttribute('href') === '#companies', 'en Ajustes: #sociedades → #companies', f1.getAttribute('href'));
}

// 6. Español: el idioma de pantalla guardado de la base manda; todo vuelve a la clave (en los dos sentidos)
{
  const W = mundo(EN_JS, { ruta: '/workshop/?no_access=workshop#x', almacen: { axw_idioma_pantalla_erp: 'es' } });
  ok(W.loc.pathname + W.loc.search === '/taller/?sin_permiso=taller', 'es: la canónica vuelve /workshop/ → /taller/ y no_access → sin_permiso', W.loc.pathname + W.loc.search);
  const [a1, a2] = W.pagina(['/invoices/', '/ajustes/']);
  ok(a1.getAttribute('href') === '/facturas/' && a2.getAttribute('href') === '/ajustes/', 'es: enlaces en español', [a1.getAttribute('href'), a2.getAttribute('href')]);
  ok(W.ctx.axwIdiomaRutas === 'es', 'es: idioma de rutas es');
  const W2 = mundo(ES_JS, { ruta: '/taller/' });
  ok(W2.loc.pathname === '/taller/' && W2.historial.length === 0, 'build es sin dato: rutas en español, sin tocar la barra');
  const W3 = mundo(ES_JS, { ruta: '/taller/', almacen: { axw_idioma_pantalla_erp: 'id' } });
  ok(W3.loc.pathname === '/workshop/', 'build es con pantalla id en la base: rutas en inglés', W3.loc.pathname);
  const W4 = mundo(EN_JS, { ruta: '/taller/', almacen: { axw_idioma_ui: 'es' } });
  ok(W4.loc.pathname === '/workshop/', 'axw_idioma_ui (el del usuario) NO decide las rutas', W4.loc.pathname);
}

console.log(fallos ? `\n${fallos} de ${total} FALLAN` : `OK rutas_idioma: ${total}/${total}`);
process.exit(fallos ? 1 : 0);
