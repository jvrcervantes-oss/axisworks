// node comercial/demo-erp/pruebas/setup_propiedades.harness.cjs [carpeta_capturas]
// Arnés de los pasos de PROPIEDADES (erp-front, 14-oct-2026; contrato encargo_front_pasos_propiedades.md de erp-setup, N4 20261014051000):
// tipos_vivienda (módulo proyectos), fases_obra (obra) y carta_reserva (reservas). asistente_setup.html + ajustes_puesta.js + setup_modulos.js +
// setup_pasos.js + setup_propiedades.js REALES en Chromium, con la base SIMULADA y CON ESTADO, que contesta como las funciones de N4 (mismos code/hint).
// Mide: qué se manda a cada función y con qué claves, que una clave repetida no pisa otra fila, los errores por code + hint con la frase de su pieza
// (nunca el mensaje de la base ni un código), el paso hecho al acabar, el mismo componente en Ajustes, y es/en/id a 390 y 1440 px sin scroll horizontal
// ni frases sin traducir. La base real NO se toca.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const EXE = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const AQUI = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(AQUI, 'asistente_setup.html'), 'utf8').split('<!--AXW_SCRIPT-->');
const JS = f => fs.readFileSync(path.join(AQUI, f), 'utf8').replace(/<\/script>/g, '<\\/script>');
const NUCLEO = JS('setup_modulos.js'), PASOS = JS('setup_pasos.js'), PROP = JS('setup_propiedades.js'), COMUN = JS('setup_comun.js'), PUESTA = JS('ajustes_puesta.js');
// el orden del paquete (build.py mete cada script justo detrás de setup_pasos.js; el último en meterse queda delante): pasos → propiedades → comun
const SHOT = process.argv[2];
let fallos = 0;
const ok = (n, c, x = '') => { if (!c) { fallos++; console.log('FALLA  ' + n + (x ? ' -> ' + x : '')); } else console.log('ok     ' + n); };

// ── la base simulada: las tablas y las cuatro reglas de N4 ──────────────────────────────────────────────────────────────────────────────────
function base(o = {}) {
  return { o, llamadas: [], falla: Object.assign({}, o.falla || {}),
    tipos: (o.tipos || []).map(t => Object.assign({}, t)), fases: (o.fases || []).map(f => Object.assign({}, f)), pagos: Object.assign({}, o.pagos || {}),
    tc: (o.tc || [{ clave: 'carta_reserva', nombre: 'Carta de reserva', activo: true, orden: 1 }, { clave: 'compraventa', nombre: 'Compraventa', activo: true, orden: 2 }]).map(t => Object.assign({}, t)),
    etapas: Object.assign({}, o.etapas || {}), conContratos: o.conContratos || [], enUso: o.enUso || [] };
}
const err = (code, hint) => ({ data: null, error: { code, hint: hint || null, message: 'mensaje en español que el front NO lee' } });
const CLAVE = /^[a-z][a-z0-9_]{1,39}$/;
const nombreMal = n => typeof n !== 'string' || !n.trim() || n.trim().length > 60 || /^[=+\-@]/.test(n.trim());
function pasos(b) {
  const P = (modulo, clave, hecho, falta) => ({ modulo, clave, hecho, obligatorio: true, irreversible: false, donde: '/ajustes/', modulo_requerido: null, ref: null, falta: hecho ? null : falta });
  return [P('proyectos', 'tipos_vivienda', b.tipos.some(t => t.activo), { codigo: 'falta_dato', campos: [] }),
          P('obra', 'fases_obra', b.fases.length > 0, { codigo: 'falta_dato', campos: [] }),
          P('reservas', 'carta_reserva', b.tc.some(t => t.activo && b.etapas[t.clave] === 'reserva'), { codigo: 'falta_dato', campos: [] })];
}
function estado(b) {
  const ps = pasos(b);
  return { puede_configurar: true, moneda: 'IDR', monedas: ['IDR'], pasos: ps,
    modulos: ['proyectos', 'obra', 'reservas'].map(m => { const pend = ps.filter(p => p.modulo === m && !p.hecho); return { modulo: m, estado: pend.length ? 'sin_configurar' : 'configurado', falta: pend.length ? pend[0].clave : null }; }) };
}
function servidor(b, n, a) {
  a = a || {};
  b.llamadas.push([n, JSON.parse(JSON.stringify(a))]);
  if (n === 'modulos_setup_estado') return { data: estado(b), error: null };
  if (n === 'ajustes_config_datos') return { data: { valores: {}, puede_escribir: true }, error: null };
  if (n === 'from:tipos_vivienda' && b.o.listaFalla) return err('57014');
  if (b.o.listaFallaEn === n) return err('57014');
  if (b.o.redEn === n) return { red: true };
  if (n === 'from:tipos_vivienda') return { data: b.tipos.map(t => Object.assign({}, t)), error: null };
  if (n === 'from:obra_fases') return { data: b.fases.map(f => Object.assign({}, f)), error: null };
  if (n === 'from:obra_fase_orden_pago') return { data: Object.keys(b.pagos).map(k => ({ obra_fase_clave: k, orden_pago: b.pagos[k] })), error: null };
  if (n === 'from:contrato_tipo_etapa') return { data: Object.keys(b.etapas).map(k => ({ tipo: k, etapa: b.etapas[k] })), error: null };
  if (n === 'comisiones_interruptor_datos') return b.o.sinInt ? err('42883') : { data: Object.assign({ recalculo_auto: false, modo_obligatorio: false, cambiado_por: 'dion@x.com', cambiado_en: '2026-10-14T02:00:00Z', puede_editar: true }, b.o.int || {}), error: null };
  if (n === 'comisiones_interruptor_guarda') {   // §1d: solo el principal; solo booleanos de las dos claves; devuelve los dos valores
    if (b.o.intNoPrincipal) return err('42501');
    const d = a.p_datos || {};
    if (Object.keys(d).some(k => !['recalculo_auto', 'modo_obligatorio'].includes(k)) || Object.values(d).some(v => typeof v !== 'boolean')) return err('22023', 'campo_desconocido');
    if (b.o.intPierde) return { red: true };
    b.int = Object.assign({ recalculo_auto: false, modo_obligatorio: false }, b.o.int || {}, b.int || {}, d);
    return { data: { recalculo_auto: b.int.recalculo_auto, modo_obligatorio: b.int.modo_obligatorio }, error: null };
  }
  if (n === 'plantillas_contrato_datos') return b.o.sinPlantillas ? err('42501') : { data: { puede_editar: true, tipos: b.tc.map(t => Object.assign({}, t)), plantillas: [] }, error: null };
  const f = b.falla[n];
  if (f) { delete b.falla[n]; return err(f[0], f[1]); }
  if (n === 'tipo_vivienda_guarda') {   // 20261014051000 §1a
    const d = a.p_datos || {}, k = String(a.p_clave || '');
    if (Object.keys(d).some(x => !['etiqueta', 'activo'].includes(x))) return err('22023', 'campo_desconocido');
    if (!CLAVE.test(k)) return err('22023', 'clave_no_valida');
    if ('etiqueta' in d && nombreMal(d.etiqueta)) return err('22023', 'nombre_no_valido');
    const t = b.tipos.find(x => x.clave === k);
    if (t) { if ('etiqueta' in d) t.etiqueta = d.etiqueta.trim(); if ('activo' in d) t.activo = d.activo; }
    else { if (!('etiqueta' in d)) return err('22023', 'nombre_no_valido'); b.tipos.push({ clave: k, etiqueta: d.etiqueta.trim(), activo: 'activo' in d ? d.activo : true }); }
    return { data: k, error: null };
  }
  if (n === 'obra_fase_guarda') {   // §1b
    const d = a.p_datos || {}, k = String(a.p_clave || '');
    if (Object.keys(d).some(x => !['es', 'en', 'orden', 'orden_pago'].includes(x))) return err('22023', 'campo_desconocido');
    if (!CLAVE.test(k)) return err('22023', 'clave_no_valida');
    if (('es' in d && nombreMal(d.es)) || ('en' in d && nombreMal(d.en))) return err('22023', 'nombre_no_valido');
    if ('orden' in d && !(Number.isInteger(d.orden) && d.orden >= 1 && d.orden <= 1000)) return err('22023', 'orden_no_valido');
    if ('orden_pago' in d && d.orden_pago !== null && ![1, 2, 3, 4, 5].includes(d.orden_pago)) return err('22023', 'orden_pago_no_valido');
    const f0 = b.fases.find(x => x.clave === k);
    if (f0 && b.enUso.includes(k) && ((('orden_pago' in d) && (d.orden_pago ?? null) !== (b.pagos[k] ?? null)) || ('orden' in d && d.orden !== f0.orden))) return err('55000', 'fase_en_uso');
    if ('orden' in d && b.fases.some(x => x.orden === d.orden && x.clave !== k)) return err('23505', 'orden_ocupado');
    if (f0) { if ('es' in d) f0.es = d.es; if ('en' in d) f0.en = d.en; if ('orden' in d) f0.orden = d.orden; }
    else { if (!('es' in d)) return err('22023', 'nombre_no_valido'); b.fases.push({ clave: k, es: d.es, en: d.en || d.es, orden: d.orden || (Math.max(0, ...b.fases.map(x => x.orden)) + 1) }); }
    if ('orden_pago' in d) { if (d.orden_pago === null) delete b.pagos[k]; else b.pagos[k] = d.orden_pago; }
    return { data: k, error: null };
  }
  if (n === 'contrato_tipo_etapa_guarda') {   // §1c
    if (!['reserva', 'contrato', 'ninguna'].includes(a.p_etapa)) return err('22023', 'etapa_no_valida');
    if (!b.tc.some(t => t.clave === a.p_tipo)) return err('P0002');
    if (b.etapas[a.p_tipo] && b.conContratos.includes(a.p_tipo)) return err('55000', 'tipo_con_contratos');
    b.etapas[a.p_tipo] = a.p_etapa;
    return { data: a.p_tipo, error: null };
  }
  return err('42883');
}

// ── las páginas ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const cabeza = idioma => `<!doctype html><html lang="${idioma}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:sans-serif}main{padding:16px}.hidden{display:none}[hidden]{display:none!important}input,select{box-sizing:border-box}</style></head><body>`;
const sesion = (idioma, url) => `<script>
history.replaceState(null, '', '${url}');
window.__sinTrad = []; window.__errores = [];
window.addEventListener('error', function (e) { window.__errores.push(String(e.message)); });
window.LW_IDIOMA = '${idioma}';
// sb.from: una cadena que apunta la consulta y la contesta la base simulada por el nombre de la tabla
function cadena(t) { var q = { _t: t }; ['select', 'eq', 'neq', 'order', 'limit', 'in'].forEach(function (m) { q[m] = function () { return q; }; });
  q.then = function (a, b) { return window.__srv('from:' + t, {}).then(a, b); }; return q; }
var sb = { rpc: function (n, a) { return window.__srv(n, a || {}); }, from: cadena, auth: { getSession: function () { return Promise.resolve({ data: { session: { access_token: 'tok' } } }); } } };
window.LW_AUTH = Promise.resolve({ sb: sb });
window.lwDatos = function (n, a) { return sb.rpc(n, a); };
window.LW_EN = {}; window.LW_ID = {}; window.__idioma = '${idioma}';
window.lwT = function (s, hu) { s = String(s); var d = window.__idioma === 'en' ? window.LW_EN : window.__idioma === 'id' ? window.LW_ID : null; var v = s;
  if (d) { if (Object.prototype.hasOwnProperty.call(d, s)) v = d[s]; else if (!/^[\\s0-9.:—-]*$/.test(s)) window.__sinTrad.push(s); }
  if (hu) for (var k in hu) v = v.split('%' + k).join(hu[k]); return v; };
</script>`;
const asistente = (idioma, url) => cabeza(idioma) + `<main>${HTML[0]}</main>` + sesion(idioma, url) + `<script>${NUCLEO}</script><script>${PASOS}</script><script>${PROP}</script><script>${COMUN}</script>${HTML[1]}</body></html>`;
const conTab = idioma => cabeza(idioma) + `<main><div role="tablist"><button type="button" data-lw-tab="empresa">Empresa</button><button type="button" id="lw-tab-comisiones" data-lw-tab="comisiones" data-lwt hidden>Comisiones</button></div>
<section data-lw-panel="comisiones" hidden><div id="lw-aj-comisiones"></div></section></main>
<script>document.addEventListener('click', function (e) { var t = e.target.closest('[data-lw-tab]'); if (!t) return; document.querySelectorAll('[data-lw-panel]').forEach(function (s) { s.hidden = s.getAttribute('data-lw-panel') !== t.getAttribute('data-lw-tab'); }); });</script>` + sesion(idioma, '/ajustes/') +
  `<script>${NUCLEO}</script><script>${PASOS}</script><script>${PROP}</script></body></html>`;
const ajustes = idioma => cabeza(idioma) + `<main><section data-lw-panel="puesta"><div id="lw-aj-puesta"><p>…</p></div></section></main>` + sesion(idioma, '/ajustes/') +
  `<script>${NUCLEO}</script><script>${PASOS}</script><script>${PROP}</script><script>${COMUN}</script><script>${PUESTA}</script></body></html>`;

async function abre(nav, b, { idioma = 'es', url = '/ajustes/configurar/?modulo=proyectos', ancho = 1440, pag = 'asistente' } = {}) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 900 } });
  const p = await ctx.newPage();
  const body = pag === 'comisiones' ? conTab(idioma) : pag === 'ajustes' ? ajustes(idioma) : asistente(idioma, url);
  await p.route('**/*', r => r.fulfill({ status: 200, contentType: 'text/html', body }));
  await p.exposeFunction('__srv', async (n, a) => { const r = servidor(b, n, a); if (r && r.red) throw new Error('Failed to fetch'); return r; });
  await p.goto('http://local.test' + (pag === 'ajustes' || pag === 'comisiones' ? '/ajustes/' : url));
  await p.waitForTimeout(500);
  return { p, ctx };
}
const entraCom = async p => { await p.click('[data-lw-tab="comisiones"]'); await p.waitForTimeout(100); };   // ajustes.js abre el panel al pulsar la pestaña (aquí, el stub de conTab)
const txt = async (p, sel) => (await p.$(sel)) ? (await p.$eval(sel, e => e.textContent.trim())) : null;
const clic = async (p, accion) => { await p.click('[data-axw-accion="' + accion + '"]'); await p.waitForTimeout(400); };
const pasoActual = p => p.getAttribute('[data-axw-paso]', 'data-axw-paso').catch(() => null);
const de = (b, n) => b.llamadas.filter(x => x[0] === n).map(x => x[1]);
const errorTxt = async p => (await txt(p, '[data-axw-as="error"]')) || (await txt(p, '[data-axw-pr-error]'));
const sinErroresJs = async (p, n) => ok(n + ': sin errores de página', (await p.evaluate(() => window.__errores)).length === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
const sinCodigo = t => !/(c[óo]digo|code|kode)\s*:|22023|42501|55000|23505|P0002/i.test(String(t || '')) && !String(t || '').includes('NO lee');

(async () => {
  const nav = await chromium.launch({ executablePath: EXE });
  let b, p, ctx;

  // ── 1. tipos de vivienda desde vacío: ofrece «parcela», guarda con la clave y el paso queda hecho ───────────────────────────────────────────
  b = base();
  ({ p, ctx } = await abre(nav, b));
  ok('T1 abre en tipos_vivienda', (await pasoActual(p)) === 'tipos_vivienda', await pasoActual(p));
  ok('T1 la primera vez ofrece «Parcela» con la clave parcela', (await p.inputValue('[data-axw-campo="tv_etiqueta"]')) === 'Parcela' && (await p.inputValue('[data-axw-campo="tv_clave"]')) === 'parcela');
  ok('T1 la lista dice que no hay ninguno', (await p.$('[data-axw-pr-lista-vacia="tipos"]')) !== null);
  ok('T1 sin motivo (la función no lo pide)', !(await p.$('[data-axw-campo="motivo"]')));
  await p.fill('[data-axw-campo="tv_etiqueta"]', 'Villa de lujo');
  ok('T1 la clave la propone el nombre (sin tildes ni espacios)', (await p.inputValue('[data-axw-campo="tv_clave"]')) === 'villa_de_lujo', await p.inputValue('[data-axw-campo="tv_clave"]'));
  await p.fill('[data-axw-campo="tv_etiqueta"]', '=SUMA(A1)'); await clic(p, 'enviar');
  ok('T1 nombre que empieza por =: lo dice y no llama', de(b, 'tipo_vivienda_guarda').length === 0 && ((await errorTxt(p)) || '').includes('= + - @'), await errorTxt(p));
  await p.fill('[data-axw-campo="tv_etiqueta"]', 'Parcela'); await p.fill('[data-axw-campo="tv_clave"]', 'parcela'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  const t1 = de(b, 'tipo_vivienda_guarda');
  ok('T1 manda tipo_vivienda_guarda(parcela, {etiqueta, activo:true})', t1.length === 1 && t1[0].p_clave === 'parcela' && JSON.stringify(t1[0].p_datos) === '{"etiqueta":"Parcela","activo":true}', JSON.stringify(t1));
  ok('T1 hecho: el módulo queda listo', (await p.$('[data-axw-estado="listo"]')) !== null || (await p.$('[data-axw-hecho]')) !== null, await txt(p, '[data-axw-estado]'));
  await sinErroresJs(p, 'T1');
  await ctx.close();

  // ── 2. con tipos: clave repetida NO pisa, Editar cambia solo el nombre, Desactivar, y 42501 con la frase de la pieza ─────────────────────────
  b = base({ tipos: [{ clave: 'parcela', etiqueta: 'Parcela', activo: true }, { clave: 'villa', etiqueta: 'Villa', activo: false }], falla: {} });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=proyectos&paso=tipos_vivienda' }));
  if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
  ok('T2 lista los dos, el inactivo marcado', (await p.$$('[data-axw-pr-tipo]')).length === 2 && ((await txt(p, '[data-axw-pr-tipo="villa"]')) || '').includes('Desactivado'));
  await p.fill('[data-axw-campo="tv_etiqueta"]', 'Parcela'); await clic(p, 'enviar');
  ok('T2 clave repetida (parcela): lo dice y no llama (la función ACTUALIZARÍA la otra fila)', de(b, 'tipo_vivienda_guarda').length === 0 && ((await errorTxt(p)) || '').includes('Ya hay un tipo con esa clave'), await errorTxt(p));
  await p.click('[data-axw-pr-accion="tipo-editar"][data-axw-pr-clave="villa"]'); await p.waitForTimeout(150);
  ok('T2 Editar: trae el nombre y deja la clave fija', (await p.inputValue('[data-axw-campo="tv_etiqueta"]')) === 'Villa' && (await p.$eval('[data-axw-campo="tv_clave"]', e => e.disabled)));
  await p.fill('[data-axw-campo="tv_etiqueta"]', 'Villa con piscina'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  let t2 = de(b, 'tipo_vivienda_guarda');
  ok('T2 Editar manda solo la etiqueta (no reactiva)', t2.length === 1 && t2[0].p_clave === 'villa' && JSON.stringify(t2[0].p_datos) === '{"etiqueta":"Villa con piscina"}' && b.tipos[1].activo === false, JSON.stringify(t2));
  await ctx.close();
  b = base({ tipos: [{ clave: 'parcela', etiqueta: 'Parcela', activo: true }], falla: { tipo_vivienda_guarda: ['42501'] } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=proyectos&paso=tipos_vivienda' }));
  if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
  await p.click('[data-axw-pr-accion="tipo-desactivar"][data-axw-pr-clave="parcela"]'); await p.waitForTimeout(300);
  t2 = de(b, 'tipo_vivienda_guarda');
  const e2 = await txt(p, '[data-axw-pr-error="tipos"]');
  ok('T2 Desactivar manda {activo:false}', t2.length === 1 && JSON.stringify(t2[0].p_datos) === '{"activo":false}', JSON.stringify(t2));
  ok('T2 42501: «…con el permiso «Unidades»», sin código ni mensaje de la base', !!e2 && e2.includes('con el permiso «Unidades»') && sinCodigo(e2), e2);
  ok('T2 42501 sin hint (también sesión caducada o candado): dice que recargue y vuelva a entrar, no solo lo del permiso', !!e2 && e2.includes('recarga la página y vuelve a entrar'), e2);
  await ctx.close();
  // puerta de Seguridad (erp-setup-2, 14-oct): con el módulo apagado los escritores dan 42501 / modulo_apagado
  b = base({ tipos: [{ clave: 'parcela', etiqueta: 'Parcela', activo: true }], falla: { tipo_vivienda_guarda: ['42501', 'modulo_apagado'] } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=proyectos&paso=tipos_vivienda' }));
  if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
  await p.click('[data-axw-pr-accion="tipo-desactivar"][data-axw-pr-clave="parcela"]'); await p.waitForTimeout(300);
  const e2b = await txt(p, '[data-axw-pr-error="tipos"]');
  ok('T2 42501/modulo_apagado: «Este módulo está apagado…», no la del permiso', !!e2b && e2b.includes('Este módulo está apagado') && !e2b.includes('permiso') && sinCodigo(e2b), e2b);
  await ctx.close();

  // revisor erp-front-propiedades (14-oct): sin la lista leída no se guarda (la función ACTUALIZARÍA una fila con esa clave que no se ve)
  b = base({ tipos: [{ clave: 'parcela', etiqueta: 'Parcela', activo: true }], listaFalla: true });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=proyectos&paso=tipos_vivienda' }));
  if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
  await p.fill('[data-axw-campo="tv_etiqueta"]', 'Parcela'); await p.fill('[data-axw-campo="tv_clave"]', 'parcela'); await clic(p, 'enviar');
  ok('T2 lista sin leer: no llama y lo dice', de(b, 'tipo_vivienda_guarda').length === 0 && ((await errorTxt(p)) || '').includes('Aún no se ha podido leer la lista'), await errorTxt(p));
  await ctx.close();
  // y un guardado sin respuesta sobre un paso ya hecho NO se da por guardado (comprueba() = false)
  b = base({ tipos: [{ clave: 'parcela', etiqueta: 'Parcela', activo: true }], redEn: 'tipo_vivienda_guarda' });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=proyectos&paso=tipos_vivienda' }));
  if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
  await p.fill('[data-axw-campo="tv_etiqueta"]', 'Villa'); await p.fill('[data-axw-campo="tv_clave"]', 'villa'); await clic(p, 'enviar'); await p.waitForTimeout(600);
  const sinR = await p.evaluate(() => document.body.innerText);
  ok('T2 sin respuesta en un paso ya hecho: no se da por guardado', de(b, 'tipo_vivienda_guarda').length === 1 && /no se guardó|no sabemos|no ha respondido/i.test(sinR) && !b.tipos.some(t => t.clave === 'villa'), sinR.slice(0, 300));
  await ctx.close();

  // ── 3. fases de obra: alta con su pago, clave repetida con sufijo, errores 55000 / 23505 por hint ───────────────────────────────────────────
  b = base({ tipos: [{ clave: 'parcela', etiqueta: 'Parcela', activo: true }] });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=obra' }));
  ok('F1 abre en fases_obra', (await pasoActual(p)) === 'fases_obra', await pasoActual(p));
  ok('F1 propone el orden 1', (await p.inputValue('[data-axw-campo="fo_orden"]')) === '1');
  await clic(p, 'enviar');
  ok('F1 sin nombre: lo pide y no llama', de(b, 'obra_fase_guarda').length === 0 && ((await errorTxt(p)) || '').includes('primera fase'), await errorTxt(p));
  await p.fill('[data-axw-campo="fo_es"]', 'Cimentación'); await p.fill('[data-axw-campo="fo_en"]', 'Foundations'); await p.selectOption('[data-axw-campo="fo_orden_pago"]', '2');
  await clic(p, 'enviar'); await p.waitForTimeout(300);
  const f1 = de(b, 'obra_fase_guarda');
  ok('F1 manda obra_fase_guarda(cimentacion, {es, en, orden:1, orden_pago:2})', f1.length === 1 && f1[0].p_clave === 'cimentacion'
     && JSON.stringify(f1[0].p_datos) === '{"es":"Cimentación","en":"Foundations","orden":1,"orden_pago":2}', JSON.stringify(f1));
  ok('F1 hecho', (await p.$('[data-axw-estado="listo"]')) !== null || (await p.$('[data-axw-hecho]')) !== null);
  await sinErroresJs(p, 'F1');
  await ctx.close();
  b = base({ fases: [{ clave: 'cimentacion', es: 'Cimentación', en: 'Foundations', orden: 1 }], pagos: { cimentacion: 2 }, enUso: ['cimentacion'] });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=obra&paso=fases_obra' }));
  if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
  ok('F2 la lista enseña la fase con su pago', ((await txt(p, '[data-axw-pr-fase="cimentacion"]')) || '').includes('2'));
  await p.fill('[data-axw-campo="fo_es"]', 'Cimentación'); await p.fill('[data-axw-campo="fo_en"]', 'Foundations 2'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  let f2 = de(b, 'obra_fase_guarda');
  ok('F2 alta con el nombre de otra fase: clave con sufijo, NO pisa la existente', f2.length === 1 && f2[0].p_clave === 'cimentacion_2' && b.fases[0].en === 'Foundations', JSON.stringify(f2));
  await ctx.close();
  b = base({ fases: [{ clave: 'cimentacion', es: 'Cimentación', en: 'Foundations', orden: 1 }, { clave: 'estructura', es: 'Estructura', en: 'Structure', orden: 2 }], pagos: { cimentacion: 2 }, enUso: ['cimentacion'] });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=obra&paso=fases_obra' }));
  if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
  await p.click('[data-axw-pr-accion="fase-editar"][data-axw-pr-clave="cimentacion"]'); await p.waitForTimeout(150);
  ok('F3 Editar trae nombre, orden y pago', (await p.inputValue('[data-axw-campo="fo_es"]')) === 'Cimentación' && (await p.inputValue('[data-axw-campo="fo_orden"]')) === '1' && (await p.inputValue('[data-axw-campo="fo_orden_pago"]')) === '2');
  await p.selectOption('[data-axw-campo="fo_orden_pago"]', '3'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  const e3 = await errorTxt(p);
  ok('F3 55000/fase_en_uso: su frase, sin código', !!e3 && e3.includes('Hay unidades en esta fase') && sinCodigo(e3), e3);
  ok('F3 tras fallar, lo tecleado sigue (pago 3) y sigue editando la misma fase', (await p.inputValue('[data-axw-campo="fo_orden_pago"]', { timeout: 2000 }).catch(() => 'sin casilla')) === '3'
     && ((await txt(p, '[data-axw-pr="fase-titulo"]')) || '').includes('Editando'));
  await p.selectOption('[data-axw-campo="fo_orden_pago"]', '2'); await p.fill('[data-axw-campo="fo_en"]', 'Foundation works'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  const f3 = de(b, 'obra_fase_guarda').slice(-1)[0];
  ok('F3 cambiar solo el nombre de una fase en uso: misma clave, guarda', f3 && f3.p_clave === 'cimentacion' && b.fases[0].en === 'Foundation works' && !(await errorTxt(p)), JSON.stringify(f3));
  await ctx.close();
  b = base({ fases: [{ clave: 'cimentacion', es: 'Cimentación', en: 'Foundations', orden: 1 }] });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=obra&paso=fases_obra' }));
  if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
  await p.fill('[data-axw-campo="fo_es"]', 'Cubierta'); await p.fill('[data-axw-campo="fo_en"]', 'Roof'); await p.fill('[data-axw-campo="fo_orden"]', '1'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  const e4 = await errorTxt(p);
  ok('F4 23505/orden_ocupado: «Ya hay otra fase en ese orden.»', !!e4 && e4.includes('Ya hay otra fase en ese orden') && sinCodigo(e4), e4);
  await ctx.close();
  b = base({ fases: [{ clave: 'cimentacion', es: 'Cimentación', en: 'Foundations', orden: 1 }], listaFallaEn: 'from:obra_fase_orden_pago' });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=obra&paso=fases_obra' }));
  if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
  ok('F5 lista sin leer: lo dice en la lista', !!(await p.$('[data-axw-pr-lista-error="fases"]')));
  await p.fill('[data-axw-campo="fo_es"]', 'Cubierta'); await p.fill('[data-axw-campo="fo_en"]', 'Roof'); await clic(p, 'enviar');
  ok('F5 lista sin leer: no llama y lo dice', de(b, 'obra_fase_guarda').length === 0 && ((await errorTxt(p)) || '').includes('Aún no se ha podido leer la lista'), await errorTxt(p));
  await ctx.close();
  b = base({ fases: [{ clave: 'cimentacion', es: 'Cimentación', en: 'Foundations', orden: 1 }], redEn: 'obra_fase_guarda' });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=obra&paso=fases_obra' }));
  if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
  await p.fill('[data-axw-campo="fo_es"]', 'Cubierta'); await p.fill('[data-axw-campo="fo_en"]', 'Roof'); await clic(p, 'enviar'); await p.waitForTimeout(600);
  const sinRf = await p.evaluate(() => document.body.innerText);
  ok('F6 sin respuesta en un paso ya hecho: no se da por guardado', de(b, 'obra_fase_guarda').length === 1 && /no se guardó|no sabemos|no ha respondido/i.test(sinRf) && b.fases.length === 1, sinRf.slice(0, 300));
  await ctx.close();

  // ── 4. carta de reserva: tipos por plantillas_contrato_datos, guarda la etapa, avisa de lo irreversible, 55000/tipo_con_contratos ──────────────
  b = base();
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas' }));
  await p.waitForSelector('[data-axw-campo="cr_tipo"]', { timeout: 3000 }).catch(() => {});
  ok('C1 abre en carta_reserva', (await pasoActual(p)) === 'carta_reserva', await pasoActual(p));
  ok('C1 los tipos llegan por plantillas_contrato_datos (no por la tabla)', de(b, 'plantillas_contrato_datos').length >= 1 && de(b, 'from:tipos_contrato').length === 0);
  ok('C1 aviso irreversible a la vista', ((await txt(p, '[data-axw-pr="carta-aviso"]')) || '').includes('no se puede cambiar después'));
  await clic(p, 'enviar');
  ok('C1 sin elegir: lo pide y no llama', de(b, 'contrato_tipo_etapa_guarda').length === 0 && ((await errorTxt(p)) || '').includes('Elige'), await errorTxt(p));
  await p.selectOption('[data-axw-campo="cr_tipo"]', 'carta_reserva'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  const c1 = de(b, 'contrato_tipo_etapa_guarda');
  ok('C1 manda contrato_tipo_etapa_guarda(carta_reserva, reserva)', c1.length === 1 && c1[0].p_tipo === 'carta_reserva' && c1[0].p_etapa === 'reserva', JSON.stringify(c1));
  ok('C1 hecho', (await p.$('[data-axw-estado="listo"]')) !== null || (await p.$('[data-axw-hecho]')) !== null);
  await sinErroresJs(p, 'C1');
  await ctx.close();
  b = base({ etapas: { compraventa: 'contrato' }, conContratos: ['compraventa'] });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas&paso=carta_reserva' }));
  await p.waitForSelector('[data-axw-campo="cr_tipo"]', { timeout: 3000 }).catch(() => {});
  await p.selectOption('[data-axw-campo="cr_tipo"]', 'compraventa'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  const e5 = await errorTxt(p);
  ok('C2 55000/tipo_con_contratos: su frase, sin código', !!e5 && e5.includes('Ese tipo ya tiene contratos') && sinCodigo(e5), e5);
  await ctx.close();
  b = base({ sinPlantillas: true });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas&paso=carta_reserva' }));
  await p.waitForTimeout(300);
  const e6 = await txt(p, '[data-axw-pr-lista-error="carta"]');
  ok('C3 sin poder leer los tipos (42501): lo dice con la frase de la pieza', !!e6 && e6.includes('No se ha podido leer la lista') && e6.includes('Plantillas') && sinCodigo(e6), e6);
  if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
  await clic(p, 'enviar');
  ok('C3 lista sin leer: al guardar dice que no se ha podido leer (no «Elige el tipo») y no llama', de(b, 'contrato_tipo_etapa_guarda').length === 0 && ((await errorTxt(p)) || '').includes('Aún no se ha podido leer la lista'), await errorTxt(p));
  await ctx.close();
  b = base({ tc: [{ clave: 'viejo', nombre: 'Viejo', activo: false, orden: 1 }] });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas&paso=carta_reserva' }));
  await p.waitForTimeout(300);
  if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
  await clic(p, 'enviar');
  ok('C4 sin tipos activos: al guardar lleva a Plantillas (no «Elige el tipo») y no llama', de(b, 'contrato_tipo_etapa_guarda').length === 0 && ((await errorTxt(p)) || '').includes('créalos en Plantillas'), await errorTxt(p));
  await ctx.close();
  b = base({ etapas: { carta_reserva: 'reserva', compraventa: 'reserva' } });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas&paso=carta_reserva' }));
  if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
  await p.waitForSelector('[data-axw-campo="cr_tipo"]', { timeout: 3000 }).catch(() => {});
  const varias = await txt(p, '[data-axw-pr="carta-varias"]');
  ok('C5 dos tipos en «reserva»: lo dice nombrando los dos y no preselecciona uno como si fuera el único', !!varias && varias.includes('Carta de reserva') && varias.includes('Compraventa') && (await p.inputValue('[data-axw-campo="cr_tipo"]')) === '', varias);
  await clic(p, 'enviar'); await p.waitForTimeout(300);
  ok('C5 sin elegir con carta ya puesta: no llama y no da error', de(b, 'contrato_tipo_etapa_guarda').length === 0 && !(await errorTxt(p)), await errorTxt(p));
  await ctx.close();
  b = base({ redEn: 'contrato_tipo_etapa_guarda' });
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas&paso=carta_reserva' }));
  await p.waitForSelector('[data-axw-campo="cr_tipo"]', { timeout: 3000 }).catch(() => {});
  await p.selectOption('[data-axw-campo="cr_tipo"]', 'carta_reserva'); await clic(p, 'enviar'); await p.waitForTimeout(600);
  const sinRc = await p.evaluate(() => document.body.innerText);
  ok('C6 sin respuesta: no se da por guardado', de(b, 'contrato_tipo_etapa_guarda').length === 1 && /no se guardó|no sabemos|no ha respondido/i.test(sinRc) && !b.etapas.carta_reserva, sinRc.slice(0, 300));
  await ctx.close();

  // ── 5. el MISMO componente en Ajustes › Configurar módulos ───────────────────────────────────────────────────────────────────────────────
  b = base();
  ({ p, ctx } = await abre(nav, b, { pag: 'ajustes' }));
  await p.waitForTimeout(400);
  ok('A1 Ajustes lista los tres pasos', !!(await p.$('[data-pm-fila="tipos_vivienda"]')) && !!(await p.$('[data-pm-fila="fases_obra"]')) && !!(await p.$('[data-pm-fila="carta_reserva"]')));
  await p.click('[data-pm-fila="tipos_vivienda"] [data-accion="pm-editar"]'); await p.waitForTimeout(400);
  ok('A1 «Configurar» abre el MISMO componente (no el genérico de «otra pantalla»)', !!(await p.$('[data-pm-fila="tipos_vivienda"] [data-axw-pr="tipos_vivienda"]')));
  await p.click('[data-pm-fila="tipos_vivienda"] [data-accion="pm-guardar"]'); await p.waitForTimeout(500);
  const a1 = de(b, 'tipo_vivienda_guarda');
  ok('A1 guarda desde Ajustes igual que en el asistente', a1.length === 1 && a1[0].p_clave === 'parcela', JSON.stringify(a1));
  await sinErroresJs(p, 'A1');
  await ctx.close();

  // ── 5b. Ajustes › Comisiones (pieza 4): solo el principal la ve; manda SOLO lo que cambia; errores por code + hint ──────────────────────────
  b = base({ int: { puede_editar: false } });
  ({ p, ctx } = await abre(nav, b, { pag: 'comisiones' }));
  ok('I1 quien no es el principal: la pestaña Comisiones sigue oculta', await p.$eval('[data-lw-tab="comisiones"]', e => e.hidden) && !(await p.$('[data-axw-pr="comisiones"]')));
  await ctx.close();
  b = base({ sinInt: true });
  ({ p, ctx } = await abre(nav, b, { pag: 'comisiones' }));
  ok('I1 sin la lectura (base sin la función): la pestaña sigue oculta y sin errores', await p.$eval('[data-lw-tab="comisiones"]', e => e.hidden));
  await sinErroresJs(p, 'I1');
  await ctx.close();
  b = base({ int: { recalculo_auto: true } });
  ({ p, ctx } = await abre(nav, b, { pag: 'comisiones' }));
  await entraCom(p);
  ok('I2 el principal: pestaña a la vista y las casillas como en la base, con el último cambio', !(await p.$eval('[data-lw-tab="comisiones"]', e => e.hidden))
     && (await p.$eval('[data-axw-campo="recalculo_auto"]', e => e.checked)) && !(await p.$eval('[data-axw-campo="modo_obligatorio"]', e => e.checked))
     && ((await txt(p, '[data-axw-pr="comisiones-ultimo"]')) || '').includes('dion@x.com'));
  await p.click('[data-axw-pr-accion="comisiones-guardar"]'); await p.waitForTimeout(150);
  ok('I2 sin cambios: lo dice y no llama', de(b, 'comisiones_interruptor_guarda').length === 0 && ((await txt(p, '[data-axw-pr="comisiones-estado"]')) || '').includes('No has cambiado nada'));
  await p.click('[data-axw-campo="modo_obligatorio"]'); await p.click('[data-axw-pr-accion="comisiones-guardar"]'); await p.waitForTimeout(300);
  const i2 = de(b, 'comisiones_interruptor_guarda');
  ok('I2 manda SOLO la clave que cambió', i2.length === 1 && JSON.stringify(i2[0].p_datos) === '{"modo_obligatorio":true}', JSON.stringify(i2));
  ok('I2 guardado: lo dice', ((await txt(p, '[data-axw-pr="comisiones-estado"]')) || '').includes('Interruptores guardados'));
  await p.click('[data-axw-pr-accion="comisiones-guardar"]'); await p.waitForTimeout(150);
  ok('I2 tras guardar, lo guardado es lo de partida (no se reenvía)', de(b, 'comisiones_interruptor_guarda').length === 1);
  await sinErroresJs(p, 'I2');
  await ctx.close();
  b = base({ int: { cambiado_por: null, cambiado_en: null } });   // sin fila todavía (erp-setup-2: los dos a null)
  ({ p, ctx } = await abre(nav, b, { pag: 'comisiones' }));
  await entraCom(p);
  ok('I2b sin fila: casillas sin marcar, sin «Último cambio» y sin errores', !(await p.$eval('[data-lw-tab="comisiones"]', e => e.hidden))
     && !(await p.$eval('[data-axw-campo="recalculo_auto"]', e => e.checked)) && !(await p.$('[data-axw-pr="comisiones-ultimo"]')));
  await sinErroresJs(p, 'I2b');
  await ctx.close();
  b = base({ intNoPrincipal: true });
  ({ p, ctx } = await abre(nav, b, { pag: 'comisiones' }));
  await entraCom(p);
  await p.click('[data-axw-campo="recalculo_auto"]'); await p.click('[data-axw-pr-accion="comisiones-guardar"]'); await p.waitForTimeout(300);
  const e7 = await txt(p, '[data-axw-pr="comisiones-estado"]');
  ok('I3 42501: «Solo el administrador principal cambia estos interruptores.», sin código', !!e7 && e7.includes('Solo el administrador principal') && sinCodigo(e7), e7);
  ok('I3 42501 sin hint: también dice que recargue y vuelva a entrar (sesión caducada)', !!e7 && e7.includes('recarga la página y vuelve a entrar'), e7);
  await ctx.close();
  b = base({ intPierde: true });
  ({ p, ctx } = await abre(nav, b, { pag: 'comisiones' }));
  await entraCom(p);
  await p.click('[data-axw-campo="recalculo_auto"]'); await p.click('[data-axw-pr-accion="comisiones-guardar"]'); await p.waitForTimeout(300);
  ok('I4 sin respuesta: «no sabemos si se guardó»', ((await txt(p, '[data-axw-pr="comisiones-estado"]')) || '').includes('no sabemos si se guardó'));
  await ctx.close();
  for (const idioma of ['en', 'id']) for (const ancho of [390, 1440]) {
    b = base();
    ({ p, ctx } = await abre(nav, b, { pag: 'comisiones', idioma, ancho }));
    await entraCom(p);
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(`I5 ${idioma} ${ancho}: sin scroll horizontal`, w <= ancho, String(w));
    const sin = (await p.evaluate(() => window.__sinTrad)).filter(s => /nterruptor|omisi|Guardar|cambio|reglas|contrato/.test(s));
    ok(`I5 ${idioma} ${ancho}: Comisiones traducida`, sin.length === 0, JSON.stringify(sin));
    if (SHOT) await p.screenshot({ path: path.join(SHOT, `propiedades_comisiones_${idioma}_${ancho}.png`), fullPage: true });
    await ctx.close();
  }

  // ── 6. es/en/id × 390/1440: sin scroll horizontal, sin frases sin traducir ─────────────────────────────────────────────────────────────────
  for (const idioma of ['es', 'en', 'id']) {
    for (const [modulo, extra] of [['proyectos', { tipos: [{ clave: 'parcela', etiqueta: 'Parcela', activo: false }] }], ['obra', { fases: [{ clave: 'cimentacion', es: 'Cimentación', en: 'Foundations', orden: 1 }], pagos: { cimentacion: 1 } }], ['reservas', {}]]) {
      for (const ancho of [390, 1440]) {
        b = base(extra);
        ({ p, ctx } = await abre(nav, b, { idioma, ancho, url: '/ajustes/configurar/?modulo=' + modulo }));
        await p.waitForTimeout(300);
        const w = await p.evaluate(() => document.documentElement.scrollWidth);
        ok(`${idioma} ${modulo} ${ancho}: sin scroll horizontal`, w <= ancho, String(w));
        const sin = (await p.evaluate(() => window.__sinTrad)).filter(s => /Tipo|tipo|fase|Fase|Carta|carta|clave|Clave|Nombre|Orden|Pago|Cargando|contrato|Editar|Desactivar|Reactivar|Etapa|Cuidado|lista/.test(s));
        if (idioma !== 'es') ok(`${idioma} ${modulo} ${ancho}: las frases de la pieza traducidas`, sin.length === 0, JSON.stringify(sin.slice(0, 6)));
        await sinErroresJs(p, `${idioma} ${modulo} ${ancho}`);
        if (SHOT) await p.screenshot({ path: path.join(SHOT, `propiedades_${modulo}_${idioma}_${ancho}.png`), fullPage: true });
        await ctx.close();
      }
    }
  }

  await nav.close();
  console.log(fallos ? `\n${fallos} FALLAN — setup_propiedades.harness.cjs` : '\nTODO BIEN — setup_propiedades.harness.cjs');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('NO SE HA PODIDO MIRAR: ' + e.message); process.exit(2); });
