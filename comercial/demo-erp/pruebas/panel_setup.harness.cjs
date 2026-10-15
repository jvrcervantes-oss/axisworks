// node comercial/demo-erp/pruebas/panel_setup.harness.cjs <raíz del paquete YA CONSTRUIDO con build.py --instancia axisworks-demo> <raíz de la agencia> [captura_prefijo]
// Harness del setup en el panel de control (/panel/, 12-oct-2026, erp-panel-2). Owner: «una cosa es activar un módulo y otra cosa es que
// pueda funcionar… módulo primero y setup después». Chromium sobre el panel REAL del paquete; la edge erp-control es un DOBLE en memoria
// (page.route) con la forma que fijó Backend (bbm-p21) para erp_control_estado: por módulo `setup` y `setup_estado`. Nada sale a ninguna
// base: cualquier otra petición a *.supabase.co es un fallo. Mide:
//   · S01: al encender Facturas, UNA confirmación con lo que arrastra (lo calcula la simulación del doble) y los pasos de cada módulo que
//     se enciende; un módulo sin declaración sale como aviso y no impide; Cancelar no aplica; Encender aplica el conjunto final;
//   · una base que aún no manda `setup` NO se confunde con «sin declarar»: aviso de «aún no informa», ningún «sin asistente»;
//   · estado por instancia en las tarjetas: listo, a medias, sin asistente, nada que configurar, desconocido (forma rara);
//   · S00 (/panel/#mapa): una columna por perfil real (erp/perfiles.json), una fila por paso declarado (erp/modulos.json → setup), en
//     inglés y sin nombres de clientes; a 390 px la página no se desborda;
//   · 0 errores de consola.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const RAIZ = path.resolve(process.argv[2] || '');
const AGENCIA = path.resolve(process.argv[3] || '');
const SHOT = process.argv[4];
let fallos = 0, total = 0;
const ok = (nombre, c, extra = '') => { total++; if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + nombre); };
const ORIGEN = 'https://app.prueba.test';
const TIPOS = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };

const REG = JSON.parse(fs.readFileSync(path.join(AGENCIA, 'erp', 'modulos.json'), 'utf8'));
const PAQ = JSON.parse(fs.readFileSync(path.join(AGENCIA, 'erp', 'perfiles.json'), 'utf8'));
const PERF = PAQ.perfiles;
const sinPorQue = o => Object.fromEntries(Object.entries(o).filter(([k]) => k !== '_por_que'));
const PERFILES = { tipos: Object.entries(PERF).map(([tipo, p]) => ({ tipo, nombre: p.nombre, descripcion: p.descripcion, modulos: p.modulos,
  modulos_opcionales: p.modulos_opcionales, comprobado: p.comprobado, motivo_bloqueo: p.comprobado ? null : (p.motivo_bloqueo ?? null) })),
  ajustes: sinPorQue(PAQ.ajustes_permitidos), ajustes_reglas: sinPorQue(PAQ.ajustes_reglas), tope_modulos: PAQ.tope_modulos };
// setup tal como lo siembra erp_modulos.setup (sin rpc ni ajustes, como dice el plan): pasos o {ninguno}
// «sin declarar» es un caso del DOBLE, no del registro: desde N4 (14-oct) el registro real ya declara bancos y sociedades, y el arnés dejaba de
// medir ese camino del panel (erp-eu4-2, 15-oct). Estas dos se siembran sin declaración a propósito
const SIN_DECLARAR = ['bancos', 'sociedades'];
const sembrado = k => { const d = SIN_DECLARAR.indexOf(k) !== -1 ? null : REG.setup.modulos[k]; if (d == null) return null; if (typeof d === 'string') return { ninguno: d.replace(/^ninguno:?\s*/, '') };
  return { estado: d.estado, pasos: d.pasos.map(p => ({ clave: p.clave, obligatorio: p.obligatorio, irreversible: p.irreversible, donde: p.donde, modulo_requerido: p.modulo_requerido })) }; };
const DEPENDE = { facturas: ['recibos', 'sociedades'], recibos: [], sociedades: [], 'reservas-producto': ['productos'], productos: [], bancos: [], gastos: [], 'whatsapp-bot': [], base: [] };
const MODS = Object.keys(DEPENDE);
const ESTADO_MOD = { base: { estado: 'configurado', hechos: 1, total: 1 }, 'reservas-producto': { estado: 'sin_configurar', hechos: 1, total: 4 },
  productos: null, bancos: null, 'whatsapp-bot': { estado: 'raro' } };
// Techo del AaaS (16-oct-2026): la forma de agente_techos_estado (20261015194000). Arranca SIN techo (tope vigente 0, lo arregla el estudio);
// techo_aaas_pon fusiona como la base y rechaza la cordura (> 100.000.000 céntimos) con el código que erp-control traduce. La base vieja no lo trae.
const AAAS = { techos: { tope_mensual_cent: 0, tope_modulo_cent: 0, equipo_nivel_max: 0 }, techo_puesto: false, encendido: false, tope_ficha_cent: null,
  subida_pendiente_cent: null, tope_vigente_cent: 0, hay_owner: true, owner_cambiado_en: null, cambios_owner_24h: 0 };
const CORDURA_MSG = 'Ese tope pasa del límite de cordura (100.000.000 céntimos): revisa la cifra.';
function techoPon(t) {
  if (['tope_mensual_cent', 'tope_modulo_cent'].some(k => k in t && t[k] > 100000000)) return { __st: 400, error: 'cordura', mensaje: CORDURA_MSG };
  const antes = JSON.stringify(AAAS.techos);
  Object.assign(AAAS.techos, t);
  if ('tope_mensual_cent' in t) AAAS.techo_puesto = true;
  AAAS.tope_vigente_cent = Math.min(AAAS.tope_ficha_cent || 0, AAAS.techos.tope_mensual_cent);
  return { ok: true, techo: { ...AAAS, cambia: JSON.stringify(AAAS.techos) !== antes } };
}
function estadoInst(activos, conSetup) {
  return { activos: activos.slice(), marca: 'Sample Rentals', apagados: 3, edges_desplegadas: [], log: [], ...(conSetup ? { aaas: AAAS } : {}),
    ficha: { marca: 'Sample Rentals', dominio_web: 'sample.test', url_intranet: 'https://erp.sample.test', super_admins: [{ correo: 'admin@sample.test', confirmado: true, difiere: false }] },
    modulos: MODS.map(k => { const m = { modulo: k, depende: DEPENDE[k], instalable: true, edges: [], motivo: null };
      if (!conSetup) return m;
      m.setup = k === 'whatsapp-bot' ? { pasos: [] } : sembrado(k);
      if (activos.indexOf(k) !== -1 && k in ESTADO_MOD) m.setup_estado = ESTADO_MOD[k];
      else if (activos.indexOf(k) !== -1) m.setup_estado = null;
      return m; }) };
}
const ACT0 = ['base', 'productos', 'reservas-producto', 'bancos', 'whatsapp-bot'];
const llamadas = [];
function cierra(set) { const s = new Set(set); let cambia = true; while (cambia) { cambia = false; for (const k of [...s]) for (const d of DEPENDE[k] || []) if (!s.has(d)) { s.add(d); cambia = true; } } return [...s]; }
// EU4 (20261014097000) y A14 (096000) en el doble: encender exige un ensayo del conjunto EXACTO (con base, ordenado); sin él, `sin_ensayo` con
// {conjunto, motivo}. Ensayado solo el conjunto CERRADO de Facturas (S01); Recibos solo lo rechaza el disparador de tipo (`rechazo`)
const clave = a => [...new Set(['base', ...a])].sort().join(',');
const ENSAYADOS = new Set([clave(cierra([...ACT0, 'facturas']))]);
const RECHAZOS = { [clave([...ACT0, 'recibos'])]: { codigo: 'modulo_de_otro_tipo', lista: null } };
function simula(actuales, activos) {
  const faltan = {};
  activos.forEach(k => { const f = (DEPENDE[k] || []).filter(d => activos.indexOf(d) === -1); if (f.length) faltan[k] = f; });
  return { enciende: activos.filter(k => actuales.indexOf(k) === -1), apaga: actuales.filter(k => activos.indexOf(k) === -1),
    faltan_dependencias: faltan, sugerido_con_dependencias: cierra(activos), sugerido_sin_dependientes: activos,
    no_instalables: [], edges_faltan: {}, desconocidos: [],
    condiciones_faltan: activos.indexOf('gastos') !== -1 && actuales.indexOf('gastos') === -1 ? { gastos: ['terminos_sin_aceptar'] } : undefined,
    sin_ensayo: activos.some(k => actuales.indexOf(k) === -1) && !ENSAYADOS.has(clave(activos))
      ? { conjunto: clave(activos).split(','), motivo: 'no hay un ensayo vigente de este conjunto' } : null,
    rechazo: RECHAZOS[clave(activos)] || null, regla_sin_mirar: null };
}
function edge(cuerpo) {
  llamadas.push(cuerpo);
  if (cuerpo.accion === 'estado') return { instancias: [
    { nombre: 'sample-rentals', marca: 'Sample Rentals', dominio: 'erp.sample.test', editable: true, motivo: null, estado: estadoInst(ACT0, true) },
    { nombre: 'old-base', marca: 'Old Base', dominio: 'erp.old.test', editable: true, motivo: null, estado: estadoInst(ACT0, false) }],
    perfiles: PERFILES };
  if (cuerpo.accion === 'simula') return { simulacion: simula(ACT0, cuerpo.activos) };
  if (cuerpo.accion === 'alta') return { solicitud: 7 };
  if (cuerpo.accion === 'techo_aaas_estado') return cuerpo.instancia === 'sample-rentals' ? { ok: true, techo: AAAS } : { __st: 409, error: 'sin_migracion' };
  if (cuerpo.accion === 'techo_aaas_pon') return cuerpo.instancia === 'sample-rentals' ? techoPon(cuerpo.techos || {}) : { __st: 409, error: 'sin_migracion' };
  if (cuerpo.accion === 'cambia') return { aplicado: { enciende: cuerpo.activos.filter(k => ACT0.indexOf(k) === -1), apaga: [] } };
  return { error: 'accion' };
}
const FALSO = `(function(){
  var ses = { access_token:'a', refresh_token:'r', user:{ id:'u1', email:'operador@prueba.test' } };
  var tablas = { usuarios: { rol:'super_admin', herramientas:[], activo:true, nombre:'Operador', notif_visto_hasta:null, ambito:null, empresas:null, es_propietario:true } };
  function q(t){ var st = { single:false, then:null };
    var px = new Proxy({}, { get:function(_o,k){
      if (k==='then') return st.then || function(ok,ko){ var d = tablas[t]; return Promise.resolve({ data: st.single ? (d||null) : (d?[d]:[]), error:null }).then(ok,ko); };
      if (k==='maybeSingle'||k==='single') return function(){ st.single=true; return px; };
      if (k==='__pon') return function(f){ st.then=f; return px; };
      return function(){ return px; }; } });
    return px; }
  var cli = { auth:{ getSession:function(){return Promise.resolve({data:{session:ses},error:null});}, getUser:function(){return Promise.resolve({data:{user:ses.user},error:null});},
      onAuthStateChange:function(){return {data:{subscription:{unsubscribe:function(){}}}};}, signOut:function(){return Promise.resolve({error:null});} },
    from:q, rpc:function(){ return q('__').__pon(function(ok,ko){ return Promise.resolve({ data: [], error:null }).then(ok,ko); }); },
    channel:function(){ var c={on:function(){return c;},subscribe:function(){return c;}}; return c; }, removeChannel:function(){} };
  window.supabase = { createClient:function(){ return cli; } };
})();`;
function fichero(url) {
  let p = decodeURIComponent(new URL(url).pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RAIZ, p);
  return f.startsWith(RAIZ) && fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}
const ajena = [], marcaGoogle = [];
(async () => {
  if (!fs.existsSync(path.join(RAIZ, 'panel', 'index.html'))) { console.log('NO SE HA PODIDO MIRAR: falta panel/index.html en ' + RAIZ); process.exit(2); }
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.route('**/*', route => {
    const req = route.request(), url = req.url();
    if (/supabase-js/.test(url)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: FALSO });
    if (/\.supabase\.co\/functions\/v1\/erp-control$/.test(url)) {
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
      const r = edge(JSON.parse(req.postData() || '{}')), st = r.__st || 200;
      delete r.__st;
      return route.fulfill({ status: st, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(r) });
    }
    if (/supabase\.co/.test(url)) { ajena.push(url); return route.abort(); }
    if (/fonts\.(googleapis|gstatic)\.com/.test(url)) { if (/Unbounded|Manrope|IBM\+Plex/i.test(url)) marcaGoogle.push(url); return route.continue(); }
    if (!url.startsWith(ORIGEN)) return route.abort();
    const f = fichero(url);
    if (!f) return route.fulfill({ status: 404, body: '' });
    let body = fs.readFileSync(f);
    if (f.endsWith('.html')) body = body.toString('utf8').replace(/ integrity="[^"]*"/g, '');
    return route.fulfill({ status: 200, contentType: TIPOS[path.extname(f)] || 'application/octet-stream', body });
  });
  const errores = [];
  const p = await ctx.newPage();
  p.on('pageerror', e => errores.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errores.push(m.text()); });
  const anchos = () => p.evaluate(() => ({ sw: document.scrollingElement.scrollWidth, w: innerWidth,
    fuera: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && !e.closest('.ax-tabla-caja,dialog:not([open])'); })
      .slice(0, 4).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + String(e.className).split(' ')[0] + ' ' + Math.round(e.getBoundingClientRect().right)) }));
  // la captura de página entera arriba del todo y sin el aviso flotante de la prueba anterior (el «goto» a #mapa no recarga: conserva el scroll)
  const limpiaParaCaptura = () => p.evaluate(() => { scrollTo(0, 0); document.getElementById('toast').classList.add('hidden'); });
  const html = fs.readFileSync(path.join(RAIZ, 'panel', 'index.html'), 'utf8');
  const fuga = (html.match(/_[a-z_]+_setup_estado|sociedad_guarda|ajustes_config_guardar|producto_guarda|#283|"rpc"|"ajustes"|"herramienta"|"operativo"/) || [])[0];
  // /panel/ va en el paquete de TODAS las instancias: ni en un comentario el alias de un cliente (revisor del Techo, 16-oct). Rodeado de lo que
  // nunca sale en base64 (espacio, paréntesis, guion…): las fuentes incrustadas contienen esas letras por azar
  { const alias = (html.match(/[\s(,;]bbm[\s\-),;:]/i) || [])[0]; ok('/panel/ no lleva el alias de un cliente, ni en comentarios', !alias, alias); }
  ok('/panel/ es público: no lleva rpc, ajustes, funciones de estado ni motivos internos del registro', !fuga, fuga);
  await p.goto(ORIGEN + '/panel/', { waitUntil: 'load' });
  await p.waitForSelector('#modulos [data-mod]', { timeout: 15000 });
  // ── fuentes de la marca DENTRO de la página (producción solo sirve /panel/index.html y panel.css) ─────────────────────────────
  const fu = await p.evaluate(async () => { const r = {}; for (const f of ['600 16px Unbounded', '300 16px Unbounded', '700 15px Manrope', '500 11px "IBM Plex Mono"']) {
    const l = await document.fonts.load(f); r[f] = l.length > 0 && l.every(x => x.status === 'loaded'); } return r; });
  ok('fuentes: Unbounded, Manrope e IBM Plex Mono cargadas desde la propia página', Object.values(fu).every(Boolean), JSON.stringify(fu));
  ok('fuentes: el HTML no enlaza /assets/fonts ni pide la marca a Google', !/\/assets\/fonts\//.test(html) && !/family=(Unbounded|Manrope|IBM\+Plex)/.test(html));
  await p.waitForTimeout(300);
  if (SHOT) await p.screenshot({ path: SHOT + '_s01mods_1440.png' });

  // ── estado por instancia ──────────────────────────────────────────────────────────────────────────────────────────────────────

  // Contraste medido sobre lo pintado: cada texto visible contra su fondo efectivo (capas con transparencia mezcladas), ≥ 4,5:1; el carril
  // de cada interruptor activo contra su tarjeta, ≥ 3:1. Fuera: el asistente y el aviso flotante (no cambian) y los controles deshabilitados.
  const contraste = () => p.evaluate(() => {
    const rgb = s => { const m = s.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
    const lum = c => { const a = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
    const mezcla = (arr, fondo) => { const a = arr[3] === undefined ? 1 : arr[3]; return [0, 1, 2].map(i => arr[i] * a + fondo[i] * (1 - a)); };
    const fondoDe = el => { const capas = []; for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c[3] === undefined || c[3] > 0) capas.push(c); if (c[3] === undefined || c[3] === 1) break; }
      let f = [255, 255, 255]; for (let i = capas.length - 1; i >= 0; i--) f = mezcla(capas[i], f); return f; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const malos = [], vistos = new Set();
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const el = n.parentElement;
      if (!n.textContent.trim() || !el || vistos.has(el)) continue;
      vistos.add(el);
      if (el.closest('#asis,#toast,.sr-only,.hidden,button:disabled') || el.closest('dialog:not([open])')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
      if (document.querySelector('dialog[open]') && !el.closest('dialog[open]')) continue;   // con un diálogo abierto, lo de detrás está velado
      const fondo = fondoDe(el), color = mezcla(rgb(getComputedStyle(el).color), fondo), q = ratio(color, fondo);
      if (q < 4.5) malos.push(q.toFixed(2) + ' «' + n.textContent.trim().slice(0, 30) + '»');
    }
    for (const sw of document.querySelectorAll('.ax-sw:not(:disabled)')) {
      const q = ratio(rgb(getComputedStyle(sw).backgroundColor), fondoDe(sw.parentElement));
      if (q < 3) malos.push('interruptor ' + sw.getAttribute('data-mod') + ' ' + q.toFixed(2));
    }
    return malos;
  });
  { const c1 = await contraste(); ok('contraste S01 a 1440: texto ≥ 4,5:1 e interruptores ≥ 3:1', c1.length === 0, c1.join(' | ')); }
  const etiqueta = k => p.evaluate(k => { const b = document.querySelector('#modulos [data-mod="' + k + '"]'); const c = b && b.parentElement;
    const e = c && c.querySelector('[data-setup-estado]'); return e ? e.textContent.trim() : null; }, k);
  ok('estado: reservas-producto a medias (1 de 4)', (await etiqueta('reservas-producto')) === 'A medias · 1 de 4', await etiqueta('reservas-producto'));
  ok('estado: productos «Nada que configurar» (ninguno)', (await etiqueta('productos')) === 'Nada que configurar', await etiqueta('productos'));
  ok('estado: bancos «Sin asistente aún» (sin declarar)', (await etiqueta('bancos')) === 'Sin asistente aún', await etiqueta('bancos'));
  ok('estado: una forma rara es «Estado desconocido», nunca listo', (await etiqueta('whatsapp-bot')) === 'Estado desconocido', await etiqueta('whatsapp-bot'));
  ok('estado: un módulo apagado no lleva etiqueta', (await etiqueta('facturas')) === null);
  const resumen = await p.evaluate(() => { const r = document.querySelector('[data-setup-resumen]'); return r ? [r.getAttribute('data-setup-resumen'), r.textContent] : null; });
  ok('estado: el resumen de la instancia sale de la base (y nombra la base)', !!resumen && resumen[0] === 'ok' && /Base/.test(resumen[1]) && /a medias/.test(resumen[1]), JSON.stringify(resumen));
  ok('estado: el desconocido se cuenta aparte, no como «sin configurar»', !!resumen && /1 con estado desconocido/.test(resumen[1]) && !/sin configurar/.test(resumen[1]), resumen && resumen[1]);

  // ── S01: encender Facturas ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const antes = llamadas.length;
  await p.click('#modulos [data-mod="facturas"]');
  await p.waitForSelector('#dlg[open]', { timeout: 8000 });
  const sims = llamadas.slice(antes).filter(c => c.accion === 'simula');
  ok('S01: se simula el encendido y después el conjunto que propone la base', sims.length === 2 && sims[1].activos.indexOf('sociedades') !== -1 && sims[1].activos.indexOf('recibos') !== -1, JSON.stringify(sims));
  const d = await p.evaluate(() => ({
    titulo: document.getElementById('dlg-titulo').textContent, arrastra: (document.querySelector('#dlg [data-arrastra]') || {}).textContent || '',
    pasos: [...document.querySelectorAll('#dlg [data-paso]')].map(e => e.getAttribute('data-paso')),
    irrev: [...document.querySelectorAll('#dlg [data-paso] [data-irreversible]')].map(e => e.closest('[data-paso]').getAttribute('data-paso')),
    sinDecl: [...document.querySelectorAll('#dlg [data-setup="sin_declarar"]')].map(e => e.textContent), sinDato: !!document.querySelector('#dlg [data-setup="sin_dato"]'),
    ok: document.getElementById('dlg-ok').textContent, okVisible: !document.getElementById('dlg-ok').classList.contains('hidden'),
    ancho: document.getElementById('dlg').getBoundingClientRect().width }));
  ok('S01: el título dice qué se enciende', d.titulo === 'Encender Facturación', d.titulo);
  ok('S01: dice qué arrastra (Recibos y Sociedades: se encienden juntos)', /Cobros y recibís y Sociedades emisoras/.test(d.arrastra) && /se encienden juntos/.test(d.arrastra), d.arrastra);
  const esperados = ['facturas', 'recibos'].flatMap(k => (REG.setup.modulos[k].pasos || []).map(x => k + '.' + x.clave));
  ok('S01: enseña los pasos declarados de cada módulo que se enciende', JSON.stringify(d.pasos.slice().sort()) === JSON.stringify(esperados.slice().sort()), JSON.stringify(d.pasos));
  ok('S01: el prefijo sale como «sin vuelta atrás»', d.irrev.indexOf('facturas.prefijo') !== -1 && d.irrev.length === 1, JSON.stringify(d.irrev));
  ok('S01: Sociedades sin declaración sale como AVISO y no impide', d.sinDecl.length === 1 && /Sociedades emisoras/.test(d.sinDecl[0]) && d.okVisible, JSON.stringify(d.sinDecl));
  ok('S01: con la base al día no sale el aviso de «aún no informa»', !d.sinDato);
  ok('S01: un solo botón enciende los 3', d.ok === 'Encender 3 módulos', d.ok);
  if (SHOT) await p.screenshot({ path: SHOT + '_s01_1440.png' });
  { const cd = await contraste(); ok('contraste del diálogo de encender', cd.length === 0, cd.join(' | ')); }
  const res = await p.evaluate(() => ({ sel: [...document.querySelectorAll('#modulos [data-tarjeta].sel')].map(e => e.getAttribute('data-tarjeta')),
    dep: [...document.querySelectorAll('#modulos [data-tarjeta].dep')].map(e => e.getAttribute('data-tarjeta')).sort() }));
  ok('S01: mientras se confirma, la tarjeta que se enciende y las que arrastra se marcan', JSON.stringify(res) === JSON.stringify({ sel: ['facturas'], dep: ['recibos', 'sociedades'] }), JSON.stringify(res));
  await p.click('#dlg button[value="no"]');
  await p.waitForTimeout(300);
  ok('S01: al cancelar no queda ninguna marcada', await p.evaluate(() => !document.querySelector('#modulos .sel,#modulos .dep')));
  ok('S01: cancelado, el interruptor sigue apagado', await p.evaluate(() => document.querySelector('#modulos [data-mod="facturas"]').getAttribute('aria-checked') === 'false'));
  ok('S01: Cancelar no aplica nada', !llamadas.some(c => c.accion === 'cambia'));
  await p.click('#modulos [data-mod="facturas"]');
  await p.waitForSelector('#dlg[open]');
  await p.click('#dlg-ok');
  await p.waitForTimeout(800);
  const cambios = llamadas.filter(c => c.accion === 'cambia');
  ok('S01: Encender aplica el conjunto final (al doble)', cambios.length === 1 && ['facturas', 'recibos', 'sociedades'].every(k => cambios[0].activos.indexOf(k) !== -1), JSON.stringify(cambios));

  // ── condiciones que pide la base (whatsapp-bot: términos) bloquean, no se ofrecen como «Encender» ──────────────────────────────
  await p.click('#modulos [data-mod="gastos"]');
  await p.waitForSelector('#dlg[open]');
  const cfd = await p.evaluate(() => ({ t: document.getElementById('dlg-titulo').textContent, ok: document.getElementById('dlg-ok').classList.contains('hidden'),
    txt: document.getElementById('dlg-cuerpo').textContent }));
  ok('condiciones_faltan: bloquea sin botón de encender', cfd.t === 'No se puede aplicar' && cfd.ok && /terminos_sin_aceptar/.test(cfd.txt), JSON.stringify(cfd));
  await p.click('#dlg button[value="no"]');

  // ── EU4: sin ensayo del conjunto final bloquea con el conjunto; un rechazo de la base tapa la falta de ensayo ───────────────────────────
  // (S01 de arriba ya mide que con dependencias por cerrar la falta de ensayo del conjunto INCOMPLETO no bloquea: el cerrado está ensayado)
  await p.click('#modulos [data-mod="sociedades"]');
  await p.waitForSelector('#dlg[open]');
  const se = await p.evaluate(() => ({ t: document.getElementById('dlg-titulo').textContent, okOculto: document.getElementById('dlg-ok').classList.contains('hidden'),
    txt: document.getElementById('dlg-cuerpo').textContent }));
  ok('EU4: sin ensayo del conjunto final bloquea, sin botón, y dice qué conjunto ensayar', se.t === 'No se puede aplicar' && se.okOculto &&
    /tiene que ensayar este conjunto/.test(se.txt) && /sociedades/.test(se.txt) && /no hay un ensayo vigente/.test(se.txt), JSON.stringify(se));
  await p.click('#dlg button[value="no"]');
  await p.click('#modulos [data-mod="recibos"]');
  await p.waitForSelector('#dlg[open]');
  const rz = await p.evaluate(() => ({ t: document.getElementById('dlg-titulo').textContent, txt: document.getElementById('dlg-cuerpo').textContent }));
  ok('A14+EU4: con rechazo y sin ensayo a la vez sale SOLO el rechazo (ningún ensayo lo arregla)', rz.t === 'No se puede aplicar' &&
    /otro tipo de ERP/.test(rz.txt) && /Ningún ensayo lo cambia/.test(rz.txt) && !/tiene que ensayar/.test(rz.txt), JSON.stringify(rz));
  await p.click('#dlg button[value="no"]');
  ok('EU4: ni el bloqueo ni el rechazo aplican nada', llamadas.filter(c => c.accion === 'cambia').length === 1);

  // ── Techo del AaaS (16-oct-2026): en la ficha, sin techo avisa de quién lo arregla; solo se manda lo escrito; la base valida ─────────────
  const techoVe = () => p.evaluate(() => ({ estado: (document.querySelector('#ficha [data-techo-estado]') || {}).getAttribute && document.querySelector('#ficha [data-techo-estado]').getAttribute('data-techo-estado'),
    aviso: document.querySelector('#ficha [data-techo-aviso]') && document.querySelector('#ficha [data-techo-aviso]').getAttribute('data-techo-aviso'),
    avisoTxt: (document.querySelector('#ficha [data-techo-aviso]') || {}).textContent || '', abierto: !!document.querySelector('#ficha details[open] [data-techo]'),
    form: !!document.querySelector('#ficha [data-techo="pon"]') }));
  const avisoLeve = () => p.evaluate(() => { const e = document.querySelector('#ficha [data-techo-aviso]'); return e ? e.classList.contains('ax-aten') : null; });
  // con el agente APAGADO, sin techo no es una avería: ámbar, y dice lo que faltará al encenderlo (revisor del Techo, 16-oct)
  const ta = await techoVe();
  ok('techo: agente apagado y sin techo → aviso en ámbar (no rojo) que dice lo que faltará al encenderlo, con el formulario abierto',
    ta.estado === 'sin_techo' && ta.aviso === 'sin_techo' && (await avisoLeve()) === true && /El agente está apagado/.test(ta.avisoTxt) &&
    /Ponlo aquí abajo/.test(ta.avisoTxt) && ta.abierto, JSON.stringify(ta));
  AAAS.encendido = true;
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#ficha [data-techo-estado]', { timeout: 15000 });
  const t0 = await techoVe();
  ok('techo: encendido y sin techo lo dice en rojo, con el aviso de tope 0 que arregla el estudio, y el formulario abierto', t0.estado === 'sin_techo' && t0.aviso === 'sin_techo' &&
    (await avisoLeve()) === false && /no puede gastar nada/.test(t0.avisoTxt) && /Ponlo aquí abajo/.test(t0.avisoTxt) && t0.abierto, JSON.stringify(t0));
  const nTecho = () => llamadas.filter(c => /^techo_aaas_/.test(c.accion)).length;
  let n0 = nTecho();
  await p.click('[data-techo="pon"]');
  await p.waitForTimeout(300);
  ok('techo: todo en blanco no llama al servidor', nTecho() === n0 && await p.evaluate(() => !document.getElementById('dlg').open));
  await p.fill('#techo-mensual', '1.000');
  await p.click('[data-techo="pon"]');
  await p.waitForTimeout(300);
  { const e1 = await p.evaluate(() => { const e = document.querySelector('#ficha [data-techo-error]'); return { txt: e && !e.hidden ? e.textContent : '', inv: document.getElementById('techo-mensual').getAttribute('aria-invalid') }; });
    ok('techo: «1.000» no se manda; el error se queda junto al formulario y marca el campo', nTecho() === n0 && /1500, no 1\.500/.test(e1.txt) && e1.inv === 'true', JSON.stringify(e1)); }
  await p.fill('#techo-mensual', '19,99');
  await p.selectOption('#techo-nivel', '2');
  await p.click('[data-techo="pon"]');
  await p.waitForSelector('#dlg[open]');
  const td = await p.evaluate(() => ({ t: document.getElementById('dlg-titulo').textContent, ok: document.getElementById('dlg-ok').textContent,
    filas: [...document.querySelectorAll('#dlg [data-techo-cambio]')].map(e => e.getAttribute('data-techo-cambio') + ':' + e.textContent), cero: !!document.querySelector('#dlg [data-techo-aviso="cero"]') }));
  ok('techo: antes de confirmar relee el techo de la base (techo_aaas_estado de esa instancia)', llamadas.slice(-1)[0].accion === 'techo_aaas_estado' && llamadas.slice(-1)[0].instancia === 'sample-rentals');
  ok('techo: el diálogo enseña solo lo escrito, antes → después, en euros', td.t === 'Techo del AaaS' && td.ok === 'Poner techo' && td.filas.length === 2 &&
    /tope_mensual_cent:Tope mensualsin poner → 19,99 €/.test(td.filas[0]) && /equipo_nivel_max:Nivel máximo del equipo0 → 2/.test(td.filas[1]) && !td.cero, JSON.stringify(td));
  { const ct = await contraste(); ok('contraste del diálogo del techo', ct.length === 0, ct.join(' | ')); }
  if (SHOT) await p.screenshot({ path: SHOT + '_techo_dlg_1440.png' });
  await p.click('#dlg button[value="no"]');
  await p.waitForTimeout(200);
  ok('techo: Cancelar no pone nada', !llamadas.some(c => c.accion === 'techo_aaas_pon'));
  await p.click('[data-techo="pon"]');
  await p.waitForSelector('#dlg[open]');
  await p.click('#dlg-ok');
  await p.waitForTimeout(800);
  const pon = llamadas.filter(c => c.accion === 'techo_aaas_pon');
  ok('techo: manda SOLO lo escrito, en céntimos enteros, por la clave de la instancia', pon.length === 1 && pon[0].instancia === 'sample-rentals' &&
    JSON.stringify(pon[0].techos) === JSON.stringify({ tope_mensual_cent: 1999, equipo_nivel_max: 2 }), JSON.stringify(pon));
  const t1 = await techoVe();
  ok('techo: puesto, el aviso pasa al dueño (su tope en su asistente, no el estudio)', t1.estado === 'puesto' && t1.aviso === 'sin_tope_dueno' &&
    /Lo pone él/.test(t1.avisoTxt) && !t1.abierto, JSON.stringify(t1));
  ok('techo: la ficha enseña lo que guardó la base', /Al mes: 19,99 €Por módulo: 0 €Nivel máximo del equipo: 2/.test(await p.evaluate(() => document.querySelector('#ficha [data-techo-estado]').textContent)));
  ok('techo: el aviso que es del dueño no se pinta como error del estudio', await p.evaluate(() => document.querySelector('#ficha [data-techo-aviso]').classList.contains('ax-aten')));
  await p.click('#ficha details[data-techo-form] summary');
  await p.fill('#techo-modulo', '2000000');
  await p.click('[data-techo="pon"]');
  await p.waitForSelector('#dlg[open]');
  await p.click('#dlg-ok');
  await p.waitForTimeout(800);
  { const e2 = await p.evaluate(() => { const e = document.querySelector('#ficha [data-techo-error]'); return { txt: e && !e.hidden ? e.textContent : '', valor: (document.getElementById('techo-modulo') || {}).value }; });
    ok('techo: lo que rechaza la base sale con su mensaje junto al formulario, sin perder lo escrito ni cambiar nada',
      e2.txt === CORDURA_MSG && e2.valor === '2000000' && AAAS.techos.tope_modulo_cent === 0, JSON.stringify(e2)); }
  await p.fill('#techo-modulo', '');
  await p.fill('#techo-mensual', '0');
  await p.click('[data-techo="pon"]');
  await p.waitForSelector('#dlg[open]');
  ok('techo: poner el mensual a 0 avisa de que el agente no gastará', await p.evaluate(() => !!document.querySelector('#dlg [data-techo-aviso="cero"]')));
  await p.click('#dlg button[value="no"]');
  await p.waitForTimeout(200);

  // ── una base que aún no manda `setup` ─────────────────────────────────────────────────────────────────────────────────────────
  await p.click('#lista-instancias [data-inst="old-base"]');
  await p.waitForTimeout(300);
  const r2 = await p.evaluate(() => ({ resumen: (document.querySelector('[data-setup-resumen]') || {}).getAttribute && document.querySelector('[data-setup-resumen]').getAttribute('data-setup-resumen'),
    etiquetas: document.querySelectorAll('#modulos [data-setup-estado]').length }));
  ok('base vieja: lo dice una vez y las tarjetas no inventan estado', r2.resumen === 'sin_dato' && r2.etiquetas === 0, JSON.stringify(r2));
  { const tv = await techoVe(); ok('base vieja: el techo dice que la base aún no lo tiene, sin formulario', tv.estado === 'sin_dato' && !tv.form && !tv.aviso, JSON.stringify(tv)); }
  await p.click('#modulos [data-mod="facturas"]');
  await p.waitForSelector('#dlg[open]');
  const d2 = await p.evaluate(() => ({ sinDato: !!document.querySelector('#dlg [data-setup="sin_dato"]'), sinDecl: document.querySelectorAll('#dlg [data-setup="sin_declarar"]').length,
    pasos: document.querySelectorAll('#dlg [data-paso]').length, arrastra: !!document.querySelector('#dlg [data-arrastra]') }));
  ok('base vieja: «aún no informa», nunca «sin asistente» ni pasos del registro', d2.sinDato && d2.sinDecl === 0 && d2.pasos === 0, JSON.stringify(d2));
  ok('base vieja: lo que arrastra sigue saliendo (es de la base)', d2.arrastra);
  await p.click('#dlg button[value="no"]');

  // ── S01 a 390 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await p.setViewportSize({ width: 390, height: 844 });
  await p.selectOption('#sel-instancia', 'sample-rentals');
  await p.waitForTimeout(300);
  await p.click('#modulos [data-mod="facturas"]');
  await p.waitForSelector('#dlg[open]');
  const c390 = await anchos();
  ok('S01 a 390: la página no se desborda', c390.sw <= c390.w, JSON.stringify(c390));
  const m390 = await p.evaluate(() => { const r = document.getElementById('dlg').getBoundingClientRect(); return { izq: r.left, der: r.right, w: innerWidth }; });
  ok('390: el diálogo cabe en la pantalla', m390.izq >= 0 && m390.der <= m390.w, JSON.stringify(m390));
  if (SHOT) await p.screenshot({ path: SHOT + '_s01_390.png' });
  await p.click('#dlg button[value="no"]');
  await p.waitForTimeout(200);
  { const c2 = await contraste(); ok('contraste S01 a 390', c2.length === 0, c2.join(' | ')); }
  await p.click('#ficha details[data-techo-form] summary');
  await p.waitForTimeout(200);
  { const a = await anchos(); ok('techo a 390: con el formulario abierto la página no se desborda', a.sw <= a.w && !a.fuera.length, JSON.stringify(a)); }
  { const ct = await contraste(); ok('contraste de la ficha con el techo a 390', ct.length === 0, ct.join(' | ')); }
  if (SHOT) await p.screenshot({ path: SHOT + '_techo_390.png', fullPage: true });
  if (SHOT) await p.screenshot({ path: SHOT + '_s01mods_390.png', fullPage: true });

  // ── S00: mapa de la instalación ───────────────────────────────────────────────────────────────────────────────────────────────
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.goto(ORIGEN + '/panel/#mapa', { waitUntil: 'load' });
  await p.waitForSelector('#mapa table', { timeout: 15000 });
  const s0 = await p.evaluate(() => { const m = document.getElementById('mapa'); return {
    visible: !m.classList.contains('hidden'), modulosOculto: document.getElementById('vista').classList.contains('hidden'), lang: m.getAttribute('lang'),
    tipos: [...m.querySelectorAll('th[data-tipo]')].map(e => e.getAttribute('data-tipo')),
    pasos: [...m.querySelectorAll('tr[data-paso]')].map(e => e.getAttribute('data-paso')),
    sinAsis: [...m.querySelectorAll('tr[data-sin-asistente]')].map(e => e.getAttribute('data-sin-asistente')),
    texto: m.innerText, actual: (document.querySelector('[data-nav][aria-current="page"]') || {}).getAttribute && document.querySelector('[data-nav][aria-current="page"]').getAttribute('data-nav') }; });
  ok('S00: se ve el mapa y no los módulos', s0.visible && s0.modulosOculto);
  ok('S00: la pestaña «Mapa» es la actual', s0.actual === 'mapa', s0.actual);
  ok('S00: una columna por perfil real de erp/perfiles.json', JSON.stringify(s0.tipos) === JSON.stringify(Object.keys(PERF)), JSON.stringify(s0.tipos));
  const decl = Object.entries(REG.setup.modulos).filter(([, v]) => v && typeof v === 'object').flatMap(([k, v]) => v.pasos.map(x => k + '.' + x.clave));
  ok('S00: una fila por paso declarado en el registro (' + decl.length + ')', JSON.stringify(s0.pasos.slice().sort()) === JSON.stringify(decl.slice().sort()), JSON.stringify(s0.pasos));
  const enTipos = new Set(Object.values(PERF).flatMap(t => t.modulos.concat(t.modulos_opcionales)));
  const sinDecl = [...enTipos].filter(k => REG.setup.modulos[k] == null);
  ok('S00: los módulos de algún tipo sin declaración salen como «no assistant yet» (' + sinDecl.length + ')', s0.sinAsis.length === sinDecl.length && sinDecl.every(k => s0.sinAsis.indexOf(k) !== -1), JSON.stringify(s0.sinAsis));
  ok('S00: en inglés', s0.lang === 'en' && /Every step of your install/.test(s0.texto) && !/Facturación|Obligatorio|Sin asistente/.test(s0.texto));
  ok('S00: sin nombres de clientes reales', !/BBM|Bali|Lawang|Dion|Sumba|Komodo|Sandalwood|Palmfield/i.test(s0.texto), (s0.texto.match(/BBM|Bali|Lawang|Dion|Sumba|Komodo|Sandalwood|Palmfield/i) || [])[0]);
  if (SHOT) { await limpiaParaCaptura(); await p.screenshot({ path: SHOT + '_s00_1440.png', fullPage: true }); }
  { const c3 = await contraste(); ok('contraste S00 a 1440', c3.length === 0, c3.join(' | ')); }
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(300);
  const des = await anchos();
  ok('S00 a 390: la página no se desborda (la tabla se desplaza dentro de su caja)', des.sw <= des.w, JSON.stringify(des));
  if (SHOT) { await limpiaParaCaptura(); await p.screenshot({ path: SHOT + '_s00_390.png', fullPage: true }); }
  { const c4 = await contraste(); ok('contraste S00 a 390', c4.length === 0, c4.join(' | ')); }
  // ── «Nuevo ERP» ↔ mapa (13-oct-2026): del mapa al asistente y, guardada la solicitud, del asistente a su mapa con su tipo marcado ──────
  await p.setViewportSize({ width: 1440, height: 1000 });
  ok('mapa → Nuevo ERP: botón del estudio fuera de la lámina', await p.evaluate(() => { const b = document.querySelector('#mapa-acciones [data-accion="abre-asistente"]');
    return !!b && !document.getElementById('mapa-acciones').classList.contains('hidden') && !document.getElementById('mapa').contains(b); }));
  await p.click('#mapa-acciones [data-accion="abre-asistente"]');
  await p.waitForSelector('#asis[open]');
  for (const [c, v] of [['instancia', 'cliente-nuevo'], ['marca', 'Cliente Nuevo'], ['dominio', 'erp.cliente.test'], ['correo_admin', 'admin@cliente.test']]) await p.fill('#asis [data-campo="' + c + '"]', v);
  await p.check('#asis input[name="tipo"][value="inmobiliario"]');
  await p.click('#asis [data-accion="avanza"]');
  await p.click('#asis [data-accion="avanza"]');
  await p.check('#asis input[data-campo="aj:impuestos_aplica"][value="no"]');
  await p.click('#asis [data-accion="avanza"]');
  await p.click('#asis [data-accion="envia"]');
  await p.waitForSelector('#asis [data-mapa-tipo]', { timeout: 8000 });
  ok('Nuevo ERP: el alta manda lo mismo que antes (accion alta con el tipo elegido)', llamadas.some(c => c.accion === 'alta' && c.tipo === 'inmobiliario' && c.instancia === 'cliente-nuevo'));
  await p.click('#asis [data-mapa-tipo]');
  await p.waitForTimeout(300);
  const vm = await p.evaluate(() => ({ asis: document.getElementById('asis').open, mapa: !document.getElementById('mapa').classList.contains('hidden'),
    dest: [...document.querySelectorAll('#mapa th.ty.dest')].map(e => e.getAttribute('data-tipo')) }));
  ok('Nuevo ERP → mapa: cierra el asistente y marca su tipo', !vm.asis && vm.mapa && JSON.stringify(vm.dest) === '["inmobiliario"]', JSON.stringify(vm));
  if (SHOT) await p.screenshot({ path: SHOT + '_nuevo_erp_a_mapa_1440.png' });
  ok('fuentes: ninguna petición de la marca a Google', marcaGoogle.length === 0, marcaGoogle.join(', '));
  // vuelta a módulos sin recargar
  await p.evaluate(() => { location.hash = ''; });
  await p.waitForTimeout(300);
  ok('S00: quitar #mapa vuelve a los módulos', await p.evaluate(() => document.getElementById('mapa').classList.contains('hidden') && !document.getElementById('vista').classList.contains('hidden')));

  ok('ninguna petición a una base real (solo el doble de erp-control)', ajena.length === 0, ajena.join(', '));
  ok('0 errores de consola', errores.length === 0, errores.join(' | '));
  await nav.close();
  console.log('\n' + (total - fallos) + ' de ' + total + ' ok');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('NO SE HA PODIDO MIRAR: ' + (e && e.stack || e)); process.exit(2); });
