import { z } from "zod";
import { MATCH_STAGES, MATCH_STATUSES, BEST_OF_OPTIONS } from "@/lib/constants";
import { RIOT_CAMPS } from "@/lib/match-stats-core";
import { hasTimePart, parseSiteDateTime } from "@/lib/timezone";

/**
 * Date et heure de coup d'envoi, saisies dans un `<input type="datetime-local">`.
 *
 * La valeur n'a pas de fuseau : elle est comprise comme une heure de Paris,
 * jamais comme une heure UTC — voir `lib/timezone`. `hasTime` retient si
 * l'organisateur a réellement renseigné une heure, pour ne pas afficher un
 * minuit par défaut comme s'il s'agissait du coup d'envoi.
 */
const optionalDateTime = z
  .string()
  .optional()
  .transform((v) => {
    const raw = v?.trim() ?? "";
    if (raw === "") return { date: undefined, hasTime: false };
    return { date: parseSiteDateTime(raw) ?? undefined, hasTime: hasTimePart(raw), raw };
  })
  .refine((v) => v.raw === undefined || v.date !== undefined, { message: "Date invalide" });

export const matchInputSchema = z
  .object({
    teamAId: z.string().trim().min(1, "Équipe A requise"),
    teamBId: z.string().trim().min(1, "Équipe B requise"),
    scoreA: z.coerce.number().int().min(0).default(0),
    scoreB: z.coerce.number().int().min(0).default(0),
    stage: z.enum(MATCH_STAGES).default("GROUP"),
    status: z.enum(MATCH_STATUSES).default("SCHEDULED"),
    bestOf: z.coerce
      .number()
      .int()
      .refine((n) => (BEST_OF_OPTIONS as readonly number[]).includes(n), {
        message: "BestOf invalide",
      })
      .default(1),
    groupId: z.string().trim().optional(),
    round: z.string().trim().max(60).optional(),
    bracketPosition: z.coerce.number().int().min(0).optional(),
    date: optionalDateTime,
    vodUrl: z
      .string()
      .trim()
      .url("URL invalide")
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine((v) => v.teamAId !== v.teamBId, {
    message: "Les deux équipes doivent être différentes",
    path: ["teamBId"],
  })
  .refine((v) => v.scoreA <= mapsToWin(v.bestOf) && v.scoreB <= mapsToWin(v.bestOf), {
    message: "Le score se compte en maps gagnées, pas en rounds",
    path: ["scoreA"],
  });

/** Maps nécessaires pour remporter la série : BO1 → 1, BO3 → 2, BO5 → 3. */
export function mapsToWin(bestOf: number): number {
  return Math.ceil(bestOf / 2);
}

export type MatchInput = z.infer<typeof matchInputSchema>;

export const matchMapSchema = z.object({
  mapName: z.string().trim().min(1, "Nom de map requis").max(40),
  scoreA: z.coerce.number().int().min(0),
  scoreB: z.coerce.number().int().min(0),
  order: z.coerce.number().int().min(0).default(0),
});

export type MatchMapInput = z.infer<typeof matchMapSchema>;

/**
 * Import manuel d'une map par son identifiant de partie Riot, quand la
 * recherche automatique ne trouve rien. `campOfTeamA` laisse l'admin dire quel
 * camp Riot est l'équipe A ; « AUTO » retombe sur la déduction par les puuid.
 */
// Forme d'un identifiant de partie, sans la contrainte de version/variante de
// `z.uuid()` : c'est un identifiant opaque côté Riot, pas un UUID à valider.
const RIOT_MATCH_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const matchMapImportSchema = z.object({
  riotMatchId: z.string().trim().regex(RIOT_MATCH_ID, "Identifiant de partie invalide"),
  campOfTeamA: z.enum(["AUTO", ...RIOT_CAMPS]).default("AUTO"),
});

export type MatchMapImportInput = z.infer<typeof matchMapImportSchema>;
