# Audit qualité — Le Baobab

Date : 21 novembre 2026. Outil : Lighthouse 13.6 (profil mobile, processeur ralenti ×4, réseau 4G simulé), Chrome headless, site servi en local.

## Scores finaux

| Page | Performance | Accessibilité | Bonnes pratiques | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Accueil | **99** | 100 | 100 | 100 | 2,3 s | 30 ms | 0 |
| Menu | **99** | 100 | 100 | 100 | 0,9 s | 0 ms | 0,07 |
| À propos | **98** | 100 | 96* | 100 | 0,9 s | 20 ms | 0,002 |
| Contact | **99** | 100 | 100 | 100 | 0,9 s | 0 ms | 0,061 |

Mesures refaites après l'ajout de GSAP ScrollTrigger, du rendu 3D en relief et des photos de fond plus visibles.

Objectif du cahier des charges (performance ≥ 90) : atteint sur les 4 pages.

\* 96 en bonnes pratiques : erreurs réseau du petit serveur de test local (connexion réinitialisée), pas du site. 

| Après passage aux splats | Mesure | Correction |
|---|---|---|
| Photos améliorées plus lourdes (jusqu'à 280 Ko), LCP accueil 4,4 s, perf. 85 | | Versions 900 px et 420 px (`assets/img/sm/`), affiche du héros en 2 tailles (`srcset`) : LCP 2,7 s, perf. 95 |
| Décalage du menu à 0,107 | | Hauteur réservée pour la barre de filtres : CLS 0 |

## Ce que le premier audit a révélé, et les corrections

| Problème | Mesure avant | Correction | Après |
|---|---|---|---|
| La 3D bloquait le chargement (Three.js + construction des modèles) | Perf. 70 (accueil), 51 (menu), TBT 4,4 s | Affiche statique du garba (`garba-3d.webp`) et photos sur le menu ; la 3D démarre à la première interaction ; construction découpée sur plusieurs images ; shaders compilés en asynchrone | Perf. 100 et 97, TBT 0 ms |
| Décalage de mise en page sur le menu (contenu injecté depuis le JSON) | CLS 0,41 | Hauteur minimale réservée pour la zone du menu | CLS 0,083 |
| Bouton du chatbot sans nom accessible sur téléphone (texte masqué) | Accessibilité 89–91 | `aria-label` reprenant le texte visible | 100 |
| Nom accessible du logo différent du texte affiché | idem | `aria-label` retiré, le texte visible sert de nom | 100 |
| Grand « BAOBAB » décoratif du pied de page signalé en contraste faible | idem | Converti en SVG décoratif (`aria-hidden`) | 100 |

## Vérifications manuelles

- **Responsive** : téléphone (375 px), tablette (768 px), ordinateur (1366 et 1440 px). Aucun défilement horizontal. Menu hamburger avec fermeture par Échap.
- **Clavier** : lien d'évitement « Aller au contenu », focus visible orange partout, fiche plat en fenêtre modale avec focus piégé et retour au bouton d'origine, chatbot fermé par Échap.
- **Mouvement réduit** : `prefers-reduced-motion` coupe les rotations automatiques et les transitions.
- **Formulaire** : erreurs annoncées sous chaque champ (`aria-invalid`, `aria-describedby`), focus placé sur le premier champ en erreur, numéro ivoirien à 10 chiffres vérifié, dates passées refusées, heures limitées aux horaires du jour choisi.
- **Chatbot** : 15 questions types testées, 15 réponses justes (horaires, prix d'un plat, livraison, adresse, paiement, boissons, végétarien, groupes, parking, Wi-Fi, piment, téléphone, réservation avec extraction « 4 personnes, samedi, 20h », etc.).
- **JSON** : la page Menu, les plats phares de l'accueil et les prix du chatbot se mettent à jour en modifiant `data/menu.json`.

## Recommandations avant la mise en ligne

1. **Renseigner `formspreeId`** dans `js/config.js` et envoyer une réservation de test (critère d'acceptation e-mail).
2. **Remplacer le numéro WhatsApp fictif** et l'adresse si nécessaire, dans `js/config.js` et `tools/build.py`.
3. **Hébergeur avec cache et compression** (GitHub Pages, Netlify) : Lighthouse signale l'absence de cache et de minification, normale avec le serveur de test local.
4. **Photos** : les images de boissons montrent des marques déposées ; les remplacer par des photos prises au restaurant si possible.
5. Relancer l'audit sur l'URL publique : `npx lighthouse https://votre-url --view`.
