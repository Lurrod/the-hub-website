"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/tournois", label: "Tournois" },
  { href: "/matchs", label: "Matchs" },
  { href: "/equipes", label: "Équipes" },
  { href: "/joueurs", label: "Joueurs" },
  { href: "/lft", label: "LFT / LFP" },
];

/**
 * Liens de navigation principaux.
 *
 * Deux habitats : la barre du haut sur grand écran (`bar`), et le tiroir
 * mobile (`drawer`). Même liste, même état actif, deux mises en forme — c'est
 * ce qui garantit qu'un lien ajouté ici apparaît des deux côtés.
 */
export default function NavLinks({
  isAdmin = false,
  variant = "bar",
  onNavigate,
}: {
  isAdmin?: boolean;
  variant?: "bar" | "drawer";
  /** Appelé au clic : sert au tiroir pour se refermer derrière l'utilisateur. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const links = [...LINKS, ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : [])];
  const drawer = variant === "drawer";

  return (
    <div
      className={
        drawer ? "flex flex-col" : "flex items-stretch gap-0.5 self-stretch text-sm sm:gap-1"
      }
    >
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            data-active={active}
            onClick={onNavigate}
            // `whitespace-nowrap` : sans lui « LFT / LFP » se coupait sur
            // plusieurs lignes dès que la place manquait.
            className={
              drawer
                ? "nav-link-drawer flex items-center whitespace-nowrap px-5 py-3 text-[15px]"
                : "nav-link flex shrink-0 items-center whitespace-nowrap px-2 sm:px-2.5"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
