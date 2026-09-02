<?php
/* head.php — el <head> de las 15 páginas. Espera: $lang, $url, $title,
 * $desc y opcionalmente $jsonld (array de nodos) y $og_img.
 *
 * Todo lo que hay aquí se escribe UNA vez. Antes de este fichero el <head>
 * del home era el único, y clonarlo 15 veces habría multiplicado por 15
 * cada cosa que estuviera mal en él. */
$url    = $url    ?? '/';
$lang   = $lang   ?? 'en';
$og_img = $og_img ?? '/assets/og.jpg';
$alt    = par($url);
$abs    = SITE . $url;
?>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= $title ?></title>
<meta name="description" content="<?= e($desc) ?>">
<meta name="theme-color" content="#15181C">
<link rel="canonical" href="<?= e($abs) ?>">

<?php /* hreflang recíproco solo donde la intención es la misma. Un par
       * declarado en un sentido y no en el otro Google lo ignora entero,
       * por eso los dos lados salen del mismo mapa de `config.php`. */ ?>
<?php if ($alt): ?>
<link rel="alternate" hreflang="<?= $lang ?>" href="<?= e($abs) ?>">
<link rel="alternate" hreflang="<?= $lang === 'en' ? 'es' : 'en' ?>" href="<?= e(SITE . $alt) ?>">
<link rel="alternate" hreflang="x-default" href="<?= e(SITE . ($lang === 'en' ? $url : $alt)) ?>">
<?php endif; ?>

<meta property="og:type" content="website">
<meta property="og:site_name" content="AxisWorks">
<meta property="og:title" content="<?= e(strip_tags(html_entity_decode($title, ENT_QUOTES, 'UTF-8'))) ?>">
<meta property="og:description" content="<?= e($desc) ?>">
<meta property="og:url" content="<?= e($abs) ?>">
<meta property="og:image" content="<?= e(SITE . $og_img) ?>">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="AxisWorks — development ✕ design, Spain ✕ Bali.">
<meta property="og:locale" content="<?= $lang === 'es' ? 'es_ES' : 'en_US' ?>">
<?php if ($alt): ?><meta property="og:locale:alternate" content="<?= $lang === 'es' ? 'en_US' : 'es_ES' ?>"><?php endif; ?>

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<?= e(strip_tags(html_entity_decode($title, ENT_QUOTES, 'UTF-8'))) ?>">
<meta name="twitter:description" content="<?= e($desc) ?>">
<meta name="twitter:image" content="<?= e(SITE . $og_img) ?>">

<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<?php /* El sello de versión vive en config.php y en ningún otro sitio: el
       * .htaccess cachea CSS un año, y sin sello una corrección de estilo
       * tardaría doce meses en verse. */ ?>
<link rel="stylesheet" href="/assets/site.css?v=<?= VER ?>">

<?php if (!empty($jsonld)): ?>
<script type="application/ld+json">
<?= json_encode(['@context'=>'https://schema.org','@graph'=>$jsonld],
      JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) ?>
</script>
<?php endif; ?>
