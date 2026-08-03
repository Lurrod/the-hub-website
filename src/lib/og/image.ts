import { promises as fs } from "node:fs";
import sharp from "sharp";
import { resolveUploadPath } from "@/lib/images";

const KEY_PREFIX = "/api/images/";

/**
 * Convertit un upload en PNG inlinable par Satori, qui ne décode pas le WebP.
 *
 * La lecture se fait directement sur le disque plutôt que par une requête HTTP
 * vers `/api/images/…` : le rendu tourne dans le même processus que la route
 * qui servirait le fichier, une requête interne serait un aller-retour inutile
 * et une source de blocage.
 *
 * @param key clé publique stockée en base (`team.logo`, `player.photo`, …).
 * @param sizePx côté maximum de l'image produite, sans agrandissement.
 * @returns un data URI, ou `null` si la clé est absente, malformée ou pointe
 *   sur un fichier illisible. L'appelant retombe alors sur le monogramme.
 */
export async function uploadAsPngDataUri(
  key: string | null | undefined,
  sizePx = 160
): Promise<string | null> {
  if (!key || !key.startsWith(KEY_PREFIX)) return null;

  try {
    const segments = key.slice(KEY_PREFIX.length).split("/");
    const filePath = resolveUploadPath(segments);
    const source = await fs.readFile(filePath);
    const png = await sharp(source)
      .resize(sizePx, sizePx, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    // Un logo manquant ou corrompu ne doit jamais priver la page de sa carte
    // de partage : le monogramme prend le relais.
    return null;
  }
}
