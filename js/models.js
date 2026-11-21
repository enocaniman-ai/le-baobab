/* Le Baobab — modèles 3D procéduraux des plats et boissons.
   Chaque plat est construit à partir de primitives Three.js, de textures
   générées sur canvas et d'instanciation (grains, dés de tomate, oignons...).
   Aucun fichier .glb à télécharger : tout est calculé dans le navigateur. */
import * as THREE from 'three';

/* ---------- utilitaires ---------- */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const texCache = new Map();
function canvasTex(key, w, h, draw, repeat = 1) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  texCache.set(key, t);
  return t;
}

function speckle(key, base, dots, count, size, repeat = 1) {
  return canvasTex(key, 512, 512, (g, w, h) => {
    const r = rng(key.length * 97);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < count; i++) {
      g.fillStyle = dots[Math.floor(r() * dots.length)];
      g.globalAlpha = 0.35 + r() * 0.6;
      g.beginPath();
      g.ellipse(r() * w, r() * h, size * (0.5 + r()), size * (0.4 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }, repeat);
}

const mat = (color, rough = 0.6, metal = 0, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const glossy = (color, extra = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.2, ...extra });

/* Déplace chaque sommet le long de sa normale : surfaces organiques. */
function bumpify(geo, amp, freq = 3, seed = 1) {
  const p = geo.attributes.position, n = geo.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = Math.sin(v.x * freq + seed) * Math.sin(v.y * freq * 1.3 + seed * 2) * Math.sin(v.z * freq * 0.9 + seed * 3)
      + 0.5 * Math.sin(v.x * freq * 2.7 + v.z * freq * 2.1 + seed);
    p.setXYZ(i, v.x + n.getX(i) * d * amp, v.y + n.getY(i) * d * amp, v.z + n.getZ(i) * d * amp);
  }
  geo.computeVertexNormals();
  return geo;
}

function scatter(geo, material, count, place) {
  const m = new THREE.InstancedMesh(geo, material, count);
  const d = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1);
    const col = place(i, d);
    d.updateMatrix();
    m.setMatrixAt(i, d.matrix);
    if (col) m.setColorAt(i, c.set(col));
  }
  m.castShadow = true;
  return m;
}

/* ---------- textures ---------- */
const T = {
  attieke: () => speckle('attieke', '#d9c597', ['#f4e8c8', '#b9a272', '#e3d0a2', '#a88d58'], 12000, 2.4, 2),
  rizGras: () => speckle('rizgras', '#b5521d', ['#d9732e', '#8f3a12', '#e58c45', '#6e2a0c'], 9000, 2.6, 2),
  crust: () => speckle('crust', '#8a4216', ['#5a240a', '#b5652a', '#3d1806', '#c97a35', '#e09a4a'], 3400, 8),
  charred: () => speckle('charred', '#3a3a44', ['#1c1c22', '#6b4a3a', '#c9662a', '#55555f'], 2200, 10),
  wood: () => canvasTex('wood', 512, 512, (g, w, h) => {
    g.fillStyle = '#7a4524'; g.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 140; i++) {
      g.strokeStyle = r() > 0.5 ? 'rgba(60,28,12,.45)' : 'rgba(170,100,55,.35)';
      g.lineWidth = 1 + r() * 3;
      g.beginPath();
      const y = r() * h;
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 6);
      g.stroke();
    }
  }),
  woven: () => canvasTex('woven', 512, 512, (g, w, h) => {
    g.fillStyle = '#c99a5a'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = x % 16 ? 'rgba(120,80,35,.35)' : 'rgba(240,200,140,.3)';
      g.fillRect(x, 0, 4, h);
    }
  }),
  lemon: () => canvasTex('lemon', 256, 256, (g, w) => {
    g.fillStyle = '#f6e27a'; g.fillRect(0, 0, w, w);
    g.strokeStyle = '#fff6c8'; g.lineWidth = 6;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.beginPath(); g.moveTo(w / 2, w / 2); g.lineTo(w / 2 + Math.cos(a) * w / 2, w / 2 + Math.sin(a) * w / 2); g.stroke();
    }
    g.lineWidth = 14; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 8, 0, Math.PI * 2); g.stroke();
  }),
  fishSkin: () => canvasTex('fishskin', 512, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#5d5a52'); grd.addColorStop(0.5, '#b9a78a'); grd.addColorStop(1, '#e6d4b0');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(60,40,20,.35)'; g.lineWidth = 2;
    for (let x = 0; x < w; x += 14) for (let y = 0; y < h; y += 14) {
      g.beginPath(); g.arc(x + (y % 28 ? 7 : 0), y, 7, 0, Math.PI); g.stroke();
    }
    g.fillStyle = 'rgba(200,90,30,.35)'; g.fillRect(0, 0, w, h);
  }),
};

/* ---------- contenants ---------- */
function lathe(points, segs = 64) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segs);
}

function ovalPlate(sx = 1, sz = 1.38) {
  const g = lathe([[0, 0], [1.2, 0], [1.35, 0.05], [1.62, 0.16], [1.7, 0.2], [1.66, 0.22], [1.36, 0.1], [0, 0.08]]);
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#f6f4ef', roughness: 0.18, clearcoat: 1 }));
  m.scale.set(sx, 1, sz); m.receiveShadow = true;
  return m;
}
function woodPlate(tex = T.wood()) {
  const g = lathe([[0, 0], [1.45, 0], [1.6, 0.08], [1.75, 0.2], [1.72, 0.23], [1.5, 0.12], [0, 0.1]]);
  const m = new THREE.Mesh(g, mat('#ffffff', 0.55, 0, { map: tex }));
  m.receiveShadow = true;
  return m;
}
function metalTray() {
  const m = new THREE.Mesh(lathe([[0, 0], [1.4, 0], [1.6, 0.1], [1.72, 0.18], [1.7, 0.2], [1.5, 0.08], [0, 0.06]]),
    mat('#cfd3d8', 0.28, 0.9));
  m.scale.set(1, 1, 1.35); m.receiveShadow = true;
  return m;
}
function canari() {
  const g = lathe([[0, 0], [0.9, 0], [1.25, 0.15], [1.5, 0.55], [1.58, 0.95], [1.62, 1.0], [1.5, 1.0], [1.42, 0.6], [1.15, 0.28], [0, 0.22]], 72);
  bumpify(g, 0.015, 9, 4);
  return new THREE.Mesh(g, mat('#1d1916', 0.85));
}

/* ---------- ingrédients réutilisables ---------- */
function mound(r, h, tex, seed = 1, part = 0.5) {
  const g = new THREE.SphereGeometry(r, 72, 36, 0, Math.PI * 2, 0, Math.PI * part);
  bumpify(g, r * 0.03, 6, seed);
  const m = new THREE.Mesh(g, mat('#ffffff', 0.92, 0, { map: tex, bumpMap: tex, bumpScale: 2 }));
  m.scale.y = h / r; m.castShadow = true; m.receiveShadow = true;
  return m;
}
function fishSteak(seed) {
  const g = bumpify(new THREE.CylinderGeometry(0.46, 0.5, 0.26, 40, 3), 0.05, 6, seed);
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ map: T.crust(), bumpMap: T.crust(), bumpScale: 4, roughness: 0.55, clearcoat: 0.45, clearcoatRoughness: 0.4 }));
  m.castShadow = true;
  return m;
}
function dice(count, colors, area, seed, size = 0.09) {
  const r = rng(seed);
  return scatter(new THREE.BoxGeometry(size, size * 0.8, size), glossy('#ffffff'), count, (i, d) => {
    const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * area.r;
    d.position.set(area.x + Math.cos(a) * rad * (area.sx || 1), area.y + r() * area.h, area.z + Math.sin(a) * rad * (area.sz || 1));
    d.rotation.set(r() * 3, r() * 3, r() * 3);
    d.scale.setScalar(0.7 + r() * 0.7);
    return colors[Math.floor(r() * colors.length)];
  });
}
function chiliRings(count, area, seed, color = '#3f9a2e') {
  const r = rng(seed);
  return scatter(new THREE.TorusGeometry(0.075, 0.025, 8, 16, Math.PI * 1.4), glossy('#ffffff'), count, (i, d) => {
    const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * area.r;
    d.position.set(area.x + Math.cos(a) * rad, area.y + r() * area.h, area.z + Math.sin(a) * rad);
    d.rotation.set(r() * 3, r() * 3, r() * 3);
    return r() > 0.25 ? color : '#8cc63f';
  });
}
function strips(count, area, seed, colors) {
  const r = rng(seed);
  return scatter(new THREE.BoxGeometry(0.03, 0.02, 0.26), glossy('#ffffff'), count, (i, d) => {
    const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * area.r;
    d.position.set(area.x + Math.cos(a) * rad, area.y + r() * area.h, area.z + Math.sin(a) * rad);
    d.rotation.set(r() * 0.6, r() * 6, r() * 0.6);
    return colors[Math.floor(r() * colors.length)];
  });
}
function cube(color, size, mark) {
  const tex = canvasTex('cube' + color, 128, 128, (g) => {
    g.fillStyle = color; g.fillRect(0, 0, 128, 128);
    g.fillStyle = mark; g.beginPath(); g.arc(64, 64, 30, 0, Math.PI * 2); g.fill();
  });
  const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat('#ffffff', 0.5, 0, { map: tex }));
  m.castShadow = true;
  return m;
}
function egg() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.32, 40, 24), new THREE.MeshPhysicalMaterial({ color: '#fbfaf6', roughness: 0.35, sheen: 0.5 }));
  m.scale.set(1, 0.78, 1.3); m.castShadow = true;
  return m;
}
function sauceBlob(color, r, seed) {
  const g = bumpify(new THREE.SphereGeometry(r, 40, 20), r * 0.12, 5, seed);
  const m = new THREE.Mesh(g, glossy(color));
  m.scale.y = 0.25; m.castShadow = true;
  return m;
}
function liquidDisk(radius, color, y) {
  const g = new THREE.CircleGeometry(radius, 72);
  bumpify(g, 0.02, 5, 2);
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }));
  m.rotation.x = -Math.PI / 2; m.position.y = y;
  return m;
}
function meatChunks(count, area, seed, color = '#5a2c18') {
  const r = rng(seed);
  return scatter(bumpify(new THREE.DodecahedronGeometry(0.17, 1), 0.03, 9, seed), glossy('#ffffff', { roughness: 0.5 }), count, (i, d) => {
    const a = r() * Math.PI * 2, rad = area.r0 + r() * (area.r - area.r0);
    d.position.set(Math.cos(a) * rad, area.y + r() * 0.06, Math.sin(a) * rad);
    d.rotation.set(r() * 3, r() * 3, r() * 3);
    d.scale.set(1 + r() * 0.5, 0.7 + r() * 0.3, 0.8 + r() * 0.4);
    return r() > 0.5 ? color : '#7a3e1f';
  });
}

/* ---------- PLATS ---------- */
const dishes = {
  garba() {
    const g = new THREE.Group();
    g.add(ovalPlate());
    const base = mound(1.45, 0.22, T.attieke(), 3);
    base.scale.z = 1.32; base.position.y = 0.08; g.add(base);
    const spots = [[-0.75, 1.15, 0.3], [0.1, 1.25, -0.4], [0.85, 0.65, 0.2], [-0.95, 0.0, 1.2], [0.9, -0.55, -0.3], [-0.6, -1.25, 0.6], [0.25, -1.45, 0.1], [-0.25, 1.65, 0]];
    spots.forEach(([x, z, rot], i) => {
      const f = fishSteak(i + 2); f.position.set(x, 0.32, z); f.rotation.set(0.12 * Math.sin(i), rot, 0.1 * Math.cos(i));
      f.scale.setScalar(i === 7 ? 0.7 : 0.9 + (i % 3) * 0.1); g.add(f);
    });
    g.add(dice(70, ['#e0301e', '#c41f12', '#f04a2a', '#ff6b3d'], { x: -0.1, y: 0.36, z: 0.35, r: 0.55, h: 0.18 }, 11));
    g.add(strips(55, { x: -0.1, y: 0.45, z: 0.55, r: 0.5, h: 0.12 }, 12, ['#ff3b1d', '#e5260f', '#ff7a1a']));
    g.add(chiliRings(26, { x: -0.05, y: 0.5, z: 0.6, r: 0.5, h: 0.1 }, 13));
    g.add(dice(90, ['#fbf7f2', '#f1e6ee', '#e9d2e2', '#fffdf9', '#c792b6'], { x: 0.0, y: 0.34, z: -0.55, r: 0.6, h: 0.22 }, 14, 0.085));
    const c1 = cube('#e8df2a', 0.16, '#d6301e'); c1.position.set(0.05, 0.62, 0.05); c1.rotation.set(0.3, 0.6, 0.2); g.add(c1);
    const c2 = cube('#e8df2a', 0.16, '#d6301e'); c2.position.set(0.0, 0.58, -0.2); c2.rotation.set(-0.2, 1.2, 0.1); g.add(c2);
    return g;
  },

  'attieke-poisson'() {
    const g = new THREE.Group();
    g.add(woodPlate(T.woven()));
    const a = mound(0.62, 0.55, T.attieke(), 5, 0.5); a.position.set(-0.75, 0.1, 0.1); g.add(a);
    [[0.45, -0.35, 0.5], [0.55, 0.45, -0.35]].forEach(([x, z, ry], i) => {
      const body = new THREE.Mesh(bumpify(new THREE.SphereGeometry(0.5, 48, 24), 0.03, 8, i + 3),
        mat('#ffffff', 0.75, 0, { map: T.charred(), bumpMap: T.charred(), bumpScale: 4 }));
      body.scale.set(1.75, 0.42, 0.62); body.position.set(x, 0.32, z); body.rotation.y = ry; body.castShadow = true; g.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 3), mat('#2d2a30', 0.8));
      tail.rotation.set(0, ry, Math.PI / 2); tail.scale.z = 0.25;
      tail.position.set(x + Math.cos(ry) * 0.95, 0.32, z - Math.sin(ry) * 0.95); g.add(tail);
    });
    const r = rng(21);
    g.add(scatter(new THREE.TorusGeometry(0.16, 0.018, 6, 24), glossy('#ffffff'), 40, (i, d) => {
      d.position.set(-0.3 + r() * 1.3, 0.2 + r() * 0.1, 0.75 + r() * 0.6 - 0.3);
      d.rotation.set(Math.PI / 2 + (r() - 0.5) * 0.8, r(), r() * 3); d.scale.set(1, 0.4 + r() * 0.6, 1);
      return r() > 0.4 ? '#b9407a' : '#f2e3ee';
    }));
    g.add(dice(40, ['#e2391f', '#f07c2a', '#7ec24a', '#f4d35e'], { x: -0.55, y: 0.18, z: -0.85, r: 0.38, h: 0.1 }, 22));
    g.add(dice(40, ['#2f9a3b', '#4fb348', '#1f7a2c'], { x: -1.15, y: 0.16, z: 0.75, r: 0.3, h: 0.1 }, 23, 0.06));
    const s = sauceBlob('#9c2212', 0.34, 4); s.position.set(1.05, 0.15, 0.75); g.add(s);
    return g;
  },

  'riz-gras'() {
    const g = new THREE.Group();
    g.add(metalTray());
    const rice = mound(1.4, 0.3, T.rizGras(), 7); rice.scale.z = 1.25; rice.position.y = 0.05; g.add(rice);
    const fish = new THREE.Mesh(bumpify(new THREE.SphereGeometry(0.5, 48, 24), 0.02, 6, 3), mat('#ffffff', 0.55, 0, { map: T.fishSkin() }));
    fish.scale.set(1.5, 0.5, 0.9); fish.position.set(0.15, 0.42, -0.1); fish.rotation.y = 0.5; fish.castShadow = true; g.add(fish);
    const herb = sauceBlob('#3f5a1a', 0.22, 9); herb.position.set(-0.25, 0.55, 0.2); g.add(herb);
    const carrotGeo = new THREE.CylinderGeometry(0.07, 0.11, 1.1, 18); carrotGeo.rotateZ(Math.PI / 2);
    [[-0.7, 0.4, 0.4], [0.75, 0.38, 0.3], [0.5, -0.6, -0.4], [-0.6, -0.5, 0.9]].forEach(([x, z, ry]) => {
      const c = new THREE.Mesh(carrotGeo, glossy('#e2621f')); c.position.set(x, 0.4, z); c.rotation.y = ry; c.castShadow = true; g.add(c);
    });
    const cab = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 20, 0, Math.PI), glossy('#d9862e'));
    cab.scale.set(1.1, 0.55, 0.7); cab.position.set(-0.1, 0.32, 1.1); cab.rotation.x = -Math.PI / 2; g.add(cab);
    const lem = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glossy('#f2d23a'));
    lem.position.set(0.75, 0.33, -1.25); g.add(lem);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), mat('#ffffff', 0.4, 0, { map: T.lemon() }));
    face.rotation.x = -Math.PI / 2; face.position.set(0.75, 0.335, -1.25); g.add(face);
    [[-0.85, -0.45], [0.95, 0.85]].forEach(([x, z], i) => {
      const e = new THREE.Mesh(bumpify(new THREE.SphereGeometry(0.2, 24, 16), 0.015, 12, i), glossy(i ? '#c7b23a' : '#3a2240'));
      e.scale.set(i ? 1 : 2.2, 0.8, 1); e.position.set(x, 0.38, z); g.add(e);
    });
    return g;
  },

  alloco() {
    const g = new THREE.Group();
    g.add(woodPlate());
    const r = rng(31);
    const chunk = bumpify(new THREE.BoxGeometry(0.26, 0.2, 0.22, 3, 3, 3), 0.02, 9, 2);
    g.add(scatter(chunk, glossy('#ffffff', { roughness: 0.45 }), 70, (i, d) => {
      const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 1.25;
      d.position.set(Math.cos(a) * rad, 0.22 + r() * 0.2 + (1.25 - rad) * 0.18, Math.sin(a) * rad * 0.95 - 0.1);
      d.rotation.set(r() * 3, r() * 3, r() * 3);
      return ['#d9822a', '#b8561a', '#8e3a10', '#e89a3a', '#c86a20'][Math.floor(r() * 5)];
    }));
    const e1 = egg(); e1.position.set(0.15, 0.4, 1.0); e1.rotation.y = 0.2; g.add(e1);
    const e2 = egg(); e2.position.set(0.85, 0.4, 0.75); e2.rotation.y = -0.4; g.add(e2);
    const s = sauceBlob('#7a3416', 0.42, 6); s.position.set(-0.65, 0.3, 0.85); g.add(s);
    return g;
  },

  'foutou-graine'() {
    const g = new THREE.Group();
    g.add(canari());
    g.add(liquidDisk(1.48, '#c4521a', 0.82));
    g.add(meatChunks(14, { r: 1.3, r0: 0.6, y: 0.85 }, 41));
    [[-0.38, 0.1], [0.42, -0.05]].forEach(([x, z], i) => {
      const b = new THREE.Mesh(bumpify(new THREE.SphereGeometry(0.5, 48, 24), 0.012, 6, i), new THREE.MeshPhysicalMaterial({ color: '#e9d23e', roughness: 0.35, clearcoat: 0.5 }));
      b.scale.set(1, 0.85, 1.05); b.position.set(x, 1.12, z); b.castShadow = true; g.add(b);
    });
    const ch = new THREE.Mesh(bumpify(new THREE.SphereGeometry(0.13, 20, 12), 0.02, 10, 3), glossy('#8bb23a'));
    ch.position.set(0.2, 0.92, 0.85); g.add(ch);
    return g;
  },

  'foutou-gombo'() {
    const g = new THREE.Group();
    g.add(canari());
    g.add(liquidDisk(1.48, '#6a5a24', 0.82));
    const r = rng(51);
    g.add(scatter(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 6), glossy('#ffffff'), 60, (i, d) => {
      const a = r() * Math.PI * 2, rad = 0.4 + r() * 1.0;
      d.position.set(Math.cos(a) * rad, 0.84, Math.sin(a) * rad); d.rotation.set(r() * 0.8, r() * 3, r() * 0.8);
      return r() > 0.3 ? '#2f8a2a' : '#6fbf4a';
    }));
    const fg = new THREE.SphereGeometry(0.62, 64, 32), p = fg.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = 1 - 0.07 * Math.abs(Math.cos(Math.atan2(v.z, v.x) * 6));
      p.setXYZ(i, v.x * k, v.y, v.z * k);
    }
    fg.computeVertexNormals();
    const fou = new THREE.Mesh(fg, new THREE.MeshPhysicalMaterial({ color: '#f3eee2', roughness: 0.45, sheen: 0.4 }));
    fou.scale.y = 0.78; fou.position.set(0, 1.12, -0.3); fou.castShadow = true; g.add(fou);
    const shrimp = new THREE.TorusGeometry(0.17, 0.075, 10, 24, Math.PI * 1.3);
    [[0.75, 0.35], [-0.7, 0.55], [0.3, 0.9], [-0.25, 0.95], [0.95, -0.4]].forEach(([x, z], i) => {
      const s = new THREE.Mesh(shrimp, glossy(i % 2 ? '#f08a3c' : '#ee7a2e')); s.position.set(x, 0.88, z); s.rotation.set(-Math.PI / 2 + 0.3, 0, i); s.castShadow = true; g.add(s);
    });
    [[-1.05, -0.3, 0.8], [1.0, 0.3, -0.6]].forEach(([x, z, rz]) => {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.7, 12), glossy('#d4542a')); claw.position.set(x, 1.05, z); claw.rotation.set(0.4, 0, rz); g.add(claw);
    });
    g.add(meatChunks(6, { r: 1.2, r0: 0.7, y: 0.86 }, 52, '#3c2418'));
    return g;
  },

  choukouya() {
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 1.9), mat('#ffffff', 0.6, 0, { map: T.wood() }));
    board.position.y = 0.07; board.receiveShadow = true; g.add(board);
    const r = rng(61);
    [-0.55, 0, 0.55].forEach((z, k) => {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.0, 8), mat('#d8b98a', 0.8));
      stick.rotation.z = Math.PI / 2; stick.position.set(0, 0.3, z); g.add(stick);
      g.add(scatter(bumpify(new THREE.BoxGeometry(0.28, 0.24, 0.26, 3, 3, 3), 0.025, 10, k), glossy('#ffffff', { roughness: 0.55 }), 8, (i, d) => {
        d.position.set(-1.1 + i * 0.31, 0.3, z); d.rotation.set(r(), r() * 0.5, r());
        return i % 3 === 2 ? '#e9d9e6' : ['#4e2412', '#6b3318', '#3b1a0c'][Math.floor(r() * 3)];
      }));
    });
    g.add(dice(40, ['#c0391b', '#8a2a12'], { x: 0.4, y: 0.42, z: 0, r: 1.0, h: 0.03 }, 62, 0.035));
    return g;
  },

  gbofloto() {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(lathe([[0, 0], [0.9, 0], [1.3, 0.25], [1.55, 0.7], [1.6, 0.72], [1.45, 0.3], [0.9, 0.08], [0, 0.08]]), mat('#ffffff', 0.85, 0, { map: T.woven(), side: THREE.DoubleSide }));
    g.add(bowl);
    const r = rng(71);
    g.add(scatter(bumpify(new THREE.SphereGeometry(0.33, 32, 20), 0.03, 8, 5), glossy('#ffffff', { roughness: 0.5 }), 9, (i, d) => {
      const a = (i / 6) * Math.PI * 2, top = i >= 6;
      d.position.set(top ? (i - 7) * 0.4 : Math.cos(a) * 0.62, top ? 0.85 : 0.45, top ? (r() - 0.5) * 0.3 : Math.sin(a) * 0.62);
      d.rotation.set(r(), r(), r()); d.scale.set(1, 0.92, 1.05);
      return ['#d58a2c', '#c4741f', '#e2a043'][Math.floor(r() * 3)];
    }));
    return g;
  },
};

/* ---------- BOISSONS ---------- */
function labelTex(key, w, h, draw) {
  return canvasTex(key, w, h, (g) => draw(g, w, h));
}
function font(g, size, weight = 800, family = '"Big Shoulders Display", "Arial Narrow", sans-serif', style = '') {
  g.font = `${style} ${weight} ${size}px ${family}`;
}

function can({ key, h = 2.1, r = 0.55, draw }) {
  const g = new THREE.Group();
  const tex = labelTex(key, 1024, 512, draw);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 72, 1, true),
    new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }));
  body.castShadow = true; g.add(body);
  const alu = mat('#d7dbe0', 0.22, 1);
  const top = new THREE.Mesh(lathe([[0, 0.04], [r * 0.82, 0.04], [r * 0.86, 0.1], [r * 0.92, 0.1], [r, 0], [r, -0.06]], 64), alu);
  top.position.y = h / 2 + 0.06; g.add(top);
  const tab = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 18), alu);
  tab.rotation.x = -Math.PI / 2; tab.scale.set(1, 1.5, 1); tab.position.set(0, h / 2 + 0.11, 0.12); g.add(tab);
  const bot = new THREE.Mesh(lathe([[r, 0.06], [r * 0.9, -0.08], [0, -0.05]], 64), alu);
  bot.position.y = -h / 2; g.add(bot);
  return g;
}

function bottle({ profile, glass, liquid, liquidTop = 0.8, cap, capH = 0.22, capR, label, labelY = 0, labelH = 0.8, squircle = false }) {
  const g = new THREE.Group();
  const geo = lathe(profile, 64);
  if (squircle) {
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const a = Math.atan2(v.z, v.x), k = 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)), 4) + Math.pow(Math.abs(Math.sin(a)), 4), 0.25);
      const rad = Math.hypot(v.x, v.z), f = Math.min(k, 1.18);
      p.setXYZ(i, Math.cos(a) * rad * f * 0.9, v.y, Math.sin(a) * rad * f * 0.9);
    }
    geo.computeVertexNormals();
  }
  const shell = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color: glass.color, roughness: 0.06, metalness: 0, transparent: true, opacity: glass.opacity,
    clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
  }));
  if (liquid) {
    const maxY = profile[profile.length - 1][1];
    const inner = profile.filter(([, y]) => y <= maxY * liquidTop).map(([x, y]) => [Math.max(0, x * 0.93), y + 0.01]);
    inner.push([0, inner[inner.length - 1][1]]);
    const lg = lathe(inner, 48);
    if (squircle) lg.scale(1.0, 1, 1.0);
    const lm = new THREE.Mesh(lg, new THREE.MeshPhysicalMaterial({ color: liquid.color, roughness: 0.1, transparent: liquid.opacity < 1, opacity: liquid.opacity, clearcoat: 1 }));
    if (squircle) lm.scale.set(1.0, 1, 1.0);
    g.add(lm);
  }
  g.add(shell);
  const top = profile[profile.length - 1];
  const c = new THREE.Mesh(new THREE.CylinderGeometry(capR || top[0] * 1.15, capR || top[0] * 1.15, capH, 40), glossy(cap, { roughness: 0.35 }));
  c.position.y = top[1] + capH / 2; g.add(c);
  if (label) {
    const ly = profile.find(([, y]) => y >= labelY) || profile[1];
    const lr = ly[0] * (squircle ? 1.0 : 1) + 0.012;
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(lr, lr, labelH, 64, 1, true), mat('#ffffff', 0.4, 0, { map: label }));
    lab.position.y = labelY + labelH / 2; g.add(lab);
  }
  const box = new THREE.Box3().setFromObject(g);
  g.children.forEach((ch) => { ch.position.y -= (box.max.y + box.min.y) / 2; });
  return g;
}

const drinks = {
  eau: () => bottle({
    profile: [[0, 0], [0.5, 0], [0.56, 0.08], [0.55, 0.4], [0.5, 0.48], [0.55, 0.56], [0.55, 0.9], [0.5, 0.98], [0.55, 1.06], [0.55, 1.4], [0.5, 1.48], [0.54, 1.56], [0.5, 1.8], [0.3, 2.1], [0.2, 2.25], [0.2, 2.35]],
    glass: { color: '#e6f4ff', opacity: 0.22 }, liquid: { color: '#7cc4ff', opacity: 0.22 }, liquidTop: 0.85, cap: '#1f4fd1',
    label: labelTex('eau', 1024, 256, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f4fd1'; g.fillRect(0, h * 0.72, w, h * 0.28);
      g.fillStyle = '#1f4fd1'; font(g, 110); g.textAlign = 'center'; g.fillText('EAU MINÉRALE', w / 2, h * 0.6);
    }), labelY: 1.1, labelH: 0.3,
  }),
  coca: () => bottle({
    profile: [[0, 0], [0.42, 0], [0.5, 0.1], [0.6, 0.25], [0.62, 0.6], [0.6, 0.8], [0.62, 1.0], [0.62, 1.5], [0.58, 1.75], [0.4, 2.15], [0.22, 2.45], [0.2, 2.6]],
    glass: { color: '#ffffff', opacity: 0.2 }, liquid: { color: '#2b0d06', opacity: 0.96 }, liquidTop: 0.86, cap: '#e1141c',
    label: labelTex('coca', 1024, 300, (g, w, h) => {
      g.fillStyle = '#e1141c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff'; font(g, 150, 700, 'Georgia, serif', 'italic'); g.textAlign = 'center'; g.fillText('Coca-Cola', w / 2, h * 0.55);
      font(g, 46, 700, 'Arial, sans-serif'); g.fillText('2 L', w / 2, h * 0.85);
    }), labelY: 1.0, labelH: 0.5,
  }),
  desperados: () => bottle({
    profile: [[0, 0], [0.42, 0], [0.46, 0.06], [0.46, 1.35], [0.4, 1.6], [0.2, 1.95], [0.16, 2.35], [0.17, 2.45]],
    glass: { color: '#f2a33a', opacity: 0.55 }, liquid: { color: '#e08a14', opacity: 0.85 }, liquidTop: 0.82, cap: '#c9a13a', capH: 0.1, capR: 0.18,
    label: labelTex('desp', 1024, 400, (g, w, h) => {
      g.fillStyle = '#f4e5bd'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#4e8a2e'; g.fillRect(0, h * 0.62, w, h * 0.38);
      g.fillStyle = '#b3171d'; font(g, 150, 900); g.textAlign = 'center'; g.fillText('DESPERADOS', w / 2, h * 0.5);
      g.fillStyle = '#ffffff'; font(g, 60, 700, 'Arial, sans-serif'); g.fillText('TEQUILA', w / 2, h * 0.86);
    }), labelY: 0.45, labelH: 0.6,
  }),
  bissap: () => bottle({
    profile: [[0, 0], [0.48, 0], [0.55, 0.08], [0.55, 1.4], [0.48, 1.6], [0.3, 1.75], [0.28, 1.85]], squircle: true,
    glass: { color: '#ffffff', opacity: 0.18 }, liquid: { color: '#6d0a1e', opacity: 0.95 }, liquidTop: 0.9, cap: '#111111', capH: 0.26,
    label: labelTex('bissap', 1024, 256, (g, w, h) => {
      g.fillStyle = '#f3e9d2'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#6d0a1e'; font(g, 120, 800); g.textAlign = 'center'; g.fillText('BISSAP', w / 2, h * 0.62);
      g.fillStyle = '#F77F00'; g.fillRect(0, h * 0.82, w, 18);
    }), labelY: 0.55, labelH: 0.35,
  }),
  orange: () => bottle({
    profile: [[0, 0], [0.48, 0], [0.55, 0.08], [0.55, 1.4], [0.48, 1.6], [0.3, 1.75], [0.28, 1.85]], squircle: true,
    glass: { color: '#ffffff', opacity: 0.18 }, liquid: { color: '#f7930f', opacity: 0.95 }, liquidTop: 0.92, cap: '#13702e', capH: 0.28,
    label: labelTex('orange', 1024, 256, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#F77F00'; font(g, 104, 800); g.textAlign = 'center'; g.fillText("JUS D'ORANGE", w / 2, h * 0.62);
      g.fillStyle = '#13702e'; g.fillRect(0, h * 0.82, w, 18);
    }), labelY: 0.55, labelH: 0.35,
  }),
  redbull: () => can({
    key: 'redbull', h: 2.0, r: 0.5, draw(g, w, h) {
      g.fillStyle = '#c4cad3'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1d3a8f';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.42, 0); g.lineTo(w * 0.58, h); g.lineTo(0, h); g.fill();
      g.beginPath(); g.moveTo(w, 0); g.lineTo(w * 0.92, 0); g.lineTo(w * 0.98, h); g.lineTo(w, h); g.fill();
      g.fillStyle = '#f2c230'; g.beginPath(); g.arc(w * 0.62, h * 0.48, 46, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#d0202f'; font(g, 120, 900); g.textAlign = 'center'; g.fillText('Red Bull', w * 0.62, h * 0.36);
      font(g, 46, 700, 'Arial, sans-serif'); g.fillText('ENERGY DRINK', w * 0.62, h * 0.7);
    },
  }),
  monster: () => can({
    key: 'monster', h: 2.4, r: 0.55, draw(g, w, h) {
      g.fillStyle = '#0c0d0c'; g.fillRect(0, 0, w, h);
      const r = rng(9);
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.12})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, 7); g.fill(); }
      g.fillStyle = '#7ddc2e'; g.fillRect(w * 0.47, h * 0.08, 10, h * 0.5);
      g.fillStyle = '#ffffff'; font(g, 120, 900); g.textAlign = 'center'; g.fillText('MONSTER', w / 2, h * 0.76);
      g.fillStyle = '#7ddc2e'; font(g, 60, 700, 'Arial, sans-serif'); g.fillText('E N E R G Y', w / 2, h * 0.9);
    },
  }),
  vody: () => can({
    key: 'vody', h: 2.1, r: 0.5, draw(g, w, h) {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#0b0b0b'); grd.addColorStop(0.5, '#0b0b0b'); grd.addColorStop(0.62, '#c9a24a'); grd.addColorStop(0.75, '#d3202a'); grd.addColorStop(1, '#d3202a');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff'; font(g, 190, 900); g.textAlign = 'center'; g.fillText('Vody', w / 2, h * 0.42);
      font(g, 64, 700, 'Arial, sans-serif'); g.fillText('vodka energy mix', w / 2, h * 0.88);
    },
  }),
};

/* Plat inconnu dans le JSON : assiette générique, la photo posée dessus. */
function photoPlate(url) {
  const g = new THREE.Group();
  g.add(woodPlate());
  const tex = new THREE.TextureLoader().load(url); tex.colorSpace = THREE.SRGBColorSpace;
  const disk = new THREE.Mesh(new THREE.CircleGeometry(1.45, 64), mat('#ffffff', 0.6, 0, { map: tex }));
  disk.rotation.x = -Math.PI / 2; disk.position.y = 0.13; g.add(disk);
  return g;
}

export function buildModel(id, photo = '') {
  let g, kind = 'dish';
  if (dishes[id]) g = dishes[id]();
  else if (drinks[id]) { g = drinks[id](); kind = 'drink'; }
  else g = photo ? photoPlate(photo) : dishes.garba();
  g.userData.kind = kind;
  return g;
}

/* Petits éléments flottants (piments, oignons, tomates) pour l'arrière-plan. */
export function buildFloaters(count = 36) {
  const r = rng(99), group = new THREE.Group(), items = [];
  const geos = [
    [new THREE.TorusGeometry(0.16, 0.05, 10, 20, Math.PI * 1.5), '#3f9a2e'],
    [new THREE.TorusGeometry(0.2, 0.035, 8, 24), '#b9407a'],
    [new THREE.BoxGeometry(0.18, 0.14, 0.18), '#e0301e'],
    [bumpify(new THREE.DodecahedronGeometry(0.12, 1), 0.01, 8, 1), '#efe3c2'],
    [new THREE.ConeGeometry(0.07, 0.5, 10), '#e5260f'],
  ];
  for (let i = 0; i < count; i++) {
    const [geo, color] = geos[i % geos.length];
    const m = new THREE.Mesh(geo, glossy(color));
    m.position.set((r() - 0.5) * 16, (r() - 0.5) * 9, -3 - r() * 7);
    m.rotation.set(r() * 6, r() * 6, r() * 6);
    m.userData = { speed: 0.2 + r() * 0.5, spin: (r() - 0.5) * 1.2, phase: r() * 6 };
    group.add(m); items.push(m);
  }
  group.userData.items = items;
  return group;
}

export function makeEnvironment(renderer) {
  return import('three/addons/environments/RoomEnvironment.js').then(({ RoomEnvironment }) => {
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return env;
  });
}

export function addLights(scene) {
  scene.add(new THREE.HemisphereLight('#fff3e0', '#2a1606', 0.9));
  const key = new THREE.DirectionalLight('#ffe2bf', 2.2);
  key.position.set(3, 6, 4); scene.add(key);
  const rim = new THREE.DirectionalLight('#F77F00', 1.6);
  rim.position.set(-5, 2, -4); scene.add(rim);
}

/* Centre le modèle et le ramène à une taille commune. */
export function normalize(obj, size = 3.4) {
  const box = new THREE.Box3().setFromObject(obj), s = new THREE.Vector3(), c = new THREE.Vector3();
  box.getSize(s); box.getCenter(c);
  const k = size / Math.max(s.x, s.y, s.z);
  const wrap = new THREE.Group();
  obj.position.sub(c);
  wrap.add(obj); wrap.scale.setScalar(k);
  wrap.userData.kind = obj.userData.kind;
  return wrap;
}

export { THREE };
