-- Heure de coup d'envoi des matchs.
--
-- `date` contenait jusqu'ici une date seule (minuit UTC, issue d'un
-- `<input type="date">`). Les lignes existantes gardent donc `hasTime = false` :
-- afficher « 02:00 » sur un match programmé avant cette migration serait une
-- heure inventée. Les nouveaux matchs saisis avec une heure passent à `true`.
ALTER TABLE "Match" ADD COLUMN "hasTime" BOOLEAN NOT NULL DEFAULT false;
