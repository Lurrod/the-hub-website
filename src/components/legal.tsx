import type { ReactNode } from "react";

/** Date de dernière révision affichée en tête des pages légales. */
export const LEGAL_UPDATED = "1er août 2026";

/** Canal de contact unique de l'éditeur (mentions légales, RGPD, signalements). */
export const DISCORD_INVITE = "https://discord.com/invite/XN5aXeMMB8";

export function ContactDiscord({ label = "le serveur Discord de The Hub" }: { label?: string }) {
  return (
    <a
      href={DISCORD_INVITE}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--accent)] hover:underline"
    >
      {label}
    </a>
  );
}

/**
 * Marqueur des informations que seul l'éditeur peut renseigner (identité,
 * hébergeur, contact). Volontairement voyant : ces pages ne doivent pas être
 * publiées tant qu'il en reste un seul à l'écran.
 */
export function Todo({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-[var(--destructive-soft)] px-1.5 py-0.5 font-semibold text-[var(--destructive)]">
      [À COMPLÉTER : {children}]
    </mark>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-[var(--text-muted)]">{children}</div>
    </section>
  );
}

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="legal mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <p className="mt-1 text-xs text-[var(--text-subtle)]">
        Dernière mise à jour : {LEGAL_UPDATED}
      </p>
      {intro && <p className="mt-5 text-[var(--text-muted)]">{intro}</p>}
      {children}
    </main>
  );
}

/** Liste à puces sobre, réutilisée dans les trois pages. */
export function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-[var(--text-subtle)]">{children}</ul>
  );
}
