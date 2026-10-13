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

  /* Para las GUARDAS de pantalla de otros ficheros (desacople del núcleo comercial, 5-oct-2026). Distinto de activo(): activo()
     falla cerrado (lo usa el fetch para no pedir a una base que ya no da), esto falla ABIERTO. Mientras no se sabe (carga
     asíncrona) o si no se pudo comprobar, devuelve true = el comportamiento de siempre, nunca esconde. Solo dice false
     cuando la base ha contestado y el módulo no está. Lawang no lleva este fichero: allí `window.axwModuloActivo` no
     existe y la guarda cae a true (idioma: `!(window.axwModuloActivo ? window.axwModuloActivo(m) : true)`). Quien necesite
     esperar al dato: `window.AXW_MODULOS_LISTOS` (promesa; resuelve true si se supo, false si falló la comprobación). */
  window.axwModuloActivo = function (mod) {
    if (!estado.listo || estado.error) return true;
    return activo(mod);
  };
  window.AXW_MODULOS_LISTOS = pListo.then(function () { return !estado.error; });

  /* ¿Es de un módulo encendido la pantalla `path` del menú v4 (el `path` de LW_MENU_V4, sin barras: 'taller', 'leads')? Lo usa Usuarios
     para ofrecer solo las herramientas de módulos encendidos (bbm-p40, 13-oct-2026: la ventana de permisos enseñaba las de Lawang enteras).
     Se mira la ruta v4 y la clásica (/clasico/<path>/), donde ruta_limpia deja las herramientas de /intranet/<x>/ (el CRM). Una pantalla
     que esta instancia no puede encender nunca (xp) es false siempre; una sin módulo (núcleo: usuarios, ajustes) es true; el resto, como
     axwModuloActivo: falla ABIERTO (sin saber, true). No es un candado: el que decide qué se concede es el servidor. */
  window.axwRutaActiva = function (path) {
    if (!path) return true;
    var rutas = ['/' + path + '/', '/clasico/' + path + '/'];
    for (var i = 0; i < rutas.length; i++) {
      if (esExtraRuta(rutas[i])) return false;
      var m = moduloDeRuta(rutas[i]);
      if (m) return window.axwModuloActivo(m);
    }
    return true;
  };

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
  window.AXW_MODULO_PAGINA = MOD_PAGINA;   // el módulo de esta pantalla, para el aviso de setup (aviso_setup.js, F3 12-oct-2026); null = núcleo

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
  /* La pantalla la da no_instalado.html (28-sep-2026), la misma que build.py sirve en las pantallas no portadas: una
     sola fuente con la piel de la v4 y el bloque de AxisWorks. La plantilla es estática (del build); lo que se rellena
     va escapado. M.n = {módulo: [nombre, qué hace]}, de modulos_rotulos.json (el mismo rótulo que el panel). */
  var PLANTILLA = __AXW_NO_INSTALADO__;
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pantalla(error) {
    var f = error ? null : (M.n || {})[moduloDeRuta(RUTA)];
    var v = error ? {
      titulo: 'No se pudo comprobar los módulos',
      texto: 'No hemos podido preguntar a la base qué módulos tiene esta instancia. No es que falte: prueba otra vez.',
      que_hace: '', asunto: '', oculta_que_hace: 'hidden', oculta_contacto: 'hidden', oculta_reintenta: ''
    } : {
      titulo: 'Módulo no instalado',
      texto: f ? '«' + f[0] + '» no está activo en esta instancia.' : 'Este módulo no está activo en esta instancia.',
      que_hace: f && f[1] ? f[1] : '', asunto: encodeURIComponent('Activar módulo: ' + (f ? f[0] : RUTA)),
      oculta_que_hace: f && f[1] ? '' : 'hidden', oculta_contacto: '', oculta_reintenta: 'hidden'
    };
    return { titulo: v.titulo, html: PLANTILLA.replace(/\{\{([a-z_]+)\}\}/g, function (_, k) { return esc(v[k]); }) };
  }
  function aviso(error) {
    var p = pantalla(error);
    function pon() {
      // la hoja de la v4 (y su tipografía): no todas las pantallas de módulo la cargan (/clasico/leads/ no es v4)
      ['/assets/fonts/fonts.css', '/assets/tw-base.css'].forEach(function (href) {
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        (document.head || raiz).appendChild(l);
      });
      document.title = p.titulo;
      document.body.innerHTML = p.html;
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
    plegables();
    secciones();
    gruposHub();
  }
  function rutaDe(a) {
    try { return new URL(a.getAttribute('href'), location.href).pathname; } catch (e) { return null; }
  }
  function vivo(a) {
    var ruta = rutaDe(a);
    if (ruta == null) return false;
    var m = esExtraRuta(ruta) ? '(no portado)' : moduloDeRuta(ruta);
    return !m || activo(m);
  }
  /* Un grupo plegable del menú (nav.js: «Cobros» con Vencimientos, Facturas, Recibos…) lleva como enlace su PRIMERA pestaña
     visible para el rol, sin mirar los módulos. Si esa pestaña es de un módulo apagado, la línea de arriba oculta la entrada
     del grupo y con ella todas sus pestañas, aunque otras estén encendidas (12-oct-2026, bbm: super admin con facturas y
     recibos encendidos y vencimientos apagado → «Cobros» invisible, Facturas y Recibos inalcanzables). Aquí el grupo apunta
     a su primera pestaña ENCENDIDA y se enseña; sin ninguna encendida, se oculta entero. Enganche: data-lw-plegable,
     aria-controls y data-lw-pestana (los pone nav.js), nunca el rótulo. */
  function plegables() {
    var gs = document.querySelectorAll('a[data-lw-plegable][aria-controls]');
    for (var i = 0; i < gs.length; i++) {
      var g = gs[i], sub = document.getElementById(g.getAttribute('aria-controls'));
      if (!sub) continue;
      var hijos = sub.querySelectorAll('a[data-lw-pestana]'), primero = null;
      /* Cada pestaña por SU módulo: nav.js las crea clonando la entrada del grupo, y si el grupo ya estaba oculto aquí (dentro
         de /facturas/ el submenú se rehace después), los clones nacen con su display:none y el grupo salía abierto y vacío. */
      for (var j = 0; j < hijos.length; j++) {
        var v = vivo(hijos[j]), quiere = v ? '' : 'none';
        if (hijos[j].style.display !== quiere) hijos[j].style.display = quiere;
        if (v && !primero) primero = hijos[j];
      }
      if (primero) {
        if (!vivo(g)) g.setAttribute('href', primero.getAttribute('href'));
        if (g.style.display === 'none') g.style.display = '';
      } else {
        if (g.style.display !== 'none') g.style.display = 'none';
        if (sub.style.display !== 'none') sub.style.display = 'none';
      }
    }
  }
  /* Una sección del menú lateral (su rótulo y sus entradas) sin ninguna entrada visible no pinta el rótulo solo (12-oct-2026,
     bbm: «Documentos», «Comunicación» y «Base de datos» salían como rótulos huérfanos). La sección es el contenedor directo de
     las entradas `a[data-path]` dentro del <nav> del menú; se mira la visibilidad calculada de esas entradas. */
  function secciones() {
    var navs = document.querySelectorAll('aside nav');
    for (var i = 0; i < navs.length; i++) {
      var hijos = navs[i].children;
      for (var j = 0; j < hijos.length; j++) {
        var s = hijos[j], entradas = s.querySelectorAll(':scope > a[data-path]');
        if (!entradas.length) continue;
        var alguna = false;
        for (var k = 0; k < entradas.length && !alguna; k++) alguna = getComputedStyle(entradas[k]).display !== 'none';
        var quiere = alguna ? '' : 'none';
        if (s.style.display !== quiere) s.style.display = quiere;
      }
    }
  }
  /* El hub clásico (la raíz, al volver con ?sin_permiso=…) pinta sus herramientas en `#grupos > section.grupo`, cada una con su
     rótulo y sus filas `.filas > a`. Si la capa oculta todas las filas de un grupo (módulo apagado), el rótulo salía solo
     (12-oct-2026, bbm: «DOKUMEN» vacío con Asistente apagado). Mismo criterio que secciones(): la visibilidad calculada. */
  function gruposHub() {
    var gs = document.querySelectorAll('#grupos > section.grupo');
    for (var i = 0; i < gs.length; i++) {
      var filas = gs[i].querySelectorAll('.filas > a'), alguna = !filas.length;
      for (var k = 0; k < filas.length && !alguna; k++) alguna = getComputedStyle(filas[k]).display !== 'none';
      var quiere = alguna ? '' : 'none';
      if (gs[i].style.display !== quiere) gs[i].style.display = quiere;
    }
  }
  /* Lo que sobra con un módulo apagado (bbm-p39, 13-oct-2026): build.py marca en la copia `data-axw-sin="<módulos>"` y pone su regla; aquí
     solo se dice qué módulos están apagados, con `axw-sin-<módulo>` en <html>. Solo cuando la base ya ha contestado: sin saber, o si falló,
     no se esconde nada (falla abierto, como axwModuloActivo). */
  var MODULOS = (function () {
    var s = {};
    ['t', 'f', 'b', 'e', 'p'].forEach(function (k) { for (var o in (M[k] || {})) s[M[k][o]] = 1; });
    return Object.keys(s);
  })();
  function pinta() {
    var apagados = Object.keys(M.p).filter(function (p) { return !activo(M.p[p]); }).concat(M.xp || []);
    hoja.textContent = reglas(apagados);
    MODULOS.forEach(function (m) {
      if (estado.listo && !estado.error && !activo(m)) raiz.classList.add('axw-sin-' + m);
      else raiz.classList.remove('axw-sin-' + m);
    });
    if (MOD_PAGINA) {
      if (activo(MOD_PAGINA)) raiz.classList.remove('axw-mod-pend');
      else aviso(!!estado.error);
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
  /* Idiomas de la instancia (owner, 12-oct: «Sí, en Ajustes»; bbm-p31). La base los da con sesión ({ofrecidos, defecto} | null): la pantalla de entrada
     no puede preguntarlos (sin lectura anónima, Seguridad #289), así que se APUNTAN aquí, tras el login, y el arranque de cada página (parche de idioma.js
     en build.py) los lee antes que lo que fijó el build. Solo si este paquete sabe pintarlos (id+en necesita el núcleo indonesio del build). Si lo apuntado
     cambia lo que ya se está viendo, UNA recarga por cambio (marca en sessionStorage: nunca un bucle). Sin idiomas en el build no hay nada que aplicar. */
  var CLAVE_IDIOMAS = 'axw_idiomas_erp';
  function idiomasDeLaBase(v) {
    var lista = null;
    if (v && typeof v === 'object' && Array.isArray(v.ofrecidos) && typeof v.defecto === 'string' && v.ofrecidos.indexOf(v.defecto) >= 0) {
      lista = [v.defecto].concat(v.ofrecidos.filter(function (c) { return c !== v.defecto; }));
    }
    /* BBM-72 (bbm-p40, 13-oct): el PAPEL (factura, recibí y su correo) sigue a lo que la base guardó, sin pasar por localStorage: documento.js lo lee
       con axwDocId() al pintar (el primero manda, como _doc_idioma() de la base). Sin fila o con algo que no es uno de los dos pares, null = el build. */
    window.AXW_IDIOMAS_DOC = (lista && [['es', 'en'], ['id', 'en']].some(function (p) { return p.join() === lista.join(); })) ? lista : null;
    var b = window.AXW_IDIOMAS_BUILD;
    if (!Array.isArray(b) || !b.length) return;
    var pintable = !!lista && [['es', 'en'], ['id', 'en']].some(function (p) { return p.join() === lista.join(); }) && (lista[0] !== 'id' || b.indexOf('id') >= 0);
    var nueva = pintable ? lista : b;   // null (sin guardar) o algo que este paquete no sabe pintar: manda el build
    try {
      if (pintable) localStorage.setItem(CLAVE_IDIOMAS, JSON.stringify(lista)); else localStorage.removeItem(CLAVE_IDIOMAS);
      if ((localStorage.getItem(CLAVE_IDIOMAS) || '') !== (pintable ? JSON.stringify(lista) : '')) return;   // sin almacenamiento, recargar no cambiaría nada
    } catch (e) { return; }
    var actual = Array.isArray(window.AXW_IDIOMAS) ? window.AXW_IDIOMAS : b;
    if (nueva.join() === actual.join()) return;
    try {
      if (sessionStorage.getItem('axw_idiomas_recarga') === nueva.join()) return;
      sessionStorage.setItem('axw_idiomas_recarga', nueva.join());
    } catch (e) { return; }
    location.reload();
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
        else {
          /* La moneda de la instancia (F3 fase E, 12-oct-2026; Backend la añade a esta misma respuesta): se fija ANTES de soltar la sesión, así
             ninguna pantalla de módulo pinta un importe sin saberla. null o ausente = desconocida, nunca EUR (lwMonedaBase la lee). */
          if ('moneda' in x.data) window.LW_MONEDA_BASE = typeof x.data.moneda === 'string' && /^[A-Z]{3}$/.test(x.data.moneda) ? x.data.moneda : null;
          if ('idiomas' in x.data) idiomasDeLaBase(x.data.idiomas);   // sin la clave: esa base aún no guarda idiomas y manda el build
          decide(null, x.data.activos);
        }
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
