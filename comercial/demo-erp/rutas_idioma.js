/* Rutas en el idioma de la instancia (bbm-idioma-total, 15-oct-2026; owner: «la barra de dirección sigue diciendo palabras en español»).
   Spec: spec_R1R2.md + su adenda (revisiones previas #353 y #355).

   Las carpetas del paquete NO cambian: /taller/ sigue siendo la carpeta y su nombre es la CLAVE INTERNA estable con la que decide el
   código. Lo que cambia es lo que se ve en la barra y en los enlaces: /workshop/, /settings/setup/, ?no_access=…, #companies. El
   servidor sirve las dos rutas (alias_htaccess de build.py: /workshop/x se sirve por dentro desde taller/x), así que un enlace viejo, un
   correo enviado o un marcador en español siguen funcionando y aquí se canonizan sin recargar.

   build.py --instancia mete este fichero (sin comentarios) como PRIMER <script> en línea, síncrono, de cada página HTML del paquete, con
   el mapa en __AXW_RUTAS__ y el idioma de pantalla del build en __AXW_IDIOMA_BUILD__. Lawang y la demo pública no lo llevan.

   · Idioma de RUTAS: el de pantalla de la INSTANCIA, el que la base guarda en Ajustes › Idiomas (caché axw_idioma_pantalla_erp, que
     apuntan apagados_instancia.js e idioma.js tras el login) o, sin él, el del build. 'es' → rutas españolas; cualquier otro → inglesas.
     NUNCA axw_idioma_ui: ese es el de cada usuario, y la ruta de una pantalla es de la instancia.
   · axwRutaInterna / axwRutaVisible: solo el primer tramo (y el segundo si el primero tiene submapa: ajustes/configurar ↔ settings/setup);
     el resto de la ruta, la barra final y lo que no está en el mapa pasan tal cual.
   · axwBuscaInterna / axwBuscaVisible: el parámetro sin_permiso ↔ no_access (su valor pasa por el mismo mapa de rutas) y el valor de
     next (una ruta). Solo se reescribe el par exacto: el resto de la consulta sale byte a byte igual (nada de URLSearchParams.toString,
     que cambia %20 por +).
   · axwHashInterno / axwHashVisible: por pantalla (la clave interna de la ruta). Las escrituras de hash (location.hash = …) las deja
     en su forma visible el oyente de hashchange, con replaceState: no navega ni dispara otro hashchange.
   · history.pushState / replaceState envueltos: las pantallas arman la URL con la ruta interna y aquí sale la visible.
   · Traductor de enlaces: a[href] y area[href] del mismo origen, con un MutationObserver desde el <head> y un barrido al cargar. Reescribe
     el atributo en la MISMA forma (absoluto sigue absoluto, /x/ sigue de raíz, ../facturas/ pasa a ../invoices/) y solo si cambia: un
     href="#" no se toca nunca (nav.js, maqueta.js y datos.js se enganchan a él). Idempotente.
   Sin comentarios con barra-asterisco dentro del código: build.py los quita con una expresión regular. */
(function () {
  var D = __AXW_RUTAS__;
  var IDIOMA_BUILD = __AXW_IDIOMA_BUILD__;
  var has = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  var R = D.r || {}, S = D.s || {}, H = D.h || {}, Q = D.q || {}, QR = D.qr || [];
  // inversos: nombre inglés → clave interna
  var R_ES = {}, S_ES = {}, H_ES = {}, Q_ES = {}, k, j;
  for (k in R) if (has(R, k)) R_ES[R[k]] = k;
  for (k in S) if (has(S, k)) { S_ES[k] = {}; for (j in S[k]) if (has(S[k], j)) S_ES[k][S[k][j]] = j; }
  for (k in H) if (has(H, k)) { H_ES[k] = {}; for (j in H[k]) if (has(H[k], j)) H_ES[k][H[k][j]] = j; }
  for (k in Q) if (has(Q, k)) Q_ES[Q[k]] = k;

  var idioma = IDIOMA_BUILD || 'es';
  try { var g = localStorage.getItem('axw_idioma_pantalla_erp'); if (g) idioma = g; } catch (e) { idioma = IDIOMA_BUILD || 'es'; }
  var EN = idioma !== 'es';

  function corta(p) {
    var i = p.search(/[?#]/);
    return i < 0 ? [p, ''] : [p.slice(0, i), p.slice(i)];
  }
  function claveDe(seg) { return has(R, seg) ? seg : (has(R_ES, seg) ? R_ES[seg] : null); }
  function interna(p) {
    if (typeof p !== 'string' || p.charAt(0) !== '/') return p;
    var c = corta(p), segs = c[0].split('/');
    var cl = claveDe(segs[1]);
    if (!cl) return p;
    segs[1] = cl;
    if (segs.length > 2 && has(S, cl)) {
      var sub = has(S[cl], segs[2]) ? segs[2] : (has(S_ES[cl], segs[2]) ? S_ES[cl][segs[2]] : null);
      if (sub) segs[2] = sub;
    }
    var r = segs.join('/') + c[1];
    return r === p ? p : r;
  }
  // la forma inglesa de una ruta (sea cual sea el idioma de rutas): la usan visible() y axwRutaAlias()
  function aIngles(p) {
    var x = interna(p);
    if (typeof x !== 'string' || x.charAt(0) !== '/') return x;
    var c = corta(x), segs = c[0].split('/');
    if (!has(R, segs[1])) return x;
    var cl = segs[1];
    segs[1] = R[cl];
    if (segs.length > 2 && has(S, cl) && has(S[cl], segs[2])) segs[2] = S[cl][segs[2]];
    return segs.join('/') + c[1];
  }
  function visible(p) { return EN ? aIngles(p) : interna(p); }
  function claveRuta(p) {
    var x = interna(typeof p === 'string' ? p : location.pathname);
    return typeof x === 'string' ? (x.split('/')[1] || '') : '';
  }
  function hashInterno(h, p) {
    if (typeof h !== 'string' || h.length < 2 || h.charAt(0) !== '#') return h;
    var cl = claveRuta(p), n = h.slice(1);
    if (!has(H, cl) || has(H[cl], n)) return h;
    return has(H_ES[cl], n) ? '#' + H_ES[cl][n] : h;
  }
  function hashVisible(h, p) {
    var x = hashInterno(h, p);
    if (!EN || typeof x !== 'string' || x.length < 2) return x;
    var cl = claveRuta(p), n = x.slice(1);
    return has(H, cl) && has(H[cl], n) ? '#' + H[cl][n] : x;
  }
  function dec(s) { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { return null; } }
  function busca(s, haciaVisible) {
    if (typeof s !== 'string' || s.length < 2 || s.charAt(0) !== '?') return s;
    var partes = s.slice(1).split('&'), cambio = false;
    for (var i = 0; i < partes.length; i++) {
      var pr = partes[i], e = pr.indexOf('=');
      if (e < 0) continue;
      var kd = dec(pr.slice(0, e)), vd = dec(pr.slice(e + 1));
      if (kd == null || vd == null) continue;
      var nk = kd, nv = vd;
      var param = has(Q, kd) ? kd : (has(Q_ES, kd) ? Q_ES[kd] : null);
      if (param) {
        // el valor puede ser una lista (data-herramienta="facturas,operaciones,reservas-producto" de /ventas/): cada clave por su lado
        var vi = vd.split(',').map(function (x) { return claveDe(x) || x; }).join(',');
        if (haciaVisible && EN) { nk = Q[param]; nv = vi.split(',').map(function (x) { return has(R, x) ? R[x] : x; }).join(','); } else { nk = param; nv = vi; }
      } else if (QR.indexOf(kd) >= 0) {
        nv = haciaVisible ? visible(vd) : interna(vd);
      } else continue;
      if (nk !== kd || nv !== vd) { partes[i] = encodeURIComponent(nk) + '=' + encodeURIComponent(nv); cambio = true; }
    }
    return cambio ? '?' + partes.join('&') : s;
  }

  window.axwIdiomaRutas = EN ? 'en' : 'es';
  window.axwRutaInterna = interna;
  window.axwRutaVisible = visible;
  window.axwBuscaInterna = function (s) { return busca(s, false); };
  window.axwBuscaVisible = function (s) { return busca(s, true); };
  window.axwHashInterno = hashInterno;
  window.axwHashVisible = hashVisible;
  // las formas de una ruta interna que pueden estar pintadas en un href (la interna y la inglesa): para las hojas de apagados_instancia.js
  window.axwRutaAlias = function (p) {
    var x = interna(p), en = aIngles(p);
    return en === x ? [x] : [x, en];
  };

  var pushReal = history.pushState, replaceReal = history.replaceState;
  function partes(u) {
    var p = visible(u.pathname);
    return [p, busca(u.search, true), hashVisible(u.hash, p)];
  }
  function urlVisible(url) {
    if (url == null) return url;
    var u;
    try { u = new URL(String(url), location.href); } catch (e) { return url; }
    if (u.origin !== location.origin) return url;
    var v = partes(u);
    if (v[0] === u.pathname && v[1] === u.search && v[2] === u.hash) return url;
    return v[0] + v[1] + v[2];
  }
  history.pushState = function (st, t, url) {
    if (arguments.length < 3) return pushReal.apply(history, arguments);
    return pushReal.call(history, st, t, urlVisible(url));
  };
  history.replaceState = function (st, t, url) {
    if (arguments.length < 3) return replaceReal.apply(history, arguments);
    return replaceReal.call(history, st, t, urlVisible(url));
  };

  // canónica: una ruta, consulta o hash de la barra en el otro idioma pasa a la visible, sin recargar ni pedir nada al servidor
  function canonica() {
    var v = partes(location);
    if (v[0] === location.pathname && v[1] === location.search && v[2] === location.hash) return;
    try { replaceReal.call(history, history.state, '', v[0] + v[1] + v[2]); } catch (e) { return; }
  }
  canonica();
  window.addEventListener('hashchange', function () {
    var h = hashVisible(location.hash, location.pathname);
    if (h === location.hash) return;
    try { replaceReal.call(history, history.state, '', location.pathname + location.search + h); } catch (e) { return; }
  });

  // ── traductor de enlaces ──
  function relativo(attr, u, v) {
    var c = corta(attr), rel = c[0].split('/');
    var base = location.pathname.split('/');
    base.pop();
    var abs = base.slice(), origen = base.map(function () { return -1; });
    for (var i = 0; i < rel.length; i++) {
      if (rel[i] === '..') { if (abs.length > 1) { abs.pop(); origen.pop(); } } else if (rel[i] !== '.') { abs.push(rel[i]); origen.push(i); }
    }
    var nuevos = v[0].split('/');
    if (abs.length !== nuevos.length) return null;
    for (var n = 0; n < abs.length; n++) {
      if (abs[n] === nuevos[n]) continue;
      if (origen[n] < 0) return null;
      rel[origen[n]] = nuevos[n];
    }
    var cola = (v[1] !== u.search || v[2] !== u.hash) ? v[1] + v[2] : c[1];
    return rel.join('/') + cola;
  }
  function enLaMismaForma(attr, u, v) {
    var t = attr.replace(/^\s+/, '');
    var m = /^(?:[a-z][a-z0-9+.\-]*:)?\/\/[^\/?#]*/i.exec(t);
    if (m) return m[0] + v[0] + v[1] + v[2];
    if (t.charAt(0) === '/') return v[0] + v[1] + v[2];
    var mismaPagina = v[0] === location.pathname;
    if (t.charAt(0) === '#' && mismaPagina && v[1] === u.search) return v[2];
    if (t.charAt(0) === '?' && mismaPagina) return v[1] + v[2];
    if (t.charAt(0) === '#' || t.charAt(0) === '?') return v[0] + v[1] + v[2];
    return relativo(t, u, v) || v[0] + v[1] + v[2];
  }
  // lo ya resuelto para esta página (la base de los relativos es la ruta actual): una lista de mil filas con el mismo enlace, un cálculo
  var HECHO = {}, HECHO_EN = null, HECHOS = 0;
  function traduce(a) {
    var attr = a.getAttribute('href');
    if (!attr || attr === '#') return;
    if (HECHO_EN !== location.href || HECHOS > 2000) { HECHO = {}; HECHO_EN = location.href; HECHOS = 0; }
    if (has(HECHO, attr)) { if (HECHO[attr] !== attr) a.setAttribute('href', HECHO[attr]); return; }
    HECHO[attr] = calcula(attr);
    HECHOS++;
    if (HECHO[attr] !== attr) a.setAttribute('href', HECHO[attr]);
  }
  function calcula(attr) {
    var u;
    try { u = new URL(attr, location.href); } catch (e) { return attr; }
    if (u.origin !== location.origin || !/^https?:$/.test(u.protocol)) return attr;
    var v = partes(u);
    if (v[0] === u.pathname && v[1] === u.search && v[2] === u.hash) return attr;
    var nuevo = enLaMismaForma(attr, u, v);
    try {
      var w = new URL(nuevo, location.href);
      if (w.pathname !== v[0] || w.search !== v[1] || w.hash !== v[2]) nuevo = v[0] + v[1] + v[2];
    } catch (e) { nuevo = v[0] + v[1] + v[2]; }
    return nuevo;
  }
  var SEL = 'a[href],area[href]';
  function barre(n) {
    if (!n || n.nodeType !== 1) return;
    if (n.matches && n.matches(SEL)) traduce(n);
    if (n.querySelectorAll) { var as = n.querySelectorAll(SEL); for (var i = 0; i < as.length; i++) traduce(as[i]); }
  }
  try {
    new MutationObserver(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var m = lista[i];
        if (m.type === 'attributes') { if (m.target.matches && m.target.matches(SEL)) traduce(m.target); continue; }
        for (var j = 0; j < m.addedNodes.length; j++) barre(m.addedNodes[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  } catch (e) { /* MUDO A PROPOSITO: sin MutationObserver queda el barrido de DOMContentLoaded; los enlaces en español siguen sirviendo y se canonizan al llegar */ }
  document.addEventListener('DOMContentLoaded', function () { barre(document.documentElement); });
})();
