/* Quita TODOS los comentarios del bundle antes de publicarlo (build.py --publico). 24-sep-2026.
   Por qué: el código viene de la intranet de Lawang y sus comentarios cuentan cosas internas de un cliente
   (nombres de sus sociedades y representantes, incidentes, encargos). En local daba igual; en una web pública,
   no. Se hace con un minificador de verdad y no con expresiones regulares: una regex que «quita comentarios»
   rompe cadenas y URLs con // dentro. Sin mangle ni compress: el código sigue siendo el mismo, solo sin notas.
   Uso: node limpia_publico.js <carpeta>   → sale con código 1 si un fichero no se puede procesar. */
const fs = require('fs');
const path = require('path');
const { minify: minJS } = require('terser');
const { minify: minHTML } = require('html-minifier-terser');

const OPC_JS = { compress: false, mangle: false, format: { comments: false } };

function recorre(dir, out) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) recorre(p, out); else out.push(p);
  }
  return out;
}

(async () => {
  const raiz = process.argv[2];
  if (!raiz) { console.error('Falta la carpeta'); process.exit(2); }
  let n = 0, fallos = [];
  for (const p of recorre(raiz, [])) {
    const ext = path.extname(p).toLowerCase();
    if (!['.js', '.html', '.css'].includes(ext)) continue;
    const t = fs.readFileSync(p, 'utf8');
    try {
      let r;
      if (ext === '.js') r = (await minJS(t, OPC_JS)).code;
      else if (ext === '.css') r = t.replace(/\/\*[\s\S]*?\*\//g, '');   // en CSS no hay cadenas con /* dentro que importen
      else r = await minHTML(t, {
        removeComments: true, collapseWhitespace: false, keepClosingSlash: true,
        minifyJS: OPC_JS, minifyCSS: false, processConditionalComments: false,
        ignoreCustomFragments: [/<\?[\s\S]*?\?>/]
      });
      if (ext === '.html') r = r.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (m, a, css) => '<style' + a + '>' + css.replace(/\/\*[\s\S]*?\*\//g, '') + '</style>');
      if (r !== t) { fs.writeFileSync(p, r); n++; }
    } catch (e) {
      fallos.push(path.relative(raiz, p) + ': ' + String(e.message || e).slice(0, 160));
    }
  }
  console.log('limpia_publico: ' + n + ' ficheros sin comentarios');
  if (fallos.length) { console.error('NO se pudieron procesar:\n' + fallos.join('\n')); process.exit(1); }
})();
