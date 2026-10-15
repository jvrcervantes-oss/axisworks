/* Ayudas COMUNES de las pantallas del ERP maestro (taller, 8-oct-2026). Las inyecta build.py (_pantalla_bot) donde la pantalla escribe la marca AXW_COMUN_JS en un comentario de bloque,
   dentro de su propia función autoejecutable: no es un fichero que se sirva aparte. Ya existen tres copias de estas ayudas (ventas.html, reservas_producto.html y esta
   que sale de aquí); la pantalla de Taller es la primera que NO pega una cuarta. Mover ventas y reservas a esta capa es un cambio aparte, con su prueba de navegador.
   Reglas que valen para todo lo que pinte esto:
     · solo createElement/textContent: NUNCA innerHTML ni el esc() de Lawang (no escapa la comilla simple). Todo dato de la base es texto.
     · un error de la base se CLASIFICA antes de decirlo: «no existe la función» ≠ «sin permiso» ≠ «la base no responde» ≠ «regla de negocio». Un estado vacío
       puede significar «no hay nada» o «no he podido mirar», y se ven distintos.
     · un solo envío a la vez (doble clic, reintento): ocupa()/libera().
   Uso: var C = axwComun(raiz, T); */
function axwComun(raiz, T) {
  'use strict';
  var ocupado = false;
  var EN = {
    'Más datos (opcional)': 'More details (optional)', 'más': 'more',
    'Trabajando…': 'Working…', 'Cargando…': 'Loading…', 'Cerrar': 'Close', 'Cancelar': 'Cancel', 'Actualizar': 'Refresh', 'Sí': 'Yes', 'No': 'No',
    'Sin sesión: recarga la página o vuelve a entrar.': 'No session: reload the page or sign in again.',
    'La base no ha respondido: prueba otra vez en un rato.': 'The database did not respond: try again in a moment.',
    'Esta función todavía no está disponible en esta base. No es que esté vacía: no se ha podido mirar.': 'This function is not available on this database yet. It is not empty: it could not be checked.',
    'Esta función todavía no está disponible en esta base.': 'This function is not available on this database yet.',
    'No tienes permiso para ver esta lista. No es que esté vacía: no se ha podido mirar.': 'You do not have permission to see this list. It is not empty: it could not be checked.',
    'La base ha devuelto algo inesperado. No es que esté vacía: no se ha podido mirar.': 'The database returned something unexpected. It is not empty: it could not be checked.',
    'La base no ha aceptado el cambio.': 'The database did not accept the change.', 'código': 'code',
    'La base ha devuelto un error. No es que esté vacía: no se ha podido mirar.': 'The database returned an error. It is not empty: it could not be checked.',
    'Sistema': 'System', 'AxisWorks (soporte)': 'AxisWorks (support)', 'Configuración inicial': 'Initial setup'
  };
  // Indonesio (11-oct-2026: las instancias que lo llevan, hoy bbm). Mismas claves que EN; cada pantalla lo fusiona en window.LW_ID solo si existe.
  var ID = {
    'Más datos (opcional)': 'Data lainnya (opsional)', 'más': 'lagi',
    'Trabajando…': 'Memproses…', 'Cargando…': 'Memuat…', 'Cerrar': 'Tutup', 'Cancelar': 'Batalkan', 'Actualizar': 'Muat ulang', 'Sí': 'Ya', 'No': 'Tidak',
    'Sin sesión: recarga la página o vuelve a entrar.': 'Sesi habis: muat ulang halaman atau masuk lagi.',
    'La base no ha respondido: prueba otra vez en un rato.': 'Database tidak merespons: coba lagi sebentar lagi.',
    'Esta función todavía no está disponible en esta base. No es que esté vacía: no se ha podido mirar.': 'Fungsi ini belum tersedia di database ini. Bukan berarti kosong: datanya tidak dapat diperiksa.',
    'Esta función todavía no está disponible en esta base.': 'Fungsi ini belum tersedia di database ini.',
    'No tienes permiso para ver esta lista. No es que esté vacía: no se ha podido mirar.': 'Anda tidak punya akses untuk melihat daftar ini. Bukan berarti kosong: datanya tidak dapat diperiksa.',
    'La base ha devuelto algo inesperado. No es que esté vacía: no se ha podido mirar.': 'Database mengembalikan data yang tidak terduga. Bukan berarti kosong: datanya tidak dapat diperiksa.',
    'La base no ha aceptado el cambio.': 'Database tidak menerima perubahan ini.', 'código': 'kode',
    'La base ha devuelto un error. No es que esté vacía: no se ha podido mirar.': 'Database mengembalikan galat. Bukan berarti kosong: datanya tidak dapat diperiksa.',
    'Sistema': 'Sistem', 'AxisWorks (soporte)': 'AxisWorks (dukungan)', 'Configuración inicial': 'Konfigurasi awal'
  };

  function h(tag, attrs, hijos) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else e.setAttribute(k, v === true ? '' : String(v));
    });
    (hijos || []).forEach(function (c) { if (c == null || c === false) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function vacia(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function oculta(el, si) { el.classList.toggle('axw-oculto', !!si); }
  function boton(texto, accion, extra) {
    var a = { class: 'axw-boton', type: 'button', 'data-accion': accion, text: texto };
    if (extra) Object.keys(extra).forEach(function (k) { a[k] = extra[k]; });
    return h('button', a);
  }
  function chip(texto, tono) { return h('span', { class: 'axw-chip', 'data-tono': tono || 'neutro', text: texto }); }
  function celda(contenido, clase) {
    var td = h('td', clase ? { class: clase } : null);
    if (contenido != null) td.appendChild(typeof contenido === 'string' || typeof contenido === 'number' ? document.createTextNode(String(contenido)) : contenido);
    return td;
  }
  function tabla(el, cabeceras, filas) {
    vacia(el);
    var tr = h('tr');
    cabeceras.forEach(function (c) { tr.appendChild(h('th', { class: c[1] || null, text: T(c[0]) })); });
    el.appendChild(h('thead', null, [tr]));
    var tb = h('tbody');
    filas.forEach(function (f) { tb.appendChild(f); });
    el.appendChild(tb);
  }
  function campo(etiqueta, control, extra) {
    return h('div', { class: 'axw-campo' }, [h('label', { text: T(etiqueta) }), control].concat(extra || []));
  }
  function resumen(pares) {
    var dl = h('dl', { class: 'axw-resumen' });
    pares.forEach(function (p) { dl.appendChild(h('dt', { text: T(p[0]) })); dl.appendChild(h('dd', { text: p[1] == null || p[1] === '' ? '—' : String(p[1]) })); });
    return dl;
  }

  function locale() { try { return (typeof window.lwLocale === 'function' && window.lwLocale()) || 'es-ES'; } catch (e) { /* MUDO A PROPOSITO: sin idioma de la página se usa es-ES */ return 'es-ES'; } }
  function dinero(n, m) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    var dec = (m === 'IDR' || m === 'JPY') ? 0 : 2;
    var s;
    try { s = new Intl.NumberFormat(locale(), { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(Number(n)); } catch (e) { s = String(n); /* MUDO A PROPOSITO: sin Intl se enseña el número tal cual */ }
    return s + (m ? ' ' + m : '');
  }
  function fechaDia(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    if (!m) return '—';
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(locale(), { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fechaHora(x) {
    if (!x) return '—';
    var d = new Date(x);
    return isNaN(d) ? '—' : d.toLocaleString(locale(), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  /* Clasifica un error de la base por lo que PASÓ. */
  function clasifica(err) {
    var e = err || {}, m = String(e.message || ''), hint = e.hint ? String(e.hint) : '';
    if (e.code === 'PGRST202' || e.status === 404 || /Could not find the function|schema cache/i.test(m)) return { tipo: 'no_disponible', hint: hint, m: m, detail: e.details || e.detail || null };
    if (e.code === '42501') {
      // por el hint estable (repaso 12-oct: _taller_exige y el resto mandan sin_sesion); el texto queda para las RPC viejas sin hint
      if (hint === 'sin_sesion' || /sin sesi[oó]n/i.test(m)) return { tipo: 'sin_sesion', hint: hint, m: m, detail: null };
      if (/m[oó]dulo no activo/i.test(m) || hint === 'modulo_apagado') return { tipo: 'modulo_apagado', hint: hint, m: m, detail: null };
      return { tipo: 'sin_permiso', hint: hint, m: m, detail: null };
    }
    if (!e.code && !hint && (!m || /failed to fetch|network|load failed|timeout|sin respuesta/i.test(m))) return { tipo: 'red', hint: hint, m: m, detail: null };
    return { tipo: 'regla', hint: hint, m: m, detail: e.details || e.detail || null };
  }
  /* Texto para la persona. `propios` cambia el de un tipo para esa pantalla (p. ej. módulo apagado). Las reglas de negocio de la base vienen en español y con sus
     números: se enseñan tal cual (textContent). */
  function mensaje(err, lectura, propios) {
    var c = clasifica(err), p = propios || {};
    if (p[c.tipo] && (lectura || !p.soloLectura)) return p[c.tipo];
    if (c.tipo === 'no_disponible') return lectura ? T('Esta función todavía no está disponible en esta base. No es que esté vacía: no se ha podido mirar.') : T('Esta función todavía no está disponible en esta base.');
    if (c.tipo === 'sin_sesion') return T('Sin sesión: recarga la página o vuelve a entrar.');
    if (c.tipo === 'red') return T('La base no ha respondido: prueba otra vez en un rato.');
    if (c.tipo === 'sin_permiso' && lectura) return T('No tienes permiso para ver esta lista. No es que esté vacía: no se ha podido mirar.');
    if (!c.m) return T('La base no ha respondido: prueba otra vez en un rato.');
    // La base escribe sus reglas en español. Fuera del español no se enseña esa frase (bbm-idioma-total, 15-oct-2026: el owner veía errores en
    // español en bbm): si el diccionario la tiene, traducida; si no, un texto en su idioma con el código estable (hint) para soporte.
    // (se mira el diccionario sin pasar por T: T apunta en LW_T_MISSES cada frase que no tiene, y la de la base no es una clave)
    var L = window.LW_IDIOMA || 'es', dic = L === 'id' ? window.LW_ID : window.LW_EN;
    if (L === 'es' || (dic && Object.prototype.hasOwnProperty.call(dic, c.m))) return T(c.m);
    return (lectura ? T('La base ha devuelto un error. No es que esté vacía: no se ha podido mirar.') : T('La base no ha aceptado el cambio.')) + (c.hint ? ' (' + T('código') + ': ' + String(c.hint).replace(/[^a-z0-9_]/gi, '').slice(0, 40) + ')' : '');
  }
  /* Quién firma una fila de un registro de cambios (ajustes_log): por marcador explícito, nunca por descarte (agencia-c0, 15-oct-2026, medido en
     la base de bbm). La siembra (vacío, postgres, «migración …», sistema:sql, «erp: …») es 'inicial'; el estudio (@axisworks.studio), 'soporte';
     otro sistema:<rol> (edges, AaaS), 'sistema'; el resto, una persona. El motivo de 'inicial' y 'soporte' es interno y en español: no se enseña. */
  var QUIEN_DE = { inicial: 'Sistema', soporte: 'AxisWorks (soporte)', sistema: 'Sistema' };
  function autorDe(q) {
    q = String(q == null ? '' : q).trim();
    if (!q || /^(postgres|sistema:sql)$/i.test(q) || /^migraci[oó]n(\s|$)/i.test(q) || /^erp:/i.test(q)) return 'inicial';
    if (/@axisworks\.studio(\s*\(panel\))?$/i.test(q)) return 'soporte';
    if (/^sistema:/i.test(q)) return 'sistema';
    return 'persona';
  }
  function quienDe(q) { var a = autorDe(q); return QUIEN_DE[a] ? T(QUIEN_DE[a]) : String(q == null ? '' : q); }
  function motivoDe(q, motivo) { var a = autorDe(q); return a === 'inicial' ? T('Configuración inicial') : a === 'soporte' ? '—' : motivo; }

  /* Un importe tecleado → número, SIN adivinar el separador (el fallo de lw_importe('120.000') = 120000 pero ::numeric = 120). Acepta «2500», «2500.5», «2500,5»;
     «2.500» / «2,500» / «1.500.000» (grupos de tres cifras) son ambiguos (¿miles o decimales?) y se rechazan; «1.500,50» tampoco entra. Devuelve {vacio} | {v} | {e:'formato'|'ambiguo'}.
     `dec` = máximo de decimales admitido por la pantalla; el límite de verdad (moneda, rango) lo pone la base. */
  function importe(raw, dec) {
    var s = String(raw == null ? '' : raw).replace(/\s+/g, '');
    if (s === '') return { vacio: true };
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return { e: 'ambiguo' };
    if (!new RegExp('^\\d+(?:[.,]\\d{1,' + (dec || 4) + '})?$').test(s)) return { e: 'formato' };
    return { v: Number(s.replace(',', '.')) };
  }
  /* Un importe tecleado con los separadores DEL IDIOMA de la página (15-oct-2026, Ajustes del AaaS; revisión previa #383: «acepta el separador de
     miles del idioma»). Los da Intl con locale(): en es/id «5.000.000» y «37,5»; en en «5,000,000» y «37.5». El de miles solo vale entre grupos de
     EXACTAMENTE tres cifras; el otro signo es el decimal. «37.5» en es o id no es 375: es {e:'formato'} (es dinero: nunca se adivina). */
  function separadores() {
    var g = '.', d = ',';
    try {
      new Intl.NumberFormat(locale()).formatToParts(1234567.5).forEach(function (p) { if (p.type === 'group') g = p.value; if (p.type === 'decimal') d = p.value; });
    } catch (e) { /* MUDO A PROPOSITO: sin Intl se usan los de es; un importe con otro separador sale como error de formato, nunca mal leído */ }
    return { g: /^[\s  ]$/.test(g) ? '' : g, d: d };
  }
  function importeIdioma(raw, dec) {
    var s = String(raw == null ? '' : raw).replace(/[\s  ]+/g, '');
    if (s === '') return { vacio: true };
    var sp = separadores(), x = function (c) { return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
    var ent = sp.g ? '\\d{1,3}(?:' + x(sp.g) + '\\d{3})+|\\d+' : '\\d+';
    var m = new RegExp('^(' + ent + ')(?:' + x(sp.d) + '(\\d{1,' + (dec || 2) + '}))?$').exec(s);
    if (!m) return { e: 'formato' };
    return { v: Number(m[1].split(sp.g || '\u0000').join('') + (m[2] ? '.' + m[2] : '')) };
  }

  function ocupa(btn, texto) {
    if (ocupado) return false;
    ocupado = true;
    if (btn) { btn.disabled = true; btn.setAttribute('data-texto-antes', btn.textContent); btn.textContent = texto || T('Trabajando…'); }
    return true;
  }
  function libera(btn) {
    ocupado = false;
    if (btn && btn.hasAttribute('data-texto-antes')) { btn.textContent = btn.getAttribute('data-texto-antes'); btn.removeAttribute('data-texto-antes'); btn.disabled = false; }
  }

  /* Plegado (S0 de Diseño, 15-oct-2026; owner: «1, 2 o 3 campos a rellenar por paso»). Lo opcional, o lo que ya trae valor (moneda, unidad),
     va bajo un <details> nativo «Más datos (opcional) +» con un resumen tenue de lo de dentro (máximo 2 y «+n más»); lo plegado no cuenta en el
     recuento. Un obligatorio sin valor nunca va plegado: quien valida lo abre si el error es de dentro (det.open = true). resumen() → [textos];
     det.actualiza() repinta el resumen tras cambiar un valor por código. */
  function pliegue(nodos, resumen) {
    var signo = h('span', { 'aria-hidden': 'true', text: '+' }), res = h('span', { class: 'axw-pliegue-res', 'data-axw': 'pliegue-resumen' });
    var det = h('details', { class: 'axw-pliegue', 'data-axw': 'mas-datos' }, [h('summary', null, [h('span', { class: 'axw-pliegue-linea' }, [h('span', { text: T('Más datos (opcional)') }), signo]), res]),
      h('div', { class: 'axw-pliegue-cuerpo' }, nodos)]);
    det.actualiza = function () {
      var l = (resumen() || []).filter(function (x) { return x != null && String(x).replace(/^\s+|\s+$/g, '') !== ''; });
      res.textContent = l.slice(0, 2).join(' · ') + (l.length > 2 ? ' +' + (l.length - 2) + ' ' + T('más') : '');
      oculta(res, !l.length); signo.textContent = det.open ? '−' : '+';
    };
    ['toggle', 'input', 'change'].forEach(function (ev) { det.addEventListener(ev, det.actualiza); });
    det.actualiza();
    return det;
  }

  /* Ventana de diálogo: ESC y el botón con `cierra` la cierran, el foco entra y vuelve. */
  function dialogo(titulo, nodos, botones) {
    var previo = document.activeElement;
    var cuerpo = h('div', { class: 'axw-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, [h('h3', { text: titulo })].concat(nodos));
    var err = h('p', { class: 'axw-error axw-oculto', role: 'alert' });
    cuerpo.appendChild(err);
    var fila = h('div', { class: 'axw-acciones' });
    var fondo = h('div', { class: 'axw-fondo', 'data-axw': 'dialogo' }, [cuerpo]);
    var d = { fondo: fondo, cuerpo: cuerpo, botones: {}, errorCaja: err,
              error: function (m) { err.textContent = m || ''; oculta(err, !m); },
              cierra: function () { if (fondo.parentNode) fondo.parentNode.removeChild(fondo); if (previo && previo.focus) { try { previo.focus(); } catch (e) { /* MUDO A PROPOSITO: el foco no es crítico */ } } } };
    botones.forEach(function (b) {
      var bt = boton(b.texto, b.accion, b.primario ? { 'data-primario': '1' } : (b.peligro ? { 'data-peligro': '1' } : null));
      bt.addEventListener('click', function () { if (b.cierra) d.cierra(); else if (b.alclic) b.alclic(bt, d); });
      d.botones[b.accion] = bt; fila.appendChild(bt);
    });
    cuerpo.appendChild(fila);
    fondo.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') d.cierra(); });
    raiz.appendChild(fondo);
    var primero = cuerpo.querySelector('input,select,textarea,button');
    if (primero) primero.focus();
    return d;
  }

  return { EN: EN, ID: ID, h: h, vacia: vacia, oculta: oculta, boton: boton, chip: chip, celda: celda, tabla: tabla, campo: campo, resumen: resumen, locale: locale, dinero: dinero,
           fechaDia: fechaDia, fechaHora: fechaHora, clasifica: clasifica, mensaje: mensaje, autorDe: autorDe, quienDe: quienDe, motivoDe: motivoDe, importe: importe, importeIdioma: importeIdioma, ocupa: ocupa, libera: libera, dialogo: dialogo, pliegue: pliegue };
}
