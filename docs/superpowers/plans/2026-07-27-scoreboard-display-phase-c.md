# Scoreboard Display (Phase C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Afficher le scoreboard custom (Phase B) sur la page match publique, façon vlr.gg : onglets par carte, icônes d'agents, colonnes agent/joueur/K/D/A/ACS/ADR/HS%.

**Architecture:** Une table statique d'icônes d'agents (générée depuis valorant-api.com, figée). Un composant client `MatchScoreboard` (onglets + tables, tri ACS). `getMatch` étendu pour charger `maps.stats.player`. Intégration conditionnelle sur `statsStatus === "MATCHED"`.

**Tech Stack:** Next.js 16 (App Router, client components), Prisma, TypeScript strict.

**⚠️ Avant de coder :** ce Next.js diffère — voir `node_modules/next/dist/docs/` si besoin (client components, `<img>`).

---

## File Structure

- **Create** `src/lib/agents.ts` — `AGENT_ICONS` (nom → URL icône), `agentIconUrl()`.
- **Create** `src/components/agent-icon.tsx` — `<AgentIcon>`.
- **Create** `src/components/match-scoreboard.tsx` — composant client (onglets + tables).
- **Modify** `src/lib/data/matches.ts` — `getMatch` include stats.
- **Modify** `src/app/matchs/[id]/page.tsx` — intégration conditionnelle.

---

## Task 1: Table d'icônes d'agents + composant `AgentIcon`

**Files:**

- Create: `src/lib/agents.ts`
- Create: `src/components/agent-icon.tsx`

- [ ] **Step 1: Générer la table depuis valorant-api.com**

Récupérer la liste des agents jouables et bâtir la map nom→icône. Exécuter :

```bash
node -e "fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true').then(r=>r.json()).then(j=>{const m={};for(const a of j.data){m[a.displayName]=a.displayIcon;}process.stdout.write(JSON.stringify(m,null,2));})"
```

Si la commande échoue (réseau indisponible), RAPPORTER BLOCKED (le contrôleur fournira la table). Sinon, utiliser la sortie JSON comme contenu de `AGENT_ICONS` ci-dessous.

- [ ] **Step 2: Écrire `src/lib/agents.ts`**

```ts
// Table nom d'agent -> URL d'icône (valorant-api.com), figée (pas de fetch runtime).
// Générée via: valorant-api.com/v1/agents?isPlayableCharacter=true (displayName -> displayIcon).
export const AGENT_ICONS: Record<string, string> = {
  /* COLLER ICI le JSON généré à l'étape 1, p.ex.:
  "Jett": "https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png",
  ... */
};

/** URL d'icône d'un agent par son nom, ou undefined si inconnu. */
export function agentIconUrl(agent: string | null | undefined): string | undefined {
  if (!agent) return undefined;
  return AGENT_ICONS[agent];
}
```

Remplacer le commentaire par les vraies entrées générées.

- [ ] **Step 3: Écrire `src/components/agent-icon.tsx`**

```tsx
import { agentIconUrl } from "@/lib/agents";

export default function AgentIcon({
  agent,
  className = "",
}: {
  agent: string | null | undefined;
  className?: string;
}) {
  const url = agentIconUrl(agent);
  if (!url) {
    return (
      <span
        className={`inline-grid h-6 w-6 shrink-0 place-items-center rounded bg-[var(--surface)] text-[8px] text-[var(--text-muted)] ${className}`}
        title={agent ?? ""}
      >
        {agent ? agent.slice(0, 2).toUpperCase() : "?"}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={agent ?? ""}
      title={agent ?? ""}
      width={24}
      height={24}
      className={`inline-block h-6 w-6 shrink-0 rounded object-cover ${className}`}
      loading="lazy"
    />
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agents.ts src/components/agent-icon.tsx
git commit -m "feat: add agent icon map and AgentIcon component"
```

---

## Task 2: Étendre `getMatch` pour charger les scoreboards

**Files:**

- Modify: `src/lib/data/matches.ts`

- [ ] **Step 1: Étendre l'`include` de `getMatch`**

Remplacer la ligne `maps: { orderBy: { order: "asc" } },` dans `getMatch` par :

```ts
      maps: {
        orderBy: { order: "asc" },
        include: {
          stats: {
            include: { player: { select: { id: true, pseudo: true } } },
          },
        },
      },
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` — exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/matches.ts
git commit -m "feat: load per-map player stats in getMatch"
```

---

## Task 3: Composant `MatchScoreboard` (client, onglets + tables)

**Files:**

- Create: `src/components/match-scoreboard.tsx`

- [ ] **Step 1: Écrire le composant**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import AgentIcon from "@/components/agent-icon";

export type ScoreboardРlayerRow = {
  id: string;
  playerId: string | null;
  pseudo: string | null;
  riotName: string;
  teamSide: string; // "A" | "B"
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  hsPct: number;
};

export type ScoreboardMap = {
  id: string;
  mapName: string;
  scoreA: number;
  scoreB: number;
  stats: ScoreboardРlayerRow[];
};

const HEAD =
  "px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]";
const CELL = "stat px-2 py-1.5 text-right text-sm text-white";

function TeamBlock({
  label,
  rounds,
  rows,
}: {
  label: string;
  rounds: number;
  rows: ScoreboardРlayerRow[];
}) {
  const sorted = [...rows].sort((a, b) => b.acs - a.acs);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="px-2 py-1.5 text-left text-sm font-semibold text-white" colSpan={2}>
              {label}
            </th>
            <th className={HEAD}>K</th>
            <th className={HEAD}>D</th>
            <th className={HEAD}>A</th>
            <th className={HEAD}>ACS</th>
            <th className={HEAD}>ADR</th>
            <th className={HEAD}>HS%</th>
            <th className={`${HEAD} pr-2`}>{rounds}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.id}
              className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--table-row-hover)]"
            >
              <td className="w-8 py-1.5 pl-2">
                <AgentIcon agent={r.agent} />
              </td>
              <td className="max-w-[160px] truncate py-1.5 pr-2 text-left text-sm">
                {r.playerId ? (
                  <Link
                    href={`/joueurs/${r.playerId}`}
                    className="text-white hover:text-[var(--accent)]"
                  >
                    {r.pseudo ?? r.riotName}
                  </Link>
                ) : (
                  <span className="text-[var(--text-muted)]">{r.riotName}</span>
                )}
              </td>
              <td className={CELL}>{r.kills}</td>
              <td className={CELL}>{r.deaths}</td>
              <td className={CELL}>{r.assists}</td>
              <td className={CELL}>{r.acs}</td>
              <td className={CELL}>{r.adr}</td>
              <td className={CELL}>{r.hsPct}%</td>
              <td className={CELL}></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MatchScoreboard({
  maps,
  teamAName,
  teamBName,
}: {
  maps: ScoreboardMap[];
  teamAName: string;
  teamBName: string;
}) {
  const [active, setActive] = useState(0);
  if (maps.length === 0) return null;
  const map = maps[Math.min(active, maps.length - 1)];

  return (
    <div>
      {maps.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {maps.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                i === active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
              }`}
            >
              {m.mapName} {m.scoreA}–{m.scoreB}
            </button>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
        <TeamBlock
          label={teamAName}
          rounds={map.scoreA}
          rows={map.stats.filter((s) => s.teamSide === "A")}
        />
        <div className="my-2 h-px bg-[var(--border)]" />
        <TeamBlock
          label={teamBName}
          rounds={map.scoreB}
          rows={map.stats.filter((s) => s.teamSide === "B")}
        />
      </div>
    </div>
  );
}
```

NOTE: le type est nommé `ScoreboardРlayerRow` ci-dessus par erreur de saisie — utiliser un nom ASCII `ScoreboardPlayerRow` partout (renommer les 3 occurrences). Vérifier qu'aucun caractère non-ASCII ne subsiste dans les identifiants.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` — exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/match-scoreboard.tsx
git commit -m "feat: add MatchScoreboard component (per-map tabs, ACS-sorted tables)"
```

---

## Task 4: Intégration sur la page match

**Files:**

- Modify: `src/app/matchs/[id]/page.tsx`

- [ ] **Step 1: Importer et mapper les données**

Ajouter l'import :

```ts
import MatchScoreboard, { type ScoreboardMap } from "@/components/match-scoreboard";
```

Dans le composant, après le chargement de `match`, calculer :

```ts
const hasScoreboard = match.statsStatus === "MATCHED" && match.maps.some((m) => m.stats.length > 0);
const scoreboardMaps: ScoreboardMap[] = match.maps.map((m) => ({
  id: m.id,
  mapName: m.mapName,
  scoreA: m.scoreA,
  scoreB: m.scoreB,
  stats: m.stats.map((s) => ({
    id: s.id,
    playerId: s.playerId,
    pseudo: s.player?.pseudo ?? null,
    riotName: s.riotName,
    teamSide: s.teamSide,
    agent: s.agent,
    kills: s.kills,
    deaths: s.deaths,
    assists: s.assists,
    acs: s.acs,
    adr: s.adr,
    hsPct: s.hsPct,
  })),
}));
```

- [ ] **Step 2: Remplacer la section « Détail des maps »**

Remplacer le bloc `<section className="mt-10"> ... Détail des maps ... </section>` par :

```tsx
<section className="mt-10">
  <h2 className="mb-3 text-lg font-semibold text-white">
    {hasScoreboard ? "Scoreboard" : "Détail des maps"}
  </h2>
  {hasScoreboard ? (
    <MatchScoreboard
      maps={scoreboardMaps}
      teamAName={match.teamA.name}
      teamBName={match.teamB.name}
    />
  ) : match.maps.length === 0 ? (
    <p className="text-[var(--text-muted)]">Aucun détail carte par carte saisi.</p>
  ) : (
    <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
      {match.maps.map((m) => (
        <li
          key={m.id}
          className="flex items-center justify-between p-3 text-sm transition-colors hover:bg-[var(--table-row-hover)]"
        >
          <span className="text-white">{m.mapName}</span>
          <span className="stat text-[var(--text-muted)]">
            {m.scoreA} – {m.scoreB}
          </span>
        </li>
      ))}
    </ul>
  )}
</section>
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/matchs/[id]/page.tsx"
git commit -m "feat: show scoreboard on match page when stats are available"
```

---

## Task 5: Vérification finale

- [ ] **Step 1:** `npx tsc --noEmit && npx vitest run` — exit 0, tous tests verts.
- [ ] **Step 2 (manuel):** sur un match avec `statsStatus="MATCHED"` (Phase B), ouvrir `/matchs/[id]` : onglets par carte, icônes d'agents, joueurs triés par ACS, liens vers fiches, blocs A/B avec rounds. Sur un match sans stats : affichage inchangé.
- [ ] **Step 3:** build de contrôle `npm run build` si possible (peut nécessiter dev arrêté).

---

## Notes

- Task 2/3 indépendants ; Task 4 dépend de 1, 2, 3.
- Aucun modèle DB ajouté. Icônes via CDN externe (comme les drapeaux Phase A).
