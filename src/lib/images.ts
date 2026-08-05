import path from "node:path";
import { promises as fs } from "node:fs";
import sharp from "sharp";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");
const ALLOWED_CATEGORIES = new Set(["teams", "players", "tournaments"]);

export type ImageCategory = "teams" | "players" | "tournaments";
export type ImageVariant = "banner";

export type ValidateResult = { ok: true } | { ok: false; error: string };

/**
 * Contrôle de premier niveau, sur les métadonnées annoncées par le navigateur.
 * Le type déclaré vient du client et ne prouve rien : il évite juste de lire un
 * fichier manifestement hors sujet. La vérification qui fait foi est
 * `assertRealImage`, sur le contenu.
 */
export function validateImageUpload(file: { type: string; size: number }): ValidateResult {
  if (!(file.type in ALLOWED_IMAGE_TYPES)) {
    return { ok: false, error: "Type d'image non autorisé (png, jpg, webp)." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Image trop lourde (max 5 Mo)." };
  }
  return { ok: true };
}

/** Formats réellement acceptés, tels que `sharp` les nomme. */
const ALLOWED_SHARP_FORMATS = new Set(["png", "jpeg", "webp"]);

/**
 * Vérifie le contenu, pas l'étiquette : `sharp` décode l'en-tête et dit ce que
 * le fichier EST. Un SVG renommé en .png passait le contrôle du type déclaré et
 * arrivait tel quel dans le pipeline de traitement.
 */
export async function assertRealImage(buffer: Buffer): Promise<ValidateResult> {
  try {
    const { format } = await sharp(buffer).metadata();
    if (!format || !ALLOWED_SHARP_FORMATS.has(format)) {
      return { ok: false, error: "Le fichier n'est pas une image png, jpg ou webp." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Fichier illisible : ce n'est pas une image valide." };
  }
}

/**
 * Lit un champ de formulaire, valide l'image et rend son contenu.
 *
 * Point d'entrée unique des trois formulaires d'upload (logo d'équipe, logo et
 * bannière de tournoi, photo de joueur) : la vérification du contenu ne peut
 * pas être oubliée par l'un d'eux.
 *
 * @returns null si le champ est vide (upload facultatif).
 * @throws si le fichier est trop lourd ou n'est pas une vraie image.
 */
export async function readUploadedImage(value: FormDataEntryValue | null): Promise<Buffer | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  const declared = validateImageUpload({ type: value.type, size: value.size });
  if (!declared.ok) throw new Error(declared.error);
  const buffer = Buffer.from(await value.arrayBuffer());
  const real = await assertRealImage(buffer);
  if (!real.ok) throw new Error(real.error);
  return buffer;
}

export function imageKeyFor(category: ImageCategory, id: string, variant?: ImageVariant): string {
  const suffix = variant === "banner" ? "-banner" : "";
  return `/api/images/${category}/${id}${suffix}.webp`;
}

/** Résout un chemin disque sûr sous uploads/ ; lève si traversée ou catégorie inconnue. */
export function resolveUploadPath(segments: string[]): string {
  const [category, file, ...rest] = segments;
  if (rest.length > 0) throw new Error("Chemin invalide");
  if (!category || !ALLOWED_CATEGORIES.has(category)) throw new Error("Catégorie invalide");
  if (!file || file.includes("/") || file.includes("\\") || file.includes("..")) {
    throw new Error("Nom de fichier invalide");
  }
  const resolved = path.join(UPLOADS_ROOT, category, file);
  if (!resolved.startsWith(path.join(UPLOADS_ROOT, category) + path.sep)) {
    throw new Error("Traversée de répertoire refusée");
  }
  return resolved;
}

/**
 * Validateur de cache d'une image servie.
 *
 * Les clés sont stables (elles portent l'identifiant en base) : un logo
 * remplacé garde donc la même URL. L'ETag est dérivé de la taille et de la
 * date de modification, ce qui le fait changer dès la réécriture du fichier et
 * permet de répondre 304 le reste du temps.
 */
export function imageEtag(stat: { size: number; mtimeMs: number }): string {
  return `"${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}"`;
}

/**
 * Redimensionne en webp et écrit uploads/<cat>/<id>[-banner].webp.
 * - logo (défaut) : 512×512 max, sans agrandissement
 * - bannière : 1280×360, recadrage cover
 * Retourne la clé publique.
 */
export async function processAndStoreImage(
  buffer: Buffer,
  category: ImageCategory,
  id: string,
  variant?: ImageVariant
): Promise<string> {
  const dir = path.join(UPLOADS_ROOT, category);
  await fs.mkdir(dir, { recursive: true });
  const suffix = variant === "banner" ? "-banner" : "";
  const out = path.join(dir, `${id}${suffix}.webp`);
  const pipeline = sharp(buffer);
  if (variant === "banner") {
    pipeline.resize(1280, 360, { fit: "cover" });
  } else {
    pipeline.resize(512, 512, { fit: "inside", withoutEnlargement: true });
  }
  await pipeline.webp({ quality: 82 }).toFile(out);
  return imageKeyFor(category, id, variant);
}
