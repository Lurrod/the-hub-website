import { describe, it, expect } from "vitest";
import { pageMetadata, NOINDEX, SITE_DESCRIPTION } from "@/lib/metadata";
import { mapSplashUrl, MAP_SPLASH } from "@/lib/maps";

describe("pageMetadata", () => {
  it("pose la canonique de la page", () => {
    // Elle ne peut pas vivre dans le layout : elle serait héritée telle quelle
    // par toutes les pages, ce qui est pire que pas de canonique du tout.
    expect(pageMetadata({ path: "/joueurs" }).alternates?.canonical).toBe("/joueurs");
  });

  it("n'émet ni titre ni description quand la page n'en donne pas", () => {
    // Une clé présente à `undefined` écraserait celle du layout racine.
    const m = pageMetadata({ path: "/" });
    expect("title" in m).toBe(false);
    expect("description" in m).toBe(false);
  });

  it("reprend titre et description quand ils sont fournis", () => {
    const m = pageMetadata({ path: "/tournois", title: "Tournois", description: "Les tournois." });
    expect(m.title).toBe("Tournois");
    expect(m.description).toBe("Les tournois.");
  });

  it("compose le titre de partage à partir du titre de page", () => {
    const og = pageMetadata({ path: "/tournois", title: "Tournois" }).openGraph;
    expect(og && "title" in og && og.title).toBe("Tournois · The Hub");
  });

  it("retombe sur le nom du site quand la page n'a pas de titre", () => {
    const og = pageMetadata({ path: "/" }).openGraph;
    expect(og && "title" in og && og.title).toBe("The Hub - T3 Valorant");
  });

  it("laisse un titre de partage explicite l'emporter", () => {
    const og = pageMetadata({ path: "/", title: "Accueil", shareTitle: "The Hub" }).openGraph;
    expect(og && "title" in og && og.title).toBe("The Hub");
  });

  it("retombe sur la description du site pour le partage", () => {
    const og = pageMetadata({ path: "/equipes" }).openGraph;
    expect(og && "description" in og && og.description).toBe(SITE_DESCRIPTION);
  });

  it("répète le chemin dans openGraph, qui n'est pas fusionné avec le layout", () => {
    const og = pageMetadata({ path: "/matchs" }).openGraph;
    expect(og?.url).toBe("/matchs");
    expect(og && "siteName" in og && og.siteName).toBe("The Hub");
    expect(og?.locale).toBe("fr_FR");
  });
});

describe("NOINDEX", () => {
  it("interdit l'indexation et le suivi des liens", () => {
    expect(NOINDEX.robots).toEqual({ index: false, follow: false });
  });
});

describe("mapSplashUrl", () => {
  it("rend l'illustration d'une map connue", () => {
    expect(mapSplashUrl("Ascent")).toBe(MAP_SPLASH.Ascent);
  });

  it("rend undefined sur une map inconnue ou absente", () => {
    // Une map ajoutée par Riot mais pas encore dans la table ne doit pas casser
    // l'affichage : l'appelant se contente de ne pas poser d'image.
    expect(mapSplashUrl("MapInexistante")).toBeUndefined();
    expect(mapSplashUrl(null)).toBeUndefined();
    expect(mapSplashUrl(undefined)).toBeUndefined();
    expect(mapSplashUrl("")).toBeUndefined();
  });

  it("ne pointe que des images servies par le site", () => {
    // Une URL absolue qui reviendrait ici rouvrirait un domaine tiers dans
    // img-src : la CSP la bloquerait, et la carte de map perdrait son fond.
    for (const url of Object.values(MAP_SPLASH)) {
      expect(url).toMatch(/^\/valorant\/maps\/[a-z0-9-]+\.webp$/);
    }
  });
});

// Le bloc `twitter` du layout racine n'est pas fusionné en profondeur avec
// celui d'une page : sans redéfinition ici, chaque fiche partagée sur X
// affichait le titre générique du site, alors que son image de partage est
// générée sur mesure.
describe("carte de partage X", () => {
  it("reprend le titre et la description de la page", () => {
    const m = pageMetadata({
      path: "/joueurs/abc",
      title: "Ruskof",
      description: "Statistiques de Ruskof.",
    });
    expect(m.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Ruskof · The Hub",
      description: "Statistiques de Ruskof.",
    });
  });

  it("suit le titre de partage quand il diffère du titre de page", () => {
    const m = pageMetadata({ path: "/matchs/x", title: "Match", shareTitle: "A vs B" });
    expect(m.twitter).toMatchObject({ title: "A vs B" });
  });
});

// Sans le rang, `/joueurs?p=5` déclarait le canonique de `/joueurs` : chaque
// page de rang supérieur disait à Google qu'elle était un doublon de la
// première, donc de ne pas l'indexer.
describe("canonique et pagination", () => {
  it("la page 1 garde le chemin nu", () => {
    expect(pageMetadata({ path: "/joueurs", page: 1 }).alternates?.canonical).toBe("/joueurs");
    expect(pageMetadata({ path: "/joueurs" }).alternates?.canonical).toBe("/joueurs");
  });

  it("les pages suivantes se déclarent elles-mêmes", () => {
    const m = pageMetadata({ path: "/joueurs", page: 5 });
    expect(m.alternates?.canonical).toBe("/joueurs?p=5");
    // L'URL OpenGraph suit, sinon le partage d'une page 5 pointerait la page 1.
    expect(m.openGraph?.url).toBe("/joueurs?p=5");
  });
});
