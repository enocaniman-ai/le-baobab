/* Page Contact : horaires, formulaire de réservation (validation + Formspree), carte. */
import { CONFIG, JOURS } from './config.js';

/* ---------- Horaires ---------- */
const tbody = document.getElementById('horaires-body');
const fmt = (s) => s.replace(':00', 'h').replace(':', 'h');
const today = new Date().getDay();
[1, 2, 3, 4, 5, 6, 0].forEach((d) => {
  const [o, c] = CONFIG.horaires[d];
  const tr = document.createElement('tr');
  if (d === today) tr.className = 'today';
  tr.innerHTML = `<td>${JOURS[d]}${d === today ? ' (aujourd\'hui)' : ''}</td><td>${fmt(o)} – ${fmt(c)}</td>`;
  tbody.append(tr);
});

/* ---------- Formulaire ---------- */
const form = document.getElementById('form-resa');
const statut = document.getElementById('form-statut');
const f = (n) => form.elements[n];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const minDate = new Date(), maxDate = new Date();
maxDate.setMonth(maxDate.getMonth() + 3);
f('date').min = iso(minDate);
f('date').max = iso(maxDate);

const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
function fillHeures() {
  const sel = f('heure'), keep = sel.value;
  const d = f('date').value ? new Date(f('date').value + 'T12:00').getDay() : 5;
  const [o, c] = CONFIG.horaires[d];
  let end = toMin(c); if (end <= toMin(o)) end += 1440;
  sel.innerHTML = '<option value="">Choisir une heure</option>';
  for (let m = toMin(o); m <= end - 60; m += 30) {
    const v = `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    sel.add(new Option(fmt(v), v));
  }
  if ([...sel.options].some((op) => op.value === keep)) sel.value = keep;
}
fillHeures();
f('date').addEventListener('change', fillHeures);

const rules = {
  nom: (v) => (v.trim().length < 2 ? 'Indiquez votre nom (2 lettres minimum).' : ''),
  telephone: (v) => {
    const n = v.replace(/[\s.-]/g, '').replace(/^(\+225|00225)/, '');
    return /^(01|05|07|21|25|27)\d{8}$/.test(n) ? '' : 'Numéro ivoirien à 10 chiffres, par exemple 07 12 34 56 78.';
  },
  date: (v) => {
    if (!v) return 'Choisissez la date de votre venue.';
    if (v < f('date').min) return 'Cette date est déjà passée.';
    if (v > f('date').max) return 'Les réservations sont ouvertes sur 3 mois.';
    return '';
  },
  heure: (v) => (v ? '' : 'Choisissez une heure d\'arrivée.'),
  personnes: (v) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) return 'Indiquez le nombre de personnes.';
    if (n > 20) return 'Au-delà de 20 personnes, écrivez-nous sur WhatsApp pour un devis groupe.';
    return '';
  },
};

function check(name) {
  const el = f(name), msg = rules[name](el.value);
  el.setAttribute('aria-invalid', String(Boolean(msg)));
  document.getElementById('err-' + name).textContent = msg;
  return !msg;
}
Object.keys(rules).forEach((n) => {
  f(n).addEventListener('blur', () => f(n).value && check(n));
  f(n).addEventListener('input', () => f(n).getAttribute('aria-invalid') === 'true' && check(n));
});

function resume(data) {
  const d = new Date(data.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${data.personnes} personne${data.personnes > 1 ? 's' : ''}, ${d} à ${fmt(data.heure)}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statut.className = 'form-statut';
  const bad = Object.keys(rules).filter((n) => !check(n));
  if (bad.length) { f(bad[0]).focus(); return; }
  const data = Object.fromEntries(new FormData(form));
  const btn = form.querySelector('[type="submit"]');

  if (!CONFIG.formspreeId) {
    // Pas encore de compte Formspree : on bascule la demande sur WhatsApp.
    const txt = `Bonjour Le Baobab, je souhaite réserver une table.\nNom : ${data.nom}\nTéléphone : ${data.telephone}\n${resume(data)}${data.message ? '\nPrécisions : ' + data.message : ''}`;
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
    statut.className = 'form-statut ok';
    statut.textContent = `Votre demande (${resume(data)}) est prête dans WhatsApp : envoyez le message pour la confirmer.`;
    return;
  }

  btn.disabled = true; btn.textContent = 'Envoi en cours…';
  try {
    const res = await fetch(`https://formspree.io/f/${CONFIG.formspreeId}`, {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, _subject: `Réservation : ${data.nom}, ${resume(data)}` }),
    });
    if (!res.ok) throw new Error(res.status);
    statut.className = 'form-statut ok';
    statut.textContent = `Réservation envoyée : ${resume(data)}. Nous vous confirmons par téléphone dans l'heure.`;
    form.reset(); fillHeures();
    try { sessionStorage.removeItem('baobab-resa'); } catch (_) { /* rien */ }
  } catch (err) {
    statut.className = 'form-statut ko';
    statut.innerHTML = `L'envoi n'a pas abouti. Réessayez, ou réservez directement sur <a href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>.`;
  } finally {
    btn.disabled = false; btn.textContent = 'Envoyer la réservation';
  }
});

/* ---------- Pré-remplissage depuis le chatbot ---------- */
function prefill() {
  let r = {};
  try { r = JSON.parse(sessionStorage.getItem('baobab-resa') || '{}'); } catch (_) { /* rien */ }
  if (r.date) { f('date').value = r.date; fillHeures(); }
  if (r.heure) { fillHeures(); if ([...f('heure').options].some((o) => o.value === r.heure)) f('heure').value = r.heure; }
  if (r.personnes) f('personnes').value = r.personnes;
  if (Object.keys(r).length) {
    statut.className = 'form-statut ok';
    statut.textContent = 'L\'assistant a rempli ce qu\'il a compris. Ajoutez votre nom et votre téléphone.';
  }
  document.getElementById('reservation').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => f('nom').focus({ preventScroll: true }), 500);
}
window.addEventListener('baobab:prefill', prefill);
if (location.hash === '#reservation') {
  try { if (sessionStorage.getItem('baobab-resa')) prefill(); } catch (_) { /* rien */ }
}

