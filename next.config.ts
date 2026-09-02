import type { NextConfig } from "next";

// En-têtes de sécurité appliqués à toutes les réponses. La CSP, elle, dépend
// d'un nonce régénéré à chaque requête : elle ne peut pas être statique et est
// posée par `src/proxy.ts`.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deux ans, sous-domaines compris. `preload` rend le domaine éligible à la
  // liste HSTS des navigateurs : à ne retirer que si un sous-domaine doit un
  // jour rester accessible en HTTP.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Le site n'utilise aucune de ces API : les refuser coupe court à tout abus
  // par un script tiers qui serait injecté.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  // Sans ce réglage, Next annonce `X-Powered-By: Next.js` sur chaque réponse.
  poweredByHeader: false,
  // Sortie autonome : `.next/standalone` embarque le serveur et les seules
  // dépendances utilisées. Le build se fait en CI et on n'envoie que ce dossier
  // sur le Kimsufi, qui n'a donc ni à installer node_modules ni à compiler.
  output: "standalone",
  images: {
    // Les seules tailles réellement rendues par le site. Les restreindre borne
    // le travail de sharp : chaque paire (image, largeur) est optimisée une
    // fois, et le process est unique.
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [16, 24, 32, 48, 64, 96, 128, 256],
    // Les clés de `/api/images` sont stables — un logo remplacé garde son URL —
    // et l'ETag change à la réécriture. Un an de cache est donc sans risque et
    // évite de refaire le travail à chaque expiration.
    minimumCacheTTL: 31_536_000,
    // Deux hôtes tiers réellement chargés par le site, déjà déclarés dans la
    // CSP : sans eux, `next/image` refuse l'URL au lieu de la servir.
    remotePatterns: [
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "cdn.discordapp.com" },
    ],
  },
  experimental: {
    serverActions: {
      // Next plafonne le corps des server actions à 1 Mo par défaut et renvoie
      // une 413 avant même d'exécuter l'action : un logo de plus de 1 Mo cassait
      // l'enregistrement d'équipe. On accepte deux images à la limite applicative
      // (MAX_UPLOAD_BYTES = 5 Mo, logo + bannière de tournoi) plus le surcoût
      // multipart et les autres champs du formulaire.
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
