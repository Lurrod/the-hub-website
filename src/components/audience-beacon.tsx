"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Signale une page vue, au chargement puis à chaque navigation.
 *
 * Monté dans le layout racine, il survit aux navigations : c'est `usePathname`
 * qui fournit le changement de page, là où une balise rendue côté serveur ne
 * serait pas redemandée d'une route à l'autre et sous-compterait tout le
 * parcours.
 *
 * `sendBeacon` plutôt que `fetch` : la requête est confiée au navigateur, qui
 * la mène à bien même si l'onglet se ferme dans la seconde, et n'attend rien
 * en retour. Un repli sur `fetch(keepalive)` couvre les navigateurs qui ne
 * l'implémentent pas.
 *
 * Le composant ne rend rien et ne lit aucune donnée : il envoie un chemin.
 */
export default function AudienceBeacon() {
  const pathname = usePathname();
  // Un aller-retour vers la même adresse (rafraîchissement d'un segment,
  // remontage en développement) ne doit pas compter deux fois.
  const dernier = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || dernier.current === pathname) return;
    dernier.current = pathname;

    const url = "/api/audience";
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([pathname], { type: "text/plain" }));
      return;
    }
    void fetch(url, { method: "POST", body: pathname, keepalive: true }).catch(() => {
      // Une mesure perdue n'a aucune conséquence pour le visiteur.
    });
  }, [pathname]);

  return null;
}
