/* Pasos del setup de Reservas de producto: clase (S40), alquiler con unidades (S41), reglas de las reservas (S43), lo que ya está alquilado (S44)
 * y entrega a domicilio (S45). F3 Entregas 3 y 4, bbm-p27-flota-front, 12-oct-2026. Owner, 12-oct 08:00: «Salta un asistente que te guia por
 * pasos y deja todo eso en Ajustes.»; «Las motos o los viajes son productos… el seguro va en el PRODUCTO»; las motos ya alquiladas: «que lo haga
 * Dion… que reajuste su inventario». Contrato: erp/plan_f3e3_doble_flota_entrega.json (Backend, bbm-p26, c8d7a8f6) + sus respuestas del 12-oct.
 * Diseño: Claude Design «AxisWorks ERP Setup» S40, S41, S43, S44, S45 (+ móvil de S40), S90, S91; donde el diseño y el dato real chocan manda el
 * dato (seguro por tramos + fianza «fianza O seguro», mínimo por trayecto). Lo «sin base» (salidas con plazas, antelación en horas, horario,
 * color de la unidad, varias sedes, dos niveles de seguro) NO se pinta.
 *
 * Va detrás de setup_pasos.js y se suma con AXW_PASOS.registra(): el MISMO componente sirve al asistente (/ajustes/configurar/) y a
 * Ajustes › Configurar módulos. Cada componente es AUTÓNOMO (revisión del advisor, 12-oct): la interfaz de los anfitriones es síncrona y solo
 * trae ajustes_config_datos y la empresa, así que cada paso hace sus propias lecturas, se pinta al llegar, pide su propio motivo (sinMotivo
 * para el anfitrión) solo si ya había algo guardado, y resuelve DENTRO la duda de una respuesta perdida (relee y decide: nunca devuelve
 * «sin respuesta» ni reenvía solo). Lo tecleado se conserva si un guardado falla (BORRADOR) y lo que sí se guardó se dice (AVISO).
 * No te crees nada del front: precios, fechas, estados y rangos los valida y guarda la base; aquí solo se ayuda antes de enviar.
 * Los nombres de las funciones van escritos LITERALES (erp/contrato_front.py extrae `.rpc('x')` y `lwDatos('x')`).
 */
(function () {
  'use strict';
  if (!window.AXW_SETUP || !window.AXW_PASOS || typeof window.AXW_PASOS.registra !== 'function') return;
  var S = window.AXW_SETUP, PS = window.AXW_PASOS;

  // ── Textos: se suman al mapa único de setup_modulos.js (sin pisar lo que ya esté). EN e ID por la frase en español. ─────────────────────
  var TX = {
    paso: {
      clase: ['¿Qué alquilas o vendes primero?', 'Cada clase de producto hace sus propias preguntas: solo se piden las que hacen falta.'],
      reglas_reserva: ['Reglas de las reservas', 'Cuánto se guarda una reserva sin pagar y cuántos días se puede alquilar.'],
      alquileres_previos: ['Lo que ya está alquilado', 'Se empieza con el stock real: lo que está fuera hoy queda bloqueado hasta que vuelva.']
    },
    falta: {
      sin_producto: 'Aún no hay ningún producto de alquiler activo.',
      previos_sin_revisar: 'Falta decir qué unidades están alquiladas ahora (o que no hay ninguna).'
    },
    campo: {
      bloqueo_minutos: 'tiempo de una reserva sin pagar', dias_min: 'alquiler más corto', dias_max: 'alquiler más largo',
      horizonte_dias: 'antelación máxima', recogida: 'recogida al final', km_max: 'distancia máxima',
      entrega_activa: 'entrega encendida'   // `activa` ya es «empresa activa» (sociedad): Backend lo renombró para la entrega (bbm-p26, ba11880e)
    },
    hint: {
      sin_herramienta: 'No tienes la herramienta de este módulo: pídesela al administrador principal en Usuarios.',
      clase_con_unidades: 'Este producto tiene unidades: no puede dejar de ser de alquiler.',
      unidad_baja: 'Esa unidad está dada de baja.',
      previo_fechas: 'Las fechas no valen: la salida, hoy o antes (como mucho un año atrás); la vuelta, después de hoy.',
      regla_fuera: 'Un valor está fuera de lo permitido.',
      reserva_dias_min: 'La reserva es más corta que el alquiler mínimo.',
      reserva_dias_max: 'La reserva es más larga que el alquiler máximo.',
      reserva_horizonte: 'La reserva empieza demasiado lejos en el tiempo.',
      falta_motivo: 'Para cambiar algo ya guardado hay que escribir el motivo.',
      unidad_ocupada: 'Esa unidad ya tiene otra reserva en esas fechas.',
      flota_cambio: 'Otra persona ha cambiado esto mientras tanto: vuelve a cargar antes de guardar.',
      entrega_cambio: 'Otra persona ha cambiado esto mientras tanto: vuelve a cargar antes de guardar.',
      entrega_incompleta: 'Para encender la entrega hacen falta la tienda y el precio por km guardados.',
      entrega_apaga_primero: 'Con la entrega encendida no se cambia la tienda: apágala primero.',
      flota_duplicada: 'Esa matrícula ya existe.',
      flota_tope: 'Se ha pasado el máximo de unidades.',
      decimales_moneda: 'Esa moneda no admite tantos decimales.',
      datos: 'Algún dato no vale: revísalo.',
      axw_duda: 'No se ha podido comprobar si se guardó: vuelve a cargar la página antes de repetir.',
      axw_no_guardado: 'El ERP dice que no se guardó. Puedes volver a intentarlo.',
      axw_no_confirma: 'El ERP no confirmó el guardado: vuelve a cargar la página antes de repetir.'
    },
    ui: {
      sr_motivo_alta: 'Alta inicial desde el asistente de configuración',
      sr_motivo_previo: 'Alquileres que ya estaban en curso, apuntados en la configuración',
      sr_motivo_anade: 'Añadido desde el asistente de configuración',
      sr_parcial: 'Se guardó: %h. No se guardó: %f.',
      sr_detalle: 'Afecta a: %d',
      sr_no_preparada: 'La entrega aún no está preparada en este ERP: avisa al estudio.',
      sr_sin_cambios: 'No hay cambios que guardar.',
      sr_numero: 'Escribe solo la cifra, sin moneda: %c.',
      sr_quitar: 'Quitar',
      sr_quitar_fila: 'Quitar esta fila',
      // S40
      sr_clase_alquiler: 'Alquiler con unidades',
      sr_clase_alquiler_d: 'Un producto con varias unidades iguales, cada una con su matrícula. Precio por día, semana o mes.',
      sr_clase_alquiler_eg: 'Por ejemplo: un scooter · 12 unidades',
      sr_clase_salida: 'Salida con plazas',
      sr_clase_salida_d: 'Fechas fijas con plazas limitadas.',
      sr_proximamente: 'Próximamente',
      sr_clase_servicio: 'Servicio o artículo',
      sr_clase_servicio_d: 'Se vende tal cual: sin fechas ni unidades.',
      sr_clase_servicio_eg: 'Por ejemplo: una clase de surf, un casco, un traslado',
      sr_clase_nota: 'Elige la que encaja con tu primer producto. Después puedes añadir productos de cualquier clase.',
      sr_servicio_va: 'Los servicios y artículos se dan de alta en Productos: no necesitan este asistente.',
      sr_abrir_productos: 'Abrir Productos',
      sr_elige_alquiler: 'Para configurar las reservas hace falta un producto de alquiler.',
      // S41
      sr_nombre: 'Nombre del producto',
      sr_nombre_ayuda: 'Como lo ven los clientes al reservar.',
      sr_falta_nombre: 'Falta el nombre del producto.',
      sr_precios: 'Precios',
      sr_por_dia: 'Por día',
      sr_por_semana: 'Por semana (7 días)',
      sr_por_mes: 'Por mes (30 días)',
      sr_precios_ayuda: 'El precio de 7 o de 30 días es el del tramo entero, no por día.',
      sr_otros_tramos: 'Este producto tiene más tramos (%d días): se cambian en Flota y tarifas.',
      sr_tramo_menos: 'Un tramo de más días no puede costar menos en total que uno de menos.',
      sr_falta_dia: 'Falta el precio por día.',
      sr_seguro: 'Seguro',
      sr_seguro_ayuda: 'Opcional. Un precio por tramo, como las tarifas: el de 30 días no es 30 veces el de un día.',
      sr_tramo_1: '1 día',
      sr_tramo_n: '%n días',
      sr_fianza: 'Fianza',
      sr_fianza_ayuda: 'Opcional. Se retiene al recoger y se devuelve al entregar.',
      sr_seguro_oblig: 'Toda reserva lleva seguro',
      sr_seguro_sin_precio: 'Para que toda reserva lleve seguro, pon el precio del seguro.',
      sr_fianza_o: 'Con seguro, ¿se cobra también la fianza?',
      sr_fianza_o_no: 'No: fianza o seguro',
      sr_fianza_o_si: 'Sí: fianza y seguro',
      sr_unidades: 'Unidades',
      sr_unidades_ayuda: 'Cada unidad se reserva por separado. Escribe su matrícula.',
      sr_unidades_n: '%n unidades',
      sr_unidades_1: '1 unidad',
      sr_col_matricula: 'Matrícula',
      sr_matricula_n: 'Matrícula de la unidad %n',
      sr_anadir_unidad: 'Añadir una unidad',
      sr_matricula_repe: 'La matrícula %m está repetida.',
      sr_matricula_largo: 'La matrícula %m es demasiado corta o demasiado larga.',
      sr_sin_unidades: 'Añade al menos una unidad.',
      sr_mas_alquileres: '¿Más alquileres? Añádelos después en Flota y tarifas.',
      sr_e_producto: 'el producto',
      sr_e_tarifa: 'el precio de %t',
      sr_e_garantia: 'la fianza y el seguro obligatorio',
      sr_e_seguro: 'el seguro de %t',
      sr_e_seguro_borra: 'quitar el seguro de %t',
      sr_e_unidades: 'las unidades',
      // S43
      sr_bloqueo: 'Guardar una reserva sin pagar durante',
      sr_min_n: '%n minutos',
      sr_h_1: '1 hora',
      sr_h_n: '%n horas',
      sr_bloqueo_ayuda: 'Pasado ese tiempo sin pagar, la reserva se libera y la unidad vuelve a estar libre. Solo afecta a las reservas nuevas.',
      sr_dias_min: 'Alquiler más corto',
      sr_dias_max: 'Alquiler más largo',
      sr_menos: 'Un día menos',
      sr_mas: 'Un día más',
      sr_menos_uno: 'Uno menos',
      sr_mas_uno: 'Uno más',
      sr_horizonte: 'Se puede reservar con',
      sr_sin_limite: 'Sin límite',
      sr_meses_n: '%n meses de antelación',
      sr_dias_antes: '%n días de antelación',
      sr_bot: 'Límites del bot',
      sr_max_tel: 'Reservas sin pagar por teléfono',
      sr_max_act: 'Reservas sin pagar a la vez, en total',
      sr_por_defecto: 'Aún no se ha guardado: si lo dejas así, se usan estos valores.',
      sr_ejemplo: 'Ejemplo: una reserva hecha a las 10:00 y sin pagar a las %h se libera.',
      sr_ejemplo_dia: 'Ejemplo: una reserva hecha a las 10:00 y sin pagar se libera al día siguiente a las %h.',
      sr_ejemplo_dias: 'Ejemplo: una reserva hecha a las 10:00 y sin pagar se libera %n días después.',
      sr_max_menor: 'El alquiler más largo no puede ser más corto que el más corto.',
      sr_rango: 'Tiene que estar entre %a y %b.',
      // S44
      sr_fuera_pregunta: '¿Hay alguna unidad fuera ahora mismo?',
      sr_fuera_mas: '¿Hay alguna otra unidad fuera ahora mismo?',
      sr_si: 'Sí',
      sr_no_tienda: 'No, todas están en la tienda',
      sr_no_mas: 'No, ninguna más',
      sr_ya_apuntadas: 'Ya apuntadas',
      sr_unidad: 'Unidad',
      sr_desde: 'Fuera desde',
      sr_hasta: 'Vuelve el',
      sr_cliente: 'Cliente (opcional)',
      sr_cliente_ph: 'Nombre o referencia',
      sr_anadir_alquiler: 'Añadir otro alquiler',
      sr_tile_fuera: 'Fuera ahora',
      sr_tile_libres: 'Libres hoy',
      sr_tile_vuelta: 'Próxima vuelta',
      sr_fuera_nota: 'Aquí no se cobra nada: solo se bloquean las fechas.',
      sr_elige_si_no: 'Elige sí o no.',
      sr_fila_unidad: 'Elige la unidad de cada alquiler.',
      sr_fila_desde: 'La fecha de salida tiene que ser hoy o antes (como mucho un año atrás).',
      sr_fila_hasta: 'La fecha de vuelta tiene que ser después de hoy.',
      sr_fila_repe: 'La unidad %m está dos veces.',
      sr_sin_filas: 'Añade al menos un alquiler, o elige «No».',
      sr_quitar_previo: 'Quitar (apuntado por error)',
      sr_quitar_motivo: 'Por qué se quita',
      sr_quitar_nota: 'Si la unidad ya volvió, no se quita: se marca como devuelta en Reservas de producto.',
      sr_ninguna_libre: 'No hay ninguna unidad que se pueda apuntar: da de alta las unidades primero.',
      // S45
      sr_ofrecer: 'Ofrecer entrega a domicilio',
      sr_ofrecer_ayuda: 'Actívalo si llevas las motos a la puerta del cliente. Si no, salta este paso.',
      sr_b_donde: '1 · Desde dónde sale', sr_b_cuanto: '2 · Cuánto cuesta', sr_b_final: '3 · Al final del alquiler',
      sr_sede_nombre: 'Sale desde (nombre de la tienda)',
      sr_sede_coord: 'Coordenadas de la tienda (lat, lng)',
      sr_sede_coord_ayuda: 'Cópialas de Google Maps: clic derecho sobre la tienda y pulsa las cifras. Por ejemplo: -8.65, 115.13',
      sr_sede_fija: 'Con la entrega encendida no se cambia la tienda: apágala primero.',
      sr_precio_km: 'Precio por km',
      sr_gratis: 'Gratis hasta',
      sr_km_max: 'Se entrega hasta',
      sr_minimo: 'Mínimo por trayecto',
      sr_minimo_ayuda: 'Lo menos que se cobra por llevarla, aunque esté cerca.',
      sr_recogida: 'Recogida al final',
      sr_recogida_si: 'Se recoge al final y se cobra igual que la entrega',
      sr_recogida_no: 'Se recoge al final sin cobrarla',
      sr_fig_gratis: 'Gratis · hasta %k km',
      sr_fig_pago: '%p por km después · hasta %k km',
      sr_fig_minimo: 'Mínimo por trayecto: %p',
      sr_fig_nota: 'Ilustración · sin escala',
      sr_fig_tienda: 'Tienda',
      sr_fig_alt: 'Ilustración: la tienda en el centro, la zona gratis alrededor y la zona de pago hasta la distancia máxima.',
      sr_mas_entrega: 'Más ajustes en Entrega',
      sr_coord_mal: 'Escribe las coordenadas como «-8.65, 115.13».',
      sr_gratis_mayor: 'Los km gratis tienen que quedar por debajo de la distancia máxima.',
      sr_activa_falta: 'Para ofrecer la entrega hacen falta la tienda, sus coordenadas, el precio por km, la distancia máxima y decidir la recogida.',
      sr_activa_nota: 'Está encendida: lo que guardes cambia desde ya el precio que da el bot.',
      sr_e_ajustes: 'la tienda y los límites',
      sr_e_tarifa_km: 'el precio por km',
      sr_e_enciende: 'encender la entrega',
      sr_e_apaga: 'apagar la entrega'
    }
  };
  var EN_SR = {
    '¿Qué alquilas o vendes primero?': 'What do you rent or sell first?',
    'Cada clase de producto hace sus propias preguntas: solo se piden las que hacen falta.': 'Each class of product asks its own questions: we only ask the ones you need.',
    'Reglas de las reservas': 'Booking rules',
    'Cuánto se guarda una reserva sin pagar y cuántos días se puede alquilar.': 'How long an unpaid booking is held and how many days can be rented.',
    'Lo que ya está alquilado': "What's already rented",
    'Se empieza con el stock real: lo que está fuera hoy queda bloqueado hasta que vuelva.': "Start with your real stock: units out today stay blocked until they're back.",
    'Aún no hay ningún producto de alquiler activo.': 'There is no active rental product yet.',
    'Falta decir qué unidades están alquiladas ahora (o que no hay ninguna).': 'Still to say which units are rented out now (or that none are).',
    'tiempo de una reserva sin pagar': 'how long an unpaid booking is held', 'alquiler más corto': 'shortest rental', 'alquiler más largo': 'longest rental',
    'antelación máxima': 'how far ahead', 'recogida al final': 'collection at the end', 'distancia máxima': 'maximum distance', 'entrega encendida': 'delivery switched on',
    'No tienes la herramienta de este módulo: pídesela al administrador principal en Usuarios.': 'You do not have the tool for this module: ask the main administrator for it in Users.',
    'Este producto tiene unidades: no puede dejar de ser de alquiler.': 'This product has units: it cannot stop being a rental.',
    'Esa unidad está dada de baja.': 'That unit is retired.',
    'Las fechas no valen: la salida, hoy o antes (como mucho un año atrás); la vuelta, después de hoy.': 'The dates are not valid: out today or earlier (at most a year ago); back after today.',
    'Un valor está fuera de lo permitido.': 'A value is outside what is allowed.',
    'La reserva es más corta que el alquiler mínimo.': 'The booking is shorter than the minimum rental.',
    'La reserva es más larga que el alquiler máximo.': 'The booking is longer than the maximum rental.',
    'La reserva empieza demasiado lejos en el tiempo.': 'The booking starts too far ahead.',
    'Para cambiar algo ya guardado hay que escribir el motivo.': 'To change something already saved, write the reason.',
    'Esa unidad ya tiene otra reserva en esas fechas.': 'That unit already has another booking on those dates.',
    'Otra persona ha cambiado esto mientras tanto: vuelve a cargar antes de guardar.': 'Someone else changed this in the meantime: reload before saving.',
    'Para encender la entrega hacen falta la tienda y el precio por km guardados.': 'To switch delivery on, the shop and the price per km must be saved.',
    'Con la entrega encendida no se cambia la tienda: apágala primero.': 'The shop cannot be changed while delivery is on: switch it off first.',
    'Esa matrícula ya existe.': 'That plate already exists.',
    'Se ha pasado el máximo de unidades.': 'The maximum number of units has been exceeded.',
    'Esa moneda no admite tantos decimales.': 'That currency does not allow that many decimals.',
    'Algún dato no vale: revísalo.': 'Some data is not valid: check it.',
    'No se ha podido comprobar si se guardó: vuelve a cargar la página antes de repetir.': 'It could not be checked whether it was saved: reload the page before trying again.',
    'El ERP dice que no se guardó. Puedes volver a intentarlo.': 'The ERP says it was not saved. You can try again.',
    'El ERP no confirmó el guardado: vuelve a cargar la página antes de repetir.': 'The ERP did not confirm the save: reload the page before trying again.',
    'Alta inicial desde el asistente de configuración': 'Initial setup from the setup assistant',
    'Alquileres que ya estaban en curso, apuntados en la configuración': 'Rentals already under way, recorded during setup',
    'Añadido desde el asistente de configuración': 'Added from the setup assistant',
    'Se guardó: %h. No se guardó: %f.': 'Saved: %h. Not saved: %f.',
    'Afecta a: %d': 'Affects: %d',
    'La entrega aún no está preparada en este ERP: avisa al estudio.': 'Delivery is not prepared in this ERP yet: tell the studio.',
    'No hay cambios que guardar.': 'There are no changes to save.',
    'Escribe solo la cifra, sin moneda: %c.': 'Write only the number, without currency: %c.',
    'Quitar': 'Remove', 'Quitar esta fila': 'Remove this row',
    'Alquiler con unidades': 'Rental with units',
    'Un producto con varias unidades iguales, cada una con su matrícula. Precio por día, semana o mes.': 'One product, several identical units, each with its plate. Priced by day, week or month.',
    'Por ejemplo: un scooter · 12 unidades': 'e.g. a scooter · 12 units',
    'Salida con plazas': 'Departure with seats', 'Fechas fijas con plazas limitadas.': 'Fixed dates with a limited number of seats.', 'Próximamente': 'Coming soon',
    'Servicio o artículo': 'Service or item', 'Se vende tal cual: sin fechas ni unidades.': 'Sold as it is: no dates, no units to track.',
    'Por ejemplo: una clase de surf, un casco, un traslado': 'e.g. a surf lesson, a helmet, a transfer',
    'Elige la que encaja con tu primer producto. Después puedes añadir productos de cualquier clase.': 'Pick the one that fits your first product. You can add products of any class later.',
    'Los servicios y artículos se dan de alta en Productos: no necesitan este asistente.': 'Services and items are added in Products: they do not need this assistant.',
    'Abrir Productos': 'Open Products',
    'Para configurar las reservas hace falta un producto de alquiler.': 'Setting up bookings needs a rental product.',
    'Nombre del producto': 'Product name', 'Como lo ven los clientes al reservar.': 'As customers see it when they book.', 'Falta el nombre del producto.': 'The product name is missing.',
    'Precios': 'Rates', 'Por día': 'Per day', 'Por semana (7 días)': 'Per week (7 days)', 'Por mes (30 días)': 'Per month (30 days)',
    'El precio de 7 o de 30 días es el del tramo entero, no por día.': 'The 7-day and 30-day prices are for the whole period, not per day.',
    'Este producto tiene más tramos (%d días): se cambian en Flota y tarifas.': 'This product has more rate tiers (%d days): change them in Fleet and rates.',
    'Un tramo de más días no puede costar menos en total que uno de menos.': 'A longer tier cannot cost less in total than a shorter one.',
    'Falta el precio por día.': 'The price per day is missing.',
    'Seguro': 'Insurance', 'Opcional. Un precio por tramo, como las tarifas: el de 30 días no es 30 veces el de un día.': 'Optional. One price per tier, like the rates: 30 days is not 30 times one day.',
    '1 día': '1 day', '%n días': '%n days',
    'Fianza': 'Deposit', 'Opcional. Se retiene al recoger y se devuelve al entregar.': 'Optional. Held at pickup, returned at drop-off.',
    'Toda reserva lleva seguro': 'Every rental must include insurance',
    'Para que toda reserva lleve seguro, pon el precio del seguro.': 'For every rental to include insurance, enter the insurance price.',
    'Con seguro, ¿se cobra también la fianza?': 'With insurance, is the deposit also charged?', 'No: fianza o seguro': 'No: deposit or insurance', 'Sí: fianza y seguro': 'Yes: deposit and insurance',
    'Unidades': 'Units', 'Cada unidad se reserva por separado. Escribe su matrícula.': 'Each unit is booked on its own. Write its plate.',
    '%n unidades': '%n units', '1 unidad': '1 unit', 'Matrícula': 'Plate', 'Matrícula de la unidad %n': 'Plate of unit %n', 'Añadir una unidad': 'Add a unit',
    'La matrícula %m está repetida.': 'The plate %m is repeated.', 'La matrícula %m es demasiado corta o demasiado larga.': 'The plate %m is too short or too long.',
    'Añade al menos una unidad.': 'Add at least one unit.',
    '¿Más alquileres? Añádelos después en Flota y tarifas.': 'More rentals? Add them later in Fleet and rates.',
    'el producto': 'the product', 'el precio de %t': 'the price for %t', 'la fianza y el seguro obligatorio': 'the deposit and compulsory insurance',
    'el seguro de %t': 'the insurance for %t', 'quitar el seguro de %t': 'removing the insurance for %t', 'las unidades': 'the units',
    'Guardar una reserva sin pagar durante': 'Hold an unpaid booking for', '%n minutos': '%n minutes', '1 hora': '1 hour', '%n horas': '%n hours',
    'Pasado ese tiempo sin pagar, la reserva se libera y la unidad vuelve a estar libre. Solo afecta a las reservas nuevas.': 'After that time without payment, the booking is released and the unit is free again. It only affects new bookings.',
    'Alquiler más corto': 'Shortest rental', 'Alquiler más largo': 'Longest rental', 'Un día menos': 'One day less', 'Un día más': 'One day more', 'Uno menos': 'One less', 'Uno más': 'One more',
    'Se puede reservar con': 'Bookable up to', 'Sin límite': 'No limit', '%n meses de antelación': '%n months ahead', '%n días de antelación': '%n days ahead',
    'Límites del bot': 'Bot limits', 'Reservas sin pagar por teléfono': 'Unpaid bookings per phone', 'Reservas sin pagar a la vez, en total': 'Unpaid bookings at once, in total',
    'Aún no se ha guardado: si lo dejas así, se usan estos valores.': 'Not saved yet: if you leave it like this, these values are used.',
    'Ejemplo: una reserva hecha a las 10:00 y sin pagar a las %h se libera.': 'Example: a booking made at 10:00 and still unpaid at %h is released.',
    'Ejemplo: una reserva hecha a las 10:00 y sin pagar se libera al día siguiente a las %h.': 'Example: a booking made at 10:00 and still unpaid is released the next day at %h.',
    'Ejemplo: una reserva hecha a las 10:00 y sin pagar se libera %n días después.': 'Example: a booking made at 10:00 and still unpaid is released %n days later.',
    'El alquiler más largo no puede ser más corto que el más corto.': 'The longest rental cannot be shorter than the shortest one.',
    'Tiene que estar entre %a y %b.': 'It has to be between %a and %b.',
    '¿Hay alguna unidad fuera ahora mismo?': 'Are any units out right now?', '¿Hay alguna otra unidad fuera ahora mismo?': 'Are any other units out right now?',
    'Sí': 'Yes', 'No, todas están en la tienda': 'No, all are in the shop', 'No, ninguna más': 'No, none other',
    'Ya apuntadas': 'Already recorded', 'Unidad': 'Unit', 'Fuera desde': 'Out since', 'Vuelve el': 'Back on', 'Cliente (opcional)': 'Customer (optional)', 'Nombre o referencia': 'Name or reference',
    'Añadir otro alquiler': 'Add another rental', 'Fuera ahora': 'Out now', 'Libres hoy': 'Available today', 'Próxima vuelta': 'Next back',
    'Aquí no se cobra nada: solo se bloquean las fechas.': 'Nothing is charged here: we only block the dates.',
    'Elige sí o no.': 'Choose yes or no.',
    'Elige la unidad de cada alquiler.': 'Choose the unit of each rental.',
    'La fecha de salida tiene que ser hoy o antes (como mucho un año atrás).': 'The out date has to be today or earlier (at most a year ago).',
    'La fecha de vuelta tiene que ser después de hoy.': 'The back date has to be after today.',
    'La unidad %m está dos veces.': 'Unit %m is listed twice.', 'Añade al menos un alquiler, o elige «No».': 'Add at least one rental, or choose «No».',
    'Quitar (apuntado por error)': 'Remove (recorded by mistake)', 'Por qué se quita': 'Why it is removed',
    'Si la unidad ya volvió, no se quita: se marca como devuelta en Reservas de producto.': 'If the unit is already back, do not remove it: mark it as returned in Product bookings.',
    'No hay ninguna unidad que se pueda apuntar: da de alta las unidades primero.': 'There is no unit that can be recorded: add the units first.',
    'Ofrecer entrega a domicilio': 'Offer home delivery', 'Sale desde (nombre de la tienda)': 'Leaves from (shop name)', 'Coordenadas de la tienda (lat, lng)': 'Shop coordinates (lat, lng)',
    'Cópialas de Google Maps: clic derecho sobre la tienda y pulsa las cifras. Por ejemplo: -8.65, 115.13': 'Copy them from Google Maps: right-click on the shop and click the numbers. For example: -8.65, 115.13',
    'Precio por km': 'Price per km', 'Gratis hasta': 'Free up to', 'Se entrega hasta': 'Deliver up to', 'Mínimo por trayecto': 'Minimum per trip',
    'Lo menos que se cobra por llevarla, aunque esté cerca.': 'The least charged for a delivery, even when it is close.',
    'Recogida al final': 'Collection at the end', 'Se recoge al final y se cobra igual que la entrega': 'Collected at the end, same price as the delivery', 'Se recoge al final sin cobrarla': 'Collected at the end, free of charge',
    'Gratis · hasta %k km': 'Free · up to %k km', '%p por km después · hasta %k km': '%p per km after that · up to %k km', 'Mínimo por trayecto: %p': 'Minimum per trip: %p',
    'Ilustración · sin escala': 'Illustration · not to scale', 'Tienda': 'Shop',
    'Ilustración: la tienda en el centro, la zona gratis alrededor y la zona de pago hasta la distancia máxima.': 'Illustration: the shop in the centre, the free zone around it and the paid zone up to the maximum distance.',
    'Más ajustes en Entrega': 'More delivery settings', 'Actívalo si llevas las motos a la puerta del cliente. Si no, salta este paso.': 'Switch it on if you take the bikes to the customer’s door. If not, skip this step.',
    '1 · Desde dónde sale': '1 · Where it leaves from', '2 · Cuánto cuesta': '2 · What it costs', '3 · Al final del alquiler': '3 · At the end of the rental',
    'Escribe las coordenadas como «-8.65, 115.13».': 'Write the coordinates like «-8.65, 115.13».',
    'Los km gratis tienen que quedar por debajo de la distancia máxima.': 'The free km have to stay below the maximum distance.',
    'Para ofrecer la entrega hacen falta la tienda, sus coordenadas, el precio por km, la distancia máxima y decidir la recogida.': 'To offer delivery you need the shop, its coordinates, the price per km, the maximum distance and a decision on collection.',
    'Está encendida: lo que guardes cambia desde ya el precio que da el bot.': 'It is on: what you save changes the price the bot quotes right away.',
    'la tienda y los límites': 'the shop and the limits', 'el precio por km': 'the price per km', 'encender la entrega': 'switching delivery on', 'apagar la entrega': 'switching delivery off'
  };
  var ID_SR = {
    '¿Qué alquilas o vendes primero?': 'Apa yang pertama Anda sewakan atau jual?',
    'Cada clase de producto hace sus propias preguntas: solo se piden las que hacen falta.': 'Setiap jenis produk punya pertanyaannya sendiri: hanya yang diperlukan yang ditanyakan.',
    'Reglas de las reservas': 'Aturan booking',
    'Cuánto se guarda una reserva sin pagar y cuántos días se puede alquilar.': 'Berapa lama booking yang belum dibayar ditahan dan berapa hari motor bisa disewa.',
    'Lo que ya está alquilado': 'Yang sedang disewa',
    'Se empieza con el stock real: lo que está fuera hoy queda bloqueado hasta que vuelva.': 'Mulai dengan stok sebenarnya: unit yang sedang keluar hari ini tetap diblokir sampai kembali.',
    'Aún no hay ningún producto de alquiler activo.': 'Belum ada produk sewa yang aktif.',
    'Falta decir qué unidades están alquiladas ahora (o que no hay ninguna).': 'Belum diisi unit mana yang sedang disewa (atau bahwa tidak ada).',
    'tiempo de una reserva sin pagar': 'lama menahan booking yang belum dibayar', 'alquiler más corto': 'sewa terpendek', 'alquiler más largo': 'sewa terpanjang',
    'antelación máxima': 'batas waktu pemesanan ke depan', 'recogida al final': 'penjemputan di akhir sewa', 'distancia máxima': 'jarak maksimum', 'entrega encendida': 'pengantaran aktif',
    'No tienes la herramienta de este módulo: pídesela al administrador principal en Usuarios.': 'Anda belum punya akses alat modul ini: minta ke admin utama di Pengguna.',
    'Este producto tiene unidades: no puede dejar de ser de alquiler.': 'Produk ini punya unit: tidak bisa berhenti menjadi produk sewa.',
    'Esa unidad está dada de baja.': 'Unit itu sudah tidak dipakai lagi.',
    'Las fechas no valen: la salida, hoy o antes (como mucho un año atrás); la vuelta, después de hoy.': 'Tanggal tidak valid: keluar hari ini atau sebelumnya (paling lama satu tahun lalu); kembali setelah hari ini.',
    'Un valor está fuera de lo permitido.': 'Ada nilai di luar batas yang diizinkan.',
    'La reserva es más corta que el alquiler mínimo.': 'Booking lebih pendek dari sewa minimum.',
    'La reserva es más larga que el alquiler máximo.': 'Booking lebih panjang dari sewa maksimum.',
    'La reserva empieza demasiado lejos en el tiempo.': 'Booking dimulai terlalu jauh ke depan.',
    'Para cambiar algo ya guardado hay que escribir el motivo.': 'Untuk mengubah yang sudah tersimpan, tulis alasannya.',
    'Esa unidad ya tiene otra reserva en esas fechas.': 'Unit itu sudah punya booking lain pada tanggal tersebut.',
    'Otra persona ha cambiado esto mientras tanto: vuelve a cargar antes de guardar.': 'Orang lain sudah mengubah ini: muat ulang dulu sebelum menyimpan.',
    'Para encender la entrega hacen falta la tienda y el precio por km guardados.': 'Untuk mengaktifkan pengantaran, toko dan harga per km harus sudah tersimpan.',
    'Con la entrega encendida no se cambia la tienda: apágala primero.': 'Toko tidak bisa diubah selama pengantaran aktif: matikan dulu.',
    'Esa matrícula ya existe.': 'Plat nomor itu sudah ada.',
    'Se ha pasado el máximo de unidades.': 'Jumlah unit melebihi batas maksimum.',
    'Esa moneda no admite tantos decimales.': 'Mata uang itu tidak menerima desimal sebanyak itu.',
    'Algún dato no vale: revísalo.': 'Ada data yang tidak valid: periksa lagi.',
    'No se ha podido comprobar si se guardó: vuelve a cargar la página antes de repetir.': 'Tidak dapat diperiksa apakah sudah tersimpan: muat ulang halaman sebelum mencoba lagi.',
    'El ERP dice que no se guardó. Puedes volver a intentarlo.': 'ERP menyatakan belum tersimpan. Anda bisa mencoba lagi.',
    'El ERP no confirmó el guardado: vuelve a cargar la página antes de repetir.': 'ERP tidak mengonfirmasi bahwa data tersimpan: muat ulang halaman sebelum mencoba lagi.',
    'Alta inicial desde el asistente de configuración': 'Penyiapan awal dari panduan penyiapan',
    'Alquileres que ya estaban en curso, apuntados en la configuración': 'Sewa yang sudah berjalan, dicatat saat penyiapan',
    'Añadido desde el asistente de configuración': 'Ditambahkan dari panduan penyiapan',
    'Se guardó: %h. No se guardó: %f.': 'Tersimpan: %h. Tidak tersimpan: %f.',
    'Afecta a: %d': 'Terkait: %d',
    'La entrega aún no está preparada en este ERP: avisa al estudio.': 'Pengantaran belum disiapkan di ERP ini: beri tahu studio.',
    'No hay cambios que guardar.': 'Tidak ada perubahan untuk disimpan.',
    'Escribe solo la cifra, sin moneda: %c.': 'Tulis angkanya saja, tanpa mata uang: %c.',
    'Quitar': 'Hapus', 'Quitar esta fila': 'Hapus baris ini',
    'Alquiler con unidades': 'Sewa per unit',
    'Un producto con varias unidades iguales, cada una con su matrícula. Precio por día, semana o mes.': 'Satu produk dengan beberapa unit yang sama, masing-masing dengan plat nomornya. Harga per hari, minggu, atau bulan.',
    'Por ejemplo: un scooter · 12 unidades': 'Contoh: skuter · 12 unit',
    'Salida con plazas': 'Keberangkatan dengan kursi', 'Fechas fijas con plazas limitadas.': 'Tanggal tetap dengan kursi terbatas.', 'Próximamente': 'Segera hadir',
    'Servicio o artículo': 'Layanan atau barang', 'Se vende tal cual: sin fechas ni unidades.': 'Dijual apa adanya: tanpa tanggal dan tanpa unit.',
    'Por ejemplo: una clase de surf, un casco, un traslado': 'Contoh: kelas selancar, helm, antar-jemput',
    'Elige la que encaja con tu primer producto. Después puedes añadir productos de cualquier clase.': 'Pilih yang sesuai dengan produk pertama Anda. Nanti Anda bisa menambah produk jenis apa pun.',
    'Los servicios y artículos se dan de alta en Productos: no necesitan este asistente.': 'Layanan dan barang ditambahkan di Produk: tidak perlu panduan ini.',
    'Abrir Productos': 'Buka Produk',
    'Para configurar las reservas hace falta un producto de alquiler.': 'Untuk mengatur booking diperlukan produk sewa.',
    'Nombre del producto': 'Nama produk', 'Como lo ven los clientes al reservar.': 'Seperti yang dilihat pelanggan saat booking.', 'Falta el nombre del producto.': 'Nama produk belum diisi.',
    'Precios': 'Harga', 'Por día': 'Per hari', 'Por semana (7 días)': 'Per minggu (7 hari)', 'Por mes (30 días)': 'Per bulan (30 hari)',
    'El precio de 7 o de 30 días es el del tramo entero, no por día.': 'Harga 7 atau 30 hari adalah harga untuk seluruh periode, bukan per hari.',
    'Este producto tiene más tramos (%d días): se cambian en Flota y tarifas.': 'Produk ini punya tingkat harga lain (%d hari): ubah di Armada dan tarif.',
    'Un tramo de más días no puede costar menos en total que uno de menos.': 'Periode yang lebih lama tidak boleh lebih murah secara total daripada yang lebih pendek.',
    'Falta el precio por día.': 'Harga per hari belum diisi.',
    'Seguro': 'Asuransi', 'Opcional. Un precio por tramo, como las tarifas: el de 30 días no es 30 veces el de un día.': 'Opsional. Satu harga per periode, seperti tarif: 30 hari bukan 30 kali harga satu hari.',
    '1 día': '1 hari', '%n días': '%n hari',
    'Fianza': 'Deposit', 'Opcional. Se retiene al recoger y se devuelve al entregar.': 'Opsional. Ditahan saat motor diambil, dikembalikan saat motor diserahkan kembali.',
    'Toda reserva lleva seguro': 'Setiap booking wajib pakai asuransi',
    'Para que toda reserva lleve seguro, pon el precio del seguro.': 'Agar setiap booking memakai asuransi, isi harga asuransinya.',
    'Con seguro, ¿se cobra también la fianza?': 'Jika pakai asuransi, apakah deposit tetap ditagih?', 'No: fianza o seguro': 'Tidak: deposit atau asuransi', 'Sí: fianza y seguro': 'Ya: deposit dan asuransi',
    'Unidades': 'Unit', 'Cada unidad se reserva por separado. Escribe su matrícula.': 'Setiap unit di-booking terpisah. Tulis plat nomornya.',
    '%n unidades': '%n unit', '1 unidad': '1 unit', 'Matrícula': 'Plat nomor', 'Matrícula de la unidad %n': 'Plat nomor unit %n', 'Añadir una unidad': 'Tambah unit',
    'La matrícula %m está repetida.': 'Plat nomor %m tertulis dua kali.', 'La matrícula %m es demasiado corta o demasiado larga.': 'Plat nomor %m terlalu pendek atau terlalu panjang.',
    'Añade al menos una unidad.': 'Tambahkan minimal satu unit.',
    '¿Más alquileres? Añádelos después en Flota y tarifas.': 'Ada produk sewa lain? Tambahkan nanti di Armada dan tarif.',
    'el producto': 'produk', 'el precio de %t': 'harga %t', 'la fianza y el seguro obligatorio': 'deposit dan asuransi wajib',
    'el seguro de %t': 'asuransi %t', 'quitar el seguro de %t': 'menghapus asuransi %t', 'las unidades': 'unit',
    'Guardar una reserva sin pagar durante': 'Simpan booking yang belum dibayar selama', '%n minutos': '%n menit', '1 hora': '1 jam', '%n horas': '%n jam',
    'Pasado ese tiempo sin pagar, la reserva se libera y la unidad vuelve a estar libre. Solo afecta a las reservas nuevas.': 'Setelah waktu itu lewat tanpa pembayaran, booking dilepas dan unit kembali tersedia. Hanya berlaku untuk booking baru.',
    'Alquiler más corto': 'Sewa terpendek', 'Alquiler más largo': 'Sewa terpanjang', 'Un día menos': 'Kurangi satu hari', 'Un día más': 'Tambah satu hari', 'Uno menos': 'Kurangi satu', 'Uno más': 'Tambah satu',
    'Se puede reservar con': 'Bisa booking paling jauh', 'Sin límite': 'Tanpa batas', '%n meses de antelación': '%n bulan sebelumnya', '%n días de antelación': '%n hari sebelumnya',
    'Límites del bot': 'Batas bot', 'Reservas sin pagar por teléfono': 'Booking belum dibayar per nomor telepon', 'Reservas sin pagar a la vez, en total': 'Total booking belum dibayar sekaligus',
    'Aún no se ha guardado: si lo dejas así, se usan estos valores.': 'Belum tersimpan: jika dibiarkan, nilai-nilai ini yang dipakai.',
    'Ejemplo: una reserva hecha a las 10:00 y sin pagar a las %h se libera.': 'Contoh: booking dibuat pukul 10:00 dan belum dibayar pada pukul %h akan dilepas.',
    'Ejemplo: una reserva hecha a las 10:00 y sin pagar se libera al día siguiente a las %h.': 'Contoh: booking dibuat pukul 10:00 dan belum dibayar akan dilepas keesokan harinya pukul %h.',
    'Ejemplo: una reserva hecha a las 10:00 y sin pagar se libera %n días después.': 'Contoh: booking dibuat pukul 10:00 dan belum dibayar akan dilepas %n hari kemudian.',
    'El alquiler más largo no puede ser más corto que el más corto.': 'Sewa terpanjang tidak boleh lebih pendek dari sewa terpendek.',
    'Tiene que estar entre %a y %b.': 'Harus di antara %a dan %b.',
    '¿Hay alguna unidad fuera ahora mismo?': 'Apakah ada unit yang sedang keluar saat ini?', '¿Hay alguna otra unidad fuera ahora mismo?': 'Apakah ada unit lain yang sedang keluar saat ini?',
    'Sí': 'Ya', 'No, todas están en la tienda': 'Tidak, semua ada di toko', 'No, ninguna más': 'Tidak, tidak ada lagi',
    'Ya apuntadas': 'Sudah dicatat', 'Unidad': 'Unit', 'Fuera desde': 'Keluar sejak', 'Vuelve el': 'Kembali pada', 'Cliente (opcional)': 'Pelanggan (opsional)', 'Nombre o referencia': 'Nama atau referensi',
    'Añadir otro alquiler': 'Tambah sewa lain', 'Fuera ahora': 'Sedang keluar', 'Libres hoy': 'Tersedia hari ini', 'Próxima vuelta': 'Kembali berikutnya',
    'Aquí no se cobra nada: solo se bloquean las fechas.': 'Tidak ada yang ditagih di sini: hanya tanggalnya yang diblokir.',
    'Elige sí o no.': 'Pilih ya atau tidak.',
    'Elige la unidad de cada alquiler.': 'Pilih unit untuk setiap sewa.',
    'La fecha de salida tiene que ser hoy o antes (como mucho un año atrás).': 'Tanggal keluar harus hari ini atau sebelumnya (paling lama satu tahun lalu).',
    'La fecha de vuelta tiene que ser después de hoy.': 'Tanggal kembali harus setelah hari ini.',
    'La unidad %m está dos veces.': 'Unit %m tercatat dua kali.', 'Añade al menos un alquiler, o elige «No».': 'Tambahkan minimal satu sewa, atau pilih «Tidak».',
    'Quitar (apuntado por error)': 'Hapus (salah catat)', 'Por qué se quita': 'Alasan dihapus',
    'Si la unidad ya volvió, no se quita: se marca como devuelta en Reservas de producto.': 'Jika unit sudah kembali, jangan dihapus: tandai sudah kembali di Booking sewa motor.',
    'No hay ninguna unidad que se pueda apuntar: da de alta las unidades primero.': 'Tidak ada unit yang bisa dicatat: daftarkan unitnya dulu.',
    'Ofrecer entrega a domicilio': 'Tawarkan antar ke alamat', 'Sale desde (nombre de la tienda)': 'Berangkat dari (nama toko)', 'Coordenadas de la tienda (lat, lng)': 'Koordinat toko (lat, lng)',
    'Cópialas de Google Maps: clic derecho sobre la tienda y pulsa las cifras. Por ejemplo: -8.65, 115.13': 'Salin dari Google Maps: klik kanan di lokasi toko lalu klik angkanya. Contoh: -8.65, 115.13',
    'Precio por km': 'Harga per km', 'Gratis hasta': 'Gratis sampai', 'Se entrega hasta': 'Diantar sampai', 'Mínimo por trayecto': 'Minimum per perjalanan',
    'Lo menos que se cobra por llevarla, aunque esté cerca.': 'Biaya paling rendah untuk mengantar, meskipun dekat.',
    'Recogida al final': 'Penjemputan di akhir sewa', 'Se recoge al final y se cobra igual que la entrega': 'Dijemput di akhir sewa dengan biaya sama seperti pengantaran', 'Se recoge al final sin cobrarla': 'Dijemput di akhir sewa tanpa biaya',
    'Gratis · hasta %k km': 'Gratis · sampai %k km', '%p por km después · hasta %k km': '%p per km setelahnya · sampai %k km', 'Mínimo por trayecto: %p': 'Minimum per perjalanan: %p',
    'Ilustración · sin escala': 'Ilustrasi · tidak berskala', 'Tienda': 'Toko',
    'Ilustración: la tienda en el centro, la zona gratis alrededor y la zona de pago hasta la distancia máxima.': 'Ilustrasi: toko di tengah, zona gratis di sekitarnya, dan zona berbayar sampai jarak maksimum.',
    'Más ajustes en Entrega': 'Pengaturan lain di Pengantaran', 'Actívalo si llevas las motos a la puerta del cliente. Si no, salta este paso.': 'Aktifkan jika Anda mengantar motor ke depan pintu pelanggan. Jika tidak, lewati langkah ini.',
    '1 · Desde dónde sale': '1 · Berangkat dari mana', '2 · Cuánto cuesta': '2 · Berapa biayanya', '3 · Al final del alquiler': '3 · Di akhir sewa',
    'Escribe las coordenadas como «-8.65, 115.13».': 'Tulis koordinat seperti «-8.65, 115.13».',
    'Los km gratis tienen que quedar por debajo de la distancia máxima.': 'Km gratis harus di bawah jarak maksimum.',
    'Para ofrecer la entrega hacen falta la tienda, sus coordenadas, el precio por km, la distancia máxima y decidir la recogida.': 'Untuk menawarkan pengantaran diperlukan toko, koordinatnya, harga per km, jarak maksimum, dan keputusan soal penjemputan.',
    'Está encendida: lo que guardes cambia desde ya el precio que da el bot.': 'Pengantaran aktif: yang Anda simpan langsung mengubah harga yang diberikan bot.',
    'la tienda y los límites': 'toko dan batasnya', 'el precio por km': 'harga per km', 'encender la entrega': 'mengaktifkan pengantaran', 'apagar la entrega': 'mematikan pengantaran'
  };
  Object.keys(TX).forEach(function (g) {
    var dst = S.TEXTOS[g] || (S.TEXTOS[g] = {});
    Object.keys(TX[g]).forEach(function (k) { if (!(k in dst)) dst[k] = TX[g][k]; });
  });
  function fusiona() {
    if (window.LW_EN && typeof window.LW_EN === 'object') Object.keys(EN_SR).forEach(function (k) { if (!(k in window.LW_EN)) window.LW_EN[k] = EN_SR[k]; });
    if (window.LW_ID && typeof window.LW_ID === 'object') Object.keys(ID_SR).forEach(function (k) { if (!(k in window.LW_ID)) window.LW_ID[k] = ID_SR[k]; });
  }
  fusiona();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fusiona);

  // ── Ayudas ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  function U(k, h) { return S.ui(k, h); }
  function el(tag, attrs, hijos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null || attrs[k] === false) return; if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k] === true ? '' : attrs[k]); });
    (hijos || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function vacia(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }
  function esObj(x) { return x != null && typeof x === 'object' && !Array.isArray(x); }
  function num(x) { return x == null || x === '' || isNaN(Number(x)) ? null : Number(x); }
  var RAIZ = (function () { var p = location.pathname, i = p.indexOf('/ajustes/'); return i >= 0 ? p.slice(0, i + 1) : '/'; })();
  var CLS_IN = 'w-full rounded-lg border border-control-border/50 bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md';
  var CLS_ETQ = 'font-label-md text-label-md text-on-surface';
  var CLS_AYUDA = 'font-body-sm text-body-sm text-outline';
  var CLS_BTN2 = 'inline-flex items-center justify-center px-4 py-2 rounded-full border border-outline-variant text-deep-lagoon font-label-md text-label-md';
  var ALTO = 'min-height:44px';
  var MOTIVO_MIN = 3;
  var OCULTO = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';   // solo para el lector de pantalla

  // El importe se lee con el parser de la suite (dinero.js, lwParseImporte) si la página lo trae; si no, con SUS MISMAS reglas (un solo criterio:
  // «90.000» = 90000, «1.500,50» = 1500.5). La base vuelve a comprobar rango y decimales de la moneda.
  function importe(t) {
    if (typeof window.lwParseImporte === 'function') return window.lwParseImporte(t);
    var s = String(t == null ? '' : t).replace(/[^\d.,]/g, '');
    if (!/\d/.test(s)) return null;
    var d = s.lastIndexOf('.'), c = s.lastIndexOf(','), sep = d > c ? '.' : (c > d ? ',' : '');
    var resto = s.slice(s.lastIndexOf(sep) + 1);
    if (sep && (s.split(sep).length > 2 || /^\d{3}$/.test(resto))) sep = '';
    var n = parseFloat(sep ? s.replace(/[.,]/g, function (m) { return m === sep ? '.' : ''; }) : s.replace(/[.,]/g, ''));
    return isFinite(n) ? n : null;
  }
  // Un campo de importe: vacío → null; con letras o signo → error (no se adivina)
  function leeImporte(caja, k, etq) {
    var raw = val(caja, k);
    if (!raw) return { v: null };
    if (/[^\d.,\s]/.test(raw)) return { e: U('sr_numero', { c: etq }) };
    var n = importe(raw);
    return n == null ? { e: U('sr_numero', { c: etq }) } : { v: n };
  }
  function leeKm(caja, k, etq) {
    var raw = val(caja, k).replace(',', '.');
    if (!raw) return { v: null };
    if (!/^\d+(\.\d+)?$/.test(raw)) return { e: U('sr_numero', { c: etq }) };
    return { v: Number(raw) };
  }
  function fmt(n) { return n == null ? '' : String(n); }
  function precioTxt(n, mon) {
    if (n == null) return '—';
    var loc = String(document.documentElement.lang || '').indexOf('en') === 0 ? 'en-US' : 'de-DE';   // «1.500» como el resto del ERP (dinero.js)
    try { return (mon ? mon + ' ' : '') + Number(n).toLocaleString(loc, { maximumFractionDigits: 4 }); } catch (e) { return (mon ? mon + ' ' : '') + n; }
  }
  function val(caja, k) { var i = caja.querySelector('[data-axw-campo="' + k + '"]'); return i ? String(i.value || '').trim() : ''; }
  function marcado(caja, k) { var i = caja.querySelector('[data-axw-campo="' + k + '"]:checked'); return i ? i.value : ''; }
  // «18 oct» en el idioma de la pantalla; la fecha es un día (AAAA-MM-DD), así que se lee en UTC para no correrla un día
  function diaMes(iso) {
    var d = new Date(String(iso) + 'T00:00:00Z');
    if (isNaN(d)) return String(iso || '');
    try { return d.toLocaleDateString(typeof window.lwLocale === 'function' ? window.lwLocale() : 'es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }); }
    catch (e) { return String(iso); }   // MUDO A PROPOSITO: navegador sin Intl; va la fecha tal cual
  }
  function hoyISO(dias) {
    var d = new Date(); d.setHours(12, 0, 0, 0); if (dias) d.setDate(d.getDate() + dias);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function letras(s) { return (String(s || '').match(/\p{L}/gu) || []).length; }

  function campo(caja, k, etiqueta, valor, o) {
    o = o || {};
    var id = 'axw-sr-' + k;
    var inp = el('input', { id: id, type: o.tipo || 'text', 'data-axw-campo': k, autocomplete: 'off', inputmode: o.modo || null, maxlength: o.max ? String(o.max) : null,
                            min: o.min || null, max: o.maxv || null, placeholder: o.ph || null, readonly: o.soloLee ? true : null, class: CLS_IN });
    inp.style.maxWidth = '100%'; inp.style.minWidth = '0';
    if (valor != null) inp.value = String(valor);
    var dentro = inp;
    if (o.antes || o.despues) {
      dentro = el('div', { class: 'flex items-center gap-2' }, [o.antes ? el('span', { class: CLS_AYUDA, text: o.antes }) : null, inp, o.despues ? el('span', { class: CLS_AYUDA, text: o.despues }) : null]);
    }
    var fila = el('div', { class: 'flex flex-col gap-1.5 min-w-0', 'data-axw-fila': k }, [el('label', { for: id, class: CLS_ETQ, text: etiqueta }), dentro,
      o.ayuda ? el('span', { class: CLS_AYUDA, text: o.ayuda }) : null]);
    caja.appendChild(fila);
    return inp;
  }
  function rejilla(min) { return el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,' + (min || 180) + 'px),1fr));gap:12px 16px' }); }
  // Sí/no y opciones cortas: radios de verdad (teclado y lector de pantalla), con el aspecto de pastilla del diseño (S43 «seg»)
  function seg(caja, k, leyenda, opciones, valor) {
    var fs = el('fieldset', { class: 'flex flex-col gap-2 min-w-0', 'data-axw-fila': k, style: 'border:0;padding:0;margin:0' }, [el('legend', { class: CLS_ETQ, style: 'margin-bottom:8px', text: leyenda })]);
    var fila = el('div', { class: 'flex flex-wrap gap-2' });
    opciones.forEach(function (o, i) {
      var id = 'axw-sr-' + k + '-' + i;
      var r = el('input', { type: 'radio', id: id, name: 'axw-sr-' + k, value: o[0], 'data-axw-campo': k, disabled: o[2] ? true : null });
      if (String(valor) === String(o[0])) r.checked = true;
      fila.appendChild(el('label', { for: id, class: 'inline-flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant font-label-md text-label-md text-on-surface', style: ALTO + (o[2] ? ';opacity:.5' : '') }, [r, el('span', { text: o[1] })]));
    });
    fs.appendChild(fila); caja.appendChild(fs);
    return fs;
  }
  function interruptor(caja, k, etiqueta, marcadoIni) {
    var id = 'axw-sr-' + k;
    var c = el('input', { type: 'checkbox', id: id, 'data-axw-campo': k, style: 'width:20px;height:20px' });
    c.checked = !!marcadoIni;
    caja.appendChild(el('label', { for: id, class: 'inline-flex items-center gap-3 font-label-md text-label-md text-on-surface', style: ALTO, 'data-axw-fila': k }, [c, el('span', { text: etiqueta })]));
    return c;
  }
  function grupo(caja, titulo, ayuda) {
    var g = el('div', { class: 'flex flex-col gap-3 min-w-0' }, [el('span', { class: CLS_ETQ, style: 'font-weight:600', text: titulo }), ayuda ? el('span', { class: CLS_AYUDA, text: ayuda }) : null]);
    caja.appendChild(g); return g;
  }
  // P5: el interruptor se ve como interruptor (Diseño, 15-oct): pista de pastilla, sin sombras; colores solo por token de la piel
  function estiloInterruptor() {
    if (document.getElementById('axw-sr-estilo')) return;
    var s = document.createElement('style'); s.id = 'axw-sr-estilo';
    s.textContent = '.axw-sr-switch{-webkit-appearance:none;appearance:none;width:44px!important;height:24px!important;flex:none;margin:0;border-radius:999px;position:relative;cursor:pointer;background:rgb(var(--tema-outline-variant))}'
      + '.axw-sr-switch::before{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:999px;background:rgb(var(--tema-surface-container-lowest));transition:transform .15s}'
      + '.axw-sr-switch:checked{background:rgb(var(--tema-primary-container))}.axw-sr-switch:checked::before{transform:translateX(20px)}'
      + '.axw-sr-switch:focus-visible{outline:2px solid rgb(var(--tema-primary));outline-offset:2px}';
    document.head.appendChild(s);
  }
  function nota(caja, texto, tipo) { var p = el('p', { class: 'font-body-sm text-body-sm ' + (tipo === 'error' ? 'text-error' : 'text-on-surface-variant'), 'data-axw-sr-nota': tipo || 'info', text: texto }); caja.appendChild(p); return p; }
  function campoMotivo(caja, st) {
    var g = el('div', { class: 'flex flex-col gap-1.5' });
    var inp = el('input', { id: 'axw-sr-motivo-' + st.clave, type: 'text', maxlength: '200', autocomplete: 'off', 'data-axw-campo': 'sr_motivo', class: CLS_IN });
    g.appendChild(el('label', { for: inp.id, class: CLS_ETQ, text: U('motivo') })); g.appendChild(inp); g.appendChild(el('span', { class: CLS_AYUDA, text: U('motivo_ayuda') }));
    caja.appendChild(g); st.motivo = inp; return inp;
  }
  // El motivo: el del usuario si ya había algo guardado (obligatorio, ≥ 3 letras), o el fijo de «alta inicial» (Backend, 12-oct: vale así)
  function motivo(st, exigido) {
    if (st.motivo) {
      var m = st.motivo.value.trim();
      if (exigido && letras(m) < MOTIVO_MIN) return { e: U('motivo_corto') };
      return { v: m || null };
    }
    return { v: null };
  }

  // ── La base: lecturas por lwDatos (todas son *_datos), escrituras por sb.rpc. Nombres LITERALES. ────────────────────────────────────────
  var LEE = {
    reservas_setup_datos: function (a) { return window.lwDatos('reservas_setup_datos', a); },
    producto_flota_datos: function (a) { return window.lwDatos('producto_flota_datos', a); },
    entrega_datos: function (a) { return window.lwDatos('entrega_datos', a); }
  };
  var ESCRIBE = {
    producto_guarda: function (sb, a) { return sb.rpc('producto_guarda', a); },
    producto_tarifa_guarda: function (sb, a) { return sb.rpc('producto_tarifa_guarda', a); },
    producto_garantia_guarda: function (sb, a) { return sb.rpc('producto_garantia_guarda', a); },
    producto_seguro_guarda: function (sb, a) { return sb.rpc('producto_seguro_guarda', a); },
    producto_seguro_borra: function (sb, a) { return sb.rpc('producto_seguro_borra', a); },
    producto_unidades_alta_lote: function (sb, a) { return sb.rpc('producto_unidades_alta_lote', a); },
    reservas_reglas_guarda: function (sb, a) { return sb.rpc('reservas_reglas_guarda', a); },
    reservas_previas_guarda: function (sb, a) { return sb.rpc('reservas_previas_guarda', a); },
    reserva_previa_quita: function (sb, a) { return sb.rpc('reserva_previa_quita', a); },
    entrega_ajustes_guarda: function (sb, a) { return sb.rpc('entrega_ajustes_guarda', a); },
    entrega_tarifa_guarda: function (sb, a) { return sb.rpc('entrega_tarifa_guarda', a); }
  };
  function lee(nombre, args) {
    if (typeof window.lwDatos !== 'function') return Promise.resolve({ ok: false, error: { code: '42501', message: 'sin lwDatos' } });
    return new Promise(function (ok) { ok(LEE[nombre](args || {})); }).then(function (r) {
      if (!r) return { ok: false, error: { message: 'sin respuesta' } };
      if (r.error) return { ok: false, error: r.error };
      return { ok: true, data: r.data };
    }, function (e) { return { ok: false, error: e || {} }; });
  }
  // {ok, data} | {ok:false, error, perdida}: solo un error SIN código es «no sé si llegó»
  function escribe(sb, nombre, args) {
    return new Promise(function (ok) { ok(ESCRIBE[nombre](sb, args)); }).then(function (r) {
      if (!r) return { ok: false, perdida: true, error: { message: 'sin respuesta' } };
      if (r.error) return { ok: false, perdida: !r.error.code, error: r.error };
      return { ok: true, data: r.data };
    }, function (e) { return { ok: false, perdida: !(e && e.code), error: e || {} }; });
  }
  function cliente() {
    if (!window.LW_AUTH || typeof window.LW_AUTH.then !== 'function') return Promise.resolve(null);
    return window.LW_AUTH.then(function (a) { return a && a.sb ? a.sb : null; }, function () { return null; });
  }
  function formaSetup(d) {
    return esObj(d) && Array.isArray(d.clases) && Array.isArray(d.garantias) && Array.isArray(d.seguro_tramos) && esObj(d.reglas) && esObj(d.reglas_defecto)
      && Array.isArray(d.previos) && (d.previos_revisado == null || esObj(d.previos_revisado)) && (d.topes == null || esObj(d.topes));
  }
  function formaFlota(d) {
    return esObj(d) && Array.isArray(d.productos) && d.productos.every(function (p) { return esObj(p) && typeof p.id === 'string' && Array.isArray(p.unidades) && Array.isArray(p.tarifas); });
  }
  function formaEntrega(d) { return esObj(d) && esObj(d.ajustes) && typeof d.version === 'number' && Array.isArray(d.faltan) && (d.tarifa == null || esObj(d.tarifa)); }
  function conForma(r, f) { return !r.ok ? r : (f(r.data) ? r : { ok: false, error: { code: 'axw_forma', message: 'forma' } }); }
  function leeSetup(prod) { return lee('reservas_setup_datos', { p_producto: prod || null }).then(function (r) { return conForma(r, formaSetup); }); }
  function leeFlota(prod) { return lee('producto_flota_datos', { p_producto: prod || null }).then(function (r) { return conForma(r, formaFlota); }); }
  function leeEntrega() { return lee('entrega_datos', {}).then(function (r) { return conForma(r, formaEntrega); }); }
  function explicaLectura(err) { return err && err.code === 'axw_forma' ? S.texto('general', 'forma') : S.explica(err || {}, true).texto; }

  /* Varias escrituras seguidas (S41, S45). Cada una: {etq, llama(sb) → promesa, ok(data)?, tras(data)?, verifica(releido)?, trasVerifica(releido)?}.
     Error con código → para y lo dice. Respuesta perdida → relee y decide si llegó: sí → sigue; no → para con «no se guardó»; no se pudo
     releer → para con «no se ha podido comprobar». Nunca reenvía sola. */
  function cadena(sb, pasos, relee) {
    var hechos = [];
    function uno(i) {
      if (i >= pasos.length) return Promise.resolve({ ok: true, hechos: hechos });
      var p = pasos[i];
      return p.llama(sb).then(function (r) {
        if (r.ok && (!p.ok || p.ok(r.data))) { if (p.tras) p.tras(r.data); hechos.push(p.etq); return uno(i + 1); }
        if (r.ok) return { ok: false, hechos: hechos, falla: p.etq, error: { hint: 'axw_no_confirma' } };
        if (!r.perdida) return { ok: false, hechos: hechos, falla: p.etq, error: r.error };
        return relee().then(function (rr) {
          if (!rr.ok) return { ok: false, hechos: hechos, falla: p.etq, error: { hint: 'axw_duda' } };
          if (p.verifica && p.verifica(rr.datos)) { if (p.trasVerifica) p.trasVerifica(rr.datos); hechos.push(p.etq); return uno(i + 1); }
          return { ok: false, hechos: hechos, falla: p.etq, error: { hint: 'axw_no_guardado' } };
        });
      });
    }
    return uno(0);
  }

  // Lo tecleado sobrevive a un fallo (el asistente repinta el paso al fallar) y lo que sí se guardó se dice una vez
  var BORRADOR = {}, AVISO = {}, CREADO = {};
  function instantanea(zona) {
    var o = { campos: {}, filas: {} };
    zona.querySelectorAll('[data-axw-campo]').forEach(function (i) {
      var k = i.getAttribute('data-axw-campo');
      if (i.type === 'radio') { if (i.checked) o.campos[k] = i.value; }
      else if (i.type === 'checkbox') o.campos[k] = i.checked ? '1' : '0';
      else o.campos[k] = i.value;
    });
    zona.querySelectorAll('[data-axw-sr-filas]').forEach(function (t) { o.filas[t.getAttribute('data-axw-sr-filas')] = t.querySelectorAll('[data-axw-sr-fila]').length; });
    return o;
  }
  function restaura(zona, o) {
    Object.keys(o.campos).forEach(function (k) {
      zona.querySelectorAll('[data-axw-campo="' + k + '"]').forEach(function (i) {
        if (i.readOnly || i.disabled) return;
        if (i.type === 'radio') i.checked = i.value === o.campos[k];
        else if (i.type === 'checkbox') i.checked = o.campos[k] === '1';
        else i.value = o.campos[k];
      });
    });
  }

  /* Un componente autónomo. def = {clave, lee(ctx) → {ok, datos}, dibuja(zona, st), valores(st) → {ok, v}|{ok:false, error}, guarda(sb, v, st)
     → Promise<{ok}|{ok:false, error}>, soloAsistente?}. st = {clave, ctx, datos, zona, motivo, filas, recarga()}. */
  function autonomo(def) {
    return {
      sinMotivo: true, soloAsistente: !!def.soloAsistente,
      pinta: function (caja, ctx) {
        var st = { clave: def.clave, ctx: ctx, listo: false, filas: {} };
        var zona = el('div', { class: 'flex flex-col gap-5 min-w-0', 'data-axw-sr': def.clave });
        caja.appendChild(zona);
        st.zona = zona;
        st.recarga = function () {
          st.listo = false; st.motivo = null;
          var viejo = ctx.lado && ctx.lado.querySelector('[data-axw-lado-de="' + def.clave + '"]');
          if (viejo) viejo.parentNode.removeChild(viejo);   // lo que el paso puso de lado no se queda mientras relee (ni si la relectura falla)
          vacia(zona).appendChild(el('p', { class: 'font-body-md text-body-md text-on-surface-variant', 'data-axw-sr-estado': 'cargando', text: U('cargando') }));
          return def.lee(ctx).then(function (r) {
            vacia(zona);
            if (!r.ok) {
              zona.appendChild(el('div', { role: 'alert', 'data-axw-sr-estado': 'fallo', class: 'rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body-md text-body-md text-error', text: U('no_mirar') + ': ' + explicaLectura(r.error) }));
              var b = el('button', { type: 'button', 'data-axw-sr-accion': 'releer', class: CLS_BTN2 + ' self-start', style: ALTO, text: U('reintentar') });
              b.addEventListener('click', function () { st.recarga(); });
              zona.appendChild(b);
              return;
            }
            st.datos = r.datos;
            var b0 = BORRADOR[def.clave];
            if (b0) st.filas = b0.filas || {};
            def.dibuja(zona, st);
            if (b0) { restaura(zona, b0); if (def.refresca) def.refresca(st); }
            var av = AVISO[def.clave];
            if (av) { zona.insertBefore(el('p', { role: 'status', 'data-axw-sr-aviso': '1', class: 'rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body-sm text-body-sm text-on-surface', text: av }), zona.firstChild); }   // sigue hasta el próximo guardado: el asistente repinta el paso al fallar
            st.listo = true;
          });
        };
        st.recarga();
        return {
          valores: function () {
            if (!st.listo) return { ok: false, error: U('cargando') };
            var r = def.valores(st);
            if (r.ok) r.v.__st = st;
            return r;
          },
          boton: def.boton ? U(def.boton) : null
        };
      },
      guarda: function (sb, v) {
        var st = v.__st;
        if (!st) return Promise.resolve({ ok: false, error: { hint: 'axw_no_confirma' } });
        BORRADOR[def.clave] = instantanea(st.zona); delete AVISO[def.clave];
        return def.guarda(sb, v, st).then(function (r) {
          if (r.ok) { delete BORRADOR[def.clave]; delete AVISO[def.clave]; return { ok: true, sigue: r.sigue || null }; }
          if (r.hechos && r.hechos.length) AVISO[def.clave] = U('sr_parcial', { h: r.hechos.join(', '), f: r.falla || '—' });
          if (r.error && r.error.details && /^(unidad_ocupada|unidad_baja|regla_fuera)$/.test(String(r.error.hint || ''))) {
            AVISO[def.clave] = (AVISO[def.clave] ? AVISO[def.clave] + ' ' : '') + U('sr_detalle', { d: String(r.error.details) });
          }
          // lo que sí se guardó cambia lo que hay (un producto nuevo, la versión de la entrega): se relee ANTES de dejar repetir
          var tras = (r.hechos && r.hechos.length) || /^axw_/.test(String((r.error && r.error.hint) || '')) ? st.recarga() : Promise.resolve();
          return tras.then(function () { return { ok: false, error: r.error || {} }; });
        });
      }
    };
  }

  // ── S40 · Clase del primer producto ──────────────────────────────────────────────────────────────────────────────────────────────────
  // No guarda nada por sí sola: la clase viaja en el alta del producto (S41). «Alquiler» lleva al paso siguiente (sigue: 'flota').
  var CLASES = [['alquiler', 'sr_clase_alquiler', 'sr_clase_alquiler_d', 'sr_clase_alquiler_eg'], ['salida', 'sr_clase_salida', 'sr_clase_salida_d', null],
                ['servicio', 'sr_clase_servicio', 'sr_clase_servicio_d', 'sr_clase_servicio_eg']];
  var clase = autonomo({
    clave: 'clase', soloAsistente: true, boton: 'continuar',
    lee: function () { return leeSetup(null).then(function (r) { return r.ok ? { ok: true, datos: r.data } : r; }); },
    dibuja: function (zona, st) {
      var disp = {};
      st.datos.clases.forEach(function (c) { if (c && typeof c.clase === 'string') disp[c.clase] = c.disponible === true; });
      var fs = el('fieldset', { class: 'flex flex-col gap-3 min-w-0', 'data-axw-fila': 'clase', style: 'border:0;padding:0;margin:0' }, [el('legend', { style: OCULTO, text: S.texto('paso', 'clase', 0) })]);
      var g = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px' });
      var actual = st.ctx.paso && st.ctx.paso.ref ? String(st.ctx.paso.ref) : (disp.alquiler ? 'alquiler' : '');
      CLASES.forEach(function (c) {
        if (!(c[0] in disp)) return;   // una clase que la base no da, no se pinta
        var off = !disp[c[0]], id = 'axw-sr-clase-' + c[0];
        var r = el('input', { type: 'radio', id: id, name: 'axw-sr-clase', value: c[0], 'data-axw-campo': 'clase', disabled: off ? true : null });
        if (c[0] === actual && !off) r.checked = true;
        g.appendChild(el('label', { for: id, 'data-axw-sr-clase': c[0], class: 'flex flex-col gap-2 rounded-2xl border border-outline-variant p-4', style: 'min-height:44px;cursor:' + (off ? 'default;opacity:.5' : 'pointer') }, [
          el('span', { class: 'flex items-center gap-2' }, [r, el('span', { class: 'font-label-md text-label-md text-on-surface', style: 'font-weight:600', text: U(c[1]) }),
            off ? el('span', { class: 'px-2 py-0.5 rounded-full border border-outline-variant font-label-md text-[12px] text-on-surface-variant', text: U('sr_proximamente') }) : null]),
          el('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: U(c[2]) }),
          c[3] ? el('span', { class: CLS_AYUDA, text: U(c[3]) }) : null]));
      });
      fs.appendChild(g); zona.appendChild(fs);
      var aviso = el('div', { class: 'flex flex-col gap-2', 'data-axw-sr-servicio': '1', hidden: true }, [
        el('p', { class: 'font-body-md text-body-md text-on-surface', text: U('sr_servicio_va') }),
        el('a', { href: RAIZ + 'productos/', class: CLS_BTN2 + ' self-start', style: ALTO, 'data-axw-sr-accion': 'abrir-productos', text: U('sr_abrir_productos') })]);
      zona.appendChild(aviso);
      nota(zona, U('sr_clase_nota'));
      function refresca() { aviso.hidden = marcado(zona, 'clase') !== 'servicio'; }
      zona.addEventListener('change', refresca); refresca();
    },
    refresca: function (st) { var a = st.zona.querySelector('[data-axw-sr-servicio]'); if (a) a.hidden = marcado(st.zona, 'clase') !== 'servicio'; },
    valores: function (st) {
      var c = marcado(st.zona, 'clase');
      if (c === 'alquiler') return { ok: true, v: { clase: c } };
      return { ok: false, error: c === 'servicio' ? U('sr_servicio_va') : U('sr_elige_alquiler') };
    },
    guarda: function () { return Promise.resolve({ ok: true, sigue: 'flota' }); }
  });

  // ── S41 · Alquiler con unidades: nombre, precios por tramo, seguro por tramo + fianza («fianza O seguro»), unidades ───────────────────
  var TRAMOS_PRECIO = [[1, 'sr_por_dia'], [7, 'sr_por_semana'], [30, 'sr_por_mes']];
  var TRAMOS_SEGURO = [1, 30, 365];   // los de BBM (Dion, §5): el precio de 30 días NO es 30 × el del día
  function txtTramo(d) { return d === 1 ? U('sr_tramo_1') : U('sr_tramo_n', { n: String(d) }); }
  function normMat(s) { return String(s || '').replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ').toUpperCase(); }   // como la base: btrim, espacios colapsados, mayúsculas
  function leeAlquiler(ctx) {
    var pid = (ctx.paso && ctx.paso.ref) || CREADO.flota || null;
    return Promise.all([leeFlota(pid), leeSetup(pid)]).then(function (rs) {
      if (!rs[0].ok) return rs[0];
      if (!rs[1].ok) return rs[1];
      var p = pid ? rs[0].data.productos.filter(function (x) { return x.id === pid; })[0] || null : null;
      return { ok: true, datos: { flota: rs[0].data, setup: rs[1].data, pid: p ? pid : null, p: p } };
    });
  }
  var flota = autonomo({
    clave: 'flota',
    lee: leeAlquiler,
    dibuja: function (zona, st) {
      var d = st.datos, p = d.p, mon = (st.ctx.datos && st.ctx.datos.moneda) || '';
      var g0 = p ? d.setup.garantias.filter(function (x) { return x.producto_id === p.id; })[0] || null : null;
      var seg0 = p ? d.setup.seguro_tramos.filter(function (x) { return x.producto_id === p.id; }) : [];
      campo(zona, 'nombre', U('sr_nombre'), p ? p.nombre : '', { max: 120, ayuda: U('sr_nombre_ayuda') });
      // Precios
      var gp = grupo(zona, U('sr_precios'), U('sr_precios_ayuda')), rp = rejilla(160);
      TRAMOS_PRECIO.forEach(function (t) {
        var x = p ? p.tarifas.filter(function (y) { return Number(y.dias) === t[0]; })[0] : null;
        campo(rp, 'tarifa_' + t[0], U(t[1]), x ? fmt(x.precio) : '', { modo: 'decimal', antes: mon, max: 20 });
      });
      gp.appendChild(rp);
      var otros = p ? p.tarifas.filter(function (y) { return [1, 7, 30].indexOf(Number(y.dias)) < 0; }).map(function (y) { return String(y.dias); }) : [];
      if (otros.length) nota(gp, U('sr_otros_tramos', { d: otros.join(', ') }));
      // Seguro (por tramo) y fianza
      var gs = grupo(zona, U('sr_seguro'), U('sr_seguro_ayuda')), rs = rejilla(160);
      TRAMOS_SEGURO.forEach(function (dd) {
        var x = seg0.filter(function (y) { return Number(y.dias) === dd; })[0];
        campo(rs, 'seguro_' + dd, txtTramo(dd), x ? fmt(x.precio) : '', { modo: 'decimal', antes: mon, max: 20 });
      });
      gs.appendChild(rs);
      var segOtros = seg0.filter(function (y) { return TRAMOS_SEGURO.indexOf(Number(y.dias)) < 0; }).map(function (y) { return String(y.dias); });
      if (segOtros.length) nota(gs, U('sr_otros_tramos', { d: segOtros.join(', ') }));
      interruptor(gs, 'seguro_obligatorio', U('sr_seguro_oblig'), g0 && g0.seguro_obligatorio === true);
      campo(zona, 'fianza', U('sr_fianza'), g0 && g0.fianza != null ? fmt(g0.fianza) : '', { modo: 'decimal', antes: mon, max: 20, ayuda: U('sr_fianza_ayuda') });
      seg(zona, 'fianza_con_seguro', U('sr_fianza_o'), [['no', U('sr_fianza_o_no')], ['si', U('sr_fianza_o_si')]], g0 ? (g0.fianza_con_seguro ? 'si' : 'no') : 'no');
      // Unidades (diseño S41): una tabla «# · Matrícula · Quitar». Las que ya hay, fijas y numeradas; las nuevas, una fila por matrícula.
      // La cuenta de la cabecera sigue a las filas. El color de la unidad del diseño no se pinta: la base no lo guarda.
      var gu = grupo(zona, U('sr_unidades'), U('sr_unidades_ayuda'));
      var ya = p ? p.unidades : [];
      var COLS = 'display:grid;grid-template-columns:2.5rem minmax(0,1fr) 44px;gap:8px;align-items:center';
      var cuenta = el('p', { class: 'font-label-md text-label-md text-on-surface-variant', 'data-axw-sr-cuenta': 'unidades' });
      gu.appendChild(cuenta);
      gu.appendChild(el('div', { class: 'font-label-md text-label-md text-outline', style: COLS, 'aria-hidden': 'true' }, [el('span', { text: '#' }), el('span', { text: U('sr_col_matricula') }), el('span')]));
      ya.forEach(function (u, i) {
        gu.appendChild(el('div', { class: 'font-body-md text-body-md text-on-surface', style: COLS + ';min-height:44px', 'data-axw-sr-ya': String(i + 1) }, [
          el('span', { class: 'text-outline', text: String(i + 1) }), el('span', { style: 'overflow-wrap:anywhere', text: u.identificador }), el('span')]));
      });
      var lista = el('div', { class: 'flex flex-col gap-2', 'data-axw-sr-filas': 'unidades' });
      gu.appendChild(lista);
      // Tras quitar una fila se renumera todo (el número que se ve, la etiqueta y la clave, mat_0…mat_n-1). Sin esto, quitar y añadir dejaba
      // dos filas con la misma clave y, al redibujar tras un fallo, las dos recibían la misma matrícula.
      function renumera() {
        var fs = lista.querySelectorAll('[data-axw-sr-fila]');
        for (var j = 0; j < fs.length; j++) {
          var inp = fs[j].querySelector('input'), lab = fs[j].querySelector('label'), nn = String(ya.length + j + 1);
          fs[j].setAttribute('data-axw-sr-fila', String(j));
          inp.id = 'axw-sr-mat-' + j; inp.setAttribute('data-axw-campo', 'mat_' + j);
          lab.setAttribute('for', inp.id); lab.textContent = U('sr_matricula_n', { n: nn });
          fs[j].querySelector('[data-axw-sr-num]').textContent = nn;
        }
        var t = ya.length + fs.length;
        cuenta.textContent = t === 1 ? U('sr_unidades_1') : U('sr_unidades_n', { n: String(t) });
      }
      function fila() {
        var n = lista.querySelectorAll('[data-axw-sr-fila]').length;
        var tid = d.flota.topes && d.flota.topes.identificador, mx = esObj(tid) && num(tid.max) ? String(num(tid.max)) : null;   // el tope lo da la base (hoy 40)
        var inp = el('input', { type: 'text', maxlength: mx, autocomplete: 'off', class: CLS_IN, style: 'min-width:0' });
        inp.addEventListener('input', function () { var c = inp.selectionStart; inp.value = inp.value.toUpperCase(); try { inp.setSelectionRange(c, c); } catch (e) { /* MUDO A PROPOSITO: navegador sin cursor */ } });
        var quita = el('button', { type: 'button', 'data-axw-sr-accion': 'quitar-unidad', 'aria-label': U('sr_quitar_fila'), class: CLS_BTN2, style: ALTO + ';min-width:44px;padding:0', text: '×' });
        var f = el('div', { style: COLS, 'data-axw-sr-fila': String(n) }, [
          el('span', { class: 'font-body-md text-body-md text-outline', 'data-axw-sr-num': '', 'aria-hidden': 'true' }),
          el('div', { style: 'min-width:0' }, [el('label', { style: OCULTO }), inp]), quita]);
        quita.addEventListener('click', function () { lista.removeChild(f); renumera(); });
        lista.appendChild(f);
        renumera();
        return inp;
      }
      var n0 = st.filas.unidades != null ? st.filas.unidades : (ya.length ? 0 : 1);
      for (var i = 0; i < n0; i++) fila();
      renumera();
      var mas = el('button', { type: 'button', 'data-axw-sr-accion': 'anadir-unidad', class: CLS_BTN2 + ' self-start', style: ALTO, text: '+ ' + U('sr_anadir_unidad') });
      mas.addEventListener('click', function () { fila().focus(); });
      gu.appendChild(mas);
      var pie = el('p', { class: CLS_AYUDA }, [U('sr_mas_alquileres') + ' ']);
      zona.appendChild(pie);
      if (p) campoMotivo(zona, st);
    },
    valores: function (st) {
      var z = st.zona, d = st.datos, p = d.p, v = { tarifas: {}, seguros: {}, nuevas: [] }, er = [];
      v.nombre = val(z, 'nombre');
      if (!v.nombre) er.push(U('sr_falta_nombre'));
      TRAMOS_PRECIO.forEach(function (t) { var r = leeImporte(z, 'tarifa_' + t[0], U(t[1])); if (r.e) er.push(r.e); else v.tarifas[t[0]] = r.v; });
      if (v.tarifas[1] == null && !er.length) er.push(U('sr_falta_dia'));
      // ayuda, no garantía: la base vuelve a comprobar «más días no cuesta menos en total»
      var tt = [1, 7, 30].map(function (k) { return v.tarifas[k]; });
      if ((tt[1] != null && tt[0] != null && tt[1] < tt[0]) || (tt[2] != null && ((tt[1] != null && tt[2] < tt[1]) || (tt[0] != null && tt[2] < tt[0])))) er.push(U('sr_tramo_menos'));
      TRAMOS_SEGURO.forEach(function (dd) { var r = leeImporte(z, 'seguro_' + dd, txtTramo(dd)); if (r.e) er.push(r.e); else v.seguros[dd] = r.v; });
      var sv = TRAMOS_SEGURO.map(function (k) { return v.seguros[k]; }).filter(function (x) { return x != null; });
      for (var i = 1; i < sv.length; i++) if (sv[i] < sv[i - 1]) { er.push(U('sr_tramo_menos')); break; }
      var fz = leeImporte(z, 'fianza', U('sr_fianza')); if (fz.e) er.push(fz.e); else v.fianza = fz.v;
      v.seguro_obligatorio = !!(z.querySelector('[data-axw-campo="seguro_obligatorio"]') || {}).checked;
      v.fianza_con_seguro = marcado(z, 'fianza_con_seguro') === 'si';
      var segurosTras = TRAMOS_SEGURO.some(function (k) { return v.seguros[k] != null; }) || (p && d.setup.seguro_tramos.some(function (x) { return x.producto_id === p.id && TRAMOS_SEGURO.indexOf(Number(x.dias)) < 0; }));
      if (v.seguro_obligatorio && !segurosTras) er.push(U('sr_seguro_sin_precio'));
      var ya = (p ? p.unidades : []).map(function (u) { return normMat(u.identificador); }), vistos = {};
      z.querySelectorAll('[data-axw-sr-fila] input[data-axw-campo^="mat_"]').forEach(function (inp) {
        var m = normMat(inp.value);
        if (!m) return;
        if (ya.indexOf(m) >= 0 || vistos[m]) { er.push(U('sr_matricula_repe', { m: m })); return; }
        var tm = d.flota.topes && d.flota.topes.identificador;
        if (esObj(tm) && ((num(tm.min) != null && m.length < tm.min) || (num(tm.max) != null && m.length > tm.max))) { er.push(U('sr_matricula_largo', { m: m })); return; }
        vistos[m] = 1; v.nuevas.push(m);
      });
      if (!ya.length && !v.nuevas.length) er.push(U('sr_sin_unidades'));
      if (er.length) return { ok: false, error: er.filter(function (x, i2) { return er.indexOf(x) === i2; }).join(' ') };
      v.plan = planAlquiler(st, v);
      var m = motivo(st, !!(p && v.plan.cambia));
      if (m.e) return { ok: false, error: m.e };
      v.motivo = m.v;
      return { ok: true, v: v };
    },
    guarda: function (sb, v, st) {
      var d = st.datos, mon = (st.ctx.datos && st.ctx.datos.moneda) || null;
      var est = { pid: d.pid, antes: d.flota.productos.map(function (x) { return x.id; }) };
      var mot = v.motivo || U(d.p ? 'sr_motivo_anade' : 'sr_motivo_alta');   // añadir a lo que ya existe no es «alta inicial»
      var plan = v.plan, pasos = [];
      function relee() { return leeAlquiler({ paso: { ref: est.pid } }).then(function (r) { if (!r.ok) return r; return { ok: true, datos: r.datos }; }); }
      if (plan.alta) {
        var alta = { nombre: v.nombre, clase: 'alquiler', precio: v.tarifas[1], unidad: 'día', activo: true };
        if (mon) alta.moneda = mon;
        pasos.push({ etq: U('sr_e_producto'), llama: function (s) { return escribe(s, 'producto_guarda', { p_id: null, p_datos: alta }); },
          ok: function (x) { return typeof x === 'string' && !!x; }, tras: function (x) { est.pid = x; CREADO.flota = x; },
          verifica: function (rd) {   // la respuesta se perdió: ¿hay un producto nuevo con ese nombre?
            var n = rd.flota.productos.filter(function (x) { return est.antes.indexOf(x.id) < 0 && x.nombre === v.nombre; })[0];
            if (n) { est.pid = n.id; CREADO.flota = n.id; }
            return !!n;
          } });
      } else if (plan.producto) {
        pasos.push({ etq: U('sr_e_producto'), llama: function (s) { return escribe(s, 'producto_guarda', { p_id: est.pid, p_datos: plan.producto }); },
          verifica: function (rd) { return !!rd.p && rd.p.nombre === plan.producto.nombre; } });
      }
      plan.tarifas.forEach(function (t) {
        pasos.push({ etq: U('sr_e_tarifa', { t: txtTramo(t.dias) }),
          llama: function (s) { return escribe(s, 'producto_tarifa_guarda', { p_producto_id: est.pid, p_dias: t.dias, p_precio: t.precio, p_moneda: mon || t.moneda, p_etiqueta: null, p_motivo: mot, p_esperado: t.esperado }); },
          verifica: function (rd) { return !!rd.p && rd.p.tarifas.some(function (x) { return Number(x.dias) === t.dias && Number(x.precio) === t.precio; }); } });
      });
      if (plan.garantia) {
        pasos.push({ etq: U('sr_e_garantia'),
          llama: function (s) { return escribe(s, 'producto_garantia_guarda', { p_producto: est.pid, p_datos: plan.garantia.datos, p_motivo: mot, p_esperado: plan.garantia.esperado }); },
          ok: function (x) { return esObj(x) && !!x.actualizado_en; },
          verifica: function (rd) {
            var g = rd.setup.garantias.filter(function (x) { return x.producto_id === est.pid; })[0], q = plan.garantia.datos;
            return !!g && num(g.fianza) === q.fianza && g.seguro_obligatorio === q.seguro_obligatorio && g.fianza_con_seguro === q.fianza_con_seguro;
          } });
      }
      plan.seguroBorra.forEach(function (t) {
        pasos.push({ etq: U('sr_e_seguro_borra', { t: txtTramo(t.dias) }),
          llama: function (s) { return escribe(s, 'producto_seguro_borra', { p_id: t.id, p_motivo: mot, p_esperado: t.esperado }); },
          verifica: function (rd) { return !rd.setup.seguro_tramos.some(function (x) { return x.id === t.id; }); } });
      });
      plan.seguros.forEach(function (t) {
        pasos.push({ etq: U('sr_e_seguro', { t: txtTramo(t.dias) }),
          llama: function (s) { return escribe(s, 'producto_seguro_guarda', { p_producto_id: est.pid, p_dias: t.dias, p_precio: t.precio, p_moneda: mon || t.moneda, p_motivo: mot, p_esperado: t.esperado }); },
          verifica: function (rd) { return rd.setup.seguro_tramos.some(function (x) { return x.producto_id === est.pid && Number(x.dias) === t.dias && Number(x.precio) === t.precio; }); } });
      });
      if (v.nuevas.length) {
        pasos.push({ etq: U('sr_e_unidades'),
          llama: function (s) { return escribe(s, 'producto_unidades_alta_lote', { p_producto_id: est.pid, p_identificadores: v.nuevas, p_motivo: mot }); },
          verifica: function (rd) { var ids = rd.p ? rd.p.unidades.map(function (u) { return normMat(u.identificador); }) : []; return v.nuevas.every(function (m) { return ids.indexOf(m) >= 0; }); } });
      }
      if (!pasos.length) return Promise.resolve({ ok: true });
      return cadena(sb, pasos, relee);
    }
  });
  // Lo que hay que mandar: solo lo que cambia respecto de lo leído (un reintento tras un fallo a medias no duplica nada)
  function planAlquiler(st, v) {
    var d = st.datos, p = d.p, plan = { alta: !p, producto: null, tarifas: [], garantia: null, seguros: [], seguroBorra: [], cambia: false };
    // En una edición solo cambia el NOMBRE: producto_flota_datos no devuelve el precio de catálogo (revisor, 12-oct) y los precios de alquiler son los
    // tramos, como en /flota/ (que tampoco toca el precio del producto). El precio de catálogo = el del día solo se pone al dar de alta.
    if (p && v.nombre !== p.nombre) { plan.producto = { nombre: v.nombre }; plan.cambia = true; }
    [1, 7, 30].forEach(function (dd) {
      var nv = v.tarifas[dd]; if (nv == null) return;   // vaciar un tramo no lo borra: eso se hace en Flota y tarifas
      var x = p ? p.tarifas.filter(function (y) { return Number(y.dias) === dd; })[0] : null;
      if (!x || Number(x.precio) !== nv) { plan.tarifas.push({ dias: dd, precio: nv, moneda: x ? x.moneda : null, esperado: x ? x.actualizado_en : null }); if (x) plan.cambia = true; }
    });
    var g0 = p ? d.setup.garantias.filter(function (x) { return x.producto_id === p.id; })[0] || null : null;
    var gq = { fianza: v.fianza, seguro_obligatorio: v.seguro_obligatorio, fianza_con_seguro: v.fianza_con_seguro };
    var tocaGar = g0 ? (num(g0.fianza) !== gq.fianza || g0.seguro_obligatorio !== gq.seguro_obligatorio || g0.fianza_con_seguro !== gq.fianza_con_seguro)
                     : (gq.fianza != null || gq.seguro_obligatorio || TRAMOS_SEGURO.some(function (k) { return v.seguros[k] != null; }));
    if (tocaGar) { plan.garantia = { datos: gq, esperado: g0 ? g0.actualizado_en : null }; if (g0) plan.cambia = true; }
    var s0 = p ? d.setup.seguro_tramos.filter(function (x) { return x.producto_id === p.id; }) : [];
    TRAMOS_SEGURO.forEach(function (dd) {
      var nv = v.seguros[dd], x = s0.filter(function (y) { return Number(y.dias) === dd; })[0];
      if (nv == null && x) { plan.seguroBorra.push({ id: x.id, dias: dd, esperado: x.actualizado_en }); plan.cambia = true; }
      else if (nv != null && (!x || Number(x.precio) !== nv)) { plan.seguros.push({ dias: dd, precio: nv, moneda: x ? x.moneda : null, esperado: x ? x.actualizado_en : null }); if (x) plan.cambia = true; }
    });
    plan.seguros.sort(function (a, b) { return a.dias - b.dias; });
    return plan;
  }

  // ── S43 · Reglas de las reservas ───────────────────────────────────────────────────────────────────────────────────────────────────────
  var BLOQUEOS = [30, 60, 120, 1440];   // el diseño da 30 min / 2 h / 24 h; 60 es el valor por defecto de la base (si no, el control saldría sin marcar)
  var HORIZONTES = [['', 'sr_sin_limite'], [90, 3], [180, 6], [365, 12], [730, 24]];
  var CLAVES_REGLAS = ['bloqueo_minutos', 'dias_min', 'dias_max', 'horizonte_dias', 'max_por_telefono', 'max_activos'];
  var RANGOS = { bloqueo_minutos: [10, 10080], dias_min: [1, 366], dias_max: [1, 366], horizonte_dias: [1, 730], max_por_telefono: [1, 20], max_activos: [1, 500] };
  var ETQ_REGLA = { dias_min: 'sr_dias_min', dias_max: 'sr_dias_max', max_por_telefono: 'sr_max_tel', max_activos: 'sr_max_act' };
  function txtMinutos(m) { return m % 60 ? U('sr_min_n', { n: String(m) }) : (m === 60 ? U('sr_h_1') : U('sr_h_n', { n: String(m / 60) })); }
  function efectiva(d, k) { return d.reglas[k] != null ? num(d.reglas[k]) : (d.reglas_defecto[k] != null ? num(d.reglas_defecto[k]) : null); }
  function stepper(caja, k, etiqueta, valor, rango, dias) {
    var id = 'axw-sr-' + k;
    var inp = el('input', { id: id, type: 'number', inputmode: 'numeric', 'data-axw-campo': k, min: String(rango[0]), max: String(rango[1]), class: CLS_IN, style: 'width:6rem;text-align:center' });
    if (valor != null) inp.value = String(valor);
    function paso(dlt) { var n = Number(inp.value) || 0; n = Math.min(rango[1], Math.max(rango[0], n + dlt)); inp.value = String(n); inp.dispatchEvent(new Event('change', { bubbles: true })); }
    var menos = el('button', { type: 'button', 'data-axw-sr-accion': 'menos-' + k, 'aria-label': U(dias ? 'sr_menos' : 'sr_menos_uno'), class: CLS_BTN2, style: ALTO + ';min-width:44px', text: '−' });
    var mas = el('button', { type: 'button', 'data-axw-sr-accion': 'mas-' + k, 'aria-label': U(dias ? 'sr_mas' : 'sr_mas_uno'), class: CLS_BTN2, style: ALTO + ';min-width:44px', text: '+' });
    menos.addEventListener('click', function () { paso(-1); }); mas.addEventListener('click', function () { paso(1); });
    caja.appendChild(el('div', { class: 'flex flex-col gap-1.5 min-w-0', 'data-axw-fila': k }, [el('label', { for: id, class: CLS_ETQ, text: etiqueta }),
      el('div', { class: 'flex items-center gap-2', role: 'group' }, [menos, inp, mas])]));
    return inp;
  }
  var reglas = autonomo({
    clave: 'reglas_reserva',
    lee: function () { return leeSetup(null).then(function (r) { return r.ok ? { ok: true, datos: r.data } : r; }); },
    dibuja: function (zona, st) {
      var d = st.datos, guardadas = CLAVES_REGLAS.some(function (k) { return d.reglas[k] != null; });
      if (!guardadas) nota(zona, U('sr_por_defecto'));
      var b = efectiva(d, 'bloqueo_minutos'), ops = BLOQUEOS.slice();
      if (b != null && ops.indexOf(b) < 0) { ops.push(b); ops.sort(function (x, y) { return x - y; }); }
      seg(zona, 'bloqueo_minutos', U('sr_bloqueo'), ops.map(function (m) { return [String(m), txtMinutos(m)]; }), b);
      nota(zona, U('sr_bloqueo_ayuda'));
      var r2 = rejilla(200);
      stepper(r2, 'dias_min', U('sr_dias_min'), efectiva(d, 'dias_min'), RANGOS.dias_min, true);
      stepper(r2, 'dias_max', U('sr_dias_max'), efectiva(d, 'dias_max'), RANGOS.dias_max, true);
      zona.appendChild(r2);
      var hz = efectiva(d, 'horizonte_dias'), sel = el('select', { id: 'axw-sr-horizonte_dias', 'data-axw-campo': 'horizonte_dias', class: CLS_IN });
      var hops = HORIZONTES.slice();
      if (hz != null && !hops.some(function (o) { return o[0] === hz; })) hops.push([hz, null]);
      hops.forEach(function (o) {
        sel.appendChild(el('option', { value: String(o[0]), text: o[0] === '' ? U(o[1]) : (o[1] ? U('sr_meses_n', { n: String(o[1]) }) : U('sr_dias_antes', { n: String(o[0]) })) }));
      });
      sel.value = hz == null ? '' : String(hz);
      zona.appendChild(el('div', { class: 'flex flex-col gap-1.5 min-w-0', 'data-axw-fila': 'horizonte_dias', style: 'max-width:22rem' }, [el('label', { for: sel.id, class: CLS_ETQ, text: U('sr_horizonte') }), sel]));
      var det = el('details', { class: 'rounded-xl border border-outline-variant px-4 py-3', 'data-axw-sr-bot': '1' }, [el('summary', { class: CLS_ETQ, style: 'cursor:pointer;min-height:24px', text: U('sr_bot') })]);
      var r3 = rejilla(200); r3.style.marginTop = '12px';
      stepper(r3, 'max_por_telefono', U('sr_max_tel'), efectiva(d, 'max_por_telefono'), RANGOS.max_por_telefono);
      campo(r3, 'max_activos', U('sr_max_act'), fmt(efectiva(d, 'max_activos')), { tipo: 'number', modo: 'numeric', min: '1', maxv: '500' });
      det.appendChild(r3); zona.appendChild(det);
      var ej = el('p', { class: 'rounded-xl bg-surface-container-low px-4 py-3 font-body-sm text-body-sm text-on-surface', 'data-axw-sr-ejemplo': '1' });
      zona.appendChild(ej);
      function refresca() {
        var m = Number(marcado(zona, 'bloqueo_minutos')) || 0, t = 600 + m, dd = Math.floor(t / 1440), hm = t % 1440;
        var h = ('0' + Math.floor(hm / 60)).slice(-2) + ':' + ('0' + (hm % 60)).slice(-2);
        ej.textContent = !m ? '' : dd === 0 ? U('sr_ejemplo', { h: h }) : (dd === 1 ? U('sr_ejemplo_dia', { h: h }) : U('sr_ejemplo_dias', { n: String(dd) }));
        ej.hidden = !m;
      }
      zona.addEventListener('change', refresca); refresca();
      st.refrescaEj = refresca;
      if (guardadas) campoMotivo(zona, st);
    },
    refresca: function (st) { if (st.refrescaEj) st.refrescaEj(); },
    valores: function (st) {
      var z = st.zona, d = st.datos, v = {}, er = [];
      var b = marcado(z, 'bloqueo_minutos');
      if (!b) er.push(U('elige'));
      v.bloqueo_minutos = Number(b);
      ['dias_min', 'dias_max', 'max_por_telefono', 'max_activos'].forEach(function (k) {
        var raw = val(z, k), n = Number(raw);
        if (!/^\d+$/.test(raw) || n < RANGOS[k][0] || n > RANGOS[k][1]) er.push(U(ETQ_REGLA[k]) + ': ' + U('sr_rango', { a: String(RANGOS[k][0]), b: String(RANGOS[k][1]) }));
        else v[k] = n;
      });
      if (v.dias_min != null && v.dias_max != null && v.dias_max < v.dias_min) er.push(U('sr_max_menor'));
      var hz = val(z, 'horizonte_dias'); v.horizonte_dias = hz === '' ? null : Number(hz);
      if (er.length) return { ok: false, error: er.join(' ').replace(/\s+/g, ' ').trim() };
      // se mandan las tres que dan el paso por hecho, el horizonte, y los límites del bot solo si cambian
      var datos = { bloqueo_minutos: v.bloqueo_minutos, dias_min: v.dias_min, dias_max: v.dias_max, horizonte_dias: v.horizonte_dias };
      ['max_por_telefono', 'max_activos'].forEach(function (k) { if (v[k] !== efectiva(d, k)) datos[k] = v[k]; });
      var cambiaGuardado = Object.keys(datos).some(function (k) { return d.reglas[k] != null && num(d.reglas[k]) !== datos[k]; });
      var m = motivo(st, cambiaGuardado);
      if (m.e) return { ok: false, error: m.e };
      return { ok: true, v: { datos: datos, motivo: cambiaGuardado ? m.v : null } };
    },
    guarda: function (sb, v) {
      return cadena(sb, [{ etq: S.texto('paso', 'reglas_reserva', 0),
        llama: function (s) { return escribe(s, 'reservas_reglas_guarda', { p_datos: v.datos, p_motivo: v.motivo }); },
        ok: function (x) { return esObj(x) && esObj(x.reglas); },
        verifica: function (rd) { return Object.keys(v.datos).every(function (k) { return (rd.reglas[k] == null ? null : num(rd.reglas[k])) === v.datos[k]; }); } }],
        function () { return leeSetup(null).then(function (r) { return r.ok ? { ok: true, datos: r.data } : r; }); });
    }
  });

  // ── S44 · Lo que ya está alquilado (obligatorio): qué unidad y hasta qué día, o «no hay ninguna». Nunca pide precio. ────────────────────
  var previos = autonomo({
    clave: 'alquileres_previos',
    lee: function () {
      return Promise.all([leeFlota(null), leeSetup(null)]).then(function (rs) {
        if (!rs[0].ok) return rs[0];
        if (!rs[1].ok) return rs[1];
        var unidades = [];
        rs[0].data.productos.forEach(function (p) { p.unidades.forEach(function (u) { if (u && u.estado !== 'baja') unidades.push({ id: u.id, identificador: u.identificador, estado: u.estado, producto: p.nombre }); }); });
        return { ok: true, datos: { unidades: unidades, setup: rs[1].data } };
      });
    },
    dibuja: function (zona, st) {
      var d = st.datos, hoy = hoyISO(0), prev = d.setup.previos;
      if (prev.length) {
        var gy = grupo(zona, U('sr_ya_apuntadas'));
        var ul = el('ul', { class: 'flex flex-col rounded-xl border border-outline-variant', role: 'list' });
        prev.forEach(function (x, i) {
          var li = el('li', { class: 'flex flex-col gap-2 px-4 py-3' + (i ? ' border-t border-outline-variant' : ''), 'data-axw-sr-previo': String(x.id) }, [
            el('div', { class: 'flex flex-wrap items-center gap-x-4 gap-y-1' }, [
              el('span', { class: CLS_ETQ, style: 'font-weight:600', text: String(x.identificador || '—') }),
              el('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: String(x.desde || '') + ' → ' + String(x.hasta || '') }),
              x.cliente_ref ? el('span', { class: CLS_AYUDA, text: String(x.cliente_ref) }) : null])]);
          var bq = el('button', { type: 'button', 'data-axw-sr-accion': 'quitar-previo', class: CLS_BTN2 + ' self-start', style: ALTO, text: U('sr_quitar_previo') });
          bq.addEventListener('click', function () { abreQuitar(li, x, st, bq); });
          li.appendChild(bq);
          ul.appendChild(li);
        });
        gy.appendChild(ul);
      }
      if (!d.unidades.length) { nota(zona, U('sr_ninguna_libre'), 'error'); }
      seg(zona, 'fuera', U(prev.length ? 'sr_fuera_mas' : 'sr_fuera_pregunta'), [['si', U('sr_si')], ['no', U(prev.length ? 'sr_no_mas' : 'sr_no_tienda')]], '');
      var caja = el('div', { class: 'flex flex-col gap-3', 'data-axw-sr-caja': 'filas', hidden: true });
      var lista = el('div', { class: 'flex flex-col gap-3', 'data-axw-sr-filas': 'previos' });
      caja.appendChild(lista);
      function fila() {
        var n = lista.querySelectorAll('[data-axw-sr-fila]').length;
        var f = el('div', { class: 'flex flex-col gap-3 rounded-xl border border-outline-variant', style: 'padding:12px', 'data-axw-sr-fila': String(n) });   // p-3 no está compilado
        var r = rejilla(150);
        var sid = 'axw-sr-pu-' + n, sel = el('select', { id: sid, 'data-axw-campo': 'pu_' + n, class: CLS_IN });
        sel.appendChild(el('option', { value: '', text: U('elige') }));
        d.unidades.forEach(function (u) { sel.appendChild(el('option', { value: u.id, text: u.identificador + (u.producto ? ' · ' + u.producto : '') })); });
        r.appendChild(el('div', { class: 'flex flex-col gap-1.5 min-w-0' }, [el('label', { for: sid, class: CLS_ETQ, text: U('sr_unidad') }), sel]));
        campo(r, 'pd_' + n, U('sr_desde'), '', { tipo: 'date', maxv: hoy, min: hoyISO(-366) });
        campo(r, 'ph_' + n, U('sr_hasta'), '', { tipo: 'date', min: hoyISO(1) });
        campo(r, 'pc_' + n, U('sr_cliente'), '', { max: 120, ph: U('sr_cliente_ph') });
        f.appendChild(r);
        var q = el('button', { type: 'button', 'data-axw-sr-accion': 'quitar-fila', class: CLS_BTN2 + ' self-start', style: ALTO, text: U('sr_quitar_fila') });
        q.addEventListener('click', function () { lista.removeChild(f); tiles(); });
        f.appendChild(q);
        lista.appendChild(f);
        return sel;
      }
      var n0 = st.filas.previos != null ? st.filas.previos : 1;
      for (var i = 0; i < n0; i++) fila();
      var mas = el('button', { type: 'button', 'data-axw-sr-accion': 'anadir-previo', class: CLS_BTN2 + ' self-start', style: ALTO, text: '+ ' + U('sr_anadir_alquiler') });
      mas.addEventListener('click', function () { fila().focus(); tiles(); });
      caja.appendChild(mas);
      zona.appendChild(caja);
      var tl = el('div', { style: 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px', 'aria-live': 'polite', 'data-axw-sr-tiles': '1' });
      zona.appendChild(tl);
      nota(zona, U('sr_fuera_nota'));
      // Fuera ahora / Libres hoy / Próxima vuelta: lo cuenta la pantalla con lo leído y lo tecleado (sin RPC propia, contrato S44)
      function tiles() {
        var fuera = {}, vuelta = null;
        prev.forEach(function (x) { if (x.unidad_id && String(x.desde) <= hoy && String(x.hasta) > hoy) { fuera[x.unidad_id] = 1; if (!vuelta || String(x.hasta) < vuelta.f) vuelta = { f: String(x.hasta), m: String(x.identificador || '') }; } });
        if (marcado(zona, 'fuera') === 'si') lista.querySelectorAll('[data-axw-sr-fila]').forEach(function (f) {
          var k = f.getAttribute('data-axw-sr-fila'), u = val(f, 'pu_' + k), h = val(f, 'ph_' + k);
          if (u) { fuera[u] = 1; if (h && h > hoy && (!vuelta || h < vuelta.f)) { var uu = d.unidades.filter(function (x) { return x.id === u; })[0]; vuelta = { f: h, m: uu ? uu.identificador : '' }; } }
        });
        var nFuera = Object.keys(fuera).length, libres = d.unidades.filter(function (u) { return !fuera[u.id] && u.estado === 'disponible'; }).length;
        vacia(tl);
        [[U('sr_tile_fuera'), String(nFuera), null], [U('sr_tile_libres'), String(libres), null], [U('sr_tile_vuelta'), vuelta ? diaMes(vuelta.f) : '—', vuelta ? vuelta.m : null]].forEach(function (t) {
          tl.appendChild(el('div', { class: 'flex flex-col gap-1 rounded-xl bg-surface-container-low px-3 py-3 min-w-0' }, [
            el('span', { class: 'font-label-md text-[11px] uppercase text-outline', style: 'letter-spacing:.08em', text: t[0] }),
            el('span', { class: 'text-deep-lagoon', style: 'font-size:22px;line-height:1.2;overflow-wrap:anywhere', text: t[1] }),
            t[2] ? el('span', { class: CLS_AYUDA, style: 'overflow-wrap:anywhere', text: t[2] }) : null]));
        });
      }
      function refresca() { caja.hidden = marcado(zona, 'fuera') !== 'si'; tiles(); }
      zona.addEventListener('change', refresca); zona.addEventListener('input', tiles); refresca();
      st.refrescaPrev = refresca;
    },
    refresca: function (st) { if (st.refrescaPrev) st.refrescaPrev(); },
    valores: function (st) {
      var z = st.zona, d = st.datos, hoy = hoyISO(0), min = hoyISO(-366), f = marcado(z, 'fuera');
      if (!f) return { ok: false, error: U('sr_elige_si_no') };
      if (f === 'no') return { ok: true, v: { lista: [] } };
      var lista = [], er = [], usadas = {};
      d.setup.previos.forEach(function (x) { if (x.unidad_id) usadas[x.unidad_id] = String(x.identificador || ''); });
      z.querySelectorAll('[data-axw-sr-filas="previos"] [data-axw-sr-fila]').forEach(function (fl) {
        var k = fl.getAttribute('data-axw-sr-fila');
        var u = val(fl, 'pu_' + k), de = val(fl, 'pd_' + k), ha = val(fl, 'ph_' + k), c = val(fl, 'pc_' + k);
        if (!u && !de && !ha && !c) return;   // fila vacía: no cuenta
        if (!u) { er.push(U('sr_fila_unidad')); return; }
        var uu = d.unidades.filter(function (x) { return x.id === u; })[0], mat = uu ? uu.identificador : u;
        if (usadas[u] != null) { er.push(U('sr_fila_repe', { m: mat })); return; }
        usadas[u] = mat;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || de > hoy || de < min) er.push(U('sr_fila_desde'));
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ha) || ha <= hoy) er.push(U('sr_fila_hasta'));
        lista.push({ unidad_id: u, desde: de, hasta: ha, cliente_ref: c || null });
      });
      if (er.length) return { ok: false, error: er.filter(function (x, i) { return er.indexOf(x) === i; }).join(' ') };
      if (!lista.length) return { ok: false, error: U('sr_sin_filas') };
      return { ok: true, v: { lista: lista } };
    },
    guarda: function (sb, v, st) {
      var antes = st.datos.setup.previos_revisado ? String(st.datos.setup.previos_revisado.en) : null;
      return cadena(sb, [{ etq: S.texto('paso', 'alquileres_previos', 0),
        llama: function (s) { return escribe(s, 'reservas_previas_guarda', { p_lista: v.lista, p_motivo: U('sr_motivo_previo') }); },
        ok: function (x) { return esObj(x) && esObj(x.revisado) && Array.isArray(x.creadas); },
        verifica: function (rd) {
          var r = rd.previos_revisado;
          if (!r || String(r.en) === antes) return false;
          return v.lista.every(function (q) { return rd.previos.some(function (x) { return x.unidad_id === q.unidad_id && String(x.hasta) === q.hasta; }); });
        } }],
        function () { return leeSetup(null).then(function (r) { return r.ok ? { ok: true, datos: r.data } : r; }); });
    }
  });
  // Quitar un alquiler previo apuntado por error: con su motivo, y se vuelve a leer el paso
  function abreQuitar(li, x, st, boton) {
    if (li.querySelector('[data-axw-sr-quita]')) return;
    boton.hidden = true;
    var caja = el('div', { class: 'flex flex-col gap-2', 'data-axw-sr-quita': String(x.id) });
    var inp = el('input', { id: 'axw-sr-qm-' + x.id, type: 'text', maxlength: '200', autocomplete: 'off', 'data-axw-sr': 'quita-motivo', class: CLS_IN });
    var err = el('p', { role: 'alert', class: 'font-body-sm text-body-sm text-error' });
    var ok = el('button', { type: 'button', 'data-axw-sr-accion': 'confirma-quitar', class: CLS_BTN2, style: ALTO, text: U('sr_quitar') });
    var no = el('button', { type: 'button', 'data-axw-sr-accion': 'cancela-quitar', class: CLS_BTN2, style: ALTO, text: U('atras') });
    caja.appendChild(el('label', { for: inp.id, class: CLS_ETQ, text: U('sr_quitar_motivo') })); caja.appendChild(inp);
    caja.appendChild(el('span', { class: CLS_AYUDA, text: U('sr_quitar_nota') }));
    caja.appendChild(el('div', { class: 'flex flex-wrap gap-2' }, [ok, no])); caja.appendChild(err);
    li.appendChild(caja);
    no.addEventListener('click', function () { li.removeChild(caja); boton.hidden = false; });
    ok.addEventListener('click', function () {
      var m = inp.value.trim();
      if (letras(m) < MOTIVO_MIN) { err.textContent = U('motivo_corto'); inp.focus(); return; }
      ok.disabled = true; no.disabled = true;
      cliente().then(function (sb) {
        if (!sb) return { ok: false, error: { code: '42501' } };
        return escribe(sb, 'reserva_previa_quita', { p_id: x.id, p_motivo: m });
      }).then(function (r) {
        if (r.ok || r.perdida) { st.recarga(); return; }   // perdida: se relee y lo que hay es lo que manda (quitar dos veces lo rechaza la base)
        ok.disabled = false; no.disabled = false;
        err.textContent = U('no_se_guardo', { e: S.explica(r.error, true).texto });
      });
    });
    inp.focus();
  }

  // ── S45 · Entrega a domicilio (sobre /entrega/, 138500): la lógica de orden y versión es la de entrega.html ───────────────────────────
  function canonEntrega(d) {
    var a = d.ajustes, t = d.tarifa;
    return { sede_nombre: String(a.sede_nombre == null ? '' : a.sede_nombre), sede_lat: num(a.sede_lat), sede_lng: num(a.sede_lng),
      moneda: t && t.moneda ? String(t.moneda).toUpperCase() : '', precio_km: t ? num(t.precio_km) : null, km_gratis: t ? (num(t.km_gratis) || 0) : 0, minimo: t ? (num(t.minimo) || 0) : 0,
      km_max: num(a.km_max), cobra_recogida: a.cobra_recogida === true ? true : (a.cobra_recogida === false ? false : null), activa: a.activa === true, tarifa_id: t ? t.id : null };
  }
  function parseCoord(s) {
    var t = String(s || '').trim();
    if (!t) return { vacio: true };
    var m = /^(-?\d{1,3}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)$/.exec(t) || /^(-?\d{1,3}(?:\.\d+)?)\s+(-?\d{1,3}(?:\.\d+)?)$/.exec(t);
    if (!m) return { e: U('sr_coord_mal') };
    var lat = Number(m[1]), lng = Number(m[2]);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { e: U('sr_coord_mal') };
    return { lat: lat, lng: lng };
  }
  var entrega = autonomo({
    clave: 'entrega',
    lee: function () {
      return lee('entrega_datos', {}).then(function (r) {
        if (!r.ok) return r;
        var d = r.data;
        if (esObj(d) && d.ajustes == null && d.version == null) return { ok: true, datos: { noPreparada: true } };
        if (!formaEntrega(d)) return { ok: false, error: { code: 'axw_forma' } };
        return { ok: true, datos: { d: d, c: canonEntrega(d) } };
      });
    },
    dibuja: function (zona, st) {
      if (st.datos.noPreparada) { nota(zona, U('sr_no_preparada'), 'error'); return; }
      var c = st.datos.c, mon = (st.ctx.datos && st.ctx.datos.moneda) || c.moneda || '';
      // P5 (owner, 15-oct-2026: «mostrando datos poco a poco»; Diseño consultado): primero solo el interruptor; los tres bloques salen al encenderlo
      // o si ya hay algo guardado. Todos los campos siguen en el DOM (mismos data-axw-campo, mismo guardado); con algo escrito no se esconden.
      estiloInterruptor();
      var sw = interruptor(zona, 'activa', U('sr_ofrecer'), c.activa);
      sw.setAttribute('role', 'switch'); sw.classList.add('axw-sr-switch');
      var ayudaSw = c.activa ? null : nota(zona, U('sr_ofrecer_ayuda'));
      if (c.activa) nota(zona, U('sr_activa_nota'));
      var bloques = el('div', { id: 'axw-sr-entrega-bloques', class: 'flex flex-col gap-6 min-w-0', 'data-axw-sr-bloques': 'entrega' });
      sw.setAttribute('aria-controls', bloques.id);
      zona.appendChild(bloques);
      function bloque(texto) { var b = el('section', { class: 'flex flex-col gap-4 min-w-0' }, [el('h3', { class: 'font-label-md text-[11px] tracking-[0.14em] uppercase text-outline', text: texto })]); bloques.appendChild(b); return b; }
      var b1 = bloque(U('sr_b_donde')), b2 = bloque(U('sr_b_cuanto')), b3 = bloque(U('sr_b_final'));
      var r1 = rejilla(220);
      campo(r1, 'sede_nombre', U('sr_sede_nombre'), c.sede_nombre, { max: 120, soloLee: c.activa });
      campo(r1, 'sede_coord', U('sr_sede_coord'), c.sede_lat == null ? '' : c.sede_lat + ', ' + c.sede_lng, { max: 60, soloLee: c.activa, ayuda: c.activa ? U('sr_sede_fija') : U('sr_sede_coord_ayuda') });
      b1.appendChild(r1);
      var r2 = rejilla(160);
      campo(r2, 'precio_km', U('sr_precio_km'), fmt(c.precio_km), { modo: 'decimal', antes: mon, max: 20 });
      campo(r2, 'km_gratis', U('sr_gratis'), c.precio_km == null && !c.km_gratis ? '' : fmt(c.km_gratis), { modo: 'decimal', despues: 'km', max: 8 });
      campo(r2, 'km_max', U('sr_km_max'), fmt(c.km_max), { modo: 'decimal', despues: 'km', max: 8 });
      campo(r2, 'minimo', U('sr_minimo'), c.precio_km == null && !c.minimo ? '' : fmt(c.minimo), { modo: 'decimal', antes: mon, max: 20, ayuda: U('sr_minimo_ayuda') });
      b2.appendChild(r2);
      // Ilustración (S45): la tienda, la zona gratis y la de pago. Sin escala ni precio de ejemplo: el importe lo calcula la base, no la pantalla.
      var NS = 'http://www.w3.org/2000/svg';
      function svg(tag, a) { var e = document.createElementNS(NS, tag); Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); return e; }
      var lado = st.ctx.lado, vieja = lado && lado.querySelector('[data-axw-lado-de="entrega"]');
      if (vieja) vieja.parentNode.removeChild(vieja);   // al releer, una sola ilustración
      var fig = el('figure', { class: 'flex flex-col gap-2 text-deep-lagoon', style: 'margin:0', 'data-axw-sr-figura': '1', 'data-axw-lado-de': 'entrega' });
      var s = svg('svg', { viewBox: '0 0 680 200', role: 'img', 'aria-label': U('sr_fig_alt'), style: 'width:100%;height:auto;display:block' });
      s.appendChild(svg('circle', { cx: '340', cy: '100', r: '92', fill: 'currentColor', 'fill-opacity': '0.06', stroke: 'currentColor', 'stroke-opacity': '0.4', 'stroke-dasharray': '6 6' }));
      s.appendChild(svg('circle', { cx: '340', cy: '100', r: '30', fill: 'currentColor', 'fill-opacity': '0.16' }));
      s.appendChild(svg('circle', { cx: '340', cy: '100', r: '7', fill: 'currentColor' }));
      var tx = svg('text', { x: '340', y: '150', 'text-anchor': 'middle', 'font-size': '14', fill: 'currentColor' }); tx.textContent = U('sr_fig_tienda'); s.appendChild(tx);
      fig.appendChild(s);
      var cap = el('figcaption', { class: 'flex flex-wrap gap-y-1 font-body-sm text-body-sm text-on-surface-variant', style: 'column-gap:20px' });   // gap-x-5 no está compilado
      fig.appendChild(cap); (lado || b2).appendChild(fig);   // P5: en el asistente, de lado; en Ajustes, con su precio
      function leyenda() {
        var pk = importe(val(zona, 'precio_km')), kg = val(zona, 'km_gratis') || '0', km = val(zona, 'km_max') || '—', mi = importe(val(zona, 'minimo'));
        vacia(cap);
        cap.appendChild(el('span', { text: U('sr_fig_gratis', { k: kg }) }));
        cap.appendChild(el('span', { text: U('sr_fig_pago', { p: precioTxt(pk, mon), k: km }) }));
        if (mi) cap.appendChild(el('span', { text: U('sr_fig_minimo', { p: precioTxt(mi, mon) }) }));
        cap.appendChild(el('span', { class: 'text-outline', text: U('sr_fig_nota') }));
      }
      zona.addEventListener('input', leyenda); leyenda();
      st.refrescaFig = leyenda;
      seg(b3, 'cobra_recogida', U('sr_recogida'), [['si', U('sr_recogida_si')], ['no', U('sr_recogida_no')]], c.cobra_recogida === true ? 'si' : (c.cobra_recogida === false ? 'no' : ''));
      bloques.appendChild(el('a', { href: RAIZ + 'entrega/', class: 'font-label-md text-label-md text-deep-lagoon underline self-start', style: 'min-height:24px', 'data-axw-sr-accion': 'abrir-entrega', text: U('sr_mas_entrega') }));
      if (c.sede_nombre || c.precio_km != null || c.activa) campoMotivo(zona, st);
      // Abierto por lo GUARDADO (km_max no cuenta: la base lo trae a 60 por defecto) o por lo TECLEADO respecto a lo pintado (el borrador restaurado cuenta)
      var guardado = c.activa || !!c.sede_nombre || c.sede_lat != null || c.tarifa_id != null || c.cobra_recogida != null;
      var campos = [].slice.call(bloques.querySelectorAll('input'));
      var inicial = campos.map(function (i) { return (i.type === 'radio' || i.type === 'checkbox') ? i.checked : i.value; });
      function tecleado() { return campos.some(function (i, k) { return ((i.type === 'radio' || i.type === 'checkbox') ? i.checked : i.value) !== inicial[k]; }); }
      st.aplicaEntrega = function (porUsuario) {
        var abierto = sw.checked || guardado || tecleado();
        if (st.ctx.falta) st.ctx.falta.style.display = (sw.checked || c.activa) ? '' : 'none';   // apagada, «Falta: entrega encendida…» no dice nada útil
        bloques.style.display = abierto ? '' : 'none'; sw.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        if (ayudaSw) ayudaSw.hidden = abierto;
        fig.style.display = abierto ? '' : 'none';   // sin tienda ni precio, la ilustración solo diría «hasta 0 km»
        if (porUsuario && sw.checked) { var f = bloques.querySelector('input:not([readonly])'); if (f) f.focus(); }   // el foco, solo si lo enciende la persona
      };
      sw.addEventListener('change', function () { st.aplicaEntrega(true); });
      st.aplicaEntrega(false);
    },
    refresca: function (st) { if (st.refrescaFig) st.refrescaFig(); if (st.aplicaEntrega) st.aplicaEntrega(false); },
    valores: function (st) {
      if (st.datos.noPreparada) return { ok: false, error: U('sr_no_preparada') };
      var z = st.zona, c = st.datos.c, v = {}, er = [];
      v.activa = !!(z.querySelector('[data-axw-campo="activa"]') || {}).checked;
      if (c.activa) { v.sede_nombre = c.sede_nombre; v.sede_lat = c.sede_lat; v.sede_lng = c.sede_lng; }
      else {
        v.sede_nombre = val(z, 'sede_nombre');
        var co = parseCoord(val(z, 'sede_coord'));
        if (co.e) er.push(co.e);
        v.sede_lat = co.vacio ? null : co.lat; v.sede_lng = co.vacio ? null : co.lng;
      }
      var pk = leeImporte(z, 'precio_km', U('sr_precio_km')); if (pk.e) er.push(pk.e); else v.precio_km = pk.v;
      var mi = leeImporte(z, 'minimo', U('sr_minimo')); if (mi.e) er.push(mi.e); else v.minimo = mi.v == null ? 0 : mi.v;
      var kg = leeKm(z, 'km_gratis', U('sr_gratis')); if (kg.e) er.push(kg.e); else v.km_gratis = kg.v == null ? 0 : kg.v;
      var kx = leeKm(z, 'km_max', U('sr_km_max')); if (kx.e) er.push(kx.e); else v.km_max = kx.v;
      var rc = marcado(z, 'cobra_recogida'); v.cobra_recogida = rc === 'si' ? true : (rc === 'no' ? false : null);
      if (!er.length && v.km_max != null && v.km_gratis >= v.km_max && (v.km_gratis > 0)) er.push(U('sr_gratis_mayor'));
      if (!er.length && v.activa && (!v.sede_nombre || v.sede_lat == null || v.precio_km == null || v.km_max == null || v.cobra_recogida == null)) er.push(U('sr_activa_falta'));
      if (er.length) return { ok: false, error: er.join(' ') };
      v.plan = planEntrega(c, v, (st.ctx.datos && st.ctx.datos.moneda) || c.moneda);
      var hay = v.plan.pasos.length > 0;
      var m = motivo(st, hay && !!st.motivo);
      if (m.e) return { ok: false, error: m.e };
      v.motivo = m.v;
      return { ok: true, v: v };
    },
    guarda: function (sb, v, st) {
      var d = st.datos.d, est = { version: d.version, tarifa_id: st.datos.c.tarifa_id };
      var mot = v.motivo || U('sr_motivo_alta');
      function relee() { return leeEntrega().then(function (r) { return r.ok ? { ok: true, datos: canonEntrega(r.data), version: r.data.version } : r; }); }
      var pasos = v.plan.pasos.map(function (p) {
        if (p.tipo === 'tarifa') return { etq: U('sr_e_tarifa_km'),
          llama: function (s) { return escribe(s, 'entrega_tarifa_guarda', { p_datos: p.datos, p_motivo: mot, p_tarifa_id: est.tarifa_id }); },
          ok: function (x) { return typeof x === 'string' && !!x; }, tras: function (x) { est.tarifa_id = x; },
          verifica: function (rc) { return rc.precio_km === p.datos.precio_km && rc.km_gratis === p.datos.km_gratis && rc.minimo === p.datos.minimo; },
          trasVerifica: function (rc) { est.tarifa_id = rc.tarifa_id; } };
        return { etq: U(p.etq),
          llama: function (s) { return escribe(s, 'entrega_ajustes_guarda', { p_datos: p.datos, p_motivo: mot, p_version: est.version }); },
          ok: function (x) { return esObj(x) && typeof x.version === 'number'; }, tras: function (x) { est.version = x.version; },
          verifica: function (rc) { return Object.keys(p.datos).every(function (k) { return rc[k] === p.datos[k]; }); } };
      });
      if (!pasos.length) return Promise.resolve({ ok: true });
      // tras releer por una respuesta perdida, la versión que manda es la releída
      return cadena(sb, pasos, function () { return relee().then(function (r) { if (r.ok) est.version = r.version; return r; }); });
    }
  });
  /* Orden (el de entrega.html y Backend, 12-oct): apagar va PRIMERO (con la entrega encendida la base no deja cambiar la tienda); si km_max sube,
     los ajustes antes que la tarifa (los km gratis se validan contra el km_max vigente); encender va al FINAL, cuando la tarifa ya está guardada. */
  function planEntrega(c, v, mon) {
    var a = {}, pasos = [];
    if (!c.activa) {
      if (v.sede_nombre && v.sede_nombre !== c.sede_nombre) a.sede_nombre = v.sede_nombre;
      if (v.sede_lat != null && (v.sede_lat !== c.sede_lat || v.sede_lng !== c.sede_lng)) { a.sede_lat = v.sede_lat; a.sede_lng = v.sede_lng; }
    }
    if (v.km_max != null && v.km_max !== c.km_max) a.km_max = v.km_max;
    if (v.cobra_recogida != null && v.cobra_recogida !== c.cobra_recogida) a.cobra_recogida = v.cobra_recogida;
    var tarifa = null;
    if (v.precio_km != null && (v.precio_km !== c.precio_km || v.km_gratis !== c.km_gratis || v.minimo !== c.minimo || (mon && c.moneda && mon !== c.moneda))) {
      tarifa = { moneda: mon || c.moneda, precio_km: v.precio_km, km_gratis: v.km_gratis, minimo: v.minimo };
    }
    if (c.activa && !v.activa) pasos.push({ tipo: 'ajustes', etq: 'sr_e_apaga', datos: { activa: false } });
    var pa = Object.keys(a).length ? { tipo: 'ajustes', etq: 'sr_e_ajustes', datos: a } : null, pt = tarifa ? { tipo: 'tarifa', datos: tarifa } : null;
    var subeKm = a.km_max !== undefined && (c.km_max == null || a.km_max > c.km_max);
    (subeKm ? [pa, pt] : [pt, pa]).forEach(function (x) { if (x) pasos.push(x); });
    if (!c.activa && v.activa) pasos.push({ tipo: 'ajustes', etq: 'sr_e_enciende', datos: { activa: true } });
    return { pasos: pasos };
  }

  PS.registra('clase', clase);
  PS.registra('flota', flota);
  PS.registra('reglas_reserva', reglas);
  PS.registra('alquileres_previos', previos);
  PS.registra('entrega', entrega);
  window.AXW_SETUP_RESERVAS = { EN: EN_SR, ID: ID_SR, TX: TX, planAlquiler: planAlquiler, planEntrega: planEntrega, importe: importe };
})();
