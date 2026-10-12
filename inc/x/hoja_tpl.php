<?php /* Hoja de servicio del diseño «X marks the work» (lienzo del owner, 12-oct-2026), mesa C02, como plantilla de
 * las 24 hojas (encargo 20261012_axisworks_web_nueva_brand_kit, S3; mapeo de Diseño #284). Marcado y estilos de la
 * mesa, sacados el 12-oct; ESTE fichero es la fuente y se edita a mano; los datos de cada hoja salen de hojas_*.php / campo_*.php y YA son HTML (se
 * pintan tal cual, como en la plantilla anterior); solo la cáscara pasa por x() desde inc/x/t_hoja.php.
 * Espera lo que deja inc/hoja.php: $H, $ID, $lang, $url, $hub, $inicio, $prev, $next. */

$P = $H['panel'] ?? null;
$C = $H['caso'] ?? null;
$CRM = in_array($ID, ['custom-crm', 'crm-a-medida'], true);   /* la mesa ES esta hoja: conserva sus H2 y su 05 */

/* Nombre corto de una hoja (miga de pan y anterior/siguiente): el `chip` propio o el nombre del producto. */
$hj_nombre = function ($hoja) use ($PRODUCTOS, $lang) {
  if (!empty($hoja['chip'])) return $hoja['chip'];
  foreach ($PRODUCTOS as $p) if ($p[0] === $hoja['codigo']) return $lang === 'es' ? $p[3] : $p[2];
  return $hoja['eyebrow'];
};

/* H1: tope de tamaño por longitud (Diseño #284) y corte 600/300. Regla del corte: tras la primera «, », «: » o
 * « (»; si no hay, la última palabra (la mesa: «Custom CRM» + «development»). */
$h1 = $H['h1'];
$h1_len = mb_strlen(html_entity_decode(strip_tags($h1), ENT_QUOTES, 'UTF-8'), 'UTF-8');
$h1_tope = $h1_len <= 30 ? 80 : ($h1_len <= 50 ? 64 : 52);
if (preg_match('/^(.+?[,:])\s+(.+)$/u', $h1, $m) || preg_match('/^(.+?)\s+(\(.+)$/u', $h1, $m) || preg_match('/^(.+)\s+(\S+)$/u', $h1, $m)) {
  $h1_a = $m[1]; $h1_b = $m[2];
} else { $h1_a = $h1; $h1_b = ''; }

/* Fondos: alternan blanco / gris de sección en sección (la 05 en azul noche no cuenta), como en la mesa. */
$hj_k = 0;
$hj_fondo = function () use (&$hj_k) { return ($hj_k++ % 2 === 0) ? ' style="background: #FFFFFF"' : ''; };
$hj_n = 0;
$hj_rotulo = function ($clave) use (&$hj_n) { return e(sprintf('%02d — %s', ++$hj_n, mb_strtoupper(xt($clave), 'UTF-8'))); };
/* H2 genérico: el rótulo de la sección, primera palabra en 600 y el resto en 300. */
$hj_h2g = function ($clave) {
  $w = explode(' ', xt($clave), 2);
  return e($w[0]) . (isset($w[1]) ? ' <span style="font-weight: 300">' . e($w[1]) . '</span>' : '');
};
$H2 = 'margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: clamp(26px, 3vw, 40px); line-height: 1.08; letter-spacing: -.045em';
$TAG = "font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: .14em; color: #2E3BEB";
$PILL = "font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding: 6px 12px; border-radius: 999px; background: #E3E6FD; color: #2E3BEB";
$X3 = '<polygon fill="#2E3BEB" points="10,10 41,10 90,90 59,90"></polygon>';
?>
<div style="font-family: Manrope, sans-serif; color: #0B0C1E; background: #F2F3F7; overflow-x: hidden">
<?php $X_CUR = true; $X_CTA = '#cta'; require __DIR__ . '/cabecera.php'; ?>
<main>
<section>
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(40px, 6vw, 72px) clamp(20px, 5vw, 80px) clamp(56px, 8vw, 104px); display: flex; flex-direction: column; gap: 36px">
<nav aria-label="<?= x('breadcrumb') ?>" style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .08em; color: #4A4E66; display: flex; flex-wrap: wrap; gap: 10px"><a href="<?= e($inicio) ?>"><?= x('home') ?></a><span aria-hidden="true"><?= x('x_2') ?></span><?php if ($H['codigo'] !== 'DOC'): ?><a href="<?= e($hub) ?>"><?= x('services') ?></a><span aria-hidden="true"><?= x('x_2') ?></span><?php endif; ?><span aria-current="page" style="color: #0B0C1E"><?= $hj_nombre($H) ?></span></nav>
<div style="display: flex; flex-wrap: wrap; gap: 40px; align-items: flex-end">
<div style="flex: 1 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 24px">
<div style="display: flex; align-items: center; gap: 12px; font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: .14em; color: #4A4E66"><svg aria-hidden="true" height="22" viewbox="10 10 80 80" width="22"><?= $X3 ?><polygon fill="#DADCE6" points="59,10 90,10 41,90 10,90"></polygon></svg><?= $H['eyebrow'] ?></div>
<h1 class="hj-h1" style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: clamp(40px, 5.6vw, <?= $h1_tope ?>px); line-height: 1; letter-spacing: -.05em"><?= $h1_a ?><?php if ($h1_b !== ''): ?> <span style="font-weight: 300"><?= $h1_b ?></span><?php endif; ?></h1>
<p style="margin: 0; font-size: clamp(17px, 1.5vw, 20px); line-height: 1.6; color: #4A4E66; max-width: 52ch"><?= $H['lead'] ?></p>
</div>
<?php if (!empty($H['regla'])): ?>
<aside style="flex: 1 1 340px; min-width: 0; border-radius: 24px; background: #0B0C1E; color: #F2F3F7; padding: 32px; display: flex; flex-direction: column; gap: 16px; position: relative; overflow: hidden">
<svg aria-hidden="true" height="200" style="position: absolute; right: -50px; top: -50px; opacity: .9" viewbox="0 0 100 100" width="200"><?= $X3 ?><polygon fill="#C8F04A" points="59,10 90,10 41,90 10,90"></polygon><polygon fill="#F2F3F7" points="50,24.7 65.5,50 50,75.3 34.5,50"></polygon></svg>
<span style="position: relative; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .14em; color: #A9ADC2"><?= x('the_rule_we_build') ?></span>
<p style="position: relative; margin: 0; font-family: Unbounded, sans-serif; font-weight: 500; font-size: 22px; line-height: 1.3; letter-spacing: -.03em; max-width: 22ch"><?= $H['regla'] ?></p>
</aside>
<?php endif; ?>
</div>
</div>
</section>

<?php /* 01 · QUÉ ES */ ?>
<section<?= $hj_fondo() ?>>
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(56px, 8vw, 104px) clamp(20px, 5vw, 80px); display: flex; flex-wrap: wrap; gap: 40px">
<div style="flex: 1 1 280px; min-width: 0; display: flex; flex-direction: column; gap: 12px">
<span style="<?= $TAG ?>"><?= $hj_rotulo('l_what') ?></span>
<h2 style="<?= $H2 ?>"><?= $CRM ? x('crm_h01a') . ' <span style="font-weight: 300">' . x('crm_h01b') . '</span>' : $hj_h2g('l_what') ?></h2>
</div>
<div style="flex: 2 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 18px; font-size: 17px; line-height: 1.7; color: #2B2E45">
<?php foreach ($H['spec'] as $sp): ?><p style="margin: 0"><?= $sp ?></p>
<?php endforeach; ?>
</div>
</div>
</section>

<?php if ($P): /* 02 · FUNCIONANDO: el panel de ejemplo; debajo, la franja del caso real (diferencia admitida) */
  $nf = count($P['rows']); ?>
<section<?= $hj_fondo() ?>>
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(56px, 8vw, 104px) clamp(20px, 5vw, 80px); display: flex; flex-direction: column; gap: 28px">
<div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 16px">
<div style="display: flex; flex-direction: column; gap: 12px">
<span style="<?= $TAG ?>"><?= $hj_rotulo('l_seen') ?></span>
<h2 id="hj-panel-t" style="<?= $H2 ?>"><?= $CRM ? x('crm_h02a') . ' <span style="font-weight: 300">' . x('crm_h02b') . '</span>' : $hj_h2g('l_seen') ?></h2>
</div>
<span style="display: flex; flex-wrap: wrap; gap: 8px"><?php if (!empty($P['estado'])): ?><span style="<?= $PILL ?>"><?= $P['estado'] ?></span><?php endif; ?><span style="<?= $PILL ?>"><?= x('sample_data') ?></span></span>
</div>
<div style="border-radius: 24px; background: #0B0C1E; color: #F2F3F7; overflow: hidden">
<div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding: 18px 24px; border-bottom: 1px solid #23253D; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .1em; color: #A9ADC2"><span><?= str_replace(' // ', ' × ', $P['tool']) ?></span><span><?= e(str_replace('{n}', (string) $nf, xt('n_of_n'))) ?></span></div>
<div aria-labelledby="hj-panel-t" class="rg-osc" role="region" style="overflow-x: auto" tabindex="0">
<table style="width: 100%; min-width: 720px; border-collapse: collapse; font-size: 15px">
<thead><tr style="text-align: left; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #A9ADC2; text-transform: uppercase"><?php $nc = count($P['th']); foreach ($P['th'] as $ci => $th):
  $pad = $ci === 0 ? '14px 24px' : ($ci === $nc - 1 ? '14px 24px 14px 12px' : '14px 12px'); ?><th style="padding: <?= $pad ?>; font-weight: 500"><?= $th ?></th><?php endforeach; ?></tr></thead>
<tbody>
<?php foreach ($P['rows'] as $r): $alerta = array_pop($r); $n = count($r); ?>
<tr style="border-top: 1px solid #23253D<?= $alerta ? '; background: rgba(200,240,74,.08)' : '' ?>"><?php foreach ($r as $ci => $v):
  if ($ci === 0) { echo '<td style="padding: 16px 24px; font-family: \'IBM Plex Mono\', monospace; font-size: 13px">' . $v . '</td>'; }
  elseif ($ci === $n - 1) { echo '<td style="padding: 16px 24px 16px 12px">' . ($alerta ? '<span style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 999px; background: #C8F04A; color: #0B0C1E; font-weight: 700; font-size: 13px">' . $v . '</span>' : $v) . '</td>'; }
  else { echo '<td style="padding: 16px 12px">' . $v . '</td>'; }
endforeach; ?></tr>
<?php endforeach; ?>
</tbody>
</table>
</div>
<p style="margin: 0; padding: 16px 24px; border-top: 1px solid #23253D; font-size: 14px; color: #A9ADC2"><?= $P['pie'] ?> <?= x('sample_note') ?></p>
</div>
<?php if ($C): ?>
<div style="border-radius: 24px; background: #FFFFFF; border: 1px solid #DADCE6; padding: clamp(20px, 3vw, 28px); display: flex; flex-wrap: wrap; gap: 24px 40px; align-items: center">
<div style="flex: 2 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 8px">
<p style="margin: 0; font-weight: 700; font-size: 17px; line-height: 1.4"><?= $C['titulo'] ?></p>
<p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4A4E66"><?= $C['texto'] ?></p>
</div>
<dl style="flex: 1 1 300px; min-width: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 20px 28px">
<?php foreach ($C['cifras'] as $ki => $c): ?><div style="display: flex; flex-direction: column-reverse; gap: 4px; min-width: 0; max-width: 18ch"><dt style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .08em; line-height: 1.4; color: #4A4E66"><?= $c[1] ?></dt><dd style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 32px; line-height: 1; letter-spacing: -.04em<?= $ki === 0 ? '; color: #2E3BEB' : '' ?>"><?= $c[0] ?></dd></div>
<?php endforeach; ?>
</dl>
</div>
<?php endif; ?>
<?php if (!empty($H['videos'])): $V = $H['videos']; /* piezas reales del estudio (G03). preload="none": el MP4 solo baja al reproducir */ ?>
<div id="videos" style="display: flex; flex-direction: column; gap: 18px; padding-top: 12px">
<p style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: 22px; line-height: 1.2; letter-spacing: -.03em"><?= $V['titulo'] ?></p>
<p style="margin: 0; font-size: 17px; line-height: 1.7; color: #2B2E45; max-width: 68ch"><?= $V['texto'] ?></p>
<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 320px)); gap: 16px">
<?php foreach ($V['piezas'] as $vi => $v): ?>
<figure style="margin: 0; border-radius: 20px; background: #FFFFFF; border: 1px solid #DADCE6; overflow: hidden; display: flex; flex-direction: column">
<video controls playsinline preload="none" width="720" height="1280" style="display: block; width: 100%; height: auto; background: #0B0C1E" poster="/assets/videos/<?= e($v['id']) ?>.webp?v=<?= VER ?>" aria-label="<?= e(strip_tags(html_entity_decode($v['titulo'], ENT_QUOTES, 'UTF-8'))) ?>"><source src="/assets/videos/<?= e($v['id']) ?>.mp4?v=<?= VER ?>" type="video/mp4"></video>
<figcaption style="padding: 18px 20px; display: flex; flex-direction: column; gap: 6px"><span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #4A4E66"><?= $H['codigo'] ?>-V<?= sprintf('%02d', $vi + 1) ?> · <?= $v['formato'] ?></span><span style="font-weight: 700; font-size: 17px"><?= $v['titulo'] ?></span><span style="font-size: 15px; line-height: 1.55; color: #4A4E66"><?= $v['texto'] ?></span></figcaption>
</figure>
<?php endforeach; ?>
</div>
<?php if (!empty($V['nota'])): ?><p style="margin: 0; font-size: 14px; color: #4A4E66"><?= $V['nota'] ?></p><?php endif; ?>
</div>
<?php endif; ?>
</div>
</section>
<?php endif; ?>

<?php if (!empty($H['flujo'])): /* 03 · CÓMO FLUYE: con seis pasos, seis columnas fijas en escritorio (hoja.css) */
  $fb = $hj_fondo(); $li_bg = $fb ? '#F2F3F7' : '#FFFFFF'; $nfl = count($H['flujo']); ?>
<section<?= $fb ?>>
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(56px, 8vw, 104px) clamp(20px, 5vw, 80px); display: flex; flex-direction: column; gap: 32px">
<div style="display: flex; flex-direction: column; gap: 12px">
<span style="<?= $TAG ?>"><?= $hj_rotulo('l_flow') ?></span>
<h2 style="<?= $H2 ?>"><?= $CRM ? x('crm_h03a') . ' <span style="font-weight: 300">' . x('crm_h03b') . '</span>' : $hj_h2g('l_flow') ?></h2>
</div>
<ol<?= $nfl === 6 ? ' class="hj-flow6"' : '' ?> style="margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px">
<?php foreach ($H['flujo'] as $fi => $f): $ult = $fi === $nfl - 1; ?>
<?php if (!$ult): ?><li style="border-radius: 20px; background: <?= $li_bg ?>; padding: 24px; display: flex; flex-direction: column; gap: 12px"><span style="display: flex; align-items: center; gap: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #4A4E66"><svg aria-hidden="true" height="16" viewbox="10 10 80 80" width="16"><?= $X3 ?><polygon fill="#2E3BEB" points="59,10 90,10 41,90 10,90"></polygon><polygon fill="<?= $li_bg ?>" points="50,24.7 65.5,50 50,75.3 34.5,50"></polygon></svg><?= x('step') ?> <?= $fi + 1 ?></span><span style="font-family: Unbounded, sans-serif; font-weight: 600; font-size: 19px; letter-spacing: -.03em"><?= $f[0] ?></span><span style="font-size: 15px; line-height: 1.55; color: #4A4E66"><?= $f[1] ?></span></li>
<?php else: ?><li style="border-radius: 20px; background: #0B0C1E; color: #F2F3F7; padding: 24px; display: flex; flex-direction: column; gap: 12px"><span style="display: flex; align-items: center; gap: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #C8F04A"><svg aria-hidden="true" height="16" viewbox="10 10 80 80" width="16"><?= $X3 ?><polygon fill="#C8F04A" points="59,10 90,10 41,90 10,90"></polygon><polygon fill="#F2F3F7" points="50,24.7 65.5,50 50,75.3 34.5,50"></polygon></svg><?= x('step') ?> <?= $fi + 1 ?></span><span style="font-family: Unbounded, sans-serif; font-weight: 600; font-size: 19px; letter-spacing: -.03em"><?= $f[0] ?></span><span style="font-size: 15px; line-height: 1.55; color: #C9CCDB"><?= $f[1] ?></span></li>
<?php endif; endforeach; ?>
</ol>
</div>
</section>
<?php endif; ?>

<?php /* 04 · QUÉ INCLUYE: en custom-crm «Seven parts, one record.» con la palabra del número de partes; en las demás el H2
   genérico («one record» es redacción del CRM y sería falso en las otras). Chips = 6 primeros módulos */
  $ns = count($H['scope']); $nw = xt('n' . $ns); ?>
<section<?= $hj_fondo() ?>>
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(56px, 8vw, 104px) clamp(20px, 5vw, 80px); display: flex; flex-wrap: wrap; gap: 40px">
<div style="flex: 1 1 280px; min-width: 0; display: flex; flex-direction: column; gap: 16px">
<span style="<?= $TAG ?>"><?= $hj_rotulo('l_incl') ?></span>
<h2 id="hj-partes-t" style="<?= $H2 ?>"><?= $CRM ? e($nw !== '' ? $nw : (string) $ns) . ' ' . x('parts') . ' <span style="font-weight: 300">' . x('one_record') . '</span>' : $hj_h2g('l_incl') ?></h2>
<?php if (!empty($H['modulos'])): ?>
<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px">
<?php foreach (array_slice($H['modulos'], 0, 6) as $mo): ?><span style="<?= $PILL ?>"><?= $mo ?></span>
<?php endforeach; ?>
</div>
<?php endif; ?>
</div>
<div aria-labelledby="hj-partes-t" role="region" style="flex: 2 1 560px; min-width: 0; overflow-x: auto" tabindex="0">
<table style="width: 100%; min-width: 480px; border-collapse: collapse; font-size: 15px; line-height: 1.5">
<thead><tr style="text-align: left; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #4A4E66"><th style="padding: 10px 12px 10px 0; font-weight: 500; width: 40px"><?= x('x_4') ?></th><th style="padding: 10px 12px; font-weight: 500; width: 180px"><?= x('component') ?></th><th style="padding: 10px 0; font-weight: 500"><?= x('what_it_means') ?></th></tr></thead>
<tbody>
<?php foreach ($H['scope'] as $si => $s): ?>
<tr style="border-top: 1px solid #DADCE6<?= $si === $ns - 1 ? '; border-bottom: 1px solid #DADCE6' : '' ?>"><td style="padding: 16px 12px 16px 0; font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #4A4E66"><?= sprintf('%02d', $si + 1) ?></td><td style="padding: 16px 12px; font-weight: 700"><?= $s[0] ?></td><td style="padding: 16px 0; color: #2B2E45"><?= $s[1] ?></td></tr>
<?php endforeach; ?>
</tbody>
</table>
</div>
</div>
</section>

<?php if ($CRM): /* 05 · DÓNDE FUNCIONA: solo en custom-crm (Diseño #284). Azul noche: no cuenta para la alternancia */ ?>
<section style="background: #0B0C1E; color: #F2F3F7">
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(56px, 8vw, 104px) clamp(20px, 5vw, 80px); display: flex; flex-direction: column; gap: 32px">
<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px">
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: .14em; color: #A9ADC2"><?= $hj_rotulo('l_where') ?></span>
<span style="display: inline-flex; align-items: center; gap: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .1em; padding: 5px 10px; border-radius: 999px; background: #C8F04A; color: #0B0C1E"><span aria-hidden="true" style="width: 6px; height: 6px; border-radius: 50%; background: #0B0C1E"></span><?= x('module_of_axisworks_erp') ?></span>
</div>
<div style="display: flex; flex-wrap: wrap; gap: 40px">
<div style="flex: 1 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 18px">
<h2 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: clamp(26px, 3vw, 40px); line-height: 1.1; letter-spacing: -.045em"><?= x('this_crm_is_the') ?> <span style="font-weight: 300"><?= x('of_axisworks_erp') ?></span></h2>
<p style="margin: 0; font-size: 17px; line-height: 1.7; color: #C9CCDB"><?= x('leads_come_in_on') ?></p>
<a href="<?= h("#", 'open_the_erp_demo') ?>" style="align-self: flex-start; min-height: 48px; padding: 0 22px; border-radius: 999px; background: #C8F04A; color: #0B0C1E; display: inline-flex; align-items: center; font-weight: 700"><?= x('open_the_erp_demo') ?></a>
</div>
<ul style="flex: 1 1 340px; min-width: 0; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 12px">
<?php foreach (['configurable_stage_funnel', 'a_for_today_inbox', 'closing_calendar_lead_assignment'] as $k): ?><li style="border-radius: 20px; background: #1A1C33; padding: 18px 20px; display: flex; gap: 14px; align-items: center"><svg aria-hidden="true" height="20" style="flex: none" viewbox="10 10 80 80" width="20"><?= $X3 ?><polygon fill="#C8F04A" points="59,10 90,10 41,90 10,90"></polygon><polygon fill="#F2F3F7" points="50,24.7 65.5,50 50,75.3 34.5,50"></polygon></svg><span style="font-size: 15px; line-height: 1.45"><?= x($k) ?></span></li>
<?php endforeach; ?>
</ul>
</div>
</div>
</section>
<?php endif; ?>

<?php /* 06 · PREGUNTAS (las mismas que el FAQPage del <head>; la primera abierta, como en la mesa) */
  $ff = $hj_fondo(); ?>
<section<?= $ff ?>>
<div style="max-width: 1280px; margin: 0 auto; padding: clamp(56px, 8vw, 104px) clamp(20px, 5vw, 80px); display: flex; flex-wrap: wrap; gap: 40px">
<div style="flex: 1 1 280px; min-width: 0; display: flex; flex-direction: column; gap: 12px">
<span style="<?= $TAG ?>"><?= $hj_rotulo('l_faq') ?></span>
<h2 style="<?= $H2 ?>"><?= $CRM ? x('crm_h06a') . ' <span style="font-weight: 300">' . x('crm_h06b') . '</span>' : $hj_h2g('l_faq') ?></h2>
</div>
<div style="flex: 2 1 560px; min-width: 0; display: flex; flex-direction: column; border-top: 1px solid #DADCE6">
<?php foreach ($H['faq'] as $qi => $f): ?>
<details<?= $qi === 0 ? ' open=""' : '' ?> style="border-bottom: 1px solid #DADCE6"><summary style="display: flex; justify-content: space-between; align-items: center; gap: 16px; min-height: 64px; font-weight: 700; font-size: 18px"><?= $f[0] ?><svg aria-hidden="true" class="faq-x" height="18" viewbox="10 10 80 80" width="18"><?= $X3 ?><polygon fill="#2E3BEB" points="59,10 90,10 41,90 10,90"></polygon></svg></summary><p style="margin: 0 0 22px; font-size: 16px; line-height: 1.7; color: #2B2E45; max-width: 68ch"><?= $f[1] ?></p></details>
<?php endforeach; ?>
</div>
</div>
</section>

<?php /* Anterior / siguiente, con código y orden de catalogo.php */ ?>
<nav aria-label="<?= x('sheets') ?>" style="background: <?= $ff ? '#F2F3F7' : '#FFFFFF' ?>">
<div style="max-width: 1280px; margin: 0 auto; padding: 32px clamp(20px, 5vw, 80px); display: flex; flex-wrap: wrap; gap: 12px">
<?php $card = 'flex: 1 1 280px; border-radius: 20px; border: 1.5px solid #DADCE6; background: #FFFFFF; padding: 20px 24px; display: flex; flex-direction: column; gap: 6px';
$lbl = "font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .12em; color: #4A4E66";
if ($prev): $PH = $HOJAS[$lang][$prev]; ?>
<a href="<?= e($PH['url']) ?>" style="<?= $card ?>"><span style="<?= $lbl ?>"><?= x('prev_sheet') ?> · <?= e($PH['codigo']) ?></span><span style="font-weight: 700; font-size: 17px"><?= $hj_nombre($PH) ?></span></a>
<?php else: ?>
<a href="<?= e($hub) ?>" style="<?= $card ?>"><span style="<?= $lbl ?>">← <?= x('all_sheets') ?></span><span style="font-weight: 700; font-size: 17px"><?= x('services') ?></span></a>
<?php endif; ?>
<?php if ($next): $NH = $HOJAS[$lang][$next]; ?>
<a href="<?= e($NH['url']) ?>" style="<?= $card ?>; text-align: right"><span style="<?= $lbl ?>"><?= x('next_sheet') ?> · <?= e($NH['codigo']) ?></span><span style="font-weight: 700; font-size: 17px"><?= $hj_nombre($NH) ?></span></a>
<?php else: ?>
<a href="<?= e($hub) ?>" style="<?= $card ?>; text-align: right"><span style="<?= $lbl ?>"><?= x('all_sheets') ?> →</span><span style="font-weight: 700; font-size: 17px"><?= x('services') ?></span></a>
<?php endif; ?>
</div>
</nav>

<?php /* Cierre de la mesa + el formulario de las mesas C01/C04 (la C02 no lo trae; diferencia admitida) */ ?>
<section id="cta" style="background: #2E3BEB; color: #F2F3F7; position: relative; overflow: hidden">
<svg aria-hidden="true" height="420" style="position: absolute; right: -90px; bottom: -120px; opacity: .95" viewbox="0 0 100 100" width="420"><polygon fill="#F2F3F7" points="10,10 41,10 90,90 59,90"></polygon><polygon fill="#C8F04A" points="59,10 90,10 41,90 10,90"></polygon><polygon fill="#0B0C1E" points="50,24.7 65.5,50 50,75.3 34.5,50"></polygon></svg>
<div style="position: relative; max-width: 1280px; margin: 0 auto; padding: clamp(56px, 8vw, 104px) clamp(20px, 5vw, 80px); display: flex; flex-wrap: wrap; gap: 48px">
<div style="flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 20px">
<h2 style="margin: 0; font-family: Unbounded, sans-serif; font-weight: 600; font-size: clamp(30px, 4vw, 52px); line-height: 1.04; letter-spacing: -.045em; max-width: 16ch"><?= x('have_something') ?> <span style="font-weight: 300"><?= x('worth_building_well') ?></span></h2>
<p style="margin: 0; font-size: 18px; line-height: 1.6; color: #E3E6FD; max-width: 46ch"><?= x('tell_us_what_you') ?></p>
<div style="display: flex; flex-wrap: wrap; gap: 12px">
<a href="<?= e(correo(html_entity_decode($H['asunto'], ENT_QUOTES, 'UTF-8'))) ?>" style="min-height: 52px; padding: 0 24px; border-radius: 999px; background: #0B0C1E; color: #C8F04A; display: inline-flex; align-items: center; font-weight: 700"><?= x('hello_axisworks_studio') ?></a>
</div>
</div>
<form data-contacto novalidate style="flex: 1 1 420px; min-width: 0; border-radius: 24px; background: #F2F3F7; color: #0B0C1E; padding: clamp(24px, 3vw, 36px); display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; flex-wrap: wrap; gap: 16px">
<label style="flex: 1 1 200px; display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 700"><?= x('your_name') ?><input autocomplete="name" maxlength="120" name="nombre" required style="min-height: 48px; border-radius: 12px; border: 1.5px solid #A9ADC2; background: #FFFFFF; padding: 0 14px; font: inherit; font-weight: 400" type="text"/></label>
<label style="flex: 1 1 200px; display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 700"><?= x('work_email') ?><input autocomplete="email" maxlength="200" name="email" required style="min-height: 48px; border-radius: 12px; border: 1.5px solid #A9ADC2; background: #FFFFFF; padding: 0 14px; font: inherit; font-weight: 400" type="email"/></label>
</div>
<label style="display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 700"><span style="display: flex; align-items: baseline; gap: 8px"><?= x('company') ?><span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 400; color: #4A4E66"><?= x('optional') ?></span></span><input autocomplete="organization" maxlength="160" name="empresa" style="min-height: 48px; border-radius: 12px; border: 1.5px solid #A9ADC2; background: #FFFFFF; padding: 0 14px; font: inherit; font-weight: 400" type="text"/></label>
<label style="display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 700"><?= x('what_do_you_need') ?><textarea maxlength="4000" minlength="10" name="mensaje" required placeholder="<?= e($T[$lang]['fc_msg_ph']) ?>" rows="4" style="border-radius: 12px; border: 1.5px solid #A9ADC2; background: #FFFFFF; padding: 12px 14px; font: inherit; font-weight: 400; resize: vertical"></textarea></label>
<button style="align-self: flex-start; min-height: 52px; padding: 0 26px; border-radius: 999px; border: 0; background: #0B0C1E; color: #C8F04A; font: inherit; font-weight: 700; font-size: 16px; cursor: pointer" type="submit"><?= x('send') ?></button>
<label aria-hidden="true" style="position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden">Website <input autocomplete="off" name="website" tabindex="-1" type="text"></label>
<input name="pagina" type="hidden" value="<?= e($url) ?>"><input name="lang" type="hidden" value="<?= $lang ?>">
<p aria-live="polite" class="fc-msg" role="status" style="margin: 0; font-size: 14px; line-height: 1.5; color: #0B0C1E" data-sending="<?= e($T[$lang]['fc_sending']) ?>" data-ok="<?= e($T[$lang]['fc_ok']) ?>" data-val="<?= e($T[$lang]['fc_val']) ?>" data-err="<?= e($T[$lang]['fc_err']) ?>" data-lim="<?= e($T[$lang]['fc_lim']) ?>" data-mail="<?= e(correo(($lang === 'es' ? 'Consulta — ' : 'Enquiry — ') . $url)) ?>" data-to="<?= EMAIL ?>"></p>
<p style="margin: 0; font-size: 12px; line-height: 1.5; color: #4A4E66"><?= $lang === 'es' ? $LEGAL_CAPA1_ES : $LEGAL_CAPA1_EN ?></p>
</form>
</div>
</section>
</main>
<?php require __DIR__ . '/pie.php'; ?>
</div>
