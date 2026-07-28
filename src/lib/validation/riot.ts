import { z } from "zod";

export type ParsedRiotId = { name: string; tag: string };

// Nom Riot : 3-16 caractères (lettres, chiffres, espaces). Tag : 3-5 alphanum.
const NAME_RE = /^[\p{L}\p{N} ]{3,16}$/u;
const TAG_RE = /^[\p{L}\p{N}]{3,5}$/u;

export function parseRiotId(input: string): ParsedRiotId {
  const trimmed = input.trim();
  const hash = trimmed.lastIndexOf("#");
  if (hash <= 0 || hash === trimmed.length - 1) throw new Error("RIOT_FORMAT");
  const name = trimmed.slice(0, hash).trim();
  const tag = trimmed.slice(hash + 1).trim();
  if (!NAME_RE.test(name) || !TAG_RE.test(tag)) throw new Error("RIOT_FORMAT");
  return { name, tag };
}

export const riotIdSchema = z.string().trim().refine(
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
