import { z } from "zod";
import { optionalTwitterUrl, optionalTwitchUrl } from "@/lib/validation/common";
import { VALORANT_ROLES } from "@/lib/roles";
import { MEMBERSHIP_ROLES } from "@/lib/membership-roles";

export { MEMBERSHIP_ROLES };

export const playerInputSchema = z.object({
  pseudo: z.string().trim().min(1, "Pseudo requis").max(40),
  realName: z.string().trim().max(80).optional(),
  nationality: z.string().trim().max(40).optional(),
  valorantRole: z.enum(VALORANT_ROLES).nullish(),
  birthdate: z.string().trim().optional(),
  socials: z
    .object({ twitter: optionalTwitterUrl, twitch: optionalTwitchUrl })
    .partial()
    .optional(),
});
export type PlayerInput = z.infer<typeof playerInputSchema>;

export const rosterAddSchema = z.object({
  pseudo: z.string().trim().min(1, "Pseudo requis").max(40),
  nationality: z.string().trim().max(40).optional(),
  role: z.enum(MEMBERSHIP_ROLES).default("JOUEUR"),
});
export type RosterAddInput = z.infer<typeof rosterAddSchema>;

/**
 * Rôle d'un membre du roster, isolé pour le changement de rôle.
 *
 * Sans lui, l'action castait `formData.get("role")` directement en enum : une
 * valeur hors liste ne se heurtait qu'à la contrainte Prisma, un échec de base
 * plutôt qu'un refus propre à la frontière.
 */
export const memberRoleSchema = z.object({
  role: z.enum(MEMBERSHIP_ROLES).default("JOUEUR"),
});
