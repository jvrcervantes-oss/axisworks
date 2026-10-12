<?php
/* t_hoja.php — textos de la CÁSCARA de la mesa C02 (hoja de servicio) del diseño «X marks the work», en EN y ES.
 * Solo la cáscara: lo que dice cada hoja (h1, lead, spec, panel, flujo, scope, faq…) vive en inc/hojas_*.php e
 * inc/campo_*.php y se pinta tal cual (ya es HTML). Las claves crm_* son la redacción propia de custom-crm que la
 * mesa trae (Diseño #284: solo esa hoja las conserva). El EN es el literal de la mesa; el ES, corto y natural. */
return [
'en' => [
    'services_index' => 'Services',
  /* barra de la mesa (mismas claves que la portada) */
  'a' => 'a', 'is' => 'is', 'works' => 'works', 'axisworks_home' => 'axisworks home',
  'main' => 'Main', 'main_compact' => 'Main, compact', 'language' => 'Language',
  'what_we_sell' => 'What we sell', 'how_we_work' => 'How we work', 'studio' => 'Studio', 'tools' => 'Tools',
  'erp' => 'ERP', 'x' => '↗', 'erp_2' => 'ERP ↗', 'talk_to_the_studio' => 'Talk to the studio', 'menu' => 'Menu',
  'es_espanol' => 'ES · Español',
  /* cabecera */
  'breadcrumb' => 'Breadcrumb', 'home' => 'Home', 'services' => 'Services', 'x_2' => '×',
  'the_rule_we_build' => 'THE RULE WE BUILD BY',
  /* rótulos de sección: el número lo pone la plantilla; el H2 genérico es este mismo rótulo */
  'l_what' => 'What it is', 'l_seen' => 'Seen working', 'l_flow' => 'How it flows', 'l_incl' => "What's included",
  'l_where' => 'Where it runs', 'l_faq' => 'Questions',
  /* 02 */
  'sample_data' => 'SAMPLE DATA', 'n_of_n' => '{n} OF {n}',
  'sample_note' => 'Sample data in the shape of the real tool: no names, no amounts.',
  /* 03 */
  'step' => 'STEP',
  /* 04: «Seven parts, one record.» con la palabra del número de partes */
  'parts' => 'parts,', 'one_record' => 'one record.',
  'n7' => 'Seven', 'n8' => 'Eight',
  'component' => 'COMPONENT', 'what_it_means' => 'WHAT IT MEANS', 'x_4' => '#',
  /* anterior / siguiente */
  'sheets' => 'Sheets', 'prev_sheet' => '← PREV SHEET', 'next_sheet' => 'NEXT SHEET →', 'all_sheets' => 'ALL SHEETS',
  /* cierre */
  'have_something' => 'Have something', 'worth_building_well' => 'worth building well?',
  'tell_us_what_you' => 'Tell us what you are working on. We usually reply within a day.',
  'hello_axisworks_studio' => 'hello@axisworks.studio →',
  'your_name' => 'Your name', 'work_email' => 'Work email', 'company' => 'Company', 'optional' => 'OPTIONAL',
  'what_do_you_need' => 'What do you need?', 'send' => 'Send',
  /* pie */
  'axisworks_built_to_order' => 'AXISWORKS × BUILT TO ORDER', 'sheet' => 'SHEET', '2026' => '© 2026',
  'legal_notice' => 'Legal notice', 'privacy' => 'Privacy', 'cookies' => 'Cookies', 'footer' => 'Footer',
  /* custom-crm: H2 de la mesa */
  'crm_h01a' => 'Intake first.', 'crm_h01b' => 'Pipeline after.',
  'crm_h02a' => 'Every lead,', 'crm_h02b' => 'its next step.',
  'crm_h03a' => 'From ad form', 'crm_h03b' => 'to contract.',
  'crm_h06a' => 'Asked', 'crm_h06b' => 'before.',
  /* custom-crm: 05 «Where it runs» */
  'module_of_axisworks_erp' => 'MODULE OF AXISWORKS ERP · DEMO AVAILABLE',
  'this_crm_is_the' => 'This CRM is the Lead CRM', 'of_axisworks_erp' => 'of AxisWorks ERP.',
  'leads_come_in_on' => 'Leads come in on their own, and each one has a dated next step. The CRM shares one database with contracts, invoicing and collections, so the record a lead starts becomes the deal, the contract and the payment schedule.',
  'open_the_erp_demo' => 'Open the ERP demo →',
  'configurable_stage_funnel' => 'Configurable stage funnel',
  'a_for_today_inbox' => 'A “for today” inbox with overdue leads flagged',
  'closing_calendar_lead_assignment' => 'Closing calendar, lead assignment and closer ranking',
],
'es' => [
    'services_index' => 'Servicios',
  'a' => 'a', 'is' => 'is', 'works' => 'works', 'axisworks_home' => 'axisworks, inicio',
  'main' => 'Principal', 'main_compact' => 'Principal, compacto', 'language' => 'Idioma',
  'what_we_sell' => 'Qué vendemos', 'how_we_work' => 'Cómo trabajamos', 'studio' => 'Estudio', 'tools' => 'Herramientas',
  'erp' => 'ERP', 'x' => '↗', 'erp_2' => 'ERP ↗', 'talk_to_the_studio' => 'Habla con el estudio', 'menu' => 'Menú',
  'es_espanol' => 'EN · English',
  'breadcrumb' => 'Ruta', 'home' => 'Inicio', 'services' => 'Servicios', 'x_2' => '×',
  'the_rule_we_build' => 'LA REGLA CON LA QUE CONSTRUIMOS',
  'l_what' => 'Qué es', 'l_seen' => 'En marcha', 'l_flow' => 'Cómo fluye', 'l_incl' => 'Qué incluye',
  'l_where' => 'Dónde funciona', 'l_faq' => 'Preguntas',
  'sample_data' => 'DATOS DE EJEMPLO', 'n_of_n' => '{n} DE {n}',
  'sample_note' => 'Datos de ejemplo con la forma de la herramienta real: sin nombres ni importes.',
  'step' => 'PASO',
  'parts' => 'piezas,', 'one_record' => 'una sola ficha.',
  'n7' => 'Siete', 'n8' => 'Ocho',
  'component' => 'PIEZA', 'what_it_means' => 'QUÉ SIGNIFICA', 'x_4' => '#',
  'sheets' => 'Hojas', 'prev_sheet' => '← HOJA ANTERIOR', 'next_sheet' => 'HOJA SIGUIENTE →', 'all_sheets' => 'TODAS LAS HOJAS',
  'have_something' => '¿Tienes algo', 'worth_building_well' => 'que merezca construirse bien?',
  'tell_us_what_you' => 'Cuéntanos en qué trabajas. Solemos contestar en un día.',
  'hello_axisworks_studio' => 'hello@axisworks.studio →',
  'your_name' => 'Tu nombre', 'work_email' => 'Correo de trabajo', 'company' => 'Empresa', 'optional' => 'OPCIONAL',
  'what_do_you_need' => '¿Qué necesitas?', 'send' => 'Enviar',
  'axisworks_built_to_order' => 'AXISWORKS × HECHO A MEDIDA', 'sheet' => 'HOJA', '2026' => '© 2026',
  'legal_notice' => 'Aviso legal', 'privacy' => 'Privacidad', 'cookies' => 'Cookies', 'footer' => 'Pie',
  'crm_h01a' => 'Primero, la entrada.', 'crm_h01b' => 'Después, el embudo.',
  'crm_h02a' => 'Cada lead,', 'crm_h02b' => 'su siguiente paso.',
  'crm_h03a' => 'Del formulario', 'crm_h03b' => 'al contrato.',
  'crm_h06a' => 'Ya nos lo', 'crm_h06b' => 'han preguntado.',
  'module_of_axisworks_erp' => 'MÓDULO DEL ERP DE AXISWORKS · CON DEMO',
  'this_crm_is_the' => 'Este CRM es el CRM de leads', 'of_axisworks_erp' => 'del ERP de AxisWorks.',
  'leads_come_in_on' => 'Los leads entran solos y cada uno tiene su siguiente paso con fecha. El CRM comparte base de datos con contratos, facturación y cobros: la ficha que abre un lead acaba siendo la venta, el contrato y el calendario de pagos.',
  'open_the_erp_demo' => 'Abrir la demo del ERP →',
  'configurable_stage_funnel' => 'Embudo con fases configurables',
  'a_for_today_inbox' => 'Una bandeja «para hoy» que marca los leads atrasados',
  'closing_calendar_lead_assignment' => 'Calendario de cierres, reparto de leads y ranking de cerradores',
],
];
