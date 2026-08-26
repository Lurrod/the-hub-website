import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { agentIconUrl } from "@/lib/agents";
import { logger, describeError } from "@/lib/logger";

/** Côté de l'icône produite. Elle est affichée à 34 px, doublé pour la netteté. */
const ICON_PX = 68;

/**
 * Les icônes sont lues dans `public/` — plus aucun appel réseau ici. Le CDN
 * `media.valorant-api.com` était un tiers sur le chemin d'une image de partage :
 * sa latence était celle de la carte, sa panne en retirait les icônes. La
 * temporisation de 2,5 s qui l'encadrait n'a donc plus d'objet.
 *
 * `process.cwd()` est la racine du serveur `standalone`, où le déploiement
 * recopie `public/` (voir .github/workflows/deploy.yml).
 */
function iconPath(url: string): string {
  return path.join(process.cwd(), "public", ...url.split("/").filter(Boolean));
}

const cache = new Map<string, Promise<string | null>>();

async function load(agent: string): Promise<string | null> {
  const url = agentIconUrl(agent);
  if (!url) return null;
  try {
    const png = await sharp(await readFile(iconPath(url)))
      .resize(ICON_PX, ICON_PX, { fit: "inside" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (e) {
    // Une icône manquante ne prive pas la carte de sa ligne : le nom de
    // l'agent reprend la place. On trace, car la carte reste un 200 valide —
    // sans cette ligne, un fichier oublié au déploiement serait muet.
    logger.warn("og.agent-icon.unreadable", { agent, ...describeError(e) });
    return null;
  }
}

/**
 * Icônes d'agent en data URI, prêtes pour Satori, qui ne va pas chercher les
 * images distantes lui-même.
 *
 * Mémoïsé au niveau du module : le fichier n'est lu et redimensionné qu'une
 * fois par agent et par processus. Les échecs, eux, ne sont pas mémorisés — une
 * lecture qui rate ne doit pas priver d'icônes toutes les cartes suivantes.
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
