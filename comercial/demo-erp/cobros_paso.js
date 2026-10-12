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
 */
(function () {
  'use strict';
  var CAMPOS = ['creacion', 'lectura', 'aviso'];
  var CLS_INPUT = 'w-full rounded-lg border border-control-border/50 bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md';
  var BTN1 = 'inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md axw-btn';
  var BTN2 = 'inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-outline-variant text-deep-lagoon font-label-md text-label-md axw-btn';
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
  // módulos); live_no_permitido es un hint de la BASE (erp/modulos.py SETUP_HINTS) y va tal cual. Un código sin frase sale «(código: x)».
  function errorDe(codigo) {
    if (codigo === 'sin_red') return { message: 'Failed to fetch' };
    return { code: codigo, hint: codigo === 'live_no_permitido' ? codigo : 'cobros_' + codigo, message: '' };
  }
  function textoError(codigo) { return S().explica(errorDe(codigo), true).texto; }

  // La forma de `estado` (cobros_estado() de la base, sin secretos). Una forma rara es un error, nunca «configurado».
  function estadoValido(e) {
    if (!e || typeof e !== 'object' || typeof e.configurado !== 'boolean' || !e.claves || typeof e.claves !== 'object') return false;
    if (e.modo != null && e.modo !== 'test' && e.modo !== 'live') return false;
    return CAMPOS.every(function (k) { var c = e.claves[k]; return c && typeof c.configurada === 'boolean'; });
  }

  // ── Lo que dura el cambio (solo en memoria de esta página) ─────────────────────────────────────────────────────────────────────────────
  // M = {est, pideCodigo, modo, reemplaza: {k: bool}, valores: {k: texto}, fase: 'editar'|'codigo', mandadas, correo, fallo, faltan, aviso, confirma}
  var M = null, ultimo = null, cajas = [], nCaja = 0;
  function limpia() {
    if (M) { M.valores = {}; M.mandadas = null; M.codigo = ''; }
    cajas.forEach(function (c) { c.querySelectorAll('input').forEach(function (i) { if (i.type === 'password' || i.getAttribute('data-axw-campo') === 'codigo') i.value = ''; }); });
  }
  window.addEventListener('pagehide', function () {
    limpia();
    if (M) { M.fase = 'editar'; M.correo = ''; M.codigo = ''; M.confirma = ''; }
  });
  window.addEventListener('pageshow', function (ev) {   // vuelta desde la caché del navegador: se repinta con lo vaciado
    if (!ev.persisted || !M || !M.est) return;
    cajas.forEach(function (c) { if (document.body.contains(c)) dibuja(c); });
  });

  function nuevoM(est, pide) {
    var r = {};
    CAMPOS.forEach(function (k) { r[k] = !est.claves[k].configurada; });
    return { est: est, pideCodigo: pide, modo: est.modo || 'test', reemplaza: r, valores: {}, fase: 'editar', mandadas: null, correo: '', codigo: '', fallo: null, faltan: [], aviso: '', confirma: '' };
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
      }
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
    if (ultimo && ultimo.avisado) raiz.appendChild(el('p', { class: 'font-body-sm text-body-sm text-outline', text: C('avisado') }));
    if (!M.pideCodigo) {   // sin confirmación por código no hay cambio posible: se dice y no se ofrece nada (contrato: pide_codigo=false)
      raiz.appendChild(el('p', { role: 'alert', class: 'font-body-md text-body-md text-error', 'data-axw-cobros-error': 'codigo_no_disponible', text: textoError('codigo_no_disponible') }));
    }

    // Proveedor: solo el que da la base (hoy Xendit). El nombre es una marca: no se traduce.
    var prov = el('fieldset', { class: 'flex flex-col gap-2' }, [el('legend', { class: 'font-label-md text-label-md text-on-surface', style: 'margin-bottom:8px', text: C('proveedor') })]);
    prov.appendChild(el('div', { class: 'rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 flex flex-col gap-1', 'data-axw-cobros-proveedor': est.proveedor === 'xendit' ? 'xendit' : 'otro' }, [
      el('span', { class: 'font-label-md text-label-md text-deep-lagoon', text: est.proveedor === 'xendit' ? 'Xendit' : corto(String(est.proveedor || ''), 40) }),
      el('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: C('xendit_d') })]));
    raiz.appendChild(prov);

    // Modo: la intención del cliente. El de las claves guardadas lo dice la base (estado.modo).
    var modo = el('fieldset', { class: 'flex flex-col gap-2', 'data-axw-cobros-modo': M.modo }, [el('legend', { class: 'font-label-md text-label-md text-on-surface', style: 'margin-bottom:8px', text: C('modo') })]);
    var seg = el('div', { class: 'flex flex-col md:flex-row gap-2', role: 'radiogroup' });
    [['test', C('modo_test')], ['live', C('modo_live')]].forEach(function (o) {
      var on = M.modo === o[0], bloqueado = o[0] === 'live' && est.live_permitido !== true;
      var b = el('button', { type: 'button', 'data-real': '', role: 'radio', 'aria-checked': on ? 'true' : 'false', 'data-axw-cobros': 'modo-' + o[0],
                             class: 'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-label-md text-label-md ' + (on ? 'bg-primary-container text-on-primary' : 'border border-outline-variant text-deep-lagoon'),
                             style: 'min-height:44px' + (bloqueado ? ';opacity:.5' : ''), text: o[1] });
      if (o[0] === 'live') b.appendChild(el('span', { class: 'px-2 py-0.5 rounded-full font-label-md text-[12px] bg-error-container text-on-error-container', text: C('dinero_real') }));
      if (bloqueado || !editar) b.disabled = true;
      b.addEventListener('click', function () { if (M.fase !== 'editar') return; M.modo = o[0]; M.confirma = ''; fuerzaModo(); M.aviso = ''; dibuja(raiz); });
      seg.appendChild(b);
    });
    modo.appendChild(seg);
    if (est.live_permitido !== true) modo.appendChild(el('p', { class: 'font-body-sm text-body-sm text-outline', 'data-axw-cobros-live': 'no_permitido', text: textoError('live_no_permitido') }));
    if (M.modo === 'live') modo.appendChild(el('p', { role: 'note', class: 'rounded-xl border border-error bg-error-container text-on-error-container px-4 py-3 font-body-md text-body-md', 'data-axw-cobros-live': 'aviso', text: C('live_aviso') }));
    if (est.modo) modo.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', 'data-axw-cobros-modo-guardado': est.modo, text: C('modo_guardado', { m: nombreModo(est.modo) }) }));
    raiz.appendChild(modo);

    // Una fila por clave: guardada («Configurada el…», Reemplazar) o campo secreto
    CAMPOS.forEach(function (k) { raiz.appendChild(filaClave(raiz, k, editar)); });

    // Confirmación expresa de pasar a modo REAL (S90 «No way back»): se teclea LIVE. La garantía es la base (live_permitido + prefijo).
    if (editar && M.modo === 'live' && est.modo !== 'live' && est.live_permitido === true) {
      var idc = 'axw-cb-live-' + raiz.getAttribute('data-axw-cobros-caja');
      var conf = el('input', { id: idc, type: 'text', autocomplete: 'off', spellcheck: 'false', 'data-axw-campo': 'confirma_live', class: CLS_INPUT });
      conf.value = M.confirma || '';
      conf.addEventListener('input', function () { M.confirma = conf.value; });
      raiz.appendChild(el('div', { class: 'flex flex-col gap-1.5' }, [el('label', { for: idc, class: 'font-label-md text-label-md text-on-surface', text: S().ui('teclea', { v: 'LIVE' }) }), conf]));
    }

    var hayCampos = CAMPOS.some(function (k) { return !est.claves[k].configurada || M.reemplaza[k]; });
    if (M.pideCodigo && (hayCampos || !editar)) {   // con todo guardado y nada que reemplazar no hay nada que pedir
      if (editar) {
        var pedir = boton(C('pedir'), 'pedir', BTN2 + ' self-start');
        pedir.addEventListener('click', function () { pideCodigo(raiz, pedir); });
        raiz.appendChild(pedir);
      } else pintaCodigo(raiz);
    }
    raiz.appendChild(el('p', { role: 'alert', class: 'font-body-sm text-body-sm text-error', 'data-axw-cobros-error': M.aviso ? 'aviso' : '', text: M.aviso || '' }));
    raiz.appendChild(el('p', { class: 'font-body-sm text-body-sm text-outline', text: C('prueba_nota') }));
    if (typeof est.intentos_recientes === 'number' && typeof est.intentos_max === 'number' && est.intentos_recientes > 0) {
      raiz.appendChild(el('p', { class: 'font-body-sm text-body-sm text-outline', 'data-axw-cobros-intentos': String(est.intentos_recientes),
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
          c.puesta_por ? el('span', { class: 'font-body-sm text-body-sm text-outline break-words', text: C('puesta_por', { p: corto(c.puesta_por, 120) }) }) : null])]);
      if (editar && M.pideCodigo) {
        var r = boton(C('reemplazar'), 'reemplazar-' + k, BTN_PEQ + ' self-start');
        r.addEventListener('click', function () { M.reemplaza[k] = true; M.aviso = ''; dibuja(raiz); var i = raiz.querySelector('[data-axw-campo="' + k + '"]'); if (i) i.focus(); });
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
      fila.appendChild(el('span', { class: 'font-body-sm text-body-sm text-outline', text: C(k + '_d') + ' ' + C('pega') }));
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
    if (M.modo === 'live' && M.est.modo !== 'live' && String(M.confirma || '').trim().toUpperCase() !== 'LIVE') { M.aviso = S().ui('no_coincide'); dibuja(raiz); return; }
    btn.disabled = true;
    btn.textContent = S().ui('cargando');
    var cuerpo = { accion: 'pedir_codigo' };
    Object.keys(r.v).forEach(function (k) { cuerpo[k] = r.v[k]; });
    llama(cuerpo).then(function (res) {
      if (res.d && res.d.ok === true && res.codigo === 'codigo_enviado') {
        M.fase = 'codigo'; M.mandadas = r.v; M.codigo = ''; M.correo = corto(res.d.correo_enmascarado, 120); M.aviso = '';
        dibuja(raiz);
        var c = raiz.querySelector('[data-axw-campo="codigo"]'); if (c) c.focus();
        return;
      }
      M.aviso = textoError(res.codigo || 'respuesta_ilegible');
      if (res.d && Array.isArray(res.d.campos)) M.faltan = res.d.campos.filter(function (k) { return CAMPOS.indexOf(k) >= 0; });
      if (res.d && CAMPOS.indexOf(res.d.campo) >= 0) M.faltan = [res.d.campo];
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
      el('span', { class: 'font-body-sm text-body-sm text-outline', text: C('contrasena_d') })]));
    var otra = boton(C('volver_a_escribir'), 'reescribir', BTN_PEQ + ' self-start');
    otra.addEventListener('click', function () { M.fase = 'editar'; M.mandadas = null; M.correo = ''; M.codigo = ''; M.aviso = ''; dibuja(raiz); });
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
    cuerpo.codigo = String((raiz.querySelector('[data-axw-campo="codigo"]') || {}).value || '').trim();
    cuerpo.contrasena_actual = String((raiz.querySelector('[data-axw-campo="contrasena"]') || {}).value || '');
    var antes = M.est, mandadas = Object.keys(M.mandadas);
    return llama(cuerpo).then(function (res) {
      cuerpo = null;
      if (res.d && res.d.ok === true && res.d.guardado === true) return exito(res.d.estado, res.d.aviso === 'enviado');
      // ¿llegó? Sin red, un 5xx/404 del gateway sin respuesta propia, o un 5xx de la edge que puede llegar con la promoción ya hecha
      // (base_no_responde al promover; un tiempo agotado tras dos pruebas a Xendit de 8 s y el aviso): se relee, nunca se reenvía.
      // Fuera de la duda, los 5xx que la edge da ANTES de guardar nada: proveedor_no_responde (candidato descartado), envíos en pausa, sin código.
      var seguroNo = { proveedor_no_responde: 1, envios_pausados: 1, codigo_no_disponible: 1, codigo_no_enviado: 1 };
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
      // el código ya no sirve o va atado a otro cambio: se vuelve a escribir y a pedir (las claves tecleadas se quedan)
      if (res.codigo === 'codigo_no_valido' || res.codigo === 'prueba_caducada' || res.codigo === 'prueba_fallida' || res.codigo === 'demasiados_intentos') { M.fase = 'editar'; M.mandadas = null; M.correo = ''; M.codigo = ''; }
      return fallo(res.codigo || 'respuesta_ilegible');
    });
    function exito(est, avisado) {
      ultimo = { modo: est && est.modo, hora: Date.now(), avisado: avisado };
      limpia(); M = null;
      return { ok: true };
    }
    function fallo(codigo) {
      if (M) M.aviso = textoError(codigo);
      if (M && M.est && raiz && document.body.contains(raiz)) dibuja(raiz);   // la contraseña no se vuelve a poner: el campo nace vacío
      return { ok: false, sinRespuesta: false, error: errorDe(codigo) };
    }
  }

  var COMP = { pinta: pinta, guarda: guarda, sinMotivo: true };
  if (window.AXW_PASOS && typeof window.AXW_PASOS.registra === 'function') window.AXW_PASOS.registra('cobros', COMP);
  window.AXW_COBROS = { componente: COMP };

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
      if (!datos.puede_configurar) {   // S90 «A module that isn't ready»: sin pasos, sin llamar a la edge
        var m = datos.modulos.filter(function (x) { return x.modulo === 'reservas-producto'; })[0];
        var listo = m && m.estado === 'configurado';
        panel.appendChild(el('div', { class: 'rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-5 flex flex-col gap-2', style: 'margin:12px clamp(16px,3vw,32px)', 'data-axw-cobros-operario': listo ? 'solo_principal' : 'no_listo' }, [
          el('p', { class: 'font-label-md text-label-md text-on-surface', text: listo ? C('solo_principal') : T(S().TEXTOS.general.nota_titulo) }),
          listo ? null : el('p', { class: 'font-body-sm text-body-sm text-outline', text: T(S().TEXTOS.general.nota_texto) })]));
        return;
      }
      var paso = datos.pasos.filter(function (p) { return p.clave === 'cobros'; })[0];
      var cuerpo = el('div', { class: 'flex flex-col gap-5', style: 'padding:24px clamp(16px,3vw,32px)' });
      panel.appendChild(cuerpo);
      var ctl = pinta(cuerpo, { paso: paso, datos: datos });
      var est = el('p', { role: 'status', 'aria-live': 'polite', class: 'font-body-sm text-body-sm text-outline', 'data-axw-cobros-host': 'estado' });
      var g = boton(C('probar_guardar'), 'host-guardar', BTN1);
      g.setAttribute('data-axw-cobros-host', 'guardar');
      var pie = el('div', { class: 'flex flex-col md:flex-row md:items-center gap-3', style: 'padding:0 clamp(16px,3vw,32px) 24px' }, [g, est]);
      panel.appendChild(pie);
      g.hidden = true;
      cuerpo.addEventListener('axw-cobros-fase', function (ev) { g.hidden = !(ev.detail && ev.detail.fase === 'codigo'); if (g.hidden) est.textContent = ''; });
      g.addEventListener('click', function () {
        var r = ctl.valores();
        if (!r.ok) { est.className = 'font-body-sm text-body-sm text-error'; est.textContent = r.error; return; }
        g.disabled = true; est.className = 'font-body-sm text-body-sm text-outline'; est.textContent = S().ui('cargando');
        guarda(null, r.v, { paso: paso, datos: datos }).then(function (res) {
          g.disabled = false;
          if (res.ok) {   // se relee todo: lo que se ve lo dice la base
            S().estado(true).then(function (e) { if (e.ok) datos = e.datos; montado = false; monta(); });
            return;
          }
          est.className = 'font-body-sm text-body-sm text-error';
          est.textContent = S().ui('no_se_guardo', { e: S().explica(res.error, true).texto });
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
