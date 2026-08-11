# Déploiement — the-hub-vrc.fr

Serveur OVH `51.68.234.84`, utilisateur `ubuntu`, sites dans `/var/www`, process
gérés par **pm2** — on s'aligne sur ce qui tourne déjà (`titouan-borde.com`,
`vol-histoire`, …).

Le build tourne dans GitHub Actions, jamais sur le serveur : une compilation
Next.js est gourmande et ne doit pas pouvoir faire tomber les autres sites.
Actions produit un paquet autonome (`output: "standalone"`), le serveur ne fait
que le décompresser et recharger pm2.

## Emplacement retenu

```
/var/www/the-hub-vrc.fr
```

Nommé d'après le domaine, comme `titouan-borde.com`. `/var/www/the-hub-website`
existe déjà et héberge Fast Learner : on n'y touche pas, ce qui évite d'avoir à
déplacer un site en production (son process pm2 et son VirtualHost pointent sur ce
chemin et tomberaient le temps de la reprise).

Si tu veux quand même renommer Fast Learner plus tard, ce n'est pas un simple
`mv` : il faut arrêter son process, corriger son VirtualHost, puis le relancer
depuis le nouveau chemin. Ça n'a aucun impact sur Le Hub.

## Arborescence

```
<APP_DIR>/
├── current -> releases/20260729...   lien vers la version active
├── releases/                          5 dernières versions (retour arrière possible)
└── shared/
    ├── .env                           secrets de production
    ├── logs/                          sorties pm2
    └── uploads/                       images déposées (persistantes)
```

`uploads/` et `.env` vivent dans `shared/` et sont liés dans chaque release :
sans ça, chaque déploiement effacerait les images envoyées par les utilisateurs.

## 1. Préparer le dossier (une seule fois)

```bash
APP_DIR=/var/www/the-hub-vrc.fr
sudo mkdir -p "$APP_DIR"/{releases,shared/uploads,shared/logs}
sudo chown -R ubuntu:ubuntu "$APP_DIR"
```

## 2. Base de données

```bash
# Si PostgreSQL n'est pas encore installé
sudo apt update && sudo apt install -y postgresql
sudo -u postgres createuser thehub --pwprompt
sudo -u postgres createdb thehub -O thehub
```

## Deux jeux de secrets, à ne pas confondre

|                    | Étape 3                                              | Étape 6                                |
| ------------------ | ---------------------------------------------------- | -------------------------------------- |
| Où                 | fichier **sur le serveur**                           | interface **GitHub**                   |
| Quoi               | `<APP_DIR>/shared/.env`                              | Settings → Secrets → Actions           |
| Rôle               | **faire tourner** le site (base, Discord, HenrikDev) | **livrer** le site (IP, user, clé SSH) |
| Visible par GitHub | **non, jamais**                                      | oui                                    |

Les secrets applicatifs ne quittent jamais le serveur. GitHub ne reçoit que de
quoi s'y connecter en SSH.

## 3. Secrets de production (sur le serveur)

Créer `<APP_DIR>/shared/.env` (droits `600`). La plupart des valeurs se
reprennent telles quelles depuis ton `.env.local` de développement :

- **à copier tel quel** : `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`,
  `ADMIN_DISCORD_IDS`, `HENRIKDEV_API_KEY`
- **à refaire** : `DATABASE_URL` (base du serveur, étape 2) et `AUTH_SECRET`
  (regénérer avec `npx auth secret` — ne pas réutiliser celui de dev)
- **à ajouter** : `AUTH_URL`, `NEXT_PUBLIC_BASE_URL`, `AUTH_TRUST_HOST`

Guillemets **simples** : le script de déploiement fait `. shared/.env`, donc bash
interpréterait un `$` placé entre guillemets doubles (un mot de passe contenant
`$` serait tronqué sans erreur visible).

```ini
DATABASE_URL='postgresql://thehub:MOT_DE_PASSE@localhost:5432/thehub'
AUTH_SECRET='<openssl rand -base64 32>'
AUTH_DISCORD_ID='<id application Discord>'
AUTH_DISCORD_SECRET='<secret application Discord>'
# Plusieurs administrateurs : séparés par des virgules
ADMIN_DISCORD_IDS='<id1>,<id2>'
AUTH_URL='https://the-hub-vrc.fr'
NEXTAUTH_URL='https://the-hub-vrc.fr'
NEXT_PUBLIC_BASE_URL='https://the-hub-vrc.fr'
AUTH_TRUST_HOST='true'
HENRIKDEV_API_KEY='<clé HenrikDev>'
```

```bash
chmod 600 "$APP_DIR/shared/.env"
```

`AUTH_TRUST_HOST` est requis derrière un reverse proxy, sinon Auth.js refuse l'en-tête
`X-Forwarded-Host` et la connexion Discord échoue.

Penser à ajouter `https://the-hub-vrc.fr/api/auth/callback/discord` dans les
_Redirects_ de l'application Discord — l'URL de dev ne suffit pas en prod.

## 4. Apache + HTTPS

Le serveur tourne sous **Apache**, pas nginx.

```bash
sudo a2enmod proxy proxy_http headers deflate

# deploy/apache.conf est dans le dépôt, jamais cloné sur le serveur :
#   scp deploy/apache.conf ubuntu@51.68.234.84:/tmp/
sudo cp /tmp/apache.conf /etc/apache2/sites-available/the-hub-vrc.fr.conf

sudo a2ensite the-hub-vrc.fr
sudo apache2ctl configtest && sudo systemctl reload apache2

sudo apt install -y python3-certbot-apache
sudo certbot --apache -d the-hub-vrc.fr -d www.the-hub-vrc.fr
```

Le DNS de `the-hub-vrc.fr` doit pointer sur `51.68.234.84` **avant** certbot,
sinon la validation échoue.

`X-Forwarded-Proto` est posé via `expr=%{REQUEST_SCHEME}` et non en dur :
certbot duplique ce VirtualHost pour le 443, et une valeur figée a `http` y
ferait construire les callbacks Discord en http.

### Deux VirtualHosts, et c'est le second qui sert le trafic

**À lire avant toute modification d'Apache.** `certbot --apache` ne modifie pas
le fichier existant : il en fait une **copie figée** pour le 443.

```
/etc/apache2/sites-available/the-hub-vrc.fr.conf          :80  — redirige vers HTTPS
/etc/apache2/sites-available/the-hub-vrc.fr-le-ssl.conf   :443 — sert le vrai trafic
```

Conséquence : `deploy/apache.conf` ne décrit **que** le `:80`. Le `-le-ssl.conf`
a été copié le jour où certbot est passé et ne bouge plus. Les deux dérivent
depuis, et le dépôt raconte alors une chose pendant que la production en fait
une autre.

Le 10 août 2026, `LimitRequestBody` a ainsi été porté à 12 Mo dans le dépôt et
dans le `:80` — sans effet, parce que le `:443` est resté à 8 Mo pendant que le
symptôme (413 sur un envoi lourd) restait entier.

**Toute directive de comportement — `LimitRequestBody`, filtres de compression,
en-têtes, `LocationMatch` — doit être reportée dans les deux fichiers.** Le
`:80` n'a besoin que de la redirection ; c'est le `:443` qui compte.

Après chaque modification :

```bash
grep -nE 'LimitRequestBody|BROTLI_COMPRESS|DEFLATE' \
  /etc/apache2/sites-available/the-hub-vrc.fr*.conf
sudo apache2ctl configtest && sudo systemctl restart apache2
```

`restart` et non `reload` : un module fraîchement activé par `a2enmod` n'est pas
chargé par un simple rechargement — Apache le dit lui-même à l'activation.

### Compression

`deflate` est activé à l'étape ci-dessus. Brotli demande un module de plus :

```bash
sudo a2enmod brotli
sudo systemctl restart apache2
curl -sI -H 'Accept-Encoding: br' https://the-hub-vrc.fr/ | grep -i content-encoding
```

Attendu : `content-encoding: br`. Le bloc `AddOutputFilterByType BROTLI_COMPRESS`
de `deploy/apache.conf` est encadré par `<IfModule mod_brotli.c>` : la
configuration reste valide si le module n'est pas activé.

## 5. Clé SSH pour GitHub Actions

Un mot de passe ne convient pas pour de l'automatisé : il faut une paire dédiée,
sans passphrase. À générer **sur ton poste**, pas sur le serveur :

```bash
ssh-keygen -t ed25519 -C "github-actions-the-hub" -f ~/.ssh/thehub_deploy -N ""
ssh-copy-id -i ~/.ssh/thehub_deploy.pub ubuntu@51.68.234.84
ssh-keyscan 51.68.234.84                 # valeur de SSH_KNOWN_HOSTS
ssh -i ~/.ssh/thehub_deploy ubuntu@51.68.234.84 'pm2 -v'   # vérifie que ça passe
```

## 6. Secrets GitHub (pour la livraison)

**Settings → Secrets and variables → Actions**. Rien d'applicatif ici : ces
valeurs servent uniquement à GitHub Actions pour se connecter au serveur.

| Secret            | Valeur                                                 |
| ----------------- | ------------------------------------------------------ |
| `SSH_HOST`        | `51.68.234.84`                                         |
| `SSH_USER`        | `ubuntu`                                               |
| `SSH_PORT`        | `22`                                                   |
| `SSH_PRIVATE_KEY` | contenu de `~/.ssh/thehub_deploy` (clé privée entière) |
| `SSH_KNOWN_HOSTS` | sortie de `ssh-keyscan 51.68.234.84`                   |
| `APP_DIR`         | `/var/www/the-hub-vrc.fr`                              |

## 7. Mise en ligne

Tout push sur `main` déclenche : types → tests → build → envoi → migrations →
`pm2 reload` → vérification HTTP. Si un contrôle échoue, rien n'est envoyé et la
version en ligne reste intacte.

Le workflow refuse de déployer si `<APP_DIR>/shared/.env` n'existe pas : c'est le
garde-fou qui empêche d'écraser un autre site en cas d'`APP_DIR` erroné.

Vérifier que pm2 redémarre bien au reboot (probablement déjà fait pour tes autres
sites) :

```bash
pm2 startup     # à exécuter une fois, suivre la commande affichée
pm2 save
```

Retour arrière :

```bash
APP=/var/www/the-hub-vrc.fr
ln -sfn "$APP/releases/<version-precedente>" "$APP/current"
cd "$APP/current" && pm2 reload ecosystem.config.cjs --update-env
```

## Points à surveiller

- **Sauvegardes** : rien n'est sauvegardé pour l'instant. Prévoir un `pg_dump`
  quotidien et une copie de `shared/uploads/`.
- **Statut des tournois** : les bascules « à venir → en cours → terminé » se
  déduisent des dates. Elles sont recalculées au fil des consultations, au plus
  une fois toutes les cinq minutes. Pour qu'un site sans visite ne prenne pas
  de retard, ajouter une tâche planifiée quotidienne :

  ```bash
  # crontab -e, à 00h05 UTC
  5 0 * * * cd /var/www/the-hub-vrc.fr/current && set -a && . /var/www/the-hub-vrc.fr/shared/.env && set +a && node scripts/sync-tournament-statuses.mjs >> /var/www/the-hub-vrc.fr/shared/logs/cron.log 2>&1
  ```

  Rien de critique n'en dépend : l'ouverture des inscriptions est décidée à
  partir des dates, pas du statut stocké.

- **Scripts de maintenance sur le serveur** : le paquet déployé est un build
  `standalone`. Il ne contient **ni le `package.json` du dépôt, ni `tsx`, ni les
  dépendances de développement** — `npm run <quelque chose>` n'y existe pas.
  Seuls les scripts en `.mjs`, listés explicitement dans l'étape « Assembler le
  paquet à déployer » de `.github/workflows/deploy.yml`, sont livrés et
  s'exécutent avec le Node et le client Prisma de la release.

  Les variables d'environnement ne sont pas chargées automatiquement hors pm2 :
  il faut sourcer `shared/.env` soi-même.

  ```bash
  APP=/var/www/the-hub-vrc.fr
  cd "$APP/current"
  set -a; . "$APP/shared/.env"; set +a

  node scripts/sync-tournament-statuses.mjs
  node scripts/prune-orphan-images.mjs            # aperçu, ne supprime rien
  node scripts/prune-orphan-images.mjs --apply    # effacement
  node scripts/recalibrate-ratings.mjs            # mesure, n'écrit rien
  node scripts/recalibrate-ratings.mjs --apply    # recalcule les ratings stockés
  ```

  Les scripts d'amorçage (`seed-*`) restent en TypeScript et ne sont
  volontairement **pas** livrés : ce sont des données de démonstration.

- **Images orphelines** : avant la correction du finding RGPD-01 (v1.15.0), une
  suppression ne retirait que la ligne en base et laissait le fichier sur le
  disque, toujours servi par `/api/images`. Les suppressions l'effacent
  désormais ; `prune-orphan-images.mjs` est là pour rattraper l'historique, à
  passer une fois. Toujours lire l'aperçu avant `--apply`.

- **Centrage du rating** : le rating est une échelle centrée sur 1,00, portée
  par la constante `RATING_BASELINE` de `src/lib/match-stats-core.ts`. Elle est
  ajustée sur les données du site, et le niveau moyen peut dériver à mesure que
  la base grossit. `recalibrate-ratings.mjs` sans option ne fait que mesurer :
  il affiche le rating de la ligne moyenne du moment et la constante qu'elle
  appellerait. Si l'écart devient sensible, reporter la valeur dans le code,
  déployer, puis relancer avec `--apply` pour réécrire les ratings déjà
  stockés — sinon deux échelles coexistent sur le site. Le passage `--apply`
  est idempotent : relancé, il ne réécrit plus rien.

- **Migrations destructives** : `prisma migrate deploy` tourne avant la bascule.
  Une migration qui supprime une colonne cassera l'ancienne version pendant le
  rechargement.
- **Le seed n'est jamais lancé automatiquement** : les scripts `db:seed*`
  contiennent des données de démonstration et n'ont rien à faire en production.
- **Port 3200** : l'application n'écoute que sur `127.0.0.1`, elle n'est donc pas
  joignable depuis l'extérieur autrement que par Apache.
