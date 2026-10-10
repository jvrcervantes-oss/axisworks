/* Prueba de validar() de red.js: la barrera de privacidad y caducidad de «Actividad del estudio».
 * Uso: node tests/red.test.js  (falla con código 1 si algún caso no da lo esperado).
 * Vive en tests/ y no junto a red.js: assets/ se sirve y un test no tiene llamador en la web
 * (10-oct-2026, «reducir la exposición»; tests/ responde 403 por el .htaccess de la raíz).
 * red.js no expone nada: es esta prueba la que, sobre SU copia del texto, inserta una línea que
 * saca validar() justo antes de aplica(). Si el ancla cambia o deja de ser única, falla aquí en
 * voz alta en vez de probar otra cosa. red.js toca el DOM al cargar; se carga con un DOM mínimo
 * y se ignora el error posterior a validar(). */
var fs = require('fs'), vm = require('vm'), path = require('path');
var ANCLA = '  function aplica(j,now){';
var src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'red.js'), 'utf8');
if (src.split(ANCLA).length !== 2) { console.error('red.test.js: el ancla de aplica() no aparece exactamente una vez en red.js'); process.exit(1); }
src = src.replace(ANCLA, '  __T.validar=validar;\n' + ANCLA);
var el = { getAttribute: function () { return null; }, clientWidth: 1000, style: {}, addEventListener: function () {}, getContext: function () { return null; } };
var win = { __T: {}, matchMedia: null, addEventListener: function () {}, devicePixelRatio: 1, innerHeight: 900 };
var doc = { getElementById: function () { return el; }, documentElement: { lang: 'en' }, addEventListener: function () {}, hidden: false, querySelector: function () { return null; }, createElement: function () { return { getContext: function () { return null; } }; } };
win.window = win; win.document = doc;
try { vm.runInNewContext(src, win); } catch (e) { if (process.env.DEBUG) console.error(String(e.stack).split(String.fromCharCode(10)).slice(0, 3).join(' | ')); }
var validar = win.__T.validar;
if (typeof validar !== 'function') { console.error('validar no quedó expuesta'); process.exit(1); }

var IDS = ['dev','data','bots','arch','deploy','games','models','pilots','design','marketing','comms','security','quality','legal','admin','docs','org'];
var CAT = { dev:'construccion',data:'construccion',bots:'construccion',arch:'construccion',games:'construccion',models:'construccion',pilots:'construccion',design:'diseno',marketing:'captacion',comms:'captacion',docs:'documentacion',legal:'gestion',admin:'gestion',security:'verificacion',quality:'verificacion',deploy:'operacion',org:'operacion' };
var H = 3600000, gen = Date.UTC(2026, 9, 10, 10), iso = function (t) { return new Date(t).toISOString().slice(0, 19) + 'Z'; };
function bueno() {
  return { version: 1, generado: iso(gen), datos_hasta: iso(gen - 2 * H), valido_hasta: iso(gen + 4 * H), retraso_horas: 2, n_departamentos: 17,
    departamentos: IDS.map(function (id) { return { id: id, categoria: CAT[id], estado: 'en_reposo' }; }), coordinacion: { estado: 'en_reposo' } };
}
var now = gen + H, fallos = 0;
function caso(nombre, mut, esperado, ahora) {
  var j = bueno(); if (mut) mut(j);
  var r = validar(j, ahora == null ? now : ahora);
  if (r !== esperado) { fallos++; console.error('FALLA ' + nombre + ': esperaba ' + esperado + ' y dio ' + r); } else console.log('ok   ' + nombre);
}
function dep(j, id) { return j.departamentos.filter(function (d) { return d.id === id; })[0]; }
caso('JSON bueno vale', null, null);
caso('caduca pasadas 4 h', null, 'caducado', gen + 4 * H);
caso('caduca con el reloj adelantado', null, 'caducado', gen + 5 * H);
caso('generado en el futuro', null, 'futuro', gen - 2 * H);
caso('clave extra', function (j) { j.extra = 1; }, 'forma');
caso('__proto__ en el JSON', function (j) { j = j; Object.defineProperty(j, '__proto__', { value: 1, enumerable: true }); }, 'forma');
caso('versión distinta', function (j) { j.version = 2; }, 'version');
caso('hora con minutos', function (j) { j.generado = '2026-10-10T10:30:00Z'; }, 'hora');
caso('30 de febrero', function (j) { j.generado = '2026-02-30T10:00:00Z'; }, 'hora');
caso('validez distinta de 4 h', function (j) { j.valido_hasta = iso(gen + 40 * H); }, 'orden');
caso('estado inventado', function (j) { dep(j, 'dev').estado = 'trabajando_ahora'; }, 'estado');
caso('id desconocido', function (j) { dep(j, 'dev').id = 'constructor'; }, 'id');
caso('id repetido', function (j) { dep(j, 'data').id = 'dev'; }, 'id');
caso('categoría inventada', function (j) { dep(j, 'dev').categoria = 'clientes'; }, 'cat');
caso('reposo con volumen', function (j) { dep(j, 'dev').volumen = 'bajo'; }, 'vol');
caso('activo sin volumen', function (j) { dep(j, 'dev').estado = 'hoy'; }, 'vol');
caso('deploy sensible en última hora', function (j) { var d = dep(j, 'deploy'); d.estado = 'ultima_hora'; d.volumen = 'bajo'; }, 'sensible');
caso('deploy sensible con volumen', function (j) { var d = dep(j, 'deploy'); d.estado = 'hoy'; d.volumen = 'alto'; }, 'sensible');
caso('faltan departamentos', function (j) { j.departamentos.pop(); }, 'n');
caso('coordinación inválida', function (j) { j.coordinacion = { estado: 'hoy' }; }, 'coord');
console.log(fallos ? fallos + ' caso(s) fallan' : 'red.js validar(): todos los casos pasan');
process.exit(fallos ? 1 : 0);
