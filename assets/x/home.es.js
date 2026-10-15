/* GENERADO por tools/web_x/traduce_js.py desde home.js: no se edita a mano. */
/* Lógica de la mesa, copiada del diseño (clase DCLogic del lienzo) y montada con dc.js.
 * Sacada de la mesa C01 (WebHome.dc.html) el 12-oct-2026; desde entonces ESTE fichero es la fuente y se edita a
 * mano. Su versión en español (home.es.js) la genera tools/web_x/traduce_js.py: tras tocar este, regenerarla. */
(function () {
'use strict';
if (!window.XDC || !window.XD) return;
var XD = window.XD;
function DCLogic(props) { this.props = props || {}; this.state = {}; }
class Component extends DCLogic {
constructor(props) {
super(props);
this.state = { t: 0, sel: null };
this.timer = null;
var cells = [], spots = [];
for (var r = 0; r < 19; r++) {
for (var c = 0; c < 20; c++) {
var x = 18 + c * 36, y = 18 + r * 37;
var h = ((c * 73856093) ^ (r * 19349663)) >>> 0;
var k = h % 10;
var dx = x - 360, dy = y - 300, d = Math.sqrt(dx * dx + dy * dy);
var cin = (0.55 + d / 1300).toFixed(2) + 's';
var cls = k < 3 ? 'c1' : k < 5 ? 'c2' : 'c0';
/* delay = entrada de la celda; bd = destello de la ✕ encendida que llevan encima c1 y c2 (ver home.css) */
cells.push({ x: x, y: y, cls: cls, op: Math.max(0.25, 1 - Math.abs(x - 360) / 420).toFixed(2), delay: cin, lit: cls !== 'c0', bd: '-' + ((h % 700) / 100).toFixed(2) + 's' });
if (d > 210 && y > 30 && y < 480 && x > 20 && x < 700) spots.push([x, y]);
}
}
this.cells = cells;
this.spots = spots;
}
componentDidMount() {
var rm = false;
try { rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
var self = this; this.vis = true;
if (window.IntersectionObserver) { var zonas = ['hero', 'activity'].map(function (id) { return document.getElementById(id); }).filter(Boolean); var dentro = {};
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { dentro[e.target.id] = e.isIntersecting; }); self.vis = Object.keys(dentro).some(function (k) { return dentro[k]; }); });
  zonas.forEach(function (z) { io.observe(z); }); }
if (!rm) this.timer = setInterval(() => { if (document.hidden || !self.vis) return; this.setState((s) => ({ t: (s.t || 0) + 1 })); }, 650);
}
componentWillUnmount() { if (this.timer) clearInterval(this.timer); }
event(n) {
var W = [['Frontend', 'montando una página'], ['Backend', 'ajustando datos'], ['Bots', 'afinando un asistente'], ['Agentes autónomos', 'probando un agente'], ['Seguridad', 'revisando un plan'], ['Calidad', 'probando lo publicado'], ['Deploy', 'publicando un cambio'], ['Diseño', 'revisando un diseño'], ['Marketing', 'preparando contenido'], ['Legal', 'revisando un texto'], ['Documentación', 'un documento'], ['Administración', 'preparando una factura'], ['Arquitectura', 'una casa en 3D'], ['Comunicación', 'nota de prensa'], ['Organización', 'repasa la estructura'], ['Videojuegos', 'trabajando en el motor'], ['Modelado 3D', 'una pieza del juego'], ['Revisión previa', 'opinando sobre un plan'], ['Revisor de código', 'sello aprobado'], ['Producto', 'ordenando la hoja de ruta'], ['Experiencia', 'revisando una pantalla'], ['Idiomas', 'revisando una traducción'], ['Costes', 'revisando los costes'], ['Soporte', 'atendiendo a un cliente']];
var a = (n * 2654435761) >>> 0;
var sp = this.spots[a % this.spots.length];
var w = W[(a >>> 7) % W.length];
var dx = 360 - sp[0], dy = 300 - sp[1];
var right = sp[0] < 380;
return { x: sp[0], y: sp[1], len: Math.sqrt(dx * dx + dy * dy).toFixed(1), angle: (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2), lx: right ? sp[0] + 14 : sp[0] - 250, ly: sp[1] - 34, who: w[0], what: w[1], border: (a >>> 3) % 3 === 0 ? '#6F79F5' : '#C8F04A' };
}
rng(seed) {
var a = seed >>> 0;
return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
data() {

return {
rows: [
['ENTRADA', [['brief', 'Encargo', 'p']]],
['DECIDE', [['ceo', 'CEO de IA', 'c']]],
['SUBAGENTES', [['revprev', 'Revisión previa', 's'], ['explore', 'Exploración', 's'], ['plan', 'Plan', 's'], ['encargo', 'Subtarea', 's']]],
['REVISIÓN', [['seguridad', 'Seguridad', 'd'], ['legal', 'Legal', 'd'], ['administracion', 'Administración', 'd'], ['costes', 'Costes', 'd'], ['organizacion', 'Organización', 'd'], ['idiomas', 'Idiomas', 'd']]],
['CONSTRUIR', [['producto', 'Producto', 'd'], ['frontend', 'Frontend', 'd'], ['experiencia', 'Experiencia', 'd'], ['backend', 'Backend', 'd'], ['bots', 'Bots', 'd'], ['pilotos', 'Agentes', 'd']]],
['CREAR', [['diseno', 'Diseño', 'd'], ['arquitectura', 'Arquitectura', 'd'], ['modelado', 'Modelado 3D', 'd'], ['videojuegos', 'Videojuegos', 'd'], ['marketing', 'Marketing', 'd'], ['comunicacion', 'Comunicación', 'd']]],
['PUERTAS', [['calidad', 'Calidad', 'd'], ['basedatos', 'Base de datos', 'd'], ['revisor', 'Revisor de código', 'g'], ['consulta', 'Consulta de deploy', 's'], ['humano', 'Supervisión', 'h']]],
['PUBLICAR · VERIFICAR', [['deploy', 'Deploy', 'd'], ['documentacion', 'Documentación', 'd'], ['verificador', 'Verificador', 's'], ['trampas', 'Planes trampa', 's']]],
['PRODUCTOS', [['aaas', 'AaaS', 'x'], ['erp', 'ERP', 'x'], ['webs', 'Webs', 'x']]],
['SALIDA', [['entrega', 'Entrega', 'p'], ['soporte', 'Soporte', 'd']]]
],
img: {
ceo: '/assets/images/team-pepito.webp', frontend: '/assets/images/dep-dev.webp', backend: '/assets/images/dep-data.webp', bots: '/assets/images/dep-bots.webp',
arquitectura: '/assets/images/dep-arch.webp', deploy: '/assets/images/dep-deploy.webp', videojuegos: '/assets/images/dep-games.webp', modelado: '/assets/images/dep-models.webp',
pilotos: '/assets/images/dep-pilots.webp', diseno: '/assets/images/dep-design.webp', marketing: '/assets/images/dep-marketing.webp', comunicacion: '/assets/images/dep-comms.webp',
seguridad: '/assets/images/dep-security.webp', calidad: '/assets/images/dep-quality.webp', legal: '/assets/images/dep-legal.webp', administracion: '/assets/images/dep-admin.webp',
documentacion: '/assets/images/dep-docs.webp', organizacion: '/assets/images/dep-org.webp', basedatos: '/assets/images/dep-db.webp'
},
desc: {
frontend: 'Lo que el visitante ve y toca: páginas, móvil y accesibilidad.', backend: 'Bases de datos, funciones e integraciones: lo que no se ve.', bots: 'Asistentes de WhatsApp que atienden a los clientes.', pilotos: 'Agentes autónomos que llevan un negocio dentro de límites fijos.',
seguridad: 'Comprueba que todo es seguro antes y después de publicar.', legal: 'Contratos, textos legales y normativa.', administracion: 'La facturación y los impuestos del estudio.', organizacion: 'Cuida la estructura del estudio y retira lo que sobra.',
diseno: 'Dirección de arte, identidad y piezas gráficas.', arquitectura: 'Viviendas en 3D y planos de parcelas a partir de planos y fotos.', modelado: 'Personajes, objetos y escenarios para juegos.', videojuegos: 'El motor y el juego propios del estudio.', marketing: 'Anuncios, SEO y captación de contactos.', comunicacion: 'Notas de prensa y relación con medios.',
calidad: 'Comprueba en la web publicada que lo prometido funciona. Puede frenar una entrega.', basedatos: 'Vigila que cada base esté conectada por su id, bien construida y segura.', deploy: 'Publica el trabajo y mantiene los servicios en marcha.', documentacion: 'Propuestas, informes y entregables en PDF.',
producto: 'Decide qué se construye después en nuestro propio software.', experiencia: 'Hace cómodas de usar las herramientas del día a día.', idiomas: 'Traducción y terminología en español, inglés e indonesio.',
costes: 'Mide y recorta lo que cuesta mantener el estudio.', soporte: 'Alta, formación y soporte de cada cliente tras la entrega.',
erp: 'El producto de gestión de AxisWorks para llevar un negocio: reservas, contratos, facturas y operaciones. Con demo.', aaas: 'Agentes que llevan un negocio dentro de límites fijos (agentes autónomos y Bots).', webs: 'Webs y landings a medida para clientes.',
revprev: 'Subagentes por departamento (de 1 a 3) que revisan el PLAN antes de construir. Cinco por sesión como máximo.', explore: 'Subagente de solo lectura que recorre muchos ficheros y devuelve solo la conclusión.', plan: 'Subagente que diseña el plan de trabajo y sus alternativas.', encargo: 'Un subagente por subtarea, con el contexto justo, comprobado contra su criterio de aceptación.',
consulta: 'Si el revisor lo pide, un subagente por departamento revisa el mismo cambio antes de publicar.', verificador: 'Comprueba en la web publicada que lo publicado hace lo esperado, con pruebas.', trampas: 'Calidad esconde un fallo en un plan para medir si el departamento lo caza.',
brief: 'Lo que pide el cliente, con sus palabras.', ceo: 'Parte cada encargo en tareas y las reparte entre los departamentos.', revisor: 'Revisa el código sin contexto previo antes de publicar; nada sale sin su sello.', humano: 'Precio, publicar, borrar o gastar: decide una persona.', entrega: 'El proyecto llega al cliente. Darlo por entregado lo decide una persona.'
},
work: {
backend: 'ajustando datos', seguridad: 'revisando un plan', calidad: 'probando lo publicado', frontend: 'montando una página', diseno: 'revisando un diseño', deploy: 'publicando un cambio', bots: 'afinando un asistente', legal: 'revisando un texto',
marketing: 'preparando contenido', documentacion: 'un documento', organizacion: 'repasa la estructura', pilotos: 'probando un agente', arquitectura: 'una casa en 3D', modelado: 'una pieza del juego',
videojuegos: 'trabajando en el motor', comunicacion: 'nota de prensa', administracion: 'preparando una factura',
producto: 'ordenando la hoja de ruta', experiencia: 'revisando una pantalla', idiomas: 'revisando una traducción', costes: 'revisando los costes', basedatos: 'auditando una base de datos', soporte: 'atendiendo a un cliente'
},
kinds: { d: 'DEPARTAMENTO DE IA', s: 'SUBAGENTE', p: 'PASO', c: 'CEO de IA', g: 'PUERTA', h: 'PERSONA', x: 'PRODUCTO' },
depts: ['seguridad', 'legal', 'administracion', 'organizacion', 'frontend', 'backend', 'bots', 'pilotos', 'diseno', 'arquitectura', 'modelado', 'videojuegos', 'marketing', 'comunicacion', 'calidad', 'deploy', 'documentacion', 'producto', 'experiencia', 'idiomas', 'costes', 'soporte', 'basedatos']
};
}
activeAt(t, D) {
var r = this.rng(t * 9973 + 17);
var ids = D.depts.slice();
for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp; }
var n = 6 + (t % 4);
var on = {}; var order = ids.slice(0, n);
order.forEach(function (id) { on[id] = true; });
['revprev', 'explore', 'plan', 'encargo', 'consulta', 'verificador', 'trampas'].forEach(function (id) { if (r() < 0.45) on[id] = true; });
on.brief = true; on.ceo = true; on.humano = true;
if (on.frontend || on.backend) on.revisor = true;
if (on.backend) on.erp = true;
if (on.frontend) on.webs = true;
if (on.pilotos || on.bots) on.aaas = true;
if (on.deploy) on.entrega = true;
return { on: on, order: order };
}
diagramVals() {
var self = this;
var st = this.state || {};
var t = Math.floor((st.t || 0) / 3);
var sel = st.sel || null;
var D = this.data();
var A = this.activeAt(t, D);
var on = A.on;
var pos = {}; var kindOf = {}; var nameOf = {};
var rowLabels = [];
D.rows.forEach(function (row, r) {
var y = 40 + r * 76; var list = row[1]; var n = list.length;
rowLabels.push({ label: row[0], top: (y / 7.6) + '%' });
list.forEach(function (nd, i) { pos[nd[0]] = { x: 130 + (i + 0.5) * (870 / n), y: y, r: r }; kindOf[nd[0]] = nd[2]; nameOf[nd[0]] = nd[1]; });
});
var edges = []; var k = 0;
D.rows.forEach(function (row, r) {
if (r === 0) return;
var prev = D.rows[r - 1][1];
row[1].forEach(function (nd) {
var id = nd[0]; var parents;
if (id === 'entrega') parents = ['aaas', 'erp', 'webs'];
else { var best = prev[0][0], bd = 1e9; prev.forEach(function (p) { var d = Math.abs(pos[p[0]].x - pos[id].x); if (d < bd) { bd = d; best = p[0]; } }); parents = [best]; }
parents.forEach(function (pid) {
var a = pos[pid], b = pos[id];
var dx = b.x - a.x, dy = b.y - a.y; var len = Math.sqrt(dx * dx + dy * dy);
var live = !!(on[id] && on[pid]);
edges.push({ left: (a.x / 10) + '%', top: (a.y / 7.6) + '%', width: (len / 10) + '%', angle: (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2), line: live ? 'rgba(200,240,74,.45)' : 'rgba(110,115,145,.28)', dot: live ? '#C8F04A' : 'rgba(169,173,194,.45)', delay: ((k * 0.37) % 2.4).toFixed(2) + 's' });
k++;
});
});
});
var nodes = [];
D.rows.forEach(function (row) {
var n = row[1].length;
row[1].forEach(function (nd) {
var id = nd[0], kind = nd[2], act = !!on[id], isSel = sel === id;
var bg = '#14152A', border = '#2A2D47', fg = '#A9ADC2', shadow = 'none';
if (kind === 'x') { bg = act ? '#2E3BEB' : '#1E2350'; border = act ? '#8C95FF' : '#2E3BEB'; fg = '#F2F3F7'; }
else if (kind === 'h') { border = '#F2F3F7'; fg = '#F2F3F7'; }
else if (kind === 'c') { bg = '#1F2340'; border = '#C8F04A'; fg = '#F2F3F7'; shadow = '0 0 0 4px rgba(200,240,74,.12)'; }
else if (act) { bg = '#1F2340'; border = '#C8F04A'; fg = '#F2F3F7'; shadow = '0 0 16px rgba(200,240,74,.18)'; }
if (isSel) shadow = '0 0 0 2px #F2F3F7';
nodes.push({
name: nd[1], left: (pos[id].x / 10) + '%', top: (pos[id].y / 7.6) + '%', width: (n >= 6 ? 13 : 14.5) + '%',
bg: bg, border: border, fg: fg, shadow: shadow, active: act && kind !== 'h' && kind !== 'x',
hasImg: false, img: '', isMark: kind === 'x' || kind === 'c', isHuman: kind === 'h', isDot: kind !== 'x' && kind !== 'h' && kind !== 'c',
dotColor: act ? '#C8F04A' : '#4A4E66', pressed: isSel ? 'true' : 'false',
pick: function () { self.setState({ sel: id }); }
});
});
});
var log = [];
for (var q = t; q > t - 6 && q >= 0; q--) {
var Aq = q === t ? A : this.activeAt(q, D);
var who = Aq.order[0];
var mins = 9 * 60 + q * 2 + (q % 3);
var hh = Math.floor(mins / 60) % 24, mm = mins % 60;
var time = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
var bajo = function (s) { return s === s.toUpperCase() ? s : s.toLowerCase(); };   // «UX» se queda en mayúsculas
if (q % 3 === 2) log.push({ time: time, who: 'Revisión previa', what: bajo(nameOf[Aq.order[1]]) + ' + ' + bajo(nameOf[Aq.order[2]]) + ' sobre un plan', op: String(1 - (t - q) * 0.13) });
else log.push({ time: time, who: nameOf[who], what: D.work[who], op: String(1 - (t - q) * 0.13) });
}
var layer = function (label, ids) { var c = ids.filter(function (i) { return on[i]; }).length; return { label: label, v: c + '/' + ids.length, w: Math.round(c / ids.length * 100) + '%', title: label + ': ' + c + ' de ' + ids.length + ' resaltados' }; };
// los de cada capa salen de su fila del diagrama (departamentos, puertas y subagentes; la persona no): una lista a mano
// se quedó en 4 cuando las filas pasaron a 6 (15-oct-2026)
var fila = function (tag) { var r = D.rows.filter(function (x) { return x[0] === tag; })[0]; return (r ? r[1] : []).filter(function (nd) { return 'dgs'.indexOf(nd[2]) >= 0; }).map(function (nd) { return nd[0]; }); };
var layers = [
layer('Revisión', fila('REVISIÓN')),
layer('Construir', fila('CONSTRUIR')),
layer('Crear', fila('CREAR')),
layer('Puertas', fila('PUERTAS'))
];
var activeCount = D.depts.filter(function (i) { return on[i]; }).length;
var coordCount = ['revprev', 'explore', 'plan', 'encargo', 'consulta'].filter(function (i) { return on[i]; }).length;
var infoKind = 'CÓMO SE LEE', infoName = 'Pulsa un nodo', infoDesc = 'Cada fila es una fase del proyecto, del encargo a la entrega. Datos de ejemplo, no actividad real.', infoStatus = '';
if (sel) {
var sk = kindOf[sel];
infoKind = D.kinds[sk]; infoName = nameOf[sel]; infoDesc = D.desc[sel] || '';
infoStatus = sk === 'h' ? 'Siempre: decide una persona' : sk === 'c' ? 'Siempre activo · repartiendo' : on[sel] ? (XD.t.highlighted + (D.work[sel] ? ' · ' + D.work[sel] : '')) : 'En espera en esta ilustración';
}
return {
rowLabels: rowLabels, edges: edges, nodes: nodes, log: log, layers: layers,
activeCount: activeCount, coordCount: coordCount,
infoKind: infoKind, infoName: infoName, infoDesc: infoDesc, infoStatus: infoStatus,
lead: XD.t.lead.replace('{A}', activeCount).replace('{T}', D.depts.length)
};
}
renderVals() {
var t = (this.state && this.state.t) || 0;
var pops = [];
for (var k = 0; k < 4; k++) {
var tk = t - (((t - k) % 4) + 4) % 4;
if (tk < 0) tk += 4;
var e = this.event(tk + 11);
var age = t - tk;
var alt = Math.floor(tk / 4) % 2 ? 'A' : 'B';
e.op = String([1, 0.8, 0.5, 0.25][Math.max(0, Math.min(3, age))]);
e.dot = 'dot' + alt; e.line = 'line' + alt; e.tag = 'tag' + alt;
pops.push(e);
}
var briefs = [
{ q: 'Una web de reservas con asistente de WhatsApp', steps: [['CEO de IA', 'parte el encargo en 5 subtareas', 'CEO'], ['Revisión previa', 'opinan seguridad y backend', 'SUBAGENTES'], ['Diseño', 'bocetando la maqueta', 'CRECER'], ['Frontend', 'montando las páginas', 'CONSTRUIR'], ['Bots', 'afinando el asistente de WhatsApp', 'CONSTRUIR'], ['Revisor de código', 'sello aprobado', 'CONSTRUIR'], ['Calidad', 'probando lo publicado', 'CONTROL'], ['Javier', 'dio el visto bueno', 'PERSONA'], ['Entregado', 'a Webs', 'ENTREGADO']] },
{ q: 'Un CRM de contactos que lee solo los formularios de Meta', steps: [['CEO de IA', 'parte el encargo en 4 subtareas', 'CEO'], ['Exploración', 'leyendo el embudo actual', 'SUBAGENTES'], ['Backend', 'conectando los formularios de Meta', 'CONSTRUIR'], ['Diseño', 'revisando el tablero', 'CRECER'], ['Seguridad', 'revisando el acceso a los datos', 'CONTROL'], ['Calidad', 'probando lo publicado', 'CONTROL'], ['Andrea', 'aprobó la interfaz', 'PERSONA'], ['Entregado', 'al ERP', 'ENTREGADO']] },
{ q: 'Facturas que salen de cada hito del contrato', steps: [['CEO de IA', 'parte el encargo en 4 subtareas', 'CEO'], ['Plan', 'escribiendo el plan de trabajo', 'SUBAGENTES'], ['Backend', 'enlazando facturas e hitos', 'CONSTRUIR'], ['Legal', 'revisando el texto de la factura', 'CONTROL'], ['Planes trampa', 'Calidad escondió un fallo y se cazó', 'CONTROL'], ['Javier', 'dio el visto bueno', 'PERSONA'], ['Entregado', 'al ERP', 'ENTREGADO']] }
];
var seq = [];
briefs.forEach(function (b, bi) { seq.push({ bi: bi, s: 0, hold: false }); for (var j = 1; j <= b.steps.length; j++) seq.push({ bi: bi, s: j, hold: false }); seq.push({ bi: bi, s: b.steps.length, hold: true }); });
var step = Math.floor(t / 2);
var cur = seq[step % seq.length];
var b = briefs[cur.bi], s = cur.s, N = b.steps.length;
var TAG = { CEO: ['#C8F04A', '#0B0C1E'], SUBAGENTS: ['#2A3315', '#C8F04A'], BUILD: ['#1E2350', '#8C95FF'], GROW: ['#2A3315', '#C8F04A'], CONTROL: ['#23253D', '#F2F3F7'], PERSON: ['#F2F3F7', '#0B0C1E'], SHIPPED: ['#C8F04A', '#0B0C1E'] };
var shown = b.steps.slice(0, s);
var start = Math.max(0, shown.length - 3);
var rows = shown.slice(start).map(function (st, i) {
var idx = start + i, isCur = idx === s - 1 && !cur.hold;
return { who: st[0], what: st[1], tag: st[2], tagBg: TAG[st[2]][0], tagFg: TAG[st[2]][1], current: isCur, done: !isCur, op: String(isCur ? 1 : 0.5 + 0.2 * i), anim: idx === s - 1 ? (s % 2 ? 'rowA' : 'rowB') : '' };
});
var tag = s > 0 && !cur.hold ? b.steps[s - 1][2] : '';
var pct = Math.round(s / N * 100);
var phase = Math.floor(t / 3);
var dv = this.diagramVals();
return Object.assign(dv, {
cells: this.cells, pops: pops,
showConsole: this.props.showConsole ?? true,
brief: b.q, briefNo: cur.bi + 1, rows: rows, pct: pct, pctW: pct + '%',
pointFill: tag === 'CEO' || tag === 'SUBAGENTES' || tag === 'PERSONA' ? '#C8F04A' : '#F2F3F7',
active: dv.activeCount, coord: dv.coordCount,
numAnim: phase % 2 ? 'numA' : 'numB'
});
}
}
var raiz = document.getElementById('xroot');
if (raiz) window.XDC.monta(raiz, new Component({}));
})();
