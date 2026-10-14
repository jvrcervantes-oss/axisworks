// node cobros_bot.test.js — el bloque «Quién atiende las reservas del bot de WhatsApp: Dion / ERP» de Ajustes › Cobros (B10, 14-oct-2026; cobros_paso.js →
// bloqueBot). Sin navegador: los scripts del setup REALES en un vm, con un DOM mínimo escrito aquí y la edge ajustes-pagos simulada a partir del doble de
// Backend (pruebas/doble_cobros.json = erp/plan_f3e2_doble_cobros.json, B10). El recorrido con Chromium a 390/1440 px va en pruebas/cobros.harness.cjs.
// Comprueba:
//   1. la forma de bot_backend (lo raro, lo que falta o null = el bloque no sale) y que el doble la cumple;
//   2. cada código de `falta` (los pasos OBLIGATORIOS de base y reservas-producto de la lista viva, más modulo_no_activo, cobros, setup_sin_sembrar) con
//      frase en es/en/id, sin código a la vista y sin español en en/id; y el enlace al asistente cuando se sabe dónde está el paso;
//   3. cada código de error de la acción bot_backend (doble + index.ts de la agencia si está) con su frase, sin caer en `desconocidos`;
//   4. lo que se valida antes de mandar y que el cuerpo lleva SOLO accion, valor, motivo y contrasena;
//   5. la máquina de duda: cada salida, y nunca más de UNA petición bot_backend (si se pierde la respuesta se relee estado, no se reenvía);
//   6. el bloque pintado: estado, aviso «puesto en ERP pero va con Dion», ERP apagado cuando falta algo, motivo de otra persona como TEXTO, contraseña
//      vaciada tras enviar y en pagehide, y que pinta() pasa bot_backend (o null) a la pestaña con la MISMA llamada estado.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const AQUI = __dirname;
const DOBLE = JSON.parse(fs.readFileSync(path.join(AQUI, 'pruebas', 'doble_cobros.json'), 'utf8'));
const SETUP = JSON.parse(fs.readFileSync(path.join(AQUI, 'pruebas', 'doble_modulos_setup_estado.json'), 'utf8')).casos;
const LISTA = JSON.parse(fs.readFileSync(path.join(AQUI, 'pruebas', 'lista_cerrada_setup.json'), 'utf8'));
const I18N_ID = JSON.parse(fs.readFileSync(path.join(AQUI, 'i18n_id.json'), 'utf8'));
// los que sirve el paquete de la instancia, en su orden (setup_frases.test.js)
const ORDEN = ['setup_modulos.js', 'setup_pasos.js', 'setup_reservas.js', 'setup_comun.js', 'cobros_paso.js'];
const FUENTES = ORDEN.map(f => [f, fs.readFileSync(path.join(AQUI, f), 'utf8')]);
const RAIZ = process.env.AXW_AGENCIA_RAIZ || path.join(AQUI, '..', '..', '..', '..');

let fallos = 0, total = 0;
function ok(nombre, cond, detalle) {
  total++;
  if (!cond) { fallos++; console.log('FALLA: ' + nombre + (detalle !== undefined ? ' — ' + detalle : '')); }
}

// ── Un DOM mínimo: lo que usan cobros_paso.js y el setup (crear, colgar, atributos, eventos con burbuja, selectores simples y de descendiente) ──────
class Nodo {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.attrs = {}; this.children = []; this.parentNode = null; this._t = ''; this._l = {}; this.style = {}; this.hidden = false; this.disabled = false; this.value = ''; this.readOnly = false; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); }
  removeAttribute(k) { delete this.attrs[k]; }
  get className() { return this.getAttribute('class') || ''; }
  set className(v) { this.setAttribute('class', v); }
  get id() { return this.getAttribute('id') || ''; }
  set id(v) { this.setAttribute('id', v); }
  get type() { return this.getAttribute('type') || ''; }
  set type(v) { this.setAttribute('type', v); }
  get firstChild() { return this.children[0] || null; }
  get textContent() { return this._t + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this.children.forEach(c => { c.parentNode = null; }); this.children = []; this._t = String(v); }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; }
  insertBefore(c, ref) { if (!ref) return this.appendChild(c); if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.splice(this.children.indexOf(ref), 0, c); return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) { this.children.splice(i, 1); c.parentNode = null; } return c; }
  contains(x) { for (let n = x; n; n = n.parentNode) if (n === this) return true; return false; }
  addEventListener(t, f) { (this._l[t] = this._l[t] || []).push(f); }
  removeEventListener() {}
  dispatchEvent(ev) { ev.target = ev.target || this; for (let n = this; n; n = ev.bubbles ? n.parentNode : null) (n._l[ev.type] || []).forEach(f => f.call(n, ev)); return true; }
  click() { if (!this.disabled) this.dispatchEvent({ type: 'click', bubbles: true }); }
  focus() { foco.el = this; }
  todos() { const r = []; (function rec(n) { n.children.forEach(c => { r.push(c); rec(c); }); })(this); return r; }
  querySelectorAll(sel) { return this.todos().filter(e => casa(e, sel, this)); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  closest(sel) { for (let n = this; n && n.tagName; n = n.parentNode) if (casaSimple(n, sel)) return n; return null; }
}
const foco = { el: null };
function casaSimple(e, s) {
  if (!e || !e.attrs) return false;
  const m = /^([a-z0-9]*)((?:\[[^\]]+\])*)$/i.exec(s.trim());
  if (!m) throw new Error('selector no soportado por el DOM de la prueba: ' + s);
  if (m[1] && e.tagName !== m[1].toUpperCase()) return false;
  const attrs = m[2].match(/\[[^\]]+\]/g) || [];
  return attrs.every(a => { const x = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(a); return x[2] === undefined ? e.hasAttribute(x[1]) : e.getAttribute(x[1]) === x[2]; });
}
function casa(e, sel, raiz) {   // «a b»: b descendiente de a (dentro de raiz)
  const partes = sel.trim().split(/\s+/);
  if (!casaSimple(e, partes[partes.length - 1])) return false;
  let n = e.parentNode;
  for (let i = partes.length - 2; i >= 0; i--) { while (n && n !== raiz.parentNode && !casaSimple(n, partes[i])) n = n.parentNode; if (!n) return false; n = n.parentNode; }
  return true;
}

// la edge simulada: guarda cada cuerpo y contesta lo que diga `responde`
function ventana(idioma, responde) {
  const doc = { readyState: 'complete', head: new Nodo('head'), body: new Nodo('body'), _l: {} };
  doc.createElement = t => new Nodo(t);
  doc.getElementById = id => doc.body.querySelectorAll('[id="' + id + '"]')[0] || null;
  doc.querySelector = s => doc.body.querySelector(s);
  doc.querySelectorAll = s => doc.body.querySelectorAll(s);
  doc.addEventListener = () => {};
  const win = { LW_EN: {}, LW_ID: {}, console: { warn() {}, log() {}, error() {} }, document: doc, _l: {}, edge: [] };
  win.window = win;
  win.addEventListener = (t, f) => { (win._l[t] = win._l[t] || []).push(f); };
  win.removeEventListener = () => {};
  win.dispara = (t, ev) => (win._l[t] || []).forEach(f => f(ev || {}));
  win.location = { pathname: '/ajustes/', search: '', hash: '#cobros' };
  win.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  win.sessionStorage = win.localStorage;
  win.setTimeout = setTimeout; win.clearTimeout = clearTimeout;
  win.CustomEvent = function (type, o) { this.type = type; this.bubbles = !!(o && o.bubbles); this.detail = o && o.detail; };
  if (idioma === 'id') Object.assign(win.LW_ID, I18N_ID);
  if (idioma !== 'es') {
    win.LW_IDIOMA = idioma;
    win.lwT = (x, h) => {
      const d = idioma === 'en' ? win.LW_EN : win.LW_ID;
      let v = Object.prototype.hasOwnProperty.call(d, x) ? d[x] : x;
      if (h) for (const k of Object.keys(h)) v = v.split('%' + k).join(h[k]);
      return v;
    };
  }
  const sb = { auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'jwt-de-prueba' } } }) }, rpc: () => Promise.resolve({ data: null, error: null }) };
  win.LW_AUTH = Promise.resolve({ sb });
  win.LW_SB_KEY = 'clave-publicable';
  win.lwEdge = n => 'https://bbm.ejemplo/functions/v1/' + n;
  win.fetch = (url, o) => {
    const c = JSON.parse(o.body);
    win.edge.push(c);
    const r = responde ? responde(c, win.edge) : null;
    if (r === 'red') return Promise.reject(new TypeError('Failed to fetch'));
    const st = r ? r.status : 200, j = r ? r.json : { ok: true, estado: DOBLE.edge.acciones.estado.respuesta_200.estado, pide_codigo: true, bot_backend: null };
    return Promise.resolve({ ok: st >= 200 && st < 300, status: st, text: () => Promise.resolve(typeof j === 'string' ? j : JSON.stringify(j)) });
  };
  for (const [f, src] of FUENTES) {
    try { vm.runInNewContext(src, win, { filename: f }); } catch (e) { ok('carga ' + f + ' (' + idioma + ')', false, e.message); }
  }
  return win;
}
const espera = () => new Promise(r => setTimeout(r, 0));
async function asienta() { for (let i = 0; i < 8; i++) await espera(); }
const copia = x => JSON.parse(JSON.stringify(x));
const BOT_ESTADO = DOBLE.edge.acciones.estado.respuesta_200.bot_backend;          // dion, falta cobros + usuarios
const BOT_GUARDADO = DOBLE.edge.acciones.bot_backend.respuesta_200.bot_backend;   // erp, con último cambio
const r200 = j => ({ status: 200, json: Object.assign({ ok: true }, j) });
const no = (status, codigo, extra) => ({ status, json: Object.assign({ ok: false, codigo, error: 'texto del servidor' }, extra || {}) });

(async () => {
  const W = { es: ventana('es'), en: ventana('en'), id: ventana('id') };
  const B = W.es.AXW_COBROS && W.es.AXW_COBROS.bot;
  ok('cobros_paso.js expone AXW_COBROS.bot', !!(B && B.forma && B.faltas && B.valida && B.cuerpo && B.texto && B.envia && B.bloque));
  if (!B) { console.log('FALLAN ' + fallos + ' de ' + total + ' comprobaciones — cobros_bot.test.js'); process.exit(1); }

  // ── 1. La forma ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  ok('el doble trae bot_backend en estado', !!BOT_ESTADO, JSON.stringify(DOBLE.edge.acciones.estado.respuesta_200).slice(0, 120));
  ok('forma: el bot_backend de estado del doble vale', !!B.forma(BOT_ESTADO));
  ok('forma: el bot_backend de la respuesta de bot_backend del doble vale', !!B.forma(BOT_GUARDADO) && B.forma(BOT_GUARDADO).ultimo_cambio.quien === BOT_GUARDADO.ultimo_cambio.quien);
  const raros = {
    'null': null, 'ausente': undefined, 'array': [], 'guardado raro': Object.assign({}, BOT_ESTADO, { guardado: 'otro' }),
    'guardado constructor': Object.assign({}, BOT_ESTADO, { guardado: 'constructor' }), 'efectivo vacío': Object.assign({}, BOT_ESTADO, { efectivo: '' }),
    'puede_erp texto': Object.assign({}, BOT_ESTADO, { puede_erp: 'true' }), 'falta no lista': Object.assign({}, BOT_ESTADO, { falta: 'cobros' })
  };
  for (const [n, x] of Object.entries(raros)) ok('forma rara = null: ' + n, B.forma(x) === null);
  const filtrada = B.forma(Object.assign({}, BOT_ESTADO, { falta: ['cobros', '<b>x</b>', 7, 'flota'], ultimo_cambio: { quien: 3, cuando: null, motivo: 'm'.repeat(900) } }));
  ok('forma: códigos de falta fuera de la lista cerrada se caen', filtrada.falta.join() === 'cobros,flota', filtrada.falta.join());
  ok('forma: último cambio con tipos raros = vacío y motivo recortado', filtrada.ultimo_cambio.quien === '' && filtrada.ultimo_cambio.motivo.length === 500);

  // ── 2. Lo que falta, en tres idiomas ───────────────────────────────────────────────────────────────────────────────────────────────────────
  let obligatorios = [];
  const mjson = path.join(RAIZ, 'erp', 'modulos.json');
  if (fs.existsSync(mjson)) {
    const s = JSON.parse(fs.readFileSync(mjson, 'utf8')).setup || {};
    ['base', 'reservas-producto'].forEach(m => { const x = s.modulos && s.modulos[m]; if (x && Array.isArray(x.pasos)) obligatorios = obligatorios.concat(x.pasos.filter(p => p && p.obligatorio !== false).map(p => p.clave)); });
  }
  if (!obligatorios.length) {
    if (process.env.AXW_SIN_AGENCIA === '1') { console.log('AVISO: sin erp/modulos.json en ' + RAIZ + ': se miden todos los pasos de la copia fechada'); obligatorios = LISTA.pasos.slice(); }
    else ok('la lista viva de pasos existe (AXW_AGENCIA_RAIZ=' + RAIZ + ')', false, 'pon AXW_AGENCIA_RAIZ o AXW_SIN_AGENCIA=1');
  }
  const FALTAS = ['modulo_no_activo', 'cobros', 'cobros_modo_pruebas', 'setup_sin_sembrar'].concat(obligatorios.filter((k, i, a) => a.indexOf(k) === i));
  const enEspanol = new Set();
  for (const g of Object.values(W.es.AXW_SETUP.TEXTOS)) for (const v of Object.values(g)) (Array.isArray(v) ? v : [v]).forEach(f => enEspanol.add(f));
  const enEsTrad = new Set(B.faltas(FALTAS, []).map(x => x.texto));
  for (const idioma of ['es', 'en', 'id']) {
    const w = W[idioma], antes = w.AXW_SETUP.desconocidos.length;
    const lista = w.AXW_COBROS.bot.faltas(FALTAS, []);
    ok(idioma + ': una línea por código de falta', lista.length === FALTAS.length);
    ok(idioma + ': ningún código de falta sin frase', w.AXW_SETUP.desconocidos.length === antes, w.AXW_SETUP.desconocidos.slice(antes).join(', '));
    lista.forEach(x => {
      ok(idioma + ': falta ' + x.codigo + ' sin código a la vista', x.texto && !/_[a-z]|\(c[óo]digo|\(kode|\(code/.test(x.texto) && x.texto !== x.codigo, x.texto);
      if (idioma !== 'es') ok(idioma + ': falta ' + x.codigo + ' traducida', !enEsTrad.has(x.texto) || x.texto === 'ERP', x.texto);
    });
  }
  ok('falta modulo_no_activo nombra el módulo', B.faltas(['modulo_no_activo'], [])[0].texto.includes('Reservas de producto'));
  const pasos = [
    { modulo: 'base', clave: 'usuarios', hecho: true, obligatorio: true }, { modulo: 'reservas-producto', clave: 'usuarios', hecho: false, obligatorio: true },
    { modulo: 'reservas-producto', clave: 'flota', hecho: false, obligatorio: true }, { modulo: 'taller', clave: 'taller_mecanicos', hecho: false, obligatorio: true },
    { modulo: 'reservas-producto', clave: 'cobros', hecho: false, obligatorio: false }
  ];
  const conEnlace = B.faltas(['flota', 'usuarios', 'taller_mecanicos', 'cobros', 'negocio'], pasos);
  ok('falta con paso conocido: enlace al asistente que vuelve a Ajustes', conEnlace[0].enlace === '/ajustes/configurar/?modulo=reservas-producto&paso=flota&vuelta=ajustes', conEnlace[0].enlace);
  ok('usuarios (en dos módulos): el enlace va al que está pendiente', /modulo=reservas-producto&paso=usuarios/.test(conEnlace[1].enlace || ''), conEnlace[1].enlace);
  ok('un paso de otro módulo (taller) no lleva enlace: la base solo mira base y reservas-producto', conEnlace[2].enlace === null);
  ok('cobros no lleva enlace (está en esta misma pestaña)', conEnlace[3].enlace === null);
  const pruebas = B.faltas(['cobros_modo_pruebas'], pasos)[0];
  ok('cobros_modo_pruebas: sin enlace, dice facturas de prueba y que hay que pasar a modo real', pruebas.enlace === null && /facturas de prueba/.test(pruebas.texto) && /modo real/.test(pruebas.texto), pruebas.texto);
  ok('cobros_modo_pruebas sobrevive a la forma (409 y estado)', B.forma(Object.assign({}, BOT_ESTADO, { falta: ['cobros_modo_pruebas'] })).falta[0] === 'cobros_modo_pruebas');
  ok('un paso que el asistente no trae: sin enlace, con su nombre', conEnlace[4].enlace === null && conEnlace[4].texto === W.es.AXW_SETUP.texto('paso', 'negocio', 0));
  const rara = W.en.AXW_COBROS.bot.faltas(['paso_inventado'], []);
  ok('un código de falta desconocido: frase digna y traducida, sin el código', rara[0].texto === 'Another setup step' && W.en.AXW_SETUP.desconocidos.indexOf('paso:paso_inventado') >= 0, rara[0].texto);
  ok('puede_erp false sin códigos: nunca una lista vacía', B.faltas([], []).length === 1 && !!B.faltas([], [])[0].texto);

  // ── 3. Los códigos de error de la acción bot_backend ────────────────────────────────────────────────────────────────────────────────────────
  const errores = new Set();
  Object.values(DOBLE.edge.acciones.bot_backend.errores).forEach(l => l.forEach(x => errores.add(String(x).split(' ')[0])));
  const ts = path.join(RAIZ, 'erp', 'funciones', 'ajustes-pagos', 'index.ts');
  if (fs.existsSync(ts)) {
    const src = fs.readFileSync(ts, 'utf8');
    const bloque = (src.match(/if \(accion === 'bot_backend'\) \{[\s\S]*?\n {2}\}\n/) || [''])[0];
    const reaut = (src.match(/const reautentica = [\s\S]*?\n {2}\};\n/) || [''])[0];
    ok('index.ts: se encuentran la acción bot_backend y la reautenticación', !!bloque && !!reaut);
    (bloque + reaut).replace(/no\('([a-z_]+)'/g, (m, c) => { errores.add(c); return m; });
    ['motivo', 'valor_no_valido', 'bot_backend_no_listo', 'demasiados_intentos'].forEach(c => errores.add(c));   // los que da deBase para el bot
  } else console.log('AVISO: sin ' + ts + ': los códigos de error salen solo del doble');
  const GENERICO = { valor_no_valido: 1, campo_no_admitido: 1 };   // un fallo de esta pantalla: la frase de «avisa al estudio»
  for (const idioma of ['es', 'en', 'id']) {
    const w = W[idioma], antes = w.AXW_SETUP.desconocidos.length, gen = w.AXW_SETUP.texto('general', 'error_codigo');
    for (const c of errores) {
      const t = w.AXW_COBROS.bot.texto(c);
      ok(idioma + ': error ' + c + ' con frase', typeof t === 'string' && t.length > 0 && !/_[a-z]/.test(t), t);
      if (!GENERICO[c]) ok(idioma + ': error ' + c + ' con frase propia (no la genérica)', t !== gen, t);
      if (idioma !== 'es') ok(idioma + ': error ' + c + ' traducido', !enEspanol.has(t), t);
    }
    ok(idioma + ': ningún error del bot cae en desconocidos', w.AXW_SETUP.desconocidos.length === antes, w.AXW_SETUP.desconocidos.slice(antes).join(', '));
  }
  ok('errores medidos: los del doble y los del index.ts', errores.size >= 10, [...errores].join(', '));

  // ── 4. Antes de mandar, y el cuerpo ────────────────────────────────────────────────────────────────────────────────────────────────────────
  const dion = B.forma(BOT_ESTADO), listo = Object.assign({}, dion, { puede_erp: true, falta: [] });
  ok('valida: el mismo valor = sin_cambios (no se llama)', B.valida(dion, 'dion', '', '') === 'sin_cambios');
  ok('valida: ERP sin poder = bot_backend_no_listo', B.valida(dion, 'erp', 'cambio a erp', 'x') === 'bot_backend_no_listo');
  ok('valida: motivo de menos de 3 tras recortar', B.valida(listo, 'erp', '  ab  ', 'x') === 'motivo');
  ok('valida: motivo de más de 200', B.valida(listo, 'erp', 'a'.repeat(201), 'x') === 'motivo_no_valido');
  ok('valida: motivo con salto de línea', B.valida(listo, 'erp', 'uno\ndos', 'x') === 'motivo_no_valido');
  ok('valida: sin contraseña', B.valida(listo, 'erp', 'listo el ERP', '') === 'reautenticar');
  ok('valida: todo bien', B.valida(listo, 'erp', 'listo el ERP', 'x') === '');
  ok('valida: volver a Dion desde ERP aunque falte algo', B.valida(Object.assign({}, dion, { guardado: 'erp' }), 'dion', 'vuelta atrás', 'x') === '');
  ok('valida: un valor que no es dion ni erp', B.valida(listo, 'constructor', 'abc', 'x') === 'valor_no_valido');
  const cu = B.cuerpo('erp', '  listo  ', 'secreta');
  ok('cuerpo: SOLO accion, valor, motivo (recortado) y contrasena', Object.keys(cu).sort().join() === 'accion,contrasena,motivo,valor' && cu.accion === 'bot_backend' && cu.motivo === 'listo', JSON.stringify(Object.keys(cu)));

  // ── 5. La máquina de duda: una sola petición bot_backend, siempre ──────────────────────────────────────────────────────────────────────────
  async function caso(nombre, respuestas, espera_) {
    const llamadas = [];
    const f = c => { llamadas.push(c); const r = respuestas[llamadas.length - 1]; if (r === 'rechaza') return Promise.reject(new Error('x')); return Promise.resolve(r); };
    const r = await B.envia('erp', 'listo el ERP', 'secreta', f);
    ok('envía: ' + nombre + ' → ' + espera_.tipo, r.tipo === espera_.tipo && (!espera_.comprueba || espera_.comprueba(r)), JSON.stringify(r).slice(0, 200));
    ok('envía: ' + nombre + ': una sola petición bot_backend', llamadas.filter(c => c.accion === 'bot_backend').length === 1, llamadas.map(c => c.accion).join(','));
    if (espera_.llamadas) ok('envía: ' + nombre + ': peticiones', llamadas.map(c => c.accion).join(',') === espera_.llamadas, llamadas.map(c => c.accion).join(','));
  }
  const res = (status, d, codigo) => ({ status, codigo: codigo || '', d });
  await caso('200 cambiado', [res(200, { ok: true, cambiado: true, bot_backend: BOT_GUARDADO })], { tipo: 'cambiado', llamadas: 'bot_backend', comprueba: r => r.bot.guardado === 'erp' });
  await caso('200 sin cambios', [res(200, { ok: true, cambiado: false, bot_backend: BOT_ESTADO })], { tipo: 'igual', llamadas: 'bot_backend' });
  await caso('200 cambiado sin poder releer', [res(200, { ok: true, cambiado: true, bot_backend: null })], { tipo: 'sin_releer', llamadas: 'bot_backend' });
  await caso('409 no listo', [res(409, { ok: false, codigo: 'bot_backend_no_listo', falta: ['flota', '<x>'] }, 'bot_backend_no_listo')], { tipo: 'no_listo', llamadas: 'bot_backend', comprueba: r => r.falta.join() === 'flota' });
  await caso('400 motivo', [res(400, { ok: false, codigo: 'motivo' }, 'motivo')], { tipo: 'error', llamadas: 'bot_backend', comprueba: r => r.codigo === 'motivo' });
  await caso('401 contraseña mala', [res(401, { ok: false, codigo: 'clave_actual_incorrecta' }, 'clave_actual_incorrecta')], { tipo: 'error', llamadas: 'bot_backend' });
  await caso('429 demasiados intentos', [res(429, { ok: false, codigo: 'demasiados_intentos' }, 'demasiados_intentos')], { tipo: 'error', llamadas: 'bot_backend' });
  const releido = (b) => res(200, { ok: true, estado: {}, pide_codigo: true, bot_backend: b });
  await caso('sin red y sí se guardó', [res(0, null, 'sin_red'), releido(BOT_GUARDADO)], { tipo: 'cambiado', llamadas: 'bot_backend,estado' });
  await caso('502 y no consta', [res(502, { ok: false, codigo: 'base_no_responde' }, 'base_no_responde'), releido(BOT_ESTADO)], { tipo: 'duda_no', llamadas: 'bot_backend,estado', comprueba: r => r.bot.guardado === 'dion' });
  await caso('gateway sin respuesta propia y estado sin bot', [res(504, null, 'edge_no_disponible'), releido(null)], { tipo: 'duda', llamadas: 'bot_backend,estado' });
  await caso('la petición revienta y releer también', ['rechaza', 'rechaza'], { tipo: 'duda', llamadas: 'bot_backend,estado' });

  // ── 6. El bloque pintado ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // 6a. pinta() del componente pasa bot_backend a quien escuche, con la MISMA llamada estado; sin él, o con un estado roto, null
  async function oye(bot, estadoRoto) {
    const w = ventana('es', c => c.accion === 'estado'
      ? r200(Object.assign({ estado: estadoRoto ? { raro: 1 } : copia(DOBLE.edge.acciones.estado.respuesta_200.estado), pide_codigo: true }, bot === 'ausente' ? {} : { bot_backend: bot })) : null);
    const caja = new Nodo('div'); w.document.body.appendChild(caja);
    let visto = 'nada';
    caja.addEventListener('axw-cobros-bot', ev => { visto = ev.detail.bot; });
    w.AXW_COBROS.componente.pinta(caja, {});
    await asienta();
    return { visto, estados: w.edge.filter(c => c.accion === 'estado').length };
  }
  let o = await oye(BOT_ESTADO);
  ok('pinta(): avisa con bot_backend y una sola llamada estado', o.visto && o.visto.guardado === 'dion' && o.estados === 1, JSON.stringify(o));
  o = await oye('ausente');
  ok('pinta(): edge de antes de B10 (sin la clave) = null', o.visto === null, JSON.stringify(o));
  o = await oye(null);
  ok('pinta(): bot_backend null = null', o.visto === null);
  o = await oye(BOT_ESTADO, true);
  ok('pinta(): con un estado ilegible, null (no se pinta el bloque a medias)', o.visto === null);

  // 6b. el bloque
  function monta(idioma, dato, pasosSetup, responde) {
    const w = ventana(idioma, responde);
    const cont = new Nodo('div'); cont.setAttribute('data-axw-bot-backend', 'bloque'); w.document.body.appendChild(cont);
    w.AXW_COBROS.bot.bloque(cont, w.AXW_COBROS.bot.forma(dato), pasosSetup || []);
    const q = s => cont.querySelector(s);
    return { w, cont, q };
  }
  let m = monta('es', BOT_ESTADO, SETUP.a_medias.pasos);
  ok('bloque: se ve', !m.cont.hidden && !!m.q('[data-axw-bot-backend="efectivo"]'));
  ok('bloque: dice quién atiende hoy (efectivo)', m.q('[data-axw-bot-backend="efectivo"]').getAttribute('data-axw-bot-efectivo') === 'dion' && m.q('[data-axw-bot-backend="efectivo"]').textContent === W.es.AXW_SETUP.TEXTOS.cobros.bot_ahora_dion);
  ok('bloque: ERP apagado cuando falta algo', m.q('[data-axw-bot-backend="valor-erp"]').disabled === true && m.q('[data-axw-bot-backend="valor-dion"]').disabled === false);
  ok('bloque: debajo dice qué falta (cobros y usuarios)', m.q('[data-axw-bot-backend="falta"]') && m.q('[data-axw-bot-falta="cobros"]') && m.q('[data-axw-bot-falta="usuarios"]'));
  ok('bloque: sin aviso de «puesto en ERP» cuando lo guardado es Dion', !m.q('[data-axw-bot-backend="aviso"]'));
  ok('bloque: los cuatro textos fijos', ['cotizacion', 'enlace', 'volver', 'freno'].every(k => !!m.q('[data-axw-bot-nota="' + k + '"]')));
  ok('bloque: los textos fijos dicen 30 min, 1 h y 1 min', /30 minutos/.test(m.q('[data-axw-bot-nota="cotizacion"]').textContent) && /1 hora/.test(m.q('[data-axw-bot-nota="enlace"]').textContent) && /1 minuto/.test(m.q('[data-axw-bot-nota="volver"]').textContent));
  ok('bloque: sin último cambio lo dice', m.q('[data-axw-bot-backend="ultimo"]').textContent === W.es.AXW_SETUP.TEXTOS.cobros.bot_nunca);
  ok('bloque: botones de 44 px y data-real (la maqueta no los toca)', m.cont.querySelectorAll('button').every(b => /min-height:44px/.test(b.getAttribute('style') || '') && b.hasAttribute('data-real')));
  ok('bloque: enlaces de 44 px', m.cont.querySelectorAll('a').every(a => /min-height:44px/.test(a.getAttribute('style') || '')));
  ok('bloque: campos con su label', ['bot_motivo', 'bot_contrasena'].every(k => { const i = m.q('[data-axw-campo="' + k + '"]'); return i && m.cont.querySelectorAll('label').some(l => l.getAttribute('for') === i.id); }));
  // elegir Dion (lo guardado) y guardar: sin cambios, no se llama
  m.q('[data-axw-bot-backend="guardar"]').click(); await asienta();
  ok('bloque: guardar sin cambiar = lo dice y no llama', m.w.edge.length === 0 && m.q('[data-axw-bot-backend="mensaje"]').textContent === W.es.AXW_SETUP.TEXTOS.cobros.bot_sin_cambios);

  // guardado ERP, efectivo Dion: el aviso con lo que falta, y ERP sigue elegible (es lo guardado)
  const bajado = Object.assign({}, BOT_ESTADO, { guardado: 'erp', efectivo: 'dion', falta: ['modulo_no_activo'], ultimo_cambio: { quien: 'admin@bbm.ejemplo', cuando: '2026-10-14T10:00:00+00:00', motivo: '<img src=x onerror=alert(1)> %p %f' } });
  m = monta('es', bajado, []);
  ok('bloque: «puesto en ERP pero va con Dion» con lo que falta', !!m.q('[data-axw-bot-backend="aviso"]') && !!m.q('[data-axw-bot-backend="aviso"] [data-axw-bot-falta="modulo_no_activo"]'));
  ok('bloque: en ese caso la lista no se repite debajo', !m.q('[data-axw-bot-backend="falta"]'));
  ok('bloque: ERP (lo guardado) sigue elegible y marcado', m.q('[data-axw-bot-backend="valor-erp"]').disabled === false && m.q('[data-axw-bot-backend="valor-erp"]').getAttribute('aria-checked') === 'true');
  ok('bloque: el motivo de otra persona va como TEXTO, sin tocar sus %', m.q('[data-axw-bot-backend="ultimo-motivo"]').textContent === bajado.ultimo_cambio.motivo && m.q('[data-axw-bot-backend="ultimo-motivo"]').children.length === 0);
  ok('bloque: el último cambio dice quién', m.q('[data-axw-bot-backend="ultimo"]').textContent.includes('admin@bbm.ejemplo'));

  // ya en ERP y le falta un paso: se avisa de que volver a Dion deja sin poder volver
  m = monta('es', Object.assign({}, BOT_ESTADO, { guardado: 'erp', efectivo: 'erp', puede_erp: false, falta: ['usuarios'] }), []);
  ok('bloque: en ERP con algo pendiente avisa de que si pasa a Dion no podrá volver', m.q('[data-axw-bot-backend="falta"]') && m.q('[data-axw-bot-backend="falta"]').textContent.startsWith(W.es.AXW_SETUP.TEXTOS.cobros.bot_falta_volver));

  // cambiar a ERP de verdad: motivo, contraseña, una petición con los 4 campos, contraseña vaciada y repintado con lo que dice la base
  const puede = Object.assign({}, BOT_ESTADO, { puede_erp: true, falta: [] });
  m = monta('en', puede, [], c => c.accion === 'bot_backend' ? r200({ cambiado: true, bot_backend: BOT_GUARDADO }) : null);
  m.q('[data-axw-bot-backend="valor-erp"]').click();
  ok('bloque: elegir ERP lo marca sin repintar', m.q('[data-axw-bot-backend="valor-erp"]').getAttribute('aria-checked') === 'true');
  m.q('[data-axw-bot-backend="guardar"]').click(); await asienta();
  ok('bloque (en): sin motivo no se llama y se dice en inglés', m.w.edge.length === 0 && m.q('[data-axw-bot-backend="mensaje"]').textContent === 'Write the reason for the change (at least 3 letters).', m.q('[data-axw-bot-backend="mensaje"]').textContent);
  const mot = m.q('[data-axw-campo="bot_motivo"]'); mot.value = 'Todo listo en el ERP'; mot.dispatchEvent({ type: 'input' });
  m.q('[data-axw-bot-backend="guardar"]').click(); await asienta();
  ok('bloque: sin contraseña no se llama', m.w.edge.length === 0 && m.q('[data-axw-bot-backend="mensaje"]').textContent === W.en.AXW_SETUP.texto('hint', 'cobros_reautenticar'));
  m.q('[data-axw-campo="bot_contrasena"]').value = 'secreta';
  m.q('[data-axw-bot-backend="guardar"]').click(); await asienta();
  const env = m.w.edge.filter(c => c.accion === 'bot_backend');
  ok('bloque: UNA petición con accion, valor, motivo y contrasena', env.length === 1 && Object.keys(env[0]).sort().join() === 'accion,contrasena,motivo,valor' && env[0].valor === 'erp' && env[0].motivo === 'Todo listo en el ERP' && env[0].contrasena === 'secreta', JSON.stringify(env));
  ok('bloque: tras guardar, la contraseña está vacía', m.q('[data-axw-campo="bot_contrasena"]').value === '');
  ok('bloque: repintado con lo que dice la base (ERP)', m.q('[data-axw-bot-backend="efectivo"]').getAttribute('data-axw-bot-efectivo') === 'erp' && m.q('[data-axw-bot-backend="mensaje"]').textContent === 'Saved.', m.q('[data-axw-bot-backend="mensaje"]').textContent);
  ok('bloque (en): ningún texto del bloque en español', !m.cont.todos().some(e => e._t && enEspanol.has(e._t)), m.cont.todos().filter(e => e._t && enEspanol.has(e._t)).map(e => e._t).join(' | '));

  // contraseña mala: se dice, se vacía, el motivo se queda
  m = monta('id', Object.assign({}, puede, { guardado: 'erp', efectivo: 'erp' }), [], c => c.accion === 'bot_backend' ? no(401, 'clave_actual_incorrecta') : null);
  m.q('[data-axw-bot-backend="valor-dion"]').click();
  m.q('[data-axw-campo="bot_motivo"]').value = 'Vuelta atrás'; m.q('[data-axw-campo="bot_motivo"]').dispatchEvent({ type: 'input' });
  m.q('[data-axw-campo="bot_contrasena"]').value = 'mala';
  m.q('[data-axw-bot-backend="guardar"]').click(); await asienta();
  ok('bloque (id): contraseña mala = su frase en indonesio', m.q('[data-axw-bot-backend="mensaje"]').textContent === 'Itu bukan kata sandi akun Anda.', m.q('[data-axw-bot-backend="mensaje"]').textContent);
  ok('bloque: tras el error la contraseña está vacía y el motivo se queda', m.q('[data-axw-campo="bot_contrasena"]').value === '' && m.q('[data-axw-campo="bot_motivo"]').value === 'Vuelta atrás');
  ok('bloque: tras el error se puede volver a intentar', m.q('[data-axw-bot-backend="guardar"]').disabled === false);
  ok('bloque (id): el título lleva «booking» (glosario)', /booking/.test(m.q('h3').textContent), m.q('h3').textContent);

  // 409: la base dice que falta algo que la pantalla no sabía: se repinta con su lista y ERP queda apagado
  m = monta('es', puede, [], c => c.accion === 'bot_backend' ? no(409, 'bot_backend_no_listo', { falta: ['flota'] }) : null);
  m.q('[data-axw-bot-backend="valor-erp"]').click();
  m.q('[data-axw-campo="bot_motivo"]').value = 'Ya está todo'; m.q('[data-axw-campo="bot_motivo"]').dispatchEvent({ type: 'input' });
  m.q('[data-axw-campo="bot_contrasena"]').value = 'secreta';
  m.q('[data-axw-bot-backend="guardar"]').click(); await asienta();
  ok('bloque: 409 repinta lo que falta según la base y apaga ERP', !!m.q('[data-axw-bot-falta="flota"]') && m.q('[data-axw-bot-backend="valor-erp"]').disabled === true && m.q('[data-axw-bot-backend="valor-dion"]').getAttribute('aria-checked') === 'true');

  // respuesta perdida y no se puede releer: se dice y el bloque queda quieto; no se reenvía
  m = monta('es', puede, [], c => c.accion === 'bot_backend' ? 'red' : r200({ estado: {}, pide_codigo: true, bot_backend: null }));
  m.q('[data-axw-bot-backend="valor-erp"]').click();
  m.q('[data-axw-campo="bot_motivo"]').value = 'Ya está todo'; m.q('[data-axw-campo="bot_motivo"]').dispatchEvent({ type: 'input' });
  m.q('[data-axw-campo="bot_contrasena"]').value = 'secreta';
  m.q('[data-axw-bot-backend="guardar"]').click(); await asienta();
  m.q('[data-axw-bot-backend="guardar"]').click(); await asienta();
  ok('bloque: sin red y sin poder releer = «no se sabe», quieto, sin reenviar', m.q('[data-axw-bot-backend="mensaje"]').textContent === W.es.AXW_SETUP.TEXTOS.cobros.bot_duda
    && m.q('[data-axw-bot-backend="guardar"]').disabled === true && m.w.edge.filter(c => c.accion === 'bot_backend').length === 1, m.w.edge.map(c => c.accion).join(','));

  // pagehide: la contraseña tecleada se vacía
  m = monta('es', puede, []);
  m.q('[data-axw-campo="bot_contrasena"]').value = 'a medias';
  m.w.dispara('pagehide');
  ok('pagehide: la contraseña del bloque se vacía', m.q('[data-axw-campo="bot_contrasena"]').value === '');
  ok('la contraseña nunca va a un atributo', !m.cont.todos().some(e => Object.values(e.attrs).some(v => /secreta|a medias/.test(v))));

  console.log('Faltas medidas: ' + FALTAS.length + ' · errores: ' + errores.size);
  console.log((fallos ? 'FALLAN ' + fallos + ' de ' : 'OK ') + total + ' comprobaciones — cobros_bot.test.js');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('FALLA: excepción ' + (e && e.stack)); process.exit(1); });
