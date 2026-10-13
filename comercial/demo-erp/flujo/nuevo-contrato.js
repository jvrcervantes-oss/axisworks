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
      // El plan de pagos vive en E.sel (no en la pantalla): «Back» y el cambio de unidad repintan el paso 1 sin perderlo.
      E = { paso: 0, sel: { cliente: null, proyecto: null, unidad: null, precio: '', notas: '', hitos: plan() ? plan().defecto() : [] },
        contrato: null, firmaImg: null, cambiado: false };
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
    E.aviso.removeAttribute('data-axf-plan');   // el aviso del plan lo marca quien lo pone (paso 1), para quitarlo al cuadrar
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

  /* ── Plan de pagos por hitos (13-oct-2026) ─────────────────────────────────
     Lo que se valida y cómo se reparte el precio es del doble (window.LW_DEMO_PLAN, demo_datos.js): la pantalla usa SUS
     funciones para avisar en el sitio y para enseñar los importes, y el doble lo vuelve a validar al guardar. */
  function plan() { return window.LW_DEMO_PLAN || null; }
  function importeTxt(n, moneda) { return window.AXW_DEMO_CONTRATO.importe(n) + (moneda ? ' ' + moneda : ''); }
  function errorPlan(v) {
    if (v.error === 'plan_n') return t('plan.err_n', plan().max);
    if (v.error === 'plan_concepto') return t('plan.err_concepto', v.n, plan().conceptoMax);
    if (v.error === 'plan_pct') return t('plan.err_pct', v.n);
    if (v.error === 'plan_suma') return t('plan.err_suma', v.suma);
    return v.error;
  }
  function seccionPlan(s, moneda) {
    var P = plan();
    var caja = el('fieldset', { class: 'axf-plan', 'data-axf': 'plan' });
    var filasEl = el('div', { class: 'axf-plan-filas' });
    var total = el('p', { class: 'axf-plan-total', 'aria-live': 'polite', 'data-axf': 'plan-total' });
    var importes = [];
    function suma() {
      var c = 0, todo = true;
      s.hitos.forEach(function (h) { var x = P.leePct(h.pct); if (x == null) todo = false; else c += x; });
      return { c: c, todo: todo };
    }
    function refresca() {
      var v = P.valida(s.hitos), sm = suma();
      var montos = v.ok && Number(s.precio) > 0 ? P.reparte(Number(s.precio), v.hitos) : null;
      importes.forEach(function (celda, i) { celda.textContent = montos ? importeTxt(montos[i], moneda()) : '—'; });
      var bien = sm.todo && sm.c === 10000;
      total.textContent = bien ? t('plan.total', P.pctTexto(sm.c)) : t('plan.total_mal', sm.todo ? P.pctTexto(sm.c) : '—');
      total.classList.toggle('axf-plan-mal', !bien);
      // el aviso de «no suma 100» se va en cuanto el plan cuadra (a 390 px se quedaba encima del plan ya bueno)
      if (v.ok && E && E.aviso && E.aviso.hasAttribute('data-axf-plan')) { E.aviso.hidden = true; E.aviso.removeAttribute('data-axf-plan'); }
    }
    function pinta(foco) {
      filasEl.textContent = '';
      importes = [];
      s.hitos.forEach(function (h, i) {
        var n = i + 1;
        var concepto = el('input', { type: 'text', maxlength: String(P.conceptoMax), 'aria-label': t('plan.concepto_aria', n), 'data-axf': 'plan-concepto' });
        concepto.value = h.descripcion;
        concepto.addEventListener('input', function () { h.descripcion = concepto.value; refresca(); });
        var pct = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': t('plan.pct_aria', n), 'data-axf': 'plan-pct' });
        pct.value = h.pct;
        pct.addEventListener('input', function () { h.pct = pct.value; refresca(); });
        var imp = el('span', { class: 'axf-plan-importe', 'data-axf': 'plan-importe' });
        importes.push(imp);
        var quitar = boton(t('plan.quitar'), 'axf-btn-sec axf-plan-quitar', 'plan-quitar', { 'aria-label': t('plan.quitar_aria', n), disabled: s.hitos.length <= 1 ? true : null });
        quitar.addEventListener('click', function () { s.hitos.splice(i, 1); pinta(Math.max(0, i - 1)); });
        filasEl.appendChild(el('div', { class: 'axf-plan-fila', 'data-axf': 'plan-fila' }, [
          el('span', { class: 'axf-plan-n', text: String(n) }), concepto,
          el('span', { class: 'axf-plan-pct' }, [pct, el('span', { text: '%', 'aria-hidden': 'true' })]), imp, quitar]));
      });
      anadir.disabled = s.hitos.length >= P.max;
      refresca();
      if (foco != null) { var f = filasEl.querySelectorAll('[data-axf="plan-concepto"]')[foco]; if (f) f.focus(); }
    }
    var anadir = boton(t('plan.anadir'), 'axf-btn-sec', 'plan-anadir');
    anadir.addEventListener('click', function () {
      if (s.hitos.length >= P.max) return;
      s.hitos.push({ descripcion: '', pct: '' });
      pinta(s.hitos.length - 1);
    });
    caja.appendChild(el('legend', { text: t('plan.tit') }));
    caja.appendChild(el('p', { class: 'axf-ayuda', text: t('plan.ayuda', P.max) }));
    caja.appendChild(filasEl);
    caja.appendChild(el('div', { class: 'axf-plan-pie' }, [anadir, total]));
    pinta(null);
    return { caja: caja, refresca: refresca };
  }
  function tarjetaPlan(s, moneda) {
    var v = plan() && plan().valida(s.hitos || []);
    if (!v || !v.ok) return null;
    var montos = plan().reparte(Number(s.precio), v.hitos);
    return el('section', { class: 'axf-plan-tarjeta', 'data-axf': 'plan-revision', 'aria-label': t('plan.tit') }, [
      el('h3', { class: 'axf-plan-tit', text: t('plan.tit') }),
      el('table', { class: 'axf-plan-tabla' }, [
        el('thead', null, [el('tr', null, [el('th', { scope: 'col', text: t('plan.concepto') }), el('th', { scope: 'col', text: '%' }), el('th', { scope: 'col', text: t('plan.importe') })])]),
        el('tbody', null, v.hitos.map(function (h, i) {
          return el('tr', null, [el('td', { text: h.descripcion }), el('td', { text: h.pct + ' %' }), el('td', { text: importeTxt(montos[i], moneda) })]);
        }))
      ]),
      el('p', { class: 'axf-ayuda', text: t('plan.nota') })
    ]);
  }
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
    var secPlan = plan() ? seccionPlan(s, function () { var u = unidad(); return (u && u.moneda) || ''; }) : null;
    precio.addEventListener('input', function () { if (secPlan) secPlan.refresca(); });
    selUni.addEventListener('change', function () { if (secPlan) secPlan.refresca(); });

    var form = el('form', { class: 'axf-form', novalidate: true }, [
      el('p', { class: 'axf-intro', text: t('f.intro') }),
      campo('axf-cliente', t('f.cliente'), selCli, t('f.cliente_ayuda')),
      el('div', { class: 'axf-fila' }, [campo('axf-proyecto', t('f.proyecto'), selPro), campo('axf-unidad', t('f.unidad'), selUni)]),
      campo('axf-precio', t('f.precio'), el('div', { class: 'axf-importe' }, [precio, moneda]), t('f.precio_ayuda')),
      secPlan ? secPlan.caja : null,
      campo('axf-notas', t('f.notas'), notas),
      el('div', { class: 'axf-acciones' }, [boton(t('f.revisar'), 'axf-btn-pri', 'revisar', { type: 'submit' })])
    ]);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var u = unidad();
      if (!s.cliente) return fallo(new Error(t('f.err_cliente')));
      if (!u) return fallo(new Error(t('f.err_unidad')));
      if (!(Number(s.precio) > 0)) return fallo(new Error(t('f.err_precio')));
      if (plan()) { var v = plan().valida(s.hitos); if (!v.ok) { fallo(new Error(errorPlan(v))); E.aviso.setAttribute('data-axf-plan', ''); return; } }
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
      rpc('demo_contrato_crea', { p_client_id: s.cliente, p_unidad_id: s.unidad, p_tipo: 'reserva_parcela', p_precio: Number(s.precio), p_texto_sha: null,
        p_hitos: plan() ? s.hitos.map(function (h) { return { descripcion: h.descripcion, pct: h.pct }; }) : undefined })
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
    // El plan de pagos va FUERA del documento de muestra: su texto es de Legal y no se toca (textos.js, `plantilla`).
    var d0 = datosDoc();
    E.cuerpo.appendChild(el('div', { class: 'axf-revision' }, [
      window.AXW_DEMO_CONTRATO.documento(d0),
      tarjetaPlan(E.sel, d0.moneda),
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
        // Firmado desde el portal de clientes (12-oct): quien firma es el cliente, así que no se le ofrecen pantallas de la
        // intranet; «Close» recarga el portal y el contrato sale firmado.
        el('div', { class: 'axf-acciones' }, location.pathname.indexOf('/portal/') === 0 ? [imp, cerrar] : [
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

  /* «Issue contract» sin plantillas (13-oct-2026, demo en inglés). La demo no trae plantillas de contrato (Legal, AXW-139: son
     el texto de cada negocio) y la pantalla se quedaba en «There is no active template»: una demo que no emite nada. Si la
     base de la demo dice que no hay ninguna, se pone delante una tarjeta que lo explica y abre «+ New contract» (que sí crea
     el contrato, con su plan de pagos), y se aparta el paso de plantilla vacío. Con plantillas, la pantalla queda como siempre.
     Enganche por data-lw (emitir-paso-plantilla) y data-accion (demo-nuevo-contrato), nunca por rótulo. */
  // La MISMA regla que emitir.js para «hay con qué emitir»: versión activa, sin archivar y de un tipo activo. Contar la lista
  // entera dejaría la pantalla sin tarjeta y sin plantilla elegible el día que la demo traiga una archivada o de un tipo apagado.
  function usables(d) {
    var tipos = {};
    (d.tipos || []).forEach(function (x) { if (x.activo) tipos[x.clave] = true; });
    return (d.plantillas || []).some(function (p) { return p.activa && p.activa.id && !p.archivada && tipos[p.tipo_contrato]; });
  }
  function emitirSinPlantillas() {
    if (location.pathname.indexOf('/emitir/') !== 0 || typeof window.lwDatos !== 'function') return;
    var paso = document.querySelector('[data-lw="emitir-paso-plantilla"]');
    if (!paso || document.querySelector('[data-axf="emitir-demo"]')) return;
    Promise.all([prepara(), window.lwDatos('plantillas_contrato_datos')]).then(function (rs) {
      var d = rs[1] && rs[1].data;
      if (!d || usables(d) || document.querySelector('[data-axf="emitir-demo"]')) return;
      var tarjeta = el('section', { class: paso.className, 'data-axf': 'emitir-demo' }, [
        el('h2', { class: 'font-headline-sm text-headline-sm', text: t('emitir.tit') }),
        el('p', { class: 'font-body-md text-body-md text-on-surface-variant', text: t('emitir.texto') }),
        el('p', { class: 'font-body-md text-body-md text-on-surface-variant', text: t('emitir.texto2') }),
        el('div', { class: 'axf-acciones' }, [el('button', { type: 'button', class: 'axf-btn axf-btn-pri', 'data-accion': 'demo-nuevo-contrato', text: t('emitir.boton') })])
      ]);
      paso.parentNode.insertBefore(tarjeta, paso);
      paso.style.display = 'none';   // `hidden` no basta: la clase flex de la sección le gana
    }).catch(function (e) { console.error('[demo] issue contract:', (e && e.message) || e); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', emitirSinPlantillas); else emitirSinPlantillas();

  window.AXW_DEMO_FLUJO = Object.freeze({ nuevoContrato: function (clienteId) { abre({ cliente: clienteId }); },
    firmar: function (id) { abre({ firmar: id }); } });
})();
