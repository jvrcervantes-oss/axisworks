/* Tour guiado de la demo de AxisWorks ERP — 24-sep-2026.
   build.py lo copia a dist/demo/tour.js; lo cargan la landing y todas las pantallas de la demo
   (el guard de la demo lo inyecta). Recorre las pantallas en orden, con un foco que resalta lo que
   se explica y una tarjeta que lo cuenta.

   Movimiento «a lo Apple» (skill apple-design):
   - Foco y tarjeta se mueven con SPRINGS propios (amortiguamiento 1.0, respuesta 0.42 s): arrancan
     del valor que hay en pantalla y se pueden reorientar a mitad de camino (cambiar de paso deprisa,
     hacer scroll o redimensionar no produce saltos).
   - La tarjeta es un material translúcido (backdrop-filter) que se materializa: desenfoque, escala y
     opacidad llegan juntos, y sale por el mismo camino por el que entró.
   - El texto entra por líneas, escalonado. Los botones responden al pulsar (:active), no al soltar.
   - prefers-reduced-motion: fundidos cortos, sin springs ni escala. prefers-reduced-transparency:
     tarjeta opaca.

   Estado entre páginas: sessionStorage (clave `axt-tour`), con try/catch: sin almacenamiento, el tour
   funciona dentro de la página y no sigue al navegar. Nada sale de este navegador. */
(function () {
  if (window.__axtTour) return;
  window.__axtTour = true;

  var CLAVE = 'axt-tour';
  var REDUCIDO = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Guion ─────────────────────────────────────────────────────────────
     t: dónde apuntar (css | texto | caja, fila de tarjetas | panel lateral); null = centrado.
     click: se pulsa antes de enfocar (abre una ficha); se cierra al salir del paso. */
  /* Textos del tour en inglés (owner, 28-sep: la demo pública es en inglés). Los objetivos (texto/contiene) llevan
     la etiqueta en los DOS idiomas de la v4, [español, inglés]: el visitante puede cambiar el idioma con el
     interruptor y el foco tiene que seguir encontrando lo que explica. */
  var PASOS = [
    { p: '/', cap: 'Guided tour', t: null, hero: true,
      h: 'AxisWorks ERP in three minutes',
      b: 'A working day at a property developer, from the lead that comes in through Meta to the villa handed over. The data is made up. Move on with → or the buttons.' },
    { p: '/home/', cap: 'Home', t: { texto: ['CONTRATOS ACTIVOS', 'ACTIVE CONTRACTS'], fila: true },
      h: 'Every morning starts here',
      b: 'Active contracts, collected this month, due dates in the next thirty days and available plots. The figures come from the contracts and payments: nobody types them in.' },
    { p: '/home/', cap: 'Home', t: { texto: ['Hoy toca', 'Today'], caja: true },
      h: 'What is waiting on someone',
      b: 'Reservations about to lapse, signed invoices still unpaid, pending signatures. Each line takes you to the screen where it gets done.' },
    { p: '/home/', cap: 'Home', t: { css: 'aside' },
      h: 'One menu, every module',
      b: 'Each person sees only the tools assigned to them. An agent does not see the treasury; management sees everything.' },
    { p: '/clasico/leads/', cap: 'Sales pipeline', t: { texto: ['PARA HOY', 'FOR TODAY'], contiene: ['CON RETRASO', 'OVERDUE'] },
      h: 'Leads come in on their own',
      b: 'Meta lead forms land in the CRM with no copying. Each lead has a dated next step, and the ones nobody has touched for days show up in red.' },
    { p: '/clasico/leads/', cap: 'Sales pipeline', t: { texto: ['Pipeline'], contiene: ['Trazabilidad', 'Traceability'] },
      h: 'Funnel, campaigns and automations',
      b: 'The stage funnel, the cost of each lead per campaign, and the autopilot that pauses or raises Meta Ads budget, always within the cap set by management.' },
    { p: '/operaciones/', cap: 'Sales pipeline', t: { texto: ['PRECIO PACTADO', 'AGREED PRICE'], fila: true },
      h: 'One sale, one row',
      b: 'Plot hold, reservation letter and construction contract for the same buyer sit together. At the top: agreed, collected and outstanding across the whole portfolio.' },
    { p: '/operaciones/', cap: 'Sales pipeline', click: 'tbody tr[data-lw-id]', t: { panel: true },
      h: 'The whole sale in one record',
      b: 'Status, the contracts in the chain, the buyer with their KYC, and every invoice and receipt. The next document is issued from here.' },
    { p: '/contratos/', cap: 'Documents', t: { texto: ['FIRMADOS', 'SIGNED'], fila: true },
      h: 'Contracts in three languages',
      b: 'Generated in Spanish, English and Indonesian, and signed through an e-signature link that expires. Here: what is signed, the drafts and the committed volume.' },
    { p: '/facturas/', cap: 'Finance', t: { texto: ['FACTURADO ESTE MES', 'INVOICED THIS MONTH'], fila: true },
      h: 'Invoices that know if they are paid',
      b: 'Each invoice hangs from its contract and its issuing company, in euros or rupiah. Payment status is worked out from the receipts, not ticked by hand.' },
    { p: '/recibos/', cap: 'Finance', t: { texto: ['RECIBÍS EMITIDOS', 'RECEIPTS ISSUED'], fila: true },
      h: 'Every payment, with its proof',
      b: 'One receipt can settle several invoices. Receipts with no proof attached are flagged so nobody forgets them.' },
    { p: '/productos/', cap: 'Finance', t: { texto: ['Lo que se vende', 'What is sold'], caja: true },
      h: 'Products that carry their tax',
      b: 'The catalogue of what gets invoiced by line: reference, unit price and the tax the line comes with. A product is never deleted, it is deactivated.' },
    { p: '/vencimientos/', cap: 'Finance', t: { texto: ['VENCIMIENTOS CRÍTICOS', 'CRITICAL DUE DATES'], fila: true },
      h: 'Treasury by milestone',
      b: 'The payment schedule of each contract: what falls due in the next ninety days, what is overdue and what has no date yet.' },
    { p: '/reservas/', cap: 'Sales pipeline', t: { texto: ['VENCEN EN 2 DÍAS', 'EXPIRING IN 2 DAYS'], fila: true },
      h: 'No reservation lapses without warning',
      b: 'Reservations expiring in two days, this week or later, with their extensions. When one expires, the plot is released automatically.' },
    { p: '/comisiones/', cap: 'Finance', t: { texto: ['PENDIENTES DE RESOLVER', 'PENDING DECISION'], fila: true },
      h: 'Commissions that calculate themselves',
      b: 'Every sale generates the rep\'s commission and the team lead\'s, according to their terms. Management approves it and marks it as paid.' },
    { p: '/proyectos/', cap: 'Database', t: { texto: ['CARTERA CONSOLIDADA', 'CONSOLIDATED PORTFOLIO'], fila: true },
      h: 'A live plot map',
      b: 'Each development with its plots and their status: available, reserved, on hold or sold. The status changes by itself when a contract is signed or released.' },
    { p: '/obra/', cap: 'Database', t: { texto: ['PRÓXIMA ENTREGA', 'NEXT HANDOVER'], caja: true },
      h: 'Construction and handovers',
      b: 'The stage of each villa, the next handover and the work reports. The buyer follows progress from their portal.' },
    { p: '/compradores/', cap: 'Database', t: { texto: ['INVERSORES REGISTRADOS', 'REGISTERED INVESTORS'], fila: true },
      h: 'Buyers with their file',
      b: 'The directory of buyers and investors, with their KYC, their documents and all their deals.' },
    { p: '/asistente-correos/', cap: 'AI', t: { texto: ['Borrador para revisar', 'Draft to review'], caja: true },
      h: 'Replies that quote the contract',
      b: 'The buyer asks, and the assistant drafts the reply quoting that buyer\'s own contract. The team reviews it before sending, and topics management has not settled are held back.' },
    { p: '/asistente/', cap: 'AI', t: { texto: ['¿Qué necesitas?', 'What do you need?'], caja: true },
      h: 'Requests to management',
      b: 'Whatever the intranet does not allow (changing a client\'s details, voiding an invoice) is requested here in your own words. The assistant gets it ready and management approves or rejects it.' },
    { p: '/usuarios/', cap: 'Team', t: { texto: ['USUARIOS ACTIVOS', 'ACTIVE USERS'], fila: true },
      h: 'Who logs in and what they see',
      b: 'Management, administration, sales manager and agent, with tools and projects per person. The separation is enforced by the database, not just the screen.' },
    { p: '/', cap: 'The end', t: null, hero: true, fin: true,
      h: 'That is AxisWorks ERP',
      b: 'Modules you switch on one by one, on the same foundation. Now explore the demo freely, or change your selection in the configurator and run the tour again.' }
  ];

  /* Solo los pasos de módulos encendidos en la landing (catalogo.js). El módulo de cada paso sale de su
     propia ruta, con el mismo catálogo que usa el menú de la demo: no hay una segunda lista. */
  /* Se filtra al ARRANCAR, no al cargar: en la landing se cambian módulos después de cargar la página y el
     tour tiene que ver esa selección (antes contaba «1 de 22» y luego «2 de 20»). */
  var GUION = PASOS;
  function filtraPasos() {
    if (!window.AXW_CATALOGO) return;
    var estadoMod = window.AXW_CATALOGO.leeEstado();
    PASOS = GUION.filter(function (p) { var k = window.AXW_CATALOGO.moduloDeRuta(p.p); return !k || estadoMod[k]; });
  }
  filtraPasos();

  /* ── Estado ─────────────────────────────────────────────────────────── */
  function lee() { try { var v = JSON.parse(sessionStorage.getItem(CLAVE) || 'null'); return v && typeof v.i === 'number' ? v : null; } catch (e) { return null; } }
  // `en`: la página en la que se guardó. Un paso hero se reanuda solo ahí: si no, al salir del tour sin cerrarlo
  // navegando por el menú, la tarjeta final reaparecería en cada pantalla.
  function guarda(i) { try { sessionStorage.setItem(CLAVE, JSON.stringify({ i: i, en: aqui() })); } catch (e) {} }
  function borra() { try { sessionStorage.removeItem(CLAVE); } catch (e) {} }
  function ruta(p) { return p.replace(/\/+$/, '/') || '/'; }
  /* Los pasos «hero» (apertura y cierre, sin foco) se enseñan en la página en la que se esté (AXW-70, 28-sep-2026):
     la portada ya no está en el origen de la demo y la raíz de demo.axisworks.studio redirige a la Home, así que
     navegar a '/' perdía el tour en el redirect. */
  function enSuSitio(paso) { return !!paso.hero || ruta(paso.p) === aqui(); }
  function aqui() { var r = location.pathname; if (!/\/$/.test(r) && !/\.html$/.test(r)) r += '/'; return r.replace(/index\.html$/, ''); }

  /* ── Spring (critically damped por defecto) ─────────────────────────── */
  function Spring(v, opts) {
    this.x = v; this.v = 0; this.to = v;
    var resp = (opts && opts.resp) || 0.42, damp = (opts && opts.damp) || 1;
    this.k = Math.pow(2 * Math.PI / resp, 2);
    this.c = 4 * Math.PI * damp / resp;
  }
  Spring.prototype.step = function (dt) {
    var a = -this.k * (this.x - this.to) - this.c * this.v;
    this.v += a * dt; this.x += this.v * dt;
    if (Math.abs(this.x - this.to) < 0.05 && Math.abs(this.v) < 0.05) { this.x = this.to; this.v = 0; return false; }
    return true;
  };

  var S = {};
  ['hx', 'hy', 'hw', 'hh', 'cx', 'cy'].forEach(function (k) { S[k] = new Spring(0); });
  var corriendo = false, ultimo = 0;
  function anima() {
    if (corriendo) return;
    corriendo = true; ultimo = performance.now();
    requestAnimationFrame(function bucle(t) {
      var dt = Math.min(0.032, (t - ultimo) / 1000); ultimo = t;
      var vivo = false;
      for (var k in S) if (S[k].step(dt)) vivo = true;
      pinta();
      if (vivo) requestAnimationFrame(bucle); else corriendo = false;
    });
  }
  function fija(k, v, salto) { if (salto || REDUCIDO) { S[k].x = v; S[k].v = 0; } S[k].to = v; }

  /* ── DOM del tour ───────────────────────────────────────────────────── */
  var raiz, hueco, tarjeta, capa, cuerpo, barra, contador, bAtras, bSig, bSalir, i = 0, abierto = false, focoVisible = false;

  function css() {
    if (document.getElementById('axt-css')) return;
    var st = document.createElement('style'); st.id = 'axt-css';
    st.textContent = [
      '.axt{position:fixed;inset:0;z-index:2147483600;pointer-events:none;font:400 15px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;color:#0b1220}',
      '.axt *{box-sizing:border-box}',
      '.axt-velo{position:fixed;inset:0;background:rgba(9,12,24,.5);opacity:0;transition:opacity .45s cubic-bezier(.2,.8,.2,1);pointer-events:auto}',
      '.axt.on .axt-velo{opacity:1}',
      '.axt.foco .axt-velo{background:transparent}',
      '.axt-hueco{position:fixed;left:0;top:0;border-radius:18px;opacity:0;transition:opacity .4s ease;box-shadow:0 0 0 200vmax rgba(9,12,24,.52),0 0 0 1.5px rgba(255,255,255,.85),0 0 40px 6px rgba(99,102,241,.35);will-change:transform,width,height}',
      '.axt.foco .axt-hueco{opacity:1}',
      '.axt-tarjeta{position:fixed;left:0;top:0;width:392px;max-width:calc(100vw - 32px);pointer-events:auto;border-radius:22px;padding:22px 22px 18px;',
      'background:rgba(255,255,255,.72);-webkit-backdrop-filter:blur(28px) saturate(180%);backdrop-filter:blur(28px) saturate(180%);',
      'border:1px solid rgba(255,255,255,.6);box-shadow:0 30px 60px -12px rgba(9,12,24,.35),0 12px 24px -8px rgba(9,12,24,.18),inset 0 1px 0 rgba(255,255,255,.7);',
      'opacity:0;filter:blur(14px);transition:opacity .5s cubic-bezier(.2,.8,.2,1),filter .5s cubic-bezier(.2,.8,.2,1);will-change:transform}',
      '.axt.on .axt-tarjeta{opacity:1;filter:blur(0)}',
      '.axt-capa{transform:scale(.94);transition:transform .55s cubic-bezier(.2,.8,.2,1)}',
      '.axt.on .axt-capa{transform:scale(1)}',
      '.axt-tarjeta.hero{width:560px;padding:34px 34px 26px;text-align:left}',
      '.axt-cap{font:600 11.5px/1 -apple-system,BlinkMacSystemFont,Inter,system-ui;letter-spacing:.08em;text-transform:uppercase;color:#4f46e5;display:flex;justify-content:space-between;gap:12px}',
      '.axt-cap.axt-l{display:flex;padding-right:40px}',
      '.axt-cap span:last-child{color:#64748b;letter-spacing:.02em;text-transform:none;font-weight:500}',
      '.axt-h{font:700 21px/1.2 -apple-system,BlinkMacSystemFont,"SF Pro Display","Plus Jakarta Sans",Inter,system-ui;letter-spacing:-.02em;margin:10px 0 8px;padding-right:30px;color:#0b1220}',
      '.hero .axt-h{font-size:40px;line-height:1.06;letter-spacing:-.035em;margin:14px 0 12px}',
      '.axt-b{margin:0;color:#334155;font-size:15px;line-height:1.55;letter-spacing:-.005em}',
      '.hero .axt-b{font-size:17px;line-height:1.55}',
      '.axt-l{display:block;opacity:0;transform:translateY(10px);filter:blur(4px);transition:opacity .5s cubic-bezier(.2,.8,.2,1),transform .6s cubic-bezier(.2,.8,.2,1),filter .5s ease}',
      '.axt-cuerpo.in .axt-l{opacity:1;transform:none;filter:none}',
      '.axt-cuerpo.out .axt-l{opacity:0;transform:translateY(-6px);filter:blur(4px);transition-duration:.16s}',
      '.axt-barra{height:3px;border-radius:3px;background:rgba(15,23,42,.08);margin:18px 0 14px;overflow:hidden}',
      '.axt-barra i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,#4f46e5,#06b6d4);transform-origin:left;transition:transform .6s cubic-bezier(.2,.8,.2,1)}',
      '.axt-pie{display:flex;align-items:center;gap:8px}',
      '.axt-pie .esp{flex:1}',
      '.axt-bt{font:600 14px/1 -apple-system,BlinkMacSystemFont,Inter,system-ui;height:38px;padding:0 16px;border-radius:999px;border:0;cursor:pointer;transition:transform .12s ease-out,background .2s,opacity .2s}',
      '.axt-bt:active{transform:scale(.96)}',
      '.axt-bt:focus-visible{outline:2px solid rgba(99,102,241,.45);outline-offset:2px}',
      '.axt-bt.p{background:#4f46e5;color:#fff;box-shadow:0 6px 16px -6px rgba(79,70,229,.6)}',
      '.axt-bt.p:hover{background:#4338ca}',
      '.axt-bt.s{background:rgba(15,23,42,.06);color:#0b1220}',
      '.axt-bt.s:hover{background:rgba(15,23,42,.1)}',
      '.axt-bt[disabled]{opacity:.35;cursor:default}',
      '.axt-x{position:absolute;top:14px;right:14px;width:28px;height:28px;border-radius:50%;border:0;background:rgba(15,23,42,.06);color:#334155;cursor:pointer;font:500 16px/28px system-ui;transition:transform .12s ease-out,background .2s}',
      '.axt-x:hover{background:rgba(15,23,42,.12)}.axt-x:active{transform:scale(.92)}',
      '.axt-tecla{font:500 12px/1 -apple-system,Inter,system-ui;color:#64748b}',
      '.axt-carga{position:fixed;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid rgba(255,255,255,.25);border-top-color:#fff;animation:axtgira .8s linear infinite;opacity:0;transition:opacity .3s}',
      '.axt.cargando .axt-carga{opacity:1}',
      '@keyframes axtgira{to{transform:rotate(360deg)}}',
      'body.axt-activo nav[aria-label="Leave the demo"]{opacity:0;pointer-events:none}',
      '@media (max-width:560px){.axt-tarjeta,.axt-tarjeta.hero{width:calc(100vw - 32px);padding:20px}.hero .axt-h{font-size:30px}.axt-tecla{display:none}}',
      '@media (prefers-reduced-motion:reduce){.axt-capa,.axt.on .axt-capa{transform:none}.axt-tarjeta{filter:none!important}.axt-l{transform:none!important;filter:none!important}}',
      '@media (prefers-reduced-transparency:reduce){.axt-tarjeta{background:#fff;-webkit-backdrop-filter:none;backdrop-filter:none}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function monta() {
    if (raiz) return;
    css();
    raiz = document.createElement('div'); raiz.className = 'axt'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', 'Guided tour');
    raiz.innerHTML = '<div class="axt-velo"></div><div class="axt-hueco"></div><div class="axt-carga" aria-hidden="true"></div>' +
      '<div class="axt-tarjeta"><div class="axt-capa">' +
      '<button type="button" class="axt-x" aria-label="Exit the tour">&times;</button>' +
      '<div class="axt-cuerpo" aria-live="polite"></div>' +
      '<div class="axt-barra"><i></i></div>' +
      '<div class="axt-pie"><button type="button" class="axt-bt s" data-a="atras">Back</button><span class="esp"></span>' +
      '<span class="axt-tecla">← →</span><button type="button" class="axt-bt p" data-a="sig">Next</button></div>' +
      '</div></div>';
    document.body.appendChild(raiz);
    hueco = raiz.querySelector('.axt-hueco'); tarjeta = raiz.querySelector('.axt-tarjeta'); capa = raiz.querySelector('.axt-capa');
    cuerpo = raiz.querySelector('.axt-cuerpo'); barra = raiz.querySelector('.axt-barra i');
    bAtras = raiz.querySelector('[data-a="atras"]'); bSig = raiz.querySelector('[data-a="sig"]'); bSalir = raiz.querySelector('.axt-x');
    bAtras.addEventListener('click', function () { ve(i - 1); });
    bSig.addEventListener('click', function () { if (PASOS[i].fin) { cierra(true); } else ve(i + 1); });
    bSalir.addEventListener('click', function () { cierra(false); });
    raiz.querySelector('.axt-velo').addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('keydown', tecla, true);
    window.addEventListener('resize', recoloca);
    window.addEventListener('scroll', recoloca, true);
    document.body.classList.add('axt-activo');
  }

  function tecla(e) {
    if (!abierto) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); bSig.click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); if (!bAtras.disabled) ve(i - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cierra(false); }
  }

  /* ── Encontrar lo que se explica ────────────────────────────────────── */
  function visible(el) { if (!el || !el.getBoundingClientRect) return false; var r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== 'hidden'; }
  function porTexto(txt) {
    if (Array.isArray(txt)) { for (var q = 0; q < txt.length; q++) { var hallado = porTexto(txt[q]); if (hallado) return hallado; } return null; }
    var buscado = txt.trim().toLowerCase(), mejor = null, area = Infinity;
    var todos = document.body.querySelectorAll('h1,h2,h3,h4,p,span,div,button,a,th,label,strong');
    for (var n = 0; n < todos.length; n++) {
      var el = todos[n];
      if (el.closest('.axt')) continue;
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (t !== buscado && t.indexOf(buscado) !== 0) continue;
      if (t.length > buscado.length + 6) continue;
      if (!visible(el)) continue;
      var r = el.getBoundingClientRect(), a = r.width * r.height;
      if (a < area) { area = a; mejor = el; }
    }
    return mejor;
  }
  function esCaja(el) {
    var cs = getComputedStyle(el), r = el.getBoundingClientRect();
    var radio = parseFloat(cs.borderTopLeftRadius) || 0;
    var fondo = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
    var borde = parseFloat(cs.borderTopWidth) > 0;
    return radio >= 8 && (fondo || borde) && r.width >= 160 && r.height >= 60;
  }
  function subeACaja(el) {
    var x = el;
    while (x && x !== document.body) { if (esCaja(x)) return x; x = x.parentElement; }
    return el;
  }
  function subeAFila(caja) {
    var ancho = caja.getBoundingClientRect().width, x = caja.parentElement;
    while (x && x !== document.body) {
      var r = x.getBoundingClientRect();
      if (r.width >= ancho * 2.2) return x;
      x = x.parentElement;
    }
    return caja;
  }
  function panelLateral() {
    var cands = document.querySelectorAll('body *'), mejor = null;
    for (var n = 0; n < cands.length; n++) {
      var el = cands[n];
      if (el.closest('.axt')) continue;
      var cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;
      var r = el.getBoundingClientRect();
      if (r.width >= 360 && r.width <= innerWidth * 0.8 && r.height >= innerHeight * 0.8 && Math.abs(r.right - innerWidth) < 4) { mejor = el; }
    }
    return mejor;
  }
  function util(el) {   // plegado o fuera de pantalla (el menú en móvil): mejor centrado que un foco sobre nada
    if (!el) return null; var r = el.getBoundingClientRect();
    return r.width < 60 || r.right < 20 || r.left > innerWidth - 20 ? null : el;
  }
  function objetivo(paso) { return util(objetivoCrudo(paso)); }
  function objetivoCrudo(paso) {
    var t = paso.t; if (!t) return null;
    if (t.panel) return panelLateral();
    var el = t.css ? document.querySelector(t.css) : porTexto(t.texto);
    if (!el || !visible(el)) return null;
    if (t.contiene) {
      var buscas = [].concat(t.contiene).map(function (s) { return s.toLowerCase(); });
      var tiene = function (n) { var tx = (n.textContent || '').toLowerCase(); return buscas.some(function (b) { return tx.indexOf(b) !== -1; }); };
      var x = el; while (x && x !== document.body && !tiene(x)) x = x.parentElement; return x && x !== document.body ? x : el;
    }
    if (t.caja || t.fila) el = subeACaja(el);
    if (t.fila) {
      el = subeAFila(el);
      if (el.getBoundingClientRect().height > innerHeight * 0.75) el = subeACaja(porTexto(t.texto)); // fila demasiado grande: solo la tarjeta
    }
    return el;
  }
  function espera(paso, ms) {
    return new Promise(function (ok) {
      var t0 = performance.now();
      (function mira() {
        var el = objetivo(paso);
        if (el || !paso.t || performance.now() - t0 > ms) return ok(el);
        setTimeout(mira, 120);
      })();
    });
  }

  /* ── Colocar foco y tarjeta ─────────────────────────────────────────── */
  var actual = null, margen = 10;
  function rect(el) {
    var r = el.getBoundingClientRect();
    var x = Math.max(8, r.left - margen), y = Math.max(8, r.top - margen);
    var w = Math.min(innerWidth - 16, r.right + margen) - x, h = Math.min(innerHeight - 16, r.bottom + margen) - y;
    return { x: x, y: y, w: Math.max(40, w), h: Math.max(40, h) };
  }
  function sitioTarjeta(fr) {
    var tw = tarjeta.offsetWidth, th = tarjeta.offsetHeight, g = 18;
    if (!fr) return { x: (innerWidth - tw) / 2, y: Math.max(16, (innerHeight - th) / 2) };
    var cand = [
      { x: fr.x + fr.w / 2 - tw / 2, y: fr.y + fr.h + g, ok: fr.y + fr.h + g + th < innerHeight - 12 },
      { x: fr.x + fr.w / 2 - tw / 2, y: fr.y - g - th, ok: fr.y - g - th > 12 },
      { x: fr.x + fr.w + g, y: fr.y + fr.h / 2 - th / 2, ok: fr.x + fr.w + g + tw < innerWidth - 12 },
      { x: fr.x - g - tw, y: fr.y + fr.h / 2 - th / 2, ok: fr.x - g - tw > 12 }
    ];
    var c = cand.filter(function (k) { return k.ok; })[0] || { x: innerWidth - tw - 24, y: innerHeight - th - 24 };
    c.x = Math.max(16, Math.min(innerWidth - tw - 16, c.x));
    c.y = Math.max(16, Math.min(innerHeight - th - 16, c.y));
    return c;
  }
  function recoloca(salto) {
    if (!abierto) return;
    var fr = actual && document.contains(actual) ? rect(actual) : null;
    if (fr) { fija('hx', fr.x, salto); fija('hy', fr.y, salto); fija('hw', fr.w, salto); fija('hh', fr.h, salto); }
    var c = sitioTarjeta(fr);
    fija('cx', c.x, salto); fija('cy', c.y, salto);
    anima();
  }
  function pinta() {
    if (!hueco) return;
    hueco.style.transform = 'translate3d(' + S.hx.x + 'px,' + S.hy.x + 'px,0)';
    hueco.style.width = S.hw.x + 'px'; hueco.style.height = S.hh.x + 'px';
    tarjeta.style.transform = 'translate3d(' + S.cx.x + 'px,' + S.cy.x + 'px,0)';
  }

  /* ── Texto con entrada escalonada ───────────────────────────────────── */
  function contenido(paso, n) {
    var lineas = [
      '<div class="axt-cap axt-l"><span>' + paso.cap + '</span><span>' + (n + 1) + ' of ' + PASOS.length + '</span></div>',
      '<div class="axt-h axt-l">' + paso.h + '</div>',
      '<p class="axt-b axt-l">' + paso.b + '</p>'
    ];
    return lineas.join('');
  }
  function escribe(paso, n, salto) {
    return new Promise(function (ok) {
      function pon() {
        cuerpo.className = 'axt-cuerpo';
        cuerpo.innerHTML = contenido(paso, n);
        tarjeta.classList.toggle('hero', !!paso.hero);
        var ls = cuerpo.querySelectorAll('.axt-l');
        ls.forEach(function (l, k) { l.style.transitionDelay = REDUCIDO ? '0s' : (0.06 + k * 0.07) + 's'; });
        void cuerpo.offsetWidth;
        cuerpo.classList.add('in');
        barra.style.transform = 'scaleX(' + ((n + 1) / PASOS.length) + ')';
        bAtras.disabled = n === 0;
        bSig.textContent = paso.fin ? 'See the modules' : (n === 0 ? 'Start' : 'Next');
        ok();
      }
      if (salto || !cuerpo.innerHTML) return pon();
      cuerpo.querySelectorAll('.axt-l').forEach(function (l) { l.style.transitionDelay = '0s'; });
      cuerpo.classList.remove('in'); cuerpo.classList.add('out');
      setTimeout(pon, REDUCIDO ? 0 : 150);
    });
  }

  /* ── Navegación ─────────────────────────────────────────────────────── */
  var abiertoPorClick = null;
  function deshaceClick() {
    if (!abiertoPorClick) return;
    abiertoPorClick = null;
    var p = panelLateral();
    if (!p) return;
    var cerrar = [].slice.call(p.querySelectorAll('button')).filter(function (b) {
      var t = (b.textContent || '').trim(); return t === 'Cerrar' || t === 'Close' || t === '×' || t === 'close' || /cerrar|close/i.test(b.getAttribute('aria-label') || '');
    })[0];
    if (cerrar) cerrar.click(); else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }

  var turno = 0;
  function ve(n) {
    if (n < 0 || n >= PASOS.length) return;
    var paso = PASOS[n], mio = ++turno;
    deshaceClick();
    guarda(n);
    if (!enSuSitio(paso)) {
      raiz.classList.remove('on');
      setTimeout(function () { location.href = paso.p; }, REDUCIDO ? 0 : 260);
      return;
    }
    i = n;
    muestra(paso, mio, false);
  }

  function muestra(paso, mio, primera) {
    raiz.classList.add('cargando');
    var pre = paso.click ? new Promise(function (ok) {
      var t0 = performance.now();
      (function busca() {
        var el = [].slice.call(document.querySelectorAll(paso.click)).filter(visible)[0];
        if (el) { el.scrollIntoView({ block: 'center', behavior: REDUCIDO ? 'auto' : 'smooth' }); setTimeout(function () { el.click(); abiertoPorClick = true; ok(); }, 350); return; }
        if (performance.now() - t0 > 4000) return ok();
        setTimeout(busca, 120);
      })();
    }) : Promise.resolve();
    pre.then(function () { return espera(paso, 5000); }).then(function (el) {
      if (mio !== turno) return;
      raiz.classList.remove('cargando');
      actual = el;
      if (el && !paso.t.panel) {
        var r = el.getBoundingClientRect();
        if (r.top < 70 || r.bottom > innerHeight - 20) el.scrollIntoView({ block: r.height > innerHeight * 0.6 ? 'start' : 'center', behavior: REDUCIDO ? 'auto' : 'smooth' });
      }
      raiz.classList.toggle('foco', !!el);
      if (primera && el) { var f = rect(el); fija('hx', f.x + f.w / 2, true); fija('hy', f.y + f.h / 2, true); fija('hw', 0, true); fija('hh', 0, true); }
      if (primera) { var c = sitioTarjeta(el ? rect(el) : null); fija('cx', c.x, true); fija('cy', c.y + 24, true); pinta(); }
      escribe(paso, i, primera).then(function () {
        requestAnimationFrame(function () {
          raiz.classList.add('on');
          recoloca(false);
          setTimeout(function () { recoloca(false); }, REDUCIDO ? 0 : 420);   // tras el scroll suave
          if (primera) setTimeout(function () { bSig.focus({ preventScroll: true }); }, 50);
        });
      });
    });
  }

  function cierra(aModulos) {
    deshaceClick();
    borra();
    abierto = false;
    raiz.classList.remove('on', 'foco');
    document.body.classList.remove('axt-activo');
    document.removeEventListener('keydown', tecla, true);
    setTimeout(function () { if (raiz) { raiz.remove(); raiz = null; } window.__axtTour = false; }, REDUCIDO ? 0 : 500);
    if (aModulos) {
      // El tour acaba en la portada: se queda en el catálogo, para cambiar la selección y repetirlo.
      // En la demo no hay configurador: se vuelve al de la portada (window.AXW_PORTADA, lo fija el guard de la demo).
      var c = document.getElementById('configurador');
      var portada = typeof window.AXW_PORTADA === 'string' && /^(\/|https?:\/\/)/.test(window.AXW_PORTADA) ? window.AXW_PORTADA : '/';
      if (c) c.scrollIntoView({ behavior: REDUCIDO ? 'auto' : 'smooth' }); else location.href = portada + '#configurador';
    }
  }

  function arranca(n) {
    monta();
    abierto = true;
    i = n;
    var paso = PASOS[n];
    if (!enSuSitio(paso)) { guarda(n); location.href = paso.p; return; }
    guarda(n);
    muestra(paso, ++turno, true);
  }

  /* API para la landing (botón «Tour guiado») y reanudación al cargar cada página */
  window.axtTour = { empezar: function () { filtraPasos(); arranca(0); } };
  var intentos = 0;
  function alCargar() {
    // El índice guardado apunta a la lista FILTRADA: sin catálogo, la lista entera desplaza cada paso.
    // Un script insertado por JS no frena DOMContentLoaded, así que puede llegar tarde: se espera hasta 2 s.
    if (!window.AXW_CATALOGO && intentos++ < 40) return setTimeout(alCargar, 50);
    filtraPasos();
    var q = new URLSearchParams(location.search);
    if (q.get('tour') === '1') {
      // Se quita de la URL al arrancar: recargar a mitad no vuelve a empezar el tour.
      q.delete('tour');
      var resto = q.toString();
      try { history.replaceState(history.state, '', location.pathname + (resto ? '?' + resto : '') + location.hash); }
      catch (x) { /* MUDO A PROPOSITO: sin replaceState, recargar reinicia el tour; no rompe nada */ }
      return arranca(0);
    }
    var st = lee();
    if (st && PASOS[st.i] && (PASOS[st.i].hero ? st.en === aqui() : enSuSitio(PASOS[st.i]))) arranca(st.i);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', alCargar);
  else alCargar();
})();
