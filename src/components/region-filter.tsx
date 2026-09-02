import Link from "next/link";
import { REGIONS } from "@/lib/constants";
import Segmented from "@/components/segmented";

export default function RegionFilter({ active }: { active?: string }) {
  return (
    <Segmented nav="Filtrer par région" activeKey={active ?? "all"}>
      <Link href="/equipes" className="t-tab" aria-current={!active ? "page" : undefined}>
        Toutes
      </Link>
      {REGIONS.map((r) => (
        <Link
          key={r}
          href={`/equipes?region=${encodeURIComponent(r)}`}
          className="t-tab"
          aria-current={active === r ? "page" : undefined}
        >
          {r}
        </Link>
      ))}
    </Segmented>
  );
}
