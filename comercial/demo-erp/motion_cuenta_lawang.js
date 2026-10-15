  var NUM = /^(\D*?)(\d{1,3}(?:\.\d{3})+|\d+)(,\d+)?(\D*)$/;
  /* La cifra que CUENTA es un adorno encima, nunca el dato (15-oct-2026, Calidad). El texto
     real del contador no se toca: lo leen innerText, los lectores de pantalla y quien copia.
     La cifra que sube va en una capa aria-hidden pintada con ::after (fuera de innerText) y el
     texto real solo se vuelve transparente mientras la capa existe. Antes se escribía «0» en el
     propio texto y se subía con requestAnimationFrame: hasta el primer fotograma, y para siempre
     en una pestaña oculta (rAF no corre), el contador decía 0 con el dato al lado (Experiencia
     lo leyó en Usuarios de bbm: «0 activos» con 2 en la lista y «2 usuarios» en el pie).
     Pestaña oculta → no se anima; si se oculta a medias, se termina en el acto. Menos
     movimiento: nav.js ni carga este fichero. */
  var ESTILO_CIFRA = false;
  function estiloCifra() {
    if (ESTILO_CIFRA) return;
    ESTILO_CIFRA = true;
    var st = document.createElement('style');
    st.textContent = '.lw-cifra-capa{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;white-space:nowrap}' +
      '.lw-cifra-capa::after{content:attr(data-v)}';
    document.head.appendChild(st);
  }
  function cuenta(el, delay) {
    if (document.hidden) return false;
    var orig = el.textContent, m = NUM.exec(orig.trim());
    if (!m) return false;
    var fin = parseInt(m[2].replace(/\./g, ''), 10);
    if (!(fin > 0)) return false;
    var dec = m[3] ? m[3].length - 1 : 0, mil = m[2].indexOf('.') !== -1;
    var fmt = function (v) {
      var t = mil ? Math.round(v).toLocaleString('de-DE') : String(Math.round(v));
      return m[1] + t + (dec ? ',' + new Array(dec + 1).join('0') : '') + m[4];
    };
    estiloCifra();
    var cs = getComputedStyle(el);
    var antes = { color: el.style.color, position: el.style.position, num: el.style.fontVariantNumeric };
    var capa = document.createElement('span');
    capa.className = 'lw-cifra-capa';
    capa.setAttribute('aria-hidden', 'true');
    capa.style.color = cs.color;                         // el texto real queda transparente: la capa lleva su color
    capa.style.textAlign = cs.textAlign;
    capa.setAttribute('data-v', fmt(0));
    // la capa se ancla al contador; se compara con las cuatro que ya son clases de Tailwind (la palabra suelta de la
    // quinta metía una regla nueva en las cuatro hojas compiladas, que escanean este fichero)
    if (!/^(relative|absolute|fixed|sticky)$/.test(cs.position)) el.style.position = 'relative';
    el.style.fontVariantNumeric = 'tabular-nums';       // que el ancho no baile mientras cuenta
    el.style.color = 'transparent';
    el.appendChild(capa);
    var hecho = false, dur = 900, t0 = performance.now() + delay;
    function termina() {                                 // toda salida pasa por aquí: fin, otra escritura, pestaña oculta, seguridad
      if (hecho) return;
      hecho = true;
      if (capa.parentNode) capa.parentNode.removeChild(capa);
      el.style.color = antes.color; el.style.position = antes.position; el.style.fontVariantNumeric = antes.num;
      document.removeEventListener('visibilitychange', alOcultar);
    }
    function alOcultar() { if (document.hidden) termina(); }
    document.addEventListener('visibilitychange', alOcultar);
    setTimeout(termina, delay + dur + 1500);             // si rAF se para, el dato no se queda tapado
    function tick(now) {
      if (hecho) return;
      /* Otra escritura (una consulta que llega tarde) manda: borra la capa o cambia el
         texto, y se retira la capa sin tocar el dato nuevo. */
      if (!capa.isConnected || el.textContent !== orig) return termina();
      var p = Math.min(1, Math.max(0, (now - t0) / dur));
      if (p >= 1) return termina();
      capa.setAttribute('data-v', fmt(fin * (1 - Math.pow(1 - p, 5))));
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return true;
  }

