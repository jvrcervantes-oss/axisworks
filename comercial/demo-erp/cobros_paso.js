/* Ajustes › Cobros y el paso «cobros» del asistente — el MISMO componente en los dos sitios (F3 Entrega 2, bbm-p24-cobros-front, 12-oct-2026).
 * Owner, 12-oct 04:56: «La clave de xendit o stripe que la ponga el cliente en ajustes… El ERP debe ser independiente y usable sin pasar por ti ni
 * por mi.» y 08:25: «El ERP crea el enlace de pago». Contrato: la edge `ajustes-pagos` de Backend (bbm-p23-cobros; su prueba ajustes_pagos.test.js
 * manda sobre el doble erp/plan_f3e2_doble_cobros.json, copiado en pruebas/doble_cobros.json). Diseño del owner: S30 (escritorio y 390), S90, S91.
 * Va detrás de setup_modulos.js (window.AXW_SETUP: el mapa único de frases) y de setup_pasos.js (window.AXW_PASOS.registra).
 *
 * Qué hace, y solo esto:
 *  · componente de paso (interfaz de setup_pasos.js): pinta(caja, ctx) → {valores()} ; guarda(sb, v, ctx) → {ok} | {ok:false, error}.
 *    Lo usan el asistente (/ajustes/configurar/?modulo=reservas-producto&paso=cobros), Ajustes › Configurar módulos y la pestaña Ajustes › Cobros
 *    (anfitrión pequeño al final de este fichero, montado SOLO al abrir la pestaña: así una cuenta que no configura no llama a la edge).
 *  · Flujo de la edge: estado → pedir_codigo (las claves que cambian) → probar_y_guardar (los MISMOS campos + código + contraseña). La prueba
 *    contra Xendit la hace la edge; aquí solo se pinta su resultado. No hay «probar sin guardar»: el botón dice lo que hace.
 *  · Lo que NO hace (No te creas nada del front): no valida la forma de una clave (solo avisa si su prefijo no casa con el modo elegido, y la
 *    edge vuelve a mirarlo todo), no decide si está configurada ni el modo (lo dice `estado`), no recuerda nada fuera de esta pestaña.
 * Secretos: las claves viven en <input type=password> (solo .value, nunca atributo ni data-*) y en la memoria de esta página mientras dura el
 *    cambio; se vacían al guardar, al «Cambiar lo escrito» y en pagehide. Ni storage, ni URL, ni consola. Lo único que vuelve de la base es
 *    «configurada el <fecha> por <correo>».
 * Enganches: data-axw-cobros="…" (acciones del componente), data-axw-campo (campos), data-axw-cobros-fila (una clave). Nunca un rótulo.
 * Cobros reales «el cliente solo» (owner 12-oct: «Autorizo quitar la autorización del estudio para los cobros reales»; bbm-p38-cobros-front, 13-oct;
 *    contrato de bbm-p34-cobros-live, migración 20261012233000): todo cambio cuyo modo final es real lleva `confirmar_live` = lo que la persona tecleó
 *    (tiene que ser LIVE; la edge y la base lo vuelven a mirar). Vale con los DOS servidores: el viejo trae `estado.live_permitido` y, si no es true, el
 *    botón de real queda apagado (falla cerrado, como antes) e ignora confirmar_live; el nuevo no lo trae y el modo real queda abierto al super admin.
 * B10 (14-oct-2026): en la pestaña, debajo del componente, «Quién atiende las reservas del bot de WhatsApp: Dion / ERP» (bloqueBot, al final). Sale solo
 *    si `estado` trae bot_backend con su forma; enganches data-axw-bot-backend="…" y data-axw-campo="bot_motivo"|"bot_contrasena".
 */
(function () {
  'use strict';
  var CAMPOS = ['creacion', 'lectura', 'aviso'];
  var CLS_INPUT = 'w-full rounded-lg border border-control-border/50 bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md';
  var BTN1 = 'inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md axw-btn';
  var BTN2 = 'inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-outline-variant text-deep-lagoon font-label-md text-label-md axw-btn';
  // notas en text-on-surface-variant, no text-outline: en la piel de bbm text-outline da 3,96:1 sobre el fondo y hace falta 4,5 (bbm-p38, medido)
  var BTN_PEQ = 'inline-flex items-center justify-center px-4 py-2 rounded-full border border-outline-variant text-deep-lagoon font-label-md text-label-md';

  function S() { return window.AXW_SETUP; }
  function T(f, h) {
    if (typeof window.lwT === 'function') return window.lwT(f, h);
    var v = String(f);
    if (h) Object.keys(h).forEach(function (k) { v = v.split('%' + k).join(h[k]); });
    return v;
  }
  function C(k, h) { var f = S().TEXTOS.cobros[k]; return f == null ? S().texto('cobros', k) : T(f, h); }
  function el(tag, attrs, hijos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null) return; if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (hijos || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function vacia(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }
  function boton(texto, accion, cls) { return el('button', { type: 'button', 'data-real': '', 'data-axw-cobros': accion, class: cls, style: 'min-height:44px', text: texto }); }
  function locale() { return typeof window.lwLocale === 'function' ? window.lwLocale() : 'es-ES'; }
  function fecha(x) { var d = new Date(x); return isNaN(d) ? '' : d.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }); }
  function hora(ms) { var d = new Date(ms); return isNaN(d) ? '' : d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }); }
  function corto(x, max) { return typeof x === 'string' ? x.slice(0, max) : ''; }
  function nombreModo(m) { return m === 'live' ? C('m_live') : C('m_test'); }

  // ── La edge (la única puerta; patrón de llamaCorreo de Lawang): al navegador solo CÓDIGOS, que se leen por su forma, nunca el texto ─────────
  function sesion() {
    if (!window.LW_AUTH || typeof window.LW_AUTH.then !== 'function') return Promise.resolve(null);
    return window.LW_AUTH.then(function (a) { return a && a.sb ? a.sb : null; }, function () { return null; });
  }
  function llama(cuerpo) {
    return sesion().then(function (sb) {
      if (!sb || !sb.auth || typeof sb.auth.getSession !== 'function') return { status: 401, codigo: 'sin_sesion', d: null };
      return sb.auth.getSession().then(function (r) {
        var token = r && r.data && r.data.session && r.data.session.access_token;
        if (!token) return { status: 401, codigo: 'sin_sesion', d: null };
        var url;
        try { url = window.lwEdge('ajustes-pagos'); } catch (e) { return { status: 0, codigo: 'edge_no_disponible', d: null }; }
        return fetch(url, {
          method: 'POST', cache: 'no-store', credentials: 'omit',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'apikey': window.LW_SB_KEY },
          body: JSON.stringify(cuerpo)
        }).then(function (resp) {
          return resp.text().then(function (t) {
            var d = null;
            try { d = JSON.parse(t); } catch (e) { d = null; }
            var cod = d && typeof d.codigo === 'string' && /^[a-z_]{3,40}$/.test(d.codigo) ? d.codigo : '';
            if (resp.ok && d && d.ok === true) return { status: resp.status, codigo: cod, d: d };
            if (!cod) cod = (resp.status === 404 || resp.status >= 500) ? 'edge_no_disponible' : 'respuesta_ilegible';
            return { status: resp.status, codigo: cod, d: d };
          });
        }, function () { return { status: 0, codigo: 'sin_red', d: null }; });
      }, function () { return { status: 401, codigo: 'sin_sesion', d: null }; });
    });
  }
  // El error en la forma que entienden los anfitriones (AXW_SETUP.explica lo lee por code + hint): sin red = «el ERP no ha respondido».
  // Los códigos de la edge llevan el prefijo cobros_ en el mapa compartido (clave_no_valida o sin_sesion ya significan otra cosa en otros
  // módulos); falta_confirmar_live (servidor nuevo), live_no_permitido (el viejo) y cuenta_pruebas_solo_mira son hints de la BASE
  // (erp/modulos.py SETUP_HINTS) y van tal cual. Un código sin frase sale con la frase genérica de error, sin el código (AXW_SETUP.desconocidos).
  var DE_LA_BASE = { falta_confirmar_live: 1, live_no_permitido: 1, cuenta_pruebas_solo_mira: 1 };
  function errorDe(codigo) {
    if (codigo === 'sin_red') return { message: 'Failed to fetch' };
    return { code: codigo, hint: DE_LA_BASE[codigo] ? codigo : 'cobros_' + codigo, message: '' };
  }
  function textoError(codigo) { return S().explica(errorDe(codigo), true).texto; }
  // sin_a_quien_avisar tiene DOS causas (nadie fiable a quien avisar desde hace 24 h, o el servidor de correo cambió en 24 h) y solo el servidor sabe
  // cuál: se enseña SU texto (contrato de bbm-p34), traducido por su frase exacta en setup_modulos.js. Sin texto, o en en/id sin traducción, la frase
  // propia: nunca español en una pantalla en indonesio. Solo para este código; el resto se sigue leyendo por código.
  var TEXTO_DEL_SERVIDOR = { sin_a_quien_avisar: 1 };
  function textoRespuesta(res) {
    var c = res.codigo || 'respuesta_ilegible', t = res.d && typeof res.d.error === 'string' ? res.d.error.slice(0, 400) : '';
    if (!TEXTO_DEL_SERVIDOR[c] || !t || /[\u0000-\u001f]/.test(t)) return textoError(c);
    var tr = T(t);
    return tr === t && window.LW_IDIOMA && window.LW_IDIOMA !== 'es' ? textoError(c) : tr;
  }
  // El servidor viejo (antes de 20261012233000) trae live_permitido y solo deja el modo real con él a true; el nuevo no lo trae.
  function liveCerrado(est) { return typeof est.live_permitido === 'boolean' && est.live_permitido !== true; }

  // La forma de `estado` (cobros_estado() de la base, sin secretos). Una forma rara es un error, nunca «configurado».
  function estadoValido(e) {
    if (!e || typeof e !== 'object' || typeof e.configurado !== 'boolean' || !e.claves || typeof e.claves !== 'object') return false;
    if (e.modo != null && e.modo !== 'test' && e.modo !== 'live') return false;
    return CAMPOS.every(function (k) { var c = e.claves[k]; return c && typeof c.configurada === 'boolean'; });
  }

  // ── Lo que dura el cambio (solo en memoria de esta página) ─────────────────────────────────────────────────────────────────────────────
  // M = {est, pideCodigo, modo, reemplaza: {k: bool}, valores: {k: texto}, fase: 'editar'|'codigo', mandadas, correo, fallo, faltan, aviso, confirma,
  //      confirmaMandada (lo tecleado al pedir el código: probar_y_guardar manda el MISMO valor; null = modo final de prueba, no se manda)}
  var M = null, ultimo = null, cajas = [], nCaja = 0;
  var vueltas = 0;   // sube con cada descarta(): una respuesta pedida antes ya no manda (revisor 15-oct: volvía a poner las claves descartadas)
  function limpia() {
    if (M) { M.valores = {}; M.mandadas = null; M.codigo = ''; }
    cajas.forEach(function (c) { c.querySelectorAll('input').forEach(function (i) { if (i.type === 'password' || i.getAttribute('data-axw-campo') === 'codigo') i.value = ''; }); });
  }
  window.addEventListener('pagehide', function () {
    limpia();
    if (M) { M.fase = 'editar'; M.correo = ''; M.codigo = ''; M.confirma = ''; M.confirmaMandada = null; M.parte = 1; }
  });
  window.addEventListener('pageshow', function (ev) {   // vuelta desde la caché del navegador: se repinta con lo vaciado
    if (!ev.persisted || !M || !M.est) return;
    cajas.forEach(function (c) { if (document.body.contains(c)) dibuja(c); });
  });

  // Cerrar la ventana sin guardar (S10): lo escrito sale de los <input> Y de la memoria, y las demás cajas abiertas se repintan con lo vaciado.
  // Sin esto una clave descartada volvía al reabrir (inp.value = M.valores[k]) y recoge() la habría mandado con el siguiente «pedir código».
  function descarta() {
    vueltas++;
    limpia();
    if (!M) return;
    M.fase = 'editar'; M.correo = ''; M.codigo = ''; M.confirma = ''; M.confirmaMandada = null; M.aviso = ''; M.fallo = null; M.faltan = []; M.parte = 1;
    if (M.est) { M.modo = M.est.modo || 'test'; CAMPOS.forEach(function (k) { M.reemplaza[k] = !M.est.claves[k].configurada; }); }
    cajas.forEach(function (c) { if (document.body.contains(c) && M.est) dibuja(c); });
  }
  function nuevoM(est, pide) {
    var r = {};
    CAMPOS.forEach(function (k) { r[k] = !est.claves[k].configurada; });
    return { est: est, pideCodigo: pide, modo: est.modo || 'test', reemplaza: r, valores: {}, fase: 'editar', mandadas: null, correo: '', codigo: '', fallo: null, faltan: [], aviso: '', confirma: '', confirmaMandada: null, parte: 1 };
  }
  // Cambiar de modo (con claves ya puestas) obliga a reemplazar las TRES: el modo sale de la de creación y la de lectura, y Xendit da un token de
  // avisos distinto en prueba y en real (con el de prueba, reservas-pago rechazaría los avisos de los pagos reales)
  function fuerzaModo() {
    if (!M.est.modo) return;
    var cambia = M.modo !== M.est.modo;
    CAMPOS.forEach(function (k) { if (cambia) M.reemplaza[k] = true; });
  }

  /* pinta(caja, ctx): lee el estado en la edge y pinta. ctx de setup_pasos.js (no se usa más que para el contrato). */
  function pinta(caja, ctx) {
    var raiz = el('div', { class: 'flex flex-col gap-5', 'data-axw-cobros-caja': String(++nCaja) });
    caja.appendChild(raiz);
    cajas = cajas.filter(function (c) { return document.body.contains(c); });
    cajas.push(raiz);
    raiz.appendChild(el('p', { class: 'font-body-md text-body-md text-on-surface-variant', 'data-axw-cobros-estado': 'cargando', text: S().ui('cargando') }));
    raiz._listo = llama({ accion: 'estado' }).then(function (r) {
      vacia(raiz);
      // B10: la misma respuesta trae quién atiende las reservas del bot; se pasa a quien lo pinte (solo la pestaña lo escucha). Sin estado válido, null.
      avisaBot(raiz, r.d && r.d.ok === true && estadoValido(r.d.estado) ? r.d.bot_backend : null);
      if (r.codigo && !(r.d && r.d.ok === true)) return pintaFallo(raiz, r.codigo);
      if (!r.d || !estadoValido(r.d.estado)) return pintaFallo(raiz, 'respuesta_ilegible');
      var est = r.d.estado, pide = r.d.pide_codigo === true;
      if (!M) M = nuevoM(est, pide);
      else { M.est = est; M.pideCodigo = pide; CAMPOS.forEach(function (k) { if (!est.claves[k].configurada) M.reemplaza[k] = true; }); }
      dibuja(raiz);
    });
    return {
      valores: function () {
        if (!M || !M.est) return { ok: false, error: S().ui('cargando') };
        if (M.fase !== 'codigo') return { ok: false, error: C('primero_codigo') };
        var cod = String((raiz.querySelector('[data-axw-campo="codigo"]') || {}).value || '').trim();
        var pass = String((raiz.querySelector('[data-axw-campo="contrasena"]') || {}).value || '');
        if (!/^[0-9]{6}$/.test(cod) || !pass) return { ok: false, error: C('escribe_codigo') };
        M.raiz = raiz;   // guarda() lee el código y la contraseña de ESTA caja (en /ajustes/ puede haber dos: la pestaña y Configurar módulos)
        return { ok: true, v: {} };   // los secretos NO salen de este fichero: el anfitrión guarda v en su estado
      },
      descarta: descarta
    };
  }

  function pintaFallo(raiz, codigo) {
    raiz.appendChild(el('div', { role: 'alert', class: 'rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body-md text-body-md text-error', 'data-axw-cobros-error': codigo, text: textoError(codigo) }));
    var b = boton(S().ui('reintentar'), 'releer', BTN2 + ' self-start');
    b.addEventListener('click', function () { var c = raiz.parentNode; if (!c) return; c.removeChild(raiz); pinta(c, {}); });
    raiz.appendChild(b);
  }

  function dibuja(raiz) {
    vacia(raiz);
    var est = M.est, editar = M.fase === 'editar';
    if (ultimo) raiz.appendChild(el('p', { role: 'status', class: 'self-start px-3 py-1 rounded-full font-label-md text-[13px] bg-primary-container text-on-primary', 'data-axw-cobros-estado': 'conectado',
                                          text: ultimo.modo === 'test' || ultimo.modo === 'live' ? C('conectado', { m: nombreModo(ultimo.modo), h: hora(ultimo.hora) })
                                                                                                : C('conectado_sin_modo', { h: hora(ultimo.hora) }) }));
    if (ultimo && ultimo.avisado) raiz.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: C('avisado') }));
    if (!M.pideCodigo) {   // sin confirmación por código no hay cambio posible: se dice y no se ofrece nada (contrato: pide_codigo=false)
      raiz.appendChild(el('p', { role: 'alert', class: 'font-body-md text-body-md text-error', 'data-axw-cobros-error': 'codigo_no_disponible', text: textoError('codigo_no_disponible') }));
    }

    // Formularios de 1-3 campos (owner 15-oct; encargo 20261015_erp_formularios_1a3_campos S2): con más de 3 campos a la vista (la primera vez: modo + 3
    // claves, y en real además LIVE) el cambio va en dos partes: 1) modo (y LIVE, junto a su aviso: S90 «No way back»), 2) las claves y «Pedir el
    // código». La parte vive en M (dibuja() lo rehace todo en cada clic) y la mueven los botones del componente: el anfitrión no la ve (sin axw-parte),
    // porque aquí avanza «Pedir el código», no su botón. Lo no visible sigue en M.valores / M.confirma: lo que se manda a la edge no cambia.
    var hayCampos = CAMPOS.some(function (k) { return !est.claves[k].configurada || M.reemplaza[k]; });
    var verLive = editar && M.modo === 'live' && !liveCerrado(est) && hayCampos && M.pideCodigo;
    var nCampos = 1 + CAMPOS.filter(function (k) { return !est.claves[k].configurada || M.reemplaza[k]; }).length + (verLive ? 1 : 0);
    var parte = editar && M.pideCodigo && nCampos > 3 ? (M.parte === 2 ? 2 : 1) : 0;   // 0 = todo junto, como siempre
    if (parte) raiz.appendChild(el('p', { class: 'font-label-md text-label-md text-on-surface-variant', 'aria-live': 'polite', 'data-axw-cobros-parte': String(parte),
                                          text: S().ui('parte_de', { k: String(parte), m: '2' }) }));
    if (!editar) {   // con el código pedido: lo que se va a guardar en una línea, y solo el código y la contraseña (las claves ya van en M.mandadas)
      raiz.appendChild(el('p', { class: 'rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body-md text-body-md text-on-surface', 'data-axw-cobros-resumen': M.modo,
                                 text: C('resumen', { m: nombreModo(M.modo), c: Object.keys(M.mandadas || {}).map(function (k) { return C(k); }).join(' · ') }) }));
      if (M.pideCodigo) pintaCodigo(raiz);
      pie(raiz, est);
      return;
    }

    if (parte !== 2) {
    // Proveedor: solo el que da la base (hoy Xendit). El nombre es una marca: no se traduce.
    var prov = el('fieldset', { class: 'flex flex-col gap-2' }, [el('legend', { class: 'font-label-md text-label-md text-on-surface', style: 'margin-bottom:8px', text: C('proveedor') })]);
    prov.appendChild(el('div', { class: 'rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 flex flex-col gap-1', 'data-axw-cobros-proveedor': est.proveedor === 'xendit' ? 'xendit' : 'otro' }, [
      el('span', { class: 'font-label-md text-label-md text-deep-lagoon', text: est.proveedor === 'xendit' ? 'Xendit' : corto(String(est.proveedor || ''), 40) }),
      el('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: C('xendit_d') })]));
    raiz.appendChild(prov);

    // Modo: la intención del cliente. El de las claves guardadas lo dice la base (estado.modo).
    // min-width:0: un fieldset no encoge por debajo de su contenido y el correo de modo_desde lo ensancharía a 390 px
    var modo = el('fieldset', { class: 'flex flex-col gap-2', style: 'min-width:0', 'data-axw-cobros-modo': M.modo }, [el('legend', { class: 'font-label-md text-label-md text-on-surface', style: 'margin-bottom:8px', text: C('modo') })]);
    var seg = el('div', { class: 'flex flex-col md:flex-row gap-2', role: 'radiogroup' });
    [['test', C('modo_test')], ['live', C('modo_live')]].forEach(function (o) {
      var on = M.modo === o[0], bloqueado = o[0] === 'live' && liveCerrado(est);
      var b = el('button', { type: 'button', 'data-real': '', role: 'radio', 'aria-checked': on ? 'true' : 'false', 'data-axw-cobros': 'modo-' + o[0],
                             class: 'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-label-md text-label-md ' + (on ? 'bg-primary-container text-on-primary' : 'border border-outline-variant text-deep-lagoon'),
                             style: 'min-height:44px' + (bloqueado ? ';opacity:.5' : ''), text: o[1] });
      if (o[0] === 'live') b.appendChild(el('span', { class: 'px-2 py-0.5 rounded-full font-label-md text-[12px] bg-error-container text-on-error-container', text: C('dinero_real') }));
      if (bloqueado || !editar) b.disabled = true;
      b.addEventListener('click', function () { if (M.fase !== 'editar') return; M.modo = o[0]; M.confirma = ''; fuerzaModo(); M.aviso = ''; M.parte = 1; dibuja(raiz); });
      seg.appendChild(b);
    });
    modo.appendChild(seg);
    if (liveCerrado(est)) modo.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', 'data-axw-cobros-live': 'no_permitido', text: textoError('live_no_permitido') }));
    if (M.modo === 'live') modo.appendChild(el('p', { role: 'note', class: 'rounded-xl border bg-error-container text-on-error-container px-4 py-3 font-body-md text-body-md', style: 'border-color:rgb(var(--tema-error))', 'data-axw-cobros-live': 'aviso', text: C('live_aviso') }));
    if (est.modo) modo.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', 'data-axw-cobros-modo-guardado': est.modo, text: C('modo_guardado', { m: nombreModo(est.modo) }) }));
    // cuándo y quién puso el modo de ahora (servidor nuevo: estado.modo_desde {en, por}); con el viejo no viene y no se pinta
    var md = est.modo && est.modo_desde && typeof est.modo_desde === 'object' ? est.modo_desde : null;
    if (md && typeof md.en === 'string' && fecha(md.en)) {
      modo.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant break-words', style: 'overflow-wrap:anywhere', 'data-axw-cobros-modo-desde': est.modo,
                                 text: typeof md.por === 'string' && md.por ? C('modo_desde_por', { f: fecha(md.en), p: corto(md.por, 120) }) : C('modo_desde', { f: fecha(md.en) }) }));
    }
    raiz.appendChild(modo);
    }

    if (parte === 1) {   // la parte 1 acaba en el modo (y LIVE): «Siguiente» lleva a las claves
      if (verLive) pintaLive(raiz);
      var sig = boton(S().ui('siguiente'), 'siguiente', BTN2 + ' self-start');
      // «Siguiente» no frena: LIVE lo mira pideCodigo (y la edge y la base) y, si falta, vuelve aquí con su aviso y lo tecleado intacto
      sig.addEventListener('click', function () { M.parte = 2; M.aviso = ''; dibuja(raiz); enfoca(raiz, 'input[data-axw-campo]'); });
      raiz.appendChild(sig);
    } else {
      // Una fila por clave: guardada («Configurada el…», Reemplazar) o campo secreto
      CAMPOS.forEach(function (k) { raiz.appendChild(filaClave(raiz, k, editar)); });
      if (verLive && !parte) pintaLive(raiz);
      var fila = el('div', { class: 'flex flex-wrap gap-2' });
      if (parte === 2) {
        var atr = boton(S().ui('atras'), 'atras', BTN_PEQ);
        atr.addEventListener('click', function () { M.parte = 1; M.aviso = ''; dibuja(raiz); enfoca(raiz, '[data-axw-cobros^="modo-"][aria-checked="true"]'); });
        fila.appendChild(atr);
      }
      if (M.pideCodigo && hayCampos) {   // con todo guardado y nada que reemplazar no hay nada que pedir
        var pedir = boton(C('pedir'), 'pedir', BTN2);
        pedir.addEventListener('click', function () { pideCodigo(raiz, pedir); });
        fila.appendChild(pedir);
      }
      if (fila.firstChild) raiz.appendChild(fila);
    }
    pie(raiz, est);
  }
  function enfoca(raiz, sel) { var e = raiz.querySelector(sel); if (e) e.focus(); }

  // Confirmación expresa en TODO cambio con modo final real (S90 «No way back»; contrato 20261012233000: también estando ya en real y cambiando solo
  // el token de avisos). Se teclea LIVE y lo tecleado viaja como confirmar_live: la garantía es la edge y la base, que lo vuelven a mirar.
  // Solo si hay algo que mandar: con todo guardado y nada que reemplazar no hay código que pedir y el campo quedaría muerto (verLive en dibuja).
  function pintaLive(raiz) {
    var idc = 'axw-cb-live-' + raiz.getAttribute('data-axw-cobros-caja');
    var conf = el('input', { id: idc, type: 'text', autocomplete: 'off', spellcheck: 'false', 'data-axw-campo': 'confirma_live', class: CLS_INPUT });
    conf.value = M.confirma || '';
    conf.addEventListener('input', function () { M.confirma = conf.value; });
    raiz.appendChild(el('div', { class: 'flex flex-col gap-1.5' }, [el('label', { for: idc, class: 'font-label-md text-label-md text-on-surface', text: S().ui('teclea', { v: 'LIVE' }) }), conf,
      el('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: C('live_confirma_d') })]));
  }

  function pie(raiz, est) {
    raiz.appendChild(el('p', { role: 'alert', class: 'font-body-sm text-body-sm text-error', 'data-axw-cobros-error': M.aviso ? 'aviso' : '', text: M.aviso || '' }));
    raiz.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: C('prueba_nota') }));
    if (typeof est.intentos_recientes === 'number' && typeof est.intentos_max === 'number' && est.intentos_recientes > 0) {
      raiz.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', 'data-axw-cobros-intentos': String(est.intentos_recientes),
                                 text: C('intentos', { n: String(est.intentos_recientes), t: String(est.intentos_max) }) }));
    }
    // la fase, para el anfitrión de la pestaña (su botón de guardar solo tiene sentido con el código pedido)
    try { raiz.dispatchEvent(new CustomEvent('axw-cobros-fase', { bubbles: true, detail: { fase: M.fase } })); } catch (e) { /* MUDO A PROPOSITO: sin CustomEvent el botón sigue visible y valores() lo explica */ }
  }

  function filaClave(raiz, k, editar) {
    var c = M.est.claves[k], id = 'axw-cb-' + k + '-' + raiz.getAttribute('data-axw-cobros-caja');
    var fila = el('div', { class: 'flex flex-col gap-1.5', 'data-axw-cobros-fila': k, 'data-axw-cobros-puesta': c.configurada ? '1' : '0' });
    var fallo = M.fallo && M.fallo[k];
    if (c.configurada && !M.reemplaza[k]) {   // S90 «A key that's saved»: fecha y quién, nunca un trozo de la clave
      fila.appendChild(el('span', { class: 'font-label-md text-label-md text-on-surface', text: C(k) }));
      var caja = el('div', { class: 'rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 flex flex-col md:flex-row md:items-center gap-3' }, [
        el('div', { class: 'flex flex-col gap-0.5 flex-1 min-w-0' }, [
          el('span', { class: 'font-label-md text-label-md text-deep-lagoon', text: c.puesta_en ? C('puesta', { f: fecha(c.puesta_en) }) : S().texto('estado', 'configurado') }),
          c.puesta_por ? el('span', { class: 'font-body-sm text-body-sm text-on-surface-variant break-words', text: C('puesta_por', { p: corto(c.puesta_por, 120) }) }) : null])]);
      if (editar && M.pideCodigo) {
        var r = boton(C('reemplazar'), 'reemplazar-' + k, BTN_PEQ + ' self-start');
        r.addEventListener('click', function () { M.reemplaza[k] = true; M.aviso = ''; M.parte = 2; dibuja(raiz); var i = raiz.querySelector('[data-axw-campo="' + k + '"]'); if (i) i.focus(); });
        caja.appendChild(r);
      }
      fila.appendChild(caja);
    } else {
      fila.appendChild(el('label', { for: id, class: 'font-label-md text-label-md text-on-surface', text: C(k) + (c.configurada ? '' : ' *') }));
      var inp = el('input', { id: id, type: 'password', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', maxlength: '220', 'data-axw-campo': k, class: CLS_INPUT,
                              'data-lpignore': 'true', 'data-1p-ignore': '', 'data-bwignore': '', 'data-form-type': 'other',   // ningún gestor de contraseñas la guarda ni sugiere otra
                              'aria-invalid': (fallo || M.faltan.indexOf(k) >= 0) ? 'true' : null });
      inp.style.maxWidth = '100%';
      inp.value = M.valores[k] || '';   // .value: nunca va al marcado
      if (!editar) inp.readOnly = true;   // el código va atado a lo que se manda: cambiarlo pide otro código («Cambiar lo escrito»)
      inp.addEventListener('input', function () { M.valores[k] = inp.value; });
      fila.appendChild(inp);
      fila.appendChild(el('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: C(k + '_d') + ' ' + C('pega') }));
      if (c.configurada && editar) {
        var d = boton(C('dejar'), 'dejar-' + k, BTN_PEQ + ' self-start');
        d.addEventListener('click', function () { M.reemplaza[k] = false; M.valores[k] = ''; if (M.est.modo && M.modo !== M.est.modo) { M.modo = M.est.modo; } dibuja(raiz); });
        fila.appendChild(d);
      }
    }
    if (fallo) fila.appendChild(el('p', { class: 'font-body-sm text-body-sm text-error', 'data-axw-cobros-fallo': fallo, text: C('prueba_' + fallo) }));
    return fila;
  }

  // Lo que se va a mandar: solo las claves que se cambian. La primera vez, las que faltan son obligatorias (la edge lo vuelve a mirar: faltan_claves).
  function recoge() {
    var v = {}, faltan = [];
    CAMPOS.forEach(function (k) {
      var x = String(M.valores[k] || '').trim();
      if (x) v[k] = x;
      else if (!M.est.claves[k].configurada || (M.est.modo && M.modo !== M.est.modo)) faltan.push(k);
    });
    return { v: v, faltan: faltan };
  }
  function avisoPrefijo(v) {   // UX, no seguridad: el prefijo de la clave dice su modo; si no casa con el elegido, se avisa antes de gastar un código
    var malo = ['creacion', 'lectura'].filter(function (k) {
      if (!v[k]) return false;
      return (M.modo === 'test' && v[k].indexOf('xnd_production_') === 0) || (M.modo === 'live' && v[k].indexOf('xnd_development_') === 0);
    });
    return malo.length ? (M.modo === 'test' ? C('no_casa_test') : C('no_casa_live')) : '';
  }

  function pideCodigo(raiz, btn) {
    var r = recoge();
    M.fallo = null; M.faltan = r.faltan;
    if (r.faltan.length) { M.aviso = S().ui('falta_valor', { c: r.faltan.map(function (k) { return S().texto('campo', k); }).join(', ') }); dibuja(raiz); return; }
    if (!Object.keys(r.v).length) { M.aviso = textoError('sin_cambios'); dibuja(raiz); return; }
    var p = avisoPrefijo(r.v);
    if (p) { M.aviso = p; dibuja(raiz); return; }
    // exacto tras recortar espacios, y se manda lo tecleado (no 'LIVE' fijo): así la comprobación del servidor mide lo que escribió la persona
    // servidor viejo sin live_permitido y la instancia ya en real (nunca debería darse): no hay dónde teclear LIVE, se dice lo que dice la base
    if (M.modo === 'live' && liveCerrado(M.est)) { M.aviso = textoError('live_no_permitido'); M.parte = 1; dibuja(raiz); return; }
    var confirma = M.modo === 'live' ? String(M.confirma || '').trim() : null;
    if (confirma !== null && confirma !== 'LIVE') { M.aviso = S().ui('no_coincide'); M.parte = 1; dibuja(raiz); return; }
    btn.disabled = true;
    btn.textContent = S().ui('cargando');
    var cuerpo = { accion: 'pedir_codigo' };
    Object.keys(r.v).forEach(function (k) { cuerpo[k] = r.v[k]; });
    if (confirma !== null) cuerpo.confirmar_live = confirma;   // modo final de prueba: el campo no va (volver a prueba no lo pide)
    var mia = vueltas;
    llama(cuerpo).then(function (res) {
      if (mia !== vueltas) return;   // se cerró sin guardar mientras tanto: el código pedido caduca solo y las claves no vuelven
      if (res.d && res.d.ok === true && res.codigo === 'codigo_enviado') {
        M.fase = 'codigo'; M.mandadas = r.v; M.confirmaMandada = confirma; M.codigo = ''; M.correo = corto(res.d.correo_enmascarado, 120); M.aviso = '';
        dibuja(raiz);
        var c = raiz.querySelector('[data-axw-campo="codigo"]'); if (c) c.focus();
        return;
      }
      M.aviso = textoRespuesta(res);
      if (res.d && Array.isArray(res.d.campos)) M.faltan = res.d.campos.filter(function (k) { return CAMPOS.indexOf(k) >= 0; });
      if (res.d && CAMPOS.indexOf(res.d.campo) >= 0) M.faltan = [res.d.campo];
      // falta_confirmar_live sin que esta página lo esperase: la instancia ya está en real (otro administrador la pasó con esta página abierta).
      // Se relee estado y se sigue en el modo que dice la base: así sale el campo LIVE (revisor, BAJA 1). Si el modo cambió, lo tecleado se VACÍA
      // (un token de avisos de prueba puesto en real haría rechazar los avisos de pago) y se dice qué ha pasado (revisor, 2.ª vuelta).
      if (res.codigo === 'falta_confirmar_live' && confirma === null) {
        var antes = M.est && M.est.modo;
        M.parte = 1;   // el campo LIVE está en la parte del modo
        llama({ accion: 'estado' }).then(function (r2) {
          if (!M) return;
          var e2 = r2.d && r2.d.ok === true && r2.d.estado;
          if (!estadoValido(e2)) { M.aviso = textoError(r2.codigo || 'respuesta_ilegible'); dibuja(raiz); return; }
          M.est = e2;
          CAMPOS.forEach(function (k) { if (!e2.claves[k].configurada) M.reemplaza[k] = true; });
          if (e2.modo && e2.modo !== antes) {
            M.modo = e2.modo; M.valores = {}; M.confirma = ''; M.faltan = [];
            CAMPOS.forEach(function (k) { M.reemplaza[k] = !e2.claves[k].configurada; });
            M.aviso = C('modo_cambiado');
          }
          dibuja(raiz);
        });
        return;
      }
      dibuja(raiz);
    });
  }

  function pintaCodigo(raiz) {
    var n = raiz.getAttribute('data-axw-cobros-caja');
    var bloque = el('div', { class: 'flex flex-col gap-4 rounded-2xl bg-surface-container-low p-5', 'data-axw-cobros-fase': 'codigo' });
    bloque.appendChild(el('p', { role: 'status', class: 'font-body-md text-body-md text-on-surface', 'data-axw-cobros-enviado': '1', text: C('enviado', { c: M.correo || '—' }) }));
    var cod = el('input', { id: 'axw-cb-codigo-' + n, type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', 'data-axw-campo': 'codigo', class: CLS_INPUT });
    cod.style.maxWidth = '12rem';
    cod.value = M.codigo || '';
    cod.addEventListener('input', function () { M.codigo = cod.value; });
    bloque.appendChild(el('div', { class: 'flex flex-col gap-1.5' }, [el('label', { for: 'axw-cb-codigo-' + n, class: 'font-label-md text-label-md text-on-surface', text: C('codigo') }), cod]));
    var pass = el('input', { id: 'axw-cb-pass-' + n, type: 'password', autocomplete: 'current-password', 'data-axw-campo': 'contrasena', class: CLS_INPUT });
    pass.style.maxWidth = '100%';
    bloque.appendChild(el('div', { class: 'flex flex-col gap-1.5' }, [el('label', { for: 'axw-cb-pass-' + n, class: 'font-label-md text-label-md text-on-surface', text: C('contrasena') }), pass,
      el('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: C('contrasena_d') })]));
    var otra = boton(C('volver_a_escribir'), 'reescribir', BTN_PEQ + ' self-start');
    otra.addEventListener('click', function () { M.fase = 'editar'; M.mandadas = null; M.confirmaMandada = null; M.correo = ''; M.codigo = ''; M.aviso = ''; M.parte = 2; dibuja(raiz); });
    bloque.appendChild(otra);
    raiz.appendChild(bloque);
  }

  /* guarda(sb, v, ctx): probar_y_guardar con los MISMOS campos que pidieron el código. Nunca se reenvía solo (el código se gasta al promover):
     si la respuesta se pierde, se mira `estado` y se compara la fecha de cada clave mandada; si no se puede saber, se dice así. */
  function guarda(sb, v, ctx) {
    var raiz = M && M.raiz;   // la caja cuyo anfitrión acaba de llamar a valores()
    if (!M || M.fase !== 'codigo' || !M.mandadas || !raiz || !document.body.contains(raiz)) return Promise.resolve({ ok: false, error: errorDe('duda') });
    var cuerpo = { accion: 'probar_y_guardar' };
    Object.keys(M.mandadas).forEach(function (k) { cuerpo[k] = M.mandadas[k]; });
    if (M.confirmaMandada != null) cuerpo.confirmar_live = M.confirmaMandada;
    cuerpo.codigo = String((raiz.querySelector('[data-axw-campo="codigo"]') || {}).value || '').trim();
    cuerpo.contrasena_actual = String((raiz.querySelector('[data-axw-campo="contrasena"]') || {}).value || '');
    var antes = M.est, mandadas = Object.keys(M.mandadas);
    return llama(cuerpo).then(function (res) {
      cuerpo = null;
      if (res.d && res.d.ok === true && res.d.guardado === true) return exito(res.d.estado, res.d.aviso === 'enviado');
      // ¿llegó? Sin red, un 5xx/404 del gateway sin respuesta propia, o un 5xx de la edge que puede llegar con la promoción ya hecha
      // (base_no_responde al promover; un tiempo agotado tras dos pruebas a Xendit de 8 s y el aviso): se relee, nunca se reenvía.
      // Fuera de la duda, los 5xx que la edge da ANTES de guardar nada: proveedor_no_responde (candidato descartado), envíos en pausa, sin código, y
      // aviso_no_enviado (modo final real y el aviso previo a los demás no salió: no se guardó nada y el código no se gastó; se puede reintentar).
      var seguroNo = { proveedor_no_responde: 1, envios_pausados: 1, codigo_no_disponible: 1, codigo_no_enviado: 1, aviso_no_enviado: 1 };
      if (res.codigo === 'sin_red' || res.codigo === 'edge_no_disponible' || res.codigo === 'respuesta_ilegible' || (res.status >= 500 && !seguroNo[res.codigo])) {
        return llama({ accion: 'estado' }).then(function (r2) {
          var e2 = r2.d && r2.d.ok === true && r2.d.estado;
          if (!estadoValido(e2)) return fallo('duda');
          // la promoción es atómica: basta una clave mandada con fecha nueva (la base no renueva la de una clave enviada igual a la guardada)
          var cambio = mandadas.some(function (k) { return e2.claves[k].configurada && e2.claves[k].puesta_en && e2.claves[k].puesta_en !== antes.claves[k].puesta_en; });
          return cambio ? exito(e2, false) : fallo('sin_red');
        });
      }
      if (res.codigo === 'prueba_fallida' && res.d && res.d.fallo && typeof res.d.fallo === 'object') {
        M.fallo = {};
        CAMPOS.forEach(function (k) { var x = res.d.fallo[k]; if (typeof x === 'string' && S().TEXTOS.cobros['prueba_' + x]) M.fallo[k] = x; });
      }
      // el código ya no sirve o va atado a otro cambio (también si el modo de la instancia cambió entre pedirlo y usarlo): se vuelve a escribir y a
      // pedir (las claves tecleadas se quedan). falta_confirmar_live: el campo LIVE solo está al escribir, así que también se vuelve ahí.
      // sin_a_quien_avisar: no se arregla en los 10 minutos del código, y cada reintento volvería a probar contra Xendit y a sumar un intento
      // hasta demasiados_intentos (revisor, BAJA 3): se vuelve a escribir; el código no se gastó, pero hará falta pedir otro.
      if (res.codigo === 'codigo_no_valido' || res.codigo === 'prueba_caducada' || res.codigo === 'prueba_fallida' || res.codigo === 'demasiados_intentos' || res.codigo === 'falta_confirmar_live' || res.codigo === 'sin_a_quien_avisar') { M.fase = 'editar'; M.mandadas = null; M.confirmaMandada = null; M.correo = ''; M.codigo = ''; M.parte = res.codigo === 'falta_confirmar_live' ? 1 : 2; }
      return fallo(res.codigo || 'respuesta_ilegible', textoRespuesta(res));
    });
    function exito(est, avisado) {
      ultimo = { modo: est && est.modo, hora: Date.now(), avisado: avisado };
      limpia(); M = null;
      return { ok: true };
    }
    function fallo(codigo, texto) {
      if (M) M.aviso = texto || textoError(codigo);
      if (M && M.est && raiz && document.body.contains(raiz)) dibuja(raiz);   // la contraseña no se vuelve a poner: el campo nace vacío
      return { ok: false, sinRespuesta: false, error: errorDe(codigo) };
    }
  }

  var COMP = { pinta: pinta, guarda: guarda, sinMotivo: true };
  if (window.AXW_PASOS && typeof window.AXW_PASOS.registra === 'function') window.AXW_PASOS.registra('cobros', COMP);
  window.AXW_COBROS = { componente: COMP };

  // ── Ajustes › Cobros: «Comisión de pago en línea (%)» (erp-front, 14-oct-2026; contrato de bbm-bot-erp, bbm_bot_al_erp_13oct.md §3a) ─────────────
  // Se suma a lo que el cliente paga por enlace. Vive en `cobros_comision_pct` (ajustes_config_datos / ajustes_config_guardar), NO en la edge de
  // las claves: es un bloque aparte, debajo del componente, con su propio botón. Sale solo si la base declara la clave en `editables` (una base sin
  // ella, como la demo, no lo enseña); el campo se puede cambiar solo si `puede_escribir` (super admin): la pantalla no decide el rol.
  // La cifra: «3,5» o «3.5» (en indonesio y en español la coma es lo normal; parseFloat('3,5') daría 3 y cambiaría lo que se cobra), de 0 a 10 y
  // hasta 2 decimales; se manda como NÚMERO JSON y la base lo vuelve a comprobar (hint comision_no_valida). Cambiar un valor que ya había pide motivo
  // (hint motivo). Enganches: data-axw-comision="…", nunca un rótulo.
  var ES_COM = ['Comisión de pago en línea (%)',
    'Se suma a lo que el cliente paga por enlace (moto, extras y entrega; nunca la fianza ni el seguro). 0 = sin comisión. Solo cambia las cotizaciones nuevas.',
    'Escribe por qué lo cambias (por ejemplo, la tarifa de la pasarela).', 'Motivo del cambio', 'Guardar comisión',
    'Un número de 0 a 10, con hasta 2 decimales (por ejemplo, 3 o 2,5).', 'No has cambiado la cifra.', 'Comisión guardada.',
    'La base no ha respondido: no sabemos si se guardó. Recarga la página para verlo.', 'No se guardó: ', 'Solo la cambia el administrador principal.',
    'Comisión guardada, pero no se pudo volver a leer: recarga la página para verla.', 'No se ha podido leer la comisión de pago en línea: recarga la página.'];
  var EN_COM = ['Online payment fee (%)',
    'Added to what customers pay by payment link (bike, extras and delivery; never the deposit or insurance). 0 = no fee. Changes only new quotes.',
    "Write why you change it (for example, the gateway's rate).", 'Reason for the change', 'Save fee',
    'A number from 0 to 10, with up to 2 decimals (for example, 3 or 2.5).', "You haven't changed the figure.", 'Fee saved.',
    "The database didn't answer: we don't know if it was saved. Reload the page to see it.", 'Not saved: ', 'Only the main administrator can change it.',
    "Fee saved, but it couldn't be read back: reload the page to see it.", "The online payment fee couldn't be read: reload the page."];
  var ID_COM = ['Biaya pembayaran online (%)',
    'Ditambahkan ke yang dibayar pelanggan lewat link pembayaran (motor, tambahan dan antar; tidak termasuk deposit atau asuransi). 0 = tanpa biaya. Hanya berlaku untuk penawaran baru.',
    'Tulis alasan perubahannya (misalnya, tarif gateway).', 'Alasan perubahan', 'Simpan biaya',
    'Angka 0 sampai 10, paling banyak 2 desimal (misalnya, 3 atau 2,5).', 'Angkanya belum Anda ubah.', 'Biaya tersimpan.',
    'Basis data tidak menjawab: kami tidak tahu apakah sudah tersimpan. Muat ulang halaman untuk melihatnya.', 'Tidak tersimpan: ', 'Hanya administrator utama yang dapat mengubahnya.',
    'Biaya tersimpan, tetapi tidak bisa dibaca kembali: muat ulang halaman untuk melihatnya.', 'Biaya pembayaran online tidak dapat dibaca: muat ulang halaman.'];
  (function () {
    ES_COM.forEach(function (k, i) {
      if (window.LW_EN && typeof window.LW_EN === 'object' && !(k in window.LW_EN)) window.LW_EN[k] = EN_COM[i];
      if (window.LW_ID && typeof window.LW_ID === 'object' && !(k in window.LW_ID)) window.LW_ID[k] = ID_COM[i];
    });
  })();
  function pct(s) {   // «3», «2,5», «2.75» → número; cualquier otra cosa (vacío, negativo, 3 decimales, miles, letras, > 10) → null
    s = String(s == null ? '' : s).trim();
    if (!/^\d{1,2}(?:[.,]\d{1,2})?$/.test(s)) return null;
    var n = Number(s.replace(',', '.'));
    return n >= 0 && n <= 10 ? n : null;
  }
  function pctTexto(n) { return String(n).replace('.', (window.LW_IDIOMA || 'es') === 'en' ? '.' : ','); }
  function comision(sec) {
    if (!sec || document.querySelector('[data-axw-comision="bloque"]') || typeof window.lwDatos !== 'function') return;
    var caja = el('div', { 'data-axw-comision': 'bloque', class: 'rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-5 flex flex-col gap-3',
      style: 'margin:0 clamp(16px,3vw,32px) 24px' });
    caja.hidden = true;
    sec.appendChild(caja);
    function lee() {
      // null = esta instancia no tiene el ajuste, o quien mira no es administrador (42501: recargar no lo arregla); {fallo} = no se pudo leer (se dice)
      return window.lwDatos('ajustes_config_datos').then(function (r) {
        if (r && r.error && r.error.code === '42501') return null;
        var d = r && !r.error ? r.data : null;
        if (!d || typeof d !== 'object') return { fallo: true };
        if (!Array.isArray(d.editables) || d.editables.indexOf('cobros_comision_pct') === -1) return null;
        return { v: d.valores ? d.valores.cobros_comision_pct : null, escribe: d.puede_escribir === true };
      }, function () { return { fallo: true }; });
    }
    function pintaCom(x) {
      vacia(caja);
      if (!x) { caja.hidden = true; return; }
      caja.hidden = false;
      if (x.fallo) { caja.appendChild(el('p', { class: 'font-body-sm text-body-sm text-error', role: 'alert', 'data-axw-comision': 'no-leida', text: T(ES_COM[12]) })); return; }
      var tiene = typeof x.v === 'number';
      var entrada = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', id: 'axw-comision-pct', 'data-axw-comision': 'pct', class: CLS_INPUT, style: 'max-width:10rem' });
      entrada.value = tiene ? pctTexto(x.v) : '';
      entrada.disabled = !x.escribe;
      var motivo = el('input', { type: 'text', autocomplete: 'off', id: 'axw-comision-motivo', 'data-axw-comision': 'motivo', maxlength: '300', class: CLS_INPUT });
      var est = el('p', { role: 'status', 'aria-live': 'polite', 'data-axw-comision': 'estado', class: 'font-body-sm text-body-sm text-on-surface-variant' });
      var g = el('button', { type: 'button', 'data-axw-comision': 'guardar', class: BTN1, style: 'min-height:44px;align-self:flex-start', text: T(ES_COM[4]) });
      caja.appendChild(el('label', { for: 'axw-comision-pct', class: 'font-label-md text-label-md text-on-surface', text: T(ES_COM[0]) }));
      caja.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: T(ES_COM[1]) }));
      caja.appendChild(entrada);
      if (!x.escribe) { caja.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', 'data-axw-comision': 'solo-lectura', text: T(ES_COM[10]) })); return; }
      caja.appendChild(el('label', { for: 'axw-comision-motivo', class: 'font-label-md text-label-md text-on-surface', text: T(ES_COM[3]) }));
      caja.appendChild(motivo);
      caja.appendChild(g);
      caja.appendChild(est);
      function dice(t, mal) { est.className = 'font-body-sm text-body-sm ' + (mal ? 'text-error' : 'text-on-surface-variant'); est.textContent = t; }
      g.addEventListener('click', function () {
        var n = pct(entrada.value);
        if (n === null) { dice(T(ES_COM[5]), true); entrada.focus(); return; }
        if (tiene && n === x.v) { dice(T(ES_COM[6]), true); return; }
        var args = { p_clave: 'cobros_comision_pct', p_valor: n };
        var m = motivo.value.trim();
        if (m) args.p_motivo = m;
        g.disabled = true; dice(S().ui('cargando'), false);
        var p;
        try { p = window.LW_SB.rpc('ajustes_config_guardar', args); } catch (e) { p = Promise.reject(e); }
        Promise.resolve(p).then(function (r) {
          g.disabled = false;
          if (r && !r.error) {
            lee().then(function (y) {
              if (!y || y.fallo) { tiene = true; x.v = n; dice(T(ES_COM[11]), false); return; }   // guardado: el bloque se queda y lo dice
              pintaCom(y); var e2 = caja.querySelector('[data-axw-comision="estado"]'); if (e2) { e2.textContent = T(ES_COM[7]); }
            });
            return;
          }
          var e = (r && r.error) || {};
          if (!e.code) { dice(T(ES_COM[8]), true); return; }
          if (e.hint === 'comision_no_valida') { dice(T(ES_COM[5]), true); entrada.focus(); return; }
          if (e.hint === 'motivo') { dice(T(ES_COM[2]), true); motivo.focus(); return; }
          dice(T(ES_COM[9]) + S().explica(e, true).texto, true);
        }, function () { g.disabled = false; dice(T(ES_COM[8]), true); });
      });
    }
    lee().then(pintaCom);
  }

  // ── Ajustes › Cobros: quién atiende las reservas del bot de WhatsApp, Dion o el ERP (B10, 14-oct-2026; contrato: edge ajustes-pagos, cabecera y
  // acción bot_backend; doble erp/plan_f3e2_doble_cobros.json → _notas_b10). Solo en la pestaña (el asistente y Configurar módulos no lo enseñan) y solo
  // si `estado` trae bot_backend con su forma: sin él (ERP sin la migración 20261014082000, o no se pudo leer) el bloque no sale y Cobros sigue igual.
  // Lo que NO hace (No te creas nada del front): no decide si se puede pasar al ERP (puede_erp y falta los da la base, que lo vuelve a mirar al
  // guardar), ni qué atiende de verdad el bot (efectivo). Cambiar pide motivo (≥ 3) y la contraseña de la cuenta, que vive solo en su <input> (.value) y
  // se vacía tras cada envío y en pagehide. Nunca se reenvía: si la respuesta se pierde (sin red, 5xx), se relee `estado` y se compara lo guardado.
  // Volver a Dion es idempotente (el mismo valor da cambiado:false sin pedir contraseña), así que reintentar a mano no hace daño.
  // Enganches: data-axw-bot-backend="…" (acciones y zonas), data-axw-campo (bot_motivo, bot_contrasena). Nunca un rótulo.
  var BOT_NOMBRE = { dion: 'Dion', erp: 'ERP' };   // un nombre y una sigla: no se traducen (como Xendit)
  var BOT_FALTA = /^[a-z0-9_-]{1,40}$/, BOT_MOTIVO_MAX = 200;
  function botValor(v) { return v === 'dion' || v === 'erp'; }   // nunca BOT_NOMBRE[v]: 'constructor' saldría «válido»
  /* La forma de bot_backend (la de botBackendDe en la edge): lo raro es null, y null = el bloque no sale. */
  function botForma(x) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
    if (!botValor(x.guardado) || !botValor(x.efectivo) || typeof x.puede_erp !== 'boolean' || !Array.isArray(x.falta)) return null;
    var u = x.ultimo_cambio && typeof x.ultimo_cambio === 'object' && !Array.isArray(x.ultimo_cambio) ? x.ultimo_cambio : null;
    return {
      guardado: x.guardado, efectivo: x.efectivo, puede_erp: x.puede_erp,
      falta: x.falta.filter(function (f) { return typeof f === 'string' && BOT_FALTA.test(f); }),
      ultimo_cambio: u ? { quien: corto(u.quien, 200), cuando: corto(u.cuando, 40), motivo: corto(u.motivo, 500) } : null
    };
  }
  function avisaBot(raiz, x) {
    try { raiz.dispatchEvent(new CustomEvent('axw-cobros-bot', { bubbles: true, detail: { bot: botForma(x) } })); } catch (e) { /* MUDO A PROPOSITO: sin CustomEvent el bloque del bot no sale y Cobros sigue igual */ }
  }
  function enlaceAsistente(m, paso) {   // el de ajustes_puesta.js: vuelve a Ajustes al terminar
    return location.pathname.replace(/ajustes\/.*$/, '') + 'ajustes/configurar/?modulo=' + encodeURIComponent(m) + '&paso=' + encodeURIComponent(paso) + '&vuelta=ajustes';
  }
  /* Lo que falta para poder elegir ERP → [{codigo, texto, enlace}]. Los pasos salen con su título del setup y, si el asistente sabe dónde están
     (datos.pasos de modulos_setup_estado, solo base y reservas-producto, como _bot_backend_falta), con su enlace. Un código sin frase sale con la
     frase digna del setup, nunca el código. Sin ningún código (no debería pasar con puede_erp false), una línea genérica: nunca una lista vacía. */
  function botFaltas(falta, pasos) {
    var lista = (falta || []).map(function (k) {
      if (k === 'modulo_no_activo') return { codigo: k, texto: C('bot_falta_modulo', { m: S().nombreModulo('reservas-producto') }), enlace: null };
      if (k === 'cobros') return { codigo: k, texto: C('bot_falta_cobros'), enlace: null };   // está en esta misma pestaña, arriba
      // claves bien puestas pero en modo prueba: los clientes reales recibirían facturas de prueba (también aquí arriba, sin enlace)
      if (k === 'cobros_modo_pruebas') return { codigo: k, texto: C('bot_falta_modo_pruebas'), enlace: null };
      if (k === 'setup_sin_sembrar') return { codigo: k, texto: T(S().TEXTOS.hint.setup_sin_sembrar), enlace: null };
      var de = (Array.isArray(pasos) ? pasos : []).filter(function (p) { return p && p.clave === k && (p.modulo === 'base' || p.modulo === 'reservas-producto'); });
      var p = de.filter(function (x) { return x.obligatorio && !x.hecho; })[0] || de[0];   // `usuarios` sale en cada módulo: el que está pendiente
      return { codigo: k, texto: S().texto('paso', k, 0), enlace: p ? enlaceAsistente(p.modulo, k) : null };
    });
    if (!lista.length) lista.push({ codigo: '', texto: T(S().TEXTOS.general.desconocido_falta), enlace: null });
    return lista;
  }
  /* Antes de mandar nada: lo que se sabe sin la base. '' = se puede mandar; si no, el código (los mismos de la edge, más sin_cambios). */
  function botValida(dato, valor, motivo, pass) {
    if (!botValor(valor)) return 'valor_no_valido';
    if (valor === dato.guardado) return 'sin_cambios';
    if (valor === 'erp' && !dato.puede_erp) return 'bot_backend_no_listo';
    var m = String(motivo == null ? '' : motivo).trim();
    if (m.length < 3) return 'motivo';
    if (m.length > BOT_MOTIVO_MAX || /[\u0000-\u001f\u007f]/.test(m)) return 'motivo_no_valido';
    if (!pass) return 'reautenticar';
    return '';
  }
  /* El cuerpo: SOLO los cuatro campos que admite la edge (otro → 400 campo_no_admitido). */
  function botCuerpo(valor, motivo, pass) { return { accion: 'bot_backend', valor: valor, motivo: String(motivo == null ? '' : motivo).trim(), contrasena: String(pass || '') }; }
  function botTexto(codigo) {
    if (codigo === 'sin_cambios') return C('bot_sin_cambios');
    if (codigo === 'motivo') return S().ui('motivo_corto');
    if (codigo === 'motivo_no_valido') return C('bot_motivo_largo');
    if (codigo === 'bot_backend_no_listo') return C('bot_no_listo');
    // un fallo de esta pantalla (lo que manda no lo admite la edge): la frase genérica de «avisa al estudio», sin el código
    if (codigo === 'valor_no_valido' || codigo === 'campo_no_admitido') return T(S().TEXTOS.general.error_codigo);
    return textoError(codigo);   // reautenticar, clave_actual_incorrecta, demasiados_intentos, base_no_responde, sin_sesion, sin_red…: los de Cobros
  }
  /* El envío y su máquina de duda → {tipo, bot?, falta?, codigo?}:
       cambiado (bot nuevo) · igual (ya estaba así; cambiado:false) · sin_releer (guardado, pero sin poder volver a leerlo) · no_listo (409, falta) ·
       error (4xx con código: no se guardó) · y si la respuesta se pierde (sin red, gateway sin respuesta propia, 5xx): se relee estado SIN reenviar →
       cambiado (lo guardado es lo mandado) · duda_no (no consta: lo guardado es otra cosa) · duda (no se pudo ni releer). Una sola petición bot_backend. */
  function botEnvia(valor, motivo, pass, llamaFn) {
    var f = llamaFn || llama;
    var perdida = function () { return { status: 0, codigo: 'sin_red', d: null }; };
    return Promise.resolve().then(function () { return f(botCuerpo(valor, motivo, pass)); }).then(null, perdida).then(function (res) {
      res = res || perdida();
      if (res.d && res.d.ok === true) {
        var b = botForma(res.d.bot_backend);
        if (res.d.cambiado === true) return b ? { tipo: 'cambiado', bot: b } : { tipo: 'sin_releer' };
        return { tipo: 'igual', bot: b };
      }
      if (res.status === 409 && res.codigo === 'bot_backend_no_listo') {
        return { tipo: 'no_listo', falta: res.d && Array.isArray(res.d.falta) ? res.d.falta.filter(function (x) { return typeof x === 'string' && BOT_FALTA.test(x); }) : [] };
      }
      // Duda = la petición pudo llegar y no se sabe qué hizo. No hay duda (es un error, no se guardó) si no llegó a salir (sin URL de la edge: status 0)
      // o si la puerta la rechazó antes de la función (404, 401, 403): «no se sabe» ahí congelaría el bloque cuando seguro que no se guardó (revisor 14-oct).
      var noSalio = (res.codigo === 'edge_no_disponible' && res.status === 0) || res.status === 404 || res.status === 401 || res.status === 403;
      var duda = !noSalio && (res.codigo === 'sin_red' || res.codigo === 'edge_no_disponible' || res.codigo === 'respuesta_ilegible' || res.status >= 500);
      if (!duda) return { tipo: 'error', codigo: res.codigo || 'respuesta_ilegible' };
      return Promise.resolve().then(function () { return f({ accion: 'estado' }); }).then(function (r2) {
        var b2 = r2 && r2.d && r2.d.ok === true ? botForma(r2.d.bot_backend) : null;
        if (!b2) return { tipo: 'duda' };
        return b2.guardado === valor ? { tipo: 'cambiado', bot: b2 } : { tipo: 'duda_no', bot: b2 };
      }, function () { return { tipo: 'duda' }; });
    });
  }
  window.addEventListener('pagehide', function () {   // la contraseña del bloque del bot (limpia() solo recorre las cajas del componente)
    document.querySelectorAll('[data-axw-bot-backend="bloque"] input[type="password"]').forEach(function (i) { i.value = ''; });
  });

  /* El bloque, en `cont` (la pestaña lo crea). dato = botForma(...) válido; pasos = datos.pasos del setup (para los enlaces). */
  function bloqueBot(cont, dato, pasos) {
    var n = String(++nCaja), st = { valor: dato.guardado, motivo: '', enviando: false, cerrado: false };
    var NOTA = 'font-body-sm text-body-sm text-on-surface-variant';
    function listaFaltas(falta) {
      var ul = el('ul', { class: 'flex flex-col gap-2', style: 'list-style:none;margin:0;padding:0', 'data-axw-bot-backend': 'falta-lista' });
      botFaltas(falta, pasos).forEach(function (x) {
        var li = el('li', { class: 'flex flex-col md:flex-row md:items-center gap-2 min-w-0', 'data-axw-bot-falta': x.codigo || 'otro' },
          [el('span', { class: 'font-body-md text-body-md break-words', style: 'overflow-wrap:anywhere', text: x.texto })]);
        if (x.enlace) li.appendChild(el('a', { href: x.enlace, class: BTN_PEQ + ' self-start', style: 'min-height:44px', 'data-axw-bot-backend': 'configurar-' + x.codigo, text: S().ui('configurar_m', { m: x.texto }) }));
        ul.appendChild(li);
      });
      return ul;
    }
    function dibujaBot(msg, mal) {
      vacia(cont);
      cont.hidden = false;
      cont.appendChild(el('h3', { class: 'font-label-md text-label-md text-on-surface', text: C('bot_titulo') }));
      cont.appendChild(el('p', { class: 'font-body-md text-body-md text-deep-lagoon', 'data-axw-bot-backend': 'efectivo', 'data-axw-bot-efectivo': dato.efectivo,
                                 text: dato.efectivo === 'erp' ? C('bot_ahora_erp') : C('bot_ahora_dion') }));
      // guardado ERP pero el bot va con Dion: la base lo baja sola (módulo apagado o Cobros sin configurar) y aquí se dice por qué
      var bajado = dato.guardado === 'erp' && dato.efectivo === 'dion';
      if (bajado) {
        cont.appendChild(el('div', { role: 'note', class: 'rounded-xl border bg-error-container text-on-error-container px-4 py-3 flex flex-col gap-2', style: 'border-color:rgb(var(--tema-error))', 'data-axw-bot-backend': 'aviso' },
          [el('p', { class: 'font-body-md text-body-md', text: C('bot_aviso_efectivo') }), listaFaltas(dato.falta)]));
      }
      // Elegir: ERP no se puede elegir como CAMBIO si la base dice que falta algo (si ya es lo guardado, elegirlo es «sin cambios» y se deja)
      var fs = el('fieldset', { class: 'flex flex-col gap-2', style: 'min-width:0', 'data-axw-bot-backend': 'elegir' },
        [el('legend', { class: 'font-label-md text-label-md text-on-surface', style: 'margin-bottom:8px', text: C('bot_elige') })]);
      var seg = el('div', { class: 'flex flex-col md:flex-row gap-2', role: 'radiogroup' });
      ['dion', 'erp'].forEach(function (v) {
        var on = st.valor === v, bloqueado = v === 'erp' && !dato.puede_erp && dato.guardado !== 'erp';
        var b = el('button', { type: 'button', 'data-real': '', role: 'radio', 'aria-checked': on ? 'true' : 'false', 'data-axw-bot-backend': 'valor-' + v,
                               class: 'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-label-md text-label-md ' + (on ? 'bg-primary-container text-on-primary' : 'border border-outline-variant text-deep-lagoon'),
                               style: 'min-height:44px' + (bloqueado ? ';opacity:.5' : ''), text: BOT_NOMBRE[v] });
        if (bloqueado || st.enviando || st.cerrado) b.disabled = true;
        b.addEventListener('click', function () { if (st.enviando || st.cerrado) return; st.valor = v; marca(); });
        seg.appendChild(b);
      });
      fs.appendChild(seg);
      if (!dato.puede_erp && !bajado) {   // qué falta: para poder elegir ERP, o (ya en ERP) para poder volver a él si se pasa a Dion
        fs.appendChild(el('div', { class: 'flex flex-col gap-2', 'data-axw-bot-backend': 'falta' },
          [el('p', { class: NOTA, text: dato.guardado === 'erp' ? C('bot_falta_volver') : C('bot_falta_elegir') }), listaFaltas(dato.falta)]));
      }
      cont.appendChild(fs);
      // motivo y contraseña (solo cuentan si cambia; la contraseña vive en su <input> y nada más)
      var idm = 'axw-bot-motivo-' + n, idp = 'axw-bot-pass-' + n;
      var mot = el('input', { id: idm, type: 'text', autocomplete: 'off', maxlength: String(BOT_MOTIVO_MAX), 'data-axw-campo': 'bot_motivo', class: CLS_INPUT });
      mot.style.maxWidth = '100%';
      mot.value = st.motivo;
      mot.addEventListener('input', function () { st.motivo = mot.value; });
      cont.appendChild(el('div', { class: 'flex flex-col gap-1.5' }, [el('label', { for: idm, class: 'font-label-md text-label-md text-on-surface', text: S().ui('motivo') }), mot,
        el('span', { class: NOTA, text: S().ui('motivo_ayuda') })]));
      var pass = el('input', { id: idp, type: 'password', autocomplete: 'current-password', 'data-axw-campo': 'bot_contrasena', class: CLS_INPUT });
      pass.style.maxWidth = '100%';
      cont.appendChild(el('div', { class: 'flex flex-col gap-1.5' }, [el('label', { for: idp, class: 'font-label-md text-label-md text-on-surface', text: C('contrasena') }), pass,
        el('span', { class: NOTA, text: C('bot_contrasena_d') })]));
      if (st.enviando || st.cerrado) { mot.disabled = true; pass.disabled = true; }
      var g = el('button', { type: 'button', 'data-real': '', 'data-axw-bot-backend': 'guardar', class: BTN1, style: 'min-height:44px', text: S().ui('guardar') });
      g.disabled = st.enviando || st.cerrado;
      cont.appendChild(g);
      var est = el('p', { role: 'status', 'aria-live': 'polite', 'data-axw-bot-backend': 'mensaje', class: 'font-body-sm text-body-sm ' + (mal ? 'text-error' : 'text-on-surface-variant'), text: msg || '' });
      cont.appendChild(est);
      g.addEventListener('click', function () { guarda(mot, pass, est); });
      // lo fijo: cuánto tarda en notarse, cómo volver y lo que esta pantalla no ve
      var notas = el('ul', { class: 'flex flex-col gap-1.5', style: 'list-style:none;margin:0;padding:0', 'data-axw-bot-backend': 'notas' });
      ['bot_nota_cotizacion', 'bot_nota_enlace', 'bot_nota_volver', 'bot_nota_freno'].forEach(function (k) { notas.appendChild(el('li', { class: NOTA, 'data-axw-bot-nota': k.replace('bot_nota_', ''), text: C(k) })); });
      cont.appendChild(notas);
      // el último cambio (texto de una persona: siempre textContent, y el motivo fuera de la frase con huecos)
      var u = dato.ultimo_cambio, ult = el('div', { class: 'flex flex-col gap-1 min-w-0', 'data-axw-bot-backend': 'ultimo' });
      if (u) {
        var cuando = u.cuando && fecha(u.cuando) ? fecha(u.cuando) + ' · ' + hora(u.cuando) : '—';
        ult.appendChild(el('p', { class: NOTA + ' break-words', style: 'overflow-wrap:anywhere', text: u.quien ? C('bot_ultimo', { f: cuando, p: u.quien }) : C('bot_ultimo_sin_quien', { f: cuando }) }));
        if (u.motivo) ult.appendChild(el('p', { class: NOTA + ' break-words', style: 'overflow-wrap:anywhere' }, [el('span', { text: C('bot_motivo_label') + ' ' }), el('span', { 'data-axw-bot-backend': 'ultimo-motivo', text: u.motivo })]));
      } else ult.appendChild(el('p', { class: NOTA, text: C('bot_nunca') }));
      cont.appendChild(ult);
    }
    function marca() {   // cambiar de opción no repinta: lo tecleado (y la contraseña) se queda
      cont.querySelectorAll('[role="radio"]').forEach(function (b) {
        var on = b.getAttribute('data-axw-bot-backend') === 'valor-' + st.valor;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.className = 'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-label-md text-label-md ' + (on ? 'bg-primary-container text-on-primary' : 'border border-outline-variant text-deep-lagoon');
      });
    }
    function guarda(mot, pass, est) {
      if (st.enviando || st.cerrado) return;
      var v = st.valor, m = mot.value, p = pass.value;
      var c = botValida(dato, v, m, p);
      if (c) {
        est.className = 'font-body-sm text-body-sm text-error'; est.textContent = botTexto(c);
        if (c === 'motivo' || c === 'motivo_no_valido') mot.focus(); else if (c === 'reautenticar') pass.focus();
        return;
      }
      st.enviando = true; st.motivo = m;
      pass.value = ''; p = String(p);   // fuera del DOM en cuanto sale; va solo en el cuerpo de esta petición
      dibujaBot(S().ui('cargando'), false);
      botEnvia(v, m, p, null).then(function (r) {
        p = '';
        st.enviando = false;
        if ((r.tipo === 'cambiado' || r.tipo === 'igual' || r.tipo === 'duda_no') && r.bot) { dato = r.bot; st.valor = dato.guardado; }
        if (r.tipo === 'cambiado') { st.motivo = ''; return dibujaBot(S().ui('guardado'), false); }
        if (r.tipo === 'igual') { st.motivo = ''; return dibujaBot(C('bot_igual'), false); }
        if (r.tipo === 'no_listo') {
          dato = { guardado: dato.guardado, efectivo: dato.efectivo, puede_erp: false, falta: r.falta, ultimo_cambio: dato.ultimo_cambio };
          st.valor = dato.guardado;
          return dibujaBot(C('bot_no_listo'), true);
        }
        if (r.tipo === 'duda_no') return dibujaBot(C('bot_duda_no'), true);
        // sin_releer o duda: no se sabe qué hay guardado; el bloque se queda quieto hasta recargar (lo de arriba ya no es de fiar)
        if (r.tipo === 'sin_releer' || r.tipo === 'duda') { st.cerrado = true; return dibujaBot(r.tipo === 'duda' ? C('bot_duda') : C('bot_sin_releer'), r.tipo === 'duda'); }
        dibujaBot(botTexto(r.codigo), true);
        var foco = r.codigo === 'motivo' || r.codigo === 'motivo_no_valido' ? '[data-axw-campo="bot_motivo"]' : (r.codigo === 'reautenticar' || r.codigo === 'clave_actual_incorrecta' ? '[data-axw-campo="bot_contrasena"]' : '');
        var fe = foco && cont.querySelector(foco); if (fe) fe.focus();
      });
    }
    dibujaBot('', false);
  }
  window.AXW_COBROS.bot = { forma: botForma, faltas: botFaltas, valida: botValida, cuerpo: botCuerpo, texto: botTexto, envia: botEnvia, bloque: bloqueBot };

  // ── Ajustes › Cobros: la pestaña (build.py pone data-lw-tab="cobros" oculto y su panel #lw-aj-cobros) ─────────────────────────────────────
  // Sale solo si la base declara el paso «cobros» (puede_configurar) o, para quien no configura, si el módulo de reservas está encendido.
  // El componente se monta al ABRIR la pestaña, nunca al cargar /ajustes/.
  function anfitrion() {
    var panel = document.getElementById('lw-aj-cobros'), tab = document.querySelector('[data-lw-tab="cobros"]');
    if (!panel || !tab || !S()) return;
    var datos = null, montado = false;
    function abierta() { var p = panel.closest('[data-lw-panel]'); return !!p && !p.hidden && location.hash.replace('#', '') === 'cobros'; }
    function monta() {
      if (montado || !datos || !abierta()) return;
      montado = true;
      vacia(panel);
      comision(panel.closest('[data-lw-panel]'));   // una vez: el bloque va FUERA de #lw-aj-cobros, que se vacía en cada vuelta
      // el bloque del bot (B10) también va fuera, justo detrás del panel: se rehace en cada vuelta con lo que traiga el `estado` nuevo
      var botViejo = panel.parentNode && panel.parentNode.querySelector('[data-axw-bot-backend="bloque"]');
      if (botViejo) botViejo.parentNode.removeChild(botViejo);
      if (!datos.puede_configurar) {   // S90 «A module that isn't ready»: sin pasos, sin llamar a la edge
        var m = datos.modulos.filter(function (x) { return x.modulo === 'reservas-producto'; })[0];
        var listo = m && m.estado === 'configurado';
        panel.appendChild(el('div', { class: 'rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-5 flex flex-col gap-2', style: 'margin:12px clamp(16px,3vw,32px)', 'data-axw-cobros-operario': listo ? 'solo_principal' : 'no_listo' }, [
          el('p', { class: 'font-label-md text-label-md text-on-surface', text: listo ? C('solo_principal') : T(S().TEXTOS.general.nota_titulo) }),
          listo ? null : el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: T(S().TEXTOS.general.nota_texto) })]));
        return;
      }
      var paso = datos.pasos.filter(function (p) { return p.clave === 'cobros'; })[0];
      // S10 (owner 15-oct: «si le doy a change aquí… me abra un pop up con la info»): en la pestaña, el estado del paso y UN botón; el componente
      // va en la ventana común (AXW_SETUP.ventana), montado ya y cerrado: una sola llamada a `estado`, y el bloque del bot sale sin abrirla
      var hecho = !!(paso && paso.hecho);
      var abrir = boton(hecho ? S().ui('cambiar') : S().texto('general', 'configurar'), 'host-abrir', hecho ? BTN2 : BTN1);
      abrir.setAttribute('data-axw-cobros-host', 'abrir');
      panel.appendChild(el('div', { class: 'rounded-2xl border border-outline-variant px-5 py-5 flex flex-col md:flex-row md:items-center justify-between gap-3',
        style: 'margin:12px clamp(16px,3vw,32px)', 'data-axw-cobros-host': 'resumen' }, [
        el('div', { class: 'flex flex-col gap-1 min-w-0' }, [
          el('span', { class: 'font-label-md text-label-md text-on-surface', text: S().texto('paso', 'cobros', 0) }),
          el('span', { class: 'font-body-sm text-body-sm text-on-surface-variant break-words',
            text: !hecho && paso && paso.falta ? S().textoFalta(paso.falta) : S().texto('paso', 'cobros', 1) })]),
        el('div', { class: 'flex items-center gap-3' }, [
          el('span', { class: 'shrink-0 px-3 py-1 rounded-full font-label-md text-[13px] ' + (hecho ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'),
            'data-axw-cobros-hecho': hecho ? '1' : '0', text: S().ui(hecho ? 'hecho' : 'pendiente') }), abrir])]));
      var cuerpo = el('div', { class: 'flex flex-col gap-5' });
      var bot = el('div', { 'data-axw-bot-backend': 'bloque', class: 'rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-5 flex flex-col gap-4',
        style: 'margin:0 clamp(16px,3vw,32px) 24px;min-width:0' });
      bot.hidden = true;
      if (panel.parentNode) panel.parentNode.insertBefore(bot, panel.nextSibling);
      // lo avisa pinta() con cada `estado` (también al reintentar tras un fallo): null = no sale
      cuerpo.addEventListener('axw-cobros-bot', function (ev) {
        var b = ev.detail && ev.detail.bot;
        if (!b) { vacia(bot); bot.hidden = true; return; }
        bloqueBot(bot, b, datos.pasos);
      });
      var ctl = pinta(cuerpo, { paso: paso, datos: datos });
      var g = boton(C('probar_guardar'), 'host-guardar', BTN1);
      g.setAttribute('data-axw-cobros-host', 'guardar');
      var guardando = false;
      var v = S().ventana({ padre: panel, marca: ['data-axw-cobros-ventana', '1'], cuerpo: cuerpo, cls2: BTN2, conserva: true,
        titulo: C('titulo'), ayuda: C('lead'), botones: [g],
        ocupado: function () { return guardando; },
        alCerrar: function () { ctl.descarta(); },   // lo escrito sale de los <input> y de la memoria del componente
        vuelta: function () { return abrir; } });
      var est = v.estado;
      est.setAttribute('data-axw-cobros-host', 'estado');
      abrir.addEventListener('click', function () { v.abre(); });
      g.hidden = true;
      cuerpo.addEventListener('axw-cobros-fase', function (ev) { g.hidden = !(ev.detail && ev.detail.fase === 'codigo'); if (g.hidden) est.textContent = ''; });
      g.addEventListener('click', function () {
        var r = ctl.valores();
        if (!r.ok) { est.className = 'font-body-sm text-body-sm text-error'; est.textContent = r.error; return; }
        g.disabled = true; guardando = true; est.className = 'font-body-sm text-body-sm text-on-surface-variant'; est.textContent = S().ui('cargando');
        guarda(null, r.v, { paso: paso, datos: datos }).then(function (res) {
          g.disabled = false; guardando = false;
          if (res.ok) {   // se relee todo: lo que se ve lo dice la base (la ventana se cierra; monta() la rehace cerrada)
            v.cierra(true);
            S().estado(true).then(function (e) { if (e.ok) datos = e.datos; montado = false; monta(); });
            return;
          }
          est.className = 'font-body-sm text-body-sm text-error';
          est.textContent = S().ui('no_se_guardo', { e: S().explica(res.error, true).texto });
        }).catch(function () {   // un rechazo no deja la ventana sin salida (no se puede cerrar mientras `guardando`)
          g.disabled = false; guardando = false;
          est.className = 'font-body-sm text-body-sm text-error'; est.textContent = S().ui('no_mirar');
        });
      });
    }
    S().estado().then(function (r) {
      if (!r.ok) return;
      var d = r.datos;
      var ve = d.puede_configurar ? d.pasos.some(function (p) { return p.clave === 'cobros'; })
                                  : d.modulos.some(function (m) { return m.modulo === 'reservas-producto'; });
      if (!ve) return;
      datos = d;
      tab.hidden = false;
      if (typeof window.lwIdiomaAplicar === 'function') {   // los rótulos fijos (data-lwt) que puso build.py, con las frases de setup_modulos.js
        try { window.lwIdiomaAplicar(tab); window.lwIdiomaAplicar(panel.closest('[data-lw-panel]') || panel); } catch (e) { /* MUDO A PROPOSITO: traducir no tumba la pestaña */ }
      }
      // Se monta cuando ajustes.js ENSEÑA el panel (quita hidden), sea por clic, por flechas o por la URL. ajustes.js abrió la página con la pestaña
      // aún oculta y, con #cobros en la URL, cayó en «empresa»: se le vuelve a pedir ahora que ya se ve (con el hash igual, activa sin recargar).
      var sec = panel.closest('[data-lw-panel]');
      if (sec && typeof MutationObserver === 'function') new MutationObserver(monta).observe(sec, { attributes: true, attributeFilter: ['hidden'] });
      window.addEventListener('hashchange', monta);
      if (location.hash === '#cobros' && sec && sec.hidden) tab.click();
      monta();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', anfitrion); else anfitrion();
})();
