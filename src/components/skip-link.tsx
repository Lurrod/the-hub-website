/**
 * Lien d'évitement (WCAG 2.2 - 2.4.1 « Contourner des blocs », niveau A).
 *
 * Invisible à la souris : `sr-only` le sort du flux sans le retirer de l'ordre
 * de tabulation. Il n'apparaît qu'à la première tabulation d'une page, ce qui
 * évite à un utilisateur clavier de retraverser le logo, les cinq liens de
 * navigation, la recherche et le menu de compte sur chaque page.
 */
export default function SkipLink() {
  return (
    <a
      href="#contenu"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-sm focus:font-medium"
    >
      Aller au contenu
    </a>
  );
}
