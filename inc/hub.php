<?php
/* hub.php — /services/ y /es/servicios/. Desde el 12-oct-2026 con la piel del diseño «X marks the work»: cabecera y
 * pie comunes (inc/x/), una tarjeta por hoja al estilo de «What we sell» de la portada (la mesa no trae índice:
 * diferencia admitida 9). Datos de siempre: $HUBS, $ORDEN, $HOJAS.
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
$XPAGINA = 'hoja';
require_once __DIR__ . '/x/x.php';
$xpage = 'hoja';
$X_CUR = true;
$X_CTA = $inicio . '#contact';
/* Nombre corto de cada hoja: su `chip` o el nombre del producto (igual que la miga de pan de las hojas). */
$hub_nombre = function ($h) use ($PRODUCTOS, $lang) {
  if (!empty($h['chip'])) return $h['chip'];
  foreach ($PRODUCTOS as $p) if ($p[0] === $h['codigo']) return $lang === 'es' ? $p[3] : $p[2];
  return strip_tags($h['h1']);
};
?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
</head>
<body>
<div style="font-family: Manrope, sans-serif; color: #0B0C1E; background: #F2F3F7; overflow-x: hidden">
<?php require __DIR__ . '/x/cabecera.php'; ?>
<main>
<section>
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(40px, 6vw, 80px) clamp(20px, 5vw, 80px) clamp(32px, 4vw, 48px)">
<p style="margin: 0 0 18px; font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: .14em; color: #2E3BEB"><?= $H['eyebrow'] ?></p>
<h1 style="margin: 0; max-width: 18ch; font-family: Unbounded, sans-serif; font-weight: 600; font-size: clamp(34px, 4.6vw, 60px); line-height: 1.04; letter-spacing: -.05em; overflow-wrap: anywhere"><?= $H['h1'] ?></h1>
<p style="margin: 22px 0 0; max-width: 62ch; font-size: 17px; line-height: 1.6; color: #4A4E66"><?= $H['lead'] ?></p>
</div>
</section>
<section style="background: #FFFFFF">
<ul style="list-style: none; margin: 0 auto; max-width: 1280px; padding: clamp(40px, 6vw, 72px) clamp(20px, 5vw, 80px); display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 16px">
<?php foreach ($ORDEN[$lang] as $slug): $h = $HOJAS[$lang][$slug]; ?>
<li style="display: flex"><a href="<?= e($h['url']) ?>" style="flex: 1; display: flex; flex-direction: column; gap: 12px; padding: 26px; border-radius: 24px; background: #F2F3F7; border: 1px solid #DADCE6; color: #0B0C1E">
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .14em; color: #2E3BEB"><?= e($h['codigo']) ?><?= !empty($h['eje']) ? ' · ' . e($h['eje']) : '' ?></span>
<span style="font-family: Unbounded, sans-serif; font-weight: 500; font-size: 20px; line-height: 1.2; letter-spacing: -.03em"><?= $hub_nombre($h) ?></span>
<span style="font-size: 15px; line-height: 1.55; color: #4A4E66"><?= e(html_entity_decode($h['desc'], ENT_QUOTES, 'UTF-8')) ?></span>
<span aria-hidden="true" style="margin-top: auto; font-weight: 700; color: #2E3BEB">→</span>
</a></li>
<?php endforeach; ?>
</ul>
</section>
</main>
<?php require __DIR__ . '/x/pie.php'; ?>
</div>
</body>
</html>
