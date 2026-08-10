-- Discord du joueur sur sa fiche publique.
--
-- `User.name` porte le nom d'affichage Discord (`global_name`), qui change
-- librement et ne permet pas d'ajouter quelqu'un : on stocke en plus le pseudo
-- (`username`), rafraîchi à chaque connexion. Le lien de la fiche pointe sur
-- `discord.com/users/<discordId>`, qui lui est stable.
ALTER TABLE "User" ADD COLUMN "discordUsername" TEXT;

-- Affichage d'office, masquable depuis les paramètres : les fiches existantes
-- basculent donc à `true`, conformément au comportement annoncé.
ALTER TABLE "Player" ADD COLUMN "showDiscord" BOOLEAN NOT NULL DEFAULT true;

-- Réseaux du tournoi, même forme JSON que `Team.socials`.
ALTER TABLE "Tournament" ADD COLUMN "socials" JSONB;
