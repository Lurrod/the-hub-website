import type { NextConfig } from "next";

// En-têtes de sécurité de base (safe partout). La CSP stricte (script-src)
// nécessite un travail sur les nonces Next.js → à ajouter au Plan 4 (prod).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  // Sortie autonome : `.next/standalone` embarque le serveur et les seules
  // dépendances utilisées. Le build se fait en CI et on n'envoie que ce dossier
  // sur le Kimsufi, qui n'a donc ni à installer node_modules ni à compiler.
  output: "standalone",
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
