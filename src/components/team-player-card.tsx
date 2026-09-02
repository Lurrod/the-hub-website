import Link from "next/link";
import Flag from "@/components/flag";
import { agentIconUrl } from "@/lib/agents";
import { roleIconUrl, roleLabel } from "@/lib/roles";
import MembershipRoleIcon from "@/components/membership-role-icon";
import { hasOwnIcon, MEMBERSHIP_ROLE_LABELS, type MembershipRoleKey } from "@/lib/membership-roles";
import { computeAge, durationShort } from "@/lib/dates";
import { fichePath } from "@/lib/slug";

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
      href={fichePath("joueurs", player.id, player.pseudo)}
      className="card card-interactive relative flex h-full flex-col p-3"
    >
      {/* Le rôle flotte sur le coin haut gauche : la photo occupe tout le haut
          de la carte.

          L'encadrement et les remplaçants ont leur propre pictogramme, qui
          prend la place du rôle Valorant : sur un roster, savoir qu'un membre
          est sur le banc prime sur son poste. Le titre reste porté par
          l'attribut `title`, pour qui survole. */}
      <div className="absolute left-3 top-3 z-10 flex items-center uppercase tracking-wide text-[var(--text-subtle)] tp-label">
        {hasOwnIcon(player.membershipRole) ? (
          <MembershipRoleIcon role={player.membershipRole} />
        ) : roleIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            loading="lazy"
            decoding="async"
            src={roleIcon}
            alt={roleName ?? ""}
            title={roleName}
            className="h-5 w-5"
          />
        ) : (
          <span>{MEMBERSHIP_ROLE_LABELS[player.membershipRole as MembershipRoleKey]}</span>
        )}
      </div>

      {/* my-auto : sans agents (staff), la photo et le pseudo se recentrent au
          lieu de laisser un trou au-dessus du pied de carte. */}
      <div className="my-auto flex flex-col gap-2.5">
        {player.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            loading="lazy"
            decoding="async"
            src={player.photo}
            alt=""
            className="mx-auto h-[120px] w-[120px] rounded-full object-cover"
          />
        ) : (
          <div className="monogram mx-auto grid h-[120px] w-[120px] place-items-center rounded-full">
            {player.pseudo.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex min-w-0 items-center justify-center gap-1.5">
          {player.nationality && (
            <Flag country={player.nationality} className="h-[12px] w-[16px]" />
          )}
          <span className="truncate font-semibold text-white tp-name">{player.pseudo}</span>
        </div>

        {player.topAgents.length > 0 && (
          <div className="flex h-[43.2px] items-center justify-center gap-1">
            {player.topAgents.map((agent) => {
              const icon = agentIconUrl(agent);
              return icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  loading="lazy"
                  decoding="async"
                  key={agent}
                  src={icon}
                  alt={agent}
                  title={agent}
                  className="h-[43.2px] w-[43.2px] rounded"
                />
              ) : null;
            })}
          </div>
        )}
      </div>

      <div className="flex items-start justify-around gap-2 pt-2.5">
        <div className="text-center">
          <div className="leading-tight text-[var(--text-muted)] tp-label">Âge</div>
          <div className="stat leading-tight text-white tp-value">{age ?? "—"}</div>
        </div>
        <div className="text-center">
          <div className="leading-tight text-[var(--text-muted)] tp-label">A rejoint</div>
          <div className="stat leading-tight text-white tp-value">{since ?? "—"}</div>
        </div>
      </div>
    </Link>
  );
}
