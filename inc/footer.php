<?php $t = $T[$lang]; ?>
<footer>
  <div class="shell foot">
    <span>AXISWORKS <span class="x">✕</span> EST. 2026</span>
    <span><a href="mailto:<?= EMAIL ?>"><?= EMAIL ?></a></span>
    <span>SPAIN <span class="x">✕</span> BALI</span>
    <span><?= $t['foot'] ?></span>
  </div>
</footer>
<?php /* La navegación es LA misma en las 16 páginas, así que es un fichero y no
        una copia por página. Nada de GSAP aquí: una hoja de servicio es texto, y
        clonar los dos <script> de CDN del home habrían sido 2 peticiones por
        página para nada. */ ?>
<script src="/assets/nav.js?v=<?= VER ?>" defer></script>
