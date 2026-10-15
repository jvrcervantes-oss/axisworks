/* Aviso de «módulo sin configurar» al entrar (F3 Entrega 1, bbm-p18-front, 12-oct-2026). Owner, 12-oct 08:00: «Al entrar a la intranet salta
 * un aviso de modulo sin configurar, te toca configurarlo.» Va detrás de setup_modulos.js (window.AXW_SETUP), en las páginas de la instancia.
 *
 *  · Quien configura (la base: `puede_configurar`) y hay algún módulo sin configurar: UNA banda no bloqueante, primer hijo de <main>, no fija
 *    (revisión previa #285, Diseño): «Facturas: sin configurar» o «3 módulos sin configurar: …», un solo botón «Configurar» al asistente del
 *    primer módulo pendiente y «Ahora no», que la esconde durante la sesión (comodidad; vuelve al entrar otra vez).
 *  · Quien no configura no ve banda; solo, en la pantalla de un módulo sin configurar, la nota «aún no está listo» y QUIÉN lo termina.
 *  · Nunca un callejón sin salida (owner, 15-oct-2026: «Yo soy superadmin, debería ver el botón»): quien configura y ya pulsó «Ahora no»
 *    sigue viendo, en la pantalla de un módulo sin configurar, la nota CON el botón «Configurar» a ese módulo.
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
      if (oculto) {   // «Ahora no» esconde la banda general, no la salida de la pantalla del módulo que falta
        if (moduloPagina && pend.some(function (m) { return m.modulo === moduloPagina; })) return { tipo: 'nota', modulo: moduloPagina, destino: RUTA_ASISTENTE + '?modulo=' + encodeURIComponent(moduloPagina) };
        return null;
      }
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
  // Banda del diseño del owner (S02, 12-oct): círculo con icono, título y detalle, «Configurar» y «Ahora no». Colores por token de la piel.
  function textosBanda(S, d) {
    var nombres = d.modulos.map(function (m) { return S.nombreModulo(m); });
    var T = window.lwT || function (x, hh) { var v = x; Object.keys(hh || {}).forEach(function (k) { v = v.split('%' + k).join(hh[k]); }); return v; };
    if (nombres.length === 1) return { titulo: T(S.TEXTOS.general.aviso_titulo_uno), detalle: T(S.TEXTOS.general.aviso_detalle_uno, { m: nombres[0] }) };
    return { titulo: T(S.TEXTOS.general.aviso_titulo_varios, { n: String(nombres.length) }), detalle: T(S.TEXTOS.general.aviso_detalle_varios, { lista: nombres.join(', ') }) };
  }
  function icono() {
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '22'); svg.setAttribute('height', '22'); svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.6'); svg.setAttribute('stroke-linejoin', 'round');
    ['M12 3l9 5-9 5-9-5z', 'M3 13l9 5 9-5'].forEach(function (dd) { var p = document.createElementNS(ns, 'path'); p.setAttribute('d', dd); svg.appendChild(p); });
    return svg;
  }
  function banda(S, d) {
    var tx = textosBanda(S, d);
    var cierra = h('button', { type: 'button', 'data-axw-aviso': 'ahora-no', class: 'inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-outline-variant text-deep-lagoon font-label-md text-label-md axw-btn', style: 'min-height:44px', text: S.texto('general', 'ahora_no') });
    var ir = h('a', { href: d.destino, 'data-axw-aviso': 'configurar', class: 'inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md axw-btn', style: 'min-height:44px', text: S.texto('general', 'configurar') });
    var circulo = h('span', { class: 'inline-flex items-center justify-center rounded-full bg-surface-container-high text-deep-lagoon', style: 'width:44px;height:44px;flex:none', 'aria-hidden': 'true' });
    circulo.appendChild(icono());
    var caja = h('section', { role: 'status', 'data-axw-aviso': 'banda', class: 'flex flex-col md:flex-row md:items-center gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-5' }, [
      h('div', { class: 'flex items-start md:items-center gap-4 flex-1 min-w-0' }, [circulo,
        h('div', { class: 'flex flex-col gap-1 min-w-0' }, [
          h('h2', { class: 'font-headline-sm text-deep-lagoon', style: 'font-size:16px;line-height:1.3', 'data-axw-aviso': 'titulo', text: tx.titulo }),
          h('p', { class: 'font-body-md text-body-md text-on-surface-variant', 'data-axw-aviso': 'texto', text: tx.detalle })
        ])]),
      h('div', { class: 'flex flex-col md:flex-row md:items-center gap-2' }, [ir, cierra])
    ]);
    cierra.addEventListener('click', function () { ocultaSesion(); if (caja.parentNode) caja.parentNode.removeChild(caja); });
    return caja;
  }
  // Nota del diseño del owner (S02b): el nombre del módulo y «aún no está listo». Quien no configura lee quién lo termina (sin botones); quien
  // configura (d.destino) lee que puede terminarlo ya y tiene «Configurar» a ese módulo (owner, 15-oct-2026: nunca un callejón sin salida).
  function nota(S, d) {
    var hijos = [
      h('span', { class: 'font-label-md text-[11px] tracking-[0.14em] uppercase text-outline', text: S.nombreModulo(d.modulo) }),
      h('h2', { class: 'font-headline-sm text-headline-sm text-deep-lagoon', text: S.texto('general', 'nota_titulo') }),
      h('p', { class: 'font-body-md text-body-md text-on-surface-variant', 'data-axw-aviso': 'texto', text: S.texto('general', d.destino ? 'nota_conf' : 'nota_texto') })
    ];
    if (d.destino) hijos.push(h('div', null, [h('a', { href: d.destino, 'data-axw-aviso': 'configurar', class: 'inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md axw-btn', style: 'min-height:44px', text: S.texto('general', 'configurar') })]));
    return h('section', { role: 'status', 'data-axw-aviso': 'nota', class: 'flex flex-col gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-5' }, hijos);
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
      var el = d.tipo === 'banda' ? banda(S, d) : nota(S, d);
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { pon(el); }); else pon(el);
    });
  }
  window.AXW_AVISO = { decide: decide };
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arranca); else arranca();
  }
})();
