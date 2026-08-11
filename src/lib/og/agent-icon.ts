import sharp from "sharp";
import { agentIconUrl } from "@/lib/agents";
import { logger, describeError } from "@/lib/logger";

/** Côté de l'icône produite. Elle est affichée à 34 px, doublé pour la netteté. */
const ICON_PX = 68;

/**
 * Au-delà, on rend la carte sans les icônes plutôt que de faire attendre.
 * `media.valorant-api.com` est un CDN tiers : sa disponibilité ne doit pas
 * conditionner celle d'une image du site.
 */
const TIMEOUT_MS = 2500;

const cache = new Map<string, Promise<string | null>>();

async function load(agent: string): Promise<string | null> {
  const url = agentIconUrl(agent);
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const png = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(ICON_PX, ICON_PX, { fit: "inside" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (e) {
    // Une icône manquante ne prive pas la carte de sa ligne : le nom de
    // l'agent reprend la place. On trace, car la carte reste un 200 valide —
    // sans cette ligne, une panne du CDN serait muette.
    logger.warn("og.agent-icon.unreachable", { agent, ...describeError(e) });
    return null;
  }
}

/**
 * Icônes d'agent en data URI, prêtes pour Satori, qui ne va pas chercher les
 * images distantes lui-même.
 *
 * Mémoïsé au niveau du module : le CDN n'est interrogé qu'une fois par agent
 * et par processus. Les échecs, eux, ne sont pas mémorisés — une indisponibilité
 * passagère ne doit pas priver d'icônes toutes les cartes suivantes.
 *
 * @returns une table nom d'agent → data URI ; un agent absent de la table est
 *   un agent dont l'icône n'a pas pu être chargée.
 */
export async function agentIcons(agents: Iterable<string>): Promise<Map<string, string>> {
  const wanted = [...new Set(agents)];

  const entries = await Promise.all(
    wanted.map(async (agent) => {
      let pending = cache.get(agent);
      if (!pending) {
        pending = load(agent);
        cache.set(agent, pending);
      }
      const uri = await pending;
      if (uri === null) cache.delete(agent);
      return [agent, uri] as const;
    })
  );

  return new Map(
    entries.filter((e): e is readonly [string, string] => e[1] !== null) as [string, string][]
  );
}
