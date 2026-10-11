// node pruebas/base_falsa.harness.cjs <guard.js generado> <dinero.js> <totales.js>   (lo lanza test_base_falsa.py)
// La base falsa de la demo (demo_datos.js + el doble de QA, tal como los junta build.py en guard.js) en un `vm` de Node con
// un navegador mínimo: sessionStorage de verdad (un Map por «pestaña»), sin red (fetch/XHR que fallan si alguien los llama).
// Recorre el flujo del criterio de A2/A3 por el MISMO cliente que usan las pantallas (window.LW_SB): alta de cliente →
// contrato → firma → factura → justificante → recibí → pendiente baja; «otra página» de la misma pestaña lo vuelve a ver;
// «Reset demo» y «pestaña nueva» lo devuelven al inicio. Y las reglas de la base que el doble impone, con su mensaje.
// No mide pantallas (eso es del verificador en el navegador): mide la base falsa.
'use strict';
const fs = require('fs');
const vm = require('vm');
const [GUARD, DINERO, TOTALES] = process.argv.slice(2).map(p => fs.readFileSync(p, 'utf8'));
let fallos = 0;
const ok = (n, c, extra) => { if (!c) { fallos++; console.log('FALLA  ' + n + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); } else console.log('ok     ' + n); };

function almacen(mapa) {
  return { get length() { return mapa.size; }, key: i => Array.from(mapa.keys())[i] ?? null, getItem: k => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => { mapa.set(k, String(v)); }, removeItem: k => { mapa.delete(k); }, clear: () => mapa.clear() };
}
const RED = [];
/* Una «página»: contexto nuevo, mismo sessionStorage si es la misma pestaña. */
function pagina(sesion, local) {
  const nodo = () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, textContent: '' });
  const doc = { documentElement: { style: {} }, head: nodo(), body: nodo(), readyState: 'complete', cookie: '',
    createElement: nodo, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
  function XHR() {}
  XHR.prototype.open = function (m, u) { RED.push(['xhr', m, u]); };
  XHR.prototype.send = function () {};
  const w = { document: doc, location: { search: '', pathname: '/', href: 'https://demo.invalid/', origin: 'https://demo.invalid', reload() { w.__recargada = true; } },
    sessionStorage: almacen(sesion), localStorage: almacen(local), navigator: { userAgent: 'node' }, console,
    fetch: (u, i) => { RED.push(['fetch', (i && i.method) || 'GET', String(u)]); return Promise.reject(new Error('sin red')); },
    XMLHttpRequest: XHR, setTimeout, clearTimeout, Intl, Date, Math, JSON, Promise, URLSearchParams, Object, Array, String, Number, Boolean, RegExp, Error, TypeError, BigInt, Proxy };
  w.window = w; w.self = w; w.globalThis = w;
  const ctx = vm.createContext(w);
  vm.runInContext(DINERO, ctx);    // sin `module` en el contexto: ni exporta ni hace require, como en el navegador
  vm.runInContext(TOTALES, ctx);
  // las declaraciones de nivel superior quedan en el contexto: la pantalla de facturas las tiene igual
  vm.runInContext('window.calcTotales = calcTotales;', ctx);
  vm.runInContext(GUARD, ctx);
  return w;
}
const r = (q) => Promise.resolve(q);

(async () => {
  const pestana = new Map(), local = new Map();
  let w = pagina(pestana, local);
  let sb = w.LW_SB;
  ok('el guard monta el cliente falso', !!sb && typeof sb.rpc === 'function');
  ok('candado: fetch POST al propio dominio falla', await w.fetch('/x', { method: 'POST' }).then(() => false, e => /Not available in the demo/.test(e.message)));
  ok('candado: XHR POST falla', (() => { try { new w.XMLHttpRequest().open('POST', '/x'); return false; } catch (e) { return true; } })());

  // ── siembra: datos inventados, sin marca de nadie
  const F0 = await r(sb.from('contratos').select('*'));
  ok('la siembra trae contratos', F0.data && F0.data.length > 10, F0.data && F0.data.length);
  const soc = await r(sb.rpc('sociedades_visibles').order('orden'));
  ok('una sola sociedad, inventada', soc.data && soc.data.length === 1 && soc.data[0].clave === 'axw_demo', soc.data);

  // ── numeración de la siembra: una serie por prefijo y sin huecos
  const facs0 = (await r(sb.from('facturas').select('*'))).data;
  for (const pref of ['PRO', 'INV', 'REC']) {
    const ns = facs0.map(f => f.numero).filter(n => n.indexOf(pref) === 0).map(n => Number(n.slice(3))).sort((a, b) => a - b);
    ok('serie ' + pref + ' seguida desde 1', ns.length > 0 && ns.every((n, i) => n === i + 1), ns.slice(0, 5));
  }

  // ── A3 alta de cliente
  const mal = await r(sb.rpc('cliente_guarda', { p_id: null, p_datos: { full_name: 'X' } }));
  ok('alta sin datos: error con lo que falta', mal.error && /missing: Full name, Email/.test(mal.error.message), mal.error);
  const alta = await r(sb.rpc('cliente_guarda', { p_id: null, p_datos: { full_name: 'Testa Probelli', email: 'testa@example.com', phone: '+44 7000 000000', nationality: 'Italy', passport_number: 'ya1234567' } }));
  ok('alta de cliente devuelve el uuid', !alta.error && /^d0d0d0d0-/.test(alta.data), alta);
  const cli = alta.data;
  const lista = await r(sb.rpc('compradores_lista').select('id,full_name').order('created_at', { ascending: false }));
  ok('compradores_lista encadenable y con el nuevo primero', !lista.error && lista.data[0].id === cli && lista.data[0].full_name === 'TESTA PROBELLI', lista.data && lista.data[0]);
  const nums = await r(sb.rpc('compradores_numeros'));
  ok('número de cliente seguido (CLI-00016)', (nums.data.find(x => x.id === cli) || {}).numero_cliente === 'CLI-00016', nums.data.find(x => x.id === cli));

  // ── contrato y firma (las RPC de B)
  const libre = (await r(sb.from('unidades').select('*').eq('estado', 'disponible'))).data.find(u => !u.contrato_id);
  const k = await r(sb.rpc('demo_contrato_crea', { p_client_id: cli, p_unidad_id: libre.id, p_tipo: 'reserva_parcela', p_precio: 60000 }));
  ok('contrato creado con número siguiente', !k.error && /^RP\d{5}$/.test(k.data.numero) && k.data.operacion_id, k);
  const rpMax = Math.max(...F0.data.filter(c => c.tipo === 'reserva_parcela').map(c => Number(c.numero.slice(2))));
  ok('sin huecos en la serie RP', k.data && Number(k.data.numero.slice(2)) === rpMax + 1, [k.data && k.data.numero, rpMax]);
  const otra = await r(sb.rpc('demo_contrato_crea', { p_client_id: cli, p_unidad_id: libre.id, p_tipo: 'reserva_parcela', p_precio: 1 }));
  ok('la misma parcela no se reserva dos veces', otra.error && /not available/.test(otra.error.message), otra);
  const fi = await r(sb.rpc('demo_contrato_firma', { p_contrato: k.data.id }));
  ok('firma', !fi.error && fi.data.fecha_firma, fi);
  const fi2 = await r(sb.rpc('demo_contrato_firma', { p_contrato: k.data.id }));
  ok('no se firma dos veces', fi2.error && /already signed/.test(fi2.error.message), fi2);
  const u1 = (await r(sb.from('unidades').select('*').eq('id', libre.id).maybeSingle())).data;
  ok('la parcela queda reservada', u1.estado === 'reservada' && u1.contrato_id === k.data.id, u1);

  // ── factura desde el contrato
  const lineas = [{ descripcion: 'Plot hold deposit', importe: 6000 }];
  const pf = (tot, extra) => Object.assign({ tipo: 'factura', sociedad: 'tepi_sungai', cliente_nombre: 'TESTA PROBELLI', contrato_id: k.data.id, client_id: cli,
    total: tot, moneda: 'EUR', fecha_emision: null, justificantes: [], datos: { fields: { imp_pct: '10' }, lineas } }, extra || {});
  const noCuadra = await r(sb.rpc('factura_guarda', { p_id: null, p_factura: pf(6000) }));
  ok('total que no cuadra: error', noCuadra.error && /does not add up/.test(noCuadra.error.message), noCuadra.error);
  const fa = await r(sb.rpc('factura_guarda', { p_id: null, p_factura: pf(6600) }));
  const fila = fa.data && fa.data[0];
  ok('factura_guarda devuelve id, número y total', !fa.error && fila && fila.id && /^INV\d{5}$/.test(fila.numero) && fila.total === 6600, fa);
  const invMax = Math.max(...facs0.filter(f => f.tipo === 'factura').map(f => Number(f.numero.slice(3))));
  ok('serie INV sin huecos', fila && Number(fila.numero.slice(3)) === invMax + 1, [fila && fila.numero, invMax]);
  const guardada = (await r(sb.from('facturas').select('*').eq('id', fila.id).maybeSingle())).data;
  ok('emisor fijo inventado aunque la pantalla mande otro', guardada.sociedad === 'axw_demo' && guardada.datos.emisor.razon.indexOf('AxisWorks Demo') === 0, guardada.sociedad);
  ok('líneas + impuesto = total', guardada.datos.totales.subtotal === 6000 && guardada.datos.totales.impuesto === 600 && guardada.total === 6600, guardada.datos.totales);
  const tope = await r(sb.rpc('factura_guarda', { p_id: null, p_factura: pf(66000, { datos: { fields: {}, lineas: [{ descripcion: 'x', importe: 66000 }] } }) }));
  ok('tope por cadena: no se factura más que el precio', tope.error && /agreed price/.test(tope.error.message), tope.error);
  let pend = (await r(sb.rpc('facturas_pendiente_equipo').select('*'))).data.find(x => x.factura_id === fila.id);
  ok('pendiente = total al emitir', pend && pend.pendiente === 6600, pend);

  // ── recibí con justificante simulado
  const sinJ = await r(sb.rpc('guardar_recibi', { p_id: null, p_factura: { contrato_id: k.data.id, total: 1000, moneda: 'EUR', justificantes: [] }, p_aplicaciones: [{ factura_id: fila.id, importe: 1000 }] }));
  ok('recibí sin justificante: error', sinJ.error && /proof of payment/.test(sinJ.error.message), sinJ.error);
  const inventado = await r(sb.rpc('guardar_recibi', { p_id: null, p_factura: { contrato_id: k.data.id, total: 1000, moneda: 'EUR', justificantes: [{ path: 'demo/subidas/99-99.pdf' }] }, p_aplicaciones: [{ factura_id: fila.id, importe: 1000 }] }));
  ok('justificante no subido: error', inventado.error && /was not found/.test(inventado.error.message), inventado.error);
  const url = await w.lwFicheros(sb, 'justificante_url', { ext: '.pdf' });
  const sube = await sb.storage.from('justificantes').uploadToSignedUrl(url.path, url.token, { name: 'transfer.pdf', size: 1234, type: 'application/pdf' });
  ok('subida simulada (solo nombre y tamaño)', !sube.error, sube);
  const fd = (await r(sb.from('ficheros_demo').select('*'))).data[0];
  ok('del fichero se guarda nombre y tamaño, nada más', fd && fd.nombre === 'transfer.pdf' && fd.bytes === 1234 && !('contenido' in fd), fd);
  ok('otra edge de ficheros falla cerrada', await w.lwFicheros(sb, 'limpia_borradores').then(() => false, e => /Not available/.test(e.message)));
  const demas = await r(sb.rpc('guardar_recibi', { p_id: null, p_factura: { contrato_id: k.data.id, total: 7000, moneda: 'EUR', justificantes: [{ path: url.path, nombre: 'transfer.pdf' }] }, p_aplicaciones: [{ factura_id: fila.id, importe: 7000 }] }));
  ok('recibí por encima del pendiente: error', demas.error && /only has 6600 outstanding/.test(demas.error.message), demas.error);
  const rec = await r(sb.rpc('guardar_recibi', { p_id: null, p_factura: { contrato_id: k.data.id, cliente_nombre: 'TESTA PROBELLI', total: 2600, moneda: 'EUR', justificantes: [{ path: url.path, nombre: 'transfer.pdf' }], datos: { fields: {} } }, p_aplicaciones: [{ factura_id: fila.id, importe: 2600 }] }));
  ok('recibí emitido con número', !rec.error && /^REC\d{5}$/.test(rec.data.numero) && rec.data.id, rec);
  pend = (await r(sb.rpc('facturas_pendiente_equipo').select('*'))).data.find(x => x.factura_id === fila.id);
  ok('el pendiente baja', pend && pend.pendiente === 4000, pend);
  const kc = (await r(sb.from('contratos').select('*').eq('id', k.data.id).maybeSingle())).data;
  ok('lo cobrado del contrato sube', kc.cobrado === 2600, kc.cobrado);

  // ── editar y borrar FILTRAN
  const familia = await r(sb.rpc('contratos_equipo').select('id,numero').or('id.eq.' + k.data.id + ',contrato_padre_id.eq.' + k.data.id));
  ok('.or() filtra: «Borrar operación» cuenta solo su cadena', familia.data.length === 1, familia.data.length);
  const nAntes = F0.data.length + 1;
  const borrarTodo = await r(sb.from('contratos').delete());
  ok('borrar sin filtro: error, no borra nada', borrarTodo.error && (await r(sb.from('contratos').select('*'))).data.length === nAntes, borrarTodo.error);
  const cambiaUna = await r(sb.from('clients').update({ notes: 'VIP' }).eq('id', cli).select());
  ok('update filtra: cambia solo esa fila', !cambiaUna.error && cambiaUna.data.length === 1 && (await r(sb.from('clients').select('*').eq('notes', 'VIP'))).data.length === 1, cambiaUna);
  const numerada = await r(sb.from('facturas').delete().eq('id', fila.id));
  ok('una factura numerada no se borra', numerada.error && /VOIDED/.test(numerada.error.message), numerada.error);

  // ── otra página de la MISMA pestaña: todo sigue ahí
  w = pagina(pestana, local); sb = w.LW_SB;
  const cli2 = (await r(sb.from('clients').select('*').eq('id', cli).maybeSingle())).data;
  ok('otra página: el cliente sigue', cli2 && cli2.full_name === 'TESTA PROBELLI' && cli2.notes === 'VIP', cli2);
  const rec2 = (await r(sb.from('facturas').select('*').eq('id', rec.data.id).maybeSingle())).data;
  ok('otra página: el recibí sigue', rec2 && rec2.numero === rec.data.numero, rec2);
  pend = (await r(sb.rpc('facturas_pendiente_equipo').select('*'))).data.find(x => x.factura_id === fila.id);
  ok('otra página: el pendiente sigue en 4000', pend && pend.pendiente === 4000, pend);
  const fa2 = await r(sb.rpc('factura_guarda', { p_id: null, p_factura: pf(1100, { datos: { fields: { imp_pct: '10' }, lineas: [{ descripcion: 'Second', importe: 1000 }] } }) }));
  ok('otra página: la numeración sigue sin repetir', fa2.data && Number(fa2.data[0].numero.slice(3)) === invMax + 2, fa2);

  // ── anular / reactivar / borrar (solo proformas)
  const idF2 = fa2.data[0].id;
  ok('factura_borra de una numerada: error', ((await r(sb.rpc('factura_borra', { p_id: idF2 }))).error || {}).message.indexOf('VOIDED') !== -1);
  ok('factura_anula', !(await r(sb.rpc('factura_anula', { p_id: idF2 }))).error && (await r(sb.from('facturas').select('*').eq('id', idF2).maybeSingle())).data.anulada === true);
  ok('anular dos veces: error', /already void/.test(((await r(sb.rpc('factura_anula', { p_id: idF2 }))).error || {}).message));
  ok('factura_reactiva', !(await r(sb.rpc('factura_reactiva', { p_id: idF2 }))).error && (await r(sb.from('facturas').select('*').eq('id', idF2).maybeSingle())).data.anulada === false);

  // ── borrar operación: anula lo numerado, libera la parcela, solo esa cadena
  const bo = await r(sb.rpc('borrar_operacion', { p_contrato_id: k.data.id }));
  ok('borrar operación: 1 contrato y sus 3 documentos anulados', !bo.error && bo.data.contratos_borrados === 1 && bo.data.facturas_anuladas === 3, bo);
  ok('borrar operación: el resto de contratos sigue', (await r(sb.from('contratos').select('*'))).data.length === F0.data.length, null);
  const u2 = (await r(sb.from('unidades').select('*').eq('id', libre.id).maybeSingle())).data;
  ok('borrar operación: la parcela vuelve a estar libre', u2.estado === 'disponible' && !u2.contrato_id, u2);

  // ── «Reset demo»: vuelve al inicio
  ok('Reset demo devuelve true y recarga', w.LW_DEMO_RESTABLECE() === true && w.__recargada === true);
  ok('Reset demo: sin claves axw-demo:', Array.from(pestana.keys()).filter(x => x.indexOf('axw-demo:') === 0).length === 0, Array.from(pestana.keys()));
  w = pagina(pestana, local); sb = w.LW_SB;
  ok('tras Reset: el cliente nuevo ya no está', !(await r(sb.from('clients').select('*').eq('id', cli).maybeSingle())).data);
  // ── pestaña nueva: limpia
  const w3 = pagina(new Map(), local);
  ok('pestaña nueva: empresa inicial', (await r(w3.LW_SB.from('facturas').select('*'))).data.length === facs0.length);

  // ── nada fuera de la pestaña ni a la red
  ok('nada en localStorage', local.size === 0, Array.from(local.keys()));
  ok('ninguna petición de red', RED.length === 0, RED);

  // ── datos 100 % inventados: ni marca ni referencia interna en lo sembrado
  const w4 = pagina(new Map(), new Map());
  await r(w4.LW_SB.from('contratos').select('*'));
  const todo = JSON.stringify(await (async () => {
    const out = {};
    for (const t of ['usuarios', 'clients', 'contratos', 'facturas', 'crm_leads', 'proyectos', 'unidades', 'sociedades', 'comunicados', 'notificaciones',
      'hilo_soporte', 'mensajes_comprador', 'equipos_venta', 'solicitudes_pago', 'productos', 'cuentas_bancarias', 'obra', 'documents', 'contrato_firmas',
      'contrato_eventos', 'documentos_proyecto', 'obra_fases', 'deck_faq', 'correos_enviados', 'crm_campanas', 'bot_consultas', 'bot_faq', 'bot_temas', 'modelos', 'modelos_villa', 'extras']) {
      out[t] = (await r(w4.LW_SB.from(t).select('*'))).data;
    }
    return out;
  })());
  const PROHIBIDO = /qa\.|axisworks\.test|LAW-\d|Lawang|Sumba|Palm ?Field|Tepi|San ?Dal|Sandal|BodaEnlace|Bali ?Best|Nusantara|@demo\.test/i;
  const marcas = [];
  const g = new RegExp(PROHIBIDO.source, 'gi');
  let m;
  while ((m = g.exec(todo)) && marcas.length < 40) marcas.push(todo.slice(Math.max(0, m.index - 70), m.index + 40));
  ok('los datos de partida no nombran a ningún cliente ni referencia interna', !marcas.length, marcas);

  console.log(fallos ? '\n' + fallos + ' FALLO(S)' : '\nTODO OK');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('REVIENTA', e && e.stack || e); process.exit(2); });
