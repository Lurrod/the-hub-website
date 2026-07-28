import Link from "next/link";

const SOCIALS = [
  {
    label: "Discord",
    href: "https://discord.com/invite/XN5aXeMMB8",
    path: "M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z",
  },
  {
    label: "Twitter / X",
    href: "https://x.com/vrcmatchmaking",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
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
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
