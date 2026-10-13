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
const esperado = modulosDe('base', 'captacion', 'facturacion', 'nucleo', 'finanzas').concat(['bancos', 'radar']).sort();
assert.deepStrictEqual(encendidos(e), esperado, 'finanzas trae el núcleo que necesita; suelto y camino');
assert.strictEqual(CAT.codificaSel(e), 'base,captacion,facturacion,nucleo,finanzas,bancos,radar', 'codifica lo mismo que leyó');
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

// ── Ida y vuelta desde la PORTADA (C03, 12-oct-2026): el núcleo puro de portada.js, no una copia de su lógica. Lo que
// la portada marca y manda en ?sel= es exactamente lo que la demo abre con leeSel.
const P = require('./portada.js').nucleo(CAT);
const soloModulos = (e) => CAT.MODULOS.map((m) => m[0]).filter((k) => e[k]).sort();
const idaYVuelta = (e, que) => {
  const url = P.urlDemo('https://demo.axisworks.studio', 'demo', e);
  // «Open the demo» abre la PORTADA de dos puertas (13-oct-2026), que reenvía ?sel= a su puerta de la intranet
  assert.strictEqual(new URL(url).pathname, '/', '«Open the demo» va a la portada, no dentro de la intranet');
  const sel = new URL(url).searchParams.get('sel');
  assert.deepStrictEqual(soloModulos(CAT.leeSel(sel)), soloModulos(e), 'ida y vuelta: ' + que + ' (' + sel + ')');
  const tour = new URL(P.urlDemo('', 'tour', e), 'https://x');
  assert.strictEqual(tour.pathname + '?' + tour.searchParams.get('tour'), '/home/?1', 'el tour abre /home/?tour=1');
  assert.strictEqual(tour.searchParams.get('sel'), sel, 'el tour lleva la misma selección');
};
const todos = CAT.MODULOS.map((m) => m[0]).sort();
const base = modulosDe('base').sort();
let p = P.inicial();
assert.deepStrictEqual(soloModulos(p), todos, 'la portada arranca con todo encendido');
assert.ok(CAT.CAMINO.every((c) => !p[c[0]]), 'los «en camino» no se encienden solos');
idaYVuelta(p, 'todo');
P.soloBase(p);
assert.deepStrictEqual(soloModulos(p), base, '«Core only» deja solo la base');
idaYVuelta(p, 'solo la base');
P.todo(p);
assert.deepStrictEqual(soloModulos(p), todos, '«All on» lo enciende todo');
// La base no se toca
CAT.pack('base')[3].forEach((k) => { assert.strictEqual(P.alterna(p, k), null, 'la base no se apaga: ' + k); assert.ok(p[k]); });
assert.strictEqual(P.alterna(p, '__proto__'), null, 'un id desconocido no hace nada');
// Cada módulo, uno a uno, desde todo encendido y desde solo la base: los bloques se mueven enteros, el aviso dice
// todo lo que se movió además del tocado, y la selección resultante sobrevive a ?sel= sin cambiar.
CAT.MODULOS.filter((m) => !CAT.pack('base')[3].includes(m[0])).forEach((m) => {
  for (const desde of ['todo', 'base']) {
    const e = desde === 'todo' ? P.inicial() : P.soloBase(P.inicial());
    const antes = Object.assign({}, e);
    const r = P.alterna(e, m[0]);
    assert.ok(r && r.k === m[0] && r.on === (desde === 'base'), 'alterna ' + m[0] + ' desde ' + desde);
    const cambiados = CAT.MODULOS.map((x) => x[0]).filter((k) => antes[k] !== e[k]);
    assert.deepStrictEqual(cambiados.filter((k) => k !== m[0]).sort(), r.otros.slice().sort(), 'el aviso cuenta todo lo movido: ' + m[0]);
    const pk = CAT.PACK_DE[m[0]];
    if (pk && pk !== 'base') assert.ok(CAT.pack(pk)[3].every((k) => e[k] === r.on), 'el bloque de ' + m[0] + ' va entero');
    idaYVuelta(e, m[0] + ' desde ' + desde);
  }
});
// El tipo de negocio no cambia la rejilla (hoy): devuelve todos los módulos
['properties', 'bookings', 'services'].forEach((t) => assert.deepStrictEqual(P.modulosDeTipo(t).slice().sort(), todos, 'tipo ' + t));

console.log('ok sel.test.js');
