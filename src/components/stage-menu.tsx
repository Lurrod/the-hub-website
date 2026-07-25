"use client";

import { useState, type ReactNode } from "react";

type Stage = { key: string; label: string; content: ReactNode };

/** Sous-menu fonctionnel des étapes : chaque étape affiche son propre contenu. */
export default function StageMenu({ stages }: { stages: Stage[] }) {
  const [active, setActive] = useState(stages[0]?.key);
  const current = stages.find((s) => s.key === active) ?? stages[0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border)]">
        {stages.map((s) => {
          const on = s.key === active;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(s.key)}
              aria-selected={on}
              role="tab"
              className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                on
                  ? "border-[var(--accent)] text-white"
                  : "border-transparent text-[var(--text-muted)] hover:text-white"
              }`}
            >
              {s.label}
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
