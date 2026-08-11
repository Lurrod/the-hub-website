-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('JOUEUR', 'COACH', 'MANAGER');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'JOUEUR',
ADD COLUMN     "onboardedAt" TIMESTAMP(3);
