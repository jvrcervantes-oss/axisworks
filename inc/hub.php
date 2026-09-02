<?php
/* hub.php — /services/ y /es/servicios/.
 * No es una página de relleno: sin ella esas dos rutas devuelven 403
 * (el .htaccess corta el rewrite en directorios y `Options -Indexes`
 * prohíbe el listado), y el BreadcrumbList de las doce hojas estaría
 * publicando ese 403 como nodo rastreable. */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/catalogo.php';

$H = $HUBS[$LANG];
$lang = $H['lang']; $url = $H['url']; $t = $T[$lang];
$title = $H['title']; $desc = $H['desc'];
$inicio = $lang === 'es' ? '/es/' : '/';
$col = $lang === 'es' ? 5 : 4;   /* índice del destino ES o EN en $PRODUCTOS */

$lista = [];
foreach ($ORDEN[$lang] as $slug) {
  $h = $HOJAS[$lang][$slug];
  $lista[] = ['@type'=>'ListItem','position'=>count($lista)+1,
              'name'=>strip_tags(html_entity_decode($h['h1'],ENT_QUOTES,'UTF-8')),
              'url'=>SITE.$h['url']];
}
$jsonld = [
  ['@type'=>'BreadcrumbList','itemListElement'=>[
    ['@type'=>'ListItem','position'=>1,'name'=>$t['breadcrumb_home'],'item'=>SITE.$inicio],
    ['@type'=>'ListItem','position'=>2,'name'=>$t['breadcrumb_services'],'item'=>SITE.$url],
  ]],
  ['@type'=>'ItemList','itemListElement'=>$lista],
];
?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
</head>
<body>
<div class="reticle" aria-hidden="true"><div class="reticle__inner"><span></span><span></span><span></span><span></span><span></span></div></div>
<?php require __DIR__ . '/nav.php'; ?>

<main class="hoja">
  <div class="hoja__head shell">
    <div class="hoja__grid">
      <div>
        <p class="eyebrow"><?= $H['eyebrow'] ?></p>
        <h1><?= $H['h1'] ?></h1>
        <p class="lead"><?= $H['lead'] ?></p>
      </div>
      <aside class="tblock">
        <svg class="tblock__x" viewBox="0 0 24 24" aria-hidden="true"><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>
        <div class="tblock__row"><span><?= $t['sheet'] ?></span><b><?= $H['codigo'] ?></b></div>
        <div class="tblock__row"><span><?= $t['axis'] ?></span><b>BUILD ✕ GROW</b></div>
        <div class="tblock__row"><span><?= $t['rev'] ?></span><b>2026-09</b></div>
        <div class="tblock__row"><span><?= $t['lang_l'] ?></span><b>EN / ES</b></div>
      </aside>
    </div>
  </div>

  <div class="shell hoja__body">
    <section>
      <?php $eje_actual = ''; foreach ($PRODUCTOS as $p):
        if ($p[1] !== $eje_actual) { $eje_actual = $p[1]; echo '<p class="hub__eje">'.$eje_actual."</p>\n"; }
        $nombre = $lang === 'es' ? $p[3] : $p[2];
        $destino = $p[$col];
        $clase = 'leyenda__row' . ($destino ? '' : ' leyenda__row--flat');
      ?>
        <?php if ($destino): ?>
        <a class="<?= $clase ?>" href="<?= e($destino) ?>"><span class="cod"><?= $p[0] ?></span><span class="nom"><?= $nombre ?></span><span class="ar" aria-hidden="true">→</span></a>
        <?php else: ?>
        <div class="<?= $clase ?>"><span class="cod"><?= $p[0] ?></span><span class="nom"><?= $nombre ?></span></div>
        <?php endif; ?>
      <?php endforeach; ?>
    </section>
  </div>

  <section class="cta" id="contact">
    <div class="shell">
      <p class="eyebrow"><?= $t['nav_cta'] ?></p>
      <h2 style="margin-top:18px"><?= $t['cta_h'] ?></h2>
      <p><?= $t['cta_p'] ?></p>
      <div class="cta__row">
        <a href="<?= e(correo(($lang === 'es' ? 'Consulta — ' : 'Enquiry — ') . $url)) ?>" class="btn btn--signal"><span><?= EMAIL ?></span> <span class="ar" aria-hidden="true">→</span></a>
        <a href="<?= $inicio ?>" class="btn btn--ghost-d"><span><?= $t['nav_home'] ?></span></a>
      </div>
      <div class="cta__meta">
        <div>EMAIL<b><?= EMAIL ?></b></div>
        <div><?= $lang === 'es' ? 'DESDE' : 'BASED' ?><b><?= $t['based'] ?></b></div>
        <div><?= $lang === 'es' ? 'IDIOMAS' : 'LANGUAGES' ?><b><?= $t['langs'] ?></b></div>
      </div>
    </div>
  </section>
</main>
<?php require __DIR__ . '/footer.php'; ?>
</body>
</html>
