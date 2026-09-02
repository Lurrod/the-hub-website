import { describe, it, expect } from "vitest";
import {
  itemListJsonLd,
  matchJsonLd,
  playerJsonLd,
  serializeJsonLd,
  siteJsonLd,
  teamJsonLd,
  tournamentJsonLd,
} from "@/lib/structured-data";

describe("teamJsonLd", () => {
  it("décrit une SportsTeam avec une URL absolue", () => {
    const d = teamJsonLd({ id: "t1", name: "Alpha", tag: "ALP", logo: null, description: null });
    expect(d["@type"]).toBe("SportsTeam");
    expect(d.name).toBe("Alpha");
    expect(String(d.url)).toMatch(/^https?:\/\/.+\/equipes\/t1$/);
    expect(d.sport).toBe("Valorant");
  });

  it("omet les champs absents plutôt que d'émettre null", () => {
    // Un JSON-LD contenant `"logo": null` est rejeté par les validateurs.
    const d = teamJsonLd({ id: "t1", name: "Alpha", tag: "ALP", logo: null, description: null });
    expect("logo" in d).toBe(false);
    expect("description" in d).toBe(false);
  });

  it("rend le logo absolu à partir de sa clé /api/images", () => {
    const d = teamJsonLd({
      id: "t1",
      name: "Alpha",
      tag: "ALP",
      logo: "/api/images/teams/t1.webp",
      description: null,
    });
    expect(String(d.logo)).toMatch(/^https?:\/\/.+\/api\/images\/teams\/t1\.webp$/);
  });
});

describe("playerJsonLd", () => {
  it("décrit une Person et retient le pseudo comme alternateName", () => {
    const d = playerJsonLd({
      id: "p1",
      pseudo: "Lurrod",
      realName: "Titouan",
      nationality: "France",
      photo: null,
    });
    expect(d["@type"]).toBe("Person");
    expect(d.name).toBe("Titouan");
    expect(d.alternateName).toBe("Lurrod");
    expect(d.nationality).toBe("France");
  });

  it("retombe sur le pseudo quand le nom réel est absent", () => {
    const d = playerJsonLd({
      id: "p1",
      pseudo: "Lurrod",
      realName: null,
      nationality: null,
      photo: null,
    });
    expect(d.name).toBe("Lurrod");
    expect("alternateName" in d).toBe(false);
  });
});

describe("tournamentJsonLd", () => {
  it("décrit un SportsEvent daté en ISO", () => {
    const d = tournamentJsonLd({
      id: "x1",
      name: "Open #1",
      logo: null,
      description: null,
      organizer: "The Hub",
      startDate: new Date("2026-09-01T18:00:00Z"),
      endDate: new Date("2026-09-03T22:00:00Z"),
      status: "UPCOMING",
    });
    expect(d["@type"]).toBe("SportsEvent");
    expect(d.startDate).toBe("2026-09-01T18:00:00.000Z");
    expect(d.endDate).toBe("2026-09-03T22:00:00.000Z");
    expect((d.organizer as Record<string, unknown>).name).toBe("The Hub");
  });

  it("traduit le statut en eventStatus Schema.org", () => {
    const base = {
      id: "x",
      name: "n",
      logo: null,
      description: null,
      organizer: null,
      startDate: null,
      endDate: null,
    };
    expect(tournamentJsonLd({ ...base, status: "UPCOMING" }).eventStatus).toBe(
      "https://schema.org/EventScheduled"
    );
    expect(tournamentJsonLd({ ...base, status: "FINISHED" }).eventStatus).toBe(
      "https://schema.org/EventScheduled"
    );
  });

  it("omet les dates absentes", () => {
    const d = tournamentJsonLd({
      id: "x",
      name: "n",
      logo: null,
      description: null,
      organizer: null,
      startDate: null,
      endDate: null,
      status: "UPCOMING",
    });
    expect("startDate" in d).toBe(false);
    expect("endDate" in d).toBe(false);
  });
});

describe("matchJsonLd", () => {
  it("liste les deux équipes en competitor", () => {
    const d = matchJsonLd({
      id: "m1",
      date: new Date("2026-09-01T18:00:00Z"),
      teamA: { id: "a", name: "Alpha" },
      teamB: { id: "b", name: "Beta" },
      tournamentName: "Open #1",
    });
    expect(d["@type"]).toBe("SportsEvent");
    expect(d.name).toBe("Alpha vs Beta");
    const competitors = d.competitor as Array<Record<string, unknown>>;
    expect(competitors).toHaveLength(2);
    expect(competitors[0].name).toBe("Alpha");
    expect(competitors[1]["@type"]).toBe("SportsTeam");
  });

  it("rattache le match à son tournoi", () => {
    const d = matchJsonLd({
      id: "m1",
      date: null,
      teamA: { id: "a", name: "Alpha" },
      teamB: { id: "b", name: "Beta" },
      tournamentName: "Open #1",
    });
    expect((d.superEvent as Record<string, unknown>).name).toBe("Open #1");
    expect("startDate" in d).toBe(false);
  });
});

describe("tous les documents", () => {
  it("portent le contexte Schema.org et survivent à JSON.stringify", () => {
    const docs = [
      teamJsonLd({ id: "t", name: "n", tag: "T", logo: null, description: null }),
      playerJsonLd({ id: "p", pseudo: "p", realName: null, nationality: null, photo: null }),
      matchJsonLd({
        id: "m",
        date: null,
        teamA: { id: "a", name: "A" },
        teamB: { id: "b", name: "B" },
        tournamentName: "t",
      }),
    ];
    for (const d of docs) {
      expect(d["@context"]).toBe("https://schema.org");
      expect(() => JSON.stringify(d)).not.toThrow();
    }
  });
});

describe("serializeJsonLd", () => {
  it("neutralise une fermeture de balise script injectée par un utilisateur", () => {
    // La description d'équipe est saisie librement : sans échappement, elle
    // pourrait refermer le <script> et injecter du code dans la page.
    const s = serializeJsonLd(
      teamJsonLd({
        id: "t",
        name: "Alpha",
        tag: "A",
        logo: null,
        description: "</script><script>alert(1)</script>",
      })
    );
    expect(s).not.toContain("</script>");
    // Le "<" est remplacé par sa séquence d'échappement JSON, pas supprimé.
    expect(s).toContain("\\u003c");
    expect(s).not.toContain("<");
  });

  it("reste du JSON valide et fidèle après échappement", () => {
    const data = teamJsonLd({
      id: "t",
      name: "A<B",
      tag: "T",
      logo: null,
      description: "x < y",
    });
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});

describe("itemListJsonLd", () => {
  it("numérote les éléments à partir de 1 et rend les URLs absolues", () => {
    const d = itemListJsonLd("Joueurs", [
      { path: "/joueurs/p1", name: "Neo" },
      { path: "/joueurs/p2", name: "Ash" },
    ]);
    expect(d["@type"]).toBe("ItemList");
    expect(d.name).toBe("Joueurs");
    const items = d.itemListElement as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[0].position).toBe(1);
    expect(items[1].position).toBe(2);
    expect(String(items[0].url)).toMatch(/^https?:\/\/.+\/joueurs\/p1$/);
  });

  it("annonce le nombre d'éléments réellement émis", () => {
    // Sur une page paginée, annoncer le total de la collection serait faux :
    // la liste ne contient que la page courante.
    const d = itemListJsonLd("Tournois", [{ path: "/tournois/a" }, { path: "/tournois/b" }]);
    expect(d.numberOfItems).toBe(2);
  });

  it("omet le nom d'un élément qui n'en a pas plutôt que d'émettre null", () => {
    const d = itemListJsonLd("Matchs", [{ path: "/matchs/m1", name: null }]);
    const items = d.itemListElement as Record<string, unknown>[];
    expect("name" in items[0]).toBe(false);
  });

  it("produit une liste vide sans élément, pas une clé absente", () => {
    const d = itemListJsonLd("Équipes", []);
    expect(d.itemListElement).toEqual([]);
    expect(d.numberOfItems).toBe(0);
  });
});

describe("siteJsonLd", () => {
  it("décrit un WebSite avec son éditeur", () => {
    const d = siteJsonLd();
    expect(d["@type"]).toBe("WebSite");
    expect((d.publisher as Record<string, unknown>)["@type"]).toBe("Organization");
  });

  it("porte « The Hub VRC » en alternateName — la requête de marque", () => {
    // Le nom courant est « The Hub », mais on se cherche en tapant
    // « the hub vrc » : sans cette variante, la chaîne n'existe nulle part.
    const d = siteJsonLd();
    expect(d.alternateName).toBe("The Hub VRC");
    expect((d.publisher as Record<string, unknown>).alternateName).toBe("The Hub VRC");
  });

  it("déclare l'action de recherche sur le paramètre que /recherche lit vraiment", () => {
    // Le gabarit doit pointer `q` : c'est le nom lu par src/app/recherche/page.tsx.
    const action = siteJsonLd().potentialAction as Record<string, unknown>;
    const target = action.target as Record<string, unknown>;
    expect(String(target.urlTemplate)).toMatch(/\/recherche\?q=\{search_term_string\}$/);
    expect(action["query-input"]).toContain("search_term_string");
  });

  it("n'insère pas de double slash entre le domaine et le chemin", () => {
    const target = (siteJsonLd().potentialAction as Record<string, unknown>).target as Record<
      string,
      unknown
    >;
    expect(String(target.urlTemplate)).not.toMatch(/[^:]\/\//);
  });
});

// Un événement déclaré en ligne sans `location` est rejeté par les validateurs
// de données structurées : ils attendent une VirtualLocation précisément là où
// il n'y a pas de lieu physique.
describe("SportsEvent : lieu virtuel", () => {
  it("le tournoi déclare une VirtualLocation", () => {
    const j = tournamentJsonLd({
      id: "t1",
      name: "Coupe",
      logo: null,
      description: null,
      startDate: null,
      endDate: null,
      organizer: null,
      status: "UPCOMING",
    }) as Record<string, unknown>;
    expect(j.location).toMatchObject({ "@type": "VirtualLocation" });
  });

  it("le match déclare une VirtualLocation et son image de partage", () => {
    const j = matchJsonLd({
      id: "m1",
      date: null,
      teamA: { id: "a", name: "A" },
      teamB: { id: "b", name: "B" },
      tournamentName: "Coupe",
    }) as Record<string, unknown>;
    expect(j.location).toMatchObject({ "@type": "VirtualLocation" });
    expect(String(j.image)).toContain("/matchs/m1/opengraph-image");
  });
});
