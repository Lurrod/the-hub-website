import Link from "next/link";

/**
 * État vide commun au site.
 *
 * Tant que la base est jeune, l'écran vide n'est pas un cas limite : c'est
 * l'écran le plus vu. Il mérite donc autant de soin que l'écran plein, et il
 * doit dire trois choses — ce qu'il n'y a pas, pourquoi, et quoi faire.
 *
 * Sous le message, une préfiguration du contenu à venir (`decor`) plutôt
 * qu'une icône décorative : elle occupe la place que prendra la vraie donnée,
 * ce qui évite le trou au milieu de la page, et montre à quoi ressemblera
 * l'écran une fois rempli. Purement ornementale, elle est masquée aux lecteurs
 * d'écran.
 */
export default function EmptyState({
  title,
  description,
  action,
  decor,
  className = "",
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
  decor?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-dashed border-[var(--border)] ${className}`}
    >
      <div className="flex flex-col items-center gap-2 px-6 pb-6 pt-12 text-center">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="max-w-md text-xs leading-relaxed text-[var(--text-muted)]">{description}</p>
        {action && (
          <Link
            href={action.href}
            className="mt-3 rounded-lg border border-[var(--border-strong)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {action.label}
          </Link>
        )}
      </div>

      {/* La préfiguration vit SOUS le message, et non derrière : posée en fond,
          elle passait sous le bouton et donnait un chevauchement accidentel.
          Le masque la fait naître du texte plutôt que de s'arrêter net. */}
      {decor && (
        <div
          aria-hidden="true"
          className="pointer-events-none h-40 select-none opacity-20 [mask-image:linear-gradient(to_bottom,transparent,black_45%,black)]"
        >
          {decor}
        </div>
      )}
    </div>
  );
}

/**
 * Variante d'une colonne étroite : une ligne, sans préfiguration ni action.
 * Un cadre complet y prendrait toute la hauteur pour dire qu'il n'y a rien.
 */
export function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--text-muted)]">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Préfigurations                                                      */
/* ------------------------------------------------------------------ */

/**
 * Silhouette d'une page de statistiques : la courbe de rating et les barres
 * par map, telles qu'elles apparaîtront. Les valeurs sont figées et n'ont
 * aucun sens — l'opacité du parent les rend illisibles, c'est une texture.
 */
export function StatsDecor() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-5 px-8">
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-14 w-full">
        <polyline
          points="0,18 12,12 24,15 36,7 48,11 60,5 72,9 84,3 100,6"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex flex-col gap-2.5">
        {[72, 48, 61, 35].map((w, i) => (
          <span key={i} className="flex items-center gap-3">
            <span className="h-1.5 w-14 shrink-0 rounded-full bg-[var(--text-subtle)]" />
            <span className="h-1.5 flex-1 rounded-full bg-[var(--bg)]">
              <span
                className="block h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${w}%` }}
              />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Silhouette d'une liste : quelques lignes de carte, régulières. */
export function ListDecor({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2.5 px-8">
      {Array.from({ length: rows }, (_, i) => (
        <span
          key={i}
          className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5"
        >
          <span className="h-7 w-7 shrink-0 rounded-[6px] bg-[var(--text-subtle)]" />
          <span className="h-2 flex-1 rounded-full bg-[var(--text-subtle)]" />
          <span className="h-2 w-10 shrink-0 rounded-full bg-[var(--accent)]" />
        </span>
      ))}
    </div>
  );
}

/** Silhouette d'un effectif : cinq pastilles alignées. */
export function RosterDecor() {
  return (
    <div className="flex h-full w-full items-center justify-center gap-4">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="flex flex-col items-center gap-2">
          <span className="h-12 w-12 rounded-full bg-[var(--text-subtle)]" />
          <span className="h-1.5 w-10 rounded-full bg-[var(--text-subtle)]" />
        </span>
      ))}
    </div>
  );
}
