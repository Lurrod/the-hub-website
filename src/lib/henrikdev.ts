import { logger, describeError } from "@/lib/logger";
import { quotaDelayMs } from "@/lib/premier-core";
import {
  premierLeaderboardSchema,
  premierSeasonsSchema,
  premierTeamDetailSchema,
  premierHistorySchema,
  type PremierTeamEntry,
  type PremierSeasonResponse,
  type PremierTeamDetail,
  type PremierHistory,
} from "@/lib/validation/premier";

export type RiotIdErrorCode = "NOT_FOUND" | "RATE_LIMITED" | "API_ERROR" | "TAKEN";

export class RiotIdError extends Error {
  code: RiotIdErrorCode;
  constructor(code: RiotIdErrorCode) {
    super(code);
    this.name = "RiotIdError";
    this.code = code;
  }
}

export type RiotAccount = { puuid: string; region: string; name: string; tag: string };

const BASE = "https://api.henrikdev.xyz";

/** Au-delà, l'appel est abandonné : l'appelant est une action de formulaire. */
const TIMEOUT_MS = 8000;

/**
 * Délai des appels de synchronisation Premier.
 *
 * `TIMEOUT_MS` vise une action de formulaire, où huit secondes d'attente sont
 * déjà une éternité. Les appels de la synchronisation tournent hors du chemin
 * d'un utilisateur : y couper une réponse valide coûterait un match manquant
 * pour rien.
 */
const PREMIER_TIMEOUT_MS = 20_000;

type QuotaState = { remaining: number | null; resetAtMs: number | null };

/**
 * Quota observé, **par seau**.
 *
 * HenrikDev ne compte pas un quota unique par clé d'API : chaque famille
 * d'endpoints a le sien, exposé par `x-ratelimit-bucket`. L'historique
 * (`c61e23f3-…`) et la fiche d'équipe (`9aaa6845-…`) se comptent séparément.
 *
 * Un état unique pour tout le module appliquait donc le crédit restant d'un
 * seau à un autre : la synchronisation attendait une minute pleine à chaque
 * bascule d'endpoint, ce qui faisait passer un import incrémental de trois à
 * vingt et une minutes. Mesuré, pas supposé.
 */
const quotaByKey = new Map<string, QuotaState>();

/**
 * Relève `x-ratelimit-*` d'une réponse. `reset` est un compte à rebours en
 * secondes, pas un horodatage.
 *
 * Tolérante à une réponse sans en-têtes : la lecture du quota est un confort
 * pour les appels en lot, jamais une raison de faire échouer l'appel qui vient
 * d'aboutir. Un quota non observé laisse l'état tel quel, et `quotaDelayMs`
 * n'attend pas.
 */
function noteQuota(key: string, headers: Headers | undefined): void {
  if (!headers?.get) return;
  const remaining = Number(headers.get("x-ratelimit-remaining"));
  const reset = Number(headers.get("x-ratelimit-reset"));
  const state = quotaByKey.get(key) ?? { remaining: null, resetAtMs: null };
  if (Number.isFinite(remaining)) state.remaining = remaining;
  if (Number.isFinite(reset)) state.resetAtMs = Date.now() + reset * 1000;
  quotaByKey.set(key, state);
}

/**
 * Un appel à HenrikDev, de la clé d'API au contenu de l'enveloppe.
 *
 * Les trois points d'appel du module reproduisaient ce bloc à l'identique :
 * lecture de la clé, temporisation par `AbortController`, en-tête
 * d'autorisation, traduction des statuts en `RiotIdError` et déballage du
 * champ `data`. Un durcissement du client — une temporisation revue, une
 * journalisation plus fine, un traitement du 429 — devait donc être appliqué
 * trois fois, avec le risque d'oublier celui qu'on n'a pas sous les yeux.
 *
 * @param path    chemin absolu sous {@link BASE}, segments déjà encodés.
 * @param surAbsence code d'erreur pour un 404. `NOT_FOUND` là où l'absence est
 *   une réponse attendue (compte ou partie inconnus), `API_ERROR` là où elle
 *   trahit une anomalie.
 * @param timeoutMs délai d'abandon. La valeur par défaut vise une soumission
 *   de formulaire ; les appels en lot de la synchronisation Premier durent
 *   plus longtemps et la remontent.
 * @returns le contenu du champ `data` de l'enveloppe, ou `null` s'il manque.
 */
async function fetchHenrik<T>(
  path: string,
  surAbsence: RiotIdErrorCode = "API_ERROR",
  timeoutMs: number = TIMEOUT_MS,
  /**
   * Famille d'endpoints à laquelle imputer le quota, ou `undefined` pour ne pas
   * patienter. Les clés doivent séparer ce que HenrikDev compte séparément :
   * une clé partagée entre deux seaux fait attendre pour rien.
   */
  quotaKey?: string
): Promise<T | null> {
  const key = process.env.HENRIKDEV_API_KEY;
  if (!key) throw new RiotIdError("API_ERROR");

  // Seuls les appels en lot patientent. Une action de formulaire qui dormirait
  // une minute vaudrait moins qu'un message d'erreur immédiat.
  if (quotaKey) {
    const etat = quotaByKey.get(quotaKey) ?? { remaining: null, resetAtMs: null };
    const wait = quotaDelayMs({ ...etat, nowMs: Date.now() });
    if (wait > 0) {
      logger.info("henrikdev.quota.wait", { quotaKey, waitMs: wait });
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  const url = `${BASE}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: key }, signal: controller.signal });
  } catch (e) {
    // Le type `API_ERROR` suffit à l'appelant, mais pas à qui doit comprendre
    // une panne : un DNS injoignable, un dépassement de délai et une erreur TLS
    // s'y confondaient sans laisser la moindre trace.
    logger.warn("henrikdev.unreachable", { url, ...describeError(e) });
    throw new RiotIdError("API_ERROR");
  } finally {
    clearTimeout(timeout);
  }

  if (quotaKey) noteQuota(quotaKey, res.headers);

  if (res.status === 404) throw new RiotIdError(surAbsence);
  if (res.status === 429) throw new RiotIdError("RATE_LIMITED");
  if (!res.ok) throw new RiotIdError("API_ERROR");

  const json = (await res.json().catch(() => null)) as { data?: T } | null;
  return json?.data ?? null;
}

/** Vérifie un Riot ID auprès de HenrikDev. Server-only (utilise la clé API). */
export async function verifyRiotId(name: string, tag: string): Promise<RiotAccount> {
  const data = await fetchHenrik<Partial<RiotAccount>>(
    `/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
    "NOT_FOUND"
  );
  if (!data?.puuid) throw new RiotIdError("API_ERROR");
  return {
    puuid: data.puuid,
    region: data.region ?? "eu",
    name: data.name ?? name,
    tag: data.tag ?? tag,
  };
}

export type CustomMatchPlayer = {
  puuid: string;
  name: string;
  tag: string | null;
  teamId: string; // "Red" | "Blue" (brut Riot)
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  headshots: number;
  bodyshots: number;
  legshots: number;
  damageMade: number;
};

/** Issue d'un round, dans les codes courts qu'attend la frise du scoreboard. */
export type RoundOutcome = "elim" | "detonate" | "defuse" | "time";

/**
 * Un round joué. `winningTeamId` est le team_id brut Riot ("Red"/"Blue") :
 * le rattachement au côté A/B se fait plus haut, une fois les camps résolus.
 */
export type CustomMatchRound = {
  winningTeamId: string;
  outcome: RoundOutcome;
  /**
   * Equipe qui a pose le spike, donc l'attaquant de ce round. Null quand le
   * round s'est joue sans pose — le camp se deduit alors de la mi-temps.
   */
  plantedByTeamId: string | null;
  /** Valeur d'equipement cumulee par equipe, pour classer le type d'achat. */
  loadoutByTeam: Record<string, number>;
};

/**
 * Un duel. Les puuid suffisent : c'est la seule clé stable pour recouper avec
 * les joueurs de la partie (KAST, first kills, first deaths).
 */
export type CustomMatchKill = {
  round: number;
  timeInRoundMs: number;
  killerPuuid: string;
  victimPuuid: string;
  assistantPuuids: string[];
  /** Nom de l'arme du duel, null pour un kill à la capacité ou une donnée absente. */
  weapon: string | null;
};

/**
 * Un camp du match. `rosterId` n'est renseigné que sur les parties Premier :
 * c'est le seul champ qui rattache « Red » ou « Blue » — attribués
 * arbitrairement d'un match à l'autre — à une équipe Premier identifiée, et
 * donc la seule façon de savoir qui a gagné pour qui lors d'un import
 * automatique.
 */
export type CustomMatchTeam = {
  teamId: string;
  won: boolean;
  rosterId: string | null;
  roundsWon: number;
  roundsLost: number;
};

export type CustomMatch = {
  matchId: string;
  map: string;
  startedAt: string | null;
  durationSec: number | null;
  teamRounds: Record<string, number>; // team_id -> rounds gagnés
  teams: CustomMatchTeam[];
  players: CustomMatchPlayer[];
  rounds: CustomMatchRound[];
  kills: CustomMatchKill[];
};

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * `result` renvoyé par Riot -> code court de la frise. Tout ce qui n'est ni une
 * élimination ni une action sur le spike est un round mené au bout du temps
 * (temps écoulé, abandon) : « time » est le repli, jamais une perte de donnée
 * silencieuse puisque les trois issues nommées couvrent le jeu normal.
 */
const ROUND_OUTCOMES: Record<string, RoundOutcome> = {
  elimination: "elim",
  detonate: "detonate",
  defuse: "defuse",
};

function roundOutcome(result: unknown): RoundOutcome {
  return ROUND_OUTCOMES[String(result ?? "").toLowerCase()] ?? "time";
}

/**
 * Historique des parties CUSTOM d'un joueur, mappé vers CustomMatch normalisé.
 * NOTE: les noms de champs de l'API v4 sont mappés ici de façon tolérante ;
 * ajuster UNIQUEMENT cette fonction si l'API réelle diffère.
 */
export async function getPlayerCustomMatches(
  region: string,
  name: string,
  tag: string
): Promise<CustomMatch[]> {
  // Pas de `NOT_FOUND` ici : un historique vide se lit dans une réponse 200 à
  // liste vide, un 404 sur cet endpoint signale donc une anomalie.
  const data = await fetchHenrik<unknown[]>(
    `/valorant/v4/matches/${encodeURIComponent(region)}/pc/` +
      `${encodeURIComponent(name)}/${encodeURIComponent(tag)}?mode=custom&size=10`
  );
  const list = Array.isArray(data) ? data : [];
  return list.map(mapRawCustomMatch);
}

/**
 * Une partie précise, par son identifiant Riot. Sert au rattrapage manuel :
 * quand la recherche par historique ne trouve rien, un admin colle l'ID de la
 * partie et on va la chercher directement.
 */
export async function getCustomMatchById(
  region: string,
  matchId: string,
  // La synchronisation Premier en appelle des dizaines à la suite et doit
  // patienter ; le rattrapage manuel d'un admin, lui, répond tout de suite.
  respecterLeQuota = false
): Promise<CustomMatch> {
  const data = await fetchHenrik<unknown>(
    `/valorant/v4/match/${encodeURIComponent(region)}/${encodeURIComponent(matchId)}`,
    "NOT_FOUND",
    respecterLeQuota ? PREMIER_TIMEOUT_MS : TIMEOUT_MS,
    respecterLeQuota ? "match-v4" : undefined
  );
  // L'endpoint renvoie un objet, mais on tolère la forme tableau des listes :
  // les deux enveloppes coexistent selon les versions de l'API.
  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw || typeof raw !== "object") throw new RiotIdError("NOT_FOUND");
  return mapRawCustomMatch(raw);
}

function mapRawCustomMatch(raw: unknown): CustomMatch {
  const m = raw as {
    metadata?: {
      match_id?: string;
      map?: { name?: string };
      started_at?: string;
      game_length_in_ms?: number;
    };
    teams?: {
      team_id?: string;
      won?: boolean;
      rounds?: { won?: number; lost?: number };
      premier_roster?: { id?: string } | null;
    }[];
    rounds?: {
      winning_team?: string;
      result?: string;
      plant?: { player?: { team?: string } };
      stats?: { player?: { team?: string }; economy?: { loadout_value?: number } }[];
    }[];
    kills?: {
      round?: number;
      time_in_round_in_ms?: number;
      killer?: { puuid?: string };
      victim?: { puuid?: string };
      assistants?: { puuid?: string }[];
      weapon?: { name?: string | null };
    }[];
    players?: {
      puuid?: string;
      name?: string;
      tag?: string;
      team_id?: string;
      agent?: { name?: string };
      stats?: {
        kills?: number;
        deaths?: number;
        assists?: number;
        score?: number;
        headshots?: number;
        bodyshots?: number;
        legshots?: number;
        damage?: { dealt?: number };
      };
    }[];
  };
  const teamRounds: Record<string, number> = {};
  for (const t of m.teams ?? []) {
    if (t.team_id) teamRounds[t.team_id] = num(t.rounds?.won);
  }
  const teams: CustomMatchTeam[] = (m.teams ?? [])
    .filter((t) => Boolean(t.team_id))
    .map((t) => ({
      teamId: t.team_id!,
      won: t.won === true,
      rosterId: t.premier_roster?.id ?? null,
      roundsWon: num(t.rounds?.won),
      roundsLost: num(t.rounds?.lost),
    }));
  const players: CustomMatchPlayer[] = (m.players ?? []).map((p) => ({
    puuid: p.puuid ?? "",
    name: p.name ?? "",
    tag: p.tag ?? null,
    teamId: p.team_id ?? "",
    agent: p.agent?.name ?? null,
    kills: num(p.stats?.kills),
    deaths: num(p.stats?.deaths),
    assists: num(p.stats?.assists),
    score: num(p.stats?.score),
    headshots: num(p.stats?.headshots),
    bodyshots: num(p.stats?.bodyshots),
    legshots: num(p.stats?.legshots),
    damageMade: num(p.stats?.damage?.dealt),
  }));
  const rounds: CustomMatchRound[] = (m.rounds ?? []).map((r) => {
    const loadoutByTeam: Record<string, number> = {};
    for (const st of r.stats ?? []) {
      const team = st.player?.team;
      if (!team) continue;
      loadoutByTeam[team] = (loadoutByTeam[team] ?? 0) + num(st.economy?.loadout_value);
    }
    return {
      winningTeamId: r.winning_team ?? "",
      outcome: roundOutcome(r.result),
      plantedByTeamId: r.plant?.player?.team ?? null,
      loadoutByTeam,
    };
  });
  const kills: CustomMatchKill[] = (m.kills ?? [])
    .filter((k) => k.killer?.puuid && k.victim?.puuid)
    .map((k) => ({
      round: num(k.round),
      timeInRoundMs: num(k.time_in_round_in_ms),
      killerPuuid: k.killer!.puuid!,
      victimPuuid: k.victim!.puuid!,
      assistantPuuids: (k.assistants ?? []).map((a) => a.puuid ?? "").filter(Boolean),
      weapon: k.weapon?.name ?? null,
    }));
  return {
    matchId: m.metadata?.match_id ?? "",
    map: m.metadata?.map?.name ?? "",
    startedAt: m.metadata?.started_at ?? null,
    durationSec:
      typeof m.metadata?.game_length_in_ms === "number"
        ? Math.round(m.metadata.game_length_in_ms / 1000)
        : null,
    teamRounds,
    teams,
    players,
    rounds,
    kills,
  };
}

/**
 * Délai des appels de synchronisation Premier.
 *
 * `TIMEOUT_MS` vise une action de formulaire, où huit secondes d'attente sont
 * déjà une éternité. Les appels de la synchronisation tournent hors du chemin
 * d'un utilisateur : y couper une réponse valide coûterait un match manquant
 * pour rien.
 */

/**
 * Classement d'une division Premier.
 *
 * Le filtre passe par des **segments de chemin**, pas par des paramètres de
 * requête : la variante `?conference=&division=` documentée dans la
 * spécification OpenAPI est ignorée par le serveur, qui renvoie alors les
 * 4 523 équipes européennes au lieu des dizaines attendues.
 */
export async function getPremierLeaderboard(
  conference: string,
  division: number
): Promise<PremierTeamEntry[]> {
  const data = await fetchHenrik<unknown>(
    `/valorant/v1/premier/leaderboard/eu/${encodeURIComponent(conference)}/${division}`,
    "NOT_FOUND",
    PREMIER_TIMEOUT_MS,
    "premier-leaderboard"
  );
  return premierLeaderboardSchema.parse(data ?? []);
}

/** Saisons Premier d'une région, de la plus ancienne à la plus récente. */
export async function getPremierSeasons(affinity = "eu"): Promise<PremierSeasonResponse[]> {
  const data = await fetchHenrik<unknown>(
    `/valorant/v1/premier/seasons/${encodeURIComponent(affinity)}`,
    "NOT_FOUND",
    PREMIER_TIMEOUT_MS,
    "premier-seasons"
  );
  return premierSeasonsSchema.parse(data ?? []);
}

/** Fiche d'une équipe Premier, roster compris. */
export async function getPremierTeam(id: string): Promise<PremierTeamDetail> {
  const data = await fetchHenrik<unknown>(
    `/valorant/v1/premier/${encodeURIComponent(id)}`,
    "NOT_FOUND",
    PREMIER_TIMEOUT_MS,
    "premier-team"
  );
  return premierTeamDetailSchema.parse(data);
}

/** Historique d'une équipe : matchs de ligue et matchs de playoffs. */
export async function getPremierHistory(id: string): Promise<PremierHistory> {
  const data = await fetchHenrik<unknown>(
    `/valorant/v1/premier/${encodeURIComponent(id)}/history`,
    "NOT_FOUND",
    PREMIER_TIMEOUT_MS,
    "premier-history"
  );
  return premierHistorySchema.parse(data ?? { league_matches: [], tournament_matches: [] });
}
