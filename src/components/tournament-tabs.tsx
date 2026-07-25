"use client";

import { useState, type ReactNode } from "react";

type Tab = { key: string; label: string; content: ReactNode };

export default function TournamentTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--border)]">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              aria-selected={on}
              role="tab"
              className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
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
      <div key={current?.key} className="animate-in">
        {current?.content}
      </div>
    </div>
  );
}
