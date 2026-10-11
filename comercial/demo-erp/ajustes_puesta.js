/* Ajustes › Puesta en marcha (ERP maestro, 11-oct-2026; plan único F8). Brief literal del owner: «Datos del gestor: se meten en el ERP. En Ajustes. Encender
 * facturas. Tras meterlos en el ERP que se pueda activar. Haz un setup en el ERP y tras el setup que funcione.»
 * build.py (ajustes_puesta_en_marcha) pone en /ajustes/ de las instancias con `"portada": "reservas"` la pestaña y su contenedor (#lw-aj-puesta) y carga este fichero;
 * en Lawang no existe. Qué hace:
 *  · pinta los pasos que devuelve `puesta_en_marcha_datos()` TAL CUAL los decide la base (hecho / pendiente, el detalle y dónde se hace): la pantalla no
 *    deduce si un paso está hecho;
 *  · deja elegir ahí mismo dos ajustes de sí/no (`precio_incluye_impuesto`, `reservas_sin_impuesto`) y los guarda por `ajustes_config_guardar`, una clave por
 *    botón. Quién puede escribir lo decide la base (super admin, 42501 si no); la pantalla solo no ofrece lo que la base va a rechazar (`puede_escribir`).
 *  · una clave que la base no trae es «sin decidir», nunca «no».
 * Todo dato de la base se pinta con textContent / createElement. Se engancha por data-accion / data-pm, nunca por un rótulo.
 */
(function () {
  'use strict';

  var EN_PM = {
    'Puesta en marcha': 'Setup',
    'Lo que hace falta para empezar a facturar, en orden': 'What is needed to start invoicing, in order',
    'Cada paso dice si está hecho y dónde se hace. Cuando estén todos, ya puedes encender Facturas.': 'Each step says whether it is done and where it is done. When they are all done, you can switch Invoices on.',
    'Hecho': 'Done', 'Pendiente': 'Pending', 'Dónde': 'Where', 'Ir': 'Go',
    'Sociedad emisora: razón social, domicilio y NPWP': 'Issuing company: legal name, address and NPWP',
    'Impuesto que se aplica a las reservas': 'Tax applied to bookings',
    'Precio con el impuesto dentro o fuera': 'Price with tax included or added',
    'Encender el módulo Sociedades': 'Switch on the Companies module', 'Encender el módulo Facturas': 'Switch on the Invoices module',
    'Encender el módulo Operaciones': 'Switch on the Operations module', 'Encender el módulo Recibos': 'Switch on the Receipts module',
    'Los precios de la tarifa': 'Rate prices', 'Llevan el impuesto DENTRO (el cliente paga el precio de la tarifa)': 'Include the tax (the customer pays the rate price)',
    'Llevan el impuesto FUERA (se suma al precio de la tarifa)': 'Exclude the tax (it is added to the rate price)',
    '¿Las reservas llevan PPN?': 'Do bookings carry VAT (PPN)?', 'Sí: la sociedad es PKP y cobra PPN': 'Yes: the company is PKP and charges VAT (PPN)',
    'No: la sociedad no es PKP': 'No: the company is not PKP',
    'Sin decidir': 'Not decided', 'Guardar': 'Save', 'Guardando…': 'Saving…', 'Guardado.': 'Saved.', 'Sin cambios: ya valía eso.': 'No change: it already had that value.',
    'No se guardó': 'Not saved', 'Elige una opción antes de guardar.': 'Choose an option before saving.',
    'Solo el super admin puede cambiar estos ajustes.': 'Only the super admin can change these settings.',
    'Listo: ya puedes encender Facturas.': 'Ready: you can switch Invoices on.',
    'Faltan %n pasos.': '%n steps left.', 'Falta 1 paso.': '1 step left.',
    'Trayendo la puesta en marcha…': 'Loading the setup…',
    'No se ha podido mirar la puesta en marcha': 'The setup could not be checked',
    'Esta función todavía no está disponible en esta base.': 'This function is not available on this database yet.',
    'La puesta en marcha es de administración: tu sesión no tiene acceso.': 'The setup is for administration: your session has no access.',
    'La base no ha respondido: prueba otra vez en un rato.': 'The database did not respond: try again in a moment.',
    'La base ha devuelto algo inesperado.': 'The database returned something unexpected.',
    'Prueba de precio: una moto real, 1 y 10 días': 'Price check: a real bike, 1 and 10 days',
    'Reintentar': 'Retry', 'panel de control del estudio': "the studio's control panel"
  };
  // Indonesio (owner, 11-oct-2026: bbm en indonesio e inglés). Misma clave en español que EN_PM; se fusiona en window.LW_ID solo donde existe (bbm).
  var ID_PM = {
    'Puesta en marcha': 'Pengaturan awal',
    'Lo que hace falta para empezar a facturar, en orden': 'Yang perlu disiapkan sebelum mulai membuat faktur, berurutan',
    'Cada paso dice si está hecho y dónde se hace. Cuando estén todos, ya puedes encender Facturas.': 'Setiap langkah menunjukkan apakah sudah selesai dan di mana mengerjakannya. Jika semuanya selesai, modul Faktur bisa diaktifkan.',
    'Hecho': 'Selesai', 'Pendiente': 'Belum', 'Dónde': 'Di mana', 'Ir': 'Buka',
    'Sociedad emisora: razón social, domicilio y NPWP': 'Perusahaan penerbit faktur: nama badan usaha, alamat, dan NPWP',
    'Impuesto que se aplica a las reservas': 'Pajak yang dikenakan pada booking',
    'Precio con el impuesto dentro o fuera': 'Harga sudah termasuk pajak atau belum',
    'Encender el módulo Sociedades': 'Aktifkan modul Perusahaan', 'Encender el módulo Facturas': 'Aktifkan modul Faktur',
    'Encender el módulo Operaciones': 'Aktifkan modul Transaksi', 'Encender el módulo Recibos': 'Aktifkan modul Kuitansi',
    'Prueba de precio: una moto real, 1 y 10 días': 'Cek harga: satu motor sungguhan, 1 dan 10 hari',
    'Los precios de la tarifa': 'Harga di tarif',
    'Llevan el impuesto DENTRO (el cliente paga el precio de la tarifa)': 'SUDAH termasuk pajak (pelanggan membayar sesuai harga tarif)',
    'Llevan el impuesto FUERA (se suma al precio de la tarifa)': 'BELUM termasuk pajak (pajak ditambahkan ke harga tarif)',
    '¿Las reservas llevan PPN?': 'Apakah booking dikenakan PPN?', 'Sí: la sociedad es PKP y cobra PPN': 'Ya: perusahaan berstatus PKP dan memungut PPN',
    'No: la sociedad no es PKP': 'Tidak: perusahaan bukan PKP',
    'Sin decidir': 'Belum ditentukan', 'Guardar': 'Simpan', 'Guardando…': 'Menyimpan…', 'Guardado.': 'Tersimpan.', 'Sin cambios: ya valía eso.': 'Tidak ada perubahan: nilainya sudah sama.',
    'No se guardó': 'Tidak tersimpan', 'Elige una opción antes de guardar.': 'Pilih salah satu sebelum menyimpan.',
    'Solo el super admin puede cambiar estos ajustes.': 'Hanya super admin yang dapat mengubah pengaturan ini.',
    'Listo: ya puedes encender Facturas.': 'Siap: modul Faktur sudah bisa diaktifkan.',
    'Faltan %n pasos.': 'Masih %n langkah lagi.', 'Falta 1 paso.': 'Masih 1 langkah lagi.',
    'Trayendo la puesta en marcha…': 'Memuat pengaturan awal…',
    'No se ha podido mirar la puesta en marcha': 'Pengaturan awal tidak dapat diperiksa',
    'Esta función todavía no está disponible en esta base.': 'Fungsi ini belum tersedia di database ini.',
    'La puesta en marcha es de administración: tu sesión no tiene acceso.': 'Pengaturan awal khusus admin: akun Anda tidak punya akses.',
    'La base no ha respondido: prueba otra vez en un rato.': 'Database tidak merespons: coba lagi sebentar lagi.',
    'La base ha devuelto algo inesperado.': 'Database mengembalikan data yang tidak terduga.',
    'Reintentar': 'Coba lagi', 'panel de control del estudio': 'panel kontrol studio'
  };
  var TITULOS = {
    sociedad: 'Sociedad emisora: razón social, domicilio y NPWP',
    impuesto: 'Impuesto que se aplica a las reservas',
    precio_incluye_impuesto: 'Precio con el impuesto dentro o fuera',
    modulo_sociedades: 'Encender el módulo Sociedades', modulo_facturas: 'Encender el módulo Facturas',
    modulo_operaciones: 'Encender el módulo Operaciones', modulo_recibos: 'Encender el módulo Recibos',
    cotizacion: 'Prueba de precio: una moto real, 1 y 10 días'
  };
  // Los dos sí/no que se eligen aquí. El valor que se guarda es el que la base espera ('si' | 'no'); el rótulo dice lo que significa para quien lo elige.
  var ELECCIONES = [
    { clave: 'precio_incluye_impuesto', pregunta: 'Los precios de la tarifa',
      opciones: [['si', 'Llevan el impuesto DENTRO (el cliente paga el precio de la tarifa)'], ['no', 'Llevan el impuesto FUERA (se suma al precio de la tarifa)']] },
    { clave: 'reservas_sin_impuesto', pregunta: '¿Las reservas llevan PPN?',
      opciones: [['no', 'Sí: la sociedad es PKP y cobra PPN'], ['si', 'No: la sociedad no es PKP']] }
  ];

  function T(x, huecos) { return (typeof window.lwT === 'function') ? window.lwT(x, huecos) : x; }
  function h(tag, attrs, hijos) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    (hijos || []).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function vacia(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function aviso(t) { if (typeof window.toast === 'function') window.toast(t); }
  function falla(err) {
    var e = err || {}, m = String(e.message || '');
    if (e.code === 'PGRST202' || e.status === 404 || /Could not find the function|schema cache/i.test(m)) return T('Esta función todavía no está disponible en esta base.');
    if (e.code === '42501') return T('La puesta en marcha es de administración: tu sesión no tiene acceso.');
    if (!e.code && (!m || /failed to fetch|network|load failed|timeout/i.test(m))) return T('La base no ha respondido: prueba otra vez en un rato.');
    return m || T('La base no ha respondido: prueba otra vez en un rato.');
  }

  var sb = null, ocupado = false;
  function cont() { return document.getElementById('lw-aj-puesta'); }
  function chip(hecho) {
    return h('span', { class: 'shrink-0 px-3 py-1 rounded-full font-label-md text-[13px] ' + (hecho ? 'bg-primary-container text-on-primary' : 'bg-error-container text-on-error-container'),
                       'data-pm-hecho': hecho ? '1' : '0', text: T(hecho ? 'Hecho' : 'Pendiente') });
  }
  function donde(d) {
    if (!d) return null;
    var s = String(d);
    if (/^\/[a-z0-9\-\/]*$/i.test(s)) return h('a', { class: 'underline text-deep-lagoon', href: s, text: T('Ir') + ': ' + s });
    return h('span', { text: T('Dónde') + ': ' + T(s) });
  }
  function eleccion(e, valores, puede) {
    var tiene = Object.prototype.hasOwnProperty.call(valores, e.clave) && valores[e.clave] != null && valores[e.clave] !== '';
    var actual = tiene ? String(valores[e.clave]) : '';
    var id = 'lw-pm-' + e.clave;
    var sel = h('select', { id: id, 'data-pm-valor': e.clave, class: 'w-full rounded-lg border border-control-border/50 bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md' });
    sel.style.maxWidth = '100%';   // una opción larga (en indonesio) no puede ensanchar la página a 390 px
    if (!puede) sel.setAttribute('disabled', '');
    if (!tiene || ['si', 'no'].indexOf(actual) < 0) sel.appendChild(h('option', { value: '', text: T('Sin decidir') }));
    e.opciones.forEach(function (o) { sel.appendChild(h('option', { value: o[0], text: T(o[1]) })); });
    sel.value = ['si', 'no'].indexOf(actual) >= 0 ? actual : '';
    var fila = h('div', { class: 'flex flex-col md:flex-row md:items-center gap-3 pt-2', 'data-pm-fila': e.clave }, [
      h('label', { for: id, class: 'font-label-md text-label-md text-on-surface', text: T(e.pregunta) }), sel]);
    if (puede) fila.appendChild(h('button', { type: 'button', 'data-real': '', 'data-accion': 'pm-guardar', 'data-pm-clave': e.clave,
                                              class: 'shrink-0 px-4 py-2 rounded-full bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md', text: T('Guardar') }));
    fila.appendChild(h('span', { class: 'font-body-sm text-body-sm text-outline', role: 'status', 'aria-live': 'polite', 'data-pm-estado': e.clave }));
    return fila;
  }
  function pinta(pasos, ajustes) {
    var c = cont(); if (!c) return;
    vacia(c);
    var valores = (ajustes && ajustes.valores) || {}, puede = !!(ajustes && ajustes.puede_escribir);
    var faltan = pasos.filter(function (p) { return p.hecho !== true; }).length;
    c.appendChild(h('p', { class: 'px-8 py-4 font-body-md text-body-md ' + (faltan ? 'text-on-surface' : 'text-deep-lagoon font-semibold'), role: 'status', 'data-pm': 'resumen',
                           text: faltan ? (faltan === 1 ? T('Falta 1 paso.') : T('Faltan %n pasos.', { n: faltan })) : T('Listo: ya puedes encender Facturas.') }));
    var ol = h('ol', { class: 'flex flex-col list-none', 'data-pm': 'pasos' });
    pasos.forEach(function (p, i) {
      var clave = String(p.clave || '');
      var texto = h('div', { class: 'flex flex-col gap-1 min-w-0' }, [
        h('span', { class: 'font-label-md text-label-md text-on-surface', text: (i + 1) + '. ' + (TITULOS[clave] ? T(TITULOS[clave]) : clave) }),
        p.detalle ? h('span', { class: 'font-body-sm text-body-sm text-outline break-words', text: String(p.detalle) }) : null,
        donde(p.donde)]);
      var li = h('li', { class: 'px-8 py-4 flex flex-col gap-2 border-b border-outline-variant/30', 'data-pm-paso': clave }, [
        h('div', { class: 'flex items-start justify-between gap-4' }, [texto, chip(p.hecho === true)])]);
      ELECCIONES.forEach(function (e) { if (e.clave === clave) li.appendChild(eleccion(e, valores, puede)); });
      ol.appendChild(li);
    });
    // la elección que no tenga paso propio (p. ej. «¿lleva PPN?») va con el del impuesto, o al final si la base no da ese paso
    ELECCIONES.forEach(function (e) {
      if (ol.querySelector('[data-pm-fila="' + e.clave + '"]')) return;
      var ancla = ol.querySelector('[data-pm-paso="impuesto"]');
      var fila = eleccion(e, valores, puede);
      if (ancla) ancla.appendChild(fila); else ol.appendChild(h('li', { class: 'px-8 py-4 border-b border-outline-variant/30' }, [fila]));
    });
    c.appendChild(ol);
    if (!puede) c.appendChild(h('p', { class: 'px-8 py-4 font-body-sm text-body-sm text-outline', text: T('Solo el super admin puede cambiar estos ajustes.') }));
  }
  function errorLectura(err) {
    var c = cont(); if (!c) return;
    vacia(c);
    c.appendChild(h('div', { class: 'px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-3', role: 'alert' }, [
      h('span', { class: 'font-body-md text-body-md text-error', text: T('No se ha podido mirar la puesta en marcha') + ': ' + (err ? falla(err) : T('La base ha devuelto algo inesperado.')) }),
      h('button', { type: 'button', 'data-real': '', 'data-accion': 'pm-reintentar', class: 'shrink-0 px-4 py-2 rounded-full bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md', text: T('Reintentar') })]));
  }
  function carga() {
    var c = cont(); if (!c) return Promise.resolve();
    return Promise.all([window.lwDatos('puesta_en_marcha_datos'), window.lwDatos('ajustes_config_datos')]).then(function (rs) {
      var pm = rs[0] || {}, aj = rs[1] || {};
      if (pm.error || !pm.data || !Array.isArray(pm.data.pasos)) { errorLectura(pm.error); return; }
      if (aj.error || !aj.data) { errorLectura(aj.error); return; }
      pinta(pm.data.pasos, aj.data);
    }, function (e) { errorLectura(e); });
  }
  function guarda(btn) {
    if (ocupado) return;
    var clave = btn.getAttribute('data-pm-clave');
    var sel = document.querySelector('[data-pm-valor="' + clave + '"]');
    var est = document.querySelector('[data-pm-estado="' + clave + '"]');
    if (!sel || !sb) return;
    if (sel.value !== 'si' && sel.value !== 'no') { if (est) { est.className = 'font-body-sm text-body-sm text-error'; est.textContent = T('Elige una opción antes de guardar.'); } return; }
    ocupado = true; btn.disabled = true;
    if (est) { est.className = 'font-body-sm text-body-sm text-outline'; est.textContent = T('Guardando…'); }
    Promise.resolve(sb.rpc('ajustes_config_guardar', { p_clave: clave, p_valor: sel.value, p_motivo: 'Puesta en marcha' })).then(function (r) {
      ocupado = false; btn.disabled = false;
      if (!r || r.error) {
        var msg = r && r.error && r.error.code === '42501' ? T('Solo el super admin puede cambiar estos ajustes.') : falla(r && r.error);
        if (est) { est.className = 'font-body-sm text-body-sm text-error'; est.textContent = T('No se guardó') + ': ' + msg; }
        aviso(T('No se guardó') + ': ' + msg);
        return;
      }
      var cambiado = !!(r.data && r.data.cambiado);
      carga().then(function () {   // se vuelve a leer: el «hecho» del paso lo decide la base, no este clic
        var e2 = document.querySelector('[data-pm-estado="' + clave + '"]');
        if (e2) { e2.className = 'font-body-sm text-body-sm text-on-surface'; e2.textContent = T(cambiado ? 'Guardado.' : 'Sin cambios: ya valía eso.'); }
      });
    }, function (e) {
      ocupado = false; btn.disabled = false;
      if (est) { est.className = 'font-body-sm text-body-sm text-error'; est.textContent = T('No se guardó') + ': ' + falla(e); }
    });
  }
  function arranca() {
    var c = cont();
    if (!c) return;   // otra página: nada que hacer
    if (window.LW_EN && typeof window.LW_EN === 'object') Object.keys(EN_PM).forEach(function (k) { if (!(k in window.LW_EN)) window.LW_EN[k] = EN_PM[k]; });
    if (window.LW_ID && typeof window.LW_ID === 'object') Object.keys(ID_PM).forEach(function (k) { if (!(k in window.LW_ID)) window.LW_ID[k] = ID_PM[k]; });
    if (typeof window.lwIdiomaAplicar === 'function') {
      var panel = c.closest('[data-lw-panel]');
      try { window.lwIdiomaAplicar(panel || c); } catch (e) { /* MUDO A PROPOSITO: traducir no tumba la pantalla; queda en español */ }
    }
    c.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-accion]');
      if (!b) return;
      var a = b.getAttribute('data-accion');
      if (a === 'pm-guardar') { ev.stopPropagation(); guarda(b); }
      else if (a === 'pm-reintentar') { ev.stopPropagation(); carga(); }
    });
    if (!window.LW_AUTH || typeof window.LW_AUTH.then !== 'function') { errorLectura({ code: '42501', message: 'sin sesión' }); return; }
    window.LW_AUTH.then(function (aut) {
      if (!aut || !aut.sb) { errorLectura(null); return; }
      sb = aut.sb;
      carga();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arranca); else arranca();
})();
