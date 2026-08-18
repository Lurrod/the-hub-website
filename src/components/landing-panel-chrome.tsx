/**
 * Pièces communes aux maquettes de la landing : le cadre, son bandeau de
 * titre et la pastille d'entité.
 *
 * Elles vivent à part parce que les cinq panneaux les partagent et qu'aucune
 * ne porte de contenu : les changer, c'est changer la charte de la vitrine,
 * pas ce qu'elle raconte.
 */

// `min-w-0` (dans PanelShell) : sans lui, une maquette plus large que la
// colonne (le tableau de scoreboard sur petit écran) impose sa largeur de
// contenu à la grille et fait déborder la page entière au lieu d'être
// contenue. La coquille est un composant client à part : elle suit le curseur
// pour le halo et l'inclinaison, ce que ce fichier — partagé par des
// composants serveur — n'a pas à embarquer.
export { default as Panel } from "@/components/landing-panel-shell";

/** Bandeau de titre interne, repris de l'en-tête des sections du site. */
export function PanelHead({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="lf-t10 font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
        {label}
      </span>
      {right}
    </div>
  );
}

/**
 * Pastille d'entité : le logo quand il y en a un, sinon le monogramme, comme
 * partout ailleurs sur le site (`.monogram`).
 */
export function Tag({
  tag,
  logo = null,
  size = "h-7 w-7",
}: {
  tag: string;
  logo?: string | null;
  size?: string;
}) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        loading="lazy"
        decoding="async"
        className={`${size} shrink-0 rounded-[6px] object-cover`}
      />
    );
  }
  return (
    <span
      className={`monogram lf-t10 inline-grid ${size} shrink-0 place-items-center rounded-[6px] font-semibold`}
    >
      {tag}
    </span>
  );
}

/** Deux premières lettres d'un nom, faute de logo. */
export const initials = (name: string) => name.slice(0, 2).toUpperCase();

/** Éléments d'identité séparés par des points, les manquants simplement omis. */
export function Facts({ items }: { items: readonly string[] }) {
  return (
    <>
      {items.map((f, i) => (
        <span key={f}>
          {i > 0 && <span className="dot-sep">·</span>}
          {f}
        </span>
      ))}
    </>
  );
}
