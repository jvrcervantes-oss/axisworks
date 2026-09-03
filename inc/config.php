<?php
/* ═══════════════════════════════════════════════════════════════════
 * config.php — lo que saben TODAS las páginas.
 *
 * Por qué PHP y no 17 .html generados (decisión de Desarrollo, revisión
 * previa del 2-sep-2026, verificado PHP 8.3.30 en producción):
 *   · `tools/unificar.py` es gate de PUSH y solo mira ficheros .html. 17
 *     páginas estáticas con su <nav> inline no pueden ser byte-idénticas
 *     (cada una lleva su idioma y su contraparte), así que el trinquete
 *     habría subido de 1/1 a 17/17 y el trabajo se moría en el commit.
 *   · Con includes no hay nada que regenerar, así que no hay nada que
 *     olvidar: la divergencia deja de ser posible por construcción, que
 *     es lo único que aguanta a dos operadores.
 * ═══════════════════════════════════════════════════════════════════ */

const SITE  = 'https://axisworks.studio';
const EMAIL = 'hello@axisworks.studio';

/* Sello de caché. El .htaccess cachea CSS UN AÑO (línea 78): un stylesheet
 * del que dependen 17 páginas, cacheado 12 meses sin sello, es el fallo que
 * la suite de Lawang ya resolvió sellando `brand.css`. Se sube a mano al
 * tocar site.css — vive AQUÍ y en ningún otro sitio. */
const VER = '20260903a';

/* ── El mapa de rutas: un solo dueño ──────────────────────────────────
 * Lo consumen tres cosas — el hreflang, el conmutador de idioma y los
 * alternates del sitemap. Escrito tres veces a mano diverge igual que
 * divergía el home. Se escribe una. */
$PARES = [
  '/'                                        => '/es/',
  '/services/'                               => '/es/servicios/',
  '/services/custom-business-software'       => '/es/servicios/software-de-gestion-a-medida',
  '/services/custom-crm'                     => '/es/servicios/crm-a-medida',
  '/services/whatsapp-ai-chatbot'            => '/es/servicios/chatbot-whatsapp-ia',
  '/services/business-process-automation'    => '/es/servicios/automatizacion-de-procesos',
  '/services/meta-ads'                       => '/es/servicios/meta-ads',
  /* Sin par a propósito (Marketing, SERP medida 2-sep-2026): el EN va
   * vertical —donde están nuestras cinco pruebas y la SERP está casi
   * vacía— y el ES va a pyme española. No son traducciones, así que
   * forzar un hreflang recíproco obligaría a publicar en español una
   * página que en España no busca nadie. */
  '/services/property-developer-software'    => null,
  '/es/cuanto-cuesta-un-software-a-medida'   => null,
];

/** La contraparte de una URL en el otro idioma, o null si no tiene. */
function par($url) {
  global $PARES;
  if (isset($PARES[$url])) return $PARES[$url];
  $vuelta = array_flip(array_filter($PARES));
  return $vuelta[$url] ?? null;
}

function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

/** El CTA lleva de dónde vino. Sin esto llega un correo sin remitente de
 *  página y no hay forma de saber qué página trae clientes y cuál no
 *  (Marketing, revisión previa). La bandeja ES el informe de atribución. */
function correo($asunto) {
  return 'mailto:' . EMAIL . '?subject=' . rawurlencode($asunto);
}
