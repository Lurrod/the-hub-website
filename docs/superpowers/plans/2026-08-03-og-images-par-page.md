# Images de partage générées par page — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'unique PNG de partage statique par une image générée à la volée pour chacune des neuf pages publiques partageables, portant l'identité et les chiffres de cette page.

**Architecture:** Convention Next `opengraph-image.tsx` : un fichier par segment de route, chacun très court, qui charge sa donnée et rend un cadre commun. Toute la mise en forme et tout le formatage vivent dans `src/lib/og/`. Next fabrique lui-même l'URL, le hash de contenu et les balises `og:image:*`.

**Tech Stack:** Next 16 (`next/og` → Satori + Resvg), Prisma, `sharp` (conversion WebP → PNG, déjà une dépendance), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-03-og-images-par-page-design.md`

---

## Contraintes à garder en tête sur toutes les tâches

Satori n'est pas un navigateur. Trois pièges reviennent :

1. **Flexbox uniquement.** `display: grid` ne fait rien. Tout élément qui a plus d'un enfant doit porter explicitement `display: "flex"`, sinon le rendu lève.
2. **Pas de CSS du site.** Aucune variable `var(--accent)`, aucune classe Tailwind. Les couleurs sont écrites en dur dans `src/lib/og/theme.ts`.
3. **Pas de WebP.** Les logos uploadés doivent passer par `sharp`. Le seul PNG lisible tel quel est `public/logo.png`.

## Structure des fichiers

| Fichier                                         | Responsabilité                                                 |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `assets/fonts/BricolageGrotesque-ExtraBold.ttf` | police d'affichage, versionnée                                 |
| `assets/fonts/GeistMono-Medium.ttf`             | police mono, versionnée                                        |
| `assets/fonts/README.md`                        | d'où viennent ces fichiers et comment les régénérer            |
| `src/lib/og/theme.ts`                           | couleurs et tailles, copiées des tokens CSS                    |
| `src/lib/og/size.ts`                            | `size` / `contentType`, réexportés par chaque route            |
| `src/lib/og/fonts.ts`                           | lecture mémoïsée des TTF                                       |
| `src/lib/og/image.ts`                           | clé d'upload → PNG en data URI, `null` si absent               |
| `src/lib/og/labels.ts`                          | formatage pur : dates, scores, bilans, badges, monogrammes     |
| `src/lib/og/fields.tsx`                         | briques JSX : titre, ligne de méta, bloc de chiffres, pastille |
| `src/lib/og/frame.tsx`                          | cadre commun + `renderOg()` qui enveloppe les erreurs          |
| `src/app/**/opengraph-image.tsx`                | 9 routes, 15 à 25 lignes chacune                               |
| `tests/unit/og-labels.test.ts`                  | couverture de `labels.ts`                                      |
| `tests/unit/og-image.test.ts`                   | couverture de `image.ts`                                       |

---

## Task 1 : Versionner les polices

**Files:**

- Create: `assets/fonts/BricolageGrotesque-ExtraBold.ttf`
- Create: `assets/fonts/GeistMono-Medium.ttf`
- Create: `assets/fonts/README.md`

- [ ] **Step 1: Télécharger les deux TTF**

L'agent utilisateur détermine le format servi par Google Fonts. Un UA trop vieux (IE 6) renvoie de l'**EOT**, que Satori ne décode pas ; un UA moderne renvoie du **WOFF2**, non supporté non plus. L'UA Android 2.2 ci-dessous est celui qui renvoie du TTF.

```bash
mkdir -p assets/fonts
UA="Mozilla/5.0 (Linux; U; Android 2.2; en-us; DROID2 Build/VZW) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
curl -sL -A "$UA" "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=Geist+Mono:wght@500"
```

La réponse contient deux URLs `.ttf`. Les télécharger :

```bash
curl -sL -o assets/fonts/BricolageGrotesque-ExtraBold.ttf "https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvZvlyM0vtewI.ttf"
curl -sL -o assets/fonts/GeistMono-Medium.ttf "https://fonts.gstatic.com/s/geistmono/v6/or3yQ6H-1_WfwkMZI_qYPLs1a-t7PU0AbeEPKJ5T7i5aOg.ttf"
```

- [ ] **Step 2: Vérifier que ce sont bien des TTF**

```bash
for f in assets/fonts/*.ttf; do printf "%s: " "$f"; head -c 4 "$f" | od -An -tx1; done
ls -l assets/fonts/
```

Attendu : les deux fichiers commencent par `00 01 00 00` (signature TrueType). Toute autre valeur — notamment `ec 42 01 00`, qui est de l'EOT — signifie que le mauvais UA a été utilisé : reprendre l'étape 1.
Attendu : environ 81 Ko et 70 Ko, soit 151 Ko à deux, sous le budget de 500 Ko par route.

- [ ] **Step 3: Documenter la provenance**

Créer `assets/fonts/README.md` :

```markdown
# Polices des images de partage

Satori, le moteur qui rend `opengraph-image.tsx`, ne voit pas les polices
`next/font/google` chargées par l'application : il lui faut des fichiers.
Il n'accepte que `ttf`, `otf` et `woff` — ni `woff2`, ni `eot`.

Ces deux fichiers sont les sous-ensembles latins servis par Google Fonts.
Pour les régénérer :

    UA="Mozilla/5.0 (Linux; U; Android 2.2; en-us; DROID2 Build/VZW) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1"
    curl -sL -A "$UA" "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=Geist+Mono:wght@500"

puis télécharger les deux URLs `.ttf` de la réponse.

L'agent utilisateur n'est pas décoratif : il décide du format servi. Un UA
moderne renvoie du `woff2`, un UA IE 6 renvoie de l'`eot`. Vérifier après
téléchargement que les fichiers commencent bien par `00 01 00 00`.
```

- [ ] **Step 4: Vérifier que `assets/` n'est pas ignoré par git**

```bash
git check-ignore -v assets/fonts/BricolageGrotesque-ExtraBold.ttf || echo "OK, suivi par git"
```

Attendu : `OK, suivi par git`. Si une règle du `.gitignore` attrape le fichier, ajouter `!assets/fonts/` au `.gitignore`.

- [ ] **Step 5: Commit**

```bash
git add assets/fonts/
git commit -m "chore(og): versionner les polices ttf du rendu des images de partage"
```

---

## Task 2 : Thème et constantes de route

**Files:**

- Create: `src/lib/og/theme.ts`
- Create: `src/lib/og/size.ts`

Aucun test : ce sont des constantes.

- [ ] **Step 1: Créer `src/lib/og/theme.ts`**

```ts
/**
 * Jetons de style des images de partage.
 *
 * Satori ne lit pas `src/app/globals.css` : les valeurs y sont recopiées à la
 * main. Toute modification des variables CSS du site doit être répercutée ici.
 */
export const OG = {
  bg: "#131619",
  card: "#191c22",
  category: "#1f232b",
  border: "#303133",
  accent: "#ED5E29",
  glow: "rgba(237, 94, 41, 0.30)",
  text: "#fafafa",
  muted: "#9b9c9e",
  subtle: "#6f7178",
} as const;

/** Les deux familles déclarées dans `fonts.ts`. */
export const DISPLAY = "Bricolage";
export const MONO = "GeistMono";
```

- [ ] **Step 2: Créer `src/lib/og/size.ts`**

```ts
/**
 * Métadonnées communes aux routes `opengraph-image.tsx`. Next lit ces exports
 * pour produire les balises `og:image:width`, `og:image:height` et
 * `og:image:type` ; chaque route les réexporte.
 */
export const size = { width: 1200, height: 630 };

export const contentType = "image/png";
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [ ] **Step 4: Commit**

```bash
git add src/lib/og/theme.ts src/lib/og/size.ts
git commit -m "feat(og): poser les jetons de style et les constantes de route"
```

---

## Task 3 : Formatage pur (`labels.ts`)

**Files:**

- Create: `src/lib/og/labels.ts`
- Test: `tests/unit/og-labels.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `tests/unit/og-labels.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import {
  bestOfLabel,
  dateRangeLabel,
  mapDiffLabel,
  mapsLabel,
  matchBadge,
  metaLine,
  monogram,
  recordLabel,
  scoreLabel,
  teamCountLabel,
  tournamentBadge,
} from "@/lib/og/labels";

describe("dateRangeLabel", () => {
  const debut = new Date("2026-08-12T00:00:00.000Z");
  const fin = new Date("2026-08-19T00:00:00.000Z");

  it("relie les deux dates", () => {
    expect(dateRangeLabel(debut, fin)).toBe("12 – 19 août 2026");
  });

  it("n'affiche qu'une date quand elles sont identiques", () => {
    expect(dateRangeLabel(debut, debut)).toBe("12 août 2026");
  });

  it("garde les deux mois quand ils diffèrent", () => {
    expect(dateRangeLabel(debut, new Date("2026-09-02T00:00:00.000Z"))).toBe(
      "12 août – 2 septembre 2026"
    );
  });

  it("tombe sur la seule date connue", () => {
    expect(dateRangeLabel(debut, null)).toBe("12 août 2026");
    expect(dateRangeLabel(null, fin)).toBe("19 août 2026");
  });

  it("renvoie une chaîne vide sans aucune date", () => {
    expect(dateRangeLabel(null, null)).toBe("");
  });
});

describe("teamCountLabel", () => {
  it("montre la limite quand elle existe", () => {
    expect(teamCountLabel(12, 16)).toBe("12/16 équipes");
  });

  it("omet la limite quand il n'y en a pas", () => {
    expect(teamCountLabel(12, null)).toBe("12 équipes");
  });

  it("accorde le singulier", () => {
    expect(teamCountLabel(1, null)).toBe("1 équipe");
  });
});

describe("bestOfLabel", () => {
  it("formate le nombre de maps", () => {
    expect(bestOfLabel(3)).toBe("Bo3");
  });
});

describe("scoreLabel", () => {
  it("sépare les scores par un tiret demi-cadratin", () => {
    expect(scoreLabel(2, 1)).toBe("2 – 1");
  });
});

describe("mapsLabel", () => {
  it("liste les maps et leurs scores", () => {
    expect(
      mapsLabel([
        { mapName: "Ascent", scoreA: 13, scoreB: 9 },
        { mapName: "Bind", scoreA: 8, scoreB: 13 },
      ])
    ).toBe("Ascent 13-9 · Bind 8-13");
  });

  it("renvoie une chaîne vide sans map", () => {
    expect(mapsLabel([])).toBe("");
  });
});

describe("recordLabel", () => {
  it("assemble bilan et winrate", () => {
    expect(recordLabel({ played: 11, wins: 8, losses: 3, winrate: 73 })).toBe("8V – 3D · 73%");
  });

  it("renvoie une chaîne vide sans match joué", () => {
    expect(recordLabel({ played: 0, wins: 0, losses: 0, winrate: 0 })).toBe("");
  });
});

describe("mapDiffLabel", () => {
  it("signe les différences positives", () => {
    expect(mapDiffLabel(7)).toBe("+7");
  });

  it("garde le signe des différences négatives", () => {
    expect(mapDiffLabel(-3)).toBe("-3");
  });

  it("n'ajoute pas de signe à zéro", () => {
    expect(mapDiffLabel(0)).toBe("0");
  });
});

describe("monogram", () => {
  it("prend la première lettre en majuscule", () => {
    expect(monogram("Karmine Corp")).toBe("K");
  });

  it("translittère les accents", () => {
    expect(monogram("Élan")).toBe("E");
  });

  it("saute la ponctuation initiale", () => {
    expect(monogram("!!! Team")).toBe("T");
  });

  it("accepte un chiffre initial", () => {
    expect(monogram("4Merical")).toBe("4");
  });

  it("retombe sur un point d'interrogation", () => {
    expect(monogram("")).toBe("?");
    expect(monogram("···")).toBe("?");
  });
});

describe("metaLine", () => {
  it("écarte les segments vides", () => {
    expect(metaLine(["Double élimination", null, "France", "", undefined])).toBe(
      "Double élimination · France"
    );
  });

  it("renvoie une chaîne vide quand tout est vide", () => {
    expect(metaLine([null, "", undefined])).toBe("");
  });
});

describe("tournamentBadge", () => {
  it("suffixe le statut sauf pour un tournoi à venir", () => {
    expect(tournamentBadge("ONGOING")).toBe("TOURNOI · EN COURS");
    expect(tournamentBadge("FINISHED")).toBe("TOURNOI · TERMINÉ");
    expect(tournamentBadge("UPCOMING")).toBe("TOURNOI");
  });
});

describe("matchBadge", () => {
  it("suffixe le statut sauf pour un match programmé", () => {
    expect(matchBadge("LIVE")).toBe("MATCH · EN DIRECT");
    expect(matchBadge("FINISHED")).toBe("MATCH · TERMINÉ");
    expect(matchBadge("SCHEDULED")).toBe("MATCH");
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `npx vitest run tests/unit/og-labels.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/og/labels"`.

- [ ] **Step 3: Écrire `src/lib/og/labels.ts`**

```ts
import type { MatchStatus, TournamentStatus } from "@/lib/constants";

/** Jour et mois en toutes lettres, sans année : « 12 août ». */
function dayMonth(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
}

/** Jour, mois et année : « 12 août 2026 ». */
function fullDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Plage de dates d'un tournoi. L'année n'est écrite qu'une fois, et le mois
 * n'est répété que s'il change. Chaîne vide si aucune date n'est connue.
 */
export function dateRangeLabel(start: Date | null, end: Date | null): string {
  if (!start && !end) return "";
  if (!start) return fullDate(end as Date);
  if (!end) return fullDate(start);
  if (start.getTime() === end.getTime()) return fullDate(start);

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    return `${start.getUTCDate()} – ${fullDate(end)}`;
  }
  if (sameYear) {
    return `${dayMonth(start)} – ${fullDate(end)}`;
  }
  return `${fullDate(start)} – ${fullDate(end)}`;
}

/** « 12/16 équipes », ou « 12 équipes » quand le tournoi n'a pas de limite. */
export function teamCountLabel(count: number, max: number | null): string {
  const noun = count > 1 ? "équipes" : "équipe";
  return max != null ? `${count}/${max} ${noun}` : `${count} ${noun}`;
}

/** « Bo3 ». */
export function bestOfLabel(bestOf: number): string {
  return `Bo${bestOf}`;
}

/** « 2 – 1 ». Tiret demi-cadratin, cohérent avec l'affichage du site. */
export function scoreLabel(a: number, b: number): string {
  return `${a} – ${b}`;
}

/** « Ascent 13-9 · Bind 8-13 ». Chaîne vide si le match n'a pas de map jouée. */
export function mapsLabel(
  maps: readonly { mapName: string; scoreA: number; scoreB: number }[]
): string {
  return maps.map((m) => `${m.mapName} ${m.scoreA}-${m.scoreB}`).join(" · ");
}

/** « 8V – 3D · 73% ». Chaîne vide tant que l'équipe n'a pas joué. */
export function recordLabel(record: {
  played: number;
  wins: number;
  losses: number;
  winrate: number;
}): string {
  if (record.played === 0) return "";
  return `${record.wins}V – ${record.losses}D · ${record.winrate}%`;
}

/** Différence de maps signée : « +7 », « -3 », « 0 ». */
export function mapDiffLabel(diff: number): string {
  return diff > 0 ? `+${diff}` : String(diff);
}

const DIACRITICS = /[̀-ͯ]/g;

/**
 * Lettre de repli affichée quand une entité n'a ni logo ni photo. Prend le
 * premier caractère alphanumérique, accents retirés ; « ? » si le nom n'en
 * contient aucun.
 */
export function monogram(name: string): string {
  const flat = name.normalize("NFD").replace(DIACRITICS, "");
  const match = flat.match(/[a-zA-Z0-9]/);
  return match ? match[0].toUpperCase() : "?";
}

/** Assemble des segments en écartant les vides : « Format · Région · Dates ». */
export function metaLine(parts: readonly (string | null | undefined)[]): string {
  return parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(" · ");
}

const TOURNAMENT_BADGE_SUFFIX: Record<TournamentStatus, string> = {
  UPCOMING: "",
  ONGOING: " · EN COURS",
  FINISHED: " · TERMINÉ",
};

/** « TOURNOI · EN COURS ». Un tournoi à venir n'est pas suffixé : c'est le cas nominal. */
export function tournamentBadge(status: TournamentStatus): string {
  return `TOURNOI${TOURNAMENT_BADGE_SUFFIX[status]}`;
}

const MATCH_BADGE_SUFFIX: Record<MatchStatus, string> = {
  SCHEDULED: "",
  LIVE: " · EN DIRECT",
  FINISHED: " · TERMINÉ",
};

/** « MATCH · TERMINÉ ». Un match programmé n'est pas suffixé. */
export function matchBadge(status: MatchStatus): string {
  return `MATCH${MATCH_BADGE_SUFFIX[status]}`;
}
```

- [ ] **Step 4: Lancer les tests pour les voir passer**

Run: `npx vitest run tests/unit/og-labels.test.ts`
Expected: PASS, 26 tests.

Si `dateRangeLabel` échoue sur le mois, vérifier que `timeZone: "UTC"` est bien passé : les dates viennent d'un `<input type="date">` et valent minuit UTC, donc les formater en heure locale les décale d'un jour vers la veille sur un fuseau négatif.

- [ ] **Step 5: Commit**

```bash
git add src/lib/og/labels.ts tests/unit/og-labels.test.ts
git commit -m "feat(og): formater dates, scores, bilans et badges des images de partage"
```

---

## Task 4 : Lecture des uploads (`image.ts`)

**Files:**

- Create: `src/lib/og/image.ts`
- Test: `tests/unit/og-image.test.ts`

Les logos sont stockés en WebP sous `uploads/<catégorie>/<id>.webp` et la base retient la clé publique `/api/images/<catégorie>/<id>.webp` (voir `imageKeyFor` dans `src/lib/images.ts`). Satori ne décode pas le WebP : il faut convertir.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `tests/unit/og-image.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { uploadAsPngDataUri } from "@/lib/og/image";

describe("uploadAsPngDataUri", () => {
  it("renvoie null quand aucune clé n'est fournie", async () => {
    await expect(uploadAsPngDataUri(null)).resolves.toBeNull();
  });

  it("renvoie null sur un fichier absent", async () => {
    await expect(uploadAsPngDataUri("/api/images/teams/inexistant.webp")).resolves.toBeNull();
  });

  it("renvoie null sur une catégorie inconnue", async () => {
    await expect(uploadAsPngDataUri("/api/images/secrets/x.webp")).resolves.toBeNull();
  });

  it("renvoie null sur une tentative de traversée", async () => {
    await expect(uploadAsPngDataUri("/api/images/teams/../../.env")).resolves.toBeNull();
  });

  it("renvoie null sur une clé qui ne suit pas le préfixe attendu", async () => {
    await expect(uploadAsPngDataUri("https://exemple.test/logo.png")).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `npx vitest run tests/unit/og-image.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/og/image"`.

- [ ] **Step 3: Écrire `src/lib/og/image.ts`**

```ts
import { promises as fs } from "node:fs";
import sharp from "sharp";
import { resolveUploadPath } from "@/lib/images";

const KEY_PREFIX = "/api/images/";

/**
 * Convertit un upload en PNG inlinable par Satori, qui ne décode pas le WebP.
 *
 * La lecture se fait directement sur le disque plutôt que par une requête HTTP
 * vers `/api/images/…` : le rendu tourne dans le même processus que la route
 * qui servirait le fichier, une requête interne serait un aller-retour inutile
 * et une source de blocage.
 *
 * @param key clé publique stockée en base (`team.logo`, `player.photo`, …).
 * @param sizePx côté maximum de l'image produite, sans agrandissement.
 * @returns un data URI, ou `null` si la clé est absente, malformée ou pointe
 *   sur un fichier illisible. L'appelant retombe alors sur le monogramme.
 */
export async function uploadAsPngDataUri(
  key: string | null | undefined,
  sizePx = 160
): Promise<string | null> {
  if (!key || !key.startsWith(KEY_PREFIX)) return null;

  try {
    const segments = key.slice(KEY_PREFIX.length).split("/");
    const filePath = resolveUploadPath(segments);
    const source = await fs.readFile(filePath);
    const png = await sharp(source)
      .resize(sizePx, sizePx, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    // Un logo manquant ou corrompu ne doit jamais priver la page de sa carte
    // de partage : le monogramme prend le relais.
    return null;
  }
}
```

- [ ] **Step 4: Lancer les tests pour les voir passer**

Run: `npx vitest run tests/unit/og-image.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/og/image.ts tests/unit/og-image.test.ts
git commit -m "feat(og): convertir les uploads webp en png inlinable"
```

---

## Task 5 : Polices, cadre et briques JSX

**Files:**

- Create: `src/lib/og/fonts.ts`
- Create: `src/lib/og/fields.tsx`
- Create: `src/lib/og/frame.tsx`

Pas de test unitaire : ce sont des entrées/sorties et du rendu, vérifiés à l'œil en Task 10.

- [ ] **Step 1: Créer `src/lib/og/fonts.ts`**

```ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DISPLAY, MONO } from "@/lib/og/theme";

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 500 | 800;
  style: "normal";
};

/** Buffer Node → ArrayBuffer exact, sans embarquer le reste du pool alloué. */
function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

async function load(): Promise<OgFont[]> {
  const dir = path.join(process.cwd(), "assets", "fonts");
  const [display, mono] = await Promise.all([
    readFile(path.join(dir, "BricolageGrotesque-ExtraBold.ttf")),
    readFile(path.join(dir, "GeistMono-Medium.ttf")),
  ]);
  return [
    { name: DISPLAY, data: toArrayBuffer(display), weight: 800, style: "normal" },
    { name: MONO, data: toArrayBuffer(mono), weight: 500, style: "normal" },
  ];
}

let cache: Promise<OgFont[]> | null = null;

/**
 * Polices passées à `ImageResponse`. Mémoïsé au niveau du module : le disque
 * n'est lu qu'une fois par processus, pas à chaque image générée.
 */
export function ogFonts(): Promise<OgFont[]> {
  cache ??= load();
  return cache;
}
```

- [ ] **Step 2: Créer `src/lib/og/fields.tsx`**

Rappel Satori : tout élément à plusieurs enfants porte `display: "flex"`.

```tsx
import { DISPLAY, MONO, OG } from "@/lib/og/theme";
import { monogram } from "@/lib/og/labels";

/** Titre principal de la carte. La taille baisse quand le nom est long. */
export function Title({ children }: { children: string }) {
  const fontSize = children.length > 28 ? 56 : children.length > 18 ? 68 : 80;
  return (
    <div
      style={{
        fontFamily: DISPLAY,
        fontSize,
        color: OG.text,
        lineHeight: 1.05,
        maxWidth: 900,
      }}
    >
      {children}
    </div>
  );
}

/** Ligne de contexte sous le titre. Ne rend rien si elle est vide. */
export function Meta({ children }: { children: string }) {
  if (!children) return null;
  return <div style={{ fontFamily: MONO, fontSize: 26, color: OG.muted }}>{children}</div>;
}

/** Ligne de chiffres, en mono et en orange. Ne rend rien si elle est vide. */
export function Stats({ children }: { children: string }) {
  if (!children) return null;
  return <div style={{ fontFamily: MONO, fontSize: 30, color: OG.accent }}>{children}</div>;
}

/**
 * Logo d'une entité, ou son monogramme quand l'image est absente.
 * `src` vient de `uploadAsPngDataUri`, qui renvoie `null` en cas d'échec.
 */
export function Avatar({
  src,
  name,
  size = 120,
  rounded = 20,
}: {
  src: string | null;
  name: string;
  size?: number;
  rounded?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: rounded, objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: rounded,
        backgroundColor: OG.category,
        border: `2px solid ${OG.border}`,
        fontFamily: DISPLAY,
        fontSize: size * 0.45,
        color: OG.muted,
      }}
    >
      {monogram(name)}
    </div>
  );
}
```

- [ ] **Step 3: Créer `src/lib/og/frame.tsx`**

```tsx
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og/fonts";
import { size } from "@/lib/og/size";
import { DISPLAY, MONO, OG } from "@/lib/og/theme";

const SITE_HOST = "the-hub-vrc.fr";

let wordmarkCache: Promise<string> | null = null;

/** `public/logo.png` en data URI. Déjà en PNG : aucune conversion nécessaire. */
function wordmark(): Promise<string> {
  wordmarkCache ??= readFile(path.join(process.cwd(), "public", "logo.png")).then(
    (buf) => `data:image/png;base64,${buf.toString("base64")}`
  );
  return wordmarkCache;
}

/**
 * Cadre commun à toutes les cartes : halo, bandeau de marque, badge de type,
 * pied de page. Le contenu propre à chaque page passe par `children`.
 */
async function Frame({ badge, children }: { badge: string; children: React.ReactNode }) {
  const logo = await wordmark();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: OG.bg,
        padding: 56,
        position: "relative",
        fontFamily: DISPLAY,
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: -200,
          left: -160,
          width: 700,
          height: 700,
          background: `radial-gradient(circle, ${OG.glow} 0%, rgba(237,94,41,0) 70%)`,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" width={48} height={48} style={{ borderRadius: 10 }} />
        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            letterSpacing: 3,
            color: OG.accent,
          }}
        >
          {badge}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: 18,
        }}
      >
        {children}
      </div>

      <div style={{ fontFamily: MONO, fontSize: 24, color: OG.accent }}>{SITE_HOST}</div>
    </div>
  );
}

/**
 * Rend une carte de partage.
 *
 * Toute exception retombe sur le cadre nu portant le seul badge : une erreur
 * non rattrapée renverrait une 500 à Discord, donc *aucun* aperçu, là où
 * l'image de marque aurait fait l'affaire.
 *
 * L'en-tête de cache est court parce que les cartes portent des chiffres :
 * inutile d'ajouter notre propre cache à celui des plateformes, qui gardent
 * déjà l'image par URL.
 */
export async function renderOg(
  badge: string,
  build: () => Promise<React.ReactNode> | React.ReactNode
): Promise<ImageResponse> {
  let body: React.ReactNode;
  try {
    body = await build();
  } catch {
    body = null;
  }

  return new ImageResponse(await Frame({ badge, children: body }), {
    ...size,
    fonts: await ogFonts(),
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [ ] **Step 5: Commit**

```bash
git add src/lib/og/fonts.ts src/lib/og/fields.tsx src/lib/og/frame.tsx
git commit -m "feat(og): construire le cadre commun des images de partage"
```

---

## Task 6 : Les cinq pages d'index

**Files:**

- Create: `src/app/tournois/opengraph-image.tsx`
- Create: `src/app/equipes/opengraph-image.tsx`
- Create: `src/app/matchs/opengraph-image.tsx`
- Create: `src/app/lft/opengraph-image.tsx`
- Create: `src/app/recherche/opengraph-image.tsx`

Ces routes valident la chaîne complète avec le minimum de données. Les faire en premier.

- [ ] **Step 1: `src/app/tournois/opengraph-image.tsx`**

```tsx
import { db } from "@/lib/db";
import { Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";
import { metaLine } from "@/lib/og/labels";

export const alt = "Tous les tournois du Tier 3 Valorant francophone";
export { contentType, size } from "@/lib/og/size";

export default async function Image() {
  return renderOg("TOURNOIS", async () => {
    const [total, ongoing] = await Promise.all([
      db.tournament.count(),
      db.tournament.count({ where: { status: "ONGOING" } }),
    ]);
    return (
      <>
        <Title>Tous les tournois</Title>
        <Stats>
          {metaLine([
            `${total} ${total > 1 ? "tournois" : "tournoi"}`,
            ongoing > 0 ? `${ongoing} en cours` : null,
          ])}
        </Stats>
      </>
    );
  });
}
```

- [ ] **Step 2: `src/app/equipes/opengraph-image.tsx`**

```tsx
import { db } from "@/lib/db";
import { Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";

export const alt = "Toutes les équipes du Tier 3 Valorant francophone";
export { contentType, size } from "@/lib/og/size";

export default async function Image() {
  return renderOg("ÉQUIPES", async () => {
    const total = await db.team.count();
    return (
      <>
        <Title>Toutes les équipes</Title>
        <Stats>{`${total} ${total > 1 ? "équipes" : "équipe"}`}</Stats>
      </>
    );
  });
}
```

- [ ] **Step 3: `src/app/matchs/opengraph-image.tsx`**

```tsx
import { db } from "@/lib/db";
import { Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";

export const alt = "Tous les matchs du Tier 3 Valorant francophone";
export { contentType, size } from "@/lib/og/size";

export default async function Image() {
  return renderOg("MATCHS", async () => {
    const played = await db.match.count({ where: { status: "FINISHED" } });
    return (
      <>
        <Title>Tous les matchs</Title>
        <Stats>{`${played} ${played > 1 ? "matchs joués" : "match joué"}`}</Stats>
      </>
    );
  });
}
```

- [ ] **Step 4: `src/app/lft/opengraph-image.tsx`**

```tsx
import { db } from "@/lib/db";
import { Meta, Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";

export const alt = "Joueurs en recherche d'équipe";
export { contentType, size } from "@/lib/og/size";

export default async function Image() {
  return renderOg("LFT", async () => {
    const total = await db.player.count({ where: { lft: true } });
    return (
      <>
        <Title>Joueurs libres</Title>
        <Meta>Les joueurs qui cherchent une équipe</Meta>
        <Stats>{`${total} ${total > 1 ? "joueurs disponibles" : "joueur disponible"}`}</Stats>
      </>
    );
  });
}
```

- [ ] **Step 5: `src/app/recherche/opengraph-image.tsx`**

```tsx
import { Meta, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";

export const alt = "Rechercher une équipe, un joueur ou un tournoi";
export { contentType, size } from "@/lib/og/size";

export default async function Image() {
  return renderOg("RECHERCHE", () => (
    <>
      <Title>Rechercher</Title>
      <Meta>Une équipe, un joueur, un tournoi</Meta>
    </>
  ));
}
```

- [ ] **Step 6: Vérifier le rendu en développement**

```bash
npm run dev
```

Ouvrir les cinq URLs dans un navigateur ; chacune doit afficher une image `1200×630` :

- http://localhost:3200/tournois/opengraph-image
- http://localhost:3200/equipes/opengraph-image
- http://localhost:3200/matchs/opengraph-image
- http://localhost:3200/lft/opengraph-image
- http://localhost:3200/recherche/opengraph-image

Si une route renvoie une 500, l'erreur est dans le cadre lui-même (pas dans le `build()`, qui est rattrapé) : la cause la plus fréquente est un élément à plusieurs enfants sans `display: "flex"`.

- [ ] **Step 7: Commit**

```bash
git add src/app/tournois/opengraph-image.tsx src/app/equipes/opengraph-image.tsx src/app/matchs/opengraph-image.tsx src/app/lft/opengraph-image.tsx src/app/recherche/opengraph-image.tsx
git commit -m "feat(og): images de partage des cinq pages d index"
```

---

## Task 7 : Fiche tournoi

**Files:**

- Create: `src/app/tournois/[id]/opengraph-image.tsx`

- [ ] **Step 1: Écrire la route**

```tsx
import { TOURNAMENT_FORMAT_LABELS, type TournamentFormat } from "@/lib/constants";
import { getTournament } from "@/lib/data/tournaments";
import { db } from "@/lib/db";
import { Avatar, Meta, Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";
import { uploadAsPngDataUri } from "@/lib/og/image";
import { dateRangeLabel, metaLine, teamCountLabel, tournamentBadge } from "@/lib/og/labels";

export const alt = "Tournoi";
export { contentType, size } from "@/lib/og/size";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) return renderOg("TOURNOI", () => null);

  const [logo, participants] = await Promise.all([
    uploadAsPngDataUri(tournament.logo),
    db.tournamentParticipant.count({ where: { tournamentId: id } }),
  ]);

  return renderOg(tournamentBadge(tournament.status), () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Avatar src={logo} name={tournament.name} />
        <Title>{tournament.name}</Title>
      </div>
      <Meta>
        {metaLine([
          TOURNAMENT_FORMAT_LABELS[tournament.format as TournamentFormat],
          tournament.region,
          dateRangeLabel(tournament.startDate, tournament.endDate),
        ])}
      </Meta>
      <Stats>
        {metaLine([teamCountLabel(participants, tournament.maxTeams), tournament.prizePool])}
      </Stats>
    </>
  ));
}
```

- [ ] **Step 2: Vérifier le rendu**

Récupérer l'identifiant d'un tournoi de démonstration :

```bash
npx tsx -e "import{db}from'./src/lib/db';db.tournament.findMany({select:{id:true,name:true},take:3}).then(r=>{console.log(r);process.exit(0)})"
```

Ouvrir `http://localhost:3200/tournois/<id>/opengraph-image` pour un tournoi **avec** logo et un **sans** logo (le second doit afficher le monogramme).

Vérifier aussi `http://localhost:3200/tournois/inexistant/opengraph-image` : le cadre nu portant `TOURNOI` doit s'afficher, pas une erreur.

- [ ] **Step 3: Commit**

```bash
git add src/app/tournois/[id]/opengraph-image.tsx
git commit -m "feat(og): image de partage d une fiche tournoi"
```

---

## Task 8 : Fiche équipe

**Files:**

- Create: `src/app/equipes/[id]/opengraph-image.tsx`

- [ ] **Step 1: Écrire la route**

```tsx
import { getTeam } from "@/lib/data/teams";
import { getTeamRecord } from "@/lib/data/matches";
import { Avatar, Meta, Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";
import { uploadAsPngDataUri } from "@/lib/og/image";
import { mapDiffLabel, metaLine, recordLabel } from "@/lib/og/labels";

export const alt = "Équipe";
export { contentType, size } from "@/lib/og/size";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) return renderOg("ÉQUIPE", () => null);

  const [logo, record] = await Promise.all([uploadAsPngDataUri(team.logo), getTeamRecord(id)]);

  return renderOg("ÉQUIPE", () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Avatar src={logo} name={team.name} />
        <Title>{team.name}</Title>
      </div>
      <Meta>{metaLine([team.tag, team.region])}</Meta>
      <Stats>
        {metaLine([
          recordLabel(record),
          record.played > 0 ? `${mapDiffLabel(record.mapDiff)} maps` : null,
        ])}
      </Stats>
    </>
  ));
}
```

`getTeam` (`src/lib/data/teams.ts:53`) est un `findUnique` sans `select` : il renvoie la ligne complète, donc `logo`, `tag` et `region` sont bien là.

- [ ] **Step 2: Vérifier le rendu**

```bash
npx tsx -e "import{db}from'./src/lib/db';db.team.findMany({select:{id:true,name:true,logo:true},take:5}).then(r=>{console.log(r);process.exit(0)})"
```

Ouvrir la route pour une équipe avec logo, une sans logo, et une sans match joué (la ligne de chiffres doit disparaître, pas afficher `0V – 0D · 0%`).

- [ ] **Step 3: Commit**

```bash
git add src/app/equipes/[id]/opengraph-image.tsx
git commit -m "feat(og): image de partage d une fiche equipe"
```

---

## Task 9 : Fiche joueur

**Files:**

- Create: `src/app/joueurs/[id]/opengraph-image.tsx`

Le joueur n'a pas d'agrégat tout prêt : les moyennes se calculent ici, à partir de `PlayerGameStat`.

- [ ] **Step 1: Écrire la route**

```tsx
import { getActiveMembership, getPlayer } from "@/lib/data/players";
import { db } from "@/lib/db";
import { ROLE_LABELS, type ValorantRoleKey } from "@/lib/roles";
import { Avatar, Meta, Stats, Title } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";
import { uploadAsPngDataUri } from "@/lib/og/image";
import { metaLine } from "@/lib/og/labels";

export const alt = "Joueur";
export { contentType, size } from "@/lib/og/size";

/** Moyennes de carrière du joueur, `null` tant qu'aucune map n'est enregistrée. */
async function careerAverages(playerId: string) {
  const agg = await db.playerGameStat.aggregate({
    where: { playerId },
    _avg: { rating: true, acs: true },
    _sum: { kills: true, deaths: true },
    _count: { _all: true },
  });
  if (agg._count._all === 0) return null;
  const kills = agg._sum.kills ?? 0;
  const deaths = agg._sum.deaths ?? 0;
  return {
    rating: (agg._avg.rating ?? 0).toFixed(2),
    acs: Math.round(agg._avg.acs ?? 0),
    kd: deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2),
  };
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) return renderOg("JOUEUR", () => null);

  const [photo, membership, stats] = await Promise.all([
    uploadAsPngDataUri(player.photo),
    getActiveMembership(id),
    careerAverages(id),
  ]);

  return renderOg("JOUEUR", () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <Avatar src={photo} name={player.pseudo} rounded={60} />
        <Title>{player.pseudo}</Title>
      </div>
      <Meta>
        {metaLine([
          membership?.team.name,
          player.valorantRole ? ROLE_LABELS[player.valorantRole as ValorantRoleKey] : null,
          player.nationality,
        ])}
      </Meta>
      <Stats>
        {stats ? metaLine([`Rating ${stats.rating}`, `ACS ${stats.acs}`, `K/D ${stats.kd}`]) : ""}
      </Stats>
    </>
  ));
}
```

- [ ] **Step 2: Vérifier le rendu**

```bash
npx tsx -e "import{db}from'./src/lib/db';db.player.findMany({select:{id:true,pseudo:true,photo:true},take:5}).then(r=>{console.log(r);process.exit(0)})"
```

Ouvrir la route pour un joueur avec photo, un sans photo, et un sans aucune statistique (la ligne de chiffres doit disparaître).

- [ ] **Step 3: Commit**

```bash
git add src/app/joueurs/[id]/opengraph-image.tsx
git commit -m "feat(og): image de partage d une fiche joueur"
```

---

## Task 10 : Fiche match

**Files:**

- Create: `src/app/matchs/[id]/opengraph-image.tsx`

La carte la plus dense : deux logos, un score au centre, le contexte du tournoi et le détail des maps.

- [ ] **Step 1: Écrire la route**

```tsx
import { getMatch } from "@/lib/data/matches";
import { Avatar, Meta, Stats } from "@/lib/og/fields";
import { renderOg } from "@/lib/og/frame";
import { uploadAsPngDataUri } from "@/lib/og/image";
import { bestOfLabel, mapsLabel, matchBadge, metaLine, scoreLabel } from "@/lib/og/labels";
import { DISPLAY, OG } from "@/lib/og/theme";

export const alt = "Match";
export { contentType, size } from "@/lib/og/size";

/** Un côté du duel : logo au-dessus, nom en dessous, sur une colonne fixe. */
function Side({ src, name }: { src: string | null; name: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        width: 380,
      }}
    >
      <Avatar src={src} name={name} size={128} />
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize: name.length > 16 ? 32 : 40,
          color: OG.text,
          textAlign: "center",
        }}
      >
        {name}
      </div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) return renderOg("MATCH", () => null);

  const [logoA, logoB] = await Promise.all([
    uploadAsPngDataUri(match.teamA.logo),
    uploadAsPngDataUri(match.teamB.logo),
  ]);

  // Le score n'a de sens qu'une fois le match commencé : avant, la carte
  // annonce l'affiche, pas un 0 – 0 qui se lirait comme un résultat.
  const center = match.status === "SCHEDULED" ? "VS" : scoreLabel(match.scoreA, match.scoreB);

  return renderOg(matchBadge(match.status), () => (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Side src={logoA} name={match.teamA.name} />
        <div style={{ fontFamily: DISPLAY, fontSize: 72, color: OG.accent }}>{center}</div>
        <Side src={logoB} name={match.teamB.name} />
      </div>
      <Meta>{metaLine([match.tournament.name, match.round, bestOfLabel(match.bestOf)])}</Meta>
      <Stats>{mapsLabel(match.maps)}</Stats>
    </>
  ));
}
```

- [ ] **Step 2: Vérifier le rendu**

```bash
npx tsx -e "import{db}from'./src/lib/db';db.match.findMany({select:{id:true,status:true,round:true},take:8}).then(r=>{console.log(r);process.exit(0)})"
```

Ouvrir la route pour un match `FINISHED` avec des maps, un match `SCHEDULED` (doit afficher `VS` et aucune ligne de maps), et un match dont une équipe n'a pas de logo.

Vérifier qu'un nom d'équipe long ne déborde pas de sa colonne de 380 px ; si c'est le cas, baisser le seuil `name.length > 16`.

- [ ] **Step 3: Commit**

```bash
git add src/app/matchs/[id]/opengraph-image.tsx
git commit -m "feat(og): image de partage d une fiche match"
```

---

## Task 11 : Vérification d'ensemble

**Files:**

- Modify: aucun, sauf correctif révélé par les vérifications

- [ ] **Step 1: Suite complète**

```bash
npx tsc --noEmit
npm run lint
npm run test
```

Expected: aucune erreur de type, aucune erreur de lint, tous les tests au vert (223 avant ce plan, plus 31 ajoutés en Task 3 et 4 → 254).

- [ ] **Step 2: Build de production**

```bash
npm run build
```

Expected: build réussi. Les neuf routes `opengraph-image` apparaissent dans le tableau des routes. Aucun avertissement de dépassement de taille : le budget Satori est de 500 Ko par route, et les deux polices n'en pèsent que 151 Ko.

- [ ] **Step 3: Vérifier que les balises sont bien posées**

```bash
npm run start &
sleep 5
curl -s http://localhost:3200/tournois | grep -o '<meta property="og:image[^>]*>'
curl -s http://localhost:3200/equipes | grep -o '<meta property="og:image[^>]*>'
```

Expected: pour chaque page, une balise `og:image` pointant vers `/…/opengraph-image` avec un paramètre de hash, plus `og:image:width` à `1200` et `og:image:height` à `630`.

Vérifier aussi que l'accueil sert toujours le PNG statique :

```bash
curl -s http://localhost:3200/ | grep -o '<meta property="og:image[^>]*>'
```

Expected: une URL contenant `opengraph-image.png`.

- [ ] **Step 4: Revue visuelle des neuf routes**

Ouvrir les neuf images et vérifier, sur chacune :

- le texte ne déborde ni horizontalement ni verticalement ;
- les polices sont bien Bricolage (titres) et Geist Mono (badge, méta, chiffres), pas une police de repli ;
- le halo orange est visible en haut à gauche ;
- le pied affiche `the-hub-vrc.fr`.

- [ ] **Step 5: Commit final**

Ne commiter que si les étapes précédentes ont demandé des correctifs :

```bash
git add -A
git commit -m "fix(og): ajustements issus de la revue visuelle des cartes"
```

---

## Auto-revue du plan

**Couverture de la spec**

| Exigence de la spec                                                            | Tâche                                                         |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 9 routes (4 fiches + 5 index)                                                  | 6, 7, 8, 9, 10                                                |
| Accueil et pages légales inchangés                                             | 11 step 3                                                     |
| Cadre commun, tokens recopiés                                                  | 2, 5                                                          |
| `size.ts` / `fonts.ts` / `image.ts` / `labels.ts` / `fields.tsx` / `frame.tsx` | 2, 3, 4, 5                                                    |
| Polices TTF versionnées, budget 500 Ko                                         | 1, 11 step 2                                                  |
| Conversion WebP → PNG par `sharp`                                              | 4                                                             |
| Chiffres sur les cartes                                                        | 7, 8, 9, 10                                                   |
| Dégradation : monogramme, ligne vide, cadre nu                                 | 3 (`monogram`), 5 (`Avatar`, `Stats`), 7–10 (garde `if (!x)`) |
| Erreur rattrapée, jamais de 500                                                | 5 (`renderOg`)                                                |
| `Cache-Control` court                                                          | 5 (`renderOg`)                                                |
| Tests de `labels.ts` et `image.ts`                                             | 3, 4                                                          |
| `src/lib/metadata.ts` inchangé                                                 | aucune tâche ne le touche                                     |

**Écart assumé.** La spec listait `fields.tsx` comme unique module de contenu ; le plan le scinde en `labels.ts` (pur, testé) et `fields.tsx` (JSX). La spec a été mise à jour en conséquence.

**Cohérence des types.** `uploadAsPngDataUri(key, sizePx?)` est appelée avec une seule clé partout. `renderOg(badge, build)` reçoit toujours un `badge` déjà formaté par `labels.ts`. `Avatar` prend `src: string | null`, exactement ce que renvoie `uploadAsPngDataUri`. `Stats` et `Meta` prennent une `string` et ne rendent rien si elle est vide, d'où les `metaLine([…])` qui renvoient `""` plutôt que `null`.
