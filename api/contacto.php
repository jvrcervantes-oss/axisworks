<?php
/* api/contacto.php — el formulario de contacto de axisworks.studio (24-sep-2026).
 *
 * GET  → emite un token firmado {t,n,s} que el formulario pide al enfocarse.
 * POST → valida y manda el lead por correo al buzón del estudio. No guarda el
 *        contenido en disco (Legal): solo un log sin datos personales.
 *
 * Revisión previa de Seguridad (#78):
 *   · El secreto NO está en git (el repo es público): se genera en el servidor la
 *     primera vez en private/secreto.php (gitignored, carpeta con Require all denied).
 *   · Trampa de tiempo firmada: HMAC(t|n). Sin firma, un bot manda t=ahora-10 y pasa.
 *   · IP solo como hash con sal DIARIA derivada del secreto; los ficheros de estado
 *     se borran pasada una hora. Límite 5/h por IP + tope global diario (una botnet
 *     cambia de IP y quien paga es la reputación del dominio).
 *   · Origin/Referer es un filtro barato, no un control: curl lo falsifica.
 *   · Sin cabeceras CORS. Ante cualquier excepción: {ok:false} sin detalle.
 *   · mail() devuelve true aunque el correo no llegue: la prueba de recepción del
 *     buzón es manual y va antes de dar esto por bueno.
 */
declare(strict_types=1);

const CT_DESTINO  = 'hello@axisworks.studio';
/* Hostinger rechaza mail() si el remitente no es un buzón que exista en el
   dominio: web@ no existe (probado en producción el 24-sep, mail() = false). */
const CT_REMITE   = 'hello@axisworks.studio';
const CT_ORIGEN   = 'axisworks.studio';
const CT_MIN_SEG  = 3;
const CT_MAX_SEG  = 7200;
const CT_POR_IP_H = 5;
const CT_GLOBAL_D = 30;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function ct_fin(int $code, array $body): void { http_response_code($code); echo json_encode($body); exit; }

function ct_secreto(): string {
  $dir = __DIR__ . '/../private';
  $f = $dir . '/secreto.php';
  if (!is_file($f)) {
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $s = bin2hex(random_bytes(32));
    @file_put_contents($f, "<?php return '" . $s . "';\n", LOCK_EX);
    @chmod($f, 0600);
  }
  $s = @include $f;
  if (!is_string($s) || strlen($s) < 32) throw new RuntimeException('secreto');
  return $s;
}

function ct_estado(): string {
  $d = __DIR__ . '/_estado';
  if (!is_dir($d)) @mkdir($d, 0700, true);
  if (!is_file($d . '/.htaccess')) @file_put_contents($d . '/.htaccess', "Require all denied\n");
  foreach (glob($d . '/ip-*.json') ?: [] as $g) if (filemtime($g) < time() - 3600) @unlink($g);
  foreach (glob($d . '/dia-*.txt') ?: [] as $g) if (filemtime($g) < time() - 172800) @unlink($g);
  return $d;
}

/* Cuenta con flock; devuelve false si se pasa del tope. */
function ct_cuenta(string $f, int $tope, int $ventana): bool {
  $h = @fopen($f, 'c+'); if (!$h) return true;   /* sin disco no se bloquea al visitante */
  flock($h, LOCK_EX);
  $raw = stream_get_contents($h); $ts = json_decode($raw ?: '[]', true) ?: [];
  $ahora = time(); $ts = array_values(array_filter($ts, fn($x) => $x > $ahora - $ventana));
  $ok = count($ts) < $tope;
  if ($ok) { $ts[] = $ahora; ftruncate($h, 0); rewind($h); fwrite($h, json_encode($ts)); }
  flock($h, LOCK_UN); fclose($h);
  return $ok;
}

function ct_limpio(string $s, int $max): string {
  $s = trim(str_replace(["\r", "\n", "\0"], ' ', $s));
  return mb_substr($s, 0, $max);
}

try {
  $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
  $sec = ct_secreto();

  if ($metodo === 'GET') {
    $t = time(); $n = bin2hex(random_bytes(8));
    ct_fin(200, ['t' => $t, 'n' => $n, 's' => hash_hmac('sha256', $t . '|' . $n, $sec)]);
  }
  if ($metodo !== 'POST') ct_fin(405, ['ok' => false]);

  /* Filtro barato: mismo origen. */
  $orig = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
  $host = parse_url($orig, PHP_URL_HOST) ?: '';
  if ($host !== CT_ORIGEN && $host !== 'www.' . CT_ORIGEN && !in_array($host, ['127.0.0.1', 'localhost'], true)) ct_fin(403, ['ok' => false]);

  $P = $_POST;
  /* Honeypot: se contesta ok y no se envía nada (no enseñarle al bot que le vimos). */
  if (!empty($P['website'])) ct_fin(200, ['ok' => true]);

  /* Token firmado y edad razonable. */
  $t = (int)($P['t'] ?? 0); $n = (string)($P['n'] ?? ''); $s = (string)($P['s'] ?? '');
  $edad = time() - $t;
  if (!preg_match('/^[a-f0-9]{16}$/', $n) || !hash_equals(hash_hmac('sha256', $t . '|' . $n, $sec), $s)
      || $edad < CT_MIN_SEG || $edad > CT_MAX_SEG) ct_fin(400, ['ok' => false, 'e' => 'tok']);

  /* Validación. */
  $nombre  = ct_limpio((string)($P['nombre'] ?? ''), 120);
  $email   = ct_limpio((string)($P['email'] ?? ''), 200);
  $empresa = ct_limpio((string)($P['empresa'] ?? ''), 160);
  $mensaje = trim(str_replace("\0", '', (string)($P['mensaje'] ?? '')));
  $pagina  = (string)($P['pagina'] ?? '/');
  $lang    = ($P['lang'] ?? 'en') === 'es' ? 'es' : 'en';
  if (!preg_match('~^/[a-z0-9/_-]*$~', $pagina)) $pagina = '/';
  $utm = [];
  foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as $k) {
    $v = ct_limpio((string)($P[$k] ?? ''), 120);
    if ($v !== '' && preg_match('/^[\w .:\/+-]+$/u', $v)) $utm[$k] = $v;
  }
  if ($nombre === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)
      || mb_strlen($mensaje) < 10 || mb_strlen($mensaje) > 4000) ct_fin(400, ['ok' => false, 'e' => 'val']);

  /* Límites: por IP (hash con sal diaria) y global. */
  $d = ct_estado();
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
  $hip = hash_hmac('sha256', $ip, $sec . date('Y-m-d'));
  if (!ct_cuenta($d . '/dia-' . date('Ymd') . '.txt', CT_GLOBAL_D, 86400)) ct_fin(429, ['ok' => false, 'e' => 'lim']);
  if (!ct_cuenta($d . '/ip-' . substr($hip, 0, 32) . '.json', CT_POR_IP_H, 3600)) ct_fin(429, ['ok' => false, 'e' => 'lim']);

  /* El correo. Texto plano; lo que viene del visitante nunca toca una cabecera
     salvo el Reply-To, ya validado como email y sin saltos de línea. */
  $asunto = '[axisworks.studio] ' . ($lang === 'es' ? 'Consulta' : 'Enquiry') . ' — ' . $pagina . ' — ' . $nombre;
  $cuerpo = "Nombre: $nombre\nEmail: $email\n" . ($empresa !== '' ? "Empresa: $empresa\n" : '')
          . "Página: https://" . CT_ORIGEN . "$pagina\nIdioma: $lang\n";
  foreach ($utm as $k => $v) $cuerpo .= "$k: $v\n";
  $cuerpo .= "\n$mensaje\n";
  $cab = implode("\r\n", [
    'From: AxisWorks web <' . CT_REMITE . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: axisworks-contacto',
  ]);
  $ok = mail(CT_DESTINO, mb_encode_mimeheader($asunto, 'UTF-8'), $cuerpo, $cab, '-f' . CT_REMITE);

  /* Log sin datos personales: fecha, página, resultado. */
  @file_put_contents($d . '/envios.log', date('c') . "\t$pagina\t" . ($ok ? 'ok' : 'fallo') . "\n", FILE_APPEND | LOCK_EX);

  ct_fin($ok ? 200 : 502, ['ok' => $ok]);
} catch (Throwable $e) {
  ct_fin(500, ['ok' => false]);
}
