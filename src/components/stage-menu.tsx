"use client";

import { useState, type ReactNode } from "react";
import Segmented from "@/components/segmented";

type Stage = { key: string; label: string; content: ReactNode };

/** Sous-menu fonctionnel des étapes : chaque étape affiche son propre contenu. */
export default function StageMenu({ stages }: { stages: Stage[] }) {
  const [active, setActive] = useState(stages[0]?.key);
  const current = stages.find((s) => s.key === active) ?? stages[0];

  return (
    <div>
      <div className="mb-4 border-b border-[var(--border)]">
        <Segmented activeKey={active ?? ""} variant="underline">
          {stages.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(s.key)}
              aria-selected={s.key === active}
              role="tab"
              className="t-tab shrink-0"
            >
              {s.label}
            </button>
          ))}
        </Segmented>
      </div>
      <div key={current?.key} className="animate-in">
        {current?.content}
      </div>
    </div>
  );
}
