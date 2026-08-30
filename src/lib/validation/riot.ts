import { z } from "zod";

export type ParsedRiotId = { name: string; tag: string };

/**
 * Bornes de Riot : nom de 3 à 16 caractères, tag de 3 à 5. Rien d'autre n'est
 * contrôlé ici que la longueur.
 *
 * La règle précédente n'admettait que lettres, chiffres et espaces dans le nom,
 * et refusait l'espace dans le tag. Elle a rejeté « Ruskof#DO IT » — un compte
 * qui existe, vérifié auprès de Riot le 2026-08-31 : le tag porte bel et bien
 * une espace. Un filtre local plus strict que Riot ne protège de rien, puisque
 * `verifyRiotId` tranche ensuite l'existence auprès de la source ; il ne fait
 * que fermer la porte à des joueurs réels avec un message qui les accuse à tort
 * de mal saisir leur identifiant.
 *
 * Restent exclus le « # », qui est le séparateur, et les caractères de contrôle
 * (`\p{C}`), qui n'ont rien à faire dans une saisie et brouilleraient les
 * journaux comme l'URL de vérification.
 */
const NAME_RE = /^[^#\p{C}]{3,16}$/u;
const TAG_RE = /^[^#\p{C}]{3,5}$/u;

export function parseRiotId(input: string): ParsedRiotId {
  const trimmed = input.trim();
  const hash = trimmed.lastIndexOf("#");
  if (hash <= 0 || hash === trimmed.length - 1) throw new Error("RIOT_FORMAT");
  const name = trimmed.slice(0, hash).trim();
  const tag = trimmed.slice(hash + 1).trim();
  if (!NAME_RE.test(name) || !TAG_RE.test(tag)) throw new Error("RIOT_FORMAT");
  return { name, tag };
}

export const riotIdSchema = z
  .string()
  .trim()
  .refine(
    (v) => {
      try {
        parseRiotId(v);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Format Riot ID invalide (Nom#Tag)" }
  );
