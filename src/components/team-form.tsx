"use client";

import ErrorShake from "@/components/error-shake";
import { useState } from "react";
import { REGIONS } from "@/lib/constants";
import ImageUpload from "@/components/image-upload";

type Socials = {
  twitter?: string | null;
  twitch?: string | null;
  youtube?: string | null;
  instagram?: string | null;
  discord?: string | null;
  website?: string | null;
} | null;

type TeamFormValues = {
  name?: string;
  tag?: string;
  region?: string;
  description?: string;
  status?: string;
  logo?: string | null;
  socials?: Socials;
};

const ROSTER_ROLES = [
  { value: "JOUEUR", label: "Joueur" },
  { value: "SUB", label: "Remplaçant" },
  { value: "COACH", label: "Coach" },
  { value: "MANAGER", label: "Manager" },
] as const;

const input =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white transition-colors focus:border-[var(--accent)]";
const lbl = "grid gap-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
        {title}
      </h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

type RosterRow = { key: number; pseudo: string; role: string };

export default function TeamForm({
  action,
  values,
  submitLabel,
  allowRoster = false,
}: {
  action: (formData: FormData) => void;
  values?: TeamFormValues;
  submitLabel: string;
  allowRoster?: boolean;
}) {
  const s = values?.socials ?? {};
  const [rows, setRows] = useState<RosterRow[]>([{ key: 0, pseudo: "", role: "JOUEUR" }]);
  const [nextKey, setNextKey] = useState(1);

  const addRow = () => {
    setRows((r) => [...r, { key: nextKey, pseudo: "", role: "JOUEUR" }]);
    setNextKey((k) => k + 1);
  };
  const removeRow = (key: number) => setRows((r) => r.filter((x) => x.key !== key));
  const updateRow = (key: number, patch: Partial<RosterRow>) =>
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  return (
    <form action={action} className="grid gap-6">
      <Section title="Identité">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <ErrorShake codes={["empty"]}>
            <label className={lbl}>
              Nom de l&apos;équipe
              <input
                name="name"
                defaultValue={values?.name ?? ""}
                required
                className={`t-input ${input}`}
              />
            </label>
          </ErrorShake>
          <label className={lbl}>
            Tag
            <input
              name="tag"
              defaultValue={values?.tag ?? ""}
              required
              maxLength={8}
              className={`${input} sm:w-28`}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={lbl}>
            Région
            <select name="region" defaultValue={values?.region ?? REGIONS[0]} className={input}>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className={lbl}>
            Statut
            <select name="status" defaultValue={values?.status ?? "ACTIVE"} className={input}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
        </div>
        <label className={lbl}>
          Description
          <textarea
            name="description"
            defaultValue={values?.description ?? ""}
            rows={4}
            className={input}
          />
        </label>
        <div className={lbl}>
          Logo (png/jpg/webp, max 5 Mo)
          <ImageUpload
            name="logo"
            label="Logo de l'équipe"
            shape="square"
            currentUrl={values?.logo ?? null}
          />
        </div>
      </Section>

      <Section title="Réseaux sociaux">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={lbl}>
            Twitter / X
            <input
              name="twitter"
              placeholder="https://x.com/…"
              defaultValue={s?.twitter ?? ""}
              className={input}
            />
          </label>
          <label className={lbl}>
            Twitch
            <input
              name="twitch"
              placeholder="https://twitch.tv/…"
              defaultValue={s?.twitch ?? ""}
              className={input}
            />
          </label>
          <label className={lbl}>
            YouTube
            <input
              name="youtube"
              placeholder="https://youtube.com/…"
              defaultValue={s?.youtube ?? ""}
              className={input}
            />
          </label>
          <label className={lbl}>
            Instagram
            <input
              name="instagram"
              placeholder="https://instagram.com/…"
              defaultValue={s?.instagram ?? ""}
              className={input}
            />
          </label>
          <label className={lbl}>
            Discord
            <input
              name="discord"
              placeholder="https://discord.gg/…"
              defaultValue={s?.discord ?? ""}
              className={input}
            />
          </label>
          <label className={lbl}>
            Site web
            <input
              name="website"
              placeholder="https://…"
              defaultValue={s?.website ?? ""}
              className={input}
            />
          </label>
        </div>
      </Section>

      {allowRoster && (
        <Section title="Roster initial (optionnel)">
          <p className="text-xs text-[var(--text-muted)]">
            Ajoute des joueurs dès la création. De nouveaux profils joueurs seront créés et
            rattachés à l&apos;équipe.
          </p>
          <div className="grid gap-2">
            {rows.map((row) => (
              <div key={row.key} className="grid grid-cols-[1fr_auto_auto] gap-2">
                <input
                  name="rosterPseudo"
                  value={row.pseudo}
                  onChange={(e) => updateRow(row.key, { pseudo: e.target.value })}
                  placeholder="Pseudo du joueur"
                  className={input}
                />
                <select
                  name="rosterRole"
                  value={row.role}
                  onChange={(e) => updateRow(row.key, { role: e.target.value })}
                  className={`${input} w-36`}
                >
                  {ROSTER_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-muted)] transition-colors hover:border-[var(--destructive)] hover:text-[var(--destructive)]"
                  aria-label="Retirer ce joueur"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addRow}
            className="justify-self-start rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-white"
          >
            + Ajouter un joueur
          </button>
        </Section>
      )}

      <button className="justify-self-start rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90">
        {submitLabel}
      </button>
    </form>
  );
}
