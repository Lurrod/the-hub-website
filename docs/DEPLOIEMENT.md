# Déploiement — the-hub-vrc.fr (Kimsufi)

Le build tourne dans GitHub Actions, jamais sur le serveur : un Kimsufi d'entrée
de gamme n'a pas toujours la RAM pour compiler Next.js, et une compilation ratée
ne doit pas pouvoir casser la prod. Actions envoie un paquet autonome
(`output: "standalone"`), le serveur ne fait que le décompresser et redémarrer.

## Arborescence sur le serveur

```
/srv/the-hub/
├── current -> releases/20260729...   lien vers la version active
├── releases/                          5 dernières versions (retour arrière possible)
└── shared/
    ├── .env                           secrets de production
    └── uploads/                       images déposées (persistantes)
```

`uploads/` et `.env` vivent dans `shared/` et sont liés dans chaque release :
sans ça, chaque déploiement effacerait les images envoyées par les utilisateurs.

## 1. Préparer le serveur (une seule fois)

```bash
# Utilisateur dédié, sans shell de connexion
sudo adduser --system --group --home /srv/the-hub thehub
sudo mkdir -p /srv/the-hub/{releases,shared/uploads}
sudo chown -R thehub:thehub /srv/the-hub

# Node 22 + nginx + PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx postgresql certbot python3-certbot-nginx

# Base de données
sudo -u postgres createuser thehub --pwprompt
sudo -u postgres createdb thehub -O thehub
```

## 2. Secrets de production

Créer `/srv/the-hub/shared/.env` (droits `600`, propriétaire `thehub`) :

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

`AUTH_TRUST_HOST` est requis derrière nginx, sinon Auth.js refuse l'en-tête
`X-Forwarded-Host` et la connexion Discord échoue.

Penser à ajouter `https://the-hub-vrc.fr/api/auth/callback/discord` dans les
*Redirects* de l'application Discord — l'URL de dev ne suffit pas en prod.

## 3. Service et proxy

```bash
sudo cp deploy/the-hub.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable the-hub

sudo cp deploy/nginx.conf /etc/nginx/sites-available/the-hub-vrc.fr
sudo ln -s /etc/nginx/sites-available/the-hub-vrc.fr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# HTTPS (voir la note plus bas : ce n'est pas optionnel)
sudo certbot --nginx -d the-hub-vrc.fr -d www.the-hub-vrc.fr
```

Le workflow redémarre le service via `sudo systemctl restart the-hub`. Autoriser
cette seule commande sans mot de passe, avec `sudo visudo -f /etc/sudoers.d/thehub` :

```
deploy ALL=(root) NOPASSWD: /bin/systemctl restart the-hub
```

## 4. Accès SSH pour GitHub Actions

Créer une paire de clés **dédiée au déploiement**, sans passphrase :

```bash
ssh-keygen -t ed25519 -C "github-actions-the-hub" -f ~/.ssh/thehub_deploy -N ""
ssh-copy-id -i ~/.ssh/thehub_deploy.pub deploy@<ip-du-kimsufi>
ssh-keyscan -p 22 <ip-du-kimsufi>       # valeur de SSH_KNOWN_HOSTS
```

## 5. Secrets GitHub

Dans **Settings → Secrets and variables → Actions** :

| Secret | Contenu |
|---|---|
| `SSH_HOST` | IP ou hôte du Kimsufi |
| `SSH_USER` | utilisateur de déploiement (ex. `deploy`) |
| `SSH_PORT` | port SSH (par défaut `22`) |
| `SSH_PRIVATE_KEY` | contenu de `~/.ssh/thehub_deploy` (clé privée entière) |
| `SSH_KNOWN_HOSTS` | sortie de `ssh-keyscan` |
| `APP_DIR` | `/srv/the-hub` |

## 6. Mise en ligne

Tout push sur `master` déclenche : types → tests → build → envoi → migrations →
redémarrage → vérification HTTP. En cas d'échec sur l'un de ces contrôles, rien
n'est envoyé et la version en ligne reste intacte.

Retour arrière manuel :

```bash
ln -sfn /srv/the-hub/releases/<version-precedente> /srv/the-hub/current
sudo systemctl restart the-hub
```

## HTTPS : pourquoi le `http://` de l'énoncé ne tient pas

Le site authentifie via Discord OAuth et pose un cookie de session. En clair
(`http://`), ce cookie circule en clair : n'importe qui sur le même réseau peut
le capter et se faire passer pour l'utilisateur — y compris un administrateur.
Auth.js préfixe d'ailleurs ses cookies en `__Secure-` en production, ce que les
navigateurs refusent hors HTTPS.

Certbot est gratuit et la configuration nginx ci-dessus est prête. Les variables
d'environnement pointent donc sur `https://the-hub-vrc.fr`, avec redirection
automatique depuis `http://`.

## Points à surveiller

- **Sauvegardes** : rien n'est sauvegardé pour l'instant. Prévoir un `pg_dump`
  quotidien et une copie de `shared/uploads/`.
- **Migrations destructives** : `prisma migrate deploy` tourne avant la bascule.
  Une migration qui supprime une colonne cassera l'ancienne version pendant les
  quelques secondes de redémarrage.
- **Le seed n'est jamais lancé automatiquement** : les scripts `db:seed*`
  contiennent des données de démonstration et n'ont rien à faire en production.
