import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createAccount, signIn, disconnect, type TestAccount } from "./session";

const db = new PrismaClient();

test.afterAll(async () => {
  await db.$disconnect();
  await disconnect();
});

/**
 * Fusion des doublons d'équipes.
 *
 * Ces parcours valent test d'intégration de `fusionnerPaire` : la fonction vit
 * dans `src/lib/data`, hors du périmètre de couverture unitaire, et son travail
 * est précisément d'orchestrer des écritures liées. Ce qu'elle doit garantir ne
 * se vérifie qu'en base — d'où les assertions sur les lignes plutôt que sur
 * l'écran une fois la fusion faite.
 *
 * L'enjeu justifie le détail : `Match.teamA` et `teamB` sont en
 * `onDelete: Cascade`. Une fusion qui supprimerait la coquille avant d'avoir
 * déplacé ses matchs les effacerait sans retour.
 */

const PREFIXE = "dbl-";

async function compteAdmin(): Promise<TestAccount> {
  const compte = await createAccount({ onboarded: true });
  await db.user.update({ where: { id: compte.userId }, data: { globalRole: "ADMIN" } });
  return compte;
}

/** Efface tout ce que ces parcours créent, dans l'ordre des dépendances. */
async function nettoyer() {
  await db.match.deleteMany({ where: { tournamentId: `${PREFIXE}tournoi` } });
  await db.tournamentParticipant.deleteMany({ where: { tournamentId: `${PREFIXE}tournoi` } });
  await db.tournament.deleteMany({ where: { id: `${PREFIXE}tournoi` } });
  await db.teamMembership.deleteMany({
    where: { teamId: { in: [`${PREFIXE}miroir`, `${PREFIXE}saisie`] } },
  });
  await db.team.deleteMany({ where: { id: { in: [`${PREFIXE}miroir`, `${PREFIXE}saisie`] } } });
  await db.player.deleteMany({ where: { id: `${PREFIXE}joueur` } });
}

/**
 * Monte la situation la plus défavorable qu'on puisse rencontrer : les deux
 * fiches sont inscrites au même tournoi et gérées par le même utilisateur. Les
 * deux contraintes d'unicité — `(tournamentId, teamId)` et `(teamId, userId)` —
 * sauteraient si la fusion se contentait de déplacer les lignes.
 */
async function monterLeDecor(userId: string) {
  await nettoyer();

  await db.tournament.create({
    data: { id: `${PREFIXE}tournoi`, name: "Doublons — tournoi témoin", region: "France" },
  });
  await db.team.create({
    data: {
      id: `${PREFIXE}miroir`,
      name: "Doublon Témoin",
      tag: "DBT",
      region: "France",
      premierManaged: true,
      premierTeamId: `${PREFIXE}riot`,
      premierRecord: "3-1-42",
      logo: "logo-du-miroir",
    },
  });
  await db.team.create({
    data: { id: `${PREFIXE}saisie`, name: "Doublon Témoin Esports", tag: "DBT", region: "France" },
  });

  // Un adversaire est nécessaire : un match a deux équipes, et opposer les deux
  // fiches de la paire ferait légitimement refuser la fusion.
  const adversaire = await db.team.findFirst({
    where: { id: { notIn: [`${PREFIXE}miroir`, `${PREFIXE}saisie`] } },
    select: { id: true },
  });
  if (!adversaire) throw new Error("Aucune équipe pour servir d'adversaire.");

  await db.match.create({
    data: {
      id: `${PREFIXE}match`,
      tournamentId: `${PREFIXE}tournoi`,
      teamAId: `${PREFIXE}miroir`,
      teamBId: adversaire.id,
      winnerId: `${PREFIXE}miroir`,
      status: "FINISHED",
      scoreA: 2,
      scoreB: 0,
    },
  });

  // Les deux collisions, montées à dessein.
  await db.tournamentParticipant.createMany({
    data: [
      { tournamentId: `${PREFIXE}tournoi`, teamId: `${PREFIXE}miroir` },
      { tournamentId: `${PREFIXE}tournoi`, teamId: `${PREFIXE}saisie` },
    ],
  });
  await db.teamManager.createMany({
    data: [
      { teamId: `${PREFIXE}miroir`, userId },
      { teamId: `${PREFIXE}saisie`, userId },
    ],
  });

  return { adversaireId: adversaire.id };
}

test("la fusion déplace tout, absorbe les collisions et supprime la coquille", async ({
  page,
  context,
}) => {
  const compte = await compteAdmin();
  try {
    await monterLeDecor(compte.userId);
    await signIn(context, compte);

    await page.goto("/admin/doublons");
    const ligne = page.locator("main section ul li").filter({ hasText: "Doublon Témoin Esports" });
    await expect(ligne).toHaveCount(1);

    await ligne.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Préparer la fusion/ }).click();

    // Le récapitulatif nomme ce qui va bouger avant que rien ne soit écrit.
    await expect(page).toHaveURL(/\/admin\/doublons\/fusion/);
    await expect(page.getByRole("heading", { name: "Confirmer les fusions" })).toBeVisible();
    await expect(page.getByText("Doublon Témoin", { exact: false }).first()).toBeVisible();

    await page.getByRole("button", { name: /Fusionner cette 1 paire|Fusionner ces/ }).click();
    await expect(page).toHaveURL(/fusionnees=1/);

    // --- Ce qui compte se lit en base, pas à l'écran ------------------------
    const coquille = await db.team.findUnique({ where: { id: `${PREFIXE}miroir` } });
    expect(coquille).toBeNull();

    const conservee = await db.team.findUnique({ where: { id: `${PREFIXE}saisie` } });
    expect(conservee?.premierTeamId).toBe(`${PREFIXE}riot`);
    expect(conservee?.premierRecord).toBe("3-1-42");
    // Reste faux : le nom a été choisi ici, la synchronisation ne doit pas
    // l'écraser. C'est l'état des six équipes déjà correctes en production.
    expect(conservee?.premierManaged).toBe(false);
    // Le logo de Riot comble une absence, il ne remplace rien.
    expect(conservee?.logo).toBe("logo-du-miroir");

    // Le match a survécu à la suppression de la coquille et pointe la fiche
    // conservée, vainqueur compris.
    const match = await db.match.findUnique({ where: { id: `${PREFIXE}match` } });
    expect(match).not.toBeNull();
    expect(match?.teamAId).toBe(`${PREFIXE}saisie`);
    expect(match?.winnerId).toBe(`${PREFIXE}saisie`);

    // Les deux collisions se sont résolues en une seule ligne, pas en doublon
    // ni en violation de contrainte.
    const inscriptions = await db.tournamentParticipant.count({
      where: { tournamentId: `${PREFIXE}tournoi`, teamId: `${PREFIXE}saisie` },
    });
    expect(inscriptions).toBe(1);
    const managers = await db.teamManager.count({
      where: { teamId: `${PREFIXE}saisie`, userId: compte.userId },
    });
    expect(managers).toBe(1);
  } finally {
    await nettoyer();
    await compte.cleanup();
  }
});

test("la fusion est refusée quand les deux fiches se sont affrontées", async ({
  page,
  context,
}) => {
  const compte = await compteAdmin();
  try {
    await monterLeDecor(compte.userId);
    // Le match oppose désormais les deux fiches de la paire : les fusionner
    // produirait un match contre soi-même.
    await db.match.update({
      where: { id: `${PREFIXE}match` },
      data: { teamBId: `${PREFIXE}saisie` },
    });
    await signIn(context, compte);

    await page.goto("/admin/doublons");
    const ligne = page.locator("main section ul li").filter({ hasText: "Doublon Témoin Esports" });
    await ligne.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Préparer la fusion/ }).click();
    await page.getByRole("button", { name: /Fusionner/ }).click();

    await expect(page).toHaveURL(/fusionnees=0/);
    await expect(page.getByText(/match contre soi-même/)).toBeVisible();

    // Refus veut dire refus : rien n'a bougé.
    const coquille = await db.team.findUnique({ where: { id: `${PREFIXE}miroir` } });
    expect(coquille).not.toBeNull();
    const match = await db.match.findUnique({ where: { id: `${PREFIXE}match` } });
    expect(match?.teamAId).toBe(`${PREFIXE}miroir`);
  } finally {
    await nettoyer();
    await compte.cleanup();
  }
});
