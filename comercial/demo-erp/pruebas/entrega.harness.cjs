// node comercial/demo-erp/pruebas/entrega.harness.cjs [captura_prefijo]
// Harness de la pantalla Entrega del maestro (F8 pieza 8, 10-oct-2026): el entrega.html REAL (marcado + script, con las ayudas comunes de _compartido/ pegadas como hace build.py) en
// Chromium, con la base y la sesion SIMULADAS (page.exposeFunction): una base en memoria que imita el CONTRATO que le dio el encargo (entrega_datos, entrega_ajustes_guarda con version y
// motivo, entrega_tarifa_guarda con id de tarifa y motivo; hints campo_no_admitido, datos, entrega_apaga_primero, entrega_cambio). Mide el COMPORTAMIENTO, no el codigo: que pide y con
// que argumentos, que pinta con cada respuesta, XSS, «no se ha podido mirar» != «sin configurar», el analisis de «lat, lng», la confirmacion con la entrega activa, el doble clic, el
// conflicto de version y que a 390 px no hay scroll horizontal.
// OJO: la base real NO existe todavia (la migracion 138500 la escribe otra sesion). Lo que sale de aqui prueba la pantalla contra el contrato, no contra Postgres.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const COMUN_JS = fs.readFileSync(path.join(__dirname, '..', '_compartido', 'pantalla_comun.js'), 'utf8').trim();
const COMUN_CSS = fs.readFileSync(path.join(__dirname, '..', '_compartido', 'pantalla_comun.css'), 'utf8').trim();
const FUENTE = fs.readFileSync(path.join(__dirname, '..', 'entrega.html'), 'utf8');
const [MARCADO0, SCRIPT0] = FUENTE.split('<!--AXW_SCRIPT-->');
const MARCADO = MARCADO0.split('/*AXW_COMUN_CSS*/').join(COMUN_CSS);
const SCRIPT = SCRIPT0.split('/*AXW_COMUN_JS*/').join(COMUN_JS);
const SHOT = process.argv[2];
let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' -> ' + extra : '')); } else console.log('ok     ' + nombre); };

const XSS_NOMBRE = `Oficina <img src=x onerror="window.__xss=1"> 'q' "d"`;
const XSS_QUIEN = `a"<svg onload="window.__xss=2">@x.com`;
const XSS_MOTIVO = `"><img src=x onerror="window.__xss=3"> O'Brien <script>window.__xss=4</script>`;
const iso = (dias = 0) => new Date(Date.now() - dias * 86400000).toISOString();
const TOPES = { km_max: { min: 0.1, max: 200 }, tope_dia: { min: 1, max: 5000 }, tope_mes: { min: 1, max: 100000 }, cache_dias: { min: 1, max: 365 },
  precio_km: { min: 0.0001, max: null }, km_gratis: { min: 0, max: 500 }, minimo: { min: 0, max: null }, sede_nombre: { min: 1, max: 80 }, motivo: { min: 3, max: 200 } };

function nuevaBase(o = {}) {
  const configurada = !!o.configurada;
  const s = { llamadas: [], o, version: configurada ? 4 : 0, n: 0,
    a: { activa: !!o.activa, sede_nombre: configurada ? (o.xss ? XSS_NOMBRE : 'Oficina Canggu') : 'Oficina', sede_lat: configurada ? -8.65 : null, sede_lng: configurada ? 115.216667 : null,
         proveedor: 'osm', km_max: 60, tope_dia: 50, tope_mes: 500, cache_dias: 60, cobra_recogida: o.recogida === undefined ? (configurada ? false : null) : o.recogida,
         actualizado_en: configurada ? iso(1) : null, actualizado_por: configurada ? (o.xss ? XSS_QUIEN : 'admin@x.com') : null },
    tarifa: configurada ? { id: 't1', moneda: 'IDR', precio_km: 2500, km_gratis: o.kmGratis === undefined ? 5 : o.kmGratis, minimo: 15000, creado_en: iso(2), creado_por: o.xss ? XSS_QUIEN : 'admin@x.com' } : null,
    versiones: configurada ? [{ version: 4, cuando: iso(1), quien: o.xss ? XSS_QUIEN : 'admin@x.com', motivo: o.xss ? XSS_MOTIVO : 'Subo el tope' }, { version: 3, cuando: iso(3), quien: 'admin@x.com', motivo: 'Alta' }] : [] };
  return s;
}
const err = (code, message, hint, details) => ({ data: null, error: { code, message, hint: hint || null, details: details || null } });
function datos(s) {
  if (s.o.noPreparada) return { ajustes: null, version: null, tarifa: null, uso: { hoy: 0, mes: 0, tope_dia: null, tope_mes: null }, interruptor: { fallos: 0, abierto_hasta: null }, topes: s.o.topes || TOPES, faltan: ['sede', 'tarifa', 'servicio'], avisos: [], versiones: [] };
  const faltan = [];
  if (s.a.sede_lat == null || s.a.sede_lng == null) faltan.push('sede');
  if (!s.tarifa) faltan.push('tarifa');
  if (s.o.sinServicio !== false) { if (!s.o.conServicio) faltan.push('servicio'); }
  return { ajustes: JSON.parse(JSON.stringify(s.a)), version: s.version, tarifa: s.tarifa ? JSON.parse(JSON.stringify(s.tarifa)) : null,
    uso: { hoy: 12, mes: 140, tope_dia: s.a.tope_dia, tope_mes: s.a.tope_mes }, interruptor: s.o.interruptor || { fallos: 0, abierto_hasta: null },
    topes: s.o.topes || TOPES, faltan, avisos: s.a.cobra_recogida === null ? ['recogida_sin_decidir'] : [], versiones: JSON.parse(JSON.stringify(s.versiones)) };
}
async function servidor(s, nombre, a) {
  s.llamadas.push([nombre, JSON.parse(JSON.stringify(a))]);
  const o = s.o;
  if (o.lento) await new Promise(r => setTimeout(r, o.lento));
  if (o.sinRed && nombre === o.sinRed) return { data: null, error: { message: 'Failed to fetch' } };
  if (o.noDisponible && o.noDisponible.includes(nombre)) return err('PGRST202', 'Could not find the function public.' + nombre + ' in the schema cache');
  if (o.moduloApagado) return err('42501', nombre + ': módulo no activo', 'modulo_apagado');
  if (o.noAdmin) return err('42501', 'La entrega la ve y la configura un admin');
  switch (nombre) {
    case 'entrega_datos':
      if (o.datosRaros) return { data: { ajustes: 'nada' }, error: null };
      if (o.fallaLecturaTrasGuardar && s.llamadas.some(x => x[0] !== 'entrega_datos')) return { data: null, error: { message: 'Failed to fetch' } };
      return { data: datos(s), error: null };
    case 'entrega_tarifa_guarda': {
      if (o.tarifaFalla) return err('22023', 'Datos de la tarifa no válidos: moneda de tres letras', 'datos');
      if ((s.tarifa ? s.tarifa.id : null) !== a.p_tarifa_id) return err('40001', 'La tarifa cambió mientras la editabas', 'entrega_cambio');
      if (!a.p_motivo) return err('22023', 'Falta el motivo', 'datos');
      if (o.validaKm && (a.p_datos.km_gratis || 0) > s.a.km_max) return err('22023', 'Datos de la tarifa no válidos: los km gratis superan el km máximo vigente', 'datos');
      const extra = Object.keys(a.p_datos).filter(k => !['moneda', 'precio_km', 'km_gratis', 'minimo'].includes(k));
      if (extra.length) return err('22023', 'Campo no admitido: ' + extra.join(', '), 'campo_no_admitido');
      s.n++; s.tarifa = { id: 't' + (s.n + 1), moneda: a.p_datos.moneda, precio_km: a.p_datos.precio_km, km_gratis: a.p_datos.km_gratis || 0, minimo: a.p_datos.minimo || 0, creado_en: iso(0), creado_por: 'yo@x.com' };
      if (o.tarifaSinId) return { data: null, error: null };
      return { data: s.tarifa.id, error: null };
    }
    case 'entrega_ajustes_guarda': {
      if (o.otroGuarda && !s.__otro) { s.__otro = true; s.version++; s.a.km_max = 99; }
      if (a.p_version !== s.version) return err('40001', 'Otra persona guardó la entrega mientras tú editabas', 'entrega_cambio');
      if (!a.p_motivo) return err('22023', 'Falta el motivo', 'datos');
      const extra = Object.keys(a.p_datos).filter(k => !['activa', 'sede_nombre', 'sede_lat', 'sede_lng', 'km_max', 'tope_dia', 'tope_mes', 'cache_dias', 'cobra_recogida'].includes(k));
      if (extra.length) return err('22023', 'Campo no admitido: ' + extra.join(', '), 'campo_no_admitido');
      if (s.a.activa && ('sede_lat' in a.p_datos || 'sede_lng' in a.p_datos || 'sede_nombre' in a.p_datos) && a.p_datos.activa !== false) return err('22023', 'La entrega está activa: apágala para cambiar la sede', 'entrega_apaga_primero');
      if (o.apagaPrimero) return err('22023', 'La entrega está activa: apágala para cambiar la sede', 'entrega_apaga_primero');
      if (o.validaKm && a.p_datos.km_max !== undefined && s.tarifa && s.tarifa.km_gratis > a.p_datos.km_max) return err('22023', 'Datos de la entrega no válidos: el km máximo no puede quedar por debajo de los km gratis vigentes', 'datos');
      if (o.ajustesFalla) return err('22023', 'Datos de la entrega no válidos: la sede, los km y los topes tienen que estar en rango', 'datos');
      Object.assign(s.a, a.p_datos); s.a.actualizado_en = iso(0); s.a.actualizado_por = 'yo@x.com'; s.version++;
      s.versiones.unshift({ version: s.version, cuando: iso(0), quien: 'yo@x.com', motivo: a.p_motivo });
      if (o.ajustesSinVersion) return { data: { activa: s.a.activa }, error: null };
      return { data: Object.assign({}, s.a, { version: s.version }), error: null };
    }
  }
  return err('42883', 'funcion desconocida ' + nombre);
}

const pagina = (idioma) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title></head><body>
${MARCADO}
<script>
window.__xss = undefined; window.__fromLlamado = 0; window.__fetchLlamado = 0; window.__sinEn = []; window.__errores = [];
window.fetch = function () { window.__fetchLlamado++; return Promise.reject(new Error('fetch')); };
var sb = {
  rpc: function (n, a) { return { then: function (f, g) { return window.__srv(n, a || {}).then(f, g); } }; },
  from: function () { window.__fromLlamado++; throw new Error('el navegador no toca la base'); },
  auth: { getSession: function () { return Promise.resolve({ data: { session: { access_token: 'JWT' } } }); } }
};
window.LW_AUTH = Promise.resolve({ sb: sb, ficha: { rol: 'agente', herramientas: ['entrega'] } });
window.lwDatos = function (n, a) { return Promise.resolve(sb.rpc(n, a)).then(function (r) { return { data: r.data, error: r.error }; }); };
window.LW_IDIOMA = '${idioma}';
window.LW_EN = {};
window.lwLocale = function () { return window.LW_IDIOMA === 'en' ? 'en-GB' : 'es-ES'; };
window.lwT = function (s) { s = String(s); if (window.LW_IDIOMA === 'en') { if (Object.prototype.hasOwnProperty.call(window.LW_EN, s)) return window.LW_EN[s]; if (!/^[\\s\u2014\u00b70-9.,%():\u2265\u2264-]*$/.test(s)) window.__sinEn.push(s); } return s; };
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
    if (!opts.sinEspera) await p.waitForFunction(() => document.querySelector('[data-en="estado"]').getAttribute('data-tipo') !== 'cargando', null, { timeout: 5000 });
    return { base, p, ctx };
  }
  const txt = (p, sel) => p.$eval(sel, e => e.textContent);
  const llamadas = (b, n) => b.llamadas.filter(x => x[0] === n);
  const escritas = b => b.llamadas.filter(x => x[0] !== 'entrega_datos');
  const espera = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: 5000 });
  const hasta = async f => { for (let i = 0; i < 100; i++) { if (f()) return true; await new Promise(r => setTimeout(r, 50)); } return false; };   // espera del lado de node (la base falsa vive aqui)
  const campo = n => '[data-campo="' + n + '"]';
  const visible = (p, sel) => p.$eval(sel, e => !e.classList.contains('axw-oculto'));
  const tipo = p => p.$eval('[data-en="estado"]', e => e.getAttribute('data-tipo'));
  const guardar = p => p.click('[data-accion="en-guardar"]');
  const errorTxt = p => txt(p, '[data-en="error"]');
  const sinInyeccion = async p => (await p.$$('[data-en="raiz"] img, [data-en="raiz"] svg, [data-en="raiz"] script')).length === 0 && (await p.evaluate(() => window.__xss)) === undefined;
  const sinErrores = async p => (await p.evaluate(() => window.__errores)).length === 0 && (await p.evaluate(() => window.__fromLlamado + window.__fetchLlamado)) === 0;
  const J = x => JSON.stringify(x);

  // 1. cargando · sin configurar · configurada
  {
    const { base, p, ctx } = await abre({ base: { lento: 400 }, sinEspera: true });
    await espera(p, () => document.querySelector('[data-en="estado"]').getAttribute('data-tipo') === 'cargando');
    ok('mientras lee dice «Cargando…» y NO enseña el formulario ni dice nada del rol', (await txt(p, '[data-en="estado"]')).includes('Cargando') && !(await visible(p, '[data-en="form"]')) && !(await txt(p, '[data-en="estado"]')).includes('administra'));
    await espera(p, () => document.querySelector('[data-en="estado"]').getAttribute('data-tipo') === 'listo');
    ok('al llegar la lectura enseña el formulario y oculta el estado', (await visible(p, '[data-en="form"]')) && !(await visible(p, '[data-en="estado"]')));
    ok('arranca pidiendo SOLO la lectura', base.llamadas.length === 1 && base.llamadas[0][0] === 'entrega_datos' && J(base.llamadas[0][1]) === '{}', J(base.llamadas));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre();
    ok('sin configurar: el formulario sale con los valores de la base (nombre y topes por defecto), sin coordenadas ni tarifa',
       (await p.$eval(campo('sede_nombre'), e => e.value)) === 'Oficina' && (await p.$eval(campo('sede_coord'), e => e.value)) === '' && (await p.$eval(campo('precio_km'), e => e.value)) === ''
       && (await p.$eval(campo('km_max'), e => e.value)) === '60' && (await p.$eval(campo('tope_dia'), e => e.value)) === '50');
    ok('sin tarifa lo dice y sin ajustes guardados no inventa autor', (await txt(p, '[data-en="tarifa-quien"]')) === 'Aún no hay tarifa.' && (await txt(p, '[data-en="ajustes-quien"]')) === 'Sin cambios todavía');
    ok('sin versiones dice que no hay cambios y no pinta tabla', (await visible(p, '[data-en="versiones-vacio"]')) === true && (await p.$$('[data-en="versiones"] tbody tr')).length === 0);
    ok('faltan: la sede, la tarifa y el servicio salen como «Falta» y el interruptor Activar esta bloqueado',
       (await p.$$('[data-en="faltan"] li[data-faltante]')).length === 3 && (await p.$eval(campo('activa'), e => e.disabled)) === true && (await txt(p, '[data-en="activa-ayuda"]')).includes('Guarda primero'));
    ok('si falta el servicio enlaza a Productos', (await p.$$('[data-en="faltan"] a[href="/intranet/v4/productos/"]')).length === 1);
    ok('los rangos vienen de `topes`: min/max en los atributos y el texto de ayuda',
       (await p.$eval(campo('km_max'), e => e.getAttribute('min') + '|' + e.getAttribute('max'))) === '0.1|200' && (await txt(p, '[data-en="rango-cache_dias"]')).includes('1') && (await txt(p, '[data-en="rango-cache_dias"]')).includes('365')
       && (await p.$eval(campo('precio_km'), e => e.getAttribute('min') + '|' + e.hasAttribute('max'))) === '0.0001|false');
    ok('consumo de hoy y del mes sale de la base', (await txt(p, '[data-en="uso"]')).includes('12 de 50') && (await txt(p, '[data-en="uso"]')).includes('140 de 500'));
    ok('recogida sin decidir: aviso visible y el selector en «Sin decidir»', (await visible(p, '[data-en="recogida-aviso"]')) && (await p.$eval(campo('cobra_recogida'), e => e.value)) === '');
    await p.selectOption(campo('cobra_recogida'), 'no');
    ok('al decidir la recogida el aviso se va', !(await visible(p, '[data-en="recogida-aviso"]')));
    ok('sin errores de JS y sin tocar la base ni fetch', await sinErrores(p));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { configurada: true, conServicio: true, xss: true } });
    ok('configurada: sede, coordenadas y tarifa sacadas de la base', (await p.$eval(campo('sede_coord'), e => e.value)) === '-8.65, 115.216667' && (await p.$eval(campo('precio_km'), e => e.value)) === '2500' && (await p.$eval(campo('moneda'), e => e.value)) === 'IDR');
    ok('muestra quien fijo la tarifa y cuando (como texto)', (await txt(p, '[data-en="tarifa-quien"]')).includes(XSS_QUIEN) && (await txt(p, '[data-en="tarifa-quien"]')).startsWith('Fijada por'));
    const filas = await p.$$eval('[data-en="versiones"] tbody tr', trs => trs.map(t => t.textContent));
    ok('lista las ultimas versiones con quien y motivo, en texto', filas.length === 2 && filas[0].includes(XSS_MOTIVO) && filas[0].includes(XSS_QUIEN));
    ok('con todo listo el interruptor se puede marcar', (await p.$eval(campo('activa'), e => e.disabled)) === false && (await p.$$('[data-en="faltan"] li[data-faltante]')).length === 0);
    ok('el nombre de la sede con etiquetas queda como valor, no como HTML', (await p.$eval(campo('sede_nombre'), e => e.value)) === XSS_NOMBRE);
    ok('ningun <img>/<script>/<svg> salio de ningun dato de la base y no se ejecuto nada', await sinInyeccion(p));
    ok('recogida decidida: «No se cobra» y sin aviso', (await p.$eval(campo('cobra_recogida'), e => e.value)) === 'no' && !(await visible(p, '[data-en="recogida-aviso"]')));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { configurada: true, conServicio: true, interruptor: { fallos: 3, abierto_hasta: new Date(Date.now() + 600000).toISOString() } } });
    ok('el interruptor del proveedor abierto se dice (pausa y que salen «a confirmar»)', (await visible(p, '[data-en="interruptor"]')) && (await txt(p, '[data-en="interruptor"]')).includes('a confirmar'));
    await ctx.close();
  }

  // 2. «no se ha podido mirar» NO es «sin configurar» · no es admin
  for (const [nombre, base, esperado] of [
    ['modulo apagado', { moduloApagado: true }, 'apagado'], ['funcion no disponible', { noDisponible: ['entrega_datos'] }, 'todavía no está disponible'],
    ['sin red', { sinRed: 'entrega_datos' }, 'no ha respondido'], ['forma inesperada', { datosRaros: true }, 'inesperado']]) {
    const { p, ctx } = await abre({ base });
    const t = await txt(p, '[data-en="estado"]');
    ok(nombre + ': se dice «no se ha podido mirar» (' + esperado + '), tipo error y NO se enseña un formulario vacio como si no hubiera nada',
       (await tipo(p)) === 'error' && t.includes('No se ha podido mirar') && t.includes(esperado) && !(await visible(p, '[data-en="form"]')), t);
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { noAdmin: true } });
    const t = await txt(p, '[data-en="estado"]');
    ok('42501 de la base: DESPUES de la respuesta dice que es solo de la administracion (tipo sin_permiso, no «no se ha podido mirar») y no hay formulario', (await tipo(p)) === 'sin_permiso' && t.includes('Solo la administración') && !t.includes('No se ha podido mirar') && !(await visible(p, '[data-en="form"]')), t);
    ok('la pantalla no mira el rol del usuario para decidirlo: lee y espera', base.llamadas.length === 1);
    await ctx.close();
  }

  // 3. «lat, lng»: lo malformado se rechaza sin llamar; lo bueno viaja como numeros
  for (const [v, texto] of [['abc', 'No se entienden'], ['-8.65', 'No se entienden'], ['8,115', 'No se entienden'], ['-8,65,115,21', 'No se entienden'], ['-8,65, 115,21', 'No se entienden'],
    ['-8.65, 115,21', 'No se entienden'], ['8, 115', 'No se entienden'], ['91.5, 10.5', 'La latitud va de -90 a 90'], ['10.5, 190.5', 'La longitud'.replace('La longitud', 'La latitud va de -90 a 90')], ['120.5, 10.5', '¿Están al revés?'],
    ['N 8.65, E 115.2', 'No se entienden'], ['8.65 115.2 3.3', 'No se entienden']]) {
    const { base, p, ctx } = await abre();
    await p.fill(campo('sede_coord'), v); await p.fill(campo('motivo'), 'Alta de la sede');
    await guardar(p);
    const e = await errorTxt(p);
    ok('«' + v + '» se rechaza sin llamar y con mensaje claro', escritas(base).length === 0 && e.includes(texto) && (await p.$eval(campo('sede_coord'), x => x.getAttribute('aria-invalid'))) === 'true', e.slice(0, 160));
    await ctx.close();
  }
  for (const [v, lat, lng] of [['-8.65, 115.21', -8.65, 115.21], ['-8.65,115.21', -8.65, 115.21], ['-8,65 115,21', -8.65, 115.21], ['-8,65; 115,21', -8.65, 115.21], ['\u22128.65, 115.21', -8.65, 115.21],
    ['  +8.123456789 ,  -179.9 ', 8.123457, -179.9], ['-8.65\u00b0, 115.21\u00b0', -8.65, 115.21], ['-90.0, 180.0', -90, 180]]) {
    const { base, p, ctx } = await abre();
    await p.fill(campo('sede_coord'), v); await p.fill(campo('motivo'), 'Alta de la sede');
    await guardar(p);
    await espera(p, () => document.querySelector('[data-en="exito"]:not(.axw-oculto)'));
    const w = escritas(base);
    ok('«' + v + '» viaja como numeros ' + lat + ', ' + lng + ' y solo la sede', w.length === 1 && w[0][0] === 'entrega_ajustes_guarda' && J(w[0][1].p_datos) === J({ sede_lat: lat, sede_lng: lng }), J(w));
    await ctx.close();
  }

  // 4. guardar: motivo obligatorio, sin cambios, argumentos exactos, tarifa antes que ajustes, nada de autor/fechas
  {
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true } });
    await guardar(p);
    ok('sin cambios no llama y lo dice (aunque no haya motivo)', escritas(base).length === 0 && (await txt(p, '[data-en="aviso"]')).includes('No hay cambios'));
    await p.fill(campo('tope_dia'), '80');
    await guardar(p);
    ok('con un cambio y sin motivo no llama, marca el campo motivo y lo exige', escritas(base).length === 0 && (await errorTxt(p)).includes('motivo') && (await p.$eval(campo('motivo'), x => x.getAttribute('aria-invalid'))) === 'true');
    await p.fill(campo('motivo'), 'ab'); await guardar(p);
    ok('un motivo de 2 caracteres tampoco', escritas(base).length === 0);
    await p.fill(campo('motivo'), '   Subo el tope   '); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="exito"]:not(.axw-oculto)'));
    const w = escritas(base);
    ok('guardar un limite manda SOLO ese campo, el motivo recortado y la version que la base dio (4); sin autor ni fechas', w.length === 1 && J(w[0][1]) === J({ p_datos: { tope_dia: 80 }, p_motivo: 'Subo el tope', p_version: 4 }), J(w));
    ok('lo anunciado sale de la respuesta (version 5), se vuelve a leer y el motivo se vacia', (await txt(p, '[data-en="exito"]')).includes('5') && llamadas(base, 'entrega_datos').length === 2 && (await p.$eval(campo('motivo'), x => x.value)) === '');
    ok('la lista de versiones trae la nueva', (await p.$$('[data-en="versiones"] tbody tr')).length === 3);
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true } });
    await p.fill(campo('precio_km'), '3000,5'); await p.fill(campo('tope_mes'), '600'); await p.fill(campo('motivo'), 'Nueva tarifa'); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="exito"]:not(.axw-oculto)'));
    const w = escritas(base);
    ok('tarifa y ajustes: primero la tarifa (con el id que vio, t1, moneda y todos sus campos) y luego los ajustes con la version, cada uno con su motivo',
       w.length === 2 && w[0][0] === 'entrega_tarifa_guarda' && J(w[0][1]) === J({ p_datos: { moneda: 'IDR', precio_km: 3000.5, km_gratis: 5, minimo: 15000 }, p_motivo: 'Nueva tarifa', p_tarifa_id: 't1' })
       && w[1][0] === 'entrega_ajustes_guarda' && J(w[1][1]) === J({ p_datos: { tope_mes: 600 }, p_motivo: 'Nueva tarifa', p_version: 4 }), J(w));
    ok('tras guardar la tarifa nueva se lee de vuelta (precio 3000.5, otro id)', (await p.$eval(campo('precio_km'), x => x.value)) === '3000.5');
    await ctx.close();
  }
  {
    // primera configuracion completa: tarifa desde cero (id null), y luego activar
    const { base, p, ctx } = await abre({ base: { conServicio: true } });
    await p.fill(campo('sede_coord'), '-8.65, 115.21'); await p.fill(campo('moneda'), 'idr'); await p.fill(campo('precio_km'), '2500'); await p.fill(campo('motivo'), 'Primera configuracion'); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="exito"]:not(.axw-oculto)'));
    const w = escritas(base);
    ok('tarifa desde cero manda p_tarifa_id null, la moneda en mayusculas y km gratis / minimo = 0', w[0][0] === 'entrega_tarifa_guarda' && J(w[0][1]) === J({ p_datos: { moneda: 'IDR', precio_km: 2500, km_gratis: 0, minimo: 0 }, p_motivo: 'Primera configuracion', p_tarifa_id: null }), J(w[0]));
    ok('con todo guardado ya no falta nada y el interruptor se desbloquea', (await p.$eval(campo('activa'), e => e.disabled)) === false && (await p.$$('[data-en="faltan"] li[data-faltante]')).length === 0);
    await ctx.close();
  }

  // 5. validaciones numericas y rangos de `topes`
  {
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true, topes: Object.assign({}, TOPES, { km_max: { min: 0.1, max: 120 } }) } });
    ok('si la base cambia el tope duro, el atributo cambia (nada copiado a mano)', (await p.$eval(campo('km_max'), e => e.getAttribute('max'))) === '120');
    await p.fill(campo('motivo'), 'Prueba de rangos');
    for (const [c, v, texto] of [['km_max', '130', 'Fuera de rango'], ['km_max', '12abc', 'número positivo'], ['tope_dia', '1.000', 'solo cifras'], ['tope_dia', '0', 'Fuera de rango'], ['cache_dias', '400', 'Fuera de rango'],
      ['precio_km', '2.500', 'ambiguo'], ['precio_km', '-3', 'número positivo'], ['moneda', 'ID', 'tres letras'], ['km_max', '', 'obligatorio']]) {
      await p.fill(campo('km_max'), '60'); await p.fill(campo('tope_dia'), '50'); await p.fill(campo('cache_dias'), '60'); await p.fill(campo('precio_km'), '2500'); await p.fill(campo('moneda'), 'IDR'); await p.fill(campo('tope_dia'), '80');
      await p.fill(campo(c), v); await guardar(p);
      ok(c + ' = «' + v + '» no llama (' + texto + ')', escritas(base).length === 0 && (await errorTxt(p)).includes(texto), (await errorTxt(p)).slice(0, 140));
    }
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true } });
    await p.fill(campo('sede_coord'), ''); await p.fill(campo('motivo'), 'Quitar la sede'); await guardar(p);
    ok('no se puede vaciar una sede que ya tenia coordenadas', escritas(base).length === 0 && (await errorTxt(p)).includes('sin coordenadas'));
    await p.fill(campo('sede_coord'), '-8.65, 115.216667'); await p.fill(campo('precio_km'), ''); await guardar(p);
    ok('vaciar el precio de una tarifa existente no llama y pide moneda y precio', escritas(base).length === 0 && (await errorTxt(p)).includes('moneda y el precio'));
    await ctx.close();
  }

  // 6. recogida sin decidir viaja; activar bloqueado por faltan
  {
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true, recogida: null } });
    ok('base con avisos recogida_sin_decidir: se ve el aviso', await visible(p, '[data-en="recogida-aviso"]'));
    await p.selectOption(campo('cobra_recogida'), 'si'); await p.fill(campo('motivo'), 'Decidido: se cobra'); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="exito"]:not(.axw-oculto)'));
    ok('decidir la recogida manda cobra_recogida true', J(escritas(base)[0][1].p_datos) === J({ cobra_recogida: true }));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true, recogida: true } });
    await p.selectOption(campo('cobra_recogida'), ''); await p.fill(campo('motivo'), 'Volver a sin decidir'); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="exito"]:not(.axw-oculto)'));
    ok('volver a «sin decidir» manda cobra_recogida null (la base lo acepta) y vuelve el aviso', J(escritas(base)[0][1].p_datos) === J({ cobra_recogida: null }) && await visible(p, '[data-en="recogida-aviso"]'));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { configurada: true } });
    ok('falta solo el servicio: Activar bloqueado, la fila del servicio dice Falta y el enlace a Productos',
       (await p.$eval(campo('activa'), e => e.disabled)) && (await p.$$('[data-en="faltan"] li[data-faltante="servicio"] a')).length === 1 && (await p.$$('[data-en="faltan"] li[data-listo]')).length === 2);
    await ctx.close();
  }

  // 7. activar / entrega activa: confirmacion explicita, sede bloqueada
  {
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true } });
    await p.check(campo('activa')); await p.fill(campo('motivo'), 'Activo la entrega'); await guardar(p);
    const d = await txt(p, '[data-axw="dialogo"]');
    ok('al ACTIVAR pide confirmacion: «Esto cambia el precio al bot desde ya», lista lo que cambia y el motivo, y NO ha llamado', d.includes('Esto cambia el precio al bot desde ya') && d.includes('Activar la entrega') && d.includes('Activo la entrega') && escritas(base).length === 0);
    await p.evaluate(() => { const b = document.querySelector('[data-accion="en-guardar"]'); b.click(); b.click(); });
    ok('doble clic en Guardar con el dialogo abierto no abre otro', (await p.$$('[data-axw="dialogo"]')).length === 1);
    await p.click('[data-accion="en-modal-cerrar"]');
    ok('cancelar cierra y no llama', (await p.$$('[data-axw="dialogo"]')).length === 0 && escritas(base).length === 0 && (await p.$eval(campo('activa'), e => e.checked)));
    await guardar(p);
    await p.evaluate(() => { const b = document.querySelector('[data-accion="en-modal-confirmar"]'); b.click(); b.click(); });
    await espera(p, () => document.querySelector('[data-en="exito"]:not(.axw-oculto)'));
    ok('confirmar con doble clic = UNA sola llamada, con activa true', escritas(base).length === 1 && J(escritas(base)[0][1].p_datos) === J({ activa: true }), J(escritas(base)));
    ok('recargada: la entrega activa bloquea la sede (solo lectura + explicacion) y la ayuda dice que cambia el precio desde ya',
       (await p.$eval(campo('sede_nombre'), e => e.readOnly)) && (await p.$eval(campo('sede_coord'), e => e.readOnly)) && (await visible(p, '[data-en="sede-bloqueo"]')) && (await txt(p, '[data-en="activa-ayuda"]')).includes('desde ya'));
    ok('el dialogo se cerro tras guardar', (await p.$$('[data-axw="dialogo"]')).length === 0);
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true, activa: true } });
    ok('con la entrega activa la sede esta bloqueada desde el primer momento', (await p.$eval(campo('sede_coord'), e => e.readOnly)) && (await txt(p, '[data-en="sede-bloqueo"]')).includes('Apaga la entrega'));
    await p.evaluate(() => { document.querySelector('[data-campo="sede_coord"]').value = '-1.0, 1.0'; });   // como si lo cambiaran desde las herramientas del navegador: la pantalla no lo manda
    await p.fill(campo('tope_dia'), '70'); await p.fill(campo('motivo'), 'Subo el tope en caliente'); await guardar(p);
    ok('cambiar algo con la entrega ACTIVA tambien pide confirmacion', (await txt(p, '[data-axw="dialogo"]')).includes('Esto cambia el precio al bot desde ya') && (await txt(p, '[data-axw="dialogo"]')).includes('Límites y política') && escritas(base).length === 0);
    await p.click('[data-accion="en-modal-confirmar"]');
    await espera(p, () => document.querySelector('[data-en="exito"]:not(.axw-oculto)'));
    ok('el cambio de la sede en un campo bloqueado NO viaja (la sede sigue siendo la de la base)', J(escritas(base)[0][1].p_datos) === J({ tope_dia: 70 }), J(escritas(base)));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true, activa: true } });
    await p.uncheck(campo('activa')); await p.fill(campo('motivo'), 'Apago para cambiar la sede'); await guardar(p);
    ok('apagar la entrega activa tambien confirma y lo nombra', (await txt(p, '[data-axw="dialogo"]')).includes('Apagar la entrega'));
    await p.click('[data-accion="en-modal-confirmar"]');
    await espera(p, () => document.querySelector('[data-en="exito"]:not(.axw-oculto)'));
    ok('apagada, la sede se desbloquea', !(await p.$eval(campo('sede_coord'), e => e.readOnly)) && !(await visible(p, '[data-en="sede-bloqueo"]')));
    await ctx.close();
  }

  // 8. errores de escritura: los mensajes de la base se enseñan; doble clic; no confirmado; fallo parcial; relectura fallida
  {
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true, ajustesFalla: true, lento: 250 } });
    await p.fill(campo('tope_dia'), '70'); await p.fill(campo('motivo'), 'Doble clic'); await p.evaluate(() => { const b = document.querySelector('[data-accion="en-guardar"]'); b.click(); b.click(); });
    ok('el boton se deshabilita mientras guarda', await p.$eval('[data-accion="en-guardar"]', b => b.disabled));
    await espera(p, () => document.querySelector('[data-en="error"]:not(.axw-oculto)'));
    ok('doble clic en Guardar = UNA sola llamada de escritura', escritas(base).length === 1);
    ok('una regla de la base (datos) se enseña con SUS palabras y los valores escritos siguen en el formulario', (await errorTxt(p)).includes('Datos de la entrega no válidos') && (await p.$eval(campo('tope_dia'), e => e.value)) === '70');
    ok('el boton se libera tras el error', await p.$eval('[data-accion="en-guardar"]', b => !b.disabled));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { configurada: true, conServicio: true, ajustesSinVersion: true } });
    await p.fill(campo('tope_dia'), '70'); await p.fill(campo('motivo'), 'Sin confirmar'); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="error"]:not(.axw-oculto)'));
    ok('si la base no devuelve la version NO se da por guardado y lo dice', (await errorTxt(p)).includes('no confirmó') && (await txt(p, '[data-en="exito"]')) === '');
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { configurada: true, conServicio: true, tarifaSinId: true } });
    await p.fill(campo('precio_km'), '2600'); await p.fill(campo('motivo'), 'Sin id'); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="error"]:not(.axw-oculto)'));
    ok('si la base no devuelve el id de la tarifa NO se da por guardada', (await errorTxt(p)).includes('no confirmó'));
    await ctx.close();
  }
  {
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true, ajustesFalla: true } });
    await p.fill(campo('precio_km'), '2700'); await p.fill(campo('tope_dia'), '70'); await p.fill(campo('motivo'), 'Fallo parcial'); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="error"]:not(.axw-oculto)'));
    await hasta(() => llamadas(base, 'entrega_datos').length >= 2);
    await espera(p, () => document.querySelector('[data-campo="precio_km"]').value === '2700');
    const e = await errorTxt(p);
    ok('tarifa guardada y ajustes rechazados: se dice QUE se guardo y que no, con el mensaje de la base', e.includes('La tarifa sí se guardó') && e.includes('Datos de la entrega no válidos'), e.slice(0, 200));
    ok('se relee (otra tarifa vigente) y lo que falta por guardar se conserva en el formulario', llamadas(base, 'entrega_datos').length === 2 && (await p.$eval(campo('tope_dia'), x => x.value)) === '70' && (await p.$eval(campo('motivo'), x => x.value)) === 'Fallo parcial');
    await guardar(p);
    await hasta(() => escritas(base).length >= 3);
    ok('el reintento NO vuelve a mandar la tarifa (ya esta) y manda solo lo pendiente', escritas(base).filter(x => x[0] === 'entrega_tarifa_guarda').length === 1);
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { configurada: true, conServicio: true, fallaLecturaTrasGuardar: true } });
    await p.fill(campo('tope_dia'), '70'); await p.fill(campo('motivo'), 'Releer falla'); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="error"]:not(.axw-oculto)'));
    ok('si se guarda pero no se puede releer lo dice y no pinta nada inventado', (await errorTxt(p)).includes('no se pudo volver a leer') || (await errorTxt(p)).includes('No se ha podido mirar'));
    await ctx.close();
  }
  {
    // la base tiene SU regla (entrega_apaga_primero) y la pantalla enseña su mensaje tal cual
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true, activa: true, apagaPrimero: true } });
    await p.fill(campo('tope_dia'), '70'); await p.fill(campo('motivo'), 'Cambio en caliente'); await guardar(p);
    await p.click('[data-accion="en-modal-confirmar"]');
    await espera(p, () => document.querySelector('[data-en="error"]:not(.axw-oculto)'));
    ok('regla entrega_apaga_primero de la base: se enseña su mensaje tal cual y el formulario conserva lo escrito', (await errorTxt(p)).includes('apágala para cambiar la sede') && (await p.$eval(campo('tope_dia'), e => e.value)) === '70');
    await ctx.close();
  }

  // 9. conflicto de version: otra persona guardo
  {
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true, otroGuarda: true } });
    await p.fill(campo('tope_dia'), '77'); await p.fill(campo('motivo'), 'Mi cambio'); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="conflicto"]:not(.axw-oculto)'));
    ok('conflicto (40001 entrega_cambio): mensaje «otra persona guardo» con boton de recargar y Guardar bloqueado', (await txt(p, '[data-en="conflicto"]')).includes('Otra persona') && (await p.$eval('[data-accion="en-guardar"]', b => b.disabled)) && (await p.$$('[data-accion="en-recargar"]')).length === 1);
    ok('no se dio nada por guardado', (await txt(p, '[data-en="exito"]')) === '' && escritas(base).length === 1);
    await p.click('[data-accion="en-recargar"]');
    await espera(p, () => document.querySelector('[data-campo="km_max"]').value === '99');
    ok('recargar trae los valores nuevos de la otra persona (km_max 99) y CONSERVA lo que escribi (tope 77 y el motivo)', (await p.$eval(campo('tope_dia'), e => e.value)) === '77' && (await p.$eval(campo('motivo'), e => e.value)) === 'Mi cambio');
    ok('el conflicto se cierra, Guardar vuelve a estar libre y se explica', !(await visible(p, '[data-en="conflicto"]')) && (await p.$eval('[data-accion="en-guardar"]', b => !b.disabled)) && (await txt(p, '[data-en="aviso"]')).includes('Se conserva lo que escribiste'));
    await guardar(p);
    await espera(p, () => document.querySelector('[data-en="exito"]:not(.axw-oculto)'));
    const w = escritas(base);
    ok('el segundo intento manda SOLO lo mio (tope 77, no el km_max de la otra persona) con la version nueva (5)', J(w[1][1]) === J({ p_datos: { tope_dia: 77 }, p_motivo: 'Mi cambio', p_version: 5 }), J(w));
    await ctx.close();
  }
  {
    // descartar vuelve a lo guardado
    const { p, ctx } = await abre({ base: { configurada: true, conServicio: true } });
    await p.fill(campo('tope_dia'), '77'); await p.fill(campo('motivo'), 'x'); await p.click('[data-accion="en-descartar"]');
    ok('descartar devuelve el formulario a lo que dice la base', (await p.$eval(campo('tope_dia'), e => e.value)) === '50' && (await p.$eval(campo('motivo'), e => e.value)) === '');
    await ctx.close();
  }

  // 9b. hallazgos del revisor (10-oct-2026): topes de texto de la base · «no preparada» · orden de guardado segun km_max
  {
    const { p, ctx } = await abre({ base: { configurada: true, conServicio: true, topes: Object.assign({}, TOPES, { sede_nombre: { min: 2, max: 40 }, motivo: { min: 5, max: 50 } }) } });
    ok('sede_nombre y motivo: maxlength/minlength salen de `topes` de la base (40/2 y 50/5), no del HTML',
       (await p.$eval(campo('sede_nombre'), e => e.getAttribute('maxlength') + '|' + e.getAttribute('minlength'))) === '40|2' && (await p.$eval(campo('motivo'), e => e.getAttribute('maxlength') + '|' + e.getAttribute('minlength'))) === '50|5');
    await p.fill(campo('tope_dia'), '80'); await p.fill(campo('motivo'), 'abcd'); await guardar(p);
    ok('un motivo por debajo del minimo de la base (5) no llama y dice el rango leido de la base', (await errorTxt(p)).includes('Entre 5 y 50'), (await errorTxt(p)).slice(0, 120));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ base: { configurada: true, conServicio: true, topes: { km_max: { min: 0.1, max: 200 } } } });
    ok('si la base no da tope de texto, la pantalla no inventa ninguno (sin maxlength ni minlength)',
       (await p.$eval(campo('sede_nombre'), e => e.hasAttribute('maxlength') || e.hasAttribute('minlength'))) === false && (await p.$eval(campo('motivo'), e => e.hasAttribute('maxlength') || e.hasAttribute('minlength'))) === false);
    await ctx.close();
  }
  for (const idioma of ['es', 'en']) {
    const { base, p, ctx } = await abre({ idioma, base: { noPreparada: true } });
    const t = await txt(p, '[data-en="estado"]');
    ok(idioma + ' · ajustes y version null: estado propio «no preparada» (tipo no_preparada), ni «inesperado» ni «solo administracion», y sin formulario',
       (await tipo(p)) === 'no_preparada' && t.includes(idioma === 'es' ? 'La entrega no está preparada en esta instancia' : 'Delivery is not set up in this instance') && !t.includes('inesperado') && !t.includes('unexpected') && !t.includes('Solo la administración') && !(await visible(p, '[data-en="form"]')), t);
    ok(idioma + ' · «no preparada» no escribe nada y no hay cadenas sin traducir ni errores de JS', escritas(base).length === 0 && (await p.evaluate(() => window.__sinEn)).length === 0 && await sinErrores(p));
    await ctx.close();
  }
  for (const ancho of [1440, 390]) {
    const { p, ctx } = await abre({ ancho, base: { noPreparada: true } });
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(ancho + ' px · el estado «no preparada» no desborda', m.sw <= m.cw, J(m));
    if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_no_preparada.png', fullPage: true });
    await ctx.close();
  }
  {
    // km_max SUBE junto con km_gratis: la base valida la tarifa contra el km_max vigente, asi que primero los ajustes y luego la tarifa
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true, validaKm: true } });
    await p.fill(campo('km_gratis'), '80'); await p.fill(campo('km_max'), '100'); await p.fill(campo('motivo'), 'Subo los km'); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="exito"]:not(.axw-oculto)'));
    const w = escritas(base);
    ok('km_max sube con km_gratis: primero ajustes (km_max) y luego tarifa, y la base lo da por bueno',
       w.length === 2 && w[0][0] === 'entrega_ajustes_guarda' && J(w[0][1]) === J({ p_datos: { km_max: 100 }, p_motivo: 'Subo los km', p_version: 4 })
       && w[1][0] === 'entrega_tarifa_guarda' && w[1][1].p_datos.km_gratis === 80 && base.a.km_max === 100 && base.tarifa.km_gratis === 80, J(w));
    await ctx.close();
  }
  {
    // km_max BAJA junto con km_gratis: primero la tarifa (valida contra el km_max mayor) y luego los ajustes; al reves la base rechazaria el km_max
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true, validaKm: true, kmGratis: 40 } });
    await p.fill(campo('km_gratis'), '10'); await p.fill(campo('km_max'), '30'); await p.fill(campo('motivo'), 'Bajo los km'); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="exito"]:not(.axw-oculto)'));
    const w = escritas(base);
    ok('km_max baja con km_gratis: primero tarifa y luego ajustes, y la base lo da por bueno',
       w.length === 2 && w[0][0] === 'entrega_tarifa_guarda' && w[0][1].p_datos.km_gratis === 10 && w[1][0] === 'entrega_ajustes_guarda' && J(w[1][1].p_datos) === J({ km_max: 30 })
       && base.a.km_max === 30 && base.tarifa.km_gratis === 10, J(w));
    await ctx.close();
  }
  {
    // km_max sube y la tarifa falla despues: se dice que los ajustes SI se guardaron, se relee y se conserva lo tecleado
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true, validaKm: true, tarifaFalla: true } });
    await p.fill(campo('km_gratis'), '80'); await p.fill(campo('km_max'), '100'); await p.fill(campo('motivo'), 'Parcial inverso'); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="error"]:not(.axw-oculto)'));
    await hasta(() => llamadas(base, 'entrega_datos').length >= 2);
    await espera(p, () => document.querySelector('[data-campo="km_max"]').value === '100');
    const e = await errorTxt(p);
    ok('ajustes guardados y tarifa rechazada: dice que los ajustes si se guardaron y el mensaje de la base', e.includes('Los ajustes sí se guardaron') && e.includes('Datos de la tarifa no válidos'), e.slice(0, 200));
    ok('se relee y lo tecleado (km_gratis 80, motivo) se conserva; el km_max ya es el nuevo (100) de la base',
       llamadas(base, 'entrega_datos').length === 2 && (await p.$eval(campo('km_gratis'), x => x.value)) === '80' && (await p.$eval(campo('motivo'), x => x.value)) === 'Parcial inverso' && base.a.km_max === 100);
    await ctx.close();
  }

  // 10. el id estable sobrevive a un cambio de rotulo (nada se engancha por texto)
  {
    const { base, p, ctx } = await abre({ base: { configurada: true, conServicio: true } });
    await p.evaluate(() => { document.querySelectorAll('[data-en="raiz"] label, [data-en="raiz"] button, [data-en="raiz"] h1, [data-en="raiz"] h2, [data-en="raiz"] option, [data-en="raiz"] p').forEach(e => { if (!e.querySelector('input,select,button')) e.textContent = 'Rótulo cambiado ' + Math.random().toString(36).slice(2, 6); }); });
    await p.fill(campo('tope_dia'), '88'); await p.fill(campo('motivo'), 'Con otros rotulos');
    await p.click('[data-accion="en-guardar"]');
    await espera(p, () => document.querySelector('[data-en="exito"]:not(.axw-oculto)'));
    ok('con TODOS los rotulos cambiados el guardado sigue funcionando (data-accion / data-campo / data-en)', escritas(base).length === 1 && J(escritas(base)[0][1].p_datos) === J({ tope_dia: 88 }));
    await ctx.close();
  }

  // 11. idiomas: en traduce todo (flujos tocando todos los textos), id cae a es
  {
    const { p, ctx } = await abre({ idioma: 'en', base: { configurada: true, conServicio: true, interruptor: { fallos: 3, abierto_hasta: new Date(Date.now() + 600000).toISOString() }, recogida: null } });
    await guardar(p);
    await p.fill(campo('sede_coord'), 'xx'); await p.fill(campo('tope_dia'), '99999'); await p.fill(campo('precio_km'), '2.500'); await p.fill(campo('moneda'), 'ID'); await p.fill(campo('km_max'), '');
    await guardar(p);
    await p.fill(campo('sede_coord'), '120.5, 10.5'); await guardar(p);
    await p.fill(campo('sede_coord'), '91, 10.5'); await guardar(p);
    await p.fill(campo('sede_coord'), ''); await guardar(p);
    await p.click('[data-accion="en-descartar"]');
    await p.check(campo('activa')); await p.fill(campo('motivo'), 'Switch on'); await guardar(p);
    await p.click('[data-accion="en-modal-cerrar"]');
    const sin = await p.evaluate(() => window.__sinEn);
    ok('en ingles ninguna cadena queda sin traducir (formulario, errores, confirmacion)', sin.length === 0, J(sin.slice(0, 8)));
    ok('en ingles hay titulo y botones traducidos', (await txt(p, 'h1')) === 'Delivery' && (await txt(p, '[data-accion="en-guardar"]')) === 'Save');
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ idioma: 'en', base: { configurada: true, conServicio: true, otroGuarda: true } });
    await p.fill(campo('tope_dia'), '77'); await p.fill(campo('motivo'), 'Mine'); await guardar(p);
    await espera(p, () => document.querySelector('[data-en="conflicto"]:not(.axw-oculto)'));
    await p.click('[data-accion="en-recargar"]'); await espera(p, () => document.querySelector('[data-campo="km_max"]').value === '99');
    ok('en ingles el conflicto y la recarga tampoco dejan nada sin traducir', (await p.evaluate(() => window.__sinEn)).length === 0, J(await p.evaluate(() => window.__sinEn)));
    await ctx.close();
  }
  for (const [nombre, base] of [['no admin', { noAdmin: true }], ['sin red', { sinRed: 'entrega_datos' }], ['modulo apagado', { moduloApagado: true }]]) {
    const { p, ctx } = await abre({ idioma: 'en', base });
    ok('en ingles el estado «' + nombre + '» sale traducido', (await p.evaluate(() => window.__sinEn)).length === 0, J(await p.evaluate(() => window.__sinEn)));
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ idioma: 'id', base: { configurada: true, conServicio: true } });
    ok('con un idioma que la suite no tiene (id) la pantalla cae a espanol, sin errores de JS', (await txt(p, 'h1')) === 'Entrega' && await sinErrores(p));
    await ctx.close();
  }

  // 12. responsive y capturas
  for (const ancho of [1440, 390]) {
    const { p, ctx } = await abre({ ancho, base: { configurada: true, conServicio: true, xss: true, recogida: null } });
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(ancho + ' px · el formulario no desborda la pagina', m.sw <= m.cw, J(m));
    if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_formulario.png', fullPage: true });
    await p.check(campo('activa')); await p.fill(campo('motivo'), 'Captura'); await p.fill(campo('tope_dia'), '70'); await guardar(p);
    const dlg = await p.$eval('[data-axw="dialogo"] .axw-modal', e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: window.innerWidth, sw: e.scrollWidth, cw: e.clientWidth }; });
    ok(ancho + ' px · la confirmacion cabe en pantalla', dlg.l >= 0 && dlg.r <= dlg.w + 1 && dlg.sw <= dlg.cw + 1, J(dlg));
    if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_confirma.png' });
    await p.click('[data-accion="en-modal-cerrar"]');
    await p.fill(campo('sede_coord'), 'mal'); await guardar(p);
    const m2 = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(ancho + ' px · con errores de validacion tampoco desborda', m2.sw <= m2.cw, J(m2));
    if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_errores.png', fullPage: true });
    await ctx.close();
  }
  {
    const { p, ctx } = await abre({ ancho: 390, base: { noAdmin: true } });
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok('390 px · el aviso «solo administracion» no desborda', m.sw <= m.cw, J(m));
    if (SHOT) await p.screenshot({ path: SHOT + '_390_solo_admin.png', fullPage: true });
    await ctx.close();
  }

  await nav.close();
  console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\nTODO EN VERDE');
  process.exit(fallos ? 1 : 0);
})();
