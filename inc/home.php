<?php
/* home.php — la portada, la MISMA para `/` y para `/es/`.
 *
 * Rediseño del 24-sep-2026 sobre el mockup de Stitch («Technical Blueprint
 * Workshop»): secciones a sangre separadas por filete, paneles bordeados que
 * comparten borde, tablas mono y telemetría de esquina. Qué se tomó y qué no:
 *   · SE TOMA la composición: hero 7/5 con barra de datos, hoja del ERP con su
 *     panel, cuadro de piezas en tabla, proceso en 4 columnas, estudio con
 *     departamentos, alta de proyecto en Ink, pie a tres columnas.
 *   · NO se toman sus tokens (el Tailwind era Material autogenerado: blanco
 *     azulado y naranja quemado que contradicen su propio DESIGN.md) ni su
 *     texto (métricas, ciudades y un ledger con compradores inventados).
 *   · El instrumento del hero sigue siendo la ✕ que converge con el cursor
 *     (v9): Stitch pintó un anillo giratorio genérico; el anillo queda como
 *     retícula estática y la ✕ dentro es la pieza.
 *   · Work no estaba en el mockup pero sí en el encargo a Stitch
 *     (`prompt_stitch.md` §4): es la única prueba real de la web, y la nav y
 *     B07 apuntan a `#work`. Se queda, en el lenguaje nuevo.
 * Los IDs de ancla (#services #work #process #studio #contact) no cambian:
 * los usan `nav.php`, `catalogo.php` y las 12 hojas. `#erp` es nuevo.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/catalogo.php';
require_once __DIR__ . '/home_textos.php';

$lang = $LANG;
$hm   = $HOME[$lang];
$t    = $T[$lang];
$url  = $lang === 'es' ? '/es/' : '/';
$hub  = $lang === 'es' ? '/es/servicios/' : '/services/';
$col  = $lang === 'es' ? 5 : 4;

$title = $lang === 'es'
  ? 'AxisWorks — Software a medida, bots y automatización para empresas'
  : 'AxisWorks — Custom software, AI bots and automation for business';
$desc = $lang === 'es'
  ? 'Estudio de dos personas: software de gestión a medida, CRM, chatbots de WhatsApp con IA, automatización de procesos y embudos de venta en Meta. En español e inglés.'
  : 'A two-person studio: custom business software, CRM, WhatsApp AI chatbots, process automation and Meta Ads funnels. We work in English and Spanish, from Spain and Bali.';

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

$work = [
  ['https://balimotoadventures.com','work-balimoto.jpg','Bali Moto Adventures',1200,582,'tag_1'],
  [null,'work-lawang.jpg','Lawang Estate',1200,608,'tag_2'],
  ['https://sumba.balibestmotorcycle.com','work-sumba.jpg','Sumba Rental Motorbike',1200,590,'tag_3'],
  [null,'work-ids.jpg','IDS Fincas',1200,795,'tag_4'],
  [null,'work-burger.jpg','Carbón',1200,730,'tag_5'],
];
?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
<link rel="stylesheet" href="/assets/home.css?v=<?= VER ?>">
</head>
<body class="home">

<canvas id="cad" aria-hidden="true"></canvas>
<div class="axis" aria-hidden="true"><div class="axis__fill" id="axisFill"></div><div class="axis__node" id="axisNode"></div></div>
<div class="hud hud--coords" aria-hidden="true">X <b id="cx">000</b> &nbsp; Y <b id="cy">000</b></div>

<?php require __DIR__ . '/nav.php'; ?>

<main id="top">

<!-- 01 · HERO — anotación a la izquierda, instrumento a la derecha -->
<section class="band hero" id="hero">
  <span class="tele tele--tl" aria-hidden="true"><?= $hm['hud'] ?></span>
  <span class="tele tele--tr" aria-hidden="true">SCALE 1:1 // UNITS PX</span>
  <div class="shell hero__grid">
    <div class="hero__col">
      <p class="chip"><i></i><?= $hm['hero_chip'] ?><span class="chip__based"> <span class="sep">//</span> <?= $t['based'] ?></span></p>
      <h1><?= $hm['hero_h1'] ?></h1>
      <p class="hero__lead"><?= $hm['hero_lead'] ?></p>
      <div class="hero__data">
        <div><span><?= $hm['m1_k'] ?></span><b><?= $hm['m1_v'] ?></b></div>
        <div><span><?= $hm['m2_k'] ?></span><b><?= $hm['m2_v'] ?></b></div>
        <div><span><?= $hm['m3_k'] ?></span><b><?= $hm['m3_v'] ?></b></div>
      </div>
      <div class="hero__acts">
        <a href="#contact" class="btn btn--signal"><span><?= $hm['hero_cta'] ?></span> <span class="ar" aria-hidden="true">→</span></a>
        <a href="#erp" class="btn btn--term">[ <?= $hm['hero_cta2'] ?> ]</a>
      </div>
    </div>

    <div class="instr" aria-hidden="true">
      <div class="instr__bar"><span><?= $hm['instr'] ?></span><span class="instr__st"><span class="st-cal"><?= $hm['hero_st_cal'] ?></span><span class="st-ok"><?= $hm['hero_st_ok'] ?></span></span></div>
      <div class="instr__field">
        <svg class="instr__ring" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="92" stroke-dasharray="2 4"/>
          <circle cx="100" cy="100" r="70"/>
          <circle cx="100" cy="100" r="48" stroke-dasharray="8 4"/>
          <line x1="100" y1="0" x2="100" y2="200"/><line x1="0" y1="100" x2="200" y2="100"/>
        </svg>
        <span class="card card--n">000°</span><span class="card card--e">090°</span>
        <span class="card card--s">180°</span><span class="card card--w">270°</span>
        <div class="hero__mark" id="heroMark">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <!-- m2 primero: en SVG el orden del marcado es el orden de capas, y en el
                 cruce la línea de medida (Steel) tapaba al acento. -->
            <line class="m2" x1="92" y1="8" x2="8" y2="92"/>
            <line class="m1" x1="8" y1="8" x2="92" y2="92"/>
          </svg>
        </div>
      </div>
      <div class="instr__foot"><span class="instr__hint"><?= $hm['instr_hint'] ?></span><span class="pill"><i></i>STATUS: <span class="st-cal"><?= $hm['hero_st_cal'] ?></span><span class="st-ok"><?= $hm['hero_st_ok'] ?></span></span></div>
    </div>
  </div>
</section>

<!-- 02 · ERP — el producto principal, con su panel de ejemplo -->
<section class="band" id="erp">
  <div class="shell">
    <div class="shead">
      <div><p class="eyebrow"><span><?= $hm['erp_eyebrow'] ?></span></p><h2><?= $hm['erp_h2'] ?></h2></div>
      <p class="shead__aside mono"><?= $hm['erp_chip'] ?></p>
    </div>

    <div class="erp">
      <div class="erp__bar">
        <span class="erp__name"><i></i><?= $hm['erp_bar'] ?></span>
        <span class="pill pill--ink"><?= $hm['erp_sample'] ?></span>
      </div>
      <div class="erp__alert"><span aria-hidden="true">!</span> <?= $hm['erp_alert'] ?></div>
      <div class="erp__main">
        <div class="erp__today">
          <p class="lbl"><?= $hm['erp_today'] ?></p>
          <div class="tbl-wrap">
            <table class="tbl">
              <thead><tr><?php foreach ($hm['erp_th'] as $i => $th): ?><th<?= $i === 4 ? ' class="r"' : '' ?>><?= $th ?></th><?php endforeach; ?></tr></thead>
              <tbody>
              <?php foreach ($hm['erp_rows'] as $r): ?>
                <tr><td class="dim"><?= $r[0] ?></td><td><b><?= $r[1] ?></b></td><td class="dim"><?= $r[2] ?></td><td><span class="tag"><?= $r[3] ?></span></td><td class="r<?= $r[5] ? ' due' : '' ?>"><?= $r[4] ?></td></tr>
              <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        </div>
        <div class="erp__bot">
          <p class="lbl"><?= $hm['erp_bot_t'] ?></p>
          <p class="erp__bot-h"><?= $hm['erp_bot_h'] ?></p>
          <p class="erp__bot-p"><?= $hm['erp_bot_p'] ?></p>
          <p class="erp__bot-f"><?= $hm['erp_bot_f'] ?></p>
        </div>
      </div>
      <div class="erp__mods">
        <?php foreach ($hm['erp_mods'] as $g): ?>
        <div class="erp__mod">
          <p class="lbl lbl--ink"><?= array_shift($g) ?></p>
          <ul><?php foreach ($g as $m): ?><li><?= $m ?></li><?php endforeach; ?></ul>
        </div>
        <?php endforeach; ?>
      </div>
      <div class="erp__foot">
        <p class="erp__vert"><b><?= $hm['erp_vert_l'] ?>:</b> <span class="tag"><?= $hm['erp_vert_1'] ?></span> <span class="x-s">✕</span> <span class="tag"><?= $hm['erp_vert_2'] ?></span></p>
        <p class="erp__proof"><b><?= $hm['erp_proof_l'] ?> —</b> <?= $hm['erp_proof'] ?></p>
      </div>
    </div>
  </div>
</section>

<!-- 03 · EL CUADRO DE PIEZAS — los 11 de $PRODUCTOS. Los códigos son número de
     plano, no un orden de lectura. Fila sin página = plana, sin flecha ni hover. -->
<section class="band" id="services">
  <div class="shell">
    <div class="shead">
      <div><p class="eyebrow"><span><?= $hm['cat_eyebrow'] ?></span></p><h2><?= $hm['cat_h2'] ?></h2></div>
      <p class="shead__aside mono"><?= $hm['cat_note'] ?></p>
    </div>
    <div class="tbl-wrap tbl-wrap--box">
      <table class="tbl tbl--cat">
        <thead><tr><th><?= $hm['cat_th'][0] ?></th><th><?= $hm['cat_th'][1] ?></th><th class="hide-s"><?= $hm['cat_th'][2] ?></th><th class="r"><?= $hm['cat_th'][3] ?></th></tr></thead>
        <tbody>
        <?php foreach ($PRODUCTOS as $p):
          $nombre = $lang === 'es' ? $p[3] : $p[2];
          $destino = $p[$col]; ?>
          <tr class="<?= $destino ? 'is-link' : 'is-flat' ?>">
            <td class="cod"><?= $p[0] ?></td>
            <td class="nom"><?php if ($destino): ?><a href="<?= e($destino) ?>"><?= $nombre ?> <span class="ar" aria-hidden="true">→</span></a><?php else: ?><?= $nombre ?><?php endif; ?></td>
            <td class="dim hide-s"><?= $hm['alcance'][$p[0]] ?></td>
            <td class="r"><span class="tag<?= $p[1] === 'ADVISORY' ? ' tag--ink' : '' ?>"><?= $p[1] ?></span></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <div class="cat__foot">
      <span class="mono dim"><?= $hm['cat_ask'] ?></span>
      <a href="<?= $hub ?>" class="btn btn--term">[ <?= $t['index'] ?> ]</a>
    </div>
  </div>
</section>

<!-- 04 · WORK — capturas reales. No estaba en el mockup; sí en el encargo. -->
<section class="band" id="work">
  <div class="shell">
    <div class="shead"><div><p class="eyebrow"><span><?= $hm['work_eyebrow'] ?></span></p><h2><?= $hm['work_h2'] ?></h2></div></div>
    <div class="work">
      <?php foreach ($work as $i => $w):
        $tag = '<div class="work__cap"><span class="dim">0' . ($i+1) . ' / ' . $hm[$w[5]] . '</span><b>' . $w[2] . '</b><span class="pill' . ($w[0] ? '' : ' pill--off') . '">' . ($w[0] ? $hm['work_live'] . ' ↗' : $hm['work_private']) . '</span></div>';
        $img = '<div class="work__media"><img src="/assets/images/' . $w[1] . '" alt="' . e($w[2]) . '" loading="lazy" width="' . $w[3] . '" height="' . $w[4] . '"></div>'; ?>
        <?php if ($w[0]): ?>
        <a class="work__item" href="<?= $w[0] ?>" target="_blank" rel="noopener"><?= $img . $tag ?></a>
        <?php else: ?>
        <div class="work__item"><?= $img . $tag ?></div>
        <?php endif; ?>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<!-- 05 · PROCESO — cuatro fases. Las ✕ de los nodos van en Steel: la única ✕
     Signal de la página es la del instrumento. -->
<section class="band" id="process">
  <div class="shell">
    <div class="shead"><div><p class="eyebrow"><span><?= $hm['proc_eyebrow'] ?></span></p><h2><?= $hm['proc_h2'] ?></h2></div></div>
    <ol class="proc">
      <?php foreach ($hm['proc'] as $i => $f): ?>
      <li class="proc__step">
        <div class="proc__top"><span><?= $hm['proc_phase'] ?>_0<?= $i+1 ?></span><span class="x-s" aria-hidden="true">✕</span></div>
        <h3>0<?= $i+1 ?> <?= $f[0] ?></h3>
        <p><?= $f[1] ?></p>
        <p class="proc__out"><?= $hm['proc_out'] ?>: <?= $f[2] ?></p>
      </li>
      <?php endforeach; ?>
    </ol>
  </div>
</section>

<!-- 06 · ESTUDIO — dos personas y los nueve departamentos -->
<section class="band" id="studio">
  <div class="shell">
    <div class="shead"><div><p class="eyebrow"><span><?= $hm['who_eyebrow'] ?></span></p><h2><?= $hm['who_h2'] ?></h2></div></div>
    <div class="dirs">
      <div class="dir">
        <div class="dir__img"><img src="/assets/images/Javier1.jpg" alt="Javier — <?= e(strip_tags(html_entity_decode($hm['who_1role']))) ?>" loading="lazy"></div>
        <div class="dir__txt">
          <p class="dir__top"><span>DIR_01</span><span>FIG.01 — BUILD</span></p>
          <h3>Javier</h3>
          <p class="dir__role"><?= $hm['who_1role'] ?></p>
          <p><?= $hm['who_1p'] ?></p>
        </div>
      </div>
      <div class="dir">
        <div class="dir__img"><img src="/assets/images/Andrea2.jpg" alt="Andrea — <?= e(strip_tags(html_entity_decode($hm['who_2role']))) ?>" loading="lazy"></div>
        <div class="dir__txt">
          <p class="dir__top"><span>DIR_02</span><span>FIG.02 — DESIGN</span></p>
          <h3>Andrea</h3>
          <p class="dir__role"><?= $hm['who_2role'] ?></p>
          <p><?= $hm['who_2p'] ?></p>
        </div>
      </div>
    </div>
    <p class="lbl deps__t"><?= $hm['deps_t'] ?></p>
    <ul class="deps">
      <?php foreach ($hm['deps'] as $i => $d): ?>
      <li><span class="dim">DEP.0<?= $i+1 ?></span><b><?= $d[0] ?></b><span class="dim"><?= $d[1] ?></span></li>
      <?php endforeach; ?>
    </ul>
    <p class="deps__note"><?= $hm['deps_note'] ?></p>
  </div>
</section>

</main>

<!-- 07 · ALTA DE PROYECTO — Ink invertido. Sin backend a propósito: el buzón
     aún no está confirmado como receptor (AXW-2) y un endpoint de correo pasa
     por Seguridad. El formulario compone un mailto con el asunto de la página
     (la bandeja es el informe de atribución mientras no haya analítica). -->
<section class="contact" id="contact">
  <div class="shell">
    <div class="shead shead--inv">
      <div><p class="eyebrow"><span><?= $hm['ct_eyebrow'] ?></span></p><h2><?= $hm['ct_h2'] ?></h2></div>
      <p class="shead__aside"><?= $hm['ct_lead'] ?></p>
    </div>
    <div class="contact__grid">
      <form class="intake" id="intake" data-to="<?= EMAIL ?>" data-subject="<?= e($hm['asunto']) ?>"
            data-l-name="<?= e($hm['m_name']) ?>" data-l-company="<?= e($hm['m_company']) ?>" data-l-brief="<?= e($hm['m_brief']) ?>">
        <div class="intake__row">
          <label class="field"><span class="field__l"><?= $hm['f_name'] ?> <i><?= $hm['f_req'] ?></i></span><input name="name" type="text" required autocomplete="name"></label>
          <label class="field"><span class="field__l"><?= $hm['f_company'] ?> <i><?= $hm['f_opt'] ?></i></span><input name="company" type="text" autocomplete="organization"></label>
        </div>
        <label class="field"><span class="field__l"><?= $hm['f_brief'] ?> <i><?= $hm['f_req'] ?></i></span><textarea name="brief" rows="4" required placeholder="<?= e($hm['f_brief_ph']) ?>"></textarea></label>
        <div class="intake__act">
          <button type="submit" class="btn btn--signal"><span><?= $hm['f_send'] ?></span> <span class="ar" aria-hidden="true">→</span></button>
          <p class="intake__note"><?= $hm['f_note'] ?> <a href="<?= e(correo($hm['asunto'])) ?>"><?= EMAIL ?></a></p>
        </div>
      </form>
      <dl class="contact__meta">
        <div><dt><?= $hm['ct_email_l'] ?></dt><dd><a href="<?= e(correo($hm['asunto'])) ?>"><?= EMAIL ?></a></dd></div>
        <div><dt><?= $hm['ct_based_l'] ?></dt><dd><?= $hm['ct_based_v'] ?></dd></div>
        <div><dt><?= $hm['ct_lang_l'] ?></dt><dd>English / Español</dd></div>
      </dl>
    </div>
  </div>
</section>

<?php require __DIR__ . '/footer.php'; ?>

<script src="/assets/home.js?v=<?= VER ?>" defer></script>
</body>
</html>
