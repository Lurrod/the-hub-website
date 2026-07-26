-- Colonnes avancées du scoreboard (rating, KAST, first deaths) + timeline de rounds.
ALTER TABLE "PlayerGameStat" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "PlayerGameStat" ADD COLUMN IF NOT EXISTS "kast" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlayerGameStat" ADD COLUMN IF NOT EXISTS "firstDeaths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MatchMap" ADD COLUMN IF NOT EXISTS "roundTimeline" JSONB;
