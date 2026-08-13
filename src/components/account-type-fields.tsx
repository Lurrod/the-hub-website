"use client";

import { useState } from "react";
import ProfileFields, { type ProfileFieldValues } from "@/components/profile-fields";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  hasValorantRole,
  requiresRiotId,
  type AccountTypeKey,
} from "@/lib/account-types";

const input =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--accent)]";
const lbl = "grid gap-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]";

/**
 * Choix du type de compte, et champs qui en dépendent.
 *
 * Le type pilote deux choses en direct : le Riot ID, exigé du seul joueur, et
 * le rôle Valorant, qui ne concerne que lui. C'est ce qui impose un composant
 * client — le formulaire doit se réagencer sans aller-retour serveur, sous
 * peine de faire perdre sa saisie à qui change d'avis.
 */
export default function AccountTypeFields({
  values,
  defaultType,
  withRiotId = false,
}: {
  values: ProfileFieldValues;
  defaultType: AccountTypeKey;
  /**
   * Affiche le champ Riot ID, obligatoire ou non selon le type retenu.
   *
   * Réservé à l'inscription : les paramètres passent par `RiotIdForm`, qui
   * gère un compte déjà lié et sa vérification. Le champ est rendu ici, et non
   * fourni par l'appelant, parce qu'une fonction n'est pas transmissible en
   * prop à un composant client.
   */
  withRiotId?: boolean;
}) {
  const [type, setType] = useState<AccountTypeKey>(defaultType);

  return (
    <>
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
          Type de compte
        </h2>

        <div className="grid gap-2 sm:grid-cols-3">
          {ACCOUNT_TYPES.map((t) => {
            const active = t === type;
            return (
              <label
                key={t}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="accountType"
                  value={t}
                  checked={active}
                  onChange={() => setType(t)}
                  className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
                {ACCOUNT_TYPE_LABELS[t]}
              </label>
            );
          })}
        </div>
      </section>

      {withRiotId && (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
            Compte Valorant
          </h2>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            {requiresRiotId(type)
              ? "Ton Riot ID sert à relier tes matchs et tes statistiques. On vérifie qu'il existe auprès de Riot."
              : "Facultatif pour ce type de compte. Si tu joues aussi, le renseigner reliera tes matchs et tes statistiques."}
          </p>
          <label className={lbl}>
            Riot ID
            {requiresRiotId(type) ? "" : " (facultatif)"}
            <input
              name="riotId"
              required={requiresRiotId(type)}
              placeholder="Nom#Tag (ex. Hub Player#EUW1)"
              className={input}
            />
          </label>
        </section>
      )}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
          Informations
        </h2>
        <div className="grid gap-4">
          <ProfileFields values={values} showValorantRole={hasValorantRole(type)} />
        </div>
      </section>
    </>
  );
}

export { input as accountFieldInput, lbl as accountFieldLabel };
