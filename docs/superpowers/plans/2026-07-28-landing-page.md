# Landing page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'accueil `/` (dashboard) par une landing page « Hub vivant » qui présente The Hub et pousse à rejoindre.

**Architecture:** `src/app/page.tsx` réécrit en server component qui, en un seul `auth()` + un `Promise.all`, récupère tournois actifs, derniers résultats et top joueurs, puis rend : hero (CTA auth-aware) → tournois → résultats → joueurs à suivre → bloc « rejoindre » → CTA finale. Réutilise `TournamentCard`, `MatchRow`. Ajoute une data function `listTopPlayers` et deux petits composants présentationnels.

**Tech Stack:** Next.js 16 (App Router, RSC, Turbopack), Prisma/Postgres, Tailwind v4, NextAuth (Discord). Vérification projet : `npx tsc --noEmit`, script `tsx` ponctuel sur la base seedée, serveur dev `http://localhost:3200` + `curl`.

**Convention de vérification (ce projet) :** pas de tests de composants React. On valide par (a) `tsc` vert, (b) pour les data functions, un script `tsx` jetable qui interroge la base seedée et logge le résultat, (c) rendu HTTP 200 + contrôle visuel via le serveur dev déjà lancé sur le port 3200.

---

## File Structure

- **Modify** `src/lib/data/players.ts` — ajoute `listTopPlayers(limit)` (agrégation rating moyen + seuil de parties + équipe actuelle).
- **Create** `src/components/player-mini-card.tsx` — carte joueur compacte (photo, drapeau, pseudo, tag équipe, rating).
- **Create** `src/components/landing-features.tsx` — bloc statique « Ta place dans le Hub » (3 cartes).
- **Rewrite** `src/app/page.tsx` — assemble la landing (hero + sections + features + CTA finale), CTA auth-aware avec le flux `signIn("discord")` existant.

Aucune modification de schéma. Le dashboard actuel disparaît (remplacement complet de `page.tsx`).

---

## Task 1: Data function `listTopPlayers`

**Files:**
- Modify: `src/lib/data/players.ts` (ajout d'une fonction exportée)

- [ ] **Step 1: Ajouter la fonction**

Dans `src/lib/data/players.ts`, ajoute cette fonction exportée (par ex. juste au-dessus de `getPlayerTopAgents`) :

```ts
/**
 * Joueurs à suivre (landing) : meilleur rating moyen sur leurs parties.
 * Seuil minimum de cartes pour éviter qu'un joueur à 1 map monopolise le top ;
 * repli sur tous les joueurs si moins de `limit` qualifiés.
 */
export async function listTopPlayers(limit = 6) {
  const MIN_MAPS = 3;
  const rows = await db.playerGameStat.findMany({
    where: { playerId: { not: null } },
    select: {
      rating: true,
      player: {
        select: {
          id: true,
          pseudo: true,
          photo: true,
          nationality: true,
          memberships: {
            where: { leaveDate: null },
            take: 1,
            select: { team: { select: { tag: true } } },
          },
        },
      },
    },
  });

  type Agg = {
    id: string;
    pseudo: string;
    photo: string | null;
    nationality: string | null;
    teamTag: string | null;
    sum: number;
    games: number;
  };
  const byId = new Map<string, Agg>();
  for (const r of rows) {
    const p = r.player;
    if (!p) continue;
    const a =
      byId.get(p.id) ??
      {
        id: p.id,
        pseudo: p.pseudo,
        photo: p.photo,
        nationality: p.nationality,
        teamTag: p.memberships[0]?.team.tag ?? null,
        sum: 0,
        games: 0,
      };
    a.sum += r.rating;
    a.games += 1;
    byId.set(p.id, a);
  }

  const all = [...byId.values()].map((a) => ({
    id: a.id,
    pseudo: a.pseudo,
    photo: a.photo,
    nationality: a.nationality,
    teamTag: a.teamTag,
    rating: Math.round((a.sum / a.games) * 100) / 100,
    games: a.games,
  }));

  const qualified = all.filter((p) => p.games >= MIN_MAPS);
  const pool = qualified.length >= limit ? qualified : all;
  return pool.sort((x, y) => y.rating - x.rating).slice(0, limit);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0, aucune erreur.

- [ ] **Step 3: Vérifier les données (script tsx jetable)**

Crée `_v.ts` à la racine du projet :

```ts
import { listTopPlayers } from "@/lib/data/players";
(async () => {
  const top = await listTopPlayers(6);
  console.log("count:", top.length);
  for (const p of top) console.log(" -", p.pseudo, "| team", p.teamTag, "| rating", p.rating, "| games", p.games);
})();
```

Run: `npx tsx _v.ts` puis `rm -f _v.ts`
Expected: jusqu'à 6 joueurs, triés par `rating` décroissant, chacun avec `games >= 3` (sauf repli), un `teamTag` ou `null`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/players.ts
git commit -m "feat: listTopPlayers data function for landing"
```

---

## Task 2: Composant `PlayerMiniCard`

**Files:**
- Create: `src/components/player-mini-card.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
import Link from "next/link";
import Flag from "@/components/flag";

export type MiniPlayer = {
  id: string;
  pseudo: string;
  photo: string | null;
  nationality: string | null;
  teamTag: string | null;
  rating: number;
};

/** Carte joueur compacte pour la landing (joueurs à suivre). */
export default function PlayerMiniCard({ player }: { player: MiniPlayer }) {
  return (
    <Link href={`/joueurs/${player.id}`} className="card card-interactive flex items-center gap-3 p-3">
      {player.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.photo} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="monogram grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs">
          {player.pseudo.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {player.nationality && <Flag country={player.nationality} className="h-3 w-4" />}
          <span className="truncate font-semibold text-white">{player.pseudo}</span>
        </div>
        <div className="text-xs text-[var(--text-muted)]">{player.teamTag ?? "Sans équipe"}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="stat text-lg font-bold text-[var(--accent)]">{player.rating.toFixed(2)}</div>
        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Rating</div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/player-mini-card.tsx
git commit -m "feat: PlayerMiniCard component"
```

---

## Task 3: Composant `LandingFeatures`

**Files:**
- Create: `src/components/landing-features.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
const FEATURES = [
  { title: "Joueur", desc: "Crée ton profil, suis tes stats et ta carrière." },
  { title: "Équipe", desc: "Référence ton équipe, gère ton roster et tes résultats." },
  { title: "Compétition", desc: "Inscris-toi aux tournois — brackets et scoreboards." },
];

/** Bloc statique « Ta place dans le Hub » de la landing. */
export default function LandingFeatures() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {FEATURES.map((f) => (
        <div key={f.title} className="card p-5">
          <div className="text-base font-semibold text-[var(--accent)]">{f.title}</div>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing-features.tsx
git commit -m "feat: LandingFeatures block"
```

---

## Task 4: Réécrire `page.tsx` (landing complète)

**Files:**
- Rewrite: `src/app/page.tsx`

- [ ] **Step 1: Remplacer tout le contenu du fichier**

```tsx
import Link from "next/link";
import { auth, signIn } from "@/lib/auth";
import { listRecentResults } from "@/lib/data/matches";
import { listTournaments } from "@/lib/data/tournaments";
import { listTopPlayers, getPlayerByUserId } from "@/lib/data/players";
import MatchRow from "@/components/match-row";
import TournamentCard from "@/components/tournament-card";
import PlayerMiniCard from "@/components/player-mini-card";
import LandingFeatures from "@/components/landing-features";

const H2 = "mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]";
const BTN_PRIMARY =
  "rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90";

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const player = session?.user ? await getPlayerByUserId(session.user.id) : null;
  const profileHref = player ? `/joueurs/${player.id}` : "/profil";

  const [results, tournaments, topPlayers] = await Promise.all([
    listRecentResults(6),
    listTournaments(),
    listTopPlayers(6),
  ]);
  const liveOrUpcoming = tournaments.filter((t) => t.status !== "FINISHED").slice(0, 6);

  async function signInDiscord() {
    "use server";
    await signIn("discord");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <section
        className="mb-12 rounded-lg border border-[var(--border)] px-6 py-16 text-center"
        style={{ background: "radial-gradient(120% 100% at 50% 0%, var(--accent-soft) 0%, var(--surface) 55%)" }}
      >
        <div className="eyebrow mb-2">T3 Valorant<span className="dot-sep">·</span>France</div>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">The Hub</h1>
        <p className="mx-auto mt-3 max-w-xl text-[var(--text-muted)]">
          La maison du <span className="text-[var(--accent)]">Valorant Tier 3</span> francophone.
          Tournois, équipes et stats — au même endroit.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {isLoggedIn ? (
            <Link href={profileHref} className={BTN_PRIMARY}>
              Mon profil
            </Link>
          ) : (
            <form action={signInDiscord}>
              <button className={BTN_PRIMARY}>Connexion Discord</button>
            </form>
          )}
          <Link
            href="/tournois"
            className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Explorer les tournois
          </Link>
        </div>
      </section>

      {/* Tournois en cours / à venir */}
      {liveOrUpcoming.length > 0 && (
        <section className="mb-12">
          <div className="flex items-end justify-between">
            <h2 className={H2}>Tournois en cours / à venir</h2>
            <Link href="/tournois" className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]">
              Tout voir
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveOrUpcoming.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        </section>
      )}

      {/* Derniers résultats */}
      {results.length > 0 && (
        <section className="mb-12">
          <div className="flex items-end justify-between">
            <h2 className={H2}>Derniers résultats</h2>
            <Link href="/matchs" className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]">
              Tout voir
            </Link>
          </div>
          <div className="grid gap-2">
            {results.map((m) => (
              <MatchRow
                key={m.id}
                match={{
                  id: m.id,
                  teamAId: m.teamAId,
                  teamBId: m.teamBId,
                  scoreA: m.scoreA,
                  scoreB: m.scoreB,
                  winnerId: m.winnerId,
                  status: m.status,
                  date: m.date,
                  bestOf: m.bestOf,
                  vodUrl: m.vodUrl,
                  teamA: m.teamA ? { name: m.teamA.name, tag: m.teamA.tag, logo: m.teamA.logo } : null,
                  teamB: m.teamB ? { name: m.teamB.name, tag: m.teamB.tag, logo: m.teamB.logo } : null,
                  contextLabel: m.tournament.name,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Joueurs à suivre */}
      {topPlayers.length > 0 && (
        <section className="mb-12">
          <h2 className={H2}>Joueurs à suivre</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {topPlayers.map((p) => (
              <PlayerMiniCard key={p.id} player={p} />
            ))}
          </div>
        </section>
      )}

      {/* Rejoindre */}
      <section className="mb-12">
        <h2 className={H2}>Ta place dans le Hub</h2>
        <LandingFeatures />
      </section>

      {/* CTA finale */}
      <section
        className="rounded-lg border border-[var(--border)] px-6 py-14 text-center"
        style={{ background: "radial-gradient(120% 100% at 50% 100%, var(--accent-soft) 0%, var(--surface) 55%)" }}
      >
        <h2 className="text-2xl font-bold text-white">Prêt à jouer ?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
          Rejoins la communauté T3 Valorant francophone.
        </p>
        <div className="mt-5">
          {isLoggedIn ? (
            <Link href="/tournois" className={`inline-block ${BTN_PRIMARY}`}>
              Explorer les tournois
            </Link>
          ) : (
            <form action={signInDiscord}>
              <button className={BTN_PRIMARY}>Rejoindre — Connexion Discord</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0. (Si erreur sur `signIn`/`auth`, vérifier qu'ils sont bien exportés par `@/lib/auth` — ils le sont, `/profil` les utilise.)

- [ ] **Step 3: Vérifier le rendu (serveur dev déjà lancé sur :3200)**

Run: `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3200/"`
Expected: `200`.

Run (présence des sections, visiteur déconnecté) :
`curl -s "http://localhost:3200/" | grep -oE "The Hub|Connexion Discord|Tournois en cours|Derniers résultats|Joueurs à suivre|Ta place dans le Hub|Prêt à jouer" | sort -u`
Expected : les libellés des sections apparaissent (au moins « The Hub », « Connexion Discord », « Ta place dans le Hub », « Prêt à jouer » ; les sections de données apparaissent si la base seedée en contient).

- [ ] **Step 4: Contrôle visuel**

Ouvrir `http://localhost:3200/` (hard refresh). Vérifier : hero centré avec halo orange + 2 CTA, grille de tournois, liste de résultats, cartes « joueurs à suivre » avec rating, 3 cartes « rejoindre », bande CTA finale. DA cohérente (fond sombre, accent orange, mono sur les ratings).

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: landing page replaces homepage dashboard"
```

---

## Task 5: Vérification finale

- [ ] **Step 1: Typecheck global**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 2: Vérifier le comportement auth-aware du CTA (optionnel)**

Le CTA principal doit être « Connexion Discord » pour un visiteur déconnecté (form → `signInDiscord`) et « Mon profil » pour un utilisateur connecté (lien vers `profileHref`). Contrôle via `curl` déconnecté (voir Task 4 Step 3) ; le cas connecté se vérifie en session dans le navigateur.

- [ ] **Step 3: Confirmer que l'ancien dashboard n'existe plus**

`src/app/page.tsx` ne contient plus la grille « Derniers résultats + Tournois en cours / à venir » à 2 colonnes de l'ancien accueil (remplacée par la landing). Aucune autre route ne réintroduit le dashboard.

---

## Self-Review (rempli)

**Couverture du spec :**
- Hero épuré + CTA auth-aware, sans stat bar → Task 4 (hero). ✅
- Tournois en cours → Task 4 (section, `TournamentCard`, `listTournaments` filtré). ✅
- Derniers résultats → Task 4 (`MatchRow`, `listRecentResults`). ✅
- Joueurs à suivre (rating moyen, min 3 cartes) → Task 1 (`listTopPlayers`) + Task 2 (`PlayerMiniCard`) + Task 4 (section). ✅
- Bloc « Rejoindre » (3 features) → Task 3 (`LandingFeatures`) + Task 4. ✅
- CTA finale → Task 4. ✅
- Landing pour tout le monde, dashboard supprimé → Task 4 (réécriture complète) + Task 5 Step 3. ✅

**Placeholders :** aucun — code complet à chaque étape.

**Cohérence des types :** `listTopPlayers` renvoie `{ id, pseudo, photo, nationality, teamTag, rating, games }` ; `MiniPlayer` (Task 2) consomme exactement `{ id, pseudo, photo, nationality, teamTag, rating }` (le champ `games` en trop est ignoré, compatible structurellement). `PlayerMiniCard` reçoit `player` de ce type. ✅
