#!/bin/sh
# Un passage de synchronisation du Premier français, appelé par la crontab du
# serveur. Voir la section Premier du README pour les horaires et le raisonnement.
#
# Versionné plutôt que tenu à la main dans `shared/` : le fichier écrit au
# clavier a été mutilé trois fois par des collages tronqués, dont une où
# `cat >` a vidé le script sans le réécrire. Le déploiement le livre désormais
# comme les autres scripts de maintenance.
#
# Arg 1 : budget de matchs à importer dans le passage (40 par défaut).
# Arg 2 : fullSweep. `true` relit l'historique des 72 équipes ; `false` ne relit
#         que celles dont le bilan a bougé au classement. Vrai par défaut —
#         seul l'historique montre les participations de playoffs et les
#         imports tombés en échec, un oubli doit donc dégrader vers le
#         comportement complet, jamais vers un match manqué.
BUDGET="${1:-40}"
SWEEP="${2:-true}"

# Chemins absolus : le script tourne depuis la crontab, sans répertoire courant
# garanti, et `.env` comme les journaux vivent hors de la release.
BASE=/var/www/the-hub-vrc.fr/shared

set -a
. "$BASE/.env"
set +a

URL=http://127.0.0.1:3200/api/premier/sync
AUTH="Authorization: Bearer $PREMIER_SYNC_SECRET"
CT='Content-Type: application/json'
DATA="{\"matchBudget\":$BUDGET,\"fullSweep\":$SWEEP}"

# `flock -n` n'est pas décoratif : un passage dure de quelques secondes à dix
# minutes pour un cron qui tombe toutes les cinq minutes le samedi. Sans lui,
# deux passages se superposeraient et prendraient tous deux des 429.
{
  printf '%s ' "$(date -Is)"
  flock -n /tmp/premier-sync.lock \
    curl -s -m 840 -X POST -H "$AUTH" -H "$CT" -d "$DATA" "$URL"
  echo
} >> "$BASE/logs/cron.log" 2>&1
