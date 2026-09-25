/* Módulos apagados en esta instancia del ERP — F4, 25-sep-2026 (encargos/20260924_estudio_erp_modular.md).
   build.py --instancia lo antepone a /contracts/assets/guard.js con el mapa rellenado desde erp/modulos.json y
   erp/instancias.json. Una instancia sin modulos_activos no lo lleva: allí todo está activo.

   NO ES EL CANDADO. El candado está en la base (políticas restrictivas y permisos por módulo): quien llame a la API
   a mano se encuentra la puerta cerrada igual. Esto es solo para que las pantallas activas no pidan lo que la base
   ya no les da y no enseñen errores: una tabla de un módulo apagado responde vacía, una función responde null, un
   bucket responde «no activo», sin salir a la red. Y oculta del menú los enlaces a pantallas apagadas. */
(function () {
  var A = __AXW_APAGADOS__;
  window.AXW_APAGADOS = A;
  var NO_ACTIVO = { message: 'Módulo no activo en esta instancia' };
  // Rastro en consola, una vez por objeto (revisión previa #98, Seguridad): si un módulo ACTIVO estuviera mal
  // clasificado, este vacío escondería un fallo real de permisos. Así se ve qué se interceptó.
  var vistos = {};
  function rastro(tipo, n) { if (!vistos[tipo + n]) { vistos[tipo + n] = 1; try { console.info('[axw] módulo apagado: ' + tipo + ' ' + n + ' (' + (A.t[n] || A.f[n] || A.b[n]) + ')'); } catch (e) {} } }

  // Respuesta vacía encadenable: cualquier método (.select/.eq/.in/.order/.range…) devuelve la misma respuesta;
  // .single()/.maybeSingle() devuelven data null. Se resuelve al momento.
  function vacia(dato) {
    var res = { data: dato, error: null, count: 0, status: 200, statusText: 'OK' };
    var p = Promise.resolve(res);
    var prox = new Proxy(function () {}, {
      get: function (_o, k) {
        if (k === 'then') return p.then.bind(p);
        if (k === 'catch') return p.catch.bind(p);
        if (k === 'finally') return p.finally.bind(p);
        if (k === 'single' || k === 'maybeSingle') return function () { return vacia(null); };
        return function () { return prox; };
      },
      apply: function () { return prox; }
    });
    return prox;
  }
  function bucketApagado() {
    var r = Promise.resolve({ data: null, error: NO_ACTIVO });
    return new Proxy({}, { get: function () { return function () { return r; }; } });
  }

  function envuelve(c) {
    if (!c || c.__axwApagados) return c;
    c.__axwApagados = true;
    var from = c.from.bind(c), rpc = c.rpc.bind(c);
    c.from = function (n) { if (A.t[n]) { rastro('tabla', n); return vacia([]); } return from.apply(null, arguments); };
    c.rpc = function (n) { if (A.f[n]) { rastro('función', n); return vacia(null); } return rpc.apply(null, arguments); };
    // `storage` es un getter que crea un cliente nuevo en cada acceso: se envuelve el getter, no el objeto.
    var d = null, o = c;
    while (o && !(d = Object.getOwnPropertyDescriptor(o, 'storage'))) o = Object.getPrototypeOf(o);
    if (d) {
      var leer = d.get ? function () { return d.get.call(c); } : function () { return d.value; };
      Object.defineProperty(c, 'storage', {
        configurable: true,
        get: function () {
          var s = leer(), sf = s.from.bind(s);
          s.from = function (b) { if (A.b[b]) { rastro('bucket', b); return bucketApagado(); } return sf.apply(null, arguments); };
          return s;
        }
      });
    }
    return c;
  }

  function engancha() {
    var S = window.supabase;
    if (!S || !S.createClient || S.__axwApagados) return !!(S && S.__axwApagados);
    var orig = S.createClient;
    S.createClient = function () { return envuelve(orig.apply(this, arguments)); };
    S.__axwApagados = true;
    if (window.LW_SB) envuelve(window.LW_SB);
    return true;
  }
  engancha();

  // Menú: fuera los enlaces a pantallas de módulos apagados (el menú se pinta en varios tiempos).
  function apagada(href) {
    var ruta;
    try { ruta = new URL(href, location.href).pathname; } catch (e) { return false; }
    for (var i = 0; i < A.p.length; i++) if (ruta.indexOf(A.p[i]) === 0) return true;
    return false;
  }
  function filtra() {
    var as = document.querySelectorAll('a[href]');
    for (var i = 0; i < as.length; i++) if (apagada(as[i].getAttribute('href')) && as[i].style.display !== 'none') as[i].style.display = 'none';
  }
  function arranca() {
    engancha();
    filtra();
    var pend = null;
    new MutationObserver(function () {
      if (pend) return;
      pend = setTimeout(function () { pend = null; filtra(); }, 60);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arranca); else arranca();
})();
