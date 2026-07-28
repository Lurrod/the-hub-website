import Link from "next/link";
import Flag from "@/components/flag";

type PlayerCardData = {
  id: string;
  pseudo: string;
  nationality: string | null;
  photo: string | null;
};

export default function PlayerCard({ player }: { player: PlayerCardData }) {
  return (
    <Link
      href={`/joueurs/${player.id}`}
      className="card card-interactive flex items-center gap-3 p-3"
    >
      {player.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--surface)] text-xs text-[var(--text-muted)]">
          {player.pseudo.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div>
        <div className="font-medium text-white">{player.pseudo}</div>
        {player.nationality && (
          <div className="mt-0.5">
            <Flag country={player.nationality} />
          </div>
        )}
      </div>
    </Link>
  );
}
