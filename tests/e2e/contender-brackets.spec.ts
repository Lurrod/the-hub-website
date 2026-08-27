import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createAccount, disconnect, signIn, type TestAccount } from "./session";

/*
 * Un match de Premier Contender saisi via la gestion perdait son bracket : la
 * persistance effaçait `groupId` de tout match hors phase de poule, alors que
 * ce format range ses brackets parallèles dans des `Group` et ne joue que des
 * matchs de playoffs. Tous les matchs sortaient orphelins et la page publique
 * retombait sur un arbre unique au lieu des deux brackets. Ce parcours vérifie
 * que le bracket choisi dans le formulaire est bien enregistré et affiché.
 */

const db = new PrismaClient();

/** Équipes du jeu de démonstration (`npm run db:seed:vlr`). */
const TEAM_A = { id: "vlr-th", name: "Team Heretics" };
const TEAM_B = { id: "vlr-vit", name: "Team Vitality" };

let account: TestAccount;
let tournamentId: string;
let bracketAId: string;

test.beforeAll(async () => {
  account = await createAccount({ onboarded: true });
  const tournament = await db.tournament.create({
    data: {
      name: `E2E Contender ${Date.now()}`,
      region: "France",
      format: "PREMIER_CONTENDER",
      managers: { create: { userId: account.userId, role: "OWNER" } },
      participants: {
        create: [{ teamId: TEAM_A.id }, { teamId: TEAM_B.id }],
      },
      groups: {
        create: [{ name: "Bracket A" }, { name: "Bracket B" }],
      },
    },
    include: { groups: true },
  });
  tournamentId = tournament.id;
  bracketAId = tournament.groups.find((g) => g.name === "Bracket A")!.id;
});

test.afterAll(async () => {
  // Matchs, groupes, inscriptions et managers tombent en cascade avec le tournoi.
  await db.tournament.deleteMany({ where: { id: tournamentId } });
  await account.cleanup();
  await db.$disconnect();
  await disconnect();
});

test("un match Contender garde le bracket choisi à la création", async ({ context, page }) => {
  await signIn(context, account);
  await page.goto(`/tournois/${tournamentId}/gestion/competition`);

  // Les affectations d'équipes portent elles aussi des selects `groupId` : on
  // vise celui du formulaire de création, repéré par son bouton d'envoi. Le
  // libellé enveloppe le select, dont les options comptent dans le texte du
  // label — `getByLabel` ne peut donc pas le viser par « Bracket » seul.
  const creation = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Créer le match" }) });
  await expect(creation.locator("label", { hasText: /^Bracket/ })).toBeVisible();
  // La phase est choisie explicitement depuis que le format joue aussi une
  // ligne régulière : le formulaire propose « Poule » et « Playoffs », et se
  // place sur la première. Sans ce choix, le match partirait en phase de poule
  // et le test ne vérifierait plus rien du bracket.
  await creation.locator('select[name="stage"]').selectOption("BRACKET");
  await creation.locator('select[name="teamAId"]').selectOption(TEAM_A.id);
  await creation.locator('select[name="teamBId"]').selectOption(TEAM_B.id);
  await creation.locator('select[name="groupId"]').selectOption(bracketAId);
  await creation.getByLabel(/^Tour/).fill("Finale");
  await creation.getByRole("button", { name: "Créer le match" }).click();

  // L'action redirige vers l'URL déjà courante : `waitForURL` répondrait tout
  // de suite et la base serait lue avant l'écriture. On attend donc la ligne
  // du match dans la liste, qui n'apparaît qu'après redirect et revalidation.
  // Aller-retour serveur + revalidation : sous la charge de la suite complète,
  // les 5 s par défaut ne suffisent pas toujours.
  await expect(page.getByText("Team Heretics 0-0 Team Vitality")).toBeVisible({
    timeout: 15_000,
  });

  const match = await db.match.findFirst({
    where: { tournamentId },
    select: { groupId: true, stage: true },
  });
  expect(match?.stage).toBe("BRACKET");
  expect(match?.groupId).toBe(bracketAId);

  // La page publique range ce match sous la section de son bracket parallèle.
  await page.goto(`/tournois/${tournamentId}`);
  await expect(page.getByText("Bracket A", { exact: true })).toBeVisible();
});
