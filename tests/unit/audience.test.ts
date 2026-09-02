import { describe, it, expect } from "vitest";
import {
  clientIp,
  utcDayKey,
  dayOf,
  isBot,
  isCountable,
  normalizePath,
  visitorHash,
} from "@/lib/audience";

/**
 * Mesure de fréquentation.
 *
 * Ce qui est vérifié ici, ce sont les promesses faites au visiteur sur la page
 * de confidentialité : un chemin réduit à son gabarit, une empreinte qui
 * change chaque jour et qui dépend d'un secret, et rien qui permette de
 * rapprocher deux journées.
 */

describe("normalizePath", () => {
  it("réduit une fiche à son gabarit, sans l'identifiant", () => {
    expect(normalizePath("/joueurs/cmsd6mt1k000whioptzne6kbm")).toBe("/joueurs/[id]");
    expect(normalizePath("/equipes/abc")).toBe("/equipes/[id]");
    expect(normalizePath("/matchs/abc")).toBe("/matchs/[id]");
    expect(normalizePath("/tournois/abc")).toBe("/tournois/[id]");
    expect(normalizePath("/rejoindre/jeton-secret")).toBe("/rejoindre/[token]");
  });

  it("replie les écrans de gestion sur un seul gabarit", () => {
    expect(normalizePath("/equipes/abc/gestion/roster")).toBe("/equipes/[id]/gestion");
    expect(normalizePath("/tournois/abc/gestion/competition")).toBe("/tournois/[id]/gestion");
  });

  it("laisse les pages fixes telles quelles", () => {
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("/joueurs")).toBe("/joueurs");
    expect(normalizePath("/lft")).toBe("/lft");
  });

  it("jette la chaîne de requête, qui porte les recherches saisies", () => {
    // `?q=` contient ce que la personne a tapé : le conserver reviendrait à
    // enregistrer une saisie, ce que la politique de confidentialité exclut.
    expect(normalizePath("/recherche?q=quelqu-un")).toBe("/recherche");
    expect(normalizePath("/joueurs?p=2#ancre")).toBe("/joueurs");
  });

  it("ignore une barre finale, qui ne désigne pas une autre page", () => {
    expect(normalizePath("/joueurs/")).toBe("/joueurs");
    expect(normalizePath("/")).toBe("/");
  });

  it("refuse ce qui ne ressemble pas à un chemin", () => {
    expect(normalizePath(null)).toBeNull();
    expect(normalizePath("")).toBeNull();
    expect(normalizePath("https://ailleurs.test/x")).toBeNull();
    expect(normalizePath("joueurs")).toBeNull();
    expect(normalizePath(`/${"a".repeat(600)}`)).toBeNull();
  });
});

describe("isCountable", () => {
  it("écarte l'administration, qui n'est pas de l'audience", () => {
    expect(isCountable("/admin")).toBe(false);
    expect(isCountable("/admin/joueurs")).toBe(false);
    expect(isCountable("/joueurs")).toBe(true);
  });
});

describe("visitorHash", () => {
  const jour = dayOf(new Date("2026-08-12T10:00:00Z"));
  const lendemain = dayOf(new Date("2026-08-13T10:00:00Z"));

  it("reste stable pour un même visiteur dans la même journée", () => {
    const a = visitorHash("1.2.3.4", "Firefox", jour, "secret");
    const b = visitorHash("1.2.3.4", "Firefox", jour, "secret");
    expect(a).toBe(b);
  });

  it("change le lendemain : deux journées ne sont pas rapprochables", () => {
    const a = visitorHash("1.2.3.4", "Firefox", jour, "secret");
    const b = visitorHash("1.2.3.4", "Firefox", lendemain, "secret");
    expect(a).not.toBe(b);
  });

  it("dépend du secret : l'empreinte est invérifiable sans lui", () => {
    const a = visitorHash("1.2.3.4", "Firefox", jour, "secret");
    const b = visitorHash("1.2.3.4", "Firefox", jour, "autre-secret");
    expect(a).not.toBe(b);
  });

  it("distingue deux visiteurs", () => {
    const a = visitorHash("1.2.3.4", "Firefox", jour, "secret");
    const b = visitorHash("5.6.7.8", "Firefox", jour, "secret");
    expect(a).not.toBe(b);
  });

  it("ne laisse transparaître ni l'adresse ni le navigateur", () => {
    const h = visitorHash("1.2.3.4", "Firefox/128", jour, "secret");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("1.2.3.4");
    expect(h).not.toContain("Firefox");
  });
});

describe("dayOf / utcDayKey", () => {
  it("ramène à minuit UTC, quelle que soit l'heure", () => {
    expect(dayOf(new Date("2026-08-12T23:59:59Z")).toISOString()).toBe("2026-08-12T00:00:00.000Z");
    expect(utcDayKey(dayOf(new Date("2026-08-12T23:59:59Z")))).toBe("2026-08-12");
  });
});

describe("clientIp", () => {
  it("retient le maillon posé par Apache, seul non falsifiable", () => {
    // Apache ajoute l'adresse qu'il a vue à la fin de l'en-tête.
    expect(clientIp("1.2.3.4", null)).toBe("1.2.3.4");
  });

  it("ignore les maillons que le client a écrits lui-même", () => {
    // Le client a envoyé « 9.9.9.9 » ; Apache a ajouté son adresse réelle.
    expect(clientIp("9.9.9.9, 1.2.3.4", null)).toBe("1.2.3.4");
    // Même tentative avec plusieurs faux maillons : seul le dernier compte.
    expect(clientIp("1.1.1.1, 2.2.2.2, 3.3.3.3", null)).toBe("3.3.3.3");
  });

  it("retombe sur x-real-ip, puis sur une valeur neutre", () => {
    expect(clientIp(null, "5.6.7.8")).toBe("5.6.7.8");
    expect(clientIp(null, null)).toBe("inconnu");
    expect(clientIp("", "")).toBe("inconnu");
  });
});

describe("isBot", () => {
  it("reconnaît les robots qui rendent la page", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("HeadlessChrome/120")).toBe(true);
    expect(isBot("curl/8.1")).toBe(true);
  });

  it("laisse passer un navigateur ordinaire", () => {
    expect(
      isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36")
    ).toBe(false);
    expect(isBot(null)).toBe(false);
  });
});
