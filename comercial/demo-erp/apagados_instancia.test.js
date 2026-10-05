// Prueba de apagados_instancia.js (panel de control, 28-sep-2026): node apagados_instancia.test.js
// Con el supabase-js REAL (misma versión que cargan las pantallas: devDependency) sobre una red falsa que anota cada
// petición. Así se prueba lo que la revisión previa #138 (Des #1) pedía: .single(), .maybeSingle(), count/head,
// cadenas y storage contra las respuestas sintéticas, no contra un cliente de juguete.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');

const plantilla = fs.readFileSync(path.join(__dirname, 'apagados_instancia.js'), 'utf8');
const SB = 'https://abcdefghijabcdefghij.supabase.co';
const MAPA = {
  t: { comisiones_devengadas: 'comisiones', facturas: 'facturas' },
  f: { reserva_vence_el: 'reservas' },
  b: { obra: 'obra' },
  e: { 'avisos-manager': 'contratos' },
  p: { '/comisiones/': 'comisiones', '/facturas/': 'facturas' },
  x: { t: { creatividades: 'creatividades' } },
  xp: ['/creatividades/'],
  n: { comisiones: ['Comisiones', 'Lo que se debe a cada comercial.'], facturas: ['Fact<b>"uras', ''] },
};
// La plantilla real (no_instalado.html) con sus huecos: la de verdad la pone build.py
const PLANTILLA = fs.readFileSync(path.join(__dirname, 'no_instalado.html'), 'utf8')
  .replace(/<!--[\s\S]*?-->\s*/g, '').replace('{{marca}}', 'Prueba ERP').replace('{{sello}}', '<svg></svg>');

function escenario({ activos, ruta = '/home/', fallaActivos = false }) {
  const red = [];
  const clases = new Set();
  const doc = {
    readyState: 'complete',
    documentElement: { classList: { add: (c) => clases.add(c), remove: (c) => clases.delete(c) }, style: {}, appendChild() {} },
    head: { appendChild(el) { if (el.id === 'axw-modulos') doc._hoja = el; } },
    title: '',
    body: { innerHTML: 'pantalla' },
    createElement: () => ({}),
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener() {},
  };
  global.document = doc;
  global.location = { pathname: ruta, href: 'https://erp.test' + ruta };
  global.MutationObserver = class { observe() {} };
  global.console = Object.assign(Object.create(console), { info() {}, warn() {} });
  global.window = globalThis;
  delete globalThis.LW_SB;
  delete globalThis.LW_AUTH;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    red.push(url.replace(SB, ''));
    if (url.includes('/rpc/modulos_activos_datos')) {
      if (fallaActivos) return new Response(JSON.stringify({ message: 'caída' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ activos }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('[{"id":1}]', { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' } });
  };
  new Function(plantilla.replace('__AXW_MAPA__', JSON.stringify(MAPA)).replace('__AXW_NO_INSTALADO__', JSON.stringify(PLANTILLA)))();
  const sb = createClient(SB, 'sb_publishable_x', { auth: { persistSession: false, autoRefreshToken: false } });
  sb.auth.getSession = async () => ({ data: { session: { access_token: 't' } }, error: null });
  return { sb, red, clases, doc, publica: () => { globalThis.LW_SB = sb; } };
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let n = 0;
  const ok = (c, m) => { assert.ok(c, m); n++; };

  // 1. comisiones apagada, facturas encendida
  {
    const E = escenario({ activos: ['facturas'] });
    // el núcleo no espera a saber los módulos (aún no hay cliente publicado)
    const nucleo = await E.sb.rpc('es_admin');
    ok(nucleo.data && E.red.includes('/rest/v1/rpc/es_admin'), 'el núcleo sale sin esperar');
    E.publica();
    const a = await E.sb.from('comisiones_devengadas').select('id').eq('x', 1).in('y', [1]).order('z');
    ok(Array.isArray(a.data) && a.data.length === 0 && a.error === null, 'tabla apagada: [] sin error');
    const b = await E.sb.from('comisiones_devengadas').select('id').maybeSingle();
    ok(b.data === null && b.error === null, 'maybeSingle apagada: null sin error');
    const c = await E.sb.from('comisiones_devengadas').select('id').single();
    ok(c.data === null && c.error && c.error.code === 'PGRST116', 'single apagada: PGRST116 como la RLS vacía');
    const d = await E.sb.from('comisiones_devengadas').select('*', { count: 'exact', head: true });
    ok(d.count === 0 && !d.error, 'count/head apagada: 0');
    const e = await E.sb.rpc('reserva_vence_el', { p: 1 });
    ok(e.data === null && !e.error, 'función apagada: null');
    const f = await E.sb.storage.from('obra').createSignedUrl('a.jpg', 60);
    ok(f.error, 'bucket apagado: error');
    const g = await fetch(SB + '/functions/v1/avisos-manager', { method: 'POST' });
    ok(g.status === 404, 'edge apagada: 404');
    const apagadas = E.red.filter((u) => /comisiones_devengadas|reserva_vence_el|obra|avisos-manager/.test(u));
    ok(apagadas.length === 0, 'lo apagado no sale a la red: ' + apagadas.join(','));
    const h = await E.sb.from('facturas').select('id');
    ok(h.data && h.data.length === 1 && E.red.some((u) => u.startsWith('/rest/v1/facturas')), 'tabla encendida sale a la red');
    const hoja = E.doc._hoja.textContent;
    ok(hoja.includes('/comisiones/') && !hoja.includes('/facturas/') && hoja.includes('/creatividades/'),
      'menú: se destapa lo encendido, lo apagado y lo no portado siguen ocultos');
    ok(E.red.filter((u) => u.includes('modulos_activos_datos')).length === 1, 'una sola petición de módulos por página');
  }

  // 2. no portado: siempre apagado aunque la base diga todo encendido
  {
    const E = escenario({ activos: null });
    E.publica();
    const a = await E.sb.from('creatividades').select('*');
    ok(a.data.length === 0 && !E.red.some((u) => u.includes('creatividades')), 'apagados_extra: siempre apagado');
    const b = await E.sb.from('comisiones_devengadas').select('*');
    ok(b.data.length === 1, 'sin modulos_activos = todo encendido');
  }

  // 3. pantalla de un módulo apagado: no arranca y dice «no instalado»
  {
    const E = escenario({ activos: ['facturas'], ruta: '/comisiones/' });
    ok(E.clases.has('axw-mod-pend'), 'pantalla de módulo tapada desde el primer momento');
    let arranco = false;
    globalThis.LW_AUTH = Promise.resolve({ sb: E.sb });    // lo que hace guard.js
    globalThis.LW_AUTH.then(() => { arranco = true; });
    E.publica();
    await espera(50);
    ok(!arranco, 'LW_AUTH no se resuelve en una pantalla de módulo apagado');
    ok(/no instalado/i.test(E.doc.body.innerHTML) && !E.clases.has('axw-mod-pend'), 'la pantalla dice «Módulo no instalado»');
    const b = E.doc.body.innerHTML;
    ok(b.includes('«Comisiones» no está activo') && b.includes('Lo que se debe a cada comercial.'), 'dice qué módulo y qué hace');
    ok(b.includes('mailto:hello@axisworks.studio?subject=Activar%20m%C3%B3dulo%3A%20Comisiones') && b.includes('https://axisworks.studio'),
      'bloque de AxisWorks con correo (asunto por módulo) y web');
    ok(!/\{\{/.test(b) && /<span\s+hidden><button type="button" id="axw-reintenta"/.test(b) && E.doc.title === 'Módulo no instalado', 'sin huecos sin rellenar; sin «Reintentar»');
  }

  // 4. pantalla de un módulo encendido: arranca después de saber
  {
    const E = escenario({ activos: ['facturas'], ruta: '/facturas/' });
    let arranco = false;
    globalThis.LW_AUTH = Promise.resolve({ sb: E.sb });
    globalThis.LW_AUTH.then(() => { arranco = true; });
    E.publica();
    await espera(50);
    ok(arranco && !E.clases.has('axw-mod-pend') && E.doc.body.innerHTML === 'pantalla', 'módulo encendido: la pantalla arranca');
  }

  // 5. la base no contesta: cerrado, y con «Reintentar» (no «no instalado»)
  {
    const E = escenario({ fallaActivos: true, ruta: '/facturas/' });
    E.publica();
    await espera(50);
    const a = await E.sb.from('facturas').select('*');
    ok(a.data.length === 0, 'sin poder mirar: lo de módulo cerrado');
    ok(/Reintentar/.test(E.doc.body.innerHTML) && !/no instalado/i.test(E.doc.body.innerHTML), 'fallo ≠ no instalado: ofrece reintentar');
    ok(/aria-label="Cómo activarlo"\s+hidden/.test(E.doc.body.innerHTML) && !/<span\s+hidden><button type="button" id="axw-reintenta"/.test(E.doc.body.innerHTML),
      'fallo: sin bloque de contacto (no es que falte el módulo) y con el botón visible');
  }

  // 6. lo que se rellena va escapado (el nombre sale de un JSON, pero la plantilla va por innerHTML)
  {
    const E = escenario({ activos: [], ruta: '/facturas/' });
    E.publica();
    await espera(50);
    const b = E.doc.body.innerHTML;
    ok(b.includes('«Fact&lt;b&gt;&quot;uras»') && !b.includes('<b>"'), 'nombre escapado');
    ok(/<p [^>]*mt-2"\s+hidden>/.test(b), 'sin «qué hace»: su línea queda oculta');
  }

  // 7. helper de guardas (desacople núcleo comercial, subtarea 2.0): (a) Lawang, (b) maestro, (c) carga y fallo
  {
    // (a) Lawang no lleva el fichero: no hay helper, y el idioma de la guarda cae a true para cualquier módulo
    delete globalThis.axwModuloActivo; delete globalThis.AXW_MODULOS_LISTOS;
    const guarda = (m) => (globalThis.axwModuloActivo ? globalThis.axwModuloActivo(m) : true);
    ok(guarda('contratos') === true && guarda('lo_que_sea') === true, '(a) sin el fichero (Lawang): siempre true');

    // (c) antes de saber: true (no esconde), aunque luego resulte apagado
    const E = escenario({ activos: ['facturas'] });
    ok(typeof globalThis.axwModuloActivo === 'function' && globalThis.AXW_MODULOS_LISTOS && typeof globalThis.AXW_MODULOS_LISTOS.then === 'function', 'el fichero exporta helper y promesa');
    ok(globalThis.axwModuloActivo('comisiones') === true, '(c) cargando: true, no lee «todo apagado»');
    ok(globalThis.axwModuloActivo('base') === true, 'base siempre true');
    E.publica();
    ok(await globalThis.AXW_MODULOS_LISTOS === true, '(c) la promesa de listo resuelve true al saberse');
    // (b) ya sabido: refleja lo realmente activo
    ok(globalThis.axwModuloActivo('facturas') === true && globalThis.axwModuloActivo('comisiones') === false, '(b) activo true / apagado false');
    ok(globalThis.axwModuloActivo('base') === true, '(b) base true');

    // (b) sin modulos_activos = todo encendido
    const T = escenario({ activos: null });
    T.publica();
    await globalThis.AXW_MODULOS_LISTOS;
    ok(globalThis.axwModuloActivo('comisiones') === true, '(b) todos encendidos: true');

    // (c) si la comprobación falla: la promesa resuelve false y la guarda sigue abierta (no esconde por un fallo de red)
    const F = escenario({ fallaActivos: true });
    F.publica();
    ok(await globalThis.AXW_MODULOS_LISTOS === false, '(c) fallo: la promesa resuelve false, no se queda colgada');
    ok(globalThis.axwModuloActivo('comisiones') === true, '(c) fallo: la guarda no esconde');
  }

  console.log('OK apagados_instancia: ' + n + '/' + n);
})().catch((e) => { console.error('FALLA', e.message); process.exit(1); });
