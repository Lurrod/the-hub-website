# Plan 1 — Fondations & Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place le socle technique du site (Next.js + Tailwind + Prisma + PostgreSQL en Docker) avec authentification Discord et un système de rôles/permissions vérifié côté serveur.

**Architecture:** App Next.js (App Router, TypeScript) rendue côté serveur. PostgreSQL en conteneur Docker pour le dev, accédé via Prisma. Authentification par Auth.js (NextAuth v5) avec le provider Discord ; le rôle global de l'utilisateur (ADMIN/USER) et les droits par entité sont chargés depuis la base et exposés via des helpers purs, testés unitairement, appelés à chaque écriture.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma, PostgreSQL 16, Auth.js (next-auth@5), Vitest (unit/intégration), Playwright (E2E), Docker Compose, Zod.

---

## Structure de fichiers (créée par ce plan)

```
the-hub-website/
├── .env.local                    # secrets (HORS git) — non commité
├── .env.example                  # modèle documenté (commité)
├── .gitignore
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── prisma/
│   ├── schema.prisma             # modèle User (+ enum Role)
│   └── seed.ts                   # promotion des admins par discordId
├── src/
│   ├── lib/
│   │   ├── db.ts                 # singleton PrismaClient
│   │   ├── auth.ts               # config Auth.js (NextAuth)
│   │   └── permissions.ts        # helpers purs isAdmin / canManage*
│   ├── app/
│   │   ├── layout.tsx            # shell dark + nav
│   │   ├── globals.css           # Tailwind + tokens DA
│   │   ├── page.tsx              # accueil placeholder
│   │   └── api/auth/[...nextauth]/route.ts
│   └── components/
│       └── nav-bar.tsx           # barre de nav + login/logout Discord
└── tests/
    ├── unit/permissions.test.ts
    └── e2e/auth.spec.ts
```

---

### Task 1 : Scaffold Next.js + TypeScript + Tailwind

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`

- [ ] **Step 1 : Créer l'app Next.js**

Dans le dossier `the-hub-website` (déjà existant, vide) :

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint --use-npm
```
Répondre « Yes » si on demande d'écrire dans un dossier non vide (il ne contient que `docs/`).
Expected: L'arborescence `src/app/` est créée, `npm` a installé les dépendances.

- [ ] **Step 2 : Vérifier que le dev server démarre**

Run: `npm run dev`
Expected: Serveur sur `http://localhost:3000`, page Next.js par défaut visible. Arrêter avec Ctrl+C.

- [ ] **Step 3 : Remplacer la page d'accueil par un placeholder sombre**

`src/app/page.tsx` :
```tsx
export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold text-white">The Hub — T3 Valorant</h1>
      <p className="mt-2 text-neutral-400">
        Référencement des équipes et tournois du Tier 3 Valorant.
      </p>
    </main>
  );
}
```

- [ ] **Step 4 : Confirmer le rendu**

Run: `npm run dev` puis ouvrir `http://localhost:3000`
Expected: Titre « The Hub — T3 Valorant » affiché. Arrêter le serveur.

- [ ] **Step 5 : Commit** *(git désactivé pour l'instant — étape ignorée jusqu'à activation de git)*

```
# (git non initialisé sur ce projet pour le moment — voir spec §7)
```

---

### Task 2 : Base de données (PostgreSQL natif) + variables d'environnement

**Files:**
- Create: `.env.example`, `.env.local`

**Prérequis :** PostgreSQL est installé nativement sur la machine Windows et le service tourne sur `localhost:5432`. On crée une base dédiée `thehub`.

- [ ] **Step 1 : Créer la base de données `thehub`**

Avec l'utilisateur `postgres` (mot de passe défini à l'installation de PostgreSQL) :
Run (PowerShell) : `& "$env:ProgramFiles\PostgreSQL\16\bin\createdb.exe" -U postgres thehub`
(ou via psql : `psql -U postgres -c "CREATE DATABASE thehub;"`)
Expected: Base `thehub` créée, sans erreur. Ajuster le chemin/version si l'install n'est pas en 16.

- [ ] **Step 2 : Écrire `.env.example` (commitable, sans secret réel)**

`.env.example` :
```
# Remplacer <password> par le mot de passe du rôle postgres local.
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/thehub"
AUTH_SECRET="change-me-generate-with-npx-auth-secret"
AUTH_DISCORD_ID="your-discord-app-client-id"
AUTH_DISCORD_SECRET="your-discord-app-client-secret"
ADMIN_DISCORD_IDS="123456789012345678,987654321098765432"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 3 : Créer `.env.local` réel (NON commité)**

Copier `.env.example` → `.env.local`. Mettre le vrai mot de passe Postgres dans `DATABASE_URL`. Générer le secret :
Run: `npx auth secret`
Coller la valeur dans `AUTH_SECRET`. Renseigner les IDs Discord réels quand disponibles (Task 4). Mettre les deux Discord IDs admin dans `ADMIN_DISCORD_IDS`.

- [ ] **Step 4 : Vérifier `.gitignore`**

S'assurer que `.gitignore` contient `.env*.local` et `.env.local` (create-next-app l'ajoute par défaut). Sinon, l'ajouter.

- [ ] **Step 5 : Vérifier la connexion**

Run: `& "$env:ProgramFiles\PostgreSQL\16\bin\psql.exe" -U postgres -d thehub -c "\conninfo"`
Expected: Confirmation de connexion à la base `thehub` sur `localhost:5432`. (La migration Prisma de la Task 3 validera définitivement l'accès depuis l'app.)

---

### Task 3 : Prisma + modèle User

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1 : Installer Prisma**

Run: `npm install prisma @prisma/client && npm install -D tsx`
Run: `npx prisma init --datasource-provider postgresql`
Expected: `prisma/schema.prisma` créé (écrase à configurer à l'étape suivante).

- [ ] **Step 2 : Écrire le schéma User**

`prisma/schema.prisma` :
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  USER
}

model User {
  id         String   @id @default(cuid())
  discordId  String   @unique
  username   String
  avatar     String?
  globalRole Role     @default(USER)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

- [ ] **Step 3 : Créer et appliquer la migration**

Run: `npx prisma migrate dev --name init_user`
Expected: Migration créée dans `prisma/migrations/`, table `User` créée, client Prisma généré.

- [ ] **Step 4 : Écrire le singleton Prisma**

`src/lib/db.ts` :
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 5 : Ajouter les scripts dans `package.json`**

Dans `package.json`, section `"scripts"`, ajouter :
```json
"db:migrate": "prisma migrate dev",
"db:seed": "tsx prisma/seed.ts",
"db:studio": "prisma studio"
```

---

### Task 4 : Authentification Discord (Auth.js v5)

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`

**Prérequis manuel (à faire dans le portail Discord Developer) :** créer une application, ajouter l'URL de redirection OAuth2 `http://localhost:3000/api/auth/callback/discord`, récupérer Client ID / Client Secret et les mettre dans `.env.local`.

- [ ] **Step 1 : Installer Auth.js + adaptateur Prisma**

Run: `npm install next-auth@beta @auth/prisma-adapter`

- [ ] **Step 2 : Étendre le schéma Prisma pour Auth.js**

Ajouter dans `prisma/schema.prisma` (les modèles requis par l'adaptateur, et relier à User) :
```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```
Et ajouter les relations inverses dans `model User` :
```prisma
  accounts  Account[]
  sessions  Session[]
```

- [ ] **Step 3 : Migrer**

Run: `npx prisma migrate dev --name add_auth_tables`
Expected: Tables `Account`, `Session` créées.

- [ ] **Step 4 : Écrire la config Auth.js**

`src/lib/auth.ts` :
```ts
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

const adminIds = (process.env.ADMIN_DISCORD_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [Discord],
  callbacks: {
    async session({ session, user }) {
      // Expose le rôle global et l'id interne dans la session.
      if (session.user) {
        session.user.id = user.id;
        // @ts-expect-error champ custom ajouté ci-dessous
        session.user.globalRole = (user as { globalRole?: string }).globalRole ?? "USER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Promeut automatiquement en ADMIN si le discordId est dans la liste.
      const account = await db.account.findFirst({
        where: { userId: user.id, provider: "discord" },
      });
      if (account && adminIds.includes(account.providerAccountId)) {
        await db.user.update({
          where: { id: user.id },
          data: { globalRole: "ADMIN", discordId: account.providerAccountId },
        });
      } else if (account) {
        await db.user.update({
          where: { id: user.id },
          data: { discordId: account.providerAccountId },
        });
      }
    },
  },
});
```

> Note : le champ `discordId` est aussi renseigné ici depuis le compte Discord lié (l'adaptateur crée d'abord le User sans `discordId`, on le complète dans `createUser`). Rendre `discordId` optionnel au niveau applicatif tant qu'il n'est pas rempli n'est pas nécessaire car `createUser` s'exécute juste après la création.

- [ ] **Step 5 : Exposer les routes API d'auth**

`src/app/api/auth/[...nextauth]/route.ts` :
```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 6 : Test manuel du login**

Run: `npm run dev`, ouvrir `http://localhost:3000/api/auth/signin`
Expected: Bouton « Sign in with Discord », le flux OAuth aboutit, un `User` est créé en base (vérifier via `npm run db:studio`). Si le discordId est dans `ADMIN_DISCORD_IDS`, `globalRole = ADMIN`.

---

### Task 5 : Helpers de permission (TDD)

**Files:**
- Create: `src/lib/permissions.ts`, `tests/unit/permissions.test.ts`, `vitest.config.ts`
- Modify: `package.json` (script test)

- [ ] **Step 1 : Installer Vitest**

Run: `npm install -D vitest`

- [ ] **Step 2 : Config Vitest**

`vitest.config.ts` :
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["tests/unit/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

- [ ] **Step 3 : Écrire le test qui échoue**

`tests/unit/permissions.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { isAdmin, canManageTeam, canManageTournament } from "@/lib/permissions";

const admin = { id: "u1", globalRole: "ADMIN" as const };
const user = { id: "u2", globalRole: "USER" as const };

describe("isAdmin", () => {
  it("vrai pour un admin", () => expect(isAdmin(admin)).toBe(true));
  it("faux pour un user", () => expect(isAdmin(user)).toBe(false));
  it("faux pour null", () => expect(isAdmin(null)).toBe(false));
});

describe("canManageTeam", () => {
  it("admin peut toujours", () =>
    expect(canManageTeam(admin, ["u9"])).toBe(true));
  it("manager de l'équipe peut", () =>
    expect(canManageTeam(user, ["u2", "u3"])).toBe(true));
  it("non-manager ne peut pas", () =>
    expect(canManageTeam(user, ["u3"])).toBe(false));
  it("null ne peut pas", () =>
    expect(canManageTeam(null, ["u2"])).toBe(false));
});

describe("canManageTournament", () => {
  it("admin peut toujours", () =>
    expect(canManageTournament(admin, ["u9"])).toBe(true));
  it("manager du tournoi peut", () =>
    expect(canManageTournament(user, ["u2"])).toBe(true));
  it("non-manager ne peut pas", () =>
    expect(canManageTournament(user, ["u3"])).toBe(false));
});
```

- [ ] **Step 4 : Lancer le test — doit échouer**

Run: `npx vitest run tests/unit/permissions.test.ts`
Expected: FAIL — `@/lib/permissions` introuvable.

- [ ] **Step 5 : Implémenter les helpers**

`src/lib/permissions.ts` :
```ts
export type SessionUser = { id: string; globalRole: "ADMIN" | "USER" } | null;

export function isAdmin(user: SessionUser): boolean {
  return user?.globalRole === "ADMIN";
}

/** managerUserIds = ids des users managers de CETTE équipe. */
export function canManageTeam(user: SessionUser, managerUserIds: string[]): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return managerUserIds.includes(user.id);
}

/** managerUserIds = ids des users managers de CE tournoi. */
export function canManageTournament(user: SessionUser, managerUserIds: string[]): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return managerUserIds.includes(user.id);
}
```

- [ ] **Step 6 : Lancer le test — doit passer**

Run: `npx vitest run tests/unit/permissions.test.ts`
Expected: PASS (toutes les assertions vertes).

- [ ] **Step 7 : Ajouter le script test**

Dans `package.json` → `"scripts"` : `"test": "vitest run"`.

---

### Task 6 : Shell dark (DA) + barre de navigation avec login Discord

**Files:**
- Create: `src/components/nav-bar.tsx`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`

- [ ] **Step 1 : Définir les tokens de couleur DA**

Dans `src/app/globals.css`, sous les directives Tailwind existantes, ajouter :
```css
:root {
  --bg: #0F1114;
  --surface: #15181D;
  --card: #1B1F26;
  --border: #262B33;
  --text: #E8EAED;
  --text-muted: #8B929E;
  --accent: #FF4655;   /* rouge Valorant */
  --accent-2: #18E5C9; /* teal */
}
body {
  background: var(--bg);
  color: var(--text);
}
```

- [ ] **Step 2 : Écrire la barre de nav (serveur, lit la session)**

`src/components/nav-bar.tsx` :
```tsx
import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";

export default async function NavBar() {
  const session = await auth();
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-bold text-white">The Hub</Link>
        <Link href="/tournois" className="text-[var(--text-muted)] hover:text-white">Tournois</Link>
        <Link href="/equipes" className="text-[var(--text-muted)] hover:text-white">Équipes</Link>
        <Link href="/joueurs" className="text-[var(--text-muted)] hover:text-white">Joueurs</Link>
        <div className="ml-auto">
          {session?.user ? (
            <form action={async () => { "use server"; await signOut(); }}>
              <button className="rounded bg-[var(--card)] px-3 py-1.5 text-sm">
                Déconnexion ({session.user.name})
              </button>
            </form>
          ) : (
            <form action={async () => { "use server"; await signIn("discord"); }}>
              <button className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white">
                Connexion Discord
              </button>
            </form>
          )}
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 3 : Intégrer la nav dans le layout**

`src/app/layout.tsx` — remplacer le contenu du `<body>` pour inclure la nav :
```tsx
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/nav-bar";

export const metadata: Metadata = {
  title: "The Hub — T3 Valorant",
  description: "Référencement des équipes et tournois du Tier 3 Valorant.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 4 : Vérifier visuellement**

Run: `npm run dev`, ouvrir `http://localhost:3000`
Expected: Fond très sombre, barre de nav avec liens gris et bouton rouge « Connexion Discord ». Connecté → bouton « Déconnexion (pseudo) ».

---

### Task 7 : Seed des admins + E2E du login

**Files:**
- Create: `prisma/seed.ts`, `tests/e2e/auth.spec.ts`, `playwright.config.ts`

- [ ] **Step 1 : Écrire le seed (promotion admin idempotente)**

`prisma/seed.ts` :
```ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const ids = (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  for (const discordId of ids) {
    await db.user.updateMany({
      where: { discordId },
      data: { globalRole: "ADMIN" },
    });
  }
  console.log(`Seed: ${ids.length} admin(s) ciblé(s).`);
}

main().finally(() => db.$disconnect());
```

- [ ] **Step 2 : Vérifier le seed**

Run: `npm run db:seed`
Expected: Log « Seed: N admin(s) ciblé(s). » sans erreur (met à jour les users existants dont le discordId est admin).

- [ ] **Step 3 : Installer Playwright**

Run: `npm install -D @playwright/test && npx playwright install chromium`

- [ ] **Step 4 : Config Playwright**

`playwright.config.ts` :
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 5 : Écrire l'E2E (état déconnecté — pas d'OAuth réel en CI)**

`tests/e2e/auth.spec.ts` :
```ts
import { test, expect } from "@playwright/test";

test("l'accueil affiche le bouton de connexion Discord quand déconnecté", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Connexion Discord/i })).toBeVisible();
});

test("la navigation principale est présente", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Tournois" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Équipes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Joueurs" })).toBeVisible();
});
```

- [ ] **Step 6 : Lancer l'E2E**

Run: `npx playwright test`
Expected: 2 tests PASS (le webServer démarre l'app automatiquement).

- [ ] **Step 7 : Ajouter le script E2E**

Dans `package.json` → `"scripts"` : `"test:e2e": "playwright test"`.

---

## Auto-revue du plan

- **Couverture spec :** ce plan couvre §3 (User + rôles), §5 (helpers de permission, admins par discordId), §6 (Next.js, Auth.js/Discord, Prisma/Postgres, Docker dev, Zod à venir dès les premières écritures du Plan 2, tests unit/E2E) et le socle DA de §7. Les entités Team/Player/Tournament/Match sont **hors périmètre** de ce plan (Plans 2 et 3) — attendu.
- **Placeholders :** aucun « TODO/TBD ». Les étapes git sont volontairement neutralisées (git désactivé par décision utilisateur) et signalées comme telles.
- **Cohérence des types :** `SessionUser`, `isAdmin`, `canManageTeam`, `canManageTournament` utilisés de façon cohérente entre test (Task 5.3) et implémentation (Task 5.5). `globalRole` (enum `Role` ADMIN/USER) cohérent entre schéma Prisma (Task 3), auth (Task 4) et permissions (Task 5).

## Points d'attention pour l'exécutant
- Le flux OAuth Discord réel nécessite une app Discord configurée (redirect URI) — infaisable en CI ; les E2E testent donc l'état déconnecté uniquement.
- PostgreSQL est natif sur la machine (pas de Docker en dev). Docker Compose est réservé au déploiement prod sur le Kimsufi (Plan 4). Les commandes `npm`/`npx`/`psql` fonctionnent en PowerShell.
- `.env.local` ne doit jamais être commité (secrets Discord + AUTH_SECRET).
