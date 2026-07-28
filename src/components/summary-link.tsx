"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Lien placé à l'intérieur d'un <summary>. Sans `stopPropagation`, le clic
 * remonterait jusqu'au <summary> et replierait la zone en même temps qu'il
 * navigue. Isolé dans son propre composant client pour que le reste de
 * l'arbre (dont les lignes de match) reste rendu côté serveur.
 */
export default function SummaryLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={(e) => e.stopPropagation()}>
      {children}
    </Link>
  );
}
