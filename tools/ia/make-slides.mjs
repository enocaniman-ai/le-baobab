import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve('pf');
const img = (n) => 'file:///' + path.join(dir, n + '.png').split(path.sep).join('/');
const css = `
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Hanken+Grotesk:wght@400;500;700&display=swap');
*{box-sizing:border-box;margin:0}
body{width:1600px;height:1200px;overflow:hidden;background:#000;color:#F3E9D2;font-family:'Hanken Grotesk',sans-serif;position:relative}
body::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 55% at 78% 70%,rgba(247,127,0,.38),rgba(247,127,0,0) 70%),radial-gradient(40% 40% at 10% 0%,rgba(247,127,0,.14),transparent 70%)}
.k{position:absolute;left:80px;top:72px;z-index:3;max-width:470px}
.tag{display:inline-block;font-weight:700;font-size:20px;color:#000;background:#F77F00;border-radius:999px;padding:8px 18px}
h1{font-family:'Big Shoulders Display';font-weight:900;font-size:150px;line-height:.85;text-transform:uppercase;margin:26px 0 22px}
h2{font-family:'Big Shoulders Display';font-weight:900;font-size:84px;line-height:.9;text-transform:uppercase;margin:22px 0 18px}
p{font-size:27px;line-height:1.4;color:#d9ccb2}
.o{color:#F77F00}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.chips span{border:2px solid rgba(243,233,210,.3);border-radius:999px;padding:7px 16px;font-size:19px;font-weight:700}
.win{position:absolute;border-radius:16px;overflow:hidden;background:#111;box-shadow:0 40px 90px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.08)}
.win .bar{height:34px;background:#1c1916;display:flex;align-items:center;gap:8px;padding:0 14px}
.win .bar i{width:12px;height:12px;border-radius:50%;background:#3a352f;display:block}
.win .bar b{margin-left:14px;font-size:14px;font-weight:500;color:#9a8f7c;background:#0e0c0a;border-radius:6px;padding:3px 14px}
.win img{display:block;width:100%}
.phone{position:absolute;border-radius:46px;padding:12px;background:#121110;box-shadow:0 40px 90px rgba(0,0,0,.75),0 0 0 2px #2c2925}
.phone img{display:block;width:100%;border-radius:36px}
.logo{position:absolute;right:70px;top:66px;display:flex;align-items:center;gap:14px;font-family:'Big Shoulders Display';font-weight:900;font-size:40px;z-index:3}
.logo svg{width:58px;height:58px}
.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-top:34px}
.stat{border-top:3px solid #F77F00;padding-top:12px}
.stat b{display:block;font-family:'Big Shoulders Display';font-weight:900;font-size:76px;line-height:1;color:#F77F00}
.stat span{font-size:21px;color:#d9ccb2}
`;
const LOGO = `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="57" fill="none" stroke="#F77F00" stroke-width="4"/><g stroke="#F77F00" stroke-linecap="round" fill="none" stroke-width="5"><path d="M52 50C46 40 36 36 24 36"/><path d="M55 48C52 37 46 29 40 22"/><path d="M60 48V20"/><path d="M65 48C68 37 74 29 80 22"/><path d="M68 50C74 40 84 36 96 36"/></g><g fill="#F77F00"><ellipse cx="23" cy="33" rx="11" ry="6"/><ellipse cx="39" cy="20" rx="10" ry="6"/><ellipse cx="60" cy="16" rx="11" ry="6"/><ellipse cx="81" cy="20" rx="10" ry="6"/><ellipse cx="97" cy="33" rx="11" ry="6"/><path d="M36 100C38 86 36 74 44 62C48 56 50 52 50 46H70C70 52 72 56 76 62C84 74 82 86 84 100Z"/><rect x="22" y="99" width="76" height="4" rx="2"/></g></svg>`;
const win = (n, l, t, w, url = 'enocaniman-ai.github.io/le-baobab') => `<div class="win" style="left:${l}px;top:${t}px;width:${w}px"><div class="bar"><i></i><i></i><i></i><b>${url}</b></div><img src="${img(n)}"></div>`;
const phone = (n, l, t, w) => `<div class="phone" style="left:${l}px;top:${t}px;width:${w}px"><img src="${img(n)}"></div>`;
const logo = `<div class="logo">${LOGO}Baobab</div>`;
const slides = {
  '01-cover': `${logo}<div class="k"><span class="tag">Concept project</span><h1>Le<br><span class="o">Baobab</span></h1><p>Immersive website for an Ivorian restaurant in Abidjan: real dish photos turned into interactive 3D.</p><div class="chips"><span>Three.js</span><span>GSAP ScrollTrigger</span><span>AI depth + cutout</span><span>Vanilla JS</span></div></div>${win('d-hero', 600, 250, 940)}${phone('m-hero', 1250, 520, 290)}`,
  '02-menu-3d': `${logo}<div class="k"><span class="tag">Menu</span><h2>Every dish<br>in <span class="o">3D</span></h2><p>16 dishes and drinks rendered from photos. Editable from a JSON file.</p></div>${win('d-plats', 600, 170, 940)}${win('d-boissons', 120, 640, 760)}`,
  '03-detail': `${logo}<div class="k"><span class="tag">Product view</span><h2>Drag to<br><span class="o">rotate</span></h2><p>AI cutout (BiRefNet) and depth map (Depth Anything V2), rendered as gaussian splats then a lit relief surface.</p></div>${win('d-fiche', 600, 300, 920)}${phone('m-menu', 140, 640, 280)}`,
  '04-scroll': `${logo}<div class="k"><span class="tag">Scroll story</span><h2>Signature<br><span class="o">dishes</span></h2><p>Pinned section with scroll snapping: the dish follows the scroll and changes with the photo behind it.</p></div>${win('d-phares', 600, 300, 920)}${phone('m-phares', 160, 600, 290)}`,
  '05-booking': `${logo}<div class="k"><span class="tag">Conversion</span><h2>Chatbot &<br><span class="o">booking</span></h2><p>Keyword assistant answering 18 question types, pre-filling the reservation form. WhatsApp and Formspree ready.</p></div>${win('d-chat', 600, 250, 940)}`,
  '06-quality': `${logo}<div class="k" style="max-width:640px"><span class="tag">Quality</span><h2>Fast, accessible,<br><span class="o">responsive</span></h2><p>Lighthouse mobile audit on the live site.</p><div class="stats"><div class="stat"><b>98–99</b><span>Performance</span></div><div class="stat"><b>100</b><span>Accessibility</span></div><div class="stat"><b>100</b><span>SEO</span></div><div class="stat"><b>16</b><span>3D dishes & drinks</span></div></div></div>${win('d-boissons', 780, 300, 760)}${phone('m-phares', 1150, 640, 260)}`,
};
fs.mkdirSync('pf-out', { recursive: true });
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: './.chrome-pf', args: ['--allow-file-access-from-files'] });
for (const [name, body] of Object.entries(slides)) {
  const f = path.resolve('pf-slides', name + '.html');
  fs.writeFileSync(f, `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`);
  const p = await b.newPage();
  await p.setViewport({ width: 1600, height: 1200 });
  await p.goto('file:///' + f.split(path.sep).join('/'), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 600));
  await p.screenshot({ path: `pf-out/${name}.jpg`, quality: 88 });
  console.log(name);
  await p.close();
}
await b.close();
