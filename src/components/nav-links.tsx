"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/tournois", label: "Tournois" },
  { href: "/matchs", label: "Matchs" },
  { href: "/equipes", label: "Équipes" },
];

export default function NavLinks({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const links = [...LINKS, ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : [])];
  return (
    <div className="flex items-stretch self-stretch gap-0.5 text-sm sm:gap-1">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            data-active={active}
            className="nav-link flex items-center px-1.5 sm:px-2.5"
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
