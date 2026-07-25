-- Invariant §1.4 : un joueur ne peut avoir qu'une seule adhésion active à la fois.
-- Prisma ne sait pas exprimer un index unique PARTIEL dans schema.prisma, donc on
-- l'ajoute en SQL brut. Garantit l'unicité au niveau DB, en complément du join
-- transactionnel applicatif (joinTeamIfFree).
CREATE UNIQUE INDEX "TeamMembership_active_player_key"
  ON "TeamMembership" ("playerId")
  WHERE "leaveDate" IS NULL;
