import Link from "next/link";

/**
 * Tuile de chiffre : un libellé, une valeur en avant, une ligne de contexte.
 * C'est la bonne forme quand la donnée est UN nombre — un graphe à une barre
 * n'apprendrait rien de plus.
 */
export default function StatTile({
  label,
  value,
  sub,
  icon,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        {icon}
        <span style={{ fontSize: "28px" }} className="stat font-bold leading-none text-white">
          {value}
        </span>
      </div>
      {sub && <div className="mt-2 truncate text-xs text-[var(--text-muted)]">{sub}</div>}
    </>
  );

  const shell =
    "rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors";

  return href ? (
    <Link href={href} className={`${shell} block hover:border-[var(--accent)]`}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}
