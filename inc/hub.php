<?php
/* hub.php — /services/ y /es/servicios/.
 * No es una página de relleno: sin ella esas dos rutas devuelven 403
 * (el .htaccess corta el rewrite en directorios y `Options -Indexes`
 * prohíbe el listado), y el BreadcrumbList de las doce hojas estaría
 * publicando ese 403 como nodo rastreable. */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/catalogo.php';
require_once __DIR__ . '/home_textos.php';   /* la línea de alcance de cada producto: una sola fuente con la portada */

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
<link rel="stylesheet" href="/assets/hoja.css?v=<?= VER ?>">
</head>
<body>
<?php require __DIR__ . '/nav.php'; ?>
<?php
/* v3 (24-sep-2026): composición de la pantalla de Stitch «Services // 11
   Products on Two Axes» sobre nuestros tokens. De Stitch NO se tomó su texto
   (ciclos en semanas, latencias, uptime, «Spain × Bali»): las tarjetas dicen
   qué es cada producto con la misma línea que la portada. */
$alc = $HOME[$lang]['alcance'];
$cuenta = array_count_values(array_column($PRODUCTOS, 1));
$porEje = [];
foreach ($PRODUCTOS as $p) $porEje[$p[1]][] = $p;
$nomP = function ($cod) use ($PRODUCTOS, $lang, $col) {
  foreach ($PRODUCTOS as $p) if ($p[0] === $cod) return [$lang === 'es' ? $p[3] : $p[2], $p[$col]];
  return ['', null];
}; ?>
<main class="hb">
  <section class="hb-head">
    <span class="hj-reg hj-reg--tl" aria-hidden="true">+</span><span class="hj-reg hj-reg--tr" aria-hidden="true">+</span>
    <div class="shell hb-head__grid">
      <div>
        <p class="hj-chip"><?= $H['eyebrow'] ?></p>
        <h1><?= $H['h1'] ?></h1>
        <p class="hj-lead"><?= $H['lead'] ?></p>
      </div>
      <div class="hb-spec">
        <p><span><?= $H['spec'][0] ?></span><b class="acc"><?= count($PRODUCTOS) ?></b></p>
        <p><span><?= $H['spec'][1] ?></span><b><?= $cuenta['BUILD'] ?? 0 ?></b></p>
        <p><span><?= $H['spec'][2] ?></span><b><?= $cuenta['GROW'] ?? 0 ?></b></p>
        <p><span><?= $H['spec'][3] ?></span><b><?= $cuenta['ADVISORY'] ?? 0 ?></b></p>
        <p><span><?= $H['spec'][4] ?></span><b>2026-09</b></p>
      </div>
    </div>
  </section>

  <section class="hb-axes">
    <div class="shell hb-axes__grid">
      <div class="hb-axes__txt">
        <div><p class="hj-tag">[<?= $H['axes_tag'] ?>]</p><h2><?= $H['axes_h'] ?></h2><p><?= $H['axes_p'] ?></p></div>
        <p class="hb-legend">X: <b>BUILD</b> // Y: <b>GROW</b> // ✕: <b>ADVISORY</b></p>
      </div>
      <div class="hb-plane" aria-hidden="true">
        <span class="hb-q hb-q--tl"><?= $H['quad'][0] ?></span>
        <span class="hb-q hb-q--tr"><?= $H['quad'][1] ?></span>
        <span class="hb-q hb-q--bl"><?= $H['quad'][2] ?></span>
        <span class="hb-q hb-q--br"><?= $H['quad'][3] ?></span>
        <span class="hb-ax hb-ax--x">BUILD →</span><span class="hb-ax hb-ax--y">GROW ↑</span>
        <?php [$a01, $a01u] = $nomP('A01'); ?>
        <div class="hb-core"><span>A01 // <?= $H['core_l'] ?></span><b><?= $a01 ?></b></div>
      </div>
    </div>
  </section>

  <section class="hb-cat">
    <div class="shell">
      <p class="hj-tag">[<?= $H['cat_tag'] ?>]</p>
      <h2><?= $H['cat_h'] ?></h2>
      <?php foreach ($porEje as $eje => $lista): ?>
      <p class="hb-axis<?= $eje === 'ADVISORY' ? ' hb-axis--ink' : '' ?>"><?= $eje ?> <span>// <?= $H['ejes'][$eje] ?> · <?= count($lista) ?></span></p>
      <div class="hb-cards">
        <?php foreach ($lista as $p):
          $nombre = $lang === 'es' ? $p[3] : $p[2]; $dest = $p[$col];
          $tag = $dest ? 'a' : 'div'; $wide = $eje === 'ADVISORY' ? ' hb-card--wide' : ''; ?>
        <<?= $tag ?> class="hb-card<?= $wide ?>"<?= $dest ? ' href="' . e($dest) . '"' : '' ?>>
          <p class="hb-card__top"><span><?= $p[0] ?></span><span><?= $eje ?></span></p>
          <h3><?= $nombre ?></h3>
          <p><?= $alc[$p[0]] ?? '' ?></p>
          <?php if ($dest): ?><span class="hb-card__go"><?= $H['go'] ?></span><?php endif; ?>
        </<?= $tag ?>>
        <?php endforeach; ?>
      </div>
      <?php endforeach; ?>
    </div>
  </section>

  <?php require __DIR__ . '/herramientas.php'; ?>
  <section class="hj-close" id="contact">
    <span class="hj-reg hj-reg--tl" aria-hidden="true">+</span><span class="hj-reg hj-reg--tr" aria-hidden="true">+</span>
    <div class="shell">
      <div class="hj-close__box">
        <p class="hj-chip hj-chip--c"><?= $t['nav_cta'] ?></p>
        <h2><?= $t['cta_h'] ?></h2>
        <p><?= $t['cta_p'] ?></p>
        <?php $fc_pagina = $url; require __DIR__ . '/form_contacto.php'; ?>
        <p class="hj-close__meta"><span><?= $lang === 'es' ? 'IDIOMAS' : 'LANGUAGES' ?>: <?= $t['langs'] ?></span><a href="<?= $inicio ?>"><?= $t['nav_home'] ?> →</a></p>
      </div>
    </div>
  </section>
</main>
<?php require __DIR__ . '/footer.php'; ?>
</body>
</html>
