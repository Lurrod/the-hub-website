"use client";

import { useEffect, useRef, useState } from "react";
import { lengthLabel } from "@/lib/duration";

/**
 * Durée d'un passage encore en cours, recalculée en direct côté client
 * (mise à jour chaque minute) pour ne jamais afficher une valeur figée.
 * `initial` = valeur rendue par le serveur, pour un premier paint identique.
 *
 * Chaque caractère rejoue le pop-in du snippet `02-number-pop-in` quand la
 * valeur change ; les deux derniers sont décalés pour que la mise à jour se
 * lise sans devenir bruyante.
 */
export default function LiveDuration({ startIso, initial }: { startIso: string; initial: string }) {
  const [label, setLabel] = useState(initial);
  const groupRef = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const compute = () => setLabel(lengthLabel(new Date(startIso), null));
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, [startIso]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    // Pas d'animation au premier rendu : la valeur n'a pas encore « changé ».
    if (first.current) {
      first.current = false;
      return;
    }
    group.classList.remove("is-animating");
    void group.offsetHeight; // reflow : sans lui les keyframes ne repartent pas
    group.classList.add("is-animating");
  }, [label]);

  const chars = label.split("");
  return (
    <span ref={groupRef} className="t-digit-group" suppressHydrationWarning>
      {chars.map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          className="t-digit"
          data-stagger={i === chars.length - 2 ? "1" : i === chars.length - 1 ? "2" : undefined}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
