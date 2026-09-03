<?php
/* El sitemap se GENERA del mismo catálogo que pinta la web.
 *
 * El anterior era un fichero a mano con una sola URL. Un sitemap escrito
 * aparte es la cuarta copia de la lista de páginas (leyenda del home, hubs,
 * makesOffer y esto), y la cuarta copia es la que se queda vieja: se publica
 * a Google un mapa de un sitio que ya no existe. Aquí no puede pasar porque
 * no hay lista, hay un bucle.
 *
 * Se sirve en /sitemap.xml por un rewrite del .htaccess: robots.txt y Search
 * Console esperan esa extensión. */
require_once __DIR__ . '/inc/config.php';
require_once __DIR__ . '/inc/catalogo.php';

header('Content-Type: application/xml; charset=UTF-8');

$rutas = ['/', '/es/', '/services/', '/es/servicios/'];
foreach ($ORDEN as $lg => $slugs) {
  foreach ($slugs as $s) $rutas[] = $HOJAS[$lg][$s]['url'];
}

$hoy = '2026-09-03';
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
<?php foreach ($rutas as $r):
  $alt = par($r);
  /* Prioridad por profundidad, no a ojo: portada 1.0, hubs 0.9, hojas 0.8. */
  $prio = ($r === '/' || $r === '/es/') ? '1.0'
        : (($r === '/services/' || $r === '/es/servicios/') ? '0.9' : '0.8');
  $es = str_starts_with($r, '/es/');
?>
  <url>
    <loc><?= SITE . $r ?></loc>
<?php if ($alt): /* Los alternates van en los DOS lados o Google ignora el par. */
        $en = $es ? $alt : $r; $sp = $es ? $r : $alt; ?>
    <xhtml:link rel="alternate" hreflang="en" href="<?= SITE . $en ?>"/>
    <xhtml:link rel="alternate" hreflang="es" href="<?= SITE . $sp ?>"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="<?= SITE . $en ?>"/>
<?php endif; ?>
    <lastmod><?= $hoy ?></lastmod>
    <changefreq>monthly</changefreq>
    <priority><?= $prio ?></priority>
  </url>
<?php endforeach; ?>
</urlset>
