// Prueba del «espera ganar» del registro en agente.html (18-oct-2026, sesión aaas-bbm; migración de la agencia 20261018130000): node agente_valor_moneda.test.js
// Ejecuta cifra y esperaGanar del agente.html REAL con C.dinero real (_compartido/pantalla_comun.js). `valor_esperado` va ya en la unidad de su
// moneda y no se divide (en bbm, IDR sin decimales, dividir entre 100 daba la cifra mal); una fila de antes solo trae `valor_esperado_cent` y va
// en la moneda de la instancia, como hasta ahora; sin ninguno de los dos no se pinta nada. Y el registro pinta con esperaGanar, no con cifra.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'agente.html'), 'utf8');
const comun = fs.readFileSync(path.join(__dirname, '_compartido', 'pantalla_comun.js'), 'utf8');
function corta(desde, hasta) { const i = src.indexOf(desde); if (i < 0) throw new Error('no está: ' + desde); const j = src.indexOf(hasta, i); return src.slice(i, j); }
const ent = corta('  function ent(x)', '\n') + '\n';
const fns = corta('  function cifra(cent, m)', '  function mesNombre(');
const dinero = comun.slice(comun.indexOf('  function dinero(n, m) {'), comun.indexOf('  function fechaDia('));
const nuevo = moneda => new Function(`
  var window = {}; function locale() { return 'es-ES'; }
  ${dinero}
  var C = { dinero: dinero };
  var V = { d: { moneda: ${JSON.stringify(moneda)} } };
  ${ent}${fns}
  return { esperaGanar: esperaGanar };`)();

let fallos = 0, total = 0;
function ok(n, c, d) { total++; if (!c) { fallos++; console.log('FALLA: ' + n + (d !== undefined ? ' — ' + JSON.stringify(d) : '')); } }
const nbsp = s => (s == null ? s : String(s).replace(/[  ]/g, ' '));
const CASOS = [
  ['IDR', { valor_esperado: 1500000, valor_moneda: 'IDR' }, '1.500.000 IDR'],
  ['IDR', { valor_esperado: 12.5, valor_moneda: 'EUR' }, '12,50 EUR'],
  ['IDR', { valor_esperado_cent: 5000 }, '50 IDR'],
  ['EUR', { valor_esperado_cent: 5000 }, '50,00 EUR'],
  ['IDR', { valor_esperado: 0, valor_moneda: 'IDR' }, '0 IDR'],
  ['IDR', { valor_esperado: 250000, valor_moneda: 'idr<b>' }, '250.000 IDR'],     // moneda sin forma ISO: la de la instancia
  ['IDR', { valor_esperado: 250000, valor_esperado_cent: 99 }, '250.000 IDR'],    // si vienen las dos, manda la nueva
  ['IDR', { valor_esperado: '250000', valor_moneda: 'IDR' }, null],               // texto: no es un número del servidor
  ['IDR', { valor_esperado: -5, valor_moneda: 'IDR' }, null],
  ['IDR', {}, null],
  ['IDR', { valor_esperado: null, valor_moneda: null, valor_esperado_cent: null }, null],
];
for (const [mon, fila, esperado] of CASOS) {
  const x = nbsp(nuevo(mon).esperaGanar(fila));
  ok('instancia ' + mon + ' ' + JSON.stringify(fila), x === esperado, x);
}
const registro = corta("    filas.forEach(function (r) {", "    });");
ok('el registro pinta con esperaGanar(r)', /esperaGanar\(r\)/.test(registro) && !/cifra\(r\.valor_esperado_cent/.test(registro));
if (fallos) { console.log(fallos + ' de ' + total + ' FALLAN'); process.exit(1); }
console.log('ok: ' + total + ' comprobaciones');
