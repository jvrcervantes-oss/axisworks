/* Portal de clientes de la DEMO (encargo demo_cliente_flujo_total, fase E1, 12-oct-2026). Se publica como /portal/demo-axw.js.

   El portal que se ve en demo.axisworks.studio/portal/ es el portal de clientes del ERP TAL CUAL (owner, 12-oct: «quiero la demo
   que hicimos para Lawang, tal cual está»): build.py copia su index.html y sus módulos y les cambia marca, nombres e idioma. Su
   modo demo de origen trae un fichero de datos propio con nombres de un cliente real; ESTE fichero lo sustituye y no inventa un
   segundo mundo: el portal lee el MISMO doble que la intranet de la demo (window.LW_AUTH → sb, el almacén de la pestaña), así que
   el contrato, la factura o el cobro que el visitante crea en la intranet aparecen aquí con sus números e importes.

   Qué hace:
   - window.supabase.createClient → un cliente del portal: sesión siempre abierta (la demo no tiene contraseña), la llamada
     portal_situacion construida desde las tablas del doble, y lo que el portal escribe (consultas, mensajes, preferencias) por
     funciones del doble (sb.rpc → LW_DEMO_RPC_GUARDA de demo_datos.js), de modo que sobrevive a recargar y «Reset demo» lo borra
     con todo lo demás.
   - Las dos funciones del servidor que pide por fetch (portal-acceso, firma-get) se contestan aquí, por ruta exacta sobre la URL
     falsa de la demo; ninguna otra petición que no sea GET sale (el candado del doble ya corta la red de fuera).
   - Ficheros (documentos, contratos firmados, fotos de obra, portadas): fotos libres servidas desde /portal/demo/fotos/ y una página de muestra con la marca
     «DEMO · NOT A VALID DOCUMENT». Nunca una URL externa ni un mapa (revisión previa de Seguridad #279).

   Qué cliente se ve: ?cliente=<id> si casa con un cliente del doble; si no, el comprador del contrato creado en la pestaña (de
   las últimas 12 h; la siembra es de días atrás); si no, el cliente de la siembra con más historial. Si ?cliente= no casa, un
   aviso fijo lo dice (nunca se repite lo que trae la dirección). */
(function () {
  'use strict';
  if (!window.supabase || !window.LW_AUTH) return;   // sin el doble no hay demo: index.html falla cerrado (AXW_PORTAL_DEMO sin poner)

  var DIA = 86400000;
  function hoyMs() { return Date.now(); }
  function iso(n) { return new Date(hoyMs() + n * DIA).toISOString(); }
  // Fecha del día del VISITANTE (no la de UTC): en Bali de madrugada toISOString() da el día anterior (lección del 12-oct).
  function diaLocal(ms) { var d = new Date(ms); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dia(n) { return diaLocal(hoyMs() + n * DIA); }
  function soloDia(x) { return x ? String(x).slice(0, 10) : null; }
  function num(x) { var n = Number(x); return isFinite(n) ? n : 0; }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }

  /* ── fotos de relleno: portadas y fotos de obra (12-oct-2026). Libres de licencia (Unsplash/Pexels/CC0), de ningún proyecto
     real, servidas desde la propia demo; procedencia en portal_demo/fotos/LICENCIAS.md. build.py exige estas mismas (FOTOS_PORTAL). ── */
  var FOTOS = '/portal/demo/fotos/';
  // Una escena por proyecto: villas en ladera, villa con piscina y casas entre palmeras.
  function portada(i) { return FOTOS + 'portada-' + (i % 3 + 1) + '.webp'; }
  function foto(paso) { return FOTOS + 'obra-' + paso + '.webp'; }
  var DOC_MUESTRA = '/portal/demo/documento.html';
  var IMG = {};
  function img(ruta, url) { IMG[ruta] = url; return ruta; }

  /* ── el doble ── */
  function doble() { return window.LW_AUTH.then(function (a) { return a.sb; }); }
  function filas(r, que) {
    if (r && r.error) throw new Error(que + ': ' + (r.error.message || String(r.error)));
    return (r && Array.isArray(r.data)) ? r.data : [];
  }
  function lee(sb) {
    return Promise.all([
      sb.from('clients').select('id,full_name,email,phone,nationality,kyc_status,created_at,portal_prefs,passport_number,tipo'),
      sb.from('contratos').select('id,numero,tipo,bloqueado,created_at,fecha_firma,moneda,precio_total,proyecto_id,proyecto_nombre,parcela_codigo,unidad_id,contrato_padre_id'),
      sb.from('contrato_compradores').select('contrato_id,client_id,rol'),
      sb.from('facturas').select('id,numero,tipo,anulada,client_id,contrato_id,contrato_numero,proyecto_nombre,fecha_emision,moneda,total,sociedad,venc,datos'),
      sb.from('recibi_aplicaciones').select('recibi_id,factura_id,importe_aplicado'),
      sb.from('contrato_firmas').select('contrato_id,estado,expira_en'),
      sb.from('contrato_vencimientos').select('contrato_id,orden,descripcion,pct,monto,fecha'),
      sb.from('unidades').select('id,codigo,proyecto_id,obra_fase,obra_fecha_entrega,obra_actualizado'),
      sb.from('hilo_soporte').select('id,client_id,categoria,estado,actualizado_en,contrato_id,factura_id,ref_numero'),
      sb.from('mensajes_comprador').select('id,hilo_id,client_id,de,autor,texto,creado_en'),
      sb.rpc('sociedades_visibles')
    ]).then(function (rs) {
      var n = ['clients', 'contratos', 'contrato_compradores', 'facturas', 'recibi_aplicaciones', 'contrato_firmas', 'contrato_vencimientos',
        'unidades', 'hilo_soporte', 'mensajes_comprador', 'sociedades_visibles'];
      var T = {};
      rs.forEach(function (r, i) { T[n[i]] = filas(r, n[i]); });
      return T;
    });
  }

  var AVISO_CLIENTE = false;   // ?cliente= que no casa con ningún cliente
  function eligeCliente(T) {
    var pedido = null;
    try { pedido = new URLSearchParams(location.search).get('cliente'); } catch (e) { pedido = null; /* MUDO A PROPOSITO: sin URLSearchParams se elige por el contrato más reciente */ }
    var c = pedido ? T.clients.filter(function (x) { return x.id === pedido; })[0] : null;
    AVISO_CLIENTE = !!(pedido && !c);
    function compradorDe(k) {
      var comp = k && T.contrato_compradores.filter(function (x) { return x.contrato_id === k.id && x.rol === 'adquiriente_1'; })[0];
      return comp && T.clients.filter(function (x) { return x.id === comp.client_id; })[0];
    }
    if (!c) {
      // Lo creado EN LA PESTAÑA: la siembra fecha sus contratos como mínimo días atrás; uno de las últimas 12 h es del visitante.
      var limite = new Date(hoyMs() - DIA / 2).toISOString();
      var nuevos = T.contratos.filter(function (k) { return String(k.created_at || '') >= limite; })
        .sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
      c = compradorDe(nuevos[0]);
    }
    if (!c) {
      // Sin nada creado: el cliente de la siembra con más historial (contratos firmados, facturas y cobros), el que mejor enseña
      // todas las pantallas. Empate: el primero de la lista.
      var peso = {};
      T.contrato_compradores.forEach(function (x) {
        var k = T.contratos.filter(function (y) { return y.id === x.contrato_id; })[0];
        if (k && x.rol === 'adquiriente_1') peso[x.client_id] = (peso[x.client_id] || 0) + (k.bloqueado ? 3 : 1);
      });
      T.facturas.forEach(function (f) { if (f.client_id && !f.anulada) peso[f.client_id] = (peso[f.client_id] || 0) + 1; });
      c = T.clients.slice().sort(function (a, b) { return (peso[b.id] || 0) - (peso[a.id] || 0); })[0];
    }
    return c || null;
  }

  var FASES = [{ orden: 1, clave: 'preparacion', es: 'Preparación del terreno', en: 'Site preparation' }, { orden: 2, clave: 'cimentacion', es: 'Cimentación', en: 'Foundations' },
    { orden: 3, clave: 'estructura', es: 'Estructura', en: 'Structure' }, { orden: 4, clave: 'cubierta', es: 'Cubierta', en: 'Roofing' },
    { orden: 5, clave: 'instalaciones', es: 'Instalaciones', en: 'Utilities & MEP' }, { orden: 6, clave: 'acabados', es: 'Acabados', en: 'Finishes' },
    { orden: 7, clave: 'entregada', es: 'Entregada', en: 'Handed over' }];
  var ZONAS = ['North Coast', 'Highlands', 'River Valley'];   // ubicación de ejemplo de cada proyecto (el doble no la trae)

  /* portal_situacion: la misma forma que devuelve la base del ERP (la del modo demo de origen), construida desde el doble. */
  function situacion(T) {
    var cli = eligeCliente(T);
    if (!cli) throw new Error('no clients in the demo data');
    var prefs = cli.portal_prefs || {};
    var ids = {};
    T.contrato_compradores.forEach(function (x) { if (x.client_id === cli.id) ids[x.contrato_id] = true; });
    var mios = T.contratos.filter(function (k) { return ids[k.id]; });
    var facs = T.facturas.filter(function (f) { return !f.anulada && (ids[f.contrato_id] || f.client_id === cli.id); });
    var porFactura = {}, porRecibi = {}, numFac = {};
    T.facturas.forEach(function (f) { numFac[f.id] = f.numero; });
    T.recibi_aplicaciones.forEach(function (a) {
      porFactura[a.factura_id] = (porFactura[a.factura_id] || 0) + num(a.importe_aplicado);
      (porRecibi[a.recibi_id] = porRecibi[a.recibi_id] || []).push({ numero: numFac[a.factura_id] || null, importe: num(a.importe_aplicado) });
    });
    var soc = {};
    T.sociedades_visibles.forEach(function (s) { soc[s.clave] = s; });
    function emisor(clave) { var s = soc[clave] || T.sociedades_visibles[0] || {}; return { label: s.label, razon: s.razon, domicilio: s.domicilio, npwp: s.npwp }; }
    function lineas(f) {
      var c = (f.datos && Array.isArray(f.datos.conceptos)) ? f.datos.conceptos : [];
      var l = c.map(function (x) { return { descripcion: x.desc || x.descripcion || '', importe: num(x.importe) }; });
      return l.length ? l : [{ descripcion: 'Contract ' + (f.contrato_numero || ''), importe: num(f.total) }];
    }

    // proyectos del cliente (en el orden de sus contratos)
    var proyectos = [], pIdx = {}, todosP = {};
    T.contratos.forEach(function (k) { if (k.proyecto_id && !(k.proyecto_id in todosP)) todosP[k.proyecto_id] = Object.keys(todosP).length; });
    var uPorId = {};
    T.unidades.forEach(function (u) { uPorId[u.id] = u; });
    mios.forEach(function (k) {
      if (!k.proyecto_id || pIdx[k.proyecto_id] != null) return;
      var i = todosP[k.proyecto_id] || 0;
      var entregas = mios.filter(function (x) { return x.proyecto_id === k.proyecto_id && uPorId[x.unidad_id] && uPorId[x.unidad_id].obra_fecha_entrega; })
        .map(function (x) { return uPorId[x.unidad_id].obra_fecha_entrega; }).sort();
      pIdx[k.proyecto_id] = proyectos.length;
      proyectos.push({ id: k.proyecto_id, nombre: k.proyecto_nombre, resort: ZONAS[i % ZONAS.length], entrega: entregas.slice(-1)[0] || null, mapa: null,
        portada: img('portada/' + k.proyecto_id, portada(i)) });
    });

    var contratos = mios.map(function (k) {
      // La Carta de Reserva es preliminar: lo que se factura y cobra con ella es del Bloqueo del que cuelga (el portal lo dice así:
      // «its amount and its schedule are theirs»). Sin esto el Bloqueo enseñaba pendiente el resto del suelo ya cobrado.
      var suyos = {};
      suyos[k.id] = true;
      if (k.tipo === 'reserva_parcela') mios.forEach(function (x) { if (x.tipo === 'carta_reserva' && x.contrato_padre_id === k.id) suyos[x.id] = true; });
      var cobrado = facs.filter(function (f) { return f.tipo === 'recibi' && suyos[f.contrato_id]; }).reduce(function (s, f) { return s + num(f.total); }, 0);
      // …y la Carta que cuelga de un Bloqueo del cliente no cobra por su cuenta (como en la base del ERP: cobrado 0), o el
      // portal sumaba dos veces ese resto del suelo («Paid €143,000» sobre una inversión de €109,500, medido el 12-oct).
      if (k.tipo === 'carta_reserva' && mios.some(function (x) { return x.id === k.contrato_padre_id; })) cobrado = 0;
      var venc = T.contrato_vencimientos.filter(function (v) { return v.contrato_id === k.id; }).sort(function (a, b) { return num(a.orden) - num(b.orden); });
      var hitos;
      if (venc.length) {
        // Plazo como lo escribe el calendario de un contrato: «a la firma» el primero, «mes N» contado desde él.
        var f0 = venc[0].fecha ? new Date(soloDia(venc[0].fecha) + 'T12:00:00').getTime() : null;
        hitos = venc.map(function (v, i) {
          var monto = v.monto != null ? num(v.monto) : Math.round(num(k.precio_total) * num(v.pct) / 100);
          var meses = (f0 != null && v.fecha) ? Math.round((new Date(soloDia(v.fecha) + 'T12:00:00').getTime() - f0) / (30 * DIA)) : null;
          var plazo = i === 0 ? 'At signing' : (meses ? 'Month ' + meses : '');
          return { es: v.descripcion, en: v.descripcion, timing: plazo, monto: monto, fecha: soloDia(v.fecha) };
        });
      } else {
        var emitidas = facs.filter(function (f) { return f.tipo === 'factura' && suyos[f.contrato_id]; })
          .sort(function (a, b) { return String(a.fecha_emision).localeCompare(String(b.fecha_emision)); });
        hitos = emitidas.length
          ? emitidas.map(function (f) { var l = lineas(f)[0]; return { es: l.descripcion, en: l.descripcion, timing: '', monto: num(f.total), fecha: soloDia(f.venc || f.fecha_emision) }; })
          : [{ es: 'Precio total', en: 'Full price', timing: '', monto: num(k.precio_total), fecha: soloDia(k.fecha_firma || k.created_at) }];
      }
      return { id: k.id, numero: k.numero, tipo: k.tipo, proyecto_id: k.proyecto_id, proyecto: k.proyecto_nombre, parcela: k.parcela_codigo,
        precio: num(k.precio_total), cobrado: cobrado, moneda: k.moneda, firmado: !!k.bloqueado, fecha_firma: k.bloqueado ? soloDia(k.fecha_firma) : null,
        pdf: k.bloqueado ? 'contratos/' + k.numero + '.html' : null, hitos: hitos };
    });
    var kPorId = {};
    contratos.forEach(function (k) { kPorId[k.id] = k; });

    var facturas = facs.map(function (f) {
      var k = kPorId[f.contrato_id] || {};
      var l = lineas(f);
      var vence = soloDia(f.venc) || (f.tipo === 'recibi' ? null : diaLocal(new Date(soloDia(f.fecha_emision) + 'T12:00:00').getTime() + 15 * DIA));
      var x = { id: f.id, numero: f.numero, tipo: f.tipo, proyecto: f.proyecto_nombre || k.proyecto, fecha: soloDia(f.fecha_emision), total: num(f.total),
        moneda: f.moneda, contrato_numero: f.contrato_numero || k.numero, contrato_id: f.contrato_id || null, emisor: emisor(f.sociedad), lineas: l,
        fields: { sociedad: f.sociedad, tipo: f.tipo, moneda: f.moneda, cliente_nombre: cli.full_name, cliente_email: cli.email, fecha_emision: soloDia(f.fecha_emision),
          fecha_vencimiento: vence, proyecto_nombre: f.proyecto_nombre || k.proyecto, contrato_numero: f.contrato_numero || k.numero, lineas: l } };
      if (f.tipo === 'factura') { x.aplicado = porFactura[f.id] || 0; x.vence = vence; }
      else if (f.tipo === 'proforma') x.aplicado = null;
      else if (f.tipo === 'recibi') x.salda = porRecibi[f.id] || [];
      return x;
    });

    var firma_pendiente = T.contrato_firmas.filter(function (s) { return s.estado === 'pendiente' && kPorId[s.contrato_id] && !kPorId[s.contrato_id].firmado; })
      .map(function (s) {
        var k = mios.filter(function (x) { return x.id === s.contrato_id; })[0] || {};
        // `?t=` lo lee la vista del borrador; `#` hace que «Sign now» no salga de la página (lo abre la firma de ejemplo).
        return { contrato_id: s.contrato_id, enlace: '#firma?t=' + encodeURIComponent(s.contrato_id), enviado_en: k.created_at || iso(-1), expira_en: s.expira_en || iso(7) };
      });

    var obra = [];
    contratos.forEach(function (k, j) {
      var kk = mios.filter(function (x) { return x.id === k.id; })[0];
      var u = kk && uPorId[kk.unidad_id];
      if (k.tipo !== 'construccion' || !k.firmado || !u || !u.obra_fase) return;
      // Fotos de ejemplo según la fase de la unidad; las fechas de la entregada cuelgan de su fecha de entrega.
      var entrega = u.obra_fecha_entrega ? Math.round((new Date(soloDia(u.obra_fecha_entrega) + 'T12:00:00').getTime() - hoyMs()) / DIA) : -20;
      var TITULOS = {
        cimentacion: [['Foundation pour', -6, 'hormigonado'], ['Excavation', -19, 'excavacion'], ['Site set-out', -33, 'replanteo']],
        estructura: [['Columns, north side', -4, 'pilares'], ['Slab formwork', -12, 'encofrado'], ['Foundations finished', -30, 'cimentacion'], ['Excavation', -52, 'excavacion']],
        entregada: [['Key handover', entrega, 'llaves'], ['Interior finishes', entrega - 30, 'interior'], ['Roof completed', entrega - 90, 'cubierta']]
      };
      var titulos = TITULOS[u.obra_fase] || [['Site progress', -7, 'pilares'], ['Site progress', -21, 'cimentacion']];
      obra.push({ unidad: u.codigo, proyecto: k.proyecto, contrato_numero: k.numero, fase: u.obra_fase, fecha_entrega: soloDia(u.obra_fecha_entrega),
        actualizado: soloDia(u.obra_actualizado) || dia(-4),
        fotos: titulos.map(function (t, i) { return { path: img('obra/' + u.codigo + '/' + i, foto(t[2])), titulo: t[0], fecha: dia(t[1]) }; }) });
    });

    var documentos = [];
    proyectos.forEach(function (p) {
      [['Project brochure', 'comercial', 'Overview, finishes and villa models'], ['Floor plans', 'planos', 'Ground and upper floor'], ['Technical specification', 'tecnico', 'Structure, foundations and utilities'],
        ['Community rules', 'legal', null], ['Site photos', 'fotos', null]].forEach(function (d, i) {
        documentos.push({ id: 'doc-' + p.id + '-' + i, proyecto_id: p.id, proyecto: p.nombre, titulo: d[0], categoria: d[1], path: 'docs/' + p.id + '/' + i + '.html', descripcion: d[2] || undefined });
      });
    });

    // Pasaporte de ejemplo de quien tiene número de pasaporte en su ficha (no las empresas): caduca pronto para que se vea el
    // aviso de Inicio, como en el modo demo del portal de origen.
    var kyc = cli.passport_number && cli.tipo !== 'empresa'
      ? [{ tipo: 'passport', subido: cli.created_at || iso(-200), caduca: dia(13), path: 'kyc/passport.html' }]
      : [];

    var porHilo = {};
    T.mensajes_comprador.forEach(function (m) { if (m.client_id === cli.id) (porHilo[m.hilo_id] = porHilo[m.hilo_id] || []).push(m); });
    var tickets = T.hilo_soporte.filter(function (h) { return h.client_id === cli.id; }).map(function (h) {
      var ms = (porHilo[h.id] || []).sort(function (a, b) { return String(a.creado_en).localeCompare(String(b.creado_en)); });
      return { id: h.id, categoria: h.categoria, estado: h.estado, factura_id: h.factura_id || null, contrato_id: h.contrato_id || null, ref_numero: h.ref_numero || null,
        actualizado_en: h.actualizado_en,
        mensajes: ms.map(function (m) { return { id: m.id, de: m.de === 'equipo' ? 'equipo' : 'cliente', autor: m.de === 'equipo' ? (m.autor || 'AxisWorks Demo team') : null, texto: m.texto, creado_en: m.creado_en }; }) };
    }).sort(function (a, b) { return String(b.actualizado_en).localeCompare(String(a.actualizado_en)); });

    return { client_id: cli.id, nombre: cli.full_name, email: cli.email, telefono: cli.phone, pais: cli.nationality,
      prefs: { pref_email: prefs.pref_email !== false, pref_sms: !!prefs.pref_sms, notif_visto_hasta: prefs.notif_visto_hasta || iso(-40) },
      color_avatar: prefs.color_avatar || null,
      proyectos: proyectos, contratos: contratos, documentos: documentos, facturas: facturas, firma_pendiente: firma_pendiente,
      fases: copia(FASES), obra: obra, kyc: kyc, tickets: tickets };
  }

  /* ── lo que el portal escribe: por las funciones del doble (demo_datos.js → LW_DEMO_RPC_GUARDA), nunca tabla a tabla desde
     aquí (frontera front/back); quedan en el diario de la pestaña y «Reset demo» las borra. ── */
  var ULTIMA = null;   // la última situación servida: de ella sale el cliente que el portal está enseñando
  function escribe(sb, nombre, args) {
    if (!ULTIMA) return Promise.reject(new Error('no client'));
    return sb.rpc(nombre, Object.assign({ p_client_id: ULTIMA.client_id }, args)).then(function (r) {
      if (r && r.error) throw new Error(r.error.message || String(r.error));
      return r ? r.data : null;
    });
  }

  /* ── el cliente del portal ── */
  function resultado(p) {   // {data, error} encadenable (.select(), .order()) como el cliente real
    var pr = p.then(function (data) { return { data: data, error: null }; }, function (e) { return { data: null, error: { message: (e && e.message) || String(e) } }; });
    var b = { order: function () { return b; }, select: function () { return b; }, then: function (a, c) { return pr.then(a, c); }, catch: function (f) { return pr.catch(f); } };
    return b;
  }
  var SESION = { access_token: 'demo', user: { id: 'demo-portal', email: 'client@example.com', app_metadata: { portal: true } } };
  var oyentes = [];
  var cliente = {
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: SESION }, error: null }); },
      onAuthStateChange: function (fn) { oyentes.push(fn); return { data: { subscription: { unsubscribe: function () {} } } }; },
      signInWithPassword: function () { return Promise.resolve({ data: { session: SESION }, error: null }); },
      verifyOtp: function () { return Promise.resolve({ data: null, error: { message: 'Sign-in links are disabled in the demo.' } }); },
      signOut: function () { return Promise.resolve({ error: null }); },
      updateUser: function () { return Promise.resolve({ data: null, error: { message: 'Disabled in the demo.' } }); }
    },
    rpc: function (n, a) {
      a = a || {};
      return resultado(doble().then(function (sb) {
        if (n === 'portal_situacion') return lee(sb).then(function (T) { ULTIMA = situacion(T); avisoCliente(); return copia(ULTIMA); });
        if (n === 'sociedades_visibles' || n === 'cuentas_cobro_visibles') return sb.rpc(n, a).then(function (r) { return filas(r, n); });
        if (n === 'portal_get_color_avatar') return (ULTIMA && ULTIMA.color_avatar) || 'petroleo';
        if (n === 'portal_set_color_avatar') return escribe(sb, 'portal_guarda_prefs', { p_color: a.p_color });
        if (n === 'portal_set_prefs') return escribe(sb, 'portal_guarda_prefs', { p_pref_email: !!a.p_pref_email, p_pref_sms: !!a.p_pref_sms });
        if (n === 'portal_marcar_notificaciones_leidas') return escribe(sb, 'portal_guarda_prefs', { p_visto: true });
        if (n === 'portal_abrir_ticket') return escribe(sb, 'portal_abrir_ticket', { p_categoria: a.p_categoria, p_texto: a.p_texto, p_factura_id: a.p_factura_id || null, p_contrato_id: a.p_contrato_id || null });
        if (n === 'portal_enviar_mensaje') return escribe(sb, 'portal_enviar_mensaje', { p_hilo_id: a.p_hilo_id, p_texto: a.p_texto });
        throw new Error(n + ': not available in the demo');
      }));
    },
    storage: { from: function () {
      function url(p) { return IMG[p] || DOC_MUESTRA; }
      return {
        createSignedUrl: function (p) { return Promise.resolve({ data: { signedUrl: url(p) }, error: null }); },
        createSignedUrls: function (ps) { return Promise.resolve({ data: (ps || []).map(function (p) { return { path: p, signedUrl: url(p), error: null }; }), error: null }); }
      };
    } }
  };
  window.supabase.createClient = function () { return cliente; };

  /* ── las dos funciones del servidor que el portal pide por fetch, contestadas aquí (por ruta exacta sobre la URL falsa) ── */
  var URL_SB = (window.LW_INSTANCIA && window.LW_INSTANCIA.sb_url) || 'https://demo.invalid';
  var fetchAntes = window.fetch;
  function json(j, st) { return new Response(JSON.stringify(j), { status: st || 200, headers: { 'content-type': 'application/json' } }); }
  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function borrador(token) {
    var k = ULTIMA && ULTIMA.contratos.filter(function (x) { return x.id === token; })[0];
    if (!k) return json({ error: 'not found' }, 404);
    var html = '<!doctype html><meta charset="utf-8"><body style="font:15px/1.6 system-ui,sans-serif;padding:28px;color:#1b1c19">' +
      '<p style="border:3px solid rgba(186,26,26,.55);color:#ba1a1a;text-align:center;font-weight:600;letter-spacing:.08em;padding:6px;margin:0 0 18px">DEMO · NOT A VALID DOCUMENT</p>' +
      '<h2 style="margin:0 0 8px">Draft contract ' + escHtml(k.numero) + '</h2><p>' + escHtml(k.proyecto || '') + (k.parcela ? ' · unit ' + escHtml(k.parcela) : '') + '</p>' +
      '<p>This is a sample: in the real product the client reads here the full draft of the contract before signing it.</p></body>';
    return json({ numero: k.numero, html: html });
  }
  window.fetch = function (u, o) {
    var url = String(u && u.url ? u.url : u);
    if (url === URL_SB + '/functions/v1/portal-acceso') return Promise.resolve(json({ ok: true }));
    if (url === URL_SB + '/functions/v1/firma-get') {
      var token = null;
      try { token = JSON.parse((o && o.body) || '{}').token; } catch (e) { token = null; /* MUDO A PROPOSITO: cuerpo ilegible = borrador no encontrado (404 abajo) */ }
      return Promise.resolve(borrador(token));
    }
    var m = String((o && o.method) || (u && u.method) || 'GET').toUpperCase();
    if (m !== 'GET' && m !== 'HEAD') return Promise.reject(new Error('The demo does not send anything.'));
    return fetchAntes.apply(this, arguments);
  };

  /* ── ?cliente= que no casa: aviso FIJO (nunca el valor de la dirección) ── */
  function avisoCliente() {
    if (!AVISO_CLIENTE || document.querySelector('[data-demo="aviso-cliente"]')) return;
    var p = document.createElement('p');
    p.setAttribute('data-demo', 'aviso-cliente');
    p.setAttribute('role', 'status');
    p.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483001;margin:0;padding:8px 16px;border-radius:999px;' +
      'background:#15181C;color:#F4F2EC;font:500 13px/1.3 system-ui,sans-serif;max-width:calc(100vw - 24px)';
    p.textContent = 'Client not found — showing a sample client.';
    (document.body || document.documentElement).appendChild(p);
    setTimeout(function () { p.remove(); }, 6000);
  }

  // Lo último: index.html mira esta marca para saber que el adaptador cargó entero; si no, falla cerrado.
  window.LW_DEMO = { email: SESION.user.email };
  window.AXW_PORTAL_DEMO = true;
})();
