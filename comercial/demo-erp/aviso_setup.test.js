// Prueba de la decisión del aviso de setup (aviso_setup.js, F3 Entrega 1, 12-oct-2026): node aviso_setup.test.js
// Contra el doble de Backend: a quién se le enseña la banda, a quién la nota, y a quién nada. El pintado lo mide el arnés en navegador.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const DOBLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'pruebas', 'doble_modulos_setup_estado.json'), 'utf8')).casos;
const win = {}; win.window = win;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'aviso_setup.js'), 'utf8'), win);
const decide = win.AXW_AVISO.decide;

let fallos = 0, total = 0;
function ok(n, c, d) { total++; if (!c) { fallos++; console.log('FALLA: ' + n + (d ? ' — ' + JSON.stringify(d) : '')); } }

let d = decide(DOBLE.sin_configurar, null, '/home/', false);
ok('quien configura, dos módulos sin configurar: una banda con los dos', d && d.tipo === 'banda' && d.modulos.join() === 'facturas,reservas-producto', d);
ok('la banda lleva al asistente del primer módulo pendiente', d && d.destino === '/ajustes/configurar/?modulo=facturas', d);
d = decide(DOBLE.a_medias, null, '/facturas/', false);
ok('a medias: banda con facturas', d && d.tipo === 'banda' && d.modulos.join() === 'facturas', d);
ok('configurado: nada', decide(DOBLE.configurado, null, '/home/', false) === null);
ok('«Ahora no» ya pulsado: nada en esta sesión', decide(DOBLE.sin_configurar, null, '/home/', true) === null);
// owner, 15-oct-2026 («Yo soy superadmin, debería ver el botón»): «Ahora no» esconde la banda, nunca la salida de la pantalla del módulo que falta
d = decide(DOBLE.sin_configurar, 'reservas-producto', '/reservas-producto/', true);
ok('quien configura, tras «Ahora no», en la pantalla de un módulo sin configurar: la nota CON «Configurar» a ese módulo', d && d.tipo === 'nota' && d.modulo === 'reservas-producto' && d.destino === '/ajustes/configurar/?modulo=reservas-producto', d);
ok('quien configura, tras «Ahora no», en un módulo ya configurado: nada', decide(DOBLE.sin_configurar, 'recibos', '/recibos/', true) === null);
ok('en el propio asistente: nada', decide(DOBLE.sin_configurar, null, '/ajustes/configurar/', false) === null);
ok('quien no configura, en la Home: nada', decide(DOBLE.no_configura, null, '/home/', false) === null);
d = decide(DOBLE.no_configura, 'reservas-producto', '/reservas-producto/', false);
ok('quien no configura, en la pantalla de un módulo sin configurar: la nota, SIN botón (no puede) — dice quién lo termina', d && d.tipo === 'nota' && d.modulo === 'reservas-producto' && !d.destino, d);
ok('quien no configura, en un módulo configurado: nada', decide(DOBLE.no_configura, 'recibos', '/recibos/', false) === null);
ok('quien no configura: «Ahora no» no le esconde la nota (no tiene banda)', (decide(DOBLE.no_configura, 'facturas', '/facturas/', true) || {}).tipo === 'nota');
const soloBase = Object.assign({}, DOBLE.configurado, { modulos: [{ modulo: 'base', estado: 'sin_configurar', falta: 'moneda' }, { modulo: 'facturas', estado: 'configurado', falta: null }] });
ok('solo «base» pendiente: lleva a base', (decide(soloBase, null, '/home/', false) || {}).destino === '/ajustes/configurar/?modulo=base');
const conBase = Object.assign({}, DOBLE.sin_configurar, { modulos: [{ modulo: 'base', estado: 'sin_configurar', falta: 'moneda' }].concat(DOBLE.sin_configurar.modulos.slice(1)) });
ok('base y facturas pendientes: lleva a facturas (el asistente pone la moneda delante)', (decide(conBase, null, '/home/', false) || {}).destino === '/ajustes/configurar/?modulo=facturas');
ok('sin datos: nada', decide(null, null, '/home/', false) === null);

console.log((fallos ? 'FALLAN ' + fallos + ' de ' : 'OK ') + total + ' comprobaciones — aviso_setup.test.js');
process.exit(fallos ? 1 : 0);
