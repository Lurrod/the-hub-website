-- CreateEnum
CREATE TYPE "MatchForfeit" AS ENUM ('NONE', 'TEAM_A', 'TEAM_B');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "forfeit" "MatchForfeit" NOT NULL DEFAULT 'NONE';
