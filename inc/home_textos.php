<?php
/* Los textos de la portada, en los dos idiomas y en un solo fichero.
 *
 * Una plantilla (`home.php`) renderiza `/` y `/es/`: el español no puede
 * quedarse atrás porque no hay dos páginas que mantener, hay una y dos
 * columnas de texto. Toda clave nueva entra en LAS DOS columnas.
 *
 * Rediseño del 24-sep-2026 sobre el mockup de Stitch: se tomó su piel y su
 * composición; su TEXTO no. Nada de lo que hay aquí es una métrica: el
 * mockup traía latencias, tasas de conversión, «42 leads hoy», ciudades y
 * coordenadas que no salen de ninguna fuente, y se cayeron todas. Lo que
 * queda son hechos de estructura (una base por cliente, dos personas, nueve
 * departamentos) que se pueden defender uno por uno. */

$HOME = [

'en' => [
  'hud'=>'SHEET AW-01 · HOME',
  'hero_chip'=>'AXISWORKS — PRECISION-BUILT SOFTWARE',
  'hero_h1'=>'We measure twice. Everything aligns.',
  'hero_lead'=>'Custom business software, built and maintained by two people and a team of AI departments. No templates, no bloat.',
  'hero_cta'=>'Start a project','hero_cta2'=>'See the ERP',
  'm1_k'=>'ARCHITECTURE','m1_v'=>'1 DATABASE / CLIENT',
  'm2_k'=>'TEAM','m2_v'=>'2 PEOPLE + 9 AI DEPTS',
  'm3_k'=>'LANGUAGES','m3_v'=>'EN / ES',
  'instr'=>'INSTRUMENT — ✕ / 01','instr_hint'=>'MOVE THE CURSOR TO ALIGN',
  'hero_st_cal'=>'CALIBRATING','hero_st_ok'=>'ALIGNED',

  'erp_eyebrow'=>'SHEET ERP-01 // FLAGSHIP SYSTEM',
  'erp_h2'=>'One modular operating system for operation-heavy businesses.',
  'erp_chip'=>'One codebase for every client. One private database per client.',
  'erp_bar'=>'AXISWORKS ERP // DAILY DASHBOARD','erp_sample'=>'SAMPLE DATA',
  'erp_alert'=>'Reservation expires in 2 days — deposit still pending',
  'erp_today'=>'TODAY — WAITING ON SOMEONE',
  'erp_th'=>['Ref','Item','Owner','State','Due'],
  'erp_rows'=>[
    ['RSV-014','Plot reservation','Sales','Deposit pending','2 days',true],
    ['INV-208','Invoice','Admin','Awaiting receipt','Overdue',true],
    ['CTR-031','Construction contract','Legal','1 of 2 signatures','Today',false],
    ['LED-117','New lead from Meta Ads','Agent','Next step not set','Today',false],
  ],
  'erp_bot_t'=>'WHATSAPP AI SETTER',
  'erp_bot_h'=>'Qualifies the lead from the first message.',
  'erp_bot_p'=>'Answers, asks what an agent would ask, and hands the conversation to a person with the context attached.',
  'erp_bot_f'=>'HANDOFF: TO A HUMAN',
  'erp_mods'=>[
    ['01 // CORE','Daily dashboard','Team &amp; permissions','EN / ES interface'],
    ['02 // SALES','Lead CRM','AI setter on WhatsApp','Deals','Reservations','Commissions'],
    ['03 // DOCUMENTS','Contract generator','E-signature','AI reply assistant','Buyer portal'],
    ['04 // MONEY &amp; OPS','Invoicing EUR / IDR','Receipts','Treasury','Plot inventory','Construction'],
  ],
  'erp_vert_l'=>'VERTICALS','erp_vert_1'=>'Real estate','erp_vert_2'=>'Rental &amp; tours',
  'erp_proof_l'=>'IN PRODUCTION',
  'erp_proof'=>'A property developer with three projects in Bali runs sales, contracts, invoicing and construction in one system.',

  'cat_eyebrow'=>'SHEET CAT-01 // THE PARTS LIST',
  'cat_h2'=>'Eleven things we build.',
  'cat_note'=>'BUILD is software. GROW is audience. ADVISORY crosses both.',
  'cat_th'=>['Code','Product','Scope','Axis'],
  'alcance'=>[
    'B01'=>'Sales, documents, money and operations in one place',
    'B02'=>'Pipelines shaped around how you actually sell',
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
  'cat_ask'=>'Every project is quoted on its own scope. No price list.',

  'work_eyebrow'=>'SHEET WRK-01 // FIELD WORK','work_h2'=>'Selected work.',
  'tag_1'=>'TOURISM ✕ BOOKING','tag_2'=>'REAL ESTATE ✕ LUXURY','tag_3'=>'RENTAL ✕ DELIVERY',
  'tag_4'=>'PROPERTY ✕ PORTAL','tag_5'=>'HOSPITALITY ✕ BRAND',
  'work_live'=>'LIVE','work_private'=>'PRIVATE',

  'proc_eyebrow'=>'SHEET PRC-01 // FOUR PHASES','proc_h2'=>'Measure twice. Build once.',
  'proc'=>[
    ['Brief','We map how the company runs today and what hurts, before anything gets designed.','Written scope and quote'],
    ['Blueprint','Data model, modules and screens decided on paper. Your data gets its own database.','A blueprint you approve'],
    ['Build','Hand-coded, with design and development in the same hands, tested against real cases.','A working system in production'],
    ['Run &amp; maintain','We keep it running: monitoring, fixes and improvements as the business changes.','Ongoing'],
  ],
  'proc_out'=>'OUTPUT','proc_phase'=>'PHASE',

  'who_eyebrow'=>'SHEET STD-01 // THE STUDIO','who_h2'=>'A two-person studio with an AI team behind it.',
  'who_1role'=>'Engineering &amp; architecture','who_1p'=>'Designs the systems and writes the code. The build side of the studio.',
  'who_2role'=>'Design &amp; content','who_2p'=>'Shapes the brand, the content and the voice. The design side of the studio.',
  'deps_t'=>'THE NINE AI DEPARTMENTS',
  'deps_note'=>'Each department is an AI agent working to written rules. Javier and Andrea direct the work and sign off on what ships.',
  'deps'=>[
    ['Development','writes the code'],['Design','art direction'],['Data','integrations &amp; APIs'],
    ['Security','audits &amp; secrets'],['Marketing','Meta Ads &amp; SEO'],['Legal','contracts &amp; policies'],
    ['Docs','proposals &amp; reports'],['Bots','WhatsApp engine'],['Deploy','ships &amp; verifies'],
  ],

  'ct_eyebrow'=>'SHEET INT-01 // PROJECT INTAKE','ct_h2'=>'Have something worth building well?',
  'ct_lead'=>'Tell us what you run on today and what hurts. We reply in English or Spanish, usually within a day.',
  'f_name'=>'Your name','f_company'=>'Company','f_brief'=>'What you run on today, and what hurts',
  'f_brief_ph'=>'Spreadsheets, WhatsApp, five tools that do not talk to each other…',
  'f_req'=>'[REQ]','f_opt'=>'[OPT]',
  'f_send'=>'Send the brief',
  'f_note'=>'Opens your email app with the brief filled in. Or write to us directly:',
  'ct_email_l'=>'EMAIL','ct_based_l'=>'BASED','ct_based_v'=>'Spain ✕ Bali','ct_lang_l'=>'LANGUAGES',
  'asunto'=>'Enquiry — axisworks.studio',
  'm_name'=>'Name','m_company'=>'Company','m_brief'=>'Brief',
],

'es' => [
  'hud'=>'HOJA AW-01 · INICIO',
  'hero_chip'=>'AXISWORKS — SOFTWARE HECHO CON PRECISIÓN',
  'hero_h1'=>'Medimos dos veces. Todo encaja.',
  'hero_lead'=>'Software de gestión a medida, construido y mantenido por dos personas y un equipo de departamentos de IA. Sin plantillas, sin relleno.',
  'hero_cta'=>'Empezar un proyecto','hero_cta2'=>'Ver el ERP',
  'm1_k'=>'ARQUITECTURA','m1_v'=>'1 BASE DE DATOS / CLIENTE',
  'm2_k'=>'EQUIPO','m2_v'=>'2 PERSONAS + 9 DEPTOS IA',
  'm3_k'=>'IDIOMAS','m3_v'=>'ES / EN',
  'instr'=>'INSTRUMENTO — ✕ / 01','instr_hint'=>'MUEVE EL CURSOR PARA ALINEAR',
  'hero_st_cal'=>'CALIBRANDO','hero_st_ok'=>'ALINEADO',

  'erp_eyebrow'=>'HOJA ERP-01 // SISTEMA PRINCIPAL',
  'erp_h2'=>'Un solo sistema modular para empresas con mucha operación.',
  'erp_chip'=>'Un mismo código para todos los clientes. Una base de datos privada para cada uno.',
  'erp_bar'=>'AXISWORKS ERP // PANEL DEL DÍA','erp_sample'=>'DATOS DE EJEMPLO',
  'erp_alert'=>'Una reserva vence en 2 días — falta el depósito',
  'erp_today'=>'HOY — ESPERANDO A ALGUIEN',
  'erp_th'=>['Ref','Asunto','Quién','Estado','Vence'],
  'erp_rows'=>[
    ['RSV-014','Reserva de parcela','Ventas','Depósito pendiente','2 días',true],
    ['INV-208','Factura','Administración','Falta el recibí','Vencida',true],
    ['CTR-031','Contrato de obra','Legal','1 de 2 firmas','Hoy',false],
    ['LED-117','Lead nuevo de Meta Ads','Agente','Sin siguiente paso','Hoy',false],
  ],
  'erp_bot_t'=>'SETTER IA EN WHATSAPP',
  'erp_bot_h'=>'Cualifica al lead desde el primer mensaje.',
  'erp_bot_p'=>'Contesta, pregunta lo que preguntaría un comercial y pasa la conversación a una persona con el contexto adjunto.',
  'erp_bot_f'=>'RELEVO: A UNA PERSONA',
  'erp_mods'=>[
    ['01 // NÚCLEO','Panel del día','Equipo y permisos','Interfaz ES / EN'],
    ['02 // VENTAS','CRM de leads','Setter IA en WhatsApp','Operaciones','Reservas','Comisiones'],
    ['03 // DOCUMENTOS','Generador de contratos','Firma electrónica','Asistente de respuestas IA','Portal del comprador'],
    ['04 // DINERO Y OBRA','Facturación EUR / IDR','Recibís','Tesorería','Inventario de parcelas','Avance de obra'],
  ],
  'erp_vert_l'=>'VERTICALES','erp_vert_1'=>'Inmobiliaria','erp_vert_2'=>'Alquiler y excursiones',
  'erp_proof_l'=>'EN PRODUCCIÓN',
  'erp_proof'=>'Una promotora con tres proyectos en Bali lleva ventas, contratos, facturación y obra en un solo sistema.',

  'cat_eyebrow'=>'HOJA CAT-01 // CUADRO DE PIEZAS',
  'cat_h2'=>'Once cosas que construimos.',
  'cat_note'=>'BUILD es el software. GROW es la audiencia. ADVISORY atraviesa a los dos.',
  'cat_th'=>['Código','Producto','Alcance','Eje'],
  'alcance'=>[
    'B01'=>'Ventas, documentos, dinero y operación en un solo sitio',
    'B02'=>'Embudos hechos a cómo vendes de verdad',
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
  'cat_ask'=>'Cada proyecto se presupuesta por su alcance. No hay tarifa.',

  'work_eyebrow'=>'HOJA WRK-01 // TRABAJO DE CAMPO','work_h2'=>'Trabajo seleccionado.',
  'tag_1'=>'TURISMO ✕ RESERVAS','tag_2'=>'INMOBILIARIA ✕ LUJO','tag_3'=>'ALQUILER ✕ ENTREGA',
  'tag_4'=>'FINCAS ✕ PORTAL','tag_5'=>'HOSTELERÍA ✕ MARCA',
  'work_live'=>'EN VIVO','work_private'=>'PRIVADO',

  'proc_eyebrow'=>'HOJA PRC-01 // CUATRO FASES','proc_h2'=>'Medir dos veces. Construir una.',
  'proc'=>[
    ['Brief','Entendemos cómo funciona hoy la empresa y qué le duele, antes de diseñar nada.','Alcance y presupuesto por escrito'],
    ['Plano','Modelo de datos, módulos y pantallas decididos en papel. Tus datos, en su propia base.','Un plano que apruebas tú'],
    ['Construcción','Escrito a mano, con diseño y desarrollo en las mismas manos, probado con casos reales.','Un sistema funcionando en producción'],
    ['Mantenimiento','Lo mantenemos en marcha: vigilancia, arreglos y mejoras según cambia el negocio.','Continuo'],
  ],
  'proc_out'=>'ENTREGA','proc_phase'=>'FASE',

  'who_eyebrow'=>'HOJA STD-01 // EL ESTUDIO','who_h2'=>'Un estudio de dos personas con un equipo de IA detrás.',
  'who_1role'=>'Ingeniería y arquitectura','who_1p'=>'Diseña los sistemas y escribe el código. El lado build del estudio.',
  'who_2role'=>'Diseño y contenido','who_2p'=>'Da forma a la marca, al contenido y a la voz. El lado design del estudio.',
  'deps_t'=>'LOS NUEVE DEPARTAMENTOS DE IA',
  'deps_note'=>'Cada departamento es un agente de IA que trabaja con reglas escritas. Javier y Andrea dirigen el trabajo y dan el visto bueno a lo que sale.',
  'deps'=>[
    ['Desarrollo','escribe el código'],['Diseño','dirección de arte'],['Datos','integraciones y APIs'],
    ['Seguridad','auditorías y secretos'],['Marketing','Meta Ads y SEO'],['Legal','contratos y políticas'],
    ['Documentación','propuestas e informes'],['Bots','motor de WhatsApp'],['Deploy','publica y verifica'],
  ],

  'ct_eyebrow'=>'HOJA INT-01 // ALTA DE PROYECTO','ct_h2'=>'¿Tienes algo que merezca construirse bien?',
  'ct_lead'=>'Cuéntanos con qué funcionas hoy y qué te duele. Respondemos en español o inglés, normalmente en un día.',
  'f_name'=>'Tu nombre','f_company'=>'Empresa','f_brief'=>'Con qué funcionas hoy, y qué te duele',
  'f_brief_ph'=>'Hojas de cálculo, WhatsApp, cinco herramientas que no se hablan…',
  'f_req'=>'[OBL]','f_opt'=>'[OPC]',
  'f_send'=>'Enviar el brief',
  'f_note'=>'Abre tu programa de correo con el brief ya escrito. O escríbenos directamente:',
  'ct_email_l'=>'EMAIL','ct_based_l'=>'DESDE','ct_based_v'=>'España ✕ Bali','ct_lang_l'=>'IDIOMAS',
  'asunto'=>'Consulta — axisworks.studio',
  'm_name'=>'Nombre','m_company'=>'Empresa','m_brief'=>'Brief',
],

];
