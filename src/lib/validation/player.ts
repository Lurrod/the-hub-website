import { z } from "zod";
import { optionalUrl } from "@/lib/validation/common";

export const MEMBERSHIP_ROLES = ["JOUEUR", "SUB", "COACH", "MANAGER"] as const;

export const playerInputSchema = z.object({
  pseudo: z.string().trim().min(1, "Pseudo requis").max(40),
  realName: z.string().trim().max(80).optional(),
  nationality: z.string().trim().max(40).optional(),
  socials: z
    .object({ twitter: optionalUrl, twitch: optionalUrl })
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
