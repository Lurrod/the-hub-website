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
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
