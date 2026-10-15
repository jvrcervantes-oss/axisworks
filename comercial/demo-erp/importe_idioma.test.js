// Prueba de C.importeIdioma (_compartido/pantalla_comun.js, 15-oct-2026): node importe_idioma.test.js
// Un importe tecleado con los separadores del IDIOMA de la página (Ajustes del AaaS, revisión previa #383 punto 3). Es dinero: lo que no encaja
// con el idioma es un error de formato, nunca una cifra adivinada («37.5» en es o id no puede acabar en 375).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ctx = { window: {}, document: { createElement: function () { return {}; } }, Intl: Intl };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '_compartido', 'pantalla_comun.js'), 'utf8') + '\nthis.axwComun = axwComun;', ctx);

let fallos = 0, total = 0;
function ok(n, c, d) { total++; if (!c) { fallos++; console.log('FALLA: ' + n + (d ? ' — ' + JSON.stringify(d) : '')); } }
const CASOS = [
  ['id-ID', '5.000.000', 5000000], ['id-ID', '1.500,5', 1500.5], ['id-ID', '37,5', 37.5], ['id-ID', '37.5', 'e'], ['id-ID', '12.34.567', 'e'],
  ['es-ES', '5.000.000', 5000000], ['es-ES', '37,5', 37.5], ['es-ES', '37.5', 'e'], ['es-ES', '40', 40], ['es-ES', '1234,567', 'e'], ['es-ES', ' 40 ', 40],
  ['en-GB', '5,000,000', 5000000], ['en-GB', '37.5', 37.5], ['en-GB', '37,5', 'e'], ['en-GB', '1,50', 'e'], ['en-GB', '-5', 'e'], ['en-GB', '1e3', 'e'],
  ['id-ID', '', null], ['en-GB', '   ', null]
];
for (const [loc, s, esp] of CASOS) {
  ctx.window.lwLocale = function () { return loc; };
  const r = ctx.axwComun(null, function (x) { return x; }).importeIdioma(s, 2);
  const got = r.vacio ? null : (r.e ? 'e' : r.v);
  ok(loc + ' «' + s + '» → ' + esp, got === esp, r);
}
if (fallos) { console.log(fallos + ' de ' + total + ' FALLAN'); process.exit(1); }
console.log('ok: ' + total + ' comprobaciones');
