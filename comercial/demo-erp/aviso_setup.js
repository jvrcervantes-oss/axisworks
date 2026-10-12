/* Aviso de «módulo sin configurar» al entrar (F3 Entrega 1, bbm-p18-front, 12-oct-2026). Owner, 12-oct 08:00: «Al entrar a la intranet salta
 * un aviso de modulo sin configurar, te toca configurarlo.» Va detrás de setup_modulos.js (window.AXW_SETUP), en las páginas de la instancia.
 *
 *  · Quien configura (la base: `puede_configurar`) y hay algún módulo sin configurar: UNA banda no bloqueante, primer hijo de <main>, no fija
 *    (revisión previa #285, Diseño): «Facturas: sin configurar» o «3 módulos sin configurar: …», un solo botón «Configurar» al asistente del
 *    primer módulo pendiente y «Ahora no», que la esconde durante la sesión (comodidad; vuelve al entrar otra vez).
 *  · Quien no configura no ve banda; solo, en la pantalla de un módulo sin configurar, la nota «aún no está listo», sin detalle.
 *  · En el propio asistente, nada.
 *  · Si no se ha podido mirar, no se pinta nada: el aviso es un extra y no afirma que esté todo listo.
 * La decisión (decide) va separada del pintado para probarla con el doble (aviso_setup.test.js). Todo por textContent; enganche por data-axw-*.
 * Sin piel propia: clases de la cáscara de hoy; la piel definitiva llega con el diseño del owner (Claude Design) y solo cambia estilos.
 */
(function () {
  'use strict';
  var CLAVE_OCULTO = 'axw_setup_aviso_oculto';
  var RUTA_ASISTENTE = '/ajustes/configurar/';

  // datos = la forma de modulos_setup_estado; moduloPagina = window.AXW_MODULO_PAGINA; ruta = location.pathname; oculto = «Ahora no» ya pulsado
  function decide(datos, moduloPagina, ruta, oculto) {
    if (!datos || String(ruta || '').indexOf(RUTA_ASISTENTE) >= 0) return null;
    var pend = (datos.modulos || []).filter(function (m) { return m.estado === 'sin_configurar'; });
    if (!pend.length) return null;
    if (datos.puede_configurar) {
      if (oculto) return null;
      // el primero al que llevar: un módulo de verdad antes que «base» (el asistente pone delante los pasos pendientes de base, la moneda)
      var primero = pend.filter(function (m) { return m.modulo !== 'base'; })[0] || pend[0];
      return { tipo: 'banda', modulos: pend.map(function (m) { return m.modulo; }), destino: RUTA_ASISTENTE + '?modulo=' + encodeURIComponent(primero.modulo) };
    }
    if (moduloPagina && pend.some(function (m) { return m.modulo === moduloPagina; })) return { tipo: 'nota', modulo: moduloPagina };
    return null;
  }

  function leeOculto() { try { return window.sessionStorage.getItem(CLAVE_OCULTO) === '1'; } catch (e) { return false; /* MUDO A PROPOSITO: sin almacenamiento (ventana privada), el aviso vuelve a salir: es el lado seguro */ } }
  function ocultaSesion() { try { window.sessionStorage.setItem(CLAVE_OCULTO, '1'); } catch (e) { /* MUDO A PROPOSITO: sin almacenamiento se oculta solo en esta página */ } }

  function h(tag, attrs, hijos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null) return; if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (hijos || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function textoBanda(S, d) {
    var nombres = d.modulos.map(function (m) { return S.nombreModulo(m); });
    var T = window.lwT || function (x, hh) { var v = x; Object.keys(hh || {}).forEach(function (k) { v = v.split('%' + k).join(hh[k]); }); return v; };
    return nombres.length === 1 ? T(S.TEXTOS.general.aviso_uno, { m: nombres[0] })
                                : T(S.TEXTOS.general.aviso_varios, { n: String(nombres.length), lista: nombres.join(', ') });
  }
  function banda(S, d) {
    var cierra = h('button', { type: 'button', 'data-axw-aviso': 'ahora-no', class: 'font-label-md text-label-md text-on-surface-variant underline px-2', style: 'min-height:44px', text: S.texto('general', 'ahora_no') });
    var ir = h('a', { href: d.destino, 'data-axw-aviso': 'configurar', class: 'inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md w-full md:w-auto', style: 'min-height:44px', text: S.texto('general', 'configurar') });
    var caja = h('div', { role: 'status', 'data-axw-aviso': 'banda', class: 'flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-5 py-4' }, [
      h('p', { class: 'font-body-md text-body-md text-on-surface', 'data-axw-aviso': 'texto', text: textoBanda(S, d) }),
      h('div', { class: 'flex flex-col md:flex-row md:items-center gap-2' }, [ir, cierra])
    ]);
    cierra.addEventListener('click', function () { ocultaSesion(); if (caja.parentNode) caja.parentNode.removeChild(caja); });
    return caja;
  }
  function nota(S) {
    return h('p', { role: 'status', 'data-axw-aviso': 'nota', class: 'rounded-xl border border-outline-variant bg-surface-container-low px-5 py-3 font-body-sm text-body-sm text-on-surface-variant', text: S.texto('general', 'sin_configurar_resto') });
  }
  function pon(el) {
    var main = document.querySelector('main');
    if (!main || document.querySelector('[data-axw-aviso="banda"],[data-axw-aviso="nota"]')) return;
    var dentro = main.firstElementChild && main.firstElementChild.tagName === 'DIV' && main.children.length === 1 ? main.firstElementChild : main;
    dentro.insertBefore(el, dentro.firstChild);
  }
  function arranca() {
    var S = window.AXW_SETUP;
    if (!S) return;
    S.estado().then(function (r) {
      if (!r.ok) { try { console.info('[axw] aviso de setup sin pintar: no se pudo mirar (' + r.tipo + ')'); } catch (e) {} return; }
      var d = decide(r.datos, window.AXW_MODULO_PAGINA || null, location.pathname, leeOculto());
      if (!d) return;
      var el = d.tipo === 'banda' ? banda(S, d) : nota(S);
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { pon(el); }); else pon(el);
    });
  }
  window.AXW_AVISO = { decide: decide };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arranca); else arranca();
  }
})();
