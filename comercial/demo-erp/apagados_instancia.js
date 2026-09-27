/* Módulos de esta instancia del ERP, decididos AL CARGAR — panel de control, 28-sep-2026
   (encargos/20260928_erp_panel_control_modulos.md, revisión previa #138). Sustituye a la versión del 25-sep (F4), que
   llevaba grabada en el build la lista de lo apagado: ahora los módulos se encienden y apagan desde
   erp.axisworks.studio/panel/ sin volver a construir, así que el navegador pregunta a la base qué está activo.

   build.py --instancia lo antepone a /contracts/assets/guard.js con el mapa objeto → módulo de TODOS los módulos (dato
   del registro, erp/modulos.json). Va siempre en las instancias del ERP (la instancia de origen no lo lleva).

   NO ES EL CANDADO. El candado está en la base (políticas restrictivas y permisos por módulo, erp_aplica_modulos): quien
   llame a la API a mano se encuentra la puerta cerrada igual. Esto es para que las pantallas activas no pidan lo que la
   base ya no les da, y para no enseñar pantallas ni enlaces de módulos apagados.

   Cómo, cada decisión con su porqué:
   · Se intercepta `fetch` y se clasifica por URL (/rest/v1/<tabla>, /rest/v1/rpc/<función>, /storage/v1/…/<bucket>,
     /functions/v1/<edge>), no se graba la cadena de supabase-js (Des #1): los builders mutan y devuelven `this`, y un
     grabador que imite .single()/.maybeSingle()/count/head se equivoca en silencio. Así también se cubren las edges que
     guard.js pide con fetch directo.
   · Lo del núcleo pasa sin esperar. Lo de un módulo espera a saber los activos (una sola petición por página).
   · Apagado = respuesta sintética como la de PostgREST con la RLS vacía: 200 [] (Content-Range con total 0), 406 PGRST116 si se
     pidió un objeto, null en una función, error en storage, 404 en una edge. Sin salir a la red.
   · Los activos se piden con sesión (`sb.rpc('modulos_activos_datos')`, literal: erp/contrato_front.py exige que exista
     en la base) y un fallo NO se guarda: la página enseña «No se pudo comprobar los módulos · Reintentar», distinto de
     «Módulo no instalado», y todo lo de módulo se trata como apagado (falla cerrado) (Des #2).
   · Sin parpadeo (Des #3): una hoja con !important oculta desde el primer momento los enlaces de TODOS los módulos y,
     si la página es de un módulo, la página entera; al llegar los activos se destapa lo encendido. `window.LW_AUTH`
     (la promesa de guard.js que esperan las pantallas) no se resuelve en una pantalla de módulo apagado: su código no
     arranca contra una página sustituida.
   · `x` (apagados_extra del registro): objetos que esta base no tiene porque no se portaron. Siempre apagados.
   · Realtime (sb.channel) no pasa por fetch: no cubierto. La política restrictiva ya no emite eventos. */
(function () {
  var M = __AXW_MAPA__;
  window.AXW_MAPA_MODULOS = M;
  var raiz = document.documentElement;

  var estado = { listo: false, activos: null, error: null };   // activos: {modulo: true} o 'todos'
  var avisaListo;
  var pListo = new Promise(function (r) { avisaListo = r; });

  function activo(mod) {
    if (!mod || mod === 'base') return true;
    if (estado.error || !estado.listo) return false;
    return estado.activos === 'todos' || !!estado.activos[mod];
  }

  // ── la pantalla actual ──────────────────────────────────────────────────────────────────────
  function moduloDeRuta(ruta) {
    var mejor = null, largo = 0;
    for (var p in M.p) if (ruta.indexOf(p) === 0 && p.length > largo) { mejor = M.p[p]; largo = p.length; }
    return mejor;
  }
  function esExtraRuta(ruta) {
    for (var i = 0; i < (M.xp || []).length; i++) if (ruta.indexOf(M.xp[i]) === 0) return true;
    return false;
  }
  var RUTA = location.pathname;
  var MOD_PAGINA = esExtraRuta(RUTA) ? '(no portado)' : moduloDeRuta(RUTA);

  // ── hoja: todo lo de módulo tapado hasta saber ──────────────────────────────────────────────
  var hoja = document.createElement('style');
  hoja.id = 'axw-modulos';
  function reglas(prefijos) {
    return prefijos.map(function (p) { return 'a[href^="' + p.replace(/"/g, '') + '"]{display:none!important}'; }).join('\n');
  }
  var todosPrefijos = Object.keys(M.p).concat(M.xp || []);
  hoja.textContent = reglas(todosPrefijos) + (MOD_PAGINA ? '\nhtml.axw-mod-pend{visibility:hidden!important}' : '');
  (document.head || raiz).appendChild(hoja);
  if (MOD_PAGINA) raiz.classList.add('axw-mod-pend');

  // ── fetch ───────────────────────────────────────────────────────────────────────────────────
  var vistos = {};
  function rastro(tipo, n, mod) {
    if (vistos[tipo + n]) return;
    vistos[tipo + n] = 1;
    try { console.info('[axw] módulo apagado: ' + tipo + ' ' + n + ' (' + mod + ')'); } catch (e) {}
  }
  function clasifica(url) {
    var u;
    try { u = new URL(url, location.href); } catch (e) { return null; }
    if (!/\.supabase\.co$/.test(u.hostname)) return null;
    var p = u.pathname, m;
    if ((m = /^\/rest\/v1\/rpc\/([^/]+)/.exec(p))) return { tipo: 'f', n: decodeURIComponent(m[1]) };
    if ((m = /^\/rest\/v1\/([^/]+)/.exec(p))) return { tipo: 't', n: decodeURIComponent(m[1]) };
    if ((m = /^\/functions\/v1\/([^/]+)/.exec(p))) return { tipo: 'e', n: decodeURIComponent(m[1]) };
    if ((m = /^\/storage\/v1\/object\/(?:(?:public|sign|authenticated|info|list|upload\/sign)\/)?([^/]+)/.exec(p))) {
      if (m[1] === 'move' || m[1] === 'copy') return null;   // el bucket va en el cuerpo: pasa (la base lo cierra igual)
      return { tipo: 'b', n: decodeURIComponent(m[1]) };
    }
    return null;
  }
  function cabecera(input, init, nombre) {
    var h = (init && init.headers) || (input && input.headers);
    if (!h) return '';
    if (typeof h.get === 'function') return h.get(nombre) || '';
    if (Array.isArray(h)) { for (var i = 0; i < h.length; i++) if (String(h[i][0]).toLowerCase() === nombre.toLowerCase()) return h[i][1]; return ''; }
    for (var k in h) if (k.toLowerCase() === nombre.toLowerCase()) return h[k];
    return '';
  }
  function apagada(tipo, metodo, accept) {
    var json = { 'Content-Type': 'application/json' };
    if (tipo === 't') {
      if (metodo === 'HEAD') return new Response(null, { status: 200, headers: { 'Content-Range': '*/0' } });
      if (/vnd\.pgrst\.object/.test(accept)) {
        return new Response(JSON.stringify({ code: 'PGRST116', details: 'The result contains 0 rows', hint: null,
          message: 'JSON object requested, multiple (or no) rows returned' }), { status: 406, headers: json });
      }
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '*/0' } });
    }
    if (tipo === 'f') return new Response('null', { status: 200, headers: json });
    if (tipo === 'b') return new Response(JSON.stringify({ statusCode: '403', error: 'modulo_no_activo',
      message: 'Módulo no activo en esta instancia' }), { status: 403, headers: json });
    return new Response(JSON.stringify({ error: 'modulo_no_activo' }), { status: 404, headers: json });
  }
  var fetchReal = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    var c = clasifica(url);
    if (!c) return fetchReal(input, init);
    var extra = M.x && M.x[c.tipo] && M.x[c.tipo][c.n];
    var mod = extra || (M[c.tipo] && M[c.tipo][c.n]);
    if (!mod) return fetchReal(input, init);                      // núcleo: sin esperar
    var metodo = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var accept = cabecera(input, init, 'Accept');
    if (extra) { rastro(c.tipo, c.n, extra); return Promise.resolve(apagada(c.tipo, metodo, accept)); }
    return pListo.then(function () {
      if (activo(mod)) return fetchReal(input, init);
      rastro(c.tipo, c.n, mod);
      return apagada(c.tipo, metodo, accept);
    });
  };

  // ── la promesa de guard.js: en una pantalla de módulo, espera a saber; apagado = no arranca ───────
  if (MOD_PAGINA) {
    var real;
    Object.defineProperty(window, 'LW_AUTH', {
      configurable: true,
      get: function () { return real; },
      set: function (p) {
        real = !p || typeof p.then !== 'function' ? p : p.then(function (v) {
          return pListo.then(function () { return activo(MOD_PAGINA) ? v : new Promise(function () {}); });
        });
      }
    });
  }

  // ── pintar lo decidido ──────────────────────────────────────────────────────────────────────
  function aviso(titulo, texto, reintentar) {
    var html = '<main style="font:16px/1.5 system-ui,sans-serif;padding:48px 24px;max-width:560px;margin:0 auto">' +
      '<h1 style="font-size:22px;margin:0 0 12px">' + titulo + '</h1><p>' + texto + '</p><p>' +
      (reintentar ? '<button type="button" id="axw-reintenta" style="font:inherit;padding:8px 16px;cursor:pointer">Reintentar</button> ' : '') +
      '<a href="/intranet/v4/home/">Volver al inicio</a></p></main>';
    function pon() {
      document.body.innerHTML = html;
      raiz.classList.remove('axw-mod-pend');
      raiz.style.visibility = 'visible';
      var b = document.getElementById('axw-reintenta');
      if (b) b.addEventListener('click', function () { location.reload(); });
    }
    if (document.body) pon(); else document.addEventListener('DOMContentLoaded', pon);
  }
  function filtraRelativos() {
    var as = document.querySelectorAll('a[href]');
    for (var i = 0; i < as.length; i++) {
      var ruta;
      try { ruta = new URL(as[i].getAttribute('href'), location.href).pathname; } catch (e) { continue; }
      var m = esExtraRuta(ruta) ? '(no portado)' : moduloDeRuta(ruta);
      if (m && !activo(m) && as[i].style.display !== 'none') as[i].style.display = 'none';
    }
  }
  function pinta() {
    var apagados = Object.keys(M.p).filter(function (p) { return !activo(M.p[p]); }).concat(M.xp || []);
    hoja.textContent = reglas(apagados);
    if (MOD_PAGINA) {
      if (activo(MOD_PAGINA)) raiz.classList.remove('axw-mod-pend');
      else if (estado.error) aviso('No se pudo comprobar los módulos', 'No hemos podido preguntar a la base qué módulos tiene esta instancia. No es que falte: prueba otra vez.', true);
      else aviso('Módulo no instalado', 'Este módulo no está activo en esta instancia.', false);
    }
    function vigila() {
      filtraRelativos();
      var pend = null;
      new MutationObserver(function () {
        if (pend) return;
        pend = setTimeout(function () { pend = null; filtraRelativos(); }, 60);
      }).observe(document.body, { childList: true, subtree: true });
    }
    if (document.body) vigila(); else document.addEventListener('DOMContentLoaded', vigila);
  }

  // ── pedir los activos (con sesión; un fallo no se guarda) ────────────────────────────────────
  function decide(err, valor) {
    if (err) estado.error = err;
    else if (valor === null) estado.activos = 'todos';               // sin modulos_activos = todo encendido
    else if (Array.isArray(valor)) { var s = { base: true }; valor.forEach(function (k) { s[k] = true; }); estado.activos = s; }
    else estado.error = new Error('respuesta de módulos con forma rara');
    estado.listo = true;
    pinta();
    avisaListo();
  }
  function pide() {
    var sb = window.LW_SB;
    if (!sb || !sb.auth) return false;
    sb.auth.getSession().then(function (r) {
      // sin sesión: guard.js manda al acceso; si no lo hiciera (entrada sin recargar), se vuelve a mirar en 1 s en vez de
      // dejar colgado todo lo de módulo (revisor)
      if (!(r && r.data && r.data.session)) { setTimeout(pide, 1000); return; }
      return sb.rpc('modulos_activos_datos').then(function (x) {
        // {activos: [...] | null} (forma declarada en FORMAS_DATOS de erp/modulos.py)
        if (x.error) decide(x.error);
        else if (!x.data || typeof x.data !== 'object' || Array.isArray(x.data) || !('activos' in x.data)) decide(new Error('forma de modulos_activos_datos'));
        else decide(null, x.data.activos);
      });
    }).catch(function (e) { decide(e); });
    return true;
  }
  var desde = Date.now();
  (function intenta() {
    if (pide()) return;
    if (Date.now() - desde > 20000) { decide(new Error('sin cliente de Supabase')); return; }
    setTimeout(intenta, 25);
  })();
})();
