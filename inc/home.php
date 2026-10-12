<?php
/* home.php — la portada, la MISMA para `/` y para `/es/`.
 *
 * Diseño «X marks the work» (owner, 12-oct-2026: «Sí, sustituye a la actual»). Es la mesa C01 del lienzo del
 * owner calcada: marcado y CSS de la mesa (inc/x/home_tpl.php, assets/x/home.css), textos por idioma en
 * inc/x/t_home.php, y las partes que se mueven (avisos de la X, proyecto de ejemplo, red de departamentos,
 * registro) pintadas por assets/x/home.js con assets/x/dc.js. Departamentos y su cifra: inc/organigrama.php
 * (GENERADO); herramientas: inc/herramientas_datos.php. Anclas que usan otras páginas: #products #activity
 * #tools #studio #contact.
 * Encargo: encargos/20261012_axisworks_web_nueva_brand_kit.md (repo de la agencia). La portada anterior
 * (10-oct, Plus Jakarta + indigo) está en git y en Backups/20261012_1006_home_antes_diseno_x.php.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/catalogo.php';
$lang = $LANG;
$url  = $lang === 'es' ? '/es/' : '/';
$XPAGINA = 'home';
require_once __DIR__ . '/x/x.php';
$xpage = 'home';
$col  = $lang === 'es' ? 5 : 4;

$title = $lang === 'es'
  ? 'AxisWorks — Software a medida, bots y automatización para empresas'
  : 'AxisWorks — Custom software, AI bots and automation for business';
/* Sin «trabajamos en inglés y español» (owner, 12-oct-2026). */
$desc = $lang === 'es'
  ? 'Estudio de dos personas con departamentos de IA: software de gestión a medida, CRM, chatbots de WhatsApp con IA, automatización de procesos y embudos de venta en Meta.'
  : 'A two-person studio with AI departments: custom business software, CRM, WhatsApp AI chatbots, process automation and Meta Ads funnels.';

/* El `makesOffer` sale del catálogo de piezas, como antes. */
$ofertas = [];
foreach ($PRODUCTOS as $p) {
  $s = ['@type'=>'Service','name'=>html_entity_decode($lang==='es'?$p[3]:$p[2], ENT_QUOTES,'UTF-8')];
  if ($p[$col] && strpos($p[$col], '#') === false) $s['url'] = SITE . $p[$col];
  $ofertas[] = ['@type'=>'Offer','itemOffered'=>$s];
}
$jsonld = [
  ['@type'=>'Organization','@id'=>SITE.'/#org','name'=>'AxisWorks',
   'description'=>$desc,'url'=>SITE.'/','logo'=>SITE.'/assets/favicon.svg',
   'foundingDate'=>'2026','areaServed'=>['ES','ID','Worldwide'],'email'=>EMAIL],
  ['@type'=>'WebSite','@id'=>SITE.'/#site','url'=>SITE.'/','name'=>'AxisWorks',
   'publisher'=>['@id'=>SITE.'/#org'],'inLanguage'=>$lang],
  ['@type'=>'ProfessionalService','name'=>'AxisWorks','image'=>SITE.'/assets/og.jpg',
   'url'=>SITE.$url,'email'=>EMAIL,'makesOffer'=>$ofertas],
];
/* Lo que la ilustración necesita del servidor: la cifra contada y sus textos en el idioma de la página. */
$XD = ['n' => $ORGANIGRAMA['n'], 'lang' => $lang, 't' => ['highlighted' => xt('js_highlighted'), 'lead' => xt('js_lead')]];

?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
</head>
<body>
<div id="xroot">
<?php require __DIR__ . '/x/home_tpl.php'; ?>
</div>
<script>window.XD = <?= json_encode($XD, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
<script src="/assets/x/dc.js?v=<?= VER ?>" defer></script>
<script src="/assets/x/home<?= $lang === 'es' ? '.es' : '' ?>.js?v=<?= VER ?>" defer></script>
<script src="/assets/contacto.js?v=<?= VER ?>" defer></script>
<script src="/assets/x/menu.js?v=<?= VER ?>" defer></script>
<?php if (getenv('X_PRUEBA')): /* solo en pruebas locales: textos ES que faltan */ ?><!-- x-faltan: <?= e(implode(',', array_unique($X_FALTAN))) ?> --><?php endif; ?>
</body>
</html>
