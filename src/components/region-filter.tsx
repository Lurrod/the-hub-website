import Link from "next/link";
import { REGIONS } from "@/lib/constants";

export default function RegionFilter({ active }: { active?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/equipes" className="chip" data-active={!active}>
        Toutes
      </Link>
      {REGIONS.map((r) => (
        <Link
          key={r}
          href={`/equipes?region=${encodeURIComponent(r)}`}
          className="chip"
          data-active={active === r}
        >
          {r}
        </Link>
      ))}
    </div>
  );
}
