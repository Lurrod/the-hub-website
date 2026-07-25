import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeam } from "@/lib/data/teams";
import { getTeamRoster, getTeamAlumni } from "@/lib/data/players";
import { getTeamRecentMatches, getTeamRecord } from "@/lib/data/matches";
import MatchRow from "@/components/match-row";
import SectionHeader from "@/components/section-header";

const ROLE_LABELS: Record<string, string> = {
  JOUEUR: "Joueur",
  SUB: "Remplaçant",
  COACH: "Coach",
  MANAGER: "Manager",
};

function BilanCell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "pos" | "neg";
}) {
  const color =
    tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "pos"
        ? "text-[var(--success)]"
        : tone === "neg"
          ? "text-[var(--text-muted)]"
          : "text-white";
  return (
    <div className="bg-[var(--surface)] px-4 py-3">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className={`stat mt-1 text-2xl ${color}`}>{value}</div>
    </div>
  );
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  const [roster, recent, alumni, record] = await Promise.all([
    getTeamRoster(team.id),
    getTeamRecentMatches(team.id),
    getTeamAlumni(team.id),
    getTeamRecord(team.id),
  ]);
  const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "…");

  const socials = (team.socials ?? {}) as Record<string, string | undefined>;
  const socialLinks = (
    [
      ["Twitter", socials.twitter],
      ["Twitch", socials.twitch],
      ["Site", socials.website],
    ] as [string, string | undefined][]
  ).filter((entry): entry is [string, string] => !!entry[1]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      {/* Hero d'identité */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {team.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="monogram grid h-20 w-20 shrink-0 place-items-center rounded-lg text-xl">
            {team.tag.slice(0, 3).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <span className="eyebrow mb-1.5">Équipe</span>
          <h1 className="text-2xl font-bold text-white">
            {team.name} <span className="text-[var(--text-muted)]">[{team.tag}]</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[var(--text-muted)]">
              {team.region}
            </span>
            <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[var(--text-muted)]">
              {team.status === "ACTIVE" ? "Actif" : "Inactif"}
            </span>
            {roster.length > 0 && (
              <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[var(--text-muted)]">
                <span className="stat">{roster.length}</span> joueurs
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bilan chiffré */}
      {record.played > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
          <BilanCell label="Matchs" value={`${record.played}`} />
          <BilanCell label="Victoires" value={`${record.wins}`} tone="accent" />
          <BilanCell label="Winrate" value={`${record.winrate}%`} />
          <BilanCell
            label="Diff. maps"
            value={record.mapDiff > 0 ? `+${record.mapDiff}` : `${record.mapDiff}`}
            tone={record.mapDiff > 0 ? "pos" : record.mapDiff < 0 ? "neg" : "default"}
          />
        </div>
      )}

      {team.description && (
        <p className="mt-6 whitespace-pre-line text-[var(--text)]">{team.description}</p>
      )}

      {socialLinks.length > 0 && (
        <div className="mt-4 flex gap-4 text-sm">
          {socialLinks.map(([label, href]) => (
            <a key={label} href={href} className="text-[var(--accent)]" target="_blank" rel="noreferrer">
              {label}
            </a>
          ))}
        </div>
      )}

      {/* Roster en cartes joueur */}
      <section className="mt-10">
        <SectionHeader eyebrow="Effectif" title="Roster" />
        {roster.length === 0 ? (
          <p className="text-[var(--text-muted)]">Aucun joueur enregistré pour cette équipe.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {roster.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/joueurs/${m.playerId}`}
                  className="card card-interactive flex items-center gap-3 p-3"
                >
                  {m.player.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.player.photo} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="monogram grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xs">
                      {m.player.pseudo.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">{m.player.pseudo}</div>
                    {m.player.realName && (
                      <div className="truncate text-xs text-[var(--text-muted)]">{m.player.realName}</div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {m.player.nationality && (
                      <span className="stat text-[10px] uppercase text-[var(--text-muted)]">
                        {m.player.nationality}
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-subtle)]">
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recent.length > 0 && (
        <section className="mt-10">
          <SectionHeader eyebrow="Forme" title="Résultats récents" />
          <div className="grid gap-2">
            {recent.map((m) => (
              <MatchRow
                key={m.id}
                match={{
                  id: m.id,
                  teamAId: m.teamAId,
                  teamBId: m.teamBId,
                  scoreA: m.scoreA,
                  scoreB: m.scoreB,
                  winnerId: m.winnerId,
                  status: m.status,
                  date: m.date,
                  bestOf: m.bestOf,
                  vodUrl: m.vodUrl,
                  teamA: m.teamA ? { name: m.teamA.name, tag: m.teamA.tag, logo: m.teamA.logo } : null,
                  teamB: m.teamB ? { name: m.teamB.name, tag: m.teamB.tag, logo: m.teamB.logo } : null,
                  contextLabel: m.tournament.name,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {alumni.length > 0 && (
        <section className="mt-10">
          <SectionHeader eyebrow="Historique" title="Anciens joueurs" />
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
            {alumni.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between p-3 text-sm transition-colors hover:bg-[var(--table-row-hover)]"
              >
                <Link href={`/joueurs/${m.playerId}`} className="text-white hover:text-[var(--accent)]">
                  {m.player.pseudo}
                </Link>
                <span className="text-[var(--text-muted)]">
                  {ROLE_LABELS[m.role] ?? m.role} ·{" "}
                  <span className="stat">
                    {fmtDate(m.joinDate)} → {fmtDate(m.leaveDate)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
