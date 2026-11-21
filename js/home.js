/* Accueil : plats phares pilotés par le JSON + plat en splats 3D qui suit le défilement. */
import { fcfa, loadMenu } from './config.js';

const phares = document.querySelector('.phares');
const nomEl = document.getElementById('phare-nom');
const descEl = document.getElementById('phare-desc');
const pimentEl = document.getElementById('phare-piment');
const prixEl = document.getElementById('phare-prix');
const thumbs = document.querySelector('.phare-thumbs');
const bgImgs = [...document.querySelectorAll('.phares-bg img')];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let items = [];
let current = -1;
let onSwitch = () => {};
let bgFront = 0;

function setBackground(src) {
  // fondu enchaîné entre deux calques photo
  if (bgImgs[bgFront].getAttribute('src') === src) { bgImgs[bgFront].classList.add('is-on'); return; }
  const next = bgImgs[1 - bgFront];
  next.removeAttribute('srcset');
  next.sizes = '100vw';
  next.srcset = `${src.replace('assets/img/', 'assets/img/sm/')} 420w, ${src} 900w`;
  next.onload = () => { next.classList.add('is-on'); bgImgs[bgFront].classList.remove('is-on'); bgFront = 1 - bgFront; };
  next.src = src;
}

function show(i, fromScroll = false) {
  if (i === current || !items[i]) return;
  current = i;
  const it = items[i];
  phares.classList.add('is-switching');
  setTimeout(() => {
    nomEl.textContent = it.nom;
    descEl.textContent = it.description;
    pimentEl.textContent = it.tags.includes('Épicé') ? 'Bien relevé' : 'Doux, piment servi à part';
    prixEl.textContent = fcfa(it.prix);
    phares.classList.remove('is-switching');
  }, reduce ? 0 : 280);
  if (it.image) setBackground(it.image);
  thumbs.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
  const num = document.getElementById('phare-num'); if (num) num.textContent = i + 1;
  window.dispatchEvent(new CustomEvent('baobab:phare', { detail: { index: i } }));
  onSwitch(it);
  if (!fromScroll) {
    const top = phares.offsetTop + (phares.offsetHeight - innerHeight) * (i / items.length) + 2;
    scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }
}

loadMenu().then((menu) => {
  items = menu.articles.filter((a) => a.phare).slice(0, 4);
  thumbs.innerHTML = '';
  const tot = document.getElementById('phare-total'); if (tot) tot.textContent = items.length;
  items.forEach((it, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Voir ' + it.nom);
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<img src="${it.image.replace('assets/img/', 'assets/img/sm/')}" alt="" width="72" height="72" loading="lazy">`;
    b.addEventListener('click', () => show(i));
    thumbs.append(b);
  });
  show(0, true);
}).catch((e) => { nomEl.textContent = 'Garba'; console.error(e); });

function pharesProgress() {
  const r = phares.getBoundingClientRect();
  return Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
}
addEventListener('scroll', () => {
  if (!items.length) return;
  const r = phares.getBoundingClientRect();
  if (r.top > 0 || r.bottom < innerHeight) return;
  show(Math.min(items.length - 1, Math.floor(pharesProgress() * items.length)), true);
}, { passive: true });

/* ---------- Scène 3D : splats gaussiens générés depuis les photos ---------- */
async function start3D() {
  const THREE = await import('three');
  const { loadSplat, setSplatView } = await import('./splat.js');
  const canvas = document.querySelector('.stage3d');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  const wpp = () => (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z) / innerHeight;

  // braises qui montent dans le héros
  const N = reduce ? 0 : 160, ep = new Float32Array(N * 3), es = new Float32Array(N);
  for (let i = 0; i < N; i++) { ep.set([(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 9, -1 - Math.random() * 4], i * 3); es[i] = 0.3 + Math.random(); }
  const eg = new THREE.BufferGeometry();
  eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xff8a1c, size: 0.06, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(embers);

  const pivot = new THREE.Group(); scene.add(pivot);
  const cache = new Map();
  let model = null, leaving = null;
  const getSplat = (it) => {
    if (!cache.has(it.id)) cache.set(it.id, loadSplat(it.splat, { kind: 'dish' }));
    return cache.get(it.id);
  };

  const heroScene = document.querySelector('.hero-scene');
  const phareScene = document.querySelector('.phare-scene');
  const hero = document.querySelector('.hero');

  let wanted = null;
  const switchTo = async (it) => {
    if (!it.splat) return;
    wanted = it.id;
    const s = await getSplat(it);
    if (wanted !== it.id || s === model) return;
    if (model) { if (leaving) pivot.remove(leaving); leaving = model; }
    model = s; model.material.uniforms.uReveal.value = 0;
    pivot.add(model);
  };

  // premier plat : garba, déjà assemblé pour remplacer l'affiche sans saut
  const first = items[current] || { id: 'garba', splat: 'assets/splat/garba' };
  model = await getSplat(first);
  model.material.uniforms.uReveal.value = scrollY < 10 ? 1 : 0;
  pivot.add(model);
  onSwitch = switchTo;
  if (items[current] && items[current].id !== first.id) switchTo(items[current]);

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize); resize();

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }, { passive: true });

  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const anchor = (el, m) => {
    const r = el.getBoundingClientRect(), k = wpp();
    const s = Math.min(r.width / m.userData.w, r.height / m.userData.h) * k;
    return { x: (r.left + r.width / 2 - innerWidth / 2) * k, y: -(r.top + r.height / 2 - innerHeight / 2) * k, s };
  };
  const clock = new THREE.Clock();

  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const hr = hero.getBoundingClientRect(), pr = phares.getBoundingClientRect();
    if (pr.bottom < -50) return; // section passée : rien à dessiner
    const p1 = ease(Math.min(1, Math.max(0, -hr.top / innerHeight)));

    mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
    const A = anchor(heroScene, model), B = anchor(phareScene, model);
    pivot.position.set(lerp(A.x, B.x, p1), lerp(A.y, B.y, p1), 0);
    pivot.scale.setScalar(lerp(A.s, B.s, p1));
    const swing = reduce ? 0 : Math.sin(t * 0.6) * 0.28;
    pivot.rotation.set(-0.12 + mouse.y * 0.35, swing + mouse.x * 0.6, 0);
    const px = innerHeight * renderer.getPixelRatio();
    const u = model.material.uniforms;
    u.uReveal.value = Math.min(1, u.uReveal.value + dt * (reduce ? 10 : 0.8));
    u.uTime.value = t;
    setSplatView(model, camera, px);
    if (leaving) {
      const lu = leaving.material.uniforms;
      lu.uReveal.value = Math.max(0, lu.uReveal.value - dt * 2.2);
      setSplatView(leaving, camera, px);
      if (lu.uReveal.value <= 0) { pivot.remove(leaving); leaving = null; }
    }
    const arr = eg.attributes.position.array;
    for (let i = 0; i < N; i++) { arr[i * 3 + 1] += dt * es[i] * 0.5; if (arr[i * 3 + 1] > 4.5) arr[i * 3 + 1] = -4.5; }
    eg.attributes.position.needsUpdate = true;
    embers.visible = p1 < 0.7;
    embers.material.opacity = 0.8 * (1 - p1);
    renderer.render(scene, camera);
  }
  canvas.classList.add('is-ready');
  document.body.classList.add('has-3d');
  frame();
}

/* La 3D démarre à la première interaction : la page s'affiche tout de suite
   avec la photo détourée du garba, puis le plat devient vivant dès qu'on bouge, touche ou fait défiler. */
let started = false;
const EVENTS = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll'];
const kick = () => {
  if (started) return;
  started = true;
  EVENTS.forEach((ev) => removeEventListener(ev, kick));
  start3D().catch((e) => console.warn('3D indisponible :', e));
};
EVENTS.forEach((ev) => addEventListener(ev, kick, { passive: true }));
if (new URLSearchParams(location.search).has('3d')) kick(); // captures d'écran / démo
