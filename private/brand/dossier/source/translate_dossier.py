#!/usr/bin/env python3
"""Builds the English dossier boards (D*En.dc.html) from the Spanish ones by swapping text nodes."""
import re, sys, os

DIR = sys.argv[1]
NAMES = ['DCover', 'DWhat', 'DSell', 'DHow', 'DErp', 'DAgents', 'DCaseMoto', 'DCaseObra', 'DStudio', 'DContact']

T = {
    # shared
    'PERSONA': 'PERSON', 'SISTEMA': 'SYSTEM', 'CEO IA': 'AI CEO',
    'Ingeniería y arquitectura': 'Engineering &amp; architecture', 'Diseño y contenido': 'Design &amp; content',
    # titles
    'Portada': 'Cover', 'Qué hacemos': 'What we do', 'Qué vendemos': 'What we sell', 'Cómo trabajamos': 'How we work',
    'Caso: alquiler de motos': 'Use case: motorbike rental', 'Caso: promoción inmobiliaria': 'Use case: property development',
    'El estudio': 'The studio', 'La marca': 'The brand', 'Contacto': 'Contact',
    'La X de axisworks': 'The axisworks X', 'La X sobre Night': 'The X on Night', 'La X sobre Ultramarine': 'The X on Ultramarine',
    # cover
    'ESTUDIO DE SOFTWARE × EQUIPO DE IA': 'SOFTWARE STUDIO × AI TEAM',
    'Software a medida': 'Custom software', 'para llevar tu negocio': 'to run your business', 'con menos personas.': 'with fewer people.',
    'Construimos el software y los asistentes de IA que quitan a tu equipo el trabajo manual: leads, contratos, facturas, cobros y comisiones.':
        'We build the software and AI assistants that take manual work off your team: leads, contracts, invoices, payments and commissions.',
    'DEPARTAMENTOS DE IA CONSTRUYEN': 'AI DEPARTMENTS BUILD IT', 'PERSONAS FIRMAN CADA ENTREGA': 'PEOPLE SIGN OFF EVERY DELIVERY',
    'PRODUCTOS: ERP, AGENTES Y WEBS': 'PRODUCTS: ERP, AGENTS AND WEBSITES', 'SOFTWARE A MEDIDA HECHO CON IA': 'CUSTOM SOFTWARE BUILT WITH AI',
    # what
    '01 — QUÉ HACEMOS': '01 — WHAT WE DO', 'El trabajo manual,': 'Software does the work', 'lo hace el software.': 'your team does by hand.',
    'Vendemos software a medida hecho con IA. Lo construimos alrededor de cómo trabaja tu empresa, para que las tareas que se repiten las hagan el sistema y sus asistentes, y tu equipo dedique sus horas a lo que solo puede hacer una persona.':
        'We sell custom software built with AI. We build it around how your company works, so the system and its assistants handle the repetitive tasks and your team spends its hours on what only a person can do.',
    '01 · LEADS': '01 · LEADS', 'Se contestan, se cualifican y se agendan. Cuando hace falta, pasan a una persona.': 'Answered, qualified and booked. When needed, handed over to a person.',
    '02 · CONTRATOS': '02 · CONTRACTS', 'Se preparan en tres idiomas y se firman en línea.': 'Prepared in three languages and signed online.',
    '03 · FACTURAS': '03 · INVOICES', 'Salen del mismo sistema, sin pasar datos a mano.': 'Issued from the same system, with no data typed in by hand.',
    '04 · COBROS': '04 · PAYMENTS', 'Vencimientos y recibos, cada uno con su justificante.': 'Due dates and receipts, each with its proof of payment.',
    '05 · COMISIONES': '05 · COMMISSIONS', 'Se calculan desde las operaciones, sin hojas aparte.': 'Calculated from the deals, with no separate spreadsheets.',
    'EL OBJETIVO': 'THE GOAL', 'Bajar el coste operativo.': 'Lower operating costs.',
    'El mismo trabajo con menos horas de personal, y un equipo que puede crecer sin contratar al mismo ritmo.': 'The same work with fewer staff hours, and a team that can grow without hiring at the same pace.',
    'CÓMO LO HACEMOS': 'HOW WE DO IT', 'Software, agentes': 'Software, agents', 'y webs.': 'and websites.',
    'Un ERP modular, agentes de IA que trabajan sobre sus datos y webs que traen clientes. Todo del mismo estudio.': 'A modular ERP, AI agents that work on its data and websites that bring in customers. All from one studio.',
    'QUIÉN RESPONDE': 'WHO ANSWERS FOR IT', 'Dos personas': 'Two people', 'firman.': 'sign off.',
    'Diecisiete departamentos de IA construyen. Javier y Andrea revisan y firman cada entrega.': 'Seventeen AI departments build it. Javier and Andrea review and sign off every delivery.',
    # what (v2)
    'Estás pagando sueldos': 'You are paying salaries', 'por trabajo que puede hacer el software.': 'for work software can do.',
    'Construimos software a medida, con IA, que quita a tu equipo el trabajo que repite cada día. Tu empresa crece sin crecer en plantilla.':
        'We build custom software, with AI, that takes the work your team repeats every day off its hands. Your company grows without growing its headcount.',
    'HOY, A MANO': 'TODAY, BY HAND', 'CON AXISWORKS': 'WITH AXISWORKS', 'LEADS': 'LEADS', 'CONTRATOS': 'CONTRACTS', 'FACTURAS': 'INVOICES', 'COBROS': 'PAYMENTS', 'COMISIONES': 'COMMISSIONS',
    'Alguien contesta WhatsApp y copia cada contacto a una hoja.': 'Someone answers WhatsApp and copies each contact into a spreadsheet.',
    'El asistente contesta, cualifica y agenda a cualquier hora. Pasa a una persona cuando hace falta.': 'The assistant answers, qualifies and books 24/7, and hands over to a person when needed.',
    'Se rellenan uno a uno, copiando los datos del cliente.': "Filled in one by one, copying the client's details.",
    'Salen con los datos del cliente, en tres idiomas, y se firman en línea.': "Generated with the client's details, in 3 languages, signed online.",
    'Se hacen a mano y se envían una a una.': 'Made by hand and sent one by one.',
    'Se emiten desde el sistema y llegan solas por WhatsApp y por email.': 'Issued by the system and sent out by WhatsApp and email.',
    'Se persiguen por teléfono y se revisan en el banco.': 'Chased by phone and checked against the bank.',
    'Recordatorios automáticos y cada cobro registrado con su justificante.': 'Automatic reminders, and every payment recorded with its proof.',
    'Se calculan en una hoja aparte, a final de mes.': 'Worked out in a separate spreadsheet at month end.',
    'Se calculan solas desde las operaciones.': 'Calculated automatically from the deals.',
    'El mismo trabajo,': 'The same work,', 'con menos plantilla.': 'with a smaller team.', 'CÓMO': 'HOW',
    'Un ERP modular, agentes de IA que trabajan sobre sus datos y webs que traen clientes.': 'A modular ERP, AI agents that work on its data and websites that bring in customers.',
    'QUIÉN FIRMA': 'WHO SIGNS OFF', '17 departamentos de IA lo construyen. Javier y Andrea firman cada entrega.': '17 AI departments build it. Javier and Andrea sign off every delivery.',
    # what (v3)
    'Así cambia el día a día en dos negocios: un alquiler de motos y una promoción inmobiliaria.': 'This is how the day-to-day changes in two businesses: a motorbike rental and a property development.',
    'ALQUILER DE MOTOS · CASO COMPLETO EN LA PÁG. 7': 'MOTORBIKE RENTAL · FULL CASE ON P. 7', 'PROMOCIÓN INMOBILIARIA · CASO COMPLETO EN LA PÁG. 8': 'PROPERTY DEVELOPMENT · FULL CASE ON P. 8',
    'TALLER': 'WORKSHOP', 'PEDIDOS': 'ORDERS', 'DISPONIBLE': 'AVAILABILITY', 'RENTABILIDAD': 'PERFORMANCE', 'COMPRADORES': 'BUYERS',
    'Lo que hay que arreglar llega al mecánico por WhatsApp o de palabra.': 'The mechanic hears what to fix by WhatsApp or word of mouth.',
    'La devolución abre un parte de taller con lo que hay que revisar y cambiar.': 'The return opens a work order with what to check and what to replace.',
    'Falta una pieza y alguien tiene que llamar o escribir al proveedor.': 'A part is missing and someone has to call or message the supplier.',
    'El parte lanza solo el pedido de materiales al proveedor que corresponde.': 'The work order sends the parts order to the right supplier on its own.',
    'La moto ya está lista, pero sigue parada hasta que alguien se acuerda.': 'The bike is ready, but sits idle until someone remembers.',
    'Al cerrar el parte vuelve al calendario y el bot de WhatsApp la ofrece.': 'When the work order closes it goes back on the calendar and the WhatsApp bot offers it.',
    'Una moto se alquila poco y nadie lo ve hasta revisar los números.': 'A bike rents too little and nobody notices until the numbers come in.',
    'Los agentes lo detectan, buscan la causa y te proponen una oferta para aprobar.': 'The agents spot it, look for the cause and propose an offer for you to approve.',
    'Empieza la obra y alguien hace y envía las facturas una a una.': 'Works start and someone makes and sends the invoices one by one.',
    'El parte del jefe de obra emite todas las facturas y las envía por WhatsApp y email.': "The site manager's report issues every invoice and sends them by WhatsApp and email.",
    'Alguien mira quién no ha pagado y llama uno a uno.': 'Someone checks who has not paid and calls them one by one.',
    'Recordatorios automáticos hasta que el pago llega y queda registrado.': 'Automatic reminders until the payment arrives and is recorded.',
    'Los compradores llaman para preguntar por facturas y por la obra.': 'Buyers call to ask about invoices and the works.',
    'Lo ven en su portal: facturas, pagos y avance de la obra.': 'They see it in their portal: invoices, payments and progress on site.',
    '17 departamentos de IA lo construyen.': '17 AI departments build it.', 'Javier y Andrea firman cada entrega.': 'Javier and Andrea sign off every delivery.',
    # sell
    '02 — QUÉ VENDEMOS': '02 — WHAT WE SELL', 'Un ERP, los agentes que trabajan en él': 'An ERP, the agents that work on it', 'y las webs que traen clientes.': 'and websites that bring in customers.',
    'Llevas el negocio en el ERP. Los agentes trabajan con sus datos y las webs le traen clientes. Los tres los diseña, construye y mantiene el mismo estudio.':
        'You run the business in the ERP. The agents work on its data and the websites bring customers to it. The same studio designs, builds and maintains all three.',
    'ERP MODULAR': 'MODULAR ERP', 'Enciendes los módulos que tu negocio usa hoy y añades otros cuando los necesita.': 'You switch on the modules your business uses today and add others when it needs them.',
    'Promotoras': 'Properties', 'Reservas': 'Bookings', 'Servicios': 'Services',
    'Contratos, facturas y cobros en un solo sistema': 'Contracts, invoices and payments in one system', 'Una base de datos privada por cliente': 'One private database per client',
    '9 AGENTES POR NEGOCIO': '9 AGENTS PER BUSINESS', 'Un agente capitán lleva el día a día de tu negocio dentro de los límites que tú fijas.': 'A captain agent runs the day-to-day of your business inside the limits you set.',
    'Precio, publicar, borrar, gastar y enviar a terceros quedan para una persona': 'Price, publishing, deleting, spending and sending to third parties are reserved for a person',
    'Trabaja sobre los datos de tu ERP': 'Operates on your ERP data',
    'HECHAS A MEDIDA': 'BUILT TO ORDER', 'Webs y landings': 'Websites', 'Diseñadas, construidas, publicadas y probadas por el mismo equipo.': 'Designed, built, published and tested by the same team.',
    'SEO y Meta Ads desde el mismo estudio': 'SEO and Meta Ads from the same studio',
    'Un departamento aparte la prueba en producción antes de darla por terminada': 'A separate department tests it in production before we call it done',
    'TAMBIÉN A MEDIDA': 'ALSO BUILT TO ORDER', 'CRM y embudos de venta': 'CRM and sales pipelines', 'Asistente de WhatsApp 24/7': '24/7 WhatsApp assistant',
    'Automatizaciones': 'Automations', 'Portal del cliente': 'Client portal', 'Integraciones: Meta, WhatsApp, pasarelas de pago': 'Integrations: Meta, WhatsApp, payment gateways',
    'Campañas en Meta Ads': 'Meta Ads campaigns', 'SEO y visibilidad en IA': 'SEO and visibility in AI answers', 'Contenido para redes': 'Social media content',
    'Consultoría: qué construir primero': 'Consulting: what to build first',
    # how
    '03 — CÓMO TRABAJAMOS': '03 — HOW WE WORK', 'Así se convierte un encargo': 'How a request becomes', 'en software que funciona.': 'working software.',
    'Nos cuentas qué se hace a mano': 'You tell us what is done by hand',
    'Qué tareas le quitan más horas a tu equipo. Te decimos qué parte puede hacer el software y cuánto costaría construirlo.': 'Which tasks take your team the most hours. We tell you which parts software can take over and what it would cost to build.',
    'El CEO IA reparte el trabajo': 'The AI CEO hands out the work', 'Divide el encargo en tareas y las asigna a los departamentos de IA que corresponden.': 'It splits the request into tasks and assigns them to the right AI departments.',
    'Los departamentos lo construyen': 'The departments build it', 'Construyen, revisan y prueban. Calidad comprueba que funciona y Seguridad audita accesos y secretos.': 'They build, review and test. Quality proves it works and Security audits access and secrets.',
    'Javier y Andrea firman la entrega': 'Javier and Andrea sign off the delivery', 'Nada sale sin el visto bueno de una persona. Un departamento aparte lo prueba en producción.': "Nothing ships without a person's approval. A separate department tests it in production.",
    'RECIBE CADA ENCARGO · 17 DEPARTAMENTOS DE IA': 'TAKES EVERY REQUEST · 17 AI DEPARTMENTS',
    'CONSTRUIR': 'BUILD', 'El software': 'The software', 'CRECER': 'GROW', 'Marca y demanda': 'Brand &amp; demand', 'CONTROLAR': 'CONTROL', 'Reglas, dinero y papeles': 'Rules, money &amp; paperwork',
    'Arquitectura': 'Architecture', 'Juegos': 'Games', 'Juego 3D': 'Game 3D', 'Pilotos': 'Pilots', 'Diseño': 'Design', 'Comunicación': 'Communication',
    'Seguridad': 'Security', 'Calidad': 'Quality', 'Administración': 'Admin', 'Documentación': 'Docs', 'Organización': 'Organisation',
    'Cada departamento es un agente de IA que trabaja con reglas escritas y responde ante el CEO IA. Javier y Andrea dirigen el trabajo y dan el visto bueno a lo que sale.':
        'Each department is an AI agent that works to written rules and reports to the AI CEO. Javier and Andrea direct the work and sign off on what ships.',
    # erp
    '04 — AXISWORKS ERP': '04 — AXISWORKS ERP', 'Mismos módulos,': 'Same modules,', 'distinto inventario.': 'different inventory.',
    'Un ERP modular con contratos, facturas y cobros en un solo sistema. Cada empresa tiene su propia base de datos y enciende solo los módulos que usa.':
        'A modular ERP with contracts, invoices and payments in one system. Each company has its own database and switches on only the modules it uses.',
    'PROMOTORAS INMOBILIARIAS': 'PROPERTY DEVELOPERS', 'Proyectos y obra': 'Projects and sites',
    'Proyectos y parcelas, reservas con plazos, contratos en tres idiomas, pagos por hito de obra y un portal donde cada comprador sigue lo suyo.':
        'Projects and plots, reservations with deadlines, contracts in three languages, payments by construction milestone and a portal where each buyer follows their own.',
    'Proyectos y parcelas': 'Projects and plots', 'Reservas con plazos': 'Timed reservations', 'Contratos · 3 idiomas': '3-language contracts', 'Portal del comprador': 'Buyer portal',
    'NEGOCIOS DE RESERVAS': 'BOOKING BUSINESSES', 'Reservas por fechas': 'Bookings by date',
    'Reservas de un producto por fechas, con tarifas, disponibilidad y cobro, y un asistente de WhatsApp que contesta con tus propios datos.':
        'Bookings of a product by dates, with rates, availability and payment, and a WhatsApp assistant that answers with your own data.',
    'Reservas por fecha': 'Bookings by date', 'Tarifas y disponibilidad': 'Rates and availability', 'Cobro por reserva': 'Payment per booking', 'Asistente de WhatsApp': 'WhatsApp assistant',
    'EMPRESAS DE SERVICIOS': 'SERVICE COMPANIES', 'Catálogo y facturación': 'Catalogue and invoicing',
    'Un catálogo de productos y servicios facturado por línea, cobros con justificante y atención al cliente con su historial.':
        'A catalogue of products and services invoiced by line, collections with proof of payment and customer support with its history.',
    'Catálogo': 'Catalogue', 'Facturación por línea': 'Invoicing by line', 'Cobros con justificante': 'Proof of payment', 'Atención al cliente': 'Customer support',
    'módulos': 'modules', 'tipos de negocio': 'business types', 'base de datos por empresa': 'database per company', 'idiomas de contrato': 'contract languages',
    'LOS 30 MÓDULOS, POR ÁREA': 'THE 30 MODULES, BY AREA', 'Ventas': 'Sales', 'Documentos': 'Documents', 'Finanzas': 'Finance', 'Base de datos': 'Database', 'Panel de control': 'Control panel',
    # agents
    '05 — AGENTS AS A SERVICE': '05 — AGENTS AS A SERVICE', 'El agente propone,': 'The agent proposes,', 'una persona aprueba.': 'a person approves.',
    'Cada negocio tiene su propio equipo de nueve agentes. Un capitán lleva el día a día dentro de los límites que fija el dueño, y todo queda escrito en su ERP.':
        'Each business gets its own pack of nine agents. A captain runs the day-to-day inside the limits the owner sets, and everything is written to its ERP.',
    'CEO DEL NEGOCIO': 'CEO OF THE BUSINESS', 'Fija el plan y reparte el trabajo. Es la única voz ante el dueño.': 'Sets the plan and hands out the work. The only voice towards the owner.',
    'ATENCIÓN AL CLIENTE': 'CUSTOMER SERVICE', 'Contesta a los clientes y dice desde el primer mensaje que es una IA.': 'Answers customers and says from the first message that it is an AI.',
    'MERCADO Y ESTRATEGIA': 'MARKET &amp; STRATEGY', 'Lee el mercado y propone dónde apostar. Solo lectura.': 'Reads the market and proposes where to bet. Read-only.',
    'ANALÍTICA': 'ANALYTICS', 'Mide lo que da cada apuesta.': 'Measures what each bet delivers.',
    'CAPTACIÓN': 'ACQUISITION', 'Busca clientes con el presupuesto y los canales permitidos.': 'Finds customers within the budget and channels allowed.',
    'CREATIVIDAD Y CONVERSIÓN': 'CREATIVE &amp; CONVERSION', 'Escribe el contenido y las páginas que venden.': 'Writes the content and the pages that sell.',
    'ANÁLISIS DE CLIENTES': 'CUSTOMER ANALYSIS', 'Lee lo que dicen los clientes.': 'Reads what customers say.',
    'OPERACIONES': 'OPERATIONS', 'Se ocupa del día a día.': 'Looks after day-to-day operations.',
    'REGLAS DEL DINERO': 'MONEY RULES', 'Código, no un modelo: aplica el tope de gasto mensual.': 'Plain code, not a model: enforces the monthly spending cap.',
    'El dueño escribe el brief': 'The owner writes the brief', 'Misión, tope de gasto y permisos. El agente lo lee y nunca lo puede escribir.': 'Mission, spending cap and permissions. The agent can read it and can never write it.',
    'El agente propone': 'The agent proposes', 'Cada apuesta lleva hipótesis, medida, plazo y coste. Propone cambios; no los hace.': 'Every bet carries a hypothesis, a measure, a deadline and a cost. It proposes changes; it does not make them.',
    'Una persona aprueba': 'A person approves', 'Lo que toca un límite duro espera a una persona. Todo queda registrado en el ERP.': 'Anything that touches a hard stop waits for a person. Everything is recorded in the ERP.',
    'Lo que funciona se queda': 'What works stays', 'Una apuesta que funciona pasa a ser código que corre solo. La que no, se descarta.': 'A bet that works becomes code that runs by itself. One that does not is dropped.',
    'LÍMITES DUROS': 'HARD STOPS', 'Siempre para una persona': 'Always for a person',
    'Precio': 'Price', 'Publicar': 'Publishing', 'Borrar': 'Deleting', 'Gastar': 'Spending', 'Enviar a terceros': 'Sending to third parties',
    # case: motorbikes
    '06 — CASO DE USO · ALQUILER DE MOTOS': '06 — USE CASE · MOTORBIKE RENTAL', 'De la devolución': 'From the return', 'al siguiente alquiler.': 'to the next rental.',
    'Toda la flota vive en el ERP. Cada moto que vuelve sigue el mismo circuito, y nadie pasa datos de un sitio a otro: la única tarea de una persona es el trabajo de taller.':
        'The whole fleet lives in the ERP. Every bike that comes back follows the same circuit and nobody copies data from one place to another: the only task for a person is the workshop job.',
    'RECEPCIÓN · ERP': 'CHECK-IN · ERP', 'Entra la moto': 'The bike comes in', 'Se registra la devolución y la moto pasa a «en taller».': 'The return is logged and the bike moves to “in the workshop”.',
    'TALLER · PARTE DE TRABAJO': 'WORKSHOP · WORK ORDER', 'Se abre el parte': 'A work order opens',
    'El mecánico tiene en el parte qué revisar y qué cambiar, y lo cierra al terminar.': 'The mechanic sees in it what to check and what to replace, and closes it when done.',
    'COMPRAS · PROVEEDORES': 'PURCHASING · SUPPLIERS', 'Se piden los materiales': 'Parts are ordered',
    'Lo que el parte necesita sale como pedido al proveedor que corresponde.': 'Whatever the work order needs goes out as an order to the right supplier.',
    'RESERVAS · DISPONIBILIDAD': 'BOOKINGS · AVAILABILITY', 'Vuelve a estar disponible': 'Back to available',
    'Al cerrar el parte, la moto vuelve al calendario con sus tarifas.': 'When the work order closes, the bike goes back on the calendar with its rates.',
    'BOT · WHATSAPP': 'BOT · WHATSAPP', 'El bot la ofrece': 'The bot offers it',
    'El asistente la ofrece a quien pregunta, con precio y fechas reales, y cierra la reserva.': 'The assistant offers it to whoever asks, with real prices and dates, and closes the booking.',
    '↻ CUANDO LA MOTO VUELVE DEL SIGUIENTE ALQUILER, EL CIRCUITO EMPIEZA OTRA VEZ': '↻ WHEN THE BIKE COMES BACK FROM ITS NEXT RENTAL, THE CIRCUIT STARTS AGAIN',
    'Y si una moto no se alquila lo suficiente…': 'And if a bike is not renting enough…', 'AGENTS AS A SERVICE · VIGILA LA FLOTA': 'AGENTS AS A SERVICE · WATCHING THE FLEET',
    'Detecta': 'Spots it', 'una moto que se alquila menos que el resto de la flota.': 'a bike that rents less than the rest of the fleet.',
    'Busca la causa': 'Looks for the cause', 'en las métricas: ocupación, precio frente al mercado, temporada, lo que dicen los clientes.': 'in the metrics: occupancy, price against the market, season, what customers say.',
    'Propone una oferta': 'Proposes an offer', 'con su hipótesis, su plazo y cómo se va a medir.': 'with its hypothesis, its deadline and how it will be measured.',
    'EL DUEÑO': 'THE OWNER', 'La aprueba': 'Approves it', 'Precio y publicación son límites duros: decide una persona.': 'Price and publishing are hard stops: a person decides.',
    'La lanza y la mide': 'Launches and measures', 'Si funciona, se queda. Si no, se descarta y se prueba otra.': 'If it works, it stays. If not, it is dropped and another is tried.',
    # case: property
    '07 — CASO DE USO · PROMOCIÓN INMOBILIARIA': '07 — USE CASE · PROPERTY DEVELOPMENT', 'Un parte de obra': 'One site report', 'activa los cobros.': 'sets billing in motion.',
    'En una promoción, los compradores pagan por hitos de obra. El jefe de obra registra el avance y el ERP hace el resto: factura, avisa y recuerda los pagos.':
        'In a development, buyers pay by construction milestone. The site manager logs the progress and the ERP does the rest: it invoices, notifies and reminds buyers to pay.',
    'OBRA · PARTE DE TRABAJO': 'SITE · SITE REPORT', 'El jefe de obra marca el hito': 'The site manager marks the milestone',
    'Desde la obra, su parte registra el inicio de obra o el hito que toque.': 'From the site, their report logs the start of works or whichever milestone is due.',
    'FINANZAS · FACTURAS': 'FINANCE · INVOICES', 'Se emiten las facturas': 'Invoices are issued',
    'El ERP factura a cada comprador lo que marca su contrato para ese hito.': 'The ERP invoices each buyer what their contract sets for that milestone.',
    'WHATSAPP Y EMAIL': 'WHATSAPP AND EMAIL', 'Se envían solas': 'They go out on their own', 'Cada comprador recibe su factura por WhatsApp y por email.': 'Each buyer gets their invoice by WhatsApp and by email.',
    'PORTAL DEL COMPRADOR': 'BUYER PORTAL', 'Le espera en su portal': 'Waiting in their portal',
    'El aviso le lleva a su portal, donde ve sus facturas, sus pagos y el avance de la obra.': 'The notice takes them to their portal, where they see their invoices, their payments and how the works are going.',
    'COBROS · RECORDATORIOS': 'PAYMENTS · REMINDERS', 'Recuerda el pago': 'Reminds them to pay',
    'Si el pago no llega, salen recordatorios automáticos hasta que queda cobrado y registrado.': 'If the payment does not arrive, automatic reminders go out until it is paid and recorded.',
    'LO QUE HACE UNA PERSONA': 'WHAT A PERSON DOES', 'Un parte de obra.': 'One site report.',
    'Lo rellena el jefe de obra, desde la propia obra. Todo lo demás sale solo.': 'The site manager fills it in, on site. Everything else runs on its own.',
    'EJEMPLO DE AVISO · WHATSAPP': 'SAMPLE NOTICE · WHATSAPP',
    'Hola. Ya tienes en tu portal la factura del hito «Inicio de obra» de tu vivienda, junto con tu calendario de pagos.': 'Hello. The invoice for the “Start of works” milestone on your home is now in your portal, along with your payment schedule.',
    'FACTURA.PDF · VER EN EL PORTAL ›': 'INVOICE.PDF · VIEW IN PORTAL ›', 'Recordatorio: el pago de este hito vence en 5 días.': 'Reminder: payment for this milestone is due in 5 days.',
    'Texto de ejemplo. El mismo aviso llega por email.': 'Sample text. The same notice arrives by email.',
    'LO QUE HACE EL SISTEMA, SOLO': 'WHAT THE SYSTEM DOES ON ITS OWN', 'Las facturas de cada comprador': "Each buyer's invoices",
    'El envío por WhatsApp y por email': 'Sending them by WhatsApp and email', 'El aviso de que está en su portal': 'Telling them it is in their portal',
    'Los recordatorios de pago': 'The payment reminders', 'El registro del cobro': 'Recording the payment',
    # studio
    '08 — EL ESTUDIO': '08 — THE STUDIO', 'Un estudio de dos personas': 'A two-person studio', 'con un equipo de IA detrás.': 'with an AI team behind it.',
    'PERSONA · CONSTRUIR': 'PERSON · BUILD', 'Diseña los sistemas y firma lo que sale.': 'Designs the systems and signs off what ships.', 'FIRMA · SISTEMAS Y ENTREGAS': 'SIGNS OFF · SYSTEMS AND DELIVERIES',
    'IA · DIRIGE EL ESTUDIO': 'AI · RUNS THE STUDIO', 'Reparte cada encargo': 'Dispatches every brief',
    'Recibe cada encargo, lo reparte entre los diecisiete departamentos y revisa lo que entregan.': 'Takes each brief, hands it to the seventeen departments and checks their work.',
    'RESPONDEN ANTE ÉL · 17 DEPARTAMENTOS': '17 DEPARTMENTS REPORT TO IT',
    'PERSONA · DISEÑO': 'PERSON · DESIGN', 'Lleva la marca, el contenido y el diseño visual, y aprueba las interfaces.': 'Leads the brand, the content and the visual design, and approves the interfaces.',
    'APRUEBA · MARCA E INTERFACES': 'APPROVES · BRAND AND INTERFACES',
    'departamentos de IA en tres áreas: construir el software, hacer crecer la marca y controlar reglas, dinero y papeles.': 'AI departments in three areas: building the software, growing the brand, and controlling rules, money and paperwork.',
    'personas dirigen el trabajo y dan el visto bueno a todo lo que sale del estudio.': 'people direct the work and sign off everything that leaves the studio.',
    'MIEMBRO DEL PROGRAMA': 'PROGRAM MEMBER',
    'Claude for Startups es el programa de Anthropic para startups que construyen con Claude. Nuestros departamentos de IA trabajan con Claude.':
        "Claude for Startups is Anthropic's program for startups that build with Claude. Our AI departments work with Claude.",
    # brand
    '09 — LA MARCA': '09 — THE BRAND', 'Dos líneas,': 'Two lines,', 'un punto.': 'one point.',
    'La x siempre fue el centro del nombre. Ahora es el centro de todo: dos barras, construir y marca, que se cruzan en un punto. Vive dentro del nombre y también funciona sola como símbolo.':
        'The x was always the middle of the name. Now it is the middle of everything: two bars, build and brand, crossing at one point. It lives inside the wordmark and also works alone as the symbol.',
    'SOBRE NIGHT · PUNTO CHALK': 'ON NIGHT · CHALK POINT', 'LOGOTIPO': 'WORDMARK', 'SOBRE ULTRAMARINE': 'ON ULTRAMARINE',
    'La barra de construir': 'The build bar', 'La señal en marcha': 'The live signal', 'Fondo por defecto': 'Default background', 'Menú y secciones claras': 'Menu and light sections',
    'Titulares · 600 y 300': 'Headlines · 600 and 300', 'Texto e interfaz': 'Text and interface', 'Datos y etiquetas': 'Data and labels',
    'MOVIMIENTO': 'MOTION', 'Lo que se mueve es trabajo en marcha. Entradas suaves de 200 a 700 ms; nada se mueve por adornar.': 'What moves is work happening. Soft entrances from 200 to 700 ms; nothing moves for decoration.',
    'CÓMO HABLAMOS': 'HOW WE SPEAK', 'Concreto y en corto. Decimos qué hace el software y quién lo firma. Nunca inventamos pruebas ni cifras.': 'Concrete and short. We say what the software does and who signs it off. We never invent proof or figures.',
    'Sí:': 'Yes:', '«Contesta, cualifica y agenda, y pasa a una persona.»': '“Answers, qualifies and books, then hands over to a person.”',
    '«Revoluciona tu negocio con el poder de la IA.»': '“Revolutionise your business with the power of AI.”',
    # contact
    '09 — HABLEMOS': "09 — LET'S TALK", '¿Qué trabajo le quita': 'What takes your team', 'más horas a tu equipo?': 'the most hours?',
    'Cuéntanos qué hace tu equipo a mano hoy. Te decimos qué parte puede hacer el software y cuánto costaría construirlo.': 'Tell us what your team does by hand today. We will tell you which parts software can take over and what it would cost to build.',
    'Miembro del programa de Anthropic': "Member of Anthropic's program",
}
KEEP = re.compile(r'^([\d\s·/✓—→]+|#[0-9A-F]{6}|Aa|a|is|works|axisworks|No:|Frontend|Backend|Bots|Deploy|Marketing|Legal|Javier|Andrea|AxisWorks ERP|Agents as a Service|Claude for Startups|'
                  r'Captain|Reception|Radar|Figures|Hook|Quill|Listener|Route|Treasurer|FIGURES|CAPTAIN|RADAR · LISTENER|QUILL · HOOK · FIGURES|Ultramarine|Volt|Night|Chalk|Unbounded|Manrope|IBM Plex Mono|'
                  r'cubic-bezier.*|200 · 450 · 700 ms|hello@axisworks\.studio|axisworks\.studio|AXISWORKS\.STUDIO · HELLO@AXISWORKS\.STUDIO|DOSSIER 2026 · \d\d / \d\d|01 · LEADS|04 — AXISWORKS ERP|05 — AGENTS AS A SERVICE|BOT · WHATSAPP)$')

missing = []
for n in NAMES:
    s = open(os.path.join(DIR, n + '.dc.html')).read()
    s = s.replace('<html lang="es">', '<html lang="en">').replace('DOSIER 2026', 'DOSSIER 2026')
    s = re.sub(r'<title>axisworks — Dosier · ([^<]+)</title>', lambda m: f'<title>axisworks — Dossier · {T.get(m.group(1), m.group(1))}</title>', s)
    s = re.sub(r'aria-label="([^"]+)"', lambda m: f'aria-label="{T.get(m.group(1), m.group(1))}"', s)
    head, sep, body = s.partition('</helmet>')

    def swap(m):
        raw = m.group(1); key = raw.strip()
        if not key: return m.group(0)
        if key in T: return '>' + raw.replace(key, T[key]) + '<'
        if not KEEP.match(key) and not key.startswith('axisworks — Dossier'): missing.append((n, key))
        return m.group(0)
    body = re.sub(r'>([^<]+)<', swap, body)
    open(os.path.join(DIR, n + 'En.dc.html'), 'w').write(head + sep + body)
print('untranslated:', missing)
