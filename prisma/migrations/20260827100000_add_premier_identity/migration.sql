-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "premierTeamId" TEXT;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "premierPhase" TEXT,
ADD COLUMN     "premierSeasonId" TEXT,
ADD COLUMN     "premierTier" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Team_premierTeamId_key" ON "Team"("premierTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_premierSeasonId_premierTier_premierPhase_key" ON "Tournament"("premierSeasonId", "premierTier", "premierPhase");

