-- LFP : pendant du LFT côté équipe (« on recrute »).
--
-- Même paire drapeau + horodatage que `Player.lft` / `Player.lftSince`, pour
-- que les deux moitiés de la page LFT/LFP se trient de la même façon.
-- `lfpRoles` vide signifie « ouvert à tous les postes ».
ALTER TABLE "Team" ADD COLUMN "lfp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Team" ADD COLUMN "lfpSince" TIMESTAMP(3);
ALTER TABLE "Team" ADD COLUMN "lfpRoles" "ValorantRole"[] DEFAULT ARRAY[]::"ValorantRole"[];
ALTER TABLE "Team" ADD COLUMN "lfpMessage" TEXT;

-- Les annonces se lisent toujours filtrées sur le drapeau.
CREATE INDEX "Team_lfp_idx" ON "Team"("lfp");
