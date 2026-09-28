// Prueba de la selección que viaja en la URL de la portada a la demo (catalogo.js, AXW-70, 28-sep-2026): node sel.test.js
// Lo que llega en `sel=` lo escribe quien tenga el navegador: aquí se prueba que la basura no cambia nada.
const assert = require('assert');
global.window = {};
require('./catalogo.js');
const CAT = global.window.AXW_CATALOGO;

const encendidos = (e) => Object.keys(e).filter((k) => e[k]).sort();
const modulosDe = (...packs) => packs.flatMap((p) => CAT.pack(p)[3]);

// Ida y vuelta: base + captación + núcleo + finanzas, un suelto y un «en camino»
let e = CAT.leeSel('base');
assert.deepStrictEqual(encendidos(e), modulosDe('base').sort(), 'solo la base');
e = CAT.leeSel('captacion,finanzas,bancos,radar');
const esperado = modulosDe('base', 'captacion', 'nucleo', 'finanzas').concat(['bancos', 'radar']).sort();
assert.deepStrictEqual(encendidos(e), esperado, 'finanzas trae el núcleo que necesita; suelto y camino');
assert.strictEqual(CAT.codificaSel(e), 'base,captacion,nucleo,finanzas,bancos,radar', 'codifica lo mismo que leyó');
assert.deepStrictEqual(encendidos(CAT.leeSel(CAT.codificaSel(e))), esperado, 'ida y vuelta estable');
// `finanzas` es pack y módulo a la vez: cuenta como pack (entero)
assert.ok(modulosDe('finanzas').every((k) => CAT.leeSel('finanzas')[k]), 'finanzas = el pack entero');
// Un módulo suelto de un pack enciende su pack entero (los packs no van a medias)
assert.ok(modulosDe('captacion').every((k) => CAT.leeSel('crm')[k]), 'crm enciende captación entera');
// Todas las claves presentes: leeEstado() no puede rellenar ninguna por su cuenta
CAT.MODULOS.concat(CAT.CAMINO).forEach((m) => assert.ok(m[0] in e, 'falta la clave ' + m[0]));

// Basura: null (no se escribe nada)
for (const malo of ['', 'x', 'BASE', '__proto__', 'constructor', 'toString', 'hasOwnProperty', '__proto__,constructor',
  '<img src=x onerror=alert(1)>', 'base;captacion', ' base', 'base ', '../../etc', 'inventado,otro', ',,,,',
  'a'.repeat(CAT.SEL_MAX_LARGO + 1), Array(CAT.MODULOS.length + 2).join('base,'), null, undefined, 42, ['base']]) {
  assert.strictEqual(CAT.leeSel(malo), null, 'tenía que descartar: ' + String(malo).slice(0, 40));
}
// Lo desconocido se descarta y lo válido se queda
assert.deepStrictEqual(encendidos(CAT.leeSel('inventado,captacion,__proto__')), modulosDe('base', 'captacion').sort(), 'mezcla');
// Nada de lo que llega toca el prototipo
CAT.leeSel('__proto__,constructor,base');
assert.strictEqual({}.polluted, undefined, 'prototipo intacto');
assert.ok(!Object.prototype.hasOwnProperty.call(CAT.leeSel('base'), '__proto__'), 'sin claves raras');

console.log('ok sel.test.js');
