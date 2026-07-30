import Link from "next/link";
import Flag from "@/components/flag";
import { agentIconUrl } from "@/lib/agents";
import { roleIconUrl, roleLabel } from "@/lib/roles";
import { computeAge, durationShort } from "@/lib/dates";

const MEMBERSHIP_LABELS: Record<string, string> = {
  JOUEUR: "Joueur",
  SUB: "Remplaçant",
  COACH: "Coach",
  MANAGER: "Manager",
};

export type TeamPlayerCardData = {
  id: string;
  pseudo: string;
  photo: string | null;
  nationality: string | null;
  valorantRole: string | null;
  birthdate: Date | null;
  /** Rôle dans l'effectif (JOUEUR, SUB, COACH…), affiché faute de rôle Valorant. */
  membershipRole: string;
  joinDate: Date | null;
  topAgents: string[];
};

/**
 * Carte autonome d'un joueur du roster : rôle en haut à gauche, photo au centre,
 * pseudo + nationalité, agents les plus joués, puis âge et ancienneté en pied.
 */
export default function TeamPlayerCard({ player }: { player: TeamPlayerCardData }) {
  const roleIcon = roleIconUrl(player.valorantRole);
  const roleName = roleLabel(player.valorantRole);
  const age = computeAge(player.birthdate);
  const since = durationShort(player.joinDate);

  return (
    <Link
      href={`/joueurs/${player.id}`}
      className="card card-interactive flex h-full flex-col gap-2.5 p-3"
    >
      {/* Le rôle flotte sur le coin haut gauche : la photo occupe tout le haut
          de la carte. L'icône porte le rôle à elle seule ; le libellé ne sert
          que pour le staff, qui n'a pas d'icône de rôle Valorant. */}
      <div className="relative">
        <div className="absolute left-0 top-0 z-10 flex items-center text-[10px] uppercase tracking-wide text-[var(--text-subtle)]">
          {roleIcon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={roleIcon} alt={roleName ?? ""} title={roleName} className="h-5 w-5" />
          ) : (
            <span>{MEMBERSHIP_LABELS[player.membershipRole] ?? player.membershipRole}</span>
          )}
        </div>

        {player.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo}
            alt=""
            className="mx-auto h-[120px] w-[120px] rounded-full object-cover"
          />
        ) : (
          <div className="monogram mx-auto grid h-[120px] w-[120px] place-items-center rounded-full text-2xl">
            {player.pseudo.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex min-w-0 items-center justify-center gap-1.5">
        {player.nationality && <Flag country={player.nationality} className="h-[12px] w-[16px]" />}
        <span className="truncate text-[16px] font-semibold text-white">{player.pseudo}</span>
      </div>

      {/* Hauteur réservée même sans stats : les cartes restent alignées. */}
      <div className="flex h-[43.2px] items-center justify-center gap-1">
        {player.topAgents.map((agent) => {
          const icon = agentIconUrl(agent);
          return icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={agent}
              src={icon}
              alt={agent}
              title={agent}
              className="h-[43.2px] w-[43.2px] rounded"
            />
          ) : null;
        })}
      </div>

      <div className="mt-auto flex items-start justify-around gap-2 pt-1">
        <div className="text-center">
          <div className="text-[10px] leading-tight text-[#9fa0a2]">Âge</div>
          <div className="stat text-[12px] leading-tight text-white">{age ?? "—"}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] leading-tight text-[#9fa0a2]">A rejoint</div>
          <div className="stat text-[12px] leading-tight text-white">{since ?? "—"}</div>
        </div>
      </div>
    </Link>
  );
}
