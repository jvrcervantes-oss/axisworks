// node comercial/demo-erp/pruebas/agente.harness.cjs [captura_prefijo]
// Harness de la VENTANA DEL AaaS (EP.5, 13-oct-2026): el agente.html REAL (marcado + script, con las ayudas comunes pegadas como hace build.py) en Chromium, con la base y la sesión
// SIMULADAS (page.exposeFunction): una base en memoria que imita el CONTRATO de agente_forma.json (la misma forma que valida la prueba SQL de la agencia). Mide el COMPORTAMIENTO:
// qué pide y con qué argumentos, qué pinta con cada respuesta y para cada quien (dueño, con la herramienta, sin ella, módulo apagado, respuesta null del interruptor), que nunca
// calla un trabajo (sin datos / sin pasada), XSS en nombres y propuestas, idiomas es/en/id sin cadenas sin traducir, y que a 390 y 1440 px no hay scroll horizontal.
// 390 px de VERDAD: el contexto de Playwright fija el viewport (no es Edge headless, que no baja de ~480).
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const COMUN_JS = fs.readFileSync(path.join(__dirname, '..', '_compartido', 'pantalla_comun.js'), 'utf8').trim();
const COMUN_CSS = fs.readFileSync(path.join(__dirname, '..', '_compartido', 'pantalla_comun.css'), 'utf8').trim();
const FUENTE = fs.readFileSync(path.join(__dirname, '..', 'agente.html'), 'utf8');
const FORMA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'agente_forma.json'), 'utf8'));
const [MARCADO0, SCRIPT0] = FUENTE.split('<!--AXW_SCRIPT-->');
const MARCADO = MARCADO0.split('/*AXW_COMUN_CSS*/').join(COMUN_CSS);
const SCRIPT = SCRIPT0.split('/*AXW_COMUN_JS*/').join(COMUN_JS);
const SHOT = process.argv[2];
let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' -> ' + extra : '')); } else console.log('ok     ' + nombre); };
const J = x => JSON.stringify(x);

const XSS = `<img src=x onerror="window.__xss=1"> 'q' "d"`;
const U = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const HOY = '2026-10-14';
const iso = h => '2026-10-14T' + String(h).padStart(2, '0') + ':05:00+08:00';
const AHORA = Date.now();
const en = h => new Date(AHORA + h * 3600e3).toISOString();   // caducidad de las acciones: relativa a AHORA (la pantalla compara con Date.now())
const clon = x => JSON.parse(JSON.stringify(x));
// El rótulo de cada módulo, como lo deja la capa de módulos en guard.js (build.py: mapa['n'] = {k: [nombre, qué hace]}) desde la MISMA fuente.
const ROTULOS = (() => { const r = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'modulos_rotulos.json'), 'utf8')); const n = {};
  Object.keys(r).filter(k => !k.startsWith('_') && k !== 'base').forEach(k => { n[k] = [r[k][0], r[k][3]]; }); return n; })();
// Claves del contrato (fuente única): el doble devuelve EXACTAMENTE estas, y un cambio en la forma rompe el doble y no solo la base.
const CLAVES_ESTADO = Object.keys(FORMA.lecturas.agente_panel_estado.devuelve).sort();
const CLAVES_NOTAS = Object.keys(FORMA.lecturas.agente_notas_datos.devuelve).sort();
const CLAVES_ACCION = [...new Set((FORMA.lecturas.agente_notas_datos.devuelve.acciones.replace(/datos: \{[^}]*\}/, 'datos: x').match(/[[{,]\s*([a-z_]+):/g) || []).map(x => x.replace(/[[{,:\s]/g, '')))].sort();

/* Una base con la forma de agente_forma.json. o: dueno, herramienta, apagado, nulo (el interruptor del navegador contesta null), sinDatos, xss, pausa, sinNotas, freno,
   orden (trabajos_orden), sinAcciones / limitesRaros / sinContexto / sinHistorial (falta esa parte), dePago / otroTipo (rechazos de A13), anulaDatos, moduloFuera, sumaTopes, lento */
function nuevaBase(o = {}) {
  const orden = o.orden || FORMA.trabajos;
  const trabajos = {}; orden.forEach(t => { trabajos[t] = true; });
  const s = { o, orden, llamadas: [], encendido: !o.apagado, parado: !!o.pausa, nivel: 1, tope: o.tope0 ? 0 : 3700, propuesto: o.propuesto ? 5000 : null, trabajos, decisiones: {}, propDec: {},
    limites: [
      { modulo: 'reservas-producto', nivel: 1, nivel_efectivo: 1, tope_cent: null },
      { modulo: 'facturas', nivel: 2, nivel_efectivo: 0, tope_cent: 1500 },     // se apagó después de guardarlo: no vale hasta volver a guardar
      { modulo: 'modulo-sin-rotulo', nivel: 0, nivel_efectivo: 0, tope_cent: null }   // sin fila en modulos_rotulos.json: se enseña su id
    ],
    fuera: [{ modulo: 'obra', nivel: 2 }],
    contexto: { quien: 'Alquiler de motos en Canggu', reglas: ['Nunca prometer una entrega antes de las 9'], tono: 'Cercano' },
    historial: [
      { cuando: iso(9), quien: 'USR-00001', campos: ['niveles', 'topes_cent', 'niveles_en'], motivo: o.xss ? XSS : 'Primeros límites' },
      { cuando: iso(9), quien: 'USR-00001', campos: [], motivo: o.xss ? XSS : 'Primeros límites' },   // la gemela sin campos que deja la base en un mismo guardado
      { cuando: iso(8), quien: 'estudio', campos: ['tope_mensual_cent', 'tope_propuesto_cent', 'tope_propuesto_desde'], motivo: null },
      { cuando: iso(7), quien: null, campos: ['campo_raro'], motivo: 'Prueba' },
      { cuando: iso(6), quien: 'USR-00002', campos: [], motivo: 'No cambia nada' }
    ],
    acciones: [
      { id: 101, accion: 'aviso_reserva', modulo: 'reservas-producto', datos: { reserva: U(500), motivo: 'unidad_en_taller', trabajo: 'salidas' }, estado: 'pendiente', motivo: null, creada_en: en(-5), expira_en: en(72), decidida_en: null, decidida_por: null },
      { id: 102, accion: 'aviso_reserva', modulo: 'reservas-producto', datos: { reserva: U(501), motivo: 'unidad_doble', trabajo: 'salidas' }, estado: 'pendiente', motivo: null, creada_en: en(-4), expira_en: en(48), decidida_en: null, decidida_por: null },
      { id: 103, accion: 'aviso_reserva', modulo: 'reservas-producto', datos: { reserva: U(502), motivo: 'unidad_de_baja', trabajo: 'salidas' }, estado: 'pendiente', motivo: null, creada_en: en(-200), expira_en: en(-1), decidida_en: null, decidida_por: null },
      { id: 104, accion: 'otra_accion', modulo: 'facturas', datos: {}, estado: 'anulada', motivo: 'datos', creada_en: en(-100), expira_en: en(68), decidida_en: en(-90), decidida_por: 'USR-00001' },
      { id: 105, accion: 'aviso_reserva', modulo: 'reservas-producto', datos: { reserva: U(502), motivo: 'unidad_de_baja', trabajo: 'salidas' }, estado: 'aceptada', motivo: null, creada_en: en(-50), expira_en: en(118), decidida_en: en(-40), decidida_por: 'USR-00001' }
    ] };
  if (o.sinDatos) { s.acciones = []; s.historial = []; s.contexto = {}; }
  return s;
}
const nivelDe = (s, m) => { const l = s.limites.find(x => x.modulo === m); return l ? l.nivel_efectivo : 0; };
function notas(s) {
  const o = s.o;
  if (o.sinNotas) return [];
  if (o.sinDatos) return FORMA.trabajos.filter(t => t !== 'flota').map((t, i) => ({ id: i + 1, trabajo: t, pasada: 'manana', estado: 'sin_datos', cifras: {}, items: [], mas: 0, creada_en: iso(7) }))
    .concat([{ id: 50, trabajo: 'flota', pasada: 'manana', estado: 'avisos', cifras: { unidades: 190, disponibles: 96, en_taller: 94, de_baja: 0, taller_sin_orden: 94, taller_largo: 0, tarifas_raras: 0 },
      items: Array.from({ length: 30 }, (_, i) => ({ tipo: 'taller_sin_orden', unidad: U(i + 1) })), mas: 64, creada_en: iso(7) }]);
  const n = [
    { id: 1, trabajo: 'flota', pasada: 'manana', estado: 'avisos', cifras: { unidades: 15, disponibles: 10, en_taller: 4, de_baja: 1, taller_sin_orden: 2, taller_largo: 1, tarifas_raras: 1 },
      items: [{ tipo: 'taller_sin_orden', unidad: U(1) }, { tipo: 'taller_sin_orden', unidad: U(2) }, { tipo: 'taller_largo', unidad: U(3), dias: 41 }, { tipo: 'tarifa', modelo: U(900), motivo: 'largo_mas_caro_por_dia' }], mas: 0, creada_en: iso(7) },
    { id: 2, trabajo: 'salidas', pasada: 'manana', estado: 'avisos', cifras: { salidas: 6, recogidas: 4, sin_unidad: 2, unidad_en_taller: 1, unidad_de_baja: 0, unidad_doble: 0, entrega_sin_km: 0 },
      items: [{ tipo: 'sin_unidad', n: 2 }, { tipo: 'unidad_en_taller', n: 1 }], mas: 0, creada_en: iso(7) },
    { id: 3, trabajo: 'vueltas', pasada: 'manana', estado: 'avisos', cifras: { tarde: 2, tarde_max_dias: 3, salida_sin_registrar: 0 }, items: [{ tipo: 'tarde', n: 2 }], mas: 0, creada_en: iso(7) },
    { id: 4, trabajo: 'bloqueos', pasada: 'manana', estado: 'nada', cifras: { bloqueos_abiertos: 1, caducan_24h: 0, caducan_ultima_libre: 0 }, items: [], mas: 0, creada_en: iso(7) },
    { id: 5, trabajo: 'cobros', pasada: 'manana', estado: 'avisos', cifras: { pagos_revisar: 1, pagado_sin_factura: 0, confirmada_sin_pago: 0 }, items: [{ tipo: 'pagos_revisar', n: 1 }], mas: 0, creada_en: iso(7) },
    { id: 6, trabajo: 'taller', pasada: 'manana', estado: 'avisos', cifras: { modelos_cortos: 1 }, items: [{ modelo: U(901), en_taller: 2, libres: 0, reservas_7d: 5, falta: 5 }], mas: 0, creada_en: iso(7) },
    { id: 7, trabajo: 'ocupacion', pasada: 'manana', estado: 'avisos', cifras: { llenas: 1, vacias: 1 },
      items: [{ tipo: 'llena', modelo: U(901), ocupacion_pct: 95, semanas: 4 }, { tipo: 'vacia', modelo: U(902), ocupacion_pct: 5, semanas: 3 }, { tipo: 'algo_nuevo', n: 1 }], mas: 0, creada_en: iso(7) },
    { id: 8, trabajo: 'cierre', pasada: 'tarde', estado: 'resumen', cifras: { salidas_hoy: 5, vueltas_hoy: 3, cobros_hoy: 4, pendientes_cobro: 2 }, items: [], mas: 0, creada_en: iso(18) },
    { id: 9, trabajo: 'cierre', pasada: 'manana', estado: 'resumen', cifras: { salidas_hoy: 0, vueltas_hoy: 0, cobros_hoy: 0, pendientes_cobro: 2 }, items: [], mas: 0, creada_en: iso(7) }
  ];
  return n.map(x => Object.assign({ decision: s.decisiones[x.id] ? s.decisiones[x.id][0] : null, decidida_en: s.decisiones[x.id] ? iso(9) : null, decidida_por: s.decisiones[x.id] ? s.decisiones[x.id][1] : null }, x));
}
function nombres(s) {
  const n = {};
  for (let i = 1; i <= 30; i++) n[U(i)] = 'DK ' + (1000 + i) + ' AB';
  n[U(900)] = 'Honda Vario 160'; n[U(901)] = 'Honda Scoopy'; n[U(902)] = s.o.xss ? XSS : 'Yamaha NMAX';
  n[U(500)] = s.o.xss ? XSS : 'R-0012'; n[U(502)] = 'R-0019';   // U(501): una reserva que la base no resuelve
  delete n[U(2)];   // una moto que la base ya no conoce: el panel lo dice, no pinta el uuid
  return n;
}
function propuestas(s) {
  if (s.o.sinDatos) return [];
  const p = { id: 31, problema: s.o.xss ? XSS : 'La tarifa anual del Vario 160 sale más cara por día que la diaria', evidencia: 'Anual 2.000.000/365 > diaria 5.000', cambio: 'Revisar la tarifa anual', riesgo: 'Ninguno: solo propone', estado: 'pendiente', creada_en: iso(7), decidida_en: null, decidida_por: null, nota: null };
  if (s.propDec[31]) Object.assign(p, { estado: s.propDec[31][0], decidida_en: iso(10), decidida_por: 'Owner', nota: s.propDec[31][1] });
  return [p];
}
const err = (code, message, hint) => ({ data: null, error: { code, message, hint: hint || null, details: null } });
function estado(s) {
  const o = s.o, dueno = !!o.dueno, decide = !!o.herramienta || dueno;
  if (!s.encendido) return { encendido: false, soy_dueno: dueno, puedo_decidir: decide };
  return { encendido: true, parado: s.parado, soy_dueno: dueno, puedo_decidir: decide && !o.pruebas, falta_configurar: o.falta || null,
    ultima_pasada: o.sinNotas ? null : { dia: HOY, pasada: 'tarde', en: iso(18), resultado: s.parado ? 'en_pausa' : 'hecha' },
    tope_mensual_cent: s.tope, tope_propuesto_cent: s.propuesto, tope_propuesto_desde: s.propuesto != null ? iso(20) : null,
    gastado_mes_cent: 0, moneda: o.sinMoneda ? undefined : 'EUR', usd_por_eur: 1.08, trabajos: Object.assign({}, s.trabajos), nivel_ruta: s.nivel, nivel_max: 1, cupo_dia: 24, notas_hoy: o.sinNotas ? 0 : 9,
    trabajos_orden: s.orden.slice(), limites: o.limitesRaros ? 'x' : clon(s.limites), limites_fuera: clon(s.fuera), contexto: o.sinContexto ? null : clon(s.contexto),
    historial: o.sinHistorial ? null : clon(s.historial.slice(0, 10)),
    acciones_pendientes: s.acciones.filter(x => x.estado === 'pendiente' && Date.parse(x.expira_en) > Date.now()).length };
}
const ahoraIso = () => new Date().toISOString();
function cambio(s, campos, motivo) { s.historial.unshift({ cuando: ahoraIso(), quien: 'USR-00001', campos, motivo }); }
/* La forma del contexto como _agente_contexto_ok (060500): claves cerradas, largos, sin enlaces ni caracteres de control */
function contextoOk(c) {
  const topes = { quien: 600, horarios: 300, tono: 200 }, url = /https?:\/\/|www\./i, ctl = /[\u0000-\u001f\u007f]/;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
  return Object.keys(c).every(k => k === 'reglas'
    ? Array.isArray(c.reglas) && c.reglas.length <= 20 && c.reglas.every(r => typeof r === 'string' && r.length >= 1 && r.length <= 200 && !ctl.test(r) && !url.test(r))
    : (k in topes) && typeof c[k] === 'string' && c[k].length <= topes[k] && !ctl.test(c[k]) && !url.test(c[k]));
}
async function servidor(s, nombre, a) {
  s.llamadas.push([nombre, JSON.parse(JSON.stringify(a || {}))]);
  const o = s.o;
  if (o.lento) await new Promise(r => setTimeout(r, o.lento));
  if (!o.dueno && !o.herramienta) return err('42501', 'agente: sin la herramienta', 'sin_herramienta');
  const soloDueno = () => o.dueno ? null : err('42501', 'solo el owner', 'agente_solo_owner');
  switch (nombre) {
    case 'agente_panel_estado': return o.nulo ? { data: null, error: null } : { data: estado(s), error: null };
    case 'agente_notas_datos':
      if (!s.encendido) return err('42501', 'agente: módulo no activo', 'modulo_apagado');
      if (o.notasRaras) return { data: { notas: 'x' }, error: null };
      return { data: { dia: HOY, hoy: HOY, notas: notas(s), propuestas: propuestas(s), acciones: o.sinAcciones ? undefined : clon(s.acciones), nombres: nombres(s) }, error: null };
    case 'agente_nota_decide':
      if (o.pruebas) return err('42501', 'cuenta de pruebas', 'cuenta_pruebas');
      s.decisiones[a.p_id] = [a.p_decision, o.xss ? XSS : 'Made'];
      return { data: { ok: true, decision: a.p_decision }, error: null };
    case 'agente_propuesta_decide': { const e = soloDueno(); if (e) return e; s.propDec[a.p_id] = [a.p_decision, a.p_nota]; return { data: { ok: true, estado: a.p_decision }, error: null }; }
    // «Parar» no se frena nunca (decisión del CEO, 13-oct: un gesto de seguridad frenado falla abierto)
    case 'agente_para': s.parado = true; return { data: { parado: true }, error: null };
    case 'agente_reanuda': { const e = soloDueno(); if (e) return e; if (o.freno) return err('P0001', 'freno', 'agente_freno'); s.parado = false; return { data: { parado: false }, error: null }; }
    case 'agente_ficha_ajusta': {
      const e = soloDueno(); if (e) return e;
      // null = NO cambia (forma: p_tope_mensual_cent, p_trabajos y p_nivel_ruta)
      if (a.p_trabajos !== null) {
        if (!Array.isArray(a.p_trabajos) || a.p_trabajos.some(t => !s.orden.includes(t))) return err('22023', 'trabajo desconocido', 'datos');
        s.trabajos = {}; s.orden.forEach(t => { s.trabajos[t] = a.p_trabajos.includes(t); });
      }
      if (a.p_nivel_ruta !== null) s.nivel = a.p_nivel_ruta;
      if (a.p_tope_mensual_cent !== null) {
        // el MISMO tope cancela la subida pendiente; uno más bajo baja ya y la cancela; uno más alto queda pendiente
        if (a.p_tope_mensual_cent <= s.tope) { s.tope = a.p_tope_mensual_cent; s.propuesto = null; } else s.propuesto = a.p_tope_mensual_cent;
      }
      cambio(s, ['tope_mensual_cent'], a.p_motivo);
      return { data: estado(s), error: null };
    }
    case 'agente_modulo_cambia': { const e = soloDueno(); if (e) return e; if (o.cambiaNulo) return { data: null, error: null };
      if (o.sinSembrar && a.p_encender) return err('55000', 'modulo sin tipos', 'tipos_sin_sembrar');   // A13 de erp-alta en una instancia sin sembrar
      if (o.dePago && a.p_encender) return err('42501', 'modulo de pago', 'modulo_de_pago');
      if (o.otroTipo && a.p_encender) return err('42501', 'modulo de otro tipo', 'modulo_de_otro_tipo');
      s.encendido = !!a.p_encender; return { data: { encendido: s.encendido }, error: null }; }
    case 'agente_ficha_limites': {
      const e = soloDueno(); if (e) return e;
      if (o.freno) return err('P0001', 'freno', 'agente_freno');
      const vale = s.limites.map(l => l.modulo);
      if (o.moduloFuera || Object.keys(a.p_niveles).concat(Object.keys(a.p_topes)).some(k => !vale.includes(k))) return err('22023', 'agente_ficha_limites: «x» no es un módulo encendido de este ERP', 'agente_modulo_fuera');
      if (Object.values(a.p_niveles).some(v => ![0, 1, 2, 3].includes(v)) || Object.values(a.p_topes).some(v => !Number.isInteger(v) || v < 0)) return err('22023', 'agente_ficha_limites: forma');
      if (typeof a.p_motivo !== 'string' || a.p_motivo.trim().length < 3) return err('22023', 'di el motivo');
      if (o.sumaTopes) return err('23514', 'topes_cent: la suma (5000 céntimos) pasa del tope mensual (3700 céntimos)');
      s.limites = s.limites.map(l => ({ modulo: l.modulo, nivel: a.p_niveles[l.modulo] ?? 0, nivel_efectivo: a.p_niveles[l.modulo] ?? 0, tope_cent: a.p_topes[l.modulo] ?? null }));
      s.fuera = [];
      s.acciones.forEach(x => { if (x.estado === 'pendiente' && nivelDe(s, x.modulo) === 0) Object.assign(x, { estado: 'anulada', motivo: 'nivel', decidida_en: ahoraIso(), decidida_por: 'USR-00001' }); });
      cambio(s, ['niveles', 'topes_cent', 'niveles_en'], a.p_motivo);
      return { data: estado(s), error: null };
    }
    case 'agente_ficha_contexto': {
      const e = soloDueno(); if (e) return e;
      if (typeof a.p_motivo !== 'string' || a.p_motivo.trim().length < 3) return err('22023', 'di el motivo');
      if (!contextoOk(a.p_contexto)) return err('22023', 'agente_ficha_contexto: forma', 'agente_contexto_forma');
      s.contexto = clon(a.p_contexto);
      cambio(s, ['contexto'], a.p_motivo);
      return { data: estado(s), error: null };
    }
    case 'agente_accion_decide': {
      const e = soloDueno(); if (e) return e;
      const x = s.acciones.find(y => y.id === a.p_id);
      if (!x) return err('P0002', 'no existe esa propuesta');
      if (x.estado !== 'pendiente' || o.yaDecidida) { if (o.yaDecidida) Object.assign(x, { estado: 'rechazada', decidida_en: ahoraIso(), decidida_por: 'USR-00002' }); return err('22023', 'la propuesta ya está decidida', 'ya_decidida'); }
      let estado2, motivo2 = null;
      if (Date.parse(x.expira_en) <= Date.now()) { estado2 = 'caducada'; motivo2 = 'caducada'; }
      else if (a.p_decision === 'rechazada') estado2 = 'rechazada';
      else if (nivelDe(s, x.modulo) === 0) { estado2 = 'anulada'; motivo2 = 'nivel'; }
      else if (o.anulaDatos) { estado2 = 'anulada'; motivo2 = 'datos'; }
      else estado2 = 'aceptada';
      Object.assign(x, { estado: estado2, motivo: motivo2, decidida_en: ahoraIso(), decidida_por: 'USR-00001' });
      return { data: { ok: true, estado: estado2, motivo: motivo2 }, error: null };
    }
  }
  return err('PGRST202', 'Could not find the function public.' + nombre + ' in the schema cache');
}

// Sin la cáscara (Tailwind) las clases p-8 no pintan nada: el panel mediría más ancho que en la página real. Se ponen a mano el relleno de cada bloque (p-8 = 32 px)
// y un margen de página de 16 px, para que «no desborda» se mida con una caja de contenido tan estrecha como la de verdad.
const PIEL_MINIMA = '<style>body{margin:0;padding:0 16px}[data-ag^="bloque-"],.lw-cabecera{padding:32px}</style>';
const pagina = (idioma) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title>${PIEL_MINIMA}</head><body>
${MARCADO}
<script>
window.__xss = undefined; window.__fromLlamado = 0; window.__fetchLlamado = 0; window.__sinTr = []; window.__errores = [];
window.fetch = function () { window.__fetchLlamado++; return Promise.reject(new Error('fetch')); };
var sb = {
  rpc: function (n, a) { return { then: function (f, g) { return window.__srv(n, a || {}).then(f, g); } }; },
  from: function () { window.__fromLlamado++; throw new Error('el navegador no toca la base'); }
};
window.LW_AUTH = Promise.resolve({ sb: sb, ficha: { rol: 'admin', herramientas: ['agente'] } });
window.lwDatos = function (n, a) { if (!/^[a-z][a-z0-9_]*_datos$/.test(n)) throw new Error('lwDatos solo *_datos'); return Promise.resolve(sb.rpc(n, a)).then(function (r) { return { data: r.data, error: r.error }; }); };
window.LW_IDIOMA = '${idioma}';
window.LW_EN = {}; window.LW_ID = {};
window.AXW_MAPA_MODULOS = { n: ${JSON.stringify(ROTULOS).replace(/</g, '\\u003c')} };
window.lwLocale = function () { return window.LW_IDIOMA === 'en' ? 'en-GB' : (window.LW_IDIOMA === 'id' ? 'id-ID' : 'es-ES'); };
window.lwT = function (s) { s = String(s); var d = window.LW_IDIOMA === 'en' ? window.LW_EN : (window.LW_IDIOMA === 'id' ? window.LW_ID : null);
  if (d) { if (Object.prototype.hasOwnProperty.call(d, s)) return d[s]; if (!/^[\\s\u2014\u00b70-9.,%():\u2265\u2264-]*$/.test(s)) window.__sinTr.push(s); } return s; };
window.lwIdiomaAplicar = function (raiz) { Array.prototype.forEach.call(raiz.querySelectorAll('[data-lwt]'), function (e) { e.textContent = window.lwT(e.textContent); }); };
window.onerror = function (m) { window.__errores.push(String(m)); };
</script>
<script>${SCRIPT.replace(/<\/?script>/g, '')}</script></body></html>`;

// MUESTRA=<json> (opcional): lo que devolvieron agente_panel_estado y agente_notas_datos de una base REAL (el AaaS corrido de punta a punta en Postgres local,
// agencia erp/pruebas/agente_panel_muestra.json: {"estado": {...}, "notas": {...}}). Con él, el arnés solo pinta esa respuesta tal cual, comprueba la forma y saca capturas.
const MUESTRA = (() => {
  if (!process.env.MUESTRA) return null;
  const m = JSON.parse(fs.readFileSync(process.env.MUESTRA, 'utf8'));
  // la muestra de la agencia guarda cada respuesta con el nombre de su función; también vale {estado, notas}
  const r = { estado: m.estado || m.agente_panel_estado, notas: m.notas || m.agente_notas_datos };
  if (!r.estado || !r.notas) throw new Error('MUESTRA sin agente_panel_estado/agente_notas_datos (ni estado/notas)');
  return r;
})();
(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  // Con barras de scroll VISIBLES (Playwright las esconde en headless con --hide-scrollbars): a 390 px el contenido mide 390 menos la barra, como en un PC.
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, ignoreDefaultArgs: ['--hide-scrollbars'] });
  async function abre(opts = {}) {
    const base = nuevaBase(opts.base || {});
    const ctx = await nav.newContext({ viewport: { width: opts.ancho || 1440, height: 1000 } });
    const p = await ctx.newPage();
    await p.exposeFunction('__srv', (n, a) => servidor(base, n, a));
    await p.setContent(pagina(opts.idioma || 'es'), { waitUntil: 'load' });
    await p.waitForFunction(() => document.querySelector('[data-ag="carga"]').getAttribute('data-tipo') !== 'cargando', null, { timeout: 5000 });
    await p.waitForTimeout(150);
    return { base, p, ctx };
  }
  const txt = (p, sel) => p.$eval(sel, e => e.textContent);
  const visible = (p, sel) => p.$eval(sel, e => !e.classList.contains('axw-oculto'));
  const hay = (p, sel) => p.$$(sel).then(x => x.length);
  const llamadas = (b, n) => b.llamadas.filter(x => x[0] === n);
  const hasta = async f => { for (let i = 0; i < 100; i++) { if (f()) return true; await new Promise(r => setTimeout(r, 50)); } return false; };
  const sinInyeccion = async p => (await p.$$('[data-ag="raiz"] img, [data-ag="raiz"] svg, [data-ag="raiz"] script')).length === 0 && (await p.evaluate(() => window.__xss)) === undefined;
  const sinErrores = async p => (await p.evaluate(() => window.__errores)).length === 0 && (await p.evaluate(() => window.__fromLlamado + window.__fetchLlamado)) === 0;
  const tarjeta = (p, t) => txt(p, '[data-ag="nota"][data-trabajo="' + t + '"]');

  if (MUESTRA) {
    for (const [idioma, ancho] of [['es', 1440], ['es', 390], ['id', 1440], ['id', 390], ['en', 1440]]) {
      const base = nuevaBase({ dueno: true });
      const ctx = await nav.newContext({ viewport: { width: ancho, height: 1000 } });
      const p = await ctx.newPage();
      await p.exposeFunction('__srv', async (n, a) => { base.llamadas.push([n, a]); return n === 'agente_panel_estado' ? { data: MUESTRA.estado, error: null } : (n === 'agente_notas_datos' ? { data: MUESTRA.notas, error: null } : err('42501', 'solo lectura en la muestra')); });
      await p.setContent(pagina(idioma), { waitUntil: 'load' });
      await p.waitForFunction(() => document.querySelector('[data-ag="carga"]').getAttribute('data-tipo') !== 'cargando', null, { timeout: 5000 });
      await p.waitForTimeout(150);
      ok('muestra ' + idioma + ' ' + ancho + ' · la respuesta real se pinta sin error de forma', (await p.$eval('[data-ag="carga"]', e => e.getAttribute('data-tipo'))) === 'listo' && !(await visible(p, '[data-ag="error-hoy"]')));
      ok('muestra ' + idioma + ' ' + ancho + ' · una tarjeta por trabajo de trabajos_orden', (await p.$$('[data-ag="nota"]')).length === MUESTRA.estado.trabajos_orden.length);
      ok('muestra ' + idioma + ' ' + ancho + ' · una fila por límite (' + MUESTRA.estado.limites.length + '), cada una con su nombre y sin error de forma',
         (await hay(p, '[data-ag="limite"]')) === MUESTRA.estado.limites.length && !(await visible(p, '[data-ag="error-limites"]'))
         && (await p.$$eval('[data-ag="limite"] strong', e => e.every(x => x.textContent.trim().length > 0))));
      ok('muestra ' + idioma + ' ' + ancho + ' · historial y contexto se pintan; las acciones vacías lo dicen',
         (await hay(p, '[data-ag="cambio"]')) > 0 && !(await visible(p, '[data-ag="error-contexto"]'))
         && (Array.isArray(MUESTRA.notas.acciones) && !MUESTRA.notas.acciones.length ? (await hay(p, '[data-ag="sin-acciones"]')) === 1 : true));
      const sin = await p.evaluate(() => window.__sinTr);
      ok('muestra ' + idioma + ' ' + ancho + ' · nada sin traducir y ningún uuid en crudo', sin.length === 0 && !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/.test(await txt(p, '[data-ag="hoy"]')), J(sin.slice(0, 4)));
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      ok('muestra ' + idioma + ' ' + ancho + ' · no desborda', m.sw <= m.cw, J(m));
      if (SHOT) await p.screenshot({ path: SHOT + '_muestra_' + idioma + '_' + ancho + '.png', fullPage: true });
      await ctx.close();
    }
    await nav.close();
    console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\nTODO EN VERDE');
    process.exit(fallos ? 1 : 0);
  }
  // 1. el dueño con el AaaS encendido: todo a la vista
  {
    const { p, base, ctx } = await abre({ base: { dueno: true } });
    ok('dueño: estado, hoy, propuestas, ajustes y «más adelante» visibles', (await visible(p, '[data-ag="bloque-estado"]')) && (await visible(p, '[data-ag="bloque-hoy"]')) && (await visible(p, '[data-ag="bloque-propuestas"]')) && (await visible(p, '[data-ag="bloque-ajustes"]')) && (await visible(p, '[data-ag="bloque-mas"]')));
    ok('las 8 tarjetas de hoy, una por trabajo y en orden', J(await p.$$eval('[data-ag="nota"]', e => e.map(x => x.getAttribute('data-trabajo')))) === J(FORMA.trabajos));
    ok('pide el estado por sb.rpc y las notas por lwDatos con p_dia null', llamadas(base, 'agente_panel_estado').length === 1 && J(llamadas(base, 'agente_notas_datos')[0][1]) === J({ p_dia: null }));
    const fl = await tarjeta(p, 'flota');
    ok('flota: nombres resueltos con la sesión (matrícula), nunca el uuid', fl.includes('DK 1001 AB') && fl.includes('DK 1003 AB') && !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(fl), fl.slice(0, 200));
    ok('flota: una moto sin nombre lo dice («Moto sin nombre en este sistema»)', fl.includes('Moto sin nombre en este sistema'));
    ok('flota: días en taller y tarifa rara con su frase', fl.includes('41 días en el taller') && fl.includes('Honda Vario 160 · un tramo largo sale más caro por día que uno corto'));
    ok('flota: enlaces «ver cuáles» a Taller y a Flota', (await hay(p, '[data-trabajo="flota"] a[href="/intranet/v4/taller/"]')) === 1 && (await hay(p, '[data-trabajo="flota"] a[href="/intranet/v4/flota/"]')) === 1);
    ok('salidas: solo totales, con su frase', (await tarjeta(p, 'salidas')).includes('Salidas de mañana sin moto asignada: 2') && (await tarjeta(p, 'salidas')).includes('Salidas de mañana con la moto en el taller: 1'));
    ok('vueltas: el más atrasado en días', (await tarjeta(p, 'vueltas')).includes('Motos que debían volver y no consta: 2') && (await tarjeta(p, 'vueltas')).includes('La más atrasada lleva 3 días.'));
    ok('bloqueos sin avisos: «Todo en orden.»', (await tarjeta(p, 'bloqueos')).includes('Todo en orden.'));
    ok('taller y ocupación: modelo + cifras', (await tarjeta(p, 'taller')).includes('Honda Scoopy · 5 reservas en 7 días, 0 libres y 2 en el taller') && (await tarjeta(p, 'ocupacion')).includes('lleno 4 semanas seguidas (95 % de ocupación)'));
    ok('un aviso de un tipo desconocido NO se calla', (await tarjeta(p, 'ocupacion')).includes('Aviso de un tipo que esta pantalla aún no conoce.'));
    ok('cierre: manda la nota de la tarde sobre la de la mañana', (await tarjeta(p, 'cierre')).includes('Pasada de la tarde') && (await p.$eval('[data-trabajo="cierre"] dl', e => e.textContent)).includes('5'));
    ok('estado: encendido, trabajando, última pasada, gasto/tope', (await txt(p, '[data-ag="estado"]')).includes('Encendido') && (await txt(p, '[data-ag="estado"]')).includes('Trabajando') && (await txt(p, '[data-ag="estado"]')).includes('hecha'));
    ok('el dueño ve Parar y Apagar, no Encender', (await hay(p, '[data-accion="ag-parar"]')) === 1 && (await hay(p, '[data-accion="ag-apagar"]')) === 1 && (await hay(p, '[data-accion="ag-encender"]')) === 0);
    ok('ajustes: 8 casillas marcadas, nivel 1, tope 37 y su equivalente en USD', (await p.$$eval('[data-ag="trabajos"] input:checked', e => e.length)) === 8 && (await p.$eval('[data-campo="nivel_ruta"]', e => e.value)) === '1'
       && (await p.$eval('[data-campo="tope"]', e => e.value)) === '37' && (await txt(p, '[data-ag="tope-ayuda"]')).includes('40 USD'));
    // decidir un aviso
    await p.click('[data-trabajo="salidas"] [data-accion="ag-nota-hecha"]');
    await hasta(() => llamadas(base, 'agente_nota_decide').length === 1);
    ok('«Hecho» manda solo el id y la decisión', J(llamadas(base, 'agente_nota_decide')[0][1]) === J({ p_id: 2, p_decision: 'hecha' }));
    await p.waitForSelector('[data-trabajo="salidas"] [data-ag="decidida"]');
    ok('tras decidir, la tarjeta dice quién y cuándo, sin botones', (await txt(p, '[data-trabajo="salidas"] [data-ag="decidida"]')).includes('Hecho por Made') && (await hay(p, '[data-trabajo="salidas"] [data-accion="ag-nota-hecha"]')) === 0);
    // ajustes
    await p.uncheck('[data-trabajo="ocupacion"][type="checkbox"]'); await p.fill('[data-campo="tope"]', '30'); await p.fill('[data-campo="motivo"]', 'Bajo el tope');
    await p.click('[data-accion="ag-guardar"]');
    await hasta(() => llamadas(base, 'agente_ficha_ajusta').length === 1);
    const aj = llamadas(base, 'agente_ficha_ajusta')[0][1];
    ok('guardar manda tope en céntimos, la lista de trabajos sin el desmarcado, el nivel y el motivo', J(aj) === J({ p_tope_mensual_cent: 3000, p_trabajos: FORMA.trabajos.filter(t => t !== 'ocupacion'), p_nivel_ruta: 1, p_motivo: 'Bajo el tope' }), J(aj));
    await p.fill('[data-campo="tope"]', '1.500'); await p.fill('[data-campo="motivo"]', 'Otro');
    await p.click('[data-accion="ag-guardar"]');
    ok('un tope ambiguo («1.500») no se manda', (await txt(p, '[data-ag="error"]')).includes('ambiguo') && llamadas(base, 'agente_ficha_ajusta').length === 1);
    // revisor 13-oct (MEDIA): cambiar solo una casilla NO reenvía el tope (bajarlo cancelaría una subida pendiente del dueño)
    await p.fill('[data-campo="tope"]', '30'); await p.uncheck('[data-trabajo="cierre"][type="checkbox"]'); await p.fill('[data-campo="motivo"]', 'Solo una casilla');
    await p.click('[data-accion="ag-guardar"]');
    await hasta(() => llamadas(base, 'agente_ficha_ajusta').length === 2);
    ok('tope sin cambiar: viaja null (la base no lo toca)', llamadas(base, 'agente_ficha_ajusta')[1][1].p_tope_mensual_cent === null, J(llamadas(base, 'agente_ficha_ajusta')[1][1]));
    await p.waitForSelector('[data-ag="exito"]:not(.axw-oculto)');
    await p.fill('[data-campo="tope"]', ''); await p.fill('[data-campo="motivo"]', 'Vacío');
    await p.click('[data-accion="ag-guardar"]');
    ok('tope vacío: no se manda (no se convierte en 0 en silencio)', (await txt(p, '[data-ag="error"]')).includes('0 si no puede gastar') && llamadas(base, 'agente_ficha_ajusta').length === 2);
    await p.fill('[data-campo="tope"]', '30');
    // propuesta
    await p.click('[data-accion="ag-prop-aceptar"]');
    await p.fill('[data-campo="dialogo-motivo"]', 'De acuerdo');
    await p.click('[data-accion="ag-modal-confirmar"]');
    await hasta(() => llamadas(base, 'agente_propuesta_decide').length === 1);
    ok('aceptar una propuesta manda id, decisión y nota', J(llamadas(base, 'agente_propuesta_decide')[0][1]) === J({ p_id: 31, p_decision: 'aceptada', p_nota: 'De acuerdo' }));
    // apagar con confirmación
    await p.waitForSelector('[data-accion="ag-apagar"]');
    await p.click('[data-accion="ag-apagar"]');
    await p.click('[data-accion="ag-modal-confirmar"]');
    ok('apagar sin motivo no llama a la base', llamadas(base, 'agente_modulo_cambia').length === 0 && (await p.$eval('.axw-modal .axw-error', e => !e.classList.contains('axw-oculto'))));
    await p.fill('[data-campo="dialogo-motivo"]', 'Prueba de apagado');
    await p.click('[data-accion="ag-modal-confirmar"]');
    await hasta(() => llamadas(base, 'agente_modulo_cambia').length === 1);
    ok('apagar manda p_encender false y el motivo', J(llamadas(base, 'agente_modulo_cambia')[0][1]) === J({ p_encender: false, p_motivo: 'Prueba de apagado' }));
    await p.waitForSelector('[data-accion="ag-encender"]');
    ok('apagado: sale Encender y se esconden hoy/propuestas/ajustes', (await hay(p, '[data-accion="ag-encender"]')) === 1 && !(await visible(p, '[data-ag="bloque-hoy"]')) && !(await visible(p, '[data-ag="bloque-ajustes"]')));
    ok('sin errores de JS, sin fetch y sin .from()', await sinErrores(p));
    await ctx.close();
  }
  // 2. con la herramienta pero sin ser dueño
  {
    const { p, base, ctx } = await abre({ base: { herramienta: true } });
    ok('no dueño: puede Parar, no Apagar ni Reanudar, y se le dice por qué', (await hay(p, '[data-accion="ag-parar"]')) === 1 && (await hay(p, '[data-accion="ag-apagar"]')) === 0 && (await txt(p, '[data-ag="motivo-estado"]')).includes('dueño de la ficha'));
    ok('no dueño: los ajustes se ven en gris (fieldset deshabilitado) con el motivo', (await p.$eval('[data-ag="ajustes"]', e => e.disabled)) && (await visible(p, '[data-ag="motivo-ajustes"]')));
    ok('no dueño: puede marcar avisos pero no decidir propuestas', (await hay(p, '[data-accion="ag-nota-hecha"]')) > 0 && (await hay(p, '[data-accion="ag-prop-aceptar"]')) === 0);
    await p.click('[data-accion="ag-parar"]');
    await hasta(() => llamadas(base, 'agente_para').length === 1);
    await p.waitForSelector('[data-ag="exito"]:not(.axw-oculto)');
    ok('parar: llama a agente_para sin argumentos y dice que está parado', J(llamadas(base, 'agente_para')[0][1]) === '{}' && (await txt(p, '[data-ag="estado"]')).includes('En pausa'));
    ok('en pausa, el no dueño no tiene «Reanudar»', (await hay(p, '[data-accion="ag-reanudar"]')) === 0);
    await ctx.close();
  }
  // 2b. revisor 13-oct: la cuenta de pruebas no ve «Parar»; tope 0 y subida pendiente se dicen; sin moneda de la base no se inventa una
  {
    const { p, ctx } = await abre({ base: { herramienta: true, pruebas: true } });
    ok('cuenta de pruebas (puedo_decidir false): sin «Parar»', (await hay(p, '[data-accion="ag-parar"]')) === 0);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, tope0: true, propuesto: true } });
    const est = await txt(p, '[data-ag="estado"]');
    ok('tope 0 se dice «no puede gastar» (nunca «sin tope»)', est.includes('tope 0: no puede gastar') && !/sin tope/i.test(est), est);
    ok('la subida pendiente se ve en el estado y en la ayuda del tope', est.includes('Subida de tope pendiente') && (await txt(p, '[data-ag="tope-ayuda"]')).includes('subida pendiente'));
    await ctx.close();
  }
  // 2c. paso 5 de aaas-2: con un paso obligatorio sin hacer el AaaS no trabaja aunque la pausa esté quitada; la pantalla lo dice y nunca «Trabajando»
  for (const [falta, frase, idioma, ancho] of [['contexto_aaas', 'Le falta el contexto del negocio', 'es', 1440], ['limites_aaas', 'The limits per module are missing', 'en', 390],
                                               ['tope_aaas', 'Batas bulanan belum diisi', 'id', 390], ['setup_sin_sembrar', 'la pone el estudio', 'es', 390],
                                               ['moneda', 'Le falta un paso de la configuración del ERP (moneda)', 'es', 1440]]) {
    const { p, ctx } = await abre({ base: { dueno: true, falta }, idioma, ancho });
    const est = await txt(p, '[data-ag="estado"]'), mot = await txt(p, '[data-ag="motivo-estado"]');
    ok('sin configurar (' + falta + ', ' + idioma + ' ' + ancho + '): no dice «trabajando» y explica qué falta', !/Trabajando|Working|Bekerja/.test(est) && /Sin configurar|Not set up|Belum diatur/.test(est)
       && mot.includes(frase), est + ' | ' + mot);
    ok('sin configurar (' + falta + '): sigue pudiendo Parar (la pausa es otra cosa) y sin desbordar', (await hay(p, '[data-accion="ag-parar"]')) === 1
       && (await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true, falta: 'contexto_aaas' } });
    const mot = await txt(p, '[data-ag="motivo-estado"]');
    ok('sin configurar y no dueño: dice qué falta Y que es del dueño', mot.includes('Le falta el contexto del negocio') && mot.includes('dueño de la ficha'), mot);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, sinMoneda: true } });
    ok('sin moneda en la respuesta: error de forma, no un «EUR» puesto por la pantalla', (await txt(p, '[data-ag="carga"]')).includes('algo inesperado') && !(await visible(p, '[data-ag="bloque-estado"]')));
    await ctx.close();
  }
  // 3. sin herramienta · módulo apagado (no dueño) · null del interruptor · notas raras · sin datos · freno
  {
    const { p, ctx } = await abre({ base: {} });
    ok('sin herramienta: el mensaje de pedirla, y nada más', (await txt(p, '[data-ag="carga"]')).includes('No tienes la herramienta') && !(await visible(p, '[data-ag="bloque-estado"]')));
    await ctx.close();
  }
  {
    const { p, base, ctx } = await abre({ base: { herramienta: true, apagado: true } });
    ok('apagado y no dueño: dice quién lo enciende y no ofrece Encender', (await txt(p, '[data-ag="motivo-estado"]')).includes('Lo enciende el dueño') && (await hay(p, '[data-accion="ag-encender"]')) === 0);
    ok('apagado: no pide las notas', llamadas(base, 'agente_notas_datos').length === 0);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, nulo: true } });
    ok('null del interruptor (defensa: esa función va al núcleo) = apagado, con Encender', (await txt(p, '[data-ag="estado"]')).includes('Apagado') && (await hay(p, '[data-accion="ag-encender"]')) === 1);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, notasRaras: true } });
    ok('notas con forma rara: «no se ha podido mirar», no un panel vacío', (await txt(p, '[data-ag="error-hoy"]')).includes('no se ha podido mirar') && (await hay(p, '[data-ag="nota"]')) === 0);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, sinDatos: true } });
    ok('sin reservas: 7 tarjetas lo dicen (cobros con su frase) y flota trae 30 + «Y 64 más.»',
       (await p.$$eval('[data-estado="sin_datos"]', e => e.length)) === 7 && (await tarjeta(p, 'cobros')).includes('Sin reservas ni pagos en este sistema todavía.') && (await tarjeta(p, 'salidas')).includes('Sin reservas en este sistema todavía.')
       && (await tarjeta(p, 'flota')).includes('Y 64 más.') && (await p.$$eval('[data-trabajo="flota"] li', e => e.length)) === 31);
    ok('sin propuestas: lo dice', (await hay(p, '[data-ag="sin-propuestas"]')) === 1);
    if (SHOT) await p.screenshot({ path: SHOT + '_1440_sin_reservas.png', fullPage: true });
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, sinNotas: true } });
    ok('sin pasada todavía: 8 tarjetas «Sin pasada todavía hoy.» y la última pasada lo dice', (await p.$$eval('[data-estado="sin_nota"]', e => e.length)) === 8 && (await txt(p, '[data-ag="estado"]')).includes('Todavía no ha hecho ninguna pasada.'));
    await ctx.close();
  }
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, nulo: true, cambiaNulo: true } });
    await p.click('[data-accion="ag-encender"]'); await p.fill('[data-campo="dialogo-motivo"]', 'Encender'); await p.click('[data-accion="ag-modal-confirmar"]');
    await hasta(() => llamadas(base, 'agente_modulo_cambia').length === 1);
    await p.waitForSelector('.axw-modal .axw-error:not(.axw-oculto)');
    ok('encender con respuesta null (interruptor del navegador) NO se da por hecho: lo dice en el diálogo', (await txt(p, '.axw-modal .axw-error')).includes('no confirmó') && !(await visible(p, '[data-ag="exito"]')));
    await ctx.close();
  }
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, apagado: true, sinSembrar: true } });
    await p.click('[data-accion="ag-encender"]'); await p.fill('[data-campo="dialogo-motivo"]', 'Encender'); await p.click('[data-accion="ag-modal-confirmar"]');
    await hasta(() => llamadas(base, 'agente_modulo_cambia').length === 1);
    await p.waitForSelector('.axw-modal .axw-error:not(.axw-oculto)');
    ok('A13 sin sembrar (55000 tipos_sin_sembrar): lo dice en llano y sigue apagado', (await txt(p, '.axw-modal .axw-error')).includes('lo prepara el estudio') && (await txt(p, '[data-ag="estado"]')).includes('Apagado'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, pausa: true, freno: true } });
    await p.click('[data-accion="ag-reanudar"]');
    await p.waitForSelector('[data-ag="error"]:not(.axw-oculto)');
    ok('freno de la base: frase propia por su hint', (await txt(p, '[data-ag="error"]')).includes('Demasiados cambios seguidos'));
    await ctx.close();
  }
  // 4. XSS
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, xss: true } });
    await p.click('[data-trabajo="vueltas"] [data-accion="ag-nota-hecha"]');
    await hasta(() => llamadas(base, 'agente_nota_decide').length === 1);
    await p.waitForSelector('[data-trabajo="vueltas"] [data-ag="decidida"]');
    ok('XSS en el nombre de un modelo, en una propuesta y en quién decidió: se pinta como texto', await sinInyeccion(p) && (await tarjeta(p, 'ocupacion')).includes('<img src=x'));
    await ctx.close();
  }
  // 4b. la VENTANA de configuración (14-oct): el doble dice lo que dice el contrato
  {
    const b = nuevaBase({ dueno: true });
    ok('doble: agente_panel_estado devuelve exactamente las claves del contrato', J(Object.keys(estado(b)).sort()) === J(CLAVES_ESTADO), J(Object.keys(estado(b)).sort()));
    const dn = (await servidor(b, 'agente_notas_datos', { p_dia: null })).data;
    ok('doble: agente_notas_datos devuelve exactamente las claves del contrato', J(Object.keys(dn).sort()) === J(CLAVES_NOTAS), J(Object.keys(dn).sort()));
    ok('doble: cada acción lleva exactamente las claves del contrato', dn.acciones.every(x => J(Object.keys(x).sort()) === J(CLAVES_ACCION)), J(CLAVES_ACCION));
  }
  // 4c. límites por módulo
  {
    const { p, base, ctx } = await abre({ base: { dueno: true } });
    ok('límites: una fila por módulo de `limites`, en su orden', J(await p.$$eval('[data-ag="limite"]', e => e.map(x => x.getAttribute('data-modulo')))) === J(['reservas-producto', 'facturas', 'modulo-sin-rotulo']));
    const nombres = await p.$$eval('[data-ag="limite"] strong', e => e.map(x => x.textContent));
    ok('límites: el nombre sale del rótulo del registro y, sin rótulo, el id tal cual', nombres[0] === ROTULOS['reservas-producto'][0] && nombres[1] === ROTULOS.facturas[0] && nombres[2] === 'modulo-sin-rotulo', J(nombres));
    ok('límites: nivel guardado en el selector y tope en euros (vacío si no hay)', J(await p.$$eval('[data-limite="nivel"]', e => e.map(x => x.value))) === J(['1', '2', '0'])
       && J(await p.$$eval('[data-limite="tope"]', e => e.map(x => x.value))) === J(['', '15', '']));
    ok('límites: los 4 niveles con nombre en cada selector', (await p.$$eval('[data-limite="nivel"]', e => e.every(s => s.options.length === 4))));
    ok('límites: aviso SOLO en la fila cuyo nivel efectivo no es el guardado', J(await p.$$eval('[data-ag="limite-aviso"]', e => e.map(x => x.closest('[data-ag="limite"]').getAttribute('data-modulo')))) === J(['facturas']));
    ok('límites: lo que ya no está en este ERP se enseña aparte, apagado, con su nombre', (await visible(p, '[data-ag="bloque-fuera"]')) && (await txt(p, '[data-ag="limites-fuera"]')).includes(ROTULOS.obra[0]) && (await txt(p, '[data-ag="limites-fuera"]')).includes('al guardar los límites se retira'));
    await p.click('[data-accion="ag-guardar-limites"]');
    ok('límites: sin motivo no se manda', llamadas(base, 'agente_ficha_limites').length === 0 && (await txt(p, '[data-ag="falla-limites"]')).includes('motivo'));
    await p.fill('[data-modulo="reservas-producto"] [data-limite="tope"]', '1.500'); await p.fill('[data-campo="motivo_limites"]', 'Ajusto límites');
    await p.click('[data-accion="ag-guardar-limites"]');
    ok('límites: un tope ambiguo no se manda y dice de qué módulo es', llamadas(base, 'agente_ficha_limites').length === 0 && (await txt(p, '[data-ag="falla-limites"]')).includes(ROTULOS['reservas-producto'][0]));
    await p.fill('[data-modulo="reservas-producto"] [data-limite="tope"]', '20');
    await p.selectOption('[data-modulo="modulo-sin-rotulo"] [data-limite="nivel"]', '3');
    // otro botón mientras se escribe (Hecho en una nota) no borra lo tecleado
    await p.click('[data-trabajo="salidas"] [data-accion="ag-nota-hecha"]');
    await p.waitForSelector('[data-trabajo="salidas"] [data-ag="decidida"]');
    ok('límites: recargar por otro botón no borra lo que el dueño está escribiendo', (await p.$eval('[data-modulo="reservas-producto"] [data-limite="tope"]', e => e.value)) === '20' && (await p.$eval('[data-modulo="modulo-sin-rotulo"] [data-limite="nivel"]', e => e.value)) === '3');
    await p.click('[data-accion="ag-guardar-limites"]');
    await hasta(() => llamadas(base, 'agente_ficha_limites').length === 1);
    const lim = llamadas(base, 'agente_ficha_limites')[0][1];
    ok('límites: guardar manda TODAS las filas de `limites` (también las de nivel 0), nunca lo de fuera; topes solo los escritos, en céntimos',
       J(lim) === J({ p_niveles: { 'reservas-producto': 1, facturas: 2, 'modulo-sin-rotulo': 3 }, p_topes: { 'reservas-producto': 2000, facturas: 1500 }, p_motivo: 'Ajusto límites' }), J(lim));
    await p.waitForSelector('[data-ag="exito-limites"]:not(.axw-oculto)');
    ok('límites: tras guardar, el aviso de la fila y lo de fuera desaparecen; el motivo se vacía', (await hay(p, '[data-ag="limite-aviso"]')) === 0 && !(await visible(p, '[data-ag="bloque-fuera"]')) && (await p.$eval('[data-campo="motivo_limites"]', e => e.value)) === '');
    ok('límites: el historial recoge el cambio (Límites, Topes), sin valores', (await txt(p, '[data-ag="historial"] [data-ag="cambio"]')).includes('Límites, Topes') && !(await txt(p, '[data-ag="historial"]')).includes('2000'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, moduloFuera: true } });
    await p.fill('[data-campo="motivo_limites"]', 'Ajusto'); await p.click('[data-accion="ag-guardar-limites"]');
    await p.waitForSelector('[data-ag="falla-limites"]:not(.axw-oculto)');
    ok('límites: hint agente_modulo_fuera → frase clara junto al botón', (await txt(p, '[data-ag="falla-limites"]')).includes('ya no puede llevar límite'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, sumaTopes: true } });
    await p.fill('[data-campo="motivo_limites"]', 'Ajusto'); await p.click('[data-accion="ag-guardar-limites"]');
    await p.waitForSelector('[data-ag="falla-limites"]:not(.axw-oculto)');
    ok('límites: la suma de topes por encima del tope mensual (23514, sin hint) se enseña tal cual la da la base', (await txt(p, '[data-ag="falla-limites"]')).includes('pasa del tope mensual'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, freno: true } });
    await p.fill('[data-campo="motivo_limites"]', 'Ajusto'); await p.click('[data-accion="ag-guardar-limites"]');
    await p.waitForSelector('[data-ag="falla-limites"]:not(.axw-oculto)');
    ok('límites: el freno (agente_freno) tiene su frase', (await txt(p, '[data-ag="falla-limites"]')).includes('Demasiados cambios seguidos'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, limitesRaros: true, sinContexto: true, sinHistorial: true, sinAcciones: true } });
    ok('una parte que falta se dice en SU bloque («no se ha podido mirar») y el resto de la página sigue viva',
       (await txt(p, '[data-ag="error-limites"]')).includes('no se ha podido mirar') && !(await visible(p, '[data-ag="limites-form"]'))
       && (await txt(p, '[data-ag="error-contexto"]')).includes('no se ha podido mirar') && (await hay(p, '[data-ag="historial-error"]')) === 1
       && (await txt(p, '[data-ag="error-acciones"]')).includes('no se ha podido mirar') && (await hay(p, '[data-ag="sin-acciones"]')) === 0
       && (await hay(p, '[data-ag="nota"]')) === 8 && (await p.$eval('[data-ag="carga"]', e => e.getAttribute('data-tipo'))) === 'listo');
    await ctx.close();
  }
  // 4d. contexto del negocio
  {
    const { p, base, ctx } = await abre({ base: { dueno: true } });
    ok('contexto: se pinta lo guardado (reglas una por línea) con sus contadores', (await p.$eval('[data-campo="ctx_quien"]', e => e.value)) === 'Alquiler de motos en Canggu'
       && (await p.$eval('[data-campo="ctx_reglas"]', e => e.value)) === 'Nunca prometer una entrega antes de las 9' && (await txt(p, '[data-ag="cuenta-ctx_quien"]')) === '27 de 600 caracteres' && (await txt(p, '[data-ag="cuenta-ctx_reglas"]')) === '1 de 20 reglas');
    await p.fill('[data-campo="ctx_quien"]', 'Alquiler de motos\nen Canggu y Uluwatu');
    await p.fill('[data-campo="ctx_horarios"]', '');
    await p.fill('[data-campo="ctx_reglas"]', 'Nunca prometer una entrega antes de las 9\n\n   \nSi llueve, avisar al cliente  \n');
    await p.fill('[data-campo="ctx_tono"]', 'Cercano');
    await p.click('[data-accion="ag-guardar-contexto"]');
    ok('contexto: sin motivo no se manda', llamadas(base, 'agente_ficha_contexto').length === 0 && (await txt(p, '[data-ag="falla-contexto"]')).includes('motivo'));
    await p.fill('[data-campo="motivo_contexto"]', 'Más zonas');
    await p.click('[data-accion="ag-guardar-contexto"]');
    await hasta(() => llamadas(base, 'agente_ficha_contexto').length === 1);
    const cx = llamadas(base, 'agente_ficha_contexto')[0][1];
    ok('contexto: claves vacías no viajan, el salto de línea pasa a espacio y las reglas van en lista sin líneas vacías',
       J(cx) === J({ p_contexto: { quien: 'Alquiler de motos en Canggu y Uluwatu', reglas: ['Nunca prometer una entrega antes de las 9', 'Si llueve, avisar al cliente'], tono: 'Cercano' }, p_motivo: 'Más zonas' }), J(cx));
    await p.waitForSelector('[data-ag="exito-contexto"]:not(.axw-oculto)');
    ok('contexto: guardado, el formulario enseña lo de la base y el historial dice «Contexto del negocio»', (await p.$eval('[data-campo="ctx_quien"]', e => e.value)) === 'Alquiler de motos en Canggu y Uluwatu'
       && (await txt(p, '[data-ag="historial"] [data-ag="cambio"]')).includes('Contexto del negocio'));
    await p.fill('[data-campo="ctx_reglas"]', Array.from({ length: 21 }, (_, i) => 'Regla ' + (i + 1)).join('\n')); await p.fill('[data-campo="motivo_contexto"]', 'Muchas');
    await p.click('[data-accion="ag-guardar-contexto"]');
    ok('contexto: más de 20 reglas no se manda y lo dice', llamadas(base, 'agente_ficha_contexto').length === 1 && (await txt(p, '[data-ag="falla-contexto"]')).includes('20 reglas'));
    await p.fill('[data-campo="ctx_reglas"]', 'Ver https://ejemplo.com'); await p.fill('[data-campo="motivo_contexto"]', 'Con enlace');
    await p.click('[data-accion="ag-guardar-contexto"]');
    await hasta(() => llamadas(base, 'agente_ficha_contexto').length === 2);
    await p.waitForSelector('[data-ag="falla-contexto"]:not(.axw-oculto)');
    ok('contexto: la base rechaza un enlace (hint agente_contexto_forma) → frase clara, y lo escrito NO se borra', (await txt(p, '[data-ag="falla-contexto"]')).includes('no puede llevar enlaces')
       && (await p.$eval('[data-campo="ctx_reglas"]', e => e.value)) === 'Ver https://ejemplo.com');
    await ctx.close();
  }
  // 4e. historial
  {
    const { p, ctx } = await abre({ base: { dueno: true } });
    const filas = await p.$$eval('[data-ag="cambio"]', e => e.map(x => x.textContent));
    ok('historial: la gemela sin campos de un mismo guardado no sale; un guardado sin cambios sí lo dice', filas.length === 4 && filas.filter(f => f.includes('Primeros límites')).length === 1 && filas[3].includes('Guardado sin cambios.'), J(filas));
    ok('historial: campos en palabras y sin repetir (Límites una vez), quien «El estudio», un campo desconocido tal cual, quien null = —',
       filas[0].includes('Cambió: Límites, Topes') && filas[1].includes('El estudio') && filas[1].includes('Tope mensual, Subida de tope') && !/Subida de tope.*Subida de tope/.test(filas[1])
       && filas[2].includes('campo_raro') && filas[2].includes(' · —') && filas[1].includes('Motivo: —'), J(filas));
    await ctx.close();
  }
  // 4f. acciones que propone el AaaS
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, lento: 300 } });
    await p.waitForSelector('[data-ag="accion"]');   // lento: las notas llegan después del estado
    ok('acciones: aviso arriba con las pendientes sin caducar (2) y enlace al bloque', (await txt(p, '[data-ag="pendientes"]')).includes('El AaaS propone 2 acciones que esperan tu decisión.') && (await hay(p, '[data-ag="ir-acciones"][href="#ag-acciones"]')) === 1);
    const ids = await p.$$eval('[data-ag="accion"]', e => e.map(x => x.getAttribute('data-id') + ':' + x.getAttribute('data-estado')));
    ok('acciones: pendientes primero; la pendiente ya vencida sale como caducada', J(ids) === J(['102:pendiente', '101:pendiente', '105:aceptada', '104:anulada', '103:caducada']), J(ids));
    const a101 = await txt(p, '[data-ag="accion"][data-id="101"]');
    ok('acciones: aviso_reserva con el número de la reserva, su módulo y cuándo caduca', a101.includes('Aviso en la reserva R-0012: moto en el taller') && a101.includes(ROTULOS['reservas-producto'][0]) && a101.includes('Caduca el'));
    ok('acciones: una reserva sin número no enseña el uuid', (await txt(p, '[data-ag="accion"][data-id="102"]')).includes('Aviso en la reserva (sin número en este sistema): moto todavía fuera en otra reserva') && !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(await txt(p, '[data-ag="acciones"]')));
    ok('acciones: una acción de tipo desconocido no se calla; la anulada dice por qué', (await txt(p, '[data-ag="accion"][data-id="104"]')).includes('Acción de un tipo que esta pantalla aún no conoce.') && (await txt(p, '[data-ag="accion"][data-id="104"]')).includes('Ya no se cumplía'));
    ok('acciones: Aceptar/Rechazar solo en las pendientes vigentes (la vencida no los tiene)', (await hay(p, '[data-accion="ag-acc-aceptar"]')) === 2 && (await hay(p, '[data-ag="accion"][data-id="103"] [data-accion]')) === 0);
    await p.dblclick('[data-ag="accion"][data-id="101"] [data-accion="ag-acc-aceptar"]');
    await p.click('[data-ag="accion"][data-id="101"] [data-accion="ag-acc-rechazar"]', { force: true, timeout: 500 }).catch(() => {});
    await hasta(() => llamadas(base, 'agente_accion_decide').length >= 1);
    await p.waitForSelector('[data-ag="exito-acciones"]:not(.axw-oculto)');
    ok('acciones: doble clic en Aceptar (y un Rechazar encima) manda UNA sola decisión', llamadas(base, 'agente_accion_decide').length === 1 && J(llamadas(base, 'agente_accion_decide')[0][1]) === J({ p_id: 101, p_decision: 'aceptada' }), J(llamadas(base, 'agente_accion_decide')));
    ok('acciones: aceptada → «Acción aceptada y hecha.» y la tarjeta pasa a aceptada', (await txt(p, '[data-ag="exito-acciones"]')) === 'Acción aceptada y hecha.' && (await p.$eval('[data-ag="accion"][data-id="101"]', e => e.getAttribute('data-estado'))) === 'aceptada');
    ok('acciones: el aviso de arriba baja a 1', (await txt(p, '[data-ag="pendientes"]')).includes('El AaaS propone una acción que espera tu decisión.'));
    await p.click('[data-ag="accion"][data-id="102"] [data-accion="ag-acc-rechazar"]');
    await p.waitForFunction(() => document.querySelector('[data-ag="exito-acciones"]').textContent === 'Acción rechazada.');
    ok('acciones: rechazar manda la decisión y desaparece el aviso de arriba', J(llamadas(base, 'agente_accion_decide')[1][1]) === J({ p_id: 102, p_decision: 'rechazada' }) && !(await visible(p, '[data-ag="pendientes"]')));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, anulaDatos: true } });
    await p.click('[data-ag="accion"][data-id="101"] [data-accion="ag-acc-aceptar"]');
    await p.waitForSelector('[data-ag="aviso-acciones"]:not(.axw-oculto)');
    ok('acciones: anulada por datos → «No se ha hecho: ya no se cumplía.» (aviso, no éxito)', (await txt(p, '[data-ag="aviso-acciones"]')) === 'No se ha hecho: ya no se cumplía.' && !(await visible(p, '[data-ag="exito-acciones"]')));
    await ctx.close();
  }
  {
    const b = { dueno: true };
    const { p, base, ctx } = await abre({ base: b });
    base.limites[0].nivel_efectivo = 0;   // el límite de reservas-producto ya no lo permite (se apagó el módulo entre pintar y aceptar)
    await p.click('[data-ag="accion"][data-id="101"] [data-accion="ag-acc-aceptar"]');
    await p.waitForSelector('[data-ag="aviso-acciones"]:not(.axw-oculto)');
    ok('acciones: anulada por nivel → «el límite de ese módulo ya no lo permite»', (await txt(p, '[data-ag="aviso-acciones"]')).includes('el límite de ese módulo ya no lo permite'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, yaDecidida: true } });
    await p.click('[data-ag="accion"][data-id="101"] [data-accion="ag-acc-aceptar"]');
    await p.waitForSelector('[data-ag="aviso-acciones"]:not(.axw-oculto)');
    ok('acciones: ya decidida por otro (ya_decidida) → lo dice y repinta cómo quedó', (await txt(p, '[data-ag="aviso-acciones"]')).includes('Alguien ya lo decidió') && (await p.$eval('[data-ag="accion"][data-id="101"]', e => e.getAttribute('data-estado'))) === 'rechazada');
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true } });
    ok('no dueño: ve las acciones y el aviso «espera la decisión del dueño», sin botones', (await hay(p, '[data-ag="accion"]')) === 5 && (await hay(p, '[data-accion="ag-acc-aceptar"]')) === 0
       && (await txt(p, '[data-ag="pendientes"]')).includes('esperan la decisión del dueño') && (await visible(p, '[data-ag="motivo-acciones"]')));
    ok('no dueño: límites y contexto en solo lectura (fieldset deshabilitado, con el porqué)', (await p.$eval('[data-ag="limites-form"]', e => e.disabled)) && (await p.$eval('[data-ag="contexto-form"]', e => e.disabled))
       && (await visible(p, '[data-ag="motivo-limites"]')) && (await visible(p, '[data-ag="motivo-contexto"]')) && (await hay(p, '[data-ag="limite"]')) === 3);
    await ctx.close();
  }
  // 4g. trabajos desde trabajos_orden
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, orden: ['cobros', 'flota', 'trabajo_nuevo'] } });
    const tj = await p.$$eval('[data-ag="nota"]', e => e.map(x => x.getAttribute('data-trabajo')));
    ok('trabajos: tarjetas en el orden de trabajos_orden; un id sin nombre tal cual; las notas de trabajos fuera del catálogo van al final, no se callan',
       J(tj) === J(['cobros', 'flota', 'trabajo_nuevo', 'salidas', 'vueltas', 'bloqueos', 'taller', 'ocupacion', 'cierre']) && (await tarjeta(p, 'trabajo_nuevo')).includes('trabajo_nuevo') && (await tarjeta(p, 'trabajo_nuevo')).includes('Sin pasada todavía hoy.'), J(tj));
    ok('trabajos: las casillas también salen de trabajos_orden', J(await p.$$eval('[data-ag="trabajos"] input', e => e.map(x => x.getAttribute('data-trabajo')))) === J(['cobros', 'flota', 'trabajo_nuevo']));
    await p.uncheck('[data-ag="trabajos"] [data-trabajo="flota"]'); await p.fill('[data-campo="motivo"]', 'Sin flota');
    await p.click('[data-accion="ag-guardar"]');
    await hasta(() => llamadas(base, 'agente_ficha_ajusta').length === 1);
    ok('trabajos: guardar manda los marcados del catálogo de la base', J(llamadas(base, 'agente_ficha_ajusta')[0][1].p_trabajos) === J(['cobros', 'trabajo_nuevo']));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, orden: [], sinNotas: true } });
    ok('trabajos: catálogo vacío → «Este ERP aún no tiene trabajos del AaaS para su tipo de negocio» en Hoy y en los ajustes',
       (await txt(p, '[data-ag="sin-trabajos-hoy"]')).includes('aún no tiene trabajos del AaaS') && (await txt(p, '[data-ag="sin-trabajos"]')).includes('aún no tiene trabajos del AaaS') && (await hay(p, '[data-ag="trabajos"] input')) === 0);
    await ctx.close();
  }
  // 4h. «Cancelar la subida»
  {
    const { p, ctx } = await abre({ base: { dueno: true } });
    ok('cancelar la subida: sin subida pendiente no hay botón', (await hay(p, '[data-accion="ag-cancelar-subida"]')) === 0);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true, propuesto: true } });
    ok('cancelar la subida: el no dueño no lo ve', (await hay(p, '[data-accion="ag-cancelar-subida"]')) === 0);
    await ctx.close();
  }
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, propuesto: true } });
    await p.click('[data-accion="ag-cancelar-subida"]');
    ok('cancelar la subida: el diálogo dice que el tope se queda y la subida no entra', (await txt(p, '.axw-modal')).includes('El tope se queda en') && (await txt(p, '.axw-modal')).includes('no entrará'));
    await p.click('[data-accion="ag-modal-confirmar"]');
    ok('cancelar la subida: sin motivo no se manda', llamadas(base, 'agente_ficha_ajusta').length === 0);
    await p.fill('[data-campo="dialogo-motivo"]', 'Mejor no subir');
    await p.click('[data-accion="ag-modal-confirmar"]');
    await hasta(() => llamadas(base, 'agente_ficha_ajusta').length === 1);
    ok('cancelar la subida: manda el tope GUARDADO (explícito) y null en trabajos y nivel', J(llamadas(base, 'agente_ficha_ajusta')[0][1]) === J({ p_tope_mensual_cent: 3700, p_trabajos: null, p_nivel_ruta: null, p_motivo: 'Mejor no subir' }), J(llamadas(base, 'agente_ficha_ajusta')[0][1]));
    await p.waitForSelector('[data-ag="exito"]:not(.axw-oculto)');
    ok('cancelar la subida: la subida desaparece, el tope sigue igual y el botón se va', !(await txt(p, '[data-ag="estado"]')).includes('Subida de tope pendiente') && (await hay(p, '[data-accion="ag-cancelar-subida"]')) === 0
       && (await p.$eval('[data-campo="tope"]', e => e.value)) === '37' && base.tope === 3700);
    await ctx.close();
  }
  // 4i. A13: los dos rechazos al encender, en llano
  for (const [o, frase] of [[{ dePago: true }, 'lo enciende el estudio'], [{ otroTipo: true }, 'no es para el tipo de negocio de este ERP']]) {
    const { p, ctx } = await abre({ base: Object.assign({ dueno: true, apagado: true }, o) });
    await p.click('[data-accion="ag-encender"]'); await p.fill('[data-campo="dialogo-motivo"]', 'Encender'); await p.click('[data-accion="ag-modal-confirmar"]');
    await p.waitForSelector('.axw-modal .axw-error:not(.axw-oculto)');
    ok('A13 ' + Object.keys(o)[0] + ': «' + frase + '»', (await txt(p, '.axw-modal .axw-error')).includes(frase));
    await ctx.close();
  }
  // 5. idiomas: en e id sin una cadena sin traducir, en todos los estados
  for (const idioma of ['en', 'id']) {
    for (const [nombre, base] of [['dueño', { dueno: true }], ['no dueño', { herramienta: true }], ['sin datos', { dueno: true, sinDatos: true }], ['sin notas', { dueno: true, sinNotas: true }],
                                  ['apagado', { herramienta: true, apagado: true }], ['sin herramienta', {}], ['notas raras', { dueno: true, notasRaras: true }]]) {
      const { p, ctx } = await abre({ idioma, base });
      if (nombre === 'dueño') { await p.click('[data-accion="ag-apagar"]'); await p.click('[data-accion="ag-modal-confirmar"]'); }
      const sin = await p.evaluate(() => window.__sinTr);
      ok(idioma + ' · ' + nombre + ': ninguna cadena sin traducir', sin.length === 0, J(sin.slice(0, 6)));
      if (nombre === 'dueño') ok(idioma + ' · el título traducido', (await txt(p, 'h1')) === 'AaaS');
      await ctx.close();
    }
  }
  // 6. 390 y 1440 px en los tres idiomas, con capturas
  for (const idioma of ['es', 'en', 'id']) {
    for (const ancho of [1440, 390]) {
      const { p, ctx } = await abre({ ancho, idioma, base: { dueno: true } });
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, barra: window.innerWidth - document.documentElement.clientWidth }));
      ok(idioma + ' ' + ancho + ' px · con la barra de scroll vertical visible (' + m.barra + ' px), el panel no desborda', m.barra > 0 && m.sw <= m.cw, J(m));
      const anchas = await p.$$eval('[data-ag="raiz"] *', es => es.filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map(e => e.tagName + '.' + e.className).slice(0, 4));
      ok(idioma + ' ' + ancho + ' px · ningún elemento se sale por la derecha', anchas.length === 0, J(anchas));
      if (SHOT) await p.screenshot({ path: SHOT + '_' + idioma + '_' + ancho + '.png', fullPage: true });
      await p.click('[data-accion="ag-apagar"]');
      const dlg = await p.$eval('[data-axw="dialogo"] .axw-modal', e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: window.innerWidth }; });
      ok(idioma + ' ' + ancho + ' px · la confirmación de apagar cabe', dlg.l >= 0 && dlg.r <= dlg.w + 1, J(dlg));
      if (SHOT && idioma === 'es') await p.screenshot({ path: SHOT + '_' + idioma + '_' + ancho + '_apagar.png' });
      await ctx.close();
    }
  }
  await nav.close();
  console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\nTODO EN VERDE');
  process.exit(fallos ? 1 : 0);
})();
