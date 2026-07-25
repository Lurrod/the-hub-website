# Design — Profil, invitations d'équipe & refonte des accès

> Date : 2026-07-25 · Projet : the-hub-website (T3 Valorant hub, Next.js App Router + Prisma + PostgreSQL)

## Objectif

Trois évolutions liées, autour du compte utilisateur :

1. **Profil utilisateur** — chaque user connecté possède une fiche joueur éditable.
2. **Invitations d'équipe par lien temporaire** — un manager génère un lien ; un joueur le suit, se connecte (ou crée un compte), et rejoint le roster. S'il est déjà dans une équipe, on lui demande d'en partir d'abord.
3. **Refonte des accès** — `/admin` réservé aux admins ; les managers d'équipe/tournoi accèdent à leurs outils depuis la page de leur entité (Approche A).

## Contexte existant (état actuel)

- **`User`** : compte Auth.js (Discord), `globalRole` ∈ {ADMIN, USER}, `discordId`. Rôle relu en base à chaque hydratation de session.
- **`Player`** : fiche roster (pseudo, realName, nationality, photo, socials) — **aucun lien avec `User`**.
- **`TeamMembership`** : lie Team ↔ **Player**, avec `role` (`MembershipRole`), `joinDate`, `leaveDate` (null = adhésion active). Fournit l'historique des rosters.
- **`TeamManager`** / **`TournamentManager`** : lient une entité ↔ **User**.
- Permissions : helpers purs dans `src/lib/permissions.ts` (`isAdmin`, `canManageTeam`, `canManageTournament`) ; gardes async dans `src/lib/server-auth.ts` (`requireAdmin`, `assertCanManageTeam`, `assertCanManageTournament`). `assertCanManage*` renvoient déjà `true` pour un admin.
- Toute la gestion vit sous `/admin/*`, qui redirige les non-admins vers `/`. Conséquence : un manager non-admin ne peut aujourd'hui atteindre aucun outil.

---

## 1. Modèle de données (migrations Prisma)

### 1.1 Lien User ↔ Player

- `Player` : ajout `userId String? @unique` + relation vers `User`.
- `User` : back-relation `player Player?`.
- Nullable & unique : un user possède **au plus une** fiche Player ; l'admin garde ses fiches roster sans compte (rosters historiques, seed VCT EMEA).

### 1.2 Lien d'invitation (champs sur `Team`)

- `Team` : ajout `inviteToken String? @unique` + `inviteExpiresAt DateTime?`.
- Un seul lien réutilisable par équipe. Régénérer = nouveau token + nouvelle expiration ; révoquer = les deux à `null`.
- *(Alternative écartée par YAGNI : un modèle `TeamInvite` dédié pour l'audit multi-liens.)*

### 1.3 Rôle d'adhésion : STARTER → JOUEUR

- Enum `MembershipRole` : **renommer `STARTER` en `JOUEUR`**. Rôles finaux : `JOUEUR`, `SUB`, `COACH`, `MANAGER`. Défaut du champ `role` = `JOUEUR`.
- **Migration en place** (préserve les données) : SQL manuel
  `ALTER TYPE "MembershipRole" RENAME VALUE 'STARTER' TO 'JOUEUR';`
  puis ajuster le `DEFAULT` de la colonne. Ne pas laisser Prisma drop/recreate l'enum.
- Renommage à propager dans le code actif : `prisma/schema.prisma`, `prisma/seed-dev.ts`, `src/lib/validation/player.ts` (`MEMBERSHIP_ROLES`, défaut Zod), `src/app/admin/actions/players.ts`, la page roster, les tests `tests/unit/validation-player.test.ts`, et les libellés d'affichage « Titulaire » → « Joueur » dans `src/app/joueurs/[id]/page.tsx` et `src/app/equipes/[id]/page.tsx`.

### 1.4 Invariant « une équipe active »

- « Être dans une équipe » = avoir une `TeamMembership` avec `leaveDate = null`.
- Un Player lié à un user a **au plus une** adhésion active. Vérifié côté serveur avant tout `join`.

---

## 2. Profil utilisateur (`/profil`)

### 2.1 Auto-création de la fiche Player

- À la première connexion Discord, créer une fiche `Player` liée au user : `pseudo` = nom/global_name Discord, `photo` = avatar Discord.
- Implémentation dans l'event `linkAccount` de `src/lib/auth.ts` (déjà utilisé pour poser `discordId`/rôle admin), plus un *ensure* paresseux `ensurePlayerForUser(userId)` pour les comptes déjà existants (appelé au chargement de `/profil` et du flux d'invitation).

### 2.2 Page `/profil` (connecté obligatoire)

- Édition : `pseudo`, `realName`, `nationality`, `photo`, `socials` (validation Zod existante réutilisée).
- Affiche l'équipe actuelle (adhésion active) avec bouton **« Quitter l'équipe »**.
- Lien vers la fiche publique `/joueurs/[playerId]`.
- Actions serveur (nouvelles) : `updateMyProfile`, `leaveMyTeam` (pose `leaveDate = now` sur l'adhésion active du Player de l'utilisateur courant).

---

## 3. Invitation d'équipe

### 3.1 Génération (outils manager)

- Depuis `/equipes/[id]/gestion`, section Invitation :
  - `generateInviteLink(teamId)` : token aléatoire cryptographique, `inviteExpiresAt = now + 7 jours`.
  - `revokeInviteLink(teamId)` : token + expiry à `null`.
- Affiche l'URL complète `/rejoindre/[token]` à copier (partage Discord).
- Gardé par `assertCanManageTeam`.

### 3.2 Page d'acceptation `/rejoindre/[token]` (publique)

Résolution de l'équipe par token, puis :

1. Token introuvable **ou** `inviteExpiresAt` dépassé → écran « Lien invalide ou expiré ».
2. **Non connecté** → aperçu de l'équipe + bouton **« Se connecter avec Discord pour rejoindre »** (`signIn("discord")` avec `callbackUrl` = cette URL). *(Correspond à « créer un compte avant » : Discord OAuth crée le compte + la fiche Player.)*
3. **Connecté, déjà dans cette équipe** → « Tu fais déjà partie de cette équipe » + lien vers la page équipe.
4. **Connecté, dans une autre équipe** → **« Tu dois d'abord quitter [Équipe X] »** + lien vers `/profil`. Rejoint bloqué.
5. **Connecté, sans équipe active** → bouton **« Rejoindre [Équipe] »** → `joinTeamViaInvite(token)`.

### 3.3 Action `joinTeamViaInvite(token)`

- Revalide **côté serveur** : token existant, non expiré, utilisateur connecté, Player du user sans adhésion active (jamais de confiance au client).
- Crée une `TeamMembership` : `playerId` = Player du user, `teamId` = équipe du token, `role = JOUEUR`. Le manager ajuste le rôle ensuite.
- Redirige vers la page de l'équipe.

---

## 4. Refonte des accès (Approche A)

### 4.1 Nouvelles routes de gestion (rattachées à l'entité)

- **`/equipes/[id]/gestion`** — gardé par `assertCanManageTeam`. Sections :
  - Identité (édition nom, tag, logo, région, description, réseaux).
  - Roster (ajout via lien d'invitation, retrait de membres, changement de rôle).
  - Invitation (générer / régénérer / révoquer / copier le lien).
  - Managers (nommer / retirer des managers).
  - Zone danger (supprimer l'équipe).
- **`/tournois/[id]/gestion`** — gardé par `assertCanManageTournament`. Sections :
  - Identité (nom, logo, bannière, région, dates, format, prizepool, description).
  - Compétition (matchs, poules, brackets, scores).
  - Inscrits (ajout/retrait d'équipes, seeds, affectation aux poules).
  - Managers (nommer / retirer).
  - Zone danger (supprimer le tournoi).

Délégation **complète** aux managers (roster/identité/lien/managers/suppression côté équipe ; compétition/inscrits/identité/managers/suppression côté tournoi). L'admin conserve tout en override via `assertCanManage*`.

### 4.2 Migration des routes `/admin/*` existantes

- La logique de `/admin/equipes/[id]/*` et `/admin/tournois/[id]/*` **est déplacée** (pas dupliquée) vers les routes `gestion`.
- Les actions dans `src/app/admin/actions/*` passent de `requireAdmin` → `assertCanManageTeam`/`assertCanManageTournament` pour : roster, identité, invitation, matchs, poules, inscrits, managers, suppression d'entité.
- Restent `requireAdmin` (global, non délégué) : **créer** une équipe, **créer** un tournoi.
- Les anciennes sous-routes de gestion sous `/admin/equipes|tournois/[id]/*` redirigent vers `/equipes|tournois/[id]/gestion`.

### 4.3 `/admin` réservé aux admins

- `/admin` ne garde que le global : dashboard (admin-only), création équipe/tournoi, listes globales (équipes, tournois, joueurs), répertoire joueurs.
- Chaque carte d'entité pointe vers le `/gestion` de l'entité (l'admin gère via la même UI que les managers).

### 4.4 Points d'entrée & navigation

- Pages publiques `/equipes/[id]` et `/tournois/[id]` : bouton **« Gérer »** affiché si `canManage` (vérif serveur), lien vers `/gestion`.
- NavBar : lien **« Profil »** si connecté ; lien **« Admin »** toujours réservé aux admins (comportement actuel conservé).

### 4.5 Garde-fou gouvernance

- Impossible de retirer le **dernier** manager d'une équipe/tournoi (évite l'orphelinage), quel que soit l'acteur. L'admin garde l'override global via `assertCanManage*`.

---

## 5. Visibilité du répertoire `/joueurs`

- `/joueurs` et la recherche ne listent que les Players ayant **≥ 1 adhésion** (actuelle ou passée).
- Les profils sans aucune adhésion (visiteurs auto-créés) restent privés, accessibles uniquement via `/profil`. → évite la pollution du répertoire par l'auto-création.

---

## 6. Découpage en unités

| Unité | Rôle | Dépend de |
|---|---|---|
| Migration schéma (1.1–1.3) | userId, invite token, rename enum | — |
| `ensurePlayerForUser` + auto-création login | garantir une fiche Player par user | 1.1 |
| Page `/profil` + actions | éditer profil, quitter équipe | ensure |
| Invitation (génération + `/rejoindre` + `joinTeamViaInvite`) | flux d'invitation complet | 1.2, ensure, invariant 1.4 |
| Routes `gestion` équipe/tournoi + migration actions | refonte des accès | server-auth existant |
| `/admin` allégé + boutons « Gérer » + NavBar | points d'entrée & cloisonnement | routes gestion |
| Filtre visibilité `/joueurs` | annuaire propre | data/players, data/search |

Chaque unité a une frontière claire (entrée = action/route, sortie = état DB + redirection), testable isolément.

---

## 7. Gestion des erreurs

- Toutes les écritures passent par une garde (`requireAdmin` / `assertCanManage*`) qui lève `FORBIDDEN` ; les pages traduisent en redirection/`403`.
- Flux d'invitation : messages utilisateur explicites pour chaque cas (token invalide/expiré, non connecté, déjà en équipe ici/ailleurs).
- Toute action serveur revalide ses entrées (Zod + invariants) sans faire confiance au client.

---

## 8. Tests

- **Unitaires** : helpers permissions (existants) ; validation du token (présence + expiration) ; règle « une adhésion active » ; `MEMBERSHIP_ROLES` = {JOUEUR, SUB, COACH, MANAGER}.
- **Intégration** : `joinTeamViaInvite` (sans équipe / déjà en équipe / token expiré) ; `generate`/`revoke` ; `updateMyProfile` ; `leaveMyTeam` ; garde-fou « dernier manager » ; filtre de visibilité `/joueurs`.
- **E2E (Playwright)** : manager génère un lien → joueur se connecte → rejoint ; joueur déjà en équipe voit le blocage « quitter d'abord ».

---

## 9. Hors périmètre (YAGNI)

- « Claim » d'une fiche Player existante sans compte (validation admin) — non retenu (auto-création choisie).
- Modèle `TeamInvite` d'audit multi-liens — champs sur `Team` suffisent.
- État « demande en attente / validation manager » à l'arrivée — rejoint direct choisi.
