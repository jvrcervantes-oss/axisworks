<?php
/* actividad.php — «Actividad del estudio» (10-oct-2026), la MISMA plantilla para EN y ES.
 * Versión con DATOS REALES del diagrama de la portada: assets/red.js en modo datos (#netw[data-src]).
 * El fichero estático `estudio-en-vivo.json` (nombre técnico heredado, no se pinta) lo genera
 * tools/estudio_publico.py de la agencia; contrato: contexto/estudio_en_vivo_contrato.md.
 * Si el JSON falta, no valida o caducó, red.js cae a la estructura sin estados y lo dice.
 * Entradas: /studio-activity y /es/actividad-del-estudio (los dos .php finos).
 * Textos: actividad_textos.php (lo que se puede decir lo fija el contrato §7). */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/catalogo.php';
require_once __DIR__ . '/landing_textos.php';
require_once __DIR__ . '/actividad_textos.php';
require_once __DIR__ . '/organigrama.php';   /* GENERADO: de aquí sale el número de departamentos */

const ACT_JSON = '/estudio-en-vivo.json';    /* un solo sitio: si S5 lo mueve, se cambia aquí */

$lang = $LANG;
$url  = $lang === 'es' ? ACT_ES : ACT_EN;
$t    = $T[$lang];
$L    = $LAND[$lang];
$A    = $ACT[$lang];
$landing = true;
$title = $A['title'];
$desc  = $A['desc'];
$aaas  = $lang === 'es' ? AAAS_ES : AAAS_EN;
$priv  = $lang === 'es' ? '/es/privacidad' : '/privacy';
$inicio = $lang === 'es' ? '/es/' : '/';
$jsonld = [
  ['@type'=>'Organization','@id'=>SITE.'/#org','name'=>'AxisWorks','url'=>SITE.'/'],
  ['@type'=>'WebPage','@id'=>SITE.$url.'#page','url'=>SITE.$url,'name'=>html_entity_decode($title, ENT_QUOTES, 'UTF-8'),
   'description'=>$desc,'inLanguage'=>$lang,'isPartOf'=>['@id'=>SITE.'/#site']],
  ['@type'=>'BreadcrumbList','itemListElement'=>[
    ['@type'=>'ListItem','position'=>1,'name'=>$t['breadcrumb_home'],'item'=>SITE.$inicio],
    ['@type'=>'ListItem','position'=>2,'name'=>$A['jsonld'],'item'=>SITE.$url]]],
];
$colores = ['#FF2D55','#0A84FF','#32ADE6','#AF52DE','#30B650','#FF9F0A','#8E8E93','#5856D6'];
?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
</head>
<body class="land">
<?php require __DIR__ . '/l_nav.php'; ?>
<main id="top">

<section class="l-hero l-act" id="hero"><div class="l-wrap">
  <p class="l-eyebrow"><span class="ms" aria-hidden="true">schedule</span><?= $A['eyebrow'] ?></p>
  <h1><?= $A['h1'] ?></h1>
  <p class="l-sub"><?= $A['sub'] ?></p>

  <div class="l-bar"><span class="l-tag" id="tag"></span></div>
  <div class="kpis" style="justify-content:flex-start">
    <div class="kpi"><small><?= $A['k_dep'] ?></small><b id="k-dep"><?= (int) $ORGANIGRAMA['n'] ?></b></div>
    <div class="kpi"><small><?= $A['k_data'] ?></small><b id="k-data" class="kt">—</b></div>
    <div class="kpi"><small><?= $A['k_delay'] ?></small><b id="k-delay" class="kt">—</b></div>
    <div class="kpi"><small><?= $A['k_st'] ?></small><b class="live smp" id="k-st"><i></i><span>—</span></b></div>
  </div>
  <p id="lead" role="status" style="font-size:15px;color:var(--mu);margin:4px 0 8px"></p>
  <div class="leg" role="group" aria-label="<?= e($A['leg_h']) ?>">
    <?php foreach ($colores as $i => $c): ?>
    <span><i style="background:<?= $c ?>"></i><?= e($A['leg'][$i]) ?></span>
    <?php endforeach; ?>
  </div>
  <div class="leg legst" role="group" aria-label="<?= e($A['st_h']) ?>">
    <?php foreach ($A['st_leg'] as [$cl, $tx]): ?>
    <span><i class="sw <?= $cl ?>"></i><?= e($tx) ?></span>
    <?php endforeach; ?>
  </div>
  <div class="info glass" id="info" aria-live="polite"></div>
  <div class="stage">
    <div class="netw real" id="netw" data-deps="<?= (int) $ORGANIGRAMA['n'] ?>" data-src="<?= e(ACT_JSON) ?>"><div class="net" id="net"><canvas id="cv" width="1040" height="1080" aria-hidden="true"></canvas></div></div>
    <aside class="rail" id="rail"></aside>
  </div>
  <div class="mlist" id="mlist"></div>
  <noscript><p class="l-note"><?= e($A['noscript']) ?></p></noscript>
</div></section>

<section class="l-sec" id="about"><div class="l-wrap">
  <h2><?= $A['note_h'] ?></h2>
  <ul class="l-actnotes">
    <?php foreach ($A['notes'] as $n): ?><li><?= strtr($n, ['%AAAS%' => $aaas, '%PRIV%' => $priv]) ?></li><?php endforeach; ?>
  </ul>
  <div class="l-cta" style="justify-content:flex-start"><a class="l-btn s" href="<?= $inicio ?>#studio"><?= $A['back'] ?><span class="ms" aria-hidden="true">arrow_forward</span></a></div>
</div></section>

<section class="l-close" id="contact"><div class="l-wrap">
  <h2><?= $A['cta_h'] ?></h2>
  <p><?= $A['cta_p'] ?></p>
  <div class="l-formwrap l-form"><?php $fc_pagina = $url; require __DIR__ . '/form_contacto.php'; ?></div>
</div></section>

</main>
<?php require __DIR__ . '/l_footer.php'; ?>
<script src="/assets/red.js?v=<?= VER ?>" defer></script>
</body>
</html>
