import Link from "next/link";
import { REGIONS } from "@/lib/constants";

export default function RegionFilter({ active }: { active?: string }) {
  return (
    <div className="segment">
      <Link href="/equipes" className="segment-item" data-active={!active}>
        Toutes
      </Link>
      {REGIONS.map((r) => (
        <Link
          key={r}
          href={`/equipes?region=${encodeURIComponent(r)}`}
          className="segment-item"
          data-active={active === r}
        >
          {r}
        </Link>
      ))}
    </div>
  );
}
