import Link from "next/link";
import { ContactDiscord, LegalPage, Section, Ul } from "@/components/legal";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  path: "/mentions-legales",
  title: "Mentions légales",
});

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      title="Mentions légales"
      document="mentions"
      intro="Informations légales relatives à l'éditeur et à l'hébergeur du site The Hub, conformément à l'article 6 III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN)."
    >
      <Section title="Éditeur du site">
        <p>Le site The Hub est édité par Titouan Borde.</p>
        <Ul>
          <li>Statut : particulier, éditant le site à titre non professionnel.</li>
          <li>
            Contact : en rejoignant <ContactDiscord />, canal par lequel l&apos;éditeur reçoit toute
            demande relative au site.
          </li>
        </Ul>
        <p className="text-xs">
          Conformément à l&apos;article 6 III 2 de la LCEN, l&apos;éditeur, personne physique
          éditant le site à titre non professionnel, ne rend pas publique son adresse postale.
          Celle-ci est communiquée à l&apos;hébergeur du site, désigné ci-dessous, qui la tient à la
          disposition des autorités judiciaires.
        </p>
      </Section>

      <Section title="Directeur de la publication">
        <p>Titouan Borde, en sa qualité d&apos;éditeur du site.</p>
      </Section>

      <Section title="Hébergeur">
        <Ul>
          <li>Dénomination : OVH SAS, exploitant la marque Kimsufi.</li>
          <li>Adresse : 2 rue Kellermann, 59100 Roubaix, France.</li>
          <li>Téléphone : 1007.</li>
        </Ul>
      </Section>

      <Section title="Objet du site">
        <p>
          The Hub référence les équipes, les joueurs, les tournois et les statistiques de match de
          la scène Valorant Tier 3 francophone. Le site permet à ses utilisateurs de créer une fiche
          joueur, de gérer une équipe et d&apos;inscrire celle-ci à des tournois.
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          La structure du site, ses textes et ses éléments graphiques originaux sont protégés par le
          droit de la propriété intellectuelle. Toute reproduction ou représentation, totale ou
          partielle, sans autorisation préalable de l&apos;éditeur est interdite.
        </p>
        <p>
          Les logos d&apos;équipes, visuels de tournois et photographies de joueurs sont publiés par
          les utilisateurs qui les déposent et restent la propriété de leurs titulaires respectifs.
          Toute demande de retrait peut être adressée à l&apos;éditeur en rejoignant{" "}
          <ContactDiscord />.
        </p>
      </Section>

      <Section title="Marques et contenus tiers">
        <p>
          The Hub n&apos;est pas affilié à Riot Games et n&apos;est ni approuvé ni sponsorisé par
          Riot Games. Valorant ainsi que l&apos;ensemble des éléments associés (noms, marques,
          visuels, noms d&apos;agents et de cartes) sont des marques ou des œuvres de Riot Games,
          Inc. Les données de match sont utilisées à des fins d&apos;information sur la compétition.
        </p>
      </Section>

      <Section title="Signalement d'un contenu illicite">
        <p>
          Conformément à l&apos;article 6 I 5 de la LCEN, tout contenu manifestement illicite peut
          être signalé à l&apos;éditeur en rejoignant <ContactDiscord />, en précisant
          l&apos;adresse de la page concernée et le motif du signalement.
        </p>
      </Section>

      <Section title="Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans la{" "}
          <Link href="/confidentialite" className="text-[var(--accent)] hover:underline">
            politique de confidentialité
          </Link>
          . L&apos;usage du site est régi par les{" "}
          <Link href="/cgu" className="text-[var(--accent)] hover:underline">
            conditions générales d&apos;utilisation
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
