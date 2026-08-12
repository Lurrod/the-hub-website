import { promises as fs } from "node:fs";
import sharp from "sharp";
import { EXTERNAL_IMAGE_HOSTS } from "@/lib/csp";
import { resolveUploadPath } from "@/lib/images";
import { logger, describeError } from "@/lib/logger";

const KEY_PREFIX = "/api/images/";

/**
 * Origines dont on accepte de charger une image à distance.
 *
 * C'est exactement la liste que la CSP autorise déjà en `img-src` : les deux
 * répondent à la même question — « de quels hôtes acceptons-nous une image ? »
 * —, et les partager évite qu'une carte affiche ce qu'un navigateur refuserait,
 * ou l'inverse. Elle sert ici de garde contre le SSRF : sans elle, une valeur
 * de `photo` pointant vers une adresse interne serait allègrement récupérée
 * par le serveur.
 */
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set(EXTERNAL_IMAGE_HOSTS);

/** Au-delà, on renonce : une carte de partage ne vaut pas une attente. */
const FETCH_TIMEOUT_MS = 5000;

/** Plafond d'une image distante. Un avatar Discord pèse quelques dizaines de Ko. */
const MAX_REMOTE_BYTES = 4 * 1024 * 1024;

/**
 * Ce qu'on veut bien écrire en trace pour une image illisible.
 *
 * Une clé d'upload est un identifiant technique, elle part telle quelle. Une
 * URL d'avatar Discord, elle, porte l'identifiant du compte : on n'en garde
 * que l'origine, conformément à la règle du projet — aucune donnée personnelle
 * en contexte de log (cf. `lib/logger`).
 */
function traceable(key: string): string {
  if (key.startsWith(KEY_PREFIX)) return key;
  try {
    return new URL(key).origin;
  } catch {
    return "clé malformée";
  }
}

/** Récupère les octets d'origine, du disque ou du réseau selon la clé. */
async function readSource(key: string): Promise<Buffer> {
  if (key.startsWith(KEY_PREFIX)) {
    // Lecture directe sur le disque plutôt qu'une requête HTTP vers
    // `/api/images/…` : le rendu tourne dans le même processus que la route
    // qui servirait le fichier, un aller-retour interne serait inutile et une
    // source de blocage.
    return fs.readFile(resolveUploadPath(key.slice(KEY_PREFIX.length).split("/")));
  }

  const url = new URL(key);
  if (!ALLOWED_ORIGINS.has(url.origin)) {
    throw new Error(`origine non autorisée : ${url.origin}`);
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`réponse ${res.status}`);

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.byteLength > MAX_REMOTE_BYTES) {
    throw new Error(`image distante trop lourde : ${bytes.byteLength} octets`);
  }
  return bytes;
}

/**
 * Convertit une image de profil en PNG inlinable par Satori, qui ne décode ni
 * le WebP ni le GIF.
 *
 * La clé stockée en base prend deux formes : un upload (`/api/images/…`), ou
 * l'URL de l'avatar Discord, que `ensurePlayerForUser` reprend telle quelle à
 * la création du compte. Ne traiter que la première revenait à priver de leur
 * photo tous les comptes qui n'en ont jamais téléversé — la quasi-totalité —,
 * aussi bien sur la carte téléchargeable que sur l'aperçu de lien.
 *
 * Un GIF animé (les avatars Discord `a_…`) est réduit à sa première image :
 * c'est ce que fait sharp par défaut, et une carte de partage est fixe.
 *
 * @param key clé publique stockée en base (`team.logo`, `player.photo`, …).
 * @param sizePx côté maximum de l'image produite, sans agrandissement.
 * @returns un data URI, ou `null` si la clé est absente, malformée, refusée ou
 *   pointe sur une image illisible. L'appelant retombe alors sur le monogramme.
 */
export async function imageAsPngDataUri(
  key: string | null | undefined,
  sizePx = 160
): Promise<string | null> {
  if (!key) return null;

  try {
    const source = await readSource(key);
    const png = await sharp(source)
      .resize(sizePx, sizePx, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (e) {
    // Un logo manquant ou corrompu ne doit jamais priver la page de sa carte
    // de partage : le monogramme prend le relais. On trace tout de même, car
    // la carte reste un 200 valide — sans cette ligne, l'incident est muet.
    logger.warn("og.image.unreadable", { key: traceable(key), ...describeError(e) });
    return null;
  }
}
