/* Datos de la DEMO del ERP (intranet v4 de Lawang) — 24-sep-2026.

   Qué es: la siembra que el doble de guard.js (`_qa_double_guard.js` de Lawang,
   transformado por build.py) llama justo después de montar sus FIXTURES de QA.
   Las de QA prueban casos límite con una o dos filas; una demo comercial
   necesita que la empresa parezca viva: tres promociones, decenas de parcelas,
   una docena de ventas con su cadena de contratos, cobros y leads.

   🔴 NADA de aquí sale de la base real. Compradores, equipo, importes, fechas,
   pasaportes: inventados. Los nombres se cruzan por hash contra `clients` y
   `usuarios` con `tools/pii_maqueta.py` (build.py lo exige), nunca a ojo — un
   placeholder "que no suena a nadie" ya coincidió con clientes reales el 7-sep.
   Precios y condiciones de comisión: inventados también (Legal, revisión previa
   del 24-sep: las condiciones comerciales reales son información de Lawang).

   Determinista (semilla fija): cada build da la misma empresa, y una captura de
   hoy se puede repetir mañana. Las fechas son relativas a HOY para que la
   bandeja «Hoy toca», los vencimientos y las reservas por vencer tengan vida
   el día que se enseña. */
(function () {
  var semilla = 20260924;
  function rnd() { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; }
  function elige(a) { return a[Math.floor(rnd() * a.length)]; }
  function dia(n) { var d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function ts(n, h) { var d = new Date(); d.setUTCDate(d.getUTCDate() + n); d.setUTCHours(h == null ? 9 : h, 0, 0, 0); return d.toISOString(); }
  function redondea(x, paso) { return Math.round(x / paso) * paso; }

  var DOMINIO = '@demo.test';

  /* Equipo — el usuario que presenta es la directora comercial. */
  var EQUIPO = [
    { user_id: 'd-u-1', email: 'direccion' + DOMINIO, nombre: 'Clara Montesinos', rol: 'super_admin' },
    { user_id: 'd-u-2', email: 'marcos.ibarzabal' + DOMINIO, nombre: 'Marcos Ibarzábal', rol: 'sales_manager' },
    { user_id: 'd-u-3', email: 'nadia.kusumawati' + DOMINIO, nombre: 'Nadia Kusumawati', rol: 'agente' },
    { user_id: 'd-u-4', email: 'tobias.wrenfield' + DOMINIO, nombre: 'Tobias Wrenfield', rol: 'agente' },
    { user_id: 'd-u-5', email: 'ayu.pradnyani' + DOMINIO, nombre: 'Ayu Pradnyani', rol: 'agente' },
    { user_id: 'd-u-6', email: 'administracion' + DOMINIO, nombre: 'Irene Valdecasas', rol: 'admin' }
  ];
  var AGENTES = EQUIPO.slice(1, 5);

  /* Compradores — combinaciones poco frecuentes a propósito, y aun así pasan el
     cruce por hash antes de salir (build.py). */
  var COMPRADORES = [
    ['Henrik Aalvik', 'Noruega'], ['Mireille Castagnou', 'Francia'], ['Oskar Lindgrenius', 'Suecia'],
    ['Tamsin Whitcroft', 'Reino Unido'], ['Dario Ventimigli', 'Italia'], ['Ingrid Solvang', 'Noruega'],
    ['Lucas Ferreirinha', 'Portugal'], ['Beatriz Olazábarri', 'España'], ['Jasper van Duinhoven', 'Países Bajos'],
    ['Callum Ashbrooke', 'Australia'], ['Yuki Harasawa', 'Japón'], ['Anneliese Brückmeyer', 'Alemania'],
    ['Kestrel Horizon Pte. Ltd.', 'Singapur'], ['Sofía Marañuela', 'España'], ['Maël Kerbrioux', 'Francia']
  ];

  var PROYECTOS = [
    { id: 'p-1', nombre: 'Cemara Estate', pref: 'CE', n: 12, suelo: [55000, 80000], obra: [110000, 180000], moneda: 'EUR', soc: 'tepi_sungai', modelos: ['Dune', 'Lagoon', 'Canopy'] },
    { id: 'p-2', nombre: 'Tirta Village', pref: 'TV', n: 10, suelo: [48000, 70000], obra: [95000, 150000], moneda: 'EUR', soc: 'san_dal_woods', modelos: ['Lagoon', 'Canopy'] },
    { id: 'p-3', nombre: 'Batu Ridge', pref: 'BR', n: 16, suelo: [28000, 45000], obra: [44000, 90000], moneda: 'EUR', soc: 'tepi_sungai', modelos: ['Pool Suite', 'Dune'] }
  ];

  var TIPO_NOMBRE = { reserva_parcela: 'Bloqueo de Parcela', carta_reserva: 'Carta de Reserva', construccion: 'Contrato de Construcción' };
  var TIPO_PREF = { reserva_parcela: 'RP', carta_reserva: 'CR', construccion: 'CC' };

  window.LW_DEMO_SIEMBRA = function (F, ctx) {
    var fila = ctx.fila;
    function tabla(n, filas) { F[n] = { data: filas, error: null }; }

    /* ── Equipo ─────────────────────────────────────────────────────────── */
    var herr = ctx.FICHA.herramientas;
    ctx.USUARIOS.length = 0;
    EQUIPO.forEach(function (u, i) {
      ctx.USUARIOS.push(fila({ user_id: u.user_id, email: u.email, nombre: u.nombre, rol: u.rol,
        herramientas: u.rol === 'agente' ? ['operaciones', 'contratos', 'facturas', 'compradores', 'leads', 'unidades'] : herr,
        activo: true, creado_en: dia(-200 + i * 11), creado_por: i ? 'd-u-1' : null,
        notif_visto_hasta: null, proyectos: [], tipos_contrato: [] }));
    });
    tabla('usuarios', ctx.USUARIOS);
    tabla('equipos_venta', [
      { id: 'eq-1', nombre: 'Equipo Bali', manager_email: EQUIPO[1].email, activo: true, created_at: ts(-150) },
      { id: 'eq-2', nombre: 'Equipo Internacional', manager_email: EQUIPO[1].email, activo: true, created_at: ts(-120) }
    ]);
    tabla('equipo_miembros', [
      { id: 'em-1', equipo_id: 'eq-1', closer_email: EQUIPO[2].email, desde: dia(-150), hasta: null },
      { id: 'em-2', equipo_id: 'eq-1', closer_email: EQUIPO[4].email, desde: dia(-140), hasta: null },
      { id: 'em-3', equipo_id: 'eq-2', closer_email: EQUIPO[3].email, desde: dia(-120), hasta: null }
    ]);

    /* ── Proyectos y parcelas ───────────────────────────────────────────── */
    var plantillaP = (F.proyectos.data || [])[0] || {};
    tabla('proyectos', PROYECTOS.map(function (p, i) {
      return fila(Object.assign({}, plantillaP, { id: p.id, nombre: p.nombre, activo: true, resort: p.nombre,
        parcela_master: String.fromCharCode(65 + i), parcela_master_m2: p.n * 650, estado: i === 1 ? 'en_venta' : 'en_construccion', slug: p.nombre.toLowerCase().replace(/ /g, '-') }));
    }));
    var plantU = F.unidades.data[0], plantUE = F.unidades_estado.data[0];
    var unidades = [];
    PROYECTOS.forEach(function (p) {
      for (var k = 1; k <= p.n; k++) {
        var suelo = redondea(p.suelo[0] + rnd() * (p.suelo[1] - p.suelo[0]), 500);
        var obra = redondea(p.obra[0] + rnd() * (p.obra[1] - p.obra[0]), 1000);
        var modelo = elige(p.modelos);
        unidades.push({ id: 'u-' + p.pref + k, codigo: p.pref + '-' + (k < 10 ? '0' : '') + k, proyecto: p.nombre, proyecto_id: p.id,
          tipo: 'villa', superficie_m2: redondea(160 + rnd() * 260, 5), precio: suelo + obra, moneda: p.moneda,
          estado: 'disponible', contrato_id: null, notas: null, precio_suelo: suelo, precio_construccion: obra,
          modelo: modelo, modelo_id: modelo === 'Dune' ? 'm-dune' : (modelo === 'Pool Suite' ? 'm-pool-suite' : null),
          obra_fase: null, obra_fecha_entrega: null, obra_actualizado: null,
          fase_masterplan: k <= p.n / 2 ? 'I' : 'II', zona_masterplan: String(1 + (k % 3)), publicado_investor_deck: true,
          _p: p });
      }
    });

    /* ── Compradores ────────────────────────────────────────────────────── */
    var plantC = F.clients.data[0];
    var clientes = COMPRADORES.map(function (c, i) {
      var empresa = /Ltd\.|S\.L\./.test(c[0]);
      var slug = c[0].toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim().split(' ');
      return fila(Object.assign({}, plantC, { id: 'cl-' + (i + 1), full_name: c[0],
        email: (empresa ? 'info.' + slug[0] : slug[0] + '.' + slug[slug.length - 1]) + DOMINIO,
        phone: '+00 555 01' + (10 + i) + ' ' + (1000 + i * 37), nationality: c[1],
        passport_number: empresa ? 'REG-DEMO-' + (7700 + i) : 'X' + (4400000 + i * 7919),
        date_of_birth: empresa ? null : (1962 + (i * 3) % 30) + '-0' + (1 + i % 9) + '-1' + (i % 9),
        address: empresa ? 'Marina Boulevard (demo), Singapur' : 'Dirección de demostración ' + (i + 1),
        kyc_status: i % 5 === 3 ? 'pending' : 'verified', notes: null, tipo: empresa ? 'empresa' : 'persona',
        forma_juridica: empresa ? 'Pte. Ltd.' : null, registro_num: null, rep_nombre: empresa ? 'Representante de demo' : null, rep_cargo: empresa ? 'Director' : null }));
    });
    tabla('clients', clientes);

    /* ── Ventas: cada una es una cadena Bloqueo → (Carta) → Construcción ─── */
    var contratos = [], cc = [], firmas = [], vencs = [], facturas = [], aplic = [], reservas = [], ventas = [];
    var nC = 40, nF = 120, nR = 60;
    var plantK = F.contratos.data[0], plantFa = F.facturas.data[1] || F.facturas.data[0];
    function contrato(tipo, u, cli, agente, precio, firmado, diasFirma, padre) {
      var num = TIPO_PREF[tipo] + '000' + (++nC);
      var c = fila(Object.assign({}, plantK, { id: 'c-' + nC, tipo: tipo, numero: num, comprador_nombre: cli.full_name,
        proyecto_nombre: u.proyecto, precio_total: precio, moneda: u.moneda, fecha_firma: firmado ? dia(diasFirma) : null,
        datos: { fields: Object.assign(tipo === 'construccion' ? {} : { parcela_codigo: u.codigo }, { adq1_pasaporte: cli.passport_number, adq1_email: cli.email }), hitos: [] }, created_at: ts(diasFirma - 3), bloqueado: !!firmado,
        pdf_firmado_path: null, creado_por: agente.email, cobrado: 0, contrato_id: 'c-' + nC,
        compradores: [{ client_id: cli.id, rol: 'adquiriente_1', clients: { id: cli.id, full_name: cli.full_name, email: cli.email } }], contrato_padre_id: padre ? padre.id : null,
        proyecto_id: u.proyecto_id, unidad_id: u.id, nombre_contrato: TIPO_NOMBRE[tipo], parcela_codigo: u.codigo, soc: u._p.soc }));
      contratos.push(c);
      cc.push(fila({ contrato_id: c.id, client_id: cli.id, rol: 'adquiriente_1', creado_en: ts(diasFirma - 3),
        clients: { id: cli.id, full_name: cli.full_name, email: cli.email, phone: cli.phone, passport_number: cli.passport_number, kyc_status: cli.kyc_status } }));
      if (!firmado) firmas.push(fila({ id: 'fi-' + c.id, contrato_id: c.id, estado: 'pendiente', firmante_nombre: cli.full_name,
        expira_en: ts(3 + (nC % 6)), contratos: { numero: num, creado_por: agente.email } }));
      return c;
    }
    function factura(tipo, c, cli, total, dias, concepto, extra) {
      dias = Math.min(dias, 0);   // nada emitido en el futuro
      var pref = tipo === 'proforma' ? 'PRO' : (tipo === 'recibi' ? 'REC' : 'INV');
      var n = tipo === 'recibi' ? ++nR : ++nF;
      var f = fila(Object.assign({}, plantFa, { id: 'f-' + pref + n, numero: pref + '00' + n, sociedad: c.soc,
        cliente_nombre: cli.full_name, proyecto_nombre: c.proyecto_nombre, contrato_numero: c.numero, total: total,
        moneda: c.moneda, fecha_emision: dia(dias), datos: { conceptos: [{ desc: concepto, importe: total }] }, anulada: false,
        created_at: ts(dias), creado_por: c.creado_por, tipo: tipo, contrato_id: c.id, enviada: tipo !== 'proforma',
        fecha_envio: tipo !== 'proforma' ? dia(dias) : null, justificante_path: tipo === 'recibi' ? 'demo/justificante.pdf' : null, client_id: cli.id,
        proyecto_id: c.proyecto_id, justificantes: tipo === 'recibi' ? [{ path: 'demo/justificante.pdf', nombre: 'transferencia.pdf' }] : [], venc: null }, extra || {}));
      facturas.push(f);
      return f;
    }

    /* Guion de ventas: [proyecto, parcela, comprador, agente, etapa, días desde el bloqueo]
       etapa: 'bloqueo_sin_firmar' | 'bloqueo' | 'carta' | 'construccion' | 'construccion_sin_firmar' */
    var GUION = [
      [0, 1, 0, 0, 'construccion', -210], [0, 2, 1, 1, 'construccion', -160], [0, 4, 2, 2, 'carta', -40],
      [0, 7, 3, 0, 'bloqueo', -12], [0, 9, 4, 3, 'bloqueo_sin_firmar', -2],
      [1, 1, 5, 2, 'construccion', -180], [1, 3, 6, 1, 'construccion_sin_firmar', -25], [1, 6, 7, 3, 'carta', -18],
      [2, 1, 8, 0, 'construccion', -240], [2, 2, 9, 2, 'construccion', -130], [2, 3, 10, 1, 'carta', -27],
      [2, 5, 11, 3, 'carta', -8], [2, 8, 12, 0, 'construccion', -95], [2, 11, 13, 2, 'bloqueo', -5],
      [2, 13, 14, 1, 'bloqueo_sin_firmar', -1]
    ];
    GUION.forEach(function (g, i) {
      var p = PROYECTOS[g[0]];
      var u = unidades.filter(function (x) { return x.proyecto_id === p.id; })[g[1] - 1];
      var cli = clientes[g[2]], ag = AGENTES[g[3]], etapa = g[4], d0 = g[5];
      var firmadoRP = etapa !== 'bloqueo_sin_firmar';
      var rp = contrato('reserva_parcela', u, cli, ag, u.precio_suelo, firmadoRP, d0);
      u.estado = firmadoRP ? 'reservada' : 'disponible'; u.contrato_id = rp.id;
      var cobrado = 0;
      /* Bloqueo: señal del 10 % del suelo — proforma y, si está firmado, cobrada. */
      var senal = redondea(u.precio_suelo * 0.1, 100);
      factura('proforma', rp, cli, senal, d0, 'Señal de bloqueo ' + u.codigo);
      if (firmadoRP) {
        var fs = factura('factura', rp, cli, senal, d0 + 1, 'Señal de bloqueo ' + u.codigo);
        var rs = factura('recibi', rp, cli, senal, d0 + 3, 'Cobro señal ' + u.codigo);
        aplic.push({ id: 'ra-' + rs.id, recibi_id: rs.id, factura_id: fs.id, importe_aplicado: senal });
        cobrado += senal;
      }
      var padre = rp;
      if (etapa === 'carta' || etapa === 'construccion' || etapa === 'construccion_sin_firmar') {
        var cr = contrato('carta_reserva', u, cli, ag, u.precio_suelo, true, d0 + 4, rp);
        /* Resto del suelo: se cobra a la firma de la Carta. */
        var resto = u.precio_suelo - senal;
        var fr = factura('factura', cr, cli, resto, d0 + 5, 'Resto del suelo ' + u.codigo);
        if (etapa !== 'carta' || i % 2) {
          var rr = factura('recibi', cr, cli, resto, d0 + 12, 'Cobro resto del suelo ' + u.codigo);
          aplic.push({ id: 'ra-' + rr.id, recibi_id: rr.id, factura_id: fr.id, importe_aplicado: resto });
          cobrado += resto;
        }
        if (etapa === 'carta') reservas.push({ unidad_id: u.id, codigo: u.codigo, proyecto: u.proyecto, contrato_id: cr.id,
          numero: cr.numero, tipo: 'carta_reserva', proyecto_id: u.proyecto_id, proyecto_nombre: u.proyecto,
          comprador_nombre: cli.full_name, vence_el: dia(d0 + 45), n_prorrogas: i % 3 === 0 ? 1 : 0 });
        padre = rp;
      }
      if (etapa === 'bloqueo') reservas.push({ unidad_id: u.id, codigo: u.codigo, proyecto: u.proyecto, contrato_id: rp.id,
        numero: rp.numero, tipo: 'reserva_parcela', proyecto_id: u.proyecto_id, proyecto_nombre: u.proyecto,
        comprador_nombre: cli.full_name, vence_el: dia(d0 + 14), n_prorrogas: 0 });
      if (etapa === 'construccion' || etapa === 'construccion_sin_firmar') {
        var firmadoCC = etapa === 'construccion';
        var k = contrato('construccion', u, cli, ag, u.precio_construccion, firmadoCC, d0 + 20, padre);
        if (firmadoCC) { u.estado = 'vendida'; u.obra_fase = d0 < -150 ? 'estructura' : 'cimentacion';
          u.obra_fecha_entrega = dia(d0 + 330); u.obra_actualizado = ts(-(i % 9) - 1); }
        /* Calendario por hitos de obra: 30 / 30 / 30 / 10. */
        [['Firma del contrato', 30, 0], ['Estructura terminada', 30, 90], ['Cubierta y cerramientos', 30, 180], ['Entrega de llaves', 10, 300]]
          .forEach(function (h, j) {
            var fecha = d0 + 20 + h[2], monto = redondea(u.precio_construccion * h[1] / 100, 100);
            var vc = fila({ id: 'cv-' + k.id + '-' + j, contrato_id: k.id, orden: j + 1, descripcion: h[0], pct: String(h[1]),
              monto: null, fecha: dia(fecha), ajustado: false, nota: null, actualizado_por: null, actualizado_en: null,
              creado_en: ts(d0 + 20), factura_id: null, no_facturar: false, contratos: { id: k.id, bloqueado: firmadoCC } });
            vencs.push(vc);
            if (firmadoCC && fecha <= 3) {
              var fh = factura('factura', k, cli, monto, fecha, h[0] + ' — ' + u.codigo, { venc: dia(fecha + 15) });
              vc.factura_id = fh.id;
              if (fecha < -20) {
                var rh = factura('recibi', k, cli, monto, fecha + 9, 'Cobro ' + h[0].toLowerCase() + ' ' + u.codigo);
                aplic.push({ id: 'ra-' + rh.id, recibi_id: rh.id, factura_id: fh.id, importe_aplicado: monto });
                cobrado += monto;
              }
            }
          });
      }
      ventas.push({ contrato_id: rp.id, numero: rp.numero, tipo: 'reserva_parcela', comprador: cli.full_name,
        proyecto: u.proyecto, precio_total: u.precio, moneda: u.moneda, cobrado: cobrado,
        creado_por: ag.email, closer_email: ag.email, es_hijo: false });
    });
    /* Unas cuantas parcelas vendidas de antes (sin detalle en la demo) para que
       el parcelario no parezca recién abierto. */
    unidades.forEach(function (u, i) { if (u.estado === 'disponible' && !u.contrato_id && i % 7 === 3) u.estado = 'bloqueada'; });

    /* Lo cobrado por contrato (la RPC contratos_cobrado_equipo cae en `contratos`). */
    var cPorId = {}; contratos.forEach(function (c) { cPorId[c.id] = c; });
    facturas.forEach(function (f) { if (f.tipo === 'recibi' && cPorId[f.contrato_id]) cPorId[f.contrato_id].cobrado += f.total; });

    var pendiente = {};
    facturas.forEach(function (f) { if (f.tipo === 'factura') pendiente[f.id] = f.total; });
    aplic.forEach(function (a) { if (pendiente[a.factura_id] != null) pendiente[a.factura_id] -= a.importe_aplicado; });

    /* ── Operaciones (núcleo del ERP, 25-sep-2026): una por cadena, con la misma regla que la migración
       20260925090000_operacion_nucleo — cliente = adquiriente_1, borrador si no hay; el hijo hereda la del padre;
       la factura la de su contrato; el recibí ninguna. La pantalla solo las usa con AXW_NUCLEO_OPERACION. */
    var operaciones = [], opDe = {};
    contratos.forEach(function (c) {
      if (c.contrato_padre_id) return;
      var comp = cc.filter(function (x) { return x.contrato_id === c.id && x.rol === 'adquiriente_1'; })[0];
      var id = 'op-' + (operaciones.length + 1);
      opDe[c.id] = id;
      operaciones.push(fila({ id: id, referencia: 'OP-2026-' + ('000' + (operaciones.length + 1)).slice(-4),
        client_id: comp ? comp.client_id : null, tipo: 'inmobiliaria', estado: comp ? 'abierta' : 'borrador',
        importe_total: null, moneda: c.moneda, proyecto_id: c.proyecto_id, creado_por: c.creado_por,
        created_at: c.created_at, datos: {} }));
    });
    contratos.forEach(function (c) { c.operacion_id = opDe[c.contrato_padre_id || c.id] || null; });
    var opDeContrato = {};
    contratos.forEach(function (c) { opDeContrato[c.id] = c.operacion_id; });
    facturas.forEach(function (f) { f.operacion_id = f.tipo !== 'recibi' && f.contrato_id ? (opDeContrato[f.contrato_id] || null) : null; });
    tabla('operaciones', operaciones);
    tabla('operaciones_equipo', operaciones);
    tabla('contratos', contratos);
    tabla('contrato_compradores', cc);
    tabla('contrato_firmas', firmas);
    tabla('contrato_vencimientos', vencs);
    tabla('facturas', facturas);
    tabla('recibi_aplicaciones', aplic);
    tabla('facturas_pendiente_equipo', Object.keys(pendiente)
      .map(function (k) { return fila({ factura_id: k, pendiente: pendiente[k] }); }));
    tabla('reservas_vencimiento', reservas);
    tabla('contratos_del_mismo_comprador', contratos.slice(0, 1).map(function (c) { return fila({ contrato_id: c.id }); }));

    var byId = {}; contratos.forEach(function (c) { byId[c.id] = c; });
    tabla('unidades', unidades.map(function (u) { var r = Object.assign({}, plantU, u); delete r._p; return fila(r); }));
    tabla('unidades_estado', unidades.map(function (u) {
      var c = u.contrato_id && byId[u.contrato_id];
      var r = Object.assign({}, plantUE, u, { contrato_numero: c ? c.numero : null, comprador_nombre: c ? c.comprador_nombre : null,
        contrato_firmado: !!(c && c.bloqueado), facturado: 0, pct_cobrado: u.estado === 'vendida' ? 45 : (u.estado === 'reservada' ? 20 : 0), precio_guardado: null });
      delete r._p; return fila(r);
    }));
    ctx.VENTAS.length = 0; ventas.forEach(function (v) { ctx.VENTAS.push(v); });

    /* ── Comisiones (cifras inventadas: 5 % agente, 1 % manager) ───────── */
    var sps = [], devs = [];
    ventas.filter(function (v) { return v.cobrado > 0; }).forEach(function (v, i) {
      var imp = redondea(v.precio_total * 0.05 * 0.3, 10);
      var estado = ['pagada', 'aprobada', 'pendiente'][i % 3];
      sps.push(fila({ id: 'sp-' + (i + 1), numero: 201 + i, contrato_id: v.contrato_id, concepto: 'Comisión venta ' + v.numero + ' — tramo firma',
        importe: imp, moneda: v.moneda, vence_el: null, nota: null, estado: estado, motivo_rechazo: null,
        pago_referencia: estado === 'pagada' ? 'Transferencia ' + dia(-10 - i) : null, creado_por: 'd-u-1', creado_en: ts(-30 + i),
        resuelto_por: estado !== 'pendiente' ? 'd-u-1' : null, resuelto_en: estado !== 'pendiente' ? ts(-20 + i) : null,
        pagado_por: estado === 'pagada' ? 'd-u-6' : null, pagado_en: estado === 'pagada' ? ts(-10 + i) : null,
        beneficiario_email: v.closer_email, origen: 'comision_automatica' }));
      devs.push(fila({ id: 'cd-' + (i + 1), contrato_raiz_id: v.contrato_id, tramo_id: 't-1', condicion_id: 'cond-1',
        beneficiario_email: EQUIPO[1].email, nivel: 'manager', importe: redondea(v.precio_total * 0.01 * 0.3, 10), moneda: v.moneda,
        solicitud_id: null, estado: i % 2 ? 'pagada' : 'pendiente', pagado_por: null, pagado_en: null, disparado_en: ts(-25 + i) }));
    });
    tabla('solicitudes_pago', sps);
    tabla('comisiones_devengadas', devs);

    /* ── CRM de leads: se clonan las formas de QA con nombres y fechas de demo ── */
    var NOMBRES_LEAD = ['Pieter Hallvorsen', 'Emma Rochefort', 'Liam Castellow', 'Sara Einhornová', 'Matteo Brunacci',
      'Chloé Dambreville', 'Niels Overgaard', 'Grace Pemberley', 'Rui Albergaria', 'Hanna Kivimäki', 'Owen Tresilian',
      'Alba Urquizu', 'Felix Morgenroth', 'Lotte Brakenhoff', 'Jack Ellerbeck', 'Inés Garmendiola', 'Theo Lindqvaern',
      'Mia Castelbarco', 'Arjun Mehrotra', 'Zoe Hartigan', 'Kenji Moriwaki', 'Greta Vasquinha', 'Ruben Oosterveld', 'Ava Kingsleigh'];
    var baseLeads = F.crm_leads.data.filter(function (l) { return l.name; });
    var leads = [];
    NOMBRES_LEAD.forEach(function (n, i) {
      var b = baseLeads[i % baseLeads.length], dd = 1 + ((i * 5) % 38);
      var ag = AGENTES[i % AGENTES.length];
      leads.push(fila(Object.assign({}, b, { id: 'ld-' + (i + 1), name: n, created_at: ts(-dd, 8 + i % 9),
        estado_desde: ts(-Math.max(0, dd - 3)), dueno: i % 4 ? ag.email : null, dueno_nombre: i % 4 ? ag.nombre : null,
        dueno_activo: i % 4 ? true : null, accion_responsable: b.accion_id ? ag.email : null,
        contrato_id: null, contrato_numero: null })));
    });
    tabla('crm_leads', leads);

    /* ── Avisos de la campana ───────────────────────────────────────────── */
    var ult = contratos.slice(-6).reverse();
    tabla('notificaciones', [
      fila({ id: 'ntf-1', tipo: 'contrato_firmado', titulo: 'Contrato firmado: ' + ult[1].numero, detalle: ult[1].comprador_nombre, destinatario: null, contrato_id: ult[1].id, enlace: null, creado_en: ts(0, 2) }),
      fila({ id: 'ntf-2', tipo: 'recibi_registrado', titulo: 'Cobro registrado · ' + facturas.filter(function (f) { return f.tipo === 'recibi'; }).slice(-1)[0].numero, detalle: null, destinatario: null, contrato_id: null, enlace: null, creado_en: ts(0, 1) }),
      fila({ id: 'ntf-3', tipo: 'unidad_reservada', titulo: 'Parcela ' + ult[0].parcela_codigo + ' reservada', detalle: ult[0].comprador_nombre, destinatario: null, contrato_id: null, enlace: null, creado_en: ts(-1, 7) }),
      fila({ id: 'ntf-4', tipo: 'factura_emitida', titulo: 'Factura emitida', detalle: ult[2].numero, destinatario: null, contrato_id: null, enlace: null, creado_en: ts(-1, 3) }),
      fila({ id: 'ntf-5', tipo: 'solicitud_pago', titulo: 'Nueva solicitud de comisión', detalle: EQUIPO[2].nombre, destinatario: null, contrato_id: null, enlace: null, creado_en: ts(-2, 5) })
    ]);

    /* ── Soporte: hilos de compradores ───────────────────────────────────── */
    tabla('hilo_soporte', [
      fila({ id: 'h-1', client_id: 'cl-1', categoria: 'Pagos', estado: 'abierto', actualizado_en: ts(-1) }),
      fila({ id: 'h-2', client_id: 'cl-6', categoria: 'Obra', estado: 'resuelto', actualizado_en: ts(-3) }),
      fila({ id: 'h-3', client_id: 'cl-9', categoria: 'Documentación', estado: 'abierto', actualizado_en: ts(-2) })
    ]);
    tabla('mensajes_comprador', [
      fila({ id: 'mc-1', hilo_id: 'h-1', client_id: 'cl-1', de: 'comprador', autor: null, texto: 'Hola, ¿me confirmáis que ha llegado la transferencia del segundo hito?', creado_en: ts(-1, 8) }),
      fila({ id: 'mc-2', hilo_id: 'h-2', client_id: 'cl-6', de: 'comprador', autor: null, texto: '¿Hay fotos nuevas de la obra?', creado_en: ts(-4, 9) }),
      fila({ id: 'mc-3', hilo_id: 'h-2', client_id: 'cl-6', de: 'equipo', autor: EQUIPO[5].nombre, texto: 'Subidas esta mañana a su portal, en la pestaña Obra.', creado_en: ts(-3, 9) }),
      fila({ id: 'mc-4', hilo_id: 'h-3', client_id: 'cl-9', de: 'comprador', autor: null, texto: 'Necesito una copia firmada de la Carta de Reserva.', creado_en: ts(-2, 10) })
    ]);

    /* ── Impuestos y productos (núcleo del ERP, 26-sep-2026) ──────────────────
       La semilla de impuestos es la MISMA que pone la migración 20260926170000_impuestos (tipos generales de
       España e Indonesia: datos públicos, no de ningún cliente); los IMP- y PRD- los pone la base, aquí van a
       mano. Los productos son inventados. La pantalla solo los usa con AXW_NUCLEO_OPERACION. */
    var IMP = [
      ['IVA 21 %', 'ES', 'suma', 21, 1, null, true, 10], ['IVA 10 %', 'ES', 'suma', 10, 1, null, false, 11],
      ['IVA 4 %', 'ES', 'suma', 4, 1, null, false, 12], ['IRPF 15 %', 'ES', 'retiene', 15, 1, null, false, 30],
      ['IRPF 7 % (inicio de actividad)', 'ES', 'retiene', 7, 1, null, false, 31],
      ['Exenta de IVA', 'ES', 'exenta', 0, 1, 'Operación exenta de IVA, art. 20.Uno LIVA', false, 40],
      ['Entrega intracomunitaria exenta', 'ES', 'exenta', 0, 1, 'Entrega intracomunitaria exenta, art. 25 LIVA', false, 41],
      ['No sujeta (cliente fuera de la UE)', 'ES', 'no_sujeta', 0, 1, 'Operación no sujeta a IVA, art. 69 LIVA', false, 42],
      ['Inversión del sujeto pasivo', 'ES', 'isp', 0, 1, 'Inversión del sujeto pasivo, art. 84.Uno.2º LIVA', false, 43],
      ['PPN 12 % (base 11/12)', 'ID', 'suma', 12, 0.916667, null, true, 10], ['PPh 23 2 %', 'ID', 'retiene', 2, 1, null, false, 30],
      ['PPN dibebaskan', 'ID', 'exenta', 0, 1, 'PPN dibebaskan', false, 40], ['PPN tidak dipungut', 'ID', 'no_sujeta', 0, 1, 'PPN tidak dipungut', false, 41]
    ];
    var impuestos = IMP.map(function (x, i) {
      return fila({ id: 'imp-' + (i + 1), numero_impuesto: 'IMP-' + ('0000' + (i + 1)).slice(-5), nombre: x[0], pais: x[1],
        sociedad_clave: null, clase: x[2], porcentaje: x[3], coef_base: x[4], motivo_legal: x[5], recargo_de: null,
        por_defecto: x[6], activo: true, orden: x[7], creado_en: ts(-60), creado_por: EQUIPO[0].email, actualizado_en: null, actualizado_por: null });
    });
    [['Recargo de equivalencia 5,2 %', 5.2, 'imp-1', 20], ['Recargo de equivalencia 1,4 %', 1.4, 'imp-2', 21], ['Recargo de equivalencia 0,5 %', 0.5, 'imp-3', 22]]
      .forEach(function (r, i) {
        impuestos.push(fila({ id: 'imp-' + (IMP.length + i + 1), numero_impuesto: 'IMP-' + ('0000' + (IMP.length + i + 1)).slice(-5), nombre: r[0], pais: 'ES',
          sociedad_clave: null, clase: 'suma', porcentaje: r[1], coef_base: 1, motivo_legal: null, recargo_de: r[2],
          por_defecto: false, activo: true, orden: r[3], creado_en: ts(-60), creado_por: EQUIPO[0].email, actualizado_en: null, actualizado_por: null }));
      });
    tabla('impuestos', impuestos);
    var PRD = [
      ['Gestión de alquiler vacacional', 'SRV-ALQ', 'mes', 350, 'EUR', 'imp-1', 'Publicación, reservas, check-in y limpieza de una villa.'],
      ['Mantenimiento de piscina', 'SRV-PIS', 'mes', 1500000, 'IDR', 'imp-10', 'Dos visitas por semana, productos incluidos.'],
      ['Hora de interiorismo', 'SRV-INT', 'hora', 45.5, 'EUR', 'imp-1', null],
      ['Pack de mobiliario Canopy', 'MOB-CAN', 'ud', 18900, 'EUR', 'imp-1', 'Mobiliario completo para el modelo Canopy.'],
      ['Informe de due diligence', 'SRV-DD', 'ud', 12500000, 'IDR', 'imp-10', 'Revisión de títulos y licencias de la parcela.'],
      ['Visita guiada a obra', 'SRV-VIS', 'ud', 0, 'EUR', null, 'Sin coste para compradores con contrato firmado.']
    ];
    tabla('productos', PRD.map(function (p, i) {
      return fila({ id: 'prd-' + (i + 1), numero_producto: 'PRD-' + ('0000' + (i + 1)).slice(-5), nombre: p[0], referencia: p[1], unidad: p[2],
        precio: p[3], moneda: p[4], impuesto_id: p[5], descripcion: p[6], activo: i !== 5 ? true : false,
        creado_en: ts(-40 + i), creado_por: EQUIPO[5].email, actualizado_en: null, actualizado_por: null });
    }));
  };

  /* Escrituras en memoria: en la demo, «guardar» se ve (la fila aparece al
     volver a la lista) y se pierde al recargar. Nunca sale nada de la pestaña. */
  window.LW_DEMO_ESCRIBE = function (F, tabla, op, val, filas) {
    if (!F[tabla]) F[tabla] = { data: [], error: null };
    var base = F[tabla];
    if (!Array.isArray(base.data)) return [];
    if (op === 'insert' || op === 'upsert') {
      var nuevas = (Array.isArray(val) ? val : [val]).map(function (v, i) {
        return Object.assign({ id: 'demo-' + Date.now().toString(36) + i, created_at: new Date().toISOString(), creado_en: new Date().toISOString() }, v);
      });
      nuevas.forEach(function (n) { base.data.unshift(n); });
      return nuevas;
    }
    if (op === 'update') { filas.forEach(function (r) { Object.assign(r, val); }); return filas; }
    if (op === 'delete') { base.data = base.data.filter(function (r) { return filas.indexOf(r) === -1; }); return []; }
    return [];
  };

  /* Guardados atómicos (26-sep-2026): en producción son RPC de la base
     (`guarda_modelo`, `guarda_*_cuentas`, `guarda_prevision_deck`), una
     transacción cada una. Aquí se aplican en memoria sobre las mismas tablas,
     para que «guardar» se siga viendo en la demo. Lo llama el envoltorio de
     `rpc` que pone build.py. */
  window.LW_DEMO_RPC_GUARDA = (function () {
    var E = function (F, t, op, val, filas) { return window.LW_DEMO_ESCRIBE(F, t, op, val, filas || []); };
    function donde(F, t, fn) { return (F[t] && Array.isArray(F[t].data)) ? F[t].data.filter(fn) : []; }
    function porId(id) { return function (r) { return r.id === id; }; }
    function reparto(F, t, base, c) {
      var es = function (r) { return Object.keys(base).every(function (k) { return r[k] === base[k]; }); };
      (c.quitar || []).forEach(function (k) { E(F, t, 'delete', null, donde(F, t, function (r) { return es(r) && r.clave === k; })); });
      (c.poner || []).forEach(function (k) { E(F, t, 'insert', Object.assign({ clave: k, es_default: false }, base)); });
      if (c.def || c.quita_def) E(F, t, 'update', { es_default: false }, donde(F, t, es));
      if (c.def) E(F, t, 'update', { es_default: true }, donde(F, t, function (r) { return es(r) && r.clave === c.def; }));
    }
    function upsert(F, t, fila, clave) {
      var hay = donde(F, t, function (r) { return clave.every(function (k) { return r[k] === fila[k]; }); });
      if (hay.length) E(F, t, 'update', fila, hay); else E(F, t, 'insert', fila);
    }
    return {
      guarda_modelo: function (F, a) {
        var f = a.p_ficha || {};
        E(F, 'modelos', 'update', f, donde(F, 'modelos', porId(a.p_id)));
        (a.p_techos || []).forEach(function (t) {
          E(F, 'modelo_techos', 'update', { precio_ahora: t.precio_ahora, precio_2027: t.precio_2027 }, donde(F, 'modelo_techos', porId(t.id)));
        });
        (a.p_extras || []).forEach(function (e) {
          if (e.id) E(F, 'modelo_extras', 'update', { precio: e.precio, disponible: e.disponible, moneda: f.moneda }, donde(F, 'modelo_extras', porId(e.id)));
          else E(F, 'modelo_extras', 'insert', { modelo_id: a.p_id, extra_id: e.extra_id, precio: e.precio, disponible: e.disponible, moneda: f.moneda });
        });
        (a.p_precios || []).forEach(function (p) {
          E(F, 'modelos_villa', 'update', { precio_construccion: p.precio, moneda: f.moneda }, donde(F, 'modelos_villa', porId(p.id)));
        });
        if (a.p_nuevo_proyecto) {
          E(F, 'modelos_villa', 'insert', { proyecto: a.p_nuevo_proyecto.proyecto, proyecto_id: a.p_nuevo_proyecto.proyecto_id,
            modelo_id: a.p_id, modelo: f.nombre, precio_construccion: null, moneda: f.moneda });
        }
        // la moneda va solo con el número que llega: un importe es el par (número, moneda)
      },
      guarda_plantilla_cuentas: function (F, a) {
        if (a.p_archivada != null) E(F, 'plantillas_contrato', 'update', { archivada: a.p_archivada }, donde(F, 'plantillas_contrato', function (r) { return r.slug === a.p_slug; }));
        if (a.p_reparto) reparto(F, 'plantilla_cuentas', { slug: a.p_slug }, a.p_reparto);
      },
      guarda_proyecto_cuentas: function (F, a) {
        (a.p_repartos || []).forEach(function (c) { reparto(F, 'proyecto_cuentas', { proyecto_id: a.p_proyecto_id, slug: c.slug }, c); });
      },
      guarda_cuenta_bancaria: function (F, a) {
        E(F, 'cuentas_bancarias', 'update', a.p_datos || {}, donde(F, 'cuentas_bancarias', function (r) { return r.clave === a.p_clave; }));
        (a.p_repartos || []).forEach(function (c) { reparto(F, 'plantilla_cuentas', { slug: c.slug }, c); });
      },
      guarda_prevision_deck: function (F, a) {
        upsert(F, 'deck_forecast', a.p_fila || {}, ['proyecto_id', 'modelo_id']);
        upsert(F, 'deck_forecast_proyecto', a.p_proyecto || {}, ['proyecto_id']);
      }
    };
  })();

  /* Limpieza final: lo que la demo no resiembra (tablas de QA menores) deja de
     llamarse «QA» y de apuntar a @axisworks.test. */
  window.LW_DEMO_LIMPIA = function (F) {
    function limpia(v) {
      if (typeof v === 'string') {
        return v.replace(/qa@axisworks\.test/g, 'direccion' + DOMINIO).replace(/@axisworks\.test/g, DOMINIO)
          .replace(/\bQA\b:?\s*/g, '').replace(/-QA\b/g, '').replace(/\(QA\)/g, '');
      }
      if (Array.isArray(v)) return v.map(limpia);
      if (v && typeof v === 'object') { Object.keys(v).forEach(function (k) { v[k] = limpia(v[k]); }); return v; }
      return v;
    }
    Object.keys(F).forEach(function (t) { if (F[t] && F[t].data) F[t].data = limpia(F[t].data); });
  };
})();
