/* Lógica de la mesa, copiada del diseño (clase DCLogic del lienzo) y montada con dc.js.
 * GENERADO por convierte/gen_js.py desde WebAgents.dc.html: no se edita a mano. */
(function () {
'use strict';
if (!window.XDC) return;
function DCLogic(props) { this.props = props || {}; this.state = {}; }
class Component extends DCLogic {
constructor(props) { super(props); this.state = { t: 3, decided: {}, sel: null }; this.timer = null; }
componentDidMount() {
var rm = false;
try { rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
if (!rm) this.timer = setInterval(() => this.setState((s) => ({ t: (s.t || 0) + 1 })), 1600);
}
componentWillUnmount() { if (this.timer) clearInterval(this.timer); }
ring() {
return [["reception", "Reception", "M4 5h16v11H9l-5 4V5z"], ["radar", "Radar", "M21 12a9 9 0 1 1-9-9M17 12a5 5 0 1 1-5-5M12 12l7-7"], ["figures", "Figures", "M5 20v-8M12 20V5M19 20v-5M3 20h18"], ["hook", "Hook", "M6 4v7a6 6 0 0 0 12 0V4M6 8h4M14 8h4"], ["quill", "Quill", "M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3"], ["listener", "Listener", "M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"], ["route", "Route", "M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"], ["treasurer", "Treasurer", "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3M12 15v2"]];
}
events() {
return [
['reception', 'Reception', 'answered a customer on WhatsApp', null],
['radar', 'Radar', 'read this week’s competitor prices, read-only', null],
['hook', 'Hook', 'proposes a new ad campaign within this month’s cap', 'SPENDING'],
['figures', 'Figures', 'reported last week’s bookings', null],
['listener', 'Listener', 'grouped this week’s complaints by topic', null],
['quill', 'Quill', 'proposes publishing a new landing page', 'PUBLISHING'],
['route', 'Route', 'checked today’s bookings against availability', null],
['treasurer', 'Treasurer', 'checked spending against the monthly cap', null],
['captain', 'Captain', 'proposes a weekday discount of 5%', 'PRICE'],
['reception', 'Reception', 'handed a conversation to a person', null],
['hook', 'Hook', 'found new leads in the allowed channels', null],
['route', 'Route', 'proposes deleting duplicate bookings', 'DELETING'],
['figures', 'Figures', 'measured last month’s bet', null],
['reception', 'Reception', 'proposes sending a guest list to a supplier', 'SENDING TO A THIRD PARTY']
];
}
decide(id, v) { var d = Object.assign({}, (this.state && this.state.decided) || {}); d[id] = v; this.setState({ decided: d }); }
renderVals() {
var self = this;
var st = this.state || {};
var t = st.t || 0;
var EV = this.events(), N = EV.length;
var cur = EV[t % N];
var alt = t % 2 ? 'A' : 'B';
var C = 290, R = 225;
var ring = this.ring();
var nodes = [], spokes = [];
ring.forEach(function (a, i) {
var ang = (-90 + i * 45) * Math.PI / 180;
var x = C + R * Math.cos(ang), y = C + R * Math.sin(ang);
var on = cur[0] === a[0];
nodes.push({ x: x.toFixed(1) + 'px', y: y.toFixed(1) + 'px', name: a[1], d: a[2], delay: (0.5 + i * 0.06).toFixed(2) + 's', border: on ? '#C8F04A' : '#2A2D47', bg: on ? '#1F2340' : '#14152A', fg: on ? '#C8F04A' : '#C9CCDB', label: on ? '#F2F3F7' : '#A9ADC2', halo: on ? 'halo' + alt : '' });
spokes.push({ x: x.toFixed(1) + 'px', y: y.toFixed(1) + 'px', w: (R - 80) + 'px', angle: (ang * 180 / Math.PI + 180).toFixed(1), line: on ? 'rgba(200,240,74,.55)' : 'rgba(110,115,145,.22)', on: on, anim: 'spk' + alt });
});
var log = [];
for (var q = t; q > t - 4 && q >= 0; q--) {
var e = EV[q % N];
var mins = 8 * 60 + 12 + q * 7;
var hh = Math.floor(mins / 60) % 24, mm = mins % 60;
log.push({ time: (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm, who: e[1], what: e[2], stop: !!e[3], stopName: e[3] ? 'WAITS FOR A PERSON' : '', op: String(1 - (t - q) * 0.2), anim: q === t ? 'row' + alt : '' });
}
var pid = -1;
for (var k = t; k > t - N && k >= 0; k--) { if (EV[k % N][3]) { pid = k; break; } }
var pe = EV[(pid < 0 ? 2 : pid) % N];
var dv = (st.decided || {})[pid];
var dec = {
anim: '',
stop: pe[3], who: pe[1], what: pe[2] + '.', open: !dv,
status: dv === 'ok' ? 'Approved by the owner. Logged in the ERP.' : dv === 'no' ? 'Rejected. Kept as a lesson for the next bet.' : 'Waiting for the owner. The agent does not act on its own.',
statusColor: dv ? '#2E3BEB' : '#4A4E66',
approve: function () { self.decide(pid, 'ok'); },
reject: function () { self.decide(pid, 'no'); }
};
var nStops = 0; for (var z = 0; z <= pid; z++) { if (EV[z % N][3]) nStops++; }
dec.anim = nStops % 2 ? 'decA' : 'decB';
var decidedCount = Object.keys(st.decided || {}).length;
var STEPS = [
['The owner writes the brief', 'Mission, context, spending cap, permissions and which functions the agent may run. The agent can read this file and can never write it.'],
['The agent proposes bets', 'Every decision carries a hypothesis, a measure, a deadline and a cost. It proposes changes to the ERP; it does not make them.'],
['A person approves what matters', 'What touches a hard stop waits for a person. Everything the agent does is recorded in the business’s ERP, and anything not recorded there counts as not done.'],
['What works becomes routine', 'A bet that works becomes code that runs by itself; one that does not is dropped and kept as a lesson. After 14 days without progress it changes strategy; after two failed cycles it escalates to the owner with options.']
];
var curStep = st.sel != null ? st.sel : Math.floor(t / 2) % 4;
var steps = STEPS.map(function (s, i) {
var on = i === curStep, done = i < curStep;
return { n: '0' + (i + 1), h: s[0], p: s[1], pressed: on ? 'true' : 'false', ring: on || done ? '#C8F04A' : '#2A2D47', dot: on ? '#C8F04A' : '#0B0C1E', num: on ? '#0B0C1E' : done ? '#C8F04A' : '#A9ADC2', bg: on ? '#1A1C33' : '#10112A', border: on ? '#C8F04A' : '#23253D', op: on ? '1' : '0.6', pick: function () { self.setState({ sel: i }); } };
});
var STOPS = [['PRICE', 'Price', 'Captain'], ['PUBLISHING', 'Publishing', 'Quill'], ['DELETING', 'Deleting', 'Route'], ['SPENDING', 'Spending', 'Hook'], ['SENDING TO A THIRD PARTY', 'Sending to a third party', 'Reception']];
var hit = t % 5;
var stops = STOPS.map(function (s, i) {
var on = i === hit;
return { n: '0' + (i + 1), name: s[1], bg: on ? '#F2F3F7' : 'rgba(11,12,30,.22)', fg: on ? '#0B0C1E' : '#F2F3F7', border: on ? '#C8F04A' : 'rgba(242,243,247,.25)', anim: on ? 'hit' + alt : '', tryAnim: on ? 'try' + alt : '', attempt: on ? s[2].toUpperCase() + ' TRIED · WAITS FOR A PERSON' : 'RESERVED FOR A PERSON' };
});
return {
nodes: nodes, spokes: spokes, log: log, dec: dec, decidedCount: decidedCount,
ptAnim: 'pt' + alt, capColor: cur[0] === 'captain' ? '#C8F04A' : '#A9ADC2',
steps: steps, progW: (curStep / 3 * 100) + '%', stops: stops
};
}
}
var raiz = document.getElementById('xroot');
if (raiz) window.XDC.monta(raiz, new Component({}));
})();
