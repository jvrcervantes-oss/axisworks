// node rotulos_build.test.js — los rótulos FIJOS que build.py pone en el HTML de una instancia (data-lwt) tienen su inglés y su indonesio en los
// diccionarios que ya están cuando la página traduce el HTML: el LW_EN de i18n.js de Lawang, i18n_id.json y MENU_I18N (que build.py pega al final de
// i18n.js). Por qué (agencia-81, 12-oct, en la pestaña del owner en inglés): la pestaña «Cobros en línea» salía en español porque su traducción solo
// llegaba con setup_modulos.js, que carga después; el resto de pestañas salían en inglés. Un mapa de pantalla NO cuenta para un rótulo del HTML.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const AQUI = __dirname;
// las cadenas de Python partidas en varias líneas ('…>'\n   'Texto</button>') se juntan antes de buscar los rótulos
const BUILD = fs.readFileSync(path.join(AQUI, 'build.py'), 'utf8').replace(/'\s*\n\s*'/g, '');
const ID = JSON.parse(fs.readFileSync(path.join(AQUI, 'i18n_id.json'), 'utf8'));
let fallos = 0, total = 0;
const ok = (n, c, d) => { total++; if (!c) { fallos++; console.log('FALLA: ' + n + (d ? ' — ' + d : '')); } };

// MENU_I18N de build.py (un dict de Python con cadenas entre comillas simples: se lee como objeto de JS quitando los comentarios)
const m = BUILD.match(/^MENU_I18N = (\{[\s\S]*?\n\})/m);
ok('build.py trae MENU_I18N', !!m);
const MENU = m ? vm.runInNewContext('(' + m[1].split('\n').filter(l => !/^\s*#/.test(l)).join('\n') + ')', {}) : {};

// El LW_EN de Lawang (contracts/assets/i18n.js), cargado como lo carga el navegador
const lawang = process.env.AXW_LAWANG_RAIZ || (process.env.AXW_AGENCIA_RAIZ ? path.join(process.env.AXW_AGENCIA_RAIZ, 'proyectos', 'Lawang') : path.join(AQUI, '..', '..', '..', 'Lawang'));
const i18n = path.join(lawang, 'contracts', 'assets', 'i18n.js');
let EN = null;
if (fs.existsSync(i18n)) {
  const win = { console: { warn() {}, log() {} }, addEventListener() {}, localStorage: { getItem() { return null; }, setItem() {} }, navigator: { language: 'es' }, location: { pathname: '/' },
    document: { readyState: 'complete', addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; }, getElementById() { return null; }, documentElement: { setAttribute() {}, lang: 'es' } } };
  win.window = win;
  try { vm.runInNewContext(fs.readFileSync(i18n, 'utf8'), win); EN = win.LW_EN || null; } catch (e) { ok('i18n.js de Lawang carga', false, e.message); }
}
if (!EN) {
  if (process.env.AXW_SIN_AGENCIA === '1') console.log('AVISO: sin el i18n.js de Lawang (' + i18n + '): el inglés solo se mira en MENU_I18N');
  else ok('el i18n.js de Lawang existe (AXW_LAWANG_RAIZ o AXW_AGENCIA_RAIZ)', false, i18n);
}

// Los rótulos: todo texto entre `data-lwt…>` y `<` en las cadenas de build.py, y los sustitutos de textos_instancia() que llevan data-lwt
const rotulos = new Set();
for (const x of BUILD.matchAll(/data-lwt(?:="[^"]*")?[^>]*>([^<]+)</g)) rotulos.add(x[1]);
for (const r of rotulos) {
  const en = (EN && Object.prototype.hasOwnProperty.call(EN, r)) || (MENU[r] && MENU[r].en);
  const id = Object.prototype.hasOwnProperty.call(ID, r) || (MENU[r] && MENU[r].id);
  ok('inglés de «' + r + '» antes de traducir el HTML', !!en);
  ok('indonesio de «' + r + '» antes de traducir el HTML', !!id);
}
console.log((fallos ? 'FALLAN ' + fallos + ' de ' : 'OK ') + total + ' comprobaciones (' + rotulos.size + ' rótulos fijos de build.py) — rotulos_build.test.js');
process.exit(fallos ? 1 : 0);
