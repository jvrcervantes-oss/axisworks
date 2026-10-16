// Prueba de los avisos del guardián de Vault en agente.html (17-oct-2026, sesión guardian-vault; migración de la agencia 20261017100000): node agente_desconecta.test.js
// Ejecuta escribeV2 y el texto de éxito de desconecta() del agente.html REAL con dobles mínimos. Si la llave no se pudo borrar de la caja fuerte
// (llave_sin_vaciar=true), el aviso tiene que decirlo y no quedarse en «Desconectada.». «otro_secreto» tiene que explicar qué hacer.
// Antes vivía como arnés suelto fuera del repo; un cambio en escribeV2 podía volver a tapar el aviso sin que fallara nada (revisor, 17-oct).
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'agente.html'), 'utf8');
function corta(desde, hasta) { const i = src.indexOf(desde); if (i < 0) throw new Error('no está: ' + desde); const j = src.indexOf(hasta, i); return src.slice(i, j); }
const escribe = corta('  function escribeV2(', '  function palanca(');
const conMotivo = corta('  var CON_MOTIVO = {', '  var PALANCA_MOTIVO');
const conError = corta('  var CON_ERROR = {', '  /* {ok:false, motivo}');
const desc = corta('  function desconecta(el) {', '  function alEnviar(');
const okFn = desc.match(/llama\('agente_conexion_desconecta', \{ p_proveedor: prov \}\), (function \(d\) \{[\s\S]*?\n        \})/)[1];
const ctx = `
  var T = function (s) { return s; }, Tf = function (s) { return s; };
  var msgV2 = function (n, m) { if (m) salidas.push([n, m]); };
  var $a = function () { return {}; }, sueltaV2 = function () {}, textoError = function () { return 'E'; };
  var esObj = function (o) { return o && typeof o === 'object'; }, carga = function () { return Promise.resolve(); };
  ${conError}${conMotivo}${escribe}
  var okFn = ${okFn};
  return { escribeV2, okFn, CON_MOTIVO, CON_ERROR };`;
const nuevo = s => new Function('salidas', ctx)(s);
const texto = (s, zona) => (s.find(x => x[0] === zona) || [])[1] || '';

let fallos = 0, total = 0;
function ok(n, c, d) { total++; if (!c) { fallos++; console.log('FALLA: ' + n + (d !== undefined ? ' — ' + JSON.stringify(d) : '')); } }
const CASOS = [
  [{ ok: true, cambia: true, llave_sin_vaciar: true }, /no se pudo borrar/],
  [{ ok: true, cambia: true, llave_sin_vaciar: false }, /^Desconectada\.$/],
  [{ ok: true, cambia: false }, /Ya estaba así/],
];
(async () => {
  for (const [data, re] of CASOS) {
    const s = [];
    await nuevo(s).escribeV2({}, Promise.resolve({ data }), nuevo([]).okFn, null, null);
    ok('desconecta ' + JSON.stringify(data), re.test(texto(s, 'v2-ok')), texto(s, 'v2-ok'));
  }
  const s = [], n = nuevo(s);
  await n.escribeV2({}, Promise.resolve({ data: { ok: false, motivo: 'otro_secreto' } }), 'x', function (k) { return n.CON_MOTIVO[k]; }, null);
  ok('otro_secreto', /Desconectar y vuelve a pegarla/.test(texto(s, 'v2-error')), texto(s, 'v2-error'));
  ok('CON_ERROR.llave_sin_vaciar', /caja fuerte/.test(n.CON_ERROR.llave_sin_vaciar || ''), n.CON_ERROR.llave_sin_vaciar);
  if (fallos) { console.log(fallos + ' de ' + total + ' FALLAN'); process.exit(1); }
  console.log('ok: ' + total + ' comprobaciones');
})();
