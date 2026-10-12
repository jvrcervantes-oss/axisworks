/* menu.js — cierra el menú compacto del diseño «X marks the work» (<details class="menubtn">, en inc/x/cabecera.php,
 * home_tpl.php y aaas_tpl.php). Un <details> solo se abre y se cierra con su <summary>; aquí se cierra también con
 * Esc (y el foco vuelve al summary), con un clic fuera y al pulsar uno de sus enlaces. Delegado en document, sin
 * dependencias: en una página sin menú no hace nada. Encargo 20261012_axisworks_web_nueva_brand_kit (revisor). */
(function () {
  'use strict';

  function abiertos() {
    return Array.prototype.slice.call(document.querySelectorAll('details.menubtn[open]'));
  }

  function cierra(menu, devuelveFoco) {
    menu.removeAttribute('open');
    if (devuelveFoco) {
      var s = menu.querySelector('summary');
      if (s) s.focus();
    }
  }

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
    abiertos().forEach(function (m) { cierra(m, true); });
  });

  /* click (no pointerdown): el propio summary abre y cierra en click, y así no se pisan. */
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    abiertos().forEach(function (m) {
      if (!m.contains(t)) { cierra(m, false); return; }
      var a = t.closest ? t.closest('a') : null;
      if (a && m.contains(a)) cierra(m, false);   /* sin preventDefault: el enlace navega */
    });
  });
})();
