<?php
/* aaas.php — landing de Agents as a Service (10-oct-2026), la MISMA para EN y ES.
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
$landing = true;
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
$person = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z"/></svg>';
?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
</head>
<body class="land">
<?php require __DIR__ . '/l_nav.php'; ?>
<main id="top">

<section class="l-ahero"><div class="l-wrap">
  <p class="l-eyebrow"><span class="ms" aria-hidden="true" style="font-size:16px">smart_toy</span><?= $A['eyebrow'] ?></p>
  <h1><?= $A['h1'] ?></h1>
  <p class="l-sub"><?= $A['sub'] ?></p>
  <div class="l-cta">
    <a class="l-btn p" href="#contact"><?= $A['cta1'] ?><span class="ms" aria-hidden="true">arrow_forward</span></a>
    <a class="l-btn s" href="#agents"><?= $A['cta2'] ?><span class="ms" aria-hidden="true">arrow_downward</span></a>
  </div>
  <div class="l-state"><span class="l-chip test"><?= $A['st_chip'] ?></span><span><?= $A['st_p'] ?></span></div>
</div></section>

<section class="l-sec" id="agents"><div class="l-wrap">
  <p class="l-eyebrow"><?= $A['ag_eyebrow'] ?></p>
  <h2><?= $A['ag_h2'] ?></h2>
  <p class="l-lead"><?= $A['ag_lead'] ?></p>
  <ul class="l-agents">
    <?php foreach ($AGENTES[$lang] as [$nom, $rol, $que]): ?>
    <li class="l-agent"><span class="pic"><?= $person ?></span><div><h3><?= $nom ?></h3><small><?= $rol ?></small></div><p><?= $que ?></p></li>
    <?php endforeach; ?>
  </ul>
  <p class="l-note"><?= $A['ag_note'] ?></p>
</div></section>

<section class="l-sec" id="how"><div class="l-wrap">
  <p class="l-eyebrow"><?= $A['how_eyebrow'] ?></p>
  <h2><?= $A['how_h2'] ?></h2>
  <ol class="l-steps">
    <?php foreach ($A['how'] as [$h, $p]): ?><li><h3><?= $h ?></h3><p><?= $p ?></p></li><?php endforeach; ?>
  </ol>
</div></section>

<section class="l-sec" id="limits"><div class="l-wrap">
  <p class="l-eyebrow"><?= $A['lim_eyebrow'] ?></p>
  <h2><?= $A['lim_h2'] ?></h2>
  <p class="l-lead"><?= $A['lim_lead'] ?></p>
  <ul class="l-stop"><?php foreach ($A['stops'] as $s): ?><li><?= $s ?></li><?php endforeach; ?></ul>
  <ul class="l-limits">
    <?php foreach ($A['lim'] as [$ic, $h, $p]): ?>
    <li><span class="ms" aria-hidden="true"><?= $ic ?></span><h3><?= $h ?></h3><p><?= $p ?></p></li>
    <?php endforeach; ?>
  </ul>
</div></section>

<section class="l-sec" id="on"><div class="l-wrap">
  <p class="l-eyebrow"><?= $A['on_eyebrow'] ?></p>
  <h2><?= $A['on_h2'] ?></h2>
  <p class="l-lead"><?= $A['on_p'] ?></p>
  <div class="l-flow"><b>AaaS</b><span><span class="ms" aria-hidden="true">arrow_right_alt</span><?= $L['flow'][1] ?></span><b>ERP</b></div>
  <div class="l-cta" style="justify-content:flex-start"><a class="l-btn s" href="<?= ERP_URL ?>" rel="noopener"><span class="ms" aria-hidden="true">play_circle</span><?= $A['on_cta'] ?></a></div>
</div></section>

<section class="l-sec" id="status"><div class="l-wrap">
  <p class="l-eyebrow"><?= $A['sx_eyebrow'] ?></p>
  <h2><?= $A['sx_h2'] ?></h2>
  <div class="l-cols">
    <?php foreach ($A['sx'] as [$h, $items]): ?>
    <div class="l-col"><h3><?= $h ?></h3><ul><?php foreach ($items as $x): ?><li><?= $x ?></li><?php endforeach; ?></ul></div>
    <?php endforeach; ?>
  </div>
</div></section>

<section class="l-close" id="contact"><div class="l-wrap">
  <h2><?= $A['cl_h2'] ?></h2>
  <p><?= $A['cl_p'] ?></p>
  <div class="l-formwrap l-form"><?php $fc_pagina = $url; require __DIR__ . '/form_contacto.php'; ?></div>
</div></section>

</main>
<?php require __DIR__ . '/l_footer.php'; ?>
</body>
</html>
