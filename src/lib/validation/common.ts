import { z } from "zod";

// URL optionnelle : http(s) valide uniquement. Rejette javascript:, data:, etc.
export const optionalUrl = z
  .string()
  .url()
  .refine((v) => /^https?:\/\//i.test(v), { message: "URL doit être http(s)" })
  .optional()
  .or(z.literal("").transform(() => undefined));

/** L'URL pointe-t-elle vers l'un des domaines autorisés (ou un de leurs sous-domaines) ? */
function hostMatches(url: string, domains: readonly string[]): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/**
 * URL optionnelle restreinte à une liste de domaines (http(s) uniquement).
 * "" ou absent -> undefined.
 */
export function optionalUrlForDomains(domains: readonly string[], message: string) {
  return z
    .string()
    .url()
    .refine((v) => /^https?:\/\//i.test(v), { message: "URL doit être http(s)" })
    .refine((v) => hostMatches(v, domains), { message })
    .optional()
    .or(z.literal("").transform(() => undefined));
}

// Réseaux dont le domaine est imposé.
export const optionalTwitterUrl = optionalUrlForDomains(
  ["x.com"],
  "Le lien Twitter doit être un lien x.com"
);
export const optionalTwitchUrl = optionalUrlForDomains(
  ["twitch.tv"],
  "Le lien Twitch doit être un lien twitch.tv"
);
