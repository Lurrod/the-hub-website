import Link from "next/link";
import Flag from "@/components/flag";
import { agentIconUrl } from "@/lib/agents";
import { roleIconUrl, roleLabel } from "@/lib/roles";
import { computeAge, durationSince } from "@/lib/dates";

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
  const role =
    roleLabel(player.valorantRole) ??
    MEMBERSHIP_LABELS[player.membershipRole] ??
    player.membershipRole;
  const age = computeAge(player.birthdate);
  const since = durationSince(player.joinDate);

  return (
    <Link
      href={`/joueurs/${player.id}`}
      className="card card-interactive flex h-full flex-col gap-3 p-3"
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--text-subtle)]">
        {roleIcon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={roleIcon} alt="" className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate">{role}</span>
      </div>

      {player.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.photo}
          alt=""
          className="mx-auto h-16 w-16 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="monogram mx-auto grid h-16 w-16 shrink-0 place-items-center rounded-full text-base">
          {player.pseudo.slice(0, 2).toUpperCase()}
        </div>
      )}

      <div className="flex min-w-0 items-center justify-center gap-1.5">
        <span className="truncate font-semibold text-white">{player.pseudo}</span>
        {player.nationality && <Flag country={player.nationality} className="h-3 w-4" />}
      </div>

      {/* Hauteur réservée même sans stats : les cartes restent alignées. */}
      <div className="flex h-6 items-center justify-center gap-1.5">
        {player.topAgents.map((agent) => {
          const icon = agentIconUrl(agent);
          return icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={agent} src={icon} alt={agent} title={agent} className="h-6 w-6 rounded" />
          ) : null;
        })}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2 text-[10px] text-[var(--text-muted)]">
        <span className="stat">{age != null ? `${age} ans` : "—"}</span>
        <span className="truncate">
          {player.joinDate
            ? `Arrivé ${new Date(player.joinDate).toLocaleDateString("fr-FR", {
                month: "2-digit",
                year: "numeric",
              })}${since ? ` · ${since}` : ""}`
            : "—"}
        </span>
      </div>
    </Link>
  );
}
