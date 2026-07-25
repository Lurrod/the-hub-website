import { z } from "zod";

// URL optionnelle : http(s) valide uniquement. Rejette javascript:, data:, etc.
export const optionalUrl = z
  .string()
  .url()
  .refine((v) => /^https?:\/\//i.test(v), { message: "URL doit être http(s)" })
  .optional()
  .or(z.literal("").transform(() => undefined));
