<?php
/* El CASO REAL de cada hoja ES — todo sale de Lawang Estate (owner, 24-sep-2026).
 * Única fuente del bloque de caso: `hojas_es.php` ya no lleva `caso` salvo la
 * hoja DOC (cuánto cuesta), que no tiene herramienta que enseñar.
 * Mismas reglas que campo_en.php: DATOS DE EJEMPLO, sin nombres ni importes, y
 * nada que no esté en producción. El caso entra por el problema, no por el país. */

$CAMPO_ES = [

'software-de-gestion-a-medida' => [
  'regla'=>'Una fuente por dato. Un precio escrito en dos sitios acaba divergiendo, y un día se factura una villa al doble.',
  'panel'=>['pie'=>'La mañana de su equipo: cada fila es algo que espera a alguien, y lo rojo no puede esperar.','tool'=>'SUITE LAWANG // HOY','th'=>['Ref','Asunto','Herramienta','Estado','Vence'],'rows'=>[
    ['CTR-118','Contrato de obra','Contratos','Falta 2.ª firma','Hoy',true],
    ['INV-204','Factura — plazo de suelo','Facturas','Falta el recibí','Vencida',true],
    ['BNK-332','Movimiento del banco','Bancos','Sin conciliar','2 días',false],
    ['COM-051','Comisión de venta','Comisiones','Lista para aprobar','Vie',false],
    ['OBR-017','Hito de obra','Obra','Foto subida','—',false],
  ]],
  'modulos'=>['Contratos','Firma electrónica','Facturas','Recibís','Reservas','Compradores','Operaciones','Proyectos y parcelas','Obra','Vencimientos','Cuentas','Finanzas','Gastos','Bancos','Comisiones','Equipos de venta','Sociedades','Usuarios y roles','Documentación','Comunicación','Soporte'],
  'flujo'=>[['Lead','Entra en el CRM con su origen.'],['Reserva','La parcela queda bloqueada, con plazo.'],['Contrato','Sale de la ficha y se firma a distancia.'],['Factura','Se emite del contrato, con su recibí.'],['Banco','El movimiento se cuadra con el recibí.'],['Cuentas','Cada proyecto sabe qué entró y qué se debe.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — treinta y dos herramientas, un solo sistema',
    'texto'=>'Una promotora lleva ventas, contratos, facturación, obra, comisiones y bancos en una sola intranet. Treinta y dos herramientas bajo un menú y un acceso, con roles por persona: el comercial ve sus compradores, el jefe de equipo ve a su equipo y administración ve el dinero. Cada precio se lee del documento que lo fija y cada comprador existe en un único sitio.',
    'cifras'=>[['32','herramientas bajo un menú'],['1','acceso para todo el equipo'],['0','cifras tecleadas dos veces']],
  ],
],

'crm-a-medida' => [
  'regla'=>'Un CRM al que alguien tiene que copiar los leads es una hoja de cálculo con una interfaz más lenta.',
  'panel'=>['pie'=>'Cada lead con su origen, quién lo lleva y cuál es el siguiente paso. Rojo: alguien tiene que moverse hoy.','tool'=>'LEADS // EMBUDO','th'=>['Ref','Origen','Fase','Responsable','Siguiente paso'],'rows'=>[
    ['LED-417','Formulario Meta — campaña B','Nuevo','Sin asignar','Llamar hoy',true],
    ['LED-409','WhatsApp','Cualificado','Comercial 03','Enviar dossier',false],
    ['LED-388','Web','Visita agendada','Comercial 01','Sáb 10:00',false],
    ['LED-352','Recomendación','Reserva','Comercial 03','Falta la señal',true],
    ['LED-311','Formulario Meta — campaña A','Perdido','Comercial 02','—',false],
  ]],
  'modulos'=>['Kanban con fases editables','Formularios de Meta entran solos','Trazabilidad por campaña','Comprador compartido entre closers','WhatsApp desde la ficha','Directorio de compradores','Reservas con caducidad','Roles comercial / jefe de equipo'],
  'flujo'=>[['Formulario','El lead rellena un formulario de Meta.'],['CRM','Cae en el tablero con su campaña.'],['Comercial','Se asigna y se le escribe por WhatsApp desde la ficha.'],['Reserva','El comprador bloquea una parcela, con plazo.'],['Contrato','La ficha se convierte en documento.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — leads que llegan solos',
    'texto'=>'Los leads de los formularios de Meta caen solos en el CRM de la promotora, con su campaña pegada, y al dueño se le avisa sin que los datos personales salgan de la base. Las fases del tablero las edita el dueño en vez de estar escritas en el código, un comprador se puede compartir entre dos closers y el comercial escribe al lead por WhatsApp desde la propia ficha.',
    'cifras'=>[['0','leads copiados a mano'],['4h','como mucho, del formulario de Meta al CRM'],['1','ficha por comprador, con todo su historial']],
  ],
],

'chatbot-whatsapp-ia' => [
  'regla'=>'Un bot que improvisa sobre dinero es un riesgo. Los nuestros pasan a una persona en cuanto el dinero no está claro.',
  'panel'=>['pie'=>'Qué hizo el bot con cada conversación: qué contestó solo y qué pasó a una persona.','tool'=>'SETTER // CONVERSACIONES','th'=>['Ref','Idioma','Intención','Bot','Traspaso'],'rows'=>[
    ['WA-2231','EN','Precio de una parcela','Contestado de la fuente','—',false],
    ['WA-2228','ES','Visitar la obra','Hueco ofrecido','—',false],
    ['WA-2219','EN','Forma de pago','Fuera de su alcance','A comercial',true],
    ['WA-2204','ID','Plazo de obra','Contestado de la fuente','—',false],
    ['WA-2197','EN','Quiere reservar','Cualificado','A comercial',true],
  ]],
  'modulos'=>['API oficial de WhatsApp Business','Setter dentro del CRM','Bot de apoyo a comerciales','Respuestas de una sola fuente','Lo que no puede decir, fijado por Legal','Lanzamiento con lista de números','Freno en el servidor'],
  'flujo'=>[['Mensaje','Un lead escribe por WhatsApp.'],['Fuente','El bot lee precios y reglas de un solo sitio.'],['Cualifica','Pregunta lo que preguntaría un comercial.'],['Traspaso','Pasa a una persona con el contexto pegado.'],['Cierre','El comercial sigue donde paró el bot.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — un setter y un asistente de comerciales, lanzados con cuidado',
    'texto'=>'El CRM de la promotora tiene un setter de IA en un chat de dos paneles al estilo de WhatsApp, y un segundo bot contesta las dudas del propio equipo comercial desde una fuente que ha revisado Legal. Los dos corren sobre el número que ya recibe leads reales, en modo pruebas: hasta que el dueño lo abra, el bot solo contesta a los números de una lista. Así se estrena un bot sin número ni aplicación nuevos.',
    'cifras'=>[['0','precios que pueda inventarse'],['1','traspaso a una persona, con el contexto'],['2','bots: uno para compradores, otro para el equipo']],
  ],
],

'automatizacion-de-procesos' => [
  'regla'=>'Un vigilante puede pausar, parar y proteger por su cuenta. Nunca puede gastar, crear ni escribir a un cliente.',
  'panel'=>['pie'=>'La última pasada de los vigilantes: qué comprobó cada regla, qué encontró y qué hizo por su cuenta.','tool'=>'VIGILANTES // ÚLTIMA PASADA','th'=>['Regla','Comprueba','Resultado','Acción','Próxima'],'rows'=>[
    ['R3','Conjuntos que gastan sin leads','1 en sequía','Pausado','4h',true],
    ['R7','Presupuesto diario contra el tope','Dentro del tope','Ninguna','4h',false],
    ['R13','Formularios de Meta → CRM','6 leads nuevos','Sincronizado','4h',false],
    ['RSV','Reservas fuera de plazo','2 caducadas','Parcela liberada','Diaria',true],
    ['SOL','Solicitudes de cambio','1 pendiente','Sí/No enviado al dueño','—',false],
  ]],
  'modulos'=>['Vigilante de anuncios, 13 reglas','Presupuesto dentro de un tope mensual','Leads sincronizados al CRM','Reservas caducadas liberadas','Aviso antes del vencimiento de una factura','Cambios aprobados por Telegram','Chequeos de salud de los datos'],
  'flujo'=>[['Intervalo','Se despierta con su propio horario.'],['Comprueba','Lee el estado contra una regla escrita.'],['Actúa','Solo dentro de la jaula: pausa, libera, protege.'],['Avisa','Un mensaje directo al dueño.'],['Registra','Cada acción anotada y reversible.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — trece reglas vigilando el dinero',
    'texto'=>'Un vigilante revisa la cuenta de anuncios de la promotora cada cuatro horas contra trece reglas escritas: pausa un conjunto que gasta sin leads, mueve el presupuesto diario dentro del tope mensual del dueño y baja los leads nuevos de los formularios al CRM. Otros procesos liberan las reservas cuyo plazo ha vencido, avisan antes de que venza una factura y convierten una petición de cambio en la ficha de un comprador en un sí o un no en el Telegram del dueño; la base de datos ejecuta la respuesta.',
    'cifras'=>[['4h','entre un problema y que el dueño lo sepa'],['13','reglas vigilando el gasto en anuncios'],['0','gasto por encima del tope del dueño']],
  ],
],

'portal-de-clientes' => [
  'regla'=>'El acceso es una regla, no un favor: ficha más contrato abre la puerta.',
  'panel'=>['pie'=>'Lo que ve un comprador al entrar: sus documentos, qué ha pagado y qué le vence.','tool'=>'PORTAL DEL COMPRADOR // MI EXPEDIENTE','th'=>['Doc','Tipo','Estado','Pago','Vence'],'rows'=>[
    ['CTR-118','Bloqueo de parcela','Firmado','Pagado','—',false],
    ['CTR-121','Contrato de obra','Firmado','Hito 2 de 5','15 días',false],
    ['INV-204','Factura','Emitida','Falta el recibí','Vencida',true],
    ['RCB-090','Recibí','Disponible','—','—',false],
    ['DOC-033','Informe de avance de obra','Nuevo','—','—',false],
  ]],
  'modulos'=>['Acceso por autoservicio','Aislamiento por fila','Contratos y copias firmadas','Calendario de pagos','Recibís','Avance de obra','Idioma por comprador'],
  'flujo'=>[['Firma','El comprador firma un contrato.'],['Regla','Ficha más contrato es acceso.'],['Entra','Con su propio correo, sin invitación.'],['Lo suyo','Solo sus filas, lo impone la base.'],['Copias','Documentos firmados y recibís para descargar.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — el portal del comprador',
    'texto'=>'Cada comprador de una villa o de una parcela abre su propio expediente: contratos, copias firmadas, calendario de pagos y recibís, leídos en vivo de la misma base con la que trabaja la oficina. El acceso es una regla que se comprueba en la puerta —ficha de comprador y al menos un contrato— en vez de una invitación que alguien tiene que acordarse de mandar. La base de datos se niega a devolver las filas de otro.',
    'cifras'=>[['24/7','acceso del comprador a su expediente'],['0','invitaciones que mandar'],['1','expediente por comprador, solo el suyo']],
  ],
],

'integraciones-y-datos' => [
  'regla'=>'Cada dato tiene un dueño. Copiar en las dos direcciones es la forma de acabar con dos sistemas que no coinciden.',
  'panel'=>['pie'=>'De dónde viene cada dato, a dónde va y si la última pasada funcionó. Lo rojo necesita a una persona.','tool'=>'INTEGRACIONES // EJECUCIONES','th'=>['Origen','Destino','Qué','Última','Estado'],'rows'=>[
    ['Meta Lead Ads','CRM','Leads de formularios','08:00','OK',false],
    ['GoHighLevel','CRM','Trazabilidad del lead','07:45','OK',false],
    ['CSV del banco','Bancos','Movimientos','Ayer','3 por cuadrar',true],
    ['Intranet','Web','Tamaños de parcela','En vivo','OK',false],
    ['Telegram','Base de datos','Aprobaciones del dueño','—','1 esperando',true],
  ]],
  'modulos'=>['Meta Lead Ads','GoHighLevel','Extractos bancarios, mapeados por cuenta','Huella contra duplicados','Aprobaciones por Telegram','Firma electrónica','Envío de correo','Web ← intranet','Almacén de archivos'],
  'flujo'=>[['Origen','Donde nace el dato.'],['Mapeo','Sus campos, traducidos una vez.'],['Dueño','Un sistema decide; el resto lee.'],['Base','Guardado una vez, con su origen.'],['Alarma','Una ejecución fallida llega a una persona.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — nada se teclea dos veces',
    'texto'=>'Los formularios de Meta y GoHighLevel alimentan el CRM de la promotora con su origen pegado. Los extractos del banco entran como CSV, mapeados por cuenta y con una huella que impide importar dos veces el mismo movimiento, y la conciliación solo se hace dentro de la base. La web pública lee los tamaños de parcela en vivo de la intranet, y las aprobaciones le llegan al dueño por Telegram.',
    'cifras'=>[['5','herramientas hablando entre sí'],['0','datos tecleados dos veces'],['1','sitio donde vive cada cifra']],
  ],
],

'diseno-y-desarrollo-web' => [
  'regla'=>'La web y la intranet leen la misma base. Una cifra nunca vive en dos sitios.',
  'panel'=>['pie'=>'Las páginas de su web y de dónde lee cada una sus datos; algunas, del mismo sistema que usa la oficina.','tool'=>'LAWANGPROPERTIES.COM // PÁGINAS','th'=>['Página','Qué hace','Lee de','Estado'],'rows'=>[
    ['/','Portada cinematográfica','CMS de la web','En vivo',false],
    ['/thecollection','Escaparate de villas y suelo','CMS de la web','En vivo',false],
    ['/palmfield','Calculadora de parcela por pasos','Intranet','En vivo',false],
    ['/modelo','Modelos de casa con presupuesto','Intranet','En vivo',false],
    ['/investor-deck','Dossier de inversor por proyecto','Intranet','En vivo',false],
  ]],
  'modulos'=>['Portada cinematográfica','Escaparate','Calculadora de parcela','Configurador con presupuesto','Dossier de inversor','CMS editable','EN / ES / ID de una fuente','Declaración de accesibilidad','Páginas legales'],
  'flujo'=>[['Visita','En el idioma del visitante.'],['Explora','Escaparate, modelos, parcelas.'],['Configura','Calculadora y presupuesto, con datos en vivo.'],['Consulta','La página de la que viene va con ella.'],['CRM','Un lead, no un correo.']],
  'caso'=>[
    'titulo'=>'lawangproperties.com — una web que lee la intranet',
    'texto'=>'La web pública de la promotora en inglés, español e indonesio, con una fuente por texto. Un escaparate de villas y suelo, una calculadora de parcela por pasos, un configurador de casa que saca presupuesto y un dossier de inversor por proyecto; la calculadora y el configurador leen de la misma base que usa el equipo comercial.',
    'cifras'=>[['3','idiomas, un solo texto que editar'],['1','base de datos detrás de la web y la oficina'],['0','plantillas o maquetadores']],
  ],
],

'meta-ads' => [
  'regla'=>'El vigilante puede pausar un conjunto en sequía por su cuenta. Nunca puede subir el gasto por encima del tope del dueño.',
  'panel'=>['pie'=>'Sus conjuntos de anuncios en tres días y qué hizo el vigilante con cada uno, por su cuenta y dentro del tope.','tool'=>'META ADS // CONJUNTOS, ÚLTIMOS 3 DÍAS','th'=>['Conjunto','Gasto','Leads','Regla','Acción'],'rows'=>[
    ['AS-07 · Expats','En ritmo','9','—','Seguir',false],
    ['AS-04 · Inversores','Alto','0','R3','Pausado',true],
    ['AS-11 · Retargeting','Bajo','3','R7','Sube, dentro del tope',false],
    ['AS-02 · Similares','En ritmo','5','—','Seguir',false],
  ]],
  'modulos'=>['Estructura de campañas','Segmentación explícita en cada conjunto','Creatividades para móvil','Formularios → CRM','Vigilante de 13 reglas','Tope mensual','Informe por lead, no por clic'],
  'flujo'=>[['Creatividad','Hecha para el móvil.'],['Conjunto','Segmentación explícita, siempre.'],['Formulario','El lead contesta en el anuncio.'],['CRM','Llega con su campaña.'],['Vigilante','Cada cuatro horas, dentro del tope.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — anuncios vigilados cada cuatro horas',
    'texto'=>'Campañas para una promotora que vende villas y suelo a compradores de fuera. Cada conjunto lleva su segmentación explícita, cada lead entra en el CRM con su campaña pegada, y un vigilante revisa gasto y leads cada cuatro horas contra trece reglas escritas: puede pausar y mover el presupuesto diario dentro del tope mensual del dueño, y nada más.',
    'cifras'=>[['4h','de un conjunto que tira dinero a pausarlo'],['1','tope mensual, nunca superado'],['0','leads perdidos en una bandeja']],
  ],
],

'seo-y-sem' => [
  'regla'=>'Nadie puede prometer una posición. Lo que sí se puede prometer es que nada de tu propia web se lo impida.',
  'panel'=>['pie'=>'Lo que un buscador o un asistente de IA lee de su web, y de dónde se genera cada pieza.','tool'=>'BÚSQUEDA // ESTRUCTURA','th'=>['Pieza','Dónde','Se genera de','Estado'],'rows'=>[
    ['sitemap.xml','Las dos webs','El catálogo de páginas','En vivo',false],
    ['Pares hreflang','EN ↔ ES ↔ ID','El mapa de páginas','En vivo',false],
    ['llms.txt','Las dos webs','El catálogo de páginas','En vivo',false],
    ['Datos estructurados','Cada página','La propia página','En vivo',false],
    ['Search Console','axisworks.studio','—','Pendiente',true],
  ]],
  'modulos'=>['Auditoría técnica','Una página por intención','Pares de idioma','Datos estructurados','Sitemap generado','llms.txt','IndexNow','Palabras clave con datos reales','SEM atado al CRM'],
  'flujo'=>[['Auditoría','Qué impide que la web se lea.'],['Estructura','Una dirección por intención e idioma.'],['Contenido','Escrito para quien busca.'],['Publica','Los buscadores avisados el mismo día.'],['Mide','Antes de juzgar nada.']],
  'caso'=>[
    'titulo'=>'lawangproperties.com, y esta web',
    'texto'=>'La web de la promotora publica en tres idiomas con cada página emparejada con sus traducciones, un sitemap y un <code>llms.txt</code> generados por código en vez de mantenidos a mano, y una declaración de accesibilidad. axisworks.studio sigue las mismas reglas: una hoja por servicio, pares español-inglés y las direcciones nuevas enviadas por IndexNow al publicarse.',
    'cifras'=>[['3','idiomas, cada uno encontrable por separado'],['1','día entre publicar y avisar a los buscadores'],['0','posiciones prometidas']],
  ],
],

'redes-sociales-y-contenido' => [
  'regla'=>'Cada cuenta tiene un trabajo. Una pieza va a la cuenta cuyo trabajo hace.',
  'panel'=>['pie'=>'Su biblioteca de creatividades: cada pieza, la cuenta a la que va y si pasó el control de Legal.','tool'=>'CREATIVIDADES // BIBLIOTECA','th'=>['Id','Formato','Cuenta','Estado','Legal'],'rows'=>[
    ['CRV-061','Vídeo vertical 9:16','Marca matriz','Aprobada','Pasa',false],
    ['CRV-058','Carrusel 4:5','Proyecto A','En revisión','Pasa',false],
    ['CRV-055','Historia 9:16','Proyecto B','Borrador','Frase vetada',true],
    ['CRV-049','Feed 1:1','Marca matriz','Publicada','Pasa',false],
  ]],
  'modulos'=>['Un trabajo por cuenta','Estudio de referencias','Biblioteca de creatividades','Generador con fotos reales del proyecto','Frases vetadas por Legal','Aprobación por rol','Dossier desde la base'],
  'flujo'=>[['Plan','Qué necesita cada cuenta este mes.'],['Genera','Con las fotos reales del proyecto.'],['Legal','Las frases vetadas no se imprimen.'],['Aprueba','Quien tenga el rol.'],['Publica','En la cuenta cuyo trabajo hace.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — tres cuentas y un sistema de creatividades',
    'texto'=>'Una marca matriz y dos proyectos, cada uno con su cuenta y su trabajo: confianza, prueba, deseo. Detrás hay una biblioteca de creatividades en la intranet: un generador que monta piezas con las fotos reales del proyecto, una lista de frases que Legal ha vetado y que el generador no imprime, aprobación por rol y un dossier que se arma desde la base en vez de copiarse a una diapositiva.',
    'cifras'=>[['3','cuentas, tres trabajos distintos'],['32','referencias del sector estudiadas'],['0','frases vetadas que imprima el generador']],
  ],
],

'gestion-marca-y-rumbo' => [
  'regla'=>'Una decisión que solo vive en una reunión desaparece a la semana. Las nuestras quedan escritas con su motivo y su fecha.',
  'panel'=>['pie'=>'Así es un registro de decisiones: qué se decidió, quién y si ya está aplicado.','tool'=>'DECISIONES // REGISTRO','th'=>['Fecha','Área','Decisión','Quién','Estado'],'rows'=>[
    ['S39','Ventas','Quién puede editar una ficha de comprador','Dueño','Aplicada',false],
    ['S39','Marca','Paleta de un proyecto nuevo','Dueño','Aplicada',false],
    ['S38','Finanzas','Cómo se aprueba una comisión','Dueño','Aplicada',false],
    ['S37','Operación','Un único punto de alta por persona','Dueño','Aplicada',false],
    ['—','Legal','Licencia de una tipografía','Dueño','Esperando',true],
  ]],
  'modulos'=>['Identidad de marca','Voz','Organización y roles','Equipos de venta','Prioridades','Registro de decisiones','Libro de pendientes, con dueño y antigüedad','Revisión periódica'],
  'flujo'=>[['Escucha','Qué necesita el dueño y qué duele.'],['Decide','Con los datos encima de la mesa.'],['Escribe','La decisión, su motivo, su fecha.'],['Construye','El software la hace cumplir.'],['Revisa','Contra lo que dijimos que haríamos.']],
  'caso'=>[
    'titulo'=>'Lawang Estate — de la marca a la operación',
    'texto'=>'Para la promotora construimos el sistema de marca —identidad, paleta, voz— y la organización que el software hace cumplir: quién es dueño de cada proceso, qué rol ve qué y cómo se estructuran los equipos de venta. Cada decisión del dueño queda registrada con su motivo y su fecha, y todo lo que espera a alguien vive en un único libro con dueño y antigüedad.',
    'cifras'=>[['1','marca, igual en web, documentos y redes'],['1','registro escrito de cada decisión'],['0','decisiones que solo viven en una reunión']],
  ],
],

];
