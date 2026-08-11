# Cartes de partage téléchargeables — plan d'implémentation

**Goal:** Depuis une fiche de match ou de joueur, ouvrir une modale qui montre une carte carrée 1080×1080, la télécharge en PNG, copie le lien de la page, et la passe au partage natif sur mobile.

**Architecture:** Deux `route.tsx` sous les segments de fiche (`/matchs/[id]/carte`, `/joueurs/[id]/carte`) qui rendent le cadre `src/lib/og/` existant, paramétré en carré. Un composant client unique porte le bouton et la modale, sur la mécanique de dialogue déjà partagée par `NavDrawer` et `UserMenu`.

**Tech Stack:** Next 16 (`next/og` → Satori + Resvg), Prisma, `sharp`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-11-cartes-partage-design.md`

---

## Contraintes reprises des cartes OG

Elles valent à l'identique ici, le moteur de rendu est le même :

1. **Flexbox uniquement.** `display: grid` ne fait rien ; tout conteneur à plusieurs enfants porte `display: "flex"` explicitement, sinon le rendu lève.
2. **Pas de CSS du site.** Couleurs en dur depuis `src/lib/og/theme.ts`.
3. **Pas de WebP.** Les logos et photos uploadés passent par `uploadAsPngDataUri`.
4. **Pas de `React.Fragment`** en enfant direct d'un conteneur flex — `flattenFragments` du cadre s'en charge.

## Structure des fichiers

| Fichier                                | Responsabilité                                      |
| -------------------------------------- | --------------------------------------------------- |
| `src/lib/og/size.ts`                   | + `shareSize` (1080×1080)                           |
| `src/lib/og/frame.tsx`                 | `renderOg` prend un format et un padding optionnels |
| `src/lib/og/labels.ts`                 | + `shareCardFilename`, `mvpLabel`, `agentsLabel`    |
| `src/lib/og/fields.tsx`                | + `StatCell` (chiffre + libellé), `StatGrid`        |
| `src/app/matchs/[id]/carte/route.tsx`  | carte de match                                      |
| `src/app/joueurs/[id]/carte/route.tsx` | carte de joueur                                     |
| `src/components/share-card-button.tsx` | bouton + modale (client)                            |
| `src/app/matchs/[id]/page.tsx`         | pose le bouton dans le bandeau                      |
| `src/app/joueurs/[id]/page.tsx`        | pose le bouton dans l'en-tête                       |
| `tests/unit/share-card.test.ts`        | formatage pur                                       |
| `tests/e2e/share-card.spec.ts`         | parcours complet                                    |

---

## Tâche 1 — Formatage pur (TDD)

- [ ] `tests/unit/share-card.test.ts` : `shareCardFilename`, `mvpLabel`, `agentsLabel`, `statGridValues` — écrits d'abord, rouges.
- [ ] Implémenter les quatre fonctions dans `src/lib/og/labels.ts`.
- [ ] `npm run test` vert.

Cas à couvrir : accents et ponctuation dans le nom de fichier, chaîne vide, égalité de rating sur le MVP, ensemble de stats vide, moins de trois agents.

## Tâche 2 — Cadre paramétrable

- [ ] `shareSize` dans `size.ts`.
- [ ] `renderOg(badge, build, opts?)` avec `opts.size` et `opts.padding`, valeurs par défaut inchangées.
- [ ] Vérifier qu'aucune des neuf routes OG existantes n'est modifiée.

## Tâche 3 — Briques de contenu carré

- [ ] `StatCell` et `StatGrid` dans `fields.tsx` : trois colonnes, chiffre en display, libellé en mono sourd.
- [ ] `ScoreRow` (logo + nom + score) pour le duel empilé du match.

## Tâche 4 — Route de carte de match

- [ ] `src/app/matchs/[id]/carte/route.tsx`.
- [ ] Duel empilé, vainqueur en accent, `SCHEDULED` → heure au lieu du score.
- [ ] Ligne des maps, ligne MVP conditionnelle.
- [ ] Match introuvable → 404, pas un cadre nu : cette route n'est pas lue par un robot social.
- [ ] Vérification visuelle : match terminé avec scoreboard, match terminé sans scoreboard, match programmé, équipe sans logo.

## Tâche 5 — Route de carte de joueur

- [ ] `src/app/joueurs/[id]/carte/route.tsx`.
- [ ] Photo, pseudo, ligne d'identité, grille 3×2, ligne d'agents.
- [ ] Joueur sans map → grille et agents retirés.
- [ ] Vérification visuelle : joueur fourni en stats, joueur vierge, joueur sans photo, pseudo long.

## Tâche 6 — Bouton et modale

- [ ] `src/components/share-card-button.tsx` : portail, trois états, Échap, clic hors panneau, `useFocusTrap`, verrou du défilement.
- [ ] Aperçu monté seulement à l'ouverture.
- [ ] Téléchargement par `<a download>`, copie du lien avec retour visuel, partage natif conditionné à `navigator.canShare`.
- [ ] Aucune régression a11y : `role="dialog"`, `aria-modal`, `aria-label`.

## Tâche 7 — Pose sur les deux fiches

- [ ] Bandeau du match : bouton dans la ligne de bas de bandeau, à côté du stage.
- [ ] En-tête du joueur : bouton près des liens sociaux.
- [ ] Le bouton ne dépend d'aucune session : il est visible pour tout le monde.

## Tâche 8 — E2E et vérification

- [ ] `tests/e2e/share-card.spec.ts`.
- [ ] `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build` verts.
- [ ] Poids du PNG relevé sur les deux routes.

## Tâche 9 — Livraison

- [ ] Bump `1.15.2` → `1.16.0`, tag.
- [ ] Branche `feat/cartes-partage`, PR, attendre la CI, merger en commit de merge.
