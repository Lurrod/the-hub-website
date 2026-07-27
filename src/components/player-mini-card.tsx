import Link from "next/link";
import Flag from "@/components/flag";

export type MiniPlayer = {
  id: string;
  pseudo: string;
  photo: string | null;
  nationality: string | null;
  teamTag: string | null;
  rating: number;
};

/** Carte joueur compacte pour la landing (joueurs à suivre). */
export default function PlayerMiniCard({ player }: { player: MiniPlayer }) {
  return (
    <Link href={`/joueurs/${player.id}`} className="card card-interactive flex items-center gap-3 p-3">
      {player.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.photo} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="monogram grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs">
          {player.pseudo.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {player.nationality && <Flag country={player.nationality} className="h-3 w-4" />}
          <span className="truncate font-semibold text-white">{player.pseudo}</span>
        </div>
        <div className="text-xs text-[var(--text-muted)]">{player.teamTag ?? "Sans équipe"}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="stat text-lg font-bold text-[var(--accent)]">{player.rating.toFixed(2)}</div>
        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Rating</div>
      </div>
    </Link>
  );
}
