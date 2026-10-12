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
      co_correo_como: 'El servidor, el remitente y la prueba se hacen en Ajustes › Correo: te mandamos un código a tu correo, pruebas el servidor con un envío real y solo si llega se guarda.',
      co_correo_abrir: 'Configurar el correo y enviar una prueba',
      co_correo_solo_admin: 'El correo de salida lo configura el administrador principal.',
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
    'El servidor, el remitente y la prueba se hacen en Ajustes › Correo: te mandamos un código a tu correo, pruebas el servidor con un envío real y solo si llega se guarda.': 'The server, the sender and the test are done in Settings › Email: we send a code to your email, you test the server with a real email, and it is saved only if it arrives.',
    'Configurar el correo y enviar una prueba': 'Set up email and send a test',
    'El correo de salida lo configura el administrador principal.': 'Outgoing email is set up by the main administrator.',
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
    'El servidor, el remitente y la prueba se hacen en Ajustes › Correo: te mandamos un código a tu correo, pruebas el servidor con un envío real y solo si llega se guarda.': 'Server, pengirim, dan uji coba diatur di Pengaturan › Email: kami mengirim kode ke email Anda, Anda menguji server dengan email sungguhan, dan baru tersimpan jika email itu sampai.',
    'Configurar el correo y enviar una prueba': 'Atur email dan kirim uji coba',
    'El correo de salida lo configura el administrador principal.': 'Email keluar diatur oleh admin utama.',
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

  PS.registra('negocio', negocio);
  PS.registra('idiomas', idiomas);
  PS.registra('correo', correo);
  PS.registra('taller_revisiones', pasoTaller('taller_revisiones', 'taller/#listas', 'co_taller_listas', 'co_abrir_taller', false));
  PS.registra('taller_recambios', pasoTaller('taller_recambios', 'taller/#listas', 'co_taller_listas', 'co_abrir_taller', true));
  PS.registra('taller_mecanicos', pasoTaller('taller_mecanicos', 'usuarios/', 'co_taller_usuarios', 'co_abrir_usuarios', false));
})();
