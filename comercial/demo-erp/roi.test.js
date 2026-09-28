// Prueba de roi.js (calculadora de la portada, 28-sep-2026): node roi.test.js
// Números hechos a mano, no copiados de lo que devuelve la función.
const assert = require('assert');
const R = require('./roi.js');

const cerca = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} != ${b}`);
const def = {};
R.TAREAS.forEach((t) => { def[t[0]] = t[4]; });

// Por defecto: 10+8+6+6+4 = 34 h/semana · 52/12 = 147,333 h/mes · 50 % = 73,667 h · /160 = 0,4604 puestos
// · 2.500 · 12 = 13.812,5 al año
let r = R.calcula(def, 2500, 50);
cerca(r.horasSemanaEquipo, 34, 'horas/semana');
cerca(r.horasMes, 34 * 52 / 12 / 2, 'horas/mes');
cerca(r.puestos, 34 * 52 / 12 / 2 / 160, 'puestos');
cerca(r.valorAno, 13812.5, 'valor anual');
cerca(r.valorMes, 13812.5 / 12, 'valor mensual');

// 0 % asumido → nada liberado, aunque haya horas
r = R.calcula(def, 2500, 0);
cerca(r.valorAno, 0, '0 %');

// Entradas basura del navegador: texto, negativos, por encima del techo, coma decimal
r = R.calcula({ leads: '-5', contratos: 'abc', facturas: '1000', cobros: '2,5' }, '3000', '150');
cerca(r.horasSemanaEquipo, 0 + 0 + 168 + 2.5, 'límites de horas');
cerca(r.horasMes, 170.5 * 52 / 12, 'pct recortado a 100');
r = R.calcula(null, NaN, undefined);
cerca(r.valorAno, 0, 'sin datos');

// Una persona entera: 160 h/mes liberadas al 100 % = 1 puesto = 12 sueldos
r = R.calcula({ leads: 160 * 12 / 52 }, 2000, 100);
cerca(r.puestos, 1, 'un puesto');
cerca(r.valorAno, 24000, 'doce sueldos');

assert.strictEqual(R.frasePuestos(0.46), 'media persona a jornada completa');
assert.strictEqual(R.frasePuestos(0.8), 'casi una persona a jornada completa');
assert.strictEqual(R.frasePuestos(1), 'una persona a jornada completa');
assert.strictEqual(R.frasePuestos(2.3), 'unas 2,5 personas a jornada completa');

// Cada tarea nombra algo que la portada ya afirma, y lleva su modo
R.TAREAS.forEach((t) => assert.ok(['solo', 'prepara'].includes(t[3]) && t[2].length > 10, t[0]));

console.log('roi.test.js OK');
