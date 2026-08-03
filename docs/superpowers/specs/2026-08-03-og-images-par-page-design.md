# Images de partage (Open Graph) générées par page

Date : 2026-08-03

## Objectif

Le site sert aujourd'hui une seule image de partage : `src/app/opengraph-image.png`,
un PNG dessiné à la main portant le logo, le slogan et le domaine. Discord, X et
iMessage affichent donc exactement la même carte qu'on partage l'accueil, une
fiche d'équipe ou un match.

On remplace ce comportement par une image générée à la volée pour chaque page
publique partageable, portant l'identité et les chiffres de cette page.

## Décisions produit

- **Périmètre** : les quatre fiches de détail (tournoi, équipe, joueur, match) et
  les cinq pages d'index (tournois, équipes, matchs, LFT, recherche). L'accueil et
  les pages légales gardent le PNG statique actuel. Les pages `noindex` (admin,
  gestion, profil, onboarding, rejoindre) ne sont pas concernées : elles ne se
  partagent pas.
- **Les cartes portent les chiffres** : score et détail des maps sur un match,
  bilan et winrate sur une équipe, rating et ACS sur un joueur, inscrits et
  cashprize sur un tournoi. Choix assumé au prix de la fraîcheur (voir Risques).
- **Aucune donnée nouvelle** : tous les chiffres sortent d'agrégats existants.
- **Dégradation systématique** : une carte incomplète vaut mieux qu'une absence de
  carte. Aucun champ manquant ne doit produire une erreur de rendu.

## Architecture

Convention Next : un fichier `opengraph-image.tsx` par segment de route. Next
fabrique lui-même l'URL, le hash de contenu et les balises `og:image:width`,
`og:image:height` et `og:image:type` ; il pré-rend statiquement les routes qui
n'interrogent pas la base.

### Alternatives écartées

- **Endpoint unique `/api/og?type=…&id=…`** référencé à la main dans chaque
  `generateMetadata`. Un seul fichier de rendu, mais il faut poser
  `openGraph.images` (avec largeur, hauteur et type) dans chaque page, et un
  endpoint public paramétrable laisse n'importe qui faire générer des images
  arbitraires par le serveur — il faudrait signer les paramètres.
- **Pré-génération à l'écriture**, un PNG écrit sur disque à chaque mutation.
  Partage instantané et coût nul à la lecture, mais l'invalidation doit être
  branchée sur toutes les mutations (scores, scoreboards, rosters, inscriptions,
  logos), et le stock d'images grossit avec la base. Trop de machinerie pour le
  gain.

### Modules partagés

```
src/lib/og/
  size.ts      constantes size / contentType / alt, réexportées par chaque route
  fonts.ts     lecture des .ttf depuis assets/fonts/, mémoïsée par processus
  image.ts     lecture d'un upload → PNG en data URI (sharp), null si absent
  labels.ts    formatage pur : dates, scores, bilans, badges, monogrammes
  fields.tsx   briques de contenu : titre, ligne de méta, bloc de chiffres
  frame.tsx    le cadre commun ; prend un badge et des enfants
```

Le formatage est séparé du JSX (`labels.ts` / `fields.tsx`) pour que toute la
logique testable vive dans un module sans rendu.

Chaque `opengraph-image.tsx` fait 15 à 25 lignes : il charge sa donnée, la mappe
sur les briques, rend le cadre. Toute la mise en forme vit dans `src/lib/og/` ;
aucune route ne redéfinit de style.

### Routes

```
src/app/opengraph-image.png              accueil, inchangé
src/app/tournois/opengraph-image.tsx
src/app/tournois/[id]/opengraph-image.tsx
src/app/equipes/opengraph-image.tsx
src/app/equipes/[id]/opengraph-image.tsx
src/app/joueurs/[id]/opengraph-image.tsx
src/app/matchs/opengraph-image.tsx
src/app/matchs/[id]/opengraph-image.tsx
src/app/lft/opengraph-image.tsx
src/app/recherche/opengraph-image.tsx
```

`src/lib/metadata.ts` n'est pas modifié : `pageMetadata` ne pose pas
`openGraph.images`, donc Next y injecte l'image du fichier de convention.

## Le cadre commun

Format `1200×630`. Tokens repris de `src/app/globals.css` : fond `--bg` `#131619`,
halo `--accent-glow` `rgba(237,94,41,0.30)` en haut à gauche, carte intérieure
bordée `--border` `#303133` à la manière des fiches du site, accent `--accent`
`#ED5E29`, texte `--text` `#fafafa`, méta `--text-muted` `#9b9c9e`.

```
┌────────────────────────────────────────────────┐
│  [logo.png]  ÉQUIPE                            │  bandeau : marque + badge de type
│                                                │
│              zone variable                     │  propre à chaque type
│                                                │
│  the-hub-vrc.fr                                │  pied
└────────────────────────────────────────────────┘
```

`public/logo.png` est déjà en PNG : Satori le lit sans conversion. Le badge de
type est en mono, majuscules, couleur `--accent`, comme les eyebrows du site.

Satori ne supporte que le flexbox — pas de `display: grid`. Tout le cadre est
construit en `flex`.

## Contenu par page

| Route | Badge | Titre | Méta | Chiffres |
|---|---|---|---|---|
| `/tournois/[id]` | `TOURNOI` + statut | nom + logo | format · région · dates | inscrits / limite, cashprize |
| `/equipes/[id]` | `ÉQUIPE` | nom + logo + tag | région | bilan V–D, winrate, diff. de maps |
| `/joueurs/[id]` | `JOUEUR` | pseudo + photo | équipe actuelle · rôle · nationalité | rating moyen, ACS, K/D |
| `/matchs/[id]` | `MATCH` + statut | équipe A vs équipe B, logos | tournoi · round · Bo*n* | score, détail des maps |
| `/tournois` | `TOURNOIS` | « Tous les tournois » | — | nombre de tournois, dont en cours |
| `/equipes` | `ÉQUIPES` | « Toutes les équipes » | — | nombre d'équipes |
| `/matchs` | `MATCHS` | « Tous les matchs » | — | nombre de matchs joués |
| `/lft` | `LFT` | « Joueurs libres » | — | nombre de joueurs en recherche |
| `/recherche` | `RECHERCHE` | « Rechercher » | — | — |

### Sources des chiffres

- Tournoi : `getTournament` pour le format, les dates, la région, le cashprize et
  `maxTeams` ; `_count.participants` pour les inscrits.
- Équipe : `getTeamRecord(teamId)` dans `src/lib/data/matches.ts`, qui renvoie
  déjà `{ played, wins, losses, mapDiff, winrate }`.
- Joueur : `getPlayer` pour le pseudo, la photo, la nationalité et le rôle ;
  `getActiveMembership` pour l'équipe ; moyennes de `PlayerGameStat` (`rating`,
  `acs`, `kills`, `deaths`) pour les chiffres.
- Match : `getMatch` avec `teamA`, `teamB`, `tournament` et `maps`.
- Index : `count()` sur la table correspondante.

## Images uploadées

Les logos d'équipe et de tournoi et les photos de joueur sont stockés en WebP sous
`uploads/<catégorie>/<id>.webp` et servis par `src/app/api/images/[...key]/route.ts`.
Satori ne décode pas le WebP.

`src/lib/og/image.ts` lit le fichier directement sur le disque via
`resolveUploadPath` (pas de requête HTTP vers son propre serveur), le convertit en
PNG avec `sharp` — déjà une dépendance du projet — et renvoie un data URI. Il
renvoie `null` si le fichier est absent ou illisible ; l'appelant retombe alors
sur le monogramme.

## Polices

Satori n'accepte que `ttf`, `otf` et `woff`, et ne voit ni les polices
`next/font/google` ni le CSS du site. Deux fichiers TTF sous-ensemblés au latin
sont versionnés dans `assets/fonts/` :

- Bricolage Grotesque ExtraBold — titres, cohérent avec la police d'affichage du site. 81 Ko.
- Geist Mono Medium — badges, chiffres, pied de page. 70 Ko.

Soit 151 Ko à deux, largement sous le budget de 500 Ko. Les fichiers viennent de
l'API CSS de Google Fonts interrogée avec un agent utilisateur ancien ; le
`User-Agent` détermine le format servi, et il faut viser un navigateur assez
vieux pour recevoir du TTF mais pas au point de recevoir de l'EOT, que Satori ne
décode pas. La commande exacte est consignée dans `assets/fonts/README.md`.

`fonts.ts` les lit avec `readFile(join(process.cwd(), "assets/fonts", …))` et
mémoïse le résultat au niveau du module, pour ne pas relire le disque à chaque
génération.

## Dégradation

Chaque brique dégrade au lieu de casser :

- Pas de logo ou photo → monogramme (première lettre) sur pastille `--category`.
- Pas de stats → la ligne de chiffres disparaît, le titre occupe l'espace libéré.
- Pas de date, de région ou de format → le séparateur `·` correspondant saute.
- Entité introuvable (`null`) → cadre générique portant le seul badge de type.

Le rendu de chaque route est enveloppé : toute exception retombe sur le cadre
générique. Une exception non rattrapée renverrait une 500 à Discord, donc *aucun*
aperçu, là où l'image de marque aurait fait l'affaire.

## Tests

`tests/unit/og.test.ts` couvre `src/lib/og/labels.ts` et `src/lib/og/image.ts` :

- formatage de la plage de dates d'un tournoi (une date, deux dates, aucune) ;
- `12/16 équipes` et `12 équipes` quand `maxTeams` est nul ;
- `Bo3`, libellé de round, `2 – 1`, détail des maps ;
- bilan `8V – 3D · 72%` et diff. de maps signée ;
- choix du badge selon le statut du tournoi et du match ;
- monogramme de repli, y compris sur un nom commençant par un accent ou un chiffre ;
- `image.ts` renvoie `null` sur un chemin absent au lieu de lever.

Le rendu Satori lui-même n'est pas testé unitairement. Les neuf routes sont
vérifiées à l'œil, image par image, avant livraison.

## Risques

**Budget de 500 Ko par route, polices comprises.** Levé à la conception : les
deux TTF sous-ensemblés au latin pèsent 151 Ko à eux deux. Le poids reste à
revérifier au build, mais la marge est confortable.

**Fraîcheur des aperçus.** Discord et X mettent l'image en cache par URL. L'URL ne
changeant pas quand la donnée change, un lien partagé pendant un match gardera son
score d'origine un moment. Un `Cache-Control` court sur les fiches évite que le
cache serveur s'ajoute au leur, mais ne supprime pas le problème — c'est le prix
des chiffres sur les cartes, accepté à la conception.

**Coût de rendu.** Chaque fiche partagée déclenche une génération Satori plus une
conversion `sharp`. Acceptable au volume actuel ; si le coût devient visible, la
piste est la pré-génération à l'écriture décrite dans les alternatives écartées.
