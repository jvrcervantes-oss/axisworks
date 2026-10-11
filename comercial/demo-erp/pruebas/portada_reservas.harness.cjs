// node comercial/demo-erp/pruebas/portada_reservas.harness.cjs [captura_prefijo]
// Harness de la portada de las instancias de tipo Reservas (11-oct-2026): portada_reservas.html REAL (con las ayudas comunes de _compartido/ pegadas como hace build.py) en Chromium,
// con la base y la sesión SIMULADAS: una base en memoria que imita portada_reservas_dia_datos tal como la acordó Backend (dia, entregas, devoluciones, pago_estado). Mide el
// COMPORTAMIENTO: qué pide y con qué día, qué pinta con cada respuesta, XSS por modelo/unidad/cliente/direcciones, vacío ≠ sin permiso ≠ no disponible ≠ respuesta rara,
// la ficha al tocar, ES/EN/ID sin textos sin traducir y que a 390 px no hay scroll horizontal.
// OJO: la base real NO se ha tocado: prueba la pantalla contra la firma acordada, no contra Postgres.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const COMUN_JS = fs.readFileSync(path.join(__dirname, '..', '_compartido', 'pantalla_comun.js'), 'utf8').trim();
const COMUN_CSS = fs.readFileSync(path.join(__dirname, '..', '_compartido', 'pantalla_comun.css'), 'utf8').trim();
const FUENTE = fs.readFileSync(path.join(__dirname, '..', 'portada_reservas.html'), 'utf8');
const [MARCADO0, SCRIPT0] = FUENTE.split('<!--AXW_SCRIPT-->');
const MARCADO = MARCADO0.split('/*AXW_COMUN_CSS*/').join(COMUN_CSS);
const SCRIPT = SCRIPT0.split('/*AXW_COMUN_JS*/').join(COMUN_JS);
const SHOT = process.argv[2];
let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' -> ' + extra : '')); } else console.log('ok     ' + nombre); };

const XSS_MODELO = `Honda <b>"Vario"</b> 160 <svg onload="window.__xss=1">`;
const XSS_CLIENTE = `"><img src=x onerror="window.__xss=2"> O'Brien <script>window.__xss=3</script>`;
const XSS_DIR = `Jl. <img src=x onerror="window.__xss=4"> 'q' "d"`;
const HOY = '2026-10-12';
function suma(s, n) { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

function nuevaBase(o = {}) {
  const reservas = [
    { id: 'r1', numero_reserva: 'RP-00001', estado: 'confirmada', desde: HOY, hasta: suma(HOY, 3), hora: null, producto: XSS_MODELO, unidad: 'DK 1234 AB', cliente: XSS_CLIENTE,
      entrega_direccion: XSS_DIR, recogida_direccion: null, precio_total: 450000, moneda: 'IDR', pago_estado: 'pagado' },
    { id: 'r2', numero_reserva: 'RP-00002', estado: 'bloqueo', desde: HOY, hasta: suma(HOY, 7), hora: null, producto: 'Yamaha NMAX 155', unidad: 'DK 5678 CD', cliente: 'Ana Pérez',
      entrega_direccion: null, recogida_direccion: null, precio_total: 1050000, moneda: 'IDR', pago_estado: 'pendiente' },
    { id: 'r3', numero_reserva: 'RP-00003', estado: 'en_curso', desde: suma(HOY, -5), hasta: HOY, hora: '10:30', producto: 'Honda Scoopy', unidad: 'DK 9 EF', cliente: null,
      entrega_direccion: null, recogida_direccion: 'Canggu', precio_total: 500000, moneda: 'IDR', pago_estado: 'registrado' }
  ];
  return { llamadas: [], o, reservas };
}
const err = (code, message, hint) => ({ data: null, error: { code, message, hint: hint || null, details: null } });
async function servidor(b, nombre, a) {
  b.llamadas.push([nombre, JSON.parse(JSON.stringify(a))]);
  const o = b.o;
  if (o.noDisponible) return err('PGRST202', 'Could not find the function public.' + nombre + ' in the schema cache');
  if (o.moduloApagado) return err('42501', nombre + ': módulo no activo', 'modulo_apagado');
  if (o.sinPermiso) return err('42501', nombre + ': sin acceso');
  if (o.sinRed) return { data: null, error: { message: 'Failed to fetch' } };
  if (nombre !== 'portada_reservas_dia_datos') return err('42883', 'funcion desconocida ' + nombre);
  if (o.datosRaros) return { data: { dia: HOY, entregas: 'nada' }, error: null };
  const dia = a.p_dia || HOY;
  const vivas = o.vacio ? [] : b.reservas;
  return { data: { dia, entregas: JSON.parse(JSON.stringify(vivas.filter(x => x.desde === dia))), devoluciones: JSON.parse(JSON.stringify(vivas.filter(x => x.hasta === dia))) }, error: null };
}

const pagina = (idioma, ficha) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title></head><body>
${MARCADO}
<script>
window.__xss = undefined; window.__fromLlamado = 0; window.__fetchLlamado = 0; window.__sinTrad = []; window.__errores = [];
window.fetch = function () { window.__fetchLlamado++; return Promise.reject(new Error('fetch')); };
var sb = {
  rpc: function (n, a) { return { then: function (f, g) { return window.__srv(n, a || {}).then(f, g); } }; },
  from: function () { window.__fromLlamado++; throw new Error('el navegador no toca la base'); },
  auth: { getSession: function () { return Promise.resolve({ data: { session: { access_token: 'JWT' } } }); } }
};
window.LW_AUTH = Promise.resolve({ sb: sb, ficha: ${JSON.stringify(ficha)} });
window.lwDatos = function (n, a) { return Promise.resolve(sb.rpc(n, a)).then(function (r) { return { data: r.data, error: r.error }; }); };
window.LW_IDIOMA = '${idioma}';
window.LW_EN = {};
if ('${idioma}' === 'id') window.LW_ID = {};
window.lwLocale = function () { return window.LW_IDIOMA === 'en' ? 'en-GB' : window.LW_IDIOMA === 'id' ? 'id-ID' : 'es-ES'; };
window.lwT = function (s) {
  s = String(s);
  var d = window.LW_IDIOMA === 'en' ? window.LW_EN : window.LW_IDIOMA === 'id' ? window.LW_ID : null;
  if (d) { if (Object.prototype.hasOwnProperty.call(d, s)) return d[s]; if (!/^[\\s\u2014\u00b70-9.,%():()]*$/.test(s)) window.__sinTrad.push(s); }
  return s;
};
window.lwIdiomaAplicar = function (raiz) { Array.prototype.forEach.call(raiz.querySelectorAll('[data-lwt]'), function (e) { e.textContent = window.lwT(e.textContent); }); };
window.onerror = function (m) { window.__errores.push(String(m)); };
</script>
<script>${SCRIPT.replace(/<\/?script>/g, '')}</script></body></html>`;

// Con PAQUETE=<carpeta de un build de la instancia> (revisión previa de Calidad, 12-oct): la misma portada con el idioma.js y el i18n.js REALES de ese paquete (los que
// parchea build.py --instancia con "idiomas"), no un sustituto. Así se mide el lwT de verdad: cero frases en español (LW_T_ESPANOL) y ni una tilde en la interfaz.
const PAQUETE = process.env.PAQUETE;
const paginaReal = () => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t · Inicio</title>
<script>${fs.readFileSync(path.join(PAQUETE, 'contracts', 'assets', 'idioma.js'), 'utf8')}</script>
<script>${fs.readFileSync(path.join(PAQUETE, 'contracts', 'assets', 'i18n.js'), 'utf8')}</script></head><body>
${MARCADO}
<script>
window.__xss = undefined; window.__fromLlamado = 0; window.__fetchLlamado = 0; window.__errores = [];
window.fetch = function () { window.__fetchLlamado++; return Promise.reject(new Error('fetch')); };
var sb = { rpc: function (n, a) { return { then: function (f, g) { return window.__srv(n, a || {}).then(f, g); } }; }, from: function () { throw new Error('no'); } };
window.LW_AUTH = Promise.resolve({ sb: sb, ficha: { rol: 'agente', herramientas: ['reservas-producto'] } });
window.lwDatos = function (n, a) { return Promise.resolve(sb.rpc(n, a)).then(function (r) { return { data: r.data, error: r.error }; }); };
window.onerror = function (m) { window.__errores.push(String(m)); };
</script>
<script>${SCRIPT.replace(/<\/?script>/g, '')}</script></body></html>`;
const TILDES = /[áéíóúñÁÉÍÓÚÑ¿¡]/;

(async () => {
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const nav = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  async function abre(opts = {}) {
    const base = nuevaBase(opts.base || {});
    const ctx = await nav.newContext({ viewport: { width: opts.ancho || 1440, height: 1000 } });
    const p = await ctx.newPage();
    await p.exposeFunction('__srv', (n, a) => servidor(base, n, a));
    await p.setContent(pagina(opts.idioma || 'es', opts.ficha || { rol: 'agente', herramientas: ['reservas-producto'] }), { waitUntil: 'load' });
    await espera(p, () => { const t = document.querySelector('[data-ph="estado-entregas"]').textContent; return !/Cargando|Loading|Memuat/.test(t) && (document.querySelector('[data-ph="n-entregas"]').textContent !== '' || t !== ''); });
    return { base, p, ctx };
  }
  const espera = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: 5000 });
  const txt = (p, sel) => p.$eval(sel, e => e.textContent);
  const sinInyeccion = async p => (await p.$$('[data-ph="raiz"] img, [data-ph="raiz"] svg, [data-ph="raiz"] script')).length === 0 && (await p.evaluate(() => window.__xss)) === undefined;
  try {
    // 1. un día con reservas
    let { base, p, ctx } = await abre();
    ok('pide el día a la base sin decidirlo el navegador (p_dia null)', base.llamadas.length === 1 && base.llamadas[0][0] === 'portada_reservas_dia_datos' && base.llamadas[0][1].p_dia === null);
    ok('dos entregas y una devolución', (await p.$$('[data-ph="entregas"] li')).length === 2 && (await p.$$('[data-ph="devoluciones"] li')).length === 1);
    ok('cuentas en las cabeceras', (await txt(p, '[data-ph="n-entregas"]')) === '(2)' && (await txt(p, '[data-ph="n-devoluciones"]')) === '(1)');
    const e1 = await txt(p, '[data-ph="entregas"] li:nth-child(1)');
    ok('fila: modelo, matrícula, cliente y pago en texto', e1.includes('Honda <b>"Vario"</b> 160') && e1.includes('DK 1234 AB') && e1.includes("O'Brien") && e1.includes('Pagado'));
    const e2 = await txt(p, '[data-ph="entregas"] li:nth-child(2)');
    ok('pendiente de pago y sin confirmar se dicen con texto', e2.includes('Pendiente de pago') && e2.includes('Sin confirmar'));
    ok('el tono del chip sale del estado que da la base', (await p.$eval('[data-ph="entregas"] li:nth-child(1) .axw-chip', e => e.getAttribute('data-tono'))) === 'ok'
       && (await p.$eval('[data-ph="entregas"] li:nth-child(2) .axw-chip', e => e.getAttribute('data-tono'))) === 'mal');
    const d1 = await txt(p, '[data-ph="devoluciones"] li');
    ok('devolución: registrado sin confirmar, sin cliente y la hora solo si llega', d1.includes('Pago registrado, sin confirmar') && d1.includes('Sin cliente') && d1.includes('10:30'));
    ok('sin hora no se pinta «Hora»', !e1.includes('Hora'));
    ok('el título dice Hoy', (await txt(p, '[data-ph="titulo"]')) === 'Hoy');
    ok('XSS: nada de lo que viene de la base se interpreta', await sinInyeccion(p));
    // la ficha al tocar
    await p.click('[data-ph="entregas"] li:nth-child(1) button');
    await espera(p, () => !!document.querySelector('[data-axw="dialogo"]'));
    const fic = await txt(p, '[data-axw="dialogo"]');
    ok('tocar abre la ficha con número, modelo, pago, precio y dirección', fic.includes('RP-00001') && fic.includes('Pagado') && fic.includes('450.000') && fic.includes('Jl. <img'));
    ok('XSS en la ficha', await sinInyeccion(p));
    await p.click('[data-axw="dialogo"] [data-accion="ph-cerrar"]');
    ok('cerrar quita la ficha', !(await p.$('[data-axw="dialogo"]')));
    ok('con la herramienta, el enlace a Reservas de producto se ofrece', await p.$eval('[data-ph="ir-reservas"]', e => !e.classList.contains('axw-oculto')));
    // día siguiente
    await p.click('[data-accion="ph-despues"]');
    await espera(p, () => document.querySelector('[data-ph="estado-entregas"]').textContent.includes('Este día'));
    ok('día siguiente: pide HOY+1 y dice «Este día no hay entregas.»', base.llamadas[base.llamadas.length - 1][1].p_dia === suma(HOY, 1) && (await txt(p, '[data-ph="titulo"]')) !== 'Hoy');
    await p.click('[data-accion="ph-hoy"]');
    await espera(p, () => document.querySelector('[data-ph="titulo"]').textContent === 'Hoy');
    ok('Hoy vuelve a pedir sin día', base.llamadas[base.llamadas.length - 1][1].p_dia === null);
    ok('el navegador no tocó tablas ni fetch, sin errores de script', (await p.evaluate(() => window.__fromLlamado + window.__fetchLlamado)) === 0 && (await p.evaluate(() => window.__errores.length)) === 0);
    await ctx.close();

    // 1b. sin la herramienta: la portada se ve (es el inicio), pero no se ofrece el enlace a una pantalla que la base le negaría
    ({ p, ctx } = await abre({ ficha: { rol: 'agente', herramientas: ['taller'] } }));
    ok('sin la herramienta, el enlace de la cabecera está oculto', await p.$eval('[data-ph="ir-reservas"]', e => e.classList.contains('axw-oculto')));
    await p.click('[data-ph="entregas"] li:nth-child(1) button');
    await espera(p, () => !!document.querySelector('[data-axw="dialogo"]'));
    ok('sin la herramienta, la ficha no ofrece el enlace', !(await p.$('[data-axw="dialogo"] a')));
    await ctx.close();

    // 2. estados: vacío ≠ sin permiso ≠ módulo apagado ≠ no disponible ≠ raro ≠ sin red
    const casos = [
      ['vacio', 'Hoy no hay entregas.', 'axw-vacio'], ['sinPermiso', 'No tienes permiso para ver las reservas', 'axw-error'],
      ['moduloApagado', 'Esto NO quiere decir que no haya nada', 'axw-error'], ['noDisponible', 'todavía no está disponible', 'axw-error'],
      ['datosRaros', 'no se ha podido mirar', 'axw-error'], ['sinRed', 'La base no ha respondido', 'axw-error']];
    for (const [k, frase, clase] of casos) {
      ({ p, ctx } = await abre({ base: { [k]: true } }));
      const t = await txt(p, '[data-ph="estado-entregas"]');
      const c = await p.$eval('[data-ph="estado-entregas"]', e => e.className);
      ok('estado ' + k + ': «' + frase + '»', t.includes(frase) && c === clase, t);
      await ctx.close();
    }

    // 3. idiomas: inglés e indonesio sin textos sin traducir (la portada entera y la ficha)
    for (const idioma of ['en', 'id']) {
      ({ p, ctx } = await abre({ idioma }));
      await p.click('[data-ph="entregas"] li:nth-child(1) button');
      await espera(p, () => !!document.querySelector('[data-axw="dialogo"]'));
      const sin = await p.evaluate(() => Array.from(new Set(window.__sinTrad)));
      ok(idioma + ': todo lo que pinta tiene traducción', sin.length === 0, sin.join(' | '));
      ok(idioma + ': el título ya no está en español', (await txt(p, '[data-ph="titulo"]')) !== 'Hoy');
      await ctx.close();
    }

    // 4. 390 y 1440: sin scroll horizontal (con el indonesio, que alarga)
    for (const ancho of [390, 1440]) {
      ({ p, ctx } = await abre({ ancho, idioma: 'id' }));
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      ok(ancho + ' px: sin scroll horizontal', m.sw <= m.cw, JSON.stringify(m));
      if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_id.png', fullPage: true });
      await p.click('[data-ph="entregas"] li:nth-child(1) button');
      await espera(p, () => !!document.querySelector('[data-axw="dialogo"]'));
      const dlg = await p.$eval('[data-axw="dialogo"] .axw-modal', e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: window.innerWidth }; });
      ok(ancho + ' px: la ficha cabe en la pantalla', dlg.l >= 0 && dlg.r <= dlg.w, JSON.stringify(dlg));
      if (SHOT) await p.screenshot({ path: SHOT + '_' + ancho + '_ficha.png' });
      await ctx.close();
    }
    // 5. con el i18n.js REAL del paquete de la instancia (solo si se pasa PAQUETE): indonesio sin español, en cuatro tamaños y con barras de scroll visibles
    if (PAQUETE) {
      const nav2 = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, ignoreDefaultArgs: ['--hide-scrollbars'] });
      try {
        for (const [w, hgt] of [[390, 844], [1440, 900], [1366, 640], [1280, 720]]) {
          const base = nuevaBase({});
          base.reservas.forEach(x => { x.producto = 'Honda Vario 160'; x.cliente = x.cliente ? 'Made Wirawan' : null; x.entrega_direccion = 'Jl. Raya Canggu 12'; });
          const ctx2 = await nav2.newContext({ viewport: { width: w, height: hgt } });
          const p2 = await ctx2.newPage();
          await p2.exposeFunction('__srv', (n, a) => servidor(base, n, a));
          await p2.setContent(paginaReal(), { waitUntil: 'load' });
          await espera(p2, () => { const t = document.querySelector('[data-ph="estado-entregas"]').textContent; return !/Cargando|Loading|Memuat/.test(t) && document.querySelector('[data-ph="n-entregas"]').textContent !== ''; });
          await p2.click('[data-ph="entregas"] li:nth-child(1) button');
          await espera(p2, () => !!document.querySelector('[data-axw="dialogo"]'));
          const m = await p2.evaluate(() => ({ idioma: window.LW_IDIOMA, lang: document.documentElement.lang, espanol: Array.from(window.LW_T_ESPANOL || []), caida: Array.from(window.LW_T_CAIDA_EN || []),
            texto: document.querySelector('[data-ph="raiz"]').innerText, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, errores: window.__errores }));
          ok(w + 'x' + hgt + ' real: arranca en indonesio con lang="id"', m.idioma === 'id' && m.lang === 'id', JSON.stringify([m.idioma, m.lang]));
          ok(w + 'x' + hgt + ' real: ninguna frase sale en español (LW_T_ESPANOL vacío)', m.espanol.length === 0, m.espanol.join(' | '));
          ok(w + 'x' + hgt + ' real: ni una tilde ni ¿¡ en la interfaz', !TILDES.test(m.texto), (m.texto.match(/.{0,20}[áéíóúñÁÉÍÓÚÑ¿¡].{0,20}/) || [''])[0]);
          ok(w + 'x' + hgt + ' real: sin scroll horizontal con barras visibles y sin errores', m.sw <= m.cw && m.errores.length === 0, JSON.stringify([m.sw, m.cw, m.errores]));
          if (m.caida.length) console.log('       (cae a inglés: ' + m.caida.join(' | ') + ')');
          if (SHOT) await p2.screenshot({ path: SHOT + '_real_' + w + 'x' + hgt + '.png', fullPage: true });
          if (w === 390) {
            // control: el barrido de tildes TIENE que cazar un texto en español sembrado (si no, su verde no vale nada)
            const cazado = await p2.evaluate(re => { const s = document.createElement('span'); s.textContent = 'Devolución sin confirmar'; document.querySelector('[data-ph="raiz"]').appendChild(s);
              const r = new RegExp(re).test(document.querySelector('[data-ph="raiz"]').innerText); s.remove(); return r; }, TILDES.source);
            ok('control: el barrido de tildes caza un texto en español sembrado', cazado);
          }
          await ctx2.close();
        }
      } finally {
        await nav2.close();
      }
    }
  } finally {
    await nav.close();
  }
  console.log(fallos ? fallos + ' FALLO(S)' : 'TODO BIEN');
  process.exit(fallos ? 1 : 0);
})();
