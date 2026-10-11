<?php
/* Textos del bloque ESTUDIO de la portada (home.php) y la línea de `alcance` de cada producto
 * (hub.php), en los dos idiomas y en un solo fichero. Toda clave nueva entra en LAS DOS columnas.
 * El resto de la portada vive en landing_textos.php desde la landing del 10-oct-2026.
 *
 * Limpieza del 11-oct-2026: se quitaron ~90 claves de la portada anterior (hero CAD, ERP de muestra,
 * BodaEnlace, cuadro de piezas, proceso, formulario de alta) que ya no pintaba ninguna página.
 * Siguen en git (commit bd11802 y anteriores) si hiciera falta recuperar alguna.
 *
 * Rediseño del 24-sep-2026 sobre el mockup de Stitch: se tomó su piel y su
 * composición; su TEXTO no. Nada de lo que hay aquí es una métrica: el
 * mockup traía latencias, tasas de conversión, «42 leads hoy», ciudades y
 * coordenadas que no salen de ninguna fuente, y se cayeron todas. Lo que
 * queda son hechos de estructura (una base por cliente, dos personas, los
 * departamentos, que se cuentan solos desde inc/organigrama.php) que se pueden defender uno por uno. */

$HOME = [

'en' => [
  'alcance'=>[
    'B01'=>'Sales, documents, money and operations in one place',
    'B02'=>'Pipelines shaped around how you sell',
    'B03'=>'Answer, qualify and book 24/7, then hand over to a person',
    'B04'=>'Processes that check and act on their own',
    'B05'=>'Each client sees their own file through a link',
    'B06'=>'Meta, WhatsApp, payment gateways, Sheets, Supabase',
    'B07'=>'Hand-coded sites, fast and bilingual',
    'G01'=>'Campaigns and creatives, leads straight into the CRM',
    'G02'=>'Visible in Google and in AI answers',
    'G03'=>'Content and cadence for your channels',
    'A01'=>'Where the company is going, and what to build first',
  ],

  'who_h2'=>'A two-person studio with an AI team behind it.',
  'who_1role'=>'Engineering &amp; architecture','who_1p'=>'Designs the systems.',
  'who_2role'=>'Design &amp; content','who_2p'=>'Leads the brand, the content and the visual design.',
  'who_3role'=>'CEO · artificial intelligence','who_3p'=>'The studio&rsquo;s CEO is an AI: it takes each brief, hands it to the {PALABRA} departments below and checks their work.',
  'deps_t'=>'REPORTING TO PEPITO // {PALABRA_MAY} AI DEPARTMENTS',
  'deps_note'=>'Each department is an AI agent working to written rules, and reports to Pepito. Javier and Andrea direct the work and sign off on what ships.',
  /* Los departamentos NO viven aquí: salen de inc/organigrama.php, generado desde la
     ficha pública de cada departamentos/<d>/prompt.md (tools/organigrama_web.py).
     Aquí solo queda la frase de cada sección, que es copy. */
  'org_secs'=>['BUILD'=>'The software', 'GROW'=>'Brand &amp; demand', 'CONTROL'=>'Rules, money &amp; paperwork'],
  /* Procesos autónomos: no son departamentos (no pasan por organigrama_web.py), trabajan solos
     con su propio cron y avisan a Pepito. A mano aquí, en los dos idiomas. Desde el 26-sep-2026
     el producto se nombra: BodaEnlace (decisión del owner; antes no se nombraba hasta el lanzamiento). */
  'auto_t'=>'AUTONOMOUS', 'auto_lema'=>'They run on their own schedule and report to Pepito',
  'auto'=>[
    ['vigilante', 'The Watchman', 'guards ad spend &amp; leads', 'Live', ['Checks campaigns and conversations around the clock', 'Pauses what isn&rsquo;t bringing leads', 'Alerts the owner on Telegram']],
    ['investigador', 'The Investigator', 'finds sales partners', 'Pilot', ['Finds and ranks agencies that can resell a client&rsquo;s product', 'Prepares the outreach kit', 'A person makes the first contact']],
    ['padrino', 'The Godfather', 'pilot on our own product, in shadow mode', 'Shadow mode', ['Drafts replies to the inbox', 'Proposes how to find customers', 'Writes the business plan and proposes how to carry it out', 'Being tested on <a href="https://bodaenlace.com">BodaEnlace</a>']],
  ],
],

'es' => [
  'alcance'=>[
    'B01'=>'Ventas, documentos, dinero y operación en un solo sitio',
    'B02'=>'Embudos hechos a la medida de cómo vendes',
    'B03'=>'Contesta, cualifica y agenda 24/7, y pasa a una persona',
    'B04'=>'Procesos que se revisan y actúan solos',
    'B05'=>'Cada cliente ve su expediente con un enlace',
    'B06'=>'Meta, WhatsApp, pasarelas de pago, Sheets, Supabase',
    'B07'=>'Webs escritas a mano, rápidas y bilingües',
    'G01'=>'Campañas y creatividades, leads directos al CRM',
    'G02'=>'Visible en Google y en las respuestas de la IA',
    'G03'=>'Contenido y ritmo para tus canales',
    'A01'=>'Hacia dónde va la empresa, y qué construir primero',
  ],

  'who_h2'=>'Un estudio de dos personas con un equipo de IA detrás.',
  'who_1role'=>'Ingeniería y arquitectura','who_1p'=>'Diseña los sistemas.',
  'who_2role'=>'Diseño y contenido','who_2p'=>'Lleva la marca, el contenido y el diseño visual.',
  'who_3role'=>'CEO · inteligencia artificial','who_3p'=>'El CEO del estudio es una IA: recibe cada encargo, lo reparte entre los {PALABRA} departamentos de abajo y revisa lo que entregan.',
  'deps_t'=>'BAJO PEPITO // {PALABRA_MAY} DEPARTAMENTOS DE IA',
  'deps_note'=>'Cada departamento es un agente de IA que trabaja con reglas escritas y responde ante Pepito. Javier y Andrea dirigen el trabajo y dan el visto bueno a lo que sale.',
  /* Los departamentos NO viven aquí: salen de inc/organigrama.php, generado desde la
     ficha pública de cada departamentos/<d>/prompt.md (tools/organigrama_web.py).
     Aquí solo queda la frase de cada sección, que es copy. */
  'org_secs'=>['BUILD'=>'El software', 'GROW'=>'Marca y demanda', 'CONTROL'=>'Reglas, dinero y papeles'],
  'auto_t'=>'AUTÓNOMOS', 'auto_lema'=>'Trabajan solos, con su propio horario, y responden ante Pepito',
  'auto'=>[
    ['vigilante', 'El Vigilante', 'vigila la inversión y los leads', 'En producción', ['Revisa campañas y conversaciones a todas horas', 'Pausa lo que no trae contactos', 'Avisa al dueño por Telegram']],
    ['investigador', 'El Investigador', 'busca socios comerciales', 'Piloto', ['Encuentra y ordena agencias que pueden revender el producto de un cliente', 'Prepara el material de contacto', 'El primer contacto lo hace una persona']],
    ['padrino', 'El Padrino', 'piloto sobre un producto nuestro, en modo sombra', 'Modo sombra', ['Prepara respuestas al correo', 'Propone cómo buscar clientes', 'Escribe el plan de negocio y propone cómo aplicarlo', 'Se prueba en <a href="https://bodaenlace.com">BodaEnlace</a>']],
  ],
],

];
