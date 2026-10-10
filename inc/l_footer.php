<?php
/* l_footer.php — pie de la portada nueva y de Agents as a Service. Conserva lo que el pie
 * viejo daba: el índice de hojas (único enlace interno a los servicios), email, legales. */
$L   = $LAND[$lang];
$t   = $T[$lang];
$col = $lang === 'es' ? 5 : 4;
$hub = $lang === 'es' ? '/es/servicios/' : '/services/';
$hojas_pie = array_filter($PRODUCTOS, function ($p) use ($col) { return $p[$col] && strpos($p[$col], '#') === false; });
$lgp = $lang === 'es' ? ['/es/aviso-legal','/es/privacidad','/es/cookies'] : ['/legal-notice','/privacy','/cookies'];
?>
<footer class="l-foot">
  <div class="l-wrap">
    <div class="l-foot__grid">
      <div>
        <p class="l-fb">AxisWorks</p>
        <p><?= $L['f_blurb'] ?></p>
        <p><?= $L['f_blurb2'] ?></p>
      </div>
      <nav aria-label="<?= e($t['index']) ?>">
        <p class="l-fh"><?= $t['index'] ?></p>
        <ul>
          <?php foreach ($hojas_pie as $p): ?>
          <li><a href="<?= e($p[$col]) ?>"><?= $lang === 'es' ? $p[3] : $p[2] ?></a></li>
          <?php endforeach; ?>
          <li><a href="<?= $hub ?>"><?= $t['nav_services'] ?> →</a></li>
        </ul>
      </nav>
      <div>
        <p class="l-fh">Email</p>
        <p><a href="mailto:<?= EMAIL ?>"><?= EMAIL ?></a></p>
        <p><?= $lang === 'es' ? 'Español / English' : 'English / Español' ?></p>
      </div>
    </div>
    <div class="l-foot__bar">
      <span><?= $L['f_trade'] ?></span>
      <span><a href="<?= $lgp[0] ?>"><?= $t['lg_legal'] ?></a> · <a href="<?= $lgp[1] ?>"><?= $t['lg_privacy'] ?></a> · <a href="<?= $lgp[2] ?>"><?= $t['lg_cookies'] ?></a></span>
    </div>
  </div>
</footer>
<script src="/assets/nav.js?v=<?= VER ?>" defer></script>
<script src="/assets/contacto.js?v=<?= VER ?>" defer></script>
