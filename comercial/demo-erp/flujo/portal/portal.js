/* Portal de cliente de la DEMO (paquete B, fase B3, 11-oct-2026): lo que ve el cliente final de un negocio —sus
   contratos, sus facturas y pagos, sus documentos— leyendo lo que hay en la pestaña (siembra + lo creado en la
   intranet), por el cliente falso del guard de la demo. Marca blanca: ni una frase ni un dato de ningún cliente real.

   Qué cliente se ve: ?cliente=<id> si casa con un cliente de la lista (el id nunca se pinta); si no, el del contrato
   creado más reciente en la pestaña; si no, el primero de la lista. El selector «Viewing as» cambia de cliente.

   Revisión previa (Seguridad, 11-oct): todo dato va por textContent; ningún formulario se envía; y además del
   candado del guard, aquí se corta cualquier petición que no sea GET/HEAD, también al propio dominio. */
(function () {
  'use strict';
  var t = window.AXW_DEMO_T, C = window.AXW_DEMO_CONTRATO;

  /* ── Candado propio: nada que no sea leer sale de la página ─────────── */
  (function () {
    var f = window.fetch;
    if (f) window.fetch = function (input, init) {
      var m = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if (m !== 'GET' && m !== 'HEAD') return Promise.reject(new Error('The demo portal does not send anything.'));
      return f.apply(this, arguments);
    };
    var abre = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (metodo) {
      var m = String(metodo || 'GET').toUpperCase();
      if (m !== 'GET' && m !== 'HEAD') throw new Error('The demo portal does not send anything.');
      return abre.apply(this, arguments);
    };
    document.addEventListener('submit', function (ev) { ev.preventDefault(); }, true);
  })();

  /* ── DOM seguro ─────────────────────────────────────────────────────── */
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
  function q(sel) { return document.querySelector(sel); }
  function dinero(n, mon) { return C.importe(n) + (mon ? ' ' + mon : ''); }
  function porFechaDesc(campo) { return function (a, b) { return String(b[campo] || '').localeCompare(String(a[campo] || '')); }; }

  /* ── Datos ──────────────────────────────────────────────────────────── */
  var D = null;          // { clientes, contratos, cc, facturas, aplic, pendiente }
  var cliente = null;    // fila de clients
  var pestana = 'resumen';

  function filas(r) {
    if (r && r.error) throw new Error(r.error.message || String(r.error));
    return (r && Array.isArray(r.data)) ? r.data : [];
  }
  function lee() {
    if (!window.LW_AUTH) return Promise.reject(new Error(t('datos.no_hay')));
    return window.LW_AUTH.then(function (a) {
      var sb = a.sb;
      return Promise.all([
        sb.from('clients').select('*').order('full_name'),
        sb.from('contratos').select('*'),
        sb.from('contrato_compradores').select('*'),
        sb.from('facturas').select('*'),
        sb.from('recibi_aplicaciones').select('*'),
        sb.from('facturas_pendiente_equipo').select('*')
      ]);
    }).then(function (rs) {
      var pend = {};
      filas(rs[5]).forEach(function (p) { pend[p.factura_id] = Number(p.pendiente); });
      D = { clientes: filas(rs[0]), contratos: filas(rs[1]), cc: filas(rs[2]), facturas: filas(rs[3]).filter(function (f) { return !f.anulada; }),
        aplic: filas(rs[4]), pendiente: pend };
    });
  }

  function eligeCliente() {
    var pedido = new URLSearchParams(location.search).get('cliente');
    var c = D.clientes.filter(function (x) { return x.id === pedido; })[0];
    if (!c) {
      var ult = D.contratos.slice().sort(porFechaDesc('created_at'))[0];
      var comp = ult && D.cc.filter(function (x) { return x.contrato_id === ult.id && x.rol === 'adquiriente_1'; })[0];
      c = comp && D.clientes.filter(function (x) { return x.id === comp.client_id; })[0];
    }
    return c || D.clientes[0] || null;
  }

  function delCliente() {
    var ids = {};
    D.cc.forEach(function (x) { if (x.client_id === cliente.id) ids[x.contrato_id] = true; });
    D.contratos.forEach(function (k) {
      (k.compradores || []).forEach(function (p) { if (p.client_id === cliente.id) ids[k.id] = true; });
    });
    var contratos = D.contratos.filter(function (k) { return ids[k.id]; }).sort(porFechaDesc('created_at'));
    var facturas = D.facturas.filter(function (f) { return ids[f.contrato_id] || f.client_id === cliente.id; });
    var cobradoDe = {};
    D.aplic.forEach(function (a) { cobradoDe[a.factura_id] = (cobradoDe[a.factura_id] || 0) + Number(a.importe_aplicado || 0); });
    function pendienteDe(f) {
      if (Object.prototype.hasOwnProperty.call(D.pendiente, f.id) && isFinite(D.pendiente[f.id])) return Math.max(0, D.pendiente[f.id]);
      return Math.max(0, Number(f.total || 0) - (cobradoDe[f.id] || 0));
    }
    return {
      contratos: contratos,
      facturas: facturas.filter(function (f) { return f.tipo === 'factura'; }).sort(porFechaDesc('fecha_emision')),
      proformas: facturas.filter(function (f) { return f.tipo === 'proforma'; }).sort(porFechaDesc('fecha_emision')),
      cobros: facturas.filter(function (f) { return f.tipo === 'recibi'; }).sort(porFechaDesc('fecha_emision')),
      pendienteDe: pendienteDe
    };
  }

  /* ── Pintado ────────────────────────────────────────────────────────── */
  var TABS = ['resumen', 'contratos', 'facturas', 'documentos'];
  function cabecera() {
    var inst = window.LW_INSTANCIA || {};
    q('[data-ptl="marca"]').textContent = inst.marca || 'Demo';
    q('[data-ptl="titulo"]').textContent = t('p.titulo');
    q('[data-ptl="viendo"]').textContent = t('p.viendo');
    q('[data-ptl="volver"]').textContent = t('p.volver');
    q('[data-ptl="demo"]').textContent = t('p.demo');
    var salto = q('.ptl-salto'); if (salto) salto.textContent = t('p.salto');
    document.title = t('p.titulo') + ' · ' + (inst.marca || 'Demo');
    var lista = q('.ptl-tabs-in');
    lista.textContent = '';
    TABS.forEach(function (k) {
      lista.appendChild(el('button', { type: 'button', role: 'tab', id: 'ptl-tab-' + k, 'aria-controls': 'ptl-main', 'aria-selected': String(k === pestana),
        class: 'ptl-tab', 'data-tab': k, text: t('tab.' + k), onclick: function () { pestana = k; pinta(); } }));
    });
  }
  function selector() {
    var s = q('#ptl-cliente');
    s.textContent = '';
    D.clientes.forEach(function (c) { s.appendChild(el('option', { value: c.id, selected: c.id === cliente.id ? true : null, text: c.full_name })); });
    s.onchange = function () {
      cliente = D.clientes.filter(function (x) { return x.id === s.value; })[0] || cliente;
      var u = new URL(location.href); u.searchParams.set('cliente', cliente.id); history.replaceState(null, '', u.pathname + u.search);
      pinta();
    };
  }

  function tipoDe(k) { var x = t('tipo.' + k.tipo); return x === 'tipo.' + k.tipo ? t('tipo.otro') : x; }
  function datosDoc(k) {
    return { numero: k.numero, fecha: k.created_at, cliente_nombre: cliente.full_name, cliente_pais: cliente.nationality,
      proyecto: k.proyecto_nombre, unidad: k.parcela_codigo, precio: k.precio_total, moneda: k.moneda,
      firmado: !!k.bloqueado, firmante: cliente.full_name, fecha_firma: k.fecha_firma };
  }

  function visor(titulo, contenido) {
    var cerrar = el('button', { type: 'button', class: 'axf-btn axf-btn-sec', text: t('v.cerrar') });
    var imp = el('button', { type: 'button', class: 'axf-btn axf-btn-sec', text: t('b.imprimir'), onclick: function () { window.print(); } });
    var capa = el('div', { class: 'ptl-visor', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, [
      el('div', { class: 'ptl-visor-marco' }, [
        el('div', { class: 'ptl-visor-cab' }, [el('h2', { class: 'ptl-h2', text: titulo }), el('div', { class: 'axf-acciones' }, [imp, cerrar])]),
        contenido
      ])
    ]);
    function fuera() { capa.remove(); document.documentElement.classList.remove('axf-abierto'); }
    cerrar.addEventListener('click', fuera);
    capa.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fuera(); });
    capa.addEventListener('click', function (ev) { if (ev.target === capa) fuera(); });
    document.body.appendChild(capa);
    document.documentElement.classList.add('axf-abierto');
    cerrar.focus();
  }
  function verContrato(k) { visor(t('d.contrato', k.numero), C.documento(datosDoc(k))); }
  function verRecibo(f) {
    var k = D.contratos.filter(function (x) { return x.id === f.contrato_id; })[0] || {};
    var art = el('article', { class: 'axf-doc' }, [
      el('div', { class: 'axf-marca', 'aria-hidden': 'true' }, [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function () { return el('span', { text: t('doc.marca') }); })),
      el('p', { class: 'axf-doc-banda', text: t('plantilla')[0][1] }),
      el('h2', { class: 'axf-doc-titulo', text: t('v.recibo_tit', f.numero) }),
      el('p', { class: 'axf-doc-p', text: t('v.recibo_txt', C.importe(f.total), f.moneda || '', C.fecha(f.fecha_emision), k.numero || f.contrato_numero || '—') })
    ]);
    visor(t('d.recibo', f.numero), art);
  }

  function estadoContrato(k) {
    return k.bloqueado ? el('span', { class: 'ptl-estado ptl-ok', text: t('c.firmado') }) : el('span', { class: 'ptl-estado ptl-pend', text: t('c.pendiente') });
  }
  function botonFirmar(k) {
    return el('button', { type: 'button', class: 'axf-btn axf-btn-pri', 'data-accion': 'demo-firmar', 'data-id': k.id, text: t('c.firmar') });
  }
  function tarjetaContrato(k) {
    return el('article', { class: 'ptl-card ptl-contrato' }, [
      el('div', { class: 'ptl-card-cab' }, [
        el('div', {}, [el('p', { class: 'ptl-rot', text: tipoDe(k) }), el('h3', { class: 'ptl-h3', text: k.numero })]),
        estadoContrato(k)
      ]),
      el('p', { class: 'ptl-linea', text: [k.proyecto_nombre, k.parcela_codigo ? t('c.unidad', k.parcela_codigo) : null].filter(Boolean).join(' · ') }),
      el('p', { class: 'ptl-cifra', text: dinero(k.precio_total, k.moneda) }),
      el('p', { class: 'ptl-sub', text: k.bloqueado ? t('c.fecha_firma', C.fecha(k.fecha_firma)) : t('c.fecha_alta', C.fecha(k.created_at)) }),
      el('div', { class: 'axf-acciones' }, [
        el('button', { type: 'button', class: 'axf-btn axf-btn-sec', text: t('c.ver'), onclick: function () { verContrato(k); } }),
        k.bloqueado ? null : botonFirmar(k)
      ])
    ]);
  }

  function totales(m) {
    var por = {};
    function suma(mon, campo, x) { por[mon] = por[mon] || { facturado: 0, pagado: 0, pendiente: 0 }; por[mon][campo] += Number(x || 0); }
    m.facturas.forEach(function (f) { suma(f.moneda || '', 'facturado', f.total); suma(f.moneda || '', 'pendiente', m.pendienteDe(f)); });
    m.cobros.forEach(function (f) { suma(f.moneda || '', 'pagado', f.total); });
    return por;
  }

  function resumen(m) {
    var firmados = m.contratos.filter(function (k) { return k.bloqueado; }).length;
    var tot = totales(m), monedas = Object.keys(tot);
    var mon = monedas[0] || (m.contratos[0] && m.contratos[0].moneda) || '';
    var x = tot[mon] || { facturado: 0, pagado: 0, pendiente: 0 };
    function kpi(rot, valor, sub) { return el('div', { class: 'ptl-kpi' }, [el('p', { class: 'ptl-rot', text: rot }), el('p', { class: 'ptl-kpi-n', text: valor }), sub ? el('p', { class: 'ptl-sub', text: sub }) : null]); }
    var pasos = [];
    m.contratos.filter(function (k) { return !k.bloqueado; }).forEach(function (k) {
      pasos.push(el('li', {}, [el('span', { text: t('r.firmar', k.numero) }), botonFirmar(k)]));
    });
    m.facturas.filter(function (f) { return m.pendienteDe(f) > 0; }).slice(0, 4).forEach(function (f) {
      pasos.push(el('li', {}, [el('span', { text: t('r.pagar', f.numero, dinero(m.pendienteDe(f), f.moneda)) })]));
    });
    var ultimos = m.contratos.slice(0, 3).map(tarjetaContrato);
    return [
      el('section', { class: 'ptl-hola' }, [el('h1', { class: 'ptl-h1', text: t('p.hola', (cliente.full_name || '').split(' ')[0]) }), el('p', { class: 'ptl-sub', text: t('p.hola_sub') })]),
      el('section', { class: 'ptl-kpis', 'aria-label': t('tab.resumen') }, [
        kpi(t('k.contratos'), String(m.contratos.length), t('k.firmados', firmados)),
        kpi(t('k.facturado'), dinero(x.facturado, mon), monedas.length > 1 ? t('k.monedas', mon) : null),
        kpi(t('k.pagado'), dinero(x.pagado, mon)),
        kpi(t('k.pendiente'), dinero(x.pendiente, mon))
      ]),
      el('section', { class: 'ptl-card' }, [el('h2', { class: 'ptl-h2', text: t('r.siguiente') }),
        pasos.length ? el('ul', { class: 'ptl-pasos' }, pasos) : el('p', { class: 'ptl-sub', text: t('r.nada') })]),
      ultimos.length ? el('section', {}, [el('h2', { class: 'ptl-h2', text: t('r.ultimos') }), el('div', { class: 'ptl-rejilla' }, ultimos)]) : null
    ];
  }

  function contratos(m) {
    if (!m.contratos.length) return [el('p', { class: 'ptl-vacio', text: t('c.vacio') })];
    return [el('div', { class: 'ptl-rejilla' }, m.contratos.map(tarjetaContrato))];
  }

  function tabla(cab, filasT) {
    return el('div', { class: 'ptl-tabla-caja' }, [el('table', { class: 'ptl-tabla' }, [
      el('thead', {}, [el('tr', {}, cab.map(function (c) { return el('th', { scope: 'col', text: c }); }))]),
      el('tbody', {}, filasT)
    ])]);
  }
  function concepto(f) {
    var c = f.datos && Array.isArray(f.datos.conceptos) && f.datos.conceptos[0];
    return (c && c.desc) || t('fa.contrato', f.contrato_numero || '—');
  }
  function facturas(m) {
    var cab = [t('fa.numero'), t('fa.fecha'), t('fa.concepto'), t('fa.importe'), t('fa.estado')];
    function estado(f) {
      if (f.tipo === 'proforma') return el('span', { class: 'ptl-estado', text: t('fa.proforma') });
      var p = m.pendienteDe(f);
      if (p <= 0) return el('span', { class: 'ptl-estado ptl-ok', text: t('fa.pagada') });
      if (p < Number(f.total || 0)) return el('span', { class: 'ptl-estado ptl-pend', text: t('fa.parcial', dinero(p, f.moneda)) });
      return el('span', { class: 'ptl-estado ptl-pend', text: t('fa.pendiente') });
    }
    function fila(f, conEstado) {
      return el('tr', {}, [el('td', { 'data-rot': cab[0], text: f.numero }), el('td', { 'data-rot': cab[1], text: C.fecha(f.fecha_emision) }),
        el('td', { 'data-rot': cab[2], text: concepto(f) }), el('td', { 'data-rot': cab[3], class: 'ptl-num', text: dinero(f.total, f.moneda) }),
        conEstado ? el('td', { 'data-rot': cab[4] }, [estado(f)]) : el('td', { 'data-rot': cab[4] }, [el('span', { class: 'ptl-estado ptl-ok', text: t('fa.pagada') })])]);
    }
    var lista = m.facturas.concat(m.proformas);
    return [
      el('section', { class: 'ptl-card' }, [el('h2', { class: 'ptl-h2', text: t('fa.facturas') }),
        lista.length ? tabla(cab, lista.map(function (f) { return fila(f, true); })) : el('p', { class: 'ptl-vacio', text: t('fa.vacio') })]),
      el('section', { class: 'ptl-card' }, [el('h2', { class: 'ptl-h2', text: t('fa.cobros') }),
        m.cobros.length ? tabla(cab, m.cobros.map(function (f) { return fila(f, false); })) : el('p', { class: 'ptl-vacio', text: t('fa.cobros_vacio') })])
    ];
  }

  function documentos(m) {
    var docs = m.contratos.filter(function (k) { return k.bloqueado; }).map(function (k) {
      return { fecha: k.fecha_firma || k.created_at, titulo: t('d.contrato', k.numero), sub: [tipoDe(k), k.proyecto_nombre].filter(Boolean).join(' · '), ver: function () { verContrato(k); } };
    }).concat(m.cobros.map(function (f) {
      return { fecha: f.fecha_emision, titulo: t('d.recibo', f.numero), sub: dinero(f.total, f.moneda), ver: function () { verRecibo(f); } };
    })).sort(porFechaDesc('fecha'));
    return [
      el('p', { class: 'ptl-nota', text: t('d.nota') }),
      docs.length ? el('ul', { class: 'ptl-docs' }, docs.map(function (d) {
        return el('li', { class: 'ptl-doc' }, [
          el('div', {}, [el('p', { class: 'ptl-doc-tit', text: d.titulo }), el('p', { class: 'ptl-sub', text: [d.sub, C.fecha(d.fecha)].filter(Boolean).join(' · ') })]),
          el('button', { type: 'button', class: 'axf-btn axf-btn-sec', text: t('d.ver'), onclick: d.ver })
        ]);
      })) : el('p', { class: 'ptl-vacio', text: t('d.vacio') })
    ];
  }

  function pinta() {
    cabecera();
    selector();
    var main = q('#ptl-main');
    main.textContent = '';
    main.setAttribute('aria-labelledby', 'ptl-tab-' + pestana);
    var m = delCliente();
    var partes = { resumen: resumen, contratos: contratos, facturas: facturas, documentos: documentos }[pestana](m);
    partes.forEach(function (p) { if (p) main.appendChild(p); });
  }

  function error(msg) {
    var main = q('#ptl-main');
    main.textContent = '';
    main.appendChild(el('p', { class: 'ptl-error', role: 'alert', text: msg }));
  }

  function arranca() {
    cabecera();
    q('#ptl-main').appendChild(el('p', { class: 'ptl-sub', text: t('p.cargando') }));
    lee().then(function () {
      cliente = eligeCliente();
      if (!cliente) { q('#ptl-cliente').hidden = true; return error(t('p.sin_clientes')); }
      pinta();
    }).catch(function (e) { error(t('p.error', (e && e.message) || String(e))); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arranca); else arranca();
})();
