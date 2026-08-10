# Riot ID Capture (Phase A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capturer de façon fiable le Riot ID (vérifié via l'API HenrikDev) de chaque joueur, avec blocage dur d'onboarding, re-confirmation à l'adhésion, et saisie dans les formulaires admin/manager.

**Architecture:** Un client HenrikDev server-only (`verifyRiotId`) + un résolveur partagé (`resolveRiotAccount`) qui parse/vérifie/contrôle l'unicité. Le `Player` gagne `riotName/riotTag/puuid/region` (`puuid @unique`). Blocage d'onboarding via `proxy.ts` (cookie `onboarded`) + route `/onboarding`. Re-confirmation dans le flux d'invitation. Erreurs via le système de toasts existant.

**Tech Stack:** Next.js 16 (App Router, server actions, `proxy.ts`), Prisma/PostgreSQL, NextAuth v5 (sessions DB), Zod, Vitest.

**⚠️ Avant de coder :** ce Next.js a des différences — lire `node_modules/next/dist/docs/` pour `proxy.ts`, server actions et cookies avant les tâches 6–8. Sur Windows, `prisma generate` peut échouer (EPERM) si `npm run dev` tourne : les types sont quand même régénérés (tsc OK) ; relancer le dev pour le runtime.

---

## File Structure

- **Create** `src/lib/validation/riot.ts` — `parseRiotId`, `riotIdSchema`.
- **Create** `tests/unit/validation-riot.test.ts`.
- **Create** `src/lib/henrikdev.ts` — `verifyRiotId`, `RiotIdError`, types.
- **Create** `tests/unit/henrikdev.test.ts`.
- **Create** `src/lib/riot-account.ts` — `resolveRiotAccount`, `riotFlashCode`.
- **Modify** `prisma/schema.prisma` — champs `Player`.
- **Create** `prisma/migrations/20260726030000_player_riot_id/migration.sql`.
- **Modify** `src/lib/data/players.ts` — `setPlayerRiotAccount`.
- **Modify** `src/lib/flash-messages.ts` — codes Riot.
- **Modify** `.env.example` — `HENRIKDEV_API_KEY`.
- **Create** `src/components/riot-id-form.tsx` — formulaire client réutilisable.
- **Create** `src/app/onboarding/page.tsx`, `src/app/onboarding/actions.ts`.
- **Modify** `src/proxy.ts` — gate onboarding.
- **Modify** `src/app/rejoindre/[token]/page.tsx`, `src/app/rejoindre/actions.ts`.
- **Modify** `src/components/player-form.tsx`, `src/app/admin/actions/players.ts`, `src/app/equipes/[id]/gestion/roster/page.tsx`, `src/lib/validation/player.ts`.

---

## Task 1: Parsing & validation du Riot ID

**Files:**

- Create: `src/lib/validation/riot.ts`
- Test: `tests/unit/validation-riot.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/validation-riot.test.ts
import { describe, it, expect } from "vitest";
import { parseRiotId, riotIdSchema } from "@/lib/validation/riot";

describe("parseRiotId", () => {
  it("découpe Nom#Tag", () => {
    expect(parseRiotId("Hub Player#EUW1")).toEqual({ name: "Hub Player", tag: "EUW1" });
  });
  it("trim les espaces", () => {
    expect(parseRiotId("  Zed#123 ")).toEqual({ name: "Zed", tag: "123" });
  });
  it("rejette sans #", () => {
    expect(() => parseRiotId("NoTag")).toThrow("RIOT_FORMAT");
  });
  it("rejette un tag trop court", () => {
    expect(() => parseRiotId("Name#ab")).toThrow("RIOT_FORMAT");
  });
  it("rejette un nom trop court", () => {
    expect(() => parseRiotId("ab#1234")).toThrow("RIOT_FORMAT");
  });
});

describe("riotIdSchema", () => {
  it("accepte un Riot ID valide", () => {
    expect(riotIdSchema.safeParse("Player One#EUW").success).toBe(true);
  });
  it("rejette un format invalide", () => {
    expect(riotIdSchema.safeParse("bad").success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/validation-riot.test.ts`
Expected: FAIL (module `@/lib/validation/riot` introuvable).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/validation/riot.ts
import { z } from "zod";

export type ParsedRiotId = { name: string; tag: string };

// Nom Riot : 3–16 caractères (lettres, chiffres, espaces). Tag : 3–5 alphanum.
const NAME_RE = /^[\p{L}\p{N} ]{3,16}$/u;
const TAG_RE = /^[\p{L}\p{N}]{3,5}$/u;

export function parseRiotId(input: string): ParsedRiotId {
  const trimmed = input.trim();
  const hash = trimmed.lastIndexOf("#");
  if (hash <= 0 || hash === trimmed.length - 1) throw new Error("RIOT_FORMAT");
  const name = trimmed.slice(0, hash).trim();
  const tag = trimmed.slice(hash + 1).trim();
  if (!NAME_RE.test(name) || !TAG_RE.test(tag)) throw new Error("RIOT_FORMAT");
  return { name, tag };
}

export const riotIdSchema = z
  .string()
  .trim()
  .refine(
    (v) => {
      try {
        parseRiotId(v);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Format Riot ID invalide (Nom#Tag)" }
  );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/validation-riot.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/riot.ts tests/unit/validation-riot.test.ts
git commit -m "feat: add Riot ID parsing and validation"
```

---

## Task 2: Client HenrikDev (`verifyRiotId`)

**Files:**

- Create: `src/lib/henrikdev.ts`
- Test: `tests/unit/henrikdev.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/henrikdev.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyRiotId, RiotIdError } from "@/lib/henrikdev";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("verifyRiotId", () => {
  it("retourne puuid/region sur succès", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal(
      "fetch",
      mockFetch(200, { data: { puuid: "p-1", region: "eu", name: "Zed", tag: "EUW" } })
    );
    await expect(verifyRiotId("Zed", "EUW")).resolves.toEqual({
      puuid: "p-1",
      region: "eu",
      name: "Zed",
      tag: "EUW",
    });
  });
  it("404 -> NOT_FOUND", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(404, {}));
    await expect(verifyRiotId("x", "yyy")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("429 -> RATE_LIMITED", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "k");
    vi.stubGlobal("fetch", mockFetch(429, {}));
    await expect(verifyRiotId("x", "yyy")).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
  it("clé absente -> API_ERROR", async () => {
    vi.stubEnv("HENRIKDEV_API_KEY", "");
    await expect(verifyRiotId("x", "yyy")).rejects.toBeInstanceOf(RiotIdError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/henrikdev.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/henrikdev.ts
export type RiotIdErrorCode = "NOT_FOUND" | "RATE_LIMITED" | "API_ERROR" | "TAKEN";

export class RiotIdError extends Error {
  code: RiotIdErrorCode;
  constructor(code: RiotIdErrorCode) {
    super(code);
    this.name = "RiotIdError";
    this.code = code;
  }
}

export type RiotAccount = { puuid: string; region: string; name: string; tag: string };

const BASE = "https://api.henrikdev.xyz";

/** Vérifie un Riot ID auprès de HenrikDev. Server-only (utilise la clé API). */
export async function verifyRiotId(name: string, tag: string): Promise<RiotAccount> {
  const key = process.env.HENRIKDEV_API_KEY;
  if (!key) throw new RiotIdError("API_ERROR");

  const url = `${BASE}/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: key }, signal: controller.signal });
  } catch {
    throw new RiotIdError("API_ERROR");
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 404) throw new RiotIdError("NOT_FOUND");
  if (res.status === 429) throw new RiotIdError("RATE_LIMITED");
  if (!res.ok) throw new RiotIdError("API_ERROR");

  const json = (await res.json().catch(() => null)) as { data?: Partial<RiotAccount> } | null;
  const data = json?.data;
  if (!data?.puuid) throw new RiotIdError("API_ERROR");
  return {
    puuid: data.puuid,
    region: data.region ?? "eu",
    name: data.name ?? name,
    tag: data.tag ?? tag,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/henrikdev.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/henrikdev.ts tests/unit/henrikdev.test.ts
git commit -m "feat: add HenrikDev account verification client"
```

---

## Task 3: Schéma Prisma + migration (`Player`)

**Files:**

- Modify: `prisma/schema.prisma` (model `Player`)
- Create: `prisma/migrations/20260726030000_player_riot_id/migration.sql`

- [ ] **Step 1: Ajouter les champs au model `Player`**

Dans `model Player`, après `socials Json?` :

```prisma
  riotName    String?
  riotTag     String?
  puuid       String?          @unique
  region      String?
```

- [ ] **Step 2: Écrire la migration SQL**

```sql
-- prisma/migrations/20260726030000_player_riot_id/migration.sql
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "riotName" TEXT;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "riotTag" TEXT;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "puuid" TEXT;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "region" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Player_puuid_key" ON "Player"("puuid");
```

- [ ] **Step 3: Appliquer et régénérer**

Run: `npx prisma migrate deploy` puis `npx prisma generate`
Expected: migration appliquée. (Si `generate` échoue EPERM : ignorer, les types sont écrits ; relancer le dev plus tard.)

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260726030000_player_riot_id
git commit -m "feat: add Riot account fields to Player (riotName, riotTag, puuid, region)"
```

---

## Task 4: Résolveur partagé + helper data

**Files:**

- Create: `src/lib/riot-account.ts`
- Modify: `src/lib/data/players.ts`

- [ ] **Step 1: Ajouter le helper data `setPlayerRiotAccount`**

Dans `src/lib/data/players.ts`, ajouter (après `getPlayerByUserId`) :

```ts
import type { RiotAccount } from "@/lib/henrikdev";

/** Enregistre le compte Riot vérifié sur un joueur. */
export function setPlayerRiotAccount(playerId: string, account: RiotAccount) {
  return db.player.update({
    where: { id: playerId },
    data: {
      riotName: account.name,
      riotTag: account.tag,
      puuid: account.puuid,
      region: account.region,
    },
  });
}

/** True si ce puuid est déjà pris par un AUTRE joueur. */
export async function isPuuidTakenByOther(
  puuid: string,
  excludePlayerId?: string
): Promise<boolean> {
  const clash = await db.player.findFirst({
    where: { puuid, ...(excludePlayerId ? { NOT: { id: excludePlayerId } } : {}) },
    select: { id: true },
  });
  return clash !== null;
}
```

- [ ] **Step 2: Créer le résolveur partagé**

```ts
// src/lib/riot-account.ts
import { parseRiotId } from "@/lib/validation/riot";
import { verifyRiotId, RiotIdError, type RiotAccount } from "@/lib/henrikdev";
import { isPuuidTakenByOther } from "@/lib/data/players";

/**
 * Parse un Riot ID saisi, le vérifie via l'API, contrôle l'unicité du puuid.
 * Lève Error("RIOT_FORMAT") ou RiotIdError (NOT_FOUND / RATE_LIMITED / API_ERROR / TAKEN).
 */
export async function resolveRiotAccount(
  input: string,
  opts?: { excludePlayerId?: string }
): Promise<RiotAccount> {
  const { name, tag } = parseRiotId(input); // -> Error("RIOT_FORMAT")
  const account = await verifyRiotId(name, tag); // -> RiotIdError
  if (await isPuuidTakenByOther(account.puuid, opts?.excludePlayerId)) {
    throw new RiotIdError("TAKEN");
  }
  return account;
}

/** Traduit une erreur de résolution en code de flash toast. */
export function riotFlashCode(error: unknown): string {
  if (error instanceof RiotIdError) {
    switch (error.code) {
      case "NOT_FOUND":
        return "riotnotfound";
      case "RATE_LIMITED":
        return "ratelimited";
      case "TAKEN":
        return "riottaken";
      default:
        return "riotapi";
    }
  }
  if (error instanceof Error && error.message === "RIOT_FORMAT") return "riotformat";
  return "riotapi";
}
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/riot-account.ts src/lib/data/players.ts
git commit -m "feat: add shared Riot account resolver and data helpers"
```

---

## Task 5: Messages de flash + variable d'env

**Files:**

- Modify: `src/lib/flash-messages.ts`
- Modify: `.env.example`

- [ ] **Step 1: Ajouter les codes de succès et d'erreur**

Dans `OK_MESSAGES`, ajouter :

```ts
  "riot-saved": { title: "Riot ID enregistré", message: "Ton compte Valorant est bien lié." },
```

Dans `ERROR_MESSAGES`, ajouter :

```ts
  riotformat: { title: "Riot ID invalide", message: "Format attendu : Nom#Tag." },
  riotnotfound: { title: "Riot ID introuvable", message: "Ce Riot ID n'existe pas côté Riot." },
  riottaken: { title: "Riot ID déjà utilisé", message: "Ce Riot ID est déjà associé à un autre joueur." },
  ratelimited: { title: "Trop de requêtes", message: "Réessaie dans un instant." },
  riotapi: { title: "Service indisponible", message: "Vérification Riot momentanément indisponible." },
```

- [ ] **Step 2: Ajouter la variable d'env d'exemple**

Ajouter à la fin de `.env.example` :

```
# Clé API HenrikDev (https://docs.henrikdev.xyz) pour la vérification des Riot ID
HENRIKDEV_API_KEY=
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/flash-messages.ts .env.example
git commit -m "feat: add Riot flash messages and HENRIKDEV_API_KEY env"
```

---

## Task 6: Onboarding (formulaire, page, action)

**Files:**

- Create: `src/components/riot-id-form.tsx`
- Create: `src/app/onboarding/actions.ts`
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Formulaire client réutilisable**

```tsx
// src/components/riot-id-form.tsx
const input =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--accent)]";

export default function RiotIdForm({
  action,
  defaultValue = "",
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValue?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        Riot ID
        <input
          name="riotId"
          defaultValue={defaultValue}
          required
          placeholder="Nom#Tag (ex. Hub Player#EUW1)"
          className={input}
        />
      </label>
      <button className="justify-self-start rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
        {submitLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Action serveur d'onboarding**

```ts
// src/app/onboarding/actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { getPlayerByUserId, setPlayerRiotAccount } from "@/lib/data/players";
import { resolveRiotAccount, riotFlashCode } from "@/lib/riot-account";

export async function submitOnboardingRiotId(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/api/auth/signin");
  const player = await getPlayerByUserId(user.id);
  if (!player) redirect("/api/auth/signin");

  const input = String(formData.get("riotId") ?? "");
  try {
    const account = await resolveRiotAccount(input, { excludePlayerId: player.id });
    await setPlayerRiotAccount(player.id, account);
  } catch (e) {
    redirect(`/onboarding?error=${riotFlashCode(e)}`);
  }

  const store = await cookies();
  store.set("onboarded", "1", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/?ok=riot-saved");
}
```

- [ ] **Step 3: Page onboarding**

```tsx
// src/app/onboarding/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { getPlayerByUserId } from "@/lib/data/players";
import RiotIdForm from "@/components/riot-id-form";
import { submitOnboardingRiotId } from "@/app/onboarding/actions";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/api/auth/signin");
  const player = await getPlayerByUserId(user.id);

  // Déjà renseigné : auto-réparation du cookie puis retour à l'accueil.
  if (player?.puuid) {
    const store = await cookies();
    store.set("onboarded", "1", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        Bienvenue
      </h1>
      <p className="mb-6 mt-2 text-sm text-[var(--text-muted)]">
        Pour continuer, renseigne ton Riot ID Valorant. Il sert à relier tes matchs et tes
        statistiques. On vérifie qu'il existe auprès de Riot.
      </p>
      <RiotIdForm action={submitOnboardingRiotId} submitLabel="Valider mon Riot ID" />
    </main>
  );
}
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/riot-id-form.tsx src/app/onboarding
git commit -m "feat: add onboarding Riot ID page, form and action"
```

---

## Task 7: Gate d'onboarding (`proxy.ts`)

**Files:**

- Modify: `src/proxy.ts`

- [ ] **Step 1: Réécrire le proxy avec le gate onboarding**

```ts
// src/proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  const path = request.nextUrl.pathname;
  const isGestion = path.includes("/gestion");

  // Backstop auth sur les routes de gestion.
  if (isGestion && !hasSession) {
    const signInUrl = new URL("/api/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(signInUrl);
  }

  // Gate onboarding : connecté mais pas de cookie `onboarded` -> /onboarding.
  if (hasSession && !request.cookies.has("onboarded") && path !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Toutes les routes applicatives sauf API, assets Next et fichiers statiques.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)"],
};
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Vérification manuelle**

Démarrer `npm run dev`. Se connecter avec un compte sans Riot ID → toute page redirige vers `/onboarding`. Soumettre un Riot ID valide → cookie `onboarded` posé, retour `/` avec toast « Riot ID enregistré ». Naviguer librement ensuite.

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: gate app behind Riot ID onboarding via proxy"
```

---

## Task 8: Re-confirmation à l'adhésion (`/rejoindre/[token]`)

**Files:**

- Modify: `src/app/rejoindre/actions.ts`
- Modify: `src/app/rejoindre/[token]/page.tsx`

- [ ] **Step 1: Étendre l'action d'adhésion pour re-confirmer le Riot ID**

Dans `src/app/rejoindre/actions.ts`, remplacer le corps de `joinTeamViaInviteAction` par une version qui lit `riotId` du formulaire et met à jour si changé. Nouvelle signature : l'action reçoit `formData`.

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getTeamByInviteToken } from "@/lib/data/teams";
import {
  ensurePlayerForUser,
  getPlayerByUserId,
  joinTeamIfFree,
  setPlayerRiotAccount,
} from "@/lib/data/players";
import { isInviteValid, isInviteTokenFormat } from "@/lib/invite";
import { resolveRiotAccount, riotFlashCode } from "@/lib/riot-account";

export async function joinTeamViaInviteAction(token: string, formData: FormData) {
  if (!isInviteTokenFormat(token)) throw new Error("INVALID_INVITE");

  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");

  const team = await getTeamByInviteToken(token);
  if (!isInviteValid(team, new Date())) throw new Error("INVALID_INVITE");

  const player = await ensurePlayerForUser(session.user.id, {
    pseudo: session.user.name,
    photo: session.user.image,
  });

  // Re-confirmation du Riot ID : si la valeur soumise diffère de l'actuelle, on vérifie et met à jour.
  const current = await getPlayerByUserId(session.user.id);
  const submitted = String(formData.get("riotId") ?? "").trim();
  const currentRiotId = current?.riotName ? `${current.riotName}#${current.riotTag}` : "";
  if (submitted && submitted !== currentRiotId) {
    try {
      const account = await resolveRiotAccount(submitted, { excludePlayerId: player.id });
      await setPlayerRiotAccount(player.id, account);
    } catch (e) {
      redirect(`/rejoindre/${token}?error=${riotFlashCode(e)}`);
    }
  }

  const result = await joinTeamIfFree(team.id, player.id, "JOUEUR");
  if (!result.ok) {
    if (result.activeTeamId === team.id) redirect(`/equipes/${team.id}`);
    throw new Error("ALREADY_IN_TEAM");
  }

  revalidatePath(`/equipes/${team.id}`);
  redirect(`/equipes/${team.id}?ok=member-added`);
}
```

- [ ] **Step 2: Afficher le champ Riot ID pré-rempli dans la page d'invitation**

Dans `src/app/rejoindre/[token]/page.tsx`, là où le bouton « Rejoindre » appelle `joinTeamViaInviteAction`, remplacer le `<form>` d'adhésion par un formulaire contenant le champ Riot ID pré-rempli. Récupérer le joueur courant pour la valeur par défaut :

```tsx
// en haut du composant (après avoir la session user), importer et charger le joueur :
// import { getPlayerByUserId } from "@/lib/data/players";
// const current = session?.user ? await getPlayerByUserId(session.user.id) : null;
// const currentRiotId = current?.riotName ? `${current.riotName}#${current.riotTag}` : "";

// Le formulaire d'adhésion (bind du token) :
<form action={joinWithToken} className="grid gap-3">
  <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
    Confirme ton Riot ID
    <input
      name="riotId"
      defaultValue={currentRiotId}
      required
      placeholder="Nom#Tag"
      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
    />
  </label>
  <button className="justify-self-start rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
    Confirmer et rejoindre
  </button>
</form>
```

Où `joinWithToken` est le binding existant du token, adapté pour passer `formData` :

```tsx
const joinWithToken = joinTeamViaInviteAction.bind(null, token);
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Vérification manuelle**

Ouvrir un lien d'invitation connecté : le Riot ID est pré-rempli. « Confirmer et rejoindre » sans modifier → rejoint sans nouvel appel API. Modifier avec un Riot ID inexistant → toast d'erreur, pas d'adhésion.

- [ ] **Step 5: Commit**

```bash
git add src/app/rejoindre
git commit -m "feat: re-confirm Riot ID when joining a team via invite"
```

---

## Task 9: Champ Riot ID dans les formulaires joueur (admin & manager)

**Files:**

- Modify: `src/lib/validation/player.ts`
- Modify: `src/components/player-form.tsx`
- Modify: `src/app/admin/actions/players.ts`
- Modify: `src/app/equipes/[id]/gestion/roster/page.tsx`

- [ ] **Step 1: Champ optionnel dans le formulaire admin (`player-form.tsx`)**

Ajouter dans `PlayerFormValues` le champ `riotId?: string;` et, dans le JSX (après le champ Pseudo), un champ texte :

```tsx
<label className="grid gap-1 text-sm text-[var(--text-muted)]">
  Riot ID (optionnel, Nom#Tag)
  <input
    name="riotId"
    defaultValue={values?.riotId ?? ""}
    placeholder="Nom#Tag"
    className={input}
  />
</label>
```

Et, dans la page d'édition admin qui passe `values` (`src/app/admin/joueurs/[id]/page.tsx`), ajouter :

```tsx
riotId: player.riotName ? `${player.riotName}#${player.riotTag}` : undefined,
```

- [ ] **Step 2: Vérifier/enregistrer le Riot ID dans `updatePlayerAction` / `createPlayerAction`**

Dans `src/app/admin/actions/players.ts`, importer le résolveur :

```ts
import { resolveRiotAccount, riotFlashCode } from "@/lib/riot-account";
import { setPlayerRiotAccount } from "@/lib/data/players";
```

Dans `createPlayerAction`, après `const player = await createPlayer(data);` :

```ts
const riotInput = String(formData.get("riotId") ?? "").trim();
if (riotInput) {
  try {
    const account = await resolveRiotAccount(riotInput, { excludePlayerId: player.id });
    await setPlayerRiotAccount(player.id, account);
  } catch (e) {
    redirect(`/admin/joueurs/${player.id}?error=${riotFlashCode(e)}`);
  }
}
```

Dans `updatePlayerAction`, après `await updatePlayer(playerId, data);` :

```ts
const riotInput = String(formData.get("riotId") ?? "").trim();
if (riotInput) {
  try {
    const account = await resolveRiotAccount(riotInput, { excludePlayerId: playerId });
    await setPlayerRiotAccount(playerId, account);
  } catch (e) {
    redirect(`/admin/joueurs/${playerId}?error=${riotFlashCode(e)}`);
  }
}
```

- [ ] **Step 3: Champ Riot ID dans l'ajout roster (manager)**

Dans `src/app/equipes/[id]/gestion/roster/page.tsx`, dans le formulaire « Ajouter un joueur », ajouter après le champ pseudo :

```tsx
<input name="riotId" placeholder="Riot ID (optionnel, Nom#Tag)" className={input} />
```

Dans `addRosterMemberAction` (`src/app/admin/actions/players.ts`), `createPlayerAndAddToRoster` **renvoie déjà le `Player` créé** (aucune modification du helper nécessaire). Capturer sa valeur de retour, puis poser le Riot ID si fourni. Remplacer :

```ts
await createPlayerAndAddToRoster(teamId, data.pseudo, data.nationality, data.role);
```

par :

```ts
const created = await createPlayerAndAddToRoster(teamId, data.pseudo, data.nationality, data.role);
const riotInput = String(formData.get("riotId") ?? "").trim();
if (riotInput) {
  try {
    const account = await resolveRiotAccount(riotInput);
    await setPlayerRiotAccount(created.id, account);
  } catch (e) {
    redirect(`/equipes/${teamId}/gestion/roster?error=${riotFlashCode(e)}`);
  }
}
```

- [ ] **Step 4: Vérifier la compilation et les tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0, tous les tests verts.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/player.ts src/components/player-form.tsx src/app/admin/actions/players.ts "src/app/equipes/[id]/gestion/roster/page.tsx"
git commit -m "feat: capture verified Riot ID in admin/manager player forms"
```

---

## Task 10: Vérification finale

- [ ] **Step 1: Suite complète**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0, tous les tests verts (dont validation-riot et henrikdev).

- [ ] **Step 2: Parcours manuel de bout en bout**

Avec `HENRIKDEV_API_KEY` réel dans `.env` et `npm run dev` :

1. Nouveau compte Discord → redirigé vers `/onboarding`, saisie d'un vrai Riot ID → accès débloqué, toast succès.
2. Saisie d'un Riot ID inexistant → toast « Riot ID introuvable », reste bloqué.
3. Saisie d'un Riot ID déjà utilisé par un autre joueur → toast « déjà utilisé ».
4. Rejoindre une équipe via invitation → Riot ID pré-rempli, confirmer.
5. Édition joueur admin + ajout roster manager → champ Riot ID vérifié.

- [ ] **Step 3: Commit final éventuel** (si ajustements)

```bash
git add -A
git commit -m "chore: Phase A Riot ID capture — final verification fixes"
```

---

## Notes de dépendances entre tâches

- Task 4 dépend de 1, 2, 3. Task 6 dépend de 4, 5. Task 7 de 6. Task 8/9 de 4, 5.
- `resolveRiotAccount` (Task 4) est le point d'entrée unique réutilisé partout (DRY).
- Toute erreur de vérification passe par `riotFlashCode` → toast (aucune ZodError/RiotIdError ne doit remonter en erreur runtime : les actions redirigent avec `?error=`).
