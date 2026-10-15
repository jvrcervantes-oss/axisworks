// node comercial/demo-erp/pruebas/asistente_setup.harness.cjs [carpeta_capturas]
// Arnés del asistente de setup por módulo (F3 Entrega 1, bbm-p18-front, 12-oct-2026): asistente_setup.html + setup_modulos.js + setup_pasos.js REALES
// en Chromium, con la base SIMULADA a partir del doble de Backend (pruebas/doble_modulos_setup_estado.json) y CON ESTADO: lo que se guarda cambia lo
// que devuelve modulos_setup_estado. Mide: el recorrido de Facturas (empresa → prefijo con confirmación tecleada → «listo» → siguiente módulo), la
// moneda de «base» delante cuando falta, el primer valor sin motivo y el cambio con motivo, la máquina de duda (respuesta perdida: guardado y no
// guardado, sin reenviar), errores por código, quien no configura, función ausente, 390 px sin scroll horizontal, es/en/id sin español. La base real NO se toca.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const EXE = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const AQUI = path.join(__dirname, '..');
const DOBLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'doble_modulos_setup_estado.json'), 'utf8')).casos;
const HTML = fs.readFileSync(path.join(AQUI, 'asistente_setup.html'), 'utf8').split('<!--AXW_SCRIPT-->');
const NUCLEO = fs.readFileSync(path.join(AQUI, 'setup_modulos.js'), 'utf8');
const PASOS = fs.readFileSync(path.join(AQUI, 'setup_pasos.js'), 'utf8');
// AXW_CSS_DIST=<paquete construido>: mete tw.css y shell.css de la instancia para mirar la piel en las capturas (no cambia lo que se mide)
const CSS_PIEL = process.env.AXW_CSS_DIST ? ['tw.css', 'shell.css'].map(f => fs.readFileSync(path.join(process.env.AXW_CSS_DIST, 'assets', f), 'utf8')).join(' ') : '';
// …y la piel de la instancia tal como la pone instancia.js (--tema-*) más sus letras (fonts.css y sus woff2), para medir contraste sobre lo que
// ve el cliente (bbm-p41, 13-oct). Un paquete sin piel propia (Lawang, demo) no trae el objeto: se queda con los colores de tw.css.
const DIST = process.env.AXW_CSS_DIST || '';
const PIEL_VARS = (() => {
  if (!DIST) return '';
  const m = /\bp=(\{[^}]*\});for\(var k in p\)s\.setProperty\("--tema-"\+k/.exec(fs.readFileSync(path.join(DIST, 'contracts', 'assets', 'instancia.js'), 'utf8'));
  return m ? ':root{' + Object.entries(JSON.parse(m[1])).map(([k, v]) => '--tema-' + k + ':' + v).join(';') + '}' : '';
})();
const FUENTES = DIST && fs.existsSync(path.join(DIST, 'assets', 'fonts', 'fonts.css')) ? fs.readFileSync(path.join(DIST, 'assets', 'fonts', 'fonts.css'), 'utf8') : '';
const SHOT = process.argv[2];
let fallos = 0;
const ok = (n, c, x = '') => { if (!c) { fallos++; console.log('FALLA  ' + n + (x ? ' -> ' + x : '')); } else console.log('ok     ' + n); };

// La base, con estado. caso: punto de partida del doble; o: fallos a inyectar.
function base(caso, o = {}) {
  const d = JSON.parse(JSON.stringify(DOBLE[caso]));
  return { d, o, llamadas: [], valores: o.valores || {}, sociedad: null, perdidas: o.perdidas || 0 };
}
function recalcula(b) {
  const pasos = b.d.pasos;
  const de = m => pasos.filter(p => p.modulo === m && p.obligatorio);
  b.d.modulos.forEach(m => { const pend = de(m.modulo).filter(p => !p.hecho); m.estado = pend.length ? 'sin_configurar' : 'configurado'; m.falta = pend.length ? pend[0].clave : null; });
  pasos.forEach(p => { if (p.hecho) p.falta = null; if (p.clave === 'sociedad' || p.clave === 'prefijo') p.ref = b.sociedad ? b.sociedad.clave : null; });
  const pre = pasos.find(p => p.clave === 'prefijo');
  if (pre && !pre.hecho) pre.falta = b.sociedad ? { codigo: 'sin_prefijo', campos: ['prefijo_serie'] } : { codigo: 'sin_sociedad', campos: [] };
}
function servidor(b, n, a) {
  b.llamadas.push([n, a]);
  const o = b.o, err = (code, hint, message) => ({ data: null, error: { code, hint: hint || null, message: message || 'x' } });
  if (n === 'modulos_setup_estado') {
    if (o.noExiste) return err('PGRST202', null, 'Could not find the function public.modulos_setup_estado');
    recalcula(b);
    if (!b.d.puede_configurar) return { data: Object.assign({}, b.d, { pasos: [] }), error: null };
    return { data: JSON.parse(JSON.stringify(b.d)), error: null };
  }
  if (n === 'ajustes_config_datos') return { data: { valores: Object.assign({}, b.valores), puede_escribir: true }, error: null };
  if (n === 'usuario_guarda_permisos') {   // la RPC REEMPLAZA el array entero (como la de verdad)
    const u = (b.usuarios || []).find(x => x.user_id === a.p_user_id);
    if (!u) return err('P0002', null);
    if (b.permMal === a.p_user_id) return err('42501', null);
    if (b.permRed && b.permRed.veces > 0) { b.permRed.veces--; if (b.permRed.aplica) u.herramientas = a.p_cambios.herramientas.slice(); return { red: true }; }
    u.herramientas = a.p_cambios.herramientas.slice();
    const pu = b.d.pasos.find(x => x.clave === 'usuarios' && x.modulo === 'reservas-producto');
    if (pu) pu.hecho = b.usuarios.some(x => x.activo && x.rol !== 'super_admin' && x.creado_por !== 'estudio:cuenta-pruebas' && x.herramientas.includes('reservas-producto'));
    return { data: null, error: null };
  }
  const guarda = () => {
    if (b.perdidas > 0) { b.perdidas--; return { perdida: true }; }   // la red se pierde DESPUÉS de que la base guardó (o.guardaAntes) o antes
    return null;
  };
  if (n === 'sociedad_guarda') {   // la regla REAL de la base (S1, 20261012130000): razón y domicilio obligatorios y la fila se REESCRIBE entera
    const dd = a.p_datos || {};
    if (!String(dd.razon || '').trim() || !String(dd.domicilio || '').trim()) return err('22023', null);
    const antes = (b.sociedad && b.sociedad.prefijo_serie) || null;
    const cambiaPref = Object.prototype.hasOwnProperty.call(dd, 'prefijo_serie') && (dd.prefijo_serie || null) !== antes;
    if (o.prefijoFijo && cambiaPref) return err('55000', 'prefijo_fijo');
    if (cambiaPref && !a.p_confirmo) return err('22023', 'falta_confirmo');
    const g = guarda();
    if (g && !o.guardaAntes) return { red: true };
    const nueva = Object.assign({ clave: a.p_clave }, dd);
    if (!Object.prototype.hasOwnProperty.call(dd, 'prefijo_serie')) nueva.prefijo_serie = antes;
    b.sociedad = nueva;
    b.d.pasos.find(p => p.clave === 'sociedad').hecho = !!(nueva.razon && nueva.domicilio && nueva.npwp);
    if (nueva.prefijo_serie) b.d.pasos.find(p => p.clave === 'prefijo').hecho = true;
    return g ? { red: true } : { data: { ok: true }, error: null };
  }
  if (n === 'ajustes_config_guardar') {
    const existia = Object.prototype.hasOwnProperty.call(b.valores, a.p_clave);
    if (existia && (!a.p_motivo || (String(a.p_motivo).match(/\p{L}/gu) || []).length < 3)) return err('22023', 'motivo');
    if (a.p_clave === 'moneda' && !a.p_confirmo) return err('22023', 'falta_confirmo');
    b.valores[a.p_clave] = a.p_valor;
    const mapa = { moneda: 'moneda', reservas_sin_impuesto: 'impuesto_pkp', precio_incluye_impuesto: 'precio_con_impuesto' };
    const p = b.d.pasos.find(x => x.clave === mapa[a.p_clave]); if (p) p.hecho = true;
    return { data: { cambiado: true }, error: null };
  }
  return err('42883', null, 'desconocida ' + n);
}
const pagina = (idioma, url) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:sans-serif}main{padding:16px}.hidden{display:none}</style><style>${CSS_PIEL}</style><style>${FUENTES}${PIEL_VARS}</style></head><body class="${CSS_PIEL ? 'lw-listo bg-background' : ''}"><main>${HTML[0]}</main>
<script>
history.replaceState(null, '', '${url}');
window.__sinTrad = []; window.__errores = [];
window.addEventListener('error', function (e) { window.__errores.push(String(e.message)); });
function cadena(t) { var f = {}; var q = { select: function () { return q; }, eq: function (c, v) { f[c] = v; return q; }, maybeSingle: function () { return window.__srv('from:' + t, f); },
  then: function (a, b) { return window.__srv('from:' + t + ':lista', f).then(a, b); } }; return q; }
window.AXW_MAPA_MODULOS = { h: { facturas: 'facturas', recibos: 'recibos', 'reservas-producto': 'reservas-producto' }, o: ['reservas-producto'] };
var sb = { rpc: function (n, a) { return window.__srv(n, a || {}); }, from: cadena };
window.LW_AUTH = Promise.resolve({ sb: sb });
window.lwDatos = function (n, a) { return sb.rpc(n, a); };
window.LW_EN = {}; window.LW_ID = {}; window.__idioma = '${idioma}';
window.lwLocale = function () { return ({ es: 'es-ES', en: 'en-GB', id: 'id-ID' })[window.__idioma]; };   // como i18n_id_nucleo.js
window.lwT = function (s, hu) { s = String(s); var d = window.__idioma === 'en' ? window.LW_EN : window.__idioma === 'id' ? window.LW_ID : null; var v = s;
  if (d) { if (Object.prototype.hasOwnProperty.call(d, s)) v = d[s]; else if (!/^[\\s0-9.:]*$/.test(s)) window.__sinTrad.push(s); }
  if (hu) for (var k in hu) v = v.split('%' + k).join(hu[k]); return v; };
</script>
<script>${NUCLEO}</script><script>${PASOS}</script>${HTML[1]}</body></html>`;

async function abre(nav, b, { idioma = 'es', url = '/ajustes/configurar/?modulo=facturas', ancho = 1440, reloj = null, init = null } = {}) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 900 } });
  const p = await ctx.newPage();
  if (init) await p.addInitScript(init);   // algo de la página real que el arnés no carga (p. ej. lwMarca de i18n.js)
  if (reloj) await p.clock.install({ time: new Date(reloj) });   // la hora del navegador fijada (año fiscal en Nochevieja)
  await p.route('**/*', r => {
    const u = new URL(r.request().url());
    if (DIST && u.pathname.startsWith('/assets/fonts/')) {
      const f = path.join(DIST, u.pathname);
      return fs.existsSync(f) ? r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    }
    return r.fulfill({ status: 200, contentType: 'text/html', body: pagina(idioma, url) });
  });
  await p.exposeFunction('__srv', async (n, a) => {
    if (n.startsWith('from:usuarios')) {   // «Quién lo usa» (S14): la tabla usuarios del doble, con estado
      b.llamadas.push([n, a]);
      if (n.endsWith(':lista')) return { data: JSON.parse(JSON.stringify((b.usuarios || []).filter(u => a.activo === undefined || u.activo === a.activo))), error: null };
      const u = (b.usuarios || []).find(x => x.user_id === a.user_id);
      return { data: u ? JSON.parse(JSON.stringify(u)) : null, error: null };
    }
    if (n.startsWith('from:')) return { data: b.sociedad ? Object.assign({}, b.sociedad) : null, error: null };
    const r = servidor(b, n, a);
    if (r && r.red) throw Object.assign(new Error('Failed to fetch'));
    return r;
  });
  await p.goto('http://local.test' + url);
  await p.waitForTimeout(400);
  return { p, ctx };
}
const txt = async (p, sel) => (await p.$(sel)) ? (await p.$eval(sel, e => e.textContent.trim())) : null;
const clic = async (p, accion) => { await p.click('[data-axw-accion="' + accion + '"]'); await p.waitForTimeout(250); };
const llamadas = (b, n) => b.llamadas.filter(x => x[0] === n);

(async () => {
  const nav = await chromium.launch({ executablePath: EXE });

  // 1. Recorrido de Facturas desde «sin configurar»: empresa → prefijo (confirmación tecleada) → listo → siguiente módulo
  let b = base('sin_configurar');
  let { p, ctx } = await abre(nav, b);
  ok('el paso de la empresa no lleva «Revisar en Ajustes»: el formulario de aquí es el sitio (revisor 12-oct)', !(await p.$('[data-axw-accion="abrir-donde"]')));
  ok('abre en el primer paso no hecho (empresa)', (await p.getAttribute('[data-axw-paso]', 'data-axw-paso')) === 'sociedad');
  ok('«Facturas · Paso 1 de 2» en la cabeza del paso (la moneda de base ya está hecha: no cuenta)', (await txt(p, '[data-axw-as="meta"]')) === 'Facturas · Paso 1 de 2', await txt(p, '[data-axw-as="meta"]'));
  ok('arriba, el total de pasos hechos de todos los módulos (barra del diseño S10-S60)', (await txt(p, '[data-axw-as="progreso"]')) === '2 de 6 pasos hechos', await txt(p, '[data-axw-as="progreso"]'));
  ok('la URL lleva el paso', (await p.evaluate(() => location.search)).includes('paso=sociedad'));
  await clic(p, 'enviar');
  ok('vacío: dice qué falta y no envía', (await txt(p, '[data-axw-as="error"]')).includes('Razón social') && llamadas(b, 'sociedad_guarda').length === 0);
  ok('S20: sin razón social la muestra impresa no se enseña (no inventa datos)', !(await p.isVisible('[data-axw-muestra="impresa"]')));
  await p.fill('[data-axw-campo="razon"]', 'PT Bali Best Motor'); await p.fill('[data-axw-campo="domicilio"]', 'Jl. Raya 1, Denpasar'); await p.fill('[data-axw-campo="npwp"]', '01.234.567.8-901.000');
  ok('S20: la muestra impresa sigue a lo tecleado (razón, iniciales sin «PT», domicilio, etiqueta fiscal + número)',
     (await txt(p, '[data-axw-muestra="razon"]')) === 'PT Bali Best Motor' && (await txt(p, '[data-axw-muestra="iniciales"]')) === 'BB'
     && (await txt(p, '[data-axw-muestra="domicilio"]')) === 'Jl. Raya 1, Denpasar' && (await txt(p, '[data-axw-muestra="npwp"]')) === 'NPWP 01.234.567.8-901.000'
     && (await p.isVisible('[data-axw-muestra="impresa"]')));
  ok('S20: sin prefijo fijado no se inventa un número: dice que sale al fijarlo', (await txt(p, '[data-axw-muestra="numero"]')) === 'El número sale al fijar el prefijo de la numeración.');
  await p.fill('[data-axw-campo="npwp_label"]', 'NIF');
  ok('S20: «15 o 16 cifras» es del NPWP: con otra etiqueta fiscal se esconde', !(await p.isVisible('[data-axw-fila="npwp"] span')));
  await p.fill('[data-axw-campo="npwp_label"]', 'NPWP');
  ok('S20: y vuelve con NPWP', await p.isVisible('[data-axw-fila="npwp"] span'));
  ok('S20: ayudas del diseño y «¿Más de una empresa?»', (await txt(p, '[data-axw-fila="razon"]')).includes('Tal como está registrada.') && (await txt(p, '[data-axw-fila="npwp"]')).includes('15 o 16 cifras.')
     && !!(await p.$('[data-axw-nota="otra_empresa"]')));
  await clic(p, 'enviar'); await p.waitForTimeout(300);
  const sg = llamadas(b, 'sociedad_guarda')[0];
  ok('alta de empresa: sociedad_guarda con p_nueva y una clave válida', sg && sg[1].p_nueva === true && /^[a-z][a-z0-9_]{2,}$/.test(sg[1].p_clave), JSON.stringify(sg && sg[1]));
  ok('pasa al prefijo, «Paso 2 de 2»', (await p.getAttribute('[data-axw-paso]', 'data-axw-paso')) === 'prefijo' && (await txt(p, '[data-axw-as="meta"]')) === 'Facturas · Paso 2 de 2');
  await p.fill('[data-axw-campo="prefijo_serie"]', 'bbm');
  const ANIO = new Date().getUTCFullYear();   // sin zona_horaria la base numera en UTC
  ok('el prefijo se escribe en mayúsculas y enseña la primera factura con el formato de la base', (await p.inputValue('[data-axw-campo="prefijo_serie"]')) === 'BBM'
     && (await txt(p, '[data-axw-ejemplo-num="1"]')) === 'BBM-F' + ANIO + '-00001', await txt(p, '[data-axw-ejemplo="prefijo"]'));
  ok('S21: la segunda y el contador que vuelve a empezar el año que viene', (await txt(p, '[data-axw-ejemplo="prefijo"]')).includes('BBM-F' + ANIO + '-00002')
     && (await txt(p, '[data-axw-ejemplo-anio="1"]')).includes('BBM-F' + (ANIO + 1) + '-00001'));
  await p.fill('[data-axw-campo="prefijo_serie"]', 'b');
  ok('S21: con un prefijo que la base no aceptaría no se enseña número', !(await p.$('[data-axw-ejemplo-num]')));
  await p.fill('[data-axw-campo="prefijo_serie"]', 'bbm');
  await clic(p, 'enviar');
  ok('irreversible: pantalla de confirmación con la primera factura en grande', (await txt(p, '[data-axw-confirma="valor"]')) === 'BBM-F' + ANIO + '-00001', await txt(p, '[data-axw-confirma="valor"]'));
  ok('«Fijar» desactivado hasta teclear el prefijo', await p.$eval('[data-axw-accion="fijar"]', e => e.disabled));
  await p.fill('[data-axw-campo="teclea"]', 'BBX');
  ok('lo tecleado distinto no deja fijar', await p.$eval('[data-axw-accion="fijar"]', e => e.disabled));
  await p.fill('[data-axw-campo="teclea"]', 'bbm');
  ok('el botón nombra el efecto', (await txt(p, '[data-axw-accion="fijar"]')) === 'Fijar el prefijo: BBM');
  await clic(p, 'fijar'); await p.waitForTimeout(300);
  const pf = llamadas(b, 'sociedad_guarda')[1];
  ok('fijar manda p_confirmo y solo el prefijo, sobre la empresa dada de alta', pf && pf[1].p_confirmo === true && pf[1].p_datos.prefijo_serie === 'BBM' && pf[1].p_clave === sg[1].p_clave, JSON.stringify(pf && pf[1]));
  ok('«Facturas está listo» solo porque la base lo dice', (await txt(p, '[data-axw-estado="listo"]')) === 'Facturas está listo.');
  ok('ofrece el siguiente módulo por configurar', (await txt(p, '[data-axw-accion="siguiente-modulo"]')) === 'Configurar Reservas de producto');
  ok('sin errores de página', (await p.evaluate(() => window.__errores)).length === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
  if (SHOT) await p.screenshot({ path: path.join(SHOT, 'listo_1440.png'), fullPage: true });
  await ctx.close();

  // P5 (Experiencia, 15-oct: «la moneda no enseña cuál se eligió»): el paso hecho e irreversible dice el valor fijado
  b = base('sin_configurar'); b.d.moneda = 'IDR';
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=base&paso=moneda' }));
  ok('P5 moneda hecha: «Ahora: IDR» junto a «Hecho», sin campo para cambiarla', (await txt(p, '[data-axw-actual="moneda"]')) === 'Ahora: IDR' && !!(await p.$('[data-axw-hecho]')) && !(await p.$('[data-axw-campo="moneda"]')), await txt(p, '[data-axw-as="tarjeta"]'));
  await ctx.close();

  // 2. La moneda de «base» va delante si falta, sin valor elegido; reservas: el primer sí/no se guarda sin motivo
  b = base('sin_configurar'); b.d.pasos.find(x => x.clave === 'moneda').hecho = false;
  ({ p, ctx } = await abre(nav, b, { url: '/ajustes/configurar/?modulo=reservas-producto' }));
  ok('moneda de base delante: «Reservas de producto · Paso 1 de 4»', (await p.getAttribute('[data-axw-paso]', 'data-axw-paso')) === 'moneda' && (await txt(p, '[data-axw-as="meta"]')) === 'Reservas de producto · Paso 1 de 4', await txt(p, '[data-axw-as="meta"]'));
  ok('la moneda empieza sin valor elegido', (await p.inputValue('[data-axw-campo="moneda"]')) === '');
  await p.selectOption('[data-axw-campo="moneda"]', 'IDR'); await clic(p, 'enviar');
  await p.fill('[data-axw-campo="teclea"]', 'IDR'); await clic(p, 'fijar'); await p.waitForTimeout(300);
  const mo = llamadas(b, 'ajustes_config_guardar')[0];
  ok('moneda: ajustes_config_guardar con p_confirmo y sin motivo (primer valor)', mo && mo[1].p_clave === 'moneda' && mo[1].p_valor === 'IDR' && mo[1].p_confirmo === true && !('p_motivo' in mo[1]), JSON.stringify(mo && mo[1]));
  ok('después, el sí/no del impuesto', (await p.getAttribute('[data-axw-paso]', 'data-axw-paso')) === 'impuesto_pkp');
  await p.check('[data-axw-campo="reservas_sin_impuesto"] input[value="no"]'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  const pk = llamadas(b, 'ajustes_config_guardar')[1];
  ok('«Sí, es PKP» guarda reservas_sin_impuesto = no, sin motivo ni p_confirmo', pk && pk[1].p_clave === 'reservas_sin_impuesto' && pk[1].p_valor === 'no' && !pk[1].p_confirmo && !pk[1].p_motivo, JSON.stringify(pk && pk[1]));
  await clic(p, 'atras');
  ok('Atrás vuelve al paso hecho y enseña «Hecho» y «Cambiar»', (await p.$('[data-axw-hecho]')) && (await p.$('[data-axw-accion="cambiar"]')));
  await clic(p, 'cambiar'); await p.check('[data-axw-campo="reservas_sin_impuesto"] input[value="si"]'); await clic(p, 'enviar');
  ok('cambiar un valor guardado pide motivo antes de enviar', (await txt(p, '[data-axw-as="error"]')).includes('motivo') && llamadas(b, 'ajustes_config_guardar').length === 2);
  await p.fill('[data-axw-campo="motivo"]', 'Lo confirmó el gestor'); await clic(p, 'enviar'); await p.waitForTimeout(300);
  ok('con motivo, se guarda el cambio', (llamadas(b, 'ajustes_config_guardar')[2] || [])[1] && llamadas(b, 'ajustes_config_guardar')[2][1].p_motivo === 'Lo confirmó el gestor');
  await ctx.close();

  // 2a. Repaso 12-oct (MEDIA): «no» ya guardado pero el paso SIN hecho (falta el impuesto por defecto). Cambiarlo pide motivo en la base:
  // el campo tiene que estar, o era un callejón sin salida («escribe el motivo» sin dónde escribirlo)
  {
    const bm = base('sin_configurar', { valores: { reservas_sin_impuesto: 'no' } });
    bm.d.pasos.find(x => x.clave === 'impuesto_pkp').hecho = false;
    let pm, cm;
    ({ p: pm, ctx: cm } = await abre(nav, bm, { url: '/ajustes/configurar/?modulo=reservas-producto' }));
    await pm.waitForSelector('[data-axw-paso="impuesto_pkp"]', { timeout: 8000 }).catch(() => {});
    ok('valor guardado y paso sin hecho: sale el campo del motivo', !!(await pm.$('[data-axw-campo="motivo"]')));
    await pm.check('[data-axw-campo="reservas_sin_impuesto"] input[value="si"]');
    await pm.fill('[data-axw-campo="motivo"]', 'Ya no es PKP'); await clic(pm, 'enviar'); await pm.waitForTimeout(300);
    const g = llamadas(bm, 'ajustes_config_guardar')[0];
    ok('y con el motivo se guarda el cambio', g && g[1].p_valor === 'si' && g[1].p_motivo === 'Ya no es PKP', JSON.stringify(g && g[1]));
    await cm.close();
    // y al revés: sin valor guardado, ni el campo (primer valor)
    const bn = base('sin_configurar'); bn.d.pasos.find(x => x.clave === 'impuesto_pkp').hecho = false;
    ({ p: pm, ctx: cm } = await abre(nav, bn, { url: '/ajustes/configurar/?modulo=reservas-producto' }));
    await pm.waitForSelector('[data-axw-paso="impuesto_pkp"]', { timeout: 8000 }).catch(() => {});
    ok('sin valor guardado: no sale el motivo', !(await pm.$('[data-axw-campo="motivo"]')));
    await cm.close();
  }

  // 2b. Una falta que el paso no resuelve (la empresa no tiene impuesto) lleva a su pestaña de Ajustes; una que sí, no
  {
    const bb = base('sin_configurar');
    const ip = bb.d.pasos.find(x => x.clave === 'impuesto_pkp');
    if (ip) {
      ip.falta = { codigo: 'sin_impuesto', campos: [] };
      const r = await abre(nav, bb, { url: '/ajustes/configurar/?modulo=' + encodeURIComponent(ip.modulo) + '&paso=impuesto_pkp' });
      const href = await r.p.getAttribute('[data-axw-accion="abrir-donde"]', 'href').catch(() => null);
      ok('sin_impuesto: «Revisar en Ajustes» lleva a la pestaña de los impuestos', href === '/ajustes/#reservas', String(href));
      await r.ctx.close();
    } else ok('el doble trae el paso impuesto_pkp', false);
  }

  // 3. Máquina de duda: la red se pierde tras guardar → se relee y sigue; la red se pierde sin guardar → «no se guardó», sin reenviar
  for (const guardaAntes of [true, false]) {
    b = base('a_medias', { perdidas: 1, guardaAntes });
    b.sociedad = { clave: 'pt_bbm', razon: 'PT BBM', domicilio: 'Jl. Raya 1, Denpasar', npwp: '01.234.567.8-901.000', logo: '/x/logo.png', nib: '123' }; b.d.pasos.find(x => x.clave === 'sociedad').hecho = true;
    ({ p, ctx } = await abre(nav, b));
    await p.fill('[data-axw-campo="prefijo_serie"]', 'BBM'); await clic(p, 'enviar');
    await p.fill('[data-axw-campo="teclea"]', 'BBM'); await clic(p, 'fijar'); await p.waitForTimeout(500);
    const envios = llamadas(b, 'sociedad_guarda').length;
    if (guardaAntes) ok('duda, sí se guardó: se relee y da «listo», un solo envío', (await txt(p, '[data-axw-estado="listo"]')) === 'Facturas está listo.' && envios === 1, 'envíos ' + envios);
    if (guardaAntes) ok('fijar el prefijo reenvía la fila entera: la empresa conserva logo, NIB y domicilio (revisor 12-oct)',
      b.sociedad.logo === '/x/logo.png' && b.sociedad.nib === '123' && b.sociedad.domicilio === 'Jl. Raya 1, Denpasar' && b.sociedad.prefijo_serie === 'BBM', JSON.stringify(b.sociedad));
    else ok('duda, no se guardó: lo dice, un solo envío, nada en vuelo', (await txt(p, '[data-axw-as="error"]')) === 'El ERP dice que no se guardó. Puedes volver a intentarlo.' && envios === 1, (await txt(p, '[data-axw-as="error"]')) + ' / envíos ' + envios);
    await ctx.close();
  }

  // 4. Error con código: se lee por hint
  b = base('a_medias', { prefijoFijo: true }); b.sociedad = { clave: 'pt_bbm', razon: 'PT BBM', domicilio: 'Jl. Raya 1, Denpasar', npwp: '01.234.567.8-901.000', logo: '/x/logo.png', nib: '123' };
  ({ p, ctx } = await abre(nav, b));
  await p.fill('[data-axw-campo="prefijo_serie"]', 'BBM'); await clic(p, 'enviar'); await p.fill('[data-axw-campo="teclea"]', 'BBM'); await clic(p, 'fijar'); await p.waitForTimeout(300);
  ok('55000 prefijo_fijo: el texto del código, sigue en la confirmación', ((await txt(p, '[data-axw-as="error"]')) || '').includes('ya no se puede cambiar') && (await p.$('[data-axw-confirma="valor"]')));
  await ctx.close();

  // 5. Quien no configura; 6. función que aún no existe
  ({ p, ctx } = await abre(nav, base('no_configura')));
  ok('quien no configura: «solo el administrador principal», sin pasos', ((await txt(p, '[data-axw-as="tarjeta"]')) || '').includes('Solo el administrador principal') && !(await p.$('[data-axw-paso]')));
  await ctx.close();
  ({ p, ctx } = await abre(nav, base('sin_configurar', { noExiste: true })));
  ok('función ausente: «no se ha podido mirar» con Reintentar, nunca «todo listo»', ((await txt(p, '[data-axw-as="tarjeta"]')) || '').includes('todavía no está disponible') && (await p.$('[data-axw-accion="releer"]')) && !(await p.$('[data-axw-estado="todo-listo"]')));
  await ctx.close();
  ({ p, ctx } = await abre(nav, base('configurado'), { url: '/ajustes/configurar/' }));
  ok('sin módulo y todo configurado: lo dice y lleva al inicio', !!(await p.$('[data-axw-estado="todo-listo"]')));
  await ctx.close();

  // 7. 390 px y los tres idiomas: sin scroll horizontal, sin español en en/id
  for (const idioma of ['es', 'en', 'id']) for (const ancho of [390, 1440]) {
    b = base('sin_configurar');
    ({ p, ctx } = await abre(nav, b, { idioma, ancho }));
    // la muestra impresa (S20) solo sale con razón social: se rellena para medirla también, con nombres largos
    await p.fill('[data-axw-campo="razon"]', 'PT Bali Best Motorcycle Rental Indonesia Sejahtera'); await p.fill('[data-axw-campo="domicilio"]', 'Jl. Raya Uluwatu No. 128, Jimbaran, Kuta Selatan, Badung, Bali 80361');
    await p.fill('[data-axw-campo="npwp"]', '01.234.567.8-901.000');
    const anchoDoc = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(idioma + ' ' + ancho + ': sin scroll horizontal', anchoDoc <= ancho, String(anchoDoc));
    if (idioma !== 'es') {
      const sin = await p.evaluate(() => window.__sinTrad.filter(s => !/^(NPWP|IDR|EUR|USD)$/.test(s)));
      ok(idioma + ' ' + ancho + ': ninguna frase sin traducir', sin.length === 0, sin.slice(0, 4).join(' | '));
    }
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'paso_' + idioma + '_' + ancho + '.png'), fullPage: true });
    await ctx.close();
    // S21: el prefijo más largo que admite la base, con su primera factura en grande
    const bp = base('sin_configurar'); bp.sociedad = { clave: 'bbm', razon: 'PT Bali Best', domicilio: 'Jl. Raya 1', npwp: '01', prefijo_serie: null };
    const pp = bp.d.pasos.find(x => x.clave === 'sociedad'); if (pp) pp.hecho = true;
    const pf = bp.d.pasos.find(x => x.clave === 'prefijo'); if (pf) pf.ref = 'bbm';
    ({ p, ctx } = await abre(nav, bp, { idioma, ancho, url: '/ajustes/configurar/?modulo=facturas&paso=prefijo' }));
    if (await p.$('[data-axw-campo="prefijo_serie"]')) { await p.fill('[data-axw-campo="prefijo_serie"]', 'BALIBEST'); await p.waitForTimeout(150); }
    ok('S21 ' + idioma + ' ' + ancho + ': primera factura en grande, sin scroll horizontal ni español',
       !!(await p.$('[data-axw-ejemplo-num="1"]')) && (await p.evaluate(() => document.documentElement.scrollWidth)) <= ancho
       && (idioma === 'es' || (await p.evaluate(() => window.__sinTrad.filter(s => !/^(NPWP|IDR|EUR|USD)$/.test(s)))).length === 0));
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'prefijo_' + idioma + '_' + ancho + '.png'), fullPage: true });
    await ctx.close();
    // S22: dentro o fuera, en dos tarjetas, con el ejemplo en la moneda de la instancia (sin inventar el tipo)
    const bi2 = base('sin_configurar');
    ({ p, ctx } = await abre(nav, bi2, { idioma, ancho, url: '/ajustes/configurar/?modulo=reservas-producto&paso=precio_con_impuesto' }));
    await p.waitForTimeout(300);
    const tarj = await p.$$eval('[data-axw-campo="precio_incluye_impuesto"] .axw-op', ls => ls.map(l => l.getBoundingClientRect().height));
    const ejem = await p.$$eval('[data-axw-ejemplo-opcion]', ls => ls.map(l => l.textContent));
    ok('S22 ' + idioma + ' ' + ancho + ': dos tarjetas de ≥ 44 px con su ejemplo, sin scroll horizontal ni español',
       tarj.length === 2 && tarj.every(h => h >= 44) && ejem.length === 2 && ejem.every(t => (idioma === 'en' ? /1,000,000/ : /1\.000\.000/).test(t))
       && (await p.evaluate(() => document.documentElement.scrollWidth)) <= ancho
       && (idioma === 'es' || (await p.evaluate(() => window.__sinTrad.filter(s => !/^(NPWP|IDR|EUR|USD)$/.test(s)))).length === 0), JSON.stringify(ejem));
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'impuestos_' + idioma + '_' + ancho + '.png'), fullPage: true });
    await ctx.close();
  }

  // 8. Inicio del asistente sin módulo (diseño del owner S03, 12-oct): lista de módulos encendidos con su estado, «Sigue donde lo dejaste»,
  //    los pendientes con su enlace de siempre (data-axw-modulo); 390/1440 sin scroll horizontal y sin español en en/id
  for (const idioma of ['es', 'en', 'id']) for (const ancho of [390, 1440]) {
    b = base('sin_configurar');
    ({ p, ctx } = await abre(nav, b, { idioma, ancho, url: '/ajustes/configurar/' }));
    const pend = b.d.modulos.filter(m => m.estado === 'sin_configurar' && b.d.pasos.some(x => x.modulo === m.modulo && x.obligatorio)).length;
    ok(idioma + ' ' + ancho + ' inicio: un enlace por módulo pendiente y «Sigue donde lo dejaste»', (await p.$$('[data-axw-modulo]')).length === pend && !!(await p.$('[data-axw-accion="seguir"]')),
       (await p.$$('[data-axw-modulo]')).length + ' de ' + pend);
    // diseño S03 (13-oct): «Paso n de N en <módulo>.» en la tarjeta de seguir, y la nota de solo-administrador ANTES de la lista
    const sigueTxt = (await txt(p, '[data-axw-sigue-paso]')) || '';
    const notaAntes = await p.evaluate(() => { const n = document.querySelector('[data-axw-solo-tu]'), l = document.querySelector('ul[role="list"]');
      return !!(n && l && (n.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING)); });
    ok(idioma + ' ' + ancho + ' inicio: «Paso n de N en módulo» y la nota antes de la lista', /\d+\D+\d+/.test(sigueTxt) && notaAntes, sigueTxt + ' · nota antes: ' + notaAntes);
    if (idioma === 'es' && ancho === 1440) {
      const mod = new URLSearchParams((await p.getAttribute('[data-axw-accion="seguir"]', 'href')) || '').get('modulo');
      // el mismo recuento que la pantalla (lista()): delante, los obligatorios pendientes de «base»; después, los del módulo (revisor 64a7013)
      const L = (mod === 'base' ? [] : b.d.pasos.filter(x => x.modulo === 'base' && x.obligatorio && !x.hecho)).concat(b.d.pasos.filter(x => x.modulo === mod && x.obligatorio)),
            n = L.findIndex(x => !x.hecho) + 1;
      ok('S03: el número del paso es el del primer obligatorio pendiente de ese módulo', n > 0 && sigueTxt.startsWith('Paso ' + n + ' de ' + L.length + ' en '), mod + ': ' + sigueTxt);
    }
    const anchoDoc = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(idioma + ' ' + ancho + ' inicio: sin scroll horizontal', anchoDoc <= ancho, String(anchoDoc));
    if (idioma !== 'es') {
      const sin = await p.evaluate(() => window.__sinTrad.filter(s => !/^(NPWP|IDR|EUR|USD)$/.test(s)));
      ok(idioma + ' ' + ancho + ' inicio: ninguna frase sin traducir', sin.length === 0, sin.slice(0, 4).join(' | '));
    }
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'inicio_' + idioma + '_' + ancho + '.png'), fullPage: true });
    await ctx.close();
  }
  // S03 (13-oct): el título lleva el nombre del negocio (Ajustes › marca) en los tres idiomas; sin él, «tu ERP»
  for (const [idioma, esperado] of [['es', 'Configura Bali Best,'], ['en', 'Set up Bali Best,'], ['id', 'Atur Bali Best,']]) {
    ({ p, ctx } = await abre(nav, base('sin_configurar', { valores: { marca: 'Bali Best' } }), { idioma, url: '/ajustes/configurar/' }));
    const tit = (await txt(p, '[data-axw-titulo-marca="1"]')) || '';
    ok('S03 ' + idioma + ': el título lleva el nombre del negocio', tit.trim() === esperado, tit);
    await ctx.close();
  }
  // nombre hostil: se ve tal cual, sin crear elementos ni rellenar sus %
  ({ p, ctx } = await abre(nav, base('sin_configurar', { valores: { marca: '<img src=x onerror=window.__pwn=1> %t' } }), { url: '/ajustes/configurar/' }));
  ok('S03: un nombre con HTML y % sale como texto', ((await txt(p, '[data-axw-titulo-marca="1"]')) || '').trim() === 'Configura <img src=x onerror=window.__pwn=1> %t,'
     && !(await p.$('[data-axw-titulo-marca] img')) && !(await p.evaluate(() => window.__pwn)), await txt(p, '[data-axw-titulo-marca]'));
  await ctx.close();
  // sin marca guardada: el nombre de la ficha que enseña el menú (lwMarca), no «tu ERP»
  ({ p, ctx } = await abre(nav, base('sin_configurar'), { url: '/ajustes/configurar/', init: () => { window.lwMarca = (s) => String(s).split('%marca').join('Bali Best Motorcycle'); } }));
  ok('S03: sin marca guardada, el nombre de la ficha', ((await txt(p, '[data-axw-titulo-marca="1"]')) || '').trim() === 'Configura Bali Best Motorcycle,', await txt(p, '[data-axw-titulo-marca]'));
  await ctx.close();
  ({ p, ctx } = await abre(nav, base('sin_configurar', { valores: { marca: '   ' } }), { url: '/ajustes/configurar/' }));
  ok('S03: con la marca vacía, «Configura tu ERP,»', ((await txt(p, '[data-axw-titulo-marca="0"]')) || '').trim() === 'Configura tu ERP,', await txt(p, '[data-axw-titulo-marca]'));
  await ctx.close();

  // 9. Diseño del owner S10-S60 / S91 (bbm-p41, 13-oct): carril «Tu configuración» desde 1024 px, cabeza «Módulo · Paso n de N», las dos líneas
  //    «Para qué sirve / Si lo saltas», «Saltar este paso» en un opcional (no guarda nada) y, con la piel real (AXW_CSS_DIST), contraste medido.
  {
    b = base('sin_configurar');
    ({ p, ctx } = await abre(nav, b));
    const carril = await p.$eval('[data-axw-as="carril"]', e => ({ visible: getComputedStyle(e).display !== 'none', mods: [...e.querySelectorAll('[data-axw-carril-modulo]')].map(a => a.getAttribute('data-axw-carril-modulo')),
      abierto: (e.querySelector('[data-abierto="1"]') || {}).textContent || '', actual: (e.querySelector('[aria-current="step"]') || {}).getAttribute ? e.querySelector('[aria-current="step"]').getAttribute('data-axw-carril-paso') : null,
      href: (e.querySelector('[data-axw-carril-paso="prefijo"]') || {}).getAttribute ? e.querySelector('[data-axw-carril-paso="prefijo"]').getAttribute('href') : null }));
    const conPasos = b.d.modulos.filter(m => b.d.pasos.some(x => x.modulo === m.modulo)).map(m => m.modulo);
    ok('1440: el carril se ve, con un enlace por módulo con pasos', carril.visible && JSON.stringify(carril.mods) === JSON.stringify(conPasos), JSON.stringify(carril));
    ok('carril: Facturas abierto con su n/m y el paso actual marcado (aria-current)', /Facturas\s*0\/2/.test(carril.abierto) && carril.actual === 'sociedad', JSON.stringify(carril));
    ok('carril: cada paso enlaza con la URL de siempre', carril.href === '?modulo=facturas&paso=prefijo', String(carril.href));
    ok('«Si lo saltas» de un obligatorio: el módulo no queda listo', ((await txt(p, '[data-axw-salta="obligatorio"] dd')) || '').startsWith('Facturas no queda listo'), await txt(p, '[data-axw-salta="obligatorio"] dd'));
    ok('un obligatorio no ofrece «Saltar este paso»', !(await p.$('[data-axw-accion="saltar"]')));
    ok('«Dejar para luego» arriba, a la vuelta de siempre', (await p.getAttribute('[data-axw-as="salir"]', 'href')) === '/home/' && (await p.$eval('[data-axw-as="salir"]', e => getComputedStyle(e).display !== 'none')));
    await ctx.close();
    ({ p, ctx } = await abre(nav, base('sin_configurar'), { ancho: 390 }));
    ok('390: sin carril (las mesas móviles no lo llevan)', await p.$eval('[data-axw-as="carril"]', e => getComputedStyle(e).display === 'none'));
    await ctx.close();
    // un opcional: su consecuencia y «Saltar este paso», que vuelve al cierre del módulo sin llamar a nada que guarde
    const bo = base('sin_configurar');
    const opc = bo.d.pasos.find(x => !x.obligatorio && !x.hecho);
    if (opc) {
      ({ p, ctx } = await abre(nav, bo, { url: '/ajustes/configurar/?modulo=' + encodeURIComponent(opc.modulo) + '&paso=' + encodeURIComponent(opc.clave) }));
      await p.waitForSelector('[data-axw-paso="' + opc.clave + '"]', { timeout: 8000 }).catch(() => {});
      ok('opcional: etiqueta «Opcional» y su consecuencia en «Si lo saltas»', !!(await p.$('[data-tag="opcional"]')) && !!(await txt(p, '[data-axw-salta="opcional"] dd')), opc.clave);
      const antes = bo.llamadas.filter(x => x[0] !== 'modulos_setup_estado' && x[0] !== 'ajustes_config_datos').length;
      await clic(p, 'saltar'); await p.waitForTimeout(300);
      ok('«Saltar este paso» no guarda nada y sale del paso', bo.llamadas.filter(x => x[0] !== 'modulos_setup_estado' && x[0] !== 'ajustes_config_datos').length === antes && !(await p.$('[data-axw-paso="' + opc.clave + '"]')));
      await ctx.close();
    } else ok('el doble trae un paso opcional sin hacer', false);
    // Contraste sobre lo pintado con la piel de la instancia: texto ≥ 4,5:1 (≥ 3:1 si es grande), en paso e inicio, 1440 y 390, es/en/id
    if (DIST) for (const idioma of ['es', 'en', 'id']) for (const ancho of [390, 1440]) for (const url of ['/ajustes/configurar/?modulo=facturas', '/ajustes/configurar/']) {
      ({ p, ctx } = await abre(nav, base('sin_configurar'), { idioma, ancho, url }));
      await p.evaluate(() => document.fonts && document.fonts.ready);
      const malos = await p.evaluate(() => {
        const rgb = s => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
        const mezcla = (c, f) => ({ r: c.r * c.a + f.r * (1 - c.a), g: c.g * c.a + f.g * (1 - c.a), b: c.b * c.a + f.b * (1 - c.a), a: 1 });
        const fondo = e => { const capas = []; for (let n = e; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { capas.push(c); if (c.a >= 1) break; } }
          let f = { r: 255, g: 255, b: 255, a: 1 }; for (let i = capas.length - 1; i >= 0; i--) f = mezcla(capas[i], f); return f; };
        const lum = c => { const l = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * l(c.r) + 0.7152 * l(c.g) + 0.0722 * l(c.b); };
        const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
        const out = [];
        document.querySelectorAll('[data-axw-setup="asistente"] *').forEach(e => {
          if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
          const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.closest('.sr-only') || !e.getClientRects().length) return;
          const f = fondo(e), c = mezcla(rgb(cs.color), f), r = ratio(c, f), px = parseFloat(cs.fontSize), grande = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
          if (r < (grande ? 3 : 4.5)) out.push(e.textContent.trim().slice(0, 30) + ' ' + r.toFixed(2));
        });
        return out;
      });
      ok('piel real ' + idioma + ' ' + ancho + ' ' + (url.includes('modulo') ? 'paso' : 'inicio') + ': texto con contraste suficiente', malos.length === 0, malos.slice(0, 4).join(' | '));
      await ctx.close();
    }
  }

  // 10. «Quién lo usa» en el propio paso (S14, bbm-p41): el equipo con UNA casilla (la herramienta de este módulo), sin la cuenta de pruebas,
  //     el administrador principal sin casilla; al guardar se relee y se manda el array ENTERO de esa persona con solo esta herramienta cambiada.
  {
    const pasoU = { modulo: 'reservas-producto', clave: 'usuarios', obligatorio: true, irreversible: false, hecho: false, donde: '/usuarios/', falta: { codigo: 'sin_usuarios', campos: [] } };
    const equipo = () => [
      { user_id: 'u-dion', nombre: 'Dion', email: 'dion@x.test', rol: 'super_admin', activo: true, herramientas: [], creado_por: null },
      { user_id: 'u-kadek', nombre: 'Kadek', email: 'kadek@x.test', rol: 'agente', activo: true, herramientas: ['facturas', 'recibos'], creado_por: 'dion' },
      { user_id: 'u-putu', nombre: 'Putu', email: 'putu@x.test', rol: 'agente', activo: true, herramientas: ['reservas-producto', 'taller'], creado_por: 'dion' },
      { user_id: 'u-prueba', nombre: 'Cuenta de pruebas', email: 'p@x.test', rol: 'admin', activo: true, herramientas: [], creado_por: 'estudio:cuenta-pruebas' },
      { user_id: 'u-baja', nombre: 'Baja', email: 'b@x.test', rol: 'agente', activo: false, herramientas: [], creado_por: 'dion' }];
    const bq = base('sin_configurar');
    bq.d.pasos.push(Object.assign({}, pasoU)); bq.usuarios = equipo();
    ({ p, ctx } = await abre(nav, bq, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=usuarios' }));
    await p.waitForSelector('[data-axw-quien-usuario]', { timeout: 8000 }).catch(() => {});
    const filas = await p.$$eval('[data-axw-quien="lista"] li', ls => ls.map(l => l.textContent));
    ok('S14: el equipo activo, sin la cuenta de pruebas ni las bajas', filas.length === 3 && !filas.some(t => /pruebas|Baja/.test(t)), JSON.stringify(filas));
    ok('S14: una sola casilla por persona y ninguna para el administrador principal', (await p.$$('[data-axw-quien-usuario]')).length === 2 && !(await p.$('[data-axw-quien-usuario="u-dion"]')));
    ok('S14: la casilla dice qué hace («Kadek usa Reservas de producto») y refleja la herramienta', (await p.getAttribute('[data-axw-quien-usuario="u-kadek"]', 'aria-label')) === 'Kadek usa Reservas de producto'
       && !(await p.$eval('[data-axw-quien-usuario="u-kadek"]', e => e.checked)) && (await p.$eval('[data-axw-quien-usuario="u-putu"]', e => e.checked)));
    ok('S14: recuento con la regla de la base (módulo operativo: el administrador principal no cuenta)', (await txt(p, '[data-axw-quien="cuenta"]')) === '1 persona usa Reservas de producto', await txt(p, '[data-axw-quien="cuenta"]'));
    ok('S14: «Invitar a alguien» lleva al alta de Usuarios', (await p.getAttribute('[data-axw-quien="invitar"]', 'href')) === '/usuarios/');
    await p.click('[data-axw-quien-usuario="u-kadek"]', { force: true });
    ok('S14: el recuento sigue a la casilla', (await txt(p, '[data-axw-quien="cuenta"]')) === '2 personas usan Reservas de producto');
    bq.usuarios.find(u => u.user_id === 'u-kadek').herramientas.push('otra-de-otra-sesion');   // otra sesión le da algo a Kadek mientras tanto
    await clic(p, 'enviar'); await p.waitForTimeout(400);
    const g = llamadas(bq, 'usuario_guarda_permisos');
    ok('S14: una sola llamada, a la persona cambiada, con su array ENTERO releído más esta herramienta (conserva lo de la otra sesión)',
       g.length === 1 && g[0][1].p_user_id === 'u-kadek' && JSON.stringify(Object.keys(g[0][1].p_cambios)) === '["herramientas"]'
       && JSON.stringify(g[0][1].p_cambios.herramientas.slice().sort()) === JSON.stringify(['facturas', 'otra-de-otra-sesion', 'recibos', 'reservas-producto'].sort()), JSON.stringify(g));
    ok('S14: tras guardar, el «hecho» lo dice la base (el paso sale del recorrido)', !(await p.$('[data-axw-paso="usuarios"]')));
    ok('S14: sin errores de página', (await p.evaluate(() => window.__errores)).length === 0, JSON.stringify(await p.evaluate(() => window.__errores)));
    await ctx.close();
    // quitar: el array de esa persona sin esta herramienta y con todo lo demás
    const bx = base('sin_configurar'); bx.d.pasos.push(Object.assign({}, pasoU));
    bx.usuarios = [{ user_id: 'u-putu', nombre: 'Putu', email: 'putu@x.test', rol: 'agente', activo: true, herramientas: ['reservas-producto', 'taller'], creado_por: 'dion' }];
    ({ p, ctx } = await abre(nav, bx, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=usuarios' }));
    await p.waitForSelector('[data-axw-quien-usuario]', { timeout: 8000 }).catch(() => {});
    await p.click('[data-axw-quien-usuario="u-putu"]', { force: true }); await clic(p, 'enviar'); await p.waitForTimeout(400);
    const q = llamadas(bx, 'usuario_guarda_permisos');
    ok('S14: quitar manda el resto de herramientas intacto', q.length === 1 && JSON.stringify(q[0][1].p_cambios.herramientas) === '["taller"]', JSON.stringify(q));
    await ctx.close();
    // sin nadie más que el administrador principal: el aviso para invitar
    const bv = base('sin_configurar'); bv.d.pasos.push(Object.assign({}, pasoU)); bv.usuarios = [equipo()[0]];
    ({ p, ctx } = await abre(nav, bv, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=usuarios' }));
    await p.waitForSelector('[data-axw-quien="solo-tu"]', { timeout: 8000 }).catch(() => {});
    ok('S14: solo el administrador principal: invita a alguien', !!(await p.$('[data-axw-quien="solo-tu"]')));
    await clic(p, 'enviar'); await p.waitForTimeout(300);
    ok('S14: guardar sin cambios no llama a nada que escriba y dice qué hacer', llamadas(bv, 'usuario_guarda_permisos').length === 0
       && ((await txt(p, '[data-axw-as="error"]')) || '').includes('Enciende a alguien para que use Reservas de producto'), await txt(p, '[data-axw-as="error"]'));
    await ctx.close();
    // revisor 13-oct: en un módulo administrativo (Facturas) el administrador principal sí cuenta
    const bf = base('sin_configurar'); bf.d.pasos.push(Object.assign({}, pasoU, { modulo: 'facturas', obligatorio: false })); bf.usuarios = equipo();
    ({ p, ctx } = await abre(nav, bf, { url: '/ajustes/configurar/?modulo=facturas&paso=usuarios' }));
    await p.waitForSelector('[data-axw-quien-usuario]', { timeout: 8000 }).catch(() => {});
    ok('S14: en Facturas (administrativo) el administrador principal cuenta', (await txt(p, '[data-axw-quien="cuenta"]')) === '2 personas usan Facturas', await txt(p, '[data-axw-quien="cuenta"]'));
    await ctx.close();
    // revisor 13-oct: sin herramienta para el módulo en el mapa, el paso es «otra pantalla» de verdad (y guardar no se cuelga)
    const bt = base('sin_configurar'); bt.d.modulos.push({ modulo: 'taller', estado: 'sin_configurar', falta: 'usuarios' }); bt.d.pasos.push(Object.assign({}, pasoU, { modulo: 'taller' })); bt.usuarios = equipo();
    ({ p, ctx } = await abre(nav, bt, { url: '/ajustes/configurar/?modulo=taller&paso=usuarios' }));
    await p.waitForTimeout(500);
    ok('S14: módulo sin herramienta en el mapa: «Ya lo hice, comprobar», sin interruptores', !!(await p.$('[data-axw-accion="comprobar"]')) && !(await p.$('[data-axw-quien-usuario]')));
    await ctx.close();
    // revisor 13-oct: la red se cae al escribir. Si la base NO lo aplicó: «no se guardó» y el paso sigue; si SÍ: sigue sin duda
    for (const aplica of [false, true]) {
      const bd = base('sin_configurar'); bd.d.pasos.push(Object.assign({}, pasoU, { hecho: true, falta: null })); bd.usuarios = equipo(); bd.permRed = { veces: 1, aplica };
      ({ p, ctx } = await abre(nav, bd, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=usuarios' }));
      await p.waitForSelector('[data-axw-quien-usuario="u-putu"]', { timeout: 8000 }).catch(() => {});
      if (await p.$('[data-axw-accion="cambiar"]')) await clic(p, 'cambiar');
      await p.waitForSelector('[data-axw-quien-usuario="u-putu"]', { timeout: 8000 }).catch(() => {});
      await p.click('[data-axw-quien-usuario="u-putu"]', { force: true });   // quitarle la herramienta a Putu (el paso ya estaba hecho por él)
      await clic(p, 'enviar'); await p.waitForTimeout(700);
      const putu = bd.usuarios.find(u => u.user_id === 'u-putu');
      const err = (await txt(p, '[data-axw-as="error"]')) || '';
      if (!aplica) ok('S14 red caída sin aplicar: «El ERP dice que no se guardó» (nunca «guardado» porque el paso ya esté hecho)', putu.herramientas.includes('reservas-producto')
                      && err === 'El ERP dice que no se guardó. Puedes volver a intentarlo.', err);
      else ok('S14 red caída pero aplicado: lo da por guardado al releer la fila', !putu.herramientas.includes('reservas-producto') && !/no se guard/i.test(err), err);
      await ctx.close();
    }
    // revisor 13-oct: a medias (Kadek se guarda, Putu no): lo dice y los interruptores enseñan lo que quedó en la base
    {
      const bm = base('sin_configurar'); bm.d.pasos.push(Object.assign({}, pasoU)); bm.usuarios = equipo(); bm.permMal = 'u-putu';
      ({ p, ctx } = await abre(nav, bm, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=usuarios' }));
      await p.waitForSelector('[data-axw-quien-usuario="u-putu"]', { timeout: 8000 }).catch(() => {});
      await p.click('[data-axw-quien-usuario="u-kadek"]', { force: true }); await p.click('[data-axw-quien-usuario="u-putu"]', { force: true });
      await clic(p, 'enviar'); await p.waitForTimeout(900);
      await p.waitForSelector('[data-axw-quien-usuario="u-putu"]', { timeout: 8000 }).catch(() => {});
      const err = (await txt(p, '[data-axw-as="error"]')) || '';
      ok('S14 a medias: dice que no se guardó y la lista enseña lo que quedó (Kadek encendido, Putu como estaba)',
         /no se guard/i.test(err) && (await p.$eval('[data-axw-quien-usuario="u-kadek"]', e => e.checked)) && (await p.$eval('[data-axw-quien-usuario="u-putu"]', e => e.checked))
         && bm.usuarios.find(u => u.user_id === 'u-kadek').herramientas.includes('reservas-producto'), err);
      await ctx.close();
    }
    for (const idioma of ['es', 'en', 'id']) for (const ancho of [390, 1440]) {
      // coherente con «nadie lo tiene» (falta sin_usuarios): Putu aún sin esta herramienta, para que la captura no se contradiga
      const bi = base('sin_configurar'); bi.d.pasos.push(Object.assign({}, pasoU)); bi.usuarios = equipo().map(u => u.user_id === 'u-putu' ? Object.assign(u, { herramientas: ['taller'] }) : u);
      ({ p, ctx } = await abre(nav, bi, { idioma, ancho, url: '/ajustes/configurar/?modulo=reservas-producto&paso=usuarios' }));
      await p.waitForSelector('[data-axw-quien-usuario]', { timeout: 8000 }).catch(() => {});
      const sin = await p.evaluate(() => window.__sinTrad.filter(s => !/^(NPWP|IDR|EUR|USD)$/.test(s)));
      ok('S14 ' + idioma + ' ' + ancho + ': sin español y sin scroll horizontal', sin.length === 0 && (await p.evaluate(() => document.documentElement.scrollWidth)) <= ancho, sin.slice(0, 4).join(' | '));
      if (SHOT) await p.screenshot({ path: path.join(SHOT, 'quien_' + idioma + '_' + ancho + '.png'), fullPage: true });
      await ctx.close();
    }
  }

  // Revisor 13-oct, S22: el año de la primera factura es el de la base. Con la zona de la instancia (Bali, UTC+8) el 31-dic a las
  // 20:00 UTC ya es 2027; sin zona, la base usa UTC (2026). Y la tarifa del ejemplo tiene sentido en la moneda (100 EUR, no 1.000.000).
  for (const [zona, esperado] of [['Asia/Makassar', 'BBM-F2027-00001'], ['America/Los_Angeles', 'BBM-F2026-00001'], ['', 'BBM-F2026-00001']]) {   // Los Ángeles: distinto del reloj de esta máquina (UTC+8)
    const bz = base('sin_configurar', { valores: zona ? { zona_horaria: zona } : {} });
    bz.sociedad = { clave: 'bbm', razon: 'PT Bali Best', domicilio: 'Jl. Raya 1', npwp: '01', prefijo_serie: null };
    ({ p, ctx } = await abre(nav, bz, { url: '/ajustes/configurar/?modulo=facturas&paso=prefijo', reloj: '2026-12-31T20:00:00Z' }));
    await p.waitForSelector('[data-axw-campo="prefijo_serie"]', { timeout: 8000 }).catch(() => {});
    await p.fill('[data-axw-campo="prefijo_serie"]', 'BBM'); await p.waitForTimeout(150);
    ok('S21: año de la primera factura como la base (' + (zona || 'sin zona: UTC') + ')', (await txt(p, '[data-axw-ejemplo-num="1"]')) === esperado, await txt(p, '[data-axw-ejemplo-num="1"]'));
    await ctx.close();
  }
  {
    const be = base('sin_configurar'); be.d.moneda = 'EUR';
    ({ p, ctx } = await abre(nav, be, { url: '/ajustes/configurar/?modulo=reservas-producto&paso=precio_con_impuesto' }));
    await p.waitForTimeout(300);
    const ej = await p.$$eval('[data-axw-ejemplo-opcion]', ls => ls.map(l => l.textContent));
    ok('S22: en EUR la tarifa del ejemplo es 100 EUR', ej.length === 2 && ej.every(t => t.includes('100 EUR') && !t.includes('000')), JSON.stringify(ej));
    await ctx.close();
  }
  await nav.close();
  console.log(fallos ? 'FALLAN ' + fallos : 'TODO BIEN — asistente_setup.harness.cjs');
  process.exit(fallos ? 1 : 0);
})();
