import Link from "next/link";
import Flag from "@/components/flag";
import { roleIconUrl, roleLabel } from "@/lib/roles";
import { durationShort } from "@/lib/dates";

export type LftPlayerCardData = {
  id: string;
  pseudo: string;
  photo: string | null;
  nationality: string | null;
  valorantRole: string | null;
  lftSince: Date | null;
  team: { name: string; tag: string } | null;
};

/**
 * Carte d'un joueur en recherche d'équipe. Un joueur déjà en équipe peut rester
 * LFT : sa carte porte alors le tag de son équipe, pour que le recruteur sache
 * à quoi s'en tenir.
 */
export default function LftCard({ player }: { player: LftPlayerCardData }) {
  const role = roleLabel(player.valorantRole);
  const roleIcon = roleIconUrl(player.valorantRole);
  const since = durationShort(player.lftSince);

  return (
    <Link
      href={`/joueurs/${player.id}`}
      className="card card-interactive flex flex-col gap-3 p-4"
    >
      <div className="flex items-center gap-3">
        {player.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photo} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
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
          {role && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              {roleIcon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={roleIcon} alt="" className="h-3.5 w-3.5 shrink-0 opacity-70" />
              )}
              {role}
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 text-xs">
        {player.team ? (
          <span className="truncate text-[var(--text-muted)]">
            Sous contrat - <span className="text-white">{player.team.tag}</span>
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">Sans équipe</span>
        )}
        {since && <span className="stat shrink-0 text-[var(--text-muted)]">LFT {since}</span>}
      </div>
    </Link>
  );
}
