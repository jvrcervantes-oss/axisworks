/* home.js -- solo lo de la portada: la lectura de coordenadas del hero y el
 * formulario de alta. Sin dependencias.
 *
 * 24-sep-2026, 2.ª pasada (calco del mockup de Stitch a petición del owner):
 * fuera la ✕ convergente, la mira CAD a pantalla completa y el eje de scroll.
 * La retícula del hero gira sola por CSS. La navegación vive en nav.js. */
(function(){
  "use strict";
  var fine = window.matchMedia("(pointer: fine)").matches;
  function pad(n){ n=Math.max(0,Math.round(n)); return (''+n).padStart(3,'0'); }

  /* ---- COORD: [X 000 ✕ Y 000] del hero, siguiendo al cursor ----
     Un rAF por movimiento y solo sobre el hero: fuera de él no se escribe nada. */
  var hero = document.getElementById('hero');
  var cx = document.getElementById('cx'), cy = document.getElementById('cy');
  if(hero && cx && cy && fine){
    var pend = false, x = 0, y = 0;
    hero.addEventListener('pointermove', function(e){
      var r = hero.getBoundingClientRect();
      x = e.clientX - r.left; y = e.clientY - r.top;
      if(!pend){ pend = true; requestAnimationFrame(function(){ pend = false; cx.textContent = pad(x); cy.textContent = pad(y); }); }
    }, {passive:true});
  }

  /* El alta de proyecto la envía assets/contacto.js (24-sep-2026). */
})();
