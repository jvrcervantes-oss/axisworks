/* Catálogo de módulos de AxisWorks ERP — FUENTE ÚNICA de la demo. 24-sep-2026.
   Lo leen la landing (tarjetas y packs), cada pantalla de la demo (menú y aviso de módulo apagado,
   modulos_demo.js) y el tour (se salta los pasos de módulos apagados). Antes la landing tenía su lista y
   la demo habría necesitado otra: dos listas a mano se separan solas (Regla 0 de contexto/suite_lawang.md).
   Estado de lo marcado: localStorage (misma clave en las tres), con try/catch. Sin almacenamiento, todo
   encendido. La base (m[7] = 1) está siempre encendida. */
(function () {
  /* [clave, nombre, área, etiquetas, descripción, capacidades, url, base]. Solo capacidades vistas en la v4. */
  /* Secciones = las del menú de la intranet (MENU_V4 de nav.js): el catálogo se lee igual que el ERP por dentro
     (owner, 27-sep: «agrupa por secciones»). El orden de aquí es el de la landing y el de los códigos. */
  var SECCIONES = ['Sales pipeline', 'Documents', 'Finance', 'Communication', 'Database', 'Control panel'];
  /* Textos en inglés (owner, 28-sep: «hazla en inglés»): la demo pública es en inglés. Las claves (m[0]) no cambian;
     SECCIONES sí es el valor que se enseña y la clave de PREF (aquí) y de ICONO_SECCION (landing.html): van juntas. */
  var MODULOS = [
    ['home', 'Daily dashboard', 'Sales pipeline', ['Included'], 'Everything waiting on someone today, with a link to the screen that settles it.',
      ['Reservations expiring in one or two days', 'Invoices with an outstanding balance', 'Pending signatures and critical due dates'], '/home/', 1],
    ['crm', 'Lead CRM', 'Sales pipeline', ['Meta Ads', 'Funnel'], 'Leads come in on their own, and each one has a dated next step.',
      ['Configurable stage funnel', '"For today" inbox with overdue leads in red', 'Closing calendar, lead assignment and closer ranking'], '/clasico/leads/'],
    ['setter', 'AI setter on WhatsApp', 'Sales pipeline', ['WhatsApp', 'AI'], 'An assistant that answers the lead on WhatsApp and qualifies them.',
      ['Conversation from the first message', 'Lead handed over ready for the sales rep'], '/clasico/leads/'],
    ['campanas', 'Campaign autopilot', 'Sales pipeline', ['Meta Ads', 'Automatic'], 'Watches the campaigns and moves budget within the cap set by management.',
      ['Pauses what brings no leads', 'Every decision logged with its reason'], '/clasico/leads/'],
    ['operaciones', 'Deals', 'Sales pipeline', ['Sales chain'], 'One row per sale, with all its contracts together.',
      ['Agreed, collected and outstanding amounts', 'Filters by signature and by payment', 'Full deal record'], '/operaciones/'],
    ['reservas', 'Reservations', 'Sales pipeline', ['Deadlines'], 'Reservations about to expire, and the move to a plot hold in time.',
      ['Extensions on record', 'Alert before they lapse'], '/reservas/'],

    ['contratos', 'Contracts', 'Documents', ['3 languages', 'E-signature'], 'Contract generator with version history.',
      ['Spanish, English and Indonesian', 'E-signature links that expire', 'Status per signer'], '/contratos/'],
    ['asistente', 'Reply assistant', 'Documents', ['AI'], 'Drafts the reply to a client, quoting only that client\'s own contract.',
      ['The team reviews it before sending', 'Anything the contract does not cover is flagged as pending'], '/asistente-correos/'],
    ['creatividades', 'Creatives and brochures', 'Documents', ['Marketing'], 'Social media assets and sales brochures for each project.',
      ['Per project', 'The sales team downloads only what is approved'], '/creatividades/'],
    ['portal', 'Buyer portal', 'Documents', ['Own login'], 'Each buyer sees their contracts, payments, invoices and construction progress.',
      ['Access by link, no password to remember'], null],

    ['finanzas', 'Finance dashboard', 'Finance', ['Management'], 'The company\'s money on one screen, for management.',
      ['What has been collected, what is signed but unpaid, and when it falls due', 'What is invoiced but unpaid, and what is left to sell'], '/finanzas/'],
    ['vencimientos', 'Due dates', 'Finance', ['Milestones'], 'Payment schedule by milestone for each contract.',
      ['What is due, what is overdue and what has no date', 'Filter by company and currency'], '/vencimientos/'],
    ['facturas', 'Invoicing', 'Finance', ['Multi-currency', 'Multi-company'], 'Invoices and pro formas linked to the contract they come from.',
      ['By issuing company', 'Euros and rupiah', 'Payment status of every invoice'], '/facturas/'],
    ['recibos', 'Payments and receipts', 'Finance', ['Proof of payment'], 'Every payment with its proof, applied to the invoices it settles.',
      ['One receipt can settle several invoices', 'Alert on receipts with no proof attached'], '/recibos/'],
    ['productos', 'Products', 'Finance', ['New', 'Taxes'], 'The catalogue of products and services invoiced by line.',
      ['Reference, unit price and default tax', 'A product is never deleted: it is deactivated'], '/productos/'],
    ['comisiones', 'Commissions', 'Finance', ['Teams', 'Automatic'], 'What each sales rep is owed, generated from the sale.',
      ['Tiered terms and teams', 'Approve and mark as paid', 'Split between closers'], '/comisiones/'],
    ['comisionadmin', 'Management fee', 'Finance', ['Manager'], 'Rates and settlement of the management company\'s fee per project.',
      ['Lines per project'], '/comision-admin/'],
    ['gastos', 'Expenses and suppliers', 'Finance', ['Suppliers'], 'What the company pays, with its proof.',
      ['Supplier invoices by company, project and category', 'Supplier withholdings still to be paid over'], '/gastos/'],
    ['bancos', 'Banking and reconciliation', 'Finance', ['Statements'], 'Every bank transaction linked to what explains it.',
      ['Statements for each company\'s accounts', 'Each line matched to a receipt, an expense, a commission or a transfer'], '/bancos/'],
    ['cuentas', 'Bank accounts', 'Finance', ['Banks'], 'Which account appears on each contract and invoice.',
      ['By project and by company'], '/cuentas/'],
    ['sociedades', 'Issuing companies', 'Finance', ['Multi-company'], 'Several group companies in the same ERP.',
      ['Tax details and logo per company'], '/sociedades/'],

    ['comunicacion', 'Announcements', 'Communication', ['Mailings'], 'Notices to every buyer in a project, or only to some.',
      ['Log of every mailing'], '/comunicacion/'],
    ['soporte', 'Customer support', 'Communication', ['Tickets'], 'Client questions by category, with their history.',
      ['Open or resolved', 'Conversation inside the client record'], '/soporte/'],
    ['peticiones', 'Requests to management', 'Communication', ['New', 'AI'], 'Whatever the intranet does not allow (changing a record, voiding an invoice…) is requested here, and management approves it.',
      ['The assistant understands the request and gets it ready to approve', 'Bell notification when it is approved or rejected'], '/asistente/'],

    ['proyectos', 'Projects and plots', 'Database', ['Inventory', 'CSV'], 'Each development with its plots, prices and status, plus the company\'s documents.',
      ['Available, reserved, on hold or sold', 'CSV import', 'Links, FAQs and company files'], '/proyectos/'],
    ['modelos', 'Model catalogue', 'Database', ['Catalogue'], 'House models with roof options, extras and documents.',
      ['Construction price per model', 'Floor plans and attached documents'], '/modelos/'],
    ['obra', 'Construction tracking', 'Database', ['Handovers'], 'Stage of each unit, handover date and photos.',
      ['Upcoming handovers', 'Work reports'], '/obra/'],
    ['compradores', 'Clients', 'Database', ['KYC'], 'Directory of buyers and investors with their documents.',
      ['KYC status', 'All their deals on their record'], '/compradores/'],

    ['usuarios', 'Team and permissions', 'Control panel', ['Included', 'Roles'], 'Who logs in and what each person sees.',
      ['Management, administration, sales manager and agent roles', 'Tools and projects per person'], '/usuarios/', 1],
    ['ajustes', 'Settings', 'Control panel', ['Included'], 'Company and intranet settings.',
      ['Taxes per company', 'Maintenance mode', 'Intranet in English or Spanish'], '/ajustes/', 1]
  ];
  var CAMINO = [
    ['contabilidad', 'Accounting', 'Journal entries generated from the ERP\'s invoices and payments, a chart of accounts per company and export for your accountant. It will ship inside the Finance pack.'],
    ['radar', 'Collections radar', 'Learns how each buyer pays and warns before a milestone slips, with the reminder already drafted.'],
    ['dataroom', 'Investor data room', 'Project documents for investors, watermarked per person, with a log of who opened what.'],
    ['postventa', 'After-sales and warranties', 'Issues after handover: who reports them, which contractor fixes them and which warranty covers them.']
  ];

  /* Rutas de la demo que son de cada módulo (prefijo de ruta). Un módulo apagado oculta sus enlaces del menú
     y, si se entra por URL, enseña el aviso con «activarlo». (El dashboard financiero, que estuvo «en camino»,
     es desde el 25-sep el módulo `finanzas`.) */
  var RUTAS = {
    home: ['/home/'], usuarios: ['/usuarios/'], ajustes: ['/ajustes/'],
    crm: ['/clasico/leads/', '/leads/'], operaciones: ['/operaciones/'], reservas: ['/reservas/'],
    compradores: ['/compradores/'],
    comisiones: ['/comisiones/', '/condiciones/', '/equipos-venta/', '/reparto/'],
    contratos: ['/contratos/', '/generador-contratos/', '/contracts/'],
    asistente: ['/asistente-correos/'], peticiones: ['/asistente/'], soporte: ['/soporte/'], comunicacion: ['/comunicacion/'],
    portal: ['/contratos-inversor/', '/portal/'],
    facturas: ['/facturas/'], productos: ['/productos/'], recibos: ['/recibos/'], vencimientos: ['/vencimientos/'],
    cuentas: ['/cuentas/'], sociedades: ['/sociedades/'], comisionadmin: ['/comision-admin/'],
    proyectos: ['/proyectos/', '/proyectos-cuentas/', '/documentacion/'],
    modelos: ['/modelos/'], obra: ['/obra/'],
    creatividades: ['/clasico/creatividades/', '/creatividades/', '/clasico/dossier/'],
    finanzas: ['/finanzas/'], bancos: ['/bancos/'], gastos: ['/gastos/']
  };
  /* Módulos que viven como pestaña dentro de otra pantalla (el CRM): se ocultan por el texto de la pestaña. */
  var PESTANAS = { setter: ['Setter IA', 'AI Setter', 'WhatsApp bot'], campanas: ['Campañas', 'Campaigns', 'Automatismos', 'Automations'] };   // ES y EN: la v4 cambia de idioma

  var CLAVE = 'demo-erp-modulos-v3';
  function leeEstado() {
    var e = {};
    try { e = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (x) { e = {}; }
    // Todo encendido de partida; y un módulo que no estaba en lo guardado (añadido al catálogo después, como
    // Finanzas, Bancos y Gastos el 25-sep) también: lo guardado siempre trae las claves apagadas en `false`.
    // Salvo para quien ya apagó su bloque: un módulo nuevo de un pack apagado nace apagado (si no, normalizaPacks
    // le reencendería el pack entero), y un suelto nuevo solo nace encendido si sus packs lo están.
    var guardado = Object.keys(e).length > 0;
    MODULOS.forEach(function (m) { if (!(m[0] in e)) e[m[0]] = !guardado || nuevoEncendido(e, m[0]); });
    MODULOS.forEach(function (m) { if (m[7]) e[m[0]] = true; });                    // la base no se apaga
    return e;
  }
  function nuevoEncendido(e, k) {
    var pk = PACK_DE[k];
    if (pk) return pack(pk)[3].some(function (x) { return x !== k && e[x]; });
    return (REQ_SUELTO[k] || []).every(function (c) { return pack(c)[3].every(function (x) { return !(x in e) || e[x]; }); });
  }
  function guardaEstado(e) { try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (x) {} }
  function moduloDeRuta(ruta) {
    for (var k in RUTAS) for (var n = 0; n < RUTAS[k].length; n++) if (ruta.indexOf(RUTAS[k][n]) === 0) return k;
    return null;
  }
  function nombre(k) {
    var todos = MODULOS.concat(CAMINO);
    for (var n = 0; n < todos.length; n++) if (todos[n][0] === k) return todos[n][1];
    return k;
  }
  /* Sin precios en la demo pública (owner, 27-sep: «quita todos los precios»): el precio es a medida y se da
     en el presupuesto. Aquí solo se cuenta lo encendido. */
  var IA = { setter: 1, campanas: 1, asistente: 1, peticiones: 1 };
  function recuento(e) {
    var r = { activos: 0, std: 0, ia: 0 };
    MODULOS.forEach(function (m) {
      if (!e[m[0]]) return;
      r.activos++;
      if (m[7]) return;
      if (IA[m[0]]) r.ia++; else r.std++;
    });
    return r;
  }
  /* Código corto por área (BAS-01, VEN-03…), el mismo en la landing y en el panel. */
  var PREF = { 'Sales pipeline': 'SEG', 'Documents': 'DOC', 'Finance': 'FIN', 'Communication': 'COM', 'Database': 'BDD', 'Control panel': 'PAN' };   // prefijos estables: no se traducen
  var CODIGO = {}, cuenta = {};
  MODULOS.forEach(function (m) { cuenta[m[2]] = (cuenta[m[2]] || 0) + 1; CODIGO[m[0]] = PREF[m[2]] + '-' + ('0' + cuenta[m[2]]).slice(-2); });
  CAMINO.forEach(function (m, i) { CODIGO[m[0]] = 'NEW-' + ('0' + (i + 1)).slice(-2); });
  /* ── PACKS (owner, 27-sep: «los módulos que dependen de otros van en pack sí o sí») ───────────────────────
     Salen del registro del ERP (erp/modulos.json → «depende»: qué lee el código de cada módulo), no de la
     intuición: los 13 que se necesitan entre sí son un solo bloque (Núcleo de venta); lo que depende de él va en
     un pack que lo requiere; SUELTO solo lo que no depende de nada más que la base. build.py:packs_casan() para el
     build si esto deja de casar con el registro. Se enciende o apaga cada pack ENTERO.
     [clave, nombre, descripción, módulos, packs que necesita] */
  var PACKS = [
    ['base', 'Base', 'What every company has: the day, the team and the settings.', ['home', 'usuarios', 'ajustes'], []],
    ['captacion', 'CRM and lead generation', 'Leads come in on their own and are worked from the CRM, with the WhatsApp setter and the campaign autopilot.', ['crm', 'setter', 'campanas'], ['base']],
    ['nucleo', 'Sales core', 'Clients, deals, contracts, invoices and payments, with the inventory being sold. They read from each other, so they come together.',
      ['compradores', 'operaciones', 'reservas', 'contratos', 'facturas', 'recibos', 'cuentas', 'comisiones', 'proyectos', 'modelos', 'obra', 'portal', 'soporte'], ['base']],
    ['finanzas', 'Finance', 'The company\'s money: collections calendar, management dashboard and expenses. Accounting will join this pack when it ships.', ['vencimientos', 'finanzas', 'gastos'], ['nucleo']],
    ['extras', 'Extras', 'AI assistants, marketing assets and the management fee, on top of the sales core.', ['asistente', 'peticiones', 'creatividades', 'comisionadmin'], ['nucleo']]
  ];
  // Sueltos: no dependen de ningún otro módulo (solo de la base). [módulo, packs que necesita]
  var SUELTOS = [
    ['comunicacion', ['base']], ['bancos', ['base']], ['productos', ['base']], ['sociedades', ['base']]
  ];
  var PACK_DE = {}, REQ_SUELTO = {};
  PACKS.forEach(function (p) { p[3].forEach(function (k) { PACK_DE[k] = p[0]; }); });
  SUELTOS.forEach(function (s) { REQ_SUELTO[s[0]] = s[1]; });
  function pack(clave) { for (var i = 0; i < PACKS.length; i++) if (PACKS[i][0] === clave) return PACKS[i]; return null; }
  function packActivo(e, clave) { var p = pack(clave); return !!p && p[3].every(function (k) { return !!e[k]; }); }
  /* Encender/apagar un pack o un suelto respetando los bloques. Devuelve la lista de nombres que se movieron de
     más (lo que necesitaba o lo que dependía), para poder decirlo en pantalla en vez de hacerlo en silencio. */
  function dependientesDe(clave) {   // packs y sueltos que necesitan este pack, directa o indirectamente
    var fuera = { packs: [], sueltos: [] }, cola = [clave], visto = {};
    while (cola.length) {
      var c = cola.shift();
      PACKS.forEach(function (p) { if (p[4].indexOf(c) !== -1 && !visto[p[0]]) { visto[p[0]] = 1; fuera.packs.push(p[0]); cola.push(p[0]); } });
      SUELTOS.forEach(function (s) { if (s[1].indexOf(c) !== -1 && fuera.sueltos.indexOf(s[0]) === -1) fuera.sueltos.push(s[0]); });
    }
    return fuera;
  }
  function necesita(claves) {   // todos los packs que hacen falta para estas claves de pack, recursivo
    var res = [], cola = claves.slice();
    while (cola.length) { var c = cola.shift(); if (res.indexOf(c) !== -1) continue; res.push(c); var p = pack(c); if (p) cola = cola.concat(p[4]); }
    return res;
  }
  function ponPack(e, clave, on) {
    var movidos = [];
    if (clave === 'base') return movidos;   // la base no se apaga
    if (on) {
      necesita([clave]).forEach(function (c) {
        if (!packActivo(e, c) && c !== clave) movidos.push(pack(c)[1]);
        pack(c)[3].forEach(function (k) { e[k] = true; });
      });
    } else {
      pack(clave)[3].forEach(function (k) { e[k] = false; });
      var d = dependientesDe(clave);
      d.packs.forEach(function (c) { if (packActivo(e, c)) movidos.push(pack(c)[1]); pack(c)[3].forEach(function (k) { e[k] = false; }); });
      d.sueltos.forEach(function (k) { if (e[k]) movidos.push(nombre(k)); e[k] = false; });
    }
    return movidos;
  }
  function ponSuelto(e, k, on) {
    var movidos = [];
    if (on) {
      necesita(REQ_SUELTO[k] || []).forEach(function (c) {
        if (!packActivo(e, c)) movidos.push(pack(c)[1]);
        pack(c)[3].forEach(function (x) { e[x] = true; });
      });
    }
    e[k] = !!on;
    return movidos;
  }
  /* Lo guardado antes de los packs puede traer un pack a medias: se completa (si tenía algo del pack, entero). */
  function normalizaPacks(e) {
    PACKS.forEach(function (p) { if (p[3].some(function (k) { return e[k]; })) ponPack(e, p[0], true); });
    SUELTOS.forEach(function (s) { if (e[s[0]]) ponSuelto(e, s[0], true); });
    return e;
  }

  /* ── La selección viaja en la URL (`sel=`) de la portada a la demo (AXW-70, 28-sep-2026) ─────────────────────
     La portada vive en erp.axisworks.studio y la demo en demo.axisworks.studio: el localStorage es de cada origen,
     así que lo marcado se pasa como lista de ids (packs encendidos, sueltos encendidos y «en camino» marcados).
     leeSel() es la ÚNICA puerta de entrada y no se cree nada de la URL (revisión previa #146, Seguridad): tope de
     longitud y de número, cada id tiene que existir en PACKS/MODULOS/CAMINO (búsqueda en las listas, nunca como
     clave de objeto: `__proto__` o `constructor` son ids desconocidos) y lo desconocido se descarta. Sin ningún id
     válido devuelve null y no se toca nada. Solo decide qué enseña la demo: nunca rol, guard ni módulo real. */
  var SEL_MAX_LARGO = 2048;
  function enLista(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i][0] === id) return true; return false; }
  function codificaSel(e) {
    var ids = [];
    PACKS.forEach(function (p) { if (packActivo(e, p[0])) ids.push(p[0]); });
    SUELTOS.forEach(function (s) { if (e[s[0]]) ids.push(s[0]); });
    CAMINO.forEach(function (c) { if (e[c[0]]) ids.push(c[0]); });
    return ids.join(',');
  }
  function leeSel(crudo) {
    if (typeof crudo !== 'string' || !crudo || crudo.length > SEL_MAX_LARGO) return null;
    var ids = crudo.split(',');
    if (ids.length > MODULOS.length) return null;
    var e = {}, alguno = false;
    MODULOS.forEach(function (m) { e[m[0]] = false; });   // todas las claves: leeEstado() rellena las que faltan a su manera
    CAMINO.forEach(function (c) { e[c[0]] = false; });
    ids.forEach(function (id) {
      if (!/^[a-z]{1,24}$/.test(id)) return;
      if (enLista(PACKS, id)) { ponPack(e, id, true); alguno = true; }   // antes que MODULOS: `finanzas` es pack y módulo
      else if (enLista(MODULOS, id)) { if (PACK_DE[id]) ponPack(e, PACK_DE[id], true); else ponSuelto(e, id, true); alguno = true; }
      else if (enLista(CAMINO, id)) { e[id] = true; alguno = true; }
    });
    if (!alguno) return null;
    MODULOS.forEach(function (m) { if (m[7]) e[m[0]] = true; });   // la base no se apaga
    return e;
  }

  window.AXW_CATALOGO = { SECCIONES: SECCIONES, MODULOS: MODULOS, CAMINO: CAMINO, RUTAS: RUTAS, PESTANAS: PESTANAS,
    leeEstado: function () { return normalizaPacks(leeEstado()); }, guardaEstado: guardaEstado, moduloDeRuta: moduloDeRuta, nombre: nombre,
    IA: IA, recuento: recuento, CODIGO: CODIGO,
    PACKS: PACKS, SUELTOS: SUELTOS, PACK_DE: PACK_DE, REQ_SUELTO: REQ_SUELTO, pack: pack, packActivo: packActivo,
    ponPack: ponPack, ponSuelto: ponSuelto, dependientesDe: dependientesDe,
    codificaSel: codificaSel, leeSel: leeSel, SEL_MAX_LARGO: SEL_MAX_LARGO };
})();
