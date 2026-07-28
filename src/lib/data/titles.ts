import { db } from "@/lib/db";

// Lectures minimales dédiées aux `generateMetadata` : on ne veut que le libellé
// affiché dans l'onglet, pas l'objet complet chargé par la page.

export async function tournamentTitle(id: string): Promise<string | null> {
  const row = await db.tournament.findUnique({ where: { id }, select: { name: true } });
  return row?.name ?? null;
}

export async function teamTitle(id: string): Promise<string | null> {
  const row = await db.team.findUnique({ where: { id }, select: { name: true } });
  return row?.name ?? null;
}

export async function playerTitle(id: string): Promise<string | null> {
  const row = await db.player.findUnique({ where: { id }, select: { pseudo: true } });
  return row?.pseudo ?? null;
}

/** « KC vs FNC » à partir des tags des deux équipes du match. */
export async function matchTitle(id: string): Promise<string | null> {
  const row = await db.match.findUnique({
    where: { id },
    select: { teamA: { select: { tag: true } }, teamB: { select: { tag: true } } },
  });
  if (!row) return null;
  return `${row.teamA.tag} vs ${row.teamB.tag}`;
}
