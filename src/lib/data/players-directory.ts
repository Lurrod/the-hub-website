import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { clampPage, pageOffset } from "@/lib/pagination";
import { killDeathRatio, type PlayerDirectoryFilters } from "@/lib/players-directory";
import { capSearchQuery } from "@/lib/search-core";

/** Joueurs affichés par page dans l'annuaire. */
export const PLAYERS_PER_PAGE = 25;

export type DirectoryRow = {
  id: string;
  pseudo: string;
  photo: string | null;
  nationality: string | null;
  valorantRole: string | null;
  teamId: string | null;
  teamTag: string | null;
  maps: number;
  rating: number;
  acs: number;
  kd: number;
};

type RawRow = {
  id: string;
  pseudo: string;
  photo: string | null;
  nationality: string | null;
  valorantRole: string | null;
  teamId: string | null;
  teamTag: string | null;
  maps: number;
  rating: number;
  acs: number;
  kills: number;
  deaths: number;
};

/**
 * Conditions communes au comptage et à la sélection.
 *
 * Le statut d'équipe s'exprime sur la jointure d'adhésion active, d'où sa
 * présence ici plutôt que dans un `where` séparé.
 */
function conditions(f: PlayerDirectoryFilters): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (f.role) parts.push(Prisma.sql`p."valorantRole"::text = ${f.role}`);
  // `f.q` est déjà borné par `normalizePlayerSearch` côté page, mais la couche
  // data ne doit pas dépendre de son appelant : on replafonne ici.
  if (f.q) parts.push(Prisma.sql`p."pseudo" ILIKE ${`%${capSearchQuery(f.q)}%`}`);
  if (f.team === "team") parts.push(Prisma.sql`m."id" IS NOT NULL`);
  if (f.team === "free") parts.push(Prisma.sql`m."id" IS NULL`);
  return Prisma.join(parts, " AND ");
}

/**
 * Clause de tri.
 *
 * `maps = 0` passe en premier critère pour tous les tris statistiques : un
 * joueur sans partie n'a pas un rating de 0, il n'en a pas — le reléguer en
 * fin de liste évite de laisser croire à une contre-performance. Le pseudo
 * départage, pour que deux pages successives ne se recouvrent jamais.
 */
function orderBy(f: PlayerDirectoryFilters): Prisma.Sql {
  const tail = Prisma.sql`, p."pseudo" ASC`;
  switch (f.sort) {
    case "pseudo":
      return Prisma.sql`p."pseudo" ASC`;
    case "maps":
      return Prisma.sql`COUNT(s."id") DESC${tail}`;
    case "acs":
      return Prisma.sql`(COUNT(s."id") = 0), COALESCE(AVG(s."acs"), 0) DESC${tail}`;
    default:
      return Prisma.sql`(COUNT(s."id") = 0), COALESCE(AVG(s."rating"), 0) DESC${tail}`;
  }
}

/**
 * Annuaire des joueurs, trié et paginé EN BASE.
 *
 * Volontairement en SQL : classer sur une moyenne calculée impose de joindre
 * les lignes de scoreboard, et le faire en mémoire reviendrait à rapatrier
 * toutes les statistiques du site à chaque affichage — le défaut qui existait
 * déjà sur la page d'accueil.
 *
 * Les joueurs sans aucune partie sont conservés : la page est un annuaire
 * autant qu'un classement, et un nouvel inscrit doit pouvoir s'y trouver.
 */
export async function listPlayersDirectory(f: PlayerDirectoryFilters, page = 1) {
  const where = conditions(f);

  const [{ count }] = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT p."id") AS count
    FROM "Player" p
    LEFT JOIN "TeamMembership" m ON m."playerId" = p."id" AND m."leaveDate" IS NULL
    WHERE ${where}
  `;
  const total = Number(count);
  const current = clampPage(page, total, PLAYERS_PER_PAGE);

  const rows = await db.$queryRaw<RawRow[]>`
    SELECT
      p."id", p."pseudo", p."photo", p."nationality", p."valorantRole"::text AS "valorantRole",
      t."id" AS "teamId", t."tag" AS "teamTag",
      COUNT(s."id")::int AS maps,
      COALESCE(AVG(s."rating"), 0)::float8 AS rating,
      COALESCE(AVG(s."acs"), 0)::float8 AS acs,
      COALESCE(SUM(s."kills"), 0)::int AS kills,
      COALESCE(SUM(s."deaths"), 0)::int AS deaths
    FROM "Player" p
    LEFT JOIN "TeamMembership" m ON m."playerId" = p."id" AND m."leaveDate" IS NULL
    LEFT JOIN "Team" t ON t."id" = m."teamId"
    LEFT JOIN "PlayerGameStat" s ON s."playerId" = p."id"
    WHERE ${where}
    GROUP BY p."id", t."id", t."tag"
    ORDER BY ${orderBy(f)}
    LIMIT ${PLAYERS_PER_PAGE} OFFSET ${pageOffset(current, PLAYERS_PER_PAGE)}
  `;

  const players: DirectoryRow[] = rows.map((r) => ({
    id: r.id,
    pseudo: r.pseudo,
    photo: r.photo,
    nationality: r.nationality,
    valorantRole: r.valorantRole,
    teamId: r.teamId,
    teamTag: r.teamTag,
    maps: r.maps,
    rating: Math.round(r.rating * 100) / 100,
    acs: Math.round(r.acs),
    kd: killDeathRatio(r.kills, r.deaths),
  }));

  return { players, total, page: current, pageSize: PLAYERS_PER_PAGE };
}
