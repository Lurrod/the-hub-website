import Link from "next/link";

type P = {
  teamId: string;
  name: string;
  logo: string | null;
  players: string[];
};

/** Carte équipe ~160×160 : logo + nom, roster révélé au survol. */
export default function ParticipantCard({ p }: { p: P }) {
  return (
    <Link
      href={`/equipes/${p.teamId}`}
      className="card group relative flex h-40 w-40 flex-col items-center justify-center gap-3 overflow-hidden p-3 text-center transition-colors hover:border-[var(--border-strong)]"
    >
      {p.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.logo} alt="" className="h-16 w-16 rounded-lg object-cover" />
      ) : (
        <div className="grid h-16 w-16 place-items-center rounded-lg bg-[var(--surface)] text-sm text-[var(--text-muted)]">
          {p.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="line-clamp-2 text-sm font-medium text-white">{p.name}</span>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[var(--card)]/95 px-3 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100">
        <span className="mb-1 text-xs font-semibold text-[var(--accent)]">{p.name}</span>
        {p.players.length > 0 ? (
          p.players.map((pl) => (
            <span key={pl} className="max-w-full truncate text-xs text-white">
              {pl}
            </span>
          ))
        ) : (
          <span className="text-xs text-[var(--text-muted)]">Roster à venir</span>
        )}
      </div>
    </Link>
  );
}
