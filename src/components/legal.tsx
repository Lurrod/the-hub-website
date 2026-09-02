import type { ReactNode } from "react";

/**
 * Date de dernière révision, propre à chaque document.
 *
 * C'était une constante unique pour les trois pages : réviser la politique de
 * confidentialité redatait donc aussi les mentions légales et les CGU, qui
 * n'avaient pas bougé. La politique s'engage pourtant à signaler toute
 * modification substantielle par cette date — une date fausse fragilise la
 * démonstration de conformité (article 5.2 du RGPD).
 *
 * À mettre à jour dès qu'on touche au fond du document correspondant.
 */
export const LEGAL_UPDATED = {
  mentions: "1er août 2026",
  cgu: "1er août 2026",
  confidentialite: "2 septembre 2026",
} as const;

export type LegalDocument = keyof typeof LEGAL_UPDATED;

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
  document,
  intro,
  children,
}: {
  title: string;
  document: LegalDocument;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="legal mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <p className="mt-1 text-xs text-[var(--text-subtle)]">
        Dernière mise à jour : {LEGAL_UPDATED[document]}
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
