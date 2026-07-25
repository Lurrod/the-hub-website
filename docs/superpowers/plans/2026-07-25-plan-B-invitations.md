# Plan B — Invitations d'équipe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un manager de générer/révoquer un lien d'invitation d'équipe, et à un joueur de rejoindre l'équipe via `/rejoindre/[token]` (connexion Discord si besoin, blocage s'il est déjà dans une équipe).

**Architecture:** Champs `inviteToken`/`inviteExpiresAt` sur `Team` (créés Plan A). Validité du lien = fonction pure testable `isInviteValid`. Server Actions : `generateInvite`/`revokeInvite` (gardées `assertCanManageTeam`) et `joinTeamViaInvite` (revalidation serveur complète). Page publique `/rejoindre/[token]`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Prisma, Auth.js v5, Vitest, `node:crypto`.

**Prérequis :** Plan A appliqué (migration, `getPlayerByUserId`, `getActiveMembership`, `ensurePlayerForUser`).
**Réfère la spec :** `docs/superpowers/specs/2026-07-25-profil-invitations-acces-design.md` §3, §1.4.

---

## Structure de fichiers (Plan B)

```
src/lib/
  invite.ts                       # CREATE: isInviteValid (pure) + constante TTL
  data/teams.ts                   # MODIF: generateTeamInvite, revokeTeamInvite, getTeamByInviteToken
  data/players.ts                 # MODIF: addPlayerToTeam
src/app/
  equipes/actions.ts              # CREATE: generateInviteAction, revokeInviteAction (manager)
  rejoindre/actions.ts            # CREATE: joinTeamViaInviteAction
  rejoindre/[token]/page.tsx      # CREATE: page d'acceptation
tests/unit/
  invite.test.ts                  # CREATE: tests isInviteValid
```

---

### Task 1 : Fonction de validité du lien (pure, TDD)

**Files:**
- Create: `src/lib/invite.ts`
- Test: `tests/unit/invite.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `tests/unit/invite.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { isInviteValid } from "@/lib/invite";

const now = new Date("2026-07-25T12:00:00Z");
const future = new Date("2026-07-30T12:00:00Z");
const past = new Date("2026-07-20T12:00:00Z");

describe("isInviteValid", () => {
  it("valide si token présent et non expiré", () => {
    expect(isInviteValid({ inviteToken: "abc", inviteExpiresAt: future }, now)).toBe(true);
  });
  it("invalide si expiré", () => {
    expect(isInviteValid({ inviteToken: "abc", inviteExpiresAt: past }, now)).toBe(false);
  });
  it("invalide si pas de token", () => {
    expect(isInviteValid({ inviteToken: null, inviteExpiresAt: future }, now)).toBe(false);
  });
  it("invalide si pas d'expiration", () => {
    expect(isInviteValid({ inviteToken: "abc", inviteExpiresAt: null }, now)).toBe(false);
  });
  it("invalide si team null", () => {
    expect(isInviteValid(null, now)).toBe(false);
  });
});
```

- [ ] **Step 2 : Lancer — échoue**

Run: `npm run test -- invite`
Expected: FAIL (`isInviteValid` n'existe pas).

- [ ] **Step 3 : Implémenter**

Créer `src/lib/invite.ts` :

```ts
export const INVITE_TTL_DAYS = 7;

type InviteFields = { inviteToken: string | null; inviteExpiresAt: Date | null };

/** Un lien est valable s'il a un token ET une expiration future. */
export function isInviteValid(team: InviteFields | null, now: Date): boolean {
  if (!team || !team.inviteToken || !team.inviteExpiresAt) return false;
  return team.inviteExpiresAt.getTime() > now.getTime();
}
```

- [ ] **Step 4 : Lancer — passe**

Run: `npm run test -- invite`
Expected: PASS (5 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/invite.ts tests/unit/invite.test.ts
git commit -m "feat: invite validity helper with tests"
```

---

### Task 2 : Data layer — génération/révocation/lookup du lien

**Files:**
- Modify: `src/lib/data/teams.ts`
- Modify: `src/lib/data/players.ts`

- [ ] **Step 1 : Ajouter les fonctions d'invitation dans teams.ts**

En haut de `src/lib/data/teams.ts`, ajouter les imports :

```ts
import { randomBytes } from "node:crypto";
import { INVITE_TTL_DAYS } from "@/lib/invite";
```

À la fin du fichier, ajouter :

```ts
/** Génère (ou régénère) le lien d'invitation de l'équipe : nouveau token + expiration TTL. */
export function generateTeamInvite(teamId: string) {
  const token = randomBytes(24).toString("base64url");
  const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  return db.team.update({ where: { id: teamId }, data: { inviteToken: token, inviteExpiresAt } });
}

/** Révoque le lien d'invitation (token + expiration à null). */
export function revokeTeamInvite(teamId: string) {
  return db.team.update({
    where: { id: teamId },
    data: { inviteToken: null, inviteExpiresAt: null },
  });
}

/** Équipe correspondant à un token d'invitation (ou null). */
export function getTeamByInviteToken(token: string) {
  return db.team.findUnique({ where: { inviteToken: token } });
}
```

- [ ] **Step 2 : Ajouter addPlayerToTeam dans players.ts**

À la fin de `src/lib/data/players.ts`, ajouter :

```ts
/** Ajoute un joueur au roster d'une équipe (rôle JOUEUR par défaut). */
export function addPlayerToTeam(
  teamId: string,
  playerId: string,
  role: MembershipRole = "JOUEUR"
) {
  return db.teamMembership.create({ data: { teamId, playerId, role } });
}
```

(`MembershipRole` est déjà importé en tête de `players.ts`.)

- [ ] **Step 3 : Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/lib/data/teams.ts src/lib/data/players.ts
git commit -m "feat: team invite data helpers (generate, revoke, lookup, join)"
```

---

### Task 3 : Server Actions manager — générer / révoquer le lien

**Files:**
- Create: `src/app/equipes/actions.ts`

- [ ] **Step 1 : Créer les actions gardées**

Créer `src/app/equipes/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { assertCanManageTeam } from "@/lib/server-auth";
import { generateTeamInvite, revokeTeamInvite } from "@/lib/data/teams";

export async function generateInviteAction(teamId: string) {
  await assertCanManageTeam(teamId);
  await generateTeamInvite(teamId);
  revalidatePath(`/equipes/${teamId}/gestion`);
}

export async function revokeInviteAction(teamId: string) {
  await assertCanManageTeam(teamId);
  await revokeTeamInvite(teamId);
  revalidatePath(`/equipes/${teamId}/gestion`);
}
```

> Note : ces actions sont consommées par la section « Invitation » de `/equipes/[id]/gestion` construite au **Plan C**. Elles sont livrées ici avec la feature d'invitation.

- [ ] **Step 2 : Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/app/equipes/actions.ts
git commit -m "feat: manager actions to generate/revoke team invite link"
```

---

### Task 4 : Server Action — rejoindre via lien

**Files:**
- Create: `src/app/rejoindre/actions.ts`

- [ ] **Step 1 : Créer l'action de join (revalidation serveur complète)**

Créer `src/app/rejoindre/actions.ts` :

```ts
"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { getTeamByInviteToken } from "@/lib/data/teams";
import { getPlayerByUserId, getActiveMembership, addPlayerToTeam } from "@/lib/data/players";
import { isInviteValid } from "@/lib/invite";

export async function joinTeamViaInviteAction(token: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const team = await getTeamByInviteToken(token);
  if (!isInviteValid(team, new Date())) throw new Error("INVALID_INVITE");

  const player = await getPlayerByUserId(user.id);
  if (!player) throw new Error("NO_PLAYER");

  const active = await getActiveMembership(player.id);
  if (active) {
    // Déjà dans cette équipe → on renvoie simplement vers la page équipe.
    if (active.teamId === team!.id) redirect(`/equipes/${team!.id}`);
    // Déjà dans une autre équipe → refus (l'UI doit avoir bloqué en amont).
    throw new Error("ALREADY_IN_TEAM");
  }

  await addPlayerToTeam(team!.id, player.id, "JOUEUR");
  redirect(`/equipes/${team!.id}`);
}
```

- [ ] **Step 2 : Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/app/rejoindre/actions.ts
git commit -m "feat: joinTeamViaInvite server action with server-side revalidation"
```

---

### Task 5 : Page d'acceptation `/rejoindre/[token]`

**Files:**
- Create: `src/app/rejoindre/[token]/page.tsx`

- [ ] **Step 1 : Créer la page (tous les cas du flux)**

Créer `src/app/rejoindre/[token]/page.tsx` :

```tsx
import Link from "next/link";
import { auth, signIn } from "@/lib/auth";
import { getTeamByInviteToken } from "@/lib/data/teams";
import { ensurePlayerForUser, getActiveMembership } from "@/lib/data/players";
import { isInviteValid } from "@/lib/invite";
import { joinTeamViaInviteAction } from "@/app/rejoindre/actions";

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-md px-4 py-16 text-center">{children}</main>;
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const team = await getTeamByInviteToken(token);

  if (!isInviteValid(team, new Date())) {
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-bold text-white">Lien invalide ou expiré</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Ce lien d'invitation n'est plus valable. Demande un nouveau lien au manager de l'équipe.
        </p>
      </Shell>
    );
  }

  const session = await auth();

  // Non connecté → créer un compte / se connecter avec Discord.
  if (!session?.user) {
    return (
      <Shell>
        <h1 className="mb-2 text-2xl font-bold text-white">Rejoindre {team!.name}</h1>
        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Connecte-toi avec Discord pour rejoindre cette équipe. Un compte sera créé si tu n'en as pas.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: `/rejoindre/${token}` });
          }}
        >
          <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
            Se connecter avec Discord
          </button>
        </form>
      </Shell>
    );
  }

  // Connecté : garantir la fiche joueur, puis vérifier l'adhésion active.
  const player = await ensurePlayerForUser(session.user.id, {
    pseudo: session.user.name,
    photo: session.user.image,
  });
  const active = await getActiveMembership(player.id);

  if (active && active.teamId === team!.id) {
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-bold text-white">Tu es déjà dans {team!.name}</h1>
        <Link href={`/equipes/${team!.id}`} className="text-sm text-[var(--accent-2)]">
          Voir l'équipe →
        </Link>
      </Shell>
    );
  }

  if (active) {
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-bold text-white">Tu dois d'abord quitter ton équipe</h1>
        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Tu fais déjà partie de <span className="text-white">{active.team.name}</span>. Quitte-la
          depuis ton profil avant de rejoindre {team!.name}.
        </p>
        <Link
          href="/profil"
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Aller à mon profil
        </Link>
      </Shell>
    );
  }

  // Sans équipe → rejoindre.
  const joinWithToken = joinTeamViaInviteAction.bind(null, token);
  return (
    <Shell>
      <h1 className="mb-2 text-2xl font-bold text-white">Rejoindre {team!.name}</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Tu vas rejoindre le roster de <span className="text-white">{team!.name}</span> en tant que
        joueur.
      </p>
      <form action={joinWithToken}>
        <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
          Rejoindre l'équipe
        </button>
      </form>
    </Shell>
  );
}
```

- [ ] **Step 2 : Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/app/rejoindre/[token]/page.tsx
git commit -m "feat: /rejoindre/[token] team invite acceptance page"
```

---

### Task 6 : Vérification manuelle du flux complet

**Files:** (aucun — vérification)

- [ ] **Step 1 : Générer un token de test sur l'équipe seed**

Run (PowerShell, depuis la racine) :
```bash
node -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();db.team.update({where:{id:'seed-team-alpha'},data:{inviteToken:'DEMO_TOKEN_123',inviteExpiresAt:new Date(Date.now()+7*864e5)}}).then(t=>console.log('OK',t.inviteToken)).finally(()=>db.$disconnect())"
```
Expected: `OK DEMO_TOKEN_123`.

- [ ] **Step 2 : Cas non connecté**

`npm run dev`, en navigation privée (déconnecté) ouvrir `http://localhost:3200/rejoindre/DEMO_TOKEN_123`.
Expected: écran « Rejoindre Alpha Esports » + bouton « Se connecter avec Discord ».

- [ ] **Step 3 : Cas connecté sans équipe → rejoint**

Se connecter (Discord), rouvrir le lien.
Expected: bouton « Rejoindre l'équipe » → clic → redirection vers `/equipes/seed-team-alpha`, et le joueur apparaît dans le roster.

- [ ] **Step 4 : Cas déjà en équipe → blocage**

Recharger `/rejoindre/DEMO_TOKEN_123`.
Expected : écran « Tu es déjà dans Alpha Esports ». Pour tester le cas « autre équipe », générer un token sur une autre équipe (`vct-team-fnc`) et l'ouvrir → écran « Tu dois d'abord quitter ton équipe » + lien profil.

- [ ] **Step 5 : Cas expiré**

Run :
```bash
node -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();db.team.update({where:{id:'seed-team-alpha'},data:{inviteExpiresAt:new Date(Date.now()-1000)}}).then(()=>console.log('expired')).finally(()=>db.$disconnect())"
```
Ouvrir le lien → Expected : « Lien invalide ou expiré ».

- [ ] **Step 6 : Nettoyer le token de démo (optionnel)**

Run :
```bash
node -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();db.team.update({where:{id:'seed-team-alpha'},data:{inviteToken:null,inviteExpiresAt:null}}).then(()=>console.log('cleaned')).finally(()=>db.$disconnect())"
```

---

## Self-review (Plan B)

- **Couverture spec :** §3.1 (generate/revoke, TTL 7 j, régénérable) Tasks 2-3 ; §3.2 (page `/rejoindre` : invalide/expiré, non connecté, déjà ici, déjà ailleurs, rejoint) Task 5 ; §3.3 (join revalidé serveur : token+expiry+pas d'adhésion active) Task 4 ; §1.4 invariant « une équipe active » vérifié dans l'action et l'UI.
- **Types cohérents :** `isInviteValid(team|null, now)`, `getTeamByInviteToken(token)`, `generateTeamInvite`/`revokeTeamInvite(teamId)`, `addPlayerToTeam(teamId, playerId, role?)`, `joinTeamViaInviteAction(token)` — signatures identiques entre définition et usage. Rôle par défaut `"JOUEUR"` cohérent avec Plan A.
- **Dépendance UI :** le bouton générer/révoquer vit dans `/equipes/[id]/gestion` (Plan C) ; les actions sont prêtes et testées manuellement ici via un token injecté.
- **Pas de placeholder.**
