// node comercial/demo-erp/pruebas/agente.harness.cjs [captura_prefijo]
// Harness del PANEL DEL PILOTO (EP.5, 13-oct-2026): el agente.html REAL (marcado + script, con las ayudas comunes pegadas como hace build.py) en Chromium, con la base y la sesión
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

/* Una base con la forma de agente_forma.json. o: dueno, herramienta, apagado, nulo (el interruptor del navegador contesta null), sinDatos, xss, pausa, sinNotas, freno */
function nuevaBase(o = {}) {
  const trabajos = {}; FORMA.trabajos.forEach(t => { trabajos[t] = true; });
  const s = { o, llamadas: [], encendido: !o.apagado, parado: !!o.pausa, nivel: 1, tope: 3700, trabajos, decisiones: {}, propDec: {} };
  return s;
}
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
  return { encendido: true, parado: s.parado, soy_dueno: dueno, puedo_decidir: decide && !o.pruebas,
    ultima_pasada: o.sinNotas ? null : { dia: HOY, pasada: 'tarde', en: iso(18), resultado: s.parado ? 'en_pausa' : 'hecha' },
    tope_mensual_cent: s.tope, gastado_mes_cent: 0, moneda: 'EUR', usd_por_eur: 1.08, trabajos: Object.assign({}, s.trabajos), nivel_ruta: s.nivel, nivel_max: 1, cupo_dia: 24, notas_hoy: o.sinNotas ? 0 : 9 };
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
      return { data: { dia: HOY, hoy: HOY, notas: notas(s), propuestas: propuestas(s), nombres: nombres(s) }, error: null };
    case 'agente_nota_decide':
      if (o.pruebas) return err('42501', 'cuenta de pruebas', 'cuenta_pruebas');
      s.decisiones[a.p_id] = [a.p_decision, o.xss ? XSS : 'Made'];
      return { data: { ok: true, decision: a.p_decision }, error: null };
    case 'agente_propuesta_decide': { const e = soloDueno(); if (e) return e; s.propDec[a.p_id] = [a.p_decision, a.p_nota]; return { data: { ok: true, estado: a.p_decision }, error: null }; }
    case 'agente_para': if (o.freno) return err('P0001', 'freno', 'agente_freno'); s.parado = true; return { data: { parado: true }, error: null };
    case 'agente_reanuda': { const e = soloDueno(); if (e) return e; s.parado = false; return { data: { parado: false }, error: null }; }
    case 'agente_ficha_ajusta': {
      const e = soloDueno(); if (e) return e;
      if (a.p_trabajos.some(t => !FORMA.trabajos.includes(t))) return err('22023', 'trabajo desconocido', 'datos');
      s.trabajos = {}; FORMA.trabajos.forEach(t => { s.trabajos[t] = a.p_trabajos.includes(t); });
      s.nivel = a.p_nivel_ruta; s.tope = a.p_tope_mensual_cent;
      return { data: estado(s), error: null };
    }
    case 'agente_modulo_cambia': { const e = soloDueno(); if (e) return e; s.encendido = !!a.p_encender; return { data: { encendido: s.encendido }, error: null }; }
  }
  return err('PGRST202', 'Could not find the function public.' + nombre + ' in the schema cache');
}

const pagina = (idioma) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title></head><body>
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
window.lwLocale = function () { return window.LW_IDIOMA === 'en' ? 'en-GB' : (window.LW_IDIOMA === 'id' ? 'id-ID' : 'es-ES'); };
window.lwT = function (s) { s = String(s); var d = window.LW_IDIOMA === 'en' ? window.LW_EN : (window.LW_IDIOMA === 'id' ? window.LW_ID : null);
  if (d) { if (Object.prototype.hasOwnProperty.call(d, s)) return d[s]; if (!/^[\\s\u2014\u00b70-9.,%():\u2265\u2264-]*$/.test(s)) window.__sinTr.push(s); } return s; };
window.lwIdiomaAplicar = function (raiz) { Array.prototype.forEach.call(raiz.querySelectorAll('[data-lwt]'), function (e) { e.textContent = window.lwT(e.textContent); }); };
window.onerror = function (m) { window.__errores.push(String(m)); };
</script>
<script>${SCRIPT.replace(/<\/?script>/g, '')}</script></body></html>`;

(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
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

  // 1. el dueño con el piloto encendido: todo a la vista
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
    ok('cierre: manda la nota de la tarde sobre la de la mañana', (await tarjeta(p, 'cierre')).includes('tarde') && (await p.$eval('[data-trabajo="cierre"] dl', e => e.textContent)).includes('5'));
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
    ok('null del interruptor = apagado, con Encender (la base decide)', (await txt(p, '[data-ag="estado"]')).includes('Apagado') && (await hay(p, '[data-accion="ag-encender"]')) === 1);
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
    const { p, ctx } = await abre({ base: { herramienta: true, freno: true } });
    await p.click('[data-accion="ag-parar"]');
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
  // 5. idiomas: en e id sin una cadena sin traducir, en todos los estados
  for (const idioma of ['en', 'id']) {
    for (const [nombre, base] of [['dueño', { dueno: true }], ['no dueño', { herramienta: true }], ['sin datos', { dueno: true, sinDatos: true }], ['sin notas', { dueno: true, sinNotas: true }],
                                  ['apagado', { herramienta: true, apagado: true }], ['sin herramienta', {}], ['notas raras', { dueno: true, notasRaras: true }]]) {
      const { p, ctx } = await abre({ idioma, base });
      if (nombre === 'dueño') { await p.click('[data-accion="ag-apagar"]'); await p.click('[data-accion="ag-modal-confirmar"]'); }
      const sin = await p.evaluate(() => window.__sinTr);
      ok(idioma + ' · ' + nombre + ': ninguna cadena sin traducir', sin.length === 0, J(sin.slice(0, 6)));
      if (nombre === 'dueño') ok(idioma + ' · el título traducido', (await txt(p, 'h1')) === 'Pilot');
      await ctx.close();
    }
  }
  // 6. 390 y 1440 px en los tres idiomas, con capturas
  for (const idioma of ['es', 'en', 'id']) {
    for (const ancho of [1440, 390]) {
      const { p, ctx } = await abre({ ancho, idioma, base: { dueno: true } });
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      ok(idioma + ' ' + ancho + ' px · el panel no desborda', m.sw <= m.cw, J(m));
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
