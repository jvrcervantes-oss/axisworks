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
  (function () {   // las tarjetas de una opción (S22): solo tokens de la piel; elegida = borde del color del texto (≥ 3:1)
    if (typeof document === 'undefined' || !document.head || document.getElementById('axw-opcion-estilo')) return;
    var st = document.createElement('style');
    st.id = 'axw-opcion-estilo';
    st.textContent = '.axw-op{display:flex;gap:12px;align-items:flex-start;padding:16px;min-height:44px;cursor:pointer;border-radius:12px;' +
      'border:1px solid rgb(var(--tema-outline));background:rgb(var(--tema-surface-container-lowest))}' +
      '.axw-op:has(input:checked){border-color:rgb(var(--tema-on-surface));box-shadow:inset 0 0 0 1px rgb(var(--tema-on-surface))}' +
      '.axw-op input{width:20px;height:20px;margin:2px 0 0;flex:none;accent-color:rgb(var(--tema-on-surface));cursor:pointer}' +
      '.axw-op input:focus-visible{outline:2px solid rgb(var(--tema-burnt-earth));outline-offset:2px}';
    document.head.appendChild(st);
  })();
  /* Los sí/no de impuestos: el valor que guarda la base ('si' | 'no') y lo que significa, en dos tarjetas (diseño S22).
     `ejemplo(valor, ctx)` da, si hace falta, una línea debajo de cada opción. */
  function opcionUnica(clave, opciones, ejemplo) {
    return {
      pinta: function (caja, ctx) {
        var actual = ctx.ajustes && ctx.ajustes[clave] != null ? String(ctx.ajustes[clave]) : '';
        var grupo = el('fieldset', { 'data-axw-campo': clave, class: 'flex flex-col gap-3', style: 'border:0;margin:0;padding:0;min-width:0' }, [
          el('legend', { class: 'font-label-md text-label-md text-on-surface', style: 'padding:0;margin-bottom:12px', text: S().texto('paso', ctx.paso.clave, 0) })]);
        opciones.forEach(function (o) {
          var id = 'axw-o-' + clave + '-' + o[0], sub = ejemplo ? ejemplo(o[0], ctx) : '';
          grupo.appendChild(el('label', { for: id, class: 'axw-op', 'data-axw-opcion': o[0] }, [
            el('input', { type: 'radio', name: 'axw-o-' + clave, id: id, value: o[0], checked: actual === o[0] ? '' : null }),
            el('span', { class: 'flex flex-col min-w-0', style: 'gap:4px' }, [
              el('span', { class: 'font-label-md text-label-md text-on-surface', text: U(o[1]) }),
              sub ? el('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', 'data-axw-ejemplo-opcion': o[0], text: sub }) : null])]));
        });
        caja.appendChild(grupo);
        return { valores: function () {
          var c = grupo.querySelector('input:checked'), v = c ? c.value : '';
          return v === 'si' || v === 'no' ? { ok: true, v: { valor: v } } : { ok: false, error: U('elige') };
        } };
      },
      guarda: function (sb, v, ctx, confirmo, motivo) { return guardaAjuste(sb, clave, v.valor, false, motivo); },
      comprueba: function (v, ctx) { return !!(ctx.ajustes && String(ctx.ajustes[clave]) === v.valor); },
      // ¿hay ya un valor guardado? La base pide motivo al CAMBIAR uno que existe (130000), aunque el paso siga sin hecho
      // (p. ej. «no» guardado sin impuesto por defecto: impuesto_pkp sin hecho, y cambiarlo sí pide motivo)
      guardado: function (ctx) { return !!(ctx.ajustes && ctx.ajustes[clave] != null); }
    };
  }
  /* ¿Pedir motivo al guardar este paso? Si el componente sabe si hay valor guardado, manda eso; si no, «hecho» (lo de siempre). */
  function pideMotivo(clave, ctx) {
    var c = de(clave);
    if (c.externo || c.sinMotivo) return false;
    return c.guardado ? c.guardado(ctx) : !!(ctx.paso && ctx.paso.hecho);
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

  // El número que pone la base al emitir (20261008137000_f8_puerta_emision.sql): prefijo-F<ejercicio>-<5 cifras>
  function numeroMuestra(pref, n, anio) { return pref + '-F' + anio + '-' + ('0000' + n).slice(-5); }
  // El ejercicio como lo pone la base (_hoy_fiscal(): la zona de Ajustes › zona_horaria y, sin ella, UTC), no el reloj del navegador
  function anioFiscal(ctx) {
    var zh = ctx && ctx.ajustes && ctx.ajustes.zona_horaria;
    zh = zh ? String(zh).trim() : '';
    if (zh) { try { return Number(new Intl.DateTimeFormat('en', { timeZone: zh, year: 'numeric' }).format(new Date())); } catch (e) { /* MUDO A PROPOSITO: zona que el navegador no conoce; va UTC */ } }
    return new Date().getUTCFullYear();
  }
  function iniciales(t) {
    return String(t || '').replace(/^(PT|CV|UD)\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2)
      .map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
  }
  /* «Así sale impreso · muestra» (diseño S20): lo que se va tecleando, con el logo si la empresa ya tiene uno y el número
     de la primera factura solo si el prefijo ya está fijado (si no, lo dice: no se inventa uno). */
  function muestraImpresa(caja, s, ctx) {
    var logo = /^(\/|https:\/\/)/.test(String(s.logo || '')) ? el('img', { src: s.logo, alt: '', style: 'width:52px;height:52px;flex:none;object-fit:contain' })
      : el('span', { class: 'rounded-xl bg-surface-container-high font-label-md text-label-md text-on-surface', 'aria-hidden': 'true', 'data-axw-muestra': 'iniciales',
                     style: 'width:52px;height:52px;flex:none;display:grid;place-items:center' });
    var nom = el('p', { class: 'font-label-md text-label-md text-on-surface', style: 'overflow-wrap:anywhere', 'data-axw-muestra': 'razon' });
    var dom = el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', style: 'overflow-wrap:anywhere', 'data-axw-muestra': 'domicilio' });
    var fis = el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', style: 'overflow-wrap:anywhere', 'data-axw-muestra': 'npwp' });
    var num = s.prefijo_serie
      ? el('p', { class: 'font-label-md text-label-md text-on-surface', 'data-axw-muestra': 'numero', text: numeroMuestra(s.prefijo_serie, 1, anioFiscal(ctx)) })
      : el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', 'data-axw-muestra': 'numero', text: U('num_tras_prefijo') });
    var fig = el('figure', { class: 'flex flex-col gap-2', 'data-axw-muestra': 'impresa', style: 'margin:0' }, [
      el('figcaption', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: U('muestra_impresa') }),
      el('div', { class: 'flex flex-wrap items-start gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest', style: 'padding:20px' }, [
        logo,
        el('div', { class: 'flex flex-col flex-1 min-w-0', style: 'min-width:12rem;gap:2px' }, [nom, dom, fis]),
        el('div', { class: 'flex flex-col text-right', style: 'gap:2px;max-width:14rem;margin-left:auto' }, [
          el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: U('factura_titulo') }), num])])]);
    function pinta() {
      var r = lee(caja, 'razon'), n = lee(caja, 'npwp');
      nom.textContent = r;
      fig.style.display = r ? '' : 'none';   // sin razón social no hay nada que enseñar: aparece al escribirla
      if (logo.tagName === 'SPAN') logo.textContent = iniciales(r);
      dom.textContent = lee(caja, 'domicilio');
      fis.textContent = n ? (lee(caja, 'npwp_label') || 'NPWP') + ' ' + n : '';
    }
    caja.addEventListener('input', pinta);
    return { fig: fig, pinta: pinta };
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
      comprueba: function (v, ctx) { return !!(ctx.datos && ctx.datos.moneda === v.moneda); },
      // valor guardado = la fila de config_instancia, aunque no sea un código válido (entonces «hecho» es false y la base igual pide motivo)
      guardado: function (ctx) { return !!(ctx.ajustes && ctx.ajustes.moneda != null); },
      actual: function (ctx) { return ctx.datos && ctx.datos.moneda; }   // P5: la moneda fijada se enseña en el paso hecho
    },
    sociedad: {
      sinMotivo: true,   // sociedad_guarda no lleva motivo: no se pide lo que no se guarda (revisor 12-oct)
      // Lo mínimo que pide la base; el editor completo (logo, aspecto, NIB…) está en Ajustes › Sociedades emisoras (#285)
      pinta: function (caja, ctx) {
        var s = ctx.sociedad || {};
        // S1 (owner 15-oct: «1, 2 o 3 campos por paso»): a la vista los 3 que exige la base; la etiqueta fiscal («NPWP» ya puesta) y el
        // representante, plegados con su resumen
        campo(caja, 'razon', U('razon') + ' *', s.razon, { max: 200, ayuda: U('razon_ayuda') });
        // «15 o 16 cifras» es del NPWP indonesio: con otra etiqueta fiscal no se dice
        campo(caja, 'npwp', U('npwp') + ' *', s.npwp, { max: 40, ayuda: U('npwp_ayuda') });
        campo(caja, 'domicilio', U('domicilio') + ' *', s.domicilio, { max: 400 });
        var mas = S().plegado({ padre: caja, marca: 'sociedad', resumen: function () { return [lee(caja, 'npwp_label') || 'NPWP', lee(caja, 'rep')]; } });
        campo(mas.cuerpo, 'npwp_label', U('npwp_label'), s.npwp_label || 'NPWP', { max: 20 });
        campo(mas.cuerpo, 'rep', U('rep'), s.rep, { max: 200 });
        mas.actualiza();
        var ayudaNpwp = caja.querySelector('[data-axw-fila="npwp"] span');
        function ayudaFiscal() { if (ayudaNpwp) ayudaNpwp.style.display = (lee(caja, 'npwp_label') || 'NPWP').toUpperCase() === 'NPWP' ? '' : 'none'; }
        caja.querySelector('[data-axw-campo="npwp_label"]').addEventListener('input', ayudaFiscal);
        ayudaFiscal();
        var mu = muestraImpresa(caja, s, ctx);
        (ctx.lado || caja).appendChild(mu.fig);   // P5: en el asistente, al lado de lo que se teclea (sigue escuchando a la caja)
        mu.pinta();
        caja.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', 'data-axw-nota': 'otra_empresa', text: U('otra_empresa') }));
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
        var ej = el('div', { class: 'flex flex-col gap-1', 'data-axw-ejemplo': 'prefijo', 'aria-live': 'polite' });
        caja.appendChild(ej);
        inp.addEventListener('input', function () {   // solo con un prefijo que la base aceptaría: no se enseña un número que no saldrá
          while (ej.firstChild) ej.removeChild(ej.firstChild);
          var pr = inp.value, a = anioFiscal(ctx);
          if (!/^[A-Z0-9]{2,8}$/.test(pr)) return;
          ej.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: U('primera_factura') }));
          ej.appendChild(el('p', { class: 'font-headline-sm text-headline-sm text-deep-lagoon', 'data-axw-ejemplo-num': '1', style: 'overflow-wrap:anywhere', text: numeroMuestra(pr, 1, a) }));
          ej.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: U('luego_factura', { s: numeroMuestra(pr, 2, a) }) }));
          ej.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', 'data-axw-ejemplo-anio': '1',
                                   text: U('reinicio_anio', { a: String(a + 1), s: numeroMuestra(pr, 1, a + 1) }) }));
        });
        return {
          valores: function () { var v = lee(caja, 'prefijo_serie').toUpperCase(); return /^[A-Z0-9]{2,8}$/.test(v) ? { ok: true, v: { prefijo: v } } : { ok: false, error: U('prefijo_formato') }; },
          resumen: function (v) { return { grande: numeroMuestra(v.prefijo, 1, anioFiscal(ctx)), teclea: v.prefijo, boton: U('fijar_prefijo', { v: v.prefijo }) }; }
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
    precio_con_impuesto: opcionUnica('precio_incluye_impuesto', [['si', 'dentro'], ['no', 'fuera']], function (v, ctx) {
      // una tarifa redonda que tenga sentido en la moneda: un millón de rupias (o de dong), cien en las demás
      var mon0 = ctx.datos && ctx.datos.moneda ? String(ctx.datos.moneda) : '', cifra = /^(IDR|VND)$/.test(mon0) || !mon0 ? 1000000 : 100;
      var n = String(cifra);
      try { n = new Intl.NumberFormat(typeof window.lwLocale === 'function' ? window.lwLocale() : (document.documentElement.lang || 'es')).format(cifra); } catch (e) { /* MUDO A PROPOSITO: navegador sin Intl; va la cifra sin separar */ }
      var mon = ctx.datos && ctx.datos.moneda ? ' ' + ctx.datos.moneda : '';
      return U(v === 'si' ? 'ejemplo_dentro' : 'ejemplo_fuera', { v: n + mon });
    })
  };
  // Los tres pasos del AaaS (N5) se hacen en el asistente de Ajustes de su ventana (agente.html, 15-oct-2026; revisión previa #383 punto 6: un solo
  // camino de entrada): el enlace abre ESE paso (#ajustes-<paso>), no la ventana en general. La base da `donde` = '/agente/'; aquí solo se añade el ancla.
  var AAAS_PASO = { tope_aaas: 'tope', contexto_aaas: 'negocio', limites_aaas: 'limites' };
  function dondeDe(paso) {
    var d = String(paso.donde || '');
    if (!/^\/[a-z0-9\-\/]*$/i.test(d)) return null;
    return AAAS_PASO[paso.clave] && /\/agente\/$/.test(d) ? d + '#ajustes-' + AAAS_PASO[paso.clave] : d;
  }
  // Pasos que se hacen en otra pantalla (Flota, Entrega) y cualquier clave que esta pantalla no conozca todavía
  var EXTERNO = {
    externo: true,
    enlace: dondeDe,   // Ajustes › Configurar (ajustes_puesta.js) usa el mismo enlace que el asistente
    pinta: function (caja, ctx) {
      caja.appendChild(el('p', { class: 'font-body-md text-body-md text-on-surface', text: U('otra_pantalla') }));
      var d = dondeDe(ctx.paso);
      if (d) {
        caja.appendChild(el('a', { href: d, 'data-axw-accion': 'abrir-externo', class: 'inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-outline-variant font-label-md text-label-md text-deep-lagoon axw-btn',
                                   style: 'min-height:44px', text: U('abrir', { pantalla: S().texto('paso', ctx.paso.clave, 0) }) }));
      }
      return { valores: function () { return { ok: true, v: {} }; } };
    },
    guarda: function () { return Promise.resolve({ ok: true, externo: true }); }
  };
  /* «Quién lo usa» en el propio paso (mesa S14 del diseño del owner; bbm-p41, 13-oct). Owner, 09:15: «la ventana de permisos es la que teníamos
   * en Lawang… aparecen todos los módulos». Aquí solo sale el equipo y UNA casilla por persona: la herramienta de ESTE módulo, la misma con la que
   * la base decide el paso (window.AXW_MAPA_MODULOS.h, del registro). Sin herramienta en el registro → el paso de siempre, en Usuarios.
   *  · Lee la tabla `usuarios` como /usuarios/ (misma RLS). Activos, sin la cuenta de pruebas (la base tampoco la cuenta); el administrador
   *    principal (super_admin) va con «acceso total», sin casilla.
   *  · Guarda con usuario_guarda_permisos, la RPC de la ficha de Usuarios, que REEMPLAZA el array entero: por eso relee el `herramientas` de
   *    cada persona justo antes y manda ESE array con solo esta herramienta puesta o quitada (nunca el leído al pintar ni una lista filtrada).
   *  · «Puede crear / solo ver» del diseño no se pinta: la base no tiene niveles por herramienta (lista de Backend). Invitar = alta de Usuarios. */
  var COLS_USUARIO = 'user_id,nombre,email,rol,activo,herramientas,creado_por';
  // M5 de la auditoría del setup de bbm (15-oct-2026): la cuenta del estudio salía como otro «Administrador principal» y Noelia no sabía quién era.
  // Se rotula «Soporte de AxisWorks», sin casilla y sin contar, como hace la base (098100: _modulo_setup_pasos no cuenta las cuentas del estudio).
  // La MISMA regla que _es_cuenta_estudio (098000): dominio exacto tras la última @ = axisworks.studio, sin mayúsculas ni espacios; y lo creado por
  // el estudio («estudio:…»). Solo decide qué se pinta: quién cuenta lo dice la base al comprobar el paso.
  function esEstudio(u) {
    var e = String(u.email || '').trim().toLowerCase(), i = e.lastIndexOf('@');
    return String(u.creado_por || '').indexOf('estudio:') === 0 || (i > 0 && e.slice(i + 1) === 'axisworks.studio');
  }
  function herramientaDe(modulo) { var M = window.AXW_MAPA_MODULOS, h = M && M.h && M.h[modulo]; return typeof h === 'string' && h ? h : null; }
  function operativo(modulo) { var o = window.AXW_MAPA_MODULOS && window.AXW_MAPA_MODULOS.o; return Array.isArray(o) && o.indexOf(modulo) >= 0; }
  function cliente() {
    if (!window.LW_AUTH || typeof window.LW_AUTH.then !== 'function') return Promise.resolve(null);
    return window.LW_AUTH.then(function (a) { return a && a.sb ? a.sb : null; }, function () { return null; });
  }
  (function () {   // el interruptor: solo tokens de la piel (marca blanca); ≥ 3:1 como control encendido y apagado sobre la tarjeta
    if (typeof document === 'undefined' || !document.head || document.getElementById('axw-quien-estilo')) return;
    var st = document.createElement('style');
    st.id = 'axw-quien-estilo';
    st.textContent = '.axw-sw{position:relative;display:inline-flex;align-items:center;min-height:44px;min-width:52px;cursor:pointer}' +
      '.axw-sw input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer}' +
      '.axw-sw i{display:block;width:44px;height:26px;border-radius:999px;background:rgb(var(--tema-outline));transition:background .15s}' +
      '.axw-sw i::after{content:"";display:block;width:20px;height:20px;margin:3px;border-radius:50%;background:rgb(var(--tema-surface-container-lowest));transition:transform .15s}' +
      '.axw-sw input:checked+i{background:rgb(var(--tema-on-surface))}.axw-sw input:checked+i::after{transform:translateX(18px)}' +
      '.axw-sw input:focus-visible+i{outline:2px solid rgb(var(--tema-burnt-earth));outline-offset:2px}' +
      '@media (prefers-reduced-motion:reduce){.axw-sw i,.axw-sw i::after{transition:none}}';
    document.head.appendChild(st);
  })();
  var QUIEN = {
    sinMotivo: true,   // usuario_guarda_permisos no pide motivo
    pinta: function (caja, ctx) {
      var herr = herramientaDe(ctx.paso.modulo), m = S().nombreModulo(ctx.paso.modulo);
      if (!herr) return EXTERNO.pinta(caja, ctx);
      var st = { lista: null, error: null };
      var lista = el('ul', { class: 'flex flex-col rounded-2xl border border-outline-variant', role: 'list', 'data-axw-quien': 'lista', 'aria-busy': 'true' },
                     [el('li', { class: 'px-4 py-3 font-body-md text-body-md text-on-surface-variant', text: U('cargando') })]);
      var cuenta = el('p', { class: 'font-label-md text-label-md text-on-surface', 'data-axw-quien': 'cuenta', 'aria-live': 'polite' });
      var d = String(ctx.paso.donde || '');
      var invitar = /^\/[a-z0-9\-\/]*$/i.test(d) ? el('a', { href: d, 'data-axw-quien': 'invitar', style: 'min-height:44px',
        class: 'inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-outline-variant font-label-md text-label-md text-deep-lagoon self-start', text: U('invitar') }) : null;
      caja.appendChild(lista);
      caja.appendChild(el('div', { class: 'flex flex-wrap items-center justify-between gap-3' }, [invitar, cuenta]));
      caja.appendChild(el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: U('quien_nota') }));
      function recuenta() {
        if (!st.lista) return;
        // la regla de la base: en un módulo operativo el administrador principal no cuenta; en uno administrativo, sí
        var n = (operativo(ctx.paso.modulo) ? 0 : st.lista.filter(function (u) { return u.rol === 'super_admin' && !esEstudio(u); }).length)
              + lista.querySelectorAll('input[data-axw-quien-usuario]:checked').length;
        cuenta.textContent = n === 1 ? U('quien_uno', { m: m }) : U('quien_n', { n: String(n), m: m });
      }
      function carga() { return cliente().then(function (sb) {
        if (!sb) return { error: { code: '42501' } };
        return new Promise(function (ok) { ok(sb.from('usuarios').select(COLS_USUARIO).eq('activo', true)); });
      }).then(function (r) {
        st.lista = null; st.error = null;
        while (lista.firstChild) lista.removeChild(lista.firstChild);
        lista.setAttribute('aria-busy', 'false');
        if (!r || r.error || !Array.isArray(r.data)) {
          st.error = S().explica((r && r.error) || {}, true).texto;
          lista.appendChild(el('li', { role: 'alert', class: 'px-4 py-3 font-body-md text-body-md text-error', text: U('no_mirar') + ': ' + st.error }));
          return;
        }
        st.lista = r.data.filter(function (u) { return u && u.user_id && u.activo !== false && String(u.creado_por || '') !== 'estudio:cuenta-pruebas'; })
          .sort(function (a, b) { return esEstudio(a) - esEstudio(b) || (b.rol === 'super_admin') - (a.rol === 'super_admin') || String(a.nombre || a.email || '').localeCompare(String(b.nombre || b.email || '')); });
        st.lista.forEach(function (u, i) {
          var nombre = String(u.nombre || u.email || '—'), estudio = esEstudio(u), principal = !estudio && u.rol === 'super_admin';
          var tiene = Array.isArray(u.herramientas) && u.herramientas.indexOf(herr) >= 0;
          var der = estudio ? el('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', 'data-axw-quien-estudio': u.user_id, text: U('quien_no_cuenta') })
            : principal ? el('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: U('quien_total') })
            : el('label', { class: 'axw-sw' }, [
                el('input', { type: 'checkbox', role: 'switch', 'data-axw-quien-usuario': u.user_id, 'aria-label': U('quien_usa', { p: nombre, m: m }), checked: tiene ? '' : null }),
                el('i', { 'aria-hidden': 'true' })]);
          lista.appendChild(el('li', { class: 'flex items-center gap-3 px-4 py-3' + (i ? ' border-t border-outline-variant' : '') }, [
            el('span', { class: 'rounded-full bg-surface-container-high font-label-md text-label-md text-on-surface', 'aria-hidden': 'true',   // grid/place-items no están compilados en la instancia
                         style: 'width:40px;height:40px;flex:none;display:grid;place-items:center', text: nombre.trim().charAt(0).toUpperCase() }),
            el('div', { class: 'flex flex-col min-w-0 flex-1' }, [
              el('span', { class: 'font-label-md text-label-md text-on-surface', style: 'overflow-wrap:anywhere', text: nombre }),
              el('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', style: 'overflow-wrap:anywhere', text: estudio ? U('quien_estudio') : principal ? U('quien_principal') : String(u.email || '') })]),
            der]));
        });
        if (!st.lista.some(function (u) { return u.rol !== 'super_admin' && !esEstudio(u); }))
          lista.appendChild(el('li', { class: 'px-4 py-3 border-t border-outline-variant font-body-md text-body-md text-on-surface-variant', 'data-axw-quien': 'solo-tu', text: U('quien_solo_tu') }));
        recuenta();
      }); }
      lista.addEventListener('change', recuenta);
      carga();
      return {
        valores: function () {
          if (st.error) return { ok: false, error: U('no_mirar') + ': ' + st.error };
          if (!st.lista) return { ok: false, error: U('cargando') };
          var cambios = [];
          lista.querySelectorAll('input[data-axw-quien-usuario]').forEach(function (i) {
            var u = st.lista.filter(function (x) { return x.user_id === i.getAttribute('data-axw-quien-usuario'); })[0];
            var antes = !!(u && Array.isArray(u.herramientas) && u.herramientas.indexOf(herr) >= 0);
            if (u && i.checked !== antes) cambios.push({ user_id: u.user_id, poner: i.checked });
          });
          if (!cambios.length && !ctx.paso.hecho) return { ok: false, error: U('quien_sin_cambios', { m: m }) };
          return { ok: true, v: { herr: herr, cambios: cambios, recarga: carga } };
        }
      };
    },
    guarda: function (sb, v) {
      if (!v || !v.herr || !Array.isArray(v.cambios)) return faltaFila();
      var i = 0;
      function fila(id) { return resultado(sb.from('usuarios').select('user_id,herramientas').eq('user_id', id).maybeSingle()); }
      function tiene(d) { return !!(d && Array.isArray(d.herramientas) && d.herramientas.indexOf(v.herr) >= 0); }
      // a medias (alguien guardado y otro no): la lista se relee para que los interruptores digan lo que quedó en la base
      function corta(r) { if (i > 1 && typeof v.recarga === 'function') v.recarga(); return r; }
      function sigue() {
        if (i >= v.cambios.length) return Promise.resolve({ ok: true });
        var c = v.cambios[i++];
        return fila(c.user_id).then(function (r) {
          if (!r.ok) return corta(r);
          if (!r.data) return faltaFila().then(corta);
          var hs = (Array.isArray(r.data.herramientas) ? r.data.herramientas : []).filter(function (h) { return h !== v.herr; });
          if (c.poner) hs.push(v.herr);
          return resultado(sb.rpc('usuario_guarda_permisos', { p_user_id: c.user_id, p_cambios: { herramientas: hs } })).then(function (r2) {
            if (r2.ok) return sigue();
            if (!r2.sinRespuesta) return corta(r2);
            // sin respuesta: se relee ESA fila y manda lo que tiene la base (revisor 13-oct: nunca «guardado» porque el paso ya esté hecho)
            return fila(c.user_id).then(function (r3) {
              // no se pudo mirar, o se miró y no se aplicó: duda → comprueba() = false → «El ERP dice que no se guardó» (repetir es seguro)
              if (!r3.ok || tiene(r3.data) !== c.poner) return corta(r2);
              return sigue();
            });
          });
        });
      }
      return sigue();
    },
    // si la duda llega a la pantalla es que ni se pudo releer la fila: no se da por guardado; repetir es seguro
    comprueba: function () { return false; }
  };
  PASOS.usuarios = QUIEN;
  function de(clave, paso) {
    // «quién lo usa» sin herramienta para ese módulo en el mapa del build (base y build desfasados): el paso se hace en Usuarios
    if (clave === 'usuarios' && paso && !herramientaDe(paso.modulo)) return EXTERNO;
    return PASOS[clave] || EXTERNO;
  }
  // Un paso con su componente en otro fichero (cobros_paso.js, setup_reservas.js; F3) se suma con registra(). Solo sustituye al genérico de «otra
  // pantalla» (flota, entrega); nunca pisa un componente de verdad.
  function registra(clave, comp) { if ((!PASOS[clave] || PASOS[clave] === EXTERNO) && comp && typeof comp.pinta === 'function' && typeof comp.guarda === 'function') PASOS[clave] = comp; }
  // flota y entrega se hacen fuera aunque se conozcan
  ['flota', 'entrega'].forEach(function (k) { PASOS[k] = EXTERNO; });

  window.AXW_PASOS = { de: de, registra: registra, slug: slug, pideMotivo: pideMotivo, conocidos: Object.keys(PASOS), COLS_SOCIEDAD: COLS_SOCIEDAD };
})();
