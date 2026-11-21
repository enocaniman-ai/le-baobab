/* Réglages du site : c'est le seul fichier à modifier pour brancher les services. */
export const CONFIG = {
  // Identifiant Formspree (https://formspree.io) : la partie après /f/ dans l'URL du formulaire.
  // Laisser vide tant que le compte n'est pas créé : les réservations passent alors par WhatsApp.
  formspreeId: '',

  // Numéro WhatsApp fictif, format international sans + ni espaces.
  whatsapp: '2250700000000',
  telephone: '+225 07 00 00 00 00',
  email: 'reservation@lebaobab.ci',
  adresse: 'Rue des Jardins, Cocody Deux-Plateaux, Abidjan',

  // 0 = dimanche ... 6 = samedi. Fermeture après minuit : "01:00".
  horaires: {
    0: ['12:00', '22:00'],
    1: ['11:00', '23:00'],
    2: ['11:00', '23:00'],
    3: ['11:00', '23:00'],
    4: ['11:00', '23:00'],
    5: ['11:00', '01:00'],
    6: ['11:00', '01:00'],
  },
  livraison: { frais: 1000, delai: '45 min', zones: 'Cocody, Riviera, Deux-Plateaux et Plateau' },
};

export const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export const fcfa = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

export async function loadMenu() {
  const res = await fetch('data/menu.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('menu.json introuvable (' + res.status + ')');
  return res.json();
}
