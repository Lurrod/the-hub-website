import Link from "next/link";
import { REGIONS } from "@/lib/constants";
import Segmented from "@/components/segmented";

export default function RegionFilter({ active }: { active?: string }) {
  return (
    <Segmented activeKey={active ?? "all"}>
      <Link href="/equipes" className="t-tab" role="tab" aria-selected={!active}>
        Toutes
      </Link>
      {REGIONS.map((r) => (
        <Link
          key={r}
          href={`/equipes?region=${encodeURIComponent(r)}`}
          className="t-tab"
          role="tab"
          aria-selected={active === r}
        >
          {r}
        </Link>
      ))}
    </Segmented>
  );
}
