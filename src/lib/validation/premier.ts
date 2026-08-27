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
 * Un match de ligue. `started_at` est exigé : c'est le seul champ qui permette
 * de rattacher le match à une saison, l'API n'en donnant aucun autre.
 */
const leagueMatchSchema = z.object({
  id: z.string().min(1),
  started_at: z.string().min(1),
});

/**
 * Une participation à un tournoi de playoffs.
 *
 * Les deux listes de l'historique n'ont **pas la même forme**, ce qui n'est
 * documenté nulle part : `league_matches` liste des matchs, `tournament_matches`
 * liste des participations, chacune portant ses identifiants de partie dans
 * `matches[]`. Aucune date n'y figure — un match de playoffs ne peut donc pas
 * être rattaché à une saison par sa fenêtre de dates, seulement par son
 * `tournament_id`.
 *
 * `matches[]` contient des chaînes vides : ce sont les créneaux d'un arbre que
 * l'équipe n'a pas joués, parce qu'elle en a été éliminée avant. Les rejeter
 * ferait échouer la synchronisation sur une donnée parfaitement normale — on
 * les écarte ici, une fois pour toutes, plutôt qu'à chaque point d'usage.
 */
const tournamentEntrySchema = z.object({
  tournament_id: z.string().min(1),
  placement: z.number().int().optional(),
  points_before: z.number().int().optional(),
  points_after: z.number().int().optional(),
  matches: z
    .array(z.string())
    .default([])
    .transform((ids) => ids.filter((id) => id.length > 0)),
});

export const premierHistorySchema = z.object({
  league_matches: z.array(leagueMatchSchema),
  tournament_matches: z.array(tournamentEntrySchema),
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

/**
 * Catalogue de contenu Valorant, réduit aux actes.
 *
 * Sert à nommer une saison Premier comme Riot la nomme (« V26 Act V ») plutôt
 * que par un numéro d'ordre que l'API ne donne pas.
 */
export const valorantActsSchema = z.object({
  acts: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })).default([]),
});
