"use client";

import { useState, type ReactNode } from "react";
import Segmented from "@/components/segmented";

type Tab = { key: string; label: string; content: ReactNode };

export default function TournamentTabs({
  header,
  tabs,
}: {
  header?: ReactNode;
  tabs: Tab[];
}) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      {/* Bandeau + barre d'onglets accrochée à son bas, dans un même bloc. */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]">
        {header}
        <div className="border-t border-[var(--border)] px-2">
          <Segmented activeKey={active ?? ""} variant="underline">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                aria-selected={t.key === active}
                role="tab"
                className="t-tab shrink-0"
              >
                {t.label}
              </button>
            ))}
          </Segmented>
        </div>
      </div>

      <div key={current?.key} className="mt-6 animate-in">
        {current?.content}
      </div>
    </div>
  );
}
