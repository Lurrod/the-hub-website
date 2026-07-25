# Plan A — Fondations data & Profil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser les fondations data (lien `User↔Player`, champs d'invitation sur `Team`, rôle `JOUEUR`), l'auto-création de la fiche joueur à la connexion, et la page `/profil` (édition + quitter l'équipe).

**Architecture:** Prisma migration en place (rename d'enum sans perte de données) ; helper `ensurePlayerForUser` appelé à la connexion (event `linkAccount`) et paresseusement au chargement de `/profil` ; page serveur `/profil` avec Server Actions `updateMyProfile` / `leaveMyTeam`. Réutilise la validation Zod et la lib d'images existantes.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Prisma, PostgreSQL, Auth.js v5 (Discord), Zod, Vitest.

**Réfère la spec :** `docs/superpowers/specs/2026-07-25-profil-invitations-acces-design.md` §1, §2, §5(dépendance).

---

## Structure de fichiers (Plan A)

```
prisma/
  schema.prisma                         # MODIF: Player.userId, User.player, Team.invite*, enum JOUEUR
  migrations/<ts>_profil_foundations/
    migration.sql                       # CREATE: SQL manuel (rename enum + colonnes)
  seed-dev.ts                           # MODIF: "STARTER" -> "JOUEUR"
src/lib/
  validation/player.ts                  # MODIF: MEMBERSHIP_ROLES, défaut JOUEUR
  data/players.ts                       # MODIF: + getPlayerByUserId, ensurePlayerForUser, getActiveMembership
  player-photo.ts                       # CREATE: helper DRY storePlayerPhotoFromForm
  auth.ts                               # MODIF: auto-création Player dans linkAccount
src/app/
  admin/actions/players.ts              # MODIF: "STARTER" -> "JOUEUR" + utilise player-photo.ts
  admin/equipes/[id]/roster/page.tsx    # MODIF: labels JOUEUR
  joueurs/[id]/page.tsx                 # MODIF: label "Titulaire" -> "Joueur"
  equipes/[id]/page.tsx                 # MODIF: label "Titulaire" -> "Joueur"
  profil/page.tsx                       # CREATE: page profil
  profil/actions.ts                     # CREATE: updateMyProfileAction, leaveMyTeamAction
src/components/
  nav-bar.tsx                           # MODIF: passe isLoggedIn à NavLinks
  nav-links.tsx                         # MODIF: lien "Profil" si connecté
tests/unit/
  validation-player.test.ts             # MODIF: STARTER -> JOUEUR
```

---

### Task 1 : Renommer STARTER → JOUEUR dans la validation (TDD)

**Files:**
- Test: `tests/unit/validation-player.test.ts`
- Modify: `src/lib/validation/player.ts`

- [ ] **Step 1 : Mettre à jour le test pour attendre JOUEUR**

Remplacer le bloc `describe("rosterAddSchema", ...)` de `tests/unit/validation-player.test.ts` par :

```ts
describe("rosterAddSchema", () => {
  it("accepte pseudo + rôle valide", () => {
    expect(rosterAddSchema.safeParse({ pseudo: "New", role: "JOUEUR" }).success).toBe(true);
  });
  it("rôle par défaut JOUEUR si absent", () => {
    const r = rosterAddSchema.safeParse({ pseudo: "New" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.role).toBe("JOUEUR");
  });
  it("rejette l'ancien rôle STARTER", () => {
    expect(rosterAddSchema.safeParse({ pseudo: "New", role: "STARTER" }).success).toBe(false);
  });
  it("rejette un rôle inconnu", () => {
    expect(rosterAddSchema.safeParse({ pseudo: "New", role: "CAPTAIN" }).success).toBe(false);
  });
});
```

- [ ] **Step 2 : Lancer le test — il échoue**

Run: `npm run test -- validation-player`
Expected: FAIL (le schéma accepte encore `STARTER`, refuse `JOUEUR`).

- [ ] **Step 3 : Renommer dans le schéma Zod**

Dans `src/lib/validation/player.ts`, remplacer les deux occurrences :

```ts
export const MEMBERSHIP_ROLES = ["JOUEUR", "SUB", "COACH", "MANAGER"] as const;
```

et

```ts
  role: z.enum(MEMBERSHIP_ROLES).default("JOUEUR"),
```

- [ ] **Step 4 : Lancer le test — il passe**

Run: `npm run test -- validation-player`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/validation/player.ts tests/unit/validation-player.test.ts
git commit -m "refactor: rename membership role STARTER to JOUEUR (validation)"
```

---

### Task 2 : Migration Prisma — schéma + rename enum en place

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_profil_foundations/migration.sql`

- [ ] **Step 1 : Modifier le schéma — enum**

Dans `prisma/schema.prisma`, remplacer :

```prisma
enum MembershipRole {
  STARTER
  SUB
  COACH
  MANAGER
}
```

par :

```prisma
enum MembershipRole {
  JOUEUR
  SUB
  COACH
  MANAGER
}
```

- [ ] **Step 2 : Modifier le schéma — défaut du rôle**

Dans le modèle `TeamMembership`, remplacer `@default(STARTER)` par `@default(JOUEUR)` :

```prisma
  role      MembershipRole @default(JOUEUR)
```

- [ ] **Step 3 : Modifier le schéma — lien User ↔ Player**

Dans le modèle `Player`, ajouter les deux lignes (après `photo`) :

```prisma
  userId      String?          @unique
  user        User?            @relation(fields: [userId], references: [id], onDelete: SetNull)
```

Dans le modèle `User`, ajouter la back-relation (après `tournamentManagerRoles`) :

```prisma
  player                 Player?
```

- [ ] **Step 4 : Modifier le schéma — champs d'invitation sur Team**

Dans le modèle `Team`, ajouter (après `status`) :

```prisma
  inviteToken     String?      @unique
  inviteExpiresAt DateTime?
```

- [ ] **Step 5 : Générer la migration en mode --create-only**

Run: `npx prisma migrate dev --create-only --name profil_foundations`
Expected: un dossier `prisma/migrations/<timestamp>_profil_foundations/migration.sql` est créé. **Ne pas l'appliquer encore.**

- [ ] **Step 6 : Réécrire le SQL de migration pour renommer l'enum en place**

Remplacer **tout** le contenu de `prisma/migrations/<timestamp>_profil_foundations/migration.sql` par exactement :

```sql
-- Rename enum value in place (préserve les données existantes)
ALTER TYPE "MembershipRole" RENAME VALUE 'STARTER' TO 'JOUEUR';

-- Update default du rôle
ALTER TABLE "TeamMembership" ALTER COLUMN "role" SET DEFAULT 'JOUEUR';

-- Player <-> User (nullable, unique)
ALTER TABLE "Player" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Team invite link
ALTER TABLE "Team" ADD COLUMN "inviteToken" TEXT;
ALTER TABLE "Team" ADD COLUMN "inviteExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Team_inviteToken_key" ON "Team"("inviteToken");
```

- [ ] **Step 7 : Appliquer la migration + régénérer le client**

Run: `npx prisma migrate dev`
Expected: migration appliquée sans perte, client Prisma régénéré. (Windows : si le DLL Prisma est verrouillé par un `next dev`, l'arrêter d'abord — PowerShell `Get-Process node | Stop-Process`.)

- [ ] **Step 8 : Vérifier que le typecheck passe**

Run: `npx tsc --noEmit`
Expected: aucune erreur (les usages `STARTER` restants seront corrigés Task 3 — s'il y a des erreurs, elles pointent ces fichiers ; passer à Task 3).

- [ ] **Step 9 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add User-Player link, team invite fields, rename enum to JOUEUR"
```

---

### Task 3 : Propager le rename dans le code applicatif

**Files:**
- Modify: `prisma/seed-dev.ts`
- Modify: `src/app/admin/actions/players.ts`
- Modify: `src/app/admin/equipes/[id]/roster/page.tsx`
- Modify: `src/app/joueurs/[id]/page.tsx`
- Modify: `src/app/equipes/[id]/page.tsx`

- [ ] **Step 1 : seed-dev.ts — remplacer les rôles**

Dans `prisma/seed-dev.ts`, remplacer les 3 occurrences de `role: "STARTER"` et l'expression `role: i === 4 ? "COACH" : "STARTER"` :
- ligne membership Neo : `role: "JOUEUR",`
- boucle VCT : `role: i === 4 ? "COACH" : "JOUEUR",`

(Recherche/remplacement littéral `"STARTER"` → `"JOUEUR"` dans ce fichier.)

- [ ] **Step 2 : admin/actions/players.ts — remplacer les défauts**

Dans `src/app/admin/actions/players.ts`, remplacer les deux occurrences littérales `"STARTER"` :
- dans `addRosterMemberAction` : `role: formData.get("role") || "JOUEUR",`
- dans `setMemberRoleAction` : `const role = String(formData.get("role") ?? "JOUEUR") as MembershipRole;`

- [ ] **Step 3 : roster page — libellé**

Dans `src/app/admin/equipes/[id]/roster/page.tsx`, dans `ROLE_LABELS` remplacer la clé `STARTER` et deux `defaultValue="STARTER"` :

```ts
const ROLE_LABELS: Record<string, string> = {
  JOUEUR: "Joueur",
  SUB: "Remplaçant",
  COACH: "Coach",
  MANAGER: "Manager",
};
```

Puis remplacer `defaultValue="STARTER"` (dans le `<select>` d'ajout) par `defaultValue="JOUEUR"`.

- [ ] **Step 4 : pages publiques — libellé "Titulaire" → "Joueur"**

Dans `src/app/joueurs/[id]/page.tsx` et `src/app/equipes/[id]/page.tsx`, repérer la table de correspondance de rôles (clé `STARTER: "Titulaire"`) et la remplacer par `JOUEUR: "Joueur"`.

Run pour localiser : `npx grep -n "STARTER\|Titulaire" src/app/joueurs/[id]/page.tsx src/app/equipes/[id]/page.tsx` (ou l'outil Grep). Remplacer chaque `STARTER: "Titulaire"` par `JOUEUR: "Joueur"`.

- [ ] **Step 5 : Vérifier plus aucune référence STARTER dans le code actif**

Run: `npx grep -rn "STARTER" src prisma/seed-dev.ts`
Expected: aucun résultat.

- [ ] **Step 6 : Typecheck + tests**

Run: `npx tsc --noEmit && npm run test`
Expected: typecheck OK, tests unitaires PASS.

- [ ] **Step 7 : Commit**

```bash
git add src prisma/seed-dev.ts
git commit -m "refactor: propagate JOUEUR role rename across app code"
```

---

### Task 4 : Data layer — helpers Player par user

**Files:**
- Modify: `src/lib/data/players.ts`

- [ ] **Step 1 : Ajouter les fonctions d'accès**

À la fin de `src/lib/data/players.ts`, ajouter :

```ts
/** Fiche Player liée à un compte user (ou null). */
export function getPlayerByUserId(userId: string) {
  return db.player.findUnique({ where: { userId } });
}

/**
 * Garantit une fiche Player pour ce user : la crée si absente.
 * pseudo par défaut = nom Discord (ou "Joueur"), photo = avatar Discord.
 */
export async function ensurePlayerForUser(
  userId: string,
  fallback: { pseudo?: string | null; photo?: string | null }
) {
  const existing = await db.player.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.player.create({
    data: {
      userId,
      pseudo: fallback.pseudo?.trim() || "Joueur",
      photo: fallback.photo ?? undefined,
    },
  });
}

/** Adhésion active (leaveDate null) d'un joueur, avec l'équipe. */
export function getActiveMembership(playerId: string) {
  return db.teamMembership.findFirst({
    where: { playerId, leaveDate: null },
    include: { team: true },
  });
}
```

- [ ] **Step 2 : Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/data/players.ts
git commit -m "feat: add player-by-user and active-membership data helpers"
```

---

### Task 5 : Auto-création de la fiche Player à la connexion

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1 : Créer la fiche Player dans l'event linkAccount**

Dans `src/lib/auth.ts`, importer le helper en haut :

```ts
import { ensurePlayerForUser } from "@/lib/data/players";
```

Puis dans `events.linkAccount`, après le bloc `await db.user.update(...)`, ajouter :

```ts
      await ensurePlayerForUser(user.id, { pseudo: user.name, photo: user.image });
```

Le bloc `linkAccount` complet devient :

```ts
    async linkAccount({ user, account }) {
      if (account.provider !== "discord") return;
      const isAdmin = adminIds.includes(account.providerAccountId);
      await db.user.update({
        where: { id: user.id },
        data: {
          discordId: account.providerAccountId,
          ...(isAdmin ? { globalRole: "ADMIN" as const } : {}),
        },
      });
      await ensurePlayerForUser(user.id, { pseudo: user.name, photo: user.image });
    },
```

- [ ] **Step 2 : Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: auto-create Player profile on first Discord login"
```

---

### Task 6 : Helper photo DRY (extraction)

**Files:**
- Create: `src/lib/player-photo.ts`
- Modify: `src/app/admin/actions/players.ts`

- [ ] **Step 1 : Créer le helper partagé**

Créer `src/lib/player-photo.ts` :

```ts
import { setPlayerPhoto } from "@/lib/data/players";
import { validateImageUpload, processAndStoreImage } from "@/lib/images";

/** Traite un éventuel upload photo depuis un FormData et l'enregistre pour le joueur. */
export async function storePlayerPhotoFromForm(formData: FormData, playerId: string): Promise<void> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return;
  const check = validateImageUpload({ type: file.type, size: file.size });
  if (!check.ok) throw new Error(check.error);
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await processAndStoreImage(buffer, "players", playerId);
  await setPlayerPhoto(playerId, key);
}
```

- [ ] **Step 2 : Remplacer le helper local dans admin/actions/players.ts**

Dans `src/app/admin/actions/players.ts` : supprimer la fonction locale `maybeStorePhoto` et son import inutile, ajouter l'import du helper, et remplacer les appels.

Retirer ces imports devenus inutiles s'ils ne servent plus ailleurs dans le fichier :
```ts
import { validateImageUpload, processAndStoreImage } from "@/lib/images";
```
Retirer aussi `setPlayerPhoto` de la liste d'import depuis `@/lib/data/players` **s'il n'est plus utilisé** dans ce fichier.

Ajouter :
```ts
import { storePlayerPhotoFromForm } from "@/lib/player-photo";
```

Supprimer la fonction `maybeStorePhoto` entière. Remplacer les deux appels `await maybeStorePhoto(formData, player.id)` / `await maybeStorePhoto(formData, playerId)` par `await storePlayerPhotoFromForm(formData, player.id)` / `await storePlayerPhotoFromForm(formData, playerId)`.

- [ ] **Step 3 : Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur (si `setPlayerPhoto`/imports images signalés inutilisés, les retirer).

- [ ] **Step 4 : Commit**

```bash
git add src/lib/player-photo.ts src/app/admin/actions/players.ts
git commit -m "refactor: extract shared player photo upload helper"
```

---

### Task 7 : Server Actions du profil

**Files:**
- Create: `src/app/profil/actions.ts`

- [ ] **Step 1 : Créer les actions**

Créer `src/app/profil/actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/server-auth";
import { playerInputSchema } from "@/lib/validation/player";
import {
  getPlayerByUserId,
  updatePlayer,
  getActiveMembership,
  endMembership,
} from "@/lib/data/players";
import { storePlayerPhotoFromForm } from "@/lib/player-photo";

export async function updateMyProfileAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const player = await getPlayerByUserId(user.id);
  if (!player) throw new Error("NO_PLAYER");

  const data = playerInputSchema.parse({
    pseudo: formData.get("pseudo"),
    realName: formData.get("realName") || undefined,
    nationality: formData.get("nationality") || undefined,
    socials: {
      twitter: formData.get("twitter") || undefined,
      twitch: formData.get("twitch") || undefined,
    },
  });

  await updatePlayer(player.id, data);
  await storePlayerPhotoFromForm(formData, player.id);
  revalidatePath("/profil");
  revalidatePath(`/joueurs/${player.id}`);
}

export async function leaveMyTeamAction() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const player = await getPlayerByUserId(user.id);
  if (!player) throw new Error("NO_PLAYER");
  const active = await getActiveMembership(player.id);
  if (active) await endMembership(active.id, new Date());
  revalidatePath("/profil");
}
```

- [ ] **Step 2 : Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/app/profil/actions.ts
git commit -m "feat: profile server actions (update, leave team)"
```

---

### Task 8 : Page /profil

**Files:**
- Create: `src/app/profil/page.tsx`

- [ ] **Step 1 : Créer la page**

Créer `src/app/profil/page.tsx` :

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { ensurePlayerForUser, getActiveMembership } from "@/lib/data/players";
import { updateMyProfileAction, leaveMyTeamAction } from "@/app/profil/actions";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-white">Ton profil</h1>
        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Connecte-toi avec Discord pour accéder à ton profil joueur.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: "/profil" });
          }}
        >
          <button className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
            Connexion Discord
          </button>
        </form>
      </main>
    );
  }

  const player = await ensurePlayerForUser(session.user.id, {
    pseudo: session.user.name,
    photo: session.user.image,
  });
  const membership = await getActiveMembership(player.id);
  const socials = (player.socials ?? {}) as { twitter?: string; twitch?: string };
  const input =
    "rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Mon profil</h1>
        <Link href={`/joueurs/${player.id}`} className="text-sm text-[var(--accent-2)]">
          Voir ma fiche publique →
        </Link>
      </div>

      <section className="mb-8 rounded-lg border border-[var(--border)] p-4">
        <h2 className="mb-2 text-lg font-semibold text-white">Mon équipe</h2>
        {membership ? (
          <div className="flex items-center gap-3">
            <Link href={`/equipes/${membership.teamId}`} className="font-medium text-white hover:text-[var(--accent)]">
              {membership.team.name}
            </Link>
            <form action={leaveMyTeamAction} className="ml-auto">
              <button className="rounded bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--accent)]">
                Quitter l'équipe
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Tu n'es dans aucune équipe. Utilise un lien d'invitation pour en rejoindre une.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Informations</h2>
        <form action={updateMyProfileAction} className="grid gap-3">
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Pseudo
            <input name="pseudo" defaultValue={player.pseudo} required maxLength={40} className={input} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Vrai nom
            <input name="realName" defaultValue={player.realName ?? ""} maxLength={80} className={input} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Nationalité
            <input name="nationality" defaultValue={player.nationality ?? ""} maxLength={40} className={input} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Twitter (URL)
            <input name="twitter" type="url" defaultValue={socials.twitter ?? ""} className={input} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Twitch (URL)
            <input name="twitch" type="url" defaultValue={socials.twitch ?? ""} className={input} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Photo
            <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" className={input} />
          </label>
          <button className="mt-1 rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
            Enregistrer
          </button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 2 : Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3 : Vérification manuelle**

Run: `npm run dev` puis ouvrir `http://localhost:3200/profil`
Expected: connecté → formulaire pré-rempli + section équipe ; non connecté → bouton Connexion Discord.

- [ ] **Step 4 : Commit**

```bash
git add src/app/profil/page.tsx
git commit -m "feat: /profil page (edit profile, leave team)"
```

---

### Task 9 : Lien "Profil" dans la NavBar

**Files:**
- Modify: `src/components/nav-links.tsx`
- Modify: `src/components/nav-bar.tsx`

- [ ] **Step 1 : NavLinks accepte isLoggedIn**

Remplacer le composant `NavLinks` dans `src/components/nav-links.tsx` par :

```tsx
export default function NavLinks({
  isAdmin = false,
  isLoggedIn = false,
}: {
  isAdmin?: boolean;
  isLoggedIn?: boolean;
}) {
  const pathname = usePathname();
  const links = [
    ...LINKS,
    ...(isLoggedIn ? [{ href: "/profil", label: "Profil" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  return (
    <div className="flex items-center gap-1 text-sm">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link key={l.href} href={l.href} data-active={active} className="nav-link px-2.5 py-1">
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2 : NavBar passe isLoggedIn**

Dans `src/components/nav-bar.tsx`, remplacer la ligne `<NavLinks isAdmin={isAdmin} />` par :

```tsx
        <NavLinks isAdmin={isAdmin} isLoggedIn={!!session?.user} />
```

- [ ] **Step 3 : Typecheck + rendu**

Run: `npx tsc --noEmit`
Expected: aucune erreur. Vérifier visuellement que "Profil" apparaît une fois connecté.

- [ ] **Step 4 : Commit**

```bash
git add src/components/nav-links.tsx src/components/nav-bar.tsx
git commit -m "feat: add Profil nav link for logged-in users"
```

---

## Self-review (Plan A)

- **Couverture spec :** §1.1 (userId) Task 2 ; §1.2 (invite fields, non encore utilisés — consommés Plan B) Task 2 ; §1.3 (rename JOUEUR + migration en place) Tasks 1-3 ; §1.4 (getActiveMembership pour l'invariant) Task 4 ; §2.1 (auto-création + ensure) Tasks 4-5 ; §2.2 (page + actions) Tasks 7-8 ; navigation Profil Task 9.
- **Types cohérents :** `ensurePlayerForUser(userId, {pseudo, photo})`, `getPlayerByUserId`, `getActiveMembership`, `storePlayerPhotoFromForm(formData, playerId)` — mêmes signatures entre définition (Tasks 4/6) et usage (Tasks 5/7/8). `MEMBERSHIP_ROLES` = {JOUEUR, SUB, COACH, MANAGER} cohérent schéma/Zod/UI.
- **Pas de placeholder.** Migration en place documentée (pas de drop d'enum). Photo upload DRY via `player-photo.ts`.
