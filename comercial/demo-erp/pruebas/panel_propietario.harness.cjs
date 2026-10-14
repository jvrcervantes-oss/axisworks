// node comercial/demo-erp/pruebas/panel_propietario.harness.cjs <raíz del paquete YA CONSTRUIDO con build.py --instancia axisworks-demo> [captura_prefijo]
// N4/T F1 (14-oct-2026, erp-setup-b1b5): el administrador principal en la Ficha del panel (/panel/). Chromium sobre el panel REAL del paquete; la
// edge erp-control es un DOBLE en memoria con las respuestas que fija el arnés del mando de la agencia (erp/pruebas/arnes_mando_propietario.mjs).
// Nada sale a ninguna base. Mide:
//   · sin propietario: campo de correo y «Aprobar invitación»; un correo mal escrito no llama al mando; con confirmación manda
//     {accion:'invita_admin', instancia, email (en minúsculas), nombre} y nada más; enviado:false dice «el correo no ha salido»;
//   · un rechazo de la base (ya_hay_propietario, correo_del_estudio) se enseña con el mensaje del mando;
//   · invitado sin contraseña: correo, «Reenviar» (sin diálogo) y «Retirar» (con diálogo; Cancelar no llama);
//   · activo: solo el correo; instancia sin la migración: «aún no lo gestiona», sin botones; instancia de solo lectura: sin botones;
//   · 390 px sin desbordes; 0 errores de consola.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const RAIZ = path.resolve(process.argv[2] || '');
const SHOT = process.argv[3];
let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + nombre); };
const ORIGEN = 'https://app.prueba.test';
const TIPOS = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };

function estadoInst(prop) {
  const e = { activos: ['base'], marca: 'Sample Rentals', apagados: 0, edges_desplegadas: [], log: [],
    ficha: { marca: 'Sample Rentals', dominio_web: 'sample.test', url_intranet: 'https://erp.sample.test', super_admins: [{ correo: 'hello@estudio.test', confirmado: true, difiere: false }] },
    modulos: [{ modulo: 'base', depende: [], instalable: true, edges: [], motivo: null }] };
  if (prop !== undefined) e.propietario = prop;
  return e;
}
let PROP = null;                       // lo que dice la base de sample-rentals
let RESPUESTA = null;                  // lo que contesta el mando a la próxima acción del propietario: [status, cuerpo]
const llamadas = [];
function edge(cuerpo) {
  llamadas.push(cuerpo);
  if (cuerpo.accion === 'estado') return [200, { instancias: [
    { nombre: 'sample-rentals', marca: 'Sample Rentals', dominio: 'erp.sample.test', editable: true, motivo: null, estado: estadoInst(PROP) },
    { nombre: 'vieja', marca: 'Old Base', dominio: 'erp.old.test', editable: true, motivo: null, estado: estadoInst(undefined) },
    { nombre: 'ajena', marca: 'Read Only', dominio: 'erp.ro.test', editable: false, motivo: 'Solo lectura.', estado: estadoInst(null) }], perfiles: { tipos: [] } }];
  if (/_admin$/.test(cuerpo.accion)) return RESPUESTA || [500, { error: 'arnés' }];
  return [400, { error: 'accion' }];
}
const FALSO = `(function(){
  var ses = { access_token:'a', refresh_token:'r', user:{ id:'u1', email:'operador@prueba.test' } };
  var tablas = { usuarios: { rol:'super_admin', herramientas:[], activo:true, nombre:'Operador', notif_visto_hasta:null, ambito:null, empresas:null, es_propietario:true } };
  function q(t){ var st = { single:false, then:null };
    var px = new Proxy({}, { get:function(_o,k){
      if (k==='then') return st.then || function(ok,ko){ var d = tablas[t]; return Promise.resolve({ data: st.single ? (d||null) : (d?[d]:[]), error:null }).then(ok,ko); };
      if (k==='maybeSingle'||k==='single') return function(){ st.single=true; return px; };
      if (k==='__pon') return function(f){ st.then=f; return px; };
      return function(){ return px; }; } });
    return px; }
  var cli = { auth:{ getSession:function(){return Promise.resolve({data:{session:ses},error:null});}, getUser:function(){return Promise.resolve({data:{user:ses.user},error:null});},
      onAuthStateChange:function(){return {data:{subscription:{unsubscribe:function(){}}}};}, signOut:function(){return Promise.resolve({error:null});} },
    from:q, rpc:function(){ return q('__').__pon(function(ok,ko){ return Promise.resolve({ data: [], error:null }).then(ok,ko); }); },
    channel:function(){ var c={on:function(){return c;},subscribe:function(){return c;}}; return c; }, removeChannel:function(){} };
  window.supabase = { createClient:function(){ return cli; } };
})();`;
function fichero(url) {
  let p = decodeURIComponent(new URL(url).pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RAIZ, p);
  return f.startsWith(RAIZ) && fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}
(async () => {
  if (!fs.existsSync(path.join(RAIZ, 'panel', 'index.html'))) { console.log('NO SE HA PODIDO MIRAR: falta panel/index.html en ' + RAIZ); process.exit(2); }
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  const ajena = [];
  await ctx.route('**/*', route => {
    const req = route.request(), url = req.url();
    if (/supabase-js/.test(url)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: FALSO });
    if (/\.supabase\.co\/functions\/v1\/erp-control$/.test(url)) {
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
      const [st, cu] = edge(JSON.parse(req.postData() || '{}'));
      return route.fulfill({ status: st, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(cu) });
    }
    if (/supabase\.co/.test(url)) { ajena.push(url); return route.abort(); }
    if (/fonts\.(googleapis|gstatic)\.com/.test(url)) return route.continue();
    if (!url.startsWith(ORIGEN)) return route.abort();
    const f = fichero(url);
    if (!f) return route.fulfill({ status: 404, body: '' });
    let body = fs.readFileSync(f);
    if (f.endsWith('.html')) body = body.toString('utf8').replace(/ integrity="[^"]*"/g, '');
    return route.fulfill({ status: 200, contentType: TIPOS[path.extname(f)] || 'application/octet-stream', body });
  });
  const errores = [];
  const p = await ctx.newPage();
  p.on('pageerror', e => errores.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errores.push(m.text()); });
  const acciones = () => llamadas.filter(c => /_admin$/.test(c.accion));
  const toast = () => p.$eval('#toast', e => e.classList.contains('hidden') ? '' : e.textContent);
  const abre = async (inst) => {
    llamadas.length = 0;
    await p.goto(ORIGEN + '/panel/', { waitUntil: 'load' });
    await p.waitForSelector('#ficha [data-propietario]', { timeout: 15000 });
    if (inst) { await p.click('[data-inst="' + inst + '"]'); await p.waitForTimeout(150); }
  };

  // 1. sin propietario
  PROP = null;
  await abre();
  ok('sin propietario: «Ninguno todavía» con correo, nombre y «Aprobar invitación»', await p.$('#ficha [data-propietario="ninguno"]') && await p.$('#prop-email') && await p.$('#prop-nombre')
    && (await p.textContent('#ficha [data-prop="invita"]')).trim() === 'Aprobar invitación');
  if (SHOT) await p.screenshot({ path: SHOT + '_prop_ninguno_1440.png' });
  await p.fill('#prop-email', 'no-es-correo');
  await p.click('[data-prop="invita"]'); await p.waitForTimeout(150);
  ok('correo mal escrito: no llama al mando y lo dice', acciones().length === 0 && /correo/i.test(await toast()), await toast());
  await p.fill('#prop-email', '  Dion@Cliente.TEST ');
  await p.fill('#prop-nombre', 'Dion');
  await p.click('[data-prop="invita"]');
  await p.waitForSelector('#dlg[open]');
  ok('pide confirmación nombrando el correo', /dion@cliente\.test/.test(await p.textContent('#dlg-cuerpo')));
  RESPUESTA = [200, { ok: true, usuario_id: '44444444-5555-4666-8777-888888888888', enviado: true }];
  await p.click('#dlg-ok');
  await p.waitForTimeout(400);
  const c1 = acciones()[0] || {};
  ok('manda {accion:invita_admin, instancia, email en minúsculas, nombre} y nada más', c1.accion === 'invita_admin' && c1.instancia === 'sample-rentals'
    && c1.email === 'dion@cliente.test' && c1.nombre === 'Dion' && Object.keys(c1).sort().join() === 'accion,email,instancia,nombre', JSON.stringify(c1));
  ok('enviado:true → «Invitación enviada» y recarga el estado', /Invitación enviada/.test(await toast()) && llamadas.filter(c => c.accion === 'estado').length >= 2, await toast());
  // enviado:false
  RESPUESTA = [200, { ok: true, usuario_id: '44444444-5555-4666-8777-888888888888', enviado: false }];
  await abre(); await p.fill('#prop-email', 'dion@cliente.test'); await p.click('[data-prop="invita"]'); await p.waitForSelector('#dlg[open]'); await p.click('#dlg-ok'); await p.waitForTimeout(400);
  ok('enviado:false → «el correo no ha salido» y reenviar', /correo no ha salido/.test(await toast()) && /Reenvía/.test(await toast()), await toast());
  // Cancelar no llama
  await abre(); await p.fill('#prop-email', 'dion@cliente.test'); await p.click('[data-prop="invita"]'); await p.waitForSelector('#dlg[open]');
  await p.evaluate(() => document.getElementById('dlg').close('')); await p.waitForTimeout(200);
  ok('Cancelar la confirmación no llama al mando', acciones().length === 0);
  // rechazos de la base
  for (const [cod, st, msg] of [['ya_hay_propietario', 409, 'Esta instancia ya tiene administrador principal.'], ['correo_del_estudio', 400, 'El administrador principal no puede ser una cuenta del estudio: pon el correo del cliente.']]) {
    RESPUESTA = [st, { error: cod, mensaje: msg }];
    await abre(); await p.fill('#prop-email', 'dion@cliente.test'); await p.click('[data-prop="invita"]'); await p.waitForSelector('#dlg[open]'); await p.click('#dlg-ok'); await p.waitForTimeout(400);
    ok('rechazo ' + cod + ': enseña el mensaje del mando', (await toast()) === msg, await toast());
  }

  // 2. invitado sin contraseña
  PROP = { email: 'dion@cliente.test', invitado_en: '2026-10-14T10:00:00Z', activo: false, confirmado: false };
  await abre();
  ok('invitado: correo, «aún no ha entrado», Reenviar y Retirar', await p.$('#ficha [data-propietario="invitado"]') && /dion@cliente\.test/.test(await p.textContent('#ficha'))
    && /aún no ha entrado/.test(await p.textContent('#ficha')) && await p.$('[data-prop="reenvia"]') && await p.$('[data-prop="retira"]') && !(await p.$('#prop-email')));
  if (SHOT) await p.screenshot({ path: SHOT + '_prop_invitado_1440.png' });
  RESPUESTA = [200, { ok: true, usuario_id: '44444444-5555-4666-8777-888888888888', enviado: true }];
  await p.click('[data-prop="reenvia"]'); await p.waitForTimeout(400);
  ok('Reenviar: manda {accion:reenvia_admin, instancia} sin diálogo', JSON.stringify(acciones()) === JSON.stringify([{ accion: 'reenvia_admin', instancia: 'sample-rentals' }]) && /reenviada/.test(await toast()), JSON.stringify(acciones()));
  await abre();
  await p.click('[data-prop="retira"]'); await p.waitForSelector('#dlg[open]');
  await p.evaluate(() => document.getElementById('dlg').close('')); await p.waitForTimeout(200);
  ok('Retirar pide confirmación y Cancelar no llama', acciones().length === 0);
  RESPUESTA = [200, { ok: true, retirado: true }];
  await p.click('[data-prop="retira"]'); await p.waitForSelector('#dlg[open]'); await p.click('#dlg-ok'); await p.waitForTimeout(400);
  ok('Retirar confirmado: {accion:retira_admin, instancia} y «retirada»', JSON.stringify(acciones()) === JSON.stringify([{ accion: 'retira_admin', instancia: 'sample-rentals' }]) && /retirada/.test(await toast()), JSON.stringify(acciones()));
  RESPUESTA = [400, { error: 'ya_activo', mensaje: 'El administrador ya ha puesto su contraseña: no se puede retirar desde aquí.' }];
  await abre(); await p.click('[data-prop="retira"]'); await p.waitForSelector('#dlg[open]'); await p.click('#dlg-ok'); await p.waitForTimeout(400);
  ok('retirar a quien ya entró: enseña el mensaje', /ya ha puesto su contraseña/.test(await toast()), await toast());

  // 3. activo
  PROP = { email: 'dion@cliente.test', invitado_en: '2026-10-14T10:00:00Z', activo: true, confirmado: true };
  await abre();
  ok('activo: solo el correo y «ya ha puesto su contraseña», sin botones', await p.$('#ficha [data-propietario="activo"]') && !(await p.$('#ficha [data-prop]')));

  // 4. instancia sin la migración y 5. de solo lectura
  await abre('vieja');
  ok('base sin la migración: «aún no lo gestiona» y sin botones', await p.$('#ficha [data-propietario="sin_dato"]') && !(await p.$('#ficha [data-prop]')));
  await abre('ajena');
  ok('instancia de solo lectura: sin campo ni botones', await p.$('#ficha [data-propietario="ninguno"]') && !(await p.$('#ficha [data-prop]')) && !(await p.$('#prop-email')));

  // 6. 390 px
  PROP = null;
  await p.setViewportSize({ width: 390, height: 900 });
  await abre();
  const an = await p.evaluate(() => ({ sw: document.scrollingElement.scrollWidth, w: innerWidth,
    fuera: [...document.querySelectorAll('#ficha *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).map(e => e.tagName + '#' + e.id) }));
  ok('390 px: la Ficha con el formulario no se desborda', an.sw <= an.w && !an.fuera.length, JSON.stringify(an));
  if (SHOT) await p.screenshot({ path: SHOT + '_prop_ninguno_390.png', fullPage: true });

  ok('nada sale a una base de verdad', !ajena.length, ajena.join(' '));
  ok('0 errores de consola', !errores.length, errores.slice(0, 3).join(' | '));
  await nav.close();
  console.log(fallos ? 'FALLA panel_propietario: ' + fallos : 'OK panel_propietario');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('FALLA ' + (e && e.stack || e)); process.exit(1); });
