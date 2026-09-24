<?php
/* nav.php — LA navegación. Una sola, en un solo fichero.
 *
 * El conmutador de idioma son dos <a> a URLs reales, no un botón que
 * reescribe el DOM: el idioma vive en la URL (ver historia en git).
 *
 * Rediseño 24-sep-2026 (mockup Stitch): barra fija con filete, marca con
 * subtítulo mono y CTA sólido en Ink. Del mockup NO se tomó el avatar
 * redondo (un login que no existe) ni «VALENCIA // BALI» (ciudad sin
 * confirmar: se queda «Spain ✕ Bali», que es lo publicado). El CTA va en
 * Ink y no en Signal para que el del hero sea el único primario del viewport. */
$inicio  = $lang === 'es' ? '/es/' : '/';
$hub     = $lang === 'es' ? '/es/servicios/' : '/services/';
$otro    = par($url) ?: ($lang === 'en' ? '/es/' : '/');
$t       = $T[$lang];
$en_home = ($url === '/' || $url === '/es/');
$ancla   = function ($id) use ($en_home, $inicio) { return $en_home ? "#$id" : $inicio . "#$id"; };
?>
<header id="hdr">
  <div class="shell nav">
    <a href="<?= $inicio ?>" class="brand" aria-label="AxisWorks">
      <span class="brand__word">AXIS<span class="x">✕</span>WORKS</span>
      <span class="brand__sub"><?= $t['based'] ?></span>
    </a>
    <nav class="nav__links" id="navLinks">
      <a href="<?= $ancla('erp') ?>">ERP</a>
      <a href="<?= $hub ?>"><?= $t['nav_services'] ?></a>
      <a href="<?= $ancla('work') ?>"><?= $t['nav_work'] ?></a>
      <a href="<?= $ancla('process') ?>"><?= $t['nav_process'] ?></a>
      <a href="<?= $ancla('studio') ?>"><?= $t['nav_studio'] ?></a>
      <div class="lang" role="group" aria-label="Language">
        <?php if ($lang === 'en'): ?>
          <span class="lang__on" aria-current="true">EN</span><a href="<?= e($otro) ?>" hreflang="es">ES</a>
        <?php else: ?>
          <a href="<?= e($otro) ?>" hreflang="en">EN</a><span class="lang__on" aria-current="true">ES</span>
        <?php endif; ?>
      </div>
      <a href="#contact" class="nav__cta"><?= $t['nav_cta'] ?></a>
    </nav>
    <button class="nav__burger" id="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
  </div>
</header>
