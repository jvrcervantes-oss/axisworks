// node comercial/demo-erp/pruebas/whatsapp_bot_seguimiento.harness.cjs comercial/demo-erp/whatsapp_bot.html <ruta/captura.png>
// Harness de la sección «Seguimiento» de la pantalla «Bot de WhatsApp» (F8 pieza 6, 9-oct-2026): marcado + script reales de whatsapp_bot.html, con la base SIMULADA
// (las RPC wab_seguimiento_datos / wab_seguimiento_guarda, con la misma validación en servidor que la migración 20261008138000: la pantalla pinta lo que manda la base,
// manda el objeto entero con su versión y enseña el mensaje de la base tal cual). No prueba la base (eso es erp/pruebas/f8_seguimiento.sql): prueba que la pantalla
// la usa bien.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');   // en esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright
const RUTA = process.argv[2];
const SHOT = process.argv[3] || 'seguimiento.png';
const html = fs.readFileSync(RUTA, 'utf8');
const [marcado, script] = html.split('<!--AXW_SCRIPT-->');
let fallos = 0, n = 0;
const ok = (nombre, c, extra = '') => { n++; if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + nombre); };

const pagina = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title><style>*,*::before,*::after{box-sizing:border-box}</style></head><body>
${marcado}
<script>
window.__llamadas = [];
window.__bd = { activo: false, horas: 48, max_mensajes: 2, plantilla: '', idioma: 'es', vars: [], version: 1 };
window.__versiones = [{ version: 1, cuando: '2026-10-09T01:00:00Z', quien: 'alta@pruebas.test', motivo: 'Alta: seguimiento apagado, sin plantilla' }];
window.__modo = 'bien';
var TOPES_FICHA = { nombre_negocio: 120, descripcion: 800, horario: 300, ubicacion: 300, contacto_persona: 200, politicas: 800, derivar_a_persona: 300, servicios_max: 20, preguntas_max: 20, idiomas_max: 4,
  servicio_nombre: 80, servicio_descripcion: 300, servicio_precio: 80, pregunta: 160, respuesta: 500, tonos: ['cercano','formal','neutro'], idiomas_validos: ['es','en','id'], total: 12000 };
var TOPES_SEG = { horas_min: 24, horas_max: 720, max_min: 1, max_max: 5, plantilla_max: 512, vars_max: 10, vars_validas: ['nombre'], motivo: 300 };
function datosSeg() {
  var b = window.__bd;
  return { seguimiento: { activo: b.activo, horas: b.horas, max_mensajes: b.max_mensajes, plantilla: b.plantilla, idioma: b.idioma, vars: b.vars }, version: b.version,
           actualizado_en: '2026-10-09T01:00:00Z', actualizado_por: 'alta@pruebas.test', topes: TOPES_SEG, versiones: window.__versiones.slice().reverse() };
}
function error(code, msg) { return Promise.resolve({ data: null, error: { code: code, message: msg } }); }
var sb = {
  rpc: function (n, a) { window.__llamadas.push({ n: n, a: a });
    if (n === 'wab_ficha_historial') return Promise.resolve({ data: { versiones: [] }, error: null });
    if (n === 'wab_seguimiento_datos') {
      if (window.__modo === 'sin_permiso') return error('42501', 'whatsapp-bot: solo un administrador de la instancia');
      return Promise.resolve({ data: datosSeg(), error: null });
    }
    if (n === 'wab_seguimiento_guarda') {
      var d = a.p_datos, b = window.__bd;
      if (window.__modo === 'sin_permiso') return error('42501', 'whatsapp-bot: solo un administrador de la instancia');
      if (a.p_version !== b.version) return error('40001', 'Otra persona guardó el seguimiento mientras lo editabas (versión ' + b.version + '). Recarga y vuelve a aplicar tu cambio.');
      if (!Number.isInteger(d.horas) || d.horas < 24 || d.horas > 720) return error('22023', '«Cada cuántas horas» tiene que estar entre 24 y 720');
      if (!Number.isInteger(d.max_mensajes) || d.max_mensajes < 1 || d.max_mensajes > 5) return error('22023', '«Máximo de mensajes por cliente» tiene que estar entre 1 y 5');
      if (!/^[a-z0-9_]*$/.test(d.plantilla)) return error('22023', 'El nombre de la plantilla solo admite letras minúsculas sin tildes, números y guion bajo (escríbelo igual que aparece en Meta), hasta 512 caracteres');
      if (d.activo && d.plantilla === '') return error('22023', 'Para activar el seguimiento hace falta el nombre de una plantilla aprobada en Meta');
      var igual = d.activo === b.activo && d.horas === b.horas && d.max_mensajes === b.max_mensajes && d.plantilla === b.plantilla && d.idioma === b.idioma && JSON.stringify(d.vars) === JSON.stringify(b.vars);
      if (!igual) {
        b.activo = d.activo; b.horas = d.horas; b.max_mensajes = d.max_mensajes; b.plantilla = d.plantilla; b.idioma = d.idioma; b.vars = d.vars; b.version++;
        window.__versiones.push({ version: b.version, cuando: '2026-10-09T02:00:00Z', quien: 'admin@pruebas.test', motivo: a.p_motivo });
      }
      return Promise.resolve({ data: { version: b.version, cambiado: !igual }, error: null });
    }
    return Promise.resolve({ data: { ficha: null, version: null, topes: TOPES_FICHA, estado: { conexion: 'sin_conectar' } }, error: null }); },
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
  await p.route('https://inst.test/', (r) => r.fulfill({ contentType: 'text/html', body: pagina }));
  const abre = async () => { await p.goto('https://inst.test/'); await p.waitForSelector('[data-seg="horas"]'); await p.waitForFunction(() => document.querySelector('[data-seg="horas"]').value !== ''); };
  const seg = (campo) => p.locator('[data-seg="' + campo + '"]');
  const guardaLlamadas = () => p.evaluate(() => window.__llamadas.filter((x) => x.n === 'wab_seguimiento_guarda'));
  const motivo = (t) => seg('motivo').fill(t);

  // 1. al abrir: lo que manda la base, apagado
  await abre();
  ok('1.1 pinta los valores de la base (48 h, 2 mensajes, sin plantilla, es) y APAGADO',
    (await seg('horas').inputValue()) === '48' && (await seg('max_mensajes').inputValue()) === '2' && (await seg('plantilla').inputValue()) === '' && (await seg('idioma').inputValue()) === 'es' && !(await seg('activo').isChecked()));
  ok('1.2 los rangos que enseña salen de los topes de la base (24-720 y 1-5)',
    (await p.textContent('[data-seg-rango="horas"]')).includes('24') && (await p.textContent('[data-seg-rango="horas"]')).includes('720') && (await p.textContent('[data-seg-rango="max_mensajes"]')).includes('5')
    && (await seg('horas').getAttribute('min')) === '24' && (await seg('horas').getAttribute('max')) === '720');
  ok('1.3 la lista de variables sale de la lista cerrada de la base (solo «nombre») y empieza sin marcar',
    (await p.locator('[data-seg-var]').count()) === 1 && (await p.locator('[data-seg-var="nombre"]').isChecked()) === false);
  ok('1.4 avisa de que está apagado y de que la plantilla debe estar aprobada en Meta', (await p.textContent('[data-wb="seg-aviso"]')).includes('apagado') && (await p.textContent('[data-wb="seccion-seguimiento"]')).includes('APROBADA por Meta'));
  ok('1.5 muestra la versión y el historial de la base', (await p.textContent('[data-wb="seg-version"]')).includes('Versión 1') && (await p.locator('[data-seg-version]').count()) === 1);

  // 2. guardar sin motivo: no llama a la base
  await seg('horas').fill('72');
  await p.click('[data-accion="seguimiento-guardar"]');
  ok('2.1 sin motivo no sale ninguna petición y se pide en llano', (await guardaLlamadas()).length === 0 && (await p.textContent('[data-wb="seg-error"]')).includes('qué has cambiado'));

  // 3. la base rechaza: se enseña SU mensaje, sin tocar nada
  await seg('horas').fill('23'); await motivo('probando el mínimo');
  await p.click('[data-accion="seguimiento-guardar"]');
  await p.waitForFunction(() => document.querySelector('[data-wb="seg-error"]').textContent.length > 0);
  ok('3.1 23 horas: la base dice que no y la pantalla enseña su mensaje tal cual', (await p.textContent('[data-wb="seg-error"]')) === '«Cada cuántas horas» tiene que estar entre 24 y 720');
  ok('3.2 lo enviado llevaba la versión cargada (1) y los seis campos con su tipo (número, booleano, lista)',
    await p.evaluate(() => { var l = window.__llamadas.filter((x) => x.n === 'wab_seguimiento_guarda').pop(); var d = l.a.p_datos;
      return l.a.p_version === 1 && Object.keys(d).sort().join() === 'activo,horas,idioma,max_mensajes,plantilla,vars' && typeof d.horas === 'number' && typeof d.activo === 'boolean' && Array.isArray(d.vars) && d.horas === 23; }));
  await seg('horas').fill('72'); await seg('plantilla').fill('Seguimiento Mal');
  await p.click('[data-accion="seguimiento-guardar"]');
  await p.waitForFunction(() => document.querySelector('[data-wb="seg-error"]').textContent.includes('plantilla'));
  ok('3.3 una plantilla con mayúsculas y espacio la rechaza la base (la pantalla no la «arregla» por detrás)', (await seg('plantilla').inputValue()) === 'Seguimiento Mal');
  await seg('plantilla').fill(''); await seg('activo').check();
  await p.click('[data-accion="seguimiento-guardar"]');
  await p.waitForFunction(() => document.querySelector('[data-wb="seg-error"]').textContent.includes('Para activar'));
  ok('3.4 activar sin plantilla: la base lo rechaza y la base sigue apagada', await p.evaluate(() => window.__bd.activo === false && window.__bd.version === 1));

  // 4. guardar bien
  await seg('activo').uncheck(); await seg('horas').fill('72'); await seg('max_mensajes').fill('3'); await seg('plantilla').fill('seguimiento_bbm_es'); await seg('idioma').fill('es');
  await p.locator('[data-seg-var="nombre"]').check(); await motivo('plantilla aprobada en Meta');
  await p.click('[data-accion="seguimiento-guardar"]');
  await p.waitForFunction(() => window.__toast === 'Seguimiento guardado.');
  await p.waitForFunction(() => document.querySelector('[data-wb="seg-version"]').textContent.includes('Versión 2'));
  ok('4.1 guardado: toast, versión 2 releída de la base, motivo vacío y el historial lleva dos renglones',
    (await seg('motivo').inputValue()) === '' && (await p.locator('[data-seg-version]').count()) === 2 && await p.evaluate(() => window.__bd.horas === 72 && window.__bd.max_mensajes === 3 && JSON.stringify(window.__bd.vars) === '["nombre"]'));
  ok('4.2 sigue apagado (nace apagado y activarlo es otro gesto): el aviso lo dice', (await p.textContent('[data-wb="seg-aviso"]')).includes('apagado'));
  await seg('activo').check(); await motivo('lo enciendo');
  await p.click('[data-accion="seguimiento-guardar"]');
  await p.waitForFunction(() => document.querySelector('[data-wb="seg-aviso"]').textContent.includes('activado'));
  ok('4.3 activarlo con plantilla funciona y el aviso pasa a «activado»', await p.evaluate(() => window.__bd.activo === true && window.__bd.version === 3));

  // 5. versión vieja (otro admin guardó entremedias)
  await p.evaluate(() => { window.__bd.version = 9; });
  await seg('horas').fill('96'); await motivo('con la versión vieja');
  await p.click('[data-accion="seguimiento-guardar"]');
  await p.waitForFunction(() => document.querySelector('[data-wb="seg-error"]').textContent.length > 0);
  ok('5.1 otra persona guardó: se enseña el mensaje de la base y lo escrito NO se pierde', (await p.textContent('[data-wb="seg-error"]')).includes('Otra persona guardó') && (await seg('horas').inputValue()) === '96');
  await p.click('[data-accion="seguimiento-recargar"]');
  await p.waitForFunction(() => document.querySelector('[data-wb="seg-version"]').textContent.includes('Versión 9'));
  ok('5.2 «Descartar los cambios» vuelve a leer la base (versión 9, horas 72)', (await seg('horas').inputValue()) === '72');

  // 6. sin permiso
  await p.evaluate(() => { window.__modo = 'sin_permiso'; });
  await p.click('[data-accion="seguimiento-recargar"]');
  await p.waitForFunction(() => document.querySelector('[data-wb="seg-error"]').textContent.length > 0);
  ok('6.1 sin permiso o con el módulo apagado: mensaje en llano, sin jerga', (await p.textContent('[data-wb="seg-error"]')).includes('No tienes permiso'));

  // 7. lo que viene de la base se pinta como texto
  await p.evaluate(() => { window.__modo = 'bien'; window.__bd.plantilla = '<img src=x onerror=window.__pwned=1>'; window.__versiones.push({ version: 10, cuando: 'x', quien: '<b>q</b>', motivo: '<img src=x onerror=window.__pwned=1>' }); });
  await p.click('[data-accion="seguimiento-recargar"]');
  await p.waitForFunction(() => document.querySelectorAll('[data-seg-version]').length >= 4);
  ok('7.1 un valor o un motivo con HTML se pinta como texto: no se ejecuta nada ni aparece un <img>', await p.evaluate(() => !window.__pwned && !document.querySelector('[data-wb="seg-historial"] img') && !document.querySelector('[data-wb="seg-historial"] b')));

  // 8. no rompe la ficha de arriba ni escribe en tablas
  ok('8.1 la pantalla solo llama a RPC (lectura de la ficha, historial y las dos del seguimiento)', (await p.evaluate(() => window.__llamadas.map((x) => x.n))).every((x) => /^wab_(ficha_(datos|historial)|seguimiento_(datos|guarda))$/.test(x)));
  ok('8.2 el botón de guardar la ficha sigue enganchado a su acción (data-accion="guardar") y el del seguimiento a la suya', (await p.locator('[data-accion="guardar"]').count()) === 1 && (await p.locator('[data-accion="seguimiento-guardar"]').count()) === 1);

  // 9. móvil
  await p.evaluate(() => { window.__bd.plantilla = 'seguimiento_bbm_es'; });
  await p.click('[data-accion="seguimiento-recargar"]');
  await p.screenshot({ path: SHOT.replace('.png', '_1440.png'), fullPage: false });
  await p.setViewportSize({ width: 390, height: 900 });
  await p.locator('[data-wb="seccion-seguimiento"]').scrollIntoViewIfNeeded();
  await p.screenshot({ path: SHOT.replace('.png', '_390.png'), fullPage: false });
  const sobran = await p.evaluate(() => [...document.querySelectorAll('[data-wb=seccion-seguimiento], [data-wb=seccion-seguimiento] *')].filter((e) => e.getBoundingClientRect().right > 392).slice(0, 4).map((e) => e.tagName + '.' + e.className));
  ok('9.1 a 390 px la sección de seguimiento cabe (con el border-box del preflight de Tailwind; el resto de la cáscara no está en el harness: se mira también en la instancia real)', sobran.length === 0, JSON.stringify(sobran));
  ok('10.1 sin errores de JS en la página', errores.length === 0, errores.join(' | '));
  await b.close();
  console.log(`\n${n - fallos}/${n} ${fallos ? 'FALLAN ' + fallos : 'ok'}`);
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
