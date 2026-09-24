<?php
/* El formulario de contacto (24-sep-2026). Una sola pieza para portada, hojas e
 * índice; lo envía assets/contacto.js a /api/contacto (ver allí las medidas de
 * Seguridad). Necesita $lang, $t y $fc_pagina (ruta de origen, va al correo: la
 * bandeja sigue siendo el informe de atribución mientras no haya analítica).
 * La capa 1 de información la redactó Legal y vive en legal_*.php: sin casilla,
 * porque la base es la petición precontractual (6.1.b), no el consentimiento. */
require_once __DIR__ . '/legal_en.php';
require_once __DIR__ . '/legal_es.php';
$fc_capa1 = $lang === 'es' ? $LEGAL_CAPA1_ES : $LEGAL_CAPA1_EN;
$fc_asunto = ($lang === 'es' ? 'Consulta — ' : 'Enquiry — ') . ($fc_pagina ?? '/');
?>
<form class="intake" data-contacto novalidate>
  <div class="intake__row">
    <label class="field"><span class="field__l"><?= $t['fc_name'] ?> <i><?= $t['fc_req'] ?></i></span><input name="nombre" type="text" required maxlength="120" autocomplete="name"></label>
    <label class="field"><span class="field__l"><?= $t['fc_email'] ?> <i><?= $t['fc_req'] ?></i></span><input name="email" type="email" required maxlength="200" autocomplete="email"></label>
  </div>
  <label class="field"><span class="field__l"><?= $t['fc_company'] ?> <i><?= $t['fc_opt'] ?></i></span><input name="empresa" type="text" maxlength="160" autocomplete="organization"></label>
  <label class="field"><span class="field__l"><?= $t['fc_msg'] ?> <i><?= $t['fc_req'] ?></i></span><textarea name="mensaje" rows="4" required minlength="10" maxlength="4000" placeholder="<?= e($t['fc_msg_ph']) ?>"></textarea></label>
  <?php /* Honeypot: fuera de la vista y del tabulador; un humano no lo rellena. */ ?>
  <label class="fc-hp" aria-hidden="true">Website <input name="website" type="text" tabindex="-1" autocomplete="off"></label>
  <input type="hidden" name="pagina" value="<?= e($fc_pagina ?? '/') ?>">
  <input type="hidden" name="lang" value="<?= $lang ?>">
  <div class="intake__act">
    <button type="submit" class="btn btn--signal btn--sm"><span><?= $t['fc_send'] ?></span> <span class="ar" aria-hidden="true">→</span></button>
    <p class="fc-msg" role="status" aria-live="polite"
       data-sending="<?= e($t['fc_sending']) ?>" data-ok="<?= e($t['fc_ok']) ?>" data-val="<?= e($t['fc_val']) ?>"
       data-err="<?= e($t['fc_err']) ?>" data-lim="<?= e($t['fc_lim']) ?>"
       data-mail="<?= e(correo($fc_asunto)) ?>" data-to="<?= EMAIL ?>"></p>
  </div>
  <p class="fc-capa1"><?= $fc_capa1 ?></p>
</form>
