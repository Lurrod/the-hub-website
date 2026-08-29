/**
 * Recherche des listes d'administration.
 *
 * Un formulaire `method="get"` et non un composant client : la valeur vit dans
 * l'URL, la page reste un composant serveur, et la recherche fonctionne sans
 * JavaScript. Les filtres actifs sont reconduits en champs cachés, sans quoi
 * lancer une recherche les effacerait silencieusement.
 */
export default function AdminSearch({
  action,
  q,
  conserver = {},
  placeholder,
}: {
  action: string;
  q?: string;
  conserver?: Record<string, string | undefined>;
  placeholder: string;
}) {
  return (
    <form method="get" action={action} className="flex gap-2">
      {Object.entries(conserver).map(([nom, valeur]) =>
        valeur ? <input key={nom} type="hidden" name={nom} value={valeur} /> : null
      )}
      <label className="sr-only" htmlFor="admin-q">
        Rechercher
      </label>
      <input
        id="admin-q"
        type="search"
        name="q"
        defaultValue={q ?? ""}
        placeholder={placeholder}
        className="field w-full max-w-xs"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg border border-[var(--border-strong)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        Rechercher
      </button>
    </form>
  );
}
