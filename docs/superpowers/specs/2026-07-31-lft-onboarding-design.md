# Page LFT, statut « recherche d'équipe » et onboarding complet

Date : 2026-07-31

## Objectif

Trois besoins liés :

1. Une page publique `/lft` qui liste les joueurs en recherche d'équipe.
2. Un bouton dans les paramètres pour se déclarer LFT (ou ne plus l'être).
3. À la création de compte, l'utilisateur arrive sur la page paramètres complète, avec le Riot ID obligatoire.

## Décisions produit

- **Périmètre de la page LFT** : tous les joueurs ayant activé LFT, y compris ceux qui ont une équipe active. Un joueur benché a le droit de chercher. Les joueurs en équipe portent un badge avec le nom de leur équipe.
- **Pas d'auto-désactivation** : rejoindre une équipe ne coupe pas le statut LFT. Le joueur gère son statut lui-même.
- **Affichage** : grille de cartes joueurs avec filtres rôle et pays.
- **Onboarding** : le Riot ID est le seul champ bloquant. Tous les autres champs du formulaire paramètres sont présents mais optionnels.
- **Toggle LFT présent dans l'onboarding**, désactivé par défaut.

## Modèle de données

Deux champs ajoutés à `Player` dans `prisma/schema.prisma` :

```prisma
lft      Boolean   @default(false)
lftSince DateTime?
```

`lftSince` sert au tri (les plus récents en premier) et à l'affichage « LFT depuis 12 j ». Il est posé à `now()` quand le statut est activé, et remis à `null` quand il est désactivé.

Migration SQL manuelle datée, conformément aux migrations existantes du dépôt :
`prisma/migrations/20260731010000_player_lft/migration.sql`

```sql
ALTER TABLE "Player" ADD COLUMN "lft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Player" ADD COLUMN "lftSince" TIMESTAMP(3);
```

### Alternatives écartées

- **Table `LftListing` séparée** (message, rôles recherchés, disponibilités) : plus riche, mais hors du besoin exprimé. YAGNI.
- **Dériver le statut de « aucune adhésion active »** : incompatible avec la demande d'un bouton explicite, et avec le fait que les joueurs en équipe peuvent être LFT.

## Page `/lft`

Route : `src/app/lft/page.tsx`, server component, publique (pas de session requise).

### Données

`listLftPlayers(filters?: { role?: string; country?: string })` dans `src/lib/data/players.ts` :

- `where: { lft: true }`, plus `valorantRole` et `nationality` si les filtres sont fournis.
- `include` de l'adhésion active (`memberships` où `leaveDate: null`, `take: 1`) avec `team: { select: { id, name, tag, logo } }`.
- `orderBy: [{ lftSince: "desc" }, { pseudo: "asc" }]` — `lftSince` peut être `null` sur des données anciennes, le pseudo sert de départage stable.

### Filtres

Passés en `searchParams` (`?role=…&country=…`), validés côté serveur avant toute requête :

- `role` n'est retenu que s'il appartient à `VALORANT_ROLES` (`src/lib/roles.ts`), sinon ignoré.
- `country` n'est retenu que s'il fait partie des pays réellement présents parmi les joueurs LFT, sinon ignoré.

C'est la même garde que la page `/equipes`, qui rejette toute valeur d'URL arbitraire.

La liste des pays proposés est calculée à partir de l'ensemble des joueurs LFT (requête sans filtre pays), afin que le `<select>` ne propose jamais une option qui donnerait zéro résultat.

### Rendu

- Chips pour les rôles (« Tous » + les 4 rôles Valorant), même composant visuel que `RegionFilter`.
- `<select>` pour le pays, dans un formulaire GET (la liste de pays peut être longue ; les chips ne passent pas à l'échelle).
- Nouveau composant `src/components/lft-card.tsx` : photo ronde, pseudo, drapeau (`Flag`), rôle Valorant (`ROLE_LABELS`), badge de l'équipe actuelle si le joueur en a une, mention « LFT depuis X ». La carte entière est un lien vers `/joueurs/[id]`.
- État vide : « Aucun joueur en recherche d'équipe pour ce filtre. »

### Navigation

Un lien « LFT » est ajouté dans `LINKS` de `src/components/nav-links.tsx`, après « Équipes ».

## Toggle dans les paramètres

Nouvelle section « Recherche d'équipe » dans `src/app/profil/page.tsx`, entre « Mon équipe » et « Compte Valorant ».

Server action `toggleLftAction` dans `src/app/profil/actions.ts` :

- Récupère le player via la session (mêmes gardes `UNAUTHENTICATED` / `NO_PLAYER` que les actions voisines).
- Bascule : `lft = !player.lft`. Si le nouvel état est `true`, `lftSince = new Date()` ; sinon `lftSince = null`.
- `revalidatePath("/profil")` et `revalidatePath("/lft")`, puis `redirect("/profil?ok=lft-on")` ou `?ok=lft-off`.

L'état courant est affiché en clair. Si le joueur a une adhésion active, une ligne rappelle que sa fiche apparaîtra sur `/lft` avec le badge de son équipe.

La bascule d'état est extraite dans une fonction pure `nextLftState(current: boolean, now: Date)` (dans `src/lib/lft.ts`) pour être testable sans base de données.

## Onboarding

### Composant partagé

Les champs du formulaire « Informations » de `/profil` sont extraits dans `src/components/profile-fields.tsx` : uniquement les champs (pseudo, pays, rôle principal, date de naissance, Twitter, Twitch, photo), **sans** balise `<form>` ni bouton de soumission, pour que les deux pages fournissent leur propre formulaire et leur propre action.

Props : les valeurs par défaut (`pseudo`, `nationality`, `valorantRole`, `birthdate`, `socials`, `photo`).

`/profil` est refactorisé pour l'utiliser — son comportement ne change pas.

### Page

`src/app/onboarding/page.tsx` devient un seul `<form>` contenant, dans l'ordre :

1. Le champ Riot ID, `required`, avec le texte d'explication actuel.
2. `<ProfileFields />` pré-rempli depuis la fiche Player créée à la connexion (pseudo et photo Discord).
3. Le toggle LFT (case à cocher, décochée par défaut).
4. Un bouton « Valider et continuer ».

La redirection existante reste : si `player.puuid` est déjà renseigné, on pose le cookie `onboarded` et on renvoie vers `/`.

### Action

`submitOnboarding` dans `src/app/onboarding/actions.ts`, dans cet ordre :

1. Garde de session (`getSessionUser`, `getPlayerByUserId`).
2. Parse des champs profil avec `playerInputSchema`. En cas d'échec : `redirect("/onboarding?error=…")` via `flashCodeFromError`.
3. `updatePlayer` + `storePlayerPhotoFromForm` + application du statut LFT.
4. `resolveRiotAccount` puis `setPlayerRiotAccount`. En cas d'échec : `redirect("/onboarding?error=" + riotFlashCode(e))`.
5. Cookie `onboarded`, puis `redirect("/?ok=riot-saved")`.

L'ordre compte : le profil est enregistré **avant** l'appel Riot. Si Riot échoue, l'utilisateur revient sur un formulaire re-prérempli avec ce qu'il a saisi, et n'a que son Riot ID à corriger.

`/profil` conserve ses deux formulaires séparés (le Riot ID garde sa propre section avec vérification indépendante). Le gate cookie dans `src/proxy.ts` n'est pas modifié.

## Tests

Tests unitaires (Vitest), dans `tests/unit/` :

- `nextLftState` : activation pose `lftSince`, désactivation le remet à `null`.
- Normalisation des filtres LFT : un `role` hors `VALORANT_ROLES` est ignoré, un `country` absent de la liste des pays présents est ignoré, les filtres valides sont conservés.

Ces deux fonctions sont écrites pures et exportées depuis `src/lib/lft.ts` pour être testables sans base ni rendu. Le fichier de test est `tests/unit/lft.test.ts`.

L'ancienneté « LFT depuis X » réutilise `durationShort(lftSince)` de `src/lib/dates.ts`, déjà testé — pas de nouveau formateur.

## Hors périmètre

- Annonces textuelles ou « rôles recherchés » sur la fiche LFT.
- Notifications ou contact direct depuis la page LFT.
- Affichage du statut LFT sur la fiche publique `/joueurs/[id]`.
- Tests E2E supplémentaires.
