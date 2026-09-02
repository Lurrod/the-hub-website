"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ERROR_MESSAGES } from "@/lib/flash-messages";

/**
 * Désigne le champ fautif après un retour `?error=<code>`. Sans lui, l'erreur
 * ne remonte que par le toast et rien ne dit QUEL champ corriger.
 *
 * Snippet `12-error-state-shake` : `.is-error` et `.is-shaking` sont tenues
 * distinctes, la secousse se rejoue par retrait -> reflow -> ajout.
 */
export default function ErrorShake({
  codes,
  children,
}: {
  /** Codes de `ERROR_MESSAGES` qui concernent ce champ. */
  codes: readonly string[];
  children: ReactNode;
}) {
  const params = useSearchParams();
  const code = params.get("error");
  const matched = code !== null && codes.includes(code);
  const [errored, setErrored] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const messageId = useId();
  const revertTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!matched) return;
    const wrap = wrapRef.current;
    const field = wrap?.querySelector<HTMLElement>(".t-input");
    if (!wrap || !field) return;

    const cs = getComputedStyle(document.documentElement);
    const ms = (name: string, fb: number) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fb;
    };

    setErrored(true);
    field.classList.add("is-error");
    field.classList.remove("is-shaking");
    void field.offsetWidth; // reflow : sans lui la secousse ne rejoue pas
    field.classList.add("is-shaking");

    const shakeMs = ms("--shake-dur-a", 80) * 2 + ms("--shake-dur-b", 60) * 2;
    const stop = window.setTimeout(() => field.classList.remove("is-shaking"), shakeMs + 20);

    if (revertTimer.current) window.clearTimeout(revertTimer.current);
    const clearError = () => {
      setErrored(false);
      field.classList.remove("is-error");
      wrap.querySelector("input, textarea, select")?.removeAttribute("aria-invalid");
    };
    revertTimer.current = window.setTimeout(clearError, shakeMs + ms("--revert-hold", 3000));

    // Corriger le champ éteint l'erreur : inutile de secouer une valeur que
    // l'utilisateur est déjà en train de reprendre.
    const onInput = () => {
      if (revertTimer.current) window.clearTimeout(revertTimer.current);
      clearError();
    };
    const inputEl = wrap.querySelector("input, textarea, select");
    inputEl?.addEventListener("input", onInput);

    // Rattache le message au champ. `role="alert"` seul ne l'annonce qu'à son
    // apparition : qui revient sur le champ par tabulation ne l'entend plus, et
    // rien ne dit que la valeur est invalide. L'état d'erreur ne reposait que
    // sur une couleur et une secousse — WCAG 1.4.1 et 3.3.1.
    inputEl?.setAttribute("aria-invalid", "true");
    inputEl?.setAttribute("aria-describedby", messageId);

    return () => {
      window.clearTimeout(stop);
      if (revertTimer.current) window.clearTimeout(revertTimer.current);
      inputEl?.removeEventListener("input", onInput);
      inputEl?.removeAttribute("aria-invalid");
      inputEl?.removeAttribute("aria-describedby");
    };
  }, [matched, code, messageId]);

  const message = matched && code ? ERROR_MESSAGES[code]?.message : undefined;

  return (
    <div ref={wrapRef} className={`t-input-wrap ${errored ? "is-error" : ""}`}>
      {children}
      <p
        id={messageId}
        className="t-error-msg mt-1.5 text-xs text-[var(--destructive)]"
        role="alert"
      >
        {message}
      </p>
    </div>
  );
}
