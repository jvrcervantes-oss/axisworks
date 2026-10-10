<?php
/* actividad_textos.php — textos de «Actividad del estudio» (10-oct-2026), EN y ES.
 * Fuente de lo que se puede decir: contexto/estudio_en_vivo_contrato.md §7 (Legal, 10-oct).
 * Reglas que este fichero cumple y que S3 vuelve a comprobar con Legal:
 *   · NUNCA: «en vivo», «tiempo real», «ahora mismo», «activo/trabajando ahora», «sin humanos»,
 *     «100 % autónoma», «independiente» sin matiz, cifras de agentes, tareas o velocidad.
 *   · Lo que se enseña es «agentes de IA lanzados por departamento», con retraso: no mide trabajo,
 *     resultado ni duración. Las coordinaciones se llaman «revisiones previas de planes entre agentes de IA».
 *   · El mensaje es en dos partes: el estudio trabaja con IA bajo supervisión humana; los agentes
 *     autónomos (AaaS) son un producto previsto y no están en servicio.
 *   · Ningún cliente, proyecto, importe ni texto de trabajo: la página solo conoce los 17 departamentos.
 * Los textos que pinta red.js en modo datos viven en el propio red.js (diccionario X.R). */
$ACT = [
'en' => [
  'title'   => 'Studio activity — AxisWorks',
  'desc'    => 'A delayed, aggregated record of which of AxisWorks’ AI departments were launched. AI teams under human oversight. No customers, projects or amounts.',
  'name'    => 'Studio activity',
  'eyebrow' => 'Delayed record',
  'h1'      => 'Studio <em>activity</em>',
  'sub'     => 'A record of which of our AI departments were launched, published about two hours late and grouped into broad areas. AI teams under human oversight: a person decides what matters.',
  'k_dep'   => 'Departments', 'k_data' => 'Data up to', 'k_delay' => 'Delay', 'k_st' => 'Record',
  'leg_h'   => 'Layers of the studio',
  'leg'     => ['Decides · gate','Review the plan','Spawned subagents','Products','Build and create','Publish','Input · output','Human oversight'],
  'st_h'    => 'How to read the states',
  'st_leg'  => [['rec3','Recorded in the last hour'],['rec2','Recorded in the last 24 hours'],['rec1','Not enough record'],['strc','Structure: a step of the path, no state of its own']],
  'noscript'=> 'This page draws the studio’s departments and, when a current record is available, which of them were launched recently. It needs JavaScript. Without it, there is nothing to show here.',
  'note_h'  => 'What this page is, and what it is not',
  'notes'   => [
    '<b>AI notice.</b> The work recorded here is done by AI agents. AxisWorks is a studio of AI teams under human oversight; a person decides what matters: price, publishing, deleting, spending, delivery.',
    '<b>What is recorded.</b> That an AI agent of a department was launched. It does not measure work done, results, duration or productivity, and it is not a view of current work. The record is published with about two hours’ delay and refreshed when the studio opens a session, so it can fall silent. If it expires, this page says so and shows no state.',
    '<b>Never shown.</b> Customers, projects, amounts, files or the text of any task. Only the departments, grouped in broad areas, with a minimum threshold below which a department shows as “not enough record”.',
    '<b>Autonomous agents.</b> Agents as a Service, autonomous within hard limits the client sets, is a planned product and is not in service yet. <a href="%AAAS%">How it works and where it stands</a>.',
    'AxisWorks is the trade name of PT Mahkota Property Global (Indonesia), responsible for this page. The record is a static file; this page does not track visitors beyond what the hosting keeps in its server logs. <a href="%PRIV%">Privacy</a>.',
  ],
  'cta_h'   => 'Want to see how we would work on your business?',
  'cta_p'   => 'Tell us what you run. We will show you the ERP, the agents and the site that would sit around it.',
  'cta'     => 'Talk to the studio', 'back' => 'Back to the studio',
  'jsonld'  => 'Studio activity',
],
'es' => [
  'title'   => 'Actividad del estudio — AxisWorks',
  'desc'    => 'Registro agregado y con retraso de qué departamentos de IA de AxisWorks se lanzaron. Equipos de IA bajo supervisión humana. Sin clientes, proyectos ni importes.',
  'name'    => 'Actividad del estudio',
  'eyebrow' => 'Registro con retraso',
  'h1'      => 'Actividad <em>del estudio</em>',
  'sub'     => 'Registro de qué departamentos de IA del estudio se lanzaron, publicado con unas dos horas de retraso y agrupado en áreas amplias. Equipos de IA bajo supervisión humana: una persona decide lo que importa.',
  'k_dep'   => 'Departamentos', 'k_data' => 'Datos hasta', 'k_delay' => 'Retraso', 'k_st' => 'Registro',
  'leg_h'   => 'Capas del estudio',
  'leg'     => ['Decide · puerta','Opinan sobre el plan','Subagentes que se levantan','Productos','Construyen y crean','Publican','Entrada · salida','Supervisión humana'],
  'st_h'    => 'Cómo leer los estados',
  'st_leg'  => [['rec3','Registrado en la última hora'],['rec2','Registrado en las últimas 24 horas'],['rec1','Sin registro suficiente'],['strc','Estructura: un paso del camino, sin estado propio']],
  'noscript'=> 'Esta página dibuja los departamentos del estudio y, cuando hay un registro vigente, cuáles se lanzaron hace poco. Necesita JavaScript. Sin él no hay nada que mostrar aquí.',
  'note_h'  => 'Qué es esta página y qué no es',
  'notes'   => [
    '<b>Aviso de IA.</b> El trabajo que se registra aquí lo hacen agentes de IA. AxisWorks es un estudio de equipos de IA bajo supervisión humana; una persona decide lo que importa: precio, publicar, borrar, gastar, entrega.',
    '<b>Qué se registra.</b> Que se lanzó un agente de IA de un departamento. No mide trabajo hecho, resultados, duración ni productividad, y no es una vista del trabajo actual. El registro se publica con unas dos horas de retraso y se renueva cuando el estudio abre sesión, así que puede quedarse en silencio. Si caduca, esta página lo dice y no muestra ningún estado.',
    '<b>Nunca se muestra.</b> Clientes, proyectos, importes, ficheros ni el texto de ninguna tarea. Solo los departamentos, agrupados en áreas amplias y con un umbral mínimo por debajo del cual un departamento sale como «sin registro suficiente».',
    '<b>Agentes autónomos.</b> Agentes como servicio, autónomos dentro de límites duros que fija el cliente, es un producto previsto y todavía no está en servicio. <a href="%AAAS%">Cómo funciona y en qué punto está</a>.',
    'AxisWorks es el nombre comercial de PT Mahkota Property Global (Indonesia), responsable de esta página. El registro es un fichero estático; esta página no rastrea visitantes más allá de lo que guarda el alojamiento en sus registros de servidor. <a href="%PRIV%">Privacidad</a>.',
  ],
  'cta_h'   => '¿Quieres ver cómo trabajaríamos sobre tu negocio?',
  'cta_p'   => 'Cuéntanos qué llevas. Te enseñamos el ERP, los agentes y la web que lo rodearían.',
  'cta'     => 'Hablar con el estudio', 'back' => 'Volver al estudio',
  'jsonld'  => 'Actividad del estudio',
],
];
