/* Ajustes › Configurar módulos (antes «Puesta en marcha»; F3 Entrega 1, bbm-p18-front, 12-oct-2026). Owner, 12-oct 08:00: «…Salta un asistente que
 * te guia por pasos y deja todo eso en Ajustes.» y 05:12: «módulo primero y setup después». build.py (ajustes_puesta_en_marcha) pone la pestaña
 * (data-lw-panel="puesta", identificador de siempre) y su contenedor (#lw-aj-puesta) en /ajustes/ de TODAS las instancias; en Lawang no existe.
 *
 * Qué hace, y solo esto:
 *  · una sección por módulo encendido, con su estado y sus pasos TAL CUAL los da modulos_setup_estado (setup_modulos.js): «hecho» lo dice la base;
 *  · cada paso se cambia aquí con el MISMO componente que el asistente (setup_pasos.js) y la misma función de la base; cambiar algo ya guardado
 *    pide motivo (lo exige la base). Un paso irreversible sin hacer (moneda, prefijo) se hace en el asistente, que es donde vive su confirmación
 *    tecleada; hecho, sale «Fijado» y no se ofrece cambiarlo. Un paso de otra pantalla (Flota, Entrega) lleva a esa pantalla;
 *  · «Abrir el asistente» por módulo; quien no configura ve el estado de cada módulo, sin pasos ni detalle.
 *  · Un fallo de lectura se dice («no se ha podido mirar», con Reintentar), nunca como «todo configurado».
 * Todo dato va por textContent / createElement; se engancha por data-accion / data-pm-*, nunca por un rótulo. Sin piel propia: la viste Claude Design.
 */
(function () {
  'use strict';
  // Solo los textos fijos de la pestaña (los pone build.py en el HTML con data-lwt); el resto sale del mapa único de setup_modulos.js
  var EN_PM = {
    'Configurar módulos': 'Module setup',
    'Lo que hace falta para que cada módulo funcione': 'What each module needs in order to work',
    'Cada módulo encendido, con sus pasos. Se cambian aquí o con el asistente, paso a paso.': 'Every module that is switched on, with its steps. Change them here or with the wizard, step by step.',
    'Trayendo la configuración…': 'Loading the setup…',
    'Cerrar': 'Close',
    'Cancelar': 'Cancel',
    'Tienes cambios sin guardar: si vuelves a cerrar, se descartan.': 'You have unsaved changes: close again to discard them.'
  };
  var ID_PM = {
    'Configurar módulos': 'Penyiapan modul',
    'Lo que hace falta para que cada módulo funcione': 'Yang dibutuhkan setiap modul agar berfungsi',
    'Cada módulo encendido, con sus pasos. Se cambian aquí o con el asistente, paso a paso.': 'Setiap modul yang aktif, beserta langkah-langkahnya. Ubah di sini atau dengan panduan, langkah demi langkah.',
    'Trayendo la configuración…': 'Memuat pengaturan…',
    'Cerrar': 'Tutup',
    'Cancelar': 'Batalkan',
    'Tienes cambios sin guardar: si vuelves a cerrar, se descartan.': 'Ada perubahan yang belum disimpan: tutup sekali lagi untuk membuangnya.'
  };
  var S = null, P = null, sb = null, ctx = null, ocupado = false;
  function U(k, h) { return S.ui(k, h); }
  function h(tag, attrs, hijos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null) return; if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (hijos || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function vacia(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function cont() { return document.getElementById('lw-aj-puesta'); }
  var RAIZ = location.pathname.replace(/ajustes\/.*$/, '');
  var BTN1 = 'shrink-0 px-4 py-2 rounded-full bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md';
  var BTN2 = 'shrink-0 px-4 py-2 rounded-full border border-outline-variant text-deep-lagoon font-label-md text-label-md';
  function chip(hecho, texto) {
    return h('span', { class: 'shrink-0 px-3 py-1 rounded-full font-label-md text-[13px] ' + (hecho ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'), 'data-pm-hecho': hecho ? '1' : '0', text: texto });
  }

  function errorLectura(err) {
    var c = cont(); if (!c) return;
    vacia(c).appendChild(h('div', { class: 'px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-3', role: 'alert' }, [
      h('span', { class: 'font-body-md text-body-md text-error', text: U('no_mirar') + ': ' + S.explica(err || { message: '' }, true).texto }),
      h('button', { type: 'button', 'data-real': '', 'data-accion': 'pm-reintentar', class: BTN1, text: U('reintentar') })]));
  }
  // Lee el estado, los ajustes y la fila de la empresa SIN pintar: lo usan la carga y la duda tras perder una respuesta
  function relee() {
    return S.estado(true).then(function (r) {
      if (!r.ok) return { ok: false, error: r.error };
      var d = r.datos, ref = d.pasos.map(function (p) { return p.ref; }).filter(Boolean)[0];
      var aj = d.puede_configurar && typeof window.lwDatos === 'function' ? window.lwDatos('ajustes_config_datos') : Promise.resolve({ data: null });
      var soc = d.puede_configurar && ref ? Promise.resolve(sb.from('sociedades').select(P.COLS_SOCIEDAD).eq('clave', ref).maybeSingle()) : Promise.resolve({ data: null });
      return Promise.all([aj, soc]).then(function (rs) {
        if (rs[0] && rs[0].error) return { ok: false, error: rs[0].error };
        if (rs[1] && rs[1].error) return { ok: false, error: rs[1].error };
        return { ok: true, ctx: { datos: d, ajustes: (rs[0] && rs[0].data && rs[0].data.valores) || {}, sociedad: (rs[1] && rs[1].data) || null } };
      });
    }, function (e) { return { ok: false, error: e }; });
  }
  function carga() {
    var c = cont(); if (!c || !sb) return Promise.resolve();
    return relee().then(function (r) { if (!r.ok) { errorLectura(r.error); return; } ctx = r.ctx; pinta(); });
  }
  function enlaceAsistente(m, paso) {
    return RAIZ + 'ajustes/configurar/?modulo=' + encodeURIComponent(m) + (paso ? '&paso=' + encodeURIComponent(paso) : '') + '&vuelta=ajustes';
  }
  function pinta() {
    var c = cont(); if (!c) return;
    vacia(c);
    var d = ctx.datos;
    if (!d.modulos.length) { c.appendChild(h('p', { class: 'px-8 py-6 font-body-md text-body-md text-on-surface', text: U('todo_listo') })); return; }
    d.modulos.forEach(function (m) {
      var listo = m.estado === 'configurado';
      // configurado con opcionales sin hacer: se dice cuántos (y en cada fila, qué pasa sin él); «listo» a secas solo sin nada pendiente (agencia-81, 12-oct)
      var opc = d.pasos.filter(function (p) { return p.modulo === m.modulo && !p.obligatorio && !p.hecho; });
      var cab = h('div', { class: 'flex flex-col md:flex-row md:items-center justify-between gap-3' }, [
        h('div', { class: 'flex flex-col gap-1 min-w-0' }, [
          h('h3', { class: 'font-headline-sm text-headline-sm text-deep-lagoon', text: S.nombreModulo(m.modulo) }),
          !listo && m.falta && d.puede_configurar ? h('span', { class: 'font-body-sm text-body-sm text-outline', text: S.texto('paso', m.falta, 0) }) : null,
          listo && opc.length && d.puede_configurar ? h('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', 'data-pm-opcionales': String(opc.length),
            text: opc.length === 1 ? U('opc_n_uno') : U('opc_n', { n: String(opc.length) }) }) : null]),
        h('div', { class: 'flex items-center gap-3' }, [
          chip(listo, S.texto('estado', m.estado)),
          d.puede_configurar && !listo ? h('a', { href: enlaceAsistente(m.modulo), 'data-pm-asistente': m.modulo, class: BTN1, text: U('abrir_asistente') }) : null])]);
      // tarjeta por módulo (diseño del owner S81, 12-oct): borde y radio de la piel, sin sombra; los pasos dentro con su estado
      var sec = h('section', { class: 'rounded-2xl border border-outline-variant px-5 py-5 flex flex-col gap-3', style: 'margin:12px clamp(16px,3vw,32px)', 'data-pm-modulo': m.modulo }, [cab]);
      if (d.puede_configurar) {
        var ol = h('ol', { class: 'flex flex-col list-none gap-0' });
        d.pasos.filter(function (p) { return p.modulo === m.modulo; }).forEach(function (p) { ol.appendChild(filaPaso(p)); });
        sec.appendChild(ol);
      }
      c.appendChild(sec);
    });
    if (!d.puede_configurar) c.appendChild(h('p', { class: 'px-8 py-4 font-body-sm text-body-sm text-outline', text: U('solo_admin') }));
  }
  function filaPaso(p) {
    var comp = P.de(p.clave, p);
    var texto = h('div', { class: 'flex flex-col gap-1 min-w-0' }, [
      h('span', { class: 'font-label-md text-label-md text-on-surface', text: S.texto('paso', p.clave, 0) + (p.obligatorio ? '' : ' · ' + U('opcional')) }),
      h('span', { class: 'font-body-sm text-body-sm text-outline break-words', text: p.hecho ? S.texto('paso', p.clave, 1) : (p.falta ? S.textoFalta(p.falta) : S.texto('paso', p.clave, 1)) }),
      !p.hecho && !p.obligatorio ? h('span', { class: 'font-body-sm text-body-sm text-on-surface-variant break-words', 'data-pm-consecuencia': p.clave, text: S.consecuencia(p.clave) }) : null]);
    var acciones = h('div', { class: 'self-start flex items-center gap-2' });   // arriba, junto al título (md:items-start no está compilado)
    if (p.irreversible && p.hecho) acciones.appendChild(chip(true, U('fijado')));
    else {
      acciones.appendChild(chip(p.hecho, U(p.hecho ? 'hecho' : 'pendiente')));
      if (comp.externo) {
        // el componente puede dar su sitio exacto (Correo → /ajustes/#correo, Taller → #listas; setup_comun.js); si no, el `donde` de la base
        var dnd = typeof comp.enlace === 'function' ? String(comp.enlace(p) || '') : String(p.donde || '');
        if (/^\/[a-z0-9\-\/]*(#[a-z0-9_-]+)?$/i.test(dnd)) acciones.appendChild(h('a', { href: dnd, 'data-pm-externo': p.clave, class: BTN2, text: U('abrir', { pantalla: S.texto('paso', p.clave, 0) }) }));
      } else if (p.irreversible || comp.soloAsistente) {   // la clase (S40) no guarda sola: se elige en el asistente, camino del primer alquiler
        acciones.appendChild(h('a', { href: enlaceAsistente(p.modulo, p.clave), 'data-pm-asistente-paso': p.clave, class: BTN2, text: U('abrir_asistente') }));
      } else {
        acciones.appendChild(h('button', { type: 'button', 'data-real': '', 'data-accion': 'pm-editar', 'data-pm-cambiar': p.clave, 'data-pm-paso': p.clave, 'data-pm-modulo': p.modulo, class: BTN2, text: p.hecho ? U('cambiar') : S.texto('general', 'configurar') }));
      }
    }
    var li = h('li', { class: 'py-3 flex flex-col gap-3 border-t border-outline-variant/20', 'data-pm-fila': p.clave }, [
      h('div', { class: 'flex flex-col md:flex-row justify-between gap-3' }, [texto, acciones])]);
    li._paso = p;
    return li;
  }
  // ── La ventana (S10, owner 15-oct: «quiero que si le doy a change aquí o lo que sea me abra un pop up con la info»). Un <dialog> nativo con
  // showModal(): Esc, foco dentro y el resto de la página inerte, sin JS propio. Vive DENTRO de la fila (li[data-pm-fila]) a propósito: se pinta
  // en la capa de arriba igual, y el clic sigue llegando a la delegación de #lw-aj-puesta con su fila. Cerrar la BORRA del DOM (no la esconde):
  // cobros deja las claves solo en sus <input> y promete vaciarlas. Mientras guarda no se cierra (el resultado se perdería y parecería cancelado).
  function TP(s) { return typeof window.lwT === 'function' ? window.lwT(s) : s; }
  function estiloVentana() {
    if (document.getElementById('axw-pm-ventana-css')) return;
    var st = document.createElement('style'); st.id = 'axw-pm-ventana-css';
    st.textContent = 'dialog[data-pm-ventana]{width:min(560px,calc(100vw - 32px));max-width:none;max-height:min(88vh,880px);padding:0;overflow:auto;margin:auto}' +
      'dialog[data-pm-ventana]::backdrop{background:rgba(0,0,0,.45)}' +
      '[data-pm-pie]{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:12px}[data-pm-pie] [role=status]{flex:1 1 100%}[data-pm-pie] [role=status]:empty{display:none}';
    document.head.appendChild(st);
  }
  function cierra(dlg, sinAviso) {
    if (!dlg || ocupado) return;
    // lo escrito no se tira sin decirlo (Experiencia, 15-oct): el primer intento lo avisa dentro de la ventana; el segundo descarta
    if (!sinAviso && dlg._tocado && !dlg._avisado) {
      dlg._avisado = true;
      var est = dlg.querySelector('[data-pm-estado]');
      if (est) { est.className = 'font-body-sm text-body-sm text-error'; est.textContent = TP('Tienes cambios sin guardar: si vuelves a cerrar, se descartan.'); }
      return;
    }
    var li = dlg.closest('[data-pm-fila]'), clave = li && li.getAttribute('data-pm-fila');
    if (dlg.open) dlg.close();
    if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
    if (clave) enfoca(clave);
  }
  function editor(li) {
    var p = li._paso, comp = P.de(p.clave, p);
    var viejo = li.querySelector('dialog[data-pm-ventana]'); if (viejo) { if (!viejo.open) viejo.showModal(); return; }
    estiloVentana();
    var caja = h('div', { class: 'flex flex-col gap-3', 'data-pm-editor': p.clave });
    var ctl = comp.pinta(caja, { paso: p, datos: ctx.datos, ajustes: ctx.ajustes, sociedad: ctx.sociedad, cambia: p.hecho });
    var motivo = null;
    // sociedad_guarda no guarda motivo: no se pide (revisor 12-oct); y se decide por el VALOR guardado, no por «hecho» (repaso 12-oct)
    if (P.pideMotivo(p.clave, { paso: p, datos: ctx.datos, ajustes: ctx.ajustes, sociedad: ctx.sociedad })) {
      motivo = h('input', { type: 'text', maxlength: '500', autocomplete: 'off', 'data-pm': 'motivo', id: 'pm-motivo-' + p.clave, class: 'w-full rounded-lg border border-control-border/50 bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md' });
      caja.appendChild(h('div', { class: 'flex flex-col gap-1.5' }, [h('label', { for: 'pm-motivo-' + p.clave, class: 'font-label-md text-label-md text-on-surface', text: U('motivo') }), motivo,
        h('span', { class: 'font-body-sm text-body-sm text-outline', text: U('motivo_ayuda') })]));
    }
    var estado = h('span', { role: 'status', 'aria-live': 'polite', class: 'font-body-sm text-body-sm text-outline', 'data-pm-estado': p.clave });
    caja._ctl = ctl; caja._motivo = motivo; caja._estado = estado;
    var idTit = 'pm-ventana-tit-' + p.clave;
    var ayuda = p.hecho ? S.texto('paso', p.clave, 1) : (p.falta ? S.textoFalta(p.falta) : S.texto('paso', p.clave, 1));
    var dlg = h('dialog', { 'data-pm-ventana': p.clave, 'aria-labelledby': idTit, class: 'rounded-2xl border border-outline-variant bg-surface-container-lowest text-on-surface' }, [
      h('div', { class: 'flex flex-col gap-4', style: 'padding:24px clamp(16px,4vw,32px)' }, [
        h('div', { class: 'flex justify-between gap-3' }, [
          h('div', { class: 'flex flex-col gap-1 min-w-0' }, [
            h('span', { class: 'font-label-md text-label-md text-outline', text: S.nombreModulo(p.modulo) }),
            h('h2', { id: idTit, class: 'font-headline-sm text-headline-sm text-deep-lagoon', text: S.texto('paso', p.clave, 0) })]),
          h('button', { type: 'button', 'data-real': '', 'data-accion': 'pm-cerrar', 'aria-label': TP('Cerrar'), class: 'self-start ' + BTN2, text: '×' })]),
        h('p', { class: 'font-body-md text-body-md text-on-surface-variant break-words', text: ayuda }),
        caja,
        h('div', { 'data-pm-pie': p.clave }, [estado,
          h('button', { type: 'button', 'data-real': '', 'data-accion': 'pm-cerrar', class: BTN2, text: TP('Cancelar') }),
          h('button', { type: 'button', 'data-real': '', 'data-accion': 'pm-guardar', 'data-pm-paso': p.clave, class: BTN1, text: U('guardar') })])])]);
    dlg.addEventListener('cancel', function (ev) { ev.preventDefault(); cierra(dlg); });   // Esc: la misma salida que Cancelar
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) cierra(dlg); });   // clic en el fondo
    dlg.addEventListener('close', function () {   // cerrada sin pasar por cierra() (2.º Esc seguido en Chrome)
      if (!dlg.parentNode) return;
      if (ocupado) { try { dlg.showModal(); } catch (e) { /* MUDO A PROPOSITO: si no se puede reabrir, el guardado sigue y su resultado repinta */ } return; }
      var li = dlg.closest('[data-pm-fila]'); dlg.parentNode.removeChild(dlg); if (li) enfoca(li.getAttribute('data-pm-fila'));
    });
    dlg.addEventListener('input', function () { dlg._tocado = true; dlg._avisado = false; });
    dlg.addEventListener('change', function () { dlg._tocado = true; dlg._avisado = false; });
    li.appendChild(dlg);
    dlg.showModal();
    var primero = caja.querySelector('input:not([type=hidden]):not([disabled]),select,textarea,[role=switch],[role=radio]');
    if (primero) primero.focus();
  }
  function guarda(li) {
    if (ocupado) return;
    var p = li._paso, caja = li.querySelector('[data-pm-editor]'), dlg = li.querySelector('dialog[data-pm-ventana]');
    if (!caja || !dlg) return;
    var botones = dlg.querySelectorAll('button');
    var est = caja._estado, r = caja._ctl.valores();
    function di(t, mal) { est.className = 'font-body-sm text-body-sm ' + (mal ? 'text-error' : 'text-outline'); est.textContent = t; }
    if (!r.ok) { di(r.error, true); return; }
    var motivo = caja._motivo ? caja._motivo.value.trim() : '';
    if (caja._motivo && (motivo.match(/\p{L}/gu) || []).length < 3) { di(U('motivo_corto'), true); caja._motivo.focus(); return; }
    ocupado = true; di(U('cargando'), false);
    Array.prototype.forEach.call(botones, function (b) { b.disabled = true; });
    P.de(p.clave, p).guarda(sb, r.v, { paso: p, datos: ctx.datos, ajustes: ctx.ajustes, sociedad: ctx.sociedad }, false, motivo || null).then(function (res) {
      if (res.ok) { ocupado = false; return guardadoYCierra(dlg, p.clave); }
      if (!res.sinRespuesta) {   // con código de la base: «no se guardó», y por qué
        ocupado = false; Array.prototype.forEach.call(botones, function (b) { b.disabled = false; });
        di(U('no_se_guardo', { e: S.explica(res.error, true).texto }), true); return;
      }
      di(U('comprobando'), false);   // sin respuesta: se relee la base; nada se reenvía solo
      // la duda se resuelve mirando el VALOR releído, no solo «hecho» (un paso ya hecho sigue hecho aunque no se guardara; revisor 12-oct)
      return relee().then(function (rr) {
        ocupado = false;
        var comp = P.de(p.clave, p);
        var ahora = rr.ok && rr.ctx.datos.pasos.filter(function (x) { return x.clave === p.clave && x.modulo === p.modulo; })[0];
        var guardado = rr.ok && (comp.comprueba ? comp.comprueba(r.v, rr.ctx) : !!(ahora && ahora.hecho && !p.hecho));
        if (guardado) { ctx = rr.ctx; cierra(dlg, true); pinta(); enfoca(p.clave); return; }
        Array.prototype.forEach.call(botones, function (b) { b.disabled = false; });
        di(rr.ok ? U('no_guardado') : U('no_mirar'), true);
      });
    }).catch(function () {   // un componente que rechaza (no devuelve {ok:false}) no deja la ventana sin salida
      ocupado = false; Array.prototype.forEach.call(botones, function (b) { b.disabled = false; });
      if (dlg.parentNode) di(U('no_mirar'), true);
    });
  }
  // guardado: se cierra la ventana, se relee la base y el foco vuelve al «Cambiar» de ese paso (pinta() vacía el contenedor)
  function enfoca(clave) { var b = document.querySelector('[data-pm-cambiar="' + clave + '"]'); if (b) b.focus(); }
  function guardadoYCierra(dlg, clave) { cierra(dlg, true); return carga().then(function () { enfoca(clave); }); }
  function arranca() {
    var c = cont();
    if (!c) return;
    S = window.AXW_SETUP; P = window.AXW_PASOS;
    if (window.LW_EN && typeof window.LW_EN === 'object') Object.keys(EN_PM).forEach(function (k) { if (!(k in window.LW_EN)) window.LW_EN[k] = EN_PM[k]; });
    if (window.LW_ID && typeof window.LW_ID === 'object') Object.keys(ID_PM).forEach(function (k) { if (!(k in window.LW_ID)) window.LW_ID[k] = ID_PM[k]; });
    if (typeof window.lwIdiomaAplicar === 'function') {
      try { window.lwIdiomaAplicar(c.closest('[data-lw-panel]') || c); } catch (e) { /* MUDO A PROPOSITO: traducir no tumba la pantalla */ }
    }
    if (!S || !P) { c.textContent = (S && S.ui) ? S.ui('no_mirar') : '—'; return; }
    c.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-accion]');
      if (!b) return;
      var a = b.getAttribute('data-accion'), li = b.closest('[data-pm-fila]');
      if (a === 'pm-reintentar') { ev.stopPropagation(); carga(); }
      else if (a === 'pm-editar' && li) { ev.stopPropagation(); editor(li); }
      else if (a === 'pm-guardar' && li) { ev.stopPropagation(); guarda(li); }
      else if (a === 'pm-cerrar' && li) { ev.stopPropagation(); cierra(li.querySelector('dialog[data-pm-ventana]')); }
    });
    if (!window.LW_AUTH || typeof window.LW_AUTH.then !== 'function') { errorLectura({ code: '42501' }); return; }
    window.LW_AUTH.then(function (aut) {
      if (!aut || !aut.sb) { errorLectura({ code: '42501' }); return; }
      sb = aut.sb;
      carga();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arranca); else arranca();
})();
