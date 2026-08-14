// Messages des modales de retour (succès / erreur), déclenchées via les
// paramètres d'URL `?ok=<code>` ou `?error=<code>` après une action serveur.

import { MIN_ROSTER_FOR_TOURNAMENT } from "@/lib/constants";

export type FlashKind = "success" | "error";

type FlashEntry = { title: string; message: string };

export const OK_MESSAGES: Record<string, FlashEntry> = {
  "tournament-created": { title: "Tournoi créé", message: "Le tournoi a bien été créé." },
  "tournament-saved": {
    title: "Modifications enregistrées",
    message: "Le tournoi a été mis à jour.",
  },
  "tournament-deleted": { title: "Tournoi supprimé", message: "Le tournoi a bien été supprimé." },
  "team-created": { title: "Équipe créée", message: "L'équipe a bien été créée." },
  "team-saved": { title: "Modifications enregistrées", message: "L'équipe a été mise à jour." },
  "team-deleted": { title: "Équipe supprimée", message: "L'équipe a bien été supprimée." },
  "participant-added": { title: "Équipe inscrite", message: "L'équipe a été ajoutée au tournoi." },
  "seed-updated": {
    title: "Seed enregistré",
    message: "Le placement de l'équipe a été mis à jour.",
  },
  "manager-added": { title: "Manager ajouté", message: "Le manager a bien été ajouté." },
  "manager-role": { title: "Niveau modifié", message: "Le niveau du manager a été mis à jour." },
  "member-added": { title: "Joueur ajouté", message: "Le joueur a été ajouté au roster." },
  "profile-saved": {
    title: "Profil enregistré",
    message: "Tes informations ont été mises à jour.",
  },
  "player-created": { title: "Joueur créé", message: "La fiche joueur a bien été créée." },
  "player-saved": { title: "Joueur enregistré", message: "La fiche joueur a été mise à jour." },
  "left-team": { title: "Équipe quittée", message: "Tu as quitté ton équipe." },
  "riot-saved": { title: "Riot ID enregistré", message: "Ton compte Valorant est bien lié." },
  // Inscription d'un coach ou d'un manager, qui la termine sans lier de Riot ID.
  "onboarding-done": {
    title: "Bienvenue",
    message: "Ton compte est prêt. Tu peux lier un Riot ID à tout moment depuis tes paramètres.",
  },
  "fiche-claimed": {
    title: "Fiche récupérée",
    message: "Tes stats et tes équipes des tournois déjà archivés sont sur ton profil.",
  },
  "lft-on": {
    title: "Statut LFT activé",
    message: "Tu apparais maintenant sur la page LFT.",
  },
  "lfp-on": {
    title: "Annonce publiée",
    message: "Ton équipe apparaît maintenant dans l'onglet Équipes de la page LFT / LFP.",
  },
  "lfp-off": {
    title: "Annonce retirée",
    message: "Ton équipe n'apparaît plus parmi celles qui recrutent.",
  },
  "lft-off": {
    title: "Statut LFT désactivé",
    message: "Tu n'apparais plus sur la page LFT.",
  },
  "discord-on": {
    title: "Discord affiché",
    message: "Ton Discord apparaît sur ta fiche publique.",
  },
  "discord-off": {
    title: "Discord masqué",
    message: "Ton Discord n'apparaît plus sur ta fiche publique.",
  },
  "stats-refetched": {
    title: "Recherche relancée",
    message: "Les maps du match ont été resynchronisées avec l'historique Riot.",
  },
  "map-imported": {
    title: "Map importée",
    message: "Le scoreboard a été récupéré depuis Riot.",
  },
  "team-registered": {
    title: "Inscription enregistrée",
    message: "Ton équipe est inscrite au tournoi.",
  },
};

export const ERROR_MESSAGES: Record<string, FlashEntry> = {
  invalid: {
    title: "Données invalides",
    message: "Vérifie les champs obligatoires du formulaire.",
  },
  twitter: { title: "Lien Twitter invalide", message: "Le lien Twitter doit être un lien x.com." },
  twitch: { title: "Lien Twitch invalide", message: "Le lien Twitch doit être un lien twitch.tv." },
  seedtaken: { title: "Seed déjà utilisé", message: "Un autre participant occupe déjà ce seed." },
  teamnametaken: {
    title: "Nom déjà pris",
    message: "Une autre équipe porte déjà ce nom. Choisis-en un autre pour éviter la confusion.",
  },
  teamtagtaken: {
    title: "Tag déjà pris",
    message:
      "Une autre équipe utilise déjà ce tag. Les brackets n'affichent que le tag : deux identiques seraient indiscernables.",
  },
  notregistered: {
    title: "Équipe non inscrite",
    message: "Les deux équipes d'un match doivent être inscrites au tournoi.",
  },
  hasparticipations: {
    title: "Suppression impossible",
    message:
      "Cette équipe est inscrite à un ou plusieurs tournois. Un admin doit d'abord la désinscrire.",
  },
  empty: { title: "Champ vide", message: "Renseigne l'identifiant Discord." },
  notfound: {
    title: "Utilisateur introuvable",
    message: "Aucun compte ne correspond à cet identifiant Discord.",
  },
  lastmanager: { title: "Action refusée", message: "Impossible de retirer le dernier manager." },
  lastowner: {
    title: "Action refusée",
    message:
      "Il doit rester au moins un propriétaire. Promeus quelqu'un d'autre avant de retirer ou rétrograder celui-ci.",
  },
  nogroups: { title: "Format sans poules", message: "Ce tournoi n'a pas de phase de poules." },
  stage: { title: "Phase invalide", message: "Cette phase n'est pas autorisée pour ce format." },
  score: {
    title: "Score invalide",
    message:
      "Le score du match se compte en maps gagnées, pas en rounds. Saisis le détail des rounds dans « Détail des maps ».",
  },
  riotformat: { title: "Riot ID invalide", message: "Format attendu : Nom#Tag." },
  riotnotfound: { title: "Riot ID introuvable", message: "Ce Riot ID n'existe pas côté Riot." },
  riottaken: {
    title: "Riot ID déjà utilisé",
    message: "Ce Riot ID est déjà associé à un autre joueur.",
  },
  claimfailed: {
    title: "Récupération impossible",
    message:
      "Une fiche existe déjà pour ce Riot ID mais n'a pas pu t'être rattachée. Contacte un admin.",
  },
  ratelimited: { title: "Trop de requêtes", message: "Réessaie dans un instant." },
  riotapi: {
    title: "Service indisponible",
    message: "Vérification Riot momentanément indisponible.",
  },
  riotmatchformat: {
    title: "Identifiant de partie invalide",
    message: "Colle l'identifiant Riot complet, au format 8-4-4-4-12 caractères.",
  },
  riotmatchnotfound: {
    title: "Partie introuvable",
    message: "Riot ne connaît pas cet identifiant. Vérifie qu'il vient bien d'une partie custom.",
  },
  riotmatchduplicate: {
    title: "Partie déjà importée",
    message: "Cette partie est déjà rattachée à une map de ce match.",
  },
  notupcoming: {
    title: "Inscriptions fermées",
    message: "Ce tournoi a déjà commencé ou est terminé.",
  },
  tournamentfull: {
    title: "Tournoi complet",
    message: "La limite d'équipes de ce tournoi est atteinte.",
  },
  alreadyregistered: {
    title: "Déjà inscrite",
    message: "Cette équipe est déjà inscrite à ce tournoi.",
  },
  invalidinvite: {
    title: "Lien d'invitation invalide",
    message: "Ce lien n'est plus valable. Demande un nouveau lien au manager de l'équipe.",
  },
  alreadyinteam: {
    title: "Déjà dans une équipe",
    message: "Quitte ton équipe actuelle avant d'en rejoindre une autre.",
  },
  rosterincomplete: {
    title: "Effectif incomplet",
    message: `Il faut au moins ${MIN_ROSTER_FOR_TOURNAMENT} joueurs dans l'équipe pour s'inscrire.`,
  },
};

export function resolveFlash(
  ok: string | null,
  error: string | null
): (FlashEntry & { kind: FlashKind }) | null {
  if (ok) {
    const e = OK_MESSAGES[ok] ?? { title: "Succès", message: "Opération réussie." };
    return { ...e, kind: "success" };
  }
  if (error) {
    const e = ERROR_MESSAGES[error] ?? { title: "Erreur", message: "Une erreur est survenue." };
    return { ...e, kind: "error" };
  }
  return null;
}
