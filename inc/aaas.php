<?php
/* aaas.php — Agents as a Service, la MISMA para EN y ES. Desde el 12-oct-2026 es la mesa C04 del diseño
 * «X marks the work» calcada (inc/x/aaas_tpl.php, assets/x/aaas.css/.js, textos en inc/x/t_aaas.php); el título,
 * la descripción y el JSON-LD siguen saliendo de $AAAS (landing_textos.php). Versión anterior: git y Backups/.
 * Solo hechos verificables (contexto/pilotos.md, contexto/erp_tipos.md, departamentos/pilotos/prompt.md).
 * Estado honesto: «En pruebas · modo sombra»; las AI Tools son «Previsto», no se venden.
 * No nombra clientes de otros proyectos ni cifras. Entradas: /agents-as-a-service y
 * /es/agentes-como-servicio (los dos .php de raíz). */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/catalogo.php';
require_once __DIR__ . '/landing_textos.php';

$lang = $LANG;
$url  = $lang === 'es' ? AAAS_ES : AAAS_EN;
$t    = $T[$lang];
$L    = $LAND[$lang];
$A    = $AAAS[$lang];
$XPAGINA = 'aaas';
require_once __DIR__ . '/x/x.php';
$xpage = 'aaas';
$title = $A['title'];
$desc  = $A['desc'];
$jsonld = [
  ['@type'=>'Organization','@id'=>SITE.'/#org','name'=>'AxisWorks','url'=>SITE.'/'],
  ['@type'=>'WebPage','@id'=>SITE.$url.'#page','url'=>SITE.$url,'name'=>html_entity_decode($title, ENT_QUOTES, 'UTF-8'),
   'description'=>$desc,'inLanguage'=>$lang,'isPartOf'=>['@id'=>SITE.'/#site']],
  ['@type'=>'Service','name'=>$A['jsonld_name'],'provider'=>['@id'=>SITE.'/#org'],'description'=>$desc,'url'=>SITE.$url],
  ['@type'=>'BreadcrumbList','itemListElement'=>[
    ['@type'=>'ListItem','position'=>1,'name'=>$t['breadcrumb_home'],'item'=>SITE.($lang==='es'?'/es/':'/')],
    ['@type'=>'ListItem','position'=>2,'name'=>$A['jsonld_name'],'item'=>SITE.$url]]],
];
?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
</head>
<body>
<div id="xroot">
<?php require __DIR__ . '/x/aaas_tpl.php'; ?>
</div>
<script src="/assets/x/dc.js?v=<?= VER ?>" defer></script>
<script src="/assets/x/aaas.js?v=<?= VER ?>" defer></script>
<script src="/assets/contacto.js?v=<?= VER ?>" defer></script>
<?php if (getenv('X_PRUEBA')): /* solo en pruebas locales: textos ES que faltan */ ?><!-- x-faltan: <?= e(implode(',', array_unique($X_FALTAN))) ?> --><?php endif; ?>
</body>
</html>
