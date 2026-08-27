-- DropIndex
DROP INDEX "Tournament_premierSeasonId_premierTier_premierPhase_key";

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "premierPhase";

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_premierSeasonId_premierTier_key" ON "Tournament"("premierSeasonId", "premierTier");

