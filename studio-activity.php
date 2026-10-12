<?php
/* 12-oct-2026: la portada nueva ya no enlaza aquí (el owner quitó «See the real record»). Decisión por defecto de
 * agencia-40: 302 (no 301, reversible) a la sección «How we work» de la portada. inc/actividad.php, red.js y
 * estudio-en-vivo.json se conservan sin tocar; para volver, basta devolver el require. */
header('Location: /#activity', true, 302);
exit;
