# Plan C — Refonte des accès (managers ↔ entité) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin` réservé aux admins ; les managers gèrent leur équipe/tournoi depuis `/equipes/[id]/gestion` et `/tournois/[id]/gestion` (délégation complète : identité, roster/compétition, invitation, inscrits, managers, suppression), avec un bouton « Gérer » sur les pages publiques, et un répertoire `/joueurs` filtré.

**Architecture:** Déplacement (`git mv`) des sous-pages de gestion hors de `/admin` vers des routes rattachées à l'entité, gardées par `assertCanManage*` (qui renvoient `true` pour un admin). Bascule des dernières actions `requireAdmin` → `assertCanManage*` (suppression + managers) avec garde-fou « dernier manager ». `/admin` ne garde que le global (création + listes). Filtre de visibilité sur `/joueurs`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Prisma, Auth.js v5.

**Prérequis :** Plans A et B appliqués (dont `src/app/equipes/actions.ts` pour l'invitation).
**Réfère la spec :** `docs/superpowers/specs/2026-07-25-profil-invitations-acces-design.md` §4, §5.

---

## Cartographie des déplacements

| Source (`/admin`) | Destination (entité) | Garde |
|---|---|---|
| `admin/equipes/[id]/page.tsx` | `equipes/[id]/gestion/page.tsx` (réécrit, hub) | canManageTeam |
| `admin/equipes/[id]/roster/page.tsx` | `equipes/[id]/gestion/roster/page.tsx` | canManageTeam |
| `admin/equipes/[id]/managers/page.tsx` | `equipes/[id]/gestion/managers/page.tsx` | canManageTeam |
| — (nouveau) | `equipes/[id]/gestion/invitation/page.tsx` | canManageTeam |
| `admin/tournois/[id]/page.tsx` | `tournois/[id]/gestion/page.tsx` (réécrit, hub) | canManageTournament |
| `admin/tournois/[id]/inscrits/page.tsx` | `tournois/[id]/gestion/inscrits/page.tsx` | canManageTournament |
| `admin/tournois/[id]/competition/page.tsx` | `tournois/[id]/gestion/competition/page.tsx` | canManageTournament |
| `admin/tournois/[id]/matchs/[matchId]/page.tsx` | `tournois/[id]/gestion/matchs/[matchId]/page.tsx` | canManageTournament |
| `admin/tournois/[id]/managers/page.tsx` | `tournois/[id]/gestion/managers/page.tsx` | canManageTournament |

Restent sous `/admin` (admin-only) : `admin/page.tsx`, `admin/equipes/page.tsx`, `admin/equipes/nouvelle/page.tsx`, `admin/tournois/page.tsx`, `admin/tournois/nouvelle/page.tsx`, `admin/joueurs/**`. Les **modules d'actions** restent dans `src/app/admin/actions/*` (imports internes, pas des routes visitées) ; seules leurs chaînes de redirection/revalidation changent.

---

### Task 1 : Filtre de visibilité `/joueurs` (répertoire + recherche)

**Files:**
- Modify: `src/lib/data/players.ts`
- Modify: `src/lib/data/search.ts`

- [ ] **Step 1 : Ne lister que les joueurs avec ≥ 1 adhésion**

Dans `src/lib/data/players.ts`, remplacer `listPlayers` :

```ts
export function listPlayers() {
  return db.player.findMany({
    where: { memberships: { some: {} } },
    orderBy: { pseudo: "asc" },
  });
}
```

- [ ] **Step 2 : Idem dans la recherche**

Dans `src/lib/data/search.ts`, dans le `db.player.findMany({ where: { OR: [...] } ... })`, envelopper la condition avec l'exigence d'adhésion :

```ts
    db.player.findMany({
      where: {
        AND: [
          { memberships: { some: {} } },
          {
            OR: [
              { pseudo: { contains: q, mode: "insensitive" } },
              { realName: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      orderBy: { pseudo: "asc" },
      take: 10,
      select: { id: true, pseudo: true, nationality: true, photo: true },
    }),
```

- [ ] **Step 3 : Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4 : Vérification manuelle**

`npm run dev` → `/joueurs` ne montre que des joueurs rostérés ; un compte fraîchement connecté sans équipe n'apparaît pas ; sa fiche reste accessible via `/profil` → « Voir ma fiche publique ».

- [ ] **Step 5 : Commit**

```bash
git add src/lib/data/players.ts src/lib/data/search.ts
git commit -m "feat: only list players with at least one membership"
```

---

### Task 2 : Actions — délégation suppression/managers + garde-fou + chemins gestion

**Files:**
- Modify: `src/app/admin/actions/teams.ts`
- Modify: `src/app/admin/actions/tournaments.ts`
- Modify: `src/app/admin/actions/matches.ts`
- Modify: `src/app/admin/actions/players.ts`

- [ ] **Step 1 : teams.ts — suppression déléguée + redirection**

Dans `src/app/admin/actions/teams.ts`, remplacer `createTeamAction`, `updateTeamAction`, `deleteTeamAction` par :

```ts
export async function createTeamAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = parseTeamForm(formData);
  const team = await createTeam(data, admin.id);
  await maybeStoreLogo(formData, team.id);
  revalidatePath("/equipes");
  revalidatePath("/admin/equipes");
  redirect(`/equipes/${team.id}/gestion`);
}

export async function updateTeamAction(teamId: string, formData: FormData) {
  await assertCanManageTeam(teamId);
  const data = parseTeamForm(formData);
  await updateTeam(teamId, data);
  await maybeStoreLogo(formData, teamId);
  revalidatePath("/equipes");
  revalidatePath(`/equipes/${teamId}`);
  revalidatePath(`/equipes/${teamId}/gestion`);
}

export async function deleteTeamAction(teamId: string) {
  await assertCanManageTeam(teamId);
  await deleteTeam(teamId);
  revalidatePath("/equipes");
  revalidatePath("/admin/equipes");
  redirect("/equipes");
}
```

- [ ] **Step 2 : teams.ts — managers délégués + garde-fou dernier manager**

Remplacer `addManagerAction` et `removeManagerAction` par :

```ts
export async function addManagerAction(teamId: string, formData: FormData) {
  await assertCanManageTeam(teamId);
  const base = `/equipes/${teamId}/gestion/managers`;
  const discordId = String(formData.get("discordId") ?? "").trim();
  if (!discordId) redirect(`${base}?error=empty`);
  const user = await db.user.findUnique({ where: { discordId }, select: { id: true } });
  if (!user) redirect(`${base}?error=notfound`);
  await addTeamManager(teamId, user.id);
  revalidatePath(base);
  redirect(base);
}

export async function removeManagerAction(teamId: string, userId: string) {
  await assertCanManageTeam(teamId);
  const base = `/equipes/${teamId}/gestion/managers`;
  const count = await db.teamManager.count({ where: { teamId } });
  if (count <= 1) redirect(`${base}?error=lastmanager`);
  await removeTeamManager(teamId, userId);
  revalidatePath(base);
}
```

- [ ] **Step 3 : tournaments.ts — suppression + participants + managers**

Dans `src/app/admin/actions/tournaments.ts` :

- `createTournamentAction` : remplacer `redirect(\`/admin/tournois/${t.id}\`)` par `redirect(\`/tournois/${t.id}/gestion\`)` (laisser inchangé `redirect("/admin/tournois/nouvelle?error=invalid")` et `revalidatePath("/admin/tournois")`).
- `updateTournamentAction` : remplacer `revalidatePath(\`/admin/tournois/${tournamentId}\`)` par `revalidatePath(\`/tournois/${tournamentId}/gestion\`)`.
- `deleteTournamentAction` : remplacer par :

```ts
export async function deleteTournamentAction(tournamentId: string) {
  await assertCanManageTournament(tournamentId);
  await deleteTournament(tournamentId);
  revalidatePath("/tournois");
  revalidatePath("/admin/tournois");
  redirect("/tournois");
}
```

- `addParticipantAction` / `removeParticipantAction` : remplacer la constante/chaîne `/admin/tournois/${tournamentId}/inscrits` par `/tournois/${tournamentId}/gestion/inscrits` (dans `addParticipantAction` c'est `const base = ...` ; dans `removeParticipantAction` c'est le `revalidatePath(...)`).
- `addTournamentManagerAction` / `removeTournamentManagerAction` : remplacer par :

```ts
export async function addTournamentManagerAction(tournamentId: string, formData: FormData) {
  await assertCanManageTournament(tournamentId);
  const base = `/tournois/${tournamentId}/gestion/managers`;
  const discordId = String(formData.get("discordId") ?? "").trim();
  if (!discordId) redirect(`${base}?error=empty`);
  const user = await db.user.findUnique({ where: { discordId }, select: { id: true } });
  if (!user) redirect(`${base}?error=notfound`);
  await addTournamentManager(tournamentId, user.id);
  revalidatePath(base);
  redirect(base);
}

export async function removeTournamentManagerAction(tournamentId: string, userId: string) {
  await assertCanManageTournament(tournamentId);
  const base = `/tournois/${tournamentId}/gestion/managers`;
  const count = await db.tournamentManager.count({ where: { tournamentId } });
  if (count <= 1) redirect(`${base}?error=lastmanager`);
  await removeTournamentManager(tournamentId, userId);
  revalidatePath(base);
}
```

- [ ] **Step 4 : matches.ts — chemins competition/matchs vers gestion**

Dans `src/app/admin/actions/matches.ts`, appliquer ces remplacements littéraux :
- `revalidateCompetition` : `` `/admin/tournois/${tournamentId}/competition` `` → `` `/tournois/${tournamentId}/gestion/competition` ``.
- `createGroupAction` et `createMatchAction` : `const base = \`/admin/tournois/${tournamentId}/competition\`` → `` `/tournois/${tournamentId}/gestion/competition` ``.
- `updateMatchAction` : `const editBase = \`/admin/tournois/${tournamentId}/matchs/${matchId}\`` → `` `/tournois/${tournamentId}/gestion/matchs/${matchId}` ``.
- `addMatchMapAction` et `removeMatchMapAction` : `revalidatePath(\`/admin/tournois/${tournamentId}/matchs/${matchId}\`)` → `` `/tournois/${tournamentId}/gestion/matchs/${matchId}` ``.

- [ ] **Step 5 : players.ts — chemins roster vers gestion**

Dans `src/app/admin/actions/players.ts`, remplacer **toutes** les occurrences de `` `/admin/equipes/${teamId}/roster` `` par `` `/equipes/${teamId}/gestion/roster` `` (dans `addRosterMemberAction`, `setMemberRoleAction`, `endMemberAction`, `removeMemberAction`).

- [ ] **Step 6 : Vérifier qu'aucune chaîne `/admin/…/[id]` de gestion ne subsiste dans les actions**

Run: `npx grep -rn "/admin/equipes/\${\|/admin/tournois/\${" src/app/admin/actions`
Expected: aucun résultat (les seuls `/admin/...` restants sont les listes/créations : `/admin/equipes`, `/admin/tournois`, `/admin/tournois/nouvelle`).

- [ ] **Step 7 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: aucune erreur (des pages référencent encore ces actions ; elles seront déplacées Tasks 3-4 — le typecheck reste OK car seules des chaînes changent).

```bash
git add src/app/admin/actions
git commit -m "feat: delegate delete/managers to entity managers, point actions at gestion routes"
```

---

### Task 3 : Routes de gestion équipe

**Files:**
- Move: `src/app/admin/equipes/[id]/roster/page.tsx` → `src/app/equipes/[id]/gestion/roster/page.tsx`
- Move: `src/app/admin/equipes/[id]/managers/page.tsx` → `src/app/equipes/[id]/gestion/managers/page.tsx`
- Delete+recreate: `src/app/admin/equipes/[id]/page.tsx` → `src/app/equipes/[id]/gestion/page.tsx`
- Create: `src/app/equipes/[id]/gestion/invitation/page.tsx`

- [ ] **Step 1 : Déplacer roster + managers**

Run:
```bash
mkdir -p "src/app/equipes/[id]/gestion/roster" "src/app/equipes/[id]/gestion/managers"
git mv "src/app/admin/equipes/[id]/roster/page.tsx" "src/app/equipes/[id]/gestion/roster/page.tsx"
git mv "src/app/admin/equipes/[id]/managers/page.tsx" "src/app/equipes/[id]/gestion/managers/page.tsx"
```

- [ ] **Step 2 : roster déplacé — corriger le lien retour**

Dans `src/app/equipes/[id]/gestion/roster/page.tsx`, remplacer `href={\`/admin/equipes/${id}\`}` par `href={\`/equipes/${id}/gestion\`}`. (La garde `canManageTeam` y est déjà correcte.)

- [ ] **Step 3 : managers déplacé — garde canManage + garde-fou dernier manager**

Dans `src/app/equipes/[id]/gestion/managers/page.tsx` :

Remplacer les imports de garde :
```ts
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
```

Remplacer le bloc de garde :
```ts
  const user = await getSessionUser();
  const managerIds = await getTeamManagerIds(id);
  if (!canManageTeam(user, managerIds)) redirect("/");
  const team = await getTeam(id);
  if (!team) notFound();
```

Étendre le message d'erreur pour couvrir `lastmanager` (remplacer le bloc `{error && ( ... )}`) :
```tsx
      {error && (
        <p className="mb-4 rounded border border-[var(--destructive)] bg-[var(--destructive-soft)] px-3 py-2 text-sm text-[var(--destructive)]">
          {error === "notfound"
            ? "Aucun utilisateur avec cet ID Discord. Il doit s'être connecté au moins une fois via Discord pour exister en base."
            : error === "lastmanager"
              ? "Impossible de retirer le dernier manager de l'équipe."
              : "Renseigne l'ID Discord de l'utilisateur."}
        </p>
      )}
```

(Les imports d'actions `@/app/admin/actions/teams` restent valides.)

- [ ] **Step 4 : Créer le hub de gestion équipe**

Supprimer l'ancienne page détail admin et créer le hub :
```bash
git rm "src/app/admin/equipes/[id]/page.tsx"
```

Créer `src/app/equipes/[id]/gestion/page.tsx` :

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
import { getTeam } from "@/lib/data/teams";
import TeamForm from "@/components/team-form";
import { updateTeamAction, deleteTeamAction } from "@/app/admin/actions/teams";

export default async function TeamGestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  const user = await getSessionUser();
  const managerIds = await getTeamManagerIds(id);
  if (!canManageTeam(user, managerIds)) redirect("/");

  const updateWithId = updateTeamAction.bind(null, id);
  const deleteWithId = deleteTeamAction.bind(null, id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Gérer · {team.name}</h1>
        <Link href={`/equipes/${id}`} className="text-sm text-[var(--text-muted)]">
          ← Voir la page publique
        </Link>
      </div>

      <nav className="mb-8 flex flex-wrap gap-4 text-sm text-[var(--accent-2)]">
        <Link href={`/equipes/${id}/gestion/roster`}>Roster →</Link>
        <Link href={`/equipes/${id}/gestion/invitation`}>Lien d'invitation →</Link>
        <Link href={`/equipes/${id}/gestion/managers`}>Managers →</Link>
      </nav>

      <h2 className="mb-3 text-lg font-semibold text-white">Identité</h2>
      <TeamForm
        action={updateWithId}
        submitLabel="Enregistrer"
        values={{
          name: team.name,
          tag: team.tag,
          region: team.region,
          description: team.description ?? undefined,
          status: team.status,
          socials: (team.socials ?? {}) as { twitter?: string; twitch?: string; website?: string },
        }}
      />

      <section className="mt-10 rounded-lg border border-[var(--destructive)] p-4">
        <h2 className="mb-2 text-lg font-semibold text-[var(--destructive)]">Zone danger</h2>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          La suppression de l'équipe est définitive (roster, historiques et participations liées).
        </p>
        <form action={deleteWithId}>
          <button className="rounded border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent)]">
            Supprimer l'équipe
          </button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 5 : Créer la page Invitation**

Créer `src/app/equipes/[id]/gestion/invitation/page.tsx` :

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
import { getTeam } from "@/lib/data/teams";
import { isInviteValid } from "@/lib/invite";
import { generateInviteAction, revokeInviteAction } from "@/app/equipes/actions";

export default async function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  const user = await getSessionUser();
  const managerIds = await getTeamManagerIds(id);
  if (!canManageTeam(user, managerIds)) redirect("/");

  const valid = isInviteValid(team, new Date());
  const generateWithId = generateInviteAction.bind(null, id);
  const revokeWithId = revokeInviteAction.bind(null, id);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const link = valid ? `${base}/rejoindre/${team.inviteToken}` : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Lien d'invitation · {team.name}</h1>
        <Link href={`/equipes/${id}/gestion`} className="text-sm text-[var(--text-muted)]">
          ← Retour
        </Link>
      </div>

      {link ? (
        <div className="rounded-lg border border-[var(--border)] p-4">
          <p className="mb-2 text-sm text-[var(--text-muted)]">
            Lien actif (expire le {new Date(team.inviteExpiresAt!).toLocaleDateString("fr-FR")}) :
          </p>
          <code className="block break-all rounded bg-[var(--surface)] px-3 py-2 text-sm text-white">
            {link}
          </code>
          <div className="mt-4 flex gap-2">
            <form action={generateWithId}>
              <button className="rounded bg-[var(--card)] px-3 py-1.5 text-sm text-white">
                Régénérer
              </button>
            </form>
            <form action={revokeWithId}>
              <button className="rounded px-3 py-1.5 text-sm text-[var(--accent)]">Révoquer</button>
            </form>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] p-4">
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Aucun lien actif. Génère un lien à partager (valable 7 jours, réutilisable).
          </p>
          <form action={generateWithId}>
            <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
              Générer un lien
            </button>
          </form>
        </div>
      )}
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Toute personne avec ce lien peut rejoindre l'équipe tant qu'il est valide. Révoque-le pour
        le désactiver immédiatement.
      </p>
    </main>
  );
}
```

> `NEXT_PUBLIC_BASE_URL` (optionnel) donne l'URL absolue à copier. Si absente, le chemin relatif `/rejoindre/<token>` s'affiche — fonctionnel en local. L'ajouter à `.env.example` : `NEXT_PUBLIC_BASE_URL="http://localhost:3200"`.

- [ ] **Step 6 : Ajouter NEXT_PUBLIC_BASE_URL à .env.example**

Ajouter la ligne à `.env.example` :
```
NEXT_PUBLIC_BASE_URL="http://localhost:3200"
```

- [ ] **Step 7 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

```bash
git add "src/app/equipes" ".env.example"
git commit -m "feat: team gestion routes (hub, roster, managers, invitation)"
```

---

### Task 4 : Routes de gestion tournoi

**Files:**
- Move: `admin/tournois/[id]/inscrits`, `competition`, `matchs/[matchId]`, `managers` → sous `tournois/[id]/gestion/`
- Delete+recreate: `admin/tournois/[id]/page.tsx` → `tournois/[id]/gestion/page.tsx`

- [ ] **Step 1 : Déplacer les sous-pages**

Run:
```bash
mkdir -p "src/app/tournois/[id]/gestion"
git mv "src/app/admin/tournois/[id]/inscrits" "src/app/tournois/[id]/gestion/inscrits"
git mv "src/app/admin/tournois/[id]/competition" "src/app/tournois/[id]/gestion/competition"
git mv "src/app/admin/tournois/[id]/matchs" "src/app/tournois/[id]/gestion/matchs"
git mv "src/app/admin/tournois/[id]/managers/page.tsx" "src/app/tournois/[id]/gestion/managers/page.tsx"
```

- [ ] **Step 2 : Remplacer les chemins `/admin/tournois/[id]` internes dans les pages déplacées**

Dans chacun des fichiers déplacés (`inscrits/page.tsx`, `competition/page.tsx`, `matchs/[matchId]/page.tsx`), remplacer toute chaîne littérale `` `/admin/tournois/${id}` `` / `` `/admin/tournois/${...}/...` `` et liens `href="/admin/tournois/..."` par l'équivalent `/tournois/${...}/gestion/...`.

Run pour localiser :
```bash
npx grep -rn "/admin/tournois" "src/app/tournois/[id]/gestion"
```
Remplacer chaque occurrence en insérant `/gestion` après l'identifiant du tournoi (ex. `/admin/tournois/${id}/competition` → `/tournois/${id}/gestion/competition` ; `/admin/tournois/${tournamentId}/matchs/${matchId}` → `/tournois/${tournamentId}/gestion/matchs/${matchId}`). Vérifier ensuite : la commande grep ne renvoie plus rien.

- [ ] **Step 3 : managers tournoi déplacé — garde canManage + garde-fou**

Dans `src/app/tournois/[id]/gestion/managers/page.tsx` :

Remplacer les imports de garde :
```ts
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";
```

Remplacer le bloc de garde :
```ts
  const user = await getSessionUser();
  const managerIds = await getTournamentManagerIds(id);
  if (!canManageTournament(user, managerIds)) redirect("/");
  const tournament = await getTournament(id);
  if (!tournament) notFound();
```

Étendre le message d'erreur (remplacer le bloc `{error && ( ... )}`) :
```tsx
      {error && (
        <p className="mb-4 rounded border border-[var(--destructive)] bg-[var(--destructive-soft)] px-3 py-2 text-sm text-[var(--destructive)]">
          {error === "notfound"
            ? "Aucun utilisateur avec cet ID Discord. Il doit s'être connecté au moins une fois via Discord pour exister en base."
            : error === "lastmanager"
              ? "Impossible de retirer le dernier manager du tournoi."
              : "Renseigne l'ID Discord de l'utilisateur."}
        </p>
      )}
```

- [ ] **Step 4 : Créer le hub de gestion tournoi**

```bash
git rm "src/app/admin/tournois/[id]/page.tsx"
```

Créer `src/app/tournois/[id]/gestion/page.tsx` :

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";
import { getTournament } from "@/lib/data/tournaments";
import TournamentForm from "@/components/tournament-form";
import { updateTournamentAction, deleteTournamentAction } from "@/app/admin/actions/tournaments";

function toDateInput(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function TournamentGestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const user = await getSessionUser();
  const managerIds = await getTournamentManagerIds(id);
  if (!canManageTournament(user, managerIds)) redirect("/");

  const updateWithId = updateTournamentAction.bind(null, id);
  const deleteWithId = deleteTournamentAction.bind(null, id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Gérer · {tournament.name}</h1>
        <Link href={`/tournois/${id}`} className="text-sm text-[var(--text-muted)]">
          ← Voir la page publique
        </Link>
      </div>

      <nav className="mb-8 flex flex-wrap gap-4 text-sm text-[var(--accent-2)]">
        <Link href={`/tournois/${id}/gestion/inscrits`}>Inscrits →</Link>
        <Link href={`/tournois/${id}/gestion/competition`}>Poules &amp; matchs →</Link>
        <Link href={`/tournois/${id}/gestion/managers`}>Managers →</Link>
      </nav>

      <h2 className="mb-3 text-lg font-semibold text-white">Identité</h2>
      <TournamentForm
        action={updateWithId}
        submitLabel="Enregistrer"
        values={{
          name: tournament.name,
          region: tournament.region,
          format: tournament.format,
          status: tournament.status,
          startDate: toDateInput(tournament.startDate),
          endDate: toDateInput(tournament.endDate),
          prizePool: tournament.prizePool ?? undefined,
          organizer: tournament.organizer ?? undefined,
          description: tournament.description ?? undefined,
        }}
      />

      <section className="mt-10 rounded-lg border border-[var(--destructive)] p-4">
        <h2 className="mb-2 text-lg font-semibold text-[var(--destructive)]">Zone danger</h2>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          La suppression du tournoi est définitive (poules, matchs et inscriptions liés).
        </p>
        <form action={deleteWithId}>
          <button className="rounded border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent)]">
            Supprimer le tournoi
          </button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 5 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

```bash
git add "src/app/tournois" "src/app/admin/tournois"
git commit -m "feat: tournament gestion routes (hub, inscrits, competition, matchs, managers)"
```

---

### Task 5 : Alléger `/admin` (listes → gestion)

**Files:**
- Modify: `src/app/admin/equipes/page.tsx`
- Modify: `src/app/admin/tournois/page.tsx`

- [ ] **Step 1 : Rediriger les liens d'item vers les hubs gestion**

Dans `src/app/admin/equipes/page.tsx`, remplacer les liens de gestion par item pointant vers `` `/admin/equipes/${...}` `` par `` `/equipes/${...}/gestion` ``.

Dans `src/app/admin/tournois/page.tsx`, remplacer `` `/admin/tournois/${...}` `` par `` `/tournois/${...}/gestion` ``.

Run pour localiser :
```bash
npx grep -rn "/admin/equipes/\${\|/admin/tournois/\${" "src/app/admin/equipes/page.tsx" "src/app/admin/tournois/page.tsx"
```
Remplacer chaque occurrence, puis re-grep → aucun résultat.

- [ ] **Step 2 : Vérifier qu'aucune route `/admin/equipes/[id]` ou `/admin/tournois/[id]` ne subsiste**

Run:
```bash
npx glob "src/app/admin/equipes/[id]/**" ; npx glob "src/app/admin/tournois/[id]/**"
```
Expected: plus aucun fichier (tout est passé sous `gestion`). Si des dossiers vides subsistent, les supprimer.

- [ ] **Step 3 : Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

```bash
git add "src/app/admin"
git commit -m "refactor: admin lists link to entity gestion routes"
```

---

### Task 6 : Bouton « Gérer » sur les pages publiques

**Files:**
- Modify: `src/app/equipes/[id]/page.tsx`
- Modify: `src/app/tournois/[id]/page.tsx`

- [ ] **Step 1 : Page équipe publique — calcul canManage + bouton**

Dans `src/app/equipes/[id]/page.tsx`, ajouter les imports :
```ts
import { getSessionUser, getTeamManagerIds } from "@/lib/server-auth";
import { canManageTeam } from "@/lib/permissions";
```

Après le calcul de `team` (juste après `if (!team) notFound();`), ajouter :
```ts
  const sessionUser = await getSessionUser();
  const canManage = canManageTeam(sessionUser, await getTeamManagerIds(team.id));
```

Dans l'en-tête (zone du titre de l'équipe), insérer le bouton conditionnel :
```tsx
      {canManage && (
        <Link
          href={`/equipes/${team.id}/gestion`}
          className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
        >
          Gérer l'équipe
        </Link>
      )}
```
(Le placer dans le conteneur d'en-tête, aligné à droite du titre — ex. via un wrapper `flex items-center justify-between`.)

- [ ] **Step 2 : Page tournoi publique — calcul canManage + bouton**

Dans `src/app/tournois/[id]/page.tsx`, ajouter les imports :
```ts
import { getSessionUser, getTournamentManagerIds } from "@/lib/server-auth";
import { canManageTournament } from "@/lib/permissions";
```

Après `if (!tournament) notFound();`, ajouter :
```ts
  const sessionUser = await getSessionUser();
  const canManage = canManageTournament(sessionUser, await getTournamentManagerIds(id));
```

Dans le bloc d'en-tête (`<div className="flex items-center gap-4">` … après le bloc titre `<div>…</div>`), insérer avant la fermeture du conteneur d'en-tête :
```tsx
        {canManage && (
          <Link
            href={`/tournois/${id}/gestion`}
            className="ml-auto rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
          >
            Gérer le tournoi
          </Link>
        )}
```

- [ ] **Step 3 : Typecheck + rendu**

Run: `npx tsc --noEmit`
Expected: aucune erreur. `npm run dev` → connecté en admin/manager, le bouton « Gérer » apparaît sur la page publique ; anonyme/simple user, il n'apparaît pas.

- [ ] **Step 4 : Commit**

```bash
git add "src/app/equipes/[id]/page.tsx" "src/app/tournois/[id]/page.tsx"
git commit -m "feat: Gérer button on public team/tournament pages for managers"
```

---

### Task 7 : Vérification RBAC de bout en bout

**Files:** (aucun — vérification)

- [ ] **Step 1 : Typecheck global + tests unitaires**

Run: `npx tsc --noEmit && npm run test`
Expected: typecheck OK, tous les tests unitaires PASS.

- [ ] **Step 2 : Vérifier plus aucune route de gestion sous /admin**

Run: `npx glob "src/app/admin/**/[id]/**"`
Expected: aucun résultat.

- [ ] **Step 3 : Vérifs manuelles (npm run dev)**

- Admin : `/admin` accessible ; cartes équipes/tournois → hub `gestion` de l'entité.
- Manager d'équipe (non-admin) : `/admin` → redirigé vers `/` ; page publique de SON équipe → bouton « Gérer » → `/equipes/[id]/gestion` accessible ; roster/invitation/managers/suppression OK ; équipe qu'il ne manage pas → pas de bouton, `/equipes/[autre]/gestion` → redirigé `/`.
- Manager de tournoi : symétrique.
- Garde-fou : tenter de retirer le dernier manager → message « Impossible de retirer le dernier manager ».
- User simple : aucun bouton « Gérer », `/profil` OK.

- [ ] **Step 4 : Commit (si ajustements)**

```bash
git add -A
git commit -m "test: manual RBAC verification pass for access refactor"
```

---

## Self-review (Plan C)

- **Couverture spec :** §4.1 (routes gestion équipe/tournoi, sections identité/roster/compétition/inscrits/invitation/managers/danger) Tasks 3-4 ; §4.2 (migration des routes hors /admin + actions pointant gestion + gardes canManage) Tasks 2-4 ; §4.3 (/admin allégé) Task 5 ; §4.4 (bouton « Gérer », lien Profil via Plan A) Task 6 ; §4.5 (garde-fou dernier manager) Task 2 ; §5 (visibilité /joueurs) Task 1. Délégation complète (suppression + managers) : Task 2.
- **Types cohérents :** gardes `canManageTeam`/`canManageTournament` + `getTeamManagerIds`/`getTournamentManagerIds` réutilisées (server-auth existant) ; `isInviteValid` + `generateInviteAction`/`revokeInviteAction` viennent des Plans B ; chemins de redirection/revalidation homogènes `/equipes/${id}/gestion/*` et `/tournois/${id}/gestion/*`.
- **Pas de placeholder.** Déplacements via `git mv` + remplacements de chaînes explicites listés ; nouveau code (hubs, invitation, boutons, garde-fou) fourni en entier.
- **Note de sécurité :** toutes les écritures restent derrière `assertCanManage*`/`requireAdmin` ; la création d'entités reste admin-only ; le garde-fou empêche l'orphelinage de managers.
```
