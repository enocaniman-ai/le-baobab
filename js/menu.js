/* Page Menu : rendu depuis data/menu.json, filtres, 3D par carte + fiche détaillée. */
import { CONFIG, fcfa, loadMenu } from './config.js';

const root = document.getElementById('menu-root');
const filtres = document.getElementById('filtres');
const fiche = document.getElementById('fiche');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let menu = null;
let viewer = null; // moteur 3D, chargé après l'affichage

function card(a) {
  const tags = (a.tags || []).map((t) => `<span class="tag" data-t="${esc(t)}">${esc(t)}</span>`).join('');
  const img = a.image ? `<img src="${esc(a.image.replace('assets/img/', 'assets/img/sm/'))}" alt="" loading="lazy" decoding="async" width="400" height="400">` : '';
  return `<article class="plat" data-id="${esc(a.id)}">
    <div class="plat-vue" data-id="${esc(a.id)}">${img}<span class="vue-hint">Vue 3D</span></div>
    <div class="plat-info">
      <h3><button type="button" class="plat-open">${esc(a.nom)}</button></h3>
      <span class="plat-prix">${fcfa(a.prix)}</span>
      <p>${esc(a.description)}</p>
      ${tags ? `<div class="tags">${tags}</div>` : ''}
    </div>
  </article>`;
}

function render(cat = 'tout') {
  root.innerHTML = menu.categories.map((c) => {
    const list = menu.articles.filter((a) => a.categorie === c.id);
    if (!list.length || (cat !== 'tout' && cat !== c.id)) return '';
    return `<section class="menu-cat wrap" data-cat="${esc(c.id)}" aria-labelledby="cat-${esc(c.id)}">
      <h2 id="cat-${esc(c.id)}">${esc(c.nom)} <small>${list.length} choix</small></h2>
      <div class="menu-grid">${list.map(card).join('')}</div>
    </section>`;
  }).join('');
  if (viewer) viewer.sync();
  window.dispatchEvent(new CustomEvent('baobab:menu-rendu'));
}

function renderFiltres(active) {
  const all = [{ id: 'tout', nom: 'Tout', n: menu.articles.length }, ...menu.categories.map((c) => ({ ...c, n: menu.articles.filter((a) => a.categorie === c.id).length }))];
  filtres.innerHTML = all.map((c) => `<button type="button" data-cat="${esc(c.id)}" aria-pressed="${c.id === active}">${esc(c.nom)}<span class="count">${c.n}</span></button>`).join('');
}

filtres.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-cat]');
  if (!b) return;
  const cat = b.dataset.cat;
  filtres.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  history.replaceState(null, '', cat === 'tout' ? location.pathname : '#' + cat);
  render(cat);
});

root.addEventListener('click', (e) => {
  const c = e.target.closest('.plat');
  if (c) openFiche(c.dataset.id, c.querySelector('.plat-open'));
});

/* ---------- Fiche détaillée ---------- */
let lastFocus = null;
function openFiche(id, from) {
  const a = menu.articles.find((x) => x.id === id);
  if (!a) return;
  lastFocus = from;
  fiche.dataset.id = id;
  fiche.querySelector('#fiche-titre').textContent = a.nom;
  fiche.querySelector('.fiche-prix').textContent = fcfa(a.prix);
  fiche.querySelector('.fiche-desc').textContent = a.description;
  const img = fiche.querySelector('.fiche-photo');
  if (a.image) { img.src = a.image; img.alt = 'Photo : ' + a.nom; img.hidden = false; } else img.hidden = true;
  fiche.querySelector('.fiche-wa').href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(`Bonjour Le Baobab, je voudrais commander : ${a.nom} (${fcfa(a.prix)}).`)}`;
  fiche.querySelector('.fiche-tags').innerHTML = (a.tags || []).map((t) => `<span class="tag" data-t="${esc(t)}">${esc(t)}</span>`).join('');
  fiche.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  fiche.querySelector('.fiche-fermer').focus();
  if (viewer) viewer.openDetail(a);
}
function closeFiche() {
  fiche.classList.remove('is-open');
  document.body.style.overflow = '';
  if (viewer) viewer.closeDetail();
  if (lastFocus) lastFocus.focus();
}
fiche.querySelector('.fiche-fermer').addEventListener('click', closeFiche);
fiche.querySelector('.fiche-fond').addEventListener('click', closeFiche);
document.addEventListener('keydown', (e) => {
  if (!fiche.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeFiche();
  if (e.key === 'Tab') { // garde le focus dans la fiche
    const f = [...fiche.querySelectorAll('a[href], button:not([hidden])')];
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

/* ---------- Moteur 3D : un seul WebGL pour toutes les cartes (scissor) ---------- */
async function start3D() {
  const { THREE, buildModel, makeEnvironment, addLights, normalize } = await import('./models.js');
  const { loadSplat, setSplatView } = await import('./splat.js');
  const canvas = document.querySelector('.stage3d');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setScissorTest(true);
  const env = await makeEnvironment(renderer);

  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(247,127,0,.75)'); grd.addColorStop(0.45, 'rgba(247,127,0,.22)'); grd.addColorStop(1, 'rgba(247,127,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  function makeStage(article) {
    const scene = new THREE.Scene();
    const pivot = new THREE.Group(); scene.add(pivot);
    const drink = article.categorie === 'boissons';
    const st = { scene, pivot, drink, hover: 0, ready: false, splat: null, phase: Math.random() * 6 };
    if (article.splat) {
      // rendu réaliste : splats gaussiens issus de la photo
      st.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 20);
      st.camera.position.set(0, 0, 1.75);
      loadSplat(article.splat, { kind: drink ? 'drink' : 'dish' }).then((pts) => {
        pivot.add(pts); pivot.scale.setScalar(1.0); st.splat = pts; st.ready = true;
      }).catch((e) => console.warn(e));
    } else {
      // pas de photo : modèle 3D procédural
      scene.environment = env;
      addLights(scene);
      const model = normalize(buildModel(article.modele, article.image));
      pivot.add(model);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2; glow.position.y = -0.6; scene.add(glow);
      st.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      st.camera.position.set(0, 4.6, 6.2); st.camera.lookAt(0, -0.25, 0);
      st.ready = true;
    }
    return st;
  }

  const stages = new Map();
  const stageFor = (id) => {
    if (!stages.has(id)) stages.set(id, makeStage(menu.articles.find((a) => a.id === id)));
    return stages.get(id);
  };

  let slots = [];
  const io = new IntersectionObserver((entries) => entries.forEach((en) => { en.target._vis = en.isIntersecting; }), { rootMargin: '200px 0px' });
  function sync() {
    io.disconnect();
    slots = [...document.querySelectorAll('.plat-vue')];
    slots.forEach((el) => {
      io.observe(el);
      const card = el.closest('.plat');
      if (!card._hooked) {
        card._hooked = true;
        card.addEventListener('pointerenter', () => { el._hover = true; });
        card.addEventListener('pointerleave', () => { el._hover = false; });
      }
    });
  }
  sync();

  const resize = () => renderer.setSize(innerWidth, innerHeight, false);
  addEventListener('resize', resize); resize();

  /* Fiche : deuxième rendu, rotation au doigt / à la souris */
  const vue = fiche.querySelector('.fiche-vue');
  const detailR = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  detailR.setPixelRatio(Math.min(devicePixelRatio, 2));
  detailR.toneMapping = THREE.ACESFilmicToneMapping;
  vue.prepend(detailR.domElement);
  let detail = null, drag = null, velY = 0, rotX = 0;
  vue.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; vue.setPointerCapture(e.pointerId); vue.style.cursor = 'grabbing'; });
  vue.addEventListener('pointermove', (e) => {
    if (!drag || !detail) return;
    velY = (e.clientX - drag.x) * 0.01; detail.pivot.rotation.y += velY;
    rotX = Math.max(-0.5, Math.min(0.5, rotX + (e.clientY - drag.y) * 0.006));
    drag = { x: e.clientX, y: e.clientY };
  });
  const endDrag = () => { drag = null; vue.style.cursor = ''; };
  vue.addEventListener('pointerup', endDrag); vue.addEventListener('pointercancel', endDrag);

  viewer = {
    sync,
    openDetail(a) {
      const s = makeStage(a); detail = s; rotX = 0; velY = 0;
      vue.style.setProperty('--fiche-photo', a.image ? `url("${a.image}")` : 'none');
    },
    closeDetail() { detail = null; },
  };
  if (fiche.classList.contains('is-open')) {
    const a = menu.articles.find((x) => x.id === fiche.dataset.id);
    if (a) viewer.openDetail(a);
  }

  const clock = new THREE.Clock();
  const filtresEl = document.querySelector('.filtres');
  function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const H = innerHeight, W = innerWidth;
    const topClip = filtresEl ? filtresEl.getBoundingClientRect().bottom : 0;
    renderer.setScissor(0, 0, W, H); renderer.setClearColor(0x000000, 0); renderer.clear();

    if (!fiche.classList.contains('is-open')) {
      let built = false; // un seul nouveau modèle construit par image : pas de gel
      for (const el of slots) {
        if (!el._vis) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom < topClip || r.top > H || r.width === 0) continue;
        if (!stages.has(el.dataset.id)) { if (built) continue; built = true; }
        const s = stageFor(el.dataset.id);
        if (!s.ready) continue;
        if (!el.classList.contains('has-3d')) el.classList.add('has-3d');
        s.hover += ((el._hover ? 1 : 0) - s.hover) * 0.1;
        if (s.splat) {
          const u = s.splat.material.uniforms;
          u.uReveal.value = Math.min(1, u.uReveal.value + dt * (reduce ? 10 : 0.9)); u.uTime.value = t;
          setSplatView(s.splat, s.camera, r.height * renderer.getPixelRatio());
          s.pivot.rotation.y = reduce ? 0 : Math.sin(t * 0.7 + s.phase) * (0.32 + s.hover * 0.25);
          s.pivot.rotation.x = reduce ? 0 : -0.08 + Math.sin(t * 0.5 + s.phase) * 0.06;
          s.pivot.position.y = reduce ? 0 : Math.sin(t * 1.2 + s.phase) * 0.012 + s.hover * 0.02;
          s.pivot.scale.setScalar(1.0 + s.hover * 0.05);
        } else {
          if (!reduce) s.pivot.rotation.y += dt * (0.45 + s.hover * 2.2);
          s.pivot.position.y = reduce ? 0 : Math.sin(t * 1.4 + r.left * 0.01) * 0.06 + s.hover * 0.15;
        }
        s.camera.aspect = r.width / r.height; s.camera.updateProjectionMatrix();
        const y = H - r.bottom, clipTop = Math.max(r.top, topClip);
        renderer.setViewport(r.left, y, r.width, r.height);
        renderer.setScissor(r.left, y, r.width, Math.max(0, r.bottom - clipTop));
        renderer.render(s.scene, s.camera);
      }
    } else if (detail) {
      const w = vue.clientWidth, h = vue.clientHeight;
      if (detailR.domElement.width !== Math.floor(w * detailR.getPixelRatio())) detailR.setSize(w, h, false);
      detail.camera.aspect = w / h; detail.camera.updateProjectionMatrix();
      if (detail.ready) {
        if (detail.splat) {
          const u = detail.splat.material.uniforms;
          u.uReveal.value = Math.min(1, u.uReveal.value + dt * (reduce ? 10 : 0.8)); u.uTime.value = t;
          setSplatView(detail.splat, detail.camera, h * detailR.getPixelRatio());
          // vue issue d'une photo : rotation limitée, retour doux au centre
          if (!drag) { velY *= 0.92; detail.pivot.rotation.y = detail.pivot.rotation.y * 0.97 + (reduce ? 0 : Math.sin(t * 0.6) * 0.012) + velY; }
          detail.pivot.rotation.y = Math.max(-0.9, Math.min(0.9, detail.pivot.rotation.y));
          const vis = 2 * Math.tan(THREE.MathUtils.degToRad(detail.camera.fov / 2)) * detail.camera.position.z;
          const ud = detail.splat.userData;
          detail.pivot.scale.setScalar(0.88 * Math.min(vis / ud.h, (vis * detail.camera.aspect) / ud.w));
        } else {
          if (!drag) { velY += ((reduce ? 0 : 0.008) - velY) * 0.04; detail.pivot.rotation.y += velY; }
        }
        detail.pivot.rotation.x += (rotX - detail.pivot.rotation.x) * 0.15;
        detailR.render(detail.scene, detail.camera);
      }
    }
  }
  canvas.classList.add('is-ready');
  loop();
}

loadMenu().then((m) => {
  menu = m;
  const hash = location.hash.slice(1);
  const cat = m.categories.some((c) => c.id === hash) ? hash : 'tout';
  renderFiltres(cat);
  render(cat);
  // La 3D démarre à la première interaction ; en attendant, les photos sont affichées.
  const EVENTS = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll'];
  let started = false;
  const kick = () => {
    if (started) return;
    started = true;
    EVENTS.forEach((ev) => removeEventListener(ev, kick));
    start3D().catch((e) => console.warn('3D indisponible, photos affichées :', e));
  };
  EVENTS.forEach((ev) => addEventListener(ev, kick, { passive: true }));
  if (new URLSearchParams(location.search).has('3d')) kick(); // captures d'écran / démo
}).catch((e) => {
  root.innerHTML = `<p class="menu-error wrap">Le menu n'a pas pu être chargé. Vérifiez que le fichier data/menu.json est présent et bien formé, puis rechargez la page.</p>`;
  console.error(e);
});
