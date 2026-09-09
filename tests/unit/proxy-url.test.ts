import { describe, it, expect } from "vitest";
import { internalRewriteUrl } from "@/lib/proxy-url";

describe("internalRewriteUrl", () => {
  it("ramène en clair une origine passée en https par le proxy", () => {
    // Le symptôme : Next jugeait la réécriture externe, allait chercher
    // https://localhost:3200/introuvable, ne trouvait pas de TLS sur ce port,
    // et toute fiche inexistante répondait 500 au lieu de 404 en production.
    const url = internalRewriteUrl("/introuvable", "https://localhost:3200/tournois/id-inexistant");
    expect(url.href).toBe("http://localhost:3200/introuvable");
  });

  it("laisse intacte une origine déjà en clair", () => {
    const url = internalRewriteUrl("/introuvable", "http://localhost:3200/equipes/inconnue");
    expect(url.href).toBe("http://localhost:3200/introuvable");
  });

  it("conserve l'hôte et le port de la requête", () => {
    // L'hôte ne doit pas être réécrit : c'est celui que Next se reconnaît, et
    // c'est justement la comparaison d'origine qui décide interne ou externe.
    const url = internalRewriteUrl("/introuvable", "https://127.0.0.1:3210/joueurs/inconnu");
    expect(url.host).toBe("127.0.0.1:3210");
    expect(url.pathname).toBe("/introuvable");
  });

  it("ne traîne pas la query string de la requête d'origine", () => {
    const url = internalRewriteUrl("/introuvable", "https://localhost:3200/tournois/x?vue=arbre");
    expect(url.search).toBe("");
  });
});
