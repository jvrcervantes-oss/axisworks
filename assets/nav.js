/* nav.js -- LA navegacion, la misma en las 16 paginas.
 * `overHero` solo aplica donde hay un #hero oscuro (la portada); en una
 * hoja de servicio no existe ese elemento y la barra se comporta como la
 * normal. Un solo fichero, dos comportamientos, ninguna copia. */
(function(){
  "use strict";
  var hdr = document.getElementById('hdr');
  var burger = document.getElementById('burger');
  var navLinks = document.getElementById('navLinks');
  var overHero = true; /* dark nav while the sticky WebGL hero owns the viewport */
  var heroSection = document.getElementById('hero');
  function onScroll(){
    if(heroSection) overHero = window.scrollY < (heroSection.offsetHeight - window.innerHeight*1.5);
    hdr.classList.toggle('scrolled', window.scrollY > 20 && !overHero);
  }
  onScroll(); window.addEventListener('scroll', onScroll, {passive:true});
  burger.addEventListener('click', function(){
    var open = navLinks.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  navLinks.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){ navLinks.classList.remove('open'); burger.setAttribute('aria-expanded', false); });
  });
})();
