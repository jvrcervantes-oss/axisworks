// node setup_frases.test.js — «Nunca más un paso sin nombre» (bbm-p31-front-comun, 12-oct-2026).
// Por qué existe: el ensayo de Calidad (bbm-p29) vio que la base declaraba 10 códigos nuevos (negocio, idiomas, correo, taller_*…) y el front los habría
// enseñado como «Langkah tanpa nama (kode: negocio)»; setup_modulos.test.js no lo cazaba porque solo miraba faltas y hints, y solo dentro de
// setup_modulos.js (las frases que suman setup_reservas.js, cobros_paso.js y setup_comun.js no las veía).
// Qué hace: carga en un vm TODOS los scripts del setup en el orden en que los sirve el paquete y, en es/en/id, pide la frase de CADA código que declara la
// base — pasos (título y para qué), faltas, hints y campos — y falla si alguno cae en el texto de «desconocido» o sale en español en en/id.
// De dónde salen los códigos (todas a la vez; un código de cualquiera de ellas tiene que tener frase):
//   1. la lista VIVA de la base: <AXW_AGENCIA_RAIZ>/erp/modulos.json → setup (o erp/modulos.py SETUP_*). Sin ella el test FALLA: no se puede decir que
//      está todo sin mirarlo (en otra máquina sin la agencia al lado: AXW_SIN_AGENCIA=1, y lo dice).
//   2. pruebas/lista_cerrada_setup.json: la copia fechada con lo que está en rama (por si el clon de la agencia va atrasado).
//   3. los dobles de Backend (pruebas/doble_*.json): cada {codigo, campos} y cada paso que traen.
// Y además: una misma frase en español con traducciones DISTINTAS en dos ficheros (fusiona() no pisa: ganaría la del primero que cargue, al azar).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const AQUI = __dirname;
// el orden en que los sirve el paquete (medido en el build de bbm): setup_modulos (dentro de guard.js) → setup_pasos → setup_reservas → setup_comun →
// cobros_paso. Cuenta para los choques: fusiona() no pisa, así que entre dos ficheros gana el que carga antes. setup_propiedades.js (erp-front, 14-oct)
// solo va en las instancias de Propiedades, justo detrás de setup_pasos.js (build.py mete cada script ahí y el último en meterse queda delante); se
// carga siempre aquí para que una frase suya con otra traducción en otro fichero salga como choque.
const ORDEN = ['setup_modulos.js', 'setup_pasos.js', 'setup_propiedades.js', 'setup_reservas.js', 'setup_comun.js', 'cobros_paso.js'];
const FUENTES = ORDEN.map(f => [f, fs.readFileSync(path.join(AQUI, f), 'utf8')]);
// ¿Mete build.py setup_reservas.js (pasos de E3/E4) en el paquete de la instancia? En la rama setup-sin-e3 la llamada va comentada (revisor, 12-oct:
// el test medía un paquete que no sale). Se lee de build.py, no se supone: la llamada viva es `setup_reservas_pasos()` dentro de instancia().
const BUILD = fs.readFileSync(path.join(AQUI, 'build.py'), 'utf8');
const CON_E3 = /^ {8}setup_reservas_pasos\(\)\s*$/m.test(BUILD);
const SERVIDOS = FUENTES.filter(([f]) => f !== 'setup_reservas.js' || CON_E3);
const I18N_ID = JSON.parse(fs.readFileSync(path.join(AQUI, 'i18n_id.json'), 'utf8'));

let fallos = 0, total = 0;
function ok(nombre, cond, detalle) {
  total++;
  if (!cond) { fallos++; console.log('FALLA: ' + nombre + (detalle ? ' — ' + detalle : '')); }
}

// ── Los códigos ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const codigos = { pasos: new Set(), faltas: new Set(), hints: new Set(), campos: new Set(), modulos: new Set(), opcionales: new Set() };
const origen = {};
function suma(tipo, lista, de) { (lista || []).forEach(c => { if (typeof c === 'string' && c) { codigos[tipo].add(c); (origen[tipo + ':' + c] = origen[tipo + ':' + c] || []).push(de); } }); }

const snap = JSON.parse(fs.readFileSync(path.join(AQUI, 'pruebas', 'lista_cerrada_setup.json'), 'utf8'));
['pasos', 'faltas', 'hints', 'campos', 'modulos', 'opcionales'].forEach(t => suma(t, snap[t], 'lista_cerrada_setup.json'));

const raiz = process.env.AXW_AGENCIA_RAIZ || path.join(AQUI, '..', '..', '..', '..');
const mjson = path.join(raiz, 'erp', 'modulos.json'), mpy = path.join(raiz, 'erp', 'modulos.py');
let viva = false;
if (fs.existsSync(mjson)) {
  const s = (JSON.parse(fs.readFileSync(mjson, 'utf8')) || {}).setup;
  // los pasos OPCIONALES de cada módulo: si se quedan sin hacer, «listo» dice su consecuencia (agencia-81, 12-oct)
  if (s && s.modulos && typeof s.modulos === 'object') Object.values(s.modulos).forEach(m => { if (m && Array.isArray(m.pasos)) suma('opcionales', m.pasos.filter(x => x && x.obligatorio === false).map(x => x.clave), 'modulos.json'); });
  if (s && Array.isArray(s.pasos)) { suma('pasos', s.pasos, 'modulos.json'); suma('faltas', s.faltas, 'modulos.json'); suma('hints', s.hints, 'modulos.json'); suma('modulos', Array.isArray(s.modulos) ? s.modulos : Object.keys(s.modulos || {}), 'modulos.json'); viva = true; }
}
if (fs.existsSync(mpy)) {
  const py = fs.readFileSync(mpy, 'utf8');
  const lista = (n) => { const m = py.match(new RegExp('^' + n + ' = \\(([^)]*)\\)', 'm')); return m ? (m[1].match(/'([a-z0-9_]+)'/g) || []).map(x => x.slice(1, -1)) : null; };
  const p = lista('SETUP_PASOS'), f = lista('SETUP_FALTAS'), h = lista('SETUP_HINTS');
  if (p) { suma('pasos', p, 'modulos.py'); viva = true; }
  if (f) suma('faltas', f, 'modulos.py');
  if (h) suma('hints', h, 'modulos.py');
}
if (!viva) {
  if (process.env.AXW_SIN_AGENCIA === '1') console.log('AVISO: sin la lista viva de la base (' + mjson + '): se mide solo con la copia fechada y los dobles');
  else ok('la lista viva de la base existe (AXW_AGENCIA_RAIZ=' + raiz + ')', false, 'sin erp/modulos.json ni erp/modulos.py con SETUP_*: pon AXW_AGENCIA_RAIZ o AXW_SIN_AGENCIA=1');
}
// los dobles: cualquier {codigo, campos}, cualquier paso {clave, modulo}
function recorre(x, de) {
  if (Array.isArray(x)) { x.forEach(y => recorre(y, de)); return; }
  if (!x || typeof x !== 'object') return;
  if (typeof x.codigo === 'string' && Array.isArray(x.campos)) { suma('faltas', [x.codigo], de); suma('campos', x.campos, de); }
  if (typeof x.clave === 'string' && /^[a-z_]+$/.test(x.clave) && ('obligatorio' in x || 'hecho' in x)) suma('pasos', [x.clave], de);
  Object.values(x).forEach(y => recorre(y, de));
}
fs.readdirSync(path.join(AQUI, 'pruebas')).filter(f => /^doble_.*\.json$/.test(f)).forEach(f => recorre(JSON.parse(fs.readFileSync(path.join(AQUI, 'pruebas', f), 'utf8')), f));
// los proximos de un doble (taller_proveedores…) NO son pasos: no se exigen
['taller_proveedores', 'taller_almacen'].forEach(k => codigos.pasos.delete(k));

// Lo justo de navegador para que los scripts carguen (no pintan nada al cargar: registran componentes y frases)
function ventana(extra) {
  const win = Object.assign({ LW_EN: {}, LW_ID: {}, console: { warn() {}, log() {} } }, extra);
  win.window = win;
  win.addEventListener = () => {}; win.removeEventListener = () => {};
  win.document = { readyState: 'complete', addEventListener() {}, getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; } };
  win.location = { pathname: '/ajustes/configurar/', search: '', hash: '' };
  win.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  win.sessionStorage = win.localStorage;
  win.setTimeout = setTimeout; win.clearTimeout = clearTimeout;
  return win;
}
// ── El vm: los cinco scripts, en orden, con lo justo de navegador ────────────────────────────────────────────────────────────────────────────
function carga(idioma, fuentes) {
  const win = ventana({});
  if (idioma === 'id') Object.assign(win.LW_ID, I18N_ID);   // el paquete de bbm trae el diccionario antes (i18n.js + i18n_id.json)
  if (idioma !== 'es') {
    win.lwT = (x, h) => {
      const d = idioma === 'en' ? win.LW_EN : win.LW_ID;
      let v = Object.prototype.hasOwnProperty.call(d, x) ? d[x] : x;
      if (h) for (const k of Object.keys(h)) v = v.split('%' + k).join(h[k]);
      return v;
    };
  }
  win.LW_AUTH = Promise.resolve({ sb: { rpc: () => Promise.resolve({ data: null, error: null }) } });
  for (const [f, src] of (fuentes || FUENTES)) {
    try { vm.runInNewContext(src, win, { filename: f }); } catch (e) { ok('carga ' + f, false, e.message); }
  }
  return win;
}

(async () => {
  ok('la lista trae los 10 códigos de bbm-p28', ['negocio', 'idiomas', 'correo', 'taller_revisiones', 'taller_recambios', 'taller_mecanicos'].every(k => codigos.pasos.has(k))
    && ['sin_correo', 'sin_lista_revision', 'sin_recambios'].every(k => codigos.faltas.has(k)) && codigos.hints.has('idiomas_no_validos'));

  const es = carga('es').AXW_SETUP;
  const enEspanol = new Set();
  for (const g of Object.values(es.TEXTOS)) for (const v of Object.values(g)) (Array.isArray(v) ? v : [v]).forEach(f => enEspanol.add(f));

  for (const idioma of ['es', 'en', 'id']) {
    const win = carga(idioma), S = win.AXW_SETUP;
    const salidas = [];
    const mira = (que, t) => { salidas.push([que, t]); };
    for (const k of codigos.pasos) { mira('paso ' + k, S.texto('paso', k, 0)); mira('paso ' + k + ' (para qué)', S.texto('paso', k, 1)); }
    for (const k of codigos.faltas) mira('falta ' + k, S.textoFalta({ codigo: k, campos: [] }));
    for (const k of codigos.campos) mira('campo ' + k, S.texto('campo', k));
    for (const k of codigos.modulos) mira('módulo ' + k, S.nombreModulo(k));
    for (const k of codigos.opcionales) mira('consecuencia de ' + k + ' sin hacer', S.lineaOpcional({ clave: k }));
    for (const k of codigos.hints) mira('hint ' + k, S.explica({ code: '22023', hint: k }, true).texto);
    mira('hint <m>_sin_configurar', S.explica({ code: '55000', hint: 'taller_sin_configurar' }, true).texto);
    const desc = S.desconocidos.slice();
    ok(idioma + ': ningún código de la base sin frase', desc.length === 0, desc.map(d => d + ' (de ' + (origen[d.replace(/^paso:/, 'pasos:').replace(/^falta:/, 'faltas:').replace(/^hint:/, 'hints:').replace(/^campo:/, 'campos:').replace(/^modulo:/, 'modulos:')] || ['?']).join('+') + ')').join(', '));
    for (const [que, t] of salidas) {
      ok(idioma + ': ' + que + ' sin código a la vista', typeof t === 'string' && t.length > 0 && !/\(c[óo]digo|\(code|\(kode|_[a-z]/.test(t), t);
      if (idioma !== 'es') ok(idioma + ': ' + que + ' traducido', !enEspanol.has(t), t);
    }
  }

  // ── El paquete que SALE: sin setup_reservas.js (rama setup-sin-e3), los códigos que solo él traduce caen en la frase genérica. No es rojo (es lo
  // decidido: Cobros sale antes que E3), pero se dice en voz alta, y TODO lo que cae tiene que ser de E3/E4, nunca de otro sitio.
  if (!CON_E3) {
    const sinE3 = carga('es', SERVIDOS).AXW_SETUP;
    const pide = () => {
      for (const k of codigos.pasos) { sinE3.texto('paso', k, 0); sinE3.texto('paso', k, 1); }
      for (const k of codigos.faltas) sinE3.textoFalta({ codigo: k, campos: [] });
      for (const k of codigos.campos) sinE3.texto('campo', k);
      for (const k of codigos.opcionales) sinE3.lineaOpcional({ clave: k });
      for (const k of codigos.hints) sinE3.explica({ code: '22023', hint: k }, true);
    };
    pide();
    // los que añade setup_reservas.js: lo que conoce con él y no sin él
    const conR = carga('es', FUENTES.filter(([f]) => f !== 'setup_comun.js' && f !== 'cobros_paso.js')).AXW_SETUP;
    const sinR = carga('es', FUENTES.filter(([f]) => f === 'setup_modulos.js' || f === 'setup_pasos.js')).AXW_SETUP;
    const deE3 = new Set();
    for (const g of Object.keys(conR.TEXTOS)) for (const k of Object.keys(conR.TEXTOS[g])) if (!(k in (sinR.TEXTOS[g] || {}))) deE3.add(k);
    const caen = [...new Set(sinE3.desconocidos.map(d => d.replace(/^[a-z]+:/, '')))];
    ok('paquete sin setup_reservas.js: lo que cae en frase genérica es SOLO de E3/E4', caen.every(k => deE3.has(k)), caen.filter(k => !deE3.has(k)).join(', '));
    console.log('AVISO: este paquete NO lleva setup_reservas.js (build.py). ' + caen.length + ' códigos de E3/E4 saldrían con frase genérica: ' + caen.join(', ') +
      '. Aplicar E3/E4 en una base con este front deja «alquileres_previos» (obligatorio) sin pantalla: E3/E4 y publicar setup-junto van en el MISMO paso.');
  }

  // ── Una frase, una traducción: si dos ficheros traen traducciones distintas para la misma frase, gana la del primero que cargue ────────────
  for (const lado of ['LW_EN', 'LW_ID']) {
    const visto = {};
    if (lado === 'LW_ID') Object.entries(I18N_ID).forEach(([k, v]) => { visto[k] = { v, de: 'i18n_id.json' }; });
    for (const [f, src] of FUENTES) {
      const rec = {};
      const espia = new Proxy({}, { has() { return false; }, set(t, k, v) { rec[k] = v; return true; }, get(t, k) { return rec[k]; } });
      const win = ventana({ LW_EN: lado === 'LW_EN' ? espia : {}, LW_ID: lado === 'LW_ID' ? espia : {} });
      // cada fichero necesita a los anteriores (AXW_SETUP, AXW_PASOS): se cargan con un LW_* normal y luego el espiado
      const previos = FUENTES.slice(0, FUENTES.findIndex(x => x[0] === f));
      const base = ventana({});
      for (const [, s] of previos) vm.runInNewContext(s, base);
      win.AXW_SETUP = base.AXW_SETUP; win.AXW_PASOS = base.AXW_PASOS;
      vm.runInNewContext(src, win);
      for (const [k, v] of Object.entries(rec)) {
        if (visto[k] && visto[k].v !== v) ok(lado + ' «' + k + '» con una sola traducción', false, visto[k].de + ': «' + visto[k].v + '» / ' + f + ': «' + v + '»');
        else if (!visto[k]) visto[k] = { v, de: f };
      }
    }
  }

  // ── Glosario indonesio en las frases nuevas de setup_comun.js ─────────────────────────────────────────────────────────────────────────────
  const GLOSARIO = JSON.parse(fs.readFileSync(path.join(AQUI, 'glosario_id.json'), 'utf8'));
  const winId = carga('id');
  const comun = FUENTES.find(x => x[0] === 'setup_comun.js')[1];
  const idCo = vm.runInNewContext('(' + comun.match(/var ID_CO = (\{[\s\S]*?\n  \});/)[1] + ')', {});
  for (const [es_, id_] of Object.entries(idCo)) {
    for (const [termino, debe] of Object.entries(GLOSARIO.terminos)) {
      if (!new RegExp('\\b' + termino, 'i').test(es_)) continue;
      const opciones = Array.isArray(debe) ? debe : [debe];
      ok('glosario «' + termino + '» en «' + es_ + '»', opciones.some(o => id_.toLowerCase().includes(o)), id_);
    }
    for (const p of Object.keys(GLOSARIO.prohibidos)) ok('sin «' + p + '» en «' + id_ + '»', !id_.toLowerCase().includes(p));
    ok('ID efectivo de «' + es_ + '» es el de setup_comun.js o el del diccionario', winId.LW_ID[es_] === id_ || I18N_ID[es_] !== undefined);
  }

  // ── Los tres pasos del AaaS abren su paso del asistente de Ajustes de agente.html (#ajustes-<paso>, 15-oct-2026), en el asistente y en
  //    Ajustes › Configurar (los dos leen comp.enlace); un `donde` ajeno o raro no se toca ──────────────────────────────────────────────────
  {
    const P = carga('es').AXW_PASOS;
    const enl = (clave, donde) => { const c = P.de(clave, { clave, donde, modulo: 'agente' }); return c.externo && typeof c.enlace === 'function' ? c.enlace({ clave, donde }) : 'SIN ENLACE'; };
    ok('tope_aaas → /agente/#ajustes-tope', enl('tope_aaas', '/agente/') === '/agente/#ajustes-tope', enl('tope_aaas', '/agente/'));
    ok('contexto_aaas → /agente/#ajustes-negocio', enl('contexto_aaas', '/agente/') === '/agente/#ajustes-negocio', enl('contexto_aaas', '/agente/'));
    ok('limites_aaas → /agente/#ajustes-limites', enl('limites_aaas', '/agente/') === '/agente/#ajustes-limites', enl('limites_aaas', '/agente/'));
    ok('otro paso externo (clave que el asistente no conoce) conserva su donde', enl('paso_sin_componente', '/flota/') === '/flota/', enl('paso_sin_componente', '/flota/'));
    ok('un paso del AaaS con donde que no es /agente/ no gana ancla', enl('tope_aaas', '/otra/') === '/otra/', enl('tope_aaas', '/otra/'));
    ok('donde raro: sin enlace', enl('tope_aaas', 'javascript:alert(1)') === null, String(enl('tope_aaas', 'javascript:alert(1)')));
  }

  console.log('Códigos medidos: ' + codigos.pasos.size + ' pasos, ' + codigos.faltas.size + ' faltas, ' + codigos.hints.size + ' hints, ' + codigos.campos.size + ' campos, ' + codigos.modulos.size + ' módulos' + (viva ? ' (con la lista viva de ' + raiz + ')' : ''));
  console.log((fallos ? 'FALLAN ' + fallos + ' de ' : 'OK ') + total + ' comprobaciones — setup_frases.test.js');
  process.exit(fallos ? 1 : 0);
})();
