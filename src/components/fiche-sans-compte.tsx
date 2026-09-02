import Link from "next/link";
import { DISCORD_INVITE } from "@/components/legal";

/**
 * Information des personnes référencées sans l'avoir demandé.
 *
 * Une fiche joueur peut exister sans compte rattaché : un organisateur inscrit
 * son effectif, ou l'import des feuilles de match enregistre une ligne de
 * statistiques pour chaque joueur présent sur la carte — adversaires compris.
 * Ces personnes n'ont jamais été informées, alors que l'article 14 du RGPD
 * l'impose quand les données ne viennent pas de l'intéressé, et que le
 * traitement repose sur l'intérêt légitime, donc ouvre un droit d'opposition
 * (article 21). La politique de confidentialité disait même l'inverse : que
 * rien n'était traité tant qu'aucun compte n'existait.
 *
 * Volontairement discret et en fin de fiche : c'est une mention légale, pas un
 * appel à l'action. Elle ne s'affiche que sur les fiches sans compte.
 */
export default function FicheSansCompte({ pseudo }: { pseudo: string }) {
  return (
    <aside className="mt-10 border-t border-[var(--border)] pt-4 text-[var(--text-muted)]">
      <p>
        Cette fiche a été créée par un organisateur ou par l&apos;import des feuilles de match, sans
        que {pseudo} l&apos;ait demandé, et aucun compte n&apos;y est rattaché.{" "}
        <strong className="font-semibold text-white">Si c&apos;est vous</strong>, connectez-vous et
        liez votre Riot ID : la fiche vous sera rattachée avec son historique.{" "}
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] hover:underline"
        >
          Écrivez-nous
        </a>{" "}
        pour demander son retrait ou son anonymisation — voir{" "}
        <Link href="/confidentialite" className="text-[var(--accent)] hover:underline">
          la politique de confidentialité
        </Link>
        .
      </p>
    </aside>
  );
}
