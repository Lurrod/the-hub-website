# The Hub

Site de la scène **Tier 3 Valorant francophone** : tournois, équipes, joueurs,
matchs et statistiques détaillées (scoreboard, timeline des rounds, ACS, ADR,
KAST). En production sur [the-hub-vrc.fr](https://the-hub-vrc.fr).

## Pile technique

| Domaine          | Choix                                                               |
| ---------------- | ------------------------------------------------------------------- |
| Framework        | Next.js 16 (App Router, React Server Components)                    |
| Langage          | TypeScript, React 19                                                |
| Base de données  | PostgreSQL via Prisma                                               |
| Authentification | Auth.js 5 (Discord uniquement, sessions en base)                    |
| Styles           | Tailwind CSS 4, jetons de charte dans `src/app/globals.css`         |
| Images           | `sharp` côté serveur, servies en webp par `/api/images`             |
| Données Valorant | API HenrikDev (vérification de Riot ID, statistiques de match)      |
| Images du jeu    | Rapatriées de valorant-api.com dans `public/valorant/`, versionnées |
| Hébergement      | Serveur OVH Kimsufi, PM2 derrière Apache                            |

## Mise en route

Prérequis : **Node 22** et une base **PostgreSQL** accessible.

```bash
npm install
cp .env.example .env          # puis renseigner les variables ci-dessous
npx prisma migrate dev        # crée le schéma
npm run db:seed:dev           # jeu de données de démonstration
npm run dev                   # http://localhost:3200
```

Le site tourne sur le port **3200**, pas 3000.

### Variables d'environnement

Toutes sont décrites dans `.env.example`.

| Variable                                  | Rôle                                                       |
| ----------------------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`                            | Chaîne de connexion PostgreSQL                             |
| `AUTH_SECRET`                             | Secret de signature des sessions Auth.js                   |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Application OAuth Discord                                  |
| `ADMIN_DISCORD_IDS`                       | Identifiants Discord promus administrateurs à la connexion |
| `NEXTAUTH_URL`                            | URL publique, utilisée pour les callbacks OAuth            |
| `NEXT_PUBLIC_BASE_URL`                    | URL publique des métadonnées, du sitemap et du robots.txt  |
| `HENRIKDEV_API_KEY`                       | Clé de l'API HenrikDev (côté serveur uniquement)           |
| `PREMIER_SYNC_SECRET`                     | Secret de déclenchement de la synchronisation Premier      |

## Scripts

| Commande                          | Effet                                                                     |
| --------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`                     | Serveur de développement (port 3200)                                      |
| `npm run build` / `npm start`     | Build de production autonome, puis service                                |
| `npm run lint`                    | ESLint (configuration Next + durcissement `no-console`)                   |
| `npm run format` / `format:check` | Prettier                                                                  |
| `npm test`                        | Tests unitaires Vitest                                                    |
| `npm run test:coverage`           | Idem avec couverture et seuils planchers                                  |
| `npm run test:e2e`                | Parcours Playwright                                                       |
| `npm run db:migrate`              | `prisma migrate dev`                                                      |
| `npm run db:seed:dev`             | Jeu de démonstration (fixtures des tests E2E)                             |
| `npm run db:seed:vlr`             | Import de données VCT EMEA réalistes                                      |
| `npm run db:seed:scoreboards`     | Scoreboards de démonstration                                              |
| `npm run db:studio`               | Prisma Studio                                                             |
| `npm run db:sync:tournaments`     | Recale le statut des tournois d'après leurs dates (tâche planifiée)       |
| `npm run assets:valorant`         | Re-télécharge les images du jeu dans `public/valorant/` (voir ci-dessous) |

### Images du jeu

Les icônes d'agents, de rôles, d'armes et les illustrations de maps sont
servies depuis `public/valorant/` : aucune requête ne part vers un CDN tiers au
rendu, et `media.valorant-api.com` n'a plus à figurer dans la CSP.
`npm run assets:valorant` les retélécharge depuis valorant-api.com, les
ré-encode en WebP à la taille d'affichage (49 Mo d'originaux → 1 Mo) et réécrit
les tables de `src/lib/{agents,maps,roles,weapons}.ts`. À relancer quand Riot
sort un agent ou une arme ; une nouvelle map compétitive se déclare d'abord à la
main dans `MAP_SPLASH`, le script signalant celles du catalogue qui manquent.

## Organisation

```
src/
  app/          routes App Router (pages, layouts, server actions, API)
  components/   composants React
  hooks/        hooks React partagés (piège de focus, dialogues)
  lib/          logique métier pure, validation Zod, accès données (lib/data)
  styles/       jetons de charte, base, composants, transitions
  proxy.ts      garde d'authentification, gate d'onboarding, CSP
prisma/         schéma, migrations, jeux de données
tests/unit/     Vitest — logique pure
tests/e2e/      Playwright — parcours
```

## Tests et qualité

La CI (`.github/workflows/ci.yml`) enchaîne lint, types, tests unitaires avec
seuils de couverture, audit des dépendances et build de production. Un second
job joue les parcours Playwright contre une base PostgreSQL éphémère.

Les seuils de couverture portent sur `src/lib/**` et servent de cliquet : ils
sont calés sur le niveau atteint, à relever au fil des ajouts de tests. Les
composants et les pages relèvent des parcours end-to-end.

## Synchronisation du Premier français

Le site tient à jour un miroir du Premier français à partir de l'API HenrikDev.
Le périmètre est volontairement étroit : le palier **Contender**
(`EU_FRANCE` division 21, 59 équipes) et le palier **Invite**
(`EU_FRANCE_SUPER` division 22, 13 équipes). Les divisions inférieures sont
hors sujet pour un site Tier 3.

Chaque saison donne **un seul tournoi par palier**, au format `PREMIER_CONTENDER`
ou `PREMIER_INVITE` : ligne régulière et playoffs y cohabitent, la première en
matchs de phase `GROUP`, les seconds en phase `BRACKET`, de sorte que le
classement et l'arbre s'affichent sur la même page. Les participants viennent du
classement et les matchs de l'historique des équipes.

Les logos sont rapatriés dans le stockage local plutôt que servis depuis le CDN
de HenrikDev, que la CSP bloquerait.

### Rattachement des équipes

Une équipe Premier est reconnue dans cet ordre :

1. Par `Team.premierTeamId`, le cas normal une fois le premier passage fait.
2. Par son **roster** : au moins trois `puuid` en commun avec une équipe déjà
   présente sur le site. C'est le seul rapprochement automatique, parce que
   c'est le seul signal fiable — les noms divergent souvent entre le site et le
   Premier, et une fusion erronée se défait très mal. Une égalité parfaite entre
   deux candidates ne tranche pas : le cas remonte dans le rapport.
3. À défaut, elle est créée et marquée `premierManaged`. Si elle ressemble
   quand même à une fiche existante (même nom ou même tag), elle est signalée
   dans `teamsSuspects` plutôt que rattachée d'office.

**Seules les équipes `premierManaged` suivent le nom de Riot.** Une équipe déjà
présente puis rattachée garde le nom qu'on lui a donné ici.

### Les playoffs

Chaque saison se clôt par un championnat, joué deux à trois jours avant sa fin et
réservé aux équipes ayant atteint le seuil de points de la saison. Il se dispute
en **arbres parallèles** : chaque `tournament_id` de `tournament_matches` est un
arbre, stocké comme un `Group` du tournoi.

L'API ne date pas ces tournois et ne nomme pas leurs tours. Deux déductions, l'une
et l'autre mesurées avant d'être codées :

- **La saison** vient de la date d'une des parties de l'arbre — un appel par
  arbre, ils sont deux ou trois par saison. Sans ce filtre, l'historique
  remontant à plus de deux ans, vingt championnats se fondaient en un seul, avec
  six « finales » et vingt-deux arbres pour treize matchs.
- **Le tour** vient du rang du match dans le parcours de l'équipe, et la
  profondeur de l'arbre du plus long parcours observé. Sur trois championnats
  réels, un match vu par ses deux équipes apparaît au même rang chez l'une et
  chez l'autre, sans exception.

**Seule la saison en cours est importée.** Les équipes sont identifiées par leur
division d'aujourd'hui ; sur une saison passée, jouée avec les divisions d'alors,
on ne retrouve qu'une partie des participants et l'arbre reconstruit est un
fragment — arbres à un seul match, byes partout, deux finales dans le même arbre
parce que le vainqueur réel n'est pas suivi. Le site affiche des résultats, pas
des simulations.

Seuls sont importés les matchs **dont les deux équipes sont suivies**, reconnus
au fait qu'ils figurent dans deux historiques. Les autres — adversaire d'une
autre conférence, d'une division inférieure, ou descendu depuis — étaient
sinon récupérés pour être aussitôt rejetés, et rerécupérés au passage suivant :
227 appels par passage pour zéro match importé.

Le paramètre `seasons` remonte le miroir de plusieurs saisons ; les deux
paliers sont mis en commun avant ce filtre, sans quoi un match de saison passée
entre une équipe aujourd'hui en Invite et une aujourd'hui en Contender serait
écarté des deux côtés. **Limite assumée** : le classement est un instantané du
présent, une saison passée est donc miroitée telle que la voient les équipes
actuellement dans ces divisions.

Le déclenchement passe par `POST /api/premier/sync`, protégée par
`PREMIER_SYNC_SECRET` :

```bash
curl -X POST -H "Authorization: Bearer $PREMIER_SYNC_SECRET" \
     -H "Content-Type: application/json" -d '{"dryRun":true}' \
     http://127.0.0.1:3200/api/premier/sync
```

Le corps accepte `dryRun` (aucune écriture, compte seulement les équipes),
`matchBudget` (40 par défaut) et `seasons` (1 par défaut). La réponse rend
`matchesImported` et `matchesPending` : **le passage est borné exprès**. Le
cron rappelle jusqu'à ce que `matchesPending` tombe à zéro ; les passages
suivants sont bien plus courts, `MatchMap.riotMatchId` étant unique.

Le quota HenrikDev n'est pas estimé mais **lu dans les en-têtes
`x-ratelimit-*` de chaque réponse**. Trois choses s'y devinent mal et ont été
mesurées :

- La limite affichée est de 30 par minute, mais **un appel coûte deux crédits**
  dès qu'il porte sur une donnée non mise en cache — les requêtes relayées vers
  Riot sont comptées en plus. Une sonde répétant le même identifiant fait
  croire à un crédit par appel : elle tape dans le cache.
- Chaque famille d'endpoints a **son propre seau** (`x-ratelimit-bucket`). Le
  suivi est donc tenu par famille : partager un compteur entre deux seaux fait
  patienter une minute pour rien.
- La fenêtre est fixe, pas glissante : passé `x-ratelimit-reset`, le crédit
  repart au maximum.

Si le quota tombe malgré tout, le rapport porte `rateLimited: true` et rend la
progression acquise au lieu de la perdre.

Ordres de grandeur mesurés sur le miroir de deux saisons : **environ 15 minutes
pour un premier remplissage** (138 matchs) et **quatre minutes pour un passage
incrémental**. Attention à ne pas couper le client en cours de route — une
déconnexion avorte le traitement côté serveur, et ce qui restait à faire attend
le passage suivant.

Planification, sur le serveur. L'appel est enveloppé dans
`shared/premier-sync.sh` — tenu hors du dépôt, avec les autres fichiers
d'exploitation : il source le `.env`, prend un budget de matchs en argument et
journalise lui-même dans `shared/logs/cron.log`.

```
# Samedi 20h00 -> 23h55 : les creneaux de 19h15 et 21h15 se
# terminent dans cette fenetre, le flock enchaine les passages.
*/5 20-23 * * 6 /var/www/the-hub-vrc.fr/shared/premier-sync.sh
# Dimanche a vendredi : un passage, budget elargi pour absorber
# une journee de playoffs sans etaler le rattrapage.
0 6 * * 0-5 /var/www/the-hub-vrc.fr/shared/premier-sync.sh 100
```

Le découpage horaire n'est pas cosmétique : **un passage à vide n'est pas
gratuit**. Avant le moindre import, il consomme un appel de saisons, deux de
classement et **un d'historique par équipe** — soit 76 appels et environ 150
crédits incompressibles à chaque fois. Tourner en `*/15` toute la semaine
brûlait ce plancher 96 fois par jour pour regarder des journées sans match. Les
deux rencontres de saison régulière tombent le samedi à 19h15 et 21h15, et
leurs résultats n'existent qu'une fois les parties finies : la fenêtre part
donc de 20h00. Le reste du temps, un passage quotidien suffit à rattraper le
classement, les équipes qui changent de division et les matchs tombés en
`NOT_FOUND` transitoire.

Les paliers payants HenrikDev ont été évalués et écartés : le premier (130
crédits/min) ramènerait un passage de samedi soir de dix à deux minutes, mais
les appels sont émis **en séquentiel**, et passé ce palier c'est la latence
HTTP cumulée qui devient le goulet, pas le quota. Rien à gagner au-dessus tant
que les appels ne sont pas parallélisés.

`flock -n` n'est pas décoratif non plus : un passage dure de quatre à dix
minutes pour un cron qui tombe toutes les cinq minutes le samedi. Sans lui, les
passages se superposeraient et tomberaient tous sur des 429.

## Déploiement

Push sur `main` → `.github/workflows/deploy.yml` construit, envoie et bascule
une release horodatée sur le Kimsufi, migrations comprises.

La procédure complète — préparation initiale du serveur, configuration Apache,
effacement RGPD — est tenue hors du dépôt, avec les autres documents
d'exploitation.

## Licence

**Tous droits réservés.** Ce dépôt est un logiciel propriétaire : aucune
licence d'utilisation, de copie, de modification ou de redistribution n'est
concédée. Voir [LICENSE](LICENSE).

## Mentions

Projet communautaire **non affilié à Riot Games**. Valorant et les contenus
associés sont la propriété de Riot Games, Inc.
