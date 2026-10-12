<?php
/* x.php — piezas comunes de las páginas del diseño «X marks the work» (owner, 12-oct-2026;
 * encargo 20261012_axisworks_web_nueva_brand_kit). Espera $lang, $url y $XPAGINA (clave de inc/x/t_<página>.php).
 *
 *   x('clave')      texto de la página en su idioma, escapado. Si falta en ES sale el EN y queda apuntado en
 *                   $X_FALTAN (lo mira la prueba: ninguna página ES se publica con huecos).
 *   h(href, clave)  destino real de un enlace de la mesa (la mesa trae «#» y nombres de fichero del lienzo).
 *   xlang_url(lg)   la página par en el otro idioma (mapa único: $PARES de config.php).
 * La cifra de departamentos NO se escribe: {N}, {PALABRA}, {PALABRA_CAP} y {PALABRA_MAY} salen de
 * inc/organigrama.php (GENERADO), como en la portada anterior. */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../landing_textos.php';   /* ERP_URL, AAAS_EN, AAAS_ES */
require_once __DIR__ . '/../organigrama.php';
require_once __DIR__ . '/../herramientas_datos.php';
require_once __DIR__ . '/../catalogo.php';        /* $T: textos del formulario (fc_*) */
require_once __DIR__ . '/../legal_en.php';      /* capa 1 de Legal junto al botón */
require_once __DIR__ . '/../legal_es.php';

$XT = require __DIR__ . '/t_' . basename($XPAGINA) . '.php';
$X_FALTAN = [];
$X_INICIO = $lang === 'es' ? '/es/' : '/';
$X_LEGAL = $lang === 'es'
  ? ['legal_notice' => '/es/aviso-legal', 'privacy' => '/es/privacidad', 'cookies' => '/es/cookies']
  : ['legal_notice' => '/legal-notice', 'privacy' => '/privacy', 'cookies' => '/cookies'];

function xcifra($s) {
  global $ORGANIGRAMA, $lang;
  $p = $ORGANIGRAMA['palabra'][$lang] ?? $ORGANIGRAMA['palabra']['en'];
  return strtr($s, [
    '{N}' => (string) $ORGANIGRAMA['n'],
    '{PALABRA}' => $p,
    '{PALABRA_CAP}' => mb_strtoupper(mb_substr($p, 0, 1, 'UTF-8'), 'UTF-8') . mb_substr($p, 1, null, 'UTF-8'),
    '{PALABRA_MAY}' => mb_strtoupper($p, 'UTF-8'),
  ]);
}

function xt($k) {
  global $XT, $lang, $X_FALTAN;
  if (isset($XT[$lang][$k])) return xcifra($XT[$lang][$k]);
  if ($lang !== 'en') $X_FALTAN[] = $k;
  return xcifra($XT['en'][$k] ?? '');
}

function x($k) { return e(xt($k)); }

function xlang_url($lg) {
  global $lang, $url;
  if ($lg === $lang) return $url;
  return par($url) ?: ($lg === 'en' ? '/' : '/es/');
}

function h($href, $k = '') {
  global $lang, $url, $X_INICIO, $X_LEGAL;
  $en_inicio = ($url === $X_INICIO);
  if (preg_match('/^#(products|activity|studio|tools|contact)$/', $href)) {
    /* #contact: toda página nueva lleva su formulario abajo; el resto de anclas viven en la portada */
    return e(($en_inicio || $href === '#contact') ? $href : $X_INICIO . $href);
  }
  if (preg_match('/^#[a-z][a-z0-9-]*$/', $href)) return e($href);          /* ancla dentro de la propia página */
  if ($href === 'ErpLanding.dc.html') return e(ERP_URL);
  if ($href === 'WebAgents.dc.html') return e($lang === 'es' ? AAAS_ES : AAAS_EN);
  if ($href === 'WebHome.dc.html') return e($X_INICIO);
  if (preg_match('#^https://#', $href)) return e($href);
  if ($href === '#') {
    if (isset($X_LEGAL[$k])) return e($X_LEGAL[$k]);
    switch ($k) {
      case 'a': return e($X_INICIO);                                       /* logotipo */
      case 'es_espanol': return e(xlang_url($lang === 'en' ? 'es' : 'en')); /* menú compacto: el otro idioma */
      case 'work_out_the_hours': return e(ERP_URL . '#roi');                /* la calculadora de horas del ERP (C03) */
      case 'open_the_demo': case 'open_the_erp_demo': return e(ERP_URL);
    }
  }
  trigger_error("h(): enlace sin destino ($href, $k)", E_USER_WARNING);
  return '#';
}

/* El logotipo de una herramienta con el marcado de la mesa (svg 24×24, currentColor). Sin fichero, sin icono. */
function xherr_svg($slug) {
  if (!$slug) return '';
  $f = __DIR__ . '/../../assets/logos/' . basename($slug) . '.svg';
  if (!is_file($f) || !preg_match('/<path[^>]*\sd="([^"]+)"/', (string) file_get_contents($f), $m)) return '';
  return '<svg aria-hidden="true" focusable="false" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="' . e($m[1]) . '"></path></svg>';
}

/* Departamentos de una sección del organigrama: [número, cara, nombre, lema], numerados en el orden del organigrama. */
function xdeps($sec) {
  global $ORGANIGRAMA, $lang;
  $out = [];
  foreach ($ORGANIGRAMA['deps'] as $i => $d) {
    if ($d['seccion'] !== $sec) continue;
    $out[] = [sprintf('%02d', $i + 1), $d['cara'], $d[$lang][0], $d[$lang][1]];
  }
  return $out;
}
