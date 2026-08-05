-- Index manquants relevés à l'audit de performance.
--
-- Match : toutes les vues « équipe » (bilan, derniers résultats, prochains
-- matchs, historique par tournoi) filtrent sur OR (teamAId, teamBId) et
-- trient par date. Sans ces index, chaque fiche d'équipe balayait la table.
CREATE INDEX "Match_teamAId_idx" ON "Match"("teamAId");
CREATE INDEX "Match_teamBId_idx" ON "Match"("teamBId");
CREATE INDEX "Match_date_idx" ON "Match"("date");

-- PlayerGameStat : `setPlayerRiotAccount` recale toutes les lignes d'un puuid
-- à chaque liaison de compte Riot, et l'import rattache les scoreboards par ce
-- même champ.
CREATE INDEX "PlayerGameStat_puuid_idx" ON "PlayerGameStat"("puuid");
