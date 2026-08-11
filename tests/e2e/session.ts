import { PrismaClient, type AccountType } from "@prisma/client";
import type { BrowserContext } from "@playwright/test";

/**
 * Comptes de test pour les parcours connectés.
 *
 * Toute la moitié authentifiée du site — inscription, profil, gestion — n'était
 * couverte que par son refus d'accès aux visiteurs anonymes. Il manquait ce
 * qu'il faut pour *être* connecté dans un test.
 *
 * Auth.js est configuré en `session: { strategy: "database" }` : une session
 * n'est rien de plus qu'une ligne `Session` et un cookie qui porte son jeton.
 * Aucun passage par Discord n'est donc nécessaire, et c'est heureux — un test
 * ne peut pas s'authentifier auprès d'un fournisseur tiers.
 */
const db = new PrismaClient();

/** Nom du cookie de session hors HTTPS. La CI sert le build sur http://localhost. */
const SESSION_COOKIE = "authjs.session-token";

export type TestAccount = {
  userId: string;
  playerId: string;
  token: string;
  pseudo: string;
  /** Supprime le compte et tout ce qui en dépend. À appeler en `finally`. */
  cleanup: () => Promise<void>;
};

let counter = 0;

/**
 * Crée un compte jetable et sa session.
 *
 * @param opts.onboarded pose `onboardedAt`, donc un compte qui a déjà franchi
 *   l'inscription. Laisser `false` pour tester le formulaire lui-même.
 */
export async function createAccount(
  opts: { onboarded?: boolean; accountType?: AccountType; pseudo?: string } = {}
): Promise<TestAccount> {
  // Un identifiant unique par appel : les tests Playwright peuvent tourner en
  // parallèle, et deux comptes ne doivent jamais se disputer un e-mail.
  const unique = `${Date.now()}-${counter++}`;
  const pseudo = opts.pseudo ?? `E2E-${unique}`;

  const user = await db.user.create({
    data: { name: pseudo, email: `e2e-${unique}@exemple.test` },
  });
  const player = await db.player.create({
    data: {
      pseudo,
      userId: user.id,
      accountType: opts.accountType ?? "JOUEUR",
      onboardedAt: opts.onboarded ? new Date() : null,
    },
  });
  const token = `e2e-${unique}`;
  await db.session.create({
    data: {
      sessionToken: token,
      userId: user.id,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return {
    userId: user.id,
    playerId: player.id,
    token,
    pseudo,
    cleanup: async () => {
      // `Player.userId` est en `SetNull` : supprimer l'utilisateur laisserait
      // une fiche orpheline visible sur l'annuaire. On retire la fiche d'abord.
      await db.playerGameStat.deleteMany({ where: { playerId: player.id } });
      await db.teamMembership.deleteMany({ where: { playerId: player.id } });
      await db.player.deleteMany({ where: { id: player.id } });
      await db.user.deleteMany({ where: { id: user.id } });
    },
  };
}

/**
 * Connecte le navigateur sur ce compte.
 *
 * @param onboarded pose aussi le cookie `onboarded`, sans lequel le proxy
 *   renvoie vers `/onboarding` quelle que soit la fiche. C'est le second
 *   verrou du gate, indépendant de la base.
 */
export async function signIn(
  context: BrowserContext,
  account: TestAccount,
  { onboarded = true }: { onboarded?: boolean } = {}
): Promise<void> {
  const base = { domain: "localhost", path: "/" } as const;
  await context.addCookies([
    { name: SESSION_COOKIE, value: account.token, ...base },
    ...(onboarded ? [{ name: "onboarded", value: "1", ...base }] : []),
  ]);
}

/** Fiche du compte, pour vérifier ce qu'une action a réellement écrit. */
export function readPlayer(playerId: string) {
  return db.player.findUnique({
    where: { id: playerId },
    select: { accountType: true, onboardedAt: true, valorantRole: true, puuid: true, lft: true },
  });
}

export async function disconnect(): Promise<void> {
  await db.$disconnect();
}
