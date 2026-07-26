-- prisma/migrations/20260726030000_player_riot_id/migration.sql
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "riotName" TEXT;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "riotTag" TEXT;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "puuid" TEXT;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "region" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Player_puuid_key" ON "Player"("puuid");
