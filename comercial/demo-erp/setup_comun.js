/* Pasos COMUNES del setup (módulo base: S10 negocio, S12 idiomas, S13 correo) y del Taller (mesa S46: revisiones, recambios, mecánicos). F3, bbm-p31-front-comun,
 * 12-oct-2026. Owner, 12-oct: «Ajustes: toda la configuración del ERP debe salir desde aquí, si algo no está aquí, está mal»; idiomas del ERP «Sí, en
 * Ajustes»; 08:00: «Salta un asistente que te guia por pasos y deja todo eso en Ajustes.» Contrato: erp/plan_f3_comun_doble.json (Backend, bbm-p28,
 * e33c2e68; migración 20261012220000) — copiado en pruebas/doble_comun.json. Diseño: Claude Design «AxisWorks ERP Setup» S10, S12, S13, S46.
 *
 * Va detrás de setup_pasos.js y se suma con AXW_PASOS.registra(): el MISMO componente en el asistente (/ajustes/configurar/) y en Ajustes › Configurar
 * módulos. Ningún paso de aquí existe para la pantalla hasta que la base lo declara (modulos_setup_estado): sin la 220000 aplicada, este fichero no pinta nada.
 *  · negocio  → ajustes_config_guardar('marca' | 'zona_horaria'), solo las claves que cambian. La base no pide motivo para estas dos.
 *  · idiomas  → ajustes_config_guardar('idiomas', [defecto, …resto]); solo las combinaciones que ESTE paquete sabe pintar (sin el núcleo indonesio en el
 *               paquete, id+en no se ofrece). Guardado, se apunta en el navegador para que el arranque lo aplique (apagados_instancia.js / idioma.js).
 *  · correo   → solo MIRA (acción `estado` de la edge ajustes-correo) y lleva a Ajustes › Correo, donde vive el flujo con código, contraseña y la prueba real.
 *               Decisión por defecto (12-oct, revertir: hacer el flujo aquí): ese flujo es el más delicado del ERP y duplicarlo es tener dos copias que
 *               pueden discrepar. Si la edge dice pide_codigo:false (falta el secreto CORREO_CODIGO_PEPPER), lo DICE y no ofrece un camino que fallaría.
 *  · taller_* → se hacen en el Taller (#listas) y en Usuarios; aquí el estado que da la base, «necesario para abrir el Taller» donde toca, y los dos
 *               próximos (proveedores, almacén) como «Próximamente», deshabilitados: no existen todavía (8.T2a).
 * Todo dato por textContent; enganche por data-axw-*; nombres de funciones LITERALES (erp/contrato_front.py).
 */
(function () {
  'use strict';
  if (!window.AXW_SETUP || !window.AXW_PASOS || typeof window.AXW_PASOS.registra !== 'function') return;
  var S = window.AXW_SETUP, PS = window.AXW_PASOS;

  // ── Textos: se suman al mapa único de setup_modulos.js (sin pisar). EN e ID indexados por la frase en español. ───────────────────────────────
  var TX = {
    paso: {
      negocio: ['Tu negocio', 'El nombre que sale en el menú, en el título del navegador y en los correos, y la hora con la que se programan los avisos.'],
      idiomas: ['Idiomas del ERP', 'En qué idiomas trabaja tu equipo y cuál sale por defecto.'],
      correo: ['Correo de salida', 'El buzón desde el que el ERP manda facturas, avisos y códigos. Se prueba con un envío real antes de guardarlo.'],
      taller_revisiones: ['Revisiones del taller', 'Qué se revisa en cada modelo antes de volver a alquilarlo.'],
      taller_recambios: ['Recambios del taller', 'Las piezas que usa el taller y en qué modelos van.'],
      taller_mecanicos: ['Mecánicos del taller', 'Quién del equipo hace las revisiones en el taller.']
    },
    falta: {
      sin_correo: 'Aún no hay un servidor de correo propio: los correos salen con la configuración de origen.',
      sin_lista_revision: 'Falta la lista de revisión de algún modelo (o una lista común para todos).',
      sin_recambios: 'Aún no hay ninguna pieza de recambio dada de alta.'
    },
    campo: { marca: 'nombre del negocio', zona_horaria: 'zona horaria', idiomas: 'idiomas' },
    hint: {
      idiomas_no_validos: 'Esa combinación de idiomas no se puede usar en este ERP: elige una de las que se ofrecen.',
      axw_dato_no_valido: 'Algún dato no vale: revísalo.'
    },
    ui: {
      co_nombre: 'Nombre del negocio',
      co_nombre_ayuda: 'Sale en el menú, en el título del navegador y en los correos. De 1 a 60 caracteres.',
      co_nombre_mal: 'El nombre va de 1 a 60 caracteres, sin < ni >.',
      co_zona: 'Zona horaria',
      co_zona_ayuda: 'Formato Región/Ciudad. Por ejemplo: Asia/Makassar (Bali) o Asia/Jakarta.',
      co_zona_mal: 'Esa zona horaria no existe: escríbela como Región/Ciudad, por ejemplo Asia/Makassar.',
      co_idi_leyenda: 'Idiomas que ofrece el ERP',
      co_idi_id: 'Indonesio e inglés',
      co_idi_id_d: 'Sale en indonesio por defecto.',
      co_idi_es: 'Español e inglés',
      co_idi_es_d: 'Sale en español por defecto.',
      co_idi_nota: 'Cada persona del equipo puede cambiar el suyo. El cambio se ve al volver a cargar la página.',
      co_idi_build: 'Ahora mismo manda lo que fijó el estudio al publicar el ERP.',
      co_idi_solo_es: 'Este ERP solo trae español e inglés. Para ofrecer indonesio, pídeselo al estudio.',
      co_correo_cargando: 'Mirando el correo de salida…',
      co_correo_no_mirar: 'No se ha podido mirar el correo de salida.',
      co_correo_servidor: 'Servidor actual: %h · usuario %u',
      co_correo_puesto: 'Guardado el %f.',
      co_correo_sin: 'Sin servidor propio: los correos salen con la configuración de origen del ERP.',
      co_correo_remitente: 'Los correos salen desde %r.',
      co_correo_sin_remitente: 'Aún no hay un remitente válido: se pone en Ajustes › Correo.',
      co_correo_pausa: 'Los envíos de correo están en pausa: no se puede probar ni guardar hasta reanudarlos.',
      co_correo_sin_clave: 'Falta una clave del servidor: el correo todavía no se puede configurar desde el ERP. Avisa al estudio.',
      co_correo_como: 'Lo hace un super admin en Ajustes › Correo: le llega un código a su correo, prueba el servidor con un envío real y solo si llega se guarda. Un administrador puede cambiar allí «Responder a» y el buzón de avisos de soporte.',
      co_correo_abrir: 'Configurar el correo y enviar una prueba',
      co_correo_solo_admin: 'El servidor de correo lo pone un super admin.',
      co_taller_necesario: 'Necesario para abrir el Taller',
      co_taller_nota: 'Estos pasos no frenan las reservas. El Taller se abre al equipo cuando tiene las revisiones y un mecánico.',
      co_taller_listas: 'Se hace en el Taller, en la pestaña de listas.',
      co_taller_usuarios: 'Se hace en Usuarios: da la herramienta Taller a quien hace las revisiones (el administrador principal no cuenta).',
      co_abrir_taller: 'Abrir el Taller',
      co_abrir_usuarios: 'Abrir Usuarios',
      co_proximamente: 'Próximamente',
      co_proveedores: 'Proveedores de recambios',
      co_almacen: 'Almacén de recambios'
    }
  };
  var EN_CO = {
    'Tu negocio': 'Your business',
    'El nombre que sale en el menú, en el título del navegador y en los correos, y la hora con la que se programan los avisos.': 'The name shown in the menu, the browser title and the emails, and the time zone used to schedule notices.',
    'Idiomas del ERP': 'ERP languages', 'En qué idiomas trabaja tu equipo y cuál sale por defecto.': 'Which languages your team works in and which one is the default.',
    'Correo de salida': 'Outgoing email',
    'El buzón desde el que el ERP manda facturas, avisos y códigos. Se prueba con un envío real antes de guardarlo.': 'The mailbox the ERP uses to send invoices, notices and codes. It is tested with a real email before it is saved.',
    'Revisiones del taller': 'Workshop checks', 'Qué se revisa en cada modelo antes de volver a alquilarlo.': 'What is checked on each model before it is rented out again.',
    'Recambios del taller': 'Workshop spare parts', 'Las piezas que usa el taller y en qué modelos van.': 'The parts the workshop uses and which models they fit.',
    'Mecánicos del taller': 'Workshop mechanics', 'Quién del equipo hace las revisiones en el taller.': 'Who on the team does the checks in the workshop.',
    'Aún no hay un servidor de correo propio: los correos salen con la configuración de origen.': 'There is no own mail server yet: emails go out with the original setup.',
    'Falta la lista de revisión de algún modelo (o una lista común para todos).': 'A model is missing its check list (or a common list for all).',
    'Aún no hay ninguna pieza de recambio dada de alta.': 'No spare part has been added yet.',
    'nombre del negocio': 'business name', 'zona horaria': 'time zone', 'idiomas': 'languages',
    'Esa combinación de idiomas no se puede usar en este ERP: elige una de las que se ofrecen.': 'That language combination cannot be used in this ERP: choose one of those offered.',
    'Algún dato no vale: revísalo.': 'Some data is not valid: check it.',
    'Nombre del negocio': 'Business name', 'Sale en el menú, en el título del navegador y en los correos. De 1 a 60 caracteres.': 'Shown in the menu, the browser title and the emails. 1 to 60 characters.',
    'El nombre va de 1 a 60 caracteres, sin < ni >.': 'The name is 1 to 60 characters, without < or >.',
    'Zona horaria': 'Time zone', 'Formato Región/Ciudad. Por ejemplo: Asia/Makassar (Bali) o Asia/Jakarta.': 'Region/City format. For example: Asia/Makassar (Bali) or Asia/Jakarta.',
    'Esa zona horaria no existe: escríbela como Región/Ciudad, por ejemplo Asia/Makassar.': 'That time zone does not exist: write it as Region/City, for example Asia/Makassar.',
    'Idiomas que ofrece el ERP': 'Languages the ERP offers', 'Indonesio e inglés': 'Indonesian and English', 'Sale en indonesio por defecto.': 'Indonesian by default.',
    'Español e inglés': 'Spanish and English', 'Sale en español por defecto.': 'Spanish by default.',
    'Cada persona del equipo puede cambiar el suyo. El cambio se ve al volver a cargar la página.': 'Each team member can change their own. The change shows when the page is reloaded.',
    'Ahora mismo manda lo que fijó el estudio al publicar el ERP.': 'Right now the setting the studio chose when publishing the ERP applies.',
    'Este ERP solo trae español e inglés. Para ofrecer indonesio, pídeselo al estudio.': 'This ERP only comes with Spanish and English. To offer Indonesian, ask the studio.',
    'Mirando el correo de salida…': 'Checking the outgoing email…', 'No se ha podido mirar el correo de salida.': 'The outgoing email could not be checked.',
    'Servidor actual: %h · usuario %u': 'Current server: %h · user %u', 'Guardado el %f.': 'Saved on %f.',
    'Sin servidor propio: los correos salen con la configuración de origen del ERP.': 'No own server: emails go out with the ERP original setup.',
    'Los correos salen desde %r.': 'Emails are sent from %r.', 'Aún no hay un remitente válido: se pone en Ajustes › Correo.': 'There is no valid sender yet: set it in Settings › Email.',
    'Los envíos de correo están en pausa: no se puede probar ni guardar hasta reanudarlos.': 'Email sending is paused: nothing can be tested or saved until it resumes.',
    'Falta una clave del servidor: el correo todavía no se puede configurar desde el ERP. Avisa al estudio.': 'A server key is missing: email cannot be set up from the ERP yet. Tell the studio.',
    'Lo hace un super admin en Ajustes › Correo: le llega un código a su correo, prueba el servidor con un envío real y solo si llega se guarda. Un administrador puede cambiar allí «Responder a» y el buzón de avisos de soporte.': 'A super admin does this in Settings › Email: they get a code by email, test the server with a real email, and it is saved only if it arrives. An administrator can change “Reply to” and the support alerts mailbox there.',
    'Configurar el correo y enviar una prueba': 'Set up email and send a test',
    'El servidor de correo lo pone un super admin.': 'The mail server is set by a super admin.',
    'Necesario para abrir el Taller': 'Needed to open the Workshop',
    'Estos pasos no frenan las reservas. El Taller se abre al equipo cuando tiene las revisiones y un mecánico.': 'These steps do not hold up bookings. The Workshop opens to the team once it has the checks and a mechanic.',
    'Se hace en el Taller, en la pestaña de listas.': 'Done in the Workshop, in the lists tab.',
    'Se hace en Usuarios: da la herramienta Taller a quien hace las revisiones (el administrador principal no cuenta).': 'Done in Users: give the Workshop tool to whoever does the checks (the main administrator does not count).',
    'Abrir el Taller': 'Open the Workshop', 'Abrir Usuarios': 'Open Users', 'Próximamente': 'Coming soon',
    'Proveedores de recambios': 'Spare part suppliers', 'Almacén de recambios': 'Spare parts stock'
  };
  var ID_CO = {
    'Tu negocio': 'Usaha Anda',
    'El nombre que sale en el menú, en el título del navegador y en los correos, y la hora con la que se programan los avisos.': 'Nama yang tampil di menu, judul browser, dan email, serta zona waktu untuk menjadwalkan pemberitahuan.',
    'Idiomas del ERP': 'Bahasa ERP', 'En qué idiomas trabaja tu equipo y cuál sale por defecto.': 'Bahasa yang dipakai tim Anda dan bahasa bawaannya.',
    'Correo de salida': 'Email keluar',
    'El buzón desde el que el ERP manda facturas, avisos y códigos. Se prueba con un envío real antes de guardarlo.': 'Kotak surat yang dipakai ERP untuk mengirim invoice, pemberitahuan, dan kode. Diuji dengan email sungguhan sebelum disimpan.',
    'Revisiones del taller': 'Pemeriksaan bengkel', 'Qué se revisa en cada modelo antes de volver a alquilarlo.': 'Apa yang diperiksa pada setiap model sebelum disewakan lagi.',
    'Recambios del taller': 'Suku cadang bengkel', 'Las piezas que usa el taller y en qué modelos van.': 'Suku cadang yang dipakai bengkel dan model yang cocok.',
    'Mecánicos del taller': 'Mekanik bengkel', 'Quién del equipo hace las revisiones en el taller.': 'Anggota tim yang melakukan pemeriksaan di bengkel.',
    'Aún no hay un servidor de correo propio: los correos salen con la configuración de origen.': 'Belum ada server email sendiri: email dikirim dengan pengaturan awal.',
    'Falta la lista de revisión de algún modelo (o una lista común para todos).': 'Ada model yang belum punya daftar pemeriksaan (atau daftar umum untuk semua).',
    'Aún no hay ninguna pieza de recambio dada de alta.': 'Belum ada suku cadang yang didaftarkan.',
    'nombre del negocio': 'nama usaha', 'zona horaria': 'zona waktu', 'idiomas': 'bahasa',
    'Esa combinación de idiomas no se puede usar en este ERP: elige una de las que se ofrecen.': 'Kombinasi bahasa itu tidak bisa dipakai di ERP ini: pilih salah satu yang tersedia.',
    'Algún dato no vale: revísalo.': 'Ada data yang tidak valid: periksa lagi.',
    'Nombre del negocio': 'Nama usaha', 'Sale en el menú, en el título del navegador y en los correos. De 1 a 60 caracteres.': 'Tampil di menu, judul browser, dan email. 1 sampai 60 karakter.',
    'El nombre va de 1 a 60 caracteres, sin < ni >.': 'Nama terdiri dari 1 sampai 60 karakter, tanpa < atau >.',
    'Zona horaria': 'Zona waktu', 'Formato Región/Ciudad. Por ejemplo: Asia/Makassar (Bali) o Asia/Jakarta.': 'Format Wilayah/Kota. Contoh: Asia/Makassar (Bali) atau Asia/Jakarta.',
    'Esa zona horaria no existe: escríbela como Región/Ciudad, por ejemplo Asia/Makassar.': 'Zona waktu itu tidak ada: tulis sebagai Wilayah/Kota, misalnya Asia/Makassar.',
    'Idiomas que ofrece el ERP': 'Bahasa yang tersedia di ERP', 'Indonesio e inglés': 'Bahasa Indonesia dan Inggris', 'Sale en indonesio por defecto.': 'Bawaan: Bahasa Indonesia.',
    'Español e inglés': 'Bahasa Spanyol dan Inggris', 'Sale en español por defecto.': 'Bawaan: Bahasa Spanyol.',
    'Cada persona del equipo puede cambiar el suyo. El cambio se ve al volver a cargar la página.': 'Setiap anggota tim bisa mengubah bahasanya sendiri. Perubahan terlihat setelah halaman dimuat ulang.',
    'Ahora mismo manda lo que fijó el estudio al publicar el ERP.': 'Saat ini berlaku pengaturan yang ditetapkan studio saat menerbitkan ERP.',
    'Este ERP solo trae español e inglés. Para ofrecer indonesio, pídeselo al estudio.': 'ERP ini hanya tersedia dalam bahasa Spanyol dan Inggris. Untuk menambah Bahasa Indonesia, minta ke studio.',
    'Mirando el correo de salida…': 'Memeriksa email keluar…', 'No se ha podido mirar el correo de salida.': 'Email keluar tidak dapat diperiksa.',
    'Servidor actual: %h · usuario %u': 'Server saat ini: %h · pengguna %u', 'Guardado el %f.': 'Tersimpan pada %f.',
    'Sin servidor propio: los correos salen con la configuración de origen del ERP.': 'Tanpa server sendiri: email dikirim dengan pengaturan awal ERP.',
    'Los correos salen desde %r.': 'Email dikirim dari %r.', 'Aún no hay un remitente válido: se pone en Ajustes › Correo.': 'Belum ada pengirim yang valid: atur di Pengaturan › Email.',
    'Los envíos de correo están en pausa: no se puede probar ni guardar hasta reanudarlos.': 'Pengiriman email sedang dijeda: tidak bisa diuji atau disimpan sampai dilanjutkan.',
    'Falta una clave del servidor: el correo todavía no se puede configurar desde el ERP. Avisa al estudio.': 'Ada kunci server yang belum diisi: email belum bisa diatur dari ERP. Beri tahu studio.',
    'Lo hace un super admin en Ajustes › Correo: le llega un código a su correo, prueba el servidor con un envío real y solo si llega se guarda. Un administrador puede cambiar allí «Responder a» y el buzón de avisos de soporte.': 'Ini dilakukan oleh super admin di Pengaturan › Email: kode dikirim ke emailnya, server diuji dengan email sungguhan, dan baru tersimpan jika email itu sampai. Admin bisa mengubah “Balas ke” dan kotak surat notifikasi dukungan di sana.',
    'Configurar el correo y enviar una prueba': 'Atur email dan kirim uji coba',
    'El servidor de correo lo pone un super admin.': 'Server email diatur oleh super admin.',
    'Necesario para abrir el Taller': 'Diperlukan untuk membuka bengkel',
    'Estos pasos no frenan las reservas. El Taller se abre al equipo cuando tiene las revisiones y un mecánico.': 'Langkah-langkah ini tidak menghambat booking. Bengkel dibuka untuk tim setelah ada daftar pemeriksaan dan seorang mekanik.',
    'Se hace en el Taller, en la pestaña de listas.': 'Dilakukan di Bengkel, pada tab daftar.',
    'Se hace en Usuarios: da la herramienta Taller a quien hace las revisiones (el administrador principal no cuenta).': 'Dilakukan di Pengguna: berikan alat Bengkel kepada orang yang melakukan pemeriksaan (admin utama tidak dihitung).',
    'Abrir el Taller': 'Buka Bengkel', 'Abrir Usuarios': 'Buka Pengguna', 'Próximamente': 'Segera hadir',
    'Proveedores de recambios': 'Pemasok suku cadang', 'Almacén de recambios': 'Stok suku cadang'
  };
  Object.keys(TX).forEach(function (g) {
    var dst = S.TEXTOS[g] || (S.TEXTOS[g] = {});
    Object.keys(TX[g]).forEach(function (k) { if (!(k in dst)) dst[k] = TX[g][k]; });
  });
  function fusiona() {
    if (window.LW_EN && typeof window.LW_EN === 'object') Object.keys(EN_CO).forEach(function (k) { if (!(k in window.LW_EN)) window.LW_EN[k] = EN_CO[k]; });
    if (window.LW_ID && typeof window.LW_ID === 'object') Object.keys(ID_CO).forEach(function (k) { if (!(k in window.LW_ID)) window.LW_ID[k] = ID_CO[k]; });
  }
  fusiona();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fusiona);

  // ── N4 «el cliente se configura solo» (erp-setup, 14-oct-2026): textos de los pasos y módulos que el registro declara desde N4 (erp/modulos.py → SETUP).
  // Contrato: erp_setup_n4_14oct.md (e). Mismo molde que TX: se suman sin pisar; EN e ID indexados por la frase en español. Los pasos sin componente propio
  // los pinta EXTERNO (setup_pasos.js): «se hace en otra pantalla» + enlace a su `donde`. tipos_vivienda, fases_obra y carta_reserva llevan frase aunque hoy
  // no se siembran (PASOS_PANTALLA_PENDIENTE: su función nace cerrada hasta su pantalla, encargo de erp-front): la base ya los conoce (SETUP_PASOS).
  var TX_N4 = {
    paso: {
      categorias_gasto: ['Categorías de gasto', 'Cada gasto se apunta en una categoría: sin ninguna no se puede registrar un gasto.'],
      cuenta_propia: ['Cuenta bancaria propia', 'La cuenta (no escrow) contra la que se importan los extractos del banco.'],
      cuenta_cobro: ['Cuenta de cobro', 'La cuenta que sale en facturas, proformas y contratos para que te paguen.'],
      proyecto: ['Primer proyecto', 'Las unidades a la venta cuelgan de un proyecto.'],
      tipos_vivienda: ['Tipos de unidad', 'Cada unidad es de un tipo (por ejemplo, parcela o villa).'],
      unidades: ['Unidades a la venta', 'Lo que se reserva, se contrata y se factura.'],
      fases_obra: ['Fases de obra', 'Las fases de la construcción y qué pago dispara cada una.'],
      plantilla_contrato: ['Plantilla de contrato activa', 'El texto con el que se generan los contratos. Una plantilla activada ya no se edita: se crea una versión nueva.'],
      carta_reserva: ['Carta de reserva', 'Qué tipo de contrato es la carta de reserva: vence y libera la unidad sola.'],
      condicion_comision: ['Comisión estándar', 'Sin condición estándar no se calcula ninguna comisión.'],
      facturable: ['Qué vas a facturar', 'Para facturar hace falta algo con precio: un producto o servicio, o, si alquilas, un modelo con su tarifa en Flota y tarifas.'],   // paso opcional de Facturación (erp-setup-2, 14-oct)
      // N5 (aaas-2, 14-oct): los tres pasos del AaaS, en su ventana (/agente/). Mientras falte uno, el AaaS está encendido pero no trabaja
      tope_aaas: ['Tope mensual de tu equipo', 'Lo máximo que tu equipo puede gastar en IA en un mes. Con 0 no gasta nada.'],
      contexto_aaas: ['Quién es el negocio', 'Unas líneas sobre el negocio para que tu equipo sepa con quién trabaja.'],
      limites_aaas: ['Límites por módulo', 'Qué puede hacer tu equipo en cada parte de tu negocio: nada, proponértelo o hacerlo solo.']
    },
    modulo: {
      gastos: 'Gastos', bancos: 'Bancos', proyectos: 'Proyectos y unidades', modelos: 'Modelos', contratos: 'Contratos', reservas: 'Reservas',
      'textos-contrato': 'Textos de contrato', 'copias-firmadas': 'Copias firmadas', comisiones: 'Comisiones', obra: 'Obra', portal: 'Portal del cliente',
      soporte: 'Soporte', cuentas: 'Cuentas bancarias', compradores: 'Clientes', finanzas: 'Resumen financiero', operaciones: 'Operaciones',
      'whatsapp-bot': 'Bot de WhatsApp', agente: 'Tu equipo de agentes'
    },
    campo: {
      categoria: 'una categoría', cuenta_propia: 'una cuenta propia', cuenta_cobro: 'una cuenta de cobro', proyecto: 'un proyecto', tipo_vivienda: 'un tipo de unidad',
      unidad: 'una unidad', producto: 'algo con precio que facturar', fase: 'una fase de obra', plantilla: 'una plantilla activa', tipo_carta: 'el tipo de la carta de reserva', condicion: 'una condición de comisión',
      tope_aaas: 'el tope mensual de tu equipo', contexto_aaas: 'quién es el negocio', limites_aaas: 'los límites por módulo'   // N5 (aaas-2)
    },
    consecuencia: { cuenta_cobro: 'Es opcional: sin ella, las facturas salen sin datos de pago.', facturable: 'Es opcional para terminar la configuración, pero sin nada con precio no podrás facturar.' },
    hint: {
      nombre_repetido: 'Ya hay una categoría con ese nombre.',
      nombre_no_valido: 'El nombre va de 1 a 80 caracteres y no empieza por = + - @.',
      grupo_no_valido: 'Elige uno de los grupos de la lista.',
      grupo_en_uso: 'Ya hay gastos en esta categoría: su grupo no se cambia.',
      orden_no_valido: 'El orden no es válido.',
      modulo_sin_declarar: 'Este módulo aún no se puede encender: le falta su configuración.'
    },
    ui: {
      n4_cat_lista: 'Categorías que ya tienes',
      n4_cat_ninguna: 'Aún no hay ninguna categoría.',
      n4_cat_inactiva: 'desactivada',
      n4_cat_nueva: 'Nueva categoría',
      n4_cat_nombre: 'Nombre',
      n4_cat_nombre_ayuda: 'Por ejemplo: Material de oficina. De 1 a 80 caracteres; no empieza por = + - @.',
      n4_cat_nombre_mal: 'El nombre va de 1 a 80 caracteres y no empieza por = + - @.',
      n4_cat_falta: 'Escribe el nombre de la primera categoría.',
      n4_cat_grupo: 'Grupo',
      n4_cat_grupo_ayuda: 'Agrupa los gastos en el resumen. No se cambia cuando ya hay gastos en la categoría.',
      n4_cat_cargando: 'Cargando las categorías…',
      n4_cat_no_carga: 'No se han podido leer las categorías.',
      n4_cat_otra: 'Si ya tienes las que necesitas, deja el nombre vacío y sigue.',
      n4_sug_titulo: 'Te proponemos estas categorías',
      n4_sug_ayuda: 'Pulsa «Usar estas» y quedan dadas de alta. Puedes quitar alguna o añadir la tuya.',
      n4_sug_usar: 'Usar estas',
      n4_sug_cambiar: 'Quitar alguna o añadir la tuya',
      n4_sug_propia: 'Añadir otra (opcional)',
      n4_sug_ninguna: 'Marca al menos una o escribe la tuya.',
      n4_sug_n: '%n de %t marcadas',
      n4_g_general: 'General', n4_g_suelo: 'Suelo', n4_g_construccion: 'Construcción', n4_g_comercial: 'Comercial', n4_g_marketing: 'Marketing',
      n4_g_personal: 'Personal', n4_g_impuestos: 'Impuestos', n4_g_financiero: 'Financiero'
    }
  };
  var EN_N4 = {
    'Tope mensual de tu equipo': 'Your team’s monthly cap', 'Lo máximo que tu equipo puede gastar en IA en un mes. Con 0 no gasta nada.': 'The most your team can spend on AI in a month. With 0 it spends nothing.',
    'Quién es el negocio': 'Who the business is', 'Unas líneas sobre el negocio para que tu equipo sepa con quién trabaja.': 'A few lines about the business so your team knows who it works for.',
    'Límites por módulo': 'Limits per module', 'Qué puede hacer tu equipo en cada parte de tu negocio: nada, proponértelo o hacerlo solo.': 'What your team may do in each part of your business: nothing, propose it to you, or do it alone.',
    'el tope mensual de tu equipo': 'your team’s monthly cap', 'quién es el negocio': 'who the business is', 'los límites por módulo': 'the limits per module', 'Tu equipo de agentes': 'Your agent team',
    'Categorías de gasto': 'Expense categories', 'Cada gasto se apunta en una categoría: sin ninguna no se puede registrar un gasto.': 'Every expense goes into a category: without one no expense can be recorded.',
    'Cuenta bancaria propia': 'Your own bank account', 'La cuenta (no escrow) contra la que se importan los extractos del banco.': 'The (non-escrow) account bank statements are imported against.',
    'Cuenta de cobro': 'Payment account', 'La cuenta que sale en facturas, proformas y contratos para que te paguen.': 'The account shown on invoices, proformas and contracts so you get paid.',
    'Primer proyecto': 'First project', 'Las unidades a la venta cuelgan de un proyecto.': 'Units for sale belong to a project.',
    'Qué vas a facturar': 'What you invoice', 'Para facturar hace falta algo con precio: un producto o servicio, o, si alquilas, un modelo con su tarifa en Flota y tarifas.': 'To invoice you need something with a price: a product or service or, if you rent, a model with its rate in Fleet and rates.',
    'algo con precio que facturar': 'something with a price to invoice',
    'Tipos de unidad': 'Unit types', 'Cada unidad es de un tipo (por ejemplo, parcela o villa).': 'Each unit has a type (for example, plot or villa).',
    'Unidades a la venta': 'Units for sale', 'Lo que se reserva, se contrata y se factura.': 'What gets reserved, contracted and invoiced.',
    'Fases de obra': 'Construction stages', 'Las fases de la construcción y qué pago dispara cada una.': 'The construction stages and which payment each one triggers.',
    'Plantilla de contrato activa': 'Active contract template',
    'El texto con el que se generan los contratos. Una plantilla activada ya no se edita: se crea una versión nueva.': 'The text contracts are generated from. An activated template can\'t be edited: you create a new version.',
    'Carta de reserva': 'Reservation letter', 'Qué tipo de contrato es la carta de reserva: vence y libera la unidad sola.': 'Which contract type is the reservation letter: it expires and releases the unit on its own.',
    'Comisión estándar': 'Standard commission', 'Sin condición estándar no se calcula ninguna comisión.': 'Without a standard condition no commission is calculated.',
    'Gastos': 'Expenses', 'Bancos': 'Banks', 'Proyectos y unidades': 'Projects and units', 'Modelos': 'Models', 'Contratos': 'Contracts', 'Reservas': 'Reservations',
    'Textos de contrato': 'Contract texts', 'Copias firmadas': 'Signed copies', 'Comisiones': 'Commissions', 'Obra': 'Construction', 'Portal del cliente': 'Client portal',
    'Soporte': 'Support', 'Cuentas bancarias': 'Bank accounts', 'Clientes': 'Clients', 'Resumen financiero': 'Financial summary', 'Operaciones': 'Operations',
    'Bot de WhatsApp': 'WhatsApp bot',
    'una categoría': 'a category', 'una cuenta propia': 'an own account', 'una cuenta de cobro': 'a payment account', 'un proyecto': 'a project',
    'un tipo de unidad': 'a unit type', 'una unidad': 'a unit', 'una fase de obra': 'a construction stage', 'una plantilla activa': 'an active template',
    'el tipo de la carta de reserva': 'the reservation letter type', 'una condición de comisión': 'a commission condition',
    'Es opcional: sin ella, las facturas salen sin datos de pago.': 'Optional: without it, invoices go out without payment details.',
    'Es opcional para terminar la configuración, pero sin nada con precio no podrás facturar.': 'Optional to finish the setup, but without anything with a price you will not be able to invoice.',
    'Ya hay una categoría con ese nombre.': 'There is already a category with that name.', 'Elige uno de los grupos de la lista.': 'Choose one of the groups in the list.',
    'Ya hay gastos en esta categoría: su grupo no se cambia.': 'This category already has expenses: its group can\'t change.', 'El orden no es válido.': 'The order is not valid.',
    'Este módulo aún no se puede encender: le falta su configuración.': 'This module can\'t be turned on yet: its setup isn\'t defined.',
    'Categorías que ya tienes': 'Categories you already have', 'Aún no hay ninguna categoría.': 'There are no categories yet.', 'desactivada': 'inactive',
    'Nueva categoría': 'New category', 'Nombre': 'Name', 'Por ejemplo: Material de oficina. De 1 a 80 caracteres; no empieza por = + - @.': 'For example: Office supplies. 1 to 80 characters; it can\'t start with = + - @.',
    'El nombre va de 1 a 80 caracteres y no empieza por = + - @.': 'The name must be 1 to 80 characters and can\'t start with = + - @.', 'Escribe el nombre de la primera categoría.': 'Write the name of the first category.',
    'Grupo': 'Group', 'Agrupa los gastos en el resumen. No se cambia cuando ya hay gastos en la categoría.': 'Groups expenses in the summary. It can\'t change once the category has expenses.',
    'Cargando las categorías…': 'Loading categories…', 'No se han podido leer las categorías.': 'The categories could not be loaded.',
    'Si ya tienes las que necesitas, deja el nombre vacío y sigue.': 'If you already have the ones you need, leave the name empty and continue.',
    'Te proponemos estas categorías': 'We suggest these categories', 'Pulsa «Usar estas» y quedan dadas de alta. Puedes quitar alguna o añadir la tuya.': 'Press «Use these» and they are added. You can remove any of them or add your own.',
    'Usar estas': 'Use these', 'Quitar alguna o añadir la tuya': 'Remove some or add your own', 'Añadir otra (opcional)': 'Add another (optional)',
    'Marca al menos una o escribe la tuya.': 'Tick at least one or write your own.', '%n de %t marcadas': '%n of %t ticked',
    'General': 'General', 'Suelo': 'Land', 'Construcción': 'Construction', 'Comercial': 'Sales', 'Marketing': 'Marketing', 'Personal': 'Staff',
    'Impuestos': 'Taxes', 'Financiero': 'Financial'
  };
  var ID_N4 = {
    'Tope mensual de tu equipo': 'Anggaran bulanan tim Anda', 'Lo máximo que tu equipo puede gastar en IA en un mes. Con 0 no gasta nada.': 'Anggaran maksimum tim Anda untuk AI dalam sebulan. Dengan 0 tidak ada pengeluaran.',
    'Quién es el negocio': 'Tentang usaha ini', 'Unas líneas sobre el negocio para que tu equipo sepa con quién trabaja.': 'Beberapa baris tentang usaha ini agar tim Anda tahu untuk siapa mereka bekerja.',
    'Límites por módulo': 'Wewenang tiap modul', 'Qué puede hacer tu equipo en cada parte de tu negocio: nada, proponértelo o hacerlo solo.': 'Apa yang boleh dilakukan tim Anda di setiap bagian usaha Anda: tidak ada, mengusulkannya kepada Anda, atau mengerjakannya sendiri.',
    'el tope mensual de tu equipo': 'anggaran bulanan tim Anda', 'quién es el negocio': 'tentang usaha ini', 'los límites por módulo': 'wewenang tiap modul', 'Tu equipo de agentes': 'Tim agen Anda',
    'Categorías de gasto': 'Kategori pengeluaran', 'Cada gasto se apunta en una categoría: sin ninguna no se puede registrar un gasto.': 'Setiap pengeluaran masuk ke satu kategori: tanpa kategori, pengeluaran tidak bisa dicatat.',
    'Cuenta bancaria propia': 'Rekening bank sendiri', 'La cuenta (no escrow) contra la que se importan los extractos del banco.': 'Rekening (bukan escrow) tempat mutasi bank diimpor.',
    'Cuenta de cobro': 'Rekening penerimaan', 'La cuenta que sale en facturas, proformas y contratos para que te paguen.': 'Rekening yang tercantum di invoice, proforma, dan kontrak untuk menerima pembayaran.',
    'Primer proyecto': 'Proyek pertama', 'Las unidades a la venta cuelgan de un proyecto.': 'Unit yang dijual berada di bawah satu proyek.',
    'Qué vas a facturar': 'Yang Anda tagihkan', 'Para facturar hace falta algo con precio: un producto o servicio, o, si alquilas, un modelo con su tarifa en Flota y tarifas.': 'Untuk membuat invoice perlu sesuatu yang berharga: produk atau layanan, atau, jika Anda menyewakan, model dengan tarifnya di Armada dan tarif.',
    'algo con precio que facturar': 'sesuatu dengan harga untuk ditagihkan',
    'Tipos de unidad': 'Jenis unit', 'Cada unidad es de un tipo (por ejemplo, parcela o villa).': 'Setiap unit punya jenis (misalnya kavling atau vila).',
    'Unidades a la venta': 'Unit yang dijual', 'Lo que se reserva, se contrata y se factura.': 'Yang dipesan, dikontrakkan, dan ditagih.',
    'Fases de obra': 'Tahap pembangunan', 'Las fases de la construcción y qué pago dispara cada una.': 'Tahap pembangunan dan pembayaran yang dipicu tiap tahap.',
    'Plantilla de contrato activa': 'Templat kontrak aktif',
    'El texto con el que se generan los contratos. Una plantilla activada ya no se edita: se crea una versión nueva.': 'Teks untuk membuat kontrak. Templat yang sudah aktif tidak bisa diubah: buat versi baru.',
    'Carta de reserva': 'Surat pemesanan', 'Qué tipo de contrato es la carta de reserva: vence y libera la unidad sola.': 'Jenis kontrak yang menjadi surat pemesanan: kedaluwarsa dan melepas unit secara otomatis.',
    'Comisión estándar': 'Komisi standar', 'Sin condición estándar no se calcula ninguna comisión.': 'Tanpa ketentuan standar, komisi tidak dihitung.',
    'Gastos': 'Pengeluaran', 'Bancos': 'Bank', 'Proyectos y unidades': 'Proyek dan unit', 'Contratos': 'Kontrak',
    'Textos de contrato': 'Teks kontrak', 'Copias firmadas': 'Salinan bertanda tangan', 'Comisiones': 'Komisi', 'Portal del cliente': 'Portal klien',
    'Soporte': 'Dukungan', 'Cuentas bancarias': 'Rekening bank', 'Resumen financiero': 'Ringkasan keuangan',
    'Bot de WhatsApp': 'Bot WhatsApp',
    'una categoría': 'satu kategori', 'una cuenta propia': 'satu rekening sendiri', 'una cuenta de cobro': 'satu rekening penerimaan', 'un proyecto': 'satu proyek',
    'un tipo de unidad': 'satu jenis unit', 'una unidad': 'satu unit', 'una fase de obra': 'satu tahap pembangunan', 'una plantilla activa': 'satu templat aktif',
    'el tipo de la carta de reserva': 'jenis surat pemesanan', 'una condición de comisión': 'satu ketentuan komisi',
    'Es opcional: sin ella, las facturas salen sin datos de pago.': 'Opsional: tanpa ini, invoice keluar tanpa data pembayaran.',
    'Es opcional para terminar la configuración, pero sin nada con precio no podrás facturar.': 'Opsional untuk menyelesaikan penyiapan, tetapi tanpa sesuatu yang berharga Anda tidak bisa membuat invoice.',
    'Ya hay una categoría con ese nombre.': 'Sudah ada kategori dengan nama itu.', 'Elige uno de los grupos de la lista.': 'Pilih salah satu grup di daftar.',
    'Ya hay gastos en esta categoría: su grupo no se cambia.': 'Kategori ini sudah punya pengeluaran: grupnya tidak bisa diubah.', 'El orden no es válido.': 'Urutannya tidak valid.',
    'Este módulo aún no se puede encender: le falta su configuración.': 'Modul ini belum bisa diaktifkan: pengaturannya belum ditentukan.',
    'Categorías que ya tienes': 'Kategori yang sudah ada', 'Aún no hay ninguna categoría.': 'Belum ada kategori.', 'desactivada': 'nonaktif',
    'Nueva categoría': 'Kategori baru', 'Nombre': 'Nama', 'Por ejemplo: Material de oficina. De 1 a 80 caracteres; no empieza por = + - @.': 'Contoh: Alat tulis kantor. 1 sampai 80 karakter; tidak diawali = + - @.',
    'El nombre va de 1 a 80 caracteres y no empieza por = + - @.': 'Nama harus 1 sampai 80 karakter dan tidak diawali = + - @.', 'Escribe el nombre de la primera categoría.': 'Tulis nama kategori pertama.',
    'Grupo': 'Grup', 'Agrupa los gastos en el resumen. No se cambia cuando ya hay gastos en la categoría.': 'Mengelompokkan pengeluaran di ringkasan. Tidak bisa diubah setelah kategori punya pengeluaran.',
    'Cargando las categorías…': 'Memuat kategori…', 'No se han podido leer las categorías.': 'Kategori tidak dapat dimuat.',
    'Si ya tienes las que necesitas, deja el nombre vacío y sigue.': 'Jika kategori yang dibutuhkan sudah ada, kosongkan nama dan lanjutkan.',
    'Te proponemos estas categorías': 'Kami sarankan kategori ini', 'Pulsa «Usar estas» y quedan dadas de alta. Puedes quitar alguna o añadir la tuya.': 'Tekan «Pakai ini» dan kategori langsung dibuat. Anda bisa menghapus salah satu atau menambah sendiri.',
    'Usar estas': 'Pakai ini', 'Quitar alguna o añadir la tuya': 'Hapus atau tambah kategori sendiri', 'Añadir otra (opcional)': 'Tambah lainnya (opsional)',
    'Marca al menos una o escribe la tuya.': 'Centang minimal satu atau tulis sendiri.', '%n de %t marcadas': '%n dari %t dicentang',
    'General': 'Umum', 'Suelo': 'Tanah', 'Construcción': 'Konstruksi', 'Comercial': 'Penjualan', 'Marketing': 'Pemasaran', 'Personal': 'Karyawan',
    'Impuestos': 'Pajak', 'Financiero': 'Keuangan'
  };
  Object.keys(TX_N4).forEach(function (g) {
    var dst = S.TEXTOS[g] || (S.TEXTOS[g] = {});
    Object.keys(TX_N4[g]).forEach(function (k) { if (!(k in dst)) dst[k] = TX_N4[g][k]; });
  });
  function fusionaN4() {
    if (window.LW_EN && typeof window.LW_EN === 'object') Object.keys(EN_N4).forEach(function (k) { if (!(k in window.LW_EN)) window.LW_EN[k] = EN_N4[k]; });
    if (window.LW_ID && typeof window.LW_ID === 'object') Object.keys(ID_N4).forEach(function (k) { if (!(k in window.LW_ID)) window.LW_ID[k] = ID_N4[k]; });
  }
  fusionaN4();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fusionaN4);

  // ── Ayudas ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  function U(k, h) { return S.ui(k, h); }
  function el(tag, attrs, hijos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null || attrs[k] === false) return; if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k] === true ? '' : attrs[k]); });
    (hijos || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function vacia(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }
  var RAIZ = (function () { var p = location.pathname, i = p.indexOf('/ajustes/'); return i >= 0 ? p.slice(0, i + 1) : '/'; })();
  var CLS_IN = 'w-full rounded-lg border border-control-border/50 bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md';
  var CLS_ETQ = 'font-label-md text-label-md text-on-surface';
  var CLS_AYUDA = 'font-body-sm text-body-sm text-outline';
  var CLS_NOTA = 'font-body-sm text-body-sm text-on-surface-variant';
  var CLS_BTN2 = 'inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-outline-variant font-label-md text-label-md text-deep-lagoon axw-btn';
  var CLS_CHIP = 'self-start inline-flex items-center px-3 py-1 rounded-full border border-outline-variant font-label-md text-[12px] text-on-surface-variant';
  var ALTO = 'min-height:44px';
  function campo(caja, k, etiqueta, valor, o) {
    o = o || {};
    var id = 'axw-co-' + k;
    var inp = el('input', { id: id, type: 'text', 'data-axw-campo': k, autocomplete: 'off', maxlength: String(o.max || 200), list: o.lista || null, spellcheck: 'false', class: CLS_IN });
    inp.style.maxWidth = '100%';
    if (valor != null) inp.value = String(valor);
    caja.appendChild(el('div', { class: 'flex flex-col gap-1.5 min-w-0', 'data-axw-fila': k }, [el('label', { for: id, class: CLS_ETQ, text: etiqueta }), inp,
      o.ayuda ? el('span', { class: CLS_AYUDA, text: o.ayuda }) : null]));
    return inp;
  }
  function val(caja, k) { var i = caja.querySelector('[data-axw-campo="' + k + '"]'); return i ? String(i.value || '').trim() : ''; }
  function texto(x) { return typeof x === 'string' ? x : (x == null ? '' : String(x)); }
  // {ok} | {ok:false, error, sinRespuesta}: solo un error SIN código es «no sé si se guardó» (la máquina de duda del anfitrión)
  function resultado(p) {
    return new Promise(function (ok) { ok(p); }).then(function (r) {
      if (!r) return { ok: false, sinRespuesta: true, error: { message: 'sin respuesta' } };
      if (r.error) return { ok: false, sinRespuesta: !r.error.code, error: r.error };
      return { ok: true, data: r.data };
    }, function (e) { return { ok: false, sinRespuesta: !(e && e.code), error: e || {} }; });
  }
  // La base contesta 22023 SIN hint cuando un valor no vale (marca, zona): se pone un hint propio para que nunca salga un código
  function conHint(r) {
    if (!r.ok && r.error && String(r.error.code) === '22023' && !r.error.hint) r.error = { code: '22023', hint: 'axw_dato_no_valido', message: r.error.message };
    return r;
  }
  function guardaClave(sb, clave, valor) { return resultado(sb.rpc('ajustes_config_guardar', { p_clave: clave, p_valor: valor })).then(conHint); }

  // ── S10 · Negocio: nombre (marca) y zona horaria ──────────────────────────────────────────────────────────────────────────────────────────
  var ZONA_RE = /^([A-Za-z_]+(\/[A-Za-z0-9_+-]+)+|UTC)$/;   // la de la base (130000); la base además mira pg_timezone_names
  function zonaValida(z) {
    if (!ZONA_RE.test(z)) return false;
    try { new Intl.DateTimeFormat('en', { timeZone: z }); return true; } catch (e) { return false; }
  }
  function listaZonas() {
    var id = 'axw-co-zonas';
    if (document.getElementById(id)) return id;
    var zs = [];
    try { if (typeof Intl.supportedValuesOf === 'function') zs = Intl.supportedValuesOf('timeZone'); } catch (e) { zs = []; }
    if (!zs.length) zs = ['Asia/Makassar', 'Asia/Jakarta', 'Asia/Jayapura', 'Asia/Singapore', 'Europe/Madrid', 'UTC'];
    var dl = el('datalist', { id: id });
    zs.forEach(function (z) { dl.appendChild(el('option', { value: z })); });
    document.body.appendChild(dl);
    return id;
  }
  // Lo tecleado sobrevive a un guardado que falla: el anfitrión repinta el paso con los valores que tenía (revisor, 12-oct, BAJA)
  var BORRADOR_NEGOCIO = null;
  function marcaActual(ctx) { return texto(ctx.ajustes && ctx.ajustes.marca).trim(); }
  function zonaActual(ctx) { return texto(ctx.ajustes && ctx.ajustes.zona_horaria).trim(); }
  var negocio = {
    sinMotivo: true,   // la base no pide motivo para marca ni zona_horaria (130000: solo impuestos y moneda)
    pinta: function (caja, ctx) {
      var bn = BORRADOR_NEGOCIO;
      campo(caja, 'marca', U('co_nombre'), bn ? bn.marca : marcaActual(ctx), { max: 60, ayuda: U('co_nombre_ayuda') });
      campo(caja, 'zona_horaria', U('co_zona'), bn ? bn.zona_horaria : zonaActual(ctx), { max: 64, lista: listaZonas(), ayuda: U('co_zona_ayuda') });
      return {
        valores: function () {
          var m = val(caja, 'marca'), z = val(caja, 'zona_horaria'), er = [];
          if (m.length < 1 || m.length > 60 || /[<>]/.test(m)) er.push(U('co_nombre_mal'));
          if (!zonaValida(z)) er.push(U('co_zona_mal'));
          return er.length ? { ok: false, error: er.join(' ') } : { ok: true, v: { marca: m, zona_horaria: z } };
        }
      };
    },
    // Solo las claves que cambian, una tras otra; la primera que falla para y lo dice (la base valida cada una)
    guarda: function (sb, v, ctx) {
      var cola = [];
      if (v.marca !== marcaActual(ctx)) cola.push(['marca', v.marca]);
      if (v.zona_horaria !== zonaActual(ctx)) cola.push(['zona_horaria', v.zona_horaria]);
      function uno(i) {
        if (i >= cola.length) {
          if (cola.some(function (c) { return c[0] === 'marca'; }) && typeof window.lwMarcaRefresca === 'function') {
            try { window.lwMarcaRefresca(sb); } catch (e) { /* MUDO A PROPOSITO: refrescar el menú no decide el guardado */ }
          }
          return Promise.resolve({ ok: true });
        }
        return guardaClave(sb, cola[i][0], cola[i][1]).then(function (r) { return r.ok ? uno(i + 1) : r; });
      }
      BORRADOR_NEGOCIO = { marca: v.marca, zona_horaria: v.zona_horaria };
      return uno(0).then(function (r) { if (r.ok) BORRADOR_NEGOCIO = null; return r; });
    },
    comprueba: function (v, ctx) { return marcaActual(ctx) === v.marca && zonaActual(ctx) === v.zona_horaria; }
  };

  // ── S12 · Idiomas: una de las combinaciones que el arranque sabe pintar; el primero es el de por defecto ──────────────────────────────────
  var COMBOS = [{ lista: ['id', 'en'], t: 'co_idi_id', d: 'co_idi_id_d' }, { lista: ['es', 'en'], t: 'co_idi_es', d: 'co_idi_es_d' }];
  // ¿Trae este paquete el indonesio? Solo si el build lo fijó (instancias.json → parches de idioma.js e i18n_id). Sin él, id+en sería una casilla muda.
  function paqueteConId() {
    var b = Array.isArray(window.AXW_IDIOMAS_BUILD) ? window.AXW_IDIOMAS_BUILD : (Array.isArray(window.AXW_IDIOMAS) ? window.AXW_IDIOMAS : []);
    return b.indexOf('id') >= 0;
  }
  function combosDelPaquete() { return COMBOS.filter(function (c) { return c.lista[0] !== 'id' || paqueteConId(); }); }
  function listaGuardada(ctx) {
    var x = ctx.ajustes && ctx.ajustes.idiomas;
    return Array.isArray(x) && COMBOS.some(function (c) { return c.lista.join() === x.join(); }) ? x.slice() : null;
  }
  function apuntaEnNavegador(lista) {   // el arranque de la página siguiente lo lee antes que el build (parche de idioma.js)
    try { localStorage.setItem('axw_idiomas_erp', JSON.stringify(lista)); } catch (e) { /* MUDO A PROPOSITO: sin almacenamiento manda el build hasta el próximo login */ }
  }
  var idiomas = {
    sinMotivo: true,   // la base no pide motivo ni confirmación para los idiomas (220000)
    pinta: function (caja, ctx) {
      var combos = combosDelPaquete(), guardada = listaGuardada(ctx);
      var actual = guardada || (Array.isArray(window.AXW_IDIOMAS) ? window.AXW_IDIOMAS : ['es', 'en']);
      var fs = el('fieldset', { class: 'flex flex-col gap-3 min-w-0', 'data-axw-fila': 'idiomas', style: 'border:0;padding:0;margin:0' }, [el('legend', { class: CLS_ETQ, style: 'margin-bottom:8px', text: U('co_idi_leyenda') })]);
      var g = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px' });
      combos.forEach(function (c) {
        var id = 'axw-co-idi-' + c.lista.join('-');
        var r = el('input', { type: 'radio', id: id, name: 'axw-co-idiomas', value: c.lista.join(','), 'data-axw-campo': 'idiomas' });
        if (c.lista.join() === actual.join()) r.checked = true;
        g.appendChild(el('label', { for: id, 'data-axw-co-idiomas': c.lista.join(','), class: 'flex flex-col gap-1 rounded-2xl border border-outline-variant p-4', style: ALTO + ';cursor:pointer' }, [
          el('span', { class: 'flex items-center gap-2' }, [r, el('span', { class: CLS_ETQ, style: 'font-weight:600', text: U(c.t) })]),
          el('span', { class: CLS_NOTA, text: U(c.d) })]));
      });
      fs.appendChild(g); caja.appendChild(fs);
      if (!guardada) caja.appendChild(el('p', { class: CLS_NOTA, 'data-axw-co-nota': 'build', text: U('co_idi_build') }));
      if (!paqueteConId()) caja.appendChild(el('p', { class: CLS_AYUDA, 'data-axw-co-nota': 'solo-es', text: U('co_idi_solo_es') }));
      caja.appendChild(el('p', { class: CLS_AYUDA, text: U('co_idi_nota') }));
      return {
        valores: function () {
          var m = caja.querySelector('[data-axw-campo="idiomas"]:checked');
          var c = m && combos.filter(function (x) { return x.lista.join(',') === m.value; })[0];
          return c ? { ok: true, v: { lista: c.lista.slice() } } : { ok: false, error: U('elige') };
        }
      };
    },
    guarda: function (sb, v) {
      return resultado(sb.rpc('ajustes_config_guardar', { p_clave: 'idiomas', p_valor: v.lista })).then(function (r) {
        if (r.ok) apuntaEnNavegador(v.lista);
        return r;
      });
    },
    comprueba: function (v, ctx) { var g = listaGuardada(ctx); var ok = !!(g && g.join() === v.lista.join()); if (ok) apuntaEnNavegador(v.lista); return ok; }
  };

  // ── S13 · Correo de salida: MIRA el estado por la edge y lleva a Ajustes › Correo (ver la cabecera) ──────────────────────────────────────
  // Las respuestas de la edge que se dicen con frase propia; cualquier otra, «no se ha podido mirar» (nunca su texto ni su código)
  function sesion() {
    if (!window.LW_AUTH || typeof window.LW_AUTH.then !== 'function') return Promise.resolve(null);
    return window.LW_AUTH.then(function (a) { return a && a.sb ? a.sb : null; }, function () { return null; });
  }
  function estadoCorreo() {
    return sesion().then(function (sb) {
      if (!sb || !sb.auth || typeof sb.auth.getSession !== 'function') return { codigo: 'sin_sesion', d: null };
      return sb.auth.getSession().then(function (r) {
        var token = r && r.data && r.data.session && r.data.session.access_token;
        if (!token) return { codigo: 'sin_sesion', d: null };
        var url;
        try { url = window.lwEdge('ajustes-correo'); } catch (e) { return { codigo: 'edge_no_disponible', d: null }; }
        return fetch(url, {
          method: 'POST', cache: 'no-store', credentials: 'omit',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'apikey': window.LW_SB_KEY },
          body: JSON.stringify({ accion: 'estado' })
        }).then(function (resp) {
          return resp.text().then(function (t) {
            var d = null;
            try { d = JSON.parse(t); } catch (e) { d = null; }
            var cod = d && typeof d.codigo === 'string' && /^[a-z_]{3,40}$/.test(d.codigo) ? d.codigo : '';
            if (resp.ok && d && d.ok === true) return { codigo: '', d: d };
            return { codigo: cod || (resp.status === 404 || resp.status >= 500 ? 'edge_no_disponible' : 'respuesta_ilegible'), d: d };
          });
        }, function () { return { codigo: 'sin_red', d: null }; });
      }, function () { return { codigo: 'sin_sesion', d: null }; });
    });
  }
  function fecha(x) {
    var d = new Date(x), loc = typeof window.lwLocale === 'function' ? window.lwLocale() : 'es-ES';
    return isNaN(d) ? '' : d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function enlaceCorreo() { return RAIZ + 'ajustes/#correo'; }
  var correo = {
    externo: true,   // se hace en Ajustes › Correo; el asistente ofrece «Ya lo hice, comprobar»
    enlace: enlaceCorreo,
    pinta: function (caja, ctx) {
      var faltaDicha = !!(ctx && ctx.paso && ctx.paso.falta);   // el anfitrión ya enseña «sin servidor propio» (la falta sin_correo): no se repite
      var zona = el('div', { class: 'flex flex-col gap-3 min-w-0', 'data-axw-co': 'correo', role: 'status', 'aria-live': 'polite' }, [
        el('p', { class: CLS_NOTA, 'data-axw-co-estado': 'cargando', text: U('co_correo_cargando') })]);
      caja.appendChild(zona);
      estadoCorreo().then(function (r) {
        vacia(zona);
        if (r.codigo === 'codigo_no_disponible') {   // la edge ya dice que falta el secreto aunque la pregunta sea `estado` (por si cambia)
          zona.appendChild(el('p', { class: 'font-body-md text-body-md text-error', 'data-axw-co-estado': 'sin-clave', text: U('co_correo_sin_clave') }));
          return;
        }
        if (r.codigo === 'no_super_admin') { zona.appendChild(el('p', { class: 'font-body-md text-body-md text-on-surface', 'data-axw-co-estado': 'solo-admin', text: U('co_correo_solo_admin') })); return; }
        if (r.codigo || !r.d) {
          zona.appendChild(el('p', { class: 'font-body-md text-body-md text-error', 'data-axw-co-estado': 'fallo', text: U('co_correo_no_mirar') }));
          zona.appendChild(el('a', { href: enlaceCorreo(), class: CLS_BTN2, style: ALTO, 'data-axw-accion': 'abrir-correo', text: U('abrir', { pantalla: S.texto('paso', 'correo', 0) }) }));
          return;
        }
        var d = r.d, e = d.estado && typeof d.estado === 'object' ? d.estado : {}, rem = d.remitente && typeof d.remitente === 'object' ? d.remitente : {};
        if (e.configurado && typeof e.host === 'string') {
          zona.appendChild(el('p', { class: 'font-body-md text-body-md text-on-surface', 'data-axw-co-estado': 'servidor', text: U('co_correo_servidor', { h: e.host.slice(0, 253), u: texto(e.usuario).slice(0, 254) }) }));
          if (e.puesto_en && fecha(e.puesto_en)) zona.appendChild(el('p', { class: CLS_AYUDA, text: U('co_correo_puesto', { f: fecha(e.puesto_en) }) }));
        } else if (!faltaDicha) zona.appendChild(el('p', { class: 'font-body-md text-body-md text-on-surface', 'data-axw-co-estado': 'sin-servidor', text: U('co_correo_sin') }));
        var efectivo = typeof rem.efectivo === 'string' ? rem.efectivo.slice(0, 254) : '';
        if (efectivo && rem.motivo !== 'sin_remitente') zona.appendChild(el('p', { class: CLS_NOTA, 'data-axw-co-estado': 'remitente', text: U('co_correo_remitente', { r: efectivo }) }));
        else zona.appendChild(el('p', { class: CLS_NOTA, 'data-axw-co-estado': 'sin-remitente', text: U('co_correo_sin_remitente') }));
        if (d.envios_pausados === true) zona.appendChild(el('p', { class: 'font-body-sm text-body-sm text-error', 'data-axw-co-estado': 'pausa', text: U('co_correo_pausa') }));
        if (d.pide_codigo !== true) {   // sin el secreto del código (CORREO_CODIGO_PEPPER) no se puede cambiar nada: se dice y no se manda a un camino que fallaría
          zona.appendChild(el('p', { class: 'font-body-md text-body-md text-error', 'data-axw-co-estado': 'sin-clave', text: U('co_correo_sin_clave') }));
          return;
        }
        zona.appendChild(el('p', { class: CLS_AYUDA, text: U('co_correo_como') }));
        zona.appendChild(el('a', { href: enlaceCorreo(), class: CLS_BTN2, style: ALTO, 'data-axw-accion': 'abrir-correo', text: U('co_correo_abrir') }));
      });
      return { valores: function () { return { ok: true, v: {} }; } };
    },
    guarda: function () { return Promise.resolve({ ok: true, externo: true }); }
  };

  // ── S46 · Taller: revisiones, recambios y mecánicos (se hacen en su pantalla); proveedores y almacén, «Próximamente» ───────────────────────
  // La puerta del Taller (taller_orden_abre) exige revisiones y mecánico aunque para el módulo sean opcionales (doble de bbm-p28)
  var NECESARIO_TALLER = { taller_revisiones: 1, taller_mecanicos: 1 };
  function pasoTaller(clave, donde, txtComo, txtAbrir, proximos) {
    return {
      externo: true,
      enlace: function () { return RAIZ + donde; },
      pinta: function (caja) {
        var z = el('div', { class: 'flex flex-col gap-3 min-w-0', 'data-axw-co': clave });
        if (NECESARIO_TALLER[clave]) z.appendChild(el('span', { class: CLS_CHIP, 'data-axw-co-taller': 'necesario', text: U('co_taller_necesario') }));
        z.appendChild(el('p', { class: 'font-body-md text-body-md text-on-surface', text: U(txtComo) }));
        z.appendChild(el('a', { href: RAIZ + donde, class: CLS_BTN2, style: ALTO, 'data-axw-accion': 'abrir-externo', text: U(txtAbrir) }));
        z.appendChild(el('p', { class: CLS_AYUDA, text: U('co_taller_nota') }));
        if (proximos) {
          var ul = el('ul', { class: 'flex flex-col gap-2', role: 'list', 'data-axw-co-taller': 'proximos' });
          ['co_proveedores', 'co_almacen'].forEach(function (k) {
            ul.appendChild(el('li', { class: 'flex flex-wrap items-center gap-2 rounded-xl border border-outline-variant px-4 py-3', style: 'opacity:.6', 'aria-disabled': 'true' }, [
              el('span', { class: CLS_ETQ, text: U(k) }), el('span', { class: CLS_CHIP, text: U('co_proximamente') })]));
          });
          z.appendChild(ul);
        }
        caja.appendChild(z);
        return { valores: function () { return { ok: true, v: {} }; } };
      },
      guarda: function () { return Promise.resolve({ ok: true, externo: true }); }
    };
  }

  // ── N4 · Gastos: categorías de gasto (erp-setup, 14-oct-2026; agencia-81, opción A: el paso obligatorio de Bali Best tiene que poder hacerse) ──────
  // Lee las categorías con gastos_panel_datos (la lectura de la pantalla de Gastos: admin con la herramienta Gastos; p_limit 1, solo para las
  // categorías) y da de alta UNA por guardado con gasto_categoria_guarda(null, {nombre, grupo}): la clave la saca la base del nombre. Errores por
  // code + hint (nombre_repetido, nombre_no_valido, grupo_no_valido, 42501). Editar o desactivar sigue en la pantalla de Gastos.
  var GRUPOS_GASTO = ['general', 'suelo', 'construccion', 'comercial', 'marketing', 'personal', 'impuestos', 'financiero'];
  var BORRADOR_CAT = null;
  // Sugeridas (owner vía agencia-c0, 15-oct-2026: «¿por qué Expense categories es obligatorio?»): con CERO categorías, el paso propone una lista ya
  // hecha para el tipo de negocio, todas marcadas, y el botón principal dice «Usar estas». La lista la da LA BASE (agencia-c0, decisión por defecto:
  // «nada del ERP fuera de su base», como taller_lista_basica): gasto_categorias_sugeridas() → [{nombre, grupo}], con el nombre ya en los idiomas de
  // la instancia; la escribe Backend (bbm-resumen, 20261015190000). Si la base no la tiene o falla, el paso se queda con el campo libre de siempre.
  // Lo que llegue se vuelve a mirar aquí (nombre 1-80 sin = + - @ al principio, grupo de la lista, sin repetidos) y la base comprueba cada alta.
  function nombreValido(n) { return !!n && n.length <= 80 && !/^[=+\-@]/.test(n); }
  function sugeridas() {
    return sesion().then(function (sb) {
      if (!sb) return null;
      return resultado(sb.rpc('gasto_categorias_sugeridas')).then(function (r) { return r.ok ? r.data : null; });
    }).then(function (l) {
      if (!Array.isArray(l)) return null;
      var vistos = {};
      return l.map(function (e) {
        var n = e && typeof e === 'object' ? texto(e.nombre).trim() : '';
        if (!nombreValido(n) || vistos[n.toLowerCase()]) return null;
        vistos[n.toLowerCase()] = true;
        return { nombre: n, grupo: GRUPOS_GASTO.indexOf(e.grupo) >= 0 ? e.grupo : 'general' };
      }).filter(Boolean).slice(0, 20);
    });
  }
  var categoriasGasto = {
    sinMotivo: true,   // gasto_categoria_guarda no pide motivo (deja rastro en ajustes_log)
    pinta: function (caja, ctx) {
      var bc = BORRADOR_CAT, st = { hay: null };
      var z = el('div', { class: 'flex flex-col gap-4 min-w-0', 'data-axw-co': 'categorias_gasto' });
      var lista = el('ul', { class: 'flex flex-col gap-2', role: 'list', 'data-axw-n4-cat': 'lista', 'aria-busy': 'true' },
                     [el('li', { class: CLS_NOTA, text: U('n4_cat_cargando') })]);
      z.appendChild(el('p', { class: CLS_ETQ, text: U('n4_cat_lista') }));
      z.appendChild(lista);
      z.appendChild(el('p', { class: CLS_ETQ, text: U('n4_cat_nueva') }));
      campo(z, 'cat_nombre', U('n4_cat_nombre'), bc ? bc.nombre : '', { max: 80, ayuda: U('n4_cat_nombre_ayuda') });
      var sel = el('select', { id: 'axw-co-cat_grupo', 'data-axw-campo': 'cat_grupo', class: CLS_IN, style: ALTO });
      GRUPOS_GASTO.forEach(function (g) { var o = el('option', { value: g, text: U('n4_g_' + g) }); if ((bc ? bc.grupo : 'general') === g) o.selected = true; sel.appendChild(o); });
      z.appendChild(el('div', { class: 'flex flex-col gap-1.5 min-w-0', 'data-axw-fila': 'cat_grupo' }, [
        el('label', { for: 'axw-co-cat_grupo', class: CLS_ETQ, text: U('n4_cat_grupo') }), sel, el('span', { class: CLS_AYUDA, text: U('n4_cat_grupo_ayuda') })]));
      var otra = el('p', { class: CLS_AYUDA, 'data-axw-n4-cat': 'otra', hidden: true, text: U('n4_cat_otra') });
      z.appendChild(otra);
      caja.appendChild(z);
      var sug = null;   // con las sugeridas a la vista: { filas: [{nombre, grupo, chk}], propia }
      function pintaSugeridas(l) {
        // lo de siempre (lista vacía y campo libre) se esconde; a la vista, la lista como fichas y el botón principal «Usar estas»
        // display:none y no solo `hidden`: en la instancia no hay regla [hidden] y las filas llevan .flex, que le gana (advisor, 15-oct)
        [].forEach.call(z.children, function (n) { n.hidden = true; n.style.display = 'none'; });
        var bloque = el('div', { class: 'flex flex-col gap-3 min-w-0', 'data-axw-n4-cat': 'sugeridas' });
        bloque.appendChild(el('p', { class: CLS_ETQ, text: U('n4_sug_titulo') }));
        var fichas = el('ul', { class: 'flex flex-wrap gap-2', role: 'list', 'data-axw-n4-sug': 'fichas' });
        bloque.appendChild(fichas);
        bloque.appendChild(el('p', { class: CLS_AYUDA, text: U('n4_sug_ayuda') }));
        z.appendChild(bloque);
        var pl = S.plegado({ padre: bloque, marca: 'n4-sugeridas', rotulo: U('n4_sug_cambiar'), resumen: function () { return [U('n4_sug_n', { n: String(marcadas().length), t: String(l.length) })]; } });
        var filas = l.map(function (x, i) {
          var id = 'axw-co-sug-' + i, chk = el('input', { id: id, type: 'checkbox', 'data-axw-campo': 'sug_' + i, style: 'width:20px;height:20px;flex:none' });
          chk.checked = true;
          pl.cuerpo.appendChild(el('label', { for: id, class: 'flex items-center gap-3 min-w-0', style: ALTO + ';cursor:pointer' }, [chk,
            el('span', { class: 'font-body-md text-body-md text-on-surface min-w-0', style: 'overflow-wrap:anywhere', text: x.nombre })]));
          return { nombre: x.nombre, grupo: x.grupo, chk: chk };
        });
        var propia = campo(pl.cuerpo, 'sug_propia', U('n4_sug_propia'), '', { max: 80 });
        function marcadas() { return filas.filter(function (f) { return f.chk.checked; }); }
        function pintaFichas() {
          vacia(fichas);
          marcadas().map(function (f) { return f.nombre; }).concat(propia.value.trim() ? [propia.value.trim().slice(0, 80)] : []).forEach(function (n) {
            fichas.appendChild(el('li', { class: CLS_CHIP.replace('self-start ', ''), style: 'overflow-wrap:anywhere', text: n }));
          });
        }
        pl.cuerpo.addEventListener('input', pintaFichas); pl.cuerpo.addEventListener('change', pintaFichas);
        pintaFichas(); pl.actualiza();
        sug = { filas: filas, propia: propia, plegado: pl };
        caja.dispatchEvent(new CustomEvent('axw-boton', { bubbles: true, detail: U('n4_sug_usar') }));   // el anfitrión (asistente) cambia su botón principal
      }
      Promise.all([sesion().then(function (sb) {
        return sb ? resultado(sb.rpc('gastos_panel_datos', { p_limit: 1 })) : { ok: false };
      }), sugeridas().then(null, function () { return null; })]).then(function (xs) {
        var r = xs[0], l = xs[1];
        vacia(lista);
        lista.removeAttribute('aria-busy');
        var cats = r && r.ok && r.data && Array.isArray(r.data.categorias) ? r.data.categorias : null;
        if (!cats) {   // dice POR QUÉ (p. ej. sin la herramienta Gastos) con la frase de la base por code + hint, nunca su mensaje
          var por = r && r.error && (r.error.code || r.error.hint) ? S.explica(r.error, true).texto : '';   // explica() da {texto, configurar}
          lista.appendChild(el('li', { class: 'font-body-sm text-body-sm text-error', 'data-axw-n4-cat': 'error', text: U('n4_cat_no_carga') + (por ? ' ' + por : '') }));
          return;
        }
        st.hay = cats.some(function (c) { return c && c.activa === true; });
        if (!cats.length && l && l.length) { pintaSugeridas(l); return; }
        if (!cats.length) lista.appendChild(el('li', { class: CLS_NOTA, 'data-axw-n4-cat': 'ninguna', text: U('n4_cat_ninguna') }));
        cats.slice(0, 200).forEach(function (c) {
          var g = GRUPOS_GASTO.indexOf(texto(c.grupo)) >= 0 ? U('n4_g_' + c.grupo) : texto(c.grupo);
          lista.appendChild(el('li', { class: 'flex flex-wrap items-center gap-2 rounded-xl border border-outline-variant px-4 py-3 min-w-0', 'data-axw-n4-cat-clave': texto(c.clave).slice(0, 80) }, [
            el('span', { class: 'font-body-md text-body-md text-on-surface min-w-0', style: 'overflow-wrap:anywhere', text: texto(c.nombre).slice(0, 80) }),
            el('span', { class: CLS_CHIP, text: g.slice(0, 40) }),
            c.activa === true ? null : el('span', { class: CLS_CHIP, text: U('n4_cat_inactiva') })]));
        });
        if (st.hay) otra.hidden = false;
      });
      return {
        valores: function () {
          if (sug) {   // las sugeridas marcadas y la propia, si la hay; al menos una, como siempre
            var pr = sug.propia.value.trim(), lo = {}, l = [];
            if (pr && !nombreValido(pr)) { sug.plegado.abre(); return { ok: false, error: U('n4_cat_nombre_mal') }; }
            sug.filas.filter(function (f) { return f.chk.checked; }).map(function (f) { return { nombre: f.nombre, grupo: f.grupo }; })
              .concat(pr ? [{ nombre: pr, grupo: 'general' }] : []).forEach(function (c) { if (!lo[c.nombre.toLowerCase()]) { lo[c.nombre.toLowerCase()] = true; l.push(c); } });
            if (!l.length) { sug.plegado.abre(); return { ok: false, error: U('n4_sug_ninguna') }; }
            return { ok: true, v: { lista: l } };
          }
          var n = val(z, 'cat_nombre'), g = String(sel.value || 'general');
          BORRADOR_CAT = { nombre: n, grupo: g };
          if (!n) return st.hay ? { ok: true, v: {} } : { ok: false, error: U('n4_cat_falta') };
          // la misma regla que la base (20261014050000: contra la inyección en CSV), antes de llamar
          if (n.length > 80 || /^[=+\-@]/.test(n)) return { ok: false, error: U('n4_cat_nombre_mal') };
          return { ok: true, v: { nombre: n, grupo: GRUPOS_GASTO.indexOf(g) >= 0 ? g : 'general' } };
        }
      };
    },
    guarda: function (sb, v) {
      // las sugeridas: una por llamada, en orden, por la puerta de siempre. La primera que la base rechace para la cadena y sale su frase; las de
      // antes ya están (la relectura las enseña en la lista y el paso queda hecho con una). «Ya hay una con ese nombre» no es un error: ya está.
      if (v && Array.isArray(v.lista)) {
        return v.lista.reduce(function (p, c) {
          return p.then(function (r) {
            if (!r.ok) return r;
            return resultado(sb.rpc('gasto_categoria_guarda', { p_clave: null, p_datos: { nombre: c.nombre, grupo: c.grupo } })).then(function (x) {
              return !x.ok && x.error && x.error.hint === 'nombre_repetido' ? { ok: true } : conHint(x);
            });
          });
        }, Promise.resolve({ ok: true }));
      }
      if (!v || !v.nombre) return Promise.resolve({ ok: true });   // ya había categorías y no se escribió otra: nada que guardar
      return resultado(sb.rpc('gasto_categoria_guarda', { p_clave: null, p_datos: { nombre: v.nombre, grupo: v.grupo } })).then(function (r) {
        if (r.ok) BORRADOR_CAT = null;
        return conHint(r);
      });
    }
  };

  PS.registra('negocio', negocio);
  PS.registra('idiomas', idiomas);
  PS.registra('correo', correo);
  PS.registra('taller_revisiones', pasoTaller('taller_revisiones', 'taller/#listas', 'co_taller_listas', 'co_abrir_taller', false));
  PS.registra('taller_recambios', pasoTaller('taller_recambios', 'taller/#listas', 'co_taller_listas', 'co_abrir_taller', true));
  PS.registra('taller_mecanicos', pasoTaller('taller_mecanicos', 'usuarios/', 'co_taller_usuarios', 'co_abrir_usuarios', false));
  PS.registra('categorias_gasto', categoriasGasto);
})();
