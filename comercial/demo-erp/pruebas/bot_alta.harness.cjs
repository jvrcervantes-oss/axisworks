// node comercial/demo-erp/pruebas/bot_alta.harness.cjs comercial/demo-erp/bot_alta.html [ruta/captura.png]
// Harness del alta del bot de WhatsApp (bbm-comodidad S4, 15-oct-2026, «1, 2 o 3 campos a rellenar por paso»): marcado + script reales de bot_alta.html
// con la base SIMULADA. Mide que el alta va en dos partes de 3 campos (a 1440 y 390), que «Atrás» y «Siguiente» no pierden lo escrito y que lo que se
// guarda es lo de siempre: UNA llamada wab_cliente_guarda con los cinco datos y el motivo.
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const RUTA = process.argv[2];
const SHOT = process.argv[3] || null;
const html = fs.readFileSync(RUTA, 'utf8');
const [marcado, script] = html.split('<!--AXW_SCRIPT-->');
let fallos = 0, n = 0;
const ok = (nombre, c, extra = '') => { n++; if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + nombre); };
const J = x => JSON.stringify(x);

const pagina = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title><style>*,::before,::after{box-sizing:border-box}</style></head><body>
${marcado}
<script>
window.__llamadas = [];
var TOPES = { razon_social: 200, nombre_negocio: 120, domicilio: 300, contacto_privacidad: 200, plazo_conservacion: 120 };
var DATOS = { cliente: null, faltan: ['razon_social', 'domicilio', 'contacto_privacidad', 'plazo_conservacion', 'nombre_negocio', 'aceptacion', 'marco'], marco: null,
  aceptaciones: [], aceptacion_vigente: null, terminos: { version: 'v3', texto: '', huella_mostrada: null }, topes: TOPES, puede_encender: false, modulo_activo: false };
var sb = {
  rpc: function (n, a) { window.__llamadas.push([n, a]);
    if (n === 'wab_cliente_guarda') { if (!a.p_motivo) return Promise.resolve({ data: null, error: { code: '22023', message: 'El motivo es obligatorio' } });
      // como la base (_wab_cliente_error): sin asteriscos. El mensaje NO nombra el campo, para medir que la pantalla no se guía por el texto
      if (Object.keys(a.p_datos).some(function (k) { return /[*<>]/.test(a.p_datos[k]) || !a.p_datos[k]; })) return Promise.resolve({ data: null, error: { code: '22023', message: 'Data tidak valid', hint: 'cliente_no_valido' } });
      DATOS.cliente = Object.assign({}, a.p_datos); return Promise.resolve({ data: { razon_social_cambia: false }, error: null }); }
    return Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }); }
};
window.LW_AUTH = Promise.resolve({ sb: sb });
window.lwDatos = function (n, a) { window.__llamadas.push([n, a]); return Promise.resolve({ data: JSON.parse(JSON.stringify(DATOS)), error: null }); };
window.lwT = function (s) { return String(s); };
window.toast = function (m) { window.__toast = m; };
</script>
<script>${script.replace(/^\s*<script>/, '').replace(/<\/script>\s*$/, '')}</script></body></html>`;

(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  for (const ancho of [1440, 390]) {
    const ctx = await b.newContext({ viewport: { width: ancho, height: 1000 } });
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', (e) => errores.push(String(e)));
    await p.route('https://inst.test/', (r) => r.fulfill({ contentType: 'text/html', body: pagina }));
    await p.goto('https://inst.test/');
    await p.waitForFunction(() => (document.querySelector('[data-ba="parte-linea"]') || {}).textContent);
    const cuenta = () => p.evaluate(() => [...document.querySelectorAll('[data-ba="seccion-alta"] input, [data-ba="seccion-alta"] select, [data-ba="seccion-alta"] textarea')]
      .filter(e => e.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })).map(e => e.getAttribute('data-campo')));
    const linea = () => p.textContent('[data-ba="parte-linea"]');
    const parte1 = await cuenta();
    ok(ancho + ' px · parte 1 «Tu empresa»: razón social, nombre y domicilio (3)', J(parte1) === J(['razon_social', 'nombre_negocio', 'domicilio']) && (await linea()).includes('Parte 1 de 2'), J(parte1));
    ok(ancho + ' px · parte 1: «Siguiente» a la vista; «Guardar» y «Atrás» no', await p.isVisible('[data-accion="alta-siguiente"]') && !(await p.isVisible('[data-accion="guardar-alta"]')) && !(await p.isVisible('[data-accion="alta-atras"]')));
    await p.fill('[data-campo="razon_social"]', 'PT Macan Asia Tenggara'); await p.fill('[data-campo="nombre_negocio"]', 'Bali Best Motorcycle'); await p.fill('[data-campo="domicilio"]', 'Jl. Raya Canggu 12, Bali');
    await p.click('[data-accion="alta-siguiente"]');
    const parte2 = await cuenta();
    ok(ancho + ' px · parte 2 «Privacidad»: contacto, plazo y el motivo que exige la base (3)', J(parte2) === J(['contacto_privacidad', 'plazo_conservacion', 'motivo']) && (await linea()).includes('Parte 2 de 2'), J(parte2));
    ok(ancho + ' px · «Siguiente» no ha guardado nada', !(await p.evaluate(() => window.__llamadas.some(x => x[0] === 'wab_cliente_guarda'))));
    await p.fill('[data-campo="contacto_privacidad"]', 'privacy@balibest.test');
    await p.click('[data-accion="alta-atras"]');
    ok(ancho + ' px · «Atrás» vuelve a la parte 1 con lo escrito', (await linea()).includes('Parte 1 de 2') && (await p.inputValue('[data-campo="razon_social"]')) === 'PT Macan Asia Tenggara');
    await p.click('[data-accion="alta-siguiente"]');
    ok(ancho + ' px · y otra vez a la parte 2 sin perder el contacto', (await p.inputValue('[data-campo="contacto_privacidad"]')) === 'privacy@balibest.test');
    await p.fill('[data-campo="plazo_conservacion"]', '24 meses desde el último mensaje');
    await p.click('[data-accion="guardar-alta"]');
    ok(ancho + ' px · sin motivo no se guarda y lo dice', !(await p.evaluate(() => window.__llamadas.some(x => x[0] === 'wab_cliente_guarda'))) && (await p.textContent('[data-ba="error"]')).includes('qué has cambiado'));
    await p.fill('[data-campo="motivo"]', 'Alta del negocio');
    await p.click('[data-accion="guardar-alta"]');
    await p.waitForFunction(() => window.__toast === 'Datos guardados.');
    const g = await p.evaluate(() => window.__llamadas.filter(x => x[0] === 'wab_cliente_guarda'));
    ok(ancho + ' px · guarda UNA vez con los cinco datos y el motivo, como siempre', g.length === 1 && J(Object.keys(g[0][1]).sort()) === J(['p_datos', 'p_motivo'])
       && J(Object.keys(g[0][1].p_datos).sort()) === J(['contacto_privacidad', 'domicilio', 'nombre_negocio', 'plazo_conservacion', 'razon_social']) && g[0][1].p_motivo === 'Alta del negocio', J(g));
    await p.waitForFunction(() => document.querySelector('[data-ba="parte-linea"]').textContent.includes('1'));
    ok(ancho + ' px · tras guardar se relee y vuelve a la parte 1 con lo guardado', (await linea()).includes('Parte 1 de 2') && (await p.inputValue('[data-campo="domicilio"]')) === 'Jl. Raya Canggu 12, Bali');
    await p.fill('[data-campo="razon_social"]', 'PT Macan * Asia'); await p.click('[data-accion="alta-siguiente"]');
    await p.fill('[data-campo="motivo"]', 'Cambio de razón social'); await p.click('[data-accion="guardar-alta"]');
    await p.waitForFunction(() => !document.querySelector('[data-ba="error"]').classList.contains('axw-oculto') || document.querySelector('[data-ba="parte-linea"]').textContent.includes('1'));
    ok(ancho + ' px · la base rechaza la razón social (con un mensaje que no la nombra): vuelve a la parte 1 por el campo, no por el texto', (await linea()).includes('Parte 1 de 2'), await linea());
    // en el orden de la base, campo a campo: con un < en la razón social y el contacto vacío, el rechazado es la razón social (parte 1)
    await p.fill('[data-campo="razon_social"]', 'PT Macan <Asia>'); await p.click('[data-accion="alta-siguiente"]');
    await p.fill('[data-campo="contacto_privacidad"]', ''); await p.click('[data-accion="guardar-alta"]');
    await p.waitForFunction(() => document.querySelector('[data-ba="parte-linea"]').textContent.includes('1'));
    ok(ancho + ' px · campo a campo en el orden de la base: un < en la razón social manda sobre el contacto vacío (vuelve a la parte 1)', (await linea()).includes('Parte 1 de 2'), await linea());
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(ancho + ' px · sin scroll horizontal', m.sw <= m.cw, J(m));
    ok(ancho + ' px · sin errores de JS', errores.length === 0, errores.join(' | '));
    console.log('  campos a la vista ' + ancho + ' px: parte 1 ' + J(parte1) + ' · parte 2 ' + J(parte2));
    if (SHOT) await p.screenshot({ path: SHOT.replace('.png', '_' + ancho + '.png'), fullPage: true });
    await ctx.close();
  }
  console.log('  toques: antes 6 campos a la vista + «Guardar»; ahora 3 + «Siguiente» + 3 + «Guardar» (un toque más, nunca más de 3 campos)');
  await b.close();
  console.log(`\n${n - fallos}/${n} ${fallos ? 'FALLAN ' + fallos : 'ok'}`);
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
