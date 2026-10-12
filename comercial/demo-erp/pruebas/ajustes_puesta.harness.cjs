// node comercial/demo-erp/pruebas/ajustes_puesta.harness.cjs [carpeta_capturas]
// Arnés de Ajustes › Configurar módulos (F3 Entrega 1, bbm-p18-front, 12-oct-2026; sustituye al de la Puesta en marcha del 11-oct). ajustes_puesta.js +
// setup_modulos.js + setup_pasos.js REALES en Chromium, dentro de un panel como el que pone build.py, con la base SIMULADA a partir del doble de Backend
// y con estado. Mide: una sección por módulo con el estado que da la base; los pasos con el mismo componente que el asistente; el primer valor sin
// motivo y el cambio con motivo; un irreversible sin hacer lleva al asistente y hecho sale «Fijado»; un paso de otra pantalla lleva a ella; quien no
// configura ve solo el estado; un fallo de lectura se dice con Reintentar; respuesta perdida sin reenviar; es/en/id sin español; 390 px sin scroll.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const EXE = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const AQUI = path.join(__dirname, '..');
const DOBLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'doble_modulos_setup_estado.json'), 'utf8')).casos;
const JS = ['setup_modulos.js', 'setup_pasos.js', 'ajustes_puesta.js'].map(f => fs.readFileSync(path.join(AQUI, f), 'utf8'));
const SHOT = process.argv[2];
let fallos = 0;
const ok = (n, c, x = '') => { if (!c) { fallos++; console.log('FALLA  ' + n + (x ? ' -> ' + x : '')); } else console.log('ok     ' + n); };

function base(caso, o = {}) { return { d: JSON.parse(JSON.stringify(DOBLE[caso])), o, llamadas: [], valores: o.valores || {}, perdidas: o.perdidas || 0 }; }
function servidor(b, n, a) {
  b.llamadas.push([n, a]);
  const err = (code, hint) => ({ data: null, error: { code, hint: hint || null, message: 'x' } });
  if (n === 'modulos_setup_estado') {
    if (b.o.noExiste) return err('PGRST202');
    b.d.modulos.forEach(m => { const pend = b.d.pasos.filter(p => p.modulo === m.modulo && p.obligatorio && !p.hecho); if (b.d.puede_configurar) { m.estado = pend.length ? 'sin_configurar' : 'configurado'; m.falta = pend.length ? pend[0].clave : null; } });
    b.d.pasos.forEach(p => { if (p.hecho) p.falta = null; });
    return { data: JSON.parse(JSON.stringify(b.d)), error: null };
  }
  if (n === 'ajustes_config_datos') return { data: { valores: Object.assign({}, b.valores), puede_escribir: true }, error: null };
  if (n === 'ajustes_config_guardar') {
    if (b.perdidas > 0) { b.perdidas--; return { red: true }; }
    if (Object.prototype.hasOwnProperty.call(b.valores, a.p_clave) && (!a.p_motivo || (String(a.p_motivo).match(/\p{L}/gu) || []).length < 3)) return err('22023', 'motivo');
    b.valores[a.p_clave] = a.p_valor;
    const p = b.d.pasos.find(x => x.clave === ({ reservas_sin_impuesto: 'impuesto_pkp', precio_incluye_impuesto: 'precio_con_impuesto' })[a.p_clave]); if (p) p.hecho = true;
    return { data: { cambiado: true }, error: null };
  }
  return err('42883');
}
const pagina = idioma => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:sans-serif}</style></head><body>
<main><section data-lw-panel="puesta"><div id="lw-aj-puesta"><p>…</p></div></section></main>
<script>
window.__sinTrad = []; window.__errores = []; window.addEventListener('error', function (e) { window.__errores.push(String(e.message)); });
function cadena() { var q = { select: function () { return q; }, eq: function () { return q; }, maybeSingle: function () { return Promise.resolve({ data: null, error: null }); } }; return q; }
var sb = { rpc: function (n, a) { return window.__srv(n, a || {}); }, from: cadena };
window.LW_AUTH = Promise.resolve({ sb: sb }); window.lwDatos = function (n, a) { return sb.rpc(n, a); };
window.LW_EN = {}; window.LW_ID = {}; window.__idioma = '${idioma}';
window.lwT = function (s, hu) { s = String(s); var d = window.__idioma === 'en' ? window.LW_EN : window.__idioma === 'id' ? window.LW_ID : null; var v = s;
  if (d) { if (Object.prototype.hasOwnProperty.call(d, s)) v = d[s]; else if (!/^[\\s0-9.:]*$/.test(s)) window.__sinTrad.push(s); }
  if (hu) for (var k in hu) v = v.split('%' + k).join(hu[k]); return v; };
history.replaceState(null, '', '/ajustes/');
</script>${JS.map(j => '<script>' + j + '</script>').join('')}</body></html>`;
async function abre(nav, b, { idioma = 'es', ancho = 1440 } = {}) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 900 } });
  const p = await ctx.newPage();
  await p.route('**/*', r => r.fulfill({ status: 200, contentType: 'text/html', body: pagina(idioma) }));
  await p.exposeFunction('__srv', async (n, a) => { const r = servidor(b, n, a); if (r && r.red) throw new Error('Failed to fetch'); return r; });
  await p.goto('http://local.test/ajustes/'); await p.waitForTimeout(400);
  return { p, ctx };
}
const txt = async (p, sel) => (await p.$(sel)) ? (await p.$eval(sel, e => e.textContent.trim())) : null;

(async () => {
  const nav = await chromium.launch({ executablePath: EXE });
  let b = base('sin_configurar');
  let { p, ctx } = await abre(nav, b);
  ok('una sección por módulo encendido', (await p.$$('section[data-pm-modulo]')).length === 4);
  ok('el estado de cada módulo lo da la base', (await txt(p, '[data-pm-modulo="facturas"] [data-pm-hecho]')) === 'Sin configurar' && (await txt(p, '[data-pm-modulo="recibos"] [data-pm-hecho]')) === 'Configurado');
  ok('módulo sin configurar: «Abrir el asistente» a su módulo, con vuelta a Ajustes', (await p.getAttribute('[data-pm-asistente="facturas"]', 'href')) === '/ajustes/configurar/?modulo=facturas&vuelta=ajustes');
  ok('moneda hecha (irreversible): «Fijado», sin cambiar', (await txt(p, '[data-pm-fila="moneda"] [data-pm-hecho]')) === 'Fijado' && !(await p.$('[data-pm-fila="moneda"] [data-accion="pm-editar"]')));
  ok('prefijo sin hacer (irreversible): lleva al paso en el asistente', (await p.getAttribute('[data-pm-asistente-paso="prefijo"]', 'href')) === '/ajustes/configurar/?modulo=facturas&paso=prefijo&vuelta=ajustes');
  ok('flota (otra pantalla): enlace a /flota/', !!(await p.$('[data-pm-fila="flota"] a[href="/flota/"]')));
  await p.click('[data-pm-fila="impuesto_pkp"] [data-accion="pm-editar"]');
  ok('el paso se edita con el MISMO componente del asistente', !!(await p.$('[data-pm-fila="impuesto_pkp"] [data-axw-campo="reservas_sin_impuesto"]')));
  await p.selectOption('[data-axw-campo="reservas_sin_impuesto"]', 'no');
  await p.click('[data-pm-fila="impuesto_pkp"] [data-accion="pm-guardar"]'); await p.waitForTimeout(400);
  const g1 = b.llamadas.filter(x => x[0] === 'ajustes_config_guardar')[0];
  ok('primer valor: se guarda sin motivo', g1 && g1[1].p_clave === 'reservas_sin_impuesto' && g1[1].p_valor === 'no' && !g1[1].p_motivo, JSON.stringify(g1 && g1[1]));
  ok('se relee y el paso sale «Hecho»', (await txt(p, '[data-pm-fila="impuesto_pkp"] [data-pm-hecho]')) === 'Hecho');
  await p.click('[data-pm-fila="impuesto_pkp"] [data-accion="pm-editar"]');
  await p.selectOption('[data-axw-campo="reservas_sin_impuesto"]', 'si');
  await p.click('[data-pm-fila="impuesto_pkp"] [data-accion="pm-guardar"]'); await p.waitForTimeout(200);
  ok('cambiar lo guardado sin motivo: lo dice y no envía', ((await txt(p, '[data-pm-estado="impuesto_pkp"]')) || '').includes('motivo') && b.llamadas.filter(x => x[0] === 'ajustes_config_guardar').length === 1);
  await p.fill('[data-pm-fila="impuesto_pkp"] [data-pm="motivo"]', 'Lo confirmó el gestor');
  await p.click('[data-pm-fila="impuesto_pkp"] [data-accion="pm-guardar"]'); await p.waitForTimeout(400);
  ok('con motivo, se guarda', (b.llamadas.filter(x => x[0] === 'ajustes_config_guardar')[1] || [])[1] && b.llamadas.filter(x => x[0] === 'ajustes_config_guardar')[1][1].p_motivo === 'Lo confirmó el gestor');
  ok('sin errores de página', (await p.evaluate(() => window.__errores)).length === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
  if (SHOT) await p.screenshot({ path: path.join(SHOT, 'ajustes_1440.png'), fullPage: true });
  await ctx.close();

  // respuesta perdida: se relee, no se reenvía
  b = base('sin_configurar', { perdidas: 1 });
  ({ p, ctx } = await abre(nav, b));
  await p.click('[data-pm-fila="precio_con_impuesto"] [data-accion="pm-editar"]');
  await p.selectOption('[data-axw-campo="precio_incluye_impuesto"]', 'si');
  await p.click('[data-pm-fila="precio_con_impuesto"] [data-accion="pm-guardar"]'); await p.waitForTimeout(500);
  ok('red perdida sin guardar: «no se guardó» tras releer, un solo envío', (await txt(p, '[data-pm-estado="precio_con_impuesto"]')) === 'El ERP dice que no se guardó. Puedes volver a intentarlo.' && b.llamadas.filter(x => x[0] === 'ajustes_config_guardar').length === 1);
  await ctx.close();

  ({ p, ctx } = await abre(nav, base('no_configura')));
  ok('quien no configura: estado por módulo, sin pasos, y lo dice', (await p.$$('section[data-pm-modulo]')).length === 4 && !(await p.$('[data-pm-fila]')) && ((await txt(p, '#lw-aj-puesta')) || '').includes('Solo el administrador principal'));
  await ctx.close();
  ({ p, ctx } = await abre(nav, base('sin_configurar', { noExiste: true })));
  ok('función ausente: se dice, con Reintentar, nunca «todo configurado»', !!(await p.$('[data-accion="pm-reintentar"]')) && ((await txt(p, '#lw-aj-puesta')) || '').includes('todavía no está disponible'));
  await ctx.close();

  for (const idioma of ['en', 'id']) for (const ancho of [390, 1440]) {
    ({ p, ctx } = await abre(nav, base('sin_configurar'), { idioma, ancho }));
    await p.click('[data-pm-fila="impuesto_pkp"] [data-accion="pm-editar"]'); await p.waitForTimeout(100);
    const sin = await p.evaluate(() => window.__sinTrad.filter(s => !/^(NPWP|IDR|EUR|USD)$/.test(s)));
    ok(idioma + ' ' + ancho + ': ninguna frase sin traducir', sin.length === 0, sin.slice(0, 4).join(' | '));
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(idioma + ' ' + ancho + ': sin scroll horizontal', w <= ancho, String(w));
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'ajustes_' + idioma + '_' + ancho + '.png'), fullPage: true });
    await ctx.close();
  }
  await nav.close();
  console.log(fallos ? 'FALLAN ' + fallos : 'TODO BIEN — ajustes_puesta.harness.cjs');
  process.exit(fallos ? 1 : 0);
})();
