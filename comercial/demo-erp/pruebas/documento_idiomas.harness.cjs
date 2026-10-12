/* El DOCUMENTO (factura, proforma, recibí, rectificativa) de una instancia en indonesio + inglés (BBM-65, 13-oct-2026).
   node pruebas/documento_idiomas.harness.cjs <paquete construido> [--html <carpeta>]

   Carga el documento.js SERVIDO por el paquete (clasico/facturas/), con dinero.js, entities.js y totales.js del mismo paquete, en un ámbito
   (como documento.test.js de Lawang), pinta los cuatro tipos en IDR y exige:
     · ni una palabra española en el papel (texto sin etiquetas): rótulos, títulos, concepto del recibí, mes de la fecha;
     · la fecha con el mes en indonesio y los importes IDR sin decimales;
     · <html lang="id"> en la página que va al PDF y al correo;
     · el correo que acompaña al PDF (editores.js) sin «Buenos días» y con el título indonesio.
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
const caja = {};
new Function('caja',
  RUTAS.map(p => fs.readFileSync(path.join(dist, p), 'utf8')).join('\n;\n') +
  '\n;Object.assign(caja,{SOCIEDADES,CUENTAS_BANCARIAS,documentoPagina,documentoHTML,TIPOS_DOC,conceptoCobroRecibi});'
)(caja);

Object.assign(caja.SOCIEDADES, {
  emisor: { label: 'PT Contoh Motor', razon: 'PT CONTOH MOTOR', marca: 'CONTOH RENTAL', domicilio: 'Jl. Raya Kuta 1, Badung, Bali',
    npwp: '01.234.567.8-901.000' },
});

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
const casos = [
  ['factura', Object.assign({}, base, { tipo: 'factura' }), 'INV-2026-0001'],
  ['proforma', Object.assign({}, base, { tipo: 'proforma' }), 'PRO-2026-0001'],
  ['recibi', Object.assign({}, base, { tipo: 'recibi', imp_pct: '', lineas: [{ descripcion: caja.conceptoCobroRecibi('INV-2026-0001'), importe: '1.550.000' }] }), 'REC-2026-0001'],
  ['rectificativa', Object.assign({}, base, { tipo: 'factura', rectifica_numero: 'INV-2026-0001', rectifica_fecha: '2026-10-14',
    rectificacion_motivo: 'Tanggal salah · Wrong date' }), 'R-2026-0001'],
  ['vacio', Object.assign({}, base, { tipo: 'factura', lineas: [{ descripcion: '', importe: '' }] }), ''],
];
for (const [nombre, d, numero] of casos) {
  const pagina = caja.documentoPagina(d, { numero, base: 'https://bbm.axisworks.studio' });
  const t = texto(caja.documentoHTML(d, { numero }));
  const m = t.match(ESPANOL);
  ok(!m, nombre + ': palabra en español en el papel: «' + (m && m[0]) + '» — ' + t.slice(Math.max(0, (m && m.index) - 40), (m && m.index) + 40));
  ok(/<html lang="id">/.test(pagina), nombre + ': la página no va en lang="id"');
  if (nombre !== 'vacio') {
    ok(/14 Oktober 2026/.test(t), nombre + ': la fecha no sale en indonesio («14 Oktober 2026»): ' + t.slice(0, 300));
    ok(!/,\d\d IDR/.test(t), nombre + ': un importe IDR con decimales');
  }
  if (nombre === 'factura') {
    ok(/1\.500\.000 IDR/.test(t), 'factura: el importe no sale «1.500.000 IDR»');
    ok(/Tanggal · Date/.test(t) && /Jatuh tempo · Due date/.test(t) && /Ditagihkan kepada · Bill to/.test(t), 'factura: faltan rótulos id·en');
    ok((t.match(/\bInvoice\b/g) || []).length >= 1 && !/Invoice Invoice/.test(t), 'factura: título repetido o ausente');
  }
  if (nombre === 'recibi') ok(/Kuitansi/.test(t) && /Receipt/.test(t) && /Pembayaran invoice INV-2026-0001 · Payment of invoice INV-2026-0001/.test(t)
    && /Diterima dari · Received from/.test(t) && !/Bill to/.test(t), 'recibí: título, concepto o «Diterima dari» (un recibí no factura a nadie)');
  if (nombre === 'rectificativa') ok(/Mengoreksi · Corrects/.test(t) && /Alasan · Reason/.test(t), 'rectificativa: rótulos');
  if (htmlDir) { fs.mkdirSync(htmlDir, { recursive: true }); fs.writeFileSync(path.join(htmlDir, nombre + '.html'), pagina); }
}
// El correo que acompaña al PDF (el paquete minifica: se busca por trozos)
const ed = fs.readFileSync(path.join(dist, 'assets', 'editores.js'), 'utf8');
ok(!/Buenos d[ií]as/.test(ed) && !/para su revisi[oó]n/.test(ed), 'correo: el mensaje por defecto sigue en español');
ok(/Terlampir /.test(ed) && /Please find attached /.test(ed), 'correo: falta el mensaje id + en');
ok((ed.match(/f0\.moneda\s*\|\|\s*lwMonedaBase\(\)\s*\|\|/g) || []).length === 2, 'factura y recibí nuevos: no nacen en la moneda de la instancia (lwMonedaBase)');
ok(/["']rectificativa["']/.test(ed),'correo: el asunto no distingue la rectificativa (tipo real del documento)');

if (fallos.length) { console.error('MAL (' + fallos.length + '):\n  ' + fallos.join('\n  ')); process.exit(1); }
console.log('TODO BIEN: documento id·en (' + casos.length + ' casos: factura, proforma, recibí, rectificativa, vacío) y correo');
