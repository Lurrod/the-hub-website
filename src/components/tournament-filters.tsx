import Link from "next/link";
import { REGIONS, TOURNAMENT_STATUSES, TOURNAMENT_STATUS_LABELS } from "@/lib/constants";
import Segmented from "@/components/segmented";

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
      <Segmented activeKey={activeStatus ?? "all"}>
        <Link
          href={buildHref({ region: activeRegion })}
          className="t-tab"
          role="tab"
          aria-selected={!activeStatus}
        >
          Tous statuts
        </Link>
        {TOURNAMENT_STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref({ region: activeRegion, status: s })}
            className="t-tab"
            role="tab"
            aria-selected={activeStatus === s}
          >
            {TOURNAMENT_STATUS_LABELS[s]}
          </Link>
        ))}
      </Segmented>
      <Segmented activeKey={activeRegion ?? "all"}>
        <Link
          href={buildHref({ status: activeStatus })}
          className="t-tab"
          role="tab"
          aria-selected={!activeRegion}
        >
          Toutes régions
        </Link>
        {REGIONS.map((r) => (
          <Link
            key={r}
            href={buildHref({ region: r, status: activeStatus })}
            className="t-tab"
            role="tab"
            aria-selected={activeRegion === r}
          >
            {r}
          </Link>
        ))}
      </Segmented>
    </div>
  );
}
