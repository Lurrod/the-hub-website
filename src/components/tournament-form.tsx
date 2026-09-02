"use client";

import DateField from "@/components/date-field";
import ErrorShake from "@/components/error-shake";
import { useState } from "react";
import {
  REGIONS,
  TOURNAMENT_FORMATS,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_FORMAT_DESCRIPTIONS,
  TOURNAMENT_STATUSES,
  TOURNAMENT_STATUS_LABELS,
  BEST_OF_OPTIONS,
  SEEDING_TYPES,
  SEEDING_TYPE_LABELS,
  formatUsesGroupSize,
  isPremierFormat,
  type TournamentFormat,
} from "@/lib/constants";
import ImageUpload from "@/components/image-upload";

type Socials = {
  twitter?: string | null;
  twitch?: string | null;
  youtube?: string | null;
  instagram?: string | null;
  discord?: string | null;
  website?: string | null;
} | null;

type TournamentFormValues = {
  name?: string;
  region?: string;
  format?: string;
  status?: string;
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  prizePool?: string;
  organizer?: string;
  description?: string;
  maxTeams?: number | string;
  groupSize?: number | string;
  bestOf?: number | string;
  seeding?: string;
  logo?: string | null;
  banner?: string | null;
  socials?: Socials;
};

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

export default function TournamentForm({
  action,
  values,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  values?: TournamentFormValues;
  submitLabel: string;
}) {
  const s = values?.socials ?? {};
  const [format, setFormat] = useState<TournamentFormat>(
    (values?.format as TournamentFormat) ?? TOURNAMENT_FORMATS[0]
  );
  const showGroupSize = formatUsesGroupSize(format);
  const [bestOf, setBestOf] = useState(String(values?.bestOf ?? ""));

  /**
   * Choisir un format Premier propose BO1 : c'est le Bo de tous les tours de
   * playoffs Premier sauf la finale (Bo3), posé à la création d'un match
   * puisque le round n'y est pas encore connu. On ne le pose que sur un champ
   * vide : une valeur déjà saisie est un choix de l'organisateur, pas un
   * défaut à écraser.
   */
  function chooseFormat(next: TournamentFormat) {
    setFormat(next);
    if (bestOf === "" && isPremierFormat(next)) {
      setBestOf("1");
    }
  }

  return (
    <form action={action} className="grid gap-6">
      <Section title="Identité">
        <ErrorShake codes={["empty"]}>
          <label className={lbl}>
            Nom du tournoi
            <input
              name="name"
              defaultValue={values?.name ?? ""}
              required
              className={`t-input ${input}`}
            />
          </label>
        </ErrorShake>
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
            Organisateur (optionnel)
            <input name="organizer" defaultValue={values?.organizer ?? ""} className={input} />
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
      </Section>

      <Section title="Format de compétition">
        <input type="hidden" name="format" value={format} />
        <div className="grid gap-2 sm:grid-cols-2">
          {TOURNAMENT_FORMATS.map((f) => {
            const active = format === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => chooseFormat(f)}
                aria-pressed={active}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div
                  className={`text-sm font-semibold ${active ? "text-white" : "text-[var(--text)]"}`}
                >
                  {TOURNAMENT_FORMAT_LABELS[f]}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {TOURNAMENT_FORMAT_DESCRIPTIONS[f]}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Le format que vous cherchez n&apos;est pas dans la liste ? Contactez un administrateur
          pour qu&apos;on l&apos;ajoute.
        </p>
      </Section>

      <Section title="Configuration">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={lbl}>
            Limite d&apos;équipes
            <input
              type="number"
              min={2}
              name="maxTeams"
              defaultValue={values?.maxTeams ?? ""}
              placeholder="ex. 16"
              className={input}
            />
            <span className="mt-1 block text-[10px] font-normal text-[var(--text-muted)]">
              Nombre maximum d&apos;équipes inscrites. Laisser vide = pas de limite.
            </span>
          </label>
          {showGroupSize && (
            <label className={lbl}>
              Taille des poules
              <input
                type="number"
                min={2}
                name="groupSize"
                defaultValue={values?.groupSize ?? ""}
                placeholder="ex. 4"
                className={input}
              />
            </label>
          )}
          <label className={lbl}>
            Format des matchs
            <select
              name="bestOf"
              value={bestOf}
              onChange={(e) => setBestOf(e.target.value)}
              className={input}
            >
              <option value="">Non défini</option>
              {BEST_OF_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  BO{b}
                </option>
              ))}
            </select>
          </label>
          <ErrorShake codes={["seedtaken"]}>
            <label className={lbl}>
              Seeding
              <select
                name="seeding"
                defaultValue={values?.seeding ?? ""}
                className={`t-input ${input}`}
              >
                <option value="">Non défini</option>
                {SEEDING_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {SEEDING_TYPE_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </ErrorShake>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={lbl}>
            Date de début
            <DateField name="startDate" defaultValue={values?.startDate ?? ""} className={input} />
          </label>
          <label className={lbl}>
            Date de fin
            <DateField name="endDate" defaultValue={values?.endDate ?? ""} className={input} />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={lbl}>
            Cash prize (optionnel)
            <input
              name="prizePool"
              defaultValue={values?.prizePool ?? ""}
              placeholder="ex. 500 €"
              className={input}
            />
          </label>
          <label className={lbl}>
            Statut
            <select name="status" defaultValue={values?.status ?? "UPCOMING"} className={input}>
              {TOURNAMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TOURNAMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      <Section title="Réseaux sociaux">
        <p className="text-xs text-[var(--text-muted)]">
          Affichés sur la page publique du tournoi. Le lien Discord est celui que les équipes
          utiliseront pour vous joindre.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ErrorShake codes={["invalid"]}>
            <label className={lbl}>
              Discord
              <input
                name="discord"
                type="url"
                placeholder="https://discord.gg/…"
                defaultValue={s?.discord ?? ""}
                className={`t-input ${input}`}
              />
            </label>
          </ErrorShake>
          <label className={lbl}>
            Twitter / X
            <input
              name="twitter"
              type="url"
              placeholder="https://x.com/…"
              defaultValue={s?.twitter ?? ""}
              className={input}
            />
          </label>
          <label className={lbl}>
            Twitch
            <input
              name="twitch"
              type="url"
              placeholder="https://twitch.tv/…"
              defaultValue={s?.twitch ?? ""}
              className={input}
            />
          </label>
          <label className={lbl}>
            YouTube
            <input
              name="youtube"
              type="url"
              placeholder="https://youtube.com/…"
              defaultValue={s?.youtube ?? ""}
              className={input}
            />
          </label>
          <label className={lbl}>
            Instagram
            <input
              name="instagram"
              type="url"
              placeholder="https://instagram.com/…"
              defaultValue={s?.instagram ?? ""}
              className={input}
            />
          </label>
          <label className={lbl}>
            Site web
            <input
              name="website"
              type="url"
              placeholder="https://…"
              defaultValue={s?.website ?? ""}
              className={input}
            />
          </label>
        </div>
      </Section>

      <Section title="Visuels">
        <div className={lbl}>
          Logo carré (png/jpg/webp, max 5 Mo)
          <ImageUpload name="logo" shape="square" currentUrl={values?.logo ?? null} />
        </div>
        <div className={lbl}>
          Bannière large (png/jpg/webp, max 5 Mo)
          <ImageUpload name="banner" shape="wide" currentUrl={values?.banner ?? null} />
        </div>
      </Section>

      <button className="justify-self-start rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90">
        {submitLabel}
      </button>
    </form>
  );
}
