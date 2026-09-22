"use client";

/**
 * Case du HUD de la vitrine : défile en douceur jusqu'à son round au lieu de
 * sauter d'un coup. Un saut sec sur une page de plusieurs écrans fait perdre
 * le fil — on ne sait plus si on est monté ou descendu.
 *
 * Pas de `scroll-behavior: smooth` sur `<html>` : depuis Next 16, le routeur
 * ne le neutralise plus pendant les navigations, et chaque changement de page
 * du site défilerait lentement vers le haut. Ici le lissage ne vaut que pour
 * ces liens-là.
 *
 * Sans JavaScript, c'est une ancre ordinaire : le saut reste, rien ne casse.
 */
export default function RoundLink({
  target,
  className,
  children,
}: {
  target: string;
  className: string;
  children: React.ReactNode;
}) {
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Ctrl/Cmd-clic, clic milieu : on laisse le navigateur ouvrir l'ancre.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const el = document.getElementById(target);
    if (!el) return;
    e.preventDefault();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Le décalage sous la navigation et le HUD vient du `scroll-margin-top`
    // posé sur `.lr-round` : `scrollIntoView` le respecte.
    el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    // L'adresse suit, comme avec une ancre, sans ajouter d'entrée à
    // l'historique à chaque case cliquée.
    history.replaceState(null, "", `#${target}`);
  };

  return (
    <a href={`#${target}`} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
