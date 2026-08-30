import { db } from "@/lib/db";
import { capSearchQuery } from "@/lib/search-core";

export type SearchResults = {
  teams: { id: string; name: string; tag: string; region: string; logo: string | null }[];
  players: { id: string; pseudo: string; nationality: string | null; photo: string | null }[];
  tournaments: {
    id: string;
    name: string;
    region: string;
    status: string;
    logo: string | null;
    startDate: Date | null;
    endDate: Date | null;
    prizePool: string | null;
    _count: { participants: number };
  }[];
};

/** Recherche insensible à la casse sur équipes (nom/tag), joueurs (pseudo/realName), tournois (nom). */
export async function searchAll(query: string): Promise<SearchResults> {
  // Bornée avant d'atteindre Prisma : `contains` est paramétré (pas d'injection),
  // mais un `q` de plusieurs kilo-octets répété ferait travailler la base pour rien.
  const q = capSearchQuery(query);
  if (q.length === 0) {
    return { teams: [], players: [], tournaments: [] };
  }

  const [teams, players, tournaments] = await Promise.all([
    db.team.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { tag: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 10,
      select: { id: true, name: true, tag: true, region: true, logo: true },
    }),
    db.player.findMany({
      // Pas de filtre sur l'appartenance à une équipe : il rendait invisibles
      // les joueurs sans équipe, alors que la page /lft existe précisément
      // pour eux — un joueur cherchant une équipe était introuvable.
      where: {
        OR: [
          { pseudo: { contains: q, mode: "insensitive" } },
          { realName: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { pseudo: "asc" },
      take: 10,
      select: { id: true, pseudo: true, nationality: true, photo: true },
    }),
    db.tournament.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      orderBy: { name: "asc" },
      take: 10,
      select: {
        id: true,
        name: true,
        region: true,
        status: true,
        logo: true,
        startDate: true,
        endDate: true,
        prizePool: true,
        _count: { select: { participants: true } },
      },
    }),
  ]);

  return { teams, players, tournaments };
}
