<?php
require_once __DIR__ . '/hojas_en.php';
require_once __DIR__ . '/hojas_es.php';
require_once __DIR__ . '/campo_en.php';
require_once __DIR__ . '/campo_es.php';
/* El caso real (Lawang) se funde en su hoja: campo_*.php es su único dueño. */
foreach ($CAMPO_EN as $slug => $campo) if (isset($HOJAS_EN[$slug])) $HOJAS_EN[$slug] = $campo + $HOJAS_EN[$slug];
foreach ($CAMPO_ES as $slug => $campo) if (isset($HOJAS_ES[$slug])) $HOJAS_ES[$slug] = $campo + $HOJAS_ES[$slug];

/* ── Los 11 productos reales del estudio ──────────────────────────────
 * Esta lista es la LEYENDA del home (el «cuadro de piezas» del plano) y
 * la fuente del `makesOffer` del JSON-LD. Un producto se añade AQUÍ, una
 * sola vez.
 *
 * `url` a null = fila plana, sin flecha y sin hover. Es deliberado y lo
 * pidió Diseño: once filas donde solo algunas son enlaces, sin distinción
 * visual, es una interfaz que miente sobre dónde se puede pinchar. Media
 * afordancia no se entrega.
 *
 * Los códigos B01/G01/A01 no numeran servicios (el brief lo prohíbe): no
 * son un orden de lectura, son número de plano. */
$PRODUCTOS = [
  ['B01','BUILD','ERP &amp; internal tool suites','ERP y suites internas',
    '/services/custom-business-software','/es/servicios/software-de-gestion-a-medida'],
  ['B02','BUILD','Custom CRM','CRM a medida',
    '/services/custom-crm','/es/servicios/crm-a-medida'],
  ['B03','BUILD','WhatsApp AI chatbots','Bots de WhatsApp con IA',
    '/services/whatsapp-ai-chatbot','/es/servicios/chatbot-whatsapp-ia'],
  ['B04','BUILD','Automation &amp; autonomous agents','Automatizaciones y agentes autónomos',
    '/services/business-process-automation','/es/servicios/automatizacion-de-procesos'],
  ['B05','BUILD','Client portals','Portales de cliente',
    '/services/client-portals','/es/servicios/portal-de-clientes'],
  ['B06','BUILD','Integrations &amp; data','Integraciones y datos',
    '/services/integrations','/es/servicios/integraciones-y-datos'],
  ['B07','BUILD','Web design &amp; development','Diseño y desarrollo web',
    '/services/web-design-development','/es/servicios/diseno-y-desarrollo-web'],
  ['G01','GROW','Meta sales funnels','Funnels de venta en Meta',
    '/services/meta-ads','/es/servicios/meta-ads'],
  ['G02','GROW','SEO, SEM &amp; AI search','SEO, SEM y buscadores de IA',
    '/services/seo-sem','/es/servicios/seo-y-sem'],
  ['G03','GROW','Social &amp; content','Redes y contenido',
    '/services/social-content','/es/servicios/redes-sociales-y-contenido'],
  ['A01','ADVISORY','Management, brand &amp; direction','Gestión, marca y rumbo',
    '/services/management-brand-direction','/es/servicios/gestion-marca-y-rumbo'],
];

/* Los hubs. No son adorno: `/services/` sería un 403 sin ellos —el
 * `.htaccess` corta el rewrite en directorios (`!-d`) y `Options -Indexes`
 * devuelve Forbidden—, y el BreadcrumbList de las 12 hojas publicaría ese
 * 403 como nodo rastreable. Medido en producción sobre `/assets/`. */
$HUBS = [
  'en' => [
    'lang'=>'en','url'=>'/services/','codigo'=>'INDEX','eje'=>'',
    'title'=>'Services — custom software, bots, automation and Meta Ads · AxisWorks',
    'desc'=>'What AxisWorks builds: custom business software, CRM, WhatsApp AI chatbots, process automation, software for property developers, and Meta Ads funnels.',
    'eyebrow'=>'INDEX — WHAT WE BUILD',
    'h1'=>'Eleven things we build, on two axes',
    'lead'=>'BUILD is the software. GROW is what brings people to it. ADVISORY crosses both. Every sheet below is something running in production for somebody today.',
  ],
  'es' => [
    'lang'=>'es','url'=>'/es/servicios/','codigo'=>'INDEX','eje'=>'',
    'title'=>'Servicios — software a medida, bots, automatización y Meta Ads · AxisWorks',
    'desc'=>'Qué construye AxisWorks: software de gestión a medida, CRM, chatbots de WhatsApp con IA, automatización de procesos y embudos de venta en Meta Ads.',
    'eyebrow'=>'ÍNDICE — QUÉ CONSTRUIMOS',
    'h1'=>'Once cosas que construimos, sobre dos ejes',
    'lead'=>'BUILD es el software. GROW es lo que trae gente hasta él. ADVISORY atraviesa a los dos. Cada hoja de abajo es algo que hoy está corriendo en producción para alguien.',
  ],
];

/* Indexado por IDIOMA y luego por slug, nunca fusionado en un solo mapa:
 * `meta-ads` existe en los dos idiomas y un `+` de arrays se habría comido
 * la versión española en silencio. */
$HOJAS = ['en' => $HOJAS_EN, 'es' => $HOJAS_ES];

/* Orden de las hojas por idioma — lo consume la navegación «hoja anterior /
 * hoja siguiente», que es lo más barato que convierte seis páginas huérfanas
 * en una colección. */
$ORDEN = [
  'en' => ['custom-business-software','custom-crm','whatsapp-ai-chatbot',
           'business-process-automation','client-portals','integrations',
           'web-design-development','property-developer-software','meta-ads',
           'seo-sem','social-content','management-brand-direction'],
  'es' => ['software-de-gestion-a-medida','crm-a-medida','chatbot-whatsapp-ia',
           'automatizacion-de-procesos','portal-de-clientes','integraciones-y-datos',
           'diseno-y-desarrollo-web','meta-ads','seo-y-sem','redes-sociales-y-contenido',
           'gestion-marca-y-rumbo','cuanto-cuesta-un-software-a-medida'],
];

/* Textos de cáscara: nav, footer y los rótulos que se repiten. Un solo sitio
 * por idioma; nunca escritos dentro de una página. */
$T = [
  'en' => [
    'nav_services'=>'Services','nav_work'=>'Work','nav_process'=>'Process',
    'nav_studio'=>'Studio','nav_cta'=>'Start a project','nav_home'=>'Home',
    'spec'=>'SPEC','scope'=>'SCOPE','case'=>'FIELD CASE','faq'=>'FAQ',
    'prev'=>'PREV SHEET','next'=>'NEXT SHEET','index'=>'ALL SHEETS',
    'cta_h'=>'Have something worth building well?',
    'cta_p'=>'Tell us what you are working on. We reply in English or Spanish, usually within a day.',
    'langs'=>'English / Español',
    'foot'=>'PRECISION-BUILT','sheet'=>'SHEET','rev'=>'REV','axis'=>'AXIS','lang_l'=>'LANG',
    'breadcrumb_home'=>'Home','breadcrumb_services'=>'Services',
    'hj_principle'=>'PRINCIPLE','hj_flow'=>'HOW IT FLOWS','hj_sample'=>'SAMPLE DATA','hj_modules'=>'MODULES',
    'hj_sample_note'=>'Sample data in the shape of the real tool. No names, no amounts.',
    'hj_live'=>'IN PRODUCTION','hj_case_btn'=>'THE LAWANG CASE','hj_scope_th'=>['#','Component','What it means'],
  ],
  'es' => [
    'nav_services'=>'Servicios','nav_work'=>'Trabajo','nav_process'=>'Proceso',
    'nav_studio'=>'Estudio','nav_cta'=>'Empezar proyecto','nav_home'=>'Inicio',
    'spec'=>'QUÉ ES','scope'=>'QUÉ INCLUYE','case'=>'CASO REAL','faq'=>'PREGUNTAS',
    'prev'=>'HOJA ANTERIOR','next'=>'HOJA SIGUIENTE','index'=>'TODAS LAS HOJAS',
    'cta_h'=>'¿Tienes algo que merezca construirse bien?',
    'cta_p'=>'Cuéntanos en qué trabajas. Respondemos en español o inglés, normalmente en un día.',
    'langs'=>'English / Español',
    'foot'=>'HECHO CON PRECISIÓN','sheet'=>'HOJA','rev'=>'REV','axis'=>'EJE','lang_l'=>'IDIOMA',
    'breadcrumb_home'=>'Inicio','breadcrumb_services'=>'Servicios',
    'hj_principle'=>'PRINCIPIO','hj_flow'=>'CÓMO FLUYE','hj_sample'=>'DATOS DE EJEMPLO','hj_modules'=>'MÓDULOS',
    'hj_sample_note'=>'Datos de ejemplo con la forma de la herramienta real. Sin nombres ni importes.',
    'hj_live'=>'EN PRODUCCIÓN','hj_case_btn'=>'EL CASO LAWANG','hj_scope_th'=>['#','Pieza','Qué significa'],
  ],
];
