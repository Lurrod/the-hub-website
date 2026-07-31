import Link from "next/link";
import { REGIONS, TOURNAMENT_STATUSES, TOURNAMENT_STATUS_LABELS } from "@/lib/constants";

function buildHref(params: { region?: string; status?: string }): string {
  const sp = new URLSearchParams();
  if (params.region) sp.set("region", params.region);
  if (params.status) sp.set("status", params.status);
  const qs = sp.toString();
  return qs ? `/tournois?${qs}` : "/tournois";
}

export default function TournamentFilters({
  activeRegion,
  activeStatus,
}: {
  activeRegion?: string;
  activeStatus?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        <Link href={buildHref({ region: activeRegion })} className="chip" data-active={!activeStatus}>
          Tous statuts
        </Link>
        {TOURNAMENT_STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref({ region: activeRegion, status: s })}
            className="chip"
            data-active={activeStatus === s}
          >
            {TOURNAMENT_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Link href={buildHref({ status: activeStatus })} className="chip" data-active={!activeRegion}>
          Toutes régions
        </Link>
        {REGIONS.map((r) => (
          <Link
            key={r}
            href={buildHref({ region: r, status: activeStatus })}
            className="chip"
            data-active={activeRegion === r}
          >
            {r}
          </Link>
        ))}
      </div>
    </div>
  );
}
