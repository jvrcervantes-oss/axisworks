// node comercial/demo-erp/pruebas/piel_clasica.harness.cjs <raíz del paquete YA CONSTRUIDO con build.py --instancia> [--sin-piel]
// Harness de la piel en la suite clásica (F14, 12-oct-2026; Calidad: la puerta de bbm salía con el botón y el título verdes y el primer
// arreglo, un :root añadido a axw.css, «no pintaba nada» porque la página declara su propio :root después). Abre en Chromium la puerta (/)
// y /crea-contrasena/ del paquete REAL (servido por page.route; ninguna petición sale a la red: fuentes, CDN y Supabase se cortan) y mide
// el COLOR CALCULADO (getComputedStyle), no el texto del CSS: botón, marca, título, campo con foco y, en negativo, que ningún elemento de la
// página acabe pintado con un color de Lawang. Con --sin-piel comprueba lo contrario: un paquete sin piel (Lawang, axisworks-demo) sigue con
// los colores de Lawang y no lleva la regla html:root.
// En esta PC: PLAYWRIGHT_CORE=C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const RAIZ = path.resolve(process.argv[2] || '');
const SIN_PIEL = process.argv.includes('--sin-piel');
let fallos = 0, total = 0;
const ok = (nombre, c, extra = '') => { total++; if (!c) { fallos++; console.log('FALLA  ' + nombre + (extra ? ' → ' + extra : '')); } else console.log('ok     ' + nombre); };

const ORIGEN = 'https://erp.prueba.test';
const TIPOS = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.woff2': 'font/woff2' };
// Colores de Lawang que la piel tiene que haber sustituido (marca y los fijos a mano de la puerta y de axw.css).
const LAWANG = ['rgb(72, 91, 55)', 'rgb(16, 76, 79)', 'rgb(143, 155, 122)', 'rgb(13, 91, 95)', 'rgb(190, 179, 165)', 'rgb(203, 214, 182)',
  'rgba(72, 91, 55, 0.15)', 'rgba(143, 155, 122, 0.22)', 'rgb(245, 240, 230)'];

function fichero(url) {
  let p = decodeURIComponent(new URL(url).pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RAIZ, p);
  return f.startsWith(RAIZ) && fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}

async function abre(ctx, ruta) {
  const page = await ctx.newPage();
  await page.goto(ORIGEN + ruta, { waitUntil: 'load' });
  await page.waitForTimeout(150);
  return page;
}

const PINTURA = `(function(lawang){
  var props = ['color','background-color','border-top-color','border-bottom-color','outline-color','box-shadow','stroke','fill','caret-color'];
  var malos = [];
  document.querySelectorAll('body *').forEach(function(el){
    var cs = getComputedStyle(el);
    props.forEach(function(p){ var v = cs.getPropertyValue(p) || '';
      lawang.forEach(function(l){ if (v.indexOf(l) !== -1) malos.push((el.className || el.tagName) + ' ' + p + ' ' + l); }); });
  });
  return malos;
})`;

(async () => {
  if (!fs.existsSync(path.join(RAIZ, 'index.html'))) { console.log('NO SE HA PODIDO MIRAR: falta index.html en ' + RAIZ); process.exit(2); }
  const exe = process.env.CHROMIUM_EXE || 'C:/Users/jvrce/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (!url.startsWith(ORIGEN)) return route.abort();
    const f = fichero(url);
    if (!f) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: TIPOS[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  const css = fs.readFileSync(path.join(RAIZ, 'contracts', 'assets', 'axw.css'), 'utf8');

  if (SIN_PIEL) {
    ok('sin piel: axw.css no lleva html:root', !css.includes('html:root'));
    const p = await abre(ctx, '/');
    const fondo = await p.$eval('.lw-login button', b => getComputedStyle(b).backgroundColor).catch(() => null);
    ok('sin piel: el botón de la puerta sigue en Deep Lagoon de Lawang', fondo === 'rgb(16, 76, 79)', String(fondo));
  } else {
    ok('axw.css lleva la regla html:root al final', /html:root\{[^}]+\}\s*$/.test(css));
    ok('axw.css ya no lleva el hover #0d5b5f de Lawang', !/#0d5b5f/i.test(css));
    const masc = path.join(RAIZ, 'assets', 'mascota.js');
    const navjs = fs.readFileSync(path.join(RAIZ, 'assets', 'nav.js'), 'utf8');
    const mv = (navjs.match(/MASCOTA_V\s*=\s*['"]([^'"]+)['"]/) || [])[1];
    ok('mascota: nav.js la pide con una versión nueva (MASCOTA_V ≠ la de Lawang)', mv && /^p[0-9a-f]{8}$/.test(mv), String(mv));
    ok('mascota: su marco ya no lleva Deep Lagoon de Lawang', fs.existsSync(masc) && !/#104C4F|rgba\(16,76,79/i.test(fs.readFileSync(masc, 'utf8')));
    const p = await abre(ctx, '/');
    const r = await p.evaluate(() => {
      const q = s => document.querySelector(s);
      const cs = (s, k) => q(s) ? getComputedStyle(q(s))[k] : null;
      const dl = getComputedStyle(document.documentElement).getPropertyValue('--dl').trim();
      return { dl, boton: cs('.lw-login button', 'backgroundColor'), borde: cs('.lw-login button', 'borderTopColor'),
        palabra: cs('.lw-login .marca .word', 'color'), sub: cs('.lw-login .marca h1', 'color') };
    });
    const hex = h => { const n = parseInt(h.replace('#', ''), 16); return `rgb(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255})`; };
    ok('puerta: --dl es el de la piel, no el de Lawang', r.dl && r.dl.toUpperCase() !== '#104C4F', r.dl);
    ok('puerta: el botón Entrar pinta con --dl de la piel', r.boton && r.boton === hex(r.dl), r.boton + ' vs ' + r.dl);
    ok('puerta: borde del botón también', r.borde === hex(r.dl), r.borde);
    ok('puerta: la palabra de marca pinta con --dl de la piel', r.palabra === hex(r.dl), String(r.palabra));
    ok('puerta: el subtítulo no es Soft Canopy de Lawang', r.sub && r.sub !== 'rgb(143, 155, 122)', String(r.sub));
    // anillo del campo al enfocar: el fijo de Lawang sustituido
    const foco = await p.evaluate(() => { const i = document.querySelector('.lw-login input'); if (!i) return null;
      i.style.transition = 'none'; i.focus(); const c = getComputedStyle(i); return c.boxShadow + ' | ' + c.borderTopColor; });
    ok('puerta: el campo con foco no lleva el verde de Lawang', foco !== null && !/72, 91, 55/.test(foco), String(foco));
    const malos = await p.evaluate(PINTURA + '(' + JSON.stringify(LAWANG) + ')');
    ok('puerta: ningún elemento pintado con un color de Lawang', malos.length === 0, malos.slice(0, 6).join(' · '));
    const c = await abre(ctx, '/crea-contrasena/');
    const rc = await c.evaluate(() => ({ h1: getComputedStyle(document.querySelector('h1')).color,
      boton: getComputedStyle(document.querySelector('button')).backgroundColor,
      dl: getComputedStyle(document.documentElement).getPropertyValue('--dl').trim(),
      card: getComputedStyle(document.querySelector('.card')).borderTopColor }));
    ok('crea-contraseña: el título pinta con --dl de la piel', rc.h1 === hex(rc.dl) && rc.dl.toUpperCase() !== '#104C4F', rc.h1 + ' vs ' + rc.dl);
    ok('crea-contraseña: el botón pinta con --dl de la piel', rc.boton === hex(rc.dl), rc.boton);
    ok('crea-contraseña: el borde de la tarjeta no es Stone de Lawang', rc.card !== 'rgb(190, 179, 165)', rc.card);
    const malosC = await c.evaluate(PINTURA + '(' + JSON.stringify(LAWANG) + ')');
    ok('crea-contraseña: ningún elemento pintado con un color de Lawang', malosC.length === 0, malosC.slice(0, 6).join(' · '));
  }
  await browser.close();
  console.log(fallos ? `\n${fallos} de ${total} FALLAN` : `\nTODO BIEN (${total})`);
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.log('NO SE HA PODIDO MIRAR: ' + e.message); process.exit(2); });
