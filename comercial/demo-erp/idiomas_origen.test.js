// node idiomas_origen.test.js — el adaptador de Ajustes › Idiomas que build.py pone en la COPIA del ajustes.js de Lawang (IDIOMAS_ORIGEN_BASE, bbm-p31,
// 12-oct-2026). Se saca el texto LITERAL de build.py y se ejecuta con una base simulada: lee de modulos_activos_datos().idiomas, guarda por
// ajustes_config_guardar('idiomas', [defecto, …resto]), sin la clave en la respuesta se queda en solo lectura, null = manda el build, y una respuesta perdida
// se relee y nunca se reenvía. Más el filtro de combinaciones (IDIOMAS_PINTABLES_BASE): id+en solo si el paquete trae el indonesio.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const py = fs.readFileSync(path.join(__dirname, 'build.py'), 'utf8');
const origen = (py.match(/^IDIOMAS_ORIGEN_BASE = """([\s\S]*?)"""$/m) || [])[1];
const pintables = (py.match(/^IDIOMAS_PINTABLES_BASE = \(("[\s\S]*?")\)$/m) || [])[1];
assert.ok(origen && pintables, 'build.py sin IDIOMAS_ORIGEN_BASE / IDIOMAS_PINTABLES_BASE');
const pintablesJs = pintables.split(/"\s*\n\s*"/).join('').replace(/^"|"$/g, '');

function monta({ respuesta, guarda, build }) {
  const llamadas = [], almacen = {};
  const sb = {
    rpc(n, a) {
      llamadas.push([n, a]);
      if (n === 'modulos_activos_datos') return Promise.resolve(typeof respuesta === 'function' ? respuesta(llamadas) : respuesta);
      if (n === 'ajustes_config_guardar') return typeof guarda === 'function' ? guarda(a) : Promise.resolve(guarda);
      return Promise.resolve({ data: null, error: { code: '42883' } });
    }
  };
  const ctx = { sb, T: x => x, window: {}, localStorage: { setItem: (k, v) => { almacen[k] = v; }, getItem: k => almacen[k] || null } };
  if (build) ctx.window.AXW_IDIOMAS_BUILD = build;
  vm.runInNewContext(origen + '\n' + pintablesJs + '\nthis.O = IDIOMAS_ORIGEN; this.P = IDIOMAS_PINTABLES;', ctx);
  return { O: ctx.O, P: ctx.P, llamadas, almacen };
}

(async () => {
  let n = 0;
  const ok = (c, m) => { assert.ok(c, m); n++; };
  const datos = (x) => ({ data: x, error: null });

  let M = monta({ respuesta: datos({ activos: null }), build: ['id', 'en'] });
  let v = await M.O.lee();
  ok(v.origen === 'publicacion' && v.defecto === 'id' && M.O.puedeGuardar === false, 'base sin `idiomas`: lo del build y solo lectura');

  M = monta({ respuesta: datos({ activos: null, idiomas: null }), build: ['id', 'en'] });
  v = await M.O.lee();
  ok(v.origen === 'publicacion' && M.O.puedeGuardar === true, 'idiomas null: manda el build y ya se puede guardar');

  M = monta({ respuesta: datos({ activos: null, idiomas: { ofrecidos: ['en', 'es'], defecto: 'es' } }), build: ['id', 'en'] });
  v = await M.O.lee();
  ok(v.origen === 'base' && v.defecto === 'es' && v.ofrecidos.join() === 'en,es', 'guardado en la base: se lee tal cual');

  let fallo = null;
  M = monta({ respuesta: { data: null, error: { code: '42501' } }, build: ['id', 'en'] });
  try { await M.O.lee(); } catch (e) { fallo = e; }
  ok(fallo, 'lectura que falla: se dice (la pestaña enseña «no se han podido leer»)');

  M = monta({ respuesta: datos({ activos: null, idiomas: null }), guarda: datos({ clave: 'idiomas', valor: ['es', 'en'], cambiado: true }), build: ['id', 'en'] });
  let r = await M.O.guarda({ ofrecidos: ['en', 'es'], defecto: 'es' });
  const g = M.llamadas.filter(x => x[0] === 'ajustes_config_guardar');
  ok(r.ok && g.length === 1 && g[0][1].p_clave === 'idiomas' && JSON.stringify(g[0][1].p_valor) === '["es","en"]' && Object.keys(g[0][1]).length === 2, 'guarda [defecto, …resto] por ajustes_config_guardar, sin motivo');
  ok(M.almacen.axw_idiomas_erp === '["es","en"]', 'guardado: se apunta para el arranque');

  M = monta({ guarda: { data: null, error: { code: '22023', hint: 'idiomas_no_validos' } }, build: ['id', 'en'] });
  r = await M.O.guarda({ ofrecidos: ['es', 'id'], defecto: 'es' });
  ok(!r.ok && /combinación/.test(r.motivo) && !M.almacen.axw_idiomas_erp, 'idiomas_no_validos: su frase y no se apunta nada');

  M = monta({ guarda: { data: null, error: { code: '42501' } }, build: ['id', 'en'] });
  r = await M.O.guarda({ ofrecidos: ['es', 'en'], defecto: 'es' });
  ok(!r.ok && /super admin/.test(r.motivo), '42501: solo el super admin');

  // respuesta perdida: se relee; si la base ya lo tiene, vale; si no, «sin respuesta». Nunca un segundo guardado.
  M = monta({ respuesta: datos({ activos: null, idiomas: { ofrecidos: ['es', 'en'], defecto: 'es' } }), guarda: () => Promise.reject(new Error('Failed to fetch')), build: ['id', 'en'] });
  r = await M.O.guarda({ ofrecidos: ['es', 'en'], defecto: 'es' });
  ok(r.ok && M.llamadas.filter(x => x[0] === 'ajustes_config_guardar').length === 1, 'perdida y sí guardó: ok sin reenviar');
  M = monta({ respuesta: datos({ activos: null, idiomas: null }), guarda: () => Promise.resolve({ data: null, error: { message: 'Failed to fetch' } }), build: ['id', 'en'] });
  r = await M.O.guarda({ ofrecidos: ['es', 'en'], defecto: 'es' });
  ok(!r.ok && r.motivo === 'sin respuesta' && M.llamadas.filter(x => x[0] === 'ajustes_config_guardar').length === 1, 'perdida y no guardó: lo dice, sin reenviar');

  ok(monta({ respuesta: datos({}), build: ['id', 'en'] }).P.length === 2, 'paquete con indonesio: es+en e id+en');
  ok(monta({ respuesta: datos({}) }).P.length === 1 && monta({ respuesta: datos({}) }).P[0].join() === 'es,en', 'paquete sin indonesio: solo es+en');

  console.log('OK idiomas_origen: ' + n + '/' + n);
})().catch((e) => { console.error('FALLA', e.message); process.exit(1); });
