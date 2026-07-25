-- Ajoute le format « double élimination » au type d'énumération TournamentFormat.
ALTER TYPE "TournamentFormat" ADD VALUE IF NOT EXISTS 'DOUBLE_ELIM' AFTER 'SINGLE_ELIM';
