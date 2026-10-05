// node comercial/demo-erp/pruebas/whatsapp_bot_conexion.harness.cjs comercial/demo-erp/whatsapp_bot.html <ruta/captura.png>
// Harness de la pantalla «Bot de WhatsApp» (S4): marcado + script reales de whatsapp_bot.html, con la instancia, la edge y el SDK de Meta SIMULADOS.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');   // en esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const RUTA = process.argv[2];
const SHOT = process.argv[3];
const html = fs.readFileSync(RUTA, 'utf8');
const [marcado, script] = html.split('<!--AXW_SCRIPT-->');
const TOKEN_FALSO = 'EAAtokenQueNuncaDebeLlegarAlNavegador123';
let fallos = 0, n = 0;
const ok = (nombre, c, extra = '') => { n++; if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + nombre); };

const pagina = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title></head><body>
${marcado}
<script>
window.__estado = { conexion: 'sin_conectar', numero_visible: null, conectado_en: null, ultimo_error: null };
window.__llamadas = [];
var TOPES = { nombre_negocio: 120, descripcion: 800, horario: 300, ubicacion: 300, contacto_persona: 200, politicas: 800, derivar_a_persona: 300, servicios_max: 20, preguntas_max: 20, idiomas_max: 4, total: 12000,
  servicio_nombre: 80, servicio_descripcion: 300, servicio_precio: 80, pregunta: 160, respuesta: 500, tonos: ['cercano','formal','neutro'], idiomas_validos: ['es','en','id'] };
var sb = {
  rpc: function (n, a) { window.__llamadas.push('rpc:' + n);
    if (n === 'wab_ficha_historial') return Promise.resolve({ data: { versiones: [] }, error: null });
    return Promise.resolve({ data: { ficha: null, version: null, topes: TOPES, estado: window.__estado }, error: null }); },
  auth: { getSession: function () { return Promise.resolve({ data: { session: { access_token: 'JWT-DEL-ADMIN' } } }); } }
};
window.LW_AUTH = Promise.resolve({ sb: sb });
window.lwDatos = function (n, a) { return sb.rpc(n, a); };
window.lwEdge = function (n) { return 'https://inst.test/functions/v1/' + n; };
window.LW_SB_KEY = 'anon-key';
window.lwT = function (s) { return String(s); };
window.toast = function (m) { window.__toast = m; };
</script>
<script>${script.replace(/^\s*<script>/, '').replace(/<\/script>\s*$/, '')}</script></body></html>`;

(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', (e) => errores.push(String(e)));
  const cuerpos = [];
  let escenario = 'bien';
  await p.route('https://inst.test/', (r) => r.fulfill({ contentType: 'text/html', body: pagina }));
  await p.route('https://inst.test/functions/v1/wab-conecta', async (r) => {
    const cab = r.request().headers(); const c = JSON.parse(r.request().postData() || '{}'); cuerpos.push({ c, auth: cab.authorization, apikey: cab.apikey });
    if (c.accion === 'inicia') {
      await p.evaluate(() => { window.__estado = { conexion: 'pendiente', numero_visible: null, conectado_en: null, ultimo_error: null }; });
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, caduca_en: 'x', app_id: '4504347199895915', config_id: '1789126955865143', graph_version: 'v21.0' }) });
    }
    if (escenario === 'waba_ajena') {
      await p.evaluate(() => { window.__estado = { conexion: 'error', numero_visible: null, conectado_en: null, ultimo_error: 'waba_ajena' }; });
      return r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'waba_ajena' }) });
    }
    await p.evaluate(() => { window.__estado = { conexion: 'conectado', numero_visible: '+62 811-3831-7479', conectado_en: '2026-10-05T10:00:00Z', ultimo_error: null }; });
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, numero: '+62 811-3831-7479' }) });
  });
  // SDK de Meta falso: login abre «el popup» y devuelve el código; el mensaje de sesión lo manda el test con origen de Meta
  await p.route('https://connect.facebook.net/en_US/sdk.js', (r) => r.fulfill({ contentType: 'application/javascript', body:
    `window.FB={init:function(o){window.__fbInit=o},login:function(cb,o){window.__fbLogin=o;window.__fbCb=cb;}};` }));

  const abre = async () => { await p.goto('https://inst.test/'); await p.waitForSelector('[data-accion="conectar"]'); await p.waitForFunction(() => document.querySelector('[data-wb="estado"]').textContent.length > 0); };
  const mensajeMeta = (origen, d) => p.evaluate(([o, x]) => window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(x), origin: o })), [origen, d]);
  const sesion = { type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH', data: { waba_id: '24365086299817570', phone_number_id: '1327673293762626' } };

  // 1. camino feliz
  await abre();
  ok('1.1 sin conectar al abrir', (await p.textContent('[data-wb="estado"]')).includes('Sin conectar'));
  await p.click('[data-accion="conectar"]');
  await p.waitForFunction(() => window.__fbLogin);
  const o = await p.evaluate(() => ({ login: window.__fbLogin, init: window.__fbInit }));
  ok('1.2 abre el Embedded Signup con el config_id y el app_id que da la edge, pidiendo un CÓDIGO', o.login.config_id === '1789126955865143' && o.login.response_type === 'code' && o.init.appId === '4504347199895915' && o.init.version === 'v21.0');
  ok('1.3 la petición «inicia» lleva el JWT del admin y solo {accion}', JSON.stringify(cuerpos[0].c) === '{"accion":"inicia"}' && cuerpos[0].auth === 'Bearer JWT-DEL-ADMIN');
  await mensajeMeta('https://evil.example', sesion);               // un mensaje que no es de Meta no cuenta
  await p.evaluate(() => window.__fbCb({ authResponse: { code: 'AQBcodigoDeUnSoloUso_ok-123' } }));
  await p.waitForTimeout(300);
  ok('1.4 un mensaje de sesión de otro origen se ignora: no se canjea nada', cuerpos.length === 1);
  await mensajeMeta('https://www.facebook.com', sesion);
  await p.waitForFunction(() => document.querySelector('[data-wb="estado"]').getAttribute('data-conexion') === 'conectado');
  const txt = await p.textContent('[data-wb="estado"]');
  ok('1.5 el estado pasa a «Conectado · número» leído de la base', txt.includes('Conectado') && txt.includes('+62 811-3831-7479'), txt);
  const canje = cuerpos[1];
  ok('1.6 el canje manda EXACTAMENTE código + los dos ids (y la sesión como Bearer): nada más', JSON.stringify(Object.keys(canje.c).sort()) === JSON.stringify(['accion', 'code', 'phone_number_id', 'waba_id']) && canje.c.accion === 'canjea' && canje.auth === 'Bearer JWT-DEL-ADMIN');
  const volcado = await p.evaluate(() => document.documentElement.outerHTML + JSON.stringify(Object.assign({}, localStorage)) + JSON.stringify(Object.assign({}, sessionStorage)) + document.cookie);
  ok('1.7 el navegador nunca ve ninguna clave (ni en el DOM, ni en storage, ni en cookies)', !volcado.includes(TOKEN_FALSO) && !/EAA[A-Za-z0-9]{20,}/.test(volcado));
  ok('1.8 la pantalla no escribe en ninguna tabla: solo RPC de lectura/ficha y la edge', (await p.evaluate(() => window.__llamadas)).every((x) => /^rpc:wab_ficha_(datos|historial)$/.test(x)));
  ok('1.9 con el número conectado se avisa con un toast', await p.evaluate(() => window.__toast) === 'Número conectado.');
  await p.screenshot({ path: SHOT.replace('.png', '_1440.png') });

  // 2. el servidor rechaza (waba ajena): se enseña el código y la base queda en error
  cuerpos.length = 0; escenario = 'waba_ajena';
  await abre();
  await p.click('[data-accion="conectar"]');
  await p.waitForFunction(() => window.__fbLogin);
  await p.evaluate(() => window.__fbCb({ authResponse: { code: 'AQBcodigoDeUnSoloUso_ok-456' } }));
  await mensajeMeta('https://www.facebook.com', sesion);
  await p.waitForFunction(() => document.querySelector('[data-wb="conexion-error"]').textContent.length > 0);
  const e2 = await p.textContent('[data-wb="conexion-error"]');
  ok('2.1 un rechazo del servidor se cuenta con su código corto y no cambia a «conectado»', e2.includes('waba_ajena') && (await p.getAttribute('[data-wb="estado"]', 'data-conexion')) === 'error', e2);
  ok('2.2 el botón vuelve a poder pulsarse', await p.isEnabled('[data-accion="conectar"]'));

  // 3. el cliente cierra la ventana de Meta
  await abre();
  await p.click('[data-accion="conectar"]');
  await p.waitForFunction(() => window.__fbLogin);
  await p.evaluate(() => window.__fbCb({ authResponse: null }));
  await p.waitForFunction(() => document.querySelector('[data-wb="conexion-error"]').textContent.length > 0);
  ok('3.1 cerrar el popup deja un mensaje claro y el botón libre', (await p.textContent('[data-wb="conexion-error"]')).includes('cerrado la ventana') && await p.isEnabled('[data-accion="conectar"]'));

  // 4. móvil
  await p.setViewportSize({ width: 390, height: 900 });
  await p.screenshot({ path: SHOT.replace('.png', '_390.png'), fullPage: false });
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
  const sobran = await p.evaluate(() => [...document.querySelectorAll('[data-wb=seccion-conexion], [data-wb=seccion-conexion] *')].filter(e => e.getBoundingClientRect().right > 392).slice(0,4).map(e => e.tagName + '.' + e.className + '[' + (e.getAttribute('data-wb')||e.getAttribute('data-accion')||'') + ']'));
  ok('4.1 a 390 px la sección de conexión cabe (los campos de la ficha, anteriores, se miden en la instancia real: el harness no lleva la cáscara de Tailwind)', sobran.length === 0, ancho + ' ' + JSON.stringify(sobran));
  ok('5.1 sin errores de JS en la página', errores.length === 0, errores.join(' | '));
  await b.close();
  console.log(`\n${n - fallos}/${n} ${fallos ? 'FALLAN ' + fallos : 'ok'}`);
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
