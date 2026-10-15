  /* El dinero que se recorre: el formateo es el del portal (idioma, divisa), no uno propio.
     La cifra que CUENTA es un adorno encima, nunca el dato (15-oct-2026, Calidad; el mismo arreglo que cuenta() de
     intranet/v4/assets/motion.js). El texto del importe no se toca: lo leen los lectores de pantalla y quien copia. La
     cifra que sube va en una capa aria-hidden pintada con ::after y el texto real solo se vuelve transparente mientras la
     capa existe. Antes se escribía fmt(0) en el propio texto: el importe de un cliente decía 0 hasta el primer fotograma
     y, con la pestaña oculta (sin rAF), hasta el temporizador de seguridad. Con la pestaña oculta no se anima. */
  var ESTILO_CIFRA = false;
  function estiloCifra() {
    if (ESTILO_CIFRA) return;
    ESTILO_CIFRA = true;
    var st = root.document.createElement('style');
    st.textContent = '.lw-cifra-capa{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;white-space:nowrap}' +
      '.lw-cifra-capa::after{content:attr(data-v)}';
    root.document.head.appendChild(st);
  }
  function cuenta(el, retraso) {
    var fin = Number(el.getAttribute('data-cuenta')), moneda = el.getAttribute('data-moneda') || '';
    var fmt = M.formatoDinero;
    if (!isFinite(fin) || typeof fmt !== 'function' || root.document.hidden) return;
    var final = el.textContent, t0 = null, DUR = 800, hecho = false;
    estiloCifra();
    var cs = root.getComputedStyle(el);
    var antes = { color: el.style.color, position: el.style.position, num: el.style.fontVariantNumeric };
    var capa = root.document.createElement('span');
    capa.className = 'lw-cifra-capa';
    capa.setAttribute('aria-hidden', 'true');
    capa.style.color = cs.color;
    capa.style.textAlign = cs.textAlign;
    capa.setAttribute('data-v', fmt(0, moneda));
    if (!/^(relative|absolute|fixed|sticky)$/.test(cs.position)) el.style.position = 'relative';
    el.style.fontVariantNumeric = 'tabular-nums';
    el.style.color = 'transparent';
    el.appendChild(capa);
    function termina() {
      if (hecho) return;
      hecho = true;
      if (capa.parentNode) capa.parentNode.removeChild(capa);
      el.style.color = antes.color; el.style.position = antes.position; el.style.fontVariantNumeric = antes.num;
      root.document.removeEventListener('visibilitychange', alOcultar);
    }
    function alOcultar() { if (root.document.hidden) termina(); }
    root.document.addEventListener('visibilitychange', alOcultar);
    function paso(t) {
      if (hecho) return;
      if (!capa.isConnected || el.textContent !== final) return termina();   // desapareció o alguien lo repintó: manda lo nuevo
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / DUR);
      if (k >= 1) return termina();
      capa.setAttribute('data-v', fmt(valorCuenta(fin, k), moneda));
      root.requestAnimationFrame(paso);
    }
    root.setTimeout(function () { if (!hecho) root.requestAnimationFrame(paso); }, retraso);
    // si rAF no llega (pestaña congelada, navegador sin fotogramas), el dato se destapa igualmente
    root.setTimeout(termina, retraso + DUR + 1500);
  }

