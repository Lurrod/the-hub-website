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

/** Vérifie un Riot ID auprès de HenrikDev. Server-only (utilise la clé API). */
export async function verifyRiotId(name: string, tag: string): Promise<RiotAccount> {
  const key = process.env.HENRIKDEV_API_KEY;
  if (!key) throw new RiotIdError("API_ERROR");

  const url = `${BASE}/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: key }, signal: controller.signal });
  } catch {
    throw new RiotIdError("API_ERROR");
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 404) throw new RiotIdError("NOT_FOUND");
  if (res.status === 429) throw new RiotIdError("RATE_LIMITED");
  if (!res.ok) throw new RiotIdError("API_ERROR");

  const json = (await res.json().catch(() => null)) as { data?: Partial<RiotAccount> } | null;
  const data = json?.data;
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
  firstKills: number;
};

export type CustomMatch = {
  matchId: string;
  map: string;
  startedAt: string | null;
  durationSec: number | null;
  teamRounds: Record<string, number>; // team_id -> rounds gagnés
  players: CustomMatchPlayer[];
};

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

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
  const key = process.env.HENRIKDEV_API_KEY;
  if (!key) throw new RiotIdError("API_ERROR");

  const url =
    `${BASE}/valorant/v4/matches/${encodeURIComponent(region)}/pc/` +
    `${encodeURIComponent(name)}/${encodeURIComponent(tag)}?mode=custom&size=10`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: key }, signal: controller.signal });
  } catch {
    throw new RiotIdError("API_ERROR");
  } finally {
    clearTimeout(timeout);
  }
  if (res.status === 429) throw new RiotIdError("RATE_LIMITED");
  if (!res.ok) throw new RiotIdError("API_ERROR");

  const json = (await res.json().catch(() => null)) as { data?: unknown[] } | null;
  const list = Array.isArray(json?.data) ? json!.data : [];
  return list.map(mapRawCustomMatch);
}

/**
 * Une partie précise, par son identifiant Riot. Sert au rattrapage manuel :
 * quand la recherche par historique ne trouve rien, un admin colle l'ID de la
 * partie et on va la chercher directement.
 */
export async function getCustomMatchById(region: string, matchId: string): Promise<CustomMatch> {
  const key = process.env.HENRIKDEV_API_KEY;
  if (!key) throw new RiotIdError("API_ERROR");

  const url = `${BASE}/valorant/v4/match/${encodeURIComponent(region)}/${encodeURIComponent(matchId)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: key }, signal: controller.signal });
  } catch {
    throw new RiotIdError("API_ERROR");
  } finally {
    clearTimeout(timeout);
  }
  if (res.status === 404) throw new RiotIdError("NOT_FOUND");
  if (res.status === 429) throw new RiotIdError("RATE_LIMITED");
  if (!res.ok) throw new RiotIdError("API_ERROR");

  const json = (await res.json().catch(() => null)) as { data?: unknown } | null;
  // L'endpoint renvoie un objet, mais on tolère la forme tableau des listes :
  // les deux enveloppes coexistent selon les versions de l'API.
  const raw = Array.isArray(json?.data) ? json.data[0] : json?.data;
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
    teams?: { team_id?: string; rounds?: { won?: number } }[];
    players?: {
      puuid?: string; name?: string; tag?: string; team_id?: string;
      agent?: { name?: string };
      stats?: {
        kills?: number; deaths?: number; assists?: number; score?: number;
        headshots?: number; bodyshots?: number; legshots?: number;
        damage?: { dealt?: number };
      };
    }[];
  };
  const teamRounds: Record<string, number> = {};
  for (const t of m.teams ?? []) {
    if (t.team_id) teamRounds[t.team_id] = num(t.rounds?.won);
  }
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
    // Volontairement 0 en Phase B : les first kills ne sont pas exposés simplement
    // par joueur dans l'API v4 (nécessitent l'analyse round-par-round). Extensible.
    firstKills: 0,
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
    players,
  };
}
