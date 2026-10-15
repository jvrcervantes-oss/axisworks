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
// AXW_CSS_DIST=<paquete construido>: la piel de la instancia para las capturas (como setup_reservas.harness.cjs). Sin ella no cambia nada de lo que se mide.
const DIST = process.env.AXW_CSS_DIST || '';
const CSS_PIEL = DIST ? ['tw.css', 'shell.css'].map(f => fs.readFileSync(path.join(DIST, 'assets', f), 'utf8')).join(' ') : '';
const PIEL_VARS = (() => {
  if (!DIST) return '';
  const m = /\bp=(\{[^}]*\});for\(var k in p\)s\.setProperty\("--tema-"\+k/.exec(fs.readFileSync(path.join(DIST, 'contracts', 'assets', 'instancia.js'), 'utf8'));
  return m ? ':root{' + Object.entries(JSON.parse(m[1])).map(([k, v]) => '--tema-' + k + ':' + v).join(';') + '}' : '';
})();
const FUENTES = DIST && fs.existsSync(path.join(DIST, 'assets', 'fonts', 'fonts.css')) ? fs.readFileSync(path.join(DIST, 'assets', 'fonts', 'fonts.css'), 'utf8') : '';
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
  if (n.startsWith('from:usuarios')) {   // «Quién lo usa» (S14) también se edita aquí, en línea
    if (n.endsWith(':lista')) return { data: JSON.parse(JSON.stringify((b.usuarios || []).filter(u => a.activo === undefined || u.activo === a.activo))), error: null };
    const u = (b.usuarios || []).find(x => x.user_id === a.user_id);
    return { data: u ? JSON.parse(JSON.stringify(u)) : null, error: null };
  }
  if (n.startsWith('from:')) return { data: null, error: null };
  if (n === 'usuario_guarda_permisos') {
    const u = (b.usuarios || []).find(x => x.user_id === a.p_user_id);
    if (!u) return err('P0002');
    u.herramientas = a.p_cambios.herramientas.slice();
    const pu = b.d.pasos.find(x => x.clave === 'usuarios'); if (pu) pu.hecho = b.usuarios.some(x => x.activo && x.rol !== 'super_admin' && x.herramientas.includes('reservas-producto'));
    return { data: null, error: null };
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
const pagina = idioma => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:sans-serif}main{padding:16px}.hidden{display:none}[hidden]{display:none!important}</style><style>${CSS_PIEL}</style><style>${FUENTES}${PIEL_VARS}</style></head><body class="${CSS_PIEL ? 'lw-listo bg-background' : ''}">
<main><section data-lw-panel="puesta"><div id="lw-aj-puesta"><p>…</p></div></section></main>
<script>
window.__sinTrad = []; window.__errores = []; window.addEventListener('error', function (e) { window.__errores.push(String(e.message)); });
function cadena(t) { var f = {}; var q = { select: function () { return q; }, eq: function (c, v) { f[c] = v; return q; }, maybeSingle: function () { return window.__srv('from:' + t, f); },
  then: function (a, b) { return window.__srv('from:' + t + ':lista', f).then(a, b); } }; return q; }
window.AXW_MAPA_MODULOS = { h: { facturas: 'facturas', recibos: 'recibos', 'reservas-producto': 'reservas-producto' }, o: ['reservas-producto'] };
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
  await p.route('**/*', r => {
    const u = new URL(r.request().url());
    if (DIST && u.pathname.startsWith('/assets/fonts/')) {   // las letras de la piel, para que la captura sea la de la instancia
      const f = path.join(DIST, u.pathname);
      return fs.existsSync(f) ? r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    }
    return r.fulfill({ status: 200, contentType: 'text/html', body: pagina(idioma) });
  });
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
  // S10 (owner 15-oct: «si le doy a change… me abra un pop up con la info»): ventana, no editor dentro de la tarjeta
  const alto0 = await p.$eval('[data-pm-fila="impuesto_pkp"]', e => e.getBoundingClientRect().height);
  await p.click('[data-pm-fila="impuesto_pkp"] [data-accion="pm-editar"]');
  ok('S10: «Configurar» abre una VENTANA modal con el editor dentro', await p.$eval('[data-pm-fila="impuesto_pkp"] [data-pm-editor]', e => !!e.closest('dialog[open]') && e.closest('dialog').matches(':modal')));
  ok('S10: la tarjeta no crece al abrir (nada se despliega dentro de la página)', Math.abs((await p.$eval('[data-pm-fila="impuesto_pkp"]', e => e.getBoundingClientRect().height)) - alto0) < 1);
  ok('S10: la ventana dice qué es: módulo, paso y para qué sirve', (await txt(p, 'dialog[data-pm-ventana="impuesto_pkp"] h2')) === '¿La empresa cobra impuesto?' && !!(await p.$('dialog[data-pm-ventana="impuesto_pkp"][aria-labelledby]')),
     await txt(p, 'dialog[data-pm-ventana="impuesto_pkp"] h2'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  ok('S10: Esc sin tocar nada cierra, la ventana sale del DOM y el foco vuelve a «Configurar»', !(await p.$('dialog[data-pm-ventana]'))
     && (await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-accion'))) === 'pm-editar');
  await p.click('[data-pm-fila="impuesto_pkp"] [data-accion="pm-editar"]');
  ok('el paso se edita con el MISMO componente del asistente', !!(await p.$('[data-pm-fila="impuesto_pkp"] [data-axw-campo="reservas_sin_impuesto"]')));
  await p.check('[data-axw-campo="reservas_sin_impuesto"] input[value="no"]');
  await p.click('[data-pm-fila="impuesto_pkp"] [data-accion="pm-guardar"]'); await p.waitForTimeout(400);
  const g1 = b.llamadas.filter(x => x[0] === 'ajustes_config_guardar')[0];
  ok('primer valor: se guarda sin motivo', g1 && g1[1].p_clave === 'reservas_sin_impuesto' && g1[1].p_valor === 'no' && !g1[1].p_motivo, JSON.stringify(g1 && g1[1]));
  ok('se relee y el paso sale «Hecho»', (await txt(p, '[data-pm-fila="impuesto_pkp"] [data-pm-hecho]')) === 'Hecho');
  ok('S10: guardado, la ventana se cierra y el foco vuelve al «Cambiar» de ese paso', !(await p.$('dialog[data-pm-ventana]'))
     && (await p.evaluate(() => { const a = document.activeElement; return a && a.getAttribute('data-accion') === 'pm-editar' && a.closest('[data-pm-fila]').getAttribute('data-pm-fila'); })) === 'impuesto_pkp');
  await p.click('[data-pm-fila="impuesto_pkp"] [data-accion="pm-editar"]');
  await p.check('[data-axw-campo="reservas_sin_impuesto"] input[value="si"]');
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
  await p.check('[data-axw-campo="precio_incluye_impuesto"] input[value="si"]');
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
  // «Quién lo usa» (S14, revisor 13-oct): en Ajustes el mismo componente se edita en línea; guarda la lista entera de la persona releída
  {
    const bq = base('sin_configurar');
    bq.d.pasos.push({ modulo: 'reservas-producto', clave: 'usuarios', obligatorio: true, irreversible: false, hecho: false, donde: '/usuarios/', falta: { codigo: 'sin_usuarios', campos: [] } });
    bq.usuarios = [
      { user_id: 'u-dion', nombre: 'Dion', email: 'd@x.test', rol: 'super_admin', activo: true, herramientas: [], creado_por: null },
      { user_id: 'u-kadek', nombre: 'Kadek', email: 'k@x.test', rol: 'agente', activo: true, herramientas: ['facturas'], creado_por: 'dion' },
      { user_id: 'u-prueba', nombre: 'Pruebas', email: 'p@x.test', rol: 'admin', activo: true, herramientas: [], creado_por: 'estudio:cuenta-pruebas' }];
    ({ p, ctx } = await abre(nav, bq));
    await p.click('[data-pm-fila="usuarios"] [data-accion="pm-editar"]');
    await p.waitForSelector('[data-axw-quien-usuario]', { timeout: 8000 }).catch(() => {});
    ok('S14 en Ajustes: la lista sin la cuenta de pruebas y una casilla por persona', (await p.$$('[data-axw-quien-usuario]')).length === 1 && !(await p.$('[data-axw-quien-usuario="u-prueba"]')));
    await p.click('[data-pm-fila="usuarios"] [data-accion="pm-guardar"]'); await p.waitForTimeout(300);
    ok('S14 en Ajustes: sin cambios dice qué hacer y no escribe', /Enciende a alguien/.test((await txt(p, '[data-pm-estado="usuarios"]')) || '')
       && !bq.llamadas.some(x => x[0] === 'usuario_guarda_permisos'));
    await p.click('[data-axw-quien-usuario="u-kadek"]', { force: true });
    await p.click('[data-pm-fila="usuarios"] [data-accion="pm-guardar"]'); await p.waitForTimeout(500);
    const g = bq.llamadas.filter(x => x[0] === 'usuario_guarda_permisos');
    ok('S14 en Ajustes: una llamada con el array entero de Kadek más esta herramienta', g.length === 1 && JSON.stringify(g[0][1].p_cambios.herramientas) === '["facturas","reservas-producto"]', JSON.stringify(g));
    ok('S14 en Ajustes: tras guardar, la fila dice Hecho (lo dice la base)', /Hecho/.test((await txt(p, '[data-pm-fila="usuarios"]')) || ''));
    ok('S14 en Ajustes: sin errores de página', (await p.evaluate(() => window.__errores)).length === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
    await ctx.close();
  }
  await nav.close();
  console.log(fallos ? 'FALLAN ' + fallos : 'TODO BIEN — ajustes_puesta.harness.cjs');
  process.exit(fallos ? 1 : 0);
})();
