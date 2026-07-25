import Link from "next/link";

type TeamCardData = {
  id: string;
  name: string;
  tag: string;
  region: string;
  logo: string | null;
};

export default function TeamCard({ team }: { team: TeamCardData }) {
  return (
    <Link
      href={`/equipes/${team.id}`}
      className="card card-interactive flex items-center gap-3 p-3"
    >
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt="" className="h-10 w-10 rounded object-cover" />
      ) : (
        <div className="monogram grid h-10 w-10 place-items-center rounded text-xs">
          {team.tag.slice(0, 3).toUpperCase()}
        </div>
      )}
      <div>
        <div className="font-medium text-white">{team.name}</div>
        <div className="text-xs text-[var(--text-muted)]">
          {team.tag} · {team.region}
        </div>
      </div>
    </Link>
  );
}
