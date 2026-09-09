/**
 * Cible d'une réécriture interne du proxy, alignée sur le protocole que le
 * serveur Node sert réellement.
 *
 * Next construit `request.url` en collant le protocole de `X-Forwarded-Proto`
 * sur `localhost:<port>` — il ignore le `Host`, pourtant préservé par Apache.
 * Il compare ensuite l'origine de la réécriture à celle qu'il sert vraiment,
 * en clair : le `https` de trop la fait passer pour externe, Next va chercher
 * `https://localhost:3200/introuvable`, il n'y a pas de TLS sur ce port, et
 * toute fiche inexistante répondait 500 au lieu de 404. En production
 * seulement : la CI lance le serveur sans proxy devant, les deux origines y
 * coïncident et le parcours qui vérifie ces 404 passait au vert.
 *
 * Le saut Apache -> Node est en clair par construction — `ProxyPass /
 * http://127.0.0.1:3200/` dans `deploy/apache.conf`, versionné à côté de ce
 * fichier. On force donc le protocole plutôt que de le déduire d'un en-tête :
 * Next pose lui-même les `x-forwarded-*` sur chaque requête, leur présence ne
 * distingue rien.
 */
export function internalRewriteUrl(path: string, requestUrl: string): URL {
  const cible = new URL(path, requestUrl);
  cible.protocol = "http:";
  return cible;
}
