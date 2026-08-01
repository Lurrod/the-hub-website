/**
 * Construction de la Content-Security-Policy.
 *
 * Elle est publiée en **Report-Only** : le navigateur signale les violations
 * dans sa console sans rien bloquer. C'est l'étape d'observation avant de
 * passer à l'application réelle — voir la marche à suivre en bas de fichier.
 *
 * La policy ne peut pas être statique (donc pas dans `next.config.ts`) : Next
 * pose des scripts inline pour l'hydratation, qui n'échappent à `script-src`
 * que par un nonce régénéré à chaque requête. C'est `src/proxy.ts` qui appelle
 * ce module.
 */

/** Hôtes d'images tiers réellement chargés par le site. */
export const EXTERNAL_IMAGE_HOSTS = [
  // Icônes d'agents Valorant — src/lib/agents.ts
  "https://media.valorant-api.com",
  // Drapeaux de nationalité — src/components/flag.tsx
  "https://flagcdn.com",
] as const;

/**
 * En-tête utilisé. Tant qu'il vaut la variante Report-Only, aucune ressource
 * n'est bloquée. Passer à "Content-Security-Policy" une fois la console vierge
 * sur un parcours complet (accueil, tournoi, match, profil, upload d'image).
 */
export const CSP_HEADER = "Content-Security-Policy-Report-Only";

/**
 * @param nonce   valeur unique de la requête, injectée dans script-src
 * @param isDev   true en développement : React y utilise `eval` pour
 *                reconstruire les piles d'erreurs côté navigateur
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    // 'strict-dynamic' : les scripts chargés par un script porteur du nonce
    // héritent de sa confiance, ce qui couvre le découpage en chunks de Next.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Les balises <style> (next/font, Tailwind) portent le nonce ; les 18
    // attributs style={{…}} du code relèvent de style-src-attr, assoupli seul.
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    // blob: pour les aperçus d'upload (URL.createObjectURL), data: pour le
    // bruit SVG de globals.css.
    `img-src 'self' data: blob: ${EXTERNAL_IMAGE_HOSTS.join(" ")}`,
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

/** Nonce imprévisible, régénéré à chaque requête. */
export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}
