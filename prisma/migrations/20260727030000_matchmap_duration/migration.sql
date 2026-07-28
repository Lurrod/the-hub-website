-- Durée réelle de la partie (map) en secondes, issue de l'API (game_length_in_ms).
ALTER TABLE "MatchMap" ADD COLUMN IF NOT EXISTS "durationSec" INTEGER;
