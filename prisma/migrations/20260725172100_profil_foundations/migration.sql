-- Rename enum value in place (préserve les données existantes)
ALTER TYPE "MembershipRole" RENAME VALUE 'STARTER' TO 'JOUEUR';

-- Update default du rôle
ALTER TABLE "TeamMembership" ALTER COLUMN "role" SET DEFAULT 'JOUEUR';

-- Player <-> User (nullable, unique)
ALTER TABLE "Player" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Team invite link
ALTER TABLE "Team" ADD COLUMN "inviteToken" TEXT;
ALTER TABLE "Team" ADD COLUMN "inviteExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Team_inviteToken_key" ON "Team"("inviteToken");
