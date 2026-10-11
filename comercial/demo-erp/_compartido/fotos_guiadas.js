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
   Qué se hace con cada hint (la edge reenvía los de la base tal cual; 12-oct-2026, contra la migración 20261011170000 y el brief de la edge):
     · DEFINITIVO (sale de la cola, se pide otra foto con su motivo): fichero_tipo, foto_tipo, fichero_exif, fichero_grande, foto_tamano, clave_usada,
       foto_caducada, foto_sustituida, ranura, clave, datos, fotos_tope_dano, fotos_tope_orden, ya_cerrada, orden_vieja, orden_no_existe, foto_no_existe,
       origen, sin_acceso, modulo_apagado.
     · REINTENTABLE con LA MISMA clave (se queda en la cola): foto_sin_objeto, red caída, 5xx, 401/sin_sesion (al volver a entrar), y 429/tope_minuto
       (se reintenta solo pasados `reintenta_en` segundos).
   Reglas de pintado: solo createElement/createElementNS/textContent (nunca innerHTML); se engancha por data-accion / data-ranura / data-clave, nunca por un rótulo.
   Colores solo por var(--tema-*): el CSS de la casilla lo pone la pantalla que la usa.
   Uso: var F = axwFotosGuiadas({ T, h, caja, orden, fotos, edge: function(){ return url; }, token: function(){ return Promise<string>; }, alCambiar: fn, max_dano: 15 }); */
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
    'Frente': 'Front', 'Atrás': 'Back', 'Izquierda': 'Left', 'Derecha': 'Right', 'Cuentakilómetros': 'Odometer', 'Daño': 'Damage',
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
    'Sin sesión: vuelve a entrar.': 'No session: sign in again.'
  };
  var ID_FG = {
    'La foto tiene que ser WebP o JPEG: hazla otra vez.': 'Foto harus WebP atau JPEG: ambil lagi.',
    'La foto trae datos del móvil (ubicación): hazla otra vez.': 'Foto membawa data HP (lokasi): ambil lagi.',
    'La foto pesa demasiado: hazla otra vez.': 'Ukuran foto terlalu besar: ambil lagi.',
    'Esta orden ya tiene 40 fotos: no caben más.': 'Order ini sudah punya 40 foto: tidak bisa tambah lagi.',
    'No tienes acceso a Taller.': 'Anda tidak punya akses ke Bengkel.',
    'Demasiadas fotos seguidas: se reintenta en {n} s.': 'Terlalu banyak foto berturut-turut: dicoba lagi dalam {n} detik.',
    'Frente': 'Depan', 'Atrás': 'Belakang', 'Izquierda': 'Kiri', 'Derecha': 'Kanan', 'Cuentakilómetros': 'Odometer', 'Daño': 'Kerusakan',
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
    'Sin sesión: vuelve a entrar.': 'Sesi habis: masuk lagi.'
  };
  return { EN: EN_FG, ID: ID_FG };
}

function axwFotosGuiadas(cfg) {
  'use strict';
  var T = cfg.T || function (s) { return String(s); };
  var h = cfg.h;
  var MAX_BYTES = 600 * 1024;
  var MAX_DANO = cfg.max_dano || 15;
  var FIJAS = ['frente', 'atras', 'izquierda', 'derecha', 'cuentakm'];
  var ROTULO = { frente: 'Frente', atras: 'Atrás', izquierda: 'Izquierda', derecha: 'Derecha', cuentakm: 'Cuentakilómetros', dano: 'Daño' };
  function TT(k, v) { var s = T(k); Object.keys(v || {}).forEach(function (n) { s = s.split('{' + n + '}').join(String(v[n])); }); return s; }
  /* Hints que NO se arreglan reintentando la misma captura: sale de la cola y se pide otra foto, con su motivo. Lo que no está aquí (red, 5xx, 401,
     foto_sin_objeto, tope_minuto) se queda en la cola con su clave y se reintenta. Ver la cabecera. */
  var REPITE = 'La foto no se ha aceptado: hazla otra vez.', CERRADA = 'Esta orden ya no está abierta: vuelve al inicio.';
  var DEFINITIVOS = {
    fichero_tipo: 'La foto tiene que ser WebP o JPEG: hazla otra vez.', foto_tipo: 'La foto tiene que ser WebP o JPEG: hazla otra vez.',
    fichero_exif: 'La foto trae datos del móvil (ubicación): hazla otra vez.',
    fichero_grande: 'La foto pesa demasiado: hazla otra vez.', foto_tamano: 'La foto pesa demasiado: hazla otra vez.',
    clave_usada: REPITE, foto_caducada: REPITE, foto_sustituida: REPITE, ranura: REPITE, clave: REPITE, datos: REPITE, foto_no_existe: REPITE, origen: REPITE,
    fotos_tope_dano: 'Ya hay {max} fotos de daño en esta orden.', fotos_tope_orden: 'Esta orden ya tiene 40 fotos: no caben más.',
    ya_cerrada: CERRADA, orden_vieja: CERRADA, orden_no_existe: CERRADA,
    sin_acceso: 'No tienes acceso a Taller.', modulo_apagado: 'No tienes acceso a Taller.'
  };

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
    dbp = new Promise(function (ok, ko) {
      try {
        if (!window.indexedDB) { ko(new Error('sin indexedDB')); return; }
        var r = window.indexedDB.open('axw-fotos-cola', 1);
        r.onupgradeneeded = function () { var s = r.result.createObjectStore('cola', { keyPath: 'clave' }); s.createIndex('orden', 'orden'); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { ko(r.error || new Error('indexedDB')); };
      } catch (e) { ko(e); }
    }).catch(function (e) { volatil = true; return null; /* MUDO A PROPOSITO: sin IndexedDB la cola vive en memoria y la casilla lo DICE (aviso «Sin almacén en el móvil») */ });
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
  function colaDeOrden(orden) {
    return tx('readonly', function (s) { return s ? s.index('orden').getAll(orden) : null; }).then(function (lista) {
      var porClave = {};
      (Array.isArray(lista) ? lista : []).forEach(function (e) { porClave[e.clave] = e; });
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
  var base = {};      // ranura fija → {id, estado} confirmada en la base
  var danosBase = []; // [{id}]
  var local = {};     // clave → {ranura, estado: procesando|subiendo|pendiente|error, url (vista previa), msg}
  var vistaPrevia = {}; // ranura fija o clave de daño → objectURL
  var enCurso = {};
  var aviso = '';
  (Array.isArray(cfg.fotos) ? cfg.fotos : []).forEach(function (f) {
    if (!f || f.estado !== 'confirmada') return;
    if (f.ranura === 'dano') danosBase.push({ id: f.id }); else if (FIJAS.indexOf(f.ranura) !== -1) base[f.ranura] = { id: f.id };
  });
  var input = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'fg-input', 'data-fg': 'input', tabindex: '-1', 'aria-hidden': 'true' });
  var pidiendo = null;

  function estadoDe(ranura) {
    var claves = Object.keys(local).filter(function (k) { return local[k].ranura === ranura; });
    var ultimo = claves.length ? local[claves[claves.length - 1]] : null;
    if (ultimo) return ultimo.estado;
    return base[ranura] ? 'subida' : 'vacia';
  }
  function pendientes() { return Object.keys(local).filter(function (k) { return local[k].estado === 'pendiente'; }).length; }
  function faltanFijas() { return FIJAS.filter(function (r) { return !base[r]; }).length; }
  function danosHechos() { return danosBase.length + Object.keys(local).filter(function (k) { return local[k].ranura === 'dano' && local[k].estado !== 'error'; }).length; }
  function avisa() { if (typeof cfg.alCambiar === 'function') { try { cfg.alCambiar({ faltan: faltanFijas(), pendientes: pendientes() }); } catch (e) { /* MUDO A PROPOSITO: el aviso a la pantalla no puede tumbar la subida */ } } }

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
    return envoltura;
  }
  function pinta() {
    while (caja.firstChild) caja.removeChild(caja.firstChild);
    var grid = h('div', { class: 'fg-rejilla' });
    FIJAS.forEach(function (r) { grid.appendChild(casilla(r, null, estadoDe(r), base[r] && base[r].id)); });
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
    var n = pendientes();
    var fila = h('div', { class: 'fg-pendientes' + (n ? '' : ' axw-oculto'), 'data-fg': 'pendientes', role: 'status' }, [
      h('span', { text: TT('{n} sin subir', { n: n }) }),
      h('button', { type: 'button', class: 'axw-boton', 'data-accion': 'fg-reintentar', text: T('Reintentar') })]);
    caja.appendChild(fila);
    if (volatil) caja.appendChild(h('p', { class: 'axw-aviso', 'data-fg': 'volatil', text: T('Sin almacén en el móvil: si cierras la página, las fotos sin subir se pierden.') }));
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
  function sube(e) {
    if (enCurso[e.clave]) return Promise.resolve(false);
    enCurso[e.clave] = true;
    local[e.clave] = { ranura: e.ranura, estado: 'subiendo' };
    pinta();
    var fin = function (estado, msg) { delete enCurso[e.clave]; if (estado) local[e.clave] = { ranura: e.ranura, estado: estado, msg: msg || '' }; pinta(); };
    return Promise.resolve(cfg.token()).then(function (tok) {
      var fd = new FormData();
      fd.append('accion', 'sube'); fd.append('orden', e.orden); fd.append('ranura', e.ranura); fd.append('clave', e.clave);
      fd.append('fichero', e.blob, 'foto.' + (e.blob.type === 'image/webp' ? 'webp' : 'jpg'));
      return fetch(cfg.edge(), { method: 'POST', headers: cabeceras(tok, false), body: fd });
    }).then(function (r) {
      return r.json().then(function (d) { return { st: r.status, d: d }; }, function () { return { st: r.status, d: null }; });
    }).then(function (x) {
      var d = x.d || {};
      if (x.st >= 200 && x.st < 300 && d.ok === true && typeof d.foto_id === 'string') {
        aviso = '';
        if (e.ranura === 'dano') danosBase.push({ id: d.foto_id }); else base[e.ranura] = { id: d.foto_id };
        if (vistaPrevia[e.clave] && e.ranura !== 'dano') { vistaPrevia[e.ranura] = vistaPrevia[e.clave]; delete vistaPrevia[e.clave]; }
        delete local[e.clave]; delete enCurso[e.clave];
        return colaQuita(e.clave).then(function () { pinta(); return true; });
      }
      if (x.st === 401 || d.hint === 'sin_sesion') { fin('pendiente', T('Sin sesión: vuelve a entrar.')); return false; }
      if (x.st === 429 || d.hint === 'tope_minuto') {
        var s = Math.min(120, Math.max(1, Math.round(Number(d.reintenta_en) || 10)));
        fin('pendiente', TT('Demasiadas fotos seguidas: se reintenta en {n} s.', { n: s }));
        setTimeout(function () { if (!destruida) sube(e); }, s * 1000);
        return false;
      }
      if (d.hint && Object.prototype.hasOwnProperty.call(DEFINITIVOS, d.hint)) {
        var m = TT(DEFINITIVOS[d.hint], { max: MAX_DANO });
        return colaQuita(e.clave).then(function () { fin('error', m); return false; });
      }
      fin('pendiente'); return false;
    }, function () {
      aviso = T('Sin conexión: la foto queda guardada en el móvil y se sube al volver la red.');
      fin('pendiente'); return false;
    });
  }
  function reintenta() {
    return colaDeOrden(orden).then(function (lista) {
      return lista.reduce(function (p, e) { return p.then(function () { return sube(e); }); }, Promise.resolve());
    });
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
    /* Repetir una casilla FIJA: lo que quedaba de ella sin subir (error viejo o pendiente en la cola) se olvida. Si no, el error viejo tapaba la foto
       buena (estadoDe mira la última entrada) y una pendiente vieja que subiera DESPUÉS sustituiría en la base a la nueva. Lo que ya está subiendo no se toca. */
    if (ranura !== 'dano') {
      Object.keys(local).forEach(function (k) {
        if (local[k].ranura === ranura && !enCurso[k] && local[k].estado !== 'procesando') { delete local[k]; colaQuita(k); }
      });
    }
    var clave = uuid();
    local[clave] = { ranura: ranura, estado: 'procesando' };
    pinta();
    recodifica(f).then(function (blob) {
      var e = { clave: clave, orden: orden, ranura: ranura, blob: blob, creado: Date.now() };
      try { vistaPrevia[clave] = URL.createObjectURL(blob); } catch (x) { /* MUDO A PROPOSITO: sin vista previa se ve la silueta, la foto sigue */ }
      return colaPon(e).then(function () { return sube(e); });
    }, function () {
      local[clave] = { ranura: ranura, estado: 'error', msg: T('No se pudo preparar la foto: hazla otra vez.') };
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
    else if (a === 'fg-ver') ver(el.getAttribute('data-foto'), el);
  });
  var alVolverRed = function () { reintenta(); };
  window.addEventListener('online', alVolverRed);

  pinta();
  /* al abrir: lo que quedó en la cola de ESTA orden (pestaña descartada, red caída) se enseña como pendiente y se intenta una vez */
  colaDeOrden(orden).then(function (lista) {
    lista.forEach(function (e) { if (!local[e.clave]) local[e.clave] = { ranura: e.ranura, estado: 'pendiente' }; });
    pinta();
    if (lista.length) reintenta();
  });

  return {
    pinta: pinta, reintenta: reintenta, pendientes: pendientes, faltan: faltanFijas,
    destruye: function () { destruida = true; window.removeEventListener('online', alVolverRed); Object.keys(vistaPrevia).forEach(function (k) { try { URL.revokeObjectURL(vistaPrevia[k]); } catch (e) { /* MUDO A PROPOSITO: liberar memoria no es crítico */ } }); }
  };
}
