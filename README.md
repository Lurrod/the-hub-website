# The Hub

Site de la scène **Tier 3 Valorant francophone** : tournois, équipes, joueurs,
matchs et statistiques détaillées (scoreboard, timeline des rounds, ACS, ADR,
KAST). En production sur [the-hub-vrc.fr](https://the-hub-vrc.fr).

## Pile technique

| Domaine | Choix |
| --- | --- |
| Framework | Next.js 16 (App Router, React Server Components) |
| Langage | TypeScript, React 19 |
| Base de données | PostgreSQL via Prisma |
| Authentification | Auth.js 5 (Discord uniquement, sessions en base) |
| Styles | Tailwind CSS 4, jetons de charte dans `src/app/globals.css` |
| Images | `sharp` côté serveur, servies en webp par `/api/images` |
| Données Valorant | API HenrikDev (vérification de Riot ID, statistiques de match) |
| Hébergement | Serveur OVH Kimsufi, PM2 derrière Apache |

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

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `AUTH_SECRET` | Secret de signature des sessions Auth.js |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Application OAuth Discord |
| `ADMIN_DISCORD_IDS` | Identifiants Discord promus administrateurs à la connexion |
| `NEXTAUTH_URL` | URL publique, utilisée pour les callbacks OAuth |
| `NEXT_PUBLIC_BASE_URL` | URL publique des métadonnées, du sitemap et du robots.txt |
| `HENRIKDEV_API_KEY` | Clé de l'API HenrikDev (côté serveur uniquement) |

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement (port 3200) |
| `npm run build` / `npm start` | Build de production autonome, puis service |
| `npm run lint` | ESLint (configuration Next + durcissement `no-console`) |
| `npm run format` / `format:check` | Prettier |
| `npm test` | Tests unitaires Vitest |
| `npm run test:coverage` | Idem avec couverture et seuils planchers |
| `npm run test:e2e` | Parcours Playwright |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed:dev` | Jeu de démonstration (fixtures des tests E2E) |
| `npm run db:seed:vlr` | Import de données VCT EMEA réalistes |
| `npm run db:seed:scoreboards` | Scoreboards de démonstration |
| `npm run db:studio` | Prisma Studio |

## Organisation

```
src/
  app/          routes App Router (pages, layouts, server actions, API)
  components/   composants React
  lib/          logique métier pure, validation Zod, accès données (lib/data)
  proxy.ts      garde d'authentification, gate d'onboarding, CSP
prisma/         schéma, migrations, jeux de données
tests/unit/     Vitest — logique pure
tests/e2e/      Playwright — parcours
deploy/         configuration Apache de production
docs/           déploiement et notes de conception
```

## Tests et qualité

La CI (`.github/workflows/ci.yml`) enchaîne lint, types, tests unitaires avec
seuils de couverture, audit des dépendances et build de production. Un second
job joue les parcours Playwright contre une base PostgreSQL éphémère.

Les seuils de couverture portent sur `src/lib/**` et servent de cliquet : ils
sont calés sur le niveau atteint, à relever au fil des ajouts de tests. Les
composants et les pages relèvent des parcours end-to-end.

## Déploiement

Push sur `main` → `.github/workflows/deploy.yml` construit, envoie et bascule
une release horodatée sur le Kimsufi, migrations comprises. La procédure
complète, y compris la préparation initiale du serveur, est dans
[docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md).

## Mentions

Projet communautaire **non affilié à Riot Games**. Valorant et les contenus
associés sont la propriété de Riot Games, Inc.
