/* home.js -- solo lo de la portada: el instrumento de medida, la mira CAD,
 * el eje de scroll y el formulario de alta. Sin dependencias.
 *
 * Rediseño 24-sep-2026: fuera GSAP (2 peticiones a CDN), el loader de
 * «CALIBRATING %» (tapaba la página para contar un número inventado) y los
 * reveals. La navegación vive en nav.js y el idioma vive en la URL. */
(function(){
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches && !reduce;
  function pad(n){ n=Math.max(0,Math.round(n)); return (''+n).padStart(3,'0'); }

  /* ---- hero: la ✕ como instrumento ----
     Las dos líneas nacen desalineadas y convergen a medida que el cursor se acerca al
     centro de la marca: «we measure twice, everything aligns». Sin puntero fino o con
     reduced-motion no se engancha nada y la ✕ se queda en su estado final, alineada. */
  var heroEl = document.getElementById('hero');
  var mark = document.getElementById('heroMark');
  if(heroEl && mark){
    if(!fine){ heroEl.classList.add('is-aligned'); }
    else {
      var l1 = mark.querySelector('.m1'), l2 = mark.querySelector('.m2');
      // Unidades del viewBox (100), no px.
      var DESVIO = 6;
      var alineado = null, activo = false, px = 0, py = 0;
      /* Estado inicial DESCALIBRADO. Sin esto el SVG nace alineado y el primer
         movimiento del ratón lo SEPARA: la lectura queda invertida. */
      var desvia = function(o){
        l1.setAttribute('transform','translate(' + o + ',' + (-o) + ')');
        l2.setAttribute('transform','translate(' + (-o) + ',' + o + ')');
      };
      var pinta = function(){
        activo = false;
        var r = mark.getBoundingClientRect();
        var cx = r.left + r.width/2, cy = r.top + r.height/2;
        var d = Math.min(1, Math.hypot(px-cx, py-cy) / (Math.min(innerWidth,innerHeight)*0.5));
        desvia((DESVIO * d).toFixed(2));
        var ok = d < 0.14;
        if(ok !== alineado){ alineado = ok; heroEl.classList.toggle('is-aligned', ok); }
      };
      desvia(DESVIO);
      addEventListener('pointermove', function(e){
        if(e.pointerType === 'touch') return;
        px = e.clientX; py = e.clientY;
        // Un rAF por movimiento, no un bucle perpetuo: fuera del hero no se dibuja nada.
        if(!activo && e.clientY < heroEl.getBoundingClientRect().bottom){
          activo = true; requestAnimationFrame(pinta);
        }
      }, {passive:true});
    }
  }

  /* ---- mira CAD que sigue al cursor, con lectura de coordenadas ----
     El bucle se para al asentarse y lo relanza el propio mousemove. */
  var canvas = document.getElementById('cad');
  if(canvas && fine){
    var ctx = canvas.getContext('2d');
    var W, H, dpr = Math.min(window.devicePixelRatio||1, 2);
    var mx = -999, my = -999, tx = -999, ty = -999;
    var cxEl = document.getElementById('cx'), cyEl = document.getElementById('cy');
    var resize = function(){ W = canvas.width = innerWidth*dpr; H = canvas.height = innerHeight*dpr;
      canvas.style.width = innerWidth+'px'; canvas.style.height = innerHeight+'px'; };
    resize(); addEventListener('resize', resize);
    var corriendo = false;
    var loop = function(){
      if(Math.abs(tx-mx) < 0.5 && Math.abs(ty-my) < 0.5){ corriendo = false; return; }
      requestAnimationFrame(loop);
      mx += (tx-mx)*0.18; my += (ty-my)*0.18;
      ctx.clearRect(0,0,W,H);
      if(mx < -100){ return; }
      ctx.save(); ctx.scale(dpr,dpr);
      ctx.strokeStyle = 'rgba(58,63,69,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0,my+0.5); ctx.lineTo(innerWidth,my+0.5);
      ctx.moveTo(mx+0.5,0); ctx.lineTo(mx+0.5,innerHeight);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(21,24,28,0.5)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(mx-5, my-5, 10, 10);
      ctx.restore();
      if(cxEl){ cxEl.textContent = pad(mx); cyEl.textContent = pad(my); }
    };
    addEventListener('mousemove', function(e){
      tx = e.clientX; ty = e.clientY;
      if(!corriendo){ corriendo = true; loop(); }
    }, {passive:true});
  }

  /* ---- eje vertical de progreso de scroll con nodo ✕ ---- */
  var fill = document.getElementById('axisFill'), node = document.getElementById('axisNode');
  if(fill && node){
    var tick = false;
    var mide = function(){
      tick = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      var p = max > 0 ? Math.min(1, scrollY / max) : 0;
      var h = innerHeight - 64;
      fill.style.height = (p*h) + 'px';
      node.style.top = (p*h) + 'px';
      node.style.opacity = p > 0.004 ? 1 : 0;
    };
    addEventListener('scroll', function(){ if(!tick){ tick = true; requestAnimationFrame(mide); } }, {passive:true});
    mide();
  }

  /* ---- alta de proyecto: compone un mailto con el brief ----
     No hay backend a propósito (buzón sin confirmar como receptor, AXW-2). El asunto
     lleva la página de origen: la bandeja es el informe de atribución. */
  var form = document.getElementById('intake');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(!form.reportValidity()) return;
      var d = form.dataset, f = form.elements;
      var cuerpo = d.lName + ': ' + f.name.value.trim() + '\n' +
        (f.company.value.trim() ? d.lCompany + ': ' + f.company.value.trim() + '\n' : '') +
        '\n' + d.lBrief + ':\n' + f.brief.value.trim() + '\n';
      var asunto = d.subject + (f.company.value.trim() ? ' — ' + f.company.value.trim() : '');
      location.href = 'mailto:' + d.to + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo);
    });
  }
})();
