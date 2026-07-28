-- Rôle Valorant principal + date de naissance du joueur.
DO $$ BEGIN
  CREATE TYPE "ValorantRole" AS ENUM ('DUELIST', 'CONTROLLER', 'INITIATOR', 'SENTINEL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "valorantRole" "ValorantRole";
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "birthdate" TIMESTAMP(3);
