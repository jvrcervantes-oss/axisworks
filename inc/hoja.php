<?php
/* hoja.php — la plantilla de una página de servicio.
 * Cada página son tres líneas: fija $LANG y $ID y llama aquí. */
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
    'availableLanguage'=>['en','es'],
    'url'=>SITE.$url];
}
?><!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
<?php require __DIR__ . '/head.php'; ?>
<link rel="stylesheet" href="/assets/hoja.css?v=<?= VER ?>">
</head>
<body>
<?php require __DIR__ . '/nav.php'; ?>

<main class="hj">
  <?php /* v3 (24-sep-2026): composición de la página del ERP de Stitch
     (proyecto «AxisWorks Studio Website», pantalla «AxisWorks ERP — Flagship
     Business OS»), sobre nuestros tokens y nuestro texto. De Stitch se tomó la
     PIEL: espacio de trabajo oscuro con barra de módulos, esquema enmarcado,
     directorio en tarjetas, cita centrada, preguntas en tarjetas y cierre en caja.
     No se tomó su texto (latencias, ISO, importes, «Spain × Bali», nombres). */
  $C = $H['caso'] ?? null; $P = $H['panel'] ?? null;
  $chip = $H['chip'] ?? null;
  if (!$chip) foreach ($PRODUCTOS as $p) if ($p[0] === $H['codigo']) $chip = $lang === 'es' ? $p[3] : $p[2];
  $chip = $chip ?: $H['eyebrow'];
  $S = $t['hj_s']; ?>

  <!-- CABECERA -->
  <section class="hj-head">
    <span class="hj-reg hj-reg--tl" aria-hidden="true">+</span><span class="hj-reg hj-reg--tr" aria-hidden="true">+</span>
    <div class="shell">
      <p class="hj-chip"><?= $chip ?></p>
      <h1><?= $H['h1'] ?></h1>
      <p class="hj-lead"><?= $H['lead'] ?></p>
      <?php if ($P): ?><p class="hj-proof"><?= $t['hj_proof'] ?></p><?php endif; ?>
      <div class="hj-acts">
        <a href="<?= e(correo($H['asunto'])) ?>" class="btn btn--signal btn--sm"><span><?= $t['nav_cta'] ?></span> <span class="ar" aria-hidden="true">→</span></a>
        <?php if ($P): ?><a href="#campo" class="btn btn--ghost btn--sm">[ <?= $t['hj_case_btn'] ?> ]</a><?php endif; ?>
      </div>
    </div>
  </section>

  <?php if ($C && $P): ?>
  <!-- 02 · EL ESPACIO DE TRABAJO -->
  <section class="hj-sec hj-sec--tint" id="campo">
    <div class="shell">
      <div class="hj-shead">
        <p class="hj-tag">[<?= $S[1] ?>]</p>
        <h2><?= $C['titulo'] ?></h2>
        <p class="hj-shead__sub"><?= $C['texto'] ?></p>
      </div>
      <div class="ws">
        <div class="ws__bar">
          <span class="ws__name">AXISWORKS <b>//</b> <?= $P['tool'] ?></span>
          <span class="ws__sample"><?= $t['hj_sample'] ?></span>
        </div>
        <div class="ws__body">
          <?php if (!empty($H['modulos'])): ?>
          <aside class="ws__side">
            <p class="ws__lbl"><?= $t['hj_modules'] ?> // <?= count($H['modulos']) ?></p>
            <ul><?php foreach ($H['modulos'] as $i => $m): ?><li<?= $i === 0 ? ' class="on"' : '' ?>><?= $m ?></li><?php endforeach; ?></ul>
          </aside>
          <?php endif; ?>
          <div class="ws__main">
            <?php if (!empty($P['pie'])): ?><p class="ws__alert"><span><?= $t['hj_live'] ?></span><?= $P['pie'] ?></p><?php endif; ?>
            <div class="ws__tbl">
              <table>
                <thead><tr><?php foreach ($P['th'] as $i => $th): ?><th<?= $i === count($P['th'])-1 ? ' class="r"' : '' ?>><?= $th ?></th><?php endforeach; ?></tr></thead>
                <tbody>
                <?php foreach ($P['rows'] as $r):
                  $alerta = array_pop($r); $n = count($r); ?>
                  <tr><?php foreach ($r as $i => $v):
                    if ($i === 0)          echo '<td class="ref">' . $v . '</td>';
                    elseif ($i === 1)      echo '<td class="it">' . $v . '</td>';
                    elseif ($i === $n - 1) echo '<td class="r' . ($alerta ? ' due' : '') . '">' . $v . '</td>';
                    elseif ($i === $n - 2) echo '<td><span class="ws__st">' . $v . '</span></td>';
                    else                   echo '<td class="dm">' . $v . '</td>';
                  endforeach; ?></tr>
                <?php endforeach; ?>
                </tbody>
              </table>
            </div>
            <div class="ws__kpis">
              <?php foreach ($C['cifras'] as $i => $c): ?>
              <div><span><?= $c[1] ?></span><b<?= $i === 0 ? ' class="acc"' : '' ?>><?= $c[0] ?></b></div>
              <?php endforeach; ?>
            </div>
          </div>
        </div>
      </div>
      <p class="hj-note"><?= $t['hj_sample_note'] ?></p>
    </div>
  </section>
  <?php endif; ?>

  <!-- 01 · QUÉ ES + la regla como cita -->
  <section class="hj-sec">
    <div class="shell hj-split">
      <div>
        <p class="hj-tag">[<?= $S[0] ?>]</p>
      </div>
      <div class="prosa">
        <?php $sp = $H['spec']; echo '<p class="hj-first">' . array_shift($sp) . "</p>\n";
        if ($sp): ?><details class="hj-more"><summary><?= $t['hj_more'] ?></summary><?php foreach ($sp as $p) echo "<p>$p</p>\n"; ?></details><?php endif; ?>
      </div>
    </div>
    <?php if (!empty($H['regla'])): ?>
    <div class="shell">
      <figure class="hj-quote">
        <span class="hj-reg hj-reg--tl" aria-hidden="true">+</span><span class="hj-reg hj-reg--tr" aria-hidden="true">+</span>
        <figcaption><?= $t['hj_principle'] ?></figcaption>
        <blockquote>&ldquo;<?= $H['regla'] ?>&rdquo;</blockquote>
        <?php if ($P): ?><p class="hj-quote__bridge"><?= $t['hj_bridge'] ?></p><?php endif; ?>
      </figure>
    </div>
    <?php endif; ?>
  </section>

  <?php if (!empty($H['videos'])): $V = $H['videos']; /* 25-sep-2026: piezas reales hechas por el estudio (hoy solo G03).
     preload="none": los MP4 (~4,5 MB) solo se descargan al darle a reproducir; la portada es un WebP de ~20 KB. */ ?>
  <!-- VÍDEOS -->
  <section class="hj-sec hj-sec--tint" id="videos">
    <div class="shell">
      <div class="hj-shead">
        <p class="hj-tag">[<?= $S[1] ?>]</p>
        <h2><?= $V['titulo'] ?></h2>
        <p class="hj-shead__sub"><?= $V['texto'] ?></p>
      </div>
      <div class="vid-grid">
        <?php foreach ($V['piezas'] as $i => $v): ?>
        <figure class="vid-card">
          <video controls playsinline preload="none" width="720" height="1280"
                 poster="/assets/videos/<?= $v['id'] ?>.webp?v=<?= VER ?>" aria-label="<?= e(strip_tags($v['titulo'])) ?>">
            <source src="/assets/videos/<?= $v['id'] ?>.mp4?v=<?= VER ?>" type="video/mp4">
          </video>
          <figcaption>
            <p class="dir-card__c"><?= $H['codigo'] ?>-V<?= sprintf('%02d', $i+1) ?> // <?= $v['formato'] ?></p>
            <h3><?= $v['titulo'] ?></h3>
            <p><?= $v['texto'] ?></p>
          </figcaption>
        </figure>
        <?php endforeach; ?>
      </div>
      <?php if (!empty($V['nota'])): ?><p class="hj-note"><?= $V['nota'] ?></p><?php endif; ?>
    </div>
  </section>
  <?php endif; ?>

  <?php if (!empty($H['flujo'])): ?>
  <!-- 03 · FLUJO, como esquema enmarcado -->
  <section class="hj-sec hj-sec--tint">
    <div class="shell">
      <div class="hj-shead"><p class="hj-tag">[<?= $S[2] ?>]</p></div>
      <div class="sch">
        <p class="sch__bar"><span><?= strtoupper(strip_tags($chip)) ?> // <?= strtoupper($S[2]) ?></span><span><?= count($H['flujo']) ?> <?= $t['hj_steps'] ?></span></p>
        <ol class="sch__flow" style="--n:<?= count($H['flujo']) ?>">
          <?php foreach ($H['flujo'] as $i => $f): ?>
          <li<?= $i === 0 ? ' class="first"' : '' ?>><span class="sch__n"><?= sprintf('%02d', $i+1) ?></span><b><?= $f[0] ?></b><span class="sch__d"><?= $f[1] ?></span></li>
          <?php endforeach; ?>
        </ol>
      </div>
    </div>
  </section>
  <?php endif; ?>

  <!-- 04 · QUÉ INCLUYE, como directorio de tarjetas -->
  <section class="hj-sec">
    <div class="shell">
      <div class="hj-shead"><p class="hj-tag">[<?= $S[3] ?>]</p></div>
      <div class="dir-grid">
        <?php foreach ($H['scope'] as $i => $r): ?>
        <div class="dir-card"><p class="dir-card__c"><?= $H['codigo'] ?>-<?= sprintf('%02d', $i+1) ?></p><h3><?= $r[0] ?></h3><p><?= $r[1] ?></p></div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>

  <!-- 05 · PREGUNTAS, en tarjetas y con la respuesta a la vista -->
  <section class="hj-sec hj-sec--tint">
    <div class="shell">
      <div class="hj-shead"><p class="hj-tag">[<?= $S[4] ?>]</p></div>
      <div class="faq-grid">
        <?php foreach ($H['faq'] as $i => $f): ?>
        <div class="faq-card"><p class="faq-card__c"><?= sprintf('%02d', $i+1) ?> //</p><h3><?= $f[0] ?></h3><div class="faq-card__a"><?= $f[1] ?></div></div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>

  <div class="shell">
    <nav class="sheetnav">
      <?php if ($prev): ?><a href="<?= e($HOJAS[$lang][$prev]['url']) ?>">← <?= $t['prev'] ?><b><?= $HOJAS[$lang][$prev]['h1'] ?></b></a><?php else: ?><a href="<?= $hub ?>">← <?= $t['index'] ?></a><?php endif; ?>
      <?php if ($next): ?><a class="nx" href="<?= e($HOJAS[$lang][$next]['url']) ?>"><?= $t['next'] ?> →<b><?= $HOJAS[$lang][$next]['h1'] ?></b></a><?php else: ?><a class="nx" href="<?= $hub ?>"><?= $t['index'] ?> →</a><?php endif; ?>
    </nav>
  </div>

  <!-- CIERRE en caja -->
  <?php require __DIR__ . '/herramientas.php'; ?>
  <section class="hj-close" id="contact">
    <span class="hj-reg hj-reg--tl" aria-hidden="true">+</span><span class="hj-reg hj-reg--tr" aria-hidden="true">+</span>
    <div class="shell">
      <div class="hj-close__box">
        <p class="hj-chip hj-chip--c"><?= $t['nav_cta'] ?></p>
        <h2><?= $t['cta_h'] ?></h2>
        <p><?= $t['cta_p'] ?></p>
        <?php $fc_pagina = $url; require __DIR__ . '/form_contacto.php'; ?>
        <p class="hj-close__meta"><span><?= $lang === 'es' ? 'IDIOMAS' : 'LANGUAGES' ?>: <?= $t['langs'] ?></span><a href="<?= $hub ?>"><?= $t['index'] ?> →</a></p>
      </div>
    </div>
  </section>
</main>
<?php require __DIR__ . '/footer.php'; ?>
</body>
</html>
