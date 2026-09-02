<?php
/* nav.php — LA navegación. Una sola, en un solo fichero.
 *
 * El conmutador de idioma son dos <a> a URLs reales, no un botón que
 * reescribe el DOM. El mecanismo viejo (diccionario JS + localStorage)
 * se arrancó del home el mismo día que nació /es/: con los dos vivos, un
 * visitante que alguna vez pulsó ES aterrizaba en `/` y el JS le repintaba
 * en español una página cuyo <html lang>, canonical y hreflang decían
 * inglés — el DOM que ve Google contradiciendo sus propias etiquetas. */
$inicio  = $lang === 'es' ? '/es/' : '/';
$hub     = $lang === 'es' ? '/es/servicios/' : '/services/';
$otro    = par($url) ?: ($lang === 'en' ? '/es/' : '/');
$t       = $T[$lang];
$en_home = ($url === '/' || $url === '/es/');
?>
<header id="hdr">
  <div class="shell nav">
    <a href="<?= $inicio ?>" class="brand" aria-label="AxisWorks">AXIS<span class="x">✕</span>WORKS</a>
    <nav class="nav__links" id="navLinks">
      <a href="<?= $hub ?>"><?= $t['nav_services'] ?></a>
      <a href="<?= $en_home ? '#work' : $inicio . '#work' ?>"><?= $t['nav_work'] ?></a>
      <a href="<?= $en_home ? '#process' : $inicio . '#process' ?>"><?= $t['nav_process'] ?></a>
      <a href="<?= $en_home ? '#studio' : $inicio . '#studio' ?>"><?= $t['nav_studio'] ?></a>
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
