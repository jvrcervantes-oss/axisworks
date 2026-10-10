<?php
/* home.php — la portada, la MISMA para `/` y para `/es/`.
 *
 * Nueva landing (10-oct-2026, owner): diagrama animado (assets/red.js; datos de ejemplo y
 * dicho como tal) · Productos (ERP / Agents as a Service / Webs) · carrusel de herramientas
 * (inc/herramientas.php, el de siempre) · estudio (organigrama GENERADO, inc/organigrama.php)
 * · cierre con el formulario REAL (#contact -> contacto.js -> api/contacto).
 * Estilo: assets/landing.css (Plus Jakarta Sans + Inter, indigo). Textos: landing_textos.php
 * (portada) y home_textos.php (estudio y autonomos). Anclas que usan otras paginas:
 * #erp #products #tools #studio #contact. La version anterior (Signal/Bone, hero CAD, ERP de
 * muestra, cuadro de piezas) esta en Backups/20261010_1030_landing_nueva/ y en git.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/catalogo.php';
require_once __DIR__ . '/home_textos.php';
require_once __DIR__ . '/landing_textos.php';
require_once __DIR__ . '/organigrama.php';   /* GENERADO desde las fichas de los departamentos */

$lang = $LANG;
$hm   = $HOME[$lang];
/* El número de departamentos no se escribe: se cuenta. Nace uno en la agencia, se regenera
   organigrama.php en el cierre de turno y la cifra (13 → 14…) cambia sola en los tres sitios. */
$org_pal = $ORGANIGRAMA['palabra'][$lang];
$org_num = ['{N}' => $ORGANIGRAMA['n'], '{PALABRA}' => $org_pal, '{PALABRA_MAY}' => mb_strtoupper($org_pal, 'UTF-8')];
foreach (['m2_v', 'who_3p', 'deps_t'] as $k) $hm[$k] = strtr($hm[$k], $org_num);
$hm['org'] = [];
foreach ($hm['org_secs'] as $eje => $lema) {
  $deps = [];
  foreach ($ORGANIGRAMA['deps'] as $d) if ($d['seccion'] === $eje) $deps[] = [$d['cara'], $d[$lang][0], $d[$lang][1], $d[$lang][2], $d['imagen']];
  if ($deps) $hm['org'][] = [$eje, $lema, $deps];
}
$t    = $T[$lang];
$L    = $LAND[$lang];
$landing = true;
$sub_n = str_replace('{PALABRA_CAP}', mb_strtoupper(mb_substr($org_pal, 0, 1, 'UTF-8'), 'UTF-8') . mb_substr($org_pal, 1, null, 'UTF-8'), $L['h_sub']);
$url  = $lang === 'es' ? '/es/' : '/';
$hub  = $lang === 'es' ? '/es/servicios/' : '/services/';
$col  = $lang === 'es' ? 5 : 4;

$title = $lang === 'es'
  ? 'AxisWorks — Software a medida, bots y automatización para empresas'
  : 'AxisWorks — Custom software, AI bots and automation for business';
$desc = $lang === 'es'
  ? 'Estudio de dos personas: software de gestión a medida, CRM, chatbots de WhatsApp con IA, automatización de procesos y embudos de venta en Meta. En español e inglés.'
  : 'A two-person studio: custom business software, CRM, WhatsApp AI chatbots, process automation and Meta Ads funnels. We work in English and Spanish.';

/* El `makesOffer` sale del MISMO array que pinta el cuadro de piezas. */
$ofertas = [];
foreach ($PRODUCTOS as $p) {
  $s = ['@type'=>'Service','name'=>html_entity_decode($lang==='es'?$p[3]:$p[2], ENT_QUOTES,'UTF-8')];
  if ($p[$col] && strpos($p[$col], '#') === false) $s['url'] = SITE . $p[$col];
  $ofertas[] = ['@type'=>'Offer','itemOffered'=>$s];
}
$jsonld = [
  ['@type'=>'Organization','@id'=>SITE.'/#org','name'=>'AxisWorks',
   'description'=>$desc,'url'=>SITE.'/','logo'=>SITE.'/assets/favicon.svg',
   'foundingDate'=>'2026','knowsLanguage'=>['en','es'],
   'areaServed'=>['ES','ID','Worldwide'],'email'=>EMAIL],
  ['@type'=>'WebSite','@id'=>SITE.'/#site','url'=>SITE.'/','name'=>'AxisWorks',
   'publisher'=>['@id'=>SITE.'/#org'],'inLanguage'=>$lang],
  ['@type'=>'ProfessionalService','name'=>'AxisWorks','image'=>SITE.'/assets/og.jpg',
   'url'=>SITE.$url,'email'=>EMAIL,'makesOffer'=>$ofertas],
];

?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
</head>
<body class="land">
<?php require __DIR__ . '/l_nav.php'; ?>
<main id="top">

<section class="l-hero" id="hero"><div class="l-wrap">
  <p class="l-eyebrow"><span class="ms" aria-hidden="true" style="font-size:16px">deployed_code</span><?= $L['h_eyebrow'] ?></p>
  <h1><?= $L['h_h1'] ?></h1>
  <p class="l-sub"><?= $sub_n ?></p>
  <div class="l-cta">
    <a class="l-btn p" href="#products"><?= $L['h_cta1'] ?><span class="ms" aria-hidden="true">arrow_downward</span></a>
    <a class="l-btn s" href="<?= ERP_URL ?>" rel="noopener"><span class="ms" aria-hidden="true">play_circle</span><?= $L['h_cta2'] ?></a>
  </div>

  <div class="l-bar"><span class="l-tag"><?= $L['h_tag'] ?></span></div>
  <div class="kpis" style="justify-content:flex-start">
    <div class="kpi"><small><?= $L['k_dep'] ?></small><b><?= (int) $ORGANIGRAMA['n'] ?></b></div>
    <div class="kpi"><small><?= $L['k_act'] ?></small><b id="c-a">—</b></div>
    <div class="kpi"><small><?= $L['k_coord'] ?></small><b id="c-c">—</b></div>
    <div class="kpi"><small><?= $L['k_st'] ?></small><b class="live smp"><i></i><span><?= $L['k_st_v'] ?></span></b></div>
  </div>
  <p id="lead" style="font-size:15px;color:var(--mu);margin:4px 0 8px"></p>
  <div class="leg" aria-hidden="true">
    <?php foreach ([['#FF2D55',0],['#0A84FF',1],['#32ADE6',2],['#AF52DE',3],['#30B650',4],['#FF9F0A',5],['#8E8E93',6],['#5856D6',7]] as [$c,$i]): ?>
    <span><i style="background:<?= $c ?>"></i><?= e($L['leg'][$i]) ?></span>
    <?php endforeach; ?>
  </div>
  <div class="info glass" id="info" aria-live="polite"></div>
  <div class="stage">
    <div class="netw" id="netw" data-deps="<?= (int) $ORGANIGRAMA['n'] ?>"><div class="net" id="net"><canvas id="cv" width="1250" height="1080" aria-hidden="true"></canvas></div></div>
    <aside class="rail" id="rail" aria-hidden="true"></aside>
  </div>
  <div class="mlist" id="mlist"></div>
</div></section>

<section class="l-sec" id="products"><div class="l-wrap">
  <p class="l-eyebrow"><?= $L['p_eyebrow'] ?></p>
  <h2><?= $L['p_h2'] ?></h2>
  <p class="l-lead"><?= $L['p_lead'] ?></p>
  <div class="l-rule"></div>
  <div class="l-prods">
    <article class="l-card" id="erp">
      <header><div class="l-ico"><span class="ms" aria-hidden="true">space_dashboard</span></div><span class="l-chip ok"><?= $L['erp_chip'] ?></span></header>
      <h3><a href="<?= ERP_URL ?>" rel="noopener"><?= $L['erp_h3'] ?></a></h3>
      <p><?= $L['erp_p'] ?></p>
      <div class="l-types"><?php foreach ($L['erp_types'] as $x): ?><span><?= $x ?></span><?php endforeach; ?></div>
      <ul>
        <?php foreach ($L['erp_b'] as $x): ?><li><span class="ms" aria-hidden="true">check_circle</span><?= $x ?></li><?php endforeach; ?>
        <li class="pl"><span class="ms" aria-hidden="true">schedule</span><?= $L['erp_pl'] ?></li>
      </ul>
      <a class="l-more" href="<?= ERP_URL ?>" rel="noopener"><?= $L['erp_more'] ?> <span class="ms" aria-hidden="true">arrow_forward</span></a>
    </article>
    <article class="l-card" id="agents">
      <header><div class="l-ico"><span class="ms" aria-hidden="true">smart_toy</span></div><span class="l-chip test"><?= $L['ag_chip'] ?></span></header>
      <h3><a href="<?= $lang === 'es' ? AAAS_ES : AAAS_EN ?>"><?= $L['ag_h3'] ?></a></h3>
      <p><?= $L['ag_p'] ?></p>
      <div class="l-ppl" role="img" aria-label="<?= e($L['ag_nine']) ?>"><?php for ($i = 0; $i < 9; $i++): ?><span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z"/></svg></span><?php endfor; ?></div>
      <ul>
        <?php foreach ($L['ag_b'] as $x): ?><li><span class="ms" aria-hidden="true">check_circle</span><?= $x ?></li><?php endforeach; ?>
        <li class="pl"><span class="ms" aria-hidden="true">schedule</span><?= $L['ag_pl'] ?></li>
      </ul>
      <a class="l-more" href="<?= $lang === 'es' ? AAAS_ES : AAAS_EN ?>"><?= $L['ag_more'] ?> <span class="ms" aria-hidden="true">arrow_forward</span></a>
    </article>
    <article class="l-card" id="webs">
      <header><div class="l-ico"><span class="ms" aria-hidden="true">web</span></div><span class="l-chip ok"><?= $L['wb_chip'] ?></span></header>
      <h3><?= $L['wb_h3'] ?></h3>
      <p><?= $L['wb_p'] ?></p>
      <div class="l-web" aria-hidden="true"><i></i><div><b></b><b></b><b></b></div></div>
      <ul>
        <?php foreach ($L['wb_b'] as $x): ?><li><span class="ms" aria-hidden="true">check_circle</span><?= $x ?></li><?php endforeach; ?>
        <li class="pl"><span class="ms" aria-hidden="true">schedule</span><?= $L['wb_pl'] ?></li>
      </ul>
      <a class="l-more" href="#contact"><?= $L['wb_more'] ?> <span class="ms" aria-hidden="true">arrow_forward</span></a>
    </article>
  </div>
  <div class="l-flow"><b><?= $L['flow'][0] ?></b><span><span class="ms" aria-hidden="true">arrow_right_alt</span><?= $L['flow'][1] ?></span><b><?= $L['flow'][2] ?></b><span><span class="ms" aria-hidden="true">arrow_right_alt</span><?= $L['flow'][3] ?></span><b><?= $L['flow'][4] ?></b></div>
</div></section>

<div class="l-toolswrap" id="tools"><?php require __DIR__ . '/herramientas.php'; ?></div>

<section class="l-sec" id="studio"><div class="l-wrap">
  <p class="l-eyebrow"><?= $t['nav_studio'] ?></p>
  <h2><?= $hm['who_h2'] ?></h2>
  <div class="l-dirs">
    <?php foreach ([['01','BUILD','Javier','javier','who_1role','who_1p',''],['03','CEO','Pepito','pepito','who_3role','who_3p',' ai'],['02','DESIGN','Andrea','andrea','who_2role','who_2p','']] as [$n,$eje,$nom,$img,$rol,$txt,$cl]): ?>
    <div class="l-dir<?= $cl ?>">
      <div class="l-av"><img src="/assets/images/team-<?= $img ?>.webp" alt="<?= e($nom) ?>" width="52" height="52" loading="lazy" decoding="async"></div>
      <small>DIR_NODE_<?= $n ?> · <?= $eje ?></small>
      <h3><?= $nom ?></h3>
      <p class="role"><?= $hm[$rol] ?></p>
      <p class="t"><?= $hm[$txt] ?></p>
    </div>
    <?php endforeach; ?>
  </div>
  <p class="l-bus"><?= $hm['deps_t'] ?></p>
  <div class="l-orgrid">
    <?php $n = 0; foreach ($hm['org'] as [$eje, $lema, $deps]): ?>
    <section class="l-osec" aria-label="<?= $eje ?>">
      <p class="l-ohead"><b><?= $eje ?></b><span><?= $lema ?></span></p>
      <ul class="l-odeps">
        <?php foreach ($deps as [$cara, $nom, $hace, $prods, $img]): $n++; ?>
        <li class="l-dep"><span class="l-ini" aria-hidden="true"><?= mb_substr(html_entity_decode(strip_tags($nom), ENT_QUOTES, 'UTF-8'), 0, 1, 'UTF-8') ?></span><div><small><?= sprintf('DEP.%02d', $n) ?></small><b><?= $nom ?></b><em><?= $hace ?></em></div></li>
        <?php endforeach; ?>
      </ul>
    </section>
    <?php endforeach; ?>
  </div>
  <?php if (!empty($hm['auto'])): ?>
  <p class="l-autoh"><?= $hm['auto_t'] ?><span><?= $hm['auto_lema'] ?></span></p>
  <ul class="l-auts">
    <?php foreach ($hm['auto'] as $i => [$cara, $nom, $hace, $estado, $prods]): $cl = $cara === 'vigilante' ? 'live' : ($cara === 'investigador' ? 'pilot' : 'build'); ?>
    <li class="l-aut"><span class="l-st <?= $cl ?>"><?= $estado ?></span><b><?= $nom ?></b><em><?= $hace ?></em></li>
    <?php endforeach; ?>
  </ul>
  <?php endif; ?>
  <p class="l-lead" style="font-size:14px"><?= $hm['deps_note'] ?></p>
</div></section>

<section class="l-close" id="contact"><div class="l-wrap">
  <h2><?= $L['c_h2'] ?></h2>
  <p><?= $L['c_p'] ?></p>
  <div class="l-formwrap l-form"><?php $fc_pagina = $url; require __DIR__ . '/form_contacto.php'; ?></div>
  <div class="l-cta"><a class="l-btn s" href="<?= ERP_URL ?>" rel="noopener"><span class="ms" aria-hidden="true">play_circle</span><?= $L['c_erp'] ?></a></div>
</div></section>

</main>
<?php require __DIR__ . '/l_footer.php'; ?>
<script src="/assets/red.js?v=<?= VER ?>" defer></script>
</body>
</html>
