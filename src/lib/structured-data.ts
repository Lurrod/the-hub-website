import { SITE_ALT_NAME, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Données structurées Schema.org des fiches publiques.
 *
 * Règle appliquée partout : un champ absent en base est **omis**, jamais émis
 * à `null` — les validateurs de données structurées rejettent les valeurs
 * nulles. D'où le passage systématique par `compact()`.
 */
export type JsonLd = Record<string, unknown>;

/** Retire les clés dont la valeur est null ou undefined. */
function compact(o: Record<string, unknown>): JsonLd {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v != null));
}

/** Rend absolu un chemin interne ("/equipes/x", "/api/images/…"). */
function absolute(path: string | null): string | null {
  return path ? new URL(path, SITE_URL).toString() : null;
}

/**
 * Sérialise un document pour l'injecter dans une balise
 * `<script type="application/ld+json">`.
 *
 * Les descriptions d'équipe et de tournoi sont saisies librement : une chaîne
 * contenant `</script>` refermerait la balise et permettrait d'injecter du
 * code. Échapper chaque `<` en sa séquence unicode neutralise le cas, tout en
 * produisant un JSON strictement équivalent après analyse.
 */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Liste ordonnée d'entités déjà affichées par une page de liste.
 *
 * Chaque élément se réduit à son rang et à son URL : la fiche pointée porte
 * déjà son propre bloc Schema.org, dupliquer nom, image et description ici ne
 * ferait qu'ouvrir deux sources de vérité pour la même entité.
 *
 * `numberOfItems` vaut le nombre d'éléments **émis**, pas le total de la
 * collection : sur une page paginée, annoncer un total que la liste ne contient
 * pas serait faux.
 */
export function itemListJsonLd(
  name: string,
  items: { path: string; name?: string | null }[]
): JsonLd {
  return compact({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: items.map((item, i) =>
      compact({
        "@type": "ListItem",
        position: i + 1,
        url: absolute(item.path),
        name: item.name ?? null,
      })
    ),
  });
}

/**
 * Identité du site et action de recherche, posées sur l'accueil.
 *
 * `potentialAction` décrit `/recherche?q=` à un moteur qui saurait proposer une
 * boîte de recherche directement dans ses résultats. Le paramètre déclaré doit
 * être celui que la route lit réellement, sans quoi l'action mène à une page
 * vide.
 */
export function siteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: SITE_ALT_NAME,
    url: SITE_URL,
    inLanguage: "fr-FR",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      alternateName: SITE_ALT_NAME,
      url: SITE_URL,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL.replace(/\/$/, "")}/recherche?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function teamJsonLd(team: {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
  description: string | null;
}): JsonLd {
  return compact({
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: team.name,
    alternateName: team.tag || null,
    sport: "Valorant",
    url: absolute(`/equipes/${team.id}`),
    logo: absolute(team.logo),
    description: team.description,
  });
}

export function playerJsonLd(player: {
  id: string;
  pseudo: string;
  realName: string | null;
  nationality: string | null;
  photo: string | null;
}): JsonLd {
  // Quand le nom réel est connu il devient `name` et le pseudo passe en
  // alternateName ; sinon le pseudo tient les deux rôles et on n'émet pas de
  // doublon.
  const hasRealName = Boolean(player.realName);
  return compact({
    "@context": "https://schema.org",
    "@type": "Person",
    name: hasRealName ? player.realName : player.pseudo,
    alternateName: hasRealName ? player.pseudo : null,
    nationality: player.nationality,
    image: absolute(player.photo),
    url: absolute(`/joueurs/${player.id}`),
  });
}

export function tournamentJsonLd(t: {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  organizer: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
}): JsonLd {
  return compact({
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: t.name,
    sport: "Valorant",
    url: absolute(`/tournois/${t.id}`),
    image: absolute(t.logo),
    description: t.description,
    startDate: t.startDate?.toISOString() ?? null,
    endDate: t.endDate?.toISOString() ?? null,
    // Schema.org ne distingue pas « à venir » de « terminé » : EventCancelled
    // et EventPostponed sont les seules alternatives, et aucune ne correspond.
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    organizer: compact({
      "@type": "Organization",
      name: t.organizer ?? SITE_NAME,
      url: SITE_URL,
    }),
  });
}

export function matchJsonLd(m: {
  id: string;
  date: Date | null;
  teamA: { id: string; name: string };
  teamB: { id: string; name: string };
  tournamentName: string;
}): JsonLd {
  const competitor = (t: { id: string; name: string }) => ({
    "@type": "SportsTeam",
    name: t.name,
    url: absolute(`/equipes/${t.id}`),
  });
  return compact({
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${m.teamA.name} vs ${m.teamB.name}`,
    sport: "Valorant",
    url: absolute(`/matchs/${m.id}`),
    startDate: m.date?.toISOString() ?? null,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    competitor: [competitor(m.teamA), competitor(m.teamB)],
    superEvent: { "@type": "SportsEvent", name: m.tournamentName },
  });
}
