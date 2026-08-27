import { z } from "zod";

/**
 * Frontière avec HenrikDev : rien n'entre en base sans passer par là.
 *
 * Les schémas sont volontairement **tolérants aux champs inconnus** — le
 * comportement par défaut de Zod — mais stricts sur ceux dont dépend l'import.
 * Un ajout côté API ne doit pas arrêter la synchronisation ; une suppression
 * doit la faire échouer bruyamment plutôt qu'écrire une ligne trouée qu'on
 * découvrirait des semaines plus tard sur une fiche d'équipe.
 */

export const premierTeamEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tag: z.string(),
  conference: z.string(),
  division: z.number().int(),
  wins: z.number().int().optional(),
  losses: z.number().int().optional(),
  score: z.number().int().optional(),
  customization: z.object({ image: z.string().url().optional() }).optional(),
});
export type PremierTeamEntry = z.infer<typeof premierTeamEntrySchema>;

export const premierLeaderboardSchema = z.array(premierTeamEntrySchema);

/**
 * Une entrée d'historique. `started_at` est exigé : c'est le seul champ qui
 * permette de rattacher le match à une saison, l'API n'en donnant aucun autre.
 */
const historyEntrySchema = z.object({
  id: z.string().min(1),
  started_at: z.string().min(1),
});

export const premierHistorySchema = z.object({
  league_matches: z.array(historyEntrySchema),
  tournament_matches: z.array(historyEntrySchema),
});
export type PremierHistory = z.infer<typeof premierHistorySchema>;

export const premierSeasonSchema = z.object({
  id: z.string().min(1),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
});
export const premierSeasonsSchema = z.array(premierSeasonSchema);
export type PremierSeasonResponse = z.infer<typeof premierSeasonSchema>;

export const premierTeamDetailSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tag: z.string(),
  // Une équipe non inscrite à la saison en cours n'expose pas de membres.
  member: z
    .array(z.object({ puuid: z.string().min(1), name: z.string(), tag: z.string() }))
    .default([]),
});
export type PremierTeamDetail = z.infer<typeof premierTeamDetailSchema>;
