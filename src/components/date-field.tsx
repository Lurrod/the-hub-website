"use client";

import { useEffect, useRef, useState } from "react";
import {
  WEEKDAYS_FR,
  fromFrDate,
  fromFrDateTime,
  initialMonth,
  joinDateTime,
  monthCells,
  monthTitle,
  shiftMonth,
  timePart,
  toFrDate,
  toFrDateTime,
  todayIso,
} from "@/lib/date-field";

/**
 * Champ de date avec calendrier maison.
 *
 * Le calendrier d'un `<input type="date">` est dessiné par le navigateur : ni
 * son fond clair, ni sa typographie ne peuvent suivre la charte, et son icône
 * reste illisible sur fond sombre. On garde donc la saisie au clavier — plus
 * rapide qu'un calendrier pour une date de naissance — dans un champ texte, et
 * on ouvre un calendrier habillé comme le reste du site.
 *
 * La valeur part dans un input caché, au format naïf « 2026-08-13 » (ou
 * « 2026-08-13T20:30 » avec l'heure) : exactement ce que produisait l'input
 * natif, donc rien à changer côté action serveur ni en base.
 */
export default function DateField({
  name,
  defaultValue = "",
  withTime = false,
  className = "",
  id,
}: {
  name: string;
  defaultValue?: string;
  /** Ajoute l'heure à la valeur et une saisie d'heure sous le calendrier. */
  withTime?: boolean;
  className?: string;
  id?: string;
}) {
  const format = withTime ? toFrDateTime : toFrDate;
  const parse = withTime ? fromFrDateTime : fromFrDate;

  const [value, setValue] = useState(defaultValue);
  const [text, setText] = useState(() => format(defaultValue));
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => initialMonth(defaultValue, todayIso()));
  const ref = useRef<HTMLDivElement>(null);

  const today = todayIso();
  const selectedDay = value.slice(0, 10);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onType = (next: string) => {
    setText(next);
    if (!next.trim()) {
      setValue("");
      return;
    }
    const parsed = parse(next);
    if (parsed) {
      setValue(parsed);
      setMonth(initialMonth(parsed, today));
    }
  };

  /* Une saisie qu'on n'a pas su lire ne doit pas rester à l'écran comme si elle
     comptait : le champ revient à la dernière valeur retenue. */
  const onBlur = () => setText(format(value));

  const pickDay = (iso: string) => {
    const next = withTime ? joinDateTime(iso, timePart(value)) : iso;
    setValue(next);
    setText(format(next));
    if (!withTime) setOpen(false);
  };

  const pickTime = (time: string) => {
    const next = joinDateTime(selectedDay || today, time);
    setValue(next);
    setText(format(next));
  };

  const clear = () => {
    setValue("");
    setText("");
    setOpen(false);
  };

  const openCalendar = () => {
    setMonth(initialMonth(value, today));
    setOpen((v) => !v);
  };

  const cells = monthCells(month.year, month.month);

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        onChange={(e) => onType(e.target.value)}
        onBlur={onBlur}
        placeholder={withTime ? "JJ/MM/AAAA HH:MM" : "JJ/MM/AAAA"}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={openCalendar}
        aria-label="Ouvrir le calendrier"
        aria-expanded={open}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/75 transition-colors hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[18px] w-[18px]"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Calendrier"
          /* `normal-case` : les libellés de formulaire du site sont en
             majuscules, et le calendrier en hériterait. */
          className="absolute z-40 mt-1 w-[266px] rounded-lg border border-[var(--border-strong)] bg-[var(--card)] p-3 normal-case tracking-normal shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <MonthButton label="Mois précédent" onClick={() => setMonth(shiftMonth(month, -1))}>
              <path d="m15 18-6-6 6-6" />
            </MonthButton>
            <span className="text-xs font-medium capitalize text-white">
              {monthTitle(month.year, month.month)}
            </span>
            <MonthButton label="Mois suivant" onClick={() => setMonth(shiftMonth(month, 1))}>
              <path d="m9 18 6-6-6-6" />
            </MonthButton>
          </div>

          <div className="grid grid-cols-7 gap-1 pb-1">
            {WEEKDAYS_FR.map((d) => (
              <span
                key={d}
                className="text-center text-[10px] uppercase tracking-wide text-[var(--text-subtle)]"
              >
                {d.slice(0, 1)}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((c) => {
              const selected = c.iso === selectedDay;
              const isToday = c.iso === today;
              return (
                <button
                  key={c.iso}
                  type="button"
                  onClick={() => pickDay(c.iso)}
                  aria-label={toFrDate(c.iso)}
                  aria-current={isToday ? "date" : undefined}
                  className={`h-8 rounded-md text-xs tabular-nums transition-colors ${
                    selected
                      ? "bg-[var(--accent)] font-medium"
                      : c.currentMonth
                        ? "text-white hover:bg-[var(--card-hover)]"
                        : "text-[var(--text-subtle)] hover:bg-[var(--card-hover)]"
                  } ${isToday && !selected ? "ring-1 ring-inset ring-[var(--accent)]" : ""}`}
                >
                  {c.day}
                </button>
              );
            })}
          </div>

          {withTime && (
            <label className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
              Heure
              <input
                type="time"
                value={timePart(value)}
                onChange={(e) => pickTime(e.target.value)}
                className="time-input rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-white transition-colors focus:border-[var(--accent)]"
              />
            </label>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
            <button
              type="button"
              onClick={() => pickDay(today)}
              className="text-xs text-[var(--text-muted)] transition-colors hover:text-white"
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={clear}
              className="text-xs text-[var(--text-muted)] transition-colors hover:text-white"
            >
              Effacer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-white"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
