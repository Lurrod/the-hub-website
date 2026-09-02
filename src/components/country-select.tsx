"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES } from "@/lib/constants";
import { countryCode } from "@/lib/countries";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function FlagImg({ country, className = "" }: { country: string; className?: string }) {
  const code = countryCode(country);
  if (!code) return <span className={`inline-block h-[13px] w-5 shrink-0 ${className}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/24x18/${code}.png`}
      srcSet={`https://flagcdn.com/48x36/${code}.png 2x`}
      width={24}
      height={18}
      alt=""
      className={`inline-block h-[13px] w-auto shrink-0 rounded-[2px] object-cover ${className}`}
      loading="lazy"
    />
  );
}

/**
 * Sélecteur de pays avec barre de recherche. Soumet la valeur via un input caché
 * `name`, donc utilisable dans n'importe quel <form action={...}>.
 */
export default function CountrySelect({
  name,
  defaultValue = "",
  placeholder = "Sélectionner un pays",
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
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

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    const list = q ? COUNTRIES.filter((c) => norm(c).includes(q)) : COUNTRIES;
    return list.slice(0, 60);
  }, [query]);

  const select = (c: string) => {
    setValue(c);
    setOpen(false);
    setQuery("");
  };

  const input =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white transition-colors focus:border-[var(--accent)]";

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-2 ${input} ${value ? "" : "text-[var(--text-muted)]"}`}
      >
        {value ? (
          <>
            <FlagImg country={value} />
            <span className="truncate text-white">{value}</span>
          </>
        ) : (
          <span className="truncate">{placeholder}</span>
        )}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-auto h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--card)] shadow-xl">
          <div className="p-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un pays…"
              aria-label="Rechercher un pays"
              className={input}
            />
          </div>
          <ul className="max-h-64 overflow-y-auto pb-1">
            <li>
              <button
                type="button"
                onClick={() => select("")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--card-hover)]"
              >
                - Aucun
              </button>
            </li>
            {filtered.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => select(c)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--card-hover)] ${
                    c === value ? "text-[var(--accent)]" : "text-white"
                  }`}
                >
                  <FlagImg country={c} />
                  <span className="truncate">{c}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-[var(--text-muted)]">Aucun résultat.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
