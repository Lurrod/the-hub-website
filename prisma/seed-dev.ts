import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

/**
 * Seed de développement, réexécutable : chaque `upsert` réapplique exactement
 * les mêmes champs en création et en mise à jour. Relancer le script suffit
 * donc à remettre la base locale à niveau après un changement de données -
 * sans quoi les lignes déjà présentes gardent indéfiniment leurs anciennes
 * valeurs (nom de tournoi, format, dates…).
 */
async function main() {
  // Équipe fictive : elle porte les six réseaux pour vérifier le rendu du
  // bandeau, ce que les équipes réelles ne permettent pas (vlr.gg n'en liste
  // que deux ou trois).
  const alphaSocials = {
    twitter: "https://x.com/exemple",
    twitch: "https://twitch.tv/exemple",
    youtube: "https://youtube.com/@exemple",
    instagram: "https://instagram.com/exemple",
    discord: "https://discord.gg/exemple",
    website: "https://exemple.gg",
  };
  const alphaTeam = {
    name: "Alpha Esports",
    tag: "ALP",
    region: "France",
    description: "Équipe de démonstration.",
    status: "ACTIVE" as const,
    socials: alphaSocials,
  };
  await db.team.upsert({
    where: { id: "seed-team-alpha" },
    update: alphaTeam,
    create: { id: "seed-team-alpha", ...alphaTeam },
  });

  const neoPlayer = { pseudo: "Neo", nationality: "France" };
  await db.player.upsert({
    where: { id: "seed-player-neo" },
    update: neoPlayer,
    create: { id: "seed-player-neo", ...neoPlayer },
  });

  const neoMembership = {
    teamId: "seed-team-alpha",
    playerId: "seed-player-neo",
    role: "JOUEUR" as const,
  };
  await db.teamMembership.upsert({
    where: { id: "seed-membership-neo" },
    update: neoMembership,
    create: { id: "seed-membership-neo", ...neoMembership },
  });

  const openTournament = {
    name: "Open de démo",
    region: "France",
    format: "GROUPS" as const,
    status: "ONGOING" as const,
    organizer: "The Hub",
    description: "Tournoi de démonstration.",
    startDate: new Date("2026-08-02"),
    endDate: new Date("2026-08-16"),
    prizePool: "2 500 €",
  };
  await db.tournament.upsert({
    where: { id: "seed-tournament-open" },
    update: openTournament,
    create: { id: "seed-tournament-open", ...openTournament },
  });

  await db.tournamentParticipant.upsert({
    where: {
      tournamentId_teamId: { tournamentId: "seed-tournament-open", teamId: "seed-team-alpha" },
    },
    update: { seed: 1 },
    create: {
      id: "seed-participant-alpha",
      tournamentId: "seed-tournament-open",
      teamId: "seed-team-alpha",
      seed: 1,
    },
  });

  // ---- Dataset VCT EMEA 2026 (réaliste, pour aperçu local) ----
  const TID = "vct-emea-stage1";
  const VCT_TEAMS = [
    {
      tag: "HRT",
      name: "Team Heretics",
      group: "alpha",
      players: ["Boo", "benjyfishy", "RieNs", "Wo0t", "ComeBack"],
    },
    {
      tag: "VIT",
      name: "Team Vitality",
      group: "alpha",
      players: ["Jamppi", "Derke", "Sayonara", "Chronicle", "PROFEK"],
    },
    {
      tag: "FNC",
      name: "Fnatic",
      group: "alpha",
      players: ["Boaster", "Alfajer", "kaajak", "crashies", "Veqaj"],
    },
    {
      tag: "TL",
      name: "Team Liquid",
      group: "alpha",
      players: ["nAts", "kamo", "MiniBoo", "purp0", "wayne"],
    },
    {
      tag: "NAVI",
      name: "Natus Vincere",
      group: "alpha",
      players: ["Shao", "hiro", "Ruxic", "Filu", "sociablEE"],
    },
    {
      tag: "KC",
      name: "Karmine Corp",
      group: "alpha",
      players: ["sheydos", "dos9", "SUYGETSU", "LewN", "avez"],
    },
    {
      tag: "FUT",
      name: "FUT Esports",
      group: "omega",
      players: ["MrFaliN", "yetujey", "KROSTALY", "xeus", "baha"],
    },
    {
      tag: "BBL",
      name: "BBL Esports",
      group: "omega",
      players: ["Rosé", "umu7", "Loita", "Lar0k", "Crewen"],
    },
    {
      tag: "GM",
      name: "Gentle Mates",
      group: "omega",
      players: ["starxo", "Minny", "bipo", "GLYPH", "marteen"],
    },
    {
      tag: "GX",
      name: "GIANTX",
      group: "omega",
      players: ["Cloud", "westside", "ara", "Flickless", "GRUBINHO"],
    },
    {
      tag: "PCF",
      name: "PCIFIC Esports",
      group: "omega",
      players: ["NINJA", "qpert", "seven", "al0rante", "cNed"],
    },
    {
      tag: "EF",
      name: "Eternal Fire",
      group: "omega",
      players: ["Izzy", "audaz", "Favian", "echo", "nekky"],
    },
  ];

  const vctTournament = {
    name: "VCT EMEA 2026 - Stage 1",
    region: "EU",
    format: "GROUPS_THEN_ELIM" as const,
    status: "ONGOING" as const,
    organizer: "Riot Games",
    description: "Données de démonstration inspirées de la saison VCT EMEA 2026.",
    startDate: new Date("2026-06-14"),
    endDate: new Date("2026-07-20"),
    prizePool: "250 000 €",
  };
  await db.tournament.upsert({
    where: { id: TID },
    update: vctTournament,
    create: { id: TID, ...vctTournament },
  });

  for (const key of ["alpha", "omega"] as const) {
    const group = {
      tournamentId: TID,
      name: key === "alpha" ? "Groupe Alpha" : "Groupe Omega",
    };
    await db.group.upsert({
      where: { id: `vct-group-${key}` },
      update: group,
      create: { id: `vct-group-${key}`, ...group },
    });
  }

  for (const t of VCT_TEAMS) {
    const teamId = `vct-team-${t.tag.toLowerCase()}`;
    const team = { name: t.name, tag: t.tag, region: "EU", status: "ACTIVE" as const };
    await db.team.upsert({
      where: { id: teamId },
      update: team,
      create: { id: teamId, ...team },
    });

    await db.tournamentParticipant.upsert({
      where: { tournamentId_teamId: { tournamentId: TID, teamId } },
      update: { groupId: `vct-group-${t.group}` },
      create: {
        id: `vct-part-${t.tag}`,
        tournamentId: TID,
        teamId,
        groupId: `vct-group-${t.group}`,
      },
    });

    for (let i = 0; i < t.players.length; i++) {
      const playerId = `vct-p-${t.tag}-${i}`;
      await db.player.upsert({
        where: { id: playerId },
        update: { pseudo: t.players[i] },
        create: { id: playerId, pseudo: t.players[i] },
      });
      const membership = {
        teamId,
        playerId,
        role: i === 4 ? ("COACH" as const) : ("JOUEUR" as const),
      };
      await db.teamMembership.upsert({
        where: { id: `vct-mem-${t.tag}-${i}` },
        update: membership,
        create: { id: `vct-mem-${t.tag}-${i}`, ...membership },
      });
    }
  }

  const tid = (tag: string) => `vct-team-${tag.toLowerCase()}`;
  const matchDate = (offset: number) => new Date(2026, 6, 10 + offset, 18, 0, 0);

  type SeedMap = [string, number, number];
  const GROUP_MATCHES: {
    id: string;
    group: string;
    a: string;
    b: string;
    sa: number;
    sb: number;
    maps: SeedMap[];
    vod?: string;
  }[] = [
    {
      id: "vct-m-1",
      group: "alpha",
      a: "HRT",
      b: "FNC",
      sa: 2,
      sb: 1,
      vod: "https://www.twitch.tv/videos/2100000001",
      maps: [
        ["Ascent", 13, 10],
        ["Bind", 8, 13],
        ["Haven", 13, 9],
      ],
    },
    {
      id: "vct-m-2",
      group: "alpha",
      a: "VIT",
      b: "NAVI",
      sa: 2,
      sb: 0,
      maps: [
        ["Lotus", 13, 7],
        ["Split", 13, 11],
      ],
    },
    { id: "vct-m-3", group: "alpha", a: "TL", b: "KC", sa: 1, sb: 2, maps: [] },
    { id: "vct-m-4", group: "omega", a: "FUT", b: "BBL", sa: 2, sb: 1, maps: [] },
    { id: "vct-m-5", group: "omega", a: "GX", b: "GM", sa: 2, sb: 0, maps: [] },
    { id: "vct-m-6", group: "omega", a: "PCF", b: "EF", sa: 2, sb: 0, maps: [] },
  ];

  for (let i = 0; i < GROUP_MATCHES.length; i++) {
    const m = GROUP_MATCHES[i];
    const winnerId = m.sa === m.sb ? null : m.sa > m.sb ? tid(m.a) : tid(m.b);
    const match = {
      tournamentId: TID,
      groupId: `vct-group-${m.group}`,
      teamAId: tid(m.a),
      teamBId: tid(m.b),
      scoreA: m.sa,
      scoreB: m.sb,
      winnerId,
      stage: "GROUP" as const,
      round: null,
      bracketPosition: null,
      bestOf: 3,
      status: "FINISHED" as const,
      date: matchDate(i),
      vodUrl: m.vod ?? null,
    };
    await db.match.upsert({
      where: { id: m.id },
      update: match,
      create: { id: m.id, ...match },
    });
    for (let j = 0; j < m.maps.length; j++) {
      const [name, sa, sb] = m.maps[j];
      const map = { matchId: m.id, mapName: name, scoreA: sa, scoreB: sb, order: j };
      await db.matchMap.upsert({
        where: { id: `${m.id}-map-${j}` },
        update: map,
        create: { id: `${m.id}-map-${j}`, ...map },
      });
    }
  }

  // Équipes supplémentaires (démo) pour compléter un bracket à 16
  const EXTRA_TEAMS = [
    { tag: "KOI", name: "Movistar KOI" },
    { tag: "APK", name: "Apeks" },
    { tag: "SMB", name: "SuperMassive Blaze" },
    { tag: "BIG", name: "BIG" },
  ];
  for (const t of EXTRA_TEAMS) {
    const team = { name: t.name, tag: t.tag, region: "EU", status: "ACTIVE" as const };
    await db.team.upsert({
      where: { id: tid(t.tag) },
      update: team,
      create: { id: tid(t.tag), ...team },
    });
  }

  // Repart d'un bracket propre (évite les doublons d'anciens seeds)
  await db.match.deleteMany({ where: { tournamentId: TID, stage: "BRACKET" } });

  const BRACKET_MATCHES = [
    // Huitièmes de finale
    {
      id: "vct-r16-1",
      round: "Huitièmes de finale",
      a: "HRT",
      b: "BIG",
      sa: 2,
      sb: 0,
      pos: 1,
      status: "FINISHED" as const,
    },
    {
      id: "vct-r16-2",
      round: "Huitièmes de finale",
      a: "GX",
      b: "SMB",
      sa: 2,
      sb: 1,
      pos: 2,
      status: "FINISHED" as const,
    },
    {
      id: "vct-r16-3",
      round: "Huitièmes de finale",
      a: "VIT",
      b: "APK",
      sa: 2,
      sb: 0,
      pos: 3,
      status: "FINISHED" as const,
    },
    {
      id: "vct-r16-4",
      round: "Huitièmes de finale",
      a: "FUT",
      b: "EF",
      sa: 2,
      sb: 1,
      pos: 4,
      status: "FINISHED" as const,
    },
    {
      id: "vct-r16-5",
      round: "Huitièmes de finale",
      a: "KC",
      b: "KOI",
      sa: 2,
      sb: 0,
      pos: 5,
      status: "FINISHED" as const,
    },
    {
      id: "vct-r16-6",
      round: "Huitièmes de finale",
      a: "BBL",
      b: "PCF",
      sa: 2,
      sb: 1,
      pos: 6,
      status: "FINISHED" as const,
    },
    {
      id: "vct-r16-7",
      round: "Huitièmes de finale",
      a: "FNC",
      b: "GM",
      sa: 2,
      sb: 0,
      pos: 7,
      status: "FINISHED" as const,
    },
    {
      id: "vct-r16-8",
      round: "Huitièmes de finale",
      a: "NAVI",
      b: "TL",
      sa: 2,
      sb: 1,
      pos: 8,
      status: "FINISHED" as const,
    },
    // Quarts de finale
    {
      id: "vct-qf-1",
      round: "Quarts de finale",
      a: "HRT",
      b: "GX",
      sa: 2,
      sb: 1,
      pos: 1,
      status: "FINISHED" as const,
    },
    {
      id: "vct-qf-2",
      round: "Quarts de finale",
      a: "VIT",
      b: "FUT",
      sa: 2,
      sb: 0,
      pos: 2,
      status: "FINISHED" as const,
    },
    {
      id: "vct-qf-3",
      round: "Quarts de finale",
      a: "KC",
      b: "BBL",
      sa: 2,
      sb: 1,
      pos: 3,
      status: "FINISHED" as const,
    },
    {
      id: "vct-qf-4",
      round: "Quarts de finale",
      a: "FNC",
      b: "NAVI",
      sa: 2,
      sb: 1,
      pos: 4,
      status: "FINISHED" as const,
    },
    // Demi-finales
    {
      id: "vct-sf-1",
      round: "Demi-finales",
      a: "HRT",
      b: "VIT",
      sa: 2,
      sb: 1,
      pos: 1,
      status: "FINISHED" as const,
    },
    {
      id: "vct-sf-2",
      round: "Demi-finales",
      a: "KC",
      b: "FNC",
      sa: 2,
      sb: 0,
      pos: 2,
      status: "FINISHED" as const,
    },
    // Finale
    {
      id: "vct-f-1",
      round: "Finale",
      a: "HRT",
      b: "KC",
      sa: 0,
      sb: 0,
      pos: 1,
      status: "SCHEDULED" as const,
    },
  ];

  for (let i = 0; i < BRACKET_MATCHES.length; i++) {
    const m = BRACKET_MATCHES[i];
    const winnerId =
      m.status !== "FINISHED" || m.sa === m.sb ? null : m.sa > m.sb ? tid(m.a) : tid(m.b);
    const match = {
      tournamentId: TID,
      groupId: null,
      teamAId: tid(m.a),
      teamBId: tid(m.b),
      scoreA: m.sa,
      scoreB: m.sb,
      winnerId,
      stage: "BRACKET" as const,
      round: m.round,
      bracketPosition: m.pos,
      bestOf: 5,
      status: m.status,
      date: matchDate(10 + i),
    };
    await db.match.upsert({
      where: { id: m.id },
      update: match,
      create: { id: m.id, ...match },
    });
  }

  const UPCOMING_MATCHES = [
    { id: "vct-up-1", a: "HRT", b: "VIT", status: "LIVE" as const, offset: 13 },
    { id: "vct-up-2", a: "KC", b: "FNC", status: "SCHEDULED" as const, offset: 15 },
    { id: "vct-up-3", a: "GX", b: "BBL", status: "SCHEDULED" as const, offset: 17 },
  ];
  for (const m of UPCOMING_MATCHES) {
    const match = {
      tournamentId: TID,
      groupId: "vct-group-alpha",
      teamAId: tid(m.a),
      teamBId: tid(m.b),
      scoreA: 0,
      scoreB: 0,
      winnerId: null,
      stage: "GROUP" as const,
      round: null,
      bracketPosition: null,
      bestOf: 3,
      status: m.status,
      date: matchDate(m.offset),
    };
    await db.match.upsert({
      where: { id: m.id },
      update: match,
      create: { id: m.id, ...match },
    });
  }

  process.stdout.write(
    "Seed dev: démo + VCT EMEA 2026 (12 équipes, poules, matchs, bracket) prêts.\n"
  );
}

main().finally(() => db.$disconnect());
