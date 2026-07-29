import Link from "next/link";
import { DiscordIcon, XIcon } from "@/components/icons";

const SOCIALS = [
  { label: "Discord", href: "https://discord.com/invite/XN5aXeMMB8", Icon: DiscordIcon },
  { label: "Twitter / X", href: "https://x.com/vrcmatchmaking", Icon: XIcon },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--border-strong)] bg-[var(--shell)]">
      {/* Pleine largeur (pas de max-w) : le crédit et les réseaux tiennent les
          coins. Hauteur alignée sur celle de la navbar. Grille en 3 colonnes
          pour que la mention centrale le soit vraiment, quelle que soit la
          largeur des deux blocs latéraux. */}
      <div className="grid h-[47px] grid-cols-[1fr_auto_1fr] items-center px-4 text-sm text-[var(--text-muted)]">
        {/* Coin gauche : « made by » centré au-dessus du pseudo */}
        <div className="flex flex-col items-center justify-self-start leading-none">
          <span className="f-by text-[#9b9c9e]">made by</span>
          <a
            href="https://x.com/lurrod"
            target="_blank"
            rel="noopener noreferrer"
            className="f-name mt-0.5 font-semibold leading-none text-white transition-colors hover:text-[var(--accent)]"
          >
            Lurrod
          </a>
        </div>

        <p className="hidden text-center text-xs sm:block">Projet non affilié à Riot Games.</p>

        {/* Coin droit : liens légaux puis réseaux */}
        <div className="flex items-center gap-4 justify-self-end">
          <div className="hidden items-center gap-x-3 text-xs sm:flex">
            <Link href="/mentions-legales" className="transition-colors hover:text-white">
              Mentions légales
            </Link>
            <span className="text-[var(--text-subtle)]">·</span>
            <Link href="/confidentialite" className="transition-colors hover:text-white">
              Confidentialité
            </Link>
            <span className="text-[var(--text-subtle)]">·</span>
            <Link href="/cgu" className="transition-colors hover:text-white">
              CGU
            </Link>
          </div>
          <div className="flex gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
                className="inline-flex text-[var(--text-muted)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:scale-110 hover:text-[var(--accent)] active:translate-y-0 active:scale-95"
              >
                <s.Icon />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
