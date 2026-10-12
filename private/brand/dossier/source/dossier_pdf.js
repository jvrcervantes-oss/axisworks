const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = process.argv[2], out = process.argv[3], files = process.argv.slice(4);
const srv = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); fs.createReadStream(p).pipe(r); }).listen(0, async () => {
  const port = srv.address().port;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(async () => chromium.launch());
  const ctx = await b.newContext({ viewport: { width: 1122, height: 793 }, reducedMotion: 'reduce' });
  for (const f of files) {
    const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', e => errs.push(String(e)));
    await pg.goto(`http://localhost:${port}/${f}.dc.html`, { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    await pg.waitForTimeout(800);
    const info = await pg.evaluate(() => { const el = document.querySelector('.pg'); const r = el.getBoundingClientRect(); const over = [...el.querySelectorAll('*')].filter(n => { const b = n.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.bottom > r.bottom + 1); }).map(n => n.tagName + ':' + (n.textContent || '').slice(0, 30)); const foot = el.querySelector('footer').getBoundingClientRect(); const prev = el.querySelector('footer').previousElementSibling.getBoundingClientRect(); return { w: r.width, h: r.height, sh: el.scrollHeight, over: over.slice(0, 4), gap: Math.round(foot.top - prev.bottom), fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).filter((v, i, a) => a.indexOf(v) === i) }; });
    console.log(f, JSON.stringify(info), errs.slice(0, 3));
    await pg.screenshot({ path: `${out}/${f}.png` });
    await pg.pdf({ path: `${out}/${f}.pdf`, width: '297mm', height: '210mm', printBackground: true, pageRanges: '1', margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await pg.close();
  }
  await b.close(); srv.close();
});
