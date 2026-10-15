// M4 de la auditoría del setup de bbm (15-oct-2026): la ubicación de la tienda acepta un enlace de Google Maps además de «lat, lng».
// coordDeEnlace vive copiada en entrega.html y setup_reservas.js (cada pantalla es independiente): aquí se comprueba que las dos copias son
// idénticas y qué saca de cada forma de enlace. Sin navegador: node test_m4_enlace_mapa.js
'use strict';
const fs = require('fs');
const path = require('path');
let total = 0; const fallos = [];
function ok(nombre, cond, detalle) { total++; if (!cond) fallos.push(nombre + (detalle !== undefined ? ' — ' + detalle : '')); }

function saca(fichero) {
  const t = fs.readFileSync(path.join(__dirname, fichero), 'utf8');
  const i = t.indexOf('  function coordDeEnlace(t) {');
  if (i < 0) return null;
  const j = t.indexOf('\n  }\n', i);
  return t.slice(i, j + 4);
}
const a = saca('entrega.html'), b = saca('setup_reservas.js');
ok('las dos pantallas tienen coordDeEnlace', !!a && !!b);
ok('las dos copias son idénticas', a === b);
const coordDeEnlace = new Function(a + '\nreturn coordDeEnlace;')();

const CASOS = [
  // [entrada, esperado] — null: no es un enlace (sigue el análisis de números); '': enlace sin punto
  ['-8.65, 115.13', null],
  ['abc', null],
  ['https://www.google.com/maps/place/Bali+Best+Motorcycle/@-8.6512345,115.1300000,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-8.6501234!4d115.1312345!16s', '-8.6501234, 115.1312345'],
  ['https://www.google.com/maps/@-8.6478,115.1385,15z', '-8.6478, 115.1385'],
  ['https://maps.google.com/?q=-8.65,115.13', '-8.65, 115.13'],
  ['https://www.google.com/maps?q=-8.650000,+115.216667', '-8.65, 115.216667'],
  ['https://www.google.com/maps/search/?api=1&query=-8.65%2C115.13', '-8.65, 115.13'],
  ['https://www.google.com/maps/place/-8.65,115.13', '-8.65, 115.13'],
  ['google.co.id/maps/@-8.70,115.17,14z', '-8.7, 115.17'],
  ['https://maps.app.goo.gl/AbCdEf123', ''],
  ['https://goo.gl/maps/AbCdEf123', ''],
  ['https://www.google.com/maps/place/Canggu', ''],
  ['https://example.com/maps/@-8.65,115.13', null],
  ['https://www.google.com/maps/%E0%A4%A', ''],   // URI mal formada: no rompe
];
for (const [v, esp] of CASOS) {
  let r; try { r = coordDeEnlace(v); } catch (e) { r = 'LANZA ' + e.message; }
  ok('«' + v.slice(0, 70) + '» → ' + JSON.stringify(esp), r === esp, JSON.stringify(r));
}

// lo que sale de un enlace lo entiende el analizador de siempre de cada pantalla (formato «lat, lng» con punto decimal)
ok('el resultado tiene la forma «lat, lng» con punto', /^-?\d{1,3}(\.\d+)?, -?\d{1,3}(\.\d+)?$/.test(coordDeEnlace(CASOS[2][0])));
// las dos pantallas llaman a coordDeEnlace antes de analizar y dicen qué pasa con un enlace corto
const e = fs.readFileSync(path.join(__dirname, 'entrega.html'), 'utf8'), s = fs.readFileSync(path.join(__dirname, 'setup_reservas.js'), 'utf8');
ok('entrega: parseCoord mira el enlace primero', /function parseCoord\(raw\) \{\n    var en = coordDeEnlace\(raw\);/.test(e));
ok('asistente: parseCoord mira el enlace primero', /var en = coordDeEnlace\(t\);\n    if \(en === ''\) return \{ e: U\('sr_coord_corto'\) \};/.test(s));
ok('asistente: el campo admite un enlace largo (max 2000)', s.includes("campo(r1, 'sede_coord', U('sr_sede_coord'),") && s.includes("{ max: 2000, soloLee: c.activa"));
ok('entrega: el campo ya no abre el teclado de números (un enlace lleva letras)', !/data-campo="sede_coord" inputmode="decimal"/.test(e));

if (fallos.length) { console.log('MAL test_m4_enlace_mapa: ' + (total - fallos.length) + '/' + total); fallos.forEach(f => console.log('  FALLA: ' + f)); process.exit(1); }
console.log('OK test_m4_enlace_mapa: ' + total + '/' + total);
