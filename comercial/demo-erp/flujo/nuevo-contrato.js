/* «New contract» y firma de EJEMPLO de la demo pública (paquete B, fase B2, 11-oct-2026).

   Qué hace: un panel a pantalla completa DENTRO de la intranet de la demo (misma cáscara, misma piel: los colores
   salen de las variables --tema-*). Pasos: cliente y unidad → ver el contrato (plantilla de Legal, contrato_ejemplo.js)
   → guardarlo → firma de ejemplo (dibujada o un clic) → hecho, con enlaces a Contratos y al portal del cliente.

   Dónde engancha (por identificador estable, nunca por rótulo):
   - clic en [data-accion="nuevo-contrato" | "formulario-clasico" | "borrador-blanco" | "nueva-operacion" |
     "demo-nuevo-contrato"] (con data-cliente="<id>" opcional) → abre el panel. Se captura antes que editores.js:
     en la demo esas cuatro vías acababan en «Not included in the demo» o en un 403 (el generador del ERP real no viaja a la demo).
   - clic en [data-accion="demo-firmar"][data-id="<contrato>"] → abre la firma de un contrato pendiente.
   - la dirección con ?nuevo (y &cliente=<id>) → abre el panel al cargar. El id solo se casa contra la lista de
     clientes; nada de la URL se pinta.

   Datos: SOLO por el cliente falso del guard de la demo (window.LW_AUTH → sb) y las dos funciones del paquete A,
   `demo_contrato_crea` y `demo_contrato_firma` (la numeración y las reglas viven allí, no aquí). No sale ni una
   petición de la pestaña; nada se envía a nadie. La firma dibujada se queda en memoria: no viaja al almacén. */
(function () {
  'use strict';
  if (window.AXW_DEMO_FLUJO) return;

  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? s.replace(/[^/]*(\?.*)?$/, '') : '/flujo/';
  })();
  var ACCIONES_NUEVO = ['nuevo-contrato', 'formulario-clasico', 'borrador-blanco', 'nueva-operacion', 'demo-nuevo-contrato'];

  function carga(src, css) {
    return new Promise(function (ok, ko) {
      var e;
      if (css) { e = document.createElement('link'); e.rel = 'stylesheet'; e.href = src; e.setAttribute('data-axf-css', ''); }
      else { e = document.createElement('script'); e.src = src; }
      e.onload = ok; e.onerror = function () { ko(new Error('Could not load ' + src)); };
      (document.head || document.documentElement).appendChild(e);
    });
  }
  // Los textos (textos.js) y el contrato (contrato_ejemplo.js) se cargan al abrir el panel, en orden: el contrato lee los textos.
  function t() { return window.AXW_DEMO_T ? window.AXW_DEMO_T.apply(null, arguments) : String(arguments[0]); }
  var listo = null;
  function prepara() {
    if (!listo) {
      listo = Promise.all([
        document.querySelector('link[data-axf-css]') ? null : carga(BASE + 'flujo.css', true),
        (window.AXW_DEMO_T ? Promise.resolve() : carga(BASE + 'textos.js'))
          .then(function () { return window.AXW_DEMO_CONTRATO ? null : carga(BASE + 'contrato_ejemplo.js'); })
      ]).catch(function (e) { listo = null; throw e; });
    }
    return listo;
  }

  function sb() {
    if (!window.LW_AUTH) return Promise.reject(new Error(t('datos.no_hay')));
    return window.LW_AUTH.then(function (a) { return a.sb; });
  }
  function filas(r) {
    if (r && r.error) throw new Error(r.error.message || String(r.error));
    return (r && Array.isArray(r.data)) ? r.data : [];
  }
  function rpc(nombre, args) {
    return sb().then(function (c) { return c.rpc(nombre, args); }).then(function (r) {
      if (r && r.error) throw new Error(r.error.message || String(r.error));
      if (!r || r.data == null) throw new Error(t('datos.sin_guardado'));
      return r.data;
    });
  }

  /* ── DOM seguro: todo texto va por textContent ─────────────────────────── */
  function el(tag, props, hijos) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (hijos || []).forEach(function (h) { if (h != null) e.appendChild(typeof h === 'string' ? document.createTextNode(h) : h); });
    return e;
  }
  function boton(texto, clase, accion, extra) {
    return el('button', Object.assign({ type: 'button', class: 'axf-btn ' + (clase || ''), 'data-axf': accion, text: texto }, extra || {}));
  }

  /* ── Estado del panel ───────────────────────────────────────────────── */
  var E = null;   // { capa, cuerpo, paso, datos, clientes, proyectos, unidades, sel, contrato, firmaImg, cambiado }
  var abriendo = false;   // dos clics mientras carga la primera vez montaban dos capas, y la primera no se cerraba (revisor, 12-oct)

  function abre(opc) {
    opc = opc || {};
    if (E || abriendo) return;
    abriendo = true;
    prepara().then(function () {
      abriendo = false;
      E = { paso: 0, sel: { cliente: null, proyecto: null, unidad: null, precio: '', notas: '' }, contrato: null, firmaImg: null, cambiado: false };
      montaCapa(opc.firmar ? t('panel.firmar') : t('panel.nuevo'));
      if (opc.firmar) return cargaParaFirmar(opc.firmar);
      return cargaListas(opc.cliente);
    }).catch(function (e) { abriendo = false; fallo(e); });
  }

  function montaCapa(titulo) {
    var cerrar = boton(t('panel.cerrar'), 'axf-btn-sec', 'cerrar', { 'aria-label': t('panel.cerrar_aria') });
    cerrar.addEventListener('click', cierra);
    E.pasos = el('ol', { class: 'axf-pasos', 'aria-label': t('panel.pasos') },
      [t('paso.1'), t('paso.2'), t('paso.3'), t('paso.4')].map(function (t, i) {
        return el('li', { 'data-paso': String(i) }, [el('span', { class: 'axf-paso-n', text: String(i + 1) }), el('span', { text: t })]);
      }));
    E.cuerpo = el('div', { class: 'axf-cuerpo', tabindex: '-1' });
    E.aviso = el('p', { class: 'axf-aviso', role: 'alert', hidden: true });
    E.capa = el('div', { class: 'axf-capa', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'axf-titulo' }, [
      el('div', { class: 'axf-marco' }, [
        el('header', { class: 'axf-cab' }, [
          el('div', { class: 'axf-cab-tit' }, [
            el('h2', { id: 'axf-titulo', class: 'axf-titulo', text: titulo }),
            el('span', { class: 'axf-chip', text: t('panel.chip') })
          ]),
          cerrar
        ]),
        E.pasos, E.aviso, E.cuerpo
      ])
    ]);
    document.body.appendChild(E.capa);
    document.documentElement.classList.add('axf-abierto');
    E.cuerpo.appendChild(el('p', { class: 'axf-cargando', text: t('panel.cargando') }));
    E.cuerpo.focus();
  }

  function cierra() {
    if (!E) return;
    var recarga = E.cambiado;
    E.capa.remove();
    document.documentElement.classList.remove('axf-abierto');
    E = null;
    // Lo creado ya está en el almacén de la pestaña; recargar es lo que hace que la lista de detrás lo enseñe.
    if (recarga) location.reload();
  }

  function marcaPaso(n) {
    E.paso = n;
    Array.prototype.forEach.call(E.pasos.children, function (li, i) {
      li.classList.toggle('axf-hecho', i < n);
      if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    E.aviso.hidden = true;
    E.cuerpo.textContent = '';
    E.cuerpo.scrollTop = 0;
  }
  function fallo(e) {
    var msg = (e && e.message) || String(e);
    if (!E) { console.error('[demo] new contract:', msg); window.alert(window.AXW_DEMO_T ? t('panel.error_prefijo', msg) : 'New contract (demo): ' + msg); return; }
    E.aviso.textContent = msg;
    E.aviso.hidden = false;
  }

  /* ── Paso 1: cliente y unidad ─────────────────────────────────────────── */
  function cargaListas(clienteId) {
    return sb().then(function (c) {
      return Promise.all([
        c.from('clients').select('*').order('full_name'),
        c.from('proyectos').select('*'),
        c.from('unidades').select('*').eq('estado', 'disponible')
      ]);
    }).then(function (rs) {
      E.clientes = filas(rs[0]);
      E.proyectos = filas(rs[1]).filter(function (p) { return p.activo !== false; });
      E.unidades = filas(rs[2]).filter(function (u) { return !u.contrato_id; });
      var pre = E.clientes.filter(function (x) { return x.id === clienteId; })[0];
      if (pre) E.sel.cliente = pre.id;
      pasoUno();
    });
  }

  function opcion(valor, texto, sel) { return el('option', { value: valor, selected: sel ? true : null, text: texto }); }
  function campo(id, rotulo, control, ayuda) {
    return el('div', { class: 'axf-campo' }, [el('label', { for: id, text: rotulo }), control, ayuda ? el('p', { class: 'axf-ayuda', text: ayuda }) : null]);
  }

  function pasoUno() {
    marcaPaso(0);
    if (!E.clientes.length) { fallo(new Error(t('f.err_sin_clientes'))); return; }
    var s = E.sel;
    var selCli = el('select', { id: 'axf-cliente', required: true }, [opcion('', t('f.cliente_elige'), !s.cliente)].concat(
      E.clientes.map(function (c) { return opcion(c.id, c.full_name + (c.nationality ? ' · ' + c.nationality : ''), c.id === s.cliente); })));
    var conUnidades = E.proyectos.filter(function (p) { return E.unidades.some(function (u) { return u.proyecto_id === p.id; }); });
    if (!s.proyecto && conUnidades.length) s.proyecto = conUnidades[0].id;
    var selPro = el('select', { id: 'axf-proyecto', required: true }, conUnidades.map(function (p) { return opcion(p.id, p.nombre, p.id === s.proyecto); }));
    var selUni = el('select', { id: 'axf-unidad', required: true });
    var precio = el('input', { id: 'axf-precio', type: 'number', min: '1', step: '1', inputmode: 'numeric', required: true });
    var moneda = el('span', { class: 'axf-moneda' });
    var notas = el('textarea', { id: 'axf-notas', rows: '3', maxlength: '300', placeholder: t('f.notas_ph') });
    notas.value = s.notas;

    function unidad() { return E.unidades.filter(function (u) { return u.id === s.unidad; })[0]; }
    function pintaUnidades() {
      var lista = E.unidades.filter(function (u) { return u.proyecto_id === s.proyecto; })
        .sort(function (a, b) { return String(a.codigo).localeCompare(String(b.codigo), 'en', { numeric: true }); });
      if (!lista.some(function (u) { return u.id === s.unidad; })) s.unidad = lista.length ? lista[0].id : null;
      selUni.textContent = '';
      lista.forEach(function (u) {
        selUni.appendChild(opcion(u.id, u.codigo + (u.superficie_m2 ? ' · ' + u.superficie_m2 + ' m²' : ''), u.id === s.unidad));
      });
      var u = unidad();
      if (u && (!s.precio || s._precioDe !== u.id)) { s.precio = String(u.precio_suelo || u.precio || ''); s._precioDe = u.id; }
      precio.value = s.precio;
      moneda.textContent = (u && u.moneda) || '';
    }
    selPro.addEventListener('change', function () { s.proyecto = selPro.value; s.unidad = null; pintaUnidades(); });
    selUni.addEventListener('change', function () { s.unidad = selUni.value; pintaUnidades(); });
    selCli.addEventListener('change', function () { s.cliente = selCli.value || null; });
    precio.addEventListener('input', function () { s.precio = precio.value; });
    notas.addEventListener('input', function () { s.notas = notas.value; });
    pintaUnidades();

    var form = el('form', { class: 'axf-form', novalidate: true }, [
      el('p', { class: 'axf-intro', text: t('f.intro') }),
      campo('axf-cliente', t('f.cliente'), selCli, t('f.cliente_ayuda')),
      el('div', { class: 'axf-fila' }, [campo('axf-proyecto', t('f.proyecto'), selPro), campo('axf-unidad', t('f.unidad'), selUni)]),
      campo('axf-precio', t('f.precio'), el('div', { class: 'axf-importe' }, [precio, moneda]), t('f.precio_ayuda')),
      campo('axf-notas', t('f.notas'), notas),
      el('div', { class: 'axf-acciones' }, [boton(t('f.revisar'), 'axf-btn-pri', 'revisar', { type: 'submit' })])
    ]);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var u = unidad();
      if (!s.cliente) return fallo(new Error(t('f.err_cliente')));
      if (!u) return fallo(new Error(t('f.err_unidad')));
      if (!(Number(s.precio) > 0)) return fallo(new Error(t('f.err_precio')));
      pasoDos();
    });
    if (!conUnidades.length) fallo(new Error(t('f.err_sin_unidades')));
    E.cuerpo.appendChild(form);
  }

  function datosDoc() {
    var s = E.sel;
    var c = E.clientes.filter(function (x) { return x.id === s.cliente; })[0] || {};
    var u = E.unidades.filter(function (x) { return x.id === s.unidad; })[0] || {};
    var k = E.contrato || {};
    return {
      numero: k.numero, fecha: k.fecha || new Date().toISOString(), cliente_nombre: c.full_name, cliente_pais: c.nationality,
      proyecto: u.proyecto, unidad: u.codigo, precio: Number(s.precio), moneda: u.moneda, notas: s.notas,
      firmado: !!k.firmado, firmante: k.firmante, fecha_firma: k.fecha_firma, firma_img: E.firmaImg
    };
  }

  function imprimir() { window.print(); }

  /* ── Paso 2: ver el contrato y guardarlo ─────────────────────────────── */
  function pasoDos() {
    marcaPaso(1);
    var guardar = boton(t('b.guardar'), 'axf-btn-pri', 'guardar');
    guardar.addEventListener('click', function () {
      guardar.disabled = true;
      var s = E.sel;
      rpc('demo_contrato_crea', { p_client_id: s.cliente, p_unidad_id: s.unidad, p_tipo: 'reserva_parcela', p_precio: Number(s.precio), p_texto_sha: null })
        .then(function (r) {
          if (!r.id || !r.numero) throw new Error(t('datos.sin_numero'));
          E.contrato = { id: r.id, numero: r.numero, fecha: new Date().toISOString(), firmado: false };
          E.cambiado = true;
          pasoTres();
        })
        .catch(function (e) { guardar.disabled = false; fallo(e); });
    });
    var atras = boton(t('b.atras'), 'axf-btn-sec', 'atras');
    atras.addEventListener('click', pasoUno);
    var imp = boton(t('b.imprimir'), 'axf-btn-sec', 'imprimir');
    imp.addEventListener('click', imprimir);
    E.cuerpo.appendChild(el('div', { class: 'axf-revision' }, [
      window.AXW_DEMO_CONTRATO.documento(datosDoc()),
      el('div', { class: 'axf-acciones' }, [atras, imp, guardar])
    ]));
  }

  /* ── Paso 3: firma de ejemplo ────────────────────────────────────────── */
  function pad() {
    var lienzo = el('canvas', { class: 'axf-pad', width: '600', height: '180', 'aria-label': t('firma.pad'), role: 'img' });
    var ctx = lienzo.getContext('2d'), dibuja = false, algo = false;
    function punto(ev) {
      var r = lienzo.getBoundingClientRect();
      return [(ev.clientX - r.left) * lienzo.width / r.width, (ev.clientY - r.top) * lienzo.height / r.height];
    }
    lienzo.addEventListener('pointerdown', function (ev) {
      dibuja = true; algo = true; lienzo.setPointerCapture(ev.pointerId);
      var p = punto(ev);
      ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = getComputedStyle(lienzo).color || '#1b1c19';
      ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    });
    lienzo.addEventListener('pointermove', function (ev) { if (!dibuja) return; var p = punto(ev); ctx.lineTo(p[0], p[1]); ctx.stroke(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { lienzo.addEventListener(t, function () { dibuja = false; }); });
    return {
      lienzo: lienzo,
      borra: function () { ctx.clearRect(0, 0, lienzo.width, lienzo.height); algo = false; },
      imagen: function () { return algo ? lienzo.toDataURL('image/png') : null; }
    };
  }

  function pasoTres() {
    marcaPaso(2);
    var d = datosDoc();
    var p = pad();
    var borrar = boton(t('b.borrar_firma'), 'axf-btn-sec', 'borrar-firma');
    borrar.addEventListener('click', p.borra);
    var firmar = boton(t('b.firmar'), 'axf-btn-pri', 'firmar');
    firmar.addEventListener('click', function () {
      firmar.disabled = true;
      rpc('demo_contrato_firma', { p_contrato: E.contrato.id, p_firmante_nombre: d.cliente_nombre || null })
        .then(function (r) {
          E.firmaImg = p.imagen();
          E.contrato.firmado = true;
          E.contrato.firmante = d.cliente_nombre;
          E.contrato.fecha_firma = r.fecha_firma || new Date().toISOString();
          E.cambiado = true;
          pasoCuatro();
        })
        .catch(function (e) { firmar.disabled = false; fallo(e); });
    });
    E.cuerpo.appendChild(el('div', { class: 'axf-firma' }, [
      el('div', { class: 'axf-firma-lado' }, [
        el('p', { class: 'axf-intro', text: t('firma.intro', E.contrato.numero) }),
        el('p', { class: 'axf-firmante' }, [el('span', { text: t('firma.como') }), el('strong', { text: d.cliente_nombre || '—' })]),
        p.lienzo,
        el('div', { class: 'axf-acciones' }, [borrar, firmar])
      ]),
      window.AXW_DEMO_CONTRATO.documento(d)
    ]));
  }

  /* ── Paso 4: hecho ───────────────────────────────────────────────────── */
  function enlace(texto, href, clase) { return el('a', { class: 'axf-btn ' + clase, href: href, text: texto }); }
  function pasoCuatro() {
    marcaPaso(3);
    var cli = (E.sel && E.sel.cliente) || E.clienteFirma || '';
    var imp = boton(t('b.imprimir'), 'axf-btn-sec', 'imprimir');
    imp.addEventListener('click', imprimir);
    var cerrar = boton(t('panel.cerrar'), 'axf-btn-sec', 'cerrar-fin');
    cerrar.addEventListener('click', cierra);
    E.cuerpo.appendChild(el('div', { class: 'axf-hecho-caja' }, [
      el('div', { class: 'axf-hecho-cab' }, [
        el('h3', { class: 'axf-hecho-tit', text: t('hecho.tit', E.contrato.numero) }),
        el('p', { class: 'axf-intro', text: t('hecho.texto') }),
        el('div', { class: 'axf-acciones' }, [
          enlace(t('hecho.contratos'), '/contratos/', 'axf-btn-pri'),
          enlace(t('hecho.portal'), '/portal/' + (cli ? '?cliente=' + encodeURIComponent(cli) : ''), 'axf-btn-sec'),
          enlace(t('hecho.facturas'), '/facturas/', 'axf-btn-sec'),
          imp, cerrar
        ])
      ]),
      window.AXW_DEMO_CONTRATO.documento(datosDoc())
    ]));
  }

  /* ── Firmar un contrato pendiente que ya existe ──────────────────────── */
  function cargaParaFirmar(id) {
    return sb().then(function (c) {
      return Promise.all([c.from('contratos').select('*').eq('id', id).maybeSingle(),
        c.from('contrato_compradores').select('*').eq('contrato_id', id)]);
    }).then(function (rs) {
      if (rs[0] && rs[0].error) throw new Error(rs[0].error.message);
      var k = rs[0] && rs[0].data;
      if (!k || Array.isArray(k)) throw new Error(t('firma.no_existe'));
      if (k.bloqueado) throw new Error(t('firma.ya', k.numero));
      var comp = filas(rs[1]).filter(function (x) { return x.rol === 'adquiriente_1'; })[0] || {};
      var cid = comp.client_id || (comp.clients && comp.clients.id) || null;
      // La ficha del cliente manda (país incluido): la fila del comprador solo lleva una copia parcial.
      return sb().then(function (c) { return cid ? c.from('clients').select('*').eq('id', cid).maybeSingle() : { data: null }; })
        .then(function (rc) {
          if (rc && rc.error) throw new Error(rc.error.message || String(rc.error));
          return [k, comp, Object.assign({}, comp.clients || {}, (rc && rc.data && !Array.isArray(rc.data)) ? rc.data : {})];
        });
    }).then(function (x) {
      var k = x[0], comp = x[1], cl = x[2];
      E.clienteFirma = comp.client_id || cl.id || null;
      E.clientes = [{ id: E.clienteFirma, full_name: k.comprador_nombre || cl.full_name, nationality: cl.nationality }];
      E.unidades = [{ id: k.unidad_id, codigo: k.parcela_codigo, proyecto: k.proyecto_nombre, moneda: k.moneda }];
      E.sel = { cliente: E.clienteFirma, unidad: k.unidad_id, precio: k.precio_total, notas: '' };
      E.contrato = { id: k.id, numero: k.numero, fecha: k.created_at, firmado: false };
      pasoTres();
    });
  }

  /* ── Enganches ───────────────────────────────────────────────────────── */
  window.addEventListener('keydown', function (ev) {
    if (!E) return;
    if (ev.key === 'Escape') { ev.stopPropagation(); cierra(); return; }
    if (ev.key !== 'Tab') return;
    // El foco no sale del panel mientras está abierto (diálogo modal).
    var f = Array.prototype.filter.call(E.capa.querySelectorAll('button:not([disabled]), a[href], select, input, textarea'),
      function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var primero = f[0], ultimo = f[f.length - 1];
    if (ev.shiftKey && (document.activeElement === primero || !E.capa.contains(document.activeElement))) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && (document.activeElement === ultimo || !E.capa.contains(document.activeElement))) { ev.preventDefault(); primero.focus(); }
  }, true);
  document.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest('[data-accion]');
    if (!b || (E && E.capa.contains(b))) return;
    var a = b.getAttribute('data-accion');
    if (ACCIONES_NUEVO.indexOf(a) !== -1) {
      ev.preventDefault(); ev.stopImmediatePropagation();
      abre({ cliente: b.getAttribute('data-cliente') });
    } else if (a === 'demo-firmar' && b.getAttribute('data-id')) {
      ev.preventDefault(); ev.stopImmediatePropagation();
      abre({ firmar: b.getAttribute('data-id') });
    }
  }, true);

  function desdeUrl() {
    var q = new URLSearchParams(location.search);
    if (!q.has('nuevo')) return;
    var cliente = q.get('cliente');
    // Fuera de la dirección antes de abrir: cerrar tras crear recarga la página, y con ?nuevo el panel se volvía a abrir
    // vacío (revisor, 12-oct).
    q.delete('nuevo'); q.delete('cliente');
    try { history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) { /* MUDO A PROPOSITO: sin history el panel solo se reabre al recargar */ }
    abre({ cliente: cliente });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', desdeUrl); else desdeUrl();

  window.AXW_DEMO_FLUJO = Object.freeze({ nuevoContrato: function (clienteId) { abre({ cliente: clienteId }); },
    firmar: function (id) { abre({ firmar: id }); } });
})();
