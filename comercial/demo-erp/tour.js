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
  var PASOS = [
    { p: '/', cap: 'Tour guiado', t: null, hero: true,
      h: 'AxisWorks ERP en tres minutos',
      b: 'Un día de trabajo en una promotora: del lead que entra por Meta a la villa entregada. Los datos son inventados. Avanza con → o con los botones.' },
    { p: '/intranet/v4/home/', cap: 'Inicio', t: { texto: 'CONTRATOS ACTIVOS', fila: true },
      h: 'Cada mañana empieza aquí',
      b: 'Contratos activos, cobrado este mes, vencimientos de los próximos treinta días y parcelas libres. Las cifras salen de los contratos y los cobros: nadie las rellena a mano.' },
    { p: '/intranet/v4/home/', cap: 'Inicio', t: { texto: 'Hoy toca', caja: true },
      h: 'Lo que está esperando a alguien',
      b: 'Reservas a punto de caducar, facturas firmadas sin cobrar, firmas pendientes. Cada línea lleva a la pantalla donde se resuelve.' },
    { p: '/intranet/v4/home/', cap: 'Inicio', t: { css: 'aside' },
      h: 'Un menú, todos los módulos',
      b: 'Cada persona ve solo las herramientas que tiene asignadas. Un agente no ve la tesorería; dirección lo ve todo.' },
    { p: '/intranet/leads/', cap: 'Ventas', t: { texto: 'PARA HOY', contiene: 'CON RETRASO' },
      h: 'Los leads entran solos',
      b: 'Los formularios de Meta llegan al CRM sin copiar nada. Cada lead tiene su próximo paso con fecha, y los que llevan días sin tocarse salen en rojo.' },
    { p: '/intranet/leads/', cap: 'Ventas', t: { texto: 'Pipeline', contiene: 'Trazabilidad' },
      h: 'Embudo, campañas y automatismos',
      b: 'El embudo por etapas, lo que cuesta cada lead por campaña y el piloto que pausa o sube presupuesto en Meta Ads, siempre dentro del tope que marca dirección.' },
    { p: '/intranet/v4/operaciones/', cap: 'Ventas', t: { texto: 'PRECIO PACTADO', fila: true },
      h: 'Una venta, una fila',
      b: 'Bloqueo de parcela, carta de reserva y contrato de construcción del mismo comprador van juntos. Arriba, lo pactado, lo cobrado y lo pendiente de toda la cartera.' },
    { p: '/intranet/v4/operaciones/', cap: 'Ventas', click: 'tbody tr[data-lw-id]', t: { panel: true },
      h: 'Toda la venta en una ficha',
      b: 'Situación, contratos de la cadena, comprador con su KYC y cada factura y recibí. Desde aquí se emite el siguiente documento.' },
    { p: '/intranet/v4/contratos/', cap: 'Documentos', t: { texto: 'FIRMADOS', fila: true },
      h: 'Contratos en tres idiomas',
      b: 'Se generan en español, inglés e indonesio y se firman con un enlace electrónico que caduca. Aquí, lo firmado, los borradores y el volumen comprometido.' },
    { p: '/intranet/v4/facturas/', cap: 'Dinero', t: { texto: 'FACTURADO ESTE MES', fila: true },
      h: 'Facturas que saben si están cobradas',
      b: 'Cada factura cuelga de su contrato y de su sociedad emisora, en euros o en rupias. El estado de cobro se calcula con los recibís, no se marca a mano.' },
    { p: '/intranet/v4/recibos/', cap: 'Dinero', t: { texto: 'RECIBÍS EMITIDOS', fila: true },
      h: 'Cada cobro, con su justificante',
      b: 'Un recibí puede saldar varias facturas. Los que no llevan justificante adjunto salen señalados para que nadie los olvide.' },
    { p: '/intranet/v4/vencimientos/', cap: 'Dinero', t: { texto: 'VENCIMIENTOS CRÍTICOS', fila: true },
      h: 'Tesorería por hitos',
      b: 'El calendario de pagos de cada contrato: qué vence en los próximos noventa días, qué está vencido y qué no tiene fecha todavía.' },
    { p: '/intranet/v4/reservas/', cap: 'Dinero', t: { texto: 'VENCEN EN 2 DÍAS', fila: true },
      h: 'Ninguna reserva caduca sin avisar',
      b: 'Las reservas que vencen en dos días, esta semana o más adelante, con sus prórrogas. Cuando una vence, la parcela se libera sola.' },
    { p: '/intranet/v4/comisiones/', cap: 'Dinero', t: { texto: 'PENDIENTES DE RESOLVER', fila: true },
      h: 'Comisiones que se generan solas',
      b: 'Cada venta genera la comisión del comercial y la del jefe de equipo según sus condiciones. Dirección la aprueba y la marca como pagada.' },
    { p: '/intranet/v4/proyectos/', cap: 'Producto y obra', t: { texto: 'CARTERA CONSOLIDADA', fila: true },
      h: 'El parcelario, vivo',
      b: 'Cada promoción con sus parcelas y su estado: libre, reservada, bloqueada o vendida. El estado cambia solo cuando se firma o se libera un contrato.' },
    { p: '/intranet/v4/obra/', cap: 'Producto y obra', t: { texto: 'PRÓXIMA ENTREGA', caja: true },
      h: 'Obra y entregas',
      b: 'La fase de cada villa, la próxima entrega y los partes de trabajo. El comprador sigue el avance desde su portal.' },
    { p: '/intranet/v4/compradores/', cap: 'Producto y obra', t: { texto: 'INVERSORES REGISTRADOS', fila: true },
      h: 'Compradores con su expediente',
      b: 'El directorio de compradores e inversores, con su KYC, sus documentos y todas sus operaciones.' },
    { p: '/intranet/v4/asistente/', cap: 'IA', t: { texto: 'Borrador para revisar', caja: true },
      h: 'Respuestas que citan el contrato',
      b: 'El comprador pregunta y el asistente redacta la respuesta citando su propio contrato. El equipo la revisa antes de enviarla, y los temas que dirección no ha cerrado se frenan.' },
    { p: '/intranet/v4/usuarios/', cap: 'Equipo', t: { texto: 'USUARIOS ACTIVOS', fila: true },
      h: 'Quién entra y qué ve',
      b: 'Dirección, administración, jefe de ventas y agente, con herramientas y proyectos por persona. La separación la hace la base de datos, no solo la pantalla.' },
    { p: '/panel/', cap: 'Tu panel', t: { css: '#kpis' },
      h: 'Así lo gestionas tú',
      b: 'Tras contratar, tu panel de administración: módulos activos, cuota del mes, tu equipo y la versión de tu base de datos, que es la misma en todos los clientes.' },
    { p: '/panel/', cap: 'Tu panel', t: { css: '#inspector' },
      h: 'Un módulo más, un clic',
      b: 'Cada módulo dice qué hace, qué tablas usa y qué pantallas abre. Lo enciendes tú desde aquí y aparece al momento en el menú de todo el equipo.' },
    { p: '/panel/', cap: 'Final', t: null, hero: true, fin: true,
      h: 'Eso es AxisWorks ERP',
      b: 'Módulos que se activan uno a uno sobre la misma base. Ahora entra libre a la demo, o cambia tu selección en el cotizador y repite el tour.' }
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
  function guarda(i) { try { sessionStorage.setItem(CLAVE, JSON.stringify({ i: i })); } catch (e) {} }
  function borra() { try { sessionStorage.removeItem(CLAVE); } catch (e) {} }
  function ruta(p) { return p.replace(/\/+$/, '/') || '/'; }
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
      'body.axt-activo a[aria-label="Volver a los módulos"]{opacity:0;pointer-events:none}',
      '@media (max-width:560px){.axt-tarjeta,.axt-tarjeta.hero{width:calc(100vw - 32px);padding:20px}.hero .axt-h{font-size:30px}.axt-tecla{display:none}}',
      '@media (prefers-reduced-motion:reduce){.axt-capa,.axt.on .axt-capa{transform:none}.axt-tarjeta{filter:none!important}.axt-l{transform:none!important;filter:none!important}}',
      '@media (prefers-reduced-transparency:reduce){.axt-tarjeta{background:#fff;-webkit-backdrop-filter:none;backdrop-filter:none}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function monta() {
    if (raiz) return;
    css();
    raiz = document.createElement('div'); raiz.className = 'axt'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', 'Tour guiado');
    raiz.innerHTML = '<div class="axt-velo"></div><div class="axt-hueco"></div><div class="axt-carga" aria-hidden="true"></div>' +
      '<div class="axt-tarjeta"><div class="axt-capa">' +
      '<button type="button" class="axt-x" aria-label="Salir del tour">&times;</button>' +
      '<div class="axt-cuerpo" aria-live="polite"></div>' +
      '<div class="axt-barra"><i></i></div>' +
      '<div class="axt-pie"><button type="button" class="axt-bt s" data-a="atras">Atrás</button><span class="esp"></span>' +
      '<span class="axt-tecla">← →</span><button type="button" class="axt-bt p" data-a="sig">Siguiente</button></div>' +
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
    if (t.contiene) { var x = el; var busca = t.contiene.toLowerCase(); while (x && x !== document.body && (x.textContent || '').toLowerCase().indexOf(busca) === -1) x = x.parentElement; return x && x !== document.body ? x : el; }
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
      '<div class="axt-cap axt-l"><span>' + paso.cap + '</span><span>' + (n + 1) + ' de ' + PASOS.length + '</span></div>',
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
        bSig.textContent = paso.fin ? 'Ver los módulos' : (n === 0 ? 'Empezar' : 'Siguiente');
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
      var t = (b.textContent || '').trim(); return t === 'Cerrar' || t === '×' || t === 'close' || /cerrar/i.test(b.getAttribute('aria-label') || '');
    })[0];
    if (cerrar) cerrar.click(); else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }

  var turno = 0;
  function ve(n) {
    if (n < 0 || n >= PASOS.length) return;
    var paso = PASOS[n], mio = ++turno;
    deshaceClick();
    guarda(n);
    if (ruta(paso.p) !== aqui()) {
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
      // El tour acaba en el panel: se queda ahí, arriba, con «Entrar con estos módulos» a la vista.
      window.scrollTo({ top: 0, behavior: REDUCIDO ? 'auto' : 'smooth' });
    }
  }

  function arranca(n) {
    monta();
    abierto = true;
    i = n;
    var paso = PASOS[n];
    if (ruta(paso.p) !== aqui()) { guarda(n); location.href = paso.p; return; }
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
    if (q.get('tour') === '1') return arranca(0);
    var st = lee();
    if (st && PASOS[st.i] && ruta(PASOS[st.i].p) === aqui()) arranca(st.i);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', alCargar);
  else alCargar();
})();
