<?php
/* footer.php — el pie de las 16 páginas.
 *
 * Tres columnas como el mockup de Stitch (24-sep-2026), con contenido real:
 * su «SYSTEMS INDEX SPEC-v4.2», el PGP, `ops@axisworks.engineering` y las
 * coordenadas de Valencia eran inventados. El índice de aquí sale de
 * $PRODUCTOS (fuente única del catálogo), así que cada página enlaza a las
 * hojas que existen y a ninguna más. */
$t   = $T[$lang];
$col = $lang === 'es' ? 5 : 4;
$hub = $lang === 'es' ? '/es/servicios/' : '/services/';
$hojas_pie = array_filter($PRODUCTOS, function ($p) use ($col) {
  return $p[$col] && strpos($p[$col], '#') === false;
});
?>
<footer class="foot">
  <div class="shell foot__grid">
    <div class="foot__brand">
      <p class="eyebrow"><span>AXISWORKS</span></p>
      <p class="foot__h"><?= $lang === 'es' ? 'Software de gestión, bots y automatización, hechos con precisión.' : 'Business software, bots and automation, precision-built.' ?></p>
      <p class="foot__p"><?= $lang === 'es' ? 'Un estudio de dos personas con un equipo de departamentos de IA detrás. Trabajamos en español e inglés.' : 'A two-person studio with a team of AI departments behind it. We work in English and Spanish.' ?></p>
    </div>
    <nav class="foot__idx" aria-label="<?= $t['index'] ?>">
      <p class="lbl"><?= $t['index'] ?></p>
      <ul>
        <?php foreach ($hojas_pie as $p): ?>
        <li><a href="<?= e($p[$col]) ?>"><span class="dim"><?= $p[0] ?></span> <?= $lang === 'es' ? $p[3] : $p[2] ?></a></li>
        <?php endforeach; ?>
        <li><a href="<?= $hub ?>"><span class="dim">IDX</span> <?= $t['nav_services'] ?> →</a></li>
      </ul>
    </nav>
    <div class="foot__spec">
      <p class="lbl"><?= $t['sheet'] ?></p>
      <dl class="tblock">
        <div class="tblock__row"><dt>EST.</dt><dd>2026</dd></div>
        <div class="tblock__row"><dt><?= $t['lang_l'] ?></dt><dd>EN / ES</dd></div>
        <div class="tblock__row"><dt>EMAIL</dt><dd><a href="mailto:<?= EMAIL ?>"><?= EMAIL ?></a></dd></div>
      </dl>
    </div>
  </div>
  <div class="shell foot__bar">
    <span>© 2026 AXISWORKS</span>
    <span><?= $t['foot'] ?></span>
  </div>
</footer>
<?php /* Nada de GSAP aquí: la navegación es un fichero pequeño y compartido. */ ?>
<script src="/assets/nav.js?v=<?= VER ?>" defer></script>
