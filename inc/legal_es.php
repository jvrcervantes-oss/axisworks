<?php
/* Páginas legales ES (aviso legal, privacidad, cookies). Redactadas por Legal
 * el 24-sep-2026 contra lo que la web hace de verdad: sin cookies, sin
 * analítica, sin píxeles, sin almacenamiento en el navegador, fuentes
 * autoalojadas y un único formulario que llega por email y no se guarda en base
 * de datos. Si algo de eso cambia (analítica, vídeos incrustados, un CRM detrás
 * del formulario), estos textos cambian en el mismo commit.
 * 12-oct-2026: alcance ampliado a erp.axisworks.studio y demo.axisworks.studio,
 * comprobado ese día contra los dominios reales (curl + sus scripts): ninguno
 * pone cookies; erp. no guarda nada (solo borra claves sb-* que hubieran
 * quedado); demo. guarda axw-demo:* en sessionStorage y axw_idioma_ui en
 * localStorage; los dos cargan Google Fonts; la CSP de demo. permite además
 * jsDelivr y cdnjs. Domicilio añadido (owner, 12-oct); el NIB se omite hasta
 * tenerlo (AXW-18). Si erp./demo. autoalojan sus fuentes o cambian lo que
 * guardan, estos textos cambian también. */

$LEGAL_ES = [

'aviso-legal' => [
  'url'=>'/es/aviso-legal',
  'title'=>'Aviso legal — AxisWorks',
  'desc'=>'Quién está detrás de axisworks.studio, erp.axisworks.studio y demo.axisworks.studio, cómo contactar, condiciones de uso de estas webs, propiedad intelectual y ley aplicable.',
  'h1'=>'Aviso legal',
  'updated'=>'2026-10-12',
  'secciones'=>[
    ['h'=>'Titular de la web','p'=>[
      '<p>En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI), te informamos de que la web axisworks.studio y sus subdominios erp.axisworks.studio y demo.axisworks.studio pertenecen a <b>PT MAHKOTA PROPERTY GLOBAL</b>, sociedad constituida en la República de Indonesia. AxisWorks es el nombre comercial con el que presta sus servicios. En este aviso, «la web» son las tres.</p>',
      '<ul><li>Sociedad: PT MAHKOTA PROPERTY GLOBAL</li><li>Domicilio: Kerobokan Kelod, Kuta Utara, Badung, Bali, Indonesia</li><li>Email: <a href="mailto:hello@axisworks.studio">hello@axisworks.studio</a></li><li>Webs: <a href="https://axisworks.studio">https://axisworks.studio</a>, <a href="https://erp.axisworks.studio">https://erp.axisworks.studio</a> y <a href="https://demo.axisworks.studio">https://demo.axisworks.studio</a></li></ul>',
      '<p>Cualquier consulta sobre la web, su contenido o este aviso puede enviarse a ese correo.</p>',
    ]],
    ['h'=>'Condiciones de uso','p'=>[
      '<p>Al navegar por esta web aceptas estas condiciones. Si no las aceptas, no la utilices.</p>',
      '<p>Puedes leer, compartir y enlazar sus páginas. No puedes usarla para infringir la ley, enviar spam o código dañino a través del formulario, intentar acceder a partes del servidor que no son públicas ni copiar su contenido de forma masiva y automatizada para reutilizarlo en otro sitio.</p>',
      '<p>La web describe los servicios del estudio. Nada de lo publicado es una oferta vinculante. Un proyecto empieza solo con un contrato escrito firmado por ambas partes, y ese contrato prevalece sobre lo que diga la web.</p>',
      '<p>La calculadora de ahorro de erp.axisworks.studio da cifras orientativas a partir de los supuestos que tú introduces. Son una estimación, no una promesa de resultados.</p>',
      '<p>demo.axisworks.studio es una demostración de nuestro ERP con datos de ejemplo inventados. Está para que pruebes el programa tal cual es: no es un servicio para uso real, y lo que hagas en ella puede reiniciarse en cualquier momento. Por favor, no metas en ella datos personales reales.</p>',
    ]],
    ['h'=>'Propiedad intelectual','p'=>[
      '<p>Los textos, el diseño, el código, las imágenes y los casos de esta web pertenecen a PT MAHKOTA PROPERTY GLOBAL o se usan con permiso de sus titulares. Reproducirlos, distribuirlos o modificarlos exige nuestra autorización previa por escrito, salvo citas breves que indiquen la fuente y enlacen a ella.</p>',
      '<p>Las capturas y descripciones de trabajos para clientes se publican con su conformidad. Los derechos sobre ese trabajo son de quien diga el contrato de cada proyecto.</p>',
    ]],
    ['h'=>'Marcas de terceros','p'=>[
      '<p>En esta web aparecen nombres y logotipos de herramientas con las que trabajamos, como Claude, ChatGPT, Railway, Blender o Meta. Son marcas de sus respectivos titulares.</p>',
      '<p>Los mostramos solo para identificar las herramientas que usamos. Que aparezcan aquí no significa que ninguna de esas empresas patrocine, respalde o tenga relación societaria o comercial con AxisWorks, salvo que lo digamos expresamente.</p>',
    ]],
    ['h'=>'Responsabilidad','p'=>[
      '<p>Cuidamos que el contenido sea correcto y esté al día, pero es información general sobre nuestro trabajo, no asesoramiento profesional para tu caso concreto. Las decisiones que tomes basándote solo en lo que lees aquí son tuyas.</p>',
      '<p>Procuramos que la web esté disponible y libre de código dañino. No podemos garantizar que funcione siempre ni sin errores, y no respondemos de interrupciones por mantenimiento, por nuestros proveedores o por causas ajenas a nuestro control.</p>',
      '<p>Los enlaces a otras webs se ofrecen por comodidad. No controlamos esas webs y no respondemos de su contenido ni de cómo tratan tus datos.</p>',
      '<p>Nada de este aviso limita la responsabilidad que la ley no permite limitar.</p>',
    ]],
    ['h'=>'Ley aplicable y jurisdicción','p'=>[
      '<p>Este aviso y el uso de la web se rigen por la ley de la República de Indonesia. Si usas la web como consumidor, conservas la protección de las normas imperativas de tu país de residencia y puedes reclamar ante sus tribunales.</p>',
      '<p>Los contratos de servicios tienen su propia cláusula de ley aplicable y jurisdicción.</p>',
    ]],
    ['h'=>'Cambios','p'=>[
      '<p>Podemos actualizar este aviso cuando cambie la web o la ley. La fecha de arriba indica la versión vigente.</p>',
    ]],
  ],
],

'privacidad' => [
  'url'=>'/es/privacidad',
  'title'=>'Política de privacidad — AxisWorks',
  'desc'=>'Qué datos personales recogen axisworks.studio, erp.axisworks.studio y demo.axisworks.studio, para qué, con qué base legal, quién los recibe, cuánto tiempo se guardan y cómo ejercer tus derechos.',
  'h1'=>'Política de privacidad',
  'updated'=>'2026-10-12',
  'secciones'=>[
    ['h'=>'En resumen','p'=>[
      '<ul><li>Esta política cubre axisworks.studio, erp.axisworks.studio y demo.axisworks.studio.</li><li>Solo recogemos lo que escribes en el formulario de contacto o nos mandas por email, la página desde la que escribes y, si viene en el enlace, la campaña que te trajo.</li><li>Lo usamos para contestarte. Sin newsletter, sin publicidad, sin venta de datos.</li><li>Nos llega por email y no se guarda en ninguna base de datos de la web.</li><li>Ninguna de las tres usa cookies, ni analítica, ni píxeles de seguimiento. La demo guarda sus datos de ejemplo y el idioma que elijas en tu propio navegador para poder funcionar; la política de cookies dice qué y durante cuánto tiempo.</li><li>erp.axisworks.studio y la demo cargan fuentes de Google Fonts, así que Google recibe tu IP cuando las abres.</li></ul>',
    ]],
    ['h'=>'Responsable del tratamiento','p'=>[
      '<p>El responsable es <b>PT MAHKOTA PROPERTY GLOBAL</b>, sociedad constituida en Indonesia que opera con el nombre comercial AxisWorks, con domicilio en Kerobokan Kelod, Kuta Utara, Badung, Bali, Indonesia.</p>',
      '<p>Contacto para todo lo relativo a tus datos: <a href="mailto:hello@axisworks.studio">hello@axisworks.studio</a>.</p>',
    ]],
    ['h'=>'Qué datos recogemos','p'=>[
      '<p>A través del formulario de contacto:</p>',
      '<ul><li>Tu nombre y tu email.</li><li>Tu empresa, si decides indicarla.</li><li>Tu mensaje y lo que incluyas en él.</li><li>La página de la web desde la que enviaste el formulario.</li><li>Si el enlace que seguiste llevaba parámetros de campaña (<code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code> y similares), sus valores. Nos dicen qué canal o campaña te trajo. No te identifican.</li></ul>',
      '<p>Si nos escribes por email, recibimos lo que nos mandas. Eso incluye el botón «Ask for a quote with these numbers» de erp.axisworks.studio: abre tu propio programa de correo con un mensaje ya escrito con las cifras que pusiste en la calculadora. No nos llega nada hasta que lo envías tú, y lo tratamos igual que un mensaje del formulario.</p>',
      '<p>La demo (demo.axisworks.studio) no tiene cuentas ni inicio de sesión: entras como un usuario de ejemplo. Las personas, empresas, contratos y cifras que ves en ella están inventados para la demostración y no salen de ninguna base de datos de clientes reales. Lo que escribes en la demo se queda en la pestaña de tu navegador y no se nos envía ni a nosotros ni a nadie. Al cerrar la pestaña o pulsar «Reset demo» se borra. Por favor, no metas datos personales reales.</p>',
      '<p>Cuando abres erp.axisworks.studio o la demo, tu navegador descarga fuentes e iconos de Google Fonts, un servicio de Google, así que Google recibe tu dirección IP y los datos técnicos que lleva cualquier petición (como tu navegador). Algunas páginas de la demo pueden cargar además librerías de código desde jsDelivr o cdnjs (Cloudflare), que reciben los mismos datos. axisworks.studio sirve sus fuentes desde su propio dominio y no hace esto.</p>',
      '<p>Para frenar el spam, el formulario limita cuántos mensajes pueden enviarse desde una misma dirección IP. Para eso el servidor guarda tu IP solo como un hash combinado con un secreto que cambia cada día, de modo que no puede leerse de vuelta. Ese hash se borra en menos de 24 horas.</p>',
      '<p>Como cualquier servidor web, los que alojan estas webs registran datos técnicos de cada petición (dirección IP, fecha y hora, página pedida, navegador) para mantener el servicio en marcha y seguro.</p>',
      '<p>No pedimos datos de categorías especiales (salud, ideología, origen étnico…). Por favor, no los incluyas en tu mensaje.</p>',
    ]],
    ['h'=>'Para qué los usamos y con qué base legal','p'=>[
      '<ul><li><b>Responder a una consulta sobre nuestros servicios</b> (presupuesto, proyecto, dudas antes de contratar). Base legal: aplicación de medidas precontractuales a petición tuya (art. 6.1.b del RGPD).</li><li><b>Responder a cualquier otro mensaje</b> (prensa, candidaturas, otras preguntas). Base legal: nuestro interés legítimo en contestar a quien nos escribe (art. 6.1.f del RGPD). Nos escribes para recibir respuesta, así que contestarte es lo que esperas.</li><li><b>Proteger el formulario del spam y el servidor de abusos</b>, incluidos el hash de la IP y los registros del servidor. Base legal: nuestro interés legítimo en mantener la web segura (art. 6.1.f del RGPD).</li><li><b>Mostrar erp.axisworks.studio y la demo con sus fuentes e iconos</b>, que es por lo que tu navegador contacta con Google Fonts y, en algunas páginas de la demo, con jsDelivr o cdnjs. Base legal: nuestro interés legítimo en que esas páginas se vean bien (art. 6.1.f del RGPD). Puedes oponerte escribiéndonos.</li></ul>',
      '<p>El formulario no lleva casilla porque nada de esto se basa en tu consentimiento. No usaremos tus datos para enviarte newsletters ni publicidad.</p>',
      '<p>No tomamos decisiones automatizadas sobre ti.</p>',
    ]],
    ['h'=>'Quién recibe tus datos','p'=>[
      '<p>Nadie fuera del estudio, salvo los proveedores que los tratan por encargo nuestro con un contrato de encargo del tratamiento:</p>',
      '<ul><li><b>Hostinger</b>, que aloja estas webs y nuestro buzón de correo.</li></ul>',
      '<p>No vendemos ni cedemos tus datos a terceros para sus propios fines. Solo los comunicaremos si una ley o una autoridad competente nos obliga.</p>',
      '<p>Aparte, cuando abres erp.axisworks.studio o la demo, tu navegador envía tu dirección IP directamente a <b>Google</b> (Google Fonts) y, en algunas páginas de la demo, a <b>jsDelivr</b> o <b>cdnjs (Cloudflare)</b>, para descargar fuentes, iconos o código. No son proveedores que trabajen por encargo nuestro: tratan ese dato según sus propias políticas de privacidad, por ejemplo la de Google en <a href="https://policies.google.com/privacy" rel="noopener">policies.google.com/privacy</a>. Esas peticiones pueden atenderse desde fuera de tu país, también desde Estados Unidos.</p>',
    ]],
    ['h'=>'Transferencias internacionales','p'=>[
      '<p>Estamos establecidos en Indonesia. La Comisión Europea no ha adoptado una decisión de adecuación para Indonesia, así que su nivel de protección de datos no está declarado equivalente al de la Unión Europea.</p>',
      '<p>Cuando nos escribes desde la UE sobre nuestros servicios, que tu mensaje llegue a Indonesia es necesario para aplicar las medidas precontractuales que nos pides. Esa transferencia se ampara en el art. 49.1.b del RGPD. Cualquier otro mensaje lo envías directamente a una empresa establecida fuera de la UE, y le aplicamos esta política y el RGPD igual.</p>',
      '<p>Estén donde estén, los datos se protegen con las mismas medidas: acceso limitado a quien lo necesita, conexiones cifradas (HTTPS) y ninguna copia fuera de nuestro buzón.</p>',
    ]],
    ['h'=>'Cuánto tiempo los guardamos','p'=>[
      '<ul><li><b>Mensajes del formulario:</b> mientras dure la conversación. Si no se inicia una relación de trabajo, los borramos 24 meses después del último mensaje intercambiado. Ese margen cubre lo habitual: un proyecto que vuelve meses después.</li><li><b>Si pasas a ser cliente:</b> la correspondencia entra en el expediente del proyecto y se conserva mientras dure el contrato y, después, durante los plazos que exige la normativa fiscal y mercantil o los necesarios para atender posibles reclamaciones.</li><li><b>Hash de la IP para el antispam:</b> menos de 24 horas.</li></ul>',
      '<p>Si nos pides borrar tu mensaje antes, lo borramos, salvo que una ley nos obligue a conservarlo.</p>',
    ]],
    ['h'=>'Tus derechos','p'=>[
      '<p>Puedes pedirnos en cualquier momento:</p>',
      '<ul><li>acceder a los datos que tenemos sobre ti;</li><li>rectificarlos si son incorrectos;</li><li>suprimirlos;</li><li>oponerte a su uso, también cuando nos basamos en el interés legítimo;</li><li>limitar su uso mientras revisamos una solicitud;</li><li>recibirlos en un formato estructurado y de uso común, o que se los enviemos a otro (portabilidad).</li></ul>',
      '<p>Escribe a <a href="mailto:hello@axisworks.studio">hello@axisworks.studio</a> indicando qué derecho quieres ejercer. Te contestamos en el plazo de un mes. Podemos pedirte que acredites tu identidad si tenemos dudas razonables de que la solicitud venga de ti.</p>',
      '<p>Si crees que no hemos tratado bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" rel="noopener">www.aepd.es</a>) o ante la autoridad de protección de datos del país de la UE donde vivas o trabajes. Te agradeceremos que antes nos des la oportunidad de corregirlo.</p>',
      '<p>Como sociedad indonesia, también estamos sujetos a la Ley n.º 27 de 2022 de Protección de Datos Personales de Indonesia (UU PDP), que te reconoce derechos equivalentes. Puedes ejercerlos en el mismo correo.</p>',
    ]],
    ['h'=>'Seguridad','p'=>[
      '<p>Las tres webs funcionan sobre HTTPS. Los mensajes del formulario van directos a nuestro buzón y no se guardan en una base de datos del servidor web. Solo pueden leerlos las personas del estudio que tienen que contestarte.</p>',
      '<p>Si un incidente de seguridad afecta a tus datos y pone en riesgo tus derechos, lo notificaremos a la autoridad competente y, cuando corresponda, te avisaremos directamente dentro de los plazos legales.</p>',
    ]],
    ['h'=>'Menores','p'=>[
      '<p>Estas webs se dirigen a empresas y profesionales. No está pensada para menores y no recogemos a sabiendas datos de menores de 14 años. Si crees que un menor nos ha escrito, avísanos y borraremos el mensaje.</p>',
    ]],
    ['h'=>'Cambios en esta política','p'=>[
      '<p>Si cambiamos la forma de tratar los datos, actualizaremos esta página antes de que el cambio se aplique. La fecha de arriba indica la versión vigente.</p>',
    ]],
  ],
],

'cookies' => [
  'url'=>'/es/cookies',
  'title'=>'Política de cookies — AxisWorks',
  'desc'=>'axisworks.studio, erp.axisworks.studio y demo.axisworks.studio no usan cookies. Qué guarda la demo del ERP en tu navegador y durante cuánto tiempo, y por qué no hay banner de cookies.',
  'h1'=>'Política de cookies',
  'updated'=>'2026-10-12',
  'secciones'=>[
    ['h'=>'Esta web no usa cookies','p'=>[
      '<p>Esta política cubre axisworks.studio, erp.axisworks.studio y demo.axisworks.studio. Ninguna instala cookies en tu dispositivo, y ninguna usa analítica, píxeles de publicidad o de redes sociales, ni huella digital del navegador.</p>',
      '<p>axisworks.studio y erp.axisworks.studio tampoco guardan nada en el almacenamiento local o de sesión de tu navegador. erp.axisworks.studio solo borra datos de inicio de sesión que versiones anteriores de nuestro software hubieran podido dejar en tu navegador; no guarda nada nuevo.</p>',
      '<p>axisworks.studio sirve sus fuentes tipográficas desde nuestro propio dominio, así que cargar una de sus páginas no envía tu IP a un proveedor de fuentes. erp.axisworks.studio y la demo sí cargan fuentes e iconos de Google Fonts, y algunas páginas de la demo pueden cargar código desde jsDelivr o cdnjs. Eso no es una cookie, pero sí envía tu IP a esos proveedores; lo explica la política de privacidad. No hay vídeos, mapas ni otros contenidos de terceros incrustados que puedan poner sus propias cookies.</p>',
    ]],
    ['h'=>'Qué guarda la demo en tu navegador','p'=>[
      '<p>La demo del ERP en demo.axisworks.studio funciona entera dentro de tu navegador, así que guarda ahí dos cosas. Las dos son nuestras, ninguna es una cookie y ninguna se nos envía ni a nosotros ni a nadie:</p>',
      '<ul><li><code>axw-demo:*</code> (almacenamiento de sesión): los datos de ejemplo y los cambios que haces mientras pruebas la demo, para que se mantengan al pasar de una página a otra. Se borran al cerrar la pestaña o al pulsar «Reset demo».</li><li><code>axw_idioma_ui</code> (almacenamiento local): el idioma que elegiste para las pantallas de la demo. Se guarda cuando eliges idioma, no caduca, y puedes borrarlo limpiando los datos del sitio demo.axisworks.studio en tu navegador.</li></ul>',
    ]],
    ['h'=>'Por qué no hay banner de cookies','p'=>[
      '<p>El banner de cookies sirve para pedir tu consentimiento antes de guardar o leer en tu dispositivo información que no sea estrictamente necesaria. axisworks.studio y erp.axisworks.studio no guardan nada. La demo solo guarda lo que necesita para funcionar como tú le pides: la sesión de la demo y el idioma que eliges. La ley no exige consentimiento para eso, así que no hay nada que consentir, y un banner solo te estorbaría.</p>',
    ]],
    ['h'=>'Enlaces a otras webs','p'=>[
      '<p>Algunas páginas enlazan a otras webs. Si sigues esos enlaces, la otra web puede usar sus propias cookies según su propia política, que no controlamos.</p>',
    ]],
    ['h'=>'Si esto cambia','p'=>[
      '<p>Si algún día añadimos cookies o tecnologías similares que no sean estrictamente necesarias, como analítica, te pediremos el consentimiento antes de usarlas. Rechazar será tan fácil como aceptar, y esta página listará cada cookie con su finalidad, su titular y su duración.</p>',
      '<p>Dudas: <a href="mailto:hello@axisworks.studio">hello@axisworks.studio</a>.</p>',
    ]],
  ],
],

];

$LEGAL_CAPA1_ES = 'PT MAHKOTA PROPERTY GLOBAL (AxisWorks) usará tus datos solo para contestar a tu mensaje; sin newsletter ni publicidad. Puedes acceder a ellos, rectificarlos o borrarlos escribiendo a hello@axisworks.studio. Más información en la <a href="/es/privacidad">política de privacidad</a>.';
