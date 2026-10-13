/* Setup por módulo — el núcleo que comparten el aviso, el asistente, Ajustes y el panel (F3 Entrega 1, bbm-p18-front, 12-oct-2026).
 * Owner, 12-oct 08:00: «1. Yo activo modulo. 2. Al entrar a la intranet salta un aviso de modulo sin configurar, te toca configurarlo. Salta un
 * asistente que te guia por pasos y deja todo eso en Ajustes.» Plan de front con la revisión previa #285 (Diseño) y el plan de Backend (#281-#283).
 * build.py lo inyecta en las instancias del ERP; Lawang no lo lleva.
 *
 * Qué hace, y solo esto:
 *  · `AXW_SETUP.estado()`: UNA llamada por página a `modulos_setup_estado()` (por sb.rpc: no es una *_datos, canon 7.r), con su forma comprobada.
 *    Una forma rara es un ERROR, nunca «todo configurado»: quien no ha podido mirar lo dice (contrato de Frontend).
 *  · `TEXTOS`: un solo mapa código → frase en español, que es la clave de lwT; EN e ID van indexados por esa frase. La base manda CÓDIGOS de una
 *    lista cerrada (erp/modulos.json → setup), nunca frases: así bbm sale en indonesio e inglés sin una palabra en español.
 *  · `AXW_SETUP.explica(err)`: el texto de un error de la base leído por `code` + `hint`, NUNCA por el mensaje.
 *  · `AXW_SETUP.moneda()`: la moneda de la instancia (la ve todo usuario).
 * Lo que NO hace: decidir si un paso está hecho, en qué orden van o quién configura. Eso lo dice la base.
 */
(function () {
  'use strict';

  // ── Textos: código → frase (es). Lista cerrada; un código que no esté sale con una frase digna por tipo, SIN el código, y se cuenta. ──
  var TEXTOS = {
    modulo: {
      base: 'Datos generales', facturas: 'Facturas', recibos: 'Recibos', 'reservas-producto': 'Reservas de producto',
      sociedades: 'Sociedades emisoras', taller: 'Taller', vencimientos: 'Vencimientos', productos: 'Productos'
    },
    estado: { sin_configurar: 'Sin configurar', configurado: 'Configurado' },
    // [título, por qué en una línea] — Diseño #285: cada paso dice para qué sirve
    paso: {
      moneda: ['Moneda del ERP', 'Todos los importes nuevos se guardan en esta moneda.'],
      sociedad: ['Empresa que emite las facturas', 'Su nombre, su identificación fiscal y su domicilio salen en cada factura.'],
      prefijo: ['Prefijo de la numeración de facturas', 'Cada factura empieza por este prefijo. No se podrá cambiar después de emitir la primera factura.'],
      impuesto_pkp: ['¿La empresa cobra impuesto?', 'Si la empresa es PKP, las reservas llevan PPN.'],
      precio_con_impuesto: ['Precio con el impuesto dentro o fuera', 'Dice si el precio de la tarifa ya lleva el impuesto o se suma aparte.'],
      flota: ['Flota y tarifas', 'Las motos que se alquilan y su precio por días.'],
      entrega: ['Entrega a domicilio', 'Desde dónde se entrega y cuánto cuesta por kilómetro.'],
      usuarios: ['Quién lo usa', 'Las personas del equipo que trabajan con este módulo.'],
      cobros: ['Cobros en línea', 'El ERP crea el enlace de pago de cada reserva y comprueba solo cuándo se ha pagado.']
    },
    falta: {
      sin_sociedad: 'Falta dar de alta la empresa que emite las facturas.',
      sin_prefijo: 'Falta el prefijo de la numeración.',
      falta_dato: 'Falta completar: %campos.',
      sin_usuarios: 'Nadie del equipo tiene asignado este módulo.',
      varias_sociedades: "Hay más de una empresa emisora: el impuesto de las reservas se configura cuando quede una sola activa.",
      sin_impuesto: "La empresa no tiene impuesto por defecto: créalo en Ajustes.",
      impuesto_clase: "El impuesto por defecto no es de suma, exento ni no sujeto: elige otro en Ajustes.",
      sin_flota: "Aún no hay ninguna moto con tarifa: añádela en Flota y tarifas.",
      setup_roto: "Este paso no se ha podido comprobar en la base: avisa al estudio."
    },
    campo: {
      prefijo_serie: 'prefijo de la numeración', reservas_sin_impuesto: 'si cobra impuesto', precio_incluye_impuesto: 'precio con impuesto dentro o fuera',
      sede: 'punto de entrega', precio_km: 'precio por kilómetro', moneda: 'moneda',
      razon: "razón social", domicilio: "domicilio", npwp: "identificación fiscal", activa: "empresa activa",
      creacion: 'clave de creación', lectura: 'clave de lectura', aviso: 'token de avisos'
    },
    // hint de la base → frase. `<m>_sin_configurar` se resuelve aparte (lleva el nombre del módulo).
    hint: {
      // Ajustes › Cobros (F3 Entrega 2, bbm-p24-cobros-front): los `codigo` de la edge ajustes-pagos (erp/funciones/ajustes-pagos/index.ts, cabecera).
      // cobros_paso.js los pasa con el codigo como code y 'cobros_' + codigo como hint (salvo falta_confirmar_live, live_no_permitido y
      // cuenta_pruebas_solo_mira, hints de la base que van tal cual), así explica() los lee por código como al resto (sin llaves en este
      // comentario: setup_modulos.test.js lee el grupo hasta la primera llave de cierre).
      cobros_faltan_claves: 'La primera vez hay que poner las tres: clave de creación, clave de lectura y token de avisos.',
      cobros_clave_no_valida: 'Esa clave no tiene la forma de las de Xendit: cópiala entera desde el panel de Xendit.',
      cobros_modos_distintos: 'La clave de creación y la de lectura son de modos distintos: las dos tienen que ser de prueba o las dos reales.',
      cobros_sin_cambios: 'No has cambiado ninguna clave.',
      cobros_sin_correo_usuario: 'Tu cuenta no tiene un correo válido al que mandar el código.',
      cobros_reautenticar: 'Escribe la contraseña de tu cuenta para confirmar el cambio.',
      cobros_clave_actual_incorrecta: 'Esa contraseña no es la de tu cuenta.',
      cobros_no_super_admin: 'Las claves de cobro solo las cambia el administrador principal.',
      cobros_codigo_no_valido: 'El código no vale o ha caducado: pide uno nuevo.',
      // live_no_permitido: solo lo da el servidor de ANTES de 20261012233000 (bbm-p38: neutra, sin «pídelo al estudio»; se va cuando ningún ERP lo tenga)
      live_no_permitido: 'El modo real todavía no está disponible en este ERP.',
      falta_confirmar_live: 'Con claves reales hay que escribir LIVE para confirmar que vas a cobrar dinero de verdad.',
      cobros_aviso_no_enviado: 'No se ha podido avisar por correo a los demás del paso a cobros reales: no se ha guardado nada. El código sigue valiendo: inténtalo otra vez en un rato.',
      // la frase propia de sin_a_quien_avisar: la pantalla enseña el texto del servidor (dos causas); esta va en el pie y si no hay traducción
      cobros_sin_a_quien_avisar: 'Para cobrar de verdad tiene que haber alguien más a quien avisar del cambio: no se ha guardado nada.',
      cobros_prueba_caducada: 'La prueba ha caducado: pide un código nuevo y vuelve a probar.',
      cobros_prueba_fallida: 'Xendit no ha aceptado las claves: no se ha cambiado nada y siguen las de antes.',
      cobros_demasiados_intentos: 'Demasiados intentos seguidos: espera unos minutos.',
      cobros_base_no_responde: 'El ERP no ha podido terminar la operación: prueba otra vez en un rato.',
      cobros_codigo_no_enviado: 'No se ha podido mandar el código por correo: revisa el servidor de correo del ERP.',
      cobros_proveedor_no_responde: 'Xendit no ha respondido: no se ha cambiado nada. Prueba otra vez en un rato.',
      cobros_codigo_no_disponible: 'La confirmación por código no está disponible en este ERP: avisa al estudio.',
      cobros_envios_pausados: 'Los envíos de correo están en pausa: ahora no se puede mandar el código.',
      cobros_sin_sesion: 'Tu sesión ha caducado: vuelve a entrar.',
      cobros_origen: 'Esta pantalla no se ha abierto desde la dirección del ERP.',
      cobros_edge_no_disponible: 'Los cobros en línea todavía no están disponibles en este ERP.',
      cobros_respuesta_ilegible: 'El ERP ha devuelto algo inesperado.',
      cobros_duda: 'No se sabe si se ha guardado: mira cómo están las claves antes de repetir.',
      sin_prefijo: 'La empresa no tiene prefijo de numeración: no se puede emitir la factura todavía.',
      prefijo_fijo: 'El prefijo ya no se puede cambiar: hay facturas emitidas con él.',
      moneda_con_datos: 'La moneda ya no se puede cambiar: hay tarifas, reservas o facturas en otra moneda.',
      moneda_no_permitida: 'Esa moneda no está en la lista que admite el ERP.',
      falta_confirmo: 'Este cambio no se puede deshacer: hay que confirmarlo antes de guardar.',
      cuenta_pruebas_solo_mira: 'Esta es una cuenta de pruebas: puede mirar, no cambiar nada.',
      modulo_apagado: 'Este módulo no está encendido en este ERP.',
      impuesto_no_configurado: 'Falta configurar el impuesto de las reservas.',
      motivo: "Para cambiar algo ya guardado hay que escribir el motivo.",
      si_o_no: "Elige sí o no.",
      clave_no_editable: "Este ajuste no se cambia desde aquí.",
      setup_sin_sembrar: "Este ERP aún no tiene preparada la configuración por módulos: avisa al estudio."
    },
    ui: {
      elige: "Elige una opción",
      moneda: "Moneda",
      razon: "Razón social",
      domicilio: "Domicilio",
      npwp_label: "Etiqueta fiscal",
      npwp: "Identificación fiscal",
      rep: "Representante (opcional)",
      prefijo: "Prefijo",
      prefijo_ayuda: "Mayúsculas y números, de 2 a 8. Por ejemplo: BBM",
      prefijo_ejemplo: "Las facturas empezarán así: %p-…",
      primero_sociedad: "Primero hay que dar de alta la empresa que emite las facturas.",
      si_pkp: "Sí: es PKP y cobra PPN",
      no_pkp: "No: no es PKP (las reservas van sin PPN)",
      dentro: "El precio de la tarifa ya lleva el impuesto",
      fuera: "El impuesto se suma al precio de la tarifa",
      abrir: "Abrir %pantalla",
      comprobar: "Ya lo hice, comprobar",
      otra_pantalla: "Este paso se hace en otra pantalla. Al terminar, vuelve aquí y pulsa «Ya lo hice, comprobar».",
      falta_valor: "Falta rellenar: %c.",
      prefijo_formato: "El prefijo va en mayúsculas y números, de 2 a 8 caracteres.",
      no_cambia: "No se podrá cambiar después.",
      teclea: "Para confirmar, escribe %v",
      no_coincide: "Lo escrito no coincide.",
      fijar_moneda: "Fijar la moneda: %v",
      fijar_prefijo: "Fijar el prefijo: %v",
      fijado: "Fijado",
      comprobando: "Comprobando si se guardó…",
      no_guardado: "El ERP dice que no se guardó. Puedes volver a intentarlo.",
      guardar_seguir: "Guardar y seguir",
      siguiente: "Siguiente",
      atras: "Atrás",
      luego: "Dejar para luego",
      listo: "%m está listo.",
      paso_n: "Paso %n de %t",
      opcional: "Opcional",
      solo_admin: "Solo el administrador principal puede configurar los módulos.",
      volver: "Volver",
      configurar_m: "Configurar %m",
      cargando: "Cargando…",
      reintentar: "Reintentar",
      no_mirar: "No se ha podido mirar la configuración",
      requiere: "Este paso necesita el módulo %m: pídelo al estudio.",
      hecho: "Hecho",
      pendiente: "Pendiente",
      cambiar: "Cambiar",
      todo_listo: "Todos los módulos están configurados.",
      elige_modulo: "Módulos por configurar",
      configurar_modulos: "Configurar módulos",
      abrir_asistente: "Abrir el asistente",
      guardar: "Guardar",
      guardado: "Guardado.",
      no_se_guardo: "No se guardó: %e",
      motivo: "Motivo del cambio",
      motivo_ayuda: "Obligatorio al cambiar algo ya guardado: queda en el registro de cambios.",
      motivo_corto: "Escribe el motivo del cambio (al menos 3 letras).",
      valor_actual: "Ahora: %v",
      sin_valor: "Sin decidir",
      ir_inicio: "Ir al inicio",
      obligatorio: "Obligatorio",
      para_que: "Para qué sirve",
      pasos_hechos: "%n de %t pasos hechos",
      volver_erp: "Volver al ERP",
      as_eyebrow: "Asistente de configuración · solo el administrador principal",
      as_titulo: "Configura tu ERP,",
      as_titulo2: "paso a paso.",
      as_lead: "Cada módulo hace unas pocas preguntas, una por pantalla. Todo se guarda al momento y puedes cambiarlo después en Ajustes.",
      solo_tu: "Solo tú, como administrador principal, puedes configurar los módulos. Hasta que termines, tu equipo ve que el módulo aún no está listo.",
      sigue_donde: "Sigue donde lo dejaste",
      modulos_encendidos: "Módulos encendidos",
      n_modulos_pasos: "%m módulos · %p pasos",
      a_medias: "A medias",
      empezar: "Empezar",
      continuar: "Continuar",
      revisar: "Revisar",
      se_guarda: "Se guarda al momento. El asistente abre siempre en el primer paso que falta.",
      listo_eyebrow: "Configuración completa",
      listo_lead: "Lo que has configurado queda en Ajustes: puedes cambiarlo ahí cuando quieras, y cada cambio queda registrado.",
      revisar_ajustes: "Revisar en Ajustes",
      se_fija: "Se fija después",
      opc_listo: '%m ya funciona. Queda por configurar:',
      opc_linea: '%p sin configurar. %c',
      opc_todos: 'Todos los módulos funcionan. Queda por configurar:',
      opc_n: '%n pasos opcionales sin configurar',
      opc_n_uno: '1 paso opcional sin configurar',
      // Diseño del owner S10-S60/S91 (bbm-p41, 13-oct): carril «Tu configuración», cabeza «Módulo · Paso n de N» y las dos líneas «para qué / si lo saltas»
      tu_config: 'Tu configuración',
      todos_modulos: 'Todos los módulos',
      paso_de: '%m · Paso %n de %t',
      si_saltas: 'Si lo saltas',
      salta_obligatorio: '%m no queda listo sin este paso: tu equipo ve que el módulo aún no está listo.',
      carril_pie: 'Se guarda al momento.',
      carril_pie2: 'Puedes salir cuando quieras: volverás a este paso.',
      saltar: 'Saltar este paso',
      pasos_modulo: 'Pasos de %m'
    },
    general: {
      sin_configurar_admin: '%m aún no está configurado.',
      sin_configurar_resto: 'Este módulo aún no está listo: lo está configurando el administrador.',
      sin_permiso: 'Tu sesión no tiene permiso para esto.',
      no_existe: 'Esta función todavía no está disponible en este ERP.',
      red: 'El ERP no ha respondido: prueba otra vez en un rato.',
      forma: 'El ERP ha devuelto algo inesperado.',
      configurar: 'Configurar',
      aviso_titulo_uno: "Tienes un módulo sin configurar",
      aviso_titulo_varios: "Tienes %n módulos sin configurar",
      aviso_detalle_uno: "%m está encendido. Todo lo demás sigue funcionando mientras lo configuras.",
      aviso_detalle_varios: "%lista están encendidos. Todo lo demás sigue funcionando mientras los configuras.",
      nota_titulo: "Este módulo aún no está listo.",
      nota_texto: "Lo está configurando el administrador principal. Aparecerá aquí en cuanto esté listo: no tienes que hacer nada.",
      ahora_no: 'Ahora no',
      // Un código que este mapa no conoce NUNCA se enseña al cliente (bbm-p31, 12-oct: el ensayo de Calidad vio «Langkah tanpa nama (kode: negocio)»):
      // sale una frase digna por tipo, se cuenta en `desconocidos` y se avisa por consola para el estudio. setup_frases.test.js cruza la lista de la base.
      desconocido: 'Pendiente de revisar',
      desconocido_paso: 'Otro paso de la configuración',
      desconocido_paso_d: 'Esta pantalla aún no sabe explicar este paso. Si no sabes cómo hacerlo, avisa al estudio.',
      desconocido_campo: 'otro dato',
      desconocido_modulo: 'Otro módulo',
      desconocido_falta: 'Falta completar este paso.',
      desconocido_consecuencia: 'Es opcional: puedes configurarlo cuando quieras.',
      error_codigo: 'No se ha podido hacer. Si vuelve a pasar, avisa al estudio.'
    },
    // Qué pasa si un paso OPCIONAL se queda sin hacer (agencia-81, 12-oct, ensayo de Calidad: con Cobros sin configurar el asistente decía «listo» y el bot
    // no podía cobrar). «Listo» a secas solo cuando no queda nada; si queda algo, se dice qué y su consecuencia en una línea. El texto es del front, no de la base.
    consecuencia: {
      idiomas: 'El ERP sigue en los idiomas que fijó el estudio al publicarlo.',
      correo: 'Los correos salen con la configuración de origen, no desde tu buzón.',
      usuarios: 'Solo el administrador principal trabaja con este módulo.',
      clase: 'Se toma la clase del primer producto de alquiler.',
      reglas_reserva: 'Las reservas usan las reglas por defecto.',
      entrega: 'No se ofrece entrega a domicilio.',
      cobros: 'Los clientes no pueden pagar en línea.',
      taller_revisiones: 'El Taller no se abre al equipo hasta que haya listas de revisión.',
      taller_recambios: 'Las órdenes del Taller no pueden apuntar piezas de recambio.',
      taller_mecanicos: 'El Taller no se abre al equipo hasta que haya un mecánico.'
    },
    // Ajustes › Cobros y su paso del asistente (cobros_paso.js). `prueba_*`: el resultado de la prueba contra Xendit de cada clave (`fallo` de la edge).
    cobros: {
      pestana: 'Cobros en línea',   // no «Cobros» a secas: en indonesio esa frase ya es «Penerimaan» (lo cobrado, Finanzas) en i18n_id.json (bbm-p31)
      titulo: 'Cobros en línea',
      lead: 'Las claves de Xendit con las que el ERP crea el enlace de pago y comprueba los pagos. Se escriben una vez y no se vuelven a enseñar.',
      proveedor: 'Quién procesa los cobros',
      xendit_d: 'Tarjeta, transferencia y monederos electrónicos. Indonesia y el Sudeste Asiático.',
      modo: 'Modo',
      modo_test: 'Modo prueba · sin dinero real',
      modo_live: 'Modo real',
      dinero_real: 'Dinero real',
      live_aviso: 'Modo real: a los clientes se les cobra dinero de verdad.',
      live_confirma_d: 'Nadie del estudio lo revisa antes: lo confirmas tú. Al guardar se avisa por correo a los demás administradores.',
      modo_guardado: 'Las claves guardadas son de %m.',
      modo_desde: 'Desde el %f.',
      modo_desde_por: 'Desde el %f, puesto por %p.',
      modo_cambiado: 'Otro administrador ha cambiado el modo de cobro mientras tenías esta página abierta. Revisa el modo y vuelve a pegar las claves: Xendit da un token de avisos distinto en cada modo.',
      m_test: 'modo prueba',
      m_live: 'modo real',
      creacion: 'Clave de creación (Money-in Write)',
      creacion_d: 'El ERP la usa solo para crear el enlace de pago.',
      lectura: 'Clave de lectura (Money-in Read)',
      lectura_d: 'El ERP la usa para comprobar que el pago ha entrado. Tiene que ser otra clave, de solo lectura.',
      aviso: 'Token de avisos (callback)',
      aviso_d: 'Xendit lo manda con cada aviso de pago para demostrar que el aviso es suyo.',
      pega: 'Pégala entera desde el panel de Xendit. Una vez guardada no se vuelve a enseñar, ni aquí ni en ningún sitio.',
      puesta: 'Configurada el %f',
      puesta_por: 'Por %p. No se vuelve a enseñar.',
      no_puesta: 'Sin poner todavía',
      reemplazar: 'Reemplazar',
      dejar: 'Dejar la de ahora',
      pedir: 'Pedir el código de confirmación',
      enviado: 'Te hemos mandado un código a %c. Caduca en 10 minutos.',
      codigo: 'Código de 6 cifras',
      contrasena: 'Contraseña de tu cuenta',
      contrasena_d: 'Cambiar una clave de cobro cambia a dónde van los cobros: por eso se pide siempre.',
      volver_a_escribir: 'Cambiar lo escrito',
      prueba_nota: 'Al guardar, el ERP prueba las claves con Xendit sin crear ningún cobro. Si Xendit no las acepta, no se cambia nada.',
      probar_guardar: 'Probar la conexión y guardar',
      conectado: 'Conectado a Xendit · %m · %h',
      conectado_sin_modo: 'Conectado a Xendit · %h',
      escribe_codigo: 'Escribe el código de 6 cifras y la contraseña de tu cuenta.',
      primero_codigo: 'Primero pide el código de confirmación.',
      no_casa_test: 'Esta clave es de modo real y has elegido modo prueba: pega una clave de prueba o cambia a modo real.',
      no_casa_live: 'Esta clave es de modo prueba y has elegido modo real: pega una clave real o cambia a modo prueba.',
      intentos: 'Intentos en los últimos 10 minutos: %n de %t.',
      solo_principal: 'Los cobros en línea los configura el administrador principal.',
      avisado: 'Se ha avisado del cambio por correo a los demás administradores.',
      prueba_no_autorizada: 'Xendit no reconoce esta clave.',
      prueba_sin_permiso: 'Esta clave no tiene el permiso que hace falta.',
      prueba_respuesta_rara: 'Xendit ha respondido algo inesperado con esta clave.',
      prueba_con_escritura: 'Esta clave también puede crear cobros y devolver dinero: aquí va una de solo lectura (Money-in Read).',
      prueba_no_se_prueba: 'Xendit no deja probarlo: se comprobará con el primer aviso de pago.'
    },
    // Textos que la edge ajustes-pagos manda TAL CUAL y la pantalla enseña (contrato de bbm-p34, 20261012233000): sin_a_quien_avisar tiene dos causas y
    // solo el servidor sabe cuál. Copiados byte a byte de erp/funciones/ajustes-pagos/index.ts (411a147b); aquí solo para que EN e ID los traduzcan por su
    // frase exacta. Si la edge cambia un texto, la pantalla en en/id cae en hint.cobros_sin_a_quien_avisar (nunca enseña español). bbm-p38, 13-oct.
    servidor: {
      sin_a_quien_avisar_correo: 'El servidor de correo ha cambiado hace menos de 24 horas: para cobrar de verdad espera a que pasen y vuelve a intentarlo. No se ha guardado nada.',
      sin_a_quien_avisar_testigo_24h: 'Para cobrar de verdad tiene que haber alguien más a quien avisar desde hace al menos 24 horas: otro super admin activo o un buzón de avisos de sistema de tu dominio (Ajustes › Correo) que no haya cambiado en ese tiempo. No se ha guardado nada.',
      sin_a_quien_avisar_testigo: 'Para cobrar de verdad tiene que haber alguien más a quien avisar: otro super admin activo o un buzón de avisos de sistema de tu dominio (Ajustes › Correo). No se ha guardado nada.'
    }
  };

  // EN e ID, indexados por la frase en español (el patrón de ajustes_puesta.js). Glosario id: glosario_id.json (test_idiomas_instancia.py).
  var EN = {
    "Elige una opción": "Choose an option", "Moneda": "Currency", "Razón social": "Legal name", "Domicilio": "Address", "Etiqueta fiscal": "Tax label", "Identificación fiscal": "Tax ID", "Representante (opcional)": "Representative (optional)", "Prefijo": "Prefix", "Mayúsculas y números, de 2 a 8. Por ejemplo: BBM": "Capital letters and numbers, 2 to 8. For example: BBM", "Las facturas empezarán así: %p-…": "Invoices will start like this: %p-…", "Primero hay que dar de alta la empresa que emite las facturas.": "First, add the company that issues the invoices.", "Sí: es PKP y cobra PPN": "Yes: it is PKP and charges VAT (PPN)", "No: no es PKP (las reservas van sin PPN)": "No: it is not PKP (bookings carry no VAT)", "El precio de la tarifa ya lleva el impuesto": "The rate price already includes the tax", "El impuesto se suma al precio de la tarifa": "The tax is added to the rate price", "Abrir %pantalla": "Open %pantalla", "Ya lo hice, comprobar": "Done, check it", "Este paso se hace en otra pantalla. Al terminar, vuelve aquí y pulsa «Ya lo hice, comprobar».": "This step is done on another screen. When you finish, come back here and press «Done, check it».", "Falta rellenar: %c.": "Still to fill in: %c.", "El prefijo va en mayúsculas y números, de 2 a 8 caracteres.": "The prefix uses capital letters and numbers, 2 to 8 characters.", "No se podrá cambiar después.": "It cannot be changed later.", "Para confirmar, escribe %v": "To confirm, type %v", "Lo escrito no coincide.": "What you typed does not match.", "Fijar la moneda: %v": "Set the currency: %v", "Fijar el prefijo: %v": "Set the prefix: %v", "Fijado": "Set", "Comprobando si se guardó…": "Checking whether it was saved…", "El ERP dice que no se guardó. Puedes volver a intentarlo.": "The ERP says it was not saved. You can try again.", "Guardar y seguir": "Save and continue", "Siguiente": "Next", "Atrás": "Back", "Dejar para luego": "Leave it for later", "%m está listo.": "%m is ready.", "Paso %n de %t": "Step %n of %t", "Opcional": "Optional", "Solo el administrador principal puede configurar los módulos.": "Only the main administrator can set up the modules.", "Volver": "Go back", "Configurar %m": "Set up %m", "Cargando…": "Loading…", "Reintentar": "Retry", "No se ha podido mirar la configuración": "The setup could not be checked", "Este paso necesita el módulo %m: pídelo al estudio.": "This step needs the %m module: ask the studio.", "Hecho": "Done", "Pendiente": "Pending", "Cambiar": "Change", "Todos los módulos están configurados.": "All modules are set up.", "Módulos por configurar": "Modules to set up", "Configurar módulos": "Module setup", "Abrir el asistente": "Open the wizard", "Guardar": "Save", "Guardado.": "Saved.", "No se guardó: %e": "Not saved: %e", "Motivo del cambio": "Reason for the change", "Obligatorio al cambiar algo ya guardado: queda en el registro de cambios.": "Required when changing something already saved: it is kept in the change log.", "Escribe el motivo del cambio (al menos 3 letras).": "Write the reason for the change (at least 3 letters).", "Ahora: %v": "Now: %v", "Sin decidir": "Not decided", "Ir al inicio": "Go to home",
    'Datos generales': 'General settings', 'Facturas': 'Invoices', 'Recibos': 'Receipts', 'Reservas de producto': 'Product bookings',
    'Sociedades emisoras': 'Issuing companies', 'Taller': 'Workshop', 'Vencimientos': 'Due dates', 'Productos': 'Products',
    'Sin configurar': 'Not set up', 'Configurado': 'Set up',
    'Moneda del ERP': 'ERP currency', 'Todos los importes nuevos se guardan en esta moneda.': 'All new amounts are stored in this currency.',
    'Empresa que emite las facturas': 'Company that issues the invoices',
    'Su nombre, su identificación fiscal y su domicilio salen en cada factura.': 'Its name, tax ID and address appear on every invoice.',
    'Prefijo de la numeración de facturas': 'Invoice numbering prefix',
    'Cada factura empieza por este prefijo. No se podrá cambiar después de emitir la primera factura.': 'Every invoice starts with this prefix. It cannot be changed after the first invoice is issued.',
    '¿La empresa cobra impuesto?': 'Does the company charge tax?', 'Si la empresa es PKP, las reservas llevan PPN.': 'If the company is PKP, bookings carry VAT (PPN).',
    'Precio con el impuesto dentro o fuera': 'Price with tax included or added',
    'Dice si el precio de la tarifa ya lleva el impuesto o se suma aparte.': 'Says whether the rate price already includes the tax or it is added on top.',
    'Flota y tarifas': 'Fleet and rates', 'Las motos que se alquilan y su precio por días.': 'The bikes for rent and their price per days.',
    'Entrega a domicilio': 'Home delivery', 'Desde dónde se entrega y cuánto cuesta por kilómetro.': 'Where deliveries start from and the price per kilometre.',
    'Quién lo usa': 'Who uses it', 'Las personas del equipo que trabajan con este módulo.': 'The team members who work with this module.',
    'Falta dar de alta la empresa que emite las facturas.': 'The company that issues the invoices has not been added yet.',
    'Falta el prefijo de la numeración.': 'The numbering prefix is missing.', 'Falta completar: %campos.': 'Still to fill in: %campos.',
    'Nadie del equipo tiene asignado este módulo.': 'Nobody on the team has this module assigned.',
    'prefijo de la numeración': 'numbering prefix', 'si cobra impuesto': 'whether it charges tax', 'precio con impuesto dentro o fuera': 'price with tax included or added',
    'punto de entrega': 'delivery point', 'precio por kilómetro': 'price per kilometre', 'moneda': 'currency',
    'La empresa no tiene prefijo de numeración: no se puede emitir la factura todavía.': 'The company has no numbering prefix: the invoice cannot be issued yet.',
    'El prefijo ya no se puede cambiar: hay facturas emitidas con él.': 'The prefix can no longer be changed: invoices have been issued with it.',
    'La moneda ya no se puede cambiar: hay tarifas, reservas o facturas en otra moneda.': 'The currency can no longer be changed: there are rates, bookings or invoices in another currency.',
    'Esa moneda no está en la lista que admite el ERP.': 'That currency is not on the list the ERP accepts.',
    'Este cambio no se puede deshacer: hay que confirmarlo antes de guardar.': 'This change cannot be undone: it must be confirmed before saving.',
    'Esta es una cuenta de pruebas: puede mirar, no cambiar nada.': 'This is a test account: it can look, not change anything.',
    'Este módulo no está encendido en este ERP.': 'This module is not switched on in this ERP.',
    'Falta configurar el impuesto de las reservas.': 'The booking tax is not set up yet.',
    // Cobros (cobros_paso.js)
    'Cobros en línea': 'Online payments', 'El ERP crea el enlace de pago de cada reserva y comprueba solo cuándo se ha pagado.': 'The ERP creates the payment link for each booking and checks by itself when it has been paid.',
    'clave de creación': 'creation key', 'clave de lectura': 'read key', 'token de avisos': 'callback token',
    'La primera vez hay que poner las tres: clave de creación, clave de lectura y token de avisos.': 'The first time all three are needed: creation key, read key and callback token.',
    'Esa clave no tiene la forma de las de Xendit: cópiala entera desde el panel de Xendit.': 'That key does not look like a Xendit key: copy all of it from the Xendit dashboard.',
    'La clave de creación y la de lectura son de modos distintos: las dos tienen que ser de prueba o las dos reales.': 'The creation key and the read key are from different modes: both must be test keys or both live keys.',
    'No has cambiado ninguna clave.': 'You have not changed any key.',
    'Tu cuenta no tiene un correo válido al que mandar el código.': 'Your account has no valid email to send the code to.',
    'Escribe la contraseña de tu cuenta para confirmar el cambio.': 'Type your account password to confirm the change.',
    'Esa contraseña no es la de tu cuenta.': 'That is not your account password.',
    'Las claves de cobro solo las cambia el administrador principal.': 'Only the main administrator can change the payment keys.',
    'El código no vale o ha caducado: pide uno nuevo.': 'The code is not valid or has expired: ask for a new one.',
    'El modo real todavía no está disponible en este ERP.': 'Live mode is not available in this ERP yet.',
    'Con claves reales hay que escribir LIVE para confirmar que vas a cobrar dinero de verdad.': 'With live keys you must type LIVE to confirm that you are going to charge real money.',
    'No se ha podido avisar por correo a los demás del paso a cobros reales: no se ha guardado nada. El código sigue valiendo: inténtalo otra vez en un rato.': 'The others could not be told by email about the switch to live payments: nothing was saved. The code is still valid: try again in a moment.',
    'Para cobrar de verdad tiene que haber alguien más a quien avisar del cambio: no se ha guardado nada.': 'To charge real money there must be someone else to tell about the change: nothing was saved.',
    'El servidor de correo ha cambiado hace menos de 24 horas: para cobrar de verdad espera a que pasen y vuelve a intentarlo. No se ha guardado nada.':
      'The mail server changed less than 24 hours ago: to charge real money, wait until 24 hours have passed and try again. Nothing was saved.',
    'Para cobrar de verdad tiene que haber alguien más a quien avisar desde hace al menos 24 horas: otro super admin activo o un buzón de avisos de sistema de tu dominio (Ajustes › Correo) que no haya cambiado en ese tiempo. No se ha guardado nada.':
      'To charge real money there must be someone else to notify, in place for at least 24 hours: another active super admin, or a system notification mailbox on your domain (Settings › Email) that has not changed in that time. Nothing was saved.',
    'Para cobrar de verdad tiene que haber alguien más a quien avisar: otro super admin activo o un buzón de avisos de sistema de tu dominio (Ajustes › Correo). No se ha guardado nada.':
      'To charge real money there must be someone else to notify: another active super admin, or a system notification mailbox on your domain (Settings › Email). Nothing was saved.',
    'La prueba ha caducado: pide un código nuevo y vuelve a probar.': 'The test has expired: ask for a new code and test again.',
    'Xendit no ha aceptado las claves: no se ha cambiado nada y siguen las de antes.': 'Xendit did not accept the keys: nothing was changed and the previous ones stay.',
    'Demasiados intentos seguidos: espera unos minutos.': 'Too many attempts in a row: wait a few minutes.',
    'El ERP no ha podido terminar la operación: prueba otra vez en un rato.': 'The ERP could not finish the operation: try again in a moment.',
    'No se ha podido mandar el código por correo: revisa el servidor de correo del ERP.': 'The code could not be sent by email: check the ERP mail server.',
    'Xendit no ha respondido: no se ha cambiado nada. Prueba otra vez en un rato.': 'Xendit did not respond: nothing was changed. Try again in a moment.',
    'La confirmación por código no está disponible en este ERP: avisa al estudio.': 'Code confirmation is not available in this ERP: tell the studio.',
    'Los envíos de correo están en pausa: ahora no se puede mandar el código.': 'Email sending is paused: the code cannot be sent right now.',
    'Tu sesión ha caducado: vuelve a entrar.': 'Your session has expired: sign in again.',
    'Esta pantalla no se ha abierto desde la dirección del ERP.': 'This screen was not opened from the ERP address.',
    'Los cobros en línea todavía no están disponibles en este ERP.': 'Online payments are not available in this ERP yet.',
    'No se sabe si se ha guardado: mira cómo están las claves antes de repetir.': 'It is not known whether it was saved: check the keys before trying again.',
    'Las claves de Xendit con las que el ERP crea el enlace de pago y comprueba los pagos. Se escriben una vez y no se vuelven a enseñar.': 'The Xendit keys the ERP uses to create payment links and check payments. They are typed once and never shown again.',
    'Quién procesa los cobros': 'Who processes the payments', 'Tarjeta, transferencia y monederos electrónicos. Indonesia y el Sudeste Asiático.': 'Cards, bank transfer and e-wallets. Indonesia and Southeast Asia.',
    'Modo': 'Mode', 'Modo prueba · sin dinero real': 'Test mode · no real money', 'Modo real': 'Live mode', 'Dinero real': 'Real money',
    'Modo real: a los clientes se les cobra dinero de verdad.': 'Live mode: customers are charged real money.',
    'Las claves guardadas son de %m.': 'The saved keys are for %m.', 'modo prueba': 'test mode', 'modo real': 'live mode',
    'Nadie del estudio lo revisa antes: lo confirmas tú. Al guardar se avisa por correo a los demás administradores.': 'Nobody at the studio reviews it first: you confirm it. On saving, the other administrators are told by email.',
    'Otro administrador ha cambiado el modo de cobro mientras tenías esta página abierta. Revisa el modo y vuelve a pegar las claves: Xendit da un token de avisos distinto en cada modo.': 'Another administrator changed the payment mode while you had this page open. Check the mode and paste the keys again: Xendit gives a different callback token for each mode.',
    'Desde el %f.': 'Since %f.', 'Desde el %f, puesto por %p.': 'Since %f, set by %p.',
    'Clave de creación (Money-in Write)': 'Creation key (Money-in Write)', 'El ERP la usa solo para crear el enlace de pago.': 'The ERP uses it only to create the payment link.',
    'Clave de lectura (Money-in Read)': 'Read key (Money-in Read)', 'El ERP la usa para comprobar que el pago ha entrado. Tiene que ser otra clave, de solo lectura.': 'The ERP uses it to check that the payment came in. It must be a different, read-only key.',
    'Token de avisos (callback)': 'Callback token', 'Xendit lo manda con cada aviso de pago para demostrar que el aviso es suyo.': 'Xendit sends it with every payment notice to prove the notice is theirs.',
    'Pégala entera desde el panel de Xendit. Una vez guardada no se vuelve a enseñar, ni aquí ni en ningún sitio.': 'Paste all of it from the Xendit dashboard. Once saved it is never shown again, here or anywhere.',
    'Configurada el %f': 'Set on %f', 'Por %p. No se vuelve a enseñar.': 'By %p. Never shown again.', 'Sin poner todavía': 'Not set yet',
    'Reemplazar': 'Replace', 'Dejar la de ahora': 'Keep the current one', 'Pedir el código de confirmación': 'Ask for the confirmation code',
    'Te hemos mandado un código a %c. Caduca en 10 minutos.': 'We have sent a code to %c. It expires in 10 minutes.',
    'Código de 6 cifras': '6-digit code', 'Contraseña de tu cuenta': 'Your account password',
    'Cambiar una clave de cobro cambia a dónde van los cobros: por eso se pide siempre.': 'Changing a payment key changes where payments go: that is why it is always asked for.',
    'Cambiar lo escrito': 'Change what I typed',
    'Al guardar, el ERP prueba las claves con Xendit sin crear ningún cobro. Si Xendit no las acepta, no se cambia nada.': 'When you save, the ERP tests the keys with Xendit without creating any payment. If Xendit does not accept them, nothing changes.',
    'Probar la conexión y guardar': 'Test the connection and save', 'Conectado a Xendit · %m · %h': 'Connected to Xendit · %m · %h', 'Conectado a Xendit · %h': 'Connected to Xendit · %h',
    'Escribe el código de 6 cifras y la contraseña de tu cuenta.': 'Type the 6-digit code and your account password.',
    'Primero pide el código de confirmación.': 'First ask for the confirmation code.',
    'Esta clave es de modo real y has elegido modo prueba: pega una clave de prueba o cambia a modo real.': 'This key is for live mode and you chose test mode: paste a test key or switch to live mode.',
    'Esta clave es de modo prueba y has elegido modo real: pega una clave real o cambia a modo prueba.': 'This key is for test mode and you chose live mode: paste a live key or switch to test mode.',
    'Intentos en los últimos 10 minutos: %n de %t.': 'Attempts in the last 10 minutes: %n of %t.',
    'Los cobros en línea los configura el administrador principal.': 'Online payments are set up by the main administrator.',
    'Se ha avisado del cambio por correo a los demás administradores.': 'The other administrators have been told about the change by email.',
    'Xendit no reconoce esta clave.': 'Xendit does not recognise this key.', 'Esta clave no tiene el permiso que hace falta.': 'This key does not have the permission it needs.',
    'Xendit ha respondido algo inesperado con esta clave.': 'Xendit gave an unexpected answer for this key.',
    'Esta clave también puede crear cobros y devolver dinero: aquí va una de solo lectura (Money-in Read).': 'This key can also create payments and refund money: a read-only key (Money-in Read) goes here.',
    'Xendit no deja probarlo: se comprobará con el primer aviso de pago.': 'Xendit does not allow testing it: it will be checked with the first payment notice.',
    '%m aún no está configurado.': '%m is not set up yet.',
    'Este módulo aún no está listo: lo está configurando el administrador.': 'This module is not ready yet: the administrator is setting it up.',
    'Tu sesión no tiene permiso para esto.': 'Your session does not have permission for this.',
    'Esta función todavía no está disponible en este ERP.': 'This function is not available in this ERP yet.',
    'El ERP no ha respondido: prueba otra vez en un rato.': 'The ERP did not respond: try again in a moment.',
    'El ERP ha devuelto algo inesperado.': 'The ERP returned something unexpected.',
    'Configurar': 'Set up', 'Ahora no': 'Not now', 'El ERP sigue en los idiomas que fijó el estudio al publicarlo.': 'The ERP keeps the languages the studio set when publishing it.', 'Los correos salen con la configuración de origen, no desde tu buzón.': 'Emails go out with the original setup, not from your mailbox.', 'Solo el administrador principal trabaja con este módulo.': 'Only the main administrator works with this module.', 'Se toma la clase del primer producto de alquiler.': 'The class of the first rental product is used.', 'Las reservas usan las reglas por defecto.': 'Bookings use the default rules.', 'No se ofrece entrega a domicilio.': 'Home delivery is not offered.', 'Los clientes no pueden pagar en línea.': 'Customers cannot pay online.', 'El Taller no se abre al equipo hasta que haya listas de revisión.': 'The Workshop does not open to the team until there are check lists.', 'Las órdenes del Taller no pueden apuntar piezas de recambio.': 'Workshop orders cannot record spare parts.', 'El Taller no se abre al equipo hasta que haya un mecánico.': 'The Workshop does not open to the team until there is a mechanic.', '%m ya funciona. Queda por configurar:': '%m already works. Still to set up:', '%p sin configurar. %c': '%p not set up. %c', 'Todos los módulos funcionan. Queda por configurar:': 'All modules work. Still to set up:', '%n pasos opcionales sin configurar': '%n optional steps not set up', '1 paso opcional sin configurar': '1 optional step not set up', 'Es opcional: puedes configurarlo cuando quieras.': 'It is optional: you can set it up whenever you like.',
    'Pendiente de revisar': 'To be checked', 'Otro paso de la configuración': 'Another setup step',
    'Esta pantalla aún no sabe explicar este paso. Si no sabes cómo hacerlo, avisa al estudio.': 'This screen cannot explain this step yet. If you are not sure how to do it, tell the studio.',
    'otro dato': 'another detail', 'Otro módulo': 'Another module', 'Falta completar este paso.': 'This step still needs to be completed.',
    'No se ha podido hacer. Si vuelve a pasar, avisa al estudio.': 'It could not be done. If it happens again, tell the studio.',
    'Tu configuración': 'Your setup', 'Todos los módulos': 'All modules', '%m · Paso %n de %t': '%m · Step %n of %t', 'Si lo saltas': 'If you skip it',
    '%m no queda listo sin este paso: tu equipo ve que el módulo aún no está listo.': "%m isn't ready without this step: your team sees that the module isn't ready yet.",
    'Se guarda al momento.': 'Saved as you go.', 'Puedes salir cuando quieras: volverás a este paso.': "Leave any time: you'll come back to this step.",
    'Saltar este paso': 'Skip this step', 'Pasos de %m': 'Steps in %m',
    "Obligatorio": "Required", "Para qué sirve": "What it's for", "%n de %t pasos hechos": "%n of %t steps done", "Volver al ERP": "Back to the ERP", "Asistente de configuración · solo el administrador principal": "Setup assistant · main administrator only", "Configura tu ERP,": "Set up your ERP,", "paso a paso.": "one step at a time.", "Cada módulo hace unas pocas preguntas, una por pantalla. Todo se guarda al momento y puedes cambiarlo después en Ajustes.": "Each module asks a few short questions, one per screen. Everything is saved as you go, and you can change it later in Settings.", "Solo tú, como administrador principal, puedes configurar los módulos. Hasta que termines, tu equipo ve que el módulo aún no está listo.": "Only you, as main administrator, can set up the modules. Until you finish, your team sees that the module is not ready yet.", "Sigue donde lo dejaste": "Continue where you left off", "Módulos encendidos": "Modules turned on", "%m módulos · %p pasos": "%m modules · %p steps", "A medias": "Partly done", "Empezar": "Start", "Continuar": "Continue", "Revisar": "Review", "Se guarda al momento. El asistente abre siempre en el primer paso que falta.": "Saved as you go. The assistant always opens at the first step left.", "Tienes un módulo sin configurar": "You have a module that is not set up", "Tienes %n módulos sin configurar": "You have %n modules that are not set up", "%m está encendido. Todo lo demás sigue funcionando mientras lo configuras.": "%m is switched on. Everything else keeps working while you set it up.", "%lista están encendidos. Todo lo demás sigue funcionando mientras los configuras.": "%lista are switched on. Everything else keeps working while you set them up.", "Configuración completa": "Setup complete", "Lo que has configurado queda en Ajustes: puedes cambiarlo ahí cuando quieras, y cada cambio queda registrado.": "What you set up stays in Settings: you can change it there any time, and every change is logged.", "Revisar en Ajustes": "Review in Settings", "Se fija después": "Locks later", "Este módulo aún no está listo.": "This module is not ready yet.", "Lo está configurando el administrador principal. Aparecerá aquí en cuanto esté listo: no tienes que hacer nada.": "The main administrator is setting it up. It will show up here as soon as it is ready: you do not need to do anything.", "Hay más de una empresa emisora: el impuesto de las reservas se configura cuando quede una sola activa.": "There is more than one issuing company: the booking tax is set up when only one is active.", "La empresa no tiene impuesto por defecto: créalo en Ajustes.": "The company has no default tax: create it in Settings.", "El impuesto por defecto no es de suma, exento ni no sujeto: elige otro en Ajustes.": "The default tax is not an added, exempt or out-of-scope tax: choose another one in Settings.", "Aún no hay ninguna moto con tarifa: añádela en Flota y tarifas.": "There is no motorbike with a rate yet: add one in Fleet and rates.", "Este paso no se ha podido comprobar en la base: avisa al estudio.": "This step could not be checked in the database: tell the studio.", "razón social": "legal name", "domicilio": "address", "identificación fiscal": "tax ID", "empresa activa": "active company", "Para cambiar algo ya guardado hay que escribir el motivo.": "To change something already saved, write the reason.", "Elige sí o no.": "Choose yes or no.", "Este ajuste no se cambia desde aquí.": "This setting is not changed from here.", "Este ERP aún no tiene preparada la configuración por módulos: avisa al estudio.": "This ERP does not have the module setup ready yet: tell the studio."
  };
  var ID = {
    "Elige una opción": "Pilih salah satu", "Moneda": "Mata uang", "Razón social": "Nama badan usaha", "Domicilio": "Alamat", "Etiqueta fiscal": "Label pajak", "Identificación fiscal": "Identitas pajak", "Representante (opcional)": "Perwakilan (opsional)", "Prefijo": "Prefiks", "Mayúsculas y números, de 2 a 8. Por ejemplo: BBM": "Huruf kapital dan angka, 2 sampai 8. Contoh: BBM", "Las facturas empezarán así: %p-…": "Invoice akan diawali seperti ini: %p-…", "Primero hay que dar de alta la empresa que emite las facturas.": "Daftarkan dulu perusahaan penerbit invoice.", "Sí: es PKP y cobra PPN": "Ya: PKP dan memungut PPN", "No: no es PKP (las reservas van sin PPN)": "Tidak: bukan PKP (booking tanpa PPN)", "El precio de la tarifa ya lleva el impuesto": "Harga di tarif sudah termasuk pajak", "El impuesto se suma al precio de la tarifa": "Pajak ditambahkan ke harga di tarif", "Abrir %pantalla": "Buka %pantalla", "Ya lo hice, comprobar": "Sudah, periksa", "Este paso se hace en otra pantalla. Al terminar, vuelve aquí y pulsa «Ya lo hice, comprobar».": "Langkah ini dikerjakan di layar lain. Setelah selesai, kembali ke sini dan tekan «Sudah, periksa».", "Falta rellenar: %c.": "Masih perlu diisi: %c.", "El prefijo va en mayúsculas y números, de 2 a 8 caracteres.": "Prefiks memakai huruf kapital dan angka, 2 sampai 8 karakter.", "No se podrá cambiar después.": "Tidak bisa diubah nanti.", "Para confirmar, escribe %v": "Untuk konfirmasi, ketik %v", "Lo escrito no coincide.": "Yang diketik tidak sama.", "Fijar la moneda: %v": "Tetapkan mata uang: %v", "Fijar el prefijo: %v": "Tetapkan prefiks: %v", "Fijado": "Ditetapkan", "Comprobando si se guardó…": "Memeriksa apakah sudah tersimpan…", "El ERP dice que no se guardó. Puedes volver a intentarlo.": "ERP menyatakan belum tersimpan. Anda bisa mencoba lagi.", "Guardar y seguir": "Simpan dan lanjut", "Siguiente": "Lanjut", "Atrás": "Kembali", "Dejar para luego": "Nanti saja", "%m está listo.": "%m sudah siap.", "Paso %n de %t": "Langkah %n dari %t", "Opcional": "Opsional", "Solo el administrador principal puede configurar los módulos.": "Hanya admin utama yang dapat mengatur modul.", "Volver": "Kembali ke halaman sebelumnya", "Configurar %m": "Atur %m", "Cargando…": "Memuat…", "Reintentar": "Coba lagi", "No se ha podido mirar la configuración": "Pengaturan tidak dapat diperiksa", "Este paso necesita el módulo %m: pídelo al estudio.": "Langkah ini memerlukan modul %m: minta ke studio.", "Hecho": "Selesai", "Pendiente": "Tertunda", "Cambiar": "Ubah", "Todos los módulos están configurados.": "Semua modul sudah diatur.", "Módulos por configurar": "Modul yang perlu diatur", "Configurar módulos": "Penyiapan modul", "Abrir el asistente": "Buka panduan", "Guardar": "Simpan", "Guardado.": "Tersimpan.", "No se guardó: %e": "Tidak tersimpan: %e", "Motivo del cambio": "Alasan perubahan", "Obligatorio al cambiar algo ya guardado: queda en el registro de cambios.": "Wajib saat mengubah yang sudah tersimpan: tercatat di riwayat perubahan.", "Escribe el motivo del cambio (al menos 3 letras).": "Tulis alasan perubahan (minimal 3 huruf).", "Ahora: %v": "Saat ini: %v", "Sin decidir": "Belum ditentukan", "Ir al inicio": "Ke beranda",
    'Datos generales': 'Pengaturan umum', 'Facturas': 'Invoice', 'Recibos': 'Kuitansi', 'Reservas de producto': 'Booking sewa motor',
    'Sociedades emisoras': 'Perusahaan penerbit', 'Taller': 'Bengkel', 'Vencimientos': 'Jatuh tempo', 'Productos': 'Produk',
    'Sin configurar': 'Belum diatur', 'Configurado': 'Sudah diatur',
    'Moneda del ERP': 'Mata uang ERP', 'Todos los importes nuevos se guardan en esta moneda.': 'Semua nominal baru disimpan dalam mata uang ini.',
    'Empresa que emite las facturas': 'Perusahaan penerbit invoice',
    'Su nombre, su identificación fiscal y su domicilio salen en cada factura.': 'Nama, identitas pajak, dan alamatnya tercantum di setiap invoice.',
    'Prefijo de la numeración de facturas': 'Prefiks nomor invoice',
    'Cada factura empieza por este prefijo. No se podrá cambiar después de emitir la primera factura.': 'Setiap invoice diawali prefiks ini. Tidak bisa diubah setelah invoice pertama diterbitkan.',
    '¿La empresa cobra impuesto?': 'Apakah perusahaan memungut pajak?', 'Si la empresa es PKP, las reservas llevan PPN.': 'Jika perusahaan berstatus PKP, booking dikenakan PPN.',
    'Precio con el impuesto dentro o fuera': 'Harga sudah termasuk pajak atau belum',
    'Dice si el precio de la tarifa ya lleva el impuesto o se suma aparte.': 'Menentukan apakah harga di tarif sudah termasuk pajak atau pajak ditambahkan terpisah.',
    'Flota y tarifas': 'Armada dan tarif', 'Las motos que se alquilan y su precio por días.': 'Motor yang disewakan dan harganya per hari.',
    'Entrega a domicilio': 'Antar ke alamat', 'Desde dónde se entrega y cuánto cuesta por kilómetro.': 'Titik awal pengantaran dan biaya per kilometer.',
    'Quién lo usa': 'Siapa yang memakai', 'Las personas del equipo que trabajan con este módulo.': 'Anggota tim yang bekerja dengan modul ini.',
    'Falta dar de alta la empresa que emite las facturas.': 'Perusahaan penerbit invoice belum didaftarkan.',
    'Falta el prefijo de la numeración.': 'Prefiks nomor belum diisi.', 'Falta completar: %campos.': 'Masih perlu diisi: %campos.',
    'Nadie del equipo tiene asignado este módulo.': 'Belum ada anggota tim yang ditugaskan ke modul ini.',
    'prefijo de la numeración': 'prefiks nomor', 'si cobra impuesto': 'apakah memungut pajak', 'precio con impuesto dentro o fuera': 'harga termasuk pajak atau belum',
    'punto de entrega': 'titik pengantaran', 'precio por kilómetro': 'harga per kilometer', 'moneda': 'mata uang',
    'La empresa no tiene prefijo de numeración: no se puede emitir la factura todavía.': 'Perusahaan belum punya prefiks nomor: invoice belum bisa diterbitkan.',
    'El prefijo ya no se puede cambiar: hay facturas emitidas con él.': 'Prefiks tidak bisa diubah lagi: sudah ada invoice yang diterbitkan dengannya.',
    'La moneda ya no se puede cambiar: hay tarifas, reservas o facturas en otra moneda.': 'Mata uang tidak bisa diubah lagi: sudah ada tarif, booking, atau invoice dalam mata uang lain.',
    'Esa moneda no está en la lista que admite el ERP.': 'Mata uang itu tidak ada dalam daftar yang diterima ERP.',
    'Este cambio no se puede deshacer: hay que confirmarlo antes de guardar.': 'Perubahan ini tidak bisa dibatalkan: harus dikonfirmasi sebelum disimpan.',
    'Esta es una cuenta de pruebas: puede mirar, no cambiar nada.': 'Ini akun uji coba: hanya bisa melihat, tidak bisa mengubah apa pun.',
    'Este módulo no está encendido en este ERP.': 'Modul ini belum diaktifkan di ERP ini.',
    'Falta configurar el impuesto de las reservas.': 'Pajak booking belum diatur.',
    // Cobros (cobros_paso.js)
    'Cobros en línea': 'Pembayaran online', 'El ERP crea el enlace de pago de cada reserva y comprueba solo cuándo se ha pagado.': 'ERP membuat tautan pembayaran untuk setiap booking dan memeriksa sendiri kapan sudah dibayar.',
    'clave de creación': 'kunci pembuatan', 'clave de lectura': 'kunci baca', 'token de avisos': 'token callback',
    'La primera vez hay que poner las tres: clave de creación, clave de lectura y token de avisos.': 'Pertama kali, ketiganya wajib diisi: kunci pembuatan, kunci baca, dan token callback.',
    'Esa clave no tiene la forma de las de Xendit: cópiala entera desde el panel de Xendit.': 'Kunci itu tidak berbentuk kunci Xendit: salin seluruhnya dari dasbor Xendit.',
    'La clave de creación y la de lectura son de modos distintos: las dos tienen que ser de prueba o las dos reales.': 'Kunci pembuatan dan kunci baca berasal dari mode yang berbeda: keduanya harus mode uji atau keduanya mode live.',
    'No has cambiado ninguna clave.': 'Tidak ada kunci yang diubah.',
    'Tu cuenta no tiene un correo válido al que mandar el código.': 'Akun Anda tidak punya email yang valid untuk menerima kode.',
    'Escribe la contraseña de tu cuenta para confirmar el cambio.': 'Ketik kata sandi akun Anda untuk mengonfirmasi perubahan.',
    'Esa contraseña no es la de tu cuenta.': 'Itu bukan kata sandi akun Anda.',
    'Las claves de cobro solo las cambia el administrador principal.': 'Kunci pembayaran hanya bisa diubah oleh admin utama.',
    'El código no vale o ha caducado: pide uno nuevo.': 'Kode tidak valid atau sudah kedaluwarsa: minta kode baru.',
    'El modo real todavía no está disponible en este ERP.': 'Mode live belum tersedia di ERP ini.',
    'Con claves reales hay que escribir LIVE para confirmar que vas a cobrar dinero de verdad.': 'Dengan kunci live, ketik LIVE untuk mengonfirmasi bahwa Anda akan menagih uang sungguhan.',
    'No se ha podido avisar por correo a los demás del paso a cobros reales: no se ha guardado nada. El código sigue valiendo: inténtalo otra vez en un rato.': 'Admin lain tidak bisa diberi tahu lewat email tentang peralihan ke pembayaran live: tidak ada yang disimpan. Kodenya masih berlaku: coba lagi sebentar lagi.',
    'Para cobrar de verdad tiene que haber alguien más a quien avisar del cambio: no se ha guardado nada.': 'Untuk menagih uang sungguhan harus ada orang lain yang diberi tahu tentang perubahan ini: tidak ada yang disimpan.',
    'El servidor de correo ha cambiado hace menos de 24 horas: para cobrar de verdad espera a que pasen y vuelve a intentarlo. No se ha guardado nada.':
      'Server email berubah kurang dari 24 jam yang lalu: untuk menagih uang sungguhan, tunggu sampai 24 jam berlalu lalu coba lagi. Tidak ada yang disimpan.',
    'Para cobrar de verdad tiene que haber alguien más a quien avisar desde hace al menos 24 horas: otro super admin activo o un buzón de avisos de sistema de tu dominio (Ajustes › Correo) que no haya cambiado en ese tiempo. No se ha guardado nada.':
      'Untuk menagih uang sungguhan harus ada orang lain yang bisa diberi tahu, yang sudah ada minimal 24 jam: super admin aktif lain, atau kotak surat notifikasi sistem di domain Anda (Pengaturan › Email) yang tidak berubah selama waktu itu. Tidak ada yang disimpan.',
    'Para cobrar de verdad tiene que haber alguien más a quien avisar: otro super admin activo o un buzón de avisos de sistema de tu dominio (Ajustes › Correo). No se ha guardado nada.':
      'Untuk menagih uang sungguhan harus ada orang lain yang bisa diberi tahu: super admin aktif lain, atau kotak surat notifikasi sistem di domain Anda (Pengaturan › Email). Tidak ada yang disimpan.',
    'La prueba ha caducado: pide un código nuevo y vuelve a probar.': 'Uji coba sudah kedaluwarsa: minta kode baru dan uji lagi.',
    'Xendit no ha aceptado las claves: no se ha cambiado nada y siguen las de antes.': 'Xendit tidak menerima kunci tersebut: tidak ada yang diubah dan kunci sebelumnya tetap dipakai.',
    'Demasiados intentos seguidos: espera unos minutos.': 'Terlalu banyak percobaan berturut-turut: tunggu beberapa menit.',
    'El ERP no ha podido terminar la operación: prueba otra vez en un rato.': 'ERP tidak dapat menyelesaikan operasi: coba lagi sebentar lagi.',
    'No se ha podido mandar el código por correo: revisa el servidor de correo del ERP.': 'Kode tidak dapat dikirim lewat email: periksa server email ERP.',
    'Xendit no ha respondido: no se ha cambiado nada. Prueba otra vez en un rato.': 'Xendit tidak merespons: tidak ada yang diubah. Coba lagi sebentar lagi.',
    'La confirmación por código no está disponible en este ERP: avisa al estudio.': 'Konfirmasi dengan kode tidak tersedia di ERP ini: beri tahu studio.',
    'Los envíos de correo están en pausa: ahora no se puede mandar el código.': 'Pengiriman email sedang dijeda: kode tidak dapat dikirim sekarang.',
    'Tu sesión ha caducado: vuelve a entrar.': 'Sesi Anda sudah berakhir: silakan masuk lagi.',
    'Esta pantalla no se ha abierto desde la dirección del ERP.': 'Layar ini tidak dibuka dari alamat ERP.',
    'Los cobros en línea todavía no están disponibles en este ERP.': 'Pembayaran online belum tersedia di ERP ini.',
    'No se sabe si se ha guardado: mira cómo están las claves antes de repetir.': 'Belum diketahui apakah sudah tersimpan: periksa status kunci sebelum mengulang.',
    'Las claves de Xendit con las que el ERP crea el enlace de pago y comprueba los pagos. Se escriben una vez y no se vuelven a enseñar.': 'Kunci Xendit yang dipakai ERP untuk membuat tautan pembayaran dan memeriksa pembayaran. Diketik sekali dan tidak ditampilkan lagi.',
    'Quién procesa los cobros': 'Siapa yang memproses pembayaran', 'Tarjeta, transferencia y monederos electrónicos. Indonesia y el Sudeste Asiático.': 'Kartu, transfer bank, dan dompet digital. Indonesia dan Asia Tenggara.',
    'Modo': 'Mode', 'Modo prueba · sin dinero real': 'Mode uji · tanpa uang sungguhan', 'Modo real': 'Mode live', 'Dinero real': 'Uang sungguhan',
    'Modo real: a los clientes se les cobra dinero de verdad.': 'Mode live: pelanggan ditagih dengan uang sungguhan.',
    'Las claves guardadas son de %m.': 'Kunci yang tersimpan untuk %m.', 'modo prueba': 'mode uji', 'modo real': 'mode live',
    'Nadie del estudio lo revisa antes: lo confirmas tú. Al guardar se avisa por correo a los demás administradores.': 'Tidak ada orang studio yang memeriksanya lebih dulu: Anda sendiri yang mengonfirmasi. Saat disimpan, admin lain diberi tahu lewat email.',
    'Otro administrador ha cambiado el modo de cobro mientras tenías esta página abierta. Revisa el modo y vuelve a pegar las claves: Xendit da un token de avisos distinto en cada modo.': 'Admin lain mengubah mode pembayaran saat halaman ini Anda buka. Periksa mode dan tempel ulang kuncinya: Xendit memberi token callback yang berbeda untuk setiap mode.',
    'Desde el %f.': 'Sejak %f.', 'Desde el %f, puesto por %p.': 'Sejak %f, diatur oleh %p.',
    'Clave de creación (Money-in Write)': 'Kunci pembuatan (Money-in Write)', 'El ERP la usa solo para crear el enlace de pago.': 'ERP memakainya hanya untuk membuat tautan pembayaran.',
    'Clave de lectura (Money-in Read)': 'Kunci baca (Money-in Read)', 'El ERP la usa para comprobar que el pago ha entrado. Tiene que ser otra clave, de solo lectura.': 'ERP memakainya untuk memeriksa bahwa pembayaran sudah masuk. Harus kunci lain yang hanya bisa membaca.',
    'Token de avisos (callback)': 'Token callback', 'Xendit lo manda con cada aviso de pago para demostrar que el aviso es suyo.': 'Xendit mengirimnya bersama setiap notifikasi pembayaran untuk membuktikan bahwa notifikasi itu dari Xendit.',
    'Pégala entera desde el panel de Xendit. Una vez guardada no se vuelve a enseñar, ni aquí ni en ningún sitio.': 'Tempel seluruhnya dari dasbor Xendit. Setelah tersimpan, kunci tidak ditampilkan lagi, di sini maupun di mana pun.',
    'Configurada el %f': 'Diatur pada %f', 'Por %p. No se vuelve a enseñar.': 'Oleh %p. Tidak ditampilkan lagi.', 'Sin poner todavía': 'Belum diisi',
    'Reemplazar': 'Ganti', 'Dejar la de ahora': 'Pakai yang sekarang', 'Pedir el código de confirmación': 'Minta kode konfirmasi',
    'Te hemos mandado un código a %c. Caduca en 10 minutos.': 'Kode sudah dikirim ke %c. Berlaku 10 menit.',
    'Código de 6 cifras': 'Kode 6 angka', 'Contraseña de tu cuenta': 'Kata sandi akun Anda',
    'Cambiar una clave de cobro cambia a dónde van los cobros: por eso se pide siempre.': 'Mengganti kunci pembayaran mengubah ke mana pembayaran masuk: karena itu selalu diminta.',
    'Cambiar lo escrito': 'Ubah yang diketik',
    'Al guardar, el ERP prueba las claves con Xendit sin crear ningún cobro. Si Xendit no las acepta, no se cambia nada.': 'Saat menyimpan, ERP menguji kunci dengan Xendit tanpa membuat pembayaran apa pun. Jika Xendit tidak menerimanya, tidak ada yang berubah.',
    'Probar la conexión y guardar': 'Uji koneksi dan simpan', 'Conectado a Xendit · %m · %h': 'Terhubung ke Xendit · %m · %h', 'Conectado a Xendit · %h': 'Terhubung ke Xendit · %h',
    'Escribe el código de 6 cifras y la contraseña de tu cuenta.': 'Ketik kode 6 angka dan kata sandi akun Anda.',
    'Primero pide el código de confirmación.': 'Minta kode konfirmasi terlebih dulu.',
    'Esta clave es de modo real y has elegido modo prueba: pega una clave de prueba o cambia a modo real.': 'Kunci ini untuk mode live, sedangkan Anda memilih mode uji: tempel kunci uji atau pindah ke mode live.',
    'Esta clave es de modo prueba y has elegido modo real: pega una clave real o cambia a modo prueba.': 'Kunci ini untuk mode uji, sedangkan Anda memilih mode live: tempel kunci live atau pindah ke mode uji.',
    'Intentos en los últimos 10 minutos: %n de %t.': 'Percobaan dalam 10 menit terakhir: %n dari %t.',
    'Los cobros en línea los configura el administrador principal.': 'Pembayaran online diatur oleh admin utama.',
    'Se ha avisado del cambio por correo a los demás administradores.': 'Admin lain sudah diberi tahu tentang perubahan ini lewat email.',
    'Xendit no reconoce esta clave.': 'Xendit tidak mengenali kunci ini.', 'Esta clave no tiene el permiso que hace falta.': 'Kunci ini tidak punya izin yang diperlukan.',
    'Xendit ha respondido algo inesperado con esta clave.': 'Xendit memberi jawaban yang tidak terduga untuk kunci ini.',
    'Esta clave también puede crear cobros y devolver dinero: aquí va una de solo lectura (Money-in Read).': 'Kunci ini juga bisa membuat pembayaran dan melakukan refund: di sini harus kunci yang hanya bisa membaca (Money-in Read).',
    'Xendit no deja probarlo: se comprobará con el primer aviso de pago.': 'Xendit tidak mengizinkan uji coba: akan diperiksa saat notifikasi pembayaran pertama.',
    '%m aún no está configurado.': '%m belum diatur.',
    'Este módulo aún no está listo: lo está configurando el administrador.': 'Modul ini belum siap: admin sedang mengaturnya.',
    'Tu sesión no tiene permiso para esto.': 'Akun Anda tidak punya izin untuk ini.',
    'Esta función todavía no está disponible en este ERP.': 'Fungsi ini belum tersedia di ERP ini.',
    'El ERP no ha respondido: prueba otra vez en un rato.': 'ERP tidak merespons: coba lagi sebentar lagi.',
    'El ERP ha devuelto algo inesperado.': 'ERP mengembalikan data yang tidak terduga.',
    'Configurar': 'Atur', 'Ahora no': 'Nanti saja', 'El ERP sigue en los idiomas que fijó el estudio al publicarlo.': 'Bahasa ERP tetap seperti yang ditetapkan studio saat menerbitkannya.', 'Los correos salen con la configuración de origen, no desde tu buzón.': 'Email dikirim dengan pengaturan awal, bukan dari kotak surat Anda.', 'Solo el administrador principal trabaja con este módulo.': 'Hanya admin utama yang bekerja dengan modul ini.', 'Se toma la clase del primer producto de alquiler.': 'Jenis produk sewa pertama yang dipakai.', 'Las reservas usan las reglas por defecto.': 'Booking memakai aturan bawaan.', 'No se ofrece entrega a domicilio.': 'Antar ke alamat tidak ditawarkan.', 'Los clientes no pueden pagar en línea.': 'Pelanggan tidak bisa membayar online.', 'El Taller no se abre al equipo hasta que haya listas de revisión.': 'Bengkel belum dibuka untuk tim sampai ada daftar pemeriksaan.', 'Las órdenes del Taller no pueden apuntar piezas de recambio.': 'Order bengkel tidak bisa mencatat suku cadang.', 'El Taller no se abre al equipo hasta que haya un mecánico.': 'Bengkel belum dibuka untuk tim sampai ada mekanik.', '%m ya funciona. Queda por configurar:': '%m sudah berfungsi. Masih perlu diatur:', '%p sin configurar. %c': '%p belum diatur. %c', 'Todos los módulos funcionan. Queda por configurar:': 'Semua modul sudah berfungsi. Masih perlu diatur:', '%n pasos opcionales sin configurar': '%n langkah opsional belum diatur', '1 paso opcional sin configurar': '1 langkah opsional belum diatur', 'Es opcional: puedes configurarlo cuando quieras.': 'Ini opsional: bisa diatur kapan saja.',
    'Pendiente de revisar': 'Perlu ditinjau', 'Otro paso de la configuración': 'Langkah penyiapan lainnya',
    'Esta pantalla aún no sabe explicar este paso. Si no sabes cómo hacerlo, avisa al estudio.': 'Layar ini belum bisa menjelaskan langkah ini. Jika Anda tidak yakin cara melakukannya, beri tahu studio.',
    'otro dato': 'data lain', 'Otro módulo': 'Modul lain', 'Falta completar este paso.': 'Langkah ini masih perlu diselesaikan.',
    'No se ha podido hacer. Si vuelve a pasar, avisa al estudio.': 'Tidak dapat dilakukan. Jika terjadi lagi, beri tahu studio.',
    'Tu configuración': 'Pengaturan Anda', 'Todos los módulos': 'Semua modul', '%m · Paso %n de %t': '%m · Langkah %n dari %t', 'Si lo saltas': 'Jika dilewati',
    '%m no queda listo sin este paso: tu equipo ve que el módulo aún no está listo.': '%m belum siap tanpa langkah ini: tim Anda melihat bahwa modul ini belum siap.',
    'Se guarda al momento.': 'Tersimpan otomatis.', 'Puedes salir cuando quieras: volverás a este paso.': 'Anda bisa keluar kapan saja: nanti kembali ke langkah ini.',
    'Saltar este paso': 'Lewati langkah ini', 'Pasos de %m': 'Langkah %m',
    "Obligatorio": "Wajib", "Para qué sirve": "Fungsinya", "%n de %t pasos hechos": "%n dari %t langkah selesai", "Volver al ERP": "Kembali ke ERP", "Asistente de configuración · solo el administrador principal": "Panduan penyiapan · hanya admin utama", "Configura tu ERP,": "Atur ERP Anda,", "paso a paso.": "langkah demi langkah.", "Cada módulo hace unas pocas preguntas, una por pantalla. Todo se guarda al momento y puedes cambiarlo después en Ajustes.": "Setiap modul mengajukan beberapa pertanyaan singkat, satu per layar. Semuanya langsung tersimpan dan bisa diubah nanti di Pengaturan.", "Solo tú, como administrador principal, puedes configurar los módulos. Hasta que termines, tu equipo ve que el módulo aún no está listo.": "Hanya Anda, sebagai admin utama, yang dapat mengatur modul. Sampai Anda selesai, tim Anda melihat bahwa modul belum siap.", "Sigue donde lo dejaste": "Lanjutkan dari terakhir kali", "Módulos encendidos": "Modul yang aktif", "%m módulos · %p pasos": "%m modul · %p langkah", "A medias": "Sebagian selesai", "Empezar": "Mulai", "Continuar": "Lanjutkan", "Revisar": "Tinjau", "Se guarda al momento. El asistente abre siempre en el primer paso que falta.": "Tersimpan otomatis. Panduan selalu terbuka di langkah pertama yang belum selesai.", "Tienes un módulo sin configurar": "Ada satu modul yang belum diatur", "Tienes %n módulos sin configurar": "Ada %n modul yang belum diatur", "%m está encendido. Todo lo demás sigue funcionando mientras lo configuras.": "%m sudah aktif. Semua yang lain tetap berjalan selama Anda mengaturnya.", "%lista están encendidos. Todo lo demás sigue funcionando mientras los configuras.": "%lista sudah aktif. Semua yang lain tetap berjalan selama Anda mengaturnya.", "Configuración completa": "Penyiapan selesai", "Lo que has configurado queda en Ajustes: puedes cambiarlo ahí cuando quieras, y cada cambio queda registrado.": "Yang sudah Anda atur tersimpan di Pengaturan: bisa diubah kapan saja, dan setiap perubahan tercatat.", "Revisar en Ajustes": "Tinjau di Pengaturan", "Se fija después": "Terkunci nanti", "Este módulo aún no está listo.": "Modul ini belum siap.", "Lo está configurando el administrador principal. Aparecerá aquí en cuanto esté listo: no tienes que hacer nada.": "Admin utama sedang mengaturnya. Modul akan muncul di sini segera setelah siap: Anda tidak perlu melakukan apa pun.", "Hay más de una empresa emisora: el impuesto de las reservas se configura cuando quede una sola activa.": "Ada lebih dari satu perusahaan penerbit: pajak booking diatur jika hanya satu yang aktif.", "La empresa no tiene impuesto por defecto: créalo en Ajustes.": "Perusahaan belum punya pajak bawaan: buat di Pengaturan.", "El impuesto por defecto no es de suma, exento ni no sujeto: elige otro en Ajustes.": "Pajak bawaan bukan pajak tambahan, dibebaskan, atau tidak dikenakan: pilih yang lain di Pengaturan.", "Aún no hay ninguna moto con tarifa: añádela en Flota y tarifas.": "Belum ada motor dengan tarif: tambahkan di Armada dan tarif.", "Este paso no se ha podido comprobar en la base: avisa al estudio.": "Langkah ini tidak dapat diperiksa di database: beri tahu studio.", "razón social": "nama badan usaha", "domicilio": "alamat", "identificación fiscal": "identitas pajak", "empresa activa": "perusahaan aktif", "Para cambiar algo ya guardado hay que escribir el motivo.": "Untuk mengubah yang sudah tersimpan, tulis alasannya.", "Elige sí o no.": "Pilih ya atau tidak.", "Este ajuste no se cambia desde aquí.": "Pengaturan ini tidak diubah dari sini.", "Este ERP aún no tiene preparada la configuración por módulos: avisa al estudio.": "ERP ini belum menyiapkan pengaturan per modul: beri tahu studio."
  };

  function T(x, huecos) {
    if (typeof window.lwT === 'function') return window.lwT(x, huecos);
    var v = String(x);
    if (huecos) Object.keys(huecos).forEach(function (k) { v = v.split('%' + k).join(huecos[k]); });
    return v;
  }
  var desconocidos = [];   // códigos que la base mandó y este mapa no tiene: el test y el arnés los cuentan
  function apunta(tipo, c) {
    var k = tipo + ':' + c;
    if (desconocidos.indexOf(k) >= 0) return;
    desconocidos.push(k);
    try { if (typeof console !== 'undefined' && console.warn) console.warn('[setup] código sin frase (avisar al estudio): ' + k); } catch (e) { /* MUDO A PROPOSITO: sin consola no se avisa */ }
  }
  // La frase digna de un código que no está, por tipo (nunca el código)
  function digna(tipo, parte) {
    var g = TEXTOS.general;
    if (tipo === 'paso') return parte ? g.desconocido_paso_d : g.desconocido_paso;
    if (tipo === 'campo') return g.desconocido_campo;
    if (tipo === 'modulo') return g.desconocido_modulo;
    if (tipo === 'falta') return g.desconocido_falta;
    if (tipo === 'consecuencia') return g.desconocido_consecuencia;
    return g.desconocido;
  }

  /* frase(tipo, código) → la clave en español; texto(...) → ya traducida. Nunca devuelve el código pelado ni una frase de la base. */
  function frase(tipo, codigo, parte) {
    var grupo = TEXTOS[tipo] || {}, v = grupo[codigo];
    if (v == null) { apunta(tipo, codigo); return null; }
    return Array.isArray(v) ? v[parte || 0] : v;
  }
  function texto(tipo, codigo, parte) {
    var f = frase(tipo, codigo, parte);
    return f == null ? T(digna(tipo, parte)) : T(f);
  }
  function ui(k, huecos) { var f = frase('ui', k); return f == null ? T(digna('ui')) : T(f, huecos); }
  function nombreModulo(m) {
    var f = frase('modulo', m);
    if (f != null) return T(f);
    var n = window.AXW_MAPA_MODULOS && window.AXW_MAPA_MODULOS.n && window.AXW_MAPA_MODULOS.n[m];   // el rótulo del registro (apagados_instancia.js)
    if (n && n[0]) return T(String(n[0]));
    apunta('modulo', m);
    return T(digna('modulo'));
  }
  // Lo que pasa si un paso opcional se queda sin hacer, y la línea entera «<paso> sin configurar: <consecuencia>»
  function consecuencia(clave) { return texto('consecuencia', clave); }
  function lineaOpcional(p) { return ui('opc_linea', { p: texto('paso', p.clave, 0), c: consecuencia(p.clave) }); }
  // «Falta completar: precio por kilómetro, punto de entrega» — la lista de campos también va por códigos
  function textoFalta(f) {
    if (!f || typeof f !== 'object') return '';
    var campos = (Array.isArray(f.campos) ? f.campos : []).map(function (c) { return texto('campo', c); }).join(', ');
    var fr = frase('falta', f.codigo);
    if (fr == null) return T(digna('falta'));
    return T(fr, { campos: campos });
  }

  // ── La forma de modulos_setup_estado (plan de Backend #282 punto 2; doble plan_f3_doble_modulos_setup_estado.json) ────────────────────
  var ESTADOS = { sin_configurar: 1, configurado: 1 };
  function formaValida(d) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return false;
    if (typeof d.puede_configurar !== 'boolean' || !Array.isArray(d.modulos) || !Array.isArray(d.pasos)) return false;
    if (d.moneda != null && typeof d.moneda !== 'string') return false;
    if (d.monedas != null && !Array.isArray(d.monedas)) return false;
    for (var i = 0; i < d.modulos.length; i++) {
      var m = d.modulos[i];
      if (!m || typeof m.modulo !== 'string' || !ESTADOS[m.estado]) return false;
    }
    for (var j = 0; j < d.pasos.length; j++) {
      var p = d.pasos[j];
      if (!p || typeof p.modulo !== 'string' || typeof p.clave !== 'string' || typeof p.hecho !== 'boolean') return false;
      if (p.falta != null && (typeof p.falta !== 'object' || typeof p.falta.codigo !== 'string')) return false;
    }
    if (!d.puede_configurar && d.pasos.length) return false;   // quien no configura no recibe pasos: si llegan, algo está mal arriba
    return true;
  }
  function tipoError(e) {
    var x = e || {}, m = String(x.message || '');
    if (x.code === 'PGRST202' || x.status === 404 || /Could not find the function|schema cache/i.test(m)) return 'no_existe';
    if (x.code === '42501') return 'sin_permiso';
    if (!x.code && (!m || /failed to fetch|network|load failed|timeout|sin respuesta/i.test(m))) return 'red';
    return 'otro';
  }

  var pEstado = null;
  function cliente() {
    if (!window.LW_AUTH || typeof window.LW_AUTH.then !== 'function') return Promise.resolve(null);
    return window.LW_AUTH.then(function (a) { return a && a.sb ? a.sb : null; }, function () { return null; });
  }
  /* {ok: true, datos} | {ok: false, tipo: no_existe|sin_permiso|red|forma|otro, error}. Una sola petición por página; `fresco` vuelve a
     preguntar (tras guardar un paso, o en la máquina de duda de un irreversible: el «hecho» lo decide la base, no el clic). */
  function estado(fresco) {
    if (pEstado && !fresco) return pEstado;
    pEstado = cliente().then(function (sb) {
      if (!sb) return { ok: false, tipo: 'sin_permiso', error: { code: '42501', message: 'sin sesión' } };
      // new Promise: un rpc que lanza en el acto también acaba en {ok: false}, nunca en una promesa rechazada que nadie espera
      return new Promise(function (ok) { ok(sb.rpc('modulos_setup_estado')); }).then(function (r) {
        if (!r) return { ok: false, tipo: 'red', error: { message: 'sin respuesta' } };
        if (r.error) return { ok: false, tipo: tipoError(r.error), error: r.error };
        if (!formaValida(r.data)) return { ok: false, tipo: 'forma', error: { message: 'forma de modulos_setup_estado' } };
        return { ok: true, datos: r.data };
      }, function (e) { return { ok: false, tipo: tipoError(e), error: e }; });
    });
    return pEstado;
  }
  function moneda() { return estado().then(function (r) { return r.ok ? (r.datos.moneda || null) : null; }); }

  /* Un error de una función de la base → {texto, configurar: '<módulo>'|null}. Por code + hint, nunca por el mensaje (#282 punto 4).
     `puedeConfigurar`: si quien mira es quien configura, el «sin configurar» lleva enlace al asistente; al resto, el texto genérico. */
  function explica(err, puedeConfigurar) {
    var e = err || {}, h = e.hint == null ? '' : String(e.hint), c = e.code == null ? '' : String(e.code);
    var m = /^(.+)_sin_configurar$/.exec(h);
    if (m && c === '55000') {
      return puedeConfigurar ? { texto: T(TEXTOS.general.sin_configurar_admin, { m: nombreModulo(m[1]) }), configurar: m[1] }
                             : { texto: T(TEXTOS.general.sin_configurar_resto), configurar: null };
    }
    if (h && TEXTOS.hint[h]) return { texto: T(TEXTOS.hint[h]), configurar: null };
    var t = tipoError(e);
    if (t !== 'otro') return { texto: T(TEXTOS.general[t]), configurar: null };
    apunta('error', (c || '—') + (h ? '/' + h : ''));   // el código va a la consola y a `desconocidos`, nunca a la pantalla
    if (h) apunta('hint', h);
    return { texto: T(TEXTOS.general.error_codigo), configurar: null };
  }

  // Botones del setup (banda, asistente y Ajustes): a todo lo ancho en el móvil, a su ancho desde 768 px. md:w-auto no está compilado en el
  // CSS de la instancia, por eso va aquí y una sola vez por página. Solo tamaño, ningún color (marca blanca).
  (function () {
    if (typeof document === 'undefined' || !document.head || document.getElementById('axw-setup-estilo')) return;
    var st = document.createElement('style');
    st.id = 'axw-setup-estilo';
    st.textContent = '.axw-btn{width:100%}@media (min-width:768px){.axw-btn{width:auto;align-self:flex-start}}';
    document.head.appendChild(st);
  })();

  function fusiona() {
    if (window.LW_EN && typeof window.LW_EN === 'object') Object.keys(EN).forEach(function (k) { if (!(k in window.LW_EN)) window.LW_EN[k] = EN[k]; });
    if (window.LW_ID && typeof window.LW_ID === 'object') Object.keys(ID).forEach(function (k) { if (!(k in window.LW_ID)) window.LW_ID[k] = ID[k]; });
  }
  fusiona();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fusiona);   // i18n.js puede llegar después (defer)

  window.AXW_SETUP = {
    estado: estado, moneda: moneda, explica: explica, texto: texto, ui: ui, nombreModulo: nombreModulo, textoFalta: textoFalta, consecuencia: consecuencia, lineaOpcional: lineaOpcional,
    formaValida: formaValida, desconocidos: desconocidos, TEXTOS: TEXTOS, EN: EN, ID: ID
  };
})();
