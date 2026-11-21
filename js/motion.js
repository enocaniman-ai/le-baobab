/* Le Baobab — animations au défilement avec GSAP + ScrollTrigger.
   Tout le contenu est visible sans JavaScript : les animations partent
   d'un état caché uniquement quand GSAP est chargé, et sont coupées si
   l'utilisateur demande moins de mouvement. */

const ready = () => new Promise((ok) => {
  if (window.gsap && window.ScrollTrigger) return ok();
  addEventListener('load', ok, { once: true });
});

/* Découpe un titre court en lettres (les lecteurs d'écran lisent le texte entier). */
function split(el) {
  if (!el || el.dataset.split) return [];
  el.dataset.split = '1';
  const chars = [];
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((word) => {
          if (!word) return;
          if (/^\s+$/.test(word)) { frag.append(word); return; }
          const w = document.createElement('span'); w.className = 'split-mot'; w.setAttribute('aria-hidden', 'true');
          [...word].forEach((c) => { const s = document.createElement('span'); s.className = 'split-car'; s.textContent = c; w.append(s); chars.push(s); });
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  const label = el.textContent.replace(/\s+/g, ' ').trim();
  walk(el);
  const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = label;
  el.prepend(sr);
  return chars;
}

ready().then(() => {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();

  // Barre de progression : utile même en mouvement réduit (ce n'est pas une animation décorative)
  gsap.to('.progression', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    /* ----- Titres de page : lettres qui montent ----- */
    document.querySelectorAll('.hero-title span, .page-head h1').forEach((el, k) => {
      gsap.from(split(el), { yPercent: 115, rotate: 6, duration: 1, ease: 'expo.out', stagger: 0.025, delay: 0.1 + k * 0.12 });
    });
    gsap.from('.page-head p, .hero-foot > *', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.45 });

    /* ----- Titres de section : lettres au passage ----- */
    document.querySelectorAll('.section-title, .cta-band h2, .menu-cat h2').forEach((el) => {
      const chars = split(el);
      gsap.from(chars, {
        yPercent: 110, duration: 0.8, ease: 'expo.out', stagger: 0.02,
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
      });
    });

    /* ----- Accueil : héros qui s'ouvre au défilement ----- */
    const hero = document.querySelector('.hero');
    if (hero) {
      const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 } });
      tl.to('.hero-title span:first-child', { xPercent: -14, ease: 'none' }, 0)
        .to('.hero-title .l2', { xPercent: 14, ease: 'none' }, 0)
        .to('.hero-bg img', { yPercent: 12, scale: 1.12, ease: 'none', stagger: 0.04 }, 0)
        .to('.hero-foot', { y: -60, opacity: 0, ease: 'none' }, 0)
        .to('.hero-mark', { rotate: 90, opacity: 0, ease: 'none' }, 0);
    }

    /* ----- Plats phares : aimantation sur chaque plat + entrée du nom ----- */
    const phares = document.querySelector('.phares');
    if (phares) {
      const n = () => document.querySelectorAll('.phare-thumbs button').length || 3;
      ScrollTrigger.create({
        trigger: phares, start: 'top top', end: 'bottom bottom',
        snap: { snapTo: (v) => Math.min(1, (Math.floor(v * n()) + 0.5) / n()), duration: { min: 0.25, max: 0.7 }, delay: 0.12, ease: 'power2.inOut' },
      });
      gsap.from('.phares-bg img', { scale: 1.18, ease: 'none', scrollTrigger: { trigger: phares, start: 'top bottom', end: 'top top', scrub: 1 } });
      addEventListener('baobab:phare', () => {
        gsap.fromTo('#phare-nom', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out', delay: 0.28 });
        gsap.fromTo('.phare-details > div, .phare-prix', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.06, delay: 0.36 });
        gsap.fromTo('.phare-compteur b', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' });
      });
    }

    /* ----- Bandeau : glisse avec le défilement ----- */
    document.querySelectorAll('.bandeau-ligne').forEach((line) => {
      gsap.fromTo(line, { xPercent: 0 }, { xPercent: -38, ease: 'none', scrollTrigger: { trigger: line.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    });

    /* ----- Listes : apparition en cascade ----- */
    const cascade = (sel, opts = {}) => {
      if (!document.querySelector(sel)) return;
      ScrollTrigger.batch(sel, {
        start: 'top 90%',
        onEnter: (els) => gsap.fromTo(els, { y: opts.y ?? 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.09, overwrite: true }),
      });
      gsap.set(sel, { opacity: 0 });
    };
    cascade('.avis blockquote');
    cascade('.faq details', { y: 20 });
    cascade('.membre');
    cascade('.galerie figure', { y: 60 });
    cascade('.frise li', { y: 20 });
    cascade('.carte-form, .infos .bloc');

    /* ----- Menu : cartes en cascade, y compris après un changement de filtre ----- */
    const cards = () => {
      const els = [...document.querySelectorAll('.plat:not([data-vu])')];
      els.forEach((e) => { e.dataset.vu = '1'; });
      if (!els.length) return;
      gsap.set(els, { opacity: 0, y: 50 });
      ScrollTrigger.batch(els, {
        start: 'top 95%', once: true,
        onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.08 }),
      });
    };
    cards();
    addEventListener('baobab:menu-rendu', () => { cards(); ScrollTrigger.refresh(); });

    /* ----- Parallaxe douce ----- */
    gsap.utils.toArray('.galerie img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    if (document.querySelector('.frise')) {
      gsap.fromTo('.frise', { '--trait': 0 }, { '--trait': 1, ease: 'none', scrollTrigger: { trigger: '.frise', start: 'top 85%', end: 'top 45%', scrub: 0.5 } });
    }
    gsap.from('.cta-band .btn', { scale: 0.8, opacity: 0, duration: 0.7, ease: 'back.out(2)', scrollTrigger: { trigger: '.cta-band', start: 'top 75%' } });
    gsap.from('.footer-big', { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: 0.8 } });
  });

  // les images et polices changent les hauteurs : recalcul une fois tout chargé
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
});
