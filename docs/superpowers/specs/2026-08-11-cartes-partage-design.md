# Cartes de partage téléchargeables (match et joueur)

Date : 2026-08-11

## Objectif

Le site génère déjà une image Open Graph par page (`src/lib/og/`, neuf routes
`opengraph-image.tsx`). Ces images ne servent qu'aux **aperçus de lien** : elles
sont lues par Discord, X ou iMessage quand on colle une URL, et personne ne peut
les récupérer autrement.

On ajoute un geste explicite : depuis une fiche de match ou de joueur, l'auteur
d'un résultat peut **sortir une image carrée prête à poster**. C'est le format
qu'attendent Discord, une story Instagram ou un post X — là où le 1200×630
existant est un bandeau, coupé ou rétréci dès qu'il n'est pas un aperçu de lien.

## Décisions produit

- **Périmètre** : fiche match (`/matchs/[id]`) et fiche joueur (`/joueurs/[id]`).
  Les fiches équipe et tournoi ne sont pas concernées à cette étape ; le cadre
  posé ici les accueillera sans refonte.
- **Format unique 1080×1080.** Pas de sélecteur de format : deux gabarits par
  entité, c'est deux fois la maintenance et deux fois la vérification visuelle,
  pour un gain que rien n'établit tant que la fonctionnalité n'a pas servi.
- **La carte porte plus que l'aperçu OG.** Une carte carrée qui reprendrait
  exactement le contenu du 1200×630 ne justifierait pas d'exister : le match
  ajoute le joueur du match, le joueur ajoute une grille de six chiffres et ses
  agents principaux.
- **Trois sorties depuis la modale** : télécharger le PNG, copier le lien de la
  page, et — sur mobile uniquement, quand l'appareil le permet — passer le
  fichier au partage natif.
- **Aucune donnée nouvelle** : tous les chiffres sortent d'agrégats existants.
- **Dégradation systématique**, comme pour les cartes OG : un chiffre manquant
  retire sa ligne, il n'interrompt jamais le rendu.

## Architecture

### Les routes d'image

```
src/app/matchs/[id]/carte/route.tsx     → PNG 1080×1080
src/app/joueurs/[id]/carte/route.tsx    → PNG 1080×1080
```

Un `route.tsx` par entité, sous le segment de la fiche. L'URL est publique et
partageable telle quelle, et le paramètre reste borné à un identifiant d'entité
existante.

#### Alternatives écartées

- **Réutiliser `opengraph-image.tsx`.** Next réserve ce fichier aux métadonnées :
  il en dérive `og:image:width` et `og:image:height`. Y brancher un second
  format obligerait à mentir sur ces balises ou à les dupliquer.
- **Endpoint unique `/api/carte?type=…&id=…`.** Déjà écarté à la conception des
  cartes OG, pour la même raison : un endpoint public paramétrable laisse
  n'importe qui faire générer des images arbitraires par le serveur.
- **Rendu côté navigateur** (`html2canvas`, `dom-to-image`). Supprime le coût
  serveur, mais rend le résultat dépendant des polices et du moteur du client,
  et l'image n'est plus partageable par URL. Le pipeline Satori existe déjà et
  produit un rendu identique partout.

### Le cadre, rendu paramétrable

`renderOg(badge, build)` fixe aujourd'hui le format à 1200×630 en important
`size`. Il gagne un troisième paramètre optionnel :

```ts
renderOg(badge, build, SQUARE);
```

`frame.tsx` expose les deux formats, `LANDSCAPE` (défaut) et `SQUARE`, chacun
portant ses dimensions et sa marge intérieure. Par défaut le comportement
actuel est inchangé — les neuf routes OG existantes ne sont pas touchées.
`size.ts` expose la nouvelle dimension :

```ts
export const shareSize = { width: 1080, height: 1080 };
```

La marge du carré est plus large (72 contre 56) : le contenu y monte moins
haut, et un cadre trop serré donnerait une image compacte là où le format vit
de son air.

Le cadre reste le même : bandeau logo + badge en haut, contenu centré au
milieu, `the-hub-vrc.fr` en pied. C'est cette continuité qui fait reconnaître la
carte comme venant du site.

### Le bouton et la modale

`src/components/share-card-button.tsx`, composant client, reprend la mécanique
déjà partagée par `NavDrawer`, `UserMenu` et `ConfirmDeleteButton` : portail
dans `<body>`, trois états (`open` / `shown` / `closing`) pour laisser la
fermeture s'animer, fermeture à Échap et au clic hors du panneau, verrou du
défilement, et `useFocusTrap` sur le panneau.

```tsx
<ShareCardButton
  imageUrl={`/matchs/${match.id}/carte`}
  pageUrl={`${SITE_URL}/matchs/${match.id}`}
  filename="the-hub-navi-vs-karmine-corp.png"
  title="Partager le match"
  alt="Carte du match NAVI contre Karmine Corp"
/>
```

Contenu du panneau :

1. **Aperçu** — `<img src={imageUrl}>`, en carré, largeur limitée à `min(420px, 80vw)`.
   L'image est servie par le site : `img-src 'self'` de la CSP la couvre déjà.
2. **Télécharger le PNG** — `<a href={imageUrl} download={filename}>`. Même
   origine, donc l'attribut `download` est honoré et impose le nom de fichier.
3. **Copier le lien** — `navigator.clipboard.writeText(pageUrl)`, avec bascule
   du libellé en « Lien copié » pendant deux secondes. Le lien copié est celui
   de la **page**, pas de l'image : c'est lui qui déclenche l'aperçu OG chez le
   destinataire.
4. **Partager** — affiché seulement si `navigator.canShare({ files })` répond
   `true`, c'est-à-dire en pratique sur mobile. Récupère l'image en `blob`
   (`connect-src 'self'`, déjà autorisé) et la passe à `navigator.share`.

L'aperçu n'est demandé qu'à l'ouverture de la modale : le `<img>` n'est monté
qu'avec le panneau. Une fiche consultée sans clic sur « Partager » ne déclenche
aucune génération.

## Contenu des cartes

### Match — `MATCH · TERMINÉ`

Le duel est empilé verticalement plutôt que côte à côte : sur un carré, deux
colonnes laissent le score écrasé au centre, alors que deux lignes donnent la
lecture d'un tableau de résultat.

```
┌──────────────────────────────────────┐
│ [logo]  MATCH · TERMINÉ              │
│                                      │
│  Coupe de France · Finale · Bo3      │
│                                      │
│  [logoA]  NAVI                  2    │
│  [logoB]  KARMINE CORP          1    │
│                                      │
│  Ascent 13-9 · Bind 8-13 · Lotus 13-7│
│                                      │
│  ★ MVP  Sh1n  1.42 rating · 312 ACS  │
│                                      │
│  the-hub-vrc.fr                      │
└──────────────────────────────────────┘
```

- Le vainqueur porte le score en accent, le perdant en texte sourd.
- Un match `SCHEDULED` n'a pas de colonne de score — un `0` s'y lirait comme un
  résultat — et sa date prend la ligne du détail des maps, forcément vide. La
  date n'est pas accrochée à la ligne de contexte : celle-ci passe déjà sur deux
  lignes avec un nom de tournoi long, et le séparateur restait alors pendu en
  fin de première ligne.
- La ligne MVP est le meilleur `rating` parmi les `PlayerGameStat` de toutes les
  maps du match. Elle disparaît entièrement quand aucun scoreboard n'est importé
  — c'est le cas de tous les matchs saisis à la main.

### Joueur — `JOUEUR`

```
┌──────────────────────────────────────┐
│ [logo]  JOUEUR                       │
│                                      │
│  [photo]   Sh1n                      │
│            NAVI · Duelliste · FR     │
│                                      │
│   1.18       241        1.34         │
│   RATING     ACS        K/D          │
│                                      │
│   74%        28%        126          │
│   KAST       HS         MAPS         │
│                                      │
│  Jett 41% · Raze 33% · Neon 12%      │
│                                      │
│  the-hub-vrc.fr                      │
└──────────────────────────────────────┘
```

- La grille 3×2 vient de `getPlayerOverview(playerId)`, qui calcule déjà
  `avgRating`, `avgAcs`, `kd`, `avgKast`, `avgHs` et `maps`.
- La ligne d'agents reprend les trois premiers de `overview.agents`.
- Un joueur sans map jouée perd la grille et la ligne d'agents : restent la
  photo, le pseudo et la ligne d'identité.

## Nom du fichier téléchargé

`shareCardFilename(parts)` dans `labels.ts` : minuscules, accents retirés, tout
ce qui n'est pas alphanumérique replié en tiret, tirets multiples fusionnés,
préfixe `the-hub`.

- Match → `the-hub-navi-vs-karmine-corp.png`
- Joueur → `the-hub-sh1n.png`

Un nom lisible est ce qui décide si le fichier est reconnaissable dans une
pellicule ou un dossier de téléchargements.

## Cache

Même en-tête que les cartes OG :
`public, max-age=0, s-maxage=300, stale-while-revalidate=600`. Les cartes
portent des chiffres, elles ne peuvent pas être figées ; cinq minutes suffisent
à absorber les rafales sur un match qui vient de finir.

## Tests

**Unitaires** (`tests/unit/og-labels.test.ts`, `tests/unit/share-card.test.ts`) :

- `shareCardFilename` : accents, ponctuation, espaces multiples, chaîne vide,
  tag déjà propre.
- `mvpLabel` : sélection du meilleur rating sur plusieurs maps, égalité,
  ensemble vide → chaîne vide.
- `agentsLabel` : trois agents maximum, arrondi des parts, liste vide.
- `statGrid` : formatage des six cases, joueur sans map.

**E2E** (`tests/e2e/share-card.spec.ts`) :

- La fiche match affiche le bouton « Partager ».
- Le clic ouvre un `role="dialog"`, l'aperçu se charge (`200`, `image/png`).
- Le lien de téléchargement porte le bon `download`.
- Échap referme et rend le focus au bouton.
- La route `/matchs/<id>/carte` répond `200 image/png` en direct.

Le rendu Satori lui-même n'est pas testé unitairement : les deux gabarits sont
vérifiés à l'œil avant livraison, comme les neuf cartes OG.

## Risques

**Coût de génération.** Chaque ouverture de modale déclenche un rendu Satori et
une conversion `sharp`. L'exposition est la même que celle des routes OG déjà en
place, qui ne sont pas limitées non plus ; le cache CDN de cinq minutes couvre
le cas nominal — une fiche partagée en rafale. Poser un limiteur sur deux routes
d'image et pas sur les neuf autres serait arbitraire : si le coût devient
visible, c'est l'ensemble des onze routes qu'il faudra traiter, au même endroit.

**Fraîcheur.** Une carte téléchargée est un instantané. C'est le comportement
attendu d'une capture, pas un défaut — contrairement aux aperçus OG, où le cache
des plateformes fige un chiffre qu'on aurait voulu voir bouger.

**Poids du PNG.** Levé à la vérification : les cinq variantes rendues pèsent
entre 73 Ko (joueur sans statistique) et 153 Ko (joueur avec photo et grille
complète). Si une carte future s'alourdissait, la piste est de réduire le rayon
du halo, seul aplat dégradé de l'image.
