import type { ReactNode } from "react";

type Socials = { twitter?: string; twitch?: string; website?: string };

const LABELS: Record<keyof Socials, string> = {
  twitter: "Twitter / X",
  twitch: "Twitch",
  website: "Site web",
};

const ICONS: Record<keyof Socials, ReactNode> = {
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  twitch: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
    </svg>
  ),
  website: (
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
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </svg>
  ),
};

/** Liens réseaux affichés en boutons-icônes (logo au lieu de texte). */
export default function SocialLinks({
  socials,
  className,
}: {
  socials: Socials;
  className?: string;
}) {
  const keys = (["twitter", "twitch", "website"] as const).filter((k) => socials[k]);
  if (keys.length === 0) return null;
  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      {keys.map((k) => (
        <a
          key={k}
          href={socials[k]!}
          target="_blank"
          rel="noreferrer"
          aria-label={LABELS[k]}
          title={LABELS[k]}
          className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:scale-105 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] active:translate-y-0 active:scale-95"
        >
          {ICONS[k]}
        </a>
      ))}
    </div>
  );
}
