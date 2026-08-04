import Link from "next/link";

type Player = { id: string; pseudo: string };
type P = {
  teamId: string;
  name: string;
  logo: string | null;
  players: Player[];
};

/** Carte équipe ~160×160 : logo + nom (fixe). Au survol, le logo laisse place
    aux 5 joueurs cliquables ; le nom reste en place en dessous. */
export default function ParticipantCard({ p }: { p: P }) {
  return (
    // Deux cartes par ligne en mobile : à 160 px fixes, la seconde ne tenait pas
    // dans les ~326 px utiles et chaque carte occupait sa propre ligne, laissant
    // une colonne vide. Largeur figée à partir de `sm`, comme avant.
    <div className="card group relative flex h-40 w-[calc(50%-0.375rem)] max-w-40 flex-col items-center bg-[#242832] p-3 text-center sm:w-40">
      <div className="relative flex w-full flex-1 items-center justify-center">
        <Link href={`/equipes/${p.teamId}`} aria-label={p.name}>
          {p.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" decoding="async" src={p.logo} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-lg bg-[var(--surface)] text-sm text-[var(--text-muted)]">
              {p.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </Link>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded bg-[#242832]/95 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100">
          {p.players.length > 0 ? (
            p.players.map((pl) => (
              <Link
                key={pl.id}
                href={`/joueurs/${pl.id}`}
                className="max-w-full truncate px-1 text-xs text-white transition-colors hover:text-[var(--accent)]"
              >
                {pl.pseudo}
              </Link>
            ))
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Roster à venir</span>
          )}
        </div>
      </div>

      <Link
        href={`/equipes/${p.teamId}`}
        className="mt-2 line-clamp-1 w-full text-sm font-medium text-white transition-colors hover:text-[var(--accent)]"
      >
        {p.name}
      </Link>
    </div>
  );
}
