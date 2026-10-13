// node comercial/demo-erp/pruebas/setup_comun.harness.cjs [carpeta_capturas]
// Arnés de los pasos COMUNES (S10 negocio, S12 idiomas, S13 correo) y del Taller (S46: revisiones, recambios, mecánicos) — bbm-p31-front-comun, 12-oct-2026.
// asistente_setup.html + ajustes_puesta.js + setup_modulos.js + setup_pasos.js + setup_comun.js REALES en Chromium, con la base y la edge ajustes-correo
// SIMULADAS a partir del doble de Backend (pruebas/doble_comun.json = erp/plan_f3_comun_doble.json de bbm-p28, e33c2e68) y CON ESTADO. Mide: qué se manda
// y en qué orden, que solo se guarda lo que cambia, la duda de una respuesta perdida, 22023 sin hint sin código a la vista, idiomas según lo que trae el
// paquete, correo con y sin la clave del servidor, los enlaces del Taller y los «próximos», el mismo componente en Ajustes, una base SIN la 220000 (nada nuevo
// a la vista), un paso desconocido sin su código, y es/en/id a 390 y 1440 px sin scroll horizontal ni frases sin traducir. La base real NO se toca.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const EXE = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const AQUI = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(AQUI, 'asistente_setup.html'), 'utf8').split('<!--AXW_SCRIPT-->');
const JS = f => fs.readFileSync(path.join(AQUI, f), 'utf8').replace(/<\/script>/g, '<\\/script>');
const NUCLEO = JS('setup_modulos.js'), PASOS = JS('setup_pasos.js'), COMUN = JS('setup_comun.js'), PUESTA = JS('ajustes_puesta.js');
const DOBLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'doble_comun.json'), 'utf8'));
const SHOT = process.argv[2];
let fallos = 0;
const ok = (n, c, x = '') => { if (!c) { fallos++; console.log('FALLA  ' + n + (x ? ' -> ' + x : '')); } else console.log('ok     ' + n); };

// ── la base simulada (forma del doble de bbm-p28) ───────────────────────────────────────────────────────────────────────────────────────────
const IDIOMAS_OK = DOBLE.idiomas.guardar.listas_validas.map(l => l.join());
function base(o = {}) {
  return { o, llamadas: [], edge: [], valores: Object.assign({ moneda: 'IDR' }, o.valores || {}), correo: o.correo || { configurado: false },
    pideCodigo: o.pideCodigo !== false, falla: Object.assign({}, o.falla || {}), pierde: Object.assign({}, o.pierde || {}), taller: o.taller || {}, cats: (o.cats || []).map(c => Object.assign({}, c)) };
}
const err = (code, hint) => ({ data: null, error: { code, hint: hint || null, message: 'mensaje en español que el front NO lee' } });
function pasosDe(b) {
  const v = b.valores, faltan = [];
  if (!v.marca) faltan.push('marca');
  if (!v.zona_horaria) faltan.push('zona_horaria');
  const idiOk = Array.isArray(v.idiomas) && IDIOMAS_OK.includes(v.idiomas.join());
  const B = (clave, hecho, obligatorio, irreversible, falta) => ({ modulo: 'base', clave, hecho, obligatorio, irreversible, donde: '/ajustes/', modulo_requerido: null, ref: null, falta: hecho ? null : falta });
  const t = b.taller;
  const R = (clave, hecho, donde, falta) => ({ modulo: 'reservas-producto', clave, hecho, obligatorio: false, irreversible: false, donde, modulo_requerido: null, ref: null, falta: hecho ? null : falta });
  const comunes = b.o.sin220000 ? [B('moneda', true, true, true, null)] : [
    B('negocio', faltan.length === 0, true, false, { codigo: 'falta_dato', campos: faltan }),
    B('idiomas', idiOk, false, false, { codigo: 'falta_dato', campos: ['idiomas'] }),
    B('moneda', true, true, true, null),
    B('correo', !!b.correo.configurado, false, false, { codigo: 'sin_correo', campos: [] })];
  const reservas = b.o.sin220000 ? [] : [
    R('taller_revisiones', !!t.revisiones, '/taller/', { codigo: 'sin_lista_revision', campos: [] }),
    R('taller_recambios', !!t.recambios, '/taller/', { codigo: 'sin_recambios', campos: [] }),
    R('taller_mecanicos', !!t.mecanicos, '/usuarios/', { codigo: 'sin_usuarios', campos: [] })];
  const extra = b.o.pasoRaro ? [B('paso_raro', false, false, false, { codigo: 'falta_rara', campos: ['campo_raro'] })] : [];
  // N4: Gastos con su paso obligatorio de categorías (b.o.gastos)
  const G = (clave, hecho, falta) => ({ modulo: 'gastos', clave, hecho, obligatorio: true, irreversible: false, donde: '/gastos/', modulo_requerido: null, ref: null, falta: hecho ? null : falta });
  const gastos = b.o.gastos ? [G('categorias_gasto', b.cats.some(c => c.activa), { codigo: 'falta_dato', campos: ['categoria'] })] : [];
  return comunes.concat(extra, reservas, [R('usuarios', true, '/usuarios/', null)], gastos);
}
function estadoSetup(b) {
  const pasos = pasosDe(b);
  const mods = ['base', 'reservas-producto'].concat(b.o.gastos ? ['gastos'] : []).map(m => { const pend = pasos.filter(p => p.modulo === m && p.obligatorio && !p.hecho); return { modulo: m, estado: pend.length ? 'sin_configurar' : 'configurado', falta: pend.length ? pend[0].clave : null }; });
  return { puede_configurar: !b.o.noConfigura, moneda: 'IDR', monedas: ['IDR', 'EUR', 'USD'], modulos: mods, pasos: b.o.noConfigura ? [] : pasos };
}
const ZONAS = ['Asia/Makassar', 'Asia/Jakarta', 'Europe/Madrid', 'UTC'];
function guarda(b, a) {
  const k = a.p_clave, v = a.p_valor;
  if (k === 'idiomas') {
    if (!Array.isArray(v) || !IDIOMAS_OK.includes(v.join())) return err('22023', 'idiomas_no_validos');
  } else if (k === 'marca') {
    if (typeof v !== 'string' || v.length < 1 || v.length > 60 || /[<>]/.test(v)) return err('22023');
  } else if (k === 'zona_horaria') {
    if (!ZONAS.includes(v)) return err('22023');   // como la base: 22023 SIN hint
  } else return err('22023', 'clave_no_editable');
  const cambiado = JSON.stringify(b.valores[k]) !== JSON.stringify(v);
  b.valores[k] = v;
  return { data: { clave: k, valor: v, cambiado }, error: null };
}
function servidor(b, n, a) {
  b.llamadas.push([n, JSON.parse(JSON.stringify(a || {}))]);
  a = a || {};
  if (n === 'modulos_setup_estado') return { data: estadoSetup(b), error: null };
  if (n === 'ajustes_config_datos') return { data: { valores: Object.assign({}, b.valores), puede_escribir: true }, error: null };
  const clave = n + ':' + (a.p_clave || '');
  const f = b.falla[clave];
  if (f) { delete b.falla[clave]; return err(f[0], f[1]); }
  const pr = b.pierde[clave];
  if (pr) { delete b.pierde[clave]; if (pr === 'despues') guarda(b, a); return { red: true }; }
  if (n === 'ajustes_config_guardar') return guarda(b, a);
  if (n === 'gastos_panel_datos') return { data: { gastos: [], categorias: b.cats.map(c => Object.assign({}, c)) }, error: null };
  if (n === 'gasto_categoria_guarda') {   // como 20261014050000: alta con p_clave null; la clave la saca la base del nombre
    const d = a.p_datos || {}, nom = String(d.nombre || '').trim();
    if (a.p_clave !== null || Object.keys(d).some(k => !['nombre', 'grupo', 'orden', 'activa'].includes(k))) return err('22023', 'campo_desconocido');
    if (!nom || nom.length > 80) return err('22023', 'nombre_no_valido');
    if (!['suelo', 'construccion', 'comercial', 'marketing', 'personal', 'general', 'impuestos', 'financiero'].includes(d.grupo || 'general')) return err('22023', 'grupo_no_valido');
    if (b.cats.some(c => c.nombre.toLowerCase() === nom.toLowerCase())) return err('23505', 'nombre_repetido');
    const clave = nom.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'cat';
    b.cats.push({ clave, nombre: nom, grupo: d.grupo || 'general', orden: 100, activa: true });
    return { data: clave, error: null };
  }
  return err('42883');
}
function edge(b, cuerpo) {
  b.edge.push(cuerpo);
  if (b.o.edgeCae) return { status: 500, body: 'Internal Server Error' };
  if (cuerpo.accion !== 'estado') return { status: 400, body: JSON.stringify({ ok: false, codigo: 'accion_no_valida' }) };
  const e = b.correo.configurado ? { configurado: true, host: 'smtp.hostinger.com', usuario: 'info@negocio.com', puerto: 465, puesto_en: '2026-10-11T08:00:00Z', puesto_por: 'dion@x.com' } : { configurado: false };
  return { status: 200, body: JSON.stringify({ ok: true, estado: e, remitente: { email_from: '', efectivo: b.correo.configurado ? 'info@negocio.com' : '', motivo: b.correo.configurado ? 'ok' : 'sin_remitente', reply_to: '' },
    avisos: { soporte: '', sistema: '' }, envios_pausados: !!b.o.pausados, pide_codigo: b.pideCodigo }) };
}

// ── las páginas ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const cabeza = (idioma) => `<!doctype html><html lang="${idioma}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:sans-serif}main{padding:16px}.hidden{display:none}[hidden]{display:none!important}</style></head><body>`;
const sesion = (idioma, url, build) => `<script>
history.replaceState(null, '', '${url}');
window.__sinTrad = []; window.__errores = [];
window.addEventListener('error', function (e) { window.__errores.push(String(e.message)); });
${build ? 'window.AXW_IDIOMAS_BUILD = ' + JSON.stringify(build) + '; window.AXW_IDIOMAS = ' + JSON.stringify(build) + ';' : ''}
try { localStorage.removeItem('axw_idiomas_erp'); } catch (e) {}
function cadena() { var q = { select: function () { return q; }, eq: function () { return q; }, maybeSingle: function () { return Promise.resolve({ data: null, error: null }); } }; return q; }
var sb = { rpc: function (n, a) { return window.__srv(n, a || {}); }, from: cadena, auth: { getSession: function () { return Promise.resolve({ data: { session: { access_token: 'tok' } } }); } } };
window.LW_AUTH = Promise.resolve({ sb: sb });
window.lwDatos = function (n, a) { return sb.rpc(n, a); };
window.lwEdge = function (n) { return 'http://local.test/edge/' + n; }; window.LW_SB_KEY = 'anon';
window.LW_EN = {}; window.LW_ID = {}; window.__idioma = '${idioma}';
window.lwT = function (s, hu) { s = String(s); var d = window.__idioma === 'en' ? window.LW_EN : window.__idioma === 'id' ? window.LW_ID : null; var v = s;
  if (d) { if (Object.prototype.hasOwnProperty.call(d, s)) v = d[s]; else if (!/^[\\s0-9.:]*$/.test(s)) window.__sinTrad.push(s); }
  if (hu) for (var k in hu) v = v.split('%' + k).join(hu[k]); return v; };
</script>`;
const asistente = (idioma, url, build) => cabeza(idioma) + `<main>${HTML[0]}</main>` + sesion(idioma, url, build) + `<script>${NUCLEO}</script><script>${PASOS}</script><script>${COMUN}</script>${HTML[1]}</body></html>`;
const ajustes = (idioma, build) => cabeza(idioma) + `<main><section data-lw-panel="puesta"><div id="lw-aj-puesta"><p>…</p></div></section></main>` + sesion(idioma, '/ajustes/', build) +
  `<script>${NUCLEO}</script><script>${PASOS}</script><script>${COMUN}</script><script>${PUESTA}</script></body></html>`;

async function abre(nav, b, { idioma = 'es', url = '/ajustes/configurar/?modulo=base', ancho = 1440, pag = 'asistente', build = ['id', 'en'] } = {}) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 900 } });
  const p = await ctx.newPage();
  const body = pag === 'ajustes' ? ajustes(idioma, build) : asistente(idioma, url, build);
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.includes('/edge/')) { const x = edge(b, JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: x.status, contentType: 'application/json', body: x.body }); }
    return r.fulfill({ status: 200, contentType: 'text/html', body });
  });
  await p.exposeFunction('__srv', async (n, a) => { const r = servidor(b, n, a); if (r && r.red) throw new Error('Failed to fetch'); return r; });
  await p.goto('http://local.test' + (pag === 'ajustes' ? '/ajustes/' : url));
  await p.waitForTimeout(450);
  return { p, ctx };
}
const txt = async (p, sel) => (await p.$(sel)) ? (await p.$eval(sel, e => e.textContent.trim())) : null;
const clic = async (p, accion) => { await p.click('[data-axw-accion="' + accion + '"]'); await p.waitForTimeout(350); };
const pasoActual = p => p.getAttribute('[data-axw-paso]', 'data-axw-paso').catch(() => null);
const guardados = b => b.llamadas.filter(x => x[0] === 'ajustes_config_guardar').map(x => x[1]);
const errorTxt = p => txt(p, '[data-axw-as="error"]');
const sinErroresJs = async (p, n) => ok(n + ': sin errores de página', (await p.evaluate(() => window.__errores)).length === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
const sinCodigo = t => !/(c[óo]digo|code|kode)\s*:/i.test(String(t || ''));

(async () => {
  const nav = await chromium.launch({ executablePath: EXE });
  let b, p, ctx;

  // ── 1. S10 negocio desde vacío: abre ahí (obligatorio), valida antes de mandar, guarda las dos claves y el módulo queda listo ─────────────────
  b = base();
  ({ p, ctx } = await abre(nav, b));
  ok('S10 abre en «negocio» (primer obligatorio que falta)', (await pasoActual(p)) === 'negocio', await pasoActual(p));
  ok('S10 la falta nombra los campos', ((await txt(p, '[data-axw-falta]')) || '').includes('nombre del negocio') && ((await txt(p, '[data-axw-falta]')) || '').includes('zona horaria'), await txt(p, '[data-axw-falta]'));
  ok('S10 sin motivo (la base no lo pide para marca ni zona)', !(await p.$('[data-axw-campo="motivo"]')));
  ok('S10 zona horaria con lista de sugerencias', !!(await p.getAttribute('[data-axw-campo="zona_horaria"]', 'list')));
  await p.fill('[data-axw-campo="marca"]', 'Bali Best'); await p.fill('[data-axw-campo="zona_horaria"]', 'Asia/Makasar'); await clic(p, 'enviar');
  ok('S10 zona mal escrita: lo dice y no llama a la base', guardados(b).length === 0 && ((await errorTxt(p)) || '').includes('Región/Ciudad'), await errorTxt(p));
  await p.fill('[data-axw-campo="marca"]', 'a<b>'); await p.fill('[data-axw-campo="zona_horaria"]', 'Asia/Makassar'); await clic(p, 'enviar');
  ok('S10 nombre con < >: lo dice y no llama', guardados(b).length === 0 && ((await errorTxt(p)) || '').includes('60'), await errorTxt(p));
  await p.fill('[data-axw-campo="marca"]', 'Bali Best'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  const g1 = guardados(b);
  ok('S10 guarda marca y zona, en ese orden, sin motivo ni confirmación', g1.length === 2 && g1[0].p_clave === 'marca' && g1[0].p_valor === 'Bali Best' && g1[1].p_clave === 'zona_horaria' && g1[1].p_valor === 'Asia/Makassar'
    && !('p_motivo' in g1[0]) && !('p_confirmo' in g1[0]), JSON.stringify(g1));
  ok('S10 hecho: Datos generales listo', (await p.$('[data-axw-estado="listo"]')) !== null, await txt(p, '[data-axw-estado]'));
  // «listo» a secas solo sin opcionales pendientes (agencia-81, 12-oct): aquí quedan idiomas y correo → se dicen, con su consecuencia y su enlace
  ok('S80 con opcionales sin hacer: no dice «listo» a secas', ((await txt(p, '[data-axw-estado="listo"]')) || '').includes('Queda por configurar'), await txt(p, '[data-axw-estado="listo"]'));
  const lineas = await p.$$eval('[data-axw-opcionales="pendientes"] [data-axw-opcional]', es => es.map(e => [e.getAttribute('data-axw-opcional'), e.getAttribute('href'), e.textContent]));
  ok('S80 una línea por opcional pendiente, con su consecuencia y enlace al paso', lineas.length === 2 && lineas.some(l => l[0] === 'correo' && l[1].includes('paso=correo') && l[2].includes('no desde tu buzón'))
    && lineas.some(l => l[0] === 'idiomas' && l[2].includes('sin configurar')), JSON.stringify(lineas));
  await sinErroresJs(p, 'S10');
  await ctx.close();

  // ── 2. S10 cambiar solo la zona: solo se manda lo que cambia; 22023 sin hint se dice sin código; respuesta perdida → se relee ─────────────────
  b = base({ valores: { marca: 'Bali Best', zona_horaria: 'Asia/Makassar' }, falla: { 'ajustes_config_guardar:zona_horaria': ['22023', null] } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=base&paso=negocio' }));
  ok('S10 hecho: sale «Hecho» y «Cambiar»', (await p.$('[data-axw-hecho]')) !== null && (await p.$('[data-axw-accion="cambiar"]')) !== null);
  await clic(p, 'cambiar');
  ok('S10 cambiar: trae lo guardado', (await p.inputValue('[data-axw-campo="marca"]')) === 'Bali Best' && (await p.inputValue('[data-axw-campo="zona_horaria"]')) === 'Asia/Makassar');
  await p.fill('[data-axw-campo="zona_horaria"]', 'Asia/Jakarta'); await clic(p, 'enviar'); await p.waitForTimeout(250);
  let g2 = guardados(b);
  ok('S10 cambia solo la zona: solo se manda zona_horaria', g2.length === 1 && g2[0].p_clave === 'zona_horaria', JSON.stringify(g2));
  const e2 = await errorTxt(p);
  ok('S10 22023 sin hint: frase digna, sin código', !!e2 && e2.includes('no vale') && sinCodigo(e2) && !e2.includes('22023'), e2);
  ok('S10 tras fallar, lo tecleado sigue en la casilla (no vuelve lo guardado)', (await p.inputValue('[data-axw-campo="zona_horaria"]')) === 'Asia/Jakarta', await p.inputValue('[data-axw-campo="zona_horaria"]'));
  await ctx.close();
  b = base({ valores: { marca: 'Bali Best', zona_horaria: 'Asia/Makassar' }, pierde: { 'ajustes_config_guardar:zona_horaria': 'despues' } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=base&paso=negocio' }));
  await clic(p, 'cambiar'); await p.fill('[data-axw-campo="zona_horaria"]', 'Asia/Jakarta'); await clic(p, 'enviar'); await p.waitForTimeout(600);
  g2 = guardados(b);
  ok('S10 respuesta perdida (sí guardó): no reenvía y da por bueno lo releído', g2.length === 1 && b.valores.zona_horaria === 'Asia/Jakarta' && !(await errorTxt(p)), JSON.stringify(g2) + ' / ' + await errorTxt(p));
  await ctx.close();

  // ── 3. S12 idiomas: lo que trae el paquete, guardado con el de por defecto primero, apuntado en el navegador ───────────────────────────────────
  b = base({ valores: { marca: 'X', zona_horaria: 'Asia/Makassar' } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=base&paso=idiomas' }));
  ok('S12 paquete con indonesio: ofrece id+en y es+en', (await p.$$('[data-axw-campo="idiomas"]')).length === 2);
  ok('S12 sin guardar: marcado lo que fijó el build (id+en) y lo dice', (await p.$eval('[data-axw-campo="idiomas"][value="id,en"]', e => e.checked)) && (await p.$('[data-axw-co-nota="build"]')) !== null);
  await p.check('[data-axw-campo="idiomas"][value="es,en"]'); await clic(p, 'enviar'); await p.waitForTimeout(250);
  const g3 = guardados(b);
  ok('S12 guarda ["es","en"] por ajustes_config_guardar, sin motivo', g3.length === 1 && g3[0].p_clave === 'idiomas' && JSON.stringify(g3[0].p_valor) === '["es","en"]' && !('p_motivo' in g3[0]), JSON.stringify(g3));
  ok('S12 lo apunta para el arranque (localStorage)', (await p.evaluate(() => localStorage.getItem('axw_idiomas_erp'))) === '["es","en"]');
  await sinErroresJs(p, 'S12');
  await ctx.close();
  b = base({ valores: { marca: 'X', zona_horaria: 'Asia/Makassar' }, falla: { 'ajustes_config_guardar:idiomas': ['22023', 'idiomas_no_validos'] } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=base&paso=idiomas' }));
  await p.check('[data-axw-campo="idiomas"][value="es,en"]'); await clic(p, 'enviar'); await p.waitForTimeout(250);
  ok('S12 idiomas_no_validos: su frase', ((await errorTxt(p)) || '').includes('combinación de idiomas'), await errorTxt(p));
  ok('S12 tras fallar no se apunta nada', (await p.evaluate(() => localStorage.getItem('axw_idiomas_erp'))) === null);
  await ctx.close();
  b = base({ valores: { marca: 'X', zona_horaria: 'Asia/Makassar' } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=base&paso=idiomas', build: null }));
  ok('S12 paquete SIN indonesio: solo es+en y lo explica', (await p.$$('[data-axw-campo="idiomas"]')).length === 1 && (await p.$('[data-axw-co-nota="solo-es"]')) !== null);
  await ctx.close();

  // ── 4. S13 correo: mira por la edge (solo `estado`) y lleva a Ajustes › Correo; sin la clave del servidor lo DICE ────────────────────────────────
  b = base({ valores: { marca: 'X', zona_horaria: 'Asia/Makassar' } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=base&paso=correo' }));
  await p.waitForSelector('[data-axw-accion="abrir-correo"]', { timeout: 4000 }).catch(() => {});
  ok('S13 pregunta a la edge solo `estado`', b.edge.length === 1 && b.edge[0].accion === 'estado' && Object.keys(b.edge[0]).length === 1, JSON.stringify(b.edge));
  ok('S13 sin servidor propio: lo dice UNA vez (la falta de la base; el paso no la repite)', (await p.$('[data-axw-falta="sin_correo"]')) !== null && !(await p.$('[data-axw-co-estado="sin-servidor"]')));
  ok('S13 enlace a Ajustes › Correo (#correo)', (await p.getAttribute('[data-axw-accion="abrir-correo"]', 'href')) === '/ajustes/#correo');
  ok('S13 el anfitrión ofrece «Ya lo hice, comprobar»', (await p.$('[data-axw-accion="comprobar"]')) !== null);
  await sinErroresJs(p, 'S13');
  await ctx.close();
  b = base({ valores: { marca: 'X', zona_horaria: 'Asia/Makassar' }, pideCodigo: false });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=base&paso=correo' }));
  await p.waitForSelector('[data-axw-co-estado="sin-clave"]', { timeout: 4000 }).catch(() => {});
  const sk = await txt(p, '[data-axw-co-estado="sin-clave"]');
  ok('S13 pide_codigo:false → «Falta una clave del servidor», sin enlace que fallaría', !!sk && sk.includes('Falta una clave del servidor') && !(await p.$('[data-axw-accion="abrir-correo"]')), sk);
  await ctx.close();
  b = base({ valores: { marca: 'X', zona_horaria: 'Asia/Makassar' }, correo: { configurado: true } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=base&paso=correo' }));
  await p.waitForSelector('[data-axw-co-estado="servidor"]', { timeout: 4000 }).catch(() => {});
  ok('S13 con servidor: servidor, usuario y remitente', ((await txt(p, '[data-axw-co-estado="servidor"]')) || '').includes('smtp.hostinger.com') && ((await txt(p, '[data-axw-co-estado="remitente"]')) || '').includes('info@negocio.com'));
  await ctx.close();
  b = base({ valores: { marca: 'X', zona_horaria: 'Asia/Makassar' }, edgeCae: true });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=base&paso=correo' }));
  await p.waitForSelector('[data-axw-co-estado="fallo"]', { timeout: 4000 }).catch(() => {});
  const fc = await txt(p, '[data-axw-co-estado="fallo"]');
  ok('S13 la edge cae: «no se ha podido mirar», sin código ni texto del servidor', !!fc && sinCodigo(fc) && !fc.includes('500') && !fc.includes('Internal'), fc);
  await ctx.close();

  // ── 5. S46 Taller: enlaces a su pantalla, «necesario para abrir el Taller» y los próximos deshabilitados ─────────────────────────────────────
  b = base({ valores: { marca: 'X', zona_horaria: 'Asia/Makassar' } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=taller_revisiones' }));
  ok('S46 revisiones: «necesario para abrir el Taller» y enlace a /taller/#listas', (await p.$('[data-axw-co-taller="necesario"]')) !== null && (await p.getAttribute('[data-axw-co="taller_revisiones"] [data-axw-accion="abrir-externo"]', 'href')) === '/taller/#listas');
  ok('S46 revisiones: la falta con su frase', ((await txt(p, '[data-axw-falta]')) || '').includes('lista de revisión'), await txt(p, '[data-axw-falta]'));
  await ctx.close();
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=taller_recambios' }));
  ok('S46 recambios: no lleva «necesario»; proveedores y almacén «Próximamente» y deshabilitados', !(await p.$('[data-axw-co-taller="necesario"]')) && (await p.$$('[data-axw-co-taller="proximos"] [aria-disabled="true"]')).length === 2
    && ((await txt(p, '[data-axw-co-taller="proximos"]')) || '').includes('Próximamente'));
  await ctx.close();
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=taller_mecanicos' }));
  ok('S46 mecánicos: enlace a /usuarios/ y «necesario»', (await p.getAttribute('[data-axw-co="taller_mecanicos"] [data-axw-accion="abrir-externo"]', 'href')) === '/usuarios/' && (await p.$('[data-axw-co-taller="necesario"]')) !== null);
  await sinErroresJs(p, 'S46');
  await ctx.close();

  // ── 6. Ajustes › Configurar módulos: el mismo componente; correo y taller llevan a su sitio exacto ────────────────────────────────────────────
  b = base();
  ({ p, ctx } = await abre(nav, b, { pag: 'ajustes' }));
  ok('Ajustes: correo lleva a #correo', (await p.getAttribute('[data-pm-externo="correo"]', 'href')) === '/ajustes/#correo');
  ok('Ajustes: revisiones lleva a /taller/#listas', (await p.getAttribute('[data-pm-externo="taller_revisiones"]', 'href')) === '/taller/#listas');
  ok('Ajustes: Datos generales aún sin configurar (falta negocio): no cuenta opcionales, no está listo', !(await p.$('[data-pm-modulo="base"] [data-pm-opcionales]')));
  await p.click('[data-pm-fila="negocio"] [data-accion="pm-editar"]'); await p.waitForTimeout(150);
  await p.fill('[data-pm-fila="negocio"] [data-axw-campo="marca"]', 'Bali Best'); await p.fill('[data-pm-fila="negocio"] [data-axw-campo="zona_horaria"]', 'Asia/Makassar');
  await p.click('[data-pm-fila="negocio"] [data-accion="pm-guardar"]'); await p.waitForTimeout(400);
  ok('Ajustes: guardado negocio, la tarjeta de Datos generales cuenta sus 2 opcionales sin hacer', (await p.getAttribute('[data-pm-modulo="base"] [data-pm-opcionales]', 'data-pm-opcionales')) === '2');
  ok('Ajustes: cada opcional sin hacer dice qué pasa sin él', ((await txt(p, '[data-pm-consecuencia="taller_mecanicos"]')) || '').includes('mecánico'));
  ok('Ajustes: negocio se guarda desde aquí y la fila queda «Hecho»', guardados(b).length === 2 && (await p.$('[data-pm-fila="negocio"] [data-pm-hecho="1"]')) !== null, JSON.stringify(guardados(b)));
  ok('Ajustes: Datos generales configurado con 2 opcionales sin hacer → «2 pasos opcionales sin configurar»', ((await txt(p, '[data-pm-modulo="base"] [data-pm-opcionales]')) || '') === '2 pasos opcionales sin configurar', await txt(p, '[data-pm-modulo="base"] [data-pm-opcionales]'));
  await sinErroresJs(p, 'Ajustes');
  await ctx.close();

  // ── 7. Base SIN la 220000: nada nuevo a la vista (el tramo se puede publicar antes) ────────────────────────────────────────────────────────────
  b = base({ sin220000: true });
  ({ p, ctx } = await abre(nav, b, { pag: 'ajustes' }));
  ok('sin 220000: Ajustes no enseña ningún paso nuevo', !(await p.$('[data-pm-fila="negocio"]')) && !(await p.$('[data-pm-fila="correo"]')) && !(await p.$('[data-pm-fila="taller_revisiones"]')));
  ok('sin 220000: ninguna llamada a la edge de correo', b.edge.length === 0);
  await ctx.close();
  // el asistente, igual: «Datos generales» sin la 220000 solo tiene la moneda (hecha); ni negocio, ni idiomas, ni correo, ni un código suelto
  b = base({ sin220000: true });
  ({ p, ctx } = await abre(nav, b, { idioma: 'id' }));
  const t7 = await p.evaluate(() => document.body.innerText);
  ok('sin 220000 (asistente, id): ningún paso nuevo a la vista', !(await p.$('[data-axw-paso="negocio"]')) && !(await p.$('[data-axw-opcional]')) && !/negocio|idiomas|correo|taller_/.test(t7) && !/(kode|code|código)\s*:/i.test(t7), t7.slice(0, 200));
  ok('sin 220000 (asistente): ningún código sin frase', (await p.evaluate(() => window.AXW_SETUP.desconocidos.slice())).length === 0);
  await ctx.close();

  // ── 8. Un paso que la pantalla no conoce: frase digna, sin el código ──────────────────────────────────────────────────────────────────────────
  b = base({ pasoRaro: true, valores: { marca: 'X', zona_horaria: 'Asia/Makassar' } });
  ({ p, ctx } = await abre(nav, b, { idioma: 'id', url: '/ajustes/configurar/?modulo=base&paso=paso_raro' }));
  const t8 = (await txt(p, '[data-axw-as="tarjeta"]')) || (await p.evaluate(() => document.body.innerText));
  ok('paso desconocido (id): sin «paso_raro» ni «kode» en la pantalla', !t8.includes('paso_raro') && !t8.includes('falta_rara') && !t8.includes('campo_raro') && sinCodigo(t8), t8.slice(0, 300));
  ok('paso desconocido: contado para el estudio', (await p.evaluate(() => window.AXW_SETUP.desconocidos.slice())).includes('paso:paso_raro'));
  await ctx.close();

  // ── 10. N4 · Gastos: categorías de gasto (paso obligatorio de Bali Best) ────────────────────────────────────────────────────────────────
  const catGuardadas = b => b.llamadas.filter(x => x[0] === 'gasto_categoria_guarda').map(x => x[1]);
  b = base({ gastos: true, valores: { marca: 'X', zona_horaria: 'Asia/Makassar' } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=gastos' }));
  ok('G abre en «categorias_gasto»', (await pasoActual(p)) === 'categorias_gasto', await pasoActual(p));
  await p.waitForSelector('[data-axw-n4-cat="ninguna"]', { timeout: 3000 }).catch(() => {});
  ok('G sin categorías: lo dice (leído por gastos_panel_datos)', (await p.$('[data-axw-n4-cat="ninguna"]')) !== null && b.llamadas.some(x => x[0] === 'gastos_panel_datos'));
  ok('G sin motivo', !(await p.$('[data-axw-campo="motivo"]')));
  await clic(p, 'enviar');
  ok('G sin nombre y sin categorías: lo dice y no llama', catGuardadas(b).length === 0 && ((await errorTxt(p)) || '').includes('primera categoría'), await errorTxt(p));
  await p.fill('[data-axw-campo="cat_nombre"]', 'Material de oficina'); await p.selectOption('[data-axw-campo="cat_grupo"]', 'personal'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  const gc = catGuardadas(b);
  ok('G guarda con gasto_categoria_guarda(null, {nombre, grupo})', gc.length === 1 && gc[0].p_clave === null && gc[0].p_datos.nombre === 'Material de oficina' && gc[0].p_datos.grupo === 'personal'
    && Object.keys(gc[0]).length === 2, JSON.stringify(gc));
  ok('G hecho: Gastos listo', (await p.$('[data-axw-estado="listo"]')) !== null, await txt(p, '[data-axw-estado]'));
  await sinErroresJs(p, 'G');
  await ctx.close();
  b = base({ gastos: true, cats: [{ clave: 'oficina', nombre: 'Oficina', grupo: 'general', orden: 1, activa: false }], valores: { marca: 'X', zona_horaria: 'Asia/Makassar' } });
  ({ p, ctx } = await abre(nav, b, { idioma: 'en', url: '/ajustes/configurar/?modulo=gastos&paso=categorias_gasto' }));
  await p.waitForSelector('[data-axw-n4-cat-clave="oficina"]', { timeout: 3000 }).catch(() => {});
  ok('G lista la que hay, marcada como desactivada (en)', ((await txt(p, '[data-axw-n4-cat-clave="oficina"]')) || '').includes('inactive'), await txt(p, '[data-axw-n4-cat-clave="oficina"]'));
  await p.fill('[data-axw-campo="cat_nombre"]', 'oficina'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  ok('G nombre repetido: su frase, sin código (en)', ((await errorTxt(p)) || '').includes('already a category') && sinCodigo(await errorTxt(p)), await errorTxt(p));
  await ctx.close();
  b = base({ gastos: true, cats: [{ clave: 'oficina', nombre: 'Oficina', grupo: 'general', orden: 1, activa: true }], valores: { marca: 'X', zona_horaria: 'Asia/Makassar' } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=gastos&paso=categorias_gasto' }));
  await clic(p, 'cambiar');   // paso hecho: se entra a cambiarlo
  await p.waitForSelector('[data-axw-n4-cat="otra"]:not([hidden])', { timeout: 3000 }).catch(() => {});
  ok('G con una activa: ofrece seguir sin escribir otra', (await p.$('[data-axw-n4-cat="otra"]:not([hidden])')) !== null);
  await ctx.close();

  // ── 9. es/en/id a 390 y 1440: sin scroll horizontal, sin frases sin traducir, sin códigos sin frase ─────────────────────────────────────────
  const recorridos = [['base', 'negocio'], ['base', 'idiomas'], ['base', 'correo'], ['reservas-producto', 'taller_revisiones'], ['reservas-producto', 'taller_recambios'], ['reservas-producto', 'taller_mecanicos'], ['gastos', 'categorias_gasto']];
  for (const idioma of ['es', 'en', 'id']) for (const ancho of [390, 1440]) for (const [mod, paso] of recorridos) {
    b = base({ gastos: true, cats: paso === 'categorias_gasto' ? [{ clave: 'suelo_parcelas', nombre: 'Compra de suelo y parcelas en Sumba (escrituras, notaría y tasas)', grupo: 'suelo', orden: 1, activa: true }] : [],
      valores: { marca: 'X', zona_horaria: 'Asia/Makassar' }, pideCodigo: paso === 'correo' && ancho === 390 ? false : true });
    ({ p, ctx } = await abre(nav, b, { idioma, ancho, url: '/ajustes/configurar/?modulo=' + mod + '&paso=' + paso }));
    if (paso === 'negocio') { await clic(p, 'cambiar'); await p.fill('[data-axw-campo="zona_horaria"]', 'mal'); await clic(p, 'enviar'); }
    if (paso === 'categorias_gasto') { await clic(p, 'cambiar'); await p.waitForSelector('[data-axw-n4-cat-clave]', { timeout: 4000 }).catch(() => {}); }
    if (paso === 'correo') await p.waitForSelector('[data-axw-accion="abrir-correo"],[data-axw-co-estado="sin-clave"]', { timeout: 4000 }).catch(() => {});
    const anchoDoc = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(paso + ' ' + idioma + ' ' + ancho + ': sin scroll horizontal', anchoDoc <= ancho, String(anchoDoc));
    if (idioma !== 'es') {
      const sin = await p.evaluate(() => window.__sinTrad.filter(s => !/^(IDR|EUR|USD|—)$/.test(s)));
      ok(paso + ' ' + idioma + ' ' + ancho + ': ninguna frase sin traducir', sin.length === 0, [...new Set(sin)].slice(0, 5).join(' | '));
    }
    const desc = await p.evaluate(() => window.AXW_SETUP.desconocidos.slice());
    ok(paso + ' ' + idioma + ' ' + ancho + ': ningún código sin frase', desc.length === 0, desc.join(', '));
    if (SHOT && (ancho === 390 || idioma === 'id')) await p.screenshot({ path: path.join(SHOT, paso + '_' + idioma + '_' + ancho + '.png'), fullPage: true });
    await ctx.close();
  }

  await nav.close();
  console.log(fallos ? 'FALLAN ' + fallos : 'TODO BIEN — setup_comun.harness.cjs');
  process.exit(fallos ? 1 : 0);
})();
