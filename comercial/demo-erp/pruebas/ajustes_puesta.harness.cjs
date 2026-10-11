// node comercial/demo-erp/pruebas/ajustes_puesta.harness.cjs [captura_prefijo]
// Harness de Ajustes › Puesta en marcha (11-oct-2026): ajustes_puesta.js REAL en Chromium, dentro de un panel como el que pone build.py, con la base SIMULADA
// (puesta_en_marcha_estado, ajustes_config_datos y ajustes_config_guardar tal como los acordó Backend). Mide: pinta los pasos como los da la base (hecho/pendiente, detalle,
// dónde), una clave ausente sale «Sin decidir», guardar manda SOLO la clave y 'si'|'no' y vuelve a leer, sin permiso no ofrece guardar, los errores se dicen, XSS en el
// detalle, ES/EN/ID sin huecos y 390 px sin scroll horizontal. La base real NO se toca.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const JS = fs.readFileSync(path.join(__dirname, '..', 'ajustes_puesta.js'), 'utf8');
const SHOT = process.argv[2];
let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' -> ' + extra : '')); } else console.log('ok     ' + nombre); };
const XSS = `<img src=x onerror="window.__xss=1"> NPWP 'x' "y"`;

function nuevaBase(o = {}) {
  return { llamadas: [], o, valores: o.valores || { reservas_sin_impuesto: 'no' }, puede: o.puede !== false };
}
const err = (code, message) => ({ data: null, error: { code, message, hint: null } });
async function servidor(b, n, a) {
  b.llamadas.push([n, JSON.parse(JSON.stringify(a))]);
  const o = b.o;
  if (o.noDisponible && n === 'puesta_en_marcha_estado') return err('PGRST202', 'Could not find the function public.puesta_en_marcha_estado');
  if (o.sinPermiso && n === 'puesta_en_marcha_estado') return err('42501', 'sin acceso');
  if (n === 'puesta_en_marcha_estado') {
    const precio = Object.prototype.hasOwnProperty.call(b.valores, 'precio_incluye_impuesto');
    const pkp = Object.prototype.hasOwnProperty.call(b.valores, 'reservas_sin_impuesto');
    const pasos = [
      { clave: 'sociedad', hecho: !!o.todoHecho, detalle: 'Falta la sociedad emisora: ' + XSS, donde: '/sociedades/' },
      { clave: 'pkp', hecho: pkp, detalle: pkp ? 'Decidido' : 'Sin decidir', donde: '/ajustes/' },
      { clave: 'impuesto', hecho: true, detalle: 'PPN 12 % sobre 11/12', donde: '/sociedades/' },
      { clave: 'precio_incluye_impuesto', hecho: precio, detalle: precio ? 'Decidido' : 'Sin decidir', donde: '/ajustes/' },
      { clave: 'facturacion', hecho: !!o.todoHecho, detalle: 'Serie sin configurar', donde: 'estudio (registro de la instancia)' },
      { clave: 'modulo_sociedades', hecho: !!o.todoHecho, detalle: 'Apagado', donde: 'panel de control del estudio' },
      { clave: 'modulo_facturas', hecho: !!o.todoHecho, detalle: 'Apagado', donde: 'panel de control del estudio' },
      { clave: 'modulo_operaciones', hecho: !!o.todoHecho, detalle: 'Apagado', donde: 'panel de control del estudio' },
      { clave: 'modulo_recibos', hecho: !!o.todoHecho, detalle: 'Apagado', donde: 'panel de control del estudio' },
      { clave: 'cotizacion', hecho: !!o.todoHecho, detalle: 'La cotización falla', donde: '/flota/', hint: o.todoHecho ? undefined : 'reparto_con_impuesto_dentro' }];
    return { data: { pasos, listo: !!o.todoHecho && precio && pkp }, error: null };
  }
  if (n === 'ajustes_config_datos') return { data: { valores: JSON.parse(JSON.stringify(b.valores)), actualizado: {}, puede_escribir: b.puede }, error: null };
  if (n === 'ajustes_config_guardar') {
    if (o.guardarFalla) return err('42501', 'solo super admin');
    if (!a.p_motivo || (String(a.p_motivo).match(/\p{L}/gu) || []).length < 3) return { data: null, error: { code: '22023', message: 'motivo', hint: 'motivo' } };
    const cambiado = b.valores[a.p_clave] !== a.p_valor;
    b.valores[a.p_clave] = a.p_valor;
    return { data: { cambiado }, error: null };
  }
  return err('42883', 'desconocida ' + n);
}
const pagina = idioma => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
<section data-lw-panel="puesta"><div id="lw-aj-puesta"><p>…</p></div></section>
<script>
window.__xss = undefined; window.__sinTrad = []; window.__errores = []; window.__from = 0;
var sb = { rpc: function (n, a) { return { then: function (f, g) { return window.__srv(n, a || {}).then(f, g); } }; }, from: function () { window.__from++; throw new Error('no'); } };
window.LW_AUTH = Promise.resolve({ sb: sb });
window.lwDatos = function (n, a) { return Promise.resolve(sb.rpc(n, a)).then(function (r) { return { data: r.data, error: r.error }; }); };
window.LW_IDIOMA = '${idioma}'; window.LW_EN = {}; if ('${idioma}' === 'id') window.LW_ID = {};
window.lwT = function (s, hu) { s = String(s); var d = window.LW_IDIOMA === 'en' ? window.LW_EN : window.LW_IDIOMA === 'id' ? window.LW_ID : null; var v = s;
  if (d) { if (Object.prototype.hasOwnProperty.call(d, s)) v = d[s]; else if (!/^[\\s0-9.:]*$/.test(s)) window.__sinTrad.push(s); }
  if (hu) for (var k in hu) v = v.split('%' + k).join(hu[k]); return v; };
window.lwIdiomaAplicar = function () {};
window.onerror = function (m) { window.__errores.push(String(m)); };
</script>
<script>${JS}</script></body></html>`;

(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const espera = (p, fn) => p.waitForFunction(fn, null, { timeout: 5000 });
  async function abre(opts = {}) {
    const base = nuevaBase(opts.base || {});
    const ctx = await nav.newContext({ viewport: { width: opts.ancho || 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.exposeFunction('__srv', (n, a) => servidor(base, n, a));
    await p.setContent(pagina(opts.idioma || 'es'), { waitUntil: 'load' });
    await espera(p, () => !!document.querySelector('[data-pm="pasos"], #lw-aj-puesta [role="alert"]'));
    return { base, p, ctx };
  }
  try {
    let { base, p, ctx } = await abre();
    const pasos = await p.$$eval('[data-pm-paso]', l => l.map(e => [e.getAttribute('data-pm-paso'), e.querySelector('[data-pm-hecho]').getAttribute('data-pm-hecho')]));
    ok('pinta los diez pasos en el orden de la base, con su hecho', JSON.stringify(pasos) === JSON.stringify([['sociedad', '0'], ['pkp', '1'], ['impuesto', '1'], ['precio_incluye_impuesto', '0'], ['facturacion', '0'], ['modulo_sociedades', '0'], ['modulo_facturas', '0'], ['modulo_operaciones', '0'], ['modulo_recibos', '0'], ['cotizacion', '0']]), JSON.stringify(pasos));
    ok('el resumen cuenta lo que falta según la base', (await p.$eval('[data-pm="resumen"]', e => e.textContent)) === 'Faltan 8 pasos.');
    ok('el código conocido de la base se dice con palabras en el paso que falla', (await p.$eval('[data-pm-hint="cotizacion"]', e => e.textContent)).includes('repartir el precio por día') && !(await p.$('[data-pm-hint="sociedad"]')));
    ok('dónde: una ruta es enlace, un texto no', (await p.$eval('[data-pm-paso="sociedad"] a', e => e.getAttribute('href'))) === '/sociedades/' && !(await p.$('[data-pm-paso="modulo_facturas"] a')));
    ok('el detalle de la base se pinta como texto (XSS)', (await p.$$('#lw-aj-puesta img')).length === 0 && (await p.evaluate(() => window.__xss)) === undefined
       && (await p.$eval('[data-pm-paso="sociedad"]', e => e.textContent)).includes('<img'));
    ok('precio sin fila en la base = «Sin decidir» (no «no»)', (await p.$eval('[data-pm-valor="precio_incluye_impuesto"]', e => e.value)) === '' && (await p.$eval('[data-pm-valor="precio_incluye_impuesto"] option', e => e.textContent)) === 'Sin decidir');
    ok('¿es PKP? va con el paso pkp y enseña lo guardado (no = sí es PKP)', !!(await p.$('[data-pm-paso="pkp"] [data-pm-valor="reservas_sin_impuesto"]')) && (await p.$eval('[data-pm-valor="reservas_sin_impuesto"]', e => e.value)) === 'no'
       && (await p.$eval('[data-pm-valor="reservas_sin_impuesto"] option[value="no"]', e => e.textContent)).startsWith('Sí'));
    await p.click('[data-pm-clave="precio_incluye_impuesto"]');
    await espera(p, () => document.querySelector('[data-pm-estado="precio_incluye_impuesto"]').textContent.length > 0);
    ok('guardar sin elegir no llama a la base y lo dice', !base.llamadas.some(x => x[0] === 'ajustes_config_guardar') && (await p.$eval('[data-pm-estado="precio_incluye_impuesto"]', e => e.textContent)).includes('Elige'));
    await p.selectOption('[data-pm-valor="precio_incluye_impuesto"]', 'si');
    await p.click('[data-pm-clave="precio_incluye_impuesto"]');
    await espera(p, () => /motivo/.test(document.querySelector('[data-pm-estado="precio_incluye_impuesto"]').textContent));
    ok('sin motivo (≥ 3 letras) no llama a la base y lo pide', !base.llamadas.some(x => x[0] === 'ajustes_config_guardar'));
    await p.fill('[data-pm="motivo"]', 'Datos del gestor');
    const antes = base.llamadas.length;
    await p.click('[data-pm-clave="precio_incluye_impuesto"]');
    await espera(p, () => (document.querySelector('[data-pm-estado="precio_incluye_impuesto"]') || {}).textContent === 'Guardado.');
    const g = base.llamadas.filter(x => x[0] === 'ajustes_config_guardar');
    ok('guardar manda SOLO la clave, si|no y el motivo tecleado', g.length === 1 && JSON.stringify(Object.keys(g[0][1]).sort()) === '["p_clave","p_motivo","p_valor"]' && g[0][1].p_clave === 'precio_incluye_impuesto' && g[0][1].p_valor === 'si' && g[0][1].p_motivo === 'Datos del gestor');
    ok('tras guardar bien, el motivo se vacía (el siguiente cambio necesita el suyo)', (await p.$eval('[data-pm="motivo"]', e => e.value)) === '');
    ok('tras guardar vuelve a leer y el hecho lo pone la base', base.llamadas.slice(antes).some(x => x[0] === 'puesta_en_marcha_estado') && (await p.$eval('[data-pm-paso="precio_incluye_impuesto"] [data-pm-hecho]', e => e.getAttribute('data-pm-hecho'))) === '1');
    ok('sin tablas, sin errores de script', (await p.evaluate(() => window.__from + window.__errores.length)) === 0);
    await ctx.close();

    ({ p, ctx } = await abre({ base: { puede: false } }));
    ok('sin permiso de escritura: controles deshabilitados y sin botón Guardar', (await p.$$('[data-accion="pm-guardar"]')).length === 0 && (await p.$eval('[data-pm-valor="precio_incluye_impuesto"]', e => e.disabled)));
    await ctx.close();
    ({ p, ctx } = await abre({ base: { guardarFalla: true, valores: { precio_incluye_impuesto: 'no' } } }));
    await p.fill('[data-pm="motivo"]', 'Prueba');
    await p.click('[data-pm-clave="precio_incluye_impuesto"]');
    await espera(p, () => /No se guardó/.test(document.querySelector('[data-pm-estado="precio_incluye_impuesto"]').textContent));
    ok('si la base rechaza, se dice y no se da por guardado', (await p.$eval('[data-pm-estado="precio_incluye_impuesto"]', e => e.textContent)).includes('super admin'));
    await ctx.close();
    ({ p, ctx } = await abre({ base: { todoHecho: true, valores: { precio_incluye_impuesto: 'no', reservas_sin_impuesto: 'no' } } }));
    ok('con «listo» de la base: «Listo: todo en marcha…»', (await p.$eval('[data-pm="resumen"]', e => e.textContent)) === 'Listo: todo en marcha, el ERP ya factura.');
    await ctx.close();
    for (const [k, frase] of [['noDisponible', 'todavía no está disponible'], ['sinPermiso', 'de administración']]) {
      ({ p, ctx } = await abre({ base: { [k]: true } }));
      const t = await p.$eval('#lw-aj-puesta', e => e.textContent);
      ok('lectura ' + k + ': «' + frase + '» y Reintentar', t.includes(frase) && !!(await p.$('[data-accion="pm-reintentar"]')), t);
      await ctx.close();
    }
    for (const idioma of ['en', 'id']) {
      ({ p, ctx } = await abre({ idioma }));
      const sin = await p.evaluate(() => Array.from(new Set(window.__sinTrad)));
      ok(idioma + ': todo lo que pinta tiene traducción', sin.length === 0, sin.join(' | '));
      await ctx.close();
    }
    ({ p, ctx } = await abre({ ancho: 390, idioma: 'id' }));
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok('390 px: sin scroll horizontal', m.sw <= m.cw, JSON.stringify(m));
    if (SHOT) await p.screenshot({ path: SHOT + '_390_id.png', fullPage: true });
    await ctx.close();
  } finally {
    await nav.close();
  }
  console.log(fallos ? fallos + ' FALLO(S)' : 'TODO BIEN');
  process.exit(fallos ? 1 : 0);
})();
