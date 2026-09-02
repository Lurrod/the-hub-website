import Link from "next/link";
import { ContactDiscord, LegalPage, Section, Ul } from "@/components/legal";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  path: "/cgu",
  title: "Conditions générales d'utilisation",
});

export default function CguPage() {
  return (
    <LegalPage
      title="Conditions générales d'utilisation"
      document="cgu"
      intro="Les présentes conditions régissent l'accès au site The Hub et son utilisation. Créer un compte vaut acceptation pleine et entière de ces conditions."
    >
      <Section title="1. Objet du service">
        <p>
          The Hub est une plateforme de référencement de la scène Valorant Tier 3 francophone. Elle
          permet de consulter des équipes, des joueurs, des tournois et des statistiques de match,
          de tenir à jour une fiche joueur, de gérer une équipe et de l&apos;inscrire à des
          tournois. Le service est fourni gratuitement.
        </p>
      </Section>

      <Section title="2. Compte utilisateur">
        <Ul>
          <li>
            La création d&apos;un compte s&apos;effectue exclusivement via Discord. Vous devez
            disposer d&apos;un compte Discord valide et en respecter les conditions.
          </li>
          <li>
            Vous êtes responsable des activités réalisées depuis votre compte et vous vous engagez à
            fournir des informations exactes, notamment votre pseudo et votre Riot ID.
          </li>
          <li>
            Un compte est strictement personnel. L&apos;usurpation de l&apos;identité d&apos;un
            autre joueur, d&apos;une équipe ou d&apos;un organisateur est interdite.
          </li>
          <li>
            Les mineurs de moins de 15 ans doivent obtenir l&apos;autorisation d&apos;un titulaire
            de l&apos;autorité parentale.
          </li>
        </Ul>
      </Section>

      <Section title="3. Contenus publiés par les utilisateurs">
        <p>
          Vous restez titulaire des contenus que vous déposez (logo d&apos;équipe, photo,
          description de tournoi, liens). En les publiant, vous accordez à l&apos;éditeur une
          licence non exclusive et gratuite de les héberger et de les afficher sur le site, pour la
          durée de leur publication et aux seules fins de fonctionnement du service.
        </p>
        <p>
          Vous garantissez détenir les droits nécessaires sur les contenus déposés et vous engagez à
          ne pas publier de contenu illicite, diffamatoire, haineux, pornographique, ou portant
          atteinte aux droits de tiers.
        </p>
      </Section>

      <Section title="4. Règles de conduite">
        <Ul>
          <li>
            Ne pas perturber le fonctionnement du site, ni tenter d&apos;accéder à des données ou
            des espaces d&apos;administration sans autorisation.
          </li>
          <li>
            Ne pas extraire de manière massive ou automatisée le contenu du site sans accord
            préalable de l&apos;éditeur.
          </li>
          <li>
            Ne pas falsifier de résultat, de composition d&apos;équipe ou de statistique, et ne pas
            créer de fiches fictives.
          </li>
          <li>
            Adopter un comportement respectueux envers les autres joueurs, équipes et organisateurs.
          </li>
        </Ul>
      </Section>

      <Section title="5. Équipes et tournois">
        <Ul>
          <li>
            Le manager d&apos;une équipe est responsable de l&apos;exactitude de son effectif et des
            inscriptions qu&apos;il réalise.
          </li>
          <li>
            L&apos;inscription à un tournoi n&apos;est possible que pendant la phase
            d&apos;ouverture des inscriptions, dans la limite du nombre de places définies par
            l&apos;organisateur et sous réserve d&apos;un effectif suffisant.
          </li>
          <li>
            L&apos;éditeur du site n&apos;organise pas nécessairement les tournois référencés et
            n&apos;est pas responsable de leur déroulement, de leur règlement ni des éventuelles
            dotations, qui relèvent de leurs organisateurs respectifs.
          </li>
        </Ul>
      </Section>

      <Section title="6. Statistiques de match">
        <p>
          Les statistiques sont issues des parties disputées et de données transmises par des
          services tiers. Elles sont fournies à titre informatif : malgré le soin apporté à leur
          traitement, leur exactitude ou leur exhaustivité ne peut être garantie. Toute erreur peut
          être signalée à l&apos;éditeur via <ContactDiscord />.
        </p>
      </Section>

      <Section title="7. Suspension et suppression">
        <p>
          En cas de manquement aux présentes conditions, l&apos;éditeur peut retirer un contenu,
          suspendre ou supprimer un compte, après information de l&apos;utilisateur lorsque cela est
          possible. Vous pouvez demander à tout moment la suppression de votre compte en contactant
          l&apos;éditeur via <ContactDiscord />.
        </p>
      </Section>

      <Section title="8. Disponibilité et responsabilité">
        <p>
          Le service est fourni « en l&apos;état », sans garantie de disponibilité continue.
          L&apos;éditeur peut interrompre le site pour maintenance ou faire évoluer ses
          fonctionnalités. Sa responsabilité ne saurait être engagée pour les contenus publiés par
          les utilisateurs, ni pour les dommages indirects résultant de l&apos;utilisation du site.
        </p>
      </Section>

      <Section title="9. Modification des conditions">
        <p>
          Ces conditions peuvent être modifiées. La version applicable est celle publiée sur cette
          page, dont la date de mise à jour figure en haut. Poursuivre l&apos;utilisation du site
          après une modification vaut acceptation de la nouvelle version.
        </p>
      </Section>

      <Section title="10. Droit applicable">
        <p>
          Les présentes conditions sont soumises au droit français. À défaut de résolution amiable,
          tout litige relève de la compétence des juridictions françaises.
        </p>
        <p>
          Voir également les{" "}
          <Link href="/mentions-legales" className="text-[var(--accent)] hover:underline">
            mentions légales
          </Link>{" "}
          et la{" "}
          <Link href="/confidentialite" className="text-[var(--accent)] hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
