/* Pasos del setup de PROPIEDADES (erp-front, 14-oct-2026; contrato de erp-setup «encargo_front_pasos_propiedades.md», opción A de agencia-81):
 * tipos de vivienda (módulo proyectos), fases de obra (obra) y carta de reserva (reservas). Hasta hoy solo se rellenaban por SQL; sus funciones nacen
 * CERRADAS y el MISMO aterrizaje que trae estas pantallas abre su grant y siembra el paso (Backend, en la agencia). Nunca uno sin lo otro.
 * Va detrás de setup_pasos.js y se suma con AXW_PASOS.registra(): el MISMO componente en el asistente (/ajustes/configurar/) y en Ajustes ›
 * Configurar módulos. build.py lo pega solo en las instancias de tipo Propiedades.
 * Reglas (las del contrato): todo dato por textContent / value; enganches data-axw-campo / data-axw-pr-*; la función se nombra LITERAL (contrato_front);
 * el error se lee por code + hint con la frase de ESTA pieza (las mismas claves de hint significan cosas distintas en cada una, por eso no van al mapa
 * global de setup_modulos.js), y lo que no se conoce cae en AXW_SETUP.explica. Las frases en es, y en LW_EN / LW_ID por la frase en español.
 * Lecturas: las mismas tablas que ya leen datos.js y editores.js (el contrato lo admite); escrituras: solo las cuatro funciones del contrato.
 * Interfaz (setup_pasos.js): pinta(caja, ctx) → control { valores() → {ok, v} | {ok:false, error} } ; guarda(sb, v) → Promise<{ok} | {ok:false, error}>.
 */
(function () {
  'use strict';
  if (!window.AXW_SETUP || !window.AXW_PASOS || typeof window.AXW_PASOS.registra !== 'function') return;
  var S = window.AXW_SETUP, PS = window.AXW_PASOS;

  // ── Frases: es (la clave), en e id ────────────────────────────────────────────────────────────────────────────────────────────────────────
  var EN = {
    'Tipos que ya hay': 'Types already set up', 'Aún no hay ningún tipo.': 'There are no types yet.', 'Cargando…': 'Loading…',
    'Nuevo tipo de vivienda': 'New property type', 'Nombre': 'Name', 'Clave (la propone el nombre)': 'Key (suggested from the name)',
    'La clave no se cambia después: identifica el tipo en contratos y unidades.': "The key can't be changed later: it identifies the type in contracts and units.",
    'Parcela': 'Plot', 'Desactivar': 'Deactivate', 'Reactivar': 'Reactivate', 'Editar': 'Edit', 'Desactivado': 'Inactive',
    'Si ya tienes los que necesitas, deja el nombre vacío y sigue.': 'If you already have the ones you need, leave the name empty and continue.',
    'Escribe el nombre del primer tipo (por ejemplo, Parcela).': 'Write the name of the first type (for example, Plot).',
    'No se ha podido leer la lista: ': 'The list could not be read: ',
    'Fases que ya hay': 'Stages already set up', 'Aún no hay ninguna fase.': 'There are no stages yet.', 'Nueva fase de obra': 'New construction stage',
    'Editando la fase': 'Editing the stage', 'Nombre en español': 'Name in Spanish', 'Nombre en inglés': 'Name in English', 'Orden (1 a 1000)': 'Order (1 to 1000)',
    'Pago que dispara': 'Payment it triggers', 'Ninguno': 'None', 'Pago %n': 'Payment %n', 'Escribe el nombre de la primera fase.': 'Write the name of the first stage.',
    'Cancelar la edición': 'Cancel editing', 'Orden %n': 'Order %n',
    'Tipos de contrato': 'Contract types', '¿Cuál es la carta de reserva?': 'Which one is the reservation letter?',
    'Reserva': 'Reservation', 'Contrato': 'Contract', 'Ninguna': 'None', 'Etapa: %e': 'Stage: %e',
    'Cuidado: si ese tipo ya tiene contratos, su etapa no se puede cambiar después.': 'Careful: if that type already has contracts, its stage cannot be changed later.',
    'Aún no hay tipos de contrato activos: créalos en Plantillas.': 'There are no active contract types yet: create them in Templates.',
    'Elige el tipo que es la carta de reserva.': 'Choose the type that is the reservation letter.',
    'Hay %n tipos marcados como carta de reserva: %l. Puedes dejarlos así o elegir uno para confirmarlo.': 'There are %n types marked as the reservation letter: %l. You can leave them as they are or choose one to confirm it.',
    'Esto lo cambia un administrador con el permiso «Unidades» y la sesión abierta. Si ya lo eres, recarga la página y vuelve a entrar; si sigue igual, pídeselo al administrador principal.': 'This requires an administrator with the «Units» permission and an open session. If you are one, reload the page and sign in again; if nothing changes, ask the main administrator.',
    'Este módulo está apagado en este ERP: hasta que se encienda no se puede guardar aquí.': 'This module is switched off in this ERP: nothing can be saved here until it is switched on.',
    'La clave va en minúsculas, números y guion bajo (2 a 40).': 'The key uses lowercase letters, numbers and underscores (2 to 40).',
    'El nombre va de 1 a 60 caracteres.': 'The name must be 1 to 60 characters.',
    'Ese dato no se puede guardar aquí.': "That field can't be saved here.",
    'Esto lo cambia un administrador con el permiso «Obra» y la sesión abierta. Si ya lo eres, recarga la página y vuelve a entrar; si sigue igual, pídeselo al administrador principal.': 'This requires an administrator with the «Construction» permission and an open session. If you are one, reload the page and sign in again; if nothing changes, ask the main administrator.',
    'El nombre de la fase va de 1 a 60 caracteres.': 'The stage name must be 1 to 60 characters.',
    'El orden es un número de 1 a 1000.': 'The order is a number from 1 to 1000.',
    'El pago que dispara va del 1 al 5.': 'The payment it triggers goes from 1 to 5.',
    'Ya hay otra fase en ese orden.': 'Another stage already has that order.',
    'Hay unidades en esta fase o más adelante: su orden y el pago que dispara ya no se cambian.': 'Some units are at this stage or later: its order and the payment it triggers can no longer change.',
    'Esto lo cambia un administrador con el permiso «Plantillas» y la sesión abierta. Si ya lo eres, recarga la página y vuelve a entrar; si sigue igual, pídeselo al administrador principal.': 'This requires an administrator with the «Templates» permission and an open session. If you are one, reload the page and sign in again; if nothing changes, ask the main administrator.',
    'La etapa es reserva, contrato o ninguna.': 'The stage is reservation, contract or none.',
    'Ese tipo de contrato ya no existe.': 'That contract type no longer exists.',
    'Ese tipo ya tiene contratos: su etapa no se cambia (crea otro tipo).': "That type already has contracts: its stage can't change (create another type).",
    'El nombre no puede empezar por = + - @.': "The name can't start with = + - @.",
    'Ya hay un tipo con esa clave: cámbiala, o usa Editar en la lista.': 'A type with that key already exists: change it, or use Edit in the list.',
    'Editando el tipo': 'Editing the type',
    'Comisiones': 'Commissions', 'Interruptores de comisiones': 'Commission switches',
    'Dos reglas de todo el ERP. Solo las cambia el administrador principal y queda apuntado quién y cuándo.': 'Two rules for the whole ERP. Only the main administrator can change them, and who and when is recorded.',
    'Recalcular solas las comisiones cuando cambia un contrato': 'Recalculate commissions automatically when a contract changes',
    'Al emitir un contrato, exigir que se diga quién cerró la venta': 'When issuing a contract, require saying who closed the sale',
    'Guardar interruptores': 'Save switches', 'No has cambiado nada.': "You haven't changed anything.", 'Interruptores guardados.': 'Switches saved.',
    'Último cambio: %q, %c.': 'Last change: %q, %c.',
    'Aún no se ha podido leer la lista: hasta que se lea no se guarda nada aquí. Si no aparece, recarga la página.': "The list hasn't been read yet: nothing is saved here until it is. If it doesn't appear, reload the page.",
    'No se ha enviado nada: tu sesión no está activa. Recarga la página y vuelve a entrar.': 'Nothing was sent: your session is not active. Reload the page and sign in again.',
    'No se ha podido leer cómo están los interruptores: recarga la página.': "We couldn't read how the switches are set: reload the page.",
    'La base no ha respondido: no sabemos si se guardó. Recarga la página para verlo.': "The database didn't answer: we don't know if it was saved. Reload the page to see it.",
    'Solo el administrador principal cambia estos interruptores, con la sesión abierta. Si ya lo eres, recarga la página y vuelve a entrar.': 'Only the main administrator can change these switches, with an open session. If you are, reload the page and sign in again.',
    'Los interruptores son sí o no.': 'The switches are yes or no.'
  };
  var ID = {
    'Tipos que ya hay': 'Tipe yang sudah ada', 'Aún no hay ningún tipo.': 'Belum ada tipe.', 'Cargando…': 'Memuat…',
    'Nuevo tipo de vivienda': 'Tipe properti baru', 'Nombre': 'Nama', 'Clave (la propone el nombre)': 'Kunci (diusulkan dari nama)',
    'La clave no se cambia después: identifica el tipo en contratos y unidades.': 'Kunci tidak dapat diubah nanti: kunci ini menandai tipe di kontrak dan unit.',
    'Parcela': 'Kavling', 'Desactivar': 'Nonaktifkan', 'Reactivar': 'Aktifkan kembali', 'Editar': 'Ubah', 'Desactivado': 'Nonaktif',
    'Si ya tienes los que necesitas, deja el nombre vacío y sigue.': 'Jika yang dibutuhkan sudah ada, kosongkan nama dan lanjutkan.',
    'Escribe el nombre del primer tipo (por ejemplo, Parcela).': 'Tulis nama tipe pertama (misalnya, Kavling).',
    'No se ha podido leer la lista: ': 'Daftar tidak dapat dibaca: ',
    'Fases que ya hay': 'Tahap yang sudah ada', 'Aún no hay ninguna fase.': 'Belum ada tahap.', 'Nueva fase de obra': 'Tahap konstruksi baru',
    'Editando la fase': 'Mengubah tahap', 'Nombre en español': 'Nama dalam bahasa Spanyol', 'Nombre en inglés': 'Nama dalam bahasa Inggris', 'Orden (1 a 1000)': 'Urutan (1 sampai 1000)',
    'Pago que dispara': 'Pembayaran yang dipicu', 'Ninguno': 'Tidak ada', 'Pago %n': 'Pembayaran %n', 'Escribe el nombre de la primera fase.': 'Tulis nama tahap pertama.',
    'Cancelar la edición': 'Batalkan perubahan', 'Orden %n': 'Urutan %n',
    'Tipos de contrato': 'Jenis kontrak', '¿Cuál es la carta de reserva?': 'Mana yang merupakan surat booking?',
    'Reserva': 'Booking', 'Contrato': 'Kontrak', 'Ninguna': 'Tidak ada', 'Etapa: %e': 'Tahap: %e',
    'Cuidado: si ese tipo ya tiene contratos, su etapa no se puede cambiar después.': 'Hati-hati: jika jenis itu sudah memiliki kontrak, tahapnya tidak dapat diubah nanti.',
    'Aún no hay tipos de contrato activos: créalos en Plantillas.': 'Belum ada jenis kontrak aktif: buat di Templat.',
    'Elige el tipo que es la carta de reserva.': 'Pilih jenis yang merupakan surat booking.',
    'Hay %n tipos marcados como carta de reserva: %l. Puedes dejarlos así o elegir uno para confirmarlo.': 'Ada %n jenis yang ditandai sebagai surat booking: %l. Anda bisa membiarkannya atau memilih satu untuk mengonfirmasinya.',
    'Esto lo cambia un administrador con el permiso «Unidades» y la sesión abierta. Si ya lo eres, recarga la página y vuelve a entrar; si sigue igual, pídeselo al administrador principal.': 'Ini memerlukan administrator dengan izin «Unit» dan sesi yang aktif. Jika Anda administrator, muat ulang halaman dan masuk lagi; jika tetap sama, mintalah ke administrator utama.',
    'Este módulo está apagado en este ERP: hasta que se encienda no se puede guardar aquí.': 'Modul ini dimatikan di ERP ini: tidak ada yang bisa disimpan di sini sampai modul dinyalakan.',
    'La clave va en minúsculas, números y guion bajo (2 a 40).': 'Kunci memakai huruf kecil, angka, dan garis bawah (2 sampai 40).',
    'El nombre va de 1 a 60 caracteres.': 'Nama harus 1 sampai 60 karakter.',
    'Ese dato no se puede guardar aquí.': 'Data itu tidak dapat disimpan di sini.',
    'Esto lo cambia un administrador con el permiso «Obra» y la sesión abierta. Si ya lo eres, recarga la página y vuelve a entrar; si sigue igual, pídeselo al administrador principal.': 'Ini memerlukan administrator dengan izin «Konstruksi» dan sesi yang aktif. Jika Anda administrator, muat ulang halaman dan masuk lagi; jika tetap sama, mintalah ke administrator utama.',
    'El nombre de la fase va de 1 a 60 caracteres.': 'Nama tahap harus 1 sampai 60 karakter.',
    'El orden es un número de 1 a 1000.': 'Urutan adalah angka 1 sampai 1000.',
    'El pago que dispara va del 1 al 5.': 'Pembayaran yang dipicu antara 1 sampai 5.',
    'Ya hay otra fase en ese orden.': 'Sudah ada tahap lain dengan urutan itu.',
    'Hay unidades en esta fase o más adelante: su orden y el pago que dispara ya no se cambian.': 'Ada unit di tahap ini atau setelahnya: urutan dan pembayaran yang dipicu tidak dapat diubah lagi.',
    'Esto lo cambia un administrador con el permiso «Plantillas» y la sesión abierta. Si ya lo eres, recarga la página y vuelve a entrar; si sigue igual, pídeselo al administrador principal.': 'Ini memerlukan administrator dengan izin «Templat» dan sesi yang aktif. Jika Anda administrator, muat ulang halaman dan masuk lagi; jika tetap sama, mintalah ke administrator utama.',
    'La etapa es reserva, contrato o ninguna.': 'Tahapnya booking, kontrak, atau tidak ada.',
    'Ese tipo de contrato ya no existe.': 'Jenis kontrak itu sudah tidak ada.',
    'Ese tipo ya tiene contratos: su etapa no se cambia (crea otro tipo).': 'Jenis itu sudah memiliki kontrak: tahapnya tidak dapat diubah (buat jenis lain).',
    'El nombre no puede empezar por = + - @.': 'Nama tidak boleh diawali = + - @.',
    'Ya hay un tipo con esa clave: cámbiala, o usa Editar en la lista.': 'Sudah ada tipe dengan kunci itu: ubah kuncinya, atau gunakan Ubah di daftar.',
    'Editando el tipo': 'Mengubah tipe',
    'Comisiones': 'Komisi', 'Interruptores de comisiones': 'Sakelar komisi',
    'Dos reglas de todo el ERP. Solo las cambia el administrador principal y queda apuntado quién y cuándo.': 'Dua aturan untuk seluruh ERP. Hanya administrator utama yang dapat mengubahnya, dan siapa serta kapan dicatat.',
    'Recalcular solas las comisiones cuando cambia un contrato': 'Hitung ulang komisi secara otomatis saat kontrak berubah',
    'Al emitir un contrato, exigir que se diga quién cerró la venta': 'Saat menerbitkan kontrak, wajib menyebutkan siapa yang menutup penjualan',
    'Guardar interruptores': 'Simpan sakelar', 'No has cambiado nada.': 'Belum ada yang Anda ubah.', 'Interruptores guardados.': 'Sakelar tersimpan.',
    'Último cambio: %q, %c.': 'Perubahan terakhir: %q, %c.',
    'Aún no se ha podido leer la lista: hasta que se lea no se guarda nada aquí. Si no aparece, recarga la página.': 'Daftar belum terbaca: tidak ada yang disimpan di sini sampai terbaca. Jika tidak muncul, muat ulang halaman.',
    'No se ha enviado nada: tu sesión no está activa. Recarga la página y vuelve a entrar.': 'Tidak ada yang dikirim: sesi Anda tidak aktif. Muat ulang halaman dan masuk lagi.',
    'No se ha podido leer cómo están los interruptores: recarga la página.': 'Status sakelar tidak dapat dibaca: muat ulang halaman.',
    'La base no ha respondido: no sabemos si se guardó. Recarga la página para verlo.': 'Basis data tidak menjawab: kami tidak tahu apakah sudah tersimpan. Muat ulang halaman untuk melihatnya.',
    'Solo el administrador principal cambia estos interruptores, con la sesión abierta. Si ya lo eres, recarga la página y vuelve a entrar.': 'Hanya administrator utama yang dapat mengubah sakelar ini, dengan sesi yang aktif. Jika Anda administrator utama, muat ulang halaman dan masuk lagi.',
    'Los interruptores son sí o no.': 'Sakelar hanya ya atau tidak.'
  };
  function fusiona() {
    if (window.LW_EN && typeof window.LW_EN === 'object') Object.keys(EN).forEach(function (k) { if (!(k in window.LW_EN)) window.LW_EN[k] = EN[k]; });
    if (window.LW_ID && typeof window.LW_ID === 'object') Object.keys(ID).forEach(function (k) { if (!(k in window.LW_ID)) window.LW_ID[k] = ID[k]; });
  }
  fusiona();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fusiona);

  // ── Ayudas ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  function T(f, h) { var v = typeof window.lwT === 'function' ? window.lwT(f) : String(f); Object.keys(h || {}).forEach(function (k) { v = v.split('%' + k).join(h[k]); }); return v; }
  function el(tag, attrs, hijos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null || attrs[k] === false) return; if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k] === true ? '' : attrs[k]); });
    (hijos || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function vacia(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }
  var CLS_IN = 'w-full rounded-lg border border-control-border/50 bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md';
  var CLS_ETQ = 'font-label-md text-label-md text-on-surface';
  var CLS_AYUDA = 'font-body-sm text-body-sm text-on-surface-variant';
  var CLS_ERR = 'font-body-sm text-body-sm text-error';
  var CLS_BTN2 = 'inline-flex items-center justify-center px-4 py-2 rounded-full border border-outline-variant font-label-md text-label-md text-deep-lagoon';
  var CLS_CHIP = 'inline-flex items-center px-3 py-1 rounded-full border border-outline-variant font-label-md text-[12px] text-on-surface-variant';
  var CLS_FILA = 'flex flex-wrap items-center gap-2 rounded-xl border border-outline-variant px-4 py-3 min-w-0';
  function campo(caja, k, etiqueta, valor, o) {
    o = o || {};
    var id = 'axw-pr-' + k;
    var inp = o.opciones ? el('select', { id: id, 'data-axw-campo': k, class: CLS_IN, style: 'min-height:44px' })
                         : el('input', { id: id, type: o.tipo || 'text', inputmode: o.modo || null, 'data-axw-campo': k, autocomplete: 'off', maxlength: String(o.max || 60), spellcheck: 'false', class: CLS_IN });
    (o.opciones || []).forEach(function (op) { var x = el('option', { value: op[0], text: op[1] }); if (String(valor) === String(op[0])) x.selected = true; inp.appendChild(x); });
    if (!o.opciones && valor != null) inp.value = String(valor);
    caja.appendChild(el('div', { class: 'flex flex-col gap-1.5 min-w-0', 'data-axw-fila': k }, [el('label', { for: id, class: CLS_ETQ, text: etiqueta }), inp,
      o.ayuda ? el('span', { class: CLS_AYUDA, text: o.ayuda }) : null]));
    return inp;
  }
  function texto(x) { return typeof x === 'string' ? x : (x == null ? '' : String(x)); }
  function sesion() {
    if (!window.LW_AUTH || typeof window.LW_AUTH.then !== 'function') return Promise.resolve(null);
    return window.LW_AUTH.then(function (a) { return a && a.sb ? a.sb : null; }, function () { return null; });
  }
  function resultado(p) {
    return new Promise(function (ok) { ok(p); }).then(function (r) {
      if (!r) return { ok: false, sinRespuesta: true, error: { message: 'sin respuesta' } };
      if (r.error) return { ok: false, sinRespuesta: !r.error.code, error: r.error };
      return { ok: true, data: r.data };
    }, function (e) { return { ok: false, sinRespuesta: !(e && e.code), error: e || {} }; });
  }
  // Una lectura *_datos por window.lwDatos (llega después de guard.js: se espera hasta 20 s), con la misma forma que resultado()
  function datos(nombre) {
    return new Promise(function (ok) {
      var desde = Date.now();
      (function espera() {
        if (typeof window.lwDatos === 'function') return ok(resultado(window.lwDatos(nombre)));
        if (Date.now() - desde > 20000) return ok({ ok: false, sinRespuesta: true, error: { message: 'sin lwDatos' } });
        setTimeout(espera, 50);
      })();
    });
  }
  // El error con la frase de ESTA pieza (por code + hint); lo que no está en su tabla, a AXW_SETUP.explica (que nunca enseña el mensaje de la base)
  function frase(tabla, err) {
    var e = err || {}, c = e.code == null ? '' : String(e.code), h = e.hint == null ? '' : String(e.hint);
    var f = tabla[c + '/' + h] || tabla[c];
    return f ? T(f) : S.explica(e, true).texto;
  }
  // Un error conocido pasa al anfitrión con un hint propio cuya frase ya está traducida: así su barra de estado dice lo mismo que esta pieza
  function conFrase(tabla, r) {
    if (r.ok || r.sinRespuesta) return r;
    var e = r.error || {}, c = e.code == null ? '' : String(e.code), h = e.hint == null ? '' : String(e.hint);
    if (!(tabla[c + '/' + h] || tabla[c])) return r;
    var clave = 'axw_pr_' + (c + '_' + h).replace(/[^a-z0-9_]/gi, '_');
    S.TEXTOS.hint = S.TEXTOS.hint || {};
    S.TEXTOS.hint[clave] = tabla[c + '/' + h] || tabla[c];
    return { ok: false, error: { code: c, hint: clave, message: e.message } };
  }
  // La clave que propone el nombre: minúsculas sin tildes, números y guion bajo; empieza por letra; 2 a 40 (la regla de la base)
  function clave(nombre) {
    var k = String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[0-9_]+/, '');
    return k.slice(0, 40);
  }
  var CLAVE_OK = /^[a-z][a-z0-9_]{1,39}$/;
  // Lo tecleado sobrevive a que el anfitrión vuelva a pintar el paso tras un error (como BORRADOR_CAT en setup_comun.js); se borra al guardar bien
  var BORRADOR = { tipos: null, fases: null, carta: null };
  function nombreMal(n, max) { return !n || n.length > max || /^[=+\-@]/.test(n); }

  // ── 1 · Tipos de vivienda (módulo proyectos, obligatorio) ─────────────────────────────────────────────────────────────────────────────────
  var ERR_TIPO = {
    '42501': 'Esto lo cambia un administrador con el permiso «Unidades» y la sesión abierta. Si ya lo eres, recarga la página y vuelve a entrar; si sigue igual, pídeselo al administrador principal.',   // es_admin + herramienta Unidades (puerta de Seguridad, 14-oct)
    '42501/modulo_apagado': 'Este módulo está apagado en este ERP: hasta que se encienda no se puede guardar aquí.',
    '22023/clave_no_valida': 'La clave va en minúsculas, números y guion bajo (2 a 40).',
    '22023/nombre_no_valido': 'El nombre va de 1 a 60 caracteres.',
    '22023/campo_desconocido': 'Ese dato no se puede guardar aquí.'
  };
  var tiposVivienda = {
    sinMotivo: true,   // tipo_vivienda_guarda deja su rastro en ajustes_log; no pide motivo
    pinta: function (caja, ctx) {
      var bt = BORRADOR.tipos, st = { hay: null, tipos: [], editando: bt ? bt.editando : null, claveTocada: bt ? bt.claveTocada : false };
      var z = el('div', { class: 'flex flex-col gap-4 min-w-0', 'data-axw-pr': 'tipos_vivienda' });
      var lista = el('ul', { class: 'flex flex-col gap-2', role: 'list', 'data-axw-pr-lista': 'tipos', 'aria-busy': 'true' }, [el('li', { class: CLS_AYUDA, text: T('Cargando…') })]);
      var msg = el('p', { class: CLS_ERR, 'data-axw-pr-error': 'tipos', role: 'alert', hidden: true });
      z.appendChild(el('p', { class: CLS_ETQ, text: T('Tipos que ya hay') }));
      z.appendChild(lista);
      z.appendChild(msg);
      var tit = el('p', { class: CLS_ETQ, 'data-axw-pr': 'tipo-titulo', text: T('Nuevo tipo de vivienda') });
      z.appendChild(tit);
      var nom = campo(z, 'tv_etiqueta', T('Nombre'), bt ? bt.nombre : '', { max: 60 });
      var cla = campo(z, 'tv_clave', T('Clave (la propone el nombre)'), bt ? bt.clave : '', { max: 40, ayuda: T('La clave no se cambia después: identifica el tipo en contratos y unidades.') });
      var cancela = el('button', { type: 'button', class: CLS_BTN2, style: 'min-height:44px;align-self:flex-start', 'data-axw-pr-accion': 'tipo-cancelar', hidden: true, text: T('Cancelar la edición') });
      z.appendChild(cancela);
      var otra = el('p', { class: CLS_AYUDA, 'data-axw-pr': 'tipos-otra', hidden: true, text: T('Si ya tienes los que necesitas, deja el nombre vacío y sigue.') });
      z.appendChild(otra);
      function limpia() { BORRADOR.tipos = null; st.editando = null; st.claveTocada = false; nom.value = ''; cla.value = ''; cla.disabled = false; tit.textContent = T('Nuevo tipo de vivienda'); cancela.hidden = true; }
      cancela.addEventListener('click', limpia);
      function edita(t) {
        st.editando = t.clave; nom.value = texto(t.etiqueta); cla.value = t.clave; cla.disabled = true;   // la clave no se cambia: identifica el tipo en unidades
        tit.textContent = T('Editando el tipo') + ': ' + texto(t.etiqueta).slice(0, 60); cancela.hidden = false; nom.focus();
      }
      if (st.editando) { cla.disabled = true; tit.textContent = T('Editando el tipo') + ': ' + String(nom.value).slice(0, 60); cancela.hidden = false; }
      nom.addEventListener('input', function () { if (!st.claveTocada && !st.editando) cla.value = clave(nom.value); });
      cla.addEventListener('input', function () { st.claveTocada = true; });
      caja.appendChild(z);
      function pintaLista() {
        vacia(lista);
        if (!st.tipos.length) lista.appendChild(el('li', { class: CLS_AYUDA, 'data-axw-pr-lista-vacia': 'tipos', text: T('Aún no hay ningún tipo.') }));
        st.tipos.slice(0, 200).forEach(function (t) {
          var b = el('button', { type: 'button', class: CLS_BTN2, style: 'min-height:44px', 'data-axw-pr-accion': t.activo === true ? 'tipo-desactivar' : 'tipo-reactivar', 'data-axw-pr-clave': texto(t.clave),
            text: T(t.activo === true ? 'Desactivar' : 'Reactivar') });
          b.addEventListener('click', function () { cambiaActivo(t, b); });
          var be = el('button', { type: 'button', class: CLS_BTN2, style: 'min-height:44px', 'data-axw-pr-accion': 'tipo-editar', 'data-axw-pr-clave': texto(t.clave), text: T('Editar') });
          be.addEventListener('click', function () { edita(t); });
          lista.appendChild(el('li', { class: CLS_FILA, 'data-axw-pr-tipo': texto(t.clave).slice(0, 40) }, [
            el('span', { class: 'font-body-md text-body-md text-on-surface min-w-0', style: 'overflow-wrap:anywhere', text: texto(t.etiqueta).slice(0, 60) }),
            el('span', { class: CLS_CHIP, text: texto(t.clave).slice(0, 40) }),
            t.activo === true ? null : el('span', { class: CLS_CHIP, text: T('Desactivado') }), be, b]));
        });
        st.hay = st.tipos.some(function (t) { return t && t.activo === true; });
        otra.hidden = !st.hay;
        // la primera vez se ofrece «parcela»: es el tipo que unidad_guarda pone por defecto
        if (!st.tipos.length && !nom.value && !bt) { nom.value = T('Parcela'); cla.value = 'parcela'; }
      }
      function lee() {
        return sesion().then(function (sb) {
          return sb ? resultado(sb.from('tipos_vivienda').select('clave,etiqueta,activo').order('etiqueta').limit(200)) : { ok: false, error: {} };
        }).then(function (r) {
          lista.removeAttribute('aria-busy');
          if (!r.ok || !Array.isArray(r.data)) { vacia(lista); lista.appendChild(el('li', { class: CLS_ERR, 'data-axw-pr-lista-error': 'tipos', text: T('No se ha podido leer la lista: ') + frase(ERR_TIPO, r.error) })); return; }
          st.tipos = r.data.filter(function (t) { return t && typeof t.clave === 'string'; });
          st.leido = true;
          pintaLista();
        });
      }
      function cambiaActivo(t, b) {
        b.disabled = true; msg.hidden = true;
        sesion().then(function (sb) { return sb ? resultado(sb.rpc('tipo_vivienda_guarda', { p_clave: t.clave, p_datos: { activo: t.activo !== true } })) : { ok: false, error: {} }; })
          .then(function (r) { b.disabled = false; if (r.ok) return lee(); msg.textContent = frase(ERR_TIPO, r.error); msg.hidden = false; });
      }
      lee();
      return {
        valores: function () {
          var n = String(nom.value || '').trim(), k = String(cla.value || '').trim();
          BORRADOR.tipos = { nombre: nom.value, clave: cla.value, claveTocada: st.claveTocada, editando: st.editando };
          if (!st.leido) return { ok: false, error: T('Aún no se ha podido leer la lista: hasta que se lea no se guarda nada aquí. Si no aparece, recarga la página.') };   // sin la lista, el control de clave repetida no frena nada
          if (!n) return st.hay && !st.editando ? { ok: true, v: {} } : { ok: false, error: T(st.editando ? 'El nombre va de 1 a 60 caracteres.' : 'Escribe el nombre del primer tipo (por ejemplo, Parcela).') };
          if (/^[=+\-@]/.test(n)) return { ok: false, error: T('El nombre no puede empezar por = + - @.') };
          if (nombreMal(n, 60)) return { ok: false, error: T('El nombre va de 1 a 60 caracteres.') };
          if (st.editando) return { ok: true, v: { clave: st.editando, datos: { etiqueta: n } } };
          if (!CLAVE_OK.test(k)) return { ok: false, error: T('La clave va en minúsculas, números y guion bajo (2 a 40).') };
          // tipo_vivienda_guarda ACTUALIZA si la clave ya existe: un alta con una clave repetida pisaría el nombre (y reactivaría) otro tipo
          if (st.tipos.some(function (t) { return t.clave === k; })) return { ok: false, error: T('Ya hay un tipo con esa clave: cámbiala, o usa Editar en la lista.') };
          return { ok: true, v: { clave: k, datos: { etiqueta: n, activo: true } } };
        }
      };
    },
    guarda: function (sb, v) {
      if (!v || !v.clave) { BORRADOR.tipos = null; return Promise.resolve({ ok: true }); }   // ya había tipos activos y no se escribió otro
      return resultado(sb.rpc('tipo_vivienda_guarda', { p_clave: v.clave, p_datos: v.datos })).then(function (r) { if (r.ok) BORRADOR.tipos = null; return conFrase(ERR_TIPO, r); });
    },
    // sin respuesta no se da por guardado aunque el paso ya estuviera hecho; reenviar es seguro (revisor erp-front-propiedades)
    comprueba: function () { return false; }
  };

  // ── 2 · Fases de obra (módulo obra, obligatorio) ──────────────────────────────────────────────────────────────────────────────────────────
  var ERR_FASE = {
    '42501': 'Esto lo cambia un administrador con el permiso «Obra» y la sesión abierta. Si ya lo eres, recarga la página y vuelve a entrar; si sigue igual, pídeselo al administrador principal.',   // es_admin + herramienta Obra (puerta de Seguridad, 14-oct)
    '42501/modulo_apagado': 'Este módulo está apagado en este ERP: hasta que se encienda no se puede guardar aquí.',
    '22023/clave_no_valida': 'La clave va en minúsculas, números y guion bajo (2 a 40).',
    '22023/nombre_no_valido': 'El nombre de la fase va de 1 a 60 caracteres.',
    '22023/orden_no_valido': 'El orden es un número de 1 a 1000.',
    '22023/orden_pago_no_valido': 'El pago que dispara va del 1 al 5.',
    '23505/orden_ocupado': 'Ya hay otra fase en ese orden.',
    '55000/fase_en_uso': 'Hay unidades en esta fase o más adelante: su orden y el pago que dispara ya no se cambian.',
    '22023/campo_desconocido': 'Ese dato no se puede guardar aquí.'
  };
  var fasesObra = {
    sinMotivo: true,
    pinta: function (caja, ctx) {
      var bf = BORRADOR.fases, st = { fases: [], editando: bf ? bf.editando : null };
      var z = el('div', { class: 'flex flex-col gap-4 min-w-0', 'data-axw-pr': 'fases_obra' });
      var lista = el('ul', { class: 'flex flex-col gap-2', role: 'list', 'data-axw-pr-lista': 'fases', 'aria-busy': 'true' }, [el('li', { class: CLS_AYUDA, text: T('Cargando…') })]);
      z.appendChild(el('p', { class: CLS_ETQ, text: T('Fases que ya hay') }));
      z.appendChild(lista);
      var tit = el('p', { class: CLS_ETQ, 'data-axw-pr': 'fase-titulo', text: T('Nueva fase de obra') });
      z.appendChild(tit);
      var es = campo(z, 'fo_es', T('Nombre en español'), bf ? bf.es : '', { max: 60 });
      var en = campo(z, 'fo_en', T('Nombre en inglés'), bf ? bf.en : '', { max: 60 });
      var orden = campo(z, 'fo_orden', T('Orden (1 a 1000)'), bf ? bf.orden : '', { max: 4, modo: 'numeric' });
      var pagos = [['', T('Ninguno')]].concat([1, 2, 3, 4, 5].map(function (n) { return [String(n), T('Pago %n', { n: n })]; }));
      var pago = campo(z, 'fo_orden_pago', T('Pago que dispara'), bf ? bf.pago : '', { opciones: pagos });
      var cancela = el('button', { type: 'button', class: CLS_BTN2, style: 'min-height:44px;align-self:flex-start', 'data-axw-pr-accion': 'fase-cancelar', hidden: true, text: T('Cancelar la edición') });
      z.appendChild(cancela);
      var otra = el('p', { class: CLS_AYUDA, 'data-axw-pr': 'fases-otra', hidden: true, text: T('Si ya tienes los que necesitas, deja el nombre vacío y sigue.') });
      z.appendChild(otra);
      caja.appendChild(z);
      if (st.editando) { tit.textContent = T('Editando la fase') + ': ' + String(es.value).slice(0, 60); cancela.hidden = false; }
      function siguiente() { return Math.min(1000, st.fases.reduce(function (m, f) { return Math.max(m, Number(f.orden) || 0); }, 0) + 1); }
      function limpia() { BORRADOR.fases = null; st.editando = null; es.value = ''; en.value = ''; orden.value = String(siguiente()); pago.value = ''; tit.textContent = T('Nueva fase de obra'); cancela.hidden = true; }
      cancela.addEventListener('click', limpia);
      function edita(f) {
        st.editando = f.clave; es.value = texto(f.es); en.value = texto(f.en); orden.value = String(f.orden); pago.value = f.orden_pago == null ? '' : String(f.orden_pago);
        tit.textContent = T('Editando la fase') + ': ' + texto(f.es).slice(0, 60); cancela.hidden = false; es.focus();
      }
      function lee() {
        return sesion().then(function (sb) {
          if (!sb) return [{ ok: false, error: {} }];
          return Promise.all([resultado(sb.from('obra_fases').select('clave,es,en,orden').order('orden').limit(500)),
                              resultado(sb.from('obra_fase_orden_pago').select('obra_fase_clave,orden_pago').limit(500))]);
        }).then(function (rs) {
          lista.removeAttribute('aria-busy');
          vacia(lista);
          var a = rs[0], b = rs[1] || { ok: false, error: {} };
          if (!a.ok || !Array.isArray(a.data) || !b.ok || !Array.isArray(b.data)) {
            lista.appendChild(el('li', { class: CLS_ERR, 'data-axw-pr-lista-error': 'fases', text: T('No se ha podido leer la lista: ') + frase(ERR_FASE, (a.ok ? b : a).error) })); return;
          }
          var pagoDe = {};
          b.data.forEach(function (x) { if (x && typeof x.obra_fase_clave === 'string') pagoDe[x.obra_fase_clave] = x.orden_pago; });
          st.leido = true;
          st.fases = a.data.filter(function (f) { return f && typeof f.clave === 'string'; }).map(function (f) { return { clave: f.clave, es: f.es, en: f.en, orden: f.orden, orden_pago: f.clave in pagoDe ? pagoDe[f.clave] : null }; });
          if (!st.fases.length) lista.appendChild(el('li', { class: CLS_AYUDA, 'data-axw-pr-lista-vacia': 'fases', text: T('Aún no hay ninguna fase.') }));
          st.fases.forEach(function (f) {
            var b2 = el('button', { type: 'button', class: CLS_BTN2, style: 'min-height:44px', 'data-axw-pr-accion': 'fase-editar', 'data-axw-pr-clave': f.clave, text: T('Editar') });
            b2.addEventListener('click', function () { edita(f); });
            lista.appendChild(el('li', { class: CLS_FILA, 'data-axw-pr-fase': f.clave.slice(0, 40) }, [
              el('span', { class: CLS_CHIP, text: T('Orden %n', { n: texto(f.orden) }) }),
              el('span', { class: 'font-body-md text-body-md text-on-surface min-w-0', style: 'overflow-wrap:anywhere', text: (window.LW_IDIOMA === 'es' ? texto(f.es) : texto(f.en) || texto(f.es)).slice(0, 60) }),
              f.orden_pago == null ? null : el('span', { class: CLS_CHIP, text: T('Pago %n', { n: texto(f.orden_pago) }) }), b2]));
          });
          otra.hidden = !st.fases.length;
          if (!st.editando && !(bf && bf.orden)) orden.value = String(siguiente());
        });
      }
      lee();
      return {
        valores: function () {
          var e = String(es.value || '').trim(), i = String(en.value || '').trim(), o = String(orden.value || '').trim(), p = String(pago.value || '');
          BORRADOR.fases = { es: es.value, en: en.value, orden: orden.value, pago: p, editando: st.editando };
          if (!st.leido) return { ok: false, error: T('Aún no se ha podido leer la lista: hasta que se lea no se guarda nada aquí. Si no aparece, recarga la página.') };
          if (!e && !i && !st.editando) return st.fases.length ? { ok: true, v: {} } : { ok: false, error: T('Escribe el nombre de la primera fase.') };
          if (/^[=+\-@]/.test(e) || /^[=+\-@]/.test(i)) return { ok: false, error: T('El nombre no puede empezar por = + - @.') };
          if (nombreMal(e, 60) || nombreMal(i, 60)) return { ok: false, error: T('El nombre de la fase va de 1 a 60 caracteres.') };
          if (!/^\d{1,4}$/.test(o) || Number(o) < 1 || Number(o) > 1000) return { ok: false, error: T('El orden es un número de 1 a 1000.') };
          var k = st.editando || clave(e);
          if (!CLAVE_OK.test(k)) return { ok: false, error: T('La clave va en minúsculas, números y guion bajo (2 a 40).') };
          if (!st.editando) {   // obra_fase_guarda ACTUALIZA si la clave ya existe: un alta con el nombre de otra fase la pisaría
            var usadas = {}, base = k.slice(0, 36), n = 2;
            st.fases.forEach(function (f) { usadas[f.clave] = 1; });
            while (usadas[k] && n < 1000) k = base + '_' + (n++);
          }
          return { ok: true, v: { clave: k, datos: { es: e, en: i, orden: Number(o), orden_pago: p ? Number(p) : null } } };
        }
      };
    },
    guarda: function (sb, v) {
      if (!v || !v.clave) { BORRADOR.fases = null; return Promise.resolve({ ok: true }); }
      return resultado(sb.rpc('obra_fase_guarda', { p_clave: v.clave, p_datos: v.datos })).then(function (r) { if (r.ok) BORRADOR.fases = null; return conFrase(ERR_FASE, r); });
    },
    // sin respuesta no se da por guardado aunque el paso ya estuviera hecho; reenviar es seguro (revisor erp-front-propiedades)
    comprueba: function () { return false; }
  };

  // ── 3 · Carta de reserva (módulo reservas, obligatorio): qué tipo de contrato es la reserva ───────────────────────────────────────────────
  var ERR_CARTA = {
    '42501': 'Esto lo cambia un administrador con el permiso «Plantillas» y la sesión abierta. Si ya lo eres, recarga la página y vuelve a entrar; si sigue igual, pídeselo al administrador principal.',
    '42501/modulo_apagado': 'Este módulo está apagado en este ERP: hasta que se encienda no se puede guardar aquí.',
    '22023/etapa_no_valida': 'La etapa es reserva, contrato o ninguna.',
    'P0002': 'Ese tipo de contrato ya no existe.',
    '55000/tipo_con_contratos': 'Ese tipo ya tiene contratos: su etapa no se cambia (crea otro tipo).'
  };
  var ETAPA = { reserva: 'Reserva', contrato: 'Contrato', ninguna: 'Ninguna' };
  var cartaReserva = {
    sinMotivo: true,
    pinta: function (caja, ctx) {
      var st = { tipos: null, actual: null, reservas: [], leido: false };
      var z = el('div', { class: 'flex flex-col gap-4 min-w-0', 'data-axw-pr': 'carta_reserva' });
      var lista = el('ul', { class: 'flex flex-col gap-2', role: 'list', 'data-axw-pr-lista': 'carta', 'aria-busy': 'true' }, [el('li', { class: CLS_AYUDA, text: T('Cargando…') })]);
      z.appendChild(el('p', { class: CLS_ETQ, text: T('Tipos de contrato') }));
      z.appendChild(lista);
      var cont = el('div', { class: 'flex flex-col gap-3 min-w-0', 'data-axw-pr': 'carta-eleccion' });
      z.appendChild(cont);
      z.appendChild(el('p', { class: CLS_AYUDA, 'data-axw-pr': 'carta-aviso', role: 'note', text: T('Cuidado: si ese tipo ya tiene contratos, su etapa no se puede cambiar después.') }));
      caja.appendChild(z);
      var sel = null;
      // tipos_contrato no tiene SELECT para el navegador: el catálogo llega por plantillas_contrato_datos (la lectura de /plantillas/, por lwDatos)
      sesion().then(function (sb) {
        if (!sb) return [{ ok: false, error: {} }];
        return Promise.all([datos('plantillas_contrato_datos').then(function (r) {
                              return r.ok && r.data && Array.isArray(r.data.tipos) ? { ok: true, data: r.data.tipos.filter(function (t) { return t && t.activo === true; }) } : (r.ok ? { ok: false, error: {} } : r);
                            }),
                            resultado(sb.from('contrato_tipo_etapa').select('tipo,etapa').limit(500))]);
      }).then(function (rs) {
        lista.removeAttribute('aria-busy');
        vacia(lista);
        var a = rs[0], b = rs[1] || { ok: false, error: {} };
        if (!a.ok || !Array.isArray(a.data) || !b.ok || !Array.isArray(b.data)) {
          lista.appendChild(el('li', { class: CLS_ERR, 'data-axw-pr-lista-error': 'carta', text: T('No se ha podido leer la lista: ') + frase(ERR_CARTA, (a.ok ? b : a).error) })); return;
        }
        var etapa = {};
        b.data.forEach(function (x) { if (x && typeof x.tipo === 'string') etapa[x.tipo] = x.etapa; });
        st.tipos = a.data.filter(function (t) { return t && typeof t.clave === 'string'; });
        st.leido = true;
        if (!st.tipos.length) { lista.appendChild(el('li', { class: CLS_AYUDA, 'data-axw-pr-lista-vacia': 'carta', text: T('Aún no hay tipos de contrato activos: créalos en Plantillas.') })); return; }
        st.tipos.forEach(function (t) {
          var e = etapa[t.clave] || 'ninguna';
          if (e === 'reserva') st.reservas.push(t.clave);
          lista.appendChild(el('li', { class: CLS_FILA, 'data-axw-pr-carta': t.clave.slice(0, 48) }, [
            el('span', { class: 'font-body-md text-body-md text-on-surface min-w-0', style: 'overflow-wrap:anywhere', text: texto(t.nombre).slice(0, 80) }),
            el('span', { class: CLS_CHIP, text: T('Etapa: %e', { e: T(ETAPA[e] || ETAPA.ninguna) }) })]));
        });
        // con UNA en «reserva» se preselecciona; con varias no se marca ninguna como si fuera la única: se dice cuáles son (revisor erp-front-propiedades, BAJA)
        if (st.reservas.length === 1) st.actual = st.reservas[0];
        if (st.reservas.length > 1) {
          var nombres = st.tipos.filter(function (t) { return st.reservas.indexOf(t.clave) >= 0; }).map(function (t) { return texto(t.nombre).slice(0, 80); }).join(', ');
          cont.appendChild(el('p', { class: CLS_AYUDA, 'data-axw-pr': 'carta-varias', role: 'note', text: T('Hay %n tipos marcados como carta de reserva: %l. Puedes dejarlos así o elegir uno para confirmarlo.', { n: String(st.reservas.length), l: nombres }) }));
        }
        sel = campo(cont, 'cr_tipo', T('¿Cuál es la carta de reserva?'), BORRADOR.carta || st.actual || '', { opciones: [['', '—']].concat(st.tipos.map(function (t) { return [t.clave, texto(t.nombre).slice(0, 80)]; })) });
      });
      return {
        valores: function () {
          if (!st.leido) return { ok: false, error: T('Aún no se ha podido leer la lista: hasta que se lea no se guarda nada aquí. Si no aparece, recarga la página.') };
          if (!st.tipos.length) return { ok: false, error: T('Aún no hay tipos de contrato activos: créalos en Plantillas.') };
          var k = sel ? String(sel.value || '') : '';
          if (sel) BORRADOR.carta = k;
          if (!k) return st.reservas.length ? { ok: true, v: {} } : { ok: false, error: T('Elige el tipo que es la carta de reserva.') };   // ya hay carta de reserva: nada que guardar
          if (st.reservas.indexOf(k) >= 0) return { ok: true, v: {} };   // ese ya es carta de reserva: nada que guardar
          return { ok: true, v: { tipo: k } };
        }
      };
    },
    guarda: function (sb, v) {
      if (!v || !v.tipo) { BORRADOR.carta = null; return Promise.resolve({ ok: true }); }
      return resultado(sb.rpc('contrato_tipo_etapa_guarda', { p_tipo: v.tipo, p_etapa: 'reserva' })).then(function (r) { if (r.ok) BORRADOR.carta = null; return conFrase(ERR_CARTA, r); });
    },
    // sin respuesta no se da por guardado aunque el paso ya estuviera hecho; reenviar es seguro (revisor erp-front-propiedades)
    comprueba: function () { return false; }
  };

  // ── 4 · Ajustes › Comisiones: los dos interruptores (no es paso del asistente) ───────────────────────────────────────────────────────────
  // build.py pone la pestaña data-lw-tab="comisiones" OCULTA y su panel #lw-aj-comisiones. Se enseña solo si la base dice puede_editar
  // (es_super_admin): a nadie más le sirve una pantalla de dos interruptores que no puede tocar. Se guarda SOLO lo que cambia.
  var ERR_INT = {
    '42501': 'Solo el administrador principal cambia estos interruptores, con la sesión abierta. Si ya lo eres, recarga la página y vuelve a entrar.',
    '42501/modulo_apagado': 'Este módulo está apagado en este ERP: hasta que se encienda no se puede guardar aquí.',
    '22023/campo_desconocido': 'Los interruptores son sí o no.'
  };
  var INTERRUPTORES = [['recalculo_auto', 'Recalcular solas las comisiones cuando cambia un contrato'], ['modo_obligatorio', 'Al emitir un contrato, exigir que se diga quién cerró la venta']];
  function formaInt(d) { return d && typeof d === 'object' && typeof d.recalculo_auto === 'boolean' && typeof d.modo_obligatorio === 'boolean' && typeof d.puede_editar === 'boolean'; }
  function comisiones() {
    var panel = document.getElementById('lw-aj-comisiones'), tab = document.querySelector('[data-lw-tab="comisiones"]');
    if (!panel || !tab) return;
    datos('comisiones_interruptor_datos').then(function (r) {
      if (!r.ok || !formaInt(r.data) || r.data.puede_editar !== true) return;   // sin la lectura o sin ser el principal: la pestaña sigue oculta
      tab.hidden = false;
      if (typeof window.lwIdiomaAplicar === 'function') { try { window.lwIdiomaAplicar(tab); window.lwIdiomaAplicar(panel.closest('[data-lw-panel]') || panel); } catch (e) { /* MUDO A PROPOSITO: traducir no tumba la pestaña */ } }
      var sec = panel.closest('[data-lw-panel]');
      if (location.hash === '#comisiones' && sec && sec.hidden) tab.click();
      pintaInt(panel, r.data);
    });
  }
  function pintaInt(panel, d) {
    vacia(panel);
    var caja = el('div', { class: 'flex flex-col gap-4 min-w-0', style: 'padding:24px clamp(16px,3vw,32px)', 'data-axw-pr': 'comisiones' });
    caja.appendChild(el('p', { class: CLS_AYUDA, text: T('Dos reglas de todo el ERP. Solo las cambia el administrador principal y queda apuntado quién y cuándo.') }));
    var casillas = {};
    INTERRUPTORES.forEach(function (x) {
      var id = 'axw-pr-int-' + x[0];
      var c = el('input', { type: 'checkbox', id: id, 'data-axw-campo': x[0], style: 'width:20px;height:20px;flex:none' });
      c.checked = d[x[0]] === true;
      casillas[x[0]] = c;
      caja.appendChild(el('label', { for: id, class: CLS_FILA, style: 'min-height:44px;cursor:pointer', 'data-axw-fila': x[0] }, [c, el('span', { class: 'font-body-md text-body-md text-on-surface min-w-0', style: 'overflow-wrap:anywhere', text: T(x[1]) })]));
    });
    if (d.cambiado_en) {
      var cuando = String(d.cambiado_en);
      try { cuando = new Date(d.cambiado_en).toLocaleString(typeof window.lwLocale === 'function' ? window.lwLocale() : undefined); } catch (e) { cuando = String(d.cambiado_en); }
      caja.appendChild(el('p', { class: CLS_AYUDA, 'data-axw-pr': 'comisiones-ultimo', text: T('Último cambio: %q, %c.', { q: texto(d.cambiado_por).slice(0, 120) || '—', c: cuando }) }));
    }
    var est = el('p', { role: 'status', 'aria-live': 'polite', class: CLS_AYUDA, 'data-axw-pr': 'comisiones-estado' });
    var g = el('button', { type: 'button', class: CLS_BTN2, style: 'min-height:44px;align-self:flex-start', 'data-axw-pr-accion': 'comisiones-guardar', text: T('Guardar interruptores') });
    caja.appendChild(g); caja.appendChild(est);
    panel.appendChild(caja);
    function dice(t, mal) { est.className = mal ? CLS_ERR : CLS_AYUDA; est.textContent = t; }
    g.addEventListener('click', function () {
      var q = {};
      INTERRUPTORES.forEach(function (x) { if (casillas[x[0]].checked !== (d[x[0]] === true)) q[x[0]] = casillas[x[0]].checked; });
      if (!Object.keys(q).length) { dice(T('No has cambiado nada.'), true); return; }
      g.disabled = true; dice(T('Cargando…'), false);
      sesion().then(function (sb) { return sb ? resultado(sb.rpc('comisiones_interruptor_guarda', { p_datos: q })) : { ok: false, sinSesion: true, error: {} }; }).then(function (r) {
        g.disabled = false;
        if (r.ok && r.data && typeof r.data.recalculo_auto === 'boolean' && typeof r.data.modo_obligatorio === 'boolean') {
          d.recalculo_auto = r.data.recalculo_auto; d.modo_obligatorio = r.data.modo_obligatorio;   // lo que devuelve la base manda
          INTERRUPTORES.forEach(function (x) { casillas[x[0]].checked = d[x[0]]; });
          var ult = panel.querySelector('[data-axw-pr="comisiones-ultimo"]'); if (ult) ult.remove();   // el último cambio ya es este
          dice(T('Interruptores guardados.'), false); return;
        }
        if (r.sinSesion) { dice(T('No se ha enviado nada: tu sesión no está activa. Recarga la página y vuelve a entrar.'), true); return; }
        if (r.ok || r.sinRespuesta) { dice(T('La base no ha respondido: no sabemos si se guardó. Recarga la página para verlo.'), true); return; }
        dice(frase(ERR_INT, r.error), true);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', comisiones); else comisiones();

  PS.registra('tipos_vivienda', tiposVivienda);
  PS.registra('fases_obra', fasesObra);
  PS.registra('carta_reserva', cartaReserva);
})();
