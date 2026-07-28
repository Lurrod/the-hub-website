import { z } from "zod";
import { REGIONS } from "@/lib/constants";
import { optionalUrl, optionalTwitterUrl, optionalTwitchUrl } from "@/lib/validation/common";

export const teamInputSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(60),
  tag: z.string().trim().min(1, "Tag requis").max(8),
  region: z.enum(REGIONS),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  socials: z
    .object({
      twitter: optionalTwitterUrl,
      twitch: optionalTwitchUrl,
      youtube: optionalUrl,
      instagram: optionalUrl,
      discord: optionalUrl,
      website: optionalUrl,
    })
    .partial()
    .optional(),
});

// Roster optionnel fourni à la création : liste de joueurs (pseudo + rôle).
export const rosterEntrySchema = z.object({
  pseudo: z.string().trim().min(1).max(40),
  role: z.enum(["JOUEUR", "SUB", "COACH", "MANAGER"]).default("JOUEUR"),
});
export type RosterEntry = z.infer<typeof rosterEntrySchema>;

export type TeamInput = z.infer<typeof teamInputSchema>;
