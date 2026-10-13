/* El DOCUMENTO (factura, proforma, recibí, rectificativa) de una instancia en indonesio + inglés (BBM-65, 13-oct-2026).
   node pruebas/documento_idiomas.harness.cjs <paquete construido> [--html <carpeta>]

   Carga el documento.js SERVIDO por el paquete (clasico/facturas/), con dinero.js, entities.js y totales.js del mismo paquete, en un ámbito
   (como documento.test.js de Lawang). Desde BBM-72 ese fichero lleva los dos papeles y elige con Ajustes › Idiomas (window.AXW_IDIOMAS_DOC).
   Sin fila y con Ajustes id·en pinta los cuatro tipos en IDR y exige:
     · ni una palabra española en el papel (texto sin etiquetas): rótulos, títulos, concepto del recibí, mes de la fecha;
     · la fecha con el mes en indonesio y los importes IDR sin decimales;
     · <html lang="id"> en la página que va al PDF y al correo.
   Con Ajustes es·en: el papel español·inglés, lang="es", con lo que es de la instancia («Referencia», y en el recibí «Recibido de»), nunca
   «Proyecto» ni, en el recibí, «Facturar a». El correo que acompaña al PDF (editores.js) elige con axwDocId(): id+en o es+en.
   Con --html escribe las páginas (documentoPagina) para sacar capturas y PDF. Sin paquete id+en, sale con error: no hay nada que medir. */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dist = args[0];
const htmlDir = args.indexOf('--html') >= 0 ? args[args.indexOf('--html') + 1] : null;
if (!dist || !fs.existsSync(path.join(dist, 'clasico', 'facturas', 'documento.js'))) {
  console.error('uso: node documento_idiomas.harness.cjs <paquete construido de una instancia> [--html <carpeta>]');
  process.exit(2);
}
const RUTAS = ['contracts/assets/dinero.js', 'contracts/assets/entities.js', 'clasico/facturas/totales.js', 'clasico/facturas/documento.js'];
// BBM-72 (bbm-p40, 13-oct): el papel sigue a Ajustes › Idiomas (window.AXW_IDIOMAS_DOC, el primero manda); sin fila, el par del build (id·en en bbm)
function carga(idiomasDoc) {
  const caja = {};
  new Function('caja', 'window',
    RUTAS.map(p => fs.readFileSync(path.join(dist, p), 'utf8')).join('\n;\n') +
    '\n;Object.assign(caja,{SOCIEDADES,CUENTAS_BANCARIAS,documentoPagina,documentoHTML,TIPOS_DOC,conceptoCobroRecibi});'
  )(caja, { AXW_IDIOMAS_DOC: idiomasDoc });
  Object.assign(caja.SOCIEDADES, {
    emisor: { label: 'PT Contoh Motor', razon: 'PT CONTOH MOTOR', marca: 'CONTOH RENTAL', domicilio: 'Jl. Raya Kuta 1, Badung, Bali',
      npwp: '01.234.567.8-901.000' },
  });
  return caja;
}
let caja = carga(null);

const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); };
const texto = h => h.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
// Palabras del papel de Lawang en español, meses y palabras sueltas (de, la, por…), para cazar también un rótulo NUEVO que Lawang añada:
// ninguna puede salir en el de la instancia (los datos de prueba de abajo no llevan ninguna)
// límites por letra Unicode y no \b: sin la marca u, \b tras una vocal con tilde («Recibí») no casa nunca (revisor, 2.ª vuelta)
const ESPANOL = /(?<!\p{L})(Factura|Recib[ií]|Cobro|Conceptos?|Descripci[oó]n|Importe|Impuesto|Notas?|Datos|Cuenta|Titular|Direcci[oó]n|Vencimiento|Contrato|Proyecto|Sin|Facturar|Rectifica|Motivo|Fecha|Banco|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|de|del|la|las|el|los|por|para|con|pago|forma)(?!\p{L})/iu;

const base = {
  sociedad: 'emisor', moneda: 'IDR', fecha_emision: '2026-10-14', fecha_vencimiento: '2026-10-21',
  cliente_nombre: 'Wayan Test', cliente_documento: 'P1234567', cliente_email: 'wayan@example.com', proyecto_nombre: 'R-0012',
  cuenta: 'otros', banco_titular: 'PT CONTOH MOTOR', banco_nombre: 'Bank Mandiri', banco_cuenta: '1234567890', banco_codigo: 'BMRIIDJA',
  banco_direccion: 'Jl. Sunset Road, Kuta', banco_extra: 'Ref R-0012', notas: 'Helm 2 · Helmets 2',
  imp_pct: '11', imp_etiqueta: '',
  lineas: [{ descripcion: 'Honda PCX 160 · 2026-10-14 → 2026-10-16', importe: '1.500.000' }, { descripcion: 'Helm', importe: '50.000' }],
};
const casosDe = () => [
  ['factura', Object.assign({}, base, { tipo: 'factura' }), 'INV-2026-0001'],
  ['proforma', Object.assign({}, base, { tipo: 'proforma' }), 'PRO-2026-0001'],
  ['recibi', Object.assign({}, base, { tipo: 'recibi', imp_pct: '', lineas: [{ descripcion: caja.conceptoCobroRecibi('INV-2026-0001'), importe: '1.550.000' }] }), 'REC-2026-0001'],
  ['rectificativa', Object.assign({}, base, { tipo: 'factura', rectifica_numero: 'INV-2026-0001', rectifica_fecha: '2026-10-14',
    rectificacion_motivo: 'Tanggal salah · Wrong date' }), 'R-2026-0001'],
  ['vacio', Object.assign({}, base, { tipo: 'factura', lineas: [{ descripcion: '', importe: '' }] }), ''],
];
let casos = casosDe();
for (const [modo, idiomasDoc] of [['sin fila (build)', null], ['Ajustes id·en', ['id', 'en']]]) {
caja = carga(idiomasDoc);
casos = casosDe();
for (const [nombre0, d, numero] of casos) {
  const nombre = modo + ' · ' + nombre0;
  const pagina = caja.documentoPagina(d, { numero, base: 'https://bbm.axisworks.studio' });
  const t = texto(caja.documentoHTML(d, { numero }));
  const m = t.match(ESPANOL);
  ok(!m, nombre + ': palabra en español en el papel: «' + (m && m[0]) + '» — ' + t.slice(Math.max(0, (m && m.index) - 40), (m && m.index) + 40));
  ok(/<html lang="id">/.test(pagina), nombre + ': la página no va en lang="id"');
  if (nombre0 !== 'vacio') {
    ok(/14 Oktober 2026/.test(t), nombre + ': la fecha no sale en indonesio («14 Oktober 2026»): ' + t.slice(0, 300));
    ok(!/,\d\d IDR/.test(t), nombre + ': un importe IDR con decimales');
  }
  if (nombre0 === 'factura') {
    ok(/1\.500\.000 IDR/.test(t), 'factura: el importe no sale «1.500.000 IDR»');
    ok(/Tanggal · Date/.test(t) && /Jatuh tempo · Due date/.test(t) && /Ditagihkan kepada · Bill to/.test(t), 'factura: faltan rótulos id·en');
    ok((t.match(/\bInvoice\b/g) || []).length >= 1 && !/Invoice Invoice/.test(t), 'factura: título repetido o ausente');
  }
  if (nombre0 !== 'vacio') ok(/Referensi · Reference: R-0012/.test(t), nombre + ': falta «Referensi · Reference»');
  if (nombre0 === 'recibi') ok(/Kuitansi/.test(t) && /Receipt/.test(t) && /Pembayaran invoice INV-2026-0001 · Payment of invoice INV-2026-0001/.test(t)
    && /Diterima dari · Received from/.test(t) && !/Bill to/.test(t), 'recibí: título, concepto o «Diterima dari» (un recibí no factura a nadie)');
  if (nombre0 === 'rectificativa') ok(/Mengoreksi · Corrects/.test(t) && /Alasan · Reason/.test(t), 'rectificativa: rótulos');
  if (htmlDir && !idiomasDoc) { fs.mkdirSync(htmlDir, { recursive: true }); fs.writeFileSync(path.join(htmlDir, nombre0 + '.html'), pagina); }
}
}
// Ajustes es·en: el papel de Lawang tal cual (español arriba, inglés debajo), lang="es"; el recibí también; una lista que no empieza por es, no
{
  const cEs = carga(['es', 'en']);
  const b = casosDe().find(x => x[0] === 'factura')[1];
  const t = texto(cEs.documentoHTML(b, { numero: 'INV-2026-0001' }));
  ok(/Fecha · Date/.test(t) && /Facturar a · Bill to/.test(t) && /Factura/.test(t), 'Ajustes es·en: el papel no sale en español·inglés: ' + t.slice(0, 200));
  ok(/<html lang="es">/.test(cEs.documentoPagina(b, { numero: 'INV-2026-0001', base: 'https://bbm.axisworks.studio' })), 'Ajustes es·en: la página no va en lang="es"');
  ok(/Pembayaran/.test(carga(['id', 'en']).conceptoCobroRecibi('X')) && /Cobro de la factura/.test(cEs.conceptoCobroRecibi('X')), 'el concepto del recibí no sigue a Ajustes');
  // lo que es de la instancia también en el papel español (revisor, 13-oct): la referencia y, en el recibí, quién paga
  ok(/Referencia · Reference: R-0012/.test(t) && !/Proyecto/.test(t), 'Ajustes es·en: la factura dice «Proyecto» en vez de «Referencia»: ' + t.slice(0, 300));
  const rEs = casosDe().find(x => x[0] === 'recibi')[1];
  const tr = texto(cEs.documentoHTML(Object.assign({}, rEs, { lineas: [{ descripcion: cEs.conceptoCobroRecibi('INV-2026-0001'), importe: '1.550.000' }] }), { numero: 'REC-2026-0001' }));
  ok(/Recibido de · Received from/.test(tr) && !/Facturar a/.test(tr) && !/Proyecto/.test(tr) && /Referencia · Reference: R-0012/.test(tr),
    'Ajustes es·en: el recibí no dice «Recibido de» o arrastra «Facturar a»/«Proyecto»: ' + tr.slice(0, 300));
  ok(/Recib[ií]/.test(tr) && /Cobro de la factura INV-2026-0001/.test(tr), 'Ajustes es·en: el recibí no lleva su título o su concepto en español');
  ok(!texto(carga(['en', 'id']).documentoHTML(b, { numero: 'X' })).includes('Fecha ·'), 'una lista que no empieza por es no puede dar el papel español');
  // los otros tres casos en es·en (revisor, 2.ª vuelta): proforma, rectificativa y vacío, con lo de la instancia y sin «Proyecto»
  for (const [nombre0, d, numero] of casosDe().filter(x => ['proforma', 'rectificativa', 'vacio'].includes(x[0]))) {
    let tx = '';
    try { tx = texto(cEs.documentoHTML(d, { numero })); } catch (e) { ok(false, 'Ajustes es·en ' + nombre0 + ': ' + e.message); continue; }
    ok(!/Proyecto/.test(tx) && (nombre0 === 'vacio' || /Referencia · Reference: R-0012/.test(tx)), 'Ajustes es·en ' + nombre0 + ': «Proyecto» o sin «Referencia»: ' + tx.slice(0, 200));
    if (nombre0 === 'proforma') ok(/Factura proforma/.test(tx), 'Ajustes es·en proforma: sin su título');
    if (nombre0 === 'rectificativa') ok(/Factura rectificativa/.test(tx) && /Rectifica a · Corrects/.test(tx), 'Ajustes es·en rectificativa: sin su título o sus rótulos');
  }
}
// El correo que acompaña al PDF (el paquete minifica: se busca por trozos)
const ed = fs.readFileSync(path.join(dist, 'assets', 'editores.js'), 'utf8');
// el correo que acompaña al PDF sigue al papel: el español (el de Lawang) solo si axwDocId() dice que el papel no es indonesio
ok((ed.match(/typeof axwDocId\s*===?\s*["']function["']\s*&&\s*!axwDocId\(\)\s*\?/g) || []).length >= 2 && /Buenos d[ií]as/.test(ed),
  'correo: asunto y mensaje no eligen con axwDocId()');
ok(/Terlampir /.test(ed) && (ed.match(/Please find attached /g) || []).length >= 2, 'correo: falta el mensaje id + en o el es + en');
// un recibí confirma un pago: su correo no lo manda «para revisar» (Legal, 13-oct), ni en id·en ni en es·en
ok(/sebagai bukti pembayaran Anda/.test(ed) && /justificante de su pago/.test(ed) && (ed.match(/confirming your payment/g) || []).length >= 2,
  'correo: el recibí no tiene su propio mensaje (justificante de pago) en las dos ramas');
ok(/Un saludo \/ Kind regards/.test(ed) && /Salam \/ Kind regards/.test(ed), 'correo: la despedida no va en los dos idiomas del papel');
ok((ed.match(/f0\.moneda\s*\|\|\s*lwMonedaBase\(\)\s*\|\|/g) || []).length === 2, 'factura y recibí nuevos: no nacen en la moneda de la instancia (lwMonedaBase)');
ok(/["']rectificativa["']/.test(ed),'correo: el asunto no distingue la rectificativa (tipo real del documento)');
// el tipo REAL en las dos ramas (asunto/PDF con tipoDocEs y la línea inglesa del cuerpo): 2 en el papel id·en + 2 en el es·en. Con 3, la rama es
// pondría «Factura» en el asunto de una rectificativa (revisor, 2.ª vuelta). El paquete minifica: se cuenta el trozo que lee rectifica_numero
ok((ed.match(/TIPOS_DOC\[[\w$]+\.rectifica_numero/g) || []).length >= 4, 'correo: alguna rama no usa el tipo real del documento (asunto, PDF o cuerpo)');

if (fallos.length) { console.error('MAL (' + fallos.length + '):\n  ' + fallos.join('\n  ')); process.exit(1); }
console.log('TODO BIEN: documento id·en sin fila y con Ajustes id·en (' + casos.length + ' casos cada uno), es·en con Ajustes es·en, y correo');
