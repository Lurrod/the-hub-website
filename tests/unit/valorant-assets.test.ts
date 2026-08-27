import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { AGENT_ICONS, AGENT_COLORS } from "@/lib/agents";
import { MAP_SPLASH } from "@/lib/maps";
import { ROLE_ICONS } from "@/lib/roles";
import { WEAPON_ICONS } from "@/lib/weapons";

/*
 * Les tables de `src/lib/` et les fichiers de `public/valorant/` sont écrits
 * par la même commande (`npm run assets:valorant`) mais vivent dans deux
 * endroits : rien n'empêche un fichier d'être oublié à l'ajout, ou supprimé
 * après coup. Une entrée sans image ne casse rien à la compilation — elle
 * donne une icône brisée en production. D'où cette vérification.
 */
const TABLES: Record<string, Record<string, string>> = {
  agents: AGENT_ICONS,
  maps: MAP_SPLASH,
  roles: ROLE_ICONS,
  weapons: WEAPON_ICONS,
};

describe("assets Valorant rapatriés", () => {
  for (const [famille, table] of Object.entries(TABLES)) {
    it(`sert les ${famille} depuis public/ et non depuis un CDN tiers`, () => {
      const entrees = Object.entries(table);
      expect(entrees.length).toBeGreaterThan(0);
      for (const [nom, url] of entrees) {
        expect(url, nom).toMatch(new RegExp(`^/valorant/${famille}/[a-z0-9-]+\\.webp$`));
      }
    });

    it(`a le fichier de chaque ${famille} sur le disque`, () => {
      for (const [nom, url] of Object.entries(table)) {
        const fichier = path.join(process.cwd(), "public", url);
        expect(existsSync(fichier), `${nom} → ${url}`).toBe(true);
      }
    });
  }

  it("donne une couleur à chaque agent de la table d'icônes", () => {
    // Un agent ajouté par le script sans sa teinte apparaîtrait en gris neutre
    // sur les graphiques, au milieu d'agents colorés.
    for (const agent of Object.keys(AGENT_ICONS)) {
      expect(AGENT_COLORS[agent], agent).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
