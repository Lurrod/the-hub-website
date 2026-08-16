import { db } from "@/lib/db";
import {
  tournamentDescription,
  teamDescription,
  playerDescription,
  matchDescription,
} from "@/lib/seo-descriptions";

// Lectures minimales dédiées aux `generateMetadata` : le libellé de l'onglet
// et de quoi assembler une meta description propre à la fiche — jamais l'objet
// complet chargé par la page. Sans description dédiée, les ~170 fiches
// partageaient mot pour mot celle du layout (audit SEO du 17/08/2026).

export interface FicheSeo {
  title: string;
  description: string;
}

// Titres seuls, pour les pages de gestion et d'admin : elles sont noindex,
// une description leur serait inutile et la lecture reste au strict minimum.

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

export async function tournamentSeo(id: string): Promise<FicheSeo | null> {
  const row = await db.tournament.findUnique({
    where: { id },
    select: {
      name: true,
      startDate: true,
      endDate: true,
      _count: { select: { participants: true } },
    },
  });
  if (!row) return null;
  return {
    title: row.name,
    description: tournamentDescription({
      name: row.name,
      startDate: row.startDate,
      endDate: row.endDate,
      teamCount: row._count.participants,
    }),
  };
}

export async function teamSeo(id: string): Promise<FicheSeo | null> {
  const row = await db.team.findUnique({
    where: { id },
    select: { name: true, tag: true, description: true },
  });
  if (!row) return null;
  return { title: row.name, description: teamDescription(row) };
}

export async function playerSeo(id: string): Promise<FicheSeo | null> {
  const row = await db.player.findUnique({
    where: { id },
    select: {
      pseudo: true,
      memberships: {
        where: { leaveDate: null },
        select: { team: { select: { name: true } } },
        take: 1,
      },
    },
  });
  if (!row) return null;
  return {
    title: row.pseudo,
    description: playerDescription({
      pseudo: row.pseudo,
      teamName: row.memberships[0]?.team.name ?? null,
    }),
  };
}

/** Titre « KC vs FNC » à partir des tags des deux équipes du match. */
export async function matchSeo(id: string): Promise<FicheSeo | null> {
  const row = await db.match.findUnique({
    where: { id },
    select: {
      scoreA: true,
      scoreB: true,
      status: true,
      forfeit: true,
      date: true,
      teamA: { select: { name: true, tag: true } },
      teamB: { select: { name: true, tag: true } },
      tournament: { select: { name: true } },
    },
  });
  if (!row) return null;
  return {
    title: `${row.teamA.tag} vs ${row.teamB.tag}`,
    description: matchDescription({
      teamAName: row.teamA.name,
      teamBName: row.teamB.name,
      scoreA: row.scoreA,
      scoreB: row.scoreB,
      finished: row.status === "FINISHED",
      forfeit: row.forfeit === "TEAM_A" ? "A" : row.forfeit === "TEAM_B" ? "B" : null,
      tournamentName: row.tournament.name,
      date: row.date,
    }),
  };
}
