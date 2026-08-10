# Spec — Phase A : Capture du Riot ID (fondation stats HenrikDev)

**Date :** 2026-07-26
**Statut :** Validé (design approuvé, prêt pour plan d'implémentation)
**Projet parent :** Scoreboards de match T3 via l'API HenrikDev (façon vlr.gg pour le Tier 3).

## Contexte

Objectif global : proposer des scoreboards/stats de match pour la scène T3 Valorant,
en récupérant les données des parties custom via l'API HenrikDev — comme vlr.gg le
fait pour le T1/T2. Pour appairer une partie custom aux joueurs du site, il faut
connaître le **Riot ID** de chaque joueur.

Le travail est découpé en 3 phases indépendantes et séquentielles :

- **Phase A (ce spec)** — Capture fiable du Riot ID de chaque joueur.
- **Phase B** — Client HenrikDev complet + appariement des 10 joueurs d'un match
  custom + modèle de scoreboard, déclenché à la validation d'un match.
- **Phase C** — Affichage du scoreboard sur la page match.

B dépend de A, C dépend de B. Ce spec ne couvre **que la Phase A**.

## État actuel du code (pertinent)

- **Auth** : Discord OAuth via NextAuth v5, `session: { strategy: "database" }`,
  `PrismaAdapter`. Un `Player` est auto-créé à la première liaison de compte
  (`events.linkAccount` → `ensurePlayerForUser`). `session.user` expose déjà
  `id` et `globalRole` (callback `session` qui lit la DB).
- **Player** (`prisma/schema.prisma`) : `pseudo`, `realName`, `nationality`,
  `photo`, `userId?`, `socials`, `memberships`. **Pas de champ Riot ID.**
- **Proxy** (`src/proxy.ts`, Next 16 « proxy », ex-middleware) : backstop qui
  vérifie la présence d'un cookie de session sur les routes `/…/gestion`.
  Pas d'accès DB (edge).
- **Adhésion self-service** : `/rejoindre/[token]` (lien d'invitation).
- **Ajout roster manuel** : formulaire manager (`…/gestion/roster`) + `player-form`
  (édition admin) — créent des `Player` éventuellement sans `userId`.
- **Toasts** : système de retours succès/échec via `?ok=`/`?error=` +
  `components/flash-toast.tsx` + `lib/flash-messages.ts`.
- **Validation** : Zod, schémas dans `src/lib/validation/*`.

## Décisions (validées)

1. **Blocage dur** à la création de compte : tant que le Riot ID n'est pas
   renseigné, l'utilisateur est envoyé sur une **route `/onboarding` dédiée**.
2. **Vérification via l'API HenrikDev** à la saisie (endpoint account) — on ne se
   contente pas du format. On stocke `puuid` + `region` renvoyés.
3. **Clé API disponible** → variable d'env `HENRIKDEV_API_KEY`.
4. **Unicité** : un compte Valorant = un seul `Player` (garde sur `puuid @unique`).
5. **Re-confirmation à l'adhésion** (lien d'invitation) : Riot ID **pré-rempli**,
   « Confirmer » ou « Modifier » (re-vérifié via API).
6. **Joueurs manuels** (roster sans compte) : champ Riot ID vérifié aussi dans les
   formulaires admin/manager.

## Design

### 1. Modèle de données (`Player`)

Nouveaux champs :

| Champ      | Type      | Notes                                                        |
| ---------- | --------- | ------------------------------------------------------------ |
| `riotName` | `String?` | Partie « Nom » du Riot ID (avant le `#`).                    |
| `riotTag`  | `String?` | Partie « Tag » (après le `#`).                               |
| `puuid`    | `String?` | **@unique**. Identifiant stable Riot, vraie garde d'unicité. |
| `region`   | `String?` | Région renvoyée par HenrikDev (`eu`, `na`, …).               |

- Affichage : `riotName#riotTag`.
- Unicité réelle portée par `puuid @unique`. Contrôle applicatif complémentaire :
  refuser un `riotName#riotTag` déjà pris (comparaison insensible à la casse) pour
  un message d'erreur clair avant même l'appel API si possible.
- Migration Prisma (ajout colonnes + index unique sur `puuid`). Champs nullables
  (joueurs existants / manuels non encore renseignés).

### 2. Client HenrikDev (`src/lib/henrikdev.ts`, server-only)

- `verifyRiotId(name: string, tag: string): Promise<RiotAccount>` où
  `RiotAccount = { puuid: string; region: string; name: string; tag: string }`.
- Appel : `GET https://api.henrikdev.xyz/valorant/v1/account/{name}/{tag}`
  avec header `Authorization: <HENRIKDEV_API_KEY>`.
- Timeout (AbortController, ~8 s). Mapping des réponses vers erreurs typées :
  - 404 → `RiotIdError("NOT_FOUND")`
  - 429 → `RiotIdError("RATE_LIMITED")`
  - clé absente/401/5xx/timeout → `RiotIdError("API_ERROR")`
- Aucune donnée sensible loggée côté client ; erreurs détaillées loggées serveur.
- `HENRIKDEV_API_KEY` ajouté à `.env.example` (valeur non commitée).

### 3. Validation (Zod) — `src/lib/validation/riot.ts`

- `parseRiotId(input: string): { name: string; tag: string }` : accepte
  `Nom#Tag`, trim, découpe sur le dernier `#`. Contraintes : `name` 3–16,
  `tag` 3–5, caractères autorisés Riot. Schéma Zod réutilisable.
- Utilisé par onboarding, adhésion, formulaires joueur.

### 4. Onboarding — blocage dur (route dédiée)

- **`src/proxy.ts`** : matcher élargi aux routes applicatives (hors `/onboarding`,
  `/api/*`, assets). Règle ajoutée : si cookie de session présent **et** pas de
  cookie `onboarded` **et** chemin ≠ `/onboarding` → `redirect('/onboarding')`.
  On conserve le backstop d'authentification existant sur `/…/gestion`.
- **`src/app/onboarding/page.tsx`** (serveur) :
  - non connecté → redirection signin.
  - `Player` a déjà un `puuid` → pose cookie `onboarded=1` et redirige `/`
    (auto-réparation si le cookie a été perdu).
  - sinon → rend `RiotIdForm` (client) avec explication.
- **Action `submitOnboardingRiotId`** (server action) :
  1. `parseRiotId` (sinon `?error=riotformat`).
  2. `verifyRiotId` (erreurs typées → `?error=riotnotfound|riotapi|ratelimited`).
  3. contrôle unicité `puuid` (sinon `?error=riottaken`).
  4. enregistre `riotName/riotTag/puuid/region` sur le `Player` du user.
  5. pose cookie `onboarded=1`, redirige `/?ok=riot-saved`.
- Le cookie `onboarded` est un simple drapeau de perf (évite un hit DB en edge) ;
  la vérité reste en base (`puuid`), d'où l'auto-réparation.

### 5. Re-confirmation à l'adhésion (`/rejoindre/[token]`)

- L'écran d'acceptation d'invitation affiche le Riot ID actuel **pré-rempli** dans
  un champ, avec deux chemins : « Confirmer et rejoindre » (valeur inchangée →
  pas de nouvel appel API) ou modification (nouvelle valeur → `verifyRiotId` +
  unicité avant de rejoindre).
- L'action d'adhésion existante est étendue : si la valeur diffère de l'actuelle,
  vérifier/mettre à jour le Riot ID **avant** de créer l'adhésion ; sinon rejoindre
  directement. Erreurs via toasts.

### 6. Formulaire joueur (admin & manager)

- Champ « Riot ID » (`Nom#Tag`) ajouté à `player-form` (édition admin) et au
  formulaire d'ajout roster (manager, `…/gestion/roster`).
- À la soumission : `parseRiotId` + `verifyRiotId` + unicité `puuid`, puis
  enregistrement. Vide autorisé (champ optionnel côté admin/manuel), mais s'il est
  fourni il doit être valide et unique.
- Couvre les `Player` sans `userId` (joueurs manuels).

### 7. Erreurs & retours (toasts)

Nouveaux codes d'erreur dans `lib/flash-messages.ts` :

| Code           | Message                                              |
| -------------- | ---------------------------------------------------- |
| `riotformat`   | « Riot ID invalide. Format attendu : Nom#Tag. »      |
| `riotnotfound` | « Ce Riot ID n'existe pas (introuvable côté Riot). » |
| `riottaken`    | « Ce Riot ID est déjà associé à un autre joueur. »   |
| `ratelimited`  | « Trop de requêtes, réessaie dans un instant. »      |
| `riotapi`      | « Service Riot indisponible, réessaie plus tard. »   |

Succès : `riot-saved` → « Riot ID enregistré ».

### 8. Tests

- `parseRiotId` : cas valides/invalides (sans `#`, tag trop court, espaces…).
- Client HenrikDev avec `fetch` mocké : succès (mapping puuid/region), 404, 429,
  5xx, timeout.
- Unicité : rejet d'un `puuid` déjà présent.
- (Actions serveur : couvertes indirectement ; pas de test e2e en Phase A.)

## Hors périmètre (Phase A)

- Récupération de l'historique de matchs custom (Phase B).
- Appariement des 10 joueurs / logique de scoreboard (Phase B).
- Modèles de stats par joueur et UI scoreboard (Phase B/C).
- Vérification périodique/rafraîchissement automatique des Riot IDs.

## Risques & notes

- **Rate limit HenrikDev** : la vérification est ponctuelle (saisie), volume faible.
  Prévoir un message clair `ratelimited` et ne pas boucler.
- **Prisma en edge** : évité — le proxy ne fait que lire des cookies.
- **Riot ID modifié par le joueur côté Riot** : le `puuid` reste stable ; le nom
  affiché peut devenir obsolète (rafraîchi à la prochaine re-vérification). Acceptable
  en Phase A.
- **AGENTS.md** : Next.js du projet a des différences — lire
  `node_modules/next/dist/docs/` avant d'écrire du code (proxy, server actions).
