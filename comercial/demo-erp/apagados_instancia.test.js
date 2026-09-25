// Prueba de apagados_instancia.js (F4, 25-sep-2026): node apagados_instancia.test.js
// Cliente simulado con la forma de supabase-js v2 (from/rpc en la instancia, `storage` como getter del prototipo).
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const plantilla = fs.readFileSync(path.join(__dirname, 'apagados_instancia.js'), 'utf8');
const mapa = { t: { comisiones_devengadas: 'comisiones' }, f: { reserva_vence_el: 'reservas' }, b: { obra: 'obra' }, p: ['/intranet/v4/comisiones/'] };
const red = [];

class Almacen { from(b) { return { createSignedUrl: async () => { red.push('storage:' + b); return { data: { signedUrl: 'x' }, error: null }; } }; } }
class Cliente {
  from(n) { red.push('from:' + n); const q = { select() { return q; }, eq() { return q; }, then(r) { return Promise.resolve({ data: [{ id: 1 }], error: null }).then(r); } }; return q; }
  rpc(n) { red.push('rpc:' + n); return Promise.resolve({ data: 'real', error: null }); }
  get storage() { return new Almacen(); }
}
const ventana = { supabase: { createClient: () => new Cliente() }, document: { readyState: 'complete', querySelectorAll: () => [], body: {} }, location: { href: 'https://x/' } };
global.window = ventana; global.document = ventana.document; global.location = ventana.location;
global.MutationObserver = class { observe() {} };
global.console = Object.assign(Object.create(console), { info() {} });
new Function(plantilla.replace('__AXW_APAGADOS__', JSON.stringify(mapa)))();

(async () => {
  const sb = window.supabase.createClient('u', 'k');
  // apagado: vacío, encadenable, sin red
  const r1 = await sb.from('comisiones_devengadas').select('id').eq('x', 1).in('y', [1]).order('z');
  assert.deepStrictEqual(r1.data, []); assert.strictEqual(r1.error, null);
  const r2 = await sb.from('comisiones_devengadas').select('id').maybeSingle();
  assert.strictEqual(r2.data, null);
  const r3 = await sb.rpc('reserva_vence_el', { p: 1 });
  assert.strictEqual(r3.data, null);
  const r4 = await sb.storage.from('obra').createSignedUrl('a', 60);
  assert.ok(r4.error && /no activo/.test(r4.error.message));
  assert.deepStrictEqual(red, [], 'un apagado no debe salir a la red: ' + red.join(','));
  // encendido: pasa tal cual
  const r5 = await sb.from('facturas').select('id');
  assert.deepStrictEqual(r5.data, [{ id: 1 }]);
  const r6 = await sb.rpc('guardar_recibi');
  assert.strictEqual(r6.data, 'real');
  const r7 = await sb.storage.from('justificantes').createSignedUrl('a', 60);
  assert.strictEqual(r7.data.signedUrl, 'x');
  assert.deepStrictEqual(red, ['from:facturas', 'rpc:guardar_recibi', 'storage:justificantes']);
  // Promise.all con apagados y encendidos
  const [a, b] = await Promise.all([sb.from('comisiones_devengadas').select('*'), sb.from('facturas').select('*')]);
  assert.deepStrictEqual(a.data, []); assert.strictEqual(b.data.length, 1);
  console.log('OK apagados_instancia: 9/9');
})().catch((e) => { console.error('FALLA', e.message); process.exit(1); });
