<?php $t = $T[$lang]; ?>
<footer>
  <div class="shell foot">
    <span>AXISWORKS <span class="x">✕</span> EST. 2026</span>
    <span><a href="mailto:<?= EMAIL ?>"><?= EMAIL ?></a></span>
    <span>SPAIN <span class="x">✕</span> BALI</span>
    <span><?= $t['foot'] ?></span>
  </div>
</footer>
<script>
/* Lo único que necesita JS en una hoja: el menú en móvil. Sin GSAP — una
 * página de servicio es texto, y clonar los dos <script> del home habría
 * sido 2 peticiones de CDN por página para nada. */
(function(){
  var h=document.getElementById('hdr'),b=document.getElementById('burger'),n=document.getElementById('navLinks');
  function s(){ h.classList.toggle('scrolled', window.scrollY>10); }
  s(); addEventListener('scroll', s, {passive:true});
  if(b) b.addEventListener('click', function(){
    var o=n.classList.toggle('open');
    b.setAttribute('aria-expanded', o?'true':'false');
    b.classList.toggle('is-open', o);
  });
})();
</script>
