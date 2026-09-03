/* home.js -- solo lo de la portada: el instrumento de medida, el canvas
 * del crosshair, el eje de scroll, los reveals y el loader.
 * La navegacion vive en nav.js y el idioma vive en la URL. */
(function(){
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  



  var fine = !('ontouchstart' in window) && !reduce;
  function pad(n){ n=Math.max(0,Math.round(n)); return (''+n).padStart(3,'0'); }

  /* ---- hero: la ✕ como instrumento ----
     Las dos líneas nacen desalineadas y convergen a medida que el cursor se acerca al
     centro de la marca. La interacción ES el claim del estudio: "we measure twice,
     everything aligns". Cuesta ~25 líneas y ninguna dependencia — lo que había aquí
     antes eran 255 KB de Three.js y 380vh de scroll.

     Sin puntero fino (táctil) o con reduced-motion no se engancha nada: el CSS ya deja
     la ✕ en su estado alineado, que es el final del mismo mecanismo. */
  var heroEl = document.getElementById('hero');
  var mark = document.getElementById('heroMark');
  if(heroEl && mark && fine){
    var l1 = mark.querySelector('.m1'), l2 = mark.querySelector('.m2');
    // Unidades del viewBox (100), no px: sobre una marca de 380px, 4.5 son ~17px reales.
    // Con 9 se leían como dos diagonales sin relación en vez de una marca fuera de registro.
    var DESVIO = 4.5;
    var alineado = null, activo = false, px = 0, py = 0;

    function pinta(){
      activo = false;
      var r = mark.getBoundingClientRect();
      var cx = r.left + r.width/2, cy = r.top + r.height/2;
      // distancia normalizada al centro: 0 encima, 1 a media pantalla o más
      var d = Math.min(1, Math.hypot(px-cx, py-cy) / (Math.min(innerWidth,innerHeight)*0.5));
      desvia((DESVIO * d).toFixed(2));

      var ok = d < 0.14;
      if(ok !== alineado){
        alineado = ok;
        heroEl.classList.toggle('is-aligned', ok);
      }
    }
    /* Estado inicial DESCALIBRADO. Sin esto el SVG nace sin transform, o sea perfectamente
       alineado, y el primer movimiento del ratón lo SEPARA: la lectura queda invertida
       ("se rompe al tocarlo" en vez de "se alinea al medir"). */
    function desvia(o){
      l1.setAttribute('transform','translate(' + o + ',' + (-o) + ')');
      l2.setAttribute('transform','translate(' + (-o) + ',' + o + ')');
    }
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

  /* CAD crosshair canvas */
  var canvas = document.getElementById('cad');
  if(fine){
    var ctx = canvas.getContext('2d');
    var W, H, dpr = Math.min(window.devicePixelRatio||1, 2);
    var mx = -999, my = -999, tx = -999, ty = -999;
    var cxEl = document.getElementById('cx'), cyEl = document.getElementById('cy');
    function resize(){ W = canvas.width = innerWidth*dpr; H = canvas.height = innerHeight*dpr;
      canvas.style.width = innerWidth+'px'; canvas.style.height = innerHeight+'px'; }
    resize(); addEventListener('resize', resize);
    /* El bucle corría para siempre: `mx` converge de forma asintótica y nunca iguala a
       `tx`, así que seguía limpiando el viewport entero y redibujando a DPR 2 con el
       puntero quieto. Ahora se para al asentarse y lo relanza el propio mousemove. */
    var corriendo = false;
    addEventListener('mousemove', function(e){
      tx = e.clientX; ty = e.clientY;
      if(!corriendo){ corriendo = true; loop(); }
    }, {passive:true});
    function loop(){
      if(Math.abs(tx-mx) < 0.5 && Math.abs(ty-my) < 0.5){ corriendo = false; return; }
      requestAnimationFrame(loop);
      mx += (tx-mx)*0.18; my += (ty-my)*0.18;
      ctx.clearRect(0,0,W,H);
      if(mx < -100){ return; }
      ctx.save(); ctx.scale(dpr,dpr);
      ctx.strokeStyle = 'rgba(58,63,69,0.26)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0,my+0.5); ctx.lineTo(innerWidth,my+0.5);
      ctx.moveTo(mx+0.5,0); ctx.lineTo(mx+0.5,innerHeight);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(21,24,28,0.5)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(mx-5, my-5, 10, 10);
      ctx.strokeStyle = 'rgba(58,63,69,0.5)';
      [[-16,0],[16,0],[0,-16],[0,16]].forEach(function(d){
        ctx.beginPath();
        if(d[0]){ ctx.moveTo(mx+d[0],my-3); ctx.lineTo(mx+d[0],my+3); }
        else { ctx.moveTo(mx-3,my+d[1]); ctx.lineTo(mx+3,my+d[1]); }
        ctx.stroke();
      });
      ctx.restore();
      if(cxEl){ cxEl.textContent = pad(mx); cyEl.textContent = pad(my); }
    }
  }

  /* WhatsApp CTA — set WA_NUMBER once provided, e.g. "34600112233" */
  var WA_NUMBER = "";
  var wa = document.getElementById('waCta');
  if(wa){ wa.href = WA_NUMBER ? ('https://wa.me/'+WA_NUMBER) : 'mailto:hello@axisworks.studio'; }

  /* loader */
  var loader = document.getElementById('loader'), read = document.getElementById('loaderRead');
  var p = 0;
  var li = setInterval(function(){
    p += Math.random()*18 + 6; if(p>=100){ p=100; clearInterval(li); }
    read.textContent = 'CALIBRATING — ' + (p<10?'0':'') + Math.floor(p) + '%';
  }, 90);
  /* El loader tapaba la página hasta ~3,1 s: colgaba de `load` (que espera a los 255 KB
     de three.module.js), le sumaba 950 ms de setTimeout y 600 ms de fade. Y la métrica
     mentía: Chrome registraba LCP a 916 ms sobre el h1 porque no descuenta la oclusión.
     Ahora arranca en DOMContentLoaded con un tope duro: lo que llegue primero. */
  var acabado = false;
  function finish(){
    if(acabado) return; acabado = true;
    clearInterval(li);
    read.textContent='ALIGNED — 100%'; loader.classList.add('done'); startReveal();
  }
  function arranca(){ setTimeout(finish, reduce?0:260); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arranca);
  else arranca();
  setTimeout(finish, 1200);   // tope: la portada no espera a la red pase lo que pase

  /* the WebGL hero (corporate ✕ + 3D project slabs) lives in the module script below */

  function startReveal(){
    if(reduce || !window.gsap){
      document.querySelectorAll('.rv').forEach(function(el){ el.classList.add('is-in'); });
      document.querySelectorAll('.measure').forEach(function(m){ m.style.transform='scaleX(1)'; var d=m.querySelector('i'); if(d) d.style.opacity=1; });
      overHero = false; onScroll();
      lockOrigin();
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('section:not(.hero)').forEach(function(sec){
      gsap.to(sec.querySelectorAll('.rv:not(.rv-card)'), {
        opacity:1, y:0, duration:.7, ease:'power2.out', stagger:.08,
        scrollTrigger:{ trigger:sec, start:'top 78%', once:true }
      });
    });

    /* Work cards: each project plots in — left→right clip wipe + lift, staggered */
    var workCards = document.querySelectorAll('#work .rv-card');
    if(workCards.length){
      gsap.to(workCards, {
        opacity:1, y:0, clipPath:'inset(0 0% 0 0)', duration:.85, ease:'power3.out', stagger:.13,
        scrollTrigger:{ trigger:'#work', start:'top 72%', once:true }
      });
    }

    var fill = document.getElementById('axisFill'), node = document.getElementById('axisNode');
    ScrollTrigger.create({
      start:0, end:'max',
      onUpdate:function(self){
        var h = window.innerHeight;
        fill.style.height = (self.progress*h) + 'px';
        node.style.top = (self.progress*h) + 'px';
        node.style.opacity = self.progress > 0.004 ? 1 : 0;
      }
    });

    var procFill = document.getElementById('procFill');
    ScrollTrigger.create({
      trigger:'.proc__track', start:'top 70%', end:'bottom 60%', scrub:true,
      onUpdate:function(self){
        var horiz = window.matchMedia('(min-width:821px)').matches;
        if(horiz){ procFill.style.width=(self.progress*100)+'%'; procFill.style.height='100%'; }
        else { procFill.style.height=(self.progress*100)+'%'; procFill.style.width='100%'; }
      }
    });

    gsap.from('.panel--build', { x:-24, opacity:0, duration:.8, ease:'power3.out',
      scrollTrigger:{ trigger:'.cross', start:'top 72%', once:true }});
    gsap.from('.panel--brand', { x:24, y:24, opacity:0, duration:.8, ease:'power3.out', delay:.1,
      scrollTrigger:{ trigger:'.cross', start:'top 72%', once:true }});
    gsap.from('.cross__mark', { scale:0, rotation:-90, duration:.6, ease:'back.out(2)', delay:.45,
      scrollTrigger:{ trigger:'.cross', start:'top 72%', once:true }});

    /* signature reveal — lay the ruler under each section heading */
    gsap.utils.toArray('.sec-head').forEach(function(sh){
      var m = sh.querySelector('.measure'); if(!m) return;
      gsap.fromTo(m, { scaleX:0 }, { scaleX:1, duration:.9, ease:'power3.inOut',
        scrollTrigger:{ trigger:sh, start:'top 82%', once:true },
        onComplete:function(){ var d = m.querySelector('i'); if(d) d.style.opacity = 1; }});
    });

    /* the origin locks when contact enters — the blueprint resolves at 00,00 */
    var origin = document.getElementById('origin');
    if(origin){
      ScrollTrigger.create({ trigger:origin, start:'top 78%', once:true, onEnter:lockOrigin });
    }
  }

  /* lock the origin target: draw the crosshair, flip status, settle the readout to 00,00 */
  var originLocked = false;
  function lockOrigin(){
    if(originLocked) return; originLocked = true;
    var o = document.getElementById('origin'); if(!o) return;
    o.classList.add('is-locked');
    var ox = document.getElementById('ox'), oy = document.getElementById('oy'), st = document.getElementById('ostatus');
    if(reduce){ if(st) st.textContent='ALIGNED'; if(ox) ox.textContent='00.00'; if(oy) oy.textContent='00.00'; return; }
    if(st) st.textContent = 'CALIBRATING';
    var fx = 18.42, fy = -11.07, dur = 1000, t0 = performance.now();
    function fmt(v){ return (v<0?'-':' ') + Math.abs(v).toFixed(2).padStart(5,'0'); }
    (function tick(now){
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      if(ox) ox.textContent = fmt(fx * (1 - e));
      if(oy) oy.textContent = fmt(fy * (1 - e));
      if(p < 1){ requestAnimationFrame(tick); }
      else { if(ox) ox.textContent = '00.00'; if(oy) oy.textContent = '00.00'; if(st) st.textContent = 'ALIGNED'; }
    })(t0);
  }

  /* work cards — 3D tilt on hover (vanilla port of the spring/translateZ effect) */
  if(!reduce){
    document.querySelectorAll('.tcard').forEach(function(card){
      var inner = card.querySelector('.tcard__inner');
      card.addEventListener('pointermove', function(e){
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left)/r.width - 0.5;
        var py = (e.clientY - r.top)/r.height - 0.5;
        inner.style.transform = 'rotateX(' + (-py*9).toFixed(2) + 'deg) rotateY(' + (px*9).toFixed(2) + 'deg)';
      });
      card.addEventListener('pointerleave', function(){ inner.style.transform = ''; });
    });
  }

})();
