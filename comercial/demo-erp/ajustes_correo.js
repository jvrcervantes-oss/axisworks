  /* ── F3.1 · Correo desde Ajustes (ERP MAESTRO; 7-oct-2026) ───────────────────────────────────────────────────────
   * Este trozo NO es de Lawang: lo mete comercial/demo-erp/build.py (ajustes_correo_maestro) DENTRO del IIFE de ajustes.js, justo antes de
   * `function arranca()`. Por eso ve `sb`, `datos`, `CAMPOS`, `esc`, `T`… sin exponerlos.
   * Qué añade, y solo esto:
   *  1. «Servidor de salida» (host, puerto 465 fijo, usuario, contraseña, nombre del remitente) sobre la pestaña Correo. El navegador NO
   *     guarda nada: llama a la edge `ajustes-correo` con la sesión (acciones `estado` y `probar_y_guardar`) y la edge prueba con un envío real
   *     y solo entonces promueve. La contraseña viaja una vez en el cuerpo, nunca se pinta, nunca se prefija y se vacía pase lo que pase.
   *  2. Tres casillas más en el formulario de Correo (email_avisos_soporte, email_avisos_sistema, asunto_por_defecto) que escribe la RPC
   *     `ajustes_config_guardar` como las demás — solo si la base las declara editables (`datos.editables`): sin la migración 20261007210000 no salen.
   * Reglas: solo códigos traducidos (jamás el texto del servidor, ni el host tecleado de vuelta como mensaje); todo dato a la pantalla por
   * textContent/atributos, nunca por innerHTML; enganche por data-accion / data-correo-*, nunca por un rótulo. */
  var EN_CORREO = {
    'Servidor de salida': 'Outgoing mail server',
    'El servidor SMTP desde el que salen todos los correos de este ERP. Se prueba con un envío real a tu correo y solo si llega se guarda; si falla, sigue el anterior.': 'The SMTP server every email of this ERP goes out through. It is tested with a real email to your address and only saved if it arrives; if it fails, the previous one stays.',
    'Servidor': 'Server', 'Puerto': 'Port', 'Usuario del buzón': 'Mailbox user', 'Contraseña del buzón': 'Mailbox password',
    'Nombre del remitente': 'Sender name', 'opcional': 'optional',
    'Siempre 465 (conexión cifrada). No se puede cambiar.': 'Always 465 (encrypted connection). It cannot be changed.',
    'Nunca se muestra la guardada: escribe la del buzón cada vez que pruebes.': 'The saved one is never shown: type the mailbox password each time you test.',
    'Tu contraseña de la cuenta': 'Your account password',
    'Para cambiar de servidor o de usuario confirma tu contraseña de acceso al ERP (o vuelve a entrar y repite).': 'To change the server or the user, confirm your ERP sign-in password (or sign in again and retry).',
    'Probar y guardar': 'Test and save', 'Probando…': 'Testing…', 'Reintentar': 'Retry',
    'Trayendo el estado del servidor…': 'Loading the server status…',
    'Sin servidor guardado: los correos salen con la configuración de origen de la instalación.': 'No saved server: emails go out with the installation default settings.',
    'Servidor actual': 'Current server', 'usuario': 'user', 'puerto': 'port', 'puesto el': 'set on',
    'Hay un servidor anterior guardado como copia.': 'A previous server is kept as a backup.',
    'Intentos recientes': 'Recent attempts', 'de': 'of',
    'Los envíos de correo están en pausa (Mantenimiento): no se puede probar ni guardar hasta reanudarlos.': 'Email sending is paused (Maintenance): nothing can be tested or saved until it resumes.',
    'Remitente de los correos (casilla de abajo)': 'Sender of the emails (field below)',
    'Los correos saldrán desde': 'Emails will go out from',
    'porque el remitente de Ajustes no es del dominio del buzón. Cambia el remitente en la casilla de abajo y guárdalo antes de probar.': 'because the sender in Settings is not on the mailbox domain. Change the sender in the field below and save it before testing.',
    'porque el remitente de Ajustes no es una dirección válida.': 'because the sender in Settings is not a valid address.',
    'No hay remitente válido: el usuario del buzón no es un correo. Pon un remitente de tu dominio en la casilla de abajo.': 'There is no valid sender: the mailbox user is not an email address. Set a sender of your domain in the field below.',
    'Solo el super admin puede ver y cambiar el servidor de correo.': 'Only the super admin can see and change the mail server.',
    'Guardado. Se envió un correo de prueba a': 'Saved. A test email was sent to',
    'Se avisó del cambio por el servidor anterior.': 'The change was announced through the previous server.',
    'No se pudo avisar por el servidor anterior (el cambio se hizo igualmente).': 'The previous server could not announce it (the change was made anyway).',
    'No hay un buzón de avisos del sistema válido: no se avisó del cambio. Configúralo en la casilla de abajo.': 'There is no valid system alerts mailbox: the change was not announced. Set it in the field below.',
    'No se guardó': 'Not saved', 'Código técnico': 'Technical code',
    'No se ha podido leer el estado del servidor': 'The server status could not be read',
    'El servicio de correo todavía no está disponible en esta instalación. Inténtalo más tarde.': 'The mail service is not available in this installation yet. Try again later.',
    'No se ha podido contactar con el servicio de correo (sin conexión, o todavía no está disponible).': 'The mail service could not be reached (no connection, or not available yet).',
    'La respuesta del servicio de correo no se entiende. Inténtalo de nuevo.': 'The mail service answer is not understood. Try again.',
    'Respuesta no reconocida del servicio de correo.': 'Unrecognised answer from the mail service.',
    'Pon un servidor válido: un nombre de internet como smtp.tuproveedor.com, sin IP ni nombres internos.': 'Enter a valid server: an internet name like smtp.yourprovider.com, no IP or internal names.',
    'El puerto tiene que ser 465.': 'The port must be 465.',
    'El usuario del buzón va de 1 a 254 caracteres y sin caracteres de control.': 'The mailbox user is 1 to 254 characters with no control characters.',
    'La contraseña del buzón va de 1 a 200 caracteres y sin saltos de línea.': 'The mailbox password is 1 to 200 characters with no line breaks.',
    'El nombre del remitente admite 60 caracteres, sin < ni >.': 'The sender name allows 60 characters, no < or >.',
    'Ese servidor no existe (no resuelve en internet).': 'That server does not exist (it does not resolve on the internet).',
    'Ese servidor apunta a una red interna: solo se admite un servidor público.': 'That server points to an internal network: only a public server is accepted.',
    'El usuario del buzón no es un correo y no hay remitente válido: pon uno de tu dominio en la casilla de abajo.': 'The mailbox user is not an email and there is no valid sender: set one of your domain in the field below.',
    'Tu cuenta no tiene un correo válido al que mandar la prueba.': 'Your account has no valid email to send the test to.',
    'Tu sesión ha caducado: recarga la página o vuelve a entrar.': 'Your session has expired: reload the page or sign in again.',
    'Confirma tu contraseña de la cuenta para cambiar de servidor (o vuelve a entrar y repite).': 'Confirm your account password to change the server (or sign in again and retry).',
    'Esa no es la contraseña de tu cuenta.': 'That is not your account password.',
    'Cambiar el servidor de correo exige super admin.': 'Changing the mail server requires super admin.',
    'Esta página no está autorizada a llamar al servicio de correo.': 'This page is not allowed to call the mail service.',
    'La petición es demasiado grande.': 'The request is too large.',
    'La prueba ya no vale: repítela.': 'The test is no longer valid: repeat it.',
    'Demasiados intentos seguidos: espera unos minutos.': 'Too many attempts in a row: wait a few minutes.',
    'La base no ha respondido: inténtalo de nuevo en un rato.': 'The database did not answer: try again in a while.',
    'Los envíos de correo están en pausa: no se prueba ni se guarda nada hasta reanudarlos (no es un fallo de la contraseña).': 'Email sending is paused: nothing is tested or saved until it resumes (it is not a password problem).',
    'El servidor no ha aceptado la prueba: no se ha guardado y sigue el anterior.': 'The server did not accept the test: nothing was saved and the previous one stays.',
    'No se pudo iniciar sesión en el servidor: revisa servidor, usuario y contraseña.': 'Could not sign in to the server: check server, user and password.',
    'Se conectó, pero no se pudo enviar el correo de prueba.': 'It connected, but the test email could not be sent.',
    'Buzón de avisos de soporte': 'Support alerts mailbox',
    'Recibe los avisos de soporte. Un solo correo, del dominio de la instalación, del remitente o del servidor de correo.': 'Receives support alerts. A single email, of the installation domain, the sender or the mail server.',
    'Buzón de avisos del sistema': 'System alerts mailbox',
    'Recibe los avisos del sistema, entre ellos el de «han cambiado el servidor de correo». Un solo correo, del dominio de la instalación, del remitente o del servidor de correo.': 'Receives system alerts, including the «the mail server was changed» one. A single email, of the installation domain, the sender or the mail server.',
    'Asunto por defecto': 'Default subject',
    'El asunto de los correos que no traen el suyo. Vacío = el de fábrica («Documento — marca»).': 'The subject of emails that do not bring their own. Empty = the factory one («Document — brand»).',
    'Lo lee el envío de correos de este ERP en cada correo que manda.': 'The ERP email sender reads it on every email it sends.'
  };
  if (window.LW_EN && typeof window.LW_EN === 'object') {
    Object.keys(EN_CORREO).forEach(function (k) { if (!(k in window.LW_EN)) window.LW_EN[k] = EN_CORREO[k]; });
  }
  var TEXTO_LEE_CORREO = 'Lo lee el envío de correos de este ERP en cada correo que manda.';
  var LEE_CORREO = { email_avisos_soporte: 1, email_avisos_sistema: 1, asunto_por_defecto: 1 };
  var EXTRA_CORREO = [
    { clave: 'email_avisos_soporte', etiqueta: 'Buzón de avisos de soporte', tipo: 'email', max: 254,
      ayuda: 'Recibe los avisos de soporte. Un solo correo, del dominio de la instalación, del remitente o del servidor de correo.' },
    { clave: 'email_avisos_sistema', etiqueta: 'Buzón de avisos del sistema', tipo: 'email', max: 254,
      ayuda: 'Recibe los avisos del sistema, entre ellos el de «han cambiado el servidor de correo». Un solo correo, del dominio de la instalación, del remitente o del servidor de correo.' },
    { clave: 'asunto_por_defecto', etiqueta: 'Asunto por defecto', tipo: 'text', max: 200, opcional: true,
      ayuda: 'El asunto de los correos que no traen el suyo. Vacío = el de fábrica («Documento — marca»).' }
  ];
  var CAMPOS_CORREO_BASE = null;
  // Las casillas nuevas salen SOLO si la base ya las declara editables (migración 20261007210000): sin ella guardar daría «clave no editable».
  function ajustaCamposCorreo() {
    if (!CAMPOS_CORREO_BASE) CAMPOS_CORREO_BASE = CAMPOS.correo.slice();
    var ed = datos && datos.editables;
    CAMPOS.correo = CAMPOS_CORREO_BASE.concat(EXTRA_CORREO.filter(function (c) { return Array.isArray(ed) && ed.indexOf(c.clave) >= 0; }));
  }

  // Códigos de la edge → texto (es). Lo que no está aquí NO se enseña tal cual: sale «Respuesta no reconocida».
  var CORREO_MSG = {
    host_no_valido: 'Pon un servidor válido: un nombre de internet como smtp.tuproveedor.com, sin IP ni nombres internos.',
    puerto_no_valido: 'El puerto tiene que ser 465.',
    usuario_no_valido: 'El usuario del buzón va de 1 a 254 caracteres y sin caracteres de control.',
    clave_no_valida: 'La contraseña del buzón va de 1 a 200 caracteres y sin saltos de línea.',
    nombre_no_valido: 'El nombre del remitente admite 60 caracteres, sin < ni >.',
    host_no_resuelve: 'Ese servidor no existe (no resuelve en internet).',
    host_privado: 'Ese servidor apunta a una red interna: solo se admite un servidor público.',
    sin_remitente: 'El usuario del buzón no es un correo y no hay remitente válido: pon uno de tu dominio en la casilla de abajo.',
    sin_correo_usuario: 'Tu cuenta no tiene un correo válido al que mandar la prueba.',
    sin_sesion: 'Tu sesión ha caducado: recarga la página o vuelve a entrar.',
    reautenticar: 'Confirma tu contraseña de la cuenta para cambiar de servidor (o vuelve a entrar y repite).',
    clave_actual_incorrecta: 'Esa no es la contraseña de tu cuenta.',
    no_super_admin: 'Cambiar el servidor de correo exige super admin.',
    origen: 'Esta página no está autorizada a llamar al servicio de correo.',
    cuerpo_grande: 'La petición es demasiado grande.',
    prueba_caducada: 'La prueba ya no vale: repítela.',
    demasiados_intentos: 'Demasiados intentos seguidos: espera unos minutos.',
    base_no_responde: 'La base no ha respondido: inténtalo de nuevo en un rato.',
    envios_pausados: 'Los envíos de correo están en pausa: no se prueba ni se guarda nada hasta reanudarlos (no es un fallo de la contraseña).',
    prueba_fallida: 'El servidor no ha aceptado la prueba: no se ha guardado y sigue el anterior.',
    edge_no_disponible: 'El servicio de correo todavía no está disponible en esta instalación. Inténtalo más tarde.',
    sin_red: 'No se ha podido contactar con el servicio de correo (sin conexión, o todavía no está disponible).',
    respuesta_ilegible: 'La respuesta del servicio de correo no se entiende. Inténtalo de nuevo.'
  };
  var srv = { fase: 'inicial', estado: null, remitente: null, pausados: false, codigo: '', extra: '', ok: '', ocupado: false, reauth: false };

  function nodo(tag, clase, txt, attrs) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (txt != null) n.textContent = txt;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function mensajeCorreo(codigo) {
    return T(Object.prototype.hasOwnProperty.call(CORREO_MSG, codigo) ? CORREO_MSG[codigo] : 'Respuesta no reconocida del servicio de correo.');
  }
  // Una sola puerta a la edge. Devuelve SIEMPRE {status, codigo, d}: `codigo` solo si la edge mandó uno con forma de código; si no,
  // lo decide el estado HTTP (404/5xx sin código = la edge no está; sin respuesta = red o CORS). Nada del texto del servidor sale de aquí.
  function llamaCorreo(cuerpo) {
    return sb.auth.getSession().then(function (r) {
      var token = r && r.data && r.data.session && r.data.session.access_token;
      if (!token) return { status: 401, codigo: 'sin_sesion', d: null };
      var url;
      try { url = window.lwEdge('ajustes-correo'); } catch (e) { return { status: 0, codigo: 'edge_no_disponible', d: null }; }
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'apikey': window.LW_SB_KEY },
        body: JSON.stringify(cuerpo)
      }).then(function (resp) {
        return resp.text().then(function (t) {
          var d = null;
          try { d = JSON.parse(t); } catch (e) { d = null; }
          var cod = d && typeof d.codigo === 'string' && /^[a-z_]{3,40}$/.test(d.codigo) ? d.codigo : '';
          if (resp.ok && d && d.ok === true) return { status: resp.status, codigo: '', d: d };
          if (!cod) cod = (resp.status === 404 || resp.status >= 500) ? 'edge_no_disponible' : (d ? '' : 'respuesta_ilegible');
          return { status: resp.status, codigo: cod, d: d };
        });
      }, function () { return { status: 0, codigo: 'sin_red', d: null }; });
    }, function () { return { status: 401, codigo: 'sin_sesion', d: null }; });
  }
  // Solo códigos técnicos con forma de código (EAUTH, ETIMEDOUT, 535…): nunca un texto libre.
  function detalleTecnico(d) {
    var p = [];
    [d && d.detalle_code, d && d.smtp_code, d && d.smtp_response_code].forEach(function (x) {
      if ((typeof x === 'string' && /^[A-Za-z0-9_]{2,40}$/.test(x)) || (typeof x === 'number' && isFinite(x) && x >= 100 && x <= 999)) p.push(String(x));
    });
    return p.join(' ');
  }
  function fechaCorreo(x) {
    var d = new Date(x);
    return isNaN(d) ? '' : d.toLocaleString(typeof window.lwLocale === 'function' ? window.lwLocale() : 'es-ES');
  }
  function aplicaRespuestaCorreo(d) {
    if (d && d.estado && typeof d.estado === 'object') srv.estado = d.estado;
    if (d && d.remitente && typeof d.remitente === 'object') srv.remitente = d.remitente;
    srv.pausados = !!(d && d.envios_pausados);
  }

  function campoServidor(id, etiqueta, ayuda, input, opcional) {
    var f = nodo('div', 'px-8 py-5 flex flex-col md:flex-row lw-aj-inicio justify-between gap-4 border-b border-outline-variant/30');
    var izq = nodo('div', 'flex flex-col gap-1 lw-aj-mitad');
    var lab = nodo('label', 'font-label-md text-label-md text-on-surface', T(etiqueta), { 'for': id });
    if (opcional) { var op = nodo('span', 'text-outline', ' (' + T('opcional') + ')'); lab.appendChild(op); }
    izq.appendChild(lab);
    if (ayuda) izq.appendChild(nodo('span', 'font-body-sm text-body-sm text-outline', T(ayuda)));
    var der = nodo('div', 'flex flex-col gap-2 lw-aj-mitad');
    input.id = id;
    input.className = 'w-full rounded-lg border border-control-border/50 bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md';
    der.appendChild(input);
    f.appendChild(izq); f.appendChild(der);
    return f;
  }
  function inputServidor(tipo, campo, max, attrs) {
    var i = nodo('input', '', null, { type: tipo, maxlength: String(max), 'data-correo-campo': campo, autocomplete: 'off', spellcheck: 'false' });
    if (attrs) Object.keys(attrs).forEach(function (k) { i.setAttribute(k, attrs[k]); });
    return i;
  }
  // Lo que el usuario ya tecleó (host, usuario, nombre) sobrevive a un repintado; las contraseñas NO: se vacían siempre.
  function tecleado() {
    var r = {}, cont = document.getElementById('lw-aj-correo-servidor');
    if (!cont) return r;
    ['host', 'user', 'nombre'].forEach(function (c) { var i = cont.querySelector('[data-correo-campo="' + c + '"]'); if (i) r[c] = i.value; });
    return r;
  }
  function bloqueServidor() {
    var cont = document.getElementById('lw-aj-correo-servidor');
    if (cont) return cont;
    var panel = document.getElementById('lw-aj-correo');
    if (!panel || !panel.parentNode) return null;
    cont = nodo('div', '', null, { id: 'lw-aj-correo-servidor', 'data-correo-servidor': '' });
    panel.parentNode.insertBefore(cont, panel);
    return cont;
  }

  function pintaServidorCorreo(guardada) {
    var cont = bloqueServidor();
    if (!cont || !datos) return;
    if (cont.firstChild && srv.fase === 'listo' && !srv.ocupado && guardada && guardada !== 'email_from' && guardada !== 'email_reply_to') return;
    var previo = tecleado();
    while (cont.firstChild) cont.removeChild(cont.firstChild);
    var cab = nodo('div', 'px-8 pt-8 pb-4 flex flex-col gap-1 border-b border-outline-variant/40');
    cab.appendChild(nodo('h2', 'font-headline-sm text-headline-sm text-deep-lagoon tracking-tight', T('Servidor de salida')));
    cab.appendChild(nodo('p', 'font-body-sm text-body-sm text-outline', T('El servidor SMTP desde el que salen todos los correos de este ERP. Se prueba con un envío real a tu correo y solo si llega se guarda; si falla, sigue el anterior.')));
    cont.appendChild(cab);
    if (!datos.puede_escribir) {
      cont.appendChild(nodo('p', 'px-8 py-5 font-body-sm text-body-sm text-outline', T('Solo el super admin puede ver y cambiar el servidor de correo.')));
      cont.appendChild(nodo('div', 'border-b border-outline-variant/40'));
      return;
    }
    // Se pide el estado a la edge solo cuando se mira la pestaña (y tras guardar remitente o respuestas, que cambian el desajuste)
    var refresca = guardada === 'email_from' || guardada === 'email_reply_to';
    if (srv.fase === 'inicial' && desdeHash() === 'correo') cargaEstadoCorreo(false);
    else if (refresca && srv.fase === 'listo') cargaEstadoCorreo(true);   // en silencio: el formulario no parpadea ni pierde lo tecleado

    var estado = nodo('div', 'px-8 py-5 flex flex-col gap-2 border-b border-outline-variant/30', null, { role: 'status', 'aria-live': 'polite', 'data-correo': 'estado' });
    if (srv.fase === 'inicial' || srv.fase === 'cargando') {
      estado.appendChild(nodo('span', 'font-body-sm text-body-sm text-outline', T('Trayendo el estado del servidor…')));
    } else if (srv.fase === 'error') {
      estado.setAttribute('role', 'alert');
      estado.appendChild(nodo('span', 'font-body-md text-body-md text-error', T('No se ha podido leer el estado del servidor') + ': ' + mensajeCorreo(srv.codigo)));
      var rb = nodo('button', 'self-start px-4 py-2 rounded-full bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md', T('Reintentar'),
        { type: 'button', 'data-real': '', 'data-accion': 'correo-estado-reintentar' });
      estado.appendChild(rb);
    } else {
      var e = srv.estado || {};
      if (e.configurado && typeof e.host === 'string') {
        var linea = T('Servidor actual') + ': ' + e.host + ' · ' + T('usuario') + ' ' + String(e.usuario || '') + ' · ' + T('puerto') + ' ' + String(e.puerto || 465);
        var cuando = e.puesto_en ? fechaCorreo(e.puesto_en) : '';
        if (cuando) linea += ' · ' + T('puesto el') + ' ' + cuando;
        estado.appendChild(nodo('span', 'font-body-md text-body-md text-on-surface', linea, { 'data-correo': 'servidor-actual' }));
        if (e.hay_previo) estado.appendChild(nodo('span', 'font-body-sm text-body-sm text-outline', T('Hay un servidor anterior guardado como copia.')));
      } else {
        estado.appendChild(nodo('span', 'font-body-sm text-body-sm text-outline', T('Sin servidor guardado: los correos salen con la configuración de origen de la instalación.'), { 'data-correo': 'sin-servidor' }));
      }
      if (typeof e.intentos_recientes === 'number' && e.intentos_recientes > 0 && typeof e.intentos_max === 'number') {
        estado.appendChild(nodo('span', 'font-body-sm text-body-sm text-outline', T('Intentos recientes') + ': ' + e.intentos_recientes + ' ' + T('de') + ' ' + e.intentos_max));
      }
      var rem = srv.remitente || {};
      var efectivo = typeof rem.efectivo === 'string' ? rem.efectivo : '';
      if (rem.motivo === 'dominio_distinto' || rem.motivo === 'no_valido') {
        estado.appendChild(nodo('span', 'font-body-sm text-body-sm text-error',
          T('Los correos saldrán desde') + ' ' + efectivo + ' ' + T(rem.motivo === 'no_valido' ? 'porque el remitente de Ajustes no es una dirección válida.' : 'porque el remitente de Ajustes no es del dominio del buzón. Cambia el remitente en la casilla de abajo y guárdalo antes de probar.'),
          { 'data-correo': 'desajuste-dominio' }));
      } else if (rem.motivo === 'sin_remitente') {
        estado.appendChild(nodo('span', 'font-body-sm text-body-sm text-error', T('No hay remitente válido: el usuario del buzón no es un correo. Pon un remitente de tu dominio en la casilla de abajo.'), { 'data-correo': 'desajuste-dominio' }));
      }
      if (srv.pausados) estado.appendChild(nodo('span', 'font-body-sm text-body-sm text-error', T('Los envíos de correo están en pausa (Mantenimiento): no se puede probar ni guardar hasta reanudarlos.'), { 'data-correo': 'pausa' }));
    }
    cont.appendChild(estado);
    if (srv.fase !== 'listo') { cont.appendChild(nodo('div', 'border-b border-outline-variant/40')); return; }

    var e2 = srv.estado || {};
    var host = inputServidor('text', 'host', 253, { placeholder: 'smtp.tuproveedor.com', inputmode: 'url' });
    var port = inputServidor('text', 'port', 3, { value: '465', readonly: '', disabled: '', 'aria-readonly': 'true' });
    var user = inputServidor('text', 'user', 254, { inputmode: 'email' });
    // La contraseña: nunca prefijada, nunca del estado; new-password para que el navegador no la rellene con la de otra cuenta.
    var pass = inputServidor('password', 'pass', 200, { autocomplete: 'new-password' });
    var nombre = inputServidor('text', 'nombre', 60);
    host.value = previo.host != null ? previo.host : (typeof e2.host === 'string' ? e2.host : '');
    user.value = previo.user != null ? previo.user : (typeof e2.usuario === 'string' ? e2.usuario : '');
    nombre.value = previo.nombre != null ? previo.nombre : (typeof e2.nombre === 'string' ? e2.nombre : '');
    cont.appendChild(campoServidor('lw-aj-srv-host', 'Servidor', null, host));
    cont.appendChild(campoServidor('lw-aj-srv-port', 'Puerto', 'Siempre 465 (conexión cifrada). No se puede cambiar.', port));
    cont.appendChild(campoServidor('lw-aj-srv-user', 'Usuario del buzón', null, user));
    cont.appendChild(campoServidor('lw-aj-srv-pass', 'Contraseña del buzón', 'Nunca se muestra la guardada: escribe la del buzón cada vez que pruebes.', pass));
    cont.appendChild(campoServidor('lw-aj-srv-nombre', 'Nombre del remitente', null, nombre, true));
    if (srv.reauth) {
      var re = inputServidor('password', 'reauth', 200, { autocomplete: 'current-password' });
      var fila = campoServidor('lw-aj-srv-reauth', 'Tu contraseña de la cuenta', 'Para cambiar de servidor o de usuario confirma tu contraseña de acceso al ERP (o vuelve a entrar y repite).', re);
      fila.setAttribute('data-correo', 'reauth');
      cont.appendChild(fila);
    }
    var pie = nodo('div', 'px-8 py-5 flex flex-col gap-3 border-b border-outline-variant/40');
    var btn = nodo('button', 'self-start px-4 py-2 rounded-full bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md', T(srv.ocupado ? 'Probando…' : 'Probar y guardar'),
      { type: 'button', 'data-real': '', 'data-accion': 'correo-servidor-probar' });
    if (srv.ocupado || srv.pausados) btn.disabled = true;
    pie.appendChild(btn);
    var res = nodo('span', 'font-body-sm text-body-sm text-outline', null, { role: 'status', 'aria-live': 'polite', 'data-correo': 'resultado' });
    if (srv.ok) { res.className = 'font-body-sm text-body-sm text-on-surface'; res.textContent = srv.ok; }
    else if (srv.codigo) {
      res.className = 'font-body-sm text-body-sm text-error';
      res.setAttribute('role', 'alert');
      res.textContent = T('No se guardó') + ': ' + mensajeCorreo(srv.codigo) + (srv.extra ? ' ' + srv.extra : '');
    }
    pie.appendChild(res);
    cont.appendChild(pie);
  }

  function cargaEstadoCorreo(silencioso) {
    if (srv.fase === 'cargando' || srv.cargandoSilencio) return;
    if (silencioso) srv.cargandoSilencio = true; else { srv.fase = 'cargando'; srv.codigo = ''; }
    llamaCorreo({ accion: 'estado' }).then(function (r) {
      srv.cargandoSilencio = false;
      if (r.codigo || !r.d) { if (!silencioso) { srv.fase = 'error'; srv.codigo = r.codigo || 'respuesta_ilegible'; } }   // un refresco que falla deja lo que ya se enseñaba
      else { aplicaRespuestaCorreo(r.d); srv.fase = 'listo'; srv.codigo = ''; }
      pintaServidorCorreo();
    });
  }

  function probarCorreo() {
    var cont = document.getElementById('lw-aj-correo-servidor');
    if (!cont || srv.ocupado) return;
    var v = function (c) { var i = cont.querySelector('[data-correo-campo="' + c + '"]'); return i ? i.value : ''; };
    var vacia = function (c) { var i = cont.querySelector('[data-correo-campo="' + c + '"]'); if (i) i.value = ''; };
    var cuerpo = { accion: 'probar_y_guardar', host: v('host').trim(), port: 465, user: v('user').trim(), pass: v('pass') };
    var nom = v('nombre').trim();
    if (nom) cuerpo.nombre = nom;
    var re = v('reauth');
    if (re) cuerpo.contrasena_actual = re;
    // Las contraseñas salen del DOM EN CUANTO se leen: lo que pase después (éxito, fallo, caída) ya no las tiene a mano.
    vacia('pass'); vacia('reauth');
    srv.ocupado = true; srv.ok = ''; srv.codigo = ''; srv.extra = '';
    pintaServidorCorreo();
    llamaCorreo(cuerpo).then(function (r) {
      cuerpo.pass = ''; cuerpo.contrasena_actual = '';
      srv.ocupado = false;
      if (r.codigo || !r.d) {
        srv.codigo = r.codigo || 'respuesta_ilegible';
        if (srv.codigo === 'reautenticar' || srv.codigo === 'clave_actual_incorrecta') srv.reauth = true;
        srv.extra = '';
        if (srv.codigo === 'prueba_fallida') {
          var fase = r.d && r.d.fase;
          var det = detalleTecnico(r.d);
          srv.extra = (fase === 'verify' ? T('No se pudo iniciar sesión en el servidor: revisa servidor, usuario y contraseña.')
            : fase === 'envio' ? T('Se conectó, pero no se pudo enviar el correo de prueba.') : '') + (det ? ' ' + T('Código técnico') + ': ' + det : '');
          srv.extra = srv.extra.trim();
        }
        if (srv.codigo === 'envios_pausados') srv.pausados = true;
      } else {
        aplicaRespuestaCorreo(r.d);
        srv.codigo = ''; srv.reauth = false;
        var aviso = r.d.aviso === 'enviado' ? ' ' + T('Se avisó del cambio por el servidor anterior.')
          : r.d.aviso === 'no_enviado' ? ' ' + T('No se pudo avisar por el servidor anterior (el cambio se hizo igualmente).')
          : r.d.aviso === 'sin_buzon' ? ' ' + T('No hay un buzón de avisos del sistema válido: no se avisó del cambio. Configúralo en la casilla de abajo.') : '';
        srv.ok = T('Guardado. Se envió un correo de prueba a') + ' ' + String(typeof r.d.prueba_enviada_a === 'string' ? r.d.prueba_enviada_a : '') + '.' + aviso;
        registroCargado = false;   // el registro de cambios tiene una fila nueva (correo_salida)
      }
      pintaServidorCorreo();
    });
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-accion]');
    if (!b || !b.hasAttribute('data-real')) return;
    var a = b.getAttribute('data-accion');
    if (a === 'correo-servidor-probar') { ev.stopPropagation(); probarCorreo(); }
    else if (a === 'correo-estado-reintentar') { ev.stopPropagation(); srv.fase = 'inicial'; pintaServidorCorreo(); }
  }, true);
  // Al abrir la pestaña Correo por primera vez (hash) se trae el estado; ya cargado, no se vuelve a pedir.
  window.addEventListener('hashchange', function () { if (datos && desdeHash() === 'correo' && srv.fase === 'inicial') pintaServidorCorreo(); });

