/* Un componente por paso de setup, COMPARTIDO por el asistente (/ajustes/configurar/) y por Ajustes › Configurar módulos (F3 Entrega 1,
 * bbm-p18-front, 12-oct-2026; plan de front + revisión previa #285). Va detrás de setup_modulos.js (window.AXW_SETUP).
 *
 * Cada componente sabe, por su clave y nada más: qué campos pinta, cómo se comprueba lo tecleado ANTES de enviar (la base lo vuelve a
 * comprobar todo), y a qué función llama para guardar — el nombre va escrito aquí, literal, para que erp/contrato_front.py lo vea.
 *   paso.irreversible → el asistente enseña una confirmación propia y se manda p_confirmo: true (la garantía es la base).
 *   paso hecho y se cambia → la base exige motivo (p17, 12-oct: el primer valor de una clave no lo pide; cambiarlo, sí).
 * Una clave que no está aquí («quién lo usa» u otra que Backend añada) cae en el componente GENÉRICO: título traducido, dónde se hace y
 * «Ya lo hice, comprobar». Así un paso nuevo de la base no rompe la pantalla.
 *
 * Interfaz de cada componente: pinta(caja, ctx) → control { valores() → {ok, v} | {ok:false, error}, resumen?(v) } ;
 *   guarda(sb, v, ctx, confirmo, motivo) → Promise<{ok:true} | {ok:false, error, sinRespuesta}>.
 * ctx = {paso, datos (modulos_setup_estado), ajustes (valores de ajustes_config_datos), sociedad (fila o null), cambia (bool)}.
 * Todo dato va por textContent / value; se engancha por data-axw-campo / data-axw-*; nada de piel propia (la pone Claude Design después).
 */
(function () {
  'use strict';
  function S() { return window.AXW_SETUP; }
  function U(k, h) { return S().ui(k, h); }
  function el(tag, attrs, hijos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null) return; if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (hijos || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  var CLS_INPUT = 'w-full rounded-lg border border-control-border/50 bg-surface-container-lowest px-3 py-2.5 font-body-md text-body-md';
  function campo(caja, k, etiqueta, valor, opts) {
    opts = opts || {};
    var id = 'axw-c-' + k;
    var inp = opts.opciones ? el('select', { id: id, 'data-axw-campo': k, class: CLS_INPUT })
                            : el('input', { id: id, type: 'text', 'data-axw-campo': k, maxlength: String(opts.max || 200), autocomplete: 'off', class: CLS_INPUT });
    inp.style.maxWidth = '100%';
    if (opts.opciones) {
      inp.appendChild(el('option', { value: '', text: U('elige') }));
      opts.opciones.forEach(function (o) { inp.appendChild(el('option', { value: o[0], text: o[1] })); });
    }
    if (valor != null) inp.value = String(valor);
    if (opts.mayus) inp.addEventListener('input', function () { var p = inp.selectionStart; inp.value = inp.value.toUpperCase(); try { inp.setSelectionRange(p, p); } catch (e) { /* MUDO A PROPOSITO: un select o un navegador viejo sin cursor */ } });
    var fila = el('div', { class: 'flex flex-col gap-1.5', 'data-axw-fila': k }, [
      el('label', { for: id, class: 'font-label-md text-label-md text-on-surface', text: etiqueta }), inp,
      opts.ayuda ? el('span', { class: 'font-body-sm text-body-sm text-outline', text: opts.ayuda }) : null]);
    caja.appendChild(fila);
    return inp;
  }
  function lee(caja, k) { var i = caja.querySelector('[data-axw-campo="' + k + '"]'); return i ? String(i.value || '').trim() : ''; }
  // Un error de red sin código de la base es «no sé si se guardó» (máquina de duda); con código, «no se guardó».
  function resultado(p) {
    return new Promise(function (ok) { ok(p); }).then(function (r) {
      if (!r) return { ok: false, sinRespuesta: true, error: { message: 'sin respuesta' } };
      if (r.error) return { ok: false, sinRespuesta: !r.error.code, error: r.error };
      return { ok: true, data: r.data };
    }, function (e) { return { ok: false, sinRespuesta: !(e && e.code), error: e || {} }; });
  }
  function guardaAjuste(sb, clave, valor, confirmo, motivo) {
    var args = { p_clave: clave, p_valor: valor };
    if (motivo) args.p_motivo = motivo;
    if (confirmo) args.p_confirmo = true;
    return resultado(sb.rpc('ajustes_config_guardar', args));
  }
  function opcionUnica(clave, opciones) {   // los sí/no de impuestos: el valor que guarda la base ('si' | 'no') y lo que significa
    return {
      pinta: function (caja, ctx) {
        var actual = ctx.ajustes && ctx.ajustes[clave] != null ? String(ctx.ajustes[clave]) : '';
        campo(caja, clave, S().texto('paso', ctx.paso.clave, 0), ['si', 'no'].indexOf(actual) >= 0 ? actual : '',
              { opciones: opciones.map(function (o) { return [o[0], U(o[1])]; }) });
        return { valores: function () { var v = lee(caja, clave); return v === 'si' || v === 'no' ? { ok: true, v: { valor: v } } : { ok: false, error: U('elige') }; } };
      },
      guarda: function (sb, v, ctx, confirmo, motivo) { return guardaAjuste(sb, clave, v.valor, false, motivo); },
      comprueba: function (v, ctx) { return !!(ctx.ajustes && String(ctx.ajustes[clave]) === v.valor); }
    };
  }
  /* sociedad_guarda (también la de la S1) exige razón y domicilio y, al actualizar, REESCRIBE la fila entera: lo que no llega queda vacío
     (revisor 12-oct: «Cambiar empresa» borraba logo, NIB, folio y tinta; el prefijo solo daba 22023). Por eso el setup lee la fila con
     estas columnas (todas con SELECT para authenticated en bbm, medido por Backend el 12-oct) y la reenvía entera con lo cambiado. */
  var COLS_SOCIEDAD = 'clave,label,razon,marca,npwp,npwp_label,nib,domicilio,rep,logo,logo_alto,emisor_debajo,folio,tinta,activa,orden,es_indonesia,prefijo_serie';
  function filaCompleta(s) {
    var f = {};
    COLS_SOCIEDAD.split(',').forEach(function (k) { if (k !== 'clave' && s && s[k] !== undefined) f[k] = s[k]; });
    return f;
  }
  function faltaFila() { return Promise.resolve({ ok: false, error: { code: 'axw_sin_fila', message: U('no_mirar') } }); }
  function slug(s) {   // la clave de una sociedad nueva: la regla de sociedad_guarda (^[a-z][a-z0-9_]{2,}$); la base la vuelve a comprobar
    var b = String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
    if (!/^[a-z]/.test(b)) b = 'e_' + b;
    while (b.length < 3) b += '_';
    return b;
  }

  var PASOS = {
    moneda: {
      pinta: function (caja, ctx) {
        var mons = (ctx.datos && ctx.datos.monedas) || [];
        campo(caja, 'moneda', U('moneda'), '', { opciones: mons.map(function (m) { return [m, m]; }) });   // sin valor elegido de antemano (#285)
        if (ctx.datos && ctx.datos.moneda && ctx.paso.hecho) caja.appendChild(el('p', { class: 'font-body-sm text-body-sm text-outline', text: U('valor_actual', { v: ctx.datos.moneda }) }));
        return {
          valores: function () { var v = lee(caja, 'moneda'); return mons.indexOf(v) >= 0 ? { ok: true, v: { moneda: v } } : { ok: false, error: U('elige') }; },
          resumen: function (v) { return { grande: v.moneda, teclea: v.moneda, boton: U('fijar_moneda', { v: v.moneda }) }; }
        };
      },
      guarda: function (sb, v, ctx, confirmo, motivo) { return guardaAjuste(sb, 'moneda', v.moneda, confirmo, motivo); },
      comprueba: function (v, ctx) { return !!(ctx.datos && ctx.datos.moneda === v.moneda); }
    },
    sociedad: {
      sinMotivo: true,   // sociedad_guarda no lleva motivo: no se pide lo que no se guarda (revisor 12-oct)
      // Lo mínimo que pide la base; el editor completo (logo, aspecto, NIB…) está en Ajustes › Sociedades emisoras (#285)
      pinta: function (caja, ctx) {
        var s = ctx.sociedad || {};
        campo(caja, 'razon', U('razon') + ' *', s.razon, { max: 200 });
        campo(caja, 'npwp_label', U('npwp_label'), s.npwp_label || 'NPWP', { max: 20 });
        campo(caja, 'npwp', U('npwp') + ' *', s.npwp, { max: 40 });
        campo(caja, 'domicilio', U('domicilio') + ' *', s.domicilio, { max: 400 });
        campo(caja, 'rep', U('rep'), s.rep, { max: 200 });
        return { valores: function () {
          var v = { razon: lee(caja, 'razon'), npwp_label: lee(caja, 'npwp_label') || 'NPWP', npwp: lee(caja, 'npwp'), domicilio: lee(caja, 'domicilio'), rep: lee(caja, 'rep') };
          var faltan = [];
          if (!v.razon) faltan.push(U('razon'));
          if (!v.npwp) faltan.push(U('npwp'));   // la base solo da el paso por hecho con identificación fiscal
          if (!v.domicilio) faltan.push(U('domicilio'));
          return faltan.length ? { ok: false, error: U('falta_valor', { c: faltan.join(', ') }) } : { ok: true, v: v };
        } };
      },
      guarda: function (sb, v, ctx) {
        var ref = ctx.paso.ref || null;
        if (ref && !(ctx.sociedad && ctx.sociedad.clave === ref)) return faltaFila();   // sin la fila entera no se reescribe nada
        // alta: lo que se teclea, y el país y la etiqueta por defecto los pone la base; cambio: la fila entera con lo tecleado encima
        var fila = Object.assign(ref ? filaCompleta(ctx.sociedad) : {}, { razon: v.razon, npwp_label: v.npwp_label, npwp: v.npwp, domicilio: v.domicilio, rep: v.rep || null });
        return resultado(sb.rpc('sociedad_guarda', { p_clave: ref || slug(v.razon), p_datos: fila, p_nueva: !ref }));
      },
      comprueba: function (v, ctx) { var x = ctx.sociedad; return !!(x && x.razon === v.razon && x.domicilio === v.domicilio && (x.npwp || '') === v.npwp); }
    },
    prefijo: {
      pinta: function (caja, ctx) {
        if (!ctx.paso.ref) {   // sin sociedad no hay sobre qué fijar el prefijo: lo dice y no ofrece nada
          caja.appendChild(el('p', { class: 'font-body-md text-body-md text-on-surface', 'data-axw-aviso-paso': 'primero_sociedad', text: U('primero_sociedad') }));
          return { valores: function () { return { ok: false, error: U('primero_sociedad') }; }, bloqueado: true };
        }
        var actual = ctx.sociedad && ctx.sociedad.prefijo_serie;
        if (actual && ctx.paso.hecho) {
          caja.appendChild(el('p', { class: 'font-headline-sm text-headline-sm text-deep-lagoon', 'data-axw-fijado': 'prefijo', text: actual }));
          caja.appendChild(el('p', { class: 'font-body-sm text-body-sm text-outline', text: U('fijado') }));
          return { valores: function () { return { ok: false, error: U('fijado') }; }, bloqueado: true };
        }
        var inp = campo(caja, 'prefijo_serie', U('prefijo'), '', { max: 8, mayus: true, ayuda: U('prefijo_ayuda') });
        var ej = el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', 'data-axw-ejemplo': 'prefijo' });
        caja.appendChild(ej);
        inp.addEventListener('input', function () { ej.textContent = inp.value ? U('prefijo_ejemplo', { p: inp.value }) : ''; });
        return {
          valores: function () { var v = lee(caja, 'prefijo_serie').toUpperCase(); return /^[A-Z0-9]{2,8}$/.test(v) ? { ok: true, v: { prefijo: v } } : { ok: false, error: U('prefijo_formato') }; },
          resumen: function (v) { return { grande: v.prefijo + '-…', teclea: v.prefijo, boton: U('fijar_prefijo', { v: v.prefijo }) }; }
        };
      },
      sinMotivo: true,
      guarda: function (sb, v, ctx, confirmo) {
        if (!(ctx.sociedad && ctx.sociedad.clave === ctx.paso.ref)) return faltaFila();
        var args = { p_clave: ctx.paso.ref, p_datos: Object.assign(filaCompleta(ctx.sociedad), { prefijo_serie: v.prefijo }), p_nueva: false };
        if (confirmo) args.p_confirmo = true;
        return resultado(sb.rpc('sociedad_guarda', args));
      },
      comprueba: function (v, ctx) { return !!(ctx.sociedad && ctx.sociedad.prefijo_serie === v.prefijo); }
    },
    // reservas_sin_impuesto = 'si' quiere decir que NO es PKP: por eso «Sí, es PKP» guarda 'no' (igual que la Puesta en marcha de antes)
    impuesto_pkp: opcionUnica('reservas_sin_impuesto', [['no', 'si_pkp'], ['si', 'no_pkp']]),
    precio_con_impuesto: opcionUnica('precio_incluye_impuesto', [['si', 'dentro'], ['no', 'fuera']])
  };
  // Pasos que se hacen en otra pantalla (Flota, Entrega) y cualquier clave que esta pantalla no conozca todavía
  var EXTERNO = {
    externo: true,
    pinta: function (caja, ctx) {
      caja.appendChild(el('p', { class: 'font-body-md text-body-md text-on-surface', text: U('otra_pantalla') }));
      var d = String(ctx.paso.donde || '');
      if (/^\/[a-z0-9\-\/]*$/i.test(d)) {
        caja.appendChild(el('a', { href: d, 'data-axw-accion': 'abrir-externo', class: 'inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-outline-variant font-label-md text-label-md text-deep-lagoon axw-btn',
                                   style: 'min-height:44px', text: U('abrir', { pantalla: S().texto('paso', ctx.paso.clave, 0) }) }));
      }
      return { valores: function () { return { ok: true, v: {} }; } };
    },
    guarda: function () { return Promise.resolve({ ok: true, externo: true }); }
  };
  function de(clave) { return PASOS[clave] || EXTERNO; }
  // flota y entrega se hacen fuera aunque se conozcan
  ['flota', 'entrega'].forEach(function (k) { PASOS[k] = EXTERNO; });

  window.AXW_PASOS = { de: de, slug: slug, conocidos: Object.keys(PASOS), COLS_SOCIEDAD: COLS_SOCIEDAD };
})();
