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
 *   · Work (capturas de proyectos) retirado por el owner el 24-sep-2026.
 * Los IDs de ancla (#services #process #studio #contact) no cambian:
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

?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
<link rel="stylesheet" href="/assets/home.css?v=<?= VER ?>">
</head>
<body class="home">

<?php require __DIR__ . '/nav.php'; ?>

<main id="top">

<!-- 01 · HERO — calco del mockup de Stitch (2.ª pasada, 24-sep, a petición del
     owner: «alta fidelidad, sobre todo el hero»). La ✕ convergente se retira; el
     instrumento es la retícula CAD giratoria del mockup. -->
<section class="band hero" id="hero">
  <span class="tele tele--tl" aria-hidden="true">COORD: [X <b id="cx">000</b> ✕ Y <b id="cy">000</b>] // GRID: REF-00</span>
  <span class="tele tele--tr" aria-hidden="true">DATUM: AW-01 // TOL: ±0.0001MM</span>
  <div class="shell hero__grid">
    <div class="hero__col">
      <div class="hero__top">
        <p class="chip"><i></i><?= $hm['hero_chip'] ?><span class="chip__based"> <span class="sep">//</span> <?= $t['based'] ?></span></p>
        <h1><?= $hm['hero_h1'] ?></h1>
        <p class="hero__lead"><?= $hm['hero_lead'] ?></p>
      </div>
      <div class="hero__bottom">
        <div class="hero__data">
          <div><span><?= $hm['m1_k'] ?></span><b><?= $hm['m1_v'] ?></b></div>
          <div><span><?= $hm['m2_k'] ?></span><b class="acc"><?= $hm['m2_v'] ?></b></div>
          <div><span><?= $hm['m3_k'] ?></span><b><?= $hm['m3_v'] ?></b></div>
        </div>
        <div class="hero__acts">
          <a href="#contact" class="btn btn--signal btn--sm"><span><?= $hm['hero_cta'] ?></span> <span class="ar" aria-hidden="true">→</span></a>
          <a href="#erp" class="btn btn--term btn--sm">[ <?= $hm['hero_cta2'] ?> ]</a>
          <span class="hero__sheet">SHEET ID: AW-01-HERO</span>
        </div>
      </div>
    </div>

    <div class="instr" aria-hidden="true">
      <div class="instr__bar"><span><?= $hm['instr'] ?></span><span class="instr__st"><?= $hm['instr_al'] ?></span></div>
      <div class="instr__field">
        <svg class="instr__ring" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="90" stroke-dasharray="2 4" stroke-width="1"/>
          <circle cx="100" cy="100" r="70" stroke-width=".75"/>
          <circle cx="100" cy="100" r="50" stroke-dasharray="8 4" stroke-width=".5"/>
          <line x1="100" y1="0" x2="100" y2="200" stroke-width=".75"/>
          <line x1="0" y1="100" x2="200" y2="100" stroke-width=".75"/>
          <path d="M100 15 L105 25 L95 25 Z"/><path d="M185 100 L175 105 L175 95 Z"/>
          <path d="M100 185 L95 175 L105 175 Z"/><path d="M15 100 L25 95 L25 105 Z"/>
        </svg>
        <div class="instr__core"><span class="instr__plus">+</span><span class="instr__fix">0,0 // FIXED</span></div>
        <span class="card card--n">000° N</span><span class="card card--e">090° E</span>
        <span class="card card--s">180° S</span><span class="card card--w">270° W</span>
      </div>
      <div class="instr__foot"><span><?= $hm['instr_mode'] ?></span><span class="pill pill--acc"><?= $hm['instr_status'] ?></span></div>
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

<!-- 05 · PROCESO — cuatro fases. Las ✕ de los nodos van en Steel: la única ✕
     Signal de la página es la del instrumento. -->
<section class="band" id="process">
  <div class="shell">
    <div class="shead"><div><p class="eyebrow"><span><?= $hm['proc_eyebrow'] ?></span></p><h2><?= $hm['proc_h2'] ?></h2></div></div>
    <ol class="proc">
      <?php foreach ($hm['proc'] as $i => $f): ?>
      <li class="proc__step">
        <div class="proc__top"><span><?= $hm['proc_phase'] ?>_0<?= $i+1 ?></span><span class="x-acc" aria-hidden="true">✕</span></div>
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
        <p class="dir__top"><span>DIR_NODE_01</span><span>BUILD</span></p>
        <h3>Javier</h3>
        <p class="dir__role"><?= $hm['who_1role'] ?></p>
        <p class="dir__p"><?= $hm['who_1p'] ?></p>
      </div>
      <div class="dir">
        <p class="dir__top"><span>DIR_NODE_02</span><span>DESIGN</span></p>
        <h3>Andrea</h3>
        <p class="dir__role"><?= $hm['who_2role'] ?></p>
        <p class="dir__p"><?= $hm['who_2p'] ?></p>
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
  <div class="contact__in">
    <div class="shead shead--inv">
      <div><p class="eyebrow"><span><?= $hm['ct_eyebrow'] ?></span></p><h2><?= $hm['ct_h2'] ?></h2></div>
      <p class="contact__tag">DIRECT DISPATCH // EN · ES</p>
    </div>
    <form class="intake" id="intake" data-to="<?= EMAIL ?>" data-subject="<?= e($hm['asunto']) ?>"
          data-l-name="<?= e($hm['m_name']) ?>" data-l-email="<?= e($hm['m_email']) ?>" data-l-brief="<?= e($hm['m_brief']) ?>">
      <div class="intake__row">
        <label class="field"><span class="field__l"><?= $hm['f_name'] ?> <i><?= $hm['f_req'] ?></i></span><input name="name" type="text" required autocomplete="name"></label>
        <label class="field"><span class="field__l"><?= $hm['f_email'] ?> <i><?= $hm['f_req'] ?></i></span><input name="email" type="email" required autocomplete="email"></label>
      </div>
      <label class="field"><span class="field__l"><?= $hm['f_brief'] ?> <i><?= $hm['f_spec'] ?></i></span><textarea name="brief" rows="3" required placeholder="<?= e($hm['f_brief_ph']) ?>"></textarea></label>
      <div class="intake__act">
        <button type="submit" class="btn btn--signal btn--sm"><span><?= $hm['f_send'] ?></span> <span class="ar" aria-hidden="true">→</span></button>
        <p class="intake__note"><?= $hm['f_note'] ?> <a href="<?= e(correo($hm['asunto'])) ?>"><?= EMAIL ?></a></p>
      </div>
    </form>
  </div>
</section>

<?php require __DIR__ . '/footer.php'; ?>

<script src="/assets/home.js?v=<?= VER ?>" defer></script>
</body>
</html>
