// node comercial/demo-erp/pruebas/rotulos_editores.cjs <paquete YA CONSTRUIDO de una instancia> [--json]
// Rótulos de las ventanas de edición sin su traducción en los idiomas de la instancia (bbm-idioma-total, 15-oct-2026).
// Por qué: el verificador del tren 4h vio «Nuevo gasto» en inglés con la interfaz en indonesio y «Nueva cuenta de cobro» en español en las dos,
// y el barrido de pantallas (idiomas_pantallas.harness.cjs) no lo veía: corre con la base vacía y no abre ninguna ventana de edición. Esta
// prueba no abre nada: lee del paquete cada texto que el formulario genérico de Lawang (lwEditor, en assets/*.js) pinta — label, ayuda,
// placeholder, texto de los atajos y la etiqueta de cada opción de un select — y comprueba que el diccionario de la instancia (LW_EN y LW_ID de
// contracts/assets/i18n.js, con lo que añade el build) lo tiene. El formulario los pinta por su texto exacto y traduce_instancia.js los cambia
// solo si son una clave; un rótulo obligatorio sale con « *» detrás y lo cubre su patrón (PATRONES_INSTANCIA).
// Salida: 0 todo traducido; 1 falta alguno (lista); 2 no ha podido mirar. Con --json escribe {texto: {en, id}} de lo que falta (para Idiomas).
'use strict';
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(process.argv[2] || '');
const JSON_SALIDA = process.argv.includes('--json');
const I18N = path.join(RAIZ, 'contracts', 'assets', 'i18n.js');
if (!fs.existsSync(I18N)) { console.log('NO SE HA PODIDO MIRAR: falta contracts/assets/i18n.js en ' + RAIZ); process.exit(2); }
// Los diccionarios: i18n.js se evalúa con un window de mentira; lo que toca el DOM al final falla y no importa (los diccionarios ya están puestos)
const sandbox = { window: { LW_IDIOMA: 'en' }, document: { documentElement: { lang: '' }, readyState: 'complete', addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; } },
  localStorage: { getItem() { return null; }, setItem() {} }, navigator: { language: 'en' } };
sandbox.window.document = sandbox.document; sandbox.window.localStorage = sandbox.localStorage;
try { require('vm').runInNewContext(fs.readFileSync(I18N, 'utf8'), sandbox); } catch (e) { /* MUDO A PROPOSITO: el final de i18n.js toca el DOM; los diccionarios ya están */ }
const EN = sandbox.window.LW_EN, ID = sandbox.window.LW_ID;
if (!EN || !Object.keys(EN).length) { console.log('NO SE HA PODIDO MIRAR: i18n.js no ha dejado window.LW_EN'); process.exit(2); }
const idiomas = ID && Object.keys(ID).length ? ['en', 'id'] : ['en'];
const tiene = (d, k) => Object.prototype.hasOwnProperty.call(d, k);
// Lo que no es texto para una persona: clases CSS, códigos de moneda, claves internas, cifras
const NO_ES_TEXTO = [/^(bg|text|border|ring|font|lw|las)-[\w-]+(\s+[\w-]+)*$/, /^[A-Z]{3}$/, /^[a-z0-9]+([_-][a-z0-9]+)+$/, /^[\d\s.,:%/+-]*$/, /^[a-z]+:\/\//];
// Los ficheros que llevan formularios del editor: cualquier .js de assets/ con un campo «label:» (hoy editores.js, datos.js, maqueta.js, panel-gastos.js)
const ficheros = [];
for (const dir of ['assets', path.join('contracts', 'assets')]) {
  const d = path.join(RAIZ, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) if (f.endsWith('.js') && f !== 'i18n.js') {
    const t = fs.readFileSync(path.join(d, f), 'utf8');
    if (/[{,]label:"/.test(t)) ficheros.push([path.join(dir, f).replace(/\\/g, '/'), t]);
  }
}
if (!ficheros.length) { console.log('NO SE HA PODIDO MIRAR: ningún fichero con campos de editor (label:"…")'); process.exit(2); }
// el texto va tal cual (editores.js, datos.js) o ya pasado por T()/lwT() (panel-gastos.js, panel-bancos.js): lwT cae al inglés sin LW_ID y al
// español sin LW_EN, así que el diccionario tiene que tenerlo igual (deploy-axw, 15-oct: «Fecha de la factura» en inglés con la vista en indonesio)
const CAMPO = /[{,](?:label|ayuda|placeholder|texto):(?:(?:T|lwT)\(\s*)?"((?:[^"\\]|\\.)*)"/g;
const OPCIONES = /opciones:\[((?:[^\[\]]|\[(?:[^\[\]"]|"(?:[^"\\]|\\.)*")*\])*)\]/g;
const ENTRE = /"((?:[^"\\]|\\.)*)"/g;
const vistos = new Map();
const apunta = (s, donde) => {
  let t;
  try { t = JSON.parse('"' + s + '"'); } catch (e) { return; }
  t = t.replace(/\s+/g, ' ').trim();
  if (!t || !/[A-Za-zÀ-ÿ]/.test(t) || NO_ES_TEXTO.some(r => r.test(t))) return;
  if (!vistos.has(t)) vistos.set(t, donde);
};
for (const [rel, t] of ficheros) {
  let m;
  while ((m = CAMPO.exec(t))) apunta(m[1], rel);
  while ((m = OPCIONES.exec(t))) {
    const dentro = m[1];
    if (dentro.trim().startsWith('[')) {   // [["valor","Texto"], …]: el texto es el segundo
      const pares = dentro.match(/\["(?:[^"\\]|\\.)*"\s*,\s*"(?:[^"\\]|\\.)*"\]/g) || [];
      for (const p of pares) { const dos = [...p.matchAll(ENTRE)]; if (dos[1]) apunta(dos[1][1], rel); }
    } else for (const x of dentro.matchAll(ENTRE)) apunta(x[1], rel);   // ["Texto", …]: valor y texto a la vez
  }
}
const faltan = {};
for (const [t, donde] of vistos) {
  const sin = idiomas.filter(l => !tiene(l === 'en' ? EN : ID, t));
  if (sin.length) faltan[t] = { donde, en: tiene(EN, t) ? EN[t] : null, id: ID && tiene(ID, t) ? ID[t] : null };
}
const n = Object.keys(faltan).length;
if (JSON_SALIDA) { process.stdout.write(JSON.stringify(faltan, null, 1)); process.exit(n ? 1 : 0); }
for (const [t, f] of Object.entries(faltan).slice(0, 40)) console.log('FALTA ' + (f.en == null ? 'en ' : '   ') + (idiomas.includes('id') && f.id == null ? 'id ' : '   ') + f.donde + ': ' + t.slice(0, 110));
console.log(vistos.size + ' rótulos de editor en ' + ficheros.length + ' ficheros (' + idiomas.join('+') + ')');
console.log(n ? '\n' + n + ' rótulos de editor sin su traducción' : '\nTODO BIEN: todos los rótulos de editor traducidos');
process.exit(n ? 1 : 0);
