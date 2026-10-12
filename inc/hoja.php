<?php
/* hoja.php — la plantilla de una página de servicio.
 * Cada página son tres líneas: fija $LANG y $ID y llama aquí.
 * Desde el 12-oct-2026 pinta la mesa C02 del diseño «X marks the work» (inc/x/hoja_tpl.php, assets/x/hoja.css,
 * cáscara en inc/x/t_hoja.php) con los datos de siempre: hojas_*.php y campo_*.php siguen siendo la única fuente.
 * El <head> (title, desc, canonical, hreflang y JSON-LD) no cambia. Versión anterior: git. */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/catalogo.php';

$H = $HOJAS[$LANG][$ID] ?? null;
if (!$H) { http_response_code(404); exit('Not found'); }

$lang = $H['lang']; $url = $H['url']; $t = $T[$lang];
$title = $H['title']; $desc = $H['desc'];
$hub = $lang === 'es' ? '/es/servicios/' : '/services/';
$inicio = $lang === 'es' ? '/es/' : '/';

/* Hoja anterior y siguiente dentro del mismo idioma. */
$orden = $ORDEN[$lang]; $i = array_search($ID, $orden, true);
$prev = $i > 0 ? $orden[$i-1] : null;
$next = ($i !== false && $i < count($orden)-1) ? $orden[$i+1] : null;

/* JSON-LD. El FAQPage sale del MISMO array que pinta la página: si una
 * pregunta cambia en pantalla y no en el schema, Google lee una web que
 * ya no existe. Se generan de la misma fuente para que no puedan diverger. */
$migas = [['@type'=>'ListItem','position'=>1,'name'=>$t['breadcrumb_home'],'item'=>SITE.$inicio]];
if ($H['codigo'] !== 'DOC') {
  $migas[] = ['@type'=>'ListItem','position'=>2,'name'=>$t['breadcrumb_services'],'item'=>SITE.$hub];
}
$migas[] = ['@type'=>'ListItem','position'=>count($migas)+1,
            'name'=>strip_tags(html_entity_decode($H['h1'], ENT_QUOTES,'UTF-8')),'item'=>SITE.$url];

$jsonld = [
  ['@type'=>'BreadcrumbList','itemListElement'=>$migas],
  ['@type'=>'FAQPage','mainEntity'=>array_map(function($f){
      return ['@type'=>'Question','name'=>strip_tags(html_entity_decode($f[0],ENT_QUOTES,'UTF-8')),
              'acceptedAnswer'=>['@type'=>'Answer','text'=>strip_tags(html_entity_decode($f[1],ENT_QUOTES,'UTF-8'))]];
    }, $H['faq'])],
];
/* VideoObject por pieza, del mismo array que pinta la sección de vídeos (misma regla que el FAQ). */
foreach (($H['videos']['piezas'] ?? []) as $v) {
  $jsonld[] = ['@type'=>'VideoObject','name'=>strip_tags(html_entity_decode($v['titulo'],ENT_QUOTES,'UTF-8')),
    'description'=>strip_tags(html_entity_decode($v['texto'],ENT_QUOTES,'UTF-8')),
    'thumbnailUrl'=>SITE.'/assets/videos/'.$v['id'].'.webp','contentUrl'=>SITE.'/assets/videos/'.$v['id'].'.mp4',
    'uploadDate'=>$v['fecha'],'duration'=>$v['iso'],'inLanguage'=>$v['idioma']];
}
if ($H['codigo'] !== 'DOC') {
  $jsonld[] = ['@type'=>'Service',
    'name'=>strip_tags(html_entity_decode($H['h1'],ENT_QUOTES,'UTF-8')),
    'description'=>$H['desc'],
    'serviceType'=>strip_tags(html_entity_decode($H['h1'],ENT_QUOTES,'UTF-8')),
    'provider'=>['@type'=>'Organization','name'=>'AxisWorks','url'=>SITE.'/','email'=>EMAIL],
    'areaServed'=>['ES','ID','Worldwide'],
    /* sin availableLanguage (12-oct-2026): la web ya no afirma en qué idiomas trabaja el estudio (owner) */
    'url'=>SITE.$url];
}

$XPAGINA = 'hoja';
require_once __DIR__ . '/x/x.php';
$xpage = 'hoja';
?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
</head>
<body>
<?php require __DIR__ . '/x/hoja_tpl.php'; ?>
<script src="/assets/contacto.js?v=<?= VER ?>" defer></script>
<script src="/assets/x/menu.js?v=<?= VER ?>" defer></script>
</body>
</html>
