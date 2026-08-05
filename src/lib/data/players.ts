import { db } from "@/lib/db";
import { rankTopAgentsByPlayer } from "@/lib/agents";
import type { PlayerInput } from "@/lib/validation/player";
import type { MembershipRole, ValorantRole } from "@prisma/client";
import type { RiotAccount } from "@/lib/henrikdev";
import type { LftState } from "@/lib/lft";
import { clampPage, pageOffset } from "@/lib/pagination";

export function listPlayers() {
  return db.player.findMany({ orderBy: { pseudo: "asc" } });
}

/** Pays distincts des joueurs en recherche d'équipe, pour alimenter le filtre. */
export async function listLftCountries(): Promise<string[]> {
  const rows = await db.player.findMany({
    where: { lft: true, nationality: { not: null } },
    select: { nationality: true },
    distinct: ["nationality"],
    orderBy: { nationality: "asc" },
  });
  return rows.map((r) => r.nationality).filter((n): n is string => Boolean(n));
}

export type LftQuery = {
  role?: string;
  country?: string;
  /** Intervalle de dates de naissance dérivé d'une tranche d'âge. */
  birthdate?: { lte: Date; gt?: Date };
  team?: "free" | "team";
  q?: string;
};

/**
 * Joueurs en recherche d'équipe. Les plus récemment déclarés LFT remontent en
 * premier ; le pseudo départage les fiches sans `lftSince`.
 *
 * Le filtre d'âge passe par la date de naissance (seule colonne stockée), donc
 * les joueurs qui n'ont pas renseigné la leur en sortent — c'est voulu.
 */
/** Joueurs LFT affichés par page (grille de 4 colonnes, 6 rangées). */
export const LFT_PER_PAGE = 24;

export async function listLftPlayers(filters?: LftQuery, page = 1) {
  const where = {
    lft: true,
    ...(filters?.role ? { valorantRole: filters.role as ValorantRole } : {}),
    ...(filters?.country ? { nationality: filters.country } : {}),
    ...(filters?.birthdate ? { birthdate: filters.birthdate } : {}),
    ...(filters?.team === "free" ? { memberships: { none: { leaveDate: null } } } : {}),
    ...(filters?.team === "team" ? { memberships: { some: { leaveDate: null } } } : {}),
    ...(filters?.q ? { pseudo: { contains: filters.q, mode: "insensitive" as const } } : {}),
  };

  // Total d'abord, pour borner la page demandée : un `?p=99` saisi à la main
  // affiche la dernière page, pas une liste vide.
  const total = await db.player.count({ where });
  const current = clampPage(page, total, LFT_PER_PAGE);

  const players = await db.player.findMany({
    where,
    orderBy: [{ lftSince: "desc" }, { pseudo: "asc" }],
    skip: pageOffset(current, LFT_PER_PAGE),
    take: LFT_PER_PAGE,
  });

  return { players, total, page: current, pageSize: LFT_PER_PAGE };
}

/** Applique un statut LFT calculé par `nextLftState`. */
export function setPlayerLft(playerId: string, state: LftState) {
  return db.player.update({
    where: { id: playerId },
    data: { lft: state.lft, lftSince: state.lftSince },
  });
}

export function getPlayer(id: string) {
  return db.player.findUnique({
    where: { id },
    include: {
      memberships: { include: { team: true }, orderBy: { joinDate: "desc" } },
    },
  });
}

export function createPlayer(data: PlayerInput) {
  return db.player.create({
    data: {
      pseudo: data.pseudo,
      realName: data.realName,
      nationality: data.nationality,
      socials: data.socials ?? undefined,
    },
  });
}

/**
 * Joueurs à suivre (landing) : meilleur rating moyen sur leurs parties.
 * Seuil minimum de cartes pour éviter qu'un joueur à 1 map monopolise le top ;
 * repli sur tous les joueurs si moins de `limit` qualifiés.
 */
export async function listTopPlayers(limit = 6) {
  const MIN_MAPS = 3;

  // L'agrégation se fait en base : la version précédente rapatriait TOUTES les
  // lignes de scoreboard du site — une par joueur et par carte — pour n'en
  // afficher que six, à chaque affichage de l'accueil. Le `groupBy` ne rend
  // plus qu'une ligne par joueur.
  const groups = await db.playerGameStat.groupBy({
    by: ["playerId"],
    where: { playerId: { not: null } },
    _avg: { rating: true },
    _count: { _all: true },
    orderBy: { _avg: { rating: "desc" } },
  });

  const ranked = groups.map((g) => ({
    id: g.playerId!,
    rating: Math.round((g._avg.rating ?? 0) * 100) / 100,
    games: g._count._all,
  }));

  // Seuil de cartes pour éviter qu'un joueur à une seule partie monopolise le
  // haut du tableau ; repli sur tous les joueurs si trop peu se qualifient.
  const qualified = ranked.filter((p) => p.games >= MIN_MAPS);
  const top = (qualified.length >= limit ? qualified : ranked).slice(0, limit);
  if (top.length === 0) return [];

  const profiles = await db.player.findMany({
    where: { id: { in: top.map((p) => p.id) } },
    select: {
      id: true,
      pseudo: true,
      photo: true,
      nationality: true,
      memberships: {
        where: { leaveDate: null },
        take: 1,
        select: { team: { select: { tag: true } } },
      },
    },
  });
  const byId = new Map(profiles.map((p) => [p.id, p]));

  // `findMany` ne garantit pas l'ordre du `in` : on repart de `top`, déjà trié.
  return top.flatMap((p) => {
    const profile = byId.get(p.id);
    if (!profile) return [];
    return [
      {
        id: p.id,
        pseudo: profile.pseudo,
        photo: profile.photo,
        nationality: profile.nationality,
        teamTag: profile.memberships[0]?.team.tag ?? null,
        rating: p.rating,
        games: p.games,
      },
    ];
  });
}

/** Persos les plus joués par un joueur + total de parties (pour la carrière). */
export async function getPlayerTopAgents(playerId: string, top = 3) {
  const rows = await db.playerGameStat.findMany({
    where: { playerId },
    select: { agent: true },
  });
  const count = new Map<string, number>();
  for (const r of rows) if (r.agent) count.set(r.agent, (count.get(r.agent) ?? 0) + 1);
  const topAgents = [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([agent, games]) => ({ agent, games }));
  return { topAgents, totalGames: rows.length };
}

export function updatePlayer(id: string, data: PlayerInput) {
  return db.player.update({
    where: { id },
    data: {
      pseudo: data.pseudo,
      realName: data.realName,
      nationality: data.nationality,
      socials: data.socials ?? undefined,
      // Champs facultatifs : ne touchés que si le formulaire les envoie (undefined = laisser).
      ...(data.valorantRole !== undefined ? { valorantRole: data.valorantRole } : {}),
      ...(data.birthdate !== undefined
        ? { birthdate: data.birthdate ? new Date(data.birthdate) : null }
        : {}),
    },
  });
}

export function setPlayerPhoto(id: string, photoKey: string) {
  return db.player.update({ where: { id }, data: { photo: photoKey } });
}

export function deletePlayer(id: string) {
  return db.player.delete({ where: { id } });
}

/** Roster actuel d'une équipe (memberships non terminés). */
export function getTeamRoster(teamId: string) {
  return db.teamMembership.findMany({
    where: { teamId, leaveDate: null },
    include: { player: true },
    orderBy: [{ role: "asc" }, { joinDate: "asc" }],
  });
}

/** Anciens joueurs d'une équipe (memberships terminés). */
export function getTeamAlumni(teamId: string) {
  return db.teamMembership.findMany({
    where: { teamId, leaveDate: { not: null } },
    include: { player: true },
    orderBy: { leaveDate: "desc" },
  });
}

export function getMembership(id: string) {
  return db.teamMembership.findUnique({ where: { id } });
}

/** Client Prisma ou client de transaction : les deux exposent ce dont on a besoin. */
type PrismaLike = Pick<typeof db, "player">;

/**
 * Fiche réutilisable pour ce pseudo, ou null.
 *
 * Une fiche est réutilisable si elle n'appartient à personne (`userId` nul) et
 * n'a aucune adhésion active : c'est une fiche d'archive, créée pour importer
 * un tournoi joué hors du site. La rattacher évite d'empiler une fiche de plus
 * à chaque fois qu'un pseudo est saisi dans un roster — sans quoi un même
 * joueur finissait avec N fiches dont une seule récupérable par Riot ID.
 *
 * On ne touche jamais à une fiche déjà rattachée à un compte ou à une équipe :
 * l'homonymie existe, et voler la fiche de quelqu'un serait pire que le
 * doublon qu'on cherche à éviter.
 */
export function findReusablePlayer(client: PrismaLike, pseudo: string) {
  return client.player.findFirst({
    where: {
      pseudo: { equals: pseudo, mode: "insensitive" },
      userId: null,
      memberships: { none: { leaveDate: null } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Rattache un joueur au roster : réutilise une fiche d'archive du même pseudo
 * si elle existe, en crée une sinon.
 */
export async function attachRosterPlayer(
  tx: PrismaLike & { teamMembership: typeof db.teamMembership },
  teamId: string,
  pseudo: string,
  nationality: string | undefined,
  role: MembershipRole
) {
  const existing = await findReusablePlayer(tx, pseudo);
  const player =
    existing ??
    (await tx.player.create({ data: { pseudo, nationality } }));
  await tx.teamMembership.create({ data: { teamId, playerId: player.id, role } });
  return player;
}

/** Crée ou réutilise un joueur ET l'ajoute au roster de l'équipe (transaction). */
export function createPlayerAndAddToRoster(
  teamId: string,
  pseudo: string,
  nationality: string | undefined,
  role: MembershipRole
) {
  return db.$transaction((tx) => attachRosterPlayer(tx, teamId, pseudo, nationality, role));
}

export function setMembershipRole(id: string, role: MembershipRole) {
  return db.teamMembership.update({ where: { id }, data: { role } });
}

/** Termine un passage dans l'équipe (garde l'historique). */
export function endMembership(id: string, when: Date) {
  return db.teamMembership.update({ where: { id }, data: { leaveDate: when } });
}

export function deleteMembership(id: string) {
  return db.teamMembership.delete({ where: { id } });
}

/**
 * Enregistre le compte Riot vérifié sur un joueur, et recale les scoreboards
 * déjà en base sur ce puuid.
 *
 * Le rattachement d'une ligne de scoreboard à une fiche se fait à l'import, par
 * puuid. Sans ce rattrapage, lier un Riot ID *après* avoir importé un tournoi
 * laisserait ces stats orphelines pour toujours : toutes les lectures côté
 * joueur filtrent sur `playerId`.
 */
export async function setPlayerRiotAccount(playerId: string, account: RiotAccount) {
  const [player] = await db.$transaction([
    db.player.update({
      where: { id: playerId },
      data: {
        riotName: account.name,
        riotTag: account.tag,
        puuid: account.puuid,
        region: account.region,
      },
    }),
    // Les parties de ce puuid qui n'étaient rattachées à personne lui reviennent.
    db.playerGameStat.updateMany({
      where: { puuid: account.puuid, playerId: null },
      data: { playerId },
    }),
    // Symétrique : un Riot ID corrigé ne doit pas laisser sur la fiche les
    // parties d'un autre compte, rattachées sur la foi de l'ancien puuid.
    db.playerGameStat.updateMany({
      where: { playerId, NOT: { puuid: account.puuid } },
      data: { playerId: null },
    }),
  ]);
  return player;
}

/** Fiche portant ce puuid, autre que celle indiquée. `null` si personne. */
export function findPlayerByPuuid(
  puuid: string,
  excludePlayerId?: string
): Promise<{ id: string; userId: string | null } | null> {
  return db.player.findFirst({
    where: { puuid, ...(excludePlayerId ? { NOT: { id: excludePlayerId } } : {}) },
    select: { id: true, userId: true },
  });
}

/** True si ce puuid est déjà pris par un AUTRE joueur. */
export async function isPuuidTakenByOther(puuid: string, excludePlayerId?: string): Promise<boolean> {
  return (await findPlayerByPuuid(puuid, excludePlayerId)) !== null;
}

/**
 * Donne à un compte une fiche existante restée sans propriétaire, puis
 * supprime la fiche vide créée à la connexion.
 *
 * La fiche revendiquée est conservée telle quelle : c'est elle qui porte les
 * scoreboards et les adhésions d'équipe des tournois archivés. Seul le profil
 * que l'utilisateur vient de saisir la recouvre — c'est le sien.
 */
export async function claimPlayerFiche(claimedId: string, temporaryId: string): Promise<void> {
  const temp = await db.player.findUnique({
    where: { id: temporaryId },
    select: {
      userId: true, pseudo: true, realName: true, nationality: true, photo: true,
      socials: true, valorantRole: true, birthdate: true, lft: true, lftSince: true,
    },
  });
  if (!temp?.userId) throw new Error("CLAIM_NO_USER");

  await db.$transaction([
    // Par sécurité : en pratique la fiche temporaire n'a ni adhésion ni stat,
    // l'inscription étant bloquante avant tout le reste. Mais les déplacer
    // vaut mieux que de les perdre dans la suppression.
    db.teamMembership.updateMany({ where: { playerId: temporaryId }, data: { playerId: claimedId } }),
    db.playerGameStat.updateMany({ where: { playerId: temporaryId }, data: { playerId: claimedId } }),
    // Le `userId` est unique : il faut le libérer avant de le poser ailleurs.
    db.player.delete({ where: { id: temporaryId } }),
    db.player.update({
      where: { id: claimedId },
      data: {
        userId: temp.userId,
        pseudo: temp.pseudo,
        realName: temp.realName,
        nationality: temp.nationality,
        photo: temp.photo,
        socials: temp.socials ?? undefined,
        valorantRole: temp.valorantRole,
        birthdate: temp.birthdate,
        lft: temp.lft,
        lftSince: temp.lftSince,
      },
    }),
  ]);
}

/** Fiche Player liée à un compte user (ou null). */
export function getPlayerByUserId(userId: string) {
  return db.player.findUnique({ where: { userId } });
}

/**
 * Garantit une fiche Player pour ce user : la crée si absente.
 * pseudo par défaut = nom Discord (ou "Joueur"), photo = avatar Discord.
 */
export async function ensurePlayerForUser(
  userId: string,
  fallback: { pseudo?: string | null; photo?: string | null }
) {
  const existing = await db.player.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.player.create({
    data: {
      userId,
      pseudo: fallback.pseudo?.trim() || "Joueur",
      photo: fallback.photo ?? undefined,
    },
  });
}

/** Adhésion active (leaveDate null) d'un joueur, avec l'équipe. */
export function getActiveMembership(playerId: string) {
  return db.teamMembership.findFirst({
    where: { playerId, leaveDate: null },
    include: { team: true },
  });
}

/** Ajoute un joueur au roster d'une équipe (rôle JOUEUR par défaut). */
export function addPlayerToTeam(
  teamId: string,
  playerId: string,
  role: MembershipRole = "JOUEUR"
) {
  return db.teamMembership.create({ data: { teamId, playerId, role } });
}

/**
 * Rejoint une équipe de façon atomique : dans une transaction, vérifie
 * l'absence d'adhésion active puis crée l'adhésion. Protège l'invariant
 * « une seule équipe active » (§1.4) contre les courses (double-clic, onglets).
 * Retourne `{ ok: false, activeTeamId }` si le joueur a déjà une équipe active.
 */
export function joinTeamIfFree(
  teamId: string,
  playerId: string,
  role: MembershipRole = "JOUEUR"
): Promise<{ ok: true } | { ok: false; activeTeamId: string }> {
  return db.$transaction(async (tx) => {
    const active = await tx.teamMembership.findFirst({
      where: { playerId, leaveDate: null },
      select: { teamId: true },
    });
    if (active) return { ok: false as const, activeTeamId: active.teamId };
    await tx.teamMembership.create({ data: { teamId, playerId, role } });
    return { ok: true as const };
  });
}

/**
 * Roster actuel enrichi pour les cartes joueurs de la page équipe : profil,
 * ancienneté et agents les plus joués. Les agents sont agrégés en une requête
 * pour tout le roster plutôt qu'une par joueur.
 */
export async function getTeamRosterCards(teamId: string) {
  const memberships = await getTeamRoster(teamId);
  const playerIds = memberships.map((m) => m.playerId);
  const stats = playerIds.length
    ? await db.playerGameStat.findMany({
        where: { playerId: { in: playerIds } },
        select: { playerId: true, agent: true },
      })
    : [];
  const topAgents = rankTopAgentsByPlayer(stats);
  return memberships.map((m) => ({
    membershipId: m.id,
    role: m.role,
    joinDate: m.joinDate,
    player: m.player,
    topAgents: topAgents.get(m.playerId) ?? [],
  }));
}
