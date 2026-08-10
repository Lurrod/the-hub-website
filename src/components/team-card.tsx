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
        <img
          loading="lazy"
          decoding="async"
          src={team.logo}
          alt=""
          className="h-10 w-10 rounded object-cover"
        />
      ) : (
        <div className="monogram grid h-10 w-10 place-items-center rounded text-xs">
          {team.tag.slice(0, 3).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate font-medium text-white">{team.name}</div>
      </div>
    </Link>
  );
}
