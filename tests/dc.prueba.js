// Prueba del motor assets/x/dc.js (revisor de código, 12-oct-2026): bucles, condiciones, atributos, manejadores,
// zonas fijas y que al repintar se REUTILIZAN los nodos (un botón con foco no lo pierde).
// Uso: node tests/dc.prueba.js   (necesita playwright-core; ruta por PLAYWRIGHT_CORE o la del estudio)
// tests/ no se sirve (.htaccess: RewriteRule ^(private|api/_estado|tests)/ - [F,L]).
const fs = require('fs');
const path = require('path');
const pw = require(process.env.PLAYWRIGHT_CORE || 'C:/Users/jvrce/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const dc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'x', 'dc.js'), 'utf8');

const html = `<!doctype html><meta charset="utf-8"><div id="raiz">
<ul><template data-r="0"><sc-for list="{{ items }}" as="it"><li class="{{ it.cls }}" data-i="{{ $index }}">{{ it.nombre }}<sc-if value="{{ it.marca }}"><b>!</b></sc-if></li></sc-for></template></ul>
<template data-r="1"><button type="button" id="b" aria-pressed="{{ pulsado }}" onClick="{{ pulsa }}">{{ veces }}</button></template>
<template data-r="2" data-fija><span id="fija">{{ veces }}</span></template>
<svg><template data-r="3"></template></svg>
</div>`;

(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' }).catch(() => pw.chromium.launch());
  const p = await b.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  await p.setContent(html);
  await p.addScriptTag({ content: dc });
  const r = await p.evaluate(() => {
    const L = {
      state: { veces: 0, items: [{ nombre: 'a', cls: 'x', marca: true }, { nombre: 'b', cls: 'y', marca: false }] },
      renderVals() {
        const self = this;
        return { items: this.state.items, veces: this.state.veces, pulsado: this.state.veces > 0 ? 'true' : 'false',
                 pulsa: () => self.setState({ veces: self.state.veces + 1 }) };
      },
    };
    window.XDC.monta(document.getElementById('raiz'), L);
    const out = {};
    const lis = [...document.querySelectorAll('ul li')];
    out.bucle = lis.map((li) => li.className + ':' + li.dataset.i + ':' + li.textContent).join('|');
    const boton = document.getElementById('b');
    boton.focus();
    boton.click(); boton.click();
    out.manejador = boton.textContent + '/' + boton.getAttribute('aria-pressed');
    out.mismoNodo = document.getElementById('b') === boton;
    out.foco = document.activeElement === boton;
    out.sinOnclick = !boton.hasAttribute('onclick');
    out.fija = document.getElementById('fija').textContent;
    L.setState({ items: [{ nombre: 'c', cls: 'z', marca: false }] });
    out.bucleTras = [...document.querySelectorAll('ul li')].map((li) => li.textContent).join('|');
    out.liReutilizado = document.querySelector('ul li') === lis[0];
    return out;
  });
  await b.close();
  const casos = [
    ['bucle y condición', r.bucle === 'x:0:a!|y:1:b'],
    ['manejador on* y atributo', r.manejador === '2/true'],
    ['el botón es el mismo nodo tras repintar', r.mismoNodo],
    ['el foco no se pierde', r.foco],
    ['no queda el atributo onclick literal', r.sinOnclick],
    ['zona fija pintada una sola vez', r.fija === '0'],
    ['la lista cambia al cambiar el estado', r.bucleTras === 'c'],
    ['el primer <li> se reutiliza', r.liReutilizado],
    ['sin errores de página', errores.length === 0],
  ];
  let mal = 0;
  for (const [n, ok] of casos) { console.log((ok ? 'OK  ' : 'MAL ') + n); if (!ok) mal++; }
  if (mal) { console.log(JSON.stringify(r), errores); process.exit(1); }
  console.log(casos.length + '/' + casos.length);
})();
