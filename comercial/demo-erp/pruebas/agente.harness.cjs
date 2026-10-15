// node comercial/demo-erp/pruebas/agente.harness.cjs [captura_prefijo]
// Harness de la VENTANA DEL AaaS (EP.5, 13-oct-2026; Ajustes como asistente, 15-oct-2026): el agente.html REAL (marcado + script, con las ayudas comunes pegadas como hace
// build.py) en Chromium, servido en una URL de verdad (las vistas van por el hash), con la base y la sesión SIMULADAS (page.exposeFunction): una base en memoria que imita el
// CONTRATO de agente_forma.json (la misma forma que valida la prueba SQL de la agencia). Mide el COMPORTAMIENTO: qué pide y con qué argumentos en cada paso del asistente
// (tope, tu negocio, límites, trabajos), que lo que no cambió no viaja, «Esperan tu OK» (con un módulo en nivel 1 su propuesta aparece), «Falta X» con su botón, la ruta por
// hash con foco, para cada quien (dueño, con la herramienta, sin ella, módulo apagado, null del interruptor), XSS, idiomas es/en/id sin cadenas sin traducir, 390 y 1440 px sin
// scroll horizontal, y la MEDIDA del recorrido desde cero a 390×844 en indonesio (encargo: ≤4 pantallas y ≤6 campos).
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
   orden (trabajos_orden), sinAcciones / limitesRaros / sinContexto / sinHistorial (falta esa parte), dePago / otroTipo (rechazos de A13), anulaDatos, moduloFuera, sumaTopes, lento,
   nuevo (desde cero: tope 0, sin contexto, sin límites; falta_configurar se recalcula como _agente_setup_estado), conTope, sinNivel1, sinPendientes, soloFacturasNivel1, sinNivelGuardado,
   sinLimites (ninguna parte del negocio admite límites), mismoNombre (dos personas activas que se llaman igual, para el paso 0) */
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
  if (o.nuevo) {
    s.tope = o.conTope ? 3700 : 0; s.propuesto = null; s.contexto = {}; s.historial = []; s.fuera = []; s.acciones = [];
    s.nivel = 0;   // la revisión de Ruta nace apagada: equipo '{}' por defecto y agente_panel_estado da nivel_ruta 0 (agencia 20261014060500)
    s.limites = s.limites.map(l => ({ modulo: l.modulo, nivel: 0, nivel_efectivo: 0, tope_cent: null }));
  }
  s.nivGuardados = !o.nuevo;
  if (o.sinNivel1) s.limites.forEach(l => { l.nivel = 2; l.nivel_efectivo = 2; });
  if (o.sinPendientes) s.acciones = s.acciones.filter(x => x.estado !== 'pendiente');
  if (o.soloFacturasNivel1) {
    const f = s.limites.find(l => l.modulo === 'facturas'); f.nivel = 1; f.nivel_efectivo = 1;
    s.acciones = [{ id: 201, accion: 'aviso_reserva', modulo: 'facturas', datos: { reserva: U(502), motivo: 'unidad_de_baja', trabajo: 'salidas' }, estado: 'pendiente', motivo: null, creada_en: en(-2), expira_en: en(40), decidida_en: null, decidida_por: null }];
  }
  if (o.sinNivelGuardado) s.limites.forEach(l => { l.nivel = 0; l.nivel_efectivo = 0; });
  if (o.limpio) { s.fuera = []; s.limites.forEach(l => { l.nivel_efectivo = l.nivel; }); }
  if (o.sinLimites) { s.limites = []; s.fuera = []; }
  if (o.xss) s.contexto.quien = XSS;
  s.ow = o.ow ? clon(o.ow) : null;   // paso 0: {prop, yo, owner, inactivo, cambios, cambiado, yaNo, freno, roto, candRotos, candVacio, sinCand, conPruebas, sinSesion}; sin él, las funciones del paso 0 dan 404
  // Panel V2 (15-oct-2026): la forma de agente_panel_autonomo / agente_conexiones_estado (agente_forma.json). Áreas y equipo como los siembra 20261015100000.
  const X = t => o.xss ? XSS : t;
  s.v2 = {
    areas: [{ id: 'direccion', orden: 1, nombre: { en: 'Direction', es: 'Dirección', id: 'Arahan' } }, { id: 'operaciones', orden: 2, nombre: { en: 'Operations', es: 'Operaciones', id: 'Operasional' } },
            { id: 'dinero', orden: 3, nombre: { en: 'Money', es: 'Dinero', id: 'Keuangan' } }, { id: 'precios', orden: 4, nombre: { en: 'Prices', es: 'Precios', id: 'Harga' } },
            { id: 'captacion', orden: 5, nombre: { en: 'Social', es: 'Redes', id: 'Media sosial' } }],
    equipo: [['altavoz', 'captacion'], ['capitan', 'direccion'], ['cifras', 'dinero'], ['radar', 'precios'], ['ruta', 'operaciones'], ['tesorero', 'dinero']].map(x => ({ agente: x[0], area: x[1] })),
    palAg: {}, palArea: {},
    registro: o.sinRegistro ? [] : [
      { id: 12, en: iso(9), agente: 'capitan', area: 'direccion', accion: 'prioridades_dia', estado: 'aplicada', motivo: null, que: X('Prioridad 1: cobrar las 3 reservas que caducan mañana'), porque: X('Son la última moto libre de su modelo'), valor_esperado_cent: 150000000, gastado_cent: 12 },
      { id: 11, en: iso(8), agente: 'altavoz', area: 'captacion', accion: 'publica_post', estado: 'parada', motivo: 'parado', que: null, porque: null, valor_esperado_cent: null, gastado_cent: null },
      { id: 10, en: iso(7), agente: 'radar', area: 'precios', accion: 'cambia_tarifa', estado: 'rechazada', motivo: 'tope', que: null, porque: X('Ocupación del 95 %'), valor_esperado_cent: 20000000, gastado_cent: null }],
    cola: o.sinRegistro ? [] : [{ id: 3, creada: iso(9), agente: 'altavoz', canal: 'instagram', estado: 'simulada', texto: X('Nueva Scoopy en la flota') }],
    altavoz: { lineas: [{ linea: 'scooters', nombre: 'Scooters' }], dominios: ['minegocio.example'], imagenes: [] },
    con: [{ proveedor: 'claude', estado: 'sin_comprobar', ultimos4: 'AbCd', version: 1, guardada_en: iso(8), por: 'USR-00001', comprobada_en: null, ultimo_error: null, ajustes: {} }]
  };
  return s;
}
/* Lo que le falta al equipo: lo que diga la prueba (o.falta) o, desde cero (o.nuevo), lo mismo que mira _agente_setup_estado (060500):
   tope = min(max(tope, propuesto), techo) > 0 · contexto = quién no vacío · límites = guardados alguna vez */
function faltaDe(s) {
  const o = s.o;
  if (!o.nuevo) return o.falta || null;
  if (!(Math.min(Math.max(s.tope, s.propuesto || 0), 4000) > 0)) return 'tope_aaas';
  if (!(s.contexto && typeof s.contexto.quien === 'string' && s.contexto.quien.trim())) return 'contexto_aaas';
  if (!s.nivGuardados) return 'limites_aaas';
  return null;
}
function panelV2(s) {
  const o = s.o, v = s.v2, sin = !!o.sinGanado;
  const r = { hoy: HOY, zona: 'Asia/Makassar', moneda: 'IDR', pausa: s.parado, falta_configurar: faltaDe(s),
    areas: v.areas.map(a => Object.assign(clon(a), { parado: !!v.palArea[a.id] })), equipo: v.equipo.map(m => ({ agente: m.agente, area: m.area, parado: !!v.palAg[m.agente] })),
    registro: clon(v.registro), cola: clon(v.cola),
    dinero: { gastado_mes_cent: 1234, moneda_gasto: 'EUR', tope_mensual_cent: s.tope, ganado_mes_cent: sin ? null : 1250000000, moneda_ganado: 'IDR',
              ganado_reservas_cent: sin ? null : 1000000000, reservas_pagadas_mes: sin ? null : 4, ganado_recibis_cent: sin ? null : 250000000, recibis_mes: sin ? null : 1 },
    altavoz: clon(v.altavoz) };
  // Seguridad, 15-oct: con Reservas pero sin ser admin, ganado = solo las reservas y los recibís en null
  if (o.soloReservas) Object.assign(r.dinero, { ganado_mes_cent: 1000000000, ganado_recibis_cent: null, recibis_mes: null });
  return r;
}
// la forma de cada Ajuste del Altavoz como agente_ajuste_altavoz (20261015101000 + dominio_compartido de Seguridad, 15-oct)
function altavoz(s, a) {
  const v = s.v2.altavoz, d = a.p_dato || {}, quita = !!a.p_quita, no = m => ({ data: { ok: false, motivo: m }, error: null }), si = c => ({ data: { ok: true, tipo: a.p_tipo, quita, cambia: c }, error: null });
  if (a.p_tipo === 'linea') {
    const l = String(d.linea || '').trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]{2,30}$/.test(l)) return no('linea');
    if (quita) { const n = v.lineas.length; v.lineas = v.lineas.filter(x => x.linea !== l); return si(n !== v.lineas.length); }
    const nom = String(d.nombre || '').trim(); if (nom.length < 2 || nom.length > 60) return no('nombre');
    v.lineas = v.lineas.filter(x => x.linea !== l).concat([{ linea: l, nombre: nom }]); return si(true);
  }
  if (a.p_tipo === 'dominio') {
    const dm = String(d.dominio || '').trim().toLowerCase();
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(dm)) return no('dominio');
    if (['bit.ly', 'instagram.com', 'linktr.ee'].includes(dm)) return no('dominio_compartido');
    if (quita) { const n = v.dominios.length; v.dominios = v.dominios.filter(x => x !== dm); return si(n !== v.dominios.length); }
    if (v.dominios.includes(dm)) return si(false);
    v.dominios.push(dm); return si(true);
  }
  if (a.p_tipo === 'imagen') {
    const u = String(d.url || '').trim();
    if (!/^https:\/\/([a-z0-9-]+\.)+[a-z]{2,}\/[A-Za-z0-9/_.-]{1,200}\.jpe?g$/.test(u)) return no('url');
    if (quita) { const n = v.imagenes.length; v.imagenes = v.imagenes.filter(x => x.url !== u); return si(n !== v.imagenes.length); }
    if (!v.lineas.some(x => x.linea === d.linea)) return no('linea');
    v.imagenes = v.imagenes.filter(x => x.url !== u).concat([{ url: u, linea: d.linea }]); return si(true);
  }
  return no('forma');
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
// paso 0: las personas activas de la base; la tercera es la cuenta de pruebas (la base no la da en candidatos ni la deja elegir)
const NOELIA = U(7001), DION = U(7002), PRUEBAS_UID = U(7003), ESTUDIO_UID = U(7005);
const PERSONAS = [{ user_id: DION, numero_usuario: 'USR-00002', nombre: 'Dion' }, { user_id: NOELIA, numero_usuario: 'USR-00001', nombre: 'Noelia' },
                  { user_id: PRUEBAS_UID, numero_usuario: 'USR-00003', nombre: 'Cuenta de pruebas' }];
function estado(s) {
  const o = s.o, dueno = !!o.dueno, decide = !!o.herramienta || dueno;
  if (!s.encendido) return { encendido: false, soy_dueno: dueno, puedo_decidir: decide };
  return { encendido: true, parado: s.parado, soy_dueno: dueno, puedo_decidir: decide && !o.pruebas, falta_configurar: faltaDe(s),
    ultima_pasada: o.sinNotas ? null : { dia: HOY, pasada: 'tarde', en: iso(18), resultado: s.parado ? 'en_pausa' : 'hecha' },
    tope_mensual_cent: s.tope, tope_propuesto_cent: s.propuesto, tope_propuesto_desde: s.propuesto != null ? iso(20) : null,
    gastado_mes_cent: 0, moneda: o.sinMoneda ? undefined : 'EUR', usd_por_eur: 1.08, trabajos: Object.assign({}, s.trabajos), nivel_ruta: s.nivel, nivel_max: 1, tope_techo_cent: 4000, cupo_dia: 24, notas_hoy: o.sinNotas ? 0 : 9,
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
  // ── paso 0 (20261015194000), núcleo: contesta sin la herramienta y con el módulo apagado. Sin o.ow la base aún no tiene las funciones: 404 PGRST202, como hoy en producción hasta el tren 6 ──
  if (nombre === 'agente_owner_estado' || nombre === 'agente_owner_pon') {
    const w = s.ow;
    if (!w) return err('PGRST202', 'Could not find the function public.' + nombre + ' in the schema cache');
    if (nombre === 'agente_owner_estado') {
      if (w.roto) return err('XX000', 'algo se rompió');
      const ow = PERSONAS.find(u => u.user_id === w.owner), puede = !!w.prop && !o.pruebas;
      const d = { hay_owner: w.owner != null, owner_activo: !!w.owner && !w.inactivo, soy_owner: !!w.owner && w.owner === w.yo, soy_propietario: !!w.prop,
        puedo_poner: puede, owner_nombre: ow ? (o.xss ? XSS : ow.nombre) : null, owner_numero: ow ? ow.numero_usuario : null, cambiado_en: w.cambiado || null,
        cambios_24h: w.cambios || 0, ya_no_eres_owner: !!w.yaNo };
      // candidatos (Backend, 16-oct): activas por nombre, sin la cuenta de pruebas ni las del estudio, sin correo; SOLO con puedo_poner (si no, []).
      // sinCand = la base aún sin ese cambio (la clave no viene); conPruebas = una lista vieja que aún la trae (la base la rechaza al guardar)
      if (!w.sinCand) {
        let lista = PERSONAS.filter(u => w.conPruebas || u.user_id !== PRUEBAS_UID);
        if (o.mismoNombre) lista = lista.concat([{ user_id: U(7004), numero_usuario: 'USR-00004', nombre: 'Dion' }]);
        if (w.conEstudio) lista = lista.concat([{ user_id: ESTUDIO_UID, numero_usuario: 'USR-00005', nombre: 'Javier', es_estudio: true }]);
        lista = lista.map(u => Object.assign({ es_estudio: false }, u));
        if (o.xss) lista = lista.map(u => Object.assign({}, u, { nombre: XSS + ' ' + u.nombre }));
        d.candidatos = !puede || w.candVacio ? [] : (w.candRotos ? 'x' : clon(lista));
      }
      return { data: d, error: null };
    }
    // agente_owner_pon, con las mismas comprobaciones y el mismo orden que la base
    if (o.pruebas) return err('42501', 'la cuenta de pruebas solo mira', 'cuenta_pruebas');
    if (!w.prop) return err('42501', 'solo el propietario', 'solo_propietario');
    if (typeof a.p_motivo !== 'string' || a.p_motivo.trim().length < 3 || a.p_motivo.trim().length > 300) return err('22023', 'di el motivo', 'motivo');
    if (a.p_user_id === PRUEBAS_UID) return err('42501', 'la cuenta de pruebas no puede llevar el AaaS', 'cuenta_pruebas');
    const nuevo = PERSONAS.concat([{ user_id: ESTUDIO_UID, numero_usuario: 'USR-00005', nombre: 'Javier' }]).find(u => u.user_id === a.p_user_id);
    if (!nuevo) return err('22023', 'no es un usuario activo', 'usuario_no_valido');
    const owner = { nombre: nuevo.nombre, numero_usuario: nuevo.numero_usuario };
    if (w.owner === a.p_user_id) return { data: { ok: true, cambia: false, owner, telegram_borrado: false, subida_cancelada: false }, error: null };
    if (w.freno || (w.cambios || 0) >= 3 || (w.cambiado && Date.now() - Date.parse(w.cambiado) < 60e3)) return err('P0001', 'demasiados cambios de dueño seguidos', 'agente_freno');
    const cancela = s.propuesto != null;
    if (cancela) s.propuesto = null;
    w.owner = a.p_user_id; w.cambios = (w.cambios || 0) + 1; w.cambiado = ahoraIso(); w.inactivo = false;
    o.dueno = w.owner === w.yo;   // la ventana y las RPC del AaaS miran al dueño de la ficha
    return { data: { ok: true, cambia: true, owner, telegram_borrado: false, subida_cancelada: cancela }, error: null };
  }
  if (!o.dueno && !o.herramienta) return err('42501', 'agente: sin la herramienta', 'sin_herramienta');
  const soloDueno = () => o.dueno ? null : err('42501', 'solo el owner', 'agente_solo_owner');
  switch (nombre) {
    case 'agente_panel_estado': return o.nulo ? { data: null, error: null } : { data: estado(s), error: null };
    case 'agente_notas_datos':
      if (!s.encendido) return err('42501', 'agente: módulo no activo', 'modulo_apagado');
      if (o.notasRaras) return { data: { notas: 'x' }, error: null };
      return { data: { dia: HOY, hoy: HOY, notas: notas(s), propuestas: propuestas(s), acciones: o.sinAcciones ? undefined : clon(s.acciones), nombres: nombres(s) }, error: null };
    // agente_nota_decide y agente_propuesta_decide: la pantalla ya no las llama (escrituras_sin_llamador); el doble no las conoce y contesta PGRST202
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
      s.fuera = []; s.nivGuardados = true;
      s.acciones.forEach(x => { if (x.estado === 'pendiente' && nivelDe(s, x.modulo) === 0) Object.assign(x, { estado: 'anulada', motivo: 'nivel', decidida_en: ahoraIso(), decidida_por: 'USR-00001' }); });
      cambio(s, ['niveles', 'topes_cent', 'niveles_en'], a.p_motivo);
      return { data: estado(s), error: null };
    }
    case 'agente_ficha_contexto': {
      const e = soloDueno(); if (e) return e;
      if (o.freno) return err('P0001', 'freno', 'agente_freno');   // _agente_freno('contexto') de la base (060500)
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
  // ── panel V2 (15-oct-2026) ──
  if (nombre === 'agente_panel_autonomo' || nombre === 'agente_conexiones_estado') {
    if (!s.encendido) return err('42501', 'agente: módulo no activo', 'modulo_apagado');
    if (o.pruebas) return err('42501', 'agente: la cuenta de pruebas solo mira', 'cuenta_pruebas');
    if (o.v2Roto && nombre === 'agente_panel_autonomo') return err('PGRST202', 'Could not find the function public.' + nombre + ' in the schema cache');
    return { data: nombre === 'agente_panel_autonomo' ? panelV2(s) : clon(s.v2.con), error: null };
  }
  if (nombre === 'agente_palanca') {
    if (a.p_parado === false) { const e = soloDueno(); if (e) return e; }
    if (o.pruebas) return err('42501', 'cuenta de pruebas', 'cuenta_pruebas');
    const vale = a.p_ambito === 'agente' ? s.v2.equipo.some(m => m.agente === a.p_clave) : (a.p_ambito === 'area' ? s.v2.areas.some(x => x.id === a.p_clave) : false);
    if (!vale || typeof a.p_parado !== 'boolean') return { data: { ok: false, motivo: 'clave' }, error: null };
    (a.p_ambito === 'agente' ? s.v2.palAg : s.v2.palArea)[a.p_clave] = a.p_parado;
    return { data: { ok: true, ambito: a.p_ambito, clave: a.p_clave, parado: a.p_parado }, error: null };
  }
  if (nombre === 'agente_conexion_guarda') {
    const e = soloDueno(); if (e) return e;
    if (a.p_proveedor !== 'claude') return { data: { ok: false, motivo: 'proveedor' }, error: null };
    if (!/^sk-ant-[A-Za-z0-9_-]{20,250}$/.test(String(a.p_secreto || ''))) return { data: { ok: false, motivo: 'formato' }, error: null };
    const c = s.v2.con.find(x => x.proveedor === 'claude') || (s.v2.con.push({ proveedor: 'claude', version: 0, ajustes: {} }), s.v2.con[s.v2.con.length - 1]);
    Object.assign(c, { estado: 'sin_comprobar', ultimos4: a.p_secreto.slice(-4), version: c.version + 1, guardada_en: ahoraIso(), ultimo_error: null });
    return { data: { ok: true, proveedor: 'claude', estado: 'sin_comprobar', ultimos4: c.ultimos4, version: c.version }, error: null };
  }
  if (nombre === 'agente_conexion_desconecta') {
    if (o.pruebas) return err('42501', 'cuenta de pruebas', 'cuenta_pruebas');
    const c = s.v2.con.find(x => x.proveedor === a.p_proveedor);
    if (!c) return { data: { ok: false, motivo: 'proveedor' }, error: null };
    Object.assign(c, { estado: 'desconectada', ultimos4: null });
    return { data: { ok: true, proveedor: a.p_proveedor, estado: 'desconectada' }, error: null };
  }
  if (nombre === 'agente_ajuste_altavoz') { const e = soloDueno(); if (e) return e; return altavoz(s, a); }
  return err('PGRST202', 'Could not find the function public.' + nombre + ' in the schema cache');
}

// Sin la cáscara (Tailwind) no hay relleno de página: se pone un margen de 16 px, para que «no desborda» se mida con una caja tan estrecha como la de verdad.
// FUENTES_REALES=1: carga Unbounded/Manrope/IBM Plex Mono de Google Fonts (las de la piel V2; sin ellas el navegador mide con Segoe UI)
const PIEL_MINIMA = '<style>body{margin:0;padding:0 16px}</style>' + (process.env.FUENTES_REALES ? '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Unbounded:wght@500&family=IBM+Plex+Mono&display=swap">' : '');
const pagina = (idioma) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title>${PIEL_MINIMA}</head><body>
${MARCADO}
<script>
window.__xss = undefined; window.__fromLlamado = 0; window.__fetchLlamado = 0; window.__sinTr = []; window.__errores = [];
window.fetch = function () { window.__fetchLlamado++; return Promise.reject(new Error('fetch')); };
var sb = {
  rpc: function (n, a) { return { then: function (f, g) { return window.__srv(n, a || {}).then(f, g); } }; },
  /* el navegador no lee ninguna tabla (la lista del paso 0 viene en agente_owner_estado.candidatos): cualquier .from() cuenta como fallo */
  from: function () { window.__fromLlamado++; throw new Error('el navegador no toca la base'); }
};
/* la sesión como la da guard.js (LW_AUTH.session.user.id): solo el uid de quien mira, para «Lo llevo yo» */
window.LW_AUTH = Promise.resolve({ sb: sb, session: window.__yo ? { user: { id: window.__yo } } : null, ficha: { rol: 'admin', herramientas: ['agente'] } });
window.lwDatos = function (n, a) { if (!/^[a-z][a-z0-9_]*_datos$/.test(n)) throw new Error('lwDatos solo *_datos'); return Promise.resolve(sb.rpc(n, a)).then(function (r) { return { data: r.data, error: r.error }; }); };
window.LW_IDIOMA = '${idioma}';
/* Como en Lawang (i18n.js / i18n_id.json): «Operaciones» ya es Deals/Transaksi y la fusión de agente.html no lo pisa; por eso el papel de Ruta usa 'Operaciones~agente' */
window.LW_EN = { 'Operaciones': 'Deals' }; window.LW_ID = { 'Operaciones': 'Transaksi' };
window.AXW_MAPA_MODULOS = { n: ${JSON.stringify(ROTULOS).replace(/</g, '\\u003c')} };
window.lwLocale = function () { return window.LW_IDIOMA === 'en' ? 'en-GB' : (window.LW_IDIOMA === 'id' ? 'id-ID' : 'es-ES'); };
window.lwT = function (s) { s = String(s); var d = window.LW_IDIOMA === 'en' ? window.LW_EN : (window.LW_IDIOMA === 'id' ? window.LW_ID : null);
  if (d) { if (Object.prototype.hasOwnProperty.call(d, s)) return d[s]; if (!/^[\\s\u2014\u00b70-9.,%():\u2265\u2264-]*$/.test(s)) window.__sinTr.push(s); } var c = s.indexOf('~'); return c < 0 ? s : s.slice(0, c); };
window.lwIdiomaAplicar = function (raiz) { Array.prototype.forEach.call(raiz.querySelectorAll('[data-lwt]'), function (e) { e.textContent = window.lwT(e.textContent); }); };
window.onerror = function (m) { window.__errores.push(String(m)); };
</script>
<script>${SCRIPT.replace(/<\/?script>/g, '')}</script></body></html>`;
// La página se sirve en una URL de verdad (no setContent sobre about:blank): las vistas van por el hash (#equipo, #ajustes-<paso>) y se prueban como en la intranet.
const URL_PAG = 'http://agente.test/intranet/v4/agente/';

// MUESTRA=<json> (opcional): lo que devolvieron agente_panel_estado y agente_notas_datos de una base REAL (el AaaS corrido de punta a punta en Postgres local,
// agencia erp/pruebas/agente_panel_muestra.json: {"estado": {...}, "notas": {...}}). Con él, el arnés solo pinta esa respuesta tal cual, comprueba la forma y saca capturas.
const MUESTRA = (() => {
  if (!process.env.MUESTRA) return null;
  const m = JSON.parse(fs.readFileSync(process.env.MUESTRA, 'utf8'));
  const r = { estado: m.estado || m.agente_panel_estado, notas: m.notas || m.agente_notas_datos };
  if (!r.estado || !r.notas) throw new Error('MUESTRA sin agente_panel_estado/agente_notas_datos (ni estado/notas)');
  return r;
})();
// Las dos RPC que la pantalla dejó de llamar (15-oct, Ajustes como asistente): siguen en la base hasta que Backend las revoque; aquí se mide que NADIE las llama.
const RETIRADAS = Object.keys(FORMA.escrituras_sin_llamador || {}).filter(k => !k.startsWith('_'));
const TODAS = [];
(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  // Con barras de scroll VISIBLES (Playwright las esconde en headless con --hide-scrollbars): a 390 px el contenido mide 390 menos la barra, como en un PC.
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, ignoreDefaultArgs: ['--hide-scrollbars'] });
  async function abre(opts = {}) {
    const base = nuevaBase(opts.base || {});
    TODAS.push(base);
    const ctx = await nav.newContext({ viewport: { width: opts.ancho || 1440, height: opts.alto || 1000 }, reducedMotion: opts.mov || 'no-preference' });
    if (opts.reloj) await ctx.clock.install();   // reloj falso (avanza solo; fastForward salta): la cuenta atrás del freno sin esperar 60 s de verdad
    const ow = (opts.base || {}).ow;
    if (ow && ow.yo && !ow.sinSesion) await ctx.addInitScript(y => { window.__yo = y; }, ow.yo);
    const p = await ctx.newPage();
    await p.exposeFunction('__srv', (n, a) => opts.srv ? opts.srv(base, n, a) : servidor(base, n, a));
    const html = pagina(opts.idioma || 'es');
    await p.route('http://agente.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
    await p.goto(URL_PAG + (opts.hash || ''), { waitUntil: 'load' });
    await p.waitForFunction(() => document.querySelector('[data-ag="carga"]').getAttribute('data-tipo') !== 'cargando', null, { timeout: 5000 });
    if (process.env.FUENTES_REALES) { await p.evaluate(() => Promise.all(['400 15px Manrope', '600 12px Manrope', '700 14px Manrope', '500 20px Unbounded'].map(f => document.fonts.load(f))).then(() => document.fonts.ready)); const faltan = await p.evaluate(() => ['400 15px Manrope', '600 12px Manrope', '700 14px Manrope', '500 20px Unbounded'].filter(f => !document.fonts.check(f))); if (faltan.length) throw new Error('FUENTES_REALES: no han cargado ' + faltan.join(', ')); }
    await p.waitForTimeout(200);
    return { base, p, ctx };
  }
  const txt = (p, sel) => p.$eval(sel, e => e.textContent);
  const visible = (p, sel) => p.$eval(sel, e => !e.classList.contains('axw-oculto') && !e.closest('.axw-oculto') && !e.closest('[hidden]') && e.getClientRects().length > 0);
  const hay = (p, sel) => p.$$(sel).then(x => x.length);
  const llamadas = (b, n) => b.llamadas.filter(x => x[0] === n);
  const hasta = async f => { for (let i = 0; i < 100; i++) { if (f()) return true; await new Promise(r => setTimeout(r, 50)); } return false; };
  const sinInyeccion = async p => (await p.$$('[data-ag="raiz"] img, [data-ag="raiz"] svg:not([data-ag-icono]), [data-ag="raiz"] script')).length === 0 && (await p.evaluate(() => window.__xss)) === undefined;
  const sinErrores = async p => (await p.evaluate(() => window.__errores)).length === 0 && (await p.evaluate(() => window.__fromLlamado + window.__fetchLlamado)) === 0;
  const vista = p => p.$eval('[data-ag="v2"]', e => e.getAttribute('data-vista'));
  const hash = p => p.evaluate(() => location.hash);
  // el hashchange llega en una tarea aparte: tras ver el hash se deja pasar un momento antes de mirar la vista
  const enHash = (p, h) => p.waitForFunction(x => location.hash === x, h, { timeout: 4000 }).then(() => p.waitForTimeout(120)).then(() => true, () => false);
  const pasoVisible = async (p, paso) => visible(p, paso === 'listo' ? '[data-ag="aj-listo"]' : '[data-ag="aj-f-' + paso + '"]');
  const foco = p => p.evaluate(() => document.activeElement ? document.activeElement.id : '');
  const estadoRuta = p => p.evaluate(() => ({ hash: location.hash, vista: document.querySelector('[data-ag="v2"]').getAttribute('data-vista'), foco: document.activeElement ? document.activeElement.id || document.activeElement.tagName : '',
    pasos: Array.from(document.querySelectorAll('[data-ag^="aj-f-"],[data-ag="aj-listo"]')).filter(e => !e.hidden).map(e => e.getAttribute('data-ag')), errores: window.__errores.slice(0, 3) }));
  const MOTIVO = { tope: 'Asistente de Ajustes: tope', negocio: 'Asistente de Ajustes: tu negocio', limites: 'Asistente de Ajustes: límites',
                   trabajos: 'Asistente de Ajustes: trabajos', subida: 'Asistente de Ajustes: cancelar la subida' };
  const enviar = (p, paso) => p.click('[data-ag="aj-f-' + paso + '"] button[type="submit"]:not(.axw-oculto)');
  const tocaRuta = p => p.click('label[for="ag2-aj-nivel"]');
  const abreTrab = p => p.$eval('[data-ag="aj-trab-mas"]', e => e.open).then(o => o ? null : p.click('[data-ag="aj-trab-cuenta"]'));

  if (MUESTRA) {
    for (const [idioma, ancho] of [['es', 1440], ['es', 390], ['id', 1440], ['id', 390], ['en', 1440]]) {
      const srv = async (b, n, a) => { b.llamadas.push([n, a]); return n === 'agente_panel_estado' ? { data: MUESTRA.estado, error: null } : (n === 'agente_notas_datos' ? { data: MUESTRA.notas, error: null } : err('42501', 'solo lectura en la muestra')); };
      const { p, ctx } = await abre({ idioma, ancho, base: { dueno: true }, srv, hash: '#ajustes-limites' });
      ok('muestra ' + idioma + ' ' + ancho + ' · la respuesta real se pinta sin error de forma', (await p.$eval('[data-ag="carga"]', e => e.getAttribute('data-tipo'))) === 'listo');
      ok('muestra ' + idioma + ' ' + ancho + ' · una fila por límite (' + MUESTRA.estado.limites.length + ') y sin «no se ha podido mirar»',
         (await hay(p, '[data-ag="aj-lim"]')) === MUESTRA.estado.limites.length && !(await visible(p, '[data-ag="aj-lim-error"]')));
      const sin = await p.evaluate(() => window.__sinTr);
      ok('muestra ' + idioma + ' ' + ancho + ' · nada sin traducir', sin.length === 0, J(sin.slice(0, 4)));
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      ok('muestra ' + idioma + ' ' + ancho + ' · no desborda', m.sw <= m.cw, J(m));
      if (SHOT) await p.screenshot({ path: SHOT + '_muestra_' + idioma + '_' + ancho + '.png', fullPage: true });
      await ctx.close();
    }
    await nav.close();
    console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\nTODO EN VERDE');
    process.exit(fallos ? 1 : 0);
  }

  // 1. el dueño, todo configurado: vista «Equipo»; «Esperan tu OK» dentro de «Lo que han hecho»
  {
    const { p, base, ctx } = await abre({ base: { dueno: true } });
    ok('sin hash: vista «Equipo», con su pestaña marcada; Ajustes escondido', (await vista(p)) === 'equipo' && (await p.$eval('[data-ag="v2-tab-equipo"]', e => e.getAttribute('aria-current'))) === 'page'
       && !(await visible(p, '[data-ag="v2-ajustes"]')) && (await visible(p, '[data-ag="v2-cuerpo"]')));
    ok('ningún bloque viejo en la página', (await hay(p, '[data-ag^="bloque-"]')) === 0);
    ok('pide el estado y las notas (p_dia null), una vez cada uno', llamadas(base, 'agente_panel_estado').length === 1 && J(llamadas(base, 'agente_notas_datos')[0][1]) === J({ p_dia: null }));
    ok('«Esperan tu OK»: visible, con las 2 pendientes sin caducar (la vencida no sale), las más nuevas primero',
       (await visible(p, '[data-ag="v2-esperan"]')) && J(await p.$$eval('[data-ag="v2-esperan"] [data-ag="accion"]', e => e.map(x => x.getAttribute('data-id')))) === J(['102', '101']));
    ok('«Esperan tu OK» dice el módulo en nivel 1 (por su rótulo) y cada acción su reserva, módulo y caducidad',
       (await txt(p, '[data-ag="v2-esperan-desc"]')).includes(ROTULOS['reservas-producto'][0]) && (await txt(p, '[data-ag="accion"][data-id="101"]')).includes('Aviso en la reserva R-0012: moto en el taller')
       && (await txt(p, '[data-ag="accion"][data-id="101"]')).includes('Caduca el'));
    ok('una reserva sin número no enseña el uuid', (await txt(p, '[data-ag="accion"][data-id="102"]')).includes('(sin número en este sistema)') && !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(await txt(p, '[data-ag="v2-esperan"]')));
    ok('el aviso de arriba cuenta 2 y enlaza a #esperan-ok', (await txt(p, '[data-ag="pendientes"]')).includes('Tu equipo propone 2 acciones que esperan tu decisión.') && (await hay(p, '[data-ag="ir-acciones"][href="#esperan-ok"]')) === 1);
    await p.click('[data-ag="ir-acciones"]');
    ok('el enlace lleva a «Esperan tu OK» sin cambiar de vista', (await enHash(p, '#esperan-ok')) && (await vista(p)) === 'equipo' && (await foco(p)) === 'esperan-ok');
    await p.dblclick('[data-ag="accion"][data-id="101"] [data-accion="ag-acc-aceptar"]');
    await p.click('[data-ag="accion"][data-id="101"] [data-accion="ag-acc-rechazar"]', { force: true, timeout: 500 }).catch(() => {});
    await hasta(() => llamadas(base, 'agente_accion_decide').length >= 1);
    await p.waitForFunction(() => document.querySelector('[data-ag="v2-ok"]').textContent === 'Acción aceptada y hecha.', null, { timeout: 4000 }).catch(() => {});
    ok('doble clic en Aceptar (y un Rechazar encima) manda UNA sola decisión, con id y decisión', llamadas(base, 'agente_accion_decide').length === 1 && J(llamadas(base, 'agente_accion_decide')[0][1]) === J({ p_id: 101, p_decision: 'aceptada' }), J(llamadas(base, 'agente_accion_decide')));
    ok('aceptada: «Acción aceptada y hecha.» y sale de la lista', (await txt(p, '[data-ag="v2-ok"]')) === 'Acción aceptada y hecha.' && (await hay(p, '[data-ag="accion"][data-id="101"]')) === 0);
    await p.click('[data-ag="accion"][data-id="102"] [data-accion="ag-acc-rechazar"]');
    await p.waitForFunction(() => document.querySelector('[data-ag="v2-ok"]').textContent === 'Acción rechazada.', null, { timeout: 4000 }).catch(() => {});
    ok('rechazar: manda la decisión; sin pendientes, con un módulo en nivel 1, la caja sigue y dice «Nada esperando tu OK»',
       J(llamadas(base, 'agente_accion_decide')[1][1]) === J({ p_id: 102, p_decision: 'rechazada' }) && (await visible(p, '[data-ag="v2-esperan"]'))
       && (await hay(p, '[data-ag="v2-esperan-vacio"]')) === 1 && !(await visible(p, '[data-ag="pendientes"]')));
    ok('nadie llama a ' + RETIRADAS.join(' ni a '), RETIRADAS.length === 2 && RETIRADAS.every(n => llamadas(base, n).length === 0));
    ok('sin errores de JS, sin fetch y sin .from()', await sinErrores(p));
    await ctx.close();
  }
  // 1b. CASO NEGATIVO: con un módulo en nivel 1, su propuesta aparece; sin nivel 1 y sin nada pendiente, la caja no estorba
  {
    const { p, ctx } = await abre({ base: { dueno: true, sinNivel1: true, sinPendientes: true } });
    ok('sin módulo en nivel 1 y sin nada pendiente: «Esperan tu OK» no se enseña', !(await visible(p, '[data-ag="v2-esperan"]')));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, sinNivel1: true, soloFacturasNivel1: true } });
    ok('con facturas en nivel 1 y su acción pendiente: la propuesta APARECE, con Aceptar y Rechazar, y la caja nombra el módulo',
       (await visible(p, '[data-ag="v2-esperan"]')) && (await hay(p, '[data-ag="accion"][data-id="201"]')) === 1
       && (await hay(p, '[data-ag="accion"][data-id="201"] [data-accion="ag-acc-aceptar"]')) === 1 && (await txt(p, '[data-ag="v2-esperan-desc"]')).includes(ROTULOS.facturas[0]));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, notasRaras: true } });
    ok('notas ilegibles: «Esperan tu OK» dice «no se ha podido mirar» (no «nada esperando»)', (await txt(p, '[data-ag="v2-esperan-error"]')).includes('no se ha podido mirar') && (await hay(p, '[data-ag="v2-esperan-vacio"]')) === 0);
    await ctx.close();
  }
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, anulaDatos: true } });
    await p.click('[data-ag="accion"][data-id="101"] [data-accion="ag-acc-aceptar"]');
    await hasta(() => llamadas(base, 'agente_accion_decide').length === 1);
    await p.waitForFunction(() => document.querySelector('[data-ag="v2-ok"]').textContent.length > 0, null, { timeout: 4000 }).catch(() => {});
    ok('anulada por datos → «No se ha hecho: ya no se cumplía.» (aviso, no éxito)', (await txt(p, '[data-ag="v2-ok"]')) === 'No se ha hecho: ya no se cumplía.' && (await p.$eval('[data-ag="v2-ok"]', e => e.getAttribute('data-tono'))) === 'neutro');
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, yaDecidida: true } });
    await p.click('[data-ag="accion"][data-id="101"] [data-accion="ag-acc-aceptar"]');
    await p.waitForFunction(() => document.querySelector('[data-ag="v2-ok"]').textContent.length > 0, null, { timeout: 4000 }).catch(() => {});
    ok('ya decidida por otro → lo dice y la saca de la lista', (await txt(p, '[data-ag="v2-ok"]')).includes('Alguien ya lo decidió') && (await hay(p, '[data-ag="accion"][data-id="101"]')) === 0);
    await ctx.close();
  }
  // 2. con la herramienta pero sin ser dueño
  {
    const { p, ctx } = await abre({ base: { herramienta: true }, hash: '#ajustes-tope' });
    ok('no dueño: ve las acciones sin botones y que las decide el dueño', (await hay(p, '[data-ag="v2-esperan"] [data-ag="accion"]')) === 2 && (await hay(p, '[data-accion="ag-acc-aceptar"]')) === 0
       && (await txt(p, '[data-ag="v2-esperan-desc"]')).includes('la persona que lleva el equipo'));
    ok('no dueño: los 4 pasos y el paso 0 en solo lectura (fieldset deshabilitado) y dice por qué; sin zona de apagar',
       (await p.$$eval('[data-ag^="aj-fs-"]', e => e.length === 5 && e.every(f => f.disabled))) && (await visible(p, '[data-ag="aj-solo-dueno"]')) && (await txt(p, '[data-ag="aj-solo-dueno"]')) === 'Esto lo configura la persona que lleva el equipo.' && !(await visible(p, '[data-ag="v2-apagar"]')));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true, nuevo: true }, hash: '#ajustes-tope' });
    ok('no dueño con el tope en 0: no ve «Usar …» (no podría usarlo)', !(await visible(p, '[data-ag="aj-tope-sugerido"]')));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, v2Roto: true } });
    ok('el panel del equipo no se puede leer: «Apagar a tu equipo» sigue a la vista (no vive dentro del panel)', (await visible(p, '[data-ag="v2-apagar"]')) && !(await visible(p, '[data-ag="v2-cuerpo"]')),
       J({ apagar: await visible(p, '[data-ag="v2-apagar"]'), cuerpo: await visible(p, '[data-ag="v2-cuerpo"]') }));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true, propuesto: true }, hash: '#ajustes-tope' });
    ok('no dueño con subida pendiente: la ve, pero sin «Cancelar la subida»', (await visible(p, '[data-ag="aj-subida"]')) && !(await visible(p, '[data-ag="aj-cancelar-subida"]')));
    await ctx.close();
  }
  // 3. «Falta X» con su botón, y la ruta por hash con foco
  // la base de cada caso es coherente con lo que falta (desde cero se recalcula como _agente_setup_estado)
  for (const [falta, paso, b] of [['tope_aaas', 'tope', { nuevo: true }], ['contexto_aaas', 'negocio', { nuevo: true, conTope: true }], ['limites_aaas', 'limites', { falta: 'limites_aaas' }]]) {
    const { p, ctx } = await abre({ base: Object.assign({ dueno: true }, b) });
    ok('falta ' + falta + ': el aviso lo dice y su botón abre #ajustes-' + paso, (await visible(p, '[data-ag="v2-falta"]')) && (await txt(p, '[data-ag="v2-falta-txt"]')).includes('Tu equipo no empieza hasta completarlo.')
       && (await p.$eval('[data-ag="v2-falta-ir"]', e => e.getAttribute('href'))) === '#ajustes-' + paso && (await visible(p, '[data-ag="v2-falta-ir"]')));
    await p.click('[data-ag="v2-falta-ir"]');
    ok('falta ' + falta + ': el botón cambia a Ajustes, enseña SOLO ese paso y le pone el foco', (await enHash(p, '#ajustes-' + paso)) && (await vista(p)) === 'ajustes' && (await pasoVisible(p, paso))
       && (await p.$$eval('[data-ag^="aj-f-"]', e => e.filter(x => !x.hidden).length)) === 1 && (await foco(p)) === 'ag2-aj-h-' + paso, J(await estadoRuta(p)));
    ok('falta ' + falta + ': la pestaña Ajustes marcada y el paso con «Falta» en la barra de pasos', (await p.$eval('[data-ag="v2-tab-ajustes"]', e => e.getAttribute('aria-current'))) === 'page'
       && (await p.$eval('[data-ag="aj-ir"][data-paso="' + paso + '"]', e => e.getAttribute('data-st'))) === 'falta');
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true, falta: 'contexto_aaas' } });
    ok('falta y no dueño: dice qué falta y que lo completa el dueño, sin botón', (await txt(p, '[data-ag="v2-falta-txt"]')).includes('Lo completa la persona que lleva el equipo.') && !(await visible(p, '[data-ag="v2-falta-ir"]')));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true }, hash: '#ajustes' });
    ok('#ajustes con todo hecho → la pantalla final (#ajustes-listo) «Tu equipo ya trabaja»', (await hash(p)) === '#ajustes-listo' && (await pasoVisible(p, 'listo')) && (await txt(p, '[data-ag="aj-listo-t"]')) === 'Tu equipo ya trabaja');
    await p.waitForFunction(() => document.querySelectorAll('[data-ag="aj-listo-primero"] li').length > 0, null, { timeout: 4000 }).catch(() => {});
    ok('la pantalla final dice lo primero que hará cada uno de los 6 agentes', (await hay(p, '[data-ag="aj-listo-primero"] li')) === 6 && (await txt(p, '[data-ag="aj-listo-primero"]')).includes('Capitán'));
    ok('final: «Ver el equipo» es el botón principal, «Elegir los trabajos» el fantasma, y un punto lima delante del título',
       (await p.$eval('[data-ag="aj-listo-equipo"]', e => e.className)) === 'ag2-btn' && (await p.$eval('[data-ag="aj-listo-trabajos"]', e => e.className)) === 'ag2-btn2'
       && (await p.$eval('[data-ag="aj-listo-h"]', e => e.getAttribute('data-st'))) === 'ok' && (await p.$eval('[data-ag="aj-listo-h"] .ag2-dot', e => getComputedStyle(e).backgroundColor)) === 'rgb(200, 240, 74)');
    await p.click('[data-ag="aj-listo-equipo"]');
    ok('«Ver el equipo» vuelve a la vista Equipo', (await enHash(p, '#equipo')) && (await vista(p)) === 'equipo', J(await estadoRuta(p)));
    await p.goBack();
    ok('atrás del navegador vuelve a Ajustes', (await enHash(p, '#ajustes-listo')) && (await vista(p)) === 'ajustes');
    await ctx.close();
  }
  // 4. el asistente de punta a punta, desde cero (tope 0, sin contexto, sin límites): 3 guardados, 1 campo tecleado, ningún motivo
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, nuevo: true }, hash: '#ajustes' });
    ok('desde cero: #ajustes abre el paso 1 (el primero que falta)', (await hash(p)) === '#ajustes-tope' && (await pasoVisible(p, 'tope')));
    ok('tope: vacío y SIN pista dentro del campo (M1: el «40» gris se leía como escrito); debajo, «Usar 40,00 EUR» con el sugerido de la base, y la ayuda dice las 24 h',
       (await p.$eval('[data-campo="aj-tope"]', e => e.value)) === '' && !(await p.$eval('[data-campo="aj-tope"]', e => e.hasAttribute('placeholder')))
       && (await visible(p, '[data-ag="aj-tope-sugerido"]')) && (await txt(p, '[data-ag="aj-tope-sugerido"]')) === 'Usar 40,00 EUR'
       && (await txt(p, '[data-ag="aj-tope-ayuda"]')).includes('Sugerido') && (await txt(p, '[data-ag="aj-tope-ayuda"]')).includes('24 h'), await txt(p, '[data-ag="aj-tope-sugerido"]'));
    await enviar(p, 'tope');
    ok('tope vacío: no se manda, dice cuánto escribir (con el sugerido de ejemplo, no «0»), el error va ligado al campo y le da el foco', llamadas(base, 'agente_ficha_ajusta').length === 0 && (await foco(p)) === 'ag2-aj-tope'
       && (await p.$eval('[data-campo="aj-tope"]', e => e.getAttribute('aria-invalid'))) === 'true' && (await txt(p, '[data-ag="aj-msg-tope"]')) === 'Escribe cuánto pueden gastar al mes, por ejemplo 40.', await txt(p, '[data-ag="aj-msg-tope"]'));
    ok('tope vacío: «Si lo saltas» pasa a ámbar (data-vacio en el paso); sin intentarlo no lo estaba',
       (await p.$eval('[data-ag="aj-f-tope"]', e => e.getAttribute('data-vacio'))) === '1' && (await p.$eval('[data-ag="aj-f-tope"] [data-salta] dt', e => getComputedStyle(e).color)) === 'rgb(255, 176, 143)');
    await p.click('[data-accion="ag-aj-tope-sugerido"]');
    ok('«Usar» quita el ámbar con el error', !(await p.$eval('[data-ag="aj-f-tope"]', e => e.hasAttribute('data-vacio'))));
    ok('«Usar 40,00 EUR» rellena el campo (sin guardar), quita el error y se esconde', (await p.$eval('[data-campo="aj-tope"]', e => e.value)) === '40' && llamadas(base, 'agente_ficha_ajusta').length === 0
       && !(await visible(p, '[data-ag="aj-msg-tope"]')) && !(await p.$eval('[data-campo="aj-tope"]', e => e.hasAttribute('aria-invalid'))) && !(await visible(p, '[data-ag="aj-tope-sugerido"]')));
    ok('tope: la etiqueta lleva la moneda de la base', (await txt(p, '[data-ag="aj-tope-etq"]')).includes('(EUR)'));
    await enviar(p, 'tope');
    await hasta(() => llamadas(base, 'agente_ficha_ajusta').length === 1);
    ok('tope: manda el tope en céntimos y null en trabajos y nivel, con el motivo de la pantalla', J(llamadas(base, 'agente_ficha_ajusta')[0][1]) === J({ p_tope_mensual_cent: 4000, p_trabajos: null, p_nivel_ruta: null, p_motivo: MOTIVO.tope }), J(llamadas(base, 'agente_ficha_ajusta')[0]));
    ok('tope guardado → paso 2 con el foco en su título', (await enHash(p, '#ajustes-negocio')) && (await pasoVisible(p, 'negocio')) && (await foco(p)) === 'ag2-aj-h-negocio'
       && (await txt(p, '[data-ag="aj-ok"]')).includes('guardado'), J(Object.assign(await estadoRuta(p), { ok: await txt(p, '[data-ag="aj-ok"]') })));
    await p.goBack();
    ok('tras guardar (pushState), «atrás» vuelve al paso anterior', (await enHash(p, '#ajustes-tope')) && (await pasoVisible(p, 'tope')));
    await p.goForward();
    await enHash(p, '#ajustes-negocio');
    await enviar(p, 'negocio');
    ok('negocio vacío: no se manda, dice qué falta y el foco va a «quién»', llamadas(base, 'agente_ficha_contexto').length === 0 && (await txt(p, '[data-ag="aj-msg-negocio"]')).includes('Escribe quién es el negocio')
       && (await foco(p)) === 'ag2-aj-quien');
    ok('negocio: la pista «Una o dos frases…» a la vista y el contador escondido hasta teclear', (await visible(p, '#ag2-aj-quien-pista')) && (await txt(p, '#ag2-aj-quien-pista')) === 'Una o dos frases: qué hacéis y dónde.'
       && !(await visible(p, '[data-ag="cuenta-ctx_quien"]')) && !(await p.$eval('[data-campo="ctx_quien"]', e => e.hasAttribute('placeholder'))));
    await p.fill('[data-campo="ctx_quien"]', 'Alquiler de motos\nen Canggu');
    ok('al teclear, el contador aparece', await visible(p, '[data-ag="cuenta-ctx_quien"]'));
    ok('el contador de caracteres se mueve al escribir', (await txt(p, '[data-ag="cuenta-ctx_quien"]')) === '27 de 600 caracteres');
    await enviar(p, 'negocio');
    await hasta(() => llamadas(base, 'agente_ficha_contexto').length === 1);
    ok('negocio: claves vacías no viajan y el salto de línea pasa a espacio', J(llamadas(base, 'agente_ficha_contexto')[0][1]) === J({ p_contexto: { quien: 'Alquiler de motos en Canggu' }, p_motivo: MOTIVO.negocio }), J(llamadas(base, 'agente_ficha_contexto')[0][1]));
    ok('negocio guardado → paso 3 (límites), con lo recomendado a la vista y sin selectores', (await enHash(p, '#ajustes-limites')) && (await pasoVisible(p, 'limites'))
       && (await txt(p, '[data-ag="aj-lim-lista"]')).includes('Recomendado') && (await p.$$eval('[data-ag="aj-f-limites"] select', e => e.filter(s => s.getClientRects().length).length)) === 0);
    await p.dblclick('[data-accion="ag-aj-recomendado"]');
    await hasta(() => llamadas(base, 'agente_ficha_limites').length >= 1);
    await enHash(p, '#ajustes-listo');
    ok('doble clic en «Usar lo recomendado»: UNA escritura (el botón sigue ocupado hasta releer)', llamadas(base, 'agente_ficha_limites').length === 1, String(llamadas(base, 'agente_ficha_limites').length));
    ok('«Usar lo recomendado»: nivel 2 en TODOS los módulos de `limites`, sin topes', J(llamadas(base, 'agente_ficha_limites')[0][1]) === J({ p_niveles: { 'reservas-producto': 2, facturas: 2, 'modulo-sin-rotulo': 2 }, p_topes: {}, p_motivo: MOTIVO.limites }), J(llamadas(base, 'agente_ficha_limites')[0][1]));
    await p.waitForFunction(() => document.querySelectorAll('[data-ag="aj-listo-primero"] li').length > 0, null, { timeout: 4000 }).catch(() => {});
    ok('B1: con el tope subido desde 0 la pantalla final NO dice «ya trabaja»: «Tu equipo empieza el <fecha>», que hasta entonces no gasta y por qué tarda 24 h',
       (await enHash(p, '#ajustes-listo')) && (await pasoVisible(p, 'listo')) && (await txt(p, '[data-ag="aj-listo-t"]')).startsWith('Tu equipo empieza el ')
       && (await txt(p, '[data-ag="aj-listo-txt"]')).startsWith('Hasta entonces no gasta nada.') && (await txt(p, '[data-ag="aj-listo-txt"]')).includes('protección por si alguien entra en tu cuenta'), await txt(p, '[data-ag="aj-listo-t"]'));
    ok('B1: la lista dice «Lo primero que hará:» (la fecha solo en el título) y no nombra a Ruta (su revisión nace apagada: nivel_ruta 0)', (await txt(p, '[data-ag="aj-listo-primero-t"]')) === 'Lo primero que hará:'
       && (await hay(p, '[data-ag="aj-listo-primero"] li')) === 5 && !(await txt(p, '[data-ag="aj-listo-primero"]')).includes('Ruta'), await txt(p, '[data-ag="aj-listo-primero"]'));
    ok('los 3 pasos obligatorios marcados «Hecho»', J(await p.$$eval('[data-ag="aj-ir"]', e => e.map(a => a.getAttribute('data-st')))) === J(['hecho', 'hecho', 'hecho', 'opcional']));
    ok('de punta a punta: 3 escrituras, ningún campo de motivo en la página', base.llamadas.filter(x => /^agente_ficha_/.test(x[0])).length === 3 && (await hay(p, '[data-campo^="motivo"]')) === 0);
    await ctx.close();
  }
  // 4b. lo que no cambió no viaja (el freno de la base no salta por repetir)
  {
    const { p, base, ctx } = await abre({ base: { dueno: true }, hash: '#ajustes-tope' });
    ok('tope: lo guardado (37) en el campo, con el separador del idioma', (await p.$eval('[data-campo="aj-tope"]', e => e.value)) === '37');
    await enviar(p, 'tope');
    ok('tope sin cambiar: no escribe y pasa al siguiente (aquí, la pantalla final)', (await enHash(p, '#ajustes-listo')) && llamadas(base, 'agente_ficha_ajusta').length === 0);
    await p.goto(URL_PAG + '#ajustes-negocio'); await p.waitForTimeout(300);
    await enviar(p, 'negocio');
    ok('negocio sin cambiar: no escribe', (await enHash(p, '#ajustes-listo')) && llamadas(base, 'agente_ficha_contexto').length === 0);
    await ctx.close();
  }
  // 4c. el tope: errores, separador del idioma y subida pendiente
  for (const [valor, frase] of [['0', 'Con 0'], ['50', 'Como mucho'], ['abc', 'Escribe el importe con cifras'], ['', 'Escribe cuánto pueden gastar al mes']]) {
    const { p, base, ctx } = await abre({ base: { dueno: true }, hash: '#ajustes-tope' });
    await p.fill('[data-campo="aj-tope"]', valor); await enviar(p, 'tope');
    ok('tope «' + valor + '»: no se manda y dice «' + frase + '»', llamadas(base, 'agente_ficha_ajusta').length === 0 && (await txt(p, '[data-ag="aj-msg-tope"]')).includes(frase), await txt(p, '[data-ag="aj-msg-tope"]'));
    await ctx.close();
  }
  for (const [idioma, valor, cent] of [['id', '37,5', 3750], ['es', '37,5', 3750], ['en', '37.5', 3750], ['id', '1.000', null]]) {
    const { p, base, ctx } = await abre({ idioma, base: { dueno: true }, hash: '#ajustes-tope' });
    await p.fill('[data-campo="aj-tope"]', valor); await enviar(p, 'tope');
    if (cent) {
      await hasta(() => llamadas(base, 'agente_ficha_ajusta').length === 1);
      ok('tope en ' + idioma + ' «' + valor + '» → ' + cent + ' céntimos', llamadas(base, 'agente_ficha_ajusta').length === 1 && llamadas(base, 'agente_ficha_ajusta')[0][1].p_tope_mensual_cent === cent, J(llamadas(base, 'agente_ficha_ajusta')));
    } else ok('tope en ' + idioma + ' «' + valor + '» = mil (separador de miles del idioma): pasa del máximo y no se manda', llamadas(base, 'agente_ficha_ajusta').length === 0 && (await visible(p, '[data-ag="aj-msg-tope"]')));
    await ctx.close();
  }
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, propuesto: true }, hash: '#ajustes-tope' });
    ok('subida pendiente: se dice con su fecha', (await visible(p, '[data-ag="aj-subida"]')) && (await txt(p, '[data-ag="aj-subida-txt"]')).includes('Hay una subida pendiente'));
    await p.click('[data-accion="ag-aj-cancelar-subida"]');
    ok('«Cancelar la subida» pide confirmación y dice con qué tope se queda', llamadas(base, 'agente_ficha_ajusta').length === 0 && (await txt(p, '.axw-modal')).includes('El tope se queda en') && (await txt(p, '.axw-modal')).includes('no entrará'));
    await p.click('[data-accion="ag-modal-confirmar"]');
    await hasta(() => llamadas(base, 'agente_ficha_ajusta').length === 1);
    ok('«Cancelar la subida»: manda el tope VIGENTE explícito y null en trabajos y nivel', J(llamadas(base, 'agente_ficha_ajusta')[0][1]) === J({ p_tope_mensual_cent: 3700, p_trabajos: null, p_nivel_ruta: null, p_motivo: MOTIVO.subida }), J(llamadas(base, 'agente_ficha_ajusta')[0][1]));
    await p.waitForFunction(() => document.querySelector('[data-ag="aj-ok"]').textContent.includes('Subida cancelada'), null, { timeout: 4000 }).catch(() => {});
    ok('cancelada: la subida desaparece y el tope sigue igual', !(await visible(p, '[data-ag="aj-subida"]')) && base.tope === 3700 && base.propuesto === null && (await txt(p, '[data-ag="aj-ok"]')).includes('Subida cancelada'));
    await ctx.close();
  }
  // 4d. límites: «Ajustar por módulo», lo de fuera, los errores de la base
  {
    const { p, base, ctx } = await abre({ base: { dueno: true }, hash: '#ajustes-limites' });
    ok('límites hechos: cada módulo dice su nivel de ahora, por su rótulo (sin rótulo, su id en llano: «Modulo sin rotulo»)', J(await p.$$eval('[data-ag="aj-lim"]', e => e.map(x => x.getAttribute('data-modulo')))) === J(['reservas-producto', 'facturas', 'modulo-sin-rotulo'])
       && (await txt(p, '[data-ag="aj-lim-lista"]')).includes('Ahora') && (await txt(p, '[data-ag="aj-lim"][data-modulo="modulo-sin-rotulo"] b')) === 'Modulo sin rotulo' && !(await txt(p, '[data-ag="aj-lim-lista"]')).includes('modulo-sin-rotulo'));
    ok('límites con algo que enseñar: sin la salida «Ver el equipo» (no es un callejón)', !(await visible(p, '[data-ag="aj-lim-salida"]')));
    ok('límites: aviso SOLO en la fila cuyo nivel efectivo no es el guardado, y lo de fuera se nombra', J(await p.$$eval('[data-ag="limite-aviso"]', e => e.map(x => x.closest('[data-ag="aj-lim"]').getAttribute('data-modulo')))) === J(['facturas'])
       && (await txt(p, '[data-ag="aj-lim-fuera"]')).includes(ROTULOS.obra[0]));
    await p.click('[data-accion="ag-aj-ajustar"]');
    ok('«Ajustar por módulo»: aparece un selector por módulo con lo guardado y el botón de guardar', (await p.$eval('[data-accion="ag-aj-ajustar"]', e => e.getAttribute('aria-expanded'))) === 'true'
       && J(await p.$$eval('[data-limite="nivel"]', e => e.filter(s => s.getClientRects().length).map(x => x.value))) === J(['1', '2', '0']) && (await visible(p, '[data-ag="aj-lim-guardar"]'))
       && !(await visible(p, '[data-accion="ag-aj-recomendado"]')));
    await p.selectOption('[data-modulo="modulo-sin-rotulo"] [data-limite="nivel"]', '0');
    await p.click('[data-ag="aj-ir"][data-paso="tope"]'); await enHash(p, '#ajustes-tope');
    await p.click('[data-ag="aj-ir"][data-paso="limites"]'); await enHash(p, '#ajustes-limites');
    ok('salir de Límites a mitad y volver: lo elegido sin guardar se descarta y la vista vuelve a «Ahora: …»', (await p.$$eval('[data-ag="aj-f-limites"] select', e => e.filter(s => s.getClientRects().length).length)) === 0
       && (await txt(p, '[data-ag="aj-lim-lista"]')).includes('Ahora') && llamadas(base, 'agente_ficha_limites').length === 0);
    await p.click('[data-accion="ag-aj-ajustar"]');
    await p.selectOption('[data-modulo="modulo-sin-rotulo"] [data-limite="nivel"]', '3');
    await p.click('[data-ag="aj-lim-guardar"]');
    await hasta(() => llamadas(base, 'agente_ficha_limites').length === 1);
    ok('límites: manda TODAS las filas (nunca lo de fuera) y los topes guardados tal cual', J(llamadas(base, 'agente_ficha_limites')[0][1]) === J({ p_niveles: { 'reservas-producto': 1, facturas: 2, 'modulo-sin-rotulo': 3 }, p_topes: { facturas: 1500 }, p_motivo: MOTIVO.limites }), J(llamadas(base, 'agente_ficha_limites')[0][1]));
    ok('límites guardados: el aviso y lo de fuera desaparecen', (await enHash(p, '#ajustes-listo')) && (await hay(p, '[data-ag="limite-aviso"]')) === 0 && !(await visible(p, '[data-ag="aj-lim-fuera"]')));
    await ctx.close();
  }
  for (const [o, frase] of [[{ moduloFuera: true }, 'ya no admite límites'], [{ sumaTopes: true }, 'pasa del tope mensual'], [{ freno: true }, 'Podrás guardar en 60 s: lo escrito se queda.']]) {
    const { p, ctx } = await abre({ base: Object.assign({ dueno: true }, o), hash: '#ajustes-limites' });
    await p.click('[data-accion="ag-aj-recomendado"]');
    await p.waitForSelector('[data-ag="aj-msg-limites"]:not(.axw-oculto)', { timeout: 4000 }).catch(() => {});
    ok('límites ' + Object.keys(o)[0] + ': la base lo rechaza y se dice en el paso («' + frase + '»), sin salir de él', (await txt(p, '[data-ag="aj-msg-limites"]')).includes(frase) && (await hash(p)) === '#ajustes-limites', await txt(p, '[data-ag="aj-msg-limites"]'));
    await ctx.close();
  }
  // 4d-bis. M2: el freno (1 cambio por minuto) cuenta atrás desde el último guardado, el botón se reactiva SOLO y no reenvía; lo escrito se queda
  {
    const { p, base, ctx } = await abre({ base: { dueno: true }, hash: '#ajustes-negocio', reloj: true });
    await p.fill('[data-campo="ctx_quien"]', 'Alquiler de motos en Canggu y Uluwatu');
    await enviar(p, 'negocio');
    await hasta(() => llamadas(base, 'agente_ficha_contexto').length === 1);
    await enHash(p, '#ajustes-listo');
    await p.clock.fastForward(20000);
    base.o.freno = true;   // la base frena el segundo cambio de «contexto» antes del minuto
    await p.goto(URL_PAG + '#ajustes-negocio'); await p.waitForTimeout(300);
    await p.fill('[data-campo="ctx_quien"]', 'Alquiler de motos en Canggu, Uluwatu y Ubud');
    await enviar(p, 'negocio');
    await p.waitForSelector('[data-ag="aj-msg-negocio"]:not(.axw-oculto)', { timeout: 4000 }).catch(() => {});
    const m1 = await txt(p, '[data-ag="aj-msg-negocio"]');
    const btn = '[data-ag="aj-f-negocio"] button[type="submit"]';
    ok('M2: «Podrás guardar en N s: lo escrito se queda», con el botón apagado y lo tecleado intacto', /^Podrás guardar en \d+ s: lo escrito se queda\.$/.test(m1) && (await p.$eval(btn, e => e.disabled))
       && (await p.$eval('[data-campo="ctx_quien"]', e => e.value)) === 'Alquiler de motos en Canggu, Uluwatu y Ubud',
       J({ m1, llamadas: llamadas(base, 'agente_ficha_contexto').length, ruta: await estadoRuta(p), valor: await p.$eval('[data-campo="ctx_quien"]', e => e.value) }));
    await p.clock.fastForward(5000);
    const m2 = await txt(p, '[data-ag="aj-msg-negocio"]');
    ok('M2: la cuenta baja y el aviso deja de leerse en voz alta cada segundo (aria-live off tras el primero)', Number((m2.match(/\d+/) || [99])[0]) < Number((m1.match(/\d+/) || [0])[0])
       && (await p.$eval('[data-ag="aj-msg-negocio"]', e => e.getAttribute('aria-live'))) === 'off', m1 + ' → ' + m2);
    await p.clock.fastForward(61000);
    await p.waitForTimeout(100);
    ok('M2: a los 0 s el aviso se va y el botón vuelve SOLO, sin reenviar nada', !(await visible(p, '[data-ag="aj-msg-negocio"]')) && !(await p.$eval(btn, e => e.disabled))
       && llamadas(base, 'agente_ficha_contexto').length === 2 && (await p.$eval('[data-campo="ctx_quien"]', e => e.value)) === 'Alquiler de motos en Canggu, Uluwatu y Ubud');
    await enviar(p, 'negocio');
    await hasta(() => llamadas(base, 'agente_ficha_contexto').length === 3);
    await p.waitForTimeout(150);
    ok('M2: si vuelve a frenar tras esperar la cuenta entera, es el tope del día: lo dice SIN cuenta atrás y el botón no queda apagado',
       (await txt(p, '[data-ag="aj-msg-negocio"]')) === 'Hoy ya se han hecho los 10 cambios que caben aquí: podrás guardar mañana. Lo escrito se queda.' && !(await p.$eval(btn, e => e.disabled)),
       await txt(p, '[data-ag="aj-msg-negocio"]'));
    await ctx.close();
  }
  {
    // 10 cambios de «contexto» en las últimas 24 h en el historial: el tope del día es seguro, sin pasar por una cuenta atrás falsa
    const { p, base, ctx } = await abre({ base: { dueno: true, freno: true }, hash: '#ajustes-negocio' });
    base.historial = Array.from({ length: 10 }, (_, i) => ({ cuando: new Date(Date.now() - (i + 1) * 600e3).toISOString(), quien: 'USR-00001', campos: ['contexto'], motivo: 'x' }));
    await p.reload(); await p.waitForTimeout(400);   // goto a la MISMA URL con hash es navegación de fragmento: no relee el estado
    await p.fill('[data-campo="ctx_quien"]', 'Otro texto');
    await enviar(p, 'negocio');
    await p.waitForSelector('[data-ag="aj-msg-negocio"]:not(.axw-oculto)', { timeout: 4000 }).catch(() => {});
    ok('M2: con 10 cambios de ese campo hoy en el historial, dice «mañana» directamente', (await txt(p, '[data-ag="aj-msg-negocio"]')).includes('podrás guardar mañana'), await txt(p, '[data-ag="aj-msg-negocio"]'));
    ok('el tope del día también va en tono neutro (data-freno «dia»)', (await p.$eval('[data-ag="aj-msg-negocio"]', e => e.getAttribute('data-freno'))) === 'dia'
       && (await p.$eval('[data-ag="aj-msg-negocio"]', e => getComputedStyle(e).backgroundColor)) === 'rgba(140, 149, 255, 0.14)');
    await ctx.close();
  }
  {
    // con «Usar lo recomendado» frenado, el OTRO botón que guarda el paso tampoco se puede usar mientras dura la cuenta
    const { p, base, ctx } = await abre({ base: { dueno: true, freno: true }, hash: '#ajustes-limites', reloj: true });
    await p.click('[data-accion="ag-aj-recomendado"]');
    await p.waitForSelector('[data-ag="aj-msg-limites"]:not(.axw-oculto)', { timeout: 4000 }).catch(() => {});
    ok('freno en tono neutro (lila), no de error: data-freno en el aviso', (await p.$eval('[data-ag="aj-msg-limites"]', e => e.getAttribute('data-freno'))) === '1'
       && (await p.$eval('[data-ag="aj-msg-limites"]', e => getComputedStyle(e).backgroundColor)) === 'rgba(140, 149, 255, 0.14)', await p.$eval('[data-ag="aj-msg-limites"]', e => getComputedStyle(e).backgroundColor));
    ok('M2: el freno apaga TODOS los botones que guardan el paso (recomendado y «Guardar los límites»)',
       await p.$$eval('[data-ag="aj-f-limites"] button[type="submit"], [data-accion="ag-aj-recomendado"]', e => e.length === 2 && e.every(b => b.disabled)));
    await p.click('[data-accion="ag-aj-ajustar"]');
    await p.click('[data-ag="aj-lim-guardar"]', { force: true, timeout: 500 }).catch(() => {});
    await p.waitForTimeout(150);
    ok('M2: «Guardar los límites» durante la cuenta no reenvía', llamadas(base, 'agente_ficha_limites').length === 1, String(llamadas(base, 'agente_ficha_limites').length));
    await ctx.close();
  }
  {
    // guardado bueno en esta pestaña hace 20 s → la cuenta empieza en ~40 s, no en 60
    const { p, base, ctx } = await abre({ base: { dueno: true, limpio: true }, hash: '#ajustes-limites', reloj: true });
    await p.click('[data-accion="ag-aj-ajustar"]');
    await p.selectOption('[data-modulo="modulo-sin-rotulo"] [data-limite="nivel"]', '2');
    await p.click('[data-ag="aj-lim-guardar"]');
    await hasta(() => llamadas(base, 'agente_ficha_limites').length === 1);
    await enHash(p, '#ajustes-listo');
    await p.clock.fastForward(20000);
    base.o.freno = true;
    await p.click('[data-ag="aj-ir"][data-paso="limites"]'); await enHash(p, '#ajustes-limites');
    await p.click('[data-accion="ag-aj-ajustar"]');
    await p.selectOption('[data-modulo="modulo-sin-rotulo"] [data-limite="nivel"]', '3');
    await p.click('[data-ag="aj-lim-guardar"]');
    await p.waitForSelector('[data-ag="aj-msg-limites"]:not(.axw-oculto)', { timeout: 4000 }).catch(() => {});
    const n = Number(((await txt(p, '[data-ag="aj-msg-limites"]')).match(/\d+/) || [0])[0]);
    ok('M2: con un guardado bueno hace 20 s en esta pestaña, la cuenta empieza en ~40 s (lo que de verdad falta)', n >= 38 && n <= 41, await txt(p, '[data-ag="aj-msg-limites"]'));
    await p.click('[data-ag="aj-ir"][data-paso="tope"]'); await enHash(p, '#ajustes-tope');
    ok('M2: salir del paso para la cuenta y deja el botón libre', !(await p.$eval('[data-ag="aj-lim-guardar"]', e => e.disabled)));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, limitesRaros: true, sinContexto: true }, hash: '#ajustes-limites' });
    ok('límites ilegibles: lo dice en llano («No he podido leer tus límites…»), sin botones de guardar y con la salida «Ver el equipo»',
       (await txt(p, '[data-ag="aj-lim-error"]')) === 'No he podido leer tus límites ahora mismo. No es que no haya: prueba en un momento.' && !(await visible(p, '[data-ag="aj-lim-acc"]')) && (await visible(p, '[data-ag="aj-lim-equipo"]')));
    await p.goto(URL_PAG + '#ajustes-negocio'); await p.waitForTimeout(300);
    ok('contexto ilegible: «no se ha podido mirar» en su paso, sin campos', (await txt(p, '[data-ag="aj-msg-negocio"]')).includes('no se ha podido mirar') && !(await visible(p, '[data-ag="aj-fs-negocio"]')));
    await ctx.close();
  }
  // 4d-bis. ninguna parte del negocio admite límites: no es un callejón, «Ver el equipo» lleva a la vista Equipo
  {
    const { p, ctx } = await abre({ base: { dueno: true, sinLimites: true }, hash: '#ajustes-limites' });
    ok('sin límites que poner: lo dice, sin botones de guardar, y ofrece «Ver el equipo» como botón principal', (await visible(p, '[data-ag="sin-limites"]')) && !(await visible(p, '[data-ag="aj-lim-acc"]'))
       && (await visible(p, '[data-ag="aj-lim-equipo"]')) && (await p.$eval('[data-ag="aj-lim-equipo"]', e => e.className)) === 'ag2-btn');
    await p.click('[data-ag="aj-lim-equipo"]');
    ok('sin límites: «Ver el equipo» lleva a la vista Equipo', (await enHash(p, '#equipo')) && (await vista(p)) === 'equipo');
    await ctx.close();
  }
  // 4e. negocio: reglas plegadas, los límites de la base
  {
    const { p, base, ctx } = await abre({ base: { dueno: true }, hash: '#ajustes-negocio' });
    ok('negocio: lo guardado en los campos; las reglas plegadas pero abiertas si hay alguna', (await p.$eval('[data-campo="ctx_quien"]', e => e.value)) === 'Alquiler de motos en Canggu'
       && (await p.$eval('[data-ag="aj-reglas"]', e => e.open)) && (await txt(p, '[data-ag="cuenta-ctx_reglas"]')) === '1 de 20 reglas');
    await p.fill('[data-campo="ctx_reglas"]', Array.from({ length: 21 }, (_, i) => 'Regla ' + (i + 1)).join('\n'));
    await enviar(p, 'negocio');
    ok('negocio: más de 20 reglas no se manda y lo dice', llamadas(base, 'agente_ficha_contexto').length === 0 && (await txt(p, '[data-ag="aj-msg-negocio"]')).includes('20 reglas'));
    await p.fill('[data-campo="ctx_reglas"]', 'Ver https://ejemplo.com');
    await enviar(p, 'negocio');
    await hasta(() => llamadas(base, 'agente_ficha_contexto').length === 1);
    await p.waitForSelector('[data-ag="aj-msg-negocio"]:not(.axw-oculto)', { timeout: 4000 }).catch(() => {});
    ok('negocio: la base rechaza un enlace → frase clara, y lo escrito NO se borra', (await txt(p, '[data-ag="aj-msg-negocio"]')).includes('no puede llevar enlaces') && (await p.$eval('[data-campo="ctx_reglas"]', e => e.value)) === 'Ver https://ejemplo.com');
    await ctx.close();
  }
  // 4f. trabajos (opcional): el interruptor de Ruta (sí/no = nivel_ruta 1/0, el contrato de la base) y sus casillas; sin topes por módulo (M6: hoy no frenan nada)
  {
    const { p, base, ctx } = await abre({ base: { dueno: true }, hash: '#ajustes-trabajos' });
    ok('trabajos: 8 casillas marcadas, Ruta encendida (interruptor, no «nivel 0/1») y sin topes por módulo', (await p.$$eval('[data-ag="trabajos"] input:checked', e => e.length)) === 8
       && (await p.$eval('[data-campo="nivel_ruta"]', e => e.type === 'checkbox' && e.getAttribute('role') === 'switch' && e.checked)) && (await hay(p, '[data-ag="aj-topes"],[data-ag="aj-tope-mod"]')) === 0);
    ok('M7: con Ruta encendida, «Si lo saltas» dice que sigue con lo marcado', (await txt(p, '[data-ag="aj-trab-salta"]')) === 'Ruta sigue revisando lo que ya está marcado.');
    ok('trabajos: las 8 casillas van plegadas y el resumen las cuenta («Qué revisa (8 de 8)»); con Ruta encendida, sin atenuar ni apagar',
       !(await p.$eval('[data-ag="aj-trab-mas"]', e => e.open)) && (await txt(p, '[data-ag="aj-trab-cuenta"]')) === 'Qué revisa (8 de 8)'
       && !(await p.$eval('[data-ag="aj-trab-mas"]', e => e.hasAttribute('data-apagado'))) && (await p.$$eval('[data-ag="trabajos"] input', e => e.every(c => !c.matches(':disabled')))));
    ok('trabajos: el interruptor maestro se pinta como los de «Parar por área» (checkbox escondido + .ag2-sw lima)', (await p.$eval('[data-campo="nivel_ruta"]', e => e.classList.contains('ag2-sr')))
       && (await p.$eval('label[for="ag2-aj-nivel"] .ag2-sw', e => e.getAttribute('aria-hidden') === 'true' && getComputedStyle(e).backgroundColor === 'rgba(200, 240, 74, 0.3)')));
    await abreTrab(p);
    await p.uncheck('[data-ag="trabajos"] [data-trabajo="ocupacion"]');
    ok('al desmarcar, el resumen se actualiza («7 de 8»)', (await txt(p, '[data-ag="aj-trab-cuenta"]')) === 'Qué revisa (7 de 8)');
    await enviar(p, 'trabajos');
    await hasta(() => llamadas(base, 'agente_ficha_ajusta').length === 1);
    ok('trabajos: manda los marcados y el nivel, con el tope en null; sin tocar los límites', J(llamadas(base, 'agente_ficha_ajusta')[0][1]) === J({ p_tope_mensual_cent: null, p_trabajos: FORMA.trabajos.filter(t => t !== 'ocupacion'), p_nivel_ruta: 1, p_motivo: MOTIVO.trabajos })
       && llamadas(base, 'agente_ficha_limites').length === 0, J(llamadas(base, 'agente_ficha_ajusta')[0][1]));
    ok('trabajos guardados → la pantalla final', await enHash(p, '#ajustes-listo'));
    await p.goto(URL_PAG + '#ajustes-trabajos'); await p.waitForTimeout(300);
    await tocaRuta(p);
    ok('Ruta apagada: el grupo se atenúa (opacidad .5) y sus casillas no se pueden tocar', !(await p.$eval('[data-campo="nivel_ruta"]', e => e.checked))
       && (await p.$eval('[data-ag="aj-trab-mas"]', e => e.getAttribute('data-apagado'))) === '1' && (await p.$eval('[data-ag="aj-trab-fs"]', e => getComputedStyle(e).opacity)) === '0.5'
       && (await p.$$eval('[data-ag="trabajos"] input', e => e.length === 8 && e.every(c => c.matches(':disabled')))));
    await enviar(p, 'trabajos');
    await hasta(() => llamadas(base, 'agente_ficha_ajusta').length === 2);
    ok('apagar la revisión de Ruta manda p_nivel_ruta 0', (llamadas(base, 'agente_ficha_ajusta')[1] || [0, {}])[1].p_nivel_ruta === 0, J(llamadas(base, 'agente_ficha_ajusta')[1]));
    await ctx.close();
  }
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, nuevo: true, conTope: true }, hash: '#ajustes-trabajos' });
    ok('M7: desde cero Ruta nace apagada (nivel_ruta 0 de la base) y «Si lo saltas» lo dice', !(await p.$eval('[data-campo="nivel_ruta"]', e => e.checked))
       && (await txt(p, '[data-ag="aj-trab-salta"]')) === 'Ruta no revisa nada hasta que lo enciendas aquí.');
    ok('desde cero, con Ruta apagada: grupo plegado, atenuado y con las casillas apagadas', !(await p.$eval('[data-ag="aj-trab-mas"]', e => e.open))
       && (await p.$eval('[data-ag="aj-trab-mas"]', e => e.getAttribute('data-apagado'))) === '1' && (await p.$$eval('[data-ag="trabajos"] input', e => e.length > 0 && e.every(c => c.matches(':disabled')))));
    await tocaRuta(p);
    ok('encender Ruta (tocando su etiqueta): el grupo deja de estar atenuado y las casillas se pueden tocar', (await p.$eval('[data-campo="nivel_ruta"]', e => e.checked))
       && !(await p.$eval('[data-ag="aj-trab-mas"]', e => e.hasAttribute('data-apagado'))) && (await p.$$eval('[data-ag="trabajos"] input', e => e.every(c => !c.matches(':disabled')))));
    await p.$$eval('[data-ag="trabajos"] input[type="checkbox"]', e => e.forEach(c => { c.checked = false; }));
    await enviar(p, 'trabajos');
    ok('Ruta encendida sin nada marcado: no se manda, dice qué hacer y despliega las casillas (no es un callejón)', llamadas(base, 'agente_ficha_ajusta').length === 0 && (await txt(p, '[data-ag="aj-msg-trabajos"]')) === 'Marca al menos una cosa que revisar, o apaga la revisión de Ruta.'
       && (await p.$eval('[data-ag="aj-trab-mas"]', e => e.open)));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, orden: [], sinNotas: true }, hash: '#ajustes-trabajos' });
    ok('catálogo de trabajos vacío: lo dice, sin casillas ni «(0 de 0)»', (await txt(p, '[data-ag="sin-trabajos"]')).includes('Ruta aún no tiene nada que revisar') && (await hay(p, '[data-ag="trabajos"] input')) === 0
       && (await visible(p, '[data-ag="sin-trabajos"]')) && !(await visible(p, '[data-ag="aj-trab-mas"]')));
    await ctx.close();
  }
  // 5. apagado, encender y apagar; respuestas raras del interruptor
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, apagado: true } });
    ok('apagado: solo la tarjeta de encender (sin pestañas, sin equipo), y no pide las notas', (await vista(p)) === 'apagado' && (await visible(p, '[data-ag="v2-apagado"]')) && !(await visible(p, '[data-ag="v2-tabs"]'))
       && !(await visible(p, '[data-ag="v2-cuerpo"]')) && llamadas(base, 'agente_notas_datos').length === 0);
    await p.click('[data-accion="ag-encender"]');
    ok('encender: el diálogo dice que es un servicio de pago', (await p.$eval('.axw-modal', e => e.textContent)).includes('servicio de pago'));
    await p.click('[data-accion="ag-modal-confirmar"]');
    ok('encender sin motivo no llama a la base', llamadas(base, 'agente_modulo_cambia').length === 0);
    await p.fill('[data-campo="dialogo-motivo"]', 'Empezamos');
    await p.click('[data-accion="ag-modal-confirmar"]');
    await hasta(() => llamadas(base, 'agente_modulo_cambia').length === 1);
    ok('encender manda p_encender true y el motivo', J(llamadas(base, 'agente_modulo_cambia')[0][1]) === J({ p_encender: true, p_motivo: 'Empezamos' }));
    await p.waitForFunction(() => document.querySelector('[data-ag="v2"]').getAttribute('data-vista') !== 'apagado', null, { timeout: 4000 }).catch(() => {});
    ok('encendido: vuelve el equipo', (await vista(p)) === 'equipo' && (await visible(p, '[data-ag="v2-cuerpo"]')));
    await ctx.close();
  }
  {
    const { p, base, ctx } = await abre({ base: { dueno: true }, hash: '#ajustes-listo' });
    ok('apagar NO sale en el asistente (ni al pie de un paso ni en la pantalla final)', !(await visible(p, '[data-ag="v2-apagar"]')) && (await hay(p, '[data-ag="aj-apagar"]')) === 0);
    await p.click('[data-ag="aj-listo-equipo"]'); await enHash(p, '#equipo');
    ok('apagar vive al final de la vista Equipo, con su texto llano', (await visible(p, '[data-ag="v2-apagar"]')) && (await txt(p, '[data-ag="v2-apagar"]')).includes('Tu equipo deja de mirar y de hacer cosas al momento.')
       && (await txt(p, '[data-accion="ag-apagar"]')) === 'Apagar a tu equipo');
    await p.click('[data-accion="ag-apagar"]'); await p.fill('[data-campo="dialogo-motivo"]', 'Prueba de apagado'); await p.click('[data-accion="ag-modal-confirmar"]');
    await hasta(() => llamadas(base, 'agente_modulo_cambia').length === 1);
    ok('apagar manda p_encender false y el motivo', J(llamadas(base, 'agente_modulo_cambia')[0][1]) === J({ p_encender: false, p_motivo: 'Prueba de apagado' }));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true, apagado: true } });
    ok('apagado y no dueño: dice quién lo enciende y no ofrece Encender', (await txt(p, '[data-ag="v2-apagado-txt"]')).includes('Lo enciende la persona que lleva el equipo') && (await hay(p, '[data-accion="ag-encender"]')) === 0);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, nulo: true } });
    ok('null del interruptor = apagado, con Encender', (await vista(p)) === 'apagado' && (await hay(p, '[data-accion="ag-encender"]')) === 1);
    await ctx.close();
  }
  for (const [o, frase] of [[{ nulo: true, cambiaNulo: true }, 'no confirmó'], [{ apagado: true, sinSembrar: true }, 'lo prepara el estudio'], [{ apagado: true, dePago: true }, 'lo enciende el estudio'], [{ apagado: true, otroTipo: true }, 'no es para tu tipo de negocio']]) {
    const { p, base, ctx } = await abre({ base: Object.assign({ dueno: true }, o) });
    await p.click('[data-accion="ag-encender"]'); await p.fill('[data-campo="dialogo-motivo"]', 'Encender'); await p.click('[data-accion="ag-modal-confirmar"]');
    await hasta(() => llamadas(base, 'agente_modulo_cambia').length === 1);
    await p.waitForSelector('.axw-modal .axw-error:not(.axw-oculto)', { timeout: 4000 }).catch(() => {});
    ok('encender ' + Object.keys(o).pop() + ': «' + frase + '» en el diálogo y sigue apagado', (await txt(p, '.axw-modal .axw-error')).includes(frase) && (await vista(p)) === 'apagado');
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: {} });
    ok('sin herramienta: el mensaje de pedirla, y nada más', (await txt(p, '[data-ag="carga"]')).includes('No tienes la herramienta') && !(await visible(p, '[data-ag="v2"]')));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, sinMoneda: true } });
    ok('sin moneda en la respuesta: error de forma, no un «EUR» puesto por la pantalla', (await txt(p, '[data-ag="carga"]')).includes('algo inesperado') && !(await visible(p, '[data-ag="v2"]')));
    await ctx.close();
  }
  // 5b. PASO 0 «¿Quién lleva el equipo?» (agencia 20261015194000): agente_owner_estado (con candidatos) / agente_owner_pon; la pantalla no lee ninguna tabla
  const MOT_QUIEN = 'Asistente de Ajustes: quién lleva el equipo';
  const SEL_QUIEN = '#ag2-aj-quien-sel';
  const conPersonas = p => p.waitForFunction(s => document.querySelector(s).options.length > 1, SEL_QUIEN, { timeout: 4000 }).then(() => true, () => false);
  const vOk = p => p.waitForFunction(() => { const e = document.querySelector('[data-ag="v2-ok"]'); return e && e.textContent && !e.classList.contains('axw-oculto'); }, null, { timeout: 4000 }).then(() => true, () => false);
  const fromes = p => p.evaluate(() => window.__fromLlamado);
  const opciones = p => p.$$eval(SEL_QUIEN + ' option', os => os.map(o => o.textContent));
  ok('paso 0 · agente.html no lee ninguna tabla: ni un .from( en la página', !/\.from\(/.test(fs.readFileSync(path.join(__dirname, '..', 'agente.html'), 'utf8')));
  // dos personas que se llaman igual: solo esas dos llevan su número (es lo único que las distingue)
  {
    const { p, ctx } = await abre({ base: { herramienta: true, apagado: true, mismoNombre: true, ow: { prop: true, yo: NOELIA, owner: null } }, hash: '#ajustes-quien' });
    ok('paso 0 · dos «Dion»: el número sale SOLO en esas dos', (await conPersonas(p))
       && J(await p.$$eval(SEL_QUIEN + ' option', os => os.map(o => o.textContent))) === J(['Elige una persona', 'Dion · USR-00002', 'Noelia', 'Dion · USR-00004']),
       J(await p.$$eval(SEL_QUIEN + ' option', os => os.map(o => o.textContent))));
    await ctx.close();
  }
  // la propietaria (Noelia), sin nadie al frente, con el equipo APAGADO: solo el paso 0; lo elige y vuelve a la tarjeta, ya con «Encender»
  {
    const { p, base, ctx } = await abre({ base: { herramienta: true, apagado: true, ow: { prop: true, yo: NOELIA, owner: null, conPruebas: true } } });
    const t0 = await txt(p, '[data-ag="v2-apagado-txt"]');
    ok('paso 0 · propietaria sin dueño, apagado: la tarjeta dice que no hay nadie al frente y ofrece elegirlo, sin «Encender»', (await vista(p)) === 'apagado'
       && t0.includes('Aún no hay nadie al frente del equipo.') && t0.includes('Antes de encenderlo, elige quién lleva el equipo.') && !t0.includes('Lo nombra')
       && (await visible(p, '[data-ag="v2-apagado-quien"]')) && (await hay(p, '[data-accion="ag-encender"]')) === 0, t0);
    await p.click('[data-ag="v2-apagado-quien"]');
    await enHash(p, '#ajustes-quien');
    ok('paso 0 · con el equipo apagado, #ajustes-quien enseña SOLO ese paso (sin pestañas ni barra de pasos) y le da el foco',
       (await p.$eval('[data-ag="v2"]', e => e.getAttribute('data-solo'))) === 'quien' && (await vista(p)) === 'ajustes' && (await pasoVisible(p, 'quien'))
       && !(await visible(p, '[data-ag="v2-tabs"]')) && !(await visible(p, '[data-ag="aj-pasos"]')) && (await foco(p)) === 'ag2-aj-h-quien', J(await estadoRuta(p)));
    ok('paso 0 · la lista es la de candidatos: «Elige una persona» + las de la base, en su orden, sin número (ningún nombre se repite); ella ya está, sin «Lo llevo yo»', (await conPersonas(p))
       && J(await opciones(p)) === J(['Elige una persona', 'Dion', 'Noelia', 'Cuenta de pruebas']), J(await opciones(p)));
    ok('paso 0 · la pista dice solo la primera frase; lo de la subida anulada no sale (no hay subida pendiente)', (await txt(p, '#ag2-aj-quien-p')) === 'Cualquier persona activa de tu equipo, también tú.'
       && !(await visible(p, '[data-ag="aj-quien-subida"]')) && (await txt(p, '[data-ag="aj-quien-subida"]')) === '');
    ok('paso 0 · la lista sale del estado: ninguna lectura de tabla y agente_owner_estado una sola vez', (await fromes(p)) === 0 && llamadas(base, 'agente_owner_estado').length === 1);
    ok('paso 0 · sin nadie al frente: «Antes de empezar» y «Si lo saltas» a la vista', (await visible(p, '[data-ag="aj-quien-etapa"]')) && (await visible(p, '[data-ag="aj-quien-salta"]')));
    ok('paso 0 · un solo campo y un botón', (await p.$$eval('[data-ag="aj-f-quien"] input, [data-ag="aj-f-quien"] select, [data-ag="aj-f-quien"] textarea', e => e.length)) === 1
       && (await p.$$eval('[data-ag="aj-f-quien"] button', e => e.length)) === 1);
    await enviar(p, 'quien');
    ok('paso 0 · sin elegir: «Elige quién lleva el equipo.», el campo marcado y nada viaja', (await txt(p, '[data-ag="aj-msg-quien"]')) === 'Elige quién lleva el equipo.'
       && (await p.$eval(SEL_QUIEN, e => e.getAttribute('aria-invalid'))) === 'true' && llamadas(base, 'agente_owner_pon').length === 0);
    await p.selectOption(SEL_QUIEN, PRUEBAS_UID); await enviar(p, 'quien');
    await hasta(() => llamadas(base, 'agente_owner_pon').length === 1);
    await p.waitForFunction(() => /pruebas/.test(document.querySelector('[data-ag="aj-msg-quien"]').textContent), null, { timeout: 4000 }).catch(() => {});
    ok('paso 0 · la cuenta de pruebas como elegida: lo dice en llano y la lista sigue', (await txt(p, '[data-ag="aj-msg-quien"]')) === 'La cuenta de pruebas no puede llevar el equipo: elige a otra persona.'
       && (await p.$eval(SEL_QUIEN, e => e.value)) === PRUEBAS_UID);
    await p.selectOption(SEL_QUIEN, NOELIA);
    await p.dblclick('[data-ag="aj-f-quien"] button[type="submit"]');
    await hasta(() => llamadas(base, 'agente_owner_pon').length >= 2);
    await vOk(p);
    ok('paso 0 · doble clic manda UN cambio, con la persona elegida y el motivo fijo de la pantalla', llamadas(base, 'agente_owner_pon').length === 2
       && J(llamadas(base, 'agente_owner_pon')[1][1]) === J({ p_user_id: NOELIA, p_motivo: MOT_QUIEN }), J(llamadas(base, 'agente_owner_pon')));
    ok('paso 0 · elegida ella misma con el equipo apagado: vuelve a la tarjeta, «Ahora lleva el equipo Noelia.» y ya puede encenderlo',
       (await hash(p)) === '#equipo' && (await vista(p)) === 'apagado' && (await txt(p, '[data-ag="v2-ok"]')) === 'Ahora lleva el equipo Noelia.'
       && (await hay(p, '[data-accion="ag-encender"]')) === 1 && !(await visible(p, '[data-ag="v2-apagado-quien"]')), J(await estadoRuta(p)));
    ok('paso 0 · tras el cambio se relee quién lo lleva (la pantalla no lo da por hecho)', llamadas(base, 'agente_owner_estado').length === 2);
    ok('paso 0 · sin errores de JS, sin fetch y sin otro .from()', await sinErrores(p));
    await ctx.close();
  }
  // la propietaria sin nadie al frente, equipo ENCENDIDO: el aviso de arriba lo pone primero; Ajustes abre el paso 0; elige a otra persona y vuelve al equipo
  {
    const { p, base, ctx } = await abre({ base: { herramienta: true, ow: { prop: true, yo: NOELIA, owner: null } } });
    ok('paso 0 · encendido y sin dueño: «Aún no hay nadie al frente… Sin alguien al frente, tu equipo no empieza.» con el botón de elegirlo',
       (await txt(p, '[data-ag="v2-falta-txt"]')) === 'Aún no hay nadie al frente del equipo. Sin alguien al frente, tu equipo no empieza.'
       && (await visible(p, '[data-ag="v2-falta-quien"]')) && !(await visible(p, '[data-ag="v2-falta-ir"]')));
    await p.click('[data-ag="v2-tab-ajustes"]');
    await p.waitForTimeout(150);
    ok('paso 0 · la pestaña Ajustes, sin dueño, lleva al paso 0 (va antes que el tope), con pestañas y fuera de la barra de pasos',
       (await hash(p)) === '#ajustes-quien' && (await pasoVisible(p, 'quien')) && (await p.$eval('[data-ag="v2"]', e => e.getAttribute('data-solo'))) === null
       && (await visible(p, '[data-ag="v2-tabs"]')) && (await hay(p, '[data-ag="aj-pasos"] [data-paso="quien"], [data-ag="aj-pasos"] [href="#ajustes-quien"]')) === 0, J(await estadoRuta(p)));
    await conPersonas(p);
    await p.selectOption(SEL_QUIEN, DION); await enviar(p, 'quien');
    await hasta(() => llamadas(base, 'agente_owner_pon').length === 1);
    await vOk(p);
    ok('paso 0 · elige a otra persona: vuelve a «Equipo» y lo dice (los pasos ya no son suyos)', (await hash(p)) === '#equipo' && (await vista(p)) === 'equipo'
       && (await txt(p, '[data-ag="v2-ok"]')) === 'Ahora lleva el equipo Dion.' && !(await visible(p, '[data-ag="v2-falta-quien"]')), J(await estadoRuta(p)));
    await p.click('[data-ag="v2-tab-ajustes"]'); await p.waitForTimeout(150);
    ok('paso 0 · ya con alguien al frente: Ajustes no vuelve al paso 0, dice quién lo lleva y ofrece «Cambiar»', (await hash(p)) !== '#ajustes-quien'
       && (await txt(p, '[data-ag="aj-quien-txt"]')) === 'Lleva el equipo Dion.' && (await visible(p, '[data-ag="aj-quien-cambiar"]'))
       && (await txt(p, '[data-ag="aj-solo-dueno"]')) === 'Esto lo configura Dion, que lleva el equipo.', J(await estadoRuta(p)));
    await ctx.close();
  }
  // la propietaria que lo lleva, CAMBIANDO de persona, con una subida del tope pendiente: se anula y se dice (en los tres idiomas)
  for (const idioma of ['es', 'en', 'id']) {
    const { p, base, ctx } = await abre({ idioma, base: { dueno: true, herramienta: true, propuesto: true, ow: { prop: true, yo: NOELIA, owner: NOELIA, cambios: 1, cambiado: new Date(AHORA - 3 * 3600e3).toISOString() } }, hash: '#ajustes-tope' });
    if (idioma === 'es') {
      ok('paso 0 · propietaria y dueña: «Llevas tú el equipo.» con «Cambiar»', (await txt(p, '[data-ag="aj-quien-txt"]')) === 'Llevas tú el equipo.' && (await visible(p, '[data-ag="aj-quien-cambiar"]')));
    }
    await p.click('[data-ag="aj-quien-cambiar"]'); await enHash(p, '#ajustes-quien'); await conPersonas(p);
    if (idioma === 'es') {
      ok('paso 0 · al cambiar, la persona de ahora sale marcada (por su número de usuario)', (await p.$eval(SEL_QUIEN, e => e.value)) === NOELIA);
      ok('paso 0 · con una subida del tope pendiente, la pista avisa de que se anula al cambiar y el campo la tiene en su descripción', (await visible(p, '[data-ag="aj-quien-subida"]'))
         && (await p.$eval(SEL_QUIEN, e => e.getAttribute('aria-describedby').split(' ').includes('ag2-aj-quien-subida')))
         && (await txt(p, '[data-ag="aj-quien-subida"]')) === 'Hay una subida del tope pendiente: si cambias de persona, se anula y la decide quien lleve el equipo.');
      ok('paso 0 · cambiar: sin «Antes de empezar» ni «Si lo saltas» (ya hay alguien al frente), y sin la línea de arriba (el paso ya lo dice)',
         !(await visible(p, '[data-ag="aj-quien-etapa"]')) && !(await visible(p, '[data-ag="aj-quien-salta"]')) && !(await visible(p, '[data-ag="aj-quien-linea"]')));
    }
    await p.selectOption(SEL_QUIEN, DION); await enviar(p, 'quien');
    await hasta(() => llamadas(base, 'agente_owner_pon').length === 1);
    await vOk(p);
    const m = await txt(p, '[data-ag="v2-ok"]');
    if (idioma === 'es') {
      ok('paso 0 · cambiar con una subida pendiente: «Ahora lleva el equipo Dion.» + «La subida del tope que estaba pendiente se ha anulado…»',
         m === 'Ahora lleva el equipo Dion. La subida del tope que estaba pendiente se ha anulado: la decide quien lleva ahora el equipo.' && base.propuesto === null && (await vista(p)) === 'equipo', m);
    } else {
      ok(idioma + ' · paso 0 · el aviso de la subida anulada sale traducido', m.includes(idioma === 'en' ? 'The pending cap increase has been cancelled' : 'Kenaikan anggaran yang tertunda dibatalkan'), m);
    }
    const sin = await p.evaluate(() => window.__sinTr);
    ok(idioma + ' · paso 0 · cambiar: ninguna cadena sin traducir', sin.length === 0, J(sin.slice(0, 6)));
    await ctx.close();
  }
  // la propietaria elige a quien YA lo lleva: no gasta freno, lo dice y sigue con el paso que toque
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, ow: { prop: true, yo: NOELIA, owner: NOELIA } }, hash: '#ajustes-quien' });
    await conPersonas(p); await enviar(p, 'quien');
    await hasta(() => llamadas(base, 'agente_owner_pon').length === 1);
    await p.waitForFunction(() => /ya llevaba/.test(document.querySelector('[data-ag="aj-ok"]').textContent), null, { timeout: 4000 }).catch(() => {});
    ok('paso 0 · la misma persona: «Noelia ya llevaba el equipo.» y sigue en Ajustes (sigue siendo suya)', (await txt(p, '[data-ag="aj-ok"]')) === 'Noelia ya llevaba el equipo.'
       && (await vista(p)) === 'ajustes' && (await hash(p)) !== '#ajustes-quien' && base.ow.cambios === undefined, J(await estadoRuta(p)));
    await ctx.close();
  }
  // el freno de la base (1 por minuto y 3 en 24 h): la pantalla dice EXACTO cuánto falta con lo que da agente_owner_estado
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, ow: { prop: true, yo: NOELIA, owner: NOELIA, cambios: 3, cambiado: new Date(AHORA - 2 * 3600e3).toISOString() } }, hash: '#ajustes-quien' });
    await conPersonas(p); await p.selectOption(SEL_QUIEN, DION); await enviar(p, 'quien');
    await hasta(() => llamadas(base, 'agente_owner_pon').length === 1);
    await p.waitForFunction(() => /mañana/.test(document.querySelector('[data-ag="aj-msg-quien"]').textContent), null, { timeout: 4000 }).catch(() => {});
    ok('paso 0 · freno del día (3 cambios en 24 h): «… podrás cambiarlo mañana.», lo elegido se queda', (await txt(p, '[data-ag="aj-msg-quien"]')) === 'Hoy ya se ha cambiado 3 veces quién lleva el equipo, el máximo: podrás cambiarlo mañana.'
       && (await p.$eval(SEL_QUIEN, e => e.value)) === DION && base.ow.owner === NOELIA);
    await ctx.close();
  }
  {
    const { p, base, ctx } = await abre({ base: { dueno: true, ow: { prop: true, yo: NOELIA, owner: NOELIA, cambios: 1, cambiado: new Date(Date.now() - 20e3).toISOString() } }, hash: '#ajustes-quien' });
    await conPersonas(p); await p.selectOption(SEL_QUIEN, DION); await enviar(p, 'quien');
    await hasta(() => llamadas(base, 'agente_owner_pon').length === 1);
    await p.waitForFunction(() => /Podrás guardar en/.test(document.querySelector('[data-ag="aj-msg-quien"]').textContent), null, { timeout: 4000 }).catch(() => {});
    const m = await txt(p, '[data-ag="aj-msg-quien"]'), s = Number((m.match(/en (\d+) s/) || [])[1]);
    ok('paso 0 · freno del minuto: cuenta atrás desde el último cambio (≈40 s, no 60) y el botón apagado; lo elegido se queda', s >= 30 && s <= 42
       && (await p.$eval('[data-ag="aj-f-quien"] button[type="submit"]', e => e.disabled)) && (await p.$eval(SEL_QUIEN, e => e.value)) === DION, m);
    await ctx.close();
  }
  // NO propietario: lee quién lo lleva (o que no hay nadie y quién lo nombra), sin lista de personas, sin paso 0 y sin «Cambiar»
  {
    const { p, base, ctx } = await abre({ base: { herramienta: true, ow: { yo: DION, owner: NOELIA } }, hash: '#ajustes-tope' });
    ok('paso 0 · no propietario con dueño: «Lleva el equipo Noelia.», sin «Cambiar», y quién lo configura por su nombre', (await txt(p, '[data-ag="aj-quien-txt"]')) === 'Lleva el equipo Noelia.'
       && !(await visible(p, '[data-ag="aj-quien-cambiar"]')) && (await txt(p, '[data-ag="aj-solo-dueno"]')) === 'Esto lo configura Noelia, que lleva el equipo.');
    await p.evaluate(() => { location.hash = '#ajustes-quien'; }); await p.waitForTimeout(200);
    ok('paso 0 · no propietario: #ajustes-quien no abre el paso 0 (lo lleva a un paso suyo) y nunca pide la lista de personas',
       (await hash(p)) !== '#ajustes-quien' && !(await pasoVisible(p, 'quien')) && (await fromes(p)) === 0 && llamadas(base, 'agente_owner_pon').length === 0
       && (await p.$$eval(SEL_QUIEN + ' option', os => os.length)) === 0, J(await estadoRuta(p)));
    await ctx.close();
  }
  {
    const { p, base, ctx } = await abre({ base: { herramienta: true, ow: { yo: DION, owner: null } } });
    ok('paso 0 · no propietario sin dueño: «Aún no hay nadie al frente del equipo. Lo nombra la persona propietaria de la cuenta.», sin botón',
       (await txt(p, '[data-ag="v2-falta-txt"]')) === 'Aún no hay nadie al frente del equipo. Lo nombra la persona propietaria de la cuenta. Sin alguien al frente, tu equipo no empieza.'
       && !(await visible(p, '[data-ag="v2-falta-quien"]')) && !(await visible(p, '[data-ag="v2-falta-ir"]')) && (await fromes(p)) === 0);
    await ctx.close();
  }
  for (const [nombre, ow, frase] of [['con dueño', { yo: DION, owner: NOELIA }, 'Lo enciende Noelia, que lleva el equipo.'], ['sin dueño', { yo: DION, owner: null }, 'Aún no hay nadie al frente del equipo. Lo nombra la persona propietaria de la cuenta.']]) {
    const { p, ctx } = await abre({ base: { herramienta: true, apagado: true, ow } });
    ok('paso 0 · no propietario ' + nombre + ', apagado: «' + frase + '», sin «Encender» ni «Elegir»', (await txt(p, '[data-ag="v2-apagado-txt"]')).includes(frase)
       && (await hay(p, '[data-accion="ag-encender"]')) === 0 && !(await visible(p, '[data-ag="v2-apagado-quien"]')));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true, ow: { yo: DION, owner: NOELIA, inactivo: true } }, hash: '#ajustes-tope' });
    ok('paso 0 · el dueño ya no está activo: lo dice y quién lo cambia', (await txt(p, '[data-ag="aj-quien-txt"]')) === 'Noelia llevaba el equipo, pero su cuenta ya no está activa. Lo cambia la persona propietaria de la cuenta.');
    await ctx.close();
  }
  // ya_no_eres_owner: aviso suave (role=status), en todas las vistas
  {
    const { p, ctx } = await abre({ base: { herramienta: true, ow: { yo: DION, owner: NOELIA, yaNo: true } } });
    ok('paso 0 · ya_no_eres_owner: «Ahora lleva el equipo Noelia: tú ya no cambias estos ajustes.» como aviso suave', (await visible(p, '[data-ag="v2-ya-no"]'))
       && (await txt(p, '[data-ag="v2-ya-no"]')) === 'Ahora lleva el equipo Noelia: tú ya no cambias estos ajustes.'
       && (await p.$eval('[data-ag="v2-ya-no"]', e => e.getAttribute('role') + '/' + e.getAttribute('data-tono'))) === 'status/neutro');
    await p.click('[data-ag="v2-tab-ajustes"]'); await p.waitForTimeout(150);
    ok('paso 0 · el aviso sigue en Ajustes', await visible(p, '[data-ag="v2-ya-no"]'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, ow: { prop: true, yo: NOELIA, owner: NOELIA } } });
    ok('paso 0 · sin ya_no_eres_owner no hay aviso', !(await visible(p, '[data-ag="v2-ya-no"]')));
    await ctx.close();
  }
  // 404 (la migración aún no está en la base): el paso 0 no existe y todo lo demás va igual
  {
    const { p, base, ctx } = await abre({ base: { dueno: true }, hash: '#ajustes-quien' });
    ok('paso 0 · 404: se pregunta una vez, #ajustes-quien lleva a un paso normal, ni línea de quién ni lista de personas, sin errores',
       llamadas(base, 'agente_owner_estado').length === 1 && (await hash(p)) !== '#ajustes-quien' && !(await pasoVisible(p, 'quien')) && !(await visible(p, '[data-ag="aj-quien-linea"]'))
       && !(await visible(p, '[data-ag="v2-falta-quien"]')) && (await sinErrores(p)), J(await estadoRuta(p)));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, apagado: true } });
    ok('paso 0 · 404 con el equipo apagado: «Encender» como siempre, sin «Elegir quién»', (await hay(p, '[data-accion="ag-encender"]')) === 1 && !(await visible(p, '[data-ag="v2-apagado-quien"]')));
    await ctx.close();
  }
  // «no he podido mirar» ≠ «no hay nadie»
  {
    const { p, ctx } = await abre({ base: { dueno: true, ow: { prop: true, yo: NOELIA, owner: NOELIA, roto: true } }, hash: '#ajustes-tope' });
    const l = await txt(p, '[data-ag="aj-quien-txt"]');
    ok('paso 0 · la lectura falla: «No se ha podido mirar quién lleva el equipo.», no «no hay nadie»', l.startsWith('No se ha podido mirar quién lleva el equipo.') && !l.includes('Aún no hay nadie')
       && !(await visible(p, '[data-ag="v2-falta-quien"]')), l);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true, apagado: true, ow: { prop: true, yo: NOELIA, owner: null, candRotos: true } }, hash: '#ajustes-quien' });
    await p.waitForFunction(() => /lista de personas/.test(document.querySelector('[data-ag="aj-msg-quien"]').textContent), null, { timeout: 4000 }).catch(() => {});
    ok('paso 0 · candidatos con otra forma: lo dice («No es que esté vacía») y el campo queda apagado', (await txt(p, '[data-ag="aj-msg-quien"]')).includes('No es que esté vacía')
       && (await p.$eval(SEL_QUIEN, e => e.disabled)));
    await ctx.close();
  }
  // una cuenta del estudio (es_estudio): se puede elegir y se rotula en llano en los tres idiomas
  for (const [idioma, rot] of [['es', 'Javier · equipo de AxisWorks'], ['en', 'Javier · AxisWorks team'], ['id', 'Javier · tim AxisWorks']]) {
    const { p, base, ctx } = await abre({ idioma, base: { herramienta: true, apagado: true, ow: { prop: true, yo: NOELIA, owner: null, conEstudio: true } }, hash: '#ajustes-quien' });
    await conPersonas(p);
    const os = await opciones(p);
    ok(idioma + ' · paso 0 · cuenta del estudio: «' + rot + '», las demás sin rótulo', os.length === 4 && os[1] === 'Dion' && os[2] === 'Noelia' && os[3] === rot, J(os));
    if (idioma === 'es') {
      await p.selectOption(SEL_QUIEN, ESTUDIO_UID); await enviar(p, 'quien');
      await hasta(() => llamadas(base, 'agente_owner_pon').length === 1);
      ok('paso 0 · la cuenta del estudio se puede elegir: viaja su uid', J(llamadas(base, 'agente_owner_pon')[0][1]) === J({ p_user_id: ESTUDIO_UID, p_motivo: MOT_QUIEN }));
    }
    await ctx.close();
  }
  // candidatos vacío (la base no da a nadie más): lo dice en llano y queda «Lo llevo yo», que se puede guardar
  {
    const { p, base, ctx } = await abre({ base: { herramienta: true, apagado: true, ow: { prop: true, yo: NOELIA, owner: null, candVacio: true } }, hash: '#ajustes-quien' });
    await conPersonas(p);
    ok('paso 0 · candidatos vacío: «Elige una persona» + «Lo llevo yo», y dice que no hay nadie más (no «no se ha podido mirar»)', J(await opciones(p)) === J(['Elige una persona', 'Lo llevo yo'])
       && (await txt(p, '[data-ag="aj-msg-quien"]')) === 'No hay nadie más que pueda llevar el equipo: puedes llevarlo tú, o añadir a alguien en Ajustes › Usuarios.'
       && !(await p.$eval(SEL_QUIEN, e => e.disabled)), J(await opciones(p)));
    await p.selectOption(SEL_QUIEN, NOELIA); await enviar(p, 'quien');
    await hasta(() => llamadas(base, 'agente_owner_pon').length === 1);
    await vOk(p);
    ok('paso 0 · «Lo llevo yo» manda el uid de la propia sesión y la base lo confirma', J(llamadas(base, 'agente_owner_pon')[0][1]) === J({ p_user_id: NOELIA, p_motivo: MOT_QUIEN })
       && (await txt(p, '[data-ag="v2-ok"]')) === 'Ahora lleva el equipo Noelia.' && (await fromes(p)) === 0, J(llamadas(base, 'agente_owner_pon')));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true, apagado: true, ow: { prop: true, yo: NOELIA, owner: null, candVacio: true, sinSesion: true } }, hash: '#ajustes-quien' });
    await p.waitForFunction(() => !document.querySelector('[data-ag="aj-msg-quien"]').classList.contains('axw-oculto'), null, { timeout: 4000 }).catch(() => {});
    ok('paso 0 · candidatos vacío y sin sesión legible: «No hay ninguna persona activa…» y el campo apagado', (await txt(p, '[data-ag="aj-msg-quien"]')) === 'No hay ninguna persona activa en tu equipo: añádela en Ajustes › Usuarios.'
       && (await p.$eval(SEL_QUIEN, e => e.disabled)));
    await ctx.close();
  }
  // sin la clave candidatos (la base aún sin el cambio de Backend): solo «Lo llevo yo», con la pista que lo dice; sin sesión, el paso 0 no se enseña
  {
    const { p, base, ctx } = await abre({ base: { herramienta: true, apagado: true, ow: { prop: true, yo: NOELIA, owner: null, sinCand: true } }, hash: '#ajustes-quien' });
    await conPersonas(p);
    ok('paso 0 · sin candidatos en la respuesta: solo «Lo llevo yo», la pista lo explica y ningún error', J(await opciones(p)) === J(['Elige una persona', 'Lo llevo yo'])
       && (await txt(p, '#ag2-aj-quien-p')) === 'De momento solo puedes ponerte tú: la lista de tu equipo aún no está disponible.'
       && !(await visible(p, '[data-ag="aj-msg-quien"]')) && (await fromes(p)) === 0, J(await opciones(p)));
    await p.selectOption(SEL_QUIEN, NOELIA); await enviar(p, 'quien');
    await hasta(() => llamadas(base, 'agente_owner_pon').length === 1);
    ok('paso 0 · sin candidatos: «Lo llevo yo» guarda con su uid', J(llamadas(base, 'agente_owner_pon')[0][1]) === J({ p_user_id: NOELIA, p_motivo: MOT_QUIEN }));
    await ctx.close();
  }
  {
    const { p, base, ctx } = await abre({ base: { herramienta: true, apagado: true, ow: { prop: true, yo: NOELIA, owner: null, sinCand: true, sinSesion: true } }, hash: '#ajustes-quien' });
    ok('paso 0 · sin candidatos y sin sesión: el paso 0 no se enseña (la tarjeta de apagado, como con 404) ni se ofrece elegir, y nada se rompe', (await vista(p)) === 'apagado' && !(await pasoVisible(p, 'quien'))
       && !(await visible(p, '[data-ag="v2-apagado-quien"]')) && llamadas(base, 'agente_owner_pon').length === 0 && (await sinErrores(p)), J(await estadoRuta(p)));
    await ctx.close();
  }
  // no propietario: la base le da candidatos [] y la pantalla no enseña lista
  {
    const b = nuevaBase({ herramienta: true, ow: { yo: DION, owner: NOELIA } });
    const r = (await servidor(b, 'agente_owner_estado', {})).data;
    ok('doble: sin puedo_poner, candidatos es [] (la base no da la lista)', r.puedo_poner === false && Array.isArray(r.candidatos) && r.candidatos.length === 0, J(r.candidatos));
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true, apagado: true, xss: true, ow: { prop: true, yo: NOELIA, owner: DION, inactivo: true } }, hash: '#ajustes-quien' });
    await conPersonas(p);
    ok('paso 0 · XSS en los nombres (lista y dueño): entran como texto', (await sinInyeccion(p)) && (await p.$$eval(SEL_QUIEN + ' option', os => os.map(o => o.textContent).join('|'))).includes('<img src=x'));
    await ctx.close();
  }
  {
    const b = nuevaBase({ ow: { prop: true, yo: NOELIA, owner: NOELIA } });
    const r = (await servidor(b, 'agente_owner_estado', {})).data;
    ok('doble: agente_owner_estado devuelve exactamente las claves del contrato', J(Object.keys(r).sort()) === J(Object.keys(FORMA.lecturas.agente_owner_estado.devuelve).sort()), J(Object.keys(r).sort()));
  }
  // 5c. la pantalla final con «Completar ahora» a la vista, a 390 px: el botón principal arriba, los fantasma debajo (sin CSS order: el del marcado)
  for (const idioma of ['es', 'id']) {
    const { p, ctx } = await abre({ idioma, ancho: 390, alto: 844, base: { dueno: true, falta: 'contexto_aaas' }, hash: '#ajustes-listo' });
    const m = await p.evaluate(() => ['aj-listo-completar', 'aj-listo-equipo', 'aj-listo-trabajos'].map(k => { const e = document.querySelector('[data-ag="' + k + '"]'); const r = e.getBoundingClientRect(); return { k, top: Math.round(r.top), w: Math.round(r.width), vis: !e.classList.contains('axw-oculto') && r.height > 0 }; }));
    ok(idioma + ' · 390 · final con «Completar ahora»: el principal arriba y a lo ancho, los otros dos debajo', m[0].vis && m[0].top < m[1].top && m[1].top < m[2].top && m[0].w === m[1].w, J(m));
    await ctx.close();
  }
  // 6. XSS: lo que viene de la base entra como texto
  {
    const { p, ctx } = await abre({ base: { dueno: true, xss: true }, hash: '#ajustes-negocio' });
    ok('XSS en el nombre de una reserva y en el contexto: se pinta como texto', (await sinInyeccion(p)) && (await txt(p, '[data-ag="v2-esperan"]')).includes('<img src=x') && (await p.$eval('[data-campo="ctx_quien"]', e => e.value)).includes('<img src=x'));
    await ctx.close();
  }
  // 7. el doble dice lo que dice el contrato
  {
    const b = nuevaBase({ dueno: true });
    ok('doble: agente_panel_estado devuelve exactamente las claves del contrato', J(Object.keys(estado(b)).sort()) === J(CLAVES_ESTADO), J(Object.keys(estado(b)).sort()));
    const dn = (await servidor(b, 'agente_notas_datos', { p_dia: null })).data;
    ok('doble: agente_notas_datos devuelve exactamente las claves del contrato', J(Object.keys(dn).sort()) === J(CLAVES_NOTAS), J(Object.keys(dn).sort()));
    ok('doble: cada acción lleva exactamente las claves del contrato', dn.acciones.every(x => J(Object.keys(x).sort()) === J(CLAVES_ACCION)), J(CLAVES_ACCION));
  }
  // 8. idiomas: en e id sin una cadena sin traducir, en cada vista y cada paso
  const ESTADOS = [['equipo dueño', { dueno: true }, ''], ['tope', { dueno: true, nuevo: true }, '#ajustes-tope'], ['subida', { dueno: true, propuesto: true }, '#ajustes-tope'],
                   ['negocio', { dueno: true }, '#ajustes-negocio'], ['límites (recomendado)', { dueno: true, nuevo: true }, '#ajustes-limites'], ['límites (hechos)', { dueno: true }, '#ajustes-limites'],
                   ['trabajos', { dueno: true }, '#ajustes-trabajos'], ['final', { dueno: true }, '#ajustes-listo'], ['final con falta', { dueno: true, falta: 'contexto_aaas' }, '#ajustes-listo'],
                   ['no dueño', { herramienta: true, falta: 'tope_aaas' }, '#ajustes-tope'], ['apagado', { herramienta: true, apagado: true }, ''], ['sin herramienta', {}, ''], ['notas raras', { dueno: true, notasRaras: true }, ''],
                   ['paso 0 sin dueño (apagado)', { herramienta: true, apagado: true, ow: { prop: true, yo: NOELIA, owner: null } }, '#ajustes-quien'],
                   ['paso 0 cambiar', { dueno: true, ow: { prop: true, yo: NOELIA, owner: NOELIA } }, '#ajustes-quien'],
                   ['no propietario sin dueño', { herramienta: true, ow: { yo: DION, owner: null } }, ''], ['no propietario con dueño', { herramienta: true, ow: { yo: DION, owner: NOELIA } }, '#ajustes-tope'],
                   ['no propietario apagado sin dueño', { herramienta: true, apagado: true, ow: { yo: DION, owner: null } }, ''], ['dueño inactivo', { herramienta: true, ow: { yo: DION, owner: NOELIA, inactivo: true } }, '#ajustes-tope'],
                   ['ya no lo lleva', { herramienta: true, ow: { yo: DION, owner: NOELIA, yaNo: true } }, ''], ['quién: no se pudo mirar', { dueno: true, ow: { prop: true, yo: NOELIA, owner: NOELIA, roto: true } }, '#ajustes-tope'],
                   ['lista de personas rota', { herramienta: true, apagado: true, ow: { prop: true, yo: NOELIA, owner: null, candRotos: true } }, '#ajustes-quien'],
                   ['paso 0 candidatos vacío', { herramienta: true, apagado: true, ow: { prop: true, yo: NOELIA, owner: null, candVacio: true } }, '#ajustes-quien'],
                   ['paso 0 sin candidatos', { herramienta: true, apagado: true, ow: { prop: true, yo: NOELIA, owner: null, sinCand: true } }, '#ajustes-quien']];
  for (const idioma of ['en', 'id']) {
    for (const [nombre, base, hs] of ESTADOS) {
      const { p, ctx } = await abre({ idioma, base, hash: hs });
      if (nombre === 'límites (hechos)') await p.click('[data-accion="ag-aj-ajustar"]');
      if (hs === '#ajustes-quien') await p.waitForFunction(() => document.querySelector('#ag2-aj-quien-sel').options.length > 1 || !document.querySelector('[data-ag="aj-msg-quien"]').classList.contains('axw-oculto'), null, { timeout: 4000 }).catch(() => {});
      const sin = await p.evaluate(() => window.__sinTr);
      ok(idioma + ' · ' + nombre + ': ninguna cadena sin traducir', sin.length === 0, J(sin.slice(0, 6)));
      await ctx.close();
    }
  }
  // 9. 390 y 1440 px en los tres idiomas, en cada vista: sin desborde; capturas
  for (const idioma of ['es', 'en', 'id']) {
    for (const ancho of [1440, 390]) {
      for (const [nombre, base, hs] of [['equipo', { dueno: true }, ''], ['tope', { dueno: true, nuevo: true }, '#ajustes-tope'], ['negocio', { dueno: true, nuevo: true, conTope: true }, '#ajustes-negocio'],
                                        ['limites', { dueno: true }, '#ajustes-limites'], ['trabajos', { dueno: true }, '#ajustes-trabajos'], ['listo', { dueno: true }, '#ajustes-listo'],
                                        ['listo-espera', { dueno: true, tope0: true, propuesto: true }, '#ajustes-listo'], ['apagado', { dueno: true, apagado: true }, ''],
                                        ['quien', { herramienta: true, apagado: true, ow: { prop: true, yo: NOELIA, owner: null } }, '#ajustes-quien'], ['quien-cambiar', { dueno: true, ow: { prop: true, yo: NOELIA, owner: NOELIA } }, '#ajustes-quien'],
                                        ['sin-dueno', { herramienta: true, ow: { yo: DION, owner: null } }, ''], ['ya-no', { herramienta: true, ow: { yo: DION, owner: NOELIA, yaNo: true } }, ''],
                                        ['apagado-sin-dueno', { herramienta: true, apagado: true, ow: { prop: true, yo: NOELIA, owner: null } }, '']]) {
        const { p, ctx } = await abre({ ancho, idioma, base, hash: hs, alto: 844 });
        if (nombre === 'limites') await p.click('[data-accion="ag-aj-ajustar"]');
        if (nombre.startsWith('quien')) await p.waitForFunction(() => document.querySelector('#ag2-aj-quien-sel').options.length > 1, null, { timeout: 4000 }).catch(() => {});
        if (nombre.startsWith('listo')) await p.waitForFunction(() => document.querySelectorAll('[data-ag="aj-listo-primero"] li').length > 0, null, { timeout: 4000 }).catch(() => {});
        const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, barra: window.innerWidth - document.documentElement.clientWidth }));
        // lo que gira dentro de la escena (.ag2-escena, overflow:hidden) no se sale: la escena lo recorta, y su caja cambia con cada vuelta (falso positivo según el momento)
        const anchas = await p.$$eval('[data-ag="raiz"] *', es => es.filter(e => e.getClientRects().length && !(e.parentElement && e.parentElement.closest('.ag2-escena')) && e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map(e => e.tagName + '.' + e.className + '[' + (e.getAttribute('data-ag') || '') + ']').slice(0, 4));
        ok(idioma + ' ' + ancho + ' px · ' + nombre + ': no desborda y ningún elemento se sale por la derecha', m.sw <= m.cw && anchas.length === 0, J({ m, anchas }));
        // la barra de pasos: ninguna palabra partida por la mitad («Wewenan-g» a 390 px en indonesio), medido con la fuente real
        const partidas = await p.$$eval('[data-ag="aj-pasos"] b', bs => bs.filter(b => b.getClientRects().length).map(b => {
          const cs = getComputedStyle(b), c = document.createElement('canvas').getContext('2d'); c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
          const w = Math.max.apply(null, b.textContent.split(/\s+/).map(x => c.measureText(x).width));
          return { t: b.textContent, palabra: Math.ceil(w), hueco: b.clientWidth };
        }).filter(x => x.palabra > x.hueco));
        ok(idioma + ' ' + ancho + ' px · ' + nombre + ': la barra de pasos no parte ninguna palabra', partidas.length === 0, J(partidas));
        // M4: ninguna palabra de la casa en lo que lee el dueño (lo visible de la página: menú de la pantalla, asistente, final, equipo)
        const jerga = await p.$eval('[data-ag="raiz"]', e => (e.innerText.match(/\bAaaS\b|\bERP\b|\bficha\b|\bpasada\b|\binstancia\b/gi) || []));
        ok(idioma + ' ' + ancho + ' px · ' + nombre + ': sin jerga a la vista (AaaS, ERP, ficha, pasada, instancia)', jerga.length === 0, J(jerga));
        // M5: el texto del nivel elegido cabe en su selector (no se corta), medido con la fuente real
        if (nombre === 'limites') {
          const cortes = await p.$$eval('[data-limite="nivel"]', ss => ss.filter(s => s.getClientRects().length).map(s => {
            const cs = getComputedStyle(s), c = document.createElement('canvas').getContext('2d');
            c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
            const hueco = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 20;   // 20 px: la flecha del selector
            return Array.from(s.options).map(o => ({ t: o.text, w: Math.ceil(c.measureText(o.text).width), hueco: Math.floor(hueco) })).filter(x => x.w > x.hueco);
          }).reduce((a, b) => a.concat(b), []));
          ok(idioma + ' ' + ancho + ' px · niveles: ninguna opción se corta en su selector', cortes.length === 0, J(cortes.slice(0, 3)));
        }
        if (SHOT) await p.screenshot({ path: SHOT + '_' + idioma + '_' + ancho + '_' + nombre + '.png', fullPage: true });
        await ctx.close();
      }
    }
  }
  // 10. MEDIDA DESPUÉS (Experiencia, 15-oct: id, 390×844, el dueño, desde cero): toques, campos a la vista, campos tecleados, errores y frases que contradicen la pantalla.
  //     Empieza en la vista Equipo (lo que ve al entrar) y acaba en la pantalla final; cada toque es un clic real de Playwright.
  {
    const { p, base, ctx } = await abre({ ancho: 390, alto: 844, idioma: 'id', base: { dueno: true, nuevo: true } });
    const mide = async paso => p.evaluate(ps => {
      const f = document.querySelector(ps === 'listo' ? '[data-ag="aj-listo"]' : '[data-ag="aj-f-' + ps + '"]');
      const campos = Array.from(f.querySelectorAll('input,select,textarea')).filter(e => e.getClientRects().length && !(e.closest('details') && !e.closest('details').open));
      const fin = Array.from(f.querySelectorAll('button,a.ag2-btn,a.ag2-btn2')).filter(e => e.getClientRects().length);
      const ultimo = fin.length ? Math.max.apply(null, fin.map(e => e.getBoundingClientRect().bottom)) : f.getBoundingClientRect().bottom;
      const arriba = document.querySelector('[data-ag="v2"]').getBoundingClientRect().top;
      return { paso: ps, campos: campos.length, hasta_el_boton_px: Math.round(ultimo - arriba), alto_vp: window.innerHeight, pantallas: Math.max(1, Math.ceil((ultimo - arriba) / window.innerHeight)) };
    }, paso);
    const filas = [];
    let toques = 0, tecleados = 0;
    const toca = async sel => { await p.click(sel); toques++; };
    const errores = () => p.$$eval('[data-ag^="aj-msg-"],[data-ag="aj-lim-error"]', e => e.filter(x => !x.classList.contains('axw-oculto') && x.getClientRects().length && x.textContent.trim()).map(x => x.textContent));
    let errVistos = [];
    await toca('[data-ag="v2-falta-ir"]'); await enHash(p, '#ajustes-tope');
    filas.push(await mide('tope'));
    await toca('[data-accion="ag-aj-tope-sugerido"]');
    await toca('[data-ag="aj-f-tope"] button[type="submit"]'); await enHash(p, '#ajustes-negocio'); await p.waitForTimeout(200);
    errVistos = errVistos.concat(await errores());
    filas.push(await mide('negocio'));
    await toca('[data-campo="ctx_quien"]'); await p.keyboard.type('Sewa motor di Canggu'); tecleados++;
    await toca('[data-ag="aj-f-negocio"] button[type="submit"]'); await enHash(p, '#ajustes-limites'); await p.waitForTimeout(200);
    errVistos = errVistos.concat(await errores());
    filas.push(await mide('limites'));
    await toca('[data-accion="ag-aj-recomendado"]'); await enHash(p, '#ajustes-listo'); await p.waitForTimeout(400);
    errVistos = errVistos.concat(await errores());
    await p.waitForFunction(() => document.querySelectorAll('[data-ag="aj-listo-primero"] li').length > 0, null, { timeout: 4000 }).catch(() => {});
    filas.push(await mide('listo'));
    // frases que contradicen la pantalla: «ya trabaja» con el tope aún por entrar, o un agente apagado en «lo primero que hará»
    const fin = await p.evaluate(() => ({ t: document.querySelector('[data-ag="aj-listo-t"]').textContent, l: document.querySelector('[data-ag="aj-listo-primero"]').textContent }));
    const contradice = [];
    if (/sudah bekerja/i.test(fin.t)) contradice.push('«ya trabaja» con el tope pendiente de entrar');
    if (/Rute/.test(fin.l) && base.nivel !== 1) contradice.push('nombra a Ruta con su revisión apagada');
    const pant = filas.reduce((a, f) => a + f.pantallas, 0), campos = filas.reduce((a, f) => a + f.campos, 0);
    console.log('MEDIDA DESPUÉS (id, 390×844, dueño, desde cero): ' + J(filas) + ' · pantallas=' + pant + ' · toques=' + toques + ' · campos a la vista=' + campos + ' · campos tecleados=' + tecleados
      + ' · errores=' + errVistos.length + ' · frases que contradicen la pantalla=' + contradice.length + ' · guardados=' + base.llamadas.filter(x => /^agente_ficha_/.test(x[0])).length + ' · título final=' + J(fin.t));
    ok('medida: ≤4 pantallas a 390 px en indonesio (' + pant + ')', pant <= 4, J(filas));
    ok('medida: ≤6 campos a la vista en todo el recorrido (' + campos + ')', campos <= 6, J(filas));
    ok('medida: 1 campo tecleado (quién), 6 toques, 0 errores, 0 frases que contradicen la pantalla', tecleados === 1 && toques === 6 && errVistos.length === 0 && contradice.length === 0, J({ toques, errVistos, contradice }));
    if (SHOT) for (const [paso, hs] of [['tope', '#ajustes-tope'], ['negocio', '#ajustes-negocio'], ['limites', '#ajustes-limites'], ['listo', '#ajustes-listo']]) {
      await p.goto(URL_PAG + hs); await p.waitForTimeout(400);
      await p.screenshot({ path: SHOT + '_recorrido_id_390_' + paso + '.png' });
    }
    await ctx.close();
  }
  ok('en ninguna prueba se ha llamado a ' + RETIRADAS.join(' ni a '), TODAS.every(b => RETIRADAS.every(n => llamadas(b, n).length === 0)));
  // 6b. el papel de Ruta va por su clave 'Operaciones~agente': en es sale sin el «~», en en/id no lo pisa el «Operaciones» de Lawang (Deals/Transaksi)
  for (const [idioma, esperado] of [['es', 'Operaciones'], ['en', 'Operations'], ['id', 'Operasional']]) {
    const { p, ctx } = await abre({ idioma, base: { dueno: true } });
    await p.click('[data-accion="ag-v2-agente"][data-clave="ruta"]');
    await p.waitForFunction(e => document.querySelector('[data-ag="v2-papel"]').textContent === e, esperado, { timeout: 3000 }).catch(() => {});
    const papel = await txt(p, '[data-ag="v2-papel"]');
    ok(idioma + ' · V2: el papel de Ruta sale «' + esperado + '»', papel === esperado, papel);
    await ctx.close();
  }
  // 7. PANEL V2 del AaaS autónomo (15-oct-2026)
  const v2txt = p => p.$eval('[data-ag="v2"]', e => e.textContent);
  {
    const { p, base, ctx } = await abre({ base: { dueno: true } });
    ok('V2 dueño: el panel está a la vista, lee panel y conexiones una vez cada uno', (await visible(p, '[data-ag="v2"]')) && (await visible(p, '[data-ag="v2-cuerpo"]'))
       && llamadas(base, 'agente_panel_autonomo').length === 1 && llamadas(base, 'agente_conexiones_estado').length === 1);
    ok('V2: un botón por agente del equipo (6), por id', (await p.$$eval('[data-accion="ag-v2-agente"]', e => e.map(x => x.getAttribute('data-clave')).sort().join())) === 'altavoz,capitan,cifras,radar,ruta,tesorero');
    ok('V2: empieza por el Capitán', (await txt(p, '[data-ag="v2-nombre"]')) === 'Capitán');
    const gana = await txt(p, '[data-ag="v2-gana"]'), gasta = await txt(p, '[data-ag="v2-gasta"]');
    ok('V2: cobrado en IDR y gastado en EUR, cada uno en su sitio y sin sumarse', /IDR/.test(gana) && !/EUR/.test(gana) && /EUR/.test(gasta) && !/IDR/.test(gasta), gana + ' | ' + gasta);
    ok('V2: el registro pinta sus 3 filas, con qué/por qué y las dos monedas', (await hay(p, '[data-ag="v2-fila"]')) === 3 && (await txt(p, '[data-ag="v2-registro"]')).includes('Son la última moto libre')
       && (await txt(p, '[data-ag="v2-registro"]')).includes('Espera ganar') && (await txt(p, '[data-ag="v2-registro"]')).includes('Habría pasado del tope de gasto.'));
    ok('V2: sin pausa ni palancas, nadie que reanudar (ningún «Reanudar» sin parada viva)', (await hay(p, '[data-accion="ag-v2-reanuda"]')) === 0);
    ok('V2: la cola y las 5 áreas se pintan; la de Dinero dice que no levanta el tope', (await hay(p, '[data-ag="v2-salida"]')) === 1 && (await hay(p, '[data-accion="ag-v2-area"]')) === 5
       && (await p.$eval('[data-accion="ag-v2-area"][data-clave="dinero"]', e => e.textContent)).includes('nunca levanta el tope'));
    ok('V2: la conexión de la IA dice su estado y sus 4 últimos, nunca el secreto; el campo de la llave está vacío', (await p.$eval('[data-ag="v2-conn"][data-proveedor="claude"]', e => e.textContent)).includes('…AbCd')
       && (await p.$eval('[data-campo="v2-llave"]', e => e.value)) === '');
    ok('V2: window.orbe.pulso existe y no rompe nada', await p.evaluate(() => { try { window.orbe.pulso(); return true; } catch (e) { return false; } }));
    // una fila nueva en el registro → un pulso de la bola al refrescar
    await p.evaluate(() => { window.__pulsos = 0; window.orbe.pulso = function () { window.__pulsos++; }; });
    base.v2.registro.unshift({ id: 13, en: iso(10), agente: 'ruta', area: 'operaciones', accion: 'aviso_reserva', estado: 'aplicada', motivo: null, que: 'Aviso en R-0012', porque: null, valor_esperado_cent: null, gastado_cent: null });
    await p.click('[data-accion="ag-v2-area"][data-clave="precios"]');
    await hasta(() => llamadas(base, 'agente_palanca').length === 1);
    ok('V2: parar un área manda ámbito, clave por id, parado y motivo null', J(llamadas(base, 'agente_palanca')[0][1]) === J({ p_ambito: 'area', p_clave: 'precios', p_parado: true, p_motivo: null }));
    await p.waitForFunction(() => document.querySelector('[data-accion="ag-v2-area"][data-clave="precios"]').getAttribute('aria-pressed') === 'false');
    await p.waitForTimeout(1600);
    ok('V2: una fila nueva del registro = un pulso de la bola', (await p.evaluate(() => window.__pulsos)) === 1, String(await p.evaluate(() => window.__pulsos)));
    // parar a todos
    await p.click('[data-accion="ag-v2-todos"]');
    await hasta(() => llamadas(base, 'agente_para').length === 1);
    await p.waitForFunction(() => document.querySelector('[data-accion="ag-v2-todos"]').getAttribute('aria-pressed') === 'true');
    ok('V2: «Parar a todos» llama a agente_para sin argumentos y queda pulsado', J(llamadas(base, 'agente_para')[0][1]) === '{}');
    ok('V2: con la pausa puesta, la fila parada ofrece «Reanudar» (la pausa) al dueño', (await hay(p, '[data-accion="ag-v2-reanuda"][data-ambito="pausa"]')) === 1);
    // un agente: parado con su palanca
    await p.click('[data-accion="ag-v2-agente"][data-clave="radar"]');
    await p.click('[data-accion="ag-v2-modo"][data-modo="parado"]');
    await hasta(() => llamadas(base, 'agente_palanca').length === 2);
    ok('V2: parar un agente manda su id', J(llamadas(base, 'agente_palanca')[1][1]) === J({ p_ambito: 'agente', p_clave: 'radar', p_parado: true, p_motivo: null }));
    // la llave: forma mala → lo dice la base, el campo se vacía
    await p.fill('[data-campo="v2-llave"]', 'no-es-una-llave');
    await p.click('[data-ag="v2-form-llave"] button[type="submit"]');
    await hasta(() => llamadas(base, 'agente_conexion_guarda').length === 1);
    await p.waitForFunction(() => document.querySelector('[data-ag="v2-llave-aviso"]').textContent.includes('sk-ant-'));
    ok('V2: llave mal formada: manda proveedor, secreto y ajustes; dice cómo es una llave; el campo queda vacío',
       J(Object.keys(llamadas(base, 'agente_conexion_guarda')[0][1]).sort()) === J(['p_ajustes', 'p_proveedor', 'p_secreto']) && (await p.$eval('[data-campo="v2-llave"]', e => e.value)) === '');
    // Altavoz: un dominio compartido lo rechaza la base, con su frase
    await p.fill('[data-campo="v2-dominio"]', 'bit.ly');
    await p.click('[data-ag="v2-form-dominio"] button[type="submit"]');
    await hasta(() => llamadas(base, 'agente_ajuste_altavoz').length === 1);
    await p.waitForSelector('[data-ag="v2-alt-error"]:not(.axw-oculto)');
    ok('V2: dominio compartido → «Usa tu propio dominio…», args tipo/dato/quita', (await txt(p, '[data-ag="v2-alt-error"]')).includes('propio dominio')
       && J(llamadas(base, 'agente_ajuste_altavoz')[0][1]) === J({ p_tipo: 'dominio', p_dato: { dominio: 'bit.ly' }, p_quita: false }));
    await p.click('[data-accion="ag-v2-quita"][data-tipo="dominio"]');
    await hasta(() => llamadas(base, 'agente_ajuste_altavoz').length === 2);
    await p.waitForSelector('[data-ag="v2-dominios-vacio"]');
    ok('V2: quitar un dominio manda su clave con p_quita true y la lista lo dice vacía', J(llamadas(base, 'agente_ajuste_altavoz')[1][1]) === J({ p_tipo: 'dominio', p_dato: { dominio: 'minegocio.example' }, p_quita: true }));
    ok('V2: ningún error de JS ni escritura directa', await sinErrores(p));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, xss: true } });
    ok('V2 XSS: lo que escribe la IA sale como texto y no inyecta nada', (await sinInyeccion(p)) && (await txt(p, '[data-ag="v2-registro"]')).includes('<img src=x') && (await txt(p, '[data-ag="v2-cola"]')).includes('<img src=x'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true, pausa: true } });
    ok('V2 no dueño con la pausa: «Parar a todos» no puede reanudar y dice que es del dueño', (await p.$eval('[data-accion="ag-v2-todos"]', e => e.disabled)) && (await txt(p, '[data-ag="v2-todos-nota"]')).includes('Solo el dueño'));
    ok('V2 no dueño: ni «Reanudar» en el registro, ni formulario de la llave ni del Altavoz', (await hay(p, '[data-accion="ag-v2-reanuda"]')) === 0 && (await txt(p, '[data-ag="v2-registro"]')).includes('Lo reanuda el dueño.')
       && !(await visible(p, '[data-ag="v2-form-llave"]')) && !(await visible(p, '[data-ag="v2-form-dominio"]')));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, sinGanado: true, sinRegistro: true } });
    ok('V2 sin acceso a lo cobrado: «Sin acceso o sin datos», nunca 0', (await txt(p, '[data-ag="v2-gana"]')) === 'Sin acceso o sin datos');
    ok('V2 registro vacío: estado vacío explicado; cola vacía también', (await hay(p, '[data-ag="v2-sin-registro"]')) === 1 && (await hay(p, '[data-ag="v2-sin-cola"]')) === 1);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true, soloReservas: true } });
    ok('V2 solo reservas (sin ser admin): el rótulo dice que es parcial, nunca el total', (await txt(p, '[data-ag="v2-gana-t"]')).includes('solo reservas')
       && (await txt(p, '[data-ag="v2-gana-nota"]')).includes('Solo lo que tu usuario puede ver'));
    await ctx.close();
  }
  for (const idioma of ['en', 'id']) {
    const { p, ctx } = await abre({ idioma, base: { herramienta: true, soloReservas: true } });
    ok('V2 ' + idioma + ' solo reservas: traducido', (await p.evaluate(() => window.__sinTr)).length === 0 && (await txt(p, '[data-ag="v2-gana-t"]')).includes(idioma === 'en' ? 'bookings only' : 'hanya booking'));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { herramienta: true, pruebas: true } });
    ok('V2 cuenta de pruebas: estado propio («solo mirar») y el resto de la pantalla sigue', (await txt(p, '[data-ag="v2-error"]')).includes('Cuenta de demostración') && (await p.$eval('[data-ag="carga"]', e => e.getAttribute('data-tipo'))) === 'listo' && (await visible(p, '[data-ag="v2-tabs"]')) && !(await visible(p, '[data-ag="v2-cuerpo"]')));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { dueno: true, v2Roto: true } });
    ok('V2 sin la función en la base: «no se ha podido mirar» en el panel, el resto sigue', (await txt(p, '[data-ag="v2-error"]')).includes('no se ha podido mirar') && (await visible(p, '[data-ag="v2-tabs"]')) && (await visible(p, '[data-ag="v2-esperan"]')));
    await ctx.close();
  }
  for (const idioma of ['en', 'id']) {
    const { p, ctx } = await abre({ idioma, base: { dueno: true, pausa: true } });
    const sin = await p.evaluate(() => window.__sinTr);
    ok('V2 ' + idioma + ': ninguna cadena sin traducir', sin.length === 0, J(sin.slice(0, 6)));
    ok('V2 ' + idioma + ': el área sale con el nombre de la base en su idioma', (await p.$eval('[data-accion="ag-v2-area"][data-clave="dinero"]', e => e.textContent)).includes(idioma === 'en' ? 'Money' : 'Keuangan'));
    await ctx.close();
  }
  // movimiento reducido: nada se anima y el texto del agente está entero de una vez
  for (const ancho of [1440, 390]) {
    for (const mov of ['no-preference', 'reduce']) {
      const base = nuevaBase({ dueno: true });
      const ctx = await nav.newContext({ viewport: { width: ancho, height: 1000 }, reducedMotion: mov });
      const p = await ctx.newPage();
      await p.exposeFunction('__srv', (n, a) => servidor(base, n, a));
      await p.setContent(pagina('es'), { waitUntil: 'load' });
      await p.waitForFunction(() => document.querySelector('[data-ag="carga"]').getAttribute('data-tipo') !== 'cargando', null, { timeout: 5000 });
      await p.waitForTimeout(400);
      const an = await p.evaluate(() => document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.ag2') && a.playState === 'running').length);
      const dice = await p.evaluate(() => ({ ya: document.querySelector('[data-ag="v2-dice"] .ag2-ya').textContent, sr: document.querySelector('[data-ag="v2-dice-sr"]').textContent }));
      if (mov === 'reduce') ok('V2 ' + ancho + ' reduce: ninguna animación en marcha y el texto entero', an === 0 && dice.ya === dice.sr && dice.sr.length > 0, J({ an, dice }));
      else ok('V2 ' + ancho + ' sin preferencia: la bola se mueve', an > 0, String(an));
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      ok('V2 ' + ancho + ' ' + mov + ': sin scroll horizontal', m.sw <= m.cw, J(m));
      if (SHOT) {
        await p.waitForTimeout(mov === 'reduce' ? 0 : 1200);
        const el = await p.$('[data-ag="v2"]');
        await el.screenshot({ path: SHOT + '_v2_' + ancho + '_' + mov + '.png' });
      }
      await ctx.close();
    }
  }
  await nav.close();
  console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\nTODO EN VERDE');
  process.exit(fallos ? 1 : 0);
})();
