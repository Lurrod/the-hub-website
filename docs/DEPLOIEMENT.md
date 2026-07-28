# Déploiement — the-hub-vrc.fr

Serveur OVH `51.68.234.84`, utilisateur `ubuntu`, sites dans `/var/www`, process
gérés par **pm2** — on s'aligne sur ce qui tourne déjà (`titouan-borde.com`,
`vol-histoire`, …).

Le build tourne dans GitHub Actions, jamais sur le serveur : une compilation
Next.js est gourmande et ne doit pas pouvoir faire tomber les autres sites.
Actions produit un paquet autonome (`output: "standalone"`), le serveur ne fait
que le décompresser et recharger pm2.

## ⚠ Conflit de nom à régler avant tout

`/var/www/the-hub-website` **existe déjà** et héberge un autre projet (Fast
Learner). Deux options :

**Option A — renommer l'existant** (ce que tu as demandé). Ce n'est pas un simple
`mv` : le process pm2 et la conf nginx du site pointent sur l'ancien chemin et
casseront tant qu'ils ne sont pas mis à jour.

```bash
# 1. Repérer le nom du process et la conf nginx concernés
pm2 list
grep -rl "the-hub-website" /etc/nginx/sites-available/

# 2. Arrêter, renommer, repartir
pm2 stop <nom-du-process-fast-learner>
sudo mv /var/www/the-hub-website /var/www/fl-website
sudo sed -i "s#/var/www/the-hub-website#/var/www/fl-website#g" /etc/nginx/sites-available/<conf-fast-learner>
sudo nginx -t && sudo systemctl reload nginx

# 3. Relancer depuis le nouveau chemin
cd /var/www/fl-website && pm2 delete <nom-du-process> && pm2 start <sa-commande> && pm2 save
```

Le Hub va ensuite dans `/var/www/the-hub-website`, libéré.

**Option B — ne toucher à rien** : installer Le Hub dans
`/var/www/the-hub-vrc.fr`, comme `titouan-borde.com` est nommé d'après son
domaine. Aucun risque pour le site existant, et le nom reste sans ambiguïté.

Le chemin retenu est simplement la valeur du secret `APP_DIR`, rien d'autre ne
change dans le workflow.

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
APP_DIR=/var/www/the-hub-website          # ou /var/www/the-hub-vrc.fr (option B)
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

## 3. Secrets de production

Créer `<APP_DIR>/shared/.env` (droits `600`) :

```ini
DATABASE_URL="postgresql://thehub:MOT_DE_PASSE@localhost:5432/thehub"
AUTH_SECRET="<npx auth secret>"
AUTH_DISCORD_ID="<id application Discord>"
AUTH_DISCORD_SECRET="<secret application Discord>"
ADMIN_DISCORD_IDS="<ton id Discord>"
AUTH_URL="https://the-hub-vrc.fr"
NEXTAUTH_URL="https://the-hub-vrc.fr"
NEXT_PUBLIC_BASE_URL="https://the-hub-vrc.fr"
AUTH_TRUST_HOST="true"
HENRIKDEV_API_KEY="<clé HenrikDev>"
```

```bash
chmod 600 "$APP_DIR/shared/.env"
```

`AUTH_TRUST_HOST` est requis derrière nginx, sinon Auth.js refuse l'en-tête
`X-Forwarded-Host` et la connexion Discord échoue.

Penser à ajouter `https://the-hub-vrc.fr/api/auth/callback/discord` dans les
*Redirects* de l'application Discord — l'URL de dev ne suffit pas en prod.

## 4. nginx + HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/the-hub-vrc.fr
sudo ln -s /etc/nginx/sites-available/the-hub-vrc.fr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d the-hub-vrc.fr -d www.the-hub-vrc.fr
```

Le DNS de `the-hub-vrc.fr` doit pointer sur `51.68.234.84` **avant** certbot,
sinon la validation échoue.

## 5. Clé SSH pour GitHub Actions

Un mot de passe ne convient pas pour de l'automatisé : il faut une paire dédiée,
sans passphrase. À générer **sur ton poste**, pas sur le serveur :

```bash
ssh-keygen -t ed25519 -C "github-actions-the-hub" -f ~/.ssh/thehub_deploy -N ""
ssh-copy-id -i ~/.ssh/thehub_deploy.pub ubuntu@51.68.234.84
ssh-keyscan 51.68.234.84                 # valeur de SSH_KNOWN_HOSTS
ssh -i ~/.ssh/thehub_deploy ubuntu@51.68.234.84 'pm2 -v'   # vérifie que ça passe
```

## 6. Secrets GitHub

**Settings → Secrets and variables → Actions** :

| Secret | Valeur |
|---|---|
| `SSH_HOST` | `51.68.234.84` |
| `SSH_USER` | `ubuntu` |
| `SSH_PORT` | `22` |
| `SSH_PRIVATE_KEY` | contenu de `~/.ssh/thehub_deploy` (clé privée entière) |
| `SSH_KNOWN_HOSTS` | sortie de `ssh-keyscan 51.68.234.84` |
| `APP_DIR` | le chemin choisi au point 1 |

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
ln -sfn /var/www/<app>/releases/<version-precedente> /var/www/<app>/current
cd /var/www/<app>/current && pm2 reload ecosystem.config.cjs --update-env
```

## Points à surveiller

- **Sauvegardes** : rien n'est sauvegardé pour l'instant. Prévoir un `pg_dump`
  quotidien et une copie de `shared/uploads/`.
- **Migrations destructives** : `prisma migrate deploy` tourne avant la bascule.
  Une migration qui supprime une colonne cassera l'ancienne version pendant le
  rechargement.
- **Le seed n'est jamais lancé automatiquement** : les scripts `db:seed*`
  contiennent des données de démonstration et n'ont rien à faire en production.
- **Port 3200** : l'application n'écoute que sur `127.0.0.1`, elle n'est donc pas
  joignable depuis l'extérieur autrement que par nginx.
