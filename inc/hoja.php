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
  <?php /* Rediseño 24-sep-2026 (owner: «muy pobre el diseño… quita las fotos»).
     La hoja habla ya el lenguaje de la portada: bandas con filete, cabecera con
     barra de datos, y el caso real como PANEL con la forma de la herramienta de
     Lawang (datos de ejemplo), no como una captura en gris. */
  $C = $H['caso'] ?? null; $P = $H['panel'] ?? null; ?>
  <section class="hj-head">
    <div class="shell hj-head__grid">
      <div class="hj-head__col">
        <p class="hj-chip"><i></i><?= $H['eyebrow'] ?></p>
        <h1><?= $H['h1'] ?></h1>
        <p class="hj-lead"><?= $H['lead'] ?></p>
        <?php if ($C): ?>
        <div class="hj-data">
          <?php foreach ($C['cifras'] as $i => $c): ?>
          <div><b<?= $i === 0 ? ' class="acc"' : '' ?>><?= $c[0] ?></b><span><?= $c[1] ?></span></div>
          <?php endforeach; ?>
        </div>
        <?php endif; ?>
        <div class="hj-acts">
          <a href="<?= e(correo($H['asunto'])) ?>" class="btn btn--signal btn--sm"><span><?= $t['nav_cta'] ?></span> <span class="ar" aria-hidden="true">→</span></a>
          <?php if ($P): ?><a href="#campo" class="btn btn--term btn--sm">[ <?= $t['hj_case_btn'] ?> ]</a><?php endif; ?>
        </div>
      </div>
      <aside class="hj-side">
        <div class="tblock">
          <svg class="tblock__x" viewBox="0 0 24 24" aria-hidden="true"><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>
          <div class="tblock__row"><span><?= $t['sheet'] ?></span><b><?= $H['codigo'] ?></b></div>
          <?php if ($H['eje']): ?><div class="tblock__row"><span><?= $t['axis'] ?></span><b>✕ <?= $H['eje'] ?></b></div><?php endif; ?>
          <div class="tblock__row"><span><?= $t['rev'] ?></span><b>2026-09</b></div>
          <div class="tblock__row"><span><?= $t['lang_l'] ?></span><b><?= par($url) ? 'EN / ES' : strtoupper($lang) ?></b></div>
        </div>
        <?php if (!empty($H['regla'])): ?>
        <div class="hj-rule">
          <p class="hj-rule__l"><?= $t['hj_principle'] ?></p>
          <p class="hj-rule__t"><?= $H['regla'] ?></p>
        </div>
        <?php endif; ?>
      </aside>
    </div>
  </section>

  <section class="hj-band">
    <div class="shell hj-split">
      <p class="hj-eyebrow">01 // <?= $t['spec'] ?></p>
      <div class="prosa"><?php foreach ($H['spec'] as $p) echo "<p>$p</p>\n"; ?></div>
    </div>
  </section>

  <?php if ($C): ?>
  <section class="hj-band" id="campo">
    <div class="shell">
      <div class="hj-shead">
        <div><p class="hj-eyebrow">02 // <?= $t['case'] ?></p><h2><?= $C['titulo'] ?></h2></div>
        <?php if ($P): ?><p class="hj-shead__aside"><?= $t['hj_sample_note'] ?></p><?php endif; ?>
      </div>
      <?php if ($P): ?>
      <div class="hj-panel">
        <div class="hj-panel__bar">
          <span class="hj-panel__name"><i></i><?= $P['tool'] ?></span>
          <span class="pill pill--ink"><?= $t['hj_sample'] ?></span>
        </div>
        <div class="hj-panel__main">
          <div class="hj-panel__tbl tbl-wrap">
            <table class="tbl">
              <thead><tr><?php foreach ($P['th'] as $i => $th): ?><th<?= $i === count($P['th'])-1 ? ' class="r"' : '' ?>><?= $th ?></th><?php endforeach; ?></tr></thead>
              <tbody>
              <?php foreach ($P['rows'] as $r):
                $alerta = array_pop($r); $n = count($r); ?>
                <tr><?php foreach ($r as $i => $v):
                  if ($i === 0)            echo '<td class="dim">' . $v . '</td>';
                  elseif ($i === 1)        echo '<td><b>' . $v . '</b></td>';
                  elseif ($i === $n - 1)   echo '<td class="r' . ($alerta ? ' due' : '') . '">' . $v . '</td>';
                  elseif ($i === $n - 2)   echo '<td><span class="tag">' . $v . '</span></td>';
                  else                     echo '<td class="dim">' . $v . '</td>';
                endforeach; ?></tr>
              <?php endforeach; ?>
              </tbody>
            </table>
          </div>
          <div class="hj-panel__side">
            <p class="lbl"><?= $t['hj_live'] ?></p>
            <p class="hj-panel__txt"><?= $C['texto'] ?></p>
          </div>
        </div>
        <?php if (!empty($H['modulos'])): ?>
        <div class="hj-panel__mods">
          <p class="lbl"><?= $t['hj_modules'] ?> · <?= count($H['modulos']) ?></p>
          <ul><?php foreach ($H['modulos'] as $m): ?><li><?= $m ?></li><?php endforeach; ?></ul>
        </div>
        <?php endif; ?>
      </div>
      <?php else: ?>
      <div class="hj-caso"><p><?= $C['texto'] ?></p></div>
      <?php endif; ?>
    </div>
  </section>
  <?php endif; ?>

  <?php if (!empty($H['flujo'])): ?>
  <section class="hj-band hj-band--ink">
    <div class="shell">
      <div class="hj-shead hj-shead--inv"><div><p class="hj-eyebrow">03 // <?= $t['hj_flow'] ?></p></div></div>
      <ol class="hj-flow" style="--n:<?= count($H['flujo']) ?>">
        <?php foreach ($H['flujo'] as $i => $f): ?>
        <li><span class="hj-flow__n"><?= sprintf('%02d', $i+1) ?></span><b><?= $f[0] ?></b><span class="hj-flow__d"><?= $f[1] ?></span></li>
        <?php endforeach; ?>
      </ol>
    </div>
  </section>
  <?php endif; ?>

  <section class="hj-band">
    <div class="shell">
      <div class="hj-shead"><div><p class="hj-eyebrow">04 // <?= $t['scope'] ?></p></div></div>
      <div class="tbl-wrap tbl-wrap--box">
        <table class="tbl hj-scope">
          <thead><tr><?php foreach ($t['hj_scope_th'] as $th): ?><th><?= $th ?></th><?php endforeach; ?></tr></thead>
          <tbody>
          <?php foreach ($H['scope'] as $i => $r): ?>
            <tr><td class="cod"><?= sprintf('%02d', $i+1) ?></td><td class="nom"><?= $r[0] ?></td><td class="val"><?= $r[1] ?></td></tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section class="hj-band">
    <div class="shell hj-split">
      <p class="hj-eyebrow">05 // <?= $t['faq'] ?></p>
      <div class="faq">
        <?php foreach ($H['faq'] as $f): ?>
        <details><summary><?= $f[0] ?></summary><div class="faq__a"><?= $f[1] ?></div></details>
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
  <section class="cta" id="contact">
    <div class="shell">
      <p class="eyebrow"><?= $t['nav_cta'] ?></p>
      <h2 style="margin-top:18px"><?= $t['cta_h'] ?></h2>
      <p><?= $t['cta_p'] ?></p>
      <div class="cta__row">
        <?php /* El asunto lleva la página de origen: sin esto llega un correo
                 y no hay forma de saber qué hoja trae clientes y cuál no. */ ?>
        <a href="<?= e(correo($H['asunto'])) ?>" class="btn btn--signal"><span><?= EMAIL ?></span> <span class="ar" aria-hidden="true">→</span></a>
        <a href="<?= $hub ?>" class="btn btn--ghost-d"><span><?= $t['index'] ?></span></a>
      </div>
      <div class="cta__meta">
        <div>EMAIL<b><?= EMAIL ?></b></div>
        <div><?= $lang === 'es' ? 'IDIOMAS' : 'LANGUAGES' ?><b><?= $t['langs'] ?></b></div>
      </div>
    </div>
  </section>

</main>
<?php require __DIR__ . '/footer.php'; ?>
</body>
</html>
