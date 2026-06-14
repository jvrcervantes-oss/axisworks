<?php
// ── AxisWorks — Alta de suscripción (100€/mes) ───────────────────────
// Crea una Stripe Checkout Session en modo `subscription`.
// La clave secreta y el Price ID viven en private/config.php, FUERA de public_html.
$config_path = __DIR__ . '/private/config.php';
if (!file_exists($config_path)) {
    http_response_code(500);
    exit('Server configuration error. Contact the site administrator.');
}
require_once $config_path;
// private/config.php define: STRIPE_SECRET, PRICE_ID (price recurrente 100€/mes),
//                            SUCCESS_URL, CANCEL_URL

// ── Referencia del prospecto (de qué demo viene) ─────────────────────
$ref = substr(preg_replace('/[^a-zA-Z0-9_\-]/', '', $_GET['ref'] ?? 'web'), 0, 120);

// ── Crear Checkout Session (modo suscripción) ────────────────────────
$data = [
  'mode'                   => 'subscription',
  'line_items[0][price]'   => PRICE_ID,
  'line_items[0][quantity]'=> 1,
  'success_url'            => SUCCESS_URL . '?ok=1&ref=' . rawurlencode($ref),
  'cancel_url'             => CANCEL_URL . '?ref=' . rawurlencode($ref),
  'client_reference_id'    => $ref,
  'allow_promotion_codes'  => 'true',
  'billing_address_collection' => 'required',
  'subscription_data[metadata][ref]' => $ref,
  'metadata[ref]'          => $ref,
];

$ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => http_build_query($data),
  CURLOPT_HTTPHEADER     => [
    'Authorization: Bearer ' . STRIPE_SECRET,
    'Content-Type: application/x-www-form-urlencoded',
    'Stripe-Version: 2024-06-20',
  ],
]);

$body = curl_exec($ch);
$err  = curl_error($ch);
curl_close($ch);

if ($err) {
    header('Location: ' . CANCEL_URL . '?error=conexion', true, 303);
    exit;
}

$session = json_decode($body, true);

if (!empty($session['url'])) {
    header('Location: ' . $session['url'], true, 303);
    exit;
}

$code = $session['error']['code'] ?? 'unknown';
header('Location: ' . CANCEL_URL . '?error=' . rawurlencode($code), true, 303);
exit;
