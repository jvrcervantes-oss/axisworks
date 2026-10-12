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

  var DOMINIO = '@example.com';

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
    ['Henrik Aalvik', 'Norway'], ['Mireille Castagnou', 'France'], ['Oskar Lindgrenius', 'Sweden'],
    ['Tamsin Whitcroft', 'United Kingdom'], ['Dario Ventimigli', 'Italy'], ['Ingrid Solvang', 'Norway'],
    ['Lucas Ferreirinha', 'Portugal'], ['Beatriz Olazábarri', 'Spain'], ['Jasper van Duinhoven', 'Netherlands'],
    ['Callum Ashbrooke', 'Australia'], ['Yuki Harasawa', 'Japan'], ['Anneliese Brückmeyer', 'Germany'],
    ['Kestrel Horizon Pte. Ltd.', 'Singapore'], ['Sofía Marañuela', 'Spain'], ['Maël Kerbrioux', 'France']
  ];

  var PROYECTOS = [
    { id: 'p-1', nombre: 'Cemara Estate', pref: 'CE', n: 12, suelo: [55000, 80000], obra: [110000, 180000], moneda: 'EUR', soc: 'axw_demo', modelos: ['Dune', 'Lagoon', 'Canopy'] },
    { id: 'p-2', nombre: 'Tirta Village', pref: 'TV', n: 10, suelo: [48000, 70000], obra: [95000, 150000], moneda: 'EUR', soc: 'axw_demo', modelos: ['Lagoon', 'Canopy'] },
    { id: 'p-3', nombre: 'Batu Ridge', pref: 'BR', n: 16, suelo: [28000, 45000], obra: [44000, 90000], moneda: 'EUR', soc: 'axw_demo', modelos: ['Pool Suite', 'Dune'] }
  ];

  var TIPO_NOMBRE = { reserva_parcela: 'Plot Hold', carta_reserva: 'Reservation Letter', construccion: 'Construction Contract' };
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
      { id: 'eq-1', nombre: 'Bali team', manager_email: EQUIPO[1].email, activo: true, created_at: ts(-150) },
      { id: 'eq-2', nombre: 'International team', manager_email: EQUIPO[1].email, activo: true, created_at: ts(-120) }
    ]);
    tabla('equipo_miembros', [
      { id: 'em-1', equipo_id: 'eq-1', closer_email: EQUIPO[2].email, desde: dia(-150), hasta: null },
      { id: 'em-2', equipo_id: 'eq-1', closer_email: EQUIPO[4].email, desde: dia(-140), hasta: null },
      { id: 'em-3', equipo_id: 'eq-2', closer_email: EQUIPO[3].email, desde: dia(-120), hasta: null }
    ]);

    /* ── La sociedad que emite (una, inventada): la v4 la lee por sociedades_visibles. Sin ella «Sociedad que factura»
       sale vacía y no se puede emitir; y ninguna de un cliente real sale en la demo. ── */
    tabla('sociedades', [fila({ clave: 'axw_demo', label: 'AxisWorks Demo', razon: 'AxisWorks Demo Ltd. (sample company)', marca: 'AxisWorks Demo',
      npwp: 'DEMO-000-000', npwp_label: 'Tax ID', nib: null, domicilio: '1 Sample Street, Demo City', rep: 'Demo Representative', logo: null, logo_alto: null,
      emisor_debajo: false, folio: 1, tinta: null, es_indonesia: true, activa: true, orden: 1 })]);

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
        address: empresa ? 'Marina Boulevard (demo), Singapore' : 'Demo address ' + (i + 1),
        kyc_status: i % 5 === 3 ? 'pending' : 'verified', notes: null, tipo: empresa ? 'empresa' : 'persona',
        forma_juridica: empresa ? 'Pte. Ltd.' : null, registro_num: null, rep_nombre: empresa ? 'Demo representative' : null, rep_cargo: empresa ? 'Director' : null,
        numero_cliente: 'CLI-' + ('00000' + (i + 1)).slice(-5), propietario: AGENTES[i % AGENTES.length].email, created_at: ts(-260 + i * 9), idioma_comunicacion: 'en' }));
    });
    tabla('clients', clientes);

    /* ── Ventas: cada una es una cadena Bloqueo → (Carta) → Construcción ─── */
    var contratos = [], cc = [], firmas = [], vencs = [], facturas = [], aplic = [], reservas = [], ventas = [];
    /* Una serie por prefijo, sin huecos (como set_contrato_numero / set_factura_numero: RP, CR, CC; PRO, INV, REC):
       los guardados de la demo siguen la serie con «la mayor + 1». */
    var nC = 40, SERIE = {};
    function numSerie(pref) { SERIE[pref] = (SERIE[pref] || 0) + 1; return pref + ('00000' + SERIE[pref]).slice(-5); }
    var plantK = F.contratos.data[0], plantFa = F.facturas.data[1] || F.facturas.data[0];
    function contrato(tipo, u, cli, agente, precio, firmado, diasFirma, padre) {
      var num = numSerie(TIPO_PREF[tipo]); ++nC;
      var c = fila(Object.assign({}, plantK, { id: 'c-' + nC, tipo: tipo, numero: num, comprador_nombre: cli.full_name,
        proyecto_nombre: u.proyecto, precio_total: precio, moneda: u.moneda, fecha_firma: firmado ? dia(diasFirma) : null,
        datos: { fields: Object.assign(tipo === 'construccion' ? {} : { parcela_codigo: u.codigo }, { adq1_nombre: cli.full_name, adq1_pasaporte: cli.passport_number,
          adq1_email: cli.email, adq1_domicilio: cli.address, proyecto_nombre: u.proyecto, moneda: u.moneda, precio_total: precio, sociedad_firmante: u._p.soc }), hitos: [], adq1_client_id: cli.id }, created_at: ts(diasFirma - 3), bloqueado: !!firmado,
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
      var numero = numSerie(pref);
      var f = fila(Object.assign({}, plantFa, { id: 'f-' + numero, numero: numero, sociedad: c.soc,
        cliente_nombre: cli.full_name, proyecto_nombre: c.proyecto_nombre, contrato_numero: c.numero, total: total,
        moneda: c.moneda, fecha_emision: dia(dias), datos: { conceptos: [{ desc: concepto, importe: total }] }, anulada: false,
        created_at: ts(dias), creado_por: c.creado_por, tipo: tipo, contrato_id: c.id, enviada: tipo !== 'proforma',
        fecha_envio: tipo !== 'proforma' ? dia(dias) : null, justificante_path: tipo === 'recibi' ? 'demo/justificante.pdf' : null, client_id: cli.id,
        proyecto_id: c.proyecto_id, justificantes: tipo === 'recibi' ? [{ path: 'demo/justificante.pdf', nombre: 'bank-transfer.pdf' }] : [], venc: null }, extra || {}));
      facturas.push(f);
      return f;
    }

    /* Guion de ventas: [proyecto, parcela, comprador, agente, etapa, días desde el bloqueo, opciones?]
       etapa: 'bloqueo_sin_firmar' | 'bloqueo' | 'carta' | 'construccion' | 'construccion_sin_firmar'
       opciones: { fase: fase de obra que se impone (p. ej. 'entregada'), impagada: la señal se factura y no se cobra (vencida) } */
    var GUION = [
      [0, 1, 0, 0, 'construccion', -210], [0, 2, 1, 1, 'construccion', -160], [0, 4, 2, 2, 'carta', -40],
      [0, 7, 3, 0, 'bloqueo', -12], [0, 9, 4, 3, 'bloqueo_sin_firmar', -2],
      [1, 1, 5, 2, 'construccion', -180], [1, 3, 6, 1, 'construccion_sin_firmar', -25], [1, 6, 7, 3, 'carta', -18],
      [2, 1, 8, 0, 'construccion', -240], [2, 2, 9, 2, 'construccion', -130], [2, 3, 10, 1, 'carta', -27],
      [2, 5, 11, 3, 'carta', -8], [2, 8, 12, 0, 'construccion', -95], [2, 11, 13, 2, 'bloqueo', -5],
      [2, 13, 14, 1, 'bloqueo_sin_firmar', -1],
      /* El cliente de ejemplo del portal (Jasper van Duinhoven, 12-oct, orquestador: «el portal se ve pobre al lado del de
         referencia») tiene varias propiedades en fases distintas, como el modo demo del portal de origen: una entregada y
         pagada, una con la firma pendiente y una con la señal vencida. Van AL FINAL para no mover la numeración de las de arriba. */
      [0, 11, 8, 1, 'construccion', -400, { fase: 'entregada' }], [1, 8, 8, 2, 'bloqueo_sin_firmar', -3],
      [0, 12, 8, 3, 'bloqueo', -45, { impagada: true }]
    ];
    GUION.forEach(function (g, i) {
      var p = PROYECTOS[g[0]];
      var u = unidades.filter(function (x) { return x.proyecto_id === p.id; })[g[1] - 1];
      var cli = clientes[g[2]], ag = AGENTES[g[3]], etapa = g[4], d0 = g[5], opc = g[6] || {};
      var firmadoRP = etapa !== 'bloqueo_sin_firmar';
      var rp = contrato('reserva_parcela', u, cli, ag, u.precio_suelo, firmadoRP, d0);
      u.estado = firmadoRP ? 'reservada' : 'disponible'; u.contrato_id = rp.id;
      var cobrado = 0;
      /* Bloqueo: señal del 10 % del suelo — proforma y, si está firmado, cobrada. */
      var senal = redondea(u.precio_suelo * 0.1, 100);
      factura('proforma', rp, cli, senal, d0, 'Plot hold deposit ' + u.codigo);
      if (firmadoRP && opc.impagada) {
        // facturada y sin cobrar, vencida hace días: el «Overdue» del portal y un pendiente de cobro en la intranet
        factura('factura', rp, cli, senal, d0 + 1, 'Plot hold deposit ' + u.codigo, { venc: dia(d0 + 15) });
      } else if (firmadoRP) {
        var fs = factura('factura', rp, cli, senal, d0 + 1, 'Plot hold deposit ' + u.codigo);
        var rs = factura('recibi', rp, cli, senal, d0 + 3, 'Deposit payment ' + u.codigo);
        aplic.push({ id: 'ra-' + rs.id, recibi_id: rs.id, factura_id: fs.id, importe_aplicado: senal });
        cobrado += senal;
      }
      var padre = rp;
      if (etapa === 'carta' || etapa === 'construccion' || etapa === 'construccion_sin_firmar') {
        var cr = contrato('carta_reserva', u, cli, ag, u.precio_suelo, true, d0 + 4, rp);
        /* Resto del suelo: se cobra a la firma de la Carta. */
        var resto = u.precio_suelo - senal;
        var fr = factura('factura', cr, cli, resto, d0 + 5, 'Land balance ' + u.codigo);
        if (etapa !== 'carta' || i % 2) {
          var rr = factura('recibi', cr, cli, resto, d0 + 12, 'Land balance payment ' + u.codigo);
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
        // la de la señal impagada lleva una prórroga viva: si no, sería la única reserva vencida de la siembra (revisor, 12-oct)
        comprador_nombre: cli.full_name, vence_el: dia(opc.impagada ? 9 : d0 + 14), n_prorrogas: opc.impagada ? 1 : 0 });
      if (etapa === 'construccion' || etapa === 'construccion_sin_firmar') {
        var firmadoCC = etapa === 'construccion';
        var k = contrato('construccion', u, cli, ag, u.precio_construccion, firmadoCC, d0 + 20, padre);
        if (firmadoCC) { u.estado = 'vendida'; u.obra_fase = d0 < -150 ? 'estructura' : 'cimentacion';
          u.obra_fecha_entrega = dia(d0 + 330); u.obra_actualizado = ts(-(i % 9) - 1);
          // entregada: la entrega, el día del hito «Key handover» (d0 + 320), que ya está cobrado
          if (opc.fase) { u.obra_fase = opc.fase; if (opc.fase === 'entregada') { u.obra_fecha_entrega = dia(d0 + 320); u.obra_actualizado = ts(d0 + 320); } } }
        /* Calendario por hitos de obra: 30 / 30 / 30 / 10. */
        [['Contract signing', 30, 0], ['Structure complete', 30, 90], ['Roof and enclosure', 30, 180], ['Key handover', 10, 300]]
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
                var rh = factura('recibi', k, cli, monto, fecha + 9, 'Payment: ' + h[0].toLowerCase() + ' ' + u.codigo);
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
      sps.push(fila({ id: 'sp-' + (i + 1), numero: 201 + i, contrato_id: v.contrato_id, concepto: 'Sales commission ' + v.numero + ' — signing tier',
        importe: imp, moneda: v.moneda, vence_el: null, nota: null, estado: estado, motivo_rechazo: null,
        pago_referencia: estado === 'pagada' ? 'Bank transfer ' + dia(-10 - i) : null, creado_por: 'd-u-1', creado_en: ts(-30 + i),
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
      fila({ id: 'ntf-1', tipo: 'contrato_firmado', titulo: 'Contract signed: ' + ult[1].numero, detalle: ult[1].comprador_nombre, destinatario: null, contrato_id: ult[1].id, enlace: null, creado_en: ts(0, 2) }),
      fila({ id: 'ntf-2', tipo: 'recibi_registrado', titulo: 'Payment recorded · ' + facturas.filter(function (f) { return f.tipo === 'recibi'; }).slice(-1)[0].numero, detalle: null, destinatario: null, contrato_id: null, enlace: null, creado_en: ts(0, 1) }),
      fila({ id: 'ntf-3', tipo: 'unidad_reservada', titulo: 'Plot ' + ult[0].parcela_codigo + ' reserved', detalle: ult[0].comprador_nombre, destinatario: null, contrato_id: null, enlace: null, creado_en: ts(-1, 7) }),
      fila({ id: 'ntf-4', tipo: 'factura_emitida', titulo: 'Invoice issued', detalle: ult[2].numero, destinatario: null, contrato_id: null, enlace: null, creado_en: ts(-1, 3) }),
      fila({ id: 'ntf-5', tipo: 'solicitud_pago', titulo: 'New commission request', detalle: EQUIPO[2].nombre, destinatario: null, contrato_id: null, enlace: null, creado_en: ts(-2, 5) })
    ]);

    /* ── Soporte: hilos de compradores ───────────────────────────────────── */
    tabla('hilo_soporte', [
      fila({ id: 'h-1', client_id: 'cl-1', categoria: 'Payments', estado: 'abierto', actualizado_en: ts(-1) }),
      fila({ id: 'h-2', client_id: 'cl-6', categoria: 'Construction', estado: 'resuelto', actualizado_en: ts(-3) }),
      fila({ id: 'h-3', client_id: 'cl-9', categoria: 'Documents', estado: 'abierto', actualizado_en: ts(-2) })
    ]);
    tabla('mensajes_comprador', [
      fila({ id: 'mc-1', hilo_id: 'h-1', client_id: 'cl-1', de: 'comprador', autor: null, texto: 'Hi, can you confirm the transfer for the second milestone has arrived?', creado_en: ts(-1, 8) }),
      fila({ id: 'mc-2', hilo_id: 'h-2', client_id: 'cl-6', de: 'comprador', autor: null, texto: 'Are there any new construction photos?', creado_en: ts(-4, 9) }),
      fila({ id: 'mc-3', hilo_id: 'h-2', client_id: 'cl-6', de: 'equipo', autor: EQUIPO[5].nombre, texto: 'Uploaded to your portal this morning, under the Construction tab.', creado_en: ts(-3, 9) }),
      fila({ id: 'mc-4', hilo_id: 'h-3', client_id: 'cl-9', de: 'comprador', autor: null, texto: 'I need a signed copy of the Reservation Letter.', creado_en: ts(-2, 10) })
    ]);

    /* ── Impuestos y productos (núcleo del ERP, 26-sep-2026) ──────────────────
       La semilla de impuestos es la MISMA que pone la migración 20260926170000_impuestos (tipos generales de
       España e Indonesia: datos públicos, no de ningún cliente); los IMP- y PRD- los pone la base, aquí van a
       mano. Los productos son inventados. La pantalla solo los usa con AXW_NUCLEO_OPERACION. */
    var IMP = [
      ['IVA 21 %', 'ES', 'suma', 21, 1, null, true, 10], ['IVA 10 %', 'ES', 'suma', 10, 1, null, false, 11],
      ['IVA 4 %', 'ES', 'suma', 4, 1, null, false, 12], ['IRPF 15 %', 'ES', 'retiene', 15, 1, null, false, 30],
      ['IRPF 7 % (new business)', 'ES', 'retiene', 7, 1, null, false, 31],
      ['VAT exempt', 'ES', 'exenta', 0, 1, 'Operación exenta de IVA, art. 20.Uno LIVA', false, 40],
      ['Exempt intra-EU supply', 'ES', 'exenta', 0, 1, 'Entrega intracomunitaria exenta, art. 25 LIVA', false, 41],
      ['Out of scope (service to a non-EU business)', 'ES', 'no_sujeta', 0, 1, 'Operación no sujeta a IVA por reglas de localización, art. 69.Uno.1º LIVA', false, 42],
      ['Reverse charge', 'ES', 'isp', 0, 1, 'Inversión del sujeto pasivo, art. 84.Uno.2º LIVA', false, 43],
      ['PPN 12 % (base 11/12)', 'ID', 'suma', 12, 0.916667, null, true, 10], ['PPh 23 2 %', 'ID', 'retiene', 2, 1, null, false, 30],
      ['PPN dibebaskan', 'ID', 'exenta', 0, 1, 'PPN dibebaskan', false, 40], ['PPN tidak dipungut', 'ID', 'no_sujeta', 0, 1, 'PPN tidak dipungut', false, 41]
    ];
    var impuestos = IMP.map(function (x, i) {
      return fila({ id: 'imp-' + (i + 1), numero_impuesto: 'IMP-' + ('0000' + (i + 1)).slice(-5), nombre: x[0], pais: x[1],
        sociedad_clave: null, clase: x[2], porcentaje: x[3], coef_base: x[4], motivo_legal: x[5], recargo_de: null,
        por_defecto: x[6], activo: true, orden: x[7], creado_en: ts(-60), creado_por: EQUIPO[0].email, actualizado_en: null, actualizado_por: null });
    });
    [['Equivalence surcharge 5.2 %', 5.2, 'imp-1', 20], ['Equivalence surcharge 1.4 %', 1.4, 'imp-2', 21], ['Equivalence surcharge 0.5 %', 0.5, 'imp-3', 22]]
      .forEach(function (r, i) {
        impuestos.push(fila({ id: 'imp-' + (IMP.length + i + 1), numero_impuesto: 'IMP-' + ('0000' + (IMP.length + i + 1)).slice(-5), nombre: r[0], pais: 'ES',
          sociedad_clave: null, clase: 'suma', porcentaje: r[1], coef_base: 1, motivo_legal: null, recargo_de: r[2],
          por_defecto: false, activo: true, orden: r[3], creado_en: ts(-60), creado_por: EQUIPO[0].email, actualizado_en: null, actualizado_por: null }));
      });
    tabla('impuestos', impuestos);
    var PRD = [
      ['Holiday rental management', 'SRV-ALQ', 'month', 350, 'EUR', 'imp-1', 'Listing, bookings, check-in and cleaning for one villa.'],
      ['Pool maintenance', 'SRV-PIS', 'month', 1500000, 'IDR', 'imp-10', 'Two visits a week, chemicals included.'],
      ['Interior design hour', 'SRV-INT', 'hour', 45.5, 'EUR', 'imp-1', null],
      ['Canopy furniture pack', 'MOB-CAN', 'unit', 18900, 'EUR', 'imp-1', 'Full furniture set for the Canopy model.'],
      ['Due diligence report', 'SRV-DD', 'unit', 12500000, 'IDR', 'imp-10', 'Review of the plot\'s title and permits.'],
      ['Guided site visit', 'SRV-VIS', 'unit', 0, 'EUR', null, 'Free for buyers with a signed contract.']
    ];
    tabla('productos', PRD.map(function (p, i) {
      return fila({ id: 'prd-' + (i + 1), numero_producto: 'PRD-' + ('0000' + (i + 1)).slice(-5), nombre: p[0], referencia: p[1], unidad: p[2],
        precio: p[3], moneda: p[4], impuesto_id: p[5], descripcion: p[6], activo: i !== 5 ? true : false,
        creado_en: ts(-40 + i), creado_por: EQUIPO[5].email, actualizado_en: null, actualizado_por: null });
    }));

    /* ── Lo que leen las RPC *_datos (28-sep-2026, LAW-338 L2 / B10a) ──────────
       Tablas que el doble de QA no trae y que ahora pinta la pantalla por
       window.lwDatos: comunicados, altas, referidos, partes de obra y la fila
       de mantenimiento. Nombres: los de NOMBRES_LEAD y EQUIPO, ya cruzados por
       hash en cada build (uno nuevo es un sitio más donde fallar pii_maqueta). */
    tabla('mantenimiento', [{ id: 1, envios_pausados: false, motivo: null, cambiado_en: null,
      intranet_cerrada: false, intranet_motivo: null, intranet_cambiado_en: null }]);
    var COM = [
      ['com-1', 'New schedule for site visits', 'Site visits', 'From Monday, guided visits to Cemara Estate are booked from the buyer\'s record.', -9, -8],
      ['com-2', 'Quarter close: pending invoices', 'Quarter close', 'Before Friday, please check the pro formas not yet issued on your deals.', -3, -3],
      ['com-3', 'Batu Ridge presentation (draft)', 'Batu Ridge', 'Draft of the sales presentation for phase two.', -1, null]
    ];
    tabla('comunicados', COM.map(function (c) {
      return fila({ id: c[0], asunto: c[1], encabezado: c[2], cuerpo: c[3], cta_url: null, cta_texto: null,
        creado_en: ts(c[4] - 1), actualizado_en: ts(c[4]), enviado_en: c[5] == null ? null : ts(c[5]) });
    }));
    var envios = [];
    COM.forEach(function (c) {
      if (c[5] == null) return;
      EQUIPO.forEach(function (u, j) {
        var mal = c[0] === 'com-1' && j === 4;
        envios.push(fila({ id: 'ce-' + c[0] + '-' + j, comunicado_id: c[0], user_id: u.user_id, email: u.email, nombre: u.nombre,
          es_prueba: false, estado: mal ? 'error' : 'ok', intentos: mal ? 3 : 1, error: mal ? 'Mailbox full (demo)' : null,
          encolado_en: ts(c[5], 8), enviado_en: mal ? null : ts(c[5], 8) }));
      });
    });
    tabla('comunicado_envios', envios);
    function correo(n) { var s = n.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim().split(' '); return s[0] + '.' + s[s.length - 1] + DOMINIO; }
    tabla('solicitudes_colaborador', [[20, 'Spain', 'pendiente', -1], [21, 'Portugal', 'pendiente', -2], [22, 'Netherlands', 'activada', -9]]
      .map(function (s, i) {
        var n = NOMBRES_LEAD[s[0]];
        return fila({ id: 'sc-' + (i + 1), email: correo(n), nombre: n, telefono: '+00 555 02' + (10 + i) + ' 3' + (100 + i * 41),
          pais: s[1], mensaje: 'I work with overseas buyers and would like to sell your developments.', estado: s[2],
          revisado_por: s[2] === 'pendiente' ? null : EQUIPO[0].email, revisado_en: s[2] === 'pendiente' ? null : ts(s[3] + 1), creado_at: ts(s[3]) });
      }));
    tabla('referidos_contactos', [[16, 17, 'Germany', 'Two-bedroom villa in Tirta Village', 'nuevo', -2], [18, 19, 'India', null, 'en_crm', -6]]
      .map(function (r, i) {
        var ref = NOMBRES_LEAD[r[0]], cli = NOMBRES_LEAD[r[1]];
        return fila({ id: 'rc-' + (i + 1), referido_email: correo(ref), referido_nombre: ref, referido_telefono: null,
          cliente_nombre: cli, cliente_email: correo(cli), cliente_telefono: '+00 555 03' + (10 + i) + ' 4' + (200 + i * 53),
          cliente_pais: r[2], interes: r[3], estado: r[4], creado_at: ts(r[5]) });
      }));
    tabla('obra_partes_trabajo', [['p-1', 'I', '2', 'cimentacion', 'estructura', -12, 30], ['p-3', 'I', '1', null, 'cimentacion', -20, null],
      ['p-2', 'I', '3', 'cimentacion', 'estructura', -33, 45]].map(function (o, i) {
      return fila({ id: 'opt-' + (i + 1), proyecto_id: o[0], fase_masterplan: o[1], zona_masterplan: o[2], fase_anterior: o[3],
        fase_nueva: o[4], fecha: dia(o[5]), autor: EQUIPO[5].nombre, nota: null, dias_offset: o[6], creado_en: ts(o[5]) });
    }));
    F.correcciones_datos = { data: [], error: null };   // (sin tabla(): el guardrail de build.py lee «x('…_datos')» como una llamada lwDatos)
    tabla('contratos_diseno', []);
  };

  /* Lecturas del servidor (window.lwDatos → RPC *_datos, B10a / LAW-338 L2, 28-sep-2026).
     En producción cada una es una función de la base (supabase/migrations/20260927163135_b10a_cifras_datos.sql,
     20260927232020_law338_l2_pantallas.sql, 20260927235009_law338_l2_ajustes.sql de Lawang). Aquí se calculan
     sobre las FIXTURES con la MISMA forma de respuesta (claves, orden, `siguiente`, `recortado`). Lo que no se
     emula: los permisos (la demo entra siempre como super admin) — un 42501 no puede darse aquí.
     Un argumento que la base rechaza (22023) se devuelve como error, igual que la base: `falla()`.
     Firma: LW_DEMO_DATOS[nombre](FIXTURES, args) → data. Lo llama el envoltorio de `rpc` que pone build.py;
     build.py ABORTA si la v4 pide un `*_datos` que no está en este mapa. */
  window.LW_DEMO_DATOS = (function () {
    function filas(F, t) { return (F[t] && Array.isArray(F[t].data)) ? F[t].data : []; }
    function falla(msg, code) { var e = new Error(msg); e.code = code || '22023'; throw e; }
    function hoyISO() { return dia(0); }
    function suma(fecha, n) { var d = new Date(fecha + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
    function tope(v, def) { v = v == null ? def : Number(v); return Math.min(Math.max(v || def, 1), 500); }
    function porDesc(ts) { return function (a, b) { return a[ts] === b[ts] ? (a.id < b.id ? 1 : a.id > b.id ? -1 : 0) : (a[ts] < b[ts] ? 1 : -1); }; }
    /* Página por cursor (ts, id) descendente, pidiendo una fila de más: `siguiente` solo si hay otra página. */
    function pagina(lista, ts, lim, despues) {
      var orden = lista.slice().sort(porDesc(ts));
      if (despues != null) {
        var c = lista.filter(function (x) { return x.id === despues; })[0];
        if (!c || c[ts] == null) falla('cursor desconocido');
        orden = orden.filter(function (x) { return x[ts] < c[ts] || (x[ts] === c[ts] && x.id < c.id); });
      }
      var pag = orden.slice(0, lim);
      return { filas: pag, siguiente: orden.length > lim ? pag[pag.length - 1].id : null };
    }
    function elige(o, campos) { var r = {}; campos.forEach(function (k) { r[k] = o[k] === undefined ? null : o[k]; }); return r; }
    function delProyecto(F, t, nombre, id) {
      return filas(F, t).filter(function (r) { return r.proyecto === nombre || (id != null && r.proyecto_id === id); }).length;
    }
    return {
      inicio_cifras_datos: function (F, a) {
        var hoy = hoyISO();
        var h = a.p_hoy && a.p_hoy >= suma(hoy, -1) && a.p_hoy <= suma(hoy, 1) ? String(a.p_hoy).slice(0, 10) : hoy;
        var firmado = {}; filas(F, 'contratos').forEach(function (k) { if (k.bloqueado === true) firmado[k.id] = true; });
        var v = filas(F, 'contrato_vencimientos').filter(function (t) { return firmado[t.contrato_id] && t.fecha && t.fecha >= h && t.fecha <= suma(h, 30); });
        var u = filas(F, 'unidades');
        return { vencimientos_30: v.length, vencimientos_7: v.filter(function (t) { return t.fecha <= suma(h, 7); }).length,
          unidades: u.length, unidades_libres: u.filter(function (x) { return x.estado === 'disponible'; }).length,
          unidades_reservadas: u.filter(function (x) { return x.estado === 'reservada'; }).length };
      },
      obra_cifras_datos: function (F) {
        return { entregas_con_fecha: filas(F, 'unidades_estado').filter(function (u) { return u.obra_fecha_entrega != null; }).length,
          partes: filas(F, 'obra_partes_trabajo').length };
      },
      proyecto_vinculos_datos: function (F, a) {
        if (a.p_nombre == null || !String(a.p_nombre).trim()) falla('proyecto_vinculos_datos: falta el proyecto');
        var p = filas(F, 'proyectos').filter(function (x) { return x.nombre === a.p_nombre; })[0];
        var id = p ? p.id : null;
        return { unidades: delProyecto(F, 'unidades', a.p_nombre, id), modelos_villa: delProyecto(F, 'modelos_villa', a.p_nombre, id),
          documentos: delProyecto(F, 'documentos_proyecto', a.p_nombre, id) };
      },
      mantenimiento_datos: function (F) {
        var m = filas(F, 'mantenimiento').filter(function (x) { return x.id === 1; })[0] || {};
        return { envios_pausados: !!m.envios_pausados, motivo: m.motivo || null, cambiado_en: m.cambiado_en || null,
          intranet_cerrada: !!m.intranet_cerrada, intranet_motivo: m.intranet_motivo || null, intranet_cambiado_en: m.intranet_cambiado_en || null };
      },
      /* Ajustes de empresa, plantillas de contrato y sociedades (AXW-139, 1-oct-2026; Legal): la demo NO trae ninguno de los tres.
         Se devuelve VACÍO ESTRUCTURAL con la misma forma que la base (claves de `valores`/`actualizado`/`tipos`/`plantillas`/
         `sociedades` vacías), nunca un texto de cláusula, una sociedad ni un valor de ajuste inventados: lo de una empresa
         real (y el texto de sus contratos) no sale en una demo, y un contrato o una sociedad «de mentira» parecería de verdad.
         Solo lectura (`puede_escribir`/`puede_editar` false) porque la demo no guarda nada. */
      ajustes_config_datos: function () { return { valores: {}, actualizado: {}, puede_escribir: false }; },
      ajustes_log_datos: function () { return { filas: [], hay_mas: false }; },
      sociedades_ajustes_datos: function () { return { sociedades: [], puede_escribir: false }; },
      /* Los tres tipos de contrato que usa la siembra (la misma fuente: TIPO_NOMBRE y TIPO_PREF), activos. Con la lista
         vacía, Usuarios › permisos y «+ Invite member» decían «The contract type catalogue could not be read…» y salían 2
         console.error (verificador en vivo, 12-oct-2026; ya pasaba desde que se escribió este doble). */
      plantillas_contrato_datos: function () {
        return { tipos: Object.keys(TIPO_NOMBRE).map(function (k, i) {
          return { clave: k, nombre: TIPO_NOMBRE[k], prefijo: TIPO_PREF[k], orden: i + 1, activo: true };
        }), plantillas: [], puede_editar: false };
      },
      plantilla_version_datos: function () { return null; },
      contrato_plantilla_texto_datos: function () { return { numero: null, texto: null, texto_sha256: null }; },
      comunicacion_datos: function (F, a) {
        var pg = pagina(filas(F, 'comunicados'), 'actualizado_en', tope(a.p_limit, 100), a.p_despues);
        var env = filas(F, 'comunicado_envios');
        var usu = filas(F, 'usuarios').filter(function (u) { return u.activo === true && u.email; })
          .sort(function (x, y) { return x.nombre === y.nombre ? (x.user_id < y.user_id ? -1 : 1) : (x.nombre < y.nombre ? -1 : 1); }).slice(0, 1000);
        return {
          comunicados: pg.filas.map(function (c) {
            var mios = env.filter(function (e) { return e.comunicado_id === c.id && e.es_prueba === false; });
            return Object.assign(elige(c, ['id', 'asunto', 'encabezado', 'cuerpo', 'cta_url', 'cta_texto', 'creado_en', 'actualizado_en', 'enviado_en']),
              { envios_ok: mios.filter(function (e) { return e.estado === 'ok'; }).length, envios_total: mios.length });
          }),
          siguiente: pg.siguiente,
          usuarios: usu.map(function (u) { return elige(u, ['user_id', 'nombre', 'email', 'rol']); }),
          recortado: usu.length === 1000 ? ['usuarios'] : []
        };
      },
      comunicado_datos: function (F, a) {
        if (a.p_id == null) falla('comunicado_datos: falta el comunicado');
        var c = filas(F, 'comunicados').filter(function (x) { return x.id === a.p_id; })[0];
        var env = filas(F, 'comunicado_envios').filter(function (e) { return e.comunicado_id === a.p_id; })
          .sort(porDesc('encolado_en')).slice(0, 2000);
        return {
          comunicado: c ? elige(c, ['id', 'asunto', 'encabezado', 'cuerpo', 'cta_url', 'cta_texto', 'creado_en', 'actualizado_en', 'enviado_en']) : null,
          envios: c ? env.map(function (e) { return elige(e, ['id', 'user_id', 'email', 'nombre', 'es_prueba', 'estado', 'intentos', 'error', 'encolado_en', 'enviado_en']); }) : [],
          recortado: c && env.length === 2000 ? ['envios'] : []
        };
      },
      solicitudes_alta_datos: function (F, a) {
        var pg = pagina(filas(F, 'solicitudes_colaborador'), 'creado_at', tope(a.p_limit, 60), a.p_despues);
        var pro = filas(F, 'proyectos').filter(function (p) { return p.activo === true; })
          .sort(function (x, y) { return x.nombre === y.nombre ? (x.id < y.id ? -1 : 1) : (x.nombre < y.nombre ? -1 : 1); }).slice(0, 1000);
        return {
          solicitudes: pg.filas.map(function (s) { return elige(s, ['id', 'email', 'nombre', 'telefono', 'pais', 'mensaje', 'estado', 'revisado_por', 'revisado_en', 'creado_at']); }),
          siguiente: pg.siguiente,
          proyectos: pro.map(function (p) { return { id: p.id, nombre: p.nombre }; }),
          recortado: pro.length === 1000 ? ['proyectos'] : []
        };
      },
      referidos_datos: function (F, a) {
        var pg = pagina(filas(F, 'referidos_contactos'), 'creado_at', tope(a.p_limit, 100), a.p_despues);
        return {
          referidos: pg.filas.map(function (r) { return elige(r, ['id', 'referido_email', 'referido_nombre', 'referido_telefono', 'cliente_nombre',
            'cliente_email', 'cliente_telefono', 'cliente_pais', 'interes', 'estado', 'creado_at']); }),
          siguiente: pg.siguiente
        };
      },
      autoria_datos: function (F, a) {
        if (a.p_tabla == null || (a.p_tabla !== 'contratos' && a.p_tabla !== 'facturas') || a.p_fila == null) {
          falla('autoria_datos: solo contratos o facturas, con su fila');
        }
        var eq = filas(F, 'usuarios').filter(function (u) { return u.activo === true; })
          .sort(function (x, y) { return x.email === y.email ? (x.user_id < y.user_id ? -1 : 1) : (x.email < y.email ? -1 : 1); }).slice(0, 1000);
        var ult = filas(F, 'correcciones_datos').filter(function (c) { return c.tabla === a.p_tabla && c.fila_id === a.p_fila && c.campo === 'creado_por'; })
          .sort(porDesc('corregido_en'))[0];
        return {
          equipo: eq.map(function (u) { return elige(u, ['email', 'nombre', 'activo']); }),
          ultimo: ult ? elige(ult, ['valor_anterior', 'valor_nuevo', 'motivo', 'corregido_en', 'corregido_por']) : null,
          recortado: eq.length === 1000 ? ['equipo'] : []
        };
      },
      /* Panel de gastos (LAW-338 L2 tanda 2, 28-sep-2026; SQL: 20260928051352_law338_l2t2_ajustes.sql). Cursor
         COMPUESTO (fecha, id) por valores, no por fila releída; los catálogos solo en la primera página. */
      gastos_panel_datos: function (F, a) {
        if ((a.p_despues == null) !== (a.p_despues_fecha == null)) falla('gastos_panel_datos: el cursor lleva fecha e id juntos');
        var lim = Math.min(Math.max(a.p_limit == null ? 1000 : Number(a.p_limit) || 1000, 1), 5000);
        var CAMPOS = ['id', 'sociedad', 'proyecto_id', 'proveedor_id', 'categoria', 'concepto', 'referencia', 'fecha', 'vence_el',
          'base', 'impuesto', 'total', 'pph_retenido', 'pph_tipo', 'pph_ingresado_el', 'moneda', 'estado', 'pagado_el',
          'cuenta_pago', 'justificantes', 'anulado_motivo', 'notas', 'creado_por', 'creado_en', 'actualizado_en'];
        var orden = filas(F, 'gastos').slice().sort(porDesc('fecha'));
        if (a.p_despues != null) {
          orden = orden.filter(function (g) { return g.fecha < a.p_despues_fecha || (g.fecha === a.p_despues_fecha && g.id < a.p_despues); });
        }
        var pag = orden.slice(0, lim), ult = pag[pag.length - 1];
        var r = { gastos: pag.map(function (g) { return elige(g, CAMPOS); }),
          siguiente: orden.length > lim ? { fecha: ult.fecha, id: ult.id } : null };
        if (a.p_despues != null) return r;
        var rec = [];
        function lista(nombre, t, k1, k2, tope, campos) {   // orden (k1, k2) ascendente, con tope y aviso de recorte
          var o = filas(F, t).slice().sort(function (x, y) { return x[k1] === y[k1] ? (x[k2] < y[k2] ? -1 : x[k2] > y[k2] ? 1 : 0) : (x[k1] < y[k1] ? -1 : 1); });
          if (o.length > tope) rec.push(nombre);
          return o.slice(0, tope).map(function (x) { return elige(x, campos); });
        }
        r.proveedores = lista('proveedores', 'proveedores', 'nombre', 'id', 2000, ['id', 'nombre', 'tipo', 'npwp', 'contacto', 'email', 'telefono', 'notas', 'activo']);
        r.categorias = lista('categorias', 'gasto_categorias', 'orden', 'clave', 500, ['clave', 'nombre', 'grupo', 'orden', 'activa']);
        r.proyectos = lista('proyectos', 'proyectos', 'nombre', 'id', 1000, ['id', 'nombre', 'activo']);
        r.cuentas = lista('cuentas', 'cuentas_bancarias', 'orden', 'clave', 200, ['clave', 'label', 'banco', 'titular', 'es_escrow', 'es_propia', 'activa']);
        r.usuarios = lista('usuarios', 'usuarios', 'nombre', 'user_id', 2000, ['user_id', 'nombre', 'email']);
        r.recortado = rec;
        return r;
      },
      gasto_historial_datos: function (F, a) {
        var lim = Math.min(Math.max(a.p_limit == null ? 8 : Number(a.p_limit) || 8, 1), 50);
        return { historial: filas(F, 'gastos_log').filter(function (l) { return l.gasto_id === a.p_gasto; })
          .sort(porDesc('cuando')).slice(0, lim).map(function (l) { return elige(l, ['accion', 'quien', 'cuando', 'antes', 'despues']); }) };
      },
      contrato_diseno_datos: function (F, a) {
        if (a.p_slug == null || !String(a.p_slug).trim()) falla('contrato_diseno_datos: falta la plantilla');
        var d = filas(F, 'contratos_diseno').filter(function (x) { return x.slug === a.p_slug; })[0];
        return { design: d ? d.design : null };
      },
      /* Comisiones, equipos y condiciones (LAW-338 L3, 10-oct-2026; SQL: 20261010062215_law338_l3_comisiones_datos.sql
         y 20261010101716_law338_l3_operacion_sin_tope.sql de Lawang). Misma forma y mismos topes con `recortado`. */
      equipos_datos: function (F) {
        var eq = filas(F, 'equipos_venta').slice().sort(function (x, y) { return x.nombre === y.nombre ? (x.id < y.id ? -1 : 1) : (x.nombre < y.nombre ? -1 : 1); });
        var mi = filas(F, 'equipo_miembros').slice().sort(function (x, y) { return x.desde === y.desde ? (x.id < y.id ? -1 : 1) : (x.desde < y.desde ? 1 : -1); });
        var rec = [];
        if (eq.length > 1000) rec.push('equipos');
        if (mi.length > 5000) rec.push('miembros');
        return { equipos: eq.slice(0, 1000).map(function (e) { return elige(e, ['id', 'nombre', 'manager_email', 'activo', 'created_at', 'closers_ven_comision', 'empresa']); }),
          miembros: mi.slice(0, 5000).map(function (m) { return elige(m, ['id', 'equipo_id', 'closer_email', 'desde', 'hasta', 'rol', 'rol_nombre']); }),
          recortado: rec };
      },
      condiciones_comision_datos: function (F) {
        var co = filas(F, 'condiciones_comision').slice().sort(porDesc('created_at'));
        var tr = filas(F, 'condicion_tramos').slice().sort(function (x, y) { return x.orden === y.orden ? (x.id < y.id ? -1 : 1) : (x.orden < y.orden ? -1 : 1); });
        var rec = [];
        if (co.length > 2000) rec.push('condiciones');
        if (tr.length > 10000) rec.push('tramos');
        return { condiciones: co.slice(0, 2000).map(function (c) { return elige(c, ['id', 'equipo_id', 'proyecto_id', 'nivel', 'closer_email', 'pct_comision', 'base_calculo',
            'importe_fijo', 'activo', 'vigente_desde', 'vigente_hasta', 'created_at', 'sustituye_a', 'empresa']); }),
          tramos: tr.slice(0, 10000).map(function (t) { return elige(t, ['id', 'condicion_id', 'orden', 'disparador_tipo', 'umbral', 'pct_tramo']); }),
          recortado: rec };
      },
      comisiones_reparto_datos: function (F) {
        var dev = filas(F, 'comisiones_devengadas');
        var de = dev.filter(function (d) { return ['closer', 'setter', 'team_lead'].indexOf(d.nivel) !== -1; }).sort(porDesc('disparado_en'));
        var di = filas(F, 'comisiones_diferencias').slice().sort(porDesc('created_at'));
        var rec = [];
        if (de.length > 20000) rec.push('devengadas');
        if (di.length > 5000) rec.push('diferencias');
        return { devengadas: de.slice(0, 20000).map(function (d) { return elige(d, ['id', 'contrato_raiz_id', 'beneficiario_email', 'nivel', 'importe', 'importe_ajustado',
            'ajuste_motivo', 'anulado_motivo', 'moneda', 'estado', 'disparado_en', 'pagado_por', 'pagado_en', 'disparado_por_snapshot']); }),
          diferencias: di.slice(0, 5000).map(function (f) {
            var d = dev.filter(function (x) { return x.id === f.devengo_id; })[0];
            return Object.assign(elige(f, ['id', 'numero', 'devengo_id', 'importe', 'estado', 'motivo', 'created_at']),
              { devengo: d ? { nivel: d.nivel, beneficiario_email: d.beneficiario_email, contrato_raiz_id: d.contrato_raiz_id, moneda: d.moneda } : null });
          }),
          recortado: rec };
      },
      comision_de_solicitud_datos: function (F, a) {
        var l = filas(F, 'comisiones_devengadas').filter(function (d) { return d.solicitud_id === a.p_solicitud && ['manager', 'estandar', 'propia'].indexOf(d.nivel) !== -1; }).slice(0, 2);
        return { comision: l.length === 1 ? elige(l[0], ['estado', 'pagado_en', 'importe', 'importe_ajustado', 'moneda']) : null };
      },
      operacion_comisiones_datos: function (F, a) {
        var ids = Array.isArray(a.p_contratos) ? a.p_contratos : [];
        if (ids.length > 200) falla('operacion_comisiones_datos: como mucho 200 contratos');
        return { comisiones: filas(F, 'comisiones_devengadas').filter(function (d) { return ids.indexOf(d.contrato_raiz_id) !== -1; })
          .sort(function (x, y) { return x.id < y.id ? -1 : x.id > y.id ? 1 : 0; })
          .map(function (d) { return elige(d, ['id', 'estado', 'solicitud_id']); }) };
      },
      condicion_usos_datos: function (F, a) {
        return { devengadas: filas(F, 'comisiones_devengadas').filter(function (d) { return d.condicion_id === a.p_condicion; }).length };
      },
      finanzas_panel_datos: function (F, a) {
        var porId = function (x, y) { return x.id < y.id ? -1 : x.id > y.id ? 1 : 0; };
        var r = { comisiones: null, gastos: null, recortado: [] };
        if (a.p_comisiones) {
          var co = filas(F, 'comisiones_devengadas').slice().sort(porId);
          if (co.length > 20000) r.recortado.push('comisiones');
          r.comisiones = co.slice(0, 20000).map(function (d) { return elige(d, ['id', 'estado', 'importe', 'importe_ajustado', 'moneda', 'solicitud_id', 'pagado_en', 'anulado_en', 'contrato_raiz_id']); });
        }
        if (a.p_gastos) {
          var pro = {}; filas(F, 'proyectos').forEach(function (p) { pro[p.id] = p.nombre; });
          var gru = {}; filas(F, 'gasto_categorias').forEach(function (c) { gru[c.clave] = c.grupo; });
          var ga = filas(F, 'gastos').slice().sort(porId);
          if (ga.length > 20000) r.recortado.push('gastos');
          r.gastos = ga.slice(0, 20000).map(function (g) {
            return Object.assign(elige(g, ['id', 'estado', 'moneda', 'total', 'base', 'pph_retenido', 'pph_ingresado_el', 'fecha', 'vence_el', 'pagado_el', 'sociedad']),
              { proyecto_nombre: pro[g.proyecto_id] == null ? null : pro[g.proyecto_id], grupo: gru[g.categoria] == null ? null : gru[g.categoria] });
          });
        }
        return r;
      }
    };
  })();

  /* ══ Almacén de la pestaña (A2, 11-oct-2026, demo-pA) ═══════════════════════════════════════════════════════════
     Qué: lo que el visitante crea sigue ahí al cambiar de pantalla y al recargar; al cerrar la pestaña o con
     «Reset demo» (LW_DEMO_RESTABLECE) vuelve la empresa inicial.
     Cómo: un DIARIO de efectos en sessionStorage que cada página repite tras la siembra. Se apuntan EFECTOS (la fila
     insertada con su id y su número ya puestos; cambios y borrados por clave), nunca peticiones: repetir no vuelve a
     pasar por las reglas — un recibí repetido no puede fallar «≤ pendiente» ni una firma «ya firmado».
     Seguridad (revisión previa del 11-oct): solo sessionStorage (en un ordenador compartido, localStorage dejaría lo
     tecleado al siguiente), claves `axw-demo:<versión>:` (las `sb-` las barre LIMPIA_SESION en cada página),
     try/catch en cada acceso y tope de tamaño CON AVISO en pantalla; de un fichero «subido», solo nombre y tamaño.
     Nada de esto toca el navegador al cargarse: build.py hace require() de este fichero en Node con window = {}. */
  var PREF = 'axw-demo:';
  var TOPE_DIARIO = 2000000;   // caracteres (~4 MB en UTF-16); sessionStorage da unos 5 MB por origen
  var SESION_EMAIL = 'direccion' + DOMINIO;   // la directora con la que entra la demo (build.py: qa@… → direccion@…)
  var DIARIO = null, REPITIENDO = false, AVISADO = {};

  /* Textos que ve el visitante, en UN sitio (la demo va en inglés: owner, 12-oct 00:02). Los de las reglas llevan al
     lado el texto exacto de la base de Lawang (`es`): test_base_falsa.py comprueba que sigue en su migración, y si
     Lawang cambia una regla la prueba se pone en rojo. */
  var TEXTOS = {
    almacen_no: 'This browser is not letting the demo keep your changes between pages (private window?). Everything still works on this page.',
    almacen_lleno: 'This demo tab is full: new changes stay on this page only. Use "Reset demo" to start again.',
    repite_mal: 'Some of your earlier changes in this tab could not be restored. Use "Reset demo" to start again.',
    reset_mal: 'The demo could not be reset in this tab. Close the tab and open the demo again.',
    filtro_no: 'Not available in the demo: this change uses a filter the demo cannot apply safely.',
    sin_filtro: 'Not available in the demo: a change without a filter would touch every row.',
    solo_get: 'Not available in the demo: nothing is sent from this page.',
    fichero_no: 'Not available in the demo: files.',
    fichero_tipo: 'Only PDF, JPG, PNG or WEBP files can be attached.'
  };
  var REGLAS = {
    datos_no_validos: { es: 'Datos de la ficha no válidos', en: 'The client details are not valid.' },
    email_mal: { es: 'El email no parece una dirección válida', en: 'That email does not look like a valid address.' },
    faltan: { es: 'No se puede crear la ficha, falta: %', en: 'The client cannot be created, missing: %' },
    no_encuentro_ficha: { es: 'No encuentro esa ficha entre las tuyas', en: 'That client is not among yours.' },
    falta_nombre: { es: 'Falta el nombre', en: 'The name is missing.' },
    recibi_no_aqui: { es: 'Un recibí se guarda con guardar_recibi, no aquí', en: 'A receipt is saved from the receipt screen, not here.' },
    tipo_desconocido: { es: 'Tipo de documento desconocido: %', en: 'Unknown document type: %' },
    contrato_no_ves: { es: 'No puedes emitir un documento sobre un contrato que no ves', en: 'You cannot issue a document on a contract you cannot see.' },
    cliente_no_comprador: { es: 'Ese cliente no es comprador de este contrato ni un cliente que veas', en: 'That client is not a buyer on this contract.' },
    impuesto_rango: { es: 'El impuesto tiene que estar entre 0 y 100 %%', en: 'The tax has to be between 0 and 100 percent.' },
    sin_importe: { es: 'El documento no tiene importe (un total negativo es una rectificativa, no una factura)', en: 'The document has no amount (a negative total is a credit note, not an invoice).' },
    falta_total: { es: 'Falta el total que se ve en pantalla: recarga la página y vuelve a guardar', en: 'The total shown on screen is missing: reload the page and save again.' },
    no_cuadra: { es: 'El total no cuadra: la pantalla dice % y las líneas suman %. Recarga la página y vuelve a guardar.', en: 'The total does not add up: the screen says % and the lines add up to %. Reload the page and save again.' },
    doc_no_existe: { es: 'Ese documento ya no existe', en: 'That document no longer exists.' },
    recibi_se_edita: { es: 'Un recibí se edita con guardar_recibi, no aquí', en: 'A receipt is edited from the receipt screen, not here.' },
    no_editar: { es: 'No puedes editar este documento (anulado, o no es tuyo ni de tu proyecto)', en: 'You cannot edit this document (it is void, or not yours).' },
    enviada: { es: 'La factura % ya se envió: no se edita (ni cliente, ni empresa, ni fecha, ni importes). Se corrige con una rectificativa.', en: 'Invoice % has been sent: it cannot be edited. It is corrected with a credit note.' },
    tope_cadena: { es: 'Con este documento se facturarían % y el precio acordado de % es %. Quedan % por facturar. Corrige el importe, o el precio del contrato si cambió.', en: 'With this document % would be invoiced and the agreed price of % is %. % is left to invoice. Correct the amount, or the contract price if it changed.' },
    recibi_contrato: { es: 'el recibi necesita un contrato', en: 'A receipt needs a contract.' },
    recibi_contrato_no_ves: { es: 'No puedes emitir un recibí sobre un contrato que no ves', en: 'You cannot issue a receipt on a contract you cannot see.' },
    recibi_justificante: { es: 'el recibi necesita un justificante de pago adjunto', en: 'A receipt needs a proof of payment attached.' },
    recibi_8: { es: 'demasiados justificantes en un recibi (maximo 8)', en: 'Too many proofs of payment on a receipt (8 at most).' },
    recibi_no_existe: { es: 'algun justificante adjunto no existe en el almacenamiento', en: 'An attached proof of payment was not found.' },
    recibi_sin_factura: { es: 'el recibi necesita al menos una factura que salde', en: 'A receipt needs at least one invoice to settle.' },
    recibi_no_actualiza: { es: 'no se pudo actualizar: no existe, esta anulado, o no es tuyo', en: 'It could not be updated: it does not exist, it is void, or it is not yours.' },
    recibi_enviado: { es: 'El recibí % ya se envió al cliente: no se edita. Anúlalo y emite otro si hace falta corregirlo.', en: 'Receipt % has been sent to the client: it cannot be edited. Void it and issue another one.' },
    aplic_invalida: { es: 'la aplicacion referencia una factura invalida o anulada', en: 'The payment points to an invalid or void invoice.' },
    aplic_huerfana: { es: 'la factura % no cuelga de ningun contrato: no se le puede aplicar un cobro (LAW-38)', en: 'Invoice % is not linked to any contract: a payment cannot be applied to it.' },
    aplic_otro: { es: 'la factura % es de otro comprador que el recibi', en: 'Invoice % belongs to a different buyer than the receipt.' },
    aplic_cero: { es: 'el importe que se aplica a la factura % tiene que ser mayor que cero', en: 'The amount applied to invoice % has to be greater than zero.' },
    aplic_pendiente: { es: 'la factura % solo tiene % pendiente de cobro y este recibí le aplica %', en: 'Invoice % only has % outstanding and this receipt applies %.' },
    borra_numerada: { es: '% no se puede borrar: una factura o un recibí numerados se ANULAN (borrarlos deja un hueco en la numeración)', en: '% cannot be deleted: numbered invoices and receipts are VOIDED (deleting them would leave a gap in the numbering).' },
    ya_anulado: { es: 'El documento % ya está anulado', en: 'Document % is already void.' },
    no_anulado: { es: 'El documento % no está anulado', en: 'Document % is not void.' },
    borra_proforma: { es: 'No puedes borrar esta proforma (enviada, con cobros aplicados, o sin permiso). Anúlala.', en: 'This pro forma cannot be deleted (it was sent or has payments). Void it instead.' },
    anulado_no_envia: { es: 'El documento % está anulado: no se marca como enviado', en: 'Document % is void: it cannot be marked as sent.' },
    operacion_no_existe: { es: 'esa operacion no existe', en: 'That deal does not exist.' },
    operacion_pagada: { es: 'Esta operacion ya tiene una comision pagada (devengo %): no se puede borrar automaticamente, resuelvelo a mano', en: 'This deal already has a paid commission (%): it cannot be deleted automatically, it has to be resolved by hand.' },
    contrato_no_existe: { es: 'Ese contrato ya no existe', en: 'That contract no longer exists.' },
    ya_firmado: { es: '', en: 'This contract is already signed.' },
    unidad_ocupada: { es: '', en: 'That unit is not available.' },
    precio_cero: { es: '', en: 'The contract needs a price greater than zero.' },
    cliente_no_existe: { es: '', en: 'That client does not exist.' }
  };
  function falla(clave, args, code) {
    var r = REGLAS[clave], txt = r ? r.en : (TEXTOS[clave] || String(clave)), i = 0;
    txt = txt.replace(/%/g, function () { var a = (args || [])[i++]; return a == null ? '?' : String(a); });
    var e = new Error(txt); e.code = code || (r ? '23514' : 'demo'); throw e;
  }
  function errorDe(e) { return { message: String((e && e.message) || e), code: (e && e.code) || 'P0001' }; }

  function almacen() { try { return window.sessionStorage || null; } catch (e) { return null; } }
  function version() { return String(window.AXW_DEMO_VERSION || 'dev'); }
  function claveDiario() { return PREF + version() + ':diario'; }
  /* Aviso en pantalla, nunca un catch mudo: si la pestaña no guarda, el visitante lo sabe. */
  function avisa(clave) {
    if (AVISADO[clave]) return; AVISADO[clave] = true;
    var texto = TEXTOS[clave] || clave;
    try { console.warn('[demo] ' + texto); } catch (e) { /* sin consola */ }
    if (typeof document === 'undefined' || !document.createElement) return;
    function pinta() {
      var b = document.getElementById('axw-demo-aviso');
      if (!b) {
        b = document.createElement('div'); b.id = 'axw-demo-aviso'; b.setAttribute('role', 'alert');
        b.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483001;max-width:min(560px,calc(100vw - 32px));' +
          'background:#3b2f1e;color:#fff;font:500 13px/1.4 system-ui,sans-serif;padding:10px 14px;border-radius:10px';
        document.body.appendChild(b);
      }
      b.textContent = texto;
    }
    if (document.body) pinta(); else if (document.addEventListener) document.addEventListener('DOMContentLoaded', pinta);
  }
  function diario() {
    if (DIARIO) return DIARIO;
    DIARIO = [];
    var s = almacen();
    if (!s) { avisa('almacen_no'); return DIARIO; }
    try {
      // un diario escrito contra otra siembra (otro build) no se repite sobre esta: fuera
      for (var i = s.length - 1; i >= 0; i--) {
        var k = s.key(i);
        if (k && k.indexOf(PREF) === 0 && k.indexOf(PREF + version() + ':') !== 0) s.removeItem(k);
      }
      var txt = s.getItem(claveDiario());
      if (txt) { var d = JSON.parse(txt); if (Array.isArray(d)) DIARIO = d; }
    } catch (e) { avisa('almacen_no'); }
    return DIARIO;
  }
  /* Se apunta en memoria y se guarda UNA vez al final de cada operación (persiste): o entra la operación entera
     (un recibí con sus aplicaciones, un contrato con su comprador) o no entra nada — nunca medio guardado. */
  var SIN_GUARDAR = false;
  function apunta(ef) {
    if (REPITIENDO) return;
    diario().push(ef);
    SIN_GUARDAR = true;
  }
  function persiste() {
    if (!SIN_GUARDAR) return;
    SIN_GUARDAR = false;
    var s = almacen();
    if (!s) return;
    try {
      var txt = JSON.stringify(DIARIO);
      if (txt.length > TOPE_DIARIO) throw new Error('tope del diario');
      s.setItem(claveDiario(), txt);
    } catch (e) { avisa('almacen_lleno'); }
  }
  window.LW_DEMO_RESTABLECE = function () {
    var s = almacen();
    try {
      if (s) for (var i = s.length - 1; i >= 0; i--) { var k = s.key(i); if (k && k.indexOf(PREF) === 0) s.removeItem(k); }
    } catch (e) { avisa('reset_mal'); return false; }
    DIARIO = [];
    try { window.location.reload(); } catch (e) { /* fuera del navegador (pruebas): no hay nada que recargar */ }
    return true;
  };

  /* ── Efectos ───────────────────────────────────────────────────────────────────────────────────────────────── */
  var CLAVES = ['id', 'user_id', 'clave', 'slug'];
  function copia(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function pk(r) { for (var i = 0; i < CLAVES.length; i++) if (r && r[CLAVES[i]] != null) return CLAVES[i]; return null; }
  function datosDe(F, t) {
    if (!F[t]) F[t] = { data: [], error: null };
    if (!Array.isArray(F[t].data)) { var e = new Error(TEXTOS.filtro_no); e.code = 'demo'; throw e; }
    return F[t].data;
  }
  function filasDe(F, t) { return (F[t] && Array.isArray(F[t].data)) ? F[t].data : []; }
  function porId(F, t, id) { return id == null ? null : (filasDe(F, t).filter(function (r) { return r.id === id; })[0] || null); }
  /* Cómo volver a encontrar estas filas al repetir el diario: por su clave; sin clave, por su posición (la repetición
     es determinista: misma siembra y mismos efectos en el mismo orden dan las mismas posiciones). */
  function refs(F, t, filas) { var d = datosDe(F, t); return filas.map(function (r) { var k = pk(r); return k ? [k, r[k]] : ['#', d.indexOf(r)]; }); }
  function busca(F, t, rs) {
    var d = datosDe(F, t);
    return rs.map(function (x) { return x[0] === '#' ? d[x[1]] : d.filter(function (r) { return r[x[0]] === x[1]; })[0]; }).filter(Boolean);
  }
  function aplica(F, ef) {
    var d = datosDe(F, ef.t);
    if (ef.op === 'ins') { var nuevas = ef.filas.map(copia); for (var i = nuevas.length - 1; i >= 0; i--) d.unshift(nuevas[i]); return nuevas; }
    var filas = busca(F, ef.t, ef.refs);
    if (ef.op === 'upd') { filas.forEach(function (r) { Object.assign(r, copia(ef.cambios)); }); return filas; }
    if (ef.op === 'del') {   // en su sitio: operaciones_equipo y otras vistas comparten el array
      for (var j = d.length - 1; j >= 0; j--) if (filas.indexOf(d[j]) !== -1) d.splice(j, 1);
      return filas;
    }
    return [];
  }
  function ahora() { return new Date().toISOString(); }
  /* Ids con forma de uuid y deterministas (posición en el diario): una pantalla que valide el uuid de la URL los acepta,
     y la misma fila tiene el mismo id en cada página de la pestaña. La siembra usa ids cortos: no chocan. */
  function nuevoId(i) { var n = diario().length + 1; return 'd0d0d0d0-0000-4000-8000-' + ('000000000000' + (n * 1000 + (i || 0))).slice(-12); }
  function inserta(F, t, filas) {
    var t0 = ahora();
    var listas = filas.map(function (f, i) {
      var r = Object.assign({}, f);
      if (!pk(r)) r.id = nuevoId(i);
      if (!('created_at' in r)) r.created_at = t0;
      if (!('creado_en' in r)) r.creado_en = t0;
      return r;
    });
    var ef = { t: t, op: 'ins', filas: listas };
    var hechas = aplica(F, ef); apunta(ef);
    return hechas;
  }
  function actualiza(F, t, filas, cambios) {
    if (!filas.length) return [];
    var ef = { t: t, op: 'upd', refs: refs(F, t, filas), cambios: copia(cambios) };
    var hechas = aplica(F, ef); apunta(ef);
    return hechas;
  }
  function borra(F, t, filas) {
    if (!filas.length) return [];
    var ef = { t: t, op: 'del', refs: refs(F, t, filas) };
    var hechas = aplica(F, ef); apunta(ef);
    return hechas;
  }

  /* Tras cada escritura y tras repetir el diario: lo que en la base son vistas o columnas calculadas. Sin esto el
     pendiente de una factura no baja al cobrarla (criterio de A3). */
  function recalcula(F) {
    var fac = filasDe(F, 'facturas'), apl = filasDe(F, 'recibi_aplicaciones');
    var recVivo = {}, pend = {}, cobrado = {};
    fac.forEach(function (f) {
      if (f.tipo === 'recibi' && !f.anulada) { recVivo[f.id] = true; if (f.contrato_id) cobrado[f.contrato_id] = (cobrado[f.contrato_id] || 0) + (Number(f.total) || 0); }
      if (f.tipo === 'factura' && !f.anulada) pend[f.id] = Number(f.total) || 0;
    });
    apl.forEach(function (a) { if (recVivo[a.recibi_id] && pend[a.factura_id] != null) pend[a.factura_id] -= Number(a.importe_aplicado) || 0; });
    F.facturas_pendiente_equipo = { data: Object.keys(pend).map(function (k) { return { factura_id: k, pendiente: Math.round(pend[k] * 100) / 100 }; }), error: null };
    filasDe(F, 'contratos').forEach(function (c) { c.cobrado = Math.round((cobrado[c.id] || 0) * 100) / 100; });
    var uPorId = {}; filasDe(F, 'unidades').forEach(function (u) { uPorId[u.id] = u; });
    var cPorId = {}; filasDe(F, 'contratos').forEach(function (c) { cPorId[c.id] = c; });
    filasDe(F, 'unidades_estado').forEach(function (ue) {
      var u = uPorId[ue.id]; if (!u) return;
      ['estado', 'contrato_id', 'obra_fase', 'obra_fecha_entrega', 'obra_actualizado', 'precio'].forEach(function (k) { if (k in u) ue[k] = u[k]; });
      var c = u.contrato_id && cPorId[u.contrato_id];
      ue.contrato_numero = c ? c.numero : null; ue.comprador_nombre = c ? c.comprador_nombre : null; ue.contrato_firmado = !!(c && c.bloqueado);
    });
    if (F.operaciones) F.operaciones_equipo = { data: F.operaciones.data, error: null };
    /* Alias que la v4 pide con select('campos:datos->fields,…'): el doble de QA devuelve la fila entera sin resolverlos
       (su cabecera lo dice), así que van como columnas, igual que hace el doble con `soc` y `venc`. Sin `campos`, elegir
       contrato en la factura no rellenaba el cliente. */
    filasDe(F, 'contratos').forEach(function (c) {
      var d = c.datos || {}, f = d.fields || {};
      c.campos = f; c.hitos = d.hitos || []; c.extras = d.compradores || null; c.ficha = d.adq1_client_id || compradorDe(F, c.id) || null;
      c.precio_reserva = f.precio_reserva == null ? null : String(f.precio_reserva); if (!c.soc) c.soc = f.sociedad_firmante || null;
    });
    filasDe(F, 'facturas').forEach(function (fa) { var f = (fa.datos && fa.datos.fields) || {}; if (f.fecha_vencimiento && !fa.venc) fa.venc = f.fecha_vencimiento; });
  }

  window.LW_DEMO_REPITE = function (F) {
    REPITIENDO = true;
    try {
      diario().forEach(function (ef) { try { aplica(F, ef); } catch (e) { avisa('repite_mal'); } });
    } finally { REPITIENDO = false; }
    recalcula(F);
  };

  /* ── Filtros (los de PostgREST que usa la v4) ───────────────────────────────────────────────────────────────── */
  function campo(row, c) { var v = row; String(c).split('.').forEach(function (k) { v = v == null ? undefined : v[k]; }); return v; }
  function igual(v, val) {
    if (val === null || val === undefined) return v == null;
    if (v === val) return true;
    return v != null && typeof v !== 'object' && typeof val !== 'object' && String(v) === String(val);
  }
  function compara(v, val) {   // números como números; el resto (fechas ISO) como texto
    var a = Number(v), b = Number(val);
    if (v !== '' && val !== '' && !isNaN(a) && !isNaN(b) && typeof v !== 'boolean') return a < b ? -1 : a > b ? 1 : 0;
    return String(v) < String(val) ? -1 : String(v) > String(val) ? 1 : 0;
  }
  function patron(p, mayus) {
    var s = String(p).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '%').replace(/%/g, '.*').replace(/_/g, '.');
    return new RegExp('^' + s + '$', mayus ? 'i' : '');
  }
  function lista(v) {
    if (Array.isArray(v)) return v;
    var s = String(v == null ? '' : v).replace(/^\(|\)$/g, '');
    return s === '' ? [] : s.split(',').map(function (x) { return x.replace(/^"|"$/g, ''); });
  }
  function literal(s) { return s === 'null' ? null : s === 'true' ? true : s === 'false' ? false : s; }
  var OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is', 'not', 'or', 'and', 'contains', 'overlaps', 'filter', 'cs', 'ov'];
  function coincide(row, c, op, val) {
    var v = op === 'or' || op === 'and' ? null : campo(row, c);
    switch (op) {
      case 'eq': case 'is': return igual(v, val);
      case 'neq': return !igual(v, val);
      case 'gt': return v != null && compara(v, val) > 0;
      case 'gte': return v != null && compara(v, val) >= 0;
      case 'lt': return v != null && compara(v, val) < 0;
      case 'lte': return v != null && compara(v, val) <= 0;
      case 'like': return v != null && patron(val, false).test(String(v));
      case 'ilike': return v != null && patron(val, true).test(String(v));
      case 'in': return lista(val).some(function (x) { return igual(v, x); });
      case 'cs': case 'contains':
        if (Array.isArray(v)) return lista(val).every(function (x) { return v.some(function (y) { return igual(y, x); }); });
        if (v && typeof v === 'object' && val && typeof val === 'object') return Object.keys(val).every(function (k) { return igual(v[k], val[k]); });
        return false;
      case 'ov': case 'overlaps': return Array.isArray(v) && lista(val).some(function (x) { return v.some(function (y) { return igual(y, x); }); });
      case 'not': return !coincide(row, c, val[0], val[0] === 'in' ? lista(val[1]) : val[1]);
      case 'filter': return coincide(row, c, val[0], val[0] === 'in' ? lista(val[1]) : literal(val[1]));
      case 'or': return grupo(row, String(c), false);
      case 'and': return grupo(row, String(c), true);
    }
    return true;   // filtro que no sabe evaluar: en lectura deja pasar (como el doble de QA); en escritura no llega aquí
  }
  /* «a.eq.1,b.in.(x,y),and(c.gt.2,d.is.null)» → términos de primer nivel, respetando paréntesis. */
  function terminos(s) {
    var out = [], prof = 0, cur = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === '(') prof++; if (ch === ')') prof--;
      if (ch === ',' && prof === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }
  function termino(t) {   // → [campo, op, valor, negado] o null si no se entiende
    var m = /^(and|or)\((.*)\)$/.exec(t);
    if (m) return [m[2], m[1], null, false];
    var p = t.split('.'); if (p.length < 3) return null;
    var c = p.shift(), neg = false;
    if (p[0] === 'not') { neg = true; p.shift(); }
    var op = p.shift(), val = p.join('.');
    if (OPS.indexOf(op) === -1) return null;
    return [c, op, op === 'in' || op === 'cs' || op === 'ov' ? lista(val) : literal(val), neg];
  }
  function grupo(row, s, todos) {
    var ts = terminos(s).map(termino);
    var r = ts.map(function (t) { if (!t) return true; var x = coincide(row, t[0], t[1], t[2]); return t[3] ? !x : x; });
    return todos ? r.every(Boolean) : r.some(Boolean);
  }
  function filtroSeguro(f) {
    if (OPS.indexOf(f[0]) === -1) return false;
    if (f[0] === 'or' || f[0] === 'and') return terminos(String(f[1])).every(function (t) { var x = termino(t); return x && (x[1] === 'or' || x[1] === 'and' ? filtroSeguro([x[1], x[0]]) : true); });
    if (f[0] === 'not' || f[0] === 'filter') return OPS.indexOf(f[2] && f[2][0]) !== -1;
    return true;
  }
  window.LW_DEMO_COINCIDE = coincide;

  /* ── Escrituras directas a tabla (sb.from(t).insert/update/upsert/delete) ─────────────────────────────────── */
  window.LW_DEMO_TABLA = function (F, t, op, val, filtros, single) {
    try {
      var r = escribeTabla(F, t, op, val, filtros || []);
      recalcula(F); persiste();
      return { data: single ? (r[0] || null) : r, error: null };
    } catch (e) { persiste(); return { data: null, error: errorDe(e) }; }
  };
  function escribeTabla(F, t, op, val, filtros) {
    if (op === 'insert' || op === 'upsert') {
      var vals = (Array.isArray(val) ? val : [val]).map(function (v) { return Object.assign({}, v); });
      var nuevas = [], hechas = [];
      vals.forEach(function (v) {
        var k = pk(v), hay = k && datosDe(F, t).filter(function (r) { return r[k] === v[k]; });
        if (op === 'upsert' && hay && hay.length) hechas = hechas.concat(actualiza(F, t, hay, v)); else nuevas.push(v);
      });
      return hechas.concat(nuevas.length ? inserta(F, t, nuevas) : []);
    }
    if (!filtros.length) falla('sin_filtro');
    if (!filtros.every(filtroSeguro)) falla('filtro_no');
    var af = datosDe(F, t).filter(function (r) { return filtros.every(function (f) { return coincide(r, f[1], f[0], f[2]); }); });
    if (op === 'update') {
      if (t === 'facturas') af.forEach(function (f) { if (f.enviada && ('total' in val || 'datos' in val || 'cliente_nombre' in val)) falla('enviada', [f.numero]); });
      return actualiza(F, t, af, val);
    }
    if (op === 'delete') {
      if (t === 'facturas') af.forEach(function (f) { if (f.numero && f.tipo !== 'proforma') falla('borra_numerada', [f.numero]); });
      borra(F, t, af); return af;
    }
    return [];
  }
  /* Compatibilidad: los guardados de antes (guarda_modelo…) escriben por aquí. */
  window.LW_DEMO_ESCRIBE = function (F, t, op, val, filas) {
    if (op === 'insert' || op === 'upsert') return escribeTabla(F, t, op, val, []);
    if (op === 'update') return actualiza(F, t, filas || [], val);
    if (op === 'delete') { borra(F, t, filas || []); return []; }
    return [];
  };

  /* ── Ficheros: solo la subida de un justificante, simulada (A3) ──────────────────────────────────────────────── */
  var N_SUBIDAS = 0;
  window.LW_DEMO_FICHEROS = function (accion, datos) {
    if (accion !== 'justificante_url') { var e = new Error(TEXTOS.fichero_no); e.clave = 'no_disponible_en_la_demo'; return Promise.reject(e); }
    var ext = String((datos && datos.ext) || '').toLowerCase();
    if (!/^\.(pdf|jpe?g|png|webp)$/.test(ext)) return Promise.reject(new Error(TEXTOS.fichero_tipo));
    return Promise.resolve({ ok: true, path: 'demo/subidas/' + (diario().length + 1) + '-' + (++N_SUBIDAS) + ext, token: 'demo' });
  };
  window.LW_DEMO_SUBE = function (F, bucket, path, file) {
    if (bucket !== 'justificantes' || !/^demo\/subidas\/[0-9-]+\.(pdf|jpe?g|png|webp)$/.test(String(path))) {
      return Promise.resolve({ data: null, error: { message: TEXTOS.fichero_no } });
    }
    // nombre y tamaño; el contenido no se lee nunca (Seguridad)
    inserta(F, 'ficheros_demo', [{ id: 'fd-' + path, bucket: bucket, path: path, nombre: file && file.name ? String(file.name).slice(0, 200) : 'proof-of-payment', bytes: file && file.size || 0 }]);
    persiste();
    return Promise.resolve({ data: { path: path }, error: null });
  };

  /* ── Despacho de rpc (ÚNICO, lo llama el envoltorio que pone build.py) ─────────────────────────────────────────
     Orden: guardado (devuelve lo que devolvería la base) → lectura *_datos → RPC con forma de tabla (un chainable de
     verdad: la pantalla le encadena .select().order()) → lo que el doble de QA ya sabe (`siguiente`). */
  function encadena(res) {
    var p = Promise.resolve(res);
    var o = { then: function (a, b) { return p.then(a, b); }, catch: function (b) { return p.catch(b); }, finally: function (c) { return p.finally(c); } };
    ['select', 'order', 'limit', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'range', 'single', 'maybeSingle', 'or', 'not', 'filter',
      'match', 'like', 'ilike', 'contains', 'overlaps', 'returns', 'abortSignal'].forEach(function (k) { o[k] = function () { return o; }; });
    return o;
  }
  function hay(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  window.LW_DEMO_RPC = function (F, nombre, args, siguiente, chainable) {
    if (hay(window.LW_DEMO_RPC_GUARDA, nombre)) {
      try { var d = window.LW_DEMO_RPC_GUARDA[nombre](F, args || {}); recalcula(F); persiste(); return encadena({ data: d === undefined ? null : d, error: null }); }
      catch (e) { recalcula(F); persiste(); return encadena({ data: null, error: errorDe(e) }); }
    }
    if (hay(window.LW_DEMO_DATOS, nombre)) {
      try { return encadena({ data: window.LW_DEMO_DATOS[nombre](F, args || {}), error: null }); }
      catch (e) { return encadena({ data: null, error: errorDe(e) }); }
    }
    if (hay(RPC_TABLA, nombre)) {
      F['rpc:' + nombre] = { data: RPC_TABLA[nombre](F, args || {}), error: null };
      return chainable('rpc:' + nombre);
    }
    var r = siguiente();
    return (r && typeof r.then === 'function' && typeof r.select !== 'function') ? encadena(r) : r;
  };

  /* RPC que en la base son funciones de tabla (forma: su `returns table`). */
  var RPC_TABLA = {
    sociedades_visibles: function (F) { return filasDe(F, 'sociedades').filter(function (s) { return s.activa !== false; }); },
    /* Contratos con algún comprador en común con p_contrato_id (él incluido). Era una tabla fija con el primer contrato, y
       «Crear recibí» desde la factura de cualquier otro contrato decía «ya no tiene saldo pendiente» (verificador, 12-oct;
       arreglado por demo-pC-cascara con el paquete A ya cerrado). */
    contratos_del_mismo_comprador: function (F, a) {
      function suyos(id) {
        var s = {};
        filasDe(F, 'contrato_compradores').forEach(function (x) { if (x.contrato_id === id && x.client_id) s[x.client_id] = 1; });
        filasDe(F, 'contratos').forEach(function (c) { var d = c.datos || {}; if (c.id === id && d.adq1_client_id) s[d.adq1_client_id] = 1; });
        return s;
      }
      var base = suyos(a.p_contrato_id);
      return filasDe(F, 'contratos').filter(function (c) {
        if (c.id === a.p_contrato_id) return true;
        var otros = suyos(c.id);
        return Object.keys(otros).some(function (k) { return base[k]; });
      }).map(function (c) { return { contrato_id: c.id }; });
    },
    // 20261008960000_f2_b11_1_directorio_global_clientes.sql
    compradores_lista: function (F) {
      return filasDe(F, 'clients').map(function (c) {
        return { id: c.id, full_name: c.full_name, tipo: c.tipo, email: c.email, phone: c.phone, nationality: c.nationality, kyc_status: c.kyc_status,
          propietario: c.propietario, created_at: c.created_at, passport_hint: c.passport_number ? '…' + String(c.passport_number).slice(-4) : null };
      });
    },
    compradores_numeros: function (F) { return filasDe(F, 'clients').map(function (c) { return { id: c.id, numero_cliente: c.numero_cliente || null }; }); },
    comprador_buscar: function (F, a) {
      var q = String(a.p_q || '').trim().toLowerCase();
      if (q.length < 3) return [];
      return filasDe(F, 'clients').filter(function (c) {
        return String(c.full_name || '').toLowerCase().indexOf(q) !== -1 || String(c.email || '').toLowerCase().indexOf(q) !== -1 ||
          String(c.passport_number || '').toLowerCase() === q;
      }).slice(0, 8).map(function (c) { return { id: c.id, full_name: c.full_name, email: c.email,
        passport_hint: c.passport_number ? '…' + String(c.passport_number).slice(-4) : null, tipo: c.tipo, propietario: c.propietario }; });
    },
    contrato_firmas_equipo: function (F) { return filasDe(F, 'contrato_firmas'); }
  };

  /* ── Guardados (RPC que escriben). Cada uno COMPRUEBA TODO ANTES de escribir nada: una regla que falla a mitad
     dejaría medio guardado (en la base, la transacción lo deshace; aquí no hay transacción). ─────────────────── */
  var SOC_DEMO = 'axw_demo';
  var EMISOR_DEMO = { razon: 'AxisWorks Demo Ltd. (sample company)', npwp: 'DEMO-000-000', npwp_label: 'Tax ID', domicilio: '1 Sample Street, Demo City', rep: 'Demo Representative' };
  var SERIE_FACTURA = { proforma: 'PRO', recibi: 'REC', factura: 'INV' };
  var SERIE_CONTRATO = { reserva_parcela: 'RP', carta_reserva: 'CR', construccion: 'CC' };
  /* Siguiente número de una serie: la mayor de la tabla + 1, con las anuladas dentro (una anulada no se reutiliza). */
  function sigNumero(F, t, pref) {
    var re = new RegExp('^' + pref + '(\\d+)$'), max = 0;
    filasDe(F, t).forEach(function (r) { var m = re.exec(r.numero || r.numero_cliente || ''); if (m) max = Math.max(max, Number(m[1])); });
    return pref + ('00000' + (max + 1)).slice(-5);
  }
  function compradorDe(F, contratoId) {
    var cc = filasDe(F, 'contrato_compradores').filter(function (x) { return x.contrato_id === contratoId && x.rol === 'adquiriente_1'; })[0];
    return cc ? cc.client_id : null;
  }
  function raizDe(F, c) { return c.contrato_padre_id || c.id; }
  function cadena(F, raiz) { return filasDe(F, 'contratos').filter(function (c) { return c.id === raiz || c.contrato_padre_id === raiz; }); }
  function txt(v) { if (v == null) return null; var s = String(v).trim(); return s || null; }
  function decimales(m) { return m === 'IDR' ? 0 : 2; }
  function totales(F, lineas, moneda, fields) {
    var lista = null;
    (lineas || []).forEach(function (l) {
      if (Array.isArray(l.impuestos) && l.impuestos.length) {
        lista = l.impuestos.map(function (id) { return porId(F, 'impuestos', id); }).filter(Boolean);
      }
    });
    var imp = lista ? { lista: lista } : { pct: fields && fields.imp_pct };
    if (typeof window.calcTotales === 'function') return window.calcTotales(lineas || [], moneda, imp);
    var sub = (lineas || []).reduce(function (a, l) { return a + (Number(l.importe) || 0); }, 0);
    return { subtotal: sub, pct: 0, impuesto: 0, total: sub };
  }

  window.LW_DEMO_RPC_GUARDA = (function () {
    var E = function (F, t, op, val, filas) { return window.LW_DEMO_ESCRIBE(F, t, op, val, filas || []); };
    function donde(F, t, fn) { return filasDe(F, t).filter(fn); }
    function porIdF(id) { return function (r) { return r.id === id; }; }
    function reparto(F, t, base, c) {
      var es = function (r) { return Object.keys(base).every(function (k) { return r[k] === base[k]; }); };
      (c.quitar || []).forEach(function (k) { E(F, t, 'delete', null, donde(F, t, function (r) { return es(r) && r.clave === k; })); });
      (c.poner || []).forEach(function (k) { E(F, t, 'insert', Object.assign({ clave: k, es_default: false }, base)); });
      if (c.def || c.quita_def) E(F, t, 'update', { es_default: false }, donde(F, t, es));
      if (c.def) E(F, t, 'update', { es_default: true }, donde(F, t, function (r) { return es(r) && r.clave === c.def; }));
    }
    function upsert(F, t, fila, clave) {
      var h = donde(F, t, function (r) { return clave.every(function (k) { return r[k] === fila[k]; }); });
      if (h.length) E(F, t, 'update', fila, h); else E(F, t, 'insert', fila);
    }
    return {
      guarda_modelo: function (F, a) {
        var f = a.p_ficha || {};
        E(F, 'modelos', 'update', f, donde(F, 'modelos', porIdF(a.p_id)));
        (a.p_techos || []).forEach(function (t) {
          E(F, 'modelo_techos', 'update', { precio_ahora: t.precio_ahora, precio_2027: t.precio_2027 }, donde(F, 'modelo_techos', porIdF(t.id)));
        });
        (a.p_extras || []).forEach(function (e) {
          if (e.id) E(F, 'modelo_extras', 'update', { precio: e.precio, disponible: e.disponible, moneda: f.moneda }, donde(F, 'modelo_extras', porIdF(e.id)));
          else E(F, 'modelo_extras', 'insert', { modelo_id: a.p_id, extra_id: e.extra_id, precio: e.precio, disponible: e.disponible, moneda: f.moneda });
        });
        (a.p_precios || []).forEach(function (p) {
          E(F, 'modelos_villa', 'update', { precio_construccion: p.precio, moneda: f.moneda }, donde(F, 'modelos_villa', porIdF(p.id)));
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
      },

      /* Alta y edición de cliente — 20260927100500_cliente_guarda_faltan_datos.sql. Devuelve el uuid. La demo entra
         como super admin: las ramas de permiso (ficha ajena, KYC solo admin) siempre pasan, como pasarían en la base. */
      cliente_guarda: function (F, a) {
        var d = a.p_datos;
        if (!d || typeof d !== 'object' || Array.isArray(d)) falla('datos_no_validos', [], '22023');
        var nombre = txt(d.full_name) && txt(d.full_name).toUpperCase(), email = txt(d.email), tel = txt(d.phone),
          nac = txt(d.nationality), pas = txt(d.passport_number) && txt(d.passport_number).toUpperCase();
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) falla('email_mal', [], '22023');
        var old = null;
        if (!a.p_id) {
          var faltan = [];
          if (!nombre || nombre.length < 2) faltan.push('Full name');
          if (!email) faltan.push('Email');
          if (!tel || !/^\+[0-9]{1,4}/.test(tel)) faltan.push('Phone with its country code (+34, +62…)');
          if (!nac) faltan.push('Nationality');
          if (!pas) faltan.push('Passport / Tax ID');
          if (faltan.length) falla('faltan', [faltan.join(', ')], '22023');
        } else {
          old = porId(F, 'clients', a.p_id);
          if (!old) falla('no_encuentro_ficha', [], '42501');
          if ('full_name' in d && (!nombre || nombre.length < 2)) falla('falta_nombre', [], '22023');
        }
        var tipo = txt(d.tipo) || (old && old.tipo) || 'persona';
        var emp = function (k) { return tipo === 'empresa' ? txt(d[k]) : null; };
        if (!a.p_id) {
          var kyc = txt(d.kyc_status) || 'pending';
          var molde = {}; Object.keys(filasDe(F, 'clients')[0] || {}).forEach(function (k) { molde[k] = null; });
          var fila = Object.assign(molde, { tipo: tipo, full_name: nombre, email: email, phone: tel, nationality: nac, passport_number: pas,
            idioma_comunicacion: txt(d.idioma_comunicacion) || 'en', forma_juridica: emp('forma_juridica'), registro_num: emp('registro_num'),
            rep_nombre: emp('rep_nombre'), rep_cargo: emp('rep_cargo'), notes: txt(d.notes), kyc_status: kyc,
            kyc_verificado_por: kyc === 'verified' || kyc === 'rejected' ? SESION_EMAIL : null,
            kyc_verificado_el: kyc === 'verified' || kyc === 'rejected' ? ahora() : null,
            propietario: SESION_EMAIL, numero_cliente: sigNumero(F, 'clients', 'CLI-'), created_at: ahora() });
          delete fila.id;
          return inserta(F, 'clients', [fila])[0].id;
        }
        var cambios = { tipo: tipo };
        [['full_name', nombre], ['email', email], ['phone', tel], ['nationality', nac], ['passport_number', pas], ['notes', txt(d.notes)]]
          .forEach(function (p) { if (p[0] in d) cambios[p[0]] = p[1]; });
        if ('idioma_comunicacion' in d) cambios.idioma_comunicacion = txt(d.idioma_comunicacion) || 'en';
        ['forma_juridica', 'registro_num', 'rep_nombre', 'rep_cargo'].forEach(function (k) { if (tipo !== 'empresa') cambios[k] = null; else if (k in d) cambios[k] = txt(d[k]); });
        if (txt(d.kyc_status)) cambios.kyc_status = txt(d.kyc_status);
        actualiza(F, 'clients', [old], cambios);
        return old.id;
      },

      /* Factura y proforma — 20261008202000_f2_b2_2_facturas_por_empresa.sql (+ tope por cadena de 20261005220000).
         Devuelve table(id, numero, total). El EMISOR es siempre la sociedad inventada (Seguridad: que la demo no
         sirva para fabricar una factura creíble de otro), mande lo que mande la pantalla. */
      factura_guarda: function (F, a) {
        var p = a.p_factura || {}, tipo = p.tipo || 'factura';
        if (tipo === 'recibi') falla('recibi_no_aqui', [], '22023');
        if (tipo !== 'factura' && tipo !== 'proforma') falla('tipo_desconocido', [tipo], '22023');
        var c = p.contrato_id ? porId(F, 'contratos', p.contrato_id) : null;
        if (p.contrato_id && !c) falla('contrato_no_ves', [], '42501');
        var cliente = p.client_id || (c ? compradorDe(F, c.id) : null);
        if (p.client_id && c && filasDe(F, 'contrato_compradores').filter(function (x) { return x.contrato_id === c.id && x.client_id === p.client_id; }).length === 0) falla('cliente_no_comprador', [], '42501');
        if (p.client_id && !porId(F, 'clients', p.client_id)) falla('cliente_no_comprador', [], '42501');
        var datos = copia(p.datos || {}); datos.fields = datos.fields || {};
        var moneda = p.moneda || (c && c.moneda) || null;
        var t = totales(F, datos.lineas, moneda, datos.fields);
        if (!(Number(t.pct) >= 0 && Number(t.pct) <= 100)) falla('impuesto_rango', [], '22023');
        if (!(Number(t.subtotal) > 0)) falla('sin_importe', [], '22023');
        if (p.total == null || p.total === '') falla('falta_total', [], '22023');
        if (Math.abs(Number(p.total) - Number(t.total)) > Math.pow(10, -decimales(moneda))) falla('no_cuadra', [p.total, t.total], '22023');
        datos.totales = t;
        datos.emisor = copia(EMISOR_DEMO);   // congelado al emitir, como congela_emisor_factura()
        var old = a.p_id ? porId(F, 'facturas', a.p_id) : null;
        if (a.p_id) {
          if (!old) falla('doc_no_existe', [], 'P0002');
          if (old.tipo === 'recibi') falla('recibi_se_edita', [], '22023');
          if (old.anulada) falla('no_editar', [], '42501');
          if (old.enviada && old.tipo === 'factura') falla('enviada', [old.numero], '42501');   // la base solo bloquea la factura enviada
        }
        // tope por cadena: lo facturado (subtotal, facturas vivas de la misma moneda) no pasa del precio acordado
        if (tipo === 'factura' && c) {
          var raiz = porId(F, 'contratos', raizDe(F, c)), cad = cadena(F, raizDe(F, c));
          var conPrecio = cad.filter(function (x) { return String(x.tipo).indexOf('carta_reserva') !== 0; });
          var precio = conPrecio.reduce(function (s, x) { return s + (Number(x.precio_total) || 0); }, 0);
          var sinPrecio = !conPrecio.length || conPrecio.some(function (x) { return x.precio_total == null; });
          var ids = cad.map(function (x) { return x.id; });
          var facturado = filasDe(F, 'facturas').filter(function (f) { return f.tipo === 'factura' && !f.anulada && ids.indexOf(f.contrato_id) !== -1 && f.moneda === (raiz && raiz.moneda) && f.id !== a.p_id; })
            .reduce(function (s, f) { return s + (Number(f.datos && f.datos.totales && f.datos.totales.subtotal) || Number(f.total) || 0); }, 0);
          var tol = Math.pow(10, -decimales(moneda));
          var antes = old ? (Number(old.datos && old.datos.totales && old.datos.totales.subtotal) || Number(old.total) || 0) : null;
          if (raiz && moneda === raiz.moneda && !sinPrecio && precio > 0 && !(antes != null && t.subtotal <= antes + tol) && facturado + t.subtotal > precio + tol) {
            falla('tope_cadena', [facturado + t.subtotal, raiz.numero, precio, Math.max(precio - facturado, 0)]);
          }
        }
        var campos = { tipo: tipo, sociedad: SOC_DEMO, cliente_nombre: txt(p.cliente_nombre), proyecto_nombre: txt(p.proyecto_nombre) || (c && c.proyecto_nombre) || null,
          contrato_numero: c ? c.numero : txt(p.contrato_numero), contrato_id: c ? c.id : null, client_id: cliente, total: Number(t.total), moneda: moneda,
          fecha_emision: p.fecha_emision || dia(0), datos: datos, proyecto_id: c ? c.proyecto_id : null, operacion_id: c ? (c.operacion_id || null) : null,
          venc: datos.fields.fecha_vencimiento || null };
        if (old) { actualiza(F, 'facturas', [old], campos); return [{ id: old.id, numero: old.numero, total: campos.total }]; }
        var nueva = inserta(F, 'facturas', [Object.assign(campos, { numero: sigNumero(F, 'facturas', SERIE_FACTURA[tipo]), anulada: false, enviada: false,
          fecha_envio: null, justificante_path: null, justificantes: [], creado_por: SESION_EMAIL })])[0];
        return [{ id: nueva.id, numero: nueva.numero, total: nueva.total }];
      },

      /* Recibí — 20261010231825_recibi_enviado_no_se_edita.sql (+ pendiente de 20261005210000). Devuelve {id, numero}. */
      guardar_recibi: function (F, a) {
        var p = a.p_factura || {}, aps = a.p_aplicaciones;
        if (!p.contrato_id) falla('recibi_contrato');
        var c = porId(F, 'contratos', p.contrato_id);
        if (!c) falla('recibi_contrato_no_ves', [], '42501');
        var just = Array.isArray(p.justificantes) ? p.justificantes : [];
        if (!just.length && txt(p.justificante_path)) just = [{ path: p.justificante_path }];
        if (!just.length) falla('recibi_justificante');
        if (just.length > 8) falla('recibi_8');
        var subidos = {}; filasDe(F, 'ficheros_demo').forEach(function (x) { subidos[x.path] = true; });
        filasDe(F, 'facturas').forEach(function (f) { (f.justificantes || []).forEach(function (j) { if (j && j.path) subidos[j.path] = true; }); });
        if (just.some(function (j) { return !j || !txt(j.path) || !subidos[j.path]; })) falla('recibi_no_existe');
        if (!Array.isArray(aps) || !aps.length) falla('recibi_sin_factura');
        var old = null;
        if (a.p_id) {
          old = porId(F, 'facturas', a.p_id);
          if (!old || old.tipo !== 'recibi' || old.anulada) falla('recibi_no_actualiza', [], '42501');
          if (old.enviada) falla('recibi_enviado', [old.numero], '42501');
        }
        var recVivo = {}; filasDe(F, 'facturas').forEach(function (f) { if (f.tipo === 'recibi' && !f.anulada && (!old || f.id !== old.id)) recVivo[f.id] = true; });
        var comp = compradorDe(F, c.id);
        aps.forEach(function (x) {
          var f = porId(F, 'facturas', x.factura_id);
          if (!f || f.tipo !== 'factura' || f.anulada) falla('aplic_invalida');
          if (!f.contrato_id) falla('aplic_huerfana', [f.numero]);
          if (compradorDe(F, f.contrato_id) !== comp) falla('aplic_otro', [f.numero]);
          var imp = Number(x.importe);
          if (!(imp > 0)) falla('aplic_cero', [f.numero]);
          var pend = (Number(f.total) || 0) - filasDe(F, 'recibi_aplicaciones').filter(function (r) { return r.factura_id === f.id && recVivo[r.recibi_id]; })
            .reduce(function (s, r) { return s + (Number(r.importe_aplicado) || 0); }, 0);
          if (imp > pend + Math.pow(10, -decimales(f.moneda))) falla('aplic_pendiente', [f.numero, pend, imp]);
        });
        var datos = copia(p.datos || {}); datos.emisor = copia(EMISOR_DEMO);
        var campos = { sociedad: SOC_DEMO, cliente_nombre: txt(p.cliente_nombre), proyecto_nombre: c.proyecto_nombre || null, contrato_numero: c.numero,
          contrato_id: c.id, client_id: comp, total: Number(p.total) || 0, moneda: p.moneda || c.moneda, fecha_emision: p.fecha_emision || dia(0),
          justificantes: just.map(function (j) { return { path: j.path, nombre: j.nombre || null, subido_en: j.subido_en || null }; }), datos: datos,
          proyecto_id: c.proyecto_id || null };
        var rec;
        if (old) {
          actualiza(F, 'facturas', [old], campos); rec = old;
          borra(F, 'recibi_aplicaciones', filasDe(F, 'recibi_aplicaciones').filter(function (r) { return r.recibi_id === old.id; }));
        } else {
          rec = inserta(F, 'facturas', [Object.assign(campos, { tipo: 'recibi', numero: sigNumero(F, 'facturas', 'REC'), anulada: false, enviada: false,
            fecha_envio: null, justificante_path: null, creado_por: SESION_EMAIL, operacion_id: null })])[0];
        }
        inserta(F, 'recibi_aplicaciones', aps.map(function (x) { return { recibi_id: rec.id, factura_id: x.factura_id, importe_aplicado: Number(x.importe), creado_por: SESION_EMAIL }; }));
        return { id: rec.id, numero: rec.numero };
      },

      /* Anular, reactivar, borrar (solo proformas) y marcar enviado — datos.js 1747-1781; SQL: 20260926085354_frontera_facturas_rpc.sql,
         20261008202000 (factura_borra/factura_reactiva) y 20261010231825 (factura_marca_enviada). La demo es super admin. */
      factura_anula: function (F, a) {
        var f = porId(F, 'facturas', a.p_id);
        if (!f) falla('doc_no_existe', [], 'P0002');
        if (f.anulada) falla('ya_anulado', [f.numero], '22023');
        actualiza(F, 'facturas', [f], { anulada: true });
      },
      factura_reactiva: function (F, a) {
        var f = porId(F, 'facturas', a.p_id);
        if (!f) falla('doc_no_existe', [], 'P0002');
        if (!f.anulada) falla('no_anulado', [f.numero], '22023');
        actualiza(F, 'facturas', [f], { anulada: false });
      },
      factura_borra: function (F, a) {
        var f = porId(F, 'facturas', a.p_id);
        if (!f) falla('doc_no_existe', [], 'P0002');
        if (f.tipo !== 'proforma') falla('borra_numerada', [f.numero], '42501');
        if (f.enviada) falla('borra_proforma', [], '42501');
        borra(F, 'facturas', [f]);
      },
      factura_marca_enviada: function (F, a) {
        var f = porId(F, 'facturas', a.p_id);
        if (!f) falla('doc_no_existe', [], 'P0002');
        if (f.anulada) falla('anulado_no_envia', [f.numero], '22023');
        if (!f.enviada) actualiza(F, 'facturas', [f], { enviada: true, fecha_envio: dia(0) });
      },

      /* «Borrar operación» (datos.js borrarOperacionV4): solo la cadena de ESE contrato. Lo numerado se ANULA (la
         serie no puede tener huecos), las firmas vivas se anulan, las comisiones se purgan (para si hay una pagada)
         y la parcela vuelve a estar disponible. Devuelve los recuentos que pinta el aviso. */
      borrar_operacion: function (F, a) {
        var c0 = porId(F, 'contratos', a.p_contrato_id);
        if (!c0) falla('operacion_no_existe', [], 'P0001');
        var fam = filasDe(F, 'contratos').filter(function (c) { return c.id === c0.id || c.contrato_padre_id === c0.id; });
        var ids = fam.map(function (c) { return c.id; });
        var com = filasDe(F, 'comisiones_devengadas').filter(function (d) { return ids.indexOf(d.contrato_raiz_id) !== -1; });
        var solPagada = {}; filasDe(F, 'solicitudes_pago').forEach(function (s) { if (s.estado === 'pagada') solPagada[s.id] = true; });
        var pagada = com.filter(function (d) { return d.estado === 'pagada' || solPagada[d.solicitud_id]; })[0];
        if (pagada) falla('operacion_pagada', [pagada.id]);
        var facs = filasDe(F, 'facturas').filter(function (f) { return ids.indexOf(f.contrato_id) !== -1 && !f.anulada; });
        actualiza(F, 'facturas', facs, { anulada: true });
        var firmas = filasDe(F, 'contrato_firmas').filter(function (x) { return ids.indexOf(x.contrato_id) !== -1 && (x.estado === 'pendiente' || x.estado === 'procesando'); });
        actualiza(F, 'contrato_firmas', firmas, { estado: 'anulado' });
        var sols = com.map(function (d) { return d.solicitud_id; }).filter(Boolean);
        var solsBorradas = borra(F, 'solicitudes_pago', filasDe(F, 'solicitudes_pago').filter(function (s) { return sols.indexOf(s.id) !== -1; }));
        borra(F, 'comisiones_devengadas', com);
        actualiza(F, 'unidades', filasDe(F, 'unidades').filter(function (u) { return ids.indexOf(u.contrato_id) !== -1; }), { estado: 'disponible', contrato_id: null });
        borra(F, 'reservas_vencimiento', filasDe(F, 'reservas_vencimiento').filter(function (r) { return ids.indexOf(r.contrato_id) !== -1; }));
        borra(F, 'contrato_vencimientos', filasDe(F, 'contrato_vencimientos').filter(function (v) { return ids.indexOf(v.contrato_id) !== -1; }));
        borra(F, 'contrato_compradores', filasDe(F, 'contrato_compradores').filter(function (x) { return ids.indexOf(x.contrato_id) !== -1; }));
        var ops = fam.map(function (c) { return c.operacion_id; }).filter(Boolean);
        borra(F, 'contratos', fam);
        var siguenUsadas = {}; filasDe(F, 'contratos').forEach(function (c) { if (c.operacion_id) siguenUsadas[c.operacion_id] = true; });
        borra(F, 'operaciones', filasDe(F, 'operaciones').filter(function (o) { return ops.indexOf(o.id) !== -1 && !siguenUsadas[o.id]; }));
        // misma forma que 20260922143000_borrar_operacion_gate_pagada_cubre_closer.sql
        return { contratos_borrados: fam.length, firmas_anuladas: firmas.length, facturas_anuladas: facs.length, comisiones_purgadas: com.length, solicitudes_purgadas: solsBorradas.length };
      },

      /* Contrato de la demo (contrato A↔B con demo-pB-flujo, 11-oct): la pantalla «Nuevo contrato» de B lo crea y lo
         firma por aquí, para que la numeración y las reglas vivan en un solo sitio. */
      demo_contrato_crea: function (F, a) {
        var tipo = a.p_tipo || 'reserva_parcela', pref = SERIE_CONTRATO[tipo];
        if (!pref) falla('tipo_desconocido', [tipo], '22023');
        var cli = porId(F, 'clients', a.p_client_id); if (!cli) falla('cliente_no_existe');
        var u = porId(F, 'unidades', a.p_unidad_id); if (!u) falla('unidad_ocupada');
        if (tipo === 'reserva_parcela' && (u.estado !== 'disponible' || u.contrato_id)) falla('unidad_ocupada');
        var precio = Number(a.p_precio); if (!(precio > 0)) falla('precio_cero');
        var padre = a.p_padre_id ? porId(F, 'contratos', a.p_padre_id) : null;
        if (a.p_padre_id && !padre) falla('contrato_no_existe', [], 'P0002');
        var pro = porId(F, 'proyectos', u.proyecto_id) || {};
        var numero = sigNumero(F, 'contratos', pref), t0 = ahora();
        var opId = padre ? padre.operacion_id : null;
        if (!opId) {
          var nOp = 0; filasDe(F, 'operaciones').forEach(function (o) { var m = /^OP-2026-(\d+)$/.exec(o.referencia || ''); if (m) nOp = Math.max(nOp, Number(m[1])); });
          opId = inserta(F, 'operaciones', [{ referencia: 'OP-2026-' + ('000' + (nOp + 1)).slice(-4), client_id: cli.id, tipo: 'inmobiliaria', estado: 'abierta',
            importe_total: null, moneda: a.p_moneda || u.moneda || 'EUR', proyecto_id: u.proyecto_id, creado_por: SESION_EMAIL, created_at: t0, datos: {} }])[0].id;
        }
        var molde = {}; Object.keys(filasDe(F, 'contratos')[0] || {}).forEach(function (k) { molde[k] = null; });
        var c = inserta(F, 'contratos', [Object.assign(molde, { tipo: tipo, numero: numero, comprador_nombre: cli.full_name, proyecto_nombre: pro.nombre || u.proyecto || null,
          precio_total: precio, moneda: a.p_moneda || u.moneda || 'EUR', fecha_firma: null, bloqueado: false, pdf_firmado_path: null, creado_por: SESION_EMAIL, cobrado: 0,
          datos: { fields: Object.assign(tipo === 'construccion' ? {} : { parcela_codigo: u.codigo }, { adq1_nombre: cli.full_name, adq1_pasaporte: cli.passport_number, adq1_email: cli.email,
            adq1_domicilio: cli.address || null, proyecto_nombre: pro.nombre || u.proyecto || null, moneda: a.p_moneda || u.moneda || 'EUR', precio_total: precio, sociedad_firmante: SOC_DEMO }),
            hitos: [], adq1_client_id: cli.id, texto_sha256: a.p_texto_sha || null },
          compradores: [{ client_id: cli.id, rol: 'adquiriente_1', clients: { id: cli.id, full_name: cli.full_name, email: cli.email } }],
          contrato_padre_id: padre ? raizDe(F, padre) : null, proyecto_id: u.proyecto_id, unidad_id: u.id, nombre_contrato: TIPO_NOMBRE[tipo],
          parcela_codigo: u.codigo, soc: SOC_DEMO, operacion_id: opId, created_at: t0 })])[0];
        actualiza(F, 'contratos', [c], { contrato_id: c.id });
        inserta(F, 'contrato_compradores', [{ contrato_id: c.id, client_id: cli.id, rol: 'adquiriente_1', creado_en: t0,
          clients: { id: cli.id, full_name: cli.full_name, email: cli.email, phone: cli.phone, passport_number: cli.passport_number, kyc_status: cli.kyc_status } }]);
        inserta(F, 'contrato_firmas', [{ contrato_id: c.id, estado: 'pendiente', firmante_nombre: cli.full_name,
          expira_en: new Date(Date.now() + 7 * 864e5).toISOString(), contratos: { numero: numero, creado_por: SESION_EMAIL } }]);
        if (tipo === 'reserva_parcela') actualiza(F, 'unidades', [u], { contrato_id: c.id });
        return { id: c.id, numero: numero, operacion_id: opId };
      },
      demo_contrato_firma: function (F, a) {
        var c = porId(F, 'contratos', a.p_contrato);
        if (!c) falla('contrato_no_existe', [], 'P0002');
        if (c.bloqueado) falla('ya_firmado');
        // El día de HOY del visitante, no el de UTC: en Bali de madrugada salía «firmado el 11» con el contrato del 12
        // (verificación en vivo, 12-oct; las fechas de la siembra siguen en UTC, son relativas).
        var ahoraLocal = new Date();
        var hoy = ahoraLocal.getFullYear() + '-' + String(ahoraLocal.getMonth() + 1).padStart(2, '0') + '-' + String(ahoraLocal.getDate()).padStart(2, '0');
        actualiza(F, 'contratos', [c], { bloqueado: true, fecha_firma: hoy });
        actualiza(F, 'contrato_firmas', filasDe(F, 'contrato_firmas').filter(function (x) { return x.contrato_id === c.id && x.estado === 'pendiente'; }),
          { estado: 'firmado', firmado_en: ahora(), firmante_nombre: txt(a.p_firmante_nombre) || c.comprador_nombre });
        var u = porId(F, 'unidades', c.unidad_id);
        if (u) actualiza(F, 'unidades', [u], { estado: c.tipo === 'construccion' ? 'vendida' : 'reservada', contrato_id: u.contrato_id || c.id });
        return { id: c.id, numero: c.numero, fecha_firma: hoy };
      },

      /* Portal de clientes de la demo (fase E1, 12-oct): lo que el comprador escribe desde el portal, en el almacén de la pestaña
         por aquí y no desde la pantalla (frontera front/back). En el ERP estas funciones sacan al comprador de su sesión; en la
         demo no hay sesión, así que el portal dice qué cliente está viendo (p_client_id) y aquí se comprueba que existe. */
      portal_abrir_ticket: function (F, a) {
        var cli = porId(F, 'clients', a.p_client_id); if (!cli) falla('cliente_no_existe', [], 'P0002');
        var texto = txt(a.p_texto); if (!texto) falla('texto_vacio', [], '22023');
        // Como la base: una consulta solo puede citar una factura o un contrato DE ESE cliente (revisor, 12-oct).
        var suyos = {};
        filasDe(F, 'contrato_compradores').forEach(function (x) { if (x.client_id === cli.id) suyos[x.contrato_id] = true; });
        var f = a.p_factura_id ? porId(F, 'facturas', a.p_factura_id) : null;
        if (a.p_factura_id && (!f || !(f.client_id === cli.id || suyos[f.contrato_id]))) falla('factura_no_existe', [], 'P0002');
        var k = a.p_contrato_id ? porId(F, 'contratos', a.p_contrato_id) : null;
        if (a.p_contrato_id && (!k || !suyos[k.id])) falla('contrato_no_existe', [], 'P0002');
        var h = inserta(F, 'hilo_soporte', [{ client_id: cli.id, categoria: txt(a.p_categoria) || 'General', estado: 'abierto', actualizado_en: ahora(),
          factura_id: f ? f.id : null, contrato_id: k ? k.id : null, ref_numero: f ? f.numero : (k ? k.numero : null) }])[0];
        inserta(F, 'mensajes_comprador', [{ hilo_id: h.id, client_id: cli.id, de: 'comprador', autor: null, texto: texto }]);
        return h.id;
      },
      portal_enviar_mensaje: function (F, a) {
        var h = porId(F, 'hilo_soporte', a.p_hilo_id);
        if (!h || h.client_id !== a.p_client_id) falla('hilo_no_existe', [], 'P0002');
        var texto = txt(a.p_texto); if (!texto) falla('texto_vacio', [], '22023');
        inserta(F, 'mensajes_comprador', [{ hilo_id: h.id, client_id: h.client_id, de: 'comprador', autor: null, texto: texto }]);
        actualiza(F, 'hilo_soporte', [h], { estado: 'abierto', actualizado_en: ahora() });   // como en la base: el comprador lo reabre
        return null;
      },
      portal_guarda_prefs: function (F, a) {
        var cli = porId(F, 'clients', a.p_client_id); if (!cli) falla('cliente_no_existe', [], 'P0002');
        var p = Object.assign({}, cli.portal_prefs || {});
        if ('p_pref_email' in a) p.pref_email = !!a.p_pref_email;
        if ('p_pref_sms' in a) p.pref_sms = !!a.p_pref_sms;
        if ('p_color' in a) { if (['petroleo', 'selva', 'oliva', 'arena', 'oceano', 'ciruela', 'tinta', 'carbon'].indexOf(a.p_color) === -1) falla('color_no_valido', [], '22023'); p.color_avatar = a.p_color; }
        if (a.p_visto) p.notif_visto_hasta = ahora();
        actualiza(F, 'clients', [cli], { portal_prefs: p });
        return null;
      }
    };
  })();

  /* Candado (Seguridad, revisión previa 11-oct): de esta página no sale NADA que no sea GET o HEAD, tampoco al propio
     dominio (el doble de QA solo cerraba los hosts de Supabase). Va antes que el doble: su `fetchReal` es este. */
  window.LW_DEMO_CANDADO = function () {
    if (typeof window.fetch === 'function') {
      var f0 = window.fetch;
      window.fetch = function (input, init) {
        var m = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        if (m !== 'GET' && m !== 'HEAD') return Promise.reject(new TypeError(TEXTOS.solo_get));
        return f0.apply(this, arguments);
      };
    }
    if (typeof XMLHttpRequest !== 'undefined' && XMLHttpRequest.prototype) {
      var open0 = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method) {
        var m = String(method || 'GET').toUpperCase();
        if (m !== 'GET' && m !== 'HEAD') throw new TypeError(TEXTOS.solo_get);
        return open0.apply(this, arguments);
      };
    }
    if (typeof navigator !== 'undefined' && navigator && typeof navigator.sendBeacon === 'function') {
      try { navigator.sendBeacon = function () { return false; }; } catch (e) { /* solo lectura en algún navegador: CSP connect-src 'self' sigue cerrando */ }
    }
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('submit', function (ev) {
        var fm = ev.target, m = String((fm && fm.getAttribute && fm.getAttribute('method')) || 'get').toLowerCase();
        if (m !== 'get') { ev.preventDefault(); avisa('solo_get'); }
      }, true);
    }
  };
  if (typeof window.fetch === 'function' || typeof XMLHttpRequest !== 'undefined') window.LW_DEMO_CANDADO();

  /* Limpieza final: lo que la demo no resiembra (tablas de QA menores) deja de
     llamarse «QA» y de apuntar a @axisworks.test, y (11-oct, marca blanca) deja de nombrar al cliente del que vienen
     las fixtures: sus proyectos, campañas, sociedades y referencias internas pasan a los nombres inventados de la demo.
     Lo comprueba test_base_falsa.py sobre las tablas sembradas. */
  var MARCA_BLANCA = [
    [/\bqa\.([a-z0-9._-]+)@/gi, '$1@'], [/qa-accion-/g, 'accion-'], [/meta-lawang-/gi, 'meta-'], [/Lawang · /g, 'Main · '],
    [/meta-sumbahills/gi, 'meta-batu-ridge'], [/sumba-?hills/gi, 'batu-ridge'], [/Sumba Hills/g, 'Batu Ridge'], [/\bSumba\b/g, 'Batu Ridge'],
    [/Palm ?Field/gi, 'Cemara Estate'], [/\bLAW-(\d+)/g, 'REF-$1'], [/Tepi Sun ?Gai|San Dal Woods|Sandal ?Woods/gi, 'AxisWorks Demo'],
    [/\b(tepi_sungai|san_dal_woods)\b/g, 'axw_demo'], [/\bLawang\b/gi, 'AxisWorks Demo']
  ];
  window.LW_DEMO_LIMPIA = function (F) {
    function limpia(v) {
      if (typeof v === 'string') {
        v = v.replace(/qa@axisworks\.test/g, 'direccion' + DOMINIO).replace(/@axisworks\.test/g, DOMINIO)
          .replace(/\bQA\b:?\s*/g, '').replace(/-QA\b/g, '').replace(/\(QA\)/g, '');
        MARCA_BLANCA.forEach(function (x) { v = v.replace(x[0], x[1]); });
        return v;
      }
      if (Array.isArray(v)) return v.map(limpia);
      if (v && typeof v === 'object') { Object.keys(v).forEach(function (k) { v[k] = limpia(v[k]); }); return v; }
      return v;
    }
    Object.keys(F).forEach(function (t) { if (F[t] && F[t].data) F[t].data = limpia(F[t].data); });
  };
})();
