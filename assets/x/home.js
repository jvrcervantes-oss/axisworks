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
var W = [['Frontend', 'building a page'], ['Backend', 'adjusting a database'], ['Bots', 'tuning an assistant'], ['Pilots', 'running an agent'], ['Security', 'reviewing a plan'], ['Quality', 'verifying in production'], ['Deploy', 'publishing a change'], ['Design', 'reviewing a design'], ['Marketing', 'preparing content'], ['Legal', 'reviewing a text'], ['Docs', 'preparing a document'], ['Admin', 'preparing an invoice'], ['Architecture', 'modelling a home in 3D'], ['Comms', 'drafting a press note'], ['Organisation', 'reviewing the structure'], ['Games', 'working on the engine'], ['Game 3D', 'modelling a game asset'], ['Pre-review', 'weighing in on a plan'], ['Code reviewer', 'seal approved'], ['Product', 'ordering the roadmap'], ['UX', 'reviewing a screen'], ['Languages', 'reviewing a translation'], ['Costs', 'reviewing running costs'], ['Support', 'helping a client']];
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
['INPUT', [['brief', 'Request', 'p']]],
['DECIDE', [['ceo', 'AI CEO', 'c']]],
['SPAWNED', [['revprev', 'Pre-review', 's'], ['explore', 'Exploration', 's'], ['plan', 'Planning', 's'], ['encargo', 'Subtask', 's']]],
['REVIEW', [['seguridad', 'Security', 'd'], ['legal', 'Legal', 'd'], ['administracion', 'Admin', 'd'], ['costes', 'Costs', 'd'], ['organizacion', 'Organisation', 'd'], ['idiomas', 'Languages', 'd']]],
['BUILD', [['producto', 'Product', 'd'], ['frontend', 'Frontend', 'd'], ['experiencia', 'UX', 'd'], ['backend', 'Backend', 'd'], ['bots', 'Bots', 'd'], ['pilotos', 'Pilots', 'd']]],
['CREATE', [['diseno', 'Design', 'd'], ['arquitectura', 'Architecture', 'd'], ['modelado', '3D Modeling', 'd'], ['videojuegos', 'Games', 'd'], ['marketing', 'Marketing', 'd'], ['comunicacion', 'Comms', 'd']]],
['GATES', [['calidad', 'Quality', 'd'], ['revisor', 'Code reviewer', 'g'], ['consulta', 'Deploy consult', 's'], ['humano', 'Oversight', 'h']]],
['PUBLISH · VERIFY', [['deploy', 'Deploy', 'd'], ['documentacion', 'Docs', 'd'], ['verificador', 'Verifier', 's'], ['trampas', 'Trap plans', 's']]],
['PRODUCTS', [['aaas', 'AaaS', 'x'], ['erp', 'ERP', 'x'], ['webs', 'Websites', 'x']]],
['OUTPUT', [['entrega', 'Delivery', 'p'], ['soporte', 'Support', 'd']]]
],
img: {
ceo: '/assets/images/team-pepito.webp', frontend: '/assets/images/dep-dev.webp', backend: '/assets/images/dep-data.webp', bots: '/assets/images/dep-bots.webp',
arquitectura: '/assets/images/dep-arch.webp', deploy: '/assets/images/dep-deploy.webp', videojuegos: '/assets/images/dep-games.webp', modelado: '/assets/images/dep-models.webp',
pilotos: '/assets/images/dep-pilots.webp', diseno: '/assets/images/dep-design.webp', marketing: '/assets/images/dep-marketing.webp', comunicacion: '/assets/images/dep-comms.webp',
seguridad: '/assets/images/dep-security.webp', calidad: '/assets/images/dep-quality.webp', legal: '/assets/images/dep-legal.webp', administracion: '/assets/images/dep-admin.webp',
documentacion: '/assets/images/dep-docs.webp', organizacion: '/assets/images/dep-org.webp'
},
desc: {
frontend: 'What the visitor sees and touches: pages, mobile and accessibility.', backend: 'Databases, functions and integrations: what you do not see.', bots: 'WhatsApp assistants that serve customers.', pilotos: 'Autonomous agents that run a business within hard limits.',
seguridad: 'Checks that everything is secure before and after publishing.', legal: 'Contracts, legal texts and regulation.', administracion: 'The studio’s invoicing and tax.', organizacion: 'Looks after the studio’s structure and retires what is not needed.',
diseno: 'Art direction, identity and graphic pieces.', arquitectura: '3D homes and plot maps from plans and photos.', modelado: 'Characters, props and environments for games.', videojuegos: 'The studio’s own engine and game.', marketing: 'Ads, SEO and lead generation.', comunicacion: 'Press releases and media relations.',
calidad: 'Checks in production that what was promised really works. Can block a delivery.', deploy: 'Takes work to production and keeps services running.', documentacion: 'Proposals, reports and deliverables in PDF.',
producto: 'Decides what gets built next in our own software.', experiencia: 'Makes everyday tools comfortable to use.', idiomas: 'Translation and terminology in Spanish, English and Indonesian.',
costes: 'Measures and trims what the studio spends to run.', soporte: 'Onboarding, training and support for each client after delivery.',
erp: 'AxisWorks’ management product to run a business: bookings, contracts, invoices and operations. Demo available.', aaas: 'Agents that run a business within hard limits (Pilots and Bots).', webs: 'Custom websites and landing pages for customers.',
revprev: 'Subagents per department (1 to 3) that review the PLAN before building. Budget of 5 per session.', explore: 'Read-only subagent that sweeps many files and returns only the conclusion.', plan: 'Subagent that designs the implementation plan and its alternatives.', encargo: 'One subagent per subtask, with minimal context, verified against its acceptance criteria.',
consulta: 'If the reviewer asks, one subagent per department reviews the same diff before publishing.', verificador: 'Checks in production that what was published does what is expected, with proof.', trampas: 'Quality hides a flaw in a plan to measure whether a department catches it.',
brief: 'What the customer asks for, in their own words.', ceo: 'Splits each request into tasks and assigns them to departments.', revisor: 'Reviews code with a clean context before publishing; nothing ships without its seal.', humano: 'Price, publish, delete or spend: a person decides.', entrega: 'The project reaches the customer. Marking it as delivered is a person’s decision.'
},
work: {
backend: 'adjusting a database', seguridad: 'reviewing a plan', calidad: 'verifying in production', frontend: 'building a page', diseno: 'reviewing a design', deploy: 'publishing a change', bots: 'tuning an assistant', legal: 'reviewing a text',
marketing: 'preparing content', documentacion: 'preparing a document', organizacion: 'reviewing the structure', pilotos: 'running an agent', arquitectura: 'modelling a home in 3D', modelado: 'modelling a game asset',
videojuegos: 'working on the engine', comunicacion: 'drafting a press note', administracion: 'preparing an invoice',
producto: 'ordering the roadmap', experiencia: 'reviewing a screen', idiomas: 'reviewing a translation', costes: 'reviewing running costs', soporte: 'helping a client'
},
kinds: { d: 'AI DEPARTMENT', s: 'SUBAGENT', p: 'STEP', c: 'AI CEO', g: 'GATE', h: 'HUMAN', x: 'PRODUCT' },
depts: ['seguridad', 'legal', 'administracion', 'organizacion', 'frontend', 'backend', 'bots', 'pilotos', 'diseno', 'arquitectura', 'modelado', 'videojuegos', 'marketing', 'comunicacion', 'calidad', 'deploy', 'documentacion', 'producto', 'experiencia', 'idiomas', 'costes', 'soporte']
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
if (q % 3 === 2) log.push({ time: time, who: 'Pre-review', what: bajo(nameOf[Aq.order[1]]) + ' + ' + bajo(nameOf[Aq.order[2]]) + ' on a plan', op: String(1 - (t - q) * 0.13) });
else log.push({ time: time, who: nameOf[who], what: D.work[who], op: String(1 - (t - q) * 0.13) });
}
var layer = function (label, ids) { var c = ids.filter(function (i) { return on[i]; }).length; return { label: label, v: c + '/' + ids.length, w: Math.round(c / ids.length * 100) + '%', title: label + ': ' + c + ' of ' + ids.length + ' highlighted' }; };
// los de cada capa salen de su fila del diagrama (departamentos, puertas y subagentes; la persona no): una lista a mano
// se quedó en 4 cuando las filas pasaron a 6 (15-oct-2026)
var fila = function (tag) { var r = D.rows.filter(function (x) { return x[0] === tag; })[0]; return (r ? r[1] : []).filter(function (nd) { return 'dgs'.indexOf(nd[2]) >= 0; }).map(function (nd) { return nd[0]; }); };
var layers = [
layer('Review', fila('REVIEW')),
layer('Build', fila('BUILD')),
layer('Create', fila('CREATE')),
layer('Gates', fila('GATES'))
];
var activeCount = D.depts.filter(function (i) { return on[i]; }).length;
var coordCount = ['revprev', 'explore', 'plan', 'encargo', 'consulta'].filter(function (i) { return on[i]; }).length;
var infoKind = 'HOW TO READ IT', infoName = 'Click a node', infoDesc = 'Each row is a stage of a project, from the request to the delivery. Sample data, not live activity.', infoStatus = '';
if (sel) {
var sk = kindOf[sel];
infoKind = D.kinds[sk]; infoName = nameOf[sel]; infoDesc = D.desc[sel] || '';
infoStatus = sk === 'h' ? 'Always: a person decides' : sk === 'c' ? 'Always on · dispatching' : on[sel] ? (XD.t.highlighted + (D.work[sel] ? ' · ' + D.work[sel] : '')) : 'Idle in this illustration';
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
{ q: 'A booking site with a WhatsApp assistant', steps: [['AI CEO', 'split the brief into 5 subtasks', 'CEO'], ['Pre-review', 'security and backend weigh in', 'SUBAGENTS'], ['Design', 'drafting the layout', 'GROW'], ['Frontend', 'building the pages', 'BUILD'], ['Bots', 'tuning the WhatsApp assistant', 'BUILD'], ['Code reviewer', 'seal approved', 'BUILD'], ['Quality', 'verifying in production', 'CONTROL'], ['Javier', 'signed off', 'PERSON'], ['Shipped', 'to Websites', 'SHIPPED']] },
{ q: 'A lead CRM that reads Meta lead forms on its own', steps: [['AI CEO', 'split the brief into 4 subtasks', 'CEO'], ['Exploration', 'reading the existing pipeline', 'SUBAGENTS'], ['Backend', 'connecting the Meta lead forms', 'BUILD'], ['Design', 'reviewing the board', 'GROW'], ['Security', 'reviewing data access', 'CONTROL'], ['Quality', 'verifying in production', 'CONTROL'], ['Andrea', 'approved the interface', 'PERSON'], ['Shipped', 'to the ERP', 'SHIPPED']] },
{ q: 'Invoices generated from each contract milestone', steps: [['AI CEO', 'split the brief into 4 subtasks', 'CEO'], ['Planning', 'drafting the implementation plan', 'SUBAGENTS'], ['Backend', 'linking invoices to milestones', 'BUILD'], ['Legal', 'reviewing the invoice text', 'CONTROL'], ['Trap plans', 'Quality hid a flaw; it was caught', 'CONTROL'], ['Javier', 'signed off', 'PERSON'], ['Shipped', 'to the ERP', 'SHIPPED']] }
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
pointFill: tag === 'CEO' || tag === 'SUBAGENTS' || tag === 'PERSON' ? '#C8F04A' : '#F2F3F7',
active: dv.activeCount, coord: dv.coordCount,
numAnim: phase % 2 ? 'numA' : 'numB'
});
}
}
var raiz = document.getElementById('xroot');
if (raiz) window.XDC.monta(raiz, new Component({}));
})();
