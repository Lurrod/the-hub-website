# Spec — Phase C : Affichage du scoreboard (façon vlr.gg)

**Date :** 2026-07-27
**Statut :** Validé (design approuvé).
**Dépend de :** Phase B (`PlayerGameStat` par joueur/carte, `MatchMap` étendu, `Match.statsStatus`).

## Contexte

Phase B stocke le scoreboard custom (par joueur et par carte). Phase C l'affiche sur
la page publique du match `/matchs/[id]`, façon vlr.gg : onglets par carte, deux blocs
d'équipe, colonnes agent/joueur/K/D/A/ACS/ADR/HS%.

## Décisions (validées)

1. **Onglets par carte** (un scoreboard à la fois) → petit composant client.
2. **Icônes d'agents** via CDN (`valorant-api.com`), table statique nom→icône générée
   une fois.
3. Colonnes : agent (icône), joueur, K, D, A, ACS, ADR, HS%. `firstKills` non affiché
   (toujours 0 en Phase B).
4. Affiché seulement si `statsStatus === "MATCHED"` et stats présentes ; sinon on garde
   l'affichage actuel (liste simple des cartes / « Aucun détail »).

## Design

### 1. Données (`src/lib/data/matches.ts`)

Étendre `getMatch` :

```
maps: {
  orderBy: { order: "asc" },
  include: { stats: { include: { player: { select: { id: true, pseudo: true } } } } },
}
```

### 2. Icônes d'agents (`src/lib/agents.ts` + `src/components/agent-icon.tsx`)

- `AGENT_ICONS: Record<string, string>` : nom d'agent (displayName) → URL d'icône,
  **généré une fois** depuis `https://valorant-api.com/v1/agents?isPlayableCharacter=true`
  (champ `displayName` → `displayIcon`) et figé dans le fichier (pas de fetch runtime).
- `AgentIcon({ agent, className })` : `<img>` de l'icône si l'agent est connu, sinon un
  repli (monogramme/initiale). Server component (simple `<img>`).

### 3. Scoreboard (`src/components/match-scoreboard.tsx`, client)

- Props : liste des cartes `{ id, mapName, scoreA, scoreB, stats: PlayerStatRow[] }`,
  - noms/tags des deux équipes.
- `PlayerStatRow` : `{ playerId, pseudo, riotName, teamSide, agent, kills, deaths,
assists, acs, adr, hsPct }`.
- **Onglets** : un par carte (label = nom + score `13–9`). État client (`useState`) pour
  la carte active.
- Par carte : bloc équipe A puis bloc équipe B. En-tête de bloc = nom d'équipe + rounds
  (`scoreA`/`scoreB` selon le côté). Table : colonnes agent/joueur/K/D/A/ACS/ADR/HS%,
  joueurs triés par **ACS décroissant**. `overflow-x-auto` (scroll mobile).
- Joueur : `playerId` non nul → lien `/joueurs/[id]` (label = pseudo) ; sinon `riotName`
  en texte.

### 4. Intégration (`src/app/matchs/[id]/page.tsx`)

- Si `match.statsStatus === "MATCHED"` et au moins une carte a des `stats` → afficher
  `<MatchScoreboard ... />` à la place de la section « Détail des maps ».
- Sinon → comportement actuel inchangé.

### 5. Robustesse / hors périmètre

- Aucune donnée sensible ; pas de nouveau modèle DB. Repli propre si agent inconnu.
- Hors périmètre : tri interactif des colonnes, agrégats multi-matchs, filtres.

## Tests

- Pas de logique métier nouvelle testable unitairement (affichage). Vérification par
  `npx tsc --noEmit` + build + contrôle visuel avec des données réelles (Phase B).
- Optionnel : un test de tri des joueurs par ACS (fonction pure extraite si utile).
