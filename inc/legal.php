<?php
/* legal.php — aviso legal, privacidad y cookies (24-sep-2026). Textos de Legal
 * en legal_en.php / legal_es.php; cada página son tres líneas que fijan $LANG y $ID.
 * Desde el 12-oct-2026 con la cáscara del diseño «X marks the work» (inc/x/cabecera.php y pie.php, CSS de la
 * hoja C02): solo cambia la piel; el texto legal es el de Legal, sin tocar. */
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
$XPAGINA = 'hoja';
require_once __DIR__ . '/x/x.php';
$xpage = 'hoja';
$X_CUR = false;
$X_CTA = $inicio . '#contact';
?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
<style>
.lgx p,.lgx li{margin:0 0 14px;font-size:16px;line-height:1.7;color:#4A4E66}
.lgx ul{margin:0 0 14px;padding-left:20px}
.lgx a{color:#2E3BEB;text-decoration:underline;text-underline-offset:3px}
.lgx a:hover{color:#0B0C1E}
.lgx b,.lgx strong{color:#0B0C1E}
.lgx code{font-family:'IBM Plex Mono',monospace;font-size:14px}
</style>
</head>
<body>
<div style="font-family: Manrope, sans-serif; color: #0B0C1E; background: #F2F3F7; overflow-x: hidden">
<?php require __DIR__ . '/x/cabecera.php'; ?>
<main>
<section>
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(40px, 6vw, 80px) clamp(20px, 5vw, 80px) clamp(32px, 4vw, 56px)">
<p style="margin: 0 0 18px; font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: .14em; color: #2E3BEB">PT MAHKOTA PROPERTY GLOBAL · AXISWORKS</p>
<h1 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: clamp(34px, 4.6vw, 60px); line-height: 1.04; letter-spacing: -.05em; overflow-wrap: anywhere"><?= $H['h1'] ?></h1>
<p style="margin: 18px 0 0; font-size: 15px; color: #4A4E66"><?= $t['lg_updated'] ?>: <?= $H['updated'] ?></p>
</div>
</section>
<section style="background: #FFFFFF">
<div class="lgx" style="max-width: 1280px; margin: 0 auto; padding: clamp(40px, 6vw, 80px) clamp(20px, 5vw, 80px); display: flex; flex-direction: column; gap: clamp(28px, 4vw, 44px)">
<?php foreach ($H['secciones'] as $i => $s): ?>
<section style="display: flex; flex-wrap: wrap; gap: 12px 48px">
<h2 style="flex: 1 1 260px; margin: 0; font-family: Unbounded, sans-serif; font-weight: 500; font-size: clamp(18px, 1.8vw, 22px); line-height: 1.25; letter-spacing: -.03em"><span style="display: block; margin-bottom: 8px; font-family: 'IBM Plex Mono', monospace; font-weight: 400; font-size: 12px; letter-spacing: .14em; color: #2E3BEB"><?= sprintf('%02d', $i + 1) ?></span><?= $s['h'] ?></h2>
<div style="flex: 999 1 520px; min-width: 0; max-width: 760px">
<?php foreach ($s['p'] as $p) echo $p, "
"; ?>
</div>
</section>
<?php endforeach; ?>
</div>
</section>
</main>
<?php require __DIR__ . '/x/pie.php'; ?>
</div>
</body>
</html>
