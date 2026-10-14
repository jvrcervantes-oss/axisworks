// node comercial/demo-erp/pruebas/cobros.harness.cjs [carpeta_capturas]
// Arnés de Ajustes › Cobros y del paso «cobros» del asistente (F3 Entrega 2, bbm-p24-cobros-front, 12-oct-2026). cobros_paso.js + setup_modulos.js +
// setup_pasos.js (+ ajustes_puesta.js y asistente_setup.html) REALES en Chromium, con la base y la edge ajustes-pagos SIMULADAS y CON ESTADO a partir de
// los dobles de Backend (doble_modulos_setup_estado.json + doble_cobros.json = erp/plan_f3e2_doble_cobros.json de bbm-p23-cobros, cdc4530a; las reglas de
// faltan/modos/live son las de su index.ts). Mide los estados del encargo: sin configurar, guardando, prueba OK, prueba fallida con motivo, configurada,
// operario; y además a medias, sin código disponible, modo real (no autorizado / confirmación tecleada / prefijo que no casa), respuesta perdida sin
// reenviar, que la clave NO vuelve al DOM ni a la consola, que pedir_codigo y probar_y_guardar mandan los mismos campos, es/en/id a 390 y 1440 px.
// Cobros reales «el cliente solo» (bbm-p38-cobros-front, 13-oct): la edge simulada tiene DOS servidores. El VIEJO (por defecto: el que corre en bbm
// hasta aplicar 20261012233000) trae estado.live_permitido y da live_no_permitido; el NUEVO (o.nuevo; reglas del index.ts de bbm-p34, 411a147b) no lo
// trae, trae modo_desde, exige confirmar_live='LIVE' con modo final real ANTES de mirar el código, mete el modo final en la huella del código, y en real
// da 409 sin_a_quien_avisar (dos causas, con el texto real del servidor) o 502 aviso_no_enviado sin guardar ni gastar el código.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const EXE = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const AQUI = path.join(__dirname, '..');
const SETUP = JSON.parse(fs.readFileSync(path.join(__dirname, 'doble_modulos_setup_estado.json'), 'utf8')).casos;
const COBROS = JSON.parse(fs.readFileSync(path.join(__dirname, 'doble_cobros.json'), 'utf8'));
const JS = ['setup_modulos.js', 'setup_pasos.js', 'cobros_paso.js', 'ajustes_puesta.js'].map(f => fs.readFileSync(path.join(AQUI, f), 'utf8'));
const HTML = fs.readFileSync(path.join(AQUI, 'asistente_setup.html'), 'utf8').split('<!--AXW_SCRIPT-->');
// AXW_CSS_DIST=<paquete construido>: mete tw.css y shell.css de la instancia para mirar la piel en las capturas (no cambia lo que se mide)
const CSS_PIEL = process.env.AXW_CSS_DIST ? ['tw.css', 'shell.css'].map(f => fs.readFileSync(path.join(process.env.AXW_CSS_DIST, 'assets', f), 'utf8')).join(' ') : '';
const SHOT = process.argv[2];
// /ajustes/ con el ajustes.js REAL de Lawang (pestañas por hash, panel oculto) y el marcado de la pestaña y el panel SACADO de build.py
const AJ_LAWANG = [process.env.AXW_LAWANG_RAIZ, 'C:/Users/jvrce/Desktop/ClaudeCode/Agencia/proyectos/Lawang'].filter(Boolean).map(r => path.join(r, 'intranet', 'v4', 'assets', 'ajustes.js')).find(f => fs.existsSync(f));
const AJ_REAL = AJ_LAWANG ? fs.readFileSync(AJ_LAWANG, 'utf8').replace(/(var PESTANAS = \[[^\]\n]*)\];/, "$1, 'cobros'];") : '';   // como build.py: al final de la lista que haya
const BUILD = fs.readFileSync(path.join(AQUI, 'build.py'), 'utf8');
function pyCadena(nombre) {   // la constante de build.py, juntando sus trozos entre comillas simples (son marcado HTML, sin escapes raros)
  const m = new RegExp('^' + nombre + ' = \\(([\\s\\S]*?)\\)\\n', 'm').exec(BUILD);
  if (!m) throw new Error('build.py sin ' + nombre);
  return (m[1].match(/'((?:[^'\\]|\\.)*)'/g) || []).map(x => x.slice(1, -1).replace(/\\n/g, '\n')).join('');
}
const TAB_COBROS = pyCadena('AJUSTES_COBROS_TAB'), PANEL_COBROS = pyCadena('AJUSTES_COBROS_PANEL');
let fallos = 0;
const ok = (n, c, x = '') => { if (!c) { fallos++; console.log('FALLA  ' + n + (x ? ' -> ' + x : '')); } else console.log('ok     ' + n); };

const CANARIO_C = 'xnd_development_CANARIOcreacion0123456789abcd';
const CANARIO_L = 'xnd_development_CANARIOlectura0123456789abcde';
const CANARIO_A = 'avisoCANARIO0123456789abcdef';
const PROD_C = 'xnd_production_CANARIOprod0123456789abcdefghij';
const PROD_L = 'xnd_production_CANARIOprodlee0123456789abcdefg';
const CLAVE_XND = /^xnd_(development|production)_[A-Za-z0-9]{20,150}$/, TOKEN = /^[A-Za-z0-9_-]{16,200}$/;
const CAMPOS = ['creacion', 'lectura', 'aviso'];
const EDGE_TS = [process.env.AXW_AGENCIA_RAIZ, 'C:/Users/jvrce/Desktop/ClaudeCode/Agencia'].filter(Boolean).map(r => path.join(r, 'erp', 'funciones', 'ajustes-pagos', 'index.ts')).find(f => fs.existsSync(f));
// los textos de sin_a_quien_avisar de la edge nueva (index.ts de bbm-p34), copiados tal cual: la pantalla los enseña (y los traduce por su frase exacta)
// (comprobados contra el index.ts de la agencia en cuanto la edge nueva esté allí: abajo, «textos del servidor»)
const SQA = {
  correo: 'El servidor de correo ha cambiado hace menos de 24 horas: para cobrar de verdad espera a que pasen y vuelve a intentarlo. No se ha guardado nada.',
  testigo: 'Para cobrar de verdad tiene que haber alguien más a quien avisar desde hace al menos 24 horas: otro super admin activo o un buzón de avisos de sistema de tu dominio (Ajustes › Correo) que no haya cambiado en ese tiempo. No se ha guardado nada.'
};

// o: puede (bool), sinPaso, conf ({creacion,lectura,aviso} ya puestas), modo, live, pide, fallo ({lectura:'con_escritura'}), perdida ('guardada'|'no'),
//    obligatoriosHechos (para llegar al paso opcional del asistente); servidor nuevo: nuevo, modoDesde ({en, por}), sinQuien ('correo'|'testigo'),
//    avisoFalla (n.º de veces que el aviso previo no sale), fcl (la edge contesta falta_confirmar_live en probar_y_guardar una vez)
function base(o = {}) {
  const d = JSON.parse(JSON.stringify(SETUP.sin_configurar));
  d.puede_configurar = o.puede !== false;
  if (o.obligatoriosHechos) d.pasos.forEach(p => { if (p.obligatorio) { p.hecho = true; p.falta = null; } });
  if (!o.sinPaso) d.pasos.push(JSON.parse(JSON.stringify(COBROS.paso_setup.sin_hacer)));
  const est = JSON.parse(JSON.stringify(COBROS.edge.acciones.estado.respuesta_200.estado));
  if (o.nuevo) { delete est.live_permitido; est.modo_desde = o.modoDesde || null; }
  else { delete est.modo_desde; est.live_permitido = !!o.live; }
  CAMPOS.forEach(k => { if (o.conf && o.conf[k]) est.claves[k] = { configurada: true, puesta_en: '2026-10-11T09:30:00Z', puesta_por: 'dion@balibestmotorcycle.com' }; });
  est.modo = o.modo || (o.conf && o.conf.creacion ? 'test' : null);
  est.configurado = CAMPOS.every(k => est.claves[k].configurada);
  // B10: o.bot = el bot_backend que trae estado (undefined = la edge de antes, sin la clave)
  return { d, est, o, edge: [], rpc: [], pide: o.pide !== false, codigoPara: null, bot: o.bot === undefined ? undefined : JSON.parse(JSON.stringify(o.bot)) };
}
function setupEstado(b) {
  const p = b.d.pasos.find(x => x.clave === 'cobros');
  if (p) { const falt = CAMPOS.filter(k => !b.est.claves[k].configurada); p.hecho = !falt.length; p.falta = falt.length ? { codigo: 'falta_dato', campos: falt } : null; p.ref = p.hecho ? b.est.modo : null; }
  b.d.modulos.forEach(m => { const pend = b.d.pasos.filter(x => x.modulo === m.modulo && x.obligatorio && !x.hecho); m.estado = pend.length ? 'sin_configurar' : 'configurado'; m.falta = pend.length ? pend[0].clave : null; });
  if (!b.d.puede_configurar) return Object.assign({}, b.d, { pasos: [] });
  return JSON.parse(JSON.stringify(b.d));
}
// La edge, con las reglas de su index.ts (formato, faltan, modos, live, código atado a los campos, contraseña, prueba, promoción)
function edge(b, c) {
  b.edge.push(JSON.parse(JSON.stringify(c)));
  const no = (status, codigo, extra = {}) => ({ status, json: Object.assign({ ok: false, codigo, error: 'texto en español que el front NO debe pintar' }, extra) });
  if (b.o.puede === false) return no(403, 'no_super_admin');
  if (b.o.pruebas) return no(403, 'cuenta_pruebas_solo_mira');   // la cuenta de pruebas del estudio: super admin que solo mira
  if (c.accion === 'estado') return { status: 200, json: Object.assign({ ok: true, estado: JSON.parse(JSON.stringify(b.est)), pide_codigo: b.pide }, b.bot === undefined ? {} : { bot_backend: JSON.parse(JSON.stringify(b.bot)) }) };
  // B10: el interruptor del bot, con las reglas de la acción bot_backend del index.ts (va antes del corte del código: no lo necesita)
  if (c.accion === 'bot_backend') {
    const extra = Object.keys(c).filter(k => !['accion', 'valor', 'motivo', 'contrasena'].includes(k));
    if (extra.length) return no(400, 'campo_no_admitido', { campos: extra });
    if (!/^(dion|erp)$/.test(c.valor || '')) return no(400, 'valor_no_valido');
    if (!b.bot) return no(502, 'base_no_responde');
    if (c.valor === b.bot.guardado) return { status: 200, json: { ok: true, cambiado: false, bot_backend: JSON.parse(JSON.stringify(b.bot)) } };
    const m = typeof c.motivo === 'string' ? c.motivo.trim() : '';
    if (m.length < 3) return no(400, 'motivo');
    if (c.valor === 'erp' && !b.bot.puede_erp) return no(409, 'bot_backend_no_listo', { falta: b.bot.falta });
    if (!c.contrasena) return no(401, 'reautenticar');
    if (c.contrasena !== 'buena') return no(401, 'clave_actual_incorrecta');
    b.bot.guardado = c.valor; b.bot.efectivo = c.valor; b.bot.ultimo_cambio = { quien: 'owner@balibestmotorcycle.com', cuando: '2026-10-14T10:00:00Z', motivo: m };
    return { status: 200, json: { ok: true, cambiado: true, bot_backend: JSON.parse(JSON.stringify(b.bot)) } };
  }
  if (!b.pide) return no(503, 'codigo_no_disponible');
  const v = {};
  for (const k of CAMPOS) { const x = c[k] == null ? '' : String(c[k]).trim(); if (x !== '' && !(k === 'aviso' ? TOKEN : CLAVE_XND).test(x)) return no(400, 'clave_no_valida', { campo: k }); v[k] = x; }
  const modoDe = x => x.startsWith('xnd_production_') ? 'live' : 'test';
  // modo final (edge nueva): el de la clave de creación o la de lectura que se manda; si no va ninguna, el de la instancia
  const modoFinal = v.creacion ? modoDe(v.creacion) : v.lectura ? modoDe(v.lectura) : b.est.modo;
  const huella = JSON.stringify(CAMPOS.map(k => v[k]).concat(b.o.nuevo ? [modoFinal] : []));
  const confirmado = typeof c.confirmar_live === 'string' && c.confirmar_live.trim() === 'LIVE';
  if (b.o.nuevo && (c.accion === 'pedir_codigo' || c.accion === 'probar_y_guardar') && modoFinal === 'live' && !confirmado) return no(400, 'falta_confirmar_live');
  if (c.accion === 'pedir_codigo') {
    const faltan = CAMPOS.filter(k => v[k] === '' && !b.est.claves[k].configurada);
    if (faltan.length) return no(400, 'faltan_claves', { campos: faltan });
    if (!CAMPOS.some(k => v[k])) return no(400, 'sin_cambios');
    const mc = v.creacion ? modoDe(v.creacion) : b.est.modo, ml = v.lectura ? modoDe(v.lectura) : b.est.modo;
    if (mc && ml && mc !== ml) return no(400, 'modos_distintos');
    if (b.est.modo && mc && mc !== b.est.modo && !v.aviso) return no(400, 'faltan_claves', { campos: ['aviso'] });
    if (!b.o.nuevo && (mc === 'live' || ml === 'live') && !b.est.live_permitido) return no(403, 'live_no_permitido');
    b.codigoPara = huella;
    return { status: 200, json: { ok: true, codigo: 'codigo_enviado', caduca_en: 600, correo_enmascarado: 'd***@balibestmotorcycle.com' } };
  }
  if (c.accion === 'probar_y_guardar') {
    if (c.codigo !== '123456' || b.codigoPara !== huella) return no(403, 'codigo_no_valido');
    if (!c.contrasena_actual) return no(401, 'reautenticar');
    if (c.contrasena_actual !== 'buena') return no(401, 'clave_actual_incorrecta');
    if (b.o.fcl) { b.o.fcl = false; return no(400, 'falta_confirmar_live'); }
    if (b.o.fallo) return no(422, 'prueba_fallida', { fallo: b.o.fallo });
    if (b.o.nuevo && modoFinal === 'live') {   // en real: nadie fiable a quien avisar o aviso que no sale → nada guardado, el código NO se gasta
      if (b.o.sinQuien) return { status: 409, json: { ok: false, codigo: 'sin_a_quien_avisar', error: SQA[b.o.sinQuien] } };
      if (b.o.avisoFalla > 0) { b.o.avisoFalla--; return { status: 502, json: { ok: false, codigo: 'aviso_no_enviado', error: 'No se pudo avisar a los demás del cambio a cobros reales: no se ha guardado nada, inténtalo en un rato' } }; }
    }
    const promueve = () => { CAMPOS.forEach(k => { if (v[k]) b.est.claves[k] = { configurada: true, puesta_en: '2026-10-12T20:' + String(10 + b.edge.length).slice(-2) + ':00Z', puesta_por: 'owner@balibestmotorcycle.com' }; });
      const antes = b.est.modo;
      if (v.creacion) b.est.modo = modoDe(v.creacion); b.est.configurado = CAMPOS.every(k => b.est.claves[k].configurada); b.codigoPara = null;
      if (b.o.nuevo && b.est.modo !== antes) b.est.modo_desde = { en: '2026-10-13T02:00:00Z', por: 'owner@balibestmotorcycle.com' }; };
    if (b.o.perdida) { if (b.o.perdida === 'guardada') promueve(); b.o.perdida = null; return b.o.gateway ? { status: 504, json: null } : b.o.base502 ? { status: 502, json: { ok: false, codigo: 'base_no_responde', error: 'x' } } : { red: true }; }
    promueve();
    return { status: 200, json: { ok: true, guardado: true, aviso: 'enviado', prueba: { creacion: v.creacion ? 'ok' : 'no_se_prueba', lectura: v.lectura ? 'ok' : 'no_se_prueba', aviso: 'no_se_prueba' }, estado: JSON.parse(JSON.stringify(b.est)) } };
  }
  return no(400, 'accion_no_valida');
}

const comun = idioma => `
window.__sinTrad = []; window.__errores = []; window.addEventListener('error', function (e) { window.__errores.push(String(e.message)); });
function cadena() { var q = { select: function () { return q; }, eq: function () { return q; }, maybeSingle: function () { return Promise.resolve({ data: null, error: null }); } }; return q; }
var sb = { rpc: function (n, a) { return window.__srv(n, a || {}); }, from: cadena, auth: { getSession: function () { return Promise.resolve({ data: { session: { access_token: 'jwt-de-prueba' } } }); } } };
window.LW_AUTH = Promise.resolve({ sb: sb }); window.LW_SB = sb; window.lwDatos = function (n, a) { return sb.rpc(n, a); };
window.lwEdge = function (n) { return 'https://sb.test/functions/v1/' + n; }; window.LW_SB_KEY = 'anon';
window.fetch = function (url, init) { return window.__edge(String(url), init && init.body ? JSON.parse(init.body) : null).then(function (r) {
  if (r.red) throw new TypeError('Failed to fetch');
  return { ok: r.status >= 200 && r.status < 300, status: r.status, text: function () { return Promise.resolve(JSON.stringify(r.json)); } }; }); };
window.LW_EN = {}; window.LW_ID = {}; window.__idioma = '${idioma}'; window.LW_IDIOMA = '${idioma}';
window.lwLocale = function () { return window.__idioma === 'id' ? 'id-ID' : window.__idioma === 'en' ? 'en-GB' : 'es-ES'; };
window.lwT = function (s, hu) { s = String(s); var d = window.__idioma === 'en' ? window.LW_EN : window.__idioma === 'id' ? window.LW_ID : null; var v = s;
  if (d) { if (Object.prototype.hasOwnProperty.call(d, s)) v = d[s]; else if (!/^[\\s0-9.:]*$/.test(s)) window.__sinTrad.push(s); }
  if (hu) for (var k in hu) v = v.split('%' + k).join(hu[k]); return v; };`;
// /ajustes/ como lo deja build.py: la pestaña Cobros oculta y su panel, y Configurar módulos
const ajustes = idioma => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:sans-serif}[hidden]{display:none!important}</style><style>${CSS_PIEL}</style></head><body class="${CSS_PIEL ? 'lw-listo bg-background' : ''}"><main>
<nav><button type="button" data-lw-tab="cobros" hidden>Cobros en línea</button></nav>
<section data-lw-panel="cobros"><div id="lw-aj-cobros"></div></section>
<section data-lw-panel="puesta"><div id="lw-aj-puesta"><p>…</p></div></section></main>
<script>${comun(idioma)}</script>${JS.map(j => '<script>' + j + '</script>').join('')}</body></html>`;
const ajustesReal = idioma => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:sans-serif}[hidden]{display:none!important}</style><style>${CSS_PIEL}</style></head><body class="${CSS_PIEL ? 'lw-listo bg-background' : ''}"><main>
<div role="tablist"><button type="button" role="tab" id="lw-tab-empresa" data-lw-tab="empresa" data-lwt>Empresa</button>
${TAB_COBROS}<button type="button" role="tab" id="lw-tab-registro" data-lw-tab="registro" data-lwt>Registro de cambios</button></div>
<section id="lw-panel-empresa" data-lw-panel="empresa"><p>empresa</p></section>
${PANEL_COBROS}<section id="lw-panel-registro" data-lw-panel="registro" hidden><p>registro</p></section></main>
<script>${comun(idioma)}
window.lwIdiomaAplicar = function (raiz) { var r = raiz || document; var l = Array.prototype.slice.call(r.querySelectorAll('[data-lwt]')); if (r.hasAttribute && r.hasAttribute('data-lwt')) l.push(r);
  l.forEach(function (e) { if (!e.__es) e.__es = e.textContent.trim(); e.textContent = window.lwT(e.__es); }); };
</script><script>${JS[0]}</script><script>${JS[1]}</script><script>${JS[2]}</script><script>${AJ_REAL}</script></body></html>`;
const asistente = (idioma, url) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:sans-serif}main{padding:16px}</style><style>${CSS_PIEL}</style></head><body class="${CSS_PIEL ? 'lw-listo bg-background' : ''}"><main>${HTML[0]}</main>
<script>history.replaceState(null, '', '${url}');${comun(idioma)}</script><script>${JS[0]}</script><script>${JS[1]}</script><script>${JS[2]}</script>${HTML[1]}</body></html>`;

async function abre(nav, b, { idioma = 'es', ancho = 1440, url = '/ajustes/#cobros', tipo = 'ajustes' } = {}) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 900 } });
  const p = await ctx.newPage();
  p.__consola = [];
  p.on('console', m => p.__consola.push(m.text()));
  await p.route('**/*', r => r.fulfill({ status: 200, contentType: 'text/html', body: tipo === 'ajustes' ? ajustes(idioma) : tipo === 'real' ? ajustesReal(idioma) : asistente(idioma, url) }));
  await p.exposeFunction('__srv', async (n, a) => { b.rpc.push(n); if (n === 'modulos_setup_estado') return { data: setupEstado(b), error: null }; if (n === 'ajustes_config_datos') { const f = b.leeFalla && b.leeFalla.length && b.leeFalla.shift(); if (f || (b.leeFallaTrasGuardar && (b.guardados || []).length)) return { data: null, error: { code: typeof f === 'string' ? f : '57014', message: 'x' } }; return { data: b.ajustes ? JSON.parse(JSON.stringify(b.ajustes)) : { valores: {} }, error: null }; } if (n === 'ajustes_config_guardar' && b.guarda) { b.guardados = (b.guardados || []).concat([a]); return b.guarda(a); } return { data: null, error: { code: '42883', message: 'x' } }; });
  await p.exposeFunction('__edge', async (u, c) => (u.endsWith('/functions/v1/ajustes-pagos') ? edge(b, c) : { status: 404, json: null }));
  await p.goto('http://local.test' + url); await p.waitForTimeout(500);
  return { p, ctx };
}
const txt = async (p, sel) => (await p.$(sel)) ? (await p.$eval(sel, e => e.textContent.trim())) : null;
const sinCanario = async p => { const h = await p.evaluate(() => document.documentElement.outerHTML); const vals = await p.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value).join('|'));
  return !/CANARIO/.test(h) && !/CANARIO/.test(vals) && !p.__consola.some(t => /CANARIO|xnd_/.test(t)); };
const C = '[data-axw-cobros-caja]';

(async () => {
  const nav = await chromium.launch({ executablePath: EXE });

  // 0. textos del servidor (revisor, BAJA 2): los 3 de sin_a_quien_avisar que traducen setup_modulos.js (grupo servidor) y usa este arnés, iguales
  //    byte a byte a los de la edge. Con la edge de antes (sin sin_a_quien_avisar) se avisa y no cuenta; con la nueva, si cambia un texto, ROJO.
  {
    const ts = EDGE_TS ? fs.readFileSync(EDGE_TS, 'utf8') : '';
    const deEdge = [...ts.matchAll(/no\('sin_a_quien_avisar', '([^']*)', 409\)/g)].map(m => m[1]);
    const sm = fs.readFileSync(path.join(AQUI, 'setup_modulos.js'), 'utf8');
    const grupo = (/servidor: \{([\s\S]*?)\n {4}\}/.exec(sm) || [])[1] || '';
    const deFront = [...grupo.matchAll(/sin_a_quien_avisar_[a-z0-9_]+: '([^']*)'/g)].map(m => m[1]);
    if (!deEdge.length) console.log('AVISO  textos del servidor: la edge de ' + (EDGE_TS || '(sin agencia)') + ' es la de antes de 20261012233000; se mide al aterrizar bbm-p34');
    else {
      ok('textos del servidor: setup_modulos.js trae los de la edge, ni uno más ni uno menos (en los dos sentidos)', deFront.every(t => deEdge.includes(t)) && deEdge.every(t => deFront.includes(t)), deFront.length + ' / ' + deEdge.length);
      ok('textos del servidor: los del arnés están en la edge', Object.values(SQA).every(t => deEdge.includes(t)));
    }
  }

  // 1. sin configurar → guardando → prueba OK → configurada
  let b = base();
  let { p, ctx } = await abre(nav, b);
  ok('la pestaña Cobros sale porque la base declara el paso', await p.$eval('[data-lw-tab="cobros"]', e => !e.hidden));
  ok('las claves: ningún gestor de contraseñas (autocomplete off y marcas de los gestores)', await p.$$eval('#lw-aj-cobros input[type="password"]', l => l.length === 3 && l.every(i => i.getAttribute('autocomplete') === 'off' && i.getAttribute('data-lpignore') === 'true' && i.hasAttribute('data-1p-ignore') && i.hasAttribute('data-bwignore'))));
  ok('sin configurar: tres campos secretos, de tipo contraseña', (await p.$$eval('#lw-aj-cobros input[type="password"]', l => l.map(i => i.getAttribute('data-axw-campo')).join(','))) === 'creacion,lectura,aviso');
  ok('proveedor: Xendit, el que da la base', (await p.getAttribute('[data-axw-cobros-proveedor]', 'data-axw-cobros-proveedor')) === 'xendit');
  ok('servidor viejo, modo real no autorizado: botón apagado y lo dice, sin mandar al estudio', await p.$eval('[data-axw-cobros="modo-live"]', e => e.disabled) && !!(await p.$('[data-axw-cobros-live="no_permitido"]')) && !/estudio/.test((await txt(p, '[data-axw-cobros-live="no_permitido"]')) || ''));
  ok('sin código pedido: el botón de guardar no se ofrece', await p.$eval('[data-axw-cobros-host="guardar"]', e => e.hidden) && b.edge.filter(x => x.accion !== 'estado').length === 0);
  await p.fill('[data-axw-campo="creacion"]', CANARIO_C);
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(200);
  ok('faltan claves: lo dice con sus nombres y no gasta un código', ((await txt(p, `${C} [data-axw-cobros-error="aviso"]`)) || '').includes('clave de lectura') && b.edge.filter(x => x.accion === 'pedir_codigo').length === 0);
  ok('la clave tecleada sigue en su campo tras el aviso', (await p.$eval('[data-axw-campo="creacion"]', i => i.value)) === CANARIO_C);
  await p.fill('[data-axw-campo="lectura"]', CANARIO_L); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  const pedir = b.edge.filter(x => x.accion === 'pedir_codigo')[0];
  ok('pedir_codigo manda las tres claves', pedir && pedir.creacion === CANARIO_C && pedir.lectura === CANARIO_L && pedir.aviso === CANARIO_A, JSON.stringify(pedir && Object.keys(pedir)));
  ok('código enviado: dice a qué correo (enmascarado)', ((await txt(p, '[data-axw-cobros-enviado]')) || '').includes('d***@balibestmotorcycle.com'));
  ok('con el código pedido, las claves quedan de solo lectura', await p.$eval('[data-axw-campo="creacion"]', i => i.readOnly));
  ok('el texto de la edge en español no se pinta nunca', !/texto en español/.test(await p.evaluate(() => document.body.textContent)));
  await p.fill('[data-axw-campo="codigo"]', '123456'); await p.fill('[data-axw-campo="contrasena"]', 'mala');
  await p.click('[data-axw-cobros-host="guardar"]'); await p.waitForTimeout(300);
  ok('contraseña mala: lo dice por su código', ((await txt(p, '[data-axw-cobros-host="estado"]')) || '').includes('Esa contraseña no es la de tu cuenta'));
  ok('la contraseña no se vuelve a poner sola', (await p.$eval('[data-axw-campo="contrasena"]', i => i.value)) === '');
  ok('el código tecleado sigue (todavía vale)', (await p.$eval('[data-axw-campo="codigo"]', i => i.value)) === '123456');
  await p.fill('[data-axw-campo="codigo"]', '123456'); await p.fill('[data-axw-campo="contrasena"]', 'buena');
  await p.click('[data-axw-cobros-host="guardar"]'); await p.waitForTimeout(600);
  const pyg = b.edge.filter(x => x.accion === 'probar_y_guardar');
  const ult = pyg[pyg.length - 1];
  ok('probar_y_guardar manda EXACTAMENTE los campos de pedir_codigo + código + contraseña', ult && CAMPOS.every(k => ult[k] === pedir[k]) && ult.codigo === '123456' && ult.contrasena_actual === 'buena' && Object.keys(ult).length === 6, JSON.stringify(ult && Object.keys(ult)));
  ok('prueba OK: «Conectado a Xendit · modo prueba»', ((await txt(p, '[data-axw-cobros-estado="conectado"]')) || '').startsWith('Conectado a Xendit · modo prueba'));
  ok('configurada: las tres con «Configurada el …» y quién, sin campos', (await p.$$('[data-axw-cobros-puesta="1"]')).length === 3 && !(await p.$('#lw-aj-cobros input[type="password"]')) && ((await txt(p, '[data-axw-cobros-fila="creacion"]')) || '').includes('Por owner@balibestmotorcycle.com'));
  ok('la clave no está en el DOM, ni en los campos, ni en la consola', await sinCanario(p));
  ok('sin errores de página', (await p.evaluate(() => window.__errores)).length === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
  if (SHOT) await p.screenshot({ path: path.join(SHOT, 'cobros_configurada_1440.png'), fullPage: true });
  await ctx.close();

  // 2. prueba fallida con motivo (la clave de lectura puede escribir): no se guarda, el motivo va en su fila
  b = base({ fallo: { lectura: 'con_escritura' } });
  ({ p, ctx } = await abre(nav, b));
  await p.fill('[data-axw-campo="creacion"]', CANARIO_C); await p.fill('[data-axw-campo="lectura"]', CANARIO_C.replace('creacion', 'lecturaX')); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  await p.fill('[data-axw-campo="codigo"]', '123456'); await p.fill('[data-axw-campo="contrasena"]', 'buena');
  await p.click('[data-axw-cobros-host="guardar"]'); await p.waitForTimeout(500);
  ok('prueba fallida: «no se ha cambiado nada»', ((await txt(p, '[data-axw-cobros-host="estado"]')) || '').includes('no se ha cambiado nada'));
  ok('prueba fallida: el motivo en la fila de la clave de lectura', (await p.getAttribute('[data-axw-cobros-fila="lectura"] [data-axw-cobros-fallo]', 'data-axw-cobros-fallo')) === 'con_escritura');
  ok('prueba fallida: nada guardado en la base', !b.est.claves.creacion.configurada);
  ok('prueba fallida: se vuelve a escribir (el código no sirve para otro cambio)', !!(await p.$('[data-axw-cobros="pedir"]')) && !(await p.$eval('[data-axw-campo="lectura"]', i => i.readOnly)));
  if (SHOT) await p.screenshot({ path: path.join(SHOT, 'cobros_fallida_1440.png'), fullPage: true });
  await ctx.close();

  // 3. configurada: no se enseña nada de la clave; Reemplazar pide solo esa
  b = base({ conf: { creacion: 1, lectura: 1, aviso: 1 }, modo: 'test' });
  ({ p, ctx } = await abre(nav, b));
  ok('configurada: tres cajas «Configurada el …», ningún campo', (await p.$$('[data-axw-cobros-puesta="1"]')).length === 3 && !(await p.$('#lw-aj-cobros input')));
  ok('configurada y nada que reemplazar: ni «Pedir código» ni guardar', !(await p.$('[data-axw-cobros="pedir"]')) && await p.$eval('[data-axw-cobros-host="guardar"]', e => e.hidden));
  ok('configurada: dice el modo de las claves guardadas', (await p.getAttribute('[data-axw-cobros-modo-guardado]', 'data-axw-cobros-modo-guardado')) === 'test');
  await p.click('[data-axw-cobros="reemplazar-aviso"]');
  ok('Reemplazar: aparece solo ese campo', (await p.$$eval('#lw-aj-cobros input[type="password"]', l => l.map(i => i.getAttribute('data-axw-campo')).join(','))) === 'aviso');
  await p.fill('[data-axw-campo="aviso"]', CANARIO_A); await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  const p3 = b.edge.filter(x => x.accion === 'pedir_codigo')[0];
  ok('reemplazar una: pedir_codigo manda solo esa', p3 && p3.aviso === CANARIO_A && !('creacion' in p3) && !('lectura' in p3), JSON.stringify(p3));
  await ctx.close();

  // 4. a medias: falta el token; se retoma pidiendo solo lo que falta
  b = base({ conf: { creacion: 1, lectura: 1 }, modo: 'test' });
  ({ p, ctx } = await abre(nav, b));
  ok('a medias: dos guardadas y el campo que falta', (await p.$$('[data-axw-cobros-puesta="1"]')).length === 2 && (await p.$$eval('#lw-aj-cobros input[type="password"]', l => l.map(i => i.getAttribute('data-axw-campo')).join(','))) === 'aviso');
  await ctx.close();

  // 5. operario (no configura): sin llamar a la edge, «Este módulo aún no está listo»
  b = base({ puede: false });
  ({ p, ctx } = await abre(nav, b));
  ok('operario: «Este módulo aún no está listo.» sin pasos', ((await txt(p, '#lw-aj-cobros')) || '').includes('Este módulo aún no está listo.') && !(await p.$('#lw-aj-cobros input')));
  ok('operario: ni una llamada a la edge', b.edge.length === 0);
  await ctx.close();

  // 6. la base no declara el paso: la pestaña no sale y no se llama a la edge
  b = base({ sinPaso: true });
  ({ p, ctx } = await abre(nav, b));
  ok('sin paso en la base: pestaña oculta y edge sin tocar', await p.$eval('[data-lw-tab="cobros"]', e => e.hidden) && b.edge.length === 0);
  await ctx.close();

  // 7. sin confirmación por código en la instancia
  b = base({ pide: false });
  ({ p, ctx } = await abre(nav, b));
  ok('pide_codigo=false: lo dice y no ofrece pedir código', !!(await p.$('[data-axw-cobros-error="codigo_no_disponible"]')) && !(await p.$('[data-axw-cobros="pedir"]')));
  await ctx.close();

  // 7b. la cuenta de pruebas (super admin que solo mira): la edge responde 403 cuenta_pruebas_solo_mira y se dice con su frase de siempre
  b = base({ pruebas: true });
  ({ p, ctx } = await abre(nav, b));
  ok('cuenta de pruebas: «Esta es una cuenta de pruebas…», sin campos', ((await txt(p, '[data-axw-cobros-error]')) || '').startsWith('Esta es una cuenta de pruebas') && !(await p.$('#lw-aj-cobros input')));
  await ctx.close();

  // 8. modo real: prefijo que no casa, confirmación tecleada, live autorizado
  b = base({ live: true });
  ({ p, ctx } = await abre(nav, b));
  await p.fill('[data-axw-campo="creacion"]', PROD_C); await p.fill('[data-axw-campo="lectura"]', PROD_L); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(200);
  ok('modo prueba con clave real: avisa antes de gastar un código', ((await txt(p, `${C} [data-axw-cobros-error="aviso"]`)) || '').includes('has elegido modo prueba') && b.edge.filter(x => x.accion === 'pedir_codigo').length === 0);
  await p.click('[data-axw-cobros="modo-live"]');
  ok('modo real: marcado y con su aviso de dinero real', !!(await p.$('[data-axw-cobros-live="aviso"]')) && (await p.getAttribute('[data-axw-cobros="modo-live"]', 'aria-checked')) === 'true');
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(200);
  ok('modo real sin teclear LIVE: no se pide el código', b.edge.filter(x => x.accion === 'pedir_codigo').length === 0 && ((await txt(p, `${C} [data-axw-cobros-error="aviso"]`)) || '').includes('no coincide'));
  await p.fill('[data-axw-campo="confirma_live"]', 'live'); await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(200);
  ok('modo real con «live» en minúsculas: no coincide (exacto, decisión por defecto de bbm-p38)', b.edge.filter(x => x.accion === 'pedir_codigo').length === 0);
  await p.fill('[data-axw-campo="confirma_live"]', 'LIVE'); await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  ok('modo real confirmado (servidor viejo autorizado): se pide el código y va confirmar_live', b.edge.filter(x => x.accion === 'pedir_codigo').length === 1 && !!(await p.$('[data-axw-cobros-enviado]')) && b.edge.filter(x => x.accion === 'pedir_codigo')[0].confirmar_live === 'LIVE');
  if (SHOT) await p.screenshot({ path: path.join(SHOT, 'cobros_live_1440.png'), fullPage: true });
  await ctx.close();

  // 9. respuesta perdida: guardada (se relee y vale) y no guardada (se dice, sin reenviar)
  for (const caso of ['guardada', 'no']) {
    b = base({ perdida: caso });
    ({ p, ctx } = await abre(nav, b));
    await p.fill('[data-axw-campo="creacion"]', CANARIO_C); await p.fill('[data-axw-campo="lectura"]', CANARIO_L); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
    await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
    await p.fill('[data-axw-campo="codigo"]', '123456'); await p.fill('[data-axw-campo="contrasena"]', 'buena');
    await p.click('[data-axw-cobros-host="guardar"]'); await p.waitForTimeout(600);
    const n = b.edge.filter(x => x.accion === 'probar_y_guardar').length;
    if (caso === 'guardada') ok('red perdida tras guardar: se relee y sale configurada, un solo envío', n === 1 && (await p.$$('[data-axw-cobros-puesta="1"]')).length === 3);
    else ok('red perdida sin guardar: «no ha respondido», un solo envío', n === 1 && ((await txt(p, '[data-axw-cobros-host="estado"]')) || '').includes('no ha respondido'));
    await ctx.close();
  }

  // 10. Configurar módulos: el paso cobros se edita con el MISMO componente
  b = base();
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/' }));
  ok('/ajustes/ sin #cobros: la edge no se llama al cargar', b.edge.length === 0);
  await p.click('[data-pm-fila="cobros"] [data-accion="pm-editar"]'); await p.waitForTimeout(300);
  ok('Configurar módulos: el paso cobros pinta los mismos campos secretos', (await p.$$('[data-pm-fila="cobros"] input[type="password"]')).length === 3);
  await ctx.close();

  // 11. El asistente: paso opcional «cobros» de reservas-producto, de punta a punta, con el botón del asistente
  b = base({ obligatoriosHechos: true });
  ({ p, ctx } = await abre(nav, b, { tipo: 'asistente', url: '/ajustes/configurar/?modulo=reservas-producto&paso=cobros' }));
  ok('asistente: el paso «Cobros en línea», opcional', (await txt(p, '[data-axw-paso="cobros"]')) === 'Cobros en línea');
  await p.fill('[data-axw-campo="creacion"]', CANARIO_C); await p.fill('[data-axw-campo="lectura"]', CANARIO_L); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  await p.fill('[data-axw-campo="codigo"]', '123456'); await p.fill('[data-axw-campo="contrasena"]', 'mala');
  await p.click('[data-axw-accion="enviar"]'); await p.waitForTimeout(600);
  ok('asistente: error por código y el código pedido sigue valiendo tras repintar', ((await txt(p, '[data-axw-as="error"]')) || '').includes('Esa contraseña no es la de tu cuenta') && !!(await p.$('[data-axw-campo="codigo"]')));
  await p.fill('[data-axw-campo="codigo"]', '123456'); await p.fill('[data-axw-campo="contrasena"]', 'buena');
  await p.click('[data-axw-accion="enviar"]'); await p.waitForTimeout(800);
  ok('asistente: guardado → la base lo da por hecho y sale «listo»', b.est.configurado && !!(await p.$('[data-axw-estado="listo"]')));
  ok('asistente: la clave no queda en el DOM ni en la consola', await sinCanario(p));
  await ctx.close();
  b = base({ puede: false });
  ({ p, ctx } = await abre(nav, b, { tipo: 'asistente', url: '/ajustes/configurar/?modulo=reservas-producto&paso=cobros' }));
  ok('asistente, operario: «solo el administrador principal» y sin edge', ((await txt(p, '[data-axw-as="tarjeta"]')) || '').includes('Solo el administrador principal') && b.edge.length === 0);
  await ctx.close();

  // 13. con el ajustes.js REAL: la pestaña se abre por clic y por la URL; sin paso en la base, #cobros cae en Empresa y nadie llama a la edge
  if (!AJ_REAL) ok('ajustes.js de Lawang encontrado (AXW_LAWANG_RAIZ)', false);
  else {
    b = base();
    ({ p, ctx } = await abre(nav, b, { tipo: 'real', url: '/ajustes/' }));
    ok('real: la pestaña sale, el panel sigue oculto y la edge sin tocar', await p.$eval('[data-lw-tab="cobros"]', e => !e.hidden) && await p.$eval('[data-lw-panel="cobros"]', e => e.hidden) && b.edge.length === 0);
    await p.click('[data-lw-tab="cobros"]'); await p.waitForTimeout(500);
    ok('real: al pulsar la pestaña se monta el componente con UNA llamada estado', (await p.$$('#lw-aj-cobros input[type="password"]')).length === 3 && b.edge.filter(x => x.accion === 'estado').length === 1, String(b.edge.length));
    await ctx.close();
    b = base();
    ({ p, ctx } = await abre(nav, b, { tipo: 'real', url: '/ajustes/#cobros' }));
    ok('real: /ajustes/#cobros abre Cobros (aunque la pestaña naciera oculta)', await p.$eval('[data-lw-panel="cobros"]', e => !e.hidden) && (await p.$$('#lw-aj-cobros input[type="password"]')).length === 3);
    await ctx.close();
    b = base({ sinPaso: true });
    ({ p, ctx } = await abre(nav, b, { tipo: 'real', url: '/ajustes/#cobros' }));
    ok('real, sin paso: #cobros cae en Empresa, pestaña oculta, sin edge', await p.$eval('[data-lw-panel="empresa"]', e => !e.hidden) && await p.$eval('[data-lw-tab="cobros"]', e => e.hidden) && b.edge.length === 0);
    await ctx.close();
    b = base();
    ({ p, ctx } = await abre(nav, b, { tipo: 'real', url: '/ajustes/#cobros', idioma: 'id' }));
    ok('real, id: los rótulos fijos de build.py salen en indonesio', (await txt(p, '[data-lw-tab="cobros"]')) === 'Pembayaran online' && ((await txt(p, '[data-lw-panel="cobros"] h2')) || '') === 'Pembayaran online',
       (await txt(p, '[data-lw-tab="cobros"]')) + ' / ' + (await txt(p, '[data-lw-panel="cobros"] h2')));
    ok('real: sin errores de página', (await p.evaluate(() => window.__errores)).length === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
    await ctx.close();
  }

  // 14. respuesta del gateway sin JSON de la edge (504) DESPUÉS de promover: se relee y vale; un solo envío
  b = base({ perdida: 'guardada', gateway: true });
  ({ p, ctx } = await abre(nav, b));
  await p.fill('[data-axw-campo="creacion"]', CANARIO_C); await p.fill('[data-axw-campo="lectura"]', CANARIO_L); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  await p.fill('[data-axw-campo="codigo"]', '123456'); await p.fill('[data-axw-campo="contrasena"]', 'buena');
  await p.click('[data-axw-cobros-host="guardar"]'); await p.waitForTimeout(600);
  ok('504 tras guardar: se relee y sale configurada, un solo envío', b.edge.filter(x => x.accion === 'probar_y_guardar').length === 1 && (await p.$$('[data-axw-cobros-puesta="1"]')).length === 3);
  await ctx.close();

  // 14b. 502 base_no_responde CON JSON de la edge después de promover (cobros_promueve tardó): también es duda; se relee y vale
  b = base({ perdida: 'guardada', base502: true });
  ({ p, ctx } = await abre(nav, b));
  await p.fill('[data-axw-campo="creacion"]', CANARIO_C); await p.fill('[data-axw-campo="lectura"]', CANARIO_L); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  await p.fill('[data-axw-campo="codigo"]', '123456'); await p.fill('[data-axw-campo="contrasena"]', 'buena');
  await p.click('[data-axw-cobros-host="guardar"]'); await p.waitForTimeout(600);
  ok('502 base_no_responde tras guardar: se relee y sale configurada, un solo envío', b.edge.filter(x => x.accion === 'probar_y_guardar').length === 1 && (await p.$$('[data-axw-cobros-puesta="1"]')).length === 3);
  await ctx.close();

  // 14c. dos cajas en /ajustes/ (pestaña y Configurar módulos): guardar desde la pestaña lee SU código aunque la otra se pinte después
  b = base();
  ({ p, ctx } = await abre(nav, b));
  await p.fill('#lw-aj-cobros [data-axw-campo="creacion"]', CANARIO_C); await p.fill('#lw-aj-cobros [data-axw-campo="lectura"]', CANARIO_L); await p.fill('#lw-aj-cobros [data-axw-campo="aviso"]', CANARIO_A);
  await p.click('#lw-aj-cobros [data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  await p.click('[data-pm-fila="cobros"] [data-accion="pm-editar"]'); await p.waitForTimeout(400);
  await p.fill('#lw-aj-cobros [data-axw-campo="codigo"]', '123456'); await p.fill('#lw-aj-cobros [data-axw-campo="contrasena"]', 'buena');
  await p.click('[data-axw-cobros-host="guardar"]'); await p.waitForTimeout(600);
  const u14 = b.edge.filter(x => x.accion === 'probar_y_guardar')[0];
  ok('dos cajas: se guarda con el código de la pestaña', !!u14 && u14.codigo === '123456' && b.est.configurado, JSON.stringify(u14 && { codigo: u14.codigo }));
  await ctx.close();

  // 15. cambiar de modo con claves puestas obliga a las TRES (Xendit da otro token de avisos en real)
  b = base({ conf: { creacion: 1, lectura: 1, aviso: 1 }, modo: 'test', live: true });
  ({ p, ctx } = await abre(nav, b));
  await p.click('[data-axw-cobros="modo-live"]');
  ok('cambio de modo: piden las tres claves', (await p.$$eval('#lw-aj-cobros input[type="password"]', l => l.map(i => i.getAttribute('data-axw-campo')).join(','))) === 'creacion,lectura,aviso');
  await p.fill('[data-axw-campo="creacion"]', PROD_C); await p.fill('[data-axw-campo="lectura"]', PROD_L); await p.fill('[data-axw-campo="confirma_live"]', 'LIVE');
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(200);
  ok('cambio de modo sin token nuevo: lo pide y no gasta un código', ((await txt(p, `${C} [data-axw-cobros-error="aviso"]`)) || '').includes('token de avisos') && b.edge.filter(x => x.accion === 'pedir_codigo').length === 0);
  await ctx.close();

  // ── SERVIDOR NUEVO (20261012233000, «el cliente solo») ─────────────────────────────────────────────────────────────────────────────────────
  // 16. de prueba a real, de punta a punta: botón encendido sin nota del estudio, LIVE tecleado viaja IGUAL en las dos llamadas, modo_desde al volver
  b = base({ nuevo: true });
  ({ p, ctx } = await abre(nav, b));
  ok('nuevo: el botón de real está encendido y no hay nota de «no disponible»', !(await p.$eval('[data-axw-cobros="modo-live"]', e => e.disabled)) && !(await p.$('[data-axw-cobros-live="no_permitido"]')));
  ok('nuevo: en Cobros no se pide autorizar al estudio', !/estudio|studio/i.test((await txt(p, '#lw-aj-cobros')) || ''));
  await p.click('[data-axw-cobros="modo-live"]');
  await p.fill('[data-axw-campo="creacion"]', PROD_C); await p.fill('[data-axw-campo="lectura"]', PROD_L); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  ok('nuevo: el campo LIVE sale con la nota de que nadie del estudio lo revisa', !!(await p.$('[data-axw-campo="confirma_live"]')) && ((await txt(p, `${C}`)) || '').includes('Nadie del estudio lo revisa antes'));
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(200);
  ok('nuevo: sin LIVE no se pide el código (y no llega a la edge)', b.edge.filter(x => x.accion === 'pedir_codigo').length === 0);
  await p.fill('[data-axw-campo="confirma_live"]', '  LIVE '); await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  const p16 = b.edge.filter(x => x.accion === 'pedir_codigo')[0];
  ok('nuevo: pedir_codigo lleva confirmar_live = lo tecleado, recortado', !!p16 && p16.confirmar_live === 'LIVE' && !!(await p.$('[data-axw-cobros-enviado]')), JSON.stringify(p16 && p16.confirmar_live));
  await p.fill('[data-axw-campo="codigo"]', '123456'); await p.fill('[data-axw-campo="contrasena"]', 'buena');
  await p.click('[data-axw-cobros-host="guardar"]'); await p.waitForTimeout(700);
  const g16 = b.edge.filter(x => x.accion === 'probar_y_guardar')[0];
  ok('nuevo: probar_y_guardar manda el MISMO confirmar_live y los mismos campos (7 claves)', !!g16 && g16.confirmar_live === p16.confirmar_live && CAMPOS.every(k => g16[k] === p16[k]) && Object.keys(g16).length === 7, JSON.stringify(g16 && Object.keys(g16)));
  ok('nuevo: guardado en real: «Conectado a Xendit · modo real»', ((await txt(p, '[data-axw-cobros-estado="conectado"]')) || '').startsWith('Conectado a Xendit · modo real') && b.est.modo === 'live');
  ok('nuevo: al releer, «Desde el … puesto por …» (modo_desde)', ((await txt(p, '[data-axw-cobros-modo-desde="live"]')) || '').includes('puesto por owner@balibestmotorcycle.com'));
  ok('nuevo: la clave no está en el DOM ni en la consola', await sinCanario(p));
  ok('nuevo: sin errores de página', (await p.evaluate(() => window.__errores)).length === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
  if (SHOT) await p.screenshot({ path: path.join(SHOT, 'cobros_nuevo_real_1440.png'), fullPage: true });
  await ctx.close();

  // 17. ya en real, cambiar solo el token de avisos: también pide LIVE (si no, la edge daría falta_confirmar_live)
  b = base({ nuevo: true, conf: { creacion: 1, lectura: 1, aviso: 1 }, modo: 'live', modoDesde: { en: '2026-10-13T01:00:00Z', por: 'dion@balibestmotorcycle.com' } });
  ({ p, ctx } = await abre(nav, b));
  ok('nuevo, en real: dice desde cuándo y quién', ((await txt(p, '[data-axw-cobros-modo-desde="live"]')) || '').includes('dion@balibestmotorcycle.com'));
  ok('nuevo, en real, nada que reemplazar: ni campo LIVE muerto ni «Pedir código»', !(await p.$('[data-axw-campo="confirma_live"]')) && !(await p.$('[data-axw-cobros="pedir"]')));
  await p.click('[data-axw-cobros="reemplazar-aviso"]');
  await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  ok('nuevo, en real, solo el token: sale el campo LIVE', !!(await p.$('[data-axw-campo="confirma_live"]')));
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(200);
  ok('nuevo, en real, solo el token, sin LIVE: no se pide el código', b.edge.filter(x => x.accion === 'pedir_codigo').length === 0);
  await p.fill('[data-axw-campo="confirma_live"]', 'LIVE'); await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  const p17 = b.edge.filter(x => x.accion === 'pedir_codigo')[0];
  ok('nuevo, en real, solo el token: va el token y confirmar_live, nada más', !!p17 && p17.aviso === CANARIO_A && p17.confirmar_live === 'LIVE' && !('creacion' in p17) && !!(await p.$('[data-axw-cobros-enviado]')), JSON.stringify(p17 && Object.keys(p17)));
  await ctx.close();

  // 18. de real a prueba: no pide LIVE ni manda confirmar_live
  b = base({ nuevo: true, conf: { creacion: 1, lectura: 1, aviso: 1 }, modo: 'live' });
  ({ p, ctx } = await abre(nav, b));
  await p.click('[data-axw-cobros="modo-test"]');
  ok('nuevo, de real a prueba: tres campos y ningún campo LIVE', (await p.$$('#lw-aj-cobros input[type="password"]')).length === 3 && !(await p.$('[data-axw-campo="confirma_live"]')));
  await p.fill('[data-axw-campo="creacion"]', CANARIO_C); await p.fill('[data-axw-campo="lectura"]', CANARIO_L); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  const p18 = b.edge.filter(x => x.accion === 'pedir_codigo')[0];
  ok('nuevo, de real a prueba: pedir_codigo sin confirmar_live', !!p18 && !('confirmar_live' in p18) && !!(await p.$('[data-axw-cobros-enviado]')), JSON.stringify(p18 && Object.keys(p18)));
  await ctx.close();

  // 19. 409 sin_a_quien_avisar: se enseña el texto del SERVIDOR (cada causa el suyo), traducido; nada guardado
  for (const [causa, idioma, ancho] of [['correo', 'es', 1440], ['testigo', 'es', 390], ['testigo', 'id', 390], ['correo', 'en', 1440]]) {
    b = base({ nuevo: true, sinQuien: causa });
    ({ p, ctx } = await abre(nav, b, { idioma, ancho }));
    await p.click('[data-axw-cobros="modo-live"]');
    await p.fill('[data-axw-campo="creacion"]', PROD_C); await p.fill('[data-axw-campo="lectura"]', PROD_L); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
    await p.fill('[data-axw-campo="confirma_live"]', 'LIVE'); await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
    await p.fill('[data-axw-campo="codigo"]', '123456'); await p.fill('[data-axw-campo="contrasena"]', 'buena');
    await p.click('[data-axw-cobros-host="guardar"]'); await p.waitForTimeout(500);
    const aviso = (await txt(p, `${C} [data-axw-cobros-error="aviso"]`)) || '';
    const esperado = await p.evaluate(t => window.lwT(t), SQA[causa]);
    ok('409 ' + causa + ' ' + idioma + ': la pantalla enseña el texto del servidor' + (idioma === 'es' ? '' : ', traducido'), aviso === esperado && (idioma === 'es' || esperado !== SQA[causa]), aviso.slice(0, 90));
    const sin = (await p.evaluate(() => window.__sinTrad)).filter(s => !/^(Xendit|LIVE)$/.test(s));
    ok('409 ' + causa + ' ' + idioma + ': ninguna frase sin traducir', idioma === 'es' || sin.length === 0, sin.slice(0, 3).join(' | '));
    ok('409 ' + causa + ' ' + idioma + ': nada guardado y el pie dice su frase', !b.est.configurado && ((await txt(p, '[data-axw-cobros-host="estado"]')) || '').length > 20);
    ok('409 ' + causa + ' ' + idioma + ': se vuelve a escribir (no se reintenta contra Xendit con el mismo código)', !!(await p.$('[data-axw-cobros="pedir"]')) && !(await p.$('[data-axw-campo="codigo"]')) && await p.$eval('[data-axw-cobros-host="guardar"]', e => e.hidden));
    ok('409 ' + causa + ' ' + idioma + ' ' + ancho + ': sin scroll horizontal', (await p.evaluate(() => document.documentElement.scrollWidth)) <= ancho);
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'cobros_409_' + causa + '_' + idioma + '_' + ancho + '.png'), fullPage: true });
    await ctx.close();
  }

  // 20. 502 aviso_no_enviado: no se relee como duda, el código sigue valiendo y el reintento guarda con el MISMO código
  b = base({ nuevo: true, avisoFalla: 1 });
  ({ p, ctx } = await abre(nav, b));
  await p.click('[data-axw-cobros="modo-live"]');
  await p.fill('[data-axw-campo="creacion"]', PROD_C); await p.fill('[data-axw-campo="lectura"]', PROD_L); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  await p.fill('[data-axw-campo="confirma_live"]', 'LIVE'); await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  await p.fill('[data-axw-campo="codigo"]', '123456'); await p.fill('[data-axw-campo="contrasena"]', 'buena');
  const est20 = b.edge.filter(x => x.accion === 'estado').length;
  await p.click('[data-axw-cobros-host="guardar"]'); await p.waitForTimeout(500);
  ok('502 aviso_no_enviado: lo dice en llano (nada guardado, el código sigue valiendo)', ((await txt(p, `${C} [data-axw-cobros-error="aviso"]`)) || '').includes('El código sigue valiendo') && !b.est.configurado);
  ok('502 aviso_no_enviado: no se relee estado como si fuera una duda', b.edge.filter(x => x.accion === 'estado').length === est20);
  ok('502 aviso_no_enviado: sigue en la fase del código, con el código tecleado', (await p.$eval('[data-axw-campo="codigo"]', i => i.value)) === '123456');
  await p.fill('[data-axw-campo="contrasena"]', 'buena');
  await p.click('[data-axw-cobros-host="guardar"]'); await p.waitForTimeout(700);
  const g20 = b.edge.filter(x => x.accion === 'probar_y_guardar');
  ok('502 aviso_no_enviado: el reintento guarda con el mismo código y confirmar_live', g20.length === 2 && g20[1].codigo === '123456' && g20[1].confirmar_live === 'LIVE' && b.est.configurado && b.est.modo === 'live');
  await ctx.close();

  // 21. falta_confirmar_live en probar_y_guardar (no debería pasar): vuelve a escribir, con el campo LIVE a mano y la frase en llano
  b = base({ nuevo: true, fcl: true });
  ({ p, ctx } = await abre(nav, b));
  await p.click('[data-axw-cobros="modo-live"]');
  await p.fill('[data-axw-campo="creacion"]', PROD_C); await p.fill('[data-axw-campo="lectura"]', PROD_L); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  await p.fill('[data-axw-campo="confirma_live"]', 'LIVE'); await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  await p.fill('[data-axw-campo="codigo"]', '123456'); await p.fill('[data-axw-campo="contrasena"]', 'buena');
  await p.click('[data-axw-cobros-host="guardar"]'); await p.waitForTimeout(500);
  ok('falta_confirmar_live: se vuelve a escribir, con el campo LIVE y su frase', !!(await p.$('[data-axw-cobros="pedir"]')) && !!(await p.$('[data-axw-campo="confirma_live"]')) && ((await txt(p, `${C} [data-axw-cobros-error="aviso"]`)) || '').includes('escribir LIVE'));
  await ctx.close();

  // 21b. otro administrador pasa la instancia a real con esta página abierta: pedir_codigo da falta_confirmar_live, se relee y sale el campo LIVE
  b = base({ nuevo: true, conf: { creacion: 1, lectura: 1, aviso: 1 }, modo: 'test' });
  ({ p, ctx } = await abre(nav, b));
  await p.click('[data-axw-cobros="reemplazar-aviso"]'); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  b.est.modo = 'live'; b.est.modo_desde = { en: '2026-10-13T03:00:00Z', por: 'otro@balibestmotorcycle.com' };
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(400);
  ok('cambio de modo por otro: dice que lo cambió otro, relee, pasa a real con el campo LIVE y VACÍA lo tecleado', ((await txt(p, `${C} [data-axw-cobros-error="aviso"]`)) || '').startsWith('Otro administrador ha cambiado el modo')
     && (await p.getAttribute('[data-axw-cobros="modo-live"]', 'aria-checked')) === 'true' && (await p.$$('#lw-aj-cobros input[type="password"]')).length === 0 && !(await p.$('[data-axw-campo="confirma_live"]')));
  await p.click('[data-axw-cobros="reemplazar-aviso"]'); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  await p.fill('[data-axw-campo="confirma_live"]', 'LIVE'); await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
  ok('cambio de modo por otro: tras volver a pegar y teclear LIVE, se pide el código', b.edge.filter(x => x.accion === 'pedir_codigo').length === 2 && !!(await p.$('[data-axw-cobros-enviado]')));
  await ctx.close();

  // 22. servidor viejo, sin autorización y la instancia ya en real (caso imposible hoy): no hay botón muerto que pida LIVE sin campo
  b = base({ conf: { creacion: 1, lectura: 1, aviso: 1 }, modo: 'live', live: false });
  ({ p, ctx } = await abre(nav, b));
  await p.click('[data-axw-cobros="reemplazar-aviso"]'); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
  await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(200);
  ok('viejo sin autorización y en real: lo dice con la frase neutra y no gasta código', b.edge.filter(x => x.accion === 'pedir_codigo').length === 0 && ((await txt(p, `${C} [data-axw-cobros-error="aviso"]`)) || '').includes('no está disponible'));
  await ctx.close();

  // 12. idiomas y anchos: ninguna frase sin traducir, sin scroll horizontal (sin configurar, código pedido y configurada)
  for (const idioma of ['es', 'en', 'id']) for (const ancho of [390, 1440]) {
    b = base({ live: true });
    ({ p, ctx } = await abre(nav, b, { idioma, ancho }));
    await p.click('[data-axw-cobros="modo-live"]');
    await p.fill('[data-axw-campo="creacion"]', PROD_C); await p.fill('[data-axw-campo="lectura"]', PROD_L); await p.fill('[data-axw-campo="aviso"]', CANARIO_A);
    await p.fill('[data-axw-campo="confirma_live"]', 'LIVE'); await p.click('[data-axw-cobros="pedir"]'); await p.waitForTimeout(300);
    await p.click('[data-axw-cobros-host="guardar"]'); await p.waitForTimeout(100);
    const w1 = await p.evaluate(() => document.documentElement.scrollWidth);
    const sin1 = (await p.evaluate(() => window.__sinTrad)).filter(s => !/^(Xendit|LIVE)$/.test(s));
    ok(idioma + ' ' + ancho + ': código pedido, ninguna frase sin traducir', idioma === 'es' || sin1.length === 0, sin1.slice(0, 4).join(' | '));
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'cobros_codigo_' + idioma + '_' + ancho + '.png'), fullPage: true });
    await ctx.close();
    b = base({ conf: { creacion: 1, lectura: 1, aviso: 1 }, modo: 'live', nuevo: true, modoDesde: { en: '2026-10-13T01:00:00Z', por: 'dion.wijaya.operaciones@balibestmotorcycle.com' } });
    let r2 = await abre(nav, b, { idioma, ancho });
    await r2.p.click('[data-axw-cobros="reemplazar-aviso"]');   // con el campo LIVE y su nota a la vista
    const w2 = await r2.p.evaluate(() => document.documentElement.scrollWidth);
    const sin = (await r2.p.evaluate(() => window.__sinTrad)).filter(s => !/^(Xendit|LIVE)$/.test(s));
    ok(idioma + ' ' + ancho + ': ninguna frase sin traducir', idioma === 'es' || sin.length === 0, sin.slice(0, 4).join(' | '));
    ok(idioma + ' ' + ancho + ': sin scroll horizontal', w1 <= ancho && w2 <= ancho, w1 + ' / ' + w2);
    if (SHOT) await r2.p.screenshot({ path: path.join(SHOT, 'cobros_configurada_' + idioma + '_' + ancho + '.png'), fullPage: true });
    await r2.ctx.close();
  }

  // 13. «Comisión de pago en línea (%)» (erp-front 14-oct; contrato bbm_bot_al_erp_13oct.md §3a): fuera de #lw-aj-cobros, con su propio botón
  {
    const conCom = (o = {}) => { const x = base({ conf: { creacion: 1, lectura: 1, aviso: 1 }, modo: 'test', nuevo: true });
      x.ajustes = { editables: o.sinClave ? ['marca'] : ['marca', 'cobros_comision_pct'], puede_escribir: o.escribe !== false, valores: o.sinValor ? {} : { cobros_comision_pct: 3 }, actualizado: {} };
      x.guarda = a => {
        if (typeof a.p_valor !== 'number' || a.p_valor < 0 || a.p_valor > 10 || Math.round(a.p_valor * 100) !== a.p_valor * 100) return { data: null, error: { code: '22023', message: 'x', hint: 'comision_no_valida' } };
        if (o.red) return { data: null, error: { message: 'Failed to fetch' } };
        if ('cobros_comision_pct' in x.ajustes.valores && (!a.p_motivo || a.p_motivo.trim().length < 3)) return { data: null, error: { code: '22023', message: 'motivo', hint: 'motivo' } };
        x.ajustes.valores.cobros_comision_pct = a.p_valor; return { data: { ok: true }, error: null }; };
      return x; };
    const C2 = '[data-axw-comision="bloque"]';
    // sin la clave en editables (la demo): no sale; y el componente de claves sigue igual (ningún input nuevo DENTRO de #lw-aj-cobros)
    b = conCom({ sinClave: true }); ({ p, ctx } = await abre(nav, b));
    ok('comisión: una base sin cobros_comision_pct en editables no enseña el bloque', !(await p.$(C2 + ':not([hidden])')));
    await ctx.close();
    for (const idioma of ['es', 'en', 'id']) {
      b = conCom(); ({ p, ctx } = await abre(nav, b, { idioma }));
      const v = await p.$eval('[data-axw-comision="pct"]', e => e.value);
      ok(idioma + ': comisión: enseña la cifra de la base (3), fuera de #lw-aj-cobros', v === '3' && !(await p.$('#lw-aj-cobros [data-axw-comision]')));
      // «3,5» con coma (lo normal en id y es) = 3.5, número JSON; sin motivo la base lo rechaza y se dice
      await p.fill('[data-axw-comision="pct"]', '3,5'); await p.click('[data-axw-comision="guardar"]'); await p.waitForTimeout(200);
      const g1 = (b.guardados || []).slice(-1)[0];
      ok(idioma + ': comisión: «3,5» se manda como 3.5 (número) y sin motivo la base pide motivo', !!g1 && g1.p_valor === 3.5 && typeof g1.p_valor === 'number' && !('p_motivo' in g1)
         && (await txt(p, '[data-axw-comision="estado"]')) === { es: 'Escribe por qué lo cambias (por ejemplo, la tarifa de la pasarela).', en: "Write why you change it (for example, the gateway's rate).", id: 'Tulis alasan perubahannya (misalnya, tarif gateway).' }[idioma]);
      await p.fill('[data-axw-comision="motivo"]', 'tarifa de Xendit'); await p.click('[data-axw-comision="guardar"]'); await p.waitForTimeout(300);
      ok(idioma + ': comisión: con motivo se guarda, se relee de la base y lo dice', b.ajustes.valores.cobros_comision_pct === 3.5 && (await p.$eval('[data-axw-comision="pct"]', e => e.value)) === (idioma === 'en' ? '3.5' : '3,5')
         && (await txt(p, '[data-axw-comision="estado"]')) === { es: 'Comisión guardada.', en: 'Fee saved.', id: 'Biaya tersimpan.' }[idioma]);
      const sinT = (await p.evaluate(() => window.__sinTrad)).filter(s => !/^(Xendit|LIVE)$/.test(s));
      ok(idioma + ': comisión: ninguna frase sin traducir', idioma === 'es' || sinT.length === 0, sinT.slice(0, 3).join(' | '));
      for (const ancho of [390, 1440]) { await p.setViewportSize({ width: ancho, height: 900 }); await p.waitForTimeout(100);
        const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(idioma + ' ' + ancho + ': comisión sin scroll horizontal', w <= ancho, String(w));
        if (SHOT) await p.screenshot({ path: path.join(SHOT, 'cobros_comision_' + idioma + '_' + ancho + '.png'), fullPage: true }); }
      await ctx.close();
    }
    // cifras que no valen: no llegan a la base (y la base lo vuelve a mirar igual)
    b = conCom(); ({ p, ctx } = await abre(nav, b));
    for (const malo of ['3.555', '11', 'abc', '-1', '1.000', '', '10,5']) {
      await p.fill('[data-axw-comision="pct"]', malo); await p.click('[data-axw-comision="guardar"]'); await p.waitForTimeout(80);
    }
    ok('comisión: 3.555, 11, abc, -1, 1.000, vacío y 10,5 no se mandan', !(b.guardados || []).length && ((await txt(p, '[data-axw-comision="estado"]')) || '').startsWith('Un número de 0 a 10'));
    await p.fill('[data-axw-comision="pct"]', '3'); await p.click('[data-axw-comision="guardar"]'); await p.waitForTimeout(80);
    ok('comisión: la misma cifra no se manda («No has cambiado la cifra.»)', !(b.guardados || []).length && (await txt(p, '[data-axw-comision="estado"]')) === 'No has cambiado la cifra.');
    // el bloque no se duplica cuando el anfitrión vuelve a montar
    await p.evaluate(() => { location.hash = '#x'; }); await p.evaluate(() => { location.hash = '#cobros'; }); await p.waitForTimeout(200);
    ok('comisión: un solo bloque aunque el anfitrión vuelva a montar', (await p.$$(C2)).length === 1);
    await ctx.close();
    // sin red: «no sabemos si se guardó»
    b = conCom({ red: true }); ({ p, ctx } = await abre(nav, b));
    await p.fill('[data-axw-comision="pct"]', '2'); await p.fill('[data-axw-comision="motivo"]', 'prueba'); await p.click('[data-axw-comision="guardar"]'); await p.waitForTimeout(200);
    ok('comisión: sin respuesta de la base dice que no sabe si se guardó', ((await txt(p, '[data-axw-comision="estado"]')) || '').startsWith('La base no ha respondido'));
    await ctx.close();
    // quien no puede escribir: ve la cifra, sin botón ni motivo
    b = conCom({ escribe: false }); ({ p, ctx } = await abre(nav, b));
    ok('comisión: sin puede_escribir se ve la cifra en solo lectura, sin guardar', await p.$eval('[data-axw-comision="pct"]', e => e.disabled && e.value === '3') && !(await p.$('[data-axw-comision="guardar"]')) && !!(await p.$('[data-axw-comision="solo-lectura"]')));
    await ctx.close();
    // la primera lectura falla: el bloque lo DICE (antes no salía y nadie lo decía; revisor, 1.ª vuelta de erp-front-cobros)
    b = conCom(); b.leeFalla = [true]; ({ p, ctx } = await abre(nav, b));
    ok('comisión: si no se puede leer, el bloque sale y dice «recarga la página»', ((await txt(p, '[data-axw-comision="no-leida"]')) || '').includes('recarga la página') && !(await p.$('[data-axw-comision="guardar"]')));
    await ctx.close();
    // quien no es administrador entra por la URL: 42501 no es un fallo que se arregle recargando; el bloque no sale (revisor, 2.ª vuelta, BAJA 3)
    b = conCom(); b.leeFalla = ['42501']; ({ p, ctx } = await abre(nav, b));
    ok('comisión: 42501 al leer (no administrador): ni bloque ni «recarga la página»', !(await p.$('[data-axw-comision="no-leida"]')) && !(await p.$('[data-axw-comision="bloque"]:not([hidden])')));
    await ctx.close();
    // se guarda y la relectura falla: el bloque se queda y lo dice (antes se escondía y se perdía «Comisión guardada»)
    b = conCom(); b.leeFallaTrasGuardar = true; ({ p, ctx } = await abre(nav, b));
    await p.fill('[data-axw-comision="pct"]', '2'); await p.fill('[data-axw-comision="motivo"]', 'tarifa nueva'); await p.click('[data-axw-comision="guardar"]'); await p.waitForTimeout(300);
    ok('comisión: guardada y sin relectura, el bloque sigue y dice «guardada, recarga para verla»', b.ajustes.valores.cobros_comision_pct === 2 && !!(await p.$(C2 + ':not([hidden])'))
       && ((await txt(p, '[data-axw-comision="estado"]')) || '').startsWith('Comisión guardada, pero no se pudo volver a leer'));
    await p.click('[data-axw-comision="guardar"]'); await p.waitForTimeout(150);
    ok('comisión: y volver a pulsar con la misma cifra no la manda otra vez', (b.guardados || []).length === 1);
    await ctx.close();
    // primera vez (sin fila): se guarda sin motivo
    b = conCom({ sinValor: true }); ({ p, ctx } = await abre(nav, b));
    await p.fill('[data-axw-comision="pct"]', '0'); await p.click('[data-axw-comision="guardar"]'); await p.waitForTimeout(300);
    ok('comisión: sin valor previo, «0» se guarda sin motivo', b.ajustes.valores.cobros_comision_pct === 0);
    await ctx.close();
  }
  // B10 (14-oct-2026): «Quién atiende las reservas del bot de WhatsApp: Dion / ERP», debajo del componente, solo en la pestaña. Lo de sin navegador
  // (forma, faltas, errores, máquina de duda) está en cobros_bot.test.js; aquí, lo que solo se ve con la página de verdad: anchos, idiomas y el recorrido.
  {
    const BB = '[data-axw-bot-backend="bloque"]';
    const BOT0 = COBROS.edge.acciones.estado.respuesta_200.bot_backend;   // dion, falta cobros + usuarios
    // edge de antes de B10: sin la clave, el bloque no sale y no se llama a nada más
    b = base(); ({ p, ctx } = await abre(nav, b));
    ok('bot: edge sin bot_backend = sin bloque', !(await p.$(BB + ':not([hidden])')) && b.edge.every(x => x.accion === 'estado'));
    await ctx.close();
    // el asistente no lo enseña (solo la pestaña)
    b = base({ bot: BOT0 }); ({ p, ctx } = await abre(nav, b, { tipo: 'asistente', url: '/ajustes/configurar/?modulo=reservas-producto&paso=cobros' }));
    ok('bot: el paso del asistente no lleva el bloque', !(await p.$(BB)));
    await ctx.close();
    for (const idioma of ['es', 'en', 'id']) for (const ancho of [390, 1440]) {
      b = base({ bot: BOT0 }); ({ p, ctx } = await abre(nav, b, { idioma, ancho }));
      ok('bot ' + idioma + ' ' + ancho + ': el bloque sale con la MISMA llamada estado', !!(await p.$(BB + ':not([hidden])')) && b.edge.filter(x => x.accion === 'estado').length === 1);
      ok('bot ' + idioma + ' ' + ancho + ': ERP apagado y dice qué falta', await p.$eval('[data-axw-bot-backend="valor-erp"]', e => e.disabled) && !!(await p.$('[data-axw-bot-falta="cobros"]')) && !!(await p.$('[data-axw-bot-falta="usuarios"]')));
      ok('bot ' + idioma + ' ' + ancho + ': sin scroll horizontal', (await p.evaluate(() => document.documentElement.scrollWidth)) <= ancho);
      ok('bot ' + idioma + ' ' + ancho + ': nada se sale del bloque', await p.$eval(BB, c => { const r = c.getBoundingClientRect(); return Array.from(c.querySelectorAll('*')).every(e => { const x = e.getBoundingClientRect(); return !x.width || (x.left >= r.left - 1 && x.right <= r.right + 1); }); }));
      ok('bot ' + idioma + ' ' + ancho + ': botones y enlaces de al menos 44 px', await p.$$eval(BB + ' button, ' + BB + ' a', l => l.every(e => e.getBoundingClientRect().height >= 44)));
      const sin = (await p.evaluate(() => window.__sinTrad)).filter(s => !/^(Xendit|LIVE|Dion|ERP)$/.test(s));
      if (idioma !== 'es') ok('bot ' + idioma + ' ' + ancho + ': todo traducido', !sin.length, sin.slice(0, 4).join(' | '));
      if (SHOT) await p.screenshot({ path: path.join(SHOT, 'cobros_bot_' + idioma + '_' + ancho + '.png'), fullPage: true });
      await ctx.close();
    }
    // guardado ERP pero va con Dion: el aviso, a 390 en indonesio
    b = base({ bot: Object.assign({}, BOT0, { guardado: 'erp', efectivo: 'dion', falta: ['modulo_no_activo', 'cobros'], ultimo_cambio: { quien: 'owner@balibestmotorcycle.com', cuando: '2026-10-14T10:00:00Z', motivo: '<b>no es marcado</b>' } }) });
    ({ p, ctx } = await abre(nav, b, { idioma: 'id', ancho: 390 }));
    ok('bot: «puesto en ERP, va con Dion» con lo que falta', !!(await p.$('[data-axw-bot-backend="aviso"] [data-axw-bot-falta="modulo_no_activo"]')));
    ok('bot: el motivo de otra persona sale como texto', (await txt(p, '[data-axw-bot-backend="ultimo-motivo"]')) === '<b>no es marcado</b>' && !(await p.$(BB + ' b')));
    ok('bot: 390 id con aviso, sin scroll horizontal', (await p.evaluate(() => document.documentElement.scrollWidth)) <= 390);
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'cobros_bot_aviso_id_390.png'), fullPage: true });
    await ctx.close();
    // el recorrido: ERP listo → elegir ERP, motivo, contraseña mala, buena; una petición por intento con los 4 campos; contraseña vacía tras cada uno
    b = base({ bot: Object.assign({}, BOT0, { puede_erp: true, falta: [] }) }); ({ p, ctx } = await abre(nav, b, { ancho: 390 }));
    await p.click('[data-axw-bot-backend="valor-erp"]');
    await p.fill('[data-axw-campo="bot_motivo"]', 'Todo configurado'); await p.fill('[data-axw-campo="bot_contrasena"]', 'mala');
    await p.click('[data-axw-bot-backend="guardar"]'); await p.waitForTimeout(200);
    ok('bot: contraseña mala = su frase, campo vacío, motivo intacto', (await txt(p, '[data-axw-bot-backend="mensaje"]')) === 'Esa contraseña no es la de tu cuenta.'
      && (await p.$eval('[data-axw-campo="bot_contrasena"]', i => i.value)) === '' && (await p.$eval('[data-axw-campo="bot_motivo"]', i => i.value)) === 'Todo configurado');
    await p.fill('[data-axw-campo="bot_contrasena"]', 'buena');
    await p.click('[data-axw-bot-backend="guardar"]'); await p.waitForTimeout(200);
    const envios = b.edge.filter(x => x.accion === 'bot_backend');
    ok('bot: dos intentos = dos peticiones, cada una con accion, valor, motivo y contrasena', envios.length === 2 && envios.every(x => Object.keys(x).sort().join() === 'accion,contrasena,motivo,valor' && x.valor === 'erp'));
    ok('bot: guardado, repintado con ERP y sin la contraseña', (await p.$eval('[data-axw-bot-backend="efectivo"]', e => e.getAttribute('data-axw-bot-efectivo'))) === 'erp'
      && (await p.$eval('[data-axw-campo="bot_contrasena"]', i => i.value)) === '' && ((await txt(p, '[data-axw-bot-backend="ultimo"]')) || '').includes('owner@balibestmotorcycle.com'));
    ok('bot: la contraseña no queda en el marcado ni en la consola', !(await p.evaluate(() => document.documentElement.outerHTML)).includes('buena') && !p.__consola.some(t => /buena|mala/.test(t)));
    await ctx.close();
  }
  await nav.close();
  console.log(fallos ? 'FALLAN ' + fallos : 'TODO BIEN — cobros.harness.cjs');
  process.exit(fallos ? 1 : 0);
})();
