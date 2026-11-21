/* Le Baobab — rendu 3D réaliste à partir des vraies photos.
   1. Apparition : la photo se forme à partir de « gaussian splats » (une tache par pixel).
   2. Ensuite : surface continue en relief (carte de profondeur IA Depth Anything V2),
      texturée par la photo, avec ombrage, reflets et liseré lumineux qui bougent
      quand le plat pivote. Les boissons reçoivent un profil cylindrique (par objet
      et par ligne) et des reflets plus brillants.
   Fichiers : assets/splat/<nom>-color.webp (photo détourée) + <nom>-depth.webp. */
import * as THREE from 'three';

const loadImg = (src) => new Promise((ok, ko) => {
  const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = () => ko(new Error('Image introuvable : ' + src)); i.src = src;
});
function pixels(img, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  return g.getImageData(0, 0, w, h).data;
}

/* ---- splats (apparition) ---- */
const pointsVert = /* glsl */`
  attribute vec4 aColor;
  attribute vec3 aRand;
  uniform float uPx, uSpacing, uReveal, uTime;
  varying vec4 vColor;
  void main() {
    float r = clamp(uReveal * 1.6 - aRand.x * 0.6, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - r, 3.0);
    vec3 scatter = position + (aRand - 0.5) * vec3(2.2, 2.2, 1.6) + vec3(0.0, -0.6, 0.0);
    vec3 p = mix(scatter, position, e);
    p += (aRand - 0.5) * 0.004 * sin(uTime * 2.0 + aRand.y * 40.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float sc = length(modelViewMatrix[0].xyz);
    gl_PointSize = max(1.0, uSpacing * sc * uPx / -mv.z * 2.4);
    float handOff = 1.0 - smoothstep(0.9, 1.0, uReveal); // laisse la place à la surface
    vColor = vec4(aColor.rgb, aColor.a * e * handOff);
  }`;
const pointsFrag = /* glsl */`
  varying vec4 vColor;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float a = vColor.a * exp(-dot(c, c) * 2.2);
    if (a < 0.12) discard;
    gl_FragColor = vec4(vColor.rgb, min(1.0, a * 1.6));
  }`;

/* ---- surface photo en relief ---- */
const meshVert = /* glsl */`
  varying vec2 vUv;
  varying vec3 vView;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;
const meshFrag = /* glsl */`
  uniform sampler2D uMap;
  uniform float uReveal, uGloss, uShine, uTime;
  varying vec2 vUv;
  varying vec3 vView;
  varying vec3 vNormal;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float alpha = smoothstep(0.35, 0.7, tex.a) * smoothstep(0.85, 1.0, uReveal);
    if (alpha < 0.02) discard;
    vec3 n = normalize(vNormal); // normales lissées : reflets propres
    vec3 v = normalize(-vView);
    if (dot(n, v) < 0.0) n = -n;
    vec3 L = normalize(vec3(-0.45, 0.65, 0.75));
    float diff = 0.82 + 0.28 * max(dot(n, L), 0.0);
    vec3 h = normalize(L + v);
    float spec = pow(max(dot(n, h), 0.0), uShine) * uGloss;
    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    vec3 col = tex.rgb * diff + spec * vec3(1.0, 0.96, 0.9) + rim * vec3(1.0, 0.5, 0.0) * 0.12;
    gl_FragColor = vec4(col, alpha);
  }`;

/**
 * @param {string} base  ex. "assets/splat/garba"
 * @param {{kind:'dish'|'drink', relief?:number}} opts
 * @returns {Promise<THREE.Group>} objet normalisé : la plus grande dimension vaut 1
 */
export async function loadSplat(base, { kind = 'dish', relief } = {}) {
  const [ci, di] = await Promise.all([loadImg(base + '-color.webp'), loadImg(base + '-depth.webp')]);
  const w = ci.naturalWidth, h = ci.naturalHeight;
  const col = pixels(ci, w, h), dep = pixels(di, w, h);
  const S = Math.max(w, h), spacing = 1 / S;
  const drink = kind === 'drink';
  relief = relief ?? (drink ? 0.0 : 0.2);

  let dmin = 255, dmax = 0;
  for (let i = 0; i < w * h; i++) if (col[i * 4 + 3] > 110) { const d = dep[i * 4]; if (d < dmin) dmin = d; if (d > dmax) dmax = d; }
  const dr = Math.max(1, dmax - dmin);

  // hauteur de chaque pixel
  const Z = new Float32Array(w * h).fill(-relief * 0.5);
  for (let y = 0; y < h; y++) {
    if (drink) {
      // profil cylindrique par segment continu (bouteille et glaçons séparés)
      let x = 0;
      while (x < w) {
        while (x < w && col[(y * w + x) * 4 + 3] <= 90) x++;
        const l = x;
        while (x < w && col[(y * w + x) * 4 + 3] > 90) x++;
        const r = x - 1;
        if (r < l) continue;
        const cx = (l + r) / 2, rad = Math.max(1, (r - l) / 2);
        for (let k = l; k <= r; k++) {
          const u = Math.min(1, Math.abs(k - cx) / rad);
          Z[y * w + k] = Math.sqrt(1 - u * u) * rad * spacing * 0.95;
        }
      }
    } else {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (col[i * 4 + 3] > 20) Z[i] = ((dep[i * 4] - dmin) / dr) * relief - relief * 0.5;
      }
    }
  }

  const shared = {
    uPx: { value: 800 }, uSpacing: { value: spacing * 2 }, uReveal: { value: 0 }, uTime: { value: 0 },
  };

  // 1. splats : un pixel sur deux suffit pour l'apparition
  const pos = [], rgba = [], rnd = [];
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    const i = y * w + x, a = col[i * 4 + 3];
    if (a < 110) continue;
    pos.push((x - w / 2) * spacing, -(y - h / 2) * spacing, Z[i]);
    rgba.push(col[i * 4] / 255, col[i * 4 + 1] / 255, col[i * 4 + 2] / 255, a / 255);
    rnd.push(Math.random(), Math.random(), Math.random());
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  pg.setAttribute('aColor', new THREE.Float32BufferAttribute(rgba, 4));
  pg.setAttribute('aRand', new THREE.Float32BufferAttribute(rnd, 3));
  const points = new THREE.Points(pg, new THREE.ShaderMaterial({ vertexShader: pointsVert, fragmentShader: pointsFrag, transparent: true, depthWrite: true, uniforms: shared }));
  points.frustumCulled = false;

  // 2. surface continue en relief (une maille tous les 2 pixels)
  const sx = Math.max(2, Math.round(w / 2)), sy = Math.max(2, Math.round(h / 2));
  const mg = new THREE.PlaneGeometry(w * spacing, h * spacing, sx, sy);
  const p = mg.attributes.position, uv = mg.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const px = Math.min(w - 1, Math.round(uv.getX(i) * (w - 1)));
    const py = Math.min(h - 1, Math.round((1 - uv.getY(i)) * (h - 1)));
    p.setZ(i, Z[py * w + px]);
  }
  mg.computeVertexNormals();
  const tex = new THREE.Texture(ci);
  tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 4; tex.needsUpdate = true;
  const mesh = new THREE.Mesh(mg, new THREE.ShaderMaterial({
    vertexShader: meshVert, fragmentShader: meshFrag, transparent: true, depthWrite: true, side: THREE.DoubleSide,
    uniforms: { uMap: { value: tex }, uReveal: shared.uReveal, uTime: shared.uTime, uGloss: { value: drink ? 0.4 : 0.14 }, uShine: { value: drink ? 36 : 22 } },
  }));
  mesh.frustumCulled = false;

  const g = new THREE.Group();
  g.add(mesh, points);
  g.userData = { kind, splat: true, w: w * spacing, h: h * spacing, points, mesh };
  g.material = { uniforms: shared }; // interface commune aux appelants
  return g;
}

/* À appeler avant chaque rendu : taille des splats selon la hauteur de la vue. */
export function setSplatView(obj, camera, viewportHeightPx) {
  const u = obj.material.uniforms;
  u.uPx.value = viewportHeightPx / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  obj.userData.points.visible = u.uReveal.value < 0.999;
  obj.userData.mesh.visible = u.uReveal.value > 0.85;
}
