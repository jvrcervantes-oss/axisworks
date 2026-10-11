/* Cáscara de la demo para un cliente (12-oct-2026, encargo 20261011_demo_cliente_flujo_total, paquete C).
   Lo carga el guard de la demo en TODAS las pantallas. Dos cosas, ninguna con red:
   1. La barra flotante ÚNICA (antes «← Modules»): vuelta a la portada, «Reset demo» y el aviso fijo de datos ficticios
      (Seguridad, revisión previa: en todas las pantallas). Reset llama a LW_DEMO_RESTABLECE() del paquete A, que borra
      las claves «axw-demo:*» de sessionStorage y recarga.
   2. El asistente como conversación de EJEMPLO (owner, 11-oct: «muestra un ejemplo de lo que haría el asistente pero que
      no gaste»): guion fijo escrito aquí, rotulado en pantalla como ejemplo; no llama a ningún modelo ni servidor.
   Los textos visibles viven en TEXTOS (un solo sitio: la demo va en inglés, owner 12-oct). Todo se pinta con
   textContent: nada de lo que llega de la URL o de los datos entra como HTML. */
(function () {
  'use strict';
  var TEXTOS = {
    barra: 'Leave the demo',
    inicio: '← Start',
    reset: 'Reset demo',
    datos: 'Made-up data · don\'t enter real personal data',
    datosCorto: 'Sample data',
    asisTitulo: 'Assistant',
    asisRotulo: 'Example — in the demo the assistant is not connected. This is a fixed script of what it would do; nothing is sent anywhere.',
    asisCasos: 'Example conversations',
    asisTu: 'You',
    asisEl: 'Assistant',
    asisSiguiente: 'Show the answer',
  };
  // Guion fijo: lo que el asistente haría con los datos de la empresa. Datos inventados, ningún nombre de cliente real.
  var CASOS = [
    { titulo: 'Draft an email to a client',
      pide: 'Write to Laura Méndez: her second instalment is due on the 30th. Friendly tone, attach the invoice.',
      responde: ['Here is a draft. I have not sent it: you review it and send it from the client record.',
        'Subject: Your second instalment — due 30 October',
        'Hi Laura, I hope all is well. Just a reminder that the second instalment of your contract CT-0142 (EUR 18,500) is due on 30 October. You will find the invoice attached. If you have already made the transfer, please ignore this message. Kind regards, The AxisWorks Demo team',
        'Attached: Invoice INV-0218 (PDF).'] },
    { titulo: 'Summarise where a contract stands',
      pide: 'Where are we with contract CT-0137?',
      responde: ['Contract CT-0137 — Daniel Ortega, Villa 4.',
        '· Signed on 12 August. Total EUR 240,000.',
        '· Invoiced EUR 120,000 in two invoices; paid EUR 96,000. Pending EUR 24,000 on invoice INV-0204, due 15 October.',
        '· Next milestone: handover of the keys, planned for March.',
        'Do you want me to draft the payment reminder for INV-0204?'] },
    { titulo: 'What needs attention this week',
      pide: 'What should I look at this week?',
      responde: ['Three things:',
        '1. Two reservations expire in the next 48 hours (Villa 7 and Villa 9). Without a signed contract, the units go back on sale.',
        '2. Invoice INV-0204 is overdue by 3 days (EUR 24,000).',
        '3. A new client, Aiko Tanaka, has no contract yet: I can open a draft from the standard template.'] }
  ];

  function el(tag, estilo, texto) {
    var n = document.createElement(tag);
    if (estilo) n.style.cssText = estilo;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function restablece() {
    if (typeof window.LW_DEMO_RESTABLECE === 'function') { window.LW_DEMO_RESTABLECE(); return; }
    try {
      for (var i = sessionStorage.length - 1; i >= 0; i--) {
        var k = sessionStorage.key(i);
        if (k && k.indexOf('axw-demo:') === 0) sessionStorage.removeItem(k);
      }
    } catch (e) { /* MUDO A PROPOSITO: sin almacenamiento de pestaña la demo ya arranca limpia en cada carga */ }
    location.reload();
  }

  function barra() {
    if (document.querySelector('[data-demo="barra"]')) return;
    var estrecho = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
    var n = el('nav', 'position:fixed;left:12px;bottom:12px;z-index:2147483000;display:flex;align-items:center;'
      + 'background:#15181C;color:#F4F2EC;border-radius:999px;font:500 13px/1.2 system-ui,sans-serif;overflow:hidden;max-width:calc(100vw - 24px)');
    n.setAttribute('aria-label', TEXTOS.barra);
    n.setAttribute('data-demo', 'barra');
    var dato = el('span', 'display:flex;align-items:center;gap:8px;padding:9px 14px;white-space:nowrap', estrecho ? TEXTOS.datosCorto : TEXTOS.datos);
    dato.title = TEXTOS.datos;
    var punto = el('span', 'width:7px;height:7px;border-radius:999px;background:#E2581C;flex:none');
    dato.insertBefore(punto, dato.firstChild);
    n.appendChild(dato);
    var a = el('a', 'color:inherit;text-decoration:none;padding:9px 14px;border-left:1px solid rgba(244,242,236,.25);white-space:nowrap', TEXTOS.inicio);
    a.href = '/';
    n.appendChild(a);
    var b = el('button', 'color:inherit;background:none;border:0;border-left:1px solid rgba(244,242,236,.25);padding:9px 14px;font:inherit;cursor:pointer;white-space:nowrap', TEXTOS.reset);
    b.type = 'button';
    b.setAttribute('data-accion', 'demo-restablece');
    b.addEventListener('click', restablece);
    n.appendChild(b);
    document.body.appendChild(n);
    // Con el menú lateral fijo a la vista (288 px desde 1024), la barra va a su derecha: encima tapaba «Salir». Se recalcula
    // al cambiar el tamaño de la ventana.
    function coloca() {
      var menu = document.querySelector('aside.fixed');
      var r = menu && menu.getBoundingClientRect();
      n.style.left = (r && r.width > 0 && r.right > 0 && window.innerWidth >= 1024 ? Math.round(r.right) + 16 : 12) + 'px';
    }
    coloca();
    window.addEventListener('resize', coloca);
    // Con un editor, cajón o diálogo abierto la barra se aparta: a 390 px tapaba «Emitir» del editor de factura (medido el
    // 12-oct con elementFromPoint). Vuelve sola al cerrarlo.
    var ABIERTO = '#lw-editor,#lw-cajon,.lw-dlg-fondo.abierto,.axf-capa:not([hidden]),#lw-novedades';
    function aparta() {
      var tapa = document.querySelector(ABIERTO) || document.body.classList.contains('v4-nav-abierta');
      n.style.display = tapa ? 'none' : 'flex';
    }
    if (window.MutationObserver) {
      new MutationObserver(aparta).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    }
    aparta();
  }

  // ── Asistente de ejemplo ────────────────────────────────────────────────────────────────────────────────────────────
  function burbuja(quien, lineas, propio) {
    var caja = el('div', 'display:flex;flex-direction:column;gap:4px;max-width:46rem;' + (propio ? 'align-self:flex-end;text-align:left' : 'align-self:flex-start'));
    caja.appendChild(el('span', 'font:500 12px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#5F646A', quien));
    var cuerpo = el('div', 'padding:14px 16px;border-radius:14px;font:400 15px/1.55 system-ui,sans-serif;'
      + (propio ? 'background:#15181C;color:#F4F2EC' : 'background:#FAF9F6;color:#15181C;border:1px solid #D0D1D1'));
    lineas.forEach(function (l, i) { var p = el('p', 'margin:' + (i ? '8px' : '0') + ' 0 0', l); cuerpo.appendChild(p); });
    caja.appendChild(cuerpo);
    return caja;
  }

  function asistente() {
    var main = document.querySelector('main');
    if (!main || document.querySelector('[data-demo="asistente"]')) return;
    var sec = el('section', 'margin:0 0 32px;padding:28px;border:1px solid #D0D1D1;border-radius:16px;background:#F4F2EC;display:flex;flex-direction:column;gap:20px');
    sec.setAttribute('data-demo', 'asistente');
    sec.setAttribute('aria-label', TEXTOS.asisTitulo);
    sec.appendChild(el('h2', 'margin:0;font:500 28px/1.15 system-ui,sans-serif;color:#15181C', TEXTOS.asisTitulo));
    var rotulo = el('p', 'margin:0;padding:10px 14px;border-left:3px solid #E2581C;background:#15181C;color:#F4F2EC;font:400 13px/1.5 system-ui,sans-serif;align-self:flex-start;max-width:46rem', TEXTOS.asisRotulo);
    rotulo.setAttribute('data-demo', 'rotulo-ejemplo');
    sec.appendChild(rotulo);
    var pestanas = el('div', 'display:flex;flex-wrap:wrap;gap:8px');
    pestanas.setAttribute('role', 'tablist');
    pestanas.setAttribute('aria-label', TEXTOS.asisCasos);
    var hilo = el('div', 'display:flex;flex-direction:column;gap:16px;min-height:12rem');
    hilo.setAttribute('aria-live', 'polite');
    var botones = [];
    function abre(i) {
      botones.forEach(function (b, j) {
        b.setAttribute('aria-selected', j === i ? 'true' : 'false');
        b.style.background = j === i ? '#15181C' : 'transparent';
        b.style.color = j === i ? '#F4F2EC' : '#15181C';
      });
      while (hilo.firstChild) hilo.removeChild(hilo.firstChild);
      hilo.appendChild(burbuja(TEXTOS.asisTu, [CASOS[i].pide], true));
      var sigue = el('button', 'align-self:flex-start;font:500 14px/1 system-ui,sans-serif;padding:10px 16px;border-radius:999px;border:1px solid #15181C;background:transparent;color:#15181C;cursor:pointer;min-height:40px', TEXTOS.asisSiguiente);
      sigue.type = 'button';
      sigue.addEventListener('click', function () {
        hilo.removeChild(sigue);
        hilo.appendChild(burbuja(TEXTOS.asisEl, CASOS[i].responde, false));
      });
      hilo.appendChild(sigue);
    }
    CASOS.forEach(function (c, i) {
      var b = el('button', 'font:500 14px/1 system-ui,sans-serif;padding:10px 16px;border-radius:999px;border:1px solid #15181C;cursor:pointer;min-height:40px', c.titulo);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { abre(i); });
      botones.push(b);
      pestanas.appendChild(b);
    });
    sec.appendChild(pestanas);
    sec.appendChild(hilo);
    // La pantalla real (peticiones a un administrador) llama a una función del servidor que en la demo no existe y se
    // quedaba parada (mapa, 11-oct): se oculta, no se borra, para que su script siga encontrando sus nodos.
    // style y no el atributo hidden: las clases de la pantalla (.flex, .grid) ganan a [hidden].
    Array.prototype.forEach.call(main.children, function (h) { h.style.setProperty('display', 'none', 'important'); h.setAttribute('aria-hidden', 'true'); });
    main.insertBefore(sec, main.firstChild);
    abre(0);
  }

  function arranca() {
    barra();
    if (/^\/asistente\/?$/.test(location.pathname) || location.pathname === '/asistente/index.html') asistente();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arranca);
  else arranca();
})();
