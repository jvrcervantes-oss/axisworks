// node comercial/demo-erp/pruebas/crea_contrasena.harness.cjs <ruta de la página YA CONSTRUIDA> <ruta de contracts/assets de Lawang>
// Harness de la pantalla «Crea tu contraseña» del maestro (pieza C de I6, 9-oct-2026): la página REAL que deja build.crea_contrasena_pantalla() (la lanza
// test_crea_contrasena.py, que la construye en una carpeta temporal) en Chromium, con Auth SIMULADO (supabase-js falso servido por page.route: ninguna
// petición sale a la red) y con el i18n.js / idioma.js / instancia de la suite REALES. Mide el COMPORTAMIENTO: qué canjea según la forma del enlace, que el
// token desaparece de la URL, qué pasa con enlaces malos, contraseñas malas, éxito, XSS por datos de la sesión, y que no se toca ninguna tabla.
// Lo que NO prueba: que GoTrue mande el token en hash o en query con la plantilla actual, ni la caducidad real del enlace (necesita una invitación real).
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const PAGINA = fs.readFileSync(process.argv[2], 'utf8');
const SUITE = process.argv[3];
let fallos = 0, total = 0;
const ok = (nombre, c, extra = '') => { total++; if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + nombre); };

const ORIGEN = 'https://erp.prueba.test';
const TOKEN_ACC = 'eyJTOKENACCESOSECRETO.abc.def', TOKEN_REF = 'REFRESCOSECRETO123', TOKEN_HASH = 'pkce_HASHSECRETO456';
const XSS_EMAIL = `"><img src=x onerror="window.__xss=1">'<svg onload=window.__xss=2>@x.test`;

// supabase-js falso: registra cada llamada en window.__auth y se comporta según window.__cfg
const SUPABASE_FALSO = `(function(){
  var cfg = function(){ return window.__cfg || {}; };
  window.__auth = []; window.__creado = null; window.__from = 0;
  var sesion = function(){ return { access_token:'a', refresh_token:'r', user:{ id:'u1', email: cfg().email || 'ana@cliente.test' } }; };
  var res = function(nombre, malo){ return new Promise(function(ok){ setTimeout(function(){
    if (malo) return ok({ data:{ user:null, session:null }, error: malo });
    var s = sesion(); ok({ data:{ user:s.user, session:s }, error:null }); }, cfg().lento || 0); }); };
  window.supabase = { createClient: function(url, key, opts){
    window.__creado = { url:url, key:key, opts:opts };
    return {
      from: function(){ window.__from++; throw new Error('from() no debería llamarse'); },
      rpc: function(){ window.__from++; throw new Error('rpc() no debería llamarse'); },
      auth: {
        getSession: function(){ window.__auth.push(['getSession']); return Promise.resolve({ data:{ session: sesion() }, error:null }); },
        setSession: function(a){ window.__auth.push(['setSession', a]); if (cfg().setSessionFalla) return Promise.reject(new Error('red')); return res('s', cfg().canjeError); },
        verifyOtp: function(a){ window.__auth.push(['verifyOtp', a]); if (cfg().verifyFalla) return Promise.reject(new Error('red')); return res('v', cfg().canjeError); },
        updateUser: function(a){ window.__auth.push(['updateUser', a]); return new Promise(function(ok){ setTimeout(function(){
          ok(cfg().updateError ? { data:null, error: cfg().updateError } : { data:{ user:{ id:'u1' } }, error:null }); }, cfg().lentoGuardar || 0); }); },
        signOut: function(a){ window.__auth.push(['signOut', a]); return Promise.resolve({ error:null }); }
      }
    };
  } };
})();`;

(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const html = PAGINA.replace(/ integrity="[^"]*"/, '');   // el SRI protege al supabase-js real; aquí se sirve uno falso (la presencia del SRI la mide el test de Python)

  async function abre(url, cfg = {}) {
    const ctx = await nav.newContext();
    const p = await ctx.newPage();
    const pedidas = [], consola = [], documentos = [];
    p.on('console', m => { if (m.type() !== 'verbose') consola.push(m.type() + ': ' + m.text()); });
    p.on('pageerror', e => consola.push('pageerror: ' + e.message));
    p.on('request', r => { if (r.resourceType() === 'document') documentos.push(r.url()); });
    await p.route('**/*', r => {
      const u = new URL(r.request().url());
      pedidas.push(u.origin + u.pathname);
      if (u.hostname === 'cdn.jsdelivr.net') return r.fulfill({ contentType: 'application/javascript', body: SUPABASE_FALSO });
      if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') return r.fulfill({ status: 204, body: '' });
      if (u.origin !== ORIGEN) return r.abort();
      if (u.pathname === '/crea-contrasena/') return r.fulfill({ contentType: 'text/html', body: html });
      if (u.pathname === '/contracts/assets/instancia.js') return r.fulfill({ contentType: 'application/javascript', body: "window.LW_INSTANCIA={sb_url:'https://base.prueba.test',sb_key:'sb_publishable_x',marca:'Prueba'};" });
      const f = path.join(SUITE, u.pathname.replace('/contracts/assets/', ''));
      if (u.pathname.startsWith('/contracts/assets/') && fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ contentType: u.pathname.endsWith('.png') ? 'image/png' : 'application/javascript', body: fs.readFileSync(f) });
      if (u.pathname === '/favicon.png' || u.pathname.startsWith('/contracts/assets/brand/')) return r.fulfill({ status: 204, body: '' });
      return r.fulfill({ status: 404, body: 'no' });
    });
    await p.addInitScript(c => { window.__cfg = c; }, cfg);
    await p.goto(ORIGEN + url, { waitUntil: 'load' });
    await p.waitForTimeout(150);
    return { p, ctx, pedidas, consola, navegaciones: documentos };
  }
  const q = (p, n) => p.$('[data-cp="' + n + '"]');
  const visible = async (p, n) => (await q(p, n)).isVisible();
  const texto = async (p, n) => (await q(p, n)).innerText();
  const llamadas = p => p.evaluate(() => window.__auth);
  const nombres = async p => (await llamadas(p)).map(x => x[0]);
  const sinRastro = async (c, secretos) => {   // el token no está ni en la URL, ni en el DOM, ni en la consola, ni en el historial visible
    const url = c.p.url(), dom = await c.p.evaluate(() => document.documentElement.outerHTML + '|' + document.title);
    return secretos.every(s => !url.includes(s) && !dom.includes(s) && !c.consola.join('\n').includes(s));
  };
  const rellena = async (p, a, b) => { await p.fill('[data-cp="p1"]', a); await p.fill('[data-cp="p2"]', b); };
  const envia = p => p.click('[data-accion="guardar"]');

  // ── 1. Invitación por hash (flujo implícito) ──────────────────────────────────────────────
  let c = await abre(`/crea-contrasena/#access_token=${TOKEN_ACC}&refresh_token=${TOKEN_REF}&expires_in=3600&token_type=bearer&type=invite`);
  let ll = await llamadas(c.p);
  ok('hash: canjea con setSession(access_token, refresh_token) y nada más', ll.length === 1 && ll[0][0] === 'setSession' && ll[0][1].access_token === TOKEN_ACC && ll[0][1].refresh_token === TOKEN_REF);
  ok('hash: sale el formulario y el correo de la sesión en el texto', await visible(c.p, 'form') && (await texto(c.p, 'intro')).includes('ana@cliente.test'));
  ok('hash: la URL queda limpia (sin hash ni query) y sin recarga', c.p.url() === ORIGEN + '/crea-contrasena/' && c.navegaciones.length === 1);
  ok('hash: el token no está en la URL, el DOM, el título ni la consola', await sinRastro(c, [TOKEN_ACC, TOKEN_REF]));
  ok('hash: ninguna petición lleva el token y no hay llamadas a /rest ni a otro origen', c.pedidas.every(u => !u.includes('rest/v1') && !u.includes(TOKEN_ACC)) && c.pedidas.every(u => /erp\.prueba\.test|cdn\.jsdelivr\.net|fonts\./.test(u)));
  ok('cliente de Auth sin persistencia ni detección en URL ni refresco automático', await c.p.evaluate(() => { const o = window.__creado.opts.auth; return o.persistSession === false && o.detectSessionInUrl === false && o.autoRefreshToken === false; }));
  ok('cliente apunta a la base de la ficha de la instancia', await c.p.evaluate(() => window.__creado.url === 'https://base.prueba.test' && window.__creado.key === 'sb_publishable_x'));
  ok('sin consola: ni log, ni aviso, ni error', c.consola.length === 0, c.consola.join(' | '));
  ok('Referrer-Policy no-referrer en la página', await c.p.evaluate(() => document.querySelector('meta[name=referrer]').content === 'no-referrer'));
  ok('el formulario no se envía solo a una URL (method post, action #) y los campos son new-password', await c.p.evaluate(() => { const f = document.querySelector('[data-cp=form]'); return f.method === 'post' && f.getAttribute('action') === '#' && [...f.querySelectorAll('input[type=password]')].length === 2 && [...f.querySelectorAll('input[type=password]')].every(i => i.autocomplete === 'new-password') && [...f.querySelectorAll('input')].every(i => i.type === 'password' || (i.name === 'username' && i.readOnly)); }));
  // 2. Validaciones sin llamar a Auth
  await rellena(c.p, 'corta', 'corta'); await envia(c.p);
  ok('contraseña corta: avisa y NO llama a updateUser', (await texto(c.p, 'msg')).includes('10 caracteres') && !(await nombres(c.p)).includes('updateUser'));
  await rellena(c.p, 'una-contrasena-larga-1', 'una-contrasena-larga-2'); await envia(c.p);
  ok('no coinciden: avisa y NO llama a updateUser', (await texto(c.p, 'msg')).includes('no coinciden') && !(await nombres(c.p)).includes('updateUser'));
  await rellena(c.p, '', ''); await envia(c.p);
  ok('contraseña vacía: avisa y NO llama a updateUser (ninguna de las tres validaciones llegó a Auth)', (await texto(c.p, 'msg')).includes('10 caracteres') && !(await nombres(c.p)).includes('updateUser'));
  // 3. Éxito (con doble clic: una sola llamada)
  await c.p.evaluate(() => { window.__cfg.lentoGuardar = 120; window.__auth.length = 0; });
  await rellena(c.p, 'una-contrasena-larga-1', 'una-contrasena-larga-1');
  await c.p.evaluate(() => { const b = document.querySelector('[data-accion=guardar]'); b.click(); b.click(); });
  await c.p.waitForTimeout(500);
  ll = await llamadas(c.p);
  ok('éxito: updateUser UNA vez con la contraseña exacta (el doble clic no la repite)', ll.filter(x => x[0] === 'updateUser').length === 1 && ll.find(x => x[0] === 'updateUser')[1].password === 'una-contrasena-larga-1' && Object.keys(ll.find(x => x[0] === 'updateUser')[1]).join() === 'password');
  ok('éxito: después cierra la sesión de invitación (signOut global), en ese orden', ll.map(x => x[0]).join() === 'updateUser,signOut' && ll[1][1].scope === 'global');
  ok('éxito: el formulario desaparece, los campos quedan vacíos y hay enlace al acceso normal /', !(await visible(c.p, 'form')) && await c.p.evaluate(() => { const a = document.querySelector('[data-accion=entrar]'); return a && a.getAttribute('href') === '/' && !document.querySelector('[data-cp=p1]').value && !document.querySelector('[data-cp=p2]').value; }));
  ok('éxito: la contraseña no queda en el DOM ni en la consola', await c.p.evaluate(() => !document.documentElement.outerHTML.includes('una-contrasena-larga-1')) && c.consola.length === 0);
  ok('éxito: no navega solo a ningún sitio (no entra con la sesión de invitación)', c.navegaciones.length === 1);
  ok('ninguna escritura a tablas en todo el recorrido (from/rpc = 0)', await c.p.evaluate(() => window.__from) === 0);
  // 4. Cambio de idioma sin recargar (el token ya no está en la URL: recargar lo perdería)
  await c.p.click('[data-accion=idioma]');
  ok('inglés: se repinta en sitio, sin recargar, y recuerda el idioma', c.navegaciones.length === 1 && (await texto(c.p, 'intro')).includes('Password saved') && (await c.p.evaluate(() => document.documentElement.lang)) === 'en' && (await c.p.evaluate(() => document.querySelector('h1').innerText)) === 'Create your password' && (await c.p.evaluate(() => document.querySelector('[data-accion=entrar]').innerText)) === 'Log in');
  await c.p.click('[data-accion=idioma]');
  ok('vuelve a español', (await texto(c.p, 'intro')).includes('Contraseña guardada'));
  await c.ctx.close();

  // ── 5. Invitación por token_hash (plantilla de correo) y por th ─────────────────────────────
  for (const [nombre, qs] of [['token_hash', `?token_hash=${TOKEN_HASH}&type=invite`], ['th', `?th=${TOKEN_HASH}&type=invite`]]) {
    c = await abre('/crea-contrasena/' + qs);
    ll = await llamadas(c.p);
    ok(nombre + ': canjea con verifyOtp({token_hash, type:"invite"}) y nada más', ll.length === 1 && ll[0][0] === 'verifyOtp' && ll[0][1].token_hash === TOKEN_HASH && ll[0][1].type === 'invite' && Object.keys(ll[0][1]).length === 2);
    ok(nombre + ': formulario visible, URL limpia, sin rastro del token', await visible(c.p, 'form') && c.p.url() === ORIGEN + '/crea-contrasena/' && await sinRastro(c, [TOKEN_HASH]) && c.consola.length === 0);
    await c.ctx.close();
  }

  // ── 6. Enlaces malos: mensaje claro, sin formulario, SIN reintento ───────────────────────────
  const sinReintento = async p => await p.evaluate(() => ![...document.querySelectorAll('button,a,[role=button]')].some(e => e.getAttribute('data-accion') !== 'idioma' && e.getAttribute('data-accion') !== 'guardar' && !e.closest('form')) && !document.querySelector('a[href]') );
  const malos = [
    ['caducado (verifyOtp devuelve error)', `/crea-contrasena/?token_hash=${TOKEN_HASH}&type=invite`, { canjeError: { code: 'otp_expired', message: 'Token has expired or is invalid', status: 403 } }],
    ['caducado (setSession devuelve error)', `/crea-contrasena/#access_token=${TOKEN_ACC}&refresh_token=${TOKEN_REF}&type=invite`, { canjeError: { code: 'bad_jwt', message: 'invalid JWT', status: 401 } }],
    ['error de GoTrue en el hash', '/crea-contrasena/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', {}],
    ['sin ningún token', '/crea-contrasena/', {}],
    ['tipo recovery (no es una invitación)', `/crea-contrasena/#access_token=${TOKEN_ACC}&refresh_token=${TOKEN_REF}&type=recovery`, {}],
    ['hash sin type', `/crea-contrasena/#access_token=${TOKEN_ACC}&refresh_token=${TOKEN_REF}`, {}],
    ['hash sin refresh_token', `/crea-contrasena/#access_token=${TOKEN_ACC}&type=invite`, {}],
    ['th con type recovery', `/crea-contrasena/?th=${TOKEN_HASH}&type=recovery`, {}],
    ['th sin type', `/crea-contrasena/?th=${TOKEN_HASH}`, {}],
  ];
  for (const [nombre, url, cfg] of malos) {
    c = await abre(url, cfg);
    const t = await texto(c.p, 'intro');
    ok(nombre + ': mensaje claro con «administrador», sin formulario', /administrador/.test(t) && !(await visible(c.p, 'form')));
    ok(nombre + ': sin enlace de reintento ni botones (solo el del idioma)', await sinReintento(c.p));
    const n = await nombres(c.p);
    ok(nombre + ': ' + (/recovery|sin type|sin ning/.test(nombre) || /error de GoTrue/.test(nombre) ? 'no llega a canjear nada' : 'canjea una vez y no reintenta'), n.length <= 1 && !n.includes('updateUser') && !n.includes('getSession'));
    ok(nombre + ': URL limpia y sin rastro del token', c.p.url() === ORIGEN + '/crea-contrasena/' && await sinRastro(c, [TOKEN_ACC, TOKEN_REF, TOKEN_HASH]));
    await c.ctx.close();
  }
  // red caída al canjear: mensaje propio, distinto de «caducado», tampoco reintenta
  c = await abre(`/crea-contrasena/?token_hash=${TOKEN_HASH}&type=invite`, { verifyFalla: true });
  ok('sin red al canjear: lo dice con otras palabras y no reintenta', /conexión/.test(await texto(c.p, 'intro')) && !(await visible(c.p, 'form')) && (await nombres(c.p)).length === 1);
  await c.ctx.close();

  // ── 7. Un usuario ya con sesión no puede usar la página como «cambiar contraseña» ─────────────
  c = await abre('/crea-contrasena/');
  ok('sin token no mira la sesión existente (no llama a getSession) ni enseña el formulario', !(await nombres(c.p)).includes('getSession') && !(await visible(c.p, 'form')));
  await c.p.evaluate(() => { document.querySelector('[data-cp=form]').classList.remove('cp-oculto'); });
  await rellena(c.p, 'una-contrasena-larga-1', 'una-contrasena-larga-1'); await envia(c.p);
  ok('aunque se fuerce el formulario con las herramientas del navegador, no hay updateUser sin canje', !(await nombres(c.p)).includes('updateUser'));
  await c.ctx.close();

  // ── 8. Errores de Auth al guardar ────────────────────────────────────────────────────────────
  for (const [nombre, upd, esperado, quedaForm] of [
    ['weak_password', { code: 'weak_password', message: 'Password should contain <b>x</b>', status: 422 }, /débil/, true],
    ['same_password', { code: 'same_password', message: 'New password should be different', status: 422 }, /distinta/, true],
    ['error desconocido', { message: '<img src=x onerror=window.__xss=9>', status: 500 }, /No se ha podido guardar/, true],
    ['sesión caducada al guardar (401)', { code: 'session_not_found', message: 'Auth session missing', status: 401 }, /administrador/, false]]) {
    c = await abre(`/crea-contrasena/?token_hash=${TOKEN_HASH}&type=invite`, { updateError: upd });
    await rellena(c.p, 'una-contrasena-larga-1', 'una-contrasena-larga-1'); await envia(c.p);
    await c.p.waitForTimeout(100);
    const t = (await texto(c.p, 'msg')) + ' ' + (await texto(c.p, 'intro'));
    ok('guardar → ' + nombre + ': mensaje en el idioma de la pantalla, sin eco del texto de Auth', esperado.test(t) && !t.includes('<') && !t.includes('Password should') && await c.p.evaluate(() => window.__xss === undefined));
    ok('guardar → ' + nombre + ': ' + (quedaForm ? 'el formulario sigue y el botón se reactiva (puede corregirla)' : 'se pierde el formulario y no se cierra sesión como si hubiera ido bien'),
       quedaForm ? (await visible(c.p, 'form')) && await c.p.evaluate(() => !document.querySelector('[data-accion=guardar]').disabled) : !(await visible(c.p, 'form')));
    ok('guardar → ' + nombre + ': no cierra sesión ni muestra «Entrar» como éxito', !(await nombres(c.p)).includes('signOut') && !(await c.p.$('[data-accion=entrar]')));
    await c.ctx.close();
  }

  // ── 9. XSS por los datos de la sesión (correo) ───────────────────────────────────────────────
  c = await abre(`/crea-contrasena/?token_hash=${TOKEN_HASH}&type=invite`, { email: XSS_EMAIL });
  ok('XSS: el correo con marcado se pinta como texto literal, no se ejecuta ni crea elementos', await c.p.evaluate(() => window.__xss === undefined && !document.querySelector('img[src="x"]') && !document.querySelector('svg')) && (await texto(c.p, 'intro')).includes(XSS_EMAIL));
  await c.ctx.close();

  // ── 10. Inglés desde el arranque (idioma ya elegido en la suite) ─────────────────────────────
  const ctxEn = await nav.newContext(); const pEn = await ctxEn.newPage();
  await pEn.route('**/*', async r => { const u = new URL(r.request().url()); if (u.hostname === 'cdn.jsdelivr.net') return r.fulfill({ contentType: 'application/javascript', body: SUPABASE_FALSO }); if (u.hostname.startsWith('fonts.')) return r.fulfill({ status: 204, body: '' }); if (u.origin !== ORIGEN) return r.abort(); if (u.pathname === '/crea-contrasena/') return r.fulfill({ contentType: 'text/html', body: html }); if (u.pathname === '/contracts/assets/instancia.js') return r.fulfill({ contentType: 'application/javascript', body: "window.LW_INSTANCIA={sb_url:'https://b.test',sb_key:'k'};" }); const f = path.join(SUITE, u.pathname.replace('/contracts/assets/', '')); if (fs.existsSync(f) && fs.statSync(f).isFile() && u.pathname.startsWith('/contracts/assets/')) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(f) }); return r.fulfill({ status: 204, body: '' }); });
  await pEn.addInitScript(() => { try { localStorage.setItem('lawang_idioma_ui', 'en'); } catch (e) { /* prueba */ } window.__cfg = {}; });
  await pEn.goto(ORIGEN + `/crea-contrasena/?token_hash=${TOKEN_HASH}&type=invite`); await pEn.waitForTimeout(150);
  ok('inglés elegido en la suite: toda la pantalla sale en inglés (sin español suelto)', await pEn.evaluate(() => { const t = document.body.innerText; return /Create your password/.test(t) && /Save and sign in/.test(t) && !/contraseña|Guardar|Repítela/i.test(t) && document.title.endsWith('Create your password'); }));
  await ctxEn.close();

  await nav.close();
  console.log(`\n${total - fallos}/${total} comprobaciones del harness` + (fallos ? ` · ${fallos} FALLAN` : ' · todo bien'));
  process.exit(fallos ? 1 : 0);
})();
