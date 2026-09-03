<?php
/* Los textos de la portada, en los dos idiomas y en un solo fichero.
 *
 * Antes el inglés vivía dentro del marcado y el español dentro de un
 * diccionario JS, sobre la MISMA URL. Ahora hay dos URLs reales (`/` y
 * `/es/`) que renderiza la misma plantilla: el español no puede quedarse
 * atrás porque no hay dos páginas que mantener, hay una y dos columnas
 * de texto. */

$HOME = [

'en' => [
  'hud'=>'PRECISION SYSTEM · v1.0',
  'hero_kind'=>'DIGITAL STUDIO','hero_eyebrow'=>'EST. 2026',
  'hero_h1a'=>'Precision-built','hero_h1b'=>'software','hero_h1c'=>'brands',
  'hero_lead'=>'Two people, no templates. We build the tools a company runs on — and the campaigns that fill them.',
  'hero_cta'=>'Start a project','hero_cta2'=>'See what we build',
  'hero_st_cal'=>'CALIBRATING','hero_st_ok'=>'ALIGNED',

  'svc_eyebrow'=>'WHAT WE DO','svc_h2'=>'Two disciplines that cross at one point.',
  'svc_build_tag'=>'BUILD','svc_build_h'=>'Software &amp; web',
  'svc_build_p'=>'The systems a company actually runs on: internal suites, CRM, bots that answer, processes that watch themselves — and the websites that front them.',
  'svc_brand_tag'=>'GROW','svc_brand_h'=>'Reach &amp; acquisition',
  'svc_brand_p'=>'Getting the work in front of the right people, and turning that attention into enquiries somebody will actually answer.',
  'svc_adv_tag'=>'ADVISORY','svc_adv_h'=>'Management, brand and direction.',
  'svc_adv_p'=>'We also sit on the other side of the table: helping companies decide where they are going, how the brand should carry them there, and what to build first.',
  'svc_leyenda'=>'THE CATALOGUE — ELEVEN PIECES',
  'svc_ask'=>'Every project is quoted on its own. Tell us what you need and we will come back with scope and a price.',
  'svc_ask_cta'=>'Talk to us',

  'work_eyebrow'=>'SELECTED WORK','work_h2'=>'Selected work.',
  'tag_1'=>'TOURISM ✕ BOOKING','tag_2'=>'REAL ESTATE ✕ LUXURY','tag_3'=>'RENTAL ✕ DELIVERY',
  'tag_4'=>'PROPERTY ✕ PORTAL','tag_5'=>'HOSPITALITY ✕ BRAND',

  'proc_eyebrow'=>'HOW WE WORK','proc_h2'=>'Measure twice. Build once.',
  'proc_1h'=>'Measure','proc_1p'=>'We map the goals and the constraints before anything gets designed.',
  'proc_2h'=>'Build','proc_2p'=>'Hand-coded, structured, fast. Design and development in the same hands.',
  'proc_3h'=>'Refine','proc_3p'=>'We keep adjusting type and motion until nothing looks accidental.',
  'proc_4h'=>'Ship','proc_4p'=>'We deploy it, measure it and hand it over working.',

  'who_eyebrow'=>'THE STUDIO','who_h2'=>'Two people. One axis.',
  'who_1role'=>'Development','who_1p'=>'Designs the systems, ships the sites. The build side of the studio.',
  'who_2role'=>'Design, content &amp; social','who_2p'=>'Shapes the brand, the content and the voice. The design side of the studio.',

  'ct_eyebrow'=>'START HERE','ct_h2'=>'Have something worth building well?',
  'ct_lead'=>'Tell us what you are working on. We reply in English or Spanish, usually within a day.',
  'ct_email_l'=>'EMAIL','ct_based_l'=>'BASED','ct_based_v'=>'Spain ✕ Bali','ct_lang_l'=>'LANGUAGES',
  'ct_origin'=>'THE ORIGIN','foot_made'=>'PRECISION-BUILT',
  'asunto'=>'Enquiry — axisworks.studio',
],

'es' => [
  'hud'=>'SISTEMA DE PRECISIÓN · v1.0',
  'hero_kind'=>'ESTUDIO DIGITAL','hero_eyebrow'=>'EST. 2026',
  'hero_h1a'=>'Software','hero_h1b'=>'y marcas','hero_h1c'=>'de precisión',
  'hero_lead'=>'Dos personas, sin plantillas. Construimos las herramientas con las que funciona una empresa — y las campañas que se las llenan.',
  'hero_cta'=>'Empezar un proyecto','hero_cta2'=>'Ver qué construimos',
  'hero_st_cal'=>'CALIBRANDO','hero_st_ok'=>'ALINEADO',

  'svc_eyebrow'=>'QUÉ HACEMOS','svc_h2'=>'Dos disciplinas que se cruzan en un punto.',
  'svc_build_tag'=>'BUILD','svc_build_h'=>'Software y web',
  'svc_build_p'=>'Los sistemas con los que de verdad funciona una empresa: suites internas, CRM, bots que contestan, procesos que se vigilan solos — y las webs que los visten.',
  'svc_brand_tag'=>'CAPTACIÓN','svc_brand_h'=>'Alcance y captación',
  'svc_brand_p'=>'Poner el trabajo delante de la gente adecuada, y convertir esa atención en consultas que alguien vaya a contestar.',
  'svc_adv_tag'=>'ADVISORY','svc_adv_h'=>'Gestión, marca y rumbo.',
  'svc_adv_p'=>'También nos sentamos al otro lado de la mesa: ayudamos a decidir hacia dónde va la empresa, cómo la marca la lleva hasta ahí y qué construir primero.',
  'svc_leyenda'=>'EL CATÁLOGO — ONCE PIEZAS',
  'svc_ask'=>'Cada proyecto se presupuesta por separado. Cuéntanos qué necesitas y te devolvemos alcance y precio.',
  'svc_ask_cta'=>'Hablamos',

  'work_eyebrow'=>'TRABAJO SELECCIONADO','work_h2'=>'Trabajo seleccionado.',
  'tag_1'=>'TURISMO ✕ RESERVAS','tag_2'=>'INMOBILIARIA ✕ LUJO','tag_3'=>'ALQUILER ✕ ENTREGA',
  'tag_4'=>'FINCAS ✕ PORTAL','tag_5'=>'HOSTELERÍA ✕ MARCA',

  'proc_eyebrow'=>'CÓMO TRABAJAMOS','proc_h2'=>'Medir dos veces. Construir una.',
  'proc_1h'=>'Medir','proc_1p'=>'Mapeamos los objetivos y los límites antes de diseñar nada.',
  'proc_2h'=>'Construir','proc_2p'=>'Escrito a mano, estructurado, rápido. Diseño y desarrollo en las mismas manos.',
  'proc_3h'=>'Afinar','proc_3p'=>'Seguimos ajustando tipografía y movimiento hasta que nada parezca casual.',
  'proc_4h'=>'Entregar','proc_4p'=>'Lo desplegamos, lo medimos y te lo entregamos funcionando.',

  'who_eyebrow'=>'EL ESTUDIO','who_h2'=>'Dos personas. Un eje.',
  'who_1role'=>'Desarrollo e ingeniería','who_1p'=>'Escribe el código, diseña los sistemas, publica las webs. El lado build del estudio.',
  'who_2role'=>'Diseño, contenido y social','who_2p'=>'Da forma a la marca, al contenido y a la voz. El lado design del estudio.',

  'ct_eyebrow'=>'EMPIEZA AQUÍ','ct_h2'=>'¿Tienes algo que merezca construirse bien?',
  'ct_lead'=>'Cuéntanos en qué trabajas. Respondemos en español o inglés, normalmente en un día.',
  'ct_email_l'=>'EMAIL','ct_based_l'=>'DESDE','ct_based_v'=>'España ✕ Bali','ct_lang_l'=>'IDIOMAS',
  'ct_origin'=>'EL ORIGEN','foot_made'=>'HECHO CON PRECISIÓN',
  'asunto'=>'Consulta — axisworks.studio',
],

];
