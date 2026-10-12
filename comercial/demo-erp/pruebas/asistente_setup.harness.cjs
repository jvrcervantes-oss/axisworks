// node comercial/demo-erp/pruebas/asistente_setup.harness.cjs [carpeta_capturas]
// Arnés del asistente de setup por módulo (F3 Entrega 1, bbm-p18-front, 12-oct-2026): asistente_setup.html + setup_modulos.js + setup_pasos.js REALES
// en Chromium, con la base SIMULADA a partir del doble de Backend (pruebas/doble_modulos_setup_estado.json) y CON ESTADO: lo que se guarda cambia lo
// que devuelve modulos_setup_estado. Mide: el recorrido de Facturas (empresa → prefijo con confirmación tecleada → «listo» → siguiente módulo), la
// moneda de «base» delante cuando falta, el primer valor sin motivo y el cambio con motivo, la máquina de duda (respuesta perdida: guardado y no
// guardado, sin reenviar), errores por código, quien no configura, función ausente, 390 px sin scroll horizontal, es/en/id sin español. La base real NO se toca.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const EXE = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const AQUI = path.join(__dirname, '..');
const DOBLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'doble_modulos_setup_estado.json'), 'utf8')).casos;
const HTML = fs.readFileSync(path.join(AQUI, 'asistente_setup.html'), 'utf8').split('<!--AXW_SCRIPT-->');
const NUCLEO = fs.readFileSync(path.join(AQUI, 'setup_modulos.js'), 'utf8');
const PASOS = fs.readFileSync(path.join(AQUI, 'setup_pasos.js'), 'utf8');
// AXW_CSS_DIST=<paquete construido>: mete tw.css y shell.css de la instancia para mirar la piel en las capturas (no cambia lo que se mide)
const CSS_PIEL = process.env.AXW_CSS_DIST ? ['tw.css', 'shell.css'].map(f => fs.readFileSync(path.join(process.env.AXW_CSS_DIST, 'assets', f), 'utf8')).join(' ') : '';
const SHOT = process.argv[2];
let fallos = 0;
const ok = (n, c, x = '') => { if (!c) { fallos++; console.log('FALLA  ' + n + (x ? ' -> ' + x : '')); } else console.log('ok     ' + n); };

// La base, con estado. caso: punto de partida del doble; o: fallos a inyectar.
function base(caso, o = {}) {
  const d = JSON.parse(JSON.stringify(DOBLE[caso]));
  return { d, o, llamadas: [], valores: o.valores || {}, sociedad: null, perdidas: o.perdidas || 0 };
}
function recalcula(b) {
  const pasos = b.d.pasos;
  const de = m => pasos.filter(p => p.modulo === m && p.obligatorio);
  b.d.modulos.forEach(m => { const pend = de(m.modulo).filter(p => !p.hecho); m.estado = pend.length ? 'sin_configurar' : 'configurado'; m.falta = pend.length ? pend[0].clave : null; });
  pasos.forEach(p => { if (p.hecho) p.falta = null; if (p.clave === 'sociedad' || p.clave === 'prefijo') p.ref = b.sociedad ? b.sociedad.clave : null; });
  const pre = pasos.find(p => p.clave === 'prefijo');
  if (pre && !pre.hecho) pre.falta = b.sociedad ? { codigo: 'sin_prefijo', campos: ['prefijo_serie'] } : { codigo: 'sin_sociedad', campos: [] };
}
function servidor(b, n, a) {
  b.llamadas.push([n, a]);
  const o = b.o, err = (code, hint, message) => ({ data: null, error: { code, hint: hint || null, message: message || 'x' } });
  if (n === 'modulos_setup_estado') {
    if (o.noExiste) return err('PGRST202', null, 'Could not find the function public.modulos_setup_estado');
    recalcula(b);
    if (!b.d.puede_configurar) return { data: Object.assign({}, b.d, { pasos: [] }), error: null };
    return { data: JSON.parse(JSON.stringify(b.d)), error: null };
  }
  if (n === 'ajustes_config_datos') return { data: { valores: Object.assign({}, b.valores), puede_escribir: true }, error: null };
  const guarda = () => {
    if (b.perdidas > 0) { b.perdidas--; return { perdida: true }; }   // la red se pierde DESPUÉS de que la base guardó (o.guardaAntes) o antes
    return null;
  };
  if (n === 'sociedad_guarda') {
    if (o.prefijoFijo && a.p_datos && a.p_datos.prefijo_serie) return err('55000', 'prefijo_fijo');
    const g = guarda();
    if (g && !o.guardaAntes) return { red: true };
    if (a.p_datos.prefijo_serie) {
      if (!a.p_confirmo) return err('22023', 'falta_confirmo');
      b.sociedad.prefijo_serie = a.p_datos.prefijo_serie; b.d.pasos.find(p => p.clave === 'prefijo').hecho = true;
    } else {
      b.sociedad = Object.assign({ clave: a.p_clave }, a.p_datos); b.d.pasos.find(p => p.clave === 'sociedad').hecho = true;
    }
    return g ? { red: true } : { data: { ok: true }, error: null };
  }
  if (n === 'ajustes_config_guardar') {
    const existia = Object.prototype.hasOwnProperty.call(b.valores, a.p_clave);
    if (existia && (!a.p_motivo || (String(a.p_motivo).match(/\p{L}/gu) || []).length < 3)) return err('22023', 'motivo');
    if (a.p_clave === 'moneda' && !a.p_confirmo) return err('22023', 'falta_confirmo');
    b.valores[a.p_clave] = a.p_valor;
    const mapa = { moneda: 'moneda', reservas_sin_impuesto: 'impuesto_pkp', precio_incluye_impuesto: 'precio_con_impuesto' };
    const p = b.d.pasos.find(x => x.clave === mapa[a.p_clave]); if (p) p.hecho = true;
    return { data: { cambiado: true }, error: null };
  }
  return err('42883', null, 'desconocida ' + n);
}
const pagina = (idioma, url) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:sans-serif}main{padding:16px}.hidden{display:none}</style><style>${CSS_PIEL}</style></head><body class="${CSS_PIEL ? 'lw-listo bg-background' : ''}"><main>${HTML[0]}</main>
<script>
history.replaceState(null, '', '${url}');
window.__sinTrad = []; window.__errores = [];
window.addEventListener('error', function (e) { window.__errores.push(String(e.message)); });
function cadena(t) { var f = {}; var q = { select: function () { return q; }, eq: function (c, v) { f[c] = v; return q; }, maybeSingle: function () { return window.__srv('from:' + t, f); } }; return q; }
var sb = { rpc: function (n, a) { return window.__srv(n, a || {}); }, from: cadena };
window.LW_AUTH = Promise.resolve({ sb: sb });
window.lwDatos = function (n, a) { return sb.rpc(n, a); };
window.LW_EN = {}; window.LW_ID = {}; window.__idioma = '${idioma}';
window.lwT = function (s, hu) { s = String(s); var d = window.__idioma === 'en' ? window.LW_EN : window.__idioma === 'id' ? window.LW_ID : null; var v = s;
  if (d) { if (Object.prototype.hasOwnProperty.call(d, s)) v = d[s]; else if (!/^[\\s0-9.:]*$/.test(s)) window.__sinTrad.push(s); }
  if (hu) for (var k in hu) v = v.split('%' + k).join(hu[k]); return v; };
</script>
<script>${NUCLEO}</script><script>${PASOS}</script>${HTML[1]}</body></html>`;

async function abre(nav, b, { idioma = 'es', url = '/ajustes/configurar/?modulo=facturas', ancho = 1440 } = {}) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 900 } });
  const p = await ctx.newPage();
  await p.route('**/*', r => r.fulfill({ status: 200, contentType: 'text/html', body: pagina(idioma, url) }));
  await p.exposeFunction('__srv', async (n, a) => {
    if (n.startsWith('from:')) return { data: b.sociedad ? Object.assign({}, b.sociedad) : null, error: null };
    const r = servidor(b, n, a);
    if (r && r.red) throw Object.assign(new Error('Failed to fetch'));
    return r;
  });
  await p.goto('http://local.test' + url);
  await p.waitForTimeout(400);
  return { p, ctx };
}
const txt = async (p, sel) => (await p.$(sel)) ? (await p.$eval(sel, e => e.textContent.trim())) : null;
const clic = async (p, accion) => { await p.click('[data-axw-accion="' + accion + '"]'); await p.waitForTimeout(250); };
const llamadas = (b, n) => b.llamadas.filter(x => x[0] === n);

(async () => {
  const nav = await chromium.launch({ executablePath: EXE });

  // 1. Recorrido de Facturas desde «sin configurar»: empresa → prefijo (confirmación tecleada) → listo → siguiente módulo
  let b = base('sin_configurar');
  let { p, ctx } = await abre(nav, b);
  ok('abre en el primer paso no hecho (empresa)', (await p.getAttribute('[data-axw-paso]', 'data-axw-paso')) === 'sociedad');
  ok('«Paso 1 de 2» (la moneda de base ya está hecha: no cuenta)', (await txt(p, '[data-axw-as="progreso"]')) === 'Paso 1 de 2', await txt(p, '[data-axw-as="progreso"]'));
  ok('la URL lleva el paso', (await p.evaluate(() => location.search)).includes('paso=sociedad'));
  await clic(p, 'enviar');
  ok('vacío: dice qué falta y no envía', (await txt(p, '[data-axw-as="error"]')).includes('Razón social') && llamadas(b, 'sociedad_guarda').length === 0);
  await p.fill('[data-axw-campo="razon"]', 'PT Bali Best Motor'); await p.fill('[data-axw-campo="domicilio"]', 'Jl. Raya 1, Denpasar'); await p.fill('[data-axw-campo="npwp"]', '01.234.567.8-901.000');
  await clic(p, 'enviar'); await p.waitForTimeout(300);
  const sg = llamadas(b, 'sociedad_guarda')[0];
  ok('alta de empresa: sociedad_guarda con p_nueva y una clave válida', sg && sg[1].p_nueva === true && /^[a-z][a-z0-9_]{2,}$/.test(sg[1].p_clave), JSON.stringify(sg && sg[1]));
  ok('pasa al prefijo, «Paso 2 de 2»', (await p.getAttribute('[data-axw-paso]', 'data-axw-paso')) === 'prefijo' && (await txt(p, '[data-axw-as="progreso"]')) === 'Paso 2 de 2');
  await p.fill('[data-axw-campo="prefijo_serie"]', 'bbm');
  ok('el prefijo se escribe en mayúsculas y enseña el ejemplo', (await p.inputValue('[data-axw-campo="prefijo_serie"]')) === 'BBM' && (await txt(p, '[data-axw-ejemplo="prefijo"]')).includes('BBM-'));
  await clic(p, 'enviar');
  ok('irreversible: pantalla de confirmación con el valor en grande', (await txt(p, '[data-axw-confirma="valor"]')) === 'BBM-…');
  ok('«Fijar» desactivado hasta teclear el prefijo', await p.$eval('[data-axw-accion="fijar"]', e => e.disabled));
  await p.fill('[data-axw-campo="teclea"]', 'BBX');
  ok('lo tecleado distinto no deja fijar', await p.$eval('[data-axw-accion="fijar"]', e => e.disabled));
  await p.fill('[data-axw-campo="teclea"]', 'bbm');
  ok('el botón nombra el efecto', (await txt(p, '[data-axw-accion="fijar"]')) === 'Fijar el prefijo: BBM');
  await clic(p, 'fijar'); await p.waitForTimeout(300);
  const pf = llamadas(b, 'sociedad_guarda')[1];
  ok('fijar manda p_confirmo y solo el prefijo, sobre la empresa dada de alta', pf && pf[1].p_confirmo === true && pf[1].p_datos.prefijo_serie === 'BBM' && pf[1].p_clave === sg[1].p_clave, JSON.stringify(pf && pf[1]));
  ok('«Facturas está listo» solo porque la base lo dice', (await txt(p, '[data-axw-estado="listo"]')) === 'Facturas está listo.');
  ok('ofrece el siguiente módulo por configurar', (await txt(p, '[data-axw-accion="siguiente-modulo"]')) === 'Configurar Reservas de producto');
  ok('sin errores de página', (await p.evaluate(() => window.__errores)).length === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
  if (SHOT) await p.screenshot({ path: path.join(SHOT, 'listo_1440.png'), fullPage: true });
  await ctx.close();

  // 2. La moneda de «base» va delante si falta, sin valor elegido; reservas: el primer sí/no se guarda sin motivo
  b = base('sin_configurar'); b.d.pasos.find(x => x.clave === 'moneda').hecho = false;
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto' }));
  ok('moneda de base delante: «Paso 1 de 4»', (await p.getAttribute('[data-axw-paso]', 'data-axw-paso')) === 'moneda' && (await txt(p, '[data-axw-as="progreso"]')) === 'Paso 1 de 4', await txt(p, '[data-axw-as="progreso"]'));
  ok('la moneda empieza sin valor elegido', (await p.inputValue('[data-axw-campo="moneda"]')) === '');
  await p.selectOption('[data-axw-campo="moneda"]', 'IDR'); await clic(p, 'enviar');
  await p.fill('[data-axw-campo="teclea"]', 'IDR'); await clic(p, 'fijar'); await p.waitForTimeout(300);
  const mo = llamadas(b, 'ajustes_config_guardar')[0];
  ok('moneda: ajustes_config_guardar con p_confirmo y sin motivo (primer valor)', mo && mo[1].p_clave === 'moneda' && mo[1].p_valor === 'IDR' && mo[1].p_confirmo === true && !('p_motivo' in mo[1]), JSON.stringify(mo && mo[1]));
  ok('después, el sí/no del impuesto', (await p.getAttribute('[data-axw-paso]', 'data-axw-paso')) === 'impuesto_pkp');
  await p.selectOption('[data-axw-campo="reservas_sin_impuesto"]', 'no'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  const pk = llamadas(b, 'ajustes_config_guardar')[1];
  ok('«Sí, es PKP» guarda reservas_sin_impuesto = no, sin motivo ni p_confirmo', pk && pk[1].p_clave === 'reservas_sin_impuesto' && pk[1].p_valor === 'no' && !pk[1].p_confirmo && !pk[1].p_motivo, JSON.stringify(pk && pk[1]));
  await clic(p, 'atras');
  ok('Atrás vuelve al paso hecho y enseña «Hecho» y «Cambiar»', (await p.$('[data-axw-hecho]')) && (await p.$('[data-axw-accion="cambiar"]')));
  await clic(p, 'cambiar'); await p.selectOption('[data-axw-campo="reservas_sin_impuesto"]', 'si'); await clic(p, 'enviar');
  ok('cambiar un valor guardado pide motivo antes de enviar', (await txt(p, '[data-axw-as="error"]')).includes('motivo') && llamadas(b, 'ajustes_config_guardar').length === 2);
  await p.fill('[data-axw-campo="motivo"]', 'Lo confirmó el gestor'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  ok('con motivo, se guarda el cambio', (llamadas(b, 'ajustes_config_guardar')[2] || [])[1] && llamadas(b, 'ajustes_config_guardar')[2][1].p_motivo === 'Lo confirmó el gestor');
  await ctx.close();

  // 3. Máquina de duda: la red se pierde tras guardar → se relee y sigue; la red se pierde sin guardar → «no se guardó», sin reenviar
  for (const guardaAntes of [true, false]) {
    b = base('a_medias', { perdidas: 1, guardaAntes });
    b.sociedad = { clave: 'pt_bbm', razon: 'PT BBM' }; b.d.pasos.find(x => x.clave === 'sociedad').hecho = true;
    ({ p, ctx } = await abre(nav, b));
    await p.fill('[data-axw-campo="prefijo_serie"]', 'BBM'); await clic(p, 'enviar');
    await p.fill('[data-axw-campo="teclea"]', 'BBM'); await clic(p, 'fijar'); await p.waitForTimeout(500);
    const envios = llamadas(b, 'sociedad_guarda').length;
    if (guardaAntes) ok('duda, sí se guardó: se relee y da «listo», un solo envío', (await txt(p, '[data-axw-estado="listo"]')) === 'Facturas está listo.' && envios === 1, 'envíos ' + envios);
    else ok('duda, no se guardó: lo dice, un solo envío, nada en vuelo', (await txt(p, '[data-axw-as="error"]')) === 'El ERP dice que no se guardó. Puedes volver a intentarlo.' && envios === 1, (await txt(p, '[data-axw-as="error"]')) + ' / envíos ' + envios);
    await ctx.close();
  }

  // 4. Error con código: se lee por hint
  b = base('a_medias', { prefijoFijo: true }); b.sociedad = { clave: 'pt_bbm', razon: 'PT BBM' };
  ({ p, ctx } = await abre(nav, b));
  await p.fill('[data-axw-campo="prefijo_serie"]', 'BBM'); await clic(p, 'enviar'); await p.fill('[data-axw-campo="teclea"]', 'BBM'); await clic(p, 'fijar'); await p.waitForTimeout(300);
  ok('55000 prefijo_fijo: el texto del código, sigue en la confirmación', ((await txt(p, '[data-axw-as="error"]')) || '').includes('ya no se puede cambiar') && (await p.$('[data-axw-confirma="valor"]')));
  await ctx.close();

  // 5. Quien no configura; 6. función que aún no existe
  ({ p, ctx } = await abre(nav, base('no_configura')));
  ok('quien no configura: «solo el administrador principal», sin pasos', ((await txt(p, '[data-axw-as="tarjeta"]')) || '').includes('Solo el administrador principal') && !(await p.$('[data-axw-paso]')));
  await ctx.close();
  ({ p, ctx } = await abre(nav, base('sin_configurar', { noExiste: true })));
  ok('función ausente: «no se ha podido mirar» con Reintentar, nunca «todo listo»', ((await txt(p, '[data-axw-as="tarjeta"]')) || '').includes('todavía no está disponible') && (await p.$('[data-axw-accion="releer"]')) && !(await p.$('[data-axw-estado="todo-listo"]')));
  await ctx.close();
  ({ p, ctx } = await abre(nav, base('configurado'), { url: '/ajustes/configurar/' }));
  ok('sin módulo y todo configurado: lo dice y lleva al inicio', !!(await p.$('[data-axw-estado="todo-listo"]')));
  await ctx.close();

  // 7. 390 px y los tres idiomas: sin scroll horizontal, sin español en en/id
  for (const idioma of ['es', 'en', 'id']) for (const ancho of [390, 1440]) {
    b = base('sin_configurar');
    ({ p, ctx } = await abre(nav, b, { idioma, ancho }));
    const anchoDoc = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(idioma + ' ' + ancho + ': sin scroll horizontal', anchoDoc <= ancho, String(anchoDoc));
    if (idioma !== 'es') {
      const sin = await p.evaluate(() => window.__sinTrad.filter(s => !/^(NPWP|IDR|EUR|USD)$/.test(s)));
      ok(idioma + ' ' + ancho + ': ninguna frase sin traducir', sin.length === 0, sin.slice(0, 4).join(' | '));
    }
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'paso_' + idioma + '_' + ancho + '.png'), fullPage: true });
    await ctx.close();
  }

  // 8. Inicio del asistente sin módulo (diseño del owner S03, 12-oct): lista de módulos encendidos con su estado, «Sigue donde lo dejaste»,
  //    los pendientes con su enlace de siempre (data-axw-modulo); 390/1440 sin scroll horizontal y sin español en en/id
  for (const idioma of ['es', 'en', 'id']) for (const ancho of [390, 1440]) {
    b = base('sin_configurar');
    ({ p, ctx } = await abre(nav, b, { idioma, ancho, url: '/ajustes/configurar/' }));
    const pend = b.d.modulos.filter(m => m.estado === 'sin_configurar' && b.d.pasos.some(x => x.modulo === m.modulo && x.obligatorio)).length;
    ok(idioma + ' ' + ancho + ' inicio: un enlace por módulo pendiente y «Sigue donde lo dejaste»', (await p.$$('[data-axw-modulo]')).length === pend && !!(await p.$('[data-axw-accion="seguir"]')),
       (await p.$$('[data-axw-modulo]')).length + ' de ' + pend);
    const anchoDoc = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(idioma + ' ' + ancho + ' inicio: sin scroll horizontal', anchoDoc <= ancho, String(anchoDoc));
    if (idioma !== 'es') {
      const sin = await p.evaluate(() => window.__sinTrad.filter(s => !/^(NPWP|IDR|EUR|USD)$/.test(s)));
      ok(idioma + ' ' + ancho + ' inicio: ninguna frase sin traducir', sin.length === 0, sin.slice(0, 4).join(' | '));
    }
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'inicio_' + idioma + '_' + ancho + '.png'), fullPage: true });
    await ctx.close();
  }

  await nav.close();
  console.log(fallos ? 'FALLAN ' + fallos : 'TODO BIEN — asistente_setup.harness.cjs');
  process.exit(fallos ? 1 : 0);
})();
