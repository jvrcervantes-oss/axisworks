/* node ajustes_correo.test.js — pone test_ajustes_correo.py en el gate de este repo.
 * Porqué (revisor, 10-oct-2026): ese test estuvo en ROJO dos días sin que nadie lo viera, porque `tools/test.py --gate --repo` solo descubre
 * los `*.test.js` de un proyecto y este es un `test_*.py`. Mientras tanto el build publicaba dos copias de Ajustes › Correo.
 * No prueba nada por su cuenta: localiza la agencia (también desde una copia de sesión, que no vive cuatro niveles bajo ella), corre el test
 * de Python y sale con su código. Si no puede mirar (no encuentra Lawang o Python), falla y lo dice: no poder mirar no es «todo bien». */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const AJ = ['intranet', 'v4', 'assets', 'ajustes.js'];
const EDGE = ['erp', 'funciones', 'ajustes-correo', 'index.ts'];
// La primera carpeta, subiendo desde aquí, que tiene `trozos`. Un worktree de la agencia trae erp/ pero no proyectos/Lawang (es otro repo):
// por eso la agencia (erp/) y Lawang se buscan cada uno por su lado.
function sube(trozos) {
  let d = __dirname;
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(d, ...trozos))) return d;
    const arriba = path.dirname(d);
    if (arriba === d) break;
    d = arriba;
  }
  return null;
}

const raiz = process.env.AXW_AGENCIA_RAIZ || sube(EDGE);
let lawang = process.env.AXW_LAWANG_RAIZ || (raiz && fs.existsSync(path.join(raiz, 'proyectos', 'Lawang', ...AJ)) ? path.join(raiz, 'proyectos', 'Lawang') : null);
if (!lawang) { const d = sube(['proyectos', 'Lawang', ...AJ]); lawang = d && path.join(d, 'proyectos', 'Lawang'); }
if (!raiz || !lawang) {
  console.error('NO SE HA PODIDO MIRAR: no encuentro ' + (!raiz ? 'la agencia (erp/funciones/ajustes-correo)' : 'proyectos/Lawang') + ' subiendo desde ' + __dirname + '. Pon AXW_AGENCIA_RAIZ / AXW_LAWANG_RAIZ.');
  process.exit(1);
}
const env = Object.assign({}, process.env, { AXW_AGENCIA_RAIZ: raiz, AXW_LAWANG_RAIZ: lawang, PYTHONIOENCODING: 'utf-8' });
let r = null;
for (const py of [process.env.PYTHON, 'python', 'python3', 'py'].filter(Boolean)) {
  r = spawnSync(py, [path.join(__dirname, 'test_ajustes_correo.py')], { cwd: __dirname, env, encoding: 'utf8' });
  if (!r.error) break;
}
if (!r || r.error) {
  console.error('NO SE HA PODIDO MIRAR: no se pudo lanzar Python (' + (r && r.error ? r.error.message : 'sin intérprete') + ')');
  process.exit(1);
}
const salida = String(r.stdout || '') + String(r.stderr || '');
if (r.status !== 0) {
  process.stdout.write(salida);
  console.error('ajustes_correo.test.js: test_ajustes_correo.py en ROJO (código ' + r.status + ')');
  process.exit(1);
}
// En verde solo la última línea: los «ABORTA» de en medio son los casos en que el build TIENE que parar.
console.log(salida.trim().split(/\r?\n/).pop());
