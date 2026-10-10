<?php
/* l_nav.php — navegación de la portada nueva y de Agents as a Service (10-oct-2026).
 * Mismo contrato que nav.php: ids #hdr, #navLinks y #burger (los usa nav.js), conmutador de
 * idioma con <a> a URLs reales y CTA a #contact (las dos páginas tienen su formulario).
 * Espera $lang, $url, $LAND. */
$L       = $LAND[$lang];
$inicio  = $lang === 'es' ? '/es/' : '/';
$hub     = $lang === 'es' ? '/es/servicios/' : '/services/';
$aaas    = $lang === 'es' ? AAAS_ES : AAAS_EN;
$otro    = par($url) ?: ($lang === 'en' ? '/es/' : '/');
$en_home = ($url === '/' || $url === '/es/');
$anc     = function ($id) use ($en_home, $inicio) { return $en_home ? "#$id" : $inicio . "#$id"; };
$t_nav   = $T[$lang];
?>
<a class="skip" href="#top"><?= e($L['skip']) ?></a>
<header class="l-nav" id="hdr">
  <div class="l-wrap">
    <a class="l-brand" href="<?= $inicio ?>" aria-label="AxisWorks"><i aria-hidden="true">A</i><span>AxisWorks</span></a>
    <nav class="l-links" id="navLinks" aria-label="<?= $lang === 'es' ? 'Principal' : 'Main' ?>">
      <a href="<?= $anc('products') ?>"><?= $L['nav_products'] ?></a>
      <a href="<?= $aaas ?>"<?= $url === $aaas ? ' aria-current="page"' : '' ?>><?= $L['nav_agents'] ?></a>
      <a href="<?= $hub ?>"><?= $t_nav['nav_services'] ?></a>
      <a href="<?= $anc('tools') ?>"><?= $L['nav_tools'] ?></a>
      <a href="<?= $anc('studio') ?>"><?= $t_nav['nav_studio'] ?></a>
      <a href="<?= ERP_URL ?>" rel="noopener"><?= $L['nav_erp'] ?></a>
      <div class="l-lang" role="group" aria-label="Language">
        <?php if ($lang === 'en'): ?>
          <span aria-current="true">EN</span><a href="<?= e($otro) ?>" hreflang="es" lang="es">ES</a>
        <?php else: ?>
          <a href="<?= e($otro) ?>" hreflang="en" lang="en">EN</a><span aria-current="true">ES</span>
        <?php endif; ?>
      </div>
      <a class="l-btn p" href="#contact"><?= $L['nav_cta'] ?><span class="ms" aria-hidden="true">arrow_forward</span></a>
    </nav>
    <button class="l-burger" id="burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="navLinks"><span></span><span></span><span></span></button>
  </div>
</header>
