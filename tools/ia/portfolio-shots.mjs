import puppeteer from 'puppeteer-core';
const BASE = 'https://enocaniman-ai.github.io/le-baobab/';
const out = process.argv[2];
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run'], userDataDir: './.chrome-pf', dumpio: false });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let shot = async function (name, url, { w = 1440, h = 900, dpr = 1, mobile = false, act, extra = 0 } = {}) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  await p.goto(BASE + url, { waitUntil: 'load', timeout: 90000 });
  await p.mouse.move(w * 0.55, h * 0.4);
  await wait(1500);
  await wait(3000);
  if (act) await act(p);
  await p.mouse.move(w * 0.6, h * 0.45);
  await wait(5000 + extra);
  await p.screenshot({ path: `${out}/${name}.png` });
  console.log(name);
  await p.close();
}
const toPhares = (p) => p.evaluate(() => scrollTo(0, document.querySelector('.phares').offsetTop + 10));
const toCat = (cat) => async (p) => { await p.evaluate((c) => { document.querySelector(`[data-cat=${c}]`).click(); }, cat); await wait(600); await p.evaluate(() => scrollTo(0, document.querySelector('.menu-cat').offsetTop - 150)); };
const ONLY = process.argv.slice(3);
const orig = shot;
shot = async (n, ...a) => (!ONLY.length || ONLY.includes(n)) && orig(n, ...a);
await shot('d-hero', '?3d');
await shot('d-phares', '?3d', { extra: 4000, act: toPhares });
await shot('d-plats', 'menu.html?3d', { extra: 6000, act: toCat('plats') });
await shot('d-boissons', 'menu.html?3d', { extra: 6000, act: toCat('boissons') });
await shot('d-fiche', 'menu.html?3d', { extra: 6000, act: async (p) => { await toCat('plats')(p); await wait(800); await p.evaluate(() => document.querySelectorAll('.plat-open')[1].click()); } });
await shot('d-chat', 'contact.html', { act: async (p) => {
  await p.click('.chat-toggle'); await wait(500);
  for (const q of ['Vous livrez à Riviera ?', 'Table pour 4 samedi à 20h']) { await p.type('#chat-input', q); await p.keyboard.press('Enter'); await wait(900); }
} });
await shot('d-apropos', 'a-propos.html', { act: (p) => p.evaluate(() => document.querySelector('.galerie').scrollIntoView({ block: 'center' })) });
await shot('m-hero', '?3d', { w: 390, h: 844, dpr: 2, mobile: true });
await shot('m-phares', '?3d', { w: 390, h: 844, dpr: 2, mobile: true, act: toPhares });
await shot('m-menu', 'menu.html?3d', { w: 390, h: 844, dpr: 2, mobile: true, act: toCat('boissons') });
await b.close();
