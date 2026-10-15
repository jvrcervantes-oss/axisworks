/* traduce_instancia.js — el texto fijo de Lawang que la pantalla NO pasa por el diccionario, en el idioma de la instancia (bbm-idiomas, 15-oct-2026).
 *
 * Por qué existe: owner, 15-oct, bbm en inglés: «/ajustes/ no puede salir en español, ¿tengo que ir ventana a ventana avisándote?». El barrido de
 * pantallas (pruebas/idiomas_pantallas.harness.cjs) contó ~100 textos en español en 25 pantallas: HTML de Lawang sin data-lwt (Cuentas entera),
 * aria-label y title sin data-lwt-aria/-title, el <title> en indonesio y frases montadas («No se ha podido cargar «facturas» (…) — revisa…»).
 * Arreglarlos con un parche por texto sobre la copia de Lawang eran ~60 anclas literales más, y la regla «el build parchea Lawang por anclas» ya
 * está marcada para subir de peldaño (cada cambio de texto en Lawang deja rojo el build de todas las instancias). Aquí va UNA pieza en tiempo de
 * ejecución: traduce lo que YA es una clave del diccionario (LW_EN / LW_ID, con lo que añade MENU_I18N del build), sin tocar nada más.
 *
 * Qué traduce, solo con LW_IDIOMA distinto de 'es' (en español sale sin tocar el DOM: Lawang y la demo no lo cargan; solo build.py --instancia):
 *   · un nodo de texto cuyo texto, sin los blancos de los lados, es EXACTAMENTE una clave (los blancos se conservan);
 *   · un elemento cuyo texto entero es una clave y solo lleva dentro marcado de formato sin atributos de enganche (<b class>, <strong>, <em>):
 *     una frase con negrita no se parte en trozos (Idiomas: frases enteras, nunca fragmentos);
 *   · title, aria-label y placeholder con la misma regla, y el <title> de la pestaña («Ajustes — ⟨marca⟩»: el tramo antes de « — »);
 *   · frases montadas con un dato, por PATRONES (abajo), y las compuestas «A: B» y «A · B» cuando cada trozo es una clave.
 * Qué NO toca: lo que ya lleva data-lwt / data-lwt-nodos / data-lwt-ph / -title / -aria (lo traduce lwIdiomaAplicar desde su clave española: si
 * se tradujera antes, derivaría la clave del texto ya en inglés), script/style/code/textarea/input/select de escribir, [contenteditable],
 * [translate=no] y lo que lleva un lang distinto (el selector nombra cada idioma en su lengua: «Bahasa Indonesia», W3C i18n).
 * El código de las pantallas engancha por data-* e id, nunca por rótulo (CLAUDE.md, «Cambiar lo que se ve no rompe lo que funciona»; gate
 * tools/escrituras_front.py), así que cambiar el texto de un nodo no cambia lo que hace. Un DATO que coincida letra a letra con una clave (un
 * cliente llamado «Todos») saldría traducido: es el mismo riesgo que ya asume lwTSuave en avisos y fichas.
 * Lo pinta tarde lo que llega por red: un MutationObserver (childList + subtree, sin characterData para no dispararse con lo que escribe él)
 * traduce lo que se añade. window.axwTraduceTexto(s) da la traducción de un texto suelto (la usa el arnés para no contar dos veces una frase que
 * pasó por lwT sin clave pero que la pantalla ya enseña traducida).
 */
(function () {
  if (typeof document === 'undefined' || typeof window.lwT !== 'function') return;
  // El idioma se lee al ARRANCAR (DOMContentLoaded), no al cargar este fichero: la raíz del panel (/index.html de Lawang) carga i18n.js ANTES
  // que idioma.js, así que aquí LW_IDIOMA aún no existía, este fichero se salía y la página «sin permiso» (/?sin_permiso=…) quedaba con el
  // aria-label «Herramientas» del menú en español (bbm-idioma-total, 15-oct-2026, barrido en vivo de bbm.axisworks.studio en en e id).
  var L = window.LW_IDIOMA;
  function idiomaListo() { L = window.LW_IDIOMA; return !!L && L !== 'es'; }
  var E = window.LW_EN || {}, I = window.LW_ID || {}, tiene = Object.prototype.hasOwnProperty;
  // Frases montadas con un dato: [regex sobre el texto entero, {en, id}]. {1}, {2}… son los grupos; un grupo que sea una clave se traduce.
  var PATRONES = __AXW_PATRONES__;
  var rx = PATRONES.map(function (p) { return [new RegExp(p[0]), p[1]]; });
  function clave(s) { return tiene.call(E, s) || (L === 'id' && tiene.call(I, s)); }
  function una(s) { return clave(s) ? window.lwT(s) : null; }
  var VALORES = null;   // las traducciones (valores de LW_EN / LW_ID), una vez y al primer uso: las pantallas añaden las suyas al cargar
  function yaTraducido(s) {
    if (!VALORES) { VALORES = {}; [E, I].forEach(function (d) { for (var k in d) if (tiene.call(d, k)) VALORES[d[k]] = 1; }); }
    return tiene.call(VALORES, s);
  }
  function traduce(s) {
    if (!s || !/[A-Za-zÀ-ÿ]/.test(s)) return null;
    var r = una(s);
    if (r != null) return r;
    for (var i = 0; i < rx.length; i++) {
      var m = s.match(rx[i][0]);
      if (!m) continue;
      var molde = rx[i][1][L] || rx[i][1].en;
      return molde.replace(/\{(\d)\}/g, function (_x, n) { var g = m[+n] || ''; var t = una(g); return t != null ? t : g; });
    }
    var sep = s.indexOf(' · ') !== -1 ? ' · ' : (s.indexOf(': ') !== -1 ? ': ' : null);
    if (sep) {
      var trozos = s.split(sep), sale = [];
      for (var j = 0; j < trozos.length; j++) {
        var tr = trozos[j].trim();
        if (!tr || !/[A-Za-zÀ-ÿ]/.test(tr)) { sale.push(trozos[j]); continue; }
        var x = una(tr);
        if (x == null && yaTraducido(tr)) x = trozos[j];   // un tramo que ya llegó traducido («· sign-up»): se queda
        if (x == null) return null;
        sale.push(x);
      }
      return sale.join(sep);
    }
    return null;
  }
  window.axwTraduceTexto = function (s) { var n = String(s == null ? '' : s).trim(); var r = traduce(n); return r == null ? s : r; };
  var FUERA = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|CODE|PRE|TEXTAREA|INPUT)$/;
  var MARCADO = '[data-lwt],[data-lwt-nodos],[contenteditable],[translate="no"]';
  var FORMATO = /^(B|STRONG|EM|I|SMALL|BR)$/;
  function fueraDe(el) {
    if (!el || el.nodeType !== 1) return true;
    if (FUERA.test(el.tagName) || el.closest(MARCADO)) return true;
    // un trozo con su propio lang (el selector: «Bahasa Indonesia», «English») ya está en el idioma que dice: no se toca
    var conLang = el.closest('[lang]');
    return !!(conLang && conLang !== document.documentElement);
  }
  function nodo(n) {
    var m = n.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!m[2] || fueraDe(n.parentElement)) return;
    var r = traduce(m[2].replace(/\s+/g, ' '));
    if (r != null && r !== m[2]) n.nodeValue = m[1] + r + m[3];
  }
  // Un elemento con una frase partida por formato: <p>Ver el reparto…; <b class="x">cambiarlo…</b>, y el permiso…</p>
  function frase(el) {
    if (fueraDe(el) || !el.children.length || el.children.length > 3) return false;
    for (var c = 0; c < el.children.length; c++) {
      var h = el.children[c];
      if (!FORMATO.test(h.tagName) || h.children.length) return false;
      for (var a = 0; a < h.attributes.length; a++) if (h.attributes[a].name !== 'class') return false;   // un data-lw/id dentro: no se aplana
    }
    var r = traduce(el.textContent.replace(/\s+/g, ' ').trim());
    if (r == null) return false;
    el.textContent = r;
    return true;
  }
  var ATRIBUTOS = [['title', 'data-lwt-title'], ['aria-label', 'data-lwt-aria'], ['placeholder', 'data-lwt-ph']];
  function atributos(el) {
    // aquí no cuenta el data-lwt del TEXTO (<th data-lwt title="…">): el atributo solo lo traduce lwIdiomaAplicar si lleva su data-lwt-title
    if (!el || el.nodeType !== 1 || FUERA.test(el.tagName) || el.closest('[contenteditable],[translate="no"]')) return;
    var conLang = el.closest('[lang]');
    if (conLang && conLang !== document.documentElement) return;
    for (var i = 0; i < ATRIBUTOS.length; i++) {
      var a = ATRIBUTOS[i][0];
      if (!el.hasAttribute(a) || el.hasAttribute(ATRIBUTOS[i][1])) continue;
      var v = el.getAttribute(a).trim(), r = traduce(v);
      if (r != null && r !== v) el.setAttribute(a, r);
    }
  }
  function arbol(raiz) {
    if (raiz.nodeType === 3) { nodo(raiz); return; }
    if (raiz.nodeType !== 1 || fueraDe(raiz)) return;
    var els = [raiz].concat(Array.prototype.slice.call(raiz.querySelectorAll('*')));
    var hechos = [];
    els.forEach(function (el) {
      atributos(el);
      if (el.tagName === 'P' || el.tagName === 'SPAN' || el.tagName === 'DIV' || el.tagName === 'LI' || el.tagName === 'LABEL') {
        if (hechos.some(function (h) { return h.contains(el); })) return;
        if (frase(el)) hechos.push(el);
      }
    });
    var w = document.createTreeWalker(raiz, 4 /* SHOW_TEXT */, null), n, todos = [];
    while ((n = w.nextNode())) todos.push(n);
    todos.forEach(nodo);
  }
  function titulo() {
    var t = document.title, i = t.indexOf(' — '), cab = i === -1 ? t : t.slice(0, i), r = traduce(cab);
    if (r != null && r !== cab) document.title = r + (i === -1 ? '' : t.slice(i));
  }
  function todo() { if (document.body) arbol(document.body); titulo(); }
  function arranca() {
    if (!idiomaListo()) { delete window.axwTraduceTexto; return; }   // en español no se toca el DOM
    todo();
    // Lo que pintan después las pantallas (listas, avisos, ventanas). Se traduce lo AÑADIDO; los cambios de texto que hace este fichero no
    // vuelven a disparar nada (sin characterData). Un nodo ya traducido ya no es una clave: volver a pasar por él no cambia nada.
    var ob = new MutationObserver(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var m = lista[i];
        if (m.type === 'childList') for (var j = 0; j < m.addedNodes.length; j++) arbol(m.addedNodes[j]);
        else if (m.type === 'attributes' && m.target.nodeType === 1) atributos(m.target);
      }
      titulo();
    });
    ob.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder'] });
    var te = document.querySelector('title');
    if (te) new MutationObserver(titulo).observe(te, { childList: true });
  }
  if (document.readyState === 'loading') { if (L === 'es') { delete window.axwTraduceTexto; return; } document.addEventListener('DOMContentLoaded', arranca); }
  else arranca();
})();
