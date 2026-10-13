// «Issue contract» sin plantillas en la demo (flujo/nuevo-contrato.js, 13-oct-2026): node emitir_demo.test.js
// Se ejecuta el fichero de verdad en un `vm` con un documento mínimo. Sin una plantilla USABLE (la misma regla que emitir.js:
// versión activa, sin archivar, de un tipo activo) aparece la tarjeta que abre «New contract» y se aparta el paso de
// plantilla; con una usable, la pantalla queda como estaba. Enganche por data-lw / data-accion, nunca por rótulo.
const assert = require('assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const CODIGO = fs.readFileSync(path.join(__dirname, 'flujo', 'nuevo-contrato.js'), 'utf8');

function nodo(tag) {
  const n = { tag, attrs: {}, style: {}, hijos: [], className: '', textContent: '', parentNode: null,
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    addEventListener() {}, appendChild(h) { h.parentNode = this; this.hijos.push(h); return h; },
    insertBefore(h, ref) { h.parentNode = this; this.hijos.splice(Math.max(this.hijos.indexOf(ref), 0), 0, h); return h; } };
  return n;
}
function todos(n, f, out = []) { if (f(n)) out.push(n); n.hijos.forEach((h) => todos(h, f, out)); return out; }

async function pantalla(datos, ruta) {
  const main = nodo('main'), paso = nodo('section');
  paso.className = 'flex flex-col'; paso.setAttribute('data-lw', 'emitir-paso-plantilla'); main.appendChild(paso);
  const css = nodo('link');
  const document = { readyState: 'complete', currentScript: null, head: nodo('head'), documentElement: nodo('html'),
    createElement: nodo, createTextNode: (t) => Object.assign(nodo('#text'), { textContent: t }), addEventListener() {},
    querySelector(q) {
      if (q === 'link[data-axf-css]') return css;
      if (q === '[data-lw="emitir-paso-plantilla"]') return paso;
      if (q === '[data-axf="emitir-demo"]') return todos(main, (n) => n.attrs['data-axf'] === 'emitir-demo')[0] || null;
      return null;
    } };
  const window = { document, addEventListener() {}, AXW_DEMO_T: (k) => k, AXW_DEMO_CONTRATO: {},
    lwDatos: (nombre) => { assert.strictEqual(nombre, 'plantillas_contrato_datos'); return Promise.resolve({ data: datos, error: null }); } };
  window.window = window;
  const errores = [];
  vm.runInNewContext(CODIGO, { window, document, location: { pathname: ruta || '/emitir/', search: '' }, URLSearchParams, Promise,
    history: { replaceState() {} }, console: { error: (...a) => errores.push(a.join(' ')), log() {} } });
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
  assert.deepStrictEqual(errores, [], 'sin errores');
  const tarjeta = todos(main, (n) => n.attrs['data-axf'] === 'emitir-demo')[0] || null;
  const boton = tarjeta && todos(tarjeta, (n) => n.attrs['data-accion'] === 'demo-nuevo-contrato')[0];
  return { tarjeta, boton, pasoOculto: paso.style.display === 'none', antesDelPaso: tarjeta ? main.hijos.indexOf(tarjeta) < main.hijos.indexOf(paso) : null };
}

const tipos = [{ clave: 'reserva_parcela', activo: true }, { clave: 'construccion', activo: false }];
const plantilla = (extra) => Object.assign({ id: 'p1', tipo_contrato: 'reserva_parcela', archivada: false, activa: { id: 'v1' } }, extra);

(async () => {
  // La demo de hoy: ninguna plantilla
  let r = await pantalla({ tipos, plantillas: [] });
  assert.ok(r.tarjeta && r.boton, 'sin plantillas: tarjeta con el botón que abre «New contract»');
  assert.ok(r.pasoOculto && r.antesDelPaso, 'sin plantillas: el paso vacío se aparta y la tarjeta va delante');
  // Plantillas que emitir.js tampoco deja elegir: cuentan como ninguna
  for (const [que, p] of [['archivada', plantilla({ archivada: true })], ['sin versión activa', plantilla({ activa: null })],
    ['de un tipo apagado', plantilla({ tipo_contrato: 'construccion' })], ['de un tipo que no existe', plantilla({ tipo_contrato: 'otro' })]]) {
    r = await pantalla({ tipos, plantillas: [p] });
    assert.ok(r.tarjeta && r.pasoOculto, 'plantilla ' + que + ': la misma regla que emitir.js, sale la tarjeta');
  }
  // Una usable: la pantalla queda como siempre
  r = await pantalla({ tipos, plantillas: [plantilla({ archivada: true }), plantilla({ id: 'p2' })] });
  assert.ok(!r.tarjeta && !r.pasoOculto, 'con una plantilla usable no se toca nada');
  // Fuera de /emitir/ no hace nada
  r = await pantalla({ tipos, plantillas: [] }, '/contratos/');
  assert.ok(!r.tarjeta && !r.pasoOculto, 'solo en /emitir/');
  console.log('ok emitir_demo.test.js');
})().catch((e) => { console.error(e); process.exit(1); });
