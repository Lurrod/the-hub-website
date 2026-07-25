import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayer } from "@/lib/data/players";
import SectionHeader from "@/components/section-header";

const ROLE_LABELS: Record<string, string> = {
  JOUEUR: "Joueur",
  SUB: "Remplaçant",
  COACH: "Coach",
  MANAGER: "Manager",
};

function fmt(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : "…";
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) notFound();

  const current = player.memberships.find((m) => m.leaveDate === null);
  const socials = (player.socials ?? {}) as Record<string, string | undefined>;
  const socialLinks = (
    [
      ["Twitter", socials.twitter],
      ["Twitch", socials.twitch],
    ] as [string, string | undefined][]
  ).filter((entry): entry is [string, string] => !!entry[1]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {/* Hero d'identité */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {player.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photo} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="monogram grid h-20 w-20 shrink-0 place-items-center rounded-full text-xl">
            {player.pseudo.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <span className="eyebrow mb-1.5">Joueur</span>
          <h1 className="text-2xl font-bold text-white">{player.pseudo}</h1>
          {player.realName && (
            <p className="text-sm text-[var(--text-muted)]">{player.realName}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {player.nationality && (
              <span className="stat rounded-full border border-[var(--border)] px-2.5 py-0.5 uppercase text-[var(--text-muted)]">
                {player.nationality}
              </span>
            )}
            {player.memberships.length > 0 && (
              <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[var(--text-muted)]">
                <span className="stat">{player.memberships.length}</span> équipes
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Équipe actuelle mise en avant */}
      {current && (
        <Link
          href={`/equipes/${current.teamId}`}
          className="card card-interactive mt-6 flex items-center gap-3 p-4"
        >
          {current.team.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.team.logo} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="monogram grid h-12 w-12 shrink-0 place-items-center rounded-lg text-sm">
              {current.team.tag.slice(0, 3).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Équipe actuelle</div>
            <div className="truncate font-semibold text-white">{current.team.name}</div>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[var(--accent)]">
            {ROLE_LABELS[current.role] ?? current.role}
          </span>
        </Link>
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

      {/* Parcours */}
      <section className="mt-10">
        <SectionHeader eyebrow="Carrière" title="Parcours" />
        {player.memberships.length === 0 ? (
          <p className="text-[var(--text-muted)]">Aucune équipe enregistrée.</p>
        ) : (
          <ul className="grid gap-2">
            {player.memberships.map((m) => {
              const isCurrent = m.leaveDate === null;
              return (
                <li key={m.id}>
                  <Link
                    href={`/equipes/${m.teamId}`}
                    className="card card-interactive flex items-center gap-3 p-3"
                  >
                    {m.team.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.team.logo} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="monogram grid h-10 w-10 shrink-0 place-items-center rounded text-xs">
                        {m.team.tag.slice(0, 3).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-white">{m.team.name}</span>
                        {isCurrent && (
                          <span className="shrink-0 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                            Actuel
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">{ROLE_LABELS[m.role] ?? m.role}</div>
                    </div>
                    <span className="stat shrink-0 text-xs text-[var(--text-muted)]">
                      {fmt(m.joinDate)} → {m.leaveDate ? fmt(m.leaveDate) : "actuel"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
