import { db } from "@/lib/db";
import { buildBracket } from "@/lib/bracket";
import { computeAge } from "@/lib/dates";
import { describeError, logger } from "@/lib/logger";
import { getPlayerOverview } from "@/lib/data/player-overview";
import { roleLabel } from "@/lib/roles";
import { ACCOUNT_TYPE_LABELS, type AccountTypeKey } from "@/lib/account-types";
import {
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
  type TournamentFormat,
  type TournamentStatus,
} from "@/lib/constants";

/**
 * Données réelles des aperçus de la page d'accueil.
 *
 * La vitrine montrait des équipes et des chiffres inventés. Elle lit désormais
 * la base : en production, ce sont les vrais matchs, les vraies fiches et les
 * vraies annonces qui s'affichent.
 *
 * Trois règles tiennent tout ce fichier :
 *
 * 1. **Chaque aperçu est facultatif.** Un `null` n'est pas une erreur, c'est
 *    « il n'y a pas encore de quoi remplir cet aperçu ». Le composant retombe
 *    alors sur son exemple figé plutôt que d'afficher un cadre vide.
 * 2. **Rien ne doit faire tomber l'accueil.** Toute requête est isolée dans
 *    `safely` : une base indisponible coûte un aperçu, pas la page.
 * 3. **Aucune donnée personnelle en trace.** On journalise l'échec, jamais le
 *    contenu — même règle que le reste du projet (`lib/logger.ts`).
 */

/** Nombre de lignes affichées dans l'aperçu de scoreboard. */
const SCOREBOARD_LINES = 5;

/**
 * Cartes minimum pour qu'un joueur soit mis en vitrine.
 *
 * Deux : c'est ce qu'il faut pour tracer une courbe de rating. En dessous, le
 * panneau perdrait sa moitié basse et n'illustrerait plus grand-chose.
 */
const MIN_MAPS_FOR_SHOWCASE = 2;

/** Points de la courbe de rating de l'aperçu joueur. */
const TREND_POINTS = 12;

/** Lignes de winrate par map affichées sur l'aperçu joueur. */
const MAP_ROWS = 3;

/** Annonces affichées dans l'aperçu recrutement. */
const AD_ROWS = 3;

/**
 * Exécute une lecture en absorbant son échec.
 *
 * L'accueil est la page la plus servie du site : une requête d'illustration
 * n'a pas à pouvoir la mettre par terre. On trace et on rend `null`.
 */
async function safely<T>(event: string, run: () => Promise<T | null>): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    logger.error(event, describeError(error));
    return null;
  }
}

/** Équipe telle qu'affichée dans un aperçu : logo si elle en a un, sinon monogramme. */
export type ShowcaseTeam = {
  tag: string;
  name: string;
  logo: string | null;
};

export type ShowcaseScoreboardLine = {
  pseudo: string;
  agent: string | null;
  rating: number;
  acs: number;
  kills: number;
  deaths: number;
  assists: number;
  kast: number;
  adr: number;
};

export type ShowcaseScoreboard = {
  matchId: string;
  teamA: ShowcaseTeam;
  teamB: ShowcaseTeam;
  mapName: string;
  /** Rang de la carte dans la série et longueur de la série, pour « carte 2 sur 3 ». */
  mapIndex: number;
  mapCount: number;
  roundsA: number;
  roundsB: number;
  lines: ShowcaseScoreboardLine[];
};

/**
 * Dernière carte dont le scoreboard est importé.
 *
 * On part de `MatchMap` et non de `Match` : un match peut être terminé sans
 * que ses statistiques aient été récupérées, et c'est le scoreboard qu'on met
 * en vitrine. `startedAt` fait foi quand il existe (heure réelle donnée par
 * Riot), la date du match sert de repli pour les cartes saisies à la main.
 */
export function getShowcaseScoreboard(): Promise<ShowcaseScoreboard | null> {
  return safely("landing.scoreboard", async () => {
    const map = await db.matchMap.findFirst({
      where: { stats: { some: {} } },
      orderBy: [{ startedAt: "desc" }, { match: { date: "desc" } }, { order: "desc" }],
      select: {
        order: true,
        mapName: true,
        scoreA: true,
        scoreB: true,
        match: {
          select: {
            id: true,
            teamA: { select: { tag: true, name: true, logo: true } },
            teamB: { select: { tag: true, name: true, logo: true } },
            _count: { select: { maps: true } },
          },
        },
        stats: {
          select: {
            teamSide: true,
            agent: true,
            riotName: true,
            kills: true,
            deaths: true,
            assists: true,
            acs: true,
            adr: true,
            kast: true,
            rating: true,
            player: { select: { pseudo: true } },
          },
        },
      },
    });
    if (!map) return null;

    // Les cinq joueurs du camp qui a gagné la carte, du meilleur rating au
    // moins bon. Montrer les dix lignes demanderait la largeur d'une vraie
    // fiche match ; mélanger les deux camps sur cinq lignes donnerait un
    // tableau que rien n'explique.
    const winning = map.scoreA >= map.scoreB ? "A" : "B";
    const lines = map.stats
      .filter((s) => s.teamSide === winning)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, SCOREBOARD_LINES)
      .map((s) => ({
        pseudo: s.player?.pseudo ?? s.riotName,
        agent: s.agent,
        rating: s.rating,
        acs: s.acs,
        kills: s.kills,
        deaths: s.deaths,
        assists: s.assists,
        kast: s.kast,
        adr: s.adr,
      }));
    if (lines.length === 0) return null;

    return {
      matchId: map.match.id,
      teamA: map.match.teamA,
      teamB: map.match.teamB,
      mapName: map.mapName,
      // `order` est indexé à partir de 0 en base, l'affichage compte à partir de 1.
      mapIndex: map.order + 1,
      mapCount: map.match._count.maps,
      roundsA: map.scoreA,
      roundsB: map.scoreB,
      lines,
    };
  });
}

export type ShowcasePlayer = {
  id: string;
  pseudo: string;
  photo: string | null;
  nationality: string | null;
  /** Rôle Valorant, ou type de compte quand la fiche n'est pas celle d'un joueur. */
  qualifier: string | null;
  teamName: string | null;
  age: number | null;
  topAgent: { agent: string; pct: number } | null;
  kd: number;
  kills: number;
  deaths: number;
  bestGame: { kills: number; opponentTag: string | null } | null;
  /** Ratings carte par carte, la plus ancienne d'abord. */
  trend: number[];
  avgRating: number;
  /** Moyenne d'ACS, affichée par la carte de partage comme sur la vraie fiche. */
  avgAcs: number;
  mapRecords: { mapName: string; winratePct: number; wins: number; maps: number }[];
};

/**
 * Le joueur dont la fiche est la mieux remplie : celui qui a le plus de cartes.
 *
 * Trier par rating serait plus flatteur mais injuste et instable : sur un site
 * jeune, trois bonnes parties suffisent à passer devant un joueur régulier, et
 * la vitrine changerait de tête à chaque import. Le nombre de cartes désigne
 * au contraire la fiche qui a le plus à montrer — une courbe fournie, plusieurs
 * maps, un vrai historique — ce que ce bloc raconte précisément. Le rating
 * départage les ex æquo, le pseudo tranche le reste pour que le choix soit
 * reproductible.
 */
export function getShowcasePlayer(): Promise<ShowcasePlayer | null> {
  return safely("landing.player", async () => {
    const [best] = await db.$queryRaw<{ id: string }[]>`
      SELECT p."id"
      FROM "Player" p
      JOIN "PlayerGameStat" s ON s."playerId" = p."id"
      GROUP BY p."id"
      HAVING COUNT(s."id") >= ${MIN_MAPS_FOR_SHOWCASE}
      ORDER BY COUNT(s."id") DESC, AVG(s."rating") DESC, p."pseudo" ASC
      LIMIT 1
    `;
    if (!best) return null;

    const [player, overview] = await Promise.all([
      db.player.findUnique({
        where: { id: best.id },
        select: {
          id: true,
          pseudo: true,
          photo: true,
          nationality: true,
          valorantRole: true,
          accountType: true,
          birthdate: true,
          memberships: {
            where: { leaveDate: null },
            take: 1,
            select: { team: { select: { name: true } } },
          },
        },
      }),
      getPlayerOverview(best.id),
    ]);
    if (!player) return null;

    return {
      id: player.id,
      pseudo: player.pseudo,
      photo: player.photo,
      nationality: player.nationality,
      // Un coach ou un manager n'a pas de rôle Valorant : son type de compte
      // dit alors ce qu'il fait, plutôt que de laisser la ligne amputée.
      qualifier:
        roleLabel(player.valorantRole) ??
        ACCOUNT_TYPE_LABELS[player.accountType as AccountTypeKey] ??
        null,
      teamName: player.memberships[0]?.team.name ?? null,
      age: computeAge(player.birthdate),
      topAgent: overview.topAgent
        ? { agent: overview.topAgent.agent, pct: overview.topAgent.pct }
        : null,
      kd: overview.kd,
      kills: overview.kills,
      deaths: overview.deaths,
      bestGame: overview.bestGame
        ? { kills: overview.bestGame.kills, opponentTag: overview.bestGame.opponentTag }
        : null,
      // `overview.trend` est déjà chronologique (cf. `ratingTrend`) : on prend
      // sa FIN pour avoir les dernières cartes, pas son début.
      trend: overview.trend.slice(-TREND_POINTS).map((t) => t.rating),
      avgRating: overview.avgRating,
      avgAcs: Math.round(overview.avgAcs),
      mapRecords: overview.mapRecords.slice(0, MAP_ROWS),
    };
  });
}

export type ShowcaseBout = {
  top: ShowcaseTeam & { score: number };
  bottom: ShowcaseTeam & { score: number };
};

export type ShowcaseTournament = {
  id: string;
  name: string;
  logo: string | null;
  format: string;
  status: TournamentStatus;
  statusLabel: string;
  teamCount: number;
  prizePool: string | null;
  /** Deux confrontations d'un même tour, puis celle du tour suivant. */
  semis: ShowcaseBout[];
  final: ShowcaseBout | null;
  /** Libellés des deux tours, tels que l'organisateur les a nommés. */
  semisLabel: string;
  finalLabel: string;
};

/** Un match de bracket, réduit aux deux camps et à leur score. */
function toBout(m: {
  scoreA: number;
  scoreB: number;
  teamA: ShowcaseTeam;
  teamB: ShowcaseTeam;
}): ShowcaseBout {
  return {
    top: { ...m.teamA, score: m.scoreA },
    bottom: { ...m.teamB, score: m.scoreB },
  };
}

/**
 * Un tournoi dont le bracket est assez avancé pour être montré.
 *
 * L'aperçu dessine deux confrontations menant à une troisième : il lui faut
 * donc un tour d'au moins deux matchs terminés, suivi d'un dernier match.
 *
 * L'ordre des tours vient de `buildBracket`, celui-là même qui dessine la page
 * d'un tournoi. S'en remettre au tri des libellés donnait n'importe quoi : sur
 * une double élimination, « LB Round 1 » précède « UB Quarts de finale » dans
 * l'ordre alphabétique, et le tracé affirmait une progression qui n'existe pas.
 *
 * On ne retient que les sections construites en arbre (`single`, `upper`) :
 * là seulement, deux matchs d'un tour mènent réellement à un match du suivant.
 * Un lower bracket est rendu en colonnes, sans cette garantie.
 */
export function getShowcaseTournament(): Promise<ShowcaseTournament | null> {
  return safely("landing.tournament", async () => {
    const tournaments = await db.tournament.findMany({
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      take: 10,
      select: {
        id: true,
        name: true,
        logo: true,
        format: true,
        status: true,
        prizePool: true,
        _count: { select: { participants: true } },
        matches: {
          where: { stage: "BRACKET", status: "FINISHED" },
          select: {
            id: true,
            round: true,
            bracketPosition: true,
            scoreA: true,
            scoreB: true,
            winnerId: true,
            teamAId: true,
            teamBId: true,
            teamA: { select: { tag: true, name: true, logo: true } },
            teamB: { select: { tag: true, name: true, logo: true } },
          },
        },
      },
    });

    for (const t of tournaments) {
      if (t.matches.length === 0) continue;

      const rich = new Map(t.matches.map((m) => [m.id, m]));
      const tree = buildBracket(
        t.matches.map((m) => ({
          id: m.id,
          round: m.round,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          scoreA: m.scoreA,
          scoreB: m.scoreB,
          winnerId: m.winnerId,
          position: m.bracketPosition,
          teamA: m.teamA,
          teamB: m.teamB,
        })),
        t.format as TournamentFormat
      );

      const section = tree.sections.find((s) => s.key === "single" || s.key === "upper");
      if (!section) continue;

      // Les tours vont du premier au dernier : le dernier qui porte un match
      // fait office de finale, et le tour d'avant qui en porte deux l'alimente.
      const rounds = section.rounds.map((r) => ({
        name: r.name,
        matches: r.slots
          .filter((slot) => slot.kind === "match")
          .map((slot) => rich.get(slot.match.id))
          .filter((m): m is NonNullable<typeof m> => !!m),
      }));

      const lastIndex = rounds.findLastIndex((r) => r.matches.length >= 1);
      if (lastIndex <= 0) continue;
      const feederIndex = rounds.findLastIndex((r, i) => i < lastIndex && r.matches.length >= 2);
      if (feederIndex === -1) continue;

      return {
        id: t.id,
        name: t.name,
        logo: t.logo,
        format: TOURNAMENT_FORMAT_LABELS[t.format as TournamentFormat],
        status: t.status as TournamentStatus,
        statusLabel: TOURNAMENT_STATUS_LABELS[t.status as TournamentStatus],
        teamCount: t._count.participants,
        prizePool: t.prizePool,
        semis: rounds[feederIndex].matches.slice(0, 2).map(toBout),
        final: toBout(rounds[lastIndex].matches[0]),
        semisLabel: rounds[feederIndex].name,
        finalLabel: rounds[lastIndex].name,
      };
    }
    return null;
  });
}

export type ShowcaseAd = {
  key: string;
  name: string;
  tag: string;
  logo: string | null;
  kind: "LFT" | "LFP";
  facts: string[];
};

/**
 * Les annonces les plus fraîches, joueurs et équipes mêlés.
 *
 * Le mélange est le propos du bloc : LFT et LFP vivent au même endroit. On
 * prend donc les plus récentes des deux côtés puis on trie sur la date de
 * déclaration, sans quota par type — s'il n'y a que des équipes qui recrutent
 * cette semaine, l'aperçu le dit.
 */
export function getShowcaseAds(): Promise<ShowcaseAd[] | null> {
  return safely("landing.ads", async () => {
    const [players, teams] = await Promise.all([
      db.player.findMany({
        where: { lft: true },
        orderBy: [{ lftSince: "desc" }, { pseudo: "asc" }],
        take: AD_ROWS,
        select: {
          id: true,
          pseudo: true,
          lftSince: true,
          nationality: true,
          valorantRole: true,
          accountType: true,
          memberships: {
            where: { leaveDate: null },
            take: 1,
            select: { team: { select: { name: true } } },
          },
        },
      }),
      db.team.findMany({
        where: { lfp: true },
        orderBy: [{ lfpSince: "desc" }, { name: "asc" }],
        take: AD_ROWS,
        select: {
          id: true,
          name: true,
          tag: true,
          logo: true,
          lfpSince: true,
          lfpRoles: true,
          lfpMessage: true,
          region: true,
        },
      }),
    ]);

    const fromPlayers = players.map((p) => ({
      key: `p:${p.id}`,
      name: p.pseudo,
      tag: p.pseudo.slice(0, 2).toUpperCase(),
      logo: null,
      kind: "LFT" as const,
      since: p.lftSince,
      facts: [
        roleLabel(p.valorantRole) ?? ACCOUNT_TYPE_LABELS[p.accountType as AccountTypeKey],
        p.memberships[0]?.team.name,
        p.nationality,
      ].filter((f): f is string => !!f),
    }));

    const fromTeams = teams.map((t) => ({
      key: `t:${t.id}`,
      name: t.name,
      tag: t.tag,
      logo: t.logo,
      kind: "LFP" as const,
      since: t.lfpSince,
      facts: [
        t.lfpRoles.length > 0
          ? `Cherche ${t.lfpRoles.map((r) => roleLabel(r)).join(", ")}`
          : "Ouvert à tous les rôles",
        t.lfpMessage,
        t.region,
      ].filter((f): f is string => !!f),
    }));

    // `since` n'a servi qu'au tri : il ne fait pas partie de ce qu'on affiche.
    const ads: ShowcaseAd[] = [...fromPlayers, ...fromTeams]
      .sort((a, b) => (b.since?.getTime() ?? 0) - (a.since?.getTime() ?? 0))
      .slice(0, AD_ROWS)
      .map((ad) => ({
        key: ad.key,
        name: ad.name,
        tag: ad.tag,
        logo: ad.logo,
        kind: ad.kind,
        facts: ad.facts,
      }));

    return ads.length > 0 ? ads : null;
  });
}

export type ShowcaseData = {
  scoreboard: ShowcaseScoreboard | null;
  player: ShowcasePlayer | null;
  tournament: ShowcaseTournament | null;
  ads: ShowcaseAd[] | null;
};

/** Les quatre aperçus, chargés de front : aucun ne dépend d'un autre. */
export async function getShowcaseData(): Promise<ShowcaseData> {
  const [scoreboard, player, tournament, ads] = await Promise.all([
    getShowcaseScoreboard(),
    getShowcasePlayer(),
    getShowcaseTournament(),
    getShowcaseAds(),
  ]);
  return { scoreboard, player, tournament, ads };
}
