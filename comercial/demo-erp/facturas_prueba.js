/* Facturas de PRUEBA marcadas (erp-front, 14-oct-2026; contrato bbm_bot_al_erp_13oct.md §3b, opción A aceptada por agencia-81).
 * PROVISIONAL hasta que Facturas sea pantalla del maestro (N6): la lista, las cifras y el papel son de Lawang (datos.js, editores.js,
 * clasico/facturas/documento.js) y no se tocan ni se enganchan por su texto. build.py pega esta capa al final de guard.js SOLO en las
 * instancias donde va la migración que crea `facturas_prueba_datos()` (hoy bbm, la serie P).
 * Qué hace, y solo esto:
 *  · Pantallas con cifras sumadas en el navegador (Facturas, Recibos, Vencimientos, Finanzas, Home): una franja que NO se cierra mientras haya
 *    alguna factura de prueba: cuántas hay, que las cifras de esa pantalla aún las cuentan, y en Facturas cuánto suman por moneda. Y en cualquier
 *    lista, cada fila de prueba (por su identificador estable `data-lw-id`) con la pastilla «PRUEBA».
 *  · Papel: envuelve por su NOMBRE las dos funciones globales de documento.js en cuanto carga (evento load en captura, antes que el onload de
 *    editores.js): `documentoHTML(d, opts)` (la vista en pantalla) y `documentoPagina(d, opts)` (la página entera: imprimir, PDF y el html del
 *    correo; en bbm llama al documentoHTML INTERNO del papel en indonesio, no al global, así que hay que envolver las dos). Si `opts.numero` es de
 *    prueba, pone la franja «PRUEBA — sin validez fiscal» arriba del documento, en los idiomas del papel.
 *  · Qué es de prueba: el número está en la lectura del servidor, o tiene la forma de la serie P / PR (`<prefijo>-P2026-00001`, `…-PR2026-…`;
 *    el contrato §3b la admite como criterio secundario). Así, con la lectura aún en camino o caída, una P sigue saliendo marcada y una factura
 *    real que va a un cliente nunca lleva un aviso de «no la imprimas».
 *  · Falla en voz alta (agencia-81): si la lectura falla o llega recortada, la franja lo dice y se reintenta a la siguiente; si documento.js no trae
 *    las dos funciones o cambió su firma, la franja y cada fila de prueba dicen «no se pudo marcar el papel como prueba; no la imprimas»,
 *    en CUALQUIER pantalla (también /contratos/ y las que no suman). Y si se pinta un papel sin serie P con la lectura caída (un recibo de
 *    una P solo se reconoce por la lectura), la franja lo dice allí mismo. Con la lectura caída, repintar el mismo papel no la vuelve a
 *    pedir: otro documento o 10 s después, sí (revisor erp-front-cobros, BAJA de AXW-291).
 * Enganches: data-lw-id, data-axw-prueba="…", los nombres de las funciones y la ruta del script. Nunca un rótulo de Lawang.
 * Sin comentarios al final de una línea de código: build.py quita los de línea entera y los de bloque, y lo que quedara saldría en el guard.js público.
 */
(function () {
  'use strict';
  var TX = {
    es: { chip: 'PRUEBA', papel: 'PRUEBA — sin validez fiscal', hay: 'Hay %n documentos de PRUEBA (serie P). No son reales y las cifras de esta pantalla todavía los cuentan.',
          suman: 'Facturas de prueba: %t.', recortado: 'Solo se han podido mirar los 500 más recientes: puede haber más.',
          fallo: 'No se ha podido comprobar qué facturas son de prueba: las cifras de esta pantalla pueden contarlas. Recarga la página para volver a intentarlo.',
          roto: 'No se pudo marcar el papel como prueba: no imprimas ni envíes ninguna factura de prueba.',
          dudoso: 'No se ha podido comprobar si este documento es de prueba: si lo es, su papel puede salir sin la marca. Recarga la página antes de imprimirlo o enviarlo.' },
    en: { chip: 'TEST', papel: 'TEST — not a tax invoice', hay: 'There are %n TEST documents (P series). They are not real and the figures on this screen still count them.',
          suman: 'Test invoices: %t.', recortado: 'Only the latest 500 could be checked: there may be more.',
          fallo: 'We could not check which invoices are tests: the figures on this screen may count them. Reload the page to try again.',
          roto: 'The document could not be marked as a test: do not print or send any test invoice.',
          dudoso: 'We could not check whether this document is a test: if it is, it may come out without its mark. Reload the page before printing or sending it.' },
    id: { chip: 'UJI COBA', papel: 'UJI COBA — tidak berlaku sebagai faktur pajak', hay: 'Ada %n dokumen UJI COBA (seri P). Dokumen ini tidak nyata dan angka di layar ini masih menghitungnya.',
          suman: 'Invoice uji coba: %t.', recortado: 'Hanya 500 terbaru yang dapat diperiksa: mungkin masih ada lagi.',
          fallo: 'Tidak dapat memeriksa invoice mana yang uji coba: angka di layar ini mungkin menghitungnya. Muat ulang halaman untuk mencoba lagi.',
          roto: 'Dokumen tidak dapat ditandai sebagai uji coba: jangan cetak atau kirim invoice uji coba.',
          dudoso: 'Tidak dapat memeriksa apakah dokumen ini uji coba: jika ya, dokumen bisa keluar tanpa tandanya. Muat ulang halaman sebelum mencetak atau mengirimnya.' }
  };
  var SERIE_P = /-PR?\d{4}-\d+$/;
  var FUNCIONES = ['documentoHTML', 'documentoPagina'];
  function lengua() { var l = window.LW_IDIOMA || 'es'; return TX[l] ? l : 'en'; }
  function t(k, n, tot) { return TX[lengua()][k].replace('%n', String(n)).replace('%t', tot || ''); }
  var D = null, pedida = null, roto = false, dudoso = false, falloEn = 0, numReintento = null;

  // La lectura del servidor. Un fallo no se queda: la siguiente llamada vuelve a pedir.
  function lee() {
    if (pedida) return pedida;
    pedida = new Promise(function (ok) {
      var desde = Date.now();
      (function espera() {
        if (typeof window.lwDatos === 'function') return ok(window.lwDatos('facturas_prueba_datos'));
        if (Date.now() - desde > 20000) return ok({ error: { message: 'sin lwDatos' } });
        setTimeout(espera, 50);
      })();
    }).then(function (r) {
      var d = r && !r.error ? r.data : null;
      var bien = d && Array.isArray(d.ids) && Array.isArray(d.numeros) && Array.isArray(d.totales) && typeof d.recortado === 'boolean';
      return bien ? { ids: d.ids, numeros: d.numeros, totales: d.totales, recortado: d.recortado } : null;
    }, function () { return null; }).then(function (x) {
      if (x) { D = x; dudoso = false; }
      else { D = { fallo: true, ids: [], numeros: [], totales: [] }; pedida = null; falloEn = Date.now(); }
      pinta();
      return D;
    });
    return pedida;
  }
  function esPrueba(num) {
    if (!num) return false;
    if (SERIE_P.test(num)) return true;
    return !!(D && !D.fallo && D.numeros.indexOf(num) !== -1);
  }

  function importe(x) {
    try { return new Intl.NumberFormat(typeof window.lwLocale === 'function' ? window.lwLocale() : undefined, { style: 'currency', currency: x.moneda }).format(Number(x.total)); }
    catch (e) { return String(x.total) + ' ' + String(x.moneda); }
  }
  // Las pantallas donde datos.js suma facturas en el navegador (las P entran en sus cifras); Facturas además da cuánto suman
  function conCifras() { return /^\/(facturas|recibos|vencimientos|finanzas|home)\/?$/.test(location.pathname); }
  function enFacturas() { return /^\/facturas\/?$/.test(location.pathname); }
  function pinta() {
    if (!D || !document.body) return;
    franja();
    filas();
  }
  // La franja: arriba del contenido principal; si alguien la quita, vuelve (no se cierra mientras haya alguna prueba o un fallo).
  function franja() {
    var cifras = conCifras(), hay = cifras && D.ids.length > 0, fallo = cifras && D.fallo, avisa = hay || fallo || roto || dudoso;
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
    if (fallo) partes.push(t('fallo'));
    if (dudoso) partes.push(t('dudoso'));
    if (hay) partes.push(t('hay', D.ids.length));
    if (hay && enFacturas() && D.totales.length) partes.push(t('suman', 0, D.totales.map(importe).join(' · ')));
    if (cifras && D.recortado) partes.push(t('recortado'));
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

  // ── el papel ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  function franjaPapel(texto) {
    return '<div data-axw-prueba="papel" style="margin:0 0 12px;padding:10px 14px;border:2px solid #A3261A;color:#A3261A;font:700 15px/1.4 system-ui,sans-serif;text-align:center;letter-spacing:.03em">'
      + texto.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</div>';
  }
  // En los idiomas del papel (AXW_IDIOMAS_DOC, p. ej. id·en en bbm); sin ellos, el de la pantalla
  function textoPapel() {
    var ls = Array.isArray(window.AXW_IDIOMAS_DOC) && window.AXW_IDIOMAS_DOC.length ? window.AXW_IDIOMAS_DOC : [lengua()];
    return ls.filter(function (l) { return TX[l]; }).map(function (l) { return TX[l].papel; }).join(' · ') || TX.en.papel;
  }
  // La franja va dentro del documento: tras la apertura de `.doc` (la hoja A4 de documentoPagina: así no empuja la hoja a una segunda página),
  // si no tras <body>, y en un fragmento (documentoHTML) al principio.
  function pon(html, franjaHtml) {
    if (html.indexOf('data-axw-prueba="papel"') !== -1) return html;
    var m = /<div class="doc"[^>]*>/.exec(html) || /<body[^>]*>/i.exec(html);
    if (!m) return franjaHtml + html;
    var fin = m.index + m[0].length;
    return html.slice(0, fin) + franjaHtml + html.slice(fin);
  }
  function envuelve() {
    var faltan = FUNCIONES.filter(function (n) { return typeof window[n] !== 'function' || window[n].length !== 2; });
    if (faltan.length) { roto = true; if (D) pinta(); else lee(); return; }
    FUNCIONES.forEach(function (n) {
      var orig = window[n];
      if (orig.__axwPrueba) return;
      var envuelta = function (d, opts) {
        var html = orig.apply(this, arguments);
        if (typeof html !== 'string') return html;
        var num = opts && typeof opts.numero === 'string' ? opts.numero : '';
        if (D && D.fallo) {
          if (num !== numReintento || Date.now() - falloEn > 10000) { numReintento = num; lee(); }
          if (!esPrueba(num) && !dudoso) { dudoso = true; pinta(); }
        }
        return esPrueba(num) ? pon(html, franjaPapel(textoPapel())) : html;
      };
      envuelta.__axwPrueba = true;
      window[n] = envuelta;
    });
    lee();
  }
  function esDocumento(el) { return el && el.tagName === 'SCRIPT' && /\/clasico\/facturas\/documento\.js(\?|$)/.test(el.getAttribute('src') || ''); }
  // captura en document: también ve el load de un <script> que editores.js mete en <head> (no burbujea, pero la captura pasa por document)
  document.addEventListener('load', function (ev) { if (esDocumento(ev.target)) envuelve(); }, true);
  document.addEventListener('error', function (ev) { if (esDocumento(ev.target)) { roto = true; if (D) pinta(); else lee(); } }, true);
  if (typeof window.documentoHTML === 'function' || typeof window.documentoPagina === 'function') envuelve();

  function arranca() {
    if (typeof MutationObserver === 'function') {
      var pend = null;
      new MutationObserver(function () {
        if (!D || pend) return;
        pend = setTimeout(function () { pend = null; pinta(); }, 80);
      }).observe(document.body, { childList: true, subtree: true });
    }
    // En cualquier página: el papel se puede pintar desde Facturas, Recibos, Contratos, Operaciones… y la lista de números tiene que estar
    // antes de que alguien lo abra (una sola lectura pequeña por página).
    lee();
  }
  if (document.body) arranca(); else document.addEventListener('DOMContentLoaded', arranca);
})();
