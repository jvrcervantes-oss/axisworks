/* nav.js -- LA navegacion, la misma en las 16 paginas.
 * Desde el rediseno del 24-sep-2026 la barra es opaca siempre (ya no hay
 * hero oscuro debajo), asi que aqui solo queda el menu movil. */
(function(){
  "use strict";
  var burger = document.getElementById('burger');
  var navLinks = document.getElementById('navLinks');
  if(!burger || !navLinks) return;
  burger.addEventListener('click', function(){
    var open = navLinks.classList.toggle('open');
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  });
  navLinks.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      navLinks.classList.remove('open'); burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', false);
    });
  });
})();
