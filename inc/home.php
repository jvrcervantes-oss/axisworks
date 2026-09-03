<?php
/* home.php — la portada, la MISMA para `/` y para `/es/`.
 *
 * Concepto intacto ("The Living Blueprint", hero v9): la ✕ como instrumento
 * de medida cuyas dos líneas convergen con el cursor. Lo único que cambia
 * aquí es la sección de Servicios, que pasa de 5 viñetas a los 11 productos
 * reales — y lo hace SIN meterlos dentro de los paneles.
 *
 * Por qué no dentro: los dos paneles están posicionados en absoluto y la ✕
 * del cruce está clavada en `top:180px; left:60%` porque ahí se cruzan de
 * verdad sus dos bordes. Un panel con siete viñetas revienta esa geometría
 * y la ✕ deja de ser el cruce para pasar a ser una pegatina. Un plano
 * técnico tampoco lista las piezas dentro del dibujo: las lista en su
 * cuadro de piezas. Eso es la leyenda de abajo. (Diseño, 2-sep-2026.)
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

/* El `makesOffer` sale del MISMO array que pinta la leyenda. Antes eran cinco
 * escritos a mano; declararle a Google un catálogo que no coincide con el de
 * la página es la versión SEO del dato que vive en dos sitios. */
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
<body>

<div id="loader">
  <svg class="loader__x" viewBox="0 0 54 54"><line x1="8" y1="8" x2="46" y2="46"/><line x1="46" y1="8" x2="8" y2="46"/></svg>
  <div class="loader__read" id="loaderRead">CALIBRATING — 00%</div>
</div>

<div class="reticle" id="reticle" aria-hidden="true"><div class="reticle__inner"><span></span><span></span><span></span><span></span><span></span></div></div>
<canvas id="cad" aria-hidden="true"></canvas>
<div class="axis" aria-hidden="true"><div class="axis__fill" id="axisFill"></div><div class="axis__node" id="axisNode"></div></div>
<div class="hud hud--coords" aria-hidden="true">X <b id="cx">000</b> &nbsp; Y <b id="cy">000</b></div>
<div class="hud hud--meta" aria-hidden="true"><span><?= $hm['hud'] ?></span></div>

<?php require __DIR__ . '/nav.php'; ?>

<main id="top">

<!-- HERO — una pantalla. La ✕ es el instrumento: sus dos trazos convergen con el cursor. -->
<section class="hero" id="hero">
  <div class="hero__body">
    <div class="hero__col">
    <p class="eyebrow"><span><?= $hm['hero_kind'] ?></span> <span class="x">✕</span> <span><?= $hm['hero_eyebrow'] ?></span></p>
    <h1><?= $hm['hero_h1a'] ?> <?= $hm['hero_h1b'] ?> <span class="x">✕</span> <?= $hm['hero_h1c'] ?>.</h1>
    <p class="hero__lead"><?= $hm['hero_lead'] ?></p>
    <div class="hero__acts">
      <a href="#contact" class="btn btn--signal"><span><?= $hm['hero_cta'] ?></span> <span class="ar" aria-hidden="true">→</span></a>
      <a href="<?= $hub ?>" class="btn btn--ghost-d"><span><?= $hm['hero_cta2'] ?></span> <span class="ar" aria-hidden="true">→</span></a>
    </div>
    </div>

    <div class="hero__instr" aria-hidden="true">
      <div class="hero__frame">
        <div class="hero__mark" id="heroMark">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <!-- m2 primero: en SVG el orden del marcado es el orden de capas, y en el
                 cruce la línea de medida (Steel) tapaba al acento. -->
            <line class="m2" x1="92" y1="8" x2="8" y2="92"/>
            <line class="m1" x1="8" y1="8" x2="92" y2="92"/>
          </svg>
        </div>
        <p class="hero__read"><span class="hero__state"><i></i><span class="st-cal"><?= $hm['hero_st_cal'] ?></span><span class="st-ok"><?= $hm['hero_st_ok'] ?></span></span></p>
      </div>
    </div>
  </div>
</section>

<!-- SERVICES — el cruce, y debajo el cuadro de piezas -->
<section id="services">
  <div class="shell sec-head rv">
    <p class="eyebrow"><span><?= $hm['svc_eyebrow'] ?></span></p>
    <h2><?= $hm['svc_h2'] ?></h2>
    <span class="measure" aria-hidden="true"><i></i></span>
  </div>
  <div class="shell">
    <div class="cross rv">
      <div class="panel panel--build">
        <p class="eyebrow" style="color:var(--steel)"><span><?= $hm['svc_build_tag'] ?></span></p>
        <div class="panel-tag"><?= $hm['svc_build_h'] ?></div>
        <p><?= $hm['svc_build_p'] ?></p>
        <p class="panel__n">B / 07</p>
      </div>
      <div class="panel panel--brand">
        <p class="eyebrow"><span><?= $hm['svc_brand_tag'] ?></span></p>
        <div class="panel-tag"><?= $hm['svc_brand_h'] ?></div>
        <p><?= $hm['svc_brand_p'] ?></p>
        <p class="panel__n">G / 03</p>
      </div>
      <div class="cross__mark" aria-hidden="true">
        <svg viewBox="0 0 64 64"><g stroke="#E2581C" stroke-width="4" stroke-linecap="square"><line x1="14" y1="14" x2="50" y2="50"/><line x1="50" y1="14" x2="14" y2="50"/></g></svg>
      </div>
    </div>

    <!-- El advisory no es una viñeta de ninguno de los dos lados: atraviesa a los dos. -->
    <div class="advisory rv">
      <p class="eyebrow"><span><?= $hm['svc_adv_tag'] ?></span></p>
      <div class="advisory__body">
        <h3><?= $hm['svc_adv_h'] ?></h3>
        <p><?= $hm['svc_adv_p'] ?></p>
      </div>
    </div>

    <!-- EL CUADRO DE PIEZAS. Los códigos no numeran servicios (el brief lo
         prohíbe): no son un orden de lectura, son número de plano. -->
    <div class="leyenda rv">
      <p class="eyebrow" style="margin:26px 0 6px"><span><?= $hm['svc_leyenda'] ?></span></p>
      <div class="leyenda__grid">
        <?php foreach ($PRODUCTOS as $p):
          $nombre = $lang === 'es' ? $p[3] : $p[2];
          $destino = $p[$col]; ?>
          <?php if ($destino): ?>
          <a class="leyenda__row" href="<?= e($destino) ?>"><span class="cod"><?= $p[0] ?></span><span class="nom"><?= $nombre ?></span><span class="ar" aria-hidden="true">→</span></a>
          <?php else: ?>
          <div class="leyenda__row leyenda__row--flat"><span class="cod"><?= $p[0] ?></span><span class="nom"><?= $nombre ?></span></div>
          <?php endif; ?>
        <?php endforeach; ?>
      </div>
    </div>

    <p class="svc__ask rv">
      <span><?= $hm['svc_ask'] ?></span>
      <a href="#contact" class="btn btn--ghost"><span><?= $hm['svc_ask_cta'] ?></span> <span class="ar" aria-hidden="true">→</span></a>
    </p>
  </div>
</section>

<!-- WORK -->
<section id="work">
  <div class="shell sec-head rv">
    <p class="eyebrow"><span><?= $hm['work_eyebrow'] ?></span></p>
    <h2><?= $hm['work_h2'] ?></h2>
    <span class="measure" aria-hidden="true"><i></i></span>
  </div>
  <div class="shell work__grid">
    <div class="tcard rv rv-card">
      <a class="tcard__inner" href="https://balimotoadventures.com" target="_blank" rel="noopener" aria-label="Bali Moto Adventures">
        <div class="tcard__media"><img src="/assets/images/work-balimoto.jpg" alt="Bali Moto Adventures website" loading="lazy" width="1200" height="582"></div>
        <span class="tcard__go" aria-hidden="true">↗</span>
        <div class="tcard__chip">
          <div class="tcard__tag">01 / <span><?= $hm['tag_1'] ?></span></div>
          <div class="tcard__name">Bali Moto Adventures</div>
        </div>
      </a>
    </div>
    <div class="tcard rv rv-card">
      <div class="tcard__inner tcard--nolink">
        <div class="tcard__media"><img src="/assets/images/work-lawang.jpg" alt="Lawang Estate website" loading="lazy" width="1200" height="608"></div>
        <div class="tcard__chip">
          <div class="tcard__tag">02 / <span><?= $hm['tag_2'] ?></span></div>
          <div class="tcard__name">Lawang Estate</div>
        </div>
      </div>
    </div>
    <div class="tcard rv rv-card">
      <a class="tcard__inner" href="https://sumba.balibestmotorcycle.com" target="_blank" rel="noopener" aria-label="Sumba Rental Motorbike">
        <div class="tcard__media"><img src="/assets/images/work-sumba.jpg" alt="Sumba Rental Motorbike website" loading="lazy" width="1200" height="590"></div>
        <span class="tcard__go" aria-hidden="true">↗</span>
        <div class="tcard__chip">
          <div class="tcard__tag">03 / <span><?= $hm['tag_3'] ?></span></div>
          <div class="tcard__name">Sumba Rental Motorbike</div>
        </div>
      </a>
    </div>
    <div class="tcard rv rv-card">
      <div class="tcard__inner tcard--nolink">
        <div class="tcard__media"><img src="/assets/images/work-ids.jpg" alt="IDS Fincas client portal" loading="lazy" width="1200" height="795"></div>
        <div class="tcard__chip">
          <div class="tcard__tag">04 / <span><?= $hm['tag_4'] ?></span></div>
          <div class="tcard__name">IDS Fincas</div>
        </div>
      </div>
    </div>
    <div class="tcard rv rv-card">
      <div class="tcard__inner tcard--nolink">
        <div class="tcard__media"><img src="/assets/images/work-burger.jpg" alt="Carbón burger website" loading="lazy" width="1200" height="730"></div>
        <div class="tcard__chip">
          <div class="tcard__tag">05 / <span><?= $hm['tag_5'] ?></span></div>
          <div class="tcard__name">Carbón</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- PROCESS -->
<section id="process">
  <div class="shell sec-head rv">
    <p class="eyebrow"><span><?= $hm['proc_eyebrow'] ?></span></p>
    <h2><?= $hm['proc_h2'] ?></h2>
    <span class="measure" aria-hidden="true"><i></i></span>
  </div>
  <div class="shell">
    <div class="proc__track rv">
      <div class="proc__line"><i id="procFill"></i></div>
      <?php for ($n = 1; $n <= 4; $n++): ?>
      <div class="step"><span class="step__node"></span><div class="num">0<?= $n ?></div><h3><?= $hm["proc_{$n}h"] ?></h3><p><?= $hm["proc_{$n}p"] ?></p></div>
      <?php endfor; ?>
    </div>
  </div>
</section>

<!-- STUDIO -->
<section id="studio">
  <div class="shell sec-head rv">
    <p class="eyebrow"><span><?= $hm['who_eyebrow'] ?></span></p>
    <h2><?= $hm['who_h2'] ?></h2>
    <span class="measure" aria-hidden="true"><i></i></span>
  </div>
  <div class="shell who__grid rv">
    <div class="person">
      <div class="person__portrait">
        <img src="/assets/images/Javier1.jpg" alt="Javier — development" loading="lazy">
        <span class="mono-x">✕</span><span>FIG.01 — BUILD</span>
      </div>
      <div class="person__role"><?= $hm['who_1role'] ?></div>
      <h3>Javier</h3>
      <p><?= $hm['who_1p'] ?></p>
    </div>
    <div class="who__x" aria-hidden="true"><svg viewBox="0 0 64 64"><g stroke="#9AA0A8" stroke-width="4" stroke-linecap="square"><line x1="14" y1="14" x2="50" y2="50"/><line x1="50" y1="14" x2="14" y2="50"/></g></svg></div>
    <div class="person">
      <div class="person__portrait">
        <img src="/assets/images/Andrea2.jpg" alt="Andrea — design, content and social" loading="lazy">
        <span class="mono-x">✕</span><span>FIG.02 — BRAND</span>
      </div>
      <div class="person__role"><?= $hm['who_2role'] ?></div>
      <h3>Andrea</h3>
      <p><?= $hm['who_2p'] ?></p>
    </div>
  </div>
</section>

</main>

<!-- CONTACT -->
<section class="contact" id="contact">
  <div class="shell contact__grid">
    <div class="contact__col">
      <p class="eyebrow rv">06 — <span><?= $hm['ct_eyebrow'] ?></span></p>
      <h2 class="rv" style="margin-top:18px"><?= $hm['ct_h2'] ?></h2>
      <p class="lead rv" style="color:var(--steel);margin-top:18px"><?= $hm['ct_lead'] ?></p>
      <div class="contact__row rv">
        <?php /* Aquí había un segundo botón «WhatsApp» cuyo href era `https://wa.me/`
                 SIN número, parcheado por JS a un mailto. El HTML crudo que parsea un
                 crawler llevaba el placeholder, y nada con placeholders sale del
                 estudio. Vuelve el día que haya número (AXW-1). */ ?>
        <a href="<?= e(correo($hm['asunto'])) ?>" class="btn btn--signal"><span><?= EMAIL ?></span> <span class="ar">→</span></a>
        <a href="<?= $hub ?>" class="btn btn--ghost-d"><span><?= $t['index'] ?></span></a>
      </div>
      <div class="contact__meta rv">
        <div><span><?= $hm['ct_email_l'] ?></span><b><?= EMAIL ?></b></div>
        <div><span><?= $hm['ct_based_l'] ?></span><b><span><?= $hm['ct_based_v'] ?></span></b></div>
        <div><span><?= $hm['ct_lang_l'] ?></span><b>English / Español</b></div>
      </div>
    </div>
    <div class="contact__origin rv" aria-hidden="true">
      <div class="origin" id="origin">
        <i class="origin__corner tl"></i><i class="origin__corner tr"></i>
        <i class="origin__corner bl"></i><i class="origin__corner br"></i>
        <span class="origin__rule origin__rule--h"></span>
        <span class="origin__rule origin__rule--v"></span>
        <span class="origin__ping"></span>
        <svg class="origin__x" viewBox="0 0 64 64"><g><line x1="16" y1="16" x2="48" y2="48"/><line x1="48" y1="16" x2="16" y2="48"/></g></svg>
        <div class="origin__label">FIG.06 — <span><?= $hm['ct_origin'] ?></span> · <b id="ostatus">ALIGNED</b></div>
        <div class="origin__read"><span>X <b id="ox">00.00</b></span><span>Y <b id="oy">00.00</b></span></div>
      </div>
    </div>
  </div>
</section>

<?php require __DIR__ . '/footer.php'; ?>

<?php /* SRI obligatoria del departamento: hasta hoy los dos GSAP se cargaban sin
        `integrity` ni `crossorigin`, y el CSP está en Report-Only, así que no lo
        tapaba. Hashes calculados contra el fichero servido por cdnjs. */ ?>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
        integrity="sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt"
        crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"
        integrity="sha384-Z3REaz79l2IaAZqJsSABtTbhjgOUYyV3p90XNnAPCSHg3EMTz1fouunq9WZRtj3d"
        crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script src="/assets/home.js?v=<?= VER ?>"></script>
</body>
</html>
