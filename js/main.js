/* Le Baobab — commun à toutes les pages : navigation + chatbot. */
import { CONFIG, JOURS, fcfa, loadMenu } from './config.js';

/* ---------- Navigation ---------- */
const header = document.querySelector('.site-header');
const burger = document.querySelector('.burger');
const nav = document.getElementById('nav');
if (burger && nav) {
  const setOpen = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); burger.focus(); } });
}
const onScroll = () => header && header.classList.toggle('is-solid', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

document.querySelectorAll('[data-wa]').forEach((a) => {
  a.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(a.dataset.wa || 'Bonjour Le Baobab !')}`;
});
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

/* ---------- Horaires utilitaires ---------- */
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export function isOpen(date = new Date()) {
  const now = date.getHours() * 60 + date.getMinutes();
  const [o, c] = CONFIG.horaires[date.getDay()];
  const close = toMin(c) <= toMin(o) ? toMin(c) + 1440 : toMin(c);
  if (now >= toMin(o) && now < close) return true;
  const prev = CONFIG.horaires[(date.getDay() + 6) % 7];
  return toMin(prev[1]) <= toMin(prev[0]) && now < toMin(prev[1]);
}
const fmtH = (s) => s.replace(':00', 'h').replace(':', 'h');

/* ---------- Chatbot (détection de mots-clés, sans API) ---------- */
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9/:' ]/g, ' ').replace(/\s+/g, ' ').trim();

let menuData = null;
const getMenu = async () => menuData || (menuData = await loadMenu().catch(() => null));

const RESA_KEY = 'baobab-resa';
function parseResa(text) {
  const t = norm(text), out = {};
  const p = t.match(/(\d{1,2})\s*(personnes?|pers|couverts?|places?|adultes?)/) || t.match(/pour\s+(\d{1,2})\b(?!\s*h)/);
  if (p) out.personnes = Math.min(20, Number(p[1]));
  const d = new Date(); let found = false;
  if (/apres demain/.test(t)) { d.setDate(d.getDate() + 2); found = true; }
  else if (/demain/.test(t)) { d.setDate(d.getDate() + 1); found = true; }
  else if (/aujourd|ce soir|ce midi|tout a l'heure/.test(t)) found = true;
  else {
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const j = jours.findIndex((n) => t.includes(n));
    if (j >= 0) { d.setDate(d.getDate() + ((j - d.getDay() + 7) % 7 || 7)); found = true; }
    const dm = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
    if (dm) { d.setMonth(Number(dm[2]) - 1, Number(dm[1])); if (d < new Date()) d.setFullYear(d.getFullYear() + 1); found = true; }
  }
  if (found) out.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const h = t.match(/\b(\d{1,2})\s*h\s*(\d{2})?\b/);
  if (h) out.heure = `${String(Math.min(23, Number(h[1]))).padStart(2, '0')}:${Number(h[2] || 0) >= 30 ? '30' : '00'}`;
  else if (/ce midi|midi/.test(t)) out.heure = '12:30';
  else if (/ce soir|soir/.test(t)) out.heure = '20:00';
  return out;
}

const horairesTexte = () => {
  const h = CONFIG.horaires;
  return `Lundi au jeudi : ${fmtH(h[1][0])} – ${fmtH(h[1][1])}\nVendredi et samedi : ${fmtH(h[5][0])} – ${fmtH(h[5][1])}\nDimanche : ${fmtH(h[0][0])} – ${fmtH(h[0][1])}`;
};

const INTENTS = [
  { id: 'salut', keys: ['bonjour', 'salut', 'bonsoir', 'hello', 'coucou', 'on dit quoi', 'cc', 'hey', 'yo'],
    reply: () => 'Bonjour et bienvenue au Baobab ! Je réponds sur les horaires, le menu, les prix, l\'adresse et la livraison. Je peux aussi préparer votre réservation.' },
  { id: 'horaires', keys: ['horaire', 'heure d', 'ouvert', 'ouvre', 'ouverture', 'ferme', 'fermeture', 'quand', 'dimanche', 'lundi', 'jusqu'],
    reply: () => `${isOpen() ? 'Nous sommes ouverts en ce moment.' : 'Nous sommes fermés en ce moment.'}\n\n${horairesTexte()}` },
  { id: 'adresse', keys: ['adresse', 'ou etes', 'ou se trouve', 'situe', 'localisation', 'itineraire', 'venir', 'trouver', 'quartier', 'ou vous', 'google map', 'plan'],
    reply: () => `Nous sommes ${CONFIG.adresse}, à 5 minutes du carrefour Duncan. Le plan est sur la page <a href="contact.html#plan">Contact</a>.` },
  { id: 'menu', keys: ['menu', 'carte', 'plats', 'manger', 'proposez', 'qu est ce que vous', 'nourriture', 'entree', 'specialite', 'conseil', 'recommand'],
    reply: async () => {
      const m = await getMenu();
      if (!m) return 'Toute la carte est sur la page <a href="menu.html">Menu</a>.';
      const phares = m.articles.filter((a) => a.phare).map((a) => `${a.nom} (${fcfa(a.prix)})`).join(', ');
      return `Au menu : entrées, plats ivoiriens et boissons. Nos plats phares : ${phares}.\nToute la carte en 3D sur la page <a href="menu.html">Menu</a>.`;
    } },
  { id: 'prix', keys: ['prix', 'combien', 'cout', 'tarif', 'fcfa', 'cher', 'budget', 'moins cher'],
    reply: async () => {
      const m = await getMenu();
      if (!m) return 'Nos plats vont de 1 500 à 7 500 FCFA, les boissons de 500 à 2 000 FCFA.';
      const p = m.articles.filter((a) => a.categorie !== 'boissons').map((a) => a.prix), b = m.articles.filter((a) => a.categorie === 'boissons').map((a) => a.prix);
      return `Les entrées et plats vont de ${fcfa(Math.min(...p))} à ${fcfa(Math.max(...p))}, les boissons de ${fcfa(Math.min(...b))} à ${fcfa(Math.max(...b))}.\nDemandez-moi le prix d'un plat précis, par exemple « prix du garba ».`;
    } },
  { id: 'livraison', keys: ['livr', 'domicile', 'emporter', 'a emporter', 'commande', 'commander', 'yango', 'glovo', 'chez moi'],
    reply: () => `Oui, nous livrons à ${CONFIG.livraison.zones}. Frais : ${fcfa(CONFIG.livraison.frais)}, comptez environ ${CONFIG.livraison.delai}.\nCommandez sur <a href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>. Les plats à emporter sont prêts en 20 minutes.` },
  { id: 'resa', keys: ['reserv', 'table', 'place', 'personnes', 'couverts', 'venir a', 'diner', 'dejeuner'],
    reply: (text) => {
      const r = parseResa(text);
      const bits = [];
      if (r.personnes) bits.push(`${r.personnes} personne${r.personnes > 1 ? 's' : ''}`);
      if (r.date) bits.push(new Date(r.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
      if (r.heure) bits.push('à ' + fmtH(r.heure));
      pendingResa = r;
      return bits.length
        ? `C'est noté : ${bits.join(', ')}. Je prépare le formulaire, il restera votre nom et votre téléphone.`
        : 'Avec plaisir. Dites-moi par exemple « table pour 4 samedi à 20h », ou ouvrez directement le formulaire.';
    }, resa: true },
  { id: 'paiement', keys: ['payer', 'paiement', 'wave', 'orange money', 'momo', 'mtn', 'moov', 'carte bancaire', 'espece', 'cash', 'visa'],
    reply: () => 'Vous pouvez payer en espèces, par carte bancaire, Wave, Orange Money, MTN MoMo et Moov Money.' },
  { id: 'boissons', keys: ['boisson', 'boire', 'jus', 'biere', 'alcool', 'bissap', 'gingembre', 'soda', 'vin'],
    reply: async () => {
      const m = await getMenu();
      const list = m ? m.articles.filter((a) => a.categorie === 'boissons').map((a) => `${a.nom} ${fcfa(a.prix)}`).join('\n') : '';
      return `Côté boissons :\n${list}\nLes jus de bissap et d'orange sont faits maison chaque matin.`;
    } },
  { id: 'vege', keys: ['vegetarien', 'vegan', 'sans viande', 'sans poisson', 'legume', 'allergi', 'gluten'],
    reply: () => 'Option sans viande ni poisson : alloco œufs, gbofloto, et l\'attiéké servi avec crudités et sauce. Signalez vos allergies au serveur, la cuisine adapte.' },
  { id: 'groupe', keys: ['groupe', 'evenement', 'anniversaire', 'privatis', 'mariage', 'entreprise', 'seminaire', 'bapteme', 'fete'],
    reply: () => 'Nous accueillons les groupes jusqu\'à 60 personnes et privatisons la terrasse pour vos anniversaires et repas d\'entreprise. Écrivez-nous sur WhatsApp pour un devis.' },
  { id: 'parking', keys: ['parking', 'garer', 'voiture', 'stationn'],
    reply: () => 'Oui, un parking gardé gratuit de 20 places est juste devant le restaurant.' },
  { id: 'wifi', keys: ['wifi', 'wi fi', 'internet', 'connexion'],
    reply: () => 'Le Wi-Fi est gratuit, le code est affiché à l\'entrée.' },
  { id: 'contact', keys: ['telephone', 'appeler', 'numero', 'whatsapp', 'joindre', 'contact', 'email', 'mail'],
    reply: () => `Téléphone : ${CONFIG.telephone}\nWhatsApp : <a href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener">écrire au Baobab</a>\nE-mail : ${CONFIG.email}` },
  { id: 'piment', keys: ['epice', 'piment', 'pimente', 'fort', 'brule'],
    reply: () => 'Le piment est servi à part sur demande, sauf pour le garba où il fait partie de la recette. Dites « sans piment » à la commande.' },
  { id: 'enfants', keys: ['enfant', 'bebe', 'chaise haute', 'famille', 'gosse'],
    reply: () => 'Les familles sont les bienvenues : chaises hautes disponibles et demi-portions pour les enfants à moitié prix.' },
  { id: 'merci', keys: ['merci', 'au revoir', 'bye', 'bonne journee', 'bonne soiree', 'ok merci', 'a plus'],
    reply: () => 'Avec plaisir ! À très vite à l\'ombre du Baobab.' },
];

let pendingResa = null;

async function answer(text) {
  const t = norm(text);
  const m = await getMenu();
  // Recherche d'un article précis (« prix du garba », « c'est quoi le gbofloto »)
  if (m) {
    const item = m.articles.find((a) => {
      const full = norm(a.nom).split(' ');
      const words = full.filter((w) => w.length > 3 && !['sauce', 'poisson', 'oeufs', 'banane', 'igname', 'orange', 'energy', 'minerale', 'presse'].includes(w));
      return words.some((w) => new RegExp(`(^|\\s)${w}`).test(t)) || t.includes(full.slice(0, 2).join(' '));
    });
    const asksResa = INTENTS.find((i) => i.id === 'resa').keys.some((k) => t.includes(k));
    if (item && !asksResa) {
      return { text: `${item.nom} : ${fcfa(item.prix)}.\n${item.description}`, chips: ['Voir le menu', 'Réserver une table'] };
    }
  }
  let best = null, score = 0;
  for (const intent of INTENTS) {
    const s = intent.keys.reduce((n, k) => n + (new RegExp(`(^|\\s)${k}`).test(t) ? k.length : 0), 0);
    if (s > score) { score = s; best = intent; }
  }
  if (!best) {
    return { text: 'Je n\'ai pas bien compris. Je peux vous renseigner sur :', chips: ['Horaires', 'Menu', 'Prix', 'Adresse', 'Livraison', 'Réserver une table'] };
  }
  const reply = await best.reply(text);
  const chips = best.resa ? ['Réserver une table'] : best.id === 'salut' ? ['Horaires', 'Menu', 'Livraison', 'Réserver une table'] : ['Réserver une table'];
  return { text: reply, chips };
}

function goReserve() {
  try { sessionStorage.setItem(RESA_KEY, JSON.stringify(pendingResa || {})); } catch (_) { /* stockage indisponible */ }
  if (document.getElementById('reservation')) {
    window.dispatchEvent(new CustomEvent('baobab:prefill'));
    closeChat();
  } else {
    location.href = 'contact.html#reservation';
  }
}

const LOGO = '<svg viewBox="0 0 120 120" aria-hidden="true"><use href="#logo-baobab"/></svg>';
const root = document.createElement('div');
root.innerHTML = `
  <button class="chat-toggle" type="button" aria-expanded="false" aria-controls="chat-panel" aria-label="Une question ? Discuter avec l’assistant">
    <span class="bulle">${LOGO}</span><span class="chat-label">Une question ?</span>
  </button>
  <section class="chat-panel" id="chat-panel" aria-label="Assistant du Baobab">
    <div class="chat-head">${LOGO}<div><b>Assistant Baobab</b><span>Répond tout de suite, 7j/7</span></div></div>
    <div class="chat-log" role="log" aria-live="polite"></div>
    <form class="chat-form">
      <label class="sr-only" for="chat-input">Votre question</label>
      <input id="chat-input" autocomplete="off" placeholder="Ex. : vous livrez à Riviera ?" maxlength="200">
      <button type="submit" aria-label="Envoyer">↑</button>
    </form>
  </section>`;
document.body.append(root);
const toggle = root.querySelector('.chat-toggle'), panel = root.querySelector('.chat-panel');
const log = root.querySelector('.chat-log'), form = root.querySelector('.chat-form'), input = root.querySelector('#chat-input');

function addMsg(html, who = 'bot') {
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  if (who === 'user') d.textContent = html; else d.innerHTML = html;
  log.append(d); log.scrollTop = log.scrollHeight;
}
function addChips(list) {
  const c = document.createElement('div'); c.className = 'chips';
  list.forEach((label) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    if (label === 'Réserver une table') b.className = 'resa';
    b.addEventListener('click', () => {
      if (label === 'Réserver une table') return goReserve();
      if (label === 'Voir le menu') { location.href = 'menu.html'; return; }
      ask(label);
    });
    c.append(b);
  });
  log.append(c); log.scrollTop = log.scrollHeight;
}
async function ask(text) {
  addMsg(text, 'user');
  const r = await answer(text);
  setTimeout(() => { addMsg(r.text); if (r.chips) addChips(r.chips); }, 250);
}
let started = false;
function openChat() {
  panel.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true');
  if (!started) {
    started = true;
    addMsg('Bonjour ! Je suis l\'assistant du Baobab. Posez votre question ou choisissez :');
    addChips(['Horaires', 'Menu', 'Adresse', 'Livraison', 'Réserver une table']);
  }
  input.focus();
}
function closeChat() { panel.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
toggle.addEventListener('click', () => (panel.classList.contains('is-open') ? closeChat() : openChat()));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('is-open')) { closeChat(); toggle.focus(); } });
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = input.value.trim();
  if (!v) return;
  input.value = '';
  ask(v);
});

export { JOURS };
