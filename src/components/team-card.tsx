import Link from "next/link";
import Image from "next/image";
import { fichePath } from "@/lib/slug";

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
      href={fichePath("equipes", team.id, team.name)}
      className="card card-interactive flex items-center gap-3 p-3"
    >
      {team.logo ? (
        <Image
          src={team.logo}
          width={40}
          height={40}
          alt={`Logo ${team.name}`}
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
