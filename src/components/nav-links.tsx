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
 * `className` est laissé à l'appelant : les mêmes liens habitent la barre du
 * haut sur grand écran et une seconde rangée sur mobile, deux contextes qui
 * n'ont pas la même hauteur ni les mêmes marges.
 */
export default function NavLinks({
  isAdmin = false,
  className = "",
}: {
  isAdmin?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const links = [...LINKS, ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : [])];
  return (
    <div className={`flex items-stretch gap-0.5 text-sm sm:gap-1 ${className}`}>
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            data-active={active}
            // `whitespace-nowrap` : sans lui « LFT / LFP » se coupait sur trois
            // lignes dès que la barre manquait de place, et faisait déborder
            // toute l'en-tête.
            className="nav-link flex shrink-0 items-center whitespace-nowrap px-2 sm:px-2.5"
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
