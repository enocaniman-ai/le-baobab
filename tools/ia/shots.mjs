import puppeteer from 'puppeteer-core';
const [,, out, ...jobs] = process.argv; // job = nom|url|largeur|hauteur|script de défilement
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const j of jobs) {
  const [name, url, w, h, js] = j.split('|');
  const p = await b.newPage();
  await p.setViewport({ width: +w, height: +h, deviceScaleFactor: 1, isMobile: +w < 600, hasTouch: +w < 600 });
  await p.goto(url, { waitUntil: 'networkidle0' });
  await p.mouse.move(+w / 2, +h / 3);
  if (js) await p.evaluate(js);
  await new Promise((r) => setTimeout(r, 4000));
  await p.screenshot({ path: `${out}/${name}.jpg`, quality: 82 });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  console.log(name, 'ok', errs.join(';'));
  await p.close();
}
await b.close();
