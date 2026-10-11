/* Indonesio de la interfaz del ERP (instancias con "idiomas": ["id", "en"] en erp/instancias.json; hoy bbm). Owner, 11-oct-2026: «Añade Indonesio y quita español».
 * build.py (idiomas_instancia) lo pega AL FINAL del contracts/assets/i18n.js de la copia de esa instancia, con el diccionario de i18n_id.json en el hueco de window.LW_ID.
 * Lawang y la demo no lo llevan. No toca las tripas de lwT: lo ENVUELVE, así que lo que i18n.js ya hace (la ficha de la instancia, los %huecos, la
 * clave~contexto) sigue igual.
 *  · window.LW_ID: diccionario con la MISMA clave que LW_EN (el texto en español). Las pantallas del maestro le añaden el suyo (ID_xx) solo si existe.
 *  · lwT en 'id': busca en LW_ID (también sin los blancos de los lados, como hace i18n.js con EN); si falta, cae al INGLÉS; si tampoco hay inglés, sale la
 *    clave, que es español. Dos contadores para que la prueba pueda ponerse roja (revisión previa de Calidad, 12-oct): LW_T_CAIDA_EN (tolerado mientras se
 *    traduce el resto, se lista) y LW_T_ESPANOL (nunca tolerado).
 *  · lwLocale en 'id' → 'id-ID' (fechas y números; las fechas escritas a mano con 'es-ES' las cambia el build).
 *  · lwIdiomaAplicar en 'id': traduce [data-lwt], placeholder, title y aria-label como hace i18n.js en inglés, y pone <html lang="id">.
 * Los enganches del código van por identificador (data-accion, data-lw): traducir un rótulo no rompe nada. */
(function () {
  'use strict';
  window.LW_ID = __AXW_LW_ID__;
  window.LW_T_CAIDA_EN = window.LW_T_CAIDA_EN || new Set();
  window.LW_T_ESPANOL = window.LW_T_ESPANOL || new Set();
  var tienePropia = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  var tSinId = window.lwT, localeSinId = window.lwLocale, aplicarSinId = window.lwIdiomaAplicar;

  // La traducción de `base` en un diccionario, con la misma segunda oportunidad que i18n.js: la frase con blanco de sobra a los lados.
  function busca(dic, base) {
    if (tienePropia(dic, base)) return dic[base];
    var trozos = base.match(/^(\s*)([\s\S]*?)(\s*)$/), nucleo = trozos && trozos[2];
    if (nucleo && nucleo !== base && tienePropia(dic, nucleo)) return trozos[1] + dic[nucleo] + trozos[3];
    return null;
  }
  // Solo letras y signos que no hace falta traducir (números, fechas, guiones, porcentajes, códigos en mayúsculas cortos): no cuentan como «sin traducir».
  function sinTexto(s) { return /^[\s\d.,:;%()\[\]\/+\-–—·…×#*'"«»<>=?!¡¿€$Rp]*$/.test(s) || /^[A-Z0-9_\-]{1,6}$/.test(s); }

  window.lwT = function (s, huecos) {
    if (window.LW_IDIOMA !== 'id' || s == null) return tSinId(s, huecos);
    var base = String(s);
    var v = busca(window.LW_ID, base);
    if (v != null) return tSinId(v, huecos);   // la traducción pasa por el lwT de siempre: ficha (%marca) y huecos como en inglés
    var en = busca(window.LW_EN || {}, base);
    if (!sinTexto(base.split('~')[0])) (en != null ? window.LW_T_CAIDA_EN : window.LW_T_ESPANOL).add(base);
    if (en != null) return tSinId(en, huecos);
    return tSinId(base, huecos);
  };

  window.lwLocale = function () { return window.LW_IDIOMA === 'id' ? 'id-ID' : localeSinId(); };

  window.lwIdiomaAplicar = function (raiz) {
    if (window.LW_IDIOMA !== 'id') return aplicarSinId(raiz);
    var r = raiz || document;
    var pares = [['data-lwt', null], ['data-lwt-ph', 'placeholder'], ['data-lwt-title', 'title'], ['data-lwt-aria', 'aria-label']];
    pares.forEach(function (p) {
      r.querySelectorAll('[' + p[0] + ']').forEach(function (el) {
        var k = el.getAttribute(p[0]) || (p[1] ? el.getAttribute(p[1]) : el.textContent.trim()) || '';
        if (!k) return;
        el.setAttribute(p[0], k);   // la clave se queda en el atributo: repintar dos veces no traduce la traducción
        if (p[1]) el.setAttribute(p[1], window.lwT(k)); else el.textContent = window.lwT(k);
      });
    });
    if (document.title.indexOf(' · ') !== -1) {
      var tramos = document.title.split(' · '), ultimo = tramos.pop();
      document.title = tramos.concat(window.lwT(ultimo)).join(' · ');
    }
    if (document.documentElement) document.documentElement.lang = 'id';
  };
  if (window.LW_IDIOMA === 'id' && document.documentElement) document.documentElement.lang = 'id';
})();
