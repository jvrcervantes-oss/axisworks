// node comercial/demo-erp/pruebas/ajustes_correo.harness.cjs <ajustes.js generado por build.py> [captura.png]
// Harness de «Ajustes › Correo» del maestro (F3.1, 7-oct-2026): el ajustes.js REAL ya con el overlay (ajustes_correo.js), en Chromium, con la base,
// la sesión y la edge `ajustes-correo` SIMULADAS (page.route). Mide el comportamiento, no el código: qué pide a la edge y con qué cabeceras, qué
// pinta con cada respuesta (incluida la edge sin desplegar) y que la contraseña no se queda en ningún sitio.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const RUTA = process.argv[2];
const SHOT = process.argv[3];
const js = fs.readFileSync(RUTA, 'utf8');
let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + nombre); };
const SECRETO = 'S3cr3t0-del-buz0n!';
const CUENTA = 'Cl4ve-de-la-cuenta';

const pagina = (cfg) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title>
<style>[data-lw-panel][hidden]{display:none}</style></head><body>
<div role="tablist"><button data-lw-tab="empresa">Empresa</button><button data-lw-tab="correo">Correo</button><button data-lw-tab="registro">Registro</button></div>
<section data-lw-panel="empresa"><div id="lw-aj-empresa"></div></section>
<section data-lw-panel="correo"><div><h2>Correo</h2></div><div id="lw-aj-correo"></div></section>
<section data-lw-panel="registro"><div id="lw-aj-registro"></div></section>
<script>
window.AXW_NUCLEO_OPERACION = true;
window.__datos = ${JSON.stringify(cfg.datos)};
window.__guardados = [];
var sb = {
  rpc: function (n, a) { if (n === 'ajustes_config_guardar') { window.__guardados.push([a.p_clave, a.p_valor]); window.__datos.valores[a.p_clave] = a.p_valor; return Promise.resolve({ data: { cambiado: true }, error: null }); }
    return Promise.resolve({ data: window.__datos, error: null }); },
  from: function () { throw new Error('el navegador no toca la base'); },
  auth: { getSession: function () { return Promise.resolve({ data: { session: { access_token: 'JWT-DEL-SUPER' } } }); } }
};
window.LW_AUTH = Promise.resolve({ sb: sb });
window.lwDatos = function (n, a) { return Promise.resolve(sb.rpc(n, a)).then(function (r) { return { data: r.data, error: r.error }; }); };
window.lwEdge = function (n) { return 'https://inst.test/functions/v1/' + n; };
window.LW_SB_KEY = 'anon-key';
window.LW_IDIOMA = '${cfg.idioma || 'es'}';
window.LW_EN = { 'Correo': 'Email', 'Reintentar': 'Retry', 'opcional': 'optional' };
window.lwLocale = function () { return window.LW_IDIOMA === 'en' ? 'en-GB' : 'es-ES'; };
window.lwT = function (s) { if (window.LW_IDIOMA === 'en' && Object.prototype.hasOwnProperty.call(window.LW_EN, s)) return window.LW_EN[s]; return s; };
window.toast = function (m) { window.__toast = m; };
window.onerror = function (m) { (window.__errores = window.__errores || []).push(String(m)); };
</script>
<script>${js.replace(/<\/script>/g, '<\\/script>')}</script></body></html>`;

const DATOS = (extra = {}) => Object.assign({ editables: ['marca', 'email_from', 'email_reply_to', 'email_avisos_reservas', 'email_avisos_crm', 'zona_horaria', 'logo_correo_url', 'email_avisos_soporte', 'email_avisos_sistema', 'asunto_por_defecto'],
  puede_escribir: true, valores: { email_from: 'hola@negocio.com', email_avisos_reservas: 'res@negocio.com' }, actualizado: {} }, extra);
const ESTADO = (o = {}) => ({ ok: true, estado: Object.assign({ configurado: true, host: 'smtp.viejo.com', usuario: 'hola@negocio.com', puerto: 465, nombre: 'Mi Negocio', puesto_en: '2026-10-01T10:00:00Z', puesto_por: 'u', hay_previo: false, intentos_recientes: 0, intentos_max: 5 }, o.estado || {}),
  remitente: Object.assign({ email_from: 'hola@negocio.com', efectivo: 'hola@negocio.com', motivo: '', reply_to: '' }, o.remitente || {}), envios_pausados: !!o.pausados });

(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  async function abre(cfg, respuestas, hash = '#correo') {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1100 } });
    const p = await ctx.newPage();
    const llamadas = [];
    await p.route('https://inst.test/functions/v1/ajustes-correo', async (r) => {
      const req = r.request();
      if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': 'https://inst.test', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } });
      const cuerpo = JSON.parse(req.postData() || '{}');
      llamadas.push({ cuerpo, cab: req.headers() });
      const x = respuestas(cuerpo, llamadas.length);
      if (x === 'abort') return r.abort('failed');
      return r.fulfill({ status: x.status, contentType: x.html ? 'text/html' : 'application/json', headers: { 'access-control-allow-origin': 'https://inst.test' }, body: x.html || JSON.stringify(x.body) });
    });
    await p.route('https://inst.test/', (r) => r.fulfill({ contentType: 'text/html', body: pagina(cfg) }));
    await p.goto('https://inst.test/' + hash);
    return { p, ctx, llamadas };
  }
  const txt = (p, sel) => p.$eval(sel, (e) => e.textContent).catch(() => null);

  // 1. Estado configurado: se pide solo al abrir la pestaña, con la sesión; campos y casillas nuevas
  {
    const { p, ctx, llamadas } = await abre({ datos: DATOS() }, (c) => ({ status: 200, body: ESTADO() }));
    await p.waitForSelector('[data-correo-campo="host"]');
    ok('estado: UNA llamada a la edge, acción estado', llamadas.length === 1 && llamadas[0].cuerpo.accion === 'estado');
    ok('estado: va con Bearer de la sesión y apikey, sin secretos', llamadas[0].cab.authorization === 'Bearer JWT-DEL-SUPER' && llamadas[0].cab.apikey === 'anon-key');
    ok('estado: muestra servidor, usuario, puerto y «puesto el»', /smtp\.viejo\.com/.test(await txt(p, '[data-correo="servidor-actual"]')) && /puesto el/.test(await txt(p, '[data-correo="servidor-actual"]')));
    ok('host/usuario/nombre vienen del estado', await p.$eval('[data-correo-campo="host"]', (e) => e.value) === 'smtp.viejo.com' && await p.$eval('[data-correo-campo="user"]', (e) => e.value) === 'hola@negocio.com' && await p.$eval('[data-correo-campo="nombre"]', (e) => e.value) === 'Mi Negocio');
    const pass = await p.$eval('[data-correo-campo="pass"]', (e) => ({ v: e.value, t: e.type, a: e.autocomplete }));
    ok('contraseña: vacía, type=password, autocomplete=new-password', pass.v === '' && pass.t === 'password' && pass.a === 'new-password');
    const port = await p.$eval('[data-correo-campo="port"]', (e) => ({ v: e.value, d: e.disabled }));
    ok('puerto 465 fijo e inerte', port.v === '465' && port.d === true);
    ok('casillas A8-A10 pintadas con su botón de guardar', (await p.$$('[data-ajuste="email_avisos_soporte"], [data-ajuste="email_avisos_sistema"], [data-ajuste="asunto_por_defecto"]')).length === 3);
    ok('el texto de «qué lee esto» de las casillas nuevas es el del envío de correos', /envío de correos/.test(await txt(p, '[data-ajuste-fila="email_avisos_sistema"]')));
    ok('sin error de JS', !(await p.evaluate(() => window.__errores)));
    if (SHOT) await p.screenshot({ path: SHOT, fullPage: true });
    // guardar una casilla nueva va por la RPC de config (nunca por la edge) y no repinta el formulario del servidor
    await p.fill('[data-ajuste="asunto_por_defecto"]', 'Hola desde ERP');
    await p.fill('[data-correo-campo="pass"]', SECRETO);
    await p.click('[data-ajuste-clave="asunto_por_defecto"]');
    await p.waitForFunction(() => window.__guardados.length === 1);
    ok('A10 se guarda por ajustes_config_guardar', JSON.stringify(await p.evaluate(() => window.__guardados)) === JSON.stringify([['asunto_por_defecto', 'Hola desde ERP']]));
    ok('guardar otra casilla no borra la contraseña a medio teclear ni vuelve a llamar a la edge', await p.$eval('[data-correo-campo="pass"]', (e) => e.value) === SECRETO && llamadas.length === 1);
    await ctx.close();
  }

  // 2. Probar y guardar: cuerpo exacto, contraseña vaciada, resultado
  {
    const { p, ctx, llamadas } = await abre({ datos: DATOS() }, (c) => c.accion === 'estado' ? { status: 200, body: ESTADO() }
      : { status: 200, body: Object.assign(ESTADO({ estado: { host: 'smtp.nuevo.com', usuario: 'envios@negocio.com' } }), { guardado: true, aviso: 'enviado', prueba_enviada_a: 'yo@negocio.com' }) });
    await p.waitForSelector('[data-correo-campo="host"]');
    await p.fill('[data-correo-campo="host"]', '  smtp.nuevo.com ');
    await p.fill('[data-correo-campo="user"]', 'envios@negocio.com');
    await p.fill('[data-correo-campo="pass"]', SECRETO);
    await p.fill('[data-correo-campo="nombre"]', '');
    await p.click('[data-accion="correo-servidor-probar"]');
    await p.waitForFunction(() => /Guardado/.test((document.querySelector('[data-correo="resultado"]') || {}).textContent || ''));
    const c = llamadas[1].cuerpo;
    ok('probar_y_guardar: cuerpo = accion, host recortado, port 465 (número), user, pass tal cual; sin nombre vacío ni contrasena_actual',
      c.accion === 'probar_y_guardar' && c.host === 'smtp.nuevo.com' && c.port === 465 && c.user === 'envios@negocio.com' && c.pass === SECRETO && !('nombre' in c) && !('contrasena_actual' in c), JSON.stringify(c));
    ok('la contraseña se vacía tras guardar', await p.$eval('[data-correo-campo="pass"]', (e) => e.value) === '');
    const r = await txt(p, '[data-correo="resultado"]');
    ok('resultado: guardado + a quién llegó la prueba + aviso previo enviado', /yo@negocio\.com/.test(r) && /servidor anterior/.test(r), r);
    ok('el estado pintado pasa al servidor nuevo', /smtp\.nuevo\.com/.test(await txt(p, '[data-correo="servidor-actual"]')));
    ok('la contraseña no está en ningún sitio de la página', !(await p.content()).includes(SECRETO) && !(await p.evaluate(() => JSON.stringify([...document.querySelectorAll('input')].map((i) => i.value) ))).includes(SECRETO));
    await ctx.close();
  }

  // 3. Fallos: prueba_fallida (solo códigos), reautenticar (aparece la contraseña de la cuenta), 429, pausa
  {
    let paso = 0;
    const { p, ctx, llamadas } = await abre({ datos: DATOS() }, (c) => {
      if (c.accion === 'estado') return { status: 200, body: ESTADO() };
      paso++;
      if (paso === 1) return { status: 422, body: { ok: false, codigo: 'prueba_fallida', error: '<img src=x onerror=window.__xss=1>535 Authentication failed for ADMIN-HOST-INTERNO', fase: 'verify', smtp_code: 'EAUTH', smtp_response_code: 535, detalle_code: '' } };
      if (paso === 2) return { status: 401, body: { ok: false, codigo: 'reautenticar', error: 'texto del servidor' } };
      if (paso === 3) return { status: 401, body: { ok: false, codigo: 'clave_actual_incorrecta', error: 'x' } };
      if (paso === 4) return { status: 429, body: { ok: false, codigo: 'demasiados_intentos', error: 'x' } };
      return { status: 503, body: { ok: false, codigo: 'envios_pausados', error: 'x' } };
    });
    await p.waitForSelector('[data-correo-campo="host"]');
    const prueba = async (reauth) => {
      await p.fill('[data-correo-campo="host"]', 'smtp.otro.com');
      await p.fill('[data-correo-campo="user"]', 'u@negocio.com');
      await p.fill('[data-correo-campo="pass"]', SECRETO);
      if (reauth) await p.fill('[data-correo-campo="reauth"]', CUENTA);
      await p.click('[data-accion="correo-servidor-probar"]');
      await p.waitForFunction(() => ((document.querySelector('[data-correo="resultado"]') || {}).textContent || '').length > 0);
      await p.waitForTimeout(150);
    };
    await prueba(false);
    let r = await txt(p, '[data-correo="resultado"]');
    ok('prueba_fallida: mensaje traducido + «código técnico» EAUTH 535', /no ha aceptado la prueba/.test(r) && /iniciar sesión/.test(r) && /EAUTH 535/.test(r), r);
    ok('prueba_fallida: NADA del texto del servidor ni HTML ejecutado', !/ADMIN-HOST|Authentication failed|<img/.test(await p.evaluate(() => document.body.innerText)) && !(await p.evaluate(() => window.__xss)));
    ok('tras fallar: contraseña vaciada y host tecleado conservado', await p.$eval('[data-correo-campo="pass"]', (e) => e.value) === '' && await p.$eval('[data-correo-campo="host"]', (e) => e.value) === 'smtp.otro.com');
    await prueba(false);
    r = await txt(p, '[data-correo="resultado"]');
    ok('reautenticar: mensaje claro y aparece el campo de la contraseña de la cuenta (current-password)', /Confirma tu contraseña/.test(r) && await p.$eval('[data-correo-campo="reauth"]', (e) => e.type + '/' + e.autocomplete) === 'password/current-password', r);
    await prueba(true);
    const c3 = llamadas.filter((l) => l.cuerpo.accion === 'probar_y_guardar')[2].cuerpo;
    ok('segunda vuelta manda contrasena_actual', c3.contrasena_actual === CUENTA);
    ok('clave_actual_incorrecta: mensaje y el campo sigue ahí, vacío', /no es la contraseña de tu cuenta/.test(await txt(p, '[data-correo="resultado"]')) && await p.$eval('[data-correo-campo="reauth"]', (e) => e.value) === '');
    await prueba(true);
    ok('429: «demasiados intentos»', /Demasiados intentos/.test(await txt(p, '[data-correo="resultado"]')));
    await prueba(true);
    ok('503: pausa explicada (no es la contraseña) y el botón queda desactivado', /pausa/.test(await txt(p, '[data-correo="resultado"]')) && await p.$eval('[data-accion="correo-servidor-probar"]', (e) => e.disabled));
    await ctx.close();
  }

  // 4. La edge sin desplegar: 404 de la plataforma, 500 y sin respuesta (red/CORS)
  for (const [nombre, resp, esperado] of [['404', () => ({ status: 404, body: { code: 'NOT_FOUND', message: 'Requested function was not found' } }), /todavía no está disponible/],
                                          ['502 HTML', () => ({ status: 502, html: '<html>Bad gateway SECRETO-INTERNO</html>' }), /todavía no está disponible/],
                                          ['sin red / CORS', () => 'abort', /No se ha podido contactar/]]) {
    const { p, ctx } = await abre({ datos: DATOS() }, resp);
    await p.waitForSelector('[data-correo="estado"] [data-accion="correo-estado-reintentar"]');
    const t = await txt(p, '[data-correo="estado"]');
    ok('edge ' + nombre + ': mensaje claro y botón Reintentar', esperado.test(t) && !/SECRETO-INTERNO|NOT_FOUND|Requested function/.test(t), t);
    ok('edge ' + nombre + ': el resto del formulario de Correo sigue funcionando', (await p.$$('[data-ajuste="email_from"]')).length === 1);
    await ctx.close();
  }

  // 5. Un admin (no super): no se llama a la edge; sin migración: no salen las casillas nuevas
  {
    const { p, ctx, llamadas } = await abre({ datos: DATOS({ puede_escribir: false, editables: ['marca', 'email_from', 'email_reply_to', 'email_avisos_reservas', 'email_avisos_crm', 'zona_horaria', 'logo_correo_url'] }) }, () => ({ status: 403, body: { ok: false, codigo: 'no_super_admin' } }));
    await p.waitForSelector('#lw-aj-correo-servidor h2');
    await p.waitForTimeout(300);
    ok('admin sin super: no se llama a la edge', llamadas.length === 0);
    ok('admin sin super: lo dice', /Solo el super admin/.test(await txt(p, '#lw-aj-correo-servidor')));
    ok('sin migración (editables sin A8-A10): no salen las casillas nuevas', (await p.$$('[data-ajuste="asunto_por_defecto"]')).length === 0);
    await ctx.close();
  }
  {
    const { p, ctx, llamadas } = await abre({ datos: DATOS(), idioma: 'en' }, (c) => ({ status: 200, body: ESTADO({ remitente: { motivo: 'dominio_distinto', efectivo: 'envios@otro.com', email_from: 'hola@negocio.com' }, estado: { intentos_recientes: 2 } }) }), '#empresa');
    await p.waitForTimeout(400);
    ok('en otra pestaña (#empresa) no se llama a la edge', llamadas.length === 0);
    await p.evaluate(() => { location.hash = 'correo'; });
    await p.waitForSelector('[data-correo-campo="host"]');
    ok('al abrir Correo se pide el estado una vez', llamadas.length === 1);
    ok('desajuste de dominio visible', /envios@otro\.com/.test(await txt(p, '[data-correo="desajuste-dominio"]')));
    ok('intentos recientes visibles', /2 of 5/.test(await txt(p, '[data-correo="estado"]')) || /2 de 5/.test(await txt(p, '[data-correo="estado"]')));
    await ctx.close();
  }
  {
    // XSS por el estado: un host con HTML se enseña como texto
    const { p, ctx } = await abre({ datos: DATOS() }, () => ({ status: 200, body: ESTADO({ estado: { host: '<img src=x onerror=window.__xss=1>', usuario: '"><script>window.__xss=2</script>' } }) }));
    await p.waitForSelector('[data-correo-campo="host"]');
    ok('estado con HTML hostil: no se ejecuta y se ve como texto', !(await p.evaluate(() => window.__xss)) && /<img src=x/.test(await txt(p, '[data-correo="servidor-actual"]')));
    await ctx.close();
  }
  await b.close();
  console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\ntodo en verde');
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
