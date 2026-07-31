import { db } from "@/lib/db";
import { rankTopAgentsByPlayer } from "@/lib/agents";
import type { PlayerInput } from "@/lib/validation/player";
import type { MembershipRole, ValorantRole } from "@prisma/client";
import type { RiotAccount } from "@/lib/henrikdev";
import type { LftState } from "@/lib/lft";

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

/**
 * Joueurs en recherche d'équipe. Les plus récemment déclarés LFT remontent en
 * premier ; le pseudo départage les fiches sans `lftSince`.
 */
export function listLftPlayers(filters?: { role?: string; country?: string }) {
  return db.player.findMany({
    where: {
      lft: true,
      ...(filters?.role ? { valorantRole: filters.role as ValorantRole } : {}),
      ...(filters?.country ? { nationality: filters.country } : {}),
    },
    orderBy: [{ lftSince: "desc" }, { pseudo: "asc" }],
  });
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
  const rows = await db.playerGameStat.findMany({
    where: { playerId: { not: null } },
    select: {
      rating: true,
      player: {
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
      },
    },
  });

  type Agg = {
    id: string;
    pseudo: string;
    photo: string | null;
    nationality: string | null;
    teamTag: string | null;
    sum: number;
    games: number;
  };
  const byId = new Map<string, Agg>();
  for (const r of rows) {
    const p = r.player;
    if (!p) continue;
    const a =
      byId.get(p.id) ??
      {
        id: p.id,
        pseudo: p.pseudo,
        photo: p.photo,
        nationality: p.nationality,
        teamTag: p.memberships[0]?.team.tag ?? null,
        sum: 0,
        games: 0,
      };
    a.sum += r.rating;
    a.games += 1;
    byId.set(p.id, a);
  }

  const all = [...byId.values()].map((a) => ({
    id: a.id,
    pseudo: a.pseudo,
    photo: a.photo,
    nationality: a.nationality,
    teamTag: a.teamTag,
    rating: Math.round((a.sum / a.games) * 100) / 100,
    games: a.games,
  }));

  const qualified = all.filter((p) => p.games >= MIN_MAPS);
  const pool = qualified.length >= limit ? qualified : all;
  return pool.sort((x, y) => y.rating - x.rating).slice(0, limit);
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

/** Crée un joueur ET l'ajoute au roster de l'équipe (transaction). */
export function createPlayerAndAddToRoster(
  teamId: string,
  pseudo: string,
  nationality: string | undefined,
  role: MembershipRole
) {
  return db.$transaction(async (tx) => {
    const player = await tx.player.create({ data: { pseudo, nationality } });
    await tx.teamMembership.create({ data: { teamId, playerId: player.id, role } });
    return player;
  });
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

/** Enregistre le compte Riot vérifié sur un joueur. */
export function setPlayerRiotAccount(playerId: string, account: RiotAccount) {
  return db.player.update({
    where: { id: playerId },
    data: {
      riotName: account.name,
      riotTag: account.tag,
      puuid: account.puuid,
      region: account.region,
    },
  });
}

/** True si ce puuid est déjà pris par un AUTRE joueur. */
export async function isPuuidTakenByOther(puuid: string, excludePlayerId?: string): Promise<boolean> {
  const clash = await db.player.findFirst({
    where: { puuid, ...(excludePlayerId ? { NOT: { id: excludePlayerId } } : {}) },
    select: { id: true },
  });
  return clash !== null;
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
