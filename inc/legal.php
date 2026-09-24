<?php
/* legal.php — aviso legal, privacidad y cookies (24-sep-2026). Textos de Legal
 * en legal_en.php / legal_es.php; cada página son tres líneas que fijan $LANG y $ID. */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/catalogo.php';
require_once __DIR__ . '/legal_en.php';
require_once __DIR__ . '/legal_es.php';
$DOCS = ['en' => $LEGAL_EN, 'es' => $LEGAL_ES];
$H = $DOCS[$LANG][$ID] ?? null;
if (!$H) { http_response_code(404); exit('Not found'); }
$lang = $LANG; $url = $H['url']; $t = $T[$lang];
$title = $H['title']; $desc = $H['desc'];
$hub = $lang === 'es' ? '/es/servicios/' : '/services/';
$inicio = $lang === 'es' ? '/es/' : '/';
$jsonld = [['@type'=>'WebPage','name'=>strip_tags($H['h1']),'url'=>SITE.$url,'inLanguage'=>$lang]];
?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
<link rel="stylesheet" href="/assets/hoja.css?v=<?= VER ?>">
</head>
<body>
<?php require __DIR__ . '/nav.php'; ?>
<main class="hj lg">
  <section class="hj-head">
    <div class="shell">
      <p class="hj-chip">PT MAHKOTA PROPERTY GLOBAL · AXISWORKS</p>
      <h1><?= $H['h1'] ?></h1>
      <p class="hj-lead"><?= $t['lg_updated'] ?>: <?= $H['updated'] ?></p>
    </div>
  </section>
  <section class="hj-sec">
    <div class="shell lg__body">
      <?php foreach ($H['secciones'] as $i => $s): ?>
      <section class="lg__sec">
        <h2><span><?= sprintf('%02d', $i+1) ?></span> <?= $s['h'] ?></h2>
        <?php foreach ($s['p'] as $p) echo $p, "\n"; ?>
      </section>
      <?php endforeach; ?>
    </div>
  </section>
</main>
<?php require __DIR__ . '/footer.php'; ?>
</body>
</html>
