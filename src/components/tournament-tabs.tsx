"use client";

import { useState, type ReactNode } from "react";

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
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]">
        {header}
        <div className="flex flex-wrap gap-1 border-t border-[var(--border)] px-2">
          {tabs.map((t) => {
            const on = t.key === active;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                aria-selected={on}
                role="tab"
                className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  on
                    ? "border-[var(--accent)] text-white"
                    : "border-transparent text-[var(--text-muted)] hover:text-white"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div key={current?.key} className="mt-6 animate-in">
        {current?.content}
      </div>
    </div>
  );
}
