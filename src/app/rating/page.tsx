import Link from "next/link";
import { Section, Ul } from "@/components/legal";
import { RATING_BASELINE } from "@/lib/match-stats-core";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  path: "/rating",
  title: "Comment est calculé le rating",
  description:
    "La formule du rating de The Hub, ses coefficients, son recentrage sur 1,00 et ce qu'elle ne mesure pas.",
});

/**
 * Page publique de la formule de rating.
 *
 * Un site de statistiques qui publie une note sans dire comment elle est
 * calculée demande une confiance qu'il ne justifie pas. Cette page expose la
 * formule, ses coefficients, son recentrage — et surtout ce qu'elle ne mesure
 * pas, ce qui est la partie la plus utile pour qui lit un classement.
 *
 * La constante de recentrage est importée de `match-stats-core` plutôt que
 * recopiée : recalibrée un jour, la page suit toute seule au lieu de mentir.
 */

const TERMES: readonly { part: string; quoi: string; pourquoi: string }[] = [
  {
    part: "0,0073 × KAST",
    quoi: "Part des rounds où le joueur a fait un kill, est mort, a assisté ou a survécu.",
    pourquoi:
      "Mesure la présence dans le round plutôt que la ligne de stats : un joueur utile sans frag y figure.",
  },
  {
    part: "0,3591 × kills par round",
    quoi: "Kills divisés par le nombre de rounds joués.",
    pourquoi: "Ramener au round permet de comparer un Bo1 court et une carte en prolongation.",
  },
  {
    part: "− 0,5329 × morts par round",
    quoi: "Morts divisées par le nombre de rounds.",
    pourquoi:
      "Le coefficient est le plus lourd de la formule : mourir coûte plus qu'un kill ne rapporte.",
  },
  {
    part: "0,2372 × impact",
    quoi: "impact = 2,13 × kills/round + 0,42 × assists/round − 0,41",
    pourquoi:
      "Terme composite hérité de HLTV : il valorise les kills qui ouvrent un round et le jeu d'appui.",
  },
  {
    part: "0,00171 × ADR",
    quoi: "Dégâts moyens par round.",
    pourquoi:
      "Récompense le joueur qui abîme sans achever. Le coefficient de Counter-Strike (0,0032) a été divisé par environ deux : l'ADR est plus élevé sur Valorant, le terme y pèserait sinon le double.",
  },
];

export default function RatingPage() {
  return (
    <main className="legal mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-white">Comment est calculé le rating</h1>
      <p className="mt-5 text-[var(--text-muted)]">
        Le rating résume une performance en un seul nombre. C&apos;est une échelle centrée sur{" "}
        <span className="stat text-white">1,00</span> : une partie moyenne vaut 1,00, au-dessus la
        performance est meilleure que la moyenne du site, en dessous elle l&apos;est moins. Il est
        calculé par carte, puis moyenné sur les cartes d&apos;un joueur.
      </p>

      <Section title="La formule">
        <p>
          C&apos;est un portage de la formule <span className="text-white">HLTV 2.0</span>, conçue
          pour Counter-Strike, adaptée à Valorant. Elle est appliquée telle quelle, sans réglage par
          joueur ni par équipe :
        </p>
        <pre
          className="stat overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-[12px] leading-relaxed text-white"
          tabIndex={0}
          role="region"
          aria-label="Formule de calcul du rating, défilement horizontal"
        >
          {`rating = 0,0073 × KAST
       + 0,3591 × kills par round
       − 0,5329 × morts par round
       + 0,2372 × impact
       + 0,00171 × ADR
       + ${RATING_BASELINE.toString().replace(".", ",")}`}
        </pre>
        <p>
          Le résultat est arrondi au centième et ne descend jamais sous{" "}
          <span className="stat text-white">0,01</span> : une carte catastrophique reste un petit
          nombre positif, jamais zéro ni négatif.
        </p>
      </Section>

      <Section title="Ce que chaque terme apporte">
        <div className="space-y-4">
          {TERMES.map((t) => (
            <div key={t.part} className="rounded-lg border border-[var(--border)] p-4">
              <div className="stat text-[13px] font-semibold text-white">{t.part}</div>
              <p className="mt-1.5">{t.quoi}</p>
              <p className="mt-1 text-[var(--text-subtle)]">{t.pourquoi}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Le recentrage sur 1,00">
        <p>
          Le dernier terme, aujourd&apos;hui{" "}
          <span className="stat text-white">{RATING_BASELINE.toString().replace(".", ",")}</span>,
          n&apos;a aucune signification en soi : il place l&apos;échelle. Sans lui, la formule
          héritée de Counter-Strike tassait tout le monde — le joueur moyen sortait autour de 0,90,
          et une ligne pourtant positive restait sous 1,00, ce qu&apos;une échelle centrée sur 1 ne
          devrait jamais produire.
        </p>
        <p>
          Sa valeur est mesurée sur les scoreboards réellement enregistrés, de sorte que la ligne
          moyenne du site tombe exactement sur 1,00. Elle est donc <em>relative à ce site</em> : un
          rating de 1,10 ici veut dire « au-dessus de la moyenne du Tier 3 français tel qu&apos;il
          est mesuré ici », pas « au-dessus de la moyenne mondiale ».
        </p>
        <p>
          Le niveau moyen d&apos;une base qui grossit peut dériver. La valeur est donc remesurée
          périodiquement ; quand elle est ajustée, les ratings déjà enregistrés sont recalculés pour
          que l&apos;échelle reste comparable d&apos;un bout à l&apos;autre de l&apos;historique.
        </p>
      </Section>

      <Section title="Ce que le rating ne mesure pas">
        <p>
          C&apos;est la partie la plus utile pour lire un classement. La formule ignore délibérément
          :
        </p>
        <Ul>
          <li>
            <span className="text-white">La force de l&apos;adversaire.</span> Une carte gagnée
            contre une équipe faible pèse autant qu&apos;une carte serrée contre la meilleure du
            tournoi.
          </li>
          <li>
            <span className="text-white">Le contexte du round.</span> Un kill en sortie de spawn et
            un clutch à 1 contre 3 comptent pareil.
          </li>
          <li>
            <span className="text-white">L&apos;économie.</span> Un round joué au pistolet et un
            round en armure lourde sont traités de la même façon.
          </li>
          <li>
            <span className="text-white">Le rôle.</span> Un contrôleur qui pose ses fumigènes au bon
            endroit n&apos;a aucune ligne de statistique pour le dire ; un duelliste part avantagé.
          </li>
          <li>
            <span className="text-white">L&apos;issue du match.</span> Le rating est calculé carte
            par carte, indépendamment de la victoire.
          </li>
        </Ul>
        <p>
          Un rating se lit donc avec son volume de cartes : sur deux ou trois parties, il dit
          surtout que le joueur a eu une bonne soirée.
        </p>
      </Section>

      <Section title="D'où viennent les chiffres">
        <p>
          Les scoreboards sont importés depuis les parties personnalisées Riot, pas saisis à la
          main. Kills, morts, assists, KAST et ADR viennent donc directement de la partie jouée. Une
          carte sans scoreboard importé n&apos;entre dans aucun calcul.
        </p>
        <p className="pt-2">
          <Link href="/joueurs" className="text-[var(--accent)] hover:underline">
            Voir le classement des joueurs
          </Link>
        </p>
      </Section>
    </main>
  );
}
