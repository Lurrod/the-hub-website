# The Hub — Plateforme de référencement T3 Valorant

**Date :** 2026-07-22
**Statut :** Spec validée — prête pour le plan d'implémentation

## 1. Objectif

Site de référencement des **équipes** et **tournois** du **Tier 3 Valorant** (le T1/T2 étant couvert par vlr.gg). L'objectif est de reproduire le **fonctionnel utile de vlr.gg** (annuaires, pages tournoi avec brackets/poules, historiques de rosters, profils joueurs) avec **l'esthétique de rft.gg** (dark mode modulaire), adaptée à l'univers Valorant.

**Contraintes fondatrices :**
- **Pas d'accès à l'API Riot** → pas de statistiques détaillées (K/D, ACS, agents). On reste sur des données structurelles (équipes, joueurs, rosters, tournois, matchs, scores).
- **Aucun lien** avec un quelconque bot Discord existant. Projet totalement indépendant.
- **Auto-hébergement** sur un serveur Kimsufi, PostgreSQL classique (pas de Supabase).

## 2. Périmètre

### Inclus (MVP)
- Authentification Discord + rôles (admin / manager tournoi / manager équipe).
- Équipes : CRUD admin, édition roster par le manager d'équipe, historique des rosters.
- Joueurs : pages profil publiques + historique d'équipes.
- Tournois : CRUD admin, édition par manager tournoi ; **poules avec classement auto-calculé** + **élimination directe (bracket saisi manuellement)**.
- Matchs : saisie score + vainqueur ; score map par map optionnel.
- Pages publiques : accueil, annuaires (tournois / équipes / joueurs), pages détail, recherche globale.
- Direction artistique rft.gg → Valorant.
- Déploiement Docker Compose sur le Kimsufi.

### Reporté (post-MVP — YAGNI)
- Soumissions communautaires / revendication de profil.
- Statistiques détaillées joueurs (nécessite API Riot).
- News / éditorial.
- Bracket **auto-généré** (progression automatique des gagnants) — le MVP reste sur saisie manuelle.
- Notifications, favoris, commentaires / forum.
- Application mobile.

## 3. Modèle de données

### Utilisateurs & rôles
- **User** (via Discord OAuth) : `discordId`, `username`, `avatar`, `globalRole` ∈ { `ADMIN`, `USER` }.
- **TeamManager** : lie un `User` → une `Team` (droit d'édition de cette équipe).
- **TournamentManager** : lie un `User` → un `Tournament` (droit d'édition de ce tournoi).

Les 2 admins initiaux sont définis en dur par leur `discordId` (variable d'environnement / seed). Un admin peut promouvoir d'autres admins par la suite.

### Équipes & joueurs
- **Team** : `name`, `tag`, `logo`, `region`, `description`, `socials` (JSON), `status` ∈ { `ACTIVE`, `INACTIVE` }, `createdBy`, timestamps.
- **Player** : `pseudo`, `realName` (optionnel), `nationality`, `photo`, `socials` (JSON), timestamps.
- **TeamMembership** : `playerId`, `teamId`, `role` ∈ { `STARTER`, `SUB`, `COACH`, `MANAGER` }, `joinDate`, `leaveDate` (null = actuel). Fournit l'**historique des rosters** (un joueur peut changer d'équipe dans le temps).

### Tournois & compétition
- **Tournament** : `name`, `logo`, `banner`, `region`, `startDate`, `endDate`, `format` ∈ { `GROUPS`, `SINGLE_ELIM`, `GROUPS_THEN_ELIM` }, `status` ∈ { `UPCOMING`, `ONGOING`, `FINISHED` }, `prizePool` (optionnel), `organizer`, `description`, `createdBy`.
- **TournamentParticipant** : `tournamentId`, `teamId`, `seed` (optionnel), `groupId` (optionnel).
- **Group** (poule) : `tournamentId`, `name`. Le classement est **dérivé** des matchs de la poule (non stocké — calculé à la lecture).
- **Match** : `tournamentId`, `teamAId`, `teamBId`, `scoreA`, `scoreB`, `winnerId`, `date`, `stage` ∈ { `GROUP`, `BRACKET` }, `round` (optionnel, ex. « Demi-finale »), `groupId` (optionnel), `bracketPosition` (optionnel), `bestOf` ∈ { 1, 3, 5 }, `status` ∈ { `SCHEDULED`, `LIVE`, `FINISHED` }.
- **MatchMap** *(optionnel)* : `matchId`, `mapName`, `scoreA`, `scoreB`. Score map par map saisi à la main (pas de stats joueurs).

### Journalisation
- **AuditLog** : `userId`, `action`, `entityType`, `entityId`, `payload` (JSON), `createdAt`. Chaque écriture est tracée (modération / rollback manuel).

### Calcul du classement de poule
Dérivé à la volée depuis les `Match` de statut `FINISHED` d'une poule : victoires/défaites, différence de maps, points. Fonction pure et testée unitairement.

## 4. Pages & navigation

### Pages publiques (lecture seule)
- **Accueil** : feed des derniers résultats + tournois en cours/à venir + équipes en avant.
- **Tournois** : liste filtrable (région, statut, date) → **page tournoi** (présentation, équipes inscrites, bracket / tableaux de poules, liste des matchs).
- **Page match** : détail (score, format, phase, score map par map si saisi).
- **Équipes** : annuaire filtrable (région) → **page équipe** (logo, roster actuel, historique, tournois joués, matchs).
- **Joueurs** : annuaire → **page profil joueur** (infos, équipe actuelle, historique complet, tournois joués, historique de matchs).
- **Recherche** globale (équipe / joueur / tournoi).

### Pages privées (selon rôle)
- **Dashboard admin** : créer tournois & équipes, nommer/révoquer les managers, modérer.
- **Dashboard manager de tournoi** : éditer *son* tournoi (poules, matchs, résultats, inscrits).
- **Dashboard manager d'équipe** : éditer *son* équipe (roster, infos).

### Navigation
Barre supérieure sombre : Accueil · Tournois · Équipes · Joueurs · Recherche · connexion Discord. Fil d'ariane sur les pages profondes.

## 5. Rôles & permissions

| Action | Admin | Manager tournoi | Manager équipe | Public |
|---|---|---|---|---|
| Se connecter (Discord) | ✅ | ✅ | ✅ | ✅ |
| Créer / supprimer un tournoi | ✅ | ❌ | ❌ | ❌ |
| Créer / supprimer une équipe | ✅ | ❌ | ❌ | ❌ |
| Nommer / révoquer les managers | ✅ | ❌ | ❌ | ❌ |
| Éditer **son** tournoi | ✅ | ✅ (le sien) | ❌ | ❌ |
| Éditer **son** équipe | ✅ | ❌ | ✅ (la sienne) | ❌ |
| Consulter le contenu public | ✅ | ✅ | ✅ | ✅ |

**Règles clés :**
- Autorisation vérifiée **côté serveur** à chaque écriture (jamais uniquement dans l'UI).
- Un manager n'édite **que** l'entité qu'on lui a confiée (vérification d'appartenance systématique).
- Admins initiaux définis en dur par `discordId`.
- Toute écriture est journalisée dans `AuditLog`.

## 6. Technique & déploiement

### Stack applicative
- **Next.js (App Router)** — rendu serveur des pages publiques (SEO), base de code unique public + dashboards.
- **Auth.js (NextAuth)** avec provider **Discord** — login/session, rôles chargés depuis la base.
- **Prisma** + **PostgreSQL** (instance classique sur le Kimsufi).
- **Tailwind CSS** pour la DA.
- **Upload d'images** (logos, bannières, photos) : stockées sur un volume disque, servies par Nginx ; validation type/taille + redimensionnement à l'upload.
- **Validation d'entrées** : schémas **Zod** à toutes les frontières serveur.

### Déploiement (Kimsufi)
- **Docker Compose** : `app` (Next.js), `db` (PostgreSQL), `nginx` (reverse proxy + TLS Let's Encrypt + service des images statiques).
- Volumes persistants : Postgres + uploads.
- Migrations via **Prisma Migrate**.
- Secrets (Discord client/secret, `NEXTAUTH_SECRET`, URL base) dans `.env` **hors dépôt git**.

### Qualité & tests
- Tests unitaires : calcul de classement de poule, logique de permissions.
- Tests d'intégration : routes API (CRUD + contrôle d'accès).
- Tests E2E : parcours critiques (login Discord, création tournoi, saisie match, édition roster).
- Objectif de couverture : 80 %+.

## 7. Direction artistique (rft.gg → Valorant)

**Base rft.gg (dark, modulaire, plat) :**
- Fonds : `#0F1114` / `#15181D` ; cards `#1B1F26` ; bordures `#262B33`.
- Texte : `#E8EAED` (principal) / `#8B929E` (secondaire).
- Grille de cards, coins légèrement arrondis, bordures fines, très peu de dégradés.
- Police sans-serif clean (Inter ou équivalent), hiérarchie nette, interface dense mais scannable.

**Accent Valorant :**
- Rouge Valorant `#FF4655` — accent principal (liens actifs, vainqueurs, CTA).
- Teal `#18E5C9` — accent secondaire (badges « en cours », stats).
- Accents ponctuels par couleur d'équipe (barres latérales, hover).

**Composants type :**
- Ligne de match compacte : logo A · score `2–1` · logo B, vainqueur en surbrillance rouge.
- Card équipe/joueur : logo/photo + tag + région.
- Badges de statut : « À VENIR » (gris) · « LIVE » (rouge pulsé) · « TERMINÉ » (neutre).
- Bracket sombre à connecteurs fins ; tableaux de poule en lignes zébrées discrètes.

Une maquette réelle (accueil + page tournoi) sera produite en début d'implémentation pour validation visuelle.

## 8. Risques & points ouverts
- **Redimensionnement d'images** : choisir la lib (ex. `sharp`) et les tailles cibles (logo, bannière, avatar).
- **Recherche** : commencer par une recherche SQL simple (`ILIKE` / index trigram) ; full-text Postgres si besoin plus tard.
- **Bracket manuel** : l'UI doit rester simple à saisir tout en produisant un rendu lisible — à prototyper tôt.
