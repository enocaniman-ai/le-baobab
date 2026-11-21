import { pipeline, RawImage, env } from '@huggingface/transformers';
import fs from 'node:fs';
env.cacheDir = './.cache';
const SRC = process.argv[2], OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });
const ALL = {4:'garba',5:'riz-gras-poisson',6:'alloco-oeufs',7:'foutou-banane-sauce-graine',8:'foutou-igname-gombo',9:'attieke-poisson-braise',
 10:'eau-minerale',11:'coca-cola',12:'red-bull',13:'monster',14:'desperados',15:'vody',16:'jus-bissap',17:'jus-orange',23:'gbofloto',25:'choukouya'};
// node run.mjs <photos> <sortie> [numéros...] : sans numéro, toutes les photos
const only = process.argv.slice(4);
const names = only.length ? Object.fromEntries(only.map((n) => [n, ALL[n]])) : ALL;
const depth = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', { dtype: 'fp32' });
let seg = null;
try { seg = await pipeline('background-removal', 'onnx-community/BiRefNet_lite', { dtype: 'fp16' }); console.log('BiRefNet ok'); }
catch (e) { console.log('segmentation indisponible:', e.message.slice(0, 200)); }
for (const [n, name] of Object.entries(names)) {
  const img = await RawImage.read(`${SRC}/${n}.jpg`);
  const d = await depth(img);
  await d.depth.save(`${OUT}/${name}-depth.png`);
  if (seg) { const [cut] = await seg(img); await cut.save(`${OUT}/${name}-cut.png`); }
  console.log(name, img.width, img.height);
}
