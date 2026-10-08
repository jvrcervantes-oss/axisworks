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
    'Trabajando…': 'Working…', 'Cargando…': 'Loading…', 'Cerrar': 'Close', 'Cancelar': 'Cancel', 'Actualizar': 'Refresh', 'Sí': 'Yes', 'No': 'No',
    'Sin sesión: recarga la página o vuelve a entrar.': 'No session: reload the page or sign in again.',
    'La base no ha respondido: prueba otra vez en un rato.': 'The database did not respond: try again in a moment.',
    'Esta función todavía no está disponible en esta base. No es que esté vacía: no se ha podido mirar.': 'This function is not available on this database yet. It is not empty: it could not be checked.',
    'Esta función todavía no está disponible en esta base.': 'This function is not available on this database yet.',
    'No tienes permiso para ver esta lista. No es que esté vacía: no se ha podido mirar.': 'You do not have permission to see this list. It is not empty: it could not be checked.',
    'La base ha devuelto algo inesperado. No es que esté vacía: no se ha podido mirar.': 'The database returned something unexpected. It is not empty: it could not be checked.'
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
      if (/sin sesi[oó]n/i.test(m)) return { tipo: 'sin_sesion', hint: hint, m: m, detail: null };
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
    return c.m || T('La base no ha respondido: prueba otra vez en un rato.');
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

  return { EN: EN, h: h, vacia: vacia, oculta: oculta, boton: boton, chip: chip, celda: celda, tabla: tabla, campo: campo, resumen: resumen, locale: locale, dinero: dinero,
           fechaDia: fechaDia, fechaHora: fechaHora, clasifica: clasifica, mensaje: mensaje, ocupa: ocupa, libera: libera, dialogo: dialogo };
}
