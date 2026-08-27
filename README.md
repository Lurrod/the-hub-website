# The Hub

Site de la scène **Tier 3 Valorant francophone** : tournois, équipes, joueurs,
matchs et statistiques détaillées (scoreboard, timeline des rounds, ACS, ADR,
KAST). En production sur [the-hub-vrc.fr](https://the-hub-vrc.fr).

## Pile technique

| Domaine          | Choix                                                          |
| ---------------- | -------------------------------------------------------------- |
| Framework        | Next.js 16 (App Router, React Server Components)               |
| Langage          | TypeScript, React 19                                           |
| Base de données  | PostgreSQL via Prisma                                          |
| Authentification | Auth.js 5 (Discord uniquement, sessions en base)               |
| Styles           | Tailwind CSS 4, jetons de charte dans `src/app/globals.css`    |
| Images           | `sharp` côté serveur, servies en webp par `/api/images`        |
| Données Valorant | API HenrikDev (vérification de Riot ID, statistiques de match) |
| Hébergement      | Serveur OVH Kimsufi, PM2 derrière Apache                       |

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

| Commande                          | Effet                                                               |
| --------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                     | Serveur de développement (port 3200)                                |
| `npm run build` / `npm start`     | Build de production autonome, puis service                          |
| `npm run lint`                    | ESLint (configuration Next + durcissement `no-console`)             |
| `npm run format` / `format:check` | Prettier                                                            |
| `npm test`                        | Tests unitaires Vitest                                              |
| `npm run test:coverage`           | Idem avec couverture et seuils planchers                            |
| `npm run test:e2e`                | Parcours Playwright                                                 |
| `npm run db:migrate`              | `prisma migrate dev`                                                |
| `npm run db:seed:dev`             | Jeu de démonstration (fixtures des tests E2E)                       |
| `npm run db:seed:vlr`             | Import de données VCT EMEA réalistes                                |
| `npm run db:seed:scoreboards`     | Scoreboards de démonstration                                        |
| `npm run db:studio`               | Prisma Studio                                                       |
| `npm run db:sync:tournaments`     | Recale le statut des tournois d'après leurs dates (tâche planifiée) |

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

Les équipes sont rattachées par `Team.premierTeamId` — jamais par leur nom, qui
change — et leurs logos sont rapatriés dans le stockage local plutôt que servis
depuis le CDN de HenrikDev, que la CSP bloquerait.

**Les playoffs ne sont pas encore importés**, et la place leur est faite sans
être occupée. `tournament_matches` ne liste pas un tournoi de fin de saison mais
tous les tournois Premier joués, à raison d'un par semaine — treize
participations par équipe sur quatre mois. Les fondre dans un seul arbre donnait
six « finales » et vingt-deux brackets parallèles pour treize matchs. Les
modéliser correctement demande de traiter chaque tournoi hebdomadaire pour ce
qu'il est.

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
     http://127.0.0.1:3000/api/premier/sync
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

Ligne de crontab, sur le serveur :

```
*/15 * * * * /usr/bin/flock -n /tmp/premier-sync.lock curl -s --max-time 840 -X POST -H "Authorization: Bearer $PREMIER_SYNC_SECRET" -H "Content-Type: application/json" -d '{}' http://127.0.0.1:3000/api/premier/sync >> /var/log/premier-sync.log 2>&1
```

`flock -n` n'est pas décoratif : un passage incrémental dure environ quatre
minutes, mais un rattrapage après interruption peut approcher le quart d'heure
du cron. Sans lui, un passage en retard doublerait les appels et ferait tomber
les deux sur des 429.

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
