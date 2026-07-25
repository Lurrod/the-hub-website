import { z } from "zod";
import { REGIONS } from "@/lib/constants";
import { optionalUrl } from "@/lib/validation/common";

export const teamInputSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(60),
  tag: z.string().trim().min(1, "Tag requis").max(8),
  region: z.enum(REGIONS),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  socials: z
    .object({
      twitter: optionalUrl,
      twitch: optionalUrl,
      website: optionalUrl,
    })
    .partial()
    .optional(),
});

export type TeamInput = z.infer<typeof teamInputSchema>;
