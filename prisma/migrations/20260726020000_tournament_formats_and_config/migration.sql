-- Ajoute les formats supplémentaires au type d'énumération TournamentFormat.
ALTER TYPE "TournamentFormat" ADD VALUE IF NOT EXISTS 'SWISS' AFTER 'GROUPS_THEN_ELIM';
ALTER TYPE "TournamentFormat" ADD VALUE IF NOT EXISTS 'ROUND_ROBIN' AFTER 'SWISS';
ALTER TYPE "TournamentFormat" ADD VALUE IF NOT EXISTS 'LEAGUE' AFTER 'ROUND_ROBIN';

-- Champs de configuration de compétition sur le tournoi.
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "maxTeams" INTEGER;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "groupSize" INTEGER;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "bestOf" INTEGER;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "seeding" TEXT;
