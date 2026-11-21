"""Génère les 4 pages HTML avec un en-tête et un pied de page communs.
Usage : python tools/build.py  (depuis le dossier du site)"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

LOGO_SYMBOL = """<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="logo-baobab" viewBox="0 0 120 120">
<circle cx="60" cy="60" r="57" fill="none" stroke="#F77F00" stroke-width="4"/>
<g stroke="#F77F00" stroke-linecap="round" fill="none" stroke-width="5"><path d="M52 50C46 40 36 36 24 36"/><path d="M55 48C52 37 46 29 40 22"/><path d="M60 48V20"/><path d="M65 48C68 37 74 29 80 22"/><path d="M68 50C74 40 84 36 96 36"/></g>
<g fill="#F77F00"><ellipse cx="23" cy="33" rx="11" ry="6"/><ellipse cx="39" cy="20" rx="10" ry="6"/><ellipse cx="60" cy="16" rx="11" ry="6"/><ellipse cx="81" cy="20" rx="10" ry="6"/><ellipse cx="97" cy="33" rx="11" ry="6"/>
<path d="M36 100C38 86 36 74 44 62C48 56 50 52 50 46H70C70 52 72 56 76 62C84 74 82 86 84 100Z"/><rect x="22" y="99" width="76" height="4" rx="2"/></g></symbol></svg>"""

IMPORTMAP = """<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>"""

PAGES = [("index.html", "Accueil"), ("menu.html", "Menu"), ("a-propos.html", "À propos"), ("contact.html", "Contact")]


def head(title, desc, three=False):
    fonts = "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#000000">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="assets/img/garba.webp">
<link rel="icon" href="assets/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="{fonts}" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="{fonts}"></noscript>
<link rel="stylesheet" href="css/style.css?v=5">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>
{IMPORTMAP if three else ''}
</head>"""


def header(active):
    links = "".join(
        f'<a href="{href}"{" aria-current=\"page\"" if href == active else ""}>{name}</a>' for href, name in PAGES
    )
    return f"""<body>
{LOGO_SYMBOL}
<a class="skip" href="#contenu">Aller au contenu</a>
<div class="progression" aria-hidden="true"></div>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html">
      <svg viewBox="0 0 120 120" aria-hidden="true"><use href="#logo-baobab"/></svg>
      <span class="brand-name">Baobab<small>Maquis ivoirien à Cocody</small></span>
    </a>
    <button class="burger" type="button" aria-expanded="false" aria-controls="nav" aria-label="Ouvrir le menu"><span></span><span></span><span></span></button>
    <nav id="nav" class="nav" aria-label="Navigation principale">
      {links}
      <a class="btn btn-plein" href="contact.html#reservation">Réserver</a>
    </nav>
  </div>
</header>"""


FOOTER = """<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="brand" href="index.html"><svg viewBox="0 0 120 120" aria-hidden="true"><use href="#logo-baobab"/></svg><span class="brand-name">Baobab</span></a>
        <p style="margin-top:1rem;max-width:32ch;color:var(--sable)">Le vrai goût d'Abidjan, servi à l'ombre du Baobab depuis 2014.</p>
      </div>
      <div>
        <h2>Le site</h2>
        <ul><li><a href="index.html">Accueil</a></li><li><a href="menu.html">Menu</a></li><li><a href="a-propos.html">À propos</a></li><li><a href="contact.html">Contact et réservation</a></li></ul>
      </div>
      <div>
        <h2>Nous trouver</h2>
        <ul><li>Rue des Jardins</li><li>Cocody Deux-Plateaux, Abidjan</li><li><a href="tel:+2250700000000">+225 07 00 00 00 00</a></li><li><a href="contact.html#horaires">Horaires d'ouverture</a></li></ul>
      </div>
      <div>
        <h2>Suivez-nous</h2>
        <ul><li><a href="https://www.facebook.com/" target="_blank" rel="noopener">Facebook</a></li><li><a href="https://www.instagram.com/" target="_blank" rel="noopener">Instagram</a></li><li><a data-wa="Bonjour Le Baobab !" href="https://wa.me/2250700000000" target="_blank" rel="noopener">WhatsApp</a></li></ul>
      </div>
    </div>
    <svg class="footer-big" viewBox="0 0 1000 230" aria-hidden="true" focusable="false"><text x="0" y="215" textLength="1000" lengthAdjust="spacingAndGlyphs" font-size="290">BAOBAB</text></svg>
    <p class="footer-legal">© <span data-year>2026</span> Le Baobab, Abidjan. Prix en FCFA, service compris.</p>
  </div>
</footer>
<script type="module" src="js/main.js"></script>
<script type="module" src="js/motion.js"></script>"""


def page(fname, title, desc, body, scripts="", three=False):
    html = f"""{head(title, desc, three)}
{header(fname)}
{body}
{FOOTER}
{scripts}
</body>
</html>
"""
    (ROOT / fname).write_text(html, encoding="utf-8")


# ---------------- ACCUEIL ----------------
page("index.html", "Le Baobab | Restaurant ivoirien à Cocody, Abidjan",
     "Garba, alloco, foutou et poisson braisé à Cocody. Découvrez le menu en 3D et réservez votre table au Baobab.",
     """<canvas class="stage3d" role="img" aria-label="Plat du Baobab en 3D, il pivote avec la souris et le défilement"></canvas>
<main id="contenu">
  <section class="hero" aria-labelledby="hero-titre">
    <div class="hero-bg" aria-hidden="true">
      <img src="assets/img/sm/attieke-poisson-braise.webp" alt="" width="736" height="635" fetchpriority="low">
      <img src="assets/img/sm/riz-gras-poisson.webp" alt="" width="676" height="1200" fetchpriority="low">
      <img src="assets/img/sm/foutou-igname-gombo.webp" alt="" width="735" height="828" fetchpriority="low">
    </div>
    <div class="hero-glow" aria-hidden="true"></div>
    <svg class="hero-mark" viewBox="0 0 120 120" aria-hidden="true"><use href="#logo-baobab"/></svg>
    <div class="hero-scene"><img class="hero-poster" src="assets/img/garba-3d.webp" srcset="assets/img/garba-3d-sm.webp 237w, assets/img/garba-3d.webp 436w" sizes="(max-width: 859px) 17svh, 39vh" alt="Garba du Baobab : attiéké, thon frit, piment, tomate et oignon" width="436" height="700" fetchpriority="high"></div>
    <h1 id="hero-titre" class="hero-title"><span>On mange bien</span><span class="l2">au Baobab</span></h1>
    <div class="hero-foot wrap">
      <p class="hero-slogan">Le vrai goût d'Abidjan, servi à l'ombre du Baobab. Garba, alloco, foutou et poisson braisé, à Cocody.</p>
      <div class="hero-ctas">
        <a class="btn btn-plein" href="contact.html#reservation">Réserver une table</a>
        <a class="btn btn-ligne" href="menu.html">Voir le menu</a>
      </div>
    </div>
  </section>

  <section class="phares" aria-labelledby="phares-titre">
    <div class="phares-bg" aria-hidden="true"><img class="is-on" alt="" src="assets/img/garba.webp" srcset="assets/img/sm/garba.webp 420w, assets/img/garba.webp 900w" sizes="100vw" fetchpriority="low" decoding="async"><img alt=""></div>
    <div class="phares-pin">
      <div class="wrap">
        <h2 id="phares-titre" class="sr-only">Nos plats phares</h2>
        <div class="phare-scene" aria-hidden="true"></div>
        <p class="phare-nom" id="phare-nom" aria-live="polite">Garba</p>
        <dl class="phare-details">
          <div><dt>Dans l'assiette</dt><dd id="phare-desc">Attiéké, thon frit, piment frais, tomate et oignon.</dd></div>
          <div><dt>Piment</dt><dd id="phare-piment">Bien relevé</dd></div>
          <div><dt>Où le goûter</dt><dd>Sur place, à emporter ou livré à Cocody</dd></div>
        </dl>
        <p class="phare-prix" id="phare-prix">1 500 FCFA</p>
        <a class="btn btn-noir" href="menu.html">Toute la carte</a>
      </div>
      <div class="phare-thumbs" role="group" aria-label="Choisir un plat phare"></div>
      <p class="phare-compteur" aria-hidden="true"><b id="phare-num">1</b> / <span id="phare-total">3</span></p>
    </div>
  </section>

  <div class="bandeau" aria-hidden="true">
    <div class="bandeau-ligne">
      <span>Garba</span><svg viewBox="0 0 120 120"><use href="#logo-baobab"/></svg><span>Alloco</span><svg viewBox="0 0 120 120"><use href="#logo-baobab"/></svg>
      <span>Attiéké</span><svg viewBox="0 0 120 120"><use href="#logo-baobab"/></svg><span>Foutou</span><svg viewBox="0 0 120 120"><use href="#logo-baobab"/></svg>
      <span>Choukouya</span><svg viewBox="0 0 120 120"><use href="#logo-baobab"/></svg><span>Bissap</span><svg viewBox="0 0 120 120"><use href="#logo-baobab"/></svg>
      <span>Gbofloto</span><svg viewBox="0 0 120 120"><use href="#logo-baobab"/></svg><span>Riz gras</span>
    </div>
  </div>

  <section class="section avis" aria-labelledby="avis-titre">
    <div class="wrap">
      <h2 id="avis-titre" class="section-title">Ils ont goûté</h2>
      <div class="avis-grid">
        <blockquote><p>« Le garba le plus propre de Cocody. Le thon est croustillant, l'attiéké bien chaud. Je viens chaque vendredi. »</p><cite>Koffi A., Riviera 3</cite></blockquote>
        <blockquote><p>« On a fêté l'anniversaire de ma mère sur la terrasse. Foutou sauce graine comme au village, service au top. »</p><cite>Mariam D., Deux-Plateaux</cite></blockquote>
        <blockquote><p>« Commandé sur WhatsApp, livré en 40 minutes, encore chaud. Le bissap maison vaut le détour à lui seul. »</p><cite>Jean-Marc K., Plateau</cite></blockquote>
      </div>
    </div>
  </section>

  <section class="section faq" aria-labelledby="faq-titre">
    <div class="wrap">
      <h2 id="faq-titre" class="section-title">Vos questions</h2>
      <div class="faq-list">
        <details><summary>Quels sont vos horaires ?</summary><p>Du lundi au jeudi de 11h à 23h, le vendredi et le samedi de 11h à 1h du matin, le dimanche de 12h à 22h.</p></details>
        <details><summary>Faut-il réserver ?</summary><p>Conseillé le vendredi soir et le week-end. Réservez en ligne en une minute, nous confirmons par téléphone.</p></details>
        <details><summary>Livrez-vous à domicile ?</summary><p>Oui, à Cocody, Riviera, Deux-Plateaux et Plateau. Frais de livraison : 1 000 FCFA, environ 45 minutes. Commande sur WhatsApp.</p></details>
        <details><summary>Comment payer ?</summary><p>Espèces, carte bancaire, Wave, Orange Money, MTN MoMo et Moov Money.</p></details>
        <details><summary>Accueillez-vous les groupes ?</summary><p>Jusqu'à 60 personnes, terrasse privatisable pour vos anniversaires et repas d'entreprise.</p></details>
      </div>
    </div>
  </section>

  <section class="section cta-band" aria-labelledby="cta-titre">
    <div class="wrap">
      <h2 id="cta-titre">Une table vous attend ce soir</h2>
      <a class="btn btn-noir" href="contact.html#reservation">Réserver une table</a>
    </div>
  </section>
</main>""", scripts='<script type="module" src="js/home.js"></script>', three=True)

# ---------------- MENU ----------------
page("menu.html", "Menu | Le Baobab, restaurant ivoirien à Cocody",
     "Entrées, plats ivoiriens et boissons en 3D avec les prix en FCFA : garba, alloco, foutou, riz gras, attiéké poisson braisé.",
     """<canvas class="stage3d" aria-hidden="true"></canvas>
<main id="contenu">
  <header class="page-head wrap">
    <h1>Le menu</h1>
    <p>Chaque plat tourne sous vos yeux. Ouvrez une fiche pour le faire pivoter du bout du doigt. Prix en FCFA, service compris.</p>
  </header>
  <nav class="filtres" aria-label="Filtrer par catégorie"><div class="wrap" id="filtres"></div></nav>
  <div id="menu-root" aria-live="polite"><p class="menu-error wrap">Chargement du menu…</p></div>
</main>

<div class="fiche" id="fiche" role="dialog" aria-modal="true" aria-labelledby="fiche-titre">
  <div class="fiche-fond"></div>
  <div class="fiche-boite">
    <button class="fiche-fermer" type="button" aria-label="Fermer la fiche">×</button>
    <div class="fiche-vue"><p class="astuce">Glissez pour le faire pivoter</p></div>
    <div class="fiche-texte">
      <h2 id="fiche-titre">Plat</h2>
      <p class="plat-prix fiche-prix"></p>
      <p class="fiche-desc"></p>
      <div class="tags fiche-tags"></div>
      <img class="fiche-photo" alt="" width="480" height="300" hidden>
      <div class="hero-ctas">
        <a class="btn btn-plein" href="contact.html#reservation">Réserver une table</a>
        <a class="btn btn-ligne fiche-wa" href="#" target="_blank" rel="noopener">Commander sur WhatsApp</a>
      </div>
    </div>
  </div>
</div>""", scripts='<script type="module" src="js/menu.js"></script>', three=True)

# ---------------- À PROPOS ----------------
gal = [("garba", "Le garba du vendredi"), ("attieke-poisson-braise", "Carpe braisée"), ("alloco-oeufs", "Alloco œufs"),
       ("riz-gras-poisson", "Riz gras au poisson"), ("foutou-igname-gombo", "Sauce gombo fruits de mer"), ("foutou-banane-sauce-graine", "Foutou sauce graine")]
galerie = "\n".join(
    f'<figure><img src="assets/img/{f}.webp" alt="{c}" loading="lazy" decoding="async" width="600" height="600"><figcaption>{c}</figcaption></figure>' for f, c in gal)
page("a-propos.html", "À propos | Le Baobab, maquis ivoirien à Cocody",
     "L'histoire du Baobab, l'équipe en cuisine et en salle, et la galerie de nos plats ivoiriens.",
     f"""<main id="contenu">
  <header class="page-head wrap">
    <h1>À propos</h1>
    <p>Un maquis de six tables devenu la terrasse la plus gourmande des Deux-Plateaux.</p>
  </header>

  <section class="section" aria-labelledby="histoire-titre" style="padding-top:2rem">
    <div class="wrap">
      <h2 id="histoire-titre" class="sr-only">Notre histoire</h2>
      <div class="histoire">
        <p class="lead">Tout a commencé sous un baobab, avec une marmite de sauce graine et six tables en plastique.</p>
        <div>
          <p>En 2014, <strong>Mama Adjoua</strong> ouvre un petit maquis au pied du grand baobab de la rue des Jardins. Le midi, les employés du quartier viennent pour son garba ; le soir, les familles restent pour le poisson braisé.</p>
          <p>Dix ans plus tard, l'arbre est toujours là et la recette n'a pas changé : <strong>des produits du marché de Cocody achetés le matin</strong>, l'attiéké de Dabou, le poisson de Grand-Bassam et le piment pilé à la main.</p>
          <p>Le Baobab, c'est la cuisine des maisons d'Abidjan, servie avec le temps qu'il faut et le sourire en plus.</p>
        </div>
      </div>
      <ol class="frise" aria-label="Les grandes dates du Baobab">
        <li><b>2014</b><span>Ouverture du maquis, six tables sous le baobab.</span></li>
        <li><b>2017</b><span>La terrasse s'agrandit : 60 couverts.</span></li>
        <li><b>2021</b><span>Lancement de la livraison sur WhatsApp.</span></li>
        <li><b>2026</b><span>Le menu passe en 3D sur ce site.</span></li>
      </ol>
    </div>
  </section>

  <section class="section" aria-labelledby="equipe-titre" style="background:var(--charbon)">
    <div class="wrap">
      <h2 id="equipe-titre" class="section-title">L'équipe</h2>
      <div class="equipe">
        <article class="membre"><div class="avatar" aria-hidden="true">AK</div><h3>Adjoua Koffi</h3><p class="role">Fondatrice et cheffe</p><p>Trente ans de sauce graine derrière elle. Elle goûte chaque marmite avant le service.</p></article>
        <article class="membre"><div class="avatar" aria-hidden="true">SK</div><h3>Serge Kouassi</h3><p class="role">Maître de la braise</p><p>Poissons, choukouya et poulets braisés : c'est lui qui tient le feu, tous les soirs.</p></article>
        <article class="membre"><div class="avatar" aria-hidden="true">AT</div><h3>Aïcha Traoré</h3><p class="role">Responsable de salle</p><p>Elle connaît le prénom des habitués et place les anniversaires sur la terrasse.</p></article>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="galerie-titre">
    <div class="wrap">
      <h2 id="galerie-titre" class="section-title">En images</h2>
      <div class="galerie">
{galerie}
      </div>
    </div>
  </section>

  <section class="section cta-band" aria-labelledby="cta-titre">
    <div class="wrap">
      <h2 id="cta-titre">Venez goûter l'histoire</h2>
      <a class="btn btn-noir" href="contact.html#reservation">Réserver une table</a>
    </div>
  </section>
</main>""")

# ---------------- CONTACT ----------------
page("contact.html", "Contact et réservation | Le Baobab, Cocody",
     "Réservez votre table au Baobab, consultez nos horaires, notre adresse à Cocody Deux-Plateaux et écrivez-nous sur WhatsApp.",
     """<main id="contenu">
  <header class="page-head wrap">
    <h1>Contact</h1>
    <p>Réservez en une minute, nous vous rappelons pour confirmer.</p>
  </header>

  <div class="wrap">
    <div class="contact-grid">
      <section class="carte-form" id="reservation" aria-labelledby="resa-titre">
        <h2 id="resa-titre">Réserver une table</h2>
        <p>Les champs marqués d'une étoile sont obligatoires.</p>
        <form id="form-resa" novalidate>
          <div class="champs">
            <div class="champ">
              <label for="nom">Nom *</label>
              <input id="nom" name="nom" autocomplete="name" required aria-describedby="err-nom">
              <span class="erreur" id="err-nom"></span>
            </div>
            <div class="champ">
              <label for="telephone">Téléphone *</label>
              <input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" placeholder="07 12 34 56 78" required aria-describedby="err-telephone">
              <span class="erreur" id="err-telephone"></span>
            </div>
            <div class="champ">
              <label for="date">Date *</label>
              <input id="date" name="date" type="date" required aria-describedby="err-date">
              <span class="erreur" id="err-date"></span>
            </div>
            <div class="champ">
              <label for="heure">Heure *</label>
              <select id="heure" name="heure" required aria-describedby="err-heure"><option value="">Choisir une heure</option></select>
              <span class="erreur" id="err-heure"></span>
            </div>
            <div class="champ">
              <label for="personnes">Nombre de personnes *</label>
              <input id="personnes" name="personnes" type="number" min="1" max="20" inputmode="numeric" value="2" required aria-describedby="err-personnes">
              <span class="erreur" id="err-personnes"></span>
            </div>
            <div class="champ">
              <label for="occasion">Occasion</label>
              <select id="occasion" name="occasion"><option>Repas</option><option>Anniversaire</option><option>Repas d'affaires</option><option>En amoureux</option></select>
            </div>
            <div class="champ full">
              <label for="message">Précisions</label>
              <textarea id="message" name="message" maxlength="500" placeholder="Terrasse, chaise haute, allergie…"></textarea>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-plein" type="submit">Envoyer la réservation</button>
            <a class="btn btn-wa" data-wa="Bonjour Le Baobab, je voudrais réserver une table." href="https://wa.me/2250700000000" target="_blank" rel="noopener">Réserver sur WhatsApp</a>
          </div>
          <div class="form-statut" id="form-statut" role="status" aria-live="polite"></div>
        </form>
      </section>

      <aside class="infos" aria-label="Informations pratiques">
        <section class="bloc" id="horaires" aria-labelledby="h-titre">
          <h2 id="h-titre">Horaires</h2>
          <table class="horaires"><caption class="sr-only">Horaires d'ouverture</caption><tbody id="horaires-body"></tbody></table>
        </section>
        <section class="bloc" aria-labelledby="a-titre">
          <h2 id="a-titre">Adresse</h2>
          <p>Rue des Jardins, Cocody Deux-Plateaux<br>Abidjan, Côte d'Ivoire<br>Parking gardé gratuit devant le restaurant.</p>
        </section>
        <section class="bloc" aria-labelledby="c-titre">
          <h2 id="c-titre">Nous joindre</h2>
          <p><a href="tel:+2250700000000">+225 07 00 00 00 00</a><br><a href="mailto:reservation@lebaobab.ci">reservation@lebaobab.ci</a></p>
          <a class="btn btn-wa" data-wa="Bonjour Le Baobab !" href="https://wa.me/2250700000000" target="_blank" rel="noopener">Écrire sur WhatsApp</a>
        </section>
        <section class="bloc" aria-labelledby="p-titre">
          <h2 id="p-titre">Paiement</h2>
          <p>Espèces, carte bancaire, Wave, Orange Money, MTN MoMo et Moov Money.</p>
        </section>
      </aside>
    </div>

    <div class="carte-map" id="plan">
      <iframe title="Plan d'accès au restaurant Le Baobab, Cocody Deux-Plateaux" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
        src="https://www.google.com/maps?q=Cocody%20Deux-Plateaux%2C%20Abidjan&amp;z=15&amp;output=embed"></iframe>
    </div>
  </div>
  <div style="height:clamp(4rem,8vw,6rem)"></div>
</main>""", scripts='<script type="module" src="js/contact.js"></script>')

print("4 pages générées")
