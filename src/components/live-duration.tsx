"use client";

import { useEffect, useState } from "react";
import { lengthLabel } from "@/lib/duration";

/**
 * Durée d'un passage encore en cours, recalculée en direct côté client
 * (mise à jour chaque minute) pour ne jamais afficher une valeur figée.
 * `initial` = valeur rendue par le serveur, pour un premier paint identique.
 */
export default function LiveDuration({ startIso, initial }: { startIso: string; initial: string }) {
  const [label, setLabel] = useState(initial);

  useEffect(() => {
    const compute = () => setLabel(lengthLabel(new Date(startIso), null));
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, [startIso]);

  return <span suppressHydrationWarning>{label}</span>;
}
