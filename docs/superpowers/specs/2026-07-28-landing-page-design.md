# Landing page — The Hub

**Date :** 2026-07-28
**Statut :** Design validé, prêt pour le plan d'implémentation

## Objectif

Remplacer l'accueil actuel (`src/app/page.tsx`, un dashboard résultats + tournois)
par une véritable **landing page** qui présente The Hub et incite à rejoindre.

- **Audience :** mix joueurs + équipes.
- **Emplacement :** la landing devient l'accueil `/` **pour tout le monde**
  (connecté ou non). Le dashboard actuel est **supprimé**.
- **Direction retenue :** « Hub vivant » — hero épuré puis des sections de
  données réelles habillées en landing, puis un bloc « rejoindre » et une CTA finale.
- **DA :** identique au reste du site (fond sombre, accent orange `--accent`,
  vert lime pour le CTA Discord existant, mono tabulaire `.stat`, cartes `card`).

## Structure de la page (de haut en bas)

### 1. Hero (épuré)

- Bloc centré, fond sombre avec un léger halo orange
  (`radial-gradient` discret, cohérent avec les zones existantes).
- Contenu :
  - Eyebrow : `T3 Valorant · France` (classe `eyebrow` + `dot-sep`).
  - Titre `<h1>` : **The Hub**.
  - Tagline : « La maison du Valorant Tier 3 francophone. Tournois, équipes, stats — au même endroit. »
  - **CTA auth-aware** :
    - Déconnecté : bouton principal **Connexion Discord** (déclenche `signIn("discord")`).
    - Connecté : bouton principal **Mon profil** (lien vers `/joueurs/<id>` du joueur
      lié à l'utilisateur, sinon `/profil`).
    - Bouton secondaire (toujours) : **Explorer les tournois** → `/tournois`.
- **Pas de barre de stats** dans le hero (choix validé).

### 2. Tournois en cours / à venir

- Titre de section (style existant : `text-sm font-semibold uppercase … text-[var(--accent)]`).
- Grille de `TournamentCard` — `listTournaments()` filtré `status !== "FINISHED"`,
  limité à ~6.
- État vide : message « Aucun tournoi programmé pour le moment. »

### 3. Derniers résultats

- Liste de `MatchRow` — `listRecentResults(6)`.
- État vide : message discret.

### 4. Joueurs à suivre

- Grille de cartes joueur **compactes** (nouveau composant léger) : photo, pseudo,
  drapeau, équipe actuelle (tag), et **rating moyen** en avant.
- Données : nouvelle fonction `listTopPlayers(limit)` — top joueurs par **rating
  moyen** sur leurs `PlayerGameStat`, avec un **seuil minimum de parties**
  (par défaut ≥ 3 cartes) pour éviter qu'un joueur à 1 map monopolise le
  classement ; repli sur tous les joueurs si moins de `limit` qualifiés.
  `limit` par défaut = 6. Chaque carte lie vers `/joueurs/<id>`.
- État vide : masquer la section si aucun joueur qualifié.

### 5. Rejoindre

- 3 cartes statiques présentant la valeur, sans données :
  - **Joueur** — crée ton profil, suis tes stats et ta carrière.
  - **Équipe** — référence ton équipe, gère ton roster, suis tes résultats.
  - **Compétition** — inscris-toi aux tournois, brackets et scoreboards.

### 6. CTA finale

- Bande centrée « Prêt à jouer ? » + bouton **Connexion Discord** (ou, si déjà
  connecté, un lien « Explorer les tournois » — on ne montre pas Discord à un
  utilisateur déjà connecté).

### 7. Footer

- Le footer existant reste (rendu par le layout).

## Découpage technique

### Fichier remplacé

- `src/app/page.tsx` : réécrit entièrement en landing (server component async).
  Récupère en parallèle : tournois actifs, derniers résultats, top joueurs,
  session utilisateur (pour le CTA).

### Réutilisé (inchangé)

- `TournamentCard`, `MatchRow`, `Flag`, footer/nav (layout), tokens DA globaux,
  `auth()` / `signIn` (déjà utilisés dans `/profil`).

### Nouveau

- **Data** : `listTopPlayers(limit)` dans `src/lib/data/players.ts`
  (agrégation rating moyen par joueur + seuil de parties + jointure équipe actuelle).
- **Composant** : `src/components/player-mini-card.tsx` — carte joueur compacte
  (photo, pseudo, drapeau, tag équipe, rating).
- **Composants de section** de la landing : soit inline dans `page.tsx`, soit de
  petits composants dédiés (`landing-hero`, `landing-cta`, `landing-feature`)
  si `page.tsx` dépasse ~200 lignes. À trancher au moment de l'implémentation
  selon la taille ; garder des fichiers focalisés (< 200-400 lignes).

### Auth

- Un seul appel `auth()` en haut de `page.tsx`. Détermine :
  - `isLoggedIn` → variante des CTA.
  - `profileHref` → `/joueurs/<playerId>` si un joueur est lié, sinon `/profil`
    (réutilise `getPlayerByUserId`).

## États & erreurs

- Chaque section de données gère son **état vide** proprement (message ou section masquée).
- Aucune donnée sensible exposée. La page est publique (SSR, pas de secret).
- Le CTA Discord réutilise le flux `signIn` existant (server action `"use server"`),
  identique à `/profil`.

## Hors périmètre (YAGNI)

- Pas de barre de stats agrégées dans le hero.
- Pas de section « top équipes ».
- Pas d'animations complexes / carrousel — transitions sobres cohérentes avec le site.
- Pas de i18n (site déjà en français).

## Critères de réussite

- `/` affiche la landing pour un visiteur connecté **et** déconnecté ; l'ancien
  dashboard n'existe plus.
- Le CTA principal s'adapte à l'état de connexion.
- Les 3 blocs de données (tournois, résultats, joueurs à suivre) affichent des
  données réelles issues de la base, avec états vides gérés.
- `tsc` passe ; la page rend en 200 ; DA cohérente avec le reste du site.
