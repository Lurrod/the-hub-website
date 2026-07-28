"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Masque le footer sur la landing, qui se veut plein écran et sans pied de page.
 * Le layout racine étant un composant serveur, il n'a pas accès à la route :
 * seul ce garde est client, le `<Footer />` reste rendu côté serveur et transite
 * ici en `children`.
 */
export default function FooterSlot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <>{children}</>;
}
