import Link from "next/link";
import Flag from "@/components/flag";
import { roleIconUrl, roleLabel } from "@/lib/roles";
import MembershipRoleIcon from "@/components/membership-role-icon";
import { ACCOUNT_TYPE_LABELS, type AccountTypeKey } from "@/lib/account-types";
import { fichePath } from "@/lib/slug";

export type LftPlayerCardData = {
  id: string;
  pseudo: string;
  photo: string | null;
  nationality: string | null;
  valorantRole: string | null;
  accountType: string;
};

/** Carte d'un membre en recherche d'équipe : joueur, coach ou manager. */
export default function LftCard({ player }: { player: LftPlayerCardData }) {
  const type = player.accountType as AccountTypeKey;
  // Un coach ou un manager n'a pas de rôle Valorant : c'est son type de compte
  // qui dit ce qu'il vient chercher, et il prend la place de la ligne de rôle.
  const staff = type !== "JOUEUR";
  const role = roleLabel(player.valorantRole);
  const roleIcon = roleIconUrl(player.valorantRole);

  return (
    <Link
      href={fichePath("joueurs", player.id, player.pseudo)}
      className="card card-interactive flex items-center gap-3 bg-[var(--card-hover)] p-4"
    >
      {player.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          loading="lazy"
          decoding="async"
          src={player.photo}
          alt=""
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-xs text-[var(--text-muted)]">
          {player.pseudo.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium text-white">{player.pseudo}</span>
          <Flag country={player.nationality} />
        </div>
        {staff ? (
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <MembershipRoleIcon role={type} className="h-3.5 w-3.5 shrink-0 opacity-70" />
            {ACCOUNT_TYPE_LABELS[type]}
          </div>
        ) : (
          role && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              {roleIcon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  loading="lazy"
                  decoding="async"
                  src={roleIcon}
                  alt=""
                  className="h-3.5 w-3.5 shrink-0 opacity-70"
                />
              )}
              {role}
            </div>
          )
        )}
      </div>
    </Link>
  );
}
