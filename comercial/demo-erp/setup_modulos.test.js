// Prueba de setup_modulos.js (F3 Entrega 1, bbm-p18-front, 12-oct-2026): node setup_modulos.test.js
// Contra el DOBLE de Backend (pruebas/doble_modulos_setup_estado.json, la forma del plan #282 punto 2). Cuando exista la función de verdad, su
// prueba por perfil manda sobre el doble. Comprueba: la forma (lo raro es error, nunca «todo listo»), una sola petición por página, que cada
// código del doble y de la lista cerrada de hints tenga frase en es/en/id, que en inglés no salga ni una frase en español, el glosario
// indonesio, y que los errores se lean por code + hint, nunca por el mensaje.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FUENTE = fs.readFileSync(path.join(__dirname, 'setup_modulos.js'), 'utf8');
const DOBLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'pruebas', 'doble_modulos_setup_estado.json'), 'utf8'));
const GLOSARIO = JSON.parse(fs.readFileSync(path.join(__dirname, 'glosario_id.json'), 'utf8'));
// Lista cerrada de hints que el front distingue (plan de Backend #282 punto 4)
const HINTS = ['sin_prefijo', 'prefijo_fijo', 'moneda_con_datos', 'moneda_no_permitida', 'falta_confirmo', 'cuenta_pruebas_solo_mira', 'modulo_apagado', 'impuesto_no_configurado'];

let fallos = 0, total = 0;
function ok(nombre, cond, detalle) {
  total++;
  if (!cond) { fallos++; console.log('FALLA: ' + nombre + (detalle ? ' — ' + detalle : '')); }
}

// Carga el fichero en un window falso. idioma: 'es' (sin lwT: devuelve la clave), 'en' o 'id' (lwT con el diccionario fusionado).
function carga(idioma, rpc) {
  const llamadas = [];
  const win = { LW_EN: {}, LW_ID: {} };
  win.window = win;
  win.document = { readyState: 'complete', addEventListener() {} };
  if (idioma !== 'es') {
    win.lwT = (x, h) => {
      const d = idioma === 'en' ? win.LW_EN : win.LW_ID;
      let v = Object.prototype.hasOwnProperty.call(d, x) ? d[x] : x;
      if (h) for (const k of Object.keys(h)) v = v.split('%' + k).join(h[k]);
      return v;
    };
  }
  const sb = { rpc: (n) => { llamadas.push(n); return Promise.resolve(rpc ? rpc(n) : { data: null, error: null }); } };
  win.LW_AUTH = Promise.resolve({ sb });
  vm.runInNewContext(FUENTE, win);
  return { S: win.AXW_SETUP, win, llamadas };
}

(async () => {
  const es = carga('es').S;

  // ── 1. Diccionarios: cada frase en español tiene EN e ID, y no sobra ninguna ─────────────────────────────────────────────────
  const frases = new Set();
  for (const grupo of Object.values(es.TEXTOS)) for (const v of Object.values(grupo)) (Array.isArray(v) ? v : [v]).forEach(f => frases.add(f));
  for (const f of frases) {
    ok('EN tiene «' + f + '»', Object.prototype.hasOwnProperty.call(es.EN, f));
    ok('ID tiene «' + f + '»', Object.prototype.hasOwnProperty.call(es.ID, f));
    if (es.EN[f]) ok('EN no repite el español en «' + f + '»', es.EN[f] !== f);
  }
  for (const k of Object.keys(es.EN)) ok('EN sin frase huérfana «' + k + '»', frases.has(k));
  for (const k of Object.keys(es.ID)) ok('ID sin frase huérfana «' + k + '»', frases.has(k));
  for (const h of HINTS) ok('hint con frase: ' + h, !!es.TEXTOS.hint[h]);

  // ── 2. Glosario indonesio: si la clave lleva el término, la traducción lleva el suyo; ninguna palabra prohibida ─────────────────
  for (const [es_, id_] of Object.entries(es.ID)) {
    for (const [termino, debe] of Object.entries(GLOSARIO.terminos)) {
      if (!new RegExp('\\b' + termino, 'i').test(es_)) continue;
      const opciones = Array.isArray(debe) ? debe : [debe];
      ok('glosario «' + termino + '» en «' + es_ + '»', opciones.some(o => id_.toLowerCase().includes(o)), id_);
    }
    for (const p of Object.keys(GLOSARIO.prohibidos)) ok('sin «' + p + '» en «' + id_ + '»', !id_.toLowerCase().includes(p));
  }

  // ── 3. La forma: los cuatro casos del doble valen; lo raro no ────────────────────────────────────────────────────────────────
  for (const [caso, d] of Object.entries(DOBLE.casos)) ok('forma válida: ' + caso, es.formaValida(d));
  const base = DOBLE.casos.sin_configurar;
  const raros = {
    'null': null, 'array': [], 'sin pasos': Object.assign({}, base, { pasos: undefined }),
    'estado desconocido': Object.assign({}, base, { modulos: [{ modulo: 'facturas', estado: 'casi' }] }),
    'hecho no booleano': Object.assign({}, base, { pasos: [Object.assign({}, base.pasos[0], { hecho: 'si' })] }),
    'falta sin código': Object.assign({}, base, { pasos: [Object.assign({}, base.pasos[1], { falta: { campos: [] } })] }),
    'quien no configura recibe pasos': Object.assign({}, DOBLE.casos.no_configura, { pasos: base.pasos }),
    'puede_configurar no booleano': Object.assign({}, base, { puede_configurar: 'true' })
  };
  for (const [n, d] of Object.entries(raros)) ok('forma rara rechazada: ' + n, !es.formaValida(d));

  // ── 4. Textos de todo lo que manda el doble, en los tres idiomas: ningún código pelado, ninguna frase española en en/id ──────────
  for (const idioma of ['es', 'en', 'id']) {
    const { S } = carga(idioma);
    const salidas = [];
    for (const d of Object.values(DOBLE.casos)) {
      d.modulos.forEach(m => { salidas.push(S.nombreModulo(m.modulo)); salidas.push(S.texto('estado', m.estado)); });
      d.pasos.forEach(p => { salidas.push(S.texto('paso', p.clave, 0)); salidas.push(S.texto('paso', p.clave, 1)); if (p.falta) salidas.push(S.textoFalta(p.falta)); });
    }
    for (const e of Object.values(DOBLE.errores_de_ejemplo)) if (e && e.code) { salidas.push(S.explica(e, true).texto); salidas.push(S.explica(e, false).texto); }
    ok(idioma + ': ningún código desconocido', S.desconocidos.length === 0, S.desconocidos.join(', '));
    if (idioma !== 'es') {
      const enEspanol = salidas.filter(s => frases.has(s) || /\b(Falta|Configurar|empresa que|moneda del)\b/.test(s));
      ok(idioma + ': ninguna frase en español', enEspanol.length === 0, enEspanol.slice(0, 3).join(' | '));
    }
    ok(idioma + ': «falta_dato» lista sus campos', S.textoFalta({ codigo: 'falta_dato', campos: ['sede', 'precio_km'] }).includes(S.texto('campo', 'precio_km')));
  }
  // un código que no está sale con su código y traducido, y se cuenta
  const { S: Sen } = carga('en');
  ok('código desconocido: traducido y con su código', Sen.texto('paso', 'cobros', 0) === 'Unnamed step (code: cobros)');
  ok('código desconocido: se cuenta', Sen.desconocidos.indexOf('paso:cobros') >= 0);

  // ── 5. Errores por code + hint, nunca por el mensaje ─────────────────────────────────────────────────────────────────────────
  const E = DOBLE.errores_de_ejemplo;
  let x = es.explica(E.sin_configurar, true);
  ok('55000 <m>_sin_configurar, quien configura: enlace al asistente de su módulo', x.configurar === 'reservas-producto' && x.texto.includes('Reservas de producto'), JSON.stringify(x));
  x = es.explica(E.sin_configurar, false);
  ok('55000 <m>_sin_configurar, el resto: texto genérico y sin enlace', x.configurar === null && x.texto === es.TEXTOS.general.sin_configurar_resto);
  ok('sin_prefijo', es.explica(E.sin_prefijo, true).texto === es.TEXTOS.hint.sin_prefijo);
  ok('42501 cuenta_pruebas_solo_mira', es.explica(E.cuenta_pruebas, true).texto === es.TEXTOS.hint.cuenta_pruebas_solo_mira);
  ok('42501 a secas = sin permiso', es.explica(E.sin_permiso, true).texto === es.TEXTOS.general.sin_permiso);
  ok('el mensaje NO decide: 42501 con un mensaje de «sin configurar» sigue siendo sin permiso',
    es.explica({ code: '42501', hint: null, message: 'reservas-producto_sin_configurar' }, true).texto === es.TEXTOS.general.sin_permiso);
  ok('<m>_sin_configurar con otro código no se toma por «sin configurar»', es.explica({ code: '42501', hint: 'taller_sin_configurar' }, true).configurar === null);
  ok('PGRST202 = todavía no disponible', es.explica({ code: 'PGRST202', message: 'Could not find the function' }, true).texto === es.TEXTOS.general.no_existe);
  ok('sin código y fallo de red = no ha respondido', es.explica({ message: 'Failed to fetch' }, true).texto === es.TEXTOS.general.red);
  ok('código desconocido: lo dice con su código', es.explica({ code: 'P0001', hint: 'rarisimo' }, true).texto === 'No se pudo hacer (código: P0001).');

  // ── 6. estado(): una sola petición; lo raro y los errores no se confunden con «todo listo» ───────────────────────────────────
  let c = carga('es', () => ({ data: DOBLE.casos.a_medias, error: null }));
  let r1 = await c.S.estado(), r2 = await c.S.estado();
  ok('estado ok con el doble', r1.ok && r1.datos.modulos.length === 4);
  ok('una sola petición por página', c.llamadas.length === 1 && c.llamadas[0] === 'modulos_setup_estado' && r1 === r2);
  await c.S.estado(true);
  ok('«fresco» vuelve a preguntar', c.llamadas.length === 2);
  ok('moneda la ve todo usuario', (await carga('es', () => ({ data: DOBLE.casos.no_configura, error: null })).S.moneda()) === 'IDR');
  c = carga('es', () => ({ data: { puede_configurar: true, modulos: [] }, error: null }));
  r1 = await c.S.estado();
  ok('forma rara = error «forma», no «todo configurado»', !r1.ok && r1.tipo === 'forma');
  c = carga('es', () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.modulos_setup_estado' } }));
  ok('función que aún no existe = «no_existe»', (await c.S.estado()).tipo === 'no_existe');
  c = carga('es', () => { throw new Error('Failed to fetch'); });
  ok('la red cae = «red»', (await c.S.estado()).tipo === 'red');
  ok('moneda sin estado = null (las sumas esperan, nunca asumen EUR)', (await c.S.moneda()) === null);

  console.log((fallos ? 'FALLAN ' + fallos + ' de ' : 'OK ') + total + ' comprobaciones — setup_modulos.test.js');
  process.exit(fallos ? 1 : 0);
})();
