import { z } from "zod";
import {
  REGIONS,
  TOURNAMENT_FORMATS,
  TOURNAMENT_STATUSES,
  SEEDING_TYPES,
} from "@/lib/constants";
import { optionalUrl, optionalTwitterUrl, optionalTwitchUrl } from "@/lib/validation/common";

// Entier positif optionnel : "" ou absent -> undefined.
const optionalPositiveInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : Number(v)))
  .refine((n) => n === undefined || (Number.isInteger(n) && n > 0), {
    message: "Doit être un entier positif",
  });

// Date optionnelle : "" ou absente -> undefined ; sinon Date valide.
const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? new Date(v) : undefined))
  .refine((d) => d === undefined || !Number.isNaN(d.getTime()), {
    message: "Date invalide",
  });

export const tournamentInputSchema = z
  .object({
    name: z.string().trim().min(1, "Nom requis").max(120),
    region: z.enum(REGIONS),
    format: z.enum(TOURNAMENT_FORMATS),
    status: z.enum(TOURNAMENT_STATUSES).default("UPCOMING"),
    startDate: optionalDate,
    endDate: optionalDate,
    prizePool: z.string().trim().max(120).optional(),
    organizer: z.string().trim().max(120).optional(),
    description: z.string().trim().max(4000).optional(),
    maxTeams: optionalPositiveInt,
    groupSize: optionalPositiveInt,
    bestOf: optionalPositiveInt,
    seeding: z.enum(SEEDING_TYPES).optional(),
    // Mêmes réseaux qu'une équipe : le Discord y sert de canal d'inscription.
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
  })
  .refine((v) => !(v.startDate && v.endDate) || v.startDate <= v.endDate, {
    message: "La date de fin doit suivre la date de début",
    path: ["endDate"],
  })
  .refine((v) => v.groupSize === undefined || v.maxTeams === undefined || v.groupSize <= v.maxTeams, {
    message: "La taille de poule ne peut pas dépasser le nombre d'équipes",
    path: ["groupSize"],
  });

export type TournamentInput = z.infer<typeof tournamentInputSchema>;

export const participantAddSchema = z.object({
  teamId: z.string().trim().min(1, "Équipe requise"),
  seed: z.coerce.number().int().positive().optional(),
});

export type ParticipantAdd = z.infer<typeof participantAddSchema>;
