// node comercial/demo-erp/pruebas/extras.harness.cjs [captura_prefijo]
// Harness de «Extras y servicios» (erp-front, 14-oct-2026): el extras.html REAL (marcado + script, con las ayudas comunes pegadas como hace build.py) en Chromium,
// con la base SIMULADA en memoria. Mide el COMPORTAMIENTO: (1) solo enseña lo que NO es de alquiler (las motos viven en Flota), (2) un alta nace con clase 'servicio'
// y nunca 'alquiler', (3) editar manda solo lo que cambió y nunca la clase, (4) el precio no se adivina (ambiguo/decimales de la moneda), (5) «no se ha podido mirar»
// ≠ «no hay extras», (6) 42501 y sin_herramienta se dicen DESPUÉS de la respuesta, (7) XSS, (8) es/en/id con todo traducido, (9) 390 y 1440 px sin desborde.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const COMUN_JS = fs.readFileSync(path.join(__dirname, '..', '_compartido', 'pantalla_comun.js'), 'utf8').trim();
const COMUN_CSS = fs.readFileSync(path.join(__dirname, '..', '_compartido', 'pantalla_comun.css'), 'utf8').trim();
const FUENTE = fs.readFileSync(path.join(__dirname, '..', 'extras.html'), 'utf8');
const [MARCADO0, SCRIPT0] = FUENTE.split('<!--AXW_SCRIPT-->');
const MARCADO = MARCADO0.split('/*AXW_COMUN_CSS*/').join(COMUN_CSS);
const SCRIPT = SCRIPT0.split('/*AXW_COMUN_JS*/').join(COMUN_JS);
const SHOT = process.argv[2];
let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' -> ' + extra : '')); } else console.log('ok     ' + nombre); };
const J = x => JSON.stringify(x);
const XSS = `Casco <img src=x onerror="window.__xss=1"> 'q"`;
const err = (code, message, hint) => ({ data: null, error: { code, message, hint: hint || null } });

function nuevaBase(o = {}) {
  const prods = o.vacio ? [] : [
    { id: 'm1', numero_producto: 'P-1', nombre: 'Honda Beat', referencia: null, unidad: 'día', precio: 0, moneda: 'IDR', descripcion: null, impuesto_id: null, activo: true, clase: 'alquiler' },
    { id: 's1', numero_producto: 'P-2', nombre: o.xss ? XSS : 'Entrega y recogida a domicilio', referencia: 'DEL', unidad: 'viaje', precio: 50000, moneda: 'IDR', descripcion: null, impuesto_id: 'i1', activo: false, clase: 'servicio' },
    { id: 's2', numero_producto: 'P-3', nombre: 'Casco extra', referencia: null, unidad: 'ud', precio: 25000, moneda: 'IDR', descripcion: null, impuesto_id: null, activo: true, clase: 'servicio' }];
  if (o.mil) for (let k = 0; k < (o.mil === 'justo' ? 998 : 1001); k++) prods.push({ id: 'x' + k, numero_producto: 'P-X' + k, nombre: 'Extra ' + k, referencia: null, unidad: 'ud', precio: 1000, moneda: 'IDR', descripcion: null, impuesto_id: null, activo: true, clase: 'servicio' });
  if (o.largo) prods.push({ id: 's3', numero_producto: 'P-4', nombre: 'W'.repeat(120), referencia: 'R'.repeat(60), unidad: 'ud', precio: 123456789, moneda: 'IDR', descripcion: null, impuesto_id: 'i2', activo: true, clase: 'servicio' });
  return { o, llamadas: [], n: 10, prods, imps: [{ id: 'i1', numero_impuesto: 'IMP-1', nombre: 'PPN 11 %', pais: 'ID', clase: 'suma', porcentaje: 11, activo: true },
    { id: 'i2', numero_impuesto: 'IMP-2', nombre: 'Viejo', pais: 'ID', clase: 'suma', porcentaje: 10, activo: false }] };
}
function servidor(s, tipo, nombre, a) {
  s.llamadas.push([tipo, nombre, JSON.parse(JSON.stringify(a || {}))]);
  const o = s.o;
  if (tipo === 'from') {
    if (nombre === 'productos') {
      if (o.sinPermiso) return err('42501', 'permission denied for table productos');
      if (o.sinRed) return { data: null, error: { message: 'Failed to fetch' } };
      // como PostgREST: neq deja fuera también el null; limit corta después del filtro
      let d = JSON.parse(JSON.stringify(s.prods));
      for (const c of (a && a.cad) || []) {
        if (c[0] === 'neq') d = d.filter(x => x[c[1]] != null && x[c[1]] !== c[2]);
        if (c[0] === 'limit') d = d.slice(0, c[1]);
      }
      return { data: d, error: null };
    }
    if (nombre === 'impuestos') return o.sinImpuestos ? err('42501', 'permission denied for table impuestos') : { data: JSON.parse(JSON.stringify(s.imps)), error: null };
    return err('42P01', 'tabla desconocida');
  }
  if (nombre !== 'producto_guarda') return err('42883', 'funcion desconocida ' + nombre);
  if (o.noAdmin) return err('42501', 'El catálogo de productos lo cambia un admin');
  if (o.sinFlota) return err('42501', 'Esto exige la herramienta «flota»: la asigna el administrador principal en Usuarios.', 'sin_herramienta');
  const extra = Object.keys(a.p_datos).filter(k => !['nombre', 'referencia', 'unidad', 'precio', 'moneda', 'descripcion', 'impuesto_id', 'activo', 'clase'].includes(k));
  if (extra.length) return err('22023', 'Campo no admitido: ' + extra.join(', '), 'campo_no_admitido');
  if (a.p_id == null) { const id = 'n' + (s.n++); s.prods.push(Object.assign({ id, numero_producto: 'P-' + s.n, referencia: null, descripcion: null, impuesto_id: null, clase: 'servicio' }, a.p_datos)); return { data: id, error: null }; }
  const p = s.prods.find(x => x.id === a.p_id); if (!p) return err('P0002', 'Ese producto ya no existe');
  Object.assign(p, a.p_datos); return { data: p.id, error: null };
}
const pagina = (idioma) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title></head><body>
${MARCADO}
<script>
window.__xss = undefined; window.__errores = []; window.__sinT = [];
window.fetch = function () { return Promise.reject(new Error('fetch')); };
function q(tabla) { var cad = []; var o = { then: function (f, g) { return window.__srv('from', tabla, { cad: cad }).then(f, g); } }; ['select', 'order', 'limit', 'eq', 'neq'].forEach(function (m) { o[m] = function () { cad.push([m].concat([].slice.call(arguments))); return o; }; }); return o; }
var sb = { rpc: function (n, a) { return { then: function (f, g) { return window.__srv('rpc', n, a || {}).then(f, g); } }; }, from: q };
window.LW_AUTH = Promise.resolve({ sb: sb, ficha: { rol: 'admin' } });
window.lwMonedaBase = function () { return 'IDR'; };
window.LW_IDIOMA = '${idioma}'; window.LW_EN = {}; window.LW_ID = {};
window.lwLocale = function () { return window.LW_IDIOMA === 'en' ? 'en-GB' : (window.LW_IDIOMA === 'id' ? 'id-ID' : 'es-ES'); };
window.lwT = function (s) { s = String(s); var d = window.LW_IDIOMA === 'en' ? window.LW_EN : (window.LW_IDIOMA === 'id' ? window.LW_ID : null); if (!d) return s; if (Object.prototype.hasOwnProperty.call(d, s)) return d[s]; if (!/^[\\s\u2014\u00b70-9.,%():\u2265\u2264·+-]*$/.test(s)) window.__sinT.push(s); return s; };
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
    await p.exposeFunction('__srv', (t, n, a) => servidor(base, t, n, a));
    await p.setContent(pagina(opts.idioma || 'es'), { waitUntil: 'load' });
    await p.waitForFunction(() => document.querySelector('[data-ex="estado"]').getAttribute('data-tipo') !== 'cargando', null, { timeout: 5000 });
    return { base, p, ctx };
  }
  const txt = (p, sel) => p.$eval(sel, e => e.textContent);
  const tipo = p => p.$eval('[data-ex="estado"]', e => e.getAttribute('data-tipo'));
  const guardas = b => b.llamadas.filter(x => x[1] === 'producto_guarda');
  const campo = n => '[data-campo="' + n + '"]';
  const dlgError = p => txt(p, '[data-axw="dialogo"] .axw-error');
  const confirmar = p => p.click('[data-accion="ex-modal-confirmar"]');
  const cerrado = p => p.waitForFunction(() => !document.querySelector('[data-axw="dialogo"]'), null, { timeout: 5000 });
  const desborde = p => p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  const limpio = async p => (await p.evaluate(() => window.__errores.length)) === 0 && (await p.evaluate(() => window.__xss)) === undefined && (await p.$$('[data-ex="raiz"] img, [data-ex="raiz"] svg')).length === 0;

  // 1. lista: solo lo que no es de alquiler
  {
    const { base, p, ctx } = await abre({ base: { xss: true } });
    const ids = await p.$$eval('.ex-fila[data-producto-id]', fs => fs.map(f => f.getAttribute('data-producto-id')));
    ok('solo enseña lo que NO es de alquiler (las motos viven en Flota), activos primero', J(ids) === J(['s2', 's1']), J(ids));
    ok('lee las tablas productos e impuestos (lo mismo que la pantalla a la que sustituye) y no escribe nada', J(base.llamadas.map(x => x[0] + ':' + x[1]).sort()) === J(['from:impuestos', 'from:productos']));
    ok('el impuesto sale con su nombre; el desactivado se marca', (await txt(p, '[data-producto-id="s1"]')).includes('PPN 11 %') && (await txt(p, '[data-producto-id="s1"]')).includes('Desactivado'));
    ok('enlaza a Flota para las motos (por la ruta)', (await p.$$('a[data-ex="ir-flota"][href="/intranet/v4/flota/"]')).length === 1);
    ok('XSS del nombre se pinta como texto', await limpio(p));
    const cad = (base.llamadas.find(x => x[1] === 'productos') || [])[2];
    ok('la consulta filtra la clase en la base (neq clase alquiler) ANTES del tope de 1000 (revisor 14-oct)', !!cad && J(cad.cad.filter(c => c[0] !== 'select')) === J([['neq', 'clase', 'alquiler'], ['order', 'nombre'], ['limit', 1001]]), J(cad));
    ok('con menos de 1000 extras no sale el aviso de lista recortada', await p.$eval('[data-ex="recortado"]', e => e.classList.contains('axw-oculto')));
    await ctx.close();
  }
  // 1c. exactamente 1000 extras (998 + los 2 de siempre): sin aviso falso
  {
    const { p, ctx } = await abre({ base: { mil: 'justo' } });
    const n = await p.$$eval('.ex-fila[data-producto-id]', fs => fs.length);
    ok('con exactamente 1000 extras: las 1000 filas y SIN aviso de lista recortada', n === 1000 && await p.$eval('[data-ex="recortado"]', e => e.classList.contains('axw-oculto')), String(n));
    await ctx.close();
  }
  // 1b. más de 1000 extras: se enseñan 1000 y se avisa (las motos no gastan el tope)
  {
    const { p, ctx } = await abre({ base: { mil: true }, idioma: 'id' });
    const n = await p.$$eval('.ex-fila[data-producto-id]', fs => fs.length);
    ok('con más de 1000 extras + motos: 1000 filas y el aviso de lista recortada, en indonesio', n === 1000 && await p.$eval('[data-ex="recortado"]', e => !e.classList.contains('axw-oculto') && /Ditampilkan 1000 ekstra/.test(e.textContent)), String(n));
    await ctx.close();
  }
  // 2. vacío ≠ error ≠ sin permiso
  {
    const a = await abre({ base: { vacio: true } });
    ok('sin extras: estado «vacio» propio y el botón «Nuevo extra» a la vista', (await tipo(a.p)) === 'vacio' && (await txt(a.p, '[data-ex="estado"]')).includes('Aún no hay extras') && !!(await a.p.$('[data-accion="ex-nuevo"]:not(.axw-oculto)')));
    await a.ctx.close();
    const b = await abre({ base: { sinRed: true } });
    ok('sin red: «no se ha podido mirar», tipo error, sin lista', (await tipo(b.p)) === 'error' && (await txt(b.p, '[data-ex="estado"]')).includes('No se ha podido mirar'));
    await b.ctx.close();
    const c = await abre({ base: { sinPermiso: true } });
    ok('42501 al leer: tipo sin_permiso con su frase, no «vacío»', (await tipo(c.p)) === 'sin_permiso' && (await txt(c.p, '[data-ex="estado"]')).includes('No tienes permiso'));
    await c.ctx.close();
    const d = await abre({ base: { sinImpuestos: true } });
    ok('sin la lista de impuestos: lo avisa, no inventa el nombre y el formulario no ofrece el impuesto', !(await d.p.$eval('[data-ex="impuestos-no"]', e => e.classList.contains('axw-oculto'))) && !(await txt(d.p, '[data-producto-id="s1"]')).includes('PPN'));
    await d.p.click('[data-accion="ex-editar"][data-producto-id="s1"]');
    ok('…y al editar no se toca el impuesto (no hay campo)', !(await d.p.$(campo('impuesto_id'))));
    await d.ctx.close();
  }
  // 3. alta
  {
    const { base, p, ctx } = await abre();
    await p.click('[data-accion="ex-nuevo"]');
    ok('alta: moneda de la instancia y unidad «ud» por defecto', (await p.$eval(campo('moneda'), e => e.value)) === 'IDR' && (await p.$eval(campo('unidad'), e => e.value)) === 'ud');
    await confirmar(p);
    ok('sin nombre: lo dice y no llama', (await dlgError(p)).includes('Falta el nombre') && guardas(base).length === 0);
    await p.fill(campo('nombre'), 'Impermeable'); await p.fill(campo('precio'), '25.000'); await confirmar(p);
    ok('precio ambiguo (25.000): pide escribirlo sin separador, no adivina', (await dlgError(p)).includes('ambiguo') && guardas(base).length === 0);
    await p.fill(campo('precio'), '25000,5'); await confirmar(p);
    ok('decimales que la moneda no admite (IDR): lo dice antes de enviar', (await dlgError(p)).includes('decimales') && guardas(base).length === 0);
    await p.fill(campo('precio'), '25000'); await p.selectOption(campo('impuesto_id'), 'i1'); await confirmar(p); await cerrado(p);
    const g = guardas(base);
    ok('crea con producto_guarda(p_id null) y clase «servicio» (nunca alquiler), sin campos vacíos', g.length === 1 && g[0][2].p_id === null
       && J(g[0][2].p_datos) === J({ nombre: 'Impermeable', unidad: 'ud', precio: 25000, moneda: 'IDR', impuesto_id: 'i1', activo: true, clase: 'servicio' }), J(g));
    ok('relee y lo enseña con «Extra creado.»', (await p.$$('.ex-fila[data-producto-id^="n"]')).length === 1 && (await txt(p, '[data-ex="exito"]')).includes('Extra creado'));
    ok('ninguna escritura manda clase alquiler', !base.llamadas.some(x => x[2] && x[2].p_datos && x[2].p_datos.clase === 'alquiler'));
    await ctx.close();
  }
  // 4. editar y activar
  {
    const { base, p, ctx } = await abre();
    await p.click('[data-accion="ex-editar"][data-producto-id="s1"]');
    ok('editar trae los datos de la fila (precio, moneda, impuesto, activo)', (await p.$eval(campo('precio'), e => e.value)) === '50000' && (await p.$eval(campo('impuesto_id'), e => e.value)) === 'i1' && !(await p.$eval(campo('activo'), e => e.checked)));
    await confirmar(p);
    ok('sin cambios: «No hay nada que cambiar» y no llama', (await dlgError(p)).includes('No hay nada que cambiar') && guardas(base).length === 0);
    await p.fill(campo('precio'), '60000'); await p.click(campo('activo')); await confirmar(p); await cerrado(p);
    const g = guardas(base);
    ok('manda SOLO lo que cambió (precio y activo) y nunca la clase', g.length === 1 && g[0][2].p_id === 's1' && J(g[0][2].p_datos) === J({ precio: 60000, activo: true }), J(g));
    await p.click('[data-accion="ex-activo"][data-producto-id="s2"]');
    await p.waitForFunction(() => document.querySelector('[data-ex="exito"]').textContent.includes('desactivado'), null, { timeout: 5000 });
    ok('Desactivar manda solo {activo:false}', J(guardas(base)[1][2]) === J({ p_id: 's2', p_datos: { activo: false } }));
    await ctx.close();
  }
  // 5. errores de la base al escribir
  for (const [nombre, o, frase] of [['no admin', { noAdmin: true }, 'administrador'], ['admin sin la herramienta', { sinFlota: true }, 'Flota y tarifas']]) {
    const { p, ctx } = await abre({ base: o });
    await p.click('[data-accion="ex-editar"][data-producto-id="s2"]');
    await p.fill(campo('nombre'), 'Casco XL'); await confirmar(p);
    await p.waitForFunction(() => !document.querySelector('[data-axw="dialogo"] .axw-error').classList.contains('axw-oculto'), null, { timeout: 5000 });
    ok(nombre + ': lo dice DESPUÉS de la respuesta y conserva lo escrito', (await dlgError(p)).includes(frase) && (await p.$eval(campo('nombre'), e => e.value)) === 'Casco XL');
    await ctx.close();
  }
  // 6. idiomas: todo lo que pinta tiene traducción
  for (const idioma of ['en', 'id']) {
    const { p, ctx } = await abre({ idioma, base: { largo: true } });
    await p.click('[data-accion="ex-editar"][data-producto-id="s1"]');
    await confirmar(p);
    const sin = await p.evaluate(() => Array.from(new Set(window.__sinT)));
    ok(idioma + ': ningún texto queda sin traducir (lista, formulario y error)', sin.length === 0, J(sin));
    await ctx.close();
  }
  // 7. 390 y 1440 px
  for (const ancho of [1440, 390]) {
    for (const idioma of ['es', 'en', 'id']) {
      const { p, ctx } = await abre({ ancho, idioma, base: { largo: true, xss: true } });
      let m = await desborde(p);
      ok(ancho + ' px · ' + idioma + ' · la lista (nombre larguísimo) no desborda', m.sw <= m.cw, J(m));
      if (SHOT && idioma !== 'es') await p.screenshot({ path: SHOT + '_' + ancho + '_' + idioma + '_lista.png', fullPage: true });
      await p.click('[data-accion="ex-editar"][data-producto-id="s3"]');
      await p.fill(campo('precio'), '1.000'); await confirmar(p);
      const d = await p.$eval('[data-axw="dialogo"] .axw-modal', e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: window.innerWidth }; });
      m = await desborde(p);
      ok(ancho + ' px · ' + idioma + ' · el formulario (con su error) cabe', d.l >= 0 && d.r <= d.w + 1 && m.sw <= m.cw, J([d, m]));
      if (SHOT && idioma !== 'es') await p.screenshot({ path: SHOT + '_' + ancho + '_' + idioma + '_form.png' });
      await ctx.close();
    }
  }
  await nav.close();
  console.log(fallos ? 'FALLOS: ' + fallos : 'TODO EN VERDE');
  process.exit(fallos ? 1 : 0);
})();
