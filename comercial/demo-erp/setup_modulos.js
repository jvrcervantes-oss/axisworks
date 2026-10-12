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

  // ── Textos: código → frase (es). Lista cerrada; un código que no esté sale como «… (código: x)» traducido y se cuenta. ───────────────
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
      usuarios: ['Quién lo usa', 'Las personas del equipo que trabajan con este módulo.']
    },
    falta: {
      sin_sociedad: 'Falta dar de alta la empresa que emite las facturas.',
      sin_prefijo: 'Falta el prefijo de la numeración.',
      falta_dato: 'Falta completar: %campos.',
      sin_usuarios: 'Nadie del equipo tiene asignado este módulo.'
    },
    campo: {
      prefijo_serie: 'prefijo de la numeración', reservas_sin_impuesto: 'si cobra impuesto', precio_incluye_impuesto: 'precio con impuesto dentro o fuera',
      sede: 'punto de entrega', precio_km: 'precio por kilómetro', moneda: 'moneda'
    },
    // hint de la base → frase. `<m>_sin_configurar` se resuelve aparte (lleva el nombre del módulo).
    hint: {
      sin_prefijo: 'La empresa no tiene prefijo de numeración: no se puede emitir la factura todavía.',
      prefijo_fijo: 'El prefijo ya no se puede cambiar: hay facturas emitidas con él.',
      moneda_con_datos: 'La moneda ya no se puede cambiar: hay tarifas, reservas o facturas en otra moneda.',
      moneda_no_permitida: 'Esa moneda no está en la lista que admite el ERP.',
      falta_confirmo: 'Este cambio no se puede deshacer: hay que confirmarlo antes de guardar.',
      cuenta_pruebas_solo_mira: 'Esta es una cuenta de pruebas: puede mirar, no cambiar nada.',
      modulo_apagado: 'Este módulo no está encendido en este ERP.',
      impuesto_no_configurado: 'Falta configurar el impuesto de las reservas.'
    },
    general: {
      sin_configurar_admin: '%m aún no está configurado.',
      sin_configurar_resto: 'Este módulo aún no está listo: lo está configurando el administrador.',
      sin_permiso: 'Tu sesión no tiene permiso para esto.',
      no_existe: 'Esta función todavía no está disponible en este ERP.',
      red: 'El ERP no ha respondido: prueba otra vez en un rato.',
      forma: 'El ERP ha devuelto algo inesperado.',
      configurar: 'Configurar',
      aviso_uno: '%m: sin configurar',
      aviso_varios: '%n módulos sin configurar: %lista',
      ahora_no: 'Ahora no',
      desconocido: 'Paso sin nombre (código: %c)',
      error_codigo: 'No se pudo hacer (código: %c).'
    }
  };

  // EN e ID, indexados por la frase en español (el patrón de ajustes_puesta.js). Glosario id: glosario_id.json (test_idiomas_instancia.py).
  var EN = {
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
    '%m aún no está configurado.': '%m is not set up yet.',
    'Este módulo aún no está listo: lo está configurando el administrador.': 'This module is not ready yet: the administrator is setting it up.',
    'Tu sesión no tiene permiso para esto.': 'Your session does not have permission for this.',
    'Esta función todavía no está disponible en este ERP.': 'This function is not available in this ERP yet.',
    'El ERP no ha respondido: prueba otra vez en un rato.': 'The ERP did not respond: try again in a moment.',
    'El ERP ha devuelto algo inesperado.': 'The ERP returned something unexpected.',
    'Configurar': 'Set up', '%m: sin configurar': '%m: not set up', '%n módulos sin configurar: %lista': '%n modules not set up: %lista', 'Ahora no': 'Not now', 'Paso sin nombre (código: %c)': 'Unnamed step (code: %c)', 'No se pudo hacer (código: %c).': 'It could not be done (code: %c).'
  };
  var ID = {
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
    '%m aún no está configurado.': '%m belum diatur.',
    'Este módulo aún no está listo: lo está configurando el administrador.': 'Modul ini belum siap: admin sedang mengaturnya.',
    'Tu sesión no tiene permiso para esto.': 'Akun Anda tidak punya izin untuk ini.',
    'Esta función todavía no está disponible en este ERP.': 'Fungsi ini belum tersedia di ERP ini.',
    'El ERP no ha respondido: prueba otra vez en un rato.': 'ERP tidak merespons: coba lagi sebentar lagi.',
    'El ERP ha devuelto algo inesperado.': 'ERP mengembalikan data yang tidak terduga.',
    'Configurar': 'Atur', '%m: sin configurar': '%m: belum diatur', '%n módulos sin configurar: %lista': '%n modul belum diatur: %lista', 'Ahora no': 'Nanti saja', 'Paso sin nombre (código: %c)': 'Langkah tanpa nama (kode: %c)', 'No se pudo hacer (código: %c).': 'Tidak bisa dilakukan (kode: %c).'
  };

  function T(x, huecos) {
    if (typeof window.lwT === 'function') return window.lwT(x, huecos);
    var v = String(x);
    if (huecos) Object.keys(huecos).forEach(function (k) { v = v.split('%' + k).join(huecos[k]); });
    return v;
  }
  var desconocidos = [];   // códigos que la base mandó y este mapa no tiene: el test y el arnés los cuentan
  function apunta(tipo, c) { var k = tipo + ':' + c; if (desconocidos.indexOf(k) < 0) desconocidos.push(k); }

  /* frase(tipo, código) → la clave en español; texto(...) → ya traducida. Nunca devuelve el código pelado ni una frase de la base. */
  function frase(tipo, codigo, parte) {
    var grupo = TEXTOS[tipo] || {}, v = grupo[codigo];
    if (v == null) { apunta(tipo, codigo); return null; }
    return Array.isArray(v) ? v[parte || 0] : v;
  }
  function texto(tipo, codigo, parte) {
    var f = frase(tipo, codigo, parte);
    return f == null ? T(TEXTOS.general.desconocido, { c: String(codigo) }) : T(f);
  }
  function nombreModulo(m) {
    var f = frase('modulo', m);
    if (f != null) return T(f);
    var n = window.AXW_MAPA_MODULOS && window.AXW_MAPA_MODULOS.n && window.AXW_MAPA_MODULOS.n[m];   // el rótulo del registro (apagados_instancia.js)
    return n && n[0] ? T(String(n[0])) : T(TEXTOS.general.desconocido, { c: String(m) });
  }
  // «Falta completar: precio por kilómetro, punto de entrega» — la lista de campos también va por códigos
  function textoFalta(f) {
    if (!f || typeof f !== 'object') return '';
    var campos = (Array.isArray(f.campos) ? f.campos : []).map(function (c) { return texto('campo', c); }).join(', ');
    var fr = frase('falta', f.codigo);
    if (fr == null) return T(TEXTOS.general.desconocido, { c: String(f.codigo) });
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
    if (h) apunta('hint', h);
    return { texto: T(TEXTOS.general.error_codigo, { c: c || h || '—' }), configurar: null };
  }

  function fusiona() {
    if (window.LW_EN && typeof window.LW_EN === 'object') Object.keys(EN).forEach(function (k) { if (!(k in window.LW_EN)) window.LW_EN[k] = EN[k]; });
    if (window.LW_ID && typeof window.LW_ID === 'object') Object.keys(ID).forEach(function (k) { if (!(k in window.LW_ID)) window.LW_ID[k] = ID[k]; });
  }
  fusiona();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fusiona);   // i18n.js puede llegar después (defer)

  window.AXW_SETUP = {
    estado: estado, moneda: moneda, explica: explica, texto: texto, nombreModulo: nombreModulo, textoFalta: textoFalta,
    formaValida: formaValida, desconocidos: desconocidos, TEXTOS: TEXTOS, EN: EN, ID: ID
  };
})();
