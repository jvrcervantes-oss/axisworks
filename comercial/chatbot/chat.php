<?php
// ── AxisWorks — Chatbot comercial (cualificación de leads) ───────────
// Backend del widget. Llama a la API de Claude y registra leads en CSV.
// La API key vive en private/config.php, FUERA de public_html.
header('Content-Type: application/json; charset=utf-8');

$config_path = __DIR__ . '/private/config.php';
if (!file_exists($config_path)) {
    http_response_code(500);
    echo json_encode(['error' => 'config']);
    exit;
}
require_once $config_path;
// private/config.php define: ANTHROPIC_API_KEY  (y opcional CLAUDE_MODEL)

if (!defined('CLAUDE_MODEL')) {
    define('CLAUDE_MODEL', 'claude-haiku-4-5-20251001'); // rápido y económico para cualificar
}

// ── Same-origin básico (anti-abuso) ──────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host   = $_SERVER['HTTP_HOST'] ?? '';
if ($origin && $host && parse_url($origin, PHP_URL_HOST) !== $host
    && strpos($origin, 'localhost') === false) {
    http_response_code(403);
    echo json_encode(['error' => 'origin']);
    exit;
}

// ── Entrada ──────────────────────────────────────────────────────────
$raw = file_get_contents('php://input');
$in  = json_decode($raw, true);
if (!is_array($in) || empty($in['messages']) || !is_array($in['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => 'input']);
    exit;
}

// Sanear y limitar el historial (máx. 20 turnos, 2000 chars/mensaje)
$messages = [];
foreach (array_slice($in['messages'], -20) as $m) {
    $role = ($m['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
    $text = mb_substr(trim((string)($m['content'] ?? '')), 0, 2000);
    if ($text !== '') {
        $messages[] = ['role' => $role, 'content' => $text];
    }
}
if (!$messages) {
    http_response_code(400);
    echo json_encode(['error' => 'empty']);
    exit;
}

// ── System prompt: vendedor de AxisWorks ─────────────────────────────
$system = <<<SYS
Eres el asistente comercial de AxisWorks, un estudio digital que crea webs y landings modernas para negocios.

OFERTA QUE VENDES:
- Web profesional moderna por 100€/mes (sin pago inicial grande). Incluye: diseño a medida, hosting, actualizaciones, SEO básico, soporte y un chatbot en su web.
- Hacemos una vista previa GRATIS de su web antes de que paguen nada.

TU OBJETIVO (en este orden):
1. Entender su negocio: sector, ciudad y si ya tienen web (y qué falla).
2. Explicar el valor de los 100€/mes de forma sencilla, sin presionar.
3. Conseguir su CONTACTO: nombre + email o teléfono/WhatsApp, para enviarle una vista previa gratis.
4. Si ya está convencido, dirígele a activar su web.

ESTILO:
- Español cercano y profesional. Respuestas CORTAS (2-4 frases máx.). Una pregunta cada vez.
- Nunca inventes precios ni plazos distintos de los de arriba.
- Si preguntan algo que no sabes, ofrece que un humano del equipo les contacte.
- Cuando tengas un email o teléfono, confírmalo y di que les enviaremos la vista previa pronto.
SYS;

// ── Llamada a la API de Claude (Messages) ────────────────────────────
$payload = json_encode([
    'model'      => CLAUDE_MODEL,
    'max_tokens' => 400,
    'system'     => $system,
    'messages'   => $messages,
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'x-api-key: ' . ANTHROPIC_API_KEY,
        'anthropic-version: 2023-06-01',
    ],
]);
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

if ($err || $code >= 400) {
    http_response_code(502);
    echo json_encode(['error' => 'upstream', 'reply' => 'Disculpa, ahora mismo no puedo responder. ¿Me dejas tu email y te escribimos enseguida?']);
    exit;
}

$resp  = json_decode($body, true);
$reply = '';
if (!empty($resp['content']) && is_array($resp['content'])) {
    foreach ($resp['content'] as $blk) {
        if (($blk['type'] ?? '') === 'text') {
            $reply .= $blk['text'];
        }
    }
}
$reply = trim($reply) ?: 'Gracias por escribir. ¿En qué te ayudo con tu web?';

// ── Registro de lead: si el último mensaje del usuario trae contacto ──
$lastUser = '';
for ($i = count($messages) - 1; $i >= 0; $i--) {
    if ($messages[$i]['role'] === 'user') { $lastUser = $messages[$i]['content']; break; }
}
$emailRx = '/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i';
$phoneRx = '/(?:\+?\d[\d\s\-]{7,}\d)/';
$email = preg_match($emailRx, $lastUser, $em) ? $em[0] : '';
$phone = preg_match($phoneRx, $lastUser, $pm) ? preg_replace('/\s+/', ' ', trim($pm[0])) : '';

if ($email || $phone) {
    $dir = __DIR__ . '/private';
    @file_put_contents(
        $dir . '/leads.csv',
        sprintf("%s,%s,%s,%s,%s\n",
            date('c'),
            str_replace(',', ' ', $email),
            str_replace(',', ' ', $phone),
            str_replace(["\n", ","], ' ', mb_substr($lastUser, 0, 300)),
            $_SERVER['REMOTE_ADDR'] ?? ''
        ),
        FILE_APPEND | LOCK_EX
    );
}

echo json_encode(['reply' => $reply, 'lead' => (bool)($email || $phone)]);
