/* Facturas de PRUEBA marcadas (erp-front, 14-oct-2026; contrato bbm_bot_al_erp_13oct.md §3b, opción A aceptada por agencia-81).
 * PROVISIONAL hasta que Facturas sea pantalla del maestro (N6): la lista y el papel son de Lawang (datos.js, editores.js, clasico/facturas/documento.js)
 * y no se tocan ni se enganchan por su texto. build.py pega esta capa al final de guard.js SOLO en las instancias donde va la migración que crea
 * `facturas_prueba_datos()` (hoy bbm, la serie P).
 * Qué hace, y solo esto:
 *  · Lista (/facturas/): marca cada fila de prueba por su identificador estable `data-lw-id` (el id de la factura que pone datos.js) con la pastilla
 *    «PRUEBA», y pone encima una franja que NO se cierra mientras haya alguna: cuántos documentos de prueba hay, que las cifras de la pantalla aún
 *    los cuentan (las suma datos.js en el navegador; el servidor ya las saca de lo suyo) y cuánto suman las facturas de prueba por moneda.
 *  · Papel (pantalla, impresión y PDF «imprimir» del navegador): envuelve `window.documentoHTML(d, opts)` por su NOMBRE, en el momento en que carga
 *    documento.js (evento load en captura, antes que el onload de editores.js), y si `opts.numero` es de prueba pone la franja «PRUEBA — sin validez
 *    fiscal» arriba del documento, en los idiomas del papel.
 *  · Falla en voz alta (agencia-81): si la lectura falla o llega recortada, la franja de la lista lo dice; si documento.js no trae `documentoHTML` o
 *    cambió de firma, la franja de la lista y cada fila de prueba dicen «no se pudo marcar como prueba; no la imprimas»; si el papel se pinta antes de
 *    saber qué es de prueba, lleva el aviso «no se ha podido comprobar si es de prueba: no la imprimas todavía».
 * Enganches: data-lw-id, data-axw-prueba="…", el nombre de la función y la ruta del script. Nunca un rótulo de Lawang.
 */
(function () {
  'use strict';
  var TX = {
    es: { chip: 'PRUEBA', papel: 'PRUEBA — sin validez fiscal', hay: 'Hay %n documentos de PRUEBA (serie P). No son reales y las cifras de esta pantalla todavía los cuentan.',
          suman: 'Facturas de prueba: %t.', recortado: 'Solo se han podido mirar los 500 más recientes: puede haber más.',
          fallo: 'No se ha podido comprobar qué facturas son de prueba: las cifras de esta pantalla pueden contarlas.',
          roto: 'No se pudo marcar el papel como prueba: no imprimas ni envíes ninguna factura de prueba.',
          duda: 'No se ha podido comprobar si es una factura de prueba: no la imprimas todavía. Cierra y vuelve a abrirla.' },
    en: { chip: 'TEST', papel: 'TEST — not a tax invoice', hay: 'There are %n TEST documents (P series). They are not real and the figures on this screen still count them.',
          suman: 'Test invoices: %t.', recortado: 'Only the latest 500 could be checked: there may be more.',
          fallo: 'We could not check which invoices are tests: the figures on this screen may count them.',
          roto: 'The document could not be marked as a test: do not print or send any test invoice.',
          duda: 'We could not check whether this is a test invoice: do not print it yet. Close it and open it again.' },
    id: { chip: 'UJI COBA', papel: 'UJI COBA — tidak berlaku sebagai faktur pajak', hay: 'Ada %n dokumen UJI COBA (seri P). Dokumen ini tidak nyata dan angka di layar ini masih menghitungnya.',
          suman: 'Faktur uji coba: %t.', recortado: 'Hanya 500 terbaru yang dapat diperiksa: mungkin masih ada lagi.',
          fallo: 'Tidak dapat memeriksa faktur mana yang uji coba: angka di layar ini mungkin menghitungnya.',
          roto: 'Dokumen tidak dapat ditandai sebagai uji coba: jangan cetak atau kirim faktur uji coba.',
          duda: 'Tidak dapat memeriksa apakah ini faktur uji coba: jangan dicetak dulu. Tutup lalu buka lagi.' }
  };
  function lengua() { var l = window.LW_IDIOMA || 'es'; return TX[l] ? l : 'en'; }
  function t(k, n, tot) { return TX[lengua()][k].replace('%n', String(n)).replace('%t', tot || ''); }
  var D = null, pedida = null, roto = false;

  function lee() {
    if (pedida) return pedida;
    pedida = new Promise(function (ok) {
      var desde = Date.now();
      (function espera() {   // lwDatos llega después de guard.js
        if (typeof window.lwDatos === 'function') return ok(window.lwDatos('facturas_prueba_datos'));
        if (Date.now() - desde > 20000) return ok({ error: { message: 'sin lwDatos' } });
        setTimeout(espera, 50);
      })();
    }).then(function (r) {
      var d = r && !r.error ? r.data : null;
      var bien = d && Array.isArray(d.ids) && Array.isArray(d.numeros) && Array.isArray(d.totales) && typeof d.recortado === 'boolean';
      D = bien ? { ids: d.ids, numeros: d.numeros, totales: d.totales, recortado: d.recortado } : { fallo: true, ids: [], numeros: [], totales: [] };
      pinta();
      return D;
    }, function () { D = { fallo: true, ids: [], numeros: [], totales: [] }; pinta(); return D; });
    return pedida;
  }

  function importe(x) {
    try { return new Intl.NumberFormat(typeof window.lwLocale === 'function' ? window.lwLocale() : undefined, { style: 'currency', currency: x.moneda }).format(Number(x.total)); }
    catch (e) { return String(x.total) + ' ' + String(x.moneda); }
  }
  function enLista() { return /^\/facturas\/?$/.test(location.pathname); }
  function pinta() {
    if (!D || !document.body) return;
    if (enLista()) franja();
    filas();
  }
  // La franja de la lista: arriba del contenido principal; si alguien la quita, vuelve (no se cierra mientras haya alguna prueba o un fallo).
  function franja() {
    var hay = D.ids.length > 0, avisa = hay || D.fallo || roto;
    var f = document.querySelector('[data-axw-prueba="franja"]');
    if (!avisa) { if (f) f.parentNode.removeChild(f); return; }
    var main = document.querySelector('main') || document.body;
    if (!f) {
      f = document.createElement('div');
      f.setAttribute('data-axw-prueba', 'franja'); f.setAttribute('role', 'alert');
      f.style.cssText = 'margin:12px 16px;padding:12px 16px;border-radius:12px;border:2px solid #A3261A;background:#FDECEA;color:#5F1A12;font:600 14px/1.45 system-ui,sans-serif';
      main.insertBefore(f, main.firstChild);
    }
    var partes = [];
    if (D.fallo) partes.push(t('fallo'));
    if (hay) partes.push(t('hay', D.ids.length));
    if (hay && D.totales.length) partes.push(t('suman', 0, D.totales.map(importe).join(' · ')));
    if (D.recortado) partes.push(t('recortado'));
    if (roto) partes.push(t('roto'));
    var texto = partes.join(' ');
    if (f.textContent !== texto) f.textContent = texto;
  }
  function filas() {
    if (!D.ids.length) return;
    var set = {};
    D.ids.forEach(function (id) { set[id] = 1; });
    var fs = document.querySelectorAll('[data-lw-id]');
    for (var i = 0; i < fs.length; i++) {
      var fila = fs[i];
      if (!set[fila.getAttribute('data-lw-id')]) continue;
      var chip = fila.querySelector('[data-axw-prueba="chip"]');
      var txt = roto ? t('chip') + ' · ' + t('roto') : t('chip');
      if (chip && chip.textContent === txt) continue;
      if (!chip) {
        chip = document.createElement('span');
        chip.setAttribute('data-axw-prueba', 'chip');
        chip.style.cssText = 'display:inline-block;margin:0 6px;padding:2px 8px;border-radius:999px;background:#A3261A;color:#fff;font:700 11px/1.4 system-ui,sans-serif;letter-spacing:.04em';
        var celda = fila.querySelector('td') || fila;
        celda.insertBefore(chip, celda.firstChild);
      }
      chip.textContent = txt;
    }
  }

  // ── el papel: envolver documentoHTML por su nombre cuando carga documento.js ─────────────────────────────────────────────────────────────
  function franjaPapel(texto) {
    return '<div data-axw-prueba="papel" style="margin:0 0 12px;padding:10px 14px;border:2px solid #A3261A;color:#A3261A;font:700 15px/1.4 system-ui,sans-serif;text-align:center;letter-spacing:.03em">'
      + texto.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</div>';
  }
  function textoPapel() {   // en los idiomas del papel (AXW_IDIOMAS_DOC, p. ej. id·en en bbm); sin ellos, el de la pantalla
    var ls = Array.isArray(window.AXW_IDIOMAS_DOC) && window.AXW_IDIOMAS_DOC.length ? window.AXW_IDIOMAS_DOC : [lengua()];
    return ls.filter(function (l) { return TX[l]; }).map(function (l) { return TX[l].papel; }).join(' · ') || TX.en.papel;
  }
  function pon(html, franjaHtml) {
    var i = html.search(/<body[^>]*>/i);
    if (i === -1) return franjaHtml + html;
    var fin = html.indexOf('>', i) + 1;
    return html.slice(0, fin) + franjaHtml + html.slice(fin);
  }
  function envuelve() {
    var orig = window.documentoHTML;
    if (typeof orig !== 'function' || orig.length !== 2) { roto = true; if (D) pinta(); else lee(); return; }
    if (orig.__axwPrueba) return;
    var envuelta = function (d, opts) {
      var html = orig.apply(this, arguments);
      if (typeof html !== 'string') return html;
      var num = opts && typeof opts.numero === 'string' ? opts.numero : '';
      if (!D) return pon(html, franjaPapel(TX[lengua()].duda));   // aún no se sabe: en voz alta, nunca una P sin marca
      if (D.fallo) return num ? pon(html, franjaPapel(TX[lengua()].duda)) : html;
      if (num && D.numeros.indexOf(num) !== -1) return pon(html, franjaPapel(textoPapel()));
      return html;
    };
    envuelta.__axwPrueba = true;
    window.documentoHTML = envuelta;
  }
  function esDocumento(el) { return el && el.tagName === 'SCRIPT' && /\/clasico\/facturas\/documento\.js(\?|$)/.test(el.getAttribute('src') || ''); }
  document.addEventListener('load', function (ev) { if (esDocumento(ev.target)) envuelve(); }, true);   // captura: antes del onload de editores.js
  document.addEventListener('error', function (ev) { if (esDocumento(ev.target)) { roto = true; if (D) pinta(); } }, true);
  if (typeof window.documentoHTML === 'function') envuelve();   // ya cargado (una página que lo trae en el HTML)

  function arranca() {
    if (typeof MutationObserver === 'function') {
      var pend = null;
      new MutationObserver(function (ms) {
        for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) if (esDocumento(ms[i].addedNodes[j])) lee();   // se pide en cuanto se va a pintar un papel
        if (!D || pend) return;
        pend = setTimeout(function () { pend = null; pinta(); }, 80);
      }).observe(document.body, { childList: true, subtree: true });
    }
    if (enLista()) lee();
  }
  if (document.body) arranca(); else document.addEventListener('DOMContentLoaded', arranca);
})();
