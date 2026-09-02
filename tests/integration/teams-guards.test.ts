import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { deleteTeamIfUnused, removeTeamManagerIfNotLast } from "@/lib/data/teams";

/**
 * Les deux gardes de `src/lib/data/teams.ts`, contre une vraie base.
 *
 * Ce sont les fonctions les plus dangereuses du dépôt et elles n'avaient aucun
 * filet : `Match.teamA` et `Match.teamB` sont déclarés `onDelete: Cascade`,
 * donc supprimer une équipe efface ses matchs dans TOUS les tournois, y compris
 * ceux gérés par d'autres. Un mock Prisma ne prouve rien ici — c'est justement
 * le comportement de la base qu'il faut vérifier.
 */

async function equipe(nom: string) {
  return db.team.create({ data: { name: nom, tag: nom.slice(0, 3).toUpperCase(), region: "FR" } });
}

async function tournoi(nom = "Coupe") {
  return db.tournament.create({ data: { name: nom, region: "FR" } });
}

describe("deleteTeamIfUnused", () => {
  it("supprime une équipe qui ne porte aucun historique", async () => {
    const t = await equipe("Solo");
    expect(await deleteTeamIfUnused(t.id)).toBe(true);
    expect(await db.team.findUnique({ where: { id: t.id } })).toBeNull();
  });

  it("refuse une équipe inscrite à un tournoi", async () => {
    const t = await equipe("Inscrite");
    const tour = await tournoi();
    await db.tournamentParticipant.create({ data: { tournamentId: tour.id, teamId: t.id } });

    expect(await deleteTeamIfUnused(t.id)).toBe(false);
    expect(await db.team.findUnique({ where: { id: t.id } })).not.toBeNull();
  });

  /**
   * Le cas qui a motivé la garde actuelle : une équipe DÉSINSCRITE dont les
   * matchs subsistent. Compter les seules inscriptions la laissait passer, et
   * la cascade emportait alors l'historique des deux tournois.
   */
  it("refuse une équipe désinscrite dont les matchs subsistent", async () => {
    const a = await equipe("Alpha");
    const b = await equipe("Beta");
    const tour = await tournoi();
    await db.match.create({
      data: { tournamentId: tour.id, teamAId: a.id, teamBId: b.id },
    });
    // Aucune inscription : seul le match rattache encore l'équipe.
    expect(await db.tournamentParticipant.count({ where: { teamId: a.id } })).toBe(0);

    expect(await deleteTeamIfUnused(a.id)).toBe(false);
    expect(await db.team.findUnique({ where: { id: a.id } })).not.toBeNull();
    expect(await db.match.count()).toBe(1);
  });

  it("refuse aussi quand l'équipe n'est que l'adversaire", async () => {
    const a = await equipe("Gamma");
    const b = await equipe("Delta");
    const tour = await tournoi();
    await db.match.create({ data: { tournamentId: tour.id, teamAId: a.id, teamBId: b.id } });

    expect(await deleteTeamIfUnused(b.id)).toBe(false);
  });

  /**
   * La démonstration que la garde sert à quelque chose : sans elle, la cascade
   * de Prisma efface le match. On le prouve en supprimant directement.
   */
  it("la cascade EST bien destructrice quand on court-circuite la garde", async () => {
    const a = await equipe("Epsilon");
    const b = await equipe("Zeta");
    const tour = await tournoi();
    await db.match.create({ data: { tournamentId: tour.id, teamAId: a.id, teamBId: b.id } });

    await db.team.delete({ where: { id: a.id } });
    expect(await db.match.count()).toBe(0);
  });
});

describe("removeTeamManagerIfNotLast", () => {
  async function compte(nom: string) {
    return db.user.create({ data: { name: nom } });
  }

  it("retire un manager quand un propriétaire subsiste", async () => {
    const t = await equipe("Roster");
    const [proprio, manager] = await Promise.all([compte("proprio"), compte("manager")]);
    await db.teamManager.createMany({
      data: [
        { teamId: t.id, userId: proprio.id, role: "OWNER" },
        { teamId: t.id, userId: manager.id, role: "MANAGER" },
      ],
    });

    expect(await removeTeamManagerIfNotLast(t.id, manager.id)).toBe(true);
    expect(await db.teamManager.count({ where: { teamId: t.id } })).toBe(1);
  });

  it("refuse de retirer le dernier propriétaire", async () => {
    const t = await equipe("Orpheline");
    const proprio = await compte("seul");
    await db.teamManager.create({ data: { teamId: t.id, userId: proprio.id, role: "OWNER" } });

    expect(await removeTeamManagerIfNotLast(t.id, proprio.id)).toBe(false);
    expect(await db.teamManager.count({ where: { teamId: t.id } })).toBe(1);
  });

  it("refuse même s'il reste des managers sans propriétaire", async () => {
    const t = await equipe("Bancale");
    const [proprio, manager] = await Promise.all([compte("p"), compte("m")]);
    await db.teamManager.createMany({
      data: [
        { teamId: t.id, userId: proprio.id, role: "OWNER" },
        { teamId: t.id, userId: manager.id, role: "MANAGER" },
      ],
    });

    // Retirer le seul OWNER laisserait une équipe que personne ne peut plus
    // administrer : c'est ce que la garde empêche.
    expect(await removeTeamManagerIfNotLast(t.id, proprio.id)).toBe(false);
  });
});
