# Confrontations directes et forme récente — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter sous le scoreboard de `/matchs/[id]` le bilan des confrontations passées entre les deux équipes et les cinq derniers matchs de chacune, bornés à ce qui s'est joué avant le match affiché.

**Architecture:** La logique pure — borne de sélection, comptage du bilan, suite de résultats — vit dans un nouveau module `src/lib/match-context-core.ts`, testé en unitaire. Les deux requêtes Prisma s'ajoutent au module de données existant `src/lib/data/matches.ts`, qui appelle ce noyau. Le rendu réutilise `MatchRow` et `MatchMiniList`, déjà en place, plus un unique composant nouveau pour la colonne de forme.

**Tech Stack:** Next.js (App Router, composants serveur), Prisma, TypeScript, Vitest (unitaires, environnement `node`), Playwright (E2E).

Spec de référence : `docs/superpowers/specs/2026-08-13-h2h-forme-recente-design.md`.

---

## Contexte pour qui découvre ce dépôt

- Les tests unitaires sont dans `tests/unit/**/*.test.ts`, lancés par `npm test`. Ils tournent en environnement **`node`, sans DOM** : il n'y a ni `@testing-library/react` ni `jsdom` dans le projet. **On ne teste donc jamais un composant React en unitaire ici.** Le comportement visuel est couvert par Playwright.
- La couverture (`npm run test:coverage`) ne mesure que `src/lib/**`, en excluant `src/lib/data/**`. C'est la raison d'être des modules `*-core.ts` : `match-stats-core.ts`, `player-overview-core.ts`, `tournament-teams-core.ts` isolent la logique pure des modules de données qui, eux, touchent la base. **Le module créé ici suit exactement ce motif.**
- Les seuils de couverture sont un cliquet : `statements 82, branches 77, functions 83, lines 83`. Un nouveau fichier dans `src/lib/` mal testé fait échouer la CI.
- L'alias `@/` pointe sur `src/`.
- Les commentaires du dépôt sont en français et expliquent le *pourquoi*, pas le *quoi*. Les messages de commit aussi.

**Trois écarts assumés par rapport à la section « Tests » de la spec.** Ils tiennent tous à la même cause : l'outillage du projet ne teste en unitaire que du code pur.

1. **Pas de test unitaire sur `TeamFormColumn`.** Impossible sans bibliothèque de rendu React, et inutile : la logique que ce test visait — l'ordre chronologique des pastilles — vit dans `formResults`, testée en Tâche 3. Le rendu est couvert par la Tâche 7.
2. **« Un match sans date est écarté quand une borne est active » n'a pas de test.** C'est une propriété du SQL, pas du code : `date < X` n'est jamais vrai pour une valeur NULL. Rien à tester côté TypeScript ; le comportement est documenté par un commentaire dans `cutoffWhere`.
3. **« L'appel existant à `listTeamRecentMatches` sans `cutoff` rend le même résultat qu'avant » n'a pas de test non plus.** Le module de données n'est pas testable sans base. La garantie est structurelle — le paramètre est optionnel et son absence étale un objet vide dans la clause `where` — et la fiche d'équipe reste couverte par `tests/e2e/teams.spec.ts`.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/lib/match-context-core.ts` *(créé)* | Logique pure : type `MatchCutoff`, fragment de clause `where`, comptage du bilan, suite de résultats. Aucun accès à la base. |
| `tests/unit/match-context-core.test.ts` *(créé)* | Couvre intégralement le module ci-dessus. |
| `src/lib/data/matches.ts` *(modifié)* | Ajoute `getHeadToHead`, étend `listTeamRecentMatches` d'un paramètre de borne optionnel. |
| `src/components/team-form-column.tsx` *(créé)* | Une colonne de forme : nom d'équipe, pastilles V/D, liste des matchs. Ne fait aucune requête. |
| `src/app/matchs/[id]/page.tsx` *(modifié)* | Charge les trois requêtes en parallèle et rend les deux sections. |
| `tests/e2e/matches.spec.ts` *(modifié)* | Trois parcours, un par cas de remplissage. |

---

## Tâche 1 : la borne de sélection

**Files:**
- Create: `src/lib/match-context-core.ts`
- Test: `tests/unit/match-context-core.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

Créer `tests/unit/match-context-core.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { cutoffWhere } from "@/lib/match-context-core";

const BEFORE = new Date("2026-11-02T18:00:00.000Z");

describe("cutoffWhere", () => {
  it("écarte toujours le match affiché", () => {
    expect(cutoffWhere({ before: null, excludeMatchId: "m1" })).toEqual({
      id: { not: "m1" },
    });
  });

  it("borne sur la date quand le match affiché en a une", () => {
    expect(cutoffWhere({ before: BEFORE, excludeMatchId: "m1" })).toEqual({
      id: { not: "m1" },
      date: { lt: BEFORE },
    });
  });

  it("ne pose aucune borne de date quand le match affiché n'en a pas", () => {
    expect(cutoffWhere({ before: null, excludeMatchId: "m1" }).date).toBeUndefined();
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

Run: `npx vitest run tests/unit/match-context-core.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/match-context-core"`.

- [ ] **Étape 3 : écrire l'implémentation minimale**

Créer `src/lib/match-context-core.ts` :

```ts
/**
 * Logique pure des blocs « confrontations directes » et « forme récente » de
 * la fiche de match. Rien ici ne touche la base : les fonctions reçoivent des
 * lignes déjà chargées, ou rendent un fragment de clause `where` que
 * `src/lib/data/matches.ts` assemble. C'est ce qui les rend testables, comme
 * pour `match-stats-core.ts` et `tournament-teams-core.ts`.
 */

/**
 * « Ce qui s'est joué avant le match affiché ». Sans cette borne, la fiche
 * d'un match d'octobre listerait des résultats de décembre comme s'ils
 * l'annonçaient — un contresens qui s'aggrave à mesure que l'historique du
 * site s'allonge.
 */
export type MatchCutoff = {
  /**
   * Date du match affiché. Nulle quand il n'en a pas — `Match.date` est
   * optionnel, et un match sans date ne peut borner personne. La borne
   * disparaît alors et seule l'exclusion du match lui-même subsiste.
   */
  before: Date | null;
  /**
   * Identifiant du match affiché. Toujours écarté : un match terminé figure
   * dans les résultats de ses propres équipes et apparaîtrait sinon dans sa
   * propre liste de forme récente.
   */
  excludeMatchId: string;
};

export type CutoffWhere = {
  id: { not: string };
  date?: { lt: Date };
};

/**
 * Fragment de clause `where` correspondant à la borne.
 *
 * `date: { lt: … }` écarte au passage les matchs sans date : en SQL, une
 * comparaison avec NULL n'est jamais vraie. C'est exactement le comportement
 * voulu — on ne peut pas affirmer qu'un match sans date précède celui affiché.
 */
export function cutoffWhere(cutoff: MatchCutoff): CutoffWhere {
  const base: CutoffWhere = { id: { not: cutoff.excludeMatchId } };
  return cutoff.before ? { ...base, date: { lt: cutoff.before } } : base;
}
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

Run: `npx vitest run tests/unit/match-context-core.test.ts`
Expected: PASS — 3 tests.

- [ ] **Étape 5 : committer**

```bash
git add src/lib/match-context-core.ts tests/unit/match-context-core.test.ts
git commit -m "feat: borne de sélection des matchs antérieurs à une fiche de match"
```

---

## Tâche 2 : le bilan des confrontations

**Files:**
- Modify: `src/lib/match-context-core.ts`
- Test: `tests/unit/match-context-core.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

Ajouter à `tests/unit/match-context-core.test.ts` — compléter l'import existant en tête de fichier :

```ts
import { cutoffWhere, headToHeadTally } from "@/lib/match-context-core";
```

puis ajouter à la fin du fichier :

```ts
describe("headToHeadTally", () => {
  it("compte les victoires de chaque équipe", () => {
    const rows = [{ winnerId: "a" }, { winnerId: "b" }, { winnerId: "a" }];
    expect(headToHeadTally(rows, "a", "b")).toEqual({ winsA: 2, winsB: 1 });
  });

  // `winnerId` désigne une équipe, pas un côté : le camp occupé dans la
  // rencontre passée n'entre pas dans le calcul. Ce test verrouille l'absence
  // de raisonnement sur teamAId/teamBId.
  it("ignore le camp occupé lors des rencontres passées", () => {
    const rows = [{ winnerId: "b" }, { winnerId: "b" }];
    expect(headToHeadTally(rows, "a", "b")).toEqual({ winsA: 0, winsB: 2 });
  });

  it("ne compte pas un match terminé sans vainqueur", () => {
    const rows = [{ winnerId: "a" }, { winnerId: null }];
    expect(headToHeadTally(rows, "a", "b")).toEqual({ winsA: 1, winsB: 0 });
  });

  it("ignore un vainqueur étranger aux deux équipes", () => {
    expect(headToHeadTally([{ winnerId: "c" }], "a", "b")).toEqual({ winsA: 0, winsB: 0 });
  });

  it("rend un bilan nul sur une liste vide", () => {
    expect(headToHeadTally([], "a", "b")).toEqual({ winsA: 0, winsB: 0 });
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

Run: `npx vitest run tests/unit/match-context-core.test.ts`
Expected: FAIL — `headToHeadTally is not a function`.

- [ ] **Étape 3 : écrire l'implémentation minimale**

Ajouter à `src/lib/match-context-core.ts` :

```ts
export type TallyRow = { winnerId: string | null };

export type HeadToHeadTally = {
  /** Rencontres gagnées par la première équipe passée en argument. */
  winsA: number;
  /** Rencontres gagnées par la seconde. */
  winsB: number;
};

/**
 * Bilan des rencontres, calculé en mémoire sur les lignes déjà chargées —
 * une requête d'agrégat de plus ne se justifierait pas pour dix lignes au
 * maximum.
 *
 * Un match terminé sans vainqueur — `winnerId` nul, ce que le schéma
 * autorise — figure dans la liste mais dans aucun total : le match nul
 * n'existe pas en Valorant, et lui inventer une colonne embrouillerait le
 * bilan plus qu'il ne l'éclairerait.
 */
export function headToHeadTally(
  rows: readonly TallyRow[],
  teamAId: string,
  teamBId: string
): HeadToHeadTally {
  let winsA = 0;
  let winsB = 0;
  for (const row of rows) {
    if (row.winnerId === teamAId) winsA++;
    else if (row.winnerId === teamBId) winsB++;
  }
  return { winsA, winsB };
}
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

Run: `npx vitest run tests/unit/match-context-core.test.ts`
Expected: PASS — 8 tests.

- [ ] **Étape 5 : committer**

```bash
git add src/lib/match-context-core.ts tests/unit/match-context-core.test.ts
git commit -m "feat: bilan des confrontations directes entre deux équipes"
```

---

## Tâche 3 : la suite de résultats

**Files:**
- Modify: `src/lib/match-context-core.ts`
- Test: `tests/unit/match-context-core.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

Compléter l'import en tête de `tests/unit/match-context-core.test.ts` :

```ts
import { cutoffWhere, headToHeadTally, formResults } from "@/lib/match-context-core";
```

puis ajouter à la fin du fichier :

```ts
describe("formResults", () => {
  // La requête rend les matchs du plus récent au plus ancien ; une série de
  // forme se lit dans le sens du temps. La fonction porte cette inversion,
  // pour que ni la requête ni le composant n'aient à s'en soucier.
  it("rend la suite du plus ancien au plus récent", () => {
    const rows = [{ winnerId: "a" }, { winnerId: "b" }, { winnerId: "a" }];
    expect(formResults(rows, "a")).toEqual(["WIN", "LOSS", "WIN"]);
  });

  it("qualifie une victoire, une défaite et un match sans vainqueur", () => {
    const rows = [{ winnerId: null }, { winnerId: "b" }, { winnerId: "a" }];
    expect(formResults(rows, "a")).toEqual(["WIN", "LOSS", "DRAW"]);
  });

  it("rend une suite vide sur une liste vide", () => {
    expect(formResults([], "a")).toEqual([]);
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

Run: `npx vitest run tests/unit/match-context-core.test.ts`
Expected: FAIL — `formResults is not a function`.

- [ ] **Étape 3 : écrire l'implémentation minimale**

Ajouter à `src/lib/match-context-core.ts` :

```ts
export type FormResult = "WIN" | "LOSS" | "DRAW";

export type FormRow = { winnerId: string | null };

/**
 * Suite de résultats d'une équipe, du plus ancien au plus récent — l'ordre
 * dans lequel se lit une série de forme. Les lignes arrivent dans l'ordre
 * inverse, celui de la requête, d'où le `reverse`.
 */
export function formResults(rows: readonly FormRow[], teamId: string): FormResult[] {
  return rows
    .map((row): FormResult => {
      if (row.winnerId === teamId) return "WIN";
      return row.winnerId === null ? "DRAW" : "LOSS";
    })
    .reverse();
}
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

Run: `npx vitest run tests/unit/match-context-core.test.ts`
Expected: PASS — 11 tests.

- [ ] **Étape 5 : vérifier que le noyau est intégralement couvert**

Run: `npm run test:coverage`
Expected: PASS, et `src/lib/match-context-core.ts` à 100 % dans le récapitulatif. Les seuils globaux ne doivent pas baisser.

- [ ] **Étape 6 : committer**

```bash
git add src/lib/match-context-core.ts tests/unit/match-context-core.test.ts
git commit -m "feat: suite de résultats chronologique pour la forme d'une équipe"
```

---

## Tâche 4 : les deux requêtes

**Files:**
- Modify: `src/lib/data/matches.ts`

Ce module n'est pas testé en unitaire — il est exclu de la couverture parce qu'il touche la base. La logique qu'il porte a été extraite dans le noyau et testée aux tâches 1 à 3 ; ce qui reste ici est de la requête, vérifiée par les parcours de la tâche 7.

- [ ] **Étape 1 : importer le noyau**

Dans `src/lib/data/matches.ts`, ajouter aux imports de tête, après la ligne `import { seriesScore } from "@/lib/match-stats-core";` :

```ts
import { cutoffWhere, headToHeadTally, type MatchCutoff } from "@/lib/match-context-core";
```

- [ ] **Étape 2 : étendre `listTeamRecentMatches`**

Remplacer la fonction existante (repérable par son commentaire `/** Derniers résultats d'une équipe, du plus récent au plus ancien. */`) par :

```ts
/**
 * Derniers résultats d'une équipe, du plus récent au plus ancien.
 *
 * `cutoff` restreint aux matchs antérieurs à un match donné : c'est ce dont a
 * besoin la fiche de match, alors que la fiche d'équipe veut les plus récents
 * en date. Le paramètre est optionnel pour que l'appel existant depuis
 * `src/app/equipes/[id]/page.tsx` garde son comportement — une seconde
 * fonction pour une clause `where` de plus finirait par diverger de celle-ci.
 */
export function listTeamRecentMatches(teamId: string, limit = 4, cutoff?: MatchCutoff) {
  return db.match.findMany({
    where: {
      status: "FINISHED",
      OR: [{ teamAId: teamId }, { teamBId: teamId }],
      ...(cutoff ? cutoffWhere(cutoff) : {}),
    },
    include: { teamA: true, teamB: true },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
}
```

- [ ] **Étape 3 : ajouter `getHeadToHead`**

Juste en dessous de `listTeamRecentMatches`, ajouter :

```ts
/**
 * Plafond des rencontres remontées. Le bilan affiché porte sur ces
 * rencontres-là et pas sur l'historique entier : un total qui ne
 * correspondrait pas aux lignes juste en dessous serait plus déroutant qu'un
 * total tronqué. La page le dit quand le plafond a joué.
 */
export const HEAD_TO_HEAD_LIMIT = 10;

/**
 * Rencontres passées entre deux équipes, de la plus récente à la plus
 * ancienne, accompagnées du bilan.
 */
export async function getHeadToHead(
  teamAId: string,
  teamBId: string,
  cutoff: MatchCutoff,
  limit = HEAD_TO_HEAD_LIMIT
) {
  const matches = await db.match.findMany({
    where: {
      status: "FINISHED",
      OR: [
        { teamAId, teamBId },
        { teamAId: teamBId, teamBId: teamAId },
      ],
      ...cutoffWhere(cutoff),
    },
    include: {
      teamA: { select: { name: true, tag: true, logo: true } },
      teamB: { select: { name: true, tag: true, logo: true } },
      // Sans le nom du tournoi, dix lignes de score ne se distinguent pas.
      tournament: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
  return { matches, ...headToHeadTally(matches, teamAId, teamBId) };
}
```

- [ ] **Étape 4 : vérifier que rien n'est cassé**

Run: `npx tsc --noEmit && npm test`
Expected: aucune erreur de type, toute la suite unitaire au vert.

- [ ] **Étape 5 : committer**

```bash
git add src/lib/data/matches.ts
git commit -m "feat: requêtes des confrontations directes et de la forme bornée"
```

---

## Tâche 5 : la colonne de forme

**Files:**
- Create: `src/components/team-form-column.tsx`

Composant serveur, comme `match-row.tsx` et `match-mini-list.tsx` : pas de directive `"use client"`.

- [ ] **Étape 1 : écrire le composant**

Créer `src/components/team-form-column.tsx` :

```tsx
import MatchMiniList, { type MiniMatch } from "@/components/match-mini-list";
import type { FormResult } from "@/lib/match-context-core";

/**
 * Mêmes jetons que les bilans de `team-match-groups.tsx` : la couleur d'une
 * victoire ne doit pas changer d'une page à l'autre.
 */
const PILLS: Record<FormResult, { label: string; title: string; className: string }> = {
  WIN: {
    label: "V",
    title: "victoire",
    className: "bg-[var(--success-soft)] text-[var(--success)]",
  },
  LOSS: {
    label: "D",
    title: "défaite",
    className: "bg-[var(--destructive-soft)] text-[var(--destructive)]",
  },
  DRAW: {
    label: "-",
    title: "sans vainqueur",
    className: "bg-[var(--bg)] text-[var(--text-subtle)]",
  },
};

/**
 * L'état de forme d'une équipe : son nom, sa série de résultats et ses
 * derniers matchs. Le composant ne fait aucune requête et ignore tout du match
 * depuis lequel on le regarde — il reçoit une liste déjà bornée et déjà
 * ordonnée.
 */
export default function TeamFormColumn({
  name,
  form,
  matches,
}: {
  name: string;
  /** Du plus ancien au plus récent, tel que le rend `formResults`. */
  form: FormResult[];
  /** Du plus récent au plus ancien, tel que le rend la requête. */
  matches: MiniMatch[];
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-white">{name}</span>
        {form.length > 0 && (
          // Les pastilles sont illisibles une par une pour un lecteur d'écran :
          // la série entière porte donc un libellé, et chaque pastille est
          // masquée.
          <span
            className="flex shrink-0 items-center gap-1"
            aria-label={`Forme de ${name} : ${form.map((r) => PILLS[r].title).join(", ")}`}
          >
            {form.map((result, index) => (
              <span
                key={`${index}-${result}`}
                aria-hidden
                className={`stat grid h-5 w-5 place-items-center rounded text-[10px] font-semibold ${PILLS[result].className}`}
              >
                {PILLS[result].label}
              </span>
            ))}
          </span>
        )}
      </div>
      <MatchMiniList matches={matches} empty="Aucun match joué avant celui-ci." />
    </div>
  );
}
```

- [ ] **Étape 2 : vérifier types et lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

- [ ] **Étape 3 : committer**

```bash
git add src/components/team-form-column.tsx
git commit -m "feat: colonne de forme récente d'une équipe"
```

---

## Tâche 6 : brancher la fiche de match

**Files:**
- Modify: `src/app/matchs/[id]/page.tsx`

- [ ] **Étape 1 : compléter les imports**

Dans `src/app/matchs/[id]/page.tsx` :

Remplacer

```tsx
import EmptyState, { ListDecor } from "@/components/empty-state";
import { getMatch } from "@/lib/data/matches";
```

par

```tsx
import EmptyState, { EmptyLine, ListDecor } from "@/components/empty-state";
import { getHeadToHead, getMatch, listTeamRecentMatches, HEAD_TO_HEAD_LIMIT } from "@/lib/data/matches";
import { formResults, type MatchCutoff } from "@/lib/match-context-core";
import MatchRow from "@/components/match-row";
import TeamFormColumn from "@/components/team-form-column";
```

- [ ] **Étape 2 : charger les trois requêtes en parallèle**

Remplacer

```tsx
  const sessionUser = await getSessionUser();
  const canManage = canManageTournament(
    sessionUser,
    await getTournamentManagerIds(match.tournamentId)
  );
```

par

```tsx
  const cutoff: MatchCutoff = { before: match.date, excludeMatchId: match.id };
  // Les cinq requêtes sont indépendantes : les enchaîner allongeait le rendu
  // pour rien.
  const [sessionUser, managerIds, h2h, recentA, recentB] = await Promise.all([
    getSessionUser(),
    getTournamentManagerIds(match.tournamentId),
    getHeadToHead(match.teamAId, match.teamBId, cutoff),
    listTeamRecentMatches(match.teamAId, 5, cutoff),
    listTeamRecentMatches(match.teamBId, 5, cutoff),
  ]);
  const canManage = canManageTournament(sessionUser, managerIds);

  // Deux équipes qui se sont déjà rencontrées ont forcément de la forme ; la
  // réciproque est fausse. Les deux drapeaux restent distincts parce qu'ils
  // pilotent deux rendus différents.
  const hasHeadToHead = h2h.matches.length > 0;
  const hasForm = recentA.length > 0 || recentB.length > 0;
```

- [ ] **Étape 3 : ajouter les deux sections**

Toujours dans `src/app/matchs/[id]/page.tsx`, insérer juste avant la balise fermante `</main>`, après la `</section>` du scoreboard :

```tsx
      {(hasHeadToHead || hasForm) && (
        <>
          <section className="mt-10">
            <h2 className="mb-3 text-base font-semibold text-[var(--accent)]">
              Confrontations directes
            </h2>
            {hasHeadToHead ? (
              <>
                {/* Le bilan est éclaté en plusieurs `span` pour la couleur :
                    seul le libellé le rend lisible d'un lecteur d'écran. */}
                <p
                  className="stat mb-3 text-center text-sm"
                  aria-label={`Bilan des confrontations : ${match.teamA.tag} ${h2h.winsA}, ${match.teamB.tag} ${h2h.winsB}`}
                >
                  <span className="text-[var(--text-muted)]">{match.teamA.tag}</span>{" "}
                  <span
                    className={
                      h2h.winsA > h2h.winsB ? "font-bold text-[var(--accent)]" : "text-white"
                    }
                  >
                    {h2h.winsA}
                  </span>
                  <span className="mx-1.5 text-[var(--text-subtle)]">-</span>
                  <span
                    className={
                      h2h.winsB > h2h.winsA ? "font-bold text-[var(--accent)]" : "text-white"
                    }
                  >
                    {h2h.winsB}
                  </span>{" "}
                  <span className="text-[var(--text-muted)]">{match.teamB.tag}</span>
                </p>
                {h2h.matches.length === HEAD_TO_HEAD_LIMIT && (
                  <p className="mb-3 text-center text-xs text-[var(--text-muted)]">
                    Sur les {HEAD_TO_HEAD_LIMIT} dernières rencontres.
                  </p>
                )}
                <div className="space-y-1 rounded-lg border border-[var(--border)] p-1">
                  {h2h.matches.map((m) => (
                    <MatchRow key={m.id} bare match={{ ...m, contextLabel: m.tournament.name }} />
                  ))}
                </div>
              </>
            ) : (
              <EmptyLine>Première rencontre entre les deux équipes.</EmptyLine>
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-3 text-base font-semibold text-[var(--accent)]">Forme récente</h2>
            {/* Même point de rupture que le bandeau du haut de page. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <TeamFormColumn
                name={match.teamA.name}
                form={formResults(recentA, match.teamAId)}
                matches={recentA}
              />
              <TeamFormColumn
                name={match.teamB.name}
                form={formResults(recentB, match.teamBId)}
                matches={recentB}
              />
            </div>
          </section>
        </>
      )}
```

- [ ] **Étape 4 : vérifier types et lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune erreur.

- [ ] **Étape 5 : vérifier à l'œil dans le navigateur**

Run: `npm run dev` puis ouvrir successivement
- `http://localhost:3200/matchs/fmt-league-m-aller-4` — bilan `VIT 1 - 4 FNC`, cinq rencontres listées, deux colonnes de forme ;
- `http://localhost:3200/matchs/fmt-round-robin-m-rr-13` — « Première rencontre entre les deux équipes. » puis les deux colonnes ;
- `http://localhost:3200/matchs/fmt-round-robin-m-rr-1` — ni l'une ni l'autre section.

Vérifier aussi qu'aucune des listes ne contient un lien vers le match consulté, et que la grille de forme passe à une colonne sous 640 px de large.

- [ ] **Étape 6 : committer**

```bash
git add "src/app/matchs/[id]/page.tsx"
git commit -m "feat: affiche les confrontations directes et la forme sur la fiche de match"
```

---

## Tâche 7 : les parcours Playwright

**Files:**
- Modify: `tests/e2e/matches.spec.ts`

Les identifiants ci-dessous viennent de `prisma/seed-formats.ts`, rejoué en CI par `npm run db:seed:formats -- --prune`. Ils ont été vérifiés en base : `fmt-league-m-aller-4` compte cinq rencontres antérieures entre Team Vitality et FNATIC, dont une gagnée par Vitality et quatre par FNATIC.

- [ ] **Étape 1 : écrire les tests qui échouent**

Ajouter à la fin de `tests/e2e/matches.spec.ts` :

```ts
// Trois fiches choisies dans `seed-formats.ts` pour couvrir les trois états de
// remplissage possibles des blocs de contexte.
test("la fiche de match affiche le bilan des confrontations et la forme", async ({ page }) => {
  await page.goto("/matchs/fmt-league-m-aller-4");
  await expect(page.getByRole("heading", { name: "Confrontations directes" })).toBeVisible();
  await expect(page.getByLabel("Bilan des confrontations : VIT 1, FNC 4")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Forme récente" })).toBeVisible();
  // Le match consulté ne doit figurer dans aucune de ses propres listes.
  await expect(page.locator('a[href="/matchs/fmt-league-m-aller-4"]')).toHaveCount(0);
});

test("une première rencontre l'annonce au lieu d'afficher un bilan", async ({ page }) => {
  await page.goto("/matchs/fmt-round-robin-m-rr-13");
  await expect(page.getByText("Première rencontre entre les deux équipes.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Forme récente" })).toBeVisible();
});

test("un match sans aucun antécédent n'affiche ni bilan ni forme", async ({ page }) => {
  await page.goto("/matchs/fmt-round-robin-m-rr-1");
  await expect(page.getByRole("heading", { name: "Confrontations directes" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Forme récente" })).toHaveCount(0);
});
```

- [ ] **Étape 2 : lancer les tests**

Run: `npx playwright test tests/e2e/matches.spec.ts`
Expected: PASS — les six tests du fichier, dont les trois nouveaux. S'ils échouaient avant la tâche 6, c'est la preuve qu'ils testent bien l'ajout ; à ce stade du plan le code est déjà en place, donc ils doivent passer du premier coup. Un échec ici signale une régression de la tâche 6, pas un test à ajuster.

- [ ] **Étape 3 : committer**

```bash
git add tests/e2e/matches.spec.ts
git commit -m "test: couvre les trois états des blocs de contexte d'un match"
```

---

## Tâche 8 : vérification complète et version

**Files:**
- Modify: `package.json`

- [ ] **Étape 1 : passer toute la chaîne de vérification**

Run: `npx tsc --noEmit && npm run lint && npm run format:check && npm run test:coverage`
Expected: tout au vert, seuils de couverture tenus ou dépassés.

- [ ] **Étape 2 : passer toute la suite E2E**

Run: `npx playwright test`
Expected: tout au vert. Surveiller en particulier `a11y.spec.ts` : les deux sections ajoutent des titres de niveau 2 et une grille, et le libellé du bilan doit être annoncé sans doublon.

- [ ] **Étape 3 : monter la version**

Dans `package.json`, passer `"version": "1.30.0"` à `"version": "1.31.0"` — ajout fonctionnel sans rupture.

- [ ] **Étape 4 : committer**

```bash
git add package.json
git commit -m "chore: version 1.31.0"
```

- [ ] **Étape 5 : ouvrir la pull request**

```bash
git push -u origin feat/h2h-et-forme-recente
gh pr create --title "Confrontations directes et forme récente sur la fiche de match" --body "$(cat <<'EOF'
## Ce que ça ajoute

Sous le scoreboard de \`/matchs/[id]\`, deux blocs :

- **Confrontations directes** — le bilan des rencontres passées entre les deux équipes et le détail de ces rencontres, chacune étiquetée du tournoi où elle s'est jouée.
- **Forme récente** — les cinq derniers matchs de chaque équipe, côte à côte, avec une série de pastilles V/D.

Aucune donnée nouvelle n'est stockée, aucune migration : tout se déduit de la table \`Match\`.

## La décision qui structure le reste

Les deux blocs se placent **dans le temps du match affiché** : ils ne retiennent que ce qui s'est joué avant lui, et excluent toujours le match lui-même. Sans cette borne, la fiche d'un match d'octobre listerait des résultats de décembre comme s'ils l'annonçaient, et un match terminé apparaîtrait dans sa propre liste de forme. Un match saisi sans date désactive la borne — on ne peut pas ordonner ce qui n'est pas daté.

## Trois états de remplissage

En T3, l'absence d'historique est le cas courant, pas l'exception :

- historique fourni → bilan et listes ;
- jamais rencontrées → une ligne « Première rencontre entre les deux équipes », qui est une information et non un vide ;
- aucune des deux équipes n'a de passé → les deux sections disparaissent.

## Découpage

La logique pure vit dans \`src/lib/match-context-core.ts\`, couvert à 100 % en unitaire, selon le motif déjà en place pour \`match-stats-core.ts\` et \`tournament-teams-core.ts\`. Les requêtes s'ajoutent à \`src/lib/data/matches.ts\`. Le rendu réutilise \`MatchRow\` et \`MatchMiniList\` ; un seul composant est nouveau.

## Tests

- Unitaires : borne de sélection, bilan, suite de résultats.
- E2E : les trois états ci-dessus, sur \`fmt-league-m-aller-4\`, \`fmt-round-robin-m-rr-13\` et \`fmt-round-robin-m-rr-1\`.

Spec : \`docs/superpowers/specs/2026-08-13-h2h-forme-recente-design.md\`
EOF
)"
```

---

## Points de vigilance

- **Le plafond de dix.** Aucune paire du jeu de démonstration n'atteint dix rencontres — la mention « Sur les 10 dernières rencontres. » n'est donc couverte par aucun test. C'est assumé : la vérifier demanderait un jeu de données dédié pour une ligne de texte. À garder en tête si le seuil change.
- **`format:check`.** Prettier tourne en CI. Si l'étape 1 de la tâche 8 échoue là-dessus, lancer `npm run format` et inclure le résultat dans le commit courant plutôt que d'en créer un de mise en forme.
- **Le fichier de page.** `src/app/matchs/[id]/page.tsx` passe d'environ 290 à environ 370 lignes. C'est en dessous du plafond de 800 du dépôt mais au-dessus de la fourchette habituelle. Si une troisième section devait s'y ajouter plus tard, extraire les deux blocs dans un composant serveur dédié serait le bon réflexe — inutile de le faire maintenant pour deux sections.
