<?php /* Pie común (mesa C02). Con $H['codigo'] enseña el código de hoja. Lleva el enlace al índice de servicios:
 * sin él las hojas quedan sin enlace interno (diferencia admitida 12). */ ?>
<footer style="background: #0B0C1E; color: #A9ADC2">
<div style="max-width: 1280px; margin: 0 auto; padding: 32px clamp(20px, 5vw, 80px); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .08em">
<span><?= x('axisworks_built_to_order') ?></span><?php if (!empty($H['codigo'])): ?><span><?= x('sheet') ?> <?= e($H['codigo']) ?></span><?php endif; ?><nav aria-label="<?= x('footer') ?>" style="display: flex; flex-wrap: wrap; gap: 8px 20px"><a href="<?= e($lang === 'es' ? '/es/servicios/' : '/services/') ?>"><?= x('services_index') ?></a><a href="<?= h("#", 'legal_notice') ?>"><?= x('legal_notice') ?></a><a href="<?= h("#", 'privacy') ?>"><?= x('privacy') ?></a><a href="<?= h("#", 'cookies') ?>"><?= x('cookies') ?></a></nav><span><?= x('2026') ?></span>
</div>
</footer>
