# Spec — Phase B : Récupération du scoreboard custom (HenrikDev)

**Date :** 2026-07-27
**Statut :** Validé (design approuvé, prêt pour plan d'implémentation)
**Projet parent :** Scoreboards de match T3 via l'API HenrikDev (façon vlr.gg pour le Tier 3).
**Dépend de :** Phase A (Riot ID / `puuid` sur `Player`, client `verifyRiotId`, `HENRIKDEV_API_KEY`).

## Contexte

Phase A capture le Riot ID (+ `puuid`) de chaque joueur. Phase B utilise ces `puuid`
pour, à la validation d'un match, retrouver la/les partie(s) custom Valorant
correspondante(s) via HenrikDev et en stocker le scoreboard détaillé par joueur et
par carte. Phase C (ultérieure) affichera ce scoreboard sur la page match.

Dans Valorant, **chaque carte est une partie Riot distincte** (un BO3 = jusqu'à 3
parties custom). Un match de notre système (best-of N) correspond donc à N parties
Riot à retrouver.

## État actuel du code (pertinent)

- **Match** (`prisma/schema.prisma`) : `scoreA/scoreB` (cartes gagnées), `winnerId`,
  `bestOf`, `status` (`SCHEDULED/LIVE/FINISHED`), relation `maps MatchMap[]`.
- **MatchMap** : `matchId`, `mapName`, `scoreA`, `scoreB` (rounds), `order`.
- **Match validation** : pas d'action « valider » dédiée — le statut passe à
  `FINISHED` via `updateMatchAction` (`src/app/admin/actions/matches.ts`).
- **Player** : `puuid @unique`, `region`, `riotName`, `riotTag` (Phase A).
- **Adhésions** : `TeamMembership` (actives = `leaveDate = null`) relient joueurs et
  équipes ; un match a `teamAId`/`teamBId`.
- **HenrikDev** : `src/lib/henrikdev.ts` (`verifyRiotId`, `RiotIdError`, timeout, clé
  server-only). `HENRIKDEV_API_KEY` en env.

## Décisions (validées)

1. **Déclenchement automatique à la validation** : dès qu'`updateMatchAction` aboutit
   à un statut `FINISHED`. Échec API géré gracieusement (jamais de crash de la
   validation). Ré-enregistrer un match `FINISHED` relance la récupération (retry).
2. **Rigueur d'appariement : ≥ 8 des 10 puuid attendus** présents dans la partie
   custom. Joueurs non reconnus (subs / sans Riot ID) stockés **sans lien Player**.
3. **Scoreboard par carte, complet** : agent, K/D/A, ACS, ADR, HS%, first kills par
   joueur, par carte.
4. **Les données Riot remplacent la saisie admin** une fois le match trouvé (cartes,
   scores). Si rien n'est trouvé, on ne touche à rien.

## Design

### 1. Déclenchement (`updateMatchAction`)

- Après la mise à jour du match, si le statut résultant est `FINISHED`, appeler
  `fetchAndStoreMatchStats(matchId)` dans un `try/catch` : toute erreur est loggée
  côté serveur et n'interrompt PAS l'action (le match reste enregistré). En cas
  d'échec, `Match.statsStatus = "NOT_FOUND"`.
- Idempotent : relancer sur un match déjà `FINISHED` ré-exécute la récupération.

### 2. Client HenrikDev (extension de `src/lib/henrikdev.ts`)

- `getPlayerCustomMatches(region, name, tag): Promise<HenrikMatch[]>`
  - `GET /valorant/v4/matches/{region}/pc/{name}/{tag}?mode=custom&size=10`
  - header `Authorization: HENRIKDEV_API_KEY`, timeout (AbortController).
  - Erreurs typées (`RiotIdError` : `NOT_FOUND` / `RATE_LIMITED` / `API_ERROR`).
- Type `HenrikMatch` (sous-ensemble utilisé) :
  - `metadata`: `{ match_id, map: { name }, started_at }`
  - `players`: `[{ puuid, name, tag, team_id ("Red"|"Blue"), agent: { name },
    stats: { kills, deaths, assists, score, headshots, bodyshots, legshots,
    damage_made? }, ... }]`
  - `teams`: `[{ team_id, rounds: { won, lost } }]`
  - `rounds`: utilisés seulement si nécessaire pour ACS/ADR (voir §4).
  - Les champs réels de l'API v4 sont validés/mappés dans le client (tolérant aux
    champs absents ; défauts sûrs). Le plan documentera le mapping exact des noms.

### 3. Appariement (`src/lib/match-stats.ts`)

- `expectedPuuids(matchId)` : puuid des joueurs des adhésions actives des deux
  équipes (`teamAId`, `teamBId`) qui ont un `puuid` non nul. Renvoie aussi la map
  `puuid -> { playerId, teamSide: "A" | "B" }`.
- `findSeriesMatches()` :
  - Interroger l'historique custom de joueurs connus **un par un**, en s'arrêtant dès
    qu'on a des candidats, avec un **cap de 4 appels API** (rate-limit). Dédupe par
    `metadata.match_id`.
  - Garder les parties où **≥ 8** des `expectedPuuids` apparaissent.
  - Trier par `started_at` croissant → ordre des cartes.
  - Cap au `bestOf` du match (au plus `bestOf` parties ; sinon toutes celles qui
    matchent, plafonnées à 5).
- `assignSides(henrikMatch, puuidToSide)` : pour chaque partie, compter par
  `team_id` Riot combien de puuid « A » vs « B » ; la team Riot majoritairement « A »
  devient côté A. `roundsA/roundsB` = rounds gagnés de chaque côté.

### 4. Calcul des stats par joueur

Pour chaque joueur d'une partie :
- `rounds = roundsA + roundsB` (total de la carte).
- `acs = round(stats.score / rounds)` (0 si rounds = 0).
- `adr = round(stats.damage_made / rounds)` si `damage_made` dispo, sinon 0.
- `hsPct = headshots / (headshots + bodyshots + legshots)` (0 si dénominateur 0),
  stocké en pourcentage arrondi (Int 0–100).
- `firstKills` : depuis les stats/évènements v4 si exposés au niveau joueur, sinon 0
  (le plan précisera le champ exact ; à défaut 0 — extensible).
- `teamSide` = côté A/B déterminé au §3. `playerId` = via `puuid` connu, sinon null.
- `agent` = `player.agent.name`.

### 5. Modèle de données (Prisma + migration)

- **`MatchMap`** (étendu) : ajouter
  - `riotMatchId String? @unique`
  - `startedAt   DateTime?`
  - `stats       PlayerGameStat[]`
- **`PlayerGameStat`** (nouveau) :
  ```
  id          String   @id @default(cuid())
  matchMapId  String
  playerId    String?
  riotName    String
  riotTag     String?
  puuid       String?
  teamSide    String    // "A" | "B"
  agent       String?
  kills       Int
  deaths      Int
  assists     Int
  acs         Int
  adr         Int
  hsPct       Int
  firstKills  Int       @default(0)
  matchMap    MatchMap  @relation(fields: [matchMapId], references: [id], onDelete: Cascade)
  player      Player?   @relation(fields: [playerId], references: [id], onDelete: SetNull)
  @@index([matchMapId])
  @@index([playerId])
  ```
- **`Match`** (étendu) : `statsStatus String?`, `statsFetchedAt DateTime?`.
- **`Player`** (relation inverse) : `gameStats PlayerGameStat[]`.
- Migration SQL (add columns + table + index + FKs), idempotente
  (`IF NOT EXISTS` où possible).

### 6. Écriture (`fetchAndStoreMatchStats`, idempotente, transaction)

1. Charger le match + `expectedPuuids`. Si < 8 puuid connus → `statsStatus="NOT_FOUND"`, stop.
2. `findSeriesMatches()`. Si aucune → `statsStatus="NOT_FOUND"`, stop (ne rien écraser).
3. En **transaction** :
   - Supprimer les `MatchMap` du match (les `PlayerGameStat` partent en cascade).
   - Pour chaque partie Riot (dans l'ordre) : créer un `MatchMap`
     (`mapName`, `scoreA=roundsA`, `scoreB=roundsB`, `order`, `riotMatchId`,
     `startedAt`) + ses `PlayerGameStat` (10 lignes).
   - Recalculer `Match.scoreA/scoreB` = nombre de cartes gagnées par côté ;
     `winnerId` = équipe avec le plus de cartes (null si égalité) ;
     `statsStatus="MATCHED"`, `statsFetchedAt=now`.
4. `revalidatePath` des pages match/gestion concernées.

### 7. Retour en gestion

- La page de gestion du match affiche l'état : `statsStatus` (« Stats récupérées » /
  « Aucune partie trouvée » / non tenté) et la date. Le rendu complet du scoreboard
  est en Phase C ; ici on montre juste le statut (indicateur simple).

### 8. Tests

- `assignSides` : fixtures avec Red/Blue mixés → bon côté A/B.
- Matching ≥ 8/10 : accepte 8 et 10, rejette 7.
- Calculs : ACS/ADR/HS% (dont division par 0 → 0).
- Sélection/ordre de série (tri par `started_at`, cap `bestOf`).
- Client `getPlayerCustomMatches` : `fetch` mocké (succès mappé, 404, 429).
- (Écriture DB : couverte par la logique pure testée + vérif manuelle avec vraie clé.)

## Hors périmètre (Phase B)

- Affichage du scoreboard (tableaux façon vlr.gg) → Phase C.
- Bouton de récupération manuelle / saisie d'un match ID (déclencheur = auto only).
- Agrégats de stats joueur multi-matchs / classements → ultérieur.
- Rafraîchissement périodique.

## Risques & notes

- **Rate limit HenrikDev** : cap de 4 appels/validation, arrêt anticipé. Une seule
  validation ⇒ peu d'appels ; acceptable.
- **Partie pas encore dans l'historique** : `NOT_FOUND` sans rien écraser ; retry en
  ré-enregistrant le match.
- **Écrasement des scores admin** : voulu (Riot fait foi une fois trouvé). Avant
  match trouvé, la saisie admin reste.
- **Forme exacte de l'API v4** : les noms de champs (`damage_made`, `first_kills`,
  `team_id`, `started_at`) seront confirmés dans le plan ; le client mappe de façon
  tolérante (défauts sûrs) pour ne pas casser si un champ manque.
- **AGENTS.md** : lire `node_modules/next/dist/docs/` avant server actions ; ne pas
  bloquer l'UX de validation sur l'appel réseau (try/catch).
