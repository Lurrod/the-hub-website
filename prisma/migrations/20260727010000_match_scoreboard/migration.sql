ALTER TABLE "MatchMap" ADD COLUMN IF NOT EXISTS "riotMatchId" TEXT;
ALTER TABLE "MatchMap" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "MatchMap_riotMatchId_key" ON "MatchMap"("riotMatchId");

ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "statsStatus" TEXT;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "statsFetchedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PlayerGameStat" (
  "id" TEXT NOT NULL,
  "matchMapId" TEXT NOT NULL,
  "playerId" TEXT,
  "riotName" TEXT NOT NULL,
  "riotTag" TEXT,
  "puuid" TEXT,
  "teamSide" TEXT NOT NULL,
  "agent" TEXT,
  "kills" INTEGER NOT NULL,
  "deaths" INTEGER NOT NULL,
  "assists" INTEGER NOT NULL,
  "acs" INTEGER NOT NULL,
  "adr" INTEGER NOT NULL,
  "hsPct" INTEGER NOT NULL,
  "firstKills" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PlayerGameStat_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PlayerGameStat_matchMapId_idx" ON "PlayerGameStat"("matchMapId");
CREATE INDEX IF NOT EXISTS "PlayerGameStat_playerId_idx" ON "PlayerGameStat"("playerId");
ALTER TABLE "PlayerGameStat" ADD CONSTRAINT "PlayerGameStat_matchMapId_fkey"
  FOREIGN KEY ("matchMapId") REFERENCES "MatchMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerGameStat" ADD CONSTRAINT "PlayerGameStat_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
