# Confrontations directes et forme récente sur la fiche de match

Date : 2026-08-13

## Objectif

La fiche de match (`/matchs/[id]`) montre aujourd'hui l'affiche, le score, le
détail carte par carte et — quand la partie a été importée depuis Riot — le
scoreboard complet. Elle ne dit rien de ce qui entoure le match : qui a gagné
les rencontres précédentes entre ces deux équipes, et dans quelle forme
chacune arrive.

On ajoute donc deux blocs sous le scoreboard :

1. **Confrontations directes** — le bilan des rencontres passées entre les deux
   équipes, et le détail de ces rencontres.
2. **Forme récente** — les cinq derniers matchs de chaque équipe, côte à côte.

Aucune donnée nouvelle n'est stockée : tout se déduit de la table `Match`.

## Décisions produit

- **Les deux blocs se placent dans le temps du match affiché.** C'est la
  décision structurante de cette spec. Sur un match déjà joué, « les cinq
  derniers matchs » désigne les cinq qui l'ont précédé, pas les cinq plus
  récents en date. Sans cette borne, une fiche de match d'octobre afficherait
  des résultats de décembre comme s'ils annonçaient la rencontre — un contresens
  qui s'aggrave à mesure que l'historique du site s'allonge.
- **Le match courant est toujours exclu**, des deux blocs. Un match terminé
  figure dans les résultats de ses propres équipes ; sans exclusion il
  apparaîtrait dans sa propre liste de forme récente.
- **Cinq matchs par équipe**, contre quatre sur la fiche d'équipe. La forme
  récente est une lecture en soi ici, pas un aperçu renvoyant ailleurs.
- **Les confrontations directes ne sont pas plafonnées à cinq** mais à dix. Deux
  équipes d'une même région se croisent souvent ; le bilan complet est
  précisément l'information recherchée, et le tronquer trop tôt le fausse.
- **Un bloc sans données ne s'affiche pas comme un vide.** En T3, deux équipes
  ne se sont le plus souvent jamais rencontrées et une équipe récente n'a aucun
  historique : selon le cas, le bloc énonce l'absence en une ligne ou disparaît.
  Voir « Cas vides » plus bas.
- **Pas de sélecteur, pas de filtre, pas d'onglet.** Les deux blocs sont
  toujours rendus dans le même ordre, sous le scoreboard.

## Données

### Emplacement

Tout va dans `src/lib/data/matches.ts`, qui porte déjà `listTeamRecentMatches`,
`listTeamUpcomingMatches` et `getTeamRecord`. Le fichier reste cohérent :
il rassemble les lectures de matchs et rien d'autre.

### La borne temporelle

Les deux fonctions partagent la même notion de « avant ce match », exprimée par
un objet unique passé en argument :

```ts
export type MatchCutoff = {
  /** Ne retenir que les matchs joués strictement avant cette date. */
  before: Date | null;
  /** Identifiant du match affiché, toujours écarté du résultat. */
  excludeMatchId: string;
};
```

`before` vaut la date du match affiché. Elle est nullable parce que
`Match.date` l'est : un match saisi sans date ne peut pas borner quoi que ce
soit. Dans ce cas la borne disparaît et il ne reste que l'exclusion du match
courant — la fiche montre alors tout l'historique, ce qui est le comportement
le moins surprenant pour un match dont on ignore quand il s'est joué.

Un match dont la `date` est nulle n'est jamais retenu dans les résultats quand
une borne est active : on ne peut pas affirmer qu'il précède le match affiché.

### Les confrontations directes

```ts
export async function getHeadToHead(
  teamAId: string,
  teamBId: string,
  cutoff: MatchCutoff,
  limit = 10
);
```

Une requête : les matchs `FINISHED` opposant les deux équipes dans un sens ou
dans l'autre, hors match courant, bornés, triés du plus récent au plus ancien,
limités à `limit`. Elle inclut `teamA`, `teamB` et le nom du tournoi.

Le retour est un objet portant les rencontres et le bilan — `winsA` et `winsB`,
les victoires de chaque équipe dans l'ordre des arguments. Son type est inféré
du `findMany`, comme partout ailleurs dans le module : le module de données
n'importe pas `MatchRowData` depuis `src/components/`, il rend une forme que ce
composant accepte structurellement.

Le bilan se calcule en mémoire sur les lignes retournées, en comparant
`winnerId` à chacun des deux identifiants. Aucune requête d'agrégat
supplémentaire.

Un match terminé sans vainqueur — `winnerId` nul, ce que le schéma autorise —
compte dans la liste mais dans aucun des deux totaux. Le bilan reste donc
lisible sans avoir à inventer une notion de match nul, qui n'existe pas en
Valorant.

**Conséquence assumée du plafond** : quand plus de dix rencontres existent, le
bilan affiché porte sur les dix retenues, pas sur l'historique entier. C'est
volontaire — un bilan qui ne correspondrait pas aux lignes affichées juste en
dessous serait plus déroutant qu'un bilan tronqué. Le libellé le dit
explicitement (voir « Rendu »).

### La forme récente

`listTeamRecentMatches` existe déjà avec la signature `(teamId, limit = 4)` et
est appelée depuis la fiche d'équipe (`src/app/equipes/[id]/page.tsx`). On lui
ajoute un troisième paramètre optionnel :

```ts
export function listTeamRecentMatches(teamId: string, limit = 4, cutoff?: MatchCutoff);
```

L'appel existant n'est pas touché : sans `cutoff`, le comportement actuel est
conservé à l'identique. C'est la raison du paramètre optionnel plutôt que d'une
seconde fonction — la logique est la même à une clause `where` près, et la
dupliquer garantirait qu'elles divergent.

## Rendu

### Emplacement dans la page

Deux `<section>` ajoutées à la fin de `src/app/matchs/[id]/page.tsx`, après la
section du scoreboard, dans cet ordre : confrontations directes, puis forme
récente. Le bilan entre les deux équipes précède leur état de forme parce qu'il
parle du match affiché, alors que la forme parle de ce qui l'entoure.

### Confrontations directes

Un titre de section aux mêmes classes que « Tableau des scores », suivi du
bilan puis des rencontres.

Le bilan est une ligne unique et centrée : le tag de l'équipe A, son nombre de
victoires, un tiret, le nombre de victoires de l'équipe B, son tag. Le nombre
le plus élevé prend la couleur d'accent, comme le score du bandeau ; à égalité,
aucun des deux ne la prend. Quand le plafond de dix a joué, une mention
discrète sous le bilan précise « sur les 10 dernières rencontres ».

Les rencontres sont rendues par le composant existant
`src/components/match-row.tsx`, avec `contextLabel` renseigné au nom du
tournoi : sans lui, dix lignes de score identiques ne se distinguent pas. Rien
de nouveau à écrire pour cette liste.

### Forme récente

Un titre de section, puis une grille de deux colonnes qui retombe à une seule
en dessous du point de rupture `sm`, cohérente avec le bandeau du haut de page
qui bascule au même endroit.

Chaque colonne porte le nom de son équipe, une suite de pastilles V/D — la plus
ancienne à gauche, la plus récente à droite — puis les cinq matchs rendus
par `src/components/match-mini-list.tsx`, déjà en place et déjà utilisé pour
cet usage sur la fiche d'équipe.

Les pastilles reprennent la convention déjà appliquée aux bilans de
`team-match-groups.tsx` : `--success` et `--success-soft` pour une victoire,
`--destructive` et `--destructive-soft` pour une défaite, `--text-subtle` pour
un match terminé sans vainqueur. Aucun nouveau jeton n'est introduit.

L'ordre gauche/droite des colonnes suit celui du bandeau : équipe A à gauche,
équipe B à droite. Une pastille et une ligne de liste se lisent dans des sens
opposés — chronologique pour la première, antéchronologique pour la seconde —
et c'est voulu : une série de forme se lit dans le sens du temps, une liste de
résultats se lit du plus frais.

### Nouveau composant

Un seul : `src/components/team-form-column.tsx`, qui rend le nom de l'équipe,
la suite de pastilles et la `MatchMiniList`. Il ne fait pas de requête et ne
connaît pas le match affiché ; il reçoit un nom, un tag, une liste de résultats
déjà bornée et déjà ordonnée. Il est donc testable seul et réutilisable tel
quel si la fiche d'équipe veut la même colonne plus tard.

## Cas vides

C'est le cas courant, pas l'exception : sur un tournoi de début de saison, la
majorité des matchs opposeront deux équipes qui ne se sont jamais croisées.

- **Jamais rencontrées** — le bloc affiche une ligne unique, « Première
  rencontre entre les deux équipes », sans bilan ni liste. Pas de composant
  `EmptyState` : celui-ci occupe une hauteur importante et signale une absence,
  alors qu'ici l'absence d'historique est elle-même une information que la page
  doit énoncer.
- **Une équipe sans match antérieur** — sa colonne garde son en-tête, sans
  pastilles, et `MatchMiniList` affiche son message de repli, renseigné à
  « Aucun match joué avant celui-ci ». L'autre colonne reste remplie ; la
  grille ne s'effondre pas.
- **Les deux équipes sans match antérieur et aucune confrontation** — les deux
  sections entières sont masquées. Empiler deux blocs vides sous le scoreboard
  n'apprendrait rien et allongerait la page pour rien. C'est l'état d'un match
  de première journée entre deux équipes nouvelles.

## Coût

Trois requêtes supplémentaires : une pour les confrontations, une par équipe
pour la forme. Elles s'ajoutent au `Promise.all` de la page, donc sans allonger
la chaîne d'attente.

Elles filtrent toutes sur `teamAId` ou `teamBId`, indexés séparément sur
`Match` — ces deux index avaient précisément été ajoutés parce que les vues
« équipe » balayaient la table. Le tri porte sur `date`, également indexé.
Aucune migration n'est nécessaire.

Le site ne met rien en cache aujourd'hui et cette spec ne l'introduit pas : ces
trois requêtes sont bornées à dix et cinq lignes, sans jointure sur les stats
de joueurs, et restent sans commune mesure avec le chargement du scoreboard que
la même page fait déjà.

## Tests

### Unitaires

Sur la sélection, là où se trouve la logique :

- le match affiché n'apparaît ni dans les confrontations ni dans la forme des
  deux équipes ;
- un match postérieur à celui affiché est écarté des deux blocs ;
- un match sans date est écarté quand une borne est active ;
- quand le match affiché n'a pas de date, la borne disparaît et seul le match
  courant est exclu ;
- le bilan compte correctement les victoires de chaque côté, quel que soit le
  camp occupé par chaque équipe dans la rencontre passée ;
- un match terminé sans vainqueur figure dans la liste sans peser sur le bilan ;
- l'appel existant à `listTeamRecentMatches` sans `cutoff` rend le même
  résultat qu'avant.

Sur le composant `TeamFormColumn` : la suite de pastilles reflète l'ordre
chronologique et le bon résultat pour une équipe placée tantôt en A, tantôt en
B.

### E2E

Deux parcours sur `/matchs/[id]`, appuyés sur les fixtures existantes :

- un match entre deux équipes avec historique — le bilan et les deux colonnes
  s'affichent, et le match consulté ne figure dans aucune liste ;
- un match de première rencontre — la ligne « Première rencontre » s'affiche à
  la place du bilan.

## Risques

- **Fixtures.** Les jeux de démonstration doivent contenir au moins une paire
  d'équipes s'étant rencontrées plusieurs fois, sans quoi le premier parcours
  E2E n'a rien à vérifier. À contrôler avant d'écrire les tests, et à compléter
  dans `prisma/seed-fixtures.ts` si ce n'est pas le cas.
- **Matchs sans date.** Le site en contient — le champ `hasTime` existe
  justement parce que des matchs ont été saisis sans horaire signifiant. Le
  comportement retenu (borne désactivée) est cohérent, mais il faut vérifier
  sur des données réelles qu'il ne produit pas de fiche absurde.

## Addendum — arbitré en cours d'implémentation

Cette spec n'est pas réécrite : elle garde la trace de la conception d'origine.
Quatre points ont été tranchés autrement pendant la réalisation.

- **Le bilan est un en-tête, pas une ligne de texte.** Prévu comme une ligne
  centrée portant les tags, il est devenu un bandeau sur `--card-hover` avec
  les logos et les noms complets, à l'intérieur d'une zone `--surface` qui
  englobe la liste. La zone `--surface` coiffe aussi la forme récente, pour que
  les deux blocs se lisent comme un seul ensemble sous le scoreboard.
- **Les dates des confrontations portent l'année**, en JJ/MM/AAAA. Une liste de
  confrontations couvre plusieurs saisons, où « 27/07 » seul ne dit rien. La
  forme récente garde le format court : elle ne remonte que cinq matchs.
- **Une rencontre de la forme récente tient sur une ligne** — date, adversaire,
  score du côté de l'équipe regardée — au lieu des trois lignes de
  `MatchMiniList`. Le composant reçoit désormais les rencontres brutes et son
  identifiant d'équipe, et calcule lui-même sa frise : quand la liste et la
  frise venaient de deux appels séparés, rien n'empêchait de les nourrir de
  sources différentes.
- **`MatchRow` a été rendu tenable sur mobile.** Ses deux côtés étaient figés à
  128 px sans rétrécissement : la ligne réclamait environ 426 px et débordait
  de l'écran. Le défaut était latent dans le composant partagé ; la première
  liste affichée au chargement sur un téléphone l'a rendu visible. Sous `sm`,
  les côtés passent à 64 px et montrent le tag plutôt qu'un nom tronqué. La
  page d'accueil et l'onglet Matchs d'une fiche d'équipe en héritent.

Trois tests annoncés dans « Tests » n'ont pas été écrits, faute d'outillage :
le projet n'a ni jsdom ni bibliothèque de rendu React, et `src/lib/data/**` est
hors couverture. Le détail est dans le plan.
