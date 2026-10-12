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
    'Trayendo la configuración…': 'Loading the setup…'
  };
  var ID_PM = {
    'Configurar módulos': 'Penyiapan modul',
    'Lo que hace falta para que cada módulo funcione': 'Yang dibutuhkan setiap modul agar berfungsi',
    'Cada módulo encendido, con sus pasos. Se cambian aquí o con el asistente, paso a paso.': 'Setiap modul yang aktif, beserta langkah-langkahnya. Ubah di sini atau dengan panduan, langkah demi langkah.',
    'Trayendo la configuración…': 'Memuat pengaturan…'
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
  function carga() {
    var c = cont(); if (!c || !sb) return Promise.resolve();
    return S.estado(true).then(function (r) {
      if (!r.ok) { errorLectura(r.error); return; }
      var d = r.datos, ref = d.pasos.map(function (p) { return p.ref; }).filter(Boolean)[0];
      var aj = d.puede_configurar && typeof window.lwDatos === 'function' ? window.lwDatos('ajustes_config_datos') : Promise.resolve({ data: null });
      var soc = d.puede_configurar && ref ? Promise.resolve(sb.from('sociedades').select('clave,razon,npwp,npwp_label,domicilio,rep,prefijo_serie').eq('clave', ref).maybeSingle()) : Promise.resolve({ data: null });
      return Promise.all([aj, soc]).then(function (rs) {
        if (rs[0] && rs[0].error) { errorLectura(rs[0].error); return; }
        if (rs[1] && rs[1].error) { errorLectura(rs[1].error); return; }
        ctx = { datos: d, ajustes: (rs[0] && rs[0].data && rs[0].data.valores) || {}, sociedad: (rs[1] && rs[1].data) || null };
        pinta();
      });
    }, function (e) { errorLectura(e); });
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
      var cab = h('div', { class: 'flex flex-col md:flex-row md:items-center justify-between gap-3' }, [
        h('div', { class: 'flex flex-col gap-1 min-w-0' }, [
          h('h3', { class: 'font-headline-sm text-headline-sm text-deep-lagoon', text: S.nombreModulo(m.modulo) }),
          !listo && m.falta && d.puede_configurar ? h('span', { class: 'font-body-sm text-body-sm text-outline', text: S.texto('paso', m.falta, 0) }) : null]),
        h('div', { class: 'flex items-center gap-3' }, [
          chip(listo, S.texto('estado', m.estado)),
          d.puede_configurar && !listo ? h('a', { href: enlaceAsistente(m.modulo), 'data-pm-asistente': m.modulo, class: BTN1, text: U('abrir_asistente') }) : null])]);
      // tarjeta por módulo (diseño del owner S81, 12-oct): borde y radio de la piel, sin sombra; los pasos dentro con su estado
      var sec = h('section', { class: 'mx-4 md:mx-8 my-3 rounded-2xl border border-outline-variant px-5 py-5 md:px-6 flex flex-col gap-3', 'data-pm-modulo': m.modulo }, [cab]);
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
    var comp = P.de(p.clave);
    var texto = h('div', { class: 'flex flex-col gap-1 min-w-0' }, [
      h('span', { class: 'font-label-md text-label-md text-on-surface', text: S.texto('paso', p.clave, 0) + (p.obligatorio ? '' : ' · ' + U('opcional')) }),
      h('span', { class: 'font-body-sm text-body-sm text-outline break-words', text: p.hecho ? S.texto('paso', p.clave, 1) : (p.falta ? S.textoFalta(p.falta) : S.texto('paso', p.clave, 1)) })]);
    var acciones = h('div', { class: 'flex items-center gap-2' });
    if (p.irreversible && p.hecho) acciones.appendChild(chip(true, U('fijado')));
    else {
      acciones.appendChild(chip(p.hecho, U(p.hecho ? 'hecho' : 'pendiente')));
      if (comp.externo) {
        if (/^\/[a-z0-9\-\/]*$/i.test(String(p.donde || ''))) acciones.appendChild(h('a', { href: p.donde, class: BTN2, text: U('abrir', { pantalla: S.texto('paso', p.clave, 0) }) }));
      } else if (p.irreversible) {
        acciones.appendChild(h('a', { href: enlaceAsistente(p.modulo, p.clave), 'data-pm-asistente-paso': p.clave, class: BTN2, text: U('abrir_asistente') }));
      } else {
        acciones.appendChild(h('button', { type: 'button', 'data-real': '', 'data-accion': 'pm-editar', 'data-pm-paso': p.clave, 'data-pm-modulo': p.modulo, class: BTN2, text: p.hecho ? U('cambiar') : S.texto('general', 'configurar') }));
      }
    }
    var li = h('li', { class: 'py-3 flex flex-col gap-3 border-t border-outline-variant/20', 'data-pm-fila': p.clave }, [
      h('div', { class: 'flex flex-col md:flex-row md:items-start justify-between gap-3' }, [texto, acciones])]);
    li._paso = p;
    return li;
  }
  function editor(li) {
    var p = li._paso, comp = P.de(p.clave);
    var viejo = li.querySelector('[data-pm-editor]'); if (viejo) { li.removeChild(viejo); return; }
    var caja = h('div', { class: 'flex flex-col gap-3', 'data-pm-editor': p.clave });
    var ctl = comp.pinta(caja, { paso: p, datos: ctx.datos, ajustes: ctx.ajustes, sociedad: ctx.sociedad, cambia: p.hecho });
    var motivo = null;
    if (p.hecho) {
      motivo = h('input', { type: 'text', maxlength: '500', autocomplete: 'off', 'data-pm': 'motivo', id: 'pm-motivo-' + p.clave, class: 'w-full rounded-lg border border-control-border/50 bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md' });
      caja.appendChild(h('div', { class: 'flex flex-col gap-1.5' }, [h('label', { for: 'pm-motivo-' + p.clave, class: 'font-label-md text-label-md text-on-surface', text: U('motivo') }), motivo,
        h('span', { class: 'font-body-sm text-body-sm text-outline', text: U('motivo_ayuda') })]));
    }
    var estado = h('span', { role: 'status', 'aria-live': 'polite', class: 'font-body-sm text-body-sm text-outline', 'data-pm-estado': p.clave });
    caja.appendChild(h('div', { class: 'flex flex-col md:flex-row md:items-center gap-3' }, [
      h('button', { type: 'button', 'data-real': '', 'data-accion': 'pm-guardar', 'data-pm-paso': p.clave, class: BTN1, text: U('guardar') }), estado]));
    caja._ctl = ctl; caja._motivo = motivo; caja._estado = estado;
    li.appendChild(caja);
  }
  function guarda(li) {
    if (ocupado) return;
    var p = li._paso, caja = li.querySelector('[data-pm-editor]');
    if (!caja) return;
    var est = caja._estado, r = caja._ctl.valores();
    function di(t, mal) { est.className = 'font-body-sm text-body-sm ' + (mal ? 'text-error' : 'text-outline'); est.textContent = t; }
    if (!r.ok) { di(r.error, true); return; }
    var motivo = caja._motivo ? caja._motivo.value.trim() : '';
    if (caja._motivo && (motivo.match(/\p{L}/gu) || []).length < 3) { di(U('motivo_corto'), true); caja._motivo.focus(); return; }
    ocupado = true; di(U('cargando'), false);
    caja.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    P.de(p.clave).guarda(sb, r.v, { paso: p, datos: ctx.datos }, false, motivo || null).then(function (res) {
      if (res.ok) { ocupado = false; return carga(); }
      if (!res.sinRespuesta) {   // con código de la base: «no se guardó», y por qué
        ocupado = false; caja.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
        di(U('no_se_guardo', { e: S.explica(res.error, true).texto }), true); return;
      }
      di(U('comprobando'), false);   // sin respuesta: se relee la base; nada se reenvía solo
      return S.estado(true).then(function (rr) {
        ocupado = false;
        var ahora = rr.ok && rr.datos.pasos.filter(function (x) { return x.clave === p.clave && x.modulo === p.modulo; })[0];
        if (ahora && ahora.hecho && !p.hecho) return carga();
        caja.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
        di(rr.ok ? U('no_guardado') : U('no_mirar'), true);
      });
    });
  }
  function arranca() {
    var c = cont();
    if (!c) return;
    S = window.AXW_SETUP; P = window.AXW_PASOS;
    if (window.LW_EN && typeof window.LW_EN === 'object') Object.keys(EN_PM).forEach(function (k) { if (!(k in window.LW_EN)) window.LW_EN[k] = EN_PM[k]; });
    if (window.LW_ID && typeof window.LW_ID === 'object') Object.keys(ID_PM).forEach(function (k) { if (!(k in window.LW_ID)) window.LW_ID[k] = ID_PM[k]; });
    if (typeof window.lwIdiomaAplicar === 'function') {
      try { window.lwIdiomaAplicar(c.closest('[data-lw-panel]') || c); } catch (e) { /* MUDO A PROPOSITO: traducir no tumba la pantalla */ }
    }
    if (!S || !P) { c.textContent = 'setup_modulos.js / setup_pasos.js'; return; }
    c.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-accion]');
      if (!b) return;
      var a = b.getAttribute('data-accion'), li = b.closest('[data-pm-fila]');
      if (a === 'pm-reintentar') { ev.stopPropagation(); carga(); }
      else if (a === 'pm-editar' && li) { ev.stopPropagation(); editor(li); }
      else if (a === 'pm-guardar' && li) { ev.stopPropagation(); guarda(li); }
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
