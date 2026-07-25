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
  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;
  return (
    <div className="flex items-center gap-1 text-sm">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            data-active={active}
            className="nav-link px-2.5 py-1"
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
