<?php
// ── AxisWorks — Config de suscripción (EJEMPLO) ──────────────────────
// 1. Copia este archivo a  private/config.php  (sin .example)
// 2. Rellena con tus claves reales de Stripe
// 3. NUNCA subas config.php a git (ya está en .gitignore)
//
// Cómo obtener el PRICE_ID:
//   Stripe Dashboard → Products → crea "Web AxisWorks" → precio 100€, recurrente mensual
//   → copia el ID del precio (empieza por price_...)

define('STRIPE_SECRET', 'PON_AQUI_TU_STRIPE_SECRET_KEY'); // formato sk_test_... o sk_live_... (Restricted Key recomendada)
define('PRICE_ID',      'PON_AQUI_TU_PRICE_ID');           // formato price_... — 100€/mes recurrente
define('SUCCESS_URL',   'https://axisworks.studio/comercial/suscripcion/gracias.html');
define('CANCEL_URL',    'https://axisworks.studio/comercial/suscripcion/cancelado.html');
