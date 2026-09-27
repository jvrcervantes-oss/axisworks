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
  p: { '/intranet/v4/comisiones/': 'comisiones', '/intranet/v4/facturas/': 'facturas' },
  x: { t: { creatividades: 'creatividades' } },
  xp: ['/intranet/v4/creatividades/'],
};

function escenario({ activos, ruta = '/intranet/v4/home/', fallaActivos = false }) {
  const red = [];
  const clases = new Set();
  const doc = {
    readyState: 'complete',
    documentElement: { classList: { add: (c) => clases.add(c), remove: (c) => clases.delete(c) }, style: {}, appendChild() {} },
    head: { appendChild(el) { doc._hoja = el; } },
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
      return new Response(JSON.stringify(activos), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('[{"id":1}]', { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' } });
  };
  new Function(plantilla.replace('__AXW_MAPA__', JSON.stringify(MAPA)))();
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
    ok(hoja.includes('/intranet/v4/comisiones/') && !hoja.includes('/intranet/v4/facturas/') && hoja.includes('/intranet/v4/creatividades/'),
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
    const E = escenario({ activos: ['facturas'], ruta: '/intranet/v4/comisiones/' });
    ok(E.clases.has('axw-mod-pend'), 'pantalla de módulo tapada desde el primer momento');
    let arranco = false;
    globalThis.LW_AUTH = Promise.resolve({ sb: E.sb });    // lo que hace guard.js
    globalThis.LW_AUTH.then(() => { arranco = true; });
    E.publica();
    await espera(50);
    ok(!arranco, 'LW_AUTH no se resuelve en una pantalla de módulo apagado');
    ok(/no instalado/i.test(E.doc.body.innerHTML) && !E.clases.has('axw-mod-pend'), 'la pantalla dice «Módulo no instalado»');
  }

  // 4. pantalla de un módulo encendido: arranca después de saber
  {
    const E = escenario({ activos: ['facturas'], ruta: '/intranet/v4/facturas/' });
    let arranco = false;
    globalThis.LW_AUTH = Promise.resolve({ sb: E.sb });
    globalThis.LW_AUTH.then(() => { arranco = true; });
    E.publica();
    await espera(50);
    ok(arranco && !E.clases.has('axw-mod-pend') && E.doc.body.innerHTML === 'pantalla', 'módulo encendido: la pantalla arranca');
  }

  // 5. la base no contesta: cerrado, y con «Reintentar» (no «no instalado»)
  {
    const E = escenario({ fallaActivos: true, ruta: '/intranet/v4/facturas/' });
    E.publica();
    await espera(50);
    const a = await E.sb.from('facturas').select('*');
    ok(a.data.length === 0, 'sin poder mirar: lo de módulo cerrado');
    ok(/Reintentar/.test(E.doc.body.innerHTML) && !/no instalado/i.test(E.doc.body.innerHTML), 'fallo ≠ no instalado: ofrece reintentar');
  }

  console.log('OK apagados_instancia: ' + n + '/' + n);
})().catch((e) => { console.error('FALLA', e.message); process.exit(1); });
