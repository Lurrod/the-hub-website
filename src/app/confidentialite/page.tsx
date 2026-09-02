import Link from "next/link";
import { ContactDiscord, LegalPage, Section, Ul } from "@/components/legal";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  path: "/confidentialite",
  title: "Politique de confidentialité",
});

const TH = "border-b border-[var(--border)] px-3 py-2 text-left font-semibold text-white";
const TD = "border-b border-[var(--border)] px-3 py-2 align-top";

export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      document="confidentialite"
      intro="Cette politique décrit les données personnelles traitées par The Hub, les raisons de ce traitement et les droits dont vous disposez, conformément au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés."
    >
      <Section title="Responsable du traitement">
        <p>
          Le responsable du traitement est Titouan Borde, joignable en rejoignant <ContactDiscord />
          . Les coordonnées complètes figurent dans les{" "}
          <Link href="/mentions-legales" className="text-[var(--accent)] hover:underline">
            mentions légales
          </Link>
          .
        </p>
      </Section>

      <Section title="Données collectées">
        <p>
          Tant que vous naviguez sans compte, seule la mesure de fréquentation décrite plus bas
          s&apos;applique : elle ne conserve rien qui vous concerne. La création d&apos;un compte et
          l&apos;usage des fonctionnalités entraînent les traitements suivants.{" "}
          <strong className="font-semibold text-white">
            Une fiche joueur peut toutefois exister sans qu&apos;aucun compte y soit rattaché
          </strong>{" "}
          : ce cas est décrit dans la section « Personnes référencées sans compte » ci-dessous.
        </p>

        <h3 className="pt-2 font-semibold text-white">1. Connexion via Discord</h3>
        <p>
          L&apos;authentification s&apos;effectue exclusivement via Discord. Nous ne créons ni ne
          stockons de mot de passe. Discord nous transmet :
        </p>
        <Ul>
          <li>votre identifiant Discord, votre nom d&apos;utilisateur et votre avatar ;</li>
          <li>votre adresse électronique ;</li>
          <li>
            les jetons techniques permettant de maintenir la liaison avec votre compte Discord.
          </li>
        </Ul>

        <h3 className="pt-2 font-semibold text-white">2. Fiche joueur</h3>
        <p>Les informations que vous renseignez vous-même, toutes facultatives sauf le pseudo :</p>
        <Ul>
          <li>pseudo, nom réel, date de naissance, nationalité, région ;</li>
          <li>photo de profil, liens vers vos réseaux sociaux ;</li>
          <li>rôle Valorant et appartenance à une équipe.</li>
        </Ul>

        <h3 className="pt-2 font-semibold text-white">3. Compte Valorant</h3>
        <p>
          Si vous liez votre compte Valorant, nous enregistrons votre Riot ID (nom et tag), votre
          identifiant de joueur Riot (PUUID) et votre région.
        </p>

        <h3 className="pt-2 font-semibold text-white">4. Statistiques de match</h3>
        <p>
          Pour chaque carte jouée dans un tournoi référencé : agent, éliminations, morts, assists,
          ACS, ADR, pourcentage de tirs à la tête, KAST, premières éliminations et premières morts,
          rating. Ces données décrivent une performance sportive et sont publiques sur le site.
        </p>
      </Section>

      <Section title="Personnes référencées sans compte">
        <p>
          Une fiche joueur peut exister sans que vous ayez créé de compte, et sans que vous en ayez
          été informé au préalable. Deux chemins y mènent :
        </p>
        <Ul>
          <li>
            l&apos;organisateur d&apos;un tournoi ou le manager d&apos;une équipe inscrit son
            effectif et crée les fiches correspondantes ;
          </li>
          <li>
            l&apos;import automatique des feuilles de match, depuis l&apos;API Riot via HenrikDev,
            enregistre une ligne de statistiques pour <strong>chaque</strong> joueur présent sur la
            carte — y compris les adversaires qui n&apos;ont pas de compte ici.
          </li>
        </Ul>
        <p>
          Les données alors enregistrées sont le pseudo, éventuellement la nationalité et
          l&apos;équipe, le Riot ID (nom et tag), l&apos;identifiant de joueur Riot (PUUID) et les
          statistiques de la carte listées plus haut. Aucune adresse électronique, aucun identifiant
          Discord et aucune date de naissance ne sont collectés par ce biais. La source des données
          est celle indiquée ci-dessus, conformément à l&apos;article 14 du RGPD.
        </p>
        <p>
          La base légale est l&apos;intérêt légitime (article 6.1.f) : référencer une compétition
          suppose d&apos;en publier les résultats, qui sont par nature nominatifs.
        </p>
        <p>
          <strong className="font-semibold text-white">Vous pouvez vous y opposer.</strong>{" "}
          L&apos;article 21 du RGPD ouvre un droit d&apos;opposition à tout traitement fondé sur
          l&apos;intérêt légitime. Écrivez-nous en rejoignant <ContactDiscord /> : la fiche est
          anonymisée, le Riot ID et le PUUID sont effacés, et les statistiques qui subsistent
          cessent d&apos;être rattachables à vous. Les autres droits décrits plus bas
          s&apos;appliquent de la même manière. Une mention rappelant ce droit figure au bas de
          chaque fiche sans compte rattaché.
        </p>
        <p>
          Si la fiche est la vôtre et que vous souhaitez la conserver, connectez-vous et liez votre
          Riot ID : elle vous sera rattachée avec son historique, et vous en reprenez la main.
        </p>
      </Section>

      <Section title="Finalités et bases légales">
        <div className="scroll-x scroll-x-on-bg">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr>
                <th scope="col" className={TH}>
                  Finalité
                </th>
                <th scope="col" className={TH}>
                  Base légale
                </th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-muted)]">
              <tr>
                <td className={TD}>Créer et sécuriser votre compte, gérer la session</td>
                <td className={TD}>Exécution des conditions d&apos;utilisation (art. 6.1.b)</td>
              </tr>
              <tr>
                <td className={TD}>
                  Afficher votre fiche joueur et vos appartenances d&apos;équipe
                </td>
                <td className={TD}>Exécution des conditions d&apos;utilisation (art. 6.1.b)</td>
              </tr>
              <tr>
                <td className={TD}>Vérifier votre Riot ID et rattacher vos statistiques</td>
                <td className={TD}>Exécution des conditions d&apos;utilisation (art. 6.1.b)</td>
              </tr>
              <tr>
                <td className={TD}>Publier les résultats et statistiques des tournois</td>
                <td className={TD}>Intérêt légitime : informer sur la compétition (art. 6.1.f)</td>
              </tr>
              <tr>
                <td className={TD}>Prévenir les abus et faire respecter les règles</td>
                <td className={TD}>Intérêt légitime : sécurité du service (art. 6.1.f)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Caractère public de certaines données">
        <p>
          The Hub est un site de référencement compétitif : votre pseudo, votre photo, votre
          nationalité, votre équipe et vos statistiques de match sont visibles par tous les
          visiteurs et peuvent être indexés par les moteurs de recherche. Votre adresse électronique
          n&apos;est jamais affichée publiquement.
        </p>
        <p>
          Votre fiche joueur affiche également un lien vers votre profil Discord, afin que les
          équipes puissent vous contacter. Vous pouvez le retirer à tout moment depuis vos
          paramètres, rubrique <span className="text-white">Compte Discord</span>.
        </p>
      </Section>

      <Section title="Durées de conservation">
        <Ul>
          <li>Compte et fiche joueur : jusqu&apos;à la suppression du compte.</li>
          <li>Sessions de connexion : expiration automatique, puis effacement.</li>
          <li>
            Résultats et statistiques de match : conservés après la suppression du compte, sous
            forme dissociée de votre identité (le lien vers votre fiche est rompu), afin de
            préserver l&apos;intégrité de l&apos;historique des compétitions.
          </li>
        </Ul>
      </Section>

      <Section title="Destinataires et sous-traitants">
        <Ul>
          <li>
            <span className="text-white">Discord</span> - authentification. Les données sont
            traitées selon la politique de confidentialité de Discord.
          </li>
          <li>
            <span className="text-white">HenrikDev</span> (api.henrikdev.xyz) - vérification des
            Riot ID. Seuls le nom et le tag Riot saisis sont transmis lors de la vérification.
          </li>
          <li>
            <span className="text-white">OVH SAS</span> (marque Kimsufi), 2 rue Kellermann, 59100
            Roubaix - hébergement du serveur, de la base de données et des images déposées.
          </li>
        </Ul>
        <p>
          Aucune donnée n&apos;est vendue ni cédée à des fins publicitaires. La base de données et
          les fichiers sont hébergés en France, donc au sein de l&apos;Union européenne. Discord
          relevant d&apos;une société établie aux États-Unis, les données échangées lors de
          l&apos;authentification peuvent y être transférées, sur le fondement des garanties prévues
          au chapitre V du RGPD (décision d&apos;adéquation ou clauses contractuelles types).
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Le site dépose des cookies pour deux finalités seulement, toutes deux strictement
          nécessaires à son fonctionnement :
        </p>
        <Ul>
          <li>
            <span className="text-white">Connexion</span> - les cookies posés par le mécanisme
            d&apos;authentification Discord. Ils maintiennent votre session et protègent le
            formulaire de connexion contre les requêtes forgées ; certains ne vivent que le temps de
            l&apos;échange avec Discord et disparaissent aussitôt. Ils sont déposés au moment où
            vous vous connectez et supprimés à la déconnexion.
          </li>
          <li>
            <span className="text-white">Cookie « onboarded »</span> - mémorise que vous avez
            terminé l&apos;écran d&apos;accueil, pour ne plus vous y renvoyer. Conservé un an, il ne
            contient aucune donnée vous concernant et subsiste après la déconnexion.
          </li>
        </Ul>
        <p>
          Il n&apos;y a ni cookie publicitaire, ni traceur tiers, et la mesure de fréquentation
          décrite ci-dessous n&apos;en dépose aucun. Aucun de ces cookies ne sert à vous suivre :
          tous étant nécessaires au service que vous demandez, aucun consentement préalable
          n&apos;est requis et aucune bannière n&apos;est affichée.
        </p>
        <p>
          Un visiteur qui ne lance jamais la connexion Discord ne reçoit aucun cookie : la
          consultation du site n&apos;en dépose pas.
        </p>
      </Section>

      <Section title="Mesure de fréquentation">
        <p>
          Le site compte ses pages vues et ses visiteurs quotidiens, pour savoir ce qui est
          consulté. Cette mesure est interne : aucune donnée ne part vers un service tiers, et aucun
          cookie n&apos;est déposé pour l&apos;effectuer.
        </p>
        <p>
          À chaque page affichée, votre navigateur transmet l&apos;adresse de la page. Votre adresse
          IP et votre navigateur servent uniquement, sur l&apos;instant, à calculer une empreinte
          qui permet de ne pas vous compter deux fois dans la même journée. Cette empreinte est
          chiffrée à sens unique avec un secret du serveur et la date du jour : elle change chaque
          jour, ne peut pas être rapprochée d&apos;une autre journée, et ne permet pas de remonter
          jusqu&apos;à vous. Ni votre adresse IP ni votre navigateur ne sont enregistrés.
        </p>
        <Ul>
          <li>
            Les adresses de pages sont réduites à leur gabarit : une fiche de joueur est comptée
            comme <span className="text-white">/joueurs/[id]</span>, sans l&apos;identifiant.
          </li>
          <li>
            Seuls des totaux par jour sont conservés. Aucune ligne n&apos;est écrite par visite : il
            n&apos;existe donc aucun historique de navigation, ni pour vous ni pour personne.
          </li>
          <li>
            Les empreintes du jour sont supprimées au bout de trois jours ; les totaux, qui ne
            concernent personne en particulier, sont conservés.
          </li>
        </Ul>
        <p>
          Cette mesure ne suit personne d&apos;un site à l&apos;autre et ne sert qu&apos;à
          l&apos;exploitation du site. Elle repose sur l&apos;intérêt légitime de l&apos;éditeur à
          connaître la fréquentation de son service.
        </p>
      </Section>

      <Section title="Mineurs">
        <p>
          La scène Tier 3 comptant des joueurs mineurs, aucune donnée n&apos;est demandée au-delà de
          ce qui est nécessaire au référencement sportif. En France, un mineur de moins de 15 ans
          doit disposer de l&apos;autorisation d&apos;un titulaire de l&apos;autorité parentale pour
          créer un compte. Un représentant légal peut demander à tout moment la suppression des
          données d&apos;un mineur en contactant l&apos;éditeur via <ContactDiscord />.
        </p>
      </Section>

      <Section title="Vos droits">
        <p>
          Vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de limitation,
          d&apos;opposition et de portabilité sur vos données. Vous pouvez les exercer à tout moment
          en contactant l&apos;éditeur via <ContactDiscord />. Une réponse vous sera apportée dans
          un délai d&apos;un mois.
        </p>
        <p>
          Vous pouvez également introduire une réclamation auprès de la Commission nationale de
          l&apos;informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris
          Cedex 07, ou sur www.cnil.fr.
        </p>
      </Section>

      <Section title="Modification de cette politique">
        <p>
          Cette politique peut évoluer avec le service. La date de dernière mise à jour figure en
          haut de page ; toute modification substantielle sera signalée sur le site.
        </p>
      </Section>
    </LegalPage>
  );
}
