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
