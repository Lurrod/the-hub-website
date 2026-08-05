-- Deux niveaux de gestion : MANAGER (quotidien) et OWNER (suppression et
-- administration des managers). Sans ça, tout manager pouvait évincer celui
-- qui l'avait invité, et un manager de tournoi pouvait supprimer le tournoi.

CREATE TYPE "ManagerRole" AS ENUM ('OWNER', 'MANAGER');

ALTER TABLE "TeamManager" ADD COLUMN "role" "ManagerRole" NOT NULL DEFAULT 'MANAGER';
ALTER TABLE "TournamentManager" ADD COLUMN "role" "ManagerRole" NOT NULL DEFAULT 'MANAGER';

-- Reprise de l'existant : le créateur devient propriétaire.
UPDATE "TeamManager" tm
SET "role" = 'OWNER'
FROM "Team" t
WHERE tm."teamId" = t."id" AND tm."userId" = t."createdById";

UPDATE "TournamentManager" tm
SET "role" = 'OWNER'
FROM "Tournament" t
WHERE tm."tournamentId" = t."id" AND tm."userId" = t."createdById";

-- Les groupes dont le créateur n'est pas (ou plus) manager n'auraient aucun
-- propriétaire, et donc plus personne pour administrer les managers. Le plus
-- ancien manager reprend la main : les cuid sont préfixés d'un horodatage,
-- l'ordre lexicographique suit donc l'ordre de création.
UPDATE "TeamManager"
SET "role" = 'OWNER'
WHERE "id" IN (
  SELECT DISTINCT ON ("teamId") "id"
  FROM "TeamManager"
  WHERE "teamId" NOT IN (SELECT "teamId" FROM "TeamManager" WHERE "role" = 'OWNER')
  ORDER BY "teamId", "id"
);

UPDATE "TournamentManager"
SET "role" = 'OWNER'
WHERE "id" IN (
  SELECT DISTINCT ON ("tournamentId") "id"
  FROM "TournamentManager"
  WHERE "tournamentId" NOT IN (
    SELECT "tournamentId" FROM "TournamentManager" WHERE "role" = 'OWNER'
  )
  ORDER BY "tournamentId", "id"
);
