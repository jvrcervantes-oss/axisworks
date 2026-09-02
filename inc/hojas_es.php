<?php
/* Hojas ES. El español va a PYME ESPAÑOLA —«a medida», «para empresas», que
 * es la forma real de la query según la SERP medida el 2-sep-2026— y no es la
 * traducción del inglés: los casos se reencuadran POR PROBLEMA, no por país.
 * Un industrial de Alicante no compra un ERP porque le enseñes villas en Bali;
 * le compra porque reconoce su problema. La prueba se cuenta igual de real,
 * pero entra por donde duele. */

$HOJAS_ES = [

'software-de-gestion-a-medida' => [
  'lang'=>'es','url'=>'/es/servicios/software-de-gestion-a-medida','codigo'=>'B01','eje'=>'BUILD',
  'title'=>'Software de gestión a medida para empresas — AxisWorks',
  'desc'=>'Herramientas internas escritas para cómo trabaja tu empresa: contratos, facturas, inventario, permisos y portal de cliente, todo leyendo un solo dato. Estudio de dos personas.',
  'eyebrow'=>'HOJA B01 — BUILD',
  'h1'=>'Software de gestión a medida para empresas',
  'lead'=>'Casi ninguna empresa necesita otra plataforma a la que adaptarse. Necesita que las doce cosas que hace cada día dejen de vivir en hojas de cálculo, hilos de WhatsApp y la memoria de una persona.',
  'spec'=>[
    'Una suite interna no es una plantilla con tu logo. Está escrita en tu vocabulario, imprime tus documentos y aplica tus permisos — que son justo las tres cosas que el software enlatado te obliga a rodear.',
    'Diseñamos contra un fallo concreto: <b>el mismo dato viviendo en dos sitios</b>. Es el error más caro que conocemos y nunca parece un error. Un precio que vive en el contrato y otra vez en la pantalla de operaciones se separa, y un día algo se factura al doble. No es hipotético: nos ha pasado y por eso cada herramienta que construimos lee una sola fuente por dato, y añadir una herramienta nueva nunca significa copiar una lista.',
    'El portal de cliente y las integraciones están en esta hoja y no en la suya porque en la práctica no son productos distintos: el portal es el mismo dato con otra puerta, y las integraciones son lo que evita que tu equipo lo reescriba a mano.',
  ],
  'scope'=>[
    ['Modelo de datos','Una fuente por dato. Precios, fechas y nombres se escriben una vez y se leen en todas partes.'],
    ['Documentos','Contratos, facturas y recibos generados en PDF desde el propio registro — no tecleados dos veces.'],
    ['Roles y permisos','Por usuario y por herramienta. Lo que alguien no puede hacer, no lo ve.'],
    ['Portal de cliente','<span id="portal"></span>Una puerta para quien está fuera de la empresa, sobre el mismo dato y con sus propias reglas.'],
    ['Integraciones','<span id="integraciones"></span>Cobros, calendarios, hojas de cálculo, mensajería — allí donde el dato ya vive.'],
    ['Idiomas','La interfaz en tantos idiomas como hable el equipo de verdad.'],
    ['Entrega','Código, base de datos y despliegue. Escrito para que lo lea el siguiente desarrollador.'],
  ],
  'caso'=>[
    'img'=>'work-lawang.jpg','alt'=>'Suite interna de una promotora inmobiliaria',
    'titulo'=>'Una promotora inmobiliaria que vendía sobre plano en carpetas',
    'texto'=>'Contratos con firma digital remota, facturas y recibos, avance de obra, compradores, calendario de vencimientos, catálogo de unidades, documentación y un portal donde cada comprador ve sus propios contratos y pagos. Doce herramientas bajo un solo menú, una cáscara compartida, un solo acceso. Una persona se da de alta en un único sitio y todas las demás herramientas la leen de ahí. (Opera en Indonesia; el problema es el mismo en Murcia.)',
    'cifras'=>[['12','herramientas, un menú'],['3','idiomas de interfaz'],['1','alta por persona']],
  ],
  'faq'=>[
    ['¿Esto es un ERP?','A veces sustituye a uno, más a menudo convive con él. Un ERP enlatado es bueno en lo que todas las empresas hacen igual —contabilidad, nóminas— y malo justo en la parte que te hace diferente, que suele ser donde están el dinero y los errores. Esa parte es la que construimos.'],
    ['Ya usamos hojas de cálculo y funcionan. ¿Por qué cambiar?','Las hojas funcionan hasta que las editan dos personas, hasta que un número tiene que salir en un documento, o hasta que alguien se va. La señal no es que la hoja vaya lenta: es que alguien está reescribiendo a mano.'],
    ['¿Podéis construir sobre lo que ya tenemos?','Sí, y suele salir más barato. Si el dato ya vive en un sistema con API, lo leemos en vez de migrarlo.'],
    ['¿Cuánto se tarda?','Depende por completo del alcance, así que no damos un número antes de entender el tuyo. Cuéntanos qué hace el equipo hoy y te devolvemos alcance y precio.'],
    ['¿Quién lo usa, solo la oficina?','Quien tenga un rol. En el caso de arriba lo usan el equipo de la promotora, la parte de obra y los propios compradores, cada uno por su puerta.'],
  ],
  'asunto'=>'Software de gestión a medida — /es/servicios/software-de-gestion-a-medida',
],

'crm-a-medida' => [
  'lang'=>'es','url'=>'/es/servicios/crm-a-medida','codigo'=>'B02','eje'=>'BUILD',
  'title'=>'Desarrollo de CRM a medida para tu empresa — AxisWorks',
  'desc'=>'Un CRM con la forma de tu proceso de venta: los leads entran solos desde el canal por el que llegan de verdad, con reservas, cobros y seguimiento. Desarrollo y despliegue propios.',
  'eyebrow'=>'HOJA B02 — BUILD',
  'h1'=>'Desarrollo de CRM a medida para tu empresa',
  'lead'=>'Un CRM genérico te obliga a describir tu negocio con las palabras de otro. Si tus leads entran por WhatsApp y lo que vendes es una reserva, una etapa llamada «Oportunidad» no le sirve a nadie.',
  'spec'=>[
    'Un CRM a medida se justifica cuando el estándar se pelea en vez de usarse: cuando el equipo mantiene una hoja de cálculo paralela al lado, o cuando la mitad de los campos están vacíos porque no aplican.',
    'Lo que hace que un CRM viva o muera no es la vista de embudo. Es si los leads entran <b>solos</b>, desde el canal por el que llegan realmente. Un CRM al que hay que copiar los leads a mano es una hoja de cálculo con una interfaz más lenta.',
    'Por eso construimos primero la entrada —formulario web, WhatsApp, plataforma de anuncios, teléfono— y el embudo después. Y lo atamos al dinero: qué se presupuestó, qué se cobró y qué queda pendiente.',
  ],
  'scope'=>[
    ['Entrada','Leads capturados desde los canales que ya usas, con su origen pegado.'],
    ['Embudo','Etapas con el nombre que les da tu equipo, no un funnel genérico.'],
    ['Reservas o pedidos','Lo que vendes de verdad, con sus fechas, sus unidades y su precio.'],
    ['Cobros','Señales y pendientes, unidos al registro y a la pasarela cuando la hay.'],
    ['Seguimiento','Avisos que saltan el día que dijo el cliente, no cuando alguien se acuerda.'],
    ['Equipo','Roles, asignación e histórico visible de quién hizo qué.'],
    ['Informes','Los tres números con los que de verdad se pilota, no un panel que no abre nadie.'],
  ],
  'caso'=>[
    'img'=>'work-sumba.jpg','alt'=>'CRM de flota y reservas',
    'titulo'=>'Un alquiler de vehículos que perdía la reserva en la segunda consulta',
    'texto'=>'CRM de flota y disponibilidad, reservas con entrega a domicilio, cobros por pasarela local y equipo editable. Tres idiomas de interfaz, incluido el del país donde trabaja el equipo — porque quien lo usa cada día no es quien lo encargó.',
    'cifras'=>[['3','idiomas de interfaz'],['2','webs públicas que alimenta'],['1','registro por reserva, de punta a punta']],
  ],
  'faq'=>[
    ['¿Por qué no HubSpot o Pipedrive?','Si un CRM estándar encaja, úsalo: sale más barato que cualquier cosa que construyamos. Ven cuando no encaja — cuando lo que vendes no es un «trato», cuando tus leads llegan por un sitio que el CRM no sabe leer, o cuando el coste por usuario ya ha superado al de tener el tuyo.'],
    ['¿Puede leer los leads de WhatsApp?','Sí. Es la entrada que más construimos y la que normalmente justifica el proyecto ella sola.'],
    ['¿Gestiona cobros?','Los registra, y donde hay pasarela la conectamos para que el registro se actualice solo en vez de que alguien marque una casilla.'],
    ['¿Podemos migrar los datos que ya tenemos?','Normalmente sí. La respuesta honesta depende del estado en que estén: un export limpio es una tarde, diez años de hojas inconsistentes son un proyecto aparte.'],
    ['¿Cuánto cuesta?','Cada proyecto se presupuesta por su alcance. Si quieres la respuesta larga, está en <a href="/es/cuanto-cuesta-un-software-a-medida">cuánto cuesta un software a medida</a>.'],
  ],
  'asunto'=>'CRM a medida — /es/servicios/crm-a-medida',
],

'chatbot-whatsapp-ia' => [
  'lang'=>'es','url'=>'/es/servicios/chatbot-whatsapp-ia','codigo'=>'B03','eje'=>'BUILD',
  'title'=>'Chatbot de WhatsApp con IA para empresas — AxisWorks',
  'desc'=>'Bots sobre la API oficial de WhatsApp Business que contestan con tu voz, reservan en un calendario real, mandan enlaces de pago y saben cuándo pasar a un humano.',
  'eyebrow'=>'HOJA B03 — BUILD',
  'h1'=>'Chatbot de WhatsApp con IA para empresas',
  'lead'=>'El objetivo no es un bot que conteste al instante y perfecto. Es un bot que cierre la cita, mande el enlace de pago y sepa quitarse de en medio a tiempo.',
  'spec'=>[
    'Construimos sobre la API oficial de WhatsApp Business, no sobre un puente no oficial. Esa decisión cuesta más al principio y es la razón de que el número no acabe baneado.',
    'Al bot se le da el negocio, no un guion: precios, disponibilidad, qué se ofrece y qué no. Contesta en el idioma del cliente y pasa la conversación a una persona en el momento en que debe — un bot que improvisa sobre dinero es un pasivo, y los nuestros están construidos para no poder hacerlo.',
    'Dos cosas que aprendimos caras y hoy van de serie. <b>La latencia es lo que delata al bot</b>: una respuesta que llega en 400 milisegundos se lee como una máquina por buenas que sean las palabras. Y un bot nunca puede mandarle a un cliente real un mensaje con un hueco sin rellenar — eso es una regla escrita en el código, no una nota en el prompt.',
  ],
  'scope'=>[
    ['Canal','API oficial de WhatsApp Business, con el número y las plantillas dados de alta como toca.'],
    ['Conocimiento','Tus precios, tu disponibilidad, tus reglas — una sola fuente, actualizable sin redesplegar.'],
    ['Reservas','Escribe en un calendario real, no en un formulario que el equipo vuelve a teclear.'],
    ['Cobros','Manda un enlace de pago vivo y sabe cuándo se ha pagado.'],
    ['Traspaso','Una línea que el bot no cruza, y un paso limpio a una persona cuando llega a ella.'],
    ['Idiomas','Contesta en el idioma en que se le escribe, incluidos los que habla tu equipo.'],
    ['Visibilidad','Todas las conversaciones legibles por ti, con qué dijo el bot y por qué.'],
  ],
  'caso'=>[
    'img'=>'work-balimoto.jpg','alt'=>'Bot de WhatsApp en producción',
    'titulo'=>'Un operador turístico que contestaba a mano el mismo mensaje veinte veces al día',
    'texto'=>'El bot responde sobre rutas y precios, reserva citas directamente en Google Calendar, manda enlaces de pago de Stripe y se agenda su propio seguimiento cuando un lead dice «me lo reviso». Llega al equipo por el mismo panel donde están los leads.',
    'cifras'=>[['24/7','contestando, en producción'],['0','huecos sin rellenar al alcance de un cliente'],['1','línea de traspaso, escrita en código']],
  ],
  'faq'=>[
    ['¿Nos van a banear el número?','No si está construido sobre la API oficial de Business con plantillas dadas de alta, que es como los hacemos. Los que banean números son los puentes no oficiales, y son más baratos exactamente por eso.'],
    ['¿Puede usar nuestro número actual de WhatsApp?','Normalmente sí, por la vía oficial de migración o coexistencia. Es un trámite con Meta más que un interruptor, y cuánto tarda lo deciden ellos, no nosotros.'],
    ['¿Qué impide que se invente un precio?','Lee los precios de una sola fuente y no puede contestar fuera de ella. Cuando una pregunta toca dinero que no tiene, pasa a una persona.'],
    ['¿Puede entrar un humano a mitad de conversación?','Sí, y ese es el punto. El bot está para quitar el 80% repetitivo, no para ponerse entre tú y un cliente que ya quiere comprar.'],
    ['¿Funciona en varios idiomas?','Sí. Los nuestros funcionan en español, inglés e indonesio según el proyecto.'],
  ],
  'asunto'=>'Chatbot de WhatsApp con IA — /es/servicios/chatbot-whatsapp-ia',
],

'automatizacion-de-procesos' => [
  'lang'=>'es','url'=>'/es/servicios/automatizacion-de-procesos','codigo'=>'B04','eje'=>'BUILD',
  'title'=>'Automatización de procesos con IA y agentes — AxisWorks',
  'desc'=>'Automatizaciones y vigilantes autónomos que revisan tu negocio a todas horas, te avisan en directo y tienen permiso para frenar — nunca para gastar. En producción hoy.',
  'eyebrow'=>'HOJA B04 — BUILD',
  'h1'=>'Automatización de procesos con IA y agentes',
  'lead'=>'La automatización que merece la pena no es la que ahorra diez minutos. Es la que se da cuenta, a las tres de la mañana, de que llevas tres días gastando sin recibir nada.',
  'spec'=>[
    'En esta hoja hay dos cosas. Las <b>automatizaciones</b> quitan un paso que una persona repite: un documento que se genera solo, un registro que se actualiza solo, un informe que llega sin pedirlo. Los <b>vigilantes</b> son otra cosa: un proceso que vive dentro de algo que ya corre 24/7, revisa el estado del negocio cada cierto tiempo y te escribe en directo cuando algo va mal.',
    'La regla que hace que un vigilante sea fiable es la <b>autonomía asimétrica</b>, y la impone la forma del código, no una instrucción. Puede pausar, frenar y proteger por su cuenta. Nunca puede gastar, nunca crear y nunca escribir a un cliente real. Esa asimetría es todo el diseño.',
    'No construimos un vigilante para un problema que nadie ha sufrido todavía. Los dos que corren hoy salieron de un incidente: un negocio estuvo tres días gastando en anuncios con cero leads sin que nadie se enterara; otro venía de un cobro duplicado y de un rediseño que pasó un QA automático estando mal.',
  ],
  'scope'=>[
    ['Qué vigila','Lo concreto que dolió la última vez — gasto, silencio, una cola, un número que no debería moverse.'],
    ['Cadencia','Un intervalo que va al ritmo real de lo que cambia, no al más rápido posible.'],
    ['Aviso','Canal directo a una persona. Un bot por negocio, nunca un grupo.'],
    ['Lo que puede','Pausar, frenar, proteger. Escrito en el código como lo que *puede* hacer, no como lo que *debería*.'],
    ['Prohibido por diseño','Gastar, crear y escribir a tus clientes. No es configurable.'],
    ['Estado','En base de datos, nunca en disco: un redespliegue no puede hacerle olvidar lo que ya hizo.'],
    ['Auditoría','Cada acción queda registrada, y todas son reversibles por ti.'],
  ],
  'caso'=>[
    'img'=>'work-lawang.jpg','alt'=>'Vigilantes autónomos en producción',
    'titulo'=>'Dos vigilantes, dos negocios, los dos en producción',
    'texto'=>'Uno revisa gasto y leads cada cuatro horas: puede pausar un conjunto en sequía y repartir presupuesto diario dentro de un tope mensual que fija el dueño, y no puede salirse de esa jaula. El otro lee conversaciones vivas de leads cada media hora y pausa anuncios sin retorno. Los dos avisan por un canal privado de Telegram; ninguno puede crear una campaña ni escribir a un cliente.',
    'cifras'=>[['4h / 30min','intervalos en producción'],['0','acciones que gasten fuera del tope'],['1:1','canal de aviso, nunca un grupo']],
  ],
  'faq'=>[
    ['¿Esto es n8n o Zapier?','Esos son buenos uniendo dos servicios que ya tienen botones el uno para el otro. Nosotros escribimos los que necesitan criterio, los que no pueden romperse en silencio y los que tienen que recordar su estado tras un redespliegue.'],
    ['¿Actuaría sin preguntarnos?','Solo en el sentido de frenar algo, y solo dentro de los límites que pongas tú. No puede gastar, ni crear, ni contactar con nadie. Es una propiedad del código, no un ajuste.'],
    ['¿Dónde se ejecuta?','Dentro de un servicio que ya esté corriendo para tu negocio a todas horas. Si no hay ninguno, lo primero es construirlo: una automatización que depende de que alguien abra el portátil no vigila nada.'],
    ['¿Y si se equivoca?','Cada acción queda registrada y es reversible, y el aviso te llega antes de que te hubieras dado cuenta tú. El fallo de tener un vigilante es una falsa alarma; el de no tenerlo son tres días de gasto.'],
    ['¿Usa IA para decidir?','Donde de verdad hace falta criterio, sí — por ejemplo para leer si una conversación se ha torcido. El resto es código determinista, porque la mayoría de lo que vigila no necesita un modelo y es más fiable sin él.'],
  ],
  'asunto'=>'Automatización de procesos — /es/servicios/automatizacion-de-procesos',
],

'meta-ads' => [
  'lang'=>'es','url'=>'/es/servicios/meta-ads','codigo'=>'G01','eje'=>'GROW',
  'title'=>'Agencia de Meta Ads: embudos de venta en Facebook e Instagram — AxisWorks',
  'desc'=>'Campañas, creatividades y la fontanería de detrás: que el lead llegue a tu CRM con su origen pegado en vez de morir en una bandeja de entrada.',
  'eyebrow'=>'HOJA G01 — GROW',
  'h1'=>'Agencia de Meta Ads: embudos de venta en Facebook e Instagram',
  'lead'=>'Casi ninguna cuenta rinde mal por la segmentación. Rinde mal porque nadie sabe decir qué anuncio produjo al cliente.',
  'spec'=>[
    'Llevamos la línea entera, no solo la compra de medios: estructura de campañas, la creatividad que va dentro y la fontanería que lleva al lead desde el anuncio hasta un sitio donde una persona lo va a contestar. Las tres son el mismo trabajo — una creatividad que convierte a un formulario que nadie lee no es una victoria.',
    'Como además construimos el software, podemos cerrar el círculo que casi todas las agencias dejan abierto: el lead aterriza en el CRM con su campaña pegada, así que el informe habla de facturación y no de clics.',
    'Y lo que corre, se vigila. Un conjunto que deja de producir lo caza el mismo tipo de vigilante de la <a href="/es/servicios/automatizacion-de-procesos">hoja B04</a> — revisado cada pocas horas, pausado si está en sequía, dentro de un tope mensual que pones tú. Nadie descubre una semana tirada a fin de mes.',
  ],
  'scope'=>[
    ['Estructura','Campañas y conjuntos montados para que los resultados se puedan leer, no para que queden ordenados.'],
    ['Creatividades','Hechas para el emplazamiento y la pantalla donde se van a ver — casi todo se mira a tamaño miniatura.'],
    ['Aterrizaje','A dónde va el clic y si se gana la consulta.'],
    ['Medición','Origen pegado al lead, hasta la venta.'],
    ['Contenido y redes','<span id="redes"></span>El lado orgánico que abarata el de pago: qué publica la cuenta y con qué voz.'],
    ['Vigilancia','Gasto y leads revisados por intervalos, con permiso para pausar y para nada más.'],
    ['Informe','Qué costó, qué produjo y qué vamos a cambiar.'],
  ],
  'caso'=>[
    'img'=>'work-balimoto.jpg','alt'=>'Embudos de Meta Ads en producción',
    'titulo'=>'Dos cuentas vivas, dos productos opuestos',
    'texto'=>'Una vende rutas en moto a viajeros y la otra villas a inversores: misma disciplina, embudos contrarios. Las dos con creatividades hechas para móvil, las dos alimentando un CRM que sabe de dónde vino cada lead, y las dos vigiladas por un proceso que puede pausar un conjunto en sequía por su cuenta pero nunca subir el gasto por encima del tope mensual del dueño.',
    'cifras'=>[['2','cuentas vivas en producción'],['1','tope mensual, nunca superado'],['0','presupuestos subidos sin el dueño']],
  ],
  'faq'=>[
    ['¿Necesitáis acceso a nuestra cuenta publicitaria?','Sí, como socios en tu Business Manager. La propiedad de la cuenta, del píxel y de los públicos sigue siendo tuya, siempre.'],
    ['¿Quién paga la inversión publicitaria?','Tú, directamente a Meta. Nunca tenemos tu presupuesto de anuncios en nuestras manos.'],
    ['¿Hacéis también las creatividades?','Sí. Ahí suele estar la diferencia: la misma oferta con una creatividad pensada para un lienzo de 1080px que se ve a tamaño miniatura rinde de forma muy distinta a una diseñada mirando un monitor.'],
    ['¿Podéis conectar los anuncios con nuestro CRM?','Sí, y es la parte en la que insistiríamos. Sin eso no hay manera de saber qué campaña produjo un cliente en vez de un clic.'],
    ['¿Cuál es el presupuesto mínimo?','Depende del mercado y del producto, así que no vamos a inventarnos una cifra. Cuéntanos qué vendes y qué estás gastando, y te decimos honestamente si podemos mejorarlo.'],
  ],
  'asunto'=>'Meta Ads — /es/servicios/meta-ads',
],

'cuanto-cuesta-un-software-a-medida' => [
  'lang'=>'es','url'=>'/es/cuanto-cuesta-un-software-a-medida','codigo'=>'DOC','eje'=>'',
  'title'=>'Cuánto cuesta un software a medida (y qué mueve el precio) — AxisWorks',
  'desc'=>'Qué encarece de verdad un desarrollo a medida, qué lo abarata, y cómo decidir entre comprar una herramienta enlatada o construir la tuya. Sin cifras inventadas.',
  'eyebrow'=>'DOCUMENTO — ANTES DE PEDIR PRESUPUESTO',
  'h1'=>'Cuánto cuesta un software a medida (y qué mueve el precio)',
  'lead'=>'Nadie puede darte una cifra sin saber qué vas a construir, y quien te la da en la primera llamada te la va a corregir en la tercera. Lo que sí se puede explicar con honestidad es qué mueve la aguja.',
  'spec'=>[
    'No publicamos tarifa. No es opacidad: es que el mismo encargo —«un CRM»— puede ser dos semanas o seis meses según cinco cosas que casi nunca están en el brief inicial. Publicar un «desde X€» solo sirve para que el número se quede corto y el proyecto empiece con una conversación incómoda.',
    'Lo que sigue es lo que de verdad mueve el precio, en orden de impacto. Si al leerlo reconoces tu caso, ya sabes por qué el presupuesto que te den va a salir alto o bajo — y qué puedes cambiar tú para bajarlo.',
    'Y la pregunta anterior a todas: <b>¿de verdad hay que construirlo?</b> Si una herramienta enlatada cubre lo tuyo, cómprala; sale más barata que cualquier cosa que construyamos y lo decimos aunque nos deje sin proyecto. Construir se justifica cuando el estándar se pelea en vez de usarse: cuando hay una hoja de cálculo paralela al lado, cuando la mitad de los campos no aplican, o cuando el coste por usuario ya supera al de tener el tuyo.',
  ],
  'scope'=>[
    ['Nº de integraciones','Lo que más encarece, y casi nadie lo cuenta al pedir precio. Cada sistema ajeno con el que hay que hablar es su propia autenticación, sus propios errores y sus propias sorpresas.'],
    ['Estado de tus datos','Un export limpio es una tarde. Diez años de hojas inconsistentes, con el mismo cliente escrito de cuatro formas, es un proyecto aparte — y hay que hacerlo antes.'],
    ['Documentos','Si el sistema tiene que <i>imprimir</i> —contratos, facturas, certificados— multiplica. Un PDF que debe ser correcto y legalmente utilizable no es una pantalla más.'],
    ['Roles y permisos','Dos tipos de usuario es una tarde. Siete, con cosas que unos ven y otros no, es una capa de arquitectura.'],
    ['Idiomas','Uno es gratis. Dos ya obliga a decidir qué manda cuando los textos no coinciden, que es una decisión de negocio y no de software.'],
    ['Quién decide','El factor oculto. Un interlocutor que puede decidir acelera el proyecto más que cualquier tecnología; un comité lo dobla.'],
    ['Lo que NO lo mueve','El número de pantallas. Es lo que todo el mundo cuenta y lo que menos correlaciona con el trabajo real.'],
  ],
  'caso'=>[
    'img'=>'work-ids.jpg','alt'=>'Portal de clientes con login, roles y documentos',
    'titulo'=>'Dos proyectos, la misma frase de partida',
    'texto'=>'«Queremos un portal para nuestros clientes.» Uno acabó siendo login, roles, comunidades y documentos por categorías: acotado y previsible. El otro, la misma frase, arrastraba contratos, firmas, cobros y obra — y era diez veces el trabajo. La diferencia no estaba en el número de pantallas; estaba en cuántos documentos tenía que emitir y cuántos sistemas ajenos tenía que leer.',
    'cifras'=>[['5','factores que mueven el precio'],['1','que casi nadie cuenta: las integraciones'],['0','tarifas publicadas']],
  ],
  'faq'=>[
    ['¿Por qué no publicáis precios?','Porque el mismo encargo puede costar diez veces más según las cinco cosas de arriba, y un «desde X€» que luego no se cumple es peor que no decir nada. Cuéntanos el alcance y te devolvemos alcance y precio, por escrito.'],
    ['¿Cómo puedo abaratar mi proyecto?','Tres palancas reales: reducir integraciones a las imprescindibles de la primera versión, limpiar tus datos antes de empezar, y poner a una sola persona con capacidad de decidir.'],
    ['¿Sale más barato una plantilla o un no-code?','Al principio, casi siempre sí, y es una respuesta legítima. Deja de serlo cuando el negocio depende de algo que la plantilla no hace, o cuando la cuota mensual por usuario ya pesa más que el desarrollo.'],
    ['¿Se paga todo de golpe?','No. Un proyecto se trocea en entregas verificables y cada una se cierra antes de empezar la siguiente, para que en cualquier punto tengas algo que funciona.'],
    ['¿Qué pasa si el alcance cambia a mitad?','Cambia el presupuesto, y se dice cuando ocurre y no al final. Es la razón de trocear: un cambio de alcance en la entrega 3 no obliga a renegociar las siete.'],
  ],
  'asunto'=>'Presupuesto — /es/cuanto-cuesta-un-software-a-medida',
],

];
