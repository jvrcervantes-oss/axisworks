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
  var SECCIONES = ['Seguimiento', 'Documentación', 'Finanzas', 'Comunicación', 'Base de datos', 'Panel de control'];
  var MODULOS = [
    ['home', 'Panel del día', 'Seguimiento', ['Incluido'], 'Lo que está esperando a alguien hoy, con enlace a la pantalla que lo resuelve.',
      ['Reservas que vencen en uno o dos días', 'Facturas con saldo pendiente', 'Firmas pendientes y vencimientos críticos'], '/intranet/v4/home/', 1],
    ['crm', 'CRM de leads', 'Seguimiento', ['Meta Ads', 'Embudo'], 'Los leads entran solos y cada uno tiene su próximo paso con fecha.',
      ['Embudo por etapas configurable', 'Bandeja «para hoy» con los retrasos en rojo', 'Agenda de cierre, reparto de leads y ranking de closers'], '/intranet/leads/'],
    ['setter', 'Setter IA en WhatsApp', 'Seguimiento', ['WhatsApp', 'IA'], 'Un asistente que atiende al lead por WhatsApp y lo cualifica.',
      ['Conversación desde el primer mensaje', 'Lead listo para el comercial'], '/intranet/leads/'],
    ['campanas', 'Piloto de campañas', 'Seguimiento', ['Meta Ads', 'Automático'], 'Vigila las campañas y mueve presupuesto dentro del tope de dirección.',
      ['Pausa lo que no trae leads', 'Registro de cada decisión con su motivo'], '/intranet/leads/'],
    ['operaciones', 'Operaciones', 'Seguimiento', ['Cadena de venta'], 'Una fila por venta: reserva, bloqueo y construcción del mismo comprador, juntos.',
      ['Precio pactado, cobrado y pendiente', 'Filtros por firma y por cobro', 'Ficha completa de la venta'], '/intranet/v4/operaciones/'],
    ['reservas', 'Reservas', 'Seguimiento', ['Plazos'], 'Reservas que vencen y el paso a bloqueo de parcela a tiempo.',
      ['Prórrogas registradas', 'Aviso antes de que caduquen'], '/intranet/v4/reservas/'],

    ['contratos', 'Contratos', 'Documentación', ['3 idiomas', 'Firma electrónica'], 'Generador de contratos con registro de versiones.',
      ['Español, inglés e indonesio', 'Firma electrónica con caducidad', 'Estado por firmante'], '/intranet/v4/contratos/'],
    ['asistente', 'Asistente de respuestas', 'Documentación', ['IA'], 'Redacta la respuesta a un cliente citando solo su propio contrato.',
      ['El equipo la revisa antes de enviarla', 'Lo que el contrato no dice lo marca como pendiente'], '/intranet/v4/asistente-correos/'],
    ['creatividades', 'Creatividades y dossiers', 'Documentación', ['Marketing'], 'Piezas para redes y dossiers de venta de cada proyecto.',
      ['Por proyecto', 'El equipo comercial descarga solo lo aprobado'], '/intranet/v4/creatividades/'],
    ['portal', 'Portal del comprador', 'Documentación', ['Acceso propio'], 'Cada comprador ve sus contratos, pagos, facturas y obra.',
      ['Acceso por enlace, sin contraseña que recordar'], null],

    ['finanzas', 'Panel financiero', 'Finanzas', ['Dirección'], 'El dinero de la empresa en una pantalla, para dirección.',
      ['Lo cobrado, lo firmado pendiente y cuándo toca cobrarlo', 'Lo facturado sin cobrar y lo que queda por vender'], '/intranet/v4/finanzas/'],
    ['vencimientos', 'Vencimientos', 'Finanzas', ['Hitos'], 'Calendario de pagos por hitos de cada contrato.',
      ['Qué vence, qué está vencido y qué no tiene fecha', 'Filtro por sociedad y moneda'], '/intranet/v4/vencimientos/'],
    ['facturas', 'Facturación', 'Finanzas', ['Multimoneda', 'Multi-sociedad'], 'Facturas y proformas enlazadas al contrato que las origina.',
      ['Por sociedad emisora', 'Euros y rupias', 'Estado de cobro de cada factura'], '/intranet/v4/facturas/'],
    ['recibos', 'Cobros y recibís', 'Finanzas', ['Justificantes'], 'Cada cobro con su justificante, aplicado a las facturas que salda.',
      ['Un recibí puede saldar varias facturas', 'Aviso de recibís sin justificante'], '/intranet/v4/recibos/'],
    ['productos', 'Productos', 'Finanzas', ['Nuevo', 'Impuestos'], 'El catálogo de productos y servicios que se facturan por líneas.',
      ['Referencia, precio por unidad e impuesto por defecto', 'Un producto no se borra: se desactiva'], '/intranet/v4/productos/'],
    ['comisiones', 'Comisiones', 'Finanzas', ['Equipos', 'Automático'], 'Lo que se debe a cada comercial, generado desde la venta.',
      ['Condiciones por tramo y equipos', 'Aprobar y marcar como pagada', 'Reparto a closers'], '/intranet/v4/comisiones/'],
    ['comisionadmin', 'Comisión de administración', 'Finanzas', ['Gestora'], 'Tarifas y liquidación de la comisión de la gestora por proyecto.',
      ['Líneas por proyecto'], '/intranet/v4/comision-admin/'],
    ['gastos', 'Gastos y proveedores', 'Finanzas', ['Proveedores'], 'Lo que paga la empresa, con su justificante.',
      ['Factura de proveedor por sociedad, proyecto y categoría', 'Retenciones a proveedores pendientes de ingresar'], '/intranet/v4/gastos/'],
    ['bancos', 'Bancos y conciliación', 'Finanzas', ['Extractos'], 'Cada movimiento del banco enlazado con lo que lo explica.',
      ['Extractos de las cuentas de cada sociedad', 'Cada línea casada con un recibí, un gasto, una comisión o un traspaso'], '/intranet/v4/bancos/'],
    ['cuentas', 'Cuentas bancarias', 'Finanzas', ['Bancos'], 'Qué cuenta aparece en cada contrato y factura.',
      ['Por proyecto y por sociedad'], '/intranet/v4/cuentas/'],
    ['sociedades', 'Sociedades emisoras', 'Finanzas', ['Multi-sociedad'], 'Varias empresas del grupo en el mismo ERP.',
      ['Datos fiscales y logo por sociedad'], '/intranet/v4/sociedades/'],

    ['comunicacion', 'Comunicados', 'Comunicación', ['Envíos'], 'Avisos a todos los compradores de un proyecto o solo a algunos.',
      ['Registro de cada envío'], '/intranet/v4/comunicacion/'],
    ['soporte', 'Soporte al cliente', 'Comunicación', ['Tickets'], 'Consultas de clientes por categoría, con su historial.',
      ['Abierto o resuelto', 'Conversación dentro de la ficha'], '/intranet/v4/soporte/'],
    ['peticiones', 'Peticiones a dirección', 'Comunicación', ['Nuevo', 'IA'], 'Lo que la intranet no deja hacer (cambiar un dato, anular una factura…) se pide aquí y dirección lo aprueba.',
      ['El asistente entiende la petición y la deja lista para aprobar', 'Aviso en la campana al aprobarla o rechazarla'], '/intranet/v4/asistente/'],

    ['proyectos', 'Proyectos y parcelario', 'Base de datos', ['Inventario', 'CSV'], 'Cada promoción con sus parcelas, precios y estado, y la documentación de la empresa.',
      ['Libre, reservada, bloqueada o vendida', 'Importación desde CSV', 'Enlaces, preguntas frecuentes y ficheros de la empresa'], '/intranet/v4/proyectos/'],
    ['modelos', 'Catálogo de modelos', 'Base de datos', ['Catálogo'], 'Modelos de vivienda con techos, extras y documentos.',
      ['Precio de construcción por modelo', 'Planos y documentos adjuntos'], '/intranet/v4/modelos/'],
    ['obra', 'Control de obra', 'Base de datos', ['Entregas'], 'Fase de cada unidad, fecha de entrega y fotos.',
      ['Próximas entregas', 'Partes de trabajo'], '/intranet/v4/obra/'],
    ['compradores', 'Clientes', 'Base de datos', ['KYC'], 'Directorio de compradores e inversores con sus documentos.',
      ['Estado de KYC', 'Todas sus operaciones en su ficha'], '/intranet/v4/compradores/'],

    ['usuarios', 'Equipo y permisos', 'Panel de control', ['Incluido', 'Roles'], 'Quién entra y qué ve cada persona.',
      ['Roles de dirección, administración, jefe de ventas y agente', 'Herramientas y proyectos por persona'], '/intranet/v4/usuarios/', 1],
    ['ajustes', 'Ajustes', 'Panel de control', ['Incluido'], 'Parámetros de la empresa y de la intranet.',
      ['Impuestos por sociedad', 'Modo mantenimiento', 'Intranet en español o inglés'], '/intranet/v4/ajustes/', 1]
  ];
  var CAMINO = [
    ['contabilidad', 'Contabilidad', 'Asientos generados desde las facturas y los cobros del ERP, plan de cuentas por sociedad y exportación para la gestoría. Llegará dentro del pack Finanzas.'],
    ['radar', 'Radar de cobros', 'Aprende cómo paga cada comprador y avisa antes de que un hito se retrase, con el recordatorio ya redactado.'],
    ['dataroom', 'Sala de datos del inversor', 'Documentación de cada proyecto para inversores, con marca de agua por persona y registro de quién abre qué.'],
    ['postventa', 'Postventa y garantías', 'Incidencias después de la entrega: quién las abre, qué contratista las arregla y en qué garantía caen.']
  ];

  /* Rutas de la demo que son de cada módulo (prefijo de ruta). Un módulo apagado oculta sus enlaces del menú
     y, si se entra por URL, enseña el aviso con «activarlo». (El dashboard financiero, que estuvo «en camino»,
     es desde el 25-sep el módulo `finanzas`.) */
  var RUTAS = {
    home: ['/intranet/v4/home/'], usuarios: ['/intranet/v4/usuarios/'], ajustes: ['/intranet/v4/ajustes/'],
    crm: ['/intranet/leads/', '/intranet/v4/leads/'], operaciones: ['/intranet/v4/operaciones/'], reservas: ['/intranet/v4/reservas/'],
    compradores: ['/intranet/v4/compradores/'],
    comisiones: ['/intranet/v4/comisiones/', '/intranet/v4/condiciones/', '/intranet/v4/equipos-venta/', '/intranet/v4/reparto/'],
    contratos: ['/intranet/v4/contratos/', '/intranet/v4/generador-contratos/', '/contracts/'],
    asistente: ['/intranet/v4/asistente-correos/'], peticiones: ['/intranet/v4/asistente/'], soporte: ['/intranet/v4/soporte/'], comunicacion: ['/intranet/v4/comunicacion/'],
    portal: ['/intranet/v4/contratos-inversor/', '/portal/'],
    facturas: ['/intranet/v4/facturas/'], productos: ['/intranet/v4/productos/'], recibos: ['/intranet/v4/recibos/'], vencimientos: ['/intranet/v4/vencimientos/'],
    cuentas: ['/intranet/v4/cuentas/'], sociedades: ['/intranet/v4/sociedades/'], comisionadmin: ['/intranet/v4/comision-admin/'],
    proyectos: ['/intranet/v4/proyectos/', '/intranet/v4/proyectos-cuentas/', '/intranet/v4/documentacion/'],
    modelos: ['/intranet/v4/modelos/'], obra: ['/intranet/v4/obra/'],
    creatividades: ['/intranet/creatividades/', '/intranet/v4/creatividades/', '/intranet/dossier/'],
    finanzas: ['/intranet/v4/finanzas/'], bancos: ['/intranet/v4/bancos/'], gastos: ['/intranet/v4/gastos/']
  };
  /* Módulos que viven como pestaña dentro de otra pantalla (el CRM): se ocultan por el texto de la pestaña. */
  var PESTANAS = { setter: ['Setter IA', 'WhatsApp bot'], campanas: ['Campañas', 'Automatismos'] };

  var CLAVE = 'demo-erp-modulos-v3';
  function leeEstado() {
    var e = {};
    try { e = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (x) { e = {}; }
    // Todo encendido de partida; y un módulo que no estaba en lo guardado (añadido al catálogo después, como
    // Finanzas, Bancos y Gastos el 25-sep) también: lo guardado siempre trae las claves apagadas en `false`.
    MODULOS.forEach(function (m) { if (!(m[0] in e)) e[m[0]] = true; });
    MODULOS.forEach(function (m) { if (m[7]) e[m[0]] = true; });                    // la base no se apaga
    return e;
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
  var PREF = { 'Seguimiento': 'SEG', 'Documentación': 'DOC', 'Finanzas': 'FIN', 'Comunicación': 'COM', 'Base de datos': 'BDD', 'Panel de control': 'PAN' };
  var CODIGO = {}, cuenta = {};
  MODULOS.forEach(function (m) { cuenta[m[2]] = (cuenta[m[2]] || 0) + 1; CODIGO[m[0]] = PREF[m[2]] + '-' + ('0' + cuenta[m[2]]).slice(-2); });
  CAMINO.forEach(function (m, i) { CODIGO[m[0]] = 'NEW-' + ('0' + (i + 1)).slice(-2); });
  /* ── PACKS (owner, 25-sep: «hay herramientas que deben ir en bloques») ─────────────────────────────────────
     Un pack es un bloque de módulos que solo funcionan juntos: facturas sin recibís no saben qué está cobrado;
     el parcelario sin contratos no sabe qué está vendido. Se enciende o apaga ENTERO. Lo que es opcional de
     verdad va como módulo SUELTO, con lo que necesita debajo. Las dependencias salen de las auditorías de Datos
     y Desarrollo del 25-sep (qué tablas y pantallas lee cada módulo).
     [clave, nombre, descripción, módulos, packs que necesita] */
  var PACKS = [
    ['base', 'Base', 'Lo que tiene cualquier empresa: el día, el equipo y los ajustes.', ['home', 'usuarios', 'ajustes'], []],
    ['ventas', 'Ventas y CRM', 'Del lead a la venta cerrada, con cada cliente y su operación.', ['crm', 'operaciones', 'compradores'], ['base']],
    ['facturacion', 'Facturación y cobros', 'Facturas, recibís y calendario de cobros, por sociedad y cuenta.', ['facturas', 'recibos', 'productos', 'vencimientos', 'cuentas', 'sociedades'], ['ventas']],
    ['finanzas', 'Finanzas', 'El dinero de la empresa: panel de dirección, bancos y gastos. La contabilidad, cuando llegue, entra en este pack.', ['finanzas', 'bancos', 'gastos'], ['facturacion']],
    ['documentos', 'Contratos y documentos', 'Contratos con firma electrónica, soporte al cliente y comunicados.', ['contratos', 'soporte', 'comunicacion'], ['ventas']],
    ['inmobiliaria', 'Inmobiliaria', 'Para promotoras: parcelario, reservas de parcela, modelos de vivienda y obra.', ['proyectos', 'reservas', 'modelos', 'obra'], ['documentos', 'facturacion']]
  ];
  // Sueltos: se añaden uno a uno. [módulo, packs que necesita]
  var SUELTOS = [
    ['setter', ['ventas']], ['campanas', ['ventas']], ['asistente', ['documentos']], ['comisiones', ['ventas', 'facturacion']],
    ['portal', ['documentos', 'facturacion']], ['peticiones', ['base']], ['creatividades', ['inmobiliaria']], ['comisionadmin', ['inmobiliaria', 'facturacion']]
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

  window.AXW_CATALOGO = { SECCIONES: SECCIONES, MODULOS: MODULOS, CAMINO: CAMINO, RUTAS: RUTAS, PESTANAS: PESTANAS,
    leeEstado: function () { return normalizaPacks(leeEstado()); }, guardaEstado: guardaEstado, moduloDeRuta: moduloDeRuta, nombre: nombre,
    IA: IA, recuento: recuento, CODIGO: CODIGO,
    PACKS: PACKS, SUELTOS: SUELTOS, PACK_DE: PACK_DE, REQ_SUELTO: REQ_SUELTO, pack: pack, packActivo: packActivo,
    ponPack: ponPack, ponSuelto: ponSuelto, dependientesDe: dependientesDe };
})();
