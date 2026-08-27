import { db } from "@/lib/db";
import { logger, describeError } from "@/lib/logger";
import { processAndStoreImage } from "@/lib/images";
import {
  frenchTiers,
  seasonOfMatch,
  seasonNumberOf,
  mutualMatchIds,
  sideOfRoster,
  playoffSeries,
  bracketNameFor,
  type PlayoffSeries,
  tournamentStatusFor,
  type PremierTier,
  type PremierSeason,
} from "@/lib/premier-core";
import { defaultBestOfFor, matchGroupIdFor } from "@/lib/bracket";
import {
  getCustomMatchById,
  getPremierHistory,
  getPremierLeaderboard,
  getPremierSeasons,
  RiotIdError,
  type CustomMatch,
} from "@/lib/henrikdev";
import type { PremierTeamEntry } from "@/lib/validation/premier";
import { importMatchMapFromRiotId } from "@/lib/match-stats";
import type { TournamentFormat } from "@/lib/constants";

/**
 * Écritures du miroir Premier.
 *
 * Ce module touche Prisma : il est hors du périmètre de couverture, comme le
 * reste de `src/lib/data/**`. Tout ce qui se décide sans base — palier,
 * rattachement à une saison, dédoublonnage, camps, étranglement — vit dans
 * `premier-core.ts` et y est testé.
 */

export type TeamSyncResult = {
  created: number;
  linked: number;
  byPremierId: Map<string, string>;
};

/**
 * Rattache ou crée les équipes d'un palier, et rend la correspondance
 * UUID Premier → identifiant d'équipe du site.
 *
 * Le rattachement passe par `premierTeamId` et jamais par le nom : une équipe
 * qui se renomme côté Riot doit rester la même ici, sans quoi son historique de
 * matchs se scinderait en deux fiches.
 */
export async function syncPremierTeams(
  entries: readonly PremierTeamEntry[]
): Promise<TeamSyncResult> {
  const byPremierId = new Map<string, string>();
  let created = 0;
  let linked = 0;

  for (const e of entries) {
    const existing = await db.team.findUnique({
      where: { premierTeamId: e.id },
      select: { id: true, name: true, tag: true },
    });

    if (existing) {
      linked += 1;
      byPremierId.set(e.id, existing.id);
      // Riot fait foi sur le nom d'une équipe Premier : c'est là qu'elle se
      // renomme, et le site doit suivre plutôt qu'afficher un nom périmé.
      if (existing.name !== e.name || existing.tag !== e.tag) {
        await db.team.update({
          where: { id: existing.id },
          data: { name: e.name, tag: e.tag },
        });
      }
      continue;
    }

    const team = await db.team.create({
      data: { name: e.name, tag: e.tag, region: "France", premierTeamId: e.id },
      select: { id: true },
    });
    created += 1;
    byPremierId.set(e.id, team.id);
    await storePremierLogo(team.id, e.customization?.image);
  }

  return { created, linked, byPremierId };
}

/**
 * Télécharge le logo d'équipe et le range dans le stockage du site.
 *
 * Pas de lien direct vers `cdn.henrikdev.xyz` : la CSP a été nettoyée de ses
 * sources d'images externes, et une équipe dont le logo pointe dehors le verrait
 * bloqué en production. Un logo manquant n'interrompt pas la synchronisation —
 * une fiche sans image reste une fiche utilisable.
 */
async function storePremierLogo(teamId: string, url: string | undefined): Promise<void> {
  if (!url) return;
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    const key = await processAndStoreImage(buf, "teams", teamId);
    await db.team.update({ where: { id: teamId }, data: { logo: key } });
  } catch (e) {
    logger.warn("premier.logo.failed", { teamId, ...describeError(e) });
  }
}

/** Format du site pour un palier. Ligne régulière et playoffs y cohabitent. */
function formatFor(tier: PremierTier): TournamentFormat {
  return tier === "CONTENDER" ? "PREMIER_CONTENDER" : "PREMIER_INVITE";
}

function nameFor(tier: PremierTier, seasonNumber: number): string {
  const palier = tier === "CONTENDER" ? "Contender" : "Invite";
  return `Premier ${palier} France — Saison ${seasonNumber}`;
}

/**
 * Retrouve ou crée le tournoi d'une saison et d'un palier.
 *
 * L'idempotence tient à la contrainte unique `(premierSeasonId, premierTier)` :
 * rejouée, la synchronisation retrouve le tournoi au lieu d'en créer un second
 * à chaque passage du cron.
 *
 * Format, dates et statut sont réécrits à chaque passage, pas seulement à la
 * création. Les premiers tournois importés étaient au format `LEAGUE`, figés à
 * « en cours » et sans dates : les réécrire ici les remet d'aplomb sans
 * reprise de données, et le recalage nocturne des statuts prend ensuite le
 * relais tout seul.
 */
export async function ensurePremierTournament(
  season: PremierSeason,
  seasonNumber: number,
  tier: PremierTier
): Promise<string> {
  const commun = {
    format: formatFor(tier),
    startDate: new Date(season.startsAt),
    endDate: new Date(season.endsAt),
    status: tournamentStatusFor(season, Date.now()),
  };

  const existing = await db.tournament.findUnique({
    where: {
      premierSeasonId_premierTier: { premierSeasonId: season.id, premierTier: tier },
    },
    select: { id: true },
  });
  if (existing) {
    await db.tournament.update({ where: { id: existing.id }, data: commun });
    return existing.id;
  }

  const t = await db.tournament.create({
    data: {
      name: nameFor(tier, seasonNumber),
      region: "France",
      organizer: "Riot Games",
      premierSeasonId: season.id,
      premierTier: tier,
      ...commun,
    },
    select: { id: true },
  });
  return t.id;
}

/**
 * Inscrit les équipes au tournoi, sans jamais en retirer.
 *
 * Une équipe qui quitte le Premier reste inscrite : retirer son
 * `TournamentParticipant` rendrait illisibles les matchs qu'elle a réellement
 * joués, qui eux restent en base.
 */
export async function syncParticipants(
  tournamentId: string,
  teamIds: readonly string[]
): Promise<number> {
  const r = await db.tournamentParticipant.createMany({
    data: teamIds.map((teamId) => ({ tournamentId, teamId })),
    skipDuplicates: true,
  });
  return r.count;
}

/**
 * Retrouve ou crée le `Group` qui porte un arbre parallèle.
 *
 * Le Premier Contender joue plusieurs arbres de front ; chacun est un `Group`,
 * sans quoi `matchGroupIdFor` ne peut pas les séparer et l'affichage les
 * effondre en un seul arbre incohérent.
 */
async function ensureBracketGroup(tournamentId: string, name: string): Promise<string> {
  const existing = await db.group.findFirst({
    where: { tournamentId, name },
    select: { id: true },
  });
  if (existing) return existing.id;
  const g = await db.group.create({ data: { tournamentId, name }, select: { id: true } });
  return g.id;
}

/**
 * Date d'un arbre de playoffs, lue sur l'une de ses parties.
 *
 * L'API ne date pas les tournois : `tournament_matches` ne porte ni date ni
 * saison. Un seul appel par arbre suffit — ils sont deux ou trois par saison —
 * et c'est ce qui permet de ne retenir que le championnat visé au lieu de fondre
 * vingt saisons d'historique en un seul arbre.
 */
async function dateDuBracket(riotMatchId: string): Promise<string | null> {
  try {
    const m = await getCustomMatchById("eu", riotMatchId, true);
    return m.startedAt;
  } catch (e) {
    if (estQuotaDepasse(e)) throw e;
    logger.warn("premier.bracket.date_failed", { riotMatchId, ...describeError(e) });
    return null;
  }
}

export type MatchImportOutcome = "IMPORTED" | "SKIPPED" | "FAILED";

/**
 * Crée le match de ligne régulière puis y importe sa carte.
 *
 * Un match de ligue Premier se joue en une seule carte : un `Match` du site
 * porte donc exactement une `MatchMap`. La déduplication s'appuie sur l'unicité
 * de `MatchMap.riotMatchId` — inutile d'ajouter un champ au `Match`. Les
 * playoffs passent par `importPremierSerie`, une rencontre pouvant y compter
 * jusqu'à trois cartes.
 */
export async function importPremierMatch(
  riotMatchId: string,
  tournamentId: string,
  teamIdByPremierId: ReadonlyMap<string, string>
): Promise<MatchImportOutcome> {
  const already = await db.matchMap.findUnique({
    where: { riotMatchId },
    select: { id: true },
  });
  if (already) return "SKIPPED";

  let raw;
  try {
    raw = await getCustomMatchById("eu", riotMatchId, true);
  } catch (e) {
    // Le dépassement de quota n'est pas l'échec d'un match : il arrête le
    // passage. Le laisser remonter permet à l'orchestration de rendre sa
    // progression au lieu de la perdre.
    if (e instanceof RiotIdError && e.code === "RATE_LIMITED") throw e;
    logger.warn("premier.match.fetch_failed", { riotMatchId, ...describeError(e) });
    return "FAILED";
  }

  const rosters = raw.teams.map((t) => t.rosterId).filter((x): x is string => Boolean(x));
  if (rosters.length !== 2) return "SKIPPED";

  const teamAId = teamIdByPremierId.get(rosters[0]);
  const teamBId = teamIdByPremierId.get(rosters[1]);
  // Un match contre une équipe hors périmètre — une autre conférence, une
  // division inférieure — n'a pas sa place ici : les deux camps doivent exister
  // sur le site, sinon le match afficherait un adversaire fantôme.
  if (!teamAId || !teamBId) return "SKIPPED";

  const sides = sideOfRoster(raw.teams, rosters[0]);
  if (!sides) return "FAILED";

  const match = await db.match.create({
    data: {
      tournamentId,
      teamAId,
      teamBId,
      stage: "GROUP",
      bestOf: 1,
      status: "FINISHED",
      date: raw.startedAt ? new Date(raw.startedAt) : null,
      hasTime: Boolean(raw.startedAt),
    },
    select: { id: true },
  });

  // `raw` est passé tel quel : il vient d'être récupéré pour lire
  // `premier_roster`, et le relire coûterait un second crédit par match.
  const r = await importMatchMapFromRiotId(
    match.id,
    { riotMatchId, outcomeOfTeamA: sides.outcomeOfTeamA },
    raw
  );
  if (r !== "IMPORTED") {
    // Sans carte, le match du site est une coquille vide qui polluerait les
    // listes. `Match` n'est la cible d'aucune cascade destructrice : la
    // suppression ne touche que lui et ses cartes.
    await db.match.delete({ where: { id: match.id } });
    logger.warn("premier.match.import_failed", { riotMatchId, result: r });
    return "FAILED";
  }
  return "IMPORTED";
}

/**
 * Importe une rencontre de playoffs — une carte en Bo1, deux ou trois en finale
 * — comme **un seul match du site** portant toutes ses cartes.
 *
 * C'est ce que le modèle attend d'un Bo3 : `importMatchMapFromRiotId` ajoute les
 * cartes à la suite et recalcule le score sur l'ensemble. En créer un match par
 * carte donnerait trois finales là où Riot n'en joue qu'une.
 */
async function importPremierSerie(
  serie: PlayoffSeries,
  parties: ReadonlyMap<string, CustomMatch>,
  tournamentId: string,
  format: TournamentFormat,
  teamIdByPremierId: ReadonlyMap<string, string>,
  groupId: string | null
): Promise<MatchImportOutcome> {
  const premiere = parties.get(serie.matchIds[0]);
  if (!premiere) return "FAILED";

  const deja = await db.matchMap.findUnique({
    where: { riotMatchId: serie.matchIds[0] },
    select: { id: true },
  });
  if (deja) return "SKIPPED";

  const rosters = premiere.teams.map((t) => t.rosterId).filter((x): x is string => Boolean(x));
  if (rosters.length !== 2) return "SKIPPED";
  const teamAId = teamIdByPremierId.get(rosters[0]);
  const teamBId = teamIdByPremierId.get(rosters[1]);
  if (!teamAId || !teamBId) return "SKIPPED";

  const match = await db.match.create({
    data: {
      tournamentId,
      teamAId,
      teamBId,
      stage: "BRACKET",
      round: serie.roundLabel,
      // La règle du Bo vit dans `bracket.ts` : Bo1 partout sauf la finale. On
      // retient la plus grande des deux valeurs, le nombre de cartes observé
      // pouvant être inférieur si la rencontre s'est jouée en deux manches.
      bestOf: Math.max(serie.bestOf, defaultBestOfFor(format, serie.roundLabel)),
      groupId: matchGroupIdFor(format, "BRACKET", groupId),
      status: "FINISHED",
      date: premiere.startedAt ? new Date(premiere.startedAt) : null,
      hasTime: Boolean(premiere.startedAt),
    },
    select: { id: true },
  });

  let importees = 0;
  for (const riotMatchId of serie.matchIds) {
    const partie = parties.get(riotMatchId);
    if (!partie) continue;
    // Les camps se rejouent carte par carte : « Red » et « Blue » changent d'une
    // manche à l'autre, seul le roster Premier reste stable.
    const sides = sideOfRoster(partie.teams, rosters[0]);
    if (!sides) continue;
    const r = await importMatchMapFromRiotId(
      match.id,
      { riotMatchId, outcomeOfTeamA: sides.outcomeOfTeamA },
      partie
    );
    if (r === "IMPORTED") importees += 1;
  }

  if (importees === 0) {
    await db.match.delete({ where: { id: match.id } });
    logger.warn("premier.serie.vide", { round: serie.roundLabel });
    return "FAILED";
  }
  return "IMPORTED";
}

export type SyncReport = {
  /** Une ligne par couple saison/palier effectivement traité. */
  seasons: { seasonNumber: number; tier: PremierTier; tournamentId: string; matches: number }[];
  teamsCreated: number;
  teamsLinked: number;
  matchesImported: number;
  matchesFailed: number;
  matchesPending: number;
  /** Le passage s'est-il arrêté sur le quota plutôt qu'au bout de son travail ? */
  rateLimited: boolean;
};

/** Le dépassement de quota est-il la cause de cette erreur ? */
function estQuotaDepasse(e: unknown): boolean {
  return e instanceof RiotIdError && e.code === "RATE_LIMITED";
}

/**
 * Un passage de synchronisation, borné en nombre de matchs.
 *
 * Le premier remplissage représente près de 300 matchs par saison : le bornage
 * l'étale sur plusieurs passages plutôt que de tenir une requête HTTP ouverte
 * tout ce temps. Le cron rappelle jusqu'à ce que `matchesPending` tombe à zéro,
 * et les passages suivants sont quasi gratuits — `MatchMap.riotMatchId` étant
 * unique, l'existant est sauté sans appel réseau.
 *
 * `seasonCount` remonte le miroir de plusieurs saisons. L'historique d'une
 * équipe les contient toutes : il n'est lu **qu'une fois par équipe**, puis les
 * matchs sont répartis par leur date. Interroger l'API une fois par saison
 * doublerait la facture pour la même donnée.
 *
 * Limite assumée : le classement est un instantané du présent. Une saison
 * passée est donc miroitée telle que la voient les équipes **actuellement**
 * dans ces divisions — une équipe descendue depuis n'y figure plus.
 */
export async function runPremierSync(
  matchBudget: number,
  dryRun: boolean,
  seasonCount = 1
): Promise<SyncReport> {
  const seasons = await getPremierSeasons("eu");
  const seasonIds = seasons.map((s) => s.id);
  const windows = seasons.map((s) => ({ id: s.id, startsAt: s.starts_at, endsAt: s.ends_at }));
  // La liste va de la plus ancienne à la plus récente : les saisons visées
  // sont les dernières.
  const targets = seasonIds.slice(-Math.max(1, seasonCount));

  const report: SyncReport = {
    seasons: [],
    teamsCreated: 0,
    teamsLinked: 0,
    matchesImported: 0,
    matchesFailed: 0,
    matchesPending: 0,
    rateLimited: false,
  };
  if (targets.length === 0) return report;

  try {
    // Les deux paliers sont lus d'abord, puis traités ensemble.
    //
    // Les traiter l'un après l'autre séparait leurs historiques, et un match
    // de saison passée entre une équipe aujourd'hui en Invite et une
    // aujourd'hui en Contender n'apparaissait qu'une fois de chaque côté :
    // `mutualMatchIds` l'écartait des deux listes. Mettre les 72 équipes en
    // commun règle le problème à la racine.
    const parEquipePremier = new Map<string, { teamId: string; tier: PremierTier }>();
    const entriesParTier: {
      tier: PremierTier;
      entries: Awaited<ReturnType<typeof getPremierLeaderboard>>;
    }[] = [];

    for (const { conference, division, tier } of frenchTiers()) {
      const entries = await getPremierLeaderboard(conference, division);
      entriesParTier.push({ tier, entries });

      if (dryRun) {
        report.teamsLinked += entries.length;
        continue;
      }

      const teams = await syncPremierTeams(entries);
      report.teamsCreated += teams.created;
      report.teamsLinked += teams.linked;
      for (const [premierId, teamId] of teams.byPremierId) {
        parEquipePremier.set(premierId, { teamId, tier });
      }
    }
    if (dryRun) return report;

    const teamIdByPremierId = new Map(
      [...parEquipePremier].map(([premierId, v]) => [premierId, v.teamId])
    );

    // Un tournoi par couple saison/palier.
    const tournamentBySeasonTier = new Map<string, string>();
    const cle = (seasonId: string, tier: PremierTier) => `${seasonId}|${tier}`;
    for (const seasonId of targets) {
      const n = seasonNumberOf(seasonIds, seasonId) ?? seasonIds.length;
      const fenetre = windows.find((w) => w.id === seasonId)!;
      for (const { tier, entries } of entriesParTier) {
        const id = await ensurePremierTournament(fenetre, n, tier);
        tournamentBySeasonTier.set(cle(seasonId, tier), id);
        await syncParticipants(
          id,
          entries
            .map((e) => parEquipePremier.get(e.id)?.teamId)
            .filter((x): x is string => Boolean(x))
        );
        report.seasons.push({ seasonNumber: n, tier, tournamentId: id, matches: 0 });
      }
    }

    // Un seul appel d'historique par équipe : il contient toutes les saisons.
    const historiesBySeason = new Map<string, string[][]>(targets.map((sid) => [sid, []]));
    const premierIdsOfMatch = new Map<string, Set<string>>();
    const participations: { tournamentId: string; matches: string[]; premierId: string }[] = [];
    for (const premierId of parEquipePremier.keys()) {
      const h = await getPremierHistory(premierId);
      for (const p of h.tournament_matches) {
        if (p.matches.length > 0) {
          participations.push({ tournamentId: p.tournament_id, matches: p.matches, premierId });
        }
      }
      const parSaison = new Map<string, string[]>(targets.map((sid) => [sid, []]));
      for (const m of h.league_matches) {
        const season = seasonOfMatch(windows, m.started_at);
        if (!season || !parSaison.has(season)) continue;
        parSaison.get(season)!.push(m.id);
        const camps = premierIdsOfMatch.get(m.id) ?? new Set<string>();
        camps.add(premierId);
        premierIdsOfMatch.set(m.id, camps);
      }
      for (const seasonId of targets) {
        historiesBySeason.get(seasonId)!.push(parSaison.get(seasonId)!);
      }
    }

    for (const seasonId of targets) {
      for (const id of mutualMatchIds(historiesBySeason.get(seasonId)!)) {
        if (report.matchesImported >= matchBudget) {
          report.matchesPending += 1;
          continue;
        }
        // Le palier du match est celui de ses équipes. Pour une saison passée
        // elles peuvent avoir divergé depuis : on retient alors le palier de
        // la première, faute de connaître les divisions d'alors.
        const premierIds = [...(premierIdsOfMatch.get(id) ?? [])];
        const tier = parEquipePremier.get(premierIds[0] ?? "")?.tier;
        if (!tier) continue;
        const tournamentId = tournamentBySeasonTier.get(cle(seasonId, tier));
        if (!tournamentId) continue;

        const r = await importPremierMatch(id, tournamentId, teamIdByPremierId);
        if (r === "IMPORTED") {
          report.matchesImported += 1;
          const ligne = report.seasons.find((x) => x.tournamentId === tournamentId);
          if (ligne) ligne.matches += 1;
        } else if (r === "FAILED") report.matchesFailed += 1;
      }
    }

    // Playoffs. Chaque `tournament_id` est un arbre parallèle du championnat de
    // fin de saison — deux ou trois par saison, joués deux à trois jours avant
    // sa clôture. L'API ne les datant pas, chacun est daté par l'une de ses
    // parties, ce qui coûte un appel par arbre et permet de ne garder que la
    // saison visée. Sans ce filtre, l'historique remontant à plus de deux ans,
    // vingt championnats se fondaient en un seul.
    //
    // Seule la saison **en cours** est concernée. Les équipes sont identifiées
    // par leur division d'aujourd'hui ; sur une saison passée, jouée avec les
    // divisions d'alors, on ne retrouve qu'une partie des participants et
    // l'arbre reconstruit est un fragment — brackets à un seul match, byes
    // partout, et deux finales dans le même arbre parce que le vainqueur réel
    // n'est pas suivi. Un arbre fragmentaire affiché comme un arbre complet
    // raconte un tournoi qui n'a pas eu lieu.
    const saisonEnCours = targets.find((sid) => {
      const w = windows.find((x) => x.id === sid);
      return w ? tournamentStatusFor(w, Date.now()) === "ONGOING" : false;
    });
    const saisonsAvecPlayoffs = saisonEnCours ? [saisonEnCours] : [];
    const arbresParSaison = new Map<string, string[]>(saisonsAvecPlayoffs.map((sid) => [sid, []]));
    const arbresVus = new Set(participations.map((p) => p.tournamentId));

    for (const tournamentId of arbresVus) {
      const premiereePartie = participations.find((p) => p.tournamentId === tournamentId)
        ?.matches[0];
      if (!premiereePartie) continue;
      // Déjà importé : sa saison est acquise, inutile de repayer la date.
      const connu = await db.matchMap.findUnique({
        where: { riotMatchId: premiereePartie },
        select: { match: { select: { tournament: { select: { premierSeasonId: true } } } } },
      });
      const seasonId = connu?.match.tournament.premierSeasonId ?? null;
      if (seasonId) {
        arbresParSaison.get(seasonId)?.push(tournamentId);
        continue;
      }
      const date = await dateDuBracket(premiereePartie);
      const saison = date ? seasonOfMatch(windows, date) : null;
      if (saison) arbresParSaison.get(saison)?.push(tournamentId);
    }

    for (const seasonId of saisonsAvecPlayoffs) {
      const arbres = arbresParSaison.get(seasonId) ?? [];
      if (arbres.length === 0) continue;

      for (const [rang, bracketId] of arbres.entries()) {
        const ids = [
          ...new Set(
            participations.filter((p) => p.tournamentId === bracketId).flatMap((p) => p.matches)
          ),
        ];

        // Première passe : récupérer chaque partie pour connaître son heure et
        // ses deux camps. Sans elle, impossible de reconstituer les rencontres —
        // l'API ne rend ni l'ordre chronologique ni les adversaires.
        const parties = new Map<string, CustomMatch>();
        for (const id of ids) {
          try {
            parties.set(id, await getCustomMatchById("eu", id, true));
          } catch (e) {
            if (estQuotaDepasse(e)) throw e;
            logger.warn("premier.playoff.fetch_failed", { id, ...describeError(e) });
          }
        }

        const jeux = [...parties.values()]
          .filter((m) => m.startedAt)
          .map((m) => ({
            matchId: m.matchId,
            startedAtMs: Date.parse(m.startedAt as string),
            rosterIds: m.teams.map((t) => t.rosterId).filter((x): x is string => Boolean(x)),
          }))
          .filter((g) => g.rosterIds.length === 2);

        const series = playoffSeries(bracketId, jeux);
        if (series.length === 0) continue;

        const tier = parEquipePremier.get(jeux[0]?.rosterIds[0] ?? "")?.tier;
        if (!tier) continue;
        const tournamentId = tournamentBySeasonTier.get(cle(seasonId, tier));
        if (!tournamentId) continue;
        const format = tier === "CONTENDER" ? "PREMIER_CONTENDER" : "PREMIER_INVITE";

        // Un `Group` par arbre, et seulement là où la disposition « multi » s'en
        // sert : `matchGroupIdFor` le retirera de lui-même pour l'Invite.
        const groupId =
          tier === "CONTENDER"
            ? await ensureBracketGroup(tournamentId, bracketNameFor(rang))
            : null;

        for (const serie of series) {
          if (report.matchesImported >= matchBudget) {
            report.matchesPending += 1;
            continue;
          }
          const r = await importPremierSerie(
            serie,
            parties,
            tournamentId,
            format,
            teamIdByPremierId,
            groupId
          );
          if (r === "IMPORTED") {
            report.matchesImported += 1;
            const ligne = report.seasons.find((x) => x.tournamentId === tournamentId);
            if (ligne) ligne.matches += 1;
          } else if (r === "FAILED") report.matchesFailed += 1;
        }
      }
    }
  } catch (e) {
    // Un quota dépassé n'annule pas ce qui a déjà été écrit : équipes, tournois
    // et matchs importés sont acquis, et le passage suivant reprend là où
    // celui-ci s'arrête. Rendre le rapport plutôt que de lever évite au cron de
    // repartir de zéro toutes les quinze minutes.
    if (!estQuotaDepasse(e)) throw e;
    logger.warn("premier.sync.rate_limited", {
      matchesImported: report.matchesImported,
      teamsCreated: report.teamsCreated,
    });
    report.rateLimited = true;
  }

  return report;
}
