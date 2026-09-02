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
</head>
<body>
<div class="reticle" aria-hidden="true"><div class="reticle__inner"><span></span><span></span><span></span><span></span><span></span></div></div>
<?php require __DIR__ . '/nav.php'; ?>

<main class="hoja">

  <div class="hoja__head shell">
    <div class="hoja__grid">
      <div>
        <p class="eyebrow"><?= $H['eyebrow'] ?></p>
        <h1><?= $H['h1'] ?></h1>
        <p class="lead"><?= $H['lead'] ?></p>
      </div>
      <aside class="tblock">
        <svg class="tblock__x" viewBox="0 0 24 24" aria-hidden="true"><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>
        <div class="tblock__row"><span><?= $t['sheet'] ?></span><b><?= $H['codigo'] ?></b></div>
        <?php if ($H['eje']): ?><div class="tblock__row"><span><?= $t['axis'] ?></span><b>✕ <?= $H['eje'] ?></b></div><?php endif; ?>
        <div class="tblock__row"><span><?= $t['rev'] ?></span><b>2026-09</b></div>
        <div class="tblock__row"><span><?= $t['lang_l'] ?></span><b><?= par($url) ? 'EN / ES' : strtoupper($lang) ?></b></div>
      </aside>
    </div>
  </div>

  <div class="shell hoja__body">

    <section>
      <div class="sec-head"><p class="eyebrow"><?= $t['spec'] ?></p></div>
      <div class="prosa"><?php foreach ($H['spec'] as $p) echo "<p>$p</p>\n"; ?></div>
    </section>

    <section>
      <div class="sec-head"><p class="eyebrow"><?= $t['scope'] ?></p></div>
      <div class="spec">
        <?php foreach ($H['scope'] as $r): ?>
        <div class="spec__row"><div class="spec__k"><?= $r[0] ?></div><div class="spec__v"><?= $r[1] ?></div></div>
        <?php endforeach; ?>
      </div>
    </section>

    <section>
      <div class="sec-head"><p class="eyebrow"><?= $t['case'] ?></p></div>
      <div class="caso">
        <div class="caso__media"><img src="/assets/images/<?= e($H['caso']['img']) ?>" alt="<?= e($H['caso']['alt']) ?>" loading="lazy" width="1200" height="582"></div>
        <div>
          <h3><?= $H['caso']['titulo'] ?></h3>
          <p><?= $H['caso']['texto'] ?></p>
          <div class="cifras">
            <?php foreach ($H['caso']['cifras'] as $c): ?>
            <div><b><?= $c[0] ?></b><span><?= $c[1] ?></span></div>
            <?php endforeach; ?>
          </div>
        </div>
      </div>
    </section>

    <section>
      <div class="sec-head"><p class="eyebrow"><?= $t['faq'] ?></p></div>
      <div class="faq">
        <?php foreach ($H['faq'] as $f): ?>
        <details><summary><?= $f[0] ?></summary><div class="faq__a"><?= $f[1] ?></div></details>
        <?php endforeach; ?>
      </div>
    </section>

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
        <div><?= $lang === 'es' ? 'DESDE' : 'BASED' ?><b><?= $t['based'] ?></b></div>
        <div><?= $lang === 'es' ? 'IDIOMAS' : 'LANGUAGES' ?><b><?= $t['langs'] ?></b></div>
      </div>
    </div>
  </section>

</main>
<?php require __DIR__ . '/footer.php'; ?>
</body>
</html>
