// Prueba del mini-diccionario ES/EN de asistente_peticiones.html (AXW-136, 2-oct-2026): node test_asistente_i18n.js
// Todo texto español que la pantalla puede pintar tiene que estar en EN_AP: lo que pasa por T(...) (incluidas las dos ramas de un
// ternario), los valores de las tablas ERRORES/ESTADO/ACCION/CAMPO/ETIQ/FRASES y lo marcado en el HTML (data-lwt, data-lwt-ph, data-lwt-aria).
// Sale 1 y lista lo que falta. No ejecuta la pantalla: solo lee el fichero.
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'asistente_peticiones.html'), 'utf8');
const [marcado, script] = src.split('<!--AXW_SCRIPT-->');

const evalua = (txt) => (0, eval)('(' + txt + ')');
const bloque = (nombre) => {
  const m = new RegExp('var ' + nombre + ' = (\\{[\\s\\S]*?\\})\\s*;').exec(script);
  if (!m) throw new Error('no encuentro ' + nombre);
  return evalua(m[1]);
};
const EN = bloque('EN_AP');
const faltan = [];
const exige = (clave, donde) => { if (clave && !Object.prototype.hasOwnProperty.call(EN, clave)) faltan.push(donde + ': ' + JSON.stringify(clave)); };

// 1. Tablas de rótulos
['ERRORES', 'CAMPO', 'ETIQ', 'ACCION'].forEach((n) => Object.values(bloque(n)).forEach((v) => exige(v, n)));
Object.values(bloque('ESTADO')).forEach((v) => exige(v[0], 'ESTADO'));
const fr = /var FRASES = (\[[^\]]*\]);/.exec(script);
if (!fr) throw new Error('no encuentro FRASES');
evalua(fr[1]).forEach((v) => exige(v, 'FRASES'));

// 2. Llamadas T(...): las cadenas del primer argumento (antes de la coma de primer nivel)
for (let i = script.indexOf('T('); i !== -1; i = script.indexOf('T(', i + 2)) {
  if (/[A-Za-z0-9_$.]/.test(script[i - 1] || ' ')) continue;   // «ADMIN(», «.T(» no son la función
  let j = i + 2, prof = 1, q = null, primero = true, primeroLocal = true, cadenas = [], cur = '';
  for (; j < script.length && prof > 0; j++) {
    const c = script[j];
    if (q) {
      if (c === '\\') { cur += c + script[++j]; continue; }
      if (c === q) { q = null; if (primero && primeroLocal) cadenas.push(cur); cur = ''; continue; }
      cur += c; continue;
    }
    if (c === "'" || c === '"') { q = c; cur = ''; if (/[=!]\s*$/.test(script.slice(Math.max(0, j - 4), j))) primeroLocal = false; else primeroLocal = true; continue; }
    if (c === '(' || c === '[' || c === '{') prof++;
    else if (c === ')' || c === ']' || c === '}') prof--;
    else if (c === ',' && prof === 1) primero = false;
  }
  cadenas.forEach((c) => exige(evalua("'" + c.replace(/'/g, "\\'") + "'"), 'T()'));
}

// 3. Marcado: data-lwt (el texto de la hoja), data-lwt-ph (placeholder), data-lwt-aria (aria-label)
let m;
const reHoja = /<([a-z0-9]+)\b([^>]*)\bdata-lwt(?![-\w])([^>]*)>([^<]*)</g;
while ((m = reHoja.exec(marcado))) exige(m[4].trim(), 'data-lwt');
const reAtr = (marca, atr) => new RegExp('<[^>]*\\b' + marca + '\\b[^>]*>', 'g');
(marcado.match(/<[^>]*\bdata-lwt-ph\b[^>]*>/g) || []).forEach((t) => exige(((/placeholder="([^"]*)"/.exec(t)) || [])[1], 'data-lwt-ph'));
(marcado.match(/<[^>]*\bdata-lwt-aria\b[^>]*>/g) || []).forEach((t) => exige(((/aria-label="([^"]*)"/.exec(t)) || [])[1], 'data-lwt-aria'));

// 4. Una clave que sobra no es un fallo, pero una repetida (dos claves iguales en el literal) sí: la segunda se perdería sin avisar
const claves = [...script.slice(script.indexOf('var EN_AP'), script.indexOf('};', script.indexOf('var EN_AP'))).matchAll(/'((?:[^'\\]|\\.)*)'\s*:\s*'/g)].map((x) => x[1]);
const vistas = new Set();
claves.forEach((k) => { if (vistas.has(k)) faltan.push('clave repetida en EN_AP: ' + k); vistas.add(k); });

if (faltan.length) { console.log('FALTA TRADUCCIÓN / REPETIDAS:\n' + faltan.join('\n')); process.exit(1); }
console.log('OK test_asistente_i18n: ' + Object.keys(EN).length + ' claves, todo lo pintable cubierto');
