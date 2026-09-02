import { Fragment } from "react";
import Link from "next/link";
import { DiscordIcon, XIcon } from "@/components/icons";

const SOCIALS = [
  { label: "Discord", href: "https://discord.com/invite/XN5aXeMMB8", Icon: DiscordIcon },
  { label: "Twitter / X", href: "https://x.com/vrcmatchmaking", Icon: XIcon },
];

const LEGAL = [
  { href: "/rating", label: "Rating" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cgu", label: "CGU" },
];

/**
 * Liens légaux, rendus deux fois : en ligne dans le coin droit à partir de
 * `sm`, et sur une rangée à part en dessous.
 *
 * Ce bloc était `hidden … sm:flex` et n'existait qu'une fois : les mentions
 * légales, les CGU et la politique de confidentialité étaient donc
 * inatteignables sur téléphone, alors que ce sont les seuls liens du site vers
 * ces pages. L'article 6 III de la LCEN les veut « accessibles de manière
 * directe et permanente », et l'article 12.1 du RGPD « aisément accessibles ».
 *
 * Les points de séparation sont `aria-hidden` : purement décoratifs, ils n'ont
 * pas à être annoncés, et c'est ce qui les autorise à rester sous le seuil de
 * contraste.
 */
function LegalLinks({ className }: { className: string }) {
  return (
    <div className={className}>
      {LEGAL.map((l, i) => (
        <Fragment key={l.href}>
          {i > 0 && (
            <span aria-hidden className="text-[var(--text-subtle)]">
              ·
            </span>
          )}
          <Link href={l.href} className="transition-colors hover:text-white">
            {l.label}
          </Link>
        </Fragment>
      ))}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--border-strong)] bg-[var(--shell)]">
      {/* Pleine largeur (pas de max-w) : le crédit et les réseaux tiennent les
          coins. Hauteur alignée sur celle de la navbar. Grille en 3 colonnes
          pour que la mention centrale le soit vraiment, quelle que soit la
          largeur des deux blocs latéraux. */}
      {/* `min-h` et non `h` : sous `sm`, les liens légaux passent sur une
          seconde rangée et le pied de page gagne en hauteur. L'alignement sur
          la navbar est conservé partout ailleurs. */}
      <div className="grid min-h-[47px] grid-cols-[1fr_auto_1fr] items-center px-4 text-sm text-[var(--text-muted)]">
        {/* Coin gauche : « made by » centré au-dessus du pseudo */}
        <div className="flex flex-col items-center justify-self-start leading-none">
          {/* La couleur vient du conteneur : elle valait déjà --text-muted, écrit
              en dur. */}
          <span className="f-by">made by</span>
          <a
            href="https://x.com/lurrod"
            target="_blank"
            rel="noopener noreferrer"
            className="f-name mt-0.5 font-semibold leading-none text-white transition-colors hover:text-[var(--accent)]"
          >
            Lurrod
          </a>
        </div>

        {/* La marque complète « The Hub VRC » doit exister en toutes lettres
            quelque part sur chaque page : c'est la requête sous laquelle on
            nous cherche, et le sigle seul renvoie à VRChat. */}
        <p className="hidden text-center text-xs sm:block">
          The Hub VRC — projet non affilié à Riot Games.
        </p>

        {/* Coin droit : liens légaux puis réseaux */}
        <div className="flex items-center gap-4 justify-self-end">
          <LegalLinks className="hidden items-center gap-x-3 text-xs sm:flex" />
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

      {/* Rangée mobile : la grille du dessus n'a pas la place de porter quatre
          liens sous 640 px. */}
      <LegalLinks className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-3 text-xs text-[var(--text-muted)] sm:hidden" />
    </footer>
  );
}
