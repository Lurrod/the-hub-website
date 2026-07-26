// Messages des modales de retour (succès / erreur), déclenchées via les
// paramètres d'URL `?ok=<code>` ou `?error=<code>` après une action serveur.

export type FlashKind = "success" | "error";

type FlashEntry = { title: string; message: string };

export const OK_MESSAGES: Record<string, FlashEntry> = {
  "tournament-created": { title: "Tournoi créé", message: "Le tournoi a bien été créé." },
  "tournament-saved": { title: "Modifications enregistrées", message: "Le tournoi a été mis à jour." },
  "tournament-deleted": { title: "Tournoi supprimé", message: "Le tournoi a bien été supprimé." },
  "team-created": { title: "Équipe créée", message: "L'équipe a bien été créée." },
  "team-saved": { title: "Modifications enregistrées", message: "L'équipe a été mise à jour." },
  "team-deleted": { title: "Équipe supprimée", message: "L'équipe a bien été supprimée." },
  "participant-added": { title: "Équipe inscrite", message: "L'équipe a été ajoutée au tournoi." },
  "manager-added": { title: "Manager ajouté", message: "Le manager a bien été ajouté." },
  "member-added": { title: "Joueur ajouté", message: "Le joueur a été ajouté au roster." },
  "profile-saved": { title: "Profil enregistré", message: "Tes informations ont été mises à jour." },
  "player-created": { title: "Joueur créé", message: "La fiche joueur a bien été créée." },
  "player-saved": { title: "Joueur enregistré", message: "La fiche joueur a été mise à jour." },
  "left-team": { title: "Équipe quittée", message: "Tu as quitté ton équipe." },
  "riot-saved": { title: "Riot ID enregistré", message: "Ton compte Valorant est bien lié." },
};

export const ERROR_MESSAGES: Record<string, FlashEntry> = {
  invalid: { title: "Données invalides", message: "Vérifie les champs obligatoires du formulaire." },
  twitter: { title: "Lien Twitter invalide", message: "Le lien Twitter doit être un lien x.com." },
  twitch: { title: "Lien Twitch invalide", message: "Le lien Twitch doit être un lien twitch.tv." },
  seedtaken: { title: "Seed déjà utilisé", message: "Un autre participant occupe déjà ce seed." },
  hasparticipations: {
    title: "Suppression impossible",
    message:
      "Cette équipe est inscrite à un ou plusieurs tournois. Un admin doit d'abord la désinscrire.",
  },
  empty: { title: "Champ vide", message: "Renseigne l'identifiant Discord." },
  notfound: { title: "Utilisateur introuvable", message: "Aucun compte ne correspond à cet identifiant Discord." },
  lastmanager: { title: "Action refusée", message: "Impossible de retirer le dernier manager." },
  nogroups: { title: "Format sans poules", message: "Ce tournoi n'a pas de phase de poules." },
  stage: { title: "Phase invalide", message: "Cette phase n'est pas autorisée pour ce format." },
  riotformat: { title: "Riot ID invalide", message: "Format attendu : Nom#Tag." },
  riotnotfound: { title: "Riot ID introuvable", message: "Ce Riot ID n'existe pas côté Riot." },
  riottaken: { title: "Riot ID déjà utilisé", message: "Ce Riot ID est déjà associé à un autre joueur." },
  ratelimited: { title: "Trop de requêtes", message: "Réessaie dans un instant." },
  riotapi: { title: "Service indisponible", message: "Vérification Riot momentanément indisponible." },
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
