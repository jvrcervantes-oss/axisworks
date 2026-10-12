/* Fotos guiadas: pieza COMÚN de las pantallas del ERP maestro (Taller 8.T1, 12-oct-2026; la reutiliza la entrega al cliente en 8.T3).
   Plan: encargos/20261008_erp_f8_bbm_inventario_reservas_plan.md §10.1 paso 4, §10.6 (Frontend #275 punto 5, Calidad #275) y §10.8 (Seguridad #275 punto 3).
   La inyecta build.py (_inyecta_comun) donde la pantalla escribe la marca AXW_FOTOS_JS en un comentario de bloque, dentro de su función autoejecutable.
   Qué hace:
     · una casilla por foto, con su silueta ANTES de abrir la cámara (frente, atrás, izquierda, derecha, cuentakm fijas; «daño» las que haga falta, con tope);
     · cámara trasera por <input type=file accept="image/*" capture="environment">;
     · re-codifica SIEMPRE en el móvil: createImageBitmap a ~1600 px de lado largo y toBlob('image/webp'); si el navegador no da webp (Safari) JPEG 0,8;
       si no cabe en 600 KB baja calidad y tamaño por escalones. El canvas sale sin EXIF ni GPS. Si la re-codificación falla NUNCA se sube el original;
     · cola de reintento en IndexedDB: cada captura se guarda ANTES del primer intento con su clave (uuid de la captura), por si Android descarta la pestaña al abrir
       la cámara o se va la red. El reintento usa LA MISMA clave: la base devuelve la misma fila (taller_foto_prepara es idempotente por clave) y no gasta topes.
   El navegador NO llama a taller_foto_prepara / taller_foto_confirma / taller_foto_ver: los llama la edge con la sesión del usuario. Esta pieza solo habla con la edge.
   Contrato con la edge `taller-fotos` (lo que esta pieza manda y espera; el formato del cuerpo lo fija esta pieza, Backend lo casa):
     POST <edge>, Authorization: Bearer <token de sesión>, multipart/form-data:
       accion=sube · orden=<uuid> · ranura=frente|atras|izquierda|derecha|cuentakm|dano · clave=<uuid de la captura> · fichero=<image/webp | image/jpeg, ≤ 600 KB>
       → 200 {ok:true, foto_id, ranura, estado:'confirmada'}  ·  4xx/5xx {ok:false, hint}  ·  429 {ok:false, hint:'tope_minuto', reintenta_en:<s>}
     POST <edge>, Authorization: Bearer <token>, application/json {accion:'ver', foto:<uuid>} → {ok:true, url} (firmada, 300 s)
   Qué se hace con cada respuesta (la edge reenvía los hints de la base tal cual, casi todos como 409; 12-oct-2026, contra la migración 20261011170000 y la cabecera de la edge),
   EN ESTE ORDEN (la regla genérica de 4xx va la última: fotos_tope_pendientes y foto_sin_objeto llegan como 409 y son reintentables):
     1. 401/sin_sesion → se queda en la cola (al volver a entrar) · 429/tope_minuto → se reintenta solo pasados `reintenta_en` segundos.
     2. fotos_tope_pendientes (10 a medio subir por orden) → se queda en la cola y el aviso dice qué hacer: Reintentar, o Descartar las que no suben.
     3. DEFINITIVO (sale de la cola, se pide otra foto con su motivo): fichero_tipo, foto_tipo, fichero_exif, fichero_grande, foto_tamano, clave_usada,
        foto_caducada, foto_sustituida, ranura, clave, datos, fotos_tope_dano, fotos_tope_orden, fotos_tope_dia, ya_cerrada, orden_vieja, orden_no_existe, foto_no_existe,
        origen, sin_acceso, modulo_apagado, campo_no_admitido, orden, fichero, fichero_vacio, cuerpo, accion, foto, metodo.
     4. REINTENTABLE con LA MISMA clave (se queda en la cola): foto_sin_objeto, almacen, base, sesion_no_comprobada, config.
     5. Cualquier otro 4xx salvo 401/408/429 (un 404 sin hint, un hint que esta pieza no conoce) → DEFINITIVO con el texto genérico. 5xx, 408 y red caída → cola.
   Vigencia por casilla FIJA (revisor 12-oct): gana SIEMPRE la última captura. Cuando la nueva ya está preparada se olvidan TODAS las anteriores de esa casilla y
   orden (en memoria y en la cola de IndexedDB, también las que nunca llegaron al servidor y las que se están subiendo): ninguna se vuelve a mandar, y la respuesta
   tardía de una que ya iba en camino no cuenta (ni su éxito ni su foto_caducada; la base, al preparar la nueva, deja caducada la pendiente vieja).
   Descartar: una foto pendiente que no sube (o una de daño rechazada) se quita de la cola local con su botón; la fila de la base, si llegó a crearse, caduca sola a las
   24 h. Así el paso nunca queda sin salida por una foto que no va a subir. La pantalla limpia la cola al arrancar con axwFotosLimpiaCola (48 h, órdenes no vivas
   y entradas de otro usuario).
   Segunda vuelta del revisor (12-oct): (a) el temporizador del 429 y cualquier camino tardío solo suben una clave que sigue «pendiente» (no reenvían una ya
   subida); (b) al abrir, una captura de la cola para una casilla fija que YA tiene foto confirmada en la base no sube sola ni con el Reintentar general: queda
   pendiente con SU botón Reintentar (data-accion fg-subir-anterior) y Descartar en la casilla, y un aviso; (c) cada entrada de la cola guarda el usuario de la sesión y la de otro usuario ni se sube ni se queda; (d) una captura nueva de una
   casilla fija espera (tope 30 s) a que termine la subida en curso de una vieja de esa casilla antes de mandarse.
   Reglas de pintado: solo createElement/createElementNS/textContent (nunca innerHTML); se engancha por data-accion / data-ranura / data-clave, nunca por un rótulo.
   Colores solo por var(--tema-*): el CSS de la casilla lo pone la pantalla que la usa.
   Uso: var F = axwFotosGuiadas({ T, h, caja, orden, fotos, edge: function(){ return url; }, token: function(){ return Promise<string>; }, alCambiar: fn, max_dano: 15, ambito: 'taller', usuario: <id de la sesión> }); y, al arrancar la pantalla, axwFotosLimpiaCola({ ambito, vivas, usuario }). */
/* Diccionarios de la pieza (clave en español, como el resto del maestro). Función aparte para que la pantalla los fusione en LW_EN / LW_ID al arrancar, antes de tener orden. */
function axwFotosDiccionario() {
  'use strict';
  var EN_FG = {
    'La foto tiene que ser WebP o JPEG: hazla otra vez.': 'The photo must be WebP or JPEG: take it again.',
    'La foto trae datos del móvil (ubicación): hazla otra vez.': 'The photo carries phone data (location): take it again.',
    'La foto pesa demasiado: hazla otra vez.': 'The photo is too large: take it again.',
    'Esta orden ya tiene 40 fotos: no caben más.': 'This order already has 40 photos: no more fit.',
    'No tienes acceso a Taller.': 'You do not have access to the Workshop.',
    'Demasiadas fotos seguidas: se reintenta en {n} s.': 'Too many photos in a row: retrying in {n} s.',
    'Demasiadas fotos a medio subir en esta orden: pulsa Reintentar, o Descartar en las que no suban (se liberan solas en 24 h).': 'Too many half-uploaded photos in this order: tap Retry, or Discard the ones that do not upload (they clear by themselves in 24 h).',
    'Demasiadas fotos en esta orden hoy: llama al encargado.': 'Too many photos in this order today: call the supervisor.',
    'Descartar': 'Discard',
    'Frente': 'Front', 'Parte de atrás': 'Back', 'Izquierda': 'Left', 'Derecha': 'Right', 'Cuentakilómetros': 'Odometer', 'Daño': 'Damage',
    'Toca para hacer la foto': 'Tap to take the photo', 'Preparando…': 'Preparing…', 'Subiendo…': 'Uploading…', 'Subida': 'Uploaded',
    'Pendiente de subir': 'Not uploaded yet', 'Repetir': 'Retake', 'Ver': 'View', 'Reintentar': 'Retry', '+ Foto de daño': '+ Damage photo',
    'Daños: {n} de {max}': 'Damage: {n} of {max}', '{n} sin subir': '{n} not uploaded',
    'No se pudo preparar la foto: hazla otra vez.': 'The photo could not be prepared: take it again.',
    'La foto no se ha aceptado: hazla otra vez.': 'The photo was not accepted: take it again.',
    'Ya hay {max} fotos de daño en esta orden.': 'This order already has {max} damage photos.',
    'Sin almacén en el móvil: si cierras la página, las fotos sin subir se pierden.': 'No storage on this phone: if you close the page, photos not uploaded are lost.',
    'No se pudo abrir la foto.': 'The photo could not be opened.',
    'Sin conexión: la foto queda guardada en el móvil y se sube al volver la red.': 'No connection: the photo stays on the phone and uploads when the network is back.',
    'Esta orden ya no está abierta: vuelve al inicio.': 'This order is no longer open: go back to the start.',
    'Sin sesión: vuelve a entrar.': 'No session: sign in again.',
    'Hay una foto anterior guardada en este móvil: pulsa Reintentar para subirla o Descartar.': 'There is an earlier photo saved on this phone: tap Retry to upload it, or Discard.'
  };
  var ID_FG = {
    'La foto tiene que ser WebP o JPEG: hazla otra vez.': 'Foto harus WebP atau JPEG: ambil lagi.',
    'La foto trae datos del móvil (ubicación): hazla otra vez.': 'Foto membawa data HP (lokasi): ambil lagi.',
    'La foto pesa demasiado: hazla otra vez.': 'Ukuran foto terlalu besar: ambil lagi.',
    'Esta orden ya tiene 40 fotos: no caben más.': 'Order ini sudah punya 40 foto: tidak bisa tambah lagi.',
    'No tienes acceso a Taller.': 'Anda tidak punya akses ke Bengkel.',
    'Demasiadas fotos seguidas: se reintenta en {n} s.': 'Terlalu banyak foto berturut-turut: dicoba lagi dalam {n} detik.',
    'Demasiadas fotos a medio subir en esta orden: pulsa Reintentar, o Descartar en las que no suban (se liberan solas en 24 h).': 'Terlalu banyak foto belum selesai di order ini: ketuk Coba lagi, atau Buang foto yang tidak terunggah (otomatis bebas dalam 24 jam).',
    'Demasiadas fotos en esta orden hoy: llama al encargado.': 'Terlalu banyak foto di order ini hari ini: hubungi penanggung jawab.',
    'Descartar': 'Buang',
    'Frente': 'Depan', 'Parte de atrás': 'Belakang', 'Izquierda': 'Kiri', 'Derecha': 'Kanan', 'Cuentakilómetros': 'Odometer', 'Daño': 'Kerusakan',
    'Toca para hacer la foto': 'Ketuk untuk foto', 'Preparando…': 'Menyiapkan…', 'Subiendo…': 'Mengunggah…', 'Subida': 'Terunggah',
    'Pendiente de subir': 'Belum terunggah', 'Repetir': 'Ulangi', 'Ver': 'Lihat', 'Reintentar': 'Coba lagi', '+ Foto de daño': '+ Foto kerusakan',
    'Daños: {n} de {max}': 'Kerusakan: {n} dari {max}', '{n} sin subir': '{n} belum terunggah',
    'No se pudo preparar la foto: hazla otra vez.': 'Foto gagal diproses: ambil lagi.',
    'La foto no se ha aceptado: hazla otra vez.': 'Foto ditolak: ambil lagi.',
    'Ya hay {max} fotos de daño en esta orden.': 'Sudah ada {max} foto kerusakan di order ini.',
    'Sin almacén en el móvil: si cierras la página, las fotos sin subir se pierden.': 'Tidak ada penyimpanan di HP: kalau halaman ditutup, foto yang belum terunggah hilang.',
    'No se pudo abrir la foto.': 'Foto tidak bisa dibuka.',
    'Sin conexión: la foto queda guardada en el móvil y se sube al volver la red.': 'Tidak ada sinyal: foto disimpan di HP dan diunggah saat sinyal kembali.',
    'Esta orden ya no está abierta: vuelve al inicio.': 'Order ini sudah tidak aktif: kembali ke awal.',
    'Sin sesión: vuelve a entrar.': 'Sesi habis: masuk lagi.',
    'Hay una foto anterior guardada en este móvil: pulsa Reintentar para subirla o Descartar.': 'Ada foto sebelumnya tersimpan di HP ini: ketuk Coba lagi untuk mengunggah, atau Buang.'
  };
  return { EN: EN_FG, ID: ID_FG };
}

/* La cola de IndexedDB (una base por origen; cada entrada {clave, orden, ranura, blob, creado, ambito, usuario}). Promesa con la base abierta, o rechazo si no hay.
   `usuario` es el id de la sesión que hizo la captura (revisor 12-oct, móvil compartido): una entrada de OTRO usuario nunca se sube con esta sesión. */
function axwFotosAbreCola() {
  'use strict';
  return new Promise(function (ok, ko) {
    try {
      if (!window.indexedDB) { ko(new Error('sin indexedDB')); return; }
      var r = window.indexedDB.open('axw-fotos-cola', 1);
      r.onupgradeneeded = function () { var s = r.result.createObjectStore('cola', { keyPath: 'clave' }); s.createIndex('orden', 'orden'); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { ko(r.error || new Error('indexedDB')); };
    } catch (e) { ko(e); }
  });
}
/* Limpieza al arrancar la pantalla (revisor 12-oct: la cola no se limpiaba nunca). Borra las entradas de más de 48 h (la base ya caducó su fila a las 24 h)
   y, SOLO si la pantalla pasa la lista COMPLETA de órdenes vivas (taller_datos contestó y no viene recortada), las de su ámbito cuya orden ya no está viva.
   Sin lista (no se pudo mirar) no se borra nada por orden: «no he podido mirar» no es «no está viva».
   Con `usuario` (el id de la sesión), borra además las de OTRO usuario, de cualquier ámbito (móvil compartido: sus fotos no se suben con esta sesión ni se quedan
   en el móvil). Sin usuario conocido no se borra nada por usuario. Devuelve cuántas borró (o null si no pudo abrir la cola). */
function axwFotosLimpiaCola(opc) {
  'use strict';
  opc = opc || {};
  var ambito = opc.ambito || 'taller';
  var vivas = Array.isArray(opc.vivas) ? opc.vivas.map(String) : null;
  var yo = typeof opc.usuario === 'string' && opc.usuario ? opc.usuario : null;
  var limite = Date.now() - 48 * 3600 * 1000;
  return axwFotosAbreCola().then(function (d) {
    return new Promise(function (ok, ko) {
      var n = 0;
      try {
        var t = d.transaction('cola', 'readwrite'), c = t.objectStore('cola').openCursor();
        c.onsuccess = function () {
          var cur = c.result;
          if (!cur) return;
          var e = cur.value || {};
          var vieja = !(Number(e.creado) > limite);
          var muerta = vivas !== null && (e.ambito || 'taller') === ambito && vivas.indexOf(String(e.orden)) === -1;
          var ajena = yo !== null && e.usuario !== yo;
          if (vieja || muerta || ajena) { cur.delete(); n++; }
          cur.continue();
        };
        t.oncomplete = function () { try { d.close(); } catch (x) { /* MUDO A PROPOSITO: cerrar la conexión no es crítico */ } ok(n); };
        t.onerror = function () { ko(t.error || new Error('indexedDB')); };
      } catch (e) { ko(e); }
    });
  }).catch(function () { return null; /* MUDO A PROPOSITO: sin cola legible no hay nada que limpiar; la pieza de fotos ya avisa si no hay almacén */ });
}

function axwFotosGuiadas(cfg) {
  'use strict';
  var T = cfg.T || function (s) { return String(s); };
  var h = cfg.h;
  var MAX_BYTES = 600 * 1024;
  var MAX_DANO = cfg.max_dano || 15;
  var FIJAS = ['frente', 'atras', 'izquierda', 'derecha', 'cuentakm'];
  var ROTULO = { frente: 'Frente', atras: 'Parte de atrás', izquierda: 'Izquierda', derecha: 'Derecha', cuentakm: 'Cuentakilómetros', dano: 'Daño' };
  function TT(k, v) { var s = T(k); Object.keys(v || {}).forEach(function (n) { s = s.split('{' + n + '}').join(String(v[n])); }); return s; }
  /* Hints que NO se arreglan reintentando la misma captura: sale de la cola y se pide otra foto, con su motivo. Lo que no está aquí (red, 5xx, 401,
     foto_sin_objeto, tope_minuto) se queda en la cola con su clave y se reintenta. Ver la cabecera. */
  var REPITE = 'La foto no se ha aceptado: hazla otra vez.', CERRADA = 'Esta orden ya no está abierta: vuelve al inicio.';
  var DEFINITIVOS = {
    fichero_tipo: 'La foto tiene que ser WebP o JPEG: hazla otra vez.', foto_tipo: 'La foto tiene que ser WebP o JPEG: hazla otra vez.',
    fichero_exif: 'La foto trae datos del móvil (ubicación): hazla otra vez.',
    fichero_grande: 'La foto pesa demasiado: hazla otra vez.', foto_tamano: 'La foto pesa demasiado: hazla otra vez.',
    clave_usada: REPITE, foto_caducada: REPITE, foto_sustituida: REPITE, ranura: REPITE, clave: REPITE, datos: REPITE, foto_no_existe: REPITE, origen: REPITE,
    campo_no_admitido: REPITE, orden: REPITE, fichero: REPITE, fichero_vacio: REPITE, cuerpo: REPITE, accion: REPITE, foto: REPITE, metodo: REPITE,
    fotos_tope_dano: 'Ya hay {max} fotos de daño en esta orden.', fotos_tope_orden: 'Esta orden ya tiene 40 fotos: no caben más.',
    fotos_tope_dia: 'Demasiadas fotos en esta orden hoy: llama al encargado.',
    ya_cerrada: CERRADA, orden_vieja: CERRADA, orden_no_existe: CERRADA,
    sin_acceso: 'No tienes acceso a Taller.', modulo_apagado: 'No tienes acceso a Taller.'
  };
  // reintentables con la MISMA clave aunque lleguen como 4xx (la edge da 409 a los de la base): van ANTES de la regla genérica de 4xx
  var REINTENTABLES = { foto_sin_objeto: 1, almacen: 1, base: 1, sesion_no_comprobada: 1, config: 1 };
  /* ── siluetas (SVG con createElementNS; trazo con currentColor) ── */
  var NS = 'http://www.w3.org/2000/svg';
  var TRAZOS = {
    lado: ['M22 60a14 14 0 1 0 0.1 0', 'M98 60a14 14 0 1 0 0.1 0', 'M22 60 L44 36 L76 36 L98 60', 'M44 36 L38 24 L54 24', 'M76 36 L86 20 L94 20', 'M50 46 L70 46'],
    frente: ['M30 20 L90 20', 'M30 20 L24 12', 'M90 20 L96 12', 'M60 30a8 8 0 1 0 0.1 0', 'M52 44 h16 v34 h-16 z', 'M48 28 L72 28'],
    atras: ['M34 22 L86 22', 'M48 30 h24 v8 h-24 z', 'M52 46 h16 v32 h-16 z', 'M40 22 L46 40 M80 22 L74 40'],
    cuentakm: ['M60 46a28 28 0 1 0 0.1 0', 'M60 46 L78 30', 'M36 46 L42 46 M78 46 L84 46 M60 22 L60 28', 'M50 60 h20'],
    dano: ['M60 44a30 30 0 1 0 0.1 0', 'M46 26 L58 42 L50 50 L66 66 L60 72', 'M74 30 L68 44 L78 50']
  };
  function silueta(ranura) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 120 84'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'fg-silueta');
    var tr = TRAZOS[ranura === 'izquierda' || ranura === 'derecha' ? 'lado' : ranura] || TRAZOS.dano;
    var g = document.createElementNS(NS, 'g');
    if (ranura === 'derecha') g.setAttribute('transform', 'translate(120 0) scale(-1 1)');
    tr.forEach(function (d) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '3');
      p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
      g.appendChild(p);
    });
    svg.appendChild(g);
    return svg;
  }

  /* ── cola de reintento (IndexedDB; si no hay, memoria y se dice) ── */
  var memoria = {};
  var volatil = false;
  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = axwFotosAbreCola().catch(function (e) { volatil = true; return null; /* MUDO A PROPOSITO: sin IndexedDB la cola vive en memoria y la casilla lo DICE (aviso «Sin almacén en el móvil») */ });
    return dbp;
  }
  function tx(modo, fn) {
    return db().then(function (d) {
      if (!d) return fn(null);
      return new Promise(function (ok, ko) {
        try {
          var t = d.transaction('cola', modo), s = t.objectStore('cola'), res = fn(s);
          t.oncomplete = function () { ok(res && res.result !== undefined ? res.result : res); };
          t.onerror = function () { ko(t.error || new Error('indexedDB')); };
        } catch (e) { ko(e); }
      });
    });
  }
  function colaPon(e) {
    memoria[e.clave] = e;
    return tx('readwrite', function (s) { return s ? s.put(e) : null; }).catch(function () { volatil = true; return null; /* MUDO A PROPOSITO: queda en memoria y la casilla avisa de que se perdería al cerrar */ });
  }
  function colaQuita(clave) {
    delete memoria[clave];
    return tx('readwrite', function (s) { return s ? s.delete(clave) : null; }).catch(function () { return null; /* MUDO A PROPOSITO: una entrada que no se pudo borrar se reintenta, y la base la reconoce por su clave (no duplica) */ });
  }
  // la sesión que captura: lo que haya en la cola de OTRO usuario (o sin usuario) se ignora aquí aunque la limpieza aún no lo haya borrado; sin usuario conocido
  // no se retoma nada de cargas anteriores (lo de esta carga vive en memoria)
  var yo = typeof cfg.usuario === 'string' && cfg.usuario ? cfg.usuario : null;
  if (yo === null) volatil = true;   // sin usuario la cola no se retoma al recargar: la casilla lo DICE (aviso «Sin almacén en el móvil»), no se calla
  function colaDeOrden(orden) {
    return tx('readonly', function (s) { return s ? s.index('orden').getAll(orden) : null; }).then(function (lista) {
      var porClave = {};
      (Array.isArray(lista) ? lista : []).forEach(function (e) { if (yo !== null && e.usuario === yo) porClave[e.clave] = e; });
      Object.keys(memoria).forEach(function (k) { if (memoria[k].orden === orden) porClave[k] = memoria[k]; });
      return Object.keys(porClave).map(function (k) { return porClave[k]; }).sort(function (a, b) { return a.creado - b.creado; });
    }, function () { volatil = true; return Object.keys(memoria).map(function (k) { return memoria[k]; }).filter(function (e) { return e.orden === orden; }); /* MUDO A PROPOSITO: sin lectura de la cola se usa la de memoria y se avisa */ });
  }

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    var b = new Uint8Array(16); window.crypto.getRandomValues(b);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var x = Array.prototype.map.call(b, function (n) { return (n + 256).toString(16).slice(1); }).join('');
    return x.slice(0, 8) + '-' + x.slice(8, 12) + '-' + x.slice(12, 16) + '-' + x.slice(16, 20) + '-' + x.slice(20);
  }

  /* ── re-codificación: webp si se puede, si no JPEG; ≤ 600 KB; nunca el original ── */
  function aBlob(canvas, tipo, q) {
    return new Promise(function (ok) { try { canvas.toBlob(function (b) { ok(b); }, tipo, q); } catch (e) { ok(null); /* MUDO A PROPOSITO: un toBlob que lanza es «este formato no»: se prueba el siguiente escalón */ } });
  }
  function recodifica(fichero) {
    if (typeof window.createImageBitmap !== 'function') return Promise.reject(new Error('sin_bitmap'));
    return window.createImageBitmap(fichero, { imageOrientation: 'from-image' })
      .catch(function () { return window.createImageBitmap(fichero); /* el navegador sin opciones: la orientación puede quedar como venga */ })
      .then(function (bmp) {
        var lados = [1600, 1280, 1024, 800], calidades = [0.8, 0.7, 0.6, 0.5];
        var pasos = [];
        lados.forEach(function (l) { calidades.forEach(function (q) { pasos.push([l, q]); }); });
        var webp = null;   // null = no se sabe; true/false tras el primer intento
        function intenta(i) {
          if (i >= pasos.length) return Promise.reject(new Error('no_cabe'));
          var l = pasos[i][0], q = pasos[i][1];
          var k = Math.min(1, l / Math.max(bmp.width, bmp.height));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
          c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
          var jpeg = function () {
            return aBlob(c, 'image/jpeg', q).then(function (b) {
              if (!b || b.type !== 'image/jpeg') return Promise.reject(new Error('sin_codificador'));
              return b.size <= MAX_BYTES ? b : intenta(i + 1);
            });
          };
          if (webp === false) return jpeg();
          return aBlob(c, 'image/webp', q).then(function (b) {
            if (!b || b.type !== 'image/webp') { webp = false; return jpeg(); }
            webp = true;
            return b.size <= MAX_BYTES ? b : intenta(i + 1);
          });
        }
        return intenta(0).then(function (b) { try { bmp.close(); } catch (e) { /* MUDO A PROPOSITO: liberar memoria no es crítico */ } return b; });
      });
  }

  /* ── estado y pintado ── */
  var caja = cfg.caja;
  var orden = cfg.orden;
  var ambito = cfg.ambito || 'taller';
  var base = {};      // ranura fija → {id, creado} confirmada en la base (creado: el de la captura que la subió en esta sesión; 0 si venía de la base)
  var danosBase = []; // [{id}]
  var local = {};     // clave → {ranura, estado: procesando|subiendo|pendiente|error, creado, msg, tope (pendiente por fotos_tope_pendientes),
                      //         anterior (captura de una carga anterior para una casilla fija que YA tiene foto confirmada: no sube sola, decide el mecánico)}
  var ultimoCreado = 0;
  function sello() { ultimoCreado = Math.max(Date.now(), ultimoCreado + 1); return ultimoCreado; }   // orden de captura estricto aunque dos caigan en el mismo ms
  var vistaPrevia = {}; // ranura fija o clave de daño → objectURL
  var enCurso = {};
  var aviso = '';
  (Array.isArray(cfg.fotos) ? cfg.fotos : []).forEach(function (f) {
    if (!f || f.estado !== 'confirmada') return;
    if (f.ranura === 'dano') danosBase.push({ id: f.id }); else if (FIJAS.indexOf(f.ranura) !== -1) base[f.ranura] = { id: f.id, creado: 0 };
  });
  var input = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'fg-input', 'data-fg': 'input', tabindex: '-1', 'aria-hidden': 'true' });
  var pidiendo = null;

  function ultimaClave(ranura) {   // la captura MÁS NUEVA de la casilla (por su sello), no la última insertada
    var claves = Object.keys(local).filter(function (k) { return local[k].ranura === ranura; });
    claves.sort(function (a, b) { return (local[a].creado || 0) - (local[b].creado || 0); });
    return claves.length ? claves[claves.length - 1] : null;
  }
  function estadoDe(ranura) {
    var k = ultimaClave(ranura);
    if (k) return local[k].estado;
    return base[ranura] ? 'subida' : 'vacia';
  }
  function pendientes() { return Object.keys(local).filter(function (k) { return local[k].estado === 'pendiente'; }).length; }
  function faltanFijas() { return FIJAS.filter(function (r) { return !base[r]; }).length; }
  function danosHechos() { return danosBase.length + Object.keys(local).filter(function (k) { return local[k].ranura === 'dano' && local[k].estado !== 'error'; }).length; }
  function cuenta(estados) { return Object.keys(local).filter(function (k) { return estados.indexOf(local[k].estado) !== -1; }).length; }
  function atascada() { return Object.keys(local).some(function (k) { return local[k].estado === 'pendiente' && local[k].tope; }); }
  function esAnterior(k) { return !!local[k] && local[k].estado === 'pendiente' && !!local[k].anterior && !enCurso[k]; }
  function hayAnterior() { return Object.keys(local).some(esAnterior); }
  function avisa() { if (typeof cfg.alCambiar === 'function') { try { cfg.alCambiar({ faltan: faltanFijas(), pendientes: pendientes(), tope: atascada(), anterior: hayAnterior() }); } catch (e) { /* MUDO A PROPOSITO: el aviso a la pantalla no puede tumbar la subida */ } } }
  /* Olvidar una captura: no se vuelve a mandar (olvidadas), sale de la pantalla y de la cola, y su vista previa se libera. Su respuesta, si ya iba en camino, no cuenta. */
  function olvida(k) {
    olvidadas[k] = true;
    delete local[k];
    if (vistaPrevia[k]) { try { URL.revokeObjectURL(vistaPrevia[k]); } catch (e) { /* MUDO A PROPOSITO: liberar memoria no es crítico */ } delete vistaPrevia[k]; }
    return colaQuita(k);
  }
  function descartable(k) { var l = local[k]; return !!l && !enCurso[k] && (l.estado === 'pendiente' || (l.ranura === 'dano' && l.estado === 'error')); }

  var TEXTO_ESTADO = { vacia: 'Toca para hacer la foto', procesando: 'Preparando…', subiendo: 'Subiendo…', subida: 'Subida', pendiente: 'Pendiente de subir', error: 'La foto no se ha aceptado: hazla otra vez.' };
  function casilla(ranura, clave, estado, idBase) {
    var dentro = [];
    var url = vistaPrevia[clave || ranura];
    if (url) dentro.push(h('img', { src: url, alt: '', class: 'fg-previa' }));
    else dentro.push(silueta(ranura));
    dentro.push(h('span', { class: 'fg-rotulo', text: T(ROTULO[ranura]) }));
    var msg = clave && local[clave] && local[clave].msg ? local[clave].msg : T(TEXTO_ESTADO[estado] || TEXTO_ESTADO.vacia);
    dentro.push(h('span', { class: 'fg-estado', text: msg }));
    var b = h('button', { type: 'button', class: 'fg-casilla', 'data-accion': 'fg-captura', 'data-ranura': ranura, 'data-estado': estado,
                          'aria-label': T(ROTULO[ranura]) + ': ' + msg }, dentro);
    if (estado === 'procesando' || estado === 'subiendo') b.disabled = true;
    var envoltura = h('div', { class: 'fg-celda', 'data-ranura': ranura }, [b]);
    if (clave) envoltura.setAttribute('data-clave', clave);
    if (estado === 'subida' && idBase && !url) envoltura.appendChild(h('button', { type: 'button', class: 'fg-mini', 'data-accion': 'fg-ver', 'data-foto': idBase, text: T('Ver') }));
    // una «anterior» (foto de una carga previa en una casilla ya confirmada) se sube SOLO con su propio botón: el Reintentar general nunca la manda
    if (clave && esAnterior(clave)) envoltura.appendChild(h('button', { type: 'button', class: 'fg-mini', 'data-accion': 'fg-subir-anterior', 'data-clave': clave,
                                                                       'aria-label': T('Reintentar') + ': ' + T(ROTULO[ranura]), text: T('Reintentar') }));
    if (clave && descartable(clave)) envoltura.appendChild(h('button', { type: 'button', class: 'fg-mini', 'data-accion': 'fg-descartar', 'data-clave': clave,
                                                                        'aria-label': T('Descartar') + ': ' + T(ROTULO[ranura]), text: T('Descartar') }));
    return envoltura;
  }
  function pinta() {
    while (caja.firstChild) caja.removeChild(caja.firstChild);
    var grid = h('div', { class: 'fg-rejilla' });
    // con su última captura: su mensaje (rechazo, 429, sin sesión) y su vista previa se ven también en las casillas fijas
    FIJAS.forEach(function (r) { grid.appendChild(casilla(r, ultimaClave(r), estadoDe(r), base[r] && base[r].id)); });
    caja.appendChild(grid);
    var dan = h('div', { class: 'fg-danos' });
    dan.appendChild(h('p', { class: 'fg-cuenta', 'data-fg': 'danos', text: TT('Daños: {n} de {max}', { n: danosHechos(), max: MAX_DANO }) }));
    var gd = h('div', { class: 'fg-rejilla' });
    danosBase.forEach(function (d) { gd.appendChild(casilla('dano', null, 'subida', d.id)); });
    Object.keys(local).forEach(function (k) { if (local[k].ranura === 'dano') gd.appendChild(casilla('dano', k, local[k].estado)); });
    dan.appendChild(gd);
    var mas = h('button', { type: 'button', class: 'axw-boton fg-mas', 'data-accion': 'fg-dano', text: T('+ Foto de daño') });
    if (danosHechos() >= MAX_DANO) mas.disabled = true;
    dan.appendChild(mas);
    caja.appendChild(dan);
    var n = pendientes() - Object.keys(local).filter(esAnterior).length;   // el Reintentar general no toca las «anteriores» (tienen su botón en la casilla)
    var fila = h('div', { class: 'fg-pendientes' + (n ? '' : ' axw-oculto'), 'data-fg': 'pendientes', role: 'status' }, [
      h('span', { text: TT('{n} sin subir', { n: n }) }),
      h('button', { type: 'button', class: 'axw-boton', 'data-accion': 'fg-reintentar', text: T('Reintentar') })]);
    caja.appendChild(fila);
    if (volatil) caja.appendChild(h('p', { class: 'axw-aviso', 'data-fg': 'volatil', text: T('Sin almacén en el móvil: si cierras la página, las fotos sin subir se pierden.') }));
    if (atascada()) caja.appendChild(h('p', { class: 'axw-aviso', 'data-fg': 'tope', role: 'status',
                                              text: T('Demasiadas fotos a medio subir en esta orden: pulsa Reintentar, o Descartar en las que no suban (se liberan solas en 24 h).') }));
    if (hayAnterior()) caja.appendChild(h('p', { class: 'axw-aviso', 'data-fg': 'anterior', role: 'status',
                                                 text: T('Hay una foto anterior guardada en este móvil: pulsa Reintentar para subirla o Descartar.') }));
    if (aviso) caja.appendChild(h('p', { class: 'axw-aviso', 'data-fg': 'aviso', role: 'status', text: aviso }));
    caja.appendChild(input);
    avisa();
  }

  /* ── subida (una a la vez por clave) ── */
  var destruida = false;
  function cabeceras(tok, json) {
    var c = { authorization: 'Bearer ' + (tok || '') };
    if (cfg.apikey) c.apikey = String(cfg.apikey);
    if (json) c['content-type'] = 'application/json';
    return c;
  }
  var olvidadas = {};   // capturas sustituidas por una repetición de su casilla o descartadas: un temporizador, una vuelta de reintento o una respuesta tardía no cuentan
  var esperas = {};     // clave → temporizador del 429 (uno por clave; se anula si la clave vuelve a subir por otro camino)
  var vuelo = {};       // clave → promesa de su subida en curso (una captura nueva de la misma casilla fija espera a que termine)
  /* Solo sube lo que está por subir: la captura recién preparada (procesando) o una pendiente. Cualquier camino asíncrono (el temporizador del 429, una vuelta de
     reintento, la red que vuelve) que llegue tarde a una clave ya subida, olvidada o en camino no la resucita (revisor 12-oct: el 429 reenviaba una ya subida). */
  function sube(e) {
    var l = local[e.clave];
    if (enCurso[e.clave] || olvidadas[e.clave] || destruida || !l || (l.estado !== 'pendiente' && l.estado !== 'procesando')) return Promise.resolve(false);
    if (esperas[e.clave]) { clearTimeout(esperas[e.clave]); delete esperas[e.clave]; }
    enCurso[e.clave] = true;
    local[e.clave] = { ranura: e.ranura, estado: 'subiendo', creado: e.creado || 0 };
    pinta();
    var fin = function (estado, msg, extra) {
      delete enCurso[e.clave];
      if (estado) { local[e.clave] = { ranura: e.ranura, estado: estado, msg: msg || '', creado: e.creado || 0 }; if (extra) Object.keys(extra).forEach(function (k) { local[e.clave][k] = extra[k]; }); }
      pinta();
    };
    // una repetición de la casilla o un Descartar mientras esta iba en camino: su respuesta no cuenta (ni su éxito pisa a la nueva, ni su error se pinta)
    var olvidada = function () { if (!olvidadas[e.clave]) return false; delete enCurso[e.clave]; if (!destruida) pinta(); return true; };
    var p = Promise.resolve(cfg.token()).then(function (tok) {
      var fd = new FormData();
      fd.append('accion', 'sube'); fd.append('orden', e.orden); fd.append('ranura', e.ranura); fd.append('clave', e.clave);
      fd.append('fichero', e.blob, 'foto.' + (e.blob.type === 'image/webp' ? 'webp' : 'jpg'));
      return fetch(cfg.edge(), { method: 'POST', headers: cabeceras(tok, false), body: fd });
    }).then(function (r) {
      return r.json().then(function (d) { return { st: r.status, d: d }; }, function () { return { st: r.status, d: null }; });
    }).then(function (x) {
      if (olvidada()) return false;
      var d = x.d || {};
      var hint = typeof d.hint === 'string' ? d.hint : '';
      var tiene = function (o) { return !!hint && Object.prototype.hasOwnProperty.call(o, hint); };
      if (x.st >= 200 && x.st < 300 && d.ok === true && typeof d.foto_id === 'string') {
        aviso = '';
        if (e.ranura === 'dano') { if (!danosBase.some(function (x) { return x.id === d.foto_id; })) danosBase.push({ id: d.foto_id }); }   // la misma clave = la misma foto (repetida)
        else if (!(base[e.ranura] && base[e.ranura].creado > (e.creado || 0))) {   // solo si es más nueva que la que ya está (gana la última captura)
          base[e.ranura] = { id: d.foto_id, creado: e.creado || 0 };
          if (vistaPrevia[e.clave]) { if (vistaPrevia[e.ranura]) { try { URL.revokeObjectURL(vistaPrevia[e.ranura]); } catch (z) { /* MUDO A PROPOSITO: liberar memoria no es crítico */ } } vistaPrevia[e.ranura] = vistaPrevia[e.clave]; delete vistaPrevia[e.clave]; }
        }
        delete local[e.clave]; delete enCurso[e.clave];
        return colaQuita(e.clave).then(function () { pinta(); return true; });
      }
      if (x.st === 401 || hint === 'sin_sesion') { fin('pendiente', T('Sin sesión: vuelve a entrar.')); return false; }
      if (x.st === 429 || hint === 'tope_minuto') {
        var s = Math.min(120, Math.max(1, Math.round(Number(d.reintenta_en) || 10)));
        fin('pendiente', TT('Demasiadas fotos seguidas: se reintenta en {n} s.', { n: s }));
        if (esperas[e.clave]) clearTimeout(esperas[e.clave]);
        // solo si la clave SIGUE pendiente cuando salta: si entretanto Reintentar la subió (o se repitió, se descartó o la pieza se cerró) no se reenvía
        esperas[e.clave] = setTimeout(function () { delete esperas[e.clave]; if (local[e.clave] && local[e.clave].estado === 'pendiente') sube(e); }, s * 1000);
        return false;
      }
      if (hint === 'fotos_tope_pendientes') {   // 10 pendientes vivas por orden: REINTENTABLE con la misma clave; sin reintento solo, y el aviso dice qué hacer
        fin('pendiente', '', { tope: true });   // el aviso largo lo pinta pinta() mientras quede alguna así (data-fg="tope")
        return false;
      }
      if (tiene(DEFINITIVOS)) {
        // foto_caducada / foto_sustituida de una captura de casilla fija cuando ya hay en la base una MÁS NUEVA de esa casilla: la vigente es la nueva, no hay error que pintar
        if ((hint === 'foto_caducada' || hint === 'foto_sustituida') && e.ranura !== 'dano' && base[e.ranura] && base[e.ranura].creado > (e.creado || 0)) {
          delete enCurso[e.clave];
          return olvida(e.clave).then(function () { pinta(); return false; });
        }
        var m = TT(DEFINITIVOS[hint], { max: MAX_DANO });
        return colaQuita(e.clave).then(function () { fin('error', m); return false; });
      }
      if (tiene(REINTENTABLES) || x.st >= 500 || x.st === 408 || x.st < 400) { fin('pendiente'); return false; }
      // cualquier otro 4xx (un 404 sin hint, un hint que esta pieza no conoce): reintentar la misma captura no lo arregla → definitivo, con el texto genérico
      return colaQuita(e.clave).then(function () { fin('error', T(REPITE)); return false; });
    }, function () {
      if (olvidada()) return false;
      aviso = T('Sin conexión: la foto queda guardada en el móvil y se sube al volver la red.');
      fin('pendiente'); return false;
    });
    var v = { p: p, ranura: e.ranura, creado: e.creado || 0 };
    vuelo[e.clave] = v;
    var suelta = function () { if (vuelo[e.clave] === v) delete vuelo[e.clave]; };
    p.then(suelta, suelta);
    return p;
  }
  /* Lo que una captura NUEVA de una casilla fija espera antes de mandarse (revisor 12-oct, carrera de la vieja en camino): las subidas en curso de capturas
     anteriores de esa casilla. Si la vieja llegara a la edge DESPUÉS que la nueva, la base caducaría la nueva al preparar la vieja y ganaría la foto antigua.
     Con tope de 30 s: una petición colgada no deja la casilla en «Preparando…» para siempre (pasado el tope se manda como antes). */
  function esperaViejas(ranura, creado) {
    var lista = Object.keys(vuelo).filter(function (k) { return vuelo[k].ranura === ranura && vuelo[k].creado < creado; })
                                  .map(function (k) { return vuelo[k].p.catch(function () { return null; /* MUDO A PROPOSITO: solo se espera a que termine, su resultado lo pinta sube() */ }); });
    if (!lista.length) return Promise.resolve();
    return Promise.race([Promise.all(lista), new Promise(function (ok) { setTimeout(ok, 30000); })]);
  }
  /* Una vuelta de reintento a la vez (Reintentar, la red que vuelve y el arranque no se solapan); cada entrada se mira JUSTO antes de subirla: si ya subió,
     se repitió su casilla o salió de la cola, no se sube. Las «anteriores» (captura de una carga previa para una casilla que ya tiene foto confirmada) NUNCA
     van en una vuelta (ni el arranque, ni la red que vuelve, ni el Reintentar general, que el mecánico pulsa por otra foto): solo con el botón de su casilla. */
  var vuelta = null;
  function reintenta() {
    if (vuelta) return vuelta;
    vuelta = colaDeOrden(orden).then(function (lista) {
      return lista.reduce(function (p, e) { return p.then(function () { var l = local[e.clave]; return l && l.estado === 'pendiente' && !l.anterior ? sube(e) : false; }); }, Promise.resolve());
    }).then(function () { vuelta = null; }, function () { vuelta = null; /* MUDO A PROPOSITO: una vuelta que falla deja las fotos «pendiente» a la vista, con su Reintentar */ });
    return vuelta;
  }

  function captura(ranura) {
    if (ranura === 'dano' && danosHechos() >= MAX_DANO) { aviso = TT('Ya hay {max} fotos de daño en esta orden.', { max: MAX_DANO }); pinta(); return; }
    pidiendo = ranura;
    input.value = '';
    input.click();
  }
  input.addEventListener('change', function () {
    var f = input.files && input.files[0];
    var ranura = pidiendo; pidiendo = null;
    if (!f || !ranura) return;
    var clave = uuid(), creado = sello();
    local[clave] = { ranura: ranura, estado: 'procesando', creado: creado };
    pinta();
    recodifica(f).then(function (blob) {
      if (olvidadas[clave] || destruida) return;   // mientras se preparaba, otra captura MÁS NUEVA de esta casilla ya quedó lista: esta no se manda
      /* Repetir una casilla FIJA (revisor 12-oct): cuando la nueva ya está preparada se olvidan TODAS las anteriores de esa casilla y orden —en memoria y en la
         cola de IndexedDB, también las que nunca llegaron al servidor, las que se están preparando y las que ya van en camino—, y la nueva no se manda hasta
         que han salido de la cola. Si no, una vieja enviada DESPUÉS caducaba en la base a la nueva (la base caduca la pendiente anterior de la casilla al
         preparar otra) y ganaba la foto antigua. Si la nueva no se puede preparar, las viejas siguen donde estaban. */
      var previo = Promise.resolve();
      if (ranura !== 'dano') {
        Object.keys(local).forEach(function (k) { if (k !== clave && local[k].ranura === ranura && (local[k].creado || 0) < creado) olvida(k); });
        previo = colaDeOrden(orden).then(function (lista) {
          return Promise.all(lista.filter(function (x) { return x.clave !== clave && x.ranura === ranura && (x.creado || 0) < creado; })
                                  .map(function (x) { return olvida(x.clave); }));
        });
      }
      var e = { clave: clave, orden: orden, ranura: ranura, blob: blob, creado: creado, ambito: ambito, usuario: yo };
      try { vistaPrevia[clave] = URL.createObjectURL(blob); } catch (x) { /* MUDO A PROPOSITO: sin vista previa se ve la silueta, la foto sigue */ }
      return previo.then(function () {
        if (olvidadas[clave]) return false;   // una aún más nueva la olvidó mientras tanto
        // ya en la cola (sobrevive a que se cierre la pestaña), espera a que acabe la subida en curso de una vieja de esta casilla y solo entonces se manda
        return colaPon(e).then(function () { return ranura !== 'dano' ? esperaViejas(ranura, creado) : null; })
          .then(function () { return olvidadas[clave] ? colaQuita(clave).then(function () { return false; }) : sube(e); });
      });
    }, function () {
      if (olvidadas[clave]) return;
      local[clave] = { ranura: ranura, estado: 'error', creado: creado, msg: T('No se pudo preparar la foto: hazla otra vez.') };
      pinta();
    });
  });

  function ver(idFoto, boton) {
    boton.disabled = true;
    return Promise.resolve(cfg.token()).then(function (tok) {
      return fetch(cfg.edge(), { method: 'POST', headers: cabeceras(tok, true), body: JSON.stringify({ accion: 'ver', foto: idFoto }) });
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || d.ok !== true || typeof d.url !== 'string' || !/^https:\/\//.test(d.url)) throw new Error('ver');
      var celda = boton.parentNode;
      var img = h('img', { src: d.url, alt: '', class: 'fg-previa' });
      var b = celda.querySelector('.fg-casilla'), sil = b && b.querySelector('.fg-silueta');
      if (sil) b.replaceChild(img, sil);
      celda.removeChild(boton);
    }).catch(function () { boton.disabled = false; aviso = T('No se pudo abrir la foto.'); pinta(); });
  }

  caja.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-accion]') : null;
    if (!el || !caja.contains(el)) return;
    var a = el.getAttribute('data-accion');
    if (a === 'fg-captura') captura(el.getAttribute('data-ranura'));
    else if (a === 'fg-dano') captura('dano');
    else if (a === 'fg-reintentar') { aviso = ''; reintenta(); }
    else if (a === 'fg-subir-anterior') {   // el mecánico decide subir ESA foto anterior (sustituirá a la confirmada): solo esa clave
      var ka = el.getAttribute('data-clave');
      if (ka && esAnterior(ka)) {
        aviso = '';
        colaDeOrden(orden).then(function (lista) {
          var e = lista.filter(function (x) { return x.clave === ka; })[0];
          if (e && esAnterior(ka)) return sube(e);
          if (!e && local[ka]) { local[ka].msg = T('No se pudo abrir la foto.'); pinta(); }   // ya no está en la cola: se dice, no se queda callado
          return false;
        });
      }
    }
    else if (a === 'fg-ver') ver(el.getAttribute('data-foto'), el);
    else if (a === 'fg-descartar') {   // solo la cola LOCAL: el navegador no escribe en la base; la fila pendiente, si llegó a crearse, caduca sola a las 24 h
      var k = el.getAttribute('data-clave');
      if (k && descartable(k)) { aviso = ''; olvida(k).then(function () { pinta(); }); pinta(); }
    }
  });
  var alVolverRed = function () { reintenta(); };
  window.addEventListener('online', alVolverRed);

  pinta();
  /* al abrir: lo que quedó en la cola de ESTA orden (pestaña descartada, red caída) se enseña como pendiente y se intenta una vez */
  /* de una casilla FIJA solo vale la captura más nueva: si en la cola quedaron varias (cargas anteriores), las viejas se olvidan antes de mandar nada */
  /* y si esa casilla YA tiene foto confirmada en la base (cfg.fotos), la captura de la cola NO se manda sola (revisor 12-oct): puede ser una vieja de otra pestaña
     o de antes de que otro la repitiera, y en la base confirmar sustituye. Se enseña pendiente con Reintentar y Descartar y el aviso lo pregunta. No se comparan
     horas del móvil con las de la base: decide el mecánico. Solo cuenta la cola de ESTA sesión (colaDeOrden filtra por usuario). */
  colaDeOrden(orden).then(function (lista) {
    var nueva = {};
    lista.forEach(function (e) { if (e.ranura !== 'dano' && (!nueva[e.ranura] || (e.creado || 0) > (nueva[e.ranura].creado || 0))) nueva[e.ranura] = e; });
    var viejas = lista.filter(function (e) { return e.ranura !== 'dano' && nueva[e.ranura] !== e; });
    viejas.forEach(function (e) { olvida(e.clave); });
    var auto = 0;
    lista.forEach(function (e) {
      if (e.creado > ultimoCreado) ultimoCreado = e.creado;
      if (olvidadas[e.clave] || local[e.clave]) return;
      var anterior = e.ranura !== 'dano' && !!base[e.ranura];
      local[e.clave] = { ranura: e.ranura, estado: 'pendiente', creado: e.creado || 0, anterior: anterior };
      if (!anterior) auto++;
    });
    pinta();
    if (auto) reintenta();
  });

  return {
    pinta: pinta, reintenta: reintenta, pendientes: pendientes, faltan: faltanFijas,
    sinSubir: function () { return cuenta(['procesando', 'subiendo', 'pendiente']); },
    // qué falta por subir y si hay salida: en marcha (esperar), pendientes (Reintentar o Descartar), tope (fotos_tope_pendientes: el aviso dice qué hacer)
    estadoSubida: function () { return { enMarcha: cuenta(['procesando', 'subiendo']), pendientes: cuenta(['pendiente']), tope: atascada(), anterior: hayAnterior() }; },
    destruye: function () { destruida = true; window.removeEventListener('online', alVolverRed);
      Object.keys(esperas).forEach(function (k) { clearTimeout(esperas[k]); delete esperas[k]; }); Object.keys(vistaPrevia).forEach(function (k) { try { URL.revokeObjectURL(vistaPrevia[k]); } catch (e) { /* MUDO A PROPOSITO: liberar memoria no es crítico */ } }); }
  };
}
