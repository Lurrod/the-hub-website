# Procédure d'effacement des données personnelles

Cette procédure outille l'engagement pris dans la politique de confidentialité
(`/confidentialite`) : droits exercés par message Discord, réponse dans un délai
d'un mois, statistiques de match conservées **sous forme dissociée** de
l'identité du joueur.

Elle existe parce que l'audit du 6 août 2026 (finding RGPD-02) a relevé qu'aucun
mode opératoire n'était écrit : le délai d'un mois reposait sur une manipulation
SQL improvisée, avec un risque d'oubli sur les fichiers déposés, les sessions et
la fiche joueur.

## Ce que la politique promet, et ce que cela implique

| Donnée                   | Sort à l'effacement                           |
| ------------------------ | --------------------------------------------- |
| Compte (`User`)          | supprimé                                      |
| Jetons OAuth (`Account`) | supprimé en cascade                           |
| Sessions (`Session`)     | supprimé en cascade                           |
| Rôles de gestion         | `TeamManager` supprimé en cascade             |
| Fiche joueur (`Player`)  | conservée mais **anonymisée** (voir plus bas) |
| Photo déposée            | fichier effacé du disque                      |
| Statistiques de match    | conservées, `playerId` remis à `NULL`         |
| Historique d'équipe      | conservé (adhésions rattachées à la fiche)    |

La conservation des statistiques est un choix assumé et annoncé : les
classements et les feuilles de match d'une compétition passée resteraient faux
si les lignes disparaissaient. Le lien vers l'identité est en revanche rompu.

## Mode opératoire

### 1. Identifier la personne

La demande arrive par Discord. Retrouver le compte par son identifiant Discord —
jamais par le pseudo, qui n'est pas unique.

```sql
SELECT u.id AS user_id, u."discordId", u."discordUsername", u.email,
       p.id AS player_id, p.pseudo, p.photo
FROM "User" u
LEFT JOIN "Player" p ON p."userId" = u.id
WHERE u."discordId" = '<discord_id>';
```

Noter `user_id` et `player_id` : toutes les étapes suivantes s'y réfèrent.

### 2. Anonymiser la fiche joueur

À faire **avant** la suppression du compte : une fois `User` supprimé,
`Player.userId` passe à `NULL` (`onDelete: SetNull`) et le rapprochement n'est
plus possible.

```sql
UPDATE "Player" SET
  pseudo       = 'Joueur supprimé',
  "realName"   = NULL,
  nationality  = NULL,
  photo        = NULL,
  socials      = NULL,
  birthdate    = NULL,
  "riotName"   = NULL,
  "riotTag"    = NULL,
  puuid        = NULL,
  lft          = false,
  "lftSince"   = NULL,
  "showDiscord" = false
WHERE id = '<player_id>';
```

`puuid` doit être remis à `NULL` : c'est un identifiant Riot stable, il
permettrait de reconstituer l'identité à partir des feuilles de match.

### 3. Dissocier les statistiques

`PlayerGameStat.playerId` est déjà en `onDelete: SetNull`, mais la fiche n'est
pas supprimée ici — la dissociation doit donc être explicite. `riotName` et
`riotTag` y sont recopiés à l'import : ils sont eux aussi identifiants.

```sql
UPDATE "PlayerGameStat"
SET "playerId" = NULL, "riotName" = 'Joueur supprimé', "riotTag" = NULL, puuid = NULL
WHERE "playerId" = '<player_id>';
```

### 4. Supprimer le compte

```sql
DELETE FROM "User" WHERE id = '<user_id>';
```

Emporte en cascade `Account` (jetons OAuth Discord), `Session` et
`TeamManager`. `Team.createdById` et `Tournament.createdById` passent à `NULL` :
les équipes et tournois créés survivent, sans leur auteur.

### 5. Effacer les fichiers déposés

La base ne référence plus la photo, mais le fichier reste sur le disque et
`/api/images` continue de le servir à qui en connaît l'URL — la clé est
déterministe (`imageKeyFor`), donc devinable.

```bash
npm run images:prune            # aperçu : liste les fichiers orphelins
npm run images:prune -- --apply # effacement
```

Le script ne retire que les fichiers dont l'identifiant n'existe plus en base.
Une fiche anonymisée existe toujours : sa photo doit être retirée à la main.

```bash
rm uploads/players/<player_id>.webp
```

### 6. Répondre

Confirmer à la personne, par le même canal, ce qui a été supprimé et ce qui a
été conservé sous forme dissociée. Consigner la date de la demande et celle de
la réponse — le délai d'un mois court à partir de la première.

## Vérification

```sql
-- Aucun compte, aucune session, aucun jeton ne doit subsister
SELECT COUNT(*) FROM "User"    WHERE id = '<user_id>';
SELECT COUNT(*) FROM "Session" WHERE "userId" = '<user_id>';
SELECT COUNT(*) FROM "Account" WHERE "userId" = '<user_id>';
-- La fiche doit être orpheline et anonyme
SELECT pseudo, "userId", puuid, photo FROM "Player" WHERE id = '<player_id>';
-- Plus aucune statistique rattachée
SELECT COUNT(*) FROM "PlayerGameStat" WHERE "playerId" = '<player_id>';
```

Et sur le disque :

```bash
ls uploads/players/ | grep '<player_id>'   # doit ne rien renvoyer
```

## Cas particuliers

- **Mineur.** Un représentant légal peut demander l'effacement (politique,
  section « Mineurs »). Même procédure ; vérifier seulement que la demande
  concerne bien le compte visé.
- **Propriétaire d'équipe.** Supprimer le compte retire ses droits de gestion.
  Si c'était le seul `OWNER`, l'équipe se retrouve sans administrateur : en
  désigner un nouveau (table `TeamManager`) avant l'étape 4.
- **Demande d'accès ou de portabilité.** Pas d'effacement : exporter les lignes
  `User`, `Player`, `TeamMembership` et `PlayerGameStat` de la personne au
  format JSON, et les lui transmettre.

## À terme

L'objectif reste d'exposer une action « Supprimer mon compte » dans
`/profil`, qui applique les étapes 2 à 5 en une transaction. Cette procédure
manuelle est ce qui tient l'engagement en attendant.
