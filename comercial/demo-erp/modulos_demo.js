/* La demo enseña solo los módulos marcados en la landing — 24-sep-2026.
   build.py lo copia a dist/demo/modulos.js y el guard de la demo lo carga en cada pantalla, después de
   catalogo.js (de donde saca qué rutas y pestañas son de cada módulo, y qué está marcado).

   - Menú: se ocultan los enlaces a pantallas de módulos apagados (barra lateral, cabeceras, pestañas del
     CRM). El menú se pinta en varios tiempos (nav.js injerta entradas), así que se vuelve a filtrar cuando
     el DOM cambia.
   - Entrada por URL a un módulo apagado: aviso con «Activarlo y verlo» o «Configurar módulos».
   Lo que NO hace, por escrito: las cifras y listas de otras pantallas (el panel del día cuenta facturas
   aunque Facturación esté apagada). Eso sería el interruptor de módulo en servidor, fase F4 del plan. */
(function () {
  var CAT = window.AXW_CATALOGO;
  if (!CAT || window.__axwModulos) return;
  window.__axwModulos = true;
  // La portada vive en otro origen (erp.axisworks.studio, AXW-70): lo marcado llega en `?sel=`. Se lee UNA vez, pasa
  // por CAT.leeSel (lista cerrada de ids, topes; lo desconocido fuera) y se quita de la URL para que recargar no lo
  // vuelva a aplicar. Va antes de leer el estado y antes de tour.js (el guard carga los tres en orden).
  (function importaSel() {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    if (!q.has('sel')) return;
    var e = CAT.leeSel(q.get('sel'));
    q.delete('sel');
    var resto = q.toString();
    try { history.replaceState(history.state, '', location.pathname + (resto ? '?' + resto : '') + location.hash); }
    catch (x) { /* MUDO A PROPOSITO: sin replaceState el parámetro se queda en la barra; la selección ya se aplicó igual */ }
    if (e) CAT.guardaEstado(e);
  })();
  // Portada (configurador): la fija el guard de la demo; en local es la raíz del mismo servidor.
  var PORTADA = typeof window.AXW_PORTADA === 'string' && /^(\/|https?:\/\/)/.test(window.AXW_PORTADA) ? window.AXW_PORTADA : '/';
  var estado = CAT.leeEstado();
  function apagado(k) { return k && !estado[k]; }
  function rutaDe(href) { try { return new URL(href, location.href).pathname; } catch (e) { return ''; } }

  function filtra() {
    var enlaces = document.querySelectorAll('aside a[href], nav a[href], header a[href], [class*="sidebar"] a[href], [class*="rail"] a[href]');
    for (var n = 0; n < enlaces.length; n++) {
      var a = enlaces[n];
      if (a.closest('.axt, .axw-aviso')) continue;
      var k = CAT.moduloDeRuta(rutaDe(a.getAttribute('href')));
      var fuera = apagado(k);
      if (fuera && a.style.display !== 'none') { a.setAttribute('data-axw-oculto', k); a.style.display = 'none'; }
      else if (!fuera && a.getAttribute('data-axw-oculto')) { a.removeAttribute('data-axw-oculto'); a.style.display = ''; }
    }
    for (var m in CAT.PESTANAS) {
      if (!apagado(m)) continue;
      var textos = CAT.PESTANAS[m];
      var botones = document.querySelectorAll('button, a, [role="tab"]');
      for (var b = 0; b < botones.length; b++) {
        var t = (botones[b].textContent || '').replace(/\s+/g, ' ').trim();
        for (var x = 0; x < textos.length; x++) if (t.indexOf(textos[x]) !== -1 && t.length < textos[x].length + 12) botones[b].style.display = 'none';
      }
    }
  }

  function aviso(k) {
    if (document.querySelector('.axw-aviso')) return;
    var st = document.createElement('style');
    st.textContent = '.axw-aviso{position:fixed;inset:0;z-index:2147483500;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(9,12,24,.55);font:400 15px/1.5 -apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif}' +
      '.axw-aviso div{max-width:460px;width:100%;background:rgba(255,255,255,.9);-webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%);border-radius:22px;padding:28px;box-shadow:0 30px 60px -12px rgba(9,12,24,.35);color:#0b1220}' +
      '.axw-aviso small{font:600 11.5px/1 Inter,system-ui;letter-spacing:.08em;text-transform:uppercase;color:#4f46e5}' +
      '.axw-aviso h2{font:700 24px/1.2 -apple-system,BlinkMacSystemFont,"Plus Jakarta Sans",Inter,system-ui;letter-spacing:-.02em;margin:10px 0 8px}' +
      '.axw-aviso p{margin:0 0 20px;color:#334155}' +
      '.axw-aviso nav{display:flex;gap:8px;flex-wrap:wrap}' +
      '.axw-aviso a,.axw-aviso button{font:600 14px/1 Inter,system-ui;height:40px;padding:0 18px;border-radius:999px;border:0;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}' +
      '.axw-aviso .p{background:#4f46e5;color:#fff}.axw-aviso .p:hover{background:#4338ca}.axw-aviso .s{background:rgba(15,23,42,.07);color:#0b1220}';
    document.head.appendChild(st);
    var d = document.createElement('div');
    d.className = 'axw-aviso'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.setAttribute('aria-labelledby', 'axw-aviso-tit');
    d.innerHTML = '<div><small>Module switched off</small><h2 id="axw-aviso-tit">' + CAT.nombre(k) + ' is not in your setup</h2>' +
      '<p>You switched it off on the modules page. Turn it on to see it in the demo, or choose your modules again.</p>' +
      '<nav><button type="button" class="p" data-axw-activa>Turn it on and view</button><a class="s" data-axw-portada>Choose modules</a>' +
      '<a class="s" href="/intranet/v4/home/">Go to home</a></nav></div>';
    document.body.appendChild(d);
    d.querySelector('[data-axw-portada]').setAttribute('href', PORTADA + '#configurador');
    d.querySelector('[data-axw-activa]').addEventListener('click', function () { estado[k] = true; CAT.guardaEstado(estado); location.reload(); });
    d.querySelector('[data-axw-activa]').focus();
    // Escape: la pantalla detrás es de un módulo apagado, así que cerrar es salir al inicio.
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') location.href = '/intranet/v4/home/'; });
  }

  function arranca() {
    var k = CAT.moduloDeRuta(location.pathname);
    if (apagado(k)) aviso(k);
    filtra();
    var pendiente = null;
    new MutationObserver(function () {
      if (pendiente) return;
      pendiente = setTimeout(function () { pendiente = null; filtra(); }, 60);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arranca);
  else arranca();
})();
