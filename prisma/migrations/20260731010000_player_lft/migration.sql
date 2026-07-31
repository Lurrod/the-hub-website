-- Statut « recherche d'équipe » (LFT) du joueur + date de mise en recherche.
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "lft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "lftSince" TIMESTAMP(3);
