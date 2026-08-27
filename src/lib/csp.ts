/**
 * Construction de la Content-Security-Policy.
 *
 * Elle est **appliquée** : le navigateur bloque ce qui n'y figure pas. La
 * phase d'observation en Report-Only a été menée sur un parcours complet
 * (accueil, tournoi, match, profil, upload d'image, pages de gestion) sans
 * relever de violation.
 *
 * La policy ne peut pas être statique (donc pas dans `next.config.ts`) : Next
 * pose des scripts inline pour l'hydratation, qui n'échappent à `script-src`
 * que par un nonce régénéré à chaque requête. C'est `src/proxy.ts` qui appelle
 * ce module.
 */

/** Hôtes d'images tiers réellement chargés par le site. */
export const EXTERNAL_IMAGE_HOSTS = [
  // media.valorant-api.com a été retiré : les icônes d'agents, de rôles,
  // d'armes et les illustrations de maps sont désormais servies depuis
  // `public/valorant/`, rapatriées par `npm run assets:valorant`.
  // Drapeaux de nationalité — src/components/flag.tsx
  "https://flagcdn.com",
  // Avatars Discord : `ensurePlayerForUser` reprend `user.image` comme photo
  // par défaut à la création du compte, et la session en porte une copie pour
  // le menu utilisateur. Tant que ces URL ne sont pas recopiées dans
  // `uploads/`, tout nouveau compte a une photo servie depuis ce domaine.
  "https://cdn.discordapp.com",
] as const;

/**
 * En-tête utilisé. En cas de régression sur une page, repasser
 * temporairement à "Content-Security-Policy-Report-Only" fait réapparaître les
 * violations en console sans casser le site, le temps d'ajuster la policy.
 */
export const CSP_HEADER = "Content-Security-Policy";

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
